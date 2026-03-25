"use strict";
/**
 * (C) Copyright IBM Corp. 2019, 2023.
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
exports.IamAuthenticator = void 0;
var authenticator_1 = require("./authenticator");
var iam_token_manager_1 = require("../token-managers/iam-token-manager");
var helpers_1 = require("../utils/helpers");
var iam_request_based_authenticator_1 = require("./iam-request-based-authenticator");
/**
 * The IamAuthenticator will use the user-supplied `apikey`
 * value to obtain a bearer token from a token server.  When the bearer token
 * expires, a new token is obtained from the token server. If specified, the
 * optional, mutually inclusive "clientId" and "clientSecret" pair can be used to
 * influence rate-limiting for requests to the IAM token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
var IamAuthenticator = /** @class */ (function (_super) {
    __extends(IamAuthenticator, _super);
    /**
     *
     * Create a new IamAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
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
    function IamAuthenticator(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['apikey'];
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        _this.apikey = options.apikey;
        // the param names are shared between the authenticator and the token
        // manager so we can just pass along the options object
        _this.tokenManager = new iam_token_manager_1.IamTokenManager(options);
        return _this;
    }
    /**
     * Returns the authenticator's type ('iam').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    IamAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_IAM;
    };
    /**
     * Return the most recently stored refresh token.
     *
     * @returns the refresh token string
     */
    IamAuthenticator.prototype.getRefreshToken = function () {
        return this.tokenManager.getRefreshToken();
    };
    return IamAuthenticator;
}(iam_request_based_authenticator_1.IamRequestBasedAuthenticator));
exports.IamAuthenticator = IamAuthenticator;
