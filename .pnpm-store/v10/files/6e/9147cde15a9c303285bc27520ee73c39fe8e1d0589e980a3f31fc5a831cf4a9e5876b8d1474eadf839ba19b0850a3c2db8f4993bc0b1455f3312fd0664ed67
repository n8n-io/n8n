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
exports.Policies = void 0;
const config_1 = require("../config/index.js");
const resources_1 = require("./resources.js");
const validators_1 = require("../helpers/validators.js");
/**
 * Class representing the Policies resource. This class provides methods to interact with ML Gateway
 * policies.
 */
class Policies extends resources_1.GatewayResource {
    /**
     * Create policy.
     *
     * Creates policy with provided params.
     *
     * @param {CreatePolicyParams} params - The parameters to send to the service.
     * @param {string} params.action - The action to perform on the policy, either read or write.
     * @param {string} params.effect - The effect that the policy is to have, either allow or deny.
     * @param {string} params.resource - The resource ID that the policy affects.
     * @param {string} params.subject - The subject that the policy pertains to.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<EmptyObject>>} - Resolves with the response from the server.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    create(params) {
        const requiredParams = ['action', 'effect', 'resource', 'subject'];
        const validParams = [];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { action, effect, resource, subject, signal, headers } = params;
        const body = {
            'action': action,
            'effect': effect,
            'resource': resource,
            'subject': subject,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.POLICY.BASE,
            body,
            signal,
            headers,
        };
        return this.client._post(parameters);
    }
    /**
     * Get Policy's details by id.
     *
     * Retrieves the details of a specific policy.
     *
     * @param {GetPolicyParams} params - The parameters to send to the service.
     * @param {string} params.policyId - Policy id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<TenantPolicy>} Resolves with the response from the server.
     * @throws {Error} If validation fails, policy with provided id is not listed or an error occurs
     *   during the request.
     */
    getDetails(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = ['policyId'];
            const validParams = [];
            const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const { policyId } = params;
            const policies = yield this.list();
            const policy = policies.find((item) => item.uuid === policyId);
            if (!policy)
                throw new Error(`Policy with provided id: ${policyId} does not exist`);
            return policy;
        });
    }
    /**
     * Delete Policy.
     *
     * Deletes the specified policy.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.policyId - Policy id.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<EmptyObject>} Resolves with an empty object on success.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    delete(params) {
        const requiredParams = ['policyId'];
        const validParams = [];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { policyId, signal, headers } = params;
        const path = {
            'policy_id': policyId,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.POLICY.BY_ID,
            path,
            signal,
            headers,
        };
        return this.client._delete(parameters);
    }
    /**
     * List all policies.
     *
     * @param {Object} params - Parameters for listing policies.
     * @param {string} [params.providerId] - Policy id.
     * @returns {Promise<Response<TenantPolicyCollection>>} Resolves with the list of policies.
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
            const { signal, headers } = params;
            const parameters = {
                url: config_1.ENDPOINTS.GATEWAY.POLICY.BASE,
                signal,
                headers,
            };
            const response = yield this.client._get(parameters);
            return response.result.data;
        });
    }
}
exports.Policies = Policies;
//# sourceMappingURL=policies.js.map