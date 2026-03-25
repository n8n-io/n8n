import { Octokit } from "@octokit/core";
import * as OctokitTypes from "@octokit/types";
export type { EndpointOptions, RequestInterface, OctokitResponse, RequestParameters, Route, } from "@octokit/types";
export type { PaginatingEndpoints } from "./generated/paginating-endpoints.js";
import type { PaginatingEndpoints } from "./generated/paginating-endpoints.js";
type KnownKeys<T> = Extract<{
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {
    [_ in keyof T]: infer U;
} ? U : never, keyof T>;
type KeysMatching<T, V> = {
    [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
type KnownKeysMatching<T, V> = KeysMatching<Pick<T, KnownKeys<T>>, V>;
type GetResultsType<T> = T extends {
    data: any[];
} ? T["data"] : T extends {
    data: object;
} ? T["data"][KnownKeysMatching<T["data"], any[]>] : never;
type NormalizeResponse<T> = T & {
    data: GetResultsType<T>;
};
type DataType<T> = "data" extends keyof T ? T["data"] : unknown;
export interface MapFunction<T = OctokitTypes.OctokitResponse<PaginationResults<unknown>>, M = unknown[]> {
    (response: T, done: () => void): M;
}
export type PaginationResults<T = unknown> = T[];
export interface PaginateInterface {
    /**
     * Paginate a request using endpoint options and map each response to a custom array
     *
     * @param {object} options Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     * @param {function} mapFn Optional method to map each response to a custom array
     */
    <T, M>(options: OctokitTypes.EndpointOptions, mapFn: MapFunction<OctokitTypes.OctokitResponse<PaginationResults<T>>, M[]>): Promise<PaginationResults<M>>;
    /**
     * Paginate a request using endpoint options
     *
     * @param {object} options Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <T>(options: OctokitTypes.EndpointOptions): Promise<PaginationResults<T>>;
    /**
     * Paginate a request using a known endpoint route string and map each response to a custom array
     *
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {function} mapFn Optional method to map each response to a custom array
     */
    <R extends keyof PaginatingEndpoints, M extends unknown[]>(route: R, mapFn: MapFunction<PaginatingEndpoints[R]["response"], M>): Promise<M>;
    /**
     * Paginate a request using a known endpoint route string and parameters, and map each response to a custom array
     *
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} parameters URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     * @param {function} mapFn Optional method to map each response to a custom array
     */
    <R extends keyof PaginatingEndpoints, M extends unknown[]>(route: R, parameters: PaginatingEndpoints[R]["parameters"], mapFn: MapFunction<PaginatingEndpoints[R]["response"], M>): Promise<M>;
    /**
     * Paginate a request using an known endpoint route string
     *
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} parameters? URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <R extends keyof PaginatingEndpoints>(route: R, parameters?: PaginatingEndpoints[R]["parameters"]): Promise<DataType<PaginatingEndpoints[R]["response"]>>;
    /**
     * Paginate a request using an unknown endpoint route string
     *
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} parameters? URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <T, R extends OctokitTypes.Route = OctokitTypes.Route>(route: R, parameters?: R extends keyof PaginatingEndpoints ? PaginatingEndpoints[R]["parameters"] : OctokitTypes.RequestParameters): Promise<T[]>;
    /**
     * Paginate a request using an endpoint method and a map function
     *
     * @param {string} request Request method (`octokit.request` or `@octokit/request`)
     * @param {function} mapFn? Optional method to map each response to a custom array
     */
    <R extends OctokitTypes.RequestInterface, M extends unknown[]>(request: R, mapFn: MapFunction<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>, M>): Promise<M>;
    /**
     * Paginate a request using an endpoint method, parameters, and a map function
     *
     * @param {string} request Request method (`octokit.request` or `@octokit/request`)
     * @param {object} parameters URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     * @param {function} mapFn? Optional method to map each response to a custom array
     */
    <R extends OctokitTypes.RequestInterface, M extends unknown[]>(request: R, parameters: Parameters<R>[0], mapFn: MapFunction<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>, M>): Promise<M>;
    /**
     * Paginate a request using an endpoint method and parameters
     *
     * @param {string} request Request method (`octokit.request` or `@octokit/request`)
     * @param {object} parameters? URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <R extends OctokitTypes.RequestInterface>(request: R, parameters?: Parameters<R>[0]): Promise<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>["data"]>;
    iterator: {
        /**
         * Get an async iterator to paginate a request using endpoint options
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         * @param {object} options Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <T>(options: OctokitTypes.EndpointOptions): AsyncIterableIterator<OctokitTypes.OctokitResponse<PaginationResults<T>>>;
        /**
         * Get an async iterator to paginate a request using a known endpoint route string and optional parameters
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <R extends keyof PaginatingEndpoints>(route: R, parameters?: PaginatingEndpoints[R]["parameters"]): AsyncIterableIterator<OctokitTypes.OctokitResponse<DataType<PaginatingEndpoints[R]["response"]>>>;
        /**
         * Get an async iterator to paginate a request using an unknown endpoint route string and optional parameters
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <T, R extends OctokitTypes.Route = OctokitTypes.Route>(route: R, parameters?: R extends keyof PaginatingEndpoints ? PaginatingEndpoints[R]["parameters"] : OctokitTypes.RequestParameters): AsyncIterableIterator<OctokitTypes.OctokitResponse<PaginationResults<T>>>;
        /**
         * Get an async iterator to paginate a request using a request method and optional parameters
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         * @param {string} request `@octokit/request` or `octokit.request` method
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <R extends OctokitTypes.RequestInterface>(request: R, parameters?: Parameters<R>[0]): AsyncIterableIterator<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>>;
    };
}
export interface ComposePaginateInterface {
    /**
     * Paginate a request using endpoint options and map each response to a custom array
     *
     * @param {object} octokit Octokit instance
     * @param {object} options Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     * @param {function} mapFn Optional method to map each response to a custom array
     */
    <T, M>(octokit: Octokit, options: OctokitTypes.EndpointOptions, mapFn: MapFunction<OctokitTypes.OctokitResponse<PaginationResults<T>>, M[]>): Promise<PaginationResults<M>>;
    /**
     * Paginate a request using endpoint options
     *
     * @param {object} octokit Octokit instance
     * @param {object} options Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <T>(octokit: Octokit, options: OctokitTypes.EndpointOptions): Promise<PaginationResults<T>>;
    /**
     * Paginate a request using a known endpoint route string and map each response to a custom array
     *
     * @param {object} octokit Octokit instance
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {function} mapFn Optional method to map each response to a custom array
     */
    <R extends keyof PaginatingEndpoints, M extends unknown[]>(octokit: Octokit, route: R, mapFn: MapFunction<PaginatingEndpoints[R]["response"], M>): Promise<M>;
    /**
     * Paginate a request using a known endpoint route string and parameters, and map each response to a custom array
     *
     * @param {object} octokit Octokit instance
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} parameters URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     * @param {function} mapFn Optional method to map each response to a custom array
     */
    <R extends keyof PaginatingEndpoints, M extends unknown[]>(octokit: Octokit, route: R, parameters: PaginatingEndpoints[R]["parameters"], mapFn: MapFunction<PaginatingEndpoints[R]["response"], M>): Promise<M>;
    /**
     * Paginate a request using an known endpoint route string
     *
     * @param {object} octokit Octokit instance
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} parameters? URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <R extends keyof PaginatingEndpoints>(octokit: Octokit, route: R, parameters?: PaginatingEndpoints[R]["parameters"]): Promise<DataType<PaginatingEndpoints[R]["response"]>>;
    /**
     * Paginate a request using an unknown endpoint route string
     *
     * @param {object} octokit Octokit instance
     * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
     * @param {object} parameters? URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <T, R extends OctokitTypes.Route = OctokitTypes.Route>(octokit: Octokit, route: R, parameters?: R extends keyof PaginatingEndpoints ? PaginatingEndpoints[R]["parameters"] : OctokitTypes.RequestParameters): Promise<T[]>;
    /**
     * Paginate a request using an endpoint method and a map function
     *
     * @param {object} octokit Octokit instance
     * @param {string} request Request method (`octokit.request` or `@octokit/request`)
     * @param {function} mapFn? Optional method to map each response to a custom array
     */
    <R extends OctokitTypes.RequestInterface, M extends unknown[]>(octokit: Octokit, request: R, mapFn: MapFunction<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>, M>): Promise<M>;
    /**
     * Paginate a request using an endpoint method, parameters, and a map function
     *
     * @param {object} octokit Octokit instance
     * @param {string} request Request method (`octokit.request` or `@octokit/request`)
     * @param {object} parameters URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     * @param {function} mapFn? Optional method to map each response to a custom array
     */
    <R extends OctokitTypes.RequestInterface, M extends unknown[]>(octokit: Octokit, request: R, parameters: Parameters<R>[0], mapFn: MapFunction<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>, M>): Promise<M>;
    /**
     * Paginate a request using an endpoint method and parameters
     *
     * @param {object} octokit Octokit instance
     * @param {string} request Request method (`octokit.request` or `@octokit/request`)
     * @param {object} parameters? URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
     */
    <R extends OctokitTypes.RequestInterface>(octokit: Octokit, request: R, parameters?: Parameters<R>[0]): Promise<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>["data"]>;
    iterator: {
        /**
         * Get an async iterator to paginate a request using endpoint options
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         *
         * @param {object} octokit Octokit instance
         * @param {object} options Must set `method` and `url`. Plus URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <T>(octokit: Octokit, options: OctokitTypes.EndpointOptions): AsyncIterableIterator<OctokitTypes.OctokitResponse<PaginationResults<T>>>;
        /**
         * Get an async iterator to paginate a request using a known endpoint route string and optional parameters
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         *
         * @param {object} octokit Octokit instance
         * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <R extends keyof PaginatingEndpoints>(octokit: Octokit, route: R, parameters?: PaginatingEndpoints[R]["parameters"]): AsyncIterableIterator<OctokitTypes.OctokitResponse<DataType<PaginatingEndpoints[R]["response"]>>>;
        /**
         * Get an async iterator to paginate a request using an unknown endpoint route string and optional parameters
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         *
         * @param {object} octokit Octokit instance
         * @param {string} route Request method + URL. Example: `'GET /orgs/{org}'`
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <T, R extends OctokitTypes.Route = OctokitTypes.Route>(octokit: Octokit, route: R, parameters?: R extends keyof PaginatingEndpoints ? PaginatingEndpoints[R]["parameters"] : OctokitTypes.RequestParameters): AsyncIterableIterator<OctokitTypes.OctokitResponse<PaginationResults<T>>>;
        /**
         * Get an async iterator to paginate a request using a request method and optional parameters
         *
         * @see {link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of} for await...of
         *
         * @param {object} octokit Octokit instance
         * @param {string} request `@octokit/request` or `octokit.request` method
         * @param {object} [parameters] URL, query or body parameters, as well as `headers`, `mediaType.format`, `request`, or `baseUrl`.
         */
        <R extends OctokitTypes.RequestInterface>(octokit: Octokit, request: R, parameters?: Parameters<R>[0]): AsyncIterableIterator<NormalizeResponse<OctokitTypes.GetResponseTypeFromEndpointMethod<R>>>;
    };
}
