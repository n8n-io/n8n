import { GrpcTimeOut, KeyValuePair, DataType, ImportState, collectionNameReq, resStatusResponse, Bool, Int8, Int16, Int32, Int64, Float, Double, VarChar, JSON, Geometry, Array, VectorTypes, BFloat16Vector, Float16Vector } from '../';
export type FieldData = Bool | Int8 | Int16 | Int32 | Int64 | Float | Double | VarChar | JSON | Geometry | Array | VectorTypes | null | undefined;
export interface RowData {
    [x: string]: FieldData;
}
export interface _Field {
    name: string;
    type: DataType;
    elementType?: DataType;
    data: FieldData[];
    dim?: number;
    nullable?: boolean;
    default_value?: FieldData;
    fieldMap: Map<string, _Field>;
}
export type InsertTransformers = {
    [DataType.BFloat16Vector]?: (bf16: BFloat16Vector) => Uint8Array;
    [DataType.Float16Vector]?: (f16: Float16Vector) => Uint8Array;
};
interface BaseInsertReq extends collectionNameReq {
    partition_name?: string;
    hash_keys?: number[];
    transformers?: InsertTransformers;
    skip_check_schema?: boolean;
}
export type InsertReq = DataInsertReq | FieldsDataInsertReq;
export type UpsertReq = (DataInsertReq | FieldsDataInsertReq) & {
    partial_update?: boolean;
};
interface DataInsertReq extends BaseInsertReq {
    data: RowData[];
    fields_data?: never;
}
interface FieldsDataInsertReq extends BaseInsertReq {
    fields_data: RowData[];
    data?: never;
}
export interface ImportReq extends collectionNameReq {
    partition_name?: string;
    channel_names?: string[];
    files: string[];
    options?: KeyValuePair[];
}
export interface ListImportTasksReq extends collectionNameReq {
    limit?: number;
}
export interface GetImportStateReq extends GrpcTimeOut {
    task: number;
}
export interface ImportResponse extends resStatusResponse {
    tasks: number[];
}
export interface GetImportStateResponse extends resStatusResponse {
    state: ImportState;
    row_count: number;
    id_list: number[];
    infos: KeyValuePair[];
    id: number;
    collection_id: number;
    segment_ids: number[];
    create_ts: number;
}
export interface ListImportTasksResponse extends resStatusResponse {
    tasks: GetImportStateResponse[];
}
export {};
