import { AIMessage } from "../../messages/ai.js";
import { HumanMessage } from "../../messages/human.js";
import { BaseTracer } from "../../tracers/base.js";
import "../../messages/index.js";
import { BaseChatMessageHistory, BaseListChatMessageHistory } from "../../chat_history.js";
//#region src/utils/testing/message_history.ts
var FakeChatMessageHistory = class extends BaseChatMessageHistory {
	lc_namespace = [
		"langchain_core",
		"message",
		"fake"
	];
	messages = [];
	constructor() {
		super();
	}
	async getMessages() {
		return this.messages;
	}
	async addMessage(message) {
		this.messages.push(message);
	}
	async addUserMessage(message) {
		this.messages.push(new HumanMessage(message));
	}
	async addAIMessage(message) {
		this.messages.push(new AIMessage(message));
	}
	async clear() {
		this.messages = [];
	}
};
var FakeListChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain_core",
		"message",
		"fake"
	];
	messages = [];
	constructor() {
		super();
	}
	async addMessage(message) {
		this.messages.push(message);
	}
	async getMessages() {
		return this.messages;
	}
};
var FakeTracer = class extends BaseTracer {
	name = "fake_tracer";
	runs = [];
	constructor() {
		super();
	}
	persistRun(run) {
		this.runs.push(run);
		return Promise.resolve();
	}
};
//#endregion
export { FakeChatMessageHistory, FakeListChatMessageHistory, FakeTracer };

//# sourceMappingURL=message_history.js.map