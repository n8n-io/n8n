import { BaseEntityStore } from "./base.js";

//#region src/memory/stores/entity/in_memory.ts
/**
* An entity store that keeps data in memory. It extends from the
* `BaseEntityStore` class and is used to store and manage entities.
*/
var InMemoryEntityStore = class extends BaseEntityStore {
	lc_namespace = [
		"langchain",
		"stores",
		"entity",
		"in_memory"
	];
	store;
	constructor() {
		super();
		this.store = Object.create(null);
	}
	/**
	* Retrieves the value associated with the given key from the store. If
	* the key does not exist in the store, it returns the provided default
	* value.
	* @param key The key to retrieve the value for.
	* @param defaultValue The default value to return if the key does not exist in the store.
	* @returns The value associated with the key, or the default value if the key does not exist in the store.
	*/
	async get(key, defaultValue) {
		return key in this.store ? this.store[key] : defaultValue;
	}
	/**
	* Sets the value associated with the given key in the store.
	* @param key The key to set the value for.
	* @param value The value to set.
	*/
	async set(key, value) {
		this.store[key] = value;
	}
	/**
	* Removes the key and its associated value from the store.
	* @param key The key to remove.
	*/
	async delete(key) {
		delete this.store[key];
	}
	/**
	* Checks if a key exists in the store.
	* @param key The key to check.
	* @returns A boolean indicating whether the key exists in the store.
	*/
	async exists(key) {
		return key in this.store;
	}
	/**
	* Removes all keys and their associated values from the store.
	*/
	async clear() {
		this.store = Object.create(null);
	}
};

//#endregion
export { InMemoryEntityStore };
//# sourceMappingURL=in_memory.js.map