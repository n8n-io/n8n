Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const eventbuilder = require('../eventbuilder.js');
const helpers = require('../helpers.js');
const globalhandlers = require('./globalhandlers.js');

const INTEGRATION_NAME = 'WebWorker';

/**
 * Use this integration to set up Sentry with web workers.
 *
 * IMPORTANT: This integration must be added **before** you start listening to
 * any messages from the worker. Otherwise, your message handlers will receive
 * messages from the Sentry SDK which you need to ignore.
 *
 * This integration only has an effect, if you call `Sentry.registerWebWorker(self)`
 * from within the worker(s) you're adding to the integration.
 *
 * Given that you want to initialize the SDK as early as possible, you most likely
 * want to add this integration **after** initializing the SDK:
 *
 * @example:
 * ```ts filename={main.js}
 * import * as Sentry from '@sentry/<your-sdk>';
 *
 * // some time earlier:
 * Sentry.init(...)
 *
 * // 1. Initialize the worker
 * const worker = new Worker(new URL('./worker.ts', import.meta.url));
 *
 * // 2. Add the integration
 * const webWorkerIntegration = Sentry.webWorkerIntegration({ worker });
 * Sentry.addIntegration(webWorkerIntegration);
 *
 * // 3. Register message listeners on the worker
 * worker.addEventListener('message', event => {
 *  // ...
 * });
 * ```
 *
 * If you initialize multiple workers at the same time, you can also pass an array of workers
 * to the integration:
 *
 * ```ts filename={main.js}
 * const webWorkerIntegration = Sentry.webWorkerIntegration({ worker: [worker1, worker2] });
 * Sentry.addIntegration(webWorkerIntegration);
 * ```
 *
 * If you have any additional workers that you initialize at a later point,
 * you can add them to the integration as follows:
 *
 * ```ts filename={main.js}
 * const webWorkerIntegration = Sentry.webWorkerIntegration({ worker: worker1 });
 * Sentry.addIntegration(webWorkerIntegration);
 *
 * // sometime later:
 * webWorkerIntegration.addWorker(worker2);
 * ```
 *
 * Of course, you can also directly add the integration in Sentry.init:
 * ```ts filename={main.js}
 * import * as Sentry from '@sentry/<your-sdk>';
 *
 * // 1. Initialize the worker
 * const worker = new Worker(new URL('./worker.ts', import.meta.url));
 *
 * // 2. Initialize the SDK
 * Sentry.init({
 *  integrations: [Sentry.webWorkerIntegration({ worker })]
 * });
 *
 * // 3. Register message listeners on the worker
 * worker.addEventListener('message', event => {
 *  // ...
 * });
 * ```
 *
 * @param options {WebWorkerIntegrationOptions} Integration options:
 *   - `worker`: The worker instance.
 */
const webWorkerIntegration = core.defineIntegration(({ worker }) => ({
  name: INTEGRATION_NAME,
  setupOnce: () => {
    (Array.isArray(worker) ? worker : [worker]).forEach(w => listenForSentryMessages(w));
  },
  addWorker: (worker) => listenForSentryMessages(worker),
})) ;

function listenForSentryMessages(worker) {
  worker.addEventListener('message', event => {
    if (isSentryMessage(event.data)) {
      event.stopImmediatePropagation(); // other listeners should not receive this message

      // Handle debug IDs
      if (event.data._sentryDebugIds) {
        debugBuild.DEBUG_BUILD && core.debug.log('Sentry debugId web worker message received', event.data);
        helpers.WINDOW._sentryDebugIds = {
          ...event.data._sentryDebugIds,
          // debugIds of the main thread have precedence over the worker's in case of a collision.
          ...helpers.WINDOW._sentryDebugIds,
        };
      }

      // Handle module metadata
      if (event.data._sentryModuleMetadata) {
        debugBuild.DEBUG_BUILD && core.debug.log('Sentry module metadata web worker message received', event.data);
        // Merge worker's raw metadata into the global object
        // It will be parsed lazily when needed by getMetadataForUrl
        helpers.WINDOW._sentryModuleMetadata = {
          ...event.data._sentryModuleMetadata,
          // Module metadata of the main thread have precedence over the worker's in case of a collision.
          ...helpers.WINDOW._sentryModuleMetadata,
        };
      }

      // Handle WASM images from worker
      if (event.data._sentryWasmImages) {
        debugBuild.DEBUG_BUILD && core.debug.log('Sentry WASM images web worker message received', event.data);
        const existingImages =
          (helpers.WINDOW )._sentryWasmImages || [];
        const newImages = event.data._sentryWasmImages.filter(
          (newImg) =>
            core.isPlainObject(newImg) &&
            typeof newImg.code_file === 'string' &&
            !existingImages.some(existing => existing.code_file === newImg.code_file),
        );
        (helpers.WINDOW )._sentryWasmImages = [
          ...existingImages,
          ...newImages,
        ];
      }

      // Handle unhandled rejections forwarded from worker
      if (event.data._sentryWorkerError) {
        debugBuild.DEBUG_BUILD && core.debug.log('Sentry worker rejection message received', event.data._sentryWorkerError);
        handleForwardedWorkerRejection(event.data._sentryWorkerError);
      }
    }
  });
}

