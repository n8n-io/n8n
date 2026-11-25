import { generateNanoId } from '@n8n/utils/generate-nano-id';

const SLUG_MAX_LENGTH = 24;

export const SLUG_SUFFIX_LENGTH = 6;

/**
 * Makes the slug that agent tool names use, from a collection name: letters
 * without accents in lower case, digits, and one `_` for each run of other
 * characters, with at most 24 characters.
 * "Naïve café résumé guide 2026!" → "naive_cafe_resume_guide".
 * A name with no Latin letters or digits, for example in Cyrillic or Japanese,
 * gets a random nano id, as a workflow id.
 */
export function slugFromName(name: string): string {
	const slug = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+/, '')
		.slice(0, SLUG_MAX_LENGTH)
		.replace(/_+$/, '');

	return slug || generateNanoId();
}

/** Makes the slug unique with a suffix when another collection already has it. */
export function slugWithSuffix(slug: string, suffix: string): string {
	const base = slug.slice(0, SLUG_MAX_LENGTH - suffix.length - 1).replace(/_+$/, '');

	return `${base}_${suffix}`;
}
