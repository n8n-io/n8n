export type VectorIndexConfigHNSW = {
    cleanupIntervalSeconds: number;
    distance: VectorDistance;
    dynamicEfMin: number;
    dynamicEfMax: number;
    dynamicEfFactor: number;
    efConstruction: number;
    ef: number;
    filterStrategy: VectorIndexFilterStrategy;
    flatSearchCutoff: number;
    maxConnections: number;
    multiVector: MultiVectorConfig | undefined;
    quantizer: QuantizerConfig | undefined;
    skip: boolean;
    vectorCacheMaxObjects: number;
    type: 'hnsw';
};
export type VectorIndexConfigFlat = {
    distance: VectorDistance;
    vectorCacheMaxObjects: number;
    quantizer: QuantizerConfig | undefined;
    type: 'flat';
};
export type VectorIndexConfigDynamic = {
    distance: VectorDistance;
    threshold: number;
    hnsw: VectorIndexConfigHNSW;
    flat: VectorIndexConfigFlat;
    type: 'dynamic';
};
export type VectorIndexConfigType<I> = I extends 'hnsw' ? VectorIndexConfigHNSW : I extends 'flat' ? VectorIndexConfigFlat : I extends 'dynamic' ? VectorIndexConfigDynamic : I extends string ? Record<string, any> : never;
export type BQConfig = {
    cache: boolean;
    rescoreLimit: number;
    type: 'bq';
};
export type SQConfig = {
    rescoreLimit: number;
    trainingLimit: number;
    type: 'sq';
};
export type PQConfig = {
    bitCompression: boolean;
    centroids: number;
    encoder: PQEncoderConfig;
    segments: number;
    trainingLimit: number;
    type: 'pq';
};
export type RQConfig = {
    bits?: number;
    rescoreLimit?: number;
    type: 'rq';
};
export type UncompressedConfig = {
    type: 'none';
};
export type MultiVectorConfig = {
    aggregation: 'maxSim' | string;
    encoding?: MultiVectorEncodingConfig;
};
export type MuveraEncodingConfig = {
    ksim?: number;
    dprojections?: number;
    repetitions?: number;
    type: 'muvera';
};
export type MultiVectorEncodingConfig = MuveraEncodingConfig | Record<string, any>;
export type PQEncoderConfig = {
    type: PQEncoderType;
    distribution: PQEncoderDistribution;
};
export type VectorDistance = 'cosine' | 'dot' | 'l2-squared' | 'hamming';
export type PQEncoderType = 'kmeans' | 'tile';
export type PQEncoderDistribution = 'log-normal' | 'normal';
export type VectorIndexType = 'hnsw' | 'flat' | 'dynamic' | string;
export type VectorIndexFilterStrategy = 'sweeping' | 'acorn';
export type VectorIndexConfig = VectorIndexConfigHNSW | VectorIndexConfigFlat | VectorIndexConfigDynamic;
export type QuantizerConfig = PQConfig | BQConfig | SQConfig | RQConfig;
