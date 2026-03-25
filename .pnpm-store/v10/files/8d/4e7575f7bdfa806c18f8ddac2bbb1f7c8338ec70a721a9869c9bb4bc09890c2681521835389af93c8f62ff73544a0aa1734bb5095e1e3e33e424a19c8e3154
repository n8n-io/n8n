/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CommonAuthorizationUrlRequest } from "../request/CommonAuthorizationUrlRequest.js";
import * as RequestParameterBuilder from "../request/RequestParameterBuilder.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import * as AADServerParamKeys from "../constants/AADServerParamKeys.js";
import { AuthOptions } from "../config/ClientConfiguration.js";
import { PromptValue } from "../utils/Constants.js";
import { AccountInfo } from "../account/AccountInfo.js";
import { Logger } from "../logger/Logger.js";
import { buildClientInfoFromHomeAccountId } from "../account/ClientInfo.js";
import { Authority } from "../authority/Authority.js";
import { mapToQueryString } from "../utils/UrlUtils.js";
import { UrlString } from "../url/UrlString.js";
import { AuthorizationCodePayload } from "../response/AuthorizationCodePayload.js";
import { AuthorizeResponse } from "../response/AuthorizeResponse.js";
import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../error/ClientAuthError.js";
import {
    InteractionRequiredAuthError,
    isInteractionRequiredError,
} from "../error/InteractionRequiredAuthError.js";
import { ServerError } from "../error/ServerError.js";
import { StringDict } from "../utils/MsalTypes.js";

