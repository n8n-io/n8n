Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_hash = require("../utils/js-sha256/hash.cjs");
require("../utils/hash.cjs");
const require_utils = require("../messages/utils.cjs");
//#region src/caches/index.ts
var caches_exports = /* @__PURE__ */ require_runtime.__exportAll({
	BaseCache: () => BaseCache,
	InMemoryCache: () => InMemoryCache,
	defaultHashKeyEncoder: () => defaultHashKeyEncoder,
	deserializeStoredGeneration: () => deserializeStoredGeneration,
	serializeGeneration: () => serializeGeneration
});
const defaultHashKeyEncoder = (...strings) => require_hash.sha256(strings.join("_"));
function deserializeStoredGeneration(storedGeneration) {
	if (storedGeneration.message !== void 0) return {
		text: storedGeneration.text,
		message: require_utils.mapStoredMessageToChatMessage(storedGeneration.message)
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
exports.BaseCache = BaseCache;
exports.InMemoryCache = InMemoryCache;
Object.defineProperty(exports, "caches_exports", {
	enumerable: true,
	get: function() {
		return caches_exports;
	}
});
exports.defaultHashKeyEncoder = defaultHashKeyEncoder;
exports.deserializeStoredGeneration = deserializeStoredGeneration;
exports.serializeGeneration = serializeGeneration;

//# sourceMappingURL=index.cjs.map