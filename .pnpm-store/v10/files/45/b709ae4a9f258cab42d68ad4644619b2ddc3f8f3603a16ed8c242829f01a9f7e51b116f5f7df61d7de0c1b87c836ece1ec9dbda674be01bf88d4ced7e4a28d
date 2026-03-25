import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { FeatureExtractionPipelineOptions, PretrainedOptions } from "@huggingface/transformers";

//#region src/embeddings/huggingface_transformers.d.ts
interface HuggingFaceTransformersEmbeddingsParams extends EmbeddingsParams {
  /** Model name to use */
  model: string;
  /**
   * Timeout to use when making requests to OpenAI.
   */
  timeout?: number;
  /**
   * The maximum number of documents to embed in a single request.
   */
  batchSize?: number;
  /**
   * Whether to strip new lines from the input text. This is recommended by
   * OpenAI, but may not be suitable for all use cases.
   */
  stripNewLines?: boolean;
  /**
   * Optional parameters for the pretrained model.
   */
  pretrainedOptions?: PretrainedOptions;
  /**
   * Optional parameters for the pipeline.
   */
  pipelineOptions?: FeatureExtractionPipelineOptions;
}
/**
 * @example
 * ```typescript
 * const model = new HuggingFaceTransformersEmbeddings({
 *   model: "Xenova/all-MiniLM-L6-v2",
 * });
 *
 * // Embed a single query
 * const res = await model.embedQuery(
 *   "What would be a good company name for a company that makes colorful socks?"
 * );
 * console.log({ res });
 *
 * // Embed multiple documents
 * const documentRes = await model.embedDocuments(["Hello world", "Bye bye"]);
 * console.log({ documentRes });
 * ```
 */
declare class HuggingFaceTransformersEmbeddings extends Embeddings implements HuggingFaceTransformersEmbeddingsParams {
  model: string;
  batchSize: number;
  stripNewLines: boolean;
  timeout?: number;
  pretrainedOptions?: PretrainedOptions;
  pipelineOptions?: FeatureExtractionPipelineOptions;
  private pipelinePromise;
  constructor(fields?: Partial<HuggingFaceTransformersEmbeddingsParams>);
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  private runEmbedding;
}
//#endregion
export { HuggingFaceTransformersEmbeddings, HuggingFaceTransformersEmbeddingsParams };
//# sourceMappingURL=huggingface_transformers.d.ts.map