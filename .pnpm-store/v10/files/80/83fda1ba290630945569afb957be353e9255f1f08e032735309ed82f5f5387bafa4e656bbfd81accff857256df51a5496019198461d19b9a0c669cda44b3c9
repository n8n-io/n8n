import type { LoggerOptions } from "../config/ClientConfiguration.js";
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
export declare enum LogLevel {
    Error = 0,
    Warning = 1,
    Info = 2,
    Verbose = 3,
    Trace = 4
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
export declare class Logger {
    private correlationId;
    private level;
    private piiLoggingEnabled;
    private localCallback;
    private packageName;
    private packageVersion;
    constructor(loggerOptions: LoggerOptions, packageName?: string, packageVersion?: string);
    private static createDefaultLoggerOptions;
    /**
     * Create new Logger with existing configurations.
     */
    clone(packageName: string, packageVersion: string, correlationId?: string): Logger;
    /**
     * Log message with required options.
     */
    private logMessage;
    /**
     * Execute callback with message.
     */
    executeCallback(level: LogLevel, message: string, containsPii: boolean): void;
    /**
     * Logs error messages.
     */
    error(message: string, correlationId?: string): void;
    /**
     * Logs error messages with PII.
     */
    errorPii(message: string, correlationId?: string): void;
    /**
     * Logs warning messages.
     */
    warning(message: string, correlationId?: string): void;
    /**
     * Logs warning messages with PII.
     */
    warningPii(message: string, correlationId?: string): void;
    /**
     * Logs info messages.
     */
    info(message: string, correlationId?: string): void;
    /**
     * Logs info messages with PII.
     */
    infoPii(message: string, correlationId?: string): void;
    /**
     * Logs verbose messages.
     */
    verbose(message: string, correlationId?: string): void;
    /**
     * Logs verbose messages with PII.
     */
    verbosePii(message: string, correlationId?: string): void;
    /**
     * Logs trace messages.
     */
    trace(message: string, correlationId?: string): void;
    /**
     * Logs trace messages with PII.
     */
    tracePii(message: string, correlationId?: string): void;
    /**
     * Returns whether PII Logging is enabled or not.
     */
    isPiiLoggingEnabled(): boolean;
}
//# sourceMappingURL=Logger.d.ts.map