Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('./currentScopes.js');
const debugBuild = require('./debug-build.js');
const debugLogger = require('./utils/debug-logger.js');

function isProfilingIntegrationWithProfiler(
  integration,
) {
  return (
    !!integration &&
    typeof integration['_profiler'] !== 'undefined' &&
    typeof integration['_profiler']['start'] === 'function' &&
    typeof integration['_profiler']['stop'] === 'function'
  );
}
/**
 * Starts the Sentry continuous profiler.
 * This mode is exclusive with the transaction profiler and will only work if the profilesSampleRate is set to a falsy value.
 * In continuous profiling mode, the profiler will keep reporting profile chunks to Sentry until it is stopped, which allows for continuous profiling of the application.
 */
function startProfiler() {
  const client = currentScopes.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('No Sentry client available, profiling is not started');
    return;
  }

  const integration = client.getIntegrationByName('ProfilingIntegration');

  if (!integration) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('ProfilingIntegration is not available');
    return;
  }

  if (!isProfilingIntegrationWithProfiler(integration)) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('Profiler is not available on profiling integration.');
    return;
  }

  integration._profiler.start();
}

/**
 * Stops the Sentry continuous profiler.
 * Calls to stop will stop the profiler and flush the currently collected profile data to Sentry.
 */
function stopProfiler() {
  const client = currentScopes.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('No Sentry client available, profiling is not started');
    return;
  }

  const integration = client.getIntegrationByName('ProfilingIntegration');
  if (!integration) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('ProfilingIntegration is not available');
    return;
  }

  if (!isProfilingIntegrationWithProfiler(integration)) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('Profiler is not available on profiling integration.');
    return;
  }

  integration._profiler.stop();
}

/**
 * Profiler namespace for controlling the profiler in 'manual' mode.
 *
 * Requires the `nodeProfilingIntegration` from the `@sentry/profiling-node` package.
 */
const profiler = {
  startProfiler,
  stopProfiler,
};

exports.profiler = profiler;
//# sourceMappingURL=profiling.js.map
