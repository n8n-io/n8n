"use strict";
var h = Object.create;
var c = Object.defineProperty;
var O = Object.getOwnPropertyDescriptor;
var P = Object.getOwnPropertyNames;
var x = Object.getPrototypeOf, m = Object.prototype.hasOwnProperty;
var n = (r, e) => c(r, "name", { value: e, configurable: !0 });
var j = (r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports), R = (r, e) => {
  for (var o in e)
    c(r, o, { get: e[o], enumerable: !0 });
}, b = (r, e, o, i) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let a of P(e))
      !m.call(r, a) && a !== o && c(r, a, { get: () => e[a], enumerable: !(i = O(e, a)) || i.enumerable });
  return r;
};
var T = (r, e, o) => (o = r != null ? h(x(r)) : {}, b(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !r || !r.__esModule ? c(o, "default", { value: r, enumerable: !0 }) : o,
  r
)), k = (r) => b(c({}, "__esModule", { value: !0 }), r);

// ../node_modules/@storybook/global/dist/index.js
var L = j((z, w) => {
  "use strict";
  var y = Object.defineProperty, F = Object.getOwnPropertyDescriptor, N = Object.getOwnPropertyNames, S = Object.prototype.hasOwnProperty, A = /* @__PURE__ */ n(
  (r, e) => {
    for (var o in e)
      y(r, o, { get: e[o], enumerable: !0 });
  }, "__export"), D = /* @__PURE__ */ n((r, e, o, i) => {
    if (e && typeof e == "object" || typeof e == "function")
      for (let a of N(e))
        !S.call(r, a) && a !== o && y(r, a, { get: /* @__PURE__ */ n(() => e[a], "get"), enumerable: !(i = F(e, a)) || i.enumerable });
    return r;
  }, "__copyProps"), E = /* @__PURE__ */ n((r) => D(y({}, "__esModule", { value: !0 }), r), "__toCommonJS"), v = {};
  A(v, {
    global: /* @__PURE__ */ n(() => C, "global")
  });
  w.exports = E(v);
  var C = (() => {
    let r;
    return typeof window < "u" ? r = window : typeof globalThis < "u" ? r = globalThis : typeof global < "u" ? r = global : typeof self < "u" ?
    r = self : r = {}, r;
  })();
});

// src/client-logger/index.ts
var V = {};
R(V, {
  deprecate: () => M,
  logger: () => p,
  once: () => t,
  pretty: () => l
});
module.exports = k(V);
var _ = T(L(), 1);
var { LOGLEVEL: G } = _.global, s = {
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  silent: 10
}, J = G, g = s[J] || s.info, p = {
  trace: /* @__PURE__ */ n((r, ...e) => {
    g <= s.trace && console.trace(r, ...e);
  }, "trace"),
  debug: /* @__PURE__ */ n((r, ...e) => {
    g <= s.debug && console.debug(r, ...e);
  }, "debug"),
  info: /* @__PURE__ */ n((r, ...e) => {
    g <= s.info && console.info(r, ...e);
  }, "info"),
  warn: /* @__PURE__ */ n((r, ...e) => {
    g <= s.warn && console.warn(r, ...e);
  }, "warn"),
  error: /* @__PURE__ */ n((r, ...e) => {
    g <= s.error && console.error(r, ...e);
  }, "error"),
  log: /* @__PURE__ */ n((r, ...e) => {
    g < s.silent && console.log(r, ...e);
  }, "log")
}, u = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ n((r) => (e, ...o) => {
  if (!u.has(e))
    return u.add(e), p[r](e, ...o);
}, "once");
t.clear = () => u.clear();
t.trace = t("trace");
t.debug = t("debug");
t.info = t("info");
t.warn = t("warn");
t.error = t("error");
t.log = t("log");
var M = t("warn"), l = /* @__PURE__ */ n((r) => (...e) => {
  let o = [];
  if (e.length) {
    let i = /<span\s+style=(['"])([^'"]*)\1\s*>/gi, a = /<\/span>/gi, d;
    for (o.push(e[0].replace(i, "%c").replace(a, "%c")); d = i.exec(e[0]); )
      o.push(d[2]), o.push("");
    for (let f = 1; f < e.length; f++)
      o.push(e[f]);
  }
  p[r].apply(p, o);
}, "pretty");
l.trace = l("trace");
l.debug = l("debug");
l.info = l("info");
l.warn = l("warn");
l.error = l("error");
