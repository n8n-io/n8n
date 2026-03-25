/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createAuthError, AuthErrorCodes } from '@azure/msal-common/browser';
import { PlatformAuthConstants } from '../../utils/BrowserConstants.mjs';
import { createNativeAuthError } from '../../error/NativeAuthError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class PlatformAuthDOMHandler {
    constructor(logger, performanceClient, correlationId) {
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.correlationId = correlationId;
        this.platformAuthType = PlatformAuthConstants.PLATFORM_DOM_PROVIDER;
    }
    static async createProvider(logger, performanceClient, correlationId) {
        logger.trace("PlatformAuthDOMHandler: createProvider called");
        // @ts-ignore
        if (window.navigator?.platformAuthentication) {
            const supportedContracts = 
            // @ts-ignore
            await window.navigator.platformAuthentication.getSupportedContracts(PlatformAuthConstants.MICROSOFT_ENTRA_BROKERID);
            if (supportedContracts?.includes(PlatformAuthConstants.PLATFORM_DOM_APIS)) {
                logger.trace("Platform auth api available in DOM");
                return new PlatformAuthDOMHandler(logger, performanceClient, correlationId);
            }
        }
        return undefined;
    }
    /**
     * Returns the Id for the broker extension this handler is communicating with
     * @returns
     */
    getExtensionId() {
        return PlatformAuthConstants.MICROSOFT_ENTRA_BROKERID;
    }
    getExtensionVersion() {
        return "";
    }
    getExtensionName() {
        return PlatformAuthConstants.DOM_API_NAME;
    }
    /**
     * Send token request to platform broker via browser DOM API
     * @param request
     * @returns
     */
    async sendMessage(request) {
        this.logger.trace(this.platformAuthType + " - Sending request to browser DOM API");
        try {
            const platformDOMRequest = this.initializePlatformDOMRequest(request);
            const response = 
            // @ts-ignore
            await window.navigator.platformAuthentication.executeGetToken(platformDOMRequest);
            return this.validatePlatformBrokerResponse(response);
        }
        catch (e) {
            this.logger.error(this.platformAuthType + " - executeGetToken DOM API error");
            throw e;
        }
    }
    initializePlatformDOMRequest(request) {
        this.logger.trace(this.platformAuthType + " - initializeNativeDOMRequest called");
        const { accountId, clientId, authority, scope, redirectUri, correlationId, state, storeInCache, embeddedClientId, extraParameters, ...remainingProperties } = request;
        const validExtraParameters = this.getDOMExtraParams(remainingProperties);
        const platformDOMRequest = {
            accountId: accountId,
            brokerId: this.getExtensionId(),
            authority: authority,
            clientId: clientId,
            correlationId: correlationId || this.correlationId,
            extraParameters: { ...extraParameters, ...validExtraParameters },
            isSecurityTokenService: false,
            redirectUri: redirectUri,
            scope: scope,
            state: state,
            storeInCache: storeInCache,
            embeddedClientId: embeddedClientId,
        };
        return platformDOMRequest;
    }
    validatePlatformBrokerResponse(response) {
        if (response.hasOwnProperty("isSuccess")) {
            if (response.hasOwnProperty("accessToken") &&
                response.hasOwnProperty("idToken") &&
                response.hasOwnProperty("clientInfo") &&
                response.hasOwnProperty("account") &&
                response.hasOwnProperty("scopes") &&
                response.hasOwnProperty("expiresIn")) {
                this.logger.trace(this.platformAuthType +
                    " - platform broker returned successful and valid response");
                return this.convertToPlatformBrokerResponse(response);
            }
            else if (response.hasOwnProperty("error")) {
                const errorResponse = response;
                if (errorResponse.isSuccess === false &&
                    errorResponse.error &&
                    errorResponse.error.code) {
                    this.logger.trace(this.platformAuthType +
                        " - platform broker returned error response");
                    throw createNativeAuthError(errorResponse.error.code, errorResponse.error.description, {
                        error: parseInt(errorResponse.error.errorCode),
                        protocol_error: errorResponse.error.protocolError,
                        status: errorResponse.error.status,
                        properties: errorResponse.error.properties,
                    });
                }
            }
        }
        throw createAuthError(AuthErrorCodes.unexpectedError, "Response missing expected properties.");
    }
    convertToPlatformBrokerResponse(response) {
        this.logger.trace(this.platformAuthType + " - convertToNativeResponse called");
        const nativeResponse = {
            access_token: response.accessToken,
            id_token: response.idToken,
            client_info: response.clientInfo,
            account: response.account,
            expires_in: response.expiresIn,
            scope: response.scopes,
            state: response.state || "",
            properties: response.properties || {},
            extendedLifetimeToken: response.extendedLifetimeToken ?? false,
            shr: response.proofOfPossessionPayload,
        };
        return nativeResponse;
    }
    getDOMExtraParams(extraParameters) {
        const stringifiedParams = Object.entries(extraParameters).reduce((record, [key, value]) => {
            record[key] = String(value);
            return record;
        }, {});
        const validExtraParams = {
            ...stringifiedParams,
        };
        return validExtraParams;
    }
}

export { PlatformAuthDOMHandler };
//# sourceMappingURL=PlatformAuthDOMHandler.mjs.map
