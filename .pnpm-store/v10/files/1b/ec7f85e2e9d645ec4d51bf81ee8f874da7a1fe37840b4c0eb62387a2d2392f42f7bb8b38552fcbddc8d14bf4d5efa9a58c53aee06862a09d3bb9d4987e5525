/**
 * Implements a standard heap data structure for items of type T and a custom comparator.
 * The root will always be the minimum value as determined by the comparator.
 *
 * @public
 */
export declare class MinimumHeap<T> {
    private readonly _items;
    private readonly _comparator;
    /**
     * Constructs a new MinimumHeap instance.
     * @param comparator - a comparator function that determines the order of the items in the heap.
     *   If the comparator returns a value less than zero, then `a` will be considered less than `b`.
     *   If the comparator returns zero, then `a` and `b` are considered equal.
     *   Otherwise, `a` will be considered greater than `b`.
     */
    constructor(comparator: (a: T, b: T) => number);
    /**
     * Returns the number of items in the heap.
     * @returns the number of items in the heap.
     */
    get size(): number;
    /**
     * Retrieves the root item from the heap without removing it.
     * @returns the root item, or `undefined` if the heap is empty
     */
    peek(): T | undefined;
    /**
     * Retrieves and removes the root item from the heap. The next smallest item will become the new root.
     * @returns the root item, or `undefined` if the heap is empty
     */
    poll(): T | undefined;
    /**
     * Pushes an item into the heap.
     * @param item - the item to push
     */
    push(item: T): void;
}
//# sourceMappingURL=MinimumHeap.d.ts.map