import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";
import { ActorCallOptions, ApifyClient, ApifyClientOptions, TaskCallOptions } from "apify-client";

//#region src/document_loaders/web/apify_dataset.d.ts

/**
 * A type that represents a function that takes a single object (an Apify
 * dataset item) and converts it to an instance of the Document class.
 *
 * Change function signature to only be asynchronous for simplicity in v0.1.0
 * https://github.com/langchain-ai/langchainjs/pull/3262
 */
type ApifyDatasetMappingFunction<Metadata extends Record<string, any>> = (item: Record<string | number, unknown>) => Document<Metadata> | Array<Document<Metadata>> | Promise<Document<Metadata> | Array<Document<Metadata>>>;
interface ApifyDatasetLoaderConfig<Metadata extends Record<string, any>> extends AsyncCallerParams {
  datasetMappingFunction: ApifyDatasetMappingFunction<Metadata>;
  clientOptions?: ApifyClientOptions;
}
/**
 * A class that extends the BaseDocumentLoader and implements the
 * DocumentLoader interface. It represents a document loader that loads
 * documents from an Apify dataset.
 * @example
 * ```typescript
 * const loader = new ApifyDatasetLoader("your-dataset-id", {
 *   datasetMappingFunction: (item) =>
 *     new Document({
 *       pageContent: item.text || "",
 *       metadata: { source: item.url },
 *     }),
 *   clientOptions: {
 *     token: "your-apify-token",
 *   },
 * });
 *
 * const docs = await loader.load();
 *
 * const chain = new RetrievalQAChain();
 * const res = await chain.invoke({ query: "What is LangChain?" });
 *
 * console.log(res.text);
 * console.log(res.sourceDocuments.map((d) => d.metadata.source));
 * ```
 */
declare class ApifyDatasetLoader<Metadata extends Record<string, any>> extends BaseDocumentLoader implements DocumentLoader {
  protected apifyClient: ApifyClient;
  protected datasetId: string;
  protected datasetMappingFunction: ApifyDatasetMappingFunction<Metadata>;
  protected caller: AsyncCaller;
  constructor(datasetId: string, config: ApifyDatasetLoaderConfig<Metadata>);
  /**
   * Creates an instance of the ApifyClient class with the provided clientOptions.
   * Adds a User-Agent header to the request config for langchainjs attribution.
   * @param clientOptions
   * @private
   */
  private static _getApifyClient;
  private static _getApifyApiToken;
  /**
   * Adds a User-Agent header to the request config.
   * @param config
   * @private
   */
  private static _addUserAgent;
  /**
   * Retrieves the dataset items from the Apify platform and applies the
   * datasetMappingFunction to each item to create an array of Document
   * instances.
   * @returns An array of Document instances.
   */
  load(): Promise<Document<Metadata>[]>;
  /**
   * Create an ApifyDatasetLoader by calling an Actor on the Apify platform and waiting for its results to be ready.
   * @param actorId The ID or name of the Actor on the Apify platform.
   * @param input The input object of the Actor that you're trying to run.
   * @param config Options specifying settings for the Actor run.
   * @param config.datasetMappingFunction A function that takes a single object (an Apify dataset item) and converts it to an instance of the Document class.
   * @returns An instance of `ApifyDatasetLoader` with the results from the Actor run.
   */
  static fromActorCall<Metadata extends Record<string, any>>(actorId: string, input: Record<string | number, unknown>, config: {
    callOptions?: ActorCallOptions;
    clientOptions?: ApifyClientOptions;
    datasetMappingFunction: ApifyDatasetMappingFunction<Metadata>;
  }): Promise<ApifyDatasetLoader<Metadata>>;
  /**
   * Create an ApifyDatasetLoader by calling a saved Actor task on the Apify platform and waiting for its results to be ready.
   * @param taskId The ID or name of the task on the Apify platform.
   * @param input The input object of the task that you're trying to run. Overrides the task's saved input.
   * @param config Options specifying settings for the task run.
   * @param config.callOptions Options specifying settings for the task run.
   * @param config.clientOptions Options specifying settings for the Apify client.
   * @param config.datasetMappingFunction A function that takes a single object (an Apify dataset item) and converts it to an instance of the Document class.
   * @returns An instance of `ApifyDatasetLoader` with the results from the task's run.
   */
  static fromActorTaskCall<Metadata extends Record<string, any>>(taskId: string, input: Record<string | number, unknown>, config: {
    callOptions?: TaskCallOptions;
    clientOptions?: ApifyClientOptions;
    datasetMappingFunction: ApifyDatasetMappingFunction<Metadata>;
  }): Promise<ApifyDatasetLoader<Metadata>>;
}
//#endregion
export { ApifyDatasetLoader, ApifyDatasetLoaderConfig, ApifyDatasetMappingFunction };
//# sourceMappingURL=apify_dataset.d.cts.map