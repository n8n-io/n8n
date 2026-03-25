Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('./currentScopes.js');
const semanticAttributes = require('./semanticAttributes.js');
const spanUtils = require('./utils/spanUtils.js');
const spanstatus = require('./tracing/spanstatus.js');
const is = require('./utils/is.js');
const hasSpansEnabled = require('./utils/hasSpansEnabled.js');
const baggage = require('./utils/baggage.js');
const sentryNonRecordingSpan = require('./tracing/sentryNonRecordingSpan.js');
const trace = require('./tracing/trace.js');
const traceData = require('./utils/traceData.js');
const url = require('./utils/url.js');

/**
 * Create and track fetch request spans for usage in combination with `addFetchInstrumentationHandler`.
 *
 * @returns Span if a span was created, otherwise void.
 */
function instrumentFetchRequest(
  handlerData,
  shouldCreateSpan,
  shouldAttachHeaders,
  spans,
  spanOriginOrOptions,
) {
  if (!handlerData.fetchData) {
    return undefined;
  }

  const { method, url } = handlerData.fetchData;

  const shouldCreateSpanResult = hasSpansEnabled.hasSpansEnabled() && shouldCreateSpan(url);

  if (handlerData.endTimestamp && shouldCreateSpanResult) {
    const spanId = handlerData.fetchData.__span;
    if (!spanId) return;

    const span = spans[spanId];
    if (span) {
      endSpan(span, handlerData);

      _callOnRequestSpanEnd(span, handlerData, spanOriginOrOptions);

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete spans[spanId];
    }
    return undefined;
  }

  // Backwards-compatible with the old signature. Needed to introduce the combined optional parameter
  // to avoid API breakage for anyone calling this function with the optional spanOrigin parameter
  // TODO (v11): remove this backwards-compatible code and only accept the options parameter
  const { spanOrigin = 'auto.http.browser', propagateTraceparent = false } =
    typeof spanOriginOrOptions === 'object' ? spanOriginOrOptions : { spanOrigin: spanOriginOrOptions };

  const hasParent = !!spanUtils.getActiveSpan();

  const span =
    shouldCreateSpanResult && hasParent
      ? trace.startInactiveSpan(getSpanStartOptions(url, method, spanOrigin))
      : new sentryNonRecordingSpan.SentryNonRecordingSpan();

  handlerData.fetchData.__span = span.spanContext().spanId;
  spans[span.spanContext().spanId] = span;

  if (shouldAttachHeaders(handlerData.fetchData.url)) {
    const request = handlerData.args[0];

    // Shallow clone the options object to avoid mutating the original user-provided object
    // Examples: users re-using same options object for multiple fetch calls, frozen objects
    const options = { ...(handlerData.args[1] || {}) };

    const headers = _addTracingHeadersToFetchRequest(
      request,
      options,
      // If performance is disabled (TWP) or there's no active root span (pageload/navigation/interaction),
      // we do not want to use the span as base for the trace headers,
      // which means that the headers will be generated from the scope and the sampling decision is deferred
      hasSpansEnabled.hasSpansEnabled() && hasParent ? span : undefined,
      propagateTraceparent,
    );
    if (headers) {
      // Ensure this is actually set, if no options have been passed previously
      handlerData.args[1] = options;
      options.headers = headers;
    }
  }

  const client = currentScopes.getClient();

  if (client) {
    const fetchHint = {
      input: handlerData.args,
      response: handlerData.response,
      startTimestamp: handlerData.startTimestamp,
      endTimestamp: handlerData.endTimestamp,
    } ;

    client.emit('beforeOutgoingRequestSpan', span, fetchHint);
  }

  return span;
}

/**
 * Calls the onRequestSpanEnd callback if it is defined.
 */
function _callOnRequestSpanEnd(
  span,
  handlerData,
  spanOriginOrOptions,
) {
  const onRequestSpanEnd =
    typeof spanOriginOrOptions === 'object' && spanOriginOrOptions !== null
      ? spanOriginOrOptions.onRequestSpanEnd
      : undefined;

  onRequestSpanEnd?.(span, {
    headers: handlerData.response?.headers,
    error: handlerData.error,
  });
}

/**
 * Adds sentry-trace and baggage headers to the various forms of fetch headers.
 * exported only for testing purposes
 *
 * When we determine if we should add a baggage header, there are 3 cases:
 * 1. No previous baggage header -> add baggage
 * 2. Previous baggage header has no sentry baggage values -> add our baggage
 * 3. Previous baggage header has sentry baggage values -> do nothing (might have been added manually by users)
 */
