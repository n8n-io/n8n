import { diag, DiagLogLevel } from '@opentelemetry/api';
import { debug } from '@sentry/core';

/**
 * Setup the OTEL logger to use our own debug logger.
 */
function setupOpenTelemetryLogger() {
  // Disable diag, to ensure this works even if called multiple times
  diag.disable();
  diag.setLogger(
    {
      error: debug.error,
      warn: debug.warn,
      info: debug.log,
      debug: debug.log,
      verbose: debug.log,
    },
    DiagLogLevel.DEBUG,
  );
}

export { setupOpenTelemetryLogger };
//# sourceMappingURL=logger.js.map
