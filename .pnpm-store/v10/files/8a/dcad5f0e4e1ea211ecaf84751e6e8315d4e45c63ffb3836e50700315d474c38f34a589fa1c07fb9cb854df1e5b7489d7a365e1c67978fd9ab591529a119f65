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
    return resources.reduce((acc, resource) => acc.merge(resource), emptyResource());
};
//# sourceMappingURL=detect-resources.js.map