import type { McpScope } from '@n8n/api-types';

// This file has no runtime imports, because the OAuth consent screen and the MCP module load it.

export const PARSE_SCHEDULE_CAPABILITY_NAME = 'parse_schedule';

/** The capability tools that each OAuth scope unlocks. A scope that has no capability is absent. */
export type CapabilityToolsByScope = Partial<Record<McpScope, readonly string[]>>;

/**
 * The capability tools that the MCP server can offer, under the one scope that each needs.
 * `TOOLS_BY_SCOPE` adds them to the built-in tools, so the consent screen lists them and OAuth
 * grants filter them like every other tool. The registry rejects a capability for MCP that is
 * not listed here, and a capability for the n8n Assistant only that is listed here.
 */
export const CAPABILITY_TOOLS_BY_SCOPE: CapabilityToolsByScope = {
	'workflow:read': [PARSE_SCHEDULE_CAPABILITY_NAME],
};
