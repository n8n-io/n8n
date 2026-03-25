import { getCurrentScope, getClient, withIsolationScope, getIsolationScope } from './currentScopes.js';
import { DEBUG_BUILD } from './debug-build.js';
import { makeSession, updateSession, closeSession } from './session.js';
import { startNewTrace } from './tracing/trace.js';
import { debug } from './utils/debug-logger.js';
import { isThenable } from './utils/is.js';
import { uuid4 } from './utils/misc.js';
import { parseEventHintOrCaptureContext } from './utils/prepareEvent.js';
import { timestampInSeconds } from './utils/time.js';
import { GLOBAL_OBJ } from './utils/worldwide.js';

/**
 * Captures an exception event and sends it to Sentry.
 *
 * @param exception The exception to capture.
 * @param hint Optional additional data to attach to the Sentry event.
 * @returns the id of the captured Sentry event.
 */
function captureException(exception, hint) {
  return getCurrentScope().captureException(exception, parseEventHintOrCaptureContext(hint));
}

/**
 * Captures a message event and sends it to Sentry.
 *
 * @param message The message to send to Sentry.
 * @param captureContext Define the level of the message or pass in additional data to attach to the message.
 * @returns the id of the captured message.
 */
function captureMessage(message, captureContext) {
  // This is necessary to provide explicit scopes upgrade, without changing the original
  // arity of the `captureMessage(message, level)` method.
  const level = typeof captureContext === 'string' ? captureContext : undefined;
  const hint = typeof captureContext !== 'string' ? { captureContext } : undefined;
  return getCurrentScope().captureMessage(message, level, hint);
}

/**
 * Captures a manually created event and sends it to Sentry.
 *
 * @param event The event to send to Sentry.
 * @param hint Optional additional data to attach to the Sentry event.
 * @returns the id of the captured event.
 */
function captureEvent(event, hint) {
  return getCurrentScope().captureEvent(event, hint);
}

/**
 * Sets context data with the given name.
 * @param name of the context
 * @param context Any kind of data. This data will be normalized.
 */
function setContext(name, context) {
  getIsolationScope().setContext(name, context);
}

/**
 * Set an object that will be merged sent as extra data with the event.
 * @param extras Extras object to merge into current context.
 */
function setExtras(extras) {
  getIsolationScope().setExtras(extras);
}

/**
 * Set key:value that will be sent as extra data with the event.
 * @param key String of extra
 * @param extra Any kind of data. This data will be normalized.
 */
function setExtra(key, extra) {
  getIsolationScope().setExtra(key, extra);
}

/**
 * Set an object that will be merged sent as tags data with the event.
 * @param tags Tags context object to merge into current context.
 */
function setTags(tags) {
  getIsolationScope().setTags(tags);
}

/**
 * Set key:value that will be sent as tags data with the event.
 *
 * Can also be used to unset a tag, by passing `undefined`.
 *
 * @param key String key of tag
 * @param value Value of tag
 */
function setTag(key, value) {
  getIsolationScope().setTag(key, value);
}

/**
 * Updates user context information for future events.
 *
 * @param user User context object to be set in the current context. Pass `null` to unset the user.
 */
function setUser(user) {
  getIsolationScope().setUser(user);
}

/**
 * The last error event id of the isolation scope.
 *
 * Warning: This function really returns the last recorded error event id on the current
 * isolation scope. If you call this function after handling a certain error and another error
 * is captured in between, the last one is returned instead of the one you might expect.
 * Also, ids of events that were never sent to Sentry (for example because
 * they were dropped in `beforeSend`) could be returned.
 *
 * @returns The last event id of the isolation scope.
 */
function lastEventId() {
  return getIsolationScope().lastEventId();
}

/**
 * Create a cron monitor check in and send it to Sentry.
 *
 * @param checkIn An object that describes a check in.
 * @param upsertMonitorConfig An optional object that describes a monitor config. Use this if you want
 * to create a monitor automatically when sending a check in.
 */
function captureCheckIn(checkIn, upsertMonitorConfig) {
  const scope = getCurrentScope();
  const client = getClient();
  if (!client) {
    DEBUG_BUILD && debug.warn('Cannot capture check-in. No client defined.');
  } else if (!client.captureCheckIn) {
    DEBUG_BUILD && debug.warn('Cannot capture check-in. Client does not support sending check-ins.');
  } else {
    return client.captureCheckIn(checkIn, upsertMonitorConfig, scope);
  }

  return uuid4();
}

/**
 * Wraps a callback with a cron monitor check in. The check in will be sent to Sentry when the callback finishes.
 *
 * @param monitorSlug The distinct slug of the monitor.
 * @param callback Callback to be monitored
 * @param upsertMonitorConfig An optional object that describes a monitor config. Use this if you want
 * to create a monitor automatically when sending a check in.
 */
