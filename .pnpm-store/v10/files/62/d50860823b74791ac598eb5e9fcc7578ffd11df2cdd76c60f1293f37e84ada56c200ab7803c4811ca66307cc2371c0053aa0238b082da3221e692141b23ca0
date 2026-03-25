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
import { execAsync } from './execAsync';
import { diag } from '@opentelemetry/api';
export async function getMachineId() {
    try {
        const result = await execAsync('ioreg -rd1 -c "IOPlatformExpertDevice"');
        const idLine = result.stdout
            .split('\n')
            .find(line => line.includes('IOPlatformUUID'));
        if (!idLine) {
            return undefined;
        }
        const parts = idLine.split('" = "');
        if (parts.length === 2) {
            return parts[1].slice(0, -1);
        }
    }
    catch (e) {
        diag.debug(`error reading machine id: ${e}`);
    }
    return undefined;
}
//# sourceMappingURL=getMachineId-darwin.js.map