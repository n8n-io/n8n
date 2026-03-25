import { Document } from "@langchain/core/documents";
import { Storage } from "@google-cloud/storage";
import { Docstore } from "@langchain/classic/stores/doc/base";

//#region src/stores/doc/gcs.d.ts

/**
 * Interface that defines the configuration for the
 * GoogleCloudStorageDocstore. It includes the bucket name and an optional
 * prefix.
 */
interface GoogleCloudStorageDocstoreConfiguration {
  /** The identifier for the GCS bucket */
  bucket: string;
  /**
   * An optional prefix to prepend to each object name.
   * Often used to create a pseudo-hierarchy.
   */
  prefix?: string;
}
/**
 * Class that provides an interface for interacting with Google Cloud
 * Storage (GCS) as a document store. It extends the Docstore class and
 * implements methods to search, add, and add a document to the GCS
 * bucket.
 */
declare class GoogleCloudStorageDocstore extends Docstore {
  bucket: string;
  prefix: string;
  storage: Storage;
  constructor(config: GoogleCloudStorageDocstoreConfiguration);
  /**
   * Searches for a document in the GCS bucket and returns it as a Document
   * instance.
   * @param search The name of the document to search for in the GCS bucket
   * @returns A Promise that resolves to a Document instance representing the found document
   */
  search(search: string): Promise<Document>;
  /**
   * Adds multiple documents to the GCS bucket.
   * @param texts An object where each key is the name of a document and the value is the Document instance to be added
   * @returns A Promise that resolves when all documents have been added
   */
  add(texts: Record<string, Document>): Promise<void>;
  /**
   * Adds a single document to the GCS bucket.
   * @param name The name of the document to be added
   * @param document The Document instance to be added
   * @returns A Promise that resolves when the document has been added
   */
  addDocument(name: string, document: Document): Promise<void>;
  /**
   * Gets a file from the GCS bucket.
   * @param name The name of the file to get from the GCS bucket
   * @returns A File instance representing the fetched file
   */
  private getFile;
}
//#endregion
export { GoogleCloudStorageDocstore, GoogleCloudStorageDocstoreConfiguration };
//# sourceMappingURL=gcs.d.ts.map