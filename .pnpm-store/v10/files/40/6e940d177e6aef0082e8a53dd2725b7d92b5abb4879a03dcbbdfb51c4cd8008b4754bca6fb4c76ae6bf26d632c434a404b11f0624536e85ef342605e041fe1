import { __export } from "../../_virtual/rolldown_runtime.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { makeFunctionReference } from "convex/server";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/convex.ts
var convex_exports = {};
__export(convex_exports, { ConvexChatMessageHistory: () => ConvexChatMessageHistory });
var ConvexChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"convex"
	];
	ctx;
	sessionId;
	table;
	index;
	sessionIdField;
	messageTextFieldName;
	insert;
	lookup;
	deleteMany;
	constructor(config) {
		super();
		this.ctx = config.ctx;
		this.sessionId = config.sessionId;
		this.table = config.table ?? "messages";
		this.index = config.index ?? "bySessionId";
		this.sessionIdField = config.sessionIdField ?? "sessionId";
		this.messageTextFieldName = config.messageTextFieldName ?? "message";
		this.insert = config.insert ?? makeFunctionReference("langchain/db:insert");
		this.lookup = config.lookup ?? makeFunctionReference("langchain/db:lookup");
		this.deleteMany = config.deleteMany ?? makeFunctionReference("langchain/db:deleteMany");
	}
	async getMessages() {
		const convexDocuments = await this.ctx.runQuery(this.lookup, {
			table: this.table,
			index: this.index,
			keyField: this.sessionIdField,
			key: this.sessionId
		});
		return mapStoredMessagesToChatMessages(convexDocuments.map((doc) => doc[this.messageTextFieldName]));
	}
	async addMessage(message) {
		const messages = mapChatMessagesToStoredMessages([message]);
		const PAGE_SIZE = 16;
		for (let i = 0; i < messages.length; i += PAGE_SIZE) await Promise.all(messages.slice(i, i + PAGE_SIZE).map((message$1) => this.ctx.runMutation(this.insert, {
			table: this.table,
			document: {
				[this.sessionIdField]: this.sessionId,
				[this.messageTextFieldName]: message$1
			}
		})));
	}
	async clear() {
		await this.ctx.runMutation(this.deleteMany, {
			table: this.table,
			index: this.index,
			keyField: this.sessionIdField,
			key: this.sessionId
		});
	}
};

//#endregion
export { ConvexChatMessageHistory, convex_exports };
//# sourceMappingURL=convex.js.map