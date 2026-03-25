import { isElementNode, isTextNode } from "./elementCheckUtils";

function getParentElement(node: ChildNode): Element | null {
  return isElementNode(node)
    ? node.parentElement
    : (node.parentNode as Element);
}

/**
 * Generates all possible combinations of a given array of attributes.
 * @param attributes Array of attributes.
 * @param size The size of each combination.
 * @returns An array of attribute combinations.
 */
function getCombinations(
  attributes: { attr: string; value: string }[],
  size: number,
): { attr: string; value: string }[][] {
  const results: { attr: string; value: string }[][] = [];

  function helper(start: number, combo: { attr: string; value: string }[]) {
    if (combo.length === size) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < attributes.length; i++) {
      combo.push(attributes[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }

  helper(0, []);
  return results;
}

/**
 * Checks if the generated XPath uniquely identifies the target element.
 * @param xpath The XPath string to test.
 * @param target The target DOM element.
 * @returns True if unique, else false.
 */
function isXPathFirstResultElement(xpath: string, target: Element): boolean {
  try {
    const result = document.evaluate(
      xpath,
      document.documentElement,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );
    return result.snapshotItem(0) === target;
  } catch (error) {
    // If there's an error evaluating the XPath, consider it not unique
    console.warn(`Invalid XPath expression: ${xpath}`, error);
    return false;
  }
}

/**
 * Escapes a string for use in an XPath expression.
 * Handles special characters, including single and double quotes.
 * @param value - The string to escape.
 * @returns The escaped string safe for XPath.
 */
export function escapeXPathString(value: string): string {
  if (value.includes("'")) {
    if (value.includes('"')) {
      // If the value contains both single and double quotes, split into parts
      return (
        "concat(" +
        value
          .split(/('+)/)
          .map((part) => {
            if (part === "'") {
              return `"'"`;
            } else if (part.startsWith("'") && part.endsWith("'")) {
              return `"${part}"`;
            } else {
              return `'${part}'`;
            }
          })
          .join(",") +
        ")"
      );
    } else {
      // Contains single quotes but not double quotes; use double quotes
      return `"${value}"`;
    }
  } else {
    // Does not contain single quotes; use single quotes
    return `'${value}'`;
  }
}

/**
 * Generates both a complicated XPath and a standard XPath for a given DOM element.
 * @param element - The target DOM element.
 * @param documentOverride - Optional document override.
 * @returns An object containing both XPaths.
 */
export async function generateXPathsForElement(
  element: ChildNode,
): Promise<string[]> {
  // Generate the standard XPath
  if (!element) return [];
  const [complexXPath, standardXPath, idBasedXPath] = await Promise.all([
    generateComplexXPath(element),
    generateStandardXPath(element),
    generatedIdBasedXPath(element),
  ]);

  // This should return in order from most accurate on current page to most cachable.
  // Do not change the order if you are not sure what you are doing.
  // Contact Navid if you need help understanding it.
  return [standardXPath, ...(idBasedXPath ? [idBasedXPath] : []), complexXPath];
}

async function generateComplexXPath(element: ChildNode): Promise<string> {
  // Generate the complicated XPath
  const parts: string[] = [];
  let currentElement: ChildNode | null = element;

  while (
    currentElement &&
    (isTextNode(currentElement) || isElementNode(currentElement))
  ) {
    if (isElementNode(currentElement)) {
      const el = currentElement as Element;
      let selector = el.tagName.toLowerCase();

      // List of attributes to consider for uniqueness
      const attributePriority = [
        "data-qa",
        "data-component",
        "data-role",
        "role",
        "aria-role",
        "type",
        "name",
        "aria-label",
        "placeholder",
        "title",
        "alt",
      ];

      // Collect attributes present on the element
      const attributes = attributePriority
        .map((attr) => {
          let value = el.getAttribute(attr);
          if (attr === "href-full" && value) {
            value = el.getAttribute("href");
          }
          return value
            ? { attr: attr === "href-full" ? "href" : attr, value }
            : null;
        })
        .filter((attr) => attr !== null) as { attr: string; value: string }[];

      // Attempt to find a combination of attributes that uniquely identifies the element
      let uniqueSelector = "";
      for (let i = 1; i <= attributes.length; i++) {
        const combinations = getCombinations(attributes, i);
        for (const combo of combinations) {
          const conditions = combo
            .map((a) => `@${a.attr}=${escapeXPathString(a.value)}`)
            .join(" and ");
          const xpath = `//${selector}[${conditions}]`;
          if (isXPathFirstResultElement(xpath, el)) {
            uniqueSelector = xpath;
            break;
          }
        }
        if (uniqueSelector) break;
      }

      if (uniqueSelector) {
        parts.unshift(uniqueSelector.replace("//", ""));
        break;
      } else {
        // Fallback to positional selector
        const parent = getParentElement(el);
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (sibling) => sibling.tagName === el.tagName,
          );
          const index = siblings.indexOf(el as HTMLElement) + 1;
          selector += siblings.length > 1 ? `[${index}]` : "";
        }
        parts.unshift(selector);
      }
    }

    currentElement = getParentElement(currentElement);
  }

  const xpath = "//" + parts.join("/");
  return xpath;
}

/**
 * Generates a standard XPath for a given DOM element.
 * @param element - The target DOM element.
 * @returns A standard XPath string.
 */
async function generateStandardXPath(element: ChildNode): Promise<string> {
  const parts: string[] = [];
  while (element && (isTextNode(element) || isElementNode(element))) {
    let index = 0;
    let hasSameTypeSiblings = false;
    const siblings = element.parentElement
      ? Array.from(element.parentElement.childNodes)
      : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (
        sibling.nodeType === element.nodeType &&
        sibling.nodeName === element.nodeName
      ) {
        index = index + 1;
        hasSameTypeSiblings = true;
        if (sibling.isSameNode(element)) {
          break;
        }
      }
    }
    // text "nodes" are selected differently than elements with xPaths
    if (element.nodeName !== "#text") {
      const tagName = element.nodeName.toLowerCase();
      const pathIndex = hasSameTypeSiblings ? `[${index}]` : "";
      parts.unshift(`${tagName}${pathIndex}`);
    }
    element = element.parentElement as HTMLElement;
  }
  return parts.length ? `/${parts.join("/")}` : "";
}

async function generatedIdBasedXPath(
  element: ChildNode,
): Promise<string | null> {
  if (isElementNode(element) && element.id) {
    return `//*[@id='${element.id}']`;
  }
  return null;
}
