import { AnyArray } from "../any-array";
import { Builtin } from "../built-in";
import { IsTuple } from "../is-tuple";
import { IsUnknown } from "../is-unknown";
export type DeepReadonly<Type> = Type extends Exclude<Builtin, Error> ? Type : Type extends Map<infer Keys, infer Values> ? ReadonlyMap<DeepReadonly<Keys>, DeepReadonly<Values>> : Type extends ReadonlyMap<infer Keys, infer Values> ? ReadonlyMap<DeepReadonly<Keys>, DeepReadonly<Values>> : Type extends WeakMap<infer Keys, infer Values> ? WeakMap<DeepReadonly<Keys>, DeepReadonly<Values>> : Type extends Set<infer Values> ? ReadonlySet<DeepReadonly<Values>> : Type extends ReadonlySet<infer Values> ? ReadonlySet<DeepReadonly<Values>> : Type extends WeakSet<infer Values> ? WeakSet<DeepReadonly<Values>> : Type extends Promise<infer Value> ? Promise<DeepReadonly<Value>> : Type extends AnyArray<infer Values> ? Type extends IsTuple<Type> ? {
    readonly [Key in keyof Type]: DeepReadonly<Type[Key]>;
} : ReadonlyArray<DeepReadonly<Values>> : Type extends {} ? {
    readonly [Key in keyof Type]: DeepReadonly<Type[Key]>;
} : IsUnknown<Type> extends true ? unknown : Readonly<Type>;
