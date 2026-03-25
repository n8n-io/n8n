import { ObservableInput, ObservedValueOf, OperatorFunction } from '../types';
/**
 * Applies an accumulator function over the source Observable where the
 * accumulator function itself returns an Observable, emitting values
 * only from the most recently returned Observable.
 *
 * <span class="informal">It's like {@link mergeScan}, but only the most recent
 * Observable returned by the accumulator is merged into the outer Observable.</span>
 *
 * @see {@link scan}
 * @see {@link mergeScan}
 * @see {@link switchMap}
 *
 * @param accumulator
 * The accumulator function called on each source value.
 * @param seed The initial accumulation value.
 * @return A function that returns an observable of the accumulated values.
 */
export declare function switchScan<T, R, O extends ObservableInput<any>>(accumulator: (acc: R, value: T, index: number) => O, seed: R): OperatorFunction<T, ObservedValueOf<O>>;
//# sourceMappingURL=switchScan.d.ts.map