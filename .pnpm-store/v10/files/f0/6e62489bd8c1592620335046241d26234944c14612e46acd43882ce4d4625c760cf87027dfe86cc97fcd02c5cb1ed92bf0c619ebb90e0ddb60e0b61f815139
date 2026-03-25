import { getEnvelopeEndpointWithUrlEncodedAuth } from './api.js';
import { DEFAULT_ENVIRONMENT } from './constants.js';
import { getTraceContextFromScope, getCurrentScope, getIsolationScope } from './currentScopes.js';
import { DEBUG_BUILD } from './debug-build.js';
import { createEventEnvelope, createSessionEnvelope } from './envelope.js';
import { setupIntegration, afterSetupIntegrations, setupIntegrations } from './integration.js';
import { _INTERNAL_flushLogsBuffer } from './logs/internal.js';
import { _INTERNAL_flushMetricsBuffer } from './metrics/internal.js';
import { updateSession } from './session.js';
import { getDynamicSamplingContextFromScope } from './tracing/dynamicSamplingContext.js';
import { DEFAULT_TRANSPORT_BUFFER_SIZE } from './transports/base.js';
import { createClientReportEnvelope } from './utils/clientreport.js';
import { debug } from './utils/debug-logger.js';
import { makeDsn, dsnToString } from './utils/dsn.js';
import { addItemToEnvelope, createAttachmentEnvelopeItem } from './utils/envelope.js';
import { getPossibleEventMessages } from './utils/eventUtils.js';
import { isParameterizedString, isPrimitive, isThenable, isPlainObject } from './utils/is.js';
import { merge } from './utils/merge.js';
import { uuid4, checkOrSetAlreadyCaught } from './utils/misc.js';
import { parseSampleRate } from './utils/parseSampleRate.js';
import { prepareEvent } from './utils/prepareEvent.js';
import { makePromiseBuffer, SENTRY_BUFFER_FULL_ERROR } from './utils/promisebuffer.js';
import { safeMathRandom } from './utils/randomSafeContext.js';
import { shouldIgnoreSpan, reparentChildSpans } from './utils/should-ignore-span.js';
import { showSpanDropWarning } from './utils/spanUtils.js';
import { rejectedSyncPromise } from './utils/syncpromise.js';
import { convertTransactionEventToSpanJson, convertSpanJsonToTransactionEvent } from './utils/transactionEvent.js';

/* eslint-disable max-lines */

const ALREADY_SEEN_ERROR = "Not capturing exception because it's already been captured.";
const MISSING_RELEASE_FOR_SESSION_ERROR = 'Discarded session because of missing or non-string release';

const INTERNAL_ERROR_SYMBOL = Symbol.for('SentryInternalError');
const DO_NOT_SEND_EVENT_SYMBOL = Symbol.for('SentryDoNotSendEventError');

// Default interval for flushing logs and metrics (5 seconds)
const DEFAULT_FLUSH_INTERVAL = 5000;

function _makeInternalError(message) {
  return {
    message,
    [INTERNAL_ERROR_SYMBOL]: true,
  };
}

function _makeDoNotSendEventError(message) {
  return {
    message,
    [DO_NOT_SEND_EVENT_SYMBOL]: true,
  };
}

function _isInternalError(error) {
  return !!error && typeof error === 'object' && INTERNAL_ERROR_SYMBOL in error;
}

function _isDoNotSendEventError(error) {
  return !!error && typeof error === 'object' && DO_NOT_SEND_EVENT_SYMBOL in error;
}

/**
 * Sets up weight-based flushing for logs or metrics.
 * This helper function encapsulates the common pattern of:
 * 1. Tracking accumulated weight of items
 * 2. Flushing when weight exceeds threshold (800KB)
 * 3. Flushing after timeout period from the first item
 *
 * Uses closure variables to track weight and timeout state.
 */
function setupWeightBasedFlushing

