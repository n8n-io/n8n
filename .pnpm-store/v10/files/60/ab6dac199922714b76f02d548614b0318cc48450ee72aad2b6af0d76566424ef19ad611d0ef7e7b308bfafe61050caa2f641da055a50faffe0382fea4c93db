import { __export } from "../../_virtual/rolldown_runtime.js";
import { CassandraTable } from "../../utils/cassandra.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/cassandra.ts
var cassandra_exports = {};
__export(cassandra_exports, { CassandraChatMessageHistory: () => CassandraChatMessageHistory });
/**
* Class for storing chat message history within Cassandra. It extends the
* BaseListChatMessageHistory class and provides methods to get, add, and
* clear messages.
* @example
* ```typescript
* const chatHistory = new CassandraChatMessageHistory({
*   cloud: {
*     secureConnectBundle: "<path to your secure bundle>",
*   },
*   credentials: {
*     username: "token",
*     password: "<your Cassandra access token>",
*   },
*   keyspace: "langchain",
*   table: "message_history",
*   sessionId: "<some unique session identifier>",
* });
*
* const chain = new ConversationChain({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   memory: chatHistory,
* });
*
* const response = await chain.invoke({
*   input: "What did I just say my name was?",
* });
* console.log({ response });
* ```
*/
var CassandraChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"cassandra"
	];
	cassandraTable;
	sessionId;
	options;
	colSessionId;
	colMessageTs;
	colMessageType;
	colData;
	constructor(options) {
		super();
		this.sessionId = options.sessionId;
		this.options = options;
		this.colSessionId = {
			name: "session_id",
			type: "text",
			partition: true
		};
		this.colMessageTs = {
			name: "message_ts",
			type: "timestamp"
		};
		this.colMessageType = {
			name: "message_type",
			type: "text"
		};
		this.colData = {
			name: "data",
			type: "text"
		};
	}
	/**
	* Method to get all the messages stored in the Cassandra database.
	* @returns Array of stored BaseMessage instances.
	*/
	async getMessages() {
		await this.ensureTable();
		const resultSet = await this.cassandraTable.select([this.colMessageType, this.colData], [{
			name: "session_id",
			value: this.sessionId
		}]);
		const storedMessages = resultSet.rows.map((row) => ({
			type: row.message_type,
			data: JSON.parse(row.data)
		}));
		const baseMessages = mapStoredMessagesToChatMessages(storedMessages);
		return baseMessages;
	}
	/**
	* Method to add a new message to the Cassandra database.
	* @param message The BaseMessage instance to add.
	* @returns A promise that resolves when the message has been added.
	*/
	async addMessage(message) {
		await this.ensureTable();
		const messages = mapChatMessagesToStoredMessages([message]);
		const { type, data } = messages[0];
		return this.cassandraTable.upsert([[
			this.sessionId,
			type,
			Date.now(),
			JSON.stringify(data)
		]], [
			this.colSessionId,
			this.colMessageType,
			this.colMessageTs,
			this.colData
		]).then(() => {});
	}
	/**
	* Method to clear all the messages from the Cassandra database.
	* @returns A promise that resolves when all messages have been cleared.
	*/
	async clear() {
		await this.ensureTable();
		return this.cassandraTable.delete({
			name: this.colSessionId.name,
			value: this.sessionId
		}).then(() => {});
	}
	/**
	* Method to initialize the Cassandra database.
	* @returns Promise that resolves when the database has been initialized.
	*/
	async ensureTable() {
		if (this.cassandraTable) return;
		const tableConfig = {
			...this.options,
			primaryKey: [this.colSessionId, this.colMessageTs],
			nonKeyColumns: [this.colMessageType, this.colData]
		};
		this.cassandraTable = await new CassandraTable(tableConfig);
	}
};

//#endregion
export { CassandraChatMessageHistory, cassandra_exports };
//# sourceMappingURL=cassandra.js.map