/* eslint no-undefined: 0 */
'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var format = require('./format');
var _require = require('triple-beam'),
  LEVEL = _require.LEVEL,
  MESSAGE = _require.MESSAGE;

/*
 * function errors (info)
 * If the `message` property of the `info` object is an instance of `Error`,
 * replace the `Error` object its own `message` property.
 *
 * Optionally, the Error's `stack` and/or `cause` properties can also be appended to the `info` object.
 */
module.exports = format(function (einfo, _ref) {
  var stack = _ref.stack,
    cause = _ref.cause;
  if (einfo instanceof Error) {
    var info = Object.assign({}, einfo, _defineProperty(_defineProperty(_defineProperty({
      level: einfo.level
    }, LEVEL, einfo[LEVEL] || einfo.level), "message", einfo.message), MESSAGE, einfo[MESSAGE] || einfo.message));
    if (stack) info.stack = einfo.stack;
    if (cause) info.cause = einfo.cause;
    return info;
  }
  if (!(einfo.message instanceof Error)) return einfo;

  // Assign all enumerable properties and the
  // message property from the error provided.
  var err = einfo.message;
  Object.assign(einfo, err);
  einfo.message = err.message;
  einfo[MESSAGE] = err.message;

  // Assign the stack and/or cause if requested.
  if (stack) einfo.stack = err.stack;
  if (cause) einfo.cause = err.cause;
  return einfo;
});