(
  client,
  afterCaptureHook,
  flushHook,
  estimateSizeFn,
  flushFn,
) {
  // Track weight and timeout in closure variables
  let weight = 0;
  let flushTimeout;
  let isTimerActive = false;

  // @ts-expect-error - TypeScript can't narrow generic hook types to match specific overloads, but we know this is type-safe
  client.on(flushHook, () => {
    weight = 0;
    clearTimeout(flushTimeout);
    isTimerActive = false;
  });

  // @ts-expect-error - TypeScript can't narrow generic hook types to match specific overloads, but we know this is type-safe
  client.on(afterCaptureHook, (item) => {
    weight += estimateSizeFn(item);

    // We flush the buffer if it exceeds 0.8 MB
    // The weight is a rough estimate, so we flush way before the payload gets too big.
    if (weight >= 800000) {
      flushFn(client);
    } else if (!isTimerActive) {
      // Only start timer if one isn't already running.
      // This prevents flushing being delayed by items that arrive close to the timeout limit
      // and thus resetting the flushing timeout and delaying items being flushed.
      isTimerActive = true;
      flushTimeout = setTimeout(() => {
        flushFn(client);
        // Note: isTimerActive is reset by the flushHook handler above, not here,
        // to avoid race conditions when new items arrive during the flush.
      }, DEFAULT_FLUSH_INTERVAL);
    }
  });

  client.on('flush', () => {
    flushFn(client);
  });
}

/**
 * Base implementation for all JavaScript SDK clients.
 *
 * Call the constructor with the corresponding options
 * specific to the client subclass. To access these options later, use
 * {@link Client.getOptions}.
 *
 * If a Dsn is specified in the options, it will be parsed and stored. Use
 * {@link Client.getDsn} to retrieve the Dsn at any moment. In case the Dsn is
 * invalid, the constructor will throw a {@link SentryException}. Note that
 * without a valid Dsn, the SDK will not send any events to Sentry.
 *
 * Before sending an event, it is passed through
 * {@link Client._prepareEvent} to add SDK information and scope data
 * (breadcrumbs and context). To add more custom information, override this
 * method and extend the resulting prepared event.
 *
 * To issue automatically created events (e.g. via instrumentation), use
 * {@link Client.captureEvent}. It will prepare the event and pass it through
 * the callback lifecycle. To issue auto-breadcrumbs, use
 * {@link Client.addBreadcrumb}.
 *
 * @example
 * class NodeClient extends Client<NodeOptions> {
 *   public constructor(options: NodeOptions) {
 *     super(options);
 *   }
 *
 *   // ...
 * }
 */
class Client {
  /** Options passed to the SDK. */

  /** The client Dsn, if specified in options. Without this Dsn, the SDK will be disabled. */

  /** Array of set up integrations. */

  /** Number of calls being processed */

  /** Holds flushable  */

  // eslint-disable-next-line @typescript-eslint/ban-types

  /**
   * Initializes this client instance.
   *
   * @param options Options for the client.
   */
   constructor(options) {
    this._options = options;
    this._integrations = {};
    this._numProcessing = 0;
    this._outcomes = {};
    this._hooks = {};
    this._eventProcessors = [];
    this._promiseBuffer = makePromiseBuffer(options.transportOptions?.bufferSize ?? DEFAULT_TRANSPORT_BUFFER_SIZE);

    if (options.dsn) {
      this._dsn = makeDsn(options.dsn);
    } else {
      DEBUG_BUILD && debug.warn('No DSN provided, client will not send events.');
    }

    if (this._dsn) {
      const url = getEnvelopeEndpointWithUrlEncodedAuth(
        this._dsn,
        options.tunnel,
        options._metadata ? options._metadata.sdk : undefined,
      );
      this._transport = options.transport({
        tunnel: this._options.tunnel,
        recordDroppedEvent: this.recordDroppedEvent.bind(this),
        ...options.transportOptions,
        url,
      });
    }

    // Backfill enableLogs option from _experiments.enableLogs
    // TODO(v11): Remove or change default value
    // eslint-disable-next-line deprecation/deprecation
    this._options.enableLogs = this._options.enableLogs ?? this._options._experiments?.enableLogs;

    // Setup log flushing with weight and timeout tracking
    if (this._options.enableLogs) {
      setupWeightBasedFlushing(this, 'afterCaptureLog', 'flushLogs', estimateLogSizeInBytes, _INTERNAL_flushLogsBuffer);
    }

    // todo(v11): Remove the experimental flag
    // eslint-disable-next-line deprecation/deprecation
    const enableMetrics = this._options.enableMetrics ?? this._options._experiments?.enableMetrics ?? true;

    // Setup metric flushing with weight and timeout tracking
    if (enableMetrics) {
      setupWeightBasedFlushing(
        this,
        'afterCaptureMetric',
        'flushMetrics',
        estimateMetricSizeInBytes,
        _INTERNAL_flushMetricsBuffer,
      );
    }
  }

