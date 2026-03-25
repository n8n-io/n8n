import { OperatorFunction, ObservableInput } from '../types';
/**
 * Collects all observable inner sources from the source, once the source completes,
 * it will subscribe to all inner sources, combining their values by index and emitting
 * them.
 *
 * @see {@link zipWith}
 * @see {@link zip}
 */
export declare function zipAll<T>(): OperatorFunction<ObservableInput<T>, T[]>;
export declare function zipAll<T>(): OperatorFunction<any, T[]>;
export declare function zipAll<T, R>(project: (...values: T[]) => R): OperatorFunction<ObservableInput<T>, R>;
export declare function zipAll<R>(project: (...values: Array<any>) => R): OperatorFunction<any, R>;
//# sourceMappingURL=zipAll.d.ts.map