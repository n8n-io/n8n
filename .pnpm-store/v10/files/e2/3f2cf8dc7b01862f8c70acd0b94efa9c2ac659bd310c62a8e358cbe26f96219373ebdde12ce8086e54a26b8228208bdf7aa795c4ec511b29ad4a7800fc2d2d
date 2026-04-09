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
exports.createSendBeaconTransport = void 0;
const api_1 = require("@opentelemetry/api");
class SendBeaconTransport {
    constructor(_params) {
        this._params = _params;
    }
    send(data) {
        return new Promise(resolve => {
            if (navigator.sendBeacon(this._params.url, new Blob([data], { type: this._params.blobType }))) {
                // no way to signal retry, treat everything as success
                api_1.diag.debug('SendBeacon success');
                resolve({
                    status: 'success',
                });
            }
            else {
                resolve({
                    status: 'failure',
                    error: new Error('SendBeacon failed'),
                });
            }
        });
    }
    shutdown() {
        // Intentionally left empty, nothing to do.
    }
}
function createSendBeaconTransport(parameters) {
    return new SendBeaconTransport(parameters);
}
exports.createSendBeaconTransport = createSendBeaconTransport;
//# sourceMappingURL=send-beacon-transport.js.map