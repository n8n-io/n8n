import { AuthorizationCodePayload, CommonAuthorizationCodeRequest, AuthorizationCodeClient, CcsCredential, Logger, IPerformanceClient, AuthorizeResponse, CommonAuthorizationUrlRequest } from "@azure/msal-common/browser";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
/**
 * Abstract class which defines operations for a browser interaction handling class.
 */
export declare class InteractionHandler {
    protected authModule: AuthorizationCodeClient;
    protected browserStorage: BrowserCacheManager;
    protected authCodeRequest: CommonAuthorizationCodeRequest;
    protected logger: Logger;
    protected performanceClient: IPerformanceClient;
    constructor(authCodeModule: AuthorizationCodeClient, storageImpl: BrowserCacheManager, authCodeRequest: CommonAuthorizationCodeRequest, logger: Logger, performanceClient: IPerformanceClient);
    /**
     * Function to handle response parameters from hash.
     * @param locationHash
     */
    handleCodeResponse(response: AuthorizeResponse, request: CommonAuthorizationUrlRequest): Promise<AuthenticationResult>;
    /**
     * Process auth code response from AAD
     * @param authCodeResponse
     * @param state
     * @param authority
     * @param networkModule
     * @returns
     */
    handleCodeResponseFromServer(authCodeResponse: AuthorizationCodePayload, request: CommonAuthorizationUrlRequest, validateNonce?: boolean): Promise<AuthenticationResult>;
    /**
     * Build ccs creds if available
     */
    protected createCcsCredentials(request: CommonAuthorizationUrlRequest): CcsCredential | null;
}
//# sourceMappingURL=InteractionHandler.d.ts.map