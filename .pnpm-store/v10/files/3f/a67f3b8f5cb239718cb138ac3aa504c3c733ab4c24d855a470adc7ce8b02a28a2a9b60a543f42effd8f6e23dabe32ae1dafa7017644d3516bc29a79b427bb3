"use strict";
/**
 * (C) Copyright IBM Corp. 2019, 2025.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamAssumeTokenManager = exports.McspV2TokenManager = exports.McspTokenManager = exports.VpcInstanceTokenManager = exports.TokenManager = exports.JwtTokenManager = exports.IamRequestBasedTokenManager = exports.ContainerTokenManager = exports.Cp4dTokenManager = exports.IamTokenManager = void 0;
/**
 * @module token-managers
 * The ibm-cloud-sdk-core module supports the following types of token authentication:
 * Identity and Access Management (IAM, grant type: apikey)
 * Identity and Access Management (IAM, grant type: assume)
 * Cloud Pak for Data
 * Container (IKS, etc)
 * VPC Instance
 * Multi-Cloud Saas Platform (MCSP) V1
 * Multi-Cloud Saas Platform (MCSP) V2
 *
 * The token managers sit inside of an authenticator and do the work to retrieve
 * tokens, whereas the authenticators add these tokens to the actual request.
 *
 * classes:
 *   IamTokenManager: Token Manager of IAM via apikey.
 *   IamAssumeTokenManager: Token Manager of IAM via apikey and trusted profile.
 *   Cp4dTokenManager: Token Manager of CloudPak for data.
 *   ContainerTokenManager: Token manager of IAM via compute resource token.
 *   VpcInstanceTokenManager: Token manager of VPC Instance Metadata Service API tokens.
 *   McspTokenManager: Token Manager of MCSP v1 via apikey.
 *   McspV2TokenManager: Token Manager of MCSP v2 via apikey.
 *   JwtTokenManager: A class for shared functionality for parsing, storing, and requesting JWT tokens.
 */
var iam_token_manager_1 = require("./iam-token-manager");
Object.defineProperty(exports, "IamTokenManager", { enumerable: true, get: function () { return iam_token_manager_1.IamTokenManager; } });
var cp4d_token_manager_1 = require("./cp4d-token-manager");
Object.defineProperty(exports, "Cp4dTokenManager", { enumerable: true, get: function () { return cp4d_token_manager_1.Cp4dTokenManager; } });
var container_token_manager_1 = require("./container-token-manager");
Object.defineProperty(exports, "ContainerTokenManager", { enumerable: true, get: function () { return container_token_manager_1.ContainerTokenManager; } });
var iam_request_based_token_manager_1 = require("./iam-request-based-token-manager");
Object.defineProperty(exports, "IamRequestBasedTokenManager", { enumerable: true, get: function () { return iam_request_based_token_manager_1.IamRequestBasedTokenManager; } });
var jwt_token_manager_1 = require("./jwt-token-manager");
Object.defineProperty(exports, "JwtTokenManager", { enumerable: true, get: function () { return jwt_token_manager_1.JwtTokenManager; } });
var token_manager_1 = require("./token-manager");
Object.defineProperty(exports, "TokenManager", { enumerable: true, get: function () { return token_manager_1.TokenManager; } });
var vpc_instance_token_manager_1 = require("./vpc-instance-token-manager");
Object.defineProperty(exports, "VpcInstanceTokenManager", { enumerable: true, get: function () { return vpc_instance_token_manager_1.VpcInstanceTokenManager; } });
var mcsp_token_manager_1 = require("./mcsp-token-manager");
Object.defineProperty(exports, "McspTokenManager", { enumerable: true, get: function () { return mcsp_token_manager_1.McspTokenManager; } });
var mcspv2_token_manager_1 = require("./mcspv2-token-manager");
Object.defineProperty(exports, "McspV2TokenManager", { enumerable: true, get: function () { return mcspv2_token_manager_1.McspV2TokenManager; } });
var iam_assume_token_manager_1 = require("./iam-assume-token-manager");
Object.defineProperty(exports, "IamAssumeTokenManager", { enumerable: true, get: function () { return iam_assume_token_manager_1.IamAssumeTokenManager; } });
