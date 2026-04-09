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
export type CreateRequestFunction = (parameters: any) => Promise<any>;
export interface CompletionsOptions {
}
/** Options for streaming response. Only set this when you set `stream` to `true`. */
export interface StreamOptions {
    /**
     * If set, an additional chunk will be streamed before the data: [DONE] message. The usage field
     * on this chunk shows the token usage statistics for the entire request, and the choices field
     * will always be an empty array. All other chunks will also include a usage field, but with a
     * null value.
     */
    include_usage?: boolean;
}
export interface Metadata {
    /**
     * The cost per 1000 tokens for the model. This represents the pricing in USD for processing 1000
     * tokens. A nil value indicates the cost is not available or applicable.
     */
    cost?: number;
    /**
     * The family or series that this model belongs to. Examples:
     *
     * - "gpt-3.5" for GPT-3.5 series models
     * - "gpt-4" for GPT-4 series models
     * - "llama-2" for Llama 2 series models.
     */
    model_family?: string;
    /**
     * When calling the Recommender API, this value is used to map to the supported model in the
     * Recommender API. For example, "openai-gpt-4o-mini" could be the recommender label for a
     * specific model.
     */
    recommender_label?: string;
    /**
     * The region where this model is deployed in. This indicates the geographical location of the
     * model deployment. Important for data residency requirements and latency considerations.
     */
    region?: string;
}
//# sourceMappingURL=gateway.d.mts.map