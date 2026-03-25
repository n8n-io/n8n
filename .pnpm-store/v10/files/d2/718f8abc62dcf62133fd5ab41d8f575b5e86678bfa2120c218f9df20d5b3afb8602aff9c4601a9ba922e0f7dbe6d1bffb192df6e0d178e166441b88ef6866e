import { Observable } from '../Observable';
import { ObservableInput } from '../types';
/**
 * Collects all of the inner sources from source observable. Then, once the
 * source completes, joins the values using the given static.
 *
 * This is used for {@link combineLatestAll} and {@link zipAll} which both have the
 * same behavior of collecting all inner observables, then operating on them.
 *
 * @param joinFn The type of static join to apply to the sources collected
 * @param project The projection function to apply to the values, if any
 */
export declare function joinAllInternals<T, R>(joinFn: (sources: ObservableInput<T>[]) => Observable<T>, project?: (...args: any[]) => R): import("../types").UnaryFunction<Observable<ObservableInput<T>>, unknown>;
//# sourceMappingURL=joinAllInternals.d.ts.map