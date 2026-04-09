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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { diag } from '@opentelemetry/api';
import { SEMRESATTRS_PROCESS_COMMAND, SEMRESATTRS_PROCESS_COMMAND_ARGS, SEMRESATTRS_PROCESS_EXECUTABLE_NAME, SEMRESATTRS_PROCESS_EXECUTABLE_PATH, SEMRESATTRS_PROCESS_OWNER, SEMRESATTRS_PROCESS_PID, SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION, SEMRESATTRS_PROCESS_RUNTIME_NAME, SEMRESATTRS_PROCESS_RUNTIME_VERSION, } from '@opentelemetry/semantic-conventions';
import { Resource } from '../../../Resource';
import * as os from 'os';
/**
 * ProcessDetectorSync will be used to detect the resources related current process running
 * and being instrumented from the NodeJS Process module.
 */
var ProcessDetectorSync = /** @class */ (function () {
    function ProcessDetectorSync() {
    }
    ProcessDetectorSync.prototype.detect = function (_config) {
        var _a;
        var attributes = (_a = {},
            _a[SEMRESATTRS_PROCESS_PID] = process.pid,
            _a[SEMRESATTRS_PROCESS_EXECUTABLE_NAME] = process.title,
            _a[SEMRESATTRS_PROCESS_EXECUTABLE_PATH] = process.execPath,
            _a[SEMRESATTRS_PROCESS_COMMAND_ARGS] = __spreadArray(__spreadArray([
                process.argv[0]
            ], __read(process.execArgv), false), __read(process.argv.slice(1)), false),
            _a[SEMRESATTRS_PROCESS_RUNTIME_VERSION] = process.versions.node,
            _a[SEMRESATTRS_PROCESS_RUNTIME_NAME] = 'nodejs',
            _a[SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION] = 'Node.js',
            _a);
        if (process.argv.length > 1) {
            attributes[SEMRESATTRS_PROCESS_COMMAND] = process.argv[1];
        }
        try {
            var userInfo = os.userInfo();
            attributes[SEMRESATTRS_PROCESS_OWNER] = userInfo.username;
        }
        catch (e) {
            diag.debug("error obtaining process owner: " + e);
        }
        return new Resource(attributes);
    };
    return ProcessDetectorSync;
}());
export var processDetectorSync = new ProcessDetectorSync();
//# sourceMappingURL=ProcessDetectorSync.js.map