import type { M } from "ts-algebra";
import type { JSONSchema, JSONSchemaType } from "../definitions";
import type { ArrayOrTupleSchema, ParseArrayOrTupleSchema } from "./array";
import type { ParseSchemaOptions } from "./index";
import type { ObjectSchema, ParseObjectSchema } from "./object";
export type SingleTypeSchema = JSONSchema & Readonly<{
    type: JSONSchemaType;
}>;
export type ParseSingleTypeSchema<SINGLE_TYPE_SCHEMA extends SingleTypeSchema, OPTIONS extends ParseSchemaOptions> = SINGLE_TYPE_SCHEMA extends Readonly<{
    type: "null";
}> ? M.Primitive<null> : SINGLE_TYPE_SCHEMA extends Readonly<{
    type: "boolean";
}> ? M.Primitive<boolean> : SINGLE_TYPE_SCHEMA extends Readonly<{
    type: "integer";
}> ? M.Primitive<number> : SINGLE_TYPE_SCHEMA extends Readonly<{
    type: "number";
}> ? M.Primitive<number> : SINGLE_TYPE_SCHEMA extends Readonly<{
    type: "string";
}> ? M.Primitive<string> : SINGLE_TYPE_SCHEMA extends ArrayOrTupleSchema ? ParseArrayOrTupleSchema<SINGLE_TYPE_SCHEMA, OPTIONS> : SINGLE_TYPE_SCHEMA extends ObjectSchema ? ParseObjectSchema<SINGLE_TYPE_SCHEMA, OPTIONS> : M.Never;
