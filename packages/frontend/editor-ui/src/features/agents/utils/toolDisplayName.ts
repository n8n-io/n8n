import type { BaseTextKey } from '@n8n/i18n';

export const WEB_SEARCH_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.webSearch';
export const FIND_KNOWLEDGE_FILES_TOOL_NAME_KEY: BaseTextKey =
	'agents.chat.toolNames.findKnowledgeFiles';
export const SEARCH_KNOWLEDGE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.searchKnowledge';
export const READ_KNOWLEDGE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.readKnowledge';

const WEB_SEARCH_TOOL_NAME_PATTERN = /^(?:web_search|(?:anthropic|openai)\.web_search(?:_\d{8})?)$/;
const FIND_KNOWLEDGE_FILES_TOOL_NAME = 'find_knowledge_files';
const SEARCH_KNOWLEDGE_TOOL_NAME = 'search_knowledge';
const READ_KNOWLEDGE_TOOL_NAME = 'read_knowledge';

export function getToolNameTranslationKey(toolName: string | undefined): BaseTextKey | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return undefined;

	if (trimmed === FIND_KNOWLEDGE_FILES_TOOL_NAME) return FIND_KNOWLEDGE_FILES_TOOL_NAME_KEY;
	if (trimmed === SEARCH_KNOWLEDGE_TOOL_NAME) return SEARCH_KNOWLEDGE_TOOL_NAME_KEY;
	if (trimmed === READ_KNOWLEDGE_TOOL_NAME) return READ_KNOWLEDGE_TOOL_NAME_KEY;

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
