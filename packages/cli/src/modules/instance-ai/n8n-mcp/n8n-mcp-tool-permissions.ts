import type { InstanceAiPermissions } from '@n8n/api-types';
import type { ReplacedToolAction } from '@n8n/instance-ai';

/**
 * The n8n MCP server tools that n8n Assistant can call. A tool maps to `read`
 * when it changes no data, or to the n8n Assistant permission that governs
 * the change. A tool that is not in this map is not exposed.
 *
 * Left out on purpose:
 * - Agent tools: n8n Assistant builds Agents through `build-agent`.
 * - Preference tools: they need MCP elicitation, and n8n Assistant has its own
 *   preference tool and card.
 * - `install_community_node`: no n8n Assistant permission governs installs.
 * - Instance context and activity tools: they hide workflows by `availableInMCP`
 *   inside the shared instance-context service. n8n Assistant has its own
 *   activity tool and instance context.
 */
export const N8N_MCP_TOOL_PERMISSIONS: Readonly<
	Record<string, 'read' | keyof InstanceAiPermissions>
> = {
	search_workflows: 'read',
	get_workflow_details: 'read',
	get_workflow_history: 'read',
	get_workflow_version: 'read',
	get_workflow_versions_diff: 'read',
	get_workflow_execution: 'read',
	search_workflow_executions: 'read',
	prepare_workflow_pin_data: 'read',
	list_credentials: 'read',
	list_n8n_gateway_services: 'read',
	list_workflow_tags: 'read',
	search_data_tables: 'read',
	get_data_table_rows: 'read',
	get_node_usage: 'read',
	search_nodes: 'read',
	get_node_types: 'read',
	explore_node_resources: 'read',
	get_workflow_sdk_reference: 'read',
	get_workflow_best_practices: 'read',
	validate_workflow: 'read',
	validate_node_config: 'read',
	search_projects: 'read',
	search_folders: 'read',

	create_workflow_from_code: 'createWorkflow',
	update_workflow: 'updateWorkflow',
	archive_workflow: 'deleteWorkflow',
	restore_workflow_version: 'restoreWorkflowVersion',
	publish_workflow: 'publishWorkflow',
	unpublish_workflow: 'publishWorkflow',
	execute_workflow: 'runWorkflow',
	test_workflow: 'runWorkflow',
	create_data_table: 'createDataTable',
	rename_data_table: 'mutateDataTableSchema',
	add_data_table_column: 'mutateDataTableSchema',
	delete_data_table_column: 'mutateDataTableSchema',
	rename_data_table_column: 'mutateDataTableSchema',
	add_data_table_rows: 'mutateDataTableRows',
	create_folder: 'createFolder',
	update_folder: 'createFolder',
	move_workflows_to_folder: 'moveWorkflowToFolder',
};

const replace = (
	toolName: string,
	actions: string[],
	replacementToolName: string,
): ReplacedToolAction[] => actions.map((action) => ({ toolName, action, replacementToolName }));

/**
 * Native n8n Assistant actions that an n8n MCP tool does the same job for.
 * The native actions without an MCP counterpart stay, for example workflow
 * setup, single-node runs, row updates, and credential setup.
 */
export const NATIVE_ACTIONS_REPLACED_BY_N8N_MCP: readonly ReplacedToolAction[] = [
	...replace('workflows', ['list'], 'search_workflows'),
	...replace('workflows', ['node-usage'], 'get_node_usage'),
	...replace('workflows', ['get', 'get-as-code'], 'get_workflow_details'),
	...replace('workflows', ['delete'], 'archive_workflow'),
	...replace('workflows', ['publish'], 'publish_workflow'),
	...replace('workflows', ['unpublish'], 'unpublish_workflow'),
	...replace('workflows', ['list-versions'], 'get_workflow_history'),
	...replace('workflows', ['restore-version'], 'restore_workflow_version'),
	...replace('executions', ['list'], 'search_workflow_executions'),
	...replace('executions', ['get', 'debug', 'get-node-output'], 'get_workflow_execution'),
	...replace('executions', ['run'], 'execute_workflow'),
	...replace('nodes', ['list', 'search'], 'search_nodes'),
	...replace('nodes', ['describe', 'type-definition'], 'get_node_types'),
	...replace('nodes', ['explore-resources'], 'explore_node_resources'),
	...replace('credentials', ['list'], 'list_credentials'),
	...replace('data-tables', ['list', 'schema'], 'search_data_tables'),
	...replace('data-tables', ['query'], 'get_data_table_rows'),
	...replace('data-tables', ['create'], 'create_data_table'),
	...replace('data-tables', ['add-column'], 'add_data_table_column'),
	...replace('data-tables', ['delete-column'], 'delete_data_table_column'),
	...replace('data-tables', ['rename-column'], 'rename_data_table_column'),
	...replace('data-tables', ['insert-rows'], 'add_data_table_rows'),
	...replace('workspace', ['list-projects'], 'search_projects'),
	...replace('workspace', ['list-tags'], 'list_workflow_tags'),
	...replace('workspace', ['list-folders'], 'search_folders'),
	...replace('workspace', ['create-folder'], 'create_folder'),
	...replace('workspace', ['move-workflow-to-folder'], 'move_workflows_to_folder'),
];

/**
 * The MCP tools that replace the native build pipeline. When all are present,
 * n8n Assistant loads the MCP building skill variant, which turns off
 * `build-workflow`, verification, and planned tasks.
 */
export const N8N_MCP_BUILD_TOOLS: readonly string[] = [
	'search_nodes',
	'get_node_types',
	'validate_workflow',
	'create_workflow_from_code',
	'update_workflow',
	'test_workflow',
];
