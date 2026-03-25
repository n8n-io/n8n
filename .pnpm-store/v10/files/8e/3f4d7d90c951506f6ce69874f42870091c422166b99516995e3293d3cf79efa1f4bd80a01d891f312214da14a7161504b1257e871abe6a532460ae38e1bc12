import { VectorOperationsProvider } from './vectorOperationsProvider';
import type { OperationUsage, PineconeRecord, RecordId, RecordMetadata } from './types';
/** The list of record ids you would like to fetch using { @link Index.fetch } */
export type FetchOptions = Array<RecordId>;
/**
 *  The response from {@link Index.fetch }
 *  @typeParam T - The metadata shape for each record: {@link RecordMetadata}.
 */
export type FetchResponse<T extends RecordMetadata = RecordMetadata> = {
    /** A map of fetched records, keyed by record id. */
    records: {
        [key: string]: PineconeRecord<T>;
    };
    /** The namespace where records were fetched. */
    namespace: string;
    /** The usage information for the fetch operation. */
    usage?: OperationUsage;
};
export declare class FetchCommand<T extends RecordMetadata = RecordMetadata> {
    apiProvider: VectorOperationsProvider;
    namespace: string;
    constructor(apiProvider: any, namespace: any);
    validator: (options: FetchOptions) => void;
    run(ids: FetchOptions): Promise<FetchResponse<T>>;
}
