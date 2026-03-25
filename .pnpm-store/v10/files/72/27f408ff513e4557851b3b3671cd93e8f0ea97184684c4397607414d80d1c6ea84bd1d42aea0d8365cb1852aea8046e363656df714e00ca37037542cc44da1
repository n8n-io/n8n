/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Logger class that provides colored logging functionality using the debug package.
 * Supports different log levels: info, warn, error, and debug.
 */
export declare class Logger {
    private loggers;
    /**
     * Creates a new Logger instance with the specified namespace.
     * @param namespace The namespace to use for the logger
     */
    constructor(namespace?: string);
    private initializeLoggers;
    private getPlatformColor;
    /**
     * Logs an informational message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    info(message: string, ...args: any[]): void;
    /**
     * Logs a warning message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Logs an error message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    error(message: string, ...args: any[]): void;
    /**
     * Logs a debug message.
     * @param message The message to log
     * @param args Additional arguments to include in the log
     */
    debug(message: string, ...args: any[]): void;
}
/**
 * Creates a new Logger instance with the specified namespace.
 * @param namespace The namespace to use for the logger
 * @returns A new Logger instance
 */
export declare function debug(namespace: string): Logger;
