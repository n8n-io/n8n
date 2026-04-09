/**
 * 類型函數：返回指定類型的函數
 * Type function: a function that returns the specified type
 *
 * @example
 * type StringFunc = ITSTypeFunction<string>;
 * // type StringFunc = (...args: any[]) => string
 *
 * @example
 * type NumberFunc = ITSTypeFunction<number>;
 * // type NumberFunc = (...args: any[]) => number
 */
export type ITSTypeFunction<T> = (...args: any[]) => T;
/**
 * 類似 Map 的介面定義
 * Map-like interface definition
 */
export interface ITSMapLike<K, V> {
    /**
     * 取得指定鍵的值
     * Get the value for the specified key
     */
    get(key: K): V | undefined;
    /**
     * 檢查是否包含指定鍵
     * Check if the map contains the specified key
     */
    has(key: K): boolean;
}
/**
 * 類似 Set 的介面定義
 * Set-like interface definition
 */
export interface ITSSetLike<V> {
    /**
     * 檢查是否包含指定值
     * Check if the set contains the specified value
     */
    has(value: V): boolean;
}
/**
 * 可解析的類型：支援直接值或 PromiseLike
 * Resolvable type: supports direct value or PromiseLike
 *
 * @see bluebird
 */
export type ITSResolvable<R> = R | PromiseLike<R>;
/**
 * 可寫入的類陣列介面
 * Writable array-like interface
 */
export interface ITSArrayLikeWriteable<T> {
    /** 只讀的長度屬性 / Readonly length property */
    readonly length: number;
    /** 數字索引存取 / Numeric index access */
    [n: number]: T;
}