  /**
   * Captures an exception event and sends it to Sentry.
   *
   * Unlike `captureException` exported from every SDK, this method requires that you pass it the current scope.
   */
   captureException(exception, hint, scope) {
    const eventId = uuid4();

    // ensure we haven't captured this very object before
    if (checkOrSetAlreadyCaught(exception)) {
      DEBUG_BUILD && debug.log(ALREADY_SEEN_ERROR);
      return eventId;
    }

    const hintWithEventId = {
      event_id: eventId,
      ...hint,
    };

    this._process(
      () =>
        this.eventFromException(exception, hintWithEventId)
          .then(event => this._captureEvent(event, hintWithEventId, scope))
          .then(res => res),
      'error',
    );

    return hintWithEventId.event_id;
  }

  /**
   * Captures a message event and sends it to Sentry.
   *
   * Unlike `captureMessage` exported from every SDK, this method requires that you pass it the current scope.
   */
   captureMessage(
    message,
    level,
    hint,
    currentScope,
  ) {
    const hintWithEventId = {
      event_id: uuid4(),
      ...hint,
    };

    const eventMessage = isParameterizedString(message) ? message : String(message);
    const isMessage = isPrimitive(message);
    const promisedEvent = isMessage
      ? this.eventFromMessage(eventMessage, level, hintWithEventId)
      : this.eventFromException(message, hintWithEventId);

    this._process(
      () => promisedEvent.then(event => this._captureEvent(event, hintWithEventId, currentScope)),
      isMessage ? 'unknown' : 'error',
    );

    return hintWithEventId.event_id;
  }

  /**
   * Captures a manually created event and sends it to Sentry.
   *
   * Unlike `captureEvent` exported from every SDK, this method requires that you pass it the current scope.
   */
   captureEvent(event, hint, currentScope) {
    const eventId = uuid4();

    // ensure we haven't captured this very object before
    if (hint?.originalException && checkOrSetAlreadyCaught(hint.originalException)) {
      DEBUG_BUILD && debug.log(ALREADY_SEEN_ERROR);
      return eventId;
    }

    const hintWithEventId = {
      event_id: eventId,
      ...hint,
    };

    const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
    const capturedSpanScope = sdkProcessingMetadata.capturedSpanScope;
    const capturedSpanIsolationScope = sdkProcessingMetadata.capturedSpanIsolationScope;
    const dataCategory = getDataCategoryByType(event.type);

    this._process(
      () => this._captureEvent(event, hintWithEventId, capturedSpanScope || currentScope, capturedSpanIsolationScope),
      dataCategory,
    );

    return hintWithEventId.event_id;
  }

  /**
   * Captures a session.
   */
   captureSession(session) {
    this.sendSession(session);
    // After sending, we set init false to indicate it's not the first occurrence
    updateSession(session, { init: false });
  }

  /**
   * Create a cron monitor check in and send it to Sentry. This method is not available on all clients.
   *
   * @param checkIn An object that describes a check in.
   * @param upsertMonitorConfig An optional object that describes a monitor config. Use this if you want
   * to create a monitor automatically when sending a check in.
   * @param scope An optional scope containing event metadata.
   * @returns A string representing the id of the check in.
   */

  /**
   * Get the current Dsn.
   */
   getDsn() {
    return this._dsn;
  }

  /**
   * Get the current options.
   */
   getOptions() {
    return this._options;
  }

  /**
   * Get the SDK metadata.
   * @see SdkMetadata
   */
   getSdkMetadata() {
    return this._options._metadata;
  }

  /**
   * Returns the transport that is used by the client.
   * Please note that the transport gets lazy initialized so it will only be there once the first event has been sent.
   */
   getTransport() {
    return this._transport;
  }

  /**
   * Wait for all events to be sent or the timeout to expire, whichever comes first.
   *
   * @param timeout Maximum time in ms the client should wait for events to be flushed. Omitting this parameter will
   *   cause the client to wait until all events are sent before resolving the promise.
   * @returns A promise that will resolve with `true` if all events are sent before the timeout, or `false` if there are
   * still events in the queue when the timeout is reached.
   */
  // @ts-expect-error - PromiseLike is a subset of Promise
   async flush(timeout) {
    const transport = this._transport;
    if (!transport) {
      return true;
    }

    this.emit('flush');

    const clientFinished = await this._isClientDoneProcessing(timeout);
    const transportFlushed = await transport.flush(timeout);

    return clientFinished && transportFlushed;
  }

