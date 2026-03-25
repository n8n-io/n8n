/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { RequestParameterBuilder, StringUtils, OIDC_DEFAULT_SCOPES, AuthenticationScheme, createClientAuthError, ClientAuthErrorCodes, TimeUtils, AuthToken, buildTenantProfile, AuthError, InteractionRequiredAuthError, ServerError, ClientAuthError } from '@azure/msal-common/browser';
import { isBridgeError } from '../BridgeError.mjs';
import { BridgeStatusCode } from '../BridgeStatusCode.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NestedAppAuthAdapter {
    constructor(clientId, clientCapabilities, crypto, logger) {
        this.clientId = clientId;
        this.clientCapabilities = clientCapabilities;
        this.crypto = crypto;
        this.logger = logger;
    }
    toNaaTokenRequest(request) {
        let extraParams;
        if (request.extraQueryParameters === undefined) {
            extraParams = new Map();
        }
        else {
            extraParams = new Map(Object.entries(request.extraQueryParameters));
        }
        const correlationId = request.correlationId || this.crypto.createNewGuid();
        const claims = RequestParameterBuilder.addClientCapabilitiesToClaims(request.claims, this.clientCapabilities);
        const scopes = request.scopes || OIDC_DEFAULT_SCOPES;
        const tokenRequest = {
            platformBrokerId: request.account?.homeAccountId,
            clientId: this.clientId,
            authority: request.authority,
            scope: scopes.join(" "),
            correlationId,
            claims: !StringUtils.isEmptyObj(claims) ? claims : undefined,
            state: request.state,
            authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER,
            extraParameters: extraParams,
        };
        return tokenRequest;
    }
    fromNaaTokenResponse(request, response, reqTimestamp) {
        if (!response.token.id_token || !response.token.access_token) {
            throw createClientAuthError(ClientAuthErrorCodes.nullOrEmptyToken);
        }
        // Request timestamp and AuthResult expires_in are in seconds, converting to Date for AuthenticationResult
        const expiresOn = TimeUtils.toDateFromSeconds(reqTimestamp + (response.token.expires_in || 0));
        const idTokenClaims = AuthToken.extractTokenClaims(response.token.id_token, this.crypto.base64Decode);
        const account = this.fromNaaAccountInfo(response.account, response.token.id_token, idTokenClaims);
        const scopes = response.token.scope || request.scope;
        const authenticationResult = {
            authority: response.token.authority || account.environment,
            uniqueId: account.localAccountId,
            tenantId: account.tenantId,
            scopes: scopes.split(" "),
            account,
            idToken: response.token.id_token,
            idTokenClaims,
            accessToken: response.token.access_token,
            fromCache: false,
            expiresOn: expiresOn,
            tokenType: request.authenticationScheme || AuthenticationScheme.BEARER,
            correlationId: request.correlationId,
            extExpiresOn: expiresOn,
            state: request.state,
        };
        return authenticationResult;
    }
    /*
     *  export type AccountInfo = {
     *     homeAccountId: string;
     *     environment: string;
     *     tenantId: string;
     *     username: string;
     *     localAccountId: string;
     *     name?: string;
     *     idToken?: string;
     *     idTokenClaims?: TokenClaims & {
     *         [key: string]:
     *             | string
     *             | number
     *             | string[]
     *             | object
     *             | undefined
     *             | unknown;
     *     };
     *     nativeAccountId?: string;
     *     authorityType?: string;
     * };
     */
    fromNaaAccountInfo(fromAccount, idToken, idTokenClaims) {
        const effectiveIdTokenClaims = idTokenClaims || fromAccount.idTokenClaims;
        const localAccountId = fromAccount.localAccountId ||
            effectiveIdTokenClaims?.oid ||
            effectiveIdTokenClaims?.sub ||
            "";
        const tenantId = fromAccount.tenantId || effectiveIdTokenClaims?.tid || "";
        const homeAccountId = fromAccount.homeAccountId || `${localAccountId}.${tenantId}`;
        const username = fromAccount.username ||
            effectiveIdTokenClaims?.preferred_username ||
            "";
        const name = fromAccount.name || effectiveIdTokenClaims?.name;
        const loginHint = fromAccount.loginHint || effectiveIdTokenClaims?.login_hint;
        const tenantProfiles = new Map();
        const tenantProfile = buildTenantProfile(homeAccountId, localAccountId, tenantId, effectiveIdTokenClaims);
        tenantProfiles.set(tenantId, tenantProfile);
        const account = {
            homeAccountId,
            environment: fromAccount.environment,
            tenantId,
            username,
            localAccountId,
            name,
            loginHint,
            idToken: idToken,
            idTokenClaims: effectiveIdTokenClaims,
            tenantProfiles,
        };
        return account;
    }
    /**
     *
     * @param error BridgeError
     * @returns AuthError, ClientAuthError, ClientConfigurationError, ServerError, InteractionRequiredError
     */
    fromBridgeError(error) {
        if (isBridgeError(error)) {
            switch (error.status) {
                case BridgeStatusCode.UserCancel:
                    return new ClientAuthError(ClientAuthErrorCodes.userCanceled);
                case BridgeStatusCode.NoNetwork:
                    return new ClientAuthError(ClientAuthErrorCodes.noNetworkConnectivity);
                case BridgeStatusCode.AccountUnavailable:
                    return new ClientAuthError(ClientAuthErrorCodes.noAccountFound);
                case BridgeStatusCode.Disabled:
                    return new ClientAuthError(ClientAuthErrorCodes.nestedAppAuthBridgeDisabled);
                case BridgeStatusCode.NestedAppAuthUnavailable:
                    return new ClientAuthError(error.code ||
                        ClientAuthErrorCodes.nestedAppAuthBridgeDisabled, error.description);
                case BridgeStatusCode.TransientError:
                case BridgeStatusCode.PersistentError:
                    return new ServerError(error.code, error.description);
                case BridgeStatusCode.UserInteractionRequired:
                    return new InteractionRequiredAuthError(error.code, error.description);
                default:
                    return new AuthError(error.code, error.description);
            }
        }
        else {
            return new AuthError("unknown_error", "An unknown error occurred");
        }
    }
    /**
     * Returns an AuthenticationResult from the given cache items
     *
     * @param account
     * @param idToken
     * @param accessToken
     * @param reqTimestamp
     * @returns
     */
    toAuthenticationResultFromCache(account, idToken, accessToken, request, correlationId) {
        if (!idToken || !accessToken) {
            throw createClientAuthError(ClientAuthErrorCodes.nullOrEmptyToken);
        }
        const idTokenClaims = AuthToken.extractTokenClaims(idToken.secret, this.crypto.base64Decode);
        const scopes = accessToken.target || request.scopes.join(" ");
        const authenticationResult = {
            authority: accessToken.environment || account.environment,
            uniqueId: account.localAccountId,
            tenantId: account.tenantId,
            scopes: scopes.split(" "),
            account,
            idToken: idToken.secret,
            idTokenClaims: idTokenClaims || {},
            accessToken: accessToken.secret,
            fromCache: true,
            expiresOn: TimeUtils.toDateFromSeconds(accessToken.expiresOn),
            extExpiresOn: TimeUtils.toDateFromSeconds(accessToken.extendedExpiresOn),
            tokenType: request.authenticationScheme || AuthenticationScheme.BEARER,
            correlationId,
            state: request.state,
        };
        return authenticationResult;
    }
}

export { NestedAppAuthAdapter };
//# sourceMappingURL=NestedAppAuthAdapter.mjs.map
