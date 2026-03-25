import { OutgoingHttpHeaders } from 'node:http';

declare const getResponseCache: unique symbol;
declare const cacheKey: unique symbol;
type InternalCache = [
    number,
    string | ReadableStream,
    Record<string, string> | Headers | OutgoingHttpHeaders
];
declare const GlobalResponse: {
    new (body?: BodyInit | null, init?: ResponseInit): globalThis.Response;
    prototype: globalThis.Response;
    error(): globalThis.Response;
    json(data: any, init?: ResponseInit): globalThis.Response;
    redirect(url: string | URL, status?: number): globalThis.Response;
};
declare class Response {
    #private;
    [getResponseCache](): globalThis.Response;
    constructor(body?: BodyInit | null, init?: ResponseInit);
    get headers(): Headers;
    get status(): number;
    get ok(): boolean;
}

export { GlobalResponse, type InternalCache, Response, cacheKey };
