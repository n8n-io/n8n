"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = void 0;
const errors_1 = require("../../errors");
/**
 * Deletes a file uploaded to an Assistant by ID.
 *
 * @example
 * ```typescript
 * import { Pinecone } from '@pinecone-database/pinecone';
 * const pc = new Pinecone();
 * const assistantName = 'test1';
 * const assistant = pc.Assistant(assistantName);
 * const files = await assistant.listFiles();
 * let fileId: string;
 * if (files.files) {
 *    fileId = files.files[0].id;
 *    await assistant.deleteFile({fileId: fileId});
 *  }
 * ```
 *
 * @param assistantName - The name of the Assistant to delete the file from.
 * @param api - The Pinecone API object.
 */
const deleteFile = (assistantName, apiProvider) => {
    return async (fileId) => {
        if (!fileId) {
            throw new errors_1.PineconeArgumentError('You must pass the fileId of a file to delete.');
        }
        const api = await apiProvider.provideData();
        const request = {
            assistantName: assistantName,
            assistantFileId: fileId,
        };
        return await api.deleteFile(request);
    };
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=deleteFile.js.map