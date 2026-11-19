const stage = document.querySelector("#bookStage");
const coverButton = document.querySelector("#coverButton");
const spreadImage = document.querySelector("#spreadArt");
const leftHold = document.querySelector("#leftHold");
const pageTurn = document.querySelector("#pageTurn");
const turnFront = document.querySelector("#turnFront");
const turnBack = document.querySelector("#turnBack");

const spreads = [
  { src: "Photocard/2.png", alt: "The first scrapbook photo spread" },
  { src: "Photocard/4.png", alt: "The second scrapbook photo spread" },
  { src: "Photocard/5.png", alt: "The third scrapbook photo spread" },
  { src: "Photocard/6.png", alt: "The fourth scrapbook photo spread" },
  { src: "Photocard/7.png", alt: "The fifth scrapbook photo spread" },
];
let currentSpread = 0;
let isTurningPage = false;

function setAlbumOpen(isOpen) {
  if (isOpen) {
    stage.classList.remove("is-closing");
    stage.classList.add("is-open");
    currentSpread = 0;
    spreadImage.src = spreads[0].src;
    spreadImage.alt = spreads[0].alt;
    coverButton.setAttribute("aria-label", "Photocard cover opened");
    coverButton.disabled = true;
    return;
  }

  if (!stage.classList.contains("is-open") || stage.classList.contains("is-closing")) {
    return;
  }

  stage.classList.add("is-closing");
  coverButton.setAttribute("aria-label", "Closing the photocard");
  coverButton.disabled = true;

  const finishClosingFlap = (event) => {
    if (event.target !== coverButton || event.propertyName !== "transform") {
      return;
    }

    coverButton.removeEventListener("transitionend", finishClosingFlap);
    stage.classList.remove("is-open", "is-closing");
    coverButton.setAttribute("aria-label", "Open the photocard");
    coverButton.disabled = false;
  };

  coverButton.addEventListener("transitionend", finishClosingFlap);
}

function cropPage(image, side) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const scaleX = sourceWidth / 1366;
  const scaleY = sourceHeight / 768;
  const sourceX = side === "left" ? 219 : 683;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 464 * scaleX;
  const height = 658 * scaleY;

  if (!context) {
    throw new Error("Could not prepare the page-turn animation.");
  }

  canvas.width = Math.round(width * 2);
  canvas.height = Math.round(height * 2);
  context.drawImage(
    image,
    sourceX * scaleX,
    55 * scaleY,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/png");
}

async function loadSpreadImage(index) {
  const image = new Image();
  image.src = spreads[index].src;
  await image.decode();
  return image;
}

async function turnToSpread(targetIndex) {
  if (isTurningPage || targetIndex < 0 || targetIndex >= spreads.length || targetIndex === currentSpread) {
    return;
  }

  isTurningPage = true;

  try {
    const isPreviousTurn = targetIndex < currentSpread;
    const [currentImage, targetImage] = await Promise.all([
      loadSpreadImage(currentSpread),
      loadSpreadImage(targetIndex),
    ]);

    leftHold.classList.toggle("is-holding-right", isPreviousTurn);
    leftHold.querySelector("img").src = cropPage(currentImage, isPreviousTurn ? "right" : "left");
    turnFront.src = cropPage(currentImage, isPreviousTurn ? "left" : "right");
    turnBack.src = cropPage(targetImage, isPreviousTurn ? "right" : "left");
    pageTurn.classList.toggle("is-reversing", isPreviousTurn);
    leftHold.hidden = false;
    pageTurn.hidden = false;
    spreadImage.src = spreads[targetIndex].src;
    spreadImage.alt = spreads[targetIndex].alt;
    void pageTurn.offsetWidth;

    pageTurn.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "transform") {
        return;
      }

      pageTurn.classList.remove("is-turning", "is-reversing");
      leftHold.classList.remove("is-holding-right");
      pageTurn.hidden = true;
      leftHold.hidden = true;
      currentSpread = targetIndex;
      isTurningPage = false;
    }, { once: true });

    requestAnimationFrame(() => pageTurn.classList.add("is-turning"));
  } catch (error) {
    isTurningPage = false;
    throw error;
  }
}

coverButton.addEventListener("click", () => setAlbumOpen(true));

document.querySelectorAll(".page-click-zone").forEach((zone) => {
  zone.addEventListener("click", () => {
    if (zone.classList.contains("page-click-previous")) {
      if (currentSpread === 0) {
        setAlbumOpen(false);
      } else {
        turnToSpread(currentSpread - 1);
      }
      return;
    }

    turnToSpread(currentSpread + 1);
  });
});
