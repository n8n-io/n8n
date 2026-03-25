import { Key } from '../Any/Key';
/**
 * @hidden
 */
declare type __Pick<O extends object, K extends keyof O> = {
    [P in K]: O[P];
} & {};
/**
 * @hidden
 */
export declare type _Pick<O extends object, K extends Key> = __Pick<O, keyof O & K>;
/**
 * Extract out of `O` the fields of key `K`
 * @param O to extract from
 * @param K to chose fields
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Pick<O extends object, K extends Key> = O extends unknown ? _Pick<O, K> : never;
export {};
