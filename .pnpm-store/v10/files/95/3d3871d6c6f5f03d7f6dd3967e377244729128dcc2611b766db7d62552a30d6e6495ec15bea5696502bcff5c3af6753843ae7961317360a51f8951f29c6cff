import { Integration, IntegrationFn } from '@sentry/core';
export declare const INTEGRATION_NAME = "WebWorker";
interface WebWorkerIntegration extends Integration {
    addWorker: (worker: Worker) => void;
}
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
export declare const webWorkerIntegration: IntegrationFn<WebWorkerIntegration>;
/**
 * Minimal interface for DedicatedWorkerGlobalScope, only requiring the postMessage method.
 * (which is the only thing we need from the worker's global object)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope
 *
 * We can't use the actual type because it breaks everyone who doesn't have {"lib": ["WebWorker"]}
 * but uses {"skipLibCheck": true} in their tsconfig.json.
 */
interface MinimalDedicatedWorkerGlobalScope {
    postMessage: (message: unknown) => void;
    addEventListener: (type: string, listener: (event: unknown) => void) => void;
    location?: {
        href?: string;
    };
}
interface RegisterWebWorkerOptions {
    self: MinimalDedicatedWorkerGlobalScope & {
        _sentryDebugIds?: Record<string, string>;
        _sentryModuleMetadata?: Record<string, any>;
    };
}
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
export declare function registerWebWorker({ self }: RegisterWebWorkerOptions): void;
export {};
//# sourceMappingURL=webWorker.d.ts.map
