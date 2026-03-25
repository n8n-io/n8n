"use strict";
module.exports = Comment;

var Node = require('./Node');
var CharacterData = require('./CharacterData');

function Comment(doc, data) {
  CharacterData.call(this);
  this.nodeType = Node.COMMENT_NODE;
  this.ownerDocument = doc;
  this._data = data;
}

var nodeValue = {
  get: function() { return this._data; },
  set: function(v) {
    if (v === null || v === undefined) { v = ''; } else { v = String(v); }
    this._data = v;
    if (this.rooted)
      this.ownerDocument.mutateValue(this);
  }
};

Comment.prototype = Object.create(CharacterData.prototype, {
  nodeName: { value: '#comment' },
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
    return new Comment(this.ownerDocument, this._data);
  }},
});
