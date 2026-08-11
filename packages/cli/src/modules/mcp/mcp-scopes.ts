import type { McpScope } from '@n8n/api-types';
import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';

/**
 * Maps each grantable OAuth scope to the MCP tools it unlocks. A tool is
 * available if ANY granted scope covers it, so support tools (node search,
 * SDK reference, validation) can ride on both read and write scopes.
 *
 * Covers only the tools the MCP module registers itself; modules contribute
 * their own mappings via `McpToolProvider.toolsByScope`, merged in
 * `McpToolProviderRegistry.getToolsByScope`.
 *
 * Keep in sync with the tools registered in `McpService.getServer` — the
 * drift-guard test in `__tests__/mcp-scopes.test.ts` fails when a registered
 * tool is missing here.
 */
export const CORE_TOOLS_BY_SCOPE: Partial<Record<McpScope, readonly string[]>> = {
	'workflow:read': [
		'search_workflows',
		'get_workflow_details',
		'get_workflow_history',
		'get_workflow_version',
		// Read-only builder support tools
		'search_nodes',
		'get_node_types',
		'get_workflow_best_practices',
		'get_workflow_sdk_reference',
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
		'get_workflow_sdk_reference',
		'validate_workflow',
		'validate_node_config',
	],
	'workflow:execute': ['execute_workflow', 'test_workflow', 'prepare_workflow_pin_data'],
	'execution:read': ['get_workflow_execution', 'search_workflow_executions'],
	// explore_node_resources queries external services with stored credentials,
	// so it must sit behind the credential scope rather than a workflow one.
	'credential:read': ['list_credentials', 'list_n8n_connect_services', 'explore_node_resources'],
	'project:read': ['search_projects', 'search_folders'],
	'tag:read': ['list_workflow_tags'],
};

/**
 * Tools only registered when the workflow builder is enabled
 * (`N8N_MCP_BUILDER_ENABLED`). Keep in sync with `registerBuilderTools` in
 * `mcp.service.ts` — covered by the same drift-guard test as
 * CORE_TOOLS_BY_SCOPE.
 */
export const BUILDER_TOOLS: ReadonlySet<string> = new Set([
	'search_nodes',
	'get_node_types',
	'get_workflow_best_practices',
	'get_workflow_sdk_reference',
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

export function isMcpScope(scope: string): scope is McpScope {
	return (MCP_INSTANCE_SCOPES as readonly string[]).includes(scope);
}
