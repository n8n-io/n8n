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
import { GatewayResource } from "./resources.mjs";
import type { CreateRateLimitParams, DeleteRateLimitParams, GetRateLimitParams, ListRateLimitsParams, UpdateRateLimitParams } from "./types/ratelimit/request.mjs";
import type { ListRateLimitResponse } from "./types/ratelimit/response.mjs";
import type { Response } from "../base/index.mjs";
/**
 * Class representing the RateLimits resource. This class provides methods to manage rate limit
 * configurations for the ML Gateway.
 */
export declare class RateLimits extends GatewayResource {
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
    create(params: CreateRateLimitParams): Promise<Response<Record<string, any>>>;
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
    update(params: UpdateRateLimitParams): Promise<Response<Record<string, any>>>;
    /**
     * Get Rate Limit Details.
     *
     * Retrieves details of a specific rate limit configuration by UUID, or lists all rate limit
     * configurations.
     *
     * @param {GetRateLimitParams | ListRateLimitsParams} [params]
     *
     *   - The parameters to send to the service.
     *
     * @param {string} [params.rateLimitId] - The UUID of the rate limit configuration to retrieve. If
     *   not provided, lists all rate limits.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<Record<string, any> | ListRateLimitResponse>>} -
     *
     *   A promise that resolves with the rate limit details or list.
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    getDetails(params?: ListRateLimitsParams): Promise<Response<ListRateLimitResponse>>;
    getDetails(params: GetRateLimitParams): Promise<Response<Record<string, any>>>;
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
    list(params?: ListRateLimitsParams): Promise<Record<string, any>[]>;
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
    delete(params: DeleteRateLimitParams): Promise<Response<Record<string, any>>>;
}
//# sourceMappingURL=ratelimit.d.mts.map