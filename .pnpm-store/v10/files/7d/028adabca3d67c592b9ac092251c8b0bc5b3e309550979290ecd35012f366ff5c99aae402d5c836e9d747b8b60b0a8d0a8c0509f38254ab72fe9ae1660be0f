"use strict";

const Queue = require("./Queue");

/**
 * @class
 * @private
 */
class PriorityQueue {
  constructor(size) {
    this._size = Math.max(+size | 0, 1);
    /** @type {Queue[]} */
    this._slots = [];
    // initialize arrays to hold queue elements
    for (let i = 0; i < this._size; i++) {
      this._slots.push(new Queue());
    }
  }

  get length() {
    let _length = 0;
    for (let i = 0, slots = this._slots.length; i < slots; i++) {
      _length += this._slots[i].length;
    }
    return _length;
  }

  enqueue(obj, priority) {
    // Convert to integer with a default value of 0.
    priority = (priority && +priority | 0) || 0;

    if (priority) {
      if (priority < 0 || priority >= this._size) {
        priority = this._size - 1;
        // put obj at the end of the line
      }
    }
    this._slots[priority].push(obj);
  }

  dequeue() {
    for (let i = 0, sl = this._slots.length; i < sl; i += 1) {
      if (this._slots[i].length) {
        return this._slots[i].shift();
      }
    }
    return;
  }

  get head() {
    for (let i = 0, sl = this._slots.length; i < sl; i += 1) {
      if (this._slots[i].length > 0) {
        return this._slots[i].head;
      }
    }
    return;
  }

  get tail() {
    for (let i = this._slots.length - 1; i >= 0; i--) {
      if (this._slots[i].length > 0) {
        return this._slots[i].tail;
      }
    }
    return;
  }
}

module.exports = PriorityQueue;