/**
 * Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
 * @param config
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
export function getStandardAuthorizeRequestParameters(
    authOptions: AuthOptions,
    request: CommonAuthorizationUrlRequest,
    logger: Logger,
    performanceClient?: IPerformanceClient
): Map<string, string> {
    // generate the correlationId if not set by the user and add
    const correlationId = request.correlationId;

    const parameters = new Map<string, string>();

    RequestParameterBuilder.addClientId(
        parameters,
        request.embeddedClientId ||
            request.extraQueryParameters?.[AADServerParamKeys.CLIENT_ID] ||
            authOptions.clientId
    );

    const requestScopes = [
        ...(request.scopes || []),
        ...(request.extraScopesToConsent || []),
    ];
    RequestParameterBuilder.addScopes(
        parameters,
        requestScopes,
        true,
        authOptions.authority.options.OIDCOptions?.defaultScopes
    );

    RequestParameterBuilder.addRedirectUri(parameters, request.redirectUri);

    RequestParameterBuilder.addCorrelationId(parameters, correlationId);

    // add response_mode. If not passed in it defaults to query.
    RequestParameterBuilder.addResponseMode(parameters, request.responseMode);

    // add client_info=1
    RequestParameterBuilder.addClientInfo(parameters);

    if (request.prompt) {
        RequestParameterBuilder.addPrompt(parameters, request.prompt);
        performanceClient?.addFields({ prompt: request.prompt }, correlationId);
    }

    if (request.domainHint) {
        RequestParameterBuilder.addDomainHint(parameters, request.domainHint);
        performanceClient?.addFields(
            { domainHintFromRequest: true },
            correlationId
        );
    }

    // Add sid or loginHint with preference for login_hint claim (in request) -> sid -> loginHint (upn/email) -> username of AccountInfo object
    if (request.prompt !== PromptValue.SELECT_ACCOUNT) {
        // AAD will throw if prompt=select_account is passed with an account hint
        if (request.sid && request.prompt === PromptValue.NONE) {
            // SessionID is only used in silent calls
            logger.verbose(
                "createAuthCodeUrlQueryString: Prompt is none, adding sid from request"
            );
            RequestParameterBuilder.addSid(parameters, request.sid);
            performanceClient?.addFields(
                { sidFromRequest: true },
                correlationId
            );
        } else if (request.account) {
            const accountSid = extractAccountSid(request.account);
            let accountLoginHintClaim = extractLoginHint(request.account);

            if (accountLoginHintClaim && request.domainHint) {
                logger.warning(
                    `AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint`
                );
                accountLoginHintClaim = null;
            }

            // If login_hint claim is present, use it over sid/username
            if (accountLoginHintClaim) {
                logger.verbose(
                    "createAuthCodeUrlQueryString: login_hint claim present on account"
                );
                RequestParameterBuilder.addLoginHint(
                    parameters,
                    accountLoginHintClaim
                );
                performanceClient?.addFields(
                    { loginHintFromClaim: true },
                    correlationId
                );
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(
                        request.account.homeAccountId
                    );
                    RequestParameterBuilder.addCcsOid(parameters, clientInfo);
                } catch (e) {
                    logger.verbose(
                        "createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header"
                    );
                }
            } else if (accountSid && request.prompt === PromptValue.NONE) {
                /*
                 * If account and loginHint are provided, we will check account first for sid before adding loginHint
                 * SessionId is only used in silent calls
                 */
                logger.verbose(
                    "createAuthCodeUrlQueryString: Prompt is none, adding sid from account"
                );
                RequestParameterBuilder.addSid(parameters, accountSid);
                performanceClient?.addFields(
                    { sidFromClaim: true },
                    correlationId
                );
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(
                        request.account.homeAccountId
                    );
                    RequestParameterBuilder.addCcsOid(parameters, clientInfo);
                } catch (e) {
                    logger.verbose(
                        "createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header"
                    );
                }
            } else if (request.loginHint) {
                logger.verbose(
                    "createAuthCodeUrlQueryString: Adding login_hint from request"
                );
                RequestParameterBuilder.addLoginHint(
                    parameters,
                    request.loginHint
                );
                RequestParameterBuilder.addCcsUpn(
                    parameters,
                    request.loginHint
                );
                performanceClient?.addFields(
                    { loginHintFromRequest: true },
                    correlationId
                );
            } else if (request.account.username) {
                // Fallback to account username if provided
                logger.verbose(
                    "createAuthCodeUrlQueryString: Adding login_hint from account"
                );
                RequestParameterBuilder.addLoginHint(
                    parameters,
                    request.account.username
                );
                performanceClient?.addFields(
                    { loginHintFromUpn: true },
                    correlationId
                );
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(
                        request.account.homeAccountId
                    );
                    RequestParameterBuilder.addCcsOid(parameters, clientInfo);
                } catch (e) {
                    logger.verbose(
                        "createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header"
                    );
                }
            }
        } else if (request.loginHint) {
            logger.verbose(
                "createAuthCodeUrlQueryString: No account, adding login_hint from request"
            );
            RequestParameterBuilder.addLoginHint(parameters, request.loginHint);
            RequestParameterBuilder.addCcsUpn(parameters, request.loginHint);
            performanceClient?.addFields(
                { loginHintFromRequest: true },
                correlationId
            );
        }
    } else {
        logger.verbose(
            "createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints"
        );
    }

    if (request.nonce) {
        RequestParameterBuilder.addNonce(parameters, request.nonce);
    }

    if (request.state) {
        RequestParameterBuilder.addState(parameters, request.state);
    }

    if (
        request.claims ||
        (authOptions.clientCapabilities &&
            authOptions.clientCapabilities.length > 0)
    ) {
        RequestParameterBuilder.addClaims(
            parameters,
            request.claims,
            authOptions.clientCapabilities
        );
    }

    if (request.embeddedClientId) {
        RequestParameterBuilder.addBrokerParameters(
            parameters,
            authOptions.clientId,
            authOptions.redirectUri
        );
    }

    // If extraQueryParameters includes instance_aware its value will be added when extraQueryParameters are added
    if (
        authOptions.instanceAware &&
        (!request.extraQueryParameters ||
            !Object.keys(request.extraQueryParameters).includes(
                AADServerParamKeys.INSTANCE_AWARE
            ))
    ) {
        RequestParameterBuilder.addInstanceAware(parameters);
    }

    return parameters;
}

/**
 * Returns authorize endpoint with given request parameters in the query string
 * @param authority
 * @param requestParameters
 * @returns
 */
