const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));
const firebase_admin_app = require_rolldown_runtime.__toESM(require("firebase-admin/app"));
const firebase_admin_firestore = require_rolldown_runtime.__toESM(require("firebase-admin/firestore"));

//#region src/stores/message/firestore.ts
var firestore_exports = {};
require_rolldown_runtime.__export(firestore_exports, { FirestoreChatMessageHistory: () => FirestoreChatMessageHistory });
/**
* Class for managing chat message history using Google's Firestore as a
* storage backend. Extends the BaseListChatMessageHistory class.
* @example
* ```typescript
* const chatHistory = new FirestoreChatMessageHistory({
*   collectionName: "langchain",
*   sessionId: "lc-example",
*   userId: "a@example.com",
*   config: { projectId: "your-project-id" },
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
var FirestoreChatMessageHistory = class extends __langchain_core_chat_history.BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"firestore"
	];
	collections;
	docs;
	sessionId;
	userId;
	appIdx;
	config;
	firestoreClient;
	document;
	constructor({ collections, docs, sessionId, userId, appIdx = 0, config }) {
		super();
		if (collections || docs) {
			if (!(collections?.length === docs?.length || collections?.length === 1 && !docs)) throw new Error("Collections and docs options must have the same length, or collections must have a length of 1 if docs is not defined.");
		}
		this.collections = collections || [];
		this.docs = docs || [sessionId];
		this.sessionId = sessionId;
		this.userId = userId;
		this.document = null;
		this.appIdx = appIdx;
		if (config) this.config = config;
		try {
			this.ensureFirestore();
		} catch {
			throw new Error(`Unknown response type`);
		}
	}
	ensureFirestore() {
		let app;
		if (!(0, firebase_admin_app.getApps)().length) app = (0, firebase_admin_app.initializeApp)(this.config);
		else app = (0, firebase_admin_app.getApps)()[this.appIdx];
		this.firestoreClient = (0, firebase_admin_firestore.getFirestore)(app);
		this.document = this.collections.reduce((acc, collection, index) => acc.collection(collection).doc(this.docs[index]), this.firestoreClient);
	}
	/**
	* Method to retrieve all messages from the Firestore collection
	* associated with the current session. Returns an array of BaseMessage
	* objects.
	* @returns Array of stored messages
	*/
	async getMessages() {
		if (!this.document) throw new Error("Document not initialized");
		const querySnapshot = await this.document.collection("messages").orderBy("createdAt", "asc").get().catch((err) => {
			throw new Error(`Unknown response type: ${err.toString()}`);
		});
		const response = [];
		querySnapshot.forEach((doc) => {
			const { type, data } = doc.data();
			response.push({
				type,
				data
			});
		});
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(response);
	}
	/**
	* Method to add a new message to the Firestore collection. The message is
	* passed as a BaseMessage object.
	* @param message The message to be added as a BaseMessage object.
	*/
	async addMessage(message) {
		const messages = (0, __langchain_core_messages.mapChatMessagesToStoredMessages)([message]);
		await this.upsertMessage(messages[0]);
	}
	async upsertMessage(message) {
		if (!this.document) throw new Error("Document not initialized");
		await this.document.set({
			id: this.sessionId,
			user_id: this.userId
		}, { merge: true });
		await this.document.collection("messages").add({
			type: message.type,
			data: message.data,
			createdBy: this.userId,
			createdAt: firebase_admin_firestore.FieldValue.serverTimestamp()
		}).catch((err) => {
			throw new Error(`Unknown response type: ${err.toString()}`);
		});
	}
	/**
	* Method to delete all messages from the Firestore collection associated
	* with the current session.
	*/
	async clear() {
		if (!this.document) throw new Error("Document not initialized");
		await this.document.collection("messages").get().then((querySnapshot) => {
			querySnapshot.docs.forEach((snapshot) => {
				snapshot.ref.delete().catch((err) => {
					throw new Error(`Unknown response type: ${err.toString()}`);
				});
			});
		}).catch((err) => {
			throw new Error(`Unknown response type: ${err.toString()}`);
		});
		await this.document.delete().catch((err) => {
			throw new Error(`Unknown response type: ${err.toString()}`);
		});
	}
};

//#endregion
exports.FirestoreChatMessageHistory = FirestoreChatMessageHistory;
Object.defineProperty(exports, 'firestore_exports', {
  enumerable: true,
  get: function () {
    return firestore_exports;
  }
});
//# sourceMappingURL=firestore.cjs.map