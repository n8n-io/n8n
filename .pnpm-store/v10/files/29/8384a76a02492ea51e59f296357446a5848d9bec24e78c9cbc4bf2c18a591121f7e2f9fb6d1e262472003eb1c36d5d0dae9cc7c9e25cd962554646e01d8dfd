Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');

/**
 * Starts the Sentry UI profiler.
 * This mode is exclusive with the transaction profiler and will only work if the profilesSampleRate is set to a falsy value.
 * In UI profiling mode, the profiler will keep reporting profile chunks to Sentry until it is stopped, which allows for continuous profiling of the application.
 */
function startProfiler() {
  const client = core.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && core.debug.warn('No Sentry client available, profiling is not started');
    return;
  }

  const integration = client.getIntegrationByName('BrowserProfiling');

  if (!integration) {
    debugBuild.DEBUG_BUILD && core.debug.warn('BrowserProfiling integration is not available');
    return;
  }

  client.emit('startUIProfiler');
}

/**
 * Stops the Sentry UI profiler.
 * Calls to stop will stop the profiler and flush the currently collected profile data to Sentry.
 */
function stopProfiler() {
  const client = core.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && core.debug.warn('No Sentry client available, profiling is not started');
    return;
  }

  const integration = client.getIntegrationByName('BrowserProfiling');
  if (!integration) {
    debugBuild.DEBUG_BUILD && core.debug.warn('ProfilingIntegration is not available');
    return;
  }

  client.emit('stopUIProfiler');
}

/**
 * Profiler namespace for controlling the JS profiler in 'manual' mode.
 *
 * Requires the `browserProfilingIntegration` from the `@sentry/browser` package.
 */
const uiProfiler = {
  startProfiler,
  stopProfiler,
};

exports.uiProfiler = uiProfiler;
//# sourceMappingURL=index.js.map
