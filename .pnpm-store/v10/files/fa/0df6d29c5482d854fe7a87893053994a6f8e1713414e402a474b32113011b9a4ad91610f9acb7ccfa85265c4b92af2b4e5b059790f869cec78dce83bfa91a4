// Imported from: https://github.com/soywiz/typescript-node-definitions/d.ts

/// <reference types="node" />

import caseless = require("caseless");
import stream = require("stream");
import http = require("http");
import https = require("https");
import fs = require("fs");
import FormData = require("form-data");
import net = require("net");
import tough = require("tough-cookie");
import { Url } from "url";

declare namespace request {
    interface RequestAPI<TRequest extends Request, TOptions extends CoreOptions, TUriUrlOptions> {
        defaults(options: TOptions): RequestAPI<TRequest, TOptions, RequiredUriUrl>;
        defaults(options: RequiredUriUrl & TOptions): DefaultUriUrlRequestApi<TRequest, TOptions, OptionalUriUrl>;

        (uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        (uri: string, callback?: RequestCallback): TRequest;
        (options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        get(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        get(uri: string, callback?: RequestCallback): TRequest;
        get(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        post(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        post(uri: string, callback?: RequestCallback): TRequest;
        post(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        put(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        put(uri: string, callback?: RequestCallback): TRequest;
        put(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        head(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        head(uri: string, callback?: RequestCallback): TRequest;
        head(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        patch(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        patch(uri: string, callback?: RequestCallback): TRequest;
        patch(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        del(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        del(uri: string, callback?: RequestCallback): TRequest;
        del(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        delete(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        delete(uri: string, callback?: RequestCallback): TRequest;
        delete(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;

        initParams(uri: string, options?: TOptions, callback?: RequestCallback): RequiredUriUrl & TOptions;
        initParams(
            uriOrOpts: string | RequiredUriUrl & TOptions,
            callback?: RequestCallback,
        ): RequiredUriUrl & TOptions;

        forever(agentOptions: any, optionsArg: any): TRequest;
        jar(store?: any): CookieJar;
        cookie(str: string): Cookie | undefined;

        debug: boolean;
    }

    interface DefaultUriUrlRequestApi<TRequest extends Request, TOptions extends CoreOptions, TUriUrlOptions>
        extends RequestAPI<TRequest, TOptions, TUriUrlOptions>
    {
        defaults(options: TOptions): DefaultUriUrlRequestApi<TRequest, TOptions, OptionalUriUrl>;
        (callback?: RequestCallback): TRequest;

        get(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        get(uri: string, callback?: RequestCallback): TRequest;
        get(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        get(callback?: RequestCallback): TRequest;

        post(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        post(uri: string, callback?: RequestCallback): TRequest;
        post(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        post(callback?: RequestCallback): TRequest;

        put(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        put(uri: string, callback?: RequestCallback): TRequest;
        put(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        put(callback?: RequestCallback): TRequest;

        head(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        head(uri: string, callback?: RequestCallback): TRequest;
        head(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        head(callback?: RequestCallback): TRequest;

        patch(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        patch(uri: string, callback?: RequestCallback): TRequest;
        patch(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        patch(callback?: RequestCallback): TRequest;

        del(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        del(uri: string, callback?: RequestCallback): TRequest;
        del(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        del(callback?: RequestCallback): TRequest;

        delete(uri: string, options?: TOptions, callback?: RequestCallback): TRequest;
        delete(uri: string, callback?: RequestCallback): TRequest;
        delete(options: TUriUrlOptions & TOptions, callback?: RequestCallback): TRequest;
        delete(callback?: RequestCallback): TRequest;
    }

    interface CoreOptions {
        baseUrl?: string | undefined;
        callback?: RequestCallback | undefined;
        jar?: CookieJar | boolean | undefined;
        formData?: { [key: string]: any } | undefined;
        form?: { [key: string]: any } | string | undefined;
        auth?: AuthOptions | undefined;
        oauth?: OAuthOptions | undefined;
        aws?: AWSOptions | undefined;
        hawk?: HawkOptions | undefined;
        qs?: any;
        qsStringifyOptions?: any;
        qsParseOptions?: any;
        json?: any;
        jsonReviver?: ((key: string, value: any) => any) | undefined;
        jsonReplacer?: ((key: string, value: any) => any) | undefined;
        multipart?: RequestPart[] | Multipart | undefined;
        agent?: http.Agent | https.Agent | undefined;
        agentOptions?: http.AgentOptions | https.AgentOptions | undefined;
        agentClass?: any;
        forever?: any;
        host?: string | undefined;
        port?: number | undefined;
        method?: string | undefined;
        headers?: Headers | undefined;
        body?: any;
        family?: 4 | 6 | undefined;
        followRedirect?: boolean | ((response: http.IncomingMessage) => boolean) | undefined;
        followAllRedirects?: boolean | undefined;
        followOriginalHttpMethod?: boolean | undefined;
        maxRedirects?: number | undefined;
        removeRefererHeader?: boolean | undefined;
        encoding?: string | null | undefined;
        pool?: PoolOptions | undefined;
        timeout?: number | undefined;
        localAddress?: string | undefined;
        proxy?: any;
        tunnel?: boolean | undefined;
        strictSSL?: boolean | undefined;
        rejectUnauthorized?: boolean | undefined;
        time?: boolean | undefined;
        gzip?: boolean | undefined;
        preambleCRLF?: boolean | undefined;
        postambleCRLF?: boolean | undefined;
        withCredentials?: boolean | undefined;
        key?: Buffer | undefined;
        cert?: Buffer | undefined;
        passphrase?: string | undefined;
        ca?: string | Buffer | string[] | Buffer[] | undefined;
        har?: HttpArchiveRequest | undefined;
        useQuerystring?: boolean | undefined;
    }

    interface UriOptions {
        uri: string | Url;
    }
    interface UrlOptions {
        url: string | Url;
    }
    type RequiredUriUrl = UriOptions | UrlOptions;

    type OptionalUriUrl = RequiredUriUrl | {};

    type OptionsWithUri = UriOptions & CoreOptions;
    type OptionsWithUrl = UrlOptions & CoreOptions;
    type Options = OptionsWithUri | OptionsWithUrl;

    type MultipartBody = string | Buffer | ArrayBuffer | Uint8Array;

    type RequestCallback = (error: any, response: Response, body: any) => void;

    interface HttpArchiveRequest {
        url?: string | undefined;
        method?: string | undefined;
        headers?: NameValuePair[] | undefined;
        postData?: {
            mimeType?: string | undefined;
            params?: NameValuePair[] | undefined;
        } | undefined;
    }

    interface ExtraPoolOptions {
        maxSockets?: number | undefined;
    }

    type PoolOptions = false | { [key: string]: http.Agent | https.Agent } & ExtraPoolOptions | ExtraPoolOptions;

    interface NameValuePair {
        name: string;
        value: string;
    }

    interface Multipart {
        chunked?: boolean | undefined;
        data?:
            | Array<{
                "content-type"?: string | undefined;
                body: MultipartBody;
            }>
            | undefined;
    }

    interface RequestPart {
        headers?: Headers | undefined;
        body: any;
    }

    interface Request extends caseless.Httpified, stream.Stream {
        readable: boolean;
        writable: boolean;
        explicitMethod?: true | undefined;

        debug(...args: any[]): void;
        pipeDest(dest: any): void;
        qs(q: object, clobber?: boolean): Request;
        form(): FormData;
        form(form: any): Request;
        multipart(multipart: RequestPart[]): Request;
        json(val: any): Request;
        aws(opts: AWSOptions, now?: boolean): Request;
        hawk(opts: HawkOptions): void;
        auth(username: string, password: string, sendImmediately?: boolean, bearer?: string): Request;
        oauth(oauth: OAuthOptions): Request;
        jar(jar: CookieJar): Request;

        on(event: string, listener: (...args: any[]) => void): this;
        on(event: "request", listener: (req: http.ClientRequest) => void): this;
        on(event: "response", listener: (resp: Response) => void): this;
        on(event: "data", listener: (data: Buffer | string) => void): this;
        on(event: "error", listener: (e: Error) => void): this;
        on(event: "complete", listener: (resp: Response, body?: string | Buffer) => void): this;
        on(event: "pipe", listener: (src: stream.Readable) => void): this;
        on(event: "socket", listener: (src: net.Socket) => void): this;

        write(buffer: Buffer | string, cb?: (err?: Error) => void): boolean;
        write(str: string, encoding?: string, cb?: (err?: Error) => void): boolean;
        end(cb?: () => void): any;
        end(chunk: string | Buffer, cb?: () => void): any;
        end(str: string, encoding?: string, cb?: () => void): any;

        pause(): void;
        resume(): void;
        abort(): void;
        destroy(): void;
        toJSON(): RequestAsJSON;

        // several of the CoreOptions are copied onto the request instance
        host?: string | undefined;
        port?: number | undefined;
        followAllRedirects?: boolean | undefined;
        followOriginalHttpMethod?: boolean | undefined;
        maxRedirects?: number | undefined;
        removeRefererHeader?: boolean | undefined;
        encoding?: string | null | undefined;
        timeout?: number | undefined;
        localAddress?: string | undefined;
        strictSSL?: boolean | undefined;
        rejectUnauthorized?: boolean | undefined;
        time?: boolean | undefined;
        gzip?: boolean | undefined;
        preambleCRLF?: boolean | undefined;
        postambleCRLF?: boolean | undefined;
        withCredentials?: boolean | undefined;
        key?: Buffer | undefined;
        cert?: Buffer | undefined;
        passphrase?: string | undefined;
        ca?: string | Buffer | string[] | Buffer[] | undefined;
        har?: HttpArchiveRequest | undefined;

        // set in `Request.prototype.init`
        headers: Headers;
        method: string;
        pool: PoolOptions;
        dests: stream.Readable[];
        callback?: RequestCallback | undefined;
        uri: Url & { href: string; pathname: string };
        proxy: null | string | Url;
        tunnel: boolean;
        setHost: boolean;
        path: string;
        agent: false | http.Agent | https.Agent;
        body: Buffer | Buffer[] | string | string[] | stream.Readable;
        timing?: boolean | undefined;
        src?: stream.Readable | undefined;

        // set in `Request.prototype.start`
        href: string;
        startTime?: number | undefined;
        startTimeNow?: number | undefined;
        timings?: {
            socket: number;
            lookup: number;
            connect: number;
            response: number;
            end: number;
        } | undefined;

        // set in `Request.prototype.onRequestResponse`
        elapsedTime?: number | undefined;
        response?: Response | undefined;
    }

    interface Response extends http.IncomingMessage {
        statusCode: number;
        statusMessage: string;
        request: Request;
        body: any; // Buffer, string, stream.Readable, or a plain object if `json` was truthy
        caseless: caseless.Caseless; // case-insensitive access to headers
        toJSON(): ResponseAsJSON;

        timingStart?: number | undefined;
        elapsedTime?: number | undefined;
        timings?: {
            socket: number;
            lookup: number;
            connect: number;
            response: number;
            end: number;
        } | undefined;
        timingPhases?: {
            wait: number;
            dns: number;
            tcp: number;
            firstByte: number;
            download: number;
            total: number;
        } | undefined;
    }

    // aliases for backwards compatibility
    type ResponseRequest = Request;
    type RequestResponse = Response;

    interface Headers {
        [key: string]: any;
    }

    interface AuthOptions {
        user?: string | undefined;
        username?: string | undefined;
        pass?: string | undefined;
        password?: string | undefined;
        sendImmediately?: boolean | undefined;
        bearer?: string | (() => string) | undefined;
    }

    interface OAuthOptions {
        callback?: string | undefined;
        consumer_key?: string | undefined;
        consumer_secret?: string | undefined;
        token?: string | undefined;
        token_secret?: string | undefined;
        transport_method?: "body" | "header" | "query" | undefined;
        verifier?: string | undefined;
        body_hash?: true | string | undefined;
    }

    interface HawkOptions {
        credentials: any;
    }

    interface AWSOptions {
        secret: string;
        bucket?: string | undefined;
    }

    interface RequestAsJSON {
        uri: Url;
        method: string;
        headers: Headers;
    }

    interface ResponseAsJSON {
        statusCode: number;
        body: any;
        headers: Headers;
        request: RequestAsJSON;
    }

    type Cookie = tough.Cookie;

    interface CookieJar {
        setCookie(cookieOrStr: Cookie | string, uri: string | Url, options?: tough.CookieJar.SetCookieOptions): void;
        getCookieString(uri: string | Url): string;
        getCookies(uri: string | Url): Cookie[];
    }
}
declare var request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
export = request;
