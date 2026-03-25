import { __export } from "../../_virtual/rolldown_runtime.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { Client } from "@planetscale/database";

//#region src/stores/message/planetscale.ts
var planetscale_exports = {};
__export(planetscale_exports, { PlanetScaleChatMessageHistory: () => PlanetScaleChatMessageHistory });
/**
* Class for storing and retrieving chat message history from a
* PlanetScale database. Extends the BaseListChatMessageHistory class.
* @example
* ```typescript
* const chatHistory = new PlanetScaleChatMessageHistory({
*   tableName: "stored_message",
*   sessionId: "lc-example",
*   config: {
*     url: "ADD_YOURS_HERE",
*   },
* });
* const chain = new ConversationChain({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   memory: chatHistory,
* });
* const response = await chain.invoke({
*   input: "What did I just say my name was?",
* });
* console.log({ response });
* ```
*/
var PlanetScaleChatMessageHistory = class extends BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"planetscale"
	];
	get lc_secrets() {
		return {
			"config.host": "PLANETSCALE_HOST",
			"config.username": "PLANETSCALE_USERNAME",
			"config.password": "PLANETSCALE_PASSWORD",
			"config.url": "PLANETSCALE_DATABASE_URL"
		};
	}
	client;
	connection;
	tableName;
	sessionId;
	tableInitialized;
	constructor(fields) {
		super(fields);
		const { sessionId, config, client, tableName } = fields;
		if (client) this.client = client;
		else if (config) this.client = new Client(config);
		else throw new Error("Either a client or config must be provided to PlanetScaleChatMessageHistory");
		this.connection = this.client.connection();
		this.tableName = tableName || "langchain_chat_histories";
		this.tableInitialized = false;
		this.sessionId = sessionId;
	}
	/**
	* Private method to ensure that the necessary table exists in the
	* PlanetScale database before performing any operations. If the table
	* does not exist, it is created.
	* @returns Promise that resolves to void.
	*/
	async ensureTable() {
		if (this.tableInitialized) return;
		const query = `CREATE TABLE IF NOT EXISTS ${this.tableName} (id BINARY(16) PRIMARY KEY, session_id VARCHAR(255), type VARCHAR(255), content VARCHAR(255), role VARCHAR(255), name VARCHAR(255), additional_kwargs VARCHAR(255));`;
		await this.connection.execute(query);
		const indexQuery = `ALTER TABLE ${this.tableName} MODIFY id BINARY(16) DEFAULT (UUID_TO_BIN(UUID()));`;
		await this.connection.execute(indexQuery);
		this.tableInitialized = true;
	}
	/**
	* Method to retrieve all messages from the PlanetScale database for the
	* current session.
	* @returns Promise that resolves to an array of BaseMessage objects.
	*/
	async getMessages() {
		await this.ensureTable();
		const query = `SELECT * FROM ${this.tableName} WHERE session_id = :session_id`;
		const params = { session_id: this.sessionId };
		const rawStoredMessages = await this.connection.execute(query, params);
		const storedMessagesObject = rawStoredMessages.rows;
		const orderedMessages = storedMessagesObject.map((message) => {
			const data = {
				content: message.content,
				additional_kwargs: JSON.parse(message.additional_kwargs)
			};
			if (message.role) data.role = message.role;
			if (message.name) data.name = message.name;
			return {
				type: message.type,
				data
			};
		});
		return mapStoredMessagesToChatMessages(orderedMessages);
	}
	/**
	* Method to add a new message to the PlanetScale database for the current
	* session.
	* @param message The BaseMessage object to be added to the database.
	* @returns Promise that resolves to void.
	*/
	async addMessage(message) {
		await this.ensureTable();
		const messageToAdd = mapChatMessagesToStoredMessages([message]);
		const query = `INSERT INTO ${this.tableName} (session_id, type, content, role, name, additional_kwargs) VALUES (:session_id, :type, :content, :role, :name, :additional_kwargs)`;
		const params = {
			session_id: this.sessionId,
			type: messageToAdd[0].type,
			content: messageToAdd[0].data.content,
			role: messageToAdd[0].data.role,
			name: messageToAdd[0].data.name,
			additional_kwargs: JSON.stringify(messageToAdd[0].data.additional_kwargs)
		};
		await this.connection.execute(query, params);
	}
	/**
	* Method to delete all messages from the PlanetScale database for the
	* current session.
	* @returns Promise that resolves to void.
	*/
	async clear() {
		await this.ensureTable();
		const query = `DELETE FROM ${this.tableName} WHERE session_id = :session_id`;
		const params = { session_id: this.sessionId };
		await this.connection.execute(query, params);
	}
};

//#endregion
export { PlanetScaleChatMessageHistory, planetscale_exports };
//# sourceMappingURL=planetscale.js.map