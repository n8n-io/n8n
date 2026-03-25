import { KeyValuePair, DataType, FieldSchema, SparseFloatVector, FieldData } from '../';
import { Pool } from 'generic-pool';
/**
 * Promisify a function call with optional timeout
 * @param obj - The object containing the target function
 * @param target - The name of the target function to call
 * @param params - The parameters to pass to the target function
 * @param timeout - Optional timeout in milliseconds
 * @returns A Promise that resolves with the result of the target function call
 */
export declare function promisify(pool: Pool<any>, target: string, params: any, timeout: number): Promise<any>;
export declare const findKeyValue: (obj: KeyValuePair[], key: string) => string | number | undefined;
export declare const sleep: (time: number) => Promise<unknown>;
export declare const buildDefaultSchema: (data: {
    dimension: number;
    primary_field_name: string;
    id_type: DataType.Int64 | DataType.VarChar;
    vector_field_name: string;
    auto_id: boolean;
}) => ({
    name: string;
    data_type: DataType.Int64 | DataType.VarChar;
    is_primary_key: boolean;
    autoID: boolean;
    dim?: undefined;
} | {
    name: string;
    data_type: DataType;
    dim: number;
    is_primary_key?: undefined;
    autoID?: undefined;
})[];
export declare const getDataKey: (type: DataType, camelCase?: boolean) => string;
/**
 * Returns the query iterator expression based on the provided parameters.
 *
 * @param params - The parameters for generating the query iterator expression.
 * @param params.expr - The expression to be combined with the iterator expression.
 * @param params.pkField - The primary key field schema.
 * @param params.page - The current page number.
 * @param params.pageCache - The cache of previous pages.
 * @returns The query iterator expression.
 */
export declare const getQueryIteratorExpr: (params: {
    expr: string;
    pkField: FieldSchema;
    lastPKId: string | number;
}) => string;
export declare const getPKFieldExpr: (data: {
    pkField: FieldSchema;
    value: string | number;
    condition?: string;
    expr?: string;
}) => string;
export declare const getSparseDim: (data: SparseFloatVector[]) => number;
export declare const getValidDataArray: (data: FieldData[], length: number) => boolean[];
