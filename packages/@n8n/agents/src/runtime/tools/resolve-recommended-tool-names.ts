/** Maps skill frontmatter names to registered tool names (first match wins). */
const RECOMMENDED_TOOL_ALIASES: Record<string, readonly string[]> = {
	read_file: ['read_file', 'workspace_read_file'],
	write_file: ['write_file', 'workspace_write_file'],
	edit_file: ['edit_file', 'workspace_str_replace_file', 'workspace_batch_str_replace_file'],
};

export function resolveRecommendedToolNames(
	recommended: readonly string[],
	availableToolNames: ReadonlySet<string>,
): string[] {
	const resolved: string[] = [];
	const seen = new Set<string>();

	for (const name of recommended) {
		const candidates = RECOMMENDED_TOOL_ALIASES[name] ?? [name];
		const match = candidates.find((candidate) => availableToolNames.has(candidate));
		if (match && !seen.has(match)) {
			seen.add(match);
			resolved.push(match);
		}
	}

	return resolved;
}
