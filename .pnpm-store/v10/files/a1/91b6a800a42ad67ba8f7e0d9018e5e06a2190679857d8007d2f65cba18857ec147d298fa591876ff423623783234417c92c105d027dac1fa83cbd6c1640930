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
exports.RetryingCall = exports.MessageBufferTracker = exports.RetryThrottler = void 0;
const constants_1 = require("./constants");
const deadline_1 = require("./deadline");
const metadata_1 = require("./metadata");
const logging = require("./logging");
const TRACER_NAME = 'retrying_call';
class RetryThrottler {
    constructor(maxTokens, tokenRatio, previousRetryThrottler) {
        this.maxTokens = maxTokens;
        this.tokenRatio = tokenRatio;
        if (previousRetryThrottler) {
            /* When carrying over tokens from a previous config, rescale them to the
             * new max value */
            this.tokens =
                previousRetryThrottler.tokens *
                    (maxTokens / previousRetryThrottler.maxTokens);
        }
        else {
            this.tokens = maxTokens;
        }
    }
    addCallSucceeded() {
        this.tokens = Math.min(this.tokens + this.tokenRatio, this.maxTokens);
    }
    addCallFailed() {
        this.tokens = Math.max(this.tokens - 1, 0);
    }
    canRetryCall() {
        return this.tokens > (this.maxTokens / 2);
    }
}
exports.RetryThrottler = RetryThrottler;
class MessageBufferTracker {
    constructor(totalLimit, limitPerCall) {
        this.totalLimit = totalLimit;
        this.limitPerCall = limitPerCall;
        this.totalAllocated = 0;
        this.allocatedPerCall = new Map();
    }
    allocate(size, callId) {
        var _a;
        const currentPerCall = (_a = this.allocatedPerCall.get(callId)) !== null && _a !== void 0 ? _a : 0;
        if (this.limitPerCall - currentPerCall < size ||
            this.totalLimit - this.totalAllocated < size) {
            return false;
        }
        this.allocatedPerCall.set(callId, currentPerCall + size);
        this.totalAllocated += size;
        return true;
    }
    free(size, callId) {
        var _a;
        if (this.totalAllocated < size) {
            throw new Error(`Invalid buffer allocation state: call ${callId} freed ${size} > total allocated ${this.totalAllocated}`);
        }
        this.totalAllocated -= size;
        const currentPerCall = (_a = this.allocatedPerCall.get(callId)) !== null && _a !== void 0 ? _a : 0;
        if (currentPerCall < size) {
            throw new Error(`Invalid buffer allocation state: call ${callId} freed ${size} > allocated for call ${currentPerCall}`);
        }
        this.allocatedPerCall.set(callId, currentPerCall - size);
    }
    freeAll(callId) {
        var _a;
        const currentPerCall = (_a = this.allocatedPerCall.get(callId)) !== null && _a !== void 0 ? _a : 0;
        if (this.totalAllocated < currentPerCall) {
            throw new Error(`Invalid buffer allocation state: call ${callId} allocated ${currentPerCall} > total allocated ${this.totalAllocated}`);
        }
        this.totalAllocated -= currentPerCall;
        this.allocatedPerCall.delete(callId);
    }
}
exports.MessageBufferTracker = MessageBufferTracker;
const PREVIONS_RPC_ATTEMPTS_METADATA_KEY = 'grpc-previous-rpc-attempts';
const DEFAULT_MAX_ATTEMPTS_LIMIT = 5;
class RetryingCall {
    constructor(channel, callConfig, methodName, host, credentials, deadline, callNumber, bufferTracker, retryThrottler) {
        var _a;
        this.channel = channel;
        this.callConfig = callConfig;
        this.methodName = methodName;
        this.host = host;
        this.credentials = credentials;
        this.deadline = deadline;
        this.callNumber = callNumber;
        this.bufferTracker = bufferTracker;
        this.retryThrottler = retryThrottler;
        this.listener = null;
        this.initialMetadata = null;
        this.underlyingCalls = [];
        this.writeBuffer = [];
        /**
         * The offset of message indices in the writeBuffer. For example, if
         * writeBufferOffset is 10, message 10 is in writeBuffer[0] and message 15
         * is in writeBuffer[5].
         */
        this.writeBufferOffset = 0;
        /**
         * Tracks whether a read has been started, so that we know whether to start
         * reads on new child calls. This only matters for the first read, because
         * once a message comes in the child call becomes committed and there will
         * be no new child calls.
         */
        this.readStarted = false;
        this.transparentRetryUsed = false;
        /**
         * Number of attempts so far
         */
        this.attempts = 0;
        this.hedgingTimer = null;
        this.committedCallIndex = null;
        this.initialRetryBackoffSec = 0;
        this.nextRetryBackoffSec = 0;
        const maxAttemptsLimit = (_a = channel.getOptions()['grpc-node.retry_max_attempts_limit']) !== null && _a !== void 0 ? _a : DEFAULT_MAX_ATTEMPTS_LIMIT;
        if (channel.getOptions()['grpc.enable_retries'] === 0) {
            this.state = 'NO_RETRY';
            this.maxAttempts = 1;
        }
        else if (callConfig.methodConfig.retryPolicy) {
            this.state = 'RETRY';
            const retryPolicy = callConfig.methodConfig.retryPolicy;
            this.nextRetryBackoffSec = this.initialRetryBackoffSec = Number(retryPolicy.initialBackoff.substring(0, retryPolicy.initialBackoff.length - 1));
            this.maxAttempts = Math.min(retryPolicy.maxAttempts, maxAttemptsLimit);
        }
        else if (callConfig.methodConfig.hedgingPolicy) {
            this.state = 'HEDGING';
            this.maxAttempts = Math.min(callConfig.methodConfig.hedgingPolicy.maxAttempts, maxAttemptsLimit);
        }
        else {
            this.state = 'TRANSPARENT_ONLY';
            this.maxAttempts = 1;
        }
        this.startTime = new Date();
    }
    getDeadlineInfo() {
        if (this.underlyingCalls.length === 0) {
            return [];
        }
        const deadlineInfo = [];
        const latestCall = this.underlyingCalls[this.underlyingCalls.length - 1];
        if (this.underlyingCalls.length > 1) {
            deadlineInfo.push(`previous attempts: ${this.underlyingCalls.length - 1}`);
        }
        if (latestCall.startTime > this.startTime) {
            deadlineInfo.push(`time to current attempt start: ${(0, deadline_1.formatDateDifference)(this.startTime, latestCall.startTime)}`);
        }
        deadlineInfo.push(...latestCall.call.getDeadlineInfo());
        return deadlineInfo;
    }
    getCallNumber() {
        return this.callNumber;
    }
    trace(text) {
        logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, '[' + this.callNumber + '] ' + text);
    }
    reportStatus(statusObject) {
        this.trace('ended with status: code=' +
            statusObject.code +
            ' details="' +
            statusObject.details +
            '" start time=' +
            this.startTime.toISOString());
        this.bufferTracker.freeAll(this.callNumber);
        this.writeBufferOffset = this.writeBufferOffset + this.writeBuffer.length;
        this.writeBuffer = [];
        process.nextTick(() => {
            var _a;
            // Explicitly construct status object to remove progress field
            (_a = this.listener) === null || _a === void 0 ? void 0 : _a.onReceiveStatus({
                code: statusObject.code,
                details: statusObject.details,
                metadata: statusObject.metadata,
            });
        });
    }
    cancelWithStatus(status, details) {
        this.trace('cancelWithStatus code: ' + status + ' details: "' + details + '"');
        this.reportStatus({ code: status, details, metadata: new metadata_1.Metadata() });
        for (const { call } of this.underlyingCalls) {
            call.cancelWithStatus(status, details);
        }
    }
    getPeer() {
        if (this.committedCallIndex !== null) {
            return this.underlyingCalls[this.committedCallIndex].call.getPeer();
        }
        else {
            return 'unknown';
        }
    }
    getBufferEntry(messageIndex) {
        var _a;
        return ((_a = this.writeBuffer[messageIndex - this.writeBufferOffset]) !== null && _a !== void 0 ? _a : {
            entryType: 'FREED',
            allocated: false,
        });
    }
    getNextBufferIndex() {
        return this.writeBufferOffset + this.writeBuffer.length;
    }
    clearSentMessages() {
        if (this.state !== 'COMMITTED') {
            return;
        }
        let earliestNeededMessageIndex;
        if (this.underlyingCalls[this.committedCallIndex].state === 'COMPLETED') {
            /* If the committed call is completed, clear all messages, even if some
             * have not been sent. */
            earliestNeededMessageIndex = this.getNextBufferIndex();
        }
        else {
            earliestNeededMessageIndex =
                this.underlyingCalls[this.committedCallIndex].nextMessageToSend;
        }
        for (let messageIndex = this.writeBufferOffset; messageIndex < earliestNeededMessageIndex; messageIndex++) {
            const bufferEntry = this.getBufferEntry(messageIndex);
            if (bufferEntry.allocated) {
                this.bufferTracker.free(bufferEntry.message.message.length, this.callNumber);
            }
        }
        this.writeBuffer = this.writeBuffer.slice(earliestNeededMessageIndex - this.writeBufferOffset);
        this.writeBufferOffset = earliestNeededMessageIndex;
    }
    commitCall(index) {
        var _a, _b;
        if (this.state === 'COMMITTED') {
            return;
        }
        this.trace('Committing call [' +
            this.underlyingCalls[index].call.getCallNumber() +
            '] at index ' +
            index);
        this.state = 'COMMITTED';
        (_b = (_a = this.callConfig).onCommitted) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.committedCallIndex = index;
        for (let i = 0; i < this.underlyingCalls.length; i++) {
            if (i === index) {
                continue;
            }
            if (this.underlyingCalls[i].state === 'COMPLETED') {
                continue;
            }
            this.underlyingCalls[i].state = 'COMPLETED';
            this.underlyingCalls[i].call.cancelWithStatus(constants_1.Status.CANCELLED, 'Discarded in favor of other hedged attempt');
        }
        this.clearSentMessages();
    }
    commitCallWithMostMessages() {
        if (this.state === 'COMMITTED') {
            return;
        }
        let mostMessages = -1;
        let callWithMostMessages = -1;
        for (const [index, childCall] of this.underlyingCalls.entries()) {
            if (childCall.state === 'ACTIVE' &&
                childCall.nextMessageToSend > mostMessages) {
                mostMessages = childCall.nextMessageToSend;
                callWithMostMessages = index;
            }
        }
        if (callWithMostMessages === -1) {
            /* There are no active calls, disable retries to force the next call that
             * is started to be committed. */
            this.state = 'TRANSPARENT_ONLY';
        }
        else {
            this.commitCall(callWithMostMessages);
        }
    }
    isStatusCodeInList(list, code) {
        return list.some(value => {
            var _a;
            return value === code ||
                value.toString().toLowerCase() === ((_a = constants_1.Status[code]) === null || _a === void 0 ? void 0 : _a.toLowerCase());
        });
    }
    getNextRetryJitter() {
        /* Jitter of +-20% is applied: https://github.com/grpc/proposal/blob/master/A6-client-retries.md#exponential-backoff */
        return Math.random() * (1.2 - 0.8) + 0.8;
    }
    getNextRetryBackoffMs() {
        var _a;
        const retryPolicy = (_a = this.callConfig) === null || _a === void 0 ? void 0 : _a.methodConfig.retryPolicy;
        if (!retryPolicy) {
            return 0;
        }
        const jitter = this.getNextRetryJitter();
        const nextBackoffMs = jitter * this.nextRetryBackoffSec * 1000;
        const maxBackoffSec = Number(retryPolicy.maxBackoff.substring(0, retryPolicy.maxBackoff.length - 1));
        this.nextRetryBackoffSec = Math.min(this.nextRetryBackoffSec * retryPolicy.backoffMultiplier, maxBackoffSec);
        return nextBackoffMs;
    }
    maybeRetryCall(pushback, callback) {
        if (this.state !== 'RETRY') {
            callback(false);
            return;
        }
        if (this.attempts >= this.maxAttempts) {
            callback(false);
            return;
        }
        let retryDelayMs;
        if (pushback === null) {
            retryDelayMs = this.getNextRetryBackoffMs();
        }
        else if (pushback < 0) {
            this.state = 'TRANSPARENT_ONLY';
            callback(false);
            return;
        }
        else {
            retryDelayMs = pushback;
            this.nextRetryBackoffSec = this.initialRetryBackoffSec;
        }
        setTimeout(() => {
            var _a, _b;
            if (this.state !== 'RETRY') {
                callback(false);
                return;
            }
            if ((_b = (_a = this.retryThrottler) === null || _a === void 0 ? void 0 : _a.canRetryCall()) !== null && _b !== void 0 ? _b : true) {
                callback(true);
                this.attempts += 1;
                this.startNewAttempt();
            }
            else {
                this.trace('Retry attempt denied by throttling policy');
                callback(false);
            }
        }, retryDelayMs);
    }
    countActiveCalls() {
        let count = 0;
        for (const call of this.underlyingCalls) {
            if ((call === null || call === void 0 ? void 0 : call.state) === 'ACTIVE') {
                count += 1;
            }
        }
        return count;
    }
    handleProcessedStatus(status, callIndex, pushback) {
        var _a, _b, _c;
        switch (this.state) {
            case 'COMMITTED':
            case 'NO_RETRY':
            case 'TRANSPARENT_ONLY':
                this.commitCall(callIndex);
                this.reportStatus(status);
                break;
            case 'HEDGING':
                if (this.isStatusCodeInList((_a = this.callConfig.methodConfig.hedgingPolicy.nonFatalStatusCodes) !== null && _a !== void 0 ? _a : [], status.code)) {
                    (_b = this.retryThrottler) === null || _b === void 0 ? void 0 : _b.addCallFailed();
                    let delayMs;
                    if (pushback === null) {
                        delayMs = 0;
                    }
                    else if (pushback < 0) {
                        this.state = 'TRANSPARENT_ONLY';
                        this.commitCall(callIndex);
                        this.reportStatus(status);
                        return;
                    }
                    else {
                        delayMs = pushback;
                    }
                    setTimeout(() => {
                        this.maybeStartHedgingAttempt();
                        // If after trying to start a call there are no active calls, this was the last one
                        if (this.countActiveCalls() === 0) {
                            this.commitCall(callIndex);
                            this.reportStatus(status);
                        }
                    }, delayMs);
                }
                else {
                    this.commitCall(callIndex);
                    this.reportStatus(status);
                }
                break;
            case 'RETRY':
                if (this.isStatusCodeInList(this.callConfig.methodConfig.retryPolicy.retryableStatusCodes, status.code)) {
                    (_c = this.retryThrottler) === null || _c === void 0 ? void 0 : _c.addCallFailed();
                    this.maybeRetryCall(pushback, retried => {
                        if (!retried) {
                            this.commitCall(callIndex);
                            this.reportStatus(status);
                        }
                    });
                }
                else {
                    this.commitCall(callIndex);
                    this.reportStatus(status);
                }
                break;
        }
    }
    getPushback(metadata) {
        const mdValue = metadata.get('grpc-retry-pushback-ms');
        if (mdValue.length === 0) {
            return null;
        }
        try {
            return parseInt(mdValue[0]);
        }
        catch (e) {
            return -1;
        }
    }
    handleChildStatus(status, callIndex) {
        var _a;
        if (this.underlyingCalls[callIndex].state === 'COMPLETED') {
            return;
        }
        this.trace('state=' +
            this.state +
            ' handling status with progress ' +
            status.progress +
            ' from child [' +
            this.underlyingCalls[callIndex].call.getCallNumber() +
            '] in state ' +
            this.underlyingCalls[callIndex].state);
        this.underlyingCalls[callIndex].state = 'COMPLETED';
        if (status.code === constants_1.Status.OK) {
            (_a = this.retryThrottler) === null || _a === void 0 ? void 0 : _a.addCallSucceeded();
            this.commitCall(callIndex);
            this.reportStatus(status);
            return;
        }
        if (this.state === 'NO_RETRY') {
            this.commitCall(callIndex);
            this.reportStatus(status);
            return;
        }
        if (this.state === 'COMMITTED') {
            this.reportStatus(status);
            return;
        }
        const pushback = this.getPushback(status.metadata);
        switch (status.progress) {
            case 'NOT_STARTED':
                // RPC never leaves the client, always safe to retry
                this.startNewAttempt();
                break;
            case 'REFUSED':
                // RPC reaches the server library, but not the server application logic
                if (this.transparentRetryUsed) {
                    this.handleProcessedStatus(status, callIndex, pushback);
                }
                else {
                    this.transparentRetryUsed = true;
                    this.startNewAttempt();
                }
                break;
            case 'DROP':
                this.commitCall(callIndex);
                this.reportStatus(status);
                break;
            case 'PROCESSED':
                this.handleProcessedStatus(status, callIndex, pushback);
                break;
        }
    }
    maybeStartHedgingAttempt() {
        if (this.state !== 'HEDGING') {
            return;
        }
        if (!this.callConfig.methodConfig.hedgingPolicy) {
            return;
        }
        if (this.attempts >= this.maxAttempts) {
            return;
        }
        this.attempts += 1;
        this.startNewAttempt();
        this.maybeStartHedgingTimer();
    }
    maybeStartHedgingTimer() {
        var _a, _b, _c;
        if (this.hedgingTimer) {
            clearTimeout(this.hedgingTimer);
        }
        if (this.state !== 'HEDGING') {
            return;
        }
        if (!this.callConfig.methodConfig.hedgingPolicy) {
            return;
        }
        const hedgingPolicy = this.callConfig.methodConfig.hedgingPolicy;
        if (this.attempts >= this.maxAttempts) {
            return;
        }
        const hedgingDelayString = (_a = hedgingPolicy.hedgingDelay) !== null && _a !== void 0 ? _a : '0s';
        const hedgingDelaySec = Number(hedgingDelayString.substring(0, hedgingDelayString.length - 1));
        this.hedgingTimer = setTimeout(() => {
            this.maybeStartHedgingAttempt();
        }, hedgingDelaySec * 1000);
        (_c = (_b = this.hedgingTimer).unref) === null || _c === void 0 ? void 0 : _c.call(_b);
    }
    startNewAttempt() {
        const child = this.channel.createLoadBalancingCall(this.callConfig, this.methodName, this.host, this.credentials, this.deadline);
        this.trace('Created child call [' +
            child.getCallNumber() +
            '] for attempt ' +
            this.attempts);
        const index = this.underlyingCalls.length;
        this.underlyingCalls.push({
            state: 'ACTIVE',
            call: child,
            nextMessageToSend: 0,
            startTime: new Date(),
        });
        const previousAttempts = this.attempts - 1;
        const initialMetadata = this.initialMetadata.clone();
        if (previousAttempts > 0) {
            initialMetadata.set(PREVIONS_RPC_ATTEMPTS_METADATA_KEY, `${previousAttempts}`);
        }
        let receivedMetadata = false;
        child.start(initialMetadata, {
            onReceiveMetadata: metadata => {
                this.trace('Received metadata from child [' + child.getCallNumber() + ']');
                this.commitCall(index);
                receivedMetadata = true;
                if (previousAttempts > 0) {
                    metadata.set(PREVIONS_RPC_ATTEMPTS_METADATA_KEY, `${previousAttempts}`);
                }
                if (this.underlyingCalls[index].state === 'ACTIVE') {
                    this.listener.onReceiveMetadata(metadata);
                }
            },
            onReceiveMessage: message => {
                this.trace('Received message from child [' + child.getCallNumber() + ']');
                this.commitCall(index);
                if (this.underlyingCalls[index].state === 'ACTIVE') {
                    this.listener.onReceiveMessage(message);
                }
            },
            onReceiveStatus: status => {
                this.trace('Received status from child [' + child.getCallNumber() + ']');
                if (!receivedMetadata && previousAttempts > 0) {
                    status.metadata.set(PREVIONS_RPC_ATTEMPTS_METADATA_KEY, `${previousAttempts}`);
                }
                this.handleChildStatus(status, index);
            },
        });
        this.sendNextChildMessage(index);
        if (this.readStarted) {
            child.startRead();
        }
    }
    start(metadata, listener) {
        this.trace('start called');
        this.listener = listener;
        this.initialMetadata = metadata;
        this.attempts += 1;
        this.startNewAttempt();
        this.maybeStartHedgingTimer();
    }
    handleChildWriteCompleted(childIndex, messageIndex) {
        var _a, _b;
        (_b = (_a = this.getBufferEntry(messageIndex)).callback) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.clearSentMessages();
        const childCall = this.underlyingCalls[childIndex];
        childCall.nextMessageToSend += 1;
        this.sendNextChildMessage(childIndex);
    }
    sendNextChildMessage(childIndex) {
        const childCall = this.underlyingCalls[childIndex];
        if (childCall.state === 'COMPLETED') {
            return;
        }
        const messageIndex = childCall.nextMessageToSend;
        if (this.getBufferEntry(messageIndex)) {
            const bufferEntry = this.getBufferEntry(messageIndex);
            switch (bufferEntry.entryType) {
                case 'MESSAGE':
                    childCall.call.sendMessageWithContext({
                        callback: error => {
                            // Ignore error
                            this.handleChildWriteCompleted(childIndex, messageIndex);
                        },
                    }, bufferEntry.message.message);
                    // Optimization: if the next entry is HALF_CLOSE, send it immediately
                    // without waiting for the message callback. This is safe because the message
                    // has already been passed to the underlying transport.
                    const nextEntry = this.getBufferEntry(messageIndex + 1);
                    if (nextEntry.entryType === 'HALF_CLOSE') {
                        this.trace('Sending halfClose immediately after message to child [' +
                            childCall.call.getCallNumber() +
                            '] - optimizing for unary/final message');
                        childCall.nextMessageToSend += 1;
                        childCall.call.halfClose();
                    }
                    break;
                case 'HALF_CLOSE':
                    childCall.nextMessageToSend += 1;
                    childCall.call.halfClose();
                    break;
                case 'FREED':
                    // Should not be possible
                    break;
            }
        }
    }
    sendMessageWithContext(context, message) {
        this.trace('write() called with message of length ' + message.length);
        const writeObj = {
            message,
            flags: context.flags,
        };
        const messageIndex = this.getNextBufferIndex();
        const bufferEntry = {
            entryType: 'MESSAGE',
            message: writeObj,
            allocated: this.bufferTracker.allocate(message.length, this.callNumber),
        };
        this.writeBuffer.push(bufferEntry);
        if (bufferEntry.allocated) {
            // Run this in next tick to avoid suspending the current execution context
            // otherwise it might cause half closing the call before sending message
            process.nextTick(() => {
                var _a;
                (_a = context.callback) === null || _a === void 0 ? void 0 : _a.call(context);
            });
            for (const [callIndex, call] of this.underlyingCalls.entries()) {
                if (call.state === 'ACTIVE' &&
                    call.nextMessageToSend === messageIndex) {
                    call.call.sendMessageWithContext({
                        callback: error => {
                            // Ignore error
                            this.handleChildWriteCompleted(callIndex, messageIndex);
                        },
                    }, message);
                }
            }
        }
        else {
            this.commitCallWithMostMessages();
            // commitCallWithMostMessages can fail if we are between ping attempts
            if (this.committedCallIndex === null) {
                return;
            }
            const call = this.underlyingCalls[this.committedCallIndex];
            bufferEntry.callback = context.callback;
            if (call.state === 'ACTIVE' && call.nextMessageToSend === messageIndex) {
                call.call.sendMessageWithContext({
                    callback: error => {
                        // Ignore error
                        this.handleChildWriteCompleted(this.committedCallIndex, messageIndex);
                    },
                }, message);
            }
        }
    }
    startRead() {
        this.trace('startRead called');
        this.readStarted = true;
        for (const underlyingCall of this.underlyingCalls) {
            if ((underlyingCall === null || underlyingCall === void 0 ? void 0 : underlyingCall.state) === 'ACTIVE') {
                underlyingCall.call.startRead();
            }
        }
    }
    halfClose() {
        this.trace('halfClose called');
        const halfCloseIndex = this.getNextBufferIndex();
        this.writeBuffer.push({
            entryType: 'HALF_CLOSE',
            allocated: false,
        });
        for (const call of this.underlyingCalls) {
            if ((call === null || call === void 0 ? void 0 : call.state) === 'ACTIVE') {
                // Send halfClose to call when either:
                // - nextMessageToSend === halfCloseIndex - 1: last message sent, callback pending (optimization)
                // - nextMessageToSend === halfCloseIndex: all messages sent and acknowledged
                if (call.nextMessageToSend === halfCloseIndex
                    || call.nextMessageToSend === halfCloseIndex - 1) {
                    this.trace('Sending halfClose immediately to child [' +
                        call.call.getCallNumber() +
                        '] - all messages already sent');
                    call.nextMessageToSend += 1;
                    call.call.halfClose();
                }
                // Otherwise, halfClose will be sent by sendNextChildMessage when message callbacks complete
            }
        }
    }
    setCredentials(newCredentials) {
        throw new Error('Method not implemented.');
    }
    getMethod() {
        return this.methodName;
    }
    getHost() {
        return this.host;
    }
    getAuthContext() {
        if (this.committedCallIndex !== null) {
            return this.underlyingCalls[this.committedCallIndex].call.getAuthContext();
        }
        else {
            return null;
        }
    }
}
exports.RetryingCall = RetryingCall;
//# sourceMappingURL=retrying-call.js.map