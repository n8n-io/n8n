import { BedrockAgentRuntimeClient, BedrockAgentRuntimeClientConfig, RetrievalFilter, SearchType } from "@aws-sdk/client-bedrock-agent-runtime";
import { BaseRetriever } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";

//#region src/retrievers/bedrock.d.ts

/**
 * Interface for the arguments required to initialize an
 * AmazonKnowledgeBaseRetriever instance.
 */
interface AmazonKnowledgeBaseRetrieverArgs {
  knowledgeBaseId: string;
  topK: number;
  region: string;
  clientOptions?: BedrockAgentRuntimeClientConfig;
  filter?: RetrievalFilter;
  overrideSearchType?: SearchType;
}
/**
 * Class for interacting with Amazon Bedrock Knowledge Bases, a RAG workflow oriented service
 * provided by AWS. Extends the BaseRetriever class.
 * @example
 * ```typescript
 * const retriever = new AmazonKnowledgeBaseRetriever({
 *   topK: 10,
 *   knowledgeBaseId: "YOUR_KNOWLEDGE_BASE_ID",
 *   region: "us-east-2",
 *   clientOptions: {
 *     credentials: {
 *       accessKeyId: "YOUR_ACCESS_KEY_ID",
 *       secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
 *     },
 *   },
 * });
 *
 * const docs = await retriever.getRelevantDocuments("How are clouds formed?");
 * ```
 */
declare class AmazonKnowledgeBaseRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  knowledgeBaseId: string;
  topK: number;
  bedrockAgentRuntimeClient: BedrockAgentRuntimeClient;
  filter?: RetrievalFilter;
  overrideSearchType?: SearchType;
  constructor({
    knowledgeBaseId,
    topK,
    clientOptions,
    region,
    filter,
    overrideSearchType
  }: AmazonKnowledgeBaseRetrieverArgs);
  /**
   * Cleans the result text by replacing sequences of whitespace with a
   * single space and removing ellipses.
   * @param resText The result text to clean.
   * @returns The cleaned result text.
   */
  cleanResult(resText: string): string;
  queryKnowledgeBase(query: string, topK: number, filter?: RetrievalFilter, overrideSearchType?: SearchType): Promise<Document<Record<string, any>>[] | {
    pageContent: string;
    metadata: {
      source: string | undefined;
      score: number | undefined;
    };
  }[]>;
  _getRelevantDocuments(query: string): Promise<Document[]>;
}
//#endregion
export { AmazonKnowledgeBaseRetriever, AmazonKnowledgeBaseRetrieverArgs };
//# sourceMappingURL=bedrock.d.ts.map