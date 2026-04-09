/// <reference types="node" />
import { GrpcTimeOut, NumberArrayId, StringArrayId, keyValueObj, DataType, ConsistencyLevelEnum, collectionNameReq, resStatusResponse, OutputTransformers } from '../';
export interface CountReq extends collectionNameReq {
    expr?: string;
}
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
export interface GetMetricsResponse extends resStatusResponse {
    response: any;
    component_name: string;
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
export interface GetMetricsRequest extends GrpcTimeOut {
    request: {
        metric_type: 'system_info' | 'system_statistics' | 'system_log';
    };
}
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
export {};
