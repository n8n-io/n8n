import type { M } from "ts-algebra";
import type { JSONSchema } from "../definitions";
import type { ParseSchema, ParseSchemaOptions } from "./index";
export type ObjectSchema = JSONSchema & Readonly<{
    type: "object";
}>;
export type ParseObjectSchema<OBJECT_SCHEMA extends ObjectSchema, OPTIONS extends ParseSchemaOptions> = OBJECT_SCHEMA extends Readonly<{
    properties: Readonly<Record<string, JSONSchema>>;
}> ? M.$Object<{
    [KEY in keyof OBJECT_SCHEMA["properties"]]: ParseSchema<OBJECT_SCHEMA["properties"][KEY], OPTIONS>;
}, GetRequired<OBJECT_SCHEMA, OPTIONS>, GetOpenProps<OBJECT_SCHEMA, OPTIONS>, GetClosedOnResolve<OBJECT_SCHEMA>> : M.$Object<{}, GetRequired<OBJECT_SCHEMA, OPTIONS>, GetOpenProps<OBJECT_SCHEMA, OPTIONS>, GetClosedOnResolve<OBJECT_SCHEMA>>;
type GetRequired<OBJECT_SCHEMA extends ObjectSchema, OPTIONS extends ParseSchemaOptions> = (OBJECT_SCHEMA extends Readonly<{
    required: ReadonlyArray<string>;
}> ? OBJECT_SCHEMA["required"][number] : never) | (OPTIONS["keepDefaultedPropertiesOptional"] extends true ? never : OBJECT_SCHEMA extends Readonly<{
    properties: Readonly<Record<string, JSONSchema>>;
}> ? {
    [KEY in keyof OBJECT_SCHEMA["properties"] & string]: OBJECT_SCHEMA["properties"][KEY] extends Readonly<{
        default: unknown;
    }> ? KEY : never;
}[keyof OBJECT_SCHEMA["properties"] & string] : never);
type GetOpenProps<OBJECT_SCHEMA extends ObjectSchema, OPTIONS extends ParseSchemaOptions> = OBJECT_SCHEMA extends Readonly<{
    additionalProperties: JSONSchema;
}> ? OBJECT_SCHEMA extends Readonly<{
    patternProperties: Record<string, JSONSchema>;
}> ? AdditionalAndPatternProps<OBJECT_SCHEMA["additionalProperties"], OBJECT_SCHEMA["patternProperties"], OPTIONS> : ParseSchema<OBJECT_SCHEMA["additionalProperties"], OPTIONS> : OBJECT_SCHEMA extends Readonly<{
    patternProperties: Record<string, JSONSchema>;
}> ? PatternProps<OBJECT_SCHEMA["patternProperties"], OPTIONS> : M.Any;
type GetClosedOnResolve<OBJECT_SCHEMA extends ObjectSchema> = OBJECT_SCHEMA extends Readonly<{
    unevaluatedProperties: false;
}> ? true : false;
type PatternProps<PATTERN_PROPERTY_SCHEMAS extends Readonly<Record<string, JSONSchema>>, OPTIONS extends ParseSchemaOptions> = M.$Union<{
    [KEY in keyof PATTERN_PROPERTY_SCHEMAS]: ParseSchema<PATTERN_PROPERTY_SCHEMAS[KEY], OPTIONS>;
}[keyof PATTERN_PROPERTY_SCHEMAS]>;
type AdditionalAndPatternProps<ADDITIONAL_PROPERTIES_SCHEMA extends JSONSchema, PATTERN_PROPERTY_SCHEMAS extends Readonly<Record<string, JSONSchema>>, OPTIONS extends ParseSchemaOptions> = ADDITIONAL_PROPERTIES_SCHEMA extends boolean ? PatternProps<PATTERN_PROPERTY_SCHEMAS, OPTIONS> : M.$Union<ParseSchema<ADDITIONAL_PROPERTIES_SCHEMA, OPTIONS> | {
    [KEY in keyof PATTERN_PROPERTY_SCHEMAS]: ParseSchema<PATTERN_PROPERTY_SCHEMAS[KEY], OPTIONS>;
}[keyof PATTERN_PROPERTY_SCHEMAS]>;
export {};
