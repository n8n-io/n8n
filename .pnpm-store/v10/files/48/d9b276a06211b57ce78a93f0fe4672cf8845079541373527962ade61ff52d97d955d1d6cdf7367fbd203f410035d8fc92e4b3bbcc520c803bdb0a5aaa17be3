import { Builtin } from "../built-in";
import { IsTuple } from "../is-tuple";
import { IsUnknown } from "../is-unknown";
export type DeepPartial<Type> = Type extends Exclude<Builtin, Error> ? Type : Type extends Map<infer Keys, infer Values> ? Map<DeepPartial<Keys>, DeepPartial<Values>> : Type extends ReadonlyMap<infer Keys, infer Values> ? ReadonlyMap<DeepPartial<Keys>, DeepPartial<Values>> : Type extends WeakMap<infer Keys, infer Values> ? WeakMap<DeepPartial<Keys>, DeepPartial<Values>> : Type extends Set<infer Values> ? Set<DeepPartial<Values>> : Type extends ReadonlySet<infer Values> ? ReadonlySet<DeepPartial<Values>> : Type extends WeakSet<infer Values> ? WeakSet<DeepPartial<Values>> : Type extends ReadonlyArray<infer Values> ? Type extends IsTuple<Type> ? {
    [Key in keyof Type]?: DeepPartial<Type[Key]>;
} : Type extends Array<Values> ? Array<DeepPartial<Values> | undefined> : ReadonlyArray<DeepPartial<Values> | undefined> : Type extends Promise<infer Value> ? Promise<DeepPartial<Value>> : Type extends {} ? {
    [Key in keyof Type]?: DeepPartial<Type[Key]>;
} : IsUnknown<Type> extends true ? unknown : Partial<Type>;
