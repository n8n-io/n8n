import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { RunnableLambda } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import "@langchain/langgraph-checkpoint";
import { z } from "zod/v3";

//#region src/agents/tests/utils.ts
/**
* Fake chat model for testing tool calling functionality
*/
var FakeToolCallingModel = class FakeToolCallingModel extends BaseChatModel {
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
		return new RunnableLambda({ func: async () => {
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
		if ((messages.length === 1 || messages.length === 2 && messages.every(HumanMessage.isInstance)) && this.index !== 0) this.index = 0;
		const currentToolCalls = this.toolCalls[this.index] || [];
		const messageId = this.index.toString();
		this.index = (this.index + 1) % Math.max(1, this.toolCalls.length);
		const message = new AIMessage({
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
export { FakeToolCallingModel };
//# sourceMappingURL=utils.js.map