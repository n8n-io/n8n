(() => {
  // lib/dom/elementCheckUtils.ts
  function isElementNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
  }
  function isTextNode(node) {
    return node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim());
  }
  var leafElementDenyList = ["SVG", "IFRAME", "SCRIPT", "STYLE", "LINK"];
  var interactiveElementTypes = [
    "A",
    "BUTTON",
    "DETAILS",
    "EMBED",
    "INPUT",
    "LABEL",
    "MENU",
    "MENUITEM",
    "OBJECT",
    "SELECT",
    "TEXTAREA",
    "SUMMARY"
  ];
  var interactiveRoles = [
    "button",
    "menu",
    "menuitem",
    "link",
    "checkbox",
    "radio",
    "slider",
    "tab",
    "tabpanel",
    "textbox",
    "combobox",
    "grid",
    "listbox",
    "option",
    "progressbar",
    "scrollbar",
    "searchbox",
    "switch",
    "tree",
    "treeitem",
    "spinbutton",
    "tooltip"
  ];
  var interactiveAriaRoles = ["menu", "menuitem", "button"];
  var isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) {
      return false;
    }
    if (!isTopElement(element, rect)) {
      return false;
    }
    const visible = element.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true
    });
    return visible;
  };
  var isTextVisible = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) {
      return false;
    }
    const parent = element.parentElement;
    if (!parent) {
      return false;
    }
    const visible = parent.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true
    });
    return visible;
  };
  function isTopElement(elem, rect) {
    const points = [
      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.25 },
      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.25 },
      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.75 },
      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.75 },
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    ];
    return points.some((point) => {
      const topEl = document.elementFromPoint(point.x, point.y);
      let current = topEl;
      while (current && current !== document.body) {
        if (current.isSameNode(elem)) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    });
  }
  var isActive = (element) => {
    if (element.hasAttribute("disabled") || element.hasAttribute("hidden") || element.getAttribute("aria-disabled") === "true") {
      return false;
    }
    return true;
  };
  var isInteractiveElement = (element) => {
    const elementType = element.tagName;
    const elementRole = element.getAttribute("role");
    const elementAriaRole = element.getAttribute("aria-role");
    return elementType && interactiveElementTypes.includes(elementType) || elementRole && interactiveRoles.includes(elementRole) || elementAriaRole && interactiveAriaRoles.includes(elementAriaRole);
  };
  var isLeafElement = (element) => {
    if (element.textContent === "") {
      return false;
    }
    if (element.childNodes.length === 0) {
      return !leafElementDenyList.includes(element.tagName);
    }
    if (element.childNodes.length === 1 && isTextNode(element.childNodes[0])) {
      return true;
    }
    return false;
  };

  // lib/dom/xpathUtils.ts
  function getParentElement(node) {
    return isElementNode(node) ? node.parentElement : node.parentNode;
  }
  function getCombinations(attributes, size) {
    const results = [];
    function helper(start, combo) {
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
  function isXPathFirstResultElement(xpath, target) {
    try {
      const result = document.evaluate(
        xpath,
        document.documentElement,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      return result.snapshotItem(0) === target;
    } catch (error) {
      console.warn(`Invalid XPath expression: ${xpath}`, error);
      return false;
    }
  }
  function escapeXPathString(value) {
    if (value.includes("'")) {
      if (value.includes('"')) {
        return "concat(" + value.split(/('+)/).map((part) => {
          if (part === "'") {
            return `"'"`;
          } else if (part.startsWith("'") && part.endsWith("'")) {
            return `"${part}"`;
          } else {
            return `'${part}'`;
          }
        }).join(",") + ")";
      } else {
        return `"${value}"`;
      }
    } else {
      return `'${value}'`;
    }
  }
  async function generateXPathsForElement(element) {
    if (!element) return [];
    const [complexXPath, standardXPath, idBasedXPath] = await Promise.all([
      generateComplexXPath(element),
      generateStandardXPath(element),
      generatedIdBasedXPath(element)
    ]);
    return [standardXPath, ...idBasedXPath ? [idBasedXPath] : [], complexXPath];
  }
  async function generateComplexXPath(element) {
    const parts = [];
    let currentElement = element;
    while (currentElement && (isTextNode(currentElement) || isElementNode(currentElement))) {
      if (isElementNode(currentElement)) {
        const el = currentElement;
        let selector = el.tagName.toLowerCase();
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
          "alt"
        ];
        const attributes = attributePriority.map((attr) => {
          let value = el.getAttribute(attr);
          if (attr === "href-full" && value) {
            value = el.getAttribute("href");
          }
          return value ? { attr: attr === "href-full" ? "href" : attr, value } : null;
        }).filter((attr) => attr !== null);
        let uniqueSelector = "";
        for (let i = 1; i <= attributes.length; i++) {
          const combinations = getCombinations(attributes, i);
          for (const combo of combinations) {
            const conditions = combo.map((a) => `@${a.attr}=${escapeXPathString(a.value)}`).join(" and ");
            const xpath2 = `//${selector}[${conditions}]`;
            if (isXPathFirstResultElement(xpath2, el)) {
              uniqueSelector = xpath2;
              break;
            }
          }
          if (uniqueSelector) break;
        }
        if (uniqueSelector) {
          parts.unshift(uniqueSelector.replace("//", ""));
          break;
        } else {
          const parent = getParentElement(el);
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (sibling) => sibling.tagName === el.tagName
            );
            const index = siblings.indexOf(el) + 1;
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
  async function generateStandardXPath(element) {
    const parts = [];
    while (element && (isTextNode(element) || isElementNode(element))) {
      let index = 0;
      let hasSameTypeSiblings = false;
      const siblings = element.parentElement ? Array.from(element.parentElement.childNodes) : [];
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling.nodeType === element.nodeType && sibling.nodeName === element.nodeName) {
          index = index + 1;
          hasSameTypeSiblings = true;
          if (sibling.isSameNode(element)) {
            break;
          }
        }
      }
      if (element.nodeName !== "#text") {
        const tagName = element.nodeName.toLowerCase();
        const pathIndex = hasSameTypeSiblings ? `[${index}]` : "";
        parts.unshift(`${tagName}${pathIndex}`);
      }
      element = element.parentElement;
    }
    return parts.length ? `/${parts.join("/")}` : "";
  }
  async function generatedIdBasedXPath(element) {
    if (isElementNode(element) && element.id) {
      return `//*[@id='${element.id}']`;
    }
    return null;
  }

  // lib/dom/utils.ts
  async function waitForDomSettle() {
    return new Promise((resolve) => {
      const createTimeout = () => {
        return setTimeout(() => {
          resolve();
        }, 2e3);
      };
      let timeout = createTimeout();
      const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = createTimeout();
      });
      observer.observe(window.document.body, { childList: true, subtree: true });
    });
  }
  window.waitForDomSettle = waitForDomSettle;
  function calculateViewportHeight() {
    return Math.ceil(window.innerHeight * 0.75);
  }
  function canElementScroll(elem) {
    if (typeof elem.scrollTo !== "function") {
      console.warn("canElementScroll: .scrollTo is not a function.");
      return false;
    }
    try {
      const originalTop = elem.scrollTop;
      elem.scrollTo({
        top: originalTop + 100,
        left: 0,
        behavior: "instant"
      });
      if (elem.scrollTop === originalTop) {
        throw new Error("scrollTop did not change");
      }
      elem.scrollTo({
        top: originalTop,
        left: 0,
        behavior: "instant"
      });
      return true;
    } catch (error) {
      console.warn("canElementScroll error:", error.message || error);
      return false;
    }
  }
  function getNodeFromXpath(xpath) {
    return document.evaluate(
      xpath,
      document.documentElement,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }

  // lib/dom/candidateCollector.ts
  var xpathCache = /* @__PURE__ */ new Map();
  async function collectCandidateElements(candidateContainerRoot, indexOffset = 0) {
    const DOMQueue = [...candidateContainerRoot.childNodes];
    const candidateElements = [];
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
    const selectorMap = {};
    let outputString = "";
    const xpathLists = await Promise.all(
      candidateElements.map((elem) => {
        if (xpathCache.has(elem)) {
          return Promise.resolve(xpathCache.get(elem));
        }
        return generateXPathsForElement(elem).then((xpaths) => {
          xpathCache.set(elem, xpaths);
          return xpaths;
        });
      })
    );
    candidateElements.forEach((elem, idx) => {
      const xpaths = xpathLists[idx];
      let elemOutput = "";
      if (isTextNode(elem)) {
        const textContent = elem.textContent?.trim();
        if (textContent) {
          elemOutput += `${idx + indexOffset}:${textContent}
`;
        }
      } else if (isElementNode(elem)) {
        const tagName = elem.tagName.toLowerCase();
        const attributes = collectEssentialAttributes(elem);
        const opening = `<${tagName}${attributes ? " " + attributes : ""}>`;
        const closing = `</${tagName}>`;
        const textContent = elem.textContent?.trim() || "";
        elemOutput += `${idx + indexOffset}:${opening}${textContent}${closing}
`;
      }
      outputString += elemOutput;
      selectorMap[idx + indexOffset] = xpaths;
    });
    return { outputString, selectorMap };
  }
  function collectEssentialAttributes(element) {
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
      "value"
    ];
    const attrs = essentialAttributes.map((attr) => {
      const value = element.getAttribute(attr);
      return value ? `${attr}="${value}"` : "";
    }).filter((attr) => attr !== "");
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-")) {
        attrs.push(`${attr.name}="${attr.value}"`);
      }
    });
    return attrs.join(" ");
  }

  // lib/dom/StagehandContainer.ts
  var StagehandContainer = class {
    /**
     * Collects multiple "DOM chunks" by scrolling through the container
     * in increments from `startOffset` to `endOffset`. At each scroll
     * position, the function extracts a snapshot of "candidate elements"
     * using `collectCandidateElements`.
     *
     * Each chunk represents a subset of the DOM at a particular
     * vertical scroll offset, including:
     *
     * - `startOffset` & `endOffset`: The vertical scroll bounds for this chunk.
     * - `outputString`: A serialized representation of extracted DOM text.
     * - `selectorMap`: A mapping of temporary indices to the actual element(s)
     *   that were collected in this chunk, useful for further processing.
     *
     * @param startOffset - The initial scroll offset from which to begin collecting.
     * @param endOffset - The maximum scroll offset to collect up to.
     * @param chunkSize - The vertical increment to move between each chunk.
     * @param scrollTo - Whether we should scroll to the chunk
     * @param scrollBackToTop - Whether to scroll the container back to the top once finished.
     * @param candidateContainer - Optionally, a specific container element within
     * the root for which to collect data. If omitted, uses `this.getRootElement()`.
     *
     * @returns A promise that resolves with an array of `DomChunk` objects.
     *
     * ### How It Works
     *
     * 1. **Scroll Range Calculation**:
     *    - Computes `maxOffset` as the maximum offset that can be scrolled
     *      (`scrollHeight - viewportHeight`).
     *    - Restricts `endOffset` to not exceed `maxOffset`.
     *
     * 2. **Chunk Iteration**:
     *    - Loops from `startOffset` to `endOffset` in steps of `chunkSize`.
     *    - For each offset `current`, we call `this.scrollTo(current)`
     *      to position the container.
     *
     * 3. **Element Collection**:
     *    - Invokes `collectCandidateElements` on either `candidateContainer`
     *      (if provided) or the result of `this.getRootElement()`.
     *    - This returns both an `outputString` (serialized text)
     *      and a `selectorMap` of found elements for that section of the DOM.
     *
     * 4. **Chunk Assembly**:
     *    - Creates a `DomChunk` object for the current offset range,
     *      storing `outputString`, `selectorMap`, and scroll offsets.
     *    - Pushes it onto the `chunks` array.
     *
     * 5. **Scroll Reset**:
     *    - Once iteration completes, if `scrollBackToTop` is `true`,
     *      we scroll back to offset `0`.
     */
    async collectDomChunks(startOffset, endOffset, chunkSize, scrollTo = true, scrollBackToTop = true, candidateContainer) {
      const chunks = [];
      let maxOffset = this.getScrollHeight();
      let current = startOffset;
      let finalEnd = endOffset;
      let index = 0;
      while (current <= finalEnd) {
        if (scrollTo) {
          await this.scrollTo(current);
        }
        const rootCandidate = candidateContainer || this.getRootElement();
        const { outputString, selectorMap } = await collectCandidateElements(
          rootCandidate,
          index
        );
        chunks.push({
          startOffset: current,
          endOffset: current + chunkSize,
          outputString,
          selectorMap
        });
        index += Object.keys(selectorMap).length;
        current += chunkSize;
        if (!candidateContainer && current > endOffset) {
          const newScrollHeight = this.getScrollHeight();
          if (newScrollHeight > maxOffset) {
            maxOffset = newScrollHeight;
          }
          if (newScrollHeight > finalEnd) {
            finalEnd = newScrollHeight;
          }
        }
      }
      if (scrollBackToTop) {
        await this.scrollTo(0);
      }
      return chunks;
    }
  };

  // lib/dom/GlobalPageContainer.ts
  var GlobalPageContainer = class extends StagehandContainer {
    getRootElement() {
      return document.body;
    }
    /**
     * Calculates the viewport height for the entire page, using a helper.
     * The helper returns 75% of the window height, to ensure that we don't
     * miss any content that may be behind sticky elements like nav bars.
     *
     * @returns The current height of the global viewport, in pixels.
     */
    getViewportHeight() {
      return calculateViewportHeight();
    }
    getScrollHeight() {
      return document.documentElement.scrollHeight;
    }
    getScrollPosition() {
      return window.scrollY;
    }
    /**
     * Smoothly scrolls the page to the specified vertical offset, and then
     * waits until scrolling has stopped. There is a delay built in to allow
     * for lazy loading and other asynchronous content to load.
     *
     * @param offset - The desired scroll offset from the top of the page.
     * @returns A promise that resolves once scrolling is complete.
     */
    async scrollTo(offset) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.scrollTo({ top: offset, behavior: "smooth" });
      await this.waitForScrollEnd();
    }
    /**
     * Scrolls the page so that a given element is visible, or scrolls to the top
     * if no element is specified. Uses smooth scrolling and waits for it to complete.
     *
     * @param element - The DOM element to bring into view. If omitted, scrolls to top.
     * @returns A promise that resolves once scrolling is complete.
     */
    async scrollIntoView(element) {
      if (!element) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const rect = element.getBoundingClientRect();
        const currentY = window.scrollY || document.documentElement.scrollTop;
        const elementY = currentY + rect.top - window.innerHeight * 0.25;
        window.scrollTo({ top: elementY, behavior: "smooth" });
      }
      await this.waitForScrollEnd();
    }
    /**
     * Internal helper that waits until the global scroll activity has stopped.
     * It listens for scroll events, resetting a short timer every time a scroll
     * occurs, and resolves once there's no scroll for ~100ms.
     *
     * @returns A promise that resolves when scrolling has finished.
     */
    async waitForScrollEnd() {
      return new Promise((resolve) => {
        let scrollEndTimer;
        const handleScroll = () => {
          clearTimeout(scrollEndTimer);
          scrollEndTimer = window.setTimeout(() => {
            window.removeEventListener("scroll", handleScroll);
            resolve();
          }, 100);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
      });
    }
  };

  // lib/dom/ElementContainer.ts
  var ElementContainer = class extends StagehandContainer {
    /**
     * Creates an instance of `ElementContainer` tied to a specific element.
     * @param el - The scrollable `HTMLElement` that this container controls.
     */
    constructor(el) {
      super();
      this.el = el;
    }
    getRootElement() {
      return this.el;
    }
    /**
     * Retrieves the height of the visible viewport within this element
     * (`el.clientHeight`).
     *
     * @returns The visible (client) height of the element, in pixels.
     */
    getViewportHeight() {
      return this.el.clientHeight;
    }
    getScrollHeight() {
      return this.el.scrollHeight;
    }
    /**
     * Returns the element's current vertical scroll offset.
     */
    getScrollPosition() {
      return this.el.scrollTop;
    }
    /**
     * Smoothly scrolls this element to the specified vertical offset, and
     * waits for the scrolling to complete.
     *
     * @param offset - The scroll offset (in pixels) from the top of the element.
     * @returns A promise that resolves once scrolling is finished.
     */
    async scrollTo(offset) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.el.scrollTo({ top: offset, behavior: "smooth" });
      await this.waitForScrollEnd();
    }
    /**
     * Scrolls this element so that the given `element` is visible, or
     * scrolls to the top if none is provided. Smoothly animates the scroll
     * and waits until it finishes.
     *
     * @param element - The child element to bring into view. If omitted, scrolls to top.
     * @returns A promise that resolves once scrolling completes.
     */
    async scrollIntoView(element) {
      if (!element) {
        this.el.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        element.scrollIntoView();
      }
      await this.waitForScrollEnd();
    }
    /**
     * Internal helper that waits until scrolling in this element has
     * fully stopped. It listens for scroll events on the element,
     * resetting a short timer every time a scroll occurs, and resolves
     * once there's no scroll for ~100ms.
     *
     * @returns A promise that resolves when scrolling has finished.
     */
    async waitForScrollEnd() {
      return new Promise((resolve) => {
        let scrollEndTimer;
        const handleScroll = () => {
          clearTimeout(scrollEndTimer);
          scrollEndTimer = window.setTimeout(() => {
            this.el.removeEventListener("scroll", handleScroll);
            resolve();
          }, 100);
        };
        this.el.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
      });
    }
  };

  // lib/dom/containerFactory.ts
  function createStagehandContainer(obj) {
    if (obj instanceof Window) {
      return new GlobalPageContainer();
    } else {
      return new ElementContainer(obj);
    }
  }

  // lib/dom/process.ts
  function getScrollableElements(topN) {
    const docEl = document.documentElement;
    const scrollableElements = [docEl];
    const allElements = document.querySelectorAll("*");
    for (const elem of allElements) {
      const style = window.getComputedStyle(elem);
      const overflowY = style.overflowY;
      const isPotentiallyScrollable = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
      if (isPotentiallyScrollable) {
        const candidateScrollDiff = elem.scrollHeight - elem.clientHeight;
        if (candidateScrollDiff > 0 && canElementScroll(elem)) {
          scrollableElements.push(elem);
        }
      }
    }
    scrollableElements.sort((a, b) => b.scrollHeight - a.scrollHeight);
    if (topN !== void 0) {
      return scrollableElements.slice(0, topN);
    }
    return scrollableElements;
  }
  async function getScrollableElementXpaths(topN) {
    const scrollableElems = getScrollableElements(topN);
    const xpaths = [];
    for (const elem of scrollableElems) {
      const allXPaths = await generateXPathsForElement(elem);
      const firstXPath = allXPaths?.[0] || "";
      xpaths.push(firstXPath);
    }
    return xpaths;
  }
  function getNearestScrollableParent(el) {
    const allScrollables = getScrollableElements();
    let current = el;
    while (current) {
      if (allScrollables.includes(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return document.documentElement;
  }
  async function processDom(chunksSeen) {
    const { chunk, chunksArray } = await pickChunk(chunksSeen);
    const container = new GlobalPageContainer();
    const chunkSize = container.getViewportHeight();
    const startOffset = chunk * chunkSize;
    const endOffset = startOffset;
    const domChunks = await container.collectDomChunks(
      startOffset,
      endOffset,
      chunkSize,
      true,
      false,
      // scrollBackToTop
      container.getRootElement()
      // BFS entire doc
    );
    const [domChunk] = domChunks;
    if (!domChunk) {
      return {
        outputString: "",
        selectorMap: {},
        chunk,
        chunks: chunksArray
      };
    }
    console.log("Extracted DOM chunk:\n", domChunk.outputString);
    return {
      outputString: domChunk.outputString,
      selectorMap: domChunk.selectorMap,
      chunk,
      chunks: chunksArray
    };
  }
  async function processAllOfDom(xpath) {
    let candidateElementContainer = null;
    let scrollTarget;
    if (xpath) {
      const node = getNodeFromXpath(xpath);
      if (node) {
        candidateElementContainer = node;
        console.log(`Found element via XPath: ${xpath}`);
        const scrollableElem = getNearestScrollableParent(
          candidateElementContainer
        );
        if (scrollableElem === document.documentElement) {
          scrollTarget = new GlobalPageContainer();
        } else {
          scrollTarget = new ElementContainer(scrollableElem);
        }
        await scrollTarget.scrollIntoView(candidateElementContainer);
        const startOffset2 = scrollTarget.getScrollPosition();
        const scrollTargetHeight = scrollTarget.getViewportHeight();
        const candidateElementContainerHeight = candidateElementContainer.scrollHeight;
        if (candidateElementContainerHeight <= scrollTargetHeight) {
          console.log(
            "Element is smaller/equal to container\u2019s viewport. Doing single chunk."
          );
          const domChunks2 = await scrollTarget.collectDomChunks(
            startOffset2,
            // startOffset
            startOffset2,
            // endOffset => same as start => 1 chunk
            1,
            // chunkSize=1 => doesn't matter, because start==end means exactly 1 iteration
            true,
            true,
            candidateElementContainer
          );
          const singleChunkOutput = combineChunks(domChunks2);
          console.log(
            "Final output (single-chunk):",
            singleChunkOutput.outputString
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
      scrollTarget = mainScrollable === document.documentElement ? createStagehandContainer(window) : createStagehandContainer(mainScrollable);
    }
    const startOffset = scrollTarget.getScrollPosition();
    const viewportHeight = scrollTarget.getViewportHeight();
    const maxScroll = candidateElementContainer ? startOffset + candidateElementContainer.scrollHeight : scrollTarget.getScrollHeight();
    const chunkSize = viewportHeight;
    console.log("processAllOfDom chunk-based from", startOffset, "to", maxScroll);
    const domChunks = await scrollTarget.collectDomChunks(
      startOffset,
      maxScroll,
      chunkSize,
      true,
      true,
      candidateElementContainer ?? void 0
    );
    const finalOutput = combineChunks(domChunks);
    console.log(
      "All DOM elements combined (chunk-based):",
      finalOutput.outputString
    );
    return finalOutput;
  }
  function combineChunks(domChunks) {
    const outputString = domChunks.map((c) => c.outputString).join("");
    let finalSelectorMap = {};
    domChunks.forEach((c) => {
      finalSelectorMap = { ...finalSelectorMap, ...c.selectorMap };
    });
    return { outputString, selectorMap: finalSelectorMap };
  }
  function storeDOM(xpath) {
    if (!xpath) {
      const originalDOM = document.body.cloneNode(true);
      console.log("DOM state stored (root).");
      return originalDOM.outerHTML;
    } else {
      const node = getNodeFromXpath(xpath);
      if (!node) {
        console.error(
          `storeDOM: No element found for xpath: ${xpath}. Returning empty string.`
        );
        return "";
      }
      console.log(`DOM state stored (element at xpath: ${xpath}).`);
      return node.outerHTML;
    }
  }
  function restoreDOM(storedDOM, xpath) {
    console.log("Restoring DOM...");
    if (!storedDOM) {
      console.error("No DOM state was provided.");
      return;
    }
    if (!xpath) {
      document.body.innerHTML = storedDOM;
      console.log("DOM restored (root).");
    } else {
      const node = getNodeFromXpath(xpath);
      if (!node) {
        console.error(
          `restoreDOM: No element found for xpath: ${xpath}. Cannot restore.`
        );
        return;
      }
      node.outerHTML = storedDOM;
      console.log(`DOM restored (element at xpath: ${xpath}).`);
    }
  }
  function createTextBoundingBoxes(xpath) {
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
        0
      );
      style.sheet.insertRule(
        `
        code .stagehand-highlighted-word, code .stagehand-space,
        pre .stagehand-highlighted-word, pre .stagehand-space {
          white-space: pre-wrap;
          display: inline !important;
      }
     `,
        1
      );
    }
    function applyHighlighting(root) {
      const containerSelector = root instanceof Document ? "body *" : "*";
      root.querySelectorAll(containerSelector).forEach((element) => {
        if (element.closest && element.closest(".stagehand-nav, .stagehand-marker")) {
          return;
        }
        if (["SCRIPT", "STYLE", "IFRAME", "INPUT"].includes(element.tagName)) {
          return;
        }
        const childNodes = Array.from(element.childNodes);
        childNodes.forEach((node) => {
          if (node.nodeType === 3 && node.textContent?.trim().length > 0) {
            const textContent = node.textContent.replace(/\u00A0/g, " ");
            const tokens = textContent.split(/(\s+)/g);
            const fragment = document.createDocumentFragment();
            const parentIsCode = element.tagName === "CODE";
            tokens.forEach((token) => {
              const span = document.createElement("span");
              span.textContent = token;
              if (parentIsCode) {
                span.style.whiteSpace = "pre-wrap";
                span.style.display = "inline";
              }
              span.className = token.trim().length === 0 ? "stagehand-space" : "stagehand-highlighted-word";
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
      const node = getNodeFromXpath(xpath);
      if (!node) {
        console.warn(
          `createTextBoundingBoxes: No element found for xpath "${xpath}".`
        );
        return;
      }
      applyHighlighting(node);
    }
  }
  function getElementBoundingBoxes(xpath) {
    const element = getNodeFromXpath(xpath);
    if (!element) return [];
    const isValidText = (text) => text && text.trim().length > 0;
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
            height: parentRect.height
          }
        ];
      } else {
        return [];
      }
    }
    let placeholderText = "";
    if ((element.tagName.toLowerCase() === "input" || element.tagName.toLowerCase() === "textarea") && element.placeholder) {
      placeholderText = element.placeholder;
    } else if (element.tagName.toLowerCase() === "a") {
      placeholderText = "";
    } else if (element.tagName.toLowerCase() === "img") {
      placeholderText = element.alt || "";
    }
    const words = element.querySelectorAll(
      ".stagehand-highlighted-word"
    );
    const boundingBoxes = Array.from(words).map((word) => {
      const rect = word.getBoundingClientRect();
      return {
        text: word.innerText || "",
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height * 0.75
      };
    }).filter(
      (box) => box.width > 0 && box.height > 0 && box.top >= 0 && box.left >= 0 && isValidText(box.text)
    );
    if (boundingBoxes.length === 0) {
      const elementRect = element.getBoundingClientRect();
      return [
        {
          text: placeholderText,
          top: elementRect.top + window.scrollY,
          left: elementRect.left + window.scrollX,
          width: elementRect.width,
          height: elementRect.height * 0.75
        }
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
  async function pickChunk(chunksSeen) {
    const viewportHeight = calculateViewportHeight();
    const documentHeight = document.documentElement.scrollHeight;
    const chunks = Math.ceil(documentHeight / viewportHeight);
    const chunksArray = Array.from({ length: chunks }, (_, i) => i);
    const chunksRemaining = chunksArray.filter((chunk2) => {
      return !chunksSeen.includes(chunk2);
    });
    const currentScrollPosition = window.scrollY;
    const closestChunk = chunksRemaining.reduce((closest, current) => {
      const currentChunkTop = viewportHeight * current;
      const closestChunkTop = viewportHeight * closest;
      return Math.abs(currentScrollPosition - currentChunkTop) < Math.abs(currentScrollPosition - closestChunkTop) ? current : closest;
    }, chunksRemaining[0]);
    const chunk = closestChunk;
    if (chunk === void 0) {
      throw new Error(`No chunks remaining to check: ${chunksRemaining}`);
    }
    return {
      chunk,
      chunksArray
    };
  }

  // lib/dom/debug.ts
  async function debugDom() {
    window.chunkNumber = 0;
    const container = new GlobalPageContainer();
    const chunkSize = container.getViewportHeight();
    const startOffset = container.getScrollPosition();
    const endOffset = startOffset;
    const singleChunks = await container.collectDomChunks(
      startOffset,
      endOffset,
      chunkSize,
      false,
      false,
      // Don't scroll back to top
      container.getRootElement()
      // BFS entire doc
    );
    const [singleChunk] = singleChunks;
    if (!singleChunk) {
      console.warn("No chunk was returned. Possibly empty doc?");
      return;
    }
    const multiSelectorMap = singleChunk.selectorMap;
    const selectorMap = multiSelectorMapToSelectorMap(multiSelectorMap);
    drawChunk(selectorMap);
  }
  function multiSelectorMapToSelectorMap(multiSelectorMap) {
    return Object.fromEntries(
      Object.entries(multiSelectorMap).map(([key, selectors]) => [
        Number(key),
        selectors[0]
      ])
    );
  }
  function drawChunk(selectorMap) {
    if (!window.showChunks) return;
    cleanupMarkers();
    Object.values(selectorMap).forEach((selector) => {
      const element = getNodeFromXpath(selector);
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
        overlay.style.padding = "2px";
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.backgroundColor = color;
        overlay.className = "stagehand-marker";
        overlay.style.opacity = "0.3";
        overlay.style.zIndex = "1000000000";
        overlay.style.border = "1px solid";
        overlay.style.pointerEvents = "none";
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
})();
