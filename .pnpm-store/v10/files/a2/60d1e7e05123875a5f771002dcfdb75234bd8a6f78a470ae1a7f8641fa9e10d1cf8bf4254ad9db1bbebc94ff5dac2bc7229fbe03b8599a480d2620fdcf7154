"use strict";
/*
 * Copyright 2025 gRPC authors.
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
exports.SingleSubchannelChannel = void 0;
const call_number_1 = require("./call-number");
const channelz_1 = require("./channelz");
const compression_filter_1 = require("./compression-filter");
const connectivity_state_1 = require("./connectivity-state");
const constants_1 = require("./constants");
const control_plane_status_1 = require("./control-plane-status");
const deadline_1 = require("./deadline");
const filter_stack_1 = require("./filter-stack");
const metadata_1 = require("./metadata");
const resolver_1 = require("./resolver");
const uri_parser_1 = require("./uri-parser");
class SubchannelCallWrapper {
    constructor(subchannel, method, filterStackFactory, options, callNumber) {
        var _a, _b;
        this.subchannel = subchannel;
        this.method = method;
        this.options = options;
        this.callNumber = callNumber;
        this.childCall = null;
        this.pendingMessage = null;
        this.readPending = false;
        this.halfClosePending = false;
        this.pendingStatus = null;
        this.readFilterPending = false;
        this.writeFilterPending = false;
        const splitPath = this.method.split('/');
        let serviceName = '';
        /* The standard path format is "/{serviceName}/{methodName}", so if we split
          * by '/', the first item should be empty and the second should be the
          * service name */
        if (splitPath.length >= 2) {
            serviceName = splitPath[1];
        }
        const hostname = (_b = (_a = (0, uri_parser_1.splitHostPort)(this.options.host)) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : 'localhost';
        /* Currently, call credentials are only allowed on HTTPS connections, so we
          * can assume that the scheme is "https" */
        this.serviceUrl = `https://${hostname}/${serviceName}`;
        const timeout = (0, deadline_1.getRelativeTimeout)(options.deadline);
        if (timeout !== Infinity) {
            if (timeout <= 0) {
                this.cancelWithStatus(constants_1.Status.DEADLINE_EXCEEDED, 'Deadline exceeded');
            }
            else {
                setTimeout(() => {
                    this.cancelWithStatus(constants_1.Status.DEADLINE_EXCEEDED, 'Deadline exceeded');
                }, timeout);
            }
        }
        this.filterStack = filterStackFactory.createFilter();
    }
    cancelWithStatus(status, details) {
        if (this.childCall) {
            this.childCall.cancelWithStatus(status, details);
        }
        else {
            this.pendingStatus = {
                code: status,
                details: details,
                metadata: new metadata_1.Metadata()
            };
        }
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.childCall) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : this.subchannel.getAddress();
    }
    async start(metadata, listener) {
        if (this.pendingStatus) {
            listener.onReceiveStatus(this.pendingStatus);
            return;
        }
        if (this.subchannel.getConnectivityState() !== connectivity_state_1.ConnectivityState.READY) {
            listener.onReceiveStatus({
                code: constants_1.Status.UNAVAILABLE,
                details: 'Subchannel not ready',
                metadata: new metadata_1.Metadata()
            });
            return;
        }
        const filteredMetadata = await this.filterStack.sendMetadata(Promise.resolve(metadata));
        let credsMetadata;
        try {
            credsMetadata = await this.subchannel.getCallCredentials()
                .generateMetadata({ method_name: this.method, service_url: this.serviceUrl });
        }
        catch (e) {
            const error = e;
            const { code, details } = (0, control_plane_status_1.restrictControlPlaneStatusCode)(typeof error.code === 'number' ? error.code : constants_1.Status.UNKNOWN, `Getting metadata from plugin failed with error: ${error.message}`);
            listener.onReceiveStatus({
                code: code,
                details: details,
                metadata: new metadata_1.Metadata(),
            });
            return;
        }
        credsMetadata.merge(filteredMetadata);
        const childListener = {
            onReceiveMetadata: async (metadata) => {
                listener.onReceiveMetadata(await this.filterStack.receiveMetadata(metadata));
            },
            onReceiveMessage: async (message) => {
                this.readFilterPending = true;
                const filteredMessage = await this.filterStack.receiveMessage(message);
                this.readFilterPending = false;
                listener.onReceiveMessage(filteredMessage);
                if (this.pendingStatus) {
                    listener.onReceiveStatus(this.pendingStatus);
                }
            },
            onReceiveStatus: async (status) => {
                const filteredStatus = await this.filterStack.receiveTrailers(status);
                if (this.readFilterPending) {
                    this.pendingStatus = filteredStatus;
                }
                else {
                    listener.onReceiveStatus(filteredStatus);
                }
            }
        };
        this.childCall = this.subchannel.createCall(credsMetadata, this.options.host, this.method, childListener);
        if (this.readPending) {
            this.childCall.startRead();
        }
        if (this.pendingMessage) {
            this.childCall.sendMessageWithContext(this.pendingMessage.context, this.pendingMessage.message);
        }
        if (this.halfClosePending && !this.writeFilterPending) {
            this.childCall.halfClose();
        }
    }
    async sendMessageWithContext(context, message) {
        this.writeFilterPending = true;
        const filteredMessage = await this.filterStack.sendMessage(Promise.resolve({ message: message, flags: context.flags }));
        this.writeFilterPending = false;
        if (this.childCall) {
            this.childCall.sendMessageWithContext(context, filteredMessage.message);
            if (this.halfClosePending) {
                this.childCall.halfClose();
            }
        }
        else {
            this.pendingMessage = { context, message: filteredMessage.message };
        }
    }
    startRead() {
        if (this.childCall) {
            this.childCall.startRead();
        }
        else {
            this.readPending = true;
        }
    }
    halfClose() {
        if (this.childCall && !this.writeFilterPending) {
            this.childCall.halfClose();
        }
        else {
            this.halfClosePending = true;
        }
    }
    getCallNumber() {
        return this.callNumber;
    }
    setCredentials(credentials) {
        throw new Error("Method not implemented.");
    }
    getAuthContext() {
        if (this.childCall) {
            return this.childCall.getAuthContext();
        }
        else {
            return null;
        }
    }
}
class SingleSubchannelChannel {
    constructor(subchannel, target, options) {
        this.subchannel = subchannel;
        this.target = target;
        this.channelzEnabled = false;
        this.channelzTrace = new channelz_1.ChannelzTrace();
        this.callTracker = new channelz_1.ChannelzCallTracker();
        this.childrenTracker = new channelz_1.ChannelzChildrenTracker();
        this.channelzEnabled = options['grpc.enable_channelz'] !== 0;
        this.channelzRef = (0, channelz_1.registerChannelzChannel)((0, uri_parser_1.uriToString)(target), () => ({
            target: `${(0, uri_parser_1.uriToString)(target)} (${subchannel.getAddress()})`,
            state: this.subchannel.getConnectivityState(),
            trace: this.channelzTrace,
            callTracker: this.callTracker,
            children: this.childrenTracker.getChildLists()
        }), this.channelzEnabled);
        if (this.channelzEnabled) {
            this.childrenTracker.refChild(subchannel.getChannelzRef());
        }
        this.filterStackFactory = new filter_stack_1.FilterStackFactory([new compression_filter_1.CompressionFilterFactory(this, options)]);
    }
    close() {
        if (this.channelzEnabled) {
            this.childrenTracker.unrefChild(this.subchannel.getChannelzRef());
        }
        (0, channelz_1.unregisterChannelzRef)(this.channelzRef);
    }
    getTarget() {
        return (0, uri_parser_1.uriToString)(this.target);
    }
    getConnectivityState(tryToConnect) {
        throw new Error("Method not implemented.");
    }
    watchConnectivityState(currentState, deadline, callback) {
        throw new Error("Method not implemented.");
    }
    getChannelzRef() {
        return this.channelzRef;
    }
    createCall(method, deadline) {
        const callOptions = {
            deadline: deadline,
            host: (0, resolver_1.getDefaultAuthority)(this.target),
            flags: constants_1.Propagate.DEFAULTS,
            parentCall: null
        };
        return new SubchannelCallWrapper(this.subchannel, method, this.filterStackFactory, callOptions, (0, call_number_1.getNextCallNumber)());
    }
}
exports.SingleSubchannelChannel = SingleSubchannelChannel;
//# sourceMappingURL=single-subchannel-channel.js.map