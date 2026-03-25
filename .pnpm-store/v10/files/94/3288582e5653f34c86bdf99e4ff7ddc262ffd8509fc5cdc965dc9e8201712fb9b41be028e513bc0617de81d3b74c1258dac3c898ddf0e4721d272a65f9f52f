import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
/**
 * @internal
 */
export declare const logger: import("../util/logging.js").CredentialLogger;
/**
 * Enables multiple `TokenCredential` implementations to be tried in order until
 * one of the getToken methods returns an access token. For more information, see
 * [ChainedTokenCredential overview](https://aka.ms/azsdk/js/identity/credential-chains#use-chainedtokencredential-for-granularity).
 */
export declare class ChainedTokenCredential implements TokenCredential {
    private _sources;
    /**
     * Creates an instance of ChainedTokenCredential using the given credentials.
     *
     * @param sources - `TokenCredential` implementations to be tried in order.
     *
     * Example usage:
     * ```ts snippet:chained_token_credential_example
     * import { ClientSecretCredential, ChainedTokenCredential } from "@azure/identity";
     *
     * const tenantId = "<tenant-id>";
     * const clientId = "<client-id>";
     * const clientSecret = "<client-secret>";
     * const anotherClientId = "<another-client-id>";
     * const anotherSecret = "<another-client-secret>";
     *
     * const firstCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);
     * const secondCredential = new ClientSecretCredential(tenantId, anotherClientId, anotherSecret);
     *
     * const credentialChain = new ChainedTokenCredential(firstCredential, secondCredential);
     * ```
     */
    constructor(...sources: TokenCredential[]);
    /**
     * Returns the first access token returned by one of the chained
     * `TokenCredential` implementations.  Throws an {@link AggregateAuthenticationError}
     * when one or more credentials throws an {@link AuthenticationError} and
     * no credentials have returned an access token.
     *
     * This method is called automatically by Azure SDK client libraries. You may call this method
     * directly, but you must also handle token caching and token refreshing.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                `TokenCredential` implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    private getTokenInternal;
}
//# sourceMappingURL=chainedTokenCredential.d.ts.map