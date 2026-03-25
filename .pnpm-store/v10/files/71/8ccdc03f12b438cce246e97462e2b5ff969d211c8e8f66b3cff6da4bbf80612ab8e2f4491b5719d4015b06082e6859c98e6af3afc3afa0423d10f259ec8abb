const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/web/pdf.ts
var pdf_exports = {};
require_rolldown_runtime.__export(pdf_exports, { WebPDFLoader: () => WebPDFLoader });
/**
* A document loader for loading data from PDFs.
* @example
* ```typescript
* const loader = new WebPDFLoader(new Blob());
* const docs = await loader.load();
* console.log({ docs });
* ```
*/
var WebPDFLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	blob;
	splitPages = true;
	pdfjs;
	parsedItemSeparator;
	constructor(blob, { splitPages = true, pdfjs = PDFLoaderImports, parsedItemSeparator = "" } = {}) {
		super();
		this.blob = blob;
		this.splitPages = splitPages ?? this.splitPages;
		this.pdfjs = pdfjs;
		this.parsedItemSeparator = parsedItemSeparator;
	}
	/**
	* Loads the contents of the PDF as documents.
	* @returns An array of Documents representing the retrieved data.
	*/
	async load() {
		const { getDocument, version } = await this.pdfjs();
		const parsedPdf = await getDocument({
			data: new Uint8Array(await this.blob.arrayBuffer()),
			useWorkerFetch: false,
			isEvalSupported: false,
			useSystemFonts: true
		}).promise;
		const meta = await parsedPdf.getMetadata().catch(() => null);
		const documents = [];
		for (let i = 1; i <= parsedPdf.numPages; i += 1) {
			const page = await parsedPdf.getPage(i);
			const content = await page.getTextContent();
			if (content.items.length === 0) continue;
			let lastY;
			const textItems = [];
			for (const item of content.items) if ("str" in item) {
				if (lastY === item.transform[5] || !lastY) textItems.push(item.str);
				else textItems.push(`\n${item.str}`);
				lastY = item.transform[5];
			}
			const text = textItems.join(this.parsedItemSeparator);
			documents.push(new __langchain_core_documents.Document({
				pageContent: text,
				metadata: {
					pdf: {
						version,
						info: meta?.info,
						metadata: meta?.metadata,
						totalPages: parsedPdf.numPages
					},
					loc: { pageNumber: i }
				}
			}));
		}
		if (this.splitPages) return documents;
		if (documents.length === 0) return [];
		return [new __langchain_core_documents.Document({
			pageContent: documents.map((doc) => doc.pageContent).join("\n\n"),
			metadata: { pdf: {
				version,
				info: meta?.info,
				metadata: meta?.metadata,
				totalPages: parsedPdf.numPages
			} }
		})];
	}
};
async function PDFLoaderImports() {
	try {
		const { default: mod } = await import("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js");
		const { getDocument, version } = mod;
		return {
			getDocument,
			version
		};
	} catch (e) {
		console.error(e);
		throw new Error("Failed to load pdf-parse. This loader currently supports pdf-parse v1 only. Please install v1, e.g. `npm install pdf-parse@^1` (v2 is not yet supported).");
	}
}

//#endregion
exports.WebPDFLoader = WebPDFLoader;
Object.defineProperty(exports, 'pdf_exports', {
  enumerable: true,
  get: function () {
    return pdf_exports;
  }
});
//# sourceMappingURL=pdf.cjs.map