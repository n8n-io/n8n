/**
 * (C) Copyright IBM Corp. 2026.
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
/// <reference types="node" />
import type { OutgoingHttpHeaders } from 'http';
/** The body of a service request that returns no response data. */
export interface EmptyObject {
}
/** A standard JS object, defined to avoid the limitations of `Object` and `object` */
export interface JsonObject {
    [key: string]: any;
}
/** Chunk interface when returnObject=true in stream */
export interface ObjectStreamed<T> {
    id: number;
    event: string;
    data: T;
}
/** Default parameters for API requests */
export interface DefaultParams {
    signal?: AbortSignal;
    headers?: OutgoingHttpHeaders;
}
/**
 * Generic collection type for list responses. Used across various API responses that return lists
 * of items.
 */
export interface Collection<T> {
    /** The array of items in the collection. */
    data: T[];
    /** The object type, always "list". */
    object: 'list';
}
/** Caching configuration for requests. Cache is only supported for non-streaming requests. */
export interface CacheConfig {
    /** Whether to enable caching for the current request. */
    enabled?: boolean;
    /** Filter criteria for caching. */
    filter?: JsonObject;
    /** Threshold for caching the request; required if cache is enabled. */
    threshold?: number;
}
/**
 * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
 * Manager secret. The Value in the remote store is expected to be a JSON representation of the Data
 * field.
 */
export interface DataReference {
    /** The resource identifier in the remote credential store. */
    resource: string;
}
/**
 * Base interface for content filter results. Used for various content moderation and filtering
 * operations.
 */
export interface ContentFilterResult {
    /** Indicates if content has been detected. */
    detected?: boolean;
    /** Indicates if content has been filtered. */
    filtered?: boolean;
    /**
     * Indicates the severity level on a scale that determines the intensity and risk level of harmful
     * content.
     */
    severity?: string;
}
//# sourceMappingURL=common.d.mts.map