import type { DeserializationPattern, FromSchemaDefaultOptions, FromSchemaOptions, JSONSchema, JSONSchemaReference } from "./definitions";
export type IndexReferencesById<SCHEMA_REFERENCES extends readonly JSONSchemaReference[]> = {
    [REF_SCHEMA in SCHEMA_REFERENCES[number] as REF_SCHEMA["$id"]]: REF_SCHEMA;
};
export type ParseOptions<ROOT_SCHEMA extends JSONSchema, OPTIONS extends FromSchemaOptions> = {
    parseNotKeyword: OPTIONS["parseNotKeyword"] extends boolean ? OPTIONS["parseNotKeyword"] : FromSchemaDefaultOptions["parseNotKeyword"];
    parseIfThenElseKeywords: OPTIONS["parseIfThenElseKeywords"] extends boolean ? OPTIONS["parseIfThenElseKeywords"] : FromSchemaDefaultOptions["parseIfThenElseKeywords"];
    keepDefaultedPropertiesOptional: OPTIONS["keepDefaultedPropertiesOptional"] extends boolean ? OPTIONS["keepDefaultedPropertiesOptional"] : FromSchemaDefaultOptions["keepDefaultedPropertiesOptional"];
    rootSchema: ROOT_SCHEMA;
    references: OPTIONS["references"] extends JSONSchemaReference[] ? IndexReferencesById<OPTIONS["references"]> : {};
    deserialize: OPTIONS["deserialize"] extends DeserializationPattern[] | false ? OPTIONS["deserialize"] : FromSchemaDefaultOptions["deserialize"];
};
