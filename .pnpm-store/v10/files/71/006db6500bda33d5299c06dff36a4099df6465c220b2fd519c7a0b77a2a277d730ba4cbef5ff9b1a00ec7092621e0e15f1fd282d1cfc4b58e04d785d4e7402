import type { JSONSchema4, JSONSchema4Type } from 'json-schema';
export type RuleOption = {
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    enum?: readonly JSONSchema4Type[];
    default?: JSONSchema4Type;
    deprecated?: boolean;
};
/**
 * Gather a list of named options from a rule schema.
 * @param jsonSchema - the JSON schema to check
 * @returns - list of named options we could detect from the schema
 */
export declare function getAllNamedOptions(jsonSchema: JSONSchema4 | readonly JSONSchema4[] | undefined | null): readonly RuleOption[];
/**
 * Check if a rule schema is non-blank/empty and thus has actual options.
 * @param jsonSchema - the JSON schema to check
 * @returns - whether the schema has options
 */
export declare function hasOptions(jsonSchema: JSONSchema4 | readonly JSONSchema4[]): boolean;
