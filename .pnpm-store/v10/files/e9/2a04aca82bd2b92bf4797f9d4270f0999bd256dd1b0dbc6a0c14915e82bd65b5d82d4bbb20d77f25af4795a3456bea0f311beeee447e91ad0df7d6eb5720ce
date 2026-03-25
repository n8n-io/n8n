/**
 * @module
 * CSRF Protection Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
type IsAllowedOriginHandler = (origin: string, context: Context) => boolean | Promise<boolean>;
declare const secFetchSiteValues: readonly ["same-origin", "same-site", "none", "cross-site"];
type SecFetchSite = (typeof secFetchSiteValues)[number];
type IsAllowedSecFetchSiteHandler = (secFetchSite: SecFetchSite, context: Context) => boolean | Promise<boolean>;
interface CSRFOptions {
    origin?: string | string[] | IsAllowedOriginHandler;
    secFetchSite?: SecFetchSite | SecFetchSite[] | IsAllowedSecFetchSiteHandler;
}
/**
 * CSRF Protection Middleware for Hono.
 *
 * Protects against Cross-Site Request Forgery attacks by validating request origins
 * and sec-fetch-site headers. The request is allowed if either validation passes.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/csrf}
 *
 * @param {CSRFOptions} [options] - The options for the CSRF protection middleware.
 * @param {string|string[]|(origin: string, context: Context) => boolean} [options.origin] -
 *   Allowed origins for requests.
 *   - string: Single allowed origin (e.g., 'https://example.com')
 *   - string[]: Multiple allowed origins
 *   - function: Custom validation logic
 *   - Default: Only same origin as the request URL
 * @param {string|string[]|(secFetchSite: string, context: Context) => boolean} [options.secFetchSite] -
 *   Sec-Fetch-Site header validation. Standard values include 'same-origin', 'same-site', 'cross-site', 'none'.
 *   - string: Single allowed value (e.g., 'same-origin')
 *   - string[]: Multiple allowed values (e.g., ['same-origin', 'same-site'])
 *   - function: Custom validation with access to context
 *   - Default: Only allows 'same-origin'
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * // Default: both origin and sec-fetch-site validation
 * app.use('*', csrf())
 *
 * // Allow specific origins
 * app.use('*', csrf({ origin: 'https://example.com' }))
 * app.use('*', csrf({ origin: ['https://app.com', 'https://api.com'] }))
 *
 * // Allow specific sec-fetch-site values
 * app.use('*', csrf({ secFetchSite: 'same-origin' }))
 * app.use('*', csrf({ secFetchSite: ['same-origin', 'same-site'] }))
 *
 * // Dynamic sec-fetch-site validation
 * app.use('*', csrf({
 *   secFetchSite: (secFetchSite, c) => {
 *     // Always allow same-origin
 *     if (secFetchSite === 'same-origin') return true
 *     // Allow cross-site for webhook endpoints
 *     if (secFetchSite === 'cross-site' && c.req.path.startsWith('/webhook/')) {
 *       return true
 *     }
 *     return false
 *   }
 * }))
 *
 * // Dynamic origin validation
 * app.use('*', csrf({
 *   origin: (origin, c) => {
 *     // Allow same origin
 *     if (origin === new URL(c.req.url).origin) return true
 *     // Allow specific trusted domains
 *     return ['https://app.example.com', 'https://admin.example.com'].includes(origin)
 *   }
 * }))
 * ```
 */
export declare const csrf: (options?: CSRFOptions) => MiddlewareHandler;
export {};
