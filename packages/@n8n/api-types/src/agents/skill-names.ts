/**
 * The rule for two skill names that are hard to tell apart inside one agent: case,
 * surrounding spaces, and runs of spaces, hyphens and underscores do not count.
 */
export function skillNameKey(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, ' ')
		.trim();
}
