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
exports.LeafLoadBalancer = exports.PickFirstLoadBalancer = exports.PickFirstLoadBalancingConfig = void 0;
exports.shuffled = shuffled;
exports.setup = setup;
const load_balancer_1 = require("./load-balancer");
const connectivity_state_1 = require("./connectivity-state");
const picker_1 = require("./picker");
const subchannel_address_1 = require("./subchannel-address");
const logging = require("./logging");
const constants_1 = require("./constants");
const subchannel_address_2 = require("./subchannel-address");
const net_1 = require("net");
const TRACER_NAME = 'pick_first';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
const TYPE_NAME = 'pick_first';
/**
 * Delay after starting a connection on a subchannel before starting a
 * connection on the next subchannel in the list, for Happy Eyeballs algorithm.
 */
const CONNECTION_DELAY_INTERVAL_MS = 250;
class PickFirstLoadBalancingConfig {
    constructor(shuffleAddressList) {
        this.shuffleAddressList = shuffleAddressList;
    }
    getLoadBalancerName() {
        return TYPE_NAME;
    }
    toJsonObject() {
        return {
            [TYPE_NAME]: {
                shuffleAddressList: this.shuffleAddressList,
            },
        };
    }
    getShuffleAddressList() {
        return this.shuffleAddressList;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static createFromJson(obj) {
        if ('shuffleAddressList' in obj &&
            !(typeof obj.shuffleAddressList === 'boolean')) {
            throw new Error('pick_first config field shuffleAddressList must be a boolean if provided');
        }
        return new PickFirstLoadBalancingConfig(obj.shuffleAddressList === true);
    }
}
exports.PickFirstLoadBalancingConfig = PickFirstLoadBalancingConfig;
/**
 * Picker for a `PickFirstLoadBalancer` in the READY state. Always returns the
 * picked subchannel.
 */
class PickFirstPicker {
    constructor(subchannel) {
        this.subchannel = subchannel;
    }
    pick(pickArgs) {
        return {
            pickResultType: picker_1.PickResultType.COMPLETE,
            subchannel: this.subchannel,
            status: null,
            onCallStarted: null,
            onCallEnded: null,
        };
    }
}
/**
 * Return a new array with the elements of the input array in a random order
 * @param list The input array
 * @returns A shuffled array of the elements of list
 */
function shuffled(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 1; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}
/**
 * Interleave addresses in addressList by family in accordance with RFC-8304 section 4
 * @param addressList
 * @returns
 */
function interleaveAddressFamilies(addressList) {
    if (addressList.length === 0) {
        return [];
    }
    const result = [];
    const ipv6Addresses = [];
    const ipv4Addresses = [];
    const ipv6First = (0, subchannel_address_2.isTcpSubchannelAddress)(addressList[0]) && (0, net_1.isIPv6)(addressList[0].host);
    for (const address of addressList) {
        if ((0, subchannel_address_2.isTcpSubchannelAddress)(address) && (0, net_1.isIPv6)(address.host)) {
            ipv6Addresses.push(address);
        }
        else {
            ipv4Addresses.push(address);
        }
    }
    const firstList = ipv6First ? ipv6Addresses : ipv4Addresses;
    const secondList = ipv6First ? ipv4Addresses : ipv6Addresses;
    for (let i = 0; i < Math.max(firstList.length, secondList.length); i++) {
        if (i < firstList.length) {
            result.push(firstList[i]);
        }
        if (i < secondList.length) {
            result.push(secondList[i]);
        }
    }
    return result;
}
const REPORT_HEALTH_STATUS_OPTION_NAME = 'grpc-node.internal.pick-first.report_health_status';
class PickFirstLoadBalancer {
    /**
     * Load balancer that attempts to connect to each backend in the address list
     * in order, and picks the first one that connects, using it for every
     * request.
     * @param channelControlHelper `ChannelControlHelper` instance provided by
     *     this load balancer's owner.
     */
    constructor(channelControlHelper) {
        this.channelControlHelper = channelControlHelper;
        /**
         * The list of subchannels this load balancer is currently attempting to
         * connect to.
         */
        this.children = [];
        /**
         * The current connectivity state of the load balancer.
         */
        this.currentState = connectivity_state_1.ConnectivityState.IDLE;
        /**
         * The index within the `subchannels` array of the subchannel with the most
         * recently started connection attempt.
         */
        this.currentSubchannelIndex = 0;
        /**
         * The currently picked subchannel used for making calls. Populated if
         * and only if the load balancer's current state is READY. In that case,
         * the subchannel's current state is also READY.
         */
        this.currentPick = null;
        /**
         * Listener callback attached to each subchannel in the `subchannels` list
         * while establishing a connection.
         */
        this.subchannelStateListener = (subchannel, previousState, newState, keepaliveTime, errorMessage) => {
            this.onSubchannelStateUpdate(subchannel, previousState, newState, errorMessage);
        };
        this.pickedSubchannelHealthListener = () => this.calculateAndReportNewState();
        /**
         * The LB policy enters sticky TRANSIENT_FAILURE mode when all
         * subchannels have failed to connect at least once, and it stays in that
         * mode until a connection attempt is successful. While in sticky TF mode,
         * the LB policy continuously attempts to connect to all of its subchannels.
         */
        this.stickyTransientFailureMode = false;
        this.reportHealthStatus = false;
        /**
         * The most recent error reported by any subchannel as it transitioned to
         * TRANSIENT_FAILURE.
         */
        this.lastError = null;
        this.latestAddressList = null;
        this.latestOptions = {};
        this.connectionDelayTimeout = setTimeout(() => { }, 0);
        clearTimeout(this.connectionDelayTimeout);
    }
    allChildrenHaveReportedTF() {
        return this.children.every(child => child.hasReportedTransientFailure);
    }
    resetChildrenReportedTF() {
        this.children.every(child => child.hasReportedTransientFailure = false);
    }
    calculateAndReportNewState() {
        var _a;
        if (this.currentPick) {
            if (this.reportHealthStatus && !this.currentPick.isHealthy()) {
                const errorMessage = `Picked subchannel ${this.currentPick.getAddress()} is unhealthy`;
                this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker({
                    details: errorMessage,
                }), errorMessage);
            }
            else {
                this.updateState(connectivity_state_1.ConnectivityState.READY, new PickFirstPicker(this.currentPick), null);
            }
        }
        else if (((_a = this.latestAddressList) === null || _a === void 0 ? void 0 : _a.length) === 0) {
            const errorMessage = `No connection established. Last error: ${this.lastError}`;
            this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker({
                details: errorMessage,
            }), errorMessage);
        }
        else if (this.children.length === 0) {
            this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
        }
        else {
            if (this.stickyTransientFailureMode) {
                const errorMessage = `No connection established. Last error: ${this.lastError}`;
                this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker({
                    details: errorMessage,
                }), errorMessage);
            }
            else {
                this.updateState(connectivity_state_1.ConnectivityState.CONNECTING, new picker_1.QueuePicker(this), null);
            }
        }
    }
    requestReresolution() {
        this.channelControlHelper.requestReresolution();
    }
    maybeEnterStickyTransientFailureMode() {
        if (!this.allChildrenHaveReportedTF()) {
            return;
        }
        this.requestReresolution();
        this.resetChildrenReportedTF();
        if (this.stickyTransientFailureMode) {
            this.calculateAndReportNewState();
            return;
        }
        this.stickyTransientFailureMode = true;
        for (const { subchannel } of this.children) {
            subchannel.startConnecting();
        }
        this.calculateAndReportNewState();
    }
    removeCurrentPick() {
        if (this.currentPick !== null) {
            this.currentPick.removeConnectivityStateListener(this.subchannelStateListener);
            this.channelControlHelper.removeChannelzChild(this.currentPick.getChannelzRef());
            this.currentPick.removeHealthStateWatcher(this.pickedSubchannelHealthListener);
            // Unref last, to avoid triggering listeners
            this.currentPick.unref();
            this.currentPick = null;
        }
    }
    onSubchannelStateUpdate(subchannel, previousState, newState, errorMessage) {
        var _a;
        if ((_a = this.currentPick) === null || _a === void 0 ? void 0 : _a.realSubchannelEquals(subchannel)) {
            if (newState !== connectivity_state_1.ConnectivityState.READY) {
                this.removeCurrentPick();
                this.calculateAndReportNewState();
            }
            return;
        }
        for (const [index, child] of this.children.entries()) {
            if (subchannel.realSubchannelEquals(child.subchannel)) {
                if (newState === connectivity_state_1.ConnectivityState.READY) {
                    this.pickSubchannel(child.subchannel);
                }
                if (newState === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) {
                    child.hasReportedTransientFailure = true;
                    if (errorMessage) {
                        this.lastError = errorMessage;
                    }
                    this.maybeEnterStickyTransientFailureMode();
                    if (index === this.currentSubchannelIndex) {
                        this.startNextSubchannelConnecting(index + 1);
                    }
                }
                child.subchannel.startConnecting();
                return;
            }
        }
    }
    startNextSubchannelConnecting(startIndex) {
        clearTimeout(this.connectionDelayTimeout);
        for (const [index, child] of this.children.entries()) {
            if (index >= startIndex) {
                const subchannelState = child.subchannel.getConnectivityState();
                if (subchannelState === connectivity_state_1.ConnectivityState.IDLE ||
                    subchannelState === connectivity_state_1.ConnectivityState.CONNECTING) {
                    this.startConnecting(index);
                    return;
                }
            }
        }
        this.maybeEnterStickyTransientFailureMode();
    }
    /**
     * Have a single subchannel in the `subchannels` list start connecting.
     * @param subchannelIndex The index into the `subchannels` list.
     */
    startConnecting(subchannelIndex) {
        var _a, _b;
        clearTimeout(this.connectionDelayTimeout);
        this.currentSubchannelIndex = subchannelIndex;
        if (this.children[subchannelIndex].subchannel.getConnectivityState() ===
            connectivity_state_1.ConnectivityState.IDLE) {
            trace('Start connecting to subchannel with address ' +
                this.children[subchannelIndex].subchannel.getAddress());
            process.nextTick(() => {
                var _a;
                (_a = this.children[subchannelIndex]) === null || _a === void 0 ? void 0 : _a.subchannel.startConnecting();
            });
        }
        this.connectionDelayTimeout = setTimeout(() => {
            this.startNextSubchannelConnecting(subchannelIndex + 1);
        }, CONNECTION_DELAY_INTERVAL_MS);
        (_b = (_a = this.connectionDelayTimeout).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    /**
     * Declare that the specified subchannel should be used to make requests.
     * This functions the same independent of whether subchannel is a member of
     * this.children and whether it is equal to this.currentPick.
     * Prerequisite: subchannel.getConnectivityState() === READY.
     * @param subchannel
     */
    pickSubchannel(subchannel) {
        trace('Pick subchannel with address ' + subchannel.getAddress());
        this.stickyTransientFailureMode = false;
        /* Ref before removeCurrentPick and resetSubchannelList to avoid the
         * refcount dropping to 0 during this process. */
        subchannel.ref();
        this.channelControlHelper.addChannelzChild(subchannel.getChannelzRef());
        this.removeCurrentPick();
        this.resetSubchannelList();
        subchannel.addConnectivityStateListener(this.subchannelStateListener);
        subchannel.addHealthStateWatcher(this.pickedSubchannelHealthListener);
        this.currentPick = subchannel;
        clearTimeout(this.connectionDelayTimeout);
        this.calculateAndReportNewState();
    }
    updateState(newState, picker, errorMessage) {
        trace(connectivity_state_1.ConnectivityState[this.currentState] +
            ' -> ' +
            connectivity_state_1.ConnectivityState[newState]);
        this.currentState = newState;
        this.channelControlHelper.updateState(newState, picker, errorMessage);
    }
    resetSubchannelList() {
        for (const child of this.children) {
            /* Always remoev the connectivity state listener. If the subchannel is
               getting picked, it will be re-added then. */
            child.subchannel.removeConnectivityStateListener(this.subchannelStateListener);
            /* Refs are counted independently for the children list and the
             * currentPick, so we call unref whether or not the child is the
             * currentPick. Channelz child references are also refcounted, so
             * removeChannelzChild can be handled the same way. */
            child.subchannel.unref();
            this.channelControlHelper.removeChannelzChild(child.subchannel.getChannelzRef());
        }
        this.currentSubchannelIndex = 0;
        this.children = [];
    }
    connectToAddressList(addressList, options) {
        trace('connectToAddressList([' + addressList.map(address => (0, subchannel_address_1.subchannelAddressToString)(address)) + '])');
        const newChildrenList = addressList.map(address => ({
            subchannel: this.channelControlHelper.createSubchannel(address, options),
            hasReportedTransientFailure: false,
        }));
        for (const { subchannel } of newChildrenList) {
            if (subchannel.getConnectivityState() === connectivity_state_1.ConnectivityState.READY) {
                this.pickSubchannel(subchannel);
                return;
            }
        }
        /* Ref each subchannel before resetting the list, to ensure that
         * subchannels shared between the list don't drop to 0 refs during the
         * transition. */
        for (const { subchannel } of newChildrenList) {
            subchannel.ref();
            this.channelControlHelper.addChannelzChild(subchannel.getChannelzRef());
        }
        this.resetSubchannelList();
        this.children = newChildrenList;
        for (const { subchannel } of this.children) {
            subchannel.addConnectivityStateListener(this.subchannelStateListener);
        }
        for (const child of this.children) {
            if (child.subchannel.getConnectivityState() ===
                connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) {
                child.hasReportedTransientFailure = true;
            }
        }
        this.startNextSubchannelConnecting(0);
        this.calculateAndReportNewState();
    }
    updateAddressList(endpointList, lbConfig, options) {
        if (!(lbConfig instanceof PickFirstLoadBalancingConfig)) {
            return;
        }
        this.reportHealthStatus = options[REPORT_HEALTH_STATUS_OPTION_NAME];
        /* Previously, an update would be discarded if it was identical to the
         * previous update, to minimize churn. Now the DNS resolver is
         * rate-limited, so that is less of a concern. */
        if (lbConfig.getShuffleAddressList()) {
            endpointList = shuffled(endpointList);
        }
        const rawAddressList = [].concat(...endpointList.map(endpoint => endpoint.addresses));
        trace('updateAddressList([' + rawAddressList.map(address => (0, subchannel_address_1.subchannelAddressToString)(address)) + '])');
        if (rawAddressList.length === 0) {
            this.lastError = 'No addresses resolved';
        }
        const addressList = interleaveAddressFamilies(rawAddressList);
        this.latestAddressList = addressList;
        this.latestOptions = options;
        this.connectToAddressList(addressList, options);
    }
    exitIdle() {
        if (this.currentState === connectivity_state_1.ConnectivityState.IDLE &&
            this.latestAddressList) {
            this.connectToAddressList(this.latestAddressList, this.latestOptions);
        }
    }
    resetBackoff() {
        /* The pick first load balancer does not have a connection backoff, so this
         * does nothing */
    }
    destroy() {
        this.resetSubchannelList();
        this.removeCurrentPick();
    }
    getTypeName() {
        return TYPE_NAME;
    }
}
exports.PickFirstLoadBalancer = PickFirstLoadBalancer;
const LEAF_CONFIG = new PickFirstLoadBalancingConfig(false);
/**
 * This class handles the leaf load balancing operations for a single endpoint.
 * It is a thin wrapper around a PickFirstLoadBalancer with a different API
 * that more closely reflects how it will be used as a leaf balancer.
 */
class LeafLoadBalancer {
    constructor(endpoint, channelControlHelper, options) {
        this.endpoint = endpoint;
        this.options = options;
        this.latestState = connectivity_state_1.ConnectivityState.IDLE;
        const childChannelControlHelper = (0, load_balancer_1.createChildChannelControlHelper)(channelControlHelper, {
            updateState: (connectivityState, picker, errorMessage) => {
                this.latestState = connectivityState;
                this.latestPicker = picker;
                channelControlHelper.updateState(connectivityState, picker, errorMessage);
            },
        });
        this.pickFirstBalancer = new PickFirstLoadBalancer(childChannelControlHelper);
        this.latestPicker = new picker_1.QueuePicker(this.pickFirstBalancer);
    }
    startConnecting() {
        this.pickFirstBalancer.updateAddressList([this.endpoint], LEAF_CONFIG, Object.assign(Object.assign({}, this.options), { [REPORT_HEALTH_STATUS_OPTION_NAME]: true }));
    }
    /**
     * Update the endpoint associated with this LeafLoadBalancer to a new
     * endpoint. Does not trigger connection establishment if a connection
     * attempt is not already in progress.
     * @param newEndpoint
     */
    updateEndpoint(newEndpoint, newOptions) {
        this.options = newOptions;
        this.endpoint = newEndpoint;
        if (this.latestState !== connectivity_state_1.ConnectivityState.IDLE) {
            this.startConnecting();
        }
    }
    getConnectivityState() {
        return this.latestState;
    }
    getPicker() {
        return this.latestPicker;
    }
    getEndpoint() {
        return this.endpoint;
    }
    exitIdle() {
        this.pickFirstBalancer.exitIdle();
    }
    destroy() {
        this.pickFirstBalancer.destroy();
    }
}
exports.LeafLoadBalancer = LeafLoadBalancer;
function setup() {
    (0, load_balancer_1.registerLoadBalancerType)(TYPE_NAME, PickFirstLoadBalancer, PickFirstLoadBalancingConfig);
    (0, load_balancer_1.registerDefaultLoadBalancerType)(TYPE_NAME);
}
//# sourceMappingURL=load-balancer-pick-first.js.map