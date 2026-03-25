"use strict";
module.exports = ContainerNode;

var Node = require('./Node');
var NodeList = require('./NodeList');

// This class defines common functionality for node subtypes that
// can have children

function ContainerNode() {
  Node.call(this);
  this._firstChild = this._childNodes = null;
}

// Primary representation is a circular linked list of siblings
ContainerNode.prototype = Object.create(Node.prototype, {

  hasChildNodes: { value: function() {
    if (this._childNodes) {
      return this._childNodes.length > 0;
    }
    return this._firstChild !== null;
  }},

  childNodes: { get: function() {
    this._ensureChildNodes();
    return this._childNodes;
  }},

  firstChild: { get: function() {
    if (this._childNodes) {
      return this._childNodes.length === 0 ? null : this._childNodes[0];
    }
    return this._firstChild;
  }},

  lastChild: { get: function() {
    var kids = this._childNodes, first;
    if (kids) {
      return kids.length === 0 ? null: kids[kids.length-1];
    }
    first = this._firstChild;
    if (first === null) { return null; }
    return first._previousSibling; // circular linked list
  }},

  _ensureChildNodes: { value: function() {
    if (this._childNodes) { return; }
    var first = this._firstChild,
        kid = first,
        childNodes = this._childNodes = new NodeList();
    if (first) do {
      childNodes.push(kid);
      kid = kid._nextSibling;
    } while (kid !== first); // circular linked list
    this._firstChild = null; // free memory
  }},

  // Remove all of this node's children.  This is a minor
  // optimization that only calls modify() once.
  removeChildren: { value: function removeChildren() {
    var root = this.rooted ? this.ownerDocument : null,
        next = this.firstChild,
        kid;
    while (next !== null) {
      kid = next;
      next = kid.nextSibling;

      if (root) root.mutateRemove(kid);
      kid.parentNode = null;
    }
    if (this._childNodes) {
      this._childNodes.length = 0;
    } else {
      this._firstChild = null;
    }
    this.modify(); // Update last modified type once only
  }},

});
