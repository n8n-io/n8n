Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const instrument = require('./instrument.js');
const utils = require('./utils.js');

/**
 * Starts tracking the Cumulative Layout Shift on the current page and collects the value once
 *
 * - the page visibility is hidden
 * - a navigation span is started (to stop CLS measurement for SPA soft navigations)
 *
 * Once either of these events triggers, the CLS value is sent as a standalone span and we stop
 * measuring CLS.
 */
function trackClsAsStandaloneSpan(client) {
  let standaloneCLsValue = 0;
  let standaloneClsEntry;

  if (!utils.supportsWebVital('layout-shift')) {
    return;
  }

  const cleanupClsHandler = instrument.addClsInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1] ;
    if (!entry) {
      return;
    }
    standaloneCLsValue = metric.value;
    standaloneClsEntry = entry;
  }, true);

  utils.listenForWebVitalReportEvents(client, (reportEvent, pageloadSpanId) => {
    _sendStandaloneClsSpan(standaloneCLsValue, standaloneClsEntry, pageloadSpanId, reportEvent);
    cleanupClsHandler();
  });
}

/**
 * Exported only for testing!
 */
function _sendStandaloneClsSpan(
  clsValue,
  entry,
  pageloadSpanId,
  reportEvent,
) {
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending CLS span (${clsValue})`);

  const startTime = entry ? utils.msToSec((core.browserPerformanceTimeOrigin() || 0) + entry.startTime) : core.timestampInSeconds();
  const routeName = core.getCurrentScope().getScopeData().transactionName;

  const name = entry ? core.htmlTreeAsString(entry.sources[0]?.node) : 'Layout shift';

  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.browser.cls',
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'ui.webvital.cls',
    [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    // attach the pageload span id to the CLS span so that we can link them in the UI
    'sentry.pageload.span_id': pageloadSpanId,
    // describes what triggered the web vital to be reported
    'sentry.report_event': reportEvent,
  };

  // Add CLS sources as span attributes to help with debugging layout shifts
  // See: https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/sources
  if (entry?.sources) {
    entry.sources.forEach((source, index) => {
      attributes[`cls.source.${index + 1}`] = core.htmlTreeAsString(source.node);
    });
  }

  const span = utils.startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime,
  });

  if (span) {
    span.addEvent('cls', {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: '',
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: clsValue,
    });

    // LayoutShift performance entries always have a duration of 0, so we don't need to add `entry.duration` here
    // see: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/duration
    span.end(startTime);
  }
}

exports._sendStandaloneClsSpan = _sendStandaloneClsSpan;
exports.trackClsAsStandaloneSpan = trackClsAsStandaloneSpan;
//# sourceMappingURL=cls.js.map
