Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const api = require('@opentelemetry/api');
const instrumentationHttp = require('@opentelemetry/instrumentation-http');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Http';

const INSTRUMENTATION_NAME = '@opentelemetry_sentry-patched/instrumentation-http';

const instrumentSentryHttp = nodeCore.generateInstrumentOnce(
  `${INTEGRATION_NAME}.sentry`,
  options => {
    return new nodeCore.SentryHttpInstrumentation(options);
  },
);

const instrumentOtelHttp = nodeCore.generateInstrumentOnce(INTEGRATION_NAME, config => {
  const instrumentation = new instrumentationHttp.HttpInstrumentation({
    ...config,
    // This is hard-coded and can never be overridden by the user
    disableIncomingRequestInstrumentation: true,
  });

  // We want to update the logger namespace so we can better identify what is happening here
  try {
    instrumentation['_diag'] = api.diag.createComponentLogger({
      namespace: INSTRUMENTATION_NAME,
    });
    // @ts-expect-error We are writing a read-only property here...
    instrumentation.instrumentationName = INSTRUMENTATION_NAME;
  } catch {
    // ignore errors here...
  }

  return instrumentation;
});

/** Exported only for tests. */
function _shouldUseOtelHttpInstrumentation(
  options,
  clientOptions = {},
) {
  // If `spans` is passed in, it takes precedence
  // Else, we by default emit spans, unless `skipOpenTelemetrySetup` is set to `true` or spans are not enabled
  if (typeof options.spans === 'boolean') {
    return options.spans;
  }

  if (clientOptions.skipOpenTelemetrySetup) {
    return false;
  }

  // IMPORTANT: We only disable span instrumentation when spans are not enabled _and_ we are on Node 22+,
  // as otherwise the necessary diagnostics channel is not available yet
  if (!core.hasSpansEnabled(clientOptions) && nodeCore.NODE_VERSION.major >= 22) {
    return false;
  }

  return true;
}

/**
 * The http integration instruments Node's internal http and https modules.
 * It creates breadcrumbs and spans for outgoing HTTP requests which will be attached to the currently active span.
 */
const httpIntegration = core.defineIntegration((options = {}) => {
  const spans = options.spans ?? true;
  const disableIncomingRequestSpans = options.disableIncomingRequestSpans;

  const serverOptions = {
    sessions: options.trackIncomingRequestsAsSessions,
    sessionFlushingDelayMS: options.sessionFlushingDelayMS,
    ignoreRequestBody: options.ignoreIncomingRequestBody,
    maxRequestBodySize: options.maxIncomingRequestBodySize,
  } ;

  const serverSpansOptions = {
    ignoreIncomingRequests: options.ignoreIncomingRequests,
    ignoreStaticAssets: options.ignoreStaticAssets,
    ignoreStatusCodes: options.dropSpansForIncomingRequestStatusCodes,
    instrumentation: options.instrumentation,
    onSpanCreated: options.incomingRequestSpanHook,
  } ;

  const server = nodeCore.httpServerIntegration(serverOptions);
  const serverSpans = nodeCore.httpServerSpansIntegration(serverSpansOptions);

  const enableServerSpans = spans && !disableIncomingRequestSpans;

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const clientOptions = client.getOptions();

      if (enableServerSpans && core.hasSpansEnabled(clientOptions)) {
        serverSpans.setup(client);
      }
    },
    setupOnce() {
      const clientOptions = (core.getClient()?.getOptions() || {}) ;
      const useOtelHttpInstrumentation = _shouldUseOtelHttpInstrumentation(options, clientOptions);

      server.setupOnce();

      const sentryHttpInstrumentationOptions = {
        breadcrumbs: options.breadcrumbs,
        propagateTraceInOutgoingRequests: !useOtelHttpInstrumentation,
        ignoreOutgoingRequests: options.ignoreOutgoingRequests,
      } ;

      // This is Sentry-specific instrumentation for outgoing request breadcrumbs & trace propagation
      instrumentSentryHttp(sentryHttpInstrumentationOptions);

      // This is the "regular" OTEL instrumentation that emits outgoing request spans
      if (useOtelHttpInstrumentation) {
        const instrumentationConfig = getConfigWithDefaults(options);
        instrumentOtelHttp(instrumentationConfig);
      }
    },
    processEvent(event) {
      // Note: We always run this, even if spans are disabled
      // The reason being that e.g. the remix integration disables span creation here but still wants to use the ignore status codes option
      return serverSpans.processEvent(event);
    },
  };
});

function getConfigWithDefaults(options = {}) {
  const instrumentationConfig = {
    ignoreOutgoingRequestHook: request => {
      const url = nodeCore.getRequestUrl(request);

      if (!url) {
        return false;
      }

      const _ignoreOutgoingRequests = options.ignoreOutgoingRequests;
      if (_ignoreOutgoingRequests?.(url, request)) {
        return true;
      }

      return false;
    },

    requireParentforOutgoingSpans: false,
    requestHook: (span, req) => {
      nodeCore.addOriginToSpan(span, 'auto.http.otel.http');

      // Sanitize data URLs to prevent long base64 strings in span attributes
      const url = nodeCore.getRequestUrl(req );
      if (url.startsWith('data:')) {
        const sanitizedUrl = core.stripDataUrlContent(url);
        span.setAttribute('http.url', sanitizedUrl);
        span.setAttribute(core.SEMANTIC_ATTRIBUTE_URL_FULL, sanitizedUrl);
        span.updateName(`${(req ).method || 'GET'} ${sanitizedUrl}`);
      }

      options.instrumentation?.requestHook?.(span, req);
    },
    responseHook: (span, res) => {
      options.instrumentation?.responseHook?.(span, res);
    },
    applyCustomAttributesOnSpan: (
      span,
      request,
      response,
    ) => {
      options.instrumentation?.applyCustomAttributesOnSpan?.(span, request, response);
    },
  } ;

  return instrumentationConfig;
}

exports._shouldUseOtelHttpInstrumentation = _shouldUseOtelHttpInstrumentation;
exports.httpIntegration = httpIntegration;
exports.instrumentOtelHttp = instrumentOtelHttp;
exports.instrumentSentryHttp = instrumentSentryHttp;
//# sourceMappingURL=http.js.map
