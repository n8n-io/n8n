import type { PineconeConfiguration } from '../../data';
import { ManageAssistantsApi as ManageAssistantsDataApi, HTTPHeaders } from '../../pinecone-generated-ts-fetch/assistant_data';
export declare class AsstDataOperationsProvider {
    private readonly config;
    private readonly asstName;
    private asstHostUrl?;
    private asstDataOperations?;
    private additionalHeaders?;
    constructor(config: PineconeConfiguration, asstName: string, asstHostUrl?: string, additionalHeaders?: HTTPHeaders);
    provideData(): Promise<ManageAssistantsDataApi>;
    provideHostUrl(): Promise<string | undefined>;
    buildAsstDataOperationsConfig(): ManageAssistantsDataApi;
}
