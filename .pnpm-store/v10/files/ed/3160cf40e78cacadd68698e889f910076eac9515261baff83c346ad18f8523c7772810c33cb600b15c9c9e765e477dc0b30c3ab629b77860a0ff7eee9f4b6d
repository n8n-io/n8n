import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { sha256 } from "../utils/js-sha256/hash.js";
import "../utils/hash.js";
import { mapStoredMessageToChatMessage } from "../messages/utils.js";
//#region src/caches/index.ts
var caches_exports = /* @__PURE__ */ __exportAll({
	BaseCache: () => BaseCache,
	InMemoryCache: () => InMemoryCache,
	defaultHashKeyEncoder: () => defaultHashKeyEncoder,
	deserializeStoredGeneration: () => deserializeStoredGeneration,
	serializeGeneration: () => serializeGeneration
});
const defaultHashKeyEncoder = (...strings) => sha256(strings.join("_"));
function deserializeStoredGeneration(storedGeneration) {
	if (storedGeneration.message !== void 0) return {
		text: storedGeneration.text,
		message: mapStoredMessageToChatMessage(storedGeneration.message)
	};
	else return { text: storedGeneration.text };
}
function serializeGeneration(generation) {
	const serializedValue = { text: generation.text };
	if (generation.message !== void 0) serializedValue.message = generation.message.toDict();
	return serializedValue;
}
/**
* Base class for all caches. All caches should extend this class.
*/
var BaseCache = class {
	keyEncoder = defaultHashKeyEncoder;
	/**
	* Sets a custom key encoder function for the cache.
	* This function should take a prompt and an LLM key and return a string
	* that will be used as the cache key.
	* @param keyEncoderFn The custom key encoder function.
	*/
	makeDefaultKeyEncoder(keyEncoderFn) {
		this.keyEncoder = keyEncoderFn;
	}
};
const GLOBAL_MAP = /* @__PURE__ */ new Map();
/**
* A cache for storing LLM generations that stores data in memory.
*/
var InMemoryCache = class InMemoryCache extends BaseCache {
	cache;
	constructor(map) {
		super();
		this.cache = map ?? /* @__PURE__ */ new Map();
	}
	/**
	* Retrieves data from the cache using a prompt and an LLM key. If the
	* data is not found, it returns null.
	* @param prompt The prompt used to find the data.
	* @param llmKey The LLM key used to find the data.
	* @returns The data corresponding to the prompt and LLM key, or null if not found.
	*/
	lookup(prompt, llmKey) {
		return Promise.resolve(this.cache.get(this.keyEncoder(prompt, llmKey)) ?? null);
	}
	/**
	* Updates the cache with new data using a prompt and an LLM key.
	* @param prompt The prompt used to store the data.
	* @param llmKey The LLM key used to store the data.
	* @param value The data to be stored.
	*/
	async update(prompt, llmKey, value) {
		this.cache.set(this.keyEncoder(prompt, llmKey), value);
	}
	/**
	* Returns a global instance of InMemoryCache using a predefined global
	* map as the initial cache.
	* @returns A global instance of InMemoryCache.
	*/
	static global() {
		return new InMemoryCache(GLOBAL_MAP);
	}
};
//#endregion
export { BaseCache, InMemoryCache, caches_exports, defaultHashKeyEncoder, deserializeStoredGeneration, serializeGeneration };

//# sourceMappingURL=index.js.map