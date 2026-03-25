import { __export } from "../_virtual/rolldown_runtime.js";
import path from "node:path";
import fs from "node:fs/promises";
import { BaseCache, deserializeStoredGeneration, serializeGeneration } from "@langchain/core/caches";

//#region src/cache/file_system.ts
var file_system_exports = {};
__export(file_system_exports, { LocalFileCache: () => LocalFileCache });
/**
* A cache that uses the local filesystem as the backing store.
* This is useful for local development and testing. But it is not recommended for production use.
*/
var LocalFileCache = class LocalFileCache extends BaseCache {
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
		if (!cacheDir) cacheDir = await fs.mkdtemp("langchain-cache-");
		else await fs.mkdir(cacheDir, { recursive: true });
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
			const content = await fs.readFile(path.join(this.cacheDir, key));
			return JSON.parse(content.toString()).map(deserializeStoredGeneration);
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
		await fs.writeFile(path.join(this.cacheDir, key), JSON.stringify(generations.map(serializeGeneration)));
	}
};

//#endregion
export { LocalFileCache, file_system_exports };
//# sourceMappingURL=file_system.js.map