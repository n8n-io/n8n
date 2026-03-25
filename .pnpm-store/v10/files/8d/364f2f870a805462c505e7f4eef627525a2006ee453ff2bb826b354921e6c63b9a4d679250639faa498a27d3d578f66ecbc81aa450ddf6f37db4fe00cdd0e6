const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_caches = require_rolldown_runtime.__toESM(require("@langchain/core/caches"));

//#region src/caches/ioredis.ts
var ioredis_exports = {};
require_rolldown_runtime.__export(ioredis_exports, { RedisCache: () => RedisCache });
/**
* Cache LLM results using Redis.
* @example
* ```typescript
* const model = new ChatOpenAI({
*   model: "gpt-4o-mini",
*   cache: new RedisCache(new Redis(), { ttl: 60 }),
* });
*
* // Invoke the model with a prompt
* const response = await model.invoke("Do something random!");
* console.log(response);
*
* // Remember to disconnect the Redis client when done
* await redisClient.disconnect();
* ```
*/
var RedisCache = class extends __langchain_core_caches.BaseCache {
	redisClient;
	ttl;
	constructor(redisClient, config) {
		super();
		this.redisClient = redisClient;
		this.ttl = config?.ttl;
	}
	/**
	* Retrieves data from the Redis server using a prompt and an LLM key. If
	* the data is not found, it returns null.
	* @param prompt The prompt used to find the data.
	* @param llmKey The LLM key used to find the data.
	* @returns The corresponding data as an array of Generation objects, or null if not found.
	*/
	async lookup(prompt, llmKey) {
		let idx = 0;
		let key = this.keyEncoder(prompt, llmKey, String(idx));
		let value = await this.redisClient.get(key);
		const generations = [];
		while (value) {
			const storedGeneration = JSON.parse(value);
			generations.push((0, __langchain_core_caches.deserializeStoredGeneration)(storedGeneration));
			idx += 1;
			key = this.keyEncoder(prompt, llmKey, String(idx));
			value = await this.redisClient.get(key);
		}
		return generations.length > 0 ? generations : null;
	}
	/**
	* Updates the data in the Redis server using a prompt and an LLM key.
	* @param prompt The prompt used to store the data.
	* @param llmKey The LLM key used to store the data.
	* @param value The data to be stored, represented as an array of Generation objects.
	*/
	async update(prompt, llmKey, value) {
		for (let i = 0; i < value.length; i += 1) {
			const key = this.keyEncoder(prompt, llmKey, String(i));
			if (this.ttl !== void 0) await this.redisClient.set(key, JSON.stringify((0, __langchain_core_caches.serializeGeneration)(value[i])), "EX", this.ttl);
			else await this.redisClient.set(key, JSON.stringify((0, __langchain_core_caches.serializeGeneration)(value[i])));
		}
	}
};

//#endregion
exports.RedisCache = RedisCache;
Object.defineProperty(exports, 'ioredis_exports', {
  enumerable: true,
  get: function () {
    return ioredis_exports;
  }
});
//# sourceMappingURL=ioredis.cjs.map