Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const node_events = require('node:events');
const api = require('@opentelemetry/api');
const core$1 = require('@opentelemetry/core');
const semanticConventions = require('@opentelemetry/semantic-conventions');
const core = require('@sentry/core');
const debugBuild = require('../../debug-build.js');
const httpServerIntegration = require('./httpServerIntegration.js');

const INTEGRATION_NAME = 'Http.ServerSpans';

// Tree-shakable guard to remove all code related to tracing

const _httpServerSpansIntegration = ((options = {}) => {
  const ignoreStaticAssets = options.ignoreStaticAssets ?? true;
  const ignoreIncomingRequests = options.ignoreIncomingRequests;
  const ignoreStatusCodes = options.ignoreStatusCodes ?? [
    [401, 404],
    // 300 and 304 are possibly valid status codes we do not want to filter
    [301, 303],
    [305, 399],
  ];

  const { onSpanCreated } = options;
  // eslint-disable-next-line deprecation/deprecation
  const { requestHook, responseHook, applyCustomAttributesOnSpan } = options.instrumentation ?? {};

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      // If no tracing, we can just skip everything here
      if (typeof __SENTRY_TRACING__ !== 'undefined' && !__SENTRY_TRACING__) {
        return;
      }

      client.on('httpServerRequest', (_request, _response, normalizedRequest) => {
        // Type-casting this here because we do not want to put the node types into core
        const request = _request ;
        const response = _response ;

        const startSpan = (next) => {
          if (
            shouldIgnoreSpansForIncomingRequest(request, {
              ignoreStaticAssets,
              ignoreIncomingRequests,
            })
          ) {
            debugBuild.DEBUG_BUILD && core.debug.log(INTEGRATION_NAME, 'Skipping span creation for incoming request', request.url);
            return next();
          }

          const fullUrl = normalizedRequest.url || request.url || '/';
          const urlObj = core.parseStringToURLObject(fullUrl);

          const headers = request.headers;
          const userAgent = headers['user-agent'];
          const ips = headers['x-forwarded-for'];
          const httpVersion = request.httpVersion;
          const host = headers.host;
          const hostname = host?.replace(/^(.*)(:[0-9]{1,5})/, '$1') || 'localhost';

          const tracer = client.tracer;
          const scheme = fullUrl.startsWith('https') ? 'https' : 'http';

          const method = normalizedRequest.method || request.method?.toUpperCase() || 'GET';
          const httpTargetWithoutQueryFragment = urlObj ? urlObj.pathname : core.stripUrlQueryAndFragment(fullUrl);
          const bestEffortTransactionName = `${method} ${httpTargetWithoutQueryFragment}`;

          // We use the plain tracer.startSpan here so we can pass the span kind
          const span = tracer.startSpan(bestEffortTransactionName, {
            kind: api.SpanKind.SERVER,
            attributes: {
              // Sentry specific attributes
              [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.server',
              [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.otel.http',
              'sentry.http.prefetch': isKnownPrefetchRequest(request) || undefined,
              // Old Semantic Conventions attributes - added for compatibility with what `@opentelemetry/instrumentation-http` output before
              'http.url': fullUrl,
              'http.method': normalizedRequest.method,
              'http.target': urlObj ? `${urlObj.pathname}${urlObj.search}` : httpTargetWithoutQueryFragment,
              'http.host': host,
              'net.host.name': hostname,
              'http.client_ip': typeof ips === 'string' ? ips.split(',')[0] : undefined,
              'http.user_agent': userAgent,
              'http.scheme': scheme,
              'http.flavor': httpVersion,
              'net.transport': httpVersion?.toUpperCase() === 'QUIC' ? 'ip_udp' : 'ip_tcp',
              ...getRequestContentLengthAttribute(request),
              ...core.httpHeadersToSpanAttributes(
                normalizedRequest.headers || {},
                client.getOptions().sendDefaultPii ?? false,
              ),
            },
          });

          // TODO v11: Remove the following three hooks, only onSpanCreated should remain
          requestHook?.(span, request);
          responseHook?.(span, response);
          applyCustomAttributesOnSpan?.(span, request, response);
          onSpanCreated?.(span, request, response);

          const rpcMetadata = {
            type: core$1.RPCType.HTTP,
            span,
          };

          return api.context.with(core$1.setRPCMetadata(api.trace.setSpan(api.context.active(), span), rpcMetadata), () => {
            api.context.bind(api.context.active(), request);
            api.context.bind(api.context.active(), response);

            // Ensure we only end the span once
            // E.g. error can be emitted before close is emitted
            let isEnded = false;
            function endSpan(status) {
              if (isEnded) {
                return;
              }

              isEnded = true;

              const newAttributes = getIncomingRequestAttributesOnResponse(request, response);
              span.setAttributes(newAttributes);
              span.setStatus(status);
              span.end();

              // Update the transaction name if the route has changed
              const route = newAttributes['http.route'];
              if (route) {
                core.getIsolationScope().setTransactionName(`${request.method?.toUpperCase() || 'GET'} ${route}`);
              }
            }

            response.on('close', () => {
              endSpan(core.getSpanStatusFromHttpCode(response.statusCode));
            });
            response.on(node_events.errorMonitor, () => {
              const httpStatus = core.getSpanStatusFromHttpCode(response.statusCode);
              // Ensure we def. have an error status here
              endSpan(httpStatus.code === core.SPAN_STATUS_ERROR ? httpStatus : { code: core.SPAN_STATUS_ERROR });
            });

            return next();
          });
        };

        httpServerIntegration.addStartSpanCallback(request, startSpan);
      });
    },
    processEvent(event) {
      // Drop transaction if it has a status code that should be ignored
      if (event.type === 'transaction') {
        const statusCode = event.contexts?.trace?.data?.['http.response.status_code'];
        if (typeof statusCode === 'number') {
          const shouldDrop = shouldFilterStatusCode(statusCode, ignoreStatusCodes);
          if (shouldDrop) {
            debugBuild.DEBUG_BUILD && core.debug.log('Dropping transaction due to status code', statusCode);
            return null;
          }
        }
      }

      return event;
    },
    afterAllSetup(client) {
      if (!debugBuild.DEBUG_BUILD) {
        return;
      }

      if (client.getIntegrationByName('Http')) {
        core.debug.warn(
          'It seems that you have manually added `httpServerSpansIntergation` while `httpIntegration` is also present. Make sure to remove `httpIntegration` when adding `httpServerSpansIntegration`.',
        );
      }

      if (!client.getIntegrationByName('Http.Server')) {
        core.debug.error(
          'It seems that you have manually added `httpServerSpansIntergation` without adding `httpServerIntegration`. This is a requiement for spans to be created - please add the `httpServerIntegration` integration.',
        );
      }
    },
  };
}) ;

