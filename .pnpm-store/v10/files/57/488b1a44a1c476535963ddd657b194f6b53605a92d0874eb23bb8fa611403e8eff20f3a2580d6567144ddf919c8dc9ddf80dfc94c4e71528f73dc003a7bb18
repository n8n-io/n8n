/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { Constants } from '../utils/Constants.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Log message level.
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Error"] = 0] = "Error";
    LogLevel[LogLevel["Warning"] = 1] = "Warning";
    LogLevel[LogLevel["Info"] = 2] = "Info";
    LogLevel[LogLevel["Verbose"] = 3] = "Verbose";
    LogLevel[LogLevel["Trace"] = 4] = "Trace";
})(LogLevel || (LogLevel = {}));
/**
 * Class which facilitates logging of messages to a specific place.
 */
class Logger {
    constructor(loggerOptions, packageName, packageVersion) {
        // Current log level, defaults to info.
        this.level = LogLevel.Info;
        const defaultLoggerCallback = () => {
            return;
        };
        const setLoggerOptions = loggerOptions || Logger.createDefaultLoggerOptions();
        this.localCallback =
            setLoggerOptions.loggerCallback || defaultLoggerCallback;
        this.piiLoggingEnabled = setLoggerOptions.piiLoggingEnabled || false;
        this.level =
            typeof setLoggerOptions.logLevel === "number"
                ? setLoggerOptions.logLevel
                : LogLevel.Info;
        this.correlationId =
            setLoggerOptions.correlationId || Constants.EMPTY_STRING;
        this.packageName = packageName || Constants.EMPTY_STRING;
        this.packageVersion = packageVersion || Constants.EMPTY_STRING;
    }
    static createDefaultLoggerOptions() {
        return {
            loggerCallback: () => {
                // allow users to not set loggerCallback
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Info,
        };
    }
    /**
     * Create new Logger with existing configurations.
     */
    clone(packageName, packageVersion, correlationId) {
        return new Logger({
            loggerCallback: this.localCallback,
            piiLoggingEnabled: this.piiLoggingEnabled,
            logLevel: this.level,
            correlationId: correlationId || this.correlationId,
        }, packageName, packageVersion);
    }
    /**
     * Log message with required options.
     */
    logMessage(logMessage, options) {
        if (options.logLevel > this.level ||
            (!this.piiLoggingEnabled && options.containsPii)) {
            return;
        }
        const timestamp = new Date().toUTCString();
        // Add correlationId to logs if set, correlationId provided on log messages take precedence
        const logHeader = `[${timestamp}] : [${options.correlationId || this.correlationId || ""}]`;
        const log = `${logHeader} : ${this.packageName}@${this.packageVersion} : ${LogLevel[options.logLevel]} - ${logMessage}`;
        // debug(`msal:${LogLevel[options.logLevel]}${options.containsPii ? "-Pii": Constants.EMPTY_STRING}${options.context ? `:${options.context}` : Constants.EMPTY_STRING}`)(logMessage);
        this.executeCallback(options.logLevel, log, options.containsPii || false);
    }
    /**
     * Execute callback with message.
     */
    executeCallback(level, message, containsPii) {
        if (this.localCallback) {
            this.localCallback(level, message, containsPii);
        }
    }
    /**
     * Logs error messages.
     */
    error(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Error,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs error messages with PII.
     */
    errorPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Error,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs warning messages.
     */
    warning(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Warning,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs warning messages with PII.
     */
    warningPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Warning,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs info messages.
     */
    info(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Info,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs info messages with PII.
     */
    infoPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Info,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs verbose messages.
     */
    verbose(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Verbose,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs verbose messages with PII.
     */
    verbosePii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Verbose,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs trace messages.
     */
    trace(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Trace,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs trace messages with PII.
     */
    tracePii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel.Trace,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Returns whether PII Logging is enabled or not.
     */
    isPiiLoggingEnabled() {
        return this.piiLoggingEnabled || false;
    }
}

export { LogLevel, Logger };
//# sourceMappingURL=Logger.mjs.map
