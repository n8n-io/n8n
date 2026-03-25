import { UnstructuredLoader as UnstructuredLoader$1 } from "../fs/unstructured.cjs";
import * as _langchain_core_documents0 from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import * as fsDefault from "node:fs";
import { S3ClientConfig } from "@aws-sdk/client-s3";

//#region src/document_loaders/web/s3.d.ts

/**
 * Represents the parameters for the S3Loader class. It includes
 * properties such as the S3 bucket, key, unstructured API URL,
 * unstructured API key, S3 configuration, file system module, and
 * UnstructuredLoader module.
 */
interface S3LoaderParams {
  bucket: string;
  key: string;
  unstructuredAPIURL: string;
  unstructuredAPIKey: string;
  s3Config?: S3ClientConfig;
  fs?: typeof fsDefault;
  UnstructuredLoader?: typeof UnstructuredLoader$1;
}
/**
 * A class that extends the BaseDocumentLoader class. It represents a
 * document loader for loading files from an S3 bucket.
 * @example
 * ```typescript
 * const loader = new S3Loader({
 *   bucket: "my-document-bucket-123",
 *   key: "AccountingOverview.pdf",
 *   s3Config: {
 *     region: "us-east-1",
 *     credentials: {
 *       accessKeyId: "<YourAccessKeyId>",
 *       secretAccessKey: "<YourSecretAccessKey>",
 *     },
 *   },
 *   unstructuredAPIURL: "<YourUnstructuredAPIURL>",
 *   unstructuredAPIKey: "<YourUnstructuredAPIKey>",
 * });
 * const docs = await loader.load();
 * ```
 */
declare class S3Loader extends BaseDocumentLoader {
  private bucket;
  private key;
  private unstructuredAPIURL;
  private unstructuredAPIKey;
  private s3Config;
  private _fs;
  private _UnstructuredLoader;
  constructor({
    bucket,
    key,
    unstructuredAPIURL,
    unstructuredAPIKey,
    s3Config,
    fs,
    UnstructuredLoader
  }: S3LoaderParams);
  /**
   * Loads the file from the S3 bucket, saves it to a temporary directory,
   * and then uses the UnstructuredLoader to load the file as a document.
   * @returns An array of Document objects representing the loaded documents.
   */
  load(): Promise<_langchain_core_documents0.Document<Record<string, any>>[]>;
}
//#endregion
export { S3Loader, S3LoaderParams };
//# sourceMappingURL=s3.d.cts.map