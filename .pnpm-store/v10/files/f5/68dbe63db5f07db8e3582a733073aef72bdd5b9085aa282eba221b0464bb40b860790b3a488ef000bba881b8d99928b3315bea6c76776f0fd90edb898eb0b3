const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
let _langchain_core_messages = require("@langchain/core/messages");
let _langchain_core_language_models_chat_models = require("@langchain/core/language_models/chat_models");
let _langchain_core_runnables = require("@langchain/core/runnables");
let _langchain_core_tools = require("@langchain/core/tools");
require("@langchain/langgraph-checkpoint");
let zod_v3 = require("zod/v3");

//#region src/agents/tests/utils.ts
/**
* Fake chat model for testing tool calling functionality
*/
var FakeToolCallingModel = class FakeToolCallingModel extends _langchain_core_language_models_chat_models.BaseChatModel {
	toolCalls;
	toolStyle;
	indexRef;
	structuredResponse;
	tools = [];
	constructor({ toolCalls = [], toolStyle = "openai", index = 0, structuredResponse, indexRef, ...rest } = {}) {
		super(rest);
		this.toolCalls = toolCalls;
		this.toolStyle = toolStyle;
		this.indexRef = indexRef ?? { current: index };
		this.structuredResponse = structuredResponse;
	}
	get index() {
		return this.indexRef.current;
	}
	set index(value) {
		this.indexRef.current = value;
	}
	_llmType() {
		return "fake-tool-calling";
	}
	_combineLLMOutput() {
		return [];
	}
	bindTools(tools) {
		const newInstance = new FakeToolCallingModel({
			toolCalls: this.toolCalls,
			toolStyle: this.toolStyle,
			structuredResponse: this.structuredResponse,
			indexRef: this.indexRef
		});
		newInstance.tools = [...this.tools, ...tools];
		return newInstance;
	}
	withStructuredOutput(_schema) {
		return new _langchain_core_runnables.RunnableLambda({ func: async () => {
			return this.structuredResponse;
		} });
	}
	async _generate(messages, _options, _runManager) {
		let content = messages[messages.length - 1].content;
		if (messages.length > 1) content = messages.map((m) => m.content).filter(Boolean).map((part) => {
			if (typeof part === "string") return part;
			else if (typeof part === "object" && "text" in part) return part.text;
			else if (Array.isArray(part)) return part.map((p) => {
				if (typeof p === "string") return p;
				else if (typeof p === "object" && "text" in p) return p.text;
				return "";
			}).join("-");
			else return JSON.stringify(part);
		}).join("-");
		if ((messages.length === 1 || messages.length === 2 && messages.every(_langchain_core_messages.HumanMessage.isInstance)) && this.index !== 0) this.index = 0;
		const currentToolCalls = this.toolCalls[this.index] || [];
		const messageId = this.index.toString();
		this.index = (this.index + 1) % Math.max(1, this.toolCalls.length);
		const message = new _langchain_core_messages.AIMessage({
			content,
			id: messageId,
			tool_calls: currentToolCalls.length > 0 ? currentToolCalls.map((tc) => ({
				...tc,
				type: "tool_call"
			})) : void 0
		});
		return {
			generations: [{
				text: content,
				message
			}],
			llmOutput: {}
		};
	}
};

//#endregion
exports.FakeToolCallingModel = FakeToolCallingModel;
//# sourceMappingURL=utils.cjs.map