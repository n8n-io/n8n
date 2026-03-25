/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Authority, formatAuthorityUri } from "./Authority.js";
import { INetworkModule } from "../network/INetworkModule.js";
import {
    createClientAuthError,
    ClientAuthErrorCodes,
} from "../error/ClientAuthError.js";
import { ICacheManager } from "../cache/interface/ICacheManager.js";
import { AuthorityOptions } from "./AuthorityOptions.js";
import { Logger } from "../logger/Logger.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { PerformanceEvents } from "../telemetry/performance/PerformanceEvent.js";
import { invokeAsync } from "../utils/FunctionWrappers.js";

/**
 * Create an authority object of the correct type based on the url
 * Performs basic authority validation - checks to see if the authority is of a valid type (i.e. aad, b2c, adfs)
 *
 * Also performs endpoint discovery.
 *
 * @param authorityUri
 * @param networkClient
 * @param protocolMode
 * @internal
 */
export async function createDiscoveredInstance(
    authorityUri: string,
    networkClient: INetworkModule,
    cacheManager: ICacheManager,
    authorityOptions: AuthorityOptions,
    logger: Logger,
    correlationId: string,
    performanceClient?: IPerformanceClient
): Promise<Authority> {
    performanceClient?.addQueueMeasurement(
        PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance,
        correlationId
    );
    const authorityUriFinal = Authority.transformCIAMAuthority(
        formatAuthorityUri(authorityUri)
    );

    // Initialize authority and perform discovery endpoint check.
    const acquireTokenAuthority: Authority = new Authority(
        authorityUriFinal,
        networkClient,
        cacheManager,
        authorityOptions,
        logger,
        correlationId,
        performanceClient
    );

    try {
        await invokeAsync(
            acquireTokenAuthority.resolveEndpointsAsync.bind(
                acquireTokenAuthority
            ),
            PerformanceEvents.AuthorityResolveEndpointsAsync,
            logger,
            performanceClient,
            correlationId
        )();
        return acquireTokenAuthority;
    } catch (e) {
        throw createClientAuthError(
            ClientAuthErrorCodes.endpointResolutionError
        );
    }
}
