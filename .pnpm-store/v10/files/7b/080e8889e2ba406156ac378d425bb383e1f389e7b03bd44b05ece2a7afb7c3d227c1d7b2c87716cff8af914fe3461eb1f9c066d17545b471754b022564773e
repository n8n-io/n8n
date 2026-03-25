import { PredicateFunction } from "../predicate-function";
export type PredicateType<Type extends PredicateFunction> = Type extends (target: any, ...rest: any[]) => target is infer NarrowedType ? NarrowedType : never;
