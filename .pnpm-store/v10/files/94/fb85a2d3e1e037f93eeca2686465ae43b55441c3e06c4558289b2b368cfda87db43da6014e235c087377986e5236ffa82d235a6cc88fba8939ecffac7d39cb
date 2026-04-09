Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const diagnosticsChannel = require('node:diagnostics_channel');
const api = require('@opentelemetry/api');
const core = require('@sentry/core');
const debugBuild = require('../../debug-build.js');
const captureRequestBody = require('../../utils/captureRequestBody.js');

const HTTP_SERVER_INSTRUMENTED_KEY = api.createContextKey('sentry_http_server_instrumented');
const INTEGRATION_NAME = 'Http.Server';

const clientToRequestSessionAggregatesMap = new Map

();

// We keep track of emit functions we wrapped, to avoid double wrapping
// We do this instead of putting a non-enumerable property on the function, because
// sometimes the property seems to be migrated to forks of the emit function, which we do not want to happen
// This was the case in the nestjs-distributed-tracing E2E test
const wrappedEmitFns = new WeakSet();

/**
 * Add a callback to the request object that will be called when the request is started.
 * The callback will receive the next function to continue processing the request.
 */
function addStartSpanCallback(request, callback) {
  core.addNonEnumerableProperty(request, '_startSpanCallback', new WeakRef(callback));
}

const _httpServerIntegration = ((options = {}) => {
  const _options = {
    sessions: options.sessions ?? true,
    sessionFlushingDelayMS: options.sessionFlushingDelayMS ?? 60000,
    maxRequestBodySize: options.maxRequestBodySize ?? 'medium',
    ignoreRequestBody: options.ignoreRequestBody,
  };

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const onHttpServerRequestStart = ((_data) => {
        const data = _data ;

        instrumentServer(data.server, _options);
      }) ;

      diagnosticsChannel.subscribe('http.server.request.start', onHttpServerRequestStart);
    },
    afterAllSetup(client) {
      if (debugBuild.DEBUG_BUILD && client.getIntegrationByName('Http')) {
        core.debug.warn(
          'It seems that you have manually added `httpServerIntegration` while `httpIntegration` is also present. Make sure to remove `httpServerIntegration` when adding `httpIntegration`.',
        );
      }
    },
  };
}) ;

/**
 * This integration handles request isolation, trace continuation and other core Sentry functionality around incoming http requests
 * handled via the node `http` module.
 *
 * This version uses OpenTelemetry for context propagation and span management.
 *
 * @see {@link ../../light/integrations/httpServerIntegration.ts} for the lightweight version without OpenTelemetry
 */
const httpServerIntegration = _httpServerIntegration

;

/**
 * Instrument a server to capture incoming requests.
 *
 */
function instrumentServer(
  server,
  {
    ignoreRequestBody,
    maxRequestBodySize,
    sessions,
    sessionFlushingDelayMS,
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
      // Only traces request events
      if (args[0] !== 'request') {
        return target.apply(thisArg, args);
      }

      const client = core.getClient();

      // Make sure we do not double execute our wrapper code, for edge cases...
      // Without this check, if we double-wrap emit, for whatever reason, you'd get two http.server spans (one the children of the other)
      if (api.context.active().getValue(HTTP_SERVER_INSTRUMENTED_KEY) || !client) {
        return target.apply(thisArg, args);
      }

      debugBuild.DEBUG_BUILD && core.debug.log(INTEGRATION_NAME, 'Handling incoming request');

      const isolationScope = core.getIsolationScope().clone();
      const request = args[1] ;
      const response = args[2] ;

      const normalizedRequest = core.httpRequestToRequestData(request);

      // request.ip is non-standard but some frameworks set this
      const ipAddress = (request ).ip || request.socket?.remoteAddress;

      const url = request.url || '/';
      if (maxRequestBodySize !== 'none' && !ignoreRequestBody?.(url, request)) {
        captureRequestBody.patchRequestToCaptureBody(request, isolationScope, maxRequestBodySize, INTEGRATION_NAME);
      }

      // Update the isolation scope, isolate this request
      isolationScope.setSDKProcessingMetadata({ normalizedRequest, ipAddress });

      // attempt to update the scope's `transactionName` based on the request URL
      // Ideally, framework instrumentations coming after the HttpInstrumentation
      // update the transactionName once we get a parameterized route.
      const httpMethod = (request.method || 'GET').toUpperCase();
      const httpTargetWithoutQueryFragment = core.stripUrlQueryAndFragment(url);

      const bestEffortTransactionName = `${httpMethod} ${httpTargetWithoutQueryFragment}`;

      isolationScope.setTransactionName(bestEffortTransactionName);

      if (sessions && client) {
        recordRequestSession(client, {
          requestIsolationScope: isolationScope,
          response,
          sessionFlushingDelayMS: sessionFlushingDelayMS ?? 60000,
        });
      }

      return core.withIsolationScope(isolationScope, () => {
        const newPropagationContext = {
          traceId: core.generateTraceId(),
          sampleRand: core._INTERNAL_safeMathRandom(),
          propagationSpanId: core.generateSpanId(),
        };
        // - Set a fresh propagation context so each request gets a unique traceId.
        //   When there are incoming trace headers, propagation.extract() below sets a remote
        //   span on the OTel context which takes precedence in getTraceContextForScope().
        // - We can write directly to the current scope here because it is forked implicitly via
        //   `context.with` in `withIsolationScope` (See `SentryContextManager`).
        // - explicitly making a deep copy to avoid mutation of original PC on the other scope
        core.getCurrentScope().setPropagationContext({ ...newPropagationContext });
        isolationScope.setPropagationContext({ ...newPropagationContext });

        const ctx = api.propagation
          .extract(api.context.active(), normalizedRequest.headers)
          .setValue(HTTP_SERVER_INSTRUMENTED_KEY, true);

        return api.context.with(ctx, () => {
          // This is used (optionally) by the httpServerSpansIntegration to attach _startSpanCallback to the request object
          client.emit('httpServerRequest', request, response, normalizedRequest);

          const callback = (request )._startSpanCallback?.deref();
          if (callback) {
            return callback(() => target.apply(thisArg, args));
          }
          return target.apply(thisArg, args);
        });
      });
    },
  });

  wrappedEmitFns.add(newEmit);
  server.emit = newEmit;
}

