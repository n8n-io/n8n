import { GlobalPageContainer } from "./GlobalPageContainer";
import { getNodeFromXpath } from "./utils";

export async function debugDom() {
  window.chunkNumber = 0;

  // 1) Build a container for the entire page
  const container = new GlobalPageContainer();

  // 2) Determine chunk size (e.g. container’s viewport height)
  const chunkSize = container.getViewportHeight();

  // 3) If we only want one chunk,
  //    define startOffset = chunkNumber * chunkSize,
  //    and set endOffset = startOffset => exactly 1 iteration
  const startOffset = container.getScrollPosition();
  const endOffset = startOffset;

  // 4) BFS with collectAllDomChunks for exactly 1 chunk
  const singleChunks = await container.collectDomChunks(
    startOffset,
    endOffset,
    chunkSize,
    false,
    false, // Don't scroll back to top
    container.getRootElement(), // BFS entire doc
  );

  // We expect exactly 1 chunk
  const [singleChunk] = singleChunks;
  if (!singleChunk) {
    console.warn("No chunk was returned. Possibly empty doc?");
    return;
  }

  // 5) Extract the multiSelectorMap and convert to old single‐string format
  const multiSelectorMap = singleChunk.selectorMap;
  const selectorMap = multiSelectorMapToSelectorMap(multiSelectorMap);

  drawChunk(selectorMap);
}

function multiSelectorMapToSelectorMap(
  multiSelectorMap: Record<number, string[]>,
) {
  return Object.fromEntries(
    Object.entries(multiSelectorMap).map(([key, selectors]) => [
      Number(key),
      selectors[0],
    ]),
  );
}

function drawChunk(selectorMap: Record<number, string>) {
  if (!window.showChunks) return;
  cleanupMarkers();
  Object.values(selectorMap).forEach((selector) => {
    const element = getNodeFromXpath(selector) as Element;

    if (element) {
      let rect;
      if (element.nodeType === Node.ELEMENT_NODE) {
        rect = element.getBoundingClientRect();
      } else {
        const range = document.createRange();
        range.selectNodeContents(element);
        rect = range.getBoundingClientRect();
      }
      const color = "grey";
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.padding = "2px"; // Add 2px of padding to the overlay

      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.backgroundColor = color;
      overlay.className = "stagehand-marker";
      overlay.style.opacity = "0.3";
      overlay.style.zIndex = "1000000000"; // Ensure it's above the element
      overlay.style.border = "1px solid"; // Add a 1px solid border to the overlay
      overlay.style.pointerEvents = "none"; // Ensure the overlay does not capture mouse events
      document.body.appendChild(overlay);
    }
  });
}

async function cleanupDebug() {
  cleanupMarkers();
}

function cleanupMarkers() {
  const markers = document.querySelectorAll(".stagehand-marker");
  markers.forEach((marker) => {
    marker.remove();
  });
}

window.debugDom = debugDom;
window.cleanupDebug = cleanupDebug;