/**
 * This integration emits spans for incoming requests handled via the node `http` module.
 * It requires the `httpServerIntegration` to be present.
 */
const httpServerSpansIntegration = _httpServerSpansIntegration

;

function isKnownPrefetchRequest(req) {
  // Currently only handles Next.js prefetch requests but may check other frameworks in the future.
  return req.headers['next-router-prefetch'] === '1';
}

/**
 * Check if a request is for a common static asset that should be ignored by default.
 *
 * Only exported for tests.
 */
function isStaticAssetRequest(urlPath) {
  const path = core.stripUrlQueryAndFragment(urlPath);
  // Common static file extensions
  if (path.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|webp|avif)$/)) {
    return true;
  }

  // Common metadata files
  if (path.match(/^\/(robots\.txt|sitemap\.xml|manifest\.json|browserconfig\.xml)$/)) {
    return true;
  }

  return false;
}

function shouldIgnoreSpansForIncomingRequest(
  request,
  {
    ignoreStaticAssets,
    ignoreIncomingRequests,
  }

,
) {
  if (core$1.isTracingSuppressed(api.context.active())) {
    return true;
  }

  // request.url is the only property that holds any information about the url
  // it only consists of the URL path and query string (if any)
  const urlPath = request.url;

  const method = request.method?.toUpperCase();
  // We do not capture OPTIONS/HEAD requests as spans
  if (method === 'OPTIONS' || method === 'HEAD' || !urlPath) {
    return true;
  }

  // Default static asset filtering
  if (ignoreStaticAssets && method === 'GET' && isStaticAssetRequest(urlPath)) {
    return true;
  }

  if (ignoreIncomingRequests?.(urlPath, request)) {
    return true;
  }

  return false;
}

