import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
/**
 * A function that gets a promise of an access token and allows providing
 * options.
 *
 * @param options - the options to pass to the underlying token provider
 */
export type AccessTokenGetter = (scopes: string | string[], options: GetTokenOptions) => Promise<AccessToken>;
export interface TokenCyclerOptions {
    /**
     * The window of time before token expiration during which the token will be
     * considered unusable due to risk of the token expiring before sending the
     * request.
     *
     * This will only become meaningful if the refresh fails for over
     * (refreshWindow - forcedRefreshWindow) milliseconds.
     */
    forcedRefreshWindowInMs: number;
    /**
     * Interval in milliseconds to retry failed token refreshes.
     */
    retryIntervalInMs: number;
    /**
     * The window of time before token expiration during which
     * we will attempt to refresh the token.
     */
    refreshWindowInMs: number;
}
export declare const DEFAULT_CYCLER_OPTIONS: TokenCyclerOptions;
/**
 * Creates a token cycler from a credential, scopes, and optional settings.
 *
 * A token cycler represents a way to reliably retrieve a valid access token
 * from a TokenCredential. It will handle initializing the token, refreshing it
 * when it nears expiration, and synchronizes refresh attempts to avoid
 * concurrency hazards.
 *
 * @param credential - the underlying TokenCredential that provides the access
 * token
 * @param tokenCyclerOptions - optionally override default settings for the cycler
 *
 * @returns - a function that reliably produces a valid access token
 */
export declare function createTokenCycler(credential: TokenCredential, tokenCyclerOptions?: Partial<TokenCyclerOptions>): AccessTokenGetter;
//# sourceMappingURL=tokenCycler.d.ts.map