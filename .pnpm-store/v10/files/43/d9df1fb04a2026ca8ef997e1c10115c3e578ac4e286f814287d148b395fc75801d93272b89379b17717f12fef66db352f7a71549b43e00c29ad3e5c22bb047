import { SelectKeys } from './SelectKeys';
import { Match } from '../Any/_Internal';
/**
 * Check whether `O` has fields that match `M`
 * @param O to be inspected
 * @param M to check field type
 * @param match (?=`'default'`) to change precision
 * @returns [[Boolean]]
 * @example
 * ```ts
 * ```
 */
export declare type Includes<O extends object, M extends any, match extends Match = 'default'> = [
    SelectKeys<O, M, match>
] extends [never] ? 0 : 1;
