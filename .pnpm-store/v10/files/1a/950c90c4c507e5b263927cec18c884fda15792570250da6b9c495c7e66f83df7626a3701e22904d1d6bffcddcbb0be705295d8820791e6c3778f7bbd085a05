import { Builtin } from "../built-in";
import { IsUnknown } from "../is-unknown";
export type DeepWritable<Type> = Type extends Exclude<Builtin, Error> ? Type : Type extends Map<infer Key, infer Value> ? Map<DeepWritable<Key>, DeepWritable<Value>> : Type extends ReadonlyMap<infer Key, infer Value> ? Map<DeepWritable<Key>, DeepWritable<Value>> : Type extends WeakMap<infer Key, infer Value> ? WeakMap<DeepWritable<Key>, DeepWritable<Value>> : Type extends Set<infer Values> ? Set<DeepWritable<Values>> : Type extends ReadonlySet<infer Values> ? Set<DeepWritable<Values>> : Type extends WeakSet<infer Values> ? WeakSet<DeepWritable<Values>> : Type extends Promise<infer Value> ? Promise<DeepWritable<Value>> : Type extends {} ? {
    -readonly [Key in keyof Type]: DeepWritable<Type[Key]>;
} : IsUnknown<Type> extends true ? unknown : Type;
