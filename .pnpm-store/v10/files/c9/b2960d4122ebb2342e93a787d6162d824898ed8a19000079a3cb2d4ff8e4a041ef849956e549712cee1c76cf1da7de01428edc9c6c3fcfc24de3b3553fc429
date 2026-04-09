/**
 * 鍵值對類型操作工具
 * Key-Value Type Manipulation Utilities
 *
 * 提供類型安全的鍵值對操作工具，包括取得物件、Map、陣列的值類型等
 * Provides type-safe key-value pair manipulation utilities
 */
import { ITSMapLike } from '../generic';
import { ITSIteratorLazy } from './typeof';
import { ITSArrayListMaybeReadonly } from '../type/base';
/**
 * 取得介面所有值的聯集類型
 * Get the union type of all values in an interface
 *
 * 類似 `Object.values()` 的類型版本，回傳物件所有值的聯集
 * Similar to the type version of `Object.values()`, returns the union of all object values
 *
 * @see https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript
 *
 * @example
 * interface User {
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * }
 * type UserValues = ITSValueOf<User>;
 * // type UserValues = string | number | boolean
 */
export type ITSValueOf<T extends Record<any, any>> = T[keyof T];
/** 取得介面所有值的聯集類型（別名）/ Get the union type of all values in an interface (alias) */
export type { ITSValueOf as ITSValueOfRecord };
/**
 * 取得類型的鍵類型
 * Get the key type of a type
 *
 * @example
 * interface User { name: string; age: number; }
 * type UserKeys = ITSKeyOf<User>;
 * // type UserKeys = "name" | "age"
 */
export type ITSKeyOf<T> = keyof T;
/**
 * 取得指定鍵集合的值類型聯集
 * Get the union of value types for a specified set of keys
 *
 * @example
 * interface User { name: string; age: number; email: string; }
 * type PickedValues = ITSPickValueOf<User, 'name' | 'age'>;
 * // type PickedValues = string | number
 */
export type ITSPickValueOf<T, K extends keyof T> = ITSValueOf<Pick<T, K>>;
/**
 * 迭代器值的類型
 * Iterator value type
 *
 * 從 Iterator 或 IteratorResult 類型中提取值類型
 * Extracts value type from Iterator or IteratorResult types
 *
 * @example
 * type IteratorResultType = ITSValueOfIterator<IteratorResult<string>>;
 * // type IteratorResultType = string[]
 */
export type ITSValueOfIterator<T extends ITSIteratorLazy<any>> = (T extends Iterator<infer U> ? U : T extends IteratorResult<infer U> ? U : any)[];
/**
 * Map 類型的所有值類型
 * All value types of Map type
 *
 * 提取 Map 類型的泛型參數 V，回傳 V[]
 * Extracts the generic parameter V from Map type, returns V[]
 *
 * @example
 * type MapValues = ITSValueOfMap<Map<string, number>>;
 * // type MapValues = number[]
 */
export type ITSValueOfMap<T extends ITSMapLike<any, any>> = T extends ITSMapLike<any, infer U> ? U[] : any[];
/**
 * 陣列的元素類型
 * Array element type
 *
 * 從陣列類型中提取元素類型，支援唯讀陣列和可讀寫陣列
 * Extracts element type from array type, supporting both readonly and writable arrays
 *
 * @example
 * type ArrayElement = ITSValueOfArray<string[]>;
 * // type ArrayElement = string
 *
 * @example
 * type ReadonlyArrayElement = ITSValueOfArray<readonly string[]>;
 * // type ReadonlyArrayElement = string
 */
export type ITSValueOfArray<T extends ITSArrayListMaybeReadonly<any>> = T extends readonly (infer U)[] ? U : T extends (infer U)[] ? U : never;
/**
 * 類陣列的元素類型
 * Array-like element type
 *
 * 從類陣列物件（如 ArrayLike<T>）中提取元素類型
 * Extracts element type from array-like objects (such as ArrayLike<T>)
 *
 * @example
 * type ArrayLikeElement = ITSValueOfArrayLike<ArrayLike<string>>;
 * // type ArrayLikeElement = string
 */
export type ITSValueOfArrayLike<T extends ITSArrayListMaybeReadonly<any> | ArrayLike<any>> = T extends ITSArrayListMaybeReadonly<T> ? ITSValueOfArray<T> : T extends ArrayLike<infer U> ? U : never;
