export const DOMAIN_TOOL_IDS = {
	WORKFLOWS: 'workflows',
	EVALS: 'evals',
	EVAL_CONFIG: 'eval-config',
	EXECUTIONS: 'executions',
	CREDENTIALS: 'credentials',
	DATA_TABLES: 'data-tables',
	WORKSPACE: 'workspace',
	RESEARCH: 'research',
	N8N_DOCS: 'n8n-docs',
	NODES: 'nodes',
	ASK_USER: 'ask-user',
	BUILD_WORKFLOW: 'build-workflow',
	PARSE_FILE: 'parse-file',
	TEMPLATES: 'templates',
} as const;

/** Trace-only chain-typed child run emitted by `build-workflow` with the
 *  compiled workflow JSON — bookkeeping, not an agent-facing tool. Consumed by
 *  the eval harness (`langsmith-seed.ts`) so seed reconstruction can skip the
 *  SDK re-parse; excluded by name from rebuilt transcripts. */
export const COMPILED_WORKFLOW_TRACE_RUN_NAME = 'compiled-workflow';

export const ORCHESTRATION_TOOL_IDS = {
	CREATE_TASKS: 'create-tasks',
	TASK_CONTROL: 'task-control',
	EVAL_SETUP_WITH_AGENT: 'eval-setup-with-agent',
	EVAL_DATA: 'eval-data',
	COMPLETE_CHECKPOINT: 'complete-checkpoint',
	VERIFY_BUILT_WORKFLOW: 'verify-built-workflow',
	REPORT_VERIFICATION_VERDICT: 'report-verification-verdict',
	APPLY_WORKFLOW_CREDENTIALS: 'apply-workflow-credentials',
	BUILD_AGENT: 'build-agent',
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

export const ALWAYS_LOADED_TOOL_NAMES = new Set<string>([
	DOMAIN_TOOL_IDS.ASK_USER,
	DOMAIN_TOOL_IDS.CREDENTIALS,
	DOMAIN_TOOL_IDS.WORKFLOWS,
	DOMAIN_TOOL_IDS.EXECUTIONS,
	DOMAIN_TOOL_IDS.DATA_TABLES,
	DOMAIN_TOOL_IDS.PARSE_FILE,
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	DOMAIN_TOOL_IDS.NODES,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.RESEARCH,
	DOMAIN_TOOL_IDS.TEMPLATES,
	'web-search',
	'fetch-url',
]);

export const CHECKPOINT_FOLLOW_UP_TOOL_NAMES = new Set<string>([
	ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT,
	DOMAIN_TOOL_IDS.EXECUTIONS,
]);
