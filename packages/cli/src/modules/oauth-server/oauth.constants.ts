/**
 * 403 body returned by the shared OAuth endpoints when no protected resource
 * is enabled. The text matches the previous MCP-specific guard verbatim —
 * the instance MCP server is currently the only registered resource, and
 * existing clients/tests assert on this message. Revisit in IAM-798 when
 * OAuth-server availability is decoupled from the MCP access setting.
 */
export const OAUTH_SERVER_DISABLED_ERROR_MESSAGE = 'MCP access is disabled';
