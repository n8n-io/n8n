// This extracts the core definitions from express to prevent a circular dependency between express and serve-static
/// <reference types="node" />

import { SendOptions } from "send";

declare global {
    namespace Express {
        // These open interfaces may be extended in an application-specific manner via declaration merging.
        // See for example method-override.d.ts (https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/method-override/index.d.ts)
        interface Request {}
        interface Response {}
        interface Locals {}
        interface Application {}
    }
}

import { EventEmitter } from "events";
import * as http from "http";
import { ParsedQs } from "qs";
import { Options as RangeParserOptions, Ranges as RangeParserRanges, Result as RangeParserResult } from "range-parser";

export {};

export type Query = ParsedQs;

export interface NextFunction {
    (err?: any): void;
    /**
     * "Break-out" of a router by calling {next('router')};
     * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.router}
     */
    (deferToNext: "router"): void;
    /**
     * "Break-out" of a route by calling {next('route')};
     * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.application}
     */
    (deferToNext: "route"): void;
}

export interface Dictionary<T> {
    [key: string]: T;
}

export interface ParamsDictionary {
    [key: string]: string;
}
export type ParamsArray = string[];
export type Params = ParamsDictionary | ParamsArray;

export interface Locals extends Express.Locals {}

export interface RequestHandler<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>,
> {
    // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2)
    (
        req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
        res: Response<ResBody, LocalsObj>,
        next: NextFunction,
    ): void | Promise<void>;
}

export type ErrorRequestHandler<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>,
> = (
    err: any,
    req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
    res: Response<ResBody, LocalsObj>,
    next: NextFunction,
) => void | Promise<void>;

export type PathParams = string | RegExp | Array<string | RegExp>;

export type RequestHandlerParams<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>,
> =
    | RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>
    | ErrorRequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>
    | Array<RequestHandler<P> | ErrorRequestHandler<P>>;

type RemoveTail<S extends string, Tail extends string> = S extends `${infer P}${Tail}` ? P : S;
type GetRouteParameter<S extends string> = RemoveTail<
    RemoveTail<RemoveTail<S, `/${string}`>, `-${string}`>,
    `.${string}`
>;

// prettier-ignore
export type RouteParameters<Route extends string> = Route extends `${infer Required}{${infer Optional}}${infer Next}`
    ? ParseRouteParameters<Required> & Partial<ParseRouteParameters<Optional>> & RouteParameters<Next>
    : ParseRouteParameters<Route>;

type ParseRouteParameters<Route extends string> = string extends Route ? ParamsDictionary
    : Route extends `${string}(${string}` ? ParamsDictionary // TODO: handling for regex parameters
    : Route extends `${string}:${infer Rest}` ?
            & (
                GetRouteParameter<Rest> extends never ? ParamsDictionary
                    : GetRouteParameter<Rest> extends `${infer ParamName}?` ? { [P in ParamName]?: string } // TODO: Remove old `?` handling when Express 5 is promoted to "latest"
                    : { [P in GetRouteParameter<Rest>]: string }
            )
            & (Rest extends `${GetRouteParameter<Rest>}${infer Next}` ? RouteParameters<Next> : unknown)
    : {};

/* eslint-disable @definitelytyped/no-unnecessary-generics */
export interface IRouterMatcher<
    T,
    Method extends "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" = any,
> {
    <
        Route extends string,
        P = RouteParameters<Route>,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        // (it's used as the default type parameter for P)
        path: Route,
        // (This generic is meant to be passed explicitly.)
        ...handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    <
        Path extends string,
        P = RouteParameters<Path>,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        // (it's used as the default type parameter for P)
        path: Path,
        // (This generic is meant to be passed explicitly.)
        ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    <
        P = ParamsDictionary,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        path: PathParams,
        // (This generic is meant to be passed explicitly.)
        ...handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    <
        P = ParamsDictionary,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        path: PathParams,
        // (This generic is meant to be passed explicitly.)
        ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    (path: PathParams, subApplication: Application): T;
}

