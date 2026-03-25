/**
 * These are types for things that are present in the React `next` release channel.
 *
 * To load the types declared here in an actual project, there are three ways. The easiest one,
 * if your `tsconfig.json` already has a `"types"` array in the `"compilerOptions"` section,
 * is to add `"react/next"` to the `"types"` array.
 *
 * Alternatively, a specific import syntax can to be used from a typescript file.
 * This module does not exist in reality, which is why the {} is important:
 *
 * ```ts
 * import {} from 'react/next'
 * ```
 *
 * It is also possible to include it through a triple-slash reference:
 *
 * ```ts
 * /// <reference types="react/next" />
 * ```
 *
 * Either the import or the reference only needs to appear once, anywhere in the project.
 */

// See https://github.com/facebook/react/blob/main/packages/react/src/React.js to see how the exports are declared,

import React = require('.');

export {};

declare module '.' {
    interface ThenableImpl<T> {
        then(onFulfill: (value: T) => unknown, onReject: (error: unknown) => unknown): void | PromiseLike<unknown>;
    }
    interface UntrackedThenable<T> extends ThenableImpl<T> {
        status?: void;
    }

    export interface PendingThenable<T> extends ThenableImpl<T> {
        status: 'pending';
    }

    export interface FulfilledThenable<T> extends ThenableImpl<T> {
        status: 'fulfilled';
        value: T;
    }

    export interface RejectedThenable<T> extends ThenableImpl<T> {
        status: 'rejected';
        reason: unknown;
    }

    export type Thenable<T> = UntrackedThenable<T> | PendingThenable<T> | FulfilledThenable<T> | RejectedThenable<T>;

    export type Usable<T> = Thenable<T> | Context<T>;

    export function use<T>(usable: Usable<T>): T;

    interface ServerContextJSONArray extends ReadonlyArray<ServerContextJSONArray> {}
    export type ServerContextJSONValue =
        | string
        | boolean
        | number
        | null
        | ServerContextJSONArray
        | { [key: string]: ServerContextJSONValue };
    export interface ServerContext<T extends ServerContextJSONValue> {
        Provider: Provider<T>;
    }
    /**
     * Accepts a context object (the value returned from `React.createContext` or `React.createServerContext`) and returns the current
     * context value, as given by the nearest context provider for the given context.
     *
     * @version 16.8.0
     * @see https://reactjs.org/docs/hooks-reference.html#usecontext
     */
    function useContext<T extends ServerContextJSONValue>(context: ServerContext<T>): T;
    export function createServerContext<T extends ServerContextJSONValue>(
        globalName: string,
        defaultValue: T,
    ): ServerContext<T>;

    // tslint:disable-next-line ban-types
    export function cache<CachedFunction extends Function>(fn: CachedFunction): CachedFunction;

    export function unstable_useCacheRefresh(): () => void;
}
