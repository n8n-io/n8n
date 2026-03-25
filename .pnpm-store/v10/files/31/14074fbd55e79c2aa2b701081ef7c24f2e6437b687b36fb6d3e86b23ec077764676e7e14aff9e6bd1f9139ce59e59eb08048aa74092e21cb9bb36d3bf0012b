"use strict";
module.exports = Text;

var utils = require('./utils');
var Node = require('./Node');
var CharacterData = require('./CharacterData');

function Text(doc, data) {
  CharacterData.call(this);
  this.nodeType = Node.TEXT_NODE;
  this.ownerDocument = doc;
  this._data = data;
  this._index = undefined;
}

var nodeValue = {
  get: function() { return this._data; },
  set: function(v) {
    if (v === null || v === undefined) { v = ''; } else { v = String(v); }
    if (v === this._data) return;
    this._data = v;
    if (this.rooted)
      this.ownerDocument.mutateValue(this);
    if (this.parentNode &&
      this.parentNode._textchangehook)
      this.parentNode._textchangehook(this);
  }
};

Text.prototype = Object.create(CharacterData.prototype, {
  nodeName: { value: "#text" },
  // These three attributes are all the same.
  // The data attribute has a [TreatNullAs=EmptyString] but we'll
  // implement that at the interface level
  nodeValue: nodeValue,
  textContent: nodeValue,
  innerText: nodeValue,
  data: {
    get: nodeValue.get,
    set: function(v) {
      nodeValue.set.call(this, v===null ? '' : String(v));
    },
  },

  splitText: { value: function splitText(offset) {
    if (offset > this._data.length || offset < 0) utils.IndexSizeError();

    var newdata = this._data.substring(offset),
      newnode = this.ownerDocument.createTextNode(newdata);
    this.data = this.data.substring(0, offset);

    var parent = this.parentNode;
    if (parent !== null)
      parent.insertBefore(newnode, this.nextSibling);

    return newnode;
  }},

  wholeText: { get: function wholeText() {
    var result = this.textContent;
    for (var next = this.nextSibling; next; next = next.nextSibling) {
      if (next.nodeType !== Node.TEXT_NODE) { break; }
      result += next.textContent;
    }
    return result;
  }},
  // Obsolete, removed from spec.
  replaceWholeText: { value: utils.nyi },

  // Utility methods
  clone: { value: function clone() {
    return new Text(this.ownerDocument, this._data);
  }},

});
