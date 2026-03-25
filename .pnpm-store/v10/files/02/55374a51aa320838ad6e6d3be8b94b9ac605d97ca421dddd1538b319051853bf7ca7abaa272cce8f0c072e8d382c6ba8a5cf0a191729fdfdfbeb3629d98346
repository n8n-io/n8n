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
exports.hostDetector = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const os_1 = require("os");
const getMachineId_1 = require("./machine-id/getMachineId");
const utils_1 = require("./utils");
/**
 * HostDetector detects the resources related to the host current process is
 * running on. Currently only non-cloud-based attributes are included.
 */
class HostDetector {
    detect(_config) {
        const attributes = {
            [semantic_conventions_1.SEMRESATTRS_HOST_NAME]: (0, os_1.hostname)(),
            [semantic_conventions_1.SEMRESATTRS_HOST_ARCH]: (0, utils_1.normalizeArch)((0, os_1.arch)()),
            [semantic_conventions_1.SEMRESATTRS_HOST_ID]: (0, getMachineId_1.getMachineId)(),
        };
        return { attributes };
    }
}
exports.hostDetector = new HostDetector();
//# sourceMappingURL=HostDetector.js.map