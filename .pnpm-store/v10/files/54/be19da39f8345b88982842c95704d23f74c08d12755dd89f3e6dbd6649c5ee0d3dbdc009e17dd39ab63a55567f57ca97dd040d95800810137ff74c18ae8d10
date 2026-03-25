import { _Pick } from './Pick';
import { Depth } from './_Internal';
import { Key } from '../Any/Key';
import { PatchFlat } from './Patch';
import { BuiltIn } from '../Misc/BuiltIn';
/**
 * @hidden
 */
export declare type WritableFlat<O> = {
    -readonly [K in keyof O]: O[K];
} & {};
/**
 * @hidden
 */
export declare type WritableDeep<O> = {
    -readonly [K in keyof O]: O[K] extends BuiltIn ? O[K] : WritableDeep<O[K]>;
};
/**
 * @hidden
 */
export declare type WritablePart<O extends object, depth extends Depth> = {
    'flat': WritableFlat<O>;
    'deep': WritableDeep<O>;
}[depth];
/**
 * @hidden
 */
export declare type _Writable<O extends object, K extends Key, depth extends Depth> = PatchFlat<WritablePart<_Pick<O, K>, depth>, O>;
/**
 * Make some fields of `O` writable (deeply or not)
 * @param O to make writable
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Writable<O extends object, K extends Key = Key, depth extends Depth = 'flat'> = O extends unknown ? _Writable<O, K, depth> : never;
