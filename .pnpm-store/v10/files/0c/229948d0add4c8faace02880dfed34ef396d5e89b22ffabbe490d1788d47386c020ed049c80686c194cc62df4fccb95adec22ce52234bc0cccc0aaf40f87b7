import { subscribe } from 'node:diagnostics_channel';
import { createContextKey, context, propagation } from '@opentelemetry/api';
import { debug, addNonEnumerableProperty, getClient, getIsolationScope, httpRequestToRequestData, stripUrlQueryAndFragment, withIsolationScope, generateSpanId, getCurrentScope } from '@sentry/core';
import { DEBUG_BUILD } from '../../debug-build.js';
import { MAX_BODY_BYTE_LENGTH } from './constants.js';

const HTTP_SERVER_INSTRUMENTED_KEY = createContextKey('sentry_http_server_instrumented');
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
  addNonEnumerableProperty(request, '_startSpanCallback', new WeakRef(callback));
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

      subscribe('http.server.request.start', onHttpServerRequestStart);
    },
    afterAllSetup(client) {
      if (DEBUG_BUILD && client.getIntegrationByName('Http')) {
        debug.warn(
          'It seems that you have manually added `httpServerIntegration` while `httpIntegration` is also present. Make sure to remove `httpServerIntegration` when adding `httpIntegration`.',
        );
      }
    },
  };
}) ;

/**
 * This integration handles request isolation, trace continuation and other core Sentry functionality around incoming http requests
 * handled via the node `http` module.
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

      const client = getClient();

      // Make sure we do not double execute our wrapper code, for edge cases...
      // Without this check, if we double-wrap emit, for whatever reason, you'd get two http.server spans (one the children of the other)
      if (context.active().getValue(HTTP_SERVER_INSTRUMENTED_KEY) || !client) {
        return target.apply(thisArg, args);
      }

      DEBUG_BUILD && debug.log(INTEGRATION_NAME, 'Handling incoming request');

      const isolationScope = getIsolationScope().clone();
      const request = args[1] ;
      const response = args[2] ;

      const normalizedRequest = httpRequestToRequestData(request);

      // request.ip is non-standard but some frameworks set this
      const ipAddress = (request ).ip || request.socket?.remoteAddress;

      const url = request.url || '/';
      if (maxRequestBodySize !== 'none' && !ignoreRequestBody?.(url, request)) {
        patchRequestToCaptureBody(request, isolationScope, maxRequestBodySize);
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

      if (sessions && client) {
        recordRequestSession(client, {
          requestIsolationScope: isolationScope,
          response,
          sessionFlushingDelayMS: sessionFlushingDelayMS ?? 60000,
        });
      }

      return withIsolationScope(isolationScope, () => {
        // Set a new propagationSpanId for this request
        // We rely on the fact that `withIsolationScope()` will implicitly also fork the current scope
        // This way we can save an "unnecessary" `withScope()` invocation
        getCurrentScope().getPropagationContext().propagationSpanId = generateSpanId();

        const ctx = propagation
          .extract(context.active(), normalizedRequest.headers)
          .setValue(HTTP_SERVER_INSTRUMENTED_KEY, true);

        return context.with(ctx, () => {
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
      DEBUG_BUILD && debug.log(`Recorded request session with status: ${requestSession.status}`);

      const roundedDate = new Date();
      roundedDate.setSeconds(0, 0);
      const dateBucketKey = roundedDate.toISOString();

      const existingClientAggregate = clientToRequestSessionAggregatesMap.get(client);
      const bucket = existingClientAggregate?.[dateBucketKey] || { exited: 0, crashed: 0, errored: 0 };
      bucket[({ ok: 'exited', crashed: 'crashed', errored: 'errored' } )[requestSession.status]]++;

      if (existingClientAggregate) {
        existingClientAggregate[dateBucketKey] = bucket;
      } else {
        DEBUG_BUILD && debug.log('Opened new request session aggregate.');
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
          DEBUG_BUILD && debug.log('Sending request session aggregate due to client flush');
          flushPendingClientAggregates();
        });
        const timeout = setTimeout(() => {
          DEBUG_BUILD && debug.log('Sending request session aggregate due to flushing schedule');
          flushPendingClientAggregates();
        }, sessionFlushingDelayMS).unref();
      }
    }
  });
}

/**
 * This method patches the request object to capture the body.
 * Instead of actually consuming the streamed body ourselves, which has potential side effects,
 * we monkey patch `req.on('data')` to intercept the body chunks.
 * This way, we only read the body if the user also consumes the body, ensuring we do not change any behavior in unexpected ways.
 */
