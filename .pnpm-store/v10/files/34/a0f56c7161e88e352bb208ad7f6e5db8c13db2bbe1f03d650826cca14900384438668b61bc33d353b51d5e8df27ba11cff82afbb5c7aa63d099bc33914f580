import type { M } from "ts-algebra";
import type { JSONSchema } from "../definitions";
import type { ParseSchema, ParseSchemaOptions } from "./index";
import type { MergeSubSchema } from "./utils";
export type OneOfSchema = JSONSchema & Readonly<{
    oneOf: readonly JSONSchema[];
}>;
export type ParseOneOfSchema<ONE_OF_SCHEMA extends OneOfSchema, OPTIONS extends ParseSchemaOptions> = M.$Union<RecurseOnOneOfSchema<ONE_OF_SCHEMA["oneOf"], ONE_OF_SCHEMA, OPTIONS>>;
type RecurseOnOneOfSchema<SUB_SCHEMAS extends readonly JSONSchema[], ROOT_ONE_OF_SCHEMA extends OneOfSchema, OPTIONS extends ParseSchemaOptions, RESULT = never> = SUB_SCHEMAS extends readonly [
    infer SUB_SCHEMAS_HEAD,
    ...infer SUB_SCHEMAS_TAIL
] ? SUB_SCHEMAS_HEAD extends JSONSchema ? SUB_SCHEMAS_TAIL extends readonly JSONSchema[] ? RecurseOnOneOfSchema<SUB_SCHEMAS_TAIL, ROOT_ONE_OF_SCHEMA, OPTIONS, RESULT | M.$Intersect<ParseSchema<Omit<ROOT_ONE_OF_SCHEMA, "oneOf">, OPTIONS>, ParseSchema<MergeSubSchema<Omit<ROOT_ONE_OF_SCHEMA, "oneOf">, SUB_SCHEMAS_HEAD>, OPTIONS>>> : never : never : RESULT;
export {};
