/**
 * @module
 * ETag Middleware for Hono.
 */
import type { MiddlewareHandler } from '../../types';
type ETagOptions = {
    retainedHeaders?: string[];
    weak?: boolean;
    generateDigest?: (body: Uint8Array<ArrayBuffer>) => ArrayBuffer | Promise<ArrayBuffer>;
};
/**
 * Default headers to pass through on 304 responses. From the spec:
 * > The response must not contain a body and must include the headers that
 * > would have been sent in an equivalent 200 OK response: Cache-Control,
 * > Content-Location, Date, ETag, Expires, and Vary.
 */
export declare const RETAINED_304_HEADERS: string[];
/**
 * ETag Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/etag}
 *
 * @param {ETagOptions} [options] - The options for the ETag middleware.
 * @param {boolean} [options.weak=false] - Define using or not using a weak validation. If true is set, then `W/` is added to the prefix of the value.
 * @param {string[]} [options.retainedHeaders=RETAINED_304_HEADERS] - The headers that you want to retain in the 304 Response.
 * @param {function(Uint8Array): ArrayBuffer | Promise<ArrayBuffer>} [options.generateDigest] -
 * A custom digest generation function. By default, it uses 'SHA-1'
 * This function is called with the response body as a `Uint8Array` and should return a hash as an `ArrayBuffer` or a Promise of one.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use('/etag/*', etag())
 * app.get('/etag/abc', (c) => {
 *   return c.text('Hono is hot')
 * })
 * ```
 */
export declare const etag: (options?: ETagOptions) => MiddlewareHandler;
export {};
