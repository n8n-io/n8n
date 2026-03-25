/**
 * Information about a validated access token, provided to request handlers.
 */
export interface AuthInfo {
    /**
     * The access token.
     */
    token: string;
    /**
     * The client ID associated with this token.
     */
    clientId: string;
    /**
     * Scopes associated with this token.
     */
    scopes: string[];
    /**
     * When the token expires (in seconds since epoch).
     */
    expiresAt?: number;
    /**
     * The RFC 8707 resource server identifier for which this token is valid.
     * If set, this MUST match the MCP server's resource identifier (minus hash fragment).
     */
    resource?: URL;
    /**
     * Additional data associated with the token.
     * This field should be used for any additional data that needs to be attached to the auth info.
     */
    extra?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map