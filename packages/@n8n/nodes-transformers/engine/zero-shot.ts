import type { Prediction } from './classifier';

export const SIMILARITY_SCALE = 100;

const similarity = (a: number[], b: number[]) => a.reduce((sum, value, d) => sum + value * b[d], 0);

export function predictBySimilarity(classDescriptions: number[][][], vector: number[]): Prediction {
	const logits = classDescriptions.map(
		(descriptions) =>
			Math.max(...descriptions.map((description) => similarity(description, vector))) *
			SIMILARITY_SCALE,
	);
	const max = Math.max(...logits);
	const exponents = logits.map((logit) => Math.exp(logit - max));
	const total = exponents.reduce((sum, value) => sum + value, 0);
	const probabilities = exponents.map((value) => value / total);
	const index = probabilities.indexOf(Math.max(...probabilities));
	return { index, confidence: probabilities[index], probabilities };
}
