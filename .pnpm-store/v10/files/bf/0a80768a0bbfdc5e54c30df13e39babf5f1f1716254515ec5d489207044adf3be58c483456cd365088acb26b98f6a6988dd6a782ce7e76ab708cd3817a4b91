import { getBreadcrumbLogLevelFromHttpStatusCode, addBreadcrumb, getClient, shouldPropagateTraceForUrl, getTraceData, debug, isError, parseUrl, getSanitizedUrlString } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { mergeBaggageHeaders } from './baggage.js';

const LOG_PREFIX = '@sentry/instrumentation-http';

/** Add a breadcrumb for outgoing requests. */
function addRequestBreadcrumb(request, response) {
  const data = getBreadcrumbData(request);

  const statusCode = response?.statusCode;
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

/**
 * Add trace propagation headers to an outgoing request.
 * This must be called _before_ the request is sent!
 */
// eslint-disable-next-line complexity
function addTracePropagationHeadersToOutgoingRequest(
  request,
  propagationDecisionMap,
) {
  const url = getClientRequestUrl(request);

  const { tracePropagationTargets, propagateTraceparent } = getClient()?.getOptions() || {};
  const headersToAdd = shouldPropagateTraceForUrl(url, tracePropagationTargets, propagationDecisionMap)
    ? getTraceData({ propagateTraceparent })
    : undefined;

  if (!headersToAdd) {
    return;
  }

  const { 'sentry-trace': sentryTrace, baggage, traceparent } = headersToAdd;

  if (sentryTrace && !request.getHeader('sentry-trace')) {
    try {
      request.setHeader('sentry-trace', sentryTrace);
      DEBUG_BUILD && debug.log(LOG_PREFIX, 'Added sentry-trace header to outgoing request');
    } catch (error) {
      DEBUG_BUILD &&
        debug.error(
          LOG_PREFIX,
          'Failed to add sentry-trace header to outgoing request:',
          isError(error) ? error.message : 'Unknown error',
        );
    }
  }

  if (traceparent && !request.getHeader('traceparent')) {
    try {
      request.setHeader('traceparent', traceparent);
      DEBUG_BUILD && debug.log(LOG_PREFIX, 'Added traceparent header to outgoing request');
    } catch (error) {
      DEBUG_BUILD &&
        debug.error(
          LOG_PREFIX,
          'Failed to add traceparent header to outgoing request:',
          isError(error) ? error.message : 'Unknown error',
        );
    }
  }

  if (baggage) {
    const newBaggage = mergeBaggageHeaders(request.getHeader('baggage'), baggage);
    if (newBaggage) {
      try {
        request.setHeader('baggage', newBaggage);
        DEBUG_BUILD && debug.log(LOG_PREFIX, 'Added baggage header to outgoing request');
      } catch (error) {
        DEBUG_BUILD &&
          debug.error(
            LOG_PREFIX,
            'Failed to add baggage header to outgoing request:',
            isError(error) ? error.message : 'Unknown error',
          );
      }
    }
  }
}

function getBreadcrumbData(request) {
  try {
    // `request.host` does not contain the port, but the host header does
    const host = request.getHeader('host') || request.host;
    const url = new URL(request.path, `${request.protocol}//${host}`);
    const parsedUrl = parseUrl(url.toString());

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

/** Convert an outgoing request to request options. */
function getRequestOptions(request) {
  return {
    method: request.method,
    protocol: request.protocol,
    host: request.host,
    hostname: request.host,
    path: request.path,
    headers: request.getHeaders(),
  };
}

/**
 *
 */
function getClientRequestUrl(request) {
  const hostname = request.getHeader('host') || request.host;
  const protocol = request.protocol;
  const path = request.path;

  return `${protocol}//${hostname}${path}`;
}

export { addRequestBreadcrumb, addTracePropagationHeadersToOutgoingRequest, getClientRequestUrl, getRequestOptions };
//# sourceMappingURL=outgoingHttpRequest.js.map
