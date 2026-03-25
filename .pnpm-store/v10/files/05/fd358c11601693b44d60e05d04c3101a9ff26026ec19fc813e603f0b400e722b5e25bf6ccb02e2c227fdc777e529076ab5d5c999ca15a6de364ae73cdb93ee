import { Integration } from '@sentry/core';
import { ThreadBlockedIntegrationOptions } from './common';
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
export declare const eventLoopBlockIntegration: (options?: Partial<ThreadBlockedIntegrationOptions> | undefined) => Integration;
export declare function disableBlockDetectionForCallback<T>(callback: () => T): T;
export declare function disableBlockDetectionForCallback<T>(callback: () => Promise<T>): Promise<T>;
/**
 * Pauses the block detection integration.
 *
 * This function pauses event loop block detection for the current thread.
 */
export declare function pauseEventLoopBlockDetection(): void;
/**
 * Restarts the block detection integration.
 *
 * This function restarts event loop block detection for the current thread.
 */
export declare function restartEventLoopBlockDetection(): void;
//# sourceMappingURL=event-loop-block-integration.d.ts.map
