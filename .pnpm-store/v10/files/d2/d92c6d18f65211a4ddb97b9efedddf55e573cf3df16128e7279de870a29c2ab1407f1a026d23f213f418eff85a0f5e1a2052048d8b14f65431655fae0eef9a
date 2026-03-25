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
import { CachedContent, ModelParams, RequestOptions } from "../types";
import { GenerativeModel } from "./models/generative-model";
export { ChatSession } from "./methods/chat-session";
export { GenerativeModel };
/**
 * Top-level class for this SDK
 * @public
 */
export declare class GoogleGenerativeAI {
    apiKey: string;
    constructor(apiKey: string);
    /**
     * Gets a {@link GenerativeModel} instance for the provided model name.
     */
    getGenerativeModel(modelParams: ModelParams, requestOptions?: RequestOptions): GenerativeModel;
    /**
     * Creates a {@link GenerativeModel} instance from provided content cache.
     */
    getGenerativeModelFromCachedContent(cachedContent: CachedContent, modelParams?: Partial<ModelParams>, requestOptions?: RequestOptions): GenerativeModel;
}
