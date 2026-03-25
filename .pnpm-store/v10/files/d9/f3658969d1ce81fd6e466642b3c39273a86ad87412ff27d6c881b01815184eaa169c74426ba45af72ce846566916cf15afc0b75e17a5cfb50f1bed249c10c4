/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ResponseMode,
    CLIENT_INFO,
    AuthenticationScheme,
    ClaimsRequestKeys,
    PasswordGrantConstants,
    OIDC_DEFAULT_SCOPES,
    ThrottlingConstants,
    HeaderNames,
    OAuthResponseType,
} from "../utils/Constants.js";
import * as AADServerParamKeys from "../constants/AADServerParamKeys.js";
import { ScopeSet } from "./ScopeSet.js";
import {
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
} from "../error/ClientConfigurationError.js";
import { StringDict } from "../utils/MsalTypes.js";
import {
    ApplicationTelemetry,
    LibraryInfo,
} from "../config/ClientConfiguration.js";
import { ServerTelemetryManager } from "../telemetry/server/ServerTelemetryManager.js";
import { ClientInfo } from "../account/ClientInfo.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";

export function instrumentBrokerParams(
    parameters: Map<string, string>,
    correlationId?: string,
    performanceClient?: IPerformanceClient
): void {
    if (!correlationId) {
        return;
    }

    const clientId = parameters.get(AADServerParamKeys.CLIENT_ID);
    if (clientId && parameters.has(AADServerParamKeys.BROKER_CLIENT_ID)) {
        performanceClient?.addFields(
            {
                embeddedClientId: clientId,
                embeddedRedirectUri: parameters.get(
                    AADServerParamKeys.REDIRECT_URI
                ),
            },
            correlationId
        );
    }
}

/**
 * Add the given response_type
 * @param parameters
 * @param responseType
 */
export function addResponseType(
    parameters: Map<string, string>,
    responseType: OAuthResponseType
): void {
    parameters.set(AADServerParamKeys.RESPONSE_TYPE, responseType);
}

/**
 * add response_mode. defaults to query.
 * @param responseMode
 */
export function addResponseMode(
    parameters: Map<string, string>,
    responseMode?: ResponseMode
): void {
    parameters.set(
        AADServerParamKeys.RESPONSE_MODE,
        responseMode ? responseMode : ResponseMode.QUERY
    );
}

/**
 * Add flag to indicate STS should attempt to use WAM if available
 */
export function addNativeBroker(parameters: Map<string, string>): void {
    parameters.set(AADServerParamKeys.NATIVE_BROKER, "1");
}

/**
 * add scopes. set addOidcScopes to false to prevent default scopes in non-user scenarios
 * @param scopeSet
 * @param addOidcScopes
 */
export function addScopes(
    parameters: Map<string, string>,
    scopes: string[],
    addOidcScopes: boolean = true,
    defaultScopes: Array<string> = OIDC_DEFAULT_SCOPES
): void {
    // Always add openid to the scopes when adding OIDC scopes
    if (
        addOidcScopes &&
        !defaultScopes.includes("openid") &&
        !scopes.includes("openid")
    ) {
        defaultScopes.push("openid");
    }
    const requestScopes = addOidcScopes
        ? [...(scopes || []), ...defaultScopes]
        : scopes || [];
    const scopeSet = new ScopeSet(requestScopes);
    parameters.set(AADServerParamKeys.SCOPE, scopeSet.printScopes());
}

/**
 * add clientId
 * @param clientId
 */
export function addClientId(
    parameters: Map<string, string>,
    clientId: string
): void {
    parameters.set(AADServerParamKeys.CLIENT_ID, clientId);
}

/**
 * add redirect_uri
 * @param redirectUri
 */
export function addRedirectUri(
    parameters: Map<string, string>,
    redirectUri: string
): void {
    parameters.set(AADServerParamKeys.REDIRECT_URI, redirectUri);
}

/**
 * add post logout redirectUri
 * @param redirectUri
 */
export function addPostLogoutRedirectUri(
    parameters: Map<string, string>,
    redirectUri: string
): void {
    parameters.set(AADServerParamKeys.POST_LOGOUT_URI, redirectUri);
}

