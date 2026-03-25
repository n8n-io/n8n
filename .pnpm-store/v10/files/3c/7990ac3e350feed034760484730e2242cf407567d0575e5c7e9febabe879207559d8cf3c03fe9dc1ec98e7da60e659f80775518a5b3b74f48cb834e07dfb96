
//#region src/tools/fileSearch.ts
/**
* Converts ranking options to the API format.
*/
function convertRankingOptions(options) {
	if (!options) return void 0;
	return {
		ranker: options.ranker,
		score_threshold: options.scoreThreshold,
		hybrid_search: options.hybridSearch ? {
			embedding_weight: options.hybridSearch.embeddingWeight,
			text_weight: options.hybridSearch.textWeight
		} : void 0
	};
}
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
function fileSearch(options) {
	return {
		type: "file_search",
		vector_store_ids: options.vectorStoreIds,
		max_num_results: options.maxNumResults,
		filters: options.filters,
		ranking_options: convertRankingOptions(options.rankingOptions)
	};
}

//#endregion
exports.fileSearch = fileSearch;
//# sourceMappingURL=fileSearch.cjs.map