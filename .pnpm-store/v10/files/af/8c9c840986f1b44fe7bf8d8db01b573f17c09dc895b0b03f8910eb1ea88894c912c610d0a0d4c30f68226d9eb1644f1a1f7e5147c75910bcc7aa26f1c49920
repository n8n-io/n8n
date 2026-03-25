import { VectorOperationsProvider } from './vectorOperationsProvider';
import { PineconeRecord, RecordMetadata } from './types';
export declare class UpsertCommand<T extends RecordMetadata = RecordMetadata> {
    apiProvider: VectorOperationsProvider;
    namespace: string;
    constructor(apiProvider: any, namespace: any);
    validator: (records: Array<PineconeRecord<T>>) => void;
    run(records: Array<PineconeRecord<T>>, maxRetries?: number): Promise<void>;
}