  /**
   * Flush the event queue and set the client to `enabled = false`. See {@link Client.flush}.
   *
   * @param {number} timeout Maximum time in ms the client should wait before shutting down. Omitting this parameter will cause
   *   the client to wait until all events are sent before disabling itself.
   * @returns {Promise<boolean>} A promise which resolves to `true` if the flush completes successfully before the timeout, or `false` if
   * it doesn't.
   */
  // @ts-expect-error - PromiseLike is a subset of Promise
   async close(timeout) {
    const result = await this.flush(timeout);
    this.getOptions().enabled = false;
    this.emit('close');
    return result;
  }

  /**
   * Get all installed event processors.
   */
   getEventProcessors() {
    return this._eventProcessors;
  }

  /**
   * Adds an event processor that applies to any event processed by this client.
   */
   addEventProcessor(eventProcessor) {
    this._eventProcessors.push(eventProcessor);
  }

  /**
   * Initialize this client.
   * Call this after the client was set on a scope.
   */
   init() {
    if (
      this._isEnabled() ||
      // Force integrations to be setup even if no DSN was set when we have
      // Spotlight enabled. This is particularly important for browser as we
      // don't support the `spotlight` option there and rely on the users
      // adding the `spotlightBrowserIntegration()` to their integrations which
      // wouldn't get initialized with the check below when there's no DSN set.
      this._options.integrations.some(({ name }) => name.startsWith('Spotlight'))
    ) {
      this._setupIntegrations();
    }
  }

  /**
   * Gets an installed integration by its name.
   *
   * @returns {Integration|undefined} The installed integration or `undefined` if no integration with that `name` was installed.
   */
   getIntegrationByName(integrationName) {
    return this._integrations[integrationName] ;
  }

  /**
   * Add an integration to the client.
   * This can be used to e.g. lazy load integrations.
   * In most cases, this should not be necessary,
   * and you're better off just passing the integrations via `integrations: []` at initialization time.
   * However, if you find the need to conditionally load & add an integration, you can use `addIntegration` to do so.
   */
   addIntegration(integration) {
    const isAlreadyInstalled = this._integrations[integration.name];

    // This hook takes care of only installing if not already installed
    setupIntegration(this, integration, this._integrations);
    // Here we need to check manually to make sure to not run this multiple times
    if (!isAlreadyInstalled) {
      afterSetupIntegrations(this, [integration]);
    }
  }

  /**
   * Send a fully prepared event to Sentry.
   */
   sendEvent(event, hint = {}) {
    this.emit('beforeSendEvent', event, hint);

    let env = createEventEnvelope(event, this._dsn, this._options._metadata, this._options.tunnel);

    for (const attachment of hint.attachments || []) {
      env = addItemToEnvelope(env, createAttachmentEnvelopeItem(attachment));
    }

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendEnvelope(env).then(sendResponse => this.emit('afterSendEvent', event, sendResponse));
  }

  /**
   * Send a session or session aggregrates to Sentry.
   */
   sendSession(session) {
    // Backfill release and environment on session
    const { release: clientReleaseOption, environment: clientEnvironmentOption = DEFAULT_ENVIRONMENT } = this._options;
    if ('aggregates' in session) {
      const sessionAttrs = session.attrs || {};
      if (!sessionAttrs.release && !clientReleaseOption) {
        DEBUG_BUILD && debug.warn(MISSING_RELEASE_FOR_SESSION_ERROR);
        return;
      }
      sessionAttrs.release = sessionAttrs.release || clientReleaseOption;
      sessionAttrs.environment = sessionAttrs.environment || clientEnvironmentOption;
      session.attrs = sessionAttrs;
    } else {
      if (!session.release && !clientReleaseOption) {
        DEBUG_BUILD && debug.warn(MISSING_RELEASE_FOR_SESSION_ERROR);
        return;
      }
      session.release = session.release || clientReleaseOption;
      session.environment = session.environment || clientEnvironmentOption;
    }

    this.emit('beforeSendSession', session);

    const env = createSessionEnvelope(session, this._dsn, this._options._metadata, this._options.tunnel);

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendEnvelope(env);
  }

  /**
   * Record on the client that an event got dropped (ie, an event that will not be sent to Sentry).
   */
   recordDroppedEvent(reason, category, count = 1) {
    if (this._options.sendClientReports) {
      // We want to track each category (error, transaction, session, replay_event) separately
      // but still keep the distinction between different type of outcomes.
      // We could use nested maps, but it's much easier to read and type this way.
      // A correct type for map-based implementation if we want to go that route
      // would be `Partial<Record<SentryRequestType, Partial<Record<Outcome, number>>>>`
      // With typescript 4.1 we could even use template literal types
      const key = `${reason}:${category}`;
      DEBUG_BUILD && debug.log(`Recording outcome: "${key}"${count > 1 ? ` (${count} times)` : ''}`);
      this._outcomes[key] = (this._outcomes[key] || 0) + count;
    }
  }

