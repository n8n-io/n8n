import { UnstructuredLoaderOptions } from "../fs/unstructured.cjs";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/azure_blob_storage_container.d.ts

/**
 * Interface representing the configuration for accessing an Azure Blob
 * Storage container. It includes properties for the connection string and
 * container name.
 */
interface AzureBlobStorageContainerConfig {
  connectionString: string;
  container: string;
}
/**
 * Interface representing the configuration for the
 * AzureBlobStorageContainerLoader. It includes properties for the
 * azureConfig and unstructuredConfig. The azureConfig property contains
 * the Azure Blob Storage container configuration, and the
 * unstructuredConfig property contains the options for the
 * UnstructuredLoader.
 */
interface AzureBlobStorageContainerLoaderConfig {
  azureConfig: AzureBlobStorageContainerConfig;
  unstructuredConfig?: UnstructuredLoaderOptions;
}
/**
 * Class representing a document loader that loads documents from an Azure
 * Blob Storage container. It extends the BaseDocumentLoader class.
 */
declare class AzureBlobStorageContainerLoader extends BaseDocumentLoader {
  get lc_secrets(): {
    [key: string]: string;
  };
  private readonly connectionString;
  private readonly container;
  private readonly unstructuredConfig?;
  constructor({
    azureConfig,
    unstructuredConfig
  }: AzureBlobStorageContainerLoaderConfig);
  /**
   * Method to load documents from an Azure Blob Storage container. It
   * creates a BlobServiceClient using the connection string, gets the
   * container client using the container name, and iterates over the blobs
   * in the container. For each blob, it creates an instance of
   * AzureBlobStorageFileLoader and loads the documents using the loader.
   * The loaded documents are concatenated to the docs array and returned.
   * @returns An array of loaded documents.
   */
  load(): Promise<Document<Record<string, any>>[]>;
}
//#endregion
export { AzureBlobStorageContainerLoader };
//# sourceMappingURL=azure_blob_storage_container.d.cts.map