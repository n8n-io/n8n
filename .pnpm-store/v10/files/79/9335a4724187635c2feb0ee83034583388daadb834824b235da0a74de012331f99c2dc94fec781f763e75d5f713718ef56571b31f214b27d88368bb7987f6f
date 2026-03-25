import { HonoRequest } from './request';
import type { Result } from './router';
import type { Env, FetchEventLike, H, Input, NotFoundHandler, RouterRoute, TypedResponse } from './types';
import type { ResponseHeader } from './utils/headers';
import type { ContentfulStatusCode, RedirectStatusCode, StatusCode } from './utils/http-status';
import type { BaseMime } from './utils/mime';
import type { InvalidJSONValue, IsAny, JSONParsed, JSONValue } from './utils/types';
type HeaderRecord = Record<'Content-Type', BaseMime> | Record<ResponseHeader, string | string[]> | Record<string, string | string[]>;
/**
 * Data type can be a string, ArrayBuffer, Uint8Array (buffer), or ReadableStream.
 */
export type Data = string | ArrayBuffer | ReadableStream | Uint8Array<ArrayBuffer>;
/**
 * Interface for the execution context in a web worker or similar environment.
 */
export interface ExecutionContext {
    /**
     * Extends the lifetime of the event callback until the promise is settled.
     *
     * @param promise - A promise to wait for.
     */
    waitUntil(promise: Promise<unknown>): void;
    /**
     * Allows the event to be passed through to subsequent event listeners.
     */
    passThroughOnException(): void;
    /**
     * For compatibility with Wrangler 4.x.
     */
    props: any;
    /**
     * For compatibility with Wrangler 4.x.
     */
    exports?: any;
}
/**
 * Interface for context variable mapping.
 */
export interface ContextVariableMap {
}
/**
 * Interface for context renderer.
 */
export interface ContextRenderer {
}
/**
 * Interface representing a renderer for content.
 *
 * @interface DefaultRenderer
 * @param {string | Promise<string>} content - The content to be rendered, which can be either a string or a Promise resolving to a string.
 * @returns {Response | Promise<Response>} - The response after rendering the content, which can be either a Response or a Promise resolving to a Response.
 */
interface DefaultRenderer {
    (content: string | Promise<string>): Response | Promise<Response>;
}
/**
 * Renderer type which can either be a ContextRenderer or DefaultRenderer.
 */
export type Renderer = ContextRenderer extends Function ? ContextRenderer : DefaultRenderer;
/**
 * Extracts the props for the renderer.
 */
export type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props] ? Props : unknown;
export type Layout<T = Record<string, any>> = (props: T) => any;
/**
 * Interface for getting context variables.
 *
 * @template E - Environment type.
 */
interface Get<E extends Env> {
    <Key extends keyof E['Variables']>(key: Key): E['Variables'][Key];
    <Key extends keyof ContextVariableMap>(key: Key): ContextVariableMap[Key];
}
/**
 * Interface for setting context variables.
 *
 * @template E - Environment type.
 */
interface Set<E extends Env> {
    <Key extends keyof E['Variables']>(key: Key, value: E['Variables'][Key]): void;
    <Key extends keyof ContextVariableMap>(key: Key, value: ContextVariableMap[Key]): void;
}
/**
 * Interface for creating a new response.
 */
interface NewResponse {
    (data: Data | null, status?: StatusCode, headers?: HeaderRecord): Response;
    (data: Data | null, init?: ResponseOrInit): Response;
}
/**
 * Interface for responding with a body.
 */
interface BodyRespond {
    <T extends Data, U extends ContentfulStatusCode>(data: T, status?: U, headers?: HeaderRecord): Response & TypedResponse<T, U, 'body'>;
    <T extends Data, U extends ContentfulStatusCode>(data: T, init?: ResponseOrInit<U>): Response & TypedResponse<T, U, 'body'>;
    <T extends null, U extends StatusCode>(data: T, status?: U, headers?: HeaderRecord): Response & TypedResponse<null, U, 'body'>;
    <T extends null, U extends StatusCode>(data: T, init?: ResponseOrInit<U>): Response & TypedResponse<null, U, 'body'>;
}
/**
 * Interface for responding with text.
 *
 * @interface TextRespond
 * @template T - The type of the text content.
 * @template U - The type of the status code.
 *
 * @param {T} text - The text content to be included in the response.
 * @param {U} [status] - An optional status code for the response.
 * @param {HeaderRecord} [headers] - An optional record of headers to include in the response.
 *
 * @returns {Response & TypedResponse<T, U, 'text'>} - The response after rendering the text content, typed with the provided text and status code types.
 */
