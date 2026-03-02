const EMOJI_NAMES: Record<string, string> = {
	'\u{1F4B3}': 'credit-card',
	'\u{1F4B0}': 'money-bag',
	'\u{1F4E7}': 'email',
	'\u{1F4E6}': 'package',
	'\u{1F4CA}': 'chart',
	'\u{1F4C8}': 'chart-increasing',
	'\u{1F4C9}': 'chart-decreasing',
	'\u{1F4CB}': 'clipboard',
	'\u{1F4C1}': 'folder',
	'\u{1F4C2}': 'open-folder',
	'\u{1F512}': 'lock',
	'\u{1F513}': 'unlock',
	'\u{1F527}': 'wrench',
	'\u{2699}\uFE0F': 'gear',
	'\u{2699}': 'gear',
	'\u{1F680}': 'rocket',
	'\u{2B50}': 'star',
	'\u{2764}\uFE0F': 'heart',
	'\u{2764}': 'heart',
	'\u{1F525}': 'fire',
	'\u{26A1}': 'lightning',
	'\u{1F4A1}': 'lightbulb',
	'\u{1F916}': 'robot',
	'\u{1F3E0}': 'house',
	'\u{1F3E2}': 'office',
	'\u{1F4DD}': 'memo',
	'\u{1F4AC}': 'speech-bubble',
	'\u{1F4E2}': 'loudspeaker',
	'\u{1F6E0}\uFE0F': 'tools',
	'\u{1F6E0}': 'tools',
	'\u{1F9FE}': 'receipt',
	'\u{1F4B5}': 'dollar',
};

/**
 * Generates a filesystem-safe slug from a project name and short ID.
 * Format: `{slug}-{shortId}` or just `{shortId}` if name yields empty slug.
 */
export function generateSlug(name: string, id: string): string {
	const shortId = id.slice(0, 6);

	let slug = name;

	// Replace known emojis with their names
	for (const [emoji, emojiName] of Object.entries(EMOJI_NAMES)) {
		slug = slug.replaceAll(emoji, emojiName);
	}

	// Remove remaining non-ASCII and special characters, keep alphanumeric and hyphens
	slug = slug
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	return slug ? `${slug}-${shortId}` : shortId;
}
