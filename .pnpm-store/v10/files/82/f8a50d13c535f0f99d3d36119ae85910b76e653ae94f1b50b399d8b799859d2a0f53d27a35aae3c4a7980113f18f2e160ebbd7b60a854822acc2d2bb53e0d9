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
exports.RoundRobinLoadBalancer = void 0;
exports.setup = setup;
const load_balancer_1 = require("./load-balancer");
const connectivity_state_1 = require("./connectivity-state");
const picker_1 = require("./picker");
const logging = require("./logging");
const constants_1 = require("./constants");
const subchannel_address_1 = require("./subchannel-address");
const load_balancer_pick_first_1 = require("./load-balancer-pick-first");
const TRACER_NAME = 'round_robin';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
const TYPE_NAME = 'round_robin';
class RoundRobinLoadBalancingConfig {
    getLoadBalancerName() {
        return TYPE_NAME;
    }
    constructor() { }
    toJsonObject() {
        return {
            [TYPE_NAME]: {},
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static createFromJson(obj) {
        return new RoundRobinLoadBalancingConfig();
    }
}
class RoundRobinPicker {
    constructor(children, nextIndex = 0) {
        this.children = children;
        this.nextIndex = nextIndex;
    }
    pick(pickArgs) {
        const childPicker = this.children[this.nextIndex].picker;
        this.nextIndex = (this.nextIndex + 1) % this.children.length;
        return childPicker.pick(pickArgs);
    }
    /**
     * Check what the next subchannel returned would be. Used by the load
     * balancer implementation to preserve this part of the picker state if
     * possible when a subchannel connects or disconnects.
     */
    peekNextEndpoint() {
        return this.children[this.nextIndex].endpoint;
    }
}
class RoundRobinLoadBalancer {
    constructor(channelControlHelper) {
        this.channelControlHelper = channelControlHelper;
        this.children = [];
        this.currentState = connectivity_state_1.ConnectivityState.IDLE;
        this.currentReadyPicker = null;
        this.updatesPaused = false;
        this.lastError = null;
        this.childChannelControlHelper = (0, load_balancer_1.createChildChannelControlHelper)(channelControlHelper, {
            updateState: (connectivityState, picker, errorMessage) => {
                /* Ensure that name resolution is requested again after active
                 * connections are dropped. This is more aggressive than necessary to
                 * accomplish that, so we are counting on resolvers to have
                 * reasonable rate limits. */
                if (this.currentState === connectivity_state_1.ConnectivityState.READY && connectivityState !== connectivity_state_1.ConnectivityState.READY) {
                    this.channelControlHelper.requestReresolution();
                }
                if (errorMessage) {
                    this.lastError = errorMessage;
                }
                this.calculateAndUpdateState();
            },
        });
    }
    countChildrenWithState(state) {
        return this.children.filter(child => child.getConnectivityState() === state)
            .length;
    }
    calculateAndUpdateState() {
        if (this.updatesPaused) {
            return;
        }
        if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.READY) > 0) {
            const readyChildren = this.children.filter(child => child.getConnectivityState() === connectivity_state_1.ConnectivityState.READY);
            let index = 0;
            if (this.currentReadyPicker !== null) {
                const nextPickedEndpoint = this.currentReadyPicker.peekNextEndpoint();
                index = readyChildren.findIndex(child => (0, subchannel_address_1.endpointEqual)(child.getEndpoint(), nextPickedEndpoint));
                if (index < 0) {
                    index = 0;
                }
            }
            this.updateState(connectivity_state_1.ConnectivityState.READY, new RoundRobinPicker(readyChildren.map(child => ({
                endpoint: child.getEndpoint(),
                picker: child.getPicker(),
            })), index), null);
        }
        else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.CONNECTING) > 0) {
            this.updateState(connectivity_state_1.ConnectivityState.CONNECTING, new picker_1.QueuePicker(this), null);
        }
        else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) > 0) {
            const errorMessage = `round_robin: No connection established. Last error: ${this.lastError}`;
            this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker({
                details: errorMessage,
            }), errorMessage);
        }
        else {
            this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
        }
        /* round_robin should keep all children connected, this is how we do that.
         * We can't do this more efficiently in the individual child's updateState
         * callback because that doesn't have a reference to which child the state
         * change is associated with. */
        for (const child of this.children) {
            if (child.getConnectivityState() === connectivity_state_1.ConnectivityState.IDLE) {
                child.exitIdle();
            }
        }
    }
    updateState(newState, picker, errorMessage) {
        trace(connectivity_state_1.ConnectivityState[this.currentState] +
            ' -> ' +
            connectivity_state_1.ConnectivityState[newState]);
        if (newState === connectivity_state_1.ConnectivityState.READY) {
            this.currentReadyPicker = picker;
        }
        else {
            this.currentReadyPicker = null;
        }
        this.currentState = newState;
        this.channelControlHelper.updateState(newState, picker, errorMessage);
    }
    resetSubchannelList() {
        for (const child of this.children) {
            child.destroy();
        }
    }
    updateAddressList(endpointList, lbConfig, options) {
        this.resetSubchannelList();
        trace('Connect to endpoint list ' + endpointList.map(subchannel_address_1.endpointToString));
        this.updatesPaused = true;
        this.children = endpointList.map(endpoint => new load_balancer_pick_first_1.LeafLoadBalancer(endpoint, this.childChannelControlHelper, options));
        for (const child of this.children) {
            child.startConnecting();
        }
        this.updatesPaused = false;
        this.calculateAndUpdateState();
    }
    exitIdle() {
        /* The round_robin LB policy is only in the IDLE state if it has no
         * addresses to try to connect to and it has no picked subchannel.
         * In that case, there is no meaningful action that can be taken here. */
    }
    resetBackoff() {
        // This LB policy has no backoff to reset
    }
    destroy() {
        this.resetSubchannelList();
    }
    getTypeName() {
        return TYPE_NAME;
    }
}
exports.RoundRobinLoadBalancer = RoundRobinLoadBalancer;
function setup() {
    (0, load_balancer_1.registerLoadBalancerType)(TYPE_NAME, RoundRobinLoadBalancer, RoundRobinLoadBalancingConfig);
}
//# sourceMappingURL=load-balancer-round-robin.js.map