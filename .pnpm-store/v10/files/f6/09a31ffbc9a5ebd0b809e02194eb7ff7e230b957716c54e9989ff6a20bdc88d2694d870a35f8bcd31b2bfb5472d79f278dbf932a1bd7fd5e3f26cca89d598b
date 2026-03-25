import { CamelCase } from "../camel-case";
export type DeepCamelCaseProperties<Type> = Type extends Record<string, unknown> ? {
    [Key in keyof Type as CamelCase<Key>]: DeepCamelCaseProperties<Type[Key]>;
} : Type;
