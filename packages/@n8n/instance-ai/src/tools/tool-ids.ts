import { isAgentFeatureEnabled } from '../utils/agent-feature-enabled';

export const DOMAIN_TOOL_IDS = {
	WORKFLOWS: 'workflows',
	EVAL_CONFIG: 'eval_config',
	EXECUTIONS: 'executions',
	CREDENTIALS: 'credentials',
	DATA_TABLES: 'data_tables',
	WORKSPACE: 'workspace',
	RESEARCH: 'research',
	N8N_DOCS: 'n8n_docs',
	NODES: 'nodes',
	SEARCH_MODELS: 'models_search',
	ASK_USER: 'user_ask',
	LEAVE_ONBOARDING: 'onboarding_leave',
	BUILD_WORKFLOW: 'workflow_build',
	PARSE_FILE: 'file_parse',
	AGENT_CONTEXT: 'agent_context',
	MCP_SERVERS: 'mcp_servers',
	CONVERSATION_HISTORY: 'conversation_history',
	ACTIVITY: 'activity',
	SAVE_USER_PREFERENCE: 'user_preference_save',
} as const;

/** Trace-only chain-typed child run emitted by `workflow_build` with the
 *  compiled workflow JSON — bookkeeping, not an agent-facing tool. Consumed by
 *  the eval harness (`langsmith-seed.ts`) so seed reconstruction can skip the
 *  SDK re-parse; excluded by name from rebuilt transcripts. */
export const COMPILED_WORKFLOW_TRACE_RUN_NAME = 'compiled-workflow';

/** Trace-only chain run carrying an agent's config + skills, for seed
 *  reconstruction — the agent counterpart of the event above. */
export const AGENT_SNAPSHOT_TRACE_RUN_NAME = 'agent-snapshot';

export const ORCHESTRATION_TOOL_IDS = {
	CREATE_PLAN: 'plan_create',
	TASK_CONTROL: 'task_control',
	COMPLETE_CHECKPOINT: 'checkpoint_complete',
	VERIFY_BUILT_WORKFLOW: 'workflow_verify',
	REPORT_VERIFICATION_VERDICT: 'verification_report',
	APPLY_WORKFLOW_CREDENTIALS: 'workflow_credentials_apply',
	BUILD_AGENT: 'agent_build',
	GET_SESSION: 'agent_session_get',
} as const;

export const WORKSPACE_TOOL_IDS = {
	WRITE_FILE: 'sandbox_file_write',
} as const;

export const CREDENTIALS_TOOL_ID = DOMAIN_TOOL_IDS.CREDENTIALS;
export const DATA_TABLES_TOOL_ID = DOMAIN_TOOL_IDS.DATA_TABLES;
export const EVAL_CONFIG_TOOL_ID = DOMAIN_TOOL_IDS.EVAL_CONFIG;
export const ASK_USER_TOOL_ID = DOMAIN_TOOL_IDS.ASK_USER;
export const N8N_DOCS_TOOL_ID = DOMAIN_TOOL_IDS.N8N_DOCS;

export const ORCHESTRATION_TOOL_NAMES = new Set<string>(Object.values(ORCHESTRATION_TOOL_IDS));

export const ALWAYS_LOADED_TOOL_NAMES = new Set<string>([
	DOMAIN_TOOL_IDS.ASK_USER,
	// Registered on onboarding threads only, so every other thread pays nothing for the entry.
	// Deferring it would price the user's "let me out" at search_tools + load_tool.
	DOMAIN_TOOL_IDS.LEAVE_ONBOARDING,
	DOMAIN_TOOL_IDS.CREDENTIALS,
	DOMAIN_TOOL_IDS.WORKFLOWS,
	DOMAIN_TOOL_IDS.EXECUTIONS,
	DOMAIN_TOOL_IDS.DATA_TABLES,
	DOMAIN_TOOL_IDS.PARSE_FILE,
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	DOMAIN_TOOL_IDS.NODES,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.RESEARCH,
	// Paired with RESEARCH on purpose: the research tool tells the agent to prefer
	// n8n's own docs for n8n questions, but deferring n8n_docs priced that route at
	// search_tools + load_tool while web search stayed one call away — so the agent
	// web-searched things the docs answer (INS-749).
	DOMAIN_TOOL_IDS.N8N_DOCS,
	// Agent research and session diagnosis are direct operations. Deferring this
	// tool causes the model to hand read-only work to the builder sub-agent.
	DOMAIN_TOOL_IDS.AGENT_CONTEXT,
	// Deferring this one defeats its purpose: it exists for the case where
	// nothing is connected, which is exactly when `search_tools` has no MCP tool
	// to surface and the agent concludes the integration is unavailable.
	DOMAIN_TOOL_IDS.MCP_SERVERS,
	DOMAIN_TOOL_IDS.CONVERSATION_HISTORY,
	// The instance-context block hands the agent ids and tells it to expand them, so deferring
	// this would price every expand at search_tools + load_tool. It is only registered when the
	// reader is enabled, so an instance without the feature pays nothing for the entry.
	DOMAIN_TOOL_IDS.ACTIVITY,
	// A user can state a preference at any point in a conversation. Deferring this
	// behind search_tools would mean the model has to know the tool exists before it
	// can react, which is exactly the moment it does not. Registered only when the
	// preferences service is wired, so an instance without the feature pays nothing.
	DOMAIN_TOOL_IDS.SAVE_USER_PREFERENCE,
	// agent_build is the primary route for agent-anchored intents; deferring it
	// costs 2 LLM rounds (search_tools + load_tool) and a prompt-cache rewrite
	// on every agent build.
	...(isAgentFeatureEnabled() ? [ORCHESTRATION_TOOL_IDS.BUILD_AGENT] : []),
]);

/**
 * The hot set sent eagerly when the provider runs tool search. Everything else
 * is deferred: a deferred tool then costs one search inside the same response,
 * not two extra model calls, and finding it does not rewrite the cached prompt.
 * These are the tools almost every build turn calls.
 */
const NATIVE_SEARCH_HOT_TOOL_NAMES = new Set<string>([
	DOMAIN_TOOL_IDS.WORKFLOWS,
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.NODES,
	DOMAIN_TOOL_IDS.ASK_USER,
]);

/**
 * Registered only when the thread needs them, so they cost nothing elsewhere
 * and are always loaded where they exist.
 */
const SITUATIONAL_TOOL_NAMES = new Set<string>([
	// Only on onboarding threads. The user's "let me out" must not need a search.
	DOMAIN_TOOL_IDS.LEAVE_ONBOARDING,
	// Only when the user attached a parseable file.
	DOMAIN_TOOL_IDS.PARSE_FILE,
]);

/** Tools sent eagerly to the model. The rest are deferred behind tool search. */
export function getAlwaysLoadedToolNames(options: { nativeToolSearch: boolean }): Set<string> {
	if (!options.nativeToolSearch) return ALWAYS_LOADED_TOOL_NAMES;
	return new Set([...NATIVE_SEARCH_HOT_TOOL_NAMES, ...SITUATIONAL_TOOL_NAMES]);
}

export const CHECKPOINT_FOLLOW_UP_TOOL_NAMES = new Set<string>([
	ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT,
	DOMAIN_TOOL_IDS.EXECUTIONS,
]);
