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
/**
 * Placeholder normalize function to replace the node variant in browser runtimes,
 * this should never be called and will perform a no-op and warn if it is called regardless.
 *
 * This is a workaround to fix https://github.com/open-telemetry/opentelemetry-js/issues/4373 until the instrumentation
 * package can be made node-only.
 *
 * @param path input path
 * @return unmodified path
 * @internal
 */
export function normalize(path) {
    diag.warn('Path normalization is not implemented for this platform. To silence this warning, ensure no node-specific instrumentations are loaded, and node-specific types (e.g. InstrumentationNodeModuleFile), are not used in a browser context)');
    return path;
}
//# sourceMappingURL=noop-normalize.js.map