export interface BackoffOptions {
    initialDelay?: number;
    multiplier?: number;
    jitter?: number;
    maxDelay?: number;
}
export declare class BackoffTimeout {
    private callback;
    /**
     * The delay time at the start, and after each reset.
     */
    private readonly initialDelay;
    /**
     * The exponential backoff multiplier.
     */
    private readonly multiplier;
    /**
     * The maximum delay time
     */
    private readonly maxDelay;
    /**
     * The maximum fraction by which the delay time can randomly vary after
     * applying the multiplier.
     */
    private readonly jitter;
    /**
     * The delay time for the next time the timer runs.
     */
    private nextDelay;
    /**
     * The handle of the underlying timer. If running is false, this value refers
     * to an object representing a timer that has ended, but it can still be
     * interacted with without error.
     */
    private timerId;
    /**
     * Indicates whether the timer is currently running.
     */
    private running;
    /**
     * Indicates whether the timer should keep the Node process running if no
     * other async operation is doing so.
     */
    private hasRef;
    /**
     * The time that the currently running timer was started. Only valid if
     * running is true.
     */
    private startTime;
    /**
     * The approximate time that the currently running timer will end. Only valid
     * if running is true.
     */
    private endTime;
    private id;
    private static nextId;
    constructor(callback: () => void, options?: BackoffOptions);
    private static getNextId;
    private trace;
    private runTimer;
    /**
     * Call the callback after the current amount of delay time
     */
    runOnce(): void;
    /**
     * Stop the timer. The callback will not be called until `runOnce` is called
     * again.
     */
    stop(): void;
    /**
     * Reset the delay time to its initial value. If the timer is still running,
     * retroactively apply that reset to the current timer.
     */
    reset(): void;
    /**
     * Check whether the timer is currently running.
     */
    isRunning(): boolean;
    /**
     * Set that while the timer is running, it should keep the Node process
     * running.
     */
    ref(): void;
    /**
     * Set that while the timer is running, it should not keep the Node process
     * running.
     */
    unref(): void;
    /**
     * Get the approximate timestamp of when the timer will fire. Only valid if
     * this.isRunning() is true.
     */
    getEndTime(): Date;
}
