import { RowData, _Field, FieldData, InsertTransformers, OutputTransformers } from '../';
/**
 * Builds a dynamic row object by separating the input data into non-dynamic fields and a dynamic field.
 *
 * @param {RowData} rowData - The input data object.
 * @param {Map<string, Field>} fieldMap - A map of field names to field objects.
 * @param {string} dynamicFieldName - The name of the dynamic field.
 * @returns {RowData} The generated dynamic row object.
 */
export declare const buildDynamicRow: (rowData: RowData, fieldMap: Map<string, _Field>, dynamicFieldName: string, functionOutputFields: string[]) => RowData;
/**
 * Processes vector data from gRPC response format
 * @param item - The vector field item from gRPC response
 * @param transformers - Optional transformers for data conversion
 * @returns Processed vector data
 */
export declare const processVectorData: (item: any, transformers?: OutputTransformers) => any;
/**
 * Processes scalar data from gRPC response format
 * @param item - The scalar field item from gRPC response
 * @returns Processed scalar data
 */
export declare const processScalarData: (item: any) => any;
/**
 * Processes struct arrays data from gRPC response format
 * @param item - The struct arrays field item from gRPC response
 * @returns Processed struct arrays data as array of objects
 */
export declare const processStructArraysData: (item: any) => any;
/**
 * create a data map for each fields, resolve grpc data format
 * If the field is a vector, split the data into chunks of the appropriate size.
 * If the field is a scalar, decode the JSON/array data if necessary.
 */
export declare const buildFieldDataMap: (fields_data: any[], transformers?: OutputTransformers) => Map<string, RowData[]>;
/**
 * Builds the field data for a given row and column.
 *
 * @param {RowData} rowData - The data for the row.
 * @param {Field} column - The column information.
 * @returns {FieldData} The field data for the row and column.
 */
export declare const buildFieldData: (rowData: RowData, field: _Field, transformers?: InsertTransformers, rowIndex?: number) => FieldData;
