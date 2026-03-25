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
var recorderUtils_exports = {};
__export(recorderUtils_exports, {
  buildFullSelector: () => buildFullSelector,
  collapseActions: () => collapseActions,
  frameForAction: () => frameForAction,
  generateFrameSelector: () => generateFrameSelector,
  mainFrameForAction: () => mainFrameForAction,
  metadataToCallLog: () => metadataToCallLog,
  shouldMergeAction: () => shouldMergeAction
});
module.exports = __toCommonJS(recorderUtils_exports);
var import_protocolFormatter = require("../../utils/isomorphic/protocolFormatter");
var import_utils = require("../../utils");
var import_timeoutRunner = require("../../utils/isomorphic/timeoutRunner");
function buildFullSelector(framePath, selector) {
  return [...framePath, selector].join(" >> internal:control=enter-frame >> ");
}
function metadataToCallLog(metadata, status) {
  const title = (0, import_protocolFormatter.renderTitleForCall)(metadata);
  if (metadata.error)
    status = "error";
  const params = {
    url: metadata.params?.url,
    selector: metadata.params?.selector
  };
  let duration = metadata.endTime ? metadata.endTime - metadata.startTime : void 0;
  if (typeof duration === "number" && metadata.pauseStartTime && metadata.pauseEndTime) {
    duration -= metadata.pauseEndTime - metadata.pauseStartTime;
    duration = Math.max(duration, 0);
  }
  const callLog = {
    id: metadata.id,
    messages: metadata.log,
    title: title ?? "",
    status,
    error: metadata.error?.error?.message,
    params,
    duration
  };
  return callLog;
}
function mainFrameForAction(pageAliases, actionInContext) {
  const pageAlias = actionInContext.frame.pageAlias;
  const page = [...pageAliases.entries()].find(([, alias]) => pageAlias === alias)?.[0];
  if (!page)
    throw new Error(`Internal error: page ${pageAlias} not found in [${[...pageAliases.values()]}]`);
  return page.mainFrame();
}
async function frameForAction(pageAliases, actionInContext, action) {
  const pageAlias = actionInContext.frame.pageAlias;
  const page = [...pageAliases.entries()].find(([, alias]) => pageAlias === alias)?.[0];
  if (!page)
    throw new Error("Internal error: page not found");
  const fullSelector = buildFullSelector(actionInContext.frame.framePath, action.selector);
  const result = await page.mainFrame().selectors.resolveFrameForSelector(fullSelector);
  if (!result)
    throw new Error("Internal error: frame not found");
  return result.frame;
}
function isSameAction(a, b) {
  return a.action.name === b.action.name && a.frame.pageAlias === b.frame.pageAlias && a.frame.framePath.join("|") === b.frame.framePath.join("|");
}
function isSameSelector(action, lastAction) {
  return "selector" in action.action && "selector" in lastAction.action && action.action.selector === lastAction.action.selector;
}
function isShortlyAfter(action, lastAction) {
  return action.startTime - lastAction.startTime < 500;
}
function shouldMergeAction(action, lastAction) {
  if (!lastAction)
    return false;
  switch (action.action.name) {
    case "fill":
      return isSameAction(action, lastAction) && isSameSelector(action, lastAction);
    case "navigate":
      return isSameAction(action, lastAction);
    case "click":
      return isSameAction(action, lastAction) && isSameSelector(action, lastAction) && isShortlyAfter(action, lastAction) && action.action.clickCount > lastAction.action.clickCount;
  }
  return false;
}
function collapseActions(actions) {
  const result = [];
  for (const action of actions) {
    const lastAction = result[result.length - 1];
    const shouldMerge = shouldMergeAction(action, lastAction);
    if (!shouldMerge) {
      result.push(action);
      continue;
    }
    const startTime = result[result.length - 1].startTime;
    result[result.length - 1] = action;
    result[result.length - 1].startTime = startTime;
  }
  return result;
}
async function generateFrameSelector(frame) {
  const selectorPromises = [];
  while (frame) {
    const parent = frame.parentFrame();
    if (!parent)
      break;
    selectorPromises.push(generateFrameSelectorInParent(parent, frame));
    frame = parent;
  }
  const result = await Promise.all(selectorPromises);
  return result.reverse();
}
async function generateFrameSelectorInParent(parent, frame) {
  const result = await (0, import_timeoutRunner.raceAgainstDeadline)(async () => {
    try {
      const frameElement = await frame.frameElement();
      if (!frameElement || !parent)
        return;
      const utility = await parent._utilityContext();
      const injected = await utility.injectedScript();
      const selector = await injected.evaluate((injected2, element) => {
        return injected2.generateSelectorSimple(element);
      }, frameElement);
      return selector;
    } catch (e) {
    }
  }, (0, import_utils.monotonicTime)() + 2e3);
  if (!result.timedOut && result.result)
    return result.result;
  if (frame.name())
    return `iframe[name=${(0, import_utils.quoteCSSAttributeValue)(frame.name())}]`;
  return `iframe[src=${(0, import_utils.quoteCSSAttributeValue)(frame.url())}]`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildFullSelector,
  collapseActions,
  frameForAction,
  generateFrameSelector,
  mainFrameForAction,
  metadataToCallLog,
  shouldMergeAction
});