function handleForwardedWorkerRejection(workerError) {
  const client = core.getClient();
  if (!client) {
    return;
  }

  const stackParser = client.getOptions().stackParser;
  const attachStacktrace = client.getOptions().attachStacktrace;

  const error = workerError.reason;

  // Follow same pattern as globalHandlers for unhandledrejection
  // Handle both primitives and errors the same way
  const event = core.isPrimitive(error)
    ? globalhandlers._eventFromRejectionWithPrimitive(error)
    : eventbuilder.eventFromUnknownInput(stackParser, error, undefined, attachStacktrace, true);

  event.level = 'error';

  // Add worker-specific context
  if (workerError.filename) {
    event.contexts = {
      ...event.contexts,
      worker: {
        filename: workerError.filename,
      },
    };
  }

  core.captureEvent(event, {
    originalException: error,
    mechanism: {
      handled: false,
      type: 'auto.browser.web_worker.onunhandledrejection',
    },
  });

  debugBuild.DEBUG_BUILD && core.debug.log('Captured worker unhandled rejection', error);
}

/**
 * Minimal interface for DedicatedWorkerGlobalScope, only requiring the postMessage method.
 * (which is the only thing we need from the worker's global object)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope
 *
 * We can't use the actual type because it breaks everyone who doesn't have {"lib": ["WebWorker"]}
 * but uses {"skipLibCheck": true} in their tsconfig.json.
 */

/**
 * Use this function to register the worker with the Sentry SDK.
 *
 * This function will:
 * - Send debug IDs to the parent thread
 * - Send module metadata to the parent thread (for thirdPartyErrorFilterIntegration)
 * - Set up a handler for unhandled rejections in the worker
 * - Forward unhandled rejections to the parent thread for capture
 *
 * Note: Synchronous errors in workers are already captured by globalHandlers.
 * This only handles unhandled promise rejections which don't bubble to the parent.
 *
 * @example
 * ```ts filename={worker.js}
 * import * as Sentry from '@sentry/<your-sdk>';
 *
 * // Do this as early as possible in your worker.
 * Sentry.registerWebWorker({ self });
 *
 * // continue setting up your worker
 * self.postMessage(...)
 * ```
 * @param options {RegisterWebWorkerOptions} Integration options:
 *   - `self`: The worker instance you're calling this function from (self).
 */
function registerWebWorker({ self }) {
  // Send debug IDs and raw module metadata to parent thread
  // The metadata will be parsed lazily on the main thread when needed
  self.postMessage({
    _sentryMessage: true,
    _sentryDebugIds: self._sentryDebugIds ?? undefined,
    _sentryModuleMetadata: self._sentryModuleMetadata ?? undefined,
  });

  // Set up unhandledrejection handler inside the worker
  // Following the same pattern as globalHandlers
  // unhandled rejections don't bubble to the parent thread, so we need to handle them here
  self.addEventListener('unhandledrejection', (event) => {
    const reason = globalhandlers._getUnhandledRejectionError(event);

    // Forward the raw reason to parent thread
    // The parent will handle primitives vs errors the same way globalHandlers does
    const serializedError = {
      reason: reason,
      filename: self.location?.href,
    };

    // Forward to parent thread
    self.postMessage({
      _sentryMessage: true,
      _sentryWorkerError: serializedError,
    });

    debugBuild.DEBUG_BUILD && core.debug.log('[Sentry Worker] Forwarding unhandled rejection to parent', serializedError);
  });

  debugBuild.DEBUG_BUILD && core.debug.log('[Sentry Worker] Registered worker with unhandled rejection handling');
}

function isSentryMessage(eventData) {
  if (!core.isPlainObject(eventData) || eventData._sentryMessage !== true) {
    return false;
  }

  // Must have at least one of: debug IDs, module metadata, worker error, or WASM images
  const hasDebugIds = '_sentryDebugIds' in eventData;
  const hasModuleMetadata = '_sentryModuleMetadata' in eventData;
  const hasWorkerError = '_sentryWorkerError' in eventData;
  const hasWasmImages = '_sentryWasmImages' in eventData;

  if (!hasDebugIds && !hasModuleMetadata && !hasWorkerError && !hasWasmImages) {
    return false;
  }

  // Validate debug IDs if present
  if (hasDebugIds && !(core.isPlainObject(eventData._sentryDebugIds) || eventData._sentryDebugIds === undefined)) {
    return false;
  }

  // Validate module metadata if present
  if (
    hasModuleMetadata &&
    !(core.isPlainObject(eventData._sentryModuleMetadata) || eventData._sentryModuleMetadata === undefined)
  ) {
    return false;
  }

  // Validate worker error if present
  if (hasWorkerError && !core.isPlainObject(eventData._sentryWorkerError)) {
    return false;
  }

  // Validate WASM images if present
  if (
    hasWasmImages &&
    (!Array.isArray(eventData._sentryWasmImages) ||
      !eventData._sentryWasmImages.every(
        (img) => core.isPlainObject(img) && typeof (img ).code_file === 'string',
      ))
  ) {
    return false;
  }

  return true;
}

exports.INTEGRATION_NAME = INTEGRATION_NAME;
exports.registerWebWorker = registerWebWorker;
exports.webWorkerIntegration = webWorkerIntegration;
//# sourceMappingURL=webWorker.js.map
