"use strict";
module.exports = NodeIterator;

var NodeFilter = require('./NodeFilter');
var NodeTraversal = require('./NodeTraversal');
var utils = require('./utils');

/* Private methods and helpers */

/**
 * @based on WebKit's NodeIterator::moveToNext and NodeIterator::moveToPrevious
 * https://trac.webkit.org/browser/trunk/Source/WebCore/dom/NodeIterator.cpp?rev=186279#L51
 */
function move(node, stayWithin, directionIsNext) {
  if (directionIsNext) {
    return NodeTraversal.next(node, stayWithin);
  } else {
    if (node === stayWithin) {
      return null;
    }
    return NodeTraversal.previous(node, null);
  }
}

function isInclusiveAncestor(node, possibleChild) {
  for ( ; possibleChild; possibleChild = possibleChild.parentNode) {
    if (node === possibleChild) { return true; }
  }
  return false;
}

/**
 * @spec http://www.w3.org/TR/dom/#concept-nodeiterator-traverse
 * @method
 * @access private
 * @param {NodeIterator} ni
 * @param {string} direction One of 'next' or 'previous'.
 * @return {Node|null}
 */
function traverse(ni, directionIsNext) {
  var node, beforeNode;
  node = ni._referenceNode;
  beforeNode = ni._pointerBeforeReferenceNode;
  while (true) {
    if (beforeNode === directionIsNext) {
      beforeNode = !beforeNode;
    } else {
      node = move(node, ni._root, directionIsNext);
      if (node === null) {
        return null;
      }
    }
    var result = ni._internalFilter(node);
    if (result === NodeFilter.FILTER_ACCEPT) {
      break;
    }
  }
  ni._referenceNode = node;
  ni._pointerBeforeReferenceNode = beforeNode;
  return node;
}

/* Public API */

/**
 * Implemented version: http://www.w3.org/TR/2015/WD-dom-20150618/#nodeiterator
 * Latest version: http://www.w3.org/TR/dom/#nodeiterator
 *
 * @constructor
 * @param {Node} root
 * @param {number} whatToShow [optional]
 * @param {Function|NodeFilter} filter [optional]
 * @throws Error
 */
function NodeIterator(root, whatToShow, filter) {
  if (!root || !root.nodeType) {
    utils.NotSupportedError();
  }

  // Read-only properties
  this._root = root;
  this._referenceNode = root;
  this._pointerBeforeReferenceNode = true;
  this._whatToShow = Number(whatToShow) || 0;
  this._filter = filter || null;
  this._active = false;
  // Record active node iterators in the document, in order to perform
  // "node iterator pre-removal steps".
  root.doc._attachNodeIterator(this);
}

Object.defineProperties(NodeIterator.prototype, {
  root: { get: function root() {
    return this._root;
  } },
  referenceNode: { get: function referenceNode() {
    return this._referenceNode;
  } },
  pointerBeforeReferenceNode: { get: function pointerBeforeReferenceNode() {
    return this._pointerBeforeReferenceNode;
  } },
  whatToShow: { get: function whatToShow() {
    return this._whatToShow;
  } },
  filter: { get: function filter() {
    return this._filter;
  } },

  /**
   * @method
   * @param {Node} node
   * @return {Number} Constant NodeFilter.FILTER_ACCEPT,
   *  NodeFilter.FILTER_REJECT or NodeFilter.FILTER_SKIP.
   */
  _internalFilter: { value: function _internalFilter(node) {
    /* jshint bitwise: false */
    var result, filter;
    if (this._active) {
      utils.InvalidStateError();
    }

    // Maps nodeType to whatToShow
    if (!(((1 << (node.nodeType - 1)) & this._whatToShow))) {
      return NodeFilter.FILTER_SKIP;
    }

    filter = this._filter;
    if (filter === null) {
      result = NodeFilter.FILTER_ACCEPT;
    } else {
      this._active = true;
      try {
        if (typeof filter === 'function') {
          result = filter(node);
        } else {
          result = filter.acceptNode(node);
        }
      } finally {
        this._active = false;
      }
    }

    // Note that coercing to a number means that
    //  `true` becomes `1` (which is NodeFilter.FILTER_ACCEPT)
    //  `false` becomes `0` (neither accept, reject, or skip)
    return (+result);
  } },

  /**
   * @spec https://dom.spec.whatwg.org/#nodeiterator-pre-removing-steps
   * @method
   * @return void
   */
  _preremove: { value: function _preremove(toBeRemovedNode) {
    if (isInclusiveAncestor(toBeRemovedNode, this._root)) { return; }
    if (!isInclusiveAncestor(toBeRemovedNode, this._referenceNode)) { return; }
    if (this._pointerBeforeReferenceNode) {
      var next = toBeRemovedNode;
      while (next.lastChild) {
        next = next.lastChild;
      }
      next = NodeTraversal.next(next, this.root);
      if (next) {
        this._referenceNode = next;
        return;
      }
      this._pointerBeforeReferenceNode = false;
      // fall through
    }
    if (toBeRemovedNode.previousSibling === null) {
      this._referenceNode = toBeRemovedNode.parentNode;
    } else {
      this._referenceNode = toBeRemovedNode.previousSibling;
      var lastChild;
      for (lastChild = this._referenceNode.lastChild;
           lastChild;
           lastChild = this._referenceNode.lastChild) {
        this._referenceNode = lastChild;
      }
    }
  } },

  /**
   * @spec http://www.w3.org/TR/dom/#dom-nodeiterator-nextnode
   * @method
   * @return {Node|null}
   */
  nextNode: { value: function nextNode() {
    return traverse(this, true);
  } },

  /**
   * @spec http://www.w3.org/TR/dom/#dom-nodeiterator-previousnode
   * @method
   * @return {Node|null}
   */
  previousNode: { value: function previousNode() {
    return traverse(this, false);
  } },

  /**
   * @spec http://www.w3.org/TR/dom/#dom-nodeiterator-detach
   * @method
   * @return void
   */
  detach: { value: function detach() {
    /* "The detach() method must do nothing.
     * Its functionality (disabling a NodeIterator object) was removed,
     * but the method itself is preserved for compatibility.
     */
  } },

  /** For compatibility with web-platform-tests. */
  toString: { value: function toString() {
    return "[object NodeIterator]";
  } },
});
