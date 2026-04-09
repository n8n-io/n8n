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
export var normalizeArch = function (nodeArchString) {
    // Maps from https://nodejs.org/api/os.html#osarch to arch values in spec:
    // https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/host.md
    switch (nodeArchString) {
        case 'arm':
            return 'arm32';
        case 'ppc':
            return 'ppc32';
        case 'x64':
            return 'amd64';
        default:
            return nodeArchString;
    }
};
export var normalizeType = function (nodePlatform) {
    // Maps from https://nodejs.org/api/os.html#osplatform to arch values in spec:
    // https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/os.md
    switch (nodePlatform) {
        case 'sunos':
            return 'solaris';
        case 'win32':
            return 'windows';
        default:
            return nodePlatform;
    }
};
//# sourceMappingURL=utils.js.map