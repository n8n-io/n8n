import { FilterKeys } from './FilterKeys';
import { Match } from '../Any/_Internal';
import { Pick } from './Pick';
/**
 * Filter out of `O` the fields that match `M`
 * @param O to remove from
 * @param M to select fields
 * @param match (?=`'default'`) to change precision
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Filter<O extends object, M extends any, match extends Match = 'default'> = Pick<O, FilterKeys<O, M, match>>;
