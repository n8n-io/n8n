"use strict";

const DoublyLinkedListIterator = require("./DoublyLinkedListIterator");
/**
 * Thin wrapper around an underlying DDL iterator
 */
class DequeIterator extends DoublyLinkedListIterator {
  next() {
    const result = super.next();

    // unwrap the node...
    if (result.value) {
      result.value = result.value.data;
    }

    return result;
  }
}

module.exports = DequeIterator;
