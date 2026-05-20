export const DOMAIN_TOOL_IDS = {
	WORKFLOWS: 'workflows',
	EVALS: 'evals',
	EXECUTIONS: 'executions',
	CREDENTIALS: 'credentials',
	DATA_TABLES: 'data-tables',
	WORKSPACE: 'workspace',
	RESEARCH: 'research',
	NODES: 'nodes',
	ASK_USER: 'ask-user',
	BUILD_WORKFLOW: 'build-workflow',
	PARSE_FILE: 'parse-file',
} as const;

export const ORCHESTRATION_TOOL_IDS = {
	PLAN: 'plan',
	SUBMIT_PLAN: 'submit-plan',
	ADD_PLAN_ITEM: 'add-plan-item',
	REMOVE_PLAN_ITEM: 'remove-plan-item',
	CREATE_TASKS: 'create-tasks',
	TASK_CONTROL: 'task-control',
	DELEGATE: 'delegate',
	BUILD_WORKFLOW_WITH_AGENT: 'build-workflow-with-agent',
	EVAL_SETUP_WITH_AGENT: 'eval-setup-with-agent',
	EVAL_DATA: 'eval-data',
	MANAGE_DATA_TABLES_WITH_AGENT: 'manage-data-tables-with-agent',
	RESEARCH_WITH_AGENT: 'research-with-agent',
	BROWSER_CREDENTIAL_SETUP: 'browser-credential-setup',
	COMPLETE_CHECKPOINT: 'complete-checkpoint',
	VERIFY_BUILT_WORKFLOW: 'verify-built-workflow',
	REPORT_VERIFICATION_VERDICT: 'report-verification-verdict',
	APPLY_WORKFLOW_CREDENTIALS: 'apply-workflow-credentials',
} as const;

export const WORKSPACE_TOOL_IDS = {
	WRITE_FILE: 'write-file',
	SUBMIT_WORKFLOW: 'submit-workflow',
} as const;

export const CREDENTIALS_TOOL_ID = DOMAIN_TOOL_IDS.CREDENTIALS;
export const DATA_TABLES_TOOL_ID = DOMAIN_TOOL_IDS.DATA_TABLES;
export const ASK_USER_TOOL_ID = DOMAIN_TOOL_IDS.ASK_USER;

export const ORCHESTRATION_TOOL_NAMES = new Set<string>(Object.values(ORCHESTRATION_TOOL_IDS));

export const ALWAYS_LOADED_TOOL_NAMES = new Set<string>([
	ORCHESTRATION_TOOL_IDS.PLAN,
	ORCHESTRATION_TOOL_IDS.CREATE_TASKS,
	ORCHESTRATION_TOOL_IDS.DELEGATE,
	DOMAIN_TOOL_IDS.ASK_USER,
	DOMAIN_TOOL_IDS.CREDENTIALS,
	DOMAIN_TOOL_IDS.WORKFLOWS,
	ORCHESTRATION_TOOL_IDS.BUILD_WORKFLOW_WITH_AGENT,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.RESEARCH,
	DOMAIN_TOOL_IDS.EVALS,
	'web-search',
	'fetch-url',
]);

export const CHECKPOINT_FOLLOW_UP_TOOL_NAMES = new Set<string>([
	ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT,
	DOMAIN_TOOL_IDS.EXECUTIONS,
]);
