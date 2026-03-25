import { __export } from "../../_virtual/rolldown_runtime.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import * as cborg from "cborg";
import { Key } from "interface-datastore";
import all from "it-all";

//#region src/stores/message/ipfs_datastore.ts
var ipfs_datastore_exports = {};
__export(ipfs_datastore_exports, { IPFSDatastoreChatMessageHistory: () => IPFSDatastoreChatMessageHistory });
var IPFSDatastoreChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"datastore"
	];
	sessionId;
	datastore;
	constructor({ datastore, sessionId }) {
		super({ sessionId });
		this.datastore = datastore;
		this.sessionId = sessionId;
	}
	async getMessages() {
		const data = await all(this.datastore.query({ prefix: `/${this.sessionId}` }));
		const messages = data.map((d) => cborg.decode(d.value));
		return mapStoredMessagesToChatMessages(messages);
	}
	async addMessage(message) {
		await this.addMessages([message]);
	}
	async addMessages(messages) {
		const { length } = await all(this.datastore.queryKeys({ prefix: `/${this.sessionId}` }));
		const serializedMessages = mapChatMessagesToStoredMessages(messages);
		const pairs = serializedMessages.map((message, index) => ({
			key: new Key(`/${this.sessionId}/${index + length}`),
			value: cborg.encode(message)
		}));
		await all(this.datastore.putMany(pairs));
	}
	async clear() {
		const keys = this.datastore.queryKeys({ prefix: `/${this.sessionId}` });
		await all(this.datastore.deleteMany(keys));
	}
};

//#endregion
export { IPFSDatastoreChatMessageHistory, ipfs_datastore_exports };
//# sourceMappingURL=ipfs_datastore.js.map