const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));
const cborg = require_rolldown_runtime.__toESM(require("cborg"));
const interface_datastore = require_rolldown_runtime.__toESM(require("interface-datastore"));
const it_all = require_rolldown_runtime.__toESM(require("it-all"));

//#region src/stores/message/ipfs_datastore.ts
var ipfs_datastore_exports = {};
require_rolldown_runtime.__export(ipfs_datastore_exports, { IPFSDatastoreChatMessageHistory: () => IPFSDatastoreChatMessageHistory });
var IPFSDatastoreChatMessageHistory = class extends __langchain_core_chat_history.BaseListChatMessageHistory {
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
		const data = await (0, it_all.default)(this.datastore.query({ prefix: `/${this.sessionId}` }));
		const messages = data.map((d) => cborg.decode(d.value));
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(messages);
	}
	async addMessage(message) {
		await this.addMessages([message]);
	}
	async addMessages(messages) {
		const { length } = await (0, it_all.default)(this.datastore.queryKeys({ prefix: `/${this.sessionId}` }));
		const serializedMessages = (0, __langchain_core_messages.mapChatMessagesToStoredMessages)(messages);
		const pairs = serializedMessages.map((message, index) => ({
			key: new interface_datastore.Key(`/${this.sessionId}/${index + length}`),
			value: cborg.encode(message)
		}));
		await (0, it_all.default)(this.datastore.putMany(pairs));
	}
	async clear() {
		const keys = this.datastore.queryKeys({ prefix: `/${this.sessionId}` });
		await (0, it_all.default)(this.datastore.deleteMany(keys));
	}
};

//#endregion
exports.IPFSDatastoreChatMessageHistory = IPFSDatastoreChatMessageHistory;
Object.defineProperty(exports, 'ipfs_datastore_exports', {
  enumerable: true,
  get: function () {
    return ipfs_datastore_exports;
  }
});
//# sourceMappingURL=ipfs_datastore.cjs.map