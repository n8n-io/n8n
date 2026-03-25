/// <reference types="node" />

import FormData = require("form-data");
import { RequestOptions } from "http";
import { URL, URLSearchParams } from "url";
import { AbortSignal } from "./externals";

declare class Request extends Body {
    constructor(input: RequestInfo, init?: RequestInit);
    clone(): Request;
    context: RequestContext;
    headers: Headers;
    method: string;
    redirect: RequestRedirect;
    referrer: string;
    url: string;

    // node-fetch extensions to the whatwg/fetch spec
    agent?: RequestOptions["agent"] | ((parsedUrl: URL) => RequestOptions["agent"]);
    compress: boolean;
    counter: number;
    follow: number;
    hostname: string;
    port?: number | undefined;
    protocol: string;
    size: number;
    timeout: number;
}

interface RequestInit {
    // whatwg/fetch standard options
    body?: BodyInit | undefined;
    headers?: HeadersInit | undefined;
    method?: string | undefined;
    redirect?: RequestRedirect | undefined;
    signal?: AbortSignal | null | undefined;

    // node-fetch extensions
    agent?: RequestOptions["agent"] | ((parsedUrl: URL) => RequestOptions["agent"]); // =null http.Agent instance, allows custom proxy, certificate etc.
    compress?: boolean | undefined; // =true support gzip/deflate content encoding. false to disable
    follow?: number | undefined; // =20 maximum redirect count. 0 to not follow redirect
    size?: number | undefined; // =0 maximum response body size in bytes. 0 to disable
    timeout?: number | undefined; // =0 req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies)

    // node-fetch does not support mode, cache or credentials options
}

type RequestContext =
    | "audio"
    | "beacon"
    | "cspreport"
    | "download"
    | "embed"
    | "eventsource"
    | "favicon"
    | "fetch"
    | "font"
    | "form"
    | "frame"
    | "hyperlink"
    | "iframe"
    | "image"
    | "imageset"
    | "import"
    | "internal"
    | "location"
    | "manifest"
    | "object"
    | "ping"
    | "plugin"
    | "prefetch"
    | "script"
    | "serviceworker"
    | "sharedworker"
    | "style"
    | "subresource"
    | "track"
    | "video"
    | "worker"
    | "xmlhttprequest"
    | "xslt";
type RequestMode = "cors" | "no-cors" | "same-origin";
type RequestRedirect = "error" | "follow" | "manual";
type RequestCredentials = "omit" | "include" | "same-origin";

type RequestCache =
    | "default"
    | "force-cache"
    | "no-cache"
    | "no-store"
    | "only-if-cached"
    | "reload";

declare class Headers implements Iterable<[string, string]> {
    constructor(init?: HeadersInit);
    forEach(callback: (value: string, name: string) => void): void;
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    raw(): { [k: string]: string[] };
    set(name: string, value: string): void;

    // Iterable methods
    entries(): IterableIterator<[string, string]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<string>;
    [Symbol.iterator](): Iterator<[string, string]>;
}

type BlobPart = ArrayBuffer | ArrayBufferView | Blob | string;

interface BlobOptions {
    type?: string | undefined;
    endings?: "transparent" | "native" | undefined;
}

declare class Blob {
    constructor(blobParts?: BlobPart[], options?: BlobOptions);
    readonly type: string;
    readonly size: number;
    slice(start?: number, end?: number): Blob;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
}

declare class Body {
    constructor(body?: any, opts?: { size?: number | undefined; timeout?: number | undefined });
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    body: NodeJS.ReadableStream;
    bodyUsed: boolean;
    buffer(): Promise<Buffer>;
    json(): Promise<any>;
    size: number;
    text(): Promise<string>;
    textConverted(): Promise<string>;
    timeout: number;
}

interface SystemError extends Error {
    code?: string | undefined;
}

declare class AbortError extends Error {
    readonly name: "AbortError";
    constructor(message: string);
    readonly type: "aborted";
}

declare class FetchError extends Error {
    name: "FetchError";
    constructor(message: string, type: string, systemError?: SystemError);
    type: string;
    code?: string | undefined;
    errno?: string | undefined;
}

declare class Response extends Body {
    constructor(body?: BodyInit, init?: ResponseInit);
    static error(): Response;
    static redirect(url: string, status: number): Response;
    clone(): Response;
    headers: Headers;
    ok: boolean;
    redirected: boolean;
    status: number;
    statusText: string;
    type: ResponseType;
    url: string;
}

type ResponseType =
    | "basic"
    | "cors"
    | "default"
    | "error"
    | "opaque"
    | "opaqueredirect";

interface ResponseInit {
    headers?: HeadersInit | undefined;
    size?: number | undefined;
    status?: number | undefined;
    statusText?: string | undefined;
    timeout?: number | undefined;
    url?: string | undefined;
    counter?: number | undefined;
}

interface URLLike {
    href: string;
}

type HeadersInit = Headers | string[][] | { [key: string]: string | string[] };
type BodyInit =
    | ArrayBuffer
    | ArrayBufferView
    | NodeJS.ReadableStream
    | string
    | URLSearchParams
    | FormData;
type RequestInfo = string | URLLike | Request;

declare function fetch(
    url: RequestInfo,
    init?: RequestInit,
): Promise<Response>;

declare namespace fetch {
    export {
        AbortError,
        Blob,
        Body,
        BodyInit,
        FetchError,
        Headers,
        HeadersInit,
        // HeaderInit is exported to support backwards compatibility. See PR #34382
        HeadersInit as HeaderInit,
        Request,
        RequestCache,
        RequestContext,
        RequestCredentials,
        RequestInfo,
        RequestInit,
        RequestMode,
        RequestRedirect,
        Response,
        ResponseInit,
        ResponseType,
    };
    export function isRedirect(code: number): boolean;

    import _default = fetch;
    export { _default as default };
}

export = fetch;
