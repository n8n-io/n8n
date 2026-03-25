import type { PineconeConfiguration } from './types';
import type { HTTPHeaders } from '../../pinecone-generated-ts-fetch/db_data';
import { VectorOperationsApi } from '../../pinecone-generated-ts-fetch/db_data';
export declare class VectorOperationsProvider {
    private config;
    private indexName;
    private indexHostUrl?;
    private vectorOperations?;
    private additionalHeaders?;
    constructor(config: PineconeConfiguration, indexName: string, indexHostUrl?: string, additionalHeaders?: HTTPHeaders);
    provide(): Promise<VectorOperationsApi>;
    provideHostUrl(): Promise<any>;
    buildDataOperationsConfig(): VectorOperationsApi;
}
