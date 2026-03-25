
//#region src/utils/@furkantoprak/bm25/BM25.ts
/**
* Adapted from
* https://github.com/FurkanToprak/OkapiBM25
*
* Inlined due to CJS import issues.
*/
/** Gets word count. */
const getWordCount = (corpus) => {
	return ((corpus || "").match(/\w+/g) || []).length;
};
/** Number of occurences of a word in a string. */
const getTermFrequency = (term, corpus) => {
	const escaped = (term || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return ((corpus || "").match(new RegExp(escaped, "g")) || []).length;
};
/** Inverse document frequency. */
const getIDF = (term, documents) => {
	const relevantDocuments = documents.filter((document) => document.text.includes(term)).length;
	return Math.log((documents.length - relevantDocuments + .5) / (relevantDocuments + .5) + 1);
};
/** Implementation of Okapi BM25 algorithm.
*  @param documents: Collection of documents with text content and associated data.
*  @param keywords: query terms.
*  @param constants: Contains free parameters k1 and b. b=0.75 and k1=1.2 by default.
*  @param sorter: A function that allows you to sort results by a given rule. If not provided, returns results in the original document order.
*/
function BM25(documents, keywords, constants, sorter) {
	const b = constants && constants.b ? constants.b : .75;
	const k1 = constants && constants.k1 ? constants.k1 : 1.2;
	const documentLengths = documents.map((document) => getWordCount(document.text));
	const averageDocumentLength = documentLengths.reduce((a, b$1) => a + b$1, 0) / documents.length;
	const idfByKeyword = keywords.reduce((obj, keyword) => {
		obj.set(keyword, getIDF(keyword, documents));
		return obj;
	}, /* @__PURE__ */ new Map());
	const scoredDocs = documents.map(({ text, document }, index) => {
		const score = keywords.map((keyword) => {
			const inverseDocumentFrequency = idfByKeyword.get(keyword);
			if (inverseDocumentFrequency === void 0) throw new Error("Missing keyword.");
			const termFrequency = getTermFrequency(keyword, text);
			const documentLength = documentLengths[index];
			return inverseDocumentFrequency * (termFrequency * (k1 + 1)) / (termFrequency + k1 * (1 - b + b * documentLength / averageDocumentLength));
		}).reduce((a, b$1) => a + b$1, 0);
		return {
			score,
			document
		};
	});
	if (sorter) return scoredDocs.sort(sorter);
	return scoredDocs;
}

//#endregion
exports.BM25 = BM25;
//# sourceMappingURL=BM25.cjs.map