export interface IRouterHandler<T, Route extends string = string> {
    (...handlers: Array<RequestHandler<RouteParameters<Route>>>): T;
    (...handlers: Array<RequestHandlerParams<RouteParameters<Route>>>): T;
    <
        P = RouteParameters<Route>,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        // (This generic is meant to be passed explicitly.)
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        ...handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    <
        P = RouteParameters<Route>,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        // (This generic is meant to be passed explicitly.)
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    <
        P = ParamsDictionary,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        // (This generic is meant to be passed explicitly.)
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        ...handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
    <
        P = ParamsDictionary,
        ResBody = any,
        ReqBody = any,
        ReqQuery = ParsedQs,
        LocalsObj extends Record<string, any> = Record<string, any>,
    >(
        // (This generic is meant to be passed explicitly.)
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
    ): T;
}
/* eslint-enable @definitelytyped/no-unnecessary-generics */

export interface IRouter extends RequestHandler {
    /**
     * Map the given param placeholder `name`(s) to the given callback(s).
     *
     * Parameter mapping is used to provide pre-conditions to routes
     * which use normalized placeholders. For example a _:user_id_ parameter
     * could automatically load a user's information from the database without
     * any additional code,
     *
     * The callback uses the samesignature as middleware, the only differencing
     * being that the value of the placeholder is passed, in this case the _id_
     * of the user. Once the `next()` function is invoked, just like middleware
     * it will continue on to execute the route, or subsequent parameter functions.
     *
     *      app.param('user_id', function(req, res, next, id){
     *        User.find(id, function(err, user){
     *          if (err) {
     *            next(err);
     *          } else if (user) {
     *            req.user = user;
     *            next();
     *          } else {
     *            next(new Error('failed to load user'));
     *          }
     *        });
     *      });
     */
    param(name: string, handler: RequestParamHandler): this;

    /**
     * Special-cased "all" method, applying the given route `path`,
     * middleware, and callback to _every_ HTTP method.
     */
    all: IRouterMatcher<this, "all">;
    get: IRouterMatcher<this, "get">;
    post: IRouterMatcher<this, "post">;
    put: IRouterMatcher<this, "put">;
    delete: IRouterMatcher<this, "delete">;
    patch: IRouterMatcher<this, "patch">;
    options: IRouterMatcher<this, "options">;
    head: IRouterMatcher<this, "head">;

    checkout: IRouterMatcher<this>;
    connect: IRouterMatcher<this>;
    copy: IRouterMatcher<this>;
    lock: IRouterMatcher<this>;
    merge: IRouterMatcher<this>;
    mkactivity: IRouterMatcher<this>;
    mkcol: IRouterMatcher<this>;
    move: IRouterMatcher<this>;
    "m-search": IRouterMatcher<this>;
    notify: IRouterMatcher<this>;
    propfind: IRouterMatcher<this>;
    proppatch: IRouterMatcher<this>;
    purge: IRouterMatcher<this>;
    report: IRouterMatcher<this>;
    search: IRouterMatcher<this>;
    subscribe: IRouterMatcher<this>;
    trace: IRouterMatcher<this>;
    unlock: IRouterMatcher<this>;
    unsubscribe: IRouterMatcher<this>;
    link: IRouterMatcher<this>;
    unlink: IRouterMatcher<this>;

    use: IRouterHandler<this> & IRouterMatcher<this>;

    route<T extends string>(prefix: T): IRoute<T>;
    route(prefix: PathParams): IRoute;
    /**
     * Stack of configured routes
     */
    stack: ILayer[];
}

export interface ILayer {
    route?: IRoute;
    name: string | "<anonymous>";
    params?: Record<string, any>;
    keys: string[];
    path?: string;
    method: string;
    regexp: RegExp;
    handle: (req: Request, res: Response, next: NextFunction) => any;
}

export interface IRoute<Route extends string = string> {
    path: string;
    stack: ILayer[];
    all: IRouterHandler<this, Route>;
    get: IRouterHandler<this, Route>;
    post: IRouterHandler<this, Route>;
    put: IRouterHandler<this, Route>;
    delete: IRouterHandler<this, Route>;
    patch: IRouterHandler<this, Route>;
    options: IRouterHandler<this, Route>;
    head: IRouterHandler<this, Route>;

    checkout: IRouterHandler<this, Route>;
    copy: IRouterHandler<this, Route>;
    lock: IRouterHandler<this, Route>;
    merge: IRouterHandler<this, Route>;
    mkactivity: IRouterHandler<this, Route>;
    mkcol: IRouterHandler<this, Route>;
    move: IRouterHandler<this, Route>;
    "m-search": IRouterHandler<this, Route>;
    notify: IRouterHandler<this, Route>;
    purge: IRouterHandler<this, Route>;
    report: IRouterHandler<this, Route>;
    search: IRouterHandler<this, Route>;
    subscribe: IRouterHandler<this, Route>;
    trace: IRouterHandler<this, Route>;
    unlock: IRouterHandler<this, Route>;
    unsubscribe: IRouterHandler<this, Route>;
}

