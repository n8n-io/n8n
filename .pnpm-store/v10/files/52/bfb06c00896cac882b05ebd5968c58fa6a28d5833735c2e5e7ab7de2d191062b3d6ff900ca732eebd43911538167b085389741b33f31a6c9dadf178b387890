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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicAuthenticator = void 0;
var extend_1 = __importDefault(require("extend"));
var helpers_1 = require("../utils/helpers");
var authenticator_1 = require("./authenticator");
var logger_1 = __importDefault(require("../../lib/logger"));
/**
 * The BasicAuthenticator is used to add basic authentication information to
 *   requests.
 *
 * Basic Authorization will be sent as an Authorization header in the form:
 *
 *     Authorization: Basic \<encoded username and password\>
 *
 */
var BasicAuthenticator = /** @class */ (function (_super) {
    __extends(BasicAuthenticator, _super);
    /**
     * Create a new BasicAuthenticator instance.
     *
     * @param options - Configuration options for basic authentication.
     * This should be an object containing these fields:
     * - username: the username portion of basic authentication
     * - password: the password portion of basic authentication
     *
     * @throws Error: the configuration options are not valid.
     */
    function BasicAuthenticator(options) {
        var _this = _super.call(this) || this;
        _this.requiredOptions = ['username', 'password'];
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        var username = options.username, password = options.password;
        var authHeaderString = (0, helpers_1.computeBasicAuthHeader)(username, password);
        _this.authHeader = { Authorization: authHeaderString };
        return _this;
    }
    /**
     * Add basic authentication information to `requestOptions`. The basic authentication information
     * will be set in the Authorization property of `requestOptions.headers` in the form:
     *
     *     Authorization: Basic \<encoded username and password\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    BasicAuthenticator.prototype.authenticate = function (requestOptions) {
        var _this = this;
        return new Promise(function (resolve) {
            requestOptions.headers = (0, extend_1.default)(true, {}, requestOptions.headers, _this.authHeader);
            logger_1.default.debug("Authenticated outbound request (type=".concat(_this.authenticationType(), ")"));
            resolve();
        });
    };
    /**
     * Returns the authenticator's type ('basic').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    BasicAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_BASIC;
    };
    return BasicAuthenticator;
}(authenticator_1.Authenticator));
exports.BasicAuthenticator = BasicAuthenticator;
