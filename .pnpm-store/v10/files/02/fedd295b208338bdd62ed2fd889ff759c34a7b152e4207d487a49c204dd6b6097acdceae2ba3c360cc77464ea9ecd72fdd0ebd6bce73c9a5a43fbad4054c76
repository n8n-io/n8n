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
import type { APIBaseService } from "../base/base.js";
/**
 * Abstract class for Gateway resources. This class provides an interface for creating, getting
 * details, listing, and deleting resources. It must be extended by concrete resource classes.
 */
export declare abstract class GatewayResource {
    /**
     * Client instance for API calls.
     *
     * @memberof GatewayResource
     * @type {APIBaseService}
     * @protected
     */
    protected client: APIBaseService;
    /**
     * Constructor for GatewayResource.
     *
     * @memberof GatewayResource
     * @param {APIBaseService} gateway - The API client instance.
     */
    constructor(gateway: APIBaseService);
    /**
     * Create a new resource.
     *
     * @memberof GatewayResource
     * @abstract
     * @param {Record<string, any>} params - Parameters for creating the resource.
     * @returns {Promise<Record<string, any>>} - A promise that resolves with the created resource.
     */
    abstract create(params: Record<string, any>): Promise<Record<string, any>>;
    /**
     * Get details of a resource.
     *
     * @memberof GatewayResource
     * @abstract
     * @param {Record<string, any>} params - Parameters for fetching resource details.
     * @returns {Promise<Record<string, any>>} - A promise that resolves with the resource details.
     */
    abstract getDetails(params: Record<string, any>): Promise<Record<string, any>>;
    /**
     * List resources.
     *
     * @memberof GatewayResource
     * @abstract
     * @param {Record<string, any>} params - Parameters for listing resources.
     * @returns {Promise<Record<string, any>>} - A promise that resolves with the list of resources.
     */
    abstract list(params: Record<string, any>): Promise<Record<string, any>>;
    /**
     * Delete a resource.
     *
     * @memberof GatewayResource
     * @abstract
     * @param {Record<string, any>} params - Parameters for deleting the resource.
     * @returns {Promise<Record<string, any>>} - A promise that resolves with the result of the
     *   deletion.
     */
    abstract delete(params: Record<string, any>): Promise<Record<string, any>>;
}
//# sourceMappingURL=resources.d.ts.map