"use strict";
/**
 * (C) Copyright IBM Corp. 2021, 2023.
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
exports.VpcInstanceAuthenticator = void 0;
var authenticator_1 = require("./authenticator");
var vpc_instance_token_manager_1 = require("../token-managers/vpc-instance-token-manager");
var token_request_based_authenticator_1 = require("./token-request-based-authenticator");
/**
 * The VpcInstanceAuthenticator implements an authentication scheme in which it retrieves an "instance identity token"
 * and exchanges that for an IAM access token using the VPC Instance Metadata Service API which is available on the local
 * compute resource (VM). The instance identity token is similar to an IAM apikey, except that it is managed automatically
 * by the compute resource provider (VPC).
 *
 * The resulting IAM access token is then added to outbound requests in an Authorization header
 *
 *      Authorization: Bearer \<access-token\>
 */
var VpcInstanceAuthenticator = /** @class */ (function (_super) {
    __extends(VpcInstanceAuthenticator, _super);
    /**
     * Create a new VpcInstanceAuthenticator instance.
     *
     * @param options - Configuration options for VpcInstance authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the VPC Instance Metadata Service (default value: "http://169.254.169.254")
     * - iamProfileCrn: (optional) the CRN of the linked IAM trusted profile to be used to obtain the IAM access token
     * - iamProfileId: (optional) the ID of the linked IAM trusted profile to be used to obtain the IAM access token
     *
     * @remarks
     * At most one of "iamProfileCrn" or "iamProfileId" may be specified. If neither one is specified,
     * then the default IAM profile defined for the compute resource will be used.
     */
    function VpcInstanceAuthenticator(options) {
        var _this = this;
        // all parameters are optional
        options = options || {};
        _this = _super.call(this, options) || this;
        if (options.iamProfileCrn) {
            _this.iamProfileCrn = options.iamProfileCrn;
        }
        if (options.iamProfileId) {
            _this.iamProfileId = options.iamProfileId;
        }
        // the param names are shared between the authenticator and the token
        // manager so we can just pass along the options object.
        // also, the token manager will handle input validation
        _this.tokenManager = new vpc_instance_token_manager_1.VpcInstanceTokenManager(options);
        return _this;
    }
    /**
     * Sets the "iamProfileCrn" value to be used when obtaining an IAM access token
     * @param iamProfileCrn - the CRN of the linked IAM trusted profile to use when obtaining an IAM access token
     */
    VpcInstanceAuthenticator.prototype.setIamProfileCrn = function (iamProfileCrn) {
        this.iamProfileCrn = iamProfileCrn;
        // update properties in token manager
        this.tokenManager.setIamProfileCrn(iamProfileCrn);
    };
    /**
     * Sets the "iamProfileId" value to be used when obtaining an IAM access token
     * @param iamProfileId - the ID of the linked IAM trusted profile to use when obtaining an IAM access token
     */
    VpcInstanceAuthenticator.prototype.setIamProfileId = function (iamProfileId) {
        this.iamProfileId = iamProfileId;
        // update properties in token manager
        this.tokenManager.setIamProfileId(iamProfileId);
    };
    /**
     * Returns the authenticator's type ('vpc').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    VpcInstanceAuthenticator.prototype.authenticationType = function () {
        return authenticator_1.Authenticator.AUTHTYPE_VPC;
    };
    return VpcInstanceAuthenticator;
}(token_request_based_authenticator_1.TokenRequestBasedAuthenticator));
exports.VpcInstanceAuthenticator = VpcInstanceAuthenticator;
