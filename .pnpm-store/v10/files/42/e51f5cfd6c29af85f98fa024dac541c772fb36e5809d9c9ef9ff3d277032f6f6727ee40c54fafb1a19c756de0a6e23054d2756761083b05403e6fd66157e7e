/**
 * @module
 * This module is the base module for the Hono object.
 */
import { Context } from './context';
import type { ExecutionContext } from './context';
import type { Router } from './router';
import type { Env, ErrorHandler, H, HandlerInterface, MergePath, MergeSchemaPath, MiddlewareHandlerInterface, NotFoundHandler, OnHandlerInterface, RouterRoute, Schema } from './types';
type GetPath<E extends Env> = (request: Request, options?: {
    env?: E['Bindings'];
}) => string;
export type HonoOptions<E extends Env> = {
    /**
     * `strict` option specifies whether to distinguish whether the last path is a directory or not.
     *
     * @see {@link https://hono.dev/docs/api/hono#strict-mode}
     *
     * @default true
     */
    strict?: boolean;
    /**
     * `router` option specifies which router to use.
     *
     * @see {@link https://hono.dev/docs/api/hono#router-option}
     *
     * @example
     * ```ts
     * const app = new Hono({ router: new RegExpRouter() })
     * ```
     */
    router?: Router<[H, RouterRoute]>;
    /**
     * `getPath` can handle the host header value.
     *
     * @see {@link https://hono.dev/docs/api/routing#routing-with-host-header-value}
     *
     * @example
     * ```ts
     * const app = new Hono({
     *  getPath: (req) =>
     *   '/' + req.headers.get('host') + req.url.replace(/^https?:\/\/[^/]+(\/[^?]*)/, '$1'),
     * })
     *
     * app.get('/www1.example.com/hello', () => c.text('hello www1'))
     *
     * // A following request will match the route:
     * // new Request('http://www1.example.com/hello', {
     * //  headers: { host: 'www1.example.com' },
     * // })
     * ```
     */
    getPath?: GetPath<E>;
};
type MountOptionHandler = (c: Context) => unknown;
type MountReplaceRequest = (originalRequest: Request) => Request;
type MountOptions = MountOptionHandler | {
    optionHandler?: MountOptionHandler;
    replaceRequest?: MountReplaceRequest | false;
};
declare class Hono<E extends Env = Env, S extends Schema = {}, BasePath extends string = '/', CurrentPath extends string = BasePath> {
             
