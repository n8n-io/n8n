import { BQConfig, ModuleConfig, MultiVectorConfig, MuveraEncodingConfig, PQConfig, PQEncoderDistribution, PQEncoderType, RQConfig, SQConfig, UncompressedConfig, VectorDistance, VectorIndexConfigDynamic, VectorIndexConfigFlat, VectorIndexConfigHNSW, VectorIndexFilterStrategy } from '../../config/types/index.js';
import { RecursivePartial } from './base.js';
export type QuantizerRecursivePartial<T> = {
    [P in keyof T]: P extends 'type' ? T[P] : RecursivePartial<T[P]> | undefined;
};
export type RQConfigCreate = QuantizerRecursivePartial<RQConfig>;
export type RQConfigUpdate = {
    bit?: number;
    rescoreLimit?: number;
    type: 'rq';
};
export type PQConfigCreate = QuantizerRecursivePartial<PQConfig>;
export type PQConfigUpdate = {
    centroids?: number;
    enabled?: boolean;
    segments?: number;
    trainingLimit?: number;
    encoder?: {
        type?: PQEncoderType;
        distribution?: PQEncoderDistribution;
    };
    type: 'pq';
};
export type BQConfigCreate = QuantizerRecursivePartial<BQConfig>;
export type BQConfigUpdate = {
    rescoreLimit?: number;
    type: 'bq';
};
export type SQConfigCreate = QuantizerRecursivePartial<SQConfig>;
export type SQConfigUpdate = {
    rescoreLimit?: number;
    trainingLimit?: number;
    type: 'sq';
};
export type UncompressedConfigCreate = QuantizerRecursivePartial<UncompressedConfig>;
export type QuantizerConfigCreate = PQConfigCreate | BQConfigCreate | SQConfigCreate | RQConfigCreate | UncompressedConfigCreate | Record<string, any>;
export type QuantizerConfigUpdate = PQConfigUpdate | BQConfigUpdate | SQConfigUpdate | RQConfigUpdate | Record<string, any>;
export type MultiVectorConfigCreate = {
    aggregation?: MultiVectorConfig['aggregation'];
    encoding?: MultiVectorEncodingConfigCreate;
};
export type MuveraEncodingConfigCreate = RecursivePartial<MuveraEncodingConfig>;
export type MultiVectorEncodingConfigCreate = MuveraEncodingConfigCreate;
export type VectorIndexConfigHNSWCreate = RecursivePartial<Omit<VectorIndexConfigHNSW, 'quantizer'>> & {
    quantizer?: QuantizerConfigCreate;
};
export type VectorIndexConfigDynamicCreate = RecursivePartial<Omit<VectorIndexConfigDynamic, 'hnsw' | 'flat'>> & {
    hnsw?: VectorIndexConfigHNSWCreate;
    flat?: VectorIndexConfigFlatCreate;
};
export type VectorIndexConfigDymamicUpdate = RecursivePartial<Omit<VectorIndexConfigDynamic, 'hnsw' | 'flat'>> & {
    hnsw?: VectorIndexConfigHNSWUpdate;
    flat?: VectorIndexConfigFlatUpdate;
};
export type VectorIndexConfigHNSWUpdate = {
    dynamicEfMin?: number;
    dynamicEfMax?: number;
    dynamicEfFactor?: number;
    ef?: number;
    filterStrategy?: VectorIndexFilterStrategy;
    flatSearchCutoff?: number;
    quantizer?: QuantizerConfigUpdate;
    vectorCacheMaxObjects?: number;
};
export type VectorIndexConfigCreateType<I> = I extends 'hnsw' ? VectorIndexConfigHNSWCreate | undefined : I extends 'flat' ? VectorIndexConfigFlatCreate | undefined : I extends 'dynamic' ? VectorIndexConfigDynamicCreate | undefined : I extends string ? Record<string, any> : never;
export type VectorIndexConfigFlatCreate = RecursivePartial<Omit<VectorIndexConfigFlat, 'quantizer'>> & {
    quantizer?: QuantizerConfigCreate;
};
export type VectorIndexConfigFlatUpdate = {
    quantizer?: BQConfigUpdate;
    vectorCacheMaxObjects?: number;
};
export type VectorIndexConfigCreate = VectorIndexConfigFlatCreate | VectorIndexConfigHNSWCreate | VectorIndexConfigDynamicCreate | Record<string, any> | undefined;
export type VectorIndexConfigUpdate = VectorIndexConfigFlatUpdate | VectorIndexConfigHNSWUpdate | VectorIndexConfigDymamicUpdate | Record<string, any> | undefined;
export type VectorIndexConfigUpdateType<I> = I extends 'hnsw' ? VectorIndexConfigHNSWUpdate : I extends 'flat' ? VectorIndexConfigFlatUpdate : I extends 'dynamic' ? VectorIndexConfigDymamicUpdate : I extends string ? Record<string, any> : never;
export type LegacyVectorizerConfigUpdate = ModuleConfig<'flat', VectorIndexConfigFlatUpdate> | ModuleConfig<'hnsw', VectorIndexConfigHNSWUpdate> | ModuleConfig<string, Record<string, any>>;
export type VectorIndexConfigHNSWCreateOptions = {
    /** The interval in seconds at which to clean up the index. Default is 300. */
    cleanupIntervalSeconds?: number;
    /** The distance metric to use. Default is 'cosine'. */
    distanceMetric?: VectorDistance;
    /** The dynamic ef factor. Default is 8. */
    dynamicEfFactor?: number;
    /** The dynamic ef max. Default is 500. */
    dynamicEfMax?: number;
    /** The dynamic ef min. Default is 100. */
    dynamicEfMin?: number;
    /** The ef parameter. Default is -1. */
    ef?: number;
    /** The ef construction parameter. Default is 128. */
    efConstruction?: number;
    /** The flat search cutoff. Default is 40000. */
    flatSearchCutoff?: number;
    /** The filter strategy to use. Default is 'sweeping'. */
    filterStrategy?: VectorIndexFilterStrategy;
    /** The maximum number of connections. Default is 64. */
    maxConnections?: number;
    /** The multi-vector configuration to use. Use `vectorIndex.multiVector` to make one. */
    multiVector?: MultiVectorConfigCreate;
    /** The quantizer configuration to use. Use `vectorIndex.quantizer.bq` or `vectorIndex.quantizer.pq` to make one. */
    quantizer?: QuantizerConfigCreate;
    /** Whether to skip the index. Default is false. */
    skip?: boolean;
    /** The maximum number of objects to cache in the vector cache. Default is 1000000000000. */
    vectorCacheMaxObjects?: number;
};
export type VectorIndexConfigFlatCreateOptions = {
    /** The distance metric to use. Default is 'cosine'. */
    distanceMetric?: VectorDistance;
    /** The maximum number of objects to cache in the vector cache. Default is 1000000000000. */
    vectorCacheMaxObjects?: number;
    /** The quantizer configuration to use. Default is `bq`. */
    quantizer?: QuantizerConfigCreate;
};
export type VectorIndexConfigDynamicCreateOptions = {
    /** The distance metric to use. Default is 'cosine'. */
    distanceMetric?: VectorDistance;
    /** The threshold at which to . Default is 0. */
    threshold?: number;
    /** The HNSW configuration of the dynamic index. Use `configure.vectorIndex.hnsw` to make one or supply the type directly. */
    hnsw?: ModuleConfig<'hnsw', VectorIndexConfigHNSWCreate | undefined> | VectorIndexConfigHNSWCreateOptions;
    /** The flat configuration of the dynamic index. Use `configure.vectorIndex.flat` to make one or supply the type directly. */
    flat?: ModuleConfig<'flat', VectorIndexConfigFlatCreate | undefined> | VectorIndexConfigFlatCreateOptions;
};
