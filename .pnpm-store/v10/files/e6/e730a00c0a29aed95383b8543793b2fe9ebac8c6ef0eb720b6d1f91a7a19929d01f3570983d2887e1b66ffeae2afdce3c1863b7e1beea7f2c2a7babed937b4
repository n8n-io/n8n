/**
 * 記錄（Record）類型操作工具
 * Record Type Manipulation Utilities
 *
 * 提供物件鍵盤操作的工具類型
 * Provides utility types for object key manipulation
 *
 * @see https://stackoverflow.com/a/55479659/4563339
 */
export type { ITSKeyIsPartialOfRecord } from './record/partial';
/**
 * 取得物件的唯讀鍵集合
 * Get the readonly keys of an object
 *
 * 回傳一個由物件所有唯讀鍵組成的聯集類型
 * Returns a union type consisting of all readonly keys of the object
 *
 * @see https://github.com/type-challenges/type-challenges/blob/master/questions/5-extreme-readonly-keys/README.md
 * @see https://github.com/type-challenges/type-challenges/issues/87
 *
 * @alias ITSGetReadonlyKeys
 *
 * @example
 * interface Todo {
 *   readonly title: string
 *   readonly description: string
 *   completed: boolean
 * }
 * type Keys = ITSKeyOfRecordExtractReadonly<Todo>
 * // expected to be "title" | "description"
 */
export type ITSKeyOfRecordExtractReadonly<T> = {
    [K in keyof T]-?: (<U>() => U extends {
        -readonly [P in K]: T[K];
    } ? 1 : 2) extends (<U>() => U extends {
        [P in K]: T[K];
    } ? 1 : 2) ? never : K;
}[keyof T];
/** 取得物件的唯讀鍵集合（別名）/ Get the readonly keys of an object (alias) */
export type { ITSKeyOfRecordExtractReadonly as ITSGetReadonlyKeys };
/**
 * 取得物件的非唯讀鍵集合
 * Get the non-readonly keys of an object
 *
 * 回傳一個由物件所有可寫入鍵組成的聯集類型
 * Returns a union type consisting of all writable keys of the object
 *
 * @example
 * interface Todo {
 *   readonly title: string
 *   readonly description: string
 *   completed: boolean
 * }
 * type Keys = ITSKeyOfRecordExcludeReadonly<Todo>
 * // expected to be "completed"
 */
export type ITSKeyOfRecordExcludeReadonly<T> = Exclude<keyof T, ITSKeyOfRecordExtractReadonly<T>>;
/**
 * 檢查指定鍵是否為物件的唯讀鍵
 * Check if the specified key is a readonly key of the object
 *
 * @example
 * interface Todo {
 *   readonly title: string
 *   completed: boolean
 * }
 * type IsReadonly = ITSKeyIsReadonlyOfRecord<Todo, 'title'>;
 * // type IsReadonly = "title"
 */
export type ITSKeyIsReadonlyOfRecord<T, K extends ITSKeyOfRecordExtractReadonly<T>> = Extract<K, ITSKeyOfRecordExtractReadonly<T>>;
/**
 * 檢查指定鍵是否為物件的非唯讀鍵
 * Check if the specified key is a non-readonly key of the object
 *
 * @example
 * interface Todo {
 *   readonly title: string
 *   completed: boolean
 * }
 * type IsWritable = ITSKeyIsNotReadonlyOfRecord<Todo, 'completed'>;
 * // type IsWritable = "completed"
 */
export type ITSKeyIsNotReadonlyOfRecord<T, K extends ITSKeyOfRecordExcludeReadonly<T>> = Extract<K, ITSKeyOfRecordExcludeReadonly<T>>;
