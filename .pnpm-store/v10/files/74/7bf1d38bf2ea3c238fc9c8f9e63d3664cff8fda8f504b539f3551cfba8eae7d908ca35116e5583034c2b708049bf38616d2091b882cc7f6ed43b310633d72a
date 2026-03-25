import { VectorOperationsProvider } from './vectorOperationsProvider';
import { IntegratedRecord, PineconeConfiguration, RecordMetadata } from './types';
export declare class UpsertRecordsCommand<T extends RecordMetadata = RecordMetadata> {
    apiProvider: VectorOperationsProvider;
    config: PineconeConfiguration;
    namespace: string;
    constructor(apiProvider: VectorOperationsProvider, namespace: string, config: PineconeConfiguration);
    validator: (records: Array<IntegratedRecord<T>>) => void;
    run(records: Array<IntegratedRecord<T>>, maxRetries?: number): Promise<void>;
}
