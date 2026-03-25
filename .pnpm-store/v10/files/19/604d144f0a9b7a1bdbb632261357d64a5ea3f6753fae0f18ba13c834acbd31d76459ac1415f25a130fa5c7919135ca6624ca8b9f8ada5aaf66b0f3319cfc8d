const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const node_path = require_rolldown_runtime.__toESM(require("node:path"));
const node_fs_promises = require_rolldown_runtime.__toESM(require("node:fs/promises"));
const __langchain_core_stores = require_rolldown_runtime.__toESM(require("@langchain/core/stores"));

//#region src/storage/file_system.ts
var file_system_exports = {};
require_rolldown_runtime.__export(file_system_exports, { LocalFileStore: () => LocalFileStore });
/**
* File system implementation of the BaseStore using a dictionary. Used for
* storing key-value pairs in the file system.
* @example
* ```typescript
* const store = await LocalFileStore.fromPath("./messages");
* await store.mset(
*   Array.from({ length: 5 }).map((_, index) => [
*     `message:id:${index}`,
*     new TextEncoder().encode(
*       JSON.stringify(
*         index % 2 === 0
*           ? new AIMessage("ai stuff...")
*           : new HumanMessage("human stuff..."),
*       ),
*     ),
*   ]),
* );
* const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
* console.log(retrievedMessages.map((v) => new TextDecoder().decode(v)));
* for await (const key of store.yieldKeys("message:id:")) {
*   await store.mdelete([key]);
* }
* ```
*
* @security **Security Notice** This file store
* can alter any text file in the provided directory and any subfolders.
* Make sure that the path you specify when initializing the store is free
* of other files.
*/
var LocalFileStore = class extends __langchain_core_stores.BaseStore {
	lc_namespace = ["langchain", "storage"];
	rootPath;
	constructor(fields) {
		super(fields);
		this.rootPath = fields.rootPath;
	}
	/**
	* Read and parse the file at the given path.
	* @param key The key to read the file for.
	* @returns Promise that resolves to the parsed file content.
	*/
	async getParsedFile(key) {
		if (!/^[a-zA-Z0-9_\-:.]+$/.test(key)) throw new Error("Invalid key. Only alphanumeric characters, underscores, hyphens, colons, and periods are allowed.");
		try {
			const fileContent = await node_fs_promises.readFile(this.getFullPath(key));
			if (!fileContent) return void 0;
			return fileContent;
		} catch (e) {
			if ("code" in e && e.code === "ENOENT") return void 0;
			throw new Error(`Error reading and parsing file at path: ${this.rootPath}.\nError: ${JSON.stringify(e)}`);
		}
	}
	/**
	* Writes the given key-value pairs to the file at the given path.
	* @param fileContent An object with the key-value pairs to be written to the file.
	*/
	async setFileContent(content, key) {
		try {
			await node_fs_promises.writeFile(this.getFullPath(key), content);
		} catch (error) {
			throw new Error(`Error writing file at path: ${this.getFullPath(key)}.\nError: ${JSON.stringify(error)}`);
		}
	}
	/**
	* Returns the full path of the file where the value of the given key is stored.
	* @param key the key to get the full path for
	*/
	getFullPath(key) {
		try {
			const keyAsTxtFile = `${key}.txt`;
			if (!/^[a-zA-Z0-9_.\-/]+$/.test(key)) throw new Error(`Invalid characters in key: ${key}`);
			const fullPath = node_path.resolve(this.rootPath, keyAsTxtFile);
			const commonPath = node_path.resolve(this.rootPath);
			if (!fullPath.startsWith(commonPath)) throw new Error(`Invalid key: ${key}. Key should be relative to the root path. Root path: ${this.rootPath}, Full path: ${fullPath}`);
			return fullPath;
		} catch (e) {
			throw new Error(`Error getting full path for key: ${key}.\nError: ${String(e)}`);
		}
	}
	/**
	* Retrieves the values associated with the given keys from the store.
	* @param keys Keys to retrieve values for.
	* @returns Array of values associated with the given keys.
	*/
	async mget(keys) {
		const values = [];
		for (const key of keys) {
			const fileContent = await this.getParsedFile(key);
			values.push(fileContent);
		}
		return values;
	}
	/**
	* Sets the values for the given keys in the store.
	* @param keyValuePairs Array of key-value pairs to set in the store.
	* @returns Promise that resolves when all key-value pairs have been set.
	*/
	async mset(keyValuePairs) {
		await Promise.all(keyValuePairs.map(([key, value]) => this.setFileContent(value, key)));
	}
	/**
	* Deletes the given keys and their associated values from the store.
	* @param keys Keys to delete from the store.
	* @returns Promise that resolves when all keys have been deleted.
	*/
	async mdelete(keys) {
		await Promise.all(keys.map((key) => node_fs_promises.unlink(this.getFullPath(key))));
	}
	/**
	* Asynchronous generator that yields keys from the store. If a prefix is
	* provided, it only yields keys that start with the prefix.
	* @param prefix Optional prefix to filter keys.
	* @returns AsyncGenerator that yields keys from the store.
	*/
	async *yieldKeys(prefix) {
		const allFiles = await node_fs_promises.readdir(this.rootPath);
		const allKeys = allFiles.map((file) => file.replace(".txt", ""));
		for (const key of allKeys) if (prefix === void 0 || key.startsWith(prefix)) yield key;
	}
	/**
	* Static method for initializing the class.
	* Preforms a check to see if the directory exists, and if not, creates it.
	* @param path Path to the directory.
	* @returns Promise that resolves to an instance of the class.
	*/
	static async fromPath(rootPath) {
		try {
			await node_fs_promises.access(rootPath, node_fs_promises.constants.R_OK | node_fs_promises.constants.W_OK);
		} catch {
			try {
				await node_fs_promises.mkdir(rootPath, { recursive: true });
			} catch (error) {
				throw new Error(`An error occurred creating directory at: ${rootPath}.\nError: ${JSON.stringify(error)}`);
			}
		}
		return new this({ rootPath });
	}
};

//#endregion
exports.LocalFileStore = LocalFileStore;
Object.defineProperty(exports, 'file_system_exports', {
  enumerable: true,
  get: function () {
    return file_system_exports;
  }
});
//# sourceMappingURL=file_system.cjs.map