/**
 * Starts a session and tracks it in the context of a given isolation scope.
 * When the passed response is finished, the session is put into a task and is
 * aggregated with other sessions that may happen in a certain time window
 * (sessionFlushingDelayMs).
 *
 * The sessions are always aggregated by the client that is on the current scope
 * at the time of ending the response (if there is one).
 */
// Exported for unit tests
function recordRequestSession(
  client,
  {
    requestIsolationScope,
    response,
    sessionFlushingDelayMS,
  }

,
) {
  requestIsolationScope.setSDKProcessingMetadata({
    requestSession: { status: 'ok' },
  });
  response.once('close', () => {
    const requestSession = requestIsolationScope.getScopeData().sdkProcessingMetadata.requestSession;

    if (client && requestSession) {
      debugBuild.DEBUG_BUILD && core.debug.log(`Recorded request session with status: ${requestSession.status}`);

      const roundedDate = new Date();
      roundedDate.setSeconds(0, 0);
      const dateBucketKey = roundedDate.toISOString();

      const existingClientAggregate = clientToRequestSessionAggregatesMap.get(client);
      const bucket = existingClientAggregate?.[dateBucketKey] || { exited: 0, crashed: 0, errored: 0 };
      bucket[({ ok: 'exited', crashed: 'crashed', errored: 'errored' } )[requestSession.status]]++;

      if (existingClientAggregate) {
        existingClientAggregate[dateBucketKey] = bucket;
      } else {
        debugBuild.DEBUG_BUILD && core.debug.log('Opened new request session aggregate.');
        const newClientAggregate = { [dateBucketKey]: bucket };
        clientToRequestSessionAggregatesMap.set(client, newClientAggregate);

        const flushPendingClientAggregates = () => {
          clearTimeout(timeout);
          unregisterClientFlushHook();
          clientToRequestSessionAggregatesMap.delete(client);

          const aggregatePayload = Object.entries(newClientAggregate).map(
            ([timestamp, value]) => ({
              started: timestamp,
              exited: value.exited,
              errored: value.errored,
              crashed: value.crashed,
            }),
          );
          client.sendSession({ aggregates: aggregatePayload });
        };

        const unregisterClientFlushHook = client.on('flush', () => {
          debugBuild.DEBUG_BUILD && core.debug.log('Sending request session aggregate due to client flush');
          flushPendingClientAggregates();
        });
        const timeout = setTimeout(() => {
          debugBuild.DEBUG_BUILD && core.debug.log('Sending request session aggregate due to flushing schedule');
          flushPendingClientAggregates();
        }, sessionFlushingDelayMS).unref();
      }
    }
  });
}

exports.addStartSpanCallback = addStartSpanCallback;
exports.httpServerIntegration = httpServerIntegration;
exports.recordRequestSession = recordRequestSession;
//# sourceMappingURL=httpServerIntegration.js.map
