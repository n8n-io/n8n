import { WORKSPACE_TOOL_NAMES } from '@n8n/agents';
import type {
	FIND_TOOLS_TOOL_NAME,
	READ_HISTORY_TOOL_NAME,
	SKILL_LOAD_TOOL_NAME,
} from '@n8n/agents';
import type {
	AgentBuilderToolName,
	AssistantUsageTier,
	SharedBuilderToolName,
	WorkflowBuilderToolName,
} from '@n8n/api-types';

import type { ToolCallSummary } from './work-summary-accumulator';
import type { EvalConfigToolAction } from '../tools/evals/eval-config.tool';
import type { SkillsToolAction } from '../tools/skills.tool';
import type {
	DOMAIN_TOOL_IDS,
	ORCHESTRATION_TOOL_IDS,
	WORKSPACE_TOOL_IDS,
} from '../tools/tool-ids';

type ValueOf<T> = T[keyof T];

type BuiltInToolName =
	| WorkflowBuilderToolName
	| AgentBuilderToolName
	| SharedBuilderToolName
	| ValueOf<typeof DOMAIN_TOOL_IDS>
	| ValueOf<typeof ORCHESTRATION_TOOL_IDS>
	| ValueOf<typeof WORKSPACE_TOOL_IDS>
	| typeof SKILL_LOAD_TOOL_NAME
	| typeof FIND_TOOLS_TOOL_NAME
	| typeof READ_HISTORY_TOOL_NAME;

type ActionTiers = Readonly<Record<string, AssistantUsageTier>>;

const SKILLS_ACTION_TIERS: Readonly<Record<SkillsToolAction, AssistantUsageTier>> = {
	list: 'broad',
	get: 'broad',
	'list-sources': 'broad',
	'discover-source': 'broad',
	create: 'strict',
	update: 'strict',
	delete: 'strict',
	'import-from-source': 'strict',
};

const EVAL_CONFIG_ACTION_TIERS: Readonly<Record<EvalConfigToolAction, AssistantUsageTier>> = {
	list: 'broad',
	get: 'broad',
	describe: 'broad',
	create: 'strict',
	update: 'strict',
	delete: 'strict',
};

/**
 * The tier of every built-in tool. The type check fails when a tool or an action
 * has no tier here, so add one when you add a tool:
 * - `strict`: the tool builds, changes or runs something
 * - `broad`: the tool only reads the instance, debugs, or searches the docs or the web
 * - `none`: the tool only asks a question, looks up nodes, changes the Assistant's own settings,
 *   or runs an internal step
 */
