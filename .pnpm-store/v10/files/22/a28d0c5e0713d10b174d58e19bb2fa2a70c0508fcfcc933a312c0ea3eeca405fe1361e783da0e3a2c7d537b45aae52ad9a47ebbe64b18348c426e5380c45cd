import { _Pick } from './Pick';
import { Depth } from './_Internal';
import { Key } from '../Any/Key';
import { PatchFlat } from './Patch';
import { BuiltIn } from '../Misc/BuiltIn';
/**
 * @hidden
 */
export declare type RequiredFlat<O> = {
    [K in keyof O]-?: O[K];
} & {};
/**
 * @hidden
 */
export declare type RequiredDeep<O> = {
    [K in keyof O]-?: O[K] extends BuiltIn ? O[K] : RequiredDeep<O[K]>;
};
/**
 * @hidden
 */
export declare type RequiredPart<O extends object, depth extends Depth> = {
    'flat': RequiredFlat<O>;
    'deep': RequiredDeep<O>;
}[depth];
/**
 * @hidden
 */
export declare type _Required<O extends object, K extends Key, depth extends Depth> = PatchFlat<RequiredPart<_Pick<O, K>, depth>, O>;
/**
 * Make some fields of `O` required (deeply or not)
 * @param O to make required
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Required<O extends object, K extends Key = Key, depth extends Depth = 'flat'> = O extends unknown ? _Required<O, K, depth> : never;
