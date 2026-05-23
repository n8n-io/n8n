export const WEB_SEARCH_TOOL_NAME_KEY = 'agents.chat.toolNames.webSearch';

const WEB_SEARCH_TOOL_NAME_PATTERN =
	/^(?:web_search|(?:anthropic|openai)\.web_search(?:_\d{8})?|google\.google_search(?:_\d{8})?)$/;

export function getToolNameTranslationKey(toolName: string | undefined): string | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return undefined;

	return WEB_SEARCH_TOOL_NAME_PATTERN.test(trimmed) ? WEB_SEARCH_TOOL_NAME_KEY : undefined;
}

export function formatToolNameForDisplay(toolName: string | undefined): string {
	const trimmed = toolName?.trim();
	const normalized = trimmed?.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

	if (!normalized) return '';

	const lowerCased = normalized.toLocaleLowerCase();
	return (lowerCased.charAt(0).toLocaleUpperCase() + lowerCased.slice(1)).replace(
		/\bllm\b/g,
		'LLM',
	);
}
