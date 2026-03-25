import { Modx } from './_Internal';
import { Key } from '../Any/Key';
/**
 * Create an object filled with `A` for the fields `K`
 * @param K to choose fields
 * @param A (?=`unknown`) to fill fields with
 * @param modx (?=`['!', 'W']`) to set modifiers
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Record<K extends Key, A extends any = unknown, modx extends Modx = ['!', 'W']> = {
    '!': {
        'R': {
            readonly [P in K]: A;
        };
        'W': {
            [P in K]: A;
        };
    };
    '?': {
        'R': {
            readonly [P in K]?: A;
        };
        'W': {
            [P in K]?: A;
        };
    };
}[modx[0]][modx[1]];
