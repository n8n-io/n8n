import { OperatorFunction, ObservableInput, ObservedValueOf, SchedulerLike } from '../types';
export declare function expand<T, O extends ObservableInput<unknown>>(project: (value: T, index: number) => O, concurrent?: number, scheduler?: SchedulerLike): OperatorFunction<T, ObservedValueOf<O>>;
/**
 * @deprecated The `scheduler` parameter will be removed in v8. If you need to schedule the inner subscription,
 * use `subscribeOn` within the projection function: `expand((value) => fn(value).pipe(subscribeOn(scheduler)))`.
 * Details: Details: https://rxjs.dev/deprecations/scheduler-argument
 */
export declare function expand<T, O extends ObservableInput<unknown>>(project: (value: T, index: number) => O, concurrent: number | undefined, scheduler: SchedulerLike): OperatorFunction<T, ObservedValueOf<O>>;
//# sourceMappingURL=expand.d.ts.map