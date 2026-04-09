"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserDetectorSync = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
const Resource_1 = require("../Resource");
/**
 * BrowserDetectorSync will be used to detect the resources related to browser.
 */
class BrowserDetectorSync {
    detect(config) {
        var _a, _b, _c;
        const isBrowser = typeof navigator !== 'undefined' &&
            ((_b = (_a = global.process) === null || _a === void 0 ? void 0 : _a.versions) === null || _b === void 0 ? void 0 : _b.node) === undefined && // Node.js v21 adds `navigator`
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore don't have Bun types
            ((_c = global.Bun) === null || _c === void 0 ? void 0 : _c.version) === undefined; // Bun (bun.sh) defines `navigator`
        if (!isBrowser) {
            return Resource_1.Resource.empty();
        }
        const browserResource = {
            [semantic_conventions_1.SEMRESATTRS_PROCESS_RUNTIME_NAME]: 'browser',
            [semantic_conventions_1.SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION]: 'Web Browser',
            [semantic_conventions_1.SEMRESATTRS_PROCESS_RUNTIME_VERSION]: navigator.userAgent,
        };
        return this._getResourceAttributes(browserResource, config);
    }
    /**
     * Validates process resource attribute map from process variables
     *
     * @param browserResource The un-sanitized resource attributes from process as key/value pairs.
     * @param config: Config
     * @returns The sanitized resource attributes.
     */
    _getResourceAttributes(browserResource, _config) {
        if (browserResource[semantic_conventions_1.SEMRESATTRS_PROCESS_RUNTIME_VERSION] === '') {
            api_1.diag.debug('BrowserDetector failed: Unable to find required browser resources. ');
            return Resource_1.Resource.empty();
        }
        else {
            return new Resource_1.Resource(Object.assign({}, browserResource));
        }
    }
}
exports.browserDetectorSync = new BrowserDetectorSync();
//# sourceMappingURL=BrowserDetectorSync.js.map