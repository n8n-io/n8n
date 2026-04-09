"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexDocumentsBatch = void 0;
/**
 * Class used to perform batch operations
 * with multiple documents to the index.
 */
class IndexDocumentsBatch {
    /**
     * The set of actions taken in this batch.
     */
    actions;
    constructor(actions = []) {
        this.actions = actions;
    }
    /**
     * Upload an array of documents to the index.
     * @param documents - The documents to upload.
     */
    upload(documents) {
        const batch = documents.map((doc) => {
            return {
                ...doc,
                __actionType: "upload",
            };
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
            return {
                ...doc,
                __actionType: "merge",
            };
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
            return {
                ...doc,
                __actionType: "mergeOrUpload",
            };
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
                return {
                    __actionType: "delete",
                    ...document,
                };
            });
            this.actions.push(...batch);
        }
    }
}
exports.IndexDocumentsBatch = IndexDocumentsBatch;
//# sourceMappingURL=indexDocumentsBatch.js.map