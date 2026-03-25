import * as http from "http";
import * as http2 from "http2";
import * as https from "https";
import { Stream } from "stream";
import methods = require("methods");

import SAgent = require("./agent");
import { Blob } from "buffer";
import { ReadStream } from "fs";
import { LookupFunction } from "net";
import RequestBase = require("../request-base");
import ResponseBase = require("./response");
import { AppendOptions } from "form-data";
import { AgentOptions as SAgentOptions, CBHandler, URLType } from "../../types";
import { Request as Http2Request } from "./http2wrapper";

type HttpMethod<Req extends request.Request> =
    | ((url: URLType, callback?: CBHandler) => Req)
    | ((url: URLType, data?: string | Record<string, any>, callback?: CBHandler) => Req);

type RequestMethods<Req extends request.Request> = {
    [key in (typeof methods[number]) | "del"]: HttpMethod<Req>;
};

declare class SARequest extends Stream implements RequestBase {
    constructor(method: string, url: URLType);

    method: string;
    url: string;
    cookies: string;
    req: http.ClientRequest | Http2Request;
    res: http.IncomingMessage | (http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader);

    [Symbol.toStringTag]: string;

    attach(
        field: string,
        file: request.MultipartValueSingle,
        options?: string | { filename?: string | undefined; contentType?: string | undefined },
    ): this;
    abort(): this;
    accept(type: string): this;
    agent(): SAgent | http.Agent | https.Agent;
    agent(agent: SAgent | http.Agent | https.Agent): this;
    auth(token: string, options: { type: "bearer" }): this;
    auth(user: string, pass: string, options?: { type: "basic" | "auto"; encoder?: (str: string) => string }): this;
    buffer(val?: boolean): this;
    ca(cert: string | string[] | Buffer | Buffer[]): this;
    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
    ): Promise<ResponseBase | TResult>;
    cert(cert: string | string[] | Buffer | Buffer[]): this;
    clearTimeout(): this;
    connect(override: string | { [hostname: string]: false | string | { host: string; port: number } }): this;
    disableTLSCerts(): this;
    end(callback?: CBHandler): void;
    field(
        fields: {
            [fieldName: string]:
                | (string | number | boolean | Blob | Buffer | ReadStream)
                | Array<string | number | boolean | Blob | Buffer | ReadStream>;
        },
    ): this;
    field(
        name: string,
        val:
            | (string | number | boolean | Blob | Buffer | ReadStream)
            | Array<string | number | boolean | Blob | Buffer | ReadStream>,
        options?: AppendOptions | string,
    ): this;
    finally(onfinally?: (() => void) | null): Promise<ResponseBase>;
    get(header: string): string;
    getHeader(header: string): string;
    http2(enable?: boolean): this;
    key(cert: string | string[] | Buffer | Buffer[]): this;
    lookup(): LookupFunction;
    lookup(lookup: LookupFunction): this;
    maxResponseSize(n: number): this;
    ok(callback: (res: ResponseBase) => boolean): this;
    parse(
        parser:
            | ((str: string) => any)
            | ((res: ResponseBase, callback: (err: Error | null, body: any) => void) => void),
    ): this;
    pfx(cert: string | string[] | Buffer | Buffer[] | { pfx: string | Buffer; passphrase: string }): this;
    query(val: Record<string, any> | string): this;
    redirects(n: number): this;
    responseType(type: string): this;
    retry(count?: number, callback?: CBHandler): this;
    send(data?: string | object): this;
    serialize(serializer: (obj: any) => string): this;
    set(field: "Cookie", val: string[]): this;
    set(field: http.IncomingHttpHeaders): this;
    set(field: string, val: string): this;
    sortQuery(sort?: boolean | ((a: string, b: string) => number)): this;
    then<TResult1 = ResponseBase, TResult2 = never>(
        onfulfilled?: ((value: ResponseBase) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2>;
    timeout(ms: number | { deadline?: number; response?: number }): this;
    toJSON(): { method: string; url: string; data?: string | object; headers: Array<string | string[]> };
    trustLocalhost(enabled?: boolean): this;
    type(val: string): this;
    unset(field: string): this;
    use(fn: (req: this) => void): this;
    withCredentials(on?: boolean): this;
    write(data: string | Buffer, encoding?: string): boolean;
}

declare namespace request {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request extends SARequest {}
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Response extends ResponseBase {}
    type SuperAgentRequest = Request;
    type Agent = SAgent;
    type Plugin = (req: Request) => void;
    type AgentOptions = SAgentOptions;

    type CallbackHandler = CBHandler;

    type MultipartValueSingle = Blob | Buffer | ReadStream | string | boolean | number;

    interface ProgressEvent {
        direction: "download" | "upload";
        loaded: number;
        percent?: number | undefined;
        total?: number | undefined;
    }

    interface ResponseError extends Error {
        status?: number | undefined;
        response?: Response | undefined;
        timeout?: boolean | undefined;
    }

    interface HTTPError extends Error {
        status: number;
        text: string;
        method: string;
        path: string;
    }

    type SuperAgent<Req extends Request = Request> = RequestMethods<Req> & Stream;

    interface SuperAgentStatic<Req extends Request = Request> extends SuperAgent<Req> {
        (url: URLType): Request;
        (method: string, url: URLType): Request;
        (url: URLType, cb: CBHandler): void;

        Request: typeof SARequest;
        Response: typeof ResponseBase;
        agent: typeof SAgent & ((options?: SAgentOptions) => InstanceType<typeof SAgent>);
        protocols: {
            "http:": typeof http;
            "https:": typeof https;
            "http2:": typeof http2;
        };
        serialize: Record<string, (...args: any[]) => string>;
        parse: Record<string, (res: Response, cb: (err: any, res: Response) => void) => void>;
        buffer: Record<string, boolean>;
    }
}

declare const request: request.SuperAgentStatic;

export = request;
