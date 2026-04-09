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
exports.hostDetectorSync = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const Resource_1 = require("../../../Resource");
const os_1 = require("os");
const utils_1 = require("./utils");
const getMachineId_1 = require("./machine-id/getMachineId");
/**
 * HostDetectorSync detects the resources related to the host current process is
 * running on. Currently only non-cloud-based attributes are included.
 */
class HostDetectorSync {
    detect(_config) {
        const attributes = {
            [semantic_conventions_1.SEMRESATTRS_HOST_NAME]: (0, os_1.hostname)(),
            [semantic_conventions_1.SEMRESATTRS_HOST_ARCH]: (0, utils_1.normalizeArch)((0, os_1.arch)()),
        };
        return new Resource_1.Resource(attributes, this._getAsyncAttributes());
    }
    _getAsyncAttributes() {
        return (0, getMachineId_1.getMachineId)().then(machineId => {
            const attributes = {};
            if (machineId) {
                attributes[semantic_conventions_1.SEMRESATTRS_HOST_ID] = machineId;
            }
            return attributes;
        });
    }
}
exports.hostDetectorSync = new HostDetectorSync();
//# sourceMappingURL=HostDetectorSync.js.map