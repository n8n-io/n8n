import { subscribe, unsubscribe } from 'node:diagnostics_channel';
import { errorMonitor } from 'node:events';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { ATTR_URL_FULL, ATTR_USER_AGENT_ORIGINAL, ATTR_NETWORK_PEER_ADDRESS, ATTR_NETWORK_PEER_PORT, SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH, SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED, ATTR_NETWORK_TRANSPORT, ATTR_NETWORK_PROTOCOL_VERSION, ATTR_HTTP_RESPONSE_STATUS_CODE } from '@opentelemetry/semantic-conventions';
import { SDK_VERSION, LRUMap, startInactiveSpan, debug, getSpanStatusFromHttpCode, getHttpSpanDetailsFromUrlObject, parseStringToURLObject, SEMANTIC_ATTRIBUTE_SENTRY_OP } from '@sentry/core';
import { DEBUG_BUILD } from '../../debug-build.js';
import { INSTRUMENTATION_NAME } from './constants.js';
import { addRequestBreadcrumb, addTracePropagationHeadersToOutgoingRequest, getRequestOptions, getClientRequestUrl } from '../../utils/outgoingHttpRequest.js';

/**
 * This custom HTTP instrumentation handles outgoing HTTP requests.
 *
 * It provides:
 * - Breadcrumbs for all outgoing requests
 * - Trace propagation headers (when enabled)
 * - Span creation for outgoing requests (when createSpansForOutgoingRequests is enabled)
 *
 * Span creation requires Node 22+ and uses diagnostic channels to avoid monkey-patching.
 * By default, this is only enabled in the node SDK, not in node-core or other runtime SDKs.
 *
 * Important note: Contrary to other OTEL instrumentation, this one cannot be unwrapped.
 *
 * This is heavily inspired & adapted from:
 * https://github.com/open-telemetry/opentelemetry-js/blob/f8ab5592ddea5cba0a3b33bf8d74f27872c0367f/experimental/packages/opentelemetry-instrumentation-http/src/http.ts
 */
class SentryHttpInstrumentation extends InstrumentationBase {

   constructor(config = {}) {
    super(INSTRUMENTATION_NAME, SDK_VERSION, config);

    this._propagationDecisionMap = new LRUMap(100);
    this._ignoreOutgoingRequestsMap = new WeakMap();
  }

  /** @inheritdoc */
   init() {
    // We register handlers when either http or https is instrumented
    // but we only want to register them once, whichever is loaded first
    let hasRegisteredHandlers = false;

    const onHttpClientResponseFinish = ((_data) => {
      const data = _data ;
      this._onOutgoingRequestFinish(data.request, data.response);
    }) ;

    const onHttpClientRequestError = ((_data) => {
      const data = _data ;
      this._onOutgoingRequestFinish(data.request, undefined);
    }) ;

    const onHttpClientRequestCreated = ((_data) => {
      const data = _data ;
      this._onOutgoingRequestCreated(data.request);
    }) ;

    const wrap = (moduleExports) => {
      if (hasRegisteredHandlers) {
        return moduleExports;
      }

      hasRegisteredHandlers = true;

      subscribe('http.client.response.finish', onHttpClientResponseFinish);

      // When an error happens, we still want to have a breadcrumb
      // In this case, `http.client.response.finish` is not triggered
      subscribe('http.client.request.error', onHttpClientRequestError);

      // NOTE: This channel only exists since Node 22.12+
      // Before that, outgoing requests are not patched
      // and trace headers are not propagated, sadly.
      if (this.getConfig().propagateTraceInOutgoingRequests || this.getConfig().createSpansForOutgoingRequests) {
        subscribe('http.client.request.created', onHttpClientRequestCreated);
      }
      return moduleExports;
    };

    const unwrap = () => {
      unsubscribe('http.client.response.finish', onHttpClientResponseFinish);
      unsubscribe('http.client.request.error', onHttpClientRequestError);
      unsubscribe('http.client.request.created', onHttpClientRequestCreated);
    };

    /**
     * You may be wondering why we register these diagnostics-channel listeners
     * in such a convoluted way (as InstrumentationNodeModuleDefinition...)˝,
     * instead of simply subscribing to the events once in here.
     * The reason for this is timing semantics: These functions are called once the http or https module is loaded.
     * If we'd subscribe before that, there seem to be conflicts with the OTEL native instrumentation in some scenarios,
     * especially the "import-on-top" pattern of setting up ESM applications.
     */
    return [
      new InstrumentationNodeModuleDefinition('http', ['*'], wrap, unwrap),
      new InstrumentationNodeModuleDefinition('https', ['*'], wrap, unwrap),
    ];
  }

