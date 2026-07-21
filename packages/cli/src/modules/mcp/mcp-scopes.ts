import type { McpScope } from '@n8n/api-types';
import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';

/**
 * Maps each grantable OAuth scope to the MCP tools it unlocks. A tool is
 * available if ANY granted scope covers it, so support tools (node search,
 * SDK reference, validation) can ride on both read and write scopes.
 *
 * Keep in sync with the tools registered in `McpService.getServer` — the
 * drift-guard test in `__tests__/mcp-scopes.test.ts` fails when a registered
 * tool is missing here.
 */
export const TOOLS_BY_SCOPE: Record<McpScope, readonly string[]> = {
	'workflow:read': [
		'search_workflows',
		'get_workflow_details',
		'get_workflow_history',
		'get_workflow_version',
		// Read-only builder support tools
		'search_nodes',
		'get_node_types',
		'get_workflow_best_practices',
		'get_sdk_reference',
		'validate_workflow',
		'validate_node_config',
	],
	'workflow:write': [
		'create_workflow_from_code',
		'update_workflow',
		'archive_workflow',
		'restore_workflow_version',
		'publish_workflow',
		'unpublish_workflow',
		// Builder support tools, so a write-only grant can still build
		'search_nodes',
		'get_node_types',
		'get_workflow_best_practices',
		'get_sdk_reference',
		'validate_workflow',
		'validate_node_config',
	],
	'workflow:execute': ['execute_workflow', 'test_workflow', 'prepare_test_pin_data'],
	'execution:read': ['get_execution', 'search_executions'],
	// explore_node_resources queries external services with stored credentials,
	// so it must sit behind the credential scope rather than a workflow one.
	'credential:read': ['list_credentials', 'list_n8n_connect_services', 'explore_node_resources'],
	'dataTable:read': ['search_data_tables'],
	// Writing requires finding tables, so search rides along.
	'dataTable:write': [
		'search_data_tables',
		'create_data_table',
		'rename_data_table',
		'add_data_table_column',
		'delete_data_table_column',
		'rename_data_table_column',
		'add_data_table_rows',
	],
	'project:read': ['search_projects', 'search_folders'],
	'tag:read': ['list_tags'],
};

/**
 * Tools only registered when the workflow builder is enabled
 * (`N8N_MCP_BUILDER_ENABLED`). Keep in sync with `registerBuilderTools` in
 * `mcp.service.ts` — covered by the same drift-guard test as TOOLS_BY_SCOPE.
 */
export const BUILDER_TOOLS: ReadonlySet<string> = new Set([
	'search_nodes',
	'get_node_types',
	'get_workflow_best_practices',
	'get_sdk_reference',
	'validate_workflow',
	'validate_node_config',
	'create_workflow_from_code',
	'update_workflow',
	'archive_workflow',
	'restore_workflow_version',
	'explore_node_resources',
	'search_projects',
	'search_folders',
]);

function isMcpScope(scope: string): scope is McpScope {
	return (MCP_INSTANCE_SCOPES as readonly string[]).includes(scope);
}

/**
 * Resolves the set of tool names a token with the given granted scopes may
 * list and call. `undefined` means the credential predates scoping or is not
 * scope-bearing (e.g. an API key) and grants access to all tools.
 */
export function getAllowedToolNames(grantedScopes: string[] | undefined): Set<string> | undefined {
	if (grantedScopes === undefined) return undefined;

	const allowed = new Set<string>();
	for (const scope of grantedScopes) {
		if (!isMcpScope(scope)) continue;
		for (const toolName of TOOLS_BY_SCOPE[scope]) {
			allowed.add(toolName);
		}
	}

	return allowed;
}
