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

const top = 0;
const parent = (i: number) => Math.floor(i / 2);
const left = (i: number) => i * 2 + 1;
const right = (i: number) => i * 2 + 2;

/**
 * A generic priority queue implemented as an array-based binary heap.
 * Adapted from https://stackoverflow.com/a/42919752/159388
 */
export class PriorityQueue<T=number> {
  private readonly heap: T[] = [];
  /**
   *
   * @param comparator Returns true if the first argument should precede the
   *   second in the queue. Defaults to `(a, b) => a > b`
   */
  constructor(private readonly comparator = (a: T, b: T) => a > b) {}

  /**
   * @returns The number of items currently in the queue
   */
  size(): number {
    return this.heap.length;
  }
  /**
   * @returns True if there are no items in the queue, false otherwise
   */
  isEmpty(): boolean {
    return this.size() == 0;
  }
  /**
   * Look at the front item that would be popped, without modifying the contents
   * of the queue
   * @returns The front item in the queue, or undefined if the queue is empty
   */
  peek(): T | undefined {
    return this.heap[top];
  }
  /**
   * Add the items to the queue
   * @param values The items to add
   * @returns The new size of the queue after adding the items
   */
  push(...values: T[]): number {
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
  pop(): T | undefined {
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
  replace(value: T): T | undefined {
    const replacedValue = this.peek();
    this.heap[top] = value;
    this.siftDown();
    return replacedValue;
  }
  private greater(i: number, j: number): boolean {
    return this.comparator(this.heap[i], this.heap[j]);
  }
  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
  private siftUp(): void {
    let node = this.size() - 1;
    while (node > top && this.greater(node, parent(node))) {
      this.swap(node, parent(node));
      node = parent(node);
    }
  }
  private siftDown(): void {
    let node = top;
    while (
      (left(node) < this.size() && this.greater(left(node), node)) ||
      (right(node) < this.size() && this.greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this.greater(right(node), left(node))) ? right(node) : left(node);
      this.swap(node, maxChild);
      node = maxChild;
    }
  }
}
