import { generateXPathsForElement as generateXPaths } from "./xpathUtils";
import {
  calculateViewportHeight,
  canElementScroll,
  getNodeFromXpath,
} from "./utils";
import { createStagehandContainer } from "./containerFactory";
import { StagehandContainer } from "./StagehandContainer";
import { GlobalPageContainer } from "@/lib/dom/GlobalPageContainer";
import { ElementContainer } from "@/lib/dom/ElementContainer";
import { DomChunk } from "@/lib/dom/DomChunk";

/**
 * Finds and returns a list of scrollable elements on the page,
 * ordered from the element with the largest scrollHeight to the smallest.
 *
 * @param topN Optional maximum number of scrollable elements to return.
 *             If not provided, all found scrollable elements are returned.
 * @returns An array of HTMLElements sorted by descending scrollHeight.
 */
export function getScrollableElements(topN?: number): HTMLElement[] {
  // Get the root <html> element
  const docEl = document.documentElement;

  // 1) Initialize an array to hold all scrollable elements.
  //    Always include the root <html> element as a fallback.
  const scrollableElements: HTMLElement[] = [docEl];

  // 2) Scan all elements to find potential scrollable containers.
  //    A candidate must have a scrollable overflow style and extra scrollable content.
  const allElements = document.querySelectorAll<HTMLElement>("*");
  for (const elem of allElements) {
    const style = window.getComputedStyle(elem);
    const overflowY = style.overflowY;

    const isPotentiallyScrollable =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";

    if (isPotentiallyScrollable) {
      const candidateScrollDiff = elem.scrollHeight - elem.clientHeight;
      // Only consider this element if it actually has extra scrollable content
      // and it can truly scroll.
      if (candidateScrollDiff > 0 && canElementScroll(elem)) {
        scrollableElements.push(elem);
      }
    }
  }

  // 3) Sort the scrollable elements from largest scrollHeight to smallest.
  scrollableElements.sort((a, b) => b.scrollHeight - a.scrollHeight);

  // 4) If a topN limit is specified, return only the first topN elements.
  if (topN !== undefined) {
    return scrollableElements.slice(0, topN);
  }

  // Return all found scrollable elements if no limit is provided.
  return scrollableElements;
}

/**
 * Calls getScrollableElements, then for each element calls generateXPaths,
 * and returns the first XPath for each.
 *
 * @param topN (optional) integer limit on how many scrollable elements to process
 * @returns string[] list of XPaths (1 for each scrollable element)
 */
export async function getScrollableElementXpaths(
  topN?: number,
): Promise<string[]> {
  const scrollableElems = getScrollableElements(topN);
  const xpaths = [];
  for (const elem of scrollableElems) {
    const allXPaths = await generateXPaths(elem);
    const firstXPath = allXPaths?.[0] || "";
    xpaths.push(firstXPath);
  }
  return xpaths;
}

export function getNearestScrollableParent(el: HTMLElement): HTMLElement {
  // 1) Get *all* scrollable elements on the page
  //    (You could pass a large topN or omit it for “all”)
  const allScrollables = getScrollableElements();

  // 2) Climb up the DOM tree
  let current: HTMLElement | null = el;
  while (current) {
    // If `current` is in the scrollable list, we have our nearest scrollable parent
    if (allScrollables.includes(current)) {
      return current;
    }
    current = current.parentElement;
  }

  // 3) If we exhaust the ancestors, default to root
  return document.documentElement;
}

/**
 * processDom
 * ----------
 * This function now just picks a single chunk index,
 * creates a container, and calls collectDomChunk to get a single DomChunk.
 *
 * @param chunksSeen - The chunks we've seen so far
 */
