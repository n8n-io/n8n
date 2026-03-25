"use strict";
// Copyright 2024 Google LLC
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
exports.PassThroughClient = void 0;
const authclient_1 = require("./authclient");
/**
 * An AuthClient without any Authentication information. Useful for:
 * - Anonymous access
 * - Local Emulators
 * - Testing Environments
 *
 */
class PassThroughClient extends authclient_1.AuthClient {
    /**
     * Creates a request without any authentication headers or checks.
     *
     * @remarks
     *
     * In testing environments it may be useful to change the provided
     * {@link AuthClient.transporter} for any desired request overrides/handling.
     *
     * @param opts
     * @returns The response of the request.
     */
    async request(opts) {
        return this.transporter.request(opts);
    }
    /**
     * A required method of the base class.
     * Always will return an empty object.
     *
     * @returns {}
     */
    async getAccessToken() {
        return {};
    }
    /**
     * A required method of the base class.
     * Always will return an empty object.
     *
     * @returns {}
     */
    async getRequestHeaders() {
        return new Headers();
    }
}
exports.PassThroughClient = PassThroughClient;
//# sourceMappingURL=passthrough.js.map