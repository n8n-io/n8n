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
import { BatchEmbedContentsRequest, BatchEmbedContentsResponse, CachedContent, Content, CountTokensRequest, CountTokensResponse, EmbedContentRequest, EmbedContentResponse, GenerateContentRequest, GenerateContentResult, GenerateContentStreamResult, GenerationConfig, ModelParams, Part, RequestOptions, SafetySetting, SingleRequestOptions, StartChatParams, Tool, ToolConfig } from "../../types";
import { ChatSession } from "../methods/chat-session";
/**
 * Class for generative model APIs.
 * @public
 */
export declare class GenerativeModel {
    apiKey: string;
    private _requestOptions;
    model: string;
    generationConfig: GenerationConfig;
    safetySettings: SafetySetting[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: Content;
    cachedContent: CachedContent;
    constructor(apiKey: string, modelParams: ModelParams, _requestOptions?: RequestOptions);
    /**
     * Makes a single non-streaming call to the model
     * and returns an object containing a single {@link GenerateContentResponse}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    generateContent(request: GenerateContentRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<GenerateContentResult>;
    /**
     * Makes a single streaming call to the model and returns an object
     * containing an iterable stream that iterates over all chunks in the
     * streaming response as well as a promise that returns the final
     * aggregated response.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    generateContentStream(request: GenerateContentRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<GenerateContentStreamResult>;
    /**
     * Gets a new {@link ChatSession} instance which can be used for
     * multi-turn chats.
     */
    startChat(startChatParams?: StartChatParams): ChatSession;
    /**
     * Counts the tokens in the provided request.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    countTokens(request: CountTokensRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<CountTokensResponse>;
    /**
     * Embeds the provided content.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    embedContent(request: EmbedContentRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<EmbedContentResponse>;
    /**
     * Embeds an array of {@link EmbedContentRequest}s.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    batchEmbedContents(batchEmbedContentRequest: BatchEmbedContentsRequest, requestOptions?: SingleRequestOptions): Promise<BatchEmbedContentsResponse>;
}