export async function processDom(chunksSeen: number[]) {
  // 1) choose a chunk index from chunksSeen
  const { chunk, chunksArray } = await pickChunk(chunksSeen);

  // 2) create a container for the entire page
  const container = new GlobalPageContainer();

  // 3) pick a chunk size, e.g. container.getViewportHeight()
  const chunkSize = container.getViewportHeight();

  // 4) compute startOffset from `chunkIndex * chunkSize`
  const startOffset = chunk * chunkSize;
  // if we only want a single chunk, pass the same value for `endOffset`
  const endOffset = startOffset;

  // 5) collectAllDomChunks with identical start & end => exactly 1 iteration
  const domChunks = await container.collectDomChunks(
    startOffset,
    endOffset,
    chunkSize,
    true,
    false, // scrollBackToTop
    container.getRootElement(), // BFS entire doc
  );

  // We expect exactly 1 chunk
  const [domChunk] = domChunks;
  if (!domChunk) {
    // fallback, no chunk
    return {
      outputString: "",
      selectorMap: {},
      chunk,
      chunks: chunksArray,
    };
  }

  console.log("Extracted DOM chunk:\n", domChunk.outputString);

  return {
    outputString: domChunk.outputString,
    selectorMap: domChunk.selectorMap,
    chunk,
    chunks: chunksArray,
  };
}

/**
 * processAllOfDom
 * ---------------
 * If an xpath is provided, we find that element and build an appropriate container
 * (global or element) based on the nearest scrollable parent. Then we chunk from
 * startOffset..endOffset. We BFS within the element's subtree (candidateContainer).
 */
export async function processAllOfDom(xpath?: string) {
  let candidateElementContainer: HTMLElement | null = null;
  let scrollTarget: StagehandContainer;

  if (xpath) {
    // 1) Find the element
    const node = getNodeFromXpath(xpath) as HTMLElement | null;

    if (node) {
      candidateElementContainer = node;
      console.log(`Found element via XPath: ${xpath}`);

      // 2) Always find the nearest scrollable parent
      const scrollableElem = getNearestScrollableParent(
        candidateElementContainer,
      );
      if (scrollableElem === document.documentElement) {
        scrollTarget = new GlobalPageContainer();
      } else {
        scrollTarget = new ElementContainer(scrollableElem);
      }

      // 3) Scroll the candidateElementContainer into view
      //    (use the container's scroll logic)
      await scrollTarget.scrollIntoView(candidateElementContainer);

      // 4) Measure the container’s new scroll offset AFTER we've scrolled
      const startOffset = scrollTarget.getScrollPosition();

      // Now check if the element “fits” in the container’s viewport
      const scrollTargetHeight = scrollTarget.getViewportHeight();
      const candidateElementContainerHeight =
        candidateElementContainer.scrollHeight;

      if (candidateElementContainerHeight <= scrollTargetHeight) {
        // Single-chunk approach
        console.log(
          "Element is smaller/equal to container’s viewport. Doing single chunk.",
        );

        // We'll define a "single-chunk" scenario by telling
        // the container to gather from startOffset..startOffset
        // so it only processes exactly one chunk iteration
        const domChunks = await scrollTarget.collectDomChunks(
          startOffset, // startOffset
          startOffset, // endOffset => same as start => 1 chunk
          1, // chunkSize=1 => doesn't matter, because start==end means exactly 1 iteration
          true,
          true,
          candidateElementContainer,
        );

        const singleChunkOutput = combineChunks(domChunks);
        console.log(
          "Final output (single-chunk):",
          singleChunkOutput.outputString,
        );
        return singleChunkOutput;
      }

      console.log("Element is bigger. Doing multi-chunk approach.");
    } else {
      console.warn(`XPath not found: ${xpath}. Using entire doc.`);
    }
  } else {
    const scrollableElems = getScrollableElements(1);
    const mainScrollable = scrollableElems[0];

    scrollTarget =
      mainScrollable === document.documentElement
        ? createStagehandContainer(window)
        : createStagehandContainer(mainScrollable);
  }

  const startOffset = scrollTarget.getScrollPosition();
  const viewportHeight = scrollTarget.getViewportHeight();
  const maxScroll = candidateElementContainer
    ? startOffset + candidateElementContainer.scrollHeight
    : scrollTarget.getScrollHeight();
  const chunkSize = viewportHeight;

  console.log("processAllOfDom chunk-based from", startOffset, "to", maxScroll);

  const domChunks = await scrollTarget.collectDomChunks(
    startOffset,
    maxScroll,
    chunkSize,
    true,
    true,
    candidateElementContainer ?? undefined,
  );

  const finalOutput = combineChunks(domChunks);
  console.log(
    "All DOM elements combined (chunk-based):",
    finalOutput.outputString,
  );
  return finalOutput;
}

