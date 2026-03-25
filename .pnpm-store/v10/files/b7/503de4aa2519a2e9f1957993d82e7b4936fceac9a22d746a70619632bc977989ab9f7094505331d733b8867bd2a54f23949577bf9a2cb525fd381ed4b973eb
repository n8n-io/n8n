import Connection from '../../connection/grpc.js';
import { ConsistencyLevel } from '../../index.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { GenerativeConfigRuntime } from '../index.js';
import { BaseHybridOptions, BaseNearOptions, NearVectorInputType } from './types.js';
export declare class Check<T, V> {
    private connection;
    private name;
    dbVersionSupport: DbVersionSupport;
    private consistencyLevel?;
    private tenant?;
    constructor(connection: Connection, name: string, dbVersionSupport: DbVersionSupport, consistencyLevel?: ConsistencyLevel, tenant?: string);
    private getSearcher;
    private checkSupportForVectors;
    supportForSingleGroupedGenerative: () => Promise<true>;
    supportForGenerativeConfigRuntime: (generativeConfig?: GenerativeConfigRuntime) => Promise<true>;
    nearSearch: () => Promise<{
        search: import("../../grpc/searcher.js").Search;
    }>;
    nearVector: (vec: NearVectorInputType, opts?: BaseNearOptions<any, any, any>) => Promise<{
        search: import("../../grpc/searcher.js").Search;
        supportsVectors: boolean;
    }>;
    hybridSearch: (opts?: BaseHybridOptions<any, any, any>) => Promise<{
        search: import("../../grpc/searcher.js").Search;
        supportsVectors: boolean;
    }>;
    fetchObjects: () => Promise<{
        search: import("../../grpc/searcher.js").Search;
    }>;
    fetchObjectById: () => Promise<{
        search: import("../../grpc/searcher.js").Search;
    }>;
    bm25: () => Promise<{
        search: import("../../grpc/searcher.js").Search;
    }>;
}
