import { AsstDataOperationsProvider } from './asstDataOperationsProvider';
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
export declare const deleteFile: (assistantName: string, apiProvider: AsstDataOperationsProvider) => (fileId: string) => Promise<void>;
