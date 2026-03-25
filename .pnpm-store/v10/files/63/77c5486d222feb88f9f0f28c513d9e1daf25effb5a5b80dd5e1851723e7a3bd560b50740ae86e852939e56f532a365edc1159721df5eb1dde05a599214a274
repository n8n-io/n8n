/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { AuthorizeProtocol, RequestParameterBuilder, ProtocolMode, OAuthResponseType } from '@azure/msal-common/node';
import { Constants } from '../utils/Constants.mjs';
import { version } from '../packageMetadata.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Constructs the full /authorize URL with request parameters
 * @param config
 * @param authority
 * @param request
 * @param logger
 * @returns
 */
function getAuthCodeRequestUrl(config, authority, request, logger) {
    const parameters = AuthorizeProtocol.getStandardAuthorizeRequestParameters({
        ...config.auth,
        authority: authority,
        redirectUri: request.redirectUri || "",
    }, request, logger);
    RequestParameterBuilder.addLibraryInfo(parameters, {
        sku: Constants.MSAL_SKU,
        version: version,
        cpu: process.arch || "",
        os: process.platform || "",
    });
    if (config.auth.protocolMode !== ProtocolMode.OIDC) {
        RequestParameterBuilder.addApplicationTelemetry(parameters, config.telemetry.application);
    }
    RequestParameterBuilder.addResponseType(parameters, OAuthResponseType.CODE);
    if (request.codeChallenge && request.codeChallengeMethod) {
        RequestParameterBuilder.addCodeChallengeParams(parameters, request.codeChallenge, request.codeChallengeMethod);
    }
    RequestParameterBuilder.addExtraQueryParameters(parameters, request.extraQueryParameters || {});
    return AuthorizeProtocol.getAuthorizeUrl(authority, parameters, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
}

export { getAuthCodeRequestUrl };
//# sourceMappingURL=Authorize.mjs.map
