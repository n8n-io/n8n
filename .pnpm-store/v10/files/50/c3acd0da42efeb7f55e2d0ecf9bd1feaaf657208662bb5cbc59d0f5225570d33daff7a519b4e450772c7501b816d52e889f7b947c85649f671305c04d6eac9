const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_momento = require('../utils/momento.cjs');
const __langchain_core_caches = require_rolldown_runtime.__toESM(require("@langchain/core/caches"));
const __gomomento_sdk_core = require_rolldown_runtime.__toESM(require("@gomomento/sdk-core"));

//#region src/caches/momento.ts
var momento_exports = {};
require_rolldown_runtime.__export(momento_exports, { MomentoCache: () => MomentoCache });
/**
* A cache that uses Momento as the backing store.
* See https://gomomento.com.
* @example
* ```typescript
* const cache = new MomentoCache({
*   client: new CacheClient({
*     configuration: Configurations.Laptop.v1(),
*     credentialProvider: CredentialProvider.fromEnvironmentVariable({
*       environmentVariableName: "MOMENTO_API_KEY",
*     }),
*     defaultTtlSeconds: 60 * 60 * 24, // Cache TTL set to 24 hours.
*   }),
*   cacheName: "langchain",
* });
* // Initialize the OpenAI model with Momento cache for caching responses
* const model = new ChatOpenAI({
*   model: "gpt-4o-mini",
*   cache,
* });
* await model.invoke("How are you today?");
* const cachedValues = await cache.lookup("How are you today?", "llmKey");
* ```
*/
var MomentoCache = class MomentoCache extends __langchain_core_caches.BaseCache {
	client;
	cacheName;
	ttlSeconds;
	constructor(props) {
		super();
		this.client = props.client;
		this.cacheName = props.cacheName;
		this.validateTtlSeconds(props.ttlSeconds);
		this.ttlSeconds = props.ttlSeconds;
	}
	/**
	* Create a new standard cache backed by Momento.
	*
	* @param {MomentoCacheProps} props The settings to instantiate the cache.
	* @param {ICacheClient} props.client The Momento cache client.
	* @param {string} props.cacheName The name of the cache to use to store the data.
	* @param {number} props.ttlSeconds The time to live for the cache items. If not specified,
	* the cache client default is used.
	* @param {boolean} props.ensureCacheExists If true, ensure that the cache exists before returning.
	* If false, the cache is not checked for existence. Defaults to true.
	* @throws {@link InvalidArgumentError} if {@link props.ttlSeconds} is not strictly positive.
	* @returns The Momento-backed cache.
	*/
	static async fromProps(props) {
		const instance = new MomentoCache(props);
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
	* Lookup LLM generations in cache by prompt and associated LLM key.
	* @param prompt The prompt to lookup.
	* @param llmKey The LLM key to lookup.
	* @returns The generations associated with the prompt and LLM key, or null if not found.
	*/
	async lookup(prompt, llmKey) {
		const key = this.keyEncoder(prompt, llmKey);
		const getResponse = await this.client.get(this.cacheName, key);
		if (getResponse instanceof __gomomento_sdk_core.CacheGet.Hit) {
			const value = getResponse.valueString();
			const parsedValue = JSON.parse(value);
			if (!Array.isArray(parsedValue)) return null;
			return JSON.parse(value).map(__langchain_core_caches.deserializeStoredGeneration);
		} else if (getResponse instanceof __gomomento_sdk_core.CacheGet.Miss) return null;
		else if (getResponse instanceof __gomomento_sdk_core.CacheGet.Error) throw getResponse.innerException();
		else throw new Error(`Unknown response type: ${getResponse.toString()}`);
	}
	/**
	* Update the cache with the given generations.
	*
	* Note this overwrites any existing generations for the given prompt and LLM key.
	*
	* @param prompt The prompt to update.
	* @param llmKey The LLM key to update.
	* @param value The generations to store.
	*/
	async update(prompt, llmKey, value) {
		const key = this.keyEncoder(prompt, llmKey);
		const setResponse = await this.client.set(this.cacheName, key, JSON.stringify(value.map(__langchain_core_caches.serializeGeneration)), { ttl: this.ttlSeconds });
		if (setResponse instanceof __gomomento_sdk_core.CacheSet.Success) {} else if (setResponse instanceof __gomomento_sdk_core.CacheSet.Error) throw setResponse.innerException();
		else throw new Error(`Unknown response type: ${setResponse.toString()}`);
	}
};

//#endregion
exports.MomentoCache = MomentoCache;
Object.defineProperty(exports, 'momento_exports', {
  enumerable: true,
  get: function () {
    return momento_exports;
  }
});
//# sourceMappingURL=momento.cjs.map