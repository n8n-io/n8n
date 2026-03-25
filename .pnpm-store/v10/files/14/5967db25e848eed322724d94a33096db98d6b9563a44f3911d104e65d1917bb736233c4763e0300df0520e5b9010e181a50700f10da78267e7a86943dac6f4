import { Observable } from '../Observable';
import { Falsy, OperatorFunction } from '../types';
export declare function every<T>(predicate: BooleanConstructor): OperatorFunction<T, Exclude<T, Falsy> extends never ? false : boolean>;
/** @deprecated Use a closure instead of a `thisArg`. Signatures accepting a `thisArg` will be removed in v8. */
export declare function every<T>(predicate: BooleanConstructor, thisArg: any): OperatorFunction<T, Exclude<T, Falsy> extends never ? false : boolean>;
/** @deprecated Use a closure instead of a `thisArg`. Signatures accepting a `thisArg` will be removed in v8. */
export declare function every<T, A>(predicate: (this: A, value: T, index: number, source: Observable<T>) => boolean, thisArg: A): OperatorFunction<T, boolean>;
export declare function every<T>(predicate: (value: T, index: number, source: Observable<T>) => boolean): OperatorFunction<T, boolean>;
//# sourceMappingURL=every.d.ts.map