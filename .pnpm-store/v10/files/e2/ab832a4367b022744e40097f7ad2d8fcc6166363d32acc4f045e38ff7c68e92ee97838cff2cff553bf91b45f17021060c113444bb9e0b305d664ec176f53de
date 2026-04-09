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
exports.ResolvingCall = void 0;
const call_credentials_1 = require("./call-credentials");
const constants_1 = require("./constants");
const deadline_1 = require("./deadline");
const metadata_1 = require("./metadata");
const logging = require("./logging");
const control_plane_status_1 = require("./control-plane-status");
const TRACER_NAME = 'resolving_call';
class ResolvingCall {
    constructor(channel, method, options, filterStackFactory, callNumber) {
        this.channel = channel;
        this.method = method;
        this.filterStackFactory = filterStackFactory;
        this.callNumber = callNumber;
        this.child = null;
        this.readPending = false;
        this.pendingMessage = null;
        this.pendingHalfClose = false;
        this.ended = false;
        this.readFilterPending = false;
        this.writeFilterPending = false;
        this.pendingChildStatus = null;
        this.metadata = null;
        this.listener = null;
        this.statusWatchers = [];
        this.deadlineTimer = setTimeout(() => { }, 0);
        this.filterStack = null;
        this.deadlineStartTime = null;
        this.configReceivedTime = null;
        this.childStartTime = null;
        /**
         * Credentials configured for this specific call. Does not include
         * call credentials associated with the channel credentials used to create
         * the channel.
         */
        this.credentials = call_credentials_1.CallCredentials.createEmpty();
        this.deadline = options.deadline;
        this.host = options.host;
        if (options.parentCall) {
            if (options.flags & constants_1.Propagate.CANCELLATION) {
                options.parentCall.on('cancelled', () => {
                    this.cancelWithStatus(constants_1.Status.CANCELLED, 'Cancelled by parent call');
                });
            }
            if (options.flags & constants_1.Propagate.DEADLINE) {
                this.trace('Propagating deadline from parent: ' +
                    options.parentCall.getDeadline());
                this.deadline = (0, deadline_1.minDeadline)(this.deadline, options.parentCall.getDeadline());
            }
        }
        this.trace('Created');
        this.runDeadlineTimer();
    }
    trace(text) {
        logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, '[' + this.callNumber + '] ' + text);
    }
    runDeadlineTimer() {
        clearTimeout(this.deadlineTimer);
        this.deadlineStartTime = new Date();
        this.trace('Deadline: ' + (0, deadline_1.deadlineToString)(this.deadline));
        const timeout = (0, deadline_1.getRelativeTimeout)(this.deadline);
        if (timeout !== Infinity) {
            this.trace('Deadline will be reached in ' + timeout + 'ms');
            const handleDeadline = () => {
                if (!this.deadlineStartTime) {
                    this.cancelWithStatus(constants_1.Status.DEADLINE_EXCEEDED, 'Deadline exceeded');
                    return;
                }
                const deadlineInfo = [];
                const deadlineEndTime = new Date();
                deadlineInfo.push(`Deadline exceeded after ${(0, deadline_1.formatDateDifference)(this.deadlineStartTime, deadlineEndTime)}`);
                if (this.configReceivedTime) {
                    if (this.configReceivedTime > this.deadlineStartTime) {
                        deadlineInfo.push(`name resolution: ${(0, deadline_1.formatDateDifference)(this.deadlineStartTime, this.configReceivedTime)}`);
                    }
                    if (this.childStartTime) {
                        if (this.childStartTime > this.configReceivedTime) {
                            deadlineInfo.push(`metadata filters: ${(0, deadline_1.formatDateDifference)(this.configReceivedTime, this.childStartTime)}`);
                        }
                    }
                    else {
                        deadlineInfo.push('waiting for metadata filters');
                    }
                }
                else {
                    deadlineInfo.push('waiting for name resolution');
                }
                if (this.child) {
                    deadlineInfo.push(...this.child.getDeadlineInfo());
                }
                this.cancelWithStatus(constants_1.Status.DEADLINE_EXCEEDED, deadlineInfo.join(','));
            };
            if (timeout <= 0) {
                process.nextTick(handleDeadline);
            }
            else {
                this.deadlineTimer = setTimeout(handleDeadline, timeout);
            }
        }
    }
    outputStatus(status) {
        if (!this.ended) {
            this.ended = true;
            if (!this.filterStack) {
                this.filterStack = this.filterStackFactory.createFilter();
            }
            clearTimeout(this.deadlineTimer);
            const filteredStatus = this.filterStack.receiveTrailers(status);
            this.trace('ended with status: code=' +
                filteredStatus.code +
                ' details="' +
                filteredStatus.details +
                '"');
            this.statusWatchers.forEach(watcher => watcher(filteredStatus));
            process.nextTick(() => {
                var _a;
                (_a = this.listener) === null || _a === void 0 ? void 0 : _a.onReceiveStatus(filteredStatus);
            });
        }
    }
    sendMessageOnChild(context, message) {
        if (!this.child) {
            throw new Error('sendMessageonChild called with child not populated');
        }
        const child = this.child;
        this.writeFilterPending = true;
        this.filterStack.sendMessage(Promise.resolve({ message: message, flags: context.flags })).then(filteredMessage => {
            this.writeFilterPending = false;
            child.sendMessageWithContext(context, filteredMessage.message);
            if (this.pendingHalfClose) {
                child.halfClose();
            }
        }, (status) => {
            this.cancelWithStatus(status.code, status.details);
        });
    }
    getConfig() {
        if (this.ended) {
            return;
        }
        if (!this.metadata || !this.listener) {
            throw new Error('getConfig called before start');
        }
        const configResult = this.channel.getConfig(this.method, this.metadata);
        if (configResult.type === 'NONE') {
            this.channel.queueCallForConfig(this);
            return;
        }
        else if (configResult.type === 'ERROR') {
            if (this.metadata.getOptions().waitForReady) {
                this.channel.queueCallForConfig(this);
            }
            else {
                this.outputStatus(configResult.error);
            }
            return;
        }
        // configResult.type === 'SUCCESS'
        this.configReceivedTime = new Date();
        const config = configResult.config;
        if (config.status !== constants_1.Status.OK) {
            const { code, details } = (0, control_plane_status_1.restrictControlPlaneStatusCode)(config.status, 'Failed to route call to method ' + this.method);
            this.outputStatus({
                code: code,
                details: details,
                metadata: new metadata_1.Metadata(),
            });
            return;
        }
        if (config.methodConfig.timeout) {
            const configDeadline = new Date();
            configDeadline.setSeconds(configDeadline.getSeconds() + config.methodConfig.timeout.seconds);
            configDeadline.setMilliseconds(configDeadline.getMilliseconds() +
                config.methodConfig.timeout.nanos / 1000000);
            this.deadline = (0, deadline_1.minDeadline)(this.deadline, configDeadline);
            this.runDeadlineTimer();
        }
        this.filterStackFactory.push(config.dynamicFilterFactories);
        this.filterStack = this.filterStackFactory.createFilter();
        this.filterStack.sendMetadata(Promise.resolve(this.metadata)).then(filteredMetadata => {
            this.child = this.channel.createRetryingCall(config, this.method, this.host, this.credentials, this.deadline);
            this.trace('Created child [' + this.child.getCallNumber() + ']');
            this.childStartTime = new Date();
            this.child.start(filteredMetadata, {
                onReceiveMetadata: metadata => {
                    this.trace('Received metadata');
                    this.listener.onReceiveMetadata(this.filterStack.receiveMetadata(metadata));
                },
                onReceiveMessage: message => {
                    this.trace('Received message');
                    this.readFilterPending = true;
                    this.filterStack.receiveMessage(message).then(filteredMesssage => {
                        this.trace('Finished filtering received message');
                        this.readFilterPending = false;
                        this.listener.onReceiveMessage(filteredMesssage);
                        if (this.pendingChildStatus) {
                            this.outputStatus(this.pendingChildStatus);
                        }
                    }, (status) => {
                        this.cancelWithStatus(status.code, status.details);
                    });
                },
                onReceiveStatus: status => {
                    this.trace('Received status');
                    if (this.readFilterPending) {
                        this.pendingChildStatus = status;
                    }
                    else {
                        this.outputStatus(status);
                    }
                },
            });
            if (this.readPending) {
                this.child.startRead();
            }
            if (this.pendingMessage) {
                this.sendMessageOnChild(this.pendingMessage.context, this.pendingMessage.message);
            }
            else if (this.pendingHalfClose) {
                this.child.halfClose();
            }
        }, (status) => {
            this.outputStatus(status);
        });
    }
    reportResolverError(status) {
        var _a;
        if ((_a = this.metadata) === null || _a === void 0 ? void 0 : _a.getOptions().waitForReady) {
            this.channel.queueCallForConfig(this);
        }
        else {
            this.outputStatus(status);
        }
    }
    cancelWithStatus(status, details) {
        var _a;
        this.trace('cancelWithStatus code: ' + status + ' details: "' + details + '"');
        (_a = this.child) === null || _a === void 0 ? void 0 : _a.cancelWithStatus(status, details);
        this.outputStatus({
            code: status,
            details: details,
            metadata: new metadata_1.Metadata(),
        });
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.child) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : this.channel.getTarget();
    }
    start(metadata, listener) {
        this.trace('start called');
        this.metadata = metadata.clone();
        this.listener = listener;
        this.getConfig();
    }
    sendMessageWithContext(context, message) {
        this.trace('write() called with message of length ' + message.length);
        if (this.child) {
            this.sendMessageOnChild(context, message);
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
        if (this.child && !this.writeFilterPending) {
            this.child.halfClose();
        }
        else {
            this.pendingHalfClose = true;
        }
    }
    setCredentials(credentials) {
        this.credentials = credentials;
    }
    addStatusWatcher(watcher) {
        this.statusWatchers.push(watcher);
    }
    getCallNumber() {
        return this.callNumber;
    }
    getAuthContext() {
        if (this.child) {
            return this.child.getAuthContext();
        }
        else {
            return null;
        }
    }
}
exports.ResolvingCall = ResolvingCall;
//# sourceMappingURL=resolving-call.js.map