function combineChunks(domChunks: DomChunk[]): {
  outputString: string;
  selectorMap: Record<number, string[]>;
} {
  const outputString = domChunks.map((c: DomChunk) => c.outputString).join("");
  let finalSelectorMap: Record<number, string[]> = {};
  domChunks.forEach((c: DomChunk) => {
    finalSelectorMap = { ...finalSelectorMap, ...c.selectorMap };
  });
  return { outputString, selectorMap: finalSelectorMap };
}

/**
 * Stores either the entire DOM (if no `xpath` is given),
 * or the specific element that `xpath` points to.
 * Returns the outer HTML of what is stored.
 */
export function storeDOM(xpath?: string): string {
  if (!xpath) {
    const originalDOM = document.body.cloneNode(true) as HTMLElement;
    console.log("DOM state stored (root).");
    return originalDOM.outerHTML;
  } else {
    const node = getNodeFromXpath(xpath) as HTMLElement | null;

    if (!node) {
      console.error(
        `storeDOM: No element found for xpath: ${xpath}. Returning empty string.`,
      );
      return "";
    }

    console.log(`DOM state stored (element at xpath: ${xpath}).`);
    return node.outerHTML;
  }
}

/**
 * Restores either the entire DOM (if no `xpath` is given),
 * or the specific element that `xpath` points to, based on `storedDOM`.
 */
export function restoreDOM(storedDOM: string, xpath?: string): void {
  console.log("Restoring DOM...");

  if (!storedDOM) {
    console.error("No DOM state was provided.");
    return;
  }

  if (!xpath) {
    document.body.innerHTML = storedDOM;
    console.log("DOM restored (root).");
  } else {
    const node = getNodeFromXpath(xpath) as HTMLElement | null;

    if (!node) {
      console.error(
        `restoreDOM: No element found for xpath: ${xpath}. Cannot restore.`,
      );
      return;
    }

    node.outerHTML = storedDOM;
    console.log(`DOM restored (element at xpath: ${xpath}).`);
  }
}

export function createTextBoundingBoxes(xpath?: string): void {
  const style = document.createElement("style");
  document.head.appendChild(style);
  if (style.sheet) {
    style.sheet.insertRule(
      `
      .stagehand-highlighted-word, .stagehand-space {
        border: 0px solid orange;
        display: inline-block !important;
        visibility: visible;
      }
    `,
      0,
    );

    style.sheet.insertRule(
      `
        code .stagehand-highlighted-word, code .stagehand-space,
        pre .stagehand-highlighted-word, pre .stagehand-space {
          white-space: pre-wrap;
          display: inline !important;
      }
     `,
      1,
    );
  }

  /**
   * Applies highlighting to every text node under `root`.
   * If `root` is the entire `document`, we query "body *".
   * If `root` is a specific `HTMLElement`, we query "*".
   */
  function applyHighlighting(root: Document | HTMLElement): void {
    // If root is a Document, highlight everything under <body>. Otherwise, highlight all children of that HTMLElement.
    const containerSelector = root instanceof Document ? "body *" : "*";

    root.querySelectorAll(containerSelector).forEach((element) => {
      if (
        element.closest &&
        element.closest(".stagehand-nav, .stagehand-marker")
      ) {
        return;
      }
      if (["SCRIPT", "STYLE", "IFRAME", "INPUT"].includes(element.tagName)) {
        return;
      }

      const childNodes = Array.from(element.childNodes);
      childNodes.forEach((node) => {
        if (node.nodeType === 3 && node.textContent?.trim().length > 0) {
          const textContent = node.textContent.replace(/\u00A0/g, " ");
          const tokens = textContent.split(/(\s+)/g); // Split text by spaces
          const fragment = document.createDocumentFragment();
          const parentIsCode = element.tagName === "CODE";

          tokens.forEach((token) => {
            const span = document.createElement("span");
            span.textContent = token;
            if (parentIsCode) {
              // Special handling for <code> tags
              span.style.whiteSpace = "pre-wrap";
              span.style.display = "inline";
            }
            span.className =
              token.trim().length === 0
                ? "stagehand-space"
                : "stagehand-highlighted-word";
            fragment.appendChild(span);
          });

          if (fragment.childNodes.length > 0 && node.parentNode) {
            element.insertBefore(fragment, node);
            node.remove();
          }
        }
      });
    });
  }

  if (!xpath) {
    applyHighlighting(document);

    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage({ action: "highlight" }, "*");
      } catch (error) {
        console.error("Error accessing iframe content: ", error);
      }
    });
  } else {
    const node = getNodeFromXpath(xpath) as HTMLElement | null;

    if (!node) {
      console.warn(
        `createTextBoundingBoxes: No element found for xpath "${xpath}".`,
      );
      return;
    }

    applyHighlighting(node);
  }
}

