import { ConsistencyLevel } from '../data/index.js';
import { Metadata } from 'nice-grpc';
import { RetryOptions } from 'nice-grpc-client-middleware-retry';
import { ConsistencyLevel as ConsistencyLevelGRPC } from '../proto/v1/base.js';
import { WeaviateClient } from '../proto/v1/weaviate.js';
export default class Base {
    protected connection: WeaviateClient<RetryOptions>;
    protected collection: string;
    protected timeout: number;
    protected consistencyLevel?: ConsistencyLevelGRPC;
    protected tenant?: string;
    protected metadata?: Metadata;
    protected constructor(connection: WeaviateClient<RetryOptions>, collection: string, metadata: Metadata, timeout: number, consistencyLevel?: ConsistencyLevel, tenant?: string);
    private mapConsistencyLevel;
    protected sendWithTimeout: <T>(send: (signal: AbortSignal) => Promise<T>) => Promise<T>;
}
