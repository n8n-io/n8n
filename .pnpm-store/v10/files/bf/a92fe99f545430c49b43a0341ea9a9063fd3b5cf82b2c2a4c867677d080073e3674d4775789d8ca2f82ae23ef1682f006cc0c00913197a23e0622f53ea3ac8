const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));

//#region src/retrievers/score_threshold.ts
var score_threshold_exports = {};
require_rolldown_runtime.__export(score_threshold_exports, { ScoreThresholdRetriever: () => ScoreThresholdRetriever });
var ScoreThresholdRetriever = class extends __langchain_core_vectorstores.VectorStoreRetriever {
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
exports.ScoreThresholdRetriever = ScoreThresholdRetriever;
Object.defineProperty(exports, 'score_threshold_exports', {
  enumerable: true,
  get: function () {
    return score_threshold_exports;
  }
});
//# sourceMappingURL=score_threshold.cjs.map