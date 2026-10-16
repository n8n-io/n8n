/**
 * Registered names of the workflow builder and agent builder tools.
 *
 * Tool names are part of the model contract. They also appear in persisted
 * checkpoints, message history, and telemetry. When you rename a tool, add the
 * former name to `LEGACY_BUILDER_TOOL_NAMES` so stored data still resolves.
 */

/** Tools that the Instance AI orchestrator uses to build workflows. */
export const WORKFLOW_BUILDER_TOOL_NAMES = {
	WORKFLOWS: 'workflows',
	NODES: 'nodes',
	CREDENTIALS: 'credentials',
	EXECUTIONS: 'workflow_executions',
	DATA_TABLES: 'data_tables',
	ASK_USER: 'ask_user',
	SEARCH_MODELS: 'workflow_search_models',
	BUILD_WORKFLOW: 'workflow_build',
	VERIFY_BUILT_WORKFLOW: 'workflow_verify_built',
	REPORT_VERIFICATION_VERDICT: 'workflow_report_verification_verdict',
	APPLY_WORKFLOW_CREDENTIALS: 'workflow_apply_credentials',
	CREATE_TASKS: 'workflow_create_tasks',
	TASK_CONTROL: 'workflow_task_control',
	COMPLETE_CHECKPOINT: 'workflow_complete_checkpoint',
} as const;

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
	/** No longer registered: `ask_user` replaces it. Stored threads still contain its calls. */
	ASK_QUESTIONS: 'ask_questions',
	CONFIGURE_CHANNEL: 'agent_configure_channel',
} as const;

/** Agent Builder tool names that the orchestrator no longer registers. */
export const RETIRED_AGENT_BUILDER_TOOL_NAMES: ReadonlySet<string> = new Set([
	AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT,
	AGENT_BUILDER_TOOL_NAMES.ASK_QUESTIONS,
]);

export type WorkflowBuilderToolName =
	(typeof WORKFLOW_BUILDER_TOOL_NAMES)[keyof typeof WORKFLOW_BUILDER_TOOL_NAMES];
export type AgentBuilderToolName =
	(typeof AGENT_BUILDER_TOOL_NAMES)[keyof typeof AGENT_BUILDER_TOOL_NAMES];

/** Former tool names mapped to their current names. Never remove an entry. */
export const LEGACY_BUILDER_TOOL_NAMES: Readonly<Record<string, string>> = {
	executions: WORKFLOW_BUILDER_TOOL_NAMES.EXECUTIONS,
	'data-tables': WORKFLOW_BUILDER_TOOL_NAMES.DATA_TABLES,
	'ask-user': WORKFLOW_BUILDER_TOOL_NAMES.ASK_USER,
	searchModels: WORKFLOW_BUILDER_TOOL_NAMES.SEARCH_MODELS,
	'build-workflow': WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
	'verify-built-workflow': WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW,
	'report-verification-verdict': WORKFLOW_BUILDER_TOOL_NAMES.REPORT_VERIFICATION_VERDICT,
	'apply-workflow-credentials': WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
	'create-tasks': WORKFLOW_BUILDER_TOOL_NAMES.CREATE_TASKS,
	'task-control': WORKFLOW_BUILDER_TOOL_NAMES.TASK_CONTROL,
	'complete-checkpoint': WORKFLOW_BUILDER_TOOL_NAMES.COMPLETE_CHECKPOINT,
	'leave-onboarding': 'leave_onboarding',
	'eval-config': 'eval_config',
	'mcp-servers': 'mcp_servers',
	'conversation-history': 'conversation_history',
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

/** Returns every former name of a builder tool. */
export function getLegacyBuilderToolNames(toolName: string): string[] {
	return Object.entries(LEGACY_BUILDER_TOOL_NAMES)
		.filter(([, current]) => current === toolName)
		.map(([legacy]) => legacy);
}