// eslint-disable-next-line complexity -- yup it's this complicated :(
function _addTracingHeadersToFetchRequest(
  request,
  fetchOptionsObj

,
  span,
  propagateTraceparent,
) {
  const traceHeaders = traceData.getTraceData({ span, propagateTraceparent });
  const sentryTrace = traceHeaders['sentry-trace'];
  const baggage = traceHeaders.baggage;
  const traceparent = traceHeaders.traceparent;

  // Nothing to do, when we return undefined here, the original headers will be used
  if (!sentryTrace) {
    return undefined;
  }

  const originalHeaders = fetchOptionsObj.headers || (is.isRequest(request) ? request.headers : undefined);

  if (!originalHeaders) {
    return { ...traceHeaders };
  } else if (isHeaders(originalHeaders)) {
    const newHeaders = new Headers(originalHeaders);

    // We don't want to override manually added sentry headers
    if (!newHeaders.get('sentry-trace')) {
      newHeaders.set('sentry-trace', sentryTrace);
    }

    if (propagateTraceparent && traceparent && !newHeaders.get('traceparent')) {
      newHeaders.set('traceparent', traceparent);
    }

    if (baggage) {
      const prevBaggageHeader = newHeaders.get('baggage');

      if (!prevBaggageHeader) {
        newHeaders.set('baggage', baggage);
      } else if (!baggageHeaderHasSentryBaggageValues(prevBaggageHeader)) {
        newHeaders.set('baggage', `${prevBaggageHeader},${baggage}`);
      }
    }

    return newHeaders;
  } else if (Array.isArray(originalHeaders)) {
    const newHeaders = [...originalHeaders];

    if (!originalHeaders.find(header => header[0] === 'sentry-trace')) {
      newHeaders.push(['sentry-trace', sentryTrace]);
    }

    if (propagateTraceparent && traceparent && !originalHeaders.find(header => header[0] === 'traceparent')) {
      newHeaders.push(['traceparent', traceparent]);
    }

    const prevBaggageHeaderWithSentryValues = originalHeaders.find(
      header => header[0] === 'baggage' && baggageHeaderHasSentryBaggageValues(header[1]),
    );

    if (baggage && !prevBaggageHeaderWithSentryValues) {
      // If there are multiple entries with the same key, the browser will merge the values into a single request header.
      // Its therefore safe to simply push a "baggage" entry, even though there might already be another baggage header.
      newHeaders.push(['baggage', baggage]);
    }

    return newHeaders ;
  } else {
    const existingSentryTraceHeader = 'sentry-trace' in originalHeaders ? originalHeaders['sentry-trace'] : undefined;
    const existingTraceparentHeader = 'traceparent' in originalHeaders ? originalHeaders.traceparent : undefined;
    const existingBaggageHeader = 'baggage' in originalHeaders ? originalHeaders.baggage : undefined;

    const newBaggageHeaders = existingBaggageHeader
      ? Array.isArray(existingBaggageHeader)
        ? [...existingBaggageHeader]
        : [existingBaggageHeader]
      : [];

    const prevBaggageHeaderWithSentryValues =
      existingBaggageHeader &&
      (Array.isArray(existingBaggageHeader)
        ? existingBaggageHeader.find(headerItem => baggageHeaderHasSentryBaggageValues(headerItem))
        : baggageHeaderHasSentryBaggageValues(existingBaggageHeader));

    if (baggage && !prevBaggageHeaderWithSentryValues) {
      newBaggageHeaders.push(baggage);
    }

    const newHeaders

 = {
      ...originalHeaders,
      'sentry-trace': (existingSentryTraceHeader ) ?? sentryTrace,
      baggage: newBaggageHeaders.length > 0 ? newBaggageHeaders.join(',') : undefined,
    };

    if (propagateTraceparent && traceparent && !existingTraceparentHeader) {
      newHeaders.traceparent = traceparent;
    }

    return newHeaders;
  }
}

function endSpan(span, handlerData) {
  if (handlerData.response) {
    spanstatus.setHttpStatus(span, handlerData.response.status);

    const contentLength = handlerData.response?.headers?.get('content-length');

    if (contentLength) {
      const contentLengthNum = parseInt(contentLength);
      if (contentLengthNum > 0) {
        span.setAttribute('http.response_content_length', contentLengthNum);
      }
    }
  } else if (handlerData.error) {
    span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
  }
  span.end();
}

function baggageHeaderHasSentryBaggageValues(baggageHeader) {
  return baggageHeader.split(',').some(baggageEntry => baggageEntry.trim().startsWith(baggage.SENTRY_BAGGAGE_KEY_PREFIX));
}

function isHeaders(headers) {
  return typeof Headers !== 'undefined' && is.isInstanceOf(headers, Headers);
}

function getSpanStartOptions(
  url$1,
  method,
  spanOrigin,
) {
  // Data URLs need special handling because parseStringToURLObject treats them as "relative"
  // (no "://"), causing getSanitizedUrlStringFromUrlObject to return just the pathname
  // without the "data:" prefix, making later stripDataUrlContent calls ineffective.
  // So for data URLs, we strip the content first and use that directly.
  if (url$1.startsWith('data:')) {
    const sanitizedUrl = url.stripDataUrlContent(url$1);
    return {
      name: `${method} ${sanitizedUrl}`,
      attributes: getFetchSpanAttributes(url$1, undefined, method, spanOrigin),
    };
  }

  const parsedUrl = url.parseStringToURLObject(url$1);
  const sanitizedUrl = parsedUrl ? url.getSanitizedUrlStringFromUrlObject(parsedUrl) : url$1;
  return {
    name: `${method} ${sanitizedUrl}`,
    attributes: getFetchSpanAttributes(url$1, parsedUrl, method, spanOrigin),
  };
}

function getFetchSpanAttributes(
  url$1,
  parsedUrl,
  method,
  spanOrigin,
) {
  const attributes = {
    url: url.stripDataUrlContent(url$1),
    type: 'fetch',
    'http.method': method,
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: spanOrigin,
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.client',
  };
  if (parsedUrl) {
    if (!url.isURLObjectRelative(parsedUrl)) {
      attributes['http.url'] = url.stripDataUrlContent(parsedUrl.href);
      attributes['server.address'] = parsedUrl.host;
    }
    if (parsedUrl.search) {
      attributes['http.query'] = parsedUrl.search;
    }
    if (parsedUrl.hash) {
      attributes['http.fragment'] = parsedUrl.hash;
    }
  }
  return attributes;
}

exports._addTracingHeadersToFetchRequest = _addTracingHeadersToFetchRequest;
exports._callOnRequestSpanEnd = _callOnRequestSpanEnd;
exports.instrumentFetchRequest = instrumentFetchRequest;
//# sourceMappingURL=fetch.js.map
