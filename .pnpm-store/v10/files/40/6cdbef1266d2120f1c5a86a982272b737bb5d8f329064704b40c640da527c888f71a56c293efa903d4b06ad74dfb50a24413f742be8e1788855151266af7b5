"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMachineId = void 0;
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
const process = require("process");
let getMachineId;
exports.getMachineId = getMachineId;
switch (process.platform) {
    case 'darwin':
        (exports.getMachineId = getMachineId = require('./getMachineId-darwin').getMachineId);
        break;
    case 'linux':
        (exports.getMachineId = getMachineId = require('./getMachineId-linux').getMachineId);
        break;
    case 'freebsd':
        (exports.getMachineId = getMachineId = require('./getMachineId-bsd').getMachineId);
        break;
    case 'win32':
        (exports.getMachineId = getMachineId = require('./getMachineId-win').getMachineId);
        break;
    default:
        (exports.getMachineId = getMachineId = require('./getMachineId-unsupported').getMachineId);
}
//# sourceMappingURL=getMachineId.js.map