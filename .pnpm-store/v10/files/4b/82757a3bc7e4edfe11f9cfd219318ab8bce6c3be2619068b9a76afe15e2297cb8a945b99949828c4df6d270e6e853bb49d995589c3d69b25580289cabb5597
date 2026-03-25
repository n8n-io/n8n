const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_classic_document_loaders_fs_buffer = require_rolldown_runtime.__toESM(require("@langchain/classic/document_loaders/fs/buffer"));
const officeparser = require_rolldown_runtime.__toESM(require("officeparser"));

//#region src/document_loaders/fs/pptx.ts
var pptx_exports = {};
require_rolldown_runtime.__export(pptx_exports, { PPTXLoader: () => PPTXLoader });
/**
* A class that extends the `BufferLoader` class. It represents a document
* loader that loads documents from PDF files.
*/
var PPTXLoader = class extends __langchain_classic_document_loaders_fs_buffer.BufferLoader {
	constructor(filePathOrBlob) {
		super(filePathOrBlob);
	}
	/**
	* A method that takes a `raw` buffer and `metadata` as parameters and
	* returns a promise that resolves to an array of `Document` instances. It
	* uses the `parseOfficeAsync` function from the `officeparser` module to extract
	* the raw text content from the buffer. If the extracted powerpoint content is
	* empty, it returns an empty array. Otherwise, it creates a new
	* `Document` instance with the extracted powerpoint content and the provided
	* metadata, and returns it as an array.
	* @param raw The buffer to be parsed.
	* @param metadata The metadata of the document.
	* @returns A promise that resolves to an array of `Document` instances.
	*/
	async parse(raw, metadata) {
		const pptx = await (0, officeparser.parseOfficeAsync)(raw, { outputErrorToConsole: true });
		if (!pptx) return [];
		return [new __langchain_core_documents.Document({
			pageContent: pptx,
			metadata
		})];
	}
};

//#endregion
exports.PPTXLoader = PPTXLoader;
Object.defineProperty(exports, 'pptx_exports', {
  enumerable: true,
  get: function () {
    return pptx_exports;
  }
});
//# sourceMappingURL=pptx.cjs.map