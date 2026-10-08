import { AGENT_BUILDER_TOOL_NAMES, WORKFLOW_BUILDER_TOOL_NAMES } from '@n8n/api-types';

import { isAgentFeatureEnabled } from '../utils/agent-feature-enabled';

export const DOMAIN_TOOL_IDS = {
	WORKFLOWS: WORKFLOW_BUILDER_TOOL_NAMES.WORKFLOWS,
	EVAL_CONFIG: 'eval-config',
	EXECUTIONS: WORKFLOW_BUILDER_TOOL_NAMES.EXECUTIONS,
	CREDENTIALS: WORKFLOW_BUILDER_TOOL_NAMES.CREDENTIALS,
	DATA_TABLES: WORKFLOW_BUILDER_TOOL_NAMES.DATA_TABLES,
	WORKSPACE: 'workspace',
	RESEARCH: 'research',
	N8N_DOCS: 'n8n-docs',
	NODES: WORKFLOW_BUILDER_TOOL_NAMES.NODES,
	SEARCH_MODELS: WORKFLOW_BUILDER_TOOL_NAMES.SEARCH_MODELS,
	ASK_USER: WORKFLOW_BUILDER_TOOL_NAMES.ASK_USER,
	LEAVE_ONBOARDING: 'leave-onboarding',
	BUILD_WORKFLOW: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
	PARSE_FILE: 'parse-file',
	AGENT_CONTEXT: 'agent-context',
	MCP_SERVERS: 'mcp-servers',
	CONVERSATION_HISTORY: 'conversation-history',
	ACTIVITY: 'activity',
	SAVE_USER_PREFERENCE: 'save_user_preference',
} as const;

/** Trace-only chain-typed child run emitted by `workflow_builder_build_workflow` with the
 *  compiled workflow JSON — bookkeeping, not an agent-facing tool. Consumed by
 *  the eval harness (`langsmith-seed.ts`) so seed reconstruction can skip the
 *  SDK re-parse; excluded by name from rebuilt transcripts. */
export const COMPILED_WORKFLOW_TRACE_RUN_NAME = 'compiled-workflow';

/** Trace-only chain run carrying an agent's config + skills, for seed
 *  reconstruction — the agent counterpart of the event above. */
export const AGENT_SNAPSHOT_TRACE_RUN_NAME = 'agent-snapshot';

export const ORCHESTRATION_TOOL_IDS = {
	CREATE_TASKS: WORKFLOW_BUILDER_TOOL_NAMES.CREATE_TASKS,
	TASK_CONTROL: WORKFLOW_BUILDER_TOOL_NAMES.TASK_CONTROL,
	COMPLETE_CHECKPOINT: WORKFLOW_BUILDER_TOOL_NAMES.COMPLETE_CHECKPOINT,
	VERIFY_BUILT_WORKFLOW: WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW,
	REPORT_VERIFICATION_VERDICT: WORKFLOW_BUILDER_TOOL_NAMES.REPORT_VERIFICATION_VERDICT,
	APPLY_WORKFLOW_CREDENTIALS: WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
	SELECT_AGENT: AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT,
	GET_SESSION: 'get-session',
} as const;

export const WORKSPACE_TOOL_IDS = {
	WRITE_FILE: 'write-file',
} as const;

export const CREDENTIALS_TOOL_ID = DOMAIN_TOOL_IDS.CREDENTIALS;
export const DATA_TABLES_TOOL_ID = DOMAIN_TOOL_IDS.DATA_TABLES;
export const EVAL_CONFIG_TOOL_ID = DOMAIN_TOOL_IDS.EVAL_CONFIG;
export const ASK_USER_TOOL_ID = DOMAIN_TOOL_IDS.ASK_USER;
export const N8N_DOCS_TOOL_ID = DOMAIN_TOOL_IDS.N8N_DOCS;

export const ORCHESTRATION_TOOL_NAMES = new Set<string>(Object.values(ORCHESTRATION_TOOL_IDS));

/** Agent builder tools the orchestrator runs itself. The agents module supplies all but the selector. */
export const AGENT_BUILDER_ORCHESTRATOR_TOOL_NAMES: readonly string[] = Object.values(
	AGENT_BUILDER_TOOL_NAMES,
).filter((name) => name !== AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT);

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
	// n8n's own docs for n8n questions, but deferring n8n-docs priced that route at
	// search_tools + load_tool while web search stayed one call away — so the agent
	// web-searched things the docs answer (INS-749).
	DOMAIN_TOOL_IDS.N8N_DOCS,
	// Agent research, session diagnosis, and every Agent build read through this tool.
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
	'web-search',
	'fetch-url',
	// The orchestrator builds Agents with these tools directly. Deferring them would cost
	// 2 LLM rounds (search_tools + load_tool) per tool and a prompt-cache rewrite on
	// every agent build. They are registered only when the agents module is active.
	...(isAgentFeatureEnabled() ? AGENT_BUILDER_ORCHESTRATOR_TOOL_NAMES : []),
]);

export const CHECKPOINT_FOLLOW_UP_TOOL_NAMES = new Set<string>([
	ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT,
	DOMAIN_TOOL_IDS.EXECUTIONS,
]);
