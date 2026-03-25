import type { $JSONSchema, JSONSchemaType } from "./jsonSchema";
export type JSONSchemaExtension = Record<string, unknown>;
export type ExtendedJSONSchema<EXTENSION extends JSONSchemaExtension = JSONSchemaExtension> = boolean | (Readonly<{
    [$JSONSchema]?: $JSONSchema;
    $id?: string | undefined;
    $ref?: string | undefined;
    $schema?: string | undefined;
    $comment?: string | undefined;
    type?: JSONSchemaType | readonly JSONSchemaType[];
    const?: unknown;
    enum?: unknown;
    multipleOf?: number | undefined;
    maximum?: number | undefined;
    exclusiveMaximum?: number | undefined;
    minimum?: number | undefined;
    exclusiveMinimum?: number | undefined;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
    items?: ExtendedJSONSchema<EXTENSION> | readonly ExtendedJSONSchema<EXTENSION>[];
    additionalItems?: ExtendedJSONSchema<EXTENSION>;
    contains?: ExtendedJSONSchema<EXTENSION>;
    maxItems?: number | undefined;
    minItems?: number | undefined;
    uniqueItems?: boolean | undefined;
    maxProperties?: number | undefined;
    minProperties?: number | undefined;
    required?: readonly string[];
    properties?: Readonly<Record<string, ExtendedJSONSchema<EXTENSION>>>;
    patternProperties?: Readonly<Record<string, ExtendedJSONSchema<EXTENSION>>>;
    additionalProperties?: ExtendedJSONSchema<EXTENSION>;
    dependencies?: Readonly<Record<string, ExtendedJSONSchema<EXTENSION> | readonly string[]>>;
    propertyNames?: ExtendedJSONSchema<EXTENSION>;
    if?: ExtendedJSONSchema<EXTENSION>;
    then?: ExtendedJSONSchema<EXTENSION>;
    else?: ExtendedJSONSchema<EXTENSION>;
    allOf?: readonly ExtendedJSONSchema<EXTENSION>[];
    anyOf?: readonly ExtendedJSONSchema<EXTENSION>[];
    oneOf?: readonly ExtendedJSONSchema<EXTENSION>[];
    not?: ExtendedJSONSchema<EXTENSION>;
    format?: string | undefined;
    contentMediaType?: string | undefined;
    contentEncoding?: string | undefined;
    definitions?: Readonly<Record<string, ExtendedJSONSchema<EXTENSION>>>;
    title?: string | undefined;
    description?: string | undefined;
    default?: unknown;
    readOnly?: boolean | undefined;
    writeOnly?: boolean | undefined;
    examples?: readonly unknown[];
    nullable?: boolean;
}> & Readonly<Partial<EXTENSION>>);
export type ExtendedJSONSchemaReference<EXTENSION extends JSONSchemaExtension = JSONSchemaExtension> = ExtendedJSONSchema<EXTENSION> & Readonly<{
    $id: string;
}>;
type UnextendJSONSchemaTuple<EXTENSION extends JSONSchemaExtension, EXTENDED_SCHEMAS extends ExtendedJSONSchema<EXTENSION>[]> = EXTENDED_SCHEMAS extends [
    infer EXTENDED_SCHEMAS_HEAD,
    ...infer EXTENDED_SCHEMAS_TAIL
] ? EXTENDED_SCHEMAS_HEAD extends ExtendedJSONSchema<EXTENSION> ? EXTENDED_SCHEMAS_TAIL extends ExtendedJSONSchema<EXTENSION>[] ? [
    UnextendJSONSchema<EXTENSION, EXTENDED_SCHEMAS_HEAD>,
    ...UnextendJSONSchemaTuple<EXTENSION, EXTENDED_SCHEMAS_TAIL>
] : never : never : [];
type UnextendJSONSchemaRecord<EXTENSION extends JSONSchemaExtension, EXTENDED_SCHEMA_RECORD extends Record<string, unknown>> = {
    [KEY in keyof EXTENDED_SCHEMA_RECORD]: EXTENDED_SCHEMA_RECORD[KEY] extends ExtendedJSONSchema<EXTENSION> ? UnextendJSONSchema<EXTENSION, EXTENDED_SCHEMA_RECORD[KEY]> : EXTENDED_SCHEMA_RECORD[KEY];
};
export type UnextendJSONSchema<EXTENSION extends JSONSchemaExtension, EXTENDED_SCHEMA> = EXTENDED_SCHEMA extends boolean ? EXTENDED_SCHEMA : {
    [KEY in $JSONSchema | keyof EXTENDED_SCHEMA]: KEY extends keyof EXTENDED_SCHEMA ? EXTENDED_SCHEMA extends {
        [K in KEY]: ExtendedJSONSchema<EXTENSION>;
    } ? UnextendJSONSchema<EXTENSION, EXTENDED_SCHEMA[KEY]> : EXTENDED_SCHEMA extends {
        [K in KEY]: ExtendedJSONSchema<EXTENSION>[];
    } ? number extends EXTENDED_SCHEMA[KEY]["length"] ? UnextendJSONSchema<EXTENSION, EXTENDED_SCHEMA[KEY][number]>[] : EXTENDED_SCHEMA[KEY] extends ExtendedJSONSchema<EXTENSION>[] ? UnextendJSONSchemaTuple<EXTENSION, EXTENDED_SCHEMA[KEY]> : never : EXTENDED_SCHEMA extends {
        [K in KEY]: Record<string, unknown>;
    } ? UnextendJSONSchemaRecord<EXTENSION, EXTENDED_SCHEMA[KEY]> : EXTENDED_SCHEMA[KEY] : KEY extends $JSONSchema ? $JSONSchema : never;
};
export {};
