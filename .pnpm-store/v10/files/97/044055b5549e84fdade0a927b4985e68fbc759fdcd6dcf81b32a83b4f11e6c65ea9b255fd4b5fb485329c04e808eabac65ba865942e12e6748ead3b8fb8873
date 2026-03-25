/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Logger, LogLevel } from "@azure/msal-common/browser";
import {
    BrowserConfiguration,
    buildConfiguration,
    Configuration,
} from "../config/Configuration.js";
import { version, name } from "../packageMetadata.js";
import { BrowserCacheLocation } from "../utils/BrowserConstants.js";
import { LOG_LEVEL_CACHE_KEY, LOG_PII_CACHE_KEY } from "../cache/CacheKeys.js";

/**
 * Base class for operating context
 * Operating contexts are contexts in which MSAL.js is being run
 * More than one operating context may be available at a time
 * It's important from a logging and telemetry point of view for us to be able to identify the operating context.
 * For example: Some operating contexts will pre-cache tokens impacting performance telemetry
 */
export abstract class BaseOperatingContext {
    protected logger: Logger;
    protected config: BrowserConfiguration;
    protected available: boolean;
    protected browserEnvironment: boolean;

    protected static loggerCallback(level: LogLevel, message: string): void {
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

    constructor(config: Configuration) {
        /*
         * If loaded in an environment where window is not available,
         * set internal flag to false so that further requests fail.
         * This is to support server-side rendering environments.
         */
        this.browserEnvironment = typeof window !== "undefined";
        this.config = buildConfiguration(config, this.browserEnvironment);

        let sessionStorage: Storage | undefined;
        try {
            sessionStorage = window[BrowserCacheLocation.SessionStorage];
            // Mute errors if it's a non-browser environment or cookies are blocked.
        } catch (e) {}

        const logLevelKey = sessionStorage?.getItem(LOG_LEVEL_CACHE_KEY);
        const piiLoggingKey = sessionStorage
            ?.getItem(LOG_PII_CACHE_KEY)
            ?.toLowerCase();

        const piiLoggingEnabled =
            piiLoggingKey === "true"
                ? true
                : piiLoggingKey === "false"
                ? false
                : undefined;
        const loggerOptions = { ...this.config.system.loggerOptions };

        const logLevel =
            logLevelKey && Object.keys(LogLevel).includes(logLevelKey)
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
     * returns the name of the module containing the API controller associated with this operating context
     */
    abstract getModuleName(): string;

    /**
     * returns the string identifier of this operating context
     */
    abstract getId(): string;

    /**
     * returns a boolean indicating whether this operating context is present
     */
    abstract initialize(): Promise<boolean>;

    /**
     * Return the MSAL config
     * @returns BrowserConfiguration
     */
    getConfig(): BrowserConfiguration {
        return this.config;
    }

    /**
     * Returns the MSAL Logger
     * @returns Logger
     */
    getLogger(): Logger {
        return this.logger;
    }

    isAvailable(): boolean {
        return this.available;
    }

    isBrowserEnvironment(): boolean {
        return this.browserEnvironment;
    }
}
