const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/web/figma.ts
var figma_exports = {};
require_rolldown_runtime.__export(figma_exports, { FigmaFileLoader: () => FigmaFileLoader });
/**
* Class representing a document loader for loading Figma files. It
* extends the BaseDocumentLoader and implements the FigmaLoaderParams
* interface. The constructor takes a config object as a parameter, which
* contains the access token, an array of node IDs, and the file key.
* @example
* ```typescript
* const loader = new FigmaFileLoader({
*   accessToken: "FIGMA_ACCESS_TOKEN",
*   nodeIds: ["id1", "id2", "id3"],
*   fileKey: "key",
* });
* const docs = await loader.load();
* ```
*/
var FigmaFileLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	accessToken;
	nodeIds;
	fileKey;
	headers = {};
	constructor({ accessToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("FIGMA_ACCESS_TOKEN"), nodeIds, fileKey }) {
		super();
		this.accessToken = accessToken;
		this.nodeIds = nodeIds;
		this.fileKey = fileKey;
		if (this.accessToken) this.headers = { "x-figma-token": this.accessToken };
	}
	/**
	* Constructs the URL for the Figma API call.
	* @returns The constructed URL as a string.
	*/
	constructFigmaApiURL() {
		return `https://api.figma.com/v1/files/${this.fileKey}/nodes?ids=${this.nodeIds.join(",")}`;
	}
	/**
	* Fetches the Figma file using the Figma API and returns it as a
	* FigmaFile object.
	* @returns A Promise that resolves to a FigmaFile object.
	*/
	async getFigmaFile() {
		const url = this.constructFigmaApiURL();
		const response = await fetch(url, { headers: this.headers });
		const data = await response.json();
		if (!response.ok) throw new Error(`Unable to get figma file: ${response.status} ${JSON.stringify(data)}`);
		if (!data) throw new Error("Unable to get file");
		return data;
	}
	/**
	* Fetches the Figma file using the Figma API, creates a Document instance
	* with the JSON representation of the file as the page content and the
	* API URL as the metadata, and returns it.
	* @returns A Promise that resolves to an array of Document instances.
	*/
	async load() {
		const data = await this.getFigmaFile();
		const text = JSON.stringify(data);
		const metadata = { source: this.constructFigmaApiURL() };
		return [new __langchain_core_documents.Document({
			pageContent: text,
			metadata
		})];
	}
};

//#endregion
exports.FigmaFileLoader = FigmaFileLoader;
Object.defineProperty(exports, 'figma_exports', {
  enumerable: true,
  get: function () {
    return figma_exports;
  }
});
//# sourceMappingURL=figma.cjs.map