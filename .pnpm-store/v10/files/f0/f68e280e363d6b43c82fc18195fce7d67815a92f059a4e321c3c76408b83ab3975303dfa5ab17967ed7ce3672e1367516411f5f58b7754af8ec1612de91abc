import { ITSUnionToIntersection } from '../../helper/intersection';
import { ITSLogicIsNever } from '../never';
export type ITSLogicIsUnion<T, Y = true, N = false> = [T] extends [ITSUnionToIntersection<T>] ? N : Y;
/**
 * @see https://stackoverflow.com/a/49982981/4563339
 * @example
 * let a: ITSLogicIsSingleNonUnion01<'' | '4' | any, string>
 * let b: ITSLogicIsSingleNonUnion01<'' & '4' & any, string>
 * let c: ITSLogicIsSingleNonUnion01<'', string>
 *
 * expectType<false>(a);
 * expectType<false>(b);
 * expectType<true>(c);
 */
export type ITSLogicIsSingleNonUnion01<T, U extends any, Y = true, N = false> = U extends T ? N : ITSLogicIsNever<T, N, ITSLogicIsUnion<T, N, Y>>;