interface TextRespond {
    <T extends string, U extends ContentfulStatusCode = ContentfulStatusCode>(text: T, status?: U, headers?: HeaderRecord): Response & TypedResponse<T, U, 'text'>;
    <T extends string, U extends ContentfulStatusCode = ContentfulStatusCode>(text: T, init?: ResponseOrInit<U>): Response & TypedResponse<T, U, 'text'>;
}
/**
 * Interface for responding with JSON.
 *
 * @interface JSONRespond
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @param {T} object - The JSON object to be included in the response.
 * @param {U} [status] - An optional status code for the response.
 * @param {HeaderRecord} [headers] - An optional record of headers to include in the response.
 *
 * @returns {JSONRespondReturn<T, U>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
interface JSONRespond {
    <T extends JSONValue | {} | InvalidJSONValue, U extends ContentfulStatusCode = ContentfulStatusCode>(object: T, status?: U, headers?: HeaderRecord): JSONRespondReturn<T, U>;
    <T extends JSONValue | {} | InvalidJSONValue, U extends ContentfulStatusCode = ContentfulStatusCode>(object: T, init?: ResponseOrInit<U>): JSONRespondReturn<T, U>;
}
/**
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @returns {Response & TypedResponse<JSONParsed<T>, U, 'json'>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
type JSONRespondReturn<T extends JSONValue | {} | InvalidJSONValue, U extends ContentfulStatusCode> = Response & TypedResponse<JSONParsed<T>, U, 'json'>;
/**
 * Interface representing a function that responds with HTML content.
 *
 * @param html - The HTML content to respond with, which can be a string or a Promise that resolves to a string.
 * @param status - (Optional) The HTTP status code for the response.
 * @param headers - (Optional) A record of headers to include in the response.
 * @param init - (Optional) The response initialization object.
 *
 * @returns A Response object or a Promise that resolves to a Response object.
 */
interface HTMLRespond {
    <T extends string | Promise<string>>(html: T, status?: ContentfulStatusCode, headers?: HeaderRecord): T extends string ? Response : Promise<Response>;
    <T extends string | Promise<string>>(html: T, init?: ResponseOrInit<ContentfulStatusCode>): T extends string ? Response : Promise<Response>;
}
/**
 * Options for configuring the context.
 *
 * @template E - Environment type.
 */
type ContextOptions<E extends Env> = {
    /**
     * Bindings for the environment.
     */
    env: E['Bindings'];
    /**
     * Execution context for the request.
     */
    executionCtx?: FetchEventLike | ExecutionContext | undefined;
    /**
     * Handler for not found responses.
     */
    notFoundHandler?: NotFoundHandler<E>;
    matchResult?: Result<[H, RouterRoute]>;
    path?: string;
};
interface SetHeadersOptions {
    append?: boolean;
}
interface SetHeaders {
    (name: 'Content-Type', value?: BaseMime, options?: SetHeadersOptions): void;
    (name: ResponseHeader, value?: string, options?: SetHeadersOptions): void;
    (name: string, value?: string, options?: SetHeadersOptions): void;
}
type ResponseHeadersInit = [string, string][] | Record<'Content-Type', BaseMime> | Record<ResponseHeader, string> | Record<string, string> | Headers;
interface ResponseInit<T extends StatusCode = StatusCode> {
    headers?: ResponseHeadersInit;
    status?: T;
    statusText?: string;
}
type ResponseOrInit<T extends StatusCode = StatusCode> = ResponseInit<T> | Response;
export declare const TEXT_PLAIN = "text/plain; charset=UTF-8";
export declare class Context<E extends Env = any, P extends string = any, I extends Input = {}> {
             
