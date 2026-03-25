import { TokenRequest } from "../TokenRequest.js";
import { AccountInfo as NaaAccountInfo } from "../AccountInfo.js";
import { RedirectRequest } from "../../request/RedirectRequest.js";
import { PopupRequest } from "../../request/PopupRequest.js";
import { AccountInfo as MsalAccountInfo, AuthError, ClientAuthError, ClientConfigurationError, InteractionRequiredAuthError, ServerError, ICrypto, Logger, TokenClaims, AccountInfo, IdTokenEntity, AccessTokenEntity } from "@azure/msal-common/browser";
import { AuthenticationResult } from "../../response/AuthenticationResult.js";
import { AuthResult } from "../AuthResult.js";
import { SsoSilentRequest } from "../../request/SsoSilentRequest.js";
import { SilentRequest } from "../../request/SilentRequest.js";
export declare class NestedAppAuthAdapter {
    protected crypto: ICrypto;
    protected logger: Logger;
    protected clientId: string;
    protected clientCapabilities: string[];
    constructor(clientId: string, clientCapabilities: string[], crypto: ICrypto, logger: Logger);
    toNaaTokenRequest(request: PopupRequest | RedirectRequest | SilentRequest | SsoSilentRequest): TokenRequest;
    fromNaaTokenResponse(request: TokenRequest, response: AuthResult, reqTimestamp: number): AuthenticationResult;
    fromNaaAccountInfo(fromAccount: NaaAccountInfo, idToken?: string, idTokenClaims?: TokenClaims): MsalAccountInfo;
    /**
     *
     * @param error BridgeError
     * @returns AuthError, ClientAuthError, ClientConfigurationError, ServerError, InteractionRequiredError
     */
    fromBridgeError(error: unknown): AuthError | ClientAuthError | ClientConfigurationError | ServerError | InteractionRequiredAuthError;
    /**
     * Returns an AuthenticationResult from the given cache items
     *
     * @param account
     * @param idToken
     * @param accessToken
     * @param reqTimestamp
     * @returns
     */
    toAuthenticationResultFromCache(account: AccountInfo, idToken: IdTokenEntity, accessToken: AccessTokenEntity, request: SilentRequest, correlationId: string): AuthenticationResult;
}
//# sourceMappingURL=NestedAppAuthAdapter.d.ts.map