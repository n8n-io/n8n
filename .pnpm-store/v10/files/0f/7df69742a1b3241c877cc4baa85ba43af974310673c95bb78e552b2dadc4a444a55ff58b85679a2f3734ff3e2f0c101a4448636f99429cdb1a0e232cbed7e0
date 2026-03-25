/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createClientConfigurationError, ClientConfigurationErrorCodes, invokeAsync, PerformanceEvents, RequestParameterBuilder, OAuthResponseType, Constants, AuthorizeProtocol, ThrottlingUtils, ResponseHandler, TimeUtils, ProtocolMode, AuthenticationScheme, PopTokenGenerator, ProtocolUtils } from '@azure/msal-common/browser';
import { BrowserConstants } from '../utils/BrowserConstants.mjs';
import { version } from '../packageMetadata.mjs';
import { CryptoOps } from '../crypto/CryptoOps.mjs';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { InteractionHandler } from '../interaction_handler/InteractionHandler.mjs';
import { PlatformAuthInteractionClient } from '../interaction_client/PlatformAuthInteractionClient.mjs';
import { decryptEarResponse } from '../crypto/BrowserCrypto.mjs';
import { earJwkEmpty, earJweEmpty, nativeConnectionNotEstablished } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
 * @param config
 * @param authority
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
async function getStandardParameters(config, authority, request, logger, performanceClient) {
    const parameters = AuthorizeProtocol.getStandardAuthorizeRequestParameters({ ...config.auth, authority: authority }, request, logger, performanceClient);
    RequestParameterBuilder.addLibraryInfo(parameters, {
        sku: BrowserConstants.MSAL_SKU,
        version: version,
        os: "",
        cpu: "",
    });
    if (config.auth.protocolMode !== ProtocolMode.OIDC) {
        RequestParameterBuilder.addApplicationTelemetry(parameters, config.telemetry.application);
    }
    if (request.platformBroker) {
        // signal ests that this is a WAM call
        RequestParameterBuilder.addNativeBroker(parameters);
        // instrument JS-platform bridge specific fields
        performanceClient.addFields({
            isPlatformAuthorizeRequest: true,
        }, request.correlationId);
        // pass the req_cnf for POP
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const cryptoOps = new CryptoOps(logger, performanceClient);
            const popTokenGenerator = new PopTokenGenerator(cryptoOps);
            // req_cnf is always sent as a string for SPAs
            let reqCnfData;
            if (!request.popKid) {
                const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, logger, performanceClient, request.correlationId)(request, logger);
                reqCnfData = generatedReqCnfData.reqCnfString;
            }
            else {
                reqCnfData = cryptoOps.encodeKid(request.popKid);
            }
            RequestParameterBuilder.addPopToken(parameters, reqCnfData);
        }
    }
    RequestParameterBuilder.instrumentBrokerParams(parameters, request.correlationId, performanceClient);
    return parameters;
}
/**
 * Gets the full /authorize URL with request parameters when using Auth Code + PKCE
 * @param config
 * @param authority
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
async function getAuthCodeRequestUrl(config, authority, request, logger, performanceClient) {
    if (!request.codeChallenge) {
        throw createClientConfigurationError(ClientConfigurationErrorCodes.pkceParamsMissing);
    }
    const parameters = await invokeAsync(getStandardParameters, PerformanceEvents.GetStandardParams, logger, performanceClient, request.correlationId)(config, authority, request, logger, performanceClient);
    RequestParameterBuilder.addResponseType(parameters, OAuthResponseType.CODE);
    RequestParameterBuilder.addCodeChallengeParams(parameters, request.codeChallenge, Constants.S256_CODE_CHALLENGE_METHOD);
    RequestParameterBuilder.addExtraQueryParameters(parameters, request.extraQueryParameters || {});
    return AuthorizeProtocol.getAuthorizeUrl(authority, parameters, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
}
/**
 * Gets the form that will be posted to /authorize with request parameters when using EAR
 */
