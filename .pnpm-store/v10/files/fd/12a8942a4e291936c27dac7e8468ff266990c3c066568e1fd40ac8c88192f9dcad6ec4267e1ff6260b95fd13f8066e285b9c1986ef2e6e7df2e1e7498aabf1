import { DocumentInterface } from "../documents/document.cjs";
import { CallbackManagerForRetrieverRun, Callbacks } from "../callbacks/manager.cjs";
import { RunnableConfig, RunnableInterface } from "../runnables/types.cjs";
import { Runnable } from "../runnables/base.cjs";

//#region src/retrievers/index.d.ts
/**
 * Input configuration options for initializing a retriever that extends
 * the `BaseRetriever` class. This interface provides base properties
 * common to all retrievers, allowing customization of callback functions,
 * tagging, metadata, and logging verbosity.
 *
 * Fields:
 * - `callbacks` (optional): An array of callback functions that handle various
 *   events during retrieval, such as logging, error handling, or progress updates.
 *
 * - `tags` (optional): An array of strings used to add contextual tags to
 *   retrieval operations, allowing for easier categorization and tracking.
 *
 * - `metadata` (optional): A record of key-value pairs to store additional
 *   contextual information for retrieval operations, which can be useful
 *   for logging or auditing purposes.
 *
 * - `verbose` (optional): A boolean flag that, if set to `true`, enables
 *   detailed logging and output during the retrieval process. Defaults to `false`.
 */
interface BaseRetrieverInput {
  callbacks?: Callbacks;
  tags?: string[];
  metadata?: Record<string, unknown>;
  verbose?: boolean;
}
/**
 * Interface for a base retriever that defines core functionality for
 * retrieving relevant documents from a source based on a query.
 *
 * The `BaseRetrieverInterface` standardizes the `getRelevantDocuments` method,
 * enabling retrieval of documents that match the query criteria.
 *
 * @template Metadata - The type of metadata associated with each document,
 *                      defaulting to `Record<string, any>`.
 */
interface BaseRetrieverInterface<Metadata extends Record<string, any> = Record<string, any>> extends RunnableInterface<string, DocumentInterface<Metadata>[]> {}
/**
 * Abstract base class for a document retrieval system, designed to
 * process string queries and return the most relevant documents from a source.
 *
 * `BaseRetriever` provides common properties and methods for derived retrievers,
 * such as callbacks, tagging, and verbose logging. Custom retrieval systems
 * should extend this class and implement `_getRelevantDocuments` to define
 * the specific retrieval logic.
 *
 * @template Metadata - The type of metadata associated with each document,
 *                      defaulting to `Record<string, any>`.
 */
declare abstract class BaseRetriever<Metadata extends Record<string, any> = Record<string, any>> extends Runnable<string, DocumentInterface<Metadata>[]> implements BaseRetrieverInterface {
  /**
   * Optional callbacks to handle various events in the retrieval process.
   */
  callbacks?: Callbacks;
  /**
   * Tags to label or categorize the retrieval operation.
   */
  tags?: string[];
  /**
   * Metadata to provide additional context or information about the retrieval
   * operation.
   */
  metadata?: Record<string, unknown>;
  /**
   * If set to `true`, enables verbose logging for the retrieval process.
   */
  verbose?: boolean;
  /**
   * Constructs a new `BaseRetriever` instance with optional configuration fields.
   *
   * @param fields - Optional input configuration that can include `callbacks`,
   *                 `tags`, `metadata`, and `verbose` settings for custom retriever behavior.
   */
  constructor(fields?: BaseRetrieverInput);
  /**
   * TODO: This should be an abstract method, but we'd like to avoid breaking
   * changes to people currently using subclassed custom retrievers.
   * Change it on next major release.
   */
  /**
   * Placeholder method for retrieving relevant documents based on a query.
   *
   * This method is intended to be implemented by subclasses and will be
   * converted to an abstract method in the next major release. Currently, it
   * throws an error if not implemented, ensuring that custom retrievers define
   * the specific retrieval logic.
   *
   * @param _query - The query string used to search for relevant documents.
   * @param _callbacks - (optional) Callback manager for managing callbacks
   *                     during retrieval.
   * @returns A promise resolving to an array of `DocumentInterface` instances relevant to the query.
   * @throws {Error} Throws an error indicating the method is not implemented.
   */
  _getRelevantDocuments(_query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<DocumentInterface<Metadata>[]>;
  /**
   * Executes a retrieval operation.
   *
   * @param input - The query string used to search for relevant documents.
   * @param options - (optional) Configuration options for the retrieval run,
   *                  which may include callbacks, tags, and metadata.
   * @returns A promise that resolves to an array of `DocumentInterface` instances
   *          representing the most relevant documents to the query.
   */
  invoke(input: string, options?: RunnableConfig): Promise<DocumentInterface<Metadata>[]>;
}
//#endregion
export { BaseRetriever, BaseRetrieverInput, BaseRetrieverInterface };
//# sourceMappingURL=index.d.cts.map