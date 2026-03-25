/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { Logger, StubPerformanceClient, createClientConfigurationError, ClientConfigurationErrorCodes, AuthenticationScheme } from '@azure/msal-common/browser';
import { name, version } from '../../packageMetadata.mjs';
import { DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS } from '../../config/Configuration.mjs';
import { PlatformAuthExtensionHandler } from './PlatformAuthExtensionHandler.mjs';
import { PlatformAuthDOMHandler } from './PlatformAuthDOMHandler.mjs';
import { createNewGuid } from '../../crypto/BrowserCrypto.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Checks if the platform broker is available in the current environment.
 * @param loggerOptions
 * @param perfClient
 * @returns
 */
async function isPlatformBrokerAvailable(loggerOptions, perfClient, correlationId, domConfig) {
    const logger = new Logger(loggerOptions || {}, name, version);
    logger.trace("isPlatformBrokerAvailable called");
    const performanceClient = perfClient || new StubPerformanceClient();
    if (typeof window === "undefined") {
        logger.trace("Non-browser environment detected, returning false");
        return false;
    }
    return !!(await getPlatformAuthProvider(logger, performanceClient, correlationId || createNewGuid(), undefined, domConfig));
}
async function getPlatformAuthProvider(logger, performanceClient, correlationId, nativeBrokerHandshakeTimeout, enablePlatformBrokerDOMSupport) {
    logger.trace("getPlatformAuthProvider called", correlationId);
    logger.trace("Has client allowed platform auth via DOM API: " +
        enablePlatformBrokerDOMSupport);
    let platformAuthProvider;
    try {
        if (enablePlatformBrokerDOMSupport) {
            // Check if DOM platform API is supported first
            platformAuthProvider = await PlatformAuthDOMHandler.createProvider(logger, performanceClient, correlationId);
        }
        if (!platformAuthProvider) {
            logger.trace("Platform auth via DOM API not available, checking for extension");
            /*
             * If DOM APIs are not available, check if browser extension is available.
             * Platform authentication via DOM APIs is preferred over extension APIs.
             */
            platformAuthProvider =
                await PlatformAuthExtensionHandler.createProvider(logger, nativeBrokerHandshakeTimeout ||
                    DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS, performanceClient);
        }
    }
    catch (e) {
        logger.trace("Platform auth not available", e);
    }
    return platformAuthProvider;
}
/**
 * Returns boolean indicating whether or not the request should attempt to use native broker
 * @param logger
 * @param config
 * @param platformAuthProvider
 * @param authenticationScheme
 */
function isPlatformAuthAllowed(config, logger, platformAuthProvider, authenticationScheme) {
    logger.trace("isPlatformAuthAllowed called");
    // throw an error if allowPlatformBroker is not enabled and allowPlatformBrokerWithDOM is enabled
    if (!config.system.allowPlatformBroker &&
        config.system.allowPlatformBrokerWithDOM) {
        throw createClientConfigurationError(ClientConfigurationErrorCodes.invalidPlatformBrokerConfiguration);
    }
    if (!config.system.allowPlatformBroker) {
        logger.trace("isPlatformAuthAllowed: allowPlatformBroker is not enabled, returning false");
        // Developer disabled WAM
        return false;
    }
    if (!platformAuthProvider) {
        logger.trace("isPlatformAuthAllowed: Platform auth provider is not initialized, returning false");
        // Platform broker auth providers are not available
        return false;
    }
    if (authenticationScheme) {
        switch (authenticationScheme) {
            case AuthenticationScheme.BEARER:
            case AuthenticationScheme.POP:
                logger.trace("isPlatformAuthAllowed: authenticationScheme is supported, returning true");
                return true;
            default:
                logger.trace("isPlatformAuthAllowed: authenticationScheme is not supported, returning false");
                return false;
        }
    }
    return true;
}

export { getPlatformAuthProvider, isPlatformAuthAllowed, isPlatformBrokerAvailable };
//# sourceMappingURL=PlatformAuthProvider.mjs.map
