import { BulkOperationsProvider } from './bulkOperationsProvider';
import { ListImportsResponse } from '../../pinecone-generated-ts-fetch/db_data';
export declare class ListImportsCommand {
    apiProvider: BulkOperationsProvider;
    namespace: string;
    constructor(apiProvider: BulkOperationsProvider, namespace: string);
    run(limit?: number, paginationToken?: string): Promise<ListImportsResponse>;
}
