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
import { diag } from '@opentelemetry/api';
import { emptyResource, resourceFromDetectedResource } from './ResourceImpl';
/**
 * Runs all resource detectors and returns the results merged into a single Resource.
 *
 * @param config Configuration for resource detection
 */
export const detectResources = (config = {}) => {
    const resources = (config.detectors || []).map(d => {
        try {
            const resource = resourceFromDetectedResource(d.detect(config));
            diag.debug(`${d.constructor.name} found resource.`, resource);
            return resource;
        }
        catch (e) {
            diag.debug(`${d.constructor.name} failed: ${e.message}`);
            return emptyResource();
        }
    });
    // Future check if verbose logging is enabled issue #1903
    logResources(resources);
    return resources.reduce((acc, resource) => acc.merge(resource), emptyResource());
};
/**
 * Writes debug information about the detected resources to the logger defined in the resource detection config, if one is provided.
 *
 * @param resources The array of {@link Resource} that should be logged. Empty entries will be ignored.
 */
const logResources = (resources) => {
    resources.forEach(resource => {
        // Print only populated resources
        if (Object.keys(resource.attributes).length > 0) {
            const resourceDebugString = JSON.stringify(resource.attributes, null, 4);
            diag.verbose(resourceDebugString);
        }
    });
};
//# sourceMappingURL=detect-resources.js.map