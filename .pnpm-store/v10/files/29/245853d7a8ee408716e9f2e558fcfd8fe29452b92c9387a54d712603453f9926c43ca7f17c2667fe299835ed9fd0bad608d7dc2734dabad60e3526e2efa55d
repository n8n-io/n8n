/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthBrowserConfiguration } from "../../configuration/CustomAuthConfiguration.js";
import { SignOutResult } from "./result/SignOutResult.js";
import { GetAccessTokenResult } from "./result/GetAccessTokenResult.js";
import { CustomAuthSilentCacheClient } from "../interaction_client/CustomAuthSilentCacheClient.js";
import { NoCachedAccountFoundError } from "../../core/error/NoCachedAccountFoundError.js";
import { DefaultScopes } from "../../CustomAuthConstants.js";
import { AccessTokenRetrievalInputs } from "../../CustomAuthActionInputs.js";
import {
    AccountInfo,
    AuthenticationScheme,
    CommonSilentFlowRequest,
    Logger,
    TokenClaims,
} from "@azure/msal-common/browser";
import { SilentRequest } from "../../../request/SilentRequest.js";
import * as ArgumentValidator from "../../core/utils/ArgumentValidator.js";

/*
 * Account information.
 */
export class CustomAuthAccountData {
    constructor(
        private readonly account: AccountInfo,
        private readonly config: CustomAuthBrowserConfiguration,
        private readonly cacheClient: CustomAuthSilentCacheClient,
        private readonly logger: Logger,
        private readonly correlationId: string
    ) {
        ArgumentValidator.ensureArgumentIsNotEmptyString(
            "correlationId",
            correlationId
        );
        ArgumentValidator.ensureArgumentIsNotNullOrUndefined(
            "account",
            account,
            correlationId
        );
    }

    /**
     * This method triggers a sign-out operation,
     * which removes the current account info and its tokens from browser cache.
     * If sign-out successfully, redirect the page to postLogoutRedirectUri if provided in the configuration.
     * @returns {Promise<SignOutResult>} The result of the SignOut operation.
     */
    async signOut(): Promise<SignOutResult> {
        try {
            const currentAccount = this.cacheClient.getCurrentAccount(
                this.correlationId
            );

            if (!currentAccount) {
                throw new NoCachedAccountFoundError(this.correlationId);
            }

            this.logger.verbose("Signing out user", this.correlationId);

            await this.cacheClient.logout({
                correlationId: this.correlationId,
                account: currentAccount,
            });

            this.logger.verbose("User signed out", this.correlationId);

            return new SignOutResult();
        } catch (error) {
            this.logger.errorPii(
                `An error occurred during sign out: ${error}`,
                this.correlationId
            );

            return SignOutResult.createWithError(error);
        }
    }

    getAccount(): AccountInfo {
        return this.account;
    }

    /**
     * Gets the raw id-token of current account.
     * Idtoken is only issued if openid scope is present in the scopes parameter when requesting for tokens,
     * otherwise will return undefined from the response.
     * @returns {string|undefined} The account id-token.
     */
    getIdToken(): string | undefined {
        return this.account.idToken;
    }

    /**
     * Gets the id token claims extracted from raw IdToken of current account.
     * @returns {AuthTokenClaims|undefined} The token claims.
     */
    getClaims(): AuthTokenClaims | undefined {
        return this.account.idTokenClaims;
    }

    /**
     * Gets the access token of current account from browser cache if it is not expired,
     * otherwise renew the token using cached refresh token if valid.
     * If no refresh token is found or it is expired, then throws error.
     * @param {AccessTokenRetrievalInputs} accessTokenRetrievalInputs - The inputs for retrieving the access token.
     * @returns {Promise<GetAccessTokenResult>} The result of the operation.
     */
    async getAccessToken(
        accessTokenRetrievalInputs: AccessTokenRetrievalInputs
    ): Promise<GetAccessTokenResult> {
        try {
            ArgumentValidator.ensureArgumentIsNotNullOrUndefined(
                "accessTokenRetrievalInputs",
                accessTokenRetrievalInputs,
                this.correlationId
            );

            if (accessTokenRetrievalInputs.claims) {
                ArgumentValidator.ensureArgumentIsJSONString(
                    "accessTokenRetrievalInputs.claims",
                    accessTokenRetrievalInputs.claims,
                    this.correlationId
                );
            }

            this.logger.verbose("Getting current account.", this.correlationId);

            const currentAccount = this.cacheClient.getCurrentAccount(
                this.account.username
            );

            if (!currentAccount) {
                throw new NoCachedAccountFoundError(this.correlationId);
            }

            this.logger.verbose("Getting access token.", this.correlationId);

            const newScopes =
                accessTokenRetrievalInputs.scopes &&
                accessTokenRetrievalInputs.scopes.length > 0
                    ? accessTokenRetrievalInputs.scopes
                    : [...DefaultScopes];
            const commonSilentFlowRequest = this.createCommonSilentFlowRequest(
                currentAccount,
                accessTokenRetrievalInputs.forceRefresh,
                newScopes,
                accessTokenRetrievalInputs.claims
            );
            const result = await this.cacheClient.acquireToken(
                commonSilentFlowRequest
            );

            this.logger.verbose(
                "Successfully got access token from cache.",
                this.correlationId
            );

            return new GetAccessTokenResult(result);
        } catch (error) {
            this.logger.error(
                "Failed to get access token from cache.",
                this.correlationId
            );

            return GetAccessTokenResult.createWithError(error);
        }
    }

    private createCommonSilentFlowRequest(
        accountInfo: AccountInfo,
        forceRefresh: boolean = false,
        requestScopes: Array<string>,
        claims?: string
    ): CommonSilentFlowRequest {
        const silentRequest: SilentRequest = {
            authority: this.config.auth.authority,
            correlationId: this.correlationId,
            scopes: requestScopes || [],
            account: accountInfo,
            forceRefresh: forceRefresh || false,
            storeInCache: {
                idToken: true,
                accessToken: true,
                refreshToken: true,
            },
            ...(claims && { claims: claims }),
        };

        return {
            ...silentRequest,
            authenticationScheme: AuthenticationScheme.BEARER,
        } as CommonSilentFlowRequest;
    }
}

export type AuthTokenClaims = TokenClaims & {
    [key: string]: string | number | string[] | object | undefined | unknown;
};
