const DEFAULT_EMPTY_SLUG_FALLBACK = 'entity';

/**
 * Normalizes a name into a filesystem-safe slug. May return an empty string when
 * the name contains no slug-able characters; callers decide on a fallback.
 */
export function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			// Remove characters except lowercase letters, digits, whitespace, and hyphens
			.replace(/[^a-z0-9\s-]/g, '')
			// Remove whitespace at the start/end
			.trim()
			// Replace remaining whitespace runs with a -
			.replace(/\s+/g, '-')
			// Collapse consecutive hyphens into a single hyphen
			.replace(/-+/g, '-')
			// Remove any - at the start or end of the slug
			.replace(/^-|-$/g, '')
	);
}

/**
 * Generates a filesystem-safe slug from an entity name
 */
export function generateSlug(name: string): string {
	return slugify(name) || DEFAULT_EMPTY_SLUG_FALLBACK;
}
