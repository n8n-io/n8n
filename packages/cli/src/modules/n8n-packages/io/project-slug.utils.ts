import { slugify } from './slug.utils';

/**
 * Generates a filesystem-safe slug from a project name and short ID.
 * Format: `{slug}-{shortId}` or just `{shortId}` if name yields empty slug.
 */
export function generateProjectSlug(name: string, id: string): string {
	const shortId = id.slice(0, 6);
	const slug = slugify(name);

	return slug ? `${slug}-${shortId}` : shortId;
}
