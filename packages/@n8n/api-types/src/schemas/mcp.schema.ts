// PostHog rollout flag id gating MCP Apps support (the iframe UI attached to
// the create-workflow-from-code MCP tool). Single source of truth shared
// between FE and BE so the two cannot drift. Follows the `NNN_<feature>`
// numeric-prefix convention used by every other n8n PostHog flag.
export const MCP_APPS_FLAG = '087_mcp_apps';

// Variant strings used by the `087_mcp_apps` experiment.
// - 'control': MCP Apps disabled (legacy behaviour)
// - 'variant': MCP Apps enabled
export const MCP_APPS_VARIANT_CONTROL = 'control';
export const MCP_APPS_VARIANT_ENABLED = 'variant';

/**
 * OAuth scopes a user can grant to an MCP client on the consent screen for
 * the instance-level MCP server. Each scope gates a set of MCP tools; the
 * mapping lives in the MCP module (`mcp-scopes.ts` in the cli package).
 * Shared FE/BE so the consent picker and enforcement cannot drift.
 */
export const MCP_INSTANCE_SCOPES = [
	'workflow:read',
	'workflow:write',
	'workflow:execute',
	'execution:read',
	'credential:read',
	'dataTable:read',
	'dataTable:write',
	'project:read',
	'tag:read',
] as const;

export type McpScope = (typeof MCP_INSTANCE_SCOPES)[number];
