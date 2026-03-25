"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars, class-methods-use-this */
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
exports.NoAuthAuthenticator = void 0;
/**
 * (C) Copyright IBM Corp. 2019, 2021.
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
var authenticator_1 = require("./authenticator");
/**
 * NoAuthAuthenticator is a placeholder authenticator implementation which
 * performs no authentication of outgoing REST API requests. It might be
 * useful during development and testing.
 */
var NoAuthAuthenticator = /** @class */ (function (_super) {
    __extends(NoAuthAuthenticator, _super);
    function NoAuthAuthenticator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoAuthAuthenticator.prototype.authenticate = function (requestOptions) {
        // immediately proceed to request. it will probably fail
        return Promise.resolve();
    };
    /**
     * Returns the authenticator's type ('noauth').
     *
     * @returns a string that indicates the authenticator's type
     */
    NoAuthAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_NOAUTH;
    };
    return NoAuthAuthenticator;
}(authenticator_1.Authenticator));
exports.NoAuthAuthenticator = NoAuthAuthenticator;
