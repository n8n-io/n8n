/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { LogLevel, Logger } from '@azure/msal-common/browser';
import { buildConfiguration } from '../config/Configuration.mjs';
import { name, version } from '../packageMetadata.mjs';
import { BrowserCacheLocation } from '../utils/BrowserConstants.mjs';
import { LOG_LEVEL_CACHE_KEY, LOG_PII_CACHE_KEY } from '../cache/CacheKeys.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Base class for operating context
 * Operating contexts are contexts in which MSAL.js is being run
 * More than one operating context may be available at a time
 * It's important from a logging and telemetry point of view for us to be able to identify the operating context.
 * For example: Some operating contexts will pre-cache tokens impacting performance telemetry
 */
class BaseOperatingContext {
    static loggerCallback(level, message) {
        switch (level) {
            case LogLevel.Error:
                // eslint-disable-next-line no-console
                console.error(message);
                return;
            case LogLevel.Info:
                // eslint-disable-next-line no-console
                console.info(message);
                return;
            case LogLevel.Verbose:
                // eslint-disable-next-line no-console
                console.debug(message);
                return;
            case LogLevel.Warning:
                // eslint-disable-next-line no-console
                console.warn(message);
                return;
            default:
                // eslint-disable-next-line no-console
                console.log(message);
                return;
        }
    }
    constructor(config) {
        /*
         * If loaded in an environment where window is not available,
         * set internal flag to false so that further requests fail.
         * This is to support server-side rendering environments.
         */
        this.browserEnvironment = typeof window !== "undefined";
        this.config = buildConfiguration(config, this.browserEnvironment);
        let sessionStorage;
        try {
            sessionStorage = window[BrowserCacheLocation.SessionStorage];
            // Mute errors if it's a non-browser environment or cookies are blocked.
        }
        catch (e) { }
        const logLevelKey = sessionStorage?.getItem(LOG_LEVEL_CACHE_KEY);
        const piiLoggingKey = sessionStorage
            ?.getItem(LOG_PII_CACHE_KEY)
            ?.toLowerCase();
        const piiLoggingEnabled = piiLoggingKey === "true"
            ? true
            : piiLoggingKey === "false"
                ? false
                : undefined;
        const loggerOptions = { ...this.config.system.loggerOptions };
        const logLevel = logLevelKey && Object.keys(LogLevel).includes(logLevelKey)
            ? LogLevel[logLevelKey]
            : undefined;
        if (logLevel) {
            loggerOptions.loggerCallback = BaseOperatingContext.loggerCallback;
            loggerOptions.logLevel = logLevel;
        }
        if (piiLoggingEnabled !== undefined) {
            loggerOptions.piiLoggingEnabled = piiLoggingEnabled;
        }
        this.logger = new Logger(loggerOptions, name, version);
        this.available = false;
    }
    /**
     * Return the MSAL config
     * @returns BrowserConfiguration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Returns the MSAL Logger
     * @returns Logger
     */
    getLogger() {
        return this.logger;
    }
    isAvailable() {
        return this.available;
    }
    isBrowserEnvironment() {
        return this.browserEnvironment;
    }
}

export { BaseOperatingContext };
//# sourceMappingURL=BaseOperatingContext.mjs.map
