import { AGENT_BUILDER_TOOL_NAMES, resolveBuilderToolName } from '@n8n/api-types';
import type { BaseTextKey, I18nClass } from '@n8n/i18n';

export const WEB_SEARCH_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.webSearch';
export const FIND_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.findFile';
export const SEARCH_TEXT_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.searchText';
export const READ_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.readFile';
export const FLAG_MEMORY_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.flagMemory';

const WEB_SEARCH_TOOL_NAME_PATTERN = /^(?:web_search|(?:anthropic|openai)\.web_search(?:_\d{8})?)$/;
const FIND_FILE_TOOL_NAME = 'find_file';
const SEARCH_TEXT_TOOL_NAME = 'search_text';
const READ_FILE_TOOL_NAME = 'read_file';
const FLAG_MEMORY_TOOL_NAME = 'flag_memory';

function isMemoryNotedOutput(output: unknown): boolean {
	return (
		typeof output === 'object' && output !== null && 'status' in output && output.status === 'noted'
	);
}

const BUILDER_TOOL_TRANSLATION_KEYS: Record<string, BaseTextKey> = {
	read_config: 'instanceAi.tools.read_config',
	[AGENT_BUILDER_TOOL_NAMES.WRITE_CONFIG]: 'instanceAi.tools.agent_write_config',
	[AGENT_BUILDER_TOOL_NAMES.PATCH_CONFIG]: 'instanceAi.tools.agent_patch_config',
	[AGENT_BUILDER_TOOL_NAMES.BUILD_CUSTOM_TOOL]: 'instanceAi.tools.agent_build_custom_tool',
	[AGENT_BUILDER_TOOL_NAMES.CREATE_SKILLS]: 'instanceAi.tools.agent_create_skills',
	list_skills: 'instanceAi.tools.list_skills',
	read_skill: 'instanceAi.tools.read_skill',
	[AGENT_BUILDER_TOOL_NAMES.UPDATE_SKILL]: 'instanceAi.tools.agent_update_skill',
	[AGENT_BUILDER_TOOL_NAMES.CREATE_TASKS]: 'instanceAi.tools.agent_create_tasks',
	list_tasks: 'instanceAi.tools.list_tasks',
	[AGENT_BUILDER_TOOL_NAMES.UPDATE_TASK]: 'instanceAi.tools.agent_update_task',
	[AGENT_BUILDER_TOOL_NAMES.GET_RESOURCE_LOCATOR_OPTIONS]:
		'instanceAi.tools.get_resource_locator_options',
	list_workflows: 'instanceAi.tools.list_workflows',
	list_integration_types: 'instanceAi.tools.list_integration_types',
	list_sub_agents: 'instanceAi.tools.list_sub_agents',
	[AGENT_BUILDER_TOOL_NAMES.PUBLISH_AGENT]: 'instanceAi.tools.agent_publish',
	[AGENT_BUILDER_TOOL_NAMES.UNPUBLISH_AGENT]: 'instanceAi.tools.agent_unpublish',
	resolve_integration: 'instanceAi.tools.resolve_integration',
	[AGENT_BUILDER_TOOL_NAMES.RESOLVE_LLM]: 'instanceAi.tools.agent_resolve_llm',
	search_mcp_servers: 'instanceAi.tools.search_mcp_servers',
	[AGENT_BUILDER_TOOL_NAMES.VERIFY_MCP_SERVER]: 'instanceAi.tools.agent_verify_mcp_server',
	[AGENT_BUILDER_TOOL_NAMES.ASK_QUESTIONS]: 'instanceAi.tools.ask_questions',
	[AGENT_BUILDER_TOOL_NAMES.ASK_CREDENTIAL]: 'instanceAi.tools.agent_ask_credential',
	[AGENT_BUILDER_TOOL_NAMES.ASK_EMBEDDING_CREDENTIAL]:
		'instanceAi.tools.agent_ask_embedding_credential',
	[AGENT_BUILDER_TOOL_NAMES.CONFIGURE_CHANNEL]: 'instanceAi.tools.agent_configure_channel',
	[AGENT_BUILDER_TOOL_NAMES.FINISH_SETUP]: 'instanceAi.tools.agent_finish_setup',
	[AGENT_BUILDER_TOOL_NAMES.SEARCH_NODES]: 'instanceAi.tools.search_nodes',
	[AGENT_BUILDER_TOOL_NAMES.GET_NODE_TYPES]: 'instanceAi.tools.get_node_types',
	[AGENT_BUILDER_TOOL_NAMES.LIST_CREDENTIALS]: 'instanceAi.tools.list_credentials',
};

export function getToolNameTranslationKey(
	toolName: string | undefined,
	output?: unknown,
): BaseTextKey | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return undefined;
	const name = resolveBuilderToolName(trimmed);

	if (name === FIND_FILE_TOOL_NAME) return FIND_FILE_TOOL_NAME_KEY;
	if (name === SEARCH_TEXT_TOOL_NAME) return SEARCH_TEXT_TOOL_NAME_KEY;
	if (name === READ_FILE_TOOL_NAME) return READ_FILE_TOOL_NAME_KEY;
	if (name === FLAG_MEMORY_TOOL_NAME && isMemoryNotedOutput(output)) {
		return FLAG_MEMORY_TOOL_NAME_KEY;
	}
	if (Object.prototype.hasOwnProperty.call(BUILDER_TOOL_TRANSLATION_KEYS, name)) {
		return BUILDER_TOOL_TRANSLATION_KEYS[name];
	}

	return WEB_SEARCH_TOOL_NAME_PATTERN.test(name) ? WEB_SEARCH_TOOL_NAME_KEY : undefined;
}

export function isCompactToolName(toolName: string | undefined, output?: unknown): boolean {
	return toolName?.trim() === FLAG_MEMORY_TOOL_NAME && isMemoryNotedOutput(output);
}

export function resolveToolNameForDisplay(
	toolName: string | undefined,
	i18n: Pick<I18nClass, 'baseText'>,
	output?: unknown,
): string {
	const translationKey = getToolNameTranslationKey(toolName, output);
	if (!translationKey) return formatToolNameForDisplay(toolName);

	const translated = i18n.baseText(translationKey);
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
