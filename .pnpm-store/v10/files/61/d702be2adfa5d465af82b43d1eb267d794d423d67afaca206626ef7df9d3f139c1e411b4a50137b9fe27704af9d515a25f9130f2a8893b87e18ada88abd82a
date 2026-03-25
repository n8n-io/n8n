export class QueueNode {
  constructor () {
    /**
     * @type {QueueNode|null}
     */
    this.next = null
  }
}

/**
 * @template V
 */
export class QueueValue extends QueueNode {
  /**
   * @param {V} v
   */
  constructor (v) {
    super()
    this.v = v
  }
}

/**
 * @template {QueueNode} N
 */
export class Queue {
  constructor () {
    /**
     * @type {N | null}
     */
    this.start = null
    /**
     * @type {N | null}
     */
    this.end = null
  }
}

/**
 * @note The queue implementation is experimental and unfinished.
 * Don't use this in production yet.
 *
 * @template {QueueNode} N
 * @return {Queue<N>}
 */
export const create = () => new Queue()

/**
 * @param {Queue<any>} queue
 */
export const isEmpty = queue => queue.start === null

/**
 * @template {Queue<any>} Q
 * @param {Q} queue
 * @param {Q extends Queue<infer N> ? N : never} n
 */
export const enqueue = (queue, n) => {
  if (queue.end !== null) {
    queue.end.next = n
    queue.end = n
  } else {
    queue.end = n
    queue.start = n
  }
}

/**
 * @template {QueueNode} N
 * @param {Queue<N>} queue
 * @return {N | null}
 */
export const dequeue = queue => {
  const n = queue.start
  if (n !== null) {
    // @ts-ignore
    queue.start = n.next
    if (queue.start === null) {
      queue.end = null
    }
    return n
  }
  return null
}
