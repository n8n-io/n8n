Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("./_virtual/_rolldown/runtime.cjs");
const require_load_serializable = require("./load/serializable.cjs");
const require_ai = require("./messages/ai.cjs");
const require_human = require("./messages/human.cjs");
require("./messages/index.cjs");
//#region src/chat_history.ts
var chat_history_exports = /* @__PURE__ */ require_runtime.__exportAll({
	BaseChatMessageHistory: () => BaseChatMessageHistory,
	BaseListChatMessageHistory: () => BaseListChatMessageHistory,
	InMemoryChatMessageHistory: () => InMemoryChatMessageHistory
});
/**
* Base class for all chat message histories. All chat message histories
* should extend this class.
*/
var BaseChatMessageHistory = class extends require_load_serializable.Serializable {
	/**
	* Add a list of messages.
	*
	* Implementations should override this method to handle bulk addition of messages
	* in an efficient manner to avoid unnecessary round-trips to the underlying store.
	*
	* @param messages - A list of BaseMessage objects to store.
	*/
	async addMessages(messages) {
		for (const message of messages) await this.addMessage(message);
	}
};
/**
* Base class for all list chat message histories. All list chat message
* histories should extend this class.
*/
var BaseListChatMessageHistory = class extends require_load_serializable.Serializable {
	/**
	* This is a convenience method for adding a human message string to the store.
	* Please note that this is a convenience method. Code should favor the
	* bulk addMessages interface instead to save on round-trips to the underlying
	* persistence layer.
	* This method may be deprecated in a future release.
	*/
	addUserMessage(message) {
		return this.addMessage(new require_human.HumanMessage(message));
	}
	/**
	* This is a convenience method for adding an AI message string to the store.
	* Please note that this is a convenience method. Code should favor the bulk
	* addMessages interface instead to save on round-trips to the underlying
	* persistence layer.
	* This method may be deprecated in a future release.
	*/
	addAIMessage(message) {
		return this.addMessage(new require_ai.AIMessage(message));
	}
	/**
	* Add a list of messages.
	*
	* Implementations should override this method to handle bulk addition of messages
	* in an efficient manner to avoid unnecessary round-trips to the underlying store.
	*
	* @param messages - A list of BaseMessage objects to store.
	*/
	async addMessages(messages) {
		for (const message of messages) await this.addMessage(message);
	}
	/**
	* Remove all messages from the store.
	*/
	clear() {
		throw new Error("Not implemented.");
	}
};
/**
* Class for storing chat message history in-memory. It extends the
* BaseListChatMessageHistory class and provides methods to get, add, and
* clear messages.
*/
var InMemoryChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"in_memory"
	];
	messages = [];
	constructor(messages) {
		super(...arguments);
		this.messages = messages ?? [];
	}
	/**
	* Method to get all the messages stored in the ChatMessageHistory
	* instance.
	* @returns Array of stored BaseMessage instances.
	*/
	async getMessages() {
		return this.messages;
	}
	/**
	* Method to add a new message to the ChatMessageHistory instance.
	* @param message The BaseMessage instance to add.
	* @returns A promise that resolves when the message has been added.
	*/
	async addMessage(message) {
		this.messages.push(message);
	}
	/**
	* Method to clear all the messages from the ChatMessageHistory instance.
	* @returns A promise that resolves when all messages have been cleared.
	*/
	async clear() {
		this.messages = [];
	}
};
//#endregion
exports.BaseChatMessageHistory = BaseChatMessageHistory;
exports.BaseListChatMessageHistory = BaseListChatMessageHistory;
exports.InMemoryChatMessageHistory = InMemoryChatMessageHistory;
Object.defineProperty(exports, "chat_history_exports", {
	enumerable: true,
	get: function() {
		return chat_history_exports;
	}
});

//# sourceMappingURL=chat_history.cjs.map