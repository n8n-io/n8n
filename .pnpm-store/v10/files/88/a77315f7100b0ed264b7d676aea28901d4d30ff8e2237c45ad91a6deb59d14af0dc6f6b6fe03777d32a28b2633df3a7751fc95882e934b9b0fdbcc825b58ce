"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuth = exports.auth = exports.DefaultTransporter = exports.PassThroughClient = exports.ExecutableError = exports.PluggableAuthClient = exports.DownscopedClient = exports.BaseExternalAccountClient = exports.ExternalAccountClient = exports.IdentityPoolClient = exports.AwsRequestSigner = exports.AwsClient = exports.UserRefreshClient = exports.LoginTicket = exports.ClientAuthentication = exports.OAuth2Client = exports.CodeChallengeMethod = exports.Impersonated = exports.JWT = exports.JWTAccess = exports.IdTokenClient = exports.IAMAuth = exports.GCPEnv = exports.Compute = exports.DEFAULT_UNIVERSE = exports.AuthClient = exports.gaxios = exports.gcpMetadata = void 0;
// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const googleauth_1 = require("./auth/googleauth");
Object.defineProperty(exports, "GoogleAuth", { enumerable: true, get: function () { return googleauth_1.GoogleAuth; } });
// Export common deps to ensure types/instances are the exact match. Useful
// for consistently configuring the library across versions.
exports.gcpMetadata = require("gcp-metadata");
exports.gaxios = require("gaxios");
var authclient_1 = require("./auth/authclient");
Object.defineProperty(exports, "AuthClient", { enumerable: true, get: function () { return authclient_1.AuthClient; } });
Object.defineProperty(exports, "DEFAULT_UNIVERSE", { enumerable: true, get: function () { return authclient_1.DEFAULT_UNIVERSE; } });
var computeclient_1 = require("./auth/computeclient");
Object.defineProperty(exports, "Compute", { enumerable: true, get: function () { return computeclient_1.Compute; } });
var envDetect_1 = require("./auth/envDetect");
Object.defineProperty(exports, "GCPEnv", { enumerable: true, get: function () { return envDetect_1.GCPEnv; } });
var iam_1 = require("./auth/iam");
Object.defineProperty(exports, "IAMAuth", { enumerable: true, get: function () { return iam_1.IAMAuth; } });
var idtokenclient_1 = require("./auth/idtokenclient");
Object.defineProperty(exports, "IdTokenClient", { enumerable: true, get: function () { return idtokenclient_1.IdTokenClient; } });
var jwtaccess_1 = require("./auth/jwtaccess");
Object.defineProperty(exports, "JWTAccess", { enumerable: true, get: function () { return jwtaccess_1.JWTAccess; } });
var jwtclient_1 = require("./auth/jwtclient");
Object.defineProperty(exports, "JWT", { enumerable: true, get: function () { return jwtclient_1.JWT; } });
var impersonated_1 = require("./auth/impersonated");
Object.defineProperty(exports, "Impersonated", { enumerable: true, get: function () { return impersonated_1.Impersonated; } });
var oauth2client_1 = require("./auth/oauth2client");
Object.defineProperty(exports, "CodeChallengeMethod", { enumerable: true, get: function () { return oauth2client_1.CodeChallengeMethod; } });
Object.defineProperty(exports, "OAuth2Client", { enumerable: true, get: function () { return oauth2client_1.OAuth2Client; } });
Object.defineProperty(exports, "ClientAuthentication", { enumerable: true, get: function () { return oauth2client_1.ClientAuthentication; } });
var loginticket_1 = require("./auth/loginticket");
Object.defineProperty(exports, "LoginTicket", { enumerable: true, get: function () { return loginticket_1.LoginTicket; } });
var refreshclient_1 = require("./auth/refreshclient");
Object.defineProperty(exports, "UserRefreshClient", { enumerable: true, get: function () { return refreshclient_1.UserRefreshClient; } });
var awsclient_1 = require("./auth/awsclient");
Object.defineProperty(exports, "AwsClient", { enumerable: true, get: function () { return awsclient_1.AwsClient; } });
var awsrequestsigner_1 = require("./auth/awsrequestsigner");
Object.defineProperty(exports, "AwsRequestSigner", { enumerable: true, get: function () { return awsrequestsigner_1.AwsRequestSigner; } });
var identitypoolclient_1 = require("./auth/identitypoolclient");
Object.defineProperty(exports, "IdentityPoolClient", { enumerable: true, get: function () { return identitypoolclient_1.IdentityPoolClient; } });
var externalclient_1 = require("./auth/externalclient");
Object.defineProperty(exports, "ExternalAccountClient", { enumerable: true, get: function () { return externalclient_1.ExternalAccountClient; } });
var baseexternalclient_1 = require("./auth/baseexternalclient");
Object.defineProperty(exports, "BaseExternalAccountClient", { enumerable: true, get: function () { return baseexternalclient_1.BaseExternalAccountClient; } });
var downscopedclient_1 = require("./auth/downscopedclient");
Object.defineProperty(exports, "DownscopedClient", { enumerable: true, get: function () { return downscopedclient_1.DownscopedClient; } });
var pluggable_auth_client_1 = require("./auth/pluggable-auth-client");
Object.defineProperty(exports, "PluggableAuthClient", { enumerable: true, get: function () { return pluggable_auth_client_1.PluggableAuthClient; } });
Object.defineProperty(exports, "ExecutableError", { enumerable: true, get: function () { return pluggable_auth_client_1.ExecutableError; } });
var passthrough_1 = require("./auth/passthrough");
Object.defineProperty(exports, "PassThroughClient", { enumerable: true, get: function () { return passthrough_1.PassThroughClient; } });
var transporters_1 = require("./transporters");
Object.defineProperty(exports, "DefaultTransporter", { enumerable: true, get: function () { return transporters_1.DefaultTransporter; } });
const auth = new googleauth_1.GoogleAuth();
exports.auth = auth;
