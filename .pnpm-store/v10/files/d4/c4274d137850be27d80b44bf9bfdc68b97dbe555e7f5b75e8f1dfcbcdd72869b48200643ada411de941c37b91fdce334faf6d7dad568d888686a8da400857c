import { Exclude } from './Exclude';
import { Match } from '../Any/_Internal';
import { PatchFlat } from './Patch';
/**
 * Get an [[Object]] that is the difference between `O` & `O1`
 * (`O`'s differences have priority over `O1`'s if fields overlap)
 * (If `match = 'default'`, no type checks are done)
 * @param O to check differences with
 * @param O1 to check differences against
 * @param match (?=`'default'`) to change precision
 * @returns [[Object]]
 * @example
 * ```ts
 * import {O} from 'ts-toolbelt'
 *
 * type Person0 = {
 *  name: string
 *  age: string
 * }
 *
 * type Person1 = {
 *  name: string
 *  age: number | string
 *  nick: string
 * }
 *
 * type test0 = O.Diff<Person0, Person1, 'default'>   // {nick: string}
 * type test1 = O.Diff<Person0, Person1, 'extends->'> // {nick: string; age: string | number}
 * type test2 = O.Diff<Person0, Person1, '<-extends'> // {nick: string; age: string}
 * type test3 = O.Diff<Person0, Person1, 'equals'>    // {nick: string; age: string}
 * ```
 */
export declare type Diff<O extends object, O1 extends object, match extends Match = 'default'> = PatchFlat<Exclude<O, O1, match>, Exclude<O1, O, match>>;
