Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const instrument = require('./instrument.js');
const utils = require('./utils.js');

/**
 * Starts tracking the Largest Contentful Paint on the current page and collects the value once
 *
 * - the page visibility is hidden
 * - a navigation span is started (to stop LCP measurement for SPA soft navigations)
 *
 * Once either of these events triggers, the LCP value is sent as a standalone span and we stop
 * measuring LCP for subsequent routes.
 */
function trackLcpAsStandaloneSpan(client) {
  let standaloneLcpValue = 0;
  let standaloneLcpEntry;

  if (!utils.supportsWebVital('largest-contentful-paint')) {
    return;
  }

  const cleanupLcpHandler = instrument.addLcpInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1] ;
    if (!entry) {
      return;
    }
    standaloneLcpValue = metric.value;
    standaloneLcpEntry = entry;
  }, true);

  utils.listenForWebVitalReportEvents(client, (reportEvent, pageloadSpanId) => {
    _sendStandaloneLcpSpan(standaloneLcpValue, standaloneLcpEntry, pageloadSpanId, reportEvent);
    cleanupLcpHandler();
  });
}

/**
 * Exported only for testing!
 */
function _sendStandaloneLcpSpan(
  lcpValue,
  entry,
  pageloadSpanId,
  reportEvent,
) {
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending LCP span (${lcpValue})`);

  const startTime = utils.msToSec((core.browserPerformanceTimeOrigin() || 0) + (entry?.startTime || 0));
  const routeName = core.getCurrentScope().getScopeData().transactionName;

  const name = entry ? core.htmlTreeAsString(entry.element) : 'Largest contentful paint';

  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.browser.lcp',
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'ui.webvital.lcp',
    [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0, // LCP is a point-in-time metric
    // attach the pageload span id to the LCP span so that we can link them in the UI
    'sentry.pageload.span_id': pageloadSpanId,
    // describes what triggered the web vital to be reported
    'sentry.report_event': reportEvent,
  };

  if (entry) {
    entry.element && (attributes['lcp.element'] = core.htmlTreeAsString(entry.element));
    entry.id && (attributes['lcp.id'] = entry.id);

    entry.url && (attributes['lcp.url'] = entry.url);

    // loadTime is the time of LCP that's related to receiving the LCP element response..
    entry.loadTime != null && (attributes['lcp.loadTime'] = entry.loadTime);

    // renderTime is loadTime + rendering time
    // it's 0 if the LCP element is loaded from a 3rd party origin that doesn't send the
    // `Timing-Allow-Origin` header.
    entry.renderTime != null && (attributes['lcp.renderTime'] = entry.renderTime);

    entry.size != null && (attributes['lcp.size'] = entry.size);
  }

  const span = utils.startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime,
  });

  if (span) {
    span.addEvent('lcp', {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: 'millisecond',
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: lcpValue,
    });

    // LCP is a point-in-time metric, so we end the span immediately
    span.end(startTime);
  }
}

exports._sendStandaloneLcpSpan = _sendStandaloneLcpSpan;
exports.trackLcpAsStandaloneSpan = trackLcpAsStandaloneSpan;
//# sourceMappingURL=lcp.js.map
