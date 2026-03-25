/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { addClientId, addScopes, addRedirectUri, addCorrelationId, addResponseMode, addClientInfo, addPrompt, addDomainHint, addSid, addLoginHint, addCcsOid, addCcsUpn, addNonce, addState, addClaims, addBrokerParameters, addInstanceAware } from '../request/RequestParameterBuilder.mjs';
import { INSTANCE_AWARE, CLIENT_ID } from '../constants/AADServerParamKeys.mjs';
import { PromptValue } from '../utils/Constants.mjs';
import { buildClientInfoFromHomeAccountId } from '../account/ClientInfo.mjs';
import { mapToQueryString } from '../utils/UrlUtils.mjs';
import { UrlString } from '../url/UrlString.mjs';
import { createClientAuthError } from '../error/ClientAuthError.mjs';
import { isInteractionRequiredError, InteractionRequiredAuthError } from '../error/InteractionRequiredAuthError.mjs';
import { ServerError } from '../error/ServerError.mjs';
import { authorizationCodeMissingFromServerResponse, stateNotFound, invalidState, stateMismatch } from '../error/ClientAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
 * @param config
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
function getStandardAuthorizeRequestParameters(authOptions, request, logger, performanceClient) {
    // generate the correlationId if not set by the user and add
    const correlationId = request.correlationId;
    const parameters = new Map();
    addClientId(parameters, request.embeddedClientId ||
        request.extraQueryParameters?.[CLIENT_ID] ||
        authOptions.clientId);
    const requestScopes = [
        ...(request.scopes || []),
        ...(request.extraScopesToConsent || []),
    ];
    addScopes(parameters, requestScopes, true, authOptions.authority.options.OIDCOptions?.defaultScopes);
    addRedirectUri(parameters, request.redirectUri);
    addCorrelationId(parameters, correlationId);
    // add response_mode. If not passed in it defaults to query.
    addResponseMode(parameters, request.responseMode);
    // add client_info=1
    addClientInfo(parameters);
    if (request.prompt) {
        addPrompt(parameters, request.prompt);
        performanceClient?.addFields({ prompt: request.prompt }, correlationId);
    }
    if (request.domainHint) {
        addDomainHint(parameters, request.domainHint);
        performanceClient?.addFields({ domainHintFromRequest: true }, correlationId);
    }
    // Add sid or loginHint with preference for login_hint claim (in request) -> sid -> loginHint (upn/email) -> username of AccountInfo object
    if (request.prompt !== PromptValue.SELECT_ACCOUNT) {
        // AAD will throw if prompt=select_account is passed with an account hint
        if (request.sid && request.prompt === PromptValue.NONE) {
            // SessionID is only used in silent calls
            logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request");
            addSid(parameters, request.sid);
            performanceClient?.addFields({ sidFromRequest: true }, correlationId);
        }
        else if (request.account) {
            const accountSid = extractAccountSid(request.account);
            let accountLoginHintClaim = extractLoginHint(request.account);
            if (accountLoginHintClaim && request.domainHint) {
                logger.warning(`AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint`);
                accountLoginHintClaim = null;
            }
            // If login_hint claim is present, use it over sid/username
            if (accountLoginHintClaim) {
                logger.verbose("createAuthCodeUrlQueryString: login_hint claim present on account");
                addLoginHint(parameters, accountLoginHintClaim);
                performanceClient?.addFields({ loginHintFromClaim: true }, correlationId);
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
                    addCcsOid(parameters, clientInfo);
                }
                catch (e) {
                    logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
                }
            }
            else if (accountSid && request.prompt === PromptValue.NONE) {
                /*
                 * If account and loginHint are provided, we will check account first for sid before adding loginHint
                 * SessionId is only used in silent calls
                 */
                logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account");
                addSid(parameters, accountSid);
                performanceClient?.addFields({ sidFromClaim: true }, correlationId);
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
                    addCcsOid(parameters, clientInfo);
                }
                catch (e) {
                    logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
                }
            }
            else if (request.loginHint) {
                logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from request");
                addLoginHint(parameters, request.loginHint);
                addCcsUpn(parameters, request.loginHint);
                performanceClient?.addFields({ loginHintFromRequest: true }, correlationId);
            }
            else if (request.account.username) {
                // Fallback to account username if provided
                logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from account");
                addLoginHint(parameters, request.account.username);
                performanceClient?.addFields({ loginHintFromUpn: true }, correlationId);
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
                    addCcsOid(parameters, clientInfo);
                }
                catch (e) {
                    logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
                }
            }
        }
        else if (request.loginHint) {
            logger.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request");
            addLoginHint(parameters, request.loginHint);
            addCcsUpn(parameters, request.loginHint);
            performanceClient?.addFields({ loginHintFromRequest: true }, correlationId);
        }
    }
    else {
        logger.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints");
    }
    if (request.nonce) {
        addNonce(parameters, request.nonce);
    }
    if (request.state) {
        addState(parameters, request.state);
    }
    if (request.claims ||
        (authOptions.clientCapabilities &&
            authOptions.clientCapabilities.length > 0)) {
        addClaims(parameters, request.claims, authOptions.clientCapabilities);
    }
    if (request.embeddedClientId) {
        addBrokerParameters(parameters, authOptions.clientId, authOptions.redirectUri);
    }
    // If extraQueryParameters includes instance_aware its value will be added when extraQueryParameters are added
    if (authOptions.instanceAware &&
        (!request.extraQueryParameters ||
            !Object.keys(request.extraQueryParameters).includes(INSTANCE_AWARE))) {
        addInstanceAware(parameters);
    }
    return parameters;
}
/**
 * Returns authorize endpoint with given request parameters in the query string
 * @param authority
 * @param requestParameters
 * @returns
 */
