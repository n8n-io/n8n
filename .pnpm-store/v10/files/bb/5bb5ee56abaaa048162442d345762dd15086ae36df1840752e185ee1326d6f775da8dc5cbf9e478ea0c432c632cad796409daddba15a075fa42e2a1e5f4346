import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseCache, deserializeStoredGeneration, serializeGeneration } from "@langchain/core/caches";
import { kv } from "@vercel/kv";

//#region src/caches/vercel_kv.ts
var vercel_kv_exports = {};
__export(vercel_kv_exports, { VercelKVCache: () => VercelKVCache });
/**
* A cache that uses Vercel KV as the backing store.
* @example
* ```typescript
* const cache = new VercelKVCache({
*   ttl: 3600, // Optional: Cache entries will expire after 1 hour
* });
*
* // Initialize the OpenAI model with Vercel KV cache for caching responses
* const model = new ChatOpenAI({
*   model: "gpt-4o-mini",
*   cache,
* });
* await model.invoke("How are you today?");
* const cachedValues = await cache.lookup("How are you today?", "llmKey");
* ```
*/
var VercelKVCache = class extends BaseCache {
	client;
	ttl;
	constructor(props) {
		super();
		const { client, ttl } = props;
		this.client = client ?? kv;
		this.ttl = ttl;
	}
	/**
	* Lookup LLM generations in cache by prompt and associated LLM key.
	*/
	async lookup(prompt, llmKey) {
		let idx = 0;
		let key = this.keyEncoder(prompt, llmKey, String(idx));
		let value = await this.client.get(key);
		const generations = [];
		while (value) {
			generations.push(deserializeStoredGeneration(value));
			idx += 1;
			key = this.keyEncoder(prompt, llmKey, String(idx));
			value = await this.client.get(key);
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
			const serializedValue = JSON.stringify(serializeGeneration(value[i]));
			if (this.ttl) await this.client.set(key, serializedValue, { ex: this.ttl });
			else await this.client.set(key, serializedValue);
		}
	}
};

//#endregion
export { VercelKVCache, vercel_kv_exports };
//# sourceMappingURL=vercel_kv.js.map