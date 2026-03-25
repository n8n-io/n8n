export type ITSTypeFunction<T> = (...args: any[]) => T;
export interface ITSMapLike<K, V> {
    get(key: K): V | undefined;
    has(key: K): boolean;
}
export interface ITSSetLike<V> {
    has(value: V): boolean;
}
/**
 * @see bluebird
 */
export type ITSResolvable<R> = R | PromiseLike<R>;
export interface ITSArrayLikeWriteable<T> {
    readonly length: number;
    [n: number]: T;
}