function getAuthorizeUrl(authority, requestParameters, encodeParams, extraQueryParameters) {
    const queryString = mapToQueryString(requestParameters, encodeParams, extraQueryParameters);
    return UrlString.appendQueryString(authority.authorizationEndpoint, queryString);
}
/**
 * Handles the hash fragment response from public client code request. Returns a code response used by
 * the client to exchange for a token in acquireToken.
 * @param serverParams
 * @param cachedState
 */
function getAuthorizationCodePayload(serverParams, cachedState) {
    // Get code response
    validateAuthorizationResponse(serverParams, cachedState);
    // throw when there is no auth code in the response
    if (!serverParams.code) {
        throw createClientAuthError(authorizationCodeMissingFromServerResponse);
    }
    return serverParams;
}
/**
 * Function which validates server authorization code response.
 * @param serverResponseHash
 * @param requestState
 */
function validateAuthorizationResponse(serverResponse, requestState) {
    if (!serverResponse.state || !requestState) {
        throw serverResponse.state
            ? createClientAuthError(stateNotFound, "Cached State")
            : createClientAuthError(stateNotFound, "Server State");
    }
    let decodedServerResponseState;
    let decodedRequestState;
    try {
        decodedServerResponseState = decodeURIComponent(serverResponse.state);
    }
    catch (e) {
        throw createClientAuthError(invalidState, serverResponse.state);
    }
    try {
        decodedRequestState = decodeURIComponent(requestState);
    }
    catch (e) {
        throw createClientAuthError(invalidState, serverResponse.state);
    }
    if (decodedServerResponseState !== decodedRequestState) {
        throw createClientAuthError(stateMismatch);
    }
    // Check for error
    if (serverResponse.error ||
        serverResponse.error_description ||
        serverResponse.suberror) {
        const serverErrorNo = parseServerErrorNo(serverResponse);
        if (isInteractionRequiredError(serverResponse.error, serverResponse.error_description, serverResponse.suberror)) {
            throw new InteractionRequiredAuthError(serverResponse.error || "", serverResponse.error_description, serverResponse.suberror, serverResponse.timestamp || "", serverResponse.trace_id || "", serverResponse.correlation_id || "", serverResponse.claims || "", serverErrorNo);
        }
        throw new ServerError(serverResponse.error || "", serverResponse.error_description, serverResponse.suberror, serverErrorNo);
    }
}
/**
 * Get server error No from the error_uri
 * @param serverResponse
 * @returns
 */
function parseServerErrorNo(serverResponse) {
    const errorCodePrefix = "code=";
    const errorCodePrefixIndex = serverResponse.error_uri?.lastIndexOf(errorCodePrefix);
    return errorCodePrefixIndex && errorCodePrefixIndex >= 0
        ? serverResponse.error_uri?.substring(errorCodePrefixIndex + errorCodePrefix.length)
        : undefined;
}
/**
 * Helper to get sid from account. Returns null if idTokenClaims are not present or sid is not present.
 * @param account
 */
function extractAccountSid(account) {
    return account.idTokenClaims?.sid || null;
}
function extractLoginHint(account) {
    return account.loginHint || account.idTokenClaims?.login_hint || null;
}

export { getAuthorizationCodePayload, getAuthorizeUrl, getStandardAuthorizeRequestParameters, validateAuthorizationResponse };
//# sourceMappingURL=Authorize.mjs.map
