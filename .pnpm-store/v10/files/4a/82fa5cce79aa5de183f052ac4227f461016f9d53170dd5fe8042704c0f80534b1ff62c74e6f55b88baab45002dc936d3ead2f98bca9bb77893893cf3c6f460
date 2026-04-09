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
import type { RateLimit } from "./request.js";
/** Response for a single rate limit configuration */
export interface RateLimitResponse {
    /** The UUID of the rate limit configuration */
    uuid?: string;
    /** The rate limit configuration */
    rateLimit: RateLimit;
    /** The timestamp when the rate limit was created */
    createdAt?: string;
    /** The timestamp when the rate limit was last updated */
    updatedAt?: string;
}
/** Response for listing rate limit configurations */
export interface ListRateLimitResponse {
    /** The object type, which is always "list" */
    object: 'list';
    /** The list of rate limit configurations */
    data: RateLimitResponse[];
    /** Whether there are more rate limit configurations to fetch */
    hasMore?: boolean;
    /** Token for fetching the next page of rate limit configurations */
    nextPage?: string;
}
//# sourceMappingURL=response.d.ts.map