export interface Router extends IRouter {}

/**
 * Options passed down into `res.cookie`
 * @link https://expressjs.com/en/api.html#res.cookie
 */
export interface CookieOptions {
    /** Convenient option for setting the expiry time relative to the current time in **milliseconds**. */
    maxAge?: number | undefined;
    /** Indicates if the cookie should be signed. */
    signed?: boolean | undefined;
    /** Expiry date of the cookie in GMT. If not specified (undefined), creates a session cookie. */
    expires?: Date | undefined;
    /** Flags the cookie to be accessible only by the web server. */
    httpOnly?: boolean | undefined;
    /** Path for the cookie. Defaults to “/”. */
    path?: string | undefined;
    /** Domain name for the cookie. Defaults to the domain name of the app. */
    domain?: string | undefined;
    /** Marks the cookie to be used with HTTPS only. */
    secure?: boolean | undefined;
    /** A synchronous function used for cookie value encoding. Defaults to encodeURIComponent. */
    encode?: ((val: string) => string) | undefined;
    /**
     * Value of the “SameSite” Set-Cookie attribute.
     * @link https://tools.ietf.org/html/draft-ietf-httpbis-cookie-same-site-00#section-4.1.1.
     */
    sameSite?: boolean | "lax" | "strict" | "none" | undefined;
    /**
     * Value of the “Priority” Set-Cookie attribute.
     * @link https://datatracker.ietf.org/doc/html/draft-west-cookie-priority-00#section-4.3
     */
    priority?: "low" | "medium" | "high";
    /** Marks the cookie to use partioned storage. */
    partitioned?: boolean | undefined;
}

export interface ByteRange {
    start: number;
    end: number;
}

export interface RequestRanges extends RangeParserRanges {}

export type Errback = (err: Error) => void;

/**
 * @param P  For most requests, this should be `ParamsDictionary`, but if you're
 * using this in a route handler for a route that uses a `RegExp` or a wildcard
 * `string` path (e.g. `'/user/*'`), then `req.params` will be an array, in
 * which case you should use `ParamsArray` instead.
 *
 * @see https://expressjs.com/en/api.html#req.params
 *
 * @example
 *     app.get('/user/:id', (req, res) => res.send(req.params.id)); // implicitly `ParamsDictionary`
 *     app.get<ParamsArray>(/user\/(.*)/, (req, res) => res.send(req.params[0]));
 *     app.get<ParamsArray>('/user/*', (req, res) => res.send(req.params[0]));
 */
