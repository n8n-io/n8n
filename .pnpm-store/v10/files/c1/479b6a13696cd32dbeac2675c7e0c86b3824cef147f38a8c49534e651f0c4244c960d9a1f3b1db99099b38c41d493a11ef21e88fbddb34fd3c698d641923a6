import { UnstructuredLoaderOptions } from "../fs/unstructured.cjs";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { StorageOptions } from "@google-cloud/storage";
import * as fsDefault from "node:fs";

//#region src/document_loaders/web/google_cloud_storage.d.ts

/**
 * Represents the parameters for the GoogleCloudStorageLoader class. It includes
 * properties such as the GCS bucket, file destination, the options for the UnstructuredLoader and
 * the options for Google Cloud Storage
 */
type GcsLoaderConfig = {
  fs?: typeof fsDefault;
  bucket: string;
  file: string;
  unstructuredLoaderOptions: UnstructuredLoaderOptions;
  storageOptions?: StorageOptions;
};
/**
 * A class that extends the BaseDocumentLoader class. It represents a
 * document loader for loading files from a google cloud storage bucket.
 * @example
 * ```typescript
 * const loader = new GoogleCloudStorageLoader({
 *   bucket: "<my-bucket-name>",
 *   file: "<file-path>",
 *   storageOptions: {
 *     keyFilename: "<key-file-name-path>"
 *   }
 *   unstructuredConfig: {
 *     apiUrl: "<unstructured-API-URL>",
 *     apiKey: "<unstructured-API-key>"
 *   }
 * });
 * const docs = await loader.load();
 * ```
 */
declare class GoogleCloudStorageLoader extends BaseDocumentLoader {
  private bucket;
  private file;
  private storageOptions;
  private _fs;
  private unstructuredLoaderOptions;
  constructor({
    fs,
    file,
    bucket,
    unstructuredLoaderOptions,
    storageOptions
  }: GcsLoaderConfig);
  load(): Promise<Document<Record<string, unknown>>[]>;
}
//#endregion
export { GcsLoaderConfig, GoogleCloudStorageLoader };
//# sourceMappingURL=google_cloud_storage.d.cts.map