import { AnyArray } from "../any-array";
export type Tail<Type extends AnyArray> = Type extends readonly [] ? never : Type extends readonly [any?, ...infer Rest] ? Rest : never;
