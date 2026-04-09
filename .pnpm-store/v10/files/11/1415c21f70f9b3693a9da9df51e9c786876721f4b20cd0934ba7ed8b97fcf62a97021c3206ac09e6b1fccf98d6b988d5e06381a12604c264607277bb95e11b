import { CollectionPrivileges, UserPrivileges, GlobalPrivileges, MsgType } from '../';
export interface MsgBase {
    base: {
        msg_type: MsgType;
    };
}
export interface KeyValuePair<T = string, U = string | number> {
    key: T;
    value: U;
}
interface NumberArray {
    data: Number[];
}
interface StringArray {
    data: String[];
}
export interface NumberArrayId {
    int_id: NumberArray;
}
export interface StringArrayId {
    str_id: StringArray;
}
export interface GrpcTimeOut {
    timeout?: number;
    client_request_id?: string;
    'client-request-id'?: string;
}
export type PrivilegesTypes = CollectionPrivileges | UserPrivileges | GlobalPrivileges | string;
export interface ResStatus {
    extra_info: Record<string, any>;
    error_code: string | number;
    reason: string;
    code?: number;
    retriable: boolean;
    detail: string;
}
export interface resStatusResponse {
    status: ResStatus;
}
export interface TimeStamp {
    created_timestamp: string;
    created_utc_timestamp: string;
}
export interface TimeStampArray {
    created_timestamps: string[];
    created_utc_timestamps: string[];
}
export type keyValueObj = Record<string, string | number | string[] | number[] | boolean | unknown>;
export interface collectionNameReq extends GrpcTimeOut {
    collection_name: string;
    db_name?: string;
}
export interface partitionNameReq extends collectionNameReq {
    partition_name?: string;
}
export {};
