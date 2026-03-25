import { Last } from './Last';
import { Prepend } from '../List/Prepend';
import { Exclude } from './Exclude';
import { List } from '../List/List';
import { Cast } from '../Any/Cast';
import { Extends } from '../Any/Extends';
/**
 * @hidden
 */
declare type _ListOf<U, LN extends List = [], LastU = Last<U>> = {
    0: _ListOf<Exclude<U, LastU>, Prepend<LN, LastU>>;
    1: LN;
}[Extends<[U], [never]>];
/**
 * Transform a [[Union]] into a [[List]]
 * (⚠️ it might not preserve order)
 * @param U to transform
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type ListOf<U extends any> = _ListOf<U> extends infer X ? Cast<X, List> : never;
export {};
