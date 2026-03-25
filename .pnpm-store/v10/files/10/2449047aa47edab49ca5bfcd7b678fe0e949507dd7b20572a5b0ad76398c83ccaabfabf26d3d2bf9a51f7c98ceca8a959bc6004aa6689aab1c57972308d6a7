"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFiles = void 0;
/**
 * Lists files (with optional filter) uploaded to an Assistant.
 *
 * @example
 * ```typescript
 * import { Pinecone } from '@pinecone-database/pinecone';
 * const pc = new Pinecone();
 * const assistantName = 'test1';
 * const assistant = pc.Assistant(assistantName);
 * const files = await assistant.listFiles({filter: {metadata: {key: 'value'}}});
 * console.log(files);
 * // {
 * //  files: [
 * //    {
 * //      name: 'test-file.txt',
 * //      id: '1a56ddd0-c6d8-4295-80c0-9bfd6f5cb87b',
 * //      metadata: [Object],
 * //      createdOn: 2025-01-06T19:14:21.969Z,
 * //      updatedOn: 2025-01-06T19:14:36.925Z,
 * //      status: 'Available',
 * //      percentDone: 1,
 * //      signedUrl: undefined,
 * //      errorMessage: undefined
 * //    }
 * //  ]
 * // }
 * ```
 * @param assistantName - The name of the Assistant that the files are uploaded to.
 * @param api - The API object to use to send the request.
 */
const listFiles = (assistantName, apiProvider) => {
    return async (options) => {
        const api = await apiProvider.provideData();
        const request = {
            assistantName: assistantName,
            filter: options.filter,
        };
        return await api.listFiles(request);
    };
};
exports.listFiles = listFiles;
//# sourceMappingURL=listFiles.js.map