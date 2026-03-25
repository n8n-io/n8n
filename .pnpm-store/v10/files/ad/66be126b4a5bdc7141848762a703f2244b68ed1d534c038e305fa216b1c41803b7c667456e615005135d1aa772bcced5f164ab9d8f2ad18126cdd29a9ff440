function DoublyLinkedList() {
  this._length = 0;
  this._head = null;
  this._tail = null;
}

/**
 * Returns the length of the list.
 *
 * @returns {number}
 */
DoublyLinkedList.prototype.getLength = function () {
  return this._length;
};

/**
 * Returns the first element in the list.
 *
 * @returns {Object}
 */
DoublyLinkedList.prototype.getHead = function () {
  return this._head;
};

/**
 * Returns the last element in the list.
 *
 * @returns {Object}
 */
DoublyLinkedList.prototype.getTail = function () {
  return this._tail;
};

/**
 * Inserts a value at the end of the list.
 *
 * @param value
 *
 * @returns {Object} the node that was inserted into the list.
 */
DoublyLinkedList.prototype.insertEnd = function (value) {
  // create a node from the specified value
  const node = new Node(value, null, null);

  // if there are no element in the list yet
  if (this._length === 0) {
    this._head = node;
    this._tail = node;
  } else {
    // add the node to the end
    this._tail.setNext(node);
    node.setPrev(this._tail);
    this._tail = node;
  }

  // increment the length
  this._length++;

  // return the node that was created
  return node;
};

/**
 * Removes a given node from the list.
 *
 * @param node
 */
DoublyLinkedList.prototype.remove = function (node) {
  // if no node was specified, we have nothing to do
  if (!node) {
    return;
  }

  // if we're removing the first element in the list, adjust the head,
  // otherwise connect the node's previous to its next
  if (node.getPrev() === null) {
    this._head = node.getNext();
  } else {
    node.getPrev().setNext(node.getNext());
  }

  // if we're removing the last element in the list, adjust the tail,
  // otherwise connect the node's next to its previous
  if (node.getNext() === null) {
    this._tail = node.getPrev();
  } else {
    node.getNext().setPrev(node.getPrev());
  }

  // decrement the length
  this._length--;
};

function Node(value, prev, next) {
  this._value = value;
  this._prev = prev;
  this._next = next;
}

Node.prototype.getValue = function () {
  return this._value;
};

Node.prototype.getPrev = function () {
  return this._prev;
};

Node.prototype.setPrev = function (prev) {
  this._prev = prev;
};

Node.prototype.getNext = function () {
  return this._next;
};

Node.prototype.setNext = function (next) {
  this._next = next;
};

module.exports = DoublyLinkedList;