export interface Request<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>,
> extends http.IncomingMessage, Express.Request {
    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     req.get('Content-Type');
     *     // => "text/plain"
     *
     *     req.get('content-type');
     *     // => "text/plain"
     *
     *     req.get('Something');
     *     // => undefined
     *
     * Aliased as `req.header()`.
     */
    get(name: "set-cookie"): string[] | undefined;
    get(name: string): string | undefined;

    header(name: "set-cookie"): string[] | undefined;
    header(name: string): string | undefined;

    /**
     * Check if the given `type(s)` is acceptable, returning
     * the best match when true, otherwise `undefined`, in which
     * case you should respond with 406 "Not Acceptable".
     *
     * The `type` value may be a single mime type string
     * such as "application/json", the extension name
     * such as "json", a comma-delimted list such as "json, html, text/plain",
     * or an array `["json", "html", "text/plain"]`. When a list
     * or array is given the _best_ match, if any is returned.
     *
     * Examples:
     *
     *     // Accept: text/html
     *     req.accepts('html');
     *     // => "html"
     *
     *     // Accept: text/*, application/json
     *     req.accepts('html');
     *     // => "html"
     *     req.accepts('text/html');
     *     // => "text/html"
     *     req.accepts('json, text');
     *     // => "json"
     *     req.accepts('application/json');
     *     // => "application/json"
     *
     *     // Accept: text/*, application/json
     *     req.accepts('image/png');
     *     req.accepts('png');
     *     // => false
     *
     *     // Accept: text/*;q=.5, application/json
     *     req.accepts(['html', 'json']);
     *     req.accepts('html, json');
     *     // => "json"
     */
    accepts(): string[];
    accepts(type: string): string | false;
    accepts(type: string[]): string | false;
    accepts(...type: string[]): string | false;

    /**
     * Returns the first accepted charset of the specified character sets,
     * based on the request's Accept-Charset HTTP header field.
     * If none of the specified charsets is accepted, returns false.
     *
     * For more information, or if you have issues or concerns, see accepts.
     */
    acceptsCharsets(): string[];
    acceptsCharsets(charset: string): string | false;
    acceptsCharsets(charset: string[]): string | false;
    acceptsCharsets(...charset: string[]): string | false;

    /**
     * Returns the first accepted encoding of the specified encodings,
     * based on the request's Accept-Encoding HTTP header field.
     * If none of the specified encodings is accepted, returns false.
     *
     * For more information, or if you have issues or concerns, see accepts.
     */
    acceptsEncodings(): string[];
    acceptsEncodings(encoding: string): string | false;
    acceptsEncodings(encoding: string[]): string | false;
    acceptsEncodings(...encoding: string[]): string | false;

    /**
     * Returns the first accepted language of the specified languages,
     * based on the request's Accept-Language HTTP header field.
     * If none of the specified languages is accepted, returns false.
     *
     * For more information, or if you have issues or concerns, see accepts.
     */
    acceptsLanguages(): string[];
    acceptsLanguages(lang: string): string | false;
    acceptsLanguages(lang: string[]): string | false;
    acceptsLanguages(...lang: string[]): string | false;

    /**
     * Parse Range header field, capping to the given `size`.
     *
     * Unspecified ranges such as "0-" require knowledge of your resource length. In
     * the case of a byte range this is of course the total number of bytes.
     * If the Range header field is not given `undefined` is returned.
     * If the Range header field is given, return value is a result of range-parser.
     * See more ./types/range-parser/index.d.ts
     *
     * NOTE: remember that ranges are inclusive, so for example "Range: users=0-3"
     * should respond with 4 users when available, not 3.
     */
    range(size: number, options?: RangeParserOptions): RangeParserRanges | RangeParserResult | undefined;

    /**
     * Return an array of Accepted media types
     * ordered from highest quality to lowest.
     */
    accepted: MediaType[];

    /**
     * Check if the incoming request contains the "Content-Type"
     * header field, and it contains the give mime `type`.
     *
     * Examples:
     *
     *      // With Content-Type: text/html; charset=utf-8
     *      req.is('html');
     *      req.is('text/html');
     *      req.is('text/*');
     *      // => true
     *
     *      // When Content-Type is application/json
     *      req.is('json');
     *      req.is('application/json');
     *      req.is('application/*');
     *      // => true
     *
     *      req.is('html');
     *      // => false
     */
    is(type: string | string[]): string | false | null;

    /**
     * Return the protocol string "http" or "https"
     * when requested with TLS. When the "trust proxy"
     * setting is enabled the "X-Forwarded-Proto" header
     * field will be trusted. If you're running behind
     * a reverse proxy that supplies https for you this
     * may be enabled.
     */
    readonly protocol: string;

    /**
     * Short-hand for:
     *
     *    req.protocol == 'https'
     */
    readonly secure: boolean;

    /**
     * Return the remote address, or when
     * "trust proxy" is `true` return
     * the upstream addr.
     *
     * Value may be undefined if the `req.socket` is destroyed
     * (for example, if the client disconnected).
     */
    readonly ip: string | undefined;

    /**
     * When "trust proxy" is `true`, parse
     * the "X-Forwarded-For" ip address list.
     *
     * For example if the value were "client, proxy1, proxy2"
     * you would receive the array `["client", "proxy1", "proxy2"]`
     * where "proxy2" is the furthest down-stream.
     */
    readonly ips: string[];

    /**
     * Return subdomains as an array.
     *
     * Subdomains are the dot-separated parts of the host before the main domain of
     * the app. By default, the domain of the app is assumed to be the last two
     * parts of the host. This can be changed by setting "subdomain offset".
     *
     * For example, if the domain is "tobi.ferrets.example.com":
     * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
     * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
     */
    readonly subdomains: string[];

    /**
     * Short-hand for `url.parse(req.url).pathname`.
     */
    readonly path: string;

    /**
     * Contains the hostname derived from the `Host` HTTP header.
     */
    readonly hostname: string;

    /**
     * Contains the host derived from the `Host` HTTP header.
     */
    readonly host: string;

    /**
     * Check if the request is fresh, aka
     * Last-Modified and/or the ETag
     * still match.
     */
    readonly fresh: boolean;

    /**
     * Check if the request is stale, aka
     * "Last-Modified" and / or the "ETag" for the
     * resource has changed.
     */
    readonly stale: boolean;

    /**
     * Check if the request was an _XMLHttpRequest_.
     */
    readonly xhr: boolean;

    // body: { username: string; password: string; remember: boolean; title: string; };
    body: ReqBody;

    // cookies: { string; remember: boolean; };
    cookies: any;

    method: string;

    params: P;

    query: ReqQuery;

    route: any;

    signedCookies: any;

    originalUrl: string;

    url: string;

    baseUrl: string;

    app: Application;

    /**
     * After middleware.init executed, Request will contain res and next properties
     * See: express/lib/middleware/init.js
     */
    res?: Response<ResBody, LocalsObj> | undefined;
    next?: NextFunction | undefined;
}

