const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const neo4j_driver = require_rolldown_runtime.__toESM(require("neo4j-driver"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));

//#region src/stores/message/neo4j.ts
var neo4j_exports = {};
require_rolldown_runtime.__export(neo4j_exports, { Neo4jChatMessageHistory: () => Neo4jChatMessageHistory });
const defaultConfig = {
	sessionNodeLabel: "ChatSession",
	messageNodeLabel: "ChatMessage",
	windowSize: 3
};
var Neo4jChatMessageHistory = class Neo4jChatMessageHistory extends __langchain_core_chat_history.BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"neo4j"
	];
	sessionId;
	sessionNodeLabel;
	messageNodeLabel;
	windowSize;
	driver;
	constructor({ sessionId = (0, uuid.v4)(), sessionNodeLabel = defaultConfig.sessionNodeLabel, messageNodeLabel = defaultConfig.messageNodeLabel, url, username, password, windowSize = defaultConfig.windowSize }) {
		super();
		this.sessionId = sessionId;
		this.sessionNodeLabel = sessionNodeLabel;
		this.messageNodeLabel = messageNodeLabel;
		this.windowSize = windowSize;
		if (url && username && password) try {
			this.driver = neo4j_driver.default.driver(url, neo4j_driver.auth.basic(username, password));
		} catch (e) {
			const error = e;
			throw new Error(`Could not create a Neo4j driver instance. Please check the connection details.\nCause: ${error.message}`);
		}
		else throw new Error("Neo4j connection details not provided.");
	}
	static async initialize(props) {
		const instance = new Neo4jChatMessageHistory(props);
		try {
			await instance.verifyConnectivity();
		} catch (e) {
			const error = e;
			throw new Error(`Could not verify connection to the Neo4j database.\nCause: ${error.message}`);
		}
		return instance;
	}
	async verifyConnectivity() {
		const connectivity = await this.driver.getServerInfo();
		return connectivity;
	}
	async getMessages() {
		const getMessagesCypherQuery = `
      MERGE (chatSession:${this.sessionNodeLabel} {id: $sessionId})
      WITH chatSession
      MATCH (chatSession)-[:LAST_MESSAGE]->(lastMessage)
      MATCH p=(lastMessage)<-[:NEXT*0..${this.windowSize * 2 - 1}]-()
      WITH p, length(p) AS length
      ORDER BY length DESC LIMIT 1
      UNWIND reverse(nodes(p)) AS node
      RETURN {data:{content: node.content}, type:node.type} AS result
    `;
		try {
			const { records } = await this.driver.executeQuery(getMessagesCypherQuery, { sessionId: this.sessionId });
			const results = records.map((record) => record.get("result"));
			return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(results);
		} catch (e) {
			const error = e;
			throw new Error(`Ohno! Couldn't get messages.\nCause: ${error.message}`);
		}
	}
	async addMessage(message) {
		const addMessageCypherQuery = `
      MERGE (chatSession:${this.sessionNodeLabel} {id: $sessionId})
      WITH chatSession
      OPTIONAL MATCH (chatSession)-[lastMessageRel:LAST_MESSAGE]->(lastMessage)
      CREATE (chatSession)-[:LAST_MESSAGE]->(newLastMessage:${this.messageNodeLabel})
      SET newLastMessage += {type:$type, content:$content}
      WITH newLastMessage, lastMessageRel, lastMessage
      WHERE lastMessage IS NOT NULL
      CREATE (lastMessage)-[:NEXT]->(newLastMessage)
      DELETE lastMessageRel
    `;
		try {
			await this.driver.executeQuery(addMessageCypherQuery, {
				sessionId: this.sessionId,
				type: message.getType(),
				content: message.content
			});
		} catch (e) {
			const error = e;
			throw new Error(`Ohno! Couldn't add message.\nCause: ${error.message}`);
		}
	}
	async clear() {
		const clearMessagesCypherQuery = `
      MATCH p=(chatSession:${this.sessionNodeLabel} {id: $sessionId})-[:LAST_MESSAGE]->(lastMessage)<-[:NEXT*0..]-()
      UNWIND nodes(p) as node
      DETACH DELETE node
    `;
		try {
			await this.driver.executeQuery(clearMessagesCypherQuery, { sessionId: this.sessionId });
		} catch (e) {
			const error = e;
			throw new Error(`Ohno! Couldn't clear chat history.\nCause: ${error.message}`);
		}
	}
	async close() {
		await this.driver.close();
	}
};

//#endregion
exports.Neo4jChatMessageHistory = Neo4jChatMessageHistory;
Object.defineProperty(exports, 'neo4j_exports', {
  enumerable: true,
  get: function () {
    return neo4j_exports;
  }
});
//# sourceMappingURL=neo4j.cjs.map