/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { OIDC_DEFAULT_SCOPES, ResponseMode, HeaderNames, CLIENT_INFO, ClaimsRequestKeys, PasswordGrantConstants, AuthenticationScheme, ThrottlingConstants } from '../utils/Constants.mjs';
import { CLIENT_ID, BROKER_CLIENT_ID, REDIRECT_URI, RESPONSE_TYPE, RESPONSE_MODE, NATIVE_BROKER, SCOPE, POST_LOGOUT_URI, ID_TOKEN_HINT, DOMAIN_HINT, LOGIN_HINT, SID, CLAIMS, CLIENT_REQUEST_ID, X_CLIENT_SKU, X_CLIENT_VER, X_CLIENT_OS, X_CLIENT_CPU, X_APP_NAME, X_APP_VER, PROMPT, STATE, NONCE, CODE_CHALLENGE, CODE_CHALLENGE_METHOD, CODE, DEVICE_CODE, REFRESH_TOKEN, CODE_VERIFIER, CLIENT_SECRET, CLIENT_ASSERTION, CLIENT_ASSERTION_TYPE, OBO_ASSERTION, REQUESTED_TOKEN_USE, GRANT_TYPE, INSTANCE_AWARE, TOKEN_TYPE, REQ_CNF, X_CLIENT_CURR_TELEM, X_CLIENT_LAST_TELEM, X_MS_LIB_CAPABILITY, LOGOUT_HINT, BROKER_REDIRECT_URI, EAR_JWK, EAR_JWE_CRYPTO } from '../constants/AADServerParamKeys.mjs';
import { ScopeSet } from './ScopeSet.mjs';
import { createClientConfigurationError } from '../error/ClientConfigurationError.mjs';
import { invalidClaims, pkceParamsMissing } from '../error/ClientConfigurationErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function instrumentBrokerParams(parameters, correlationId, performanceClient) {
    if (!correlationId) {
        return;
    }
    const clientId = parameters.get(CLIENT_ID);
    if (clientId && parameters.has(BROKER_CLIENT_ID)) {
        performanceClient?.addFields({
            embeddedClientId: clientId,
            embeddedRedirectUri: parameters.get(REDIRECT_URI),
        }, correlationId);
    }
}
/**
 * Add the given response_type
 * @param parameters
 * @param responseType
 */
function addResponseType(parameters, responseType) {
    parameters.set(RESPONSE_TYPE, responseType);
}
/**
 * add response_mode. defaults to query.
 * @param responseMode
 */
function addResponseMode(parameters, responseMode) {
    parameters.set(RESPONSE_MODE, responseMode ? responseMode : ResponseMode.QUERY);
}
/**
 * Add flag to indicate STS should attempt to use WAM if available
 */
function addNativeBroker(parameters) {
    parameters.set(NATIVE_BROKER, "1");
}
/**
 * add scopes. set addOidcScopes to false to prevent default scopes in non-user scenarios
 * @param scopeSet
 * @param addOidcScopes
 */
function addScopes(parameters, scopes, addOidcScopes = true, defaultScopes = OIDC_DEFAULT_SCOPES) {
    // Always add openid to the scopes when adding OIDC scopes
    if (addOidcScopes &&
        !defaultScopes.includes("openid") &&
        !scopes.includes("openid")) {
        defaultScopes.push("openid");
    }
    const requestScopes = addOidcScopes
        ? [...(scopes || []), ...defaultScopes]
        : scopes || [];
    const scopeSet = new ScopeSet(requestScopes);
    parameters.set(SCOPE, scopeSet.printScopes());
}
/**
 * add clientId
 * @param clientId
 */
function addClientId(parameters, clientId) {
    parameters.set(CLIENT_ID, clientId);
}
/**
 * add redirect_uri
 * @param redirectUri
 */
function addRedirectUri(parameters, redirectUri) {
    parameters.set(REDIRECT_URI, redirectUri);
}
/**
 * add post logout redirectUri
 * @param redirectUri
 */
function addPostLogoutRedirectUri(parameters, redirectUri) {
    parameters.set(POST_LOGOUT_URI, redirectUri);
}
/**
 * add id_token_hint to logout request
 * @param idTokenHint
 */
function addIdTokenHint(parameters, idTokenHint) {
    parameters.set(ID_TOKEN_HINT, idTokenHint);
}
/**
 * add domain_hint
 * @param domainHint
 */
function addDomainHint(parameters, domainHint) {
    parameters.set(DOMAIN_HINT, domainHint);
}
/**
 * add login_hint
 * @param loginHint
 */
function addLoginHint(parameters, loginHint) {
    parameters.set(LOGIN_HINT, loginHint);
}
/**
 * Adds the CCS (Cache Credential Service) query parameter for login_hint
 * @param loginHint
 */
function addCcsUpn(parameters, loginHint) {
    parameters.set(HeaderNames.CCS_HEADER, `UPN:${loginHint}`);
}
/**
 * Adds the CCS (Cache Credential Service) query parameter for account object
 * @param loginHint
 */
