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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRequestBasedAuthenticatorImmutable = void 0;
var extend_1 = __importDefault(require("extend"));
var jwt_token_manager_1 = require("../token-managers/jwt-token-manager");
var authenticator_1 = require("./authenticator");
var logger_1 = __importDefault(require("../../lib/logger"));
/**
 * Class for common functionality shared by token-request authenticators.
 * Token-request authenticators use token managers to retrieve, store,
 * and refresh tokens. Not intended to be used as stand-alone authenticator,
 * but as base class to authenticators that have their own token manager
 * implementations.
 *
 * The token will be added as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
var TokenRequestBasedAuthenticatorImmutable = /** @class */ (function (_super) {
    __extends(TokenRequestBasedAuthenticatorImmutable, _super);
    /**
     * Create a new TokenRequestBasedAuthenticatorImmutable instance with an internal JwtTokenManager.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    function TokenRequestBasedAuthenticatorImmutable(options) {
        var _this = _super.call(this) || this;
        _this.disableSslVerification = Boolean(options.disableSslVerification);
        _this.url = options.url;
        // default to empty object
        _this.headers = options.headers || {};
        _this.tokenManager = new jwt_token_manager_1.JwtTokenManager(options);
        return _this;
    }
    /**
     * Adds bearer token information to "requestOptions". The bearer token information
     * will be set in the Authorization property of "requestOptions.headers" in the form:
     *
     *     Authorization: Bearer \<bearer-token\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    TokenRequestBasedAuthenticatorImmutable.prototype.authenticate = function (requestOptions) {
        var _this = this;
        return this.tokenManager.getToken().then(function (token) {
            var authHeader = { Authorization: "Bearer ".concat(token) };
            requestOptions.headers = (0, extend_1.default)(true, {}, requestOptions.headers, authHeader);
            logger_1.default.debug("Authenticated outbound request (type=".concat(_this.authenticationType(), ")"));
        });
    };
    return TokenRequestBasedAuthenticatorImmutable;
}(authenticator_1.Authenticator));
exports.TokenRequestBasedAuthenticatorImmutable = TokenRequestBasedAuthenticatorImmutable;
