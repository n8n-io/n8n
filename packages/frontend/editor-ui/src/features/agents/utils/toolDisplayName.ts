import type { BaseTextKey } from '@n8n/i18n';

export const WEB_SEARCH_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.webSearch';
export const FIND_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.findFile';
export const SEARCH_TEXT_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.searchText';
export const READ_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.readFile';

const WEB_SEARCH_TOOL_NAME_PATTERN = /^(?:web_search|(?:anthropic|openai)\.web_search(?:_\d{8})?)$/;
const FIND_FILE_TOOL_NAME = 'find_file';
const SEARCH_TEXT_TOOL_NAME = 'search_text';
const READ_FILE_TOOL_NAME = 'read_file';

const LEGACY_TOOL_NAME_ALIASES: Record<string, string> = {
	resolve_integration: 'add-integration',
	get_node_types: 'describe-nodes',
	list_credentials: 'inspect-credentials',
	list_workflows: 'list-workflows',
};

const BUILDER_TOOL_TRANSLATION_KEYS: Record<string, BaseTextKey> = {
	read_config: 'instanceAi.tools.read_config',
	write_config: 'instanceAi.tools.write_config',
	patch_config: 'instanceAi.tools.patch_config',
	build_custom_tool: 'instanceAi.tools.build_custom_tool',
	create_skills: 'instanceAi.tools.create_skills',
	create_tasks: 'instanceAi.tools.create_tasks',
	get_resource_locator_options: 'instanceAi.tools.get_resource_locator_options',
	'list-workflows': 'instanceAi.tools.list-workflows',
	list_integration_types: 'instanceAi.tools.list_integration_types',
	list_sub_agents: 'instanceAi.tools.list_sub_agents',
	publish_agent: 'instanceAi.tools.publish_agent',
	unpublish_agent: 'instanceAi.tools.unpublish_agent',
	'add-integration': 'instanceAi.tools.add-integration',
	resolve_llm: 'instanceAi.tools.resolve_llm',
	search_mcp_servers: 'instanceAi.tools.search_mcp_servers',
	verify_mcp_server: 'instanceAi.tools.verify_mcp_server',
	ask_questions: 'instanceAi.tools.ask_questions',
	ask_credential: 'instanceAi.tools.ask_credential',
	ask_embedding_credential: 'instanceAi.tools.ask_embedding_credential',
	configure_channel: 'instanceAi.tools.configure_channel',
	search_nodes: 'instanceAi.tools.search_nodes',
	'describe-nodes': 'instanceAi.tools.describe-nodes',
	'inspect-credentials': 'instanceAi.tools.inspect-credentials',
};

function normalizeToolName(toolName: string): string {
	return LEGACY_TOOL_NAME_ALIASES[toolName] ?? toolName;
}

export function getToolNameTranslationKey(toolName: string | undefined): BaseTextKey | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return undefined;
	const normalizedToolName = normalizeToolName(trimmed);

	if (normalizedToolName === FIND_FILE_TOOL_NAME) return FIND_FILE_TOOL_NAME_KEY;
	if (normalizedToolName === SEARCH_TEXT_TOOL_NAME) return SEARCH_TEXT_TOOL_NAME_KEY;
	if (normalizedToolName === READ_FILE_TOOL_NAME) return READ_FILE_TOOL_NAME_KEY;
	if (normalizedToolName in BUILDER_TOOL_TRANSLATION_KEYS) {
		return BUILDER_TOOL_TRANSLATION_KEYS[normalizedToolName];
	}

	return WEB_SEARCH_TOOL_NAME_PATTERN.test(normalizedToolName)
		? WEB_SEARCH_TOOL_NAME_KEY
		: undefined;
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
