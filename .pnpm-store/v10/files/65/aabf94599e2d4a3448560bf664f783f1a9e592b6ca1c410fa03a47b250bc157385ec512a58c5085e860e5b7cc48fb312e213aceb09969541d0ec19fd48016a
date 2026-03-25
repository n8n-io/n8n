import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnv } from "@langchain/core/utils/env";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/fs/buffer.ts
var buffer_exports = {};
__export(buffer_exports, { BufferLoader: () => BufferLoader });
/**
* Abstract class that extends the `BaseDocumentLoader` class. It
* represents a document loader that loads documents from a buffer. The
* `load()` method is implemented to read the buffer contents and metadata
* based on the type of `filePathOrBlob`, and then calls the `parse()`
* method to parse the buffer and return the documents.
*/
var BufferLoader = class BufferLoader extends BaseDocumentLoader {
	constructor(filePathOrBlob) {
		super();
		this.filePathOrBlob = filePathOrBlob;
	}
	/**
	* Method that reads the buffer contents and metadata based on the type of
	* `filePathOrBlob`, and then calls the `parse()` method to parse the
	* buffer and return the documents.
	* @returns Promise that resolves with an array of `Document` objects.
	*/
	async load() {
		let buffer;
		let metadata;
		if (typeof this.filePathOrBlob === "string") {
			const { readFile } = await BufferLoader.imports();
			buffer = await readFile(this.filePathOrBlob);
			metadata = { source: this.filePathOrBlob };
		} else {
			buffer = await this.filePathOrBlob.arrayBuffer().then((ab) => Buffer.from(ab));
			metadata = {
				source: "blob",
				blobType: this.filePathOrBlob.type
			};
		}
		return this.parse(buffer, metadata);
	}
	/**
	* Static method that imports the `readFile` function from the
	* `fs/promises` module in Node.js. It is used to dynamically import the
	* function when needed. If the import fails, it throws an error
	* indicating that the `fs/promises` module is not available in the
	* current environment.
	* @returns Promise that resolves with an object containing the `readFile` function.
	*/
	static async imports() {
		try {
			const { readFile } = await import("node:fs/promises");
			return { readFile };
		} catch (e) {
			console.error(e);
			throw new Error(`Failed to load fs/promises. TextLoader available only on environment 'node'. It appears you are running environment '${getEnv()}'. See https://<link to docs> for alternatives.`);
		}
	}
};

//#endregion
export { BufferLoader, buffer_exports };
//# sourceMappingURL=buffer.js.map