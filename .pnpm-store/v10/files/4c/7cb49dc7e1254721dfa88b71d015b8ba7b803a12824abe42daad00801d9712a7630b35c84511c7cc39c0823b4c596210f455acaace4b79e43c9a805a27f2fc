"use strict";
/**
 * (C) Copyright IBM Corp. 2024.
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
exports.IamAssumeAuthenticator = void 0;
var authenticator_1 = require("./authenticator");
var token_managers_1 = require("../token-managers");
var iam_request_based_authenticator_immutable_1 = require("./iam-request-based-authenticator-immutable");
/**
 * The IamAssumeAuthenticator obtains an IAM access token using the IAM "get-token"
 * operation's "assume" grant type. The authenticator obtains an initial IAM access
 * token from a user-supplied apikey, then exchanges this initial IAM access token
 * for another IAM access token that has "assumed the identity" of the specified
 * trusted profile.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
var IamAssumeAuthenticator = /** @class */ (function (_super) {
    __extends(IamAssumeAuthenticator, _super);
    /**
     *
     * Create a new IamAssumeAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key for initial token request
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the token service
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
    function IamAssumeAuthenticator(options) {
        var _this = _super.call(this, options) || this;
        // The param names are shared between the authenticator and the token
        // manager so we can just pass along the options object. This will
        // also perform input validation on the options.
        _this.tokenManager = new token_managers_1.IamAssumeTokenManager(options);
        return _this;
    }
    /**
     * Returns the authenticator's type ('iamAssume').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    IamAssumeAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_IAM_ASSUME;
    };
    return IamAssumeAuthenticator;
}(iam_request_based_authenticator_immutable_1.IamRequestBasedAuthenticatorImmutable));
exports.IamAssumeAuthenticator = IamAssumeAuthenticator;
