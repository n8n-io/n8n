/**
 * Broadcaster execution result - promises executed by operations and number of executed listeners and subscribers.
 */
export declare class BroadcasterResult {
    /**
     * Number of executed listeners and subscribers.
     */
    count: number;
    /**
     * Promises returned by listeners and subscribers which needs to be awaited.
     */
    promises: Promise<any>[];
    /**
     * Wait for all promises to settle
     */
    wait(): Promise<BroadcasterResult>;
}
