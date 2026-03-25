import type { M } from "ts-algebra";
import type { JSONSchema } from "../definitions";
import type { Writable } from "../type-utils";
import type { ParseSchema, ParseSchemaOptions } from "./index";
export type ConstSchema = JSONSchema & Readonly<{
    const: unknown;
}>;
export type ParseConstSchema<CONST_SCHEMA extends ConstSchema, OPTIONS extends ParseSchemaOptions> = M.$Intersect<ParseConst<CONST_SCHEMA>, ParseSchema<Omit<CONST_SCHEMA, "const">, OPTIONS>>;
type ParseConst<CONST_SCHEMA extends ConstSchema> = M.Const<Writable<CONST_SCHEMA["const"]>>;
export {};
