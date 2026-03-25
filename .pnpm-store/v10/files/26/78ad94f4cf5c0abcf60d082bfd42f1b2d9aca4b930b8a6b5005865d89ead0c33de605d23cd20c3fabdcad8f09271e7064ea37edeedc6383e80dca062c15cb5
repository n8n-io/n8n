import type { RemoveIndex } from './helpers.js';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { fetch } from 'cross-fetch';
import type { GraphQLError } from 'graphql/error/GraphQLError.js';
import type { DocumentNode } from 'graphql/language/ast.js';
export type Fetch = typeof fetch;
/**
 * 'None' will throw whenever the response contains errors
 *
 * 'Ignore' will ignore incoming errors and resolve like no errors occurred
 *
 * 'All' will return both the errors and data
 */
export type ErrorPolicy = 'none' | 'ignore' | 'all';
export interface JsonSerializer {
    stringify: (obj: any) => string;
    parse: (obj: string) => unknown;
}
export interface AdditionalRequestOptions {
    jsonSerializer?: JsonSerializer;
    /**
     * Decide how to handle GraphQLErrors in response
     */
    errorPolicy?: ErrorPolicy;
}
export interface FetchOptions extends RequestInit, AdditionalRequestOptions {
}
export type { GraphQLError };
export type Variables = Record<string, unknown>;
export type BatchVariables = (Record<string, unknown> | undefined)[];
export interface GraphQLResponse<T = unknown> {
    data?: T;
    errors?: GraphQLError[];
    extensions?: unknown;
    status: number;
    [key: string]: unknown;
}
export interface GraphQLRequestContext<V extends Variables = Variables> {
    query: string | string[];
    variables?: V;
}
export declare class ClientError extends Error {
    response: GraphQLResponse;
    request: GraphQLRequestContext;
    constructor(response: GraphQLResponse, request: GraphQLRequestContext);
    private static extractMessage;
}
export type MaybeLazy<T> = T | (() => T);
export type RequestDocument = string | DocumentNode;
export interface GraphQLClientResponse<Data> {
    status: number;
    headers: Headers;
    data: Data;
    extensions?: unknown;
    errors?: GraphQLError[];
}
export type HTTPMethodInput = 'GET' | 'POST' | 'get' | 'post';
export interface RequestConfig extends Omit<RequestInit, 'headers' | 'method'>, AdditionalRequestOptions {
    fetch?: Fetch;
    method?: HTTPMethodInput;
    headers?: MaybeLazy<GraphQLClientRequestHeaders>;
    requestMiddleware?: RequestMiddleware;
    responseMiddleware?: ResponseMiddleware;
    jsonSerializer?: JsonSerializer;
}
export type BatchRequestDocument<V extends Variables = Variables> = {
    document: RequestDocument;
    variables?: V;
};
export type RawRequestOptions<V extends Variables = Variables> = {
    query: string;
    requestHeaders?: GraphQLClientRequestHeaders;
    signal?: RequestInit['signal'];
} & (V extends Record<any, never> ? {
    variables?: V;
} : keyof RemoveIndex<V> extends never ? {
    variables?: V;
} : {
    variables: V;
});
export type RequestOptions<V extends Variables = Variables, T = unknown> = {
    document: RequestDocument | TypedDocumentNode<T, V>;
    requestHeaders?: GraphQLClientRequestHeaders;
    signal?: RequestInit['signal'];
} & (V extends Record<any, never> ? {
    variables?: V;
} : keyof RemoveIndex<V> extends never ? {
    variables?: V;
} : {
    variables: V;
});
export interface BatchRequestsOptions<V extends Variables = Variables> {
    documents: BatchRequestDocument<V>[];
    requestHeaders?: GraphQLClientRequestHeaders;
    signal?: RequestInit['signal'];
}
export type RequestExtendedOptions<V extends Variables = Variables, T = unknown> = {
    url: string;
} & RequestOptions<V, T>;
export type RawRequestExtendedOptions<V extends Variables = Variables> = {
    url: string;
} & RawRequestOptions<V>;
export interface BatchRequestsExtendedOptions<V extends Variables = Variables> extends BatchRequestsOptions<V> {
    url: string;
}
export type ResponseMiddleware = (response: GraphQLClientResponse<unknown> | Error) => void;
export type RequestMiddleware<V extends Variables = Variables> = (request: RequestExtendedInit<V>) => RequestExtendedInit | Promise<RequestExtendedInit>;
type RequestExtendedInit<V extends Variables = Variables> = RequestInit & {
    url: string;
    operationName?: string;
    variables?: V;
};
export type GraphQLClientRequestHeaders = Headers | string[][] | Record<string, string>;
export type VariablesAndRequestHeadersArgs<V extends Variables> = V extends Record<any, never> ? [variables?: V, requestHeaders?: GraphQLClientRequestHeaders] : keyof RemoveIndex<V> extends never ? [variables?: V, requestHeaders?: GraphQLClientRequestHeaders] : [variables: V, requestHeaders?: GraphQLClientRequestHeaders];
//# sourceMappingURL=types.d.ts.map