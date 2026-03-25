import { Key } from './Key';
declare const id: unique symbol;
/**
 * Create your own opaque sub-type from a type `A`
 * @param A to be personalized
 * @param Id to name the sub-type
 * @returns A new type `Type<A, Id>`
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type EUR = A.Type<number, 'eur'>
 * type USD = A.Type<number, 'usd'>
 *
 * let eurWallet = 10 as EUR
 * let usdWallet = 15 as USD
 *
 * eurWallet = usdWallet // error
 * ```
 */
export declare type Type<A extends any, Id extends Key> = {
    [id]: Id;
} & A;
export {};
