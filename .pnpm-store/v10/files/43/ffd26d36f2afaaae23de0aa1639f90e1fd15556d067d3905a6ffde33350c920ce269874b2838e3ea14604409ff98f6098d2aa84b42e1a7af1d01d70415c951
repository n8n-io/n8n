import { CallCredentials } from './call-credentials';
import { Call, CallStreamOptions, InterceptingListener, MessageContext, StatusObject } from './call-interface';
import { Status } from './constants';
import { FilterStackFactory } from './filter-stack';
import { InternalChannel } from './internal-channel';
import { Metadata } from './metadata';
export declare class ResolvingCall implements Call {
    private readonly channel;
    private readonly method;
    private readonly filterStackFactory;
    private callNumber;
    private child;
    private readPending;
    private pendingMessage;
    private pendingHalfClose;
    private ended;
    private readFilterPending;
    private writeFilterPending;
    private pendingChildStatus;
    private metadata;
    private listener;
    private deadline;
    private host;
    private statusWatchers;
    private deadlineTimer;
    private filterStack;
    private deadlineStartTime;
    private configReceivedTime;
    private childStartTime;
    /**
     * Credentials configured for this specific call. Does not include
     * call credentials associated with the channel credentials used to create
     * the channel.
     */
    private credentials;
    constructor(channel: InternalChannel, method: string, options: CallStreamOptions, filterStackFactory: FilterStackFactory, callNumber: number);
    private trace;
    private runDeadlineTimer;
    private outputStatus;
    private sendMessageOnChild;
    getConfig(): void;
    reportResolverError(status: StatusObject): void;
    cancelWithStatus(status: Status, details: string): void;
    getPeer(): string;
    start(metadata: Metadata, listener: InterceptingListener): void;
    sendMessageWithContext(context: MessageContext, message: Buffer): void;
    startRead(): void;
    halfClose(): void;
    setCredentials(credentials: CallCredentials): void;
    addStatusWatcher(watcher: (status: StatusObject) => void): void;
    getCallNumber(): number;
}
