import { AnyArray } from "../any-array";
export type Head<Type extends AnyArray> = Type extends unknown ? (Type["length"] extends 0 ? never : Type[0]) : never;
