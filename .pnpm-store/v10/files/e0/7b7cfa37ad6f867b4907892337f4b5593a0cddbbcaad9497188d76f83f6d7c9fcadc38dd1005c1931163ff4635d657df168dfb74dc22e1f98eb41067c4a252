import type { M } from "ts-algebra";
import type { JSONSchema } from "../../definitions";
import type { Join, Pop, Split } from "../../type-utils";
import type { ParseSchemaOptions } from "../index";
import type { ReferencingSchema } from "./index";
import type { ParseReference } from "./utils";
export type ParseExternalReferenceSchema<REF_SCHEMA extends ReferencingSchema, OPTIONS extends ParseSchemaOptions, EXTERNAL_REFERENCE_ID extends string, SUB_PATH extends string | undefined> = OPTIONS["references"] extends {
    [KEY in EXTERNAL_REFERENCE_ID]: JSONSchema;
} ? ParseReference<Omit<REF_SCHEMA, "$ref">, OPTIONS, OPTIONS["references"][EXTERNAL_REFERENCE_ID], SUB_PATH> : OPTIONS extends {
    rootSchema: IdSchema;
} ? ParseExternalReferenceWithoutDirectorySchema<Omit<REF_SCHEMA, "$ref">, OPTIONS, EXTERNAL_REFERENCE_ID, SUB_PATH> : M.Never;
type ParseDirectory<REFERENCE extends string> = Join<Pop<Split<REFERENCE, "/">>, "/">;
type IdSchema = JSONSchema & {
    $id: string;
};
type ParseExternalReferenceWithoutDirectorySchema<SUB_SCHEMA extends JSONSchema, OPTIONS extends ParseSchemaOptions & {
    rootSchema: IdSchema;
}, EXTERNAL_REFERENCE_ID extends string, SUB_PATH extends string | undefined, DIRECTORY extends string = ParseDirectory<OPTIONS["rootSchema"]["$id"]>, COMPLETE_REFERENCE extends string = Join<[
    DIRECTORY,
    EXTERNAL_REFERENCE_ID
], "/">> = COMPLETE_REFERENCE extends keyof OPTIONS["references"] ? ParseReference<SUB_SCHEMA, OPTIONS, OPTIONS["references"][COMPLETE_REFERENCE], SUB_PATH> : M.Never;
export {};