  /**
   * Start a span for an outgoing request.
   * The span wraps the callback of the request, and ends when the response is finished.
   */
   _startSpanForOutgoingRequest(request) {
    // We monkey-patch `req.once('response'), which is used to trigger the callback of the request
    // eslint-disable-next-line @typescript-eslint/unbound-method, deprecation/deprecation
    const originalOnce = request.once;

    const [name, attributes] = _getOutgoingRequestSpanData(request);

    const span = startInactiveSpan({
      name,
      attributes,
      onlyIfParent: true,
    });

    this.getConfig().outgoingRequestHook?.(span, request);

    const newOnce = new Proxy(originalOnce, {
      apply(target, thisArg, args) {
        const [event] = args;
        if (event !== 'response') {
          return target.apply(thisArg, args);
        }

        const parentContext = context.active();
        const requestContext = trace.setSpan(parentContext, span);

        return context.with(requestContext, () => {
          return target.apply(thisArg, args);
        });
      },
    });

    // eslint-disable-next-line deprecation/deprecation
    request.once = newOnce;

    /**
     * Determines if the request has errored or the response has ended/errored.
     */
    let responseFinished = false;

    const endSpan = (status) => {
      if (responseFinished) {
        return;
      }
      responseFinished = true;

      span.setStatus(status);
      span.end();
    };

    request.prependListener('response', response => {
      if (request.listenerCount('response') <= 1) {
        response.resume();
      }

      context.bind(context.active(), response);

      const additionalAttributes = _getOutgoingRequestEndedSpanData(response);
      span.setAttributes(additionalAttributes);

      this.getConfig().outgoingResponseHook?.(span, response);
      this.getConfig().outgoingRequestApplyCustomAttributes?.(span, request, response);

      const endHandler = (forceError = false) => {
        this._diag.debug('outgoingRequest on end()');

        const status =
          // eslint-disable-next-line deprecation/deprecation
          forceError || typeof response.statusCode !== 'number' || (response.aborted && !response.complete)
            ? { code: SpanStatusCode.ERROR }
            : getSpanStatusFromHttpCode(response.statusCode);

        endSpan(status);
      };

      response.on('end', () => {
        endHandler();
      });
      response.on(errorMonitor, error => {
        this._diag.debug('outgoingRequest on response error()', error);
        endHandler(true);
      });
    });

    // Fallback if proper response end handling above fails
    request.on('close', () => {
      endSpan({ code: SpanStatusCode.UNSET });
    });
    request.on(errorMonitor, error => {
      this._diag.debug('outgoingRequest on request error()', error);
      endSpan({ code: SpanStatusCode.ERROR });
    });

    return span;
  }

  /**
   * This is triggered when an outgoing request finishes.
   * It has access to the final request and response objects.
   */
   _onOutgoingRequestFinish(request, response) {
    DEBUG_BUILD && debug.log(INSTRUMENTATION_NAME, 'Handling finished outgoing request');

    const _breadcrumbs = this.getConfig().breadcrumbs;
    const breadCrumbsEnabled = typeof _breadcrumbs === 'undefined' ? true : _breadcrumbs;

    // Note: We cannot rely on the map being set by `_onOutgoingRequestCreated`, because that is not run in Node <22
    const shouldIgnore = this._ignoreOutgoingRequestsMap.get(request) ?? this._shouldIgnoreOutgoingRequest(request);
    this._ignoreOutgoingRequestsMap.set(request, shouldIgnore);

    if (breadCrumbsEnabled && !shouldIgnore) {
      addRequestBreadcrumb(request, response);
    }
  }