  /* eslint-disable @typescript-eslint/unified-signatures */
  /**
   * Register a callback for whenever a span is started.
   * Receives the span as argument.
   * @returns {() => void} A function that, when executed, removes the registered callback.
   */

  /**
   * Register a hook on this client.
   */
   on(hook, callback) {
    const hookCallbacks = (this._hooks[hook] = this._hooks[hook] || new Set());

    // Wrap the callback in a function so that registering the same callback instance multiple
    // times results in the callback being called multiple times.
    // @ts-expect-error - The `callback` type is correct and must be a function due to the
    // individual, specific overloads of this function.
    // eslint-disable-next-line @typescript-eslint/ban-types
    const uniqueCallback = (...args) => callback(...args);

    hookCallbacks.add(uniqueCallback);

    // This function returns a callback execution handler that, when invoked,
    // deregisters a callback. This is crucial for managing instances where callbacks
    // need to be unregistered to prevent self-referencing in callback closures,
    // ensuring proper garbage collection.
    return () => {
      hookCallbacks.delete(uniqueCallback);
    };
  }

  /** Fire a hook whenever a span starts. */

  /**
   * Emit a hook that was previously registered via `on()`.
   */
   emit(hook, ...rest) {
    const callbacks = this._hooks[hook];
    if (callbacks) {
      callbacks.forEach(callback => callback(...rest));
    }
  }

  /**
   * Send an envelope to Sentry.
   */
  // @ts-expect-error - PromiseLike is a subset of Promise
   async sendEnvelope(envelope) {
    this.emit('beforeEnvelope', envelope);

    if (this._isEnabled() && this._transport) {
      try {
        return await this._transport.send(envelope);
      } catch (reason) {
        DEBUG_BUILD && debug.error('Error while sending envelope:', reason);
        return {};
      }
    }

    DEBUG_BUILD && debug.error('Transport disabled');
    return {};
  }

  /* eslint-enable @typescript-eslint/unified-signatures */

  /** Setup integrations for this client. */
   _setupIntegrations() {
    const { integrations } = this._options;
    this._integrations = setupIntegrations(this, integrations);
    afterSetupIntegrations(this, integrations);
  }

  /** Updates existing session based on the provided event */
   _updateSessionFromEvent(session, event) {
    // initially, set `crashed` based on the event level and update from exceptions if there are any later on
    let crashed = event.level === 'fatal';
    let errored = false;
    const exceptions = event.exception?.values;

    if (exceptions) {
      errored = true;
      // reset crashed to false if there are exceptions, to ensure `mechanism.handled` is respected.
      crashed = false;

      for (const ex of exceptions) {
        if (ex.mechanism?.handled === false) {
          crashed = true;
          break;
        }
      }
    }

    // A session is updated and that session update is sent in only one of the two following scenarios:
    // 1. Session with non terminal status and 0 errors + an error occurred -> Will set error count to 1 and send update
    // 2. Session with non terminal status and 1 error + a crash occurred -> Will set status crashed and send update
    const sessionNonTerminal = session.status === 'ok';
    const shouldUpdateAndSend = (sessionNonTerminal && session.errors === 0) || (sessionNonTerminal && crashed);

    if (shouldUpdateAndSend) {
      updateSession(session, {
        ...(crashed && { status: 'crashed' }),
        errors: session.errors || Number(errored || crashed),
      });
      this.captureSession(session);
    }
  }

  /**
   * Determine if the client is finished processing. Returns a promise because it will wait `timeout` ms before saying
   * "no" (resolving to `false`) in order to give the client a chance to potentially finish first.
   *
   * @param timeout The time, in ms, after which to resolve to `false` if the client is still busy. Passing `0` (or not
   * passing anything) will make the promise wait as long as it takes for processing to finish before resolving to
   * `true`.
   * @returns A promise which will resolve to `true` if processing is already done or finishes before the timeout, and
   * `false` otherwise
   */
   async _isClientDoneProcessing(timeout) {
    let ticked = 0;

    // if no timeout is provided, we wait "forever" until everything is processed
    while (!timeout || ticked < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1));

