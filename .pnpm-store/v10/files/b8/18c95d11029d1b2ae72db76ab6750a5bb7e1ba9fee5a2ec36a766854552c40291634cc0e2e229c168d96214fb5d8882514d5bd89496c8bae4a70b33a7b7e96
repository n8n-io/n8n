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
exports.IamRequestBasedAuthenticator = void 0;
var iam_request_based_authenticator_immutable_1 = require("./iam-request-based-authenticator-immutable");
/**
 * The IamRequestBasedAuthenticator provides shared configuration and functionality
 * for authenticators that interact with the IAM token service. This authenticator
 * is not meant for use on its own.
 */
var IamRequestBasedAuthenticator = /** @class */ (function (_super) {
    __extends(IamRequestBasedAuthenticator, _super);
    function IamRequestBasedAuthenticator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Setter for the mutually inclusive "clientId" and the "clientSecret" fields.
     * @param clientId - the "clientId" value used to form a Basic Authorization header for IAM token requests
     * @param clientSecret - the "clientSecret" value used to form a Basic Authorization header for IAM token requests
     */
    IamRequestBasedAuthenticator.prototype.setClientIdAndSecret = function (clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        // update properties in token manager
        this.tokenManager.setClientIdAndSecret(clientId, clientSecret);
    };
    /**
     * Setter for the "scope" parameter to use when fetching the bearer token from the IAM token server.
     * @param scope - (optional) a space-separated string that specifies one or more scopes to be
     * associated with IAM token requests
     */
    IamRequestBasedAuthenticator.prototype.setScope = function (scope) {
        this.scope = scope;
        // update properties in token manager
        this.tokenManager.setScope(scope);
    };
    /**
     * Set the flag that indicates whether verification of the server's SSL
     * certificate should be disabled or not.
     *
     * @param value - a flag that indicates whether verification of the
     *   token server's SSL certificate should be disabled or not.
     */
    IamRequestBasedAuthenticator.prototype.setDisableSslVerification = function (value) {
        // if they try to pass in a non-boolean value,
        // use the "truthy-ness" of the value
        this.disableSslVerification = Boolean(value);
        this.tokenManager.setDisableSslVerification(this.disableSslVerification);
    };
    /**
     * Set headers.
     *
     * @param headers - a set of HTTP headers to be sent with each outbound token server request.
     * Overwrites previous default headers.
     */
    IamRequestBasedAuthenticator.prototype.setHeaders = function (headers) {
        if (typeof headers !== 'object') {
            // do nothing, for now
            return;
        }
        this.headers = headers;
        this.tokenManager.setHeaders(this.headers);
    };
    return IamRequestBasedAuthenticator;
}(iam_request_based_authenticator_immutable_1.IamRequestBasedAuthenticatorImmutable));
exports.IamRequestBasedAuthenticator = IamRequestBasedAuthenticator;
