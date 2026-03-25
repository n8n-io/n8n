/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as http from 'http';
import * as https from 'https';
import { HttpClientResponse } from './index';
export interface HttpClient {
    options(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    get(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    del(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    post(requestUrl: string, data: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    patch(requestUrl: string, data: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    put(requestUrl: string, data: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    sendStream(verb: string, requestUrl: string, stream: NodeJS.ReadableStream, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    request(verb: string, requestUrl: string, data: string | NodeJS.ReadableStream, headers: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    requestRaw(info: RequestInfo, data: string | NodeJS.ReadableStream): Promise<HttpClientResponse>;
    requestRawWithCallback(info: RequestInfo, data: string | NodeJS.ReadableStream, onResult: (err?: Error, res?: HttpClientResponse) => void): void;
}
export interface RequestHandler {
    prepareRequest(options: http.RequestOptions): void;
    canHandleAuthentication(response: HttpClientResponse): boolean;
    handleAuthentication(httpClient: HttpClient, requestInfo: RequestInfo, data: string | NodeJS.ReadableStream | null): Promise<HttpClientResponse>;
}
export interface RequestInfo {
    options: http.RequestOptions;
    parsedUrl: URL;
    httpModule: typeof http | typeof https;
}
export interface RequestOptions {
    headers?: http.OutgoingHttpHeaders;
    socketTimeout?: number;
    ignoreSslError?: boolean;
    allowRedirects?: boolean;
    allowRedirectDowngrade?: boolean;
    maxRedirects?: number;
    maxSockets?: number;
    keepAlive?: boolean;
    deserializeDates?: boolean;
    allowRetries?: boolean;
    maxRetries?: number;
}
export interface TypedResponse<T> {
    statusCode: number;
    result: T | null;
    headers: http.IncomingHttpHeaders;
}
