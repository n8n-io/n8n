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
import { diag } from '@opentelemetry/api';
var SendBeaconTransport = /** @class */ (function () {
    function SendBeaconTransport(_params) {
        this._params = _params;
    }
    SendBeaconTransport.prototype.send = function (data) {
        var _this = this;
        return new Promise(function (resolve) {
            if (navigator.sendBeacon(_this._params.url, new Blob([data], { type: _this._params.blobType }))) {
                // no way to signal retry, treat everything as success
                diag.debug('SendBeacon success');
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
    };
    SendBeaconTransport.prototype.shutdown = function () {
        // Intentionally left empty, nothing to do.
    };
    return SendBeaconTransport;
}());
export function createSendBeaconTransport(parameters) {
    return new SendBeaconTransport(parameters);
}
//# sourceMappingURL=send-beacon-transport.js.map