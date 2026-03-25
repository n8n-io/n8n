import { ICustomAuthApiClient } from "../network_client/custom_auth_api/ICustomAuthApiClient.js";
import { CustomAuthAuthority } from "../CustomAuthAuthority.js";
import { StandardInteractionClient } from "../../../interaction_client/StandardInteractionClient.js";
import { BrowserConfiguration } from "../../../config/Configuration.js";
import { BrowserCacheManager } from "../../../cache/BrowserCacheManager.js";
import { ICrypto, IPerformanceClient, Logger } from "@azure/msal-common/browser";
import { EventHandler } from "../../../event/EventHandler.js";
import { INavigationClient } from "../../../navigation/INavigationClient.js";
import { RedirectRequest } from "../../../request/RedirectRequest.js";
import { PopupRequest } from "../../../request/PopupRequest.js";
import { SsoSilentRequest } from "../../../request/SsoSilentRequest.js";
import { EndSessionRequest } from "../../../request/EndSessionRequest.js";
import { ClearCacheRequest } from "../../../request/ClearCacheRequest.js";
import { AuthenticationResult } from "../../../response/AuthenticationResult.js";
import { SignInTokenResponse } from "../network_client/custom_auth_api/types/ApiResponseTypes.js";
export declare abstract class CustomAuthInteractionClientBase extends StandardInteractionClient {
    protected customAuthApiClient: ICustomAuthApiClient;
    protected customAuthAuthority: CustomAuthAuthority;
    private readonly tokenResponseHandler;
    constructor(config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, performanceClient: IPerformanceClient, customAuthApiClient: ICustomAuthApiClient, customAuthAuthority: CustomAuthAuthority);
    protected getChallengeTypes(configuredChallengeTypes: string[] | undefined): string;
    protected getScopes(scopes: string[] | undefined): string[];
    /**
     * Common method to handle token response processing.
     * @param tokenResponse The token response from the API
     * @param requestScopes Scopes for the token request
     * @param correlationId Correlation ID for logging
     * @returns Authentication result from the token response
     */
    protected handleTokenResponse(tokenResponse: SignInTokenResponse, requestScopes: string[], correlationId: string): Promise<AuthenticationResult>;
    acquireToken(request: RedirectRequest | PopupRequest | SsoSilentRequest): Promise<AuthenticationResult | void>;
    logout(request: EndSessionRequest | ClearCacheRequest | undefined): Promise<void>;
}
//# sourceMappingURL=CustomAuthInteractionClientBase.d.ts.map