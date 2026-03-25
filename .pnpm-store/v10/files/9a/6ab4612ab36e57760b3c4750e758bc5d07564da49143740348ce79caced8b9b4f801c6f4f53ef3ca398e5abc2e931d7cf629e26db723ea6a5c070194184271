import { CreateIndexRequest, IndexModel, ManageIndexesApi, ServerlessSpecCloudEnum, PodSpecMetadataConfig } from '../pinecone-generated-ts-fetch/db_control';
/**
 * @see [Understanding indexes](https://docs.pinecone.io/docs/indexes)
 */
export interface CreateIndexOptions extends Omit<CreateIndexRequest, 'spec'> {
    /** This option specifies how the index should be deployed. */
    spec: CreateIndexSpec;
    /** This option tells the client not to resolve the returned promise until the index is ready to receive data. */
    waitUntilReady?: boolean;
    /** This option tells the client not to throw if you attempt to create an index that already exists. */
    suppressConflicts?: boolean;
}
/**
 * The spec object defines how the index should be deployed.
 *
 * For serverless indexes, you define only the [cloud and region](http://docs.pinecone.io/guides/indexes/understanding-indexes#cloud-regions) where the index should be hosted.
 * For pod-based indexes, you define the [environment](http://docs.pinecone.io/guides/indexes/understanding-indexes#pod-environments) where the index should be hosted,
 * the [pod type and size](http://docs.pinecone.io/guides/indexes/understanding-indexes#pod-types) to use, and other index characteristics.
 */
export interface CreateIndexSpec {
    /** The serverless object allows you to configure a serverless index. */
    serverless?: CreateIndexServerlessSpec;
    /** The pod object allows you to configure a pods-based index. */
    pod?: CreateIndexPodSpec;
}
/**
 * Configuration needed to deploy a serverless index.
 *
 * @see [Understanding Serverless indexes](https://docs.pinecone.io/guides/indexes/understanding-indexes#serverless-indexes)
 */
export interface CreateIndexServerlessSpec {
    /** The public cloud where you would like your index hosted. */
    cloud: ServerlessSpecCloudEnum;
    /** The region where you would like your index to be created. */
    region: string;
}
/**
 * Configuration needed to deploy a serverless index.
 *
 * @see [Understanding Pod-based indexes](https://docs.pinecone.io/guides/indexes/understanding-indexes#pod-based-indexes)
 */
export interface CreateIndexPodSpec {
    /** The environment where the index is hosted. */
    environment: string;
    /** The number of replicas. Replicas duplicate your index. They provide higher availability and throughput. Replicas can be scaled up or down as your needs change. */
    replicas?: number;
    /** The number of shards. Shards split your data across multiple pods so you can fit more data into an index. */
    shards?: number;
    /** The type of pod to use. One of `s1`, `p1`, or `p2` appended with `.` and one of `x1`, `x2`, `x4`, or `x8`. */
    podType: string;
    /** The number of pods to be used in the index. This should be equal to `shards` x `replicas`.' */
    pods?: number;
    /**
     * Configuration for the behavior of Pinecone's internal metadata index. By default, all metadata is indexed;
     * when `metadataConfig` is present, only specified metadata fields are indexed. These configurations are only valid
     * for use with pod-based indexes.
     */
    metadataConfig?: PodSpecMetadataConfig;
    /** The name of the collection to be used as the source for the index. */
    sourceCollection?: string;
}
export declare const createIndex: (api: ManageIndexesApi) => (options: CreateIndexOptions) => Promise<IndexModel | void>;
export declare const waitUntilIndexIsReady: (api: ManageIndexesApi, indexName: string, seconds?: number) => Promise<IndexModel>;
