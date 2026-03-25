const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const node_path = require_rolldown_runtime.__toESM(require("node:path"));
const node_fs_promises = require_rolldown_runtime.__toESM(require("node:fs/promises"));
const __langchain_core_caches = require_rolldown_runtime.__toESM(require("@langchain/core/caches"));

//#region src/cache/file_system.ts
var file_system_exports = {};
require_rolldown_runtime.__export(file_system_exports, { LocalFileCache: () => LocalFileCache });
/**
* A cache that uses the local filesystem as the backing store.
* This is useful for local development and testing. But it is not recommended for production use.
*/
var LocalFileCache = class LocalFileCache extends __langchain_core_caches.BaseCache {
	cacheDir;
	constructor(cacheDir) {
		super();
		this.cacheDir = cacheDir;
	}
	/**
	* Create a new cache backed by the local filesystem.
	* It ensures that the cache directory exists before returning.
	* @param cacheDir
	*/
	static async create(cacheDir) {
		if (!cacheDir) cacheDir = await node_fs_promises.default.mkdtemp("langchain-cache-");
		else await node_fs_promises.default.mkdir(cacheDir, { recursive: true });
		return new LocalFileCache(cacheDir);
	}
	/**
	* Retrieves data from the cache. It constructs a cache key from the given
	* `prompt` and `llmKey`, and retrieves the corresponding value from the
	* cache files.
	* @param prompt The prompt used to construct the cache key.
	* @param llmKey The LLM key used to construct the cache key.
	* @returns An array of Generations if found, null otherwise.
	*/
	async lookup(prompt, llmKey) {
		const key = `${this.keyEncoder(prompt, llmKey)}.json`;
		try {
			const content = await node_fs_promises.default.readFile(node_path.default.join(this.cacheDir, key));
			return JSON.parse(content.toString()).map(__langchain_core_caches.deserializeStoredGeneration);
		} catch {
			return null;
		}
	}
	/**
	* Updates the cache with new data. It constructs a cache key from the
	* given `prompt` and `llmKey`, and stores the `value` in a specific
	* file in the cache directory.
	* @param prompt The prompt used to construct the cache key.
	* @param llmKey The LLM key used to construct the cache key.
	* @param generations The value to be stored in the cache.
	*/
	async update(prompt, llmKey, generations) {
		const key = `${this.keyEncoder(prompt, llmKey)}.json`;
		await node_fs_promises.default.writeFile(node_path.default.join(this.cacheDir, key), JSON.stringify(generations.map(__langchain_core_caches.serializeGeneration)));
	}
};

//#endregion
exports.LocalFileCache = LocalFileCache;
Object.defineProperty(exports, 'file_system_exports', {
  enumerable: true,
  get: function () {
    return file_system_exports;
  }
});
//# sourceMappingURL=file_system.cjs.map