/**
 * Instance AI tool names before tools were named `domain_action`, mapped to the
 * current name. Stored threads, saved approvals, and recorded traces still carry
 * the old names, so every reader of a tool name normalizes it first.
 */
export const INSTANCE_AI_LEGACY_TOOL_NAMES: Readonly<Record<string, string>> = {
	'agent-context': 'agent_context',
	'apply-workflow-credentials': 'workflow_credentials_apply',
	'ask-user': 'user_ask',
	'build-agent': 'agent_build',
	'build-workflow': 'workflow_build',
	'complete-checkpoint': 'checkpoint_complete',
	'conversation-history': 'conversation_history',
	'create-tasks': 'plan_create',
	'data-tables': 'data_tables',
	'eval-config': 'eval_config',
	'get-session': 'agent_session_get',
	'leave-onboarding': 'onboarding_leave',
	'materialize-node-type': 'node_type_materialize',
	'mcp-servers': 'mcp_servers',
	'n8n-docs': 'n8n_docs',
	'parse-file': 'file_parse',
	'report-verification-verdict': 'verification_report',
	save_user_preference: 'user_preference_save',
	searchModels: 'models_search',
	'task-control': 'task_control',
	'verify-built-workflow': 'workflow_verify',
	'write-file': 'sandbox_file_write',
};

/**
 * Agent-builder tool names before the rename. Kept apart from the Instance AI
 * map: several old names (`search_nodes`, `list_credentials`, `publish_agent`)
 * are also live tools on n8n's MCP server, so they are only renamed inside
 * builder sessions.
 */
export const AGENT_BUILDER_LEGACY_TOOL_NAMES: Readonly<Record<string, string>> = {
	'agent-context': 'agent_context',
	ask_credential: 'credential_ask',
	ask_embedding_credential: 'embedding_credential_ask',
	ask_questions: 'user_questions_ask',
	build_custom_tool: 'custom_tool_build',
	call_agent: 'agent_call',
	configure_channel: 'channel_configure',
	create_skills: 'skills_create',
	create_tasks: 'tasks_create',
	finish_setup: 'setup_finish',
	get_node_types: 'node_types_get',
	get_resource_locator_options: 'resource_locator_options_get',
	list_credentials: 'credentials_list',
	patch_config: 'config_patch',
	publish_agent: 'agent_publish',
	report_required_artifact: 'required_artifact_report',
	resolve_llm: 'llm_resolve',
	search_nodes: 'nodes_search',
	unpublish_agent: 'agent_unpublish',
	update_skill: 'skill_update',
	update_task: 'task_update',
	verify_mcp_server: 'mcp_server_verify',
	write_config: 'config_write',
};

/** Current name for an Instance AI tool. Unknown names pass through unchanged. */
export function normalizeInstanceAiToolName(toolName: string): string {
	return Object.hasOwn(INSTANCE_AI_LEGACY_TOOL_NAMES, toolName)
		? INSTANCE_AI_LEGACY_TOOL_NAMES[toolName]
		: toolName;
}

/** Current name for an agent-builder tool. Unknown names pass through unchanged. */
export function normalizeAgentBuilderToolName(toolName: string): string {
	return Object.hasOwn(AGENT_BUILDER_LEGACY_TOOL_NAMES, toolName)
		? AGENT_BUILDER_LEGACY_TOOL_NAMES[toolName]
		: toolName;
}
