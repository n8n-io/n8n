"use strict";
module.exports = DocumentType;

var Node = require('./Node');
var Leaf = require('./Leaf');
var ChildNode = require('./ChildNode');

function DocumentType(ownerDocument, name, publicId, systemId) {
  Leaf.call(this);
  this.nodeType = Node.DOCUMENT_TYPE_NODE;
  this.ownerDocument = ownerDocument || null;
  this.name = name;
  this.publicId = publicId || "";
  this.systemId = systemId || "";
}

DocumentType.prototype = Object.create(Leaf.prototype, {
  nodeName: { get: function() { return this.name; }},
  nodeValue: {
    get: function() { return null; },
    set: function() {}
  },

  // Utility methods
  clone: { value: function clone() {
    return new DocumentType(this.ownerDocument, this.name, this.publicId, this.systemId);
  }},

  isEqual: { value: function isEqual(n) {
    return this.name === n.name &&
      this.publicId === n.publicId &&
      this.systemId === n.systemId;
  }}
});

Object.defineProperties(DocumentType.prototype, ChildNode);
