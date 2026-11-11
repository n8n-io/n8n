import {
	AGENT_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
} from '@n8n/api-types';
import type { BaseTextKey, I18nClass } from '@n8n/i18n';

export const WEB_SEARCH_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.webSearch';
export const FIND_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.findFile';
export const SEARCH_TEXT_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.searchText';
export const READ_FILE_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.readFile';
export const FLAG_MEMORY_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.flagMemory';
export const TOOL_SEARCH_TOOL_NAME_KEY: BaseTextKey = 'agents.chat.toolNames.toolSearch';

const WEB_SEARCH_TOOL_NAME_PATTERN = /^(?:web_search|(?:anthropic|openai)\.web_search(?:_\d{8})?)$/;
// Native tool search is registered as `<provider>.tool_search`, with an optional
// `_bm25_<date>` or `_regex_<date>` variant suffix and `_N` added on a name collision.
const TOOL_SEARCH_TOOL_NAME_PATTERN =
	/^(?:anthropic|openai)\.tool_search(?:_(?:bm25|regex)_\d{8})?(?:_\d+)?$/;
const FIND_FILE_TOOL_NAME = 'find_file';
const SEARCH_TEXT_TOOL_NAME = 'search_text';
const READ_FILE_TOOL_NAME = 'read_file';
const FLAG_MEMORY_TOOL_NAME = 'flag_memory';
const BUILDER_TOOL_PREFIX_PATTERN = /^(?:agent|workflow)_builder_/;
const BUILDER_TOOL_NAMES = new Set<string>([
	...Object.values(AGENT_BUILDER_TOOL_NAMES),
	...Object.values(WORKFLOW_BUILDER_TOOL_NAMES),
	...Object.values(SHARED_BUILDER_TOOL_NAMES),
]);

function isMemoryNotedOutput(output: unknown): boolean {
	return (
		typeof output === 'object' && output !== null && 'status' in output && output.status === 'noted'
	);
}

const BUILDER_TOOL_TRANSLATION_KEYS: Record<string, BaseTextKey> = {
	read_config: 'instanceAi.tools.read_config',
	[AGENT_BUILDER_TOOL_NAMES.WRITE_CONFIG]: 'instanceAi.tools.agent_builder_write_config',
	[AGENT_BUILDER_TOOL_NAMES.PATCH_CONFIG]: 'instanceAi.tools.agent_builder_patch_config',
	[AGENT_BUILDER_TOOL_NAMES.BUILD_CUSTOM_TOOL]: 'instanceAi.tools.agent_builder_build_custom_tool',
	[AGENT_BUILDER_TOOL_NAMES.CREATE_SKILLS]: 'instanceAi.tools.agent_builder_create_skills',
	list_skills: 'instanceAi.tools.list_skills',
	read_skill: 'instanceAi.tools.read_skill',
	[AGENT_BUILDER_TOOL_NAMES.UPDATE_SKILL]: 'instanceAi.tools.agent_builder_update_skill',
	[AGENT_BUILDER_TOOL_NAMES.CREATE_TASKS]: 'instanceAi.tools.agent_builder_create_tasks',
	list_tasks: 'instanceAi.tools.list_tasks',
	[AGENT_BUILDER_TOOL_NAMES.UPDATE_TASK]: 'instanceAi.tools.agent_builder_update_task',
	list_workflows: 'instanceAi.tools.list_workflows',
	list_integration_types: 'instanceAi.tools.list_integration_types',
	list_sub_agents: 'instanceAi.tools.list_sub_agents',
	[AGENT_BUILDER_TOOL_NAMES.PUBLISH_AGENT]: 'instanceAi.tools.agent_builder_publish_agent',
	[AGENT_BUILDER_TOOL_NAMES.UNPUBLISH_AGENT]: 'instanceAi.tools.agent_builder_unpublish_agent',
	resolve_integration: 'instanceAi.tools.resolve_integration',
	[AGENT_BUILDER_TOOL_NAMES.RESOLVE_LLM]: 'instanceAi.tools.agent_builder_resolve_llm',
	search_mcp_servers: 'instanceAi.tools.search_mcp_servers',
	[AGENT_BUILDER_TOOL_NAMES.VERIFY_MCP_SERVER]: 'instanceAi.tools.agent_builder_verify_mcp_server',
	[AGENT_BUILDER_TOOL_NAMES.ASK_CREDENTIAL]: 'instanceAi.tools.agent_builder_ask_credential',
	[AGENT_BUILDER_TOOL_NAMES.ASK_EMBEDDING_CREDENTIAL]:
		'instanceAi.tools.agent_builder_ask_embedding_credential',
	[AGENT_BUILDER_TOOL_NAMES.CONFIGURE_CHANNEL]: 'instanceAi.tools.agent_builder_configure_channel',
	[AGENT_BUILDER_TOOL_NAMES.SEARCH_NODES]: 'instanceAi.tools.agent_builder_search_nodes',
	[AGENT_BUILDER_TOOL_NAMES.GET_NODE_TYPES]: 'instanceAi.tools.agent_builder_get_node_types',
	[SHARED_BUILDER_TOOL_NAMES.ASK_USER]: 'instanceAi.tools.ask_user',
	[SHARED_BUILDER_TOOL_NAMES.SEARCH_MODELS]: 'instanceAi.tools.search_models',
	[SHARED_BUILDER_TOOL_NAMES.SEARCH_NODES]: 'instanceAi.tools.search_nodes',
	[SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES]: 'instanceAi.tools.get_node_types',
	[SHARED_BUILDER_TOOL_NAMES.GET_NODE_PARAMETER_OPTIONS]:
		'instanceAi.tools.get_node_parameter_options',
	[SHARED_BUILDER_TOOL_NAMES.EXECUTE_NODE]: 'instanceAi.tools.execute_node',
	[SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS]: 'instanceAi.tools.list_credentials',
	[SHARED_BUILDER_TOOL_NAMES.SEARCH_CREDENTIAL_TYPES]: 'instanceAi.tools.search_credential_types',
	[SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS]: 'instanceAi.tools.setup_credentials',
	[SHARED_BUILDER_TOOL_NAMES.TEST_CREDENTIAL]: 'instanceAi.tools.test_credential',
	[SHARED_BUILDER_TOOL_NAMES.DELETE_CREDENTIAL]: 'instanceAi.tools.delete_credential',
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
	const builderKeyName = [trimmed, name].find((candidate) =>
		Object.prototype.hasOwnProperty.call(BUILDER_TOOL_TRANSLATION_KEYS, candidate),
	);
	if (builderKeyName) {
		return BUILDER_TOOL_TRANSLATION_KEYS[builderKeyName];
	}
	if (TOOL_SEARCH_TOOL_NAME_PATTERN.test(name)) return TOOL_SEARCH_TOOL_NAME_KEY;

	return WEB_SEARCH_TOOL_NAME_PATTERN.test(name) ? WEB_SEARCH_TOOL_NAME_KEY : undefined;
}

/** Drops the builder prefix so a fallback label reads like the tool action. */
export function stripBuilderToolPrefix(toolName: string | undefined): string | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return toolName;
	const name = resolveBuilderToolName(trimmed);
	return BUILDER_TOOL_NAMES.has(name) ? name.replace(BUILDER_TOOL_PREFIX_PATTERN, '') : trimmed;
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
	const fallback = formatToolNameForDisplay(stripBuilderToolPrefix(toolName));
	if (!translationKey) return fallback;

	const translated = i18n.baseText(translationKey);
	return translated === translationKey ? fallback : translated;
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
