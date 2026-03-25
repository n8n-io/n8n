const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_momento = require('../../utils/momento.cjs');
const __gomomento_sdk_core = require_rolldown_runtime.__toESM(require("@gomomento/sdk-core"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_chat_history = require_rolldown_runtime.__toESM(require("@langchain/core/chat_history"));

//#region src/stores/message/momento.ts
var momento_exports = {};
require_rolldown_runtime.__export(momento_exports, { MomentoChatMessageHistory: () => MomentoChatMessageHistory });
/**
* A class that stores chat message history using Momento Cache. It
* interacts with a Momento cache client to perform operations like
* fetching, adding, and deleting messages.
* @example
* ```typescript
* const chatHistory = await MomentoChatMessageHistory.fromProps({
*   client: new CacheClient({
*     configuration: Configurations.Laptop.v1(),
*     credentialProvider: CredentialProvider.fromEnvironmentVariable({
*       environmentVariableName: "MOMENTO_API_KEY",
*     }),
*     defaultTtlSeconds: 60 * 60 * 24,
*   }),
*   cacheName: "langchain",
*   sessionId: new Date().toISOString(),
*   sessionTtl: 300,
* });
*
* const messages = await chatHistory.getMessages();
* console.log({ messages });
* ```
*/
var MomentoChatMessageHistory = class MomentoChatMessageHistory extends __langchain_core_chat_history.BaseListChatMessageHistory {
	lc_namespace = [
		"langchain",
		"stores",
		"message",
		"momento"
	];
	sessionId;
	client;
	cacheName;
	sessionTtl;
	constructor(props) {
		super();
		this.sessionId = props.sessionId;
		this.client = props.client;
		this.cacheName = props.cacheName;
		this.validateTtlSeconds(props.sessionTtl);
		this.sessionTtl = props.sessionTtl !== void 0 ? __gomomento_sdk_core.CollectionTtl.of(props.sessionTtl) : __gomomento_sdk_core.CollectionTtl.fromCacheTtl();
	}
	/**
	* Create a new chat message history backed by Momento.
	*
	* @param {MomentoCacheProps} props The settings to instantiate the Momento chat message history.
	* @param {string} props.sessionId The session ID to use to store the data.
	* @param {ICacheClient} props.client The Momento cache client.
	* @param {string} props.cacheName The name of the cache to use to store the data.
	* @param {number} props.sessionTtl The time to live for the cache items in seconds.
	* If not specified, the cache client default is used.
	* @param {boolean} props.ensureCacheExists If true, ensure that the cache exists before returning.
	* If false, the cache is not checked for existence.
	* @throws {InvalidArgumentError} If {@link props.sessionTtl} is not strictly positive.
	* @returns A new chat message history backed by Momento.
	*/
	static async fromProps(props) {
		const instance = new MomentoChatMessageHistory(props);
		if (props.ensureCacheExists || props.ensureCacheExists === void 0) await require_momento.ensureCacheExists(props.client, props.cacheName);
		return instance;
	}
	/**
	* Validate the user-specified TTL, if provided, is strictly positive.
	* @param ttlSeconds The TTL to validate.
	*/
	validateTtlSeconds(ttlSeconds) {
		if (ttlSeconds !== void 0 && ttlSeconds <= 0) throw new __gomomento_sdk_core.InvalidArgumentError("ttlSeconds must be positive.");
	}
	/**
	* Fetches messages from the cache.
	* @returns A Promise that resolves to an array of BaseMessage instances.
	*/
	async getMessages() {
		const fetchResponse = await this.client.listFetch(this.cacheName, this.sessionId);
		let messages = [];
		if (fetchResponse instanceof __gomomento_sdk_core.CacheListFetch.Hit) messages = fetchResponse.valueList().map((serializedStoredMessage) => JSON.parse(serializedStoredMessage));
		else if (fetchResponse instanceof __gomomento_sdk_core.CacheListFetch.Miss) {} else if (fetchResponse instanceof __gomomento_sdk_core.CacheListFetch.Error) throw fetchResponse.innerException();
		else throw new Error(`Unknown response type: ${fetchResponse.toString()}`);
		return (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(messages);
	}
	/**
	* Adds a message to the cache.
	* @param message The BaseMessage instance to add to the cache.
	* @returns A Promise that resolves when the message has been added.
	*/
	async addMessage(message) {
		const messageToAdd = JSON.stringify((0, __langchain_core_messages.mapChatMessagesToStoredMessages)([message])[0]);
		const pushResponse = await this.client.listPushBack(this.cacheName, this.sessionId, messageToAdd, { ttl: this.sessionTtl });
		if (pushResponse instanceof __gomomento_sdk_core.CacheListPushBack.Success) {} else if (pushResponse instanceof __gomomento_sdk_core.CacheListPushBack.Error) throw pushResponse.innerException();
		else throw new Error(`Unknown response type: ${pushResponse.toString()}`);
	}
	/**
	* Deletes all messages from the cache.
	* @returns A Promise that resolves when all messages have been deleted.
	*/
	async clear() {
		const deleteResponse = await this.client.delete(this.cacheName, this.sessionId);
		if (deleteResponse instanceof __gomomento_sdk_core.CacheDelete.Success) {} else if (deleteResponse instanceof __gomomento_sdk_core.CacheDelete.Error) throw deleteResponse.innerException();
		else throw new Error(`Unknown response type: ${deleteResponse.toString()}`);
	}
};

//#endregion
exports.MomentoChatMessageHistory = MomentoChatMessageHistory;
Object.defineProperty(exports, 'momento_exports', {
  enumerable: true,
  get: function () {
    return momento_exports;
  }
});
//# sourceMappingURL=momento.cjs.map