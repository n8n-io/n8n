import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { Client } from "@getmetal/metal-sdk";

//#region src/retrievers/metal.d.ts

/**
 * Interface for the fields required during the initialization of a
 * `MetalRetriever` instance. It extends the `BaseRetrieverInput`
 * interface and adds a `client` field of type `Metal`.
 */
interface MetalRetrieverFields extends BaseRetrieverInput {
  client: Client;
}
/**
 * Class used to interact with the Metal service, a managed retrieval &
 * memory platform. It allows you to index your data into Metal and run
 * semantic search and retrieval on it. It extends the `BaseRetriever`
 * class and requires a `Metal` instance and a dictionary of parameters to
 * pass to the Metal API during its initialization.
 * @example
 * ```typescript
 * const retriever = new MetalRetriever({
 *   client: new Metal(
 *     process.env.METAL_API_KEY,
 *     process.env.METAL_CLIENT_ID,
 *     process.env.METAL_INDEX_ID,
 *   ),
 * });
 * const docs = await retriever.getRelevantDocuments("hello");
 * ```
 */
declare class MetalRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  private client;
  constructor(fields: MetalRetrieverFields);
  _getRelevantDocuments(query: string): Promise<Document[]>;
}
//#endregion
export { MetalRetriever, MetalRetrieverFields };
//# sourceMappingURL=metal.d.cts.map