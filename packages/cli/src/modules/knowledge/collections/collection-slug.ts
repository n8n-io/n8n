const SLUG_MAX_LENGTH = 24;
const FALLBACK_SLUG = 'collection';

export const SLUG_SUFFIX_LENGTH = 6;

/**
 * Makes a tool-safe slug from a collection name: lowercase letters, digits and
 * underscores, at most 24 characters. A name with none of these characters
 * gets a fallback slug.
 */
export function slugFromName(name: string): string {
	const slug = name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+/, '')
		.slice(0, SLUG_MAX_LENGTH)
		.replace(/_+$/, '');

	return slug || FALLBACK_SLUG;
}

/** Makes the slug unique with a suffix when another collection already has it. */
export function slugWithSuffix(slug: string, suffix: string): string {
	const base = slug.slice(0, SLUG_MAX_LENGTH - suffix.length - 1).replace(/_+$/, '');

	return `${base}_${suffix}`;
}
