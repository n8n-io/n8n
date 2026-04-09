import { IsNever } from "../is-never";
import { CreateTypeOptions } from "../create-type-options";
import { ValueOf } from "../value-of";
import { HasParsablePath } from "../has-parsable-path";
type Pathable = string | number;
type DefaultRecursivePathsOptions = {
    depth: [];
};
/**
 * @param depth This option counts the number of recursive calls in
 * `RecursivePathsOptions['depth']['length']`. Used in combination with
 * `PathsOptions['depth']`
 */
type RecursivePathsOptions = {
    depth: any[];
};
/**
 * @param depth By default, the depth option is set to 7. It should cover the
 * majority of use cases. If by any chance it doesn't fit you, feel free to
 * increase the value. However, this may increase the chance of getting
 * `Type instantiation is excessively deep and possibly infinite` error.
 *
 * @param anyArrayIndexAccessor By default there is no wildcard access to
 * array indices - usage must be intentionally configured.
 */
type DefaultPathsOptions = {
    depth: 7;
    anyArrayIndexAccessor: `${number}`;
};
/**
 * @param depth This option restricts the depth of the paths lookup and removes `Type
 * instantiation is excessively deep and possibly infinite` errors for
 * potentially infinite types.
 *
 * @param anyArrayIndexAccessor This wildcard will satisfy any array index if defined.
 */
type PathsOptions = {
    depth: number;
    anyArrayIndexAccessor: string;
};
type Append<Tuple extends any[]> = [...Tuple, 0];
type RecursivePaths<Type, UserOptions extends Required<PathsOptions>, CallOptions extends RecursivePathsOptions> = IsNever<keyof Type> extends true ? never : NonNullable<ValueOf<{
    [Key in keyof Type]: Key extends Pathable ? `${AnyArrayIndexAccessorOrKey<Key, UserOptions>}` | (CallOptions["depth"]["length"] extends UserOptions["depth"] ? never : Type[Key] extends infer Value ? Value extends Value ? HasParsablePath<Value> extends true ? RecursivePaths<Value, UserOptions, {
        depth: Append<CallOptions["depth"]>;
    }> extends infer Rest ? IsNever<Rest> extends true ? never : Rest extends Pathable ? `${AnyArrayIndexAccessorOrKey<Key, UserOptions>}.${Rest}` : never : never : never : never : never) : never;
}>>;
type UnsafePaths<Type, Options extends Required<PathsOptions>> = Type extends Type ? HasParsablePath<Type> extends true ? RecursivePaths<Type, Options, DefaultRecursivePathsOptions> : never : never;
type AnyArrayIndexAccessorOrKey<Key extends Pathable, UserOptions extends Required<PathsOptions>> = Key extends number ? Key | UserOptions["anyArrayIndexAccessor"] : Key;
export type Paths<Type, OverridePathOptions extends Partial<PathsOptions> = {}> = UnsafePaths<Type, CreateTypeOptions<PathsOptions, OverridePathOptions, DefaultPathsOptions>>;
export {};