/**
 * add id_token_hint to logout request
 * @param idTokenHint
 */
export function addIdTokenHint(
    parameters: Map<string, string>,
    idTokenHint: string
): void {
    parameters.set(AADServerParamKeys.ID_TOKEN_HINT, idTokenHint);
}

/**
 * add domain_hint
 * @param domainHint
 */
export function addDomainHint(
    parameters: Map<string, string>,
    domainHint: string
): void {
    parameters.set(AADServerParamKeys.DOMAIN_HINT, domainHint);
}

/**
 * add login_hint
 * @param loginHint
 */
export function addLoginHint(
    parameters: Map<string, string>,
    loginHint: string
): void {
    parameters.set(AADServerParamKeys.LOGIN_HINT, loginHint);
}

/**
 * Adds the CCS (Cache Credential Service) query parameter for login_hint
 * @param loginHint
 */
export function addCcsUpn(
    parameters: Map<string, string>,
    loginHint: string
): void {
    parameters.set(HeaderNames.CCS_HEADER, `UPN:${loginHint}`);
}

/**
 * Adds the CCS (Cache Credential Service) query parameter for account object
 * @param loginHint
 */
export function addCcsOid(
    parameters: Map<string, string>,
    clientInfo: ClientInfo
): void {
    parameters.set(
        HeaderNames.CCS_HEADER,
        `Oid:${clientInfo.uid}@${clientInfo.utid}`
    );
}

/**
 * add sid
 * @param sid
 */
export function addSid(parameters: Map<string, string>, sid: string): void {
    parameters.set(AADServerParamKeys.SID, sid);
}

/**
 * add claims
 * @param claims
 */
export function addClaims(
    parameters: Map<string, string>,
    claims?: string,
    clientCapabilities?: Array<string>
): void {
    const mergedClaims = addClientCapabilitiesToClaims(
        claims,
        clientCapabilities
    );
    try {
        JSON.parse(mergedClaims);
    } catch (e) {
        throw createClientConfigurationError(
            ClientConfigurationErrorCodes.invalidClaims
        );
    }
    parameters.set(AADServerParamKeys.CLAIMS, mergedClaims);
}

/**
 * add correlationId
 * @param correlationId
 */
export function addCorrelationId(
    parameters: Map<string, string>,
    correlationId: string
): void {
    parameters.set(AADServerParamKeys.CLIENT_REQUEST_ID, correlationId);
}

/**
 * add library info query params
 * @param libraryInfo
 */
export function addLibraryInfo(
    parameters: Map<string, string>,
    libraryInfo: LibraryInfo
): void {
    // Telemetry Info
    parameters.set(AADServerParamKeys.X_CLIENT_SKU, libraryInfo.sku);
    parameters.set(AADServerParamKeys.X_CLIENT_VER, libraryInfo.version);
    if (libraryInfo.os) {
        parameters.set(AADServerParamKeys.X_CLIENT_OS, libraryInfo.os);
    }
    if (libraryInfo.cpu) {
        parameters.set(AADServerParamKeys.X_CLIENT_CPU, libraryInfo.cpu);
    }
}

/**
 * Add client telemetry parameters
 * @param appTelemetry
 */
export function addApplicationTelemetry(
    parameters: Map<string, string>,
    appTelemetry: ApplicationTelemetry
): void {
    if (appTelemetry?.appName) {
        parameters.set(AADServerParamKeys.X_APP_NAME, appTelemetry.appName);
    }

    if (appTelemetry?.appVersion) {
        parameters.set(AADServerParamKeys.X_APP_VER, appTelemetry.appVersion);
    }
}

/**
 * add prompt
 * @param prompt
 */
export function addPrompt(
    parameters: Map<string, string>,
    prompt: string
): void {
    parameters.set(AADServerParamKeys.PROMPT, prompt);
}

/**
 * add state
 * @param state
 */
export function addState(parameters: Map<string, string>, state: string): void {
    if (state) {
        parameters.set(AADServerParamKeys.STATE, state);
    }
}

/**
 * add nonce
 * @param nonce
 */
