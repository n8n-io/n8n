import { Type } from 'protobufjs';
import { FieldType, TypeParamKey, DataType, DataTypeMap, CreateCollectionReq, FunctionObject } from '../';
export declare const buildDefaultSchema: (data: {
    dimension: number;
    primary_field_name: string;
    id_type: DataType.Int64 | DataType.VarChar;
    vector_field_name: string;
    auto_id: boolean;
}) => FieldType[];
export declare const getDataKey: (type: DataType, camelCase?: boolean) => string;
/**
 * Assigns specified properties from the `field` object to `type_params` within the `FieldType` object.
 * Converts properties to strings, serializing objects as JSON strings if needed, then removes them from `field`.
 *
 * @param field - The `FieldType` object to modify.
 * @param typeParamKeys - Keys to assign to `type_params` if present in `field`.
 * @returns The modified `FieldType` object.
 */
export declare const assignTypeParams: (field: FieldType, typeParamKeys?: TypeParamKey[]) => FieldType;
/**
 * Converts a `key` of type `keyof typeof DataTypeMap | DataType` to a `DataType`.
 *
 * @param {keyof typeof DataTypeMap | DataType} key - The key to convert.
 * @returns {DataType} The converted `DataType`.
 */
export declare const convertToDataType: (key: keyof typeof DataTypeMap | DataType | number) => DataType;
/**
 * Formats a field schema by converting its properties to the appropriate types and adding additional properties.
 *
 * @param {FieldType} field - The field to format.
 * @param {Record<string, Type>} schemaTypes - The schema types to use for formatting.
 * @param {Object} [override] - Optional override object for additional properties.
 * @returns {Object} The formatted field schema.
 */
export declare const formatFieldSchema: (field: FieldType, schemaTypes: Record<string, Type>, override?: {
    partition_key_field?: string;
    functionOutputFields?: string[];
    clustering_key_field?: string;
}) => {
    [k: string]: any;
};
/**
 * Formats a FunctionObject into a FunctionSchema payload for gRPC.
 * Returns a plain object with snake_case field names matching the proto definition
 * in milvus.ts (used by @grpc/proto-loader).
 *
 * @param {FunctionObject} func - The function object to format.
 * @returns {Object} The formatted function schema payload (plain object).
 */
export declare const formatFunctionSchema: (func: FunctionObject) => {
    [k: string]: any;
};
/**
 * Formats a struct array field schema by converting its properties to the appropriate types and adding additional properties.
 *
 * @param {FieldType} field - The field to format.
 * @param {Record<string, Type>} schemaTypes - The schema types to use for formatting.
 * @returns {Object} The formatted struct array field schema.
 */
export declare const formatStructArrayFieldSchema: (field: FieldType, schemaTypes: Record<string, Type>) => import("protobufjs").Message<{}>;
/**
 * Formats the input data into a request payload for creating a collection.
 *
 * @param {CreateCollectionReq} data - The input data for creating a collection.
 * @param {Type} schemaType - The schema type for the collection.
 * @returns {Object} The formatted request payload.
 */
export declare const formatCollectionSchema: (data: CreateCollectionReq, schemaTypes: Record<string, Type>) => {
    [k: string]: any;
};
