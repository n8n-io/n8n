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
