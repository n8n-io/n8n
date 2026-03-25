import { WeaviateClass, WeaviateInvertedIndexConfig, WeaviateModuleConfig, WeaviateMultiTenancyConfig, WeaviateReplicationConfig, WeaviateVectorIndexConfig, WeaviateVectorsConfig } from '../../openapi/types.js';
import { InvertedIndexConfigUpdate, MultiTenancyConfigUpdate, ReplicationConfigUpdate, VectorConfigUpdate, VectorIndexConfigFlatUpdate, VectorIndexConfigHNSWUpdate } from '../configure/types/index.js';
import { CollectionConfigUpdate, GenerativeConfig, GenerativeSearch, ModuleConfig, PropertyDescriptionsUpdate, Reranker, RerankerConfig, VectorIndexType } from './types/index.js';
export declare class MergeWithExisting {
    static schema(current: WeaviateClass, update?: CollectionConfigUpdate<any>): WeaviateClass;
    static properties(current: WeaviateClass['properties'], update: PropertyDescriptionsUpdate<any>): WeaviateClass['properties'];
    static generative(current: WeaviateModuleConfig, update: ModuleConfig<GenerativeSearch, GenerativeConfig>): WeaviateModuleConfig;
    static reranker(current: WeaviateModuleConfig, update: ModuleConfig<Reranker, RerankerConfig>): WeaviateModuleConfig;
    static invertedIndex(current: WeaviateInvertedIndexConfig, update: InvertedIndexConfigUpdate): WeaviateInvertedIndexConfig;
    static multiTenancy(current: WeaviateMultiTenancyConfig, update: MultiTenancyConfigUpdate): MultiTenancyConfigUpdate;
    static replication(current: WeaviateReplicationConfig, update: ReplicationConfigUpdate): WeaviateReplicationConfig;
    static vectors(current: WeaviateVectorsConfig, update: VectorConfigUpdate<string, VectorIndexType>[]): WeaviateVectorsConfig;
    static flat(current: WeaviateVectorIndexConfig, update: VectorIndexConfigFlatUpdate): WeaviateVectorIndexConfig;
    static hnsw(current: WeaviateVectorIndexConfig, update: VectorIndexConfigHNSWUpdate): WeaviateVectorIndexConfig;
}
