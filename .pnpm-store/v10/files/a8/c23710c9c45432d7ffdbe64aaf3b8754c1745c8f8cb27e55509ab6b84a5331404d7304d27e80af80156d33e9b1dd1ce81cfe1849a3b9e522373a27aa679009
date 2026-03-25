const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_common = require('./common.cjs');
const closevector_node = require_rolldown_runtime.__toESM(require("closevector-node"));

//#region src/vectorstores/closevector/node.ts
var node_exports = {};
require_rolldown_runtime.__export(node_exports, { CloseVectorNode: () => CloseVectorNode });
/**
* Class that implements a vector store using Hierarchical Navigable Small
* World (HNSW) graphs. It extends the SaveableVectorStore class and
* provides methods for adding documents and vectors, performing
* similarity searches, and saving and loading the vector store.
*/
var CloseVectorNode = class CloseVectorNode extends require_common.CloseVector {
	constructor(embeddings, args, credentials) {
		super(embeddings, args, credentials);
		if (args.instance) this.instance = args.instance;
		else this.instance = new closevector_node.CloseVectorHNSWNode(embeddings, args);
	}
	uuid() {
		return this.instance.uuid;
	}
	/**
	* Method to save the index to the CloseVector CDN.
	* @param options.uuid after uploading the index to the CloseVector CDN, the uuid of the index can be obtained by instance.uuid
	* @param options.credentials the credentials to be used to access the CloseVector API
	* @param options.onProgress a callback function to track the upload progress
	* @param options.public a boolean to determine if the index should be public or private, if not provided, the index will be private. If the index is public, it can be accessed by anyone with the uuid.
	* @param options.description a description of the index
	*/
	async saveToCloud(options) {
		await this.instance.saveToCloud({
			...options,
			credentials: options.credentials || this.credentials
		});
	}
	/**
	* Method to load the index from the CloseVector CDN.
	* @param options.uuid after uploading the index to the CloseVector CDN, the uuid of the index can be obtained by instance.uuid
	* @param options.credentials the credentials to be used to access the CloseVector API
	* @param options.onProgress a callback function to track the download progress
	* @param options.embeddings the embeddings to be used by the CloseVectorWeb instance
	*/
	static async loadFromCloud(options) {
		const instance = await closevector_node.CloseVectorHNSWNode.loadFromCloud(options);
		const vectorstore = new this(options.embeddings, instance.args, options.credentials);
		return vectorstore;
	}
	/**
	* Static method to load a vector store from a directory. It reads the
	* HNSW index, the arguments, and the document store from the directory,
	* then creates a new HNSWLib instance with these values.
	* @param directory The directory from which to load the vector store.
	* @param embeddings The embeddings to be used by the CloseVectorNode instance.
	* @returns A Promise that resolves to a new CloseVectorNode instance.
	*/
	static async load(directory, embeddings, credentials) {
		const instance = await closevector_node.CloseVectorHNSWNode.load(directory, embeddings);
		const vectorstore = new this(embeddings, instance.args, credentials);
		return vectorstore;
	}
	/**
	* Static method to create a new CloseVectorWeb instance from texts and metadata.
	* It creates a new Document instance for each text and metadata, then
	* calls the fromDocuments method to create the CloseVectorWeb instance.
	* @param texts The texts to be used to create the documents.
	* @param metadatas The metadata to be used to create the documents.
	* @param embeddings The embeddings to be used by the CloseVectorWeb instance.
	* @param args An optional configuration object for the CloseVectorWeb instance.
	* @param credential An optional credential object for the CloseVector API.
	* @returns A Promise that resolves to a new CloseVectorWeb instance.
	*/
	static async fromTexts(texts, metadatas, embeddings, args, credential) {
		const docs = require_common.CloseVector.textsToDocuments(texts, metadatas);
		return await CloseVectorNode.fromDocuments(docs, embeddings, args, credential);
	}
	/**
	* Static method to create a new CloseVectorNode instance from documents. It
	* creates a new CloseVectorNode instance, adds the documents to it, then returns
	* the instance.
	* @param docs The documents to be added to the HNSWLib instance.
	* @param embeddings The embeddings to be used by the HNSWLib instance.
	* @param args An optional configuration object for the HNSWLib instance.
	* @param credentials An optional credential object for the CloseVector API.
	* @returns A Promise that resolves to a new CloseVectorNode instance.
	*/
	static async fromDocuments(docs, embeddings, args, credentials) {
		const _args = args || { space: "cosine" };
		const instance = new this(embeddings, _args, credentials);
		await instance.addDocuments(docs);
		return instance;
	}
	static async imports() {
		return closevector_node.CloseVectorHNSWNode.imports();
	}
};

//#endregion
exports.CloseVectorNode = CloseVectorNode;
Object.defineProperty(exports, 'node_exports', {
  enumerable: true,
  get: function () {
    return node_exports;
  }
});
//# sourceMappingURL=node.cjs.map