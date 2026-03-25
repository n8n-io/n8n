Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const instrument = require('../../otel/instrument.js');
const httpServerIntegration = require('./httpServerIntegration.js');
const httpServerSpansIntegration = require('./httpServerSpansIntegration.js');
const SentryHttpInstrumentation = require('./SentryHttpInstrumentation.js');

const INTEGRATION_NAME = 'Http';

const instrumentSentryHttp = instrument.generateInstrumentOnce(
  `${INTEGRATION_NAME}.sentry`,
  options => {
    return new SentryHttpInstrumentation.SentryHttpInstrumentation(options);
  },
);

/**
 * The http integration instruments Node's internal http and https modules.
 * It creates breadcrumbs for outgoing HTTP requests which will be attached to the currently active span.
 */
const httpIntegration = core.defineIntegration((options = {}) => {
  const serverOptions = {
    sessions: options.trackIncomingRequestsAsSessions,
    sessionFlushingDelayMS: options.sessionFlushingDelayMS,
    ignoreRequestBody: options.ignoreIncomingRequestBody,
    maxRequestBodySize: options.maxIncomingRequestBodySize,
  };

  const serverSpansOptions = {
    ignoreIncomingRequests: options.ignoreIncomingRequests,
    ignoreStaticAssets: options.ignoreStaticAssets,
    ignoreStatusCodes: options.dropSpansForIncomingRequestStatusCodes,
  };

  const httpInstrumentationOptions = {
    breadcrumbs: options.breadcrumbs,
    propagateTraceInOutgoingRequests: true,
    ignoreOutgoingRequests: options.ignoreOutgoingRequests,
  };

  const server = httpServerIntegration.httpServerIntegration(serverOptions);
  const serverSpans = httpServerSpansIntegration.httpServerSpansIntegration(serverSpansOptions);

  // In node-core, for now we disable incoming requests spans by default
  // we may revisit this in a future release
  const spans = options.spans ?? false;
  const disableIncomingRequestSpans = options.disableIncomingRequestSpans ?? false;
  const enabledServerSpans = spans && !disableIncomingRequestSpans;

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      if (enabledServerSpans) {
        serverSpans.setup(client);
      }
    },
    setupOnce() {
      server.setupOnce();

      instrumentSentryHttp(httpInstrumentationOptions);
    },

    processEvent(event) {
      // Note: We always run this, even if spans are disabled
      // The reason being that e.g. the remix integration disables span creation here but still wants to use the ignore status codes option
      return serverSpans.processEvent(event);
    },
  };
});

exports.httpIntegration = httpIntegration;
exports.instrumentSentryHttp = instrumentSentryHttp;
//# sourceMappingURL=index.js.map
