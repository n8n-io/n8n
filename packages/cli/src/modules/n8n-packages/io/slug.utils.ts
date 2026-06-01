const DEFAULT_EMPTY_SLUG_FALLBACK = 'workflow';

/**
 * Generates a filesystem-safe slug from an entity name
 */
export function generateSlug(name: string, fallback: string = DEFAULT_EMPTY_SLUG_FALLBACK): string {
	let slug = name;
	slug = slug
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
		.replace(/^-|-$/g, '');

	return slug || fallback;
}
