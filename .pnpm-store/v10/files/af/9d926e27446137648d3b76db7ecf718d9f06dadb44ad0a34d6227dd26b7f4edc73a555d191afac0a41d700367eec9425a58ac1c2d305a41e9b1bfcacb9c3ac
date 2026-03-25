"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Service = exports.DEFAULT_PROJECT_ID_TOKEN = void 0;
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
const google_auth_library_1 = require("google-auth-library");
const uuid = __importStar(require("uuid"));
const util_js_1 = require("./util.js");
const util_js_2 = require("../util.js");
exports.DEFAULT_PROJECT_ID_TOKEN = '{{projectId}}';
class Service {
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
    constructor(config, options = {}) {
        this.baseUrl = config.baseUrl;
        this.apiEndpoint = config.apiEndpoint;
        this.timeout = options.timeout;
        this.globalInterceptors = Array.isArray(options.interceptors_)
            ? options.interceptors_
            : [];
        this.interceptors = [];
        this.packageJson = config.packageJson;
        this.projectId = options.projectId || exports.DEFAULT_PROJECT_ID_TOKEN;
        this.projectIdRequired = config.projectIdRequired !== false;
        this.providedUserAgent = options.userAgent;
        this.universeDomain = options.universeDomain || google_auth_library_1.DEFAULT_UNIVERSE;
        this.customEndpoint = config.customEndpoint || false;
        this.makeAuthenticatedRequest = util_js_1.util.makeAuthenticatedRequestFactory({
            ...config,
            projectIdRequired: this.projectIdRequired,
            projectId: this.projectId,
            authClient: options.authClient || config.authClient,
            credentials: options.credentials,
            keyFile: options.keyFilename,
            email: options.email,
            clientOptions: {
                universeDomain: options.universeDomain,
                ...options.clientOptions,
            },
        });
        this.authClient = this.makeAuthenticatedRequest.authClient;
        const isCloudFunctionEnv = !!process.env.FUNCTION_NAME;
        if (isCloudFunctionEnv) {
            this.interceptors.push({
                request(reqOpts) {
                    reqOpts.forever = false;
                    return reqOpts;
                },
            });
        }
    }
    /**
     * Return the user's custom request interceptors.
     */
    getRequestInterceptors() {
        // Interceptors should be returned in the order they were assigned.
        return [].slice
            .call(this.globalInterceptors)
            .concat(this.interceptors)
            .filter(interceptor => typeof interceptor.request === 'function')
            .map(interceptor => interceptor.request);
    }
    getProjectId(callback) {
        if (!callback) {
            return this.getProjectIdAsync();
        }
        this.getProjectIdAsync().then(p => callback(null, p), callback);
    }
    async getProjectIdAsync() {
        const projectId = await this.authClient.getProjectId();
        if (this.projectId === exports.DEFAULT_PROJECT_ID_TOKEN && projectId) {
            this.projectId = projectId;
        }
        return this.projectId;
    }
    request_(reqOpts, callback) {
        reqOpts = { ...reqOpts, timeout: this.timeout };
        const isAbsoluteUrl = reqOpts.uri.indexOf('http') === 0;
        const uriComponents = [this.baseUrl];
        if (this.projectIdRequired) {
            if (reqOpts.projectId) {
                uriComponents.push('projects');
                uriComponents.push(reqOpts.projectId);
            }
            else {
                uriComponents.push('projects');
                uriComponents.push(this.projectId);
            }
        }
        uriComponents.push(reqOpts.uri);
        if (isAbsoluteUrl) {
            uriComponents.splice(0, uriComponents.indexOf(reqOpts.uri));
        }
        reqOpts.uri = uriComponents
            .map(uriComponent => {
            const trimSlashesRegex = /^\/*|\/*$/g;
            return uriComponent.replace(trimSlashesRegex, '');
        })
            .join('/')
            // Some URIs have colon separators.
            // Bad: https://.../projects/:list
            // Good: https://.../projects:list
            .replace(/\/:/g, ':');
        const requestInterceptors = this.getRequestInterceptors();
        const interceptorArray = Array.isArray(reqOpts.interceptors_)
            ? reqOpts.interceptors_
            : [];
        interceptorArray.forEach(interceptor => {
            if (typeof interceptor.request === 'function') {
                requestInterceptors.push(interceptor.request);
            }
        });
        requestInterceptors.forEach(requestInterceptor => {
            reqOpts = requestInterceptor(reqOpts);
        });
        delete reqOpts.interceptors_;
        const pkg = this.packageJson;
        let userAgent = (0, util_js_2.getUserAgentString)();
        if (this.providedUserAgent) {
            userAgent = `${this.providedUserAgent} ${userAgent}`;
        }
        reqOpts.headers = {
            ...reqOpts.headers,
            'User-Agent': userAgent,
            'x-goog-api-client': `${(0, util_js_2.getRuntimeTrackingString)()} gccl/${pkg.version}-${(0, util_js_2.getModuleFormat)()} gccl-invocation-id/${uuid.v4()}`,
        };
        if (reqOpts[util_js_1.GCCL_GCS_CMD_KEY]) {
            reqOpts.headers['x-goog-api-client'] +=
                ` gccl-gcs-cmd/${reqOpts[util_js_1.GCCL_GCS_CMD_KEY]}`;
        }
        if (reqOpts.shouldReturnStream) {
            return this.makeAuthenticatedRequest(reqOpts);
        }
        else {
            this.makeAuthenticatedRequest(reqOpts, callback);
        }
    }
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     * @param {function} callback - The callback function passed to `request`.
     */
    request(reqOpts, callback) {
        Service.prototype.request_.call(this, reqOpts, callback);
    }
    /**
     * Make an authenticated API request.
     *
     * @param {object} reqOpts - Request options that are passed to `request`.
     * @param {string} reqOpts.uri - A URI relative to the baseUrl.
     */
    requestStream(reqOpts) {
        const opts = { ...reqOpts, shouldReturnStream: true };
        return Service.prototype.request_.call(this, opts);
    }
}
exports.Service = Service;
