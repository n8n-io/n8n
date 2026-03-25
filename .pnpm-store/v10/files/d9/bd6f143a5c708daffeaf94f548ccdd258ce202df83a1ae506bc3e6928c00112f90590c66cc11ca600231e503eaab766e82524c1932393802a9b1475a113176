"use strict";
/**
 * (C) Copyright IBM Corp. 2024.
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
exports.buildUserAgent = void 0;
var os = require('os');
var version = require('../package.json').version;
/**
 * Returns a string suitable as a value for the User-Agent header
 * @param componentName optional name of a component to be included in the returned string
 * @returns the user agent header value
 */
function buildUserAgent(componentName) {
    if (componentName === void 0) { componentName = null; }
    var subComponent = componentName ? "/".concat(componentName) : '';
    var userAgent = "ibm-node-sdk-core".concat(subComponent, "-").concat(version, " os.name=").concat(os.platform(), " os.version=").concat(os.release(), " node.version=").concat(process.version);
    return userAgent;
}
exports.buildUserAgent = buildUserAgent;
