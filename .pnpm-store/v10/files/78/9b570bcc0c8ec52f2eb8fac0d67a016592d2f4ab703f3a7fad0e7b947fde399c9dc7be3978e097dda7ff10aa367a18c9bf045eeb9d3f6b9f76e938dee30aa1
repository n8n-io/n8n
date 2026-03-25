import { JSONSchema } from "../definitions";
type RemoveInvalidAdditionalItems<SCHEMA extends JSONSchema> = SCHEMA extends Readonly<{
    items: JSONSchema | readonly JSONSchema[];
}> ? SCHEMA extends Readonly<{
    additionalItems: JSONSchema;
}> ? SCHEMA : SCHEMA & Readonly<{
    additionalItems: true;
}> : SCHEMA extends boolean ? SCHEMA : Omit<SCHEMA, "additionalItems">;
type RemoveInvalidAdditionalProperties<SCHEMA extends JSONSchema> = SCHEMA extends Readonly<{
    additionalProperties: JSONSchema;
}> ? SCHEMA extends Readonly<{
    properties: Readonly<Record<string, JSONSchema>>;
}> ? SCHEMA : SCHEMA & Readonly<{
    properties: {};
}> : SCHEMA extends boolean ? SCHEMA : Omit<SCHEMA, "additionalProperties">;
export type MergeSubSchema<PARENT_SCHEMA extends JSONSchema, SUB_SCHEMA extends JSONSchema, CLEANED_SUB_SCHEMA extends JSONSchema = RemoveInvalidAdditionalProperties<RemoveInvalidAdditionalItems<SUB_SCHEMA>>> = Omit<PARENT_SCHEMA, keyof CLEANED_SUB_SCHEMA | "additionalProperties" | "patternProperties" | "unevaluatedProperties" | "required" | "additionalItems"> & CLEANED_SUB_SCHEMA;
export {};
