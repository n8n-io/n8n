import { ConsistencyLevel } from '../data/index.js';
import { Metadata } from 'nice-grpc';
import { Filters } from '../proto/v1/base.js';
import { BM25, Hybrid, NearAudioSearch, NearDepthSearch, NearIMUSearch, NearImageSearch, NearObject, NearTextSearch, NearThermalSearch, NearVector, NearVideoSearch } from '../proto/v1/base_search.js';
import { GroupBy, MetadataRequest, PropertiesRequest, Rerank, SearchReply, SortBy } from '../proto/v1/search_get.js';
import { WeaviateClient } from '../proto/v1/weaviate.js';
import { RetryOptions } from 'nice-grpc-client-middleware-retry';
import { NearMediaType } from '../index.js';
import { GenerativeSearch } from '../proto/v1/generative.js';
import Base from './base.js';
export type SearchFetchArgs = {
    limit?: number;
    offset?: number;
    after?: string;
    filters?: Filters;
    sortBy?: SortBy[];
    metadata?: MetadataRequest;
    properties?: PropertiesRequest;
    generative?: GenerativeSearch;
    groupBy?: GroupBy;
};
export type BaseSearchArgs = {
    limit?: number;
    offset?: number;
    autocut?: number;
    filters?: Filters;
    rerank?: Rerank;
    metadata?: MetadataRequest;
    properties?: PropertiesRequest;
    generative?: GenerativeSearch;
    groupBy?: GroupBy;
};
export type SearchBm25Args = BaseSearchArgs & {
    bm25Search: BM25;
};
export type SearchHybridArgs = BaseSearchArgs & {
    hybridSearch: Hybrid;
};
export type SearchNearAudioArgs = BaseSearchArgs & {
    nearAudio: NearAudioSearch;
};
export type SearchNearDepthArgs = BaseSearchArgs & {
    nearDepth: NearDepthSearch;
};
export type SearchNearImageArgs = BaseSearchArgs & {
    nearImage: NearImageSearch;
};
export type SearchNearIMUArgs = BaseSearchArgs & {
    nearIMU: NearIMUSearch;
};
export type SearchNearObjectArgs = BaseSearchArgs & {
    nearObject: NearObject;
};
export type SearchNearTextArgs = BaseSearchArgs & {
    nearText: NearTextSearch;
};
export type SearchNearThermalArgs = BaseSearchArgs & {
    nearThermal: NearThermalSearch;
};
export type SearchNearVectorArgs = BaseSearchArgs & {
    nearVector: NearVector;
};
export type SearchNearVideoArgs = BaseSearchArgs & {
    nearVideo: NearVideoSearch;
};
export type SearchNearMediaArgs<T extends NearMediaType> = T extends 'audio' ? SearchNearAudioArgs : T extends 'depth' ? SearchNearDepthArgs : T extends 'image' ? SearchNearImageArgs : T extends 'imu' ? SearchNearIMUArgs : T extends 'thermal' ? SearchNearThermalArgs : T extends 'video' ? SearchNearVideoArgs : never;
export interface Search {
    withFetch: (args: SearchFetchArgs) => Promise<SearchReply>;
    withBm25: (args: SearchBm25Args) => Promise<SearchReply>;
    withHybrid: (args: SearchHybridArgs) => Promise<SearchReply>;
    withNearAudio: (args: SearchNearAudioArgs) => Promise<SearchReply>;
    withNearDepth: (args: SearchNearDepthArgs) => Promise<SearchReply>;
    withNearImage: (args: SearchNearImageArgs) => Promise<SearchReply>;
    withNearIMU: (args: SearchNearIMUArgs) => Promise<SearchReply>;
    withNearObject: (args: SearchNearObjectArgs) => Promise<SearchReply>;
    withNearText: (args: SearchNearTextArgs) => Promise<SearchReply>;
    withNearThermal: (args: SearchNearThermalArgs) => Promise<SearchReply>;
    withNearVector: (args: SearchNearVectorArgs) => Promise<SearchReply>;
    withNearVideo: (args: SearchNearVideoArgs) => Promise<SearchReply>;
}
export default class Searcher extends Base implements Search {
    static use(connection: WeaviateClient<RetryOptions>, collection: string, metadata: Metadata, timeout: number, consistencyLevel?: ConsistencyLevel, tenant?: string): Search;
    withFetch: (args: SearchFetchArgs) => Promise<SearchReply>;
    withBm25: (args: SearchBm25Args) => Promise<SearchReply>;
    withHybrid: (args: SearchHybridArgs) => Promise<SearchReply>;
    withNearAudio: (args: SearchNearAudioArgs) => Promise<SearchReply>;
    withNearDepth: (args: SearchNearDepthArgs) => Promise<SearchReply>;
    withNearImage: (args: SearchNearImageArgs) => Promise<SearchReply>;
    withNearIMU: (args: SearchNearIMUArgs) => Promise<SearchReply>;
    withNearObject: (args: SearchNearObjectArgs) => Promise<SearchReply>;
    withNearText: (args: SearchNearTextArgs) => Promise<SearchReply>;
    withNearThermal: (args: SearchNearThermalArgs) => Promise<SearchReply>;
    withNearVector: (args: SearchNearVectorArgs) => Promise<SearchReply>;
    withNearVideo: (args: SearchNearVideoArgs) => Promise<SearchReply>;
    private call;
}
