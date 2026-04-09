import { subscribe } from 'node:diagnostics_channel';
import { LRUMap, getCurrentScope, debug, getIsolationScope, httpRequestToRequestData, stripUrlQueryAndFragment, withIsolationScope, continueTrace, generateSpanId } from '@sentry/core';
import { DEBUG_BUILD } from '../../debug-build.js';
import { patchRequestToCaptureBody } from '../../utils/captureRequestBody.js';
import { addTracePropagationHeadersToOutgoingRequest, addRequestBreadcrumb, getClientRequestUrl, getRequestOptions } from '../../utils/outgoingHttpRequest.js';

const INTEGRATION_NAME = 'Http';

// We keep track of emit functions we wrapped, to avoid double wrapping
const wrappedEmitFns = new WeakSet();

const _httpIntegration = ((options = {}) => {
  const _options = {
    maxRequestBodySize: options.maxRequestBodySize ?? 'medium',
    ignoreRequestBody: options.ignoreRequestBody,
    breadcrumbs: options.breadcrumbs ?? true,
    tracePropagation: options.tracePropagation ?? true,
    ignoreOutgoingRequests: options.ignoreOutgoingRequests,
  };

  const propagationDecisionMap = new LRUMap(100);
  const ignoreOutgoingRequestsMap = new WeakMap();

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const onHttpServerRequestStart = ((_data) => {
        const data = _data ;
        instrumentServer(data.server, _options);
      }) ;

      const onHttpClientRequestCreated = ((_data) => {
        const data = _data ;
        onOutgoingRequestCreated(data.request, _options, propagationDecisionMap, ignoreOutgoingRequestsMap);
      }) ;

      const onHttpClientResponseFinish = ((_data) => {
        const data = _data ;
        onOutgoingRequestFinish(data.request, data.response, _options, ignoreOutgoingRequestsMap);
      }) ;

      const onHttpClientRequestError = ((_data) => {
        const data = _data ;
        onOutgoingRequestFinish(data.request, undefined, _options, ignoreOutgoingRequestsMap);
      }) ;

      subscribe('http.server.request.start', onHttpServerRequestStart);
      subscribe('http.client.request.created', onHttpClientRequestCreated);
      subscribe('http.client.response.finish', onHttpClientResponseFinish);
      subscribe('http.client.request.error', onHttpClientRequestError);
    },
  };
}) ;

/**
 * This integration handles incoming and outgoing HTTP requests in light mode (without OpenTelemetry).
 *
 * It uses Node's native diagnostics channels (Node.js 22+) for request isolation,
 * trace propagation, and breadcrumb creation.
 */
const httpIntegration = _httpIntegration

;

/**
 * Instrument a server to capture incoming requests.
 */
function instrumentServer(
  server,
  {
    ignoreRequestBody,
    maxRequestBodySize,
  }

,
) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalEmit = server.emit;

  if (wrappedEmitFns.has(originalEmit)) {
    return;
  }

  const newEmit = new Proxy(originalEmit, {
    apply(target, thisArg, args) {
      // Only handle request events
      if (args[0] !== 'request') {
        return target.apply(thisArg, args);
      }

      const client = getCurrentScope().getClient();

      if (!client) {
        return target.apply(thisArg, args);
      }

      DEBUG_BUILD && debug.log(INTEGRATION_NAME, 'Handling incoming request');

      const isolationScope = getIsolationScope().clone();
      const request = args[1] ;

      const normalizedRequest = httpRequestToRequestData(request);

      // request.ip is non-standard but some frameworks set this
      const ipAddress = (request ).ip || request.socket?.remoteAddress;

      const url = request.url || '/';
      if (maxRequestBodySize !== 'none' && !ignoreRequestBody?.(url, request)) {
        patchRequestToCaptureBody(request, isolationScope, maxRequestBodySize, INTEGRATION_NAME);
      }

      // Update the isolation scope, isolate this request
      isolationScope.setSDKProcessingMetadata({ normalizedRequest, ipAddress });

      // attempt to update the scope's `transactionName` based on the request URL
      // Ideally, framework instrumentations coming after the HttpInstrumentation
      // update the transactionName once we get a parameterized route.
      const httpMethod = (request.method || 'GET').toUpperCase();
      const httpTargetWithoutQueryFragment = stripUrlQueryAndFragment(url);

      const bestEffortTransactionName = `${httpMethod} ${httpTargetWithoutQueryFragment}`;

      isolationScope.setTransactionName(bestEffortTransactionName);

      return withIsolationScope(isolationScope, () => {
        // Handle trace propagation using Sentry's continueTrace
        // This replaces OpenTelemetry's propagation.extract() + context.with()
        const sentryTrace = normalizedRequest.headers?.['sentry-trace'];
        const baggage = normalizedRequest.headers?.['baggage'];

        return continueTrace(
          {
            sentryTrace: Array.isArray(sentryTrace) ? sentryTrace[0] : sentryTrace,
            baggage: Array.isArray(baggage) ? baggage[0] : baggage,
          },
          () => {
            // Set propagationSpanId after continueTrace because it calls withScope +
            // setPropagationContext internally, which would overwrite any previously set value.
            getCurrentScope().getPropagationContext().propagationSpanId = generateSpanId();
            return target.apply(thisArg, args);
          },
        );
      });
    },
  });

  wrappedEmitFns.add(newEmit);
  server.emit = newEmit;
}

function onOutgoingRequestCreated(
  request,
  options,
  propagationDecisionMap,
  ignoreOutgoingRequestsMap,
) {
  const shouldIgnore = shouldIgnoreOutgoingRequest(request, options);
  ignoreOutgoingRequestsMap.set(request, shouldIgnore);

  if (shouldIgnore) {
    return;
  }

  if (options.tracePropagation) {
    addTracePropagationHeadersToOutgoingRequest(request, propagationDecisionMap);
  }
}

function onOutgoingRequestFinish(
  request,
  response,
  options

,
  ignoreOutgoingRequestsMap,
) {
  if (!options.breadcrumbs) {
    return;
  }

  // Note: We cannot rely on the map being set by `onOutgoingRequestCreated`, because that channel
  // only exists since Node 22
  const shouldIgnore = ignoreOutgoingRequestsMap.get(request) ?? shouldIgnoreOutgoingRequest(request, options);

  if (shouldIgnore) {
    return;
  }

  addRequestBreadcrumb(request, response);
}

/** Check if the given outgoing request should be ignored. */
function shouldIgnoreOutgoingRequest(
  request,
  options,
) {
  // Check if tracing is suppressed (e.g. for Sentry's own transport requests)
  if (getCurrentScope().getScopeData().sdkProcessingMetadata.__SENTRY_SUPPRESS_TRACING__) {
    return true;
  }

  const { ignoreOutgoingRequests } = options;

  if (!ignoreOutgoingRequests) {
    return false;
  }

  const url = getClientRequestUrl(request);
  return ignoreOutgoingRequests(url, getRequestOptions(request));
}

export { httpIntegration };
//# sourceMappingURL=httpIntegration.js.map
