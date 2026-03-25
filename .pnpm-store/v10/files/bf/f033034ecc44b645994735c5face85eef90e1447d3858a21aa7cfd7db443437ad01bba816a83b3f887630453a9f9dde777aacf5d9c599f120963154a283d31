import { At } from '../Any/At';
import { Overwrite } from '../Object/Overwrite';
import { ComputeRaw } from '../Any/Compute';
import { IntersectOf } from './IntersectOf';
import { Strict } from './Strict';
/**
 * @hidden
 */
declare type _Merge<U extends object> = IntersectOf<Overwrite<U, {
    [K in keyof U]-?: At<U, K>;
}>>;
/**
 * Merge a [[Union]] of [[Object]]s into a single one
 * @param U to merge
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;
export {};
