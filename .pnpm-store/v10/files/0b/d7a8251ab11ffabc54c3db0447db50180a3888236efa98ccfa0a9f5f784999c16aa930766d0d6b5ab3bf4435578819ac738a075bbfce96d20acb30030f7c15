import type { AsyncLocalStorage } from 'node:async_hooks';
type AsyncStorageArgs = {
    /** The AsyncLocalStorage instance used to fetch the store */
    asyncLocalStorage: AsyncLocalStorage<unknown>;
    /**
     * Optional array of keys to fetch a specific property from the store
     * Key will be traversed in order through Objects/Maps to reach the desired property.
     *
     * This is useful if you want to capture Open Telemetry context values as state.
     *
     * To get this value:
     * context.getValue(my_unique_symbol_ref)
     *
     * You would set:
     * stateLookup: ['_currentContext', my_unique_symbol_ref]
     */
    stateLookup?: Array<string | symbol>;
};
type Thread<A = unknown, P = unknown> = {
    frames: StackFrame[];
    /** State captured from the AsyncLocalStorage, if provided */
    asyncState?: A;
    /** Optional state provided when calling threadPoll */
    pollState?: P;
};
type StackFrame = {
    function: string;
    filename: string;
    lineno: number;
    colno: number;
};
export declare function registerThread(threadName?: string): void;
export declare function registerThread(storageOrThread: AsyncStorageArgs | string, threadName?: string): void;
/**
 * Tells the native module that the thread is still running and updates the state.
 *
 * @param enableLastSeen If true, enables the last seen tracking for this thread.
 */
export declare function threadPoll(enableLastSeen?: boolean, pollState?: object): void;
/**
 * Captures stack traces for all registered threads.
 */
export declare function captureStackTrace<A = unknown, P = unknown>(): Record<string, Thread<A, P>>;
/**
 * Returns the number of milliseconds since the last time each thread was seen.
 *
 * This is useful for determining if a threads event loop has been blocked for a long time.
 */
export declare function getThreadsLastSeen(): Record<string, number>;
export {};
//# sourceMappingURL=index.d.ts.map