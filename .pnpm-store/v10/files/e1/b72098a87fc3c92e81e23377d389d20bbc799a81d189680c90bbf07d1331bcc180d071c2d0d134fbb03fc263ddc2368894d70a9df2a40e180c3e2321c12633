/**
 * @module
 * Body Limit Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
type OnError = (c: Context) => Response | Promise<Response>;
type BodyLimitOptions = {
    maxSize: number;
    onError?: OnError;
};
/**
 * Body Limit Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/body-limit}
 *
 * @param {BodyLimitOptions} options - The options for the body limit middleware.
 * @param {number} options.maxSize - The maximum body size allowed.
 * @param {OnError} [options.onError] - The error handler to be invoked if the specified body size is exceeded.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.post(
 *   '/upload',
 *   bodyLimit({
 *     maxSize: 50 * 1024, // 50kb
 *     onError: (c) => {
 *       return c.text('overflow :(', 413)
 *     },
 *   }),
 *   async (c) => {
 *     const body = await c.req.parseBody()
 *     if (body['file'] instanceof File) {
 *       console.log(`Got file sized: ${body['file'].size}`)
 *     }
 *     return c.text('pass :)')
 *   }
 * )
 * ```
 */
export declare const bodyLimit: (options: BodyLimitOptions) => MiddlewareHandler;
export {};
