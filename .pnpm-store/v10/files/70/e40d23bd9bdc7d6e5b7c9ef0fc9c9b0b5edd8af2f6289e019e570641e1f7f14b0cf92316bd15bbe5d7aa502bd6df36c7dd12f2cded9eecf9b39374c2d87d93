import { AnyArray } from "../any-array";
import { AnyFunction } from "../any-function";
import { Primitive } from "../primitive";
export type ValueOf<Type> = Type extends Primitive ? Type : Type extends AnyArray ? Type[number] : Type extends AnyFunction ? ReturnType<Type> : Type[keyof Type];
