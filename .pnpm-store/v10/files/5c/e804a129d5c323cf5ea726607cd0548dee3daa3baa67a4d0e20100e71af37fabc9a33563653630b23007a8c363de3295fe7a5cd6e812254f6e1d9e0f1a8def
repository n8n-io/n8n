"use strict";
module.exports =  DocumentFragment;

var Node = require('./Node');
var NodeList = require('./NodeList');
var ContainerNode = require('./ContainerNode');
var Element = require('./Element');
var select = require('./select');
var utils = require('./utils');

function DocumentFragment(doc) {
  ContainerNode.call(this);
  this.nodeType = Node.DOCUMENT_FRAGMENT_NODE;
  this.ownerDocument = doc;
}

DocumentFragment.prototype = Object.create(ContainerNode.prototype, {
  nodeName: { value: '#document-fragment' },
  nodeValue: {
    get: function() {
      return null;
    },
    set: function() {}
  },
  // Copy the text content getter/setter from Element
  textContent: Object.getOwnPropertyDescriptor(Element.prototype, 'textContent'),

  // Copy the text content getter/setter from Element
  innerText: Object.getOwnPropertyDescriptor(Element.prototype, 'innerText'),

  querySelector: { value: function(selector) {
    // implement in terms of querySelectorAll
    var nodes = this.querySelectorAll(selector);
    return nodes.length ? nodes[0] : null;
  }},
  querySelectorAll: { value: function(selector) {
    // create a context
    var context = Object.create(this);
    // add some methods to the context for zest implementation, without
    // adding them to the public DocumentFragment API
    context.isHTML = true; // in HTML namespace (case-insensitive match)
    context.getElementsByTagName = Element.prototype.getElementsByTagName;
    context.nextElement =
      Object.getOwnPropertyDescriptor(Element.prototype, 'firstElementChild').
      get;
    // invoke zest
    var nodes = select(selector, context);
    return nodes.item ? nodes : new NodeList(nodes);
  }},

  // Utility methods
  clone: { value: function clone() {
      return new DocumentFragment(this.ownerDocument);
  }},
  isEqual: { value: function isEqual(n) {
      // Any two document fragments are shallowly equal.
      // Node.isEqualNode() will test their children for equality
      return true;
  }},

  // Non-standard, but useful (github issue #73)
  innerHTML: {
    get: function() { return this.serialize(); },
    set: utils.nyi
  },
  outerHTML: {
    get: function() { return this.serialize(); },
    set: utils.nyi
  },

});
