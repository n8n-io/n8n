import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { defineIntegration, stripDataUrlContent, SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME, SEMANTIC_ATTRIBUTE_URL_FULL, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, getClient, hasSpansEnabled } from '@sentry/core';
import { generateInstrumentOnce, SentryNodeFetchInstrumentation } from '@sentry/node-core';

const INTEGRATION_NAME = 'NodeFetch';

const instrumentOtelNodeFetch = generateInstrumentOnce(
  INTEGRATION_NAME,
  UndiciInstrumentation,
  (options) => {
    return getConfigWithDefaults(options);
  },
);

const instrumentSentryNodeFetch = generateInstrumentOnce(
  `${INTEGRATION_NAME}.sentry`,
  SentryNodeFetchInstrumentation,
  (options) => {
    return options;
  },
);

const _nativeNodeFetchIntegration = ((options = {}) => {
  return {
    name: 'NodeFetch',
    setupOnce() {
      const instrumentSpans = _shouldInstrumentSpans(options, getClient()?.getOptions());

      // This is the "regular" OTEL instrumentation that emits spans
      if (instrumentSpans) {
        instrumentOtelNodeFetch(options);
      }

      // This is the Sentry-specific instrumentation that creates breadcrumbs & propagates traces
      // This must be registered after the OTEL one, to ensure that the core trace propagation logic takes presedence
      // Otherwise, the sentry-trace header may be set multiple times
      instrumentSentryNodeFetch(options);
    },
  };
}) ;

const nativeNodeFetchIntegration = defineIntegration(_nativeNodeFetchIntegration);

// Matching the behavior of the base instrumentation
function getAbsoluteUrl(origin, path = '/') {
  const url = `${origin}`;

  if (url.endsWith('/') && path.startsWith('/')) {
    return `${url}${path.slice(1)}`;
  }

  if (!url.endsWith('/') && !path.startsWith('/')) {
    return `${url}/${path.slice(1)}`;
  }

  return `${url}${path}`;
}

function _shouldInstrumentSpans(options, clientOptions = {}) {
  // If `spans` is passed in, it takes precedence
  // Else, we by default emit spans, unless `skipOpenTelemetrySetup` is set to `true` or spans are not enabled
  return typeof options.spans === 'boolean'
    ? options.spans
    : !clientOptions.skipOpenTelemetrySetup && hasSpansEnabled(clientOptions);
}

function getConfigWithDefaults(options = {}) {
  const instrumentationConfig = {
    requireParentforSpans: false,
    ignoreRequestHook: request => {
      const url = getAbsoluteUrl(request.origin, request.path);
      const _ignoreOutgoingRequests = options.ignoreOutgoingRequests;
      const shouldIgnore = _ignoreOutgoingRequests && url && _ignoreOutgoingRequests(url);

      return !!shouldIgnore;
    },
    startSpanHook: request => {
      const url = getAbsoluteUrl(request.origin, request.path);

      // Sanitize data URLs to prevent long base64 strings in span attributes
      if (url.startsWith('data:')) {
        const sanitizedUrl = stripDataUrlContent(url);
        return {
          [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.otel.node_fetch',
          'http.url': sanitizedUrl,
          [SEMANTIC_ATTRIBUTE_URL_FULL]: sanitizedUrl,
          [SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME]: `${request.method || 'GET'} ${sanitizedUrl}`,
        };
      }

      return {
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.otel.node_fetch',
      };
    },
    requestHook: options.requestHook,
    responseHook: options.responseHook,
  } ;

  return instrumentationConfig;
}

export { nativeNodeFetchIntegration };
//# sourceMappingURL=node-fetch.js.map
