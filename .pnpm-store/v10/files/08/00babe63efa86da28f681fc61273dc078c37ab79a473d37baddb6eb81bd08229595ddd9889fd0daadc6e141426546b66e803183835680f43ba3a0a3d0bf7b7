/**
 * A generic priority queue implemented as an array-based binary heap.
 * Adapted from https://stackoverflow.com/a/42919752/159388
 */
export declare class PriorityQueue<T = number> {
    private readonly comparator;
    private readonly heap;
    /**
     *
     * @param comparator Returns true if the first argument should precede the
     *   second in the queue. Defaults to `(a, b) => a > b`
     */
    constructor(comparator?: (a: T, b: T) => boolean);
    /**
     * @returns The number of items currently in the queue
     */
    size(): number;
    /**
     * @returns True if there are no items in the queue, false otherwise
     */
    isEmpty(): boolean;
    /**
     * Look at the front item that would be popped, without modifying the contents
     * of the queue
     * @returns The front item in the queue, or undefined if the queue is empty
     */
    peek(): T | undefined;
    /**
     * Add the items to the queue
     * @param values The items to add
     * @returns The new size of the queue after adding the items
     */
    push(...values: T[]): number;
    /**
     * Remove the front item in the queue and return it
     * @returns The front item in the queue, or undefined if the queue is empty
     */
    pop(): T | undefined;
    /**
     * Simultaneously remove the front item in the queue and add the provided
     * item.
     * @param value The item to add
     * @returns The front item in the queue, or undefined if the queue is empty
     */
    replace(value: T): T | undefined;
    private greater;
    private swap;
    private siftUp;
    private siftDown;
}
