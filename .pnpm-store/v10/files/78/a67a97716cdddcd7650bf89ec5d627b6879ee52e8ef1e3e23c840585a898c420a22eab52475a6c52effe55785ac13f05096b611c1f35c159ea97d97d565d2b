import { Builtin } from "../built-in";
import { IsTuple } from "../is-tuple";
export type DeepUndefinable<Type> = Type extends Builtin ? Type | undefined : Type extends Map<infer Keys, infer Values> ? Map<DeepUndefinable<Keys>, DeepUndefinable<Values>> : Type extends ReadonlyMap<infer Keys, infer Values> ? ReadonlyMap<DeepUndefinable<Keys>, DeepUndefinable<Values>> : Type extends WeakMap<infer Keys, infer Values> ? DeepUndefinable<Keys> extends object ? WeakMap<DeepUndefinable<Keys>, DeepUndefinable<Values>> : never : Type extends Set<infer Values> ? Set<DeepUndefinable<Values>> : Type extends ReadonlySet<infer Values> ? ReadonlySet<DeepUndefinable<Values>> : Type extends WeakSet<infer Values> ? DeepUndefinable<Values> extends object ? WeakSet<DeepUndefinable<Values>> : never : Type extends ReadonlyArray<infer Values> ? Type extends IsTuple<Type> ? {
    [Key in keyof Type]: DeepUndefinable<Type[Key]> | undefined;
} : Type extends Array<Values> ? Array<DeepUndefinable<Values>> : ReadonlyArray<DeepUndefinable<Values>> : Type extends Promise<infer Value> ? Promise<DeepUndefinable<Value>> : Type extends {} ? {
    [Key in keyof Type]: DeepUndefinable<Type[Key]>;
} : Type | undefined;
