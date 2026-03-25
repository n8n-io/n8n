"use strict";

/**
 * Creates an interator for a DoublyLinkedList starting at the given node
 * It's internal cursor will remains relative to the last "iterated" node as that
 * node moves through the list until it either iterates to the end of the list,
 * or the the node it's tracking is removed from the list. Until the first 'next'
 * call it tracks the head/tail of the linked list. This means that one can create
 * an iterator on an empty list, then add nodes, and then the iterator will follow
 * those nodes. Because the DoublyLinkedList nodes don't track their owning "list" and
 * it's highly inefficient to walk the list for every iteration, the iterator won't know
 * if the node has been detached from one List and added to another list, or if the iterator
 *
 * The created object is an es6 compatible iterator
 */
class DoublyLinkedListIterator {
  /**
   * @param  {Object} doublyLinkedList     a node that is part of a doublyLinkedList
   * @param  {Boolean} [reverse=false]     is this a reverse iterator? default: false
   */
  constructor(doublyLinkedList, reverse) {
    this._list = doublyLinkedList;
    // NOTE: these key names are tied to the DoublyLinkedListIterator
    this._direction = reverse === true ? "prev" : "next";
    this._startPosition = reverse === true ? "tail" : "head";
    this._started = false;
    this._cursor = null;
    this._done = false;
  }

  _start() {
    this._cursor = this._list[this._startPosition];
    this._started = true;
  }

  _advanceCursor() {
    if (this._started === false) {
      this._started = true;
      this._cursor = this._list[this._startPosition];
      return;
    }
    this._cursor = this._cursor[this._direction];
  }

  reset() {
    this._done = false;
    this._started = false;
    this._cursor = null;
  }

  remove() {
    if (
      this._started === false ||
      this._done === true ||
      this._isCursorDetached()
    ) {
      return false;
    }
    this._list.remove(this._cursor);
  }

  next() {
    if (this._done === true) {
      return { done: true };
    }

    this._advanceCursor();

    // if there is no node at the cursor or the node at the cursor is no longer part of
    // a doubly linked list then we are done/finished/kaput
    if (this._cursor === null || this._isCursorDetached()) {
      this._done = true;
      return { done: true };
    }

    return {
      value: this._cursor,
      done: false
    };
  }

  /**
   * Is the node detached from a list?
   * NOTE: you can trick/bypass/confuse this check by removing a node from one DoublyLinkedList
   * and adding it to another.
   * TODO: We can make this smarter by checking the direction of travel and only checking
   * the required next/prev/head/tail rather than all of them
   * @return {Boolean}      [description]
   */
  _isCursorDetached() {
    return (
      this._cursor.prev === null &&
      this._cursor.next === null &&
      this._list.tail !== this._cursor &&
      this._list.head !== this._cursor
    );
  }
}

module.exports = DoublyLinkedListIterator;
