import { VectorOperationsProvider } from './vectorOperationsProvider';
import type { RecordId, RecordValues, RecordSparseValues, RecordMetadata } from './types';
/**
 * This type is very similar to { @link PineconeRecord }, but differs because the
 * values field is optional here. This is to allow for situations where perhaps
 * the caller only wants to update metadata for a given record while leaving
 * stored vector values as they are.
 */
export type UpdateOptions<T extends RecordMetadata = RecordMetadata> = {
    /** The id of the record you would like to update */
    id: RecordId;
    /** The vector values you would like to store with this record */
    values?: RecordValues;
    /** The sparse values you would like to store with this record.
     *
     * @see [Understanding hybrid search](https://docs.pinecone.io/docs/hybrid-search)
     */
    sparseValues?: RecordSparseValues;
    /**
     * The metadata you would like to store with this record.
     */
    metadata?: Partial<T>;
};
export declare class UpdateCommand<T extends RecordMetadata = RecordMetadata> {
    apiProvider: VectorOperationsProvider;
    namespace: string;
    constructor(apiProvider: any, namespace: any);
    validator: (options: UpdateOptions<T>) => void;
    run(options: UpdateOptions<T>, maxRetries?: number): Promise<void>;
}
