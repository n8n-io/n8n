Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const opentelemetry = require('@sentry/opentelemetry');
const debugBuild = require('../../debug-build.js');
const baggage = require('../../utils/baggage.js');
const constants = require('./constants.js');

/** Add a breadcrumb for outgoing requests. */
function addRequestBreadcrumb(request, response) {
  const data = getBreadcrumbData(request);

  const statusCode = response?.statusCode;
  const level = core.getBreadcrumbLogLevelFromHttpStatusCode(statusCode);

  core.addBreadcrumb(
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
  const url = getRequestUrl(request);

  // Manually add the trace headers, if it applies
  // Note: We do not use `propagation.inject()` here, because our propagator relies on an active span
  // Which we do not have in this case
  const { tracePropagationTargets, propagateTraceparent } = core.getClient()?.getOptions() || {};
  const headersToAdd = opentelemetry.shouldPropagateTraceForUrl(url, tracePropagationTargets, propagationDecisionMap)
    ? core.getTraceData({ propagateTraceparent })
    : undefined;

  if (!headersToAdd) {
    return;
  }

  const { 'sentry-trace': sentryTrace, baggage: baggage$1, traceparent } = headersToAdd;

  // We do not want to overwrite existing header here, if it was already set
  if (sentryTrace && !request.getHeader('sentry-trace')) {
    try {
      request.setHeader('sentry-trace', sentryTrace);
      debugBuild.DEBUG_BUILD && core.debug.log(constants.INSTRUMENTATION_NAME, 'Added sentry-trace header to outgoing request');
    } catch (error) {
      debugBuild.DEBUG_BUILD &&
        core.debug.error(
          constants.INSTRUMENTATION_NAME,
          'Failed to add sentry-trace header to outgoing request:',
          core.isError(error) ? error.message : 'Unknown error',
        );
    }
  }

  if (traceparent && !request.getHeader('traceparent')) {
    try {
      request.setHeader('traceparent', traceparent);
      debugBuild.DEBUG_BUILD && core.debug.log(constants.INSTRUMENTATION_NAME, 'Added traceparent header to outgoing request');
    } catch (error) {
      debugBuild.DEBUG_BUILD &&
        core.debug.error(
          constants.INSTRUMENTATION_NAME,
          'Failed to add traceparent header to outgoing request:',
          core.isError(error) ? error.message : 'Unknown error',
        );
    }
  }

  if (baggage$1) {
    // For baggage, we make sure to merge this into a possibly existing header
    const newBaggage = baggage.mergeBaggageHeaders(request.getHeader('baggage'), baggage$1);
    if (newBaggage) {
      try {
        request.setHeader('baggage', newBaggage);
        debugBuild.DEBUG_BUILD && core.debug.log(constants.INSTRUMENTATION_NAME, 'Added baggage header to outgoing request');
      } catch (error) {
        debugBuild.DEBUG_BUILD &&
          core.debug.error(
            constants.INSTRUMENTATION_NAME,
            'Failed to add baggage header to outgoing request:',
            core.isError(error) ? error.message : 'Unknown error',
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
    const parsedUrl = core.parseUrl(url.toString());

    const data = {
      url: core.getSanitizedUrlString(parsedUrl),
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

function getRequestUrl(request) {
  const hostname = request.getHeader('host') || request.host;
  const protocol = request.protocol;
  const path = request.path;

  return `${protocol}//${hostname}${path}`;
}

exports.addRequestBreadcrumb = addRequestBreadcrumb;
exports.addTracePropagationHeadersToOutgoingRequest = addTracePropagationHeadersToOutgoingRequest;
exports.getRequestOptions = getRequestOptions;
//# sourceMappingURL=outgoing-requests.js.map
