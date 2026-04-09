/**
 * 類型推断工具
 * Type Inference Utilities
 *
 * 提供迭代器和其他類型相關的工具類型
 * Provides iterator and other type-related utility types
 *
 * Created by user on 2019/6/11.
 */
/**
 * 迭代器類型
 * Iterator type
 *
 * 處理 Iterator 或 IteratorResult 類型，保留其原始結構
 * Handles Iterator or IteratorResult types, preserving their original structure
 *
 * @example
 * type LazyIterator = ITSIteratorLazy<Iterator<string>>;
 * // type LazyIterator = Iterator<string>
 */
export type ITSIteratorLazy<T extends Iterator<any> | IteratorResult<any>> = T extends IteratorResult<infer U> ? IteratorResult<U> : T extends Iterator<infer U> ? Iterator<U> : T;
/**
 * 取得迭代器的值類型
 * Get the value type of an iterator
 *
 * 從 Iterator 或 IteratorResult 類型中提取值類型
 * Extracts the value type from Iterator or IteratorResult types
 *
 * @see https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript
 *
 * @example
 * type IteratorValue = ITSTypeOfIterator<Iterator<string>>;
 * // type IteratorValue = string
 *
 * @example
 * type IteratorResultValue = ITSTypeOfIterator<IteratorResult<number>>;
 * // type IteratorResultValue = number
 */
export type ITSTypeOfIterator<T extends ITSIteratorLazy<any>> = T extends Iterator<infer U> ? U : T extends IteratorResult<infer U> ? U : any;
