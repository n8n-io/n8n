"use strict";
/**
 * (C) Copyright IBM Corp. 2019, 2024.
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
exports.IamTokenManager = void 0;
var helpers_1 = require("../utils/helpers");
var build_user_agent_1 = require("../../lib/build-user-agent");
var iam_request_based_token_manager_1 = require("./iam-request-based-token-manager");
/**
 * The IamTokenManager takes an api key and performs the necessary interactions with
 * the IAM token service to obtain and store a suitable bearer token. Additionally, the IamTokenManager
 * will retrieve bearer tokens via basic auth using a supplied "clientId" and "clientSecret" pair.
 */
var IamTokenManager = /** @class */ (function (_super) {
    __extends(IamTokenManager, _super);
    /**
     *
     * Create a new IamTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
     * - apikey: (required) the IAM api key
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
    function IamTokenManager(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['apikey'];
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        _this.apikey = options.apikey;
        // construct form data for the apikey use case of iam token management
        _this.formData.apikey = _this.apikey;
        _this.formData.grant_type = 'urn:ibm:params:oauth:grant-type:apikey';
        _this.formData.response_type = 'cloud_iam';
        _this.userAgent = (0, build_user_agent_1.buildUserAgent)('iam-authenticator');
        return _this;
    }
    /**
     * Returns the most recently stored refresh token.
     *
     * @returns the refresh token
     */
    IamTokenManager.prototype.getRefreshToken = function () {
        return this.refreshToken;
    };
    return IamTokenManager;
}(iam_request_based_token_manager_1.IamRequestBasedTokenManager));
exports.IamTokenManager = IamTokenManager;
