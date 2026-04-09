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
exports.Subchannel = void 0;
const connectivity_state_1 = require("./connectivity-state");
const backoff_timeout_1 = require("./backoff-timeout");
const logging = require("./logging");
const constants_1 = require("./constants");
const uri_parser_1 = require("./uri-parser");
const subchannel_address_1 = require("./subchannel-address");
const channelz_1 = require("./channelz");
const single_subchannel_channel_1 = require("./single-subchannel-channel");
const TRACER_NAME = 'subchannel';
/* setInterval and setTimeout only accept signed 32 bit integers. JS doesn't
 * have a constant for the max signed 32 bit integer, so this is a simple way
 * to calculate it */
const KEEPALIVE_MAX_TIME_MS = ~(1 << 31);
class Subchannel {
    /**
     * A class representing a connection to a single backend.
     * @param channelTarget The target string for the channel as a whole
     * @param subchannelAddress The address for the backend that this subchannel
     *     will connect to
     * @param options The channel options, plus any specific subchannel options
     *     for this subchannel
     * @param credentials The channel credentials used to establish this
     *     connection
     */
    constructor(channelTarget, subchannelAddress, options, credentials, connector) {
        var _a;
        this.channelTarget = channelTarget;
        this.subchannelAddress = subchannelAddress;
        this.options = options;
        this.connector = connector;
        /**
         * The subchannel's current connectivity state. Invariant: `session` === `null`
         * if and only if `connectivityState` is IDLE or TRANSIENT_FAILURE.
         */
        this.connectivityState = connectivity_state_1.ConnectivityState.IDLE;
        /**
         * The underlying http2 session used to make requests.
         */
        this.transport = null;
        /**
         * Indicates that the subchannel should transition from TRANSIENT_FAILURE to
         * CONNECTING instead of IDLE when the backoff timeout ends.
         */
        this.continueConnecting = false;
        /**
         * A list of listener functions that will be called whenever the connectivity
         * state changes. Will be modified by `addConnectivityStateListener` and
         * `removeConnectivityStateListener`
         */
        this.stateListeners = new Set();
        /**
         * Tracks channels and subchannel pools with references to this subchannel
         */
        this.refcount = 0;
        // Channelz info
        this.channelzEnabled = true;
        this.dataProducers = new Map();
        this.subchannelChannel = null;
        const backoffOptions = {
            initialDelay: options['grpc.initial_reconnect_backoff_ms'],
            maxDelay: options['grpc.max_reconnect_backoff_ms'],
        };
        this.backoffTimeout = new backoff_timeout_1.BackoffTimeout(() => {
            this.handleBackoffTimer();
        }, backoffOptions);
        this.backoffTimeout.unref();
        this.subchannelAddressString = (0, subchannel_address_1.subchannelAddressToString)(subchannelAddress);
        this.keepaliveTime = (_a = options['grpc.keepalive_time_ms']) !== null && _a !== void 0 ? _a : -1;
        if (options['grpc.enable_channelz'] === 0) {
            this.channelzEnabled = false;
            this.channelzTrace = new channelz_1.ChannelzTraceStub();
            this.callTracker = new channelz_1.ChannelzCallTrackerStub();
            this.childrenTracker = new channelz_1.ChannelzChildrenTrackerStub();
            this.streamTracker = new channelz_1.ChannelzCallTrackerStub();
        }
        else {
            this.channelzTrace = new channelz_1.ChannelzTrace();
            this.callTracker = new channelz_1.ChannelzCallTracker();
            this.childrenTracker = new channelz_1.ChannelzChildrenTracker();
            this.streamTracker = new channelz_1.ChannelzCallTracker();
        }
        this.channelzRef = (0, channelz_1.registerChannelzSubchannel)(this.subchannelAddressString, () => this.getChannelzInfo(), this.channelzEnabled);
        this.channelzTrace.addTrace('CT_INFO', 'Subchannel created');
        this.trace('Subchannel constructed with options ' +
            JSON.stringify(options, undefined, 2));
        this.secureConnector = credentials._createSecureConnector(channelTarget, options);
    }
    getChannelzInfo() {
        return {
            state: this.connectivityState,
            trace: this.channelzTrace,
            callTracker: this.callTracker,
            children: this.childrenTracker.getChildLists(),
            target: this.subchannelAddressString,
        };
    }
    trace(text) {
        logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, '(' +
            this.channelzRef.id +
            ') ' +
            this.subchannelAddressString +
            ' ' +
            text);
    }
    refTrace(text) {
        logging.trace(constants_1.LogVerbosity.DEBUG, 'subchannel_refcount', '(' +
            this.channelzRef.id +
            ') ' +
            this.subchannelAddressString +
            ' ' +
            text);
    }
    handleBackoffTimer() {
        if (this.continueConnecting) {
            this.transitionToState([connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE], connectivity_state_1.ConnectivityState.CONNECTING);
        }
        else {
            this.transitionToState([connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE], connectivity_state_1.ConnectivityState.IDLE);
        }
    }
    /**
     * Start a backoff timer with the current nextBackoff timeout
     */
    startBackoff() {
        this.backoffTimeout.runOnce();
    }
    stopBackoff() {
        this.backoffTimeout.stop();
        this.backoffTimeout.reset();
    }
    startConnectingInternal() {
        let options = this.options;
        if (options['grpc.keepalive_time_ms']) {
            const adjustedKeepaliveTime = Math.min(this.keepaliveTime, KEEPALIVE_MAX_TIME_MS);
            options = Object.assign(Object.assign({}, options), { 'grpc.keepalive_time_ms': adjustedKeepaliveTime });
        }
        this.connector
            .connect(this.subchannelAddress, this.secureConnector, options)
            .then(transport => {
            if (this.transitionToState([connectivity_state_1.ConnectivityState.CONNECTING], connectivity_state_1.ConnectivityState.READY)) {
                this.transport = transport;
                if (this.channelzEnabled) {
                    this.childrenTracker.refChild(transport.getChannelzRef());
                }
                transport.addDisconnectListener(tooManyPings => {
                    this.transitionToState([connectivity_state_1.ConnectivityState.READY], connectivity_state_1.ConnectivityState.IDLE);
                    if (tooManyPings && this.keepaliveTime > 0) {
                        this.keepaliveTime *= 2;
                        logging.log(constants_1.LogVerbosity.ERROR, `Connection to ${(0, uri_parser_1.uriToString)(this.channelTarget)} at ${this.subchannelAddressString} rejected by server because of excess pings. Increasing ping interval to ${this.keepaliveTime} ms`);
                    }
                });
            }
            else {
                /* If we can't transition from CONNECTING to READY here, we will
                 * not be using this transport, so release its resources. */
                transport.shutdown();
            }
        }, error => {
            this.transitionToState([connectivity_state_1.ConnectivityState.CONNECTING], connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, `${error}`);
        });
    }
    /**
     * Initiate a state transition from any element of oldStates to the new
     * state. If the current connectivityState is not in oldStates, do nothing.
     * @param oldStates The set of states to transition from
     * @param newState The state to transition to
     * @returns True if the state changed, false otherwise
     */
    transitionToState(oldStates, newState, errorMessage) {
        var _a, _b;
        if (oldStates.indexOf(this.connectivityState) === -1) {
            return false;
        }
        if (errorMessage) {
            this.trace(connectivity_state_1.ConnectivityState[this.connectivityState] +
                ' -> ' +
                connectivity_state_1.ConnectivityState[newState] +
                ' with error "' + errorMessage + '"');
        }
        else {
            this.trace(connectivity_state_1.ConnectivityState[this.connectivityState] +
                ' -> ' +
                connectivity_state_1.ConnectivityState[newState]);
        }
        if (this.channelzEnabled) {
            this.channelzTrace.addTrace('CT_INFO', 'Connectivity state change to ' + connectivity_state_1.ConnectivityState[newState]);
        }
        const previousState = this.connectivityState;
        this.connectivityState = newState;
        switch (newState) {
            case connectivity_state_1.ConnectivityState.READY:
                this.stopBackoff();
                break;
            case connectivity_state_1.ConnectivityState.CONNECTING:
                this.startBackoff();
                this.startConnectingInternal();
                this.continueConnecting = false;
                break;
            case connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE:
                if (this.channelzEnabled && this.transport) {
                    this.childrenTracker.unrefChild(this.transport.getChannelzRef());
                }
                (_a = this.transport) === null || _a === void 0 ? void 0 : _a.shutdown();
                this.transport = null;
                /* If the backoff timer has already ended by the time we get to the
                 * TRANSIENT_FAILURE state, we want to immediately transition out of
                 * TRANSIENT_FAILURE as though the backoff timer is ending right now */
                if (!this.backoffTimeout.isRunning()) {
                    process.nextTick(() => {
                        this.handleBackoffTimer();
                    });
                }
                break;
            case connectivity_state_1.ConnectivityState.IDLE:
                if (this.channelzEnabled && this.transport) {
                    this.childrenTracker.unrefChild(this.transport.getChannelzRef());
                }
                (_b = this.transport) === null || _b === void 0 ? void 0 : _b.shutdown();
                this.transport = null;
                break;
            default:
                throw new Error(`Invalid state: unknown ConnectivityState ${newState}`);
        }
        for (const listener of this.stateListeners) {
            listener(this, previousState, newState, this.keepaliveTime, errorMessage);
        }
        return true;
    }
    ref() {
        this.refTrace('refcount ' + this.refcount + ' -> ' + (this.refcount + 1));
        this.refcount += 1;
    }
    unref() {
        this.refTrace('refcount ' + this.refcount + ' -> ' + (this.refcount - 1));
        this.refcount -= 1;
        if (this.refcount === 0) {
            this.channelzTrace.addTrace('CT_INFO', 'Shutting down');
            (0, channelz_1.unregisterChannelzRef)(this.channelzRef);
            this.secureConnector.destroy();
            process.nextTick(() => {
                this.transitionToState([connectivity_state_1.ConnectivityState.CONNECTING, connectivity_state_1.ConnectivityState.READY], connectivity_state_1.ConnectivityState.IDLE);
            });
        }
    }
    unrefIfOneRef() {
        if (this.refcount === 1) {
            this.unref();
            return true;
        }
        return false;
    }
    createCall(metadata, host, method, listener) {
        if (!this.transport) {
            throw new Error('Cannot create call, subchannel not READY');
        }
        let statsTracker;
        if (this.channelzEnabled) {
            this.callTracker.addCallStarted();
            this.streamTracker.addCallStarted();
            statsTracker = {
                onCallEnd: status => {
                    if (status.code === constants_1.Status.OK) {
                        this.callTracker.addCallSucceeded();
                    }
                    else {
                        this.callTracker.addCallFailed();
                    }
                },
            };
        }
        else {
            statsTracker = {};
        }
        return this.transport.createCall(metadata, host, method, listener, statsTracker);
    }
    /**
     * If the subchannel is currently IDLE, start connecting and switch to the
     * CONNECTING state. If the subchannel is current in TRANSIENT_FAILURE,
     * the next time it would transition to IDLE, start connecting again instead.
     * Otherwise, do nothing.
     */
    startConnecting() {
        process.nextTick(() => {
            /* First, try to transition from IDLE to connecting. If that doesn't happen
             * because the state is not currently IDLE, check if it is
             * TRANSIENT_FAILURE, and if so indicate that it should go back to
             * connecting after the backoff timer ends. Otherwise do nothing */
            if (!this.transitionToState([connectivity_state_1.ConnectivityState.IDLE], connectivity_state_1.ConnectivityState.CONNECTING)) {
                if (this.connectivityState === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) {
                    this.continueConnecting = true;
                }
            }
        });
    }
    /**
     * Get the subchannel's current connectivity state.
     */
    getConnectivityState() {
        return this.connectivityState;
    }
    /**
     * Add a listener function to be called whenever the subchannel's
     * connectivity state changes.
     * @param listener
     */
    addConnectivityStateListener(listener) {
        this.stateListeners.add(listener);
    }
    /**
     * Remove a listener previously added with `addConnectivityStateListener`
     * @param listener A reference to a function previously passed to
     *     `addConnectivityStateListener`
     */
    removeConnectivityStateListener(listener) {
        this.stateListeners.delete(listener);
    }
    /**
     * Reset the backoff timeout, and immediately start connecting if in backoff.
     */
    resetBackoff() {
        process.nextTick(() => {
            this.backoffTimeout.reset();
            this.transitionToState([connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE], connectivity_state_1.ConnectivityState.CONNECTING);
        });
    }
    getAddress() {
        return this.subchannelAddressString;
    }
    getChannelzRef() {
        return this.channelzRef;
    }
    isHealthy() {
        return true;
    }
    addHealthStateWatcher(listener) {
        // Do nothing with the listener
    }
    removeHealthStateWatcher(listener) {
        // Do nothing with the listener
    }
    getRealSubchannel() {
        return this;
    }
    realSubchannelEquals(other) {
        return other.getRealSubchannel() === this;
    }
    throttleKeepalive(newKeepaliveTime) {
        if (newKeepaliveTime > this.keepaliveTime) {
            this.keepaliveTime = newKeepaliveTime;
        }
    }
    getCallCredentials() {
        return this.secureConnector.getCallCredentials();
    }
    getChannel() {
        if (!this.subchannelChannel) {
            this.subchannelChannel = new single_subchannel_channel_1.SingleSubchannelChannel(this, this.channelTarget, this.options);
        }
        return this.subchannelChannel;
    }
    addDataWatcher(dataWatcher) {
        throw new Error('Not implemented');
    }
    getOrCreateDataProducer(name, createDataProducer) {
        const existingProducer = this.dataProducers.get(name);
        if (existingProducer) {
            return existingProducer;
        }
        const newProducer = createDataProducer(this);
        this.dataProducers.set(name, newProducer);
        return newProducer;
    }
    removeDataProducer(name) {
        this.dataProducers.delete(name);
    }
}
exports.Subchannel = Subchannel;
//# sourceMappingURL=subchannel.js.map