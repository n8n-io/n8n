import type { M } from "ts-algebra";
import type { JSONSchema } from "../definitions";
import type { Writable } from "../type-utils";
import type { ParseSchema, ParseSchemaOptions } from "./index";
export type EnumSchema = JSONSchema & Readonly<{
    enum: readonly unknown[];
}>;
export type ParseEnumSchema<ENUM_SCHEMA extends EnumSchema, OPTIONS extends ParseSchemaOptions> = M.$Intersect<ParseEnum<ENUM_SCHEMA>, ParseSchema<Omit<ENUM_SCHEMA, "enum">, OPTIONS>>;
type ParseEnum<ENUM_SCHEMA extends EnumSchema> = M.Enum<Writable<ENUM_SCHEMA["enum"][number]>>;
export {};
