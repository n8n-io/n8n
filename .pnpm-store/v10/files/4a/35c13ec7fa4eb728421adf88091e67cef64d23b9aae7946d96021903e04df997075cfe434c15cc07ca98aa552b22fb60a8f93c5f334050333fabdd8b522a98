import { Pick } from './Pick';
import { Depth } from './_Internal';
import { Key } from '../Any/Key';
import { PatchFlat } from './Patch';
import { Equals } from '../Any/Equals';
/**
 * @hidden
 */
export declare type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
} & {};
/**
 * @hidden
 */
export declare type OptionalDeep<O> = {
    [K in keyof O]?: OptionalDeep<O[K]>;
};
/**
 * @hidden
 */
export declare type OptionalPart<O extends object, depth extends Depth> = {
    'flat': OptionalFlat<O>;
    'deep': OptionalDeep<O>;
}[depth];
/**
 * Make some fields of `O` optional (deeply or not)
 * @param O to make optional
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Optional<O extends object, K extends Key = Key, depth extends Depth = 'flat'> = {
    1: OptionalPart<O, depth>;
    0: PatchFlat<OptionalPart<Pick<O, K>, depth>, O>;
}[Equals<Key, K>];
