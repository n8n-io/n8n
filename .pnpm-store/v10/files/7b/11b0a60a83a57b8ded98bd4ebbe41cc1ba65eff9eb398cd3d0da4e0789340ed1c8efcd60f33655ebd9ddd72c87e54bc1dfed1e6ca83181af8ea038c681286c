const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_caches = require_rolldown_runtime.__toESM(require("@langchain/core/caches"));
const __upstash_redis = require_rolldown_runtime.__toESM(require("@upstash/redis"));

//#region src/caches/upstash_redis.ts
var upstash_redis_exports = {};
require_rolldown_runtime.__export(upstash_redis_exports, { UpstashRedisCache: () => UpstashRedisCache });
/**
* A cache that uses Upstash as the backing store.
* See https://docs.upstash.com/redis.
* @example
* ```typescript
* const cache = new UpstashRedisCache({
*   config: {
*     url: "UPSTASH_REDIS_REST_URL",
*     token: "UPSTASH_REDIS_REST_TOKEN",
*   },
*   ttl: 3600, // Optional: Cache entries will expire after 1 hour
* });
* // Initialize the OpenAI model with Upstash Redis cache for caching responses
* const model = new ChatOpenAI({
*   model: "gpt-4o-mini",
*   cache,
* });
* await model.invoke("How are you today?");
* const cachedValues = await cache.lookup("How are you today?", "llmKey");
* ```
*/
var UpstashRedisCache = class extends __langchain_core_caches.BaseCache {
	redisClient;
	ttl;
	constructor(props) {
		super();
		const { config, client, ttl } = props;
		this.ttl = ttl;
		if (client) this.redisClient = client;
		else if (config) this.redisClient = new __upstash_redis.Redis(config);
		else throw new Error(`Upstash Redis caches require either a config object or a pre-configured client.`);
	}
	/**
	* Lookup LLM generations in cache by prompt and associated LLM key.
	*/
	async lookup(prompt, llmKey) {
		let idx = 0;
		let key = this.keyEncoder(prompt, llmKey, String(idx));
		let value = await this.redisClient.get(key);
		const generations = [];
		while (value) {
			generations.push((0, __langchain_core_caches.deserializeStoredGeneration)(value));
			idx += 1;
			key = this.keyEncoder(prompt, llmKey, String(idx));
			value = await this.redisClient.get(key);
		}
		return generations.length > 0 ? generations : null;
	}
	/**
	* Update the cache with the given generations.
	*
	* Note this overwrites any existing generations for the given prompt and LLM key.
	*/
	async update(prompt, llmKey, value) {
		for (let i = 0; i < value.length; i += 1) {
			const key = this.keyEncoder(prompt, llmKey, String(i));
			const serializedValue = JSON.stringify((0, __langchain_core_caches.serializeGeneration)(value[i]));
			if (this.ttl) await this.redisClient.set(key, serializedValue, { ex: this.ttl });
			else await this.redisClient.set(key, serializedValue);
		}
	}
};

//#endregion
exports.UpstashRedisCache = UpstashRedisCache;
Object.defineProperty(exports, 'upstash_redis_exports', {
  enumerable: true,
  get: function () {
    return upstash_redis_exports;
  }
});
//# sourceMappingURL=upstash_redis.cjs.map