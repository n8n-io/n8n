import { __export } from "../../_virtual/rolldown_runtime.js";
import { CloseVector } from "./common.js";
import { Document } from "@langchain/core/documents";
import { CloseVectorHNSWWeb } from "closevector-web";

//#region src/vectorstores/closevector/web.ts
var web_exports = {};
__export(web_exports, { CloseVectorWeb: () => CloseVectorWeb });
/**
* Class that implements a vector store using CloseVector, It extends the SaveableVectorStore class and
* provides methods for adding documents and vectors, performing
* similarity searches, and saving and loading the vector store.
*/
var CloseVectorWeb = class CloseVectorWeb extends CloseVector {
	constructor(embeddings, args, credentials) {
		super(embeddings, args, credentials);
		if (args.instance) this.instance = args.instance;
		else this.instance = new CloseVectorHNSWWeb(embeddings, {
			...args,
			...credentials
		});
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
		const instance = await CloseVectorHNSWWeb.loadFromCloud(options);
		const vectorstore = new this(options.embeddings, instance.args, options.credentials);
		return vectorstore;
	}
	/**
	* Static method to load a vector store from a directory. It reads the
	* HNSW index, the arguments, and the document store from the directory,
	* then creates a new CloseVectorWeb instance with these values.
	* @param directory The directory from which to load the vector store.
	* @param embeddings The embeddings to be used by the CloseVectorWeb instance.
	* @returns A Promise that resolves to a new CloseVectorWeb instance.
	*/
	static async load(directory, embeddings, credentials) {
		const instance = await CloseVectorHNSWWeb.load(directory, embeddings);
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
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return await CloseVectorWeb.fromDocuments(docs, embeddings, args, credential);
	}
	/**
	* Static method to create a new CloseVectorWeb instance from documents. It
	* creates a new CloseVectorWeb instance, adds the documents to it, then returns
	* the instance.
	* @param docs The documents to be added to the CloseVectorWeb instance.
	* @param embeddings The embeddings to be used by the CloseVectorWeb instance.
	* @param args An optional configuration object for the CloseVectorWeb instance.
	* @param credentials An optional credential object for the CloseVector API.
	* @returns A Promise that resolves to a new CloseVectorWeb instance.
	*/
	static async fromDocuments(docs, embeddings, args, credentials) {
		const _args = args || { space: "cosine" };
		const instance = new this(embeddings, _args, credentials);
		await instance.addDocuments(docs);
		return instance;
	}
	static async imports() {
		return CloseVectorHNSWWeb.imports();
	}
};

//#endregion
export { CloseVectorWeb, web_exports };
//# sourceMappingURL=web.js.map