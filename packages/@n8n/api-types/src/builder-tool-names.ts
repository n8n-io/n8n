/**
 * Registered names of the workflow builder and agent builder tools.
 *
 * Tool names are part of the model contract. They also appear in persisted
 * checkpoints, message history, and telemetry. When you rename a tool, add the
 * former name to `LEGACY_BUILDER_TOOL_NAMES` so stored data still resolves.
 */

/** Tools that the Instance AI orchestrator uses to build workflows. */
export const WORKFLOW_BUILDER_TOOL_NAMES = {
	WORKFLOWS: 'workflow_builder_workflows',
	NODES: 'workflow_builder_nodes',
	EXECUTIONS: 'workflow_builder_executions',
	ASK_USER: 'workflow_builder_ask_user',
	SEARCH_MODELS: 'workflow_builder_search_models',
	BUILD_WORKFLOW: 'workflow_builder_build_workflow',
	VERIFY_BUILT_WORKFLOW: 'workflow_builder_verify_built_workflow',
	REPORT_VERIFICATION_VERDICT: 'workflow_builder_report_verification_verdict',
	APPLY_WORKFLOW_CREDENTIALS: 'workflow_builder_apply_workflow_credentials',
	TASK_CONTROL: 'workflow_builder_task_control',
} as const;

/** Tools that the Instance AI orchestrator uses to build Agents. */
export const AGENT_BUILDER_TOOL_NAMES = {
	/** No longer registered. Stored threads still contain its calls and results. */
	BUILD_AGENT: 'agent_builder_build_agent',
	SELECT_AGENT: 'agent_builder_select_agent',
	WRITE_CONFIG: 'agent_builder_write_config',
	PATCH_CONFIG: 'agent_builder_patch_config',
	BUILD_CUSTOM_TOOL: 'agent_builder_build_custom_tool',
	CREATE_SKILLS: 'agent_builder_create_skills',
	UPDATE_SKILL: 'agent_builder_update_skill',
	CREATE_TASKS: 'agent_builder_create_tasks',
	UPDATE_TASK: 'agent_builder_update_task',
	FINISH_SETUP: 'agent_builder_finish_setup',
	GET_RESOURCE_LOCATOR_OPTIONS: 'agent_builder_get_resource_locator_options',
	CALL_AGENT: 'agent_builder_call_agent',
	PUBLISH_AGENT: 'agent_builder_publish_agent',
	UNPUBLISH_AGENT: 'agent_builder_unpublish_agent',
	RESOLVE_LLM: 'agent_builder_resolve_llm',
	VERIFY_MCP_SERVER: 'agent_builder_verify_mcp_server',
	SEARCH_NODES: 'agent_builder_search_nodes',
	GET_NODE_TYPES: 'agent_builder_get_node_types',
	/** No longer registered. Builders use `setup_credentials` with target `agent`. */
	ASK_CREDENTIAL: 'agent_builder_ask_credential',
	/** No longer registered. Builders use `setup_credentials` with `allowManaged`. */
	ASK_EMBEDDING_CREDENTIAL: 'agent_builder_ask_embedding_credential',
	ASK_QUESTIONS: 'agent_builder_ask_questions',
	CONFIGURE_CHANNEL: 'agent_builder_configure_channel',
} as const;

/** Orchestrator tools that both builders use. These names have no builder prefix. */
export const SHARED_BUILDER_TOOL_NAMES = {
	LIST_CREDENTIALS: 'list_credentials',
	SEARCH_CREDENTIAL_TYPES: 'search_credential_types',
	SETUP_CREDENTIALS: 'setup_credentials',
	TEST_CREDENTIAL: 'test_credential',
	DELETE_CREDENTIAL: 'delete_credential',
	UPDATE_CREDENTIAL_DESCRIPTION: 'update_credential_description',
	DATA_TABLES: 'data_tables',
	SEARCH_NODES: 'search_nodes',
	GET_NODE_TYPES: 'get_node_types',
	GET_NODE_PARAMETER_OPTIONS: 'get_node_parameter_options',
	EXECUTE_NODE: 'execute_node',
} as const;

export type WorkflowBuilderToolName =
	(typeof WORKFLOW_BUILDER_TOOL_NAMES)[keyof typeof WORKFLOW_BUILDER_TOOL_NAMES];
export type AgentBuilderToolName =
	(typeof AGENT_BUILDER_TOOL_NAMES)[keyof typeof AGENT_BUILDER_TOOL_NAMES];
export type SharedBuilderToolName =
	(typeof SHARED_BUILDER_TOOL_NAMES)[keyof typeof SHARED_BUILDER_TOOL_NAMES];

/**
 * Names of removed tools that have no current replacement. Older traces and
 * stored conversations can still contain these names. Never remove an entry.
 */
export const REMOVED_BUILDER_TOOL_NAMES = {
	SUBMIT_WORKFLOW: 'submit-workflow',
	PATCH_WORKFLOW: 'patch-workflow',
	BUILD_WORKFLOW_WITH_AGENT: 'build-workflow-with-agent',
	RESEARCH_WITH_AGENT: 'research-with-agent',
	EVAL_SETUP_WITH_AGENT: 'eval-setup-with-agent',
	CREATE_TASKS: 'workflow_builder_create_tasks',
	COMPLETE_CHECKPOINT: 'workflow_builder_complete_checkpoint',
} as const;

