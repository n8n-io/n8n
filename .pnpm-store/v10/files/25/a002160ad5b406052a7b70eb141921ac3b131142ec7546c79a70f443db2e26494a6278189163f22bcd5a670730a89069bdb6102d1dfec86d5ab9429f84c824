import { Match } from '../Any/_Internal';
import { Is } from '../Any/Is';
import { At } from '../Any/At';
import { Keys } from '../Any/Keys';
/**
 * @hidden
 */
export declare type _IntersectMatch<O extends object, O1 extends object, match extends Match> = {
    [K in keyof O]-?: {
        1: K;
        0: never;
    }[Is<O[K], At<O1, K>, match>];
}[keyof O];
/**
 * @hidden
 */
declare type IntersectMatch<O extends object, O1 extends object, match extends Match> = O extends unknown ? _IntersectMatch<O, O1, match> : never;
/**
 * Get the intersecting keys of `O` & `O1`
 * (If `match = 'default'`, no type checks are done)
 * @param O to check similarities with
 * @param O1 to check similarities against
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type IntersectKeys<O extends object, O1 extends object, match extends Match = 'default'> = {
    'default': Keys<O> & Keys<O1>;
    'contains->': IntersectMatch<O, O1, 'contains->'>;
    'extends->': IntersectMatch<O, O1, 'extends->'>;
    '<-contains': IntersectMatch<O, O1, '<-contains'>;
    '<-extends': IntersectMatch<O, O1, '<-extends'>;
    'equals': IntersectMatch<O, O1, 'equals'>;
}[match];
export {};
