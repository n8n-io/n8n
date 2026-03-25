import { At } from '../Any/At';
import { Key } from '../Any/Key';
/**
 * Make the fields of `O` union the ones of `O1`
 * @param O to union from
 * @param O1 to union with
 * @param K (?=`Key`) to chose fields
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Unionize<O extends object, O1 extends object, K extends Key = Key> = {
    [P in keyof O]: P extends K ? O[P] | At<O1, P> : O[P];
} & {};
