import type { FetchAPI, HTTPHeaders } from '../../pinecone-generated-ts-fetch/db_data';
/**
 * @see [Understanding projects](https://docs.pinecone.io/docs/projects)
 */
export type PineconeConfiguration = {
    /**
     * The API key for your Pinecone project. You can find this in the [Pinecone console](https://app.pinecone.io).
     */
    apiKey: string;
    /**
     * Optional configuration field for specifying the controller host. If not specified, the client will use the default controller host: https://api.pinecone.io.
     */
    controllerHostUrl?: string;
    /**
     * Optional configuration field for specifying the fetch implementation. If not specified, the client will look for fetch in the global scope.
     */
    fetchApi?: FetchAPI;
    /**
     * Optional headers to be included in all requests.
     */
    additionalHeaders?: HTTPHeaders;
    /**
     * Optional sourceTag that is applied to the User-Agent header with all requests.
     */
    sourceTag?: string;
    /**
     * Optional configuration field for specifying the maximum number of retries for a request. Defaults to 3.
     */
    maxRetries?: number;
    /**
     * Optional configuration field for specifying a region to use with the assistant APIs. If not specified, the default
     * region of "us" is used.
     */
    assistantRegion?: string;
};
type PineconeConfigurationType = keyof PineconeConfiguration;
export declare const PineconeConfigurationProperties: PineconeConfigurationType[];
/** The id of the record */
export type RecordId = string;
/** An array of values, usually an embedding vector. */
export type RecordValues = Array<number>;
/**
 * A sparse representation of vector values
 *
 * @see [Understanding hybrid search](https://docs.pinecone.io/docs/hybrid-search)
 */
export type RecordSparseValues = {
    /** A list of indices where non-zero values are present in a vector. */
    indices: Array<number>;
    /** The values that correspond to the positions in the `indices` array. */
    values: Array<number>;
};
/**
 * A flexible type describing valid values for metadata stored with
 * each record.
 *
 * @see [Filtering with metadata](https://docs.pinecone.io/docs/metadata-filtering#supported-metadata-types)
 */
export type RecordMetadataValue = string | boolean | number | Array<string>;
/**
 * @see [Filtering with metadata](https://docs.pinecone.io/docs/metadata-filtering#supported-metadata-types)
 */
export type RecordMetadata = Record<string, RecordMetadataValue>;
/**
 * @see [Pinecone records](https://docs.pinecone.io/docs/overview#pinecone-indexes-store-records-with-vector-data)
 */
export type PineconeRecord<T extends RecordMetadata = RecordMetadata> = {
    /**
     * The id of the record. This string can be any value and is
     * useful when fetching or deleting by id.
     */
    id: RecordId;
    /**
     * An array of numbers representing an embedding vector.
     */
    values?: RecordValues;
    /**
     * Records can optionally include sparse and dense values when an index
     * is used for hybrid search. See [Sparse-dense vectors](https://docs.pinecone.io/docs/sparse-dense-vectors)
     */
    sparseValues?: RecordSparseValues;
    /**
     * Any metadata associated with this record.
     */
    metadata?: T;
};
type PineconeRecordsType = keyof PineconeRecord;
export declare const PineconeRecordsProperties: PineconeRecordsType[];
/**
 * Metadata detailing usage units for a specific operation.
 */
export type OperationUsage = {
    /**
     * The number of read units consumed by this operation.
     */
    readUnits?: number;
};
/**
 * Integrated records require an `id` or `_id` field in addition to any relevant model fields, or metadata.
 */
export type IntegratedRecord<T extends RecordMetadata = RecordMetadata> = {
    id?: string;
    _id?: string;
} & T;
export {};
