import { __export } from "../_virtual/rolldown_runtime.js";
import { kv } from "@vercel/kv";
import { BaseStore } from "@langchain/core/stores";

//#region src/storage/vercel_kv.ts
var vercel_kv_exports = {};
__export(vercel_kv_exports, { VercelKVStore: () => VercelKVStore });
/**
* Class that extends the BaseStore class to interact with a Vercel KV
* database. It provides methods for getting, setting, and deleting data,
* as well as yielding keys from the database.
* @example
* ```typescript
* const store = new VercelKVStore({
*   client: getClient(),
* });
* await store.mset([
*   { key: "message:id:0", value: "encoded message 0" },
*   { key: "message:id:1", value: "encoded message 1" },
* ]);
* const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
* const yieldedKeys = [];
* for await (const key of store.yieldKeys("message:id:")) {
*   yieldedKeys.push(key);
* }
* await store.mdelete(yieldedKeys);
* ```
*/
var VercelKVStore = class extends BaseStore {
	lc_namespace = ["langchain", "storage"];
	client;
	ttl;
	namespace;
	yieldKeysScanBatchSize = 1e3;
	constructor(fields) {
		super(fields);
		this.client = fields?.client ?? kv;
		this.ttl = fields?.ttl;
		this.namespace = fields?.namespace;
		this.yieldKeysScanBatchSize = fields?.yieldKeysScanBatchSize ?? this.yieldKeysScanBatchSize;
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
	* Gets multiple keys from the Redis database.
	* @param keys Array of keys to be retrieved.
	* @returns An array of retrieved values.
	*/
	async mget(keys) {
		const prefixedKeys = keys.map(this._getPrefixedKey.bind(this));
		const retrievedValues = await this.client.mget(...prefixedKeys);
		const encoder = new TextEncoder();
		return retrievedValues.map((value) => {
			if (value === void 0 || value === null) return void 0;
			else if (typeof value === "object") return encoder.encode(JSON.stringify(value));
			else return encoder.encode(value);
		});
	}
	/**
	* Sets multiple keys in the Redis database.
	* @param keyValuePairs Array of key-value pairs to be set.
	* @returns Promise that resolves when all keys have been set.
	*/
	async mset(keyValuePairs) {
		const decoder = new TextDecoder();
		const decodedKeyValuePairs = keyValuePairs.map(([key, value]) => [this._getPrefixedKey(key), decoder.decode(value)]);
		const pipeline = this.client.pipeline();
		for (const [key, value] of decodedKeyValuePairs) if (this.ttl) pipeline.setex(key, this.ttl, value);
		else pipeline.set(key, value);
		await pipeline.exec();
	}
	/**
	* Deletes multiple keys from the Redis database.
	* @param keys Array of keys to be deleted.
	* @returns Promise that resolves when all keys have been deleted.
	*/
	async mdelete(keys) {
		await this.client.del(...keys.map(this._getPrefixedKey.bind(this)));
	}
	/**
	* Yields keys from the Redis database.
	* @param prefix Optional prefix to filter the keys.
	* @returns An AsyncGenerator that yields keys from the Redis database.
	*/
	async *yieldKeys(prefix) {
		let pattern;
		if (prefix) {
			const wildcardPrefix = prefix.endsWith("*") ? prefix : `${prefix}*`;
			pattern = this._getPrefixedKey(wildcardPrefix);
		} else pattern = this._getPrefixedKey("*");
		let [cursor, batch] = await this.client.scan(0, {
			match: pattern,
			count: this.yieldKeysScanBatchSize
		});
		for (const key of batch) yield this._getDeprefixedKey(key);
		while (String(cursor) !== "0") {
			[cursor, batch] = await this.client.scan(cursor, {
				match: pattern,
				count: this.yieldKeysScanBatchSize
			});
			for (const key of batch) yield this._getDeprefixedKey(key);
		}
	}
};

//#endregion
export { VercelKVStore, vercel_kv_exports };
//# sourceMappingURL=vercel_kv.js.map