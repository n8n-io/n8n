'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var format = require('./format');
function fillExcept(info, fillExceptKeys, metadataKey) {
  var savedKeys = fillExceptKeys.reduce(function (acc, key) {
    acc[key] = info[key];
    delete info[key];
    return acc;
  }, {});
  var metadata = Object.keys(info).reduce(function (acc, key) {
    acc[key] = info[key];
    delete info[key];
    return acc;
  }, {});
  Object.assign(info, savedKeys, _defineProperty({}, metadataKey, metadata));
  return info;
}
function fillWith(info, fillWithKeys, metadataKey) {
  info[metadataKey] = fillWithKeys.reduce(function (acc, key) {
    acc[key] = info[key];
    delete info[key];
    return acc;
  }, {});
  return info;
}

/**
 * Adds in a "metadata" object to collect extraneous data, similar to the metadata
 * object in winston 2.x.
 */
module.exports = format(function (info) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var metadataKey = 'metadata';
  if (opts.key) {
    metadataKey = opts.key;
  }
  var fillExceptKeys = [];
  if (!opts.fillExcept && !opts.fillWith) {
    fillExceptKeys.push('level');
    fillExceptKeys.push('message');
  }
  if (opts.fillExcept) {
    fillExceptKeys = opts.fillExcept;
  }
  if (fillExceptKeys.length > 0) {
    return fillExcept(info, fillExceptKeys, metadataKey);
  }
  if (opts.fillWith) {
    return fillWith(info, opts.fillWith, metadataKey);
  }
  return info;
});