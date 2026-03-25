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
import { RequestOptions, SingleRequestOptions } from "../../types";
export declare const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
export declare const DEFAULT_API_VERSION = "v1beta";
export declare enum Task {
    GENERATE_CONTENT = "generateContent",
    STREAM_GENERATE_CONTENT = "streamGenerateContent",
    COUNT_TOKENS = "countTokens",
    EMBED_CONTENT = "embedContent",
    BATCH_EMBED_CONTENTS = "batchEmbedContents"
}
export declare class RequestUrl {
    model: string;
    task: Task;
    apiKey: string;
    stream: boolean;
    requestOptions: RequestOptions;
    constructor(model: string, task: Task, apiKey: string, stream: boolean, requestOptions: RequestOptions);
    toString(): string;
}
/**
 * Simple, but may become more complex if we add more versions to log.
 */
export declare function getClientHeaders(requestOptions: RequestOptions): string;
export declare function getHeaders(url: RequestUrl): Promise<Headers>;
export declare function constructModelRequest(model: string, task: Task, apiKey: string, stream: boolean, body: string, requestOptions: SingleRequestOptions): Promise<{
    url: string;
    fetchOptions: RequestInit;
}>;
export declare function makeModelRequest(model: string, task: Task, apiKey: string, stream: boolean, body: string, requestOptions?: SingleRequestOptions, fetchFn?: typeof fetch): Promise<Response>;
export declare function makeRequest(url: string, fetchOptions: RequestInit, fetchFn?: typeof fetch): Promise<Response>;
