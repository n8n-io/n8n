/**
 * Error message for Service Fabric Managed Identity environment.
 */
export declare const serviceFabricErrorMessage = "Specifying a `clientId` or `resourceId` is not supported by the Service Fabric managed identity environment. The managed identity configuration is determined by the Service Fabric cluster resource configuration. See https://aka.ms/servicefabricmi for more information";
/**
 * Most MSIs send requests to the IMDS endpoint, or a similar endpoint.
 * These are GET requests that require sending a `resource` parameter on the query.
 * This resource can be derived from the scopes received through the getToken call, as long as only one scope is received.
 * Multiple scopes assume that the resulting token will have access to multiple resources, which won't be the case.
 *
 * For that reason, when we encounter multiple scopes, we return undefined.
 * It's up to the individual MSI implementations to throw the errors (which helps us provide less generic errors).
 */
export declare function mapScopesToResource(scopes: string | string[]): string | undefined;
/**
 * Internal type roughly matching the raw responses of the authentication endpoints.
 *
 * @internal
 */
export interface TokenResponseParsedBody {
    access_token?: string;
    refresh_token?: string;
    expires_in: number;
    expires_on?: number | string;
    refresh_on?: number | string;
}
/**
 * Given a token response, return the expiration timestamp as the number of milliseconds from the Unix epoch.
 * @param body - A parsed response body from the authentication endpoint.
 */
export declare function parseExpirationTimestamp(body: TokenResponseParsedBody): number;
/**
 * Given a token response, return the expiration timestamp as the number of milliseconds from the Unix epoch.
 * @param body - A parsed response body from the authentication endpoint.
 */
export declare function parseRefreshTimestamp(body: TokenResponseParsedBody): number | undefined;
//# sourceMappingURL=utils.d.ts.map