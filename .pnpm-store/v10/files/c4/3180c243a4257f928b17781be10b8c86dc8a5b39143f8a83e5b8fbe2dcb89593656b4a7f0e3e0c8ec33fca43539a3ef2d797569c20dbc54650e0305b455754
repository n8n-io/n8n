Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const diagnosticsChannel = require('node:diagnostics_channel');
const core = require('@sentry/core');
const injectLoader = require('../sdk/injectLoader.js');

const SENTRY_TRACK_SYMBOL = Symbol('sentry-track-pino-logger');

/**
 * Gets a custom Pino key from a logger instance by searching for the symbol.
 * Pino uses non-global symbols like Symbol('pino.messageKey'): https://github.com/pinojs/pino/blob/8a816c0b1f72de5ae9181f3bb402109b66f7d812/lib/symbols.js
 */
function getPinoKey(logger, symbolName, defaultKey) {
  const symbols = Object.getOwnPropertySymbols(logger);
  const symbolString = `Symbol(${symbolName})`;
  for (const sym of symbols) {
    if (sym.toString() === symbolString) {
      const value = logger[sym];
      return typeof value === 'string' ? value : defaultKey;
    }
  }
  return defaultKey;
}

const DEFAULT_OPTIONS = {
  error: { levels: [], handled: true },
  log: { levels: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] },
};

function stripIgnoredFields(result) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { level, time, pid, hostname, ...rest } = result;
  return rest;
}

const _pinoIntegration = core.defineIntegration((userOptions = {}) => {
  const options = {
    autoInstrument: userOptions.autoInstrument !== false,
    error: { ...DEFAULT_OPTIONS.error, ...userOptions.error },
    log: { ...DEFAULT_OPTIONS.log, ...userOptions.log },
  };

  function shouldTrackLogger(logger) {
    const override = logger[SENTRY_TRACK_SYMBOL];
    return override === 'track' || (override !== 'ignore' && options.autoInstrument);
  }

  return {
    name: 'Pino',
    setup: client => {
      const enableLogs = !!client.getOptions().enableLogs;

      injectLoader.addInstrumentationConfig({
        channelName: 'pino-log',
        // From Pino v9.10.0 a tracing channel is available directly from Pino:
        // https://github.com/pinojs/pino/pull/2281
        module: { name: 'pino', versionRange: '>=8.0.0 < 9.10.0', filePath: 'lib/tools.js' },
        functionQuery: {
          functionName: 'asJson',
          kind: 'Sync',
        },
      });

      const injectedChannel = diagnosticsChannel.tracingChannel('orchestrion:pino:pino-log');
      const integratedChannel = diagnosticsChannel.tracingChannel('pino_asJson');

      function onPinoStart(self, args, result) {
        if (!shouldTrackLogger(self)) {
          return;
        }

        const resultObj = stripIgnoredFields(result);

        const [captureObj, message, levelNumber] = args;
        const level = self?.levels?.labels?.[levelNumber] || 'info';
        const messageKey = getPinoKey(self, 'pino.messageKey', 'msg');
        const logMessage = message || (resultObj?.[messageKey] ) || '';

        if (enableLogs && options.log.levels.includes(level)) {
          const attributes = {
            ...resultObj,
            'sentry.origin': 'auto.log.pino',
            'pino.logger.level': levelNumber,
          };

          core._INTERNAL_captureLog({ level, message: logMessage, attributes });
        }

        if (options.error.levels.includes(level)) {
          const captureContext = {
            level: core.severityLevelFromString(level),
          };

          core.withScope(scope => {
            scope.addEventProcessor(event => {
              event.logger = 'pino';

              core.addExceptionMechanism(event, {
                handled: options.error.handled,
                type: 'pino',
              });

              return event;
            });

            const error = captureObj[getPinoKey(self, 'pino.errorKey', 'err')];
            if (error) {
              core.captureException(error, captureContext);
              return;
            }

            core.captureMessage(logMessage, captureContext);
          });
        }
      }

      injectedChannel.end.subscribe(data => {
        const { self, arguments: args, result } = data ;
        onPinoStart(self, args, JSON.parse(result));
      });

      integratedChannel.end.subscribe(data => {
        const {
          instance,
          arguments: args,
          result,
        } = data ;
        onPinoStart(instance, args, JSON.parse(result));
      });
    },
  };
}) ;

/**
 * Integration for Pino logging library.
 * Captures Pino logs as Sentry logs and optionally captures some log levels as events.
 *
 * By default, all Pino loggers will be captured. To ignore a specific logger, use `pinoIntegration.untrackLogger(logger)`.
 *
 * If you disable automatic instrumentation with `autoInstrument: false`, you can mark specific loggers to be tracked with `pinoIntegration.trackLogger(logger)`.
 *
 * Requires Pino >=v8.0.0 and Node >=20.6.0 or >=18.19.0
 */
const pinoIntegration = Object.assign(_pinoIntegration, {
  trackLogger(logger) {
    if (logger && typeof logger === 'object' && 'levels' in logger) {
      (logger )[SENTRY_TRACK_SYMBOL] = 'track';
    }
  },
  untrackLogger(logger) {
    if (logger && typeof logger === 'object' && 'levels' in logger) {
      (logger )[SENTRY_TRACK_SYMBOL] = 'ignore';
    }
  },
}) ;

exports.pinoIntegration = pinoIntegration;
//# sourceMappingURL=pino.js.map