const TOOL_TIERS: Readonly<Record<BuiltInToolName, AssistantUsageTier | ActionTiers>> = {
	// Questions, setup and internal steps
	ask_user: 'none',
	'leave-onboarding': 'none',
	save_user_preference: 'none',
	send_feedback: 'none',
	workflow_builder_task_control: 'none',
	workflow_builder_verify_built_workflow: 'none',
	workflow_builder_report_verification_verdict: 'none',
	agent_builder_select_agent: 'none',
	agent_builder_resolve_llm: 'none',
	agent_builder_verify_mcp_server: 'none',
	load_skill: 'none',
	find_tools: 'none',
	read_history: 'none',

	// Context, attached files and the sandbox
	'conversation-history': 'none',
	'agent-context': 'none',
	'mcp-servers': 'none',
	'parse-file': 'none',
	'list-files': 'none',
	'view-file': 'none',
	'import-files': 'none',
	'get-session': 'none',
	'write-file': 'none',

	// Node, model and credential type lookups
	workflow_builder_nodes: 'none',
	search_nodes: 'none',
	get_node_types: 'none',
	get_node_parameter_options: 'none',
	search_models: 'none',
	search_credential_types: 'none',

	// Former names. Stored threads still contain them.
	agent_builder_search_nodes: 'none',
	agent_builder_get_node_types: 'none',
	agent_builder_get_resource_locator_options: 'none',
	agent_builder_ask_questions: 'none',
	agent_builder_ask_credential: 'strict',
	agent_builder_ask_embedding_credential: 'strict',
	agent_builder_build_agent: 'strict',

	// Reads of the instance, debugging, docs and research
	activity: 'broad',
	list_workflows: 'broad',
	get_workflow_node_usage: 'broad',
	get_workflow: 'broad',
	get_workflow_as_code: 'broad',
	validate_workflow: 'broad',
	list_workflow_versions: 'broad',
	list_executions: 'broad',
	get_execution: 'broad',
	debug_execution: 'broad',
	get_execution_node_output: 'broad',
	get_resolved_node_parameters: 'broad',
	list_credentials: 'broad',
	list_data_tables: 'broad',
	get_data_table_schema: 'broad',
	query_data_table: 'broad',
	list_projects: 'broad',
	list_tags: 'broad',
	list_folders: 'broad',
	list_apps: 'broad',
	get_app: 'broad',
	open_app: 'broad',
	list_app_bindings: 'broad',
	research: 'broad',
	'n8n-docs': 'broad',

	// Workflows and executions
	workflow_builder_build_workflow: 'strict',
	workflow_builder_apply_workflow_credentials: 'strict',
	archive_workflow: 'strict',
	unarchive_workflow: 'strict',
	setup_workflow: 'strict',
	publish_workflow: 'strict',
	unpublish_workflow: 'strict',
	restore_workflow_version: 'strict',
	update_workflow_version: 'strict',
	run_workflow: 'strict',
	run_workflow_step: 'strict',
	stop_execution: 'strict',
	execute_node: 'strict',
	cleanup_test_executions: 'strict',
	'eval-config': EVAL_CONFIG_ACTION_TIERS,

	// Credentials, data tables, tags, folders and apps
	setup_credentials: 'strict',
	test_credential: 'strict',
	delete_credential: 'strict',
	update_credential_description: 'strict',
	create_data_table: 'strict',
	delete_data_table: 'strict',
	add_data_table_column: 'strict',
	delete_data_table_column: 'strict',
	rename_data_table_column: 'strict',
	insert_data_table_rows: 'strict',
	update_data_table_rows: 'strict',
	delete_data_table_rows: 'strict',
	change_data_tables: 'strict',
	tag_workflow: 'strict',
	create_folder: 'strict',
	delete_folder: 'strict',
	move_workflow_to_folder: 'strict',
	create_app: 'strict',
	bind_app_resource: 'strict',
	unbind_app_resource: 'strict',
	commit_app: 'strict',
	discard_app_changes: 'strict',

	// Agents
	agent_builder_write_config: 'strict',
	agent_builder_patch_config: 'strict',
	agent_builder_build_custom_tool: 'strict',
	agent_builder_create_skills: 'strict',
	agent_builder_update_skill: 'strict',
	agent_builder_create_tasks: 'strict',
	agent_builder_update_task: 'strict',
	agent_builder_finish_setup: 'strict',
	agent_builder_call_agent: 'strict',
	agent_builder_publish_agent: 'strict',
	agent_builder_unpublish_agent: 'strict',
	agent_builder_configure_channel: 'strict',

	// Other work
	skills: SKILLS_ACTION_TIERS,
	'share-files': 'strict',
	'start-cloud-browser-task': 'strict',
};

const TIERS_BY_TOOL = new Map(Object.entries(TOOL_TIERS));

function tierOf({ toolName, action }: ToolCallSummary): AssistantUsageTier {
	// The agent SDK's sandbox file and shell tools. Match exact names: an MCP server named
	// `workspace` also gives tool names that start with `workspace_`.
	if (WORKSPACE_TOOL_NAMES.has(toolName)) return 'none';
	// A tool that is not built in, such as an MCP tool, counts as strict.
	const tier = TIERS_BY_TOOL.get(toolName) ?? 'strict';
	if (typeof tier === 'string') return tier;
	return action !== undefined && Object.hasOwn(tier, action) ? tier[action] : 'strict';
}

function countsTowardUsage(call: ToolCallSummary): boolean {
	return call.returned === true && !call.denied;
}

/** The highest tier of the calls that returned a result that the user or an admin did not deny. */
export function deriveAssistantUsageTier(toolCalls: ToolCallSummary[]): AssistantUsageTier {
	let tier: AssistantUsageTier = 'none';
	for (const call of toolCalls) {
		if (!countsTowardUsage(call)) continue;
		const callTier = tierOf(call);
		if (callTier === 'strict') return 'strict';
		if (callTier === 'broad') tier = 'broad';
	}
	return tier;
}

function usageLabel({ toolName, action }: ToolCallSummary): string {
	if (WORKSPACE_TOOL_NAMES.has(toolName)) return 'workspace';
	// Browser Use tools come from a local MCP server. They count as strict, like other MCP tools.
	if (toolName.startsWith('browser_')) return 'browser';
	// Do not send the names of MCP tools or other tools that are not built in.
	const tier = TIERS_BY_TOOL.get(toolName);
	if (tier === undefined) return 'other';
	// The tier of these tools depends on the action, so add it to the name.
	if (typeof tier !== 'string' && action !== undefined && Object.hasOwn(tier, action)) {
		return `${toolName}:${action}`;
	}
	return toolName;
}

/** The tools that `deriveAssistantUsageTier` counts, each once and sorted. */
export function listAssistantToolsUsed(toolCalls: ToolCallSummary[]): string[] {
	return [...new Set(toolCalls.filter(countsTowardUsage).map(usageLabel))].sort();
}
