import { Nullable as UNullable } from '../Union/Nullable';
import { Depth } from './_Internal';
import { _Pick } from './Pick';
import { Key } from '../Any/Key';
import { PatchFlat } from './Patch';
/**
 * @hidden
 */
export declare type NullableFlat<O> = {
    [K in keyof O]: UNullable<O[K]>;
} & {};
/**
 * @hidden
 */
export declare type NullableDeep<O> = {
    [K in keyof O]: NullableDeep<UNullable<O[K]>>;
};
/**
 * @hidden
 */
declare type NullablePart<O extends object, depth extends Depth> = {
    'flat': NullableFlat<O>;
    'deep': NullableDeep<O>;
}[depth];
/**
 * @hidden
 */
export declare type _Nullable<O extends object, K extends Key, depth extends Depth> = PatchFlat<NullablePart<_Pick<O, K>, depth>, O>;
/**
 * Make some fields of `O` nullable (deeply or not)
 * @param O to make nullable
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Nullable<O extends object, K extends Key = Key, depth extends Depth = 'flat'> = O extends unknown ? _Nullable<O, K, depth> : never;
export {};
