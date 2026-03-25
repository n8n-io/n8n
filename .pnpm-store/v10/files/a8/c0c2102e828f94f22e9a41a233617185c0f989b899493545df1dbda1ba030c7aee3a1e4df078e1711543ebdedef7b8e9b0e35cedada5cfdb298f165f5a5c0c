"use strict";
module.exports = NamedNodeMap;

var utils = require('./utils');

/* This is a hacky implementation of NamedNodeMap, intended primarily to
 * satisfy clients (like dompurify and the web-platform-tests) which check
 * to ensure that Node#attributes instanceof NamedNodeMap. */

function NamedNodeMap(element) {
  this.element = element;
}
Object.defineProperties(NamedNodeMap.prototype, {
  length: { get: utils.shouldOverride },
  item: { value: utils.shouldOverride },

  getNamedItem: { value: function getNamedItem(qualifiedName) {
    return this.element.getAttributeNode(qualifiedName);
  } },
  getNamedItemNS: { value: function getNamedItemNS(namespace, localName) {
    return this.element.getAttributeNodeNS(namespace, localName);
  } },
  setNamedItem: { value: utils.nyi },
  setNamedItemNS: { value: utils.nyi },
  removeNamedItem: { value: function removeNamedItem(qualifiedName) {
    var attr = this.element.getAttributeNode(qualifiedName);
    if (attr) {
      this.element.removeAttribute(qualifiedName);
      return attr;
    }
    utils.NotFoundError();
  } },
  removeNamedItemNS: { value: function removeNamedItemNS(ns, lname) {
    var attr = this.element.getAttributeNodeNS(ns, lname);
    if (attr) {
      this.element.removeAttributeNS(ns, lname);
      return attr;
    }
    utils.NotFoundError();
  } },
});
