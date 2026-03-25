/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CachedContent, RequestOptions } from "../../types";
import { CachedContentCreateParams, CachedContentUpdateParams, ListCacheResponse, ListParams } from "../../types/server";
/**
 * Class for managing GoogleAI content caches.
 * @public
 */
export declare class GoogleAICacheManager {
    apiKey: string;
    private _requestOptions?;
    constructor(apiKey: string, _requestOptions?: RequestOptions);
    /**
     * Upload a new content cache
     */
    create(createOptions: CachedContentCreateParams): Promise<CachedContent>;
    /**
     * List all uploaded content caches
     */
    list(listParams?: ListParams): Promise<ListCacheResponse>;
    /**
     * Get a content cache
     */
    get(name: string): Promise<CachedContent>;
    /**
     * Update an existing content cache
     */
    update(name: string, updateParams: CachedContentUpdateParams): Promise<CachedContent>;
    /**
     * Delete content cache with given name
     */
    delete(name: string): Promise<void>;
}
