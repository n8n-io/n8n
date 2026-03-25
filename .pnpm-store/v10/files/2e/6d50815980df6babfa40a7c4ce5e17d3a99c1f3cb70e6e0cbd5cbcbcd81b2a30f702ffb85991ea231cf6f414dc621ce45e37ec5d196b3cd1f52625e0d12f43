import ConnectionGQL from './gql.js';
import { InternalConnectionParams } from './http.js';
import { ConsistencyLevel } from '../data/index.js';
import { Batch } from '../grpc/batcher.js';
import { Search } from '../grpc/searcher.js';
import { Tenants } from '../grpc/tenantsManager.js';
import { DbVersionSupport } from '../utils/dbVersion.js';
import { Aggregate } from '../grpc/aggregator.js';
export interface GrpcConnectionParams extends InternalConnectionParams {
    grpcAddress: string;
    grpcSecure: boolean;
}
export default class ConnectionGRPC extends ConnectionGQL {
    private grpc;
    private constructor();
    static use: (params: GrpcConnectionParams) => Promise<{
        connection: ConnectionGRPC;
        dbVersionProvider: import("../utils/dbVersion.js").DbVersionProvider;
        dbVersionSupport: DbVersionSupport;
    }> | {
        connection: ConnectionGRPC;
        dbVersionProvider: import("../utils/dbVersion.js").DbVersionProvider;
        dbVersionSupport: DbVersionSupport;
    };
    private static connect;
    batch: (collection: string, consistencyLevel?: ConsistencyLevel, tenant?: string) => Promise<Batch>;
    aggregate: (collection: string, consistencyLevel?: ConsistencyLevel, tenant?: string) => Promise<Aggregate>;
    search: (collection: string, consistencyLevel?: ConsistencyLevel, tenant?: string) => Promise<Search>;
    tenants: (collection: string) => Promise<Tenants>;
    close: () => void;
}
export interface GrpcClient {
    aggregate: (collection: string, consistencyLevel?: ConsistencyLevel, tenant?: string, bearerToken?: string) => Aggregate;
    batch: (collection: string, consistencyLevel?: ConsistencyLevel, tenant?: string, bearerToken?: string) => Batch;
    close: () => void;
    health: () => Promise<boolean>;
    search: (collection: string, consistencyLevel?: ConsistencyLevel, tenant?: string, bearerToken?: string) => Search;
    tenants: (collection: string, bearerToken?: string) => Tenants;
}
export declare const grpcClient: (config: GrpcConnectionParams & {
    grpcMaxMessageLength: number;
}) => GrpcClient;
