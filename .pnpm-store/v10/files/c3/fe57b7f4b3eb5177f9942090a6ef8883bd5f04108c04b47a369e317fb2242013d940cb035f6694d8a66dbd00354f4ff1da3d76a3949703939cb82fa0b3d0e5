Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const browserUtils = require('@sentry-internal/browser-utils');
const utils = require('./utils.js');

/** Options for Request Instrumentation */

const responseToSpanId = new WeakMap();
const spanIdToEndTimestamp = new Map();

const defaultRequestInstrumentationOptions = {
  traceFetch: true,
  traceXHR: true,
  enableHTTPTimings: true,
  trackFetchStreamPerformance: false,
};

/** Registers span creators for xhr and fetch requests  */
function instrumentOutgoingRequests(client, _options) {
  const {
    traceFetch,
    traceXHR,
    trackFetchStreamPerformance,
    shouldCreateSpanForRequest,
    enableHTTPTimings,
    tracePropagationTargets,
    onRequestSpanStart,
    onRequestSpanEnd,
  } = {
    ...defaultRequestInstrumentationOptions,
    ..._options,
  };

  const shouldCreateSpan =
    typeof shouldCreateSpanForRequest === 'function' ? shouldCreateSpanForRequest : (_) => true;

  const shouldAttachHeadersWithTargets = (url) => shouldAttachHeaders(url, tracePropagationTargets);

  const spans = {};

  const propagateTraceparent = (client ).getOptions().propagateTraceparent;

  if (traceFetch) {
    // Keeping track of http requests, whose body payloads resolved later than the initial resolved request
    // e.g. streaming using server sent events (SSE)
    client.addEventProcessor(event => {
      if (event.type === 'transaction' && event.spans) {
        event.spans.forEach(span => {
          if (span.op === 'http.client') {
            const updatedTimestamp = spanIdToEndTimestamp.get(span.span_id);
            if (updatedTimestamp) {
              span.timestamp = updatedTimestamp / 1000;
              spanIdToEndTimestamp.delete(span.span_id);
            }
          }
        });
      }
      return event;
    });

    if (trackFetchStreamPerformance) {
      core.addFetchEndInstrumentationHandler(handlerData => {
        if (handlerData.response) {
          const span = responseToSpanId.get(handlerData.response);
          if (span && handlerData.endTimestamp) {
            spanIdToEndTimestamp.set(span, handlerData.endTimestamp);
          }
        }
      });
    }

    core.addFetchInstrumentationHandler(handlerData => {
      const createdSpan = core.instrumentFetchRequest(handlerData, shouldCreateSpan, shouldAttachHeadersWithTargets, spans, {
        propagateTraceparent,
        onRequestSpanEnd,
      });

      if (handlerData.response && handlerData.fetchData.__span) {
        responseToSpanId.set(handlerData.response, handlerData.fetchData.__span);
      }

      // We cannot use `window.location` in the generic fetch instrumentation,
      // but we need it for reliable `server.address` attribute.
      // so we extend this in here
      if (createdSpan) {
        const fullUrl = utils.getFullURL(handlerData.fetchData.url);
        const host = fullUrl ? core.parseUrl(fullUrl).host : undefined;
        createdSpan.setAttributes({
          'http.url': fullUrl ? core.stripDataUrlContent(fullUrl) : undefined,
          'server.address': host,
        });

        if (enableHTTPTimings) {
          addHTTPTimings(createdSpan);
        }

        onRequestSpanStart?.(createdSpan, { headers: handlerData.headers });
      }
    });
  }

  if (traceXHR) {
    browserUtils.addXhrInstrumentationHandler(handlerData => {
      const createdSpan = xhrCallback(
        handlerData,
        shouldCreateSpan,
        shouldAttachHeadersWithTargets,
        spans,
        propagateTraceparent,
        onRequestSpanEnd,
      );

      if (createdSpan) {
        if (enableHTTPTimings) {
          addHTTPTimings(createdSpan);
        }

        onRequestSpanStart?.(createdSpan, {
          headers: utils.createHeadersSafely(handlerData.xhr.__sentry_xhr_v3__?.request_headers),
        });
      }
    });
  }
}

