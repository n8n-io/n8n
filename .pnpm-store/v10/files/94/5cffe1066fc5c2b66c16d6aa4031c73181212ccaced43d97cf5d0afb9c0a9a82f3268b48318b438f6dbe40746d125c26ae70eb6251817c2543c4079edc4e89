Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const types = require('../types.js');
const cls = require('./cls.js');
const instrument = require('./instrument.js');
const lcp = require('./lcp.js');
const resourceTiming = require('./resourceTiming.js');
const utils = require('./utils.js');
const getActivationStart = require('./web-vitals/lib/getActivationStart.js');
const getNavigationEntry = require('./web-vitals/lib/getNavigationEntry.js');
const getVisibilityWatcher = require('./web-vitals/lib/getVisibilityWatcher.js');

const MAX_INT_AS_BYTES = 2147483647;

let _performanceCursor = 0;

let _measurements = {};
let _lcpEntry;
let _clsEntry;

/**
 * Start tracking web vitals.
 * The callback returned by this function can be used to stop tracking & ensure all measurements are final & captured.
 *
 * @returns A function that forces web vitals collection
 */
function startTrackingWebVitals({
  recordClsStandaloneSpans,
  recordLcpStandaloneSpans,
  client,
}) {
  const performance = utils.getBrowserPerformanceAPI();
  if (performance && core.browserPerformanceTimeOrigin()) {
    // @ts-expect-error we want to make sure all of these are available, even if TS is sure they are
    if (performance.mark) {
      types.WINDOW.performance.mark('sentry-tracing-init');
    }
    const lcpCleanupCallback = recordLcpStandaloneSpans ? lcp.trackLcpAsStandaloneSpan(client) : _trackLCP();
    const ttfbCleanupCallback = _trackTtfb();
    const clsCleanupCallback = recordClsStandaloneSpans ? cls.trackClsAsStandaloneSpan(client) : _trackCLS();

    return () => {
      lcpCleanupCallback?.();
      ttfbCleanupCallback();
      clsCleanupCallback?.();
    };
  }

  return () => undefined;
}

/**
 * Start tracking long tasks.
 */
function startTrackingLongTasks() {
  instrument.addPerformanceInstrumentationHandler('longtask', ({ entries }) => {
    const parent = core.getActiveSpan();
    if (!parent) {
      return;
    }

    const { op: parentOp, start_timestamp: parentStartTimestamp } = core.spanToJSON(parent);

    for (const entry of entries) {
      const startTime = utils.msToSec((core.browserPerformanceTimeOrigin() ) + entry.startTime);
      const duration = utils.msToSec(entry.duration);

      if (parentOp === 'navigation' && parentStartTimestamp && startTime < parentStartTimestamp) {
        // Skip adding a span if the long task started before the navigation started.
        // `startAndEndSpan` will otherwise adjust the parent's start time to the span's start
        // time, potentially skewing the duration of the actual navigation as reported via our
        // routing instrumentations
        continue;
      }

      utils.startAndEndSpan(parent, startTime, startTime + duration, {
        name: 'Main UI thread blocked',
        op: 'ui.long-task',
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
        },
      });
    }
  });
}

/**
 * Start tracking long animation frames.
 */
