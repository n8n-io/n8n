"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoute = exports.replaceCurrentStackRoute = exports.addNewStackLayer = void 0;
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const api_1 = require("@opentelemetry/api");
const internal_types_1 = require("./internal-types");
const addNewStackLayer = (request) => {
    if (Array.isArray(request[internal_types_1._LAYERS_STORE_PROPERTY]) === false) {
        Object.defineProperty(request, internal_types_1._LAYERS_STORE_PROPERTY, {
            enumerable: false,
            value: [],
        });
    }
    request[internal_types_1._LAYERS_STORE_PROPERTY].push('/');
    const stackLength = request[internal_types_1._LAYERS_STORE_PROPERTY].length;
    return () => {
        if (stackLength === request[internal_types_1._LAYERS_STORE_PROPERTY].length) {
            request[internal_types_1._LAYERS_STORE_PROPERTY].pop();
        }
        else {
            api_1.diag.warn('Connect: Trying to pop the stack multiple time');
        }
    };
};
exports.addNewStackLayer = addNewStackLayer;
const replaceCurrentStackRoute = (request, newRoute) => {
    if (newRoute) {
        request[internal_types_1._LAYERS_STORE_PROPERTY].splice(-1, 1, newRoute);
    }
};
exports.replaceCurrentStackRoute = replaceCurrentStackRoute;
// generate route from existing stack on request object.
// splash between stack layer will be deduped
// ["/first/", "/second", "/third/"] => /first/second/third/
const generateRoute = (request) => {
    return request[internal_types_1._LAYERS_STORE_PROPERTY].reduce((acc, sub) => acc.replace(/\/+$/, '') + sub);
};
exports.generateRoute = generateRoute;
//# sourceMappingURL=utils.js.map