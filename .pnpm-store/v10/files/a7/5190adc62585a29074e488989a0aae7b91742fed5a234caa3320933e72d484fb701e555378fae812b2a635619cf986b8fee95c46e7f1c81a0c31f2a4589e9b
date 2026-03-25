"use strict";
module.exports = TreeWalker;

var Node = require('./Node');
var NodeFilter = require('./NodeFilter');
var NodeTraversal = require('./NodeTraversal');
var utils = require('./utils');

var mapChild = {
  first: 'firstChild',
  last: 'lastChild',
  next: 'firstChild',
  previous: 'lastChild'
};

var mapSibling = {
  first: 'nextSibling',
  last: 'previousSibling',
  next: 'nextSibling',
  previous: 'previousSibling'
};

/* Private methods and helpers */

/**
 * @spec https://dom.spec.whatwg.org/#concept-traverse-children
 * @method
 * @access private
 * @param {TreeWalker} tw
 * @param {string} type One of 'first' or 'last'.
 * @return {Node|null}
 */
function traverseChildren(tw, type) {
  var child, node, parent, result, sibling;
  node = tw._currentNode[mapChild[type]];
  while (node !== null) {
    result = tw._internalFilter(node);
    if (result === NodeFilter.FILTER_ACCEPT) {
      tw._currentNode = node;
      return node;
    }
    if (result === NodeFilter.FILTER_SKIP) {
      child = node[mapChild[type]];
      if (child !== null) {
        node = child;
        continue;
      }
    }
    while (node !== null) {
      sibling = node[mapSibling[type]];
      if (sibling !== null) {
        node = sibling;
        break;
      }
      parent = node.parentNode;
      if (parent === null || parent === tw.root || parent === tw._currentNode) {
        return null;
      } else {
        node = parent;
      }
    }
  }
  return null;
}

/**
 * @spec https://dom.spec.whatwg.org/#concept-traverse-siblings
 * @method
 * @access private
 * @param {TreeWalker} tw
 * @param {TreeWalker} type One of 'next' or 'previous'.
 * @return {Node|nul}
 */
function traverseSiblings(tw, type) {
  var node, result, sibling;
  node = tw._currentNode;
  if (node === tw.root) {
    return null;
  }
  while (true) {
    sibling = node[mapSibling[type]];
    while (sibling !== null) {
      node = sibling;
      result = tw._internalFilter(node);
      if (result === NodeFilter.FILTER_ACCEPT) {
        tw._currentNode = node;
        return node;
      }
      sibling = node[mapChild[type]];
      if (result === NodeFilter.FILTER_REJECT || sibling === null) {
        sibling = node[mapSibling[type]];
      }
    }
    node = node.parentNode;
    if (node === null || node === tw.root) {
      return null;
    }
    if (tw._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
      return null;
    }
  }
}


/* Public API */

/**
 * Latest version: https://dom.spec.whatwg.org/#treewalker
 *
 * @constructor
 * @param {Node} root
 * @param {number} whatToShow [optional]
 * @param {Function|NodeFilter} filter [optional]
 * @throws Error
 */
function TreeWalker(root, whatToShow, filter) {
  if (!root || !root.nodeType) {
    utils.NotSupportedError();
  }

  // Read-only properties
  this._root = root;
  this._whatToShow = Number(whatToShow) || 0;
  this._filter = filter || null;
  this._active = false;
  // Read-write property
  this._currentNode = root;
}

