import type { BaseTextKey } from '@n8n/i18n';

export const WEB_SEARCH_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.webSearch';
export const FIND_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.findFile';
export const SEARCH_TEXT_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.searchText';
export const READ_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.readFile';

const WEB_SEARCH_TOOL_NAME_PATTERN = /^(?:web_search|(?:anthropic|openai)\.web_search(?:_\d{8})?)$/;
const FIND_FILE_TOOL_NAME = 'find_file';
const SEARCH_TEXT_TOOL_NAME = 'search_text';
const READ_FILE_TOOL_NAME = 'read_file';

const BUILDER_TOOL_TRANSLATION_KEYS: Record<string, BaseTextKey> = {
	read_config: 'instanceAi.tools.read_config',
	write_config: 'instanceAi.tools.write_config',
	patch_config: 'instanceAi.tools.patch_config',
	build_custom_tool: 'instanceAi.tools.build_custom_tool',
	create_skills: 'instanceAi.tools.create_skills',
	create_tasks: 'instanceAi.tools.create_tasks',
	get_resource_locator_options: 'instanceAi.tools.get_resource_locator_options',
	list_workflows: 'instanceAi.tools.list_workflows',
	list_integration_types: 'instanceAi.tools.list_integration_types',
	list_sub_agents: 'instanceAi.tools.list_sub_agents',
	publish_agent: 'instanceAi.tools.publish_agent',
	unpublish_agent: 'instanceAi.tools.unpublish_agent',
	resolve_integration: 'instanceAi.tools.resolve_integration',
	resolve_llm: 'instanceAi.tools.resolve_llm',
	search_mcp_servers: 'instanceAi.tools.search_mcp_servers',
	verify_mcp_server: 'instanceAi.tools.verify_mcp_server',
	ask_questions: 'instanceAi.tools.ask_questions',
	ask_credential: 'instanceAi.tools.ask_credential',
	ask_embedding_credential: 'instanceAi.tools.ask_embedding_credential',
	configure_channel: 'instanceAi.tools.configure_channel',
	search_nodes: 'instanceAi.tools.search_nodes',
	get_node_types: 'instanceAi.tools.get_node_types',
	list_credentials: 'instanceAi.tools.list_credentials',
};

export function getToolNameTranslationKey(toolName: string | undefined): BaseTextKey | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return undefined;

	if (trimmed === FIND_FILE_TOOL_NAME) return FIND_FILE_TOOL_NAME_KEY;
	if (trimmed === SEARCH_TEXT_TOOL_NAME) return SEARCH_TEXT_TOOL_NAME_KEY;
	if (trimmed === READ_FILE_TOOL_NAME) return READ_FILE_TOOL_NAME_KEY;
	if (trimmed in BUILDER_TOOL_TRANSLATION_KEYS) {
		return BUILDER_TOOL_TRANSLATION_KEYS[trimmed];
	}

	return WEB_SEARCH_TOOL_NAME_PATTERN.test(trimmed) ? WEB_SEARCH_TOOL_NAME_KEY : undefined;
}

export function resolveToolNameForDisplay(
	toolName: string | undefined,
	baseText: (key: BaseTextKey) => string,
): string {
	const translationKey = getToolNameTranslationKey(toolName);
	if (!translationKey) return formatToolNameForDisplay(toolName);

	const translated = baseText(translationKey);
	return translated === translationKey ? formatToolNameForDisplay(toolName) : translated;
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
