"use strict";
// Copyright 2021 Google LLC
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalAccountClient = void 0;
const baseexternalclient_1 = require("./baseexternalclient");
const identitypoolclient_1 = require("./identitypoolclient");
const awsclient_1 = require("./awsclient");
const pluggable_auth_client_1 = require("./pluggable-auth-client");
/**
 * Dummy class with no constructor. Developers are expected to use fromJSON.
 */
class ExternalAccountClient {
    constructor() {
        throw new Error('ExternalAccountClients should be initialized via: ' +
            'ExternalAccountClient.fromJSON(), ' +
            'directly via explicit constructors, eg. ' +
            'new AwsClient(options), new IdentityPoolClient(options), new' +
            'PluggableAuthClientOptions, or via ' +
            'new GoogleAuth(options).getClient()');
    }
    /**
     * This static method will instantiate the
     * corresponding type of external account credential depending on the
     * underlying credential source.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @param additionalOptions **DEPRECATED, all options are available in the
     *   `options` parameter.** Optional additional behavior customization options.
     *   These currently customize expiration threshold time and whether to retry
     *   on 401/403 API request errors.
     * @return A BaseExternalAccountClient instance or null if the options
     *   provided do not correspond to an external account credential.
     */
    static fromJSON(options, additionalOptions) {
        var _a, _b;
        if (options && options.type === baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE) {
            if ((_a = options.credential_source) === null || _a === void 0 ? void 0 : _a.environment_id) {
                return new awsclient_1.AwsClient(options, additionalOptions);
            }
            else if ((_b = options.credential_source) === null || _b === void 0 ? void 0 : _b.executable) {
                return new pluggable_auth_client_1.PluggableAuthClient(options, additionalOptions);
            }
            else {
                return new identitypoolclient_1.IdentityPoolClient(options, additionalOptions);
            }
        }
        else {
            return null;
        }
    }
}
exports.ExternalAccountClient = ExternalAccountClient;