function startTrackingLongAnimationFrames() {
  // NOTE: the current web-vitals version (3.5.2) does not support long-animation-frame, so
  // we directly observe `long-animation-frame` events instead of through the web-vitals
  // `observe` helper function.
  const observer = new PerformanceObserver(list => {
    const parent = core.getActiveSpan();
    if (!parent) {
      return;
    }
    for (const entry of list.getEntries() ) {
      if (!entry.scripts[0]) {
        continue;
      }

      const startTime = utils.msToSec((core.browserPerformanceTimeOrigin() ) + entry.startTime);

      const { start_timestamp: parentStartTimestamp, op: parentOp } = core.spanToJSON(parent);

      if (parentOp === 'navigation' && parentStartTimestamp && startTime < parentStartTimestamp) {
        // Skip adding the span if the long animation frame started before the navigation started.
        // `startAndEndSpan` will otherwise adjust the parent's start time to the span's start
        // time, potentially skewing the duration of the actual navigation as reported via our
        // routing instrumentations
        continue;
      }
      const duration = utils.msToSec(entry.duration);

      const attributes = {
        [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
      };

      const initialScript = entry.scripts[0];
      const { invoker, invokerType, sourceURL, sourceFunctionName, sourceCharPosition } = initialScript;
      attributes['browser.script.invoker'] = invoker;
      attributes['browser.script.invoker_type'] = invokerType;
      if (sourceURL) {
        attributes['code.filepath'] = sourceURL;
      }
      if (sourceFunctionName) {
        attributes['code.function'] = sourceFunctionName;
      }
      if (sourceCharPosition !== -1) {
        attributes['browser.script.source_char_position'] = sourceCharPosition;
      }

      utils.startAndEndSpan(parent, startTime, startTime + duration, {
        name: 'Main UI thread blocked',
        op: 'ui.long-animation-frame',
        attributes,
      });
    }
  });

  observer.observe({ type: 'long-animation-frame', buffered: true });
}

/**
 * Start tracking interaction events.
 */
function startTrackingInteractions() {
  instrument.addPerformanceInstrumentationHandler('event', ({ entries }) => {
    const parent = core.getActiveSpan();
    if (!parent) {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'click') {
        const startTime = utils.msToSec((core.browserPerformanceTimeOrigin() ) + entry.startTime);
        const duration = utils.msToSec(entry.duration);

        const spanOptions = {
          name: core.htmlTreeAsString(entry.target),
          op: `ui.interaction.${entry.name}`,
          startTime: startTime,
          attributes: {
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
          },
        };

        const componentName = core.getComponentName(entry.target);
        if (componentName) {
          spanOptions.attributes['ui.component_name'] = componentName;
        }

        utils.startAndEndSpan(parent, startTime, startTime + duration, spanOptions);
      }
    }
  });
}

/**
 * Starts tracking the Cumulative Layout Shift on the current page and collects the value and last entry
 * to the `_measurements` object which ultimately is applied to the pageload span's measurements.
 */
function _trackCLS() {
  return instrument.addClsInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1] ;
    if (!entry) {
      return;
    }
    _measurements['cls'] = { value: metric.value, unit: '' };
    _clsEntry = entry;
  }, true);
}

/** Starts tracking the Largest Contentful Paint on the current page. */
function _trackLCP() {
  return instrument.addLcpInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry) {
      return;
    }

    _measurements['lcp'] = { value: metric.value, unit: 'millisecond' };
    _lcpEntry = entry ;
  }, true);
}

function _trackTtfb() {
  return instrument.addTtfbInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry) {
      return;
    }

    _measurements['ttfb'] = { value: metric.value, unit: 'millisecond' };
  });
}

