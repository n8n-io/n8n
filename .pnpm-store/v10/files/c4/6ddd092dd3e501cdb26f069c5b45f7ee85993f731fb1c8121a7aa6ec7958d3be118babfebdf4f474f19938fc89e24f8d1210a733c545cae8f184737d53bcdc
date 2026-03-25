import { OperatorFunction, ObservableInput } from '../types';
import { zip } from '../observable/zip';
import { joinAllInternals } from './joinAllInternals';

/**
 * Collects all observable inner sources from the source, once the source completes,
 * it will subscribe to all inner sources, combining their values by index and emitting
 * them.
 *
 * @see {@link zipWith}
 * @see {@link zip}
 */
export function zipAll<T>(): OperatorFunction<ObservableInput<T>, T[]>;
export function zipAll<T>(): OperatorFunction<any, T[]>;
export function zipAll<T, R>(project: (...values: T[]) => R): OperatorFunction<ObservableInput<T>, R>;
export function zipAll<R>(project: (...values: Array<any>) => R): OperatorFunction<any, R>;

export function zipAll<T, R>(project?: (...values: T[]) => R) {
  return joinAllInternals(zip, project);
}
