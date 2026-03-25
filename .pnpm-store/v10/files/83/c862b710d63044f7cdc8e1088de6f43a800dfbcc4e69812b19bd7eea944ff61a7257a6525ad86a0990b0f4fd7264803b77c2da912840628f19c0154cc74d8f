import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnv, getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { DirectoryLoader, UnknownHandling } from "@langchain/classic/document_loaders/fs/directory";

//#region src/document_loaders/fs/unstructured.ts
var unstructured_exports = {};
__export(unstructured_exports, {
	UNSTRUCTURED_API_FILETYPES: () => UNSTRUCTURED_API_FILETYPES,
	UnknownHandling: () => UnknownHandling,
	UnstructuredDirectoryLoader: () => UnstructuredDirectoryLoader,
	UnstructuredLoader: () => UnstructuredLoader
});
const UNSTRUCTURED_API_FILETYPES = [
	".txt",
	".text",
	".pdf",
	".docx",
	".doc",
	".jpg",
	".jpeg",
	".eml",
	".html",
	".htm",
	".md",
	".pptx",
	".ppt",
	".msg",
	".rtf",
	".xlsx",
	".xls",
	".odt",
	".epub"
];
/**
* A document loader that uses the Unstructured API to load unstructured
* documents. It supports both the new syntax with options object and the
* legacy syntax for backward compatibility. The load() method sends a
* partitioning request to the Unstructured API and retrieves the
* partitioned elements. It creates a Document instance for each element
* and returns an array of Document instances.
*
* It accepts either a filepath or an object containing a buffer and a filename
* as input.
*/
var UnstructuredLoader = class extends BaseDocumentLoader {
	filePath;
	buffer;
	fileName;
	apiUrl = "https://api.unstructured.io/general/v0/general";
	apiKey;
	strategy = "hi_res";
	encoding;
	ocrLanguages = [];
	coordinates;
	pdfInferTableStructure;
	xmlKeepTags;
	skipInferTableTypes;
	hiResModelName;
	includePageBreaks;
	chunkingStrategy;
	multiPageSections;
	combineUnderNChars;
	newAfterNChars;
	maxCharacters;
	extractImageBlockTypes;
	overlap;
	overlapAll;
	constructor(filepathOrBufferOptions, unstructuredOptions = {}) {
		super();
		const isLegacySyntax = typeof unstructuredOptions === "string";
		const isMemorySyntax = typeof filepathOrBufferOptions === "object";
		if (isMemorySyntax) {
			this.buffer = filepathOrBufferOptions.buffer;
			this.fileName = filepathOrBufferOptions.fileName;
		} else if (isLegacySyntax) {
			this.filePath = unstructuredOptions;
			this.apiUrl = filepathOrBufferOptions;
		} else this.filePath = filepathOrBufferOptions;
		if (!isLegacySyntax) {
			const options = unstructuredOptions;
			this.apiKey = options.apiKey ?? getEnvironmentVariable("UNSTRUCTURED_API_KEY");
			this.apiUrl = options.apiUrl ?? getEnvironmentVariable("UNSTRUCTURED_API_URL") ?? this.apiUrl;
			this.strategy = options.strategy ?? this.strategy;
			this.encoding = options.encoding;
			this.ocrLanguages = options.ocrLanguages ?? this.ocrLanguages;
			this.coordinates = options.coordinates;
			this.pdfInferTableStructure = options.pdfInferTableStructure;
			this.xmlKeepTags = options.xmlKeepTags;
			this.skipInferTableTypes = options.skipInferTableTypes;
			this.hiResModelName = options.hiResModelName;
			this.includePageBreaks = options.includePageBreaks;
			this.chunkingStrategy = options.chunkingStrategy;
			this.multiPageSections = options.multiPageSections;
			this.combineUnderNChars = options.combineUnderNChars;
			this.newAfterNChars = options.newAfterNChars;
			this.maxCharacters = options.maxCharacters;
			this.extractImageBlockTypes = options.extractImageBlockTypes;
			this.overlap = options.overlap;
			this.overlapAll = options.overlapAll ?? false;
		}
	}
	async _partition() {
		let buffer = this.buffer;
		let fileName = this.fileName;
		if (!buffer) {
			const { readFile, basename } = await this.imports();
			buffer = await readFile(this.filePath);
			fileName = basename(this.filePath);
		}
		const formData = new FormData();
		formData.append("files", new Blob([buffer]), fileName);
		formData.append("strategy", this.strategy);
		this.ocrLanguages.forEach((language) => {
			formData.append("ocr_languages", language);
		});
		if (this.encoding) formData.append("encoding", this.encoding);
		if (this.coordinates === true) formData.append("coordinates", "true");
		if (this.pdfInferTableStructure === true) formData.append("pdf_infer_table_structure", "true");
		if (this.xmlKeepTags === true) formData.append("xml_keep_tags", "true");
		if (this.skipInferTableTypes) formData.append("skip_infer_table_types", JSON.stringify(this.skipInferTableTypes));
		if (this.hiResModelName) formData.append("hi_res_model_name", this.hiResModelName);
		if (this.includePageBreaks) formData.append("include_page_breaks", "true");
		if (this.chunkingStrategy) formData.append("chunking_strategy", this.chunkingStrategy);
		if (this.multiPageSections !== void 0) formData.append("multipage_sections", this.multiPageSections ? "true" : "false");
		if (this.combineUnderNChars !== void 0) formData.append("combine_under_n_chars", String(this.combineUnderNChars));
		if (this.newAfterNChars !== void 0) formData.append("new_after_n_chars", String(this.newAfterNChars));
		if (this.maxCharacters !== void 0) formData.append("max_characters", String(this.maxCharacters));
		if (this.extractImageBlockTypes !== void 0) formData.append("extract_image_block_types", JSON.stringify(this.extractImageBlockTypes));
		if (this.overlap !== void 0) formData.append("overlap", String(this.overlap));
		if (this.overlapAll === true) formData.append("overlap_all", "true");
		const headers = { "UNSTRUCTURED-API-KEY": this.apiKey ?? "" };
		const response = await fetch(this.apiUrl, {
			method: "POST",
			body: formData,
			headers
		});
		if (!response.ok) throw new Error(`Failed to partition file ${this.filePath} with error ${response.status} and message ${await response.text()}`);
		const elements = await response.json();
		if (!Array.isArray(elements)) throw new Error(`Expected partitioning request to return an array, but got ${elements}`);
		return elements.filter((el) => typeof el.text === "string");
	}
	async load() {
		const elements = await this._partition();
		const documents = [];
		for (const element of elements) {
			const { metadata, text } = element;
			if (typeof text === "string" && text !== "") documents.push(new Document({
				pageContent: text,
				metadata: {
					...metadata,
					category: element.type
				}
			}));
		}
		return documents;
	}
	async imports() {
		try {
			const { readFile } = await import("node:fs/promises");
			const { basename } = await import("node:path");
			return {
				readFile,
				basename
			};
		} catch (e) {
			console.error(e);
			throw new Error(`Failed to load fs/promises. TextLoader available only on environment 'node'. It appears you are running environment '${getEnv()}'. See https://<link to docs> for alternatives.`);
		}
	}
};
/**
* A document loader that loads unstructured documents from a directory
* using the UnstructuredLoader. It creates a UnstructuredLoader instance
* for each supported file type and passes it to the DirectoryLoader
* constructor.
* @example
* ```typescript
* const loader = new UnstructuredDirectoryLoader("path/to/directory", {
*   apiKey: "MY_API_KEY",
* });
* const docs = await loader.load();
* ```
*/
var UnstructuredDirectoryLoader = class extends DirectoryLoader {
	constructor(directoryPathOrLegacyApiUrl, optionsOrLegacyDirectoryPath, legacyOptionRecursive = true, legacyOptionUnknown = UnknownHandling.Warn) {
		let directoryPath;
		let options;
		const isLegacySyntax = typeof optionsOrLegacyDirectoryPath === "string";
		if (isLegacySyntax) {
			directoryPath = optionsOrLegacyDirectoryPath;
			options = {
				apiUrl: directoryPathOrLegacyApiUrl,
				recursive: legacyOptionRecursive,
				unknown: legacyOptionUnknown
			};
		} else {
			directoryPath = directoryPathOrLegacyApiUrl;
			options = optionsOrLegacyDirectoryPath;
		}
		const loader = (p) => new UnstructuredLoader(p, options);
		const loaders = UNSTRUCTURED_API_FILETYPES.reduce((loadersObject, filetype) => {
			loadersObject[filetype] = loader;
			return loadersObject;
		}, {});
		super(directoryPath, loaders, options.recursive, options.unknown);
	}
};

//#endregion
export { UNSTRUCTURED_API_FILETYPES, UnknownHandling, UnstructuredDirectoryLoader, UnstructuredLoader, unstructured_exports };
//# sourceMappingURL=unstructured.js.map