/**
 * Creates a temporary observer to listen to the next fetch/xhr resourcing timings,
 * so that when timings hit their per-browser limit they don't need to be removed.
 *
 * @param span A span that has yet to be finished, must contain `url` on data.
 */
function addHTTPTimings(span) {
  const { url } = core.spanToJSON(span).data;

  if (!url || typeof url !== 'string') {
    return;
  }

  const cleanup = browserUtils.addPerformanceInstrumentationHandler('resource', ({ entries }) => {
    entries.forEach(entry => {
      if (utils.isPerformanceResourceTiming(entry) && entry.name.endsWith(url)) {
        span.setAttributes(browserUtils.resourceTimingToSpanAttributes(entry));
        // In the next tick, clean this handler up
        // We have to wait here because otherwise this cleans itself up before it is fully done
        setTimeout(cleanup);
      }
    });
  });
}

/**
 * A function that determines whether to attach tracing headers to a request.
 * We only export this function for testing purposes.
 */
function shouldAttachHeaders(
  targetUrl,
  tracePropagationTargets,
) {
  // window.location.href not being defined is an edge case in the browser but we need to handle it.
  // Potentially dangerous situations where it may not be defined: Browser Extensions, Web Workers, patching of the location obj
  const href = core.getLocationHref();

  if (!href) {
    // If there is no window.location.origin, we default to only attaching tracing headers to relative requests, i.e. ones that start with `/`
    // BIG DISCLAIMER: Users can call URLs with a double slash (fetch("//example.com/api")), this is a shorthand for "send to the same protocol",
    // so we need a to exclude those requests, because they might be cross origin.
    const isRelativeSameOriginRequest = !!targetUrl.match(/^\/(?!\/)/);
    if (!tracePropagationTargets) {
      return isRelativeSameOriginRequest;
    } else {
      return core.stringMatchesSomePattern(targetUrl, tracePropagationTargets);
    }
  } else {
    let resolvedUrl;
    let currentOrigin;

    // URL parsing may fail, we default to not attaching trace headers in that case.
    try {
      resolvedUrl = new URL(targetUrl, href);
      currentOrigin = new URL(href).origin;
    } catch {
      return false;
    }

    const isSameOriginRequest = resolvedUrl.origin === currentOrigin;
    if (!tracePropagationTargets) {
      return isSameOriginRequest;
    } else {
      return (
        core.stringMatchesSomePattern(resolvedUrl.toString(), tracePropagationTargets) ||
        (isSameOriginRequest && core.stringMatchesSomePattern(resolvedUrl.pathname, tracePropagationTargets))
      );
    }
  }
}

/**
 * Create and track xhr request spans
 *
 * @returns Span if a span was created, otherwise void.
 */
