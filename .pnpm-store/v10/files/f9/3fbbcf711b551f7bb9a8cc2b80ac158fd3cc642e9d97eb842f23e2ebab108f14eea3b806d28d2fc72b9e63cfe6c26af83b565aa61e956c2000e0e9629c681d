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
/** Request rate limiting settings (per request origin). */
export interface RateLimitItem {
    /**
     * Duration is the refill interval, formatted as a Go duration string
     *
     * @example
     *   1m
     */
    duration: string;
    /**
     * Amount is the number of tokens refilled into the bucket each interval.
     *
     * @example
     *   10;
     *
     * @minimum 0
     */
    amount: number;
    /**
     * Capacity is the maximum number of tokens (requests) the bucket can hold.
     *
     * @example
     *   100;
     *
     * @minimum 0
     */
    capacity: number;
}
/** Tenant-level rate limit configuration */
export interface RateLimitTenant {
    /** The type of rate limit, always "tenant" for tenant-level rate limits */
    type: 'tenant';
    /** Token rate limiting settings */
    token?: RateLimitItem;
    /** Request rate limiting settings */
    request?: RateLimitItem;
}
/** Model-specific rate limit configuration */
export interface RateLimitModel {
    /** The type of rate limit, always "model" for model-specific rate limits */
    type: 'model';
    /** The UUID of the model this rate limit applies to */
    modelId: string;
    /** Token rate limiting settings */
    token?: RateLimitItem;
    /** Request rate limiting settings */
    request?: RateLimitItem;
}
/** Provider-specific rate limit configuration */
export interface RateLimitProvider {
    /**
     * The type of rate limit, always "provider" for provider-specific rate limits
     *
     * @example
     *   provider;
     */
    type: 'provider';
    /** The UUID of the provider this rate limit applies to */
    providerId: string;
    /** Token rate limiting settings */
    token?: RateLimitItem;
    /** Request rate limiting settings */
    request?: RateLimitItem;
}
/** Union type for all rate limit configurations */
export type RateLimit = RateLimitTenant | RateLimitProvider | RateLimitModel;
export interface CreateRateLimitParams extends DefaultParams {
    /**
     * The type of rate limit, always "tenant" for tenant-level rate limits
     *
     * @example
     *   tenant;
     */
    type: 'tenant' | 'provider' | 'model';
    /** Token rate limiting settings */
    token?: RateLimitItem;
    /** Request rate limiting settings */
    request?: RateLimitItem;
    /** The UUID of the provider this rate limit applies to */
    providerId?: string;
    /** The UUID of the model this rate limit applies to */
    modelId?: string;
}
export interface UpdateRateLimitParams extends CreateRateLimitParams {
    rateLimitId: string;
}
/** Parameters for creating or updating a rate limit configuration */
export interface RateLimitParams {
    /** The rate limit configuration */
    rateLimit: RateLimit;
}
/** Parameters for retrieving a specific rate limit configuration */
export interface GetRateLimitParams extends DefaultParams {
    /** The UUID of the rate limit configuration */
    rateLimitId?: string;
}
/** Parameters for deleting a specific rate limit configuration */
export interface DeleteRateLimitParams extends DefaultParams {
    /** The UUID of the rate limit configuration */
    rateLimitId: string;
}
export interface ListRateLimitsParams extends DefaultParams {
}
//# sourceMappingURL=request.d.ts.map