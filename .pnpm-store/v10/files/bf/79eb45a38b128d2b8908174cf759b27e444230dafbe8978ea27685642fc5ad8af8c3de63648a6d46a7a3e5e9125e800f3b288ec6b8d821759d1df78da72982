/**
 * A class that manages a queue of retry jobs.
 */
export class Retrier {
    /**
     * Creates a new instance.
     * @param {Function} check The function to call.
     * @param {object} [options] The options for the instance.
     * @param {number} [options.timeout] The timeout for the queue.
     * @param {number} [options.maxDelay] The maximum delay for the queue.
     */
    constructor(check: Function, { timeout, maxDelay }?: {
        timeout?: number | undefined;
        maxDelay?: number | undefined;
    } | undefined);
    /**
     * Adds a new retry job to the queue.
     * @param {Function} fn The function to call.
     * @param {object} [options] The options for the job.
     * @param {AbortSignal} [options.signal] The AbortSignal to monitor for cancellation.
     * @returns {Promise<any>} A promise that resolves when the queue is
     *  processed.
     */
    retry(fn: Function, { signal }?: {
        signal?: AbortSignal | undefined;
    } | undefined): Promise<any>;
    #private;
}
