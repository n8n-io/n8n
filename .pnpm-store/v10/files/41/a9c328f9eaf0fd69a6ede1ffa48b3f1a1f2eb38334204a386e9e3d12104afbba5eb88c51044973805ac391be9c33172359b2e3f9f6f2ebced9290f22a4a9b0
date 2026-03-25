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
     * @return A BaseExternalAccountClient instance or null if the options
     *   provided do not correspond to an external account credential.
     */
    static fromJSON(options) {
        if (options && options.type === baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE) {
            if (options.credential_source?.environment_id) {
                return new awsclient_1.AwsClient(options);
            }
            else if (options.credential_source?.executable) {
                return new pluggable_auth_client_1.PluggableAuthClient(options);
            }
            else {
                return new identitypoolclient_1.IdentityPoolClient(options);
            }
        }
        else {
            return null;
        }
    }
}
exports.ExternalAccountClient = ExternalAccountClient;
//# sourceMappingURL=externalclient.js.map