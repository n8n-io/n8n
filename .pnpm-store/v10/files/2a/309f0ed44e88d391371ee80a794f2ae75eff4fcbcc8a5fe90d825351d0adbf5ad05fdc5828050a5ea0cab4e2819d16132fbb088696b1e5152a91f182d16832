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
import { Content, FunctionCall } from "./content";
import { BlockReason, FinishReason, HarmCategory, HarmProbability } from "./enums";
import { GroundingMetadata } from "./search-grounding";
/**
 * Result object returned from generateContent() call.
 *
 * @public
 */
export interface GenerateContentResult {
    response: EnhancedGenerateContentResponse;
}
/**
 * Result object returned from generateContentStream() call.
 * Iterate over `stream` to get chunks as they come in and/or
 * use the `response` promise to get the aggregated response when
 * the stream is done.
 *
 * @public
 */
export interface GenerateContentStreamResult {
    stream: AsyncGenerator<EnhancedGenerateContentResponse>;
    response: Promise<EnhancedGenerateContentResponse>;
}
/**
 * Response object wrapped with helper methods.
 *
 * @public
 */
export interface EnhancedGenerateContentResponse extends GenerateContentResponse {
    /**
     * Returns the text string assembled from all `Part`s of the first candidate
     * of the response, if available.
     * Throws if the prompt or candidate was blocked.
     */
    text: () => string;
    /**
     * Deprecated: use `functionCalls()` instead.
     * @deprecated - use `functionCalls()` instead
     */
    functionCall: () => FunctionCall | undefined;
    /**
     * Returns function calls found in any `Part`s of the first candidate
     * of the response, if available.
     * Throws if the prompt or candidate was blocked.
     */
    functionCalls: () => FunctionCall[] | undefined;
}
/**
 * Individual response from {@link GenerativeModel.generateContent} and
 * {@link GenerativeModel.generateContentStream}.
 * `generateContentStream()` will return one in each chunk until
 * the stream is done.
 * @public
 */
export interface GenerateContentResponse {
    /** Candidate responses from the model. */
    candidates?: GenerateContentCandidate[];
    /** The prompt's feedback related to the content filters. */
    promptFeedback?: PromptFeedback;
    /** Metadata on the generation request's token usage. */
    usageMetadata?: UsageMetadata;
}
/**
 * Logprobs Result
 * @public
 */
export interface LogprobsResult {
    /** Length = total number of decoding steps. */
    topCandidates: TopCandidates[];
    /**
     * Length = total number of decoding steps.
     * The chosen candidates may or may not be in topCandidates.
     */
    chosenCandidates: LogprobsCandidate[];
}
/**
 * Candidate for the logprobs token and score.
 * @public
 */
export interface LogprobsCandidate {
    /** The candidate's token string value. */
    token: string;
    /** The candidate's token id value. */
    tokenID: number;
    /** The candidate's log probability. */
    logProbability: number;
}
/**
 * Candidates with top log probabilities at each decoding step
 */
export interface TopCandidates {
    /** Sorted by log probability in descending order. */
    candidates: LogprobsCandidate[];
}
/**
 * Metadata on the generation request's token usage.
 * @public
 */
export interface UsageMetadata {
    /** Number of tokens in the prompt. */
    promptTokenCount: number;
    /** Total number of tokens across the generated candidates. */
    candidatesTokenCount: number;
    /** Total token count for the generation request (prompt + candidates). */
    totalTokenCount: number;
    /** Total token count in the cached part of the prompt, i.e. in the cached content. */
    cachedContentTokenCount?: number;
}
/**
 * If the prompt was blocked, this will be populated with `blockReason` and
 * the relevant `safetyRatings`.
 * @public
 */
export interface PromptFeedback {
    blockReason: BlockReason;
    safetyRatings: SafetyRating[];
    blockReasonMessage?: string;
}
/**
 * A candidate returned as part of a {@link GenerateContentResponse}.
 * @public
 */
export interface GenerateContentCandidate {
    index: number;
    content: Content;
    finishReason?: FinishReason;
    finishMessage?: string;
    safetyRatings?: SafetyRating[];
    citationMetadata?: CitationMetadata;
    /** Average log probability score of the candidate. */
    avgLogprobs?: number;
    /** Log-likelihood scores for the response tokens and top tokens. */
    logprobsResult?: LogprobsResult;
    /** Search grounding metadata. */
    groundingMetadata?: GroundingMetadata;
}
/**
 * Citation metadata that may be found on a {@link GenerateContentCandidate}.
 * @public
 */
export interface CitationMetadata {
    citationSources: CitationSource[];
}
/**
 * A single citation source.
 * @public
 */
export interface CitationSource {
    startIndex?: number;
    endIndex?: number;
    uri?: string;
    license?: string;
}
/**
 * A safety rating associated with a {@link GenerateContentCandidate}
 * @public
 */
export interface SafetyRating {
    category: HarmCategory;
    probability: HarmProbability;
}
/**
 * Response from calling {@link GenerativeModel.countTokens}.
 * @public
 */
export interface CountTokensResponse {
    totalTokens: number;
}
/**
 * Response from calling {@link GenerativeModel.embedContent}.
 * @public
 */
export interface EmbedContentResponse {
    embedding: ContentEmbedding;
}
/**
 * Response from calling {@link GenerativeModel.batchEmbedContents}.
 * @public
 */
export interface BatchEmbedContentsResponse {
    embeddings: ContentEmbedding[];
}
/**
 * A single content embedding.
 * @public
 */
export interface ContentEmbedding {
    values: number[];
}
/**
 * Details object that may be included in an error response.
 * @public
 */
export interface ErrorDetails {
    "@type"?: string;
    reason?: string;
    domain?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
