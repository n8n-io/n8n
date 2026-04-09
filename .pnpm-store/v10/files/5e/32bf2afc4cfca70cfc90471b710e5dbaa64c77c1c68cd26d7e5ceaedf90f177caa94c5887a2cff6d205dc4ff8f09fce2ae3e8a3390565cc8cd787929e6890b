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
import type { UserOptions } from 'ibm-cloud-sdk-core';
import { BaseService } from 'ibm-cloud-sdk-core';
import type { Stream } from "../lib/common.mjs";
import type { CreateStreamParameters, DeleteParameters, GetParameters, HttpsAgentMap, PostParameters, PutParameters, Response, Certificates, TokenAuthenticationOptions } from "./types/base.mjs";
/**
 * WatsonxBaseService class extends BaseService and provides common functionalities for Watsonx
 * services.
 *
 * @category BaseService
 */
export declare class WatsonxBaseService extends BaseService {
    /** @ignore */
    static DEFAULT_SERVICE_URL: string;
    /** @ignore */
    static DEFAULT_SERVICE_NAME: string;
    /** The version date for the API of the form `YYYY-MM-DD`. */
    version: string;
    /** URL required for dataplatform endpoints */
    wxServiceUrl: string;
    /** URL required for watsonx inference endpoints */
    serviceUrl: string;
    httpsAgentMap: HttpsAgentMap;
    static PLATFORM_URLS_MAP: Record<string, string>;
    /**
     * Constructs an instance of WatsonxBaseService with passed in options and external configuration.
     *
     * @category Constructor
     * @param {UserOptions} [options] - The parameters to send to the service.
     * @param {string} [options.version] - The version date for the API of the form `YYYY-MM-DD`
     * @param {string} [options.serviceUrl] - The base URL for the service
     * @param {string} [options.serviceName] - The name of the service to configure
     * @param {Authenticator} [options.authenticator] - The Authenticator object used to authenticate
     *   requests to the service
     */
    constructor(options: UserOptions & Certificates & TokenAuthenticationOptions);
}
/**
 * APIBaseService class extends WatsonxBaseService and provides common API request functionalities.
 *
 * @category APIBaseService
 */
export declare class APIBaseService extends WatsonxBaseService {
    /**
     * Performs a POST request to the specified URL.
     *
     * @template T
     * @param {PostParameters} params - The parameters for the POST request.
     * @param {string} params.url - The parameters for the POST request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the POST
     *   request.
     */
    _post<T>(params: PostParameters): Promise<Response<T>>;
    /**
     * Performs a GET request to the specified URL.
     *
     * @template T
     * @param {GetParameters} params - The parameters for the GET request.
     * @param {string} [params.url] - The parameters for the GET request.
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the GET request.
     */
    _get<T>(params: GetParameters): Promise<Response<T>>;
    /**
     * Performs a DELETE request to the specified URL.
     *
     * @template T
     * @param {DeleteParameters} params - The parameters for the DELETE request.
     * @param {string} params.url - The parameters for the DELETE request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the DELETE
     *   request.
     */
    _delete<T>(params: DeleteParameters): Promise<Response<T>>;
    /**
     * Performs a PUT request to the specified URL.
     *
     * @template T
     * @param {PutParameters} params - The parameters for the PUT request.
     * @param {string} params.url - The parameters for the PUT request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Response<T>>} - A promise that resolves to the response from the PUT request.
     */
    _put<T>(params: PutParameters): Promise<Response<T>>;
    /**
     * Performs a POST request to the specified URL and returns a stream.
     *
     * @template T
     * @param {CreateStreamParameters} params - The parameters for the POST request.
     * @param {string} params.url - The parameters for the POST request.
     * @param {Record<string, any>} [params.body] - Body parameters to be passed to an endpoint
     * @param {Record<string, any>} [params.query] - Query parameters to be passed with url.
     * @param {Record<string, any>} [params.path] - Path parameters to be used to create url.
     * @param {Record<string, any>} [params.returnObject] - Flag that indicates return type. Set
     *   'true' to return objects, 'false' to return SSE
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @returns {Promise<Stream<T | string>>} - A promise that resolves to a stream from the POST
     *   request.
     */
    _postStream<T>(params: CreateStreamParameters): Promise<Stream<T | string>>;
}
//# sourceMappingURL=base.d.mts.map