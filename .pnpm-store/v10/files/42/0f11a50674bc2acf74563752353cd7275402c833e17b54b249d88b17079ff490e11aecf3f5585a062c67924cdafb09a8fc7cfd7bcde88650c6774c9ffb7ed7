import { __export } from "../../_virtual/rolldown_runtime.js";

//#region src/chains/combine_documents/reduce.ts
var reduce_exports = {};
__export(reduce_exports, {
	collapseDocs: () => collapseDocs,
	splitListOfDocs: () => splitListOfDocs
});
/**
* Splits a list of documents into sublists based on a maximum token limit.
*
* @param {Document[]} docs - The list of documents to be split.
* @param {Function} lengthFunc - A function that calculates the number of tokens in a list of documents.
* @param {number} tokenMax - The maximum number of tokens allowed in a sublist.
*
* @returns {Document[][]} - A list of document sublists, each sublist contains documents whose total number of tokens does not exceed the tokenMax.
*
* @throws {Error} - Throws an error if a single document has more tokens than the tokenMax.
*/
function splitListOfDocs(docs, lengthFunc, tokenMax) {
	const newResultDocList = [];
	let subResultDocs = [];
	for (const doc of docs) {
		subResultDocs.push(doc);
		const numTokens = lengthFunc(subResultDocs);
		if (numTokens > tokenMax) {
			if (subResultDocs.length === 1) throw new Error("A single document was longer than the context length, we cannot handle this.");
			newResultDocList.push(subResultDocs.slice(0, -1));
			subResultDocs = subResultDocs.slice(-1);
		}
	}
	newResultDocList.push(subResultDocs);
	return newResultDocList;
}
/**
* Collapses a list of documents into a single document.
*
* This function takes a list of documents and a function to combine the content of these documents.
* It combines the content of the documents using the provided function and merges the metadata of all documents.
* If a metadata key is present in multiple documents, the values are concatenated with a comma separator.
*
* @param {Document[]} docs - The list of documents to be collapsed.
* @param {Function} combineDocumentFunc - A function that combines the content of a list of documents into a single string. This function should return a promise that resolves to the combined string.
*
* @returns {Promise<Document>} - A promise that resolves to a single document with combined content and merged metadata.
*
* @throws {Error} - Throws an error if the combineDocumentFunc does not return a promise or if the promise does not resolve to a string.
*/
async function collapseDocs(docs, combineDocumentFunc) {
	const result = await combineDocumentFunc(docs);
	return {
		pageContent: result,
		metadata: collapseDocsMetadata(docs)
	};
}
function collapseDocsMetadata(docs) {
	const combinedMetadata = {};
	for (const key in docs[0].metadata) if (key in docs[0].metadata) combinedMetadata[key] = String(docs[0].metadata[key]);
	for (const doc of docs.slice(1)) for (const key in doc.metadata) if (key in combinedMetadata) combinedMetadata[key] += `, ${doc.metadata[key]}`;
	else combinedMetadata[key] = String(doc.metadata[key]);
	return combinedMetadata;
}

//#endregion
export { collapseDocs, reduce_exports, splitListOfDocs };
//# sourceMappingURL=reduce.js.map