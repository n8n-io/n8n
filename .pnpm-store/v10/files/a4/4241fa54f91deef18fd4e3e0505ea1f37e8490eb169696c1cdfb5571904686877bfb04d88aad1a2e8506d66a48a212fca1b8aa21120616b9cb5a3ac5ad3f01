/**
 * @module
 * Proxy Helper for Hono.
 */
import type { RequestHeader } from '../../utils/headers';
interface ProxyRequestInit extends Omit<RequestInit, 'headers'> {
    raw?: Request;
    headers?: HeadersInit | [string, string][] | Record<RequestHeader, string | undefined> | Record<string, string | undefined>;
    customFetch?: (request: Request) => Promise<Response>;
    /**
     * Enable strict RFC 9110 compliance for Connection header processing.
     *
     * - `false` (default): Ignores Connection header to prevent potential
     *   Hop-by-Hop Header Injection attacks. Recommended for untrusted clients.
     * - `true`: Processes Connection header per RFC 9110 and removes listed headers.
     *   Only use in trusted environments.
     *
     * @default false
     * @see https://datatracker.ietf.org/doc/html/rfc9110#section-7.6.1
     */
    strictConnectionProcessing?: boolean;
}
interface ProxyFetch {
    (input: string | URL | Request, init?: ProxyRequestInit): Promise<Response>;
}
/**
 * Fetch API wrapper for proxy.
 * The parameters and return value are the same as for `fetch` (except for the proxy-specific options).
 *
 * The “Accept-Encoding” header is replaced with an encoding that the current runtime can handle.
 * Unnecessary response headers are deleted and a Response object is returned that can be returned
 * as is as a response from the handler.
 *
 * @example
 * ```ts
 * app.get('/proxy/:path', (c) => {
 *   return proxy(`http://${originServer}/${c.req.param('path')}`, {
 *     headers: {
 *       ...c.req.header(), // optional, specify only when forwarding all the request data (including credentials) is necessary.
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   }).then((res) => {
 *     res.headers.delete('Set-Cookie')
 *     return res
 *   })
 * })
 *
 * app.all('/proxy/:path', (c) => {
 *   return proxy(`http://${originServer}/${c.req.param('path')}`, {
 *     ...c.req, // optional, specify only when forwarding all the request data (including credentials) is necessary.
 *     headers: {
 *       ...c.req.header(),
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   })
 * })
 *
 * // Strict RFC compliance mode (use only in trusted environments)
 * app.get('/internal-proxy/:path', (c) => {
 *   return proxy(`http://${internalServer}/${c.req.param('path')}`, {
 *     ...c.req,
 *     strictConnectionProcessing: true,
 *   })
 * })
 * ```
 */
export declare const proxy: ProxyFetch;
export {};
