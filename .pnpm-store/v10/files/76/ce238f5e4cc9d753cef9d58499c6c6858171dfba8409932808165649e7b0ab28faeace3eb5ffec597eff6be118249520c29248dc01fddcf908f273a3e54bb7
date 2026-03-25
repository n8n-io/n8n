import { GET_MATCH_RESULT } from './request/constants';
import type { Result } from './router';
import type { Input, InputToDataByTarget, ParamKeyToRecord, ParamKeys, RemoveQuestion, RouterRoute, ValidationTargets } from './types';
import type { BodyData, ParseBodyOptions } from './utils/body';
import type { CustomHeader, RequestHeader } from './utils/headers';
import type { Simplify, UnionToIntersection } from './utils/types';
type Body = {
    json: any;
    text: string;
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    formData: FormData;
};
type BodyCache = Partial<Body & {
    parsedBody: BodyData;
}>;
export declare class HonoRequest<P extends string = '/', I extends Input['out'] = {}> {
             
    /**
     * `.raw` can get the raw Request object.
     *
     * @see {@link https://hono.dev/docs/api/request#raw}
     *
     * @example
     * ```ts
     * // For Cloudflare Workers
     * app.post('/', async (c) => {
     *   const metadata = c.req.raw.cf?.hostMetadata?
     *   ...
     * })
     * ```
     */
    raw: Request;
    routeIndex: number;
    /**
     * `.path` can get the pathname of the request.
     *
     * @see {@link https://hono.dev/docs/api/request#path}
     *
     * @example
     * ```ts
     * app.get('/about/me', (c) => {
     *   const pathname = c.req.path // `/about/me`
     * })
     * ```
     */
    path: string;
    bodyCache: BodyCache;
    constructor(request: Request, path?: string, matchResult?: Result<[unknown, RouterRoute]>);
    /**
     * `.req.param()` gets the path parameters.
     *
     * @see {@link https://hono.dev/docs/api/routing#path-parameter}
     *
     * @example
     * ```ts
     * const name = c.req.param('name')
     * // or all parameters at once
     * const { id, comment_id } = c.req.param()
     * ```
     */
    param<P2 extends ParamKeys<P> = ParamKeys<P>>(key: string extends P ? never : P2 extends `${infer _}?` ? never : P2): string;
    param<P2 extends RemoveQuestion<ParamKeys<P>> = RemoveQuestion<ParamKeys<P>>>(key: P2): string | undefined;
    param(key: string): string | undefined;
    param<P2 extends string = P>(): Simplify<UnionToIntersection<ParamKeyToRecord<ParamKeys<P2>>>>;
    /**
     * `.query()` can get querystring parameters.
     *
     * @see {@link https://hono.dev/docs/api/request#query}
     *
     * @example
     * ```ts
     * // Query params
     * app.get('/search', (c) => {
     *   const query = c.req.query('q')
     * })
     *
     * // Get all params at once
     * app.get('/search', (c) => {
     *   const { q, limit, offset } = c.req.query()
     * })
     * ```
     */
    query(key: string): string | undefined;
    query(): Record<string, string>;
    /**
     * `.queries()` can get multiple querystring parameter values, e.g. /search?tags=A&tags=B
     *
     * @see {@link https://hono.dev/docs/api/request#queries}
     *
     * @example
     * ```ts
     * app.get('/search', (c) => {
     *   // tags will be string[]
     *   const tags = c.req.queries('tags')
     * })
     * ```
     */
    queries(key: string): string[] | undefined;
    queries(): Record<string, string[]>;
    /**
     * `.header()` can get the request header value.
     *
     * @see {@link https://hono.dev/docs/api/request#header}
     *
     * @example
     * ```ts
     * app.get('/', (c) => {
     *   const userAgent = c.req.header('User-Agent')
     * })
     * ```
     */
    header(name: RequestHeader): string | undefined;
    header(name: string): string | undefined;
    header(): Record<RequestHeader | (string & CustomHeader), string>;
    /**
     * `.parseBody()` can parse Request body of type `multipart/form-data` or `application/x-www-form-urlencoded`
     *
     * @see {@link https://hono.dev/docs/api/request#parsebody}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.parseBody()
     * })
     * ```
     */
    parseBody<Options extends Partial<ParseBodyOptions>, T extends BodyData<Options>>(options?: Options): Promise<T>;
    parseBody<T extends BodyData>(options?: Partial<ParseBodyOptions>): Promise<T>;
    /**
     * `.json()` can parse Request body of type `application/json`
     *
     * @see {@link https://hono.dev/docs/api/request#json}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.json()
     * })
     * ```
     */
    json<T = any>(): Promise<T>;
    /**
     * `.text()` can parse Request body of type `text/plain`
     *
     * @see {@link https://hono.dev/docs/api/request#text}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.text()
     * })
     * ```
     */
    text(): Promise<string>;
    /**
     * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
     *
     * @see {@link https://hono.dev/docs/api/request#arraybuffer}
     *
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.arrayBuffer()
     * })
     * ```
     */
    arrayBuffer(): Promise<ArrayBuffer>;
    /**
     * Parses the request body as a `Blob`.
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.blob();
     * });
     * ```
     * @see https://hono.dev/docs/api/request#blob
     */
    blob(): Promise<Blob>;
    /**
     * Parses the request body as `FormData`.
     * @example
     * ```ts
     * app.post('/entry', async (c) => {
     *   const body = await c.req.formData();
     * });
     * ```
     * @see https://hono.dev/docs/api/request#formdata
     */
    formData(): Promise<FormData>;
    /**
     * Adds validated data to the request.
     *
     * @param target - The target of the validation.
     * @param data - The validated data to add.
     */
    addValidatedData(target: keyof ValidationTargets, data: {}): void;
    /**
     * Gets validated data from the request.
     *
     * @param target - The target of the validation.
     * @returns The validated data.
     *
     * @see https://hono.dev/docs/api/request#valid
     */
    valid<T extends keyof I & keyof ValidationTargets>(target: T): InputToDataByTarget<I, T>;
    /**
     * `.url()` can get the request url strings.
     *
     * @see {@link https://hono.dev/docs/api/request#url}
     *
     * @example
     * ```ts
     * app.get('/about/me', (c) => {
     *   const url = c.req.url // `http://localhost:8787/about/me`
     *   ...
     * })
     * ```
     */
    get url(): string;
    /**
     * `.method()` can get the method name of the request.
     *
     * @see {@link https://hono.dev/docs/api/request#method}
     *
     * @example
     * ```ts
     * app.get('/about/me', (c) => {
     *   const method = c.req.method // `GET`
     * })
     * ```
     */
    get method(): string;
    get [GET_MATCH_RESULT](): Result<[unknown, RouterRoute]>;
    /**
     * `.matchedRoutes()` can return a matched route in the handler
     *
     * @deprecated
     *
     * Use matchedRoutes helper defined in "hono/route" instead.
     *
     * @see {@link https://hono.dev/docs/api/request#matchedroutes}
     *
     * @example
     * ```ts
     * app.use('*', async function logger(c, next) {
     *   await next()
     *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
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
    get matchedRoutes(): RouterRoute[];
    /**
     * `routePath()` can retrieve the path registered within the handler
     *
     * @deprecated
     *
     * Use routePath helper defined in "hono/route" instead.
     *
     * @see {@link https://hono.dev/docs/api/request#routepath}
     *
     * @example
     * ```ts
     * app.get('/posts/:id', (c) => {
     *   return c.json({ path: c.req.routePath })
     * })
     * ```
     */
    get routePath(): string;
}
/**
 * Clones a HonoRequest's underlying raw Request object.
 *
 * This utility handles both consumed and unconsumed request bodies:
 * - If the request body hasn't been consumed, it uses the native `clone()` method
 * - If the request body has been consumed, it reconstructs a new Request using cached body data
 *
 * This is particularly useful when you need to:
 * - Process the same request body multiple times
 * - Pass requests to external services after validation
 *
 * @param req - The HonoRequest object to clone
 * @returns A Promise that resolves to a new Request object with the same properties
 * @throws {HTTPException} If the request body was consumed directly via `req.raw`
 *   without using HonoRequest methods (e.g., `req.json()`, `req.text()`), making it
 *   impossible to reconstruct the body from cache
 *
 * @example
 * ```ts
 * // Clone after consuming the body (e.g., after validation)
 * app.post('/forward',
 *   validator('json', (data) => data),
 *   async (c) => {
 *     const validated = c.req.valid('json')
 *     // Body has been consumed, but cloneRawRequest still works
 *     const clonedReq = await cloneRawRequest(c.req)
 *     return fetch('http://backend-service.com', clonedReq)
 *   }
 * )
 * ```
 */
export declare const cloneRawRequest: (req: HonoRequest) => Promise<Request>;
export {};
