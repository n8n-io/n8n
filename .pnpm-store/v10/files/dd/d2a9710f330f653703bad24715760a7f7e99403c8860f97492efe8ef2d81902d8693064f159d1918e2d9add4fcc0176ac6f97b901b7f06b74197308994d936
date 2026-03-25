import type { GetConnInfo } from '../../helper/conninfo';
/**
 * Get connection information from Cloudflare Pages
 * @param c - Context
 * @returns Connection information including remote address
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle, getConnInfo } from 'hono/cloudflare-pages'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => {
 *   const info = getConnInfo(c)
 *   return c.text(`Your IP: ${info.remote.address}`)
 * })
 *
 * export const onRequest = handle(app)
 * ```
 */
export declare const getConnInfo: GetConnInfo;
