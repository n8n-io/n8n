"use strict";

const DoublyLinkedList = require("./DoublyLinkedList");
const Deque = require("./Deque");

/**
 * Sort of a internal queue for holding the waiting
 * resource requets for a given "priority".
 * Also handles managing timeouts rejections on items (is this the best place for this?)
 * This is the last point where we know which queue a resourceRequest is in
 *
 */
class Queue extends Deque {
  /**
   * Adds the obj to the end of the list for this slot
   * we completely override the parent method because we need access to the
   * node for our rejection handler
   * @param {any} resourceRequest [description]
   */
  push(resourceRequest) {
    const node = DoublyLinkedList.createNode(resourceRequest);
    resourceRequest.promise.catch(this._createTimeoutRejectionHandler(node));
    this._list.insertEnd(node);
  }

  _createTimeoutRejectionHandler(node) {
    return reason => {
      if (reason.name === "TimeoutError") {
        this._list.remove(node);
      }
    };
  }
}

module.exports = Queue;
