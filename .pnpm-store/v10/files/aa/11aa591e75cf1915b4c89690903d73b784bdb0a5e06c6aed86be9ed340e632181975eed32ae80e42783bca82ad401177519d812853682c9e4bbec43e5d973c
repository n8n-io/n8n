import { GrpcTimeOut, resStatusResponse, KeyValuePair } from './Common';
import { Properties } from './';
export interface databaseReq extends GrpcTimeOut {
    db_name: string;
}
export interface CreateDatabaseRequest extends databaseReq {
    properties?: Properties;
}
export interface DropDatabasesRequest extends databaseReq {
}
export interface DescribeDatabaseRequest extends databaseReq {
}
export interface ListDatabasesRequest extends GrpcTimeOut {
}
export interface ListDatabasesResponse extends resStatusResponse {
    db_names: string[];
}
export interface DescribeDatabaseResponse extends resStatusResponse {
    db_name: string;
    dbID: number;
    created_timestamp: number;
    properties: KeyValuePair[];
}
export interface AlterDatabaseRequest extends GrpcTimeOut {
    db_name: string;
    db_id?: string;
    properties: Properties;
    delete_keys?: string[];
}
export interface DropDatabasePropertiesRequest extends GrpcTimeOut {
    db_name: string;
    properties: string[];
}
export interface AlterDatabaseResponse extends resStatusResponse {
}
