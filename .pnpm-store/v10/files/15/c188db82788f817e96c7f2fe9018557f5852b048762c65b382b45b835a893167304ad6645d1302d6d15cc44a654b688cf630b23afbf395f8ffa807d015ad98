import { GetTokenOptions, TokenCredential } from '@azure/core-auth';
import { AuthConfiguration } from './';
/**
 * Token credential implementation that uses MSAL (Microsoft Authentication Library) to acquire access tokens.
 * Implements the Azure Core Auth TokenCredential interface for authentication scenarios.
 */
export declare class MsalTokenCredential implements TokenCredential {
    private authConfig;
    /**
     * Creates a new instance of MsalTokenCredential.
     * @param authConfig The authentication configuration to use for token acquisition.
     */
    constructor(authConfig: AuthConfiguration);
    /**
     * Retrieves an access token for the specified scopes using MSAL authentication.
     * @param scopes Array of scopes for which to request an access token. The first scope is used to determine the resource.
     * @param options Optional parameters for token retrieval (currently unused).
     * @returns Promise that resolves to an access token with expiration timestamp.
     */
    getToken(scopes: string[], options?: GetTokenOptions): Promise<{
        token: string;
        expiresOnTimestamp: number;
    }>;
}
