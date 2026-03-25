import type { ParseSchemaOptions } from "../index";
import type { ReferencingSchema } from "./index";
import type { ParseReference } from "./utils";
export type ParseInternalReferenceSchema<REFERENCING_SCHEMA extends ReferencingSchema, OPTIONS extends ParseSchemaOptions, PATH extends string> = ParseReference<Omit<REFERENCING_SCHEMA, "$ref">, OPTIONS, OPTIONS["rootSchema"], PATH>;
