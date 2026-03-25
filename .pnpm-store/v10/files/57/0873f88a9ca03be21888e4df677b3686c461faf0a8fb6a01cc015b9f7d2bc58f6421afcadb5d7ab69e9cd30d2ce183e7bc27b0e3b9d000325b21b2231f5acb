/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { BaseClient, TimeUtils, ResponseHandler, UrlString, RequestParameterBuilder, UrlUtils, createClientAuthError, ClientAuthErrorCodes, Constants, createAuthError, AuthErrorCodes, GrantType, StringUtils } from '@azure/msal-common/node';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * OAuth2.0 Device code client
 * @public
 */
class DeviceCodeClient extends BaseClient {
    constructor(configuration) {
        super(configuration);
    }
    /**
     * Gets device code from device code endpoint, calls back to with device code response, and
     * polls token endpoint to exchange device code for tokens
     * @param request - developer provided CommonDeviceCodeRequest
     */
    async acquireToken(request) {
        const deviceCodeResponse = await this.getDeviceCode(request);
        request.deviceCodeCallback(deviceCodeResponse);
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.acquireTokenWithDeviceCode(request, deviceCodeResponse);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        // Validate response. This function throws a server error if an error is returned by the server.
        responseHandler.validateTokenResponse(response);
        return responseHandler.handleServerTokenResponse(response, this.authority, reqTimestamp, request);
    }
    /**
     * Creates device code request and executes http GET
     * @param request - developer provided CommonDeviceCodeRequest
     */
    async getDeviceCode(request) {
        const queryParametersString = this.createExtraQueryParameters(request);
        const endpoint = UrlString.appendQueryString(this.authority.deviceCodeEndpoint, queryParametersString);
        const queryString = this.createQueryString(request);
        const headers = this.createTokenRequestHeaders();
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: request.authority,
            scopes: request.scopes,
            claims: request.claims,
            authenticationScheme: request.authenticationScheme,
            resourceRequestMethod: request.resourceRequestMethod,
            resourceRequestUri: request.resourceRequestUri,
            shrClaims: request.shrClaims,
            sshKid: request.sshKid,
        };
        return this.executePostRequestToDeviceCodeEndpoint(endpoint, queryString, headers, thumbprint, request.correlationId);
    }
    /**
     * Creates query string for the device code request
     * @param request - developer provided CommonDeviceCodeRequest
     */
    createExtraQueryParameters(request) {
        const parameters = new Map();
        if (request.extraQueryParameters) {
            RequestParameterBuilder.addExtraQueryParameters(parameters, request.extraQueryParameters);
        }
        return UrlUtils.mapToQueryString(parameters);
    }
    /**
     * Executes POST request to device code endpoint
     * @param deviceCodeEndpoint - token endpoint
     * @param queryString - string to be used in the body of the request
     * @param headers - headers for the request
     * @param thumbprint - unique request thumbprint
     * @param correlationId - correlation id to be used in the request
     */
    async executePostRequestToDeviceCodeEndpoint(deviceCodeEndpoint, queryString, headers, thumbprint, correlationId) {
        const { body: { user_code: userCode, device_code: deviceCode, verification_uri: verificationUri, expires_in: expiresIn, interval, message, }, } = await this.sendPostRequest(thumbprint, deviceCodeEndpoint, {
            body: queryString,
            headers: headers,
        }, correlationId);
        return {
            userCode,
            deviceCode,
            verificationUri,
            expiresIn,
            interval,
            message,
        };
    }
    /**
     * Create device code endpoint query parameters and returns string
     * @param request - developer provided CommonDeviceCodeRequest
     */
    createQueryString(request) {
        const parameters = new Map();
        RequestParameterBuilder.addScopes(parameters, request.scopes);
        RequestParameterBuilder.addClientId(parameters, this.config.authOptions.clientId);
        if (request.extraQueryParameters) {
            RequestParameterBuilder.addExtraQueryParameters(parameters, request.extraQueryParameters);
        }
        if (request.claims ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)) {
            RequestParameterBuilder.addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
        }
        return UrlUtils.mapToQueryString(parameters);
    }
    /**
     * Breaks the polling with specific conditions
     * @param deviceCodeExpirationTime - expiration time for the device code request
     * @param userSpecifiedTimeout - developer provided timeout, to be compared against deviceCodeExpirationTime
     * @param userSpecifiedCancelFlag - boolean indicating the developer would like to cancel the request
     */
    continuePolling(deviceCodeExpirationTime, userSpecifiedTimeout, userSpecifiedCancelFlag) {
        if (userSpecifiedCancelFlag) {
            this.logger.error("Token request cancelled by setting DeviceCodeRequest.cancel = true");
            throw createClientAuthError(ClientAuthErrorCodes.deviceCodePollingCancelled);
        }
        else if (userSpecifiedTimeout &&
            userSpecifiedTimeout < deviceCodeExpirationTime &&
            TimeUtils.nowSeconds() > userSpecifiedTimeout) {
            this.logger.error(`User defined timeout for device code polling reached. The timeout was set for ${userSpecifiedTimeout}`);
            throw createClientAuthError(ClientAuthErrorCodes.userTimeoutReached);
        }
        else if (TimeUtils.nowSeconds() > deviceCodeExpirationTime) {
            if (userSpecifiedTimeout) {
                this.logger.verbose(`User specified timeout ignored as the device code has expired before the timeout elapsed. The user specified timeout was set for ${userSpecifiedTimeout}`);
            }
            this.logger.error(`Device code expired. Expiration time of device code was ${deviceCodeExpirationTime}`);
            throw createClientAuthError(ClientAuthErrorCodes.deviceCodeExpired);
        }
        return true;
    }
    /**
     * Creates token request with device code response and polls token endpoint at interval set by the device code response
     * @param request - developer provided CommonDeviceCodeRequest
     * @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
     */
    async acquireTokenWithDeviceCode(request, deviceCodeResponse) {
        const queryParametersString = this.createTokenQueryParameters(request);
        const endpoint = UrlString.appendQueryString(this.authority.tokenEndpoint, queryParametersString);
        const requestBody = this.createTokenRequestBody(request, deviceCodeResponse);
        const headers = this.createTokenRequestHeaders();
        const userSpecifiedTimeout = request.timeout
            ? TimeUtils.nowSeconds() + request.timeout
            : undefined;
        const deviceCodeExpirationTime = TimeUtils.nowSeconds() + deviceCodeResponse.expiresIn;
        const pollingIntervalMilli = deviceCodeResponse.interval * 1000;
        /*
         * Poll token endpoint while (device code is not expired AND operation has not been cancelled by
         * setting CancellationToken.cancel = true). POST request is sent at interval set by pollingIntervalMilli
         */
        while (this.continuePolling(deviceCodeExpirationTime, userSpecifiedTimeout, request.cancel)) {
            const thumbprint = {
                clientId: this.config.authOptions.clientId,
                authority: request.authority,
                scopes: request.scopes,
                claims: request.claims,
                authenticationScheme: request.authenticationScheme,
                resourceRequestMethod: request.resourceRequestMethod,
                resourceRequestUri: request.resourceRequestUri,
                shrClaims: request.shrClaims,
                sshKid: request.sshKid,
            };
            const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
            if (response.body && response.body.error) {
                // user authorization is pending. Sleep for polling interval and try again
                if (response.body.error === Constants.AUTHORIZATION_PENDING) {
                    this.logger.info("Authorization pending. Continue polling.");
                    await TimeUtils.delay(pollingIntervalMilli);
                }
                else {
                    // for any other error, throw
                    this.logger.info("Unexpected error in polling from the server");
                    throw createAuthError(AuthErrorCodes.postRequestFailed, response.body.error);
                }
            }
            else {
                this.logger.verbose("Authorization completed successfully. Polling stopped.");
                return response.body;
            }
        }
        /*
         * The above code should've thrown by this point, but to satisfy TypeScript,
         * and in the rare case the conditionals in continuePolling() may not catch everything...
         */
        this.logger.error("Polling stopped for unknown reasons.");
        throw createClientAuthError(ClientAuthErrorCodes.deviceCodeUnknownError);
    }
    /**
     * Creates query parameters and converts to string.
     * @param request - developer provided CommonDeviceCodeRequest
     * @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
     */
    createTokenRequestBody(request, deviceCodeResponse) {
        const parameters = new Map();
        RequestParameterBuilder.addScopes(parameters, request.scopes);
        RequestParameterBuilder.addClientId(parameters, this.config.authOptions.clientId);
        RequestParameterBuilder.addGrantType(parameters, GrantType.DEVICE_CODE_GRANT);
        RequestParameterBuilder.addDeviceCode(parameters, deviceCodeResponse.deviceCode);
        const correlationId = request.correlationId ||
            this.config.cryptoInterface.createNewGuid();
        RequestParameterBuilder.addCorrelationId(parameters, correlationId);
        RequestParameterBuilder.addClientInfo(parameters);
        RequestParameterBuilder.addLibraryInfo(parameters, this.config.libraryInfo);
        RequestParameterBuilder.addApplicationTelemetry(parameters, this.config.telemetry.application);
        RequestParameterBuilder.addThrottling(parameters);
        if (this.serverTelemetryManager) {
            RequestParameterBuilder.addServerTelemetry(parameters, this.serverTelemetryManager);
        }
        if (!StringUtils.isEmptyObj(request.claims) ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)) {
            RequestParameterBuilder.addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
        }
        return UrlUtils.mapToQueryString(parameters);
    }
}

export { DeviceCodeClient };
//# sourceMappingURL=DeviceCodeClient.mjs.map
