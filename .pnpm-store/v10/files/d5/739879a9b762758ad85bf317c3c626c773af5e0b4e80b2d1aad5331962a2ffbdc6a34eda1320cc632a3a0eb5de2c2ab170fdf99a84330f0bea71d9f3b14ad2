"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuePicker = exports.UnavailablePicker = exports.PickResultType = void 0;
const metadata_1 = require("./metadata");
const constants_1 = require("./constants");
var PickResultType;
(function (PickResultType) {
    PickResultType[PickResultType["COMPLETE"] = 0] = "COMPLETE";
    PickResultType[PickResultType["QUEUE"] = 1] = "QUEUE";
    PickResultType[PickResultType["TRANSIENT_FAILURE"] = 2] = "TRANSIENT_FAILURE";
    PickResultType[PickResultType["DROP"] = 3] = "DROP";
})(PickResultType || (exports.PickResultType = PickResultType = {}));
/**
 * A standard picker representing a load balancer in the TRANSIENT_FAILURE
 * state. Always responds to every pick request with an UNAVAILABLE status.
 */
class UnavailablePicker {
    constructor(status) {
        this.status = Object.assign({ code: constants_1.Status.UNAVAILABLE, details: 'No connection established', metadata: new metadata_1.Metadata() }, status);
    }
    pick(pickArgs) {
        return {
            pickResultType: PickResultType.TRANSIENT_FAILURE,
            subchannel: null,
            status: this.status,
            onCallStarted: null,
            onCallEnded: null,
        };
    }
}
exports.UnavailablePicker = UnavailablePicker;
/**
 * A standard picker representing a load balancer in the IDLE or CONNECTING
 * state. Always responds to every pick request with a QUEUE pick result
 * indicating that the pick should be tried again with the next `Picker`. Also
 * reports back to the load balancer that a connection should be established
 * once any pick is attempted.
 * If the childPicker is provided, delegate to it instead of returning the
 * hardcoded QUEUE pick result, but still calls exitIdle.
 */
class QueuePicker {
    // Constructed with a load balancer. Calls exitIdle on it the first time pick is called
    constructor(loadBalancer, childPicker) {
        this.loadBalancer = loadBalancer;
        this.childPicker = childPicker;
        this.calledExitIdle = false;
    }
    pick(pickArgs) {
        if (!this.calledExitIdle) {
            process.nextTick(() => {
                this.loadBalancer.exitIdle();
            });
            this.calledExitIdle = true;
        }
        if (this.childPicker) {
            return this.childPicker.pick(pickArgs);
        }
        else {
            return {
                pickResultType: PickResultType.QUEUE,
                subchannel: null,
                status: null,
                onCallStarted: null,
                onCallEnded: null,
            };
        }
    }
}
exports.QueuePicker = QueuePicker;
//# sourceMappingURL=picker.js.map