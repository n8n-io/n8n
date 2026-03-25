/**
 * https://stackoverflow.com/a/55479659/4563339
 */
export type { ITSKeyIsPartialOfRecord } from './record/partial';
/**
 * returns a union of the readonly keys of an Object.
 *
 * @see https://github.com/type-challenges/type-challenges/blob/master/questions/5-extreme-readonly-keys/README.md
 * @see https://github.com/type-challenges/type-challenges/issues/87
 *
 * @alias ITSGetReadonlyKeys
 *
 * @example
 * interface Todo {
 * readonly title: string
 * readonly description: string
 * completed: boolean
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
export type { ITSKeyOfRecordExtractReadonly as ITSGetReadonlyKeys };
export type ITSKeyOfRecordExcludeReadonly<T> = Exclude<keyof T, ITSKeyOfRecordExtractReadonly<T>>;
export type ITSKeyIsReadonlyOfRecord<T, K extends ITSKeyOfRecordExtractReadonly<T>> = Extract<K, ITSKeyOfRecordExtractReadonly<T>>;
export type ITSKeyIsNotReadonlyOfRecord<T, K extends ITSKeyOfRecordExcludeReadonly<T>> = Extract<K, ITSKeyOfRecordExcludeReadonly<T>>;
