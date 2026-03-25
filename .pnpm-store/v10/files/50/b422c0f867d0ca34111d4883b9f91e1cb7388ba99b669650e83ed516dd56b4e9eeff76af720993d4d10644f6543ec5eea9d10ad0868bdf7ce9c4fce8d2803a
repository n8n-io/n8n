import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/chaindesk.d.ts
interface ChaindeskRetrieverArgs extends AsyncCallerParams, BaseRetrieverInput {
  datastoreId: string;
  topK?: number;
  filter?: Record<string, unknown>;
  apiKey?: string;
}
/**
 * @example
 * ```typescript
 * const retriever = new ChaindeskRetriever({
 *   datastoreId: "DATASTORE_ID",
 *   apiKey: "CHAINDESK_API_KEY",
 *   topK: 8,
 * });
 * const docs = await retriever.getRelevantDocuments("hello");
 * ```
 */
declare class ChaindeskRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  caller: AsyncCaller;
  datastoreId: string;
  topK?: number;
  filter?: Record<string, unknown>;
  apiKey?: string;
  constructor({
    datastoreId,
    apiKey,
    topK,
    filter,
    ...rest
  }: ChaindeskRetrieverArgs);
  getRelevantDocuments(query: string): Promise<Document[]>;
}
//#endregion
export { ChaindeskRetriever, ChaindeskRetrieverArgs };
//# sourceMappingURL=chaindesk.d.ts.map