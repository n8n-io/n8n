"use strict";
module.exports = Leaf;

var Node = require('./Node');
var NodeList = require('./NodeList');
var utils = require('./utils');
var HierarchyRequestError = utils.HierarchyRequestError;
var NotFoundError = utils.NotFoundError;

// This class defines common functionality for node subtypes that
// can never have children
function Leaf() {
  Node.call(this);
}

Leaf.prototype = Object.create(Node.prototype, {
  hasChildNodes: { value: function() { return false; }},
  firstChild: { value: null },
  lastChild: { value: null },
  insertBefore: { value: function(node, child) {
    if (!node.nodeType) throw new TypeError('not a node');
    HierarchyRequestError();
  }},
  replaceChild: { value: function(node, child) {
    if (!node.nodeType) throw new TypeError('not a node');
    HierarchyRequestError();
  }},
  removeChild: { value: function(node) {
    if (!node.nodeType) throw new TypeError('not a node');
    NotFoundError();
  }},
  removeChildren: { value: function() { /* no op */ }},
  childNodes: { get: function() {
    if (!this._childNodes) this._childNodes = new NodeList();
    return this._childNodes;
  }}
});
