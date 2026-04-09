import { SegmentState, SegmentLevel } from '../const';
import { resStatusResponse, collectionNameReq, GrpcTimeOut } from './Common';
export interface GetFlushStateReq extends GrpcTimeOut {
    segmentIDs?: number[];
    flush_ts?: number;
    db_name?: string;
    collection_name?: string;
}
export interface FlushReq extends GrpcTimeOut {
    collection_names: string[];
    db_name?: string;
}
export interface FlushResult extends resStatusResponse {
    coll_segIDs: any;
}
export interface GetFlushStateResponse extends resStatusResponse {
    flushed: boolean;
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
    is_sorted: boolean;
    storage_version: number;
}
export interface GetQuerySegmentInfoResponse extends resStatusResponse {
    infos: QuerySegmentInfo[];
}
export interface PersistentSegmentInfo {
    segmentID: number;
    collectionID: number;
    partitionID: number;
    num_rows: number;
    state: SegmentState;
    level: SegmentLevel;
    is_sorted: boolean;
    storage_version: number;
}
export interface GePersistentSegmentInfoResponse extends resStatusResponse {
    infos: PersistentSegmentInfo[];
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
export interface FlushAllReq extends GrpcTimeOut {
    db_name?: string;
}
export interface FlushClusterInfo {
    cluster_id: string;
    cchannel: string;
    pchannels: string[];
}
export interface FlushAllResponse extends resStatusResponse {
    flush_all_ts: number;
    flush_all_tss: Record<string, number>;
    flush_all_msgs: Record<string, any>;
    cluster_info: FlushClusterInfo;
}
export interface GetFlushAllStateReq extends GrpcTimeOut {
    flush_all_ts?: number;
    db_name?: string;
    flush_all_tss?: Record<string, number>;
}
export interface GetFlushAllStateResponse extends resStatusResponse {
    flushed: boolean;
}
export interface GetQuerySegmentInfoReq extends GrpcTimeOut {
    collectionName: string;
    dbName?: string;
}
export interface GePersistentSegmentInfoReq extends GrpcTimeOut {
    collectionName: string;
    dbName?: string;
}
export interface LoadBalanceReq extends GrpcTimeOut {
    src_nodeID: number;
    dst_nodeIDs?: number[];
    sealed_segmentIDs?: number[];
    collectionName?: string;
    db_name?: string;
}
