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
import { Content, Part } from "../content";
import { ToolConfig } from "../function-calling";
import { Tool } from "../requests";
/**
 * @public
 */
export interface CachedContentBase {
    model?: string;
    contents: Content[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    /**
     * Expiration time in ISO string format. Specify either this or `ttlSeconds`
     * when creating a `CachedContent`.
     */
    expireTime?: string;
    displayName?: string;
}
/**
 * Describes `CachedContent` interface for sending to the server (if creating)
 * or received from the server (using getters or list methods).
 * @public
 */
export interface CachedContent extends CachedContentBase {
    name?: string;
    /**
     * protobuf.Duration format (ex. "3.0001s").
     */
    ttl?: string;
    /**
     * `CachedContent` creation time in ISO string format.
     */
    createTime?: string;
    /**
     * `CachedContent` update time in ISO string format.
     */
    updateTime?: string;
}
/**
 * Params to pass to {@link GoogleAICacheManager.create}.
 * @public
 */
export interface CachedContentCreateParams extends CachedContentBase {
    /**
     * `CachedContent` ttl in seconds. Specify either this or `expireTime`
     * when creating a `CachedContent`.
     */
    ttlSeconds?: number;
}
/**
 * Fields that can be updated in an existing content cache.
 * @public
 */
export interface CachedContentUpdateInputFields {
    ttlSeconds?: number;
    expireTime?: string;
}
/**
 * Params to pass to {@link GoogleAICacheManager.update}.
 * @public
 */
export interface CachedContentUpdateParams {
    cachedContent: CachedContentUpdateInputFields;
    /**
     * protobuf FieldMask. If not specified, updates all provided fields.
     */
    updateMask?: string[];
}
/**
 * Fields that can be updated in an existing content cache.
 * @internal
 */
export interface _CachedContentUpdateRequestFields {
    ttl?: string;
    expireTime?: string;
}
/**
 * Params as sent to the backend (ttl instead of ttlSeconds).
 * @internal
 */
export interface _CachedContentUpdateRequest {
    cachedContent: _CachedContentUpdateRequestFields;
    /**
     * protobuf FieldMask
     */
    updateMask?: string[];
}
/**
 * @public
 */
export interface ListCacheResponse {
    cachedContents: CachedContent[];
    nextPageToken?: string;
}