      if (!this._numProcessing) {
        return true;
      }
      ticked++;
    }

    return false;
  }

  /** Determines whether this SDK is enabled and a transport is present. */
   _isEnabled() {
    return this.getOptions().enabled !== false && this._transport !== undefined;
  }

  /**
   * Adds common information to events.
   *
   * The information includes release and environment from `options`,
   * breadcrumbs and context (extra, tags and user) from the scope.
   *
   * Information that is already present in the event is never overwritten. For
   * nested objects, such as the context, keys are merged.
   *
   * @param event The original event.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A new event with more information.
   */
   _prepareEvent(
    event,
    hint,
    currentScope,
    isolationScope,
  ) {
    const options = this.getOptions();
    const integrations = Object.keys(this._integrations);
    if (!hint.integrations && integrations?.length) {
      hint.integrations = integrations;
    }

    this.emit('preprocessEvent', event, hint);

    if (!event.type) {
      isolationScope.setLastEventId(event.event_id || hint.event_id);
    }

    return prepareEvent(options, event, hint, currentScope, this, isolationScope).then(evt => {
      if (evt === null) {
        return evt;
      }

      this.emit('postprocessEvent', evt, hint);

      evt.contexts = {
        trace: getTraceContextFromScope(currentScope),
        ...evt.contexts,
      };

      const dynamicSamplingContext = getDynamicSamplingContextFromScope(this, currentScope);

      evt.sdkProcessingMetadata = {
        dynamicSamplingContext,
        ...evt.sdkProcessingMetadata,
      };

      return evt;
    });
  }

  /**
   * Processes the event and logs an error in case of rejection
   * @param event
   * @param hint
   * @param scope
   */
   _captureEvent(
    event,
    hint = {},
    currentScope = getCurrentScope(),
    isolationScope = getIsolationScope(),
  ) {
    if (DEBUG_BUILD && isErrorEvent(event)) {
      debug.log(`Captured error event \`${getPossibleEventMessages(event)[0] || '<unknown>'}\``);
    }

    return this._processEvent(event, hint, currentScope, isolationScope).then(
      finalEvent => {
        return finalEvent.event_id;
      },
      reason => {
        if (DEBUG_BUILD) {
          if (_isDoNotSendEventError(reason)) {
            debug.log(reason.message);
          } else if (_isInternalError(reason)) {
            debug.warn(reason.message);
          } else {
            debug.warn(reason);
          }
        }
        return undefined;
      },
    );
  }

  /**
   * Processes an event (either error or message) and sends it to Sentry.
   *
   * This also adds breadcrumbs and context information to the event. However,
   * platform specific meta data (such as the User's IP address) must be added
   * by the SDK implementor.
   *
   *
   * @param event The event to send to Sentry.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A SyncPromise that resolves with the event or rejects in case event was/will not be send.
   */
   _processEvent(
    event,
    hint,
    currentScope,
    isolationScope,
  ) {
    const options = this.getOptions();
    const { sampleRate } = options;

    const isTransaction = isTransactionEvent(event);
    const isError = isErrorEvent(event);
    const eventType = event.type || 'error';
    const beforeSendLabel = `before send for type \`${eventType}\``;

    // 1.0 === 100% events are sent
    // 0.0 === 0% events are sent
    // Sampling for transaction happens somewhere else
    const parsedSampleRate = typeof sampleRate === 'undefined' ? undefined : parseSampleRate(sampleRate);
    if (isError && typeof parsedSampleRate === 'number' && safeMathRandom() > parsedSampleRate) {
      this.recordDroppedEvent('sample_rate', 'error');
      return rejectedSyncPromise(
        _makeDoNotSendEventError(
          `Discarding event because it's not included in the random sample (sampling rate = ${sampleRate})`,
        ),
      );
    }

    const dataCategory = getDataCategoryByType(event.type);

    return this._prepareEvent(event, hint, currentScope, isolationScope)
      .then(prepared => {
        if (prepared === null) {
          this.recordDroppedEvent('event_processor', dataCategory);
          throw _makeDoNotSendEventError('An event processor returned `null`, will not send event.');
        }

        const isInternalException = hint.data && (hint.data ).__sentry__ === true;
        if (isInternalException) {
          return prepared;
        }

        const result = processBeforeSend(this, options, prepared, hint);
        return _validateBeforeSendResult(result, beforeSendLabel);
      })
      .then(processedEvent => {
        if (processedEvent === null) {
          this.recordDroppedEvent('before_send', dataCategory);
          if (isTransaction) {
            const spans = event.spans || [];
            // the transaction itself counts as one span, plus all the child spans that are added
            const spanCount = 1 + spans.length;
            this.recordDroppedEvent('before_send', 'span', spanCount);
          }
          throw _makeDoNotSendEventError(`${beforeSendLabel} returned \`null\`, will not send event.`);
        }

        const session = currentScope.getSession() || isolationScope.getSession();
        if (isError && session) {
          this._updateSessionFromEvent(session, processedEvent);
        }

        if (isTransaction) {
          const spanCountBefore = processedEvent.sdkProcessingMetadata?.spanCountBeforeProcessing || 0;
          const spanCountAfter = processedEvent.spans ? processedEvent.spans.length : 0;

          const droppedSpanCount = spanCountBefore - spanCountAfter;
          if (droppedSpanCount > 0) {
            this.recordDroppedEvent('before_send', 'span', droppedSpanCount);
          }
        }

        // None of the Sentry built event processor will update transaction name,
        // so if the transaction name has been changed by an event processor, we know
        // it has to come from custom event processor added by a user
        const transactionInfo = processedEvent.transaction_info;
        if (isTransaction && transactionInfo && processedEvent.transaction !== event.transaction) {
          const source = 'custom';
          processedEvent.transaction_info = {
            ...transactionInfo,
            source,
          };
        }

        this.sendEvent(processedEvent, hint);
        return processedEvent;
      })
      .then(null, reason => {
        if (_isDoNotSendEventError(reason) || _isInternalError(reason)) {
          throw reason;
        }

        this.captureException(reason, {
          mechanism: {
            handled: false,
            type: 'internal',
          },
          data: {
            __sentry__: true,
          },
          originalException: reason,
        });
        throw _makeInternalError(
          `Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.\nReason: ${reason}`,
        );
      });
  }

  /**
   * Occupies the client with processing and event
   */
   _process(taskProducer, dataCategory) {
    this._numProcessing++;

    void this._promiseBuffer.add(taskProducer).then(
      value => {
        this._numProcessing--;
        return value;
      },
      reason => {
        this._numProcessing--;

        if (reason === SENTRY_BUFFER_FULL_ERROR) {
          this.recordDroppedEvent('queue_overflow', dataCategory);
        }

        return reason;
      },
    );
  }

  /**
   * Clears outcomes on this client and returns them.
   */
   _clearOutcomes() {
    const outcomes = this._outcomes;
    this._outcomes = {};
    return Object.entries(outcomes).map(([key, quantity]) => {
      const [reason, category] = key.split(':') ;
      return {
        reason,
        category,
        quantity,
      };
    });
  }

  /**
   * Sends client reports as an envelope.
   */
   _flushOutcomes() {
    DEBUG_BUILD && debug.log('Flushing outcomes...');

    const outcomes = this._clearOutcomes();

    if (outcomes.length === 0) {
      DEBUG_BUILD && debug.log('No outcomes to send');
      return;
    }

    // This is really the only place where we want to check for a DSN and only send outcomes then
    if (!this._dsn) {
      DEBUG_BUILD && debug.log('No dsn provided, will not send outcomes');
      return;
    }

    DEBUG_BUILD && debug.log('Sending outcomes:', outcomes);

    const envelope = createClientReportEnvelope(outcomes, this._options.tunnel && dsnToString(this._dsn));

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendEnvelope(envelope);
  }

  /**
   * Creates an {@link Event} from all inputs to `captureException` and non-primitive inputs to `captureMessage`.
   */

}

