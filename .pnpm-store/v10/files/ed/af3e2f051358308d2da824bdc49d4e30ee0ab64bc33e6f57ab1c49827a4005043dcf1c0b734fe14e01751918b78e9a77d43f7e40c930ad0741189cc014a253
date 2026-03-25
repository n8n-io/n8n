import { Function } from './Function';
import { Parameters } from './Parameters';
import { Length as LLength } from '../List/Length';
/**
 * Extract arguments' length from a [[Function]]
 * @param F to extract from
 * @returns [[String]] or `number`
 * @example
 * ```ts
 * import {F} from 'ts-toolbelt'
 *
 * const fn = (a1: any, a2: any) => {}
 *
 * type test0 = F.LengthOf<typeof fn>               // 2
 *
 * type test1 = F.LengthOf<(a1?: any) => any>       // 0 | 1
 *
 * type test2 = F.LengthOf<(...a: any[]) => any>    // number
 * ```
 */
export declare type Length<Fn extends Function> = LLength<Parameters<Fn>>;
