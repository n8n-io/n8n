!function(e, u) {
  "object" == typeof exports && "undefined" != typeof module ? u(exports, require("deep-eql"), require("lodash-es")) : "function" == typeof define && define.amd ? define([ "exports", "deep-eql", "lodash-es" ], u) : u((e = "undefined" != typeof globalThis ? globalThis : e || self).ArrayHyperUnique = {}, e._equals, e.lodashEs);
}(this, (function(e, u, r) {
  "use strict";
  function _interopDefaultLegacy(e) {
    return e && "object" == typeof e && "default" in e ? e : {
      default: e
    };
  }
  var t = _interopDefaultLegacy(u);
  function equals(e, u) {
    return t.default(e, u);
  }
  function defaultFilter(e = {}) {
    const u = e.checker || defaultChecker, t = e.filter || null, a = e.removeFromFirst ? r.findLastIndex : r.findIndex;
    return (e, r, i) => a(i, (r => u(r, e, i, i))) === r && (!t || t(e));
  }
  function defaultChecker(e, u, r, a) {
    return t.default(e, u);
  }
  function array_unique(e, u = {}) {
    if (!Array.isArray(e)) throw new TypeError(`Expected an Array but got ${typeof e}.`);
    const r = defaultFilter(u);
    if (u.overwrite) {
      let u = e.length;
      for (;u--; ) r(e[u], u, e) || e.splice(u, 1);
      return e;
    }
    return e.filter(r);
  }
  function array_unique_overwrite(e, u = {}) {
    return array_unique(e, {
      ...u,
      overwrite: !0
    });
  }
  function lazy_unique(...e) {
    return array_unique(e.length > 1 ? e : e[0]);
  }
  function lazy_unique_overwrite(...e) {
    return array_unique_overwrite(e.length > 1 ? e : e[0]);
  }
  Object.defineProperty(lazy_unique, "array_unique", {
    value: array_unique
  }), Object.defineProperty(lazy_unique, "array_unique_overwrite", {
    value: array_unique_overwrite
  }), Object.defineProperty(lazy_unique, "lazy_unique_overwrite", {
    value: lazy_unique_overwrite
  }), Object.defineProperty(lazy_unique, "equals", {
    value: equals
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
  }), e.array_unique = array_unique, e.array_unique_overwrite = array_unique_overwrite, 
  e.default = lazy_unique, e.defaultChecker = defaultChecker, e.defaultFilter = defaultFilter, 
  e.equals = equals, e.lazy_unique = lazy_unique, e.lazy_unique_overwrite = lazy_unique_overwrite, 
  Object.defineProperty(e, "__esModule", {
    value: !0
  });
}));
//# sourceMappingURL=index.umd.production.min.cjs.map
