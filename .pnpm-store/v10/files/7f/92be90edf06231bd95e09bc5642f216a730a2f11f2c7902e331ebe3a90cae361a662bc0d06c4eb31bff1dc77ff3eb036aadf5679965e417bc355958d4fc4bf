import type { Context } from '../../context';
import type { RouterRoute } from '../../types';
/**
 * Get matched routes in the handler
 *
 * @param {Context} c - The context object
 * @returns An array of matched routes
 *
 * @example
 * ```ts
 * import { matchedRoutes } from 'hono/route'
 *
 * app.use('*', async function logger(c, next) {
 *   await next()
 *   matchedRoutes(c).forEach(({ handler, method, path }, i) => {
 *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
 *     console.log(
 *       method,
 *       ' ',
 *       path,
 *       ' '.repeat(Math.max(10 - path.length, 0)),
 *       name,
 *       i === c.req.routeIndex ? '<- respond from here' : ''
 *     )
 *   })
 * })
 * ```
 */
export declare const matchedRoutes: (c: Context) => RouterRoute[];
/**
 * Get the route path registered within the handler
 *
 * @param {Context} c - The context object
 * @param {number} index - The index of the root from which to retrieve the path, similar to Array.prototype.at(), where a negative number is the index counted from the end of the matching root. Defaults to the current root index.
 * @returns The route path registered within the handler
 *
 * @example
 * ```ts
 * import { routePath } from 'hono/route'
 *
 * app.use('*', (c, next) => {
 *   console.log(routePath(c)) // '*'
 *   console.log(routePath(c, -1)) // '/posts/:id'
 *   return next()
 * })
 *
 * app.get('/posts/:id', (c) => {
 *   return c.text(routePath(c)) // '/posts/:id'
 * })
 * ```
 */
export declare const routePath: (c: Context, index?: number) => string;
/**
 * Get the basePath of the as-is route specified by routing.
 *
 * @param {Context} c - The context object
 * @param {number} index - The index of the root from which to retrieve the path, similar to Array.prototype.at(), where a negative number is the index counted from the end of the matching root. Defaults to the current root index.
 * @returns The basePath of the as-is route specified by routing.
 *
 * @example
 * ```ts
 * import { baseRoutePath } from 'hono/route'
 *
 * const app = new Hono()
 *
 * const subApp = new Hono()
 * subApp.get('/posts/:id', (c) => {
 *   return c.text(baseRoutePath(c)) // '/:sub'
 * })
 *
 * app.route('/:sub', subApp)
 * ```
 */
export declare const baseRoutePath: (c: Context, index?: number) => string;
export declare const basePath: (c: Context, index?: number) => string;
