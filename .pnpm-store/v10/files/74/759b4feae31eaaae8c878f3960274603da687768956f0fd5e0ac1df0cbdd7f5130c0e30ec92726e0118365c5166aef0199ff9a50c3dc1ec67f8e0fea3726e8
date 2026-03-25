import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/figma.d.ts

/**
 * Interface representing a Figma file. It includes properties for the
 * file name, role, last modified date, editor type, thumbnail URL,
 * version, document node, schema version, main file key, and an array of
 * branches.
 */
interface FigmaFile {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl: string;
  version: string;
  document: Node;
  schemaVersion: number;
  mainFileKey: string;
  branches: Array<{
    key: string;
    name: string;
    thumbnail_url: string;
    last_modified: string;
    link_access: string;
  }>;
}
/**
 * Interface representing the parameters for configuring the FigmaLoader.
 * It includes optional properties for the access token, an array of node
 * IDs, and the file key.
 */
interface FigmaLoaderParams {
  accessToken?: string;
  nodeIds: string[];
  fileKey: string;
}
/**
 * Class representing a document loader for loading Figma files. It
 * extends the BaseDocumentLoader and implements the FigmaLoaderParams
 * interface. The constructor takes a config object as a parameter, which
 * contains the access token, an array of node IDs, and the file key.
 * @example
 * ```typescript
 * const loader = new FigmaFileLoader({
 *   accessToken: "FIGMA_ACCESS_TOKEN",
 *   nodeIds: ["id1", "id2", "id3"],
 *   fileKey: "key",
 * });
 * const docs = await loader.load();
 * ```
 */
declare class FigmaFileLoader extends BaseDocumentLoader implements FigmaLoaderParams {
  accessToken?: string;
  nodeIds: string[];
  fileKey: string;
  private headers;
  constructor({
    accessToken,
    nodeIds,
    fileKey
  }: FigmaLoaderParams);
  /**
   * Constructs the URL for the Figma API call.
   * @returns The constructed URL as a string.
   */
  private constructFigmaApiURL;
  private getFigmaFile;
  /**
   * Fetches the Figma file using the Figma API, creates a Document instance
   * with the JSON representation of the file as the page content and the
   * API URL as the metadata, and returns it.
   * @returns A Promise that resolves to an array of Document instances.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { FigmaFile, FigmaFileLoader, FigmaLoaderParams };
//# sourceMappingURL=figma.d.cts.map