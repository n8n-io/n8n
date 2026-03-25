import type { M } from "ts-algebra";
import type { JSONSchema } from "../definitions";
import type { ParseSchema, ParseSchemaOptions } from "./index";
export type NullableSchema = JSONSchema & Readonly<{
    nullable: boolean;
}>;
export type ParseNullableSchema<NULLABLE_SCHEMA extends NullableSchema, OPTIONS extends ParseSchemaOptions, PARSED_REST_SCHEMA = ParseSchema<Omit<NULLABLE_SCHEMA, "nullable">, OPTIONS>> = NULLABLE_SCHEMA extends Readonly<{
    nullable: true;
}> ? M.$Union<M.Primitive<null> | PARSED_REST_SCHEMA> : PARSED_REST_SCHEMA;
