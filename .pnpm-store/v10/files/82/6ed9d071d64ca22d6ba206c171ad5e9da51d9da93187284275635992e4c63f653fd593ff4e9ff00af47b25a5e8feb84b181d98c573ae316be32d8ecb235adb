Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const diagnosticsChannel = require('node:diagnostics_channel');
const api = require('@opentelemetry/api');
const core$1 = require('@opentelemetry/core');
const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');
const debugBuild = require('../../debug-build.js');
const getRequestUrl = require('../../utils/getRequestUrl.js');
const constants = require('./constants.js');
const outgoingRequests = require('./outgoing-requests.js');

/**
 * This custom HTTP instrumentation is used to isolate incoming requests and annotate them with additional information.
 * It does not emit any spans.
 *
 * The reason this is isolated from the OpenTelemetry instrumentation is that users may overwrite this,
 * which would lead to Sentry not working as expected.
 *
 * Important note: Contrary to other OTEL instrumentation, this one cannot be unwrapped.
 * It only does minimal things though and does not emit any spans.
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

      // NOTE: This channel only exist since Node 22
      // Before that, outgoing requests are not patched
      // and trace headers are not propagated, sadly.
      if (this.getConfig().propagateTraceInOutgoingRequests) {
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
      outgoingRequests.addRequestBreadcrumb(request, response);
    }
  }

  /**
   * This is triggered when an outgoing request is created.
   * It has access to the request object, and can mutate it before the request is sent.
   */
   _onOutgoingRequestCreated(request) {
    const shouldIgnore = this._ignoreOutgoingRequestsMap.get(request) ?? this._shouldIgnoreOutgoingRequest(request);
    this._ignoreOutgoingRequestsMap.set(request, shouldIgnore);

    if (shouldIgnore) {
      return;
    }

    outgoingRequests.addTracePropagationHeadersToOutgoingRequest(request, this._propagationDecisionMap);
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

    const options = outgoingRequests.getRequestOptions(request);
    const url = getRequestUrl.getRequestUrl(request);
    return ignoreOutgoingRequests(url, options);
  }
}

exports.SentryHttpInstrumentation = SentryHttpInstrumentation;
//# sourceMappingURL=SentryHttpInstrumentation.js.map
