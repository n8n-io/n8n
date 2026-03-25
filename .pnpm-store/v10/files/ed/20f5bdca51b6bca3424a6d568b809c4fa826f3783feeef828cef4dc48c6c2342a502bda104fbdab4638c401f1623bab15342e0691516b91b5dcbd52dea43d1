const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_core_stores = require_rolldown_runtime.__toESM(require("@langchain/core/stores"));

//#region src/storage.ts
/**
* Class that extends the BaseStore class to interact with a MongoDB
* database. It provides methods for getting, setting, and deleting data,
* as well as yielding keys from the database.
* @example
* ```typescript
* const client = new MongoClient(process.env.MONGODB_ATLAS_URI);
* const collection = client.db("dbName").collection("collectionName");

* const store = new MongoDBStore({
*   collection,
* });
*
* const docs = [
*   [uuidv4(), "Dogs are tough."],
*   [uuidv4(), "Cats are tough."],
* ];
* const encoder = new TextEncoder();
* const docsAsKVPairs: Array<[string, Uint8Array]> = docs.map(
*   (doc) => [doc[0], encoder.encode(doc[1])]
* );
* await store.mset(docsAsKVPairs);
* ```
*/
var MongoDBStore = class extends __langchain_core_stores.BaseStore {
	lc_namespace = [
		"langchain",
		"storage",
		"mongodb"
	];
	collection;
	namespace;
	yieldKeysScanBatchSize = 1e3;
	primaryKey = "_id";
	constructor(fields) {
		super(fields);
		this.collection = fields.collection;
		this.primaryKey = fields.primaryKey ?? this.primaryKey;
		this.yieldKeysScanBatchSize = fields.yieldKeysScanBatchSize ?? this.yieldKeysScanBatchSize;
		this.namespace = fields.namespace;
		this.collection.db.client.appendMetadata({ name: "langchainjs_storage" });
	}
	_getPrefixedKey(key) {
		if (this.namespace) {
			const delimiter = "/";
			return `${this.namespace}${delimiter}${key}`;
		}
		return key;
	}
	_getDeprefixedKey(key) {
		if (this.namespace) {
			const delimiter = "/";
			return key.slice(this.namespace.length + 1);
		}
		return key;
	}
	/**
	* Gets multiple keys from the MongoDB database.
	* @param keys Array of keys to be retrieved.
	* @returns An array of retrieved values.
	*/
	async mget(keys) {
		const prefixedKeys = keys.map(this._getPrefixedKey.bind(this));
		const retrievedValues = await this.collection.find({ [this.primaryKey]: { $in: prefixedKeys } }).toArray();
		const encoder = new TextEncoder();
		const valueMap = new Map(retrievedValues.map((item) => [item[this.primaryKey], item]));
		return prefixedKeys.map((prefixedKey) => {
			const value = valueMap.get(prefixedKey);
			if (!value) return void 0;
			if (!("value" in value)) return void 0;
			else if (typeof value.value === "object") return encoder.encode(JSON.stringify(value.value));
			else if (typeof value.value === "string") return encoder.encode(value.value);
			else throw new Error("Unexpected value type");
		});
	}
	/**
	* Sets multiple keys in the MongoDB database.
	* @param keyValuePairs Array of key-value pairs to be set.
	* @returns Promise that resolves when all keys have been set.
	*/
	async mset(keyValuePairs) {
		const decoder = new TextDecoder();
		const updates = keyValuePairs.map(([key, value]) => {
			const decodedValue = decoder.decode(value);
			return [{ [this.primaryKey]: this._getPrefixedKey(key) }, { $set: {
				[this.primaryKey]: this._getPrefixedKey(key),
				value: decodedValue
			} }];
		});
		await this.collection.bulkWrite(updates.map(([filter, update]) => ({ updateOne: {
			filter,
			update,
			upsert: true
		} })));
	}
	/**
	* Deletes multiple keys from the MongoDB database.
	* @param keys Array of keys to be deleted.
	* @returns Promise that resolves when all keys have been deleted.
	*/
	async mdelete(keys) {
		const allKeysWithPrefix = keys.map(this._getPrefixedKey.bind(this));
		await this.collection.deleteMany({ [this.primaryKey]: { $in: allKeysWithPrefix } });
	}
	/**
	* Yields keys from the MongoDB database.
	* @param prefix Optional prefix to filter the keys. A wildcard (*) is always appended to the end.
	* @returns An AsyncGenerator that yields keys from the MongoDB database.
	*/
	async *yieldKeys(prefix) {
		let regexPattern;
		if (prefix) {
			const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regexPrefix = escapedPrefix.endsWith("*") ? escapedPrefix.slice(0, -1) : escapedPrefix;
			regexPattern = `^${this._getPrefixedKey(regexPrefix)}.*`;
		} else regexPattern = `^${this._getPrefixedKey(".*")}`;
		const cursor = this.collection.find({ [this.primaryKey]: { $regex: regexPattern } }, { batchSize: this.yieldKeysScanBatchSize }).map((key) => this._getDeprefixedKey(key[this.primaryKey]));
		for await (const document of cursor) yield document;
	}
};

//#endregion
exports.MongoDBStore = MongoDBStore;
//# sourceMappingURL=storage.cjs.map