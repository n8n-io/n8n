import { __export } from "../../_virtual/rolldown_runtime.js";
import { AzureBlobStorageFileLoader } from "./azure_blob_storage_file.js";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { BlobServiceClient } from "@azure/storage-blob";

//#region src/document_loaders/web/azure_blob_storage_container.ts
var azure_blob_storage_container_exports = {};
__export(azure_blob_storage_container_exports, { AzureBlobStorageContainerLoader: () => AzureBlobStorageContainerLoader });
/**
* Class representing a document loader that loads documents from an Azure
* Blob Storage container. It extends the BaseDocumentLoader class.
*/
var AzureBlobStorageContainerLoader = class extends BaseDocumentLoader {
	get lc_secrets() {
		return { connectionString: "AZURE_BLOB_CONNECTION_STRING" };
	}
	connectionString;
	container;
	unstructuredConfig;
	constructor({ azureConfig, unstructuredConfig }) {
		super();
		this.connectionString = azureConfig.connectionString;
		this.container = azureConfig.container;
		this.unstructuredConfig = unstructuredConfig;
	}
	/**
	* Method to load documents from an Azure Blob Storage container. It
	* creates a BlobServiceClient using the connection string, gets the
	* container client using the container name, and iterates over the blobs
	* in the container. For each blob, it creates an instance of
	* AzureBlobStorageFileLoader and loads the documents using the loader.
	* The loaded documents are concatenated to the docs array and returned.
	* @returns An array of loaded documents.
	*/
	async load() {
		const blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString, { userAgentOptions: { userAgentPrefix: "langchainjs-blob-storage-container" } });
		const containerClient = blobServiceClient.getContainerClient(this.container);
		let docs = [];
		for await (const blob of containerClient.listBlobsFlat()) {
			const loader = new AzureBlobStorageFileLoader({
				azureConfig: {
					connectionString: this.connectionString,
					container: this.container,
					blobName: blob.name
				},
				unstructuredConfig: this.unstructuredConfig
			});
			docs = docs.concat(await loader.load());
		}
		return docs;
	}
};

//#endregion
export { AzureBlobStorageContainerLoader, azure_blob_storage_container_exports };
//# sourceMappingURL=azure_blob_storage_container.js.map