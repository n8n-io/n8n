import { Deferred } from './utils';
export declare class PendingOperation<T> {
    protected timeoutMillis: number;
    possibleTimeoutCause: Error | null;
    promise: Promise<T>;
    isRejected: boolean;
    protected deferred: Deferred<T>;
    constructor(timeoutMillis: number);
    abort(): void;
    reject(err: Error): void;
    resolve(value: T): void;
}
