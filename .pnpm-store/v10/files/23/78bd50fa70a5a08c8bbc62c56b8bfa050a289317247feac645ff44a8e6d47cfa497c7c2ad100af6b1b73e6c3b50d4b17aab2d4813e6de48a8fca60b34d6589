/* jshint bitwise: false */
"use strict";
module.exports = CharacterData;

var Leaf = require('./Leaf');
var utils = require('./utils');
var ChildNode = require('./ChildNode');
var NonDocumentTypeChildNode = require('./NonDocumentTypeChildNode');

function CharacterData() {
  Leaf.call(this);
}

CharacterData.prototype = Object.create(Leaf.prototype, {
  // DOMString substringData(unsigned long offset,
  //               unsigned long count);
  // The substringData(offset, count) method must run these steps:
  //
  //     If offset is greater than the context object's
  //     length, throw an INDEX_SIZE_ERR exception and
  //     terminate these steps.
  //
  //     If offset+count is greater than the context
  //     object's length, return a DOMString whose value is
  //     the UTF-16 code units from the offsetth UTF-16 code
  //     unit to the end of data.
  //
  //     Return a DOMString whose value is the UTF-16 code
  //     units from the offsetth UTF-16 code unit to the
  //     offset+countth UTF-16 code unit in data.
  substringData: { value: function substringData(offset, count) {
    if (arguments.length < 2) { throw new TypeError("Not enough arguments"); }
    // Convert arguments to WebIDL "unsigned long"
    offset = offset >>> 0;
    count = count >>> 0;
    if (offset > this.data.length || offset < 0 || count < 0) {
      utils.IndexSizeError();
    }
    return this.data.substring(offset, offset+count);
  }},

  // void appendData(DOMString data);
  // The appendData(data) method must append data to the context
  // object's data.
  appendData: { value: function appendData(data) {
    if (arguments.length < 1) { throw new TypeError("Not enough arguments"); }
    this.data += String(data);
  }},

  // void insertData(unsigned long offset, DOMString data);
  // The insertData(offset, data) method must run these steps:
  //
  //     If offset is greater than the context object's
  //     length, throw an INDEX_SIZE_ERR exception and
  //     terminate these steps.
  //
  //     Insert data into the context object's data after
  //     offset UTF-16 code units.
  //
  insertData: { value: function insertData(offset, data) {
    return this.replaceData(offset, 0, data);
  }},


  // void deleteData(unsigned long offset, unsigned long count);
  // The deleteData(offset, count) method must run these steps:
  //
  //     If offset is greater than the context object's
  //     length, throw an INDEX_SIZE_ERR exception and
  //     terminate these steps.
  //
  //     If offset+count is greater than the context
  //     object's length var count be length-offset.
  //
  //     Starting from offset UTF-16 code units remove count
  //     UTF-16 code units from the context object's data.
  deleteData: { value: function deleteData(offset, count) {
    return this.replaceData(offset, count, '');
  }},


  // void replaceData(unsigned long offset, unsigned long count,
  //          DOMString data);
  //
  // The replaceData(offset, count, data) method must act as
  // if the deleteData() method is invoked with offset and
  // count as arguments followed by the insertData() method
  // with offset and data as arguments and re-throw any
  // exceptions these methods might have thrown.
  replaceData: { value: function replaceData(offset, count, data) {
    var curtext = this.data, len = curtext.length;
    // Convert arguments to correct WebIDL type
    offset = offset >>> 0;
    count = count >>> 0;
    data = String(data);

    if (offset > len || offset < 0) utils.IndexSizeError();

    if (offset+count > len)
      count = len - offset;

    var prefix = curtext.substring(0, offset),
    suffix = curtext.substring(offset+count);

    this.data = prefix + data + suffix;
  }},

  // Utility method that Node.isEqualNode() calls to test Text and
  // Comment nodes for equality.  It is okay to put it here, since
  // Node will have already verified that nodeType is equal
  isEqual: { value: function isEqual(n) {
    return this._data === n._data;
  }},

  length: { get: function() { return this.data.length; }}

});

Object.defineProperties(CharacterData.prototype, ChildNode);
Object.defineProperties(CharacterData.prototype, NonDocumentTypeChildNode);
