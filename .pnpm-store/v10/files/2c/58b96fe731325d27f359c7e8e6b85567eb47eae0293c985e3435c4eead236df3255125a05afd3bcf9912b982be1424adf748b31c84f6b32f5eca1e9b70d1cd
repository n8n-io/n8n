/**
 * @module
 * Cache Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
import type { StatusCode } from '../../utils/http-status';
/**
 * Cache Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cache}
 *
 * @param {Object} options - The options for the cache middleware.
 * @param {string | Function} options.cacheName - The name of the cache. Can be used to store multiple caches with different identifiers.
 * @param {boolean} [options.wait=false] - A boolean indicating if Hono should wait for the Promise of the `cache.put` function to resolve before continuing with the request. Required to be true for the Deno environment.
 * @param {string} [options.cacheControl] - A string of directives for the `Cache-Control` header.
 * @param {string | string[]} [options.vary] - Sets the `Vary` header in the response. If the original response header already contains a `Vary` header, the values are merged, removing any duplicates.
 * @param {Function} [options.keyGenerator] - Generates keys for every request in the `cacheName` store. This can be used to cache data based on request parameters or context parameters.
 * @param {number[]} [options.cacheableStatusCodes=[200]] - An array of status codes that can be cached.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If the `vary` option includes "*".
 *
 * @example
 * ```ts
 * app.get(
 *   '*',
 *   cache({
 *     cacheName: 'my-app',
 *     cacheControl: 'max-age=3600',
 *   })
 * )
 * ```
 */
export declare const cache: (options: {
    cacheName: string | ((c: Context) => Promise<string> | string);
    wait?: boolean;
    cacheControl?: string;
    vary?: string | string[];
    keyGenerator?: (c: Context) => Promise<string> | string;
    cacheableStatusCodes?: StatusCode[];
}) => MiddlewareHandler;
