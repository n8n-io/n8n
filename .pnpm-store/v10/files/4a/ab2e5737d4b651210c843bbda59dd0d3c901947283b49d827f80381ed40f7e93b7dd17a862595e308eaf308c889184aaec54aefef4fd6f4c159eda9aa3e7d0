'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * First-in, First-out task queue that manages a dedicated pool
 * for each worker as well as a shared queue. The FIFO ordering is guaranteed
 * across the worker specific and shared queue.
 */
class FifoQueue {
  _workerQueues = [];
  _sharedQueue = new InternalQueue();
  enqueue(task, workerId) {
    if (workerId == null) {
      this._sharedQueue.enqueue(task);
      return;
    }
    let workerQueue = this._workerQueues[workerId];
    if (workerQueue == null) {
      workerQueue = this._workerQueues[workerId] = new InternalQueue();
    }
    const sharedTop = this._sharedQueue.peekLast();
    const item = {
      previousSharedTask: sharedTop,
      task
    };
    workerQueue.enqueue(item);
  }
  dequeue(workerId) {
    const workerTop = this._workerQueues[workerId]?.peek();
    const sharedTaskIsProcessed =
      workerTop?.previousSharedTask?.request[1] ?? true;

    // Process the top task from the shared queue if
    // - there's no task in the worker specific queue or
    // - if the non-worker-specific task after which this worker specific task
    //   has been queued wasn't processed yet
    if (workerTop != null && sharedTaskIsProcessed) {
      return this._workerQueues[workerId]?.dequeue()?.task ?? null;
    }
    return this._sharedQueue.dequeue();
  }
}
exports.default = FifoQueue;
/**
 * FIFO queue for a single worker / shared queue.
 */
class InternalQueue {
  _head = null;
  _last = null;
  enqueue(value) {
    const item = {
      next: null,
      value
    };
    if (this._last == null) {
      this._head = item;
    } else {
      this._last.next = item;
    }
    this._last = item;
  }
  dequeue() {
    if (this._head == null) {
      return null;
    }
    const item = this._head;
    this._head = item.next;
    if (this._head == null) {
      this._last = null;
    }
    return item.value;
  }
  peek() {
    return this._head?.value ?? null;
  }
  peekLast() {
    return this._last?.value ?? null;
  }
}
