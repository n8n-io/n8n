import { Runnable } from "../runnables/base.js";
//#region src/documents/transformers.ts
/**
* Abstract base class for document transformation systems.
*
* A document transformation system takes an array of Documents and returns an
* array of transformed Documents. These arrays do not necessarily have to have
* the same length.
*
* One example of this is a text splitter that splits a large document into
* many smaller documents.
*/
var BaseDocumentTransformer = class extends Runnable {
	lc_namespace = [
		"langchain_core",
		"documents",
		"transformers"
	];
	/**
	* Method to invoke the document transformation. This method calls the
	* transformDocuments method with the provided input.
	* @param input The input documents to be transformed.
	* @param _options Optional configuration object to customize the behavior of callbacks.
	* @returns A Promise that resolves to the transformed documents.
	*/
	invoke(input, _options) {
		return this.transformDocuments(input);
	}
};
/**
* Class for document transformers that return exactly one transformed document
* for each input document.
*/
var MappingDocumentTransformer = class extends BaseDocumentTransformer {
	async transformDocuments(documents) {
		const newDocuments = [];
		for (const document of documents) {
			const transformedDocument = await this._transformDocument(document);
			newDocuments.push(transformedDocument);
		}
		return newDocuments;
	}
};
//#endregion
export { BaseDocumentTransformer, MappingDocumentTransformer };

//# sourceMappingURL=transformers.js.map