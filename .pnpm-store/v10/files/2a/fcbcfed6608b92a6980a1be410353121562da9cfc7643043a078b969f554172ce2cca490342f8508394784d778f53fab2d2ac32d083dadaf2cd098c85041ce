import type { Debugger } from "./debug.js";
export type { Debugger };
/**
 * The log levels supported by the logger.
 * The log levels in order of most verbose to least verbose are:
 * - verbose
 * - info
 * - warning
 * - error
 */
export type TypeSpecRuntimeLogLevel = "verbose" | "info" | "warning" | "error";
/**
 * A TypeSpecRuntimeClientLogger is a function that can log to an appropriate severity level.
 */
export type TypeSpecRuntimeClientLogger = Debugger;
/**
 * Defines the methods available on the SDK-facing logger.
 */
export interface TypeSpecRuntimeLogger {
    /**
     * Used for failures the program is unlikely to recover from,
     * such as Out of Memory.
     */
    error: Debugger;
    /**
     * Used when a function fails to perform its intended task.
     * Usually this means the function will throw an exception.
     * Not used for self-healing events (e.g. automatic retry)
     */
    warning: Debugger;
    /**
     * Used when a function operates normally.
     */
    info: Debugger;
    /**
     * Used for detailed troubleshooting scenarios. This is
     * intended for use by developers / system administrators
     * for diagnosing specific failures.
     */
    verbose: Debugger;
}
/**
 * todo doc
 */
export interface LoggerContext {
    /**
     * Immediately enables logging at the specified log level. If no level is specified, logging is disabled.
     * @param level - The log level to enable for logging.
     * Options from most verbose to least verbose are:
     * - verbose
     * - info
     * - warning
     * - error
     */
    setLogLevel(logLevel?: TypeSpecRuntimeLogLevel): void;
    /**
     * Retrieves the currently specified log level.
     */
    getLogLevel(): TypeSpecRuntimeLogLevel | undefined;
    /**
     * Creates a logger for use by the SDKs that inherits from `TypeSpecRuntimeLogger`.
     * @param namespace - The name of the SDK package.
     * @hidden
     */
    createClientLogger(namespace: string): TypeSpecRuntimeLogger;
    /**
     * The TypeSpecRuntimeClientLogger provides a mechanism for overriding where logs are output to.
     * By default, logs are sent to stderr.
     * Override the `log` method to redirect logs to another location.
     */
    logger: TypeSpecRuntimeClientLogger;
}
/**
 * Option for creating a TypeSpecRuntimeLoggerContext.
 */
export interface CreateLoggerContextOptions {
    /**
     * The name of the environment variable to check for the log level.
     */
    logLevelEnvVarName: string;
    /**
     * The namespace of the logger.
     */
    namespace: string;
}
/**
 * Creates a logger context base on the provided options.
 * @param options - The options for creating a logger context.
 * @returns The logger context.
 */
export declare function createLoggerContext(options: CreateLoggerContextOptions): LoggerContext;
/**
 * Immediately enables logging at the specified log level. If no level is specified, logging is disabled.
 * @param level - The log level to enable for logging.
 * Options from most verbose to least verbose are:
 * - verbose
 * - info
 * - warning
 * - error
 */
export declare const TypeSpecRuntimeLogger: TypeSpecRuntimeClientLogger;
/**
 * Retrieves the currently specified log level.
 */
export declare function setLogLevel(logLevel?: TypeSpecRuntimeLogLevel): void;
/**
 * Retrieves the currently specified log level.
 */
export declare function getLogLevel(): TypeSpecRuntimeLogLevel | undefined;
/**
 * Creates a logger for use by the SDKs that inherits from `TypeSpecRuntimeLogger`.
 * @param namespace - The name of the SDK package.
 * @hidden
 */
export declare function createClientLogger(namespace: string): TypeSpecRuntimeLogger;
//# sourceMappingURL=logger.d.ts.map