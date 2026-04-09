"use strict";
/*
 * Copyright 2025 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityQueue = void 0;
const top = 0;
const parent = (i) => Math.floor(i / 2);
const left = (i) => i * 2 + 1;
const right = (i) => i * 2 + 2;
/**
 * A generic priority queue implemented as an array-based binary heap.
 * Adapted from https://stackoverflow.com/a/42919752/159388
 */
class PriorityQueue {
    /**
     *
     * @param comparator Returns true if the first argument should precede the
     *   second in the queue. Defaults to `(a, b) => a > b`
     */
    constructor(comparator = (a, b) => a > b) {
        this.comparator = comparator;
        this.heap = [];
    }
    /**
     * @returns The number of items currently in the queue
     */
    size() {
        return this.heap.length;
    }
    /**
     * @returns True if there are no items in the queue, false otherwise
     */
    isEmpty() {
        return this.size() == 0;
    }
    /**
     * Look at the front item that would be popped, without modifying the contents
     * of the queue
     * @returns The front item in the queue, or undefined if the queue is empty
     */
    peek() {
        return this.heap[top];
    }
    /**
     * Add the items to the queue
     * @param values The items to add
     * @returns The new size of the queue after adding the items
     */
    push(...values) {
        values.forEach(value => {
            this.heap.push(value);
            this.siftUp();
        });
        return this.size();
    }
    /**
     * Remove the front item in the queue and return it
     * @returns The front item in the queue, or undefined if the queue is empty
     */
    pop() {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > top) {
            this.swap(top, bottom);
        }
        this.heap.pop();
        this.siftDown();
        return poppedValue;
    }
    /**
     * Simultaneously remove the front item in the queue and add the provided
     * item.
     * @param value The item to add
     * @returns The front item in the queue, or undefined if the queue is empty
     */
    replace(value) {
        const replacedValue = this.peek();
        this.heap[top] = value;
        this.siftDown();
        return replacedValue;
    }
    greater(i, j) {
        return this.comparator(this.heap[i], this.heap[j]);
    }
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    siftUp() {
        let node = this.size() - 1;
        while (node > top && this.greater(node, parent(node))) {
            this.swap(node, parent(node));
            node = parent(node);
        }
    }
    siftDown() {
        let node = top;
        while ((left(node) < this.size() && this.greater(left(node), node)) ||
            (right(node) < this.size() && this.greater(right(node), node))) {
            let maxChild = (right(node) < this.size() && this.greater(right(node), left(node))) ? right(node) : left(node);
            this.swap(node, maxChild);
            node = maxChild;
        }
    }
}
exports.PriorityQueue = PriorityQueue;
//# sourceMappingURL=priority-queue.js.map