function xhrCallback(
  handlerData,
  shouldCreateSpan,
  shouldAttachHeaders,
  spans,
  propagateTraceparent,
  onRequestSpanEnd,
) {
  const xhr = handlerData.xhr;
  const sentryXhrData = xhr?.[browserUtils.SENTRY_XHR_DATA_KEY];

  if (!xhr || xhr.__sentry_own_request__ || !sentryXhrData) {
    return undefined;
  }

  const { url, method } = sentryXhrData;

  const shouldCreateSpanResult = core.hasSpansEnabled() && shouldCreateSpan(url);

  // check first if the request has finished and is tracked by an existing span which should now end
  if (handlerData.endTimestamp && shouldCreateSpanResult) {
    const spanId = xhr.__sentry_xhr_span_id__;
    if (!spanId) return;

    const span = spans[spanId];
    if (span && sentryXhrData.status_code !== undefined) {
      core.setHttpStatus(span, sentryXhrData.status_code);
      span.end();

      onRequestSpanEnd?.(span, {
        headers: utils.createHeadersSafely(browserUtils.parseXhrResponseHeaders(xhr )),
        error: handlerData.error,
      });

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete spans[spanId];
    }
    return undefined;
  }

  const fullUrl = utils.getFullURL(url);
  const parsedUrl = fullUrl ? core.parseUrl(fullUrl) : core.parseUrl(url);

  const urlForSpanName = core.stripDataUrlContent(core.stripUrlQueryAndFragment(url));

  const hasParent = !!core.getActiveSpan();

  const span =
    shouldCreateSpanResult && hasParent
      ? core.startInactiveSpan({
          name: `${method} ${urlForSpanName}`,
          attributes: {
            url: core.stripDataUrlContent(url),
            type: 'xhr',
            'http.method': method,
            'http.url': fullUrl ? core.stripDataUrlContent(fullUrl) : undefined,
            'server.address': parsedUrl?.host,
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.browser',
            [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.client',
            ...(parsedUrl?.search && { 'http.query': parsedUrl?.search }),
            ...(parsedUrl?.hash && { 'http.fragment': parsedUrl?.hash }),
          },
        })
      : new core.SentryNonRecordingSpan();

  xhr.__sentry_xhr_span_id__ = span.spanContext().spanId;
  spans[xhr.__sentry_xhr_span_id__] = span;

  if (shouldAttachHeaders(url)) {
    addTracingHeadersToXhrRequest(
      xhr,
      // If performance is disabled (TWP) or there's no active root span (pageload/navigation/interaction),
      // we do not want to use the span as base for the trace headers,
      // which means that the headers will be generated from the scope and the sampling decision is deferred
      core.hasSpansEnabled() && hasParent ? span : undefined,
      propagateTraceparent,
    );
  }

  const client = core.getClient();
  if (client) {
    client.emit('beforeOutgoingRequestSpan', span, handlerData );
  }

  return span;
}

function addTracingHeadersToXhrRequest(
  xhr,
  span,
  propagateTraceparent,
) {
  const { 'sentry-trace': sentryTrace, baggage, traceparent } = core.getTraceData({ span, propagateTraceparent });

  if (sentryTrace) {
    setHeaderOnXhr(xhr, sentryTrace, baggage, traceparent);
  }
}

function setHeaderOnXhr(
  xhr,
  sentryTraceHeader,
  sentryBaggageHeader,
  traceparentHeader,
) {
  const originalHeaders = xhr.__sentry_xhr_v3__?.request_headers;

  if (originalHeaders?.['sentry-trace'] || !xhr.setRequestHeader) {
    // bail if a sentry-trace header is already set
    return;
  }

  try {
    xhr.setRequestHeader('sentry-trace', sentryTraceHeader);

    if (traceparentHeader && !originalHeaders?.['traceparent']) {
      xhr.setRequestHeader('traceparent', traceparentHeader);
    }

    if (sentryBaggageHeader) {
      // only add our headers if
      // - no pre-existing baggage header exists
      // - or it is set and doesn't yet contain sentry values
      const originalBaggageHeader = originalHeaders?.['baggage'];
      if (!originalBaggageHeader || !utils.baggageHeaderHasSentryValues(originalBaggageHeader)) {
        // From MDN: "If this method is called several times with the same header, the values are merged into one single request header."
        // We can therefore simply set a baggage header without checking what was there before
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/setRequestHeader
        xhr.setRequestHeader('baggage', sentryBaggageHeader);
      }
    }
  } catch {
    // Error: InvalidStateError: Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.
  }
}

exports.defaultRequestInstrumentationOptions = defaultRequestInstrumentationOptions;
exports.instrumentOutgoingRequests = instrumentOutgoingRequests;
exports.shouldAttachHeaders = shouldAttachHeaders;
//# sourceMappingURL=request.js.map
