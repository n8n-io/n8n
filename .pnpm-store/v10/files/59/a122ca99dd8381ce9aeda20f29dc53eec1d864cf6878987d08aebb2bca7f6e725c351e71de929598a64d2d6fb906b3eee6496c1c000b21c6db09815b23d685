import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";
import { Cluster } from "couchbase";

//#region src/document_loaders/web/couchbase.d.ts

/**
 * loader for couchbase document
 */
declare class CouchbaseDocumentLoader extends BaseDocumentLoader implements DocumentLoader {
  private cluster;
  private query;
  private pageContentFields?;
  private metadataFields?;
  /**
   * construct Couchbase document loader with a requirement for couchbase cluster client
   * @param client { Cluster } [ couchbase connected client to connect to database ]
   * @param query { string } [ query to get results from while loading the data ]
   * @param pageContentFields { Array<string> } [ filters fields of the document and shows these only ]
   * @param metadataFields { Array<string> } [ metadata fields required ]
   */
  constructor(client: Cluster, query: string, pageContentFields?: string[], metadataFields?: string[]);
  /**
   * Function to load document based on query from couchbase
   * @returns {Promise<Document[]>} [ Returns a promise of all the documents as array ]
   */
  load(): Promise<Document[]>;
  /**
   * Function to load documents based on iterator rather than full load
   * @returns {AsyncIterable<Document>} [ Returns an iterator to fetch documents ]
   */
  lazyLoad(): AsyncIterable<Document>;
}
//#endregion
export { CouchbaseDocumentLoader };
//# sourceMappingURL=couchbase.d.ts.map