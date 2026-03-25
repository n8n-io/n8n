//#region src/documents/document.d.ts
interface DocumentInput<Metadata extends Record<string, any> = Record<string, any>> {
  pageContent: string;
  metadata?: Metadata;
  /**
   * An optional identifier for the document.
   *
   * Ideally this should be unique across the document collection and formatted
   * as a UUID, but this will not be enforced.
   */
  id?: string;
}
interface DocumentInterface<Metadata extends Record<string, any> = Record<string, any>> {
  pageContent: string;
  metadata: Metadata;
  /**
   * An optional identifier for the document.
   *
   * Ideally this should be unique across the document collection and formatted
   * as a UUID, but this will not be enforced.
   */
  id?: string;
}
/**
 * Interface for interacting with a document.
 */
declare class Document<Metadata extends Record<string, any> = Record<string, any>> implements DocumentInput, DocumentInterface {
  pageContent: string;
  metadata: Metadata;
  /**
   * An optional identifier for the document.
   *
   * Ideally this should be unique across the document collection and formatted
   * as a UUID, but this will not be enforced.
   */
  id?: string;
  constructor(fields: DocumentInput<Metadata>);
}
//#endregion
export { Document, DocumentInput, DocumentInterface };
//# sourceMappingURL=document.d.ts.map