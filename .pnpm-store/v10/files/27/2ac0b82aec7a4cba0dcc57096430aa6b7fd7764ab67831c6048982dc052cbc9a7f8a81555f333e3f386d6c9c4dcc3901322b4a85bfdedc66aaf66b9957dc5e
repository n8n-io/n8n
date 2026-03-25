const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_stores = require_rolldown_runtime.__toESM(require("@langchain/core/stores"));

//#region src/storage/encoder_backed.ts
var encoder_backed_exports = {};
require_rolldown_runtime.__export(encoder_backed_exports, {
	EncoderBackedStore: () => EncoderBackedStore,
	createDocumentStoreFromByteStore: () => createDocumentStoreFromByteStore
});
/**
* Class that provides a layer of abstraction over the base storage,
* allowing for the encoding and decoding of keys and values. It extends
* the BaseStore class.
*/
var EncoderBackedStore = class extends __langchain_core_stores.BaseStore {
	lc_namespace = ["langchain", "storage"];
	store;
	keyEncoder;
	valueSerializer;
	valueDeserializer;
	constructor(fields) {
		super(fields);
		this.store = fields.store;
		this.keyEncoder = fields.keyEncoder;
		this.valueSerializer = fields.valueSerializer;
		this.valueDeserializer = fields.valueDeserializer;
	}
	/**
	* Method to get multiple keys at once. It works with the encoded keys and
	* serialized values.
	* @param keys Array of keys to get
	* @returns Promise that resolves with an array of values or undefined for each key
	*/
	async mget(keys) {
		const encodedKeys = keys.map(this.keyEncoder);
		const values = await this.store.mget(encodedKeys);
		return values.map((value) => {
			if (value === void 0) return void 0;
			return this.valueDeserializer(value);
		});
	}
	/**
	* Method to set multiple keys at once. It works with the encoded keys and
	* serialized values.
	* @param keyValuePairs Array of key-value pairs to set
	* @returns Promise that resolves when the operation is complete
	*/
	async mset(keyValuePairs) {
		const encodedPairs = keyValuePairs.map(([key, value]) => [this.keyEncoder(key), this.valueSerializer(value)]);
		return this.store.mset(encodedPairs);
	}
	/**
	* Method to delete multiple keys at once. It works with the encoded keys.
	* @param keys Array of keys to delete
	* @returns Promise that resolves when the operation is complete
	*/
	async mdelete(keys) {
		const encodedKeys = keys.map(this.keyEncoder);
		return this.store.mdelete(encodedKeys);
	}
	/**
	* Method to yield keys. It works with the encoded keys.
	* @param prefix Optional prefix to filter keys
	* @returns AsyncGenerator that yields keys
	*/
	async *yieldKeys(prefix) {
		yield* this.store.yieldKeys(prefix);
	}
};
function createDocumentStoreFromByteStore(store) {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	return new EncoderBackedStore({
		store,
		keyEncoder: (key) => key,
		valueSerializer: (doc) => encoder.encode(JSON.stringify({
			pageContent: doc.pageContent,
			metadata: doc.metadata
		})),
		valueDeserializer: (bytes) => new __langchain_core_documents.Document(JSON.parse(decoder.decode(bytes)))
	});
}

//#endregion
exports.EncoderBackedStore = EncoderBackedStore;
exports.createDocumentStoreFromByteStore = createDocumentStoreFromByteStore;
Object.defineProperty(exports, 'encoder_backed_exports', {
  enumerable: true,
  get: function () {
    return encoder_backed_exports;
  }
});
//# sourceMappingURL=encoder_backed.cjs.map