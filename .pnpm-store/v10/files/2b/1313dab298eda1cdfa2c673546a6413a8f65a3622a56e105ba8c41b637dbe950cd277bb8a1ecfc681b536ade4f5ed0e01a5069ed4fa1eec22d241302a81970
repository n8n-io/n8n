import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { ObservableInput, SchedulerLike } from '../types';
/**
 * A process embodying the general "merge" strategy. This is used in
 * `mergeMap` and `mergeScan` because the logic is otherwise nearly identical.
 * @param source The original source observable
 * @param subscriber The consumer subscriber
 * @param project The projection function to get our inner sources
 * @param concurrent The number of concurrent inner subscriptions
 * @param onBeforeNext Additional logic to apply before nexting to our consumer
 * @param expand If `true` this will perform an "expand" strategy, which differs only
 * in that it recurses, and the inner subscription must be schedule-able.
 * @param innerSubScheduler A scheduler to use to schedule inner subscriptions,
 * this is to support the expand strategy, mostly, and should be deprecated
 */
export declare function mergeInternals<T, R>(source: Observable<T>, subscriber: Subscriber<R>, project: (value: T, index: number) => ObservableInput<R>, concurrent: number, onBeforeNext?: (innerValue: R) => void, expand?: boolean, innerSubScheduler?: SchedulerLike, additionalFinalizer?: () => void): () => void;
//# sourceMappingURL=mergeInternals.d.ts.map