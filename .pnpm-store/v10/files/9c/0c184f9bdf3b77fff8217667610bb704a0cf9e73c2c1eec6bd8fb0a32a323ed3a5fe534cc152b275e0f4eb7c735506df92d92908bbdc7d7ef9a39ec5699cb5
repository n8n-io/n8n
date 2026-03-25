/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AccountInfo,
    AuthenticationScheme,
    BaseAuthRequest,
    ClientConfigurationErrorCodes,
    CommonSilentFlowRequest,
    HttpMethod,
    IPerformanceClient,
    Logger,
    PerformanceEvents,
    ProtocolMode,
    StringUtils,
    createClientConfigurationError,
    invokeAsync,
} from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
import { SilentRequest } from "./SilentRequest.js";
import { hashString } from "../crypto/BrowserCrypto.js";
import { PopupRequest } from "./PopupRequest.js";
import { RedirectRequest } from "./RedirectRequest.js";

/**
 * Initializer function for all request APIs
 * @param request
 */
export async function initializeBaseRequest(
    request: Partial<BaseAuthRequest> & { correlationId: string },
    config: BrowserConfiguration,
    performanceClient: IPerformanceClient,
    logger: Logger
): Promise<BaseAuthRequest> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.InitializeBaseRequest,
        request.correlationId
    );
    const authority = request.authority || config.auth.authority;

    const scopes = [...((request && request.scopes) || [])];

    const validatedRequest: BaseAuthRequest = {
        ...request,
        correlationId: request.correlationId,
        authority,
        scopes,
    };

    // Set authenticationScheme to BEARER if not explicitly set in the request
    if (!validatedRequest.authenticationScheme) {
        validatedRequest.authenticationScheme = AuthenticationScheme.BEARER;
        logger.verbose(
            'Authentication Scheme wasn\'t explicitly set in request, defaulting to "Bearer" request'
        );
    } else {
        if (
            validatedRequest.authenticationScheme === AuthenticationScheme.SSH
        ) {
            if (!request.sshJwk) {
                throw createClientConfigurationError(
                    ClientConfigurationErrorCodes.missingSshJwk
                );
            }
            if (!request.sshKid) {
                throw createClientConfigurationError(
                    ClientConfigurationErrorCodes.missingSshKid
                );
            }
        }
        logger.verbose(
            `Authentication Scheme set to "${validatedRequest.authenticationScheme}" as configured in Auth request`
        );
    }

    // Set requested claims hash if claims-based caching is enabled and claims were requested
    if (
        config.cache.claimsBasedCachingEnabled &&
        request.claims &&
        // Checks for empty stringified object "{}" which doesn't qualify as requested claims
        !StringUtils.isEmptyObj(request.claims)
    ) {
        validatedRequest.requestedClaimsHash = await hashString(request.claims);
    }

    return validatedRequest;
}

export async function initializeSilentRequest(
    request: SilentRequest & { correlationId: string },
    account: AccountInfo,
    config: BrowserConfiguration,
    performanceClient: IPerformanceClient,
    logger: Logger
): Promise<CommonSilentFlowRequest> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.InitializeSilentRequest,
        request.correlationId
    );

    const baseRequest = await invokeAsync(
        initializeBaseRequest,
        PerformanceEvents.InitializeBaseRequest,
        logger,
        performanceClient,
        request.correlationId
    )(request, config, performanceClient, logger);
    return {
        ...request,
        ...baseRequest,
        account: account,
        forceRefresh: request.forceRefresh || false,
    };
}

/**
 * Validates that the combination of request method, protocol mode and authorize body parameters is correct.
 * Returns the validated or defaulted HTTP method or throws if the configured combination is invalid.
 * @param interactionRequest
 * @param protocolMode
 * @returns
 */
export function validateRequestMethod(
    interactionRequest: BaseAuthRequest | PopupRequest | RedirectRequest,
    protocolMode: ProtocolMode
): HttpMethod {
    let httpMethod: HttpMethod | undefined;
    const requestMethod = interactionRequest.httpMethod;

    if (protocolMode === ProtocolMode.EAR) {
        // Don't override httpMethod if it is already set, default to POST if not set
        httpMethod = requestMethod || HttpMethod.POST;
        // Validate that method is not GET if protocol mode is EAR
        if (httpMethod !== HttpMethod.POST) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.invalidRequestMethodForEAR
            );
        }
    } else {
        // For non-EAR protocol modes, default to GET if httpMethod is not set
        httpMethod = requestMethod || HttpMethod.GET;
    }

    // Regardless of protocolMode, if there are authorizePostBodyParameters, validate the request method is POST
    if (
        interactionRequest.authorizePostBodyParameters &&
        httpMethod !== HttpMethod.POST
    ) {
        throw createClientConfigurationError(
            ClientConfigurationErrorCodes.invalidAuthorizePostBodyParameters
        );
    }

    return httpMethod;
}
