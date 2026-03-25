"use strict";

var e = require("deep-eql"), r = require("lodash");

function _interopDefaultLegacy(e) {
  return e && "object" == typeof e && "default" in e ? e : {
    default: e
  };
}

var u = _interopDefaultLegacy(e);

function defaultFilter(e = {}) {
  const u = e.checker || defaultChecker, t = e.filter || null, n = e.removeFromFirst ? r.findLastIndex : r.findIndex;
  return (e, r, a) => n(a, (r => u(r, e, a, a))) === r && (!t || t(e));
}

function defaultChecker(e, r, t, n) {
  return u.default(e, r);
}

function array_unique(e, r = {}) {
  if (!Array.isArray(e)) throw new TypeError(`Expected an Array but got ${typeof e}.`);
  const u = defaultFilter(r);
  if (r.overwrite) {
    let r = e.length;
    for (;r--; ) u(e[r], r, e) || e.splice(r, 1);
    return e;
  }
  return e.filter(u);
}

function array_unique_overwrite(e, r = {}) {
  return array_unique(e, {
    ...r,
    overwrite: !0
  });
}

function lazy_unique(...e) {
  return array_unique(e.length > 1 ? e : e[0]);
}

Object.defineProperty(lazy_unique, "array_unique", {
  value: array_unique
}), Object.defineProperty(lazy_unique, "array_unique_overwrite", {
  value: array_unique_overwrite
}), Object.defineProperty(lazy_unique, "lazy_unique_overwrite", {
  value: function lazy_unique_overwrite(...e) {
    return array_unique_overwrite(e.length > 1 ? e : e[0]);
  }
}), Object.defineProperty(lazy_unique, "equals", {
  value: function equals(e, r) {
    return u.default(e, r);
  }
}), Object.defineProperty(lazy_unique, "defaultFilter", {
  value: defaultFilter
}), Object.defineProperty(lazy_unique, "defaultChecker", {
  value: defaultChecker
}), Object.defineProperty(lazy_unique, "lazy_unique", {
  value: lazy_unique
}), Object.defineProperty(lazy_unique, "default", {
  value: lazy_unique
}), Object.defineProperty(lazy_unique, "__esModule", {
  value: !0
}), module.exports = lazy_unique;
//# sourceMappingURL=index.cjs.production.min.cjs.map
