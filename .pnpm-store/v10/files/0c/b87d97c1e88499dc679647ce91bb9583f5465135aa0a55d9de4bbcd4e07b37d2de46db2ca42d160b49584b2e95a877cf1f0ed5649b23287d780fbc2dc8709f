import { IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { ObservabilityConfiguration } from '../configuration';
import { ExporterEventNames } from '../tracing/exporter/ExporterEventNames';
/**
 * Custom logger interface for Agent 365 observability
 * Implement this interface to support logging backends
 */
export interface ILogger {
    /**
     * Log an informational message
     * @param message The log message
     * @param args Optional arguments to include in the log
     */
    info(message: string, ...args: unknown[]): void;
    /**
     * Log a warning message
     * @param message The log message
     * @param args Optional arguments to include in the log
     */
    warn(message: string, ...args: unknown[]): void;
    /**
     * Log an error message
     * @param message The log message
     * @param args Optional arguments to include in the log
     */
    error(message: string, ...args: unknown[]): void;
    /**
     * Log an event with standardized parameters
     * @param eventType Standardized event name from ExporterEventNames enum (e.g., ExporterEventNames.EXPORT)
     * @param isSuccess Whether the operation/event succeeded
     * @param durationMs Duration of the operation/event in milliseconds
     * @param message Optional message or additional details about the event, especially useful for errors or failures
     * @param details Optional key-value pairs with additional context (e.g., correlationId, tenantId, agentId, etc.)
     */
    event(eventType: ExporterEventNames, isSuccess: boolean, durationMs: number, message?: string, details?: Record<string, string>): void;
}
/**
 * Format error object for logging with message and stack trace
 */
export declare function formatError(error: unknown): string;
/**
 * Default console-based logger implementation with configuration provider support.
 *
 * Environment Variable:
 *   A365_OBSERVABILITY_LOG_LEVEL=none|info|warn|error (default: none)
 *
 *   Single values:
 *   none = no logging (default)
 *   info = info messages only
 *   warn = warn messages only
 *   error = error messages only
 *
 *   Multiple values (pipe-separated):
 *   info|warn = info and warn messages
 *   warn|error = warn and error messages
 *   info|warn|error = all message types
 */
export declare class DefaultLogger implements ILogger {
    private readonly configProvider;
    constructor(configProvider?: IConfigurationProvider<ObservabilityConfiguration>);
    private getEnabledLogLevels;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    event(eventType: ExporterEventNames, isSuccess: boolean, durationMs: number, message?: string, details?: Record<string, string>): void;
}
/**
 * Set a custom logger implementation for the observability SDK
 *
 * Example with Winston:
 * ```typescript
 * import * as winston from 'winston';
 * import { setLogger } from '@microsoft/agents-a365-observability';
 *
 * const winstonLogger = winston.createLogger({
 *   level: 'info',
 *   format: winston.format.json(),
 *   transports: [
 *     new winston.transports.File({ filename: 'error.log', level: 'error' }),
 *     new winston.transports.File({ filename: 'combined.log' })
 *   ]
 * });
 *
 * setLogger({
 *   info: (msg, ...args) => winstonLogger.info(msg, ...args),
 *   warn: (msg, ...args) => winstonLogger.warn(msg, ...args),
 *   error: (msg, ...args) => winstonLogger.error(msg, ...args),
 *   event: (eventType, isSuccess, durationMs, message, details) => {
 *     // eventType is ExporterEventNames enum value
 *     winstonLogger.log({ level: isSuccess ? 'info' : 'error', eventType, isSuccess, durationMs, message, ...details });
 *   }
 * });
 * ```
 *
 * @param customLogger The custom logger implementation
 */
export declare function setLogger(customLogger: ILogger): void;
/**
 * Get the current logger instance
 */
export declare function getLogger(): ILogger;
/**
 * Reset to the default console logger (mainly for testing)
 */
export declare function resetLogger(): void;
/**
 * Default logger instance for backward compatibility.
 * Delegates to the global logger which can be replaced via setLogger().
 */
export declare const logger: ILogger;
export default logger;
//# sourceMappingURL=logging.d.ts.map