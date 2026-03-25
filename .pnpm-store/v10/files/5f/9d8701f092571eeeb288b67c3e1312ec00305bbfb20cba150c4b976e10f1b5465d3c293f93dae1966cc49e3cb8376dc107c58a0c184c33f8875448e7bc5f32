import { BulkOperationsProvider } from './bulkOperationsProvider';
import { StartImportResponse } from '../../pinecone-generated-ts-fetch/db_data';
export declare class StartImportCommand {
    apiProvider: BulkOperationsProvider;
    namespace: string;
    constructor(apiProvider: BulkOperationsProvider, namespace: string);
    run(uri: string, errorMode?: string | undefined, integrationId?: string | undefined): Promise<StartImportResponse>;
}
