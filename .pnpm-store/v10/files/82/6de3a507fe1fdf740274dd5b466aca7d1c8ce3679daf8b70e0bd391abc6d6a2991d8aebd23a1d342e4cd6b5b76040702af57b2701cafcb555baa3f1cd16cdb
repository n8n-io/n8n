"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
// Accepts an options object passed from the user to the API.  In the
// previous version of the API, it referred to a `Request` options object.
// Now it refers to an Axiox Request Config object.  This is here to help
// ensure users don't pass invalid options when they upgrade from 0.x to 1.x.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validate(options) {
    const vpairs = [
        { invalid: 'uri', expected: 'url' },
        { invalid: 'json', expected: 'data' },
        { invalid: 'qs', expected: 'params' },
    ];
    for (const pair of vpairs) {
        if (options[pair.invalid]) {
            const e = `'${pair.invalid}' is not a valid configuration option. Please use '${pair.expected}' instead. This library is using Axios for requests. Please see https://github.com/axios/axios to learn more about the valid request options.`;
            throw new Error(e);
        }
    }
}
