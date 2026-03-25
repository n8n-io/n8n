/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { LoggerOptions } from "../config/ClientConfiguration.js";
import { Constants } from "../utils/Constants.js";

/**
 * Options for logger messages.
 */
export type LoggerMessageOptions = {
    logLevel: LogLevel;
    containsPii?: boolean;
    context?: string;
    correlationId?: string;
};

/**
 * Log message level.
 */
export enum LogLevel {
    Error,
    Warning,
    Info,
    Verbose,
    Trace,
}

/**
 * Callback to send the messages to.
 */
export interface ILoggerCallback {
    (level: LogLevel, message: string, containsPii: boolean): void;
}

/**
 * Class which facilitates logging of messages to a specific place.
 */
export class Logger {
    // Correlation ID for request, usually set by user.
    private correlationId: string;

    // Current log level, defaults to info.
    private level: LogLevel = LogLevel.Info;

    // Boolean describing whether PII logging is allowed.
    private piiLoggingEnabled: boolean;

    // Callback to send messages to.
    private localCallback: ILoggerCallback;

    // Package name implementing this logger
    private packageName: string;

    // Package version implementing this logger
    private packageVersion: string;

    constructor(
        loggerOptions: LoggerOptions,
        packageName?: string,
        packageVersion?: string
    ) {
        const defaultLoggerCallback = () => {
            return;
        };
        const setLoggerOptions =
            loggerOptions || Logger.createDefaultLoggerOptions();
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

    private static createDefaultLoggerOptions(): LoggerOptions {
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
    public clone(
        packageName: string,
        packageVersion: string,
        correlationId?: string
    ): Logger {
        return new Logger(
            {
                loggerCallback: this.localCallback,
                piiLoggingEnabled: this.piiLoggingEnabled,
                logLevel: this.level,
                correlationId: correlationId || this.correlationId,
            },
            packageName,
            packageVersion
        );
    }

    /**
     * Log message with required options.
     */
    private logMessage(
        logMessage: string,
        options: LoggerMessageOptions
    ): void {
        if (
            options.logLevel > this.level ||
            (!this.piiLoggingEnabled && options.containsPii)
        ) {
            return;
        }
        const timestamp = new Date().toUTCString();

        // Add correlationId to logs if set, correlationId provided on log messages take precedence
        const logHeader = `[${timestamp}] : [${
            options.correlationId || this.correlationId || ""
        }]`;

        const log = `${logHeader} : ${this.packageName}@${
            this.packageVersion
        } : ${LogLevel[options.logLevel]} - ${logMessage}`;
        // debug(`msal:${LogLevel[options.logLevel]}${options.containsPii ? "-Pii": Constants.EMPTY_STRING}${options.context ? `:${options.context}` : Constants.EMPTY_STRING}`)(logMessage);
        this.executeCallback(
            options.logLevel,
            log,
            options.containsPii || false
        );
    }

    /**
     * Execute callback with message.
     */
    executeCallback(
        level: LogLevel,
        message: string,
        containsPii: boolean
    ): void {
        if (this.localCallback) {
            this.localCallback(level, message, containsPii);
        }
    }

    /**
     * Logs error messages.
     */
    error(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Error,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs error messages with PII.
     */
    errorPii(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Error,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs warning messages.
     */
    warning(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Warning,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs warning messages with PII.
     */
    warningPii(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Warning,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs info messages.
     */
    info(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Info,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs info messages with PII.
     */
    infoPii(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Info,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs verbose messages.
     */
    verbose(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Verbose,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs verbose messages with PII.
     */
    verbosePii(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Verbose,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs trace messages.
     */
    trace(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Trace,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Logs trace messages with PII.
     */
    tracePii(message: string, correlationId?: string): void {
        this.logMessage(message, {
            logLevel: LogLevel.Trace,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }

    /**
     * Returns whether PII Logging is enabled or not.
     */
    isPiiLoggingEnabled(): boolean {
        return this.piiLoggingEnabled || false;
    }
}
