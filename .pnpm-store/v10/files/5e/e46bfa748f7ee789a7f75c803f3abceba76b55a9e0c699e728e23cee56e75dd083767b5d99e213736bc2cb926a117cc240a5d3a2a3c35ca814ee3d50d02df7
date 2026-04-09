import { HasParsablePath } from "../has-parsable-path";
import { MarkRequired } from "../mark-required";
import { Paths } from "../paths";
import { Prettify } from "../prettify";
import { UnionToTuple } from "../union-to-tuple";
type RecursiveDeepMarkRequiredSinglePath<Type, KeyPath> = Type extends object ? KeyPath extends `${infer PropertyKey}.${infer RestKeyPath}` ? {
    [Key in keyof Type]: Key extends PropertyKey ? Prettify<RecursiveDeepMarkRequiredSinglePath<Type[Key], RestKeyPath>> : Type[Key];
} : Prettify<MarkRequired<Type, KeyPath & keyof Type>> : Type;
type RecursiveDeepMarkRequired<Accumulator, KeyPaths extends string[]> = KeyPaths extends [
    infer KeyPath,
    ...infer RestKeyPaths
] ? RestKeyPaths extends string[] ? RecursiveDeepMarkRequired<RecursiveDeepMarkRequiredSinglePath<Accumulator, KeyPath>, RestKeyPaths> : never : Accumulator;
export type DeepMarkRequired<Type, KeyPathUnion extends Paths<Type>> = HasParsablePath<Type> extends false ? Type : RecursiveDeepMarkRequired<Type, UnionToTuple<KeyPathUnion>>;
export {};
