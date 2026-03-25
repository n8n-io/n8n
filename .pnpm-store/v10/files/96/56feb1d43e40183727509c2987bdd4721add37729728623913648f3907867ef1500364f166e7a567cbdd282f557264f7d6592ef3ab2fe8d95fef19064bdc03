const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_utils_cassandra = require('../utils/cassandra.cjs');
const __langchain_core_stores = require_rolldown_runtime.__toESM(require("@langchain/core/stores"));

//#region src/storage/cassandra.ts
var cassandra_exports = {};
require_rolldown_runtime.__export(cassandra_exports, { CassandraKVStore: () => CassandraKVStore });
/**
* A concrete implementation of BaseStore for interacting with a Cassandra database.
* It provides methods to get, set, delete, and yield keys based on specified criteria.
*/
var CassandraKVStore = class extends __langchain_core_stores.BaseStore {
	lc_namespace = ["langchain", "storage"];
	cassandraTable;
	options;
	colKey;
	colKeyMap;
	colVal;
	keyDelimiter;
	inClauseSize = 1e3;
	yieldKeysFetchSize = 5e3;
	constructor(options) {
		super(options);
		this.options = options;
		this.colKey = {
			name: "key",
			type: "text",
			partition: true
		};
		this.colKeyMap = {
			name: "key_map",
			type: "map<tinyint,text>"
		};
		this.colVal = {
			name: "val",
			type: "blob"
		};
		this.keyDelimiter = options.keyDelimiter || "/";
	}
	/**
	* Retrieves the values associated with an array of keys from the Cassandra database.
	* It chunks requests for large numbers of keys to manage performance and Cassandra limitations.
	* @param keys An array of keys for which to retrieve values.
	* @returns A promise that resolves with an array of Uint8Array or undefined, corresponding to each key.
	*/
	async mget(keys) {
		await this.ensureTable();
		const processFunction = async (chunkKeys) => {
			const chunkResults = await this.cassandraTable.select([this.colKey, this.colVal], [{
				name: this.colKey.name,
				operator: "IN",
				value: chunkKeys
			}]);
			const useMap = chunkKeys.length > 25;
			const rowsMap = useMap ? new Map(chunkResults.rows.map((row) => [row[this.colKey.name], row])) : null;
			return chunkKeys.map((key) => {
				const row = useMap && rowsMap ? rowsMap.get(key) : chunkResults.rows.find((row$1) => row$1[this.colKey.name] === key);
				if (row && row[this.colVal.name]) {
					const buffer = row[this.colVal.name];
					return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
				}
				return void 0;
			});
		};
		const result = await this.processInChunks(keys, processFunction);
		return result || [];
	}
	/**
	* Sets multiple key-value pairs in the Cassandra database.
	* Each key-value pair is processed to ensure compatibility with Cassandra's storage requirements.
	* @param keyValuePairs An array of key-value pairs to set in the database.
	* @returns A promise that resolves when all key-value pairs have been set.
	*/
	async mset(keyValuePairs) {
		await this.ensureTable();
		const values = keyValuePairs.map(([key, value]) => {
			const keySegments = key.split(this.keyDelimiter);
			const keyMap = keySegments.reduce((acc, segment, index) => {
				acc[index] = segment;
				return acc;
			}, {});
			const bufferValue = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
			return [
				key,
				keyMap,
				bufferValue
			];
		});
		await this.cassandraTable.upsert(values, [
			this.colKey,
			this.colKeyMap,
			this.colVal
		]);
	}
	/**
	* Deletes multiple keys and their associated values from the Cassandra database.
	* @param keys An array of keys to delete from the database.
	* @returns A promise that resolves when all specified keys have been deleted.
	*/
	async mdelete(keys) {
		if (keys.length > 0) {
			await this.ensureTable();
			const processFunction = async (chunkKeys) => {
				const filter = {
					name: this.colKey.name,
					operator: "IN",
					value: chunkKeys
				};
				await this.cassandraTable.delete(filter);
			};
			await this.processInChunks(keys, processFunction);
		}
	}
	/**
	* Yields keys from the Cassandra database optionally based on a prefix, based
	* on the store's keyDelimiter. This method pages through results efficiently
	* for large datasets.
	* @param prefix An optional prefix to filter the keys to be yielded.
	* @returns An async generator that yields keys from the database.
	*/
	async *yieldKeys(prefix) {
		await this.ensureTable();
		const filter = [];
		if (prefix) {
			let segments = prefix.split(this.keyDelimiter);
			if (segments[segments.length - 1] === "") segments = segments.slice(0, -1);
			segments.forEach((segment, index) => {
				filter.push({
					name: `${this.colKeyMap.name}[${index}]`,
					operator: "=",
					value: segment
				});
			});
		}
		let currentPageState;
		do {
			const results = await this.cassandraTable.select([this.colKey], filter, void 0, void 0, false, this.yieldKeysFetchSize, currentPageState);
			for (const row of results.rows) yield row[this.colKey.name];
			currentPageState = results.pageState;
		} while (currentPageState);
	}
	/**
	* Ensures the Cassandra table is initialized and ready for operations.
	* This method is called internally before database operations.
	* @returns A promise that resolves when the table is ensured to exist and be accessible.
	*/
	async ensureTable() {
		if (this.cassandraTable) return;
		const tableConfig = {
			...this.options,
			primaryKey: [this.colKey],
			nonKeyColumns: [this.colKeyMap, this.colVal],
			indices: [{
				name: this.colKeyMap.name,
				value: `( ENTRIES (${this.colKeyMap.name}))`
			}]
		};
		this.cassandraTable = await new require_utils_cassandra.CassandraTable(tableConfig);
	}
	/**
	* Processes an array of keys in chunks, applying a given processing function to each chunk.
	* This method is designed to handle large sets of keys by breaking them down into smaller
	* manageable chunks, applying the processing function to each chunk sequentially. This approach
	* helps in managing resource utilization and adhering to database query limitations.
	*
	* The method is generic, allowing for flexible processing functions that can either perform actions
	* without returning a result (e.g., deletion operations) or return a result (e.g., data retrieval).
	* This design enables the method to be used across a variety of batch processing scenarios.
	*
	* @template T The type of elements in the result array when the processFunction returns data. This
	*             is used to type the resolution of the promise returned by processFunction. For void
	*             operations, T can be omitted or set to any empty interface or null type.
	* @param keys The complete array of keys to be processed. The method chunks this array
	*             based on the specified CHUNK_SIZE.
	* @param processFunction A function that will be applied to each chunk of keys. This function
	*                        should accept an array of strings (chunkKeys) and return a Promise
	*                        that resolves to either void (for operations that don't produce a result,
	*                        like deletion) or an array of type T (for operations that fetch data,
	*                        like retrieval). The array of type T should match the template parameter.
	* @param CHUNK_SIZE (optional) The maximum size of each chunk. If not specified, the class's
	*                   `inClauseSize` property is used as the default chunk size. This value determines
	*                   how many keys are included in each chunk and should be set based on the
	*                   operation's performance characteristics and any limitations of the underlying
	*                   storage system.
	*
	* @returns A Promise that resolves to void if the processing function returns void, or an array
	*          of type T if the processing function returns data. If the processing function returns
	*          data for each chunk, the results from all chunks are concatenated and returned as a
	*          single array. If the processing function does not return data, the method resolves to undefined,
	*          aligning with the void return expectation for non-data-returning operations.
	*/
	async processInChunks(keys, processFunction, CHUNK_SIZE = this.inClauseSize) {
		let results = [];
		for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
			const chunkKeys = keys.slice(i, i + CHUNK_SIZE);
			const chunkResult = await processFunction(chunkKeys);
			if (Array.isArray(chunkResult)) results = results.concat(chunkResult);
		}
		return results.length > 0 ? results : void 0;
	}
};

//#endregion
exports.CassandraKVStore = CassandraKVStore;
Object.defineProperty(exports, 'cassandra_exports', {
  enumerable: true,
  get: function () {
    return cassandra_exports;
  }
});
//# sourceMappingURL=cassandra.cjs.map