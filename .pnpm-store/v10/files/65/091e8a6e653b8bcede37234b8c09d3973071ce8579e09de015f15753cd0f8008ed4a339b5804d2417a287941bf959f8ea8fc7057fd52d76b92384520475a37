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
exports.detectResources = void 0;
const api_1 = require("@opentelemetry/api");
const ResourceImpl_1 = require("./ResourceImpl");
/**
 * Runs all resource detectors and returns the results merged into a single Resource.
 *
 * @param config Configuration for resource detection
 */
const detectResources = (config = {}) => {
    const resources = (config.detectors || []).map(d => {
        try {
            const resource = (0, ResourceImpl_1.resourceFromDetectedResource)(d.detect(config));
            api_1.diag.debug(`${d.constructor.name} found resource.`, resource);
            return resource;
        }
        catch (e) {
            api_1.diag.debug(`${d.constructor.name} failed: ${e.message}`);
            return (0, ResourceImpl_1.emptyResource)();
        }
    });
    return resources.reduce((acc, resource) => acc.merge(resource), (0, ResourceImpl_1.emptyResource)());
};
exports.detectResources = detectResources;
//# sourceMappingURL=detect-resources.js.map