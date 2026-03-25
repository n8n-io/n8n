import { Document } from "@langchain/core/documents";

//#region src/chains/combine_documents/reduce.d.ts

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
declare function splitListOfDocs(docs: Document[],
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lengthFunc: (...args: any[]) => any, tokenMax: number): Document[][];
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
declare function collapseDocs(docs: Document[], combineDocumentFunc: (docs: Document[]) => Promise<string>): Promise<Document>;
//#endregion
export { collapseDocs, splitListOfDocs };
//# sourceMappingURL=reduce.d.ts.map