/** Former tool names mapped to their current names. Never remove an entry. */
export const LEGACY_BUILDER_TOOL_NAMES: Readonly<Record<string, string>> = {
	workflows: WORKFLOW_BUILDER_TOOL_NAMES.WORKFLOWS,
	nodes: WORKFLOW_BUILDER_TOOL_NAMES.NODES,
	executions: WORKFLOW_BUILDER_TOOL_NAMES.EXECUTIONS,
	'data-tables': SHARED_BUILDER_TOOL_NAMES.DATA_TABLES,
	'ask-user': WORKFLOW_BUILDER_TOOL_NAMES.ASK_USER,
	searchModels: WORKFLOW_BUILDER_TOOL_NAMES.SEARCH_MODELS,
	'build-workflow': WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
	'verify-built-workflow': WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW,
	'report-verification-verdict': WORKFLOW_BUILDER_TOOL_NAMES.REPORT_VERIFICATION_VERDICT,
	'apply-workflow-credentials': WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
	'create-tasks': REMOVED_BUILDER_TOOL_NAMES.CREATE_TASKS,
	'task-control': WORKFLOW_BUILDER_TOOL_NAMES.TASK_CONTROL,
	'complete-checkpoint': REMOVED_BUILDER_TOOL_NAMES.COMPLETE_CHECKPOINT,
	'build-agent': AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT,
	write_config: AGENT_BUILDER_TOOL_NAMES.WRITE_CONFIG,
	patch_config: AGENT_BUILDER_TOOL_NAMES.PATCH_CONFIG,
	build_custom_tool: AGENT_BUILDER_TOOL_NAMES.BUILD_CUSTOM_TOOL,
	create_skills: AGENT_BUILDER_TOOL_NAMES.CREATE_SKILLS,
	update_skill: AGENT_BUILDER_TOOL_NAMES.UPDATE_SKILL,
	create_tasks: AGENT_BUILDER_TOOL_NAMES.CREATE_TASKS,
	update_task: AGENT_BUILDER_TOOL_NAMES.UPDATE_TASK,
	finish_setup: AGENT_BUILDER_TOOL_NAMES.FINISH_SETUP,
	get_resource_locator_options: SHARED_BUILDER_TOOL_NAMES.GET_NODE_PARAMETER_OPTIONS,
	agent_builder_get_resource_locator_options: SHARED_BUILDER_TOOL_NAMES.GET_NODE_PARAMETER_OPTIONS,
	call_agent: AGENT_BUILDER_TOOL_NAMES.CALL_AGENT,
	publish_agent: AGENT_BUILDER_TOOL_NAMES.PUBLISH_AGENT,
	unpublish_agent: AGENT_BUILDER_TOOL_NAMES.UNPUBLISH_AGENT,
	resolve_llm: AGENT_BUILDER_TOOL_NAMES.RESOLVE_LLM,
	verify_mcp_server: AGENT_BUILDER_TOOL_NAMES.VERIFY_MCP_SERVER,
	agent_builder_search_nodes: SHARED_BUILDER_TOOL_NAMES.SEARCH_NODES,
	agent_builder_get_node_types: SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES,
	agent_builder_list_credentials: SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS,
	ask_credential: AGENT_BUILDER_TOOL_NAMES.ASK_CREDENTIAL,
	ask_embedding_credential: AGENT_BUILDER_TOOL_NAMES.ASK_EMBEDDING_CREDENTIAL,
	ask_questions: AGENT_BUILDER_TOOL_NAMES.ASK_QUESTIONS,
	configure_channel: AGENT_BUILDER_TOOL_NAMES.CONFIGURE_CHANNEL,
};

interface SplitBuilderTool {
	/** The current tool for each action of the former tool. */
	actions: Readonly<Record<string, string>>;
	/** The current tool that resumes persisted suspended calls of the former tool. */
	resumedBy: string;
}

const SPLIT_CREDENTIALS_TOOL: SplitBuilderTool = {
	actions: {
		list: SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS,
		get: SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS,
		'search-types': SHARED_BUILDER_TOOL_NAMES.SEARCH_CREDENTIAL_TYPES,
		setup: SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS,
		test: SHARED_BUILDER_TOOL_NAMES.TEST_CREDENTIAL,
		delete: SHARED_BUILDER_TOOL_NAMES.DELETE_CREDENTIAL,
	},
	resumedBy: SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS,
};

/** Former multi-action tools that became one tool for each action. Never remove an entry. */
export const SPLIT_BUILDER_TOOLS: Readonly<Record<string, SplitBuilderTool>> = {
	credentials: SPLIT_CREDENTIALS_TOOL,
	workflow_builder_credentials: SPLIT_CREDENTIALS_TOOL,
};

const hasOwn = (record: object, key: string) => Object.prototype.hasOwnProperty.call(record, key);

/**
 * Returns the current name for a former builder tool name, or the name unchanged.
 * Pass the call's `action` argument to resolve a call of a split tool.
 */
export function resolveBuilderToolName(toolName: string, action?: unknown): string {
	if (hasOwn(SPLIT_BUILDER_TOOLS, toolName)) {
		const { actions } = SPLIT_BUILDER_TOOLS[toolName];
		return typeof action === 'string' && hasOwn(actions, action) ? actions[action] : toolName;
	}
	return hasOwn(LEGACY_BUILDER_TOOL_NAMES, toolName)
		? LEGACY_BUILDER_TOOL_NAMES[toolName]
		: toolName;
}

/** Returns every former name of a builder tool. */
export function getLegacyBuilderToolNames(toolName: string): string[] {
	const renamed = Object.entries(LEGACY_BUILDER_TOOL_NAMES)
		.filter(([, current]) => current === toolName)
		.map(([legacy]) => legacy);
	const split = Object.entries(SPLIT_BUILDER_TOOLS)
		.filter(([, { resumedBy }]) => resumedBy === toolName)
		.map(([legacy]) => legacy);
	return [...renamed, ...split];
}
