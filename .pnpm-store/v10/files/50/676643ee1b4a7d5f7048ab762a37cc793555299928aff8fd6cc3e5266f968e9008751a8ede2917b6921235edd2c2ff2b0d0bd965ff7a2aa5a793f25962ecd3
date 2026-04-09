import { EmbeddingModelV3CallOptions } from './embedding-model-v3-call-options';
import { EmbeddingModelV3Result } from './embedding-model-v3-result';

/**
 * Specification for an embedding model that implements the embedding model
 * interface version 3.
 *
 * It is specific to text embeddings.
 */
export type EmbeddingModelV3 = {
  /**
   * The embedding model must specify which embedding model interface
   * version it implements. This will allow us to evolve the embedding
   * model interface and retain backwards compatibility. The different
   * implementation versions can be handled as a discriminated union
   * on our side.
   */
  readonly specificationVersion: 'v3';

  /**
   * Name of the provider for logging purposes.
   */
  readonly provider: string;

  /**
   * Provider-specific model ID for logging purposes.
   */
  readonly modelId: string;

  /**
   * Limit of how many embeddings can be generated in a single API call.
   *
   * Use Infinity for models that do not have a limit.
   */
  readonly maxEmbeddingsPerCall:
    | PromiseLike<number | undefined>
    | number
    | undefined;

  /**
   * True if the model can handle multiple embedding calls in parallel.
   */
  readonly supportsParallelCalls: PromiseLike<boolean> | boolean;

  /**
   * Generates a list of embeddings for the given input text.
   *
   * Naming: "do" prefix to prevent accidental direct usage of the method
   * by the user.
   */
  doEmbed(
    options: EmbeddingModelV3CallOptions,
  ): PromiseLike<EmbeddingModelV3Result>;
};
