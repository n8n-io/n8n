/**
 * @module
 * CORS Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
type CORSOptions = {
    origin: string | string[] | ((origin: string, c: Context) => Promise<string | undefined | null> | string | undefined | null);
    allowMethods?: string[] | ((origin: string, c: Context) => Promise<string[]> | string[]);
    allowHeaders?: string[];
    maxAge?: number;
    credentials?: boolean;
    exposeHeaders?: string[];
};
/**
 * CORS Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cors}
 *
 * @param {CORSOptions} [options] - The options for the CORS middleware.
 * @param {string | string[] | ((origin: string, c: Context) => Promise<string | undefined | null> | string | undefined | null)} [options.origin='*'] - The value of "Access-Control-Allow-Origin" CORS header.
 * @param {string[] | ((origin: string, c: Context) => Promise<string[]> | string[])} [options.allowMethods=['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH']] - The value of "Access-Control-Allow-Methods" CORS header.
 * @param {string[]} [options.allowHeaders=[]] - The value of "Access-Control-Allow-Headers" CORS header.
 * @param {number} [options.maxAge] - The value of "Access-Control-Max-Age" CORS header.
 * @param {boolean} [options.credentials] - The value of "Access-Control-Allow-Credentials" CORS header.
 * @param {string[]} [options.exposeHeaders=[]] - The value of "Access-Control-Expose-Headers" CORS header.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use('/api/*', cors())
 * app.use(
 *   '/api2/*',
 *   cors({
 *     origin: 'http://example.com',
 *     allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
 *     allowMethods: ['POST', 'GET', 'OPTIONS'],
 *     exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
 *     maxAge: 600,
 *     credentials: true,
 *   })
 * )
 *
 * app.all('/api/abc', (c) => {
 *   return c.json({ success: true })
 * })
 * app.all('/api2/abc', (c) => {
 *   return c.json({ success: true })
 * })
 * ```
 */
export declare const cors: (options?: CORSOptions) => MiddlewareHandler;
export {};
