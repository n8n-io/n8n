import { ObservableInput, ObservableInputTuple, OperatorFunction, SchedulerLike } from '../types';
import { operate } from '../util/lift';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { mergeAll } from './mergeAll';
import { popNumber, popScheduler } from '../util/args';
import { from } from '../observable/from';

/** @deprecated Replaced with {@link mergeWith}. Will be removed in v8. */
export function merge<T, A extends readonly unknown[]>(...sources: [...ObservableInputTuple<A>]): OperatorFunction<T, T | A[number]>;
/** @deprecated Replaced with {@link mergeWith}. Will be removed in v8. */
export function merge<T, A extends readonly unknown[]>(
  ...sourcesAndConcurrency: [...ObservableInputTuple<A>, number]
): OperatorFunction<T, T | A[number]>;
/** @deprecated Replaced with {@link mergeWith}. Will be removed in v8. */
export function merge<T, A extends readonly unknown[]>(
  ...sourcesAndScheduler: [...ObservableInputTuple<A>, SchedulerLike]
): OperatorFunction<T, T | A[number]>;
/** @deprecated Replaced with {@link mergeWith}. Will be removed in v8. */
export function merge<T, A extends readonly unknown[]>(
  ...sourcesAndConcurrencyAndScheduler: [...ObservableInputTuple<A>, number, SchedulerLike]
): OperatorFunction<T, T | A[number]>;

export function merge<T>(...args: unknown[]): OperatorFunction<T, unknown> {
  const scheduler = popScheduler(args);
  const concurrent = popNumber(args, Infinity);
  args = argsOrArgArray(args);

  return operate((source, subscriber) => {
    mergeAll(concurrent)(from([source, ...(args as ObservableInput<T>[])], scheduler)).subscribe(subscriber);
  });
}