function patchRequestToCaptureBody(
  req,
  isolationScope,
  maxIncomingRequestBodySize,
) {
  let bodyByteLength = 0;
  const chunks = [];

  DEBUG_BUILD && debug.log(INTEGRATION_NAME, 'Patching request.on');

  /**
   * We need to keep track of the original callbacks, in order to be able to remove listeners again.
   * Since `off` depends on having the exact same function reference passed in, we need to be able to map
   * original listeners to our wrapped ones.
   */
  const callbackMap = new WeakMap();

  const maxBodySize =
    maxIncomingRequestBodySize === 'small'
      ? 1000
      : maxIncomingRequestBodySize === 'medium'
        ? 10000
        : MAX_BODY_BYTE_LENGTH;

  try {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    req.on = new Proxy(req.on, {
      apply: (target, thisArg, args) => {
        const [event, listener, ...restArgs] = args;

        if (event === 'data') {
          DEBUG_BUILD &&
            debug.log(INTEGRATION_NAME, `Handling request.on("data") with maximum body size of ${maxBodySize}b`);

          const callback = new Proxy(listener, {
            apply: (target, thisArg, args) => {
              try {
                const chunk = args[0] ;
                const bufferifiedChunk = Buffer.from(chunk);

                if (bodyByteLength < maxBodySize) {
                  chunks.push(bufferifiedChunk);
                  bodyByteLength += bufferifiedChunk.byteLength;
                } else if (DEBUG_BUILD) {
                  debug.log(
                    INTEGRATION_NAME,
                    `Dropping request body chunk because maximum body length of ${maxBodySize}b is exceeded.`,
                  );
                }
              } catch (err) {
                DEBUG_BUILD && debug.error(INTEGRATION_NAME, 'Encountered error while storing body chunk.');
              }

              return Reflect.apply(target, thisArg, args);
            },
          });

          callbackMap.set(listener, callback);

          return Reflect.apply(target, thisArg, [event, callback, ...restArgs]);
        }

        return Reflect.apply(target, thisArg, args);
      },
    });

    // Ensure we also remove callbacks correctly
    // eslint-disable-next-line @typescript-eslint/unbound-method
    req.off = new Proxy(req.off, {
      apply: (target, thisArg, args) => {
        const [, listener] = args;

        const callback = callbackMap.get(listener);
        if (callback) {
          callbackMap.delete(listener);

          const modifiedArgs = args.slice();
          modifiedArgs[1] = callback;
          return Reflect.apply(target, thisArg, modifiedArgs);
        }

        return Reflect.apply(target, thisArg, args);
      },
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (body) {
          // Using Buffer.byteLength here, because the body may contain characters that are not 1 byte long
          const bodyByteLength = Buffer.byteLength(body, 'utf-8');
          const truncatedBody =
            bodyByteLength > maxBodySize
              ? `${Buffer.from(body)
                  .subarray(0, maxBodySize - 3)
                  .toString('utf-8')}...`
              : body;

          isolationScope.setSDKProcessingMetadata({ normalizedRequest: { data: truncatedBody } });
        }
      } catch (error) {
        if (DEBUG_BUILD) {
          debug.error(INTEGRATION_NAME, 'Error building captured request body', error);
        }
      }
    });
  } catch (error) {
    if (DEBUG_BUILD) {
      debug.error(INTEGRATION_NAME, 'Error patching request to capture body', error);
    }
  }
}

export { addStartSpanCallback, httpServerIntegration, recordRequestSession };
//# sourceMappingURL=httpServerIntegration.js.map
