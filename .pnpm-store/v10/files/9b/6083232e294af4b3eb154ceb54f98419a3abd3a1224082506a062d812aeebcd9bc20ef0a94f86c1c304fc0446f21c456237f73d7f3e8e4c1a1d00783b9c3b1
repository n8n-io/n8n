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
import type { Collection } from "../../../types/common.js";
import type { Metadata } from "../gateway.js";
/**
 * Configuration for a model, Large Language Model (LLM) or otherwise, that's available through a
 * configured model provider. For example, `id` could be set to "gpt-o", which is the official
 * server-side name of the model. The `alias` field can be used by clients to refer to that model in
 * a more convenient or custom manner. When a client provides the alias instead of the official
 * name, the middleware will map the alias back to the underlying `id` (e.g., `"gpt-o"`) and execute
 * requests against the correct model.
 */
export interface Model {
    /** The object type, which is always "model". */
    object?: string;
    /** The unique identifier for the model. */
    uuid?: string;
    /** The Unix timestamp (in seconds) when the model configuration was created. */
    created?: number;
    /** The provider that owns the model. Format: "provider type:provider name". */
    owned_by?: string;
    /** The official provider-specific server-side unique identifier of the model instance. */
    id?: string;
    /**
     * The aliased name of the model. If set, this is the name that should be used by clients to refer
     * to that model in a more convenient or custom manner. When a client provides the alias instead
     * of the official name, the middleware will map the alias back to the underlying `id` (e.g.,
     * `"gpt-o"`) and execute requests against the correct model.
     */
    alias?: string;
    /** Contains additional configuration for the model. */
    metadata?: Metadata;
}
/** A list of models. */
export interface ModelCollection extends Collection<Model> {
}
export declare namespace ModelRouter {
    namespace Constants {
        /** Model selection optimization parameter. Options are `"efficacy"` (default) and `"cost"`. */
        enum Optimization {
            COST = "cost",
            EFFICACY = "efficacy"
        }
    }
}
/** Router is the model routing configuration for the request. */
export interface ModelRouter {
    /** Model families to include into the assessment in the case of smart routing. */
    family_model?: string[];
    /** Maximum cost of the model to include into the assessment in the case of smart routing. */
    max_cost?: number;
    /** Model names to include into the assessment in the case of smart routing. */
    models?: string[];
    /** Model selection optimization parameter. Options are `"efficacy"` (default) and `"cost"`. */
    optimization?: ModelRouter.Constants.Optimization | string;
    /**
     * How much of quality possible to sacrifice during most optimal model selection, value between 0
     * and 1. Where, e.g. `0.8` means the quality can be reduced by 20%.
     */
    quality_tradeoff?: number;
    /** The region of the model to include into the assessment in the case of smart routing. */
    region?: string;
}
//# sourceMappingURL=response.d.ts.map