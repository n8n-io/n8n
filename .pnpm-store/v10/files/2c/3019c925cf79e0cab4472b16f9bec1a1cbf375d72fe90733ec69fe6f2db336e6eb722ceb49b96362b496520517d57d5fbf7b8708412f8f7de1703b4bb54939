Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const capture = require('../logs/capture.js');

const DEFAULT_CAPTURED_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

// See: https://github.com/winstonjs/triple-beam
const LEVEL_SYMBOL = Symbol.for('level');
const MESSAGE_SYMBOL = Symbol.for('message');
const SPLAT_SYMBOL = Symbol.for('splat');

/**
 * Options for the Sentry Winston transport.
 */

/**
 * Creates a new Sentry Winston transport that fowards logs to Sentry. Requires the `enableLogs` option to be enabled.
 *
 * Supports Winston 3.x.x.
 *
 * @param TransportClass - The Winston transport class to extend.
 * @returns The extended transport class.
 *
 * @example
 * ```ts
 * const winston = require('winston');
 * const Transport = require('winston-transport');
 *
 * const SentryWinstonTransport = Sentry.createSentryWinstonTransport(Transport);
 *
 * const logger = winston.createLogger({
 *   transports: [new SentryWinstonTransport()],
 * });
 * ```
 */
function createSentryWinstonTransport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TransportClass,
  sentryWinstonOptions,
) {
  // @ts-ignore - We know this is safe because SentryWinstonTransport extends TransportClass
  class SentryWinstonTransport extends TransportClass {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
     constructor(options) {
      super(options);
      this._levels = new Set(sentryWinstonOptions?.levels ?? DEFAULT_CAPTURED_LEVELS);
    }

    /**
     * Forwards a winston log to the Sentry SDK.
     */
     log(info, callback) {
      try {
        setImmediate(() => {
          // @ts-ignore - We know this is safe because SentryWinstonTransport extends TransportClass
          this.emit('logged', info);
        });

        if (!isObject(info)) {
          return;
        }

        const levelFromSymbol = info[LEVEL_SYMBOL];

        // See: https://github.com/winstonjs/winston?tab=readme-ov-file#streams-objectmode-and-info-objects
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { level, message, timestamp, ...attributes } = info;
        // Remove all symbols from the remaining attributes
        attributes[LEVEL_SYMBOL] = undefined;
        attributes[MESSAGE_SYMBOL] = undefined;
        attributes[SPLAT_SYMBOL] = undefined;

        const logSeverityLevel = WINSTON_LEVEL_TO_LOG_SEVERITY_LEVEL_MAP[levelFromSymbol ] ?? 'info';
        if (this._levels.has(logSeverityLevel)) {
          capture.captureLog(logSeverityLevel, message , {
            ...attributes,
            'sentry.origin': 'auto.log.winston',
          });
        }
      } catch {
        // do nothing
      }

      if (callback) {
        callback();
      }
    }
  }

  return SentryWinstonTransport ;
}

function isObject(anything) {
  return typeof anything === 'object' && anything != null;
}

// npm
// {
//   error: 0,
//   warn: 1,
//   info: 2,
//   http: 3,
//   verbose: 4,
//   debug: 5,
//   silly: 6
// }
//
// syslog
// {
//   emerg: 0,
//   alert: 1,
//   crit: 2,
//   error: 3,
//   warning: 4,
//   notice: 5,
//   info: 6,
//   debug: 7,
// }
const WINSTON_LEVEL_TO_LOG_SEVERITY_LEVEL_MAP = {
  // npm
  silly: 'trace',
  // npm and syslog
  debug: 'debug',
  // npm
  verbose: 'debug',
  // npm
  http: 'debug',
  // npm and syslog
  info: 'info',
  // syslog
  notice: 'info',
  // npm
  warn: 'warn',
  // syslog
  warning: 'warn',
  // npm and syslog
  error: 'error',
  // syslog
  emerg: 'fatal',
  // syslog
  alert: 'fatal',
  // syslog
  crit: 'fatal',
};

exports.createSentryWinstonTransport = createSentryWinstonTransport;
//# sourceMappingURL=winston.js.map
