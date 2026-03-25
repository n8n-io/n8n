/// <reference types="node" />
import { GrpcTimeOut, KeyValuePair, NumberArrayId, StringArrayId, keyValueObj, DataType, SegmentState, SegmentLevel, ImportState, ConsistencyLevelEnum, collectionNameReq, resStatusResponse, RANKER_TYPE } from '../';
export type FloatVector = number[];
export type Float16Vector = number[] | Uint8Array;
export type BFloat16Vector = number[] | Uint8Array;
export type BinaryVector = number[];
export type SparseVectorArray = (number | undefined)[];
export type SparseVectorDic = {
    [key: string]: number;
};
export type SparseVectorCSR = {
    indices: number[];
    values: number[];
};
export type SparseVectorCOO = {
    index: number;
    value: number;
}[];
export type SparseFloatVector = SparseVectorArray | SparseVectorDic | SparseVectorCSR | SparseVectorCOO;
export type VectorTypes = FloatVector | Float16Vector | BinaryVector | BFloat16Vector | SparseFloatVector;
export type Bool = boolean;
export type Int8 = number;
export type Int16 = number;
export type Int32 = number;
export type Int64 = number;
export type Float = number;
export type Double = number;
export type VarChar = string;
export type JSON = {
    [key: string]: any;
};
export type Array = Int8[] | Int16[] | Int32[] | Int64[] | Float[] | Double[] | VarChar[];
export type FieldData = Bool | Int8 | Int16 | Int32 | Int64 | Float | Double | VarChar | JSON | Array | VectorTypes | null | undefined;
export interface RowData {
    [x: string]: FieldData;
}
export interface _Field {
    name: string;
    type: keyof typeof DataType;
    elementType?: keyof typeof DataType;
    data: FieldData[];
    dim?: number;
    nullable?: boolean;
    default_value?: FieldData;
}
export interface FlushReq extends GrpcTimeOut {
    collection_names: string[];
    db_name?: string;
}
export interface CountReq extends collectionNameReq {
    expr?: string;
}
export type InsertTransformers = {
    [DataType.BFloat16Vector]?: (bf16: BFloat16Vector) => Buffer;
    [DataType.Float16Vector]?: (f16: Float16Vector) => Buffer;
};
interface BaseInsertReq extends collectionNameReq {
    partition_name?: string;
    hash_keys?: number[];
    transformers?: InsertTransformers;
}
interface DataInsertReq extends BaseInsertReq {
    data: RowData[];
    fields_data?: never;
}
interface FieldsDataInsertReq extends BaseInsertReq {
    fields_data: RowData[];
    data?: never;
}
export type InsertReq = DataInsertReq | FieldsDataInsertReq;
interface BaseDeleteReq extends collectionNameReq {
    partition_name?: string;
    consistency_level?: 'Strong' | 'Session' | 'Bounded' | 'Eventually' | 'Customized';
    exprValues?: keyValueObj;
}
export type DeleteEntitiesReq = BaseDeleteReq & ({
    expr?: string;
    filter?: never;
} | {
    filter?: string;
    expr?: never;
});
export interface DeleteByIdsReq extends BaseDeleteReq {
    ids: string[] | number[];
}
export interface DeleteByFilterReq extends BaseDeleteReq {
    filter: string;
}
export type DeleteReq = DeleteByIdsReq | DeleteByFilterReq;
export interface CalcDistanceReq extends GrpcTimeOut {
    op_left: any;
    op_right: any;
    params: {
        key: string;
        value: string;
    }[];
}
export interface GetFlushStateReq extends GrpcTimeOut {
    segmentIDs: number[];
}
export interface LoadBalanceReq extends GrpcTimeOut {
    src_nodeID: number;
    dst_nodeIDs?: number[];
    sealed_segmentIDs?: number[];
}
export interface GetQuerySegmentInfoReq extends GrpcTimeOut {
    collectionName: string;
    dbName?: string;
}
export interface GePersistentSegmentInfoReq extends GrpcTimeOut {
    collectionName: string;
    dbName?: string;
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
export interface GetFlushStateResponse extends resStatusResponse {
    flushed: boolean;
}
export interface GetMetricsResponse extends resStatusResponse {
    response: any;
    component_name: string;
}
export interface QuerySegmentInfo {
    segmentID: number;
    collectionID: number;
    partitionID: number;
    mem_size: number;
    num_rows: number;
    index_name: string;
    indexID: number;
    nodeID: number;
    state: SegmentState;
    nodeIds: number[];
    level: SegmentLevel;
}
export interface PersistentSegmentInfo {
    segmentID: number;
    collectionID: number;
    partitionID: number;
    num_rows: number;
    state: SegmentState;
}
export interface GetQuerySegmentInfoResponse extends resStatusResponse {
    infos: QuerySegmentInfo[];
}
export interface GePersistentSegmentInfoResponse extends resStatusResponse {
    infos: PersistentSegmentInfo[];
}
export interface MutationResult extends resStatusResponse {
    succ_index: Number[];
    err_index: Number[];
    acknowledged: boolean;
    insert_cnt: string;
    delete_cnt: string;
    upsert_cnt: string;
    timestamp: string;
    IDs: StringArrayId | NumberArrayId;
}
export interface QueryResults extends resStatusResponse {
    data: Record<string, any>[];
}
export interface CountResult extends resStatusResponse {
    data: number;
}
export interface SearchResultData {
    [x: string]: any;
    score: number;
    id: string;
}
export interface SearchResults extends resStatusResponse {
    results: SearchResultData[];
    recalls: number[];
    session_ts: number;
    collection_name: string;
    all_search_count?: number;
    search_iterator_v2_results?: Record<string, any>;
    _search_iterator_v2_results?: string;
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
export interface GetMetricsRequest extends GrpcTimeOut {
    request: {
        metric_type: 'system_info' | 'system_statistics' | 'system_log';
    };
}
export interface SearchParam {
    anns_field: string;
    topk: string | number;
    metric_type: string;
    params: string;
    offset?: number;
    round_decimal?: number;
    ignore_growing?: boolean;
    group_by_field?: string;
    group_size?: number;
    strict_group_size?: boolean;
    hints?: string;
    [key: string]: any;
}
export interface SearchReq extends collectionNameReq {
    anns_field?: string;
    partition_names?: string[];
    expr?: string;
    exprValues?: keyValueObj;
    search_params: SearchParam;
    vectors: VectorTypes[];
    output_fields?: string[];
    travel_timestamp?: string;
    vector_type: DataType.BinaryVector | DataType.FloatVector;
    nq?: number;
    consistency_level?: ConsistencyLevelEnum;
    transformers?: OutputTransformers;
}
export type SearchTextType = string | string[];
export type SearchVectorType = VectorTypes | VectorTypes[];
export type SearchDataType = SearchVectorType | SearchTextType;
export type SearchMultipleDataType = VectorTypes[] | SearchTextType[];
export interface SearchSimpleReq extends collectionNameReq {
    partition_names?: string[];
    anns_field?: string;
    data?: SearchDataType;
    vector?: VectorTypes;
    vectors?: VectorTypes[];
    output_fields?: string[];
    limit?: number;
    topk?: number;
    offset?: number;
    filter?: string;
    expr?: string;
    exprValues?: keyValueObj;
    params?: keyValueObj;
    metric_type?: string;
    consistency_level?: ConsistencyLevelEnum;
    ignore_growing?: boolean;
    group_by_field?: string;
    group_size?: number;
    strict_group_size?: boolean;
    hints?: string;
    round_decimal?: number;
    transformers?: OutputTransformers;
}
export type HybridSearchSingleReq = Pick<SearchParam, 'anns_field' | 'ignore_growing' | 'group_by_field'> & {
    data: SearchDataType;
    expr?: string;
    exprValues?: keyValueObj;
    params?: keyValueObj;
    transformers?: OutputTransformers;
};
export interface SearchIteratorReq extends Omit<SearchSimpleReq, 'vectors' | 'offset' | 'limit' | 'topk'> {
    limit?: number;
    batchSize: number;
    external_filter_fn?: (row: SearchResultData) => boolean;
}
export type RerankerObj = {
    strategy: RANKER_TYPE | string;
    params: keyValueObj;
};
export type HybridSearchReq = Omit<SearchSimpleReq, 'data' | 'vector' | 'vectors' | 'params' | 'anns_field' | 'expr' | 'exprValues'> & {
    data: HybridSearchSingleReq[];
    rerank?: RerankerObj;
};
export interface SearchRes extends resStatusResponse {
    results: {
        top_k: number;
        fields_data: {
            type: string;
            field_name: string;
            field_id: number;
            field: 'vectors' | 'scalars';
            vectors?: {
                dim: string;
                data: 'float_vector' | 'binary_vector';
                float_vector?: {
                    data: number[];
                };
                binary_vector?: Buffer;
            };
            scalars: {
                [x: string]: any;
                data: string;
            };
        }[];
        scores: number[];
        ids: {
            int_id?: {
                data: number[];
            };
            str_id?: {
                data: string[];
            };
            id_field: 'int_id' | 'str_id';
        };
        num_queries: number;
        topks: number[];
        output_fields: string[];
        group_by_field_value: string;
        recalls: number[];
        search_iterator_v2_results?: Record<string, any>;
        _search_iterator_v2_results?: string;
        all_search_count?: number;
    };
    collection_name: string;
    session_ts: number;
}
export type OutputTransformers = {
    [DataType.BFloat16Vector]?: (bf16bytes: Uint8Array) => BFloat16Vector;
    [DataType.Float16Vector]?: (f16: Uint8Array) => Float16Vector;
    [DataType.SparseFloatVector]?: (sparse: SparseVectorDic) => SparseFloatVector;
};
type BaseQueryReq = collectionNameReq & {
    output_fields?: string[];
    partition_names?: string[];
    ids?: string[] | number[];
    expr?: string;
    filter?: string;
    offset?: number;
    limit?: number;
    consistency_level?: ConsistencyLevelEnum;
    transformers?: OutputTransformers;
    exprValues?: keyValueObj;
};
export type QueryReq = BaseQueryReq & ({
    expr?: string;
    filter?: never;
} | {
    filter?: string;
    expr?: never;
});
export interface QueryIteratorReq extends Omit<QueryReq, 'ids' | 'offset' | 'limit'> {
    limit?: number;
    batchSize: number;
}
export interface GetReq extends collectionNameReq {
    ids: string[] | number[];
    output_fields?: string[];
    partition_names?: string[];
    offset?: number;
    limit?: number;
    consistency_level?: ConsistencyLevelEnum;
}
export interface QueryRes extends resStatusResponse {
    fields_data: {
        type: DataType;
        field_name: string;
        field: 'vectors' | 'scalars';
        field_id: number;
        vectors?: {
            dim: string;
            data: 'float_vector' | 'binary_vector';
            float_vector?: {
                data: number[];
            };
            binary_vector?: Buffer;
        };
        scalars?: {
            [x: string]: any;
            data: string;
        };
        is_dynamic: boolean;
        valid_data: boolean[];
    }[];
    output_fields: string[];
    collection_name: string;
}
export interface FlushResult extends resStatusResponse {
    coll_segIDs: any;
}
export interface ListIndexedSegmentReq extends collectionNameReq {
    index_name: string;
}
export interface ListIndexedSegmentResponse extends resStatusResponse {
    segmentIDs: number[];
}
export interface DescribeSegmentIndexDataReq extends collectionNameReq {
    index_name: string;
    segmentsIDs: number[];
}
export interface DescribeSegmentIndexDataResponse extends resStatusResponse {
    index_params: any;
    index_data: any;
}
export {};
