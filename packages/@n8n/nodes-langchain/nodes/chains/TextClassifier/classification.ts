import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

export interface Category {
	category: string;
	description: string;
}

/** The key the model answers on when none of the categories apply. */
export const FALLBACK_KEY = 'fallback';

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
}

export function buildClassificationSchema(categories: Category[], withFallback: boolean) {
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

	return z.object(Object.fromEntries(entries));
}

/** Reads the model's answer. The one place that knows how the schema is laid out. */
export function toClassificationResult(raw: unknown, categories: Category[]): ClassificationResult {
	const answer = isRecord(raw) ? raw : {};

	return {
		matched: categories.filter((cat) => answer[cat.category] === true).map((cat) => cat.category),
		fallback: answer[FALLBACK_KEY] === true,
	};
}
