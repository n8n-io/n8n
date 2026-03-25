import type { Client, Integration, Options } from '@sentry/core';
import type { BrowserOptions } from './client';
/** Get the default integrations for the browser SDK. */
export declare function getDefaultIntegrations(_options: Options): Integration[];
/**
 * The Sentry Browser SDK Client.
 *
 * To use this SDK, call the {@link init} function as early as possible when
 * loading the web page. To set context information or send manual events, use
 * the provided methods.
 *
 * @example
 *
 * ```
 *
 * import { init } from '@sentry/browser';
 *
 * init({
 *   dsn: '__DSN__',
 *   // ...
 * });
 * ```
 *
 * @example
 * ```
 *
 * import { addBreadcrumb } from '@sentry/browser';
 * addBreadcrumb({
 *   message: 'My Breadcrumb',
 *   // ...
 * });
 * ```
 *
 * @example
 *
 * ```
 *
 * import * as Sentry from '@sentry/browser';
 * Sentry.captureMessage('Hello, world!');
 * Sentry.captureException(new Error('Good bye'));
 * Sentry.captureEvent({
 *   message: 'Manual',
 *   stacktrace: [
 *     // ...
 *   ],
 * });
 * ```
 *
 * @see {@link BrowserOptions} for documentation on configuration options.
 */
export declare function init(options?: BrowserOptions): Client | undefined;
/**
 * This function is here to be API compatible with the loader.
 * @hidden
 */
export declare function forceLoad(): void;
/**
 * This function is here to be API compatible with the loader.
 * @hidden
 */
export declare function onLoad(callback: () => void): void;
//# sourceMappingURL=sdk.d.ts.map