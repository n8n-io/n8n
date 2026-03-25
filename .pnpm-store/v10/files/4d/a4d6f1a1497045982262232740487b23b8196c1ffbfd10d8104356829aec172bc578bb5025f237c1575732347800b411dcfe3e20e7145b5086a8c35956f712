/*!
 * Copyright 2022 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { AuthClient, GoogleAuth, GoogleAuthOptions } from 'google-auth-library';
import * as r from 'teeny-request';
import { Interceptor } from './service-object.js';
import { BodyResponseCallback, DecorateRequestOptions, MakeAuthenticatedRequest, PackageJson } from './util.js';
export declare const DEFAULT_PROJECT_ID_TOKEN = "{{projectId}}";
export interface StreamRequestOptions extends DecorateRequestOptions {
    shouldReturnStream: true;
}
export interface ServiceConfig {
    /**
     * The base URL to make API requests to.
     */
    baseUrl: string;
    /**
     * The API Endpoint to use when connecting to the service.
     * Example:  storage.googleapis.com
     */
    apiEndpoint: string;
    /**
     * The scopes required for the request.
     */
    scopes: string[];
    projectIdRequired?: boolean;
    packageJson: PackageJson;
    /**
     * Reuse an existing `AuthClient` or `GoogleAuth` client instead of creating a new one.
     */
    authClient?: AuthClient | GoogleAuth;
    /**
     * Set to true if the endpoint is a custom URL
     */
    customEndpoint?: boolean;
}
export interface ServiceOptions extends Omit<GoogleAuthOptions, 'authClient'> {
    authClient?: AuthClient | GoogleAuth;
    interceptors_?: Interceptor[];
    email?: string;
    token?: string;
    timeout?: number;
    userAgent?: string;
    useAuthWithCustomEndpoint?: boolean;
}
export declare class Service {
    baseUrl: string;
    private globalInterceptors;
    interceptors: Interceptor[];
    private packageJson;
    projectId: string;
    private projectIdRequired;
    providedUserAgent?: string;
    makeAuthenticatedRequest: MakeAuthenticatedRequest;
    authClient: GoogleAuth<AuthClient>;
    apiEndpoint: string;
    timeout?: number;
    universeDomain: string;
    customEndpoint: boolean;
    /**
     * Service is a base class, meant to be inherited from by a "service," like
     * BigQuery or Storage.
     *
     * This handles making authenticated requests by exposing a `makeReq_`
     * function.
     *
     * @constructor
     * @alias module:common/service
     *
     * @param {object} config - Configuration object.
     * @param {string} config.baseUrl - The base URL to make API requests to.
     * @param {string[]} config.scopes - The scopes required for the request.
     * @param {object=} options - [Configuration object](#/docs).
     */
    constructor(config: ServiceConfig, options?: ServiceOptions);
    /**
     * Return the user's custom request interceptors.
     */
    getRequestInterceptors(): Function[];
    /**
     * Get and update the Service's project ID.
     *
     * @param {function} callback - The callback function.
     */
    getProjectId(): Promise<string>;
    getProjectId(callback: (err: Error | null, projectId?: string) => void): void;
    protected getProjectIdAsync(): Promise<string>;
    /**
     * Make an authenticated API request.
     *
     * @private
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     * @param {function} callback - The callback function passed to `request`.
     */
    private request_;
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     * @param {function} callback - The callback function passed to `request`.
     */
    request(reqOpts: DecorateRequestOptions, callback: BodyResponseCallback): void;
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     */
    requestStream(reqOpts: DecorateRequestOptions): r.Request;
}
