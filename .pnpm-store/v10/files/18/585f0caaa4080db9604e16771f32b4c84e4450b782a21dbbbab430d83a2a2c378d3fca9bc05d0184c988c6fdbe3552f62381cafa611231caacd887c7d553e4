const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_document_loaders_base = require_rolldown_runtime.__toESM(require("@langchain/core/document_loaders/base"));

//#region src/document_loaders/fs/epub.ts
var epub_exports = {};
require_rolldown_runtime.__export(epub_exports, { EPubLoader: () => EPubLoader });
/**
* A class that extends the `BaseDocumentLoader` class. It represents a
* document loader that loads documents from EPUB files.
*/
var EPubLoader = class extends __langchain_core_document_loaders_base.BaseDocumentLoader {
	splitChapters;
	constructor(filePath, { splitChapters = true } = {}) {
		super();
		this.filePath = filePath;
		this.splitChapters = splitChapters;
	}
	/**
	* A protected method that takes an EPUB object as a parameter and returns
	* a promise that resolves to an array of objects representing the content
	* and metadata of each chapter.
	* @param epub The EPUB object to parse.
	* @returns A promise that resolves to an array of objects representing the content and metadata of each chapter.
	*/
	async parse(epub) {
		const { htmlToText } = await HtmlToTextImport();
		const chapters = await Promise.all(epub.flow.map(async (chapter) => {
			if (!chapter.id) return null;
			const html = await epub.getChapterRawAsync(chapter.id);
			if (!html) return null;
			return {
				html,
				title: chapter.title
			};
		}));
		return chapters.filter(Boolean).map((chapter) => ({
			pageContent: htmlToText(chapter.html),
			metadata: { ...chapter.title && { chapter: chapter.title } }
		}));
	}
	/**
	* A method that loads the EPUB file and returns a promise that resolves
	* to an array of `Document` instances.
	* @returns A promise that resolves to an array of `Document` instances.
	*/
	async load() {
		const { EPub } = await EpubImport();
		const epub = await EPub.createAsync(this.filePath);
		const parsed = await this.parse(epub);
		const metadata = { source: this.filePath };
		if (parsed.length === 0) return [];
		return this.splitChapters ? parsed.map((chapter) => new __langchain_core_documents.Document({
			pageContent: chapter.pageContent,
			metadata: {
				...metadata,
				...chapter.metadata
			}
		})) : [new __langchain_core_documents.Document({
			pageContent: parsed.map((chapter) => chapter.pageContent).join("\n\n"),
			metadata
		})];
	}
};
async function EpubImport() {
	const { EPub } = await import("epub2").catch(() => {
		throw new Error("Failed to load epub2. Please install it with eg. `npm install epub2`.");
	});
	return { EPub };
}
async function HtmlToTextImport() {
	const { htmlToText } = await import("html-to-text").catch(() => {
		throw new Error("Failed to load html-to-text. Please install it with eg. `npm install html-to-text`.");
	});
	return { htmlToText };
}

//#endregion
exports.EPubLoader = EPubLoader;
Object.defineProperty(exports, 'epub_exports', {
  enumerable: true,
  get: function () {
    return epub_exports;
  }
});
//# sourceMappingURL=epub.cjs.map