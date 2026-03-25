const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __google_cloud_storage = require_rolldown_runtime.__toESM(require("@google-cloud/storage"));
const __langchain_classic_stores_doc_base = require_rolldown_runtime.__toESM(require("@langchain/classic/stores/doc/base"));

//#region src/stores/doc/gcs.ts
var gcs_exports = {};
require_rolldown_runtime.__export(gcs_exports, { GoogleCloudStorageDocstore: () => GoogleCloudStorageDocstore });
/**
* Class that provides an interface for interacting with Google Cloud
* Storage (GCS) as a document store. It extends the Docstore class and
* implements methods to search, add, and add a document to the GCS
* bucket.
*/
var GoogleCloudStorageDocstore = class extends __langchain_classic_stores_doc_base.Docstore {
	bucket;
	prefix = "";
	storage;
	constructor(config) {
		super();
		this.bucket = config.bucket;
		this.prefix = config.prefix ?? this.prefix;
		this.storage = new __google_cloud_storage.Storage();
	}
	/**
	* Searches for a document in the GCS bucket and returns it as a Document
	* instance.
	* @param search The name of the document to search for in the GCS bucket
	* @returns A Promise that resolves to a Document instance representing the found document
	*/
	async search(search) {
		const file = this.getFile(search);
		const [fileMetadata] = await file.getMetadata();
		const metadata = fileMetadata?.metadata;
		const [dataBuffer] = await file.download();
		const pageContent = dataBuffer.toString();
		const ret = new __langchain_core_documents.Document({
			pageContent,
			metadata
		});
		return ret;
	}
	/**
	* Adds multiple documents to the GCS bucket.
	* @param texts An object where each key is the name of a document and the value is the Document instance to be added
	* @returns A Promise that resolves when all documents have been added
	*/
	async add(texts) {
		await Promise.all(Object.keys(texts).map((key) => this.addDocument(key, texts[key])));
	}
	/**
	* Adds a single document to the GCS bucket.
	* @param name The name of the document to be added
	* @param document The Document instance to be added
	* @returns A Promise that resolves when the document has been added
	*/
	async addDocument(name, document) {
		const file = this.getFile(name);
		await file.save(document.pageContent);
		await file.setMetadata({ metadata: document.metadata });
	}
	/**
	* Gets a file from the GCS bucket.
	* @param name The name of the file to get from the GCS bucket
	* @returns A File instance representing the fetched file
	*/
	getFile(name) {
		const filename = this.prefix + name;
		const file = this.storage.bucket(this.bucket).file(filename);
		return file;
	}
};

//#endregion
exports.GoogleCloudStorageDocstore = GoogleCloudStorageDocstore;
Object.defineProperty(exports, 'gcs_exports', {
  enumerable: true,
  get: function () {
    return gcs_exports;
  }
});
//# sourceMappingURL=gcs.cjs.map