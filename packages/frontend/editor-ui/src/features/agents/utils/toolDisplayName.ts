import { normalizeAgentBuilderToolName } from '@n8n/api-types';
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
	config_write: 'instanceAi.tools.config_write',
	config_patch: 'instanceAi.tools.config_patch',
	custom_tool_build: 'instanceAi.tools.custom_tool_build',
	skills_create: 'instanceAi.tools.skills_create',
	list_skills: 'instanceAi.tools.list_skills',
	read_skill: 'instanceAi.tools.read_skill',
	skill_update: 'instanceAi.tools.skill_update',
	tasks_create: 'instanceAi.tools.tasks_create',
	list_tasks: 'instanceAi.tools.list_tasks',
	task_update: 'instanceAi.tools.task_update',
	resource_locator_options_get: 'instanceAi.tools.resource_locator_options_get',
	list_workflows: 'instanceAi.tools.list_workflows',
	list_integration_types: 'instanceAi.tools.list_integration_types',
	list_sub_agents: 'instanceAi.tools.list_sub_agents',
	agent_publish: 'instanceAi.tools.agent_publish',
	agent_unpublish: 'instanceAi.tools.agent_unpublish',
	resolve_integration: 'instanceAi.tools.resolve_integration',
	llm_resolve: 'instanceAi.tools.llm_resolve',
	search_mcp_servers: 'instanceAi.tools.search_mcp_servers',
	mcp_server_verify: 'instanceAi.tools.mcp_server_verify',
	user_questions_ask: 'instanceAi.tools.user_questions_ask',
	credential_ask: 'instanceAi.tools.credential_ask',
	embedding_credential_ask: 'instanceAi.tools.embedding_credential_ask',
	channel_configure: 'instanceAi.tools.channel_configure',
	nodes_search: 'instanceAi.tools.nodes_search',
	node_types_get: 'instanceAi.tools.node_types_get',
	credentials_list: 'instanceAi.tools.credentials_list',
};

export function getToolNameTranslationKey(
	toolName: string | undefined,
	output?: unknown,
): BaseTextKey | undefined {
	const trimmed = toolName?.trim();
	if (!trimmed) return undefined;

	if (trimmed === FIND_FILE_TOOL_NAME) return FIND_FILE_TOOL_NAME_KEY;
	if (trimmed === SEARCH_TEXT_TOOL_NAME) return SEARCH_TEXT_TOOL_NAME_KEY;
	if (trimmed === READ_FILE_TOOL_NAME) return READ_FILE_TOOL_NAME_KEY;
	if (trimmed === FLAG_MEMORY_TOOL_NAME && isMemoryNotedOutput(output)) {
		return FLAG_MEMORY_TOOL_NAME_KEY;
	}
	// Builder sessions saved before the rename carry the old tool names.
	const builderToolName = normalizeAgentBuilderToolName(trimmed);
	if (builderToolName in BUILDER_TOOL_TRANSLATION_KEYS) {
		return BUILDER_TOOL_TRANSLATION_KEYS[builderToolName];
	}

	return WEB_SEARCH_TOOL_NAME_PATTERN.test(trimmed) ? WEB_SEARCH_TOOL_NAME_KEY : undefined;
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
