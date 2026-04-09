/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
import type { DefaultParams } from "../../../types/common.js";
/**
 * Input text to embed, encoded as a string, array of strings, array of integers, or array of
 * integer arrays. The input must not exceed the max input tokens for the model (8192 tokens for
 * OpenAI's `text-embedding-ada-002`) and cannot be an empty string. Any array must be 2048
 * dimensions or less. Some models may also impose a limit on total number of tokens summed across
 * inputs.
 */
export type EmbeddingsInput = string | string[] | number[] | number[][];
/** Parameters for the `createEmbeddings` operation. */
export interface CreateEmbeddingsParams extends DefaultParams {
    /**
     * Input text to embed, encoded as a string, array of strings, array of integers, or array of
     * integer arrays. The input must not exceed the max input tokens for the model (8192 tokens for
     * OpenAI's `text-embedding-ada-002`) and cannot be an empty string. Any array must be 2048
     * dimensions or less. Some models may also impose a limit on total number of tokens summed across
     * inputs.
     */
    input: EmbeddingsInput;
    /** ID of the model to use. */
    model: string;
    /**
     * Number of dimensions the resulting output embeddings should have. For OpenAI, only supported in
     * `text-embedding-3` and later models.
     */
    dimensions?: number;
    /** Format to return the embeddings in. Can be either `"float"` or `"base64"`. */
    encodingFormat?: string;
    /** A unique identifier representing your end-user. */
    user?: string;
}
//# sourceMappingURL=request.d.ts.map