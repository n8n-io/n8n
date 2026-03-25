const require_ai = require("../../messages/ai.cjs");
const require_human = require("../../messages/human.cjs");
const require_tracers_base = require("../../tracers/base.cjs");
require("../../messages/index.cjs");
const require_chat_history = require("../../chat_history.cjs");
//#region src/utils/testing/message_history.ts
var FakeChatMessageHistory = class extends require_chat_history.BaseChatMessageHistory {
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
		this.messages.push(new require_human.HumanMessage(message));
	}
	async addAIMessage(message) {
		this.messages.push(new require_ai.AIMessage(message));
	}
	async clear() {
		this.messages = [];
	}
};
var FakeListChatMessageHistory = class extends require_chat_history.BaseListChatMessageHistory {
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
var FakeTracer = class extends require_tracers_base.BaseTracer {
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
exports.FakeChatMessageHistory = FakeChatMessageHistory;
exports.FakeListChatMessageHistory = FakeListChatMessageHistory;
exports.FakeTracer = FakeTracer;

//# sourceMappingURL=message_history.cjs.map