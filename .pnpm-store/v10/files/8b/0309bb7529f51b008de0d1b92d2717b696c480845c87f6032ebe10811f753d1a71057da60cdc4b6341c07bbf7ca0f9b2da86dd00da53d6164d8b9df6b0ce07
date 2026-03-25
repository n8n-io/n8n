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
var traceModel_exports = {};
__export(traceModel_exports, {
  TraceModel: () => TraceModel,
  buildActionTree: () => buildActionTree,
  context: () => context,
  eventsForAction: () => eventsForAction,
  nextActionByStartTime: () => nextActionByStartTime,
  previousActionByEndTime: () => previousActionByEndTime,
  stats: () => stats
});
module.exports = __toCommonJS(traceModel_exports);
var import_protocolFormatter = require("@isomorphic/protocolFormatter");
const contextSymbol = Symbol("context");
const nextInContextSymbol = Symbol("nextInContext");
const prevByEndTimeSymbol = Symbol("prevByEndTime");
const nextByStartTimeSymbol = Symbol("nextByStartTime");
const eventsSymbol = Symbol("events");
class TraceModel {
  constructor(traceUri, contexts) {
    contexts.forEach((contextEntry) => indexModel(contextEntry));
    const libraryContext = contexts.find((context2) => context2.origin === "library");
    this.traceUri = traceUri;
    this.browserName = libraryContext?.browserName || "";
    this.sdkLanguage = libraryContext?.sdkLanguage;
    this.channel = libraryContext?.channel;
    this.testIdAttributeName = libraryContext?.testIdAttributeName;
    this.platform = libraryContext?.platform || "";
    this.playwrightVersion = contexts.find((c) => c.playwrightVersion)?.playwrightVersion;
    this.title = libraryContext?.title || "";
    this.options = libraryContext?.options || {};
    this.actions = mergeActionsAndUpdateTiming(contexts);
    this.pages = [].concat(...contexts.map((c) => c.pages));
    this.wallTime = contexts.map((c) => c.wallTime).reduce((prev, cur) => Math.min(prev || Number.MAX_VALUE, cur), Number.MAX_VALUE);
    this.startTime = contexts.map((c) => c.startTime).reduce((prev, cur) => Math.min(prev, cur), Number.MAX_VALUE);
    this.endTime = contexts.map((c) => c.endTime).reduce((prev, cur) => Math.max(prev, cur), Number.MIN_VALUE);
    this.events = [].concat(...contexts.map((c) => c.events));
    this.stdio = [].concat(...contexts.map((c) => c.stdio));
    this.errors = [].concat(...contexts.map((c) => c.errors));
    this.hasSource = contexts.some((c) => c.hasSource);
    this.hasStepData = contexts.some((context2) => context2.origin === "testRunner");
    this.resources = [...contexts.map((c) => c.resources)].flat();
    this.attachments = this.actions.flatMap((action) => action.attachments?.map((attachment) => ({ ...attachment, callId: action.callId, traceUri })) ?? []);
    this.visibleAttachments = this.attachments.filter((attachment) => !attachment.name.startsWith("_"));
    this.events.sort((a1, a2) => a1.time - a2.time);
    this.resources.sort((a1, a2) => a1._monotonicTime - a2._monotonicTime);
    this.errorDescriptors = this.hasStepData ? this._errorDescriptorsFromTestRunner() : this._errorDescriptorsFromActions();
    this.sources = collectSources(this.actions, this.errorDescriptors);
    this.actionCounters = /* @__PURE__ */ new Map();
    for (const action of this.actions) {
      action.group = action.group ?? (0, import_protocolFormatter.getActionGroup)({ type: action.class, method: action.method });
      if (action.group)
        this.actionCounters.set(action.group, 1 + (this.actionCounters.get(action.group) || 0));
    }
  }
  createRelativeUrl(path) {
    const url = new URL("http://localhost/" + path);
    url.searchParams.set("trace", this.traceUri);
    return url.toString().substring("http://localhost/".length);
  }
  failedAction() {
    return this.actions.findLast((a) => a.error);
  }
  filteredActions(actionsFilter) {
    const filter = new Set(actionsFilter);
    return this.actions.filter((action) => !action.group || filter.has(action.group));
  }
  renderActionTree(filter) {
    const actions = this.filteredActions(filter ?? []);
    const { rootItem } = buildActionTree(actions);
    const actionTree = [];
    const visit = (actionItem, indent) => {
      const title = (0, import_protocolFormatter.renderTitleForCall)({ ...actionItem.action, type: actionItem.action.class });
      actionTree.push(`${indent}${title || actionItem.id}`);
      for (const child of actionItem.children)
        visit(child, indent + "  ");
    };
    rootItem.children.forEach((a) => visit(a, ""));
    return actionTree;
  }
  _errorDescriptorsFromActions() {
    const errors = [];
    for (const action of this.actions || []) {
      if (!action.error?.message)
        continue;
      errors.push({
        action,
        stack: action.stack,
        message: action.error.message
      });
    }
    return errors;
  }
  _errorDescriptorsFromTestRunner() {
    return this.errors.filter((e) => !!e.message).map((error, i) => ({
      stack: error.stack,
      message: error.message
    }));
  }
}
function indexModel(context2) {
  for (const page of context2.pages)
    page[contextSymbol] = context2;
  for (let i = 0; i < context2.actions.length; ++i) {
    const action = context2.actions[i];
    action[contextSymbol] = context2;
  }
  let lastNonRouteAction = void 0;
  for (let i = context2.actions.length - 1; i >= 0; i--) {
    const action = context2.actions[i];
    action[nextInContextSymbol] = lastNonRouteAction;
    if (action.class !== "Route")
      lastNonRouteAction = action;
  }
  for (const event of context2.events)
    event[contextSymbol] = context2;
  for (const resource of context2.resources)
    resource[contextSymbol] = context2;
}
function mergeActionsAndUpdateTiming(contexts) {
  const result = [];
  const actions = mergeActionsAndUpdateTimingSameTrace(contexts);
  result.push(...actions);
  result.sort((a1, a2) => {
    if (a2.parentId === a1.callId)
      return 1;
    if (a1.parentId === a2.callId)
      return -1;
    return a1.endTime - a2.endTime;
  });
  for (let i = 1; i < result.length; ++i)
    result[i][prevByEndTimeSymbol] = result[i - 1];
  result.sort((a1, a2) => {
    if (a2.parentId === a1.callId)
      return -1;
    if (a1.parentId === a2.callId)
      return 1;
    return a1.startTime - a2.startTime;
  });
  for (let i = 0; i + 1 < result.length; ++i)
    result[i][nextByStartTimeSymbol] = result[i + 1];
  return result;
}
let lastTmpStepId = 0;
function mergeActionsAndUpdateTimingSameTrace(contexts) {
  const map = /* @__PURE__ */ new Map();
  const libraryContexts = contexts.filter((context2) => context2.origin === "library");
  const testRunnerContexts = contexts.filter((context2) => context2.origin === "testRunner");
  if (!testRunnerContexts.length || !libraryContexts.length) {
    return contexts.map((context2) => {
      return context2.actions.map((action) => ({ ...action, context: context2 }));
    }).flat();
  }
  for (const context2 of libraryContexts) {
    for (const action of context2.actions) {
      map.set(action.stepId || `tmp-step@${++lastTmpStepId}`, { ...action, context: context2 });
    }
  }
  const delta = monotonicTimeDeltaBetweenLibraryAndRunner(testRunnerContexts, map);
  if (delta)
    adjustMonotonicTime(libraryContexts, delta);
  const nonPrimaryIdToPrimaryId = /* @__PURE__ */ new Map();
  for (const context2 of testRunnerContexts) {
    for (const action of context2.actions) {
      const existing = action.stepId && map.get(action.stepId);
      if (existing) {
        nonPrimaryIdToPrimaryId.set(action.callId, existing.callId);
        if (action.error)
          existing.error = action.error;
        if (action.attachments)
          existing.attachments = action.attachments;
        if (action.annotations)
          existing.annotations = action.annotations;
        if (action.parentId)
          existing.parentId = nonPrimaryIdToPrimaryId.get(action.parentId) ?? action.parentId;
        if (action.group)
          existing.group = action.group;
        existing.startTime = action.startTime;
        existing.endTime = action.endTime;
        continue;
      }
      if (action.parentId)
        action.parentId = nonPrimaryIdToPrimaryId.get(action.parentId) ?? action.parentId;
      map.set(action.stepId || `tmp-step@${++lastTmpStepId}`, { ...action, context: context2 });
    }
  }
  return [...map.values()];
}
function adjustMonotonicTime(contexts, monotonicTimeDelta) {
  for (const context2 of contexts) {
    context2.startTime += monotonicTimeDelta;
    context2.endTime += monotonicTimeDelta;
    for (const action of context2.actions) {
      if (action.startTime)
        action.startTime += monotonicTimeDelta;
      if (action.endTime)
        action.endTime += monotonicTimeDelta;
    }
    for (const event of context2.events)
      event.time += monotonicTimeDelta;
    for (const event of context2.stdio)
      event.timestamp += monotonicTimeDelta;
    for (const page of context2.pages) {
      for (const frame of page.screencastFrames)
        frame.timestamp += monotonicTimeDelta;
    }
    for (const resource of context2.resources) {
      if (resource._monotonicTime)
        resource._monotonicTime += monotonicTimeDelta;
    }
  }
}
function monotonicTimeDeltaBetweenLibraryAndRunner(nonPrimaryContexts, libraryActions) {
  for (const context2 of nonPrimaryContexts) {
    for (const action of context2.actions) {
      if (!action.startTime)
        continue;
      const libraryAction = action.stepId ? libraryActions.get(action.stepId) : void 0;
      if (libraryAction)
        return action.startTime - libraryAction.startTime;
    }
  }
  return 0;
}
function buildActionTree(actions) {
  const itemMap = /* @__PURE__ */ new Map();
  for (const action of actions) {
    itemMap.set(action.callId, {
      id: action.callId,
      parent: void 0,
      children: [],
      action
    });
  }
  const rootItem = { action: { ...kFakeRootAction }, id: "", parent: void 0, children: [] };
  for (const item of itemMap.values()) {
    rootItem.action.startTime = Math.min(rootItem.action.startTime, item.action.startTime);
    rootItem.action.endTime = Math.max(rootItem.action.endTime, item.action.endTime);
    const parent = item.action.parentId ? itemMap.get(item.action.parentId) || rootItem : rootItem;
    parent.children.push(item);
    item.parent = parent;
  }
  const inheritStack = (item) => {
    for (const child of item.children) {
      child.action.stack = child.action.stack ?? item.action.stack;
      inheritStack(child);
    }
  };
  inheritStack(rootItem);
  return { rootItem, itemMap };
}
function context(action) {
  return action[contextSymbol];
}
function nextInContext(action) {
  return action[nextInContextSymbol];
}
function previousActionByEndTime(action) {
  return action[prevByEndTimeSymbol];
}
function nextActionByStartTime(action) {
  return action[nextByStartTimeSymbol];
}
function stats(action) {
  let errors = 0;
  let warnings = 0;
  for (const event of eventsForAction(action)) {
    if (event.type === "console") {
      const type = event.messageType;
      if (type === "warning")
        ++warnings;
      else if (type === "error")
        ++errors;
    }
    if (event.type === "event" && event.method === "pageError")
      ++errors;
  }
  return { errors, warnings };
}
function eventsForAction(action) {
  let result = action[eventsSymbol];
  if (result)
    return result;
  const nextAction = nextInContext(action);
  result = context(action).events.filter((event) => {
    return event.time >= action.startTime && (!nextAction || event.time < nextAction.startTime);
  });
  action[eventsSymbol] = result;
  return result;
}
function collectSources(actions, errorDescriptors) {
  const result = /* @__PURE__ */ new Map();
  for (const action of actions) {
    for (const frame of action.stack || []) {
      let source = result.get(frame.file);
      if (!source) {
        source = { errors: [], content: void 0 };
        result.set(frame.file, source);
      }
    }
  }
  for (const error of errorDescriptors) {
    const { action, stack, message } = error;
    if (!action || !stack)
      continue;
    result.get(stack[0].file)?.errors.push({
      line: stack[0].line || 0,
      message
    });
  }
  return result;
}
const kFakeRootAction = {
  type: "action",
  callId: "",
  startTime: 0,
  endTime: 0,
  class: "",
  method: "",
  params: {},
  log: [],
  context: {
    origin: "library",
    startTime: 0,
    endTime: 0,
    browserName: "",
    wallTime: 0,
    options: {},
    pages: [],
    resources: [],
    actions: [],
    events: [],
    stdio: [],
    errors: [],
    hasSource: false,
    contextId: ""
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TraceModel,
  buildActionTree,
  context,
  eventsForAction,
  nextActionByStartTime,
  previousActionByEndTime,
  stats
});
