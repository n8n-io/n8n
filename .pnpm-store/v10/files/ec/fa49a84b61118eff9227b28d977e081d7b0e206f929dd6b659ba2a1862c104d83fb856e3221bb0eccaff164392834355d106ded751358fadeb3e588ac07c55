import {
  SharedV3Headers,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from '../../shared/v3/';
import { RerankingModelV3CallOptions } from './reranking-model-v3-call-options';

/**
 * Specification for a reranking model that implements the reranking model interface version 3.
 */
export type RerankingModelV3 = {
  /**
   * The reranking model must specify which reranking model interface version it implements.
   */
  readonly specificationVersion: 'v3';

  /**
   * Provider ID.
   */
  readonly provider: string;

  /**
   * Provider-specific model ID.
   */
  readonly modelId: string;

  /**
   * Reranking a list of documents using the query.
   */
  // Naming: "do" prefix to prevent accidental direct usage of the method by the user.
  doRerank(options: RerankingModelV3CallOptions): PromiseLike<{
    /**
     * Ordered list of reranked documents (via index before reranking).
     * The documents are sorted by the descending order of relevance scores.
     */
    ranking: Array<{
      /**
       * The index of the document in the original list of documents before reranking.
       */
      index: number;

      /**
       * The relevance score of the document after reranking.
       */
      relevanceScore: number;
    }>;

    /**
     * Additional provider-specific metadata. They are passed through
     * to the provider from the AI SDK and enable provider-specific
     * functionality that can be fully encapsulated in the provider.
     */
    providerMetadata?: SharedV3ProviderMetadata;

    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    warnings?: Array<SharedV3Warning>;

    /**
     * Optional response information for debugging purposes.
     */
    response?: {
      /**
       * ID for the generated response, if the provider sends one.
       */
      id?: string;

      /**
       * Timestamp for the start of the generated response, if the provider sends one.
       */
      timestamp?: Date;

      /**
       * The ID of the response model that was used to generate the response, if the provider sends one.
       */
      modelId?: string;

      /**
       * Response headers.
       */
      headers?: SharedV3Headers;

      /**
       * Response body.
       */
      body?: unknown;
    };
  }>;
};
