"use strict";
/*
 * Copyright 2022 gRPC authors.
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
exports.LoadBalancingCall = void 0;
const connectivity_state_1 = require("./connectivity-state");
const constants_1 = require("./constants");
const deadline_1 = require("./deadline");
const metadata_1 = require("./metadata");
const picker_1 = require("./picker");
const uri_parser_1 = require("./uri-parser");
const logging = require("./logging");
const control_plane_status_1 = require("./control-plane-status");
const http2 = require("http2");
const TRACER_NAME = 'load_balancing_call';
class LoadBalancingCall {
    constructor(channel, callConfig, methodName, host, credentials, deadline, callNumber) {
        var _a, _b;
        this.channel = channel;
        this.callConfig = callConfig;
        this.methodName = methodName;
        this.host = host;
        this.credentials = credentials;
        this.deadline = deadline;
        this.callNumber = callNumber;
        this.child = null;
        this.readPending = false;
        this.pendingMessage = null;
        this.pendingHalfClose = false;
        this.ended = false;
        this.metadata = null;
        this.listener = null;
        this.onCallEnded = null;
        this.childStartTime = null;
        const splitPath = this.methodName.split('/');
        let serviceName = '';
        /* The standard path format is "/{serviceName}/{methodName}", so if we split
         * by '/', the first item should be empty and the second should be the
         * service name */
        if (splitPath.length >= 2) {
            serviceName = splitPath[1];
        }
        const hostname = (_b = (_a = (0, uri_parser_1.splitHostPort)(this.host)) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : 'localhost';
        /* Currently, call credentials are only allowed on HTTPS connections, so we
         * can assume that the scheme is "https" */
        this.serviceUrl = `https://${hostname}/${serviceName}`;
        this.startTime = new Date();
    }
    getDeadlineInfo() {
        var _a, _b;
        const deadlineInfo = [];
        if (this.childStartTime) {
            if (this.childStartTime > this.startTime) {
                if ((_a = this.metadata) === null || _a === void 0 ? void 0 : _a.getOptions().waitForReady) {
                    deadlineInfo.push('wait_for_ready');
                }
                deadlineInfo.push(`LB pick: ${(0, deadline_1.formatDateDifference)(this.startTime, this.childStartTime)}`);
            }
            deadlineInfo.push(...this.child.getDeadlineInfo());
            return deadlineInfo;
        }
        else {
            if ((_b = this.metadata) === null || _b === void 0 ? void 0 : _b.getOptions().waitForReady) {
                deadlineInfo.push('wait_for_ready');
            }
            deadlineInfo.push('Waiting for LB pick');
        }
        return deadlineInfo;
    }
    trace(text) {
        logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, '[' + this.callNumber + '] ' + text);
    }
    outputStatus(status, progress) {
        var _a, _b;
        if (!this.ended) {
            this.ended = true;
            this.trace('ended with status: code=' +
                status.code +
                ' details="' +
                status.details +
                '" start time=' +
                this.startTime.toISOString());
            const finalStatus = Object.assign(Object.assign({}, status), { progress });
            (_a = this.listener) === null || _a === void 0 ? void 0 : _a.onReceiveStatus(finalStatus);
            (_b = this.onCallEnded) === null || _b === void 0 ? void 0 : _b.call(this, finalStatus.code);
        }
    }
    doPick() {
        var _a, _b;
        if (this.ended) {
            return;
        }
        if (!this.metadata) {
            throw new Error('doPick called before start');
        }
        this.trace('Pick called');
        const finalMetadata = this.metadata.clone();
        const pickResult = this.channel.doPick(finalMetadata, this.callConfig.pickInformation);
        const subchannelString = pickResult.subchannel
            ? '(' +
                pickResult.subchannel.getChannelzRef().id +
                ') ' +
                pickResult.subchannel.getAddress()
            : '' + pickResult.subchannel;
        this.trace('Pick result: ' +
            picker_1.PickResultType[pickResult.pickResultType] +
            ' subchannel: ' +
            subchannelString +
            ' status: ' +
            ((_a = pickResult.status) === null || _a === void 0 ? void 0 : _a.code) +
            ' ' +
            ((_b = pickResult.status) === null || _b === void 0 ? void 0 : _b.details));
        switch (pickResult.pickResultType) {
            case picker_1.PickResultType.COMPLETE:
                const combinedCallCredentials = this.credentials.compose(pickResult.subchannel.getCallCredentials());
                combinedCallCredentials
                    .generateMetadata({ method_name: this.methodName, service_url: this.serviceUrl })
                    .then(credsMetadata => {
                    var _a;
                    /* If this call was cancelled (e.g. by the deadline) before
                     * metadata generation finished, we shouldn't do anything with
                     * it. */
                    if (this.ended) {
                        this.trace('Credentials metadata generation finished after call ended');
                        return;
                    }
                    finalMetadata.merge(credsMetadata);
                    if (finalMetadata.get('authorization').length > 1) {
                        this.outputStatus({
                            code: constants_1.Status.INTERNAL,
                            details: '"authorization" metadata cannot have multiple values',
                            metadata: new metadata_1.Metadata(),
                        }, 'PROCESSED');
                    }
                    if (pickResult.subchannel.getConnectivityState() !==
                        connectivity_state_1.ConnectivityState.READY) {
                        this.trace('Picked subchannel ' +
                            subchannelString +
                            ' has state ' +
                            connectivity_state_1.ConnectivityState[pickResult.subchannel.getConnectivityState()] +
                            ' after getting credentials metadata. Retrying pick');
                        this.doPick();
                        return;
                    }
                    if (this.deadline !== Infinity) {
                        finalMetadata.set('grpc-timeout', (0, deadline_1.getDeadlineTimeoutString)(this.deadline));
                    }
                    try {
                        this.child = pickResult
                            .subchannel.getRealSubchannel()
                            .createCall(finalMetadata, this.host, this.methodName, {
                            onReceiveMetadata: metadata => {
                                this.trace('Received metadata');
                                this.listener.onReceiveMetadata(metadata);
                            },
                            onReceiveMessage: message => {
                                this.trace('Received message');
                                this.listener.onReceiveMessage(message);
                            },
                            onReceiveStatus: status => {
                                this.trace('Received status');
                                if (status.rstCode ===
                                    http2.constants.NGHTTP2_REFUSED_STREAM) {
                                    this.outputStatus(status, 'REFUSED');
                                }
                                else {
                                    this.outputStatus(status, 'PROCESSED');
                                }
                            },
                        });
                        this.childStartTime = new Date();
                    }
                    catch (error) {
                        this.trace('Failed to start call on picked subchannel ' +
                            subchannelString +
                            ' with error ' +
                            error.message);
                        this.outputStatus({
                            code: constants_1.Status.INTERNAL,
                            details: 'Failed to start HTTP/2 stream with error ' +
                                error.message,
                            metadata: new metadata_1.Metadata(),
                        }, 'NOT_STARTED');
                        return;
                    }
                    (_a = pickResult.onCallStarted) === null || _a === void 0 ? void 0 : _a.call(pickResult);
                    this.onCallEnded = pickResult.onCallEnded;
                    this.trace('Created child call [' + this.child.getCallNumber() + ']');
                    if (this.readPending) {
                        this.child.startRead();
                    }
                    if (this.pendingMessage) {
                        this.child.sendMessageWithContext(this.pendingMessage.context, this.pendingMessage.message);
                    }
                    if (this.pendingHalfClose) {
                        this.child.halfClose();
                    }
                }, (error) => {
                    // We assume the error code isn't 0 (Status.OK)
                    const { code, details } = (0, control_plane_status_1.restrictControlPlaneStatusCode)(typeof error.code === 'number' ? error.code : constants_1.Status.UNKNOWN, `Getting metadata from plugin failed with error: ${error.message}`);
                    this.outputStatus({
                        code: code,
                        details: details,
                        metadata: new metadata_1.Metadata(),
                    }, 'PROCESSED');
                });
                break;
            case picker_1.PickResultType.DROP:
                const { code, details } = (0, control_plane_status_1.restrictControlPlaneStatusCode)(pickResult.status.code, pickResult.status.details);
                setImmediate(() => {
                    this.outputStatus({ code, details, metadata: pickResult.status.metadata }, 'DROP');
                });
                break;
            case picker_1.PickResultType.TRANSIENT_FAILURE:
                if (this.metadata.getOptions().waitForReady) {
                    this.channel.queueCallForPick(this);
                }
                else {
                    const { code, details } = (0, control_plane_status_1.restrictControlPlaneStatusCode)(pickResult.status.code, pickResult.status.details);
                    setImmediate(() => {
                        this.outputStatus({ code, details, metadata: pickResult.status.metadata }, 'PROCESSED');
                    });
                }
                break;
            case picker_1.PickResultType.QUEUE:
                this.channel.queueCallForPick(this);
        }
    }
    cancelWithStatus(status, details) {
        var _a;
        this.trace('cancelWithStatus code: ' + status + ' details: "' + details + '"');
        (_a = this.child) === null || _a === void 0 ? void 0 : _a.cancelWithStatus(status, details);
        this.outputStatus({ code: status, details: details, metadata: new metadata_1.Metadata() }, 'PROCESSED');
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.child) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : this.channel.getTarget();
    }
    start(metadata, listener) {
        this.trace('start called');
        this.listener = listener;
        this.metadata = metadata;
        this.doPick();
    }
    sendMessageWithContext(context, message) {
        this.trace('write() called with message of length ' + message.length);
        if (this.child) {
            this.child.sendMessageWithContext(context, message);
        }
        else {
            this.pendingMessage = { context, message };
        }
    }
    startRead() {
        this.trace('startRead called');
        if (this.child) {
            this.child.startRead();
        }
        else {
            this.readPending = true;
        }
    }
    halfClose() {
        this.trace('halfClose called');
        if (this.child) {
            this.child.halfClose();
        }
        else {
            this.pendingHalfClose = true;
        }
    }
    setCredentials(credentials) {
        throw new Error('Method not implemented.');
    }
    getCallNumber() {
        return this.callNumber;
    }
}
exports.LoadBalancingCall = LoadBalancingCall;
//# sourceMappingURL=load-balancing-call.js.map