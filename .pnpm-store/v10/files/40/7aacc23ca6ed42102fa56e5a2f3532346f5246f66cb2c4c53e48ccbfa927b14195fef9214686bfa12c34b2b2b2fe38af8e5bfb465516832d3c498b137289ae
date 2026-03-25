import { Depth } from '../Object/_Internal';
import { BuiltIn } from '../Misc/BuiltIn';
import { Has } from '../Union/Has';
import { If } from './If';
import { Key } from './Key';
/**
 * @hidden
 */
export declare type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
} & unknown;
/**
 * @hidden
 */
declare type ComputeFlat<A extends any> = A extends BuiltIn ? A : A extends Array<any> ? A extends Array<Record<Key, any>> ? Array<{
    [K in keyof A[number]]: A[number][K];
} & unknown> : A : A extends ReadonlyArray<any> ? A extends ReadonlyArray<Record<Key, any>> ? ReadonlyArray<{
    [K in keyof A[number]]: A[number][K];
} & unknown> : A : {
    [K in keyof A]: A[K];
} & unknown;
/**
 * @hidden
 */
declare type ComputeDeep<A extends any, Seen = never> = A extends BuiltIn ? A : If<Has<Seen, A>, A, (A extends Array<any> ? A extends Array<Record<Key, any>> ? Array<{
    [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen>;
} & unknown> : A : A extends ReadonlyArray<any> ? A extends ReadonlyArray<Record<Key, any>> ? ReadonlyArray<{
    [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen>;
} & unknown> : A : {
    [K in keyof A]: ComputeDeep<A[K], A | Seen>;
} & unknown)>;
/**
 * Force TS to load a type that has not been computed (to resolve composed
 * types that TS haven't fully resolved, for display purposes mostly).
 * @param A to compute
 * @returns `A`
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.Compute<{x: 'x'} & {y: 'y'}> // {x: 'x', y: 'y'}
 * ```
 */
export declare type Compute<A extends any, depth extends Depth = 'deep'> = {
    'flat': ComputeFlat<A>;
    'deep': ComputeDeep<A>;
}[depth];
export {};
