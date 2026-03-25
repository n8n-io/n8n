import type { JSONSchema } from "../../definitions";
import type { Split } from "../../type-utils/split";
import type { ParseSchemaOptions } from "../index";
import type { ParseExternalReferenceSchema } from "./external";
import type { ParseInternalReferenceSchema } from "./internal";
export type ReferencingSchema = JSONSchema & {
    $ref: string;
};
export type ParseReferenceSchema<REFERENCING_SCHEMA extends ReferencingSchema, OPTIONS extends ParseSchemaOptions, REFERENCE_ID_AND_PATH extends string[] = Split<REFERENCING_SCHEMA["$ref"], "#">> = REFERENCE_ID_AND_PATH[0] extends "" ? ParseInternalReferenceSchema<REFERENCING_SCHEMA, OPTIONS, REFERENCE_ID_AND_PATH[1]> : ParseExternalReferenceSchema<REFERENCING_SCHEMA, OPTIONS, REFERENCE_ID_AND_PATH[0], REFERENCE_ID_AND_PATH[1]>;
