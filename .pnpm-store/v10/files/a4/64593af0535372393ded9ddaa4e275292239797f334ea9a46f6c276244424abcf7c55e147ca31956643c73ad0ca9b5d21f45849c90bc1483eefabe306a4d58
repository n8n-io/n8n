import { IndexDocumentsAction } from "./indexModels.js";
/**
 * Class used to perform batch operations
 * with multiple documents to the index.
 */
export declare class IndexDocumentsBatch<TModel> {
    /**
     * The set of actions taken in this batch.
     */
    readonly actions: IndexDocumentsAction<TModel>[];
    constructor(actions?: IndexDocumentsAction<TModel>[]);
    /**
     * Upload an array of documents to the index.
     * @param documents - The documents to upload.
     */
    upload(documents: TModel[]): void;
    /**
     * Update a set of documents in the index.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     */
    merge(documents: TModel[]): void;
    /**
     * Update a set of documents in the index or uploads them if they don't exist.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The new/updated documents.
     */
    mergeOrUpload(documents: TModel[]): void;
    /**
     * Delete a set of documents.
     * @param keyName - The name of their primary key in the index.
     * @param keyValues - The primary key values of documents to delete.
     */
    delete(keyName: keyof TModel, keyValues: string[]): void;
    /**
     * Delete a set of documents.
     * @param documents - Documents to be deleted.
     */
    delete(documents: TModel[]): void;
}
//# sourceMappingURL=indexDocumentsBatch.d.ts.map