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
	SEARCH_MODELS: 'search_models',
	ASK_USER: 'ask_user',
	LEAVE_ONBOARDING: 'leave_onboarding',
	BUILD_WORKFLOW: 'build_workflow',
	PARSE_FILE: 'parse_file',
	AGENT_CONTEXT: 'agent_context',
	MCP_SERVERS: 'mcp_servers',
	CONVERSATION_HISTORY: 'conversation_history',
	ACTIVITY: 'activity',
	SAVE_USER_PREFERENCE: 'save_user_preference',
} as const;

/** Trace-only chain-typed child run emitted by `build_workflow` with the
 *  compiled workflow JSON — bookkeeping, not an agent-facing tool. Consumed by
 *  the eval harness (`langsmith-seed.ts`) so seed reconstruction can skip the
 *  SDK re-parse; excluded by name from rebuilt transcripts. */
export const COMPILED_WORKFLOW_TRACE_RUN_NAME = 'compiled-workflow';

/** Trace-only chain run carrying an agent's config + skills, for seed
 *  reconstruction — the agent counterpart of the event above. */
export const AGENT_SNAPSHOT_TRACE_RUN_NAME = 'agent-snapshot';

export const ORCHESTRATION_TOOL_IDS = {
	CREATE_PLAN: 'create_plan',
	TASK_CONTROL: 'task_control',
	COMPLETE_CHECKPOINT: 'complete_checkpoint',
	VERIFY_BUILT_WORKFLOW: 'verify_built_workflow',
	REPORT_VERIFICATION_VERDICT: 'report_verification_verdict',
	APPLY_WORKFLOW_CREDENTIALS: 'apply_workflow_credentials',
	BUILD_AGENT: 'build_agent',
	GET_SESSION: 'get_session',
} as const;

export const WORKSPACE_TOOL_IDS = {
	WRITE_FILE: 'write_sandbox_file',
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
	// build_agent is the primary route for agent-anchored intents; deferring it
	// costs 2 LLM rounds (search_tools + load_tool) and a prompt-cache rewrite
	// on every agent build.
	...(isAgentFeatureEnabled() ? [ORCHESTRATION_TOOL_IDS.BUILD_AGENT] : []),
]);

/**
 * Tools that stay loaded under `search_tools` / `load_tool` but can be deferred
 * when the provider runs tool search. There a deferred tool costs one search
 * inside the same response instead of two extra model calls, and finding it
 * does not rewrite the cached prompt. Each tool here is loaded by the skill
 * that uses it (`dependencies.tools`), so the common path never searches.
 */
const NATIVE_SEARCH_DEFERRABLE_TOOL_NAMES = new Set<string>([
	// Large action union; the data-table-manager skill loads it. Tools that must
	// be used proactively (conversation_history, save_user_preference) stay
	// loaded: a deferred tool is only found by a model that already wants it.
	DOMAIN_TOOL_IDS.DATA_TABLES,
]);

/** Tools sent eagerly to the model. The rest are deferred behind tool search. */
export function getAlwaysLoadedToolNames(options: { nativeToolSearch: boolean }): Set<string> {
	if (!options.nativeToolSearch) return ALWAYS_LOADED_TOOL_NAMES;
	return new Set(
		[...ALWAYS_LOADED_TOOL_NAMES].filter((name) => !NATIVE_SEARCH_DEFERRABLE_TOOL_NAMES.has(name)),
	);
}

export const CHECKPOINT_FOLLOW_UP_TOOL_NAMES = new Set<string>([
	ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT,
	DOMAIN_TOOL_IDS.EXECUTIONS,
]);
