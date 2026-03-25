import { PairwiseStringEvaluator, StringEvaluator } from "../base.js";
import { cosine } from "../../util/ml-distance/similarities.js";
import { chebyshev, manhattan } from "../../util/ml-distance/distances.js";
import { euclidean } from "../../util/ml-distance-euclidean/euclidean.js";

//#region src/evaluation/embedding_distance/base.ts
/**
* Get the distance function for the given distance type.
* @param distance The distance type.
* @return The distance function.
*/
function getDistanceCalculationFunction(distanceType) {
	const distanceFunctions = {
		cosine: (X, Y) => 1 - cosine(X, Y),
		euclidean,
		manhattan,
		chebyshev
	};
	return distanceFunctions[distanceType];
}
/**
* Compute the score based on the distance metric.
* @param vectors The input vectors.
* @param distanceMetric The distance metric.
* @return The computed score.
*/
function computeEvaluationScore(vectors, distanceMetric) {
	const metricFunction = getDistanceCalculationFunction(distanceMetric);
	return metricFunction(vectors[0], vectors[1]);
}
/**
* Use embedding distances to score semantic difference between
* a prediction and reference.
*/
var EmbeddingDistanceEvalChain = class extends StringEvaluator {
	requiresReference = true;
	requiresInput = false;
	outputKey = "score";
	embedding;
	distanceMetric = "cosine";
	constructor(fields) {
		super();
		this.embedding = fields?.embedding;
		this.distanceMetric = fields?.distanceMetric || "cosine";
	}
	_chainType() {
		return `embedding_${this.distanceMetric}_distance`;
	}
	async _evaluateStrings(args, config) {
		const result = await this.call(args, config);
		return { [this.outputKey]: result[this.outputKey] };
	}
	get inputKeys() {
		return ["reference", "prediction"];
	}
	get outputKeys() {
		return [this.outputKey];
	}
	async _call(values, _runManager) {
		const { prediction, reference } = values;
		if (!this.embedding) throw new Error("Embedding is undefined");
		const vectors = await this.embedding.embedDocuments([prediction, reference]);
		const score = computeEvaluationScore(vectors, this.distanceMetric);
		return { [this.outputKey]: score };
	}
};
/**
* Use embedding distances to score semantic difference between two predictions.
*/
var PairwiseEmbeddingDistanceEvalChain = class extends PairwiseStringEvaluator {
	requiresReference = false;
	requiresInput = false;
	outputKey = "score";
	embedding;
	distanceMetric = "cosine";
	constructor(fields) {
		super();
		this.embedding = fields?.embedding;
		this.distanceMetric = fields?.distanceMetric || "cosine";
	}
	_chainType() {
		return `pairwise_embedding_${this.distanceMetric}_distance`;
	}
	async _evaluateStringPairs(args, config) {
		const result = await this.call(args, config);
		return { [this.outputKey]: result[this.outputKey] };
	}
	get inputKeys() {
		return ["prediction", "predictionB"];
	}
	get outputKeys() {
		return [this.outputKey];
	}
	async _call(values, _runManager) {
		const { prediction, predictionB } = values;
		if (!this.embedding) throw new Error("Embedding is undefined");
		const vectors = await this.embedding.embedDocuments([prediction, predictionB]);
		const score = computeEvaluationScore(vectors, this.distanceMetric);
		return { [this.outputKey]: score };
	}
};

//#endregion
export { EmbeddingDistanceEvalChain, PairwiseEmbeddingDistanceEvalChain, computeEvaluationScore, getDistanceCalculationFunction };
//# sourceMappingURL=base.js.map