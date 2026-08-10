/**
 * Protected-resource id of the instance MCP server. Lives in the oauth-server
 * module (not mcp) because the OAuth server special-cases this resource for
 * telemetry, and mcp already depends on oauth-server at init — the import
 * direction must match.
 */
export const INSTANCE_MCP_RESOURCE_ID = 'instance-mcp';
