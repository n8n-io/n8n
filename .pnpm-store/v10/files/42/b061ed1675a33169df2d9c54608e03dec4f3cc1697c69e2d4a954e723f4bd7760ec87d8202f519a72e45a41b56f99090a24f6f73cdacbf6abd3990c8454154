/**
 * Parameters parsed out of the WWW-Authenticate header value by the parseWWWAuthenticate function.
 */
export interface WWWAuthenticate {
    /**
     * The authorization parameter, if present.
     */
    authorization?: string;
    /**
     * The authorization_url parameter, if present.
     */
    authorization_url?: string;
    /**
     * The resource parameter, if present.
     */
    resource?: string;
    /**
     * The scope parameter, if present.
     */
    scope?: string;
    /**
     * The tenantId parameter, if present.
     */
    tenantId?: string;
    /**
     * The claims parameter, if present.
     */
    claims?: string;
    /**
     * The error parameter, if present.
     */
    error?: string;
}
/**
 * Parses an WWW-Authenticate response header.
 * This transforms a string value like:
 * `Bearer authorization="https://some.url/tenantId", resource="https://some.url"`
 * into an object like:
 * `{ authorization: "https://some.url/tenantId", resource: "https://some.url" }`
 * @param headerValue - String value in the WWW-Authenticate header
 */
export declare function parseWWWAuthenticateHeader(headerValue: string): WWWAuthenticate;
//# sourceMappingURL=parseWWWAuthenticate.d.ts.map