export interface MediaType {
    value: string;
    quality: number;
    type: string;
    subtype: string;
}

export type Send<ResBody = any, T = Response<ResBody>> = (body?: ResBody) => T;

export interface SendFileOptions extends SendOptions {
    /** Object containing HTTP headers to serve with the file. */
    headers?: Record<string, unknown>;
}

export interface DownloadOptions extends SendOptions {
    /** Object containing HTTP headers to serve with the file. The header `Content-Disposition` will be overridden by the filename argument. */
    headers?: Record<string, unknown>;
}

export interface Response<
    ResBody = any,
    LocalsObj extends Record<string, any> = Record<string, any>,
    StatusCode extends number = number,
> extends http.ServerResponse, Express.Response {
    /**
     * Set status `code`.
     */
    status(code: StatusCode): this;

    /**
     * Set the response HTTP status code to `statusCode` and send its string representation as the response body.
     * @link http://expressjs.com/4x/api.html#res.sendStatus
     *
     * Examples:
     *
     *    res.sendStatus(200); // equivalent to res.status(200).send('OK')
     *    res.sendStatus(403); // equivalent to res.status(403).send('Forbidden')
     *    res.sendStatus(404); // equivalent to res.status(404).send('Not Found')
     *    res.sendStatus(500); // equivalent to res.status(500).send('Internal Server Error')
     */
    sendStatus(code: StatusCode): this;

    /**
     * Set Link header field with the given `links`.
     *
     * Examples:
     *
     *    res.links({
     *      next: 'http://api.example.com/users?page=2',
     *      last: 'http://api.example.com/users?page=5'
     *    });
     */
    links(links: any): this;

    /**
     * Send a response.
     *
     * Examples:
     *
     *     res.send(new Buffer('wahoo'));
     *     res.send({ some: 'json' });
     *     res.send('<p>some html</p>');
     *     res.status(404).send('Sorry, cant find that');
     */
    send: Send<ResBody, this>;

    /**
     * Send JSON response.
     *
     * Examples:
     *
     *     res.json(null);
     *     res.json({ user: 'tj' });
     *     res.status(500).json('oh noes!');
     *     res.status(404).json('I dont have that');
     */
    json: Send<ResBody, this>;

    /**
     * Send JSON response with JSONP callback support.
     *
     * Examples:
     *
     *     res.jsonp(null);
     *     res.jsonp({ user: 'tj' });
     *     res.status(500).jsonp('oh noes!');
     *     res.status(404).jsonp('I dont have that');
     */
    jsonp: Send<ResBody, this>;

    /**
     * Transfer the file at the given `path`.
     *
     * Automatically sets the _Content-Type_ response header field.
     * The callback `fn(err)` is invoked when the transfer is complete
     * or when an error occurs. Be sure to check `res.headersSent`
     * if you wish to attempt responding, as the header and some data
     * may have already been transferred.
     *
     * Options:
     *
     *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
     *   - `root`     root directory for relative filenames
     *   - `headers`  object of headers to serve with file
     *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
     *
     * Other options are passed along to `send`.
     *
     * Examples:
     *
     *  The following example illustrates how `res.sendFile()` may
     *  be used as an alternative for the `static()` middleware for
     *  dynamic situations. The code backing `res.sendFile()` is actually
     *  the same code, so HTTP cache support etc is identical.
     *
     *     app.get('/user/:uid/photos/:file', function(req, res){
     *       var uid = req.params.uid
     *         , file = req.params.file;
     *
     *       req.user.mayViewFilesFrom(uid, function(yes){
     *         if (yes) {
     *           res.sendFile('/uploads/' + uid + '/' + file);
     *         } else {
     *           res.send(403, 'Sorry! you cant see that.');
     *         }
     *       });
     *     });
     *
     * @api public
     */
    sendFile(path: string, fn?: Errback): void;
    sendFile(path: string, options: SendFileOptions, fn?: Errback): void;

    /**
     * Transfer the file at the given `path` as an attachment.
     *
     * Optionally providing an alternate attachment `filename`,
     * and optional callback `fn(err)`. The callback is invoked
     * when the data transfer is complete, or when an error has
     * ocurred. Be sure to check `res.headersSent` if you plan to respond.
     *
     * The optional options argument passes through to the underlying
     * res.sendFile() call, and takes the exact same parameters.
     *
     * This method uses `res.sendFile()`.
     */
    download(path: string, fn?: Errback): void;
    download(path: string, filename: string, fn?: Errback): void;
    download(path: string, filename: string, options: DownloadOptions, fn?: Errback): void;

    /**
     * Set _Content-Type_ response header with `type` through `mime.lookup()`
     * when it does not contain "/", or set the Content-Type to `type` otherwise.
     *
     * Examples:
     *
     *     res.type('.html');
     *     res.type('html');
     *     res.type('json');
     *     res.type('application/json');
     *     res.type('png');
     */
    contentType(type: string): this;

    /**
     * Set _Content-Type_ response header with `type` through `mime.lookup()`
     * when it does not contain "/", or set the Content-Type to `type` otherwise.
     *
     * Examples:
     *
     *     res.type('.html');
     *     res.type('html');
     *     res.type('json');
     *     res.type('application/json');
     *     res.type('png');
     */
    type(type: string): this;

    /**
     * Respond to the Acceptable formats using an `obj`
     * of mime-type callbacks.
     *
     * This method uses `req.accepted`, an array of
     * acceptable types ordered by their quality values.
     * When "Accept" is not present the _first_ callback
     * is invoked, otherwise the first match is used. When
     * no match is performed the server responds with
     * 406 "Not Acceptable".
     *
     * Content-Type is set for you, however if you choose
     * you may alter this within the callback using `res.type()`
     * or `res.set('Content-Type', ...)`.
     *
     *    res.format({
     *      'text/plain': function(){
     *        res.send('hey');
     *      },
     *
     *      'text/html': function(){
     *        res.send('<p>hey</p>');
     *      },
     *
     *      'appliation/json': function(){
     *        res.send({ message: 'hey' });
     *      }
     *    });
     *
     * In addition to canonicalized MIME types you may
     * also use extnames mapped to these types:
     *
     *    res.format({
     *      text: function(){
     *        res.send('hey');
     *      },
     *
     *      html: function(){
     *        res.send('<p>hey</p>');
     *      },
     *
     *      json: function(){
     *        res.send({ message: 'hey' });
     *      }
     *    });
     *
     * By default Express passes an `Error`
     * with a `.status` of 406 to `next(err)`
     * if a match is not made. If you provide
     * a `.default` callback it will be invoked
     * instead.
     */
    format(obj: any): this;

    /**
     * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
     */
    attachment(filename?: string): this;

    /**
     * Set header `field` to `val`, or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    res.set('Foo', ['bar', 'baz']);
     *    res.set('Accept', 'application/json');
     *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * Aliased as `res.header()`.
     */
    set(field: any): this;
    set(field: string, value?: string | string[]): this;

    header(field: any): this;
    header(field: string, value?: string | string[]): this;

    // Property indicating if HTTP headers has been sent for the response.
    headersSent: boolean;

    /** Get value for header `field`. */
    get(field: string): string | undefined;

    /** Clear cookie `name`. */
    clearCookie(name: string, options?: CookieOptions): this;

    /**
     * Set cookie `name` to `val`, with the given `options`.
     *
     * Options:
     *
     *    - `maxAge`   max-age in milliseconds, converted to `expires`
     *    - `signed`   sign the cookie
     *    - `path`     defaults to "/"
     *
     * Examples:
     *
     *    // "Remember Me" for 15 minutes
     *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
     *
     *    // save as above
     *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
     */
    cookie(name: string, val: string, options: CookieOptions): this;
    cookie(name: string, val: any, options: CookieOptions): this;
    cookie(name: string, val: any): this;

    /**
     * Set the location header to `url`.
     *
     * Examples:
     *
     *    res.location('/foo/bar').;
     *    res.location('http://example.com');
     *    res.location('../login'); // /blog/post/1 -> /blog/login
     *
     * Mounting:
     *
     *   When an application is mounted and `res.location()`
     *   is given a path that does _not_ lead with "/" it becomes
     *   relative to the mount-point. For example if the application
     *   is mounted at "/blog", the following would become "/blog/login".
     *
     *      res.location('login');
     *
     *   While the leading slash would result in a location of "/login":
     *
     *      res.location('/login');
     */
    location(url: string): this;

    /**
     * Redirect to the given `url` with optional response `status`
     * defaulting to 302.
     *
     * The resulting `url` is determined by `res.location()`, so
     * it will play nicely with mounted apps, relative paths, etc.
     *
     * Examples:
     *
     *    res.redirect('/foo/bar');
     *    res.redirect('http://example.com');
     *    res.redirect(301, 'http://example.com');
     *    res.redirect('../login'); // /blog/post/1 -> /blog/login
     */
    redirect(url: string): void;
    redirect(status: number, url: string): void;

    /**
     * Render `view` with the given `options` and optional callback `fn`.
     * When a callback function is given a response will _not_ be made
     * automatically, otherwise a response of _200_ and _text/html_ is given.
     *
     * Options:
     *
     *  - `cache`     boolean hinting to the engine it should cache
     *  - `filename`  filename of the view being rendered
     */
    render(view: string, options?: object, callback?: (err: Error, html: string) => void): void;
    render(view: string, callback?: (err: Error, html: string) => void): void;

    locals: LocalsObj & Locals;

    charset: string;

    /**
     * Adds the field to the Vary response header, if it is not there already.
     * Examples:
     *
     *     res.vary('User-Agent').render('docs');
     */
    vary(field: string): this;

    app: Application;

    /**
     * Appends the specified value to the HTTP response header field.
     * If the header is not already set, it creates the header with the specified value.
     * The value parameter can be a string or an array.
     *
     * Note: calling res.set() after res.append() will reset the previously-set header value.
     *
     * @since 4.11.0
     */
    append(field: string, value?: string[] | string): this;

    /**
     * After middleware.init executed, Response will contain req property
     * See: express/lib/middleware/init.js
     */
    req: Request;
}

