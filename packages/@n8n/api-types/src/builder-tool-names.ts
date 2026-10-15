/**
 * Registered names of the Agent Builder tools.
 *
 * Tool names are part of the model contract. They also appear in persisted
 * message history and telemetry. When you rename a tool, add the former name
 * to `LEGACY_BUILDER_TOOL_NAMES` so stored data still resolves.
 */

/** Tools that the Instance AI orchestrator uses to build Agents. */
export const AGENT_BUILDER_TOOL_NAMES = {
	/** No longer registered. Stored threads still contain its calls and results. */
	BUILD_AGENT: 'build-agent',
	SELECT_AGENT: 'agent_select',
	WRITE_CONFIG: 'agent_write_config',
	PATCH_CONFIG: 'agent_patch_config',
	BUILD_CUSTOM_TOOL: 'agent_build_custom_tool',
	CREATE_SKILLS: 'agent_create_skills',
	UPDATE_SKILL: 'agent_update_skill',
	CREATE_TASKS: 'agent_create_tasks',
	UPDATE_TASK: 'agent_update_task',
	FINISH_SETUP: 'agent_finish_setup',
	GET_RESOURCE_LOCATOR_OPTIONS: 'get_resource_locator_options',
	CALL_AGENT: 'agent_call',
	PUBLISH_AGENT: 'agent_publish',
	UNPUBLISH_AGENT: 'agent_unpublish',
	RESOLVE_LLM: 'agent_resolve_llm',
	VERIFY_MCP_SERVER: 'agent_verify_mcp_server',
	SEARCH_NODES: 'search_nodes',
	GET_NODE_TYPES: 'get_node_types',
	LIST_CREDENTIALS: 'list_credentials',
	ASK_CREDENTIAL: 'agent_ask_credential',
	ASK_EMBEDDING_CREDENTIAL: 'agent_ask_embedding_credential',
	ASK_QUESTIONS: 'ask_questions',
	CONFIGURE_CHANNEL: 'agent_configure_channel',
} as const;

export type AgentBuilderToolName =
	(typeof AGENT_BUILDER_TOOL_NAMES)[keyof typeof AGENT_BUILDER_TOOL_NAMES];

/** Former tool names mapped to their current names. Never remove an entry. */
export const LEGACY_BUILDER_TOOL_NAMES: Readonly<Record<string, string>> = {
	// Former Agent Builder sub-agent tools. Only stored threads use these names.
	write_config: AGENT_BUILDER_TOOL_NAMES.WRITE_CONFIG,
	patch_config: AGENT_BUILDER_TOOL_NAMES.PATCH_CONFIG,
	build_custom_tool: AGENT_BUILDER_TOOL_NAMES.BUILD_CUSTOM_TOOL,
	create_skills: AGENT_BUILDER_TOOL_NAMES.CREATE_SKILLS,
	update_skill: AGENT_BUILDER_TOOL_NAMES.UPDATE_SKILL,
	create_tasks: AGENT_BUILDER_TOOL_NAMES.CREATE_TASKS,
	update_task: AGENT_BUILDER_TOOL_NAMES.UPDATE_TASK,
	finish_setup: AGENT_BUILDER_TOOL_NAMES.FINISH_SETUP,
	call_agent: AGENT_BUILDER_TOOL_NAMES.CALL_AGENT,
	publish_agent: AGENT_BUILDER_TOOL_NAMES.PUBLISH_AGENT,
	unpublish_agent: AGENT_BUILDER_TOOL_NAMES.UNPUBLISH_AGENT,
	resolve_llm: AGENT_BUILDER_TOOL_NAMES.RESOLVE_LLM,
	verify_mcp_server: AGENT_BUILDER_TOOL_NAMES.VERIFY_MCP_SERVER,
	ask_credential: AGENT_BUILDER_TOOL_NAMES.ASK_CREDENTIAL,
	ask_embedding_credential: AGENT_BUILDER_TOOL_NAMES.ASK_EMBEDDING_CREDENTIAL,
	configure_channel: AGENT_BUILDER_TOOL_NAMES.CONFIGURE_CHANNEL,
};

/** Returns the current name for a former builder tool name, or the name unchanged. */
export function resolveBuilderToolName(toolName: string): string {
	return Object.prototype.hasOwnProperty.call(LEGACY_BUILDER_TOOL_NAMES, toolName)
		? LEGACY_BUILDER_TOOL_NAMES[toolName]
		: toolName;
}
