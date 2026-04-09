import { AuthContext } from './auth-context';
import { CallCredentials } from './call-credentials';
import { Status } from './constants';
import { Deadline } from './deadline';
import { Metadata } from './metadata';
import { ServerSurfaceCall } from './server-call';
export interface CallStreamOptions {
    deadline: Deadline;
    flags: number;
    host: string;
    parentCall: ServerSurfaceCall | null;
}
export type PartialCallStreamOptions = Partial<CallStreamOptions>;
export interface StatusObject {
    code: Status;
    details: string;
    metadata: Metadata;
}
export type PartialStatusObject = Pick<StatusObject, 'code' | 'details'> & {
    metadata?: Metadata | null | undefined;
};
export interface StatusOrOk<T> {
    ok: true;
    value: T;
}
export interface StatusOrError {
    ok: false;
    error: StatusObject;
}
export type StatusOr<T> = StatusOrOk<T> | StatusOrError;
export declare function statusOrFromValue<T>(value: T): StatusOr<T>;
export declare function statusOrFromError<T>(error: PartialStatusObject): StatusOr<T>;
export declare const enum WriteFlags {
    BufferHint = 1,
    NoCompress = 2,
    WriteThrough = 4
}
export interface WriteObject {
    message: Buffer;
    flags?: number;
}
export interface MetadataListener {
    (metadata: Metadata, next: (metadata: Metadata) => void): void;
}
export interface MessageListener {
    (message: any, next: (message: any) => void): void;
}
export interface StatusListener {
    (status: StatusObject, next: (status: StatusObject) => void): void;
}
export interface FullListener {
    onReceiveMetadata: MetadataListener;
    onReceiveMessage: MessageListener;
    onReceiveStatus: StatusListener;
}
export type Listener = Partial<FullListener>;
/**
 * An object with methods for handling the responses to a call.
 */
export interface InterceptingListener {
    onReceiveMetadata(metadata: Metadata): void;
    onReceiveMessage(message: any): void;
    onReceiveStatus(status: StatusObject): void;
}
export declare function isInterceptingListener(listener: Listener | InterceptingListener): listener is InterceptingListener;
export declare class InterceptingListenerImpl implements InterceptingListener {
    private listener;
    private nextListener;
    private processingMetadata;
    private hasPendingMessage;
    private pendingMessage;
    private processingMessage;
    private pendingStatus;
    constructor(listener: FullListener, nextListener: InterceptingListener);
    private processPendingMessage;
    private processPendingStatus;
    onReceiveMetadata(metadata: Metadata): void;
    onReceiveMessage(message: any): void;
    onReceiveStatus(status: StatusObject): void;
}
export interface WriteCallback {
    (error?: Error | null): void;
}
export interface MessageContext {
    callback?: WriteCallback;
    flags?: number;
}
export interface Call {
    cancelWithStatus(status: Status, details: string): void;
    getPeer(): string;
    start(metadata: Metadata, listener: InterceptingListener): void;
    sendMessageWithContext(context: MessageContext, message: Buffer): void;
    startRead(): void;
    halfClose(): void;
    getCallNumber(): number;
    setCredentials(credentials: CallCredentials): void;
    getAuthContext(): AuthContext | null;
}
export interface DeadlineInfoProvider {
    getDeadlineInfo(): string[];
}