function getDataCategoryByType(type) {
  return type === 'replay_event' ? 'replay' : type || 'error';
}

/**
 * Verifies that return value of configured `beforeSend` or `beforeSendTransaction` is of expected type, and returns the value if so.
 */
function _validateBeforeSendResult(
  beforeSendResult,
  beforeSendLabel,
) {
  const invalidValueError = `${beforeSendLabel} must return \`null\` or a valid event.`;
  if (isThenable(beforeSendResult)) {
    return beforeSendResult.then(
      event => {
        if (!isPlainObject(event) && event !== null) {
          throw _makeInternalError(invalidValueError);
        }
        return event;
      },
      e => {
        throw _makeInternalError(`${beforeSendLabel} rejected with ${e}`);
      },
    );
  } else if (!isPlainObject(beforeSendResult) && beforeSendResult !== null) {
    throw _makeInternalError(invalidValueError);
  }
  return beforeSendResult;
}

/**
 * Process the matching `beforeSendXXX` callback.
 */
function processBeforeSend(
  client,
  options,
  event,
  hint,
) {
  const { beforeSend, beforeSendTransaction, beforeSendSpan, ignoreSpans } = options;
  let processedEvent = event;

  if (isErrorEvent(processedEvent) && beforeSend) {
    return beforeSend(processedEvent, hint);
  }

  if (isTransactionEvent(processedEvent)) {
    // Avoid processing if we don't have to
    if (beforeSendSpan || ignoreSpans) {
      // 1. Process root span
      const rootSpanJson = convertTransactionEventToSpanJson(processedEvent);

      // 1.1 If the root span should be ignored, drop the whole transaction
      if (ignoreSpans?.length && shouldIgnoreSpan(rootSpanJson, ignoreSpans)) {
        // dropping the whole transaction!
        return null;
      }

      // 1.2 If a `beforeSendSpan` callback is defined, process the root span
      if (beforeSendSpan) {
        const processedRootSpanJson = beforeSendSpan(rootSpanJson);
        if (!processedRootSpanJson) {
          showSpanDropWarning();
        } else {
          // update event with processed root span values
          processedEvent = merge(event, convertSpanJsonToTransactionEvent(processedRootSpanJson));
        }
      }

      // 2. Process child spans
      if (processedEvent.spans) {
        const processedSpans = [];

        const initialSpans = processedEvent.spans;

        for (const span of initialSpans) {
          // 2.a If the child span should be ignored, reparent it to the root span
          if (ignoreSpans?.length && shouldIgnoreSpan(span, ignoreSpans)) {
            reparentChildSpans(initialSpans, span);
            continue;
          }

          // 2.b If a `beforeSendSpan` callback is defined, process the child span
          if (beforeSendSpan) {
            const processedSpan = beforeSendSpan(span);
            if (!processedSpan) {
              showSpanDropWarning();
              processedSpans.push(span);
            } else {
              processedSpans.push(processedSpan);
            }
          } else {
            processedSpans.push(span);
          }
        }

        const droppedSpans = processedEvent.spans.length - processedSpans.length;
        if (droppedSpans) {
          client.recordDroppedEvent('before_send', 'span', droppedSpans);
        }

        processedEvent.spans = processedSpans;
      }
    }

    if (beforeSendTransaction) {
      if (processedEvent.spans) {
        // We store the # of spans before processing in SDK metadata,
        // so we can compare it afterwards to determine how many spans were dropped
        const spanCountBefore = processedEvent.spans.length;
        processedEvent.sdkProcessingMetadata = {
          ...event.sdkProcessingMetadata,
          spanCountBeforeProcessing: spanCountBefore,
        };
      }
      return beforeSendTransaction(processedEvent , hint);
    }
  }

  return processedEvent;
}

