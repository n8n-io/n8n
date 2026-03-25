/**
 * @module
 * Trailing Slash Middleware for Hono.
 */
import type { MiddlewareHandler } from '../../types';
type TrimTrailingSlashOptions = {
    /**
     * If `true`, the middleware will always redirect requests with a trailing slash
     * before executing handlers.
     * This is useful for routes with wildcards (`*`).
     * If `false` (default), it will only redirect when the route is not found (404).
     * @default false
     */
    alwaysRedirect?: boolean;
};
/**
 * Trailing Slash Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/trailing-slash}
 *
 * @param {TrimTrailingSlashOptions} options - The options for the middleware.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(trimTrailingSlash())
 * app.get('/about/me/', (c) => c.text('With Trailing Slash'))
 * ```
 *
 * @example
 * ```ts
 * // With alwaysRedirect option for wildcard routes
 * const app = new Hono()
 *
 * app.use(trimTrailingSlash({ alwaysRedirect: true }))
 * app.get('/my-path/*', (c) => c.text('Wildcard route'))
 * ```
 */
export declare const trimTrailingSlash: (options?: TrimTrailingSlashOptions) => MiddlewareHandler;
type AppendTrailingSlashOptions = {
    /**
     * If `true`, the middleware will always redirect requests without a trailing slash
     * before executing handlers.
     * This is useful for routes with wildcards (`*`).
     * If `false` (default), it will only redirect when the route is not found (404).
     * @default false
     */
    alwaysRedirect?: boolean;
};
/**
 * Append trailing slash middleware for Hono.
 * Append a trailing slash to the URL if it doesn't have one. For example, `/path/to/page` will be redirected to `/path/to/page/`.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/trailing-slash}
 *
 * @param {AppendTrailingSlashOptions} options - The options for the middleware.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(appendTrailingSlash())
 * ```
 *
 * @example
 * ```ts
 * // With alwaysRedirect option for wildcard routes
 * const app = new Hono()
 *
 * app.use(appendTrailingSlash({ alwaysRedirect: true }))
 * app.get('/my-path/*', (c) => c.text('Wildcard route'))
 * ```
 */
export declare const appendTrailingSlash: (options?: AppendTrailingSlashOptions) => MiddlewareHandler;
export {};
