import { OperatorFunction, MonoTypeOperatorFunction, TruthyTypesOf } from '../types';
/** @deprecated Use a closure instead of a `thisArg`. Signatures accepting a `thisArg` will be removed in v8. */
export declare function filter<T, S extends T, A>(predicate: (this: A, value: T, index: number) => value is S, thisArg: A): OperatorFunction<T, S>;
export declare function filter<T, S extends T>(predicate: (value: T, index: number) => value is S): OperatorFunction<T, S>;
export declare function filter<T>(predicate: BooleanConstructor): OperatorFunction<T, TruthyTypesOf<T>>;
/** @deprecated Use a closure instead of a `thisArg`. Signatures accepting a `thisArg` will be removed in v8. */
export declare function filter<T, A>(predicate: (this: A, value: T, index: number) => boolean, thisArg: A): MonoTypeOperatorFunction<T>;
export declare function filter<T>(predicate: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=filter.d.ts.map