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
import { GatewayResource } from "./resources.js";
import type { EmptyObject } from "../types/common.js";
import type { ListProviderAvailableModelsParams } from "./types/models/request.js";
import type { CreateProviderParams, DeleteProviderParams, GetProviderParams, ListProvidersParams, UpdateProviderParams } from "./types/providers/request.js";
import type { AvailableModel, AvailableModelCollection, Provider, ProviderCollection, ProviderResponse } from "./types/providers/response.js";
import type { Response } from "../base/types/base.js";
/**
 * Class representing the Providers resource. This class provides methods to interact with ML
 * Gateway providers.
 */
export declare class Providers extends GatewayResource {
    /**
     * @param {CreateProviderParams} params - The parameters to send to the service.
     * @param {string} params.providerName - Name of the selected provider. Allowed names: watsonxai,
     *   anthropic, openai, nim, azure-openai, bedrock, cerebas
     * @param {string} params.name - Name can only contain alphanumeric characters, single spaces (no
     *   consecutive spaces), hyphens (-), parentheses (), and square brackets []. No leading or
     *   trailing spaces are allowed.
     * @param {Object} [params.dataReference] - Data Reference is a reference to a remote credential
     *   store. For example, an IBM Cloud Secrets Manager secret. The Value in the remote store is
     *   expected to be a JSON representation of the Data field.
     * @param {Object} [params.data] - Contains the credential details for configuring the provider
     *   instance. Available only on IBM watsonx.ai software.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<ProviderResponse>>} Resolves with the response from the server.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    create(params: CreateProviderParams): Promise<Response<ProviderResponse>>;
    /**
     * Get Provider's details by id.
     *
     * Retrieves the details of a specific provider.
     *
     * @param {GetProviderParams | ListProvidersParams} params
     *
     *   - The parameters to send to the service.
     *
     * @param {string} params.providerId - Provider id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<Provider | ProviderCollection>>} Resolves with the response from the
     *   server.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    getDetails(params: GetProviderParams): Promise<Response<Provider>>;
    getDetails(params?: ListProvidersParams): Promise<Response<ProviderCollection>>;
    /**
     * Get available models' details.
     *
     * Get all models available for the specified provider.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.providerId - Provider id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<AvailableModelCollection>>} Resolves with the list of available
     *   models' details.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    getAvailableModelsDetails(params: ListProviderAvailableModelsParams): Promise<Response<AvailableModelCollection>>;
    /**
     * Update provider
     *
     * Updates an existing provider.
     *
     * @param {UpdateProviderParams} params - The parameters to send to the service.
     * @param {string} params.providerName - Name of the selected provider. Allowed names: watsonxai,
     *   anthropic, openai, nim, azure-openai, bedrock, cerebas
     * @param {string} params.providerId - Id of selected provider to be updated
     * @param {string} params.name - Name can only contain alphanumeric characters, single spaces (no
     *   consecutive spaces), hyphens (-), parentheses (), and square brackets []. No leading or
     *   trailing spaces are allowed.
     * @param {Object} [params.dataReference] - Data Reference is a reference to a remote credential
     *   store. For example, an IBM Cloud Secrets Manager secret. The Value in the remote store is
     *   expected to be a JSON representation of the Data field.
     * @param {Object} [params.data] - Contains the credential details for configuring the provider
     *   instance. Available only on IBM watsonx.ai software.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<ProviderResponse>>} Resolves with the response from the server.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    update(params: UpdateProviderParams): Promise<Response<ProviderResponse>>;
    /**
     * Delete Provider.
     *
     * Deletes the specified provider.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.providerId - Provider id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<EmptyObject>} Resolves with an empty object on success.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    delete(params: DeleteProviderParams): Promise<Response<EmptyObject>>;
    /**
     * List all providers or a specific provider by ID.
     *
     * @param {Object} [params] - Parameters for listing providers or getting a specific provider.
     * @param {string} [params.providerId] - Provider id.
     * @returns {Promise<Provider[]>} Resolves with the list of providers or a single provider.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    list(params?: ListProvidersParams): Promise<Provider[]>;
    /**
     * List available models for a provider.
     *
     * @param {Object} params - Parameters for listing available models.
     * @param {string} params.providerId - Provider id.
     * @returns {Promise<AvailableModel[]>} Resolves with the list of available models.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    listAvailableModels(params: ListProviderAvailableModelsParams): Promise<AvailableModel[]>;
}
//# sourceMappingURL=providers.d.ts.map