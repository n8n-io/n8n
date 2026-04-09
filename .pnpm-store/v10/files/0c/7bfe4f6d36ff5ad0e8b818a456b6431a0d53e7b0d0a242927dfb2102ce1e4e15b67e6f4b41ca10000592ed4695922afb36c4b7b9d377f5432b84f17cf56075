import { SchemaDefinition, ParquetField } from './declare';
import { JSONSchema4 } from 'json-schema';
/**
 * A parquet file schema
 */
export declare class ParquetSchema {
    schema: SchemaDefinition;
    fields: Record<string, ParquetField>;
    fieldList: ParquetField[];
    /**
     * Create a new schema from JSON Schema (json-schema.org)
     */
    static fromJsonSchema(jsonSchema: JSONSchema4): ParquetSchema;
    /**
     * Create a new schema from a JSON schema definition
     */
    constructor(schema: SchemaDefinition);
    /**
     * Retrieve a field definition
     */
    findField(path: string | string[]): ParquetField;
    /**
     * Retrieve a field definition and all the field's ancestors
     */
    findFieldBranch(path: string | string[]): ParquetField[];
}
