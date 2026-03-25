import { List } from '../List/List';
/**
 * Alias to create/describe a `class`
 * @param P its constructor parameters
 * @param R the object it constructs
 * @returns `class`
 * @example
 * ```ts
 * import {C} from 'ts-toolbelt'
 *
 * type test0 = C.Class<[string, number], {a: string, b: number}>
 *
 * declare const SomeClass: test0
 *
 * const obj = new SomeClass('foo', 42) // {a: string, b: number}
 * ```
 */
export declare type Class<P extends List = any[], R extends object = object> = {
    new (...args: P): R;
};
