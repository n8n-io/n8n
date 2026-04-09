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
import { ENDPOINTS } from "../config/index.mjs";
import { GatewayResource } from "./resources.mjs";
import { validateRequestParams } from "../helpers/validators.mjs";
/** Models class for handling model-related operations. */
export class Models extends GatewayResource {
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
    create(params) {
        const requiredParams = ['providerId', 'modelId'];
        const validParams = ['alias', 'metadata'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'id': params.modelId,
            'alias': params.alias,
            'metadata': params.metadata,
        };
        const path = {
            'provider_id': params.providerId,
        };
        const parameters = {
            url: ENDPOINTS.GATEWAY.MODEL.LIST_PROVIDER_MODELS,
            body,
            path,
            signal: params.signal,
            headers: params.headers,
        };
        return this.client._post(parameters);
    }
    getDetails(params = {}) {
        if ('modelId' in params) {
            const { modelId, signal, headers } = params;
            const requiredParams = ['modelId'];
            const validParams = [];
            const validationErrors = validateRequestParams(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const path = {
                'model_id': modelId,
            };
            const parameters = {
                url: ENDPOINTS.GATEWAY.MODEL.BY_ID,
                path,
                signal,
                headers,
            };
            return this.client._get(parameters);
        }
        if ('providerId' in params) {
            const { providerId, signal, headers } = params;
            const requiredParams = ['providerId'];
            const validParams = [];
            const validationErrors = validateRequestParams(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const path = {
                'provider_id': providerId,
            };
            const parameters = {
                url: ENDPOINTS.GATEWAY.MODEL.LIST_PROVIDER_MODELS,
                path,
                signal,
                headers,
            };
            return this.client._get(parameters);
        }
        const { signal, headers } = params;
        const requiredParams = [];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const parameters = {
            url: ENDPOINTS.GATEWAY.MODEL.BASE,
            signal,
            headers,
        };
        return this.client._get(parameters);
    }
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
    list(params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (params.providerId) {
                const parameters = Object.assign(Object.assign({}, params), { providerId: params.providerId });
                const response = yield this.getDetails(parameters);
                return response.result.data;
            }
            const response = yield this.getDetails();
            return response.result.data;
        });
    }
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
    delete(params) {
        const requiredParams = ['modelId'];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { modelId, signal, headers } = params;
        const path = {
            'model_id': modelId,
        };
        const parameters = {
            url: ENDPOINTS.GATEWAY.MODEL.BY_ID,
            method: 'DELETE',
            path,
            signal,
            headers,
        };
        return this.client._delete(parameters);
    }
}
//# sourceMappingURL=models.mjs.map