import { AnyRecord } from "./any-record";
import { NonUndefinable } from "./non-undefinable";
export type DeepModify<Type> =
  | (Type extends AnyRecord
      ? {
          [Key in keyof Type]?: undefined extends {
            [Key2 in keyof Type]: Key2;
          }[Key]
            ? NonUndefinable<Type[Key]> extends object
              ? true | DeepModify<NonUndefinable<Type[Key]>>
              : true
            : Type[Key] extends object
            ? true | DeepModify<Type[Key]>
            : true;
        }
      : never)
  | (Type extends Array<infer Values> ? Array<DeepModify<Values>> : never)
  | (Type extends Promise<infer Value> ? Promise<DeepModify<Value>> : never)
  | (Type extends Set<infer Values> ? Set<DeepModify<Values>> : never)
  | (Type extends ReadonlySet<infer Values> ? ReadonlySet<DeepModify<Values>> : never)
  | (Type extends WeakSet<infer Values> ? WeakSet<DeepModify<Values>> : never)
  | (Type extends Map<infer Keys, infer Values> ? Map<Keys, DeepModify<Values>> : never)
  | (Type extends ReadonlyMap<infer Keys, infer Values> ? ReadonlyMap<Keys, DeepModify<Values>> : never)
  | (Type extends WeakMap<infer Keys, infer Values> ? WeakMap<Keys, DeepModify<Values>> : never);
