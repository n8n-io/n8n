"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var dom_exports = {};
__export(dom_exports, {
  ElementHandle: () => ElementHandle,
  FrameExecutionContext: () => FrameExecutionContext,
  NonRecoverableDOMError: () => NonRecoverableDOMError,
  assertDone: () => assertDone,
  isNonRecoverableDOMError: () => isNonRecoverableDOMError,
  kUnableToAdoptErrorMessage: () => kUnableToAdoptErrorMessage,
  throwElementIsNotAttached: () => throwElementIsNotAttached,
  throwRetargetableDOMError: () => throwRetargetableDOMError
});
module.exports = __toCommonJS(dom_exports);
var import_fs = __toESM(require("fs"));
var js = __toESM(require("./javascript"));
var import_utils = require("../utils");
var import_fileUploadUtils = require("./fileUploadUtils");
var rawInjectedScriptSource = __toESM(require("../generated/injectedScriptSource"));
class NonRecoverableDOMError extends Error {
}
function isNonRecoverableDOMError(error) {
  return error instanceof NonRecoverableDOMError;
}
class FrameExecutionContext extends js.ExecutionContext {
  constructor(delegate, frame, world) {
    super(frame, delegate, world || "content-script");
    this.frame = frame;
    this.world = world;
  }
  adoptIfNeeded(handle) {
    if (handle instanceof ElementHandle && handle._context !== this)
      return this.frame._page.delegate.adoptElementHandle(handle, this);
    return null;
  }
  async evaluate(pageFunction, arg) {
    return js.evaluate(this, true, pageFunction, arg);
  }
  async evaluateHandle(pageFunction, arg) {
    return js.evaluate(this, false, pageFunction, arg);
  }
  async evaluateExpression(expression, options, arg) {
    return js.evaluateExpression(this, expression, { ...options, returnByValue: true }, arg);
  }
  async evaluateExpressionHandle(expression, options, arg) {
    return js.evaluateExpression(this, expression, { ...options, returnByValue: false }, arg);
  }
  injectedScript() {
    if (!this._injectedScriptPromise) {
      const customEngines = [];
      const selectorsRegistry = this.frame._page.browserContext.selectors();
      for (const [name, { source: source2 }] of selectorsRegistry._engines)
        customEngines.push({ name, source: `(${source2})` });
      const sdkLanguage = this.frame._page.browserContext._browser.sdkLanguage();
      const options = {
        isUnderTest: (0, import_utils.isUnderTest)(),
        sdkLanguage,
        testIdAttributeName: selectorsRegistry.testIdAttributeName(),
        stableRafCount: this.frame._page.delegate.rafCountForStablePosition(),
        browserName: this.frame._page.browserContext._browser.options.name,
        isUtilityWorld: this.world === "utility",
        customEngines
      };
      const source = `
        (() => {
        const module = {};
        ${rawInjectedScriptSource.source}
        return new (module.exports.InjectedScript())(globalThis, ${JSON.stringify(options)});
        })();
      `;
      this._injectedScriptPromise = this.rawEvaluateHandle(source).then((handle) => {
        handle._setPreview("InjectedScript");
        return handle;
      });
    }
    return this._injectedScriptPromise;
  }
}
class ElementHandle extends js.JSHandle {
  constructor(context, objectId) {
    super(context, "node", void 0, objectId);
    this.__elementhandle = true;
    this._page = context.frame._page;
    this._frame = context.frame;
    this._initializePreview().catch((e) => {
    });
  }
  async _initializePreview() {
    const utility = await this._context.injectedScript();
    this._setPreview(await utility.evaluate((injected, e) => "JSHandle@" + injected.previewNode(e), this));
  }
  asElement() {
    return this;
  }
  async evaluateInUtility(pageFunction, arg) {
    try {
      const utility = await this._frame._utilityContext();
      return await utility.evaluate(pageFunction, [await utility.injectedScript(), this, arg]);
    } catch (e) {
      if (this._frame.isNonRetriableError(e))
        throw e;
      return "error:notconnected";
    }
  }
  async evaluateHandleInUtility(pageFunction, arg) {
    try {
      const utility = await this._frame._utilityContext();
      return await utility.evaluateHandle(pageFunction, [await utility.injectedScript(), this, arg]);
    } catch (e) {
      if (this._frame.isNonRetriableError(e))
        throw e;
      return "error:notconnected";
    }
  }
  async ownerFrame() {
    const frameId = await this._page.delegate.getOwnerFrame(this);
    if (!frameId)
      return null;
    const frame = this._page.frameManager.frame(frameId);
    if (frame)
      return frame;
    for (const page of this._page.browserContext.pages()) {
      const frame2 = page.frameManager.frame(frameId);
      if (frame2)
        return frame2;
    }
    return null;
  }
  async isIframeElement() {
    return this.evaluateInUtility(([injected, node]) => node && (node.nodeName === "IFRAME" || node.nodeName === "FRAME"), {});
  }
  async contentFrame() {
    const isFrameElement = throwRetargetableDOMError(await this.isIframeElement());
    if (!isFrameElement)
      return null;
    return this._page.delegate.getContentFrame(this);
  }
  async getAttribute(progress, name) {
    return this._frame.getAttribute(progress, ":scope", name, {}, this);
  }
  async inputValue(progress) {
    return this._frame.inputValue(progress, ":scope", {}, this);
  }
  async textContent(progress) {
    return this._frame.textContent(progress, ":scope", {}, this);
  }
  async innerText(progress) {
    return this._frame.innerText(progress, ":scope", {}, this);
  }
  async innerHTML(progress) {
    return this._frame.innerHTML(progress, ":scope", {}, this);
  }
  async dispatchEvent(progress, type, eventInit = {}) {
    return this._frame.dispatchEvent(progress, ":scope", type, eventInit, {}, this);
  }
  async _scrollRectIntoViewIfNeeded(progress, rect) {
    return await progress.race(this._page.delegate.scrollRectIntoViewIfNeeded(this, rect));
  }
  async _waitAndScrollIntoViewIfNeeded(progress, waitForVisible) {
    const result = await this._retryAction(progress, "scroll into view", async () => {
      progress.log(`  waiting for element to be stable`);
      const waitResult = await progress.race(this.evaluateInUtility(async ([injected, node, { waitForVisible: waitForVisible2 }]) => {
        return await injected.checkElementStates(node, waitForVisible2 ? ["visible", "stable"] : ["stable"]);
      }, { waitForVisible }));
      if (waitResult)
        return waitResult;
      return await this._scrollRectIntoViewIfNeeded(progress);
    }, {});
    assertDone(throwRetargetableDOMError(result));
  }
  async scrollIntoViewIfNeeded(progress) {
    await this._waitAndScrollIntoViewIfNeeded(
      progress,
      false
      /* waitForVisible */
    );
  }
  async _clickablePoint() {
    const intersectQuadWithViewport = (quad) => {
      return quad.map((point) => ({
        x: Math.min(Math.max(point.x, 0), metrics.width),
        y: Math.min(Math.max(point.y, 0), metrics.height)
      }));
    };
    const computeQuadArea = (quad) => {
      let area = 0;
      for (let i = 0; i < quad.length; ++i) {
        const p1 = quad[i];
        const p2 = quad[(i + 1) % quad.length];
        area += (p1.x * p2.y - p2.x * p1.y) / 2;
      }
      return Math.abs(area);
    };
    const [quads, metrics] = await Promise.all([
      this._page.delegate.getContentQuads(this),
      this._page.mainFrame()._utilityContext().then((utility) => utility.evaluate(() => ({ width: innerWidth, height: innerHeight })))
    ]);
    if (quads === "error:notconnected")
      return quads;
    if (!quads || !quads.length)
      return "error:notvisible";
    const filtered = quads.map((quad) => intersectQuadWithViewport(quad)).filter((quad) => computeQuadArea(quad) > 0.99);
    if (!filtered.length)
      return "error:notinviewport";
    if (this._page.browserContext._browser.options.name === "firefox") {
      for (const quad of filtered) {
        const integerPoint = findIntegerPointInsideQuad(quad);
        if (integerPoint)
          return integerPoint;
      }
    }
    return quadMiddlePoint(filtered[0]);
  }
  async _offsetPoint(offset) {
    const [box, border] = await Promise.all([
      this.boundingBox(),
      this.evaluateInUtility(([injected, node]) => injected.getElementBorderWidth(node), {}).catch((e) => {
      })
    ]);
    if (!box || !border)
      return "error:notvisible";
    if (border === "error:notconnected")
      return border;
    return {
      x: box.x + border.left + offset.x,
      y: box.y + border.top + offset.y
    };
  }
  async _retryAction(progress, actionName, action, options) {
    let retry = 0;
    const waitTime = [0, 20, 100, 100, 500];
    const noAutoWaiting = options.__testHookNoAutoWaiting ?? options.noAutoWaiting;
    while (true) {
      if (retry) {
        progress.log(`retrying ${actionName} action${options.trial ? " (trial run)" : ""}`);
        const timeout = waitTime[Math.min(retry - 1, waitTime.length - 1)];
        if (timeout) {
          progress.log(`  waiting ${timeout}ms`);
          const result2 = await progress.race(this.evaluateInUtility(([injected, node, timeout2]) => new Promise((f) => setTimeout(f, timeout2)), timeout));
          if (result2 === "error:notconnected")
            return result2;
        }
      } else {
        progress.log(`attempting ${actionName} action${options.trial ? " (trial run)" : ""}`);
      }
      if (!options.skipActionPreChecks && !options.force && !noAutoWaiting)
        await this._frame._page.performActionPreChecks(progress);
      const result = await action(retry);
      ++retry;
      if (result === "error:notvisible") {
        if (options.force || noAutoWaiting)
          throw new NonRecoverableDOMError("Element is not visible");
        progress.log("  element is not visible");
        continue;
      }
      if (result === "error:notinviewport") {
        if (options.force || noAutoWaiting)
          throw new NonRecoverableDOMError("Element is outside of the viewport");
        progress.log("  element is outside of the viewport");
        continue;
      }
      if (result === "error:optionsnotfound") {
        if (noAutoWaiting)
          throw new NonRecoverableDOMError("Did not find some options");
        progress.log("  did not find some options");
        continue;
      }
      if (result === "error:optionnotenabled") {
        if (noAutoWaiting)
          throw new NonRecoverableDOMError("Option being selected is not enabled");
        progress.log("  option being selected is not enabled");
        continue;
      }
      if (typeof result === "object" && "hitTargetDescription" in result) {
        if (noAutoWaiting)
          throw new NonRecoverableDOMError(`${result.hitTargetDescription} intercepts pointer events`);
        progress.log(`  ${result.hitTargetDescription} intercepts pointer events`);
        continue;
      }
      if (typeof result === "object" && "missingState" in result) {
        if (noAutoWaiting)
          throw new NonRecoverableDOMError(`Element is not ${result.missingState}`);
        progress.log(`  element is not ${result.missingState}`);
        continue;
      }
      return result;
    }
  }
  async _retryPointerAction(progress, actionName, waitForEnabled, action, options) {
    const skipActionPreChecks = actionName === "move and up";
    return await this._retryAction(progress, actionName, async (retry) => {
      const scrollOptions = [
        void 0,
        { block: "end", inline: "end" },
        { block: "center", inline: "center" },
        { block: "start", inline: "start" }
      ];
      const forceScrollOptions = scrollOptions[retry % scrollOptions.length];
      return await this._performPointerAction(progress, actionName, waitForEnabled, action, forceScrollOptions, options);
    }, { ...options, skipActionPreChecks });
  }
  async _performPointerAction(progress, actionName, waitForEnabled, action, forceScrollOptions, options) {
    const { force = false, position } = options;
    const doScrollIntoView = async () => {
      if (forceScrollOptions) {
        return await this.evaluateInUtility(([injected, node, options2]) => {
          if (node.nodeType === 1)
            node.scrollIntoView(options2);
          return "done";
        }, forceScrollOptions);
      }
      return await this._scrollRectIntoViewIfNeeded(progress, position ? { x: position.x, y: position.y, width: 0, height: 0 } : void 0);
    };
    if (this._frame.parentFrame()) {
      await progress.race(doScrollIntoView().catch(() => {
      }));
    }
    if (options.__testHookBeforeStable)
      await progress.race(options.__testHookBeforeStable());
    if (!force) {
      const elementStates = waitForEnabled ? ["visible", "enabled", "stable"] : ["visible", "stable"];
      progress.log(`  waiting for element to be ${waitForEnabled ? "visible, enabled and stable" : "visible and stable"}`);
      const result = await progress.race(this.evaluateInUtility(async ([injected, node, { elementStates: elementStates2 }]) => {
        return await injected.checkElementStates(node, elementStates2);
      }, { elementStates }));
      if (result)
        return result;
      progress.log(`  element is ${waitForEnabled ? "visible, enabled and stable" : "visible and stable"}`);
    }
    if (options.__testHookAfterStable)
      await progress.race(options.__testHookAfterStable());
    progress.log("  scrolling into view if needed");
    const scrolled = await progress.race(doScrollIntoView());
    if (scrolled !== "done")
      return scrolled;
    progress.log("  done scrolling");
    const maybePoint = position ? await progress.race(this._offsetPoint(position)) : await progress.race(this._clickablePoint());
    if (typeof maybePoint === "string")
      return maybePoint;
    const point = roundPoint(maybePoint);
    progress.metadata.point = point;
    await progress.race(this.instrumentation.onBeforeInputAction(this, progress.metadata));
    let hitTargetInterceptionHandle;
    if (force) {
      progress.log(`  forcing action`);
    } else {
      if (options.__testHookBeforeHitTarget)
        await progress.race(options.__testHookBeforeHitTarget());
      const frameCheckResult = await progress.race(this._checkFrameIsHitTarget(point));
      if (frameCheckResult === "error:notconnected" || "hitTargetDescription" in frameCheckResult)
        return frameCheckResult;
      const hitPoint = frameCheckResult.framePoint;
      const actionType = actionName === "move and up" ? "drag" : actionName === "hover" || actionName === "tap" ? actionName : "mouse";
      const handle = await progress.race(this.evaluateHandleInUtility(([injected, node, { actionType: actionType2, hitPoint: hitPoint2, trial }]) => injected.setupHitTargetInterceptor(node, actionType2, hitPoint2, trial), { actionType, hitPoint, trial: !!options.trial }));
      if (handle === "error:notconnected")
        return handle;
      if (!handle._objectId) {
        const error = handle.rawValue();
        if (error === "error:notconnected")
          return error;
        return { hitTargetDescription: error };
      }
      hitTargetInterceptionHandle = handle;
    }
    const actionResult = await this._page.frameManager.waitForSignalsCreatedBy(progress, options.waitAfter === true, async () => {
      if (options.__testHookBeforePointerAction)
        await progress.race(options.__testHookBeforePointerAction());
      let restoreModifiers;
      if (options && options.modifiers)
        restoreModifiers = await this._page.keyboard.ensureModifiers(progress, options.modifiers);
      progress.log(`  performing ${actionName} action`);
      await action(point);
      if (restoreModifiers)
        await this._page.keyboard.ensureModifiers(progress, restoreModifiers);
      if (hitTargetInterceptionHandle) {
        const stopHitTargetInterception = this._frame.raceAgainstEvaluationStallingEvents(() => {
          return hitTargetInterceptionHandle.evaluate((h) => h.stop());
        }).catch((e) => "done").finally(() => {
          hitTargetInterceptionHandle?.dispose();
        });
        if (options.waitAfter !== false) {
          const hitTargetResult = await progress.race(stopHitTargetInterception);
          if (hitTargetResult !== "done")
            return hitTargetResult;
        }
      }
      progress.log(`  ${options.trial ? "trial " : ""}${actionName} action done`);
      progress.log("  waiting for scheduled navigations to finish");
      if (options.__testHookAfterPointerAction)
        await progress.race(options.__testHookAfterPointerAction());
      return "done";
    }).finally(() => {
      const stopPromise = hitTargetInterceptionHandle?.evaluate((h) => h.stop()).catch(() => {
      });
      stopPromise?.then(() => hitTargetInterceptionHandle?.dispose());
    });
    if (actionResult !== "done")
      return actionResult;
    progress.log("  navigations have finished");
    return "done";
  }
  async _markAsTargetElement(progress) {
    if (!progress.metadata.id)
      return;
    await progress.race(this.evaluateInUtility(([injected, node, callId]) => {
      if (node.nodeType === 1)
        injected.markTargetElements(/* @__PURE__ */ new Set([node]), callId);
    }, progress.metadata.id));
  }
  async hover(progress, options) {
    await this._markAsTargetElement(progress);
    const result = await this._hover(progress, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  _hover(progress, options) {
    return this._retryPointerAction(progress, "hover", false, (point) => this._page.mouse.move(progress, point.x, point.y), { ...options, waitAfter: "disabled" });
  }
  async click(progress, options) {
    await this._markAsTargetElement(progress);
    const result = await this._click(progress, { ...options, waitAfter: !options.noWaitAfter });
    return assertDone(throwRetargetableDOMError(result));
  }
  _click(progress, options) {
    return this._retryPointerAction(progress, "click", true, (point) => this._page.mouse.click(progress, point.x, point.y, options), options);
  }
  async dblclick(progress, options) {
    await this._markAsTargetElement(progress);
    const result = await this._dblclick(progress, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  _dblclick(progress, options) {
    return this._retryPointerAction(progress, "dblclick", true, (point) => this._page.mouse.click(progress, point.x, point.y, { ...options, clickCount: 2 }), { ...options, waitAfter: "disabled" });
  }
  async tap(progress, options) {
    await this._markAsTargetElement(progress);
    const result = await this._tap(progress, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  _tap(progress, options) {
    return this._retryPointerAction(progress, "tap", true, (point) => this._page.touchscreen.tap(progress, point.x, point.y), { ...options, waitAfter: "disabled" });
  }
  async selectOption(progress, elements, values, options) {
    await this._markAsTargetElement(progress);
    const result = await this._selectOption(progress, elements, values, options);
    return throwRetargetableDOMError(result);
  }
  async _selectOption(progress, elements, values, options) {
    let resultingOptions = [];
    const result = await this._retryAction(progress, "select option", async () => {
      await progress.race(this.instrumentation.onBeforeInputAction(this, progress.metadata));
      if (!options.force)
        progress.log(`  waiting for element to be visible and enabled`);
      const optionsToSelect = [...elements, ...values];
      const result2 = await progress.race(this.evaluateInUtility(async ([injected, node, { optionsToSelect: optionsToSelect2, force }]) => {
        if (!force) {
          const checkResult = await injected.checkElementStates(node, ["visible", "enabled"]);
          if (checkResult)
            return checkResult;
        }
        return injected.selectOptions(node, optionsToSelect2);
      }, { optionsToSelect, force: options.force }));
      if (Array.isArray(result2)) {
        progress.log("  selected specified option(s)");
        resultingOptions = result2;
        return "done";
      }
      return result2;
    }, options);
    if (result === "error:notconnected")
      return result;
    return resultingOptions;
  }
  async fill(progress, value, options) {
    await this._markAsTargetElement(progress);
    const result = await this._fill(progress, value, options);
    assertDone(throwRetargetableDOMError(result));
  }
  async _fill(progress, value, options) {
    progress.log(`  fill("${value}")`);
    return await this._retryAction(progress, "fill", async () => {
      await progress.race(this.instrumentation.onBeforeInputAction(this, progress.metadata));
      if (!options.force)
        progress.log("  waiting for element to be visible, enabled and editable");
      const result = await progress.race(this.evaluateInUtility(async ([injected, node, { value: value2, force }]) => {
        if (!force) {
          const checkResult = await injected.checkElementStates(node, ["visible", "enabled", "editable"]);
          if (checkResult)
            return checkResult;
        }
        return injected.fill(node, value2);
      }, { value, force: options.force }));
      if (result === "needsinput") {
        if (value)
          await this._page.keyboard.insertText(progress, value);
        else
          await this._page.keyboard.press(progress, "Delete");
        return "done";
      } else {
        return result;
      }
    }, options);
  }
  async selectText(progress, options) {
    const result = await this._retryAction(progress, "selectText", async () => {
      if (!options.force)
        progress.log("  waiting for element to be visible");
      return await progress.race(this.evaluateInUtility(async ([injected, node, { force }]) => {
        if (!force) {
          const checkResult = await injected.checkElementStates(node, ["visible"]);
          if (checkResult)
            return checkResult;
        }
        return injected.selectText(node);
      }, { force: options.force }));
    }, options);
    assertDone(throwRetargetableDOMError(result));
  }
  async setInputFiles(progress, params) {
    const inputFileItems = await progress.race((0, import_fileUploadUtils.prepareFilesForUpload)(this._frame, params));
    await this._markAsTargetElement(progress);
    const result = await this._setInputFiles(progress, inputFileItems);
    return assertDone(throwRetargetableDOMError(result));
  }
  async _setInputFiles(progress, items) {
    const { filePayloads, localPaths, localDirectory } = items;
    const multiple = filePayloads && filePayloads.length > 1 || localPaths && localPaths.length > 1;
    const result = await progress.race(this.evaluateHandleInUtility(([injected, node, { multiple: multiple2, directoryUpload }]) => {
      const element = injected.retarget(node, "follow-label");
      if (!element)
        return;
      if (element.tagName !== "INPUT")
        throw injected.createStacklessError("Node is not an HTMLInputElement");
      const inputElement = element;
      if (multiple2 && !inputElement.multiple && !inputElement.webkitdirectory)
        throw injected.createStacklessError("Non-multiple file input can only accept single file");
      if (directoryUpload && !inputElement.webkitdirectory)
        throw injected.createStacklessError("File input does not support directories, pass individual files instead");
      if (!directoryUpload && inputElement.webkitdirectory)
        throw injected.createStacklessError("[webkitdirectory] input requires passing a path to a directory");
      return inputElement;
    }, { multiple, directoryUpload: !!localDirectory }));
    if (result === "error:notconnected" || !result.asElement())
      return "error:notconnected";
    const retargeted = result.asElement();
    await progress.race(this.instrumentation.onBeforeInputAction(this, progress.metadata));
    if (localPaths || localDirectory) {
      const localPathsOrDirectory = localDirectory ? [localDirectory] : localPaths;
      await progress.race(Promise.all(localPathsOrDirectory.map((localPath) => import_fs.default.promises.access(localPath, import_fs.default.constants.F_OK))));
      const waitForInputEvent = localDirectory ? this.evaluate((node) => new Promise((fulfill) => {
        node.addEventListener("input", fulfill, { once: true });
      })).catch(() => {
      }) : Promise.resolve();
      await progress.race(this._page.delegate.setInputFilePaths(retargeted, localPathsOrDirectory));
      await progress.race(waitForInputEvent);
    } else {
      await progress.race(retargeted.evaluateInUtility(([injected, node, files]) => injected.setInputFiles(node, files), filePayloads));
    }
    return "done";
  }
  async focus(progress) {
    await this._markAsTargetElement(progress);
    const result = await this._focus(progress);
    return assertDone(throwRetargetableDOMError(result));
  }
  async _focus(progress, resetSelectionIfNotFocused) {
    return await progress.race(this.evaluateInUtility(([injected, node, resetSelectionIfNotFocused2]) => injected.focusNode(node, resetSelectionIfNotFocused2), resetSelectionIfNotFocused));
  }
  async _blur(progress) {
    return await progress.race(this.evaluateInUtility(([injected, node]) => injected.blurNode(node), {}));
  }
  async type(progress, text, options) {
    await this._markAsTargetElement(progress);
    const result = await this._type(progress, text, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  async _type(progress, text, options) {
    progress.log(`elementHandle.type("${text}")`);
    await progress.race(this.instrumentation.onBeforeInputAction(this, progress.metadata));
    const result = await this._focus(
      progress,
      true
      /* resetSelectionIfNotFocused */
    );
    if (result !== "done")
      return result;
    await this._page.keyboard.type(progress, text, options);
    return "done";
  }
  async press(progress, key, options) {
    await this._markAsTargetElement(progress);
    const result = await this._press(progress, key, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  async _press(progress, key, options) {
    progress.log(`elementHandle.press("${key}")`);
    await progress.race(this.instrumentation.onBeforeInputAction(this, progress.metadata));
    return this._page.frameManager.waitForSignalsCreatedBy(progress, !options.noWaitAfter, async () => {
      const result = await this._focus(
        progress,
        true
        /* resetSelectionIfNotFocused */
      );
      if (result !== "done")
        return result;
      await this._page.keyboard.press(progress, key, options);
      return "done";
    });
  }
  async check(progress, options) {
    const result = await this._setChecked(progress, true, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  async uncheck(progress, options) {
    const result = await this._setChecked(progress, false, options);
    return assertDone(throwRetargetableDOMError(result));
  }
  async _setChecked(progress, state, options) {
    const isChecked = async () => {
      const result2 = await progress.race(this.evaluateInUtility(([injected, node]) => injected.elementState(node, "checked"), {}));
      if (result2 === "error:notconnected" || result2.received === "error:notconnected")
        throwElementIsNotAttached();
      return { matches: result2.matches, isRadio: result2.isRadio };
    };
    await this._markAsTargetElement(progress);
    const checkedState = await isChecked();
    if (checkedState.matches === state)
      return "done";
    if (!state && checkedState.isRadio)
      throw new NonRecoverableDOMError("Cannot uncheck radio button. Radio buttons can only be unchecked by selecting another radio button in the same group.");
    const result = await this._click(progress, { ...options, waitAfter: "disabled" });
    if (result !== "done")
      return result;
    if (options.trial)
      return "done";
    const finalState = await isChecked();
    if (finalState.matches !== state)
      throw new NonRecoverableDOMError("Clicking the checkbox did not change its state");
    return "done";
  }
  async boundingBox() {
    return this._page.delegate.getBoundingBox(this);
  }
  async ariaSnapshot() {
    return await this.evaluateInUtility(([injected, element]) => injected.ariaSnapshot(element, { mode: "expect" }), {});
  }
  async screenshot(progress, options) {
    return await this._page.screenshotter.screenshotElement(progress, this, options);
  }
  async querySelector(selector, options) {
    return this._frame.selectors.query(selector, options, this);
  }
  async querySelectorAll(selector) {
    return this._frame.selectors.queryAll(selector, this);
  }
  async evalOnSelector(selector, strict, expression, isFunction, arg) {
    return this._frame.evalOnSelector(selector, strict, expression, isFunction, arg, this);
  }
  async evalOnSelectorAll(selector, expression, isFunction, arg) {
    return this._frame.evalOnSelectorAll(selector, expression, isFunction, arg, this);
  }
  async isVisible(progress) {
    return this._frame.isVisible(progress, ":scope", {}, this);
  }
  async isHidden(progress) {
    return this._frame.isHidden(progress, ":scope", {}, this);
  }
  async isEnabled(progress) {
    return this._frame.isEnabled(progress, ":scope", {}, this);
  }
  async isDisabled(progress) {
    return this._frame.isDisabled(progress, ":scope", {}, this);
  }
  async isEditable(progress) {
    return this._frame.isEditable(progress, ":scope", {}, this);
  }
  async isChecked(progress) {
    return this._frame.isChecked(progress, ":scope", {}, this);
  }
  async waitForElementState(progress, state) {
    const actionName = `wait for ${state}`;
    const result = await this._retryAction(progress, actionName, async () => {
      return await progress.race(this.evaluateInUtility(async ([injected, node, state2]) => {
        return await injected.checkElementStates(node, [state2]) || "done";
      }, state));
    }, {});
    assertDone(throwRetargetableDOMError(result));
  }
  async waitForSelector(progress, selector, options) {
    return await this._frame.waitForSelector(progress, selector, true, options, this);
  }
  async _adoptTo(context) {
    if (this._context !== context) {
      const adopted = await this._page.delegate.adoptElementHandle(this, context);
      this.dispose();
      return adopted;
    }
    return this;
  }
  async _checkFrameIsHitTarget(point) {
    let frame = this._frame;
    const data = [];
    while (frame.parentFrame()) {
      const frameElement = await frame.frameElement();
      const box = await frameElement.boundingBox();
      const style = await frameElement.evaluateInUtility(([injected, iframe]) => injected.describeIFrameStyle(iframe), {}).catch((e) => "error:notconnected");
      if (!box || style === "error:notconnected")
        return "error:notconnected";
      if (style === "transformed") {
        return { framePoint: void 0 };
      }
      const pointInFrame = { x: point.x - box.x - style.left, y: point.y - box.y - style.top };
      data.push({ frame, frameElement, pointInFrame });
      frame = frame.parentFrame();
    }
    data.push({ frame, frameElement: null, pointInFrame: point });
    for (let i = data.length - 1; i > 0; i--) {
      const element = data[i - 1].frameElement;
      const point2 = data[i].pointInFrame;
      const hitTargetResult = await element.evaluateInUtility(([injected, element2, hitPoint]) => {
        return injected.expectHitTarget(hitPoint, element2);
      }, point2);
      if (hitTargetResult !== "done")
        return hitTargetResult;
    }
    return { framePoint: data[0].pointInFrame };
  }
}
function throwRetargetableDOMError(result) {
  if (result === "error:notconnected")
    throwElementIsNotAttached();
  return result;
}
function throwElementIsNotAttached() {
  throw new Error("Element is not attached to the DOM");
}
function assertDone(result) {
}
function roundPoint(point) {
  return {
    x: (point.x * 100 | 0) / 100,
    y: (point.y * 100 | 0) / 100
  };
}
function quadMiddlePoint(quad) {
  const result = { x: 0, y: 0 };
  for (const point of quad) {
    result.x += point.x / 4;
    result.y += point.y / 4;
  }
  return result;
}
function triangleArea(p1, p2, p3) {
  return Math.abs(p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2;
}
function isPointInsideQuad(point, quad) {
  const area1 = triangleArea(point, quad[0], quad[1]) + triangleArea(point, quad[1], quad[2]) + triangleArea(point, quad[2], quad[3]) + triangleArea(point, quad[3], quad[0]);
  const area2 = triangleArea(quad[0], quad[1], quad[2]) + triangleArea(quad[1], quad[2], quad[3]);
  if (Math.abs(area1 - area2) > 0.1)
    return false;
  return point.x < Math.max(quad[0].x, quad[1].x, quad[2].x, quad[3].x) && point.y < Math.max(quad[0].y, quad[1].y, quad[2].y, quad[3].y);
}
function findIntegerPointInsideQuad(quad) {
  const point = quadMiddlePoint(quad);
  point.x = Math.floor(point.x);
  point.y = Math.floor(point.y);
  if (isPointInsideQuad(point, quad))
    return point;
  point.x += 1;
  if (isPointInsideQuad(point, quad))
    return point;
  point.y += 1;
  if (isPointInsideQuad(point, quad))
    return point;
  point.x -= 1;
  if (isPointInsideQuad(point, quad))
    return point;
}
const kUnableToAdoptErrorMessage = "Unable to adopt element handle from a different document";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ElementHandle,
  FrameExecutionContext,
  NonRecoverableDOMError,
  assertDone,
  isNonRecoverableDOMError,
  kUnableToAdoptErrorMessage,
  throwElementIsNotAttached,
  throwRetargetableDOMError
});
