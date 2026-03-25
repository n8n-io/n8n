"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.DefaultLogger = void 0;
exports.formatError = formatError;
exports.setLogger = setLogger;
exports.getLogger = getLogger;
exports.resetLogger = resetLogger;
const configuration_1 = require("../configuration");
/**
 * Format error object for logging with message and stack trace
 */
function formatError(error) {
    if (error instanceof Error) {
        return `${error.message}\nStack: ${error.stack || 'No stack trace'}`;
    }
    return String(error);
}
const LOG_LEVELS = {
    none: 0,
    info: 1,
    warn: 2,
    error: 3
};
/**
 * Parse log level string into a set of enabled log levels.
 * Supports pipe-separated values like "info|warn|error".
 */
function parseLogLevel(level) {
    const levels = new Set();
    const levelStrings = level.toLowerCase().trim().split('|');
    for (const levelString of levelStrings) {
        const normalizedLevel = levelString.trim();
        const levelValue = LOG_LEVELS[normalizedLevel];
        if (levelValue !== undefined) {
            levels.add(levelValue);
        }
    }
    // If no valid levels found, default to none
    if (levels.size === 0) {
        levels.add(LOG_LEVELS.none);
    }
    return levels;
}
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
class DefaultLogger {
    constructor(configProvider = configuration_1.defaultObservabilityConfigurationProvider) {
        this.configProvider = configProvider;
    }
    getEnabledLogLevels() {
        return parseLogLevel(this.configProvider.getConfiguration().observabilityLogLevel);
    }
    info(message, ...args) {
        if (this.getEnabledLogLevels().has(LOG_LEVELS.info)) {
            console.log('[INFO]', message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.getEnabledLogLevels().has(LOG_LEVELS.warn)) {
            console.warn('[WARN]', message, ...args);
        }
    }
    error(message, ...args) {
        if (this.getEnabledLogLevels().has(LOG_LEVELS.error)) {
            console.error('[ERROR]', message, ...args);
        }
    }
    event(eventType, isSuccess, durationMs, message, details) {
        const status = isSuccess ? 'succeeded' : 'failed';
        const logLevelNeeded = isSuccess ? 1 : 3;
        if (this.getEnabledLogLevels().has(logLevelNeeded)) {
            const logFn = isSuccess ? console.log : console.error;
            const messageInfo = message ? ` - ${message}` : '';
            const detailsInfo = details && Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : '';
            logFn(`[EVENT]: ${eventType} ${status} in ${durationMs}ms${messageInfo}${detailsInfo}`);
        }
    }
}
exports.DefaultLogger = DefaultLogger;
/**
 * Global logger instance - can be replaced with a custom logger via setLogger()
 */
let globalLogger = new DefaultLogger();
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
function setLogger(customLogger) {
    if (!customLogger ||
        typeof customLogger.info !== 'function' ||
        typeof customLogger.warn !== 'function' ||
        typeof customLogger.error !== 'function' ||
        typeof customLogger.event !== 'function') {
        throw new Error('Custom logger must implement ILogger interface with all methods: info, warn, error, and event');
    }
    globalLogger = customLogger;
}
/**
 * Get the current logger instance
 */
function getLogger() {
    return globalLogger;
}
/**
 * Reset to the default console logger (mainly for testing)
 */
function resetLogger() {
    globalLogger = new DefaultLogger();
}
/**
 * Default logger instance for backward compatibility.
 * Delegates to the global logger which can be replaced via setLogger().
 */
exports.logger = {
    info: (message, ...args) => globalLogger.info(message, ...args),
    warn: (message, ...args) => globalLogger.warn(message, ...args),
    error: (message, ...args) => globalLogger.error(message, ...args),
    event: (eventType, isSuccess, durationMs, message, details) => globalLogger.event(eventType, isSuccess, durationMs, message, details)
};
exports.default = exports.logger;
//# sourceMappingURL=logging.js.map