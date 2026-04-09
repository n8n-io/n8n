import { HasParsablePath } from "../has-parsable-path";
import { MarkOptional } from "../mark-optional";
import { Paths } from "../paths";
import { Prettify } from "../prettify";
import { UnionToTuple } from "../union-to-tuple";
type RecursiveDeepMarkOptionalSinglePath<Type, KeyPath> = Type extends object ? KeyPath extends `${infer PropertyKey}.${infer RestKeyPath}` ? {
    [Key in keyof Type]: Key extends PropertyKey ? Prettify<RecursiveDeepMarkOptionalSinglePath<Type[Key], RestKeyPath>> : Type[Key];
} : Prettify<MarkOptional<Type, KeyPath & keyof Type>> : Type;
type RecursiveDeepMarkOptional<Accumulator, KeyPaths extends string[]> = KeyPaths extends [
    infer KeyPath,
    ...infer RestKeyPaths
] ? RestKeyPaths extends string[] ? RecursiveDeepMarkOptional<RecursiveDeepMarkOptionalSinglePath<Accumulator, KeyPath>, RestKeyPaths> : never : Accumulator;
export type DeepMarkOptional<Type, KeyPathUnion extends Paths<Type>> = HasParsablePath<Type> extends false ? Type : RecursiveDeepMarkOptional<Type, UnionToTuple<KeyPathUnion>>;
export {};
