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
import { CachedContent } from "./server/caching";
import { Content, Part } from "./content";
import { HarmBlockThreshold, HarmCategory, TaskType } from "./enums";
import { FunctionDeclarationsTool, ResponseSchema, ToolConfig } from "./function-calling";
import { GoogleSearchRetrievalTool } from "./search-grounding";
/**
 * Base parameters for a number of methods.
 * @public
 */
export interface BaseParams {
    safetySettings?: SafetySetting[];
    generationConfig?: GenerationConfig;
}
/**
 * Params passed to {@link GoogleGenerativeAI.getGenerativeModel}.
 * @public
 */
export interface ModelParams extends BaseParams {
    model: string;
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    cachedContent?: CachedContent;
}
/**
 * Request sent to `generateContent` endpoint.
 * @public
 */
export interface GenerateContentRequest extends BaseParams {
    contents: Content[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    /**
     * This is the name of a `CachedContent` and not the cache object itself.
     */
    cachedContent?: string;
}
/**
 * Request sent to `generateContent` endpoint.
 * @internal
 */
export interface _GenerateContentRequestInternal extends GenerateContentRequest {
    model?: string;
}
/**
 * Safety setting that can be sent as part of request parameters.
 * @public
 */
export interface SafetySetting {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
}
/**
 * Config options for content-related requests
 * @public
 */
export interface GenerationConfig {
    candidateCount?: number;
    stopSequences?: string[];
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    /**
     * Output response mimetype of the generated candidate text.
     * Supported mimetype:
     *   `text/plain`: (default) Text output.
     *   `application/json`: JSON response in the candidates.
     */
    responseMimeType?: string;
    /**
     * Output response schema of the generated candidate text.
     * Note: This only applies when the specified `responseMIMEType` supports a schema; currently
     * this is limited to `application/json`.
     */
    responseSchema?: ResponseSchema;
    /**
     * Presence penalty applied to the next token's logprobs if the token has
     * already been seen in the response.
     */
    presencePenalty?: number;
    /**
     * Frequency penalty applied to the next token's logprobs, multiplied by the
     * number of times each token has been seen in the respponse so far.
     */
    frequencyPenalty?: number;
    /**
     * If True, export the logprobs results in response.
     */
    responseLogprobs?: boolean;
    /**
     * Valid if responseLogProbs is set to True. This will set the number of top
     * logprobs to return at each decoding step in the logprobsResult.
     */
    logprobs?: number;
}
/**
 * Params for {@link GenerativeModel.startChat}.
 * @public
 */
export interface StartChatParams extends BaseParams {
    history?: Content[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    /**
     * This is the name of a `CachedContent` and not the cache object itself.
     */
    cachedContent?: string;
}
/**
 * Params for calling {@link GenerativeModel.countTokens}.
 *
 * The request must contain either a {@link Content} array or a
 * {@link GenerateContentRequest}, but not both. If both are provided
 * then a {@link GoogleGenerativeAIRequestInputError} is thrown.
 *
 * @public
 */
export interface CountTokensRequest {
    generateContentRequest?: GenerateContentRequest;
    contents?: Content[];
}
/**
 * Params for calling {@link GenerativeModel.countTokens}
 * @internal
 */
export interface _CountTokensRequestInternal {
    generateContentRequest?: _GenerateContentRequestInternal;
    contents?: Content[];
}
/**
 * Params for calling {@link GenerativeModel.embedContent}
 * @public
 */
export interface EmbedContentRequest {
    content: Content;
    taskType?: TaskType;
    title?: string;
}
/**
 * Params for calling  {@link GenerativeModel.batchEmbedContents}
 * @public
 */
export interface BatchEmbedContentsRequest {
    requests: EmbedContentRequest[];
}
/**
 * Params passed to getGenerativeModel() or GoogleAIFileManager().
 * @public
 */
export interface RequestOptions {
    /**
     * Request timeout in milliseconds.
     */
    timeout?: number;
    /**
     * Version of API endpoint to call (e.g. "v1" or "v1beta"). If not specified,
     * defaults to latest stable version.
     */
    apiVersion?: string;
    /**
     * Additional attribution information to include in the x-goog-api-client header.
     * Used by wrapper SDKs.
     */
    apiClient?: string;
    /**
     * Base endpoint url. Defaults to "https://generativelanguage.googleapis.com"
     */
    baseUrl?: string;
    /**
     * Custom HTTP request headers.
     */
    customHeaders?: Headers | Record<string, string>;
}
/**
 * Params passed to atomic asynchronous operations.
 * @public
 */
export interface SingleRequestOptions extends RequestOptions {
    /**
     * An object that may be used to abort asynchronous requests. The request may
     * also be aborted due to the expiration of the timeout value, if provided.
     *
     * NOTE: AbortSignal is a client-only operation. Using it to cancel an
     * operation will not cancel the request in the service. You will still
     * be charged usage for any applicable operations.
     */
    signal?: AbortSignal;
}
/**
 * Defines a tool that model can call to access external knowledge.
 * @public
 */
export declare type Tool = FunctionDeclarationsTool | CodeExecutionTool | GoogleSearchRetrievalTool;
/**
 * Enables the model to execute code as part of generation.
 * @public
 */
export interface CodeExecutionTool {
    /**
     * Provide an empty object to enable code execution. This field may have
     * subfields added in the future.
     */
    codeExecution: {};
}
