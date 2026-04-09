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
/// <reference types="node" />
/// <reference types="node" />
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import type { Agent } from 'https';
import type { RequestTokenResponse } from "../../authentication/utils/authenticators.mjs";
/**
 * Parameters for creating a resource.
 *
 * @remarks
 *   This interface defines the parameters required for creating a resource.
 */
export interface CreateParameters {
    /** The URL of the resource to create. */
    url: string;
    /** Optional body content for the request. */
    body?: Record<string, any>;
    /** Optional query parameters for the request. */
    query?: Record<string, any>;
    /** Optional headers for the request. */
    headers?: OutgoingHttpHeaders;
    /** Optional abort signal for the request. */
    signal?: AbortSignal;
}
/**
 * Parameters for getting a resource.
 *
 * @remarks
 *   This interface defines the parameters required for getting a resource.
 */
export interface GetParameters {
    /** The URL of the resource to get. */
    url: string;
    /** Optional query parameters for the request. */
    query?: Record<string, any>;
    /** Optional path parameters for the request. */
    path?: Record<string, any>;
    /** Optional headers for the request. */
    headers?: OutgoingHttpHeaders;
    /** Optional abort signal for the request. */
    signal?: AbortSignal;
}
/**
 * Parameters for posting a resource.
 *
 * @remarks
 *   This interface defines the parameters required for posting a resource.
 */
export interface PostParameters {
    /** The URL of the resource to post. */
    url: string;
    /** Optional body content for the request. */
    body?: Record<string, any>;
    /** Optional query parameters for the request. */
    query?: Record<string, any>;
    /** Optional path parameters for the request. */
    path?: Record<string, any>;
    /** Optional headers for the request. */
    headers?: OutgoingHttpHeaders;
    /** Optional abort signal for the request. */
    signal?: AbortSignal;
}
/**
 * Parameters for updating a resource.
 *
 * @remarks
 *   This interface defines the parameters required for updating a resource.
 */
export interface PutParameters {
    /** The URL of the resource to update. */
    url: string;
    /** Optional body content for the request. */
    body?: Record<string, any>;
    /** Optional query parameters for the request. */
    query?: Record<string, any>;
    /** Optional path parameters for the request. */
    path?: Record<string, any>;
    /** Optional headers for the request. */
    headers?: OutgoingHttpHeaders;
    /** Optional abort signal for the request. */
    signal?: AbortSignal;
}
/**
 * Parameters for deleting a resource.
 *
 * @remarks
 *   This interface defines the parameters required for deleting a resource.
 */
export interface DeleteParameters {
    /** The URL of the resource to delete. */
    url: string;
    /** Optional body content for the request (set to false by default). */
    body?: Record<string, any>;
    /** Optional query parameters for the request. */
    query?: Record<string, any>;
    /** Optional path parameters for the request. */
    path?: Record<string, any>;
    /** Optional headers for the request. */
    headers?: OutgoingHttpHeaders;
    /** Optional abort signal for the request. */
    signal?: AbortSignal;
}
/**
 * Extended parameters for creating a resource with streaming support.
 *
 * @remarks
 *   This interface extends `CreateParameters` to include an optional flag for returning an object
 *   instead of a stream.
 */
export interface CreateStreamParameters extends CreateParameters {
    /** Flag to indicate whether to return the result as an object or a stream. */
    returnObject?: boolean;
}
/**
 * Represents the response from a service request.
 *
 * @remarks
 *   This interface defines the structure of a response object, including the result, status, status
 *   text, and headers.
 */
export interface Response<T = any> {
    /** The actual result of the request. */
    result: T;
    /** HTTP status code of the response. */
    status: number;
    /** Human-readable description of the HTTP status code. */
    statusText: string;
    /** Incoming HTTP headers from the server. */
    headers: IncomingHttpHeaders;
}
/**
 * Callback function type for handling service request results.
 *
 * @remarks
 *   This type defines a callback function that takes an error and an optional response object.
 */
export type Callback<T> = (error: any, response?: Response<T>) => void;
export interface HttpsAgentMap {
    service?: Agent;
    dataplatform?: Agent;
}
export interface Certificates {
    caCert?: {
        auth?: Certificate;
        service?: Certificate;
        dataplatform?: Certificate;
    } | string;
}
export interface Certificate {
    path: string;
}
export interface TokenAuthenticationOptions {
    requestToken?: () => Promise<RequestTokenResponse>;
}
//# sourceMappingURL=base.d.mts.map