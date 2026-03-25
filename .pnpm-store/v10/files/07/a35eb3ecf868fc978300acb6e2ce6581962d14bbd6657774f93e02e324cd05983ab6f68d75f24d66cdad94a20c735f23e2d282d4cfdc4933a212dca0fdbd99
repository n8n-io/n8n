"use strict";
var DOMException = require('./DOMException');
var ERR = DOMException;
var isApiWritable = require("./config").isApiWritable;

exports.NAMESPACE = {
  HTML: 'http://www.w3.org/1999/xhtml',
  XML: 'http://www.w3.org/XML/1998/namespace',
  XMLNS: 'http://www.w3.org/2000/xmlns/',
  MATHML: 'http://www.w3.org/1998/Math/MathML',
  SVG: 'http://www.w3.org/2000/svg',
  XLINK: 'http://www.w3.org/1999/xlink'
};

//
// Shortcut functions for throwing errors of various types.
//
exports.IndexSizeError = function() { throw new DOMException(ERR.INDEX_SIZE_ERR); };
exports.HierarchyRequestError = function() { throw new DOMException(ERR.HIERARCHY_REQUEST_ERR); };
exports.WrongDocumentError = function() { throw new DOMException(ERR.WRONG_DOCUMENT_ERR); };
exports.InvalidCharacterError = function() { throw new DOMException(ERR.INVALID_CHARACTER_ERR); };
exports.NoModificationAllowedError = function() { throw new DOMException(ERR.NO_MODIFICATION_ALLOWED_ERR); };
exports.NotFoundError = function() { throw new DOMException(ERR.NOT_FOUND_ERR); };
exports.NotSupportedError = function() { throw new DOMException(ERR.NOT_SUPPORTED_ERR); };
exports.InvalidStateError = function() { throw new DOMException(ERR.INVALID_STATE_ERR); };
exports.SyntaxError = function() { throw new DOMException(ERR.SYNTAX_ERR); };
exports.InvalidModificationError = function() { throw new DOMException(ERR.INVALID_MODIFICATION_ERR); };
exports.NamespaceError = function() { throw new DOMException(ERR.NAMESPACE_ERR); };
exports.InvalidAccessError = function() { throw new DOMException(ERR.INVALID_ACCESS_ERR); };
exports.TypeMismatchError = function() { throw new DOMException(ERR.TYPE_MISMATCH_ERR); };
exports.SecurityError = function() { throw new DOMException(ERR.SECURITY_ERR); };
exports.NetworkError = function() { throw new DOMException(ERR.NETWORK_ERR); };
exports.AbortError = function() { throw new DOMException(ERR.ABORT_ERR); };
exports.UrlMismatchError = function() { throw new DOMException(ERR.URL_MISMATCH_ERR); };
exports.QuotaExceededError = function() { throw new DOMException(ERR.QUOTA_EXCEEDED_ERR); };
exports.TimeoutError = function() { throw new DOMException(ERR.TIMEOUT_ERR); };
exports.InvalidNodeTypeError = function() { throw new DOMException(ERR.INVALID_NODE_TYPE_ERR); };
exports.DataCloneError = function() { throw new DOMException(ERR.DATA_CLONE_ERR); };

exports.nyi = function() {
  throw new Error("NotYetImplemented");
};

exports.shouldOverride = function() {
  throw new Error("Abstract function; should be overriding in subclass.");
};

exports.assert = function(expr, msg) {
  if (!expr) {
    throw new Error("Assertion failed: " + (msg || "") + "\n" + new Error().stack);
  }
};

exports.expose = function(src, c) {
  for (var n in src) {
    Object.defineProperty(c.prototype, n, { value: src[n], writable: isApiWritable });
  }
};

exports.merge = function(a, b) {
  for (var n in b) {
    a[n] = b[n];
  }
};

// Compare two nodes based on their document order. This function is intended
// to be passed to sort(). Assumes that the array being sorted does not
// contain duplicates.  And that all nodes are connected and comparable.
// Clever code by ppk via jeresig.
exports.documentOrder = function(n,m) {
  /* jshint bitwise: false */
  return 3 - (n.compareDocumentPosition(m) & 6);
};

exports.toASCIILowerCase = function(s) {
  return s.replace(/[A-Z]+/g, function(c) {
    return c.toLowerCase();
  });
};

exports.toASCIIUpperCase = function(s) {
  return s.replace(/[a-z]+/g, function(c) {
    return c.toUpperCase();
  });
};
