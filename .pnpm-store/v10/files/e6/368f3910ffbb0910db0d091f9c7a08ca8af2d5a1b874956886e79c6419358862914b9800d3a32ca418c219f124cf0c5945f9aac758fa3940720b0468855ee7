import type { PineconeConfiguration } from '../vectors/types';
import type { HTTPHeaders } from '../../pinecone-generated-ts-fetch/db_data';
import { BulkOperationsApi } from '../../pinecone-generated-ts-fetch/db_data';
export declare class BulkOperationsProvider {
    private readonly config;
    private readonly indexName;
    private indexHostUrl?;
    private bulkOperations?;
    private readonly additionalHeaders?;
    constructor(config: PineconeConfiguration, indexName: string, indexHostUrl?: string, additionalHeaders?: HTTPHeaders);
    provide(): Promise<BulkOperationsApi>;
    buildBulkOperationsConfig(): BulkOperationsApi;
}
