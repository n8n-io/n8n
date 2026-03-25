/**
 * @module
 * This module provides types definitions and variables for the routers.
 */
/**
 * Constant representing all HTTP methods in uppercase.
 */
export declare const METHOD_NAME_ALL: "ALL";
/**
 * Constant representing all HTTP methods in lowercase.
 */
export declare const METHOD_NAME_ALL_LOWERCASE: "all";
/**
 * Array of supported HTTP methods.
 */
export declare const METHODS: readonly ["get", "post", "put", "delete", "options", "patch"];
/**
 * Error message indicating that a route cannot be added because the matcher is already built.
 */
export declare const MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
/**
 * Interface representing a router.
 *
 * @template T - The type of the handler.
 */
export interface Router<T> {
    /**
     * The name of the router.
     */
    name: string;
    /**
     * Adds a route to the router.
     *
     * @param method - The HTTP method (e.g., 'get', 'post').
     * @param path - The path for the route.
     * @param handler - The handler for the route.
     */
    add(method: string, path: string, handler: T): void;
    /**
     * Matches a route based on the given method and path.
     *
     * @param method - The HTTP method (e.g., 'get', 'post').
     * @param path - The path to match.
     * @returns The result of the match.
     */
    match(method: string, path: string): Result<T>;
}
/**
 * Type representing a map of parameter indices.
 */
export type ParamIndexMap = Record<string, number>;
/**
 * Type representing a stash of parameters.
 */
export type ParamStash = string[];
/**
 * Type representing a map of parameters.
 */
export type Params = Record<string, string>;
/**
 * Type representing the result of a route match.
 *
 * The result can be in one of two formats:
 * 1. An array of handlers with their corresponding parameter index maps, followed by a parameter stash.
 * 2. An array of handlers with their corresponding parameter maps.
 *
 * Example:
 *
 * [[handler, paramIndexMap][], paramArray]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                     // '*'
 *     [funcA,       {'id': 0}],              // '/user/:id/*'
 *     [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
 *   ],
 *   ['123', 'abc']
 * ]
 * ```
 *
 * [[handler, params][]]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                             // '*'
 *     [funcA,       {'id': '123'}],                  // '/user/:id/*'
 *     [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
 *   ]
 * ]
 * ```
 */
export type Result<T> = [[T, ParamIndexMap][], ParamStash] | [[T, Params][]];
/**
 * Error class representing an unsupported path error.
 */
export declare class UnsupportedPathError extends Error {
}
