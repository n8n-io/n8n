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
exports._clearDefaultServiceNameCache = exports.defaultServiceName = void 0;
let serviceName;
/**
 * Returns the default service name for OpenTelemetry resources.
 * In Node.js environments, returns "unknown_service:<process.argv0>".
 * In browser/edge environments, returns "unknown_service".
 */
function defaultServiceName() {
    if (serviceName === undefined) {
        try {
            const argv0 = globalThis.process.argv0;
            serviceName = argv0 ? `unknown_service:${argv0}` : 'unknown_service';
        }
        catch {
            serviceName = 'unknown_service';
        }
    }
    return serviceName;
}
exports.defaultServiceName = defaultServiceName;
/** @internal For testing purposes only */
function _clearDefaultServiceNameCache() {
    serviceName = undefined;
}
exports._clearDefaultServiceNameCache = _clearDefaultServiceNameCache;
//# sourceMappingURL=default-service-name.js.map