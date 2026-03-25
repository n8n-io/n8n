import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { OperatorFunction, TruthyTypesOf } from '../types';
export declare function find<T>(predicate: BooleanConstructor): OperatorFunction<T, TruthyTypesOf<T>>;
/** @deprecated Use a closure instead of a `thisArg`. Signatures accepting a `thisArg` will be removed in v8. */
export declare function find<T, S extends T, A>(predicate: (this: A, value: T, index: number, source: Observable<T>) => value is S, thisArg: A): OperatorFunction<T, S | undefined>;
export declare function find<T, S extends T>(predicate: (value: T, index: number, source: Observable<T>) => value is S): OperatorFunction<T, S | undefined>;
/** @deprecated Use a closure instead of a `thisArg`. Signatures accepting a `thisArg` will be removed in v8. */
export declare function find<T, A>(predicate: (this: A, value: T, index: number, source: Observable<T>) => boolean, thisArg: A): OperatorFunction<T, T | undefined>;
export declare function find<T>(predicate: (value: T, index: number, source: Observable<T>) => boolean): OperatorFunction<T, T | undefined>;
export declare function createFind<T>(predicate: (value: T, index: number, source: Observable<T>) => boolean, thisArg: any, emit: 'value' | 'index'): (source: Observable<T>, subscriber: Subscriber<any>) => void;
//# sourceMappingURL=find.d.ts.map