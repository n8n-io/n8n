Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('node:util/types');
const node_worker_threads = require('node:worker_threads');
const core = require('@sentry/core');
const nodeNativeStacktrace = require('@sentry-internal/node-native-stacktrace');
const common = require('./common.js');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const INTEGRATION_NAME = 'ThreadBlocked';
const DEFAULT_THRESHOLD_MS = 1000;

function log(message, ...args) {
  core.debug.log(`[Sentry Event Loop Blocked] ${message}`, ...args);
}

/**
 * Gets contexts by calling all event processors. This shouldn't be called until all integrations are setup
 */
async function getContexts(client) {
  let event = { message: INTEGRATION_NAME };
  const eventHint = {};

  for (const processor of client.getEventProcessors()) {
    if (event === null) break;
    event = await processor(event, eventHint);
  }

  return event?.contexts || {};
}

function poll(enabled, clientOptions) {
  try {
    const currentSession = core.getIsolationScope().getSession();
    // We need to copy the session object and remove the toJSON method so it can be sent to the worker
    // serialized without making it a SerializedSession
    const session = currentSession ? { ...currentSession, toJSON: undefined } : undefined;
    // message the worker to tell it the main event loop is still running
    nodeNativeStacktrace.threadPoll(enabled, { session, debugImages: core.getFilenameToDebugIdMap(clientOptions.stackParser) });
  } catch {
    // we ignore all errors
  }
}

/**
 * Starts polling
 */
function startPolling(
  client,
  integrationOptions,
) {
  if (client.asyncLocalStorageLookup) {
    const { asyncLocalStorage, contextSymbol } = client.asyncLocalStorageLookup;
    nodeNativeStacktrace.registerThread({ asyncLocalStorage, stateLookup: ['_currentContext', contextSymbol] });
  } else {
    nodeNativeStacktrace.registerThread();
  }

  let enabled = true;

  const initOptions = client.getOptions();
  const pollInterval = (integrationOptions.threshold || DEFAULT_THRESHOLD_MS) / common.POLL_RATIO;

  // unref so timer does not block exit
  setInterval(() => poll(enabled, initOptions), pollInterval).unref();

  return {
    start: () => {
      enabled = true;
    },
    stop: () => {
      enabled = false;
      // poll immediately because the timer above might not get a chance to run
      // before the event loop gets blocked
      poll(enabled, initOptions);
    },
  };
}

/**
 * Starts the worker thread that will monitor the other threads.
 *
 * This function is only called in the main thread.
 */
async function startWorker(
  dsn,
  client,
  integrationOptions,
) {
  const contexts = await getContexts(client);

  // These will not be accurate if sent later from the worker thread
  delete contexts.app?.app_memory;
  delete contexts.device?.free_memory;

  const initOptions = client.getOptions();

  const sdkMetadata = client.getSdkMetadata() || {};
  if (sdkMetadata.sdk) {
    sdkMetadata.sdk.integrations = initOptions.integrations.map(i => i.name);
  }

  const options = {
    debug: core.debug.isEnabled(),
    dsn,
    tunnel: initOptions.tunnel,
    environment: initOptions.environment || 'production',
    release: initOptions.release,
    dist: initOptions.dist,
    sdkMetadata,
    appRootPath: integrationOptions.appRootPath,
    threshold: integrationOptions.threshold || DEFAULT_THRESHOLD_MS,
    maxEventsPerHour: integrationOptions.maxEventsPerHour || 1,
    staticTags: integrationOptions.staticTags || {},
    contexts,
  };

  const worker = new node_worker_threads.Worker(new URL('./event-loop-block-watchdog.js', (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('event-loop-block-integration.js', document.baseURI).href))), {
    workerData: options,
    // We don't want any Node args like --import to be passed to the worker
    execArgv: [],
    env: { ...process.env, NODE_OPTIONS: undefined },
  });

  process.on('exit', () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    worker.terminate();
  });

  worker.once('error', (err) => {
    log('watchdog worker error', err);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    worker.terminate();
  });

  worker.once('exit', (code) => {
    log('watchdog worker exit', code);
  });

  // Ensure this thread can't block app exit
  worker.unref();
}

const _eventLoopBlockIntegration = ((options = {}) => {
  let polling;

  return {
    name: INTEGRATION_NAME,
    async afterAllSetup(client) {
      const dsn = client.getDsn();

      if (!dsn) {
        log('No DSN configured, skipping starting integration');
        return;
      }

      // Otel is not setup until after afterAllSetup returns.
      setImmediate(async () => {
        try {
          polling = startPolling(client, options);

          if (node_worker_threads.isMainThread) {
            await startWorker(dsn, client, options);
          }
        } catch (err) {
          log('Failed to start integration', err);
          return;
        }
      });
    },
    start() {
      polling?.start();
    },
    stop() {
      polling?.stop();
    },
  } ;
}) ;

/**
 * Monitors the Node.js event loop for blocking behavior and reports blocked events to Sentry.
 *
 * Uses a background worker thread to detect when the main thread is blocked for longer than
 * the configured threshold (default: 1 second).
 *
 * When instrumenting via the `--import` flag, this integration will
 * automatically monitor all worker threads as well.
 *
 * ```js
 * // instrument.mjs
 * import * as Sentry from '@sentry/node';
 * import { eventLoopBlockIntegration } from '@sentry/node-native';
 *
 * Sentry.init({
 *   dsn: '__YOUR_DSN__',
 *   integrations: [
 *     eventLoopBlockIntegration({
 *       threshold: 500, // Report blocks longer than 500ms
 *     }),
 *   ],
 * });
 * ```
 *
 * Start your application with:
 * ```bash
 * node --import instrument.mjs app.mjs
 * ```
 */
const eventLoopBlockIntegration = core.defineIntegration(_eventLoopBlockIntegration);

/**
 * Disables Event Loop Block detection for the current thread for the duration
 * of the callback.
 *
 * This utility function allows you to disable block detection during operations that
 * are expected to block the event loop, such as intensive computational tasks or
 * synchronous I/O operations.
 */
function disableBlockDetectionForCallback(callback) {
  const integration = core.getClient()?.getIntegrationByName(INTEGRATION_NAME) ;

  if (!integration) {
    return callback();
  }

  integration.stop();

  try {
    const result = callback();
    if (types.isPromise(result)) {
      return result.finally(() => integration.start());
    }

    integration.start();
    return result;
  } catch (error) {
    integration.start();
    throw error;
  }
}

/**
 * Pauses the block detection integration.
 *
 * This function pauses event loop block detection for the current thread.
 */
function pauseEventLoopBlockDetection() {
  const integration = core.getClient()?.getIntegrationByName(INTEGRATION_NAME) ;

  if (!integration) {
    return;
  }

  integration.stop();
}

/**
 * Restarts the block detection integration.
 *
 * This function restarts event loop block detection for the current thread.
 */
function restartEventLoopBlockDetection() {
  const integration = core.getClient()?.getIntegrationByName(INTEGRATION_NAME) ;

  if (!integration) {
    return;
  }

  integration.start();
}

exports.disableBlockDetectionForCallback = disableBlockDetectionForCallback;
exports.eventLoopBlockIntegration = eventLoopBlockIntegration;
exports.pauseEventLoopBlockDetection = pauseEventLoopBlockDetection;
exports.restartEventLoopBlockDetection = restartEventLoopBlockDetection;
//# sourceMappingURL=event-loop-block-integration.js.map