function addCcsOid(parameters, clientInfo) {
    parameters.set(HeaderNames.CCS_HEADER, `Oid:${clientInfo.uid}@${clientInfo.utid}`);
}
/**
 * add sid
 * @param sid
 */
function addSid(parameters, sid) {
    parameters.set(SID, sid);
}
/**
 * add claims
 * @param claims
 */
function addClaims(parameters, claims, clientCapabilities) {
    const mergedClaims = addClientCapabilitiesToClaims(claims, clientCapabilities);
    try {
        JSON.parse(mergedClaims);
    }
    catch (e) {
        throw createClientConfigurationError(invalidClaims);
    }
    parameters.set(CLAIMS, mergedClaims);
}
/**
 * add correlationId
 * @param correlationId
 */
function addCorrelationId(parameters, correlationId) {
    parameters.set(CLIENT_REQUEST_ID, correlationId);
}
/**
 * add library info query params
 * @param libraryInfo
 */
function addLibraryInfo(parameters, libraryInfo) {
    // Telemetry Info
    parameters.set(X_CLIENT_SKU, libraryInfo.sku);
    parameters.set(X_CLIENT_VER, libraryInfo.version);
    if (libraryInfo.os) {
        parameters.set(X_CLIENT_OS, libraryInfo.os);
    }
    if (libraryInfo.cpu) {
        parameters.set(X_CLIENT_CPU, libraryInfo.cpu);
    }
}
/**
 * Add client telemetry parameters
 * @param appTelemetry
 */
function addApplicationTelemetry(parameters, appTelemetry) {
    if (appTelemetry?.appName) {
        parameters.set(X_APP_NAME, appTelemetry.appName);
    }
    if (appTelemetry?.appVersion) {
        parameters.set(X_APP_VER, appTelemetry.appVersion);
    }
}
/**
 * add prompt
 * @param prompt
 */
function addPrompt(parameters, prompt) {
    parameters.set(PROMPT, prompt);
}
/**
 * add state
 * @param state
 */
function addState(parameters, state) {
    if (state) {
        parameters.set(STATE, state);
    }
}
/**
 * add nonce
 * @param nonce
 */
function addNonce(parameters, nonce) {
    parameters.set(NONCE, nonce);
}
/**
 * add code_challenge and code_challenge_method
 * - throw if either of them are not passed
 * @param codeChallenge
 * @param codeChallengeMethod
 */
function addCodeChallengeParams(parameters, codeChallenge, codeChallengeMethod) {
    if (codeChallenge && codeChallengeMethod) {
        parameters.set(CODE_CHALLENGE, codeChallenge);
        parameters.set(CODE_CHALLENGE_METHOD, codeChallengeMethod);
    }
    else {
        throw createClientConfigurationError(pkceParamsMissing);
    }
}
/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
function addAuthorizationCode(parameters, code) {
    parameters.set(CODE, code);
}
/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
function addDeviceCode(parameters, code) {
    parameters.set(DEVICE_CODE, code);
}
/**
 * add the `refreshToken` passed by the user
 * @param refreshToken
 */
function addRefreshToken(parameters, refreshToken) {
    parameters.set(REFRESH_TOKEN, refreshToken);
}
/**
 * add the `code_verifier` passed by the user to exchange for a token
 * @param codeVerifier
 */
function addCodeVerifier(parameters, codeVerifier) {
    parameters.set(CODE_VERIFIER, codeVerifier);
}
/**
 * add client_secret
 * @param clientSecret
 */
function addClientSecret(parameters, clientSecret) {
    parameters.set(CLIENT_SECRET, clientSecret);
}
/**
 * add clientAssertion for confidential client flows
 * @param clientAssertion
 */
function addClientAssertion(parameters, clientAssertion) {
    if (clientAssertion) {
        parameters.set(CLIENT_ASSERTION, clientAssertion);
    }
}
/**
 * add clientAssertionType for confidential client flows
 * @param clientAssertionType
 */
function addClientAssertionType(parameters, clientAssertionType) {
    if (clientAssertionType) {
        parameters.set(CLIENT_ASSERTION_TYPE, clientAssertionType);
    }
}
/**
 * add OBO assertion for confidential client flows
 * @param clientAssertion
 */
function addOboAssertion(parameters, oboAssertion) {
    parameters.set(OBO_ASSERTION, oboAssertion);
}
/**
 * add grant type
 * @param grantType
 */
function addRequestTokenUse(parameters, tokenUse) {
    parameters.set(REQUESTED_TOKEN_USE, tokenUse);
}
/**
 * add grant type
 * @param grantType
 */
function addGrantType(parameters, grantType) {
    parameters.set(GRANT_TYPE, grantType);
}
/**
 * add client info
 *
 */
function addClientInfo(parameters) {
    parameters.set(CLIENT_INFO, "1");
}
function addInstanceAware(parameters) {
    if (!parameters.has(INSTANCE_AWARE)) {
        parameters.set(INSTANCE_AWARE, "true");
    }
}
/**
 * add extraQueryParams
 * @param eQParams
 */