    /**
     * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
     *
     * @see {@link https://hono.dev/docs/api/context#env}
     *
     * @example
     * ```ts
     * // Environment object for Cloudflare Workers
     * app.get('*', async c => {
     *   const counter = c.env.COUNTER
     * })
     * ```
     */
    env: E['Bindings'];
    finalized: boolean;
    /**
     * `.error` can get the error object from the middleware if the Handler throws an error.
     *
     * @see {@link https://hono.dev/docs/api/context#error}
     *
     * @example
     * ```ts
     * app.use('*', async (c, next) => {
     *   await next()
     *   if (c.error) {
     *     // do something...
     *   }
     * })
     * ```
     */
    error: Error | undefined;
    /**
     * Creates an instance of the Context class.
     *
     * @param req - The Request object.
     * @param options - Optional configuration options for the context.
     */
    constructor(req: Request, options?: ContextOptions<E>);
    /**
     * `.req` is the instance of {@link HonoRequest}.
     */
    get req(): HonoRequest<P, I['out']>;
    /**
     * @see {@link https://hono.dev/docs/api/context#event}
     * The FetchEvent associated with the current request.
     *
     * @throws Will throw an error if the context does not have a FetchEvent.
     */
    get event(): FetchEventLike;
    /**
     * @see {@link https://hono.dev/docs/api/context#executionctx}
     * The ExecutionContext associated with the current request.
     *
     * @throws Will throw an error if the context does not have an ExecutionContext.
     */
    get executionCtx(): ExecutionContext;
    /**
     * @see {@link https://hono.dev/docs/api/context#res}
     * The Response object for the current request.
     */
    get res(): Response;
    /**
     * Sets the Response object for the current request.
     *
     * @param _res - The Response object to set.
     */
    set res(_res: Response | undefined);
    /**
     * `.render()` can create a response within a layout.
     *
     * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
     *
     * @example
     * ```ts
     * app.get('/', (c) => {
     *   return c.render('Hello!')
     * })
     * ```
     */
    render: Renderer;
    /**
     * Sets the layout for the response.
     *
     * @param layout - The layout to set.
     * @returns The layout function.
     */
    setLayout: (layout: Layout<PropsForRenderer & {
        Layout: Layout;
    }>) => Layout<PropsForRenderer & {
        Layout: Layout;
    }>;
    /**
     * Gets the current layout for the response.
     *
     * @returns The current layout function.
     */
    getLayout: () => Layout<PropsForRenderer & {
        Layout: Layout;
    }> | undefined;
    /**
     * `.setRenderer()` can set the layout in the custom middleware.
     *
     * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
     *
     * @example
     * ```tsx
     * app.use('*', async (c, next) => {
     *   c.setRenderer((content) => {
     *     return c.html(
     *       <html>
     *         <body>
     *           <p>{content}</p>
     *         </body>
     *       </html>
     *     )
     *   })
     *   await next()
     * })
     * ```
     */
    setRenderer: (renderer: Renderer) => void;
    /**
     * `.header()` can set headers.
     *
     * @see {@link https://hono.dev/docs/api/context#header}
     *
     * @example
     * ```ts
     * app.get('/welcome', (c) => {
     *   // Set headers
     *   c.header('X-Message', 'Hello!')
     *   c.header('Content-Type', 'text/plain')
     *
     *   return c.body('Thank you for coming')
     * })
     * ```
     */
    header: SetHeaders;
    status: (status: StatusCode) => void;
    /**
     * `.set()` can set the value specified by the key.
     *
     * @see {@link https://hono.dev/docs/api/context#set-get}
     *
     * @example
     * ```ts
     * app.use('*', async (c, next) => {
     *   c.set('message', 'Hono is hot!!')
     *   await next()
     * })
     * ```
     */
    set: Set<IsAny<E> extends true ? {
        Variables: ContextVariableMap & Record<string, any>;
    } : E>;
    /**
     * `.get()` can use the value specified by the key.
     *
     * @see {@link https://hono.dev/docs/api/context#set-get}
     *
     * @example
     * ```ts
     * app.get('/', (c) => {
     *   const message = c.get('message')
     *   return c.text(`The message is "${message}"`)
     * })
     * ```
     */
    get: Get<IsAny<E> extends true ? {
        Variables: ContextVariableMap & Record<string, any>;
    } : E>;
    /**
     * `.var` can access the value of a variable.
     *
     * @see {@link https://hono.dev/docs/api/context#var}
     *
     * @example
     * ```ts
     * const result = c.var.client.oneMethod()
     * ```
     */
    get var(): Readonly<ContextVariableMap & (IsAny<E['Variables']> extends true ? Record<string, any> : E['Variables'])>;
    newResponse: NewResponse;
    /**
     * `.body()` can return the HTTP response.
     * You can set headers with `.header()` and set HTTP status code with `.status`.
     * This can also be set in `.text()`, `.json()` and so on.
     *
     * @see {@link https://hono.dev/docs/api/context#body}
     *
     * @example
     * ```ts
     * app.get('/welcome', (c) => {
     *   // Set headers
     *   c.header('X-Message', 'Hello!')
     *   c.header('Content-Type', 'text/plain')
     *   // Set HTTP status code
     *   c.status(201)
     *
     *   // Return the response body
     *   return c.body('Thank you for coming')
     * })
     * ```
     */
    body: BodyRespond;
    /**
     * `.text()` can render text as `Content-Type:text/plain`.
     *
     * @see {@link https://hono.dev/docs/api/context#text}
     *
     * @example
     * ```ts
     * app.get('/say', (c) => {
     *   return c.text('Hello!')
     * })
     * ```
     */
    text: TextRespond;
    /**
     * `.json()` can render JSON as `Content-Type:application/json`.
     *
     * @see {@link https://hono.dev/docs/api/context#json}
     *
     * @example
     * ```ts
     * app.get('/api', (c) => {
     *   return c.json({ message: 'Hello!' })
     * })
     * ```
     */
    json: JSONRespond;
    html: HTMLRespond;
    /**
     * `.redirect()` can Redirect, default status code is 302.
     *
     * @see {@link https://hono.dev/docs/api/context#redirect}
     *
     * @example
     * ```ts
     * app.get('/redirect', (c) => {
     *   return c.redirect('/')
     * })
     * app.get('/redirect-permanently', (c) => {
     *   return c.redirect('/', 301)
     * })
     * ```
     */
    redirect: <T extends RedirectStatusCode = 302>(location: string | URL, status?: T) => Response & TypedResponse<undefined, T, "redirect">;
    /**
     * `.notFound()` can return the Not Found Response.
     *
     * @see {@link https://hono.dev/docs/api/context#notfound}
     *
     * @example
     * ```ts
     * app.get('/notfound', (c) => {
     *   return c.notFound()
     * })
     * ```
     */
    notFound: () => ReturnType<NotFoundHandler>;
}
export {};
