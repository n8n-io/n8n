import { __export } from "../_virtual/rolldown_runtime.js";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";

//#region src/retrievers/score_threshold.ts
var score_threshold_exports = {};
__export(score_threshold_exports, { ScoreThresholdRetriever: () => ScoreThresholdRetriever });
var ScoreThresholdRetriever = class extends VectorStoreRetriever {
	minSimilarityScore;
	kIncrement = 10;
	maxK = 100;
	constructor(input) {
		super(input);
		this.maxK = input.maxK ?? this.maxK;
		this.minSimilarityScore = input.minSimilarityScore ?? this.minSimilarityScore;
		this.kIncrement = input.kIncrement ?? this.kIncrement;
	}
	async invoke(query) {
		let currentK = 0;
		let filteredResults = [];
		do {
			currentK += this.kIncrement;
			const results = await this.vectorStore.similaritySearchWithScore(query, currentK, this.filter);
			filteredResults = results.filter(([, score]) => score >= this.minSimilarityScore);
		} while (filteredResults.length >= currentK && currentK < this.maxK);
		return filteredResults.map((documents) => documents[0]).slice(0, this.maxK);
	}
	static fromVectorStore(vectorStore, options) {
		return new this({
			...options,
			vectorStore
		});
	}
};

//#endregion
export { ScoreThresholdRetriever, score_threshold_exports };
//# sourceMappingURL=score_threshold.js.map