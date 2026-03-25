// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Class used to perform batch operations
 * with multiple documents to the index.
 */
export class IndexDocumentsBatch {
    constructor(actions = []) {
        this.actions = actions;
    }
    /**
     * Upload an array of documents to the index.
     * @param documents - The documents to upload.
     */
    upload(documents) {
        const batch = documents.map((doc) => {
            return Object.assign(Object.assign({}, doc), { __actionType: "upload" });
        });
        this.actions.push(...batch);
    }
    /**
     * Update a set of documents in the index.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     */
    merge(documents) {
        const batch = documents.map((doc) => {
            return Object.assign(Object.assign({}, doc), { __actionType: "merge" });
        });
        this.actions.push(...batch);
    }
    /**
     * Update a set of documents in the index or uploads them if they don't exist.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The new/updated documents.
     */
    mergeOrUpload(documents) {
        const batch = documents.map((doc) => {
            return Object.assign(Object.assign({}, doc), { __actionType: "mergeOrUpload" });
        });
        this.actions.push(...batch);
    }
    delete(keyNameOrDocuments, keyValues) {
        if (keyValues) {
            const keyName = keyNameOrDocuments;
            const batch = keyValues.map((keyValue) => {
                return {
                    __actionType: "delete",
                    [keyName]: keyValue,
                };
            });
            this.actions.push(...batch);
        }
        else {
            const documents = keyNameOrDocuments;
            const batch = documents.map((document) => {
                return Object.assign({ __actionType: "delete" }, document);
            });
            this.actions.push(...batch);
        }
    }
}
//# sourceMappingURL=indexDocumentsBatch.js.map