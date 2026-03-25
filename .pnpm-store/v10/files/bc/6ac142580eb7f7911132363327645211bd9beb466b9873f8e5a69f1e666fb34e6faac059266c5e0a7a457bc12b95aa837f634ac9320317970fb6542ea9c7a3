import type { BatchRequestDocument, GraphQLClientRequestHeaders, GraphQLClientResponse, RequestConfig, RequestMiddleware, ResponseMiddleware, VariablesAndRequestHeadersArgs } from './types.js';
import { BatchRequestsExtendedOptions, BatchRequestsOptions, ClientError, RawRequestExtendedOptions, RawRequestOptions, RequestDocument, RequestExtendedOptions, RequestOptions, Variables } from './types.js';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
/**
 * GraphQL Client.
 */
declare class GraphQLClient {
    private url;
    readonly requestConfig: RequestConfig;
    constructor(url: string, requestConfig?: RequestConfig);
    /**
     * Send a GraphQL query to the server.
     */
    rawRequest: RawRequestMethod;
    /**
     * Send a GraphQL document to the server.
     */
    request<T, V extends Variables = Variables>(document: RequestDocument | TypedDocumentNode<T, V>, ...variablesAndRequestHeaders: VariablesAndRequestHeadersArgs<V>): Promise<T>;
    request<T, V extends Variables = Variables>(options: RequestOptions<V, T>): Promise<T>;
    /**
     * Send GraphQL documents in batch to the server.
     */
    batchRequests<T extends BatchResult, V extends Variables = Variables>(documents: BatchRequestDocument<V>[], requestHeaders?: GraphQLClientRequestHeaders): Promise<T>;
    batchRequests<T extends BatchResult, V extends Variables = Variables>(options: BatchRequestsOptions<V>): Promise<T>;
    setHeaders(headers: GraphQLClientRequestHeaders): GraphQLClient;
    /**
     * Attach a header to the client. All subsequent requests will have this header.
     */
    setHeader(key: string, value: string): GraphQLClient;
    /**
     * Change the client endpoint. All subsequent requests will send to this endpoint.
     */
    setEndpoint(value: string): GraphQLClient;
}
interface RawRequestMethod {
    <T, V extends Variables = Variables>(query: string, variables?: V, requestHeaders?: GraphQLClientRequestHeaders): Promise<GraphQLClientResponse<T>>;
    <T, V extends Variables = Variables>(options: RawRequestOptions<V>): Promise<GraphQLClientResponse<T>>;
}
interface RawRequest {
    <T, V extends Variables = Variables>(url: string, query: string, ...variablesAndRequestHeaders: VariablesAndRequestHeadersArgs<V>): Promise<GraphQLClientResponse<T>>;
    <T, V extends Variables = Variables>(options: RawRequestExtendedOptions<V>): Promise<GraphQLClientResponse<T>>;
}
/**
 * Send a GraphQL Query to the GraphQL server for execution.
 */
declare const rawRequest: RawRequest;
/**
 * Send a GraphQL Document to the GraphQL server for execution.
 *
 * @example
 *
 * ```ts
 * // You can pass a raw string
 *
 * await request('https://foo.bar/graphql', `
 *   {
 *     query {
 *       users
 *     }
 *   }
 * `)
 *
 * // You can also pass a GraphQL DocumentNode. Convenient if you
 * // are using graphql-tag package.
 *
 * import gql from 'graphql-tag'
 *
 * await request('https://foo.bar/graphql', gql`...`)
 *
 * // If you don't actually care about using DocumentNode but just
 * // want the tooling support for gql template tag like IDE syntax
 * // coloring and prettier autoformat then note you can use the
 * // passthrough gql tag shipped with graphql-request to save a bit
 * // of performance and not have to install another dep into your project.
 *
 * import { gql } from 'graphql-request'
 *
 * await request('https://foo.bar/graphql', gql`...`)
 * ```
 */
declare function request<T, V extends Variables = Variables>(options: RequestExtendedOptions<V, T>): Promise<T>;
declare function request<T, V extends Variables = Variables>(url: string, document: RequestDocument | TypedDocumentNode<T, V>, ...variablesAndRequestHeaders: VariablesAndRequestHeadersArgs<V>): Promise<T>;
/**
 * Send a batch of GraphQL Document to the GraphQL server for execution.
 *
 * @example
 *
 * ```ts
 * // You can pass a raw string
 *
 * await batchRequests('https://foo.bar/graphql', [
 * {
 *  query: `
 *   {
 *     query {
 *       users
 *     }
 *   }`
 * },
 * {
 *   query: `
 *   {
 *     query {
 *       users
 *     }
 *   }`
 * }])
 *
 * // You can also pass a GraphQL DocumentNode as query. Convenient if you
 * // are using graphql-tag package.
 *
 * import gql from 'graphql-tag'
 *
 * await batchRequests('https://foo.bar/graphql', [{ query: gql`...` }])
 * ```
 */
declare const batchRequests: BatchRequests;
interface Result<Data extends object = object> {
    data: Data;
}
type BatchResult = [Result, ...Result[]];
interface BatchRequests {
    <T extends BatchResult, V extends Variables = Variables>(url: string, documents: BatchRequestDocument<V>[], requestHeaders?: GraphQLClientRequestHeaders): Promise<T>;
    <T extends BatchResult, V extends Variables = Variables>(options: BatchRequestsExtendedOptions<V>): Promise<T>;
}
/**
 * Convenience passthrough template tag to get the benefits of tooling for the gql template tag. This does not actually parse the input into a GraphQL DocumentNode like graphql-tag package does. It just returns the string with any variables given interpolated. Can save you a bit of performance and having to install another package.
 *
 * @example
 * ```
 * import { gql } from 'graphql-request'
 *
 * await request('https://foo.bar/graphql', gql`...`)
 * ```
 *
 * @remarks
 *
 * Several tools in the Node GraphQL ecosystem are hardcoded to specially treat any template tag named "gql". For example see this prettier issue: https://github.com/prettier/prettier/issues/4360. Using this template tag has no runtime effect beyond variable interpolation.
 */
export declare const gql: (chunks: TemplateStringsArray, ...variables: unknown[]) => string;
export { GraphQLWebSocketClient } from './graphql-ws.js';
export { resolveRequestDocument } from './resolveRequestDocument.js';
export { BatchRequestDocument, batchRequests, BatchRequestsExtendedOptions, BatchRequestsOptions, ClientError, GraphQLClient, rawRequest, RawRequestExtendedOptions, RawRequestOptions, request, RequestDocument, RequestExtendedOptions, RequestMiddleware, RequestOptions, ResponseMiddleware, Variables, };
export default request;
//# sourceMappingURL=index.d.ts.map