function withMonitor(
  monitorSlug,
  callback,
  upsertMonitorConfig,
) {
  function runCallback() {
    const checkInId = captureCheckIn({ monitorSlug, status: 'in_progress' }, upsertMonitorConfig);
    const now = timestampInSeconds();

    function finishCheckIn(status) {
      captureCheckIn({ monitorSlug, status, checkInId, duration: timestampInSeconds() - now });
    }
    // Default behavior without isolateTrace
    let maybePromiseResult;
    try {
      maybePromiseResult = callback();
    } catch (e) {
      finishCheckIn('error');
      throw e;
    }

    if (isThenable(maybePromiseResult)) {
      return maybePromiseResult.then(
        r => {
          finishCheckIn('ok');
          return r;
        },
        e => {
          finishCheckIn('error');
          throw e;
        },
      ) ;
    }
    finishCheckIn('ok');

    return maybePromiseResult;
  }

  return withIsolationScope(() => (upsertMonitorConfig?.isolateTrace ? startNewTrace(runCallback) : runCallback()));
}

/**
 * Call `flush()` on the current client, if there is one. See {@link Client.flush}.
 *
 * @param timeout Maximum time in ms the client should wait to flush its event queue. Omitting this parameter will cause
 * the client to wait until all events are sent before resolving the promise.
 * @returns A promise which resolves to `true` if the queue successfully drains before the timeout, or `false` if it
 * doesn't (or if there's no client defined).
 */
async function flush(timeout) {
  const client = getClient();
  if (client) {
    return client.flush(timeout);
  }
  DEBUG_BUILD && debug.warn('Cannot flush events. No client defined.');
  return Promise.resolve(false);
}

/**
 * Call `close()` on the current client, if there is one. See {@link Client.close}.
 *
 * @param timeout Maximum time in ms the client should wait to flush its event queue before shutting down. Omitting this
 * parameter will cause the client to wait until all events are sent before disabling itself.
 * @returns A promise which resolves to `true` if the queue successfully drains before the timeout, or `false` if it
 * doesn't (or if there's no client defined).
 */
async function close(timeout) {
  const client = getClient();
  if (client) {
    return client.close(timeout);
  }
  DEBUG_BUILD && debug.warn('Cannot flush events and disable SDK. No client defined.');
  return Promise.resolve(false);
}

/**
 * Returns true if Sentry has been properly initialized.
 */
function isInitialized() {
  return !!getClient();
}

/** If the SDK is initialized & enabled. */
function isEnabled() {
  const client = getClient();
  return client?.getOptions().enabled !== false && !!client?.getTransport();
}

/**
 * Add an event processor.
 * This will be added to the current isolation scope, ensuring any event that is processed in the current execution
 * context will have the processor applied.
 */
function addEventProcessor(callback) {
  getIsolationScope().addEventProcessor(callback);
}

/**
 * Start a session on the current isolation scope.
 *
 * @param context (optional) additional properties to be applied to the returned session object
 *
 * @returns the new active session
 */
function startSession(context) {
  const isolationScope = getIsolationScope();
  const currentScope = getCurrentScope();

  // Will fetch userAgent if called from browser sdk
  const { userAgent } = GLOBAL_OBJ.navigator || {};

  const session = makeSession({
    user: currentScope.getUser() || isolationScope.getUser(),
    ...(userAgent && { userAgent }),
    ...context,
  });

  // End existing session if there's one
  const currentSession = isolationScope.getSession();
  if (currentSession?.status === 'ok') {
    updateSession(currentSession, { status: 'exited' });
  }

  endSession();

  // Afterwards we set the new session on the scope
  isolationScope.setSession(session);

  return session;
}

/**
 * End the session on the current isolation scope.
 */
function endSession() {
  const isolationScope = getIsolationScope();
  const currentScope = getCurrentScope();

  const session = currentScope.getSession() || isolationScope.getSession();
  if (session) {
    closeSession(session);
  }
  _sendSessionUpdate();

  // the session is over; take it off of the scope
  isolationScope.setSession();
}

/**
 * Sends the current Session on the scope
 */
function _sendSessionUpdate() {
  const isolationScope = getIsolationScope();
  const client = getClient();
  const session = isolationScope.getSession();
  if (session && client) {
    client.captureSession(session);
  }
}

/**
 * Sends the current session on the scope to Sentry
 *
 * @param end If set the session will be marked as exited and removed from the scope.
 *            Defaults to `false`.
 */
function captureSession(end = false) {
  // both send the update and pull the session from the scope
  if (end) {
    endSession();
    return;
  }

  // only send the update
  _sendSessionUpdate();
}

export { addEventProcessor, captureCheckIn, captureEvent, captureException, captureMessage, captureSession, close, endSession, flush, isEnabled, isInitialized, lastEventId, setContext, setExtra, setExtras, setTag, setTags, setUser, startSession, withMonitor };
//# sourceMappingURL=exports.js.map
