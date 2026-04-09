import { ITSArrayListMaybeReadonly } from '../../type/base';
/**
 * 將可讀寫陣列轉換為唯讀陣列
 * Convert writable array to readonly array
 *
 * @example
 * type Writable = [1, 2, 3];
 * type Readonly = ITSToReadonlyArray<Writable>; // readonly [1, 2, 3]
 */
export type ITSToReadonlyArray<T extends ITSArrayListMaybeReadonly<any>> = T extends [...infer R] | readonly [...infer R] ? readonly [...R] : never;
/**
 * 將唯讀陣列轉換為可讀寫陣列
 * Convert readonly array to writable array
 *
 * @example
 * type Readonly = readonly [1, 2, 3];
 * type Writable = ITSToWriteableArray<Readonly>; // [1, 2, 3]
 */
export type ITSToWriteableArray<T extends ITSArrayListMaybeReadonly<any>> = T extends [...infer R] | readonly [...infer R] ? [...R] : never;
