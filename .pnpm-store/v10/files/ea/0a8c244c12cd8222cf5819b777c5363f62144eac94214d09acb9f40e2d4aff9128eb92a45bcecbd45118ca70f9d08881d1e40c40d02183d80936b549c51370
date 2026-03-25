'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class QueueNode {
  constructor () {
    /**
     * @type {QueueNode|null}
     */
    this.next = null;
  }
}

/**
 * @template V
 */
class QueueValue extends QueueNode {
  /**
   * @param {V} v
   */
  constructor (v) {
    super();
    this.v = v;
  }
}

/**
 * @template {QueueNode} N
 */
class Queue {
  constructor () {
    /**
     * @type {N | null}
     */
    this.start = null;
    /**
     * @type {N | null}
     */
    this.end = null;
  }
}

/**
 * @note The queue implementation is experimental and unfinished.
 * Don't use this in production yet.
 *
 * @template {QueueNode} N
 * @return {Queue<N>}
 */
const create = () => new Queue();

/**
 * @param {Queue<any>} queue
 */
const isEmpty = queue => queue.start === null;

/**
 * @template {Queue<any>} Q
 * @param {Q} queue
 * @param {Q extends Queue<infer N> ? N : never} n
 */
const enqueue = (queue, n) => {
  if (queue.end !== null) {
    queue.end.next = n;
    queue.end = n;
  } else {
    queue.end = n;
    queue.start = n;
  }
};

/**
 * @template {QueueNode} N
 * @param {Queue<N>} queue
 * @return {N | null}
 */
const dequeue = queue => {
  const n = queue.start;
  if (n !== null) {
    // @ts-ignore
    queue.start = n.next;
    if (queue.start === null) {
      queue.end = null;
    }
    return n
  }
  return null
};

exports.Queue = Queue;
exports.QueueNode = QueueNode;
exports.QueueValue = QueueValue;
exports.create = create;
exports.dequeue = dequeue;
exports.enqueue = enqueue;
exports.isEmpty = isEmpty;
//# sourceMappingURL=queue.cjs.map
