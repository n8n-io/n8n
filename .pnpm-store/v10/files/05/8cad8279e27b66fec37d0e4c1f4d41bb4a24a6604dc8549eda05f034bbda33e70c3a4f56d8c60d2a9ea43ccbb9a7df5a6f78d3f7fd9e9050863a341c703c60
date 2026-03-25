"use strict";

var Node = require('./Node');
var LinkedList = require('./LinkedList');

var createDocumentFragmentFromArguments = function(document, args) {
  var docFrag = document.createDocumentFragment();

  for (var i=0; i<args.length; i++) {
    var argItem = args[i];
    var isNode = argItem instanceof Node;
    docFrag.appendChild(isNode ? argItem :
                        document.createTextNode(String(argItem)));
  }

  return docFrag;
};

// The ChildNode interface contains methods that are particular to `Node`
// objects that can have a parent.  It is implemented by `Element`,
// `DocumentType`, and `CharacterData` objects.
var ChildNode = {

  // Inserts a set of Node or String objects in the children list of this
  // ChildNode's parent, just after this ChildNode.  String objects are
  // inserted as the equivalent Text nodes.
  after: { value: function after() {
    var argArr = Array.prototype.slice.call(arguments);
    var parentNode = this.parentNode, nextSibling = this.nextSibling;
    if (parentNode === null) { return; }
    // Find "viable next sibling"; that is, next one not in argArr
    while (nextSibling && argArr.some(function(v) { return v===nextSibling; }))
      nextSibling = nextSibling.nextSibling;
    // ok, parent and sibling are saved away since this node could itself
    // appear in argArr and we're about to move argArr to a document fragment.
    var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);

    parentNode.insertBefore(docFrag, nextSibling);
  }},

  // Inserts a set of Node or String objects in the children list of this
  // ChildNode's parent, just before this ChildNode.  String objects are
  // inserted as the equivalent Text nodes.
  before: { value: function before() {
    var argArr = Array.prototype.slice.call(arguments);
    var parentNode = this.parentNode, prevSibling = this.previousSibling;
    if (parentNode === null) { return; }
    // Find "viable prev sibling"; that is, prev one not in argArr
    while (prevSibling && argArr.some(function(v) { return v===prevSibling; }))
      prevSibling = prevSibling.previousSibling;
    // ok, parent and sibling are saved away since this node could itself
    // appear in argArr and we're about to move argArr to a document fragment.
    var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);

    var nextSibling =
        prevSibling ? prevSibling.nextSibling : parentNode.firstChild;
    parentNode.insertBefore(docFrag, nextSibling);
  }},

  // Remove this node from its parent
  remove: { value: function remove() {
    if (this.parentNode === null) return;

    // Send mutation events if necessary
    if (this.doc) {
      this.doc._preremoveNodeIterators(this);
      if (this.rooted) {
        this.doc.mutateRemove(this);
      }
    }

    // Remove this node from its parents array of children
    // and update the structure id for all ancestors
    this._remove();

    // Forget this node's parent
    this.parentNode = null;
  }},

  // Remove this node w/o uprooting or sending mutation events
  // (But do update the structure id for all ancestors)
  _remove: { value: function _remove() {
    var parent = this.parentNode;
    if (parent === null) return;
    if (parent._childNodes) {
      parent._childNodes.splice(this.index, 1);
    } else if (parent._firstChild === this) {
      if (this._nextSibling === this) {
        parent._firstChild = null;
      } else {
        parent._firstChild = this._nextSibling;
      }
    }
    LinkedList.remove(this);
    parent.modify();
  }},

  // Replace this node with the nodes or strings provided as arguments.
  replaceWith: { value: function replaceWith() {
    var argArr = Array.prototype.slice.call(arguments);
    var parentNode = this.parentNode, nextSibling = this.nextSibling;
    if (parentNode === null) { return; }
    // Find "viable next sibling"; that is, next one not in argArr
    while (nextSibling && argArr.some(function(v) { return v===nextSibling; }))
      nextSibling = nextSibling.nextSibling;
    // ok, parent and sibling are saved away since this node could itself
    // appear in argArr and we're about to move argArr to a document fragment.
    var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
    if (this.parentNode === parentNode) {
      parentNode.replaceChild(docFrag, this);
    } else {
      // `this` was inserted into docFrag
      parentNode.insertBefore(docFrag, nextSibling);
    }
  }},

};

module.exports = ChildNode;
