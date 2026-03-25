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
exports.CloudPakForDataAuthenticator = void 0;
var authenticator_1 = require("./authenticator");
var cp4d_token_manager_1 = require("../token-managers/cp4d-token-manager");
var token_request_based_authenticator_1 = require("./token-request-based-authenticator");
/**
 * The CloudPakForDataAuthenticator will either use a username/password pair or a username/apikey pair to obtain
 * a bearer token from a token server.  When the bearer token expires, a new token is obtained from the token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
var CloudPakForDataAuthenticator = /** @class */ (function (_super) {
    __extends(CloudPakForDataAuthenticator, _super);
    /**
     * Create a new CloudPakForDataAuthenticator instance.
     *
     * @param options - Configuration options for CloudPakForData authentication.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - username: (required) the username used to obtain a bearer token
     * - password: (optional) the password used to obtain a bearer token (required if apikey is not specified)
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the username, password, and/or url are not valid, or unspecified, for Cloud Pak For Data token requests.
     */
    function CloudPakForDataAuthenticator(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['username', 'url'];
        _this.username = options.username;
        _this.password = options.password;
        _this.apikey = options.apikey;
        // the param names are shared between the authenticator and the token
        // manager so we can just pass along the options object.
        // also, the token manager will handle input validation
        _this.tokenManager = new cp4d_token_manager_1.Cp4dTokenManager(options);
        return _this;
    }
    /**
     * Returns the authenticator's type ('cp4d').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    CloudPakForDataAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_CP4D;
    };
    return CloudPakForDataAuthenticator;
}(token_request_based_authenticator_1.TokenRequestBasedAuthenticator));
exports.CloudPakForDataAuthenticator = CloudPakForDataAuthenticator;