async function getEARForm(frame, config, authority, request, logger, performanceClient) {
    if (!request.earJwk) {
        throw createBrowserAuthError(earJwkEmpty);
    }
    const parameters = await getStandardParameters(config, authority, request, logger, performanceClient);
    RequestParameterBuilder.addResponseType(parameters, OAuthResponseType.IDTOKEN_TOKEN_REFRESHTOKEN);
    RequestParameterBuilder.addEARParameters(parameters, request.earJwk);
    // Also add codeChallenge as backup in case EAR is not supported
    RequestParameterBuilder.addCodeChallengeParams(parameters, request.codeChallenge, Constants.S256_CODE_CHALLENGE_METHOD);
    const queryParams = new Map();
    RequestParameterBuilder.addExtraQueryParameters(queryParams, request.extraQueryParameters || {});
    const url = AuthorizeProtocol.getAuthorizeUrl(authority, queryParams, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
    return createForm(frame, url, parameters);
}
/**
 * Gets the form that will be posted to /authorize with request parameters when using POST method
 */
async function getCodeForm(frame, config, authority, request, logger, performanceClient) {
    const parameters = await getStandardParameters(config, authority, request, logger, performanceClient);
    RequestParameterBuilder.addResponseType(parameters, OAuthResponseType.CODE);
    RequestParameterBuilder.addCodeChallengeParams(parameters, request.codeChallenge, request.codeChallengeMethod || Constants.S256_CODE_CHALLENGE_METHOD);
    RequestParameterBuilder.addPostBodyParameters(parameters, request.authorizePostBodyParameters || {});
    const queryParams = new Map();
    RequestParameterBuilder.addExtraQueryParameters(queryParams, request.extraQueryParameters || {});
    const url = AuthorizeProtocol.getAuthorizeUrl(authority, queryParams, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
    return createForm(frame, url, parameters);
}
/**
 * Creates form element in the provided document with auth parameters in the post body
 * @param frame
 * @param authorizeUrl
 * @param parameters
 * @returns
 */
function createForm(frame, authorizeUrl, parameters) {
    const form = frame.createElement("form");
    form.method = "post";
    form.action = authorizeUrl;
    parameters.forEach((value, key) => {
        const param = frame.createElement("input");
        param.hidden = true;
        param.name = key;
        param.value = value;
        form.appendChild(param);
    });
    frame.body.appendChild(form);
    return form;
}
/**
 * Response handler when server returns accountId on the /authorize request
 * @param request
 * @param accountId
 * @param apiId
 * @param config
 * @param browserStorage
 * @param nativeStorage
 * @param eventHandler
 * @param logger
 * @param performanceClient
 * @param nativeMessageHandler
 * @returns
 */
async function handleResponsePlatformBroker(request, accountId, apiId, config, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider) {
    logger.verbose("Account id found, calling WAM for token");
    if (!platformAuthProvider) {
        throw createBrowserAuthError(nativeConnectionNotEstablished);
    }
    const browserCrypto = new CryptoOps(logger, performanceClient);
    const nativeInteractionClient = new PlatformAuthInteractionClient(config, browserStorage, browserCrypto, logger, eventHandler, config.system.navigationClient, apiId, performanceClient, platformAuthProvider, accountId, nativeStorage, request.correlationId);
    const { userRequestState } = ProtocolUtils.parseRequestState(browserCrypto, request.state);
    return invokeAsync(nativeInteractionClient.acquireToken.bind(nativeInteractionClient), PerformanceEvents.NativeInteractionClientAcquireToken, logger, performanceClient, request.correlationId)({
        ...request,
        state: userRequestState,
        prompt: undefined, // Server should handle the prompt, ideally native broker can do this part silently
    });
}
/**
 * Response handler when server returns code on the /authorize request
 * @param request
 * @param response
 * @param codeVerifier
 * @param authClient
 * @param browserStorage
 * @param logger
 * @param performanceClient
 * @returns
 */
async function handleResponseCode(request, response, codeVerifier, apiId, config, authClient, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider) {
    // Remove throttle if it exists
    ThrottlingUtils.removeThrottle(browserStorage, config.auth.clientId, request);
    if (response.accountId) {
        return invokeAsync(handleResponsePlatformBroker, PerformanceEvents.HandleResponsePlatformBroker, logger, performanceClient, request.correlationId)(request, response.accountId, apiId, config, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider);
    }
    const authCodeRequest = {
        ...request,
        code: response.code || "",
        codeVerifier: codeVerifier,
    };
    // Create popup interaction handler.
    const interactionHandler = new InteractionHandler(authClient, browserStorage, authCodeRequest, logger, performanceClient);
    // Handle response from hash string.
    const result = await invokeAsync(interactionHandler.handleCodeResponse.bind(interactionHandler), PerformanceEvents.HandleCodeResponse, logger, performanceClient, request.correlationId)(response, request);
    return result;
}
/**
 * Response handler when server returns ear_jwe on the /authorize request
 * @param request
 * @param response
 * @param apiId
 * @param config
 * @param authority
 * @param browserStorage
 * @param nativeStorage
 * @param eventHandler
 * @param logger
 * @param performanceClient
 * @param nativeMessageHandler
 * @returns
 */
async function handleResponseEAR(request, response, apiId, config, authority, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider) {
    // Remove throttle if it exists
    ThrottlingUtils.removeThrottle(browserStorage, config.auth.clientId, request);
    // Validate state & check response for errors
    AuthorizeProtocol.validateAuthorizationResponse(response, request.state);
    if (!response.ear_jwe) {
        throw createBrowserAuthError(earJweEmpty);
    }
    if (!request.earJwk) {
        throw createBrowserAuthError(earJwkEmpty);
    }
    const decryptedData = JSON.parse(await invokeAsync(decryptEarResponse, PerformanceEvents.DecryptEarResponse, logger, performanceClient, request.correlationId)(request.earJwk, response.ear_jwe));
    if (decryptedData.accountId) {
        return invokeAsync(handleResponsePlatformBroker, PerformanceEvents.HandleResponsePlatformBroker, logger, performanceClient, request.correlationId)(request, decryptedData.accountId, apiId, config, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider);
    }
    const responseHandler = new ResponseHandler(config.auth.clientId, browserStorage, new CryptoOps(logger, performanceClient), logger, null, null, performanceClient);
    // Validate response. This function throws a server error if an error is returned by the server.
    responseHandler.validateTokenResponse(decryptedData);
    // Temporary until response handler is refactored to be more flow agnostic.
    const additionalData = {
        code: "",
        state: request.state,
        nonce: request.nonce,
        client_info: decryptedData.client_info,
        cloud_graph_host_name: decryptedData.cloud_graph_host_name,
        cloud_instance_host_name: decryptedData.cloud_instance_host_name,
        cloud_instance_name: decryptedData.cloud_instance_name,
        msgraph_host: decryptedData.msgraph_host,
    };
    return (await invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, logger, performanceClient, request.correlationId)(decryptedData, authority, TimeUtils.nowSeconds(), request, additionalData, undefined, undefined, undefined, undefined));
}

export { getAuthCodeRequestUrl, getCodeForm, getEARForm, handleResponseCode, handleResponseEAR, handleResponsePlatformBroker };
//# sourceMappingURL=Authorize.mjs.map
