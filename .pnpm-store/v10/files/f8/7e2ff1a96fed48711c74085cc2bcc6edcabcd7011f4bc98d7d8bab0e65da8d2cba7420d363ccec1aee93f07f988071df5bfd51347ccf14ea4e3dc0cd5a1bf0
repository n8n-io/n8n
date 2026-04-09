import { NullableHeaders } from "./headers.js";
import type { BodyInit } from "./builtin-types.js";
import { Stream } from "../core/streaming.js";
import type { HTTPMethod, MergedRequestInit } from "./types.js";
import { type HeadersLike } from "./headers.js";
export type FinalRequestOptions = RequestOptions & {
    method: HTTPMethod;
    path: string;
};
export type RequestOptions = {
    method?: HTTPMethod;
    path?: string;
    query?: object | undefined | null;
    body?: unknown;
    headers?: HeadersLike;
    maxRetries?: number;
    stream?: boolean | undefined;
    timeout?: number;
    fetchOptions?: MergedRequestInit;
    signal?: AbortSignal | undefined | null;
    idempotencyKey?: string;
    defaultBaseURL?: string | undefined;
    __metadata?: Record<string, unknown>;
    __binaryResponse?: boolean | undefined;
    __streamClass?: typeof Stream;
};
export type EncodedContent = {
    bodyHeaders: HeadersLike;
    body: BodyInit;
};
export type RequestEncoder = (request: {
    headers: NullableHeaders;
    body: unknown;
}) => EncodedContent;
export declare const FallbackEncoder: RequestEncoder;
//# sourceMappingURL=request-options.d.ts.map