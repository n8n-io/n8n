import { ObservableInputTuple, OperatorFunction } from '../types';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { raceWith } from './raceWith';

/** @deprecated Replaced with {@link raceWith}. Will be removed in v8. */
export function race<T, A extends readonly unknown[]>(otherSources: [...ObservableInputTuple<A>]): OperatorFunction<T, T | A[number]>;
/** @deprecated Replaced with {@link raceWith}. Will be removed in v8. */
export function race<T, A extends readonly unknown[]>(...otherSources: [...ObservableInputTuple<A>]): OperatorFunction<T, T | A[number]>;

/**
 * Returns an Observable that mirrors the first source Observable to emit a next,
 * error or complete notification from the combination of this Observable and supplied Observables.
 * @param args Sources used to race for which Observable emits first.
 * @return A function that returns an Observable that mirrors the output of the
 * first Observable to emit an item.
 * @deprecated Replaced with {@link raceWith}. Will be removed in v8.
 */
export function race<T>(...args: any[]): OperatorFunction<T, unknown> {
  return raceWith(...argsOrArgArray(args));
}
