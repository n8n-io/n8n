import type { McpScope } from '@n8n/api-types';

// `mcp-scopes.ts` imports this file to build `TOOLS_BY_SCOPE`. Keep it free of runtime imports, so
// that the MCP scope map does not load capability code or the packages that it uses.

export const PARSE_SCHEDULE_CAPABILITY_NAME = 'parse_schedule';
export const EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME = 'export_workflow_package';
export const IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME = 'import_workflow_package';

/** The capability tools that each OAuth scope unlocks. A scope that has no capability is absent. */
export type CapabilityToolsByScope = Readonly<Partial<Record<McpScope, readonly string[]>>>;

// `Object.freeze` is shallow, so freeze each list and then the map.
function freezeListing(toolsByScope: CapabilityToolsByScope): CapabilityToolsByScope {
	for (const names of Object.values(toolsByScope)) Object.freeze(names);
	return Object.freeze(toolsByScope);
}

/**
 * The capability tools that the MCP server can offer, under the one scope that each needs.
 * `TOOLS_BY_SCOPE` adds them to the built-in tools, so the consent screen lists them and OAuth
 * grants filter them like every other tool. The registry rejects a capability for MCP that is
 * not listed here, and a capability for the n8n Assistant only that is listed here.
 *
 * The map and its lists are frozen. `TOOLS_BY_SCOPE` copies them at import, but the registry and
 * the consent screen read them later. A late change would let the registry accept a tool that the
 * consent screen and OAuth grants do not list.
 */
export const CAPABILITY_TOOLS_BY_SCOPE: CapabilityToolsByScope = freezeListing({
	'workflow:read': [PARSE_SCHEDULE_CAPABILITY_NAME, EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME],
	'workflow:write': [IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME],
});
