/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { MethodNotImplementedError } from '../error/MethodNotImplementedError.mjs';
import { ChallengeType } from '../../CustomAuthConstants.mjs';
import { StandardInteractionClient } from '../../../interaction_client/StandardInteractionClient.mjs';
import { ResponseHandler, Constants } from '@azure/msal-common/browser';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class CustomAuthInteractionClientBase extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, customAuthApiClient, customAuthAuthority) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient);
        this.customAuthApiClient = customAuthApiClient;
        this.customAuthAuthority = customAuthAuthority;
        this.tokenResponseHandler = new ResponseHandler(this.config.auth.clientId, this.browserStorage, this.browserCrypto, this.logger, null, null);
    }
    getChallengeTypes(configuredChallengeTypes) {
        const challengeType = configuredChallengeTypes ?? [];
        if (!challengeType.some((type) => type.toLowerCase() === ChallengeType.REDIRECT)) {
            challengeType.push(ChallengeType.REDIRECT);
        }
        return challengeType.join(" ");
    }
    getScopes(scopes) {
        if (!!scopes && scopes.length > 0) {
            return scopes;
        }
        return [
            Constants.OPENID_SCOPE,
            Constants.PROFILE_SCOPE,
            Constants.OFFLINE_ACCESS_SCOPE,
        ];
    }
    /**
     * Common method to handle token response processing.
     * @param tokenResponse The token response from the API
     * @param requestScopes Scopes for the token request
     * @param correlationId Correlation ID for logging
     * @returns Authentication result from the token response
     */
    async handleTokenResponse(tokenResponse, requestScopes, correlationId) {
        this.logger.verbose("Processing token response.", correlationId);
        const requestTimestamp = Math.round(new Date().getTime() / 1000.0);
        // Save tokens and create authentication result
        const result = await this.tokenResponseHandler.handleServerTokenResponse(tokenResponse, this.customAuthAuthority, requestTimestamp, {
            authority: this.customAuthAuthority.canonicalAuthority,
            correlationId: tokenResponse.correlation_id ?? correlationId,
            scopes: requestScopes,
        });
        return result;
    }
    // It is not necessary to implement this method from base class.
    acquireToken(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        throw new MethodNotImplementedError("SignInClient.acquireToken");
    }
    // It is not necessary to implement this method from base class.
    logout(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        throw new MethodNotImplementedError("SignInClient.logout");
    }
}

export { CustomAuthInteractionClientBase };
//# sourceMappingURL=CustomAuthInteractionClientBase.mjs.map