function getRequestContentLengthAttribute(request) {
  const length = getContentLength(request.headers);
  if (length == null) {
    return {};
  }

  if (isCompressed(request.headers)) {
    return {
      ['http.request_content_length']: length,
    };
  } else {
    return {
      ['http.request_content_length_uncompressed']: length,
    };
  }
}

function getContentLength(headers) {
  const contentLengthHeader = headers['content-length'];
  if (contentLengthHeader === undefined) return null;

  const contentLength = parseInt(contentLengthHeader, 10);
  if (isNaN(contentLength)) return null;

  return contentLength;
}

function isCompressed(headers) {
  const encoding = headers['content-encoding'];

  return !!encoding && encoding !== 'identity';
}

function getIncomingRequestAttributesOnResponse(request, response) {
  // take socket from the request,
  // since it may be detached from the response object in keep-alive mode
  const { socket } = request;
  const { statusCode, statusMessage } = response;

  const newAttributes = {
    [semanticConventions.ATTR_HTTP_RESPONSE_STATUS_CODE]: statusCode,
    // eslint-disable-next-line deprecation/deprecation
    [semanticConventions.SEMATTRS_HTTP_STATUS_CODE]: statusCode,
    'http.status_text': statusMessage?.toUpperCase(),
  };

  const rpcMetadata = core$1.getRPCMetadata(api.context.active());
  if (socket) {
    const { localAddress, localPort, remoteAddress, remotePort } = socket;
    // eslint-disable-next-line deprecation/deprecation
    newAttributes[semanticConventions.SEMATTRS_NET_HOST_IP] = localAddress;
    // eslint-disable-next-line deprecation/deprecation
    newAttributes[semanticConventions.SEMATTRS_NET_HOST_PORT] = localPort;
    // eslint-disable-next-line deprecation/deprecation
    newAttributes[semanticConventions.SEMATTRS_NET_PEER_IP] = remoteAddress;
    newAttributes['net.peer.port'] = remotePort;
  }
  // eslint-disable-next-line deprecation/deprecation
  newAttributes[semanticConventions.SEMATTRS_HTTP_STATUS_CODE] = statusCode;
  newAttributes['http.status_text'] = (statusMessage || '').toUpperCase();

  if (rpcMetadata?.type === core$1.RPCType.HTTP && rpcMetadata.route !== undefined) {
    const routeName = rpcMetadata.route;
    newAttributes[semanticConventions.ATTR_HTTP_ROUTE] = routeName;
  }

  return newAttributes;
}

/**
 * If the given status code should be filtered for the given list of status codes/ranges.
 */
function shouldFilterStatusCode(statusCode, dropForStatusCodes) {
  return dropForStatusCodes.some(code => {
    if (typeof code === 'number') {
      return code === statusCode;
    }

    const [min, max] = code;
    return statusCode >= min && statusCode <= max;
  });
}

exports.httpServerSpansIntegration = httpServerSpansIntegration;
exports.isStaticAssetRequest = isStaticAssetRequest;
//# sourceMappingURL=httpServerSpansIntegration.js.map
