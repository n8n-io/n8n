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
import * as process from 'process';
let getMachineIdImpl;
export async function getMachineId() {
    if (!getMachineIdImpl) {
        switch (process.platform) {
            case 'darwin':
                getMachineIdImpl = (await import('./getMachineId-darwin.js'))
                    .getMachineId;
                break;
            case 'linux':
                getMachineIdImpl = (await import('./getMachineId-linux.js'))
                    .getMachineId;
                break;
            case 'freebsd':
                getMachineIdImpl = (await import('./getMachineId-bsd.js')).getMachineId;
                break;
            case 'win32':
                getMachineIdImpl = (await import('./getMachineId-win.js')).getMachineId;
                break;
            default:
                getMachineIdImpl = (await import('./getMachineId-unsupported.js'))
                    .getMachineId;
                break;
        }
    }
    return getMachineIdImpl();
}
//# sourceMappingURL=getMachineId.js.map