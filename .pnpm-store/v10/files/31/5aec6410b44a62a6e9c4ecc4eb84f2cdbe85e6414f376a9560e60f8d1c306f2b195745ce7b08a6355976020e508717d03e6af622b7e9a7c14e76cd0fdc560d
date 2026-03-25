export declare class RetryOnServerFailure<T, A extends any[]> {
    maxRetries: number;
    asyncFn: (...args: A) => Promise<T>;
    constructor(asyncFn: (...args: A) => Promise<T>, maxRetries?: number);
    execute(...args: A): Promise<T>;
    isRetryError(response: any): boolean;
    delay(attempt: number): Promise<void>;
    calculateRetryDelay: (attempt: number, baseDelay?: number, maxDelay?: number, jitterFactor?: number) => number;
    private mapErrorIfNeeded;
    private shouldStopRetrying;
}
