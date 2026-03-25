import { ManageIndexesApi, IndexModel, ConfigureIndexRequest } from '../pinecone-generated-ts-fetch/db_control';
import type { IndexName } from './types';
type ConfigureIndexRequestType = keyof ConfigureIndexRequest;
export declare const ConfigureIndexRequestProperties: ConfigureIndexRequestType[];
export declare const configureIndex: (api: ManageIndexesApi) => (indexName: IndexName, options: ConfigureIndexRequest, maxRetries?: number) => Promise<IndexModel>;
export {};
