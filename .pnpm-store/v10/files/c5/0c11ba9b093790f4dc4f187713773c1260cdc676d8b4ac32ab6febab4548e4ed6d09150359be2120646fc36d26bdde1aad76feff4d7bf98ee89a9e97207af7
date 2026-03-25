/**
 * @module
 * Powered By Middleware for Hono.
 */
import type { MiddlewareHandler } from '../../types';
type PoweredByOptions = {
    /**
     * The value for X-Powered-By header.
     * @default Hono
     */
    serverName?: string;
};
/**
 * Powered By Middleware for Hono.
 *
 * @param options - The options for the Powered By Middleware.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * import { poweredBy } from 'hono/powered-by'
 *
 * const app = new Hono()
 *
 * app.use(poweredBy()) // With options: poweredBy({ serverName: "My Server" })
 * ```
 */
export declare const poweredBy: (options?: PoweredByOptions) => MiddlewareHandler;
export {};
