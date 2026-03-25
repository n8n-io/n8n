/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import createDebug, { Debugger } from 'debug'

const loggerLevels = [
  'info',
  'warn',
  'error',
  'debug',
] as const

type LoggerLevels = typeof loggerLevels[number]

/**
 * Logger class that provides colored logging functionality using the debug package.
 * Supports different log levels: info, warn, error, and debug.
 */
export class Logger {
  private loggers: { [K in LoggerLevels]: Debugger } = {} as any

  /**
   * Creates a new Logger instance with the specified namespace.
   * @param namespace The namespace to use for the logger
   */
  constructor (namespace: string = '') {
    this.initializeLoggers(namespace)
  }

  private initializeLoggers (namespace: string) {
    for (const level of loggerLevels) {
      const logger = createDebug(`${namespace}:${level}`)
      logger.color = this.getPlatformColor(level)
      this.loggers[level] = logger
    }
  }

  private getPlatformColor (level: LoggerLevels): string {
    const platform = typeof window !== 'undefined' ? 'browser' : 'node'
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
    }

    return colors[platform][level]
  }

  /**
   * Logs an informational message.
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  info (message: string, ...args: any[]) {
    this.loggers.info(message, ...args)
  }

  /**
   * Logs a warning message.
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  warn (message: string, ...args: any[]) {
    this.loggers.warn(message, ...args)
  }

  /**
   * Logs an error message.
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  error (message: string, ...args: any[]) {
    this.loggers.error(message, ...args)
  }

  /**
   * Logs a debug message.
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  debug (message: string, ...args: any[]) {
    this.loggers.debug(message, ...args)
  }
}

/**
 * Creates a new Logger instance with the specified namespace.
 * @param namespace The namespace to use for the logger
 * @returns A new Logger instance
 */
export function debug (namespace: string): Logger {
  return new Logger(namespace)
}
