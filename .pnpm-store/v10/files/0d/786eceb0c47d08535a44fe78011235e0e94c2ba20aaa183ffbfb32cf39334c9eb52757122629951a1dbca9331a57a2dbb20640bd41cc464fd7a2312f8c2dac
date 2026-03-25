import { OpenAI as OpenAI$1 } from "openai";
import { ServerTool } from "@langchain/core/tools";

//#region src/tools/fileSearch.d.ts

/**
 * Comparison operators for file attribute filtering.
 */
type FileSearchComparisonType = "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
/**
 * A filter used to compare a specified attribute key to a given value.
 */
interface FileSearchComparisonFilter {
  /**
   * The comparison operator to use.
   * - `eq`: equals
   * - `ne`: not equal
   * - `gt`: greater than
   * - `gte`: greater than or equal
   * - `lt`: less than
   * - `lte`: less than or equal
   */
  type: FileSearchComparisonType;
  /**
   * The attribute key to compare against.
   */
  key: string;
  /**
   * The value to compare against the attribute key.
   * Supports string, number, boolean, or array of strings/numbers.
   */
  value: string | number | boolean | Array<string | number>;
}
/**
 * Combine multiple filters using `and` or `or`.
 */
interface FileSearchCompoundFilter {
  /**
   * Type of operation: `and` or `or`.
   */
  type: "and" | "or";
  /**
   * Array of filters to combine.
   */
  filters: Array<FileSearchComparisonFilter | FileSearchCompoundFilter>;
}
/**
 * Filter type for file search - can be a comparison or compound filter.
 */
type FileSearchFilter = FileSearchComparisonFilter | FileSearchCompoundFilter;
/**
 * Weights for hybrid search balancing semantic and keyword matches.
 */
interface FileSearchHybridSearchWeights {
  /**
   * The weight of semantic embedding matches (0-1).
   */
  embeddingWeight: number;
  /**
   * The weight of keyword/text matches (0-1).
   */
  textWeight: number;
}
/**
 * Ranking options for file search results.
 */
interface FileSearchRankingOptions {
  /**
   * The ranker to use for the file search.
   * - `auto`: Automatically select the best ranker
   * - `default-2024-11-15`: Default ranker as of November 2024
   */
  ranker?: "auto" | "default-2024-11-15";
  /**
   * The score threshold for results (0-1).
   * Numbers closer to 1 return only the most relevant results but may return fewer.
   */
  scoreThreshold?: number;
  /**
   * Weights that control how reciprocal rank fusion balances semantic
   * embedding matches versus sparse keyword matches when hybrid search is enabled.
   */
  hybridSearch?: FileSearchHybridSearchWeights;
}
/**
 * Options for the File Search tool.
 */
interface FileSearchOptions {
  /**
   * The IDs of the vector stores to search.
   * You must have previously created vector stores and uploaded files to them.
   */
  vectorStoreIds: string[];
  /**
   * The maximum number of results to return.
   * Must be between 1 and 50 inclusive.
   */
  maxNumResults?: number;
  /**
   * A filter to apply based on file attributes/metadata.
   * Use this to narrow down search results to specific categories or file types.
   */
  filters?: FileSearchFilter;
  /**
   * Ranking options to customize how results are scored and ordered.
   */
  rankingOptions?: FileSearchRankingOptions;
}
/**
 * OpenAI File Search tool type for the Responses API.
 */
type FileSearchTool = OpenAI$1.Responses.FileSearchTool;
/**
 * Creates a File Search tool that allows models to search your files
 * for relevant information using semantic and keyword search.
 *
 * File Search enables models to retrieve information from a knowledge base
 * of previously uploaded files stored in vector stores. This is a hosted tool
 * managed by OpenAI - you don't need to implement the search execution yourself.
 *
 * **Prerequisites**: Before using File Search, you must:
 * 1. Upload files to the File API with `purpose: "assistants"`
 * 2. Create a vector store
 * 3. Add files to the vector store
 *
 * @see {@link https://platform.openai.com/docs/guides/tools-file-search | OpenAI File Search Documentation}
 *
 * @param options - Configuration options for the File Search tool
 * @returns A File Search tool definition to be passed to the OpenAI Responses API
 *
 * @example
 * ```typescript
 * import { ChatOpenAI, tools } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({ model: "gpt-4.1" });
 *
 * // Basic usage with a vector store
 * const response = await model.invoke(
 *   "What is deep research by OpenAI?",
 *   {
 *     tools: [tools.fileSearch({
 *       vectorStoreIds: ["vs_abc123"]
 *     })]
 *   }
 * );
 *
 * // Limit the number of results for lower latency
 * const response = await model.invoke(
 *   "Find information about pricing",
 *   {
 *     tools: [tools.fileSearch({
 *       vectorStoreIds: ["vs_abc123"],
 *       maxNumResults: 5
 *     })]
 *   }
 * );
 *
 * // With metadata filtering
 * const response = await model.invoke(
 *   "Find recent blog posts about AI",
 *   {
 *     tools: [tools.fileSearch({
 *       vectorStoreIds: ["vs_abc123"],
 *       filters: {
 *         type: "eq",
 *         key: "category",
 *         value: "blog"
 *       }
 *     })]
 *   }
 * );
 *
 * // With compound filters (AND/OR)
 * const response = await model.invoke(
 *   "Find technical docs from 2024",
 *   {
 *     tools: [tools.fileSearch({
 *       vectorStoreIds: ["vs_abc123"],
 *       filters: {
 *         type: "and",
 *         filters: [
 *           { type: "eq", key: "category", value: "technical" },
 *           { type: "gte", key: "year", value: 2024 }
 *         ]
 *       }
 *     })]
 *   }
 * );
 *
 * // With ranking options for more relevant results
 * const response = await model.invoke(
 *   "Find the most relevant information",
 *   {
 *     tools: [tools.fileSearch({
 *       vectorStoreIds: ["vs_abc123"],
 *       rankingOptions: {
 *         scoreThreshold: 0.8,
 *         ranker: "auto"
 *       }
 *     })]
 *   }
 * );
 *
 * // Search multiple vector stores
 * const response = await model.invoke(
 *   "Search across all knowledge bases",
 *   {
 *     tools: [tools.fileSearch({
 *       vectorStoreIds: ["vs_abc123", "vs_def456"]
 *     })]
 *   }
 * );
 * ```
 *
 * @remarks
 * - Vector stores must be created and populated before using this tool
 * - The tool returns file citations in the response annotations
 * - Use `include: ["file_search_call.results"]` in the API call to get search results
 * - Supported file types include PDF, DOCX, TXT, MD, and many code file formats
 */
declare function fileSearch(options: FileSearchOptions): ServerTool;
//#endregion
export { FileSearchComparisonFilter, FileSearchComparisonType, FileSearchCompoundFilter, FileSearchFilter, FileSearchHybridSearchWeights, FileSearchOptions, FileSearchRankingOptions, FileSearchTool, fileSearch };
//# sourceMappingURL=fileSearch.d.ts.map