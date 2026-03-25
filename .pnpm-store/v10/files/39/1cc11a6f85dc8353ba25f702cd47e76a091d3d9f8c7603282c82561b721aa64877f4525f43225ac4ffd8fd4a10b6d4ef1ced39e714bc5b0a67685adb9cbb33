import { ConsistencyLevel } from '../data/index.js';
import { Metadata } from 'nice-grpc';
import { AggregateReply, AggregateRequest_Aggregation, AggregateRequest_GroupBy } from '../proto/v1/aggregate.js';
import { Filters } from '../proto/v1/base.js';
import { Hybrid, NearAudioSearch, NearDepthSearch, NearIMUSearch, NearImageSearch, NearObject, NearTextSearch, NearThermalSearch, NearVector, NearVideoSearch } from '../proto/v1/base_search.js';
import { WeaviateClient } from '../proto/v1/weaviate.js';
import { RetryOptions } from 'nice-grpc-client-middleware-retry';
import Base from './base.js';
export type BaseAggregateArgs = {
    aggregations?: AggregateRequest_Aggregation[];
    filters?: Filters;
    groupBy?: AggregateRequest_GroupBy;
    limit?: number;
    objectLimit?: number;
};
export type AggregateFetchArgs = BaseAggregateArgs;
export type AggregateHybridArgs = BaseAggregateArgs & {
    hybrid: Hybrid;
};
export type AggregateNearAudioArgs = BaseAggregateArgs & {
    nearAudio: NearAudioSearch;
};
export type AggregateNearDepthArgs = BaseAggregateArgs & {
    nearDepth: NearDepthSearch;
};
export type AggregateNearImageArgs = BaseAggregateArgs & {
    nearImage: NearImageSearch;
};
export type AggregateNearIMUArgs = BaseAggregateArgs & {
    nearIMU: NearIMUSearch;
};
export type AggregateNearObjectArgs = BaseAggregateArgs & {
    nearObject: NearObject;
};
export type AggregateNearTextArgs = BaseAggregateArgs & {
    nearText: NearTextSearch;
};
export type AggregateNearThermalArgs = BaseAggregateArgs & {
    nearThermal: NearThermalSearch;
};
export type AggregateNearVectorArgs = BaseAggregateArgs & {
    nearVector: NearVector;
};
export type AggregateNearVideoArgs = BaseAggregateArgs & {
    nearVideo: NearVideoSearch;
};
export interface Aggregate {
    withFetch: (args: AggregateFetchArgs) => Promise<AggregateReply>;
    withHybrid: (args: AggregateHybridArgs) => Promise<AggregateReply>;
    withNearAudio: (args: AggregateNearAudioArgs) => Promise<AggregateReply>;
    withNearDepth: (args: AggregateNearDepthArgs) => Promise<AggregateReply>;
    withNearImage: (args: AggregateNearImageArgs) => Promise<AggregateReply>;
    withNearIMU: (args: AggregateNearIMUArgs) => Promise<AggregateReply>;
    withNearObject: (args: AggregateNearObjectArgs) => Promise<AggregateReply>;
    withNearText: (args: AggregateNearTextArgs) => Promise<AggregateReply>;
    withNearThermal: (args: AggregateNearThermalArgs) => Promise<AggregateReply>;
    withNearVector: (args: AggregateNearVectorArgs) => Promise<AggregateReply>;
    withNearVideo: (args: AggregateNearVideoArgs) => Promise<AggregateReply>;
}
export default class Aggregator extends Base implements Aggregate {
    static use(connection: WeaviateClient<RetryOptions>, collection: string, metadata: Metadata, timeout: number, consistencyLevel?: ConsistencyLevel, tenant?: string): Aggregate;
    withFetch: (args: AggregateFetchArgs) => Promise<AggregateReply>;
    withHybrid: (args: AggregateHybridArgs) => Promise<AggregateReply>;
    withNearAudio: (args: AggregateNearAudioArgs) => Promise<AggregateReply>;
    withNearDepth: (args: AggregateNearDepthArgs) => Promise<AggregateReply>;
    withNearImage: (args: AggregateNearImageArgs) => Promise<AggregateReply>;
    withNearIMU: (args: AggregateNearIMUArgs) => Promise<AggregateReply>;
    withNearObject: (args: AggregateNearObjectArgs) => Promise<AggregateReply>;
    withNearText: (args: AggregateNearTextArgs) => Promise<AggregateReply>;
    withNearThermal: (args: AggregateNearThermalArgs) => Promise<AggregateReply>;
    withNearVector: (args: AggregateNearVectorArgs) => Promise<AggregateReply>;
    withNearVideo: (args: AggregateNearVideoArgs) => Promise<AggregateReply>;
    private call;
}
