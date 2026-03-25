"use strict";
module.exports = DOMException;

var INDEX_SIZE_ERR = 1;
var HIERARCHY_REQUEST_ERR = 3;
var WRONG_DOCUMENT_ERR = 4;
var INVALID_CHARACTER_ERR = 5;
var NO_MODIFICATION_ALLOWED_ERR = 7;
var NOT_FOUND_ERR = 8;
var NOT_SUPPORTED_ERR = 9;
var INVALID_STATE_ERR = 11;
var SYNTAX_ERR = 12;
var INVALID_MODIFICATION_ERR = 13;
var NAMESPACE_ERR = 14;
var INVALID_ACCESS_ERR = 15;
var TYPE_MISMATCH_ERR = 17;
var SECURITY_ERR = 18;
var NETWORK_ERR = 19;
var ABORT_ERR = 20;
var URL_MISMATCH_ERR = 21;
var QUOTA_EXCEEDED_ERR = 22;
var TIMEOUT_ERR = 23;
var INVALID_NODE_TYPE_ERR = 24;
var DATA_CLONE_ERR = 25;

// Code to name
var names = [
  null,  // No error with code 0
  'INDEX_SIZE_ERR',
  null, // historical
  'HIERARCHY_REQUEST_ERR',
  'WRONG_DOCUMENT_ERR',
  'INVALID_CHARACTER_ERR',
  null, // historical
  'NO_MODIFICATION_ALLOWED_ERR',
  'NOT_FOUND_ERR',
  'NOT_SUPPORTED_ERR',
  'INUSE_ATTRIBUTE_ERR', // historical
  'INVALID_STATE_ERR',
  'SYNTAX_ERR',
  'INVALID_MODIFICATION_ERR',
  'NAMESPACE_ERR',
  'INVALID_ACCESS_ERR',
  null, // historical
  'TYPE_MISMATCH_ERR',
  'SECURITY_ERR',
  'NETWORK_ERR',
  'ABORT_ERR',
  'URL_MISMATCH_ERR',
  'QUOTA_EXCEEDED_ERR',
  'TIMEOUT_ERR',
  'INVALID_NODE_TYPE_ERR',
  'DATA_CLONE_ERR',
];

// Code to message
// These strings are from the 13 May 2011 Editor's Draft of DOM Core.
// http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html
// Copyright © 2011 W3C® (MIT, ERCIM, Keio), All Rights Reserved.
// Used under the terms of the W3C Document License:
// http://www.w3.org/Consortium/Legal/2002/copyright-documents-20021231
var messages = [
  null,  // No error with code 0
  'INDEX_SIZE_ERR (1): the index is not in the allowed range',
  null,
  'HIERARCHY_REQUEST_ERR (3): the operation would yield an incorrect nodes model',
  'WRONG_DOCUMENT_ERR (4): the object is in the wrong Document, a call to importNode is required',
  'INVALID_CHARACTER_ERR (5): the string contains invalid characters',
  null,
  'NO_MODIFICATION_ALLOWED_ERR (7): the object can not be modified',
  'NOT_FOUND_ERR (8): the object can not be found here',
  'NOT_SUPPORTED_ERR (9): this operation is not supported',
  'INUSE_ATTRIBUTE_ERR (10): setAttributeNode called on owned Attribute',
  'INVALID_STATE_ERR (11): the object is in an invalid state',
  'SYNTAX_ERR (12): the string did not match the expected pattern',
  'INVALID_MODIFICATION_ERR (13): the object can not be modified in this way',
  'NAMESPACE_ERR (14): the operation is not allowed by Namespaces in XML',
  'INVALID_ACCESS_ERR (15): the object does not support the operation or argument',
  null,
  'TYPE_MISMATCH_ERR (17): the type of the object does not match the expected type',
  'SECURITY_ERR (18): the operation is insecure',
  'NETWORK_ERR (19): a network error occurred',
  'ABORT_ERR (20): the user aborted an operation',
  'URL_MISMATCH_ERR (21): the given URL does not match another URL',
  'QUOTA_EXCEEDED_ERR (22): the quota has been exceeded',
  'TIMEOUT_ERR (23): a timeout occurred',
  'INVALID_NODE_TYPE_ERR (24): the supplied node is invalid or has an invalid ancestor for this operation',
  'DATA_CLONE_ERR (25): the object can not be cloned.'
];

// Name to code
var constants = {
  INDEX_SIZE_ERR: INDEX_SIZE_ERR,
  DOMSTRING_SIZE_ERR: 2, // historical
  HIERARCHY_REQUEST_ERR: HIERARCHY_REQUEST_ERR,
  WRONG_DOCUMENT_ERR: WRONG_DOCUMENT_ERR,
  INVALID_CHARACTER_ERR: INVALID_CHARACTER_ERR,
  NO_DATA_ALLOWED_ERR: 6, // historical
  NO_MODIFICATION_ALLOWED_ERR: NO_MODIFICATION_ALLOWED_ERR,
  NOT_FOUND_ERR: NOT_FOUND_ERR,
  NOT_SUPPORTED_ERR: NOT_SUPPORTED_ERR,
  INUSE_ATTRIBUTE_ERR: 10, // historical
  INVALID_STATE_ERR: INVALID_STATE_ERR,
  SYNTAX_ERR: SYNTAX_ERR,
  INVALID_MODIFICATION_ERR: INVALID_MODIFICATION_ERR,
  NAMESPACE_ERR: NAMESPACE_ERR,
  INVALID_ACCESS_ERR: INVALID_ACCESS_ERR,
  VALIDATION_ERR: 16, // historical
  TYPE_MISMATCH_ERR: TYPE_MISMATCH_ERR,
  SECURITY_ERR: SECURITY_ERR,
  NETWORK_ERR: NETWORK_ERR,
  ABORT_ERR: ABORT_ERR,
  URL_MISMATCH_ERR: URL_MISMATCH_ERR,
  QUOTA_EXCEEDED_ERR: QUOTA_EXCEEDED_ERR,
  TIMEOUT_ERR: TIMEOUT_ERR,
  INVALID_NODE_TYPE_ERR: INVALID_NODE_TYPE_ERR,
  DATA_CLONE_ERR: DATA_CLONE_ERR
};

function DOMException(code) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.code = code;
  this.message = messages[code];
  this.name = names[code];
}
DOMException.prototype.__proto__ = Error.prototype;

// Initialize the constants on DOMException and DOMException.prototype
for(var c in constants) {
  var v = { value: constants[c] };
  Object.defineProperty(DOMException, c, v);
  Object.defineProperty(DOMException.prototype, c, v);
}