function addExtraQueryParameters(parameters, eQParams) {
    Object.entries(eQParams).forEach(([key, value]) => {
        if (!parameters.has(key) && value) {
            parameters.set(key, value);
        }
    });
}
function addClientCapabilitiesToClaims(claims, clientCapabilities) {
    let mergedClaims;
    // Parse provided claims into JSON object or initialize empty object
    if (!claims) {
        mergedClaims = {};
    }
    else {
        try {
            mergedClaims = JSON.parse(claims);
        }
        catch (e) {
            throw createClientConfigurationError(invalidClaims);
        }
    }
    if (clientCapabilities && clientCapabilities.length > 0) {
        if (!mergedClaims.hasOwnProperty(ClaimsRequestKeys.ACCESS_TOKEN)) {
            // Add access_token key to claims object
            mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN] = {};
        }
        // Add xms_cc claim with provided clientCapabilities to access_token key
        mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN][ClaimsRequestKeys.XMS_CC] =
            {
                values: clientCapabilities,
            };
    }
    return JSON.stringify(mergedClaims);
}
/**
 * adds `username` for Password Grant flow
 * @param username
 */
function addUsername(parameters, username) {
    parameters.set(PasswordGrantConstants.username, username);
}
/**
 * adds `password` for Password Grant flow
 * @param password
 */
function addPassword(parameters, password) {
    parameters.set(PasswordGrantConstants.password, password);
}
/**
 * add pop_jwk to query params
 * @param cnfString
 */
function addPopToken(parameters, cnfString) {
    if (cnfString) {
        parameters.set(TOKEN_TYPE, AuthenticationScheme.POP);
        parameters.set(REQ_CNF, cnfString);
    }
}
/**
 * add SSH JWK and key ID to query params
 */
function addSshJwk(parameters, sshJwkString) {
    if (sshJwkString) {
        parameters.set(TOKEN_TYPE, AuthenticationScheme.SSH);
        parameters.set(REQ_CNF, sshJwkString);
    }
}
/**
 * add server telemetry fields
 * @param serverTelemetryManager
 */
function addServerTelemetry(parameters, serverTelemetryManager) {
    parameters.set(X_CLIENT_CURR_TELEM, serverTelemetryManager.generateCurrentRequestHeaderValue());
    parameters.set(X_CLIENT_LAST_TELEM, serverTelemetryManager.generateLastRequestHeaderValue());
}
/**
 * Adds parameter that indicates to the server that throttling is supported
 */
function addThrottling(parameters) {
    parameters.set(X_MS_LIB_CAPABILITY, ThrottlingConstants.X_MS_LIB_CAPABILITY_VALUE);
}
/**
 * Adds logout_hint parameter for "silent" logout which prevent server account picker
 */
function addLogoutHint(parameters, logoutHint) {
    parameters.set(LOGOUT_HINT, logoutHint);
}
function addBrokerParameters(parameters, brokerClientId, brokerRedirectUri) {
    if (!parameters.has(BROKER_CLIENT_ID)) {
        parameters.set(BROKER_CLIENT_ID, brokerClientId);
    }
    if (!parameters.has(BROKER_REDIRECT_URI)) {
        parameters.set(BROKER_REDIRECT_URI, brokerRedirectUri);
    }
}
/**
 * Add EAR (Encrypted Authorize Response) request parameters
 * @param parameters
 * @param jwk
 */
function addEARParameters(parameters, jwk) {
    parameters.set(EAR_JWK, encodeURIComponent(jwk));
    // ear_jwe_crypto will always have value: {"alg":"dir","enc":"A256GCM"} so we can hardcode this
    const jweCryptoB64Encoded = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0";
    parameters.set(EAR_JWE_CRYPTO, jweCryptoB64Encoded);
}
/**
 * Adds authorize body parameters to the request parameters
 * @param parameters
 * @param bodyParameters
 */
function addPostBodyParameters(parameters, bodyParameters) {
    Object.entries(bodyParameters).forEach(([key, value]) => {
        if (value) {
            parameters.set(key, value);
        }
    });
}

export { addApplicationTelemetry, addAuthorizationCode, addBrokerParameters, addCcsOid, addCcsUpn, addClaims, addClientAssertion, addClientAssertionType, addClientCapabilitiesToClaims, addClientId, addClientInfo, addClientSecret, addCodeChallengeParams, addCodeVerifier, addCorrelationId, addDeviceCode, addDomainHint, addEARParameters, addExtraQueryParameters, addGrantType, addIdTokenHint, addInstanceAware, addLibraryInfo, addLoginHint, addLogoutHint, addNativeBroker, addNonce, addOboAssertion, addPassword, addPopToken, addPostBodyParameters, addPostLogoutRedirectUri, addPrompt, addRedirectUri, addRefreshToken, addRequestTokenUse, addResponseMode, addResponseType, addScopes, addServerTelemetry, addSid, addSshJwk, addState, addThrottling, addUsername, instrumentBrokerParams };
//# sourceMappingURL=RequestParameterBuilder.mjs.map
