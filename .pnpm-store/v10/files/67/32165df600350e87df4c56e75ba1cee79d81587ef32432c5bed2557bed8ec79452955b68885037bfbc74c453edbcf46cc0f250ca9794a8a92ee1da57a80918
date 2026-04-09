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
exports.RateLimits = void 0;
const config_1 = require("../config/index.js");
const resources_1 = require("./resources.js");
const validators_1 = require("../helpers/validators.js");
/**
 * Validates that the required ID parameters are provided based on the rate limit type.
 *
 * @param {Object} params - The validation parameters.
 * @param {string} params.type - The type of rate limit: "tenant", "provider", or "model".
 * @param {string} [params.providerId] - The UUID of the provider (required when type is
 *   "provider").
 * @param {string} [params.modelId] - The UUID of the model (required when type is "model").
 * @returns {Error | undefined} Returns an Error object with a descriptive message if validation
 *   fails, or undefined if validation passes.
 */
function validateIdForType({ type, providerId, modelId, }) {
    if (type === 'model' && !modelId)
        return new Error("Parameter validation errors: Missing parameter `modelId` for `type: 'model'`");
    if (type === 'provider' && !providerId)
        return new Error("Parameter validation errors: Missing parameter `providerId` for `type: 'provider'`");
    return undefined;
}
/**
 * Class representing the RateLimits resource. This class provides methods to manage rate limit
 * configurations for the ML Gateway.
 */
class RateLimits extends resources_1.GatewayResource {
    /**
     * Create Rate Limit.
     *
     * Creates a new rate limit configuration for tenant, provider, or model level.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.type - The type of rate limit: "tenant", "provider", or "model".
     * @param {string} [params.providerId] - The UUID of the provider this rate limit applies to
     *   (required when type is "provider").
     * @param {string} [params.modelId] - The UUID of the model this rate limit applies to (required
     *   when type is "model").
     * @param {RateLimitItem} [params.token] - Token rate limiting settings.
     * @param {RateLimitItem} [params.request] - Request rate limiting settings.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<Record<string, any>>>} - A promise that resolves with the created
     *   rate limit configuration.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    create(params) {
        const requiredParams = ['type'];
        const validParams = ['providerId', 'modelId', 'token', 'request'];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { type, providerId, modelId, token, request, signal, headers } = params;
        const idValidationErrors = validateIdForType({ type, providerId, modelId });
        if (idValidationErrors) {
            return Promise.reject(idValidationErrors);
        }
        const body = { type, providerId, modelId, token, request };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.RATE_LIMIT.BASE,
            body,
            signal,
            headers,
        };
        return this.client._post(parameters);
    }
    /**
     * Update Rate Limit.
     *
     * Updates an existing rate limit configuration.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.type - The type of rate limit: "tenant", "provider", or "model".
     * @param {string} [params.providerId] - The UUID of the provider this rate limit applies to
     *   (required when type is "provider").
     * @param {string} [params.modelId] - The UUID of the model this rate limit applies to (required
     *   when type is "model").
     * @param {RateLimitItem} [params.token] - Token rate limiting settings.
     * @param {RateLimitItem} [params.request] - Request rate limiting settings.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<Record<string, any>>>} - A promise that resolves with the updated
     *   rate limit configuration.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    update(params) {
        const requiredParams = ['type'];
        const validParams = ['providerId', 'modelId', 'token', 'request'];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { type, providerId, modelId, rateLimitId, token, request, signal, headers } = params;
        const idValidationErrors = validateIdForType({ type, providerId, modelId });
        if (idValidationErrors) {
            return Promise.reject(idValidationErrors);
        }
        const path = { 'rate_limit_id': rateLimitId };
        const body = { type, 'provider_uuid': providerId, 'model_uuid': modelId, token, request };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.RATE_LIMIT.BY_ID,
            body,
            path,
            signal,
            headers,
        };
        return this.client._put(parameters);
    }
    getDetails(params = {}) {
        const requiredParams = [];
        const validParams = ['rateLimitId'];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { rateLimitId, signal, headers } = params;
        if (rateLimitId) {
            const path = { 'rate_limit_id': rateLimitId };
            const parameters = {
                url: config_1.ENDPOINTS.GATEWAY.RATE_LIMIT.BY_ID,
                path,
                signal,
                headers,
            };
            return this.client._get(parameters);
        }
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.RATE_LIMIT.BASE,
            signal,
            headers,
        };
        return this.client._get(parameters);
    }
    /**
     * List Rate Limits.
     *
     * Retrieves a list of all rate limit configurations.
     *
     * @param {ListRateLimitsParams} [params] - The parameters to send to the service.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Record<string, any>[]>} - A promise that resolves with an array of rate limit
     *   configurations.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    list(params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = [];
            const validParams = [];
            const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const response = yield this.getDetails(params);
            return response.result.data;
        });
    }
    /**
     * Delete Rate Limit.
     *
     * Deletes a specific rate limit configuration by UUID.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.rateLimitId - The UUID of the rate limit configuration to delete.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Record<string, any>>} - A promise that resolves with an empty object on
     *   success.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    delete(params) {
        const requiredParams = ['rateLimitId'];
        const validParams = [];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { rateLimitId, signal, headers } = params;
        const path = { 'rate_limit_id': rateLimitId };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.RATE_LIMIT.BY_ID,
            path,
            signal,
            headers,
        };
        return this.client._delete(parameters);
    }
}
exports.RateLimits = RateLimits;
//# sourceMappingURL=ratelimit.js.map