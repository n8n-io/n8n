Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../currentScopes.js');
const internal = require('../logs/internal.js');
const utils = require('../logs/utils.js');

/**
 * Options for the Sentry Consola reporter.
 */

const DEFAULT_CAPTURED_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Creates a new Sentry reporter for Consola that forwards logs to Sentry. Requires the `enableLogs` option to be enabled.
 *
 * **Note: This integration supports Consola v3.x only.** The reporter interface and log object structure
 * may differ in other versions of Consola.
 *
 * @param options - Configuration options for the reporter.
 * @returns A Consola reporter that can be added to consola instances.
 *
 * @example
 * ```ts
 * import * as Sentry from '@sentry/node';
 * import { consola } from 'consola';
 *
 * Sentry.init({
 *   enableLogs: true,
 * });
 *
 * const sentryReporter = Sentry.createConsolaReporter({
 *   // Optional: filter levels to capture
 *   levels: ['error', 'warn', 'info'],
 * });
 *
 * consola.addReporter(sentryReporter);
 *
 * // Now consola logs will be captured by Sentry
 * consola.info('This will be sent to Sentry');
 * consola.error('This error will also be sent to Sentry');
 * ```
 */
function createConsolaReporter(options = {}) {
  const levels = new Set(options.levels ?? DEFAULT_CAPTURED_LEVELS);
  const providedClient = options.client;

  return {
    log(logObj) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, level, message: consolaMessage, args, tag, date: _date, ...attributes } = logObj;

      // Get client - use provided client or current client
      const client = providedClient || currentScopes.getClient();
      if (!client) {
        return;
      }

      // Determine the log severity level
      const logSeverityLevel = getLogSeverityLevel(type, level);

      // Early exit if this level should not be captured
      if (!levels.has(logSeverityLevel)) {
        return;
      }

      const { normalizeDepth = 3, normalizeMaxBreadth = 1000 } = client.getOptions();

      // Format the log message using the same approach as consola's basic reporter
      const messageParts = [];
      if (consolaMessage) {
        messageParts.push(consolaMessage);
      }
      if (args && args.length > 0) {
        messageParts.push(utils.formatConsoleArgs(args, normalizeDepth, normalizeMaxBreadth));
      }
      const message = messageParts.join(' ');

      // Build attributes
      attributes['sentry.origin'] = 'auto.log.consola';

      if (tag) {
        attributes['consola.tag'] = tag;
      }

      if (type) {
        attributes['consola.type'] = type;
      }

      // Only add level if it's a valid number (not null/undefined)
      if (level != null && typeof level === 'number') {
        attributes['consola.level'] = level;
      }

      internal._INTERNAL_captureLog({
        level: logSeverityLevel,
        message,
        attributes,
      });
    },
  };
}

// Mapping from consola log types to Sentry log severity levels
const CONSOLA_TYPE_TO_LOG_SEVERITY_LEVEL_MAP = {
  // Consola built-in types
  silent: 'trace',
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  log: 'info',
  info: 'info',
  success: 'info',
  fail: 'error',
  ready: 'info',
  start: 'info',
  box: 'info',
  debug: 'debug',
  trace: 'trace',
  verbose: 'debug',
  // Custom types that might exist
  critical: 'fatal',
  notice: 'info',
};

// Mapping from consola log levels (numbers) to Sentry log severity levels
const CONSOLA_LEVEL_TO_LOG_SEVERITY_LEVEL_MAP = {
  0: 'fatal', // Fatal and Error
  1: 'warn', // Warnings
  2: 'info', // Normal logs
  3: 'info', // Informational logs, success, fail, ready, start, ...
  4: 'debug', // Debug logs
  5: 'trace', // Trace logs
};

/**
 * Determines the log severity level from Consola type and level.
 *
 * @param type - The Consola log type (e.g., 'error', 'warn', 'info')
 * @param level - The Consola numeric log level (0-5) or null for some types like 'verbose'
 * @returns The corresponding Sentry log severity level
 */
function getLogSeverityLevel(type, level) {
  // Handle special case for verbose logs (level can be null with infinite level in Consola)
  if (type === 'verbose') {
    return 'debug';
  }

  // Handle silent logs - these should be at trace level
  if (type === 'silent') {
    return 'trace';
  }

  // First try to map by type (more specific)
  if (type) {
    const mappedLevel = CONSOLA_TYPE_TO_LOG_SEVERITY_LEVEL_MAP[type];
    if (mappedLevel) {
      return mappedLevel;
    }
  }

  // Fallback to level mapping (handle null level)
  if (typeof level === 'number') {
    const mappedLevel = CONSOLA_LEVEL_TO_LOG_SEVERITY_LEVEL_MAP[level];
    if (mappedLevel) {
      return mappedLevel;
    }
  }

  // Default fallback
  return 'info';
}

exports.createConsolaReporter = createConsolaReporter;
//# sourceMappingURL=consola.js.map
