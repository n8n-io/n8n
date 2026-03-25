Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Manually report the end of the page load, resulting in the SDK ending the pageload span.
 * This only works if {@link BrowserTracingOptions.enableReportPageLoaded} is set to `true`.
 * Otherwise, the pageload span will end itself based on the {@link BrowserTracingOptions.finalTimeout},
 * {@link BrowserTracingOptions.idleTimeout} and {@link BrowserTracingOptions.childSpanTimeout}.
 *
 * @param client - The client to use. If not provided, the global client will be used.
 */
function reportPageLoaded(client = core.getClient()) {
  client?.emit('endPageloadSpan');
}

exports.reportPageLoaded = reportPageLoaded;
//# sourceMappingURL=reportPageLoaded.js.map