/** Add performance related spans to a transaction */
function addPerformanceEntries(span, options) {
  const performance = utils.getBrowserPerformanceAPI();
  const origin = core.browserPerformanceTimeOrigin();
  if (!performance?.getEntries || !origin) {
    // Gatekeeper if performance API not available
    return;
  }

  const timeOrigin = utils.msToSec(origin);

  const performanceEntries = performance.getEntries();

  const { op, start_timestamp: transactionStartTime } = core.spanToJSON(span);

  performanceEntries.slice(_performanceCursor).forEach(entry => {
    const startTime = utils.msToSec(entry.startTime);
    const duration = utils.msToSec(
      // Inexplicably, Chrome sometimes emits a negative duration. We need to work around this.
      // There is a SO post attempting to explain this, but it leaves one with open questions: https://stackoverflow.com/questions/23191918/peformance-getentries-and-negative-duration-display
      // The way we clamp the value is probably not accurate, since we have observed this happen for things that may take a while to load, like for example the replay worker.
      // TODO: Investigate why this happens and how to properly mitigate. For now, this is a workaround to prevent transactions being dropped due to negative duration spans.
      Math.max(0, entry.duration),
    );

    if (op === 'navigation' && transactionStartTime && timeOrigin + startTime < transactionStartTime) {
      return;
    }

    switch (entry.entryType) {
      case 'navigation': {
        _addNavigationSpans(span, entry , timeOrigin);
        break;
      }
      case 'mark':
      case 'paint':
      case 'measure': {
        _addMeasureSpans(span, entry, startTime, duration, timeOrigin, options.ignorePerformanceApiSpans);

        // capture web vitals
        const firstHidden = getVisibilityWatcher.getVisibilityWatcher();
        // Only report if the page wasn't hidden prior to the web vital.
        const shouldRecord = entry.startTime < firstHidden.firstHiddenTime;

        if (entry.name === 'first-paint' && shouldRecord) {
          _measurements['fp'] = { value: entry.startTime, unit: 'millisecond' };
        }
        if (entry.name === 'first-contentful-paint' && shouldRecord) {
          _measurements['fcp'] = { value: entry.startTime, unit: 'millisecond' };
        }
        break;
      }
      case 'resource': {
        _addResourceSpans(
          span,
          entry ,
          entry.name,
          startTime,
          duration,
          timeOrigin,
          options.ignoreResourceSpans,
        );
        break;
      }
      // Ignore other entry types.
    }
  });

  _performanceCursor = Math.max(performanceEntries.length - 1, 0);

  _trackNavigator(span);

  // Measurements are only available for pageload transactions
  if (op === 'pageload') {
    _addTtfbRequestTimeToMeasurements(_measurements);

    // If CLS standalone spans are enabled, don't record CLS as a measurement
    if (!options.recordClsOnPageloadSpan) {
      delete _measurements.cls;
    }

    // If LCP standalone spans are enabled, don't record LCP as a measurement
    if (!options.recordLcpOnPageloadSpan) {
      delete _measurements.lcp;
    }

    Object.entries(_measurements).forEach(([measurementName, measurement]) => {
      core.setMeasurement(measurementName, measurement.value, measurement.unit);
    });

    // Set timeOrigin which denotes the timestamp which to base the LCP/FCP/FP/TTFB measurements on
    span.setAttribute('performance.timeOrigin', timeOrigin);

    // In prerendering scenarios, where a page might be prefetched and pre-rendered before the user clicks the link,
    // the navigation starts earlier than when the user clicks it. Web Vitals should always be based on the
    // user-perceived time, so they are not reported from the actual start of the navigation, but rather from the
    // time where the user actively started the navigation, for example by clicking a link.
    // This is user action is called "activation" and the time between navigation and activation is stored in
    // the `activationStart` attribute of the "navigation" PerformanceEntry.
    span.setAttribute('performance.activationStart', getActivationStart.getActivationStart());

    _setWebVitalAttributes(span, options);
  }

  _lcpEntry = undefined;
  _clsEntry = undefined;
  _measurements = {};
}

/**
 * React 19.2+ creates performance.measure entries for component renders.
 * We can identify them by the `detail.devtools.track` property being set to 'Components ⚛'.
 * see: https://react.dev/reference/dev-tools/react-performance-tracks
 * see: https://github.com/facebook/react/blob/06fcc8f380c6a905c7bc18d94453f623cf8cbc81/packages/react-reconciler/src/ReactFiberPerformanceTrack.js#L454-L473
 */
function isReact19MeasureEntry(entry) {
  if (entry?.entryType !== 'measure') {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (entry ).detail.devtools.track === 'Components ⚛';
  } catch {
    return;
  }
}

/**
 * Create measure related spans.
 * Exported only for tests.
 */
