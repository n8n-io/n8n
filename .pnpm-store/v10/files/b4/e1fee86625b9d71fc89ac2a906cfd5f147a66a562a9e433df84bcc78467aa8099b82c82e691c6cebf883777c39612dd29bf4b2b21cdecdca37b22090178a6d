import { Result } from "./fp.js";
export type Paginator<V> = () => Promise<V & {
    next: Paginator<V>;
}> | null;
export type PageIterator<V, PageState = unknown> = V & {
    next: Paginator<V>;
    [Symbol.asyncIterator]: () => AsyncIterableIterator<V>;
    "~next"?: PageState | undefined;
};
export declare function createPageIterator<V>(page: V & {
    next: Paginator<V>;
}, halt: (v: V) => boolean): {
    [Symbol.asyncIterator]: () => AsyncIterableIterator<V>;
};
/**
 * This utility create a special iterator that yields a single value and
 * terminates. It is useful in paginated SDK functions that have early return
 * paths when things go wrong.
 */
export declare function haltIterator<V extends object>(v: V): PageIterator<V, undefined>;
/**
 * Converts an async iterator of `Result<V, E>` into an async iterator of `V`.
 * When error results occur, the underlying error value is thrown.
 */
export declare function unwrapResultIterator<V, PageState>(iteratorPromise: Promise<PageIterator<Result<V, unknown>, PageState>>): Promise<PageIterator<V, PageState>>;
export declare const URL_OVERRIDE: unique symbol;
//# sourceMappingURL=operations.d.ts.map