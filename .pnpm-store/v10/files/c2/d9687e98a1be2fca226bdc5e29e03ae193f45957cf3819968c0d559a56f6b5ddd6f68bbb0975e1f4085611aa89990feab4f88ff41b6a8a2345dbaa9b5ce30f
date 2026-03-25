"use strict";
/**
 * Copyright 2021, 202e IBM Corp. All Rights Reserved.
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerAuthenticator = void 0;
var authenticator_1 = require("./authenticator");
var container_token_manager_1 = require("../token-managers/container-token-manager");
var iam_request_based_authenticator_1 = require("./iam-request-based-authenticator");
/**
 * The ContainerAuthenticator will read a compute resource token from the file system
 * and use this value to obtain a bearer token from the IAM token server.  When the bearer
 * token expires, a new token is obtained from the token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
var ContainerAuthenticator = /** @class */ (function (_super) {
    __extends(ContainerAuthenticator, _super);
    /**
     *
     * Create a new ContainerAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - crTokenFilename: (optional) the file containing the compute resource token
     * - iamProfileName: (optional) the name of the IAM trusted profile associated with the compute resource token (required if iamProfileId is not specified)
     * - iamProfileId]: (optional) the ID of the IAM trusted profile associated with the compute resource token (required if iamProfileName is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    function ContainerAuthenticator(options) {
        var _this = _super.call(this, options) || this;
        // the param names are shared between the authenticator and the token
        // manager so we can just pass along the options object
        // the token manager will also handle the validation of required options
        _this.tokenManager = new container_token_manager_1.ContainerTokenManager(options);
        _this.crTokenFilename = options.crTokenFilename;
        _this.iamProfileName = options.iamProfileName;
        _this.iamProfileId = options.iamProfileId;
        return _this;
    }
    /**
     * Setter for the filename of the compute resource token.
     * @param crTokenFilename - A string containing a path to the CR token file
     */
    ContainerAuthenticator.prototype.setCrTokenFilename = function (crTokenFilename) {
        this.crTokenFilename = crTokenFilename;
        // update properties in token manager
        this.tokenManager.setCrTokenFilename(crTokenFilename);
    };
    /**
     * Setter for the "profile_name" parameter to use when fetching the bearer token from the IAM token server.
     * @param iamProfileName - the name of the IAM trusted profile
     */
    ContainerAuthenticator.prototype.setIamProfileName = function (iamProfileName) {
        this.iamProfileName = iamProfileName;
        // update properties in token manager
        this.tokenManager.setIamProfileName(iamProfileName);
    };
    /**
     * Setter for the "profile_id" parameter to use when fetching the bearer token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    ContainerAuthenticator.prototype.setIamProfileId = function (iamProfileId) {
        this.iamProfileId = iamProfileId;
        // update properties in token manager
        this.tokenManager.setIamProfileId(iamProfileId);
    };
    /**
     * Returns the authenticator's type ('container').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    ContainerAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_CONTAINER;
    };
    /**
     * Return the most recently stored refresh token.
     *
     * @returns the refresh token string
     */
    ContainerAuthenticator.prototype.getRefreshToken = function () {
        return this.tokenManager.getRefreshToken();
    };
    return ContainerAuthenticator;
}(iam_request_based_authenticator_1.IamRequestBasedAuthenticator));
exports.ContainerAuthenticator = ContainerAuthenticator;
