"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = void 0;
const config_1 = require("../config/index.js");
const resources_1 = require("./resources.js");
const utils_1 = require("./utils/utils.js");
const validators_1 = require("../helpers/validators.js");
/**
 * Class representing the Providers resource. This class provides methods to interact with ML
 * Gateway providers.
 */
class Providers extends resources_1.GatewayResource {
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
    create(params) {
        const requiredParams = ['name', 'providerName'];
        const validParams = ['dataReference', 'data', 'description'];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        (0, utils_1.validateRequiredOneOf)(params, ['dataReference', 'data']);
        const { providerName, dataReference, data, name, signal, headers } = params;
        const path = {
            'provider_name': providerName,
        };
        const body = {
            name,
            data,
            data_reference: dataReference,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.PROVIDER.CREATE,
            body,
            path,
            signal,
            headers,
        };
        return this.client._post(parameters);
    }
    getDetails(params = {}) {
        if ('providerId' in params) {
            const requiredParams = ['providerId'];
            const validParams = [];
            const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const { providerId, signal, headers } = params;
            const path = {
                'provider_id': providerId,
            };
            const parameters = {
                url: config_1.ENDPOINTS.GATEWAY.PROVIDER.BY_ID,
                path,
                signal,
                headers,
            };
            return this.client._get(parameters);
        }
        const requiredParams = [];
        const validParams = [];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { signal, headers } = params;
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.PROVIDER.BASE,
            signal,
            headers,
        };
        return this.client._get(parameters);
    }
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
    getAvailableModelsDetails(params) {
        const requiredParams = ['providerId'];
        const validParams = [];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { signal, headers, providerId } = params;
        const path = {
            'provider_id': providerId,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.PROVIDER.LIST_AVAILABLE_MODELS,
            path,
            signal,
            headers,
        };
        return this.client._get(parameters);
    }
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
    update(params) {
        const requiredParams = ['providerId', 'providerName', 'name'];
        const validParams = ['dataReference', 'data'];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        (0, utils_1.validateRequiredOneOf)(params, ['data', 'dataReference']);
        const { name, providerName, providerId, dataReference, data, signal, headers } = params;
        const body = {
            'name': name,
            'data_reference': dataReference,
            data,
        };
        const path = {
            'provider_id': providerId,
            'provider_name': providerName,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.PROVIDER.UPDATE,
            body,
            path,
            signal,
            headers,
        };
        return this.client._put(parameters);
    }
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
    delete(params) {
        const requiredParams = ['providerId'];
        const validParams = [];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { providerId, signal, headers } = params;
        const path = {
            'provider_id': providerId,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.PROVIDER.BY_ID,
            path,
            signal,
            headers,
        };
        return this.client._delete(parameters);
    }
    /**
     * List all providers or a specific provider by ID.
     *
     * @param {Object} [params] - Parameters for listing providers or getting a specific provider.
     * @param {string} [params.providerId] - Provider id.
     * @returns {Promise<Provider[]>} Resolves with the list of providers or a single provider.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    list(params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = [];
            const validParams = ['providerId'];
            const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const response = yield this.getDetails(params);
            return response.result.data;
        });
    }
    /**
     * List available models for a provider.
     *
     * @param {Object} params - Parameters for listing available models.
     * @param {string} params.providerId - Provider id.
     * @returns {Promise<AvailableModel[]>} Resolves with the list of available models.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    listAvailableModels(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.getAvailableModelsDetails(params);
            return response.result.data;
        });
    }
}
exports.Providers = Providers;
//# sourceMappingURL=providers.js.map