import { Builtin } from "../built-in";
import { IsTuple } from "../is-tuple";
export type DeepRequired<Type> = Type extends Error ? Required<Type> : Type extends Builtin ? Type : Type extends Map<infer Keys, infer Values> ? Map<DeepRequired<Keys>, DeepRequired<Values>> : Type extends ReadonlyMap<infer Keys, infer Values> ? ReadonlyMap<DeepRequired<Keys>, DeepRequired<Values>> : Type extends WeakMap<infer Keys, infer Values> ? WeakMap<DeepRequired<Keys>, DeepRequired<Values>> : Type extends Set<infer Values> ? Set<DeepRequired<Values>> : Type extends ReadonlySet<infer Values> ? ReadonlySet<DeepRequired<Values>> : Type extends WeakSet<infer Values> ? WeakSet<DeepRequired<Values>> : Type extends Promise<infer Value> ? Promise<DeepRequired<Value>> : Type extends ReadonlyArray<infer Values> ? Type extends IsTuple<Type> ? {
    [Key in keyof Type]-?: DeepRequired<Type[Key]>;
} : Type extends Array<Values> ? Array<Exclude<DeepRequired<Values>, undefined>> : ReadonlyArray<Exclude<DeepRequired<Values>, undefined>> : Type extends {} ? {
    [Key in keyof Type]-?: DeepRequired<Type[Key]>;
} : Required<Type>;
