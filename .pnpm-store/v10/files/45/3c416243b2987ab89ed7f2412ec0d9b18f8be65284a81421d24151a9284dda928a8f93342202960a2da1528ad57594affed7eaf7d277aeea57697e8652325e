import { ObservableInputTuple, OperatorFunction, Cons } from '../types';
/**
 * Subscribes to the source, and the observable inputs provided as arguments, and combines their values, by index, into arrays.
 *
 * What is meant by "combine by index": The first value from each will be made into a single array, then emitted,
 * then the second value from each will be combined into a single array and emitted, then the third value
 * from each will be combined into a single array and emitted, and so on.
 *
 * This will continue until it is no longer able to combine values of the same index into an array.
 *
 * After the last value from any one completed source is emitted in an array, the resulting observable will complete,
 * as there is no way to continue "zipping" values together by index.
 *
 * Use-cases for this operator are limited. There are memory concerns if one of the streams is emitting
 * values at a much faster rate than the others. Usage should likely be limited to streams that emit
 * at a similar pace, or finite streams of known length.
 *
 * In many cases, authors want `combineLatestWith` and not `zipWith`.
 *
 * @param otherInputs other observable inputs to collate values from.
 * @return A function that returns an Observable that emits items by index
 * combined from the source Observable and provided Observables, in form of an
 * array.
 */
export declare function zipWith<T, A extends readonly unknown[]>(...otherInputs: [...ObservableInputTuple<A>]): OperatorFunction<T, Cons<T, A>>;
//# sourceMappingURL=zipWith.d.ts.map