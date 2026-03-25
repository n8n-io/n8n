import { CallCredentials } from './call-credentials';
import { Status } from './constants';
import { Deadline } from './deadline';
import { Metadata } from './metadata';
import { CallConfig } from './resolver';
import { Call, DeadlineInfoProvider, InterceptingListener, MessageContext } from './call-interface';
import { InternalChannel } from './internal-channel';
export declare class RetryThrottler {
    private readonly maxTokens;
    private readonly tokenRatio;
    private tokens;
    constructor(maxTokens: number, tokenRatio: number, previousRetryThrottler?: RetryThrottler);
    addCallSucceeded(): void;
    addCallFailed(): void;
    canRetryCall(): boolean;
}
export declare class MessageBufferTracker {
    private totalLimit;
    private limitPerCall;
    private totalAllocated;
    private allocatedPerCall;
    constructor(totalLimit: number, limitPerCall: number);
    allocate(size: number, callId: number): boolean;
    free(size: number, callId: number): void;
    freeAll(callId: number): void;
}
export declare class RetryingCall implements Call, DeadlineInfoProvider {
    private readonly channel;
    private readonly callConfig;
    private readonly methodName;
    private readonly host;
    private readonly credentials;
    private readonly deadline;
    private readonly callNumber;
    private readonly bufferTracker;
    private readonly retryThrottler?;
    private state;
    private listener;
    private initialMetadata;
    private underlyingCalls;
    private writeBuffer;
    /**
     * The offset of message indices in the writeBuffer. For example, if
     * writeBufferOffset is 10, message 10 is in writeBuffer[0] and message 15
     * is in writeBuffer[5].
     */
    private writeBufferOffset;
    /**
     * Tracks whether a read has been started, so that we know whether to start
     * reads on new child calls. This only matters for the first read, because
     * once a message comes in the child call becomes committed and there will
     * be no new child calls.
     */
    private readStarted;
    private transparentRetryUsed;
    /**
     * Number of attempts so far
     */
    private attempts;
    private hedgingTimer;
    private committedCallIndex;
    private initialRetryBackoffSec;
    private nextRetryBackoffSec;
    private startTime;
    private maxAttempts;
    constructor(channel: InternalChannel, callConfig: CallConfig, methodName: string, host: string, credentials: CallCredentials, deadline: Deadline, callNumber: number, bufferTracker: MessageBufferTracker, retryThrottler?: RetryThrottler | undefined);
    getDeadlineInfo(): string[];
    getCallNumber(): number;
    private trace;
    private reportStatus;
    cancelWithStatus(status: Status, details: string): void;
    getPeer(): string;
    private getBufferEntry;
    private getNextBufferIndex;
    private clearSentMessages;
    private commitCall;
    private commitCallWithMostMessages;
    private isStatusCodeInList;
    private getNextRetryBackoffMs;
    private maybeRetryCall;
    private countActiveCalls;
    private handleProcessedStatus;
    private getPushback;
    private handleChildStatus;
    private maybeStartHedgingAttempt;
    private maybeStartHedgingTimer;
    private startNewAttempt;
    start(metadata: Metadata, listener: InterceptingListener): void;
    private handleChildWriteCompleted;
    private sendNextChildMessage;
    sendMessageWithContext(context: MessageContext, message: Buffer): void;
    startRead(): void;
    halfClose(): void;
    setCredentials(newCredentials: CallCredentials): void;
    getMethod(): string;
    getHost(): string;
}