function _addMeasureSpans(
  span,
  entry,
  startTime,
  duration,
  timeOrigin,
  ignorePerformanceApiSpans,
) {
  if (isReact19MeasureEntry(entry)) {
    return;
  }

  if (
    ['mark', 'measure'].includes(entry.entryType) &&
    core.stringMatchesSomePattern(entry.name, ignorePerformanceApiSpans)
  ) {
    return;
  }

  const navEntry = getNavigationEntry.getNavigationEntry(false);

  const requestTime = utils.msToSec(navEntry ? navEntry.requestStart : 0);
  // Because performance.measure accepts arbitrary timestamps it can produce
  // spans that happen before the browser even makes a request for the page.
  //
  // An example of this is the automatically generated Next.js-before-hydration
  // spans created by the Next.js framework.
  //
  // To prevent this we will pin the start timestamp to the request start time
  // This does make duration inaccurate, so if this does happen, we will add
  // an attribute to the span
  const measureStartTimestamp = timeOrigin + Math.max(startTime, requestTime);
  const startTimeStamp = timeOrigin + startTime;
  const measureEndTimestamp = startTimeStamp + duration;

  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.resource.browser.metrics',
  };

  if (measureStartTimestamp !== startTimeStamp) {
    attributes['sentry.browser.measure_happened_before_request'] = true;
    attributes['sentry.browser.measure_start_time'] = measureStartTimestamp;
  }

  _addDetailToSpanAttributes(attributes, entry );

  // Measurements from third parties can be off, which would create invalid spans, dropping transactions in the process.
  if (measureStartTimestamp <= measureEndTimestamp) {
    utils.startAndEndSpan(span, measureStartTimestamp, measureEndTimestamp, {
      name: entry.name,
      op: entry.entryType,
      attributes,
    });
  }
}

function _addDetailToSpanAttributes(attributes, performanceMeasure) {
  try {
    // Accessing detail might throw in some browsers (e.g., Firefox) due to security restrictions
    const detail = performanceMeasure.detail;

    if (!detail) {
      return;
    }

    // Process detail based on its type
    if (typeof detail === 'object') {
      // Handle object details
      for (const [key, value] of Object.entries(detail)) {
        if (value && core.isPrimitive(value)) {
          attributes[`sentry.browser.measure.detail.${key}`] = value ;
        } else if (value !== undefined) {
          try {
            // This is user defined so we can't guarantee it's serializable
            attributes[`sentry.browser.measure.detail.${key}`] = JSON.stringify(value);
          } catch {
            // Skip values that can't be stringified
          }
        }
      }
      return;
    }

    if (core.isPrimitive(detail)) {
      // Handle primitive details
      attributes['sentry.browser.measure.detail'] = detail ;
      return;
    }

    try {
      attributes['sentry.browser.measure.detail'] = JSON.stringify(detail);
    } catch {
      // Skip if stringification fails
    }
  } catch {
    // Silently ignore any errors when accessing detail
    // This handles the Firefox "Permission denied to access object" error
  }
}

/**
 * Instrument navigation entries
 * exported only for tests
 */
function _addNavigationSpans(span, entry, timeOrigin) {
  (['unloadEvent', 'redirect', 'domContentLoadedEvent', 'loadEvent', 'connect'] ).forEach(event => {
    _addPerformanceNavigationTiming(span, entry, event, timeOrigin);
  });
  _addPerformanceNavigationTiming(span, entry, 'secureConnection', timeOrigin, 'TLS/SSL');
  _addPerformanceNavigationTiming(span, entry, 'fetch', timeOrigin, 'cache');
  _addPerformanceNavigationTiming(span, entry, 'domainLookup', timeOrigin, 'DNS');

  _addRequest(span, entry, timeOrigin);
}

/** Create performance navigation related spans */
function _addPerformanceNavigationTiming(
  span,
  entry,
  event,
  timeOrigin,
  name = event,
) {
  const eventEnd = _getEndPropertyNameForNavigationTiming(event) ;
  const end = entry[eventEnd];
  const start = entry[`${event}Start`];
  if (!start || !end) {
    return;
  }
  utils.startAndEndSpan(span, timeOrigin + utils.msToSec(start), timeOrigin + utils.msToSec(end), {
    op: `browser.${name}`,
    name: entry.name,
    attributes: {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
      ...(event === 'redirect' && entry.redirectCount != null ? { 'http.redirect_count': entry.redirectCount } : {}),
    },
  });
}

