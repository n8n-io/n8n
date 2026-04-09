import { getClient, shouldPropagateTraceForUrl, getTraceData, getBreadcrumbLogLevelFromHttpStatusCode, addBreadcrumb, parseUrl, getSanitizedUrlString } from '@sentry/core';
import { mergeBaggageHeaders } from './baggage.js';

const SENTRY_TRACE_HEADER = 'sentry-trace';
const SENTRY_BAGGAGE_HEADER = 'baggage';

// For baggage, we make sure to merge this into a possibly existing header
const BAGGAGE_HEADER_REGEX = /baggage: (.*)\r\n/;

/**
 * Add trace propagation headers to an outgoing fetch/undici request.
 *
 * Checks if the request URL matches trace propagation targets,
 * then injects sentry-trace, traceparent, and baggage headers.
 */
// eslint-disable-next-line complexity
function addTracePropagationHeadersToFetchRequest(
  request,
  propagationDecisionMap,
) {
  const url = getAbsoluteUrl(request.origin, request.path);

  // Manually add the trace headers, if it applies
  // Note: We do not use `propagation.inject()` here, because our propagator relies on an active span
  // Which we do not have in this case
  // The propagator _may_ overwrite this, but this should be fine as it is the same data
  const { tracePropagationTargets, propagateTraceparent } = getClient()?.getOptions() || {};
  const addedHeaders = shouldPropagateTraceForUrl(url, tracePropagationTargets, propagationDecisionMap)
    ? getTraceData({ propagateTraceparent })
    : undefined;

  if (!addedHeaders) {
    return;
  }

  const { 'sentry-trace': sentryTrace, baggage, traceparent } = addedHeaders;

  // We do not want to overwrite existing headers here
  // If the core UndiciInstrumentation is registered, it will already have set the headers
  // We do not want to add any then
  if (Array.isArray(request.headers)) {
    const requestHeaders = request.headers;

    // We do not want to overwrite existing header here, if it was already set
    if (sentryTrace && !requestHeaders.includes(SENTRY_TRACE_HEADER)) {
      requestHeaders.push(SENTRY_TRACE_HEADER, sentryTrace);
    }

    if (traceparent && !requestHeaders.includes('traceparent')) {
      requestHeaders.push('traceparent', traceparent);
    }

    // For baggage, we make sure to merge this into a possibly existing header
    const existingBaggagePos = requestHeaders.findIndex(header => header === SENTRY_BAGGAGE_HEADER);
    if (baggage && existingBaggagePos === -1) {
      requestHeaders.push(SENTRY_BAGGAGE_HEADER, baggage);
    } else if (baggage) {
      const existingBaggage = requestHeaders[existingBaggagePos + 1];
      const merged = mergeBaggageHeaders(existingBaggage, baggage);
      if (merged) {
        requestHeaders[existingBaggagePos + 1] = merged;
      }
    }
  } else {
    const requestHeaders = request.headers;
    // We do not want to overwrite existing header here, if it was already set
    if (sentryTrace && !requestHeaders.includes(`${SENTRY_TRACE_HEADER}:`)) {
      request.headers += `${SENTRY_TRACE_HEADER}: ${sentryTrace}\r\n`;
    }

    if (traceparent && !requestHeaders.includes('traceparent:')) {
      request.headers += `traceparent: ${traceparent}\r\n`;
    }

    const existingBaggage = request.headers.match(BAGGAGE_HEADER_REGEX)?.[1];
    if (baggage && !existingBaggage) {
      request.headers += `${SENTRY_BAGGAGE_HEADER}: ${baggage}\r\n`;
    } else if (baggage) {
      const merged = mergeBaggageHeaders(existingBaggage, baggage);
      if (merged) {
        request.headers = request.headers.replace(BAGGAGE_HEADER_REGEX, `baggage: ${merged}\r\n`);
      }
    }
  }
}

/** Add a breadcrumb for an outgoing fetch/undici request. */
function addFetchRequestBreadcrumb(request, response) {
  const data = getBreadcrumbData(request);

  const statusCode = response.statusCode;
  const level = getBreadcrumbLogLevelFromHttpStatusCode(statusCode);

  addBreadcrumb(
    {
      category: 'http',
      data: {
        status_code: statusCode,
        ...data,
      },
      type: 'http',
      level,
    },
    {
      event: 'response',
      request,
      response,
    },
  );
}

function getBreadcrumbData(request) {
  try {
    const url = getAbsoluteUrl(request.origin, request.path);
    const parsedUrl = parseUrl(url);

    const data = {
      url: getSanitizedUrlString(parsedUrl),
      'http.method': request.method || 'GET',
    };

    if (parsedUrl.search) {
      data['http.query'] = parsedUrl.search;
    }
    if (parsedUrl.hash) {
      data['http.fragment'] = parsedUrl.hash;
    }

    return data;
  } catch {
    return {};
  }
}

/** Get the absolute URL from an origin and path. */
function getAbsoluteUrl(origin, path = '/') {
  try {
    const url = new URL(path, origin);
    return url.toString();
  } catch {
    // fallback: Construct it on our own
    const url = `${origin}`;

    if (url.endsWith('/') && path.startsWith('/')) {
      return `${url}${path.slice(1)}`;
    }

    if (!url.endsWith('/') && !path.startsWith('/')) {
      return `${url}/${path}`;
    }

    return `${url}${path}`;
  }
}

export { addFetchRequestBreadcrumb, addTracePropagationHeadersToFetchRequest, getAbsoluteUrl };
//# sourceMappingURL=outgoingFetchRequest.js.map
