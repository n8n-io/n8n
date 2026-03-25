"use strict";

/**
 * A Doubly Linked List, because there aren't enough in the world...
 * this is pretty much a direct JS port of the one wikipedia
 * https://en.wikipedia.org/wiki/Doubly_linked_list
 *
 * For most usage 'insertBeginning' and 'insertEnd' should be enough
 *
 * nodes are expected to something like a POJSO like
 * {
 *   prev: null,
 *   next: null,
 *   something: 'whatever you like'
 * }
 */
class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  insertBeginning(node) {
    if (this.head === null) {
      this.head = node;
      this.tail = node;
      node.prev = null;
      node.next = null;
      this.length++;
    } else {
      this.insertBefore(this.head, node);
    }
  }

  insertEnd(node) {
    if (this.tail === null) {
      this.insertBeginning(node);
    } else {
      this.insertAfter(this.tail, node);
    }
  }

  insertAfter(node, newNode) {
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next === null) {
      this.tail = newNode;
    } else {
      node.next.prev = newNode;
    }
    node.next = newNode;
    this.length++;
  }

  insertBefore(node, newNode) {
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev === null) {
      this.head = newNode;
    } else {
      node.prev.next = newNode;
    }
    node.prev = newNode;
    this.length++;
  }

  remove(node) {
    if (node.prev === null) {
      this.head = node.next;
    } else {
      node.prev.next = node.next;
    }
    if (node.next === null) {
      this.tail = node.prev;
    } else {
      node.next.prev = node.prev;
    }
    node.prev = null;
    node.next = null;
    this.length--;
  }

  // FIXME: this should not live here and has become a dumping ground...
  static createNode(data) {
    return {
      prev: null,
      next: null,
      data: data
    };
  }
}

module.exports = DoublyLinkedList;