    get: HandlerInterface<E, 'get', S, BasePath, CurrentPath>;
    post: HandlerInterface<E, 'post', S, BasePath, CurrentPath>;
    put: HandlerInterface<E, 'put', S, BasePath, CurrentPath>;
    delete: HandlerInterface<E, 'delete', S, BasePath, CurrentPath>;
    options: HandlerInterface<E, 'options', S, BasePath, CurrentPath>;
    patch: HandlerInterface<E, 'patch', S, BasePath, CurrentPath>;
    all: HandlerInterface<E, 'all', S, BasePath, CurrentPath>;
    on: OnHandlerInterface<E, S, BasePath>;
    use: MiddlewareHandlerInterface<E, S, BasePath>;
    router: Router<[H, RouterRoute]>;
    readonly getPath: GetPath<E>;
    private _basePath;
    routes: RouterRoute[];
    constructor(options?: HonoOptions<E>);
    private errorHandler;
    /**
     * `.route()` allows grouping other Hono instance in routes.
     *
     * @see {@link https://hono.dev/docs/api/routing#grouping}
     *
     * @param {string} path - base Path
     * @param {Hono} app - other Hono instance
     * @returns {Hono} routed Hono instance
     *
     * @example
     * ```ts
     * const app = new Hono()
     * const app2 = new Hono()
     *
     * app2.get("/user", (c) => c.text("user"))
     * app.route("/api", app2) // GET /api/user
     * ```
     */
    route<SubPath extends string, SubEnv extends Env, SubSchema extends Schema, SubBasePath extends string, SubCurrentPath extends string>(path: SubPath, app: Hono<SubEnv, SubSchema, SubBasePath, SubCurrentPath>): Hono<E, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> | S, BasePath, CurrentPath>;
    /**
     * `.basePath()` allows base paths to be specified.
     *
     * @see {@link https://hono.dev/docs/api/routing#base-path}
     *
     * @param {string} path - base Path
     * @returns {Hono} changed Hono instance
     *
     * @example
     * ```ts
     * const api = new Hono().basePath('/api')
     * ```
     */
    basePath<SubPath extends string>(path: SubPath): Hono<E, S, MergePath<BasePath, SubPath>, MergePath<BasePath, SubPath>>;
    /**
     * `.onError()` handles an error and returns a customized Response.
     *
     * @see {@link https://hono.dev/docs/api/hono#error-handling}
     *
     * @param {ErrorHandler} handler - request Handler for error
     * @returns {Hono} changed Hono instance
     *
     * @example
     * ```ts
     * app.onError((err, c) => {
     *   console.error(`${err}`)
     *   return c.text('Custom Error Message', 500)
     * })
     * ```
     */
    onError: (handler: ErrorHandler<E>) => Hono<E, S, BasePath, CurrentPath>;
    /**
     * `.notFound()` allows you to customize a Not Found Response.
     *
     * @see {@link https://hono.dev/docs/api/hono#not-found}
     *
     * @param {NotFoundHandler} handler - request handler for not-found
     * @returns {Hono} changed Hono instance
     *
     * @example
     * ```ts
     * app.notFound((c) => {
     *   return c.text('Custom 404 Message', 404)
     * })
     * ```
     */
    notFound: (handler: NotFoundHandler<E>) => Hono<E, S, BasePath, CurrentPath>;
    /**
     * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
     *
     * @see {@link https://hono.dev/docs/api/hono#mount}
     *
     * @param {string} path - base Path
     * @param {Function} applicationHandler - other Request Handler
     * @param {MountOptions} [options] - options of `.mount()`
     * @returns {Hono} mounted Hono instance
     *
     * @example
     * ```ts
     * import { Router as IttyRouter } from 'itty-router'
     * import { Hono } from 'hono'
     * // Create itty-router application
     * const ittyRouter = IttyRouter()
     * // GET /itty-router/hello
     * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
     *
     * const app = new Hono()
     * app.mount('/itty-router', ittyRouter.handle)
     * ```
     *
     * @example
     * ```ts
     * const app = new Hono()
     * // Send the request to another application without modification.
     * app.mount('/app', anotherApp, {
     *   replaceRequest: (req) => req,
     * })
     * ```
     */
    mount(path: string, applicationHandler: (request: Request, ...args: any) => Response | Promise<Response>, options?: MountOptions): Hono<E, S, BasePath, CurrentPath>;
    /**
     * `.fetch()` will be entry point of your app.
     *
     * @see {@link https://hono.dev/docs/api/hono#fetch}
     *
     * @param {Request} request - request Object of request
     * @param {Env} Env - env Object
     * @param {ExecutionContext} - context of execution
     * @returns {Response | Promise<Response>} response of request
     *
     */
    fetch: (request: Request, Env?: E['Bindings'] | {}, executionCtx?: ExecutionContext) => Response | Promise<Response>;
    /**
     * `.request()` is a useful method for testing.
     * You can pass a URL or pathname to send a GET request.
     * app will return a Response object.
     * ```ts
     * test('GET /hello is ok', async () => {
     *   const res = await app.request('/hello')
     *   expect(res.status).toBe(200)
     * })
     * ```
     * @see https://hono.dev/docs/api/hono#request
     */
    request: (input: Request | string | URL, requestInit?: RequestInit, Env?: E["Bindings"] | {}, executionCtx?: ExecutionContext) => Response | Promise<Response>;
    /**
     * `.fire()` automatically adds a global fetch event listener.
     * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
     * @deprecated
     * Use `fire` from `hono/service-worker` instead.
     * ```ts
     * import { Hono } from 'hono'
     * import { fire } from 'hono/service-worker'
     *
     * const app = new Hono()
     * // ...
     * fire(app)
     * ```
     * @see https://hono.dev/docs/api/hono#fire
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
     * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
     */
    fire: () => void;
}
export { Hono as HonoBase };
