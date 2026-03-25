/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { DynamicRetrievalMode } from "./enums";
/**
 * Retrieval tool that is powered by Google search.
 * @public
 */
export declare interface GoogleSearchRetrievalTool {
    /**
     * Google search retrieval tool config.
     */
    googleSearchRetrieval?: GoogleSearchRetrieval;
}
/**
 * Retrieval tool that is powered by Google search.
 * @public
 */
export declare interface GoogleSearchRetrieval {
    /**
     * Specifies the dynamic retrieval configuration for the given source.
     */
    dynamicRetrievalConfig?: DynamicRetrievalConfig;
}
/**
 * Specifies the dynamic retrieval configuration for the given source.
 * @public
 */
export declare interface DynamicRetrievalConfig {
    /**
     * The mode of the predictor to be used in dynamic retrieval.
     */
    mode?: DynamicRetrievalMode;
    /**
     * The threshold to be used in dynamic retrieval. If not set, a system default
     * value is used.
     */
    dynamicThreshold?: number;
}
/**
 * Metadata returned to client when grounding is enabled.
 * @public
 */
export declare interface GroundingMetadata {
    /**
     * Google search entry for the following-up web searches.
     */
    searchEntryPoint?: SearchEntryPoint;
    /**
     * List of supporting references retrieved from specified grounding source.
     */
    groundingChunks?: GroundingChunk[];
    /**
     * List of grounding support.
     */
    groundingSupports?: GroundingSupport[];
    /**
     * Metadata related to retrieval in the grounding flow.
     */
    retrievalMetadata?: RetrievalMetadata;
    /**
     * * Web search queries for the following-up web search.
     */
    webSearchQueries: string[];
}
/**
 * Google search entry point.
 * @public
 */
export declare interface SearchEntryPoint {
    /**
     * Web content snippet that can be embedded in a web page or an app webview.
     */
    renderedContent?: string;
    /**
     * Base64 encoded JSON representing array of <search term, search url> tuple.
     */
    sdkBlob?: string;
}
/**
 * Grounding chunk.
 * @public
 */
export declare interface GroundingChunk {
    /**
     *  Chunk from the web.
     */
    web?: GroundingChunkWeb;
}
/**
 * Chunk from the web.
 * @public
 */
export declare interface GroundingChunkWeb {
    /**
     * URI reference of the chunk.
     */
    uri?: string;
    /**
     * Title of the chunk.
     */
    title?: string;
}
/**
 * Grounding support.
 * @public
 */
export declare interface GroundingSupport {
    /**
     * URI reference of the chunk.
     */
    segment?: string;
    /**
     * A list of indices (into 'grounding_chunk') specifying the citations
     * associated with the claim. For instance [1,3,4] means that
     * grounding_chunk[1], grounding_chunk[3], grounding_chunk[4] are the
     * retrieved content attributed to the claim.
     */
    groundingChunckIndices?: number[];
    /**
     * Confidence score of the support references. Ranges from 0 to 1. 1 is the
     * most confident. This list must have the same size as the
     * grounding_chunk_indices.
     */
    confidenceScores?: number[];
}
/**
 * Segment of the content.
 * @public
 */
export declare interface GroundingSupportSegment {
    /**
     * The index of a Part object within its parent Content object.
     */
    partIndex?: number;
    /**
     * Start index in the given Part, measured in bytes. Offset from the start of
     * the Part, inclusive, starting at zero.
     */
    startIndex?: number;
    /**
     * End index in the given Part, measured in bytes. Offset from the start of
     * the Part, exclusive, starting at zero.
     */
    endIndex?: number;
    /**
     * The text corresponding to the segment from the response.
     */
    text?: string;
}
/**
 * Metadata related to retrieval in the grounding flow.
 * @public
 */
export declare interface RetrievalMetadata {
    /**
     * Score indicating how likely information from google search could help
     * answer the prompt. The score is in the range [0, 1], where 0 is the least
     * likely and 1 is the most likely. This score is only populated when google
     * search grounding and dynamic retrieval is enabled. It will becompared to
     * the threshold to determine whether to trigger google search.
     */
    googleSearchDynamicRetrievalScore?: number;
}
