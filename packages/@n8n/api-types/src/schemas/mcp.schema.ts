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

export type McpClientType = 'cli' | 'ide' | 'editor' | 'assistant';

/** Known client brands, used by the FE to pick the logo shown next to a client. */
export type McpClientBrandName = 'claude' | 'cursor' | 'vscode' | 'openai';

/**
 * Client names are free-form (self-reported at OAuth registration), so known
 * clients are recognized by name patterns. First match wins: more specific
 * patterns (e.g. "Claude Code") must come before broader ones ("Claude").
 * Shared FE/BE so the type shown in the clients table and the server-side
 * type filter cannot drift.
 */
export const MCP_CLIENT_BRAND_MATCHERS: ReadonlyArray<{
	pattern: RegExp;
	brand: McpClientBrandName;
	type: McpClientType;
}> = [
	{ pattern: /claude[ -]?code/i, brand: 'claude', type: 'cli' },
	{ pattern: /claude/i, brand: 'claude', type: 'assistant' },
	{ pattern: /cursor/i, brand: 'cursor', type: 'ide' },
	{ pattern: /(visual studio code|vs ?code)/i, brand: 'vscode', type: 'editor' },
	{ pattern: /codex/i, brand: 'openai', type: 'cli' },
	{ pattern: /chatgpt|openai/i, brand: 'openai', type: 'assistant' },
];

export function getMcpClientType(clientName: string): McpClientType | null {
	return MCP_CLIENT_BRAND_MATCHERS.find(({ pattern }) => pattern.test(clientName))?.type ?? null;
}

/**
 * Client-type buckets offered by the connected-clients filter (per design),
 * coarser than the derived brand types shown in the table rows.
 */
export const MCP_CLIENT_TYPE_FILTERS = ['ide', 'cli', 'web'] as const;

export type McpClientTypeFilter = (typeof MCP_CLIENT_TYPE_FILTERS)[number];

export const MCP_CLIENT_TYPE_FILTER_BUCKETS: Record<McpClientTypeFilter, McpClientType[]> = {
	ide: ['ide', 'editor'],
	cli: ['cli'],
	web: ['assistant'],
};

/** Date buckets for the "Connected" filter, applied to the consent's grantedAt. */
export const MCP_CLIENT_CONNECTED_PERIODS = ['last7', 'last30', 'older'] as const;

export type McpClientConnectedPeriod = (typeof MCP_CLIENT_CONNECTED_PERIODS)[number];
