import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

export interface Category {
	category: string;
	description: string;
}

export const FALLBACK_KEY = 'fallback';
export const CONFIDENCE_KEY = 'confidence';

const CONFIDENCE_MAP_DESCRIPTION =
	'A score from 0.0 to 1.0 for every key above, including the categories you set to false. Score 1.0 when the text says so outright, 0.5 when the text is genuinely ambiguous, and 0.0 when nothing in the text fits. Use the whole range and rank the categories against each other: a category you set to false scores well under 0.5, and the scores must never all be high or all be the same.';

/** Routing on the model's own object instead is how a schema change sends every item to every branch. */
export interface ClassificationResult {
	matched: string[];
	fallback: boolean;
	scores?: Record<string, number>;
}

export function findReservedCategory(categories: Category[]): string | undefined {
	return categories.find((cat) => cat.category === CONFIDENCE_KEY)?.category;
}

function clampToScore(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
	return Math.min(1, Math.max(0, value));
}

/** `z.coerce` would read the boolean answer above as 1, and report certainty the model never gave. */
const numericStringToNumber = (value: unknown) =>
	typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

function scoreField(decisionKey: string) {
	return z
		.preprocess(numericStringToNumber, z.number())
		.nullish()
		.catch(undefined)
		.describe(
			decisionKey === FALLBACK_KEY
				? 'How poorly the text fits every category above: 1.0 when no category applies at all, 0.0 when one category clearly applies'
				: `How much of the text supports category "${decisionKey}"`,
		);
}

export function buildClassificationSchema(
	categories: Category[],
	withFallback: boolean,
	withConfidence = false,
) {
	const entries: Array<[string, z.ZodTypeAny]> = categories.map((cat) => [
		cat.category,
		z
			.boolean()
			.describe(
				`Should be true if the input has category "${cat.category}" (description: ${cat.description})`,
			),
	]);

	if (withFallback) {
		entries.push([
			FALLBACK_KEY,
			z.boolean().describe('Should be true if none of the other categories apply'),
		]);
	}

	if (withConfidence) {
		const decisionKeys = entries.map(([key]) => key);
		entries.push([
			CONFIDENCE_KEY,
			z
				.object(Object.fromEntries(decisionKeys.map((key) => [key, scoreField(key)])))
				.nullish()
				.catch(undefined)
				.describe(CONFIDENCE_MAP_DESCRIPTION),
		]);
	}

	return z.object(Object.fromEntries(entries));
}

export function toClassificationResult(raw: unknown, categories: Category[]): ClassificationResult {
	const answer = isRecord(raw) ? raw : {};
	const reportedScores = answer[CONFIDENCE_KEY];

	const scores: Record<string, number> = {};
	if (isRecord(reportedScores)) {
		for (const [key, value] of Object.entries(reportedScores)) {
			const score = clampToScore(value);
			if (score !== undefined) scores[key] = score;
		}
	}

	return {
		matched: categories.filter((cat) => answer[cat.category] === true).map((cat) => cat.category),
		fallback: answer[FALLBACK_KEY] === true,
		...(Object.keys(scores).length > 0 && { scores }),
	};
}
