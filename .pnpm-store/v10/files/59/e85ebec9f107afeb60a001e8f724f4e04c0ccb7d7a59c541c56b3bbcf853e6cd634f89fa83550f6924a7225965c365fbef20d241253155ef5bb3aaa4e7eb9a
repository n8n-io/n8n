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
import { SEMRESATTRS_OS_TYPE, SEMRESATTRS_OS_VERSION, } from '@opentelemetry/semantic-conventions';
import { Resource } from '../../../Resource';
import { platform, release } from 'os';
import { normalizeType } from './utils';
/**
 * OSDetectorSync detects the resources related to the operating system (OS) on
 * which the process represented by this resource is running.
 */
var OSDetectorSync = /** @class */ (function () {
    function OSDetectorSync() {
    }
    OSDetectorSync.prototype.detect = function (_config) {
        var _a;
        var attributes = (_a = {},
            _a[SEMRESATTRS_OS_TYPE] = normalizeType(platform()),
            _a[SEMRESATTRS_OS_VERSION] = release(),
            _a);
        return new Resource(attributes);
    };
    return OSDetectorSync;
}());
export var osDetectorSync = new OSDetectorSync();
//# sourceMappingURL=OSDetectorSync.js.map