import { Function } from './Function';
import { Parameters } from './Parameters';
import { Return } from './Return';
import { Promise } from '../Any/Promise';
/**
 * Creates a promisified version of a `Function` `F`
 * @param F to promisify
 * @returns async F
 * @example
 * ```ts
 * import {F} from 'ts-toolbelt'
 *
 * type test0 = F.Promisify<(a: number) => number> // (a: number) => Promise<number>
 * ```
 */
export declare type Promisify<F extends Function> = (...args: Parameters<F>) => Promise<Return<F>>;
