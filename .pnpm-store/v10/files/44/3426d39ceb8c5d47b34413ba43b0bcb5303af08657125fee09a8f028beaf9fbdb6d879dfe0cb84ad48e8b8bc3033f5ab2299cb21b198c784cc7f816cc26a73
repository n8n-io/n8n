import { Observable } from '../Observable';
import { OperatorFunction, TruthyTypesOf } from '../types';
export declare function last<T>(predicate: BooleanConstructor): OperatorFunction<T, TruthyTypesOf<T>>;
export declare function last<T, D>(predicate: BooleanConstructor, defaultValue: D): OperatorFunction<T, TruthyTypesOf<T> | D>;
export declare function last<T, D = T>(predicate?: null, defaultValue?: D): OperatorFunction<T, T | D>;
export declare function last<T, S extends T>(predicate: (value: T, index: number, source: Observable<T>) => value is S, defaultValue?: S): OperatorFunction<T, S>;
export declare function last<T, D = T>(predicate: (value: T, index: number, source: Observable<T>) => boolean, defaultValue?: D): OperatorFunction<T, T | D>;
//# sourceMappingURL=last.d.ts.map