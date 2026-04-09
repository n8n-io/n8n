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
import { Resource } from './Resource';
import { diag } from '@opentelemetry/api';
import { isPromiseLike } from './utils';
/**
 * Runs all resource detectors and returns the results merged into a single Resource. Promise
 * does not resolve until all the underlying detectors have resolved, unlike
 * detectResourcesSync.
 *
 * @deprecated use detectResourcesSync() instead.
 * @param config Configuration for resource detection
 */
export const detectResources = async (config = {}) => {
    const resources = await Promise.all((config.detectors || []).map(async (d) => {
        try {
            const resource = await d.detect(config);
            diag.debug(`${d.constructor.name} found resource.`, resource);
            return resource;
        }
        catch (e) {
            diag.debug(`${d.constructor.name} failed: ${e.message}`);
            return Resource.empty();
        }
    }));
    // Future check if verbose logging is enabled issue #1903
    logResources(resources);
    return resources.reduce((acc, resource) => acc.merge(resource), Resource.empty());
};
/**
 * Runs all resource detectors synchronously, merging their results. In case of attribute collision later resources will take precedence.
 *
 * @param config Configuration for resource detection
 */
export const detectResourcesSync = (config = {}) => {
    var _a;
    const resources = ((_a = config.detectors) !== null && _a !== void 0 ? _a : []).map((d) => {
        try {
            const resourceOrPromise = d.detect(config);
            let resource;
            if (isPromiseLike(resourceOrPromise)) {
                const createPromise = async () => {
                    const resolvedResource = await resourceOrPromise;
                    return resolvedResource.attributes;
                };
                resource = new Resource({}, createPromise());
            }
            else {
                resource = resourceOrPromise;
            }
            if (resource.waitForAsyncAttributes) {
                void resource
                    .waitForAsyncAttributes()
                    .then(() => diag.debug(`${d.constructor.name} found resource.`, resource));
            }
            else {
                diag.debug(`${d.constructor.name} found resource.`, resource);
            }
            return resource;
        }
        catch (e) {
            diag.error(`${d.constructor.name} failed: ${e.message}`);
            return Resource.empty();
        }
    });
    const mergedResources = resources.reduce((acc, resource) => acc.merge(resource), Resource.empty());
    if (mergedResources.waitForAsyncAttributes) {
        void mergedResources.waitForAsyncAttributes().then(() => {
            // Future check if verbose logging is enabled issue #1903
            logResources(resources);
        });
    }
    return mergedResources;
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