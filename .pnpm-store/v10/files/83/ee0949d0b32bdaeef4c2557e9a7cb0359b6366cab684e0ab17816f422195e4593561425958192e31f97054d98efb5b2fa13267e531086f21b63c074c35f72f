const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_document_loaders_fs_unstructured = require('../fs/unstructured.cjs');
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));
const __azure_storage_blob = require_rolldown_runtime.__toESM(require("@azure/storage-blob"));
const node_fs = require_rolldown_runtime.__toESM(require("node:fs"));
const node_path = require_rolldown_runtime.__toESM(require("node:path"));
const node_os = require_rolldown_runtime.__toESM(require("node:os"));

//#region src/document_loaders/web/azure_blob_storage_file.ts
var azure_blob_storage_file_exports = {};
require_rolldown_runtime.__export(azure_blob_storage_file_exports, { AzureBlobStorageFileLoader: () => AzureBlobStorageFileLoader });
/**
* Class representing a document loader that loads a specific file from
* Azure Blob Storage. It extends the BaseDocumentLoader class and
* implements the DocumentLoader interface.
* @example
* ```typescript
* const loader = new AzureBlobStorageFileLoader({
*   azureConfig: {
*     connectionString: "{connectionString}",
*     container: "{containerName}",
*     blobName: "{blobName}",
*   },
* });
* const docs = await loader.load();
* ```
*/
var AzureBlobStorageFileLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	get lc_secrets() {
		return { connectionString: "AZURE_BLOB_CONNECTION_STRING" };
	}
	connectionString;
	container;
	blobName;
	unstructuredConfig;
	constructor({ azureConfig, unstructuredConfig }) {
		super();
		this.connectionString = azureConfig.connectionString;
		this.container = azureConfig.container;
		this.blobName = azureConfig.blobName;
		this.unstructuredConfig = unstructuredConfig;
	}
	/**
	* Method to load a specific file from Azure Blob Storage. It creates a
	* temporary directory, constructs the file path, downloads the file, and
	* loads the documents using the UnstructuredLoader. The loaded documents
	* are returned, and the temporary directory is deleted.
	* @returns An array of documents loaded from the file in Azure Blob Storage.
	*/
	async load() {
		const tempDir = node_fs.mkdtempSync(node_path.join(node_os.tmpdir(), "azureblobfileloader-"));
		const filePath = node_path.join(tempDir, this.blobName);
		try {
			const blobServiceClient = __azure_storage_blob.BlobServiceClient.fromConnectionString(this.connectionString, { userAgentOptions: { userAgentPrefix: "langchainjs-blob-storage-file" } });
			const containerClient = blobServiceClient.getContainerClient(this.container);
			const blobClient = containerClient.getBlobClient(this.blobName);
			node_fs.mkdirSync(node_path.dirname(filePath), { recursive: true });
			await blobClient.downloadToFile(filePath);
		} catch (e) {
			throw new Error(`Failed to download file ${this.blobName} from Azure Blob Storage container ${this.container}: ${e.message}`);
		}
		try {
			const unstructuredLoader = new require_document_loaders_fs_unstructured.UnstructuredLoader(filePath, this.unstructuredConfig);
			const docs = await unstructuredLoader.load();
			return docs;
		} catch {
			throw new Error(`Failed to load file ${filePath} using unstructured loader.`);
		} finally {
			node_fs.rmSync(node_path.dirname(filePath), {
				recursive: true,
				force: true
			});
		}
	}
};

//#endregion
exports.AzureBlobStorageFileLoader = AzureBlobStorageFileLoader;
Object.defineProperty(exports, 'azure_blob_storage_file_exports', {
  enumerable: true,
  get: function () {
    return azure_blob_storage_file_exports;
  }
});
//# sourceMappingURL=azure_blob_storage_file.cjs.map