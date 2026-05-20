export function formatToolNameForDisplay(toolName: string | undefined): string {
	const trimmed = toolName?.trim();
	const normalizedToolName = trimmed?.toLocaleLowerCase();

	if (
		normalizedToolName === 'web_search' ||
		normalizedToolName === 'openai.web_search' ||
		normalizedToolName === 'xai.web_search' ||
		normalizedToolName?.startsWith('anthropic.web_search') === true
	) {
		return 'Web search';
	}

	if (normalizedToolName === 'web_open') return 'Fetch page';

	const normalized = trimmed?.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

	if (!normalized) return '';

	const lowerCased = normalized.toLocaleLowerCase();
	return (lowerCased.charAt(0).toLocaleUpperCase() + lowerCased.slice(1)).replace(
		/\bllm\b/g,
		'LLM',
	);
}
