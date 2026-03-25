Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const api = require('@opentelemetry/api');
const core = require('@sentry/core');

/**
 * Setup the OTEL logger to use our own debug logger.
 */
function setupOpenTelemetryLogger() {
  // Disable diag, to ensure this works even if called multiple times
  api.diag.disable();
  api.diag.setLogger(
    {
      error: core.debug.error,
      warn: core.debug.warn,
      info: core.debug.log,
      debug: core.debug.log,
      verbose: core.debug.log,
    },
    api.DiagLogLevel.DEBUG,
  );
}

exports.setupOpenTelemetryLogger = setupOpenTelemetryLogger;
//# sourceMappingURL=logger.js.map
