/**
 * Registered names of the workflow builder and agent builder tools.
 *
 * Tool names are part of the model contract. They also appear in persisted
 * checkpoints, message history, and telemetry. When you rename a tool, add the
 * former name to `LEGACY_BUILDER_TOOL_NAMES` so stored data still resolves.
 */

/** Tools that the Instance AI orchestrator uses to build workflows. */
export const WORKFLOW_BUILDER_TOOL_NAMES = {
	LIST_WORKFLOWS: 'list_workflows',
	GET_WORKFLOW_NODE_USAGE: 'get_workflow_node_usage',
	GET_WORKFLOW: 'get_workflow',
	GET_WORKFLOW_AS_CODE: 'get_workflow_as_code',
	ARCHIVE_WORKFLOW: 'archive_workflow',
	UNARCHIVE_WORKFLOW: 'unarchive_workflow',
	SETUP_WORKFLOW: 'setup_workflow',
	VALIDATE_WORKFLOW: 'validate_workflow',
	PUBLISH_WORKFLOW: 'publish_workflow',
	UNPUBLISH_WORKFLOW: 'unpublish_workflow',
	LIST_WORKFLOW_VERSIONS: 'list_workflow_versions',
	RESTORE_WORKFLOW_VERSION: 'restore_workflow_version',
	UPDATE_WORKFLOW_VERSION: 'update_workflow_version',
	NODES: 'workflow_builder_nodes',
	LIST_EXECUTIONS: 'list_executions',
	GET_EXECUTION: 'get_execution',
	RUN_WORKFLOW: 'run_workflow',
	RUN_WORKFLOW_STEP: 'run_workflow_step',
	DEBUG_EXECUTION: 'debug_execution',
	GET_EXECUTION_NODE_OUTPUT: 'get_execution_node_output',
	GET_RESOLVED_NODE_PARAMETERS: 'get_resolved_node_parameters',
	STOP_EXECUTION: 'stop_execution',
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
	/** No longer registered. Builders use `get_node_parameter_options`. */
	GET_RESOURCE_LOCATOR_OPTIONS: 'agent_builder_get_resource_locator_options',
	CALL_AGENT: 'agent_builder_call_agent',
	PUBLISH_AGENT: 'agent_builder_publish_agent',
	UNPUBLISH_AGENT: 'agent_builder_unpublish_agent',
	RESOLVE_LLM: 'agent_builder_resolve_llm',
	VERIFY_MCP_SERVER: 'agent_builder_verify_mcp_server',
	/** No longer registered. Builders use `search_nodes`. */
	SEARCH_NODES: 'agent_builder_search_nodes',
	/** No longer registered. Builders use `get_node_types`. */
	GET_NODE_TYPES: 'agent_builder_get_node_types',
	/** No longer registered. Builders use `setup_credentials` with target `agent`. */
	ASK_CREDENTIAL: 'agent_builder_ask_credential',
	/** No longer registered. Builders use `setup_credentials` with `allowManaged`. */
	ASK_EMBEDDING_CREDENTIAL: 'agent_builder_ask_embedding_credential',
	/** No longer registered. Builders use `ask_user`. */
	ASK_QUESTIONS: 'agent_builder_ask_questions',
	CONFIGURE_CHANNEL: 'agent_builder_configure_channel',
} as const;

