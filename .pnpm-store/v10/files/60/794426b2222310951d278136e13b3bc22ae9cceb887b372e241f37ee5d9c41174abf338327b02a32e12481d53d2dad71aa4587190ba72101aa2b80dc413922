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
exports.getMachineId = void 0;
const fs_1 = require("fs");
const execAsync_1 = require("./execAsync");
const api_1 = require("@opentelemetry/api");
async function getMachineId() {
    try {
        const result = await fs_1.promises.readFile('/etc/hostid', { encoding: 'utf8' });
        return result.trim();
    }
    catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
    }
    try {
        const result = await (0, execAsync_1.execAsync)('kenv -q smbios.system.uuid');
        return result.stdout.trim();
    }
    catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
    }
    return undefined;
}
exports.getMachineId = getMachineId;
//# sourceMappingURL=getMachineId-bsd.js.map