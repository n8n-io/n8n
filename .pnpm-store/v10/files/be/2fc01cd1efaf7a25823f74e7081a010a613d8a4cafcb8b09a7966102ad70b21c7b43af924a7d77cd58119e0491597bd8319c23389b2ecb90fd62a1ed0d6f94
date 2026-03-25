import {
  isElementNode,
  isTextNode,
  isInteractiveElement,
  isLeafElement,
  isVisible,
  isTextVisible,
  isActive,
} from "./elementCheckUtils";
import { generateXPathsForElement as generateXPaths } from "./xpathUtils";

const xpathCache: Map<Node, string[]> = new Map();

/**
 * `collectCandidateElements` performs a depth-first traversal (despite the BFS naming) of the given `candidateContainerRoot`
 * to find “candidate elements” or text nodes that meet certain criteria (e.g., visible, active,
 * interactive, or leaf). This function does not scroll the page; it only collects nodes from
 * the in-memory DOM structure starting at `candidateContainerRoot`.
 *
 * @param candidateContainerRoot - The HTMLElement to search within
 * @param indexOffset - A numeric offset used to label/number your candidate elements
 * @returns { outputString, selectorMap }
 */
export async function collectCandidateElements(
  candidateContainerRoot: HTMLElement,
  indexOffset: number = 0,
): Promise<{
  outputString: string;
  selectorMap: Record<number, string[]>;
}> {
  const DOMQueue: ChildNode[] = [...candidateContainerRoot.childNodes];
  const candidateElements: ChildNode[] = [];

  while (DOMQueue.length > 0) {
    const node = DOMQueue.pop();
    let shouldAdd = false;

    if (node && isElementNode(node)) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        DOMQueue.push(node.childNodes[i]);
      }

      if (isInteractiveElement(node)) {
        if (isActive(node) && isVisible(node)) {
          shouldAdd = true;
        }
      }
      if (isLeafElement(node)) {
        if (isActive(node) && isVisible(node)) {
          shouldAdd = true;
        }
      }
    }

    if (node && isTextNode(node) && isTextVisible(node)) {
      shouldAdd = true;
    }

    if (shouldAdd) {
      candidateElements.push(node);
    }
  }

  const selectorMap: Record<number, string[]> = {};
  let outputString = "";

  const xpathLists = await Promise.all(
    candidateElements.map((elem) => {
      if (xpathCache.has(elem)) {
        return Promise.resolve(xpathCache.get(elem)!);
      }
      return generateXPaths(elem).then((xpaths: string[]) => {
        xpathCache.set(elem, xpaths);
        return xpaths;
      });
    }),
  );

  candidateElements.forEach((elem, idx) => {
    const xpaths = xpathLists[idx];
    let elemOutput = "";

    if (isTextNode(elem)) {
      const textContent = elem.textContent?.trim();
      if (textContent) {
        elemOutput += `${idx + indexOffset}:${textContent}\n`;
      }
    } else if (isElementNode(elem)) {
      const tagName = elem.tagName.toLowerCase();
      const attributes = collectEssentialAttributes(elem);
      const opening = `<${tagName}${attributes ? " " + attributes : ""}>`;
      const closing = `</${tagName}>`;
      const textContent = elem.textContent?.trim() || "";
      elemOutput += `${idx + indexOffset}:${opening}${textContent}${closing}\n`;
    }

    outputString += elemOutput;
    selectorMap[idx + indexOffset] = xpaths;
  });

  return { outputString, selectorMap };
}

/**
 * Collects essential attributes from an element.
 * @param element The DOM element.
 * @returns A string of formatted attributes.
 */
function collectEssentialAttributes(element: Element): string {
  const essentialAttributes = [
    "id",
    "class",
    "href",
    "src",
    "aria-label",
    "aria-name",
    "aria-role",
    "aria-description",
    "aria-expanded",
    "aria-haspopup",
    "type",
    "value",
  ];

  const attrs: string[] = essentialAttributes
    .map((attr) => {
      const value = element.getAttribute(attr);
      return value ? `${attr}="${value}"` : "";
    })
    .filter((attr) => attr !== "");

  Array.from(element.attributes).forEach((attr) => {
    if (attr.name.startsWith("data-")) {
      attrs.push(`${attr.name}="${attr.value}"`);
    }
  });

  return attrs.join(" ");
}
