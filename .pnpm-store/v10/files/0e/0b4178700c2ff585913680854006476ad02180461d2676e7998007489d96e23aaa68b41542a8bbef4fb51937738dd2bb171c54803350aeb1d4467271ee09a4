import type * as http from 'http';
type Interceptor<TReq = http.IncomingMessage, TRes = http.ServerResponse> = (buffer: Buffer, proxyRes: TReq, req: TReq, res: TRes) => Promise<Buffer | string>;
/**
 * Intercept responses from upstream.
 * Automatically decompress (deflate, gzip, brotli).
 * Give developer the opportunity to modify intercepted Buffer and http.ServerResponse
 *
 * NOTE: must set options.selfHandleResponse=true (prevent automatic call of res.end())
 */
export declare function responseInterceptor<TReq extends http.IncomingMessage = http.IncomingMessage, TRes extends http.ServerResponse = http.ServerResponse>(interceptor: Interceptor<TReq, TRes>): (proxyRes: TReq, req: TReq, res: TRes) => Promise<void>;
export {};
