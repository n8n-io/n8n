var u = Object.defineProperty;
var a = (e, o) => u(e, "name", { value: o, configurable: !0 });

// ../node_modules/@storybook/global/dist/index.mjs
var y = (() => {
  let e;
  return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
  e = self : e = {}, e;
})();

// src/client-logger/index.ts
var { LOGLEVEL: b } = y, t = {
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  silent: 10
}, L = b, i = t[L] || t.info, s = {
  trace: /* @__PURE__ */ a((e, ...o) => {
    i <= t.trace && console.trace(e, ...o);
  }, "trace"),
  debug: /* @__PURE__ */ a((e, ...o) => {
    i <= t.debug && console.debug(e, ...o);
  }, "debug"),
  info: /* @__PURE__ */ a((e, ...o) => {
    i <= t.info && console.info(e, ...o);
  }, "info"),
  warn: /* @__PURE__ */ a((e, ...o) => {
    i <= t.warn && console.warn(e, ...o);
  }, "warn"),
  error: /* @__PURE__ */ a((e, ...o) => {
    i <= t.error && console.error(e, ...o);
  }, "error"),
  log: /* @__PURE__ */ a((e, ...o) => {
    i < t.silent && console.log(e, ...o);
  }, "log")
}, c = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ a((e) => (o, ...l) => {
  if (!c.has(o))
    return c.add(o), s[e](o, ...l);
}, "once");
n.clear = () => c.clear();
n.trace = n("trace");
n.debug = n("debug");
n.info = n("info");
n.warn = n("warn");
n.error = n("error");
n.log = n("log");
var m = n("warn"), r = /* @__PURE__ */ a((e) => (...o) => {
  let l = [];
  if (o.length) {
    let f = /<span\s+style=(['"])([^'"]*)\1\s*>/gi, p = /<\/span>/gi, d;
    for (l.push(o[0].replace(f, "%c").replace(p, "%c")); d = f.exec(o[0]); )
      l.push(d[2]), l.push("");
    for (let g = 1; g < o.length; g++)
      l.push(o[g]);
  }
  s[e].apply(s, l);
}, "pretty");
r.trace = r("trace");
r.debug = r("debug");
r.info = r("info");
r.warn = r("warn");
r.error = r("error");
export {
  m as deprecate,
  s as logger,
  n as once,
  r as pretty
};
