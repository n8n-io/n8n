import { debug, browserPerformanceTimeOrigin, timestampInSeconds, getCurrentScope, htmlTreeAsString, SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE, SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT, SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME, SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { addClsInstrumentationHandler } from './instrument.js';
import { supportsWebVital, listenForWebVitalReportEvents, msToSec, startStandaloneWebVitalSpan } from './utils.js';

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

  if (!supportsWebVital('layout-shift')) {
    return;
  }

  const cleanupClsHandler = addClsInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1] ;
    if (!entry) {
      return;
    }
    standaloneCLsValue = metric.value;
    standaloneClsEntry = entry;
  }, true);

  listenForWebVitalReportEvents(client, (reportEvent, pageloadSpanId) => {
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
  DEBUG_BUILD && debug.log(`Sending CLS span (${clsValue})`);

  const startTime = entry ? msToSec((browserPerformanceTimeOrigin() || 0) + entry.startTime) : timestampInSeconds();
  const routeName = getCurrentScope().getScopeData().transactionName;

  const name = entry ? htmlTreeAsString(entry.sources[0]?.node) : 'Layout shift';

  const attributes = {
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.browser.cls',
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'ui.webvital.cls',
    [SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    // attach the pageload span id to the CLS span so that we can link them in the UI
    'sentry.pageload.span_id': pageloadSpanId,
    // describes what triggered the web vital to be reported
    'sentry.report_event': reportEvent,
  };

  // Add CLS sources as span attributes to help with debugging layout shifts
  // See: https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift/sources
  if (entry?.sources) {
    entry.sources.forEach((source, index) => {
      attributes[`cls.source.${index + 1}`] = htmlTreeAsString(source.node);
    });
  }

  const span = startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime,
  });

  if (span) {
    span.addEvent('cls', {
      [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: '',
      [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: clsValue,
    });

    // LayoutShift performance entries always have a duration of 0, so we don't need to add `entry.duration` here
    // see: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/duration
    span.end(startTime);
  }
}

export { _sendStandaloneClsSpan, trackClsAsStandaloneSpan };
//# sourceMappingURL=cls.js.map