function _getEndPropertyNameForNavigationTiming(event) {
  if (event === 'secureConnection') {
    return 'connectEnd';
  }
  if (event === 'fetch') {
    return 'domainLookupStart';
  }
  return `${event}End`;
}

/** Create request and response related spans */
function _addRequest(span, entry, timeOrigin) {
  const requestStartTimestamp = timeOrigin + utils.msToSec(entry.requestStart);
  const responseEndTimestamp = timeOrigin + utils.msToSec(entry.responseEnd);
  const responseStartTimestamp = timeOrigin + utils.msToSec(entry.responseStart);
  if (entry.responseEnd) {
    // It is possible that we are collecting these metrics when the page hasn't finished loading yet, for example when the HTML slowly streams in.
    // In this case, ie. when the document request hasn't finished yet, `entry.responseEnd` will be 0.
    // In order not to produce faulty spans, where the end timestamp is before the start timestamp, we will only collect
    // these spans when the responseEnd value is available. The backend (Relay) would drop the entire span if it contained faulty spans.
    utils.startAndEndSpan(span, requestStartTimestamp, responseEndTimestamp, {
      op: 'browser.request',
      name: entry.name,
      attributes: {
        [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
      },
    });

    utils.startAndEndSpan(span, responseStartTimestamp, responseEndTimestamp, {
      op: 'browser.response',
      name: entry.name,
      attributes: {
        [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
      },
    });
  }
}

/**
 * Create resource-related spans.
 * Exported only for tests.
 */
function _addResourceSpans(
  span,
  entry,
  resourceUrl,
  startTime,
  duration,
  timeOrigin,
  ignoredResourceSpanOps,
) {
  // we already instrument based on fetch and xhr, so we don't need to
  // duplicate spans here.
  if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
    return;
  }

  const op = entry.initiatorType ? `resource.${entry.initiatorType}` : 'resource.other';
  if (ignoredResourceSpanOps?.includes(op)) {
    return;
  }

  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.resource.browser.metrics',
  };

  const parsedUrl = core.parseUrl(resourceUrl);

  if (parsedUrl.protocol) {
    attributes['url.scheme'] = parsedUrl.protocol.split(':').pop(); // the protocol returned by parseUrl includes a :, but OTEL spec does not, so we remove it.
  }

  if (parsedUrl.host) {
    attributes['server.address'] = parsedUrl.host;
  }

  attributes['url.same_origin'] = resourceUrl.includes(types.WINDOW.location.origin);

  _setResourceRequestAttributes(entry, attributes, [
    // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/responseStatus
    ['responseStatus', 'http.response.status_code'],

    ['transferSize', 'http.response_transfer_size'],
    ['encodedBodySize', 'http.response_content_length'],
    ['decodedBodySize', 'http.decoded_response_content_length'],

    // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/renderBlockingStatus
    ['renderBlockingStatus', 'resource.render_blocking_status'],

    // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/deliveryType
    ['deliveryType', 'http.response_delivery_type'],
  ]);

  const attributesWithResourceTiming = { ...attributes, ...resourceTiming.resourceTimingToSpanAttributes(entry) };

  const startTimestamp = timeOrigin + startTime;
  const endTimestamp = startTimestamp + duration;

  utils.startAndEndSpan(span, startTimestamp, endTimestamp, {
    name: resourceUrl.replace(types.WINDOW.location.origin, ''),
    op,
    attributes: attributesWithResourceTiming,
  });
}

/**
 * Capture the information of the user agent.
 */
function _trackNavigator(span) {
  const navigator = types.WINDOW.navigator ;
  if (!navigator) {
    return;
  }

  // track network connectivity
  const connection = navigator.connection;
  if (connection) {
    if (connection.effectiveType) {
      span.setAttribute('effectiveConnectionType', connection.effectiveType);
    }

    if (connection.type) {
      span.setAttribute('connectionType', connection.type);
    }

    if (utils.isMeasurementValue(connection.rtt)) {
      _measurements['connection.rtt'] = { value: connection.rtt, unit: 'millisecond' };
    }
  }

  if (utils.isMeasurementValue(navigator.deviceMemory)) {
    span.setAttribute('deviceMemory', `${navigator.deviceMemory} GB`);
  }

  if (utils.isMeasurementValue(navigator.hardwareConcurrency)) {
    span.setAttribute('hardwareConcurrency', String(navigator.hardwareConcurrency));
  }
}

