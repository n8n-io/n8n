var id = 0;
function _classPrivateFieldLooseKey(name) {
  return "__private_" + id++ + "_" + name;
}
function _classPrivateFieldLooseBase(receiver, privateKey) {
  if (!Object.prototype.hasOwnProperty.call(receiver, privateKey)) {
    throw new TypeError("attempted to use private field on non-instance");
  }
  return receiver;
}

let _Symbol$iterator;
class Node {
  constructor(value) {
    this.value = value;
  }
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Queue
 * @implements Iterable<Value>
 * @template Value
 */
var _head = /*#__PURE__*/_classPrivateFieldLooseKey("head");
var _tail = /*#__PURE__*/_classPrivateFieldLooseKey("tail");
var _size = /*#__PURE__*/_classPrivateFieldLooseKey("size");
_Symbol$iterator = Symbol.iterator;
class Queue {
  constructor() {
    Object.defineProperty(this, _head, {
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, _tail, {
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, _size, {
      writable: true,
      value: void 0
    });
    this.clear();
  }

  /**
   * clear
   * @returns {void}
   */
  clear() {
    _classPrivateFieldLooseBase(this, _head)[_head] = undefined;
    _classPrivateFieldLooseBase(this, _tail)[_tail] = undefined;
    _classPrivateFieldLooseBase(this, _size)[_size] = 0;
  }

  /**
   * push
   * @param {Value} value
   * @returns {number}
   */
  push(value) {
    const node = new Node(value);
    if (_classPrivateFieldLooseBase(this, _head)[_head]) {
      _classPrivateFieldLooseBase(this, _tail)[_tail].next = node;
      _classPrivateFieldLooseBase(this, _tail)[_tail] = node;
    } else {
      _classPrivateFieldLooseBase(this, _head)[_head] = node;
      _classPrivateFieldLooseBase(this, _tail)[_tail] = node;
    }
    _classPrivateFieldLooseBase(this, _size)[_size]++;
    return _classPrivateFieldLooseBase(this, _size)[_size];
  }

  /**
   * pop
   * @returns {Value | undefined}
   */
  pop() {
    const current = _classPrivateFieldLooseBase(this, _head)[_head];
    if (!current) {
      return;
    }
    _classPrivateFieldLooseBase(this, _head)[_head] = _classPrivateFieldLooseBase(this, _head)[_head].next;
    _classPrivateFieldLooseBase(this, _size)[_size]--;
    return current.value;
  }

  /**
   * size
   * @returns {number}
   */
  get size() {
    return _classPrivateFieldLooseBase(this, _size)[_size];
  }

  /**
   * Iterator
   * @returns {IterableIterator<Value>}
   */
  *[_Symbol$iterator]() {
    let current = _classPrivateFieldLooseBase(this, _head)[_head];
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}

exports.Queue = Queue;
