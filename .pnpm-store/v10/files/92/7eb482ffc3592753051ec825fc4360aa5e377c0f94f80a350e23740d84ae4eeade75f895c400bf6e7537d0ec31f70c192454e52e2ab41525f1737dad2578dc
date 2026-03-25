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

import { CallCredentials } from './call-credentials';
import { LogVerbosity, Status } from './constants';
import { Deadline, formatDateDifference } from './deadline';
import { Metadata } from './metadata';
import { CallConfig } from './resolver';
import * as logging from './logging';
import {
  Call,
  DeadlineInfoProvider,
  InterceptingListener,
  MessageContext,
  StatusObject,
  WriteCallback,
  WriteObject,
} from './call-interface';
import {
  LoadBalancingCall,
  StatusObjectWithProgress,
} from './load-balancing-call';
import { InternalChannel } from './internal-channel';

const TRACER_NAME = 'retrying_call';

export class RetryThrottler {
  private tokens: number;
  constructor(
    private readonly maxTokens: number,
    private readonly tokenRatio: number,
    previousRetryThrottler?: RetryThrottler
  ) {
    if (previousRetryThrottler) {
      /* When carrying over tokens from a previous config, rescale them to the
       * new max value */
      this.tokens =
        previousRetryThrottler.tokens *
        (maxTokens / previousRetryThrottler.maxTokens);
    } else {
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

export class MessageBufferTracker {
  private totalAllocated = 0;
  private allocatedPerCall: Map<number, number> = new Map<number, number>();

  constructor(private totalLimit: number, private limitPerCall: number) {}

  allocate(size: number, callId: number): boolean {
    const currentPerCall = this.allocatedPerCall.get(callId) ?? 0;
    if (
      this.limitPerCall - currentPerCall < size ||
      this.totalLimit - this.totalAllocated < size
    ) {
      return false;
    }
    this.allocatedPerCall.set(callId, currentPerCall + size);
    this.totalAllocated += size;
    return true;
  }

  free(size: number, callId: number) {
    if (this.totalAllocated < size) {
      throw new Error(
        `Invalid buffer allocation state: call ${callId} freed ${size} > total allocated ${this.totalAllocated}`
      );
    }
    this.totalAllocated -= size;
    const currentPerCall = this.allocatedPerCall.get(callId) ?? 0;
    if (currentPerCall < size) {
      throw new Error(
        `Invalid buffer allocation state: call ${callId} freed ${size} > allocated for call ${currentPerCall}`
      );
    }
    this.allocatedPerCall.set(callId, currentPerCall - size);
  }

  freeAll(callId: number) {
    const currentPerCall = this.allocatedPerCall.get(callId) ?? 0;
    if (this.totalAllocated < currentPerCall) {
      throw new Error(
        `Invalid buffer allocation state: call ${callId} allocated ${currentPerCall} > total allocated ${this.totalAllocated}`
      );
    }
    this.totalAllocated -= currentPerCall;
    this.allocatedPerCall.delete(callId);
  }
}

type UnderlyingCallState = 'ACTIVE' | 'COMPLETED';

interface UnderlyingCall {
  state: UnderlyingCallState;
  call: LoadBalancingCall;
  nextMessageToSend: number;
  startTime: Date;
}

/**
 * A retrying call can be in one of these states:
 * RETRY: Retries are configured and new attempts may be sent
 * HEDGING: Hedging is configured and new attempts may be sent
 * TRANSPARENT_ONLY: Neither retries nor hedging are configured, and
 * transparent retry attempts may still be sent
 * COMMITTED: One attempt is committed, and no new attempts will be
 * sent
 * NO_RETRY: Retries are disabled. Exists to track the transition to COMMITTED
 */
type RetryingCallState = 'RETRY' | 'HEDGING' | 'TRANSPARENT_ONLY' | 'COMMITTED' | 'NO_RETRY';

/**
 * The different types of objects that can be stored in the write buffer, with
 * the following meanings:
 * MESSAGE: This is a message to be sent.
 * HALF_CLOSE: When this entry is reached, the calls should send a half-close.
 * FREED: This slot previously contained a message that has been sent on all
 * child calls and is no longer needed.
 */
type WriteBufferEntryType = 'MESSAGE' | 'HALF_CLOSE' | 'FREED';

/**
 * Entry in the buffer of messages to send to the remote end.
 */
interface WriteBufferEntry {
  entryType: WriteBufferEntryType;
  /**
   * Message to send.
   * Only populated if entryType is MESSAGE.
   */
  message?: WriteObject;
  /**
   * Callback to call after sending the message.
   * Only populated if entryType is MESSAGE and the call is in the COMMITTED
   * state.
   */
  callback?: WriteCallback;
  /**
   * Indicates whether the message is allocated in the buffer tracker. Ignored
   * if entryType is not MESSAGE. Should be the return value of
   * bufferTracker.allocate.
   */
  allocated: boolean;
}

const PREVIONS_RPC_ATTEMPTS_METADATA_KEY = 'grpc-previous-rpc-attempts';

const DEFAULT_MAX_ATTEMPTS_LIMIT = 5;

export class RetryingCall implements Call, DeadlineInfoProvider {
  private state: RetryingCallState;
  private listener: InterceptingListener | null = null;
  private initialMetadata: Metadata | null = null;
  private underlyingCalls: UnderlyingCall[] = [];
  private writeBuffer: WriteBufferEntry[] = [];
  /**
   * The offset of message indices in the writeBuffer. For example, if
   * writeBufferOffset is 10, message 10 is in writeBuffer[0] and message 15
   * is in writeBuffer[5].
   */
  private writeBufferOffset = 0;
  /**
   * Tracks whether a read has been started, so that we know whether to start
   * reads on new child calls. This only matters for the first read, because
   * once a message comes in the child call becomes committed and there will
   * be no new child calls.
   */
  private readStarted = false;
  private transparentRetryUsed = false;
  /**
   * Number of attempts so far
   */
  private attempts = 0;
  private hedgingTimer: NodeJS.Timeout | null = null;
  private committedCallIndex: number | null = null;
  private initialRetryBackoffSec = 0;
  private nextRetryBackoffSec = 0;
  private startTime: Date;
  private maxAttempts: number;
  constructor(
    private readonly channel: InternalChannel,
    private readonly callConfig: CallConfig,
    private readonly methodName: string,
    private readonly host: string,
    private readonly credentials: CallCredentials,
    private readonly deadline: Deadline,
    private readonly callNumber: number,
    private readonly bufferTracker: MessageBufferTracker,
    private readonly retryThrottler?: RetryThrottler
  ) {
    const maxAttemptsLimit = channel.getOptions()['grpc-node.retry_max_attempts_limit'] ?? DEFAULT_MAX_ATTEMPTS_LIMIT;
    if (channel.getOptions()['grpc.enable_retries'] === 0) {
      this.state = 'NO_RETRY';
      this.maxAttempts = 1;
    } else if (callConfig.methodConfig.retryPolicy) {
      this.state = 'RETRY';
      const retryPolicy = callConfig.methodConfig.retryPolicy;
      this.nextRetryBackoffSec = this.initialRetryBackoffSec = Number(
        retryPolicy.initialBackoff.substring(
          0,
          retryPolicy.initialBackoff.length - 1
        )
      );
      this.maxAttempts = Math.min(retryPolicy.maxAttempts, maxAttemptsLimit);
    } else if (callConfig.methodConfig.hedgingPolicy) {
      this.state = 'HEDGING';
      this.maxAttempts = Math.min(callConfig.methodConfig.hedgingPolicy.maxAttempts, maxAttemptsLimit);
    } else {
      this.state = 'TRANSPARENT_ONLY';
      this.maxAttempts = 1;
    }
    this.startTime = new Date();
  }
  getDeadlineInfo(): string[] {
    if (this.underlyingCalls.length === 0) {
      return [];
    }
    const deadlineInfo: string[] = [];
    const latestCall = this.underlyingCalls[this.underlyingCalls.length - 1];
    if (this.underlyingCalls.length > 1) {
      deadlineInfo.push(`previous attempts: ${this.underlyingCalls.length - 1}`);
    }
    if (latestCall.startTime > this.startTime) {
      deadlineInfo.push(`time to current attempt start: ${formatDateDifference(this.startTime, latestCall.startTime)}`);
    }
    deadlineInfo.push(...latestCall.call.getDeadlineInfo());
    return deadlineInfo;
  }
  getCallNumber(): number {
    return this.callNumber;
  }

  private trace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      '[' + this.callNumber + '] ' + text
    );
  }

  private reportStatus(statusObject: StatusObject) {
    this.trace(
      'ended with status: code=' +
        statusObject.code +
        ' details="' +
        statusObject.details +
        '" start time=' +
        this.startTime.toISOString()
    );
    this.bufferTracker.freeAll(this.callNumber);
    this.writeBufferOffset = this.writeBufferOffset + this.writeBuffer.length;
    this.writeBuffer = [];
    process.nextTick(() => {
      // Explicitly construct status object to remove progress field
      this.listener?.onReceiveStatus({
        code: statusObject.code,
        details: statusObject.details,
        metadata: statusObject.metadata,
      });
    });
  }

  cancelWithStatus(status: Status, details: string): void {
    this.trace(
      'cancelWithStatus code: ' + status + ' details: "' + details + '"'
    );
    this.reportStatus({ code: status, details, metadata: new Metadata() });
    for (const { call } of this.underlyingCalls) {
      call.cancelWithStatus(status, details);
    }
  }
  getPeer(): string {
    if (this.committedCallIndex !== null) {
      return this.underlyingCalls[this.committedCallIndex].call.getPeer();
    } else {
      return 'unknown';
    }
  }

  private getBufferEntry(messageIndex: number): WriteBufferEntry {
    return (
      this.writeBuffer[messageIndex - this.writeBufferOffset] ?? {
        entryType: 'FREED',
        allocated: false,
      }
    );
  }

  private getNextBufferIndex() {
    return this.writeBufferOffset + this.writeBuffer.length;
  }

  private clearSentMessages() {
    if (this.state !== 'COMMITTED') {
      return;
    }
    let earliestNeededMessageIndex: number;
    if (this.underlyingCalls[this.committedCallIndex!].state === 'COMPLETED') {
      /* If the committed call is completed, clear all messages, even if some
       * have not been sent. */
      earliestNeededMessageIndex = this.getNextBufferIndex();
    } else {
      earliestNeededMessageIndex =
        this.underlyingCalls[this.committedCallIndex!].nextMessageToSend;
    }
    for (
      let messageIndex = this.writeBufferOffset;
      messageIndex < earliestNeededMessageIndex;
      messageIndex++
    ) {
      const bufferEntry = this.getBufferEntry(messageIndex);
      if (bufferEntry.allocated) {
        this.bufferTracker.free(
          bufferEntry.message!.message.length,
          this.callNumber
        );
      }
    }
    this.writeBuffer = this.writeBuffer.slice(
      earliestNeededMessageIndex - this.writeBufferOffset
    );
    this.writeBufferOffset = earliestNeededMessageIndex;
  }

  private commitCall(index: number) {
    if (this.state === 'COMMITTED') {
      return;
    }
    this.trace(
      'Committing call [' +
        this.underlyingCalls[index].call.getCallNumber() +
        '] at index ' +
        index
    );
    this.state = 'COMMITTED';
    this.callConfig.onCommitted?.();
    this.committedCallIndex = index;
    for (let i = 0; i < this.underlyingCalls.length; i++) {
      if (i === index) {
        continue;
      }
      if (this.underlyingCalls[i].state === 'COMPLETED') {
        continue;
      }
      this.underlyingCalls[i].state = 'COMPLETED';
      this.underlyingCalls[i].call.cancelWithStatus(
        Status.CANCELLED,
        'Discarded in favor of other hedged attempt'
      );
    }
    this.clearSentMessages();
  }

  private commitCallWithMostMessages() {
    if (this.state === 'COMMITTED') {
      return;
    }
    let mostMessages = -1;
    let callWithMostMessages = -1;
    for (const [index, childCall] of this.underlyingCalls.entries()) {
      if (
        childCall.state === 'ACTIVE' &&
        childCall.nextMessageToSend > mostMessages
      ) {
        mostMessages = childCall.nextMessageToSend;
        callWithMostMessages = index;
      }
    }
    if (callWithMostMessages === -1) {
      /* There are no active calls, disable retries to force the next call that
       * is started to be committed. */
      this.state = 'TRANSPARENT_ONLY';
    } else {
      this.commitCall(callWithMostMessages);
    }
  }

  private isStatusCodeInList(list: (Status | string)[], code: Status) {
    return list.some(
      value =>
        value === code ||
        value.toString().toLowerCase() === Status[code]?.toLowerCase()
    );
  }

  private getNextRetryBackoffMs() {
    const retryPolicy = this.callConfig?.methodConfig.retryPolicy;
    if (!retryPolicy) {
      return 0;
    }
    const nextBackoffMs = Math.random() * this.nextRetryBackoffSec * 1000;
    const maxBackoffSec = Number(
      retryPolicy.maxBackoff.substring(0, retryPolicy.maxBackoff.length - 1)
    );
    this.nextRetryBackoffSec = Math.min(
      this.nextRetryBackoffSec * retryPolicy.backoffMultiplier,
      maxBackoffSec
    );
    return nextBackoffMs;
  }

  private maybeRetryCall(
    pushback: number | null,
    callback: (retried: boolean) => void
  ) {
    if (this.state !== 'RETRY') {
      callback(false);
      return;
    }
    if (this.attempts >= this.maxAttempts) {
      callback(false);
      return;
    }
    let retryDelayMs: number;
    if (pushback === null) {
      retryDelayMs = this.getNextRetryBackoffMs();
    } else if (pushback < 0) {
      this.state = 'TRANSPARENT_ONLY';
      callback(false);
      return;
    } else {
      retryDelayMs = pushback;
      this.nextRetryBackoffSec = this.initialRetryBackoffSec;
    }
    setTimeout(() => {
      if (this.state !== 'RETRY') {
        callback(false);
        return;
      }
      if (this.retryThrottler?.canRetryCall() ?? true) {
        callback(true);
        this.attempts += 1;
        this.startNewAttempt();
      } else {
        this.trace('Retry attempt denied by throttling policy');
        callback(false);
      }
    }, retryDelayMs);
  }

  private countActiveCalls(): number {
    let count = 0;
    for (const call of this.underlyingCalls) {
      if (call?.state === 'ACTIVE') {
        count += 1;
      }
    }
    return count;
  }

  private handleProcessedStatus(
    status: StatusObject,
    callIndex: number,
    pushback: number | null
  ) {
    switch (this.state) {
      case 'COMMITTED':
      case 'NO_RETRY':
      case 'TRANSPARENT_ONLY':
        this.commitCall(callIndex);
        this.reportStatus(status);
        break;
      case 'HEDGING':
        if (
          this.isStatusCodeInList(
            this.callConfig!.methodConfig.hedgingPolicy!.nonFatalStatusCodes ??
              [],
            status.code
          )
        ) {
          this.retryThrottler?.addCallFailed();
          let delayMs: number;
          if (pushback === null) {
            delayMs = 0;
          } else if (pushback < 0) {
            this.state = 'TRANSPARENT_ONLY';
            this.commitCall(callIndex);
            this.reportStatus(status);
            return;
          } else {
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
        } else {
          this.commitCall(callIndex);
          this.reportStatus(status);
        }
        break;
      case 'RETRY':
        if (
          this.isStatusCodeInList(
            this.callConfig!.methodConfig.retryPolicy!.retryableStatusCodes,
            status.code
          )
        ) {
          this.retryThrottler?.addCallFailed();
          this.maybeRetryCall(pushback, retried => {
            if (!retried) {
              this.commitCall(callIndex);
              this.reportStatus(status);
            }
          });
        } else {
          this.commitCall(callIndex);
          this.reportStatus(status);
        }
        break;
    }
  }

  private getPushback(metadata: Metadata): number | null {
    const mdValue = metadata.get('grpc-retry-pushback-ms');
    if (mdValue.length === 0) {
      return null;
    }
    try {
      return parseInt(mdValue[0] as string);
    } catch (e) {
      return -1;
    }
  }

  private handleChildStatus(
    status: StatusObjectWithProgress,
    callIndex: number
  ) {
    if (this.underlyingCalls[callIndex].state === 'COMPLETED') {
      return;
    }
    this.trace(
      'state=' +
        this.state +
        ' handling status with progress ' +
        status.progress +
        ' from child [' +
        this.underlyingCalls[callIndex].call.getCallNumber() +
        '] in state ' +
        this.underlyingCalls[callIndex].state
    );
    this.underlyingCalls[callIndex].state = 'COMPLETED';
    if (status.code === Status.OK) {
      this.retryThrottler?.addCallSucceeded();
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
        } else {
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

  private maybeStartHedgingAttempt() {
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

  private maybeStartHedgingTimer() {
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
    const hedgingDelayString = hedgingPolicy.hedgingDelay ?? '0s';
    const hedgingDelaySec = Number(
      hedgingDelayString.substring(0, hedgingDelayString.length - 1)
    );
    this.hedgingTimer = setTimeout(() => {
      this.maybeStartHedgingAttempt();
    }, hedgingDelaySec * 1000);
    this.hedgingTimer.unref?.();
  }

  private startNewAttempt() {
    const child = this.channel.createLoadBalancingCall(
      this.callConfig,
      this.methodName,
      this.host,
      this.credentials,
      this.deadline
    );
    this.trace(
      'Created child call [' +
        child.getCallNumber() +
        '] for attempt ' +
        this.attempts
    );
    const index = this.underlyingCalls.length;
    this.underlyingCalls.push({
      state: 'ACTIVE',
      call: child,
      nextMessageToSend: 0,
      startTime: new Date()
    });
    const previousAttempts = this.attempts - 1;
    const initialMetadata = this.initialMetadata!.clone();
    if (previousAttempts > 0) {
      initialMetadata.set(
        PREVIONS_RPC_ATTEMPTS_METADATA_KEY,
        `${previousAttempts}`
      );
    }
    let receivedMetadata = false;
    child.start(initialMetadata, {
      onReceiveMetadata: metadata => {
        this.trace(
          'Received metadata from child [' + child.getCallNumber() + ']'
        );
        this.commitCall(index);
        receivedMetadata = true;
        if (previousAttempts > 0) {
          metadata.set(
            PREVIONS_RPC_ATTEMPTS_METADATA_KEY,
            `${previousAttempts}`
          );
        }
        if (this.underlyingCalls[index].state === 'ACTIVE') {
          this.listener!.onReceiveMetadata(metadata);
        }
      },
      onReceiveMessage: message => {
        this.trace(
          'Received message from child [' + child.getCallNumber() + ']'
        );
        this.commitCall(index);
        if (this.underlyingCalls[index].state === 'ACTIVE') {
          this.listener!.onReceiveMessage(message);
        }
      },
      onReceiveStatus: status => {
        this.trace(
          'Received status from child [' + child.getCallNumber() + ']'
        );
        if (!receivedMetadata && previousAttempts > 0) {
          status.metadata.set(
            PREVIONS_RPC_ATTEMPTS_METADATA_KEY,
            `${previousAttempts}`
          );
        }
        this.handleChildStatus(status, index);
      },
    });
    this.sendNextChildMessage(index);
    if (this.readStarted) {
      child.startRead();
    }
  }

  start(metadata: Metadata, listener: InterceptingListener): void {
    this.trace('start called');
    this.listener = listener;
    this.initialMetadata = metadata;
    this.attempts += 1;
    this.startNewAttempt();
    this.maybeStartHedgingTimer();
  }

  private handleChildWriteCompleted(childIndex: number) {
    const childCall = this.underlyingCalls[childIndex];
    const messageIndex = childCall.nextMessageToSend;
    this.getBufferEntry(messageIndex).callback?.();
    this.clearSentMessages();
    childCall.nextMessageToSend += 1;
    this.sendNextChildMessage(childIndex);
  }

  private sendNextChildMessage(childIndex: number) {
    const childCall = this.underlyingCalls[childIndex];
    if (childCall.state === 'COMPLETED') {
      return;
    }
    if (this.getBufferEntry(childCall.nextMessageToSend)) {
      const bufferEntry = this.getBufferEntry(childCall.nextMessageToSend);
      switch (bufferEntry.entryType) {
        case 'MESSAGE':
          childCall.call.sendMessageWithContext(
            {
              callback: error => {
                // Ignore error
                this.handleChildWriteCompleted(childIndex);
              },
            },
            bufferEntry.message!.message
          );
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

  sendMessageWithContext(context: MessageContext, message: Buffer): void {
    this.trace('write() called with message of length ' + message.length);
    const writeObj: WriteObject = {
      message,
      flags: context.flags,
    };
    const messageIndex = this.getNextBufferIndex();
    const bufferEntry: WriteBufferEntry = {
      entryType: 'MESSAGE',
      message: writeObj,
      allocated: this.bufferTracker.allocate(message.length, this.callNumber),
    };
    this.writeBuffer.push(bufferEntry);
    if (bufferEntry.allocated) {
      context.callback?.();
      for (const [callIndex, call] of this.underlyingCalls.entries()) {
        if (
          call.state === 'ACTIVE' &&
          call.nextMessageToSend === messageIndex
        ) {
          call.call.sendMessageWithContext(
            {
              callback: error => {
                // Ignore error
                this.handleChildWriteCompleted(callIndex);
              },
            },
            message
          );
        }
      }
    } else {
      this.commitCallWithMostMessages();
      // commitCallWithMostMessages can fail if we are between ping attempts
      if (this.committedCallIndex === null) {
        return;
      }
      const call = this.underlyingCalls[this.committedCallIndex];
      bufferEntry.callback = context.callback;
      if (call.state === 'ACTIVE' && call.nextMessageToSend === messageIndex) {
        call.call.sendMessageWithContext(
          {
            callback: error => {
              // Ignore error
              this.handleChildWriteCompleted(this.committedCallIndex!);
            },
          },
          message
        );
      }
    }
  }
  startRead(): void {
    this.trace('startRead called');
    this.readStarted = true;
    for (const underlyingCall of this.underlyingCalls) {
      if (underlyingCall?.state === 'ACTIVE') {
        underlyingCall.call.startRead();
      }
    }
  }
  halfClose(): void {
    this.trace('halfClose called');
    const halfCloseIndex = this.getNextBufferIndex();
    this.writeBuffer.push({
      entryType: 'HALF_CLOSE',
      allocated: false,
    });
    for (const call of this.underlyingCalls) {
      if (
        call?.state === 'ACTIVE' &&
        call.nextMessageToSend === halfCloseIndex
      ) {
        call.nextMessageToSend += 1;
        call.call.halfClose();
      }
    }
  }
  setCredentials(newCredentials: CallCredentials): void {
    throw new Error('Method not implemented.');
  }
  getMethod(): string {
    return this.methodName;
  }
  getHost(): string {
    return this.host;
  }
}
