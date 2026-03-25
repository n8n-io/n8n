/**
 * @module
 * Request ID Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
export type RequestIdVariables = {
    requestId: string;
};
export type RequestIdOptions = {
    limitLength?: number;
    headerName?: string;
    generator?: (c: Context) => string;
};
/**
 * Request ID Middleware for Hono.
 *
 * @param {object} options - Options for Request ID middleware.
 * @param {number} [options.limitLength=255] - The maximum length of request id.
 * @param {string} [options.headerName=X-Request-Id] - The header name used in request id.
 * @param {generator} [options.generator=() => crypto.randomUUID()] - The request id generation function.
 *
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * type Variables = RequestIdVariables
 * const app = new Hono<{Variables: Variables}>()
 *
 * app.use(requestId())
 * app.get('/', (c) => {
 *   console.log(c.get('requestId')) // Debug
 *   return c.text('Hello World!')
 * })
 * ```
 */
export declare const requestId: ({ limitLength, headerName, generator, }?: RequestIdOptions) => MiddlewareHandler;
