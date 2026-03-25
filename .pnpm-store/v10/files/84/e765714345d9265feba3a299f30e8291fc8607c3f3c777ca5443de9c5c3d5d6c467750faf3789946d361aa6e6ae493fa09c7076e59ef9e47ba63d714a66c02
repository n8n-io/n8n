'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var _function = require('./function-314580f7.cjs');
var error = require('./error-0c1f634f.cjs');
var equality = require('./equality.cjs');
require('./array-78849c95.cjs');
require('./set-5b47859e.cjs');
require('./object-c0c9435b.cjs');

class ListNode {
  constructor () {
    /**
     * @type {this|null}
     */
    this.next = null;
    /**
     * @type {this|null}
     */
    this.prev = null;
  }
}

/**
 * @template {ListNode} N
 */
class List {
  constructor () {
    /**
     * @type {N | null}
     */
    this.start = null;
    /**
     * @type {N | null}
     */
    this.end = null;
    this.len = 0;
  }

  * [Symbol.iterator] () {
    let n = this.start;
    while (n) {
      yield n;
      n = n.next;
    }
  }

  toArray () {
    return map(this, _function.id)
  }

  /**
   * @param {function(N):any} f
   */
  forEach (f) {
    forEach(this, f);
  }

  /**
   * @template M
   * @param {function(N):M} f
   * @return {Array<M>}
   */
  map (f) {
    return map(this, f)
  }

  /**
   * @param {List<any>} other
   */
  [equality.EqualityTraitSymbol] (other) {
    let n = this.start;
    let m = other.start;
    while (n && m) {
      if (!equality.equals(n, m)) return false
      n = n.next;
      m = m.next;
    }
    return n === m // only true iff n == null && m == null
  }
}

/**
 * @note The queue implementation is experimental and unfinished.
 * Don't use this in production yet.
 *
 * @template {ListNode} N
 *
 * @return {List<N>}
 */
const create = () => new List();

/**
 * @template {ListNode} N
 *
 * @param {List<N>} queue
 */
const isEmpty = queue => queue.start === null;

/**
 * Remove a single node from the queue. Only works with Queues that operate on Doubly-linked lists of nodes.
 *
 * @template {ListNode} N
 *
 * @param {List<N>} list
 * @param {N} node
 */
const remove = (list, node) => {
  const prev = node.prev;
  const next = node.next;
  if (prev) {
    prev.next = next;
  } else {
    list.start = next;
  }
  if (next) {
    next.prev = prev;
  } else {
    list.end = prev;
  }
  list.len--;
  return node
};

/**
 * @deprecated @todo remove in next major release
 */
const removeNode = remove;

/**
 * @template {ListNode} N
 *
 * @param {List<N>} queue
 * @param {N| null} left
 * @param {N| null} right
 * @param {N} node
 */
const insertBetween = (queue, left, right, node) => {
  /* c8 ignore start */
  if (left != null && left.next !== right) {
    throw error.unexpectedCase()
  }
  /* c8 ignore stop */
  if (left) {
    left.next = node;
  } else {
    queue.start = node;
  }
  if (right) {
    right.prev = node;
  } else {
    queue.end = node;
  }
  node.prev = left;
  node.next = right;
  queue.len++;
};

/**
 * Remove a single node from the queue. Only works with Queues that operate on Doubly-linked lists of nodes.
 *
 * @template {ListNode} N
 *
 * @param {List<N>} queue
 * @param {N} node
 * @param {N} newNode
 */
const replace = (queue, node, newNode) => {
  insertBetween(queue, node, node.next, newNode);
  remove(queue, node);
};

/**
 * @template {ListNode} N
 *
 * @param {List<N>} queue
 * @param {N} n
 */
const pushEnd = (queue, n) =>
  insertBetween(queue, queue.end, null, n);

/**
 * @template {ListNode} N
 *
 * @param {List<N>} queue
 * @param {N} n
 */
const pushFront = (queue, n) =>
  insertBetween(queue, null, queue.start, n);

/**
 * @template {ListNode} N
 *
 * @param {List<N>} list
 * @return {N| null}
 */
const popFront = list =>
  list.start ? removeNode(list, list.start) : null;

/**
 * @template {ListNode} N
 *
 * @param {List<N>} list
 * @return {N| null}
 */
const popEnd = list =>
  list.end ? removeNode(list, list.end) : null;

/**
 * @template {ListNode} N
 * @template M
 *
 * @param {List<N>} list
 * @param {function(N):M} f
 * @return {Array<M>}
 */
const map = (list, f) => {
  /**
   * @type {Array<M>}
   */
  const arr = [];
  let n = list.start;
  while (n) {
    arr.push(f(n));
    n = n.next;
  }
  return arr
};

/**
 * @template {ListNode} N
 *
 * @param {List<N>} list
 */
const toArray = list => map(list, _function.id);

/**
 * @template {ListNode} N
 * @param {List<N>} list
 * @param {function(N):any} f
 */
const forEach = (list, f) => {
  let n = list.start;
  while (n) {
    f(n);
    n = n.next;
  }
};

exports.List = List;
exports.ListNode = ListNode;
exports.create = create;
exports.forEach = forEach;
exports.insertBetween = insertBetween;
exports.isEmpty = isEmpty;
exports.map = map;
exports.popEnd = popEnd;
exports.popFront = popFront;
exports.pushEnd = pushEnd;
exports.pushFront = pushFront;
exports.remove = remove;
exports.removeNode = removeNode;
exports.replace = replace;
exports.toArray = toArray;
//# sourceMappingURL=list.cjs.map
