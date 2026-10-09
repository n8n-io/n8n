import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

export interface Category {
	category: string;
	description: string;
}

/** The key the model answers on when none of the categories apply. */
export const FALLBACK_KEY = 'fallback';

/** The key the model reports its own certainty on. */
export const CONFIDENCE_KEY = 'confidence';

/**
 * Printed once in the format instructions, so the scale lives here and the
 * per-category text stays short. The anti-uniformity rule is the point: a model
 * left to itself answers 0.9 to everything.
 */
const CONFIDENCE_MAP_DESCRIPTION =
	'A score from 0.0 to 1.0 for every key above, including the categories you set to false. Score 1.0 when the text says so outright, 0.5 when the text is genuinely ambiguous, and 0.0 when nothing in the text fits. Use the whole range and rank the categories against each other: a category you set to false scores well under 0.5, and the scores must never all be high or all be the same.';

/**
 * Everything the routing code is allowed to see. The model answers with one key
 * for each category, which is a shape only this module reads: routing on it
 * directly is how a schema change silently sends every item to every branch.
 */
export interface ClassificationResult {
	/** The categories the model marked true. */
	matched: string[];
	/** The model said that none of the categories apply. */
	fallback: boolean;
	/**
	 * The model's own certainty for each decision, from 0 to 1, when it was asked
	 * for one. A decision the model gave no usable number for is absent, never 0.
	 */
	scores?: Record<string, number>;
}

/**
 * A category with this name would overwrite the key the scores are reported on,
 * and the model would have nowhere to answer it.
 */
export function findReservedCategory(categories: Category[]): string | undefined {
	return categories.find((cat) => cat.category === CONFIDENCE_KEY)?.category;
}

/** Out-of-range is still a signal. Only a value that is not a number is dropped. */
function readScore(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
	return Math.min(1, Math.max(0, value));
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
		const decisions = entries.map(([key]) => key);
		entries.push([
			CONFIDENCE_KEY,
			z
				.object(
					Object.fromEntries(
						decisions.map((key) => [
							key,
							z
								// Only a string that reads as a number. `z.coerce` would turn the
								// boolean above it into 1, and report certainty the model never gave.
								.preprocess(
									(value) =>
										typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
									z.number(),
								)
								.nullish()
								.catch(undefined)
								.describe(
									key === FALLBACK_KEY
										? 'How poorly the text fits every category above: 1.0 when no category applies at all, 0.0 when one category clearly applies'
										: `How much of the text supports category "${key}"`,
								),
						]),
					),
				)
				// Nothing here may fail the parse. A broken number would cost a repair
				// call, and a second failure would lose the classification itself.
				.nullish()
				.catch(undefined)
				.describe(CONFIDENCE_MAP_DESCRIPTION),
		]);
	}

	return z.object(Object.fromEntries(entries));
}

/** Reads the model's answer. The one place that knows how the schema is laid out. */
export function toClassificationResult(raw: unknown, categories: Category[]): ClassificationResult {
	const answer = isRecord(raw) ? raw : {};

	const reported = answer[CONFIDENCE_KEY];
	const scores: Record<string, number> = {};
	if (isRecord(reported)) {
		for (const [key, value] of Object.entries(reported)) {
			const score = readScore(value);
			if (score !== undefined) scores[key] = score;
		}
	}

	return {
		matched: categories.filter((cat) => answer[cat.category] === true).map((cat) => cat.category),
		fallback: answer[FALLBACK_KEY] === true,
		...(Object.keys(scores).length > 0 && { scores }),
	};
}
