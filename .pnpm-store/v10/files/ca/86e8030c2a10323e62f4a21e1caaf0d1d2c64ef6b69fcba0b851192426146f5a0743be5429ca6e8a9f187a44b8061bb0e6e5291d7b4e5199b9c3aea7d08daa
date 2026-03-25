import { Key } from './_Internal';
import { NonNullable as UNonNullable } from '../Union/NonNullable';
import { Depth } from '../Object/_Internal';
import { BuiltIn } from '../Misc/BuiltIn';
import { Cast } from '../Any/Cast';
import { List } from './List';
/**
 * @hidden
 */
export declare type NonNullableFlat<O, K extends Key = Key> = {
    [P in keyof O]: P extends K ? UNonNullable<O[P]> : O[P];
} & {};
/**
 * @hidden
 */
declare type _NonNullableDeep<O> = {
    [K in keyof O]: O[K] extends BuiltIn ? O[K] : NonNullableDeep<O[K], Key>;
};
/**
 * @hidden
 */
export declare type NonNullableDeep<O, K extends Key = Key> = _NonNullableDeep<NonNullableFlat<O, K>>;
/**
 * @hidden
 */
export declare type NonNullablePart<O extends object, K extends Key, depth extends Depth> = {
    'flat': NonNullableFlat<O, K>;
    'deep': NonNullableDeep<O, K>;
}[depth];
/**
 * Make some entries of `L` not nullable (deeply or not)
 * @param L to make non nullable
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type NonNullable<L extends List, K extends Key = Key, depth extends Depth = 'flat'> = Cast<NonNullablePart<L, `${K & number}` | K, depth>, List>;
export {};
