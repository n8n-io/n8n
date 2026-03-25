import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseStore } from "@langchain/core/stores";
import { makeFunctionReference } from "convex/server";

//#region src/storage/convex.ts
var convex_exports = {};
__export(convex_exports, { ConvexKVStore: () => ConvexKVStore });
/**
* Class that extends the BaseStore class to interact with a Convex
* database. It provides methods for getting, setting, and deleting key value pairs,
* as well as yielding keys from the database.
*/
var ConvexKVStore = class extends BaseStore {
	lc_namespace = [
		"langchain",
		"storage",
		"convex"
	];
	ctx;
	table;
	index;
	keyField;
	valueField;
	upsert;
	lookup;
	deleteMany;
	constructor(config) {
		super(config);
		this.ctx = config.ctx;
		this.table = config.table ?? "cache";
		this.index = config.index ?? "byKey";
		this.keyField = config.keyField ?? "key";
		this.valueField = config.valueField ?? "value";
		this.upsert = config.upsert ?? makeFunctionReference("langchain/db:upsert");
		this.lookup = config.lookup ?? makeFunctionReference("langchain/db:lookup");
		this.deleteMany = config.deleteMany ?? makeFunctionReference("langchain/db:deleteMany");
	}
	/**
	* Gets multiple keys from the Convex database.
	* @param keys Array of keys to be retrieved.
	* @returns An array of retrieved values.
	*/
	async mget(keys) {
		return await Promise.all(keys.map(async (key) => {
			const found = await this.ctx.runQuery(this.lookup, {
				table: this.table,
				index: this.index,
				keyField: this.keyField,
				key
			});
			return found.length > 0 ? found[0][this.valueField] : void 0;
		}));
	}
	/**
	* Sets multiple keys in the Convex database.
	* @param keyValuePairs Array of key-value pairs to be set.
	* @returns Promise that resolves when all keys have been set.
	*/
	async mset(keyValuePairs) {
		const PAGE_SIZE = 16;
		for (let i = 0; i < keyValuePairs.length; i += PAGE_SIZE) await Promise.all(keyValuePairs.slice(i, i + PAGE_SIZE).map(([key, value]) => this.ctx.runMutation(this.upsert, {
			table: this.table,
			index: this.index,
			keyField: this.keyField,
			key,
			document: {
				[this.keyField]: key,
				[this.valueField]: value
			}
		})));
	}
	/**
	* Deletes multiple keys from the Convex database.
	* @param keys Array of keys to be deleted.
	* @returns Promise that resolves when all keys have been deleted.
	*/
	async mdelete(keys) {
		await Promise.all(keys.map((key) => this.ctx.runMutation(this.deleteMany, {
			table: this.table,
			index: this.index,
			keyField: this.keyField,
			key
		})));
	}
	/**
	* Yields keys from the Convex database.
	* @param prefix Optional prefix to filter the keys.
	* @returns An AsyncGenerator that yields keys from the Convex database.
	*/
	async *yieldKeys(_prefix) {
		throw new Error("yieldKeys not implemented yet for ConvexKVStore");
	}
};

//#endregion
export { ConvexKVStore, convex_exports };
//# sourceMappingURL=convex.js.map