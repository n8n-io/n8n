import { VectorOperationsProvider } from './vectorOperationsProvider';
import type { RecordId } from './types';
/**
 * A list of record ids to delete from the index.
 */
export type DeleteManyByRecordIdOptions = Array<RecordId>;
/**
 * @see [Deleting vectors by metadata filter](https://docs.pinecone.io/docs/metadata-filtering#deleting-vectors-by-metadata-filter)
 */
export type DeleteManyByFilterOptions = object;
/**
 * Options that may be passed to { @link Index.deleteMany }
 */
export type DeleteManyOptions = DeleteManyByRecordIdOptions | DeleteManyByFilterOptions;
export declare const deleteMany: (apiProvider: VectorOperationsProvider, namespace: string) => (options: DeleteManyOptions) => Promise<void>;
