export interface DelayQueueOptions {
    callback?: Function;
    timeout: number;
}
/**
 * Queue that runs items after specified duration
 */
export default class DelayQueue {
    private queues;
    private timeouts;
    /**
     * Add a new item to the queue
     *
     * @param bucket bucket name
     * @param item function that will run later
     * @param options
     */
    push(bucket: string, item: Function, options: DelayQueueOptions): void;
    private execute;
}
