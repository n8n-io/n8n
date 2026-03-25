import { __export } from "../../_virtual/rolldown_runtime.js";
import { UnstructuredLoader } from "../fs/unstructured.js";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import * as fsDefault from "node:fs";
import * as path$1 from "node:path";
import * as os$1 from "node:os";
import { Storage } from "@google-cloud/storage";

//#region src/document_loaders/web/google_cloud_storage.ts
var google_cloud_storage_exports = {};
__export(google_cloud_storage_exports, { GoogleCloudStorageLoader: () => GoogleCloudStorageLoader });
/**
* A class that extends the BaseDocumentLoader class. It represents a
* document loader for loading files from a google cloud storage bucket.
* @example
* ```typescript
* const loader = new GoogleCloudStorageLoader({
*   bucket: "<my-bucket-name>",
*   file: "<file-path>",
*   storageOptions: {
*     keyFilename: "<key-file-name-path>"
*   }
*   unstructuredConfig: {
*     apiUrl: "<unstructured-API-URL>",
*     apiKey: "<unstructured-API-key>"
*   }
* });
* const docs = await loader.load();
* ```
*/
var GoogleCloudStorageLoader = class extends BaseDocumentLoader {
	bucket;
	file;
	storageOptions;
	_fs;
	unstructuredLoaderOptions;
	constructor({ fs = fsDefault, file, bucket, unstructuredLoaderOptions, storageOptions }) {
		super();
		this._fs = fs;
		this.bucket = bucket;
		this.file = file;
		this.unstructuredLoaderOptions = unstructuredLoaderOptions;
		this.storageOptions = storageOptions;
	}
	async load() {
		const tempDir = this._fs.mkdtempSync(path$1.join(os$1.tmpdir(), "googlecloudstoragefileloader-"));
		const filePath = path$1.join(tempDir, this.file);
		try {
			const storage = new Storage(this.storageOptions);
			const bucket = storage.bucket(this.bucket);
			const [buffer] = await bucket.file(this.file).download();
			this._fs.mkdirSync(path$1.dirname(filePath), { recursive: true });
			this._fs.writeFileSync(filePath, buffer);
		} catch (e) {
			throw new Error(`Failed to download file ${this.file} from google cloud storage bucket ${this.bucket}: ${e.message}`);
		}
		try {
			const unstructuredLoader = new UnstructuredLoader(filePath, this.unstructuredLoaderOptions);
			const docs = await unstructuredLoader.load();
			return docs;
		} catch {
			throw new Error(`Failed to load file ${filePath} using unstructured loader.`);
		}
	}
};

//#endregion
export { GoogleCloudStorageLoader, google_cloud_storage_exports };
//# sourceMappingURL=google_cloud_storage.js.map