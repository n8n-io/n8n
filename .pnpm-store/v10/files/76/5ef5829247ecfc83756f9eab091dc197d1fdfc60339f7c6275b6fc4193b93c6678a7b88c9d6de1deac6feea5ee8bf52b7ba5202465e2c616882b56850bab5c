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
import { EnhancedGenerateContentResponse, FunctionCall, GenerateContentResponse } from "../../types";
/**
 * Adds convenience helper methods to a response object, including stream
 * chunks (as long as each chunk is a complete GenerateContentResponse JSON).
 */
export declare function addHelpers(response: GenerateContentResponse): EnhancedGenerateContentResponse;
/**
 * Returns all text found in all parts of first candidate.
 */
export declare function getText(response: GenerateContentResponse): string;
/**
 * Returns functionCall of first candidate.
 */
export declare function getFunctionCalls(response: GenerateContentResponse): FunctionCall[];
export declare function formatBlockErrorMessage(response: GenerateContentResponse): string;
