const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));
const __xata_io_client = require_rolldown_runtime.__toESM(require("@xata.io/client"));

//#region src/stores/message/xata.ts
var xata_exports = {};
require_rolldown_runtime.__export(xata_exports, { XataChatMessageHistory: () => XataChatMessageHistory });
const chatMemoryColumns = [
	{
		name: "sessionId",
		type: "string"
	},
	{
		name: "type",
		type: "string"
	},
	{
		name: "role",
		type: "string"
	},
	{
		name: "content",
		type: "text"
	},
	{
		name: "name",
		type: "string"
	},
	{
		name: "additionalKwargs",
		type: "text"
	}
];
/**
* A class for managing chat message history using Xata.io client. It
* extends the BaseListChatMessageHistory class and provides methods to
* get, add, and clear messages. It also ensures the existence of a table
* where the chat messages are stored.
* @example
* ```typescript
* const chatHistory = new XataChatMessageHistory({
*   table: "messages",
*   sessionId: new Date().toISOString(),
*   client: new BaseClient({
*     databaseURL: process.env.XATA_DB_URL,
*     apiKey: process.env.XATA_API_KEY,
*     branch: "main",
*   }),
*   apiKey: process.env.XATA_API_KEY,
* });
*
* const chain = new ConversationChain({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
*   memory: new BufferMemory({ chatHistory }),
* });
*
* const response = await chain.invoke({
*   input: "What did I just say my name was?",
* });
* console.log({ response });
* ```
*/
var XataChatMessageHistory = class extends __langchain_core_chat_history.BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"xata"
	];
	client;
	sessionId;
	table;
	tableInitialized;
	createTable;
	apiClient;
	constructor(fields) {
		super(fields);
		const { sessionId, config, client, table } = fields;
		this.sessionId = sessionId;
		this.table = table || "memory";
		if (client) this.client = client;
		else if (config) this.client = new __xata_io_client.BaseClient(config);
		else throw new Error("Either a client or a config must be provided to XataChatMessageHistoryInput");
		if (fields.createTable !== false) {
			this.createTable = true;
			const apiKey = fields.apiKey || fields.config?.apiKey;
			if (!apiKey) throw new Error("If createTable is set, an apiKey must be provided to XataChatMessageHistoryInput, either directly or through the config object");
			this.apiClient = new __xata_io_client.XataApiClient({ apiKey });
		} else this.createTable = false;
		this.tableInitialized = false;
	}
	/**
	* Retrieves all messages associated with the session ID, ordered by
	* creation time.
	* @returns A promise that resolves to an array of BaseMessage instances.
	*/
	async getMessages() {
		await this.ensureTable();
		const records = await this.client.db[this.table].filter({ sessionId: this.sessionId }).sort("xata.createdAt", "asc").getAll();
		const rawStoredMessages = records;
		const orderedMessages = rawStoredMessages.map((message) => {
			const data = {
				content: message.content,
				additional_kwargs: JSON.parse(message.additionalKwargs)
			};
			if (message.role) data.role = message.role;
			if (message.name) data.name = message.name;
			return {
				type: message.type,
				data
			};
		});
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(orderedMessages);
	}
	/**
	* Adds a new message to the database.
	* @param message The BaseMessage instance to be added.
	* @returns A promise that resolves when the message has been added.
	*/
	async addMessage(message) {
		await this.ensureTable();
		const messageToAdd = (0, __langchain_core_messages.mapChatMessagesToStoredMessages)([message]);
		await this.client.db[this.table].create({
			sessionId: this.sessionId,
			type: messageToAdd[0].type,
			content: messageToAdd[0].data.content,
			role: messageToAdd[0].data.role,
			name: messageToAdd[0].data.name,
			additionalKwargs: JSON.stringify(messageToAdd[0].data.additional_kwargs)
		});
	}
	/**
	* Deletes all messages associated with the session ID.
	* @returns A promise that resolves when the messages have been deleted.
	*/
	async clear() {
		await this.ensureTable();
		const records = await this.client.db[this.table].select(["id"]).filter({ sessionId: this.sessionId }).getAll();
		const ids = records.map((m) => m.id);
		await this.client.db[this.table].delete(ids);
	}
	/**
	* Checks if the table exists and creates it if it doesn't. This method is
	* called before any operation on the table.
	* @returns A promise that resolves when the table has been ensured.
	*/
	async ensureTable() {
		if (!this.createTable) return;
		if (this.tableInitialized) return;
		const { databaseURL, branch } = await this.client.getConfig();
		const [, , host, , database] = databaseURL.split("/");
		const urlParts = (0, __xata_io_client.parseWorkspacesUrlParts)(host);
		if (urlParts == null) throw new Error("Invalid databaseURL");
		const { workspace, region } = urlParts;
		const tableParams = {
			workspace,
			region,
			database,
			branch,
			table: this.table
		};
		let schema = null;
		try {
			schema = await this.apiClient.tables.getTableSchema(tableParams);
		} catch {}
		if (schema == null) {
			await this.apiClient.tables.createTable(tableParams);
			await this.apiClient.tables.setTableSchema({
				...tableParams,
				schema: { columns: chatMemoryColumns }
			});
		}
	}
};

//#endregion
exports.XataChatMessageHistory = XataChatMessageHistory;
Object.defineProperty(exports, 'xata_exports', {
  enumerable: true,
  get: function () {
    return xata_exports;
  }
});
//# sourceMappingURL=xata.cjs.map