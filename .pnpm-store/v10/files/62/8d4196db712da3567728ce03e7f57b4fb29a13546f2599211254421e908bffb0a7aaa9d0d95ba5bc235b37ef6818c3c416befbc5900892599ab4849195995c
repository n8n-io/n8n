import { JSONSchema4 } from 'json-schema';
import { SchemaDefinition } from './declare';
/**
 * Error to capture all the unsupported edge cases
 */
export declare class UnsupportedJsonSchemaError extends Error {
    constructor(msg: string);
}
/**
 * Converts supported Json Schemas into Parquet Schema Definitions
 */
export declare const fromJsonSchema: (jsonSchema: JSONSchema4) => SchemaDefinition;
