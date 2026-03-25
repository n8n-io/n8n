"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinimumHeap = void 0;
/**
 * Implements a standard heap data structure for items of type T and a custom comparator.
 * The root will always be the minimum value as determined by the comparator.
 *
 * @public
 */
class MinimumHeap {
    /**
     * Constructs a new MinimumHeap instance.
     * @param comparator - a comparator function that determines the order of the items in the heap.
     *   If the comparator returns a value less than zero, then `a` will be considered less than `b`.
     *   If the comparator returns zero, then `a` and `b` are considered equal.
     *   Otherwise, `a` will be considered greater than `b`.
     */
    constructor(comparator) {
        this._items = [];
        this._comparator = comparator;
    }
    /**
     * Returns the number of items in the heap.
     * @returns the number of items in the heap.
     */
    get size() {
        return this._items.length;
    }
    /**
     * Retrieves the root item from the heap without removing it.
     * @returns the root item, or `undefined` if the heap is empty
     */
    peek() {
        return this._items[0];
    }
    /**
     * Retrieves and removes the root item from the heap. The next smallest item will become the new root.
     * @returns the root item, or `undefined` if the heap is empty
     */
    poll() {
        if (this.size > 0) {
            const result = this._items[0];
            const item = this._items.pop();
            const size = this.size;
            if (size === 0) {
                // Short circuit in the trivial case
                return result;
            }
            let index = 0;
            let smallerChildIndex = 1;
            while (smallerChildIndex < size) {
                let smallerChild = this._items[smallerChildIndex];
                const rightChildIndex = smallerChildIndex + 1;
                if (rightChildIndex < size) {
                    const rightChild = this._items[rightChildIndex];
                    if (this._comparator(rightChild, smallerChild) < 0) {
                        smallerChildIndex = rightChildIndex;
                        smallerChild = rightChild;
                    }
                }
                if (this._comparator(smallerChild, item) < 0) {
                    this._items[index] = smallerChild;
                    index = smallerChildIndex;
                    smallerChildIndex = index * 2 + 1;
                }
                else {
                    break;
                }
            }
            // Place the item in its final location satisfying the heap property
            this._items[index] = item;
            return result;
        }
    }
    /**
     * Pushes an item into the heap.
     * @param item - the item to push
     */
    push(item) {
        let index = this.size;
        while (index > 0) {
            // Due to zero-based indexing the parent is not exactly a bit shift
            const parentIndex = ((index + 1) >> 1) - 1;
            const parent = this._items[parentIndex];
            if (this._comparator(item, parent) < 0) {
                this._items[index] = parent;
                index = parentIndex;
            }
            else {
                break;
            }
        }
        this._items[index] = item;
    }
}
exports.MinimumHeap = MinimumHeap;
//# sourceMappingURL=MinimumHeap.js.map