Object.defineProperties(TreeWalker.prototype, {
  root: { get: function() { return this._root; } },
  whatToShow: { get: function() { return this._whatToShow; } },
  filter: { get: function() { return this._filter; } },

  currentNode: {
    get: function currentNode() {
      return this._currentNode;
    },
    set: function setCurrentNode(v) {
      if (!(v instanceof Node)) {
        throw new TypeError("Not a Node"); // `null` is also not a node
      }
      this._currentNode = v;
    },
  },

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
  }},

  /**
   * @spec https://dom.spec.whatwg.org/#dom-treewalker-parentnode
   * @based on WebKit's TreeWalker::parentNode
   * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/dom/TreeWalker.cpp?rev=220453#L50
   * @method
   * @return {Node|null}
   */
  parentNode: { value: function parentNode() {
    var node = this._currentNode;
    while (node !== this.root) {
      node = node.parentNode;
      if (node === null) {
        return null;
      }
      if (this._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
        this._currentNode = node;
        return node;
      }
    }
    return null;
  }},

  /**
   * @spec https://dom.spec.whatwg.org/#dom-treewalker-firstchild
   * @method
   * @return {Node|null}
   */
  firstChild: { value: function firstChild() {
    return traverseChildren(this, 'first');
  }},

  /**
   * @spec https://dom.spec.whatwg.org/#dom-treewalker-lastchild
   * @method
   * @return {Node|null}
   */
  lastChild: { value: function lastChild() {
    return traverseChildren(this, 'last');
  }},

  /**
   * @spec http://www.w3.org/TR/dom/#dom-treewalker-previoussibling
   * @method
   * @return {Node|null}
   */
  previousSibling: { value: function previousSibling() {
    return traverseSiblings(this, 'previous');
  }},

  /**
   * @spec http://www.w3.org/TR/dom/#dom-treewalker-nextsibling
   * @method
   * @return {Node|null}
   */
  nextSibling: { value: function nextSibling() {
    return traverseSiblings(this, 'next');
  }},

  /**
   * @spec https://dom.spec.whatwg.org/#dom-treewalker-previousnode
   * @based on WebKit's TreeWalker::previousNode
   * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/dom/TreeWalker.cpp?rev=220453#L181
   * @method
   * @return {Node|null}
   */
  previousNode: { value: function previousNode() {
    var node, result, previousSibling, lastChild;
    node = this._currentNode;
    while (node !== this._root) {
      for (previousSibling = node.previousSibling;
           previousSibling;
           previousSibling = node.previousSibling) {
        node = previousSibling;
        result = this._internalFilter(node);
        if (result === NodeFilter.FILTER_REJECT) {
          continue;
        }
        for (lastChild = node.lastChild;
             lastChild;
             lastChild = node.lastChild) {
          node = lastChild;
          result = this._internalFilter(node);
          if (result === NodeFilter.FILTER_REJECT) {
            break;
          }
        }
        if (result === NodeFilter.FILTER_ACCEPT) {
          this._currentNode = node;
          return node;
        }
      }
      if (node === this.root || node.parentNode === null) {
        return null;
      }
      node = node.parentNode;
      if (this._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
        this._currentNode = node;
        return node;
      }
    }
    return null;
  }},

  /**
   * @spec https://dom.spec.whatwg.org/#dom-treewalker-nextnode
   * @based on WebKit's TreeWalker::nextNode
   * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/dom/TreeWalker.cpp?rev=220453#L228
   * @method
   * @return {Node|null}
   */
  nextNode: { value: function nextNode() {
    var node, result, firstChild, nextSibling;
    node = this._currentNode;
    result = NodeFilter.FILTER_ACCEPT;

    CHILDREN:
    while (true) {
      for (firstChild = node.firstChild;
           firstChild;
           firstChild = node.firstChild) {
        node = firstChild;
        result = this._internalFilter(node);
        if (result === NodeFilter.FILTER_ACCEPT) {
          this._currentNode = node;
          return node;
        } else if (result === NodeFilter.FILTER_REJECT) {
          break;
        }
      }
      for (nextSibling = NodeTraversal.nextSkippingChildren(node, this.root);
           nextSibling;
           nextSibling = NodeTraversal.nextSkippingChildren(node, this.root)) {
        node = nextSibling;
        result = this._internalFilter(node);
        if (result === NodeFilter.FILTER_ACCEPT) {
          this._currentNode = node;
          return node;
        } else if (result === NodeFilter.FILTER_SKIP) {
          continue CHILDREN;
        }
      }
      return null;
    }
  }},

  /** For compatibility with web-platform-tests. */
  toString: { value: function toString() {
    return "[object TreeWalker]";
  }},
});
