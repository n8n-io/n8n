export type SoftmaxModel = {
	weights: number[][];
	bias: number[];
	scale: number;
	center?: number[];
};

export type Prediction = {
	index: number;
	confidence: number;
	probabilities: number[];
};

export type TrainOptions = {
	epochs?: number;
	learningRate?: number;
	l2?: number;
};

const LOGIT_SCALE = 10;

function softmax(logits: Float64Array): Float64Array {
	let max = -Infinity;
	for (const value of logits) max = Math.max(max, value);
	const result = new Float64Array(logits.length);
	let sum = 0;
	for (let c = 0; c < logits.length; c++) {
		result[c] = Math.exp(logits[c] - max);
		sum += result[c];
	}
	for (let c = 0; c < logits.length; c++) result[c] /= sum;
	return result;
}

function computeLogits(
	weights: Float64Array[] | number[][],
	bias: ArrayLike<number>,
	vector: ArrayLike<number>,
	scale: number,
): Float64Array {
	const logits = new Float64Array(bias.length);
	for (let c = 0; c < bias.length; c++) {
		const row = weights[c];
		let sum = 0;
		for (let d = 0; d < vector.length; d++) sum += row[d] * vector[d];
		logits[c] = bias[c] + sum * scale;
	}
	return logits;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

const WORK_BUDGET = 6e8;

function defaultEpochs(exampleCount: number, classCount: number, dimensions: number) {
	const epochs = WORK_BUDGET / (exampleCount * classCount * dimensions);
	return Math.round(Math.min(1000, Math.max(200, epochs)));
}

function meanVector(vectors: number[][]): number[] {
	const mean = new Array<number>(vectors[0].length).fill(0);
	for (const vector of vectors) for (let d = 0; d < mean.length; d++) mean[d] += vector[d];
	return mean.map((sum) => sum / vectors.length);
}

const subtract = (vector: number[], center: number[] | undefined) =>
	center ? vector.map((value, d) => value - center[d]) : vector;

export function trainSoftmax(
	rawVectors: number[][],
	labels: number[],
	classCount: number,
	{
		epochs = defaultEpochs(rawVectors.length, classCount, rawVectors[0].length),
		learningRate = 2,
		l2 = 1e-3,
	}: TrainOptions = {},
): SoftmaxModel {
	const center = meanVector(rawVectors);
	const vectors = rawVectors.map((vector) => subtract(vector, center));
	const dimensions = vectors[0].length;
	const weights = Array.from({ length: classCount }, () => new Float64Array(dimensions));
	const bias = new Float64Array(classCount);
	const scale = LOGIT_SCALE;

	for (let epoch = 0; epoch < epochs; epoch++) {
		const weightGradients = Array.from({ length: classCount }, () => new Float64Array(dimensions));
		const biasGradients = new Float64Array(classCount);

		for (let n = 0; n < vectors.length; n++) {
			const vector = vectors[n];
			const probabilities = softmax(computeLogits(weights, bias, vector, scale));
			for (let c = 0; c < classCount; c++) {
				const error = probabilities[c] - (labels[n] === c ? 1 : 0);
				biasGradients[c] += error;
				const gradient = weightGradients[c];
				const scaledError = error * scale;
				for (let d = 0; d < dimensions; d++) gradient[d] += scaledError * vector[d];
			}
		}

		for (let c = 0; c < classCount; c++) {
			bias[c] -= (learningRate * biasGradients[c]) / vectors.length;
			const row = weights[c];
			const gradient = weightGradients[c];
			for (let d = 0; d < dimensions; d++) {
				row[d] -= learningRate * (gradient[d] / vectors.length + l2 * row[d]);
			}
		}
	}

	return {
		weights: weights.map((row) => Array.from(row, round)),
		bias: Array.from(bias, round),
		scale,
		center: center.map(round),
	};
}

export function predict(model: SoftmaxModel, vector: number[]): Prediction {
	const probabilities = Array.from(
		softmax(computeLogits(model.weights, model.bias, subtract(vector, model.center), model.scale)),
	);
	let index = 0;
	for (let c = 1; c < probabilities.length; c++) {
		if (probabilities[c] > probabilities[index]) index = c;
	}
	return { index, confidence: probabilities[index], probabilities };
}
