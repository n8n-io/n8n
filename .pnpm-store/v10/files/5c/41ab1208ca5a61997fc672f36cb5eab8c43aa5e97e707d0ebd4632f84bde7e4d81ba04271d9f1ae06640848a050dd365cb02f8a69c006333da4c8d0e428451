import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/sort_xyz_blockchain.d.ts

/**
 * See https://docs.sort.xyz/docs/api-keys to get your free Sort API key.
 * See https://docs.sort.xyz for more information on the available queries.
 * See https://docs.sort.xyz/reference for more information about Sort's REST API.
 */
interface Query {
  type: "NFTMetadata" | "latestTransactions";
  contractAddress: string;
  blockchain: "ethereum" | "polygon" | "goerli";
  limit?: number;
}
/**
 * Interface representing the parameters for the SortXYZBlockchainLoader
 * class.
 */
interface SortXYZBlockchainLoaderParams {
  apiKey: string;
  query: Query | string;
}
/**
 * Interface representing the response from the SortXYZ API.
 */
interface SortXYZBlockchainAPIResponse {
  code: number;
  data: {
    durationMs: number;
    id: string;
    query: string;
    records: Record<string, unknown>[];
    recordCount: number;
  };
}
/**
 * Class representing a document loader for loading data from the SortXYZ
 * blockchain using the SortXYZ API.
 * @example
 * ```typescript
 * const blockchainLoader = new SortXYZBlockchainLoader({
 *   apiKey: "YOUR_SORTXYZ_API_KEY",
 *   query: {
 *     type: "NFTMetadata",
 *     blockchain: "ethereum",
 *     contractAddress: "0x887F3909C14DAbd9e9510128cA6cBb448E932d7f".toLowerCase(),
 *   },
 * });
 *
 * const blockchainData = await blockchainLoader.load();
 *
 * const prompt =
 *   "Describe the character with the attributes from the following json document in a 4 sentence story. ";
 * const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 })
 * const response = await model.invoke(
 *   prompt + JSON.stringify(blockchainData[0], null, 2),
 * );
 * console.log(`user > ${prompt}`);
 * console.log(`chatgpt > ${response}`);
 * ```
 */
declare class SortXYZBlockchainLoader extends BaseDocumentLoader {
  readonly contractAddress: string;
  readonly blockchain: string;
  readonly apiKey: string;
  readonly queryType: string;
  readonly sql: string;
  readonly limit: number;
  constructor({
    apiKey,
    query
  }: SortXYZBlockchainLoaderParams);
  /**
   * Method that loads the data from the SortXYZ blockchain based on the
   * specified query parameters. It makes requests to the SortXYZ API and
   * returns an array of Documents representing the retrieved data.
   * @returns Promise<Document[]> - An array of Documents representing the retrieved data.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { Query, SortXYZBlockchainAPIResponse, SortXYZBlockchainLoader, SortXYZBlockchainLoaderParams };
//# sourceMappingURL=sort_xyz_blockchain.d.ts.map