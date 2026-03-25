import { VectorOperationsProvider } from './vectorOperationsProvider';
import type { ListResponse } from '../../pinecone-generated-ts-fetch/db_data';
/**
 * See [List record IDs](https://docs.pinecone.io/guides/data/list-record-ids)
 */
export type ListOptions = {
    /** The id prefix to match. If unspecified, an empty string prefix will be used with the effect of listing all ids in a namespace. */
    prefix?: string;
    /** The maximum number of ids to return. If unspecified, the server will use a default value. */
    limit?: number;
    /** A token needed to fetch the next page of results. This token is returned in the response if additional results are available. */
    paginationToken?: string;
};
export declare const listPaginated: (apiProvider: VectorOperationsProvider, namespace: string) => (options?: ListOptions) => Promise<ListResponse>;
