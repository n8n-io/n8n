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
var pageAgentDispatcher_exports = {};
__export(pageAgentDispatcher_exports, {
  PageAgentDispatcher: () => PageAgentDispatcher
});
module.exports = __toCommonJS(pageAgentDispatcher_exports);
var import_dispatcher = require("./dispatcher");
var import_pageAgent = require("../agent/pageAgent");
var import_instrumentation = require("../instrumentation");
var import_context = require("../agent/context");
class PageAgentDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, options) {
    super(scope, new import_instrumentation.SdkObject(scope._object, "pageAgent"), "PageAgent", { page: scope });
    this._type_PageAgent = true;
    this._type_EventTarget = true;
    this._usage = { turns: 0, inputTokens: 0, outputTokens: 0 };
    this._page = scope._object;
    this._context = new import_context.Context(this._page, options, this._eventSupport());
  }
  async perform(params, progress) {
    try {
      await (0, import_pageAgent.pageAgentPerform)(progress, this._context, params.task, params);
    } finally {
      this._context.pushHistory({ type: "perform", description: params.task });
    }
    return { usage: this._usage };
  }
  async expect(params, progress) {
    try {
      await (0, import_pageAgent.pageAgentExpect)(progress, this._context, params.expectation, params);
    } finally {
      this._context.pushHistory({ type: "expect", description: params.expectation });
    }
    return { usage: this._usage };
  }
  async extract(params, progress) {
    const result = await (0, import_pageAgent.pageAgentExtract)(progress, this._context, params.query, params.schema, params);
    return { result, usage: this._usage };
  }
  async usage(params, progress) {
    return { usage: this._usage };
  }
  async dispose(params, progress) {
    progress.metadata.potentiallyClosesScope = true;
    void this.stopPendingOperations(new Error("The agent is disposed"));
    this._dispose();
  }
  _eventSupport() {
    const self = this;
    return {
      onBeforeTurn(params) {
        const userMessage = params.conversation.messages.find((m) => m.role === "user");
        self._dispatchEvent("turn", { role: "user", message: userMessage?.content ?? "" });
      },
      onAfterTurn(params) {
        const usage = { inputTokens: params.totalUsage.input, outputTokens: params.totalUsage.output };
        const intent = params.assistantMessage.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
        self._dispatchEvent("turn", { role: "assistant", message: intent, usage });
        if (!params.assistantMessage.content.filter((c) => c.type === "tool_call").length)
          self._dispatchEvent("turn", { role: "assistant", message: `no tool calls`, usage });
        self._usage = { turns: self._usage.turns + 1, inputTokens: self._usage.inputTokens + usage.inputTokens, outputTokens: self._usage.outputTokens + usage.outputTokens };
      },
      onBeforeToolCall(params) {
        self._dispatchEvent("turn", { role: "assistant", message: `call tool "${params.toolCall.name}"` });
      },
      onAfterToolCall(params) {
        const suffix = params.toolCall.result?.isError ? "failed" : "succeeded";
        self._dispatchEvent("turn", { role: "user", message: `tool "${params.toolCall.name}" ${suffix}` });
      },
      onToolCallError(params) {
        self._dispatchEvent("turn", { role: "user", message: `tool "${params.toolCall.name}" failed: ${params.error.message}` });
      }
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PageAgentDispatcher
});
