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
import type { CreateModelParams, DeleteModelParams, GetModelParams, ListAllModelsParams, ListProviderModelsParams } from "./types/models/request.mjs";
import type { EmptyObject } from "../types/common.mjs";
import type { Model, ModelCollection } from "./types/models/response.mjs";
import { GatewayResource } from "./resources.mjs";
import type { Response } from "../base/types/base.mjs";
/** Models class for handling model-related operations. */
export declare class Models extends GatewayResource {
    /**
     * Add Model.
     *
     * Adds a new model configuration for the specified provider.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.providerId - Provider ID.
     * @param {string} params.modelId - The official provider-specific server-side unique identifier
     *   of the model instance.
     * @param {string} [params.alias] - The aliased name of the model. If set, this is the name that
     *   should be used by clients to refer to that model in a more convenient or custom manner. When
     *   a client provides the alias instead of the official name, the middleware will map the alias
     *   back to the underlying `id` (e.g., `"gpt-o"`) and execute requests against the correct
     *   model.
     * @param {Metadata} [params.metadata] - Contains additional configuration for the model.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<Model>>} - A promise that resolves with the created model.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    create(params: CreateModelParams): Promise<Response<Model>>;
    /**
     * Get a Model.
     *
     * Retrieves a specific model configuration or muliple models configurations by model id or
     * provider id.
     *
     * @param {GetModelParams | ListProviderModelsParams | ListAllModelsParams} params
     *
     *   - The parameters to send to the service.
     *
     * @param {string} params.modelId - Model id.
     * @param {string} [params.providerId] - Provider id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<Model | ModelCollection>>} -
     *
     *   A promise that resolves with the model details or collection.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    getDetails(params: GetModelParams): Promise<Response<Model>>;
    getDetails(params?: ListProviderModelsParams | ListAllModelsParams): Promise<Response<ModelCollection>>;
    /**
     * List all models or models for a specific provider.
     *
     * @param {ListAllModelsParams} [params] - Parameters for listing all models or models for a
     *   provider.
     * @param {string} [params.providerId] - Provider id
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Model[]>} - A promise that resolves with the list of models.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    list(params?: ListAllModelsParams): Promise<Model[]>;
    /**
     * Delete Model.
     *
     * Removes a specific model configuration from the tenant by id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - Model id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<EmptyObject>} - A promise that resolves with an empty object.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    delete(params: DeleteModelParams): Promise<Response<EmptyObject>>;
}
//# sourceMappingURL=models.d.mts.map