export function addNonce(parameters: Map<string, string>, nonce: string): void {
    parameters.set(AADServerParamKeys.NONCE, nonce);
}

/**
 * add code_challenge and code_challenge_method
 * - throw if either of them are not passed
 * @param codeChallenge
 * @param codeChallengeMethod
 */
export function addCodeChallengeParams(
    parameters: Map<string, string>,
    codeChallenge?: string,
    codeChallengeMethod?: string
): void {
    if (codeChallenge && codeChallengeMethod) {
        parameters.set(AADServerParamKeys.CODE_CHALLENGE, codeChallenge);
        parameters.set(
            AADServerParamKeys.CODE_CHALLENGE_METHOD,
            codeChallengeMethod
        );
    } else {
        throw createClientConfigurationError(
            ClientConfigurationErrorCodes.pkceParamsMissing
        );
    }
}

/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
export function addAuthorizationCode(
    parameters: Map<string, string>,
    code: string
): void {
    parameters.set(AADServerParamKeys.CODE, code);
}

/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
export function addDeviceCode(
    parameters: Map<string, string>,
    code: string
): void {
    parameters.set(AADServerParamKeys.DEVICE_CODE, code);
}

/**
 * add the `refreshToken` passed by the user
 * @param refreshToken
 */
export function addRefreshToken(
    parameters: Map<string, string>,
    refreshToken: string
): void {
    parameters.set(AADServerParamKeys.REFRESH_TOKEN, refreshToken);
}

/**
 * add the `code_verifier` passed by the user to exchange for a token
 * @param codeVerifier
 */
export function addCodeVerifier(
    parameters: Map<string, string>,
    codeVerifier: string
): void {
    parameters.set(AADServerParamKeys.CODE_VERIFIER, codeVerifier);
}

/**
 * add client_secret
 * @param clientSecret
 */
export function addClientSecret(
    parameters: Map<string, string>,
    clientSecret: string
): void {
    parameters.set(AADServerParamKeys.CLIENT_SECRET, clientSecret);
}

/**
 * add clientAssertion for confidential client flows
 * @param clientAssertion
 */
export function addClientAssertion(
    parameters: Map<string, string>,
    clientAssertion: string
): void {
    if (clientAssertion) {
        parameters.set(AADServerParamKeys.CLIENT_ASSERTION, clientAssertion);
    }
}

/**
 * add clientAssertionType for confidential client flows
 * @param clientAssertionType
 */
export function addClientAssertionType(
    parameters: Map<string, string>,
    clientAssertionType: string
): void {
    if (clientAssertionType) {
        parameters.set(
            AADServerParamKeys.CLIENT_ASSERTION_TYPE,
            clientAssertionType
        );
    }
}

/**
 * add OBO assertion for confidential client flows
 * @param clientAssertion
 */
export function addOboAssertion(
    parameters: Map<string, string>,
    oboAssertion: string
): void {
    parameters.set(AADServerParamKeys.OBO_ASSERTION, oboAssertion);
}

/**
 * add grant type
 * @param grantType
 */
export function addRequestTokenUse(
    parameters: Map<string, string>,
    tokenUse: string
): void {
    parameters.set(AADServerParamKeys.REQUESTED_TOKEN_USE, tokenUse);
}

/**
 * add grant type
 * @param grantType
 */
export function addGrantType(
    parameters: Map<string, string>,
    grantType: string
): void {
    parameters.set(AADServerParamKeys.GRANT_TYPE, grantType);
}

/**
 * add client info
 *
 */
export function addClientInfo(parameters: Map<string, string>): void {
    parameters.set(CLIENT_INFO, "1");
}

export function addInstanceAware(parameters: Map<string, string>): void {
    if (!parameters.has(AADServerParamKeys.INSTANCE_AWARE)) {
        parameters.set(AADServerParamKeys.INSTANCE_AWARE, "true");
    }
}

/**
 * add extraQueryParams
 * @param eQParams
 */
export function addExtraQueryParameters(
    parameters: Map<string, string>,
    eQParams: StringDict
): void {
    Object.entries(eQParams).forEach(([key, value]) => {
        if (!parameters.has(key) && value) {
            parameters.set(key, value);
        }
    });
}

