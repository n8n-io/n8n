"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingProjectIdError = exports.replaceProjectIdToken = void 0;
const stream_1 = require("stream");
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
/**
 * Populate the `{{projectId}}` placeholder.
 *
 * @throws {Error} If a projectId is required, but one is not provided.
 *
 * @param {*} - Any input value that may contain a placeholder. Arrays and objects will be looped.
 * @param {string} projectId - A projectId. If not provided
 * @return {*} - The original argument with all placeholders populated.
 */
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function replaceProjectIdToken(value, projectId) {
    if (Array.isArray(value)) {
        value = value.map(v => replaceProjectIdToken(v, projectId));
    }
    if (value !== null &&
        typeof value === 'object' &&
        !(value instanceof Buffer) &&
        !(value instanceof stream_1.Stream) &&
        typeof value.hasOwnProperty === 'function') {
        for (const opt in value) {
            // eslint-disable-next-line no-prototype-builtins
            if (value.hasOwnProperty(opt)) {
                value[opt] = replaceProjectIdToken(value[opt], projectId);
            }
        }
    }
    if (typeof value === 'string' &&
        value.indexOf('{{projectId}}') > -1) {
        if (!projectId || projectId === '{{projectId}}') {
            throw new MissingProjectIdError();
        }
        value = value.replace(/{{projectId}}/g, projectId);
    }
    return value;
}
exports.replaceProjectIdToken = replaceProjectIdToken;
/**
 * Custom error type for missing project ID errors.
 */
class MissingProjectIdError extends Error {
    constructor() {
        super(...arguments);
        this.message = `Sorry, we cannot connect to Cloud Services without a project
    ID. You may specify one with an environment variable named
    "GOOGLE_CLOUD_PROJECT".`.replace(/ +/g, ' ');
    }
}
exports.MissingProjectIdError = MissingProjectIdError;
//# sourceMappingURL=index.js.map