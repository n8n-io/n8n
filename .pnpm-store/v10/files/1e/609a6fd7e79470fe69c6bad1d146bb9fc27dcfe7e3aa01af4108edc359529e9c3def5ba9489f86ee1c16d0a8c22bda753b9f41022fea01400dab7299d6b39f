import { __exportAll } from "./_virtual/_rolldown/runtime.js";
import { Serializable } from "./load/serializable.js";
//#region src/stores.ts
var stores_exports = /* @__PURE__ */ __exportAll({
	BaseStore: () => BaseStore,
	InMemoryStore: () => InMemoryStore
});
/**
* Abstract interface for a key-value store.
*/
var BaseStore = class extends Serializable {};
/**
* In-memory implementation of the BaseStore using a dictionary. Used for
* storing key-value pairs in memory.
* @example
* ```typescript
* const store = new InMemoryStore<BaseMessage>();
* await store.mset(
*   Array.from({ length: 5 }).map((_, index) => [
*     `message:id:${index}`,
*     index % 2 === 0
*       ? new AIMessage("ai stuff...")
*       : new HumanMessage("human stuff..."),
*   ]),
* );
*
* const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
* await store.mdelete(await store.yieldKeys("message:id:").toArray());
* ```
*/
var InMemoryStore = class extends BaseStore {
	lc_namespace = ["langchain", "storage"];
	store = {};
	/**
	* Retrieves the values associated with the given keys from the store.
	* @param keys Keys to retrieve values for.
	* @returns Array of values associated with the given keys.
	*/
	async mget(keys) {
		return keys.map((key) => this.store[key]);
	}
	/**
	* Sets the values for the given keys in the store.
	* @param keyValuePairs Array of key-value pairs to set in the store.
	* @returns Promise that resolves when all key-value pairs have been set.
	*/
	async mset(keyValuePairs) {
		for (const [key, value] of keyValuePairs) this.store[key] = value;
	}
	/**
	* Deletes the given keys and their associated values from the store.
	* @param keys Keys to delete from the store.
	* @returns Promise that resolves when all keys have been deleted.
	*/
	async mdelete(keys) {
		for (const key of keys) delete this.store[key];
	}
	/**
	* Asynchronous generator that yields keys from the store. If a prefix is
	* provided, it only yields keys that start with the prefix.
	* @param prefix Optional prefix to filter keys.
	* @returns AsyncGenerator that yields keys from the store.
	*/
	async *yieldKeys(prefix) {
		const keys = Object.keys(this.store);
		for (const key of keys) if (prefix === void 0 || key.startsWith(prefix)) yield key;
	}
};
//#endregion
export { BaseStore, InMemoryStore, stores_exports };

//# sourceMappingURL=stores.js.map