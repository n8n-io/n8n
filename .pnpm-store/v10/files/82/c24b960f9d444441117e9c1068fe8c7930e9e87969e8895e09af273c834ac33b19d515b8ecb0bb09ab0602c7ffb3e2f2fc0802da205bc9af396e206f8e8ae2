import { __export } from "../../_virtual/rolldown_runtime.js";
import { UnstructuredLoader } from "../fs/unstructured.js";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import * as fsDefault from "node:fs";
import * as path$1 from "node:path";
import * as os$1 from "node:os";
import { Readable } from "node:stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

//#region src/document_loaders/web/s3.ts
var s3_exports = {};
__export(s3_exports, { S3Loader: () => S3Loader });
/**
* A class that extends the BaseDocumentLoader class. It represents a
* document loader for loading files from an S3 bucket.
* @example
* ```typescript
* const loader = new S3Loader({
*   bucket: "my-document-bucket-123",
*   key: "AccountingOverview.pdf",
*   s3Config: {
*     region: "us-east-1",
*     credentials: {
*       accessKeyId: "<YourAccessKeyId>",
*       secretAccessKey: "<YourSecretAccessKey>",
*     },
*   },
*   unstructuredAPIURL: "<YourUnstructuredAPIURL>",
*   unstructuredAPIKey: "<YourUnstructuredAPIKey>",
* });
* const docs = await loader.load();
* ```
*/
var S3Loader = class extends BaseDocumentLoader {
	bucket;
	key;
	unstructuredAPIURL;
	unstructuredAPIKey;
	s3Config;
	_fs;
	_UnstructuredLoader;
	constructor({ bucket, key, unstructuredAPIURL, unstructuredAPIKey, s3Config = {}, fs = fsDefault, UnstructuredLoader: UnstructuredLoader$1 = UnstructuredLoader }) {
		super();
		this.bucket = bucket;
		this.key = key;
		this.unstructuredAPIURL = unstructuredAPIURL;
		this.unstructuredAPIKey = unstructuredAPIKey;
		this.s3Config = s3Config;
		this._fs = fs;
		this._UnstructuredLoader = UnstructuredLoader$1;
	}
	/**
	* Loads the file from the S3 bucket, saves it to a temporary directory,
	* and then uses the UnstructuredLoader to load the file as a document.
	* @returns An array of Document objects representing the loaded documents.
	*/
	async load() {
		const tempDir = this._fs.mkdtempSync(path$1.join(os$1.tmpdir(), "s3fileloader-"));
		const filePath = path$1.join(tempDir, this.key);
		try {
			const s3Client = new S3Client(this.s3Config);
			const getObjectCommand = new GetObjectCommand({
				Bucket: this.bucket,
				Key: this.key
			});
			const response = await s3Client.send(getObjectCommand);
			const objectData = await new Promise((resolve, reject) => {
				const chunks = [];
				if (response.Body instanceof Readable) {
					response.Body.on("data", (chunk) => chunks.push(chunk));
					response.Body.on("end", () => resolve(Buffer.concat(chunks)));
					response.Body.on("error", reject);
				} else reject(/* @__PURE__ */ new Error("Response body is not a readable stream."));
			});
			this._fs.mkdirSync(path$1.dirname(filePath), { recursive: true });
			this._fs.writeFileSync(filePath, objectData);
		} catch (e) {
			throw new Error(`Failed to download file ${this.key} from S3 bucket ${this.bucket}: ${e.message}`);
		}
		try {
			const options = {
				apiUrl: this.unstructuredAPIURL,
				apiKey: this.unstructuredAPIKey
			};
			const unstructuredLoader = new this._UnstructuredLoader(filePath, options);
			const docs = await unstructuredLoader.load();
			return docs;
		} catch {
			throw new Error(`Failed to load file ${filePath} using unstructured loader.`);
		}
	}
};

//#endregion
export { S3Loader, s3_exports };
//# sourceMappingURL=s3.js.map