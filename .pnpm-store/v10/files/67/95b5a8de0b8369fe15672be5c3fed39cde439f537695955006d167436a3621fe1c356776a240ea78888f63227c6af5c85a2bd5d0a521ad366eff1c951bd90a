import { __export } from "../_virtual/rolldown_runtime.js";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/ensemble.ts
var ensemble_exports = {};
__export(ensemble_exports, { EnsembleRetriever: () => EnsembleRetriever });
/**
* Ensemble retriever that aggregates and orders the results of
* multiple retrievers by using weighted Reciprocal Rank Fusion.
*/
var EnsembleRetriever = class extends BaseRetriever {
	static lc_name() {
		return "EnsembleRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"ensemble_retriever"
	];
	retrievers;
	weights;
	c = 60;
	constructor(args) {
		super(args);
		this.retrievers = args.retrievers;
		this.weights = args.weights || new Array(args.retrievers.length).fill(1 / args.retrievers.length);
		this.c = args.c || 60;
	}
	async _getRelevantDocuments(query, runManager) {
		return this._rankFusion(query, runManager);
	}
	async _rankFusion(query, runManager) {
		const retrieverDocs = await Promise.all(this.retrievers.map((retriever, i) => retriever.invoke(query, { callbacks: runManager?.getChild(`retriever_${i + 1}`) })));
		const fusedDocs = await this._weightedReciprocalRank(retrieverDocs);
		return fusedDocs;
	}
	async _weightedReciprocalRank(docList) {
		if (docList.length !== this.weights.length) throw new Error("Number of retrieved document lists must be equal to the number of weights.");
		const rrfScoreDict = docList.reduce((rffScore, retrieverDoc, idx) => {
			let rank = 1;
			const weight = this.weights[idx];
			while (rank <= retrieverDoc.length) {
				const { pageContent } = retrieverDoc[rank - 1];
				if (!rffScore[pageContent]) rffScore[pageContent] = 0;
				rffScore[pageContent] += weight / (rank + this.c);
				rank += 1;
			}
			return rffScore;
		}, {});
		const uniqueDocs = this._uniqueUnion(docList.flat());
		const sortedDocs = Array.from(uniqueDocs).sort((a, b) => rrfScoreDict[b.pageContent] - rrfScoreDict[a.pageContent]);
		return sortedDocs;
	}
	_uniqueUnion(documents) {
		const documentSet = /* @__PURE__ */ new Set();
		const result = [];
		for (const doc of documents) {
			const key = doc.pageContent;
			if (!documentSet.has(key)) {
				documentSet.add(key);
				result.push(doc);
			}
		}
		return result;
	}
};

//#endregion
export { EnsembleRetriever, ensemble_exports };
//# sourceMappingURL=ensemble.js.map