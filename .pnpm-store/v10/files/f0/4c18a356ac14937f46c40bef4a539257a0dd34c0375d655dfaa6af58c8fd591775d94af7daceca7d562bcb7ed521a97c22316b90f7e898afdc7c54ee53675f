"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.debug = debug;
const debug_1 = __importDefault(require("debug"));
const loggerLevels = [
    'info',
    'warn',
    'error',
    'debug',
];
/**
 * Logger class that provides colored logging functionality using the debug package.
 * Supports different log levels: info, warn, error, and debug.
 */
class Logger {
    /**
     * Creates a new Logger instance with the specified namespace.
     * @param namespace The namespace to use for the logger
     */
    constructor(namespace = '') {
        this.loggers = {};
        this.initializeLoggers(namespace);
    }
    initializeLoggers(namespace) {
        for (const level of loggerLevels) {
            const logger = (0, debug_1.default)(`${namespace}:${level}`);
            logger.color = this.getPlatformColor(level);
            this.loggers[level] = logger;
        }
    }
    getPlatformColor(level) {
        const platform = typeof window !== 'undefined' ? 'browser' : 'node';
        const colors = {
            node: {
                info: '2', // Green
                warn: '3', // Yellow
                error: '1', // Red
                debug: '4', // Blue
            },
            browser: {
                info: '#33CC99', // Green
                warn: '#CCCC33', // Yellow
                error: '#CC3366', // Red
                debug: '#0066FF', // Blue
            },
        };
        return colors[platform][level];
    }
    /**
     * Logs an informational message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    info(message, ...args) {
        this.loggers.info(message, ...args);
    }
    /**
     * Logs a warning message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    warn(message, ...args) {
        this.loggers.warn(message, ...args);
    }
    /**
     * Logs an error message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    error(message, ...args) {
        this.loggers.error(message, ...args);
    }
    /**
     * Logs a debug message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    debug(message, ...args) {
        this.loggers.debug(message, ...args);
    }
}
exports.Logger = Logger;
/**
 * Creates a new Logger instance with the specified namespace.
 * @param namespace The namespace to use for the logger
 * @returns A new Logger instance
 */
function debug(namespace) {
    return new Logger(namespace);
}
//# sourceMappingURL=logger.js.map