/** Orchestrator tools that both builders use. These names have no builder prefix. */
export const SHARED_BUILDER_TOOL_NAMES = {
	ASK_USER: 'ask_user',
	SEARCH_MODELS: 'search_models',
	LIST_CREDENTIALS: 'list_credentials',
	SEARCH_CREDENTIAL_TYPES: 'search_credential_types',
	SETUP_CREDENTIALS: 'setup_credentials',
	TEST_CREDENTIAL: 'test_credential',
	DELETE_CREDENTIAL: 'delete_credential',
	UPDATE_CREDENTIAL_DESCRIPTION: 'update_credential_description',
	LIST_DATA_TABLES: 'list_data_tables',
	GET_DATA_TABLE_SCHEMA: 'get_data_table_schema',
	QUERY_DATA_TABLE: 'query_data_table',
	CREATE_DATA_TABLE: 'create_data_table',
	DELETE_DATA_TABLE: 'delete_data_table',
	ADD_DATA_TABLE_COLUMN: 'add_data_table_column',
	DELETE_DATA_TABLE_COLUMN: 'delete_data_table_column',
	RENAME_DATA_TABLE_COLUMN: 'rename_data_table_column',
	INSERT_DATA_TABLE_ROWS: 'insert_data_table_rows',
	UPDATE_DATA_TABLE_ROWS: 'update_data_table_rows',
	DELETE_DATA_TABLE_ROWS: 'delete_data_table_rows',
	LIST_PROJECTS: 'list_projects',
	LIST_TAGS: 'list_tags',
	TAG_WORKFLOW: 'tag_workflow',
	CLEANUP_TEST_EXECUTIONS: 'cleanup_test_executions',
	LIST_FOLDERS: 'list_folders',
	CREATE_FOLDER: 'create_folder',
	DELETE_FOLDER: 'delete_folder',
	MOVE_WORKFLOW_TO_FOLDER: 'move_workflow_to_folder',
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
	nodes: WORKFLOW_BUILDER_TOOL_NAMES.NODES,
	'ask-user': SHARED_BUILDER_TOOL_NAMES.ASK_USER,
	workflow_builder_ask_user: SHARED_BUILDER_TOOL_NAMES.ASK_USER,
	searchModels: SHARED_BUILDER_TOOL_NAMES.SEARCH_MODELS,
	workflow_builder_search_models: SHARED_BUILDER_TOOL_NAMES.SEARCH_MODELS,
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
	ask_questions: SHARED_BUILDER_TOOL_NAMES.ASK_USER,
	agent_builder_ask_questions: SHARED_BUILDER_TOOL_NAMES.ASK_USER,
	configure_channel: AGENT_BUILDER_TOOL_NAMES.CONFIGURE_CHANNEL,
};

