import { AnyArray } from "../any-array";
import { Builtin } from "../built-in";
import { IsNever } from "../is-never";
type Pathable = string | number;
type UnsafeValue<Type, Key> = Key extends keyof Type ? Type[Key] : never;
type NonRecursiveType = Builtin | Promise<unknown> | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>;
type Stringify<T> = T extends Pathable ? `${T}` : never;
type RecursivePaths<Type, Key extends Pathable, RecursivePaths = Paths<UnsafeValue<Type, Key>>> = IsNever<RecursivePaths> extends false ? `${Key}.${Stringify<RecursivePaths>}` : never;
type UnsafePaths<Type> = Type extends readonly [] ? never : {
    [Key in keyof Type]: Key extends Pathable ? Key | `${Key}` | RecursivePaths<Type, Key> : never;
}[Type extends AnyArray ? // only numeric keys are acceptable for arrays/tuples
number & keyof Type : keyof Type];
type Paths<Type> = Type extends NonRecursiveType ? never : Type extends AnyArray ? UnsafePaths<Type> : Type extends object ? UnsafePaths<Type> : never;
export { Paths };
