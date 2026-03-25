import { NonNullable as UNonNullable } from '../Union/NonNullable';
import { Depth } from './_Internal';
import { _Pick } from './Pick';
import { Key } from '../Any/Key';
import { PatchFlat } from './Patch';
import { BuiltIn } from '../Misc/BuiltIn';
/**
 * @hidden
 */
export declare type NonNullableFlat<O> = {
    [K in keyof O]: UNonNullable<O[K]>;
} & {};
/**
 * @hidden
 */
export declare type NonNullableDeep<O> = {
    [K in keyof O]: O[K] extends BuiltIn ? O[K] : NonNullableDeep<UNonNullable<O[K]>>;
};
/**
 * @hidden
 */
export declare type NonNullablePart<O extends object, depth extends Depth> = {
    'flat': NonNullableFlat<O>;
    'deep': NonNullableDeep<O>;
}[depth];
/**
 * @hidden
 */
export declare type _NonNullable<O extends object, K extends Key, depth extends Depth> = PatchFlat<NonNullablePart<_Pick<O, K>, depth>, O>;
/**
 * Make some fields of `O` not nullable (deeply or not)
 * (Optional fields will be left untouched & `undefined`)
 * @param O to make non nullable
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type NonNullable<O extends object, K extends Key = Key, depth extends Depth = 'flat'> = O extends unknown ? _NonNullable<O, K, depth> : never;