export function addClientCapabilitiesToClaims(
    claims?: string,
    clientCapabilities?: Array<string>
): string {
    let mergedClaims: object;

    // Parse provided claims into JSON object or initialize empty object
    if (!claims) {
        mergedClaims = {};
    } else {
        try {
            mergedClaims = JSON.parse(claims);
        } catch (e) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.invalidClaims
            );
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
export function addUsername(
    parameters: Map<string, string>,
    username: string
): void {
    parameters.set(PasswordGrantConstants.username, username);
}

/**
 * adds `password` for Password Grant flow
 * @param password
 */
export function addPassword(
    parameters: Map<string, string>,
    password: string
): void {
    parameters.set(PasswordGrantConstants.password, password);
}

/**
 * add pop_jwk to query params
 * @param cnfString
 */
export function addPopToken(
    parameters: Map<string, string>,
    cnfString: string
): void {
    if (cnfString) {
        parameters.set(AADServerParamKeys.TOKEN_TYPE, AuthenticationScheme.POP);
        parameters.set(AADServerParamKeys.REQ_CNF, cnfString);
    }
}

/**
 * add SSH JWK and key ID to query params
 */
export function addSshJwk(
    parameters: Map<string, string>,
    sshJwkString: string
): void {
    if (sshJwkString) {
        parameters.set(AADServerParamKeys.TOKEN_TYPE, AuthenticationScheme.SSH);
        parameters.set(AADServerParamKeys.REQ_CNF, sshJwkString);
    }
}

/**
 * add server telemetry fields
 * @param serverTelemetryManager
 */
export function addServerTelemetry(
    parameters: Map<string, string>,
    serverTelemetryManager: ServerTelemetryManager
): void {
    parameters.set(
        AADServerParamKeys.X_CLIENT_CURR_TELEM,
        serverTelemetryManager.generateCurrentRequestHeaderValue()
    );
    parameters.set(
        AADServerParamKeys.X_CLIENT_LAST_TELEM,
        serverTelemetryManager.generateLastRequestHeaderValue()
    );
}

/**
 * Adds parameter that indicates to the server that throttling is supported
 */
export function addThrottling(parameters: Map<string, string>): void {
    parameters.set(
        AADServerParamKeys.X_MS_LIB_CAPABILITY,
        ThrottlingConstants.X_MS_LIB_CAPABILITY_VALUE
    );
}

/**
 * Adds logout_hint parameter for "silent" logout which prevent server account picker
 */
export function addLogoutHint(
    parameters: Map<string, string>,
    logoutHint: string
): void {
    parameters.set(AADServerParamKeys.LOGOUT_HINT, logoutHint);
}

export function addBrokerParameters(
    parameters: Map<string, string>,
    brokerClientId: string,
    brokerRedirectUri: string
): void {
    if (!parameters.has(AADServerParamKeys.BROKER_CLIENT_ID)) {
        parameters.set(AADServerParamKeys.BROKER_CLIENT_ID, brokerClientId);
    }
    if (!parameters.has(AADServerParamKeys.BROKER_REDIRECT_URI)) {
        parameters.set(
            AADServerParamKeys.BROKER_REDIRECT_URI,
            brokerRedirectUri
        );
    }
}

/**
 * Add EAR (Encrypted Authorize Response) request parameters
 * @param parameters
 * @param jwk
 */
export function addEARParameters(
    parameters: Map<string, string>,
    jwk: string
): void {
    parameters.set(AADServerParamKeys.EAR_JWK, encodeURIComponent(jwk));

    // ear_jwe_crypto will always have value: {"alg":"dir","enc":"A256GCM"} so we can hardcode this
    const jweCryptoB64Encoded = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0";
    parameters.set(AADServerParamKeys.EAR_JWE_CRYPTO, jweCryptoB64Encoded);
}

/**
 * Adds authorize body parameters to the request parameters
 * @param parameters
 * @param bodyParameters
 */
export function addPostBodyParameters(
    parameters: Map<string, string>,
    bodyParameters: StringDict
): void {
    Object.entries(bodyParameters).forEach(([key, value]) => {
        if (value) {
            parameters.set(key, value);
        }
    });
}