  /**
   * This is triggered when an outgoing request is created.
   * It creates a span (if enabled) and propagates trace headers within the span's context,
   * so downstream services link to the outgoing HTTP span rather than its parent.
   */
   _onOutgoingRequestCreated(request) {
    DEBUG_BUILD && debug.log(INSTRUMENTATION_NAME, 'Handling outgoing request created');

    const shouldIgnore = this._ignoreOutgoingRequestsMap.get(request) ?? this._shouldIgnoreOutgoingRequest(request);
    this._ignoreOutgoingRequestsMap.set(request, shouldIgnore);

    if (shouldIgnore) {
      return;
    }

    const shouldCreateSpan = this.getConfig().createSpansForOutgoingRequests && (this.getConfig().spans ?? true);
    const shouldPropagate = this.getConfig().propagateTraceInOutgoingRequests;

    if (shouldCreateSpan) {
      const span = this._startSpanForOutgoingRequest(request);

      // Propagate headers within the span's context so the sentry-trace header
      // contains the outgoing span's ID, not the parent span's ID.
      // Only do this if the span is recording (has a parent) - otherwise the non-recording
      // span would produce all-zero trace IDs instead of using the scope's propagation context.
      if (shouldPropagate && span.isRecording()) {
        const requestContext = trace.setSpan(context.active(), span);
        context.with(requestContext, () => {
          addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
        });
      } else if (shouldPropagate) {
        addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
      }
    } else if (shouldPropagate) {
      addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
    }
  }

  /**
   * Check if the given outgoing request should be ignored.
   */
   _shouldIgnoreOutgoingRequest(request) {
    if (isTracingSuppressed(context.active())) {
      return true;
    }

    const ignoreOutgoingRequests = this.getConfig().ignoreOutgoingRequests;

    if (!ignoreOutgoingRequests) {
      return false;
    }

    const options = getRequestOptions(request);
    const url = getClientRequestUrl(request);
    return ignoreOutgoingRequests(url, options);
  }
}

function _getOutgoingRequestSpanData(request) {
  const url = getClientRequestUrl(request);

  const [name, attributes] = getHttpSpanDetailsFromUrlObject(
    parseStringToURLObject(url),
    'client',
    'auto.http.otel.http',
    request,
  );

  const userAgent = request.getHeader('user-agent');

  return [
    name,
    {
      [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.client',
      'otel.kind': 'CLIENT',
      [ATTR_USER_AGENT_ORIGINAL]: userAgent,
      [ATTR_URL_FULL]: url,
      'http.url': url,
      'http.method': request.method,
      'http.target': request.path || '/',
      'net.peer.name': request.host,
      'http.host': request.getHeader('host'),
      ...attributes,
    },
  ];
}

function _getOutgoingRequestEndedSpanData(response) {
  const { statusCode, statusMessage, httpVersion, socket } = response;

  const transport = httpVersion.toUpperCase() !== 'QUIC' ? 'ip_tcp' : 'ip_udp';

  const additionalAttributes = {
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: statusCode,
    [ATTR_NETWORK_PROTOCOL_VERSION]: httpVersion,
    'http.flavor': httpVersion,
    [ATTR_NETWORK_TRANSPORT]: transport,
    'net.transport': transport,
    ['http.status_text']: statusMessage?.toUpperCase(),
    'http.status_code': statusCode,
    ...getResponseContentLengthAttributes(response),
  };

  if (socket) {
    const { remoteAddress, remotePort } = socket;

    additionalAttributes[ATTR_NETWORK_PEER_ADDRESS] = remoteAddress;
    additionalAttributes[ATTR_NETWORK_PEER_PORT] = remotePort;
    additionalAttributes['net.peer.ip'] = remoteAddress;
    additionalAttributes['net.peer.port'] = remotePort;
  }

  return additionalAttributes;
}

function getResponseContentLengthAttributes(response) {
  const length = getContentLength(response.headers);
  if (length == null) {
    return {};
  }

  if (isCompressed(response.headers)) {
    // eslint-disable-next-line deprecation/deprecation
    return { [SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH]: length };
  } else {
    // eslint-disable-next-line deprecation/deprecation
    return { [SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED]: length };
  }
}

function getContentLength(headers) {
  const contentLengthHeader = headers['content-length'];
  if (typeof contentLengthHeader === 'number') {
    return contentLengthHeader;
  }
  if (typeof contentLengthHeader !== 'string') {
    return undefined;
  }

  const contentLength = parseInt(contentLengthHeader, 10);
  if (isNaN(contentLength)) {
    return undefined;
  }

  return contentLength;
}

function isCompressed(headers) {
  const encoding = headers['content-encoding'];

  return !!encoding && encoding !== 'identity';
}

export { SentryHttpInstrumentation };
//# sourceMappingURL=SentryHttpInstrumentation.js.map
