!function(e, r) {
  "object" == typeof exports && "undefined" != typeof module ? r(exports, require("deep-eql"), require("lodash-es")) : "function" == typeof define && define.amd ? define([ "exports", "deep-eql", "lodash-es" ], r) : r((e = "undefined" != typeof globalThis ? globalThis : e || self).ArrayHyperUnique = {}, e._equals, e.lodashEs);
}(this, function(e, r, u) {
  "use strict";
  function equals(e, u) {
    return r(e, u);
  }
  function defaultFilter(e = {}) {
    const r = e.checker || defaultChecker, t = e.filter || null, i = e.removeFromFirst ? u.findLastIndex : u.findIndex;
    return (e, u, n) => i(n, u => r(u, e, n, n)) === u && (!t || t(e));
  }
  function defaultChecker(e, u, t, i) {
    return r(e, u);
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
});
//# sourceMappingURL=index.umd.production.min.cjs.map