export function getAuthorizeUrl(
    authority: Authority,
    requestParameters: Map<string, string>,
    encodeParams?: boolean,
    extraQueryParameters?: StringDict | undefined
): string {
    const queryString = mapToQueryString(
        requestParameters,
        encodeParams,
        extraQueryParameters
    );
    return UrlString.appendQueryString(
        authority.authorizationEndpoint,
        queryString
    );
}

/**
 * Handles the hash fragment response from public client code request. Returns a code response used by
 * the client to exchange for a token in acquireToken.
 * @param serverParams
 * @param cachedState
 */
export function getAuthorizationCodePayload(
    serverParams: AuthorizeResponse,
    cachedState: string
): AuthorizationCodePayload {
    // Get code response
    validateAuthorizationResponse(serverParams, cachedState);

    // throw when there is no auth code in the response
    if (!serverParams.code) {
        throw createClientAuthError(
            ClientAuthErrorCodes.authorizationCodeMissingFromServerResponse
        );
    }

    return serverParams as AuthorizationCodePayload;
}

/**
 * Function which validates server authorization code response.
 * @param serverResponseHash
 * @param requestState
 */
export function validateAuthorizationResponse(
    serverResponse: AuthorizeResponse,
    requestState: string
): void {
    if (!serverResponse.state || !requestState) {
        throw serverResponse.state
            ? createClientAuthError(
                  ClientAuthErrorCodes.stateNotFound,
                  "Cached State"
              )
            : createClientAuthError(
                  ClientAuthErrorCodes.stateNotFound,
                  "Server State"
              );
    }

    let decodedServerResponseState: string;
    let decodedRequestState: string;

    try {
        decodedServerResponseState = decodeURIComponent(serverResponse.state);
    } catch (e) {
        throw createClientAuthError(
            ClientAuthErrorCodes.invalidState,
            serverResponse.state
        );
    }

    try {
        decodedRequestState = decodeURIComponent(requestState);
    } catch (e) {
        throw createClientAuthError(
            ClientAuthErrorCodes.invalidState,
            serverResponse.state
        );
    }

    if (decodedServerResponseState !== decodedRequestState) {
        throw createClientAuthError(ClientAuthErrorCodes.stateMismatch);
    }

    // Check for error
    if (
        serverResponse.error ||
        serverResponse.error_description ||
        serverResponse.suberror
    ) {
        const serverErrorNo = parseServerErrorNo(serverResponse);
        if (
            isInteractionRequiredError(
                serverResponse.error,
                serverResponse.error_description,
                serverResponse.suberror
            )
        ) {
            throw new InteractionRequiredAuthError(
                serverResponse.error || "",
                serverResponse.error_description,
                serverResponse.suberror,
                serverResponse.timestamp || "",
                serverResponse.trace_id || "",
                serverResponse.correlation_id || "",
                serverResponse.claims || "",
                serverErrorNo
            );
        }

        throw new ServerError(
            serverResponse.error || "",
            serverResponse.error_description,
            serverResponse.suberror,
            serverErrorNo
        );
    }
}

/**
 * Get server error No from the error_uri
 * @param serverResponse
 * @returns
 */
function parseServerErrorNo(
    serverResponse: AuthorizeResponse
): string | undefined {
    const errorCodePrefix = "code=";
    const errorCodePrefixIndex =
        serverResponse.error_uri?.lastIndexOf(errorCodePrefix);
    return errorCodePrefixIndex && errorCodePrefixIndex >= 0
        ? serverResponse.error_uri?.substring(
              errorCodePrefixIndex + errorCodePrefix.length
          )
        : undefined;
}

/**
 * Helper to get sid from account. Returns null if idTokenClaims are not present or sid is not present.
 * @param account
 */
function extractAccountSid(account: AccountInfo): string | null {
    return account.idTokenClaims?.sid || null;
}

function extractLoginHint(account: AccountInfo): string | null {
    return account.loginHint || account.idTokenClaims?.login_hint || null;
}