interface SplitBuilderTool {
	/** The current tool for each action of the former tool. */
	actions: Readonly<Record<string, string>>;
	/**
	 * The current tool that resumes every persisted suspended call of the former
	 * tool. Omit it to resume each call in the tool that owns its action.
	 */
	resumedBy?: string;
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

/** The tool that owns each action of the former multi-action workflows tool. */
export const WORKFLOW_TOOL_NAME_BY_ACTION = {
	list: WORKFLOW_BUILDER_TOOL_NAMES.LIST_WORKFLOWS,
	'node-usage': WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW_NODE_USAGE,
	get: WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW,
	'get-as-code': WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW_AS_CODE,
	delete: WORKFLOW_BUILDER_TOOL_NAMES.ARCHIVE_WORKFLOW,
	unarchive: WORKFLOW_BUILDER_TOOL_NAMES.UNARCHIVE_WORKFLOW,
	setup: WORKFLOW_BUILDER_TOOL_NAMES.SETUP_WORKFLOW,
	validate: WORKFLOW_BUILDER_TOOL_NAMES.VALIDATE_WORKFLOW,
	publish: WORKFLOW_BUILDER_TOOL_NAMES.PUBLISH_WORKFLOW,
	unpublish: WORKFLOW_BUILDER_TOOL_NAMES.UNPUBLISH_WORKFLOW,
	'list-versions': WORKFLOW_BUILDER_TOOL_NAMES.LIST_WORKFLOW_VERSIONS,
	'restore-version': WORKFLOW_BUILDER_TOOL_NAMES.RESTORE_WORKFLOW_VERSION,
	'update-version': WORKFLOW_BUILDER_TOOL_NAMES.UPDATE_WORKFLOW_VERSION,
} as const;

export const WORKFLOW_TOOL_NAMES: readonly string[] = Object.values(WORKFLOW_TOOL_NAME_BY_ACTION);

const SPLIT_WORKFLOWS_TOOL: SplitBuilderTool = { actions: WORKFLOW_TOOL_NAME_BY_ACTION };

/** The tool that owns each action of the former multi-action data tables tool. */
export const DATA_TABLE_TOOL_NAME_BY_ACTION = {
	list: SHARED_BUILDER_TOOL_NAMES.LIST_DATA_TABLES,
	schema: SHARED_BUILDER_TOOL_NAMES.GET_DATA_TABLE_SCHEMA,
	query: SHARED_BUILDER_TOOL_NAMES.QUERY_DATA_TABLE,
	create: SHARED_BUILDER_TOOL_NAMES.CREATE_DATA_TABLE,
	delete: SHARED_BUILDER_TOOL_NAMES.DELETE_DATA_TABLE,
	'add-column': SHARED_BUILDER_TOOL_NAMES.ADD_DATA_TABLE_COLUMN,
	'delete-column': SHARED_BUILDER_TOOL_NAMES.DELETE_DATA_TABLE_COLUMN,
	'rename-column': SHARED_BUILDER_TOOL_NAMES.RENAME_DATA_TABLE_COLUMN,
	'insert-rows': SHARED_BUILDER_TOOL_NAMES.INSERT_DATA_TABLE_ROWS,
	'update-rows': SHARED_BUILDER_TOOL_NAMES.UPDATE_DATA_TABLE_ROWS,
	'delete-rows': SHARED_BUILDER_TOOL_NAMES.DELETE_DATA_TABLE_ROWS,
} as const;

export type DataTableToolAction = keyof typeof DATA_TABLE_TOOL_NAME_BY_ACTION;

export const DATA_TABLE_TOOL_NAMES: readonly string[] = Object.values(
	DATA_TABLE_TOOL_NAME_BY_ACTION,
);

function isDataTableToolAction(key: string): key is DataTableToolAction {
	return Object.hasOwn(DATA_TABLE_TOOL_NAME_BY_ACTION, key);
}

/** Derived from the map, so a new action always gets a registered tool. */
export const DATA_TABLE_TOOL_ACTIONS: readonly DataTableToolAction[] = Object.keys(
	DATA_TABLE_TOOL_NAME_BY_ACTION,
).filter(isDataTableToolAction);

/** Returns the action that a data table tool performs. Session grant keys still use the action. */
export function getDataTableToolAction(toolName: string): DataTableToolAction | undefined {
	return DATA_TABLE_TOOL_ACTIONS.find(
		(action) => DATA_TABLE_TOOL_NAME_BY_ACTION[action] === toolName,
	);
}

const SPLIT_DATA_TABLES_TOOL: SplitBuilderTool = { actions: DATA_TABLE_TOOL_NAME_BY_ACTION };

/** The tool that owns each action of the former multi-action executions tool. */
export const EXECUTION_TOOL_NAME_BY_ACTION = {
	list: WORKFLOW_BUILDER_TOOL_NAMES.LIST_EXECUTIONS,
	get: WORKFLOW_BUILDER_TOOL_NAMES.GET_EXECUTION,
	run: WORKFLOW_BUILDER_TOOL_NAMES.RUN_WORKFLOW,
	'run-step': WORKFLOW_BUILDER_TOOL_NAMES.RUN_WORKFLOW_STEP,
	debug: WORKFLOW_BUILDER_TOOL_NAMES.DEBUG_EXECUTION,
	'get-node-output': WORKFLOW_BUILDER_TOOL_NAMES.GET_EXECUTION_NODE_OUTPUT,
	'get-resolved-node-parameters': WORKFLOW_BUILDER_TOOL_NAMES.GET_RESOLVED_NODE_PARAMETERS,
	stop: WORKFLOW_BUILDER_TOOL_NAMES.STOP_EXECUTION,
} as const;

export type ExecutionToolAction = keyof typeof EXECUTION_TOOL_NAME_BY_ACTION;

export const EXECUTION_TOOL_NAMES: readonly string[] = Object.values(EXECUTION_TOOL_NAME_BY_ACTION);

function isExecutionToolAction(key: string): key is ExecutionToolAction {
	return Object.hasOwn(EXECUTION_TOOL_NAME_BY_ACTION, key);
}

/** Derived from the map, so a new action always gets a registered tool. */
export const EXECUTION_TOOL_ACTIONS: readonly ExecutionToolAction[] = Object.keys(
	EXECUTION_TOOL_NAME_BY_ACTION,
).filter(isExecutionToolAction);

const SPLIT_EXECUTIONS_TOOL: SplitBuilderTool = { actions: EXECUTION_TOOL_NAME_BY_ACTION };

/** The tool that owns each action of the former multi-action `workspace` tool. */
export const WORKSPACE_TOOL_NAME_BY_ACTION = {
	'list-projects': SHARED_BUILDER_TOOL_NAMES.LIST_PROJECTS,
	'list-tags': SHARED_BUILDER_TOOL_NAMES.LIST_TAGS,
	'tag-workflow': SHARED_BUILDER_TOOL_NAMES.TAG_WORKFLOW,
	'cleanup-test-executions': SHARED_BUILDER_TOOL_NAMES.CLEANUP_TEST_EXECUTIONS,
	'list-folders': SHARED_BUILDER_TOOL_NAMES.LIST_FOLDERS,
	'create-folder': SHARED_BUILDER_TOOL_NAMES.CREATE_FOLDER,
	'delete-folder': SHARED_BUILDER_TOOL_NAMES.DELETE_FOLDER,
	'move-workflow-to-folder': SHARED_BUILDER_TOOL_NAMES.MOVE_WORKFLOW_TO_FOLDER,
} as const;

export type WorkspaceToolAction = keyof typeof WORKSPACE_TOOL_NAME_BY_ACTION;

export const WORKSPACE_ACTION_TOOL_NAMES: readonly string[] = Object.values(
	WORKSPACE_TOOL_NAME_BY_ACTION,
);

function isWorkspaceToolAction(key: string): key is WorkspaceToolAction {
	return Object.hasOwn(WORKSPACE_TOOL_NAME_BY_ACTION, key);
}

/** Derived from the map, so a new action always gets a registered tool. */
export const WORKSPACE_TOOL_ACTIONS: readonly WorkspaceToolAction[] = Object.keys(
	WORKSPACE_TOOL_NAME_BY_ACTION,
).filter(isWorkspaceToolAction);

/** Folder actions. The tools exist only when the workspace service supports folders. */
export const WORKSPACE_FOLDER_TOOL_ACTIONS: readonly WorkspaceToolAction[] = [
	'list-folders',
	'create-folder',
	'delete-folder',
	'move-workflow-to-folder',
];

const SPLIT_WORKSPACE_TOOL: SplitBuilderTool = { actions: WORKSPACE_TOOL_NAME_BY_ACTION };

/** Former multi-action tools that became one tool for each action. Never remove an entry. */
export const SPLIT_BUILDER_TOOLS: Readonly<Record<string, SplitBuilderTool>> = {
	credentials: SPLIT_CREDENTIALS_TOOL,
	workflow_builder_credentials: SPLIT_CREDENTIALS_TOOL,
	workflows: SPLIT_WORKFLOWS_TOOL,
	workflow_builder_workflows: SPLIT_WORKFLOWS_TOOL,
	'data-tables': SPLIT_DATA_TABLES_TOOL,
	data_tables: SPLIT_DATA_TABLES_TOOL,
	executions: SPLIT_EXECUTIONS_TOOL,
	workflow_builder_executions: SPLIT_EXECUTIONS_TOOL,
	workspace: SPLIT_WORKSPACE_TOOL,
};

const hasOwn = (record: object, key: string) => Object.prototype.hasOwnProperty.call(record, key);

/**
 * Whether a stored tool name is the former multi-action workflows tool. Its
 * stored calls can carry an action that no tool owns now, such as `update`.
 */
export function isFormerWorkflowsTool(toolName: string): boolean {
	return (
		hasOwn(SPLIT_BUILDER_TOOLS, toolName) && SPLIT_BUILDER_TOOLS[toolName] === SPLIT_WORKFLOWS_TOOL
	);
}

/** Whether a stored tool name is the former multi-action data tables tool. */
export function isFormerDataTablesTool(toolName: string): boolean {
	return (
		hasOwn(SPLIT_BUILDER_TOOLS, toolName) &&
		SPLIT_BUILDER_TOOLS[toolName] === SPLIT_DATA_TABLES_TOOL
	);
}

/**
 * Returns the data table action of a tool call, for a current data table tool or
 * a stored call of the former multi-action tool. Returns `undefined` for other tools.
 */
export function getDataTableCallAction(
	toolName: string,
	action?: unknown,
): DataTableToolAction | undefined {
	if (isFormerDataTablesTool(toolName)) {
		return DATA_TABLE_TOOL_ACTIONS.find((known) => known === action);
	}
	return getDataTableToolAction(toolName);
}

/** Whether a stored tool name is the former multi-action executions tool. */
export function isFormerExecutionsTool(toolName: string): boolean {
	return (
		hasOwn(SPLIT_BUILDER_TOOLS, toolName) && SPLIT_BUILDER_TOOLS[toolName] === SPLIT_EXECUTIONS_TOOL
	);
}

/**
 * Returns the execution action of a tool call, for a current execution tool or a
 * stored call of the former multi-action tool. Returns `undefined` for other tools.
 */
export function getExecutionCallAction(
	toolName: string,
	action?: unknown,
): ExecutionToolAction | undefined {
	if (isFormerExecutionsTool(toolName)) {
		return EXECUTION_TOOL_ACTIONS.find((known) => known === action);
	}
	return EXECUTION_TOOL_ACTIONS.find((known) => EXECUTION_TOOL_NAME_BY_ACTION[known] === toolName);
}

/** Whether a stored tool name is the former multi-action workspace tool. */
export function isFormerWorkspaceTool(toolName: string): boolean {
	return (
		hasOwn(SPLIT_BUILDER_TOOLS, toolName) && SPLIT_BUILDER_TOOLS[toolName] === SPLIT_WORKSPACE_TOOL
	);
}

/**
 * Returns the workspace action of a tool call, for a current workspace tool or a
 * stored call of the former multi-action tool. Returns `undefined` for other tools.
 */
export function getWorkspaceCallAction(
	toolName: string,
	action?: unknown,
): WorkspaceToolAction | undefined {
	if (isFormerWorkspaceTool(toolName)) {
		return WORKSPACE_TOOL_ACTIONS.find((known) => known === action);
	}
	return WORKSPACE_TOOL_ACTIONS.find((known) => WORKSPACE_TOOL_NAME_BY_ACTION[known] === toolName);
}

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

/**
 * Former split tools whose calls of some actions resolve to this tool, as
 * `[former name, actions]` pairs. Pass each pair to `Tool.legacyActions`.
 */
export function getLegacyBuilderToolActions(toolName: string): Array<[string, string[]]> {
	return Object.entries(SPLIT_BUILDER_TOOLS)
		.filter(([, { resumedBy }]) => resumedBy === undefined)
		.map(([legacyName, { actions }]): [string, string[]] => [
			legacyName,
			Object.entries(actions)
				.filter(([, current]) => current === toolName)
				.map(([action]) => action),
		])
		.filter(([, actions]) => actions.length > 0);
}
