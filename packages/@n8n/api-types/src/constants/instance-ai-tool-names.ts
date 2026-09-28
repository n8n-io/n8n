/**
 * Instance AI tool names before they moved to snake_case, mapped to the
 * current name. Stored threads, saved approvals, and recorded traces still
 * carry the old names, so every reader of a tool name normalizes it first.
 */
export const INSTANCE_AI_LEGACY_TOOL_NAMES: Readonly<Record<string, string>> = {
	'agent-context': 'agent_context',
	'apply-workflow-credentials': 'apply_workflow_credentials',
	'ask-user': 'ask_user',
	'build-agent': 'build_agent',
	'build-workflow': 'build_workflow',
	'complete-checkpoint': 'complete_checkpoint',
	'conversation-history': 'conversation_history',
	'create-tasks': 'create_plan',
	'data-tables': 'data_tables',
	'eval-config': 'eval_config',
	'get-session': 'get_session',
	'leave-onboarding': 'leave_onboarding',
	'materialize-node-type': 'materialize_node_type',
	'mcp-servers': 'mcp_servers',
	'n8n-docs': 'n8n_docs',
	'parse-file': 'parse_file',
	'report-verification-verdict': 'report_verification_verdict',
	searchModels: 'search_models',
	'task-control': 'task_control',
	'verify-built-workflow': 'verify_built_workflow',
	'write-file': 'write_sandbox_file',
};

/** Current name for an Instance AI tool. Unknown names pass through unchanged. */
export function normalizeInstanceAiToolName(toolName: string): string {
	return Object.hasOwn(INSTANCE_AI_LEGACY_TOOL_NAMES, toolName)
		? INSTANCE_AI_LEGACY_TOOL_NAMES[toolName]
		: toolName;
}