function isErrorEvent(event) {
  return event.type === undefined;
}

function isTransactionEvent(event) {
  return event.type === 'transaction';
}

/**
 * Estimate the size of a metric in bytes.
 *
 * @param metric - The metric to estimate the size of.
 * @returns The estimated size of the metric in bytes.
 */
function estimateMetricSizeInBytes(metric) {
  let weight = 0;

  // Estimate byte size of 2 bytes per character. This is a rough estimate JS strings are stored as UTF-16.
  if (metric.name) {
    weight += metric.name.length * 2;
  }

  // Add weight for number
  weight += 8;

  return weight + estimateAttributesSizeInBytes(metric.attributes);
}

/**
 * Estimate the size of a log in bytes.
 *
 * @param log - The log to estimate the size of.
 * @returns The estimated size of the log in bytes.
 */
function estimateLogSizeInBytes(log) {
  let weight = 0;

  // Estimate byte size of 2 bytes per character. This is a rough estimate JS strings are stored as UTF-16.
  if (log.message) {
    weight += log.message.length * 2;
  }

  return weight + estimateAttributesSizeInBytes(log.attributes);
}

/**
 * Estimate the size of attributes in bytes.
 *
 * @param attributes - The attributes object to estimate the size of.
 * @returns The estimated size of the attributes in bytes.
 */
function estimateAttributesSizeInBytes(attributes) {
  if (!attributes) {
    return 0;
  }

  let weight = 0;

  Object.values(attributes).forEach(value => {
    if (Array.isArray(value)) {
      weight += value.length * estimatePrimitiveSizeInBytes(value[0]);
    } else if (isPrimitive(value)) {
      weight += estimatePrimitiveSizeInBytes(value);
    } else {
      // For objects values, we estimate the size of the object as 100 bytes
      weight += 100;
    }
  });

  return weight;
}

function estimatePrimitiveSizeInBytes(value) {
  if (typeof value === 'string') {
    return value.length * 2;
  } else if (typeof value === 'number') {
    return 8;
  } else if (typeof value === 'boolean') {
    return 4;
  }

  return 0;
}

export { Client };
//# sourceMappingURL=client.js.map
