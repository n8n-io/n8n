"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var screenshotter_exports = {};
__export(screenshotter_exports, {
  Screenshotter: () => Screenshotter,
  validateScreenshotOptions: () => validateScreenshotOptions
});
module.exports = __toCommonJS(screenshotter_exports);
var import_helper = require("./helper");
var import_utils = require("../utils");
var import_multimap = require("../utils/isomorphic/multimap");
function inPagePrepareForScreenshots(screenshotStyle, hideCaret, disableAnimations, syncAnimations) {
  if (syncAnimations) {
    const style = document.createElement("style");
    style.textContent = "body {}";
    document.head.appendChild(style);
    document.documentElement.getBoundingClientRect();
    style.remove();
  }
  if (!screenshotStyle && !hideCaret && !disableAnimations)
    return;
  const collectRoots = (root, roots2 = []) => {
    roots2.push(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    do {
      const node = walker.currentNode;
      const shadowRoot = node instanceof Element ? node.shadowRoot : null;
      if (shadowRoot)
        collectRoots(shadowRoot, roots2);
    } while (walker.nextNode());
    return roots2;
  };
  const roots = collectRoots(document);
  const cleanupCallbacks = [];
  if (screenshotStyle) {
    for (const root of roots) {
      const styleTag = document.createElement("style");
      styleTag.textContent = screenshotStyle;
      if (root === document)
        document.documentElement.append(styleTag);
      else
        root.append(styleTag);
      cleanupCallbacks.push(() => {
        styleTag.remove();
      });
    }
  }
  if (hideCaret) {
    const elements = /* @__PURE__ */ new Map();
    for (const root of roots) {
      root.querySelectorAll("input,textarea,[contenteditable]").forEach((element) => {
        elements.set(element, {
          value: element.style.getPropertyValue("caret-color"),
          priority: element.style.getPropertyPriority("caret-color")
        });
        element.style.setProperty("caret-color", "transparent", "important");
      });
    }
    cleanupCallbacks.push(() => {
      for (const [element, value] of elements)
        element.style.setProperty("caret-color", value.value, value.priority);
    });
  }
  if (disableAnimations) {
    const infiniteAnimationsToResume = /* @__PURE__ */ new Set();
    const handleAnimations = (root) => {
      for (const animation of root.getAnimations()) {
        if (!animation.effect || animation.playbackRate === 0 || infiniteAnimationsToResume.has(animation))
          continue;
        const endTime = animation.effect.getComputedTiming().endTime;
        if (Number.isFinite(endTime)) {
          try {
            animation.finish();
          } catch (e) {
          }
        } else {
          try {
            animation.cancel();
            infiniteAnimationsToResume.add(animation);
          } catch (e) {
          }
        }
      }
    };
    for (const root of roots) {
      const handleRootAnimations = handleAnimations.bind(null, root);
      handleRootAnimations();
      root.addEventListener("transitionrun", handleRootAnimations);
      root.addEventListener("animationstart", handleRootAnimations);
      cleanupCallbacks.push(() => {
        root.removeEventListener("transitionrun", handleRootAnimations);
        root.removeEventListener("animationstart", handleRootAnimations);
      });
    }
    cleanupCallbacks.push(() => {
      for (const animation of infiniteAnimationsToResume) {
        try {
          animation.play();
        } catch (e) {
        }
      }
    });
  }
  window.__pwCleanupScreenshot = () => {
    for (const cleanupCallback of cleanupCallbacks)
      cleanupCallback();
    delete window.__pwCleanupScreenshot;
  };
}
class Screenshotter {
  constructor(page) {
    this._queue = new TaskQueue();
    this._page = page;
    this._queue = new TaskQueue();
  }
  async _originalViewportSize(progress) {
    let viewportSize = this._page.emulatedSize()?.viewport;
    if (!viewportSize)
      viewportSize = await this._page.mainFrame().waitForFunctionValueInUtility(progress, () => ({ width: window.innerWidth, height: window.innerHeight }));
    return viewportSize;
  }
  async _fullPageSize(progress) {
    const fullPageSize = await this._page.mainFrame().waitForFunctionValueInUtility(progress, () => {
      if (!document.body || !document.documentElement)
        return null;
      return {
        width: Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
          document.body.offsetWidth,
          document.documentElement.offsetWidth,
          document.body.clientWidth,
          document.documentElement.clientWidth
        ),
        height: Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        )
      };
    });
    return fullPageSize;
  }
  async screenshotPage(progress, options) {
    const format = validateScreenshotOptions(options);
    return this._queue.postTask(async () => {
      progress.log("taking page screenshot");
      const viewportSize = await this._originalViewportSize(progress);
      await this._preparePageForScreenshot(progress, this._page.mainFrame(), options.style, options.caret !== "initial", options.animations === "disabled");
      try {
        if (options.fullPage) {
          const fullPageSize = await this._fullPageSize(progress);
          let documentRect = { x: 0, y: 0, width: fullPageSize.width, height: fullPageSize.height };
          const fitsViewport = fullPageSize.width <= viewportSize.width && fullPageSize.height <= viewportSize.height;
          if (options.clip)
            documentRect = trimClipToSize(options.clip, documentRect);
          return await this._screenshot(progress, format, documentRect, void 0, fitsViewport, options);
        }
        const viewportRect = options.clip ? trimClipToSize(options.clip, viewportSize) : { x: 0, y: 0, ...viewportSize };
        return await this._screenshot(progress, format, void 0, viewportRect, true, options);
      } finally {
        await this._restorePageAfterScreenshot();
      }
    });
  }
  async screenshotElement(progress, handle, options) {
    const format = validateScreenshotOptions(options);
    return this._queue.postTask(async () => {
      progress.log("taking element screenshot");
      const viewportSize = await this._originalViewportSize(progress);
      await this._preparePageForScreenshot(progress, handle._frame, options.style, options.caret !== "initial", options.animations === "disabled");
      try {
        await handle._waitAndScrollIntoViewIfNeeded(
          progress,
          true
          /* waitForVisible */
        );
        const boundingBox = await progress.race(handle.boundingBox());
        (0, import_utils.assert)(boundingBox, "Node is either not visible or not an HTMLElement");
        (0, import_utils.assert)(boundingBox.width !== 0, "Node has 0 width.");
        (0, import_utils.assert)(boundingBox.height !== 0, "Node has 0 height.");
        const fitsViewport = boundingBox.width <= viewportSize.width && boundingBox.height <= viewportSize.height;
        const scrollOffset = await this._page.mainFrame().waitForFunctionValueInUtility(progress, () => ({ x: window.scrollX, y: window.scrollY }));
        const documentRect = { ...boundingBox };
        documentRect.x += scrollOffset.x;
        documentRect.y += scrollOffset.y;
        return await this._screenshot(progress, format, import_helper.helper.enclosingIntRect(documentRect), void 0, fitsViewport, options);
      } finally {
        await this._restorePageAfterScreenshot();
      }
    });
  }
  async _preparePageForScreenshot(progress, frame, screenshotStyle, hideCaret, disableAnimations) {
    if (disableAnimations)
      progress.log("  disabled all CSS animations");
    const syncAnimations = this._page.delegate.shouldToggleStyleSheetToSyncAnimations();
    await progress.race(this._page.safeNonStallingEvaluateInAllFrames("(" + inPagePrepareForScreenshots.toString() + `)(${JSON.stringify(screenshotStyle)}, ${hideCaret}, ${disableAnimations}, ${syncAnimations})`, "utility"));
    try {
      if (!process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY) {
        progress.log("waiting for fonts to load...");
        await progress.race(frame.nonStallingEvaluateInExistingContext("document.fonts.ready", "utility").catch(() => {
        }));
        progress.log("fonts loaded");
      }
    } catch (error) {
      await this._restorePageAfterScreenshot();
      throw error;
    }
  }
  async _restorePageAfterScreenshot() {
    await this._page.safeNonStallingEvaluateInAllFrames("window.__pwCleanupScreenshot && window.__pwCleanupScreenshot()", "utility");
  }
  async _maskElements(progress, options) {
    if (!options.mask || !options.mask.length)
      return () => Promise.resolve();
    const framesToParsedSelectors = new import_multimap.MultiMap();
    await progress.race(Promise.all((options.mask || []).map(async ({ frame, selector }) => {
      const pair = await frame.selectors.resolveFrameForSelector(selector);
      if (pair)
        framesToParsedSelectors.set(pair.frame, pair.info.parsed);
    })));
    const frames = [...framesToParsedSelectors.keys()];
    const cleanup = async () => {
      await Promise.all(frames.map((frame) => frame.hideHighlight()));
    };
    try {
      const promises = frames.map((frame) => frame.maskSelectors(framesToParsedSelectors.get(frame), options.maskColor || "#F0F"));
      await progress.race(Promise.all(promises));
      return cleanup;
    } catch (error) {
      cleanup().catch(() => {
      });
      throw error;
    }
  }
  async _screenshot(progress, format, documentRect, viewportRect, fitsViewport, options) {
    if (options.__testHookBeforeScreenshot)
      await progress.race(options.__testHookBeforeScreenshot());
    const shouldSetDefaultBackground = options.omitBackground && format === "png";
    if (shouldSetDefaultBackground)
      await progress.race(this._page.delegate.setBackgroundColor({ r: 0, g: 0, b: 0, a: 0 }));
    const cleanupHighlight = await this._maskElements(progress, options);
    try {
      const quality = format === "jpeg" ? options.quality ?? 80 : void 0;
      const buffer = await this._page.delegate.takeScreenshot(progress, format, documentRect, viewportRect, quality, fitsViewport, options.scale || "device");
      await cleanupHighlight();
      if (shouldSetDefaultBackground)
        await this._page.delegate.setBackgroundColor();
      if (options.__testHookAfterScreenshot)
        await progress.race(options.__testHookAfterScreenshot());
      return buffer;
    } catch (error) {
      cleanupHighlight().catch(() => {
      });
      if (shouldSetDefaultBackground)
        this._page.delegate.setBackgroundColor().catch(() => {
        });
      throw error;
    }
  }
}
class TaskQueue {
  constructor() {
    this._chain = Promise.resolve();
  }
  postTask(task) {
    const result = this._chain.then(task);
    this._chain = result.catch(() => {
    });
    return result;
  }
}
function trimClipToSize(clip, size) {
  const p1 = {
    x: Math.max(0, Math.min(clip.x, size.width)),
    y: Math.max(0, Math.min(clip.y, size.height))
  };
  const p2 = {
    x: Math.max(0, Math.min(clip.x + clip.width, size.width)),
    y: Math.max(0, Math.min(clip.y + clip.height, size.height))
  };
  const result = { x: p1.x, y: p1.y, width: p2.x - p1.x, height: p2.y - p1.y };
  (0, import_utils.assert)(result.width && result.height, "Clipped area is either empty or outside the resulting image");
  return result;
}
function validateScreenshotOptions(options) {
  let format = null;
  if (options.type) {
    (0, import_utils.assert)(options.type === "png" || options.type === "jpeg", "Unknown options.type value: " + options.type);
    format = options.type;
  }
  if (!format)
    format = "png";
  if (options.quality !== void 0) {
    (0, import_utils.assert)(format === "jpeg", "options.quality is unsupported for the " + format + " screenshots");
    (0, import_utils.assert)(typeof options.quality === "number", "Expected options.quality to be a number but found " + typeof options.quality);
    (0, import_utils.assert)(Number.isInteger(options.quality), "Expected options.quality to be an integer");
    (0, import_utils.assert)(options.quality >= 0 && options.quality <= 100, "Expected options.quality to be between 0 and 100 (inclusive), got " + options.quality);
  }
  if (options.clip) {
    (0, import_utils.assert)(typeof options.clip.x === "number", "Expected options.clip.x to be a number but found " + typeof options.clip.x);
    (0, import_utils.assert)(typeof options.clip.y === "number", "Expected options.clip.y to be a number but found " + typeof options.clip.y);
    (0, import_utils.assert)(typeof options.clip.width === "number", "Expected options.clip.width to be a number but found " + typeof options.clip.width);
    (0, import_utils.assert)(typeof options.clip.height === "number", "Expected options.clip.height to be a number but found " + typeof options.clip.height);
    (0, import_utils.assert)(options.clip.width !== 0, "Expected options.clip.width not to be 0.");
    (0, import_utils.assert)(options.clip.height !== 0, "Expected options.clip.height not to be 0.");
  }
  return format;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Screenshotter,
  validateScreenshotOptions
});
