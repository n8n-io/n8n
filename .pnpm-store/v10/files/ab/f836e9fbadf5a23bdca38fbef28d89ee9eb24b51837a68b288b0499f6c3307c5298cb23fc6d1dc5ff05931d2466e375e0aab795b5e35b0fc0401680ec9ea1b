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
import { SEMRESATTRS_HOST_ARCH, SEMRESATTRS_HOST_ID, SEMRESATTRS_HOST_NAME, } from '@opentelemetry/semantic-conventions';
import { Resource } from '../../../Resource';
import { arch, hostname } from 'os';
import { normalizeArch } from './utils';
import { getMachineId } from './machine-id/getMachineId';
/**
 * HostDetectorSync detects the resources related to the host current process is
 * running on. Currently only non-cloud-based attributes are included.
 */
var HostDetectorSync = /** @class */ (function () {
    function HostDetectorSync() {
    }
    HostDetectorSync.prototype.detect = function (_config) {
        var _a;
        var attributes = (_a = {},
            _a[SEMRESATTRS_HOST_NAME] = hostname(),
            _a[SEMRESATTRS_HOST_ARCH] = normalizeArch(arch()),
            _a);
        return new Resource(attributes, this._getAsyncAttributes());
    };
    HostDetectorSync.prototype._getAsyncAttributes = function () {
        return getMachineId().then(function (machineId) {
            var attributes = {};
            if (machineId) {
                attributes[SEMRESATTRS_HOST_ID] = machineId;
            }
            return attributes;
        });
    };
    return HostDetectorSync;
}());
export var hostDetectorSync = new HostDetectorSync();
//# sourceMappingURL=HostDetectorSync.js.map