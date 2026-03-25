"use strict";
// Copyright 2014 Google LLC
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
exports.IAMAuth = void 0;
class IAMAuth {
    selector;
    token;
    /**
     * IAM credentials.
     *
     * @param selector the iam authority selector
     * @param token the token
     * @constructor
     */
    constructor(selector, token) {
        this.selector = selector;
        this.token = token;
        this.selector = selector;
        this.token = token;
    }
    /**
     * Acquire the HTTP headers required to make an authenticated request.
     */
    getRequestHeaders() {
        return {
            'x-goog-iam-authority-selector': this.selector,
            'x-goog-iam-authorization-token': this.token,
        };
    }
}
exports.IAMAuth = IAMAuth;
//# sourceMappingURL=iam.js.map