import type { McpScope } from '@n8n/api-types';

/**
 * The agent scopes' share of the MCP scope→tool map. Drift-guarded against
 * `McpAgentToolsService.registerTools` in `__tests__/agent-tools.service.test.ts`.
 */
export const AGENT_TOOLS_BY_SCOPE: Partial<Record<McpScope, readonly string[]>> = {
	'agent:read': [
		'search_agents',
		'get_agent',
		'list_agent_versions',
		'discover_agent_assets',
		'validate_agent',
		'get_agent_builder_reference',
	],
	// Read tools ride along so a write-only grant can still build.
	'agent:write': [
		'create_agent',
		'mutate_agent',
		'revert_agent',
		'delete_agent',
		'verify_agent_mcp_server',
		'search_agents',
		'get_agent',
		'list_agent_versions',
		'discover_agent_assets',
		'validate_agent',
		'get_agent_builder_reference',
		'update_agent_integration',
		'publish_agent',
		'unpublish_agent',
	],
	'agent:execute': ['call_agent'],
};

export const AGENT_TOOLS: ReadonlySet<string> = new Set(Object.values(AGENT_TOOLS_BY_SCOPE).flat());