/** Add LCP / CLS data to span to allow debugging */
function _setWebVitalAttributes(span, options) {
  // Only add LCP attributes if LCP is being recorded on the pageload span
  if (_lcpEntry && options.recordLcpOnPageloadSpan) {
    // Capture Properties of the LCP element that contributes to the LCP.

    if (_lcpEntry.element) {
      span.setAttribute('lcp.element', core.htmlTreeAsString(_lcpEntry.element));
    }

    if (_lcpEntry.id) {
      span.setAttribute('lcp.id', _lcpEntry.id);
    }

    if (_lcpEntry.url) {
      // Trim URL to the first 200 characters.
      span.setAttribute('lcp.url', _lcpEntry.url.trim().slice(0, 200));
    }

    if (_lcpEntry.loadTime != null) {
      // loadTime is the time of LCP that's related to receiving the LCP element response..
      span.setAttribute('lcp.loadTime', _lcpEntry.loadTime);
    }

    if (_lcpEntry.renderTime != null) {
      // renderTime is loadTime + rendering time
      // it's 0 if the LCP element is loaded from a 3rd party origin that doesn't send the
      // `Timing-Allow-Origin` header.
      span.setAttribute('lcp.renderTime', _lcpEntry.renderTime);
    }

    span.setAttribute('lcp.size', _lcpEntry.size);
  }

  // Only add CLS attributes if CLS is being recorded on the pageload span
  if (_clsEntry?.sources && options.recordClsOnPageloadSpan) {
    _clsEntry.sources.forEach((source, index) =>
      span.setAttribute(`cls.source.${index + 1}`, core.htmlTreeAsString(source.node)),
    );
  }
}

/**
 * Use this to set any attributes we can take directly form the PerformanceResourceTiming entry.
 *
 * This is just a mapping function for entry->attribute to keep bundle-size minimal.
 * Experimental properties are also accepted (see {@link ExperimentalResourceTimingProperty}).
 * Assumes that all entry properties might be undefined for browser-specific differences.
 * Only accepts string and number values for now and also sets 0-values.
 */
function _setResourceRequestAttributes(
  entry,
  attributes,
  properties,
) {
  properties.forEach(([entryKey, attributeKey]) => {
    const entryVal = entry[entryKey];
    if (
      entryVal != null &&
      ((typeof entryVal === 'number' && entryVal < MAX_INT_AS_BYTES) || typeof entryVal === 'string')
    ) {
      attributes[attributeKey] = entryVal;
    }
  });
}

/**
 * Add ttfb request time information to measurements.
 *
 * ttfb information is added via vendored web vitals library.
 */
function _addTtfbRequestTimeToMeasurements(_measurements) {
  const navEntry = getNavigationEntry.getNavigationEntry(false);
  if (!navEntry) {
    return;
  }

  const { responseStart, requestStart } = navEntry;

  if (requestStart <= responseStart) {
    _measurements['ttfb.requestTime'] = {
      value: responseStart - requestStart,
      unit: 'millisecond',
    };
  }
}

exports._addMeasureSpans = _addMeasureSpans;
exports._addNavigationSpans = _addNavigationSpans;
exports._addResourceSpans = _addResourceSpans;
exports._setResourceRequestAttributes = _setResourceRequestAttributes;
exports.addPerformanceEntries = addPerformanceEntries;
exports.startTrackingInteractions = startTrackingInteractions;
exports.startTrackingLongAnimationFrames = startTrackingLongAnimationFrames;
exports.startTrackingLongTasks = startTrackingLongTasks;
exports.startTrackingWebVitals = startTrackingWebVitals;
//# sourceMappingURL=browserMetrics.js.map
