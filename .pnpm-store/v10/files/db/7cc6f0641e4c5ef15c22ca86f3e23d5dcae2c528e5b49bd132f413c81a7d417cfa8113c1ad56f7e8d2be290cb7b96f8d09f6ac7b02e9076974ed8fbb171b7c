export * from './generative.js';
export * from './reranker.js';
export * from './vectorIndex.js';
export * from './vectorizer.js';
import { InvertedIndexConfigUpdate, MultiTenancyConfigUpdate, ReplicationConfigUpdate, VectorConfigUpdate } from '../../configure/types/index.js';
import { GenerativeConfig, GenerativeSearch } from './generative.js';
import { Reranker, RerankerConfig } from './reranker.js';
import { VectorIndexType } from './vectorIndex.js';
import { VectorConfig } from './vectorizer.js';
export type ModuleConfig<N, C = undefined> = {
    name: N;
    config: C;
};
export type InvertedIndexConfig = {
    bm25: {
        k1: number;
        b: number;
    };
    cleanupIntervalSeconds: number;
    indexTimestamps: boolean;
    indexPropertyLength: boolean;
    indexNullState: boolean;
    stopwords: {
        preset: string;
        additions: string[];
        removals: string[];
    };
};
export type MultiTenancyConfig = {
    autoTenantActivation: boolean;
    autoTenantCreation: boolean;
    enabled: boolean;
};
export type ReplicationDeletionStrategy = 'DeleteOnConflict' | 'NoAutomatedResolution' | 'TimeBasedResolution';
export type ReplicationConfig = {
    asyncEnabled: boolean;
    deletionStrategy: ReplicationDeletionStrategy;
    factor: number;
};
export type PropertyVectorizerConfig = Record<string, {
    skip: boolean;
    vectorizePropertyName: boolean;
}>;
export type PropertyConfig = {
    name: string;
    dataType: string;
    description?: string;
    indexInverted: boolean;
    indexFilterable: boolean;
    indexRangeFilters: boolean;
    indexSearchable: boolean;
    nestedProperties?: PropertyConfig[];
    tokenization: string;
    vectorizerConfig?: PropertyVectorizerConfig;
};
export type ReferenceConfig = {
    name: string;
    description?: string;
    targetCollections: string[];
};
export type ShardingConfig = {
    virtualPerPhysical: number;
    desiredCount: number;
    actualCount: number;
    desiredVirtualCount: number;
    actualVirtualCount: number;
    key: '_id';
    strategy: 'hash';
    function: 'murmur3';
};
export type CollectionConfig = {
    name: string;
    description?: string;
    generative?: ModuleConfig<GenerativeSearch, GenerativeConfig>;
    invertedIndex: InvertedIndexConfig;
    multiTenancy: MultiTenancyConfig;
    properties: PropertyConfig[];
    references: ReferenceConfig[];
    replication: ReplicationConfig;
    reranker?: ModuleConfig<Reranker, RerankerConfig>;
    sharding: ShardingConfig;
    vectorizers: VectorConfig;
};
export type PropertyDescriptionsUpdate<T> = T extends undefined ? Record<string, string> : {
    [Property in keyof T]: string;
};
export type CollectionConfigUpdate<T> = {
    description?: string;
    propertyDescriptions?: PropertyDescriptionsUpdate<T>;
    generative?: ModuleConfig<GenerativeSearch, GenerativeConfig>;
    invertedIndex?: InvertedIndexConfigUpdate;
    multiTenancy?: MultiTenancyConfigUpdate;
    replication?: ReplicationConfigUpdate;
    reranker?: ModuleConfig<Reranker, RerankerConfig>;
    vectorizers?: VectorConfigUpdate<undefined, VectorIndexType> | VectorConfigUpdate<string, VectorIndexType>[];
};
