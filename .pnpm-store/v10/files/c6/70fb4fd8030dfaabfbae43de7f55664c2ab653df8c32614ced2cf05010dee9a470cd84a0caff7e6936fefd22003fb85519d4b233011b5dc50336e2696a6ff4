import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BufferLoader } from "@langchain/classic/document_loaders/fs/buffer";

//#region src/document_loaders/fs/pdf.ts
var pdf_exports = {};
__export(pdf_exports, { PDFLoader: () => PDFLoader });
/**
* A class that extends the `BufferLoader` class. It represents a document
* loader that loads documents from PDF files.
* @example
* ```typescript
* const loader = new PDFLoader("path/to/bitcoin.pdf");
* const docs = await loader.load();
* console.log({ docs });
* ```
*/
var PDFLoader = class extends BufferLoader {
	splitPages;
	pdfjs;
	parsedItemSeparator;
	constructor(filePathOrBlob, { splitPages = true, pdfjs = PDFLoaderImports, parsedItemSeparator = "" } = {}) {
		super(filePathOrBlob);
		this.splitPages = splitPages;
		this.pdfjs = pdfjs;
		this.parsedItemSeparator = parsedItemSeparator;
	}
	/**
	* A method that takes a `raw` buffer and `metadata` as parameters and
	* returns a promise that resolves to an array of `Document` instances. It
	* uses the `getDocument` function from the PDF.js library to load the PDF
	* from the buffer. It then iterates over each page of the PDF, retrieves
	* the text content using the `getTextContent` method, and joins the text
	* items to form the page content. It creates a new `Document` instance
	* for each page with the extracted text content and metadata, and adds it
	* to the `documents` array. If `splitPages` is `true`, it returns the
	* array of `Document` instances. Otherwise, if there are no documents, it
	* returns an empty array. Otherwise, it concatenates the page content of
	* all documents and creates a single `Document` instance with the
	* concatenated content.
	* @param raw The buffer to be parsed.
	* @param metadata The metadata of the document.
	* @returns A promise that resolves to an array of `Document` instances.
	*/
	async parse(raw, metadata) {
		const { getDocument, version } = await this.pdfjs();
		const pdf = await getDocument({
			data: new Uint8Array(raw.buffer),
			useWorkerFetch: false,
			isEvalSupported: false,
			useSystemFonts: true
		}).promise;
		const meta = await pdf.getMetadata().catch(() => null);
		const documents = [];
		for (let i = 1; i <= pdf.numPages; i += 1) {
			const page = await pdf.getPage(i);
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
			documents.push(new Document({
				pageContent: text,
				metadata: {
					...metadata,
					pdf: {
						version,
						info: meta?.info,
						metadata: meta?.metadata,
						totalPages: pdf.numPages
					},
					loc: { pageNumber: i }
				}
			}));
		}
		if (this.splitPages) return documents;
		if (documents.length === 0) return [];
		return [new Document({
			pageContent: documents.map((doc) => doc.pageContent).join("\n\n"),
			metadata: {
				...metadata,
				pdf: {
					version,
					info: meta?.info,
					metadata: meta?.metadata,
					totalPages: pdf.numPages
				}
			}
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
export { PDFLoader, pdf_exports };
//# sourceMappingURL=pdf.js.map