export interface Handler extends RequestHandler {}

export type RequestParamHandler = (req: Request, res: Response, next: NextFunction, value: any, name: string) => any;

export type ApplicationRequestHandler<T> =
    & IRouterHandler<T>
    & IRouterMatcher<T>
    & ((...handlers: RequestHandlerParams[]) => T);

export interface Application<
    LocalsObj extends Record<string, any> = Record<string, any>,
> extends EventEmitter, IRouter, Express.Application {
    /**
     * Express instance itself is a request handler, which could be invoked without
     * third argument.
     */
    (req: Request | http.IncomingMessage, res: Response | http.ServerResponse): any;

    /**
     * Initialize the server.
     *
     *   - setup default configuration
     *   - setup default middleware
     *   - setup route reflection methods
     */
    init(): void;

    /**
     * Initialize application configuration.
     */
    defaultConfiguration(): void;

    /**
     * Register the given template engine callback `fn`
     * as `ext`.
     *
     * By default will `require()` the engine based on the
     * file extension. For example if you try to render
     * a "foo.jade" file Express will invoke the following internally:
     *
     *     app.engine('jade', require('jade').__express);
     *
     * For engines that do not provide `.__express` out of the box,
     * or if you wish to "map" a different extension to the template engine
     * you may use this method. For example mapping the EJS template engine to
     * ".html" files:
     *
     *     app.engine('html', require('ejs').renderFile);
     *
     * In this case EJS provides a `.renderFile()` method with
     * the same signature that Express expects: `(path, options, callback)`,
     * though note that it aliases this method as `ejs.__express` internally
     * so if you're using ".ejs" extensions you dont need to do anything.
     *
     * Some template engines do not follow this convention, the
     * [Consolidate.js](https://github.com/visionmedia/consolidate.js)
     * library was created to map all of node's popular template
     * engines to follow this convention, thus allowing them to
     * work seamlessly within Express.
     */
    engine(
        ext: string,
        fn: (path: string, options: object, callback: (e: any, rendered?: string) => void) => void,
    ): this;

    /**
     * Assign `setting` to `val`, or return `setting`'s value.
     *
     *    app.set('foo', 'bar');
     *    app.get('foo');
     *    // => "bar"
     *    app.set('foo', ['bar', 'baz']);
     *    app.get('foo');
     *    // => ["bar", "baz"]
     *
     * Mounted servers inherit their parent server's settings.
     */
    set(setting: string, val: any): this;
    get: ((name: string) => any) & IRouterMatcher<this>;

    param(name: string | string[], handler: RequestParamHandler): this;

    /**
     * Return the app's absolute pathname
     * based on the parent(s) that have
     * mounted it.
     *
     * For example if the application was
     * mounted as "/admin", which itself
     * was mounted as "/blog" then the
     * return value would be "/blog/admin".
     */
    path(): string;

    /**
     * Check if `setting` is enabled (truthy).
     *
     *    app.enabled('foo')
     *    // => false
     *
     *    app.enable('foo')
     *    app.enabled('foo')
     *    // => true
     */
    enabled(setting: string): boolean;

    /**
     * Check if `setting` is disabled.
     *
     *    app.disabled('foo')
     *    // => true
     *
     *    app.enable('foo')
     *    app.disabled('foo')
     *    // => false
     */
    disabled(setting: string): boolean;

    /** Enable `setting`. */
    enable(setting: string): this;

    /** Disable `setting`. */
    disable(setting: string): this;

    /**
     * Render the given view `name` name with `options`
     * and a callback accepting an error and the
     * rendered template string.
     *
     * Example:
     *
     *    app.render('email', { name: 'Tobi' }, function(err, html){
     *      // ...
     *    })
     */
    render(name: string, options?: object, callback?: (err: Error, html: string) => void): void;
    render(name: string, callback: (err: Error, html: string) => void): void;

    /**
     * Listen for connections.
     *
     * A node `http.Server` is returned, with this
     * application (which is a `Function`) as its
     * callback. If you wish to create both an HTTP
     * and HTTPS server you may do so with the "http"
     * and "https" modules as shown here:
     *
     *    var http = require('http')
     *      , https = require('https')
     *      , express = require('express')
     *      , app = express();
     *
     *    http.createServer(app).listen(80);
     *    https.createServer({ ... }, app).listen(443);
     */
    listen(port: number, hostname: string, backlog: number, callback?: (error?: Error) => void): http.Server;
    listen(port: number, hostname: string, callback?: (error?: Error) => void): http.Server;
    listen(port: number, callback?: (error?: Error) => void): http.Server;
    listen(callback?: (error?: Error) => void): http.Server;
    listen(path: string, callback?: (error?: Error) => void): http.Server;
    listen(handle: any, listeningListener?: (error?: Error) => void): http.Server;

    router: Router;

    settings: any;

    resource: any;

    map: any;

    locals: LocalsObj & Locals;

    /**
     * The app.routes object houses all of the routes defined mapped by the
     * associated HTTP verb. This object may be used for introspection
     * capabilities, for example Express uses this internally not only for
     * routing but to provide default OPTIONS behaviour unless app.options()
     * is used. Your application or framework may also remove routes by
     * simply by removing them from this object.
     */
    routes: any;

    /**
     * Used to get all registered routes in Express Application
     */
    _router: any;

    use: ApplicationRequestHandler<this>;

    /**
     * The mount event is fired on a sub-app, when it is mounted on a parent app.
     * The parent app is passed to the callback function.
     *
     * NOTE:
     * Sub-apps will:
     *  - Not inherit the value of settings that have a default value. You must set the value in the sub-app.
     *  - Inherit the value of settings with no default value.
     */
    on: (event: string, callback: (parent: Application) => void) => this;

    /**
     * The app.mountpath property contains one or more path patterns on which a sub-app was mounted.
     */
    mountpath: string | string[];
}

export interface Express extends Application {
    request: Request;
    response: Response;
}
