import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/tavily_search_api.d.ts

/**
 * Options for the TavilySearchAPIRetriever class, which includes a BaseLanguageModel
 * instance, a VectorStore instance, and an optional promptTemplate which
 * can either be a BasePromptTemplate instance or a PromptKey.
 */
type TavilySearchAPIRetrieverFields = BaseRetrieverInput & {
  k?: number;
  includeGeneratedAnswer?: boolean;
  includeRawContent?: boolean;
  includeImages?: boolean;
  searchDepth?: "basic" | "advanced";
  includeDomains?: string[];
  excludeDomains?: string[];
  kwargs?: Record<string, unknown>;
  apiKey?: string;
};
/**
 * A class for retrieving documents related to a given search term
 * using the Tavily Search API.
 */
declare class TavilySearchAPIRetriever extends BaseRetriever {
  static lc_name(): string;
  get lc_namespace(): string[];
  k: number;
  includeGeneratedAnswer: boolean;
  includeRawContent: boolean;
  includeImages: boolean;
  searchDepth: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  kwargs: Record<string, unknown>;
  apiKey?: string;
  constructor(fields?: TavilySearchAPIRetrieverFields);
  _getRelevantDocuments(query: string, _runManager?: CallbackManagerForRetrieverRun): Promise<Document[]>;
}
//#endregion
export { TavilySearchAPIRetriever, TavilySearchAPIRetrieverFields };
//# sourceMappingURL=tavily_search_api.d.cts.map