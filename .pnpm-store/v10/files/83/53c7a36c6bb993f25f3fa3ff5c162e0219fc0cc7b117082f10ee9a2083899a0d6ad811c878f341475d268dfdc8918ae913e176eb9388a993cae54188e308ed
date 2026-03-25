import { IncomingMessage } from 'node:http';
import { Http2ServerRequest } from 'node:http2';

declare class RequestError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
declare const toRequestError: (e: unknown) => RequestError;
declare const GlobalRequest: {
    new (input: RequestInfo | URL, init?: RequestInit): globalThis.Request;
    prototype: globalThis.Request;
};
declare class Request extends GlobalRequest {
    constructor(input: string | Request, options?: RequestInit);
}
type IncomingMessageWithWrapBodyStream = IncomingMessage & {
    [wrapBodyStream]: boolean;
};
declare const wrapBodyStream: unique symbol;
declare const abortControllerKey: unique symbol;
declare const getAbortController: unique symbol;
declare const newRequest: (incoming: IncomingMessage | Http2ServerRequest, defaultHostname?: string) => any;

export { GlobalRequest, type IncomingMessageWithWrapBodyStream, Request, RequestError, abortControllerKey, getAbortController, newRequest, toRequestError, wrapBodyStream };