export function getElementBoundingBoxes(xpath: string): Array<{
  text: string;
  top: number;
  left: number;
  width: number;
  height: number;
}> {
  const element = getNodeFromXpath(xpath) as HTMLElement;

  if (!element) return [];

  const isValidText = (text: string) => text && text.trim().length > 0;
  let dropDownElem = element.querySelector("option[selected]");

  if (!dropDownElem) {
    dropDownElem = element.querySelector("option");
  }

  if (dropDownElem) {
    const elemText = dropDownElem.textContent || "";
    if (isValidText(elemText)) {
      const parentRect = element.getBoundingClientRect();
      return [
        {
          text: elemText.trim(),
          top: parentRect.top + window.scrollY,
          left: parentRect.left + window.scrollX,
          width: parentRect.width,
          height: parentRect.height,
        },
      ];
    } else {
      return [];
    }
  }

  let placeholderText = "";
  if (
    (element.tagName.toLowerCase() === "input" ||
      element.tagName.toLowerCase() === "textarea") &&
    (element as HTMLInputElement).placeholder
  ) {
    placeholderText = (element as HTMLInputElement).placeholder;
  } else if (element.tagName.toLowerCase() === "a") {
    placeholderText = "";
  } else if (element.tagName.toLowerCase() === "img") {
    placeholderText = (element as HTMLImageElement).alt || "";
  }

  const words = element.querySelectorAll(
    ".stagehand-highlighted-word",
  ) as NodeListOf<HTMLElement>;

  const boundingBoxes = Array.from(words)
    .map((word) => {
      const rect = word.getBoundingClientRect();
      return {
        text: word.innerText || "",
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height * 0.75,
      };
    })
    .filter(
      (box) =>
        box.width > 0 &&
        box.height > 0 &&
        box.top >= 0 &&
        box.left >= 0 &&
        isValidText(box.text),
    );

  if (boundingBoxes.length === 0) {
    const elementRect = element.getBoundingClientRect();
    return [
      {
        text: placeholderText,
        top: elementRect.top + window.scrollY,
        left: elementRect.left + window.scrollX,
        width: elementRect.width,
        height: elementRect.height * 0.75,
      },
    ];
  }

  return boundingBoxes;
}

window.processDom = processDom;
window.processAllOfDom = processAllOfDom;
window.storeDOM = storeDOM;
window.restoreDOM = restoreDOM;
window.createTextBoundingBoxes = createTextBoundingBoxes;
window.getElementBoundingBoxes = getElementBoundingBoxes;
window.createStagehandContainer = createStagehandContainer;
window.getScrollableElementXpaths = getScrollableElementXpaths;
window.getNodeFromXpath = getNodeFromXpath;

async function pickChunk(chunksSeen: Array<number>) {
  const viewportHeight = calculateViewportHeight();
  const documentHeight = document.documentElement.scrollHeight;

  const chunks = Math.ceil(documentHeight / viewportHeight);

  const chunksArray = Array.from({ length: chunks }, (_, i) => i);
  const chunksRemaining = chunksArray.filter((chunk) => {
    return !chunksSeen.includes(chunk);
  });

  const currentScrollPosition = window.scrollY;
  const closestChunk = chunksRemaining.reduce((closest, current) => {
    const currentChunkTop = viewportHeight * current;
    const closestChunkTop = viewportHeight * closest;
    return Math.abs(currentScrollPosition - currentChunkTop) <
      Math.abs(currentScrollPosition - closestChunkTop)
      ? current
      : closest;
  }, chunksRemaining[0]);
  const chunk = closestChunk;

  if (chunk === undefined) {
    throw new Error(`No chunks remaining to check: ${chunksRemaining}`);
  }
  return {
    chunk,
    chunksArray,
  };
}
