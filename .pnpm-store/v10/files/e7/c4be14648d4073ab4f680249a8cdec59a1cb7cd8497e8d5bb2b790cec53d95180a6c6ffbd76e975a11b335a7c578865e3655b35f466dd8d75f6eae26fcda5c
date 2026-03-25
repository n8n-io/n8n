/**
 * @module
 * Pretty JSON Middleware for Hono.
 */
import type { MiddlewareHandler } from '../../types';
interface PrettyOptions {
    /**
     * Number of spaces for indentation.
     * @default 2
     */
    space?: number;
    /**
     * Query conditions for when to Pretty.
     * @default 'pretty'
     */
    query?: string;
    /**
     * Force prettification of JSON responses regardless of query parameters.
     * @default false
     */
    force?: boolean;
}
/**
 * Pretty JSON Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/pretty-json}
 *
 * @param options - The options for the pretty JSON middleware.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(prettyJSON()) // With options: prettyJSON({ space: 4 })
 * app.get('/', (c) => {
 *   return c.json({ message: 'Hono!' })
 * })
 * ```
 */
export declare const prettyJSON: (options?: PrettyOptions) => MiddlewareHandler;
export {};
