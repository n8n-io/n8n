import { CustomAuthBrowserConfiguration } from "../../configuration/CustomAuthConfiguration.js";
import { SignOutResult } from "./result/SignOutResult.js";
import { GetAccessTokenResult } from "./result/GetAccessTokenResult.js";
import { CustomAuthSilentCacheClient } from "../interaction_client/CustomAuthSilentCacheClient.js";
import { AccessTokenRetrievalInputs } from "../../CustomAuthActionInputs.js";
import { AccountInfo, Logger, TokenClaims } from "@azure/msal-common/browser";
export declare class CustomAuthAccountData {
    private readonly account;
    private readonly config;
    private readonly cacheClient;
    private readonly logger;
    private readonly correlationId;
    constructor(account: AccountInfo, config: CustomAuthBrowserConfiguration, cacheClient: CustomAuthSilentCacheClient, logger: Logger, correlationId: string);
    /**
     * This method triggers a sign-out operation,
     * which removes the current account info and its tokens from browser cache.
     * If sign-out successfully, redirect the page to postLogoutRedirectUri if provided in the configuration.
     * @returns {Promise<SignOutResult>} The result of the SignOut operation.
     */
    signOut(): Promise<SignOutResult>;
    getAccount(): AccountInfo;
    /**
     * Gets the raw id-token of current account.
     * Idtoken is only issued if openid scope is present in the scopes parameter when requesting for tokens,
     * otherwise will return undefined from the response.
     * @returns {string|undefined} The account id-token.
     */
    getIdToken(): string | undefined;
    /**
     * Gets the id token claims extracted from raw IdToken of current account.
     * @returns {AuthTokenClaims|undefined} The token claims.
     */
    getClaims(): AuthTokenClaims | undefined;
    /**
     * Gets the access token of current account from browser cache if it is not expired,
     * otherwise renew the token using cached refresh token if valid.
     * If no refresh token is found or it is expired, then throws error.
     * @param {AccessTokenRetrievalInputs} accessTokenRetrievalInputs - The inputs for retrieving the access token.
     * @returns {Promise<GetAccessTokenResult>} The result of the operation.
     */
    getAccessToken(accessTokenRetrievalInputs: AccessTokenRetrievalInputs): Promise<GetAccessTokenResult>;
    private createCommonSilentFlowRequest;
}
export type AuthTokenClaims = TokenClaims & {
    [key: string]: string | number | string[] | object | undefined | unknown;
};
//# sourceMappingURL=CustomAuthAccountData.d.ts.map