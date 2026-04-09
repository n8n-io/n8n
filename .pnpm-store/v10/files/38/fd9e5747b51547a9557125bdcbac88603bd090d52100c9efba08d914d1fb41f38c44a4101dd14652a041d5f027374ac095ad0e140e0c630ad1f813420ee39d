Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const diagnosticsChannel = require('node:diagnostics_channel');
const node_events = require('node:events');
const api = require('@opentelemetry/api');
const core$1 = require('@opentelemetry/core');
const instrumentation = require('@opentelemetry/instrumentation');
const semanticConventions = require('@opentelemetry/semantic-conventions');
const core = require('@sentry/core');
const debugBuild = require('../../debug-build.js');
const constants = require('./constants.js');
const outgoingHttpRequest = require('../../utils/outgoingHttpRequest.js');

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
class SentryHttpInstrumentation extends instrumentation.InstrumentationBase {

   constructor(config = {}) {
    super(constants.INSTRUMENTATION_NAME, core.SDK_VERSION, config);

    this._propagationDecisionMap = new core.LRUMap(100);
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

      diagnosticsChannel.subscribe('http.client.response.finish', onHttpClientResponseFinish);

      // When an error happens, we still want to have a breadcrumb
      // In this case, `http.client.response.finish` is not triggered
      diagnosticsChannel.subscribe('http.client.request.error', onHttpClientRequestError);

      // NOTE: This channel only exists since Node 22.12+
      // Before that, outgoing requests are not patched
      // and trace headers are not propagated, sadly.
      if (this.getConfig().propagateTraceInOutgoingRequests || this.getConfig().createSpansForOutgoingRequests) {
        diagnosticsChannel.subscribe('http.client.request.created', onHttpClientRequestCreated);
      }
      return moduleExports;
    };

    const unwrap = () => {
      diagnosticsChannel.unsubscribe('http.client.response.finish', onHttpClientResponseFinish);
      diagnosticsChannel.unsubscribe('http.client.request.error', onHttpClientRequestError);
      diagnosticsChannel.unsubscribe('http.client.request.created', onHttpClientRequestCreated);
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
      new instrumentation.InstrumentationNodeModuleDefinition('http', ['*'], wrap, unwrap),
      new instrumentation.InstrumentationNodeModuleDefinition('https', ['*'], wrap, unwrap),
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

    const span = core.startInactiveSpan({
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

        const parentContext = api.context.active();
        const requestContext = api.trace.setSpan(parentContext, span);

        return api.context.with(requestContext, () => {
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

      api.context.bind(api.context.active(), response);

      const additionalAttributes = _getOutgoingRequestEndedSpanData(response);
      span.setAttributes(additionalAttributes);

      this.getConfig().outgoingResponseHook?.(span, response);
      this.getConfig().outgoingRequestApplyCustomAttributes?.(span, request, response);

      const endHandler = (forceError = false) => {
        this._diag.debug('outgoingRequest on end()');

        const status =
          // eslint-disable-next-line deprecation/deprecation
          forceError || typeof response.statusCode !== 'number' || (response.aborted && !response.complete)
            ? { code: api.SpanStatusCode.ERROR }
            : core.getSpanStatusFromHttpCode(response.statusCode);

        endSpan(status);
      };

      response.on('end', () => {
        endHandler();
      });
      response.on(node_events.errorMonitor, error => {
        this._diag.debug('outgoingRequest on response error()', error);
        endHandler(true);
      });
    });

    // Fallback if proper response end handling above fails
    request.on('close', () => {
      endSpan({ code: api.SpanStatusCode.UNSET });
    });
    request.on(node_events.errorMonitor, error => {
      this._diag.debug('outgoingRequest on request error()', error);
      endSpan({ code: api.SpanStatusCode.ERROR });
    });

    return span;
  }

  /**
   * This is triggered when an outgoing request finishes.
   * It has access to the final request and response objects.
   */
   _onOutgoingRequestFinish(request, response) {
    debugBuild.DEBUG_BUILD && core.debug.log(constants.INSTRUMENTATION_NAME, 'Handling finished outgoing request');

    const _breadcrumbs = this.getConfig().breadcrumbs;
    const breadCrumbsEnabled = typeof _breadcrumbs === 'undefined' ? true : _breadcrumbs;

    // Note: We cannot rely on the map being set by `_onOutgoingRequestCreated`, because that is not run in Node <22
    const shouldIgnore = this._ignoreOutgoingRequestsMap.get(request) ?? this._shouldIgnoreOutgoingRequest(request);
    this._ignoreOutgoingRequestsMap.set(request, shouldIgnore);

    if (breadCrumbsEnabled && !shouldIgnore) {
      outgoingHttpRequest.addRequestBreadcrumb(request, response);
    }
  }

  /**
   * This is triggered when an outgoing request is created.
   * It creates a span (if enabled) and propagates trace headers within the span's context,
   * so downstream services link to the outgoing HTTP span rather than its parent.
   */
   _onOutgoingRequestCreated(request) {
    debugBuild.DEBUG_BUILD && core.debug.log(constants.INSTRUMENTATION_NAME, 'Handling outgoing request created');

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
        const requestContext = api.trace.setSpan(api.context.active(), span);
        api.context.with(requestContext, () => {
          outgoingHttpRequest.addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
        });
      } else if (shouldPropagate) {
        outgoingHttpRequest.addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
      }
    } else if (shouldPropagate) {
      outgoingHttpRequest.addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
    }
  }

  /**
   * Check if the given outgoing request should be ignored.
   */
   _shouldIgnoreOutgoingRequest(request) {
    if (core$1.isTracingSuppressed(api.context.active())) {
      return true;
    }

    const ignoreOutgoingRequests = this.getConfig().ignoreOutgoingRequests;

    if (!ignoreOutgoingRequests) {
      return false;
    }

    const options = outgoingHttpRequest.getRequestOptions(request);
    const url = outgoingHttpRequest.getClientRequestUrl(request);
    return ignoreOutgoingRequests(url, options);
  }
}

function _getOutgoingRequestSpanData(request) {
  const url = outgoingHttpRequest.getClientRequestUrl(request);

  const [name, attributes] = core.getHttpSpanDetailsFromUrlObject(
    core.parseStringToURLObject(url),
    'client',
    'auto.http.otel.http',
    request,
  );

  const userAgent = request.getHeader('user-agent');

  return [
    name,
    {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.client',
      'otel.kind': 'CLIENT',
      [semanticConventions.ATTR_USER_AGENT_ORIGINAL]: userAgent,
      [semanticConventions.ATTR_URL_FULL]: url,
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
    [semanticConventions.ATTR_HTTP_RESPONSE_STATUS_CODE]: statusCode,
    [semanticConventions.ATTR_NETWORK_PROTOCOL_VERSION]: httpVersion,
    'http.flavor': httpVersion,
    [semanticConventions.ATTR_NETWORK_TRANSPORT]: transport,
    'net.transport': transport,
    ['http.status_text']: statusMessage?.toUpperCase(),
    'http.status_code': statusCode,
    ...getResponseContentLengthAttributes(response),
  };

  if (socket) {
    const { remoteAddress, remotePort } = socket;

    additionalAttributes[semanticConventions.ATTR_NETWORK_PEER_ADDRESS] = remoteAddress;
    additionalAttributes[semanticConventions.ATTR_NETWORK_PEER_PORT] = remotePort;
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
    return { [semanticConventions.SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH]: length };
  } else {
    // eslint-disable-next-line deprecation/deprecation
    return { [semanticConventions.SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED]: length };
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

exports.SentryHttpInstrumentation = SentryHttpInstrumentation;
//# sourceMappingURL=SentryHttpInstrumentation.js.map
