import type { McpScope } from '@n8n/api-types';

/**
 * The agent scopes' share of the MCP scope→tool map, contributed via the
 * agents MCP tool provider. Keep in sync with the tools registered in
 * `McpAgentToolsService.registerTools` — the drift-guard test in
 * `__tests__/agent-tools.service.test.ts` fails when they diverge.
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
	// The read tools ride along on a write-only grant: mutate_agent's
	// configHash handshake starts at get_agent, and building needs search
	// (sub-agents), asset discovery, validation, and the reference.
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
