import { QueryConstructorRunnableOptions } from "../../chains/query_constructor/index.cjs";
import { RunnableInterface } from "@langchain/core/runnables";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { VectorStore } from "@langchain/core/vectorstores";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { BaseTranslator, BaseTranslator as BaseTranslator$1, BasicTranslator, FunctionalTranslator, StructuredQuery } from "@langchain/core/structured_query";

//#region src/retrievers/self_query/index.d.ts

/**
 * Interface for the arguments required to create a SelfQueryRetriever
 * instance. It extends the BaseRetrieverInput interface.
 */
interface SelfQueryRetrieverArgs<T extends VectorStore> extends BaseRetrieverInput {
  vectorStore: T;
  structuredQueryTranslator: BaseTranslator$1<T>;
  queryConstructor: RunnableInterface<{
    query: string;
  }, StructuredQuery>;
  verbose?: boolean;
  useOriginalQuery?: boolean;
  searchParams?: {
    k?: number;
    filter?: T["FilterType"];
    mergeFiltersOperator?: "or" | "and" | "replace";
    forceDefaultFilter?: boolean;
  };
}
/**
 * Class for question answering over an index. It retrieves relevant
 * documents based on a query. It extends the BaseRetriever class and
 * implements the SelfQueryRetrieverArgs interface.
 * @example
 * ```typescript
 * const selfQueryRetriever = SelfQueryRetriever.fromLLM({
 *   llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   vectorStore: await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings()),
 *   documentContents: "Brief summary of a movie",
 *   attributeInfo: attributeInfo,
 *   structuredQueryTranslator: new FunctionalTranslator(),
 * });
 * const relevantDocuments = await selfQueryRetriever.invoke(
 *   "Which movies are directed by Greta Gerwig?",
 * );
 * ```
 */
declare class SelfQueryRetriever<T extends VectorStore> extends BaseRetriever implements SelfQueryRetrieverArgs<T> {
  static lc_name(): string;
  get lc_namespace(): string[];
  vectorStore: T;
  queryConstructor: RunnableInterface<{
    query: string;
  }, StructuredQuery>;
  verbose?: boolean;
  structuredQueryTranslator: BaseTranslator$1<T>;
  useOriginalQuery: boolean;
  searchParams?: {
    k?: number;
    filter?: T["FilterType"];
    mergeFiltersOperator?: "or" | "and" | "replace";
    forceDefaultFilter?: boolean;
  };
  constructor(options: SelfQueryRetrieverArgs<T>);
  _getRelevantDocuments(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document<Record<string, unknown>>[]>;
  /**
   * Static method to create a new SelfQueryRetriever instance from a
   * BaseLanguageModel and a VectorStore. It first loads a query constructor
   * chain using the loadQueryConstructorChain function, then creates a new
   * SelfQueryRetriever instance with the loaded chain and the provided
   * options.
   * @param options The options used to create the SelfQueryRetriever instance. It includes the QueryConstructorChainOptions and all the SelfQueryRetrieverArgs except 'llmChain'.
   * @returns A new instance of SelfQueryRetriever.
   */
  static fromLLM<T extends VectorStore>(options: QueryConstructorRunnableOptions & Omit<SelfQueryRetrieverArgs<T>, "queryConstructor">): SelfQueryRetriever<T>;
}
//#endregion
export { BaseTranslator, BasicTranslator, FunctionalTranslator, SelfQueryRetriever, SelfQueryRetrieverArgs };
//# sourceMappingURL=index.d.cts.map