import { AsstDataOperationsProvider } from './asstDataOperationsProvider';
import type { AssistantFileModel } from './types';
/**
 * Describes a file uploaded to an Assistant.
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
 *     fileId = files.files[0].id;
 * } else {
 *     fileId = '';
 * }
 * const resp = await assistant.describeFile({fileId: fileId})
 * console.log(resp);
 * // {
 * //  name: 'test-file.txt',
 * //  id: '1a56ddd0-c6d8-4295-80c0-9bfd6f5cb87b',
 * //  metadata: undefined,
 * //  createdOn: 2025-01-06T19:14:21.969Z,
 * //  updatedOn: 2025-01-06T19:14:36.925Z,
 * //  status: 'Available',
 * //  percentDone: 1,
 * //  signedUrl: undefined,
 * //   errorMessage: undefined
 * // }
 * ```
 *
 * @param assistantName - The name of the Assistant that the file is uploaded to.
 * @param api - The API object to use to send the request.
 * @returns A promise that resolves to a {@link AssistantFile} object containing the file details.
 */
export declare const describeFile: (assistantName: string, apiProvider: AsstDataOperationsProvider) => (fileId: string) => Promise<AssistantFileModel>;
