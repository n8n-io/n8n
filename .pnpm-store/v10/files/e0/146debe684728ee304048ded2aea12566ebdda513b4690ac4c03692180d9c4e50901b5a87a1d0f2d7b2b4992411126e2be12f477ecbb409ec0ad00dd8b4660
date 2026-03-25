"use strict";
module.exports = ProcessingInstruction;

var Node = require('./Node');
var CharacterData = require('./CharacterData');

function ProcessingInstruction(doc, target, data) {
  CharacterData.call(this);
  this.nodeType = Node.PROCESSING_INSTRUCTION_NODE;
  this.ownerDocument = doc;
  this.target = target;
  this._data = data;
}

var nodeValue = {
  get: function() { return this._data; },
  set: function(v) {
    if (v === null || v === undefined) { v = ''; } else { v = String(v); }
    this._data = v;
    if (this.rooted) this.ownerDocument.mutateValue(this);
  }
};

ProcessingInstruction.prototype = Object.create(CharacterData.prototype, {
  nodeName: { get: function() { return this.target; }},
  nodeValue: nodeValue,
  textContent: nodeValue,
  innerText: nodeValue,
  data: {
    get: nodeValue.get,
    set: function(v) {
      nodeValue.set.call(this, v===null ? '' : String(v));
    },
  },

  // Utility methods
  clone: { value: function clone() {
      return new ProcessingInstruction(this.ownerDocument, this.target, this._data);
  }},
  isEqual: { value: function isEqual(n) {
      return this.target === n.target && this._data === n._data;
  }}

});
