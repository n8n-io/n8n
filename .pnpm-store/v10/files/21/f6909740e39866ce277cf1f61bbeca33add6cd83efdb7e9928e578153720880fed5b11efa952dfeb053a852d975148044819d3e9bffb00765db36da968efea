"use strict";
var Qm = Object.create;
var Ht = Object.defineProperty;
var Xm = Object.getOwnPropertyDescriptor;
var Zm = Object.getOwnPropertyNames;
var Jm = Object.getPrototypeOf, eg = Object.prototype.hasOwnProperty;
var n = (t, e) => Ht(t, "name", { value: e, configurable: !0 });
var fe = (t, e) => () => (t && (e = t(t = 0)), e);
var f = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), _t = (t, e) => {
  for (var r in e)
    Ht(t, r, { get: e[r], enumerable: !0 });
}, ma = (t, e, r, i) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let s of Zm(e))
      !eg.call(t, s) && s !== r && Ht(t, s, { get: () => e[s], enumerable: !(i = Xm(e, s)) || i.enumerable });
  return t;
};
var j = (t, e, r) => (r = t != null ? Qm(Jm(t)) : {}, ma(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !t || !t.__esModule ? Ht(r, "default", { value: t, enumerable: !0 }) : r,
  t
)), xr = (t) => ma(Ht({}, "__esModule", { value: !0 }), t);

// ../node_modules/ts-dedent/dist/index.js
var ut = f((Bt) => {
  "use strict";
  Object.defineProperty(Bt, "__esModule", { value: !0 });
  Bt.dedent = void 0;
  function ga(t) {
    for (var e = [], r = 1; r < arguments.length; r++)
      e[r - 1] = arguments[r];
    var i = Array.from(typeof t == "string" ? [t] : t);
    i[i.length - 1] = i[i.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var s = i.reduce(function(l, c) {
      var u = c.match(/\n([\t ]+|(?!\s).)/g);
      return u ? l.concat(u.map(function(h) {
        var m, p;
        return (p = (m = h.match(/[\t ]/g)) === null || m === void 0 ? void 0 : m.length) !== null && p !== void 0 ? p : 0;
      })) : l;
    }, []);
    if (s.length) {
      var o = new RegExp(`
[	 ]{` + Math.min.apply(Math, s) + "}", "g");
      i = i.map(function(l) {
        return l.replace(o, `
`);
      });
    }
    i[0] = i[0].replace(/^\r?\n/, "");
    var a = i[0];
    return e.forEach(function(l, c) {
      var u = a.match(/(?:^|\n)( *)$/), h = u ? u[1] : "", m = l;
      typeof l == "string" && l.includes(`
`) && (m = String(l).split(`
`).map(function(p, v) {
        return v === 0 ? p : "" + h + p;
      }).join(`
`)), a += m + i[c + 1];
    }), a;
  }
  n(ga, "dedent");
  Bt.dedent = ga;
  Bt.default = ga;
});

// ../node_modules/camelcase/index.js
var ka = {};
_t(ka, {
  default: () => La
});
function La(t, e) {
  if (!(typeof t == "string" || Array.isArray(t)))
    throw new TypeError("Expected the input to be `string | string[]`");
  if (e = {
    pascalCase: !1,
    preserveConsecutiveUppercase: !1,
    ...e
  }, Array.isArray(t) ? t = t.map((o) => o.trim()).filter((o) => o.length).join("-") : t = t.trim(), t.length === 0)
    return "";
  let r = e.locale === !1 ? (o) => o.toLowerCase() : (o) => o.toLocaleLowerCase(e.locale), i = e.locale === !1 ? (o) => o.toUpperCase() : (o) => o.
  toLocaleUpperCase(e.locale);
  return t.length === 1 ? qi.test(t) ? "" : e.pascalCase ? i(t) : r(t) : (t !== r(t) && (t = ng(t, r, i, e.preserveConsecutiveUppercase)), t =
  t.replace(sg, ""), t = e.preserveConsecutiveUppercase ? og(t, r) : r(t), e.pascalCase && (t = i(t.charAt(0)) + t.slice(1)), ag(t, i));
}
var rg, ig, Ca, Na, qi, sg, Da, Ia, ng, og, ag, $a = fe(() => {
  rg = /[\p{Lu}]/u, ig = /[\p{Ll}]/u, Ca = /^[\p{Lu}](?![\p{Lu}])/gu, Na = /([\p{Alpha}\p{N}_]|$)/u, qi = /[_.\- ]+/, sg = new RegExp("^" + qi.
  source), Da = new RegExp(qi.source + Na.source, "gu"), Ia = new RegExp("\\d+" + Na.source, "gu"), ng = /* @__PURE__ */ n((t, e, r, i) => {
    let s = !1, o = !1, a = !1, l = !1;
    for (let c = 0; c < t.length; c++) {
      let u = t[c];
      l = c > 2 ? t[c - 3] === "-" : !0, s && rg.test(u) ? (t = t.slice(0, c) + "-" + t.slice(c), s = !1, a = o, o = !0, c++) : o && a && ig.
      test(u) && (!l || i) ? (t = t.slice(0, c - 1) + "-" + t.slice(c - 1), a = o, o = !1, s = !0) : (s = e(u) === u && r(u) !== u, a = o, o =
      r(u) === u && e(u) !== u);
    }
    return t;
  }, "preserveCamelCase"), og = /* @__PURE__ */ n((t, e) => (Ca.lastIndex = 0, t.replaceAll(Ca, (r) => e(r))), "preserveConsecutiveUppercase"),
  ag = /* @__PURE__ */ n((t, e) => (Da.lastIndex = 0, Ia.lastIndex = 0, t.replaceAll(Ia, (r, i, s) => ["_", "-"].includes(t.charAt(s + r.length)) ?
  r : e(r)).replaceAll(Da, (r, i) => e(i))), "postProcess");
  n(La, "camelCase");
});

// ../node_modules/@sindresorhus/merge-streams/index.js
function Vi(t) {
  if (!Array.isArray(t))
    throw new TypeError(`Expected an array, got \`${typeof t}\`.`);
  for (let s of t)
    Ui(s);
  let e = t.some(({ readableObjectMode: s }) => s), r = lg(t, e), i = new Bi({
    objectMode: e,
    writableHighWaterMark: r,
    readableHighWaterMark: r
  });
  for (let s of t)
    i.add(s);
  return t.length === 0 && rl(i), i;
}
var vr, Ja, Gi, lg, Bi, cg, ug, hg, Ui, pg, el, dg, fg, mg, tl, rl, Wi, il, gg, Sr, Xa, Za, sl = fe(() => {
  vr = require("node:events"), Ja = require("node:stream"), Gi = require("node:stream/promises");
  n(Vi, "mergeStreams");
  lg = /* @__PURE__ */ n((t, e) => {
    if (t.length === 0)
      return 16384;
    let r = t.filter(({ readableObjectMode: i }) => i === e).map(({ readableHighWaterMark: i }) => i);
    return Math.max(...r);
  }, "getHighWaterMark"), Bi = class extends Ja.PassThrough {
    static {
      n(this, "MergedStream");
    }
    #e = /* @__PURE__ */ new Set([]);
    #r = /* @__PURE__ */ new Set([]);
    #i = /* @__PURE__ */ new Set([]);
    #t;
    add(e) {
      Ui(e), !this.#e.has(e) && (this.#e.add(e), this.#t ??= cg(this, this.#e), pg({
        passThroughStream: this,
        stream: e,
        streams: this.#e,
        ended: this.#r,
        aborted: this.#i,
        onFinished: this.#t
      }), e.pipe(this, { end: !1 }));
    }
    remove(e) {
      return Ui(e), this.#e.has(e) ? (e.unpipe(this), !0) : !1;
    }
  }, cg = /* @__PURE__ */ n(async (t, e) => {
    Sr(t, Xa);
    let r = new AbortController();
    try {
      await Promise.race([
        ug(t, r),
        hg(t, e, r)
      ]);
    } finally {
      r.abort(), Sr(t, -Xa);
    }
  }, "onMergedStreamFinished"), ug = /* @__PURE__ */ n(async (t, { signal: e }) => {
    await (0, Gi.finished)(t, { signal: e, cleanup: !0 });
  }, "onMergedStreamEnd"), hg = /* @__PURE__ */ n(async (t, e, { signal: r }) => {
    for await (let [i] of (0, vr.on)(t, "unpipe", { signal: r }))
      e.has(i) && i.emit(tl);
  }, "onInputStreamsUnpipe"), Ui = /* @__PURE__ */ n((t) => {
    if (typeof t?.pipe != "function")
      throw new TypeError(`Expected a readable stream, got: \`${typeof t}\`.`);
  }, "validateStream"), pg = /* @__PURE__ */ n(async ({ passThroughStream: t, stream: e, streams: r, ended: i, aborted: s, onFinished: o }) => {
    Sr(t, Za);
    let a = new AbortController();
    try {
      await Promise.race([
        dg(o, e),
        fg({ passThroughStream: t, stream: e, streams: r, ended: i, aborted: s, controller: a }),
        mg({ stream: e, streams: r, ended: i, aborted: s, controller: a })
      ]);
    } finally {
      a.abort(), Sr(t, -Za);
    }
    r.size === i.size + s.size && (i.size === 0 && s.size > 0 ? Wi(t) : rl(t));
  }, "endWhenStreamsDone"), el = /* @__PURE__ */ n((t) => t?.code === "ERR_STREAM_PREMATURE_CLOSE", "isAbortError"), dg = /* @__PURE__ */ n(
  async (t, e) => {
    try {
      await t, Wi(e);
    } catch (r) {
      el(r) ? Wi(e) : il(e, r);
    }
  }, "afterMergedStreamFinished"), fg = /* @__PURE__ */ n(async ({ passThroughStream: t, stream: e, streams: r, ended: i, aborted: s, controller: {
  signal: o } }) => {
    try {
      await (0, Gi.finished)(e, { signal: o, cleanup: !0, readable: !0, writable: !1 }), r.has(e) && i.add(e);
    } catch (a) {
      if (o.aborted || !r.has(e))
        return;
      el(a) ? s.add(e) : il(t, a);
    }
  }, "onInputStreamEnd"), mg = /* @__PURE__ */ n(async ({ stream: t, streams: e, ended: r, aborted: i, controller: { signal: s } }) => {
    await (0, vr.once)(t, tl, { signal: s }), e.delete(t), r.delete(t), i.delete(t);
  }, "onInputStreamUnpipe"), tl = Symbol("unpipe"), rl = /* @__PURE__ */ n((t) => {
    t.writable && t.end();
  }, "endStream"), Wi = /* @__PURE__ */ n((t) => {
    (t.readable || t.writable) && t.destroy();
  }, "abortStream"), il = /* @__PURE__ */ n((t, e) => {
    t.destroyed || (t.once("error", gg), t.destroy(e));
  }, "errorStream"), gg = /* @__PURE__ */ n(() => {
  }, "noop"), Sr = /* @__PURE__ */ n((t, e) => {
    let r = t.getMaxListeners();
    r !== 0 && r !== Number.POSITIVE_INFINITY && t.setMaxListeners(r + e);
  }, "updateMaxListeners"), Xa = 2, Za = 1;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/array.js
var nl = f((vt) => {
  "use strict";
  Object.defineProperty(vt, "__esModule", { value: !0 });
  vt.splitWhen = vt.flatten = void 0;
  function yg(t) {
    return t.reduce((e, r) => [].concat(e, r), []);
  }
  n(yg, "flatten");
  vt.flatten = yg;
  function xg(t, e) {
    let r = [[]], i = 0;
    for (let s of t)
      e(s) ? (i++, r[i] = []) : r[i].push(s);
    return r;
  }
  n(xg, "splitWhen");
  vt.splitWhen = xg;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/errno.js
var ol = f((wr) => {
  "use strict";
  Object.defineProperty(wr, "__esModule", { value: !0 });
  wr.isEnoentCodeError = void 0;
  function _g(t) {
    return t.code === "ENOENT";
  }
  n(_g, "isEnoentCodeError");
  wr.isEnoentCodeError = _g;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/fs.js
var al = f((Rr) => {
  "use strict";
  Object.defineProperty(Rr, "__esModule", { value: !0 });
  Rr.createDirentFromStats = void 0;
  var Yi = class {
    static {
      n(this, "DirentFromStats");
    }
    constructor(e, r) {
      this.name = e, this.isBlockDevice = r.isBlockDevice.bind(r), this.isCharacterDevice = r.isCharacterDevice.bind(r), this.isDirectory = r.
      isDirectory.bind(r), this.isFIFO = r.isFIFO.bind(r), this.isFile = r.isFile.bind(r), this.isSocket = r.isSocket.bind(r), this.isSymbolicLink =
      r.isSymbolicLink.bind(r);
    }
  };
  function bg(t, e) {
    return new Yi(t, e);
  }
  n(bg, "createDirentFromStats");
  Rr.createDirentFromStats = bg;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/path.js
var hl = f((Z) => {
  "use strict";
  Object.defineProperty(Z, "__esModule", { value: !0 });
  Z.convertPosixPathToPattern = Z.convertWindowsPathToPattern = Z.convertPathToPattern = Z.escapePosixPath = Z.escapeWindowsPath = Z.escape =
  Z.removeLeadingDotSegment = Z.makeAbsolute = Z.unixify = void 0;
  var Eg = require("os"), Sg = require("path"), ll = Eg.platform() === "win32", vg = 2, wg = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g,
  Rg = /(\\?)([()[\]{}]|^!|[!+@](?=\())/g, Tg = /^\\\\([.?])/, Ag = /\\(?![!()+@[\]{}])/g;
  function Pg(t) {
    return t.replace(/\\/g, "/");
  }
  n(Pg, "unixify");
  Z.unixify = Pg;
  function Og(t, e) {
    return Sg.resolve(t, e);
  }
  n(Og, "makeAbsolute");
  Z.makeAbsolute = Og;
  function Cg(t) {
    if (t.charAt(0) === ".") {
      let e = t.charAt(1);
      if (e === "/" || e === "\\")
        return t.slice(vg);
    }
    return t;
  }
  n(Cg, "removeLeadingDotSegment");
  Z.removeLeadingDotSegment = Cg;
  Z.escape = ll ? zi : Ki;
  function zi(t) {
    return t.replace(Rg, "\\$2");
  }
  n(zi, "escapeWindowsPath");
  Z.escapeWindowsPath = zi;
  function Ki(t) {
    return t.replace(wg, "\\$2");
  }
  n(Ki, "escapePosixPath");
  Z.escapePosixPath = Ki;
  Z.convertPathToPattern = ll ? cl : ul;
  function cl(t) {
    return zi(t).replace(Tg, "//$1").replace(Ag, "/");
  }
  n(cl, "convertWindowsPathToPattern");
  Z.convertWindowsPathToPattern = cl;
  function ul(t) {
    return Ki(t);
  }
  n(ul, "convertPosixPathToPattern");
  Z.convertPosixPathToPattern = ul;
});

// ../node_modules/is-extglob/index.js
var dl = f((hA, pl) => {
  pl.exports = /* @__PURE__ */ n(function(e) {
    if (typeof e != "string" || e === "")
      return !1;
    for (var r; r = /(\\).|([@?!+*]\(.*\))/g.exec(e); ) {
      if (r[2]) return !0;
      e = e.slice(r.index + r[0].length);
    }
    return !1;
  }, "isExtglob");
});

// ../node_modules/is-glob/index.js
var gl = f((dA, ml) => {
  var Dg = dl(), fl = { "{": "}", "(": ")", "[": "]" }, Ig = /* @__PURE__ */ n(function(t) {
    if (t[0] === "!")
      return !0;
    for (var e = 0, r = -2, i = -2, s = -2, o = -2, a = -2; e < t.length; ) {
      if (t[e] === "*" || t[e + 1] === "?" && /[\].+)]/.test(t[e]) || i !== -1 && t[e] === "[" && t[e + 1] !== "]" && (i < e && (i = t.indexOf(
      "]", e)), i > e && (a === -1 || a > i || (a = t.indexOf("\\", e), a === -1 || a > i))) || s !== -1 && t[e] === "{" && t[e + 1] !== "}" &&
      (s = t.indexOf("}", e), s > e && (a = t.indexOf("\\", e), a === -1 || a > s)) || o !== -1 && t[e] === "(" && t[e + 1] === "?" && /[:!=]/.
      test(t[e + 2]) && t[e + 3] !== ")" && (o = t.indexOf(")", e), o > e && (a = t.indexOf("\\", e), a === -1 || a > o)) || r !== -1 && t[e] ===
      "(" && t[e + 1] !== "|" && (r < e && (r = t.indexOf("|", e)), r !== -1 && t[r + 1] !== ")" && (o = t.indexOf(")", r), o > r && (a = t.
      indexOf("\\", r), a === -1 || a > o))))
        return !0;
      if (t[e] === "\\") {
        var l = t[e + 1];
        e += 2;
        var c = fl[l];
        if (c) {
          var u = t.indexOf(c, e);
          u !== -1 && (e = u + 1);
        }
        if (t[e] === "!")
          return !0;
      } else
        e++;
    }
    return !1;
  }, "strictCheck"), Ng = /* @__PURE__ */ n(function(t) {
    if (t[0] === "!")
      return !0;
    for (var e = 0; e < t.length; ) {
      if (/[*?{}()[\]]/.test(t[e]))
        return !0;
      if (t[e] === "\\") {
        var r = t[e + 1];
        e += 2;
        var i = fl[r];
        if (i) {
          var s = t.indexOf(i, e);
          s !== -1 && (e = s + 1);
        }
        if (t[e] === "!")
          return !0;
      } else
        e++;
    }
    return !1;
  }, "relaxedCheck");
  ml.exports = /* @__PURE__ */ n(function(e, r) {
    if (typeof e != "string" || e === "")
      return !1;
    if (Dg(e))
      return !0;
    var i = Ig;
    return r && r.strict === !1 && (i = Ng), i(e);
  }, "isGlob");
});

// ../node_modules/glob-parent/index.js
var xl = f((mA, yl) => {
  "use strict";
  var Lg = gl(), kg = require("path").posix.dirname, $g = require("os").platform() === "win32", Qi = "/", Mg = /\\/g, qg = /[\{\[].*[\}\]]$/,
  Fg = /(^|[^\\])([\{\[]|\([^\)]+$)/, jg = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
  yl.exports = /* @__PURE__ */ n(function(e, r) {
    var i = Object.assign({ flipBackslashes: !0 }, r);
    i.flipBackslashes && $g && e.indexOf(Qi) < 0 && (e = e.replace(Mg, Qi)), qg.test(e) && (e += Qi), e += "a";
    do
      e = kg(e);
    while (Lg(e) || Fg.test(e));
    return e.replace(jg, "$1");
  }, "globParent");
});

// ../node_modules/braces/lib/utils.js
var Tr = f((me) => {
  "use strict";
  me.isInteger = (t) => typeof t == "number" ? Number.isInteger(t) : typeof t == "string" && t.trim() !== "" ? Number.isInteger(Number(t)) :
  !1;
  me.find = (t, e) => t.nodes.find((r) => r.type === e);
  me.exceedsLimit = (t, e, r = 1, i) => i === !1 || !me.isInteger(t) || !me.isInteger(e) ? !1 : (Number(e) - Number(t)) / Number(r) >= i;
  me.escapeNode = (t, e = 0, r) => {
    let i = t.nodes[e];
    i && (r && i.type === r || i.type === "open" || i.type === "close") && i.escaped !== !0 && (i.value = "\\" + i.value, i.escaped = !0);
  };
  me.encloseBrace = (t) => t.type !== "brace" ? !1 : t.commas >> 0 + t.ranges >> 0 === 0 ? (t.invalid = !0, !0) : !1;
  me.isInvalidBrace = (t) => t.type !== "brace" ? !1 : t.invalid === !0 || t.dollar ? !0 : t.commas >> 0 + t.ranges >> 0 === 0 || t.open !==
  !0 || t.close !== !0 ? (t.invalid = !0, !0) : !1;
  me.isOpenOrClose = (t) => t.type === "open" || t.type === "close" ? !0 : t.open === !0 || t.close === !0;
  me.reduce = (t) => t.reduce((e, r) => (r.type === "text" && e.push(r.value), r.type === "range" && (r.type = "text"), e), []);
  me.flatten = (...t) => {
    let e = [], r = /* @__PURE__ */ n((i) => {
      for (let s = 0; s < i.length; s++) {
        let o = i[s];
        if (Array.isArray(o)) {
          r(o);
          continue;
        }
        o !== void 0 && e.push(o);
      }
      return e;
    }, "flat");
    return r(t), e;
  };
});

// ../node_modules/braces/lib/stringify.js
var Ar = f((_A, bl) => {
  "use strict";
  var _l = Tr();
  bl.exports = (t, e = {}) => {
    let r = /* @__PURE__ */ n((i, s = {}) => {
      let o = e.escapeInvalid && _l.isInvalidBrace(s), a = i.invalid === !0 && e.escapeInvalid === !0, l = "";
      if (i.value)
        return (o || a) && _l.isOpenOrClose(i) ? "\\" + i.value : i.value;
      if (i.value)
        return i.value;
      if (i.nodes)
        for (let c of i.nodes)
          l += r(c);
      return l;
    }, "stringify");
    return r(t);
  };
});

// ../node_modules/to-regex-range/node_modules/is-number/index.js
var Sl = f((EA, El) => {
  "use strict";
  El.exports = function(t) {
    return typeof t == "number" ? t - t === 0 : typeof t == "string" && t.trim() !== "" ? Number.isFinite ? Number.isFinite(+t) : isFinite(+t) :
    !1;
  };
});

// ../node_modules/to-regex-range/index.js
var Dl = f((SA, Cl) => {
  "use strict";
  var vl = Sl(), ht = /* @__PURE__ */ n((t, e, r) => {
    if (vl(t) === !1)
      throw new TypeError("toRegexRange: expected the first argument to be a number");
    if (e === void 0 || t === e)
      return String(t);
    if (vl(e) === !1)
      throw new TypeError("toRegexRange: expected the second argument to be a number.");
    let i = { relaxZeros: !0, ...r };
    typeof i.strictZeros == "boolean" && (i.relaxZeros = i.strictZeros === !1);
    let s = String(i.relaxZeros), o = String(i.shorthand), a = String(i.capture), l = String(i.wrap), c = t + ":" + e + "=" + s + o + a + l;
    if (ht.cache.hasOwnProperty(c))
      return ht.cache[c].result;
    let u = Math.min(t, e), h = Math.max(t, e);
    if (Math.abs(u - h) === 1) {
      let b = t + "|" + e;
      return i.capture ? `(${b})` : i.wrap === !1 ? b : `(?:${b})`;
    }
    let m = Ol(t) || Ol(e), p = { min: t, max: e, a: u, b: h }, v = [], g = [];
    if (m && (p.isPadded = m, p.maxLen = String(p.max).length), u < 0) {
      let b = h < 0 ? Math.abs(h) : 1;
      g = wl(b, Math.abs(u), p, i), u = p.a = 0;
    }
    return h >= 0 && (v = wl(u, h, p, i)), p.negatives = g, p.positives = v, p.result = Hg(g, v, i), i.capture === !0 ? p.result = `(${p.result}\
)` : i.wrap !== !1 && v.length + g.length > 1 && (p.result = `(?:${p.result})`), ht.cache[c] = p, p.result;
  }, "toRegexRange");
  function Hg(t, e, r) {
    let i = Xi(t, e, "-", !1, r) || [], s = Xi(e, t, "", !1, r) || [], o = Xi(t, e, "-?", !0, r) || [];
    return i.concat(o).concat(s).join("|");
  }
  n(Hg, "collatePatterns");
  function Bg(t, e) {
    let r = 1, i = 1, s = Tl(t, r), o = /* @__PURE__ */ new Set([e]);
    for (; t <= s && s <= e; )
      o.add(s), r += 1, s = Tl(t, r);
    for (s = Al(e + 1, i) - 1; t < s && s <= e; )
      o.add(s), i += 1, s = Al(e + 1, i) - 1;
    return o = [...o], o.sort(Gg), o;
  }
  n(Bg, "splitToRanges");
  function Ug(t, e, r) {
    if (t === e)
      return { pattern: t, count: [], digits: 0 };
    let i = Wg(t, e), s = i.length, o = "", a = 0;
    for (let l = 0; l < s; l++) {
      let [c, u] = i[l];
      c === u ? o += c : c !== "0" || u !== "9" ? o += Vg(c, u, r) : a++;
    }
    return a && (o += r.shorthand === !0 ? "\\d" : "[0-9]"), { pattern: o, count: [a], digits: s };
  }
  n(Ug, "rangeToPattern");
  function wl(t, e, r, i) {
    let s = Bg(t, e), o = [], a = t, l;
    for (let c = 0; c < s.length; c++) {
      let u = s[c], h = Ug(String(a), String(u), i), m = "";
      if (!r.isPadded && l && l.pattern === h.pattern) {
        l.count.length > 1 && l.count.pop(), l.count.push(h.count[0]), l.string = l.pattern + Pl(l.count), a = u + 1;
        continue;
      }
      r.isPadded && (m = Yg(u, r, i)), h.string = m + h.pattern + Pl(h.count), o.push(h), a = u + 1, l = h;
    }
    return o;
  }
  n(wl, "splitToPatterns");
  function Xi(t, e, r, i, s) {
    let o = [];
    for (let a of t) {
      let { string: l } = a;
      !i && !Rl(e, "string", l) && o.push(r + l), i && Rl(e, "string", l) && o.push(r + l);
    }
    return o;
  }
  n(Xi, "filterPatterns");
  function Wg(t, e) {
    let r = [];
    for (let i = 0; i < t.length; i++) r.push([t[i], e[i]]);
    return r;
  }
  n(Wg, "zip");
  function Gg(t, e) {
    return t > e ? 1 : e > t ? -1 : 0;
  }
  n(Gg, "compare");
  function Rl(t, e, r) {
    return t.some((i) => i[e] === r);
  }
  n(Rl, "contains");
  function Tl(t, e) {
    return Number(String(t).slice(0, -e) + "9".repeat(e));
  }
  n(Tl, "countNines");
  function Al(t, e) {
    return t - t % Math.pow(10, e);
  }
  n(Al, "countZeros");
  function Pl(t) {
    let [e = 0, r = ""] = t;
    return r || e > 1 ? `{${e + (r ? "," + r : "")}}` : "";
  }
  n(Pl, "toQuantifier");
  function Vg(t, e, r) {
    return `[${t}${e - t === 1 ? "" : "-"}${e}]`;
  }
  n(Vg, "toCharacterClass");
  function Ol(t) {
    return /^-?(0+)\d/.test(t);
  }
  n(Ol, "hasPadding");
  function Yg(t, e, r) {
    if (!e.isPadded)
      return t;
    let i = Math.abs(e.maxLen - String(t).length), s = r.relaxZeros !== !1;
    switch (i) {
      case 0:
        return "";
      case 1:
        return s ? "0?" : "0";
      case 2:
        return s ? "0{0,2}" : "00";
      default:
        return s ? `0{0,${i}}` : `0{${i}}`;
    }
  }
  n(Yg, "padZeros");
  ht.cache = {};
  ht.clearCache = () => ht.cache = {};
  Cl.exports = ht;
});

// ../node_modules/fill-range/index.js
var es = f((wA, ql) => {
  "use strict";
  var zg = require("util"), Nl = Dl(), Il = /* @__PURE__ */ n((t) => t !== null && typeof t == "object" && !Array.isArray(t), "isObject"), Kg = /* @__PURE__ */ n(
  (t) => (e) => t === !0 ? Number(e) : String(e), "transform"), Zi = /* @__PURE__ */ n((t) => typeof t == "number" || typeof t == "string" &&
  t !== "", "isValidValue"), Vt = /* @__PURE__ */ n((t) => Number.isInteger(+t), "isNumber"), Ji = /* @__PURE__ */ n((t) => {
    let e = `${t}`, r = -1;
    if (e[0] === "-" && (e = e.slice(1)), e === "0") return !1;
    for (; e[++r] === "0"; ) ;
    return r > 0;
  }, "zeros"), Qg = /* @__PURE__ */ n((t, e, r) => typeof t == "string" || typeof e == "string" ? !0 : r.stringify === !0, "stringify"), Xg = /* @__PURE__ */ n(
  (t, e, r) => {
    if (e > 0) {
      let i = t[0] === "-" ? "-" : "";
      i && (t = t.slice(1)), t = i + t.padStart(i ? e - 1 : e, "0");
    }
    return r === !1 ? String(t) : t;
  }, "pad"), Or = /* @__PURE__ */ n((t, e) => {
    let r = t[0] === "-" ? "-" : "";
    for (r && (t = t.slice(1), e--); t.length < e; ) t = "0" + t;
    return r ? "-" + t : t;
  }, "toMaxLen"), Zg = /* @__PURE__ */ n((t, e, r) => {
    t.negatives.sort((l, c) => l < c ? -1 : l > c ? 1 : 0), t.positives.sort((l, c) => l < c ? -1 : l > c ? 1 : 0);
    let i = e.capture ? "" : "?:", s = "", o = "", a;
    return t.positives.length && (s = t.positives.map((l) => Or(String(l), r)).join("|")), t.negatives.length && (o = `-(${i}${t.negatives.map(
    (l) => Or(String(l), r)).join("|")})`), s && o ? a = `${s}|${o}` : a = s || o, e.wrap ? `(${i}${a})` : a;
  }, "toSequence"), Ll = /* @__PURE__ */ n((t, e, r, i) => {
    if (r)
      return Nl(t, e, { wrap: !1, ...i });
    let s = String.fromCharCode(t);
    if (t === e) return s;
    let o = String.fromCharCode(e);
    return `[${s}-${o}]`;
  }, "toRange"), kl = /* @__PURE__ */ n((t, e, r) => {
    if (Array.isArray(t)) {
      let i = r.wrap === !0, s = r.capture ? "" : "?:";
      return i ? `(${s}${t.join("|")})` : t.join("|");
    }
    return Nl(t, e, r);
  }, "toRegex"), $l = /* @__PURE__ */ n((...t) => new RangeError("Invalid range arguments: " + zg.inspect(...t)), "rangeError"), Ml = /* @__PURE__ */ n(
  (t, e, r) => {
    if (r.strictRanges === !0) throw $l([t, e]);
    return [];
  }, "invalidRange"), Jg = /* @__PURE__ */ n((t, e) => {
    if (e.strictRanges === !0)
      throw new TypeError(`Expected step "${t}" to be a number`);
    return [];
  }, "invalidStep"), ey = /* @__PURE__ */ n((t, e, r = 1, i = {}) => {
    let s = Number(t), o = Number(e);
    if (!Number.isInteger(s) || !Number.isInteger(o)) {
      if (i.strictRanges === !0) throw $l([t, e]);
      return [];
    }
    s === 0 && (s = 0), o === 0 && (o = 0);
    let a = s > o, l = String(t), c = String(e), u = String(r);
    r = Math.max(Math.abs(r), 1);
    let h = Ji(l) || Ji(c) || Ji(u), m = h ? Math.max(l.length, c.length, u.length) : 0, p = h === !1 && Qg(t, e, i) === !1, v = i.transform ||
    Kg(p);
    if (i.toRegex && r === 1)
      return Ll(Or(t, m), Or(e, m), !0, i);
    let g = { negatives: [], positives: [] }, b = /* @__PURE__ */ n((k) => g[k < 0 ? "negatives" : "positives"].push(Math.abs(k)), "push"), R = [],
    T = 0;
    for (; a ? s >= o : s <= o; )
      i.toRegex === !0 && r > 1 ? b(s) : R.push(Xg(v(s, T), m, p)), s = a ? s - r : s + r, T++;
    return i.toRegex === !0 ? r > 1 ? Zg(g, i, m) : kl(R, null, { wrap: !1, ...i }) : R;
  }, "fillNumbers"), ty = /* @__PURE__ */ n((t, e, r = 1, i = {}) => {
    if (!Vt(t) && t.length > 1 || !Vt(e) && e.length > 1)
      return Ml(t, e, i);
    let s = i.transform || ((p) => String.fromCharCode(p)), o = `${t}`.charCodeAt(0), a = `${e}`.charCodeAt(0), l = o > a, c = Math.min(o, a),
    u = Math.max(o, a);
    if (i.toRegex && r === 1)
      return Ll(c, u, !1, i);
    let h = [], m = 0;
    for (; l ? o >= a : o <= a; )
      h.push(s(o, m)), o = l ? o - r : o + r, m++;
    return i.toRegex === !0 ? kl(h, null, { wrap: !1, options: i }) : h;
  }, "fillLetters"), Pr = /* @__PURE__ */ n((t, e, r, i = {}) => {
    if (e == null && Zi(t))
      return [t];
    if (!Zi(t) || !Zi(e))
      return Ml(t, e, i);
    if (typeof r == "function")
      return Pr(t, e, 1, { transform: r });
    if (Il(r))
      return Pr(t, e, 0, r);
    let s = { ...i };
    return s.capture === !0 && (s.wrap = !0), r = r || s.step || 1, Vt(r) ? Vt(t) && Vt(e) ? ey(t, e, r, s) : ty(t, e, Math.max(Math.abs(r),
    1), s) : r != null && !Il(r) ? Jg(r, s) : Pr(t, e, 1, r);
  }, "fill");
  ql.exports = Pr;
});

// ../node_modules/braces/lib/compile.js
var Hl = f((TA, jl) => {
  "use strict";
  var ry = es(), Fl = Tr(), iy = /* @__PURE__ */ n((t, e = {}) => {
    let r = /* @__PURE__ */ n((i, s = {}) => {
      let o = Fl.isInvalidBrace(s), a = i.invalid === !0 && e.escapeInvalid === !0, l = o === !0 || a === !0, c = e.escapeInvalid === !0 ? "\
\\" : "", u = "";
      if (i.isOpen === !0)
        return c + i.value;
      if (i.isClose === !0)
        return console.log("node.isClose", c, i.value), c + i.value;
      if (i.type === "open")
        return l ? c + i.value : "(";
      if (i.type === "close")
        return l ? c + i.value : ")";
      if (i.type === "comma")
        return i.prev.type === "comma" ? "" : l ? i.value : "|";
      if (i.value)
        return i.value;
      if (i.nodes && i.ranges > 0) {
        let h = Fl.reduce(i.nodes), m = ry(...h, { ...e, wrap: !1, toRegex: !0, strictZeros: !0 });
        if (m.length !== 0)
          return h.length > 1 && m.length > 1 ? `(${m})` : m;
      }
      if (i.nodes)
        for (let h of i.nodes)
          u += r(h, i);
      return u;
    }, "walk");
    return r(t);
  }, "compile");
  jl.exports = iy;
});

// ../node_modules/braces/lib/expand.js
var Wl = f((PA, Ul) => {
  "use strict";
  var sy = es(), Bl = Ar(), wt = Tr(), pt = /* @__PURE__ */ n((t = "", e = "", r = !1) => {
    let i = [];
    if (t = [].concat(t), e = [].concat(e), !e.length) return t;
    if (!t.length)
      return r ? wt.flatten(e).map((s) => `{${s}}`) : e;
    for (let s of t)
      if (Array.isArray(s))
        for (let o of s)
          i.push(pt(o, e, r));
      else
        for (let o of e)
          r === !0 && typeof o == "string" && (o = `{${o}}`), i.push(Array.isArray(o) ? pt(s, o, r) : s + o);
    return wt.flatten(i);
  }, "append"), ny = /* @__PURE__ */ n((t, e = {}) => {
    let r = e.rangeLimit === void 0 ? 1e3 : e.rangeLimit, i = /* @__PURE__ */ n((s, o = {}) => {
      s.queue = [];
      let a = o, l = o.queue;
      for (; a.type !== "brace" && a.type !== "root" && a.parent; )
        a = a.parent, l = a.queue;
      if (s.invalid || s.dollar) {
        l.push(pt(l.pop(), Bl(s, e)));
        return;
      }
      if (s.type === "brace" && s.invalid !== !0 && s.nodes.length === 2) {
        l.push(pt(l.pop(), ["{}"]));
        return;
      }
      if (s.nodes && s.ranges > 0) {
        let m = wt.reduce(s.nodes);
        if (wt.exceedsLimit(...m, e.step, r))
          throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
        let p = sy(...m, e);
        p.length === 0 && (p = Bl(s, e)), l.push(pt(l.pop(), p)), s.nodes = [];
        return;
      }
      let c = wt.encloseBrace(s), u = s.queue, h = s;
      for (; h.type !== "brace" && h.type !== "root" && h.parent; )
        h = h.parent, u = h.queue;
      for (let m = 0; m < s.nodes.length; m++) {
        let p = s.nodes[m];
        if (p.type === "comma" && s.type === "brace") {
          m === 1 && u.push(""), u.push("");
          continue;
        }
        if (p.type === "close") {
          l.push(pt(l.pop(), u, c));
          continue;
        }
        if (p.value && p.type !== "open") {
          u.push(pt(u.pop(), p.value));
          continue;
        }
        p.nodes && i(p, s);
      }
      return u;
    }, "walk");
    return wt.flatten(i(t));
  }, "expand");
  Ul.exports = ny;
});

// ../node_modules/braces/lib/constants.js
var Vl = f((CA, Gl) => {
  "use strict";
  Gl.exports = {
    MAX_LENGTH: 1e4,
    // Digits
    CHAR_0: "0",
    /* 0 */
    CHAR_9: "9",
    /* 9 */
    // Alphabet chars.
    CHAR_UPPERCASE_A: "A",
    /* A */
    CHAR_LOWERCASE_A: "a",
    /* a */
    CHAR_UPPERCASE_Z: "Z",
    /* Z */
    CHAR_LOWERCASE_Z: "z",
    /* z */
    CHAR_LEFT_PARENTHESES: "(",
    /* ( */
    CHAR_RIGHT_PARENTHESES: ")",
    /* ) */
    CHAR_ASTERISK: "*",
    /* * */
    // Non-alphabetic chars.
    CHAR_AMPERSAND: "&",
    /* & */
    CHAR_AT: "@",
    /* @ */
    CHAR_BACKSLASH: "\\",
    /* \ */
    CHAR_BACKTICK: "`",
    /* ` */
    CHAR_CARRIAGE_RETURN: "\r",
    /* \r */
    CHAR_CIRCUMFLEX_ACCENT: "^",
    /* ^ */
    CHAR_COLON: ":",
    /* : */
    CHAR_COMMA: ",",
    /* , */
    CHAR_DOLLAR: "$",
    /* . */
    CHAR_DOT: ".",
    /* . */
    CHAR_DOUBLE_QUOTE: '"',
    /* " */
    CHAR_EQUAL: "=",
    /* = */
    CHAR_EXCLAMATION_MARK: "!",
    /* ! */
    CHAR_FORM_FEED: "\f",
    /* \f */
    CHAR_FORWARD_SLASH: "/",
    /* / */
    CHAR_HASH: "#",
    /* # */
    CHAR_HYPHEN_MINUS: "-",
    /* - */
    CHAR_LEFT_ANGLE_BRACKET: "<",
    /* < */
    CHAR_LEFT_CURLY_BRACE: "{",
    /* { */
    CHAR_LEFT_SQUARE_BRACKET: "[",
    /* [ */
    CHAR_LINE_FEED: `
`,
    /* \n */
    CHAR_NO_BREAK_SPACE: "\xA0",
    /* \u00A0 */
    CHAR_PERCENT: "%",
    /* % */
    CHAR_PLUS: "+",
    /* + */
    CHAR_QUESTION_MARK: "?",
    /* ? */
    CHAR_RIGHT_ANGLE_BRACKET: ">",
    /* > */
    CHAR_RIGHT_CURLY_BRACE: "}",
    /* } */
    CHAR_RIGHT_SQUARE_BRACKET: "]",
    /* ] */
    CHAR_SEMICOLON: ";",
    /* ; */
    CHAR_SINGLE_QUOTE: "'",
    /* ' */
    CHAR_SPACE: " ",
    /*   */
    CHAR_TAB: "	",
    /* \t */
    CHAR_UNDERSCORE: "_",
    /* _ */
    CHAR_VERTICAL_LINE: "|",
    /* | */
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\uFEFF"
    /* \uFEFF */
  };
});

// ../node_modules/braces/lib/parse.js
var Xl = f((DA, Ql) => {
  "use strict";
  var oy = Ar(), {
    MAX_LENGTH: Yl,
    CHAR_BACKSLASH: ts,
    /* \ */
    CHAR_BACKTICK: ay,
    /* ` */
    CHAR_COMMA: ly,
    /* , */
    CHAR_DOT: cy,
    /* . */
    CHAR_LEFT_PARENTHESES: uy,
    /* ( */
    CHAR_RIGHT_PARENTHESES: hy,
    /* ) */
    CHAR_LEFT_CURLY_BRACE: py,
    /* { */
    CHAR_RIGHT_CURLY_BRACE: dy,
    /* } */
    CHAR_LEFT_SQUARE_BRACKET: zl,
    /* [ */
    CHAR_RIGHT_SQUARE_BRACKET: Kl,
    /* ] */
    CHAR_DOUBLE_QUOTE: fy,
    /* " */
    CHAR_SINGLE_QUOTE: my,
    /* ' */
    CHAR_NO_BREAK_SPACE: gy,
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: yy
  } = Vl(), xy = /* @__PURE__ */ n((t, e = {}) => {
    if (typeof t != "string")
      throw new TypeError("Expected a string");
    let r = e || {}, i = typeof r.maxLength == "number" ? Math.min(Yl, r.maxLength) : Yl;
    if (t.length > i)
      throw new SyntaxError(`Input length (${t.length}), exceeds max characters (${i})`);
    let s = { type: "root", input: t, nodes: [] }, o = [s], a = s, l = s, c = 0, u = t.length, h = 0, m = 0, p, v = /* @__PURE__ */ n(() => t[h++],
    "advance"), g = /* @__PURE__ */ n((b) => {
      if (b.type === "text" && l.type === "dot" && (l.type = "text"), l && l.type === "text" && b.type === "text") {
        l.value += b.value;
        return;
      }
      return a.nodes.push(b), b.parent = a, b.prev = l, l = b, b;
    }, "push");
    for (g({ type: "bos" }); h < u; )
      if (a = o[o.length - 1], p = v(), !(p === yy || p === gy)) {
        if (p === ts) {
          g({ type: "text", value: (e.keepEscaping ? p : "") + v() });
          continue;
        }
        if (p === Kl) {
          g({ type: "text", value: "\\" + p });
          continue;
        }
        if (p === zl) {
          c++;
          let b;
          for (; h < u && (b = v()); ) {
            if (p += b, b === zl) {
              c++;
              continue;
            }
            if (b === ts) {
              p += v();
              continue;
            }
            if (b === Kl && (c--, c === 0))
              break;
          }
          g({ type: "text", value: p });
          continue;
        }
        if (p === uy) {
          a = g({ type: "paren", nodes: [] }), o.push(a), g({ type: "text", value: p });
          continue;
        }
        if (p === hy) {
          if (a.type !== "paren") {
            g({ type: "text", value: p });
            continue;
          }
          a = o.pop(), g({ type: "text", value: p }), a = o[o.length - 1];
          continue;
        }
        if (p === fy || p === my || p === ay) {
          let b = p, R;
          for (e.keepQuotes !== !0 && (p = ""); h < u && (R = v()); ) {
            if (R === ts) {
              p += R + v();
              continue;
            }
            if (R === b) {
              e.keepQuotes === !0 && (p += R);
              break;
            }
            p += R;
          }
          g({ type: "text", value: p });
          continue;
        }
        if (p === py) {
          m++;
          let R = {
            type: "brace",
            open: !0,
            close: !1,
            dollar: l.value && l.value.slice(-1) === "$" || a.dollar === !0,
            depth: m,
            commas: 0,
            ranges: 0,
            nodes: []
          };
          a = g(R), o.push(a), g({ type: "open", value: p });
          continue;
        }
        if (p === dy) {
          if (a.type !== "brace") {
            g({ type: "text", value: p });
            continue;
          }
          let b = "close";
          a = o.pop(), a.close = !0, g({ type: b, value: p }), m--, a = o[o.length - 1];
          continue;
        }
        if (p === ly && m > 0) {
          if (a.ranges > 0) {
            a.ranges = 0;
            let b = a.nodes.shift();
            a.nodes = [b, { type: "text", value: oy(a) }];
          }
          g({ type: "comma", value: p }), a.commas++;
          continue;
        }
        if (p === cy && m > 0 && a.commas === 0) {
          let b = a.nodes;
          if (m === 0 || b.length === 0) {
            g({ type: "text", value: p });
            continue;
          }
          if (l.type === "dot") {
            if (a.range = [], l.value += p, l.type = "range", a.nodes.length !== 3 && a.nodes.length !== 5) {
              a.invalid = !0, a.ranges = 0, l.type = "text";
              continue;
            }
            a.ranges++, a.args = [];
            continue;
          }
          if (l.type === "range") {
            b.pop();
            let R = b[b.length - 1];
            R.value += l.value + p, l = R, a.ranges--;
            continue;
          }
          g({ type: "dot", value: p });
          continue;
        }
        g({ type: "text", value: p });
      }
    do
      if (a = o.pop(), a.type !== "root") {
        a.nodes.forEach((T) => {
          T.nodes || (T.type === "open" && (T.isOpen = !0), T.type === "close" && (T.isClose = !0), T.nodes || (T.type = "text"), T.invalid =
          !0);
        });
        let b = o[o.length - 1], R = b.nodes.indexOf(a);
        b.nodes.splice(R, 1, ...a.nodes);
      }
    while (o.length > 0);
    return g({ type: "eos" }), s;
  }, "parse");
  Ql.exports = xy;
});

// ../node_modules/braces/index.js
var ec = f((NA, Jl) => {
  "use strict";
  var Zl = Ar(), _y = Hl(), by = Wl(), Ey = Xl(), he = /* @__PURE__ */ n((t, e = {}) => {
    let r = [];
    if (Array.isArray(t))
      for (let i of t) {
        let s = he.create(i, e);
        Array.isArray(s) ? r.push(...s) : r.push(s);
      }
    else
      r = [].concat(he.create(t, e));
    return e && e.expand === !0 && e.nodupes === !0 && (r = [...new Set(r)]), r;
  }, "braces");
  he.parse = (t, e = {}) => Ey(t, e);
  he.stringify = (t, e = {}) => Zl(typeof t == "string" ? he.parse(t, e) : t, e);
  he.compile = (t, e = {}) => (typeof t == "string" && (t = he.parse(t, e)), _y(t, e));
  he.expand = (t, e = {}) => {
    typeof t == "string" && (t = he.parse(t, e));
    let r = by(t, e);
    return e.noempty === !0 && (r = r.filter(Boolean)), e.nodupes === !0 && (r = [...new Set(r)]), r;
  };
  he.create = (t, e = {}) => t === "" || t.length < 3 ? [t] : e.expand !== !0 ? he.compile(t, e) : he.expand(t, e);
  Jl.exports = he;
});

// ../node_modules/picomatch/lib/constants.js
var Yt = f((kA, nc) => {
  "use strict";
  var Sy = require("path"), De = "\\\\/", tc = `[^${De}]`, He = "\\.", vy = "\\+", wy = "\\?", Cr = "\\/", Ry = "(?=.)", rc = "[^/]", rs = `\
(?:${Cr}|$)`, ic = `(?:^|${Cr})`, is = `${He}{1,2}${rs}`, Ty = `(?!${He})`, Ay = `(?!${ic}${is})`, Py = `(?!${He}{0,1}${rs})`, Oy = `(?!${is}\
)`, Cy = `[^.${Cr}]`, Dy = `${rc}*?`, sc = {
    DOT_LITERAL: He,
    PLUS_LITERAL: vy,
    QMARK_LITERAL: wy,
    SLASH_LITERAL: Cr,
    ONE_CHAR: Ry,
    QMARK: rc,
    END_ANCHOR: rs,
    DOTS_SLASH: is,
    NO_DOT: Ty,
    NO_DOTS: Ay,
    NO_DOT_SLASH: Py,
    NO_DOTS_SLASH: Oy,
    QMARK_NO_DOT: Cy,
    STAR: Dy,
    START_ANCHOR: ic
  }, Iy = {
    ...sc,
    SLASH_LITERAL: `[${De}]`,
    QMARK: tc,
    STAR: `${tc}*?`,
    DOTS_SLASH: `${He}{1,2}(?:[${De}]|$)`,
    NO_DOT: `(?!${He})`,
    NO_DOTS: `(?!(?:^|[${De}])${He}{1,2}(?:[${De}]|$))`,
    NO_DOT_SLASH: `(?!${He}{0,1}(?:[${De}]|$))`,
    NO_DOTS_SLASH: `(?!${He}{1,2}(?:[${De}]|$))`,
    QMARK_NO_DOT: `[^.${De}]`,
    START_ANCHOR: `(?:^|[${De}])`,
    END_ANCHOR: `(?:[${De}]|$)`
  }, Ny = {
    alnum: "a-zA-Z0-9",
    alpha: "a-zA-Z",
    ascii: "\\x00-\\x7F",
    blank: " \\t",
    cntrl: "\\x00-\\x1F\\x7F",
    digit: "0-9",
    graph: "\\x21-\\x7E",
    lower: "a-z",
    print: "\\x20-\\x7E ",
    punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
    space: " \\t\\r\\n\\v\\f",
    upper: "A-Z",
    word: "A-Za-z0-9_",
    xdigit: "A-Fa-f0-9"
  };
  nc.exports = {
    MAX_LENGTH: 1024 * 64,
    POSIX_REGEX_SOURCE: Ny,
    // regular expressions
    REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
    REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
    REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
    REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
    REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
    REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
    // Replace globs with equivalent patterns to reduce parsing time.
    REPLACEMENTS: {
      "***": "*",
      "**/**": "**",
      "**/**/**": "**"
    },
    // Digits
    CHAR_0: 48,
    /* 0 */
    CHAR_9: 57,
    /* 9 */
    // Alphabet chars.
    CHAR_UPPERCASE_A: 65,
    /* A */
    CHAR_LOWERCASE_A: 97,
    /* a */
    CHAR_UPPERCASE_Z: 90,
    /* Z */
    CHAR_LOWERCASE_Z: 122,
    /* z */
    CHAR_LEFT_PARENTHESES: 40,
    /* ( */
    CHAR_RIGHT_PARENTHESES: 41,
    /* ) */
    CHAR_ASTERISK: 42,
    /* * */
    // Non-alphabetic chars.
    CHAR_AMPERSAND: 38,
    /* & */
    CHAR_AT: 64,
    /* @ */
    CHAR_BACKWARD_SLASH: 92,
    /* \ */
    CHAR_CARRIAGE_RETURN: 13,
    /* \r */
    CHAR_CIRCUMFLEX_ACCENT: 94,
    /* ^ */
    CHAR_COLON: 58,
    /* : */
    CHAR_COMMA: 44,
    /* , */
    CHAR_DOT: 46,
    /* . */
    CHAR_DOUBLE_QUOTE: 34,
    /* " */
    CHAR_EQUAL: 61,
    /* = */
    CHAR_EXCLAMATION_MARK: 33,
    /* ! */
    CHAR_FORM_FEED: 12,
    /* \f */
    CHAR_FORWARD_SLASH: 47,
    /* / */
    CHAR_GRAVE_ACCENT: 96,
    /* ` */
    CHAR_HASH: 35,
    /* # */
    CHAR_HYPHEN_MINUS: 45,
    /* - */
    CHAR_LEFT_ANGLE_BRACKET: 60,
    /* < */
    CHAR_LEFT_CURLY_BRACE: 123,
    /* { */
    CHAR_LEFT_SQUARE_BRACKET: 91,
    /* [ */
    CHAR_LINE_FEED: 10,
    /* \n */
    CHAR_NO_BREAK_SPACE: 160,
    /* \u00A0 */
    CHAR_PERCENT: 37,
    /* % */
    CHAR_PLUS: 43,
    /* + */
    CHAR_QUESTION_MARK: 63,
    /* ? */
    CHAR_RIGHT_ANGLE_BRACKET: 62,
    /* > */
    CHAR_RIGHT_CURLY_BRACE: 125,
    /* } */
    CHAR_RIGHT_SQUARE_BRACKET: 93,
    /* ] */
    CHAR_SEMICOLON: 59,
    /* ; */
    CHAR_SINGLE_QUOTE: 39,
    /* ' */
    CHAR_SPACE: 32,
    /*   */
    CHAR_TAB: 9,
    /* \t */
    CHAR_UNDERSCORE: 95,
    /* _ */
    CHAR_VERTICAL_LINE: 124,
    /* | */
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
    /* \uFEFF */
    SEP: Sy.sep,
    /**
     * Create EXTGLOB_CHARS
     */
    extglobChars(t) {
      return {
        "!": { type: "negate", open: "(?:(?!(?:", close: `))${t.STAR})` },
        "?": { type: "qmark", open: "(?:", close: ")?" },
        "+": { type: "plus", open: "(?:", close: ")+" },
        "*": { type: "star", open: "(?:", close: ")*" },
        "@": { type: "at", open: "(?:", close: ")" }
      };
    },
    /**
     * Create GLOB_CHARS
     */
    globChars(t) {
      return t === !0 ? Iy : sc;
    }
  };
});

// ../node_modules/picomatch/lib/utils.js
var zt = f((ae) => {
  "use strict";
  var Ly = require("path"), ky = process.platform === "win32", {
    REGEX_BACKSLASH: $y,
    REGEX_REMOVE_BACKSLASH: My,
    REGEX_SPECIAL_CHARS: qy,
    REGEX_SPECIAL_CHARS_GLOBAL: Fy
  } = Yt();
  ae.isObject = (t) => t !== null && typeof t == "object" && !Array.isArray(t);
  ae.hasRegexChars = (t) => qy.test(t);
  ae.isRegexChar = (t) => t.length === 1 && ae.hasRegexChars(t);
  ae.escapeRegex = (t) => t.replace(Fy, "\\$1");
  ae.toPosixSlashes = (t) => t.replace($y, "/");
  ae.removeBackslashes = (t) => t.replace(My, (e) => e === "\\" ? "" : e);
  ae.supportsLookbehinds = () => {
    let t = process.version.slice(1).split(".").map(Number);
    return t.length === 3 && t[0] >= 9 || t[0] === 8 && t[1] >= 10;
  };
  ae.isWindows = (t) => t && typeof t.windows == "boolean" ? t.windows : ky === !0 || Ly.sep === "\\";
  ae.escapeLast = (t, e, r) => {
    let i = t.lastIndexOf(e, r);
    return i === -1 ? t : t[i - 1] === "\\" ? ae.escapeLast(t, e, i - 1) : `${t.slice(0, i)}\\${t.slice(i)}`;
  };
  ae.removePrefix = (t, e = {}) => {
    let r = t;
    return r.startsWith("./") && (r = r.slice(2), e.prefix = "./"), r;
  };
  ae.wrapOutput = (t, e = {}, r = {}) => {
    let i = r.contains ? "" : "^", s = r.contains ? "" : "$", o = `${i}(?:${t})${s}`;
    return e.negated === !0 && (o = `(?:^(?!${o}).*$)`), o;
  };
});

// ../node_modules/picomatch/lib/scan.js
var dc = f((MA, pc) => {
  "use strict";
  var oc = zt(), {
    CHAR_ASTERISK: ss,
    /* * */
    CHAR_AT: jy,
    /* @ */
    CHAR_BACKWARD_SLASH: Kt,
    /* \ */
    CHAR_COMMA: Hy,
    /* , */
    CHAR_DOT: ns,
    /* . */
    CHAR_EXCLAMATION_MARK: os,
    /* ! */
    CHAR_FORWARD_SLASH: hc,
    /* / */
    CHAR_LEFT_CURLY_BRACE: as,
    /* { */
    CHAR_LEFT_PARENTHESES: ls,
    /* ( */
    CHAR_LEFT_SQUARE_BRACKET: By,
    /* [ */
    CHAR_PLUS: Uy,
    /* + */
    CHAR_QUESTION_MARK: ac,
    /* ? */
    CHAR_RIGHT_CURLY_BRACE: Wy,
    /* } */
    CHAR_RIGHT_PARENTHESES: lc,
    /* ) */
    CHAR_RIGHT_SQUARE_BRACKET: Gy
    /* ] */
  } = Yt(), cc = /* @__PURE__ */ n((t) => t === hc || t === Kt, "isPathSeparator"), uc = /* @__PURE__ */ n((t) => {
    t.isPrefix !== !0 && (t.depth = t.isGlobstar ? 1 / 0 : 1);
  }, "depth"), Vy = /* @__PURE__ */ n((t, e) => {
    let r = e || {}, i = t.length - 1, s = r.parts === !0 || r.scanToEnd === !0, o = [], a = [], l = [], c = t, u = -1, h = 0, m = 0, p = !1,
    v = !1, g = !1, b = !1, R = !1, T = !1, k = !1, D = !1, H = !1, C = !1, N = 0, O, P, M = { value: "", depth: 0, isGlob: !1 }, ee = /* @__PURE__ */ n(
    () => u >= i, "eos"), _ = /* @__PURE__ */ n(() => c.charCodeAt(u + 1), "peek"), V = /* @__PURE__ */ n(() => (O = P, c.charCodeAt(++u)), "\
advance");
    for (; u < i; ) {
      P = V();
      let se;
      if (P === Kt) {
        k = M.backslashes = !0, P = V(), P === as && (T = !0);
        continue;
      }
      if (T === !0 || P === as) {
        for (N++; ee() !== !0 && (P = V()); ) {
          if (P === Kt) {
            k = M.backslashes = !0, V();
            continue;
          }
          if (P === as) {
            N++;
            continue;
          }
          if (T !== !0 && P === ns && (P = V()) === ns) {
            if (p = M.isBrace = !0, g = M.isGlob = !0, C = !0, s === !0)
              continue;
            break;
          }
          if (T !== !0 && P === Hy) {
            if (p = M.isBrace = !0, g = M.isGlob = !0, C = !0, s === !0)
              continue;
            break;
          }
          if (P === Wy && (N--, N === 0)) {
            T = !1, p = M.isBrace = !0, C = !0;
            break;
          }
        }
        if (s === !0)
          continue;
        break;
      }
      if (P === hc) {
        if (o.push(u), a.push(M), M = { value: "", depth: 0, isGlob: !1 }, C === !0) continue;
        if (O === ns && u === h + 1) {
          h += 2;
          continue;
        }
        m = u + 1;
        continue;
      }
      if (r.noext !== !0 && (P === Uy || P === jy || P === ss || P === ac || P === os) === !0 && _() === ls) {
        if (g = M.isGlob = !0, b = M.isExtglob = !0, C = !0, P === os && u === h && (H = !0), s === !0) {
          for (; ee() !== !0 && (P = V()); ) {
            if (P === Kt) {
              k = M.backslashes = !0, P = V();
              continue;
            }
            if (P === lc) {
              g = M.isGlob = !0, C = !0;
              break;
            }
          }
          continue;
        }
        break;
      }
      if (P === ss) {
        if (O === ss && (R = M.isGlobstar = !0), g = M.isGlob = !0, C = !0, s === !0)
          continue;
        break;
      }
      if (P === ac) {
        if (g = M.isGlob = !0, C = !0, s === !0)
          continue;
        break;
      }
      if (P === By) {
        for (; ee() !== !0 && (se = V()); ) {
          if (se === Kt) {
            k = M.backslashes = !0, V();
            continue;
          }
          if (se === Gy) {
            v = M.isBracket = !0, g = M.isGlob = !0, C = !0;
            break;
          }
        }
        if (s === !0)
          continue;
        break;
      }
      if (r.nonegate !== !0 && P === os && u === h) {
        D = M.negated = !0, h++;
        continue;
      }
      if (r.noparen !== !0 && P === ls) {
        if (g = M.isGlob = !0, s === !0) {
          for (; ee() !== !0 && (P = V()); ) {
            if (P === ls) {
              k = M.backslashes = !0, P = V();
              continue;
            }
            if (P === lc) {
              C = !0;
              break;
            }
          }
          continue;
        }
        break;
      }
      if (g === !0) {
        if (C = !0, s === !0)
          continue;
        break;
      }
    }
    r.noext === !0 && (b = !1, g = !1);
    let U = c, Xe = "", y = "";
    h > 0 && (Xe = c.slice(0, h), c = c.slice(h), m -= h), U && g === !0 && m > 0 ? (U = c.slice(0, m), y = c.slice(m)) : g === !0 ? (U = "",
    y = c) : U = c, U && U !== "" && U !== "/" && U !== c && cc(U.charCodeAt(U.length - 1)) && (U = U.slice(0, -1)), r.unescape === !0 && (y &&
    (y = oc.removeBackslashes(y)), U && k === !0 && (U = oc.removeBackslashes(U)));
    let x = {
      prefix: Xe,
      input: t,
      start: h,
      base: U,
      glob: y,
      isBrace: p,
      isBracket: v,
      isGlob: g,
      isExtglob: b,
      isGlobstar: R,
      negated: D,
      negatedExtglob: H
    };
    if (r.tokens === !0 && (x.maxDepth = 0, cc(P) || a.push(M), x.tokens = a), r.parts === !0 || r.tokens === !0) {
      let se;
      for (let $ = 0; $ < o.length; $++) {
        let Pe = se ? se + 1 : h, Oe = o[$], ue = t.slice(Pe, Oe);
        r.tokens && ($ === 0 && h !== 0 ? (a[$].isPrefix = !0, a[$].value = Xe) : a[$].value = ue, uc(a[$]), x.maxDepth += a[$].depth), ($ !==
        0 || ue !== "") && l.push(ue), se = Oe;
      }
      if (se && se + 1 < t.length) {
        let $ = t.slice(se + 1);
        l.push($), r.tokens && (a[a.length - 1].value = $, uc(a[a.length - 1]), x.maxDepth += a[a.length - 1].depth);
      }
      x.slashes = o, x.parts = l;
    }
    return x;
  }, "scan");
  pc.exports = Vy;
});

// ../node_modules/picomatch/lib/parse.js
var gc = f((FA, mc) => {
  "use strict";
  var Dr = Yt(), pe = zt(), {
    MAX_LENGTH: Ir,
    POSIX_REGEX_SOURCE: Yy,
    REGEX_NON_SPECIAL_CHARS: zy,
    REGEX_SPECIAL_CHARS_BACKREF: Ky,
    REPLACEMENTS: fc
  } = Dr, Qy = /* @__PURE__ */ n((t, e) => {
    if (typeof e.expandRange == "function")
      return e.expandRange(...t, e);
    t.sort();
    let r = `[${t.join("-")}]`;
    try {
      new RegExp(r);
    } catch {
      return t.map((s) => pe.escapeRegex(s)).join("..");
    }
    return r;
  }, "expandRange"), Rt = /* @__PURE__ */ n((t, e) => `Missing ${t}: "${e}" - use "\\\\${e}" to match literal characters`, "syntaxError"), cs = /* @__PURE__ */ n(
  (t, e) => {
    if (typeof t != "string")
      throw new TypeError("Expected a string");
    t = fc[t] || t;
    let r = { ...e }, i = typeof r.maxLength == "number" ? Math.min(Ir, r.maxLength) : Ir, s = t.length;
    if (s > i)
      throw new SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${i}`);
    let o = { type: "bos", value: "", output: r.prepend || "" }, a = [o], l = r.capture ? "" : "?:", c = pe.isWindows(e), u = Dr.globChars(c),
    h = Dr.extglobChars(u), {
      DOT_LITERAL: m,
      PLUS_LITERAL: p,
      SLASH_LITERAL: v,
      ONE_CHAR: g,
      DOTS_SLASH: b,
      NO_DOT: R,
      NO_DOT_SLASH: T,
      NO_DOTS_SLASH: k,
      QMARK: D,
      QMARK_NO_DOT: H,
      STAR: C,
      START_ANCHOR: N
    } = u, O = /* @__PURE__ */ n((S) => `(${l}(?:(?!${N}${S.dot ? b : m}).)*?)`, "globstar"), P = r.dot ? "" : R, M = r.dot ? D : H, ee = r.
    bash === !0 ? O(r) : C;
    r.capture && (ee = `(${ee})`), typeof r.noext == "boolean" && (r.noextglob = r.noext);
    let _ = {
      input: t,
      index: -1,
      start: 0,
      dot: r.dot === !0,
      consumed: "",
      output: "",
      prefix: "",
      backtrack: !1,
      negated: !1,
      brackets: 0,
      braces: 0,
      parens: 0,
      quotes: 0,
      globstar: !1,
      tokens: a
    };
    t = pe.removePrefix(t, _), s = t.length;
    let V = [], U = [], Xe = [], y = o, x, se = /* @__PURE__ */ n(() => _.index === s - 1, "eos"), $ = _.peek = (S = 1) => t[_.index + S], Pe = _.
    advance = () => t[++_.index] || "", Oe = /* @__PURE__ */ n(() => t.slice(_.index + 1), "remaining"), ue = /* @__PURE__ */ n((S = "", W = 0) => {
      _.consumed += S, _.index += W;
    }, "consume"), fr = /* @__PURE__ */ n((S) => {
      _.output += S.output != null ? S.output : S.value, ue(S.value);
    }, "append"), zm = /* @__PURE__ */ n(() => {
      let S = 1;
      for (; $() === "!" && ($(2) !== "(" || $(3) === "?"); )
        Pe(), _.start++, S++;
      return S % 2 === 0 ? !1 : (_.negated = !0, _.start++, !0);
    }, "negate"), mr = /* @__PURE__ */ n((S) => {
      _[S]++, Xe.push(S);
    }, "increment"), ct = /* @__PURE__ */ n((S) => {
      _[S]--, Xe.pop();
    }, "decrement"), L = /* @__PURE__ */ n((S) => {
      if (y.type === "globstar") {
        let W = _.braces > 0 && (S.type === "comma" || S.type === "brace"), E = S.extglob === !0 || V.length && (S.type === "pipe" || S.type ===
        "paren");
        S.type !== "slash" && S.type !== "paren" && !W && !E && (_.output = _.output.slice(0, -y.output.length), y.type = "star", y.value = "\
*", y.output = ee, _.output += y.output);
      }
      if (V.length && S.type !== "paren" && (V[V.length - 1].inner += S.value), (S.value || S.output) && fr(S), y && y.type === "text" && S.
      type === "text") {
        y.value += S.value, y.output = (y.output || "") + S.value;
        return;
      }
      S.prev = y, a.push(S), y = S;
    }, "push"), gr = /* @__PURE__ */ n((S, W) => {
      let E = { ...h[W], conditions: 1, inner: "" };
      E.prev = y, E.parens = _.parens, E.output = _.output;
      let I = (r.capture ? "(" : "") + E.open;
      mr("parens"), L({ type: S, value: W, output: _.output ? "" : g }), L({ type: "paren", extglob: !0, value: Pe(), output: I }), V.push(E);
    }, "extglobOpen"), Km = /* @__PURE__ */ n((S) => {
      let W = S.close + (r.capture ? ")" : ""), E;
      if (S.type === "negate") {
        let I = ee;
        if (S.inner && S.inner.length > 1 && S.inner.includes("/") && (I = O(r)), (I !== ee || se() || /^\)+$/.test(Oe())) && (W = S.close =
        `)$))${I}`), S.inner.includes("*") && (E = Oe()) && /^\.[^\\/.]+$/.test(E)) {
          let Y = cs(E, { ...e, fastpaths: !1 }).output;
          W = S.close = `)${Y})${I})`;
        }
        S.prev.type === "bos" && (_.negatedExtglob = !0);
      }
      L({ type: "paren", extglob: !0, value: x, output: W }), ct("parens");
    }, "extglobClose");
    if (r.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(t)) {
      let S = !1, W = t.replace(Ky, (E, I, Y, ne, J, Oi) => ne === "\\" ? (S = !0, E) : ne === "?" ? I ? I + ne + (J ? D.repeat(J.length) : "") :
      Oi === 0 ? M + (J ? D.repeat(J.length) : "") : D.repeat(Y.length) : ne === "." ? m.repeat(Y.length) : ne === "*" ? I ? I + ne + (J ? ee :
      "") : ee : I ? E : `\\${E}`);
      return S === !0 && (r.unescape === !0 ? W = W.replace(/\\/g, "") : W = W.replace(/\\+/g, (E) => E.length % 2 === 0 ? "\\\\" : E ? "\\" :
      "")), W === t && r.contains === !0 ? (_.output = t, _) : (_.output = pe.wrapOutput(W, _, e), _);
    }
    for (; !se(); ) {
      if (x = Pe(), x === "\0")
        continue;
      if (x === "\\") {
        let E = $();
        if (E === "/" && r.bash !== !0 || E === "." || E === ";")
          continue;
        if (!E) {
          x += "\\", L({ type: "text", value: x });
          continue;
        }
        let I = /^\\+/.exec(Oe()), Y = 0;
        if (I && I[0].length > 2 && (Y = I[0].length, _.index += Y, Y % 2 !== 0 && (x += "\\")), r.unescape === !0 ? x = Pe() : x += Pe(), _.
        brackets === 0) {
          L({ type: "text", value: x });
          continue;
        }
      }
      if (_.brackets > 0 && (x !== "]" || y.value === "[" || y.value === "[^")) {
        if (r.posix !== !1 && x === ":") {
          let E = y.value.slice(1);
          if (E.includes("[") && (y.posix = !0, E.includes(":"))) {
            let I = y.value.lastIndexOf("["), Y = y.value.slice(0, I), ne = y.value.slice(I + 2), J = Yy[ne];
            if (J) {
              y.value = Y + J, _.backtrack = !0, Pe(), !o.output && a.indexOf(y) === 1 && (o.output = g);
              continue;
            }
          }
        }
        (x === "[" && $() !== ":" || x === "-" && $() === "]") && (x = `\\${x}`), x === "]" && (y.value === "[" || y.value === "[^") && (x =
        `\\${x}`), r.posix === !0 && x === "!" && y.value === "[" && (x = "^"), y.value += x, fr({ value: x });
        continue;
      }
      if (_.quotes === 1 && x !== '"') {
        x = pe.escapeRegex(x), y.value += x, fr({ value: x });
        continue;
      }
      if (x === '"') {
        _.quotes = _.quotes === 1 ? 0 : 1, r.keepQuotes === !0 && L({ type: "text", value: x });
        continue;
      }
      if (x === "(") {
        mr("parens"), L({ type: "paren", value: x });
        continue;
      }
      if (x === ")") {
        if (_.parens === 0 && r.strictBrackets === !0)
          throw new SyntaxError(Rt("opening", "("));
        let E = V[V.length - 1];
        if (E && _.parens === E.parens + 1) {
          Km(V.pop());
          continue;
        }
        L({ type: "paren", value: x, output: _.parens ? ")" : "\\)" }), ct("parens");
        continue;
      }
      if (x === "[") {
        if (r.nobracket === !0 || !Oe().includes("]")) {
          if (r.nobracket !== !0 && r.strictBrackets === !0)
            throw new SyntaxError(Rt("closing", "]"));
          x = `\\${x}`;
        } else
          mr("brackets");
        L({ type: "bracket", value: x });
        continue;
      }
      if (x === "]") {
        if (r.nobracket === !0 || y && y.type === "bracket" && y.value.length === 1) {
          L({ type: "text", value: x, output: `\\${x}` });
          continue;
        }
        if (_.brackets === 0) {
          if (r.strictBrackets === !0)
            throw new SyntaxError(Rt("opening", "["));
          L({ type: "text", value: x, output: `\\${x}` });
          continue;
        }
        ct("brackets");
        let E = y.value.slice(1);
        if (y.posix !== !0 && E[0] === "^" && !E.includes("/") && (x = `/${x}`), y.value += x, fr({ value: x }), r.literalBrackets === !1 ||
        pe.hasRegexChars(E))
          continue;
        let I = pe.escapeRegex(y.value);
        if (_.output = _.output.slice(0, -y.value.length), r.literalBrackets === !0) {
          _.output += I, y.value = I;
          continue;
        }
        y.value = `(${l}${I}|${y.value})`, _.output += y.value;
        continue;
      }
      if (x === "{" && r.nobrace !== !0) {
        mr("braces");
        let E = {
          type: "brace",
          value: x,
          output: "(",
          outputIndex: _.output.length,
          tokensIndex: _.tokens.length
        };
        U.push(E), L(E);
        continue;
      }
      if (x === "}") {
        let E = U[U.length - 1];
        if (r.nobrace === !0 || !E) {
          L({ type: "text", value: x, output: x });
          continue;
        }
        let I = ")";
        if (E.dots === !0) {
          let Y = a.slice(), ne = [];
          for (let J = Y.length - 1; J >= 0 && (a.pop(), Y[J].type !== "brace"); J--)
            Y[J].type !== "dots" && ne.unshift(Y[J].value);
          I = Qy(ne, r), _.backtrack = !0;
        }
        if (E.comma !== !0 && E.dots !== !0) {
          let Y = _.output.slice(0, E.outputIndex), ne = _.tokens.slice(E.tokensIndex);
          E.value = E.output = "\\{", x = I = "\\}", _.output = Y;
          for (let J of ne)
            _.output += J.output || J.value;
        }
        L({ type: "brace", value: x, output: I }), ct("braces"), U.pop();
        continue;
      }
      if (x === "|") {
        V.length > 0 && V[V.length - 1].conditions++, L({ type: "text", value: x });
        continue;
      }
      if (x === ",") {
        let E = x, I = U[U.length - 1];
        I && Xe[Xe.length - 1] === "braces" && (I.comma = !0, E = "|"), L({ type: "comma", value: x, output: E });
        continue;
      }
      if (x === "/") {
        if (y.type === "dot" && _.index === _.start + 1) {
          _.start = _.index + 1, _.consumed = "", _.output = "", a.pop(), y = o;
          continue;
        }
        L({ type: "slash", value: x, output: v });
        continue;
      }
      if (x === ".") {
        if (_.braces > 0 && y.type === "dot") {
          y.value === "." && (y.output = m);
          let E = U[U.length - 1];
          y.type = "dots", y.output += x, y.value += x, E.dots = !0;
          continue;
        }
        if (_.braces + _.parens === 0 && y.type !== "bos" && y.type !== "slash") {
          L({ type: "text", value: x, output: m });
          continue;
        }
        L({ type: "dot", value: x, output: m });
        continue;
      }
      if (x === "?") {
        if (!(y && y.value === "(") && r.noextglob !== !0 && $() === "(" && $(2) !== "?") {
          gr("qmark", x);
          continue;
        }
        if (y && y.type === "paren") {
          let I = $(), Y = x;
          if (I === "<" && !pe.supportsLookbehinds())
            throw new Error("Node.js v10 or higher is required for regex lookbehinds");
          (y.value === "(" && !/[!=<:]/.test(I) || I === "<" && !/<([!=]|\w+>)/.test(Oe())) && (Y = `\\${x}`), L({ type: "text", value: x, output: Y });
          continue;
        }
        if (r.dot !== !0 && (y.type === "slash" || y.type === "bos")) {
          L({ type: "qmark", value: x, output: H });
          continue;
        }
        L({ type: "qmark", value: x, output: D });
        continue;
      }
      if (x === "!") {
        if (r.noextglob !== !0 && $() === "(" && ($(2) !== "?" || !/[!=<:]/.test($(3)))) {
          gr("negate", x);
          continue;
        }
        if (r.nonegate !== !0 && _.index === 0) {
          zm();
          continue;
        }
      }
      if (x === "+") {
        if (r.noextglob !== !0 && $() === "(" && $(2) !== "?") {
          gr("plus", x);
          continue;
        }
        if (y && y.value === "(" || r.regex === !1) {
          L({ type: "plus", value: x, output: p });
          continue;
        }
        if (y && (y.type === "bracket" || y.type === "paren" || y.type === "brace") || _.parens > 0) {
          L({ type: "plus", value: x });
          continue;
        }
        L({ type: "plus", value: p });
        continue;
      }
      if (x === "@") {
        if (r.noextglob !== !0 && $() === "(" && $(2) !== "?") {
          L({ type: "at", extglob: !0, value: x, output: "" });
          continue;
        }
        L({ type: "text", value: x });
        continue;
      }
      if (x !== "*") {
        (x === "$" || x === "^") && (x = `\\${x}`);
        let E = zy.exec(Oe());
        E && (x += E[0], _.index += E[0].length), L({ type: "text", value: x });
        continue;
      }
      if (y && (y.type === "globstar" || y.star === !0)) {
        y.type = "star", y.star = !0, y.value += x, y.output = ee, _.backtrack = !0, _.globstar = !0, ue(x);
        continue;
      }
      let S = Oe();
      if (r.noextglob !== !0 && /^\([^?]/.test(S)) {
        gr("star", x);
        continue;
      }
      if (y.type === "star") {
        if (r.noglobstar === !0) {
          ue(x);
          continue;
        }
        let E = y.prev, I = E.prev, Y = E.type === "slash" || E.type === "bos", ne = I && (I.type === "star" || I.type === "globstar");
        if (r.bash === !0 && (!Y || S[0] && S[0] !== "/")) {
          L({ type: "star", value: x, output: "" });
          continue;
        }
        let J = _.braces > 0 && (E.type === "comma" || E.type === "brace"), Oi = V.length && (E.type === "pipe" || E.type === "paren");
        if (!Y && E.type !== "paren" && !J && !Oi) {
          L({ type: "star", value: x, output: "" });
          continue;
        }
        for (; S.slice(0, 3) === "/**"; ) {
          let yr = t[_.index + 4];
          if (yr && yr !== "/")
            break;
          S = S.slice(3), ue("/**", 3);
        }
        if (E.type === "bos" && se()) {
          y.type = "globstar", y.value += x, y.output = O(r), _.output = y.output, _.globstar = !0, ue(x);
          continue;
        }
        if (E.type === "slash" && E.prev.type !== "bos" && !ne && se()) {
          _.output = _.output.slice(0, -(E.output + y.output).length), E.output = `(?:${E.output}`, y.type = "globstar", y.output = O(r) + (r.
          strictSlashes ? ")" : "|$)"), y.value += x, _.globstar = !0, _.output += E.output + y.output, ue(x);
          continue;
        }
        if (E.type === "slash" && E.prev.type !== "bos" && S[0] === "/") {
          let yr = S[1] !== void 0 ? "|$" : "";
          _.output = _.output.slice(0, -(E.output + y.output).length), E.output = `(?:${E.output}`, y.type = "globstar", y.output = `${O(r)}${v}\
|${v}${yr})`, y.value += x, _.output += E.output + y.output, _.globstar = !0, ue(x + Pe()), L({ type: "slash", value: "/", output: "" });
          continue;
        }
        if (E.type === "bos" && S[0] === "/") {
          y.type = "globstar", y.value += x, y.output = `(?:^|${v}|${O(r)}${v})`, _.output = y.output, _.globstar = !0, ue(x + Pe()), L({ type: "\
slash", value: "/", output: "" });
          continue;
        }
        _.output = _.output.slice(0, -y.output.length), y.type = "globstar", y.output = O(r), y.value += x, _.output += y.output, _.globstar =
        !0, ue(x);
        continue;
      }
      let W = { type: "star", value: x, output: ee };
      if (r.bash === !0) {
        W.output = ".*?", (y.type === "bos" || y.type === "slash") && (W.output = P + W.output), L(W);
        continue;
      }
      if (y && (y.type === "bracket" || y.type === "paren") && r.regex === !0) {
        W.output = x, L(W);
        continue;
      }
      (_.index === _.start || y.type === "slash" || y.type === "dot") && (y.type === "dot" ? (_.output += T, y.output += T) : r.dot === !0 ?
      (_.output += k, y.output += k) : (_.output += P, y.output += P), $() !== "*" && (_.output += g, y.output += g)), L(W);
    }
    for (; _.brackets > 0; ) {
      if (r.strictBrackets === !0) throw new SyntaxError(Rt("closing", "]"));
      _.output = pe.escapeLast(_.output, "["), ct("brackets");
    }
    for (; _.parens > 0; ) {
      if (r.strictBrackets === !0) throw new SyntaxError(Rt("closing", ")"));
      _.output = pe.escapeLast(_.output, "("), ct("parens");
    }
    for (; _.braces > 0; ) {
      if (r.strictBrackets === !0) throw new SyntaxError(Rt("closing", "}"));
      _.output = pe.escapeLast(_.output, "{"), ct("braces");
    }
    if (r.strictSlashes !== !0 && (y.type === "star" || y.type === "bracket") && L({ type: "maybe_slash", value: "", output: `${v}?` }), _.backtrack ===
    !0) {
      _.output = "";
      for (let S of _.tokens)
        _.output += S.output != null ? S.output : S.value, S.suffix && (_.output += S.suffix);
    }
    return _;
  }, "parse");
  cs.fastpaths = (t, e) => {
    let r = { ...e }, i = typeof r.maxLength == "number" ? Math.min(Ir, r.maxLength) : Ir, s = t.length;
    if (s > i)
      throw new SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${i}`);
    t = fc[t] || t;
    let o = pe.isWindows(e), {
      DOT_LITERAL: a,
      SLASH_LITERAL: l,
      ONE_CHAR: c,
      DOTS_SLASH: u,
      NO_DOT: h,
      NO_DOTS: m,
      NO_DOTS_SLASH: p,
      STAR: v,
      START_ANCHOR: g
    } = Dr.globChars(o), b = r.dot ? m : h, R = r.dot ? p : h, T = r.capture ? "" : "?:", k = { negated: !1, prefix: "" }, D = r.bash === !0 ?
    ".*?" : v;
    r.capture && (D = `(${D})`);
    let H = /* @__PURE__ */ n((P) => P.noglobstar === !0 ? D : `(${T}(?:(?!${g}${P.dot ? u : a}).)*?)`, "globstar"), C = /* @__PURE__ */ n((P) => {
      switch (P) {
        case "*":
          return `${b}${c}${D}`;
        case ".*":
          return `${a}${c}${D}`;
        case "*.*":
          return `${b}${D}${a}${c}${D}`;
        case "*/*":
          return `${b}${D}${l}${c}${R}${D}`;
        case "**":
          return b + H(r);
        case "**/*":
          return `(?:${b}${H(r)}${l})?${R}${c}${D}`;
        case "**/*.*":
          return `(?:${b}${H(r)}${l})?${R}${D}${a}${c}${D}`;
        case "**/.*":
          return `(?:${b}${H(r)}${l})?${a}${c}${D}`;
        default: {
          let M = /^(.*?)\.(\w+)$/.exec(P);
          if (!M) return;
          let ee = C(M[1]);
          return ee ? ee + a + M[2] : void 0;
        }
      }
    }, "create"), N = pe.removePrefix(t, k), O = C(N);
    return O && r.strictSlashes !== !0 && (O += `${l}?`), O;
  };
  mc.exports = cs;
});

// ../node_modules/picomatch/lib/picomatch.js
var xc = f((HA, yc) => {
  "use strict";
  var Xy = require("path"), Zy = dc(), us = gc(), hs = zt(), Jy = Yt(), ex = /* @__PURE__ */ n((t) => t && typeof t == "object" && !Array.isArray(
  t), "isObject"), X = /* @__PURE__ */ n((t, e, r = !1) => {
    if (Array.isArray(t)) {
      let h = t.map((p) => X(p, e, r));
      return /* @__PURE__ */ n((p) => {
        for (let v of h) {
          let g = v(p);
          if (g) return g;
        }
        return !1;
      }, "arrayMatcher");
    }
    let i = ex(t) && t.tokens && t.input;
    if (t === "" || typeof t != "string" && !i)
      throw new TypeError("Expected pattern to be a non-empty string");
    let s = e || {}, o = hs.isWindows(e), a = i ? X.compileRe(t, e) : X.makeRe(t, e, !1, !0), l = a.state;
    delete a.state;
    let c = /* @__PURE__ */ n(() => !1, "isIgnored");
    if (s.ignore) {
      let h = { ...e, ignore: null, onMatch: null, onResult: null };
      c = X(s.ignore, h, r);
    }
    let u = /* @__PURE__ */ n((h, m = !1) => {
      let { isMatch: p, match: v, output: g } = X.test(h, a, e, { glob: t, posix: o }), b = { glob: t, state: l, regex: a, posix: o, input: h,
      output: g, match: v, isMatch: p };
      return typeof s.onResult == "function" && s.onResult(b), p === !1 ? (b.isMatch = !1, m ? b : !1) : c(h) ? (typeof s.onIgnore == "funct\
ion" && s.onIgnore(b), b.isMatch = !1, m ? b : !1) : (typeof s.onMatch == "function" && s.onMatch(b), m ? b : !0);
    }, "matcher");
    return r && (u.state = l), u;
  }, "picomatch");
  X.test = (t, e, r, { glob: i, posix: s } = {}) => {
    if (typeof t != "string")
      throw new TypeError("Expected input to be a string");
    if (t === "")
      return { isMatch: !1, output: "" };
    let o = r || {}, a = o.format || (s ? hs.toPosixSlashes : null), l = t === i, c = l && a ? a(t) : t;
    return l === !1 && (c = a ? a(t) : t, l = c === i), (l === !1 || o.capture === !0) && (o.matchBase === !0 || o.basename === !0 ? l = X.matchBase(
    t, e, r, s) : l = e.exec(c)), { isMatch: !!l, match: l, output: c };
  };
  X.matchBase = (t, e, r, i = hs.isWindows(r)) => (e instanceof RegExp ? e : X.makeRe(e, r)).test(Xy.basename(t));
  X.isMatch = (t, e, r) => X(e, r)(t);
  X.parse = (t, e) => Array.isArray(t) ? t.map((r) => X.parse(r, e)) : us(t, { ...e, fastpaths: !1 });
  X.scan = (t, e) => Zy(t, e);
  X.compileRe = (t, e, r = !1, i = !1) => {
    if (r === !0)
      return t.output;
    let s = e || {}, o = s.contains ? "" : "^", a = s.contains ? "" : "$", l = `${o}(?:${t.output})${a}`;
    t && t.negated === !0 && (l = `^(?!${l}).*$`);
    let c = X.toRegex(l, e);
    return i === !0 && (c.state = t), c;
  };
  X.makeRe = (t, e = {}, r = !1, i = !1) => {
    if (!t || typeof t != "string")
      throw new TypeError("Expected a non-empty string");
    let s = { negated: !1, fastpaths: !0 };
    return e.fastpaths !== !1 && (t[0] === "." || t[0] === "*") && (s.output = us.fastpaths(t, e)), s.output || (s = us(t, e)), X.compileRe(
    s, e, r, i);
  };
  X.toRegex = (t, e) => {
    try {
      let r = e || {};
      return new RegExp(t, r.flags || (r.nocase ? "i" : ""));
    } catch (r) {
      if (e && e.debug === !0) throw r;
      return /$^/;
    }
  };
  X.constants = Jy;
  yc.exports = X;
});

// ../node_modules/picomatch/index.js
var bc = f((UA, _c) => {
  "use strict";
  _c.exports = xc();
});

// ../node_modules/micromatch/index.js
var Tc = f((WA, Rc) => {
  "use strict";
  var Sc = require("util"), vc = ec(), Ie = bc(), ps = zt(), Ec = /* @__PURE__ */ n((t) => t === "" || t === "./", "isEmptyString"), wc = /* @__PURE__ */ n(
  (t) => {
    let e = t.indexOf("{");
    return e > -1 && t.indexOf("}", e) > -1;
  }, "hasBraces"), G = /* @__PURE__ */ n((t, e, r) => {
    e = [].concat(e), t = [].concat(t);
    let i = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = 0, l = /* @__PURE__ */ n((h) => {
      o.add(h.output), r && r.onResult && r.onResult(h);
    }, "onResult");
    for (let h = 0; h < e.length; h++) {
      let m = Ie(String(e[h]), { ...r, onResult: l }, !0), p = m.state.negated || m.state.negatedExtglob;
      p && a++;
      for (let v of t) {
        let g = m(v, !0);
        (p ? !g.isMatch : g.isMatch) && (p ? i.add(g.output) : (i.delete(g.output), s.add(g.output)));
      }
    }
    let u = (a === e.length ? [...o] : [...s]).filter((h) => !i.has(h));
    if (r && u.length === 0) {
      if (r.failglob === !0)
        throw new Error(`No matches found for "${e.join(", ")}"`);
      if (r.nonull === !0 || r.nullglob === !0)
        return r.unescape ? e.map((h) => h.replace(/\\/g, "")) : e;
    }
    return u;
  }, "micromatch");
  G.match = G;
  G.matcher = (t, e) => Ie(t, e);
  G.isMatch = (t, e, r) => Ie(e, r)(t);
  G.any = G.isMatch;
  G.not = (t, e, r = {}) => {
    e = [].concat(e).map(String);
    let i = /* @__PURE__ */ new Set(), s = [], o = /* @__PURE__ */ n((l) => {
      r.onResult && r.onResult(l), s.push(l.output);
    }, "onResult"), a = new Set(G(t, e, { ...r, onResult: o }));
    for (let l of s)
      a.has(l) || i.add(l);
    return [...i];
  };
  G.contains = (t, e, r) => {
    if (typeof t != "string")
      throw new TypeError(`Expected a string: "${Sc.inspect(t)}"`);
    if (Array.isArray(e))
      return e.some((i) => G.contains(t, i, r));
    if (typeof e == "string") {
      if (Ec(t) || Ec(e))
        return !1;
      if (t.includes(e) || t.startsWith("./") && t.slice(2).includes(e))
        return !0;
    }
    return G.isMatch(t, e, { ...r, contains: !0 });
  };
  G.matchKeys = (t, e, r) => {
    if (!ps.isObject(t))
      throw new TypeError("Expected the first argument to be an object");
    let i = G(Object.keys(t), e, r), s = {};
    for (let o of i) s[o] = t[o];
    return s;
  };
  G.some = (t, e, r) => {
    let i = [].concat(t);
    for (let s of [].concat(e)) {
      let o = Ie(String(s), r);
      if (i.some((a) => o(a)))
        return !0;
    }
    return !1;
  };
  G.every = (t, e, r) => {
    let i = [].concat(t);
    for (let s of [].concat(e)) {
      let o = Ie(String(s), r);
      if (!i.every((a) => o(a)))
        return !1;
    }
    return !0;
  };
  G.all = (t, e, r) => {
    if (typeof t != "string")
      throw new TypeError(`Expected a string: "${Sc.inspect(t)}"`);
    return [].concat(e).every((i) => Ie(i, r)(t));
  };
  G.capture = (t, e, r) => {
    let i = ps.isWindows(r), o = Ie.makeRe(String(t), { ...r, capture: !0 }).exec(i ? ps.toPosixSlashes(e) : e);
    if (o)
      return o.slice(1).map((a) => a === void 0 ? "" : a);
  };
  G.makeRe = (...t) => Ie.makeRe(...t);
  G.scan = (...t) => Ie.scan(...t);
  G.parse = (t, e) => {
    let r = [];
    for (let i of [].concat(t || []))
      for (let s of vc(String(i), e))
        r.push(Ie.parse(s, e));
    return r;
  };
  G.braces = (t, e) => {
    if (typeof t != "string") throw new TypeError("Expected a string");
    return e && e.nobrace === !0 || !wc(t) ? [t] : vc(t, e);
  };
  G.braceExpand = (t, e) => {
    if (typeof t != "string") throw new TypeError("Expected a string");
    return G.braces(t, { ...e, expand: !0 });
  };
  G.hasBraces = wc;
  Rc.exports = G;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/pattern.js
var Lc = f((A) => {
  "use strict";
  Object.defineProperty(A, "__esModule", { value: !0 });
  A.removeDuplicateSlashes = A.matchAny = A.convertPatternsToRe = A.makeRe = A.getPatternParts = A.expandBraceExpansion = A.expandPatternsWithBraceExpansion =
  A.isAffectDepthOfReadingPattern = A.endsWithSlashGlobStar = A.hasGlobStar = A.getBaseDirectory = A.isPatternRelatedToParentDirectory = A.getPatternsOutsideCurrentDirectory =
  A.getPatternsInsideCurrentDirectory = A.getPositivePatterns = A.getNegativePatterns = A.isPositivePattern = A.isNegativePattern = A.convertToNegativePattern =
  A.convertToPositivePattern = A.isDynamicPattern = A.isStaticPattern = void 0;
  var tx = require("path"), rx = xl(), ds = Tc(), Ac = "**", ix = "\\", sx = /[*?]|^!/, nx = /\[[^[]*]/, ox = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/,
  ax = /[!*+?@]\([^(]*\)/, lx = /,|\.\./, cx = /(?!^)\/{2,}/g;
  function Pc(t, e = {}) {
    return !Oc(t, e);
  }
  n(Pc, "isStaticPattern");
  A.isStaticPattern = Pc;
  function Oc(t, e = {}) {
    return t === "" ? !1 : !!(e.caseSensitiveMatch === !1 || t.includes(ix) || sx.test(t) || nx.test(t) || ox.test(t) || e.extglob !== !1 &&
    ax.test(t) || e.braceExpansion !== !1 && ux(t));
  }
  n(Oc, "isDynamicPattern");
  A.isDynamicPattern = Oc;
  function ux(t) {
    let e = t.indexOf("{");
    if (e === -1)
      return !1;
    let r = t.indexOf("}", e + 1);
    if (r === -1)
      return !1;
    let i = t.slice(e, r);
    return lx.test(i);
  }
  n(ux, "hasBraceExpansion");
  function hx(t) {
    return Nr(t) ? t.slice(1) : t;
  }
  n(hx, "convertToPositivePattern");
  A.convertToPositivePattern = hx;
  function px(t) {
    return "!" + t;
  }
  n(px, "convertToNegativePattern");
  A.convertToNegativePattern = px;
  function Nr(t) {
    return t.startsWith("!") && t[1] !== "(";
  }
  n(Nr, "isNegativePattern");
  A.isNegativePattern = Nr;
  function Cc(t) {
    return !Nr(t);
  }
  n(Cc, "isPositivePattern");
  A.isPositivePattern = Cc;
  function dx(t) {
    return t.filter(Nr);
  }
  n(dx, "getNegativePatterns");
  A.getNegativePatterns = dx;
  function fx(t) {
    return t.filter(Cc);
  }
  n(fx, "getPositivePatterns");
  A.getPositivePatterns = fx;
  function mx(t) {
    return t.filter((e) => !fs(e));
  }
  n(mx, "getPatternsInsideCurrentDirectory");
  A.getPatternsInsideCurrentDirectory = mx;
  function gx(t) {
    return t.filter(fs);
  }
  n(gx, "getPatternsOutsideCurrentDirectory");
  A.getPatternsOutsideCurrentDirectory = gx;
  function fs(t) {
    return t.startsWith("..") || t.startsWith("./..");
  }
  n(fs, "isPatternRelatedToParentDirectory");
  A.isPatternRelatedToParentDirectory = fs;
  function yx(t) {
    return rx(t, { flipBackslashes: !1 });
  }
  n(yx, "getBaseDirectory");
  A.getBaseDirectory = yx;
  function xx(t) {
    return t.includes(Ac);
  }
  n(xx, "hasGlobStar");
  A.hasGlobStar = xx;
  function Dc(t) {
    return t.endsWith("/" + Ac);
  }
  n(Dc, "endsWithSlashGlobStar");
  A.endsWithSlashGlobStar = Dc;
  function _x(t) {
    let e = tx.basename(t);
    return Dc(t) || Pc(e);
  }
  n(_x, "isAffectDepthOfReadingPattern");
  A.isAffectDepthOfReadingPattern = _x;
  function bx(t) {
    return t.reduce((e, r) => e.concat(Ic(r)), []);
  }
  n(bx, "expandPatternsWithBraceExpansion");
  A.expandPatternsWithBraceExpansion = bx;
  function Ic(t) {
    let e = ds.braces(t, { expand: !0, nodupes: !0, keepEscaping: !0 });
    return e.sort((r, i) => r.length - i.length), e.filter((r) => r !== "");
  }
  n(Ic, "expandBraceExpansion");
  A.expandBraceExpansion = Ic;
  function Ex(t, e) {
    let { parts: r } = ds.scan(t, Object.assign(Object.assign({}, e), { parts: !0 }));
    return r.length === 0 && (r = [t]), r[0].startsWith("/") && (r[0] = r[0].slice(1), r.unshift("")), r;
  }
  n(Ex, "getPatternParts");
  A.getPatternParts = Ex;
  function Nc(t, e) {
    return ds.makeRe(t, e);
  }
  n(Nc, "makeRe");
  A.makeRe = Nc;
  function Sx(t, e) {
    return t.map((r) => Nc(r, e));
  }
  n(Sx, "convertPatternsToRe");
  A.convertPatternsToRe = Sx;
  function vx(t, e) {
    return e.some((r) => r.test(t));
  }
  n(vx, "matchAny");
  A.matchAny = vx;
  function wx(t) {
    return t.replace(cx, "/");
  }
  n(wx, "removeDuplicateSlashes");
  A.removeDuplicateSlashes = wx;
});

// ../node_modules/merge2/index.js
var qc = f((zA, Mc) => {
  "use strict";
  var Rx = require("stream"), kc = Rx.PassThrough, Tx = Array.prototype.slice;
  Mc.exports = Ax;
  function Ax() {
    let t = [], e = Tx.call(arguments), r = !1, i = e[e.length - 1];
    i && !Array.isArray(i) && i.pipe == null ? e.pop() : i = {};
    let s = i.end !== !1, o = i.pipeError === !0;
    i.objectMode == null && (i.objectMode = !0), i.highWaterMark == null && (i.highWaterMark = 64 * 1024);
    let a = kc(i);
    function l() {
      for (let h = 0, m = arguments.length; h < m; h++)
        t.push($c(arguments[h], i));
      return c(), this;
    }
    n(l, "addStream");
    function c() {
      if (r)
        return;
      r = !0;
      let h = t.shift();
      if (!h) {
        process.nextTick(u);
        return;
      }
      Array.isArray(h) || (h = [h]);
      let m = h.length + 1;
      function p() {
        --m > 0 || (r = !1, c());
      }
      n(p, "next");
      function v(g) {
        function b() {
          g.removeListener("merge2UnpipeEnd", b), g.removeListener("end", b), o && g.removeListener("error", R), p();
        }
        n(b, "onend");
        function R(T) {
          a.emit("error", T);
        }
        if (n(R, "onerror"), g._readableState.endEmitted)
          return p();
        g.on("merge2UnpipeEnd", b), g.on("end", b), o && g.on("error", R), g.pipe(a, { end: !1 }), g.resume();
      }
      n(v, "pipe");
      for (let g = 0; g < h.length; g++)
        v(h[g]);
      p();
    }
    n(c, "mergeStream");
    function u() {
      r = !1, a.emit("queueDrain"), s && a.end();
    }
    return n(u, "endStream"), a.setMaxListeners(0), a.add = l, a.on("unpipe", function(h) {
      h.emit("merge2UnpipeEnd");
    }), e.length && l.apply(null, e), a;
  }
  n(Ax, "merge2");
  function $c(t, e) {
    if (Array.isArray(t))
      for (let r = 0, i = t.length; r < i; r++)
        t[r] = $c(t[r], e);
    else {
      if (!t._readableState && t.pipe && (t = t.pipe(kc(e))), !t._readableState || !t.pause || !t.pipe)
        throw new Error("Only readable stream can be merged.");
      t.pause();
    }
    return t;
  }
  n($c, "pauseStreams");
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/stream.js
var jc = f((Lr) => {
  "use strict";
  Object.defineProperty(Lr, "__esModule", { value: !0 });
  Lr.merge = void 0;
  var Px = qc();
  function Ox(t) {
    let e = Px(t);
    return t.forEach((r) => {
      r.once("error", (i) => e.emit("error", i));
    }), e.once("close", () => Fc(t)), e.once("end", () => Fc(t)), e;
  }
  n(Ox, "merge");
  Lr.merge = Ox;
  function Fc(t) {
    t.forEach((e) => e.emit("close"));
  }
  n(Fc, "propagateCloseEventToSources");
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/string.js
var Hc = f((Tt) => {
  "use strict";
  Object.defineProperty(Tt, "__esModule", { value: !0 });
  Tt.isEmpty = Tt.isString = void 0;
  function Cx(t) {
    return typeof t == "string";
  }
  n(Cx, "isString");
  Tt.isString = Cx;
  function Dx(t) {
    return t === "";
  }
  n(Dx, "isEmpty");
  Tt.isEmpty = Dx;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/index.js
var Be = f((re) => {
  "use strict";
  Object.defineProperty(re, "__esModule", { value: !0 });
  re.string = re.stream = re.pattern = re.path = re.fs = re.errno = re.array = void 0;
  var Ix = nl();
  re.array = Ix;
  var Nx = ol();
  re.errno = Nx;
  var Lx = al();
  re.fs = Lx;
  var kx = hl();
  re.path = kx;
  var $x = Lc();
  re.pattern = $x;
  var Mx = jc();
  re.stream = Mx;
  var qx = Hc();
  re.string = qx;
});

// ../node_modules/globby/node_modules/fast-glob/out/managers/tasks.js
var Gc = f((ie) => {
  "use strict";
  Object.defineProperty(ie, "__esModule", { value: !0 });
  ie.convertPatternGroupToTask = ie.convertPatternGroupsToTasks = ie.groupPatternsByBaseDirectory = ie.getNegativePatternsAsPositive = ie.getPositivePatterns =
  ie.convertPatternsToTasks = ie.generate = void 0;
  var Ee = Be();
  function Fx(t, e) {
    let r = Bc(t, e), i = Bc(e.ignore, e), s = Uc(r), o = Wc(r, i), a = s.filter((h) => Ee.pattern.isStaticPattern(h, e)), l = s.filter((h) => Ee.
    pattern.isDynamicPattern(h, e)), c = ms(
      a,
      o,
      /* dynamic */
      !1
    ), u = ms(
      l,
      o,
      /* dynamic */
      !0
    );
    return c.concat(u);
  }
  n(Fx, "generate");
  ie.generate = Fx;
  function Bc(t, e) {
    let r = t;
    return e.braceExpansion && (r = Ee.pattern.expandPatternsWithBraceExpansion(r)), e.baseNameMatch && (r = r.map((i) => i.includes("/") ? i :
    `**/${i}`)), r.map((i) => Ee.pattern.removeDuplicateSlashes(i));
  }
  n(Bc, "processPatterns");
  function ms(t, e, r) {
    let i = [], s = Ee.pattern.getPatternsOutsideCurrentDirectory(t), o = Ee.pattern.getPatternsInsideCurrentDirectory(t), a = gs(s), l = gs(
    o);
    return i.push(...ys(a, e, r)), "." in l ? i.push(xs(".", o, e, r)) : i.push(...ys(l, e, r)), i;
  }
  n(ms, "convertPatternsToTasks");
  ie.convertPatternsToTasks = ms;
  function Uc(t) {
    return Ee.pattern.getPositivePatterns(t);
  }
  n(Uc, "getPositivePatterns");
  ie.getPositivePatterns = Uc;
  function Wc(t, e) {
    return Ee.pattern.getNegativePatterns(t).concat(e).map(Ee.pattern.convertToPositivePattern);
  }
  n(Wc, "getNegativePatternsAsPositive");
  ie.getNegativePatternsAsPositive = Wc;
  function gs(t) {
    let e = {};
    return t.reduce((r, i) => {
      let s = Ee.pattern.getBaseDirectory(i);
      return s in r ? r[s].push(i) : r[s] = [i], r;
    }, e);
  }
  n(gs, "groupPatternsByBaseDirectory");
  ie.groupPatternsByBaseDirectory = gs;
  function ys(t, e, r) {
    return Object.keys(t).map((i) => xs(i, t[i], e, r));
  }
  n(ys, "convertPatternGroupsToTasks");
  ie.convertPatternGroupsToTasks = ys;
  function xs(t, e, r, i) {
    return {
      dynamic: i,
      positive: e,
      negative: r,
      base: t,
      patterns: [].concat(e, r.map(Ee.pattern.convertToNegativePattern))
    };
  }
  n(xs, "convertPatternGroupToTask");
  ie.convertPatternGroupToTask = xs;
});

// ../node_modules/@nodelib/fs.stat/out/providers/async.js
var Yc = f((kr) => {
  "use strict";
  Object.defineProperty(kr, "__esModule", { value: !0 });
  kr.read = void 0;
  function jx(t, e, r) {
    e.fs.lstat(t, (i, s) => {
      if (i !== null) {
        Vc(r, i);
        return;
      }
      if (!s.isSymbolicLink() || !e.followSymbolicLink) {
        _s(r, s);
        return;
      }
      e.fs.stat(t, (o, a) => {
        if (o !== null) {
          if (e.throwErrorOnBrokenSymbolicLink) {
            Vc(r, o);
            return;
          }
          _s(r, s);
          return;
        }
        e.markSymbolicLink && (a.isSymbolicLink = () => !0), _s(r, a);
      });
    });
  }
  n(jx, "read");
  kr.read = jx;
  function Vc(t, e) {
    t(e);
  }
  n(Vc, "callFailureCallback");
  function _s(t, e) {
    t(null, e);
  }
  n(_s, "callSuccessCallback");
});

// ../node_modules/@nodelib/fs.stat/out/providers/sync.js
var zc = f(($r) => {
  "use strict";
  Object.defineProperty($r, "__esModule", { value: !0 });
  $r.read = void 0;
  function Hx(t, e) {
    let r = e.fs.lstatSync(t);
    if (!r.isSymbolicLink() || !e.followSymbolicLink)
      return r;
    try {
      let i = e.fs.statSync(t);
      return e.markSymbolicLink && (i.isSymbolicLink = () => !0), i;
    } catch (i) {
      if (!e.throwErrorOnBrokenSymbolicLink)
        return r;
      throw i;
    }
  }
  n(Hx, "read");
  $r.read = Hx;
});

// ../node_modules/@nodelib/fs.stat/out/adapters/fs.js
var Kc = f((Ze) => {
  "use strict";
  Object.defineProperty(Ze, "__esModule", { value: !0 });
  Ze.createFileSystemAdapter = Ze.FILE_SYSTEM_ADAPTER = void 0;
  var Mr = require("fs");
  Ze.FILE_SYSTEM_ADAPTER = {
    lstat: Mr.lstat,
    stat: Mr.stat,
    lstatSync: Mr.lstatSync,
    statSync: Mr.statSync
  };
  function Bx(t) {
    return t === void 0 ? Ze.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, Ze.FILE_SYSTEM_ADAPTER), t);
  }
  n(Bx, "createFileSystemAdapter");
  Ze.createFileSystemAdapter = Bx;
});

// ../node_modules/@nodelib/fs.stat/out/settings.js
var Qc = f((Es) => {
  "use strict";
  Object.defineProperty(Es, "__esModule", { value: !0 });
  var Ux = Kc(), bs = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, !0), this.fs = Ux.createFileSystemAdapter(
      this._options.fs), this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, !1), this.throwErrorOnBrokenSymbolicLink = this.
      _getValue(this._options.throwErrorOnBrokenSymbolicLink, !0);
    }
    _getValue(e, r) {
      return e ?? r;
    }
  };
  Es.default = bs;
});

// ../node_modules/@nodelib/fs.stat/out/index.js
var dt = f((Je) => {
  "use strict";
  Object.defineProperty(Je, "__esModule", { value: !0 });
  Je.statSync = Je.stat = Je.Settings = void 0;
  var Xc = Yc(), Wx = zc(), Ss = Qc();
  Je.Settings = Ss.default;
  function Gx(t, e, r) {
    if (typeof e == "function") {
      Xc.read(t, vs(), e);
      return;
    }
    Xc.read(t, vs(e), r);
  }
  n(Gx, "stat");
  Je.stat = Gx;
  function Vx(t, e) {
    let r = vs(e);
    return Wx.read(t, r);
  }
  n(Vx, "statSync");
  Je.statSync = Vx;
  function vs(t = {}) {
    return t instanceof Ss.default ? t : new Ss.default(t);
  }
  n(vs, "getSettings");
});

// ../node_modules/queue-microtask/index.js
var eu = f((dP, Jc) => {
  var Zc;
  Jc.exports = typeof queueMicrotask == "function" ? queueMicrotask.bind(typeof window < "u" ? window : global) : (t) => (Zc || (Zc = Promise.
  resolve())).then(t).catch((e) => setTimeout(() => {
    throw e;
  }, 0));
});

// ../node_modules/run-parallel/index.js
var ru = f((fP, tu) => {
  tu.exports = zx;
  var Yx = eu();
  function zx(t, e) {
    let r, i, s, o = !0;
    Array.isArray(t) ? (r = [], i = t.length) : (s = Object.keys(t), r = {}, i = s.length);
    function a(c) {
      function u() {
        e && e(c, r), e = null;
      }
      n(u, "end"), o ? Yx(u) : u();
    }
    n(a, "done");
    function l(c, u, h) {
      r[c] = h, (--i === 0 || u) && a(u);
    }
    n(l, "each"), i ? s ? s.forEach(function(c) {
      t[c](function(u, h) {
        l(c, u, h);
      });
    }) : t.forEach(function(c, u) {
      c(function(h, m) {
        l(u, h, m);
      });
    }) : a(null), o = !1;
  }
  n(zx, "runParallel");
});

// ../node_modules/@nodelib/fs.scandir/out/constants.js
var ws = f((Fr) => {
  "use strict";
  Object.defineProperty(Fr, "__esModule", { value: !0 });
  Fr.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
  var qr = process.versions.node.split(".");
  if (qr[0] === void 0 || qr[1] === void 0)
    throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
  var iu = Number.parseInt(qr[0], 10), Kx = Number.parseInt(qr[1], 10), su = 10, Qx = 10, Xx = iu > su, Zx = iu === su && Kx >= Qx;
  Fr.IS_SUPPORT_READDIR_WITH_FILE_TYPES = Xx || Zx;
});

// ../node_modules/@nodelib/fs.scandir/out/utils/fs.js
var nu = f((jr) => {
  "use strict";
  Object.defineProperty(jr, "__esModule", { value: !0 });
  jr.createDirentFromStats = void 0;
  var Rs = class {
    static {
      n(this, "DirentFromStats");
    }
    constructor(e, r) {
      this.name = e, this.isBlockDevice = r.isBlockDevice.bind(r), this.isCharacterDevice = r.isCharacterDevice.bind(r), this.isDirectory = r.
      isDirectory.bind(r), this.isFIFO = r.isFIFO.bind(r), this.isFile = r.isFile.bind(r), this.isSocket = r.isSocket.bind(r), this.isSymbolicLink =
      r.isSymbolicLink.bind(r);
    }
  };
  function Jx(t, e) {
    return new Rs(t, e);
  }
  n(Jx, "createDirentFromStats");
  jr.createDirentFromStats = Jx;
});

// ../node_modules/@nodelib/fs.scandir/out/utils/index.js
var Ts = f((Hr) => {
  "use strict";
  Object.defineProperty(Hr, "__esModule", { value: !0 });
  Hr.fs = void 0;
  var e_ = nu();
  Hr.fs = e_;
});

// ../node_modules/@nodelib/fs.scandir/out/providers/common.js
var As = f((Br) => {
  "use strict";
  Object.defineProperty(Br, "__esModule", { value: !0 });
  Br.joinPathSegments = void 0;
  function t_(t, e, r) {
    return t.endsWith(r) ? t + e : t + r + e;
  }
  n(t_, "joinPathSegments");
  Br.joinPathSegments = t_;
});

// ../node_modules/@nodelib/fs.scandir/out/providers/async.js
var hu = f((et) => {
  "use strict";
  Object.defineProperty(et, "__esModule", { value: !0 });
  et.readdir = et.readdirWithFileTypes = et.read = void 0;
  var r_ = dt(), ou = ru(), i_ = ws(), au = Ts(), lu = As();
  function s_(t, e, r) {
    if (!e.stats && i_.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
      cu(t, e, r);
      return;
    }
    uu(t, e, r);
  }
  n(s_, "read");
  et.read = s_;
  function cu(t, e, r) {
    e.fs.readdir(t, { withFileTypes: !0 }, (i, s) => {
      if (i !== null) {
        Ur(r, i);
        return;
      }
      let o = s.map((l) => ({
        dirent: l,
        name: l.name,
        path: lu.joinPathSegments(t, l.name, e.pathSegmentSeparator)
      }));
      if (!e.followSymbolicLinks) {
        Ps(r, o);
        return;
      }
      let a = o.map((l) => n_(l, e));
      ou(a, (l, c) => {
        if (l !== null) {
          Ur(r, l);
          return;
        }
        Ps(r, c);
      });
    });
  }
  n(cu, "readdirWithFileTypes");
  et.readdirWithFileTypes = cu;
  function n_(t, e) {
    return (r) => {
      if (!t.dirent.isSymbolicLink()) {
        r(null, t);
        return;
      }
      e.fs.stat(t.path, (i, s) => {
        if (i !== null) {
          if (e.throwErrorOnBrokenSymbolicLink) {
            r(i);
            return;
          }
          r(null, t);
          return;
        }
        t.dirent = au.fs.createDirentFromStats(t.name, s), r(null, t);
      });
    };
  }
  n(n_, "makeRplTaskEntry");
  function uu(t, e, r) {
    e.fs.readdir(t, (i, s) => {
      if (i !== null) {
        Ur(r, i);
        return;
      }
      let o = s.map((a) => {
        let l = lu.joinPathSegments(t, a, e.pathSegmentSeparator);
        return (c) => {
          r_.stat(l, e.fsStatSettings, (u, h) => {
            if (u !== null) {
              c(u);
              return;
            }
            let m = {
              name: a,
              path: l,
              dirent: au.fs.createDirentFromStats(a, h)
            };
            e.stats && (m.stats = h), c(null, m);
          });
        };
      });
      ou(o, (a, l) => {
        if (a !== null) {
          Ur(r, a);
          return;
        }
        Ps(r, l);
      });
    });
  }
  n(uu, "readdir");
  et.readdir = uu;
  function Ur(t, e) {
    t(e);
  }
  n(Ur, "callFailureCallback");
  function Ps(t, e) {
    t(null, e);
  }
  n(Ps, "callSuccessCallback");
});

// ../node_modules/@nodelib/fs.scandir/out/providers/sync.js
var gu = f((tt) => {
  "use strict";
  Object.defineProperty(tt, "__esModule", { value: !0 });
  tt.readdir = tt.readdirWithFileTypes = tt.read = void 0;
  var o_ = dt(), a_ = ws(), pu = Ts(), du = As();
  function l_(t, e) {
    return !e.stats && a_.IS_SUPPORT_READDIR_WITH_FILE_TYPES ? fu(t, e) : mu(t, e);
  }
  n(l_, "read");
  tt.read = l_;
  function fu(t, e) {
    return e.fs.readdirSync(t, { withFileTypes: !0 }).map((i) => {
      let s = {
        dirent: i,
        name: i.name,
        path: du.joinPathSegments(t, i.name, e.pathSegmentSeparator)
      };
      if (s.dirent.isSymbolicLink() && e.followSymbolicLinks)
        try {
          let o = e.fs.statSync(s.path);
          s.dirent = pu.fs.createDirentFromStats(s.name, o);
        } catch (o) {
          if (e.throwErrorOnBrokenSymbolicLink)
            throw o;
        }
      return s;
    });
  }
  n(fu, "readdirWithFileTypes");
  tt.readdirWithFileTypes = fu;
  function mu(t, e) {
    return e.fs.readdirSync(t).map((i) => {
      let s = du.joinPathSegments(t, i, e.pathSegmentSeparator), o = o_.statSync(s, e.fsStatSettings), a = {
        name: i,
        path: s,
        dirent: pu.fs.createDirentFromStats(i, o)
      };
      return e.stats && (a.stats = o), a;
    });
  }
  n(mu, "readdir");
  tt.readdir = mu;
});

// ../node_modules/@nodelib/fs.scandir/out/adapters/fs.js
var yu = f((rt) => {
  "use strict";
  Object.defineProperty(rt, "__esModule", { value: !0 });
  rt.createFileSystemAdapter = rt.FILE_SYSTEM_ADAPTER = void 0;
  var At = require("fs");
  rt.FILE_SYSTEM_ADAPTER = {
    lstat: At.lstat,
    stat: At.stat,
    lstatSync: At.lstatSync,
    statSync: At.statSync,
    readdir: At.readdir,
    readdirSync: At.readdirSync
  };
  function c_(t) {
    return t === void 0 ? rt.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, rt.FILE_SYSTEM_ADAPTER), t);
  }
  n(c_, "createFileSystemAdapter");
  rt.createFileSystemAdapter = c_;
});

// ../node_modules/@nodelib/fs.scandir/out/settings.js
var xu = f((Cs) => {
  "use strict";
  Object.defineProperty(Cs, "__esModule", { value: !0 });
  var u_ = require("path"), h_ = dt(), p_ = yu(), Os = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !1), this.fs = p_.createFileSystemAdapter(
      this._options.fs), this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, u_.sep), this.stats = this._getValue(
      this._options.stats, !1), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, !0), this.
      fsStatSettings = new h_.Settings({
        followSymbolicLink: this.followSymbolicLinks,
        fs: this.fs,
        throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
      });
    }
    _getValue(e, r) {
      return e ?? r;
    }
  };
  Cs.default = Os;
});

// ../node_modules/@nodelib/fs.scandir/out/index.js
var Wr = f((it) => {
  "use strict";
  Object.defineProperty(it, "__esModule", { value: !0 });
  it.Settings = it.scandirSync = it.scandir = void 0;
  var _u = hu(), d_ = gu(), Ds = xu();
  it.Settings = Ds.default;
  function f_(t, e, r) {
    if (typeof e == "function") {
      _u.read(t, Is(), e);
      return;
    }
    _u.read(t, Is(e), r);
  }
  n(f_, "scandir");
  it.scandir = f_;
  function m_(t, e) {
    let r = Is(e);
    return d_.read(t, r);
  }
  n(m_, "scandirSync");
  it.scandirSync = m_;
  function Is(t = {}) {
    return t instanceof Ds.default ? t : new Ds.default(t);
  }
  n(Is, "getSettings");
});

// ../node_modules/reusify/reusify.js
var Eu = f((IP, bu) => {
  "use strict";
  function g_(t) {
    var e = new t(), r = e;
    function i() {
      var o = e;
      return o.next ? e = o.next : (e = new t(), r = e), o.next = null, o;
    }
    n(i, "get");
    function s(o) {
      r.next = o, r = o;
    }
    return n(s, "release"), {
      get: i,
      release: s
    };
  }
  n(g_, "reusify");
  bu.exports = g_;
});

// ../node_modules/fastq/queue.js
var vu = f((LP, Ns) => {
  "use strict";
  var y_ = Eu();
  function Su(t, e, r) {
    if (typeof t == "function" && (r = e, e = t, t = null), r < 1)
      throw new Error("fastqueue concurrency must be greater than 1");
    var i = y_(x_), s = null, o = null, a = 0, l = null, c = {
      push: b,
      drain: ge,
      saturated: ge,
      pause: h,
      paused: !1,
      concurrency: r,
      running: u,
      resume: v,
      idle: g,
      length: m,
      getQueue: p,
      unshift: R,
      empty: ge,
      kill: k,
      killAndDrain: D,
      error: H
    };
    return c;
    function u() {
      return a;
    }
    function h() {
      c.paused = !0;
    }
    function m() {
      for (var C = s, N = 0; C; )
        C = C.next, N++;
      return N;
    }
    function p() {
      for (var C = s, N = []; C; )
        N.push(C.value), C = C.next;
      return N;
    }
    function v() {
      if (c.paused) {
        c.paused = !1;
        for (var C = 0; C < c.concurrency; C++)
          a++, T();
      }
    }
    function g() {
      return a === 0 && c.length() === 0;
    }
    function b(C, N) {
      var O = i.get();
      O.context = t, O.release = T, O.value = C, O.callback = N || ge, O.errorHandler = l, a === c.concurrency || c.paused ? o ? (o.next = O,
      o = O) : (s = O, o = O, c.saturated()) : (a++, e.call(t, O.value, O.worked));
    }
    function R(C, N) {
      var O = i.get();
      O.context = t, O.release = T, O.value = C, O.callback = N || ge, a === c.concurrency || c.paused ? s ? (O.next = s, s = O) : (s = O, o =
      O, c.saturated()) : (a++, e.call(t, O.value, O.worked));
    }
    function T(C) {
      C && i.release(C);
      var N = s;
      N ? c.paused ? a-- : (o === s && (o = null), s = N.next, N.next = null, e.call(t, N.value, N.worked), o === null && c.empty()) : --a ===
      0 && c.drain();
    }
    function k() {
      s = null, o = null, c.drain = ge;
    }
    function D() {
      s = null, o = null, c.drain(), c.drain = ge;
    }
    function H(C) {
      l = C;
    }
  }
  n(Su, "fastqueue");
  function ge() {
  }
  n(ge, "noop");
  function x_() {
    this.value = null, this.callback = ge, this.next = null, this.release = ge, this.context = null, this.errorHandler = null;
    var t = this;
    this.worked = /* @__PURE__ */ n(function(r, i) {
      var s = t.callback, o = t.errorHandler, a = t.value;
      t.value = null, t.callback = ge, t.errorHandler && o(r, a), s.call(t.context, r, i), t.release(t);
    }, "worked");
  }
  n(x_, "Task");
  function __(t, e, r) {
    typeof t == "function" && (r = e, e = t, t = null);
    function i(h, m) {
      e.call(this, h).then(function(p) {
        m(null, p);
      }, m);
    }
    n(i, "asyncWrapper");
    var s = Su(t, i, r), o = s.push, a = s.unshift;
    return s.push = l, s.unshift = c, s.drained = u, s;
    function l(h) {
      var m = new Promise(function(p, v) {
        o(h, function(g, b) {
          if (g) {
            v(g);
            return;
          }
          p(b);
        });
      });
      return m.catch(ge), m;
    }
    n(l, "push");
    function c(h) {
      var m = new Promise(function(p, v) {
        a(h, function(g, b) {
          if (g) {
            v(g);
            return;
          }
          p(b);
        });
      });
      return m.catch(ge), m;
    }
    n(c, "unshift");
    function u() {
      if (s.idle())
        return new Promise(function(p) {
          p();
        });
      var h = s.drain, m = new Promise(function(p) {
        s.drain = function() {
          h(), p();
        };
      });
      return m;
    }
    n(u, "drained");
  }
  n(__, "queueAsPromised");
  Ns.exports = Su;
  Ns.exports.promise = __;
});

// ../node_modules/@nodelib/fs.walk/out/readers/common.js
var Gr = f((Ne) => {
  "use strict";
  Object.defineProperty(Ne, "__esModule", { value: !0 });
  Ne.joinPathSegments = Ne.replacePathSegmentSeparator = Ne.isAppliedFilter = Ne.isFatalError = void 0;
  function b_(t, e) {
    return t.errorFilter === null ? !0 : !t.errorFilter(e);
  }
  n(b_, "isFatalError");
  Ne.isFatalError = b_;
  function E_(t, e) {
    return t === null || t(e);
  }
  n(E_, "isAppliedFilter");
  Ne.isAppliedFilter = E_;
  function S_(t, e) {
    return t.split(/[/\\]/).join(e);
  }
  n(S_, "replacePathSegmentSeparator");
  Ne.replacePathSegmentSeparator = S_;
  function v_(t, e, r) {
    return t === "" ? e : t.endsWith(r) ? t + e : t + r + e;
  }
  n(v_, "joinPathSegments");
  Ne.joinPathSegments = v_;
});

// ../node_modules/@nodelib/fs.walk/out/readers/reader.js
var $s = f((ks) => {
  "use strict";
  Object.defineProperty(ks, "__esModule", { value: !0 });
  var w_ = Gr(), Ls = class {
    static {
      n(this, "Reader");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._root = w_.replacePathSegmentSeparator(e, r.pathSegmentSeparator);
    }
  };
  ks.default = Ls;
});

// ../node_modules/@nodelib/fs.walk/out/readers/async.js
var Fs = f((qs) => {
  "use strict";
  Object.defineProperty(qs, "__esModule", { value: !0 });
  var R_ = require("events"), T_ = Wr(), A_ = vu(), Vr = Gr(), P_ = $s(), Ms = class extends P_.default {
    static {
      n(this, "AsyncReader");
    }
    constructor(e, r) {
      super(e, r), this._settings = r, this._scandir = T_.scandir, this._emitter = new R_.EventEmitter(), this._queue = A_(this._worker.bind(
      this), this._settings.concurrency), this._isFatalError = !1, this._isDestroyed = !1, this._queue.drain = () => {
        this._isFatalError || this._emitter.emit("end");
      };
    }
    read() {
      return this._isFatalError = !1, this._isDestroyed = !1, setImmediate(() => {
        this._pushToQueue(this._root, this._settings.basePath);
      }), this._emitter;
    }
    get isDestroyed() {
      return this._isDestroyed;
    }
    destroy() {
      if (this._isDestroyed)
        throw new Error("The reader is already destroyed");
      this._isDestroyed = !0, this._queue.killAndDrain();
    }
    onEntry(e) {
      this._emitter.on("entry", e);
    }
    onError(e) {
      this._emitter.once("error", e);
    }
    onEnd(e) {
      this._emitter.once("end", e);
    }
    _pushToQueue(e, r) {
      let i = { directory: e, base: r };
      this._queue.push(i, (s) => {
        s !== null && this._handleError(s);
      });
    }
    _worker(e, r) {
      this._scandir(e.directory, this._settings.fsScandirSettings, (i, s) => {
        if (i !== null) {
          r(i, void 0);
          return;
        }
        for (let o of s)
          this._handleEntry(o, e.base);
        r(null, void 0);
      });
    }
    _handleError(e) {
      this._isDestroyed || !Vr.isFatalError(this._settings, e) || (this._isFatalError = !0, this._isDestroyed = !0, this._emitter.emit("erro\
r", e));
    }
    _handleEntry(e, r) {
      if (this._isDestroyed || this._isFatalError)
        return;
      let i = e.path;
      r !== void 0 && (e.path = Vr.joinPathSegments(r, e.name, this._settings.pathSegmentSeparator)), Vr.isAppliedFilter(this._settings.entryFilter,
      e) && this._emitEntry(e), e.dirent.isDirectory() && Vr.isAppliedFilter(this._settings.deepFilter, e) && this._pushToQueue(i, r === void 0 ?
      void 0 : e.path);
    }
    _emitEntry(e) {
      this._emitter.emit("entry", e);
    }
  };
  qs.default = Ms;
});

// ../node_modules/@nodelib/fs.walk/out/providers/async.js
var wu = f((Hs) => {
  "use strict";
  Object.defineProperty(Hs, "__esModule", { value: !0 });
  var O_ = Fs(), js = class {
    static {
      n(this, "AsyncProvider");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._reader = new O_.default(this._root, this._settings), this._storage = [];
    }
    read(e) {
      this._reader.onError((r) => {
        C_(e, r);
      }), this._reader.onEntry((r) => {
        this._storage.push(r);
      }), this._reader.onEnd(() => {
        D_(e, this._storage);
      }), this._reader.read();
    }
  };
  Hs.default = js;
  function C_(t, e) {
    t(e);
  }
  n(C_, "callFailureCallback");
  function D_(t, e) {
    t(null, e);
  }
  n(D_, "callSuccessCallback");
});

// ../node_modules/@nodelib/fs.walk/out/providers/stream.js
var Ru = f((Us) => {
  "use strict";
  Object.defineProperty(Us, "__esModule", { value: !0 });
  var I_ = require("stream"), N_ = Fs(), Bs = class {
    static {
      n(this, "StreamProvider");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._reader = new N_.default(this._root, this._settings), this._stream = new I_.Readable({
        objectMode: !0,
        read: /* @__PURE__ */ n(() => {
        }, "read"),
        destroy: /* @__PURE__ */ n(() => {
          this._reader.isDestroyed || this._reader.destroy();
        }, "destroy")
      });
    }
    read() {
      return this._reader.onError((e) => {
        this._stream.emit("error", e);
      }), this._reader.onEntry((e) => {
        this._stream.push(e);
      }), this._reader.onEnd(() => {
        this._stream.push(null);
      }), this._reader.read(), this._stream;
    }
  };
  Us.default = Bs;
});

// ../node_modules/@nodelib/fs.walk/out/readers/sync.js
var Tu = f((Gs) => {
  "use strict";
  Object.defineProperty(Gs, "__esModule", { value: !0 });
  var L_ = Wr(), Yr = Gr(), k_ = $s(), Ws = class extends k_.default {
    static {
      n(this, "SyncReader");
    }
    constructor() {
      super(...arguments), this._scandir = L_.scandirSync, this._storage = [], this._queue = /* @__PURE__ */ new Set();
    }
    read() {
      return this._pushToQueue(this._root, this._settings.basePath), this._handleQueue(), this._storage;
    }
    _pushToQueue(e, r) {
      this._queue.add({ directory: e, base: r });
    }
    _handleQueue() {
      for (let e of this._queue.values())
        this._handleDirectory(e.directory, e.base);
    }
    _handleDirectory(e, r) {
      try {
        let i = this._scandir(e, this._settings.fsScandirSettings);
        for (let s of i)
          this._handleEntry(s, r);
      } catch (i) {
        this._handleError(i);
      }
    }
    _handleError(e) {
      if (Yr.isFatalError(this._settings, e))
        throw e;
    }
    _handleEntry(e, r) {
      let i = e.path;
      r !== void 0 && (e.path = Yr.joinPathSegments(r, e.name, this._settings.pathSegmentSeparator)), Yr.isAppliedFilter(this._settings.entryFilter,
      e) && this._pushToStorage(e), e.dirent.isDirectory() && Yr.isAppliedFilter(this._settings.deepFilter, e) && this._pushToQueue(i, r ===
      void 0 ? void 0 : e.path);
    }
    _pushToStorage(e) {
      this._storage.push(e);
    }
  };
  Gs.default = Ws;
});

// ../node_modules/@nodelib/fs.walk/out/providers/sync.js
var Au = f((Ys) => {
  "use strict";
  Object.defineProperty(Ys, "__esModule", { value: !0 });
  var $_ = Tu(), Vs = class {
    static {
      n(this, "SyncProvider");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._reader = new $_.default(this._root, this._settings);
    }
    read() {
      return this._reader.read();
    }
  };
  Ys.default = Vs;
});

// ../node_modules/@nodelib/fs.walk/out/settings.js
var Pu = f((Ks) => {
  "use strict";
  Object.defineProperty(Ks, "__esModule", { value: !0 });
  var M_ = require("path"), q_ = Wr(), zs = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.basePath = this._getValue(this._options.basePath, void 0), this.concurrency = this._getValue(this._options.concurrency,
      Number.POSITIVE_INFINITY), this.deepFilter = this._getValue(this._options.deepFilter, null), this.entryFilter = this._getValue(this._options.
      entryFilter, null), this.errorFilter = this._getValue(this._options.errorFilter, null), this.pathSegmentSeparator = this._getValue(this.
      _options.pathSegmentSeparator, M_.sep), this.fsScandirSettings = new q_.Settings({
        followSymbolicLinks: this._options.followSymbolicLinks,
        fs: this._options.fs,
        pathSegmentSeparator: this._options.pathSegmentSeparator,
        stats: this._options.stats,
        throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink
      });
    }
    _getValue(e, r) {
      return e ?? r;
    }
  };
  Ks.default = zs;
});

// ../node_modules/@nodelib/fs.walk/out/index.js
var Kr = f((Le) => {
  "use strict";
  Object.defineProperty(Le, "__esModule", { value: !0 });
  Le.Settings = Le.walkStream = Le.walkSync = Le.walk = void 0;
  var Ou = wu(), F_ = Ru(), j_ = Au(), Qs = Pu();
  Le.Settings = Qs.default;
  function H_(t, e, r) {
    if (typeof e == "function") {
      new Ou.default(t, zr()).read(e);
      return;
    }
    new Ou.default(t, zr(e)).read(r);
  }
  n(H_, "walk");
  Le.walk = H_;
  function B_(t, e) {
    let r = zr(e);
    return new j_.default(t, r).read();
  }
  n(B_, "walkSync");
  Le.walkSync = B_;
  function U_(t, e) {
    let r = zr(e);
    return new F_.default(t, r).read();
  }
  n(U_, "walkStream");
  Le.walkStream = U_;
  function zr(t = {}) {
    return t instanceof Qs.default ? t : new Qs.default(t);
  }
  n(zr, "getSettings");
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/reader.js
var Qr = f((Zs) => {
  "use strict";
  Object.defineProperty(Zs, "__esModule", { value: !0 });
  var W_ = require("path"), G_ = dt(), Cu = Be(), Xs = class {
    static {
      n(this, "Reader");
    }
    constructor(e) {
      this._settings = e, this._fsStatSettings = new G_.Settings({
        followSymbolicLink: this._settings.followSymbolicLinks,
        fs: this._settings.fs,
        throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
      });
    }
    _getFullEntryPath(e) {
      return W_.resolve(this._settings.cwd, e);
    }
    _makeEntry(e, r) {
      let i = {
        name: r,
        path: r,
        dirent: Cu.fs.createDirentFromStats(r, e)
      };
      return this._settings.stats && (i.stats = e), i;
    }
    _isFatalError(e) {
      return !Cu.errno.isEnoentCodeError(e) && !this._settings.suppressErrors;
    }
  };
  Zs.default = Xs;
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/stream.js
var tn = f((en) => {
  "use strict";
  Object.defineProperty(en, "__esModule", { value: !0 });
  var V_ = require("stream"), Y_ = dt(), z_ = Kr(), K_ = Qr(), Js = class extends K_.default {
    static {
      n(this, "ReaderStream");
    }
    constructor() {
      super(...arguments), this._walkStream = z_.walkStream, this._stat = Y_.stat;
    }
    dynamic(e, r) {
      return this._walkStream(e, r);
    }
    static(e, r) {
      let i = e.map(this._getFullEntryPath, this), s = new V_.PassThrough({ objectMode: !0 });
      s._write = (o, a, l) => this._getEntry(i[o], e[o], r).then((c) => {
        c !== null && r.entryFilter(c) && s.push(c), o === i.length - 1 && s.end(), l();
      }).catch(l);
      for (let o = 0; o < i.length; o++)
        s.write(o);
      return s;
    }
    _getEntry(e, r, i) {
      return this._getStat(e).then((s) => this._makeEntry(s, r)).catch((s) => {
        if (i.errorFilter(s))
          return null;
        throw s;
      });
    }
    _getStat(e) {
      return new Promise((r, i) => {
        this._stat(e, this._fsStatSettings, (s, o) => s === null ? r(o) : i(s));
      });
    }
  };
  en.default = Js;
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/async.js
var Du = f((sn) => {
  "use strict";
  Object.defineProperty(sn, "__esModule", { value: !0 });
  var Q_ = Kr(), X_ = Qr(), Z_ = tn(), rn = class extends X_.default {
    static {
      n(this, "ReaderAsync");
    }
    constructor() {
      super(...arguments), this._walkAsync = Q_.walk, this._readerStream = new Z_.default(this._settings);
    }
    dynamic(e, r) {
      return new Promise((i, s) => {
        this._walkAsync(e, r, (o, a) => {
          o === null ? i(a) : s(o);
        });
      });
    }
    async static(e, r) {
      let i = [], s = this._readerStream.static(e, r);
      return new Promise((o, a) => {
        s.once("error", a), s.on("data", (l) => i.push(l)), s.once("end", () => o(i));
      });
    }
  };
  sn.default = rn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/matchers/matcher.js
var Iu = f((on) => {
  "use strict";
  Object.defineProperty(on, "__esModule", { value: !0 });
  var Qt = Be(), nn = class {
    static {
      n(this, "Matcher");
    }
    constructor(e, r, i) {
      this._patterns = e, this._settings = r, this._micromatchOptions = i, this._storage = [], this._fillStorage();
    }
    _fillStorage() {
      for (let e of this._patterns) {
        let r = this._getPatternSegments(e), i = this._splitSegmentsIntoSections(r);
        this._storage.push({
          complete: i.length <= 1,
          pattern: e,
          segments: r,
          sections: i
        });
      }
    }
    _getPatternSegments(e) {
      return Qt.pattern.getPatternParts(e, this._micromatchOptions).map((i) => Qt.pattern.isDynamicPattern(i, this._settings) ? {
        dynamic: !0,
        pattern: i,
        patternRe: Qt.pattern.makeRe(i, this._micromatchOptions)
      } : {
        dynamic: !1,
        pattern: i
      });
    }
    _splitSegmentsIntoSections(e) {
      return Qt.array.splitWhen(e, (r) => r.dynamic && Qt.pattern.hasGlobStar(r.pattern));
    }
  };
  on.default = nn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/matchers/partial.js
var Nu = f((ln) => {
  "use strict";
  Object.defineProperty(ln, "__esModule", { value: !0 });
  var J_ = Iu(), an = class extends J_.default {
    static {
      n(this, "PartialMatcher");
    }
    match(e) {
      let r = e.split("/"), i = r.length, s = this._storage.filter((o) => !o.complete || o.segments.length > i);
      for (let o of s) {
        let a = o.sections[0];
        if (!o.complete && i > a.length || r.every((c, u) => {
          let h = o.segments[u];
          return !!(h.dynamic && h.patternRe.test(c) || !h.dynamic && h.pattern === c);
        }))
          return !0;
      }
      return !1;
    }
  };
  ln.default = an;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/filters/deep.js
var Lu = f((un) => {
  "use strict";
  Object.defineProperty(un, "__esModule", { value: !0 });
  var Xr = Be(), eb = Nu(), cn = class {
    static {
      n(this, "DeepFilter");
    }
    constructor(e, r) {
      this._settings = e, this._micromatchOptions = r;
    }
    getFilter(e, r, i) {
      let s = this._getMatcher(r), o = this._getNegativePatternsRe(i);
      return (a) => this._filter(e, a, s, o);
    }
    _getMatcher(e) {
      return new eb.default(e, this._settings, this._micromatchOptions);
    }
    _getNegativePatternsRe(e) {
      let r = e.filter(Xr.pattern.isAffectDepthOfReadingPattern);
      return Xr.pattern.convertPatternsToRe(r, this._micromatchOptions);
    }
    _filter(e, r, i, s) {
      if (this._isSkippedByDeep(e, r.path) || this._isSkippedSymbolicLink(r))
        return !1;
      let o = Xr.path.removeLeadingDotSegment(r.path);
      return this._isSkippedByPositivePatterns(o, i) ? !1 : this._isSkippedByNegativePatterns(o, s);
    }
    _isSkippedByDeep(e, r) {
      return this._settings.deep === 1 / 0 ? !1 : this._getEntryLevel(e, r) >= this._settings.deep;
    }
    _getEntryLevel(e, r) {
      let i = r.split("/").length;
      if (e === "")
        return i;
      let s = e.split("/").length;
      return i - s;
    }
    _isSkippedSymbolicLink(e) {
      return !this._settings.followSymbolicLinks && e.dirent.isSymbolicLink();
    }
    _isSkippedByPositivePatterns(e, r) {
      return !this._settings.baseNameMatch && !r.match(e);
    }
    _isSkippedByNegativePatterns(e, r) {
      return !Xr.pattern.matchAny(e, r);
    }
  };
  un.default = cn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/filters/entry.js
var ku = f((pn) => {
  "use strict";
  Object.defineProperty(pn, "__esModule", { value: !0 });
  var ft = Be(), hn = class {
    static {
      n(this, "EntryFilter");
    }
    constructor(e, r) {
      this._settings = e, this._micromatchOptions = r, this.index = /* @__PURE__ */ new Map();
    }
    getFilter(e, r) {
      let i = ft.pattern.convertPatternsToRe(e, this._micromatchOptions), s = ft.pattern.convertPatternsToRe(r, Object.assign(Object.assign(
      {}, this._micromatchOptions), { dot: !0 }));
      return (o) => this._filter(o, i, s);
    }
    _filter(e, r, i) {
      let s = ft.path.removeLeadingDotSegment(e.path);
      if (this._settings.unique && this._isDuplicateEntry(s) || this._onlyFileFilter(e) || this._onlyDirectoryFilter(e) || this._isSkippedByAbsoluteNegativePatterns(
      s, i))
        return !1;
      let o = e.dirent.isDirectory(), a = this._isMatchToPatterns(s, r, o) && !this._isMatchToPatterns(s, i, o);
      return this._settings.unique && a && this._createIndexRecord(s), a;
    }
    _isDuplicateEntry(e) {
      return this.index.has(e);
    }
    _createIndexRecord(e) {
      this.index.set(e, void 0);
    }
    _onlyFileFilter(e) {
      return this._settings.onlyFiles && !e.dirent.isFile();
    }
    _onlyDirectoryFilter(e) {
      return this._settings.onlyDirectories && !e.dirent.isDirectory();
    }
    _isSkippedByAbsoluteNegativePatterns(e, r) {
      if (!this._settings.absolute)
        return !1;
      let i = ft.path.makeAbsolute(this._settings.cwd, e);
      return ft.pattern.matchAny(i, r);
    }
    _isMatchToPatterns(e, r, i) {
      let s = ft.pattern.matchAny(e, r);
      return !s && i ? ft.pattern.matchAny(e + "/", r) : s;
    }
  };
  pn.default = hn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/filters/error.js
var $u = f((fn) => {
  "use strict";
  Object.defineProperty(fn, "__esModule", { value: !0 });
  var tb = Be(), dn = class {
    static {
      n(this, "ErrorFilter");
    }
    constructor(e) {
      this._settings = e;
    }
    getFilter() {
      return (e) => this._isNonFatalError(e);
    }
    _isNonFatalError(e) {
      return tb.errno.isEnoentCodeError(e) || this._settings.suppressErrors;
    }
  };
  fn.default = dn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/transformers/entry.js
var qu = f((gn) => {
  "use strict";
  Object.defineProperty(gn, "__esModule", { value: !0 });
  var Mu = Be(), mn = class {
    static {
      n(this, "EntryTransformer");
    }
    constructor(e) {
      this._settings = e;
    }
    getTransformer() {
      return (e) => this._transform(e);
    }
    _transform(e) {
      let r = e.path;
      return this._settings.absolute && (r = Mu.path.makeAbsolute(this._settings.cwd, r), r = Mu.path.unixify(r)), this._settings.markDirectories &&
      e.dirent.isDirectory() && (r += "/"), this._settings.objectMode ? Object.assign(Object.assign({}, e), { path: r }) : r;
    }
  };
  gn.default = mn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/provider.js
var Zr = f((xn) => {
  "use strict";
  Object.defineProperty(xn, "__esModule", { value: !0 });
  var rb = require("path"), ib = Lu(), sb = ku(), nb = $u(), ob = qu(), yn = class {
    static {
      n(this, "Provider");
    }
    constructor(e) {
      this._settings = e, this.errorFilter = new nb.default(this._settings), this.entryFilter = new sb.default(this._settings, this._getMicromatchOptions()),
      this.deepFilter = new ib.default(this._settings, this._getMicromatchOptions()), this.entryTransformer = new ob.default(this._settings);
    }
    _getRootDirectory(e) {
      return rb.resolve(this._settings.cwd, e.base);
    }
    _getReaderOptions(e) {
      let r = e.base === "." ? "" : e.base;
      return {
        basePath: r,
        pathSegmentSeparator: "/",
        concurrency: this._settings.concurrency,
        deepFilter: this.deepFilter.getFilter(r, e.positive, e.negative),
        entryFilter: this.entryFilter.getFilter(e.positive, e.negative),
        errorFilter: this.errorFilter.getFilter(),
        followSymbolicLinks: this._settings.followSymbolicLinks,
        fs: this._settings.fs,
        stats: this._settings.stats,
        throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink,
        transform: this.entryTransformer.getTransformer()
      };
    }
    _getMicromatchOptions() {
      return {
        dot: this._settings.dot,
        matchBase: this._settings.baseNameMatch,
        nobrace: !this._settings.braceExpansion,
        nocase: !this._settings.caseSensitiveMatch,
        noext: !this._settings.extglob,
        noglobstar: !this._settings.globstar,
        posix: !0,
        strictSlashes: !1
      };
    }
  };
  xn.default = yn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/async.js
var Fu = f((bn) => {
  "use strict";
  Object.defineProperty(bn, "__esModule", { value: !0 });
  var ab = Du(), lb = Zr(), _n = class extends lb.default {
    static {
      n(this, "ProviderAsync");
    }
    constructor() {
      super(...arguments), this._reader = new ab.default(this._settings);
    }
    async read(e) {
      let r = this._getRootDirectory(e), i = this._getReaderOptions(e);
      return (await this.api(r, e, i)).map((o) => i.transform(o));
    }
    api(e, r, i) {
      return r.dynamic ? this._reader.dynamic(e, i) : this._reader.static(r.patterns, i);
    }
  };
  bn.default = _n;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/stream.js
var ju = f((Sn) => {
  "use strict";
  Object.defineProperty(Sn, "__esModule", { value: !0 });
  var cb = require("stream"), ub = tn(), hb = Zr(), En = class extends hb.default {
    static {
      n(this, "ProviderStream");
    }
    constructor() {
      super(...arguments), this._reader = new ub.default(this._settings);
    }
    read(e) {
      let r = this._getRootDirectory(e), i = this._getReaderOptions(e), s = this.api(r, e, i), o = new cb.Readable({ objectMode: !0, read: /* @__PURE__ */ n(
      () => {
      }, "read") });
      return s.once("error", (a) => o.emit("error", a)).on("data", (a) => o.emit("data", i.transform(a))).once("end", () => o.emit("end")), o.
      once("close", () => s.destroy()), o;
    }
    api(e, r, i) {
      return r.dynamic ? this._reader.dynamic(e, i) : this._reader.static(r.patterns, i);
    }
  };
  Sn.default = En;
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/sync.js
var Hu = f((wn) => {
  "use strict";
  Object.defineProperty(wn, "__esModule", { value: !0 });
  var pb = dt(), db = Kr(), fb = Qr(), vn = class extends fb.default {
    static {
      n(this, "ReaderSync");
    }
    constructor() {
      super(...arguments), this._walkSync = db.walkSync, this._statSync = pb.statSync;
    }
    dynamic(e, r) {
      return this._walkSync(e, r);
    }
    static(e, r) {
      let i = [];
      for (let s of e) {
        let o = this._getFullEntryPath(s), a = this._getEntry(o, s, r);
        a === null || !r.entryFilter(a) || i.push(a);
      }
      return i;
    }
    _getEntry(e, r, i) {
      try {
        let s = this._getStat(e);
        return this._makeEntry(s, r);
      } catch (s) {
        if (i.errorFilter(s))
          return null;
        throw s;
      }
    }
    _getStat(e) {
      return this._statSync(e, this._fsStatSettings);
    }
  };
  wn.default = vn;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/sync.js
var Bu = f((Tn) => {
  "use strict";
  Object.defineProperty(Tn, "__esModule", { value: !0 });
  var mb = Hu(), gb = Zr(), Rn = class extends gb.default {
    static {
      n(this, "ProviderSync");
    }
    constructor() {
      super(...arguments), this._reader = new mb.default(this._settings);
    }
    read(e) {
      let r = this._getRootDirectory(e), i = this._getReaderOptions(e);
      return this.api(r, e, i).map(i.transform);
    }
    api(e, r, i) {
      return r.dynamic ? this._reader.dynamic(e, i) : this._reader.static(r.patterns, i);
    }
  };
  Tn.default = Rn;
});

// ../node_modules/globby/node_modules/fast-glob/out/settings.js
var Uu = f((Ot) => {
  "use strict";
  Object.defineProperty(Ot, "__esModule", { value: !0 });
  Ot.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
  var Pt = require("fs"), yb = require("os"), xb = Math.max(yb.cpus().length, 1);
  Ot.DEFAULT_FILE_SYSTEM_ADAPTER = {
    lstat: Pt.lstat,
    lstatSync: Pt.lstatSync,
    stat: Pt.stat,
    statSync: Pt.statSync,
    readdir: Pt.readdir,
    readdirSync: Pt.readdirSync
  };
  var An = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.absolute = this._getValue(this._options.absolute, !1), this.baseNameMatch = this._getValue(this._options.baseNameMatch,
      !1), this.braceExpansion = this._getValue(this._options.braceExpansion, !0), this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch,
      !0), this.concurrency = this._getValue(this._options.concurrency, xb), this.cwd = this._getValue(this._options.cwd, process.cwd()), this.
      deep = this._getValue(this._options.deep, 1 / 0), this.dot = this._getValue(this._options.dot, !1), this.extglob = this._getValue(this.
      _options.extglob, !0), this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !0), this.fs = this._getFileSystemMethods(
      this._options.fs), this.globstar = this._getValue(this._options.globstar, !0), this.ignore = this._getValue(this._options.ignore, []),
      this.markDirectories = this._getValue(this._options.markDirectories, !1), this.objectMode = this._getValue(this._options.objectMode, !1),
      this.onlyDirectories = this._getValue(this._options.onlyDirectories, !1), this.onlyFiles = this._getValue(this._options.onlyFiles, !0),
      this.stats = this._getValue(this._options.stats, !1), this.suppressErrors = this._getValue(this._options.suppressErrors, !1), this.throwErrorOnBrokenSymbolicLink =
      this._getValue(this._options.throwErrorOnBrokenSymbolicLink, !1), this.unique = this._getValue(this._options.unique, !0), this.onlyDirectories &&
      (this.onlyFiles = !1), this.stats && (this.objectMode = !0), this.ignore = [].concat(this.ignore);
    }
    _getValue(e, r) {
      return e === void 0 ? r : e;
    }
    _getFileSystemMethods(e = {}) {
      return Object.assign(Object.assign({}, Ot.DEFAULT_FILE_SYSTEM_ADAPTER), e);
    }
  };
  Ot.default = An;
});

// ../node_modules/globby/node_modules/fast-glob/out/index.js
var Dn = f((CO, Gu) => {
  "use strict";
  var Wu = Gc(), _b = Fu(), bb = ju(), Eb = Bu(), Pn = Uu(), ye = Be();
  async function On(t, e) {
    Se(t);
    let r = Cn(t, _b.default, e), i = await Promise.all(r);
    return ye.array.flatten(i);
  }
  n(On, "FastGlob");
  (function(t) {
    t.glob = t, t.globSync = e, t.globStream = r, t.async = t;
    function e(u, h) {
      Se(u);
      let m = Cn(u, Eb.default, h);
      return ye.array.flatten(m);
    }
    n(e, "sync"), t.sync = e;
    function r(u, h) {
      Se(u);
      let m = Cn(u, bb.default, h);
      return ye.stream.merge(m);
    }
    n(r, "stream"), t.stream = r;
    function i(u, h) {
      Se(u);
      let m = [].concat(u), p = new Pn.default(h);
      return Wu.generate(m, p);
    }
    n(i, "generateTasks"), t.generateTasks = i;
    function s(u, h) {
      Se(u);
      let m = new Pn.default(h);
      return ye.pattern.isDynamicPattern(u, m);
    }
    n(s, "isDynamicPattern"), t.isDynamicPattern = s;
    function o(u) {
      return Se(u), ye.path.escape(u);
    }
    n(o, "escapePath"), t.escapePath = o;
    function a(u) {
      return Se(u), ye.path.convertPathToPattern(u);
    }
    n(a, "convertPathToPattern"), t.convertPathToPattern = a;
    let l;
    (function(u) {
      function h(p) {
        return Se(p), ye.path.escapePosixPath(p);
      }
      n(h, "escapePath"), u.escapePath = h;
      function m(p) {
        return Se(p), ye.path.convertPosixPathToPattern(p);
      }
      n(m, "convertPathToPattern"), u.convertPathToPattern = m;
    })(l = t.posix || (t.posix = {}));
    let c;
    (function(u) {
      function h(p) {
        return Se(p), ye.path.escapeWindowsPath(p);
      }
      n(h, "escapePath"), u.escapePath = h;
      function m(p) {
        return Se(p), ye.path.convertWindowsPathToPattern(p);
      }
      n(m, "convertPathToPattern"), u.convertPathToPattern = m;
    })(c = t.win32 || (t.win32 = {}));
  })(On || (On = {}));
  function Cn(t, e, r) {
    let i = [].concat(t), s = new Pn.default(r), o = Wu.generate(i, s), a = new e(s);
    return o.map(a.read, a);
  }
  n(Cn, "getWorks");
  function Se(t) {
    if (![].concat(t).every((i) => ye.string.isString(i) && !ye.string.isEmpty(i)))
      throw new TypeError("Patterns must be a string (non empty) or an array of strings");
  }
  n(Se, "assertPatternsInput");
  Gu.exports = On;
});

// ../node_modules/globby/node_modules/path-type/index.js
async function In(t, e, r) {
  if (typeof r != "string")
    throw new TypeError(`Expected a string, got ${typeof r}`);
  try {
    return (await Jr.promises[t](r))[e]();
  } catch (i) {
    if (i.code === "ENOENT")
      return !1;
    throw i;
  }
}
function Nn(t, e, r) {
  if (typeof r != "string")
    throw new TypeError(`Expected a string, got ${typeof r}`);
  try {
    return Jr.default[t](r)[e]();
  } catch (i) {
    if (i.code === "ENOENT")
      return !1;
    throw i;
  }
}
var Jr, IO, Vu, NO, LO, Yu, kO, zu = fe(() => {
  Jr = j(require("fs"), 1);
  n(In, "isType");
  n(Nn, "isTypeSync");
  IO = In.bind(null, "stat", "isFile"), Vu = In.bind(null, "stat", "isDirectory"), NO = In.bind(null, "lstat", "isSymbolicLink"), LO = Nn.bind(
  null, "statSync", "isFile"), Yu = Nn.bind(null, "statSync", "isDirectory"), kO = Nn.bind(null, "lstatSync", "isSymbolicLink");
});

// ../node_modules/unicorn-magic/default.js
var Ku = fe(() => {
});

// ../node_modules/unicorn-magic/node.js
function Xt(t) {
  return t instanceof URL ? (0, Qu.fileURLToPath)(t) : t;
}
var Qu, Ln = fe(() => {
  Qu = require("node:url");
  Ku();
  n(Xt, "toPath");
});

// ../node_modules/ignore/index.js
var nh = f((UO, sh) => {
  function Xu(t) {
    return Array.isArray(t) ? t : [t];
  }
  n(Xu, "makeArray");
  var Mn = "", Zu = " ", kn = "\\", Sb = /^\s+$/, vb = /(?:[^\\]|^)\\$/, wb = /^\\!/, Rb = /^\\#/, Tb = /\r?\n/g, Ab = /^\.*\/|^\.+$/, $n = "\
/", th = "node-ignore";
  typeof Symbol < "u" && (th = Symbol.for("node-ignore"));
  var Ju = th, Pb = /* @__PURE__ */ n((t, e, r) => Object.defineProperty(t, e, { value: r }), "define"), Ob = /([0-z])-([0-z])/g, rh = /* @__PURE__ */ n(
  () => !1, "RETURN_FALSE"), Cb = /* @__PURE__ */ n((t) => t.replace(
    Ob,
    (e, r, i) => r.charCodeAt(0) <= i.charCodeAt(0) ? e : Mn
  ), "sanitizeRange"), Db = /* @__PURE__ */ n((t) => {
    let { length: e } = t;
    return t.slice(0, e - e % 2);
  }, "cleanRangeBackSlash"), Ib = [
    [
      // remove BOM
      // TODO:
      // Other similar zero-width characters?
      /^\uFEFF/,
      () => Mn
    ],
    // > Trailing spaces are ignored unless they are quoted with backslash ("\")
    [
      // (a\ ) -> (a )
      // (a  ) -> (a)
      // (a ) -> (a)
      // (a \ ) -> (a  )
      /((?:\\\\)*?)(\\?\s+)$/,
      (t, e, r) => e + (r.indexOf("\\") === 0 ? Zu : Mn)
    ],
    // replace (\ ) with ' '
    // (\ ) -> ' '
    // (\\ ) -> '\\ '
    // (\\\ ) -> '\\ '
    [
      /(\\+?)\s/g,
      (t, e) => {
        let { length: r } = e;
        return e.slice(0, r - r % 2) + Zu;
      }
    ],
    // Escape metacharacters
    // which is written down by users but means special for regular expressions.
    // > There are 12 characters with special meanings:
    // > - the backslash \,
    // > - the caret ^,
    // > - the dollar sign $,
    // > - the period or dot .,
    // > - the vertical bar or pipe symbol |,
    // > - the question mark ?,
    // > - the asterisk or star *,
    // > - the plus sign +,
    // > - the opening parenthesis (,
    // > - the closing parenthesis ),
    // > - and the opening square bracket [,
    // > - the opening curly brace {,
    // > These special characters are often called "metacharacters".
    [
      /[\\$.|*+(){^]/g,
      (t) => `\\${t}`
    ],
    [
      // > a question mark (?) matches a single character
      /(?!\\)\?/g,
      () => "[^/]"
    ],
    // leading slash
    [
      // > A leading slash matches the beginning of the pathname.
      // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
      // A leading slash matches the beginning of the pathname
      /^\//,
      () => "^"
    ],
    // replace special metacharacter slash after the leading slash
    [
      /\//g,
      () => "\\/"
    ],
    [
      // > A leading "**" followed by a slash means match in all directories.
      // > For example, "**/foo" matches file or directory "foo" anywhere,
      // > the same as pattern "foo".
      // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
      // >   under directory "foo".
      // Notice that the '*'s have been replaced as '\\*'
      /^\^*\\\*\\\*\\\//,
      // '**/foo' <-> 'foo'
      () => "^(?:.*\\/)?"
    ],
    // starting
    [
      // there will be no leading '/'
      //   (which has been replaced by section "leading slash")
      // If starts with '**', adding a '^' to the regular expression also works
      /^(?=[^^])/,
      /* @__PURE__ */ n(function() {
        return /\/(?!$)/.test(this) ? "^" : "(?:^|\\/)";
      }, "startingReplacer")
    ],
    // two globstars
    [
      // Use lookahead assertions so that we could match more than one `'/**'`
      /\\\/\\\*\\\*(?=\\\/|$)/g,
      // Zero, one or several directories
      // should not use '*', or it will be replaced by the next replacer
      // Check if it is not the last `'/**'`
      (t, e, r) => e + 6 < r.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
    ],
    // normal intermediate wildcards
    [
      // Never replace escaped '*'
      // ignore rule '\*' will match the path '*'
      // 'abc.*/' -> go
      // 'abc.*'  -> skip this rule,
      //    coz trailing single wildcard will be handed by [trailing wildcard]
      /(^|[^\\]+)(\\\*)+(?=.+)/g,
      // '*.js' matches '.js'
      // '*.js' doesn't match 'abc'
      (t, e, r) => {
        let i = r.replace(/\\\*/g, "[^\\/]*");
        return e + i;
      }
    ],
    [
      // unescape, revert step 3 except for back slash
      // For example, if a user escape a '\\*',
      // after step 3, the result will be '\\\\\\*'
      /\\\\\\(?=[$.|*+(){^])/g,
      () => kn
    ],
    [
      // '\\\\' -> '\\'
      /\\\\/g,
      () => kn
    ],
    [
      // > The range notation, e.g. [a-zA-Z],
      // > can be used to match one of the characters in a range.
      // `\` is escaped by step 3
      /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
      (t, e, r, i, s) => e === kn ? `\\[${r}${Db(i)}${s}` : s === "]" && i.length % 2 === 0 ? `[${Cb(r)}${i}]` : "[]"
    ],
    // ending
    [
      // 'js' will not match 'js.'
      // 'ab' will not match 'abc'
      /(?:[^*])$/,
      // WTF!
      // https://git-scm.com/docs/gitignore
      // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
      // which re-fixes #24, #38
      // > If there is a separator at the end of the pattern then the pattern
      // > will only match directories, otherwise the pattern can match both
      // > files and directories.
      // 'js*' will not match 'a.js'
      // 'js/' will not match 'a.js'
      // 'js' will match 'a.js' and 'a.js/'
      (t) => /\/$/.test(t) ? `${t}$` : `${t}(?=$|\\/$)`
    ],
    // trailing wildcard
    [
      /(\^|\\\/)?\\\*$/,
      (t, e) => `${e ? `${e}[^/]+` : "[^/]*"}(?=$|\\/$)`
    ]
  ], eh = /* @__PURE__ */ Object.create(null), Nb = /* @__PURE__ */ n((t, e) => {
    let r = eh[t];
    return r || (r = Ib.reduce(
      (i, [s, o]) => i.replace(s, o.bind(t)),
      t
    ), eh[t] = r), e ? new RegExp(r, "i") : new RegExp(r);
  }, "makeRegex"), jn = /* @__PURE__ */ n((t) => typeof t == "string", "isString"), Lb = /* @__PURE__ */ n((t) => t && jn(t) && !Sb.test(t) &&
  !vb.test(t) && t.indexOf("#") !== 0, "checkPattern"), kb = /* @__PURE__ */ n((t) => t.split(Tb), "splitPattern"), qn = class {
    static {
      n(this, "IgnoreRule");
    }
    constructor(e, r, i, s) {
      this.origin = e, this.pattern = r, this.negative = i, this.regex = s;
    }
  }, $b = /* @__PURE__ */ n((t, e) => {
    let r = t, i = !1;
    t.indexOf("!") === 0 && (i = !0, t = t.substr(1)), t = t.replace(wb, "!").replace(Rb, "#");
    let s = Nb(t, e);
    return new qn(
      r,
      t,
      i,
      s
    );
  }, "createRule"), Mb = /* @__PURE__ */ n((t, e) => {
    throw new e(t);
  }, "throwError"), Ue = /* @__PURE__ */ n((t, e, r) => jn(t) ? t ? Ue.isNotRelative(t) ? r(
    `path should be a \`path.relative()\`d string, but got "${e}"`,
    RangeError
  ) : !0 : r("path must not be empty", TypeError) : r(
    `path must be a string, but got \`${e}\``,
    TypeError
  ), "checkPath"), ih = /* @__PURE__ */ n((t) => Ab.test(t), "isNotRelative");
  Ue.isNotRelative = ih;
  Ue.convert = (t) => t;
  var Fn = class {
    static {
      n(this, "Ignore");
    }
    constructor({
      ignorecase: e = !0,
      ignoreCase: r = e,
      allowRelativePaths: i = !1
    } = {}) {
      Pb(this, Ju, !0), this._rules = [], this._ignoreCase = r, this._allowRelativePaths = i, this._initCache();
    }
    _initCache() {
      this._ignoreCache = /* @__PURE__ */ Object.create(null), this._testCache = /* @__PURE__ */ Object.create(null);
    }
    _addPattern(e) {
      if (e && e[Ju]) {
        this._rules = this._rules.concat(e._rules), this._added = !0;
        return;
      }
      if (Lb(e)) {
        let r = $b(e, this._ignoreCase);
        this._added = !0, this._rules.push(r);
      }
    }
    // @param {Array<string> | string | Ignore} pattern
    add(e) {
      return this._added = !1, Xu(
        jn(e) ? kb(e) : e
      ).forEach(this._addPattern, this), this._added && this._initCache(), this;
    }
    // legacy
    addPattern(e) {
      return this.add(e);
    }
    //          |           ignored : unignored
    // negative |   0:0   |   0:1   |   1:0   |   1:1
    // -------- | ------- | ------- | ------- | --------
    //     0    |  TEST   |  TEST   |  SKIP   |    X
    //     1    |  TESTIF |  SKIP   |  TEST   |    X
    // - SKIP: always skip
    // - TEST: always test
    // - TESTIF: only test if checkUnignored
    // - X: that never happen
    // @param {boolean} whether should check if the path is unignored,
    //   setting `checkUnignored` to `false` could reduce additional
    //   path matching.
    // @returns {TestResult} true if a file is ignored
    _testOne(e, r) {
      let i = !1, s = !1;
      return this._rules.forEach((o) => {
        let { negative: a } = o;
        if (s === a && i !== s || a && !i && !s && !r)
          return;
        o.regex.test(e) && (i = !a, s = a);
      }), {
        ignored: i,
        unignored: s
      };
    }
    // @returns {TestResult}
    _test(e, r, i, s) {
      let o = e && Ue.convert(e);
      return Ue(
        o,
        e,
        this._allowRelativePaths ? rh : Mb
      ), this._t(o, r, i, s);
    }
    _t(e, r, i, s) {
      if (e in r)
        return r[e];
      if (s || (s = e.split($n)), s.pop(), !s.length)
        return r[e] = this._testOne(e, i);
      let o = this._t(
        s.join($n) + $n,
        r,
        i,
        s
      );
      return r[e] = o.ignored ? o : this._testOne(e, i);
    }
    ignores(e) {
      return this._test(e, this._ignoreCache, !1).ignored;
    }
    createFilter() {
      return (e) => !this.ignores(e);
    }
    filter(e) {
      return Xu(e).filter(this.createFilter());
    }
    // @returns {TestResult}
    test(e) {
      return this._test(e, this._testCache, !0);
    }
  }, ei = /* @__PURE__ */ n((t) => new Fn(t), "factory"), qb = /* @__PURE__ */ n((t) => Ue(t && Ue.convert(t), t, rh), "isPathValid");
  ei.isPathValid = qb;
  ei.default = ei;
  sh.exports = ei;
  if (
    // Detect `process` so that it can run in browsers.
    typeof process < "u" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
  ) {
    let t = /* @__PURE__ */ n((r) => /^\\\\\?\\/.test(r) || /["<>|\u0000-\u001F]+/u.test(r) ? r : r.replace(/\\/g, "/"), "makePosix");
    Ue.convert = t;
    let e = /^[a-z]:\//i;
    Ue.isNotRelative = (r) => e.test(r) || ih(r);
  }
});

// ../node_modules/slash/index.js
function Ct(t) {
  return t.startsWith("\\\\?\\") ? t : t.replace(/\\/g, "/");
}
var oh = fe(() => {
  n(Ct, "slash");
});

// ../node_modules/globby/utilities.js
var Zt, Hn = fe(() => {
  Zt = /* @__PURE__ */ n((t) => t[0] === "!", "isNegativePattern");
});

// ../node_modules/globby/ignore.js
var ah, lh, ch, mt, Bn, uh, Fb, hh, ti, jb, Hb, Bb, ph, dh, Un, Wn, fh, mh, Gn = fe(() => {
  ah = j(require("node:process"), 1), lh = j(require("node:fs"), 1), ch = j(require("node:fs/promises"), 1), mt = j(require("node:path"), 1),
  Bn = j(Dn(), 1), uh = j(nh(), 1);
  oh();
  Ln();
  Hn();
  Fb = [
    "**/node_modules",
    "**/flow-typed",
    "**/coverage",
    "**/.git"
  ], hh = {
    absolute: !0,
    dot: !0
  }, ti = "**/.gitignore", jb = /* @__PURE__ */ n((t, e) => Zt(t) ? "!" + mt.default.posix.join(e, t.slice(1)) : mt.default.posix.join(e, t),
  "applyBaseToPattern"), Hb = /* @__PURE__ */ n((t, e) => {
    let r = Ct(mt.default.relative(e, mt.default.dirname(t.filePath)));
    return t.content.split(/\r?\n/).filter((i) => i && !i.startsWith("#")).map((i) => jb(i, r));
  }, "parseIgnoreFile"), Bb = /* @__PURE__ */ n((t, e) => {
    if (e = Ct(e), mt.default.isAbsolute(t)) {
      if (Ct(t).startsWith(e))
        return mt.default.relative(e, t);
      throw new Error(`Path ${t} is not in cwd ${e}`);
    }
    return t;
  }, "toRelativePath"), ph = /* @__PURE__ */ n((t, e) => {
    let r = t.flatMap((s) => Hb(s, e)), i = (0, uh.default)().add(r);
    return (s) => (s = Xt(s), s = Bb(s, e), s ? i.ignores(Ct(s)) : !1);
  }, "getIsIgnoredPredicate"), dh = /* @__PURE__ */ n((t = {}) => ({
    cwd: Xt(t.cwd) ?? ah.default.cwd(),
    suppressErrors: !!t.suppressErrors,
    deep: typeof t.deep == "number" ? t.deep : Number.POSITIVE_INFINITY,
    ignore: [...t.ignore ?? [], ...Fb]
  }), "normalizeOptions"), Un = /* @__PURE__ */ n(async (t, e) => {
    let { cwd: r, suppressErrors: i, deep: s, ignore: o } = dh(e), a = await (0, Bn.default)(t, {
      cwd: r,
      suppressErrors: i,
      deep: s,
      ignore: o,
      ...hh
    }), l = await Promise.all(
      a.map(async (c) => ({
        filePath: c,
        content: await ch.default.readFile(c, "utf8")
      }))
    );
    return ph(l, r);
  }, "isIgnoredByIgnoreFiles"), Wn = /* @__PURE__ */ n((t, e) => {
    let { cwd: r, suppressErrors: i, deep: s, ignore: o } = dh(e), l = Bn.default.sync(t, {
      cwd: r,
      suppressErrors: i,
      deep: s,
      ignore: o,
      ...hh
    }).map((c) => ({
      filePath: c,
      content: lh.default.readFileSync(c, "utf8")
    }));
    return ph(l, r);
  }, "isIgnoredByIgnoreFilesSync"), fh = /* @__PURE__ */ n((t) => Un(ti, t), "isGitIgnored"), mh = /* @__PURE__ */ n((t) => Wn(ti, t), "isGi\
tIgnoredSync");
});

// ../node_modules/globby/index.js
var Ch = {};
_t(Ch, {
  convertPathToPattern: () => Zb,
  generateGlobTasks: () => Qb,
  generateGlobTasksSync: () => Xb,
  globby: () => Vb,
  globbyStream: () => zb,
  globbySync: () => Yb,
  isDynamicPattern: () => Kb,
  isGitIgnored: () => fh,
  isGitIgnoredSync: () => mh
});
var Vn, xh, gt, Dt, Ub, _h, bh, gh, yh, Yn, Wb, Eh, Sh, ri, vh, Gb, wh, Rh, Th, Ah, Ph, Oh, zn, Vb, Yb, zb, Kb, Qb, Xb, Zb, Dh = fe(() => {
  Vn = j(require("node:process"), 1), xh = j(require("node:fs"), 1), gt = j(require("node:path"), 1);
  sl();
  Dt = j(Dn(), 1);
  zu();
  Ln();
  Gn();
  Hn();
  Gn();
  Ub = /* @__PURE__ */ n((t) => {
    if (t.some((e) => typeof e != "string"))
      throw new TypeError("Patterns must be a string or an array of strings");
  }, "assertPatternsInput"), _h = /* @__PURE__ */ n((t, e) => {
    let r = Zt(t) ? t.slice(1) : t;
    return gt.default.isAbsolute(r) ? r : gt.default.join(e, r);
  }, "normalizePathForDirectoryGlob"), bh = /* @__PURE__ */ n(({ directoryPath: t, files: e, extensions: r }) => {
    let i = r?.length > 0 ? `.${r.length > 1 ? `{${r.join(",")}}` : r[0]}` : "";
    return e ? e.map((s) => gt.default.posix.join(t, `**/${gt.default.extname(s) ? s : `${s}${i}`}`)) : [gt.default.posix.join(t, `**${i ? `\
/*${i}` : ""}`)];
  }, "getDirectoryGlob"), gh = /* @__PURE__ */ n(async (t, {
    cwd: e = Vn.default.cwd(),
    files: r,
    extensions: i
  } = {}) => (await Promise.all(
    t.map(async (o) => await Vu(_h(o, e)) ? bh({ directoryPath: o, files: r, extensions: i }) : o)
  )).flat(), "directoryToGlob"), yh = /* @__PURE__ */ n((t, {
    cwd: e = Vn.default.cwd(),
    files: r,
    extensions: i
  } = {}) => t.flatMap((s) => Yu(_h(s, e)) ? bh({ directoryPath: s, files: r, extensions: i }) : s), "directoryToGlobSync"), Yn = /* @__PURE__ */ n(
  (t) => (t = [...new Set([t].flat())], Ub(t), t), "toPatternsArray"), Wb = /* @__PURE__ */ n((t) => {
    if (!t)
      return;
    let e;
    try {
      e = xh.default.statSync(t);
    } catch {
      return;
    }
    if (!e.isDirectory())
      throw new Error("The `cwd` option must be a path to a directory");
  }, "checkCwdOption"), Eh = /* @__PURE__ */ n((t = {}) => (t = {
    ...t,
    ignore: t.ignore ?? [],
    expandDirectories: t.expandDirectories ?? !0,
    cwd: Xt(t.cwd)
  }, Wb(t.cwd), t), "normalizeOptions"), Sh = /* @__PURE__ */ n((t) => async (e, r) => t(Yn(e), Eh(r)), "normalizeArguments"), ri = /* @__PURE__ */ n(
  (t) => (e, r) => t(Yn(e), Eh(r)), "normalizeArgumentsSync"), vh = /* @__PURE__ */ n((t) => {
    let { ignoreFiles: e, gitignore: r } = t, i = e ? Yn(e) : [];
    return r && i.push(ti), i;
  }, "getIgnoreFilesPatterns"), Gb = /* @__PURE__ */ n(async (t) => {
    let e = vh(t);
    return Rh(
      e.length > 0 && await Un(e, t)
    );
  }, "getFilter"), wh = /* @__PURE__ */ n((t) => {
    let e = vh(t);
    return Rh(
      e.length > 0 && Wn(e, t)
    );
  }, "getFilterSync"), Rh = /* @__PURE__ */ n((t) => {
    let e = /* @__PURE__ */ new Set();
    return (r) => {
      let i = gt.default.normalize(r.path ?? r);
      return e.has(i) || t && t(i) ? !1 : (e.add(i), !0);
    };
  }, "createFilterFunction"), Th = /* @__PURE__ */ n((t, e) => t.flat().filter((r) => e(r)), "unionFastGlobResults"), Ah = /* @__PURE__ */ n(
  (t, e) => {
    let r = [];
    for (; t.length > 0; ) {
      let i = t.findIndex((o) => Zt(o));
      if (i === -1) {
        r.push({ patterns: t, options: e });
        break;
      }
      let s = t[i].slice(1);
      for (let o of r)
        o.options.ignore.push(s);
      i !== 0 && r.push({
        patterns: t.slice(0, i),
        options: {
          ...e,
          ignore: [
            ...e.ignore,
            s
          ]
        }
      }), t = t.slice(i + 1);
    }
    return r;
  }, "convertNegativePatterns"), Ph = /* @__PURE__ */ n((t, e) => ({
    ...e ? { cwd: e } : {},
    ...Array.isArray(t) ? { files: t } : t
  }), "normalizeExpandDirectoriesOption"), Oh = /* @__PURE__ */ n(async (t, e) => {
    let r = Ah(t, e), { cwd: i, expandDirectories: s } = e;
    if (!s)
      return r;
    let o = Ph(s, i);
    return Promise.all(
      r.map(async (a) => {
        let { patterns: l, options: c } = a;
        return [
          l,
          c.ignore
        ] = await Promise.all([
          gh(l, o),
          gh(c.ignore, { cwd: i })
        ]), { patterns: l, options: c };
      })
    );
  }, "generateTasks"), zn = /* @__PURE__ */ n((t, e) => {
    let r = Ah(t, e), { cwd: i, expandDirectories: s } = e;
    if (!s)
      return r;
    let o = Ph(s, i);
    return r.map((a) => {
      let { patterns: l, options: c } = a;
      return l = yh(l, o), c.ignore = yh(c.ignore, { cwd: i }), { patterns: l, options: c };
    });
  }, "generateTasksSync"), Vb = Sh(async (t, e) => {
    let [
      r,
      i
    ] = await Promise.all([
      Oh(t, e),
      Gb(e)
    ]), s = await Promise.all(r.map((o) => (0, Dt.default)(o.patterns, o.options)));
    return Th(s, i);
  }), Yb = ri((t, e) => {
    let r = zn(t, e), i = wh(e), s = r.map((o) => Dt.default.sync(o.patterns, o.options));
    return Th(s, i);
  }), zb = ri((t, e) => {
    let r = zn(t, e), i = wh(e), s = r.map((a) => Dt.default.stream(a.patterns, a.options));
    return Vi(s).filter((a) => i(a));
  }), Kb = ri(
    (t, e) => t.some((r) => Dt.default.isDynamicPattern(r, e))
  ), Qb = Sh(Oh), Xb = ri(zn), { convertPathToPattern: Zb } = Dt.default;
});

// ../node_modules/picocolors/picocolors.js
var Wh = f((DC, Kn) => {
  var Bh = process.argv || [], li = process.env, iE = !("NO_COLOR" in li || Bh.includes("--no-color")) && ("FORCE_COLOR" in li || Bh.includes(
  "--color") || process.platform === "win32" || require != null && require("tty").isatty(1) && li.TERM !== "dumb" || "CI" in li), sE = /* @__PURE__ */ n(
  (t, e, r = t) => (i) => {
    let s = "" + i, o = s.indexOf(e, t.length);
    return ~o ? t + nE(s, e, r, o) + e : t + s + e;
  }, "formatter"), nE = /* @__PURE__ */ n((t, e, r, i) => {
    let s = "", o = 0;
    do
      s += t.substring(o, i) + r, o = i + e.length, i = t.indexOf(e, o);
    while (~i);
    return s + t.substring(o);
  }, "replaceClose"), Uh = /* @__PURE__ */ n((t = iE) => {
    let e = t ? sE : () => String;
    return {
      isColorSupported: t,
      reset: e("\x1B[0m", "\x1B[0m"),
      bold: e("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: e("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: e("\x1B[3m", "\x1B[23m"),
      underline: e("\x1B[4m", "\x1B[24m"),
      inverse: e("\x1B[7m", "\x1B[27m"),
      hidden: e("\x1B[8m", "\x1B[28m"),
      strikethrough: e("\x1B[9m", "\x1B[29m"),
      black: e("\x1B[30m", "\x1B[39m"),
      red: e("\x1B[31m", "\x1B[39m"),
      green: e("\x1B[32m", "\x1B[39m"),
      yellow: e("\x1B[33m", "\x1B[39m"),
      blue: e("\x1B[34m", "\x1B[39m"),
      magenta: e("\x1B[35m", "\x1B[39m"),
      cyan: e("\x1B[36m", "\x1B[39m"),
      white: e("\x1B[37m", "\x1B[39m"),
      gray: e("\x1B[90m", "\x1B[39m"),
      bgBlack: e("\x1B[40m", "\x1B[49m"),
      bgRed: e("\x1B[41m", "\x1B[49m"),
      bgGreen: e("\x1B[42m", "\x1B[49m"),
      bgYellow: e("\x1B[43m", "\x1B[49m"),
      bgBlue: e("\x1B[44m", "\x1B[49m"),
      bgMagenta: e("\x1B[45m", "\x1B[49m"),
      bgCyan: e("\x1B[46m", "\x1B[49m"),
      bgWhite: e("\x1B[47m", "\x1B[49m"),
      blackBright: e("\x1B[90m", "\x1B[39m"),
      redBright: e("\x1B[91m", "\x1B[39m"),
      greenBright: e("\x1B[92m", "\x1B[39m"),
      yellowBright: e("\x1B[93m", "\x1B[39m"),
      blueBright: e("\x1B[94m", "\x1B[39m"),
      magentaBright: e("\x1B[95m", "\x1B[39m"),
      cyanBright: e("\x1B[96m", "\x1B[39m"),
      whiteBright: e("\x1B[97m", "\x1B[39m"),
      bgBlackBright: e("\x1B[100m", "\x1B[49m"),
      bgRedBright: e("\x1B[101m", "\x1B[49m"),
      bgGreenBright: e("\x1B[102m", "\x1B[49m"),
      bgYellowBright: e("\x1B[103m", "\x1B[49m"),
      bgBlueBright: e("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: e("\x1B[105m", "\x1B[49m"),
      bgCyanBright: e("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: e("\x1B[107m", "\x1B[49m")
    };
  }, "createColors");
  Kn.exports = Uh();
  Kn.exports.createColors = Uh;
});

// ../node_modules/totalist/sync/index.mjs
var Vh = {};
_t(Vh, {
  totalist: () => Gh
});
function Gh(t, e, r = "") {
  t = (0, Lt.resolve)(".", t);
  let i = (0, ci.readdirSync)(t), s = 0, o, a;
  for (; s < i.length; s++)
    o = (0, Lt.join)(t, i[s]), a = (0, ci.statSync)(o), a.isDirectory() ? Gh(o, e, (0, Lt.join)(r, i[s])) : e((0, Lt.join)(r, i[s]), o, a);
}
var Lt, ci, Yh = fe(() => {
  Lt = require("path"), ci = require("fs");
  n(Gh, "totalist");
});

// ../node_modules/@polka/url/build.mjs
var Kh = {};
_t(Kh, {
  parse: () => oE
});
function oE(t) {
  let e = t.url;
  if (e == null) return;
  let r = t._parsedUrl;
  if (r && r.raw === e) return r;
  let i = e, s = "", o;
  if (e.length > 1) {
    let a = e.indexOf("?", 1);
    a !== -1 && (s = e.substring(a), i = e.substring(0, a), s.length > 1 && (o = zh.parse(s.substring(1))));
  }
  return t._parsedUrl = { pathname: i, search: s, query: o, raw: e };
}
var zh, Qh = fe(() => {
  zh = j(require("node:querystring"), 1);
  n(oE, "parse");
});

// ../node_modules/mrmime/index.mjs
var Zh = {};
_t(Zh, {
  lookup: () => aE,
  mimes: () => Xh
});
function aE(t) {
  let e = ("" + t).trim().toLowerCase(), r = e.lastIndexOf(".");
  return Xh[~r ? e.substring(++r) : e];
}
var Xh, Jh = fe(() => {
  Xh = {
    "3g2": "video/3gpp2",
    "3gp": "video/3gpp",
    "3gpp": "video/3gpp",
    "3mf": "model/3mf",
    aac: "audio/aac",
    ac: "application/pkix-attr-cert",
    adp: "audio/adpcm",
    adts: "audio/aac",
    ai: "application/postscript",
    aml: "application/automationml-aml+xml",
    amlx: "application/automationml-amlx+zip",
    amr: "audio/amr",
    apng: "image/apng",
    appcache: "text/cache-manifest",
    appinstaller: "application/appinstaller",
    appx: "application/appx",
    appxbundle: "application/appxbundle",
    asc: "application/pgp-keys",
    atom: "application/atom+xml",
    atomcat: "application/atomcat+xml",
    atomdeleted: "application/atomdeleted+xml",
    atomsvc: "application/atomsvc+xml",
    au: "audio/basic",
    avci: "image/avci",
    avcs: "image/avcs",
    avif: "image/avif",
    aw: "application/applixware",
    bdoc: "application/bdoc",
    bin: "application/octet-stream",
    bmp: "image/bmp",
    bpk: "application/octet-stream",
    btf: "image/prs.btif",
    btif: "image/prs.btif",
    buffer: "application/octet-stream",
    ccxml: "application/ccxml+xml",
    cdfx: "application/cdfx+xml",
    cdmia: "application/cdmi-capability",
    cdmic: "application/cdmi-container",
    cdmid: "application/cdmi-domain",
    cdmio: "application/cdmi-object",
    cdmiq: "application/cdmi-queue",
    cer: "application/pkix-cert",
    cgm: "image/cgm",
    cjs: "application/node",
    class: "application/java-vm",
    coffee: "text/coffeescript",
    conf: "text/plain",
    cpl: "application/cpl+xml",
    cpt: "application/mac-compactpro",
    crl: "application/pkix-crl",
    css: "text/css",
    csv: "text/csv",
    cu: "application/cu-seeme",
    cwl: "application/cwl",
    cww: "application/prs.cww",
    davmount: "application/davmount+xml",
    dbk: "application/docbook+xml",
    deb: "application/octet-stream",
    def: "text/plain",
    deploy: "application/octet-stream",
    dib: "image/bmp",
    "disposition-notification": "message/disposition-notification",
    dist: "application/octet-stream",
    distz: "application/octet-stream",
    dll: "application/octet-stream",
    dmg: "application/octet-stream",
    dms: "application/octet-stream",
    doc: "application/msword",
    dot: "application/msword",
    dpx: "image/dpx",
    drle: "image/dicom-rle",
    dsc: "text/prs.lines.tag",
    dssc: "application/dssc+der",
    dtd: "application/xml-dtd",
    dump: "application/octet-stream",
    dwd: "application/atsc-dwd+xml",
    ear: "application/java-archive",
    ecma: "application/ecmascript",
    elc: "application/octet-stream",
    emf: "image/emf",
    eml: "message/rfc822",
    emma: "application/emma+xml",
    emotionml: "application/emotionml+xml",
    eps: "application/postscript",
    epub: "application/epub+zip",
    exe: "application/octet-stream",
    exi: "application/exi",
    exp: "application/express",
    exr: "image/aces",
    ez: "application/andrew-inset",
    fdf: "application/fdf",
    fdt: "application/fdt+xml",
    fits: "image/fits",
    g3: "image/g3fax",
    gbr: "application/rpki-ghostbusters",
    geojson: "application/geo+json",
    gif: "image/gif",
    glb: "model/gltf-binary",
    gltf: "model/gltf+json",
    gml: "application/gml+xml",
    gpx: "application/gpx+xml",
    gram: "application/srgs",
    grxml: "application/srgs+xml",
    gxf: "application/gxf",
    gz: "application/gzip",
    h261: "video/h261",
    h263: "video/h263",
    h264: "video/h264",
    heic: "image/heic",
    heics: "image/heic-sequence",
    heif: "image/heif",
    heifs: "image/heif-sequence",
    hej2: "image/hej2k",
    held: "application/atsc-held+xml",
    hjson: "application/hjson",
    hlp: "application/winhlp",
    hqx: "application/mac-binhex40",
    hsj2: "image/hsj2",
    htm: "text/html",
    html: "text/html",
    ics: "text/calendar",
    ief: "image/ief",
    ifb: "text/calendar",
    iges: "model/iges",
    igs: "model/iges",
    img: "application/octet-stream",
    in: "text/plain",
    ini: "text/plain",
    ink: "application/inkml+xml",
    inkml: "application/inkml+xml",
    ipfix: "application/ipfix",
    iso: "application/octet-stream",
    its: "application/its+xml",
    jade: "text/jade",
    jar: "application/java-archive",
    jhc: "image/jphc",
    jls: "image/jls",
    jp2: "image/jp2",
    jpe: "image/jpeg",
    jpeg: "image/jpeg",
    jpf: "image/jpx",
    jpg: "image/jpeg",
    jpg2: "image/jp2",
    jpgm: "image/jpm",
    jpgv: "video/jpeg",
    jph: "image/jph",
    jpm: "image/jpm",
    jpx: "image/jpx",
    js: "text/javascript",
    json: "application/json",
    json5: "application/json5",
    jsonld: "application/ld+json",
    jsonml: "application/jsonml+json",
    jsx: "text/jsx",
    jt: "model/jt",
    jxl: "image/jxl",
    jxr: "image/jxr",
    jxra: "image/jxra",
    jxrs: "image/jxrs",
    jxs: "image/jxs",
    jxsc: "image/jxsc",
    jxsi: "image/jxsi",
    jxss: "image/jxss",
    kar: "audio/midi",
    ktx: "image/ktx",
    ktx2: "image/ktx2",
    less: "text/less",
    lgr: "application/lgr+xml",
    list: "text/plain",
    litcoffee: "text/coffeescript",
    log: "text/plain",
    lostxml: "application/lost+xml",
    lrf: "application/octet-stream",
    m1v: "video/mpeg",
    m21: "application/mp21",
    m2a: "audio/mpeg",
    m2t: "video/mp2t",
    m2ts: "video/mp2t",
    m2v: "video/mpeg",
    m3a: "audio/mpeg",
    m4a: "audio/mp4",
    m4p: "application/mp4",
    m4s: "video/iso.segment",
    ma: "application/mathematica",
    mads: "application/mads+xml",
    maei: "application/mmt-aei+xml",
    man: "text/troff",
    manifest: "text/cache-manifest",
    map: "application/json",
    mar: "application/octet-stream",
    markdown: "text/markdown",
    mathml: "application/mathml+xml",
    mb: "application/mathematica",
    mbox: "application/mbox",
    md: "text/markdown",
    mdx: "text/mdx",
    me: "text/troff",
    mesh: "model/mesh",
    meta4: "application/metalink4+xml",
    metalink: "application/metalink+xml",
    mets: "application/mets+xml",
    mft: "application/rpki-manifest",
    mid: "audio/midi",
    midi: "audio/midi",
    mime: "message/rfc822",
    mj2: "video/mj2",
    mjp2: "video/mj2",
    mjs: "text/javascript",
    mml: "text/mathml",
    mods: "application/mods+xml",
    mov: "video/quicktime",
    mp2: "audio/mpeg",
    mp21: "application/mp21",
    mp2a: "audio/mpeg",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    mp4a: "audio/mp4",
    mp4s: "application/mp4",
    mp4v: "video/mp4",
    mpd: "application/dash+xml",
    mpe: "video/mpeg",
    mpeg: "video/mpeg",
    mpf: "application/media-policy-dataset+xml",
    mpg: "video/mpeg",
    mpg4: "video/mp4",
    mpga: "audio/mpeg",
    mpp: "application/dash-patch+xml",
    mrc: "application/marc",
    mrcx: "application/marcxml+xml",
    ms: "text/troff",
    mscml: "application/mediaservercontrol+xml",
    msh: "model/mesh",
    msi: "application/octet-stream",
    msix: "application/msix",
    msixbundle: "application/msixbundle",
    msm: "application/octet-stream",
    msp: "application/octet-stream",
    mtl: "model/mtl",
    mts: "video/mp2t",
    musd: "application/mmt-usd+xml",
    mxf: "application/mxf",
    mxmf: "audio/mobile-xmf",
    mxml: "application/xv+xml",
    n3: "text/n3",
    nb: "application/mathematica",
    nq: "application/n-quads",
    nt: "application/n-triples",
    obj: "model/obj",
    oda: "application/oda",
    oga: "audio/ogg",
    ogg: "audio/ogg",
    ogv: "video/ogg",
    ogx: "application/ogg",
    omdoc: "application/omdoc+xml",
    onepkg: "application/onenote",
    onetmp: "application/onenote",
    onetoc: "application/onenote",
    onetoc2: "application/onenote",
    opf: "application/oebps-package+xml",
    opus: "audio/ogg",
    otf: "font/otf",
    owl: "application/rdf+xml",
    oxps: "application/oxps",
    p10: "application/pkcs10",
    p7c: "application/pkcs7-mime",
    p7m: "application/pkcs7-mime",
    p7s: "application/pkcs7-signature",
    p8: "application/pkcs8",
    pdf: "application/pdf",
    pfr: "application/font-tdpfr",
    pgp: "application/pgp-encrypted",
    pkg: "application/octet-stream",
    pki: "application/pkixcmp",
    pkipath: "application/pkix-pkipath",
    pls: "application/pls+xml",
    png: "image/png",
    prc: "model/prc",
    prf: "application/pics-rules",
    provx: "application/provenance+xml",
    ps: "application/postscript",
    pskcxml: "application/pskc+xml",
    pti: "image/prs.pti",
    qt: "video/quicktime",
    raml: "application/raml+yaml",
    rapd: "application/route-apd+xml",
    rdf: "application/rdf+xml",
    relo: "application/p2p-overlay+xml",
    rif: "application/reginfo+xml",
    rl: "application/resource-lists+xml",
    rld: "application/resource-lists-diff+xml",
    rmi: "audio/midi",
    rnc: "application/relax-ng-compact-syntax",
    rng: "application/xml",
    roa: "application/rpki-roa",
    roff: "text/troff",
    rq: "application/sparql-query",
    rs: "application/rls-services+xml",
    rsat: "application/atsc-rsat+xml",
    rsd: "application/rsd+xml",
    rsheet: "application/urc-ressheet+xml",
    rss: "application/rss+xml",
    rtf: "text/rtf",
    rtx: "text/richtext",
    rusd: "application/route-usd+xml",
    s3m: "audio/s3m",
    sbml: "application/sbml+xml",
    scq: "application/scvp-cv-request",
    scs: "application/scvp-cv-response",
    sdp: "application/sdp",
    senmlx: "application/senml+xml",
    sensmlx: "application/sensml+xml",
    ser: "application/java-serialized-object",
    setpay: "application/set-payment-initiation",
    setreg: "application/set-registration-initiation",
    sgi: "image/sgi",
    sgm: "text/sgml",
    sgml: "text/sgml",
    shex: "text/shex",
    shf: "application/shf+xml",
    shtml: "text/html",
    sieve: "application/sieve",
    sig: "application/pgp-signature",
    sil: "audio/silk",
    silo: "model/mesh",
    siv: "application/sieve",
    slim: "text/slim",
    slm: "text/slim",
    sls: "application/route-s-tsid+xml",
    smi: "application/smil+xml",
    smil: "application/smil+xml",
    snd: "audio/basic",
    so: "application/octet-stream",
    spdx: "text/spdx",
    spp: "application/scvp-vp-response",
    spq: "application/scvp-vp-request",
    spx: "audio/ogg",
    sql: "application/sql",
    sru: "application/sru+xml",
    srx: "application/sparql-results+xml",
    ssdl: "application/ssdl+xml",
    ssml: "application/ssml+xml",
    stk: "application/hyperstudio",
    stl: "model/stl",
    stpx: "model/step+xml",
    stpxz: "model/step-xml+zip",
    stpz: "model/step+zip",
    styl: "text/stylus",
    stylus: "text/stylus",
    svg: "image/svg+xml",
    svgz: "image/svg+xml",
    swidtag: "application/swid+xml",
    t: "text/troff",
    t38: "image/t38",
    td: "application/urc-targetdesc+xml",
    tei: "application/tei+xml",
    teicorpus: "application/tei+xml",
    text: "text/plain",
    tfi: "application/thraud+xml",
    tfx: "image/tiff-fx",
    tif: "image/tiff",
    tiff: "image/tiff",
    toml: "application/toml",
    tr: "text/troff",
    trig: "application/trig",
    ts: "video/mp2t",
    tsd: "application/timestamped-data",
    tsv: "text/tab-separated-values",
    ttc: "font/collection",
    ttf: "font/ttf",
    ttl: "text/turtle",
    ttml: "application/ttml+xml",
    txt: "text/plain",
    u3d: "model/u3d",
    u8dsn: "message/global-delivery-status",
    u8hdr: "message/global-headers",
    u8mdn: "message/global-disposition-notification",
    u8msg: "message/global",
    ubj: "application/ubjson",
    uri: "text/uri-list",
    uris: "text/uri-list",
    urls: "text/uri-list",
    vcard: "text/vcard",
    vrml: "model/vrml",
    vtt: "text/vtt",
    vxml: "application/voicexml+xml",
    war: "application/java-archive",
    wasm: "application/wasm",
    wav: "audio/wav",
    weba: "audio/webm",
    webm: "video/webm",
    webmanifest: "application/manifest+json",
    webp: "image/webp",
    wgsl: "text/wgsl",
    wgt: "application/widget",
    wif: "application/watcherinfo+xml",
    wmf: "image/wmf",
    woff: "font/woff",
    woff2: "font/woff2",
    wrl: "model/vrml",
    wsdl: "application/wsdl+xml",
    wspolicy: "application/wspolicy+xml",
    x3d: "model/x3d+xml",
    x3db: "model/x3d+fastinfoset",
    x3dbz: "model/x3d+binary",
    x3dv: "model/x3d-vrml",
    x3dvz: "model/x3d+vrml",
    x3dz: "model/x3d+xml",
    xaml: "application/xaml+xml",
    xav: "application/xcap-att+xml",
    xca: "application/xcap-caps+xml",
    xcs: "application/calendar+xml",
    xdf: "application/xcap-diff+xml",
    xdssc: "application/dssc+xml",
    xel: "application/xcap-el+xml",
    xenc: "application/xenc+xml",
    xer: "application/patch-ops-error+xml",
    xfdf: "application/xfdf",
    xht: "application/xhtml+xml",
    xhtml: "application/xhtml+xml",
    xhvml: "application/xv+xml",
    xlf: "application/xliff+xml",
    xm: "audio/xm",
    xml: "text/xml",
    xns: "application/xcap-ns+xml",
    xop: "application/xop+xml",
    xpl: "application/xproc+xml",
    xsd: "application/xml",
    xsf: "application/prs.xsf+xml",
    xsl: "application/xml",
    xslt: "application/xml",
    xspf: "application/xspf+xml",
    xvm: "application/xv+xml",
    xvml: "application/xv+xml",
    yaml: "text/yaml",
    yang: "application/yang",
    yin: "application/yin+xml",
    yml: "text/yaml",
    zip: "application/zip"
  };
  n(aE, "lookup");
});

// ../node_modules/sirv/build.js
var ip = f(($C, rp) => {
  var Qn = require("fs"), { join: lE, normalize: cE, resolve: uE } = require("path"), { totalist: hE } = (Yh(), xr(Vh)), { parse: pE } = (Qh(), xr(Kh)),
  { lookup: dE } = (Jh(), xr(Zh)), fE = /* @__PURE__ */ n(() => {
  }, "noop");
  function mE(t, e) {
    for (let r = 0; r < e.length; r++)
      if (e[r].test(t)) return !0;
  }
  n(mE, "isMatch");
  function ep(t, e) {
    let r = 0, i, s = t.length - 1;
    t.charCodeAt(s) === 47 && (t = t.substring(0, s));
    let o = [], a = `${t}/index`;
    for (; r < e.length; r++)
      i = e[r] ? `.${e[r]}` : "", t && o.push(t + i), o.push(a + i);
    return o;
  }
  n(ep, "toAssume");
  function gE(t, e, r) {
    let i = 0, s, o = ep(e, r);
    for (; i < o.length; i++)
      if (s = t[o[i]]) return s;
  }
  n(gE, "viaCache");
  function yE(t, e, r, i) {
    let s = 0, o = ep(r, i), a, l, c, u;
    for (; s < o.length; s++)
      if (a = cE(lE(t, c = o[s])), a.startsWith(t) && Qn.existsSync(a)) {
        if (l = Qn.statSync(a), l.isDirectory()) continue;
        return u = tp(c, l, e), u["Cache-Control"] = e ? "no-cache" : "no-store", { abs: a, stats: l, headers: u };
      }
  }
  n(yE, "viaLocal");
  function xE(t, e) {
    return e.statusCode = 404, e.end();
  }
  n(xE, "is404");
  function _E(t, e, r, i, s) {
    let o = 200, a, l = {};
    s = { ...s };
    for (let c in s)
      a = e.getHeader(c), a && (s[c] = a);
    if ((a = e.getHeader("content-type")) && (s["Content-Type"] = a), t.headers.range) {
      o = 206;
      let [c, u] = t.headers.range.replace("bytes=", "").split("-"), h = l.end = parseInt(u, 10) || i.size - 1, m = l.start = parseInt(c, 10) ||
      0;
      if (h >= i.size && (h = i.size - 1), m >= i.size)
        return e.setHeader("Content-Range", `bytes */${i.size}`), e.statusCode = 416, e.end();
      s["Content-Range"] = `bytes ${m}-${h}/${i.size}`, s["Content-Length"] = h - m + 1, s["Accept-Ranges"] = "bytes";
    }
    e.writeHead(o, s), Qn.createReadStream(r, l).pipe(e);
  }
  n(_E, "send");
  var bE = {
    ".br": "br",
    ".gz": "gzip"
  };
  function tp(t, e, r) {
    let i = bE[t.slice(-3)], s = dE(t.slice(0, i && -3)) || "";
    s === "text/html" && (s += ";charset=utf-8");
    let o = {
      "Content-Length": e.size,
      "Content-Type": s,
      "Last-Modified": e.mtime.toUTCString()
    };
    return i && (o["Content-Encoding"] = i), r && (o.ETag = `W/"${e.size}-${e.mtime.getTime()}"`), o;
  }
  n(tp, "toHeaders");
  rp.exports = function(t, e = {}) {
    t = uE(t || ".");
    let r = e.onNoMatch || xE, i = e.setHeaders || fE, s = e.extensions || ["html", "htm"], o = e.gzip && s.map((g) => `${g}.gz`).concat("gz"),
    a = e.brotli && s.map((g) => `${g}.br`).concat("br"), l = {}, c = "/", u = !!e.etag, h = !!e.single;
    if (typeof e.single == "string") {
      let g = e.single.lastIndexOf(".");
      c += ~g ? e.single.substring(0, g) : e.single;
    }
    let m = [];
    e.ignores !== !1 && (m.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/), e.dotfiles ? m.push(/\/\.\w/) : m.push(/\/\.well-known/), [].concat(e.
    ignores || []).forEach((g) => {
      m.push(new RegExp(g, "i"));
    }));
    let p = e.maxAge != null && `public,max-age=${e.maxAge}`;
    p && e.immutable ? p += ",immutable" : p && e.maxAge === 0 && (p += ",must-revalidate"), e.dev || hE(t, (g, b, R) => {
      if (!/\.well-known[\\+\/]/.test(g)) {
        if (!e.dotfiles && /(^\.|[\\+|\/+]\.)/.test(g)) return;
      }
      let T = tp(g, R, u);
      p && (T["Cache-Control"] = p), l["/" + g.normalize().replace(/\\+/g, "/")] = { abs: b, stats: R, headers: T };
    });
    let v = e.dev ? yE.bind(0, t, u) : gE.bind(0, l);
    return function(g, b, R) {
      let T = [""], k = pE(g).pathname, D = g.headers["accept-encoding"] || "";
      if (o && D.includes("gzip") && T.unshift(...o), a && /(br|brotli)/i.test(D) && T.unshift(...a), T.push(...s), k.indexOf("%") !== -1)
        try {
          k = decodeURI(k);
        } catch {
        }
      let H = v(k, T) || h && !mE(k, m) && v(c, T);
      if (!H) return R ? R() : r(g, b);
      if (u && g.headers["if-none-match"] === H.headers.ETag)
        return b.writeHead(304), b.end();
      (o || a) && b.setHeader("Vary", "Accept-Encoding"), i(b, k, H.stats), _E(g, b, H.abs, H.stats, H.headers);
    };
  };
});

// ../node_modules/prompts/node_modules/kleur/index.js
var z = f((BC, lp) => {
  "use strict";
  var { FORCE_COLOR: RE, NODE_DISABLE_COLORS: TE, TERM: AE } = process.env, F = {
    enabled: !TE && AE !== "dumb" && RE !== "0",
    // modifiers
    reset: B(0, 0),
    bold: B(1, 22),
    dim: B(2, 22),
    italic: B(3, 23),
    underline: B(4, 24),
    inverse: B(7, 27),
    hidden: B(8, 28),
    strikethrough: B(9, 29),
    // colors
    black: B(30, 39),
    red: B(31, 39),
    green: B(32, 39),
    yellow: B(33, 39),
    blue: B(34, 39),
    magenta: B(35, 39),
    cyan: B(36, 39),
    white: B(37, 39),
    gray: B(90, 39),
    grey: B(90, 39),
    // background colors
    bgBlack: B(40, 49),
    bgRed: B(41, 49),
    bgGreen: B(42, 49),
    bgYellow: B(43, 49),
    bgBlue: B(44, 49),
    bgMagenta: B(45, 49),
    bgCyan: B(46, 49),
    bgWhite: B(47, 49)
  };
  function ap(t, e) {
    let r = 0, i, s = "", o = "";
    for (; r < t.length; r++)
      i = t[r], s += i.open, o += i.close, e.includes(i.close) && (e = e.replace(i.rgx, i.close + i.open));
    return s + e + o;
  }
  n(ap, "run");
  function PE(t, e) {
    let r = { has: t, keys: e };
    return r.reset = F.reset.bind(r), r.bold = F.bold.bind(r), r.dim = F.dim.bind(r), r.italic = F.italic.bind(r), r.underline = F.underline.
    bind(r), r.inverse = F.inverse.bind(r), r.hidden = F.hidden.bind(r), r.strikethrough = F.strikethrough.bind(r), r.black = F.black.bind(r),
    r.red = F.red.bind(r), r.green = F.green.bind(r), r.yellow = F.yellow.bind(r), r.blue = F.blue.bind(r), r.magenta = F.magenta.bind(r), r.
    cyan = F.cyan.bind(r), r.white = F.white.bind(r), r.gray = F.gray.bind(r), r.grey = F.grey.bind(r), r.bgBlack = F.bgBlack.bind(r), r.bgRed =
    F.bgRed.bind(r), r.bgGreen = F.bgGreen.bind(r), r.bgYellow = F.bgYellow.bind(r), r.bgBlue = F.bgBlue.bind(r), r.bgMagenta = F.bgMagenta.
    bind(r), r.bgCyan = F.bgCyan.bind(r), r.bgWhite = F.bgWhite.bind(r), r;
  }
  n(PE, "chain");
  function B(t, e) {
    let r = {
      open: `\x1B[${t}m`,
      close: `\x1B[${e}m`,
      rgx: new RegExp(`\\x1b\\[${e}m`, "g")
    };
    return function(i) {
      return this !== void 0 && this.has !== void 0 ? (this.has.includes(t) || (this.has.push(t), this.keys.push(r)), i === void 0 ? this : F.
      enabled ? ap(this.keys, i + "") : i + "") : i === void 0 ? PE([t], [r]) : F.enabled ? ap([r], i + "") : i + "";
    };
  }
  n(B, "init");
  lp.exports = F;
});

// ../node_modules/prompts/dist/util/action.js
var up = f((WC, cp) => {
  "use strict";
  cp.exports = (t, e) => {
    if (!(t.meta && t.name !== "escape")) {
      if (t.ctrl) {
        if (t.name === "a") return "first";
        if (t.name === "c" || t.name === "d") return "abort";
        if (t.name === "e") return "last";
        if (t.name === "g") return "reset";
      }
      if (e) {
        if (t.name === "j") return "down";
        if (t.name === "k") return "up";
      }
      return t.name === "return" || t.name === "enter" ? "submit" : t.name === "backspace" ? "delete" : t.name === "delete" ? "deleteForward" :
      t.name === "abort" ? "abort" : t.name === "escape" ? "exit" : t.name === "tab" ? "next" : t.name === "pagedown" ? "nextPage" : t.name ===
      "pageup" ? "prevPage" : t.name === "home" ? "home" : t.name === "end" ? "end" : t.name === "up" ? "up" : t.name === "down" ? "down" : t.
      name === "right" ? "right" : t.name === "left" ? "left" : !1;
    }
  };
});

// ../node_modules/prompts/dist/util/strip.js
var ui = f((GC, hp) => {
  "use strict";
  hp.exports = (t) => {
    let e = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"].join("|"), r = new RegExp(e, "g");
    return typeof t == "string" ? t.replace(r, "") : t;
  };
});

// ../node_modules/sisteransi/src/index.js
var Q = f((VC, pp) => {
  "use strict";
  var eo = "\x1B", K = `${eo}[`, OE = "\x07", to = {
    to(t, e) {
      return e ? `${K}${e + 1};${t + 1}H` : `${K}${t + 1}G`;
    },
    move(t, e) {
      let r = "";
      return t < 0 ? r += `${K}${-t}D` : t > 0 && (r += `${K}${t}C`), e < 0 ? r += `${K}${-e}A` : e > 0 && (r += `${K}${e}B`), r;
    },
    up: /* @__PURE__ */ n((t = 1) => `${K}${t}A`, "up"),
    down: /* @__PURE__ */ n((t = 1) => `${K}${t}B`, "down"),
    forward: /* @__PURE__ */ n((t = 1) => `${K}${t}C`, "forward"),
    backward: /* @__PURE__ */ n((t = 1) => `${K}${t}D`, "backward"),
    nextLine: /* @__PURE__ */ n((t = 1) => `${K}E`.repeat(t), "nextLine"),
    prevLine: /* @__PURE__ */ n((t = 1) => `${K}F`.repeat(t), "prevLine"),
    left: `${K}G`,
    hide: `${K}?25l`,
    show: `${K}?25h`,
    save: `${eo}7`,
    restore: `${eo}8`
  }, CE = {
    up: /* @__PURE__ */ n((t = 1) => `${K}S`.repeat(t), "up"),
    down: /* @__PURE__ */ n((t = 1) => `${K}T`.repeat(t), "down")
  }, DE = {
    screen: `${K}2J`,
    up: /* @__PURE__ */ n((t = 1) => `${K}1J`.repeat(t), "up"),
    down: /* @__PURE__ */ n((t = 1) => `${K}J`.repeat(t), "down"),
    line: `${K}2K`,
    lineEnd: `${K}K`,
    lineStart: `${K}1K`,
    lines(t) {
      let e = "";
      for (let r = 0; r < t; r++)
        e += this.line + (r < t - 1 ? to.up() : "");
      return t && (e += to.left), e;
    }
  };
  pp.exports = { cursor: to, scroll: CE, erase: DE, beep: OE };
});

// ../node_modules/prompts/dist/util/clear.js
var yp = f((zC, gp) => {
  "use strict";
  function IE(t, e) {
    var r = typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
    if (!r) {
      if (Array.isArray(t) || (r = NE(t)) || e && t && typeof t.length == "number") {
        r && (t = r);
        var i = 0, s = /* @__PURE__ */ n(function() {
        }, "F");
        return { s, n: /* @__PURE__ */ n(function() {
          return i >= t.length ? { done: !0 } : { done: !1, value: t[i++] };
        }, "n"), e: /* @__PURE__ */ n(function(u) {
          throw u;
        }, "e"), f: s };
      }
      throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    var o = !0, a = !1, l;
    return { s: /* @__PURE__ */ n(function() {
      r = r.call(t);
    }, "s"), n: /* @__PURE__ */ n(function() {
      var u = r.next();
      return o = u.done, u;
    }, "n"), e: /* @__PURE__ */ n(function(u) {
      a = !0, l = u;
    }, "e"), f: /* @__PURE__ */ n(function() {
      try {
        !o && r.return != null && r.return();
      } finally {
        if (a) throw l;
      }
    }, "f") };
  }
  n(IE, "_createForOfIteratorHelper");
  function NE(t, e) {
    if (t) {
      if (typeof t == "string") return dp(t, e);
      var r = Object.prototype.toString.call(t).slice(8, -1);
      if (r === "Object" && t.constructor && (r = t.constructor.name), r === "Map" || r === "Set") return Array.from(t);
      if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return dp(t, e);
    }
  }
  n(NE, "_unsupportedIterableToArray");
  function dp(t, e) {
    (e == null || e > t.length) && (e = t.length);
    for (var r = 0, i = new Array(e); r < e; r++) i[r] = t[r];
    return i;
  }
  n(dp, "_arrayLikeToArray");
  var LE = ui(), mp = Q(), fp = mp.erase, kE = mp.cursor, $E = /* @__PURE__ */ n((t) => [...LE(t)].length, "width");
  gp.exports = function(t, e) {
    if (!e) return fp.line + kE.to(0);
    let r = 0, i = t.split(/\r?\n/);
    var s = IE(i), o;
    try {
      for (s.s(); !(o = s.n()).done; ) {
        let a = o.value;
        r += 1 + Math.floor(Math.max($E(a) - 1, 0) / e);
      }
    } catch (a) {
      s.e(a);
    } finally {
      s.f();
    }
    return fp.lines(r);
  };
});

// ../node_modules/prompts/dist/util/figures.js
var ro = f((QC, xp) => {
  "use strict";
  var rr = {
    arrowUp: "\u2191",
    arrowDown: "\u2193",
    arrowLeft: "\u2190",
    arrowRight: "\u2192",
    radioOn: "\u25C9",
    radioOff: "\u25EF",
    tick: "\u2714",
    cross: "\u2716",
    ellipsis: "\u2026",
    pointerSmall: "\u203A",
    line: "\u2500",
    pointer: "\u276F"
  }, ME = {
    arrowUp: rr.arrowUp,
    arrowDown: rr.arrowDown,
    arrowLeft: rr.arrowLeft,
    arrowRight: rr.arrowRight,
    radioOn: "(*)",
    radioOff: "( )",
    tick: "\u221A",
    cross: "\xD7",
    ellipsis: "...",
    pointerSmall: "\xBB",
    line: "\u2500",
    pointer: ">"
  }, qE = process.platform === "win32" ? ME : rr;
  xp.exports = qE;
});

// ../node_modules/prompts/dist/util/style.js
var bp = f((XC, _p) => {
  "use strict";
  var kt = z(), yt = ro(), io = Object.freeze({
    password: {
      scale: 1,
      render: /* @__PURE__ */ n((t) => "*".repeat(t.length), "render")
    },
    emoji: {
      scale: 2,
      render: /* @__PURE__ */ n((t) => "\u{1F603}".repeat(t.length), "render")
    },
    invisible: {
      scale: 0,
      render: /* @__PURE__ */ n((t) => "", "render")
    },
    default: {
      scale: 1,
      render: /* @__PURE__ */ n((t) => `${t}`, "render")
    }
  }), FE = /* @__PURE__ */ n((t) => io[t] || io.default, "render"), ir = Object.freeze({
    aborted: kt.red(yt.cross),
    done: kt.green(yt.tick),
    exited: kt.yellow(yt.cross),
    default: kt.cyan("?")
  }), jE = /* @__PURE__ */ n((t, e, r) => e ? ir.aborted : r ? ir.exited : t ? ir.done : ir.default, "symbol"), HE = /* @__PURE__ */ n((t) => kt.
  gray(t ? yt.ellipsis : yt.pointerSmall), "delimiter"), BE = /* @__PURE__ */ n((t, e) => kt.gray(t ? e ? yt.pointerSmall : "+" : yt.line), "\
item");
  _p.exports = {
    styles: io,
    render: FE,
    symbols: ir,
    symbol: jE,
    delimiter: HE,
    item: BE
  };
});

// ../node_modules/prompts/dist/util/lines.js
var Sp = f((JC, Ep) => {
  "use strict";
  var UE = ui();
  Ep.exports = function(t, e) {
    let r = String(UE(t) || "").split(/\r?\n/);
    return e ? r.map((i) => Math.ceil(i.length / e)).reduce((i, s) => i + s) : r.length;
  };
});

// ../node_modules/prompts/dist/util/wrap.js
var wp = f((eD, vp) => {
  "use strict";
  vp.exports = (t, e = {}) => {
    let r = Number.isSafeInteger(parseInt(e.margin)) ? new Array(parseInt(e.margin)).fill(" ").join("") : e.margin || "", i = e.width;
    return (t || "").split(/\r?\n/g).map((s) => s.split(/\s+/g).reduce((o, a) => (a.length + r.length >= i || o[o.length - 1].length + a.length +
    1 < i ? o[o.length - 1] += ` ${a}` : o.push(`${r}${a}`), o), [r]).join(`
`)).join(`
`);
  };
});

// ../node_modules/prompts/dist/util/entriesToDisplay.js
var Tp = f((tD, Rp) => {
  "use strict";
  Rp.exports = (t, e, r) => {
    r = r || e;
    let i = Math.min(e - r, t - Math.floor(r / 2));
    i < 0 && (i = 0);
    let s = Math.min(i + r, e);
    return {
      startIndex: i,
      endIndex: s
    };
  };
});

// ../node_modules/prompts/dist/util/index.js
var we = f((rD, Ap) => {
  "use strict";
  Ap.exports = {
    action: up(),
    clear: yp(),
    style: bp(),
    strip: ui(),
    figures: ro(),
    lines: Sp(),
    wrap: wp(),
    entriesToDisplay: Tp()
  };
});

// ../node_modules/prompts/dist/elements/prompt.js
var We = f((iD, Cp) => {
  "use strict";
  var Pp = require("readline"), WE = we(), GE = WE.action, VE = require("events"), Op = Q(), YE = Op.beep, zE = Op.cursor, KE = z(), so = class extends VE {
    static {
      n(this, "Prompt");
    }
    constructor(e = {}) {
      super(), this.firstRender = !0, this.in = e.stdin || process.stdin, this.out = e.stdout || process.stdout, this.onRender = (e.onRender ||
      (() => {
      })).bind(this);
      let r = Pp.createInterface({
        input: this.in,
        escapeCodeTimeout: 50
      });
      Pp.emitKeypressEvents(this.in, r), this.in.isTTY && this.in.setRawMode(!0);
      let i = ["SelectPrompt", "MultiselectPrompt"].indexOf(this.constructor.name) > -1, s = /* @__PURE__ */ n((o, a) => {
        let l = GE(a, i);
        l === !1 ? this._ && this._(o, a) : typeof this[l] == "function" ? this[l](a) : this.bell();
      }, "keypress");
      this.close = () => {
        this.out.write(zE.show), this.in.removeListener("keypress", s), this.in.isTTY && this.in.setRawMode(!1), r.close(), this.emit(this.aborted ?
        "abort" : this.exited ? "exit" : "submit", this.value), this.closed = !0;
      }, this.in.on("keypress", s);
    }
    fire() {
      this.emit("state", {
        value: this.value,
        aborted: !!this.aborted,
        exited: !!this.exited
      });
    }
    bell() {
      this.out.write(YE);
    }
    render() {
      this.onRender(KE), this.firstRender && (this.firstRender = !1);
    }
  };
  Cp.exports = so;
});

// ../node_modules/prompts/dist/elements/text.js
var kp = f((nD, Lp) => {
  "use strict";
  function Dp(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(Dp, "asyncGeneratorStep");
  function Ip(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          Dp(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          Dp(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(Ip, "_asyncToGenerator");
  var hi = z(), QE = We(), Np = Q(), XE = Np.erase, sr = Np.cursor, pi = we(), no = pi.style, oo = pi.clear, ZE = pi.lines, JE = pi.figures,
  ao = class extends QE {
    static {
      n(this, "TextPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = no.render(e.style), this.scale = this.transform.scale, this.msg = e.message, this.initial = e.initial || "",
      this.validator = e.validate || (() => !0), this.value = "", this.errorMsg = e.error || "Please Enter A Valid Value", this.cursor = +!!this.
      initial, this.cursorOffset = 0, this.clear = oo("", this.out.columns), this.render();
    }
    set value(e) {
      !e && this.initial ? (this.placeholder = !0, this.rendered = hi.gray(this.transform.render(this.initial))) : (this.placeholder = !1, this.
      rendered = this.transform.render(e)), this._value = e, this.fire();
    }
    get value() {
      return this._value;
    }
    reset() {
      this.value = "", this.cursor = +!!this.initial, this.cursorOffset = 0, this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.value = this.value || this.initial, this.done = this.aborted = !0, this.error = !1, this.red = !1, this.fire(), this.render(), this.
      out.write(`
`), this.close();
    }
    validate() {
      var e = this;
      return Ip(function* () {
        let r = yield e.validator(e.value);
        typeof r == "string" && (e.errorMsg = r, r = !1), e.error = !r;
      })();
    }
    submit() {
      var e = this;
      return Ip(function* () {
        if (e.value = e.value || e.initial, e.cursorOffset = 0, e.cursor = e.rendered.length, yield e.validate(), e.error) {
          e.red = !0, e.fire(), e.render();
          return;
        }
        e.done = !0, e.aborted = !1, e.fire(), e.render(), e.out.write(`
`), e.close();
      })();
    }
    next() {
      if (!this.placeholder) return this.bell();
      this.value = this.initial, this.cursor = this.rendered.length, this.fire(), this.render();
    }
    moveCursor(e) {
      this.placeholder || (this.cursor = this.cursor + e, this.cursorOffset += e);
    }
    _(e, r) {
      let i = this.value.slice(0, this.cursor), s = this.value.slice(this.cursor);
      this.value = `${i}${e}${s}`, this.red = !1, this.cursor = this.placeholder ? 0 : i.length + 1, this.render();
    }
    delete() {
      if (this.isCursorAtStart()) return this.bell();
      let e = this.value.slice(0, this.cursor - 1), r = this.value.slice(this.cursor);
      this.value = `${e}${r}`, this.red = !1, this.isCursorAtStart() ? this.cursorOffset = 0 : (this.cursorOffset++, this.moveCursor(-1)), this.
      render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
      let e = this.value.slice(0, this.cursor), r = this.value.slice(this.cursor + 1);
      this.value = `${e}${r}`, this.red = !1, this.isCursorAtEnd() ? this.cursorOffset = 0 : this.cursorOffset++, this.render();
    }
    first() {
      this.cursor = 0, this.render();
    }
    last() {
      this.cursor = this.value.length, this.render();
    }
    left() {
      if (this.cursor <= 0 || this.placeholder) return this.bell();
      this.moveCursor(-1), this.render();
    }
    right() {
      if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
      this.moveCursor(1), this.render();
    }
    isCursorAtStart() {
      return this.cursor === 0 || this.placeholder && this.cursor === 1;
    }
    isCursorAtEnd() {
      return this.cursor === this.rendered.length || this.placeholder && this.cursor === this.rendered.length + 1;
    }
    render() {
      this.closed || (this.firstRender || (this.outputError && this.out.write(sr.down(ZE(this.outputError, this.out.columns) - 1) + oo(this.
      outputError, this.out.columns)), this.out.write(oo(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [no.symbol(this.done, this.aborted), hi.bold(this.msg), no.delimiter(this.done), this.red ? hi.red(this.rendered) : this.rendered].join(
      " "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : JE.pointerSmall} ${hi.red().italic(r)}`, "")), this.out.write(XE.line + sr.to(0) + this.outputText + sr.save + this.outputError +
      sr.restore + sr.move(this.cursorOffset, 0)));
    }
  };
  Lp.exports = ao;
});

// ../node_modules/prompts/dist/elements/select.js
var Fp = f((aD, qp) => {
  "use strict";
  var Ge = z(), eS = We(), nr = we(), $p = nr.style, Mp = nr.clear, di = nr.figures, tS = nr.wrap, rS = nr.entriesToDisplay, iS = Q(), sS = iS.
  cursor, lo = class extends eS {
    static {
      n(this, "SelectPrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.hint = e.hint || "- Use arrow-keys. Return to submit.", this.warn = e.warn || "- This option is d\
isabled", this.cursor = e.initial || 0, this.choices = e.choices.map((r, i) => (typeof r == "string" && (r = {
        title: r,
        value: i
      }), {
        title: r && (r.title || r.value || r),
        value: r && (r.value === void 0 ? i : r.value),
        description: r && r.description,
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.optionsPerPage = e.optionsPerPage || 10, this.value = (this.choices[this.cursor] || {}).value, this.clear = Mp("", this.out.
      columns), this.render();
    }
    moveCursor(e) {
      this.cursor = e, this.value = this.choices[e].value, this.fire();
    }
    reset() {
      this.moveCursor(0), this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.selection.disabled ? this.bell() : (this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close());
    }
    first() {
      this.moveCursor(0), this.render();
    }
    last() {
      this.moveCursor(this.choices.length - 1), this.render();
    }
    up() {
      this.cursor === 0 ? this.moveCursor(this.choices.length - 1) : this.moveCursor(this.cursor - 1), this.render();
    }
    down() {
      this.cursor === this.choices.length - 1 ? this.moveCursor(0) : this.moveCursor(this.cursor + 1), this.render();
    }
    next() {
      this.moveCursor((this.cursor + 1) % this.choices.length), this.render();
    }
    _(e, r) {
      if (e === " ") return this.submit();
    }
    get selection() {
      return this.choices[this.cursor];
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(sS.hide) : this.out.write(Mp(this.outputText, this.out.columns)), super.render();
      let e = rS(this.cursor, this.choices.length, this.optionsPerPage), r = e.startIndex, i = e.endIndex;
      if (this.outputText = [$p.symbol(this.done, this.aborted), Ge.bold(this.msg), $p.delimiter(!1), this.done ? this.selection.title : this.
      selection.disabled ? Ge.yellow(this.warn) : Ge.gray(this.hint)].join(" "), !this.done) {
        this.outputText += `
`;
        for (let s = r; s < i; s++) {
          let o, a, l = "", c = this.choices[s];
          s === r && r > 0 ? a = di.arrowUp : s === i - 1 && i < this.choices.length ? a = di.arrowDown : a = " ", c.disabled ? (o = this.cursor ===
          s ? Ge.gray().underline(c.title) : Ge.strikethrough().gray(c.title), a = (this.cursor === s ? Ge.bold().gray(di.pointer) + " " : "\
  ") + a) : (o = this.cursor === s ? Ge.cyan().underline(c.title) : c.title, a = (this.cursor === s ? Ge.cyan(di.pointer) + " " : "  ") + a,
          c.description && this.cursor === s && (l = ` - ${c.description}`, (a.length + o.length + l.length >= this.out.columns || c.description.
          split(/\r?\n/).length > 1) && (l = `
` + tS(c.description, {
            margin: 3,
            width: this.out.columns
          })))), this.outputText += `${a} ${o}${Ge.gray(l)}
`;
        }
      }
      this.out.write(this.outputText);
    }
  };
  qp.exports = lo;
});

// ../node_modules/prompts/dist/elements/toggle.js
var Gp = f((cD, Wp) => {
  "use strict";
  var fi = z(), nS = We(), Bp = we(), jp = Bp.style, oS = Bp.clear, Up = Q(), Hp = Up.cursor, aS = Up.erase, co = class extends nS {
    static {
      n(this, "TogglePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.value = !!e.initial, this.active = e.active || "on", this.inactive = e.inactive || "off", this.initialValue =
      this.value, this.render();
    }
    reset() {
      this.value = this.initialValue, this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    deactivate() {
      if (this.value === !1) return this.bell();
      this.value = !1, this.render();
    }
    activate() {
      if (this.value === !0) return this.bell();
      this.value = !0, this.render();
    }
    delete() {
      this.deactivate();
    }
    left() {
      this.deactivate();
    }
    right() {
      this.activate();
    }
    down() {
      this.deactivate();
    }
    up() {
      this.activate();
    }
    next() {
      this.value = !this.value, this.fire(), this.render();
    }
    _(e, r) {
      if (e === " ")
        this.value = !this.value;
      else if (e === "1")
        this.value = !0;
      else if (e === "0")
        this.value = !1;
      else return this.bell();
      this.render();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Hp.hide) : this.out.write(oS(this.outputText, this.out.columns)), super.render(), this.
      outputText = [jp.symbol(this.done, this.aborted), fi.bold(this.msg), jp.delimiter(this.done), this.value ? this.inactive : fi.cyan().underline(
      this.inactive), fi.gray("/"), this.value ? fi.cyan().underline(this.active) : this.active].join(" "), this.out.write(aS.line + Hp.to(0) +
      this.outputText));
    }
  };
  Wp.exports = co;
});

// ../node_modules/prompts/dist/dateparts/datepart.js
var ke = f((hD, Vp) => {
  "use strict";
  var uo = class t {
    static {
      n(this, "DatePart");
    }
    constructor({
      token: e,
      date: r,
      parts: i,
      locales: s
    }) {
      this.token = e, this.date = r || /* @__PURE__ */ new Date(), this.parts = i || [this], this.locales = s || {};
    }
    up() {
    }
    down() {
    }
    next() {
      let e = this.parts.indexOf(this);
      return this.parts.find((r, i) => i > e && r instanceof t);
    }
    setTo(e) {
    }
    prev() {
      let e = [].concat(this.parts).reverse(), r = e.indexOf(this);
      return e.find((i, s) => s > r && i instanceof t);
    }
    toString() {
      return String(this.date);
    }
  };
  Vp.exports = uo;
});

// ../node_modules/prompts/dist/dateparts/meridiem.js
var zp = f((dD, Yp) => {
  "use strict";
  var lS = ke(), ho = class extends lS {
    static {
      n(this, "Meridiem");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setHours((this.date.getHours() + 12) % 24);
    }
    down() {
      this.up();
    }
    toString() {
      let e = this.date.getHours() > 12 ? "pm" : "am";
      return /\A/.test(this.token) ? e.toUpperCase() : e;
    }
  };
  Yp.exports = ho;
});

// ../node_modules/prompts/dist/dateparts/day.js
var Qp = f((mD, Kp) => {
  "use strict";
  var cS = ke(), uS = /* @__PURE__ */ n((t) => (t = t % 10, t === 1 ? "st" : t === 2 ? "nd" : t === 3 ? "rd" : "th"), "pos"), po = class extends cS {
    static {
      n(this, "Day");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setDate(this.date.getDate() + 1);
    }
    down() {
      this.date.setDate(this.date.getDate() - 1);
    }
    setTo(e) {
      this.date.setDate(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getDate(), r = this.date.getDay();
      return this.token === "DD" ? String(e).padStart(2, "0") : this.token === "Do" ? e + uS(e) : this.token === "d" ? r + 1 : this.token ===
      "ddd" ? this.locales.weekdaysShort[r] : this.token === "dddd" ? this.locales.weekdays[r] : e;
    }
  };
  Kp.exports = po;
});

// ../node_modules/prompts/dist/dateparts/hours.js
var Zp = f((yD, Xp) => {
  "use strict";
  var hS = ke(), fo = class extends hS {
    static {
      n(this, "Hours");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setHours(this.date.getHours() + 1);
    }
    down() {
      this.date.setHours(this.date.getHours() - 1);
    }
    setTo(e) {
      this.date.setHours(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getHours();
      return /h/.test(this.token) && (e = e % 12 || 12), this.token.length > 1 ? String(e).padStart(2, "0") : e;
    }
  };
  Xp.exports = fo;
});

// ../node_modules/prompts/dist/dateparts/milliseconds.js
var ed = f((_D, Jp) => {
  "use strict";
  var pS = ke(), mo = class extends pS {
    static {
      n(this, "Milliseconds");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setMilliseconds(this.date.getMilliseconds() + 1);
    }
    down() {
      this.date.setMilliseconds(this.date.getMilliseconds() - 1);
    }
    setTo(e) {
      this.date.setMilliseconds(parseInt(e.substr(-this.token.length)));
    }
    toString() {
      return String(this.date.getMilliseconds()).padStart(4, "0").substr(0, this.token.length);
    }
  };
  Jp.exports = mo;
});

// ../node_modules/prompts/dist/dateparts/minutes.js
var rd = f((ED, td) => {
  "use strict";
  var dS = ke(), go = class extends dS {
    static {
      n(this, "Minutes");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setMinutes(this.date.getMinutes() + 1);
    }
    down() {
      this.date.setMinutes(this.date.getMinutes() - 1);
    }
    setTo(e) {
      this.date.setMinutes(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getMinutes();
      return this.token.length > 1 ? String(e).padStart(2, "0") : e;
    }
  };
  td.exports = go;
});

// ../node_modules/prompts/dist/dateparts/month.js
var sd = f((vD, id) => {
  "use strict";
  var fS = ke(), yo = class extends fS {
    static {
      n(this, "Month");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setMonth(this.date.getMonth() + 1);
    }
    down() {
      this.date.setMonth(this.date.getMonth() - 1);
    }
    setTo(e) {
      e = parseInt(e.substr(-2)) - 1, this.date.setMonth(e < 0 ? 0 : e);
    }
    toString() {
      let e = this.date.getMonth(), r = this.token.length;
      return r === 2 ? String(e + 1).padStart(2, "0") : r === 3 ? this.locales.monthsShort[e] : r === 4 ? this.locales.months[e] : String(e +
      1);
    }
  };
  id.exports = yo;
});

// ../node_modules/prompts/dist/dateparts/seconds.js
var od = f((RD, nd) => {
  "use strict";
  var mS = ke(), xo = class extends mS {
    static {
      n(this, "Seconds");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setSeconds(this.date.getSeconds() + 1);
    }
    down() {
      this.date.setSeconds(this.date.getSeconds() - 1);
    }
    setTo(e) {
      this.date.setSeconds(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getSeconds();
      return this.token.length > 1 ? String(e).padStart(2, "0") : e;
    }
  };
  nd.exports = xo;
});

// ../node_modules/prompts/dist/dateparts/year.js
var ld = f((AD, ad) => {
  "use strict";
  var gS = ke(), _o = class extends gS {
    static {
      n(this, "Year");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setFullYear(this.date.getFullYear() + 1);
    }
    down() {
      this.date.setFullYear(this.date.getFullYear() - 1);
    }
    setTo(e) {
      this.date.setFullYear(e.substr(-4));
    }
    toString() {
      let e = String(this.date.getFullYear()).padStart(4, "0");
      return this.token.length === 2 ? e.substr(-2) : e;
    }
  };
  ad.exports = _o;
});

// ../node_modules/prompts/dist/dateparts/index.js
var ud = f((OD, cd) => {
  "use strict";
  cd.exports = {
    DatePart: ke(),
    Meridiem: zp(),
    Day: Qp(),
    Hours: Zp(),
    Milliseconds: ed(),
    Minutes: rd(),
    Month: sd(),
    Seconds: od(),
    Year: ld()
  };
});

// ../node_modules/prompts/dist/elements/date.js
var bd = f((CD, _d) => {
  "use strict";
  function hd(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(hd, "asyncGeneratorStep");
  function pd(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          hd(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          hd(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(pd, "_asyncToGenerator");
  var bo = z(), yS = We(), So = we(), dd = So.style, fd = So.clear, xS = So.figures, xd = Q(), _S = xd.erase, md = xd.cursor, Ve = ud(), gd = Ve.
  DatePart, bS = Ve.Meridiem, ES = Ve.Day, SS = Ve.Hours, vS = Ve.Milliseconds, wS = Ve.Minutes, RS = Ve.Month, TS = Ve.Seconds, AS = Ve.Year,
  PS = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g, yd = {
    1: ({
      token: t
    }) => t.replace(/\\(.)/g, "$1"),
    2: (t) => new ES(t),
    // Day // TODO
    3: (t) => new RS(t),
    // Month
    4: (t) => new AS(t),
    // Year
    5: (t) => new bS(t),
    // AM/PM // TODO (special)
    6: (t) => new SS(t),
    // Hours
    7: (t) => new wS(t),
    // Minutes
    8: (t) => new TS(t),
    // Seconds
    9: (t) => new vS(t)
    // Fractional seconds
  }, OS = {
    months: "January,February,March,April,May,June,July,August,September,October,November,December".split(","),
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
    weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
    weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",")
  }, Eo = class extends yS {
    static {
      n(this, "DatePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.cursor = 0, this.typed = "", this.locales = Object.assign(OS, e.locales), this._date = e.initial ||
      /* @__PURE__ */ new Date(), this.errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.mask =
      e.mask || "YYYY-MM-DD HH:mm:ss", this.clear = fd("", this.out.columns), this.render();
    }
    get value() {
      return this.date;
    }
    get date() {
      return this._date;
    }
    set date(e) {
      e && this._date.setTime(e.getTime());
    }
    set mask(e) {
      let r;
      for (this.parts = []; r = PS.exec(e); ) {
        let s = r.shift(), o = r.findIndex((a) => a != null);
        this.parts.push(o in yd ? yd[o]({
          token: r[o] || s,
          date: this.date,
          parts: this.parts,
          locales: this.locales
        }) : r[o] || s);
      }
      let i = this.parts.reduce((s, o) => (typeof o == "string" && typeof s[s.length - 1] == "string" ? s[s.length - 1] += o : s.push(o), s),
      []);
      this.parts.splice(0), this.parts.push(...i), this.reset();
    }
    moveCursor(e) {
      this.typed = "", this.cursor = e, this.fire();
    }
    reset() {
      this.moveCursor(this.parts.findIndex((e) => e instanceof gd)), this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    validate() {
      var e = this;
      return pd(function* () {
        let r = yield e.validator(e.value);
        typeof r == "string" && (e.errorMsg = r, r = !1), e.error = !r;
      })();
    }
    submit() {
      var e = this;
      return pd(function* () {
        if (yield e.validate(), e.error) {
          e.color = "red", e.fire(), e.render();
          return;
        }
        e.done = !0, e.aborted = !1, e.fire(), e.render(), e.out.write(`
`), e.close();
      })();
    }
    up() {
      this.typed = "", this.parts[this.cursor].up(), this.render();
    }
    down() {
      this.typed = "", this.parts[this.cursor].down(), this.render();
    }
    left() {
      let e = this.parts[this.cursor].prev();
      if (e == null) return this.bell();
      this.moveCursor(this.parts.indexOf(e)), this.render();
    }
    right() {
      let e = this.parts[this.cursor].next();
      if (e == null) return this.bell();
      this.moveCursor(this.parts.indexOf(e)), this.render();
    }
    next() {
      let e = this.parts[this.cursor].next();
      this.moveCursor(e ? this.parts.indexOf(e) : this.parts.findIndex((r) => r instanceof gd)), this.render();
    }
    _(e) {
      /\d/.test(e) && (this.typed += e, this.parts[this.cursor].setTo(this.typed), this.render());
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(md.hide) : this.out.write(fd(this.outputText, this.out.columns)), super.render(), this.
      outputText = [dd.symbol(this.done, this.aborted), bo.bold(this.msg), dd.delimiter(!1), this.parts.reduce((e, r, i) => e.concat(i === this.
      cursor && !this.done ? bo.cyan().underline(r.toString()) : r), []).join("")].join(" "), this.error && (this.outputText += this.errorMsg.
      split(`
`).reduce((e, r, i) => e + `
${i ? " " : xS.pointerSmall} ${bo.red().italic(r)}`, "")), this.out.write(_S.line + md.to(0) + this.outputText));
    }
  };
  _d.exports = Eo;
});

// ../node_modules/prompts/dist/elements/number.js
var Ad = f((ID, Td) => {
  "use strict";
  function Ed(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(Ed, "asyncGeneratorStep");
  function Sd(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          Ed(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          Ed(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(Sd, "_asyncToGenerator");
  var mi = z(), CS = We(), Rd = Q(), gi = Rd.cursor, DS = Rd.erase, yi = we(), vo = yi.style, IS = yi.figures, vd = yi.clear, NS = yi.lines,
  LS = /[0-9]/, wo = /* @__PURE__ */ n((t) => t !== void 0, "isDef"), wd = /* @__PURE__ */ n((t, e) => {
    let r = Math.pow(10, e);
    return Math.round(t * r) / r;
  }, "round"), Ro = class extends CS {
    static {
      n(this, "NumberPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = vo.render(e.style), this.msg = e.message, this.initial = wo(e.initial) ? e.initial : "", this.float = !!e.float,
      this.round = e.round || 2, this.inc = e.increment || 1, this.min = wo(e.min) ? e.min : -1 / 0, this.max = wo(e.max) ? e.max : 1 / 0, this.
      errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.color = "cyan", this.value = "", this.
      typed = "", this.lastHit = 0, this.render();
    }
    set value(e) {
      !e && e !== 0 ? (this.placeholder = !0, this.rendered = mi.gray(this.transform.render(`${this.initial}`)), this._value = "") : (this.placeholder =
      !1, this.rendered = this.transform.render(`${wd(e, this.round)}`), this._value = wd(e, this.round)), this.fire();
    }
    get value() {
      return this._value;
    }
    parse(e) {
      return this.float ? parseFloat(e) : parseInt(e);
    }
    valid(e) {
      return e === "-" || e === "." && this.float || LS.test(e);
    }
    reset() {
      this.typed = "", this.value = "", this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      let e = this.value;
      this.value = e !== "" ? e : this.initial, this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`\

`), this.close();
    }
    validate() {
      var e = this;
      return Sd(function* () {
        let r = yield e.validator(e.value);
        typeof r == "string" && (e.errorMsg = r, r = !1), e.error = !r;
      })();
    }
    submit() {
      var e = this;
      return Sd(function* () {
        if (yield e.validate(), e.error) {
          e.color = "red", e.fire(), e.render();
          return;
        }
        let r = e.value;
        e.value = r !== "" ? r : e.initial, e.done = !0, e.aborted = !1, e.error = !1, e.fire(), e.render(), e.out.write(`
`), e.close();
      })();
    }
    up() {
      if (this.typed = "", this.value === "" && (this.value = this.min - this.inc), this.value >= this.max) return this.bell();
      this.value += this.inc, this.color = "cyan", this.fire(), this.render();
    }
    down() {
      if (this.typed = "", this.value === "" && (this.value = this.min + this.inc), this.value <= this.min) return this.bell();
      this.value -= this.inc, this.color = "cyan", this.fire(), this.render();
    }
    delete() {
      let e = this.value.toString();
      if (e.length === 0) return this.bell();
      this.value = this.parse(e = e.slice(0, -1)) || "", this.value !== "" && this.value < this.min && (this.value = this.min), this.color =
      "cyan", this.fire(), this.render();
    }
    next() {
      this.value = this.initial, this.fire(), this.render();
    }
    _(e, r) {
      if (!this.valid(e)) return this.bell();
      let i = Date.now();
      if (i - this.lastHit > 1e3 && (this.typed = ""), this.typed += e, this.lastHit = i, this.color = "cyan", e === ".") return this.fire();
      this.value = Math.min(this.parse(this.typed), this.max), this.value > this.max && (this.value = this.max), this.value < this.min && (this.
      value = this.min), this.fire(), this.render();
    }
    render() {
      this.closed || (this.firstRender || (this.outputError && this.out.write(gi.down(NS(this.outputError, this.out.columns) - 1) + vd(this.
      outputError, this.out.columns)), this.out.write(vd(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [vo.symbol(this.done, this.aborted), mi.bold(this.msg), vo.delimiter(this.done), !this.done || !this.done && !this.placeholder ? mi[this.
      color]().underline(this.rendered) : this.rendered].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : IS.pointerSmall} ${mi.red().italic(r)}`, "")), this.out.write(DS.line + gi.to(0) + this.outputText + gi.save + this.outputError +
      gi.restore));
    }
  };
  Td.exports = Ro;
});

// ../node_modules/prompts/dist/elements/multiselect.js
var Ao = f((LD, Cd) => {
  "use strict";
  var $e = z(), kS = Q(), $S = kS.cursor, MS = We(), or = we(), Pd = or.clear, nt = or.figures, Od = or.style, qS = or.wrap, FS = or.entriesToDisplay,
  To = class extends MS {
    static {
      n(this, "MultiselectPrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.cursor = e.cursor || 0, this.scrollIndex = e.cursor || 0, this.hint = e.hint || "", this.warn = e.
      warn || "- This option is disabled -", this.minSelected = e.min, this.showMinError = !1, this.maxChoices = e.max, this.instructions = e.
      instructions, this.optionsPerPage = e.optionsPerPage || 10, this.value = e.choices.map((r, i) => (typeof r == "string" && (r = {
        title: r,
        value: i
      }), {
        title: r && (r.title || r.value || r),
        description: r && r.description,
        value: r && (r.value === void 0 ? i : r.value),
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.clear = Pd("", this.out.columns), e.overrideRender || this.render();
    }
    reset() {
      this.value.map((e) => !e.selected), this.cursor = 0, this.fire(), this.render();
    }
    selected() {
      return this.value.filter((e) => e.selected);
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      let e = this.value.filter((r) => r.selected);
      this.minSelected && e.length < this.minSelected ? (this.showMinError = !0, this.render()) : (this.done = !0, this.aborted = !1, this.fire(),
      this.render(), this.out.write(`
`), this.close());
    }
    first() {
      this.cursor = 0, this.render();
    }
    last() {
      this.cursor = this.value.length - 1, this.render();
    }
    next() {
      this.cursor = (this.cursor + 1) % this.value.length, this.render();
    }
    up() {
      this.cursor === 0 ? this.cursor = this.value.length - 1 : this.cursor--, this.render();
    }
    down() {
      this.cursor === this.value.length - 1 ? this.cursor = 0 : this.cursor++, this.render();
    }
    left() {
      this.value[this.cursor].selected = !1, this.render();
    }
    right() {
      if (this.value.filter((e) => e.selected).length >= this.maxChoices) return this.bell();
      this.value[this.cursor].selected = !0, this.render();
    }
    handleSpaceToggle() {
      let e = this.value[this.cursor];
      if (e.selected)
        e.selected = !1, this.render();
      else {
        if (e.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        e.selected = !0, this.render();
      }
    }
    toggleAll() {
      if (this.maxChoices !== void 0 || this.value[this.cursor].disabled)
        return this.bell();
      let e = !this.value[this.cursor].selected;
      this.value.filter((r) => !r.disabled).forEach((r) => r.selected = e), this.render();
    }
    _(e, r) {
      if (e === " ")
        this.handleSpaceToggle();
      else if (e === "a")
        this.toggleAll();
      else
        return this.bell();
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${nt.arrowUp}/${nt.arrowDown}: Highlight option
    ${nt.arrowLeft}/${nt.arrowRight}/[space]: Toggle selection
` + (this.maxChoices === void 0 ? `    a: Toggle all
` : "") + "    enter/return: Complete answer" : "";
    }
    renderOption(e, r, i, s) {
      let o = (r.selected ? $e.green(nt.radioOn) : nt.radioOff) + " " + s + " ", a, l;
      return r.disabled ? a = e === i ? $e.gray().underline(r.title) : $e.strikethrough().gray(r.title) : (a = e === i ? $e.cyan().underline(
      r.title) : r.title, e === i && r.description && (l = ` - ${r.description}`, (o.length + a.length + l.length >= this.out.columns || r.description.
      split(/\r?\n/).length > 1) && (l = `
` + qS(r.description, {
        margin: o.length,
        width: this.out.columns
      })))), o + a + $e.gray(l || "");
    }
    // shared with autocompleteMultiselect
    paginateOptions(e) {
      if (e.length === 0)
        return $e.red("No matches for this query.");
      let r = FS(this.cursor, e.length, this.optionsPerPage), i = r.startIndex, s = r.endIndex, o, a = [];
      for (let l = i; l < s; l++)
        l === i && i > 0 ? o = nt.arrowUp : l === s - 1 && s < e.length ? o = nt.arrowDown : o = " ", a.push(this.renderOption(this.cursor, e[l],
        l, o));
      return `
` + a.join(`
`);
    }
    // shared with autocomleteMultiselect
    renderOptions(e) {
      return this.done ? "" : this.paginateOptions(e);
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let e = [$e.gray(this.hint), this.renderInstructions()];
      return this.value[this.cursor].disabled && e.push($e.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write($S.hide), super.render();
      let e = [Od.symbol(this.done, this.aborted), $e.bold(this.msg), Od.delimiter(!1), this.renderDoneOrInstructions()].join(" ");
      this.showMinError && (e += $e.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.value), this.out.write(this.clear + e), this.clear = Pd(e, this.out.columns);
    }
  };
  Cd.exports = To;
});

// ../node_modules/prompts/dist/elements/autocomplete.js
var Md = f(($D, $d) => {
  "use strict";
  function Dd(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(Dd, "asyncGeneratorStep");
  function jS(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          Dd(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          Dd(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(jS, "_asyncToGenerator");
  var ar = z(), HS = We(), kd = Q(), BS = kd.erase, Id = kd.cursor, lr = we(), Po = lr.style, Nd = lr.clear, Oo = lr.figures, US = lr.wrap, WS = lr.
  entriesToDisplay, Ld = /* @__PURE__ */ n((t, e) => t[e] && (t[e].value || t[e].title || t[e]), "getVal"), GS = /* @__PURE__ */ n((t, e) => t[e] &&
  (t[e].title || t[e].value || t[e]), "getTitle"), VS = /* @__PURE__ */ n((t, e) => {
    let r = t.findIndex((i) => i.value === e || i.title === e);
    return r > -1 ? r : void 0;
  }, "getIndex"), Co = class extends HS {
    static {
      n(this, "AutocompletePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.suggest = e.suggest, this.choices = e.choices, this.initial = typeof e.initial == "number" ? e.initial :
      VS(e.choices, e.initial), this.select = this.initial || e.cursor || 0, this.i18n = {
        noMatches: e.noMatches || "no matches found"
      }, this.fallback = e.fallback || this.initial, this.clearFirst = e.clearFirst || !1, this.suggestions = [], this.input = "", this.limit =
      e.limit || 10, this.cursor = 0, this.transform = Po.render(e.style), this.scale = this.transform.scale, this.render = this.render.bind(
      this), this.complete = this.complete.bind(this), this.clear = Nd("", this.out.columns), this.complete(this.render), this.render();
    }
    set fallback(e) {
      this._fb = Number.isSafeInteger(parseInt(e)) ? parseInt(e) : e;
    }
    get fallback() {
      let e;
      return typeof this._fb == "number" ? e = this.choices[this._fb] : typeof this._fb == "string" && (e = {
        title: this._fb
      }), e || this._fb || {
        title: this.i18n.noMatches
      };
    }
    moveSelect(e) {
      this.select = e, this.suggestions.length > 0 ? this.value = Ld(this.suggestions, e) : this.value = this.fallback.value, this.fire();
    }
    complete(e) {
      var r = this;
      return jS(function* () {
        let i = r.completing = r.suggest(r.input, r.choices), s = yield i;
        if (r.completing !== i) return;
        r.suggestions = s.map((a, l, c) => ({
          title: GS(c, l),
          value: Ld(c, l),
          description: a.description
        })), r.completing = !1;
        let o = Math.max(s.length - 1, 0);
        r.moveSelect(Math.min(o, r.select)), e && e();
      })();
    }
    reset() {
      this.input = "", this.complete(() => {
        this.moveSelect(this.initial !== void 0 ? this.initial : 0), this.render();
      }), this.render();
    }
    exit() {
      this.clearFirst && this.input.length > 0 ? this.reset() : (this.done = this.exited = !0, this.aborted = !1, this.fire(), this.render(),
      this.out.write(`
`), this.close());
    }
    abort() {
      this.done = this.aborted = !0, this.exited = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.done = !0, this.aborted = this.exited = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    _(e, r) {
      let i = this.input.slice(0, this.cursor), s = this.input.slice(this.cursor);
      this.input = `${i}${e}${s}`, this.cursor = i.length + 1, this.complete(this.render), this.render();
    }
    delete() {
      if (this.cursor === 0) return this.bell();
      let e = this.input.slice(0, this.cursor - 1), r = this.input.slice(this.cursor);
      this.input = `${e}${r}`, this.complete(this.render), this.cursor = this.cursor - 1, this.render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length) return this.bell();
      let e = this.input.slice(0, this.cursor), r = this.input.slice(this.cursor + 1);
      this.input = `${e}${r}`, this.complete(this.render), this.render();
    }
    first() {
      this.moveSelect(0), this.render();
    }
    last() {
      this.moveSelect(this.suggestions.length - 1), this.render();
    }
    up() {
      this.select === 0 ? this.moveSelect(this.suggestions.length - 1) : this.moveSelect(this.select - 1), this.render();
    }
    down() {
      this.select === this.suggestions.length - 1 ? this.moveSelect(0) : this.moveSelect(this.select + 1), this.render();
    }
    next() {
      this.select === this.suggestions.length - 1 ? this.moveSelect(0) : this.moveSelect(this.select + 1), this.render();
    }
    nextPage() {
      this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1)), this.render();
    }
    prevPage() {
      this.moveSelect(Math.max(this.select - this.limit, 0)), this.render();
    }
    left() {
      if (this.cursor <= 0) return this.bell();
      this.cursor = this.cursor - 1, this.render();
    }
    right() {
      if (this.cursor * this.scale >= this.rendered.length) return this.bell();
      this.cursor = this.cursor + 1, this.render();
    }
    renderOption(e, r, i, s) {
      let o, a = i ? Oo.arrowUp : s ? Oo.arrowDown : " ", l = r ? ar.cyan().underline(e.title) : e.title;
      return a = (r ? ar.cyan(Oo.pointer) + " " : "  ") + a, e.description && (o = ` - ${e.description}`, (a.length + l.length + o.length >=
      this.out.columns || e.description.split(/\r?\n/).length > 1) && (o = `
` + US(e.description, {
        margin: 3,
        width: this.out.columns
      }))), a + " " + l + ar.gray(o || "");
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(Id.hide) : this.out.write(Nd(this.outputText, this.out.columns)), super.render();
      let e = WS(this.select, this.choices.length, this.limit), r = e.startIndex, i = e.endIndex;
      if (this.outputText = [Po.symbol(this.done, this.aborted, this.exited), ar.bold(this.msg), Po.delimiter(this.completing), this.done &&
      this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)].join(" "), !this.
      done) {
        let s = this.suggestions.slice(r, i).map((o, a) => this.renderOption(o, this.select === a + r, a === 0 && r > 0, a + r === i - 1 && i <
        this.choices.length)).join(`
`);
        this.outputText += `
` + (s || ar.gray(this.fallback.title));
      }
      this.out.write(BS.line + Id.to(0) + this.outputText);
    }
  };
  $d.exports = Co;
});

// ../node_modules/prompts/dist/elements/autocompleteMultiselect.js
var Hd = f((qD, jd) => {
  "use strict";
  var Ye = z(), YS = Q(), zS = YS.cursor, KS = Ao(), Io = we(), qd = Io.clear, Fd = Io.style, $t = Io.figures, Do = class extends KS {
    static {
      n(this, "AutocompleteMultiselectPrompt");
    }
    constructor(e = {}) {
      e.overrideRender = !0, super(e), this.inputValue = "", this.clear = qd("", this.out.columns), this.filteredOptions = this.value, this.
      render();
    }
    last() {
      this.cursor = this.filteredOptions.length - 1, this.render();
    }
    next() {
      this.cursor = (this.cursor + 1) % this.filteredOptions.length, this.render();
    }
    up() {
      this.cursor === 0 ? this.cursor = this.filteredOptions.length - 1 : this.cursor--, this.render();
    }
    down() {
      this.cursor === this.filteredOptions.length - 1 ? this.cursor = 0 : this.cursor++, this.render();
    }
    left() {
      this.filteredOptions[this.cursor].selected = !1, this.render();
    }
    right() {
      if (this.value.filter((e) => e.selected).length >= this.maxChoices) return this.bell();
      this.filteredOptions[this.cursor].selected = !0, this.render();
    }
    delete() {
      this.inputValue.length && (this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1), this.updateFilteredOptions());
    }
    updateFilteredOptions() {
      let e = this.filteredOptions[this.cursor];
      this.filteredOptions = this.value.filter((i) => this.inputValue ? !!(typeof i.title == "string" && i.title.toLowerCase().includes(this.
      inputValue.toLowerCase()) || typeof i.value == "string" && i.value.toLowerCase().includes(this.inputValue.toLowerCase())) : !0);
      let r = this.filteredOptions.findIndex((i) => i === e);
      this.cursor = r < 0 ? 0 : r, this.render();
    }
    handleSpaceToggle() {
      let e = this.filteredOptions[this.cursor];
      if (e.selected)
        e.selected = !1, this.render();
      else {
        if (e.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        e.selected = !0, this.render();
      }
    }
    handleInputChange(e) {
      this.inputValue = this.inputValue + e, this.updateFilteredOptions();
    }
    _(e, r) {
      e === " " ? this.handleSpaceToggle() : this.handleInputChange(e);
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${$t.arrowUp}/${$t.arrowDown}: Highlight option
    ${$t.arrowLeft}/${$t.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
` : "";
    }
    renderCurrentInput() {
      return `
Filtered results for: ${this.inputValue ? this.inputValue : Ye.gray("Enter something to filter")}
`;
    }
    renderOption(e, r, i) {
      let s;
      return r.disabled ? s = e === i ? Ye.gray().underline(r.title) : Ye.strikethrough().gray(r.title) : s = e === i ? Ye.cyan().underline(
      r.title) : r.title, (r.selected ? Ye.green($t.radioOn) : $t.radioOff) + "  " + s;
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let e = [Ye.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
      return this.filteredOptions.length && this.filteredOptions[this.cursor].disabled && e.push(Ye.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(zS.hide), super.render();
      let e = [Fd.symbol(this.done, this.aborted), Ye.bold(this.msg), Fd.delimiter(!1), this.renderDoneOrInstructions()].join(" ");
      this.showMinError && (e += Ye.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.filteredOptions), this.out.write(this.clear + e), this.clear = qd(e, this.out.columns);
    }
  };
  jd.exports = Do;
});

// ../node_modules/prompts/dist/elements/confirm.js
var zd = f((jD, Yd) => {
  "use strict";
  var Bd = z(), QS = We(), Gd = we(), Ud = Gd.style, XS = Gd.clear, Vd = Q(), ZS = Vd.erase, Wd = Vd.cursor, No = class extends QS {
    static {
      n(this, "ConfirmPrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.value = e.initial, this.initialValue = !!e.initial, this.yesMsg = e.yes || "yes", this.yesOption =
      e.yesOption || "(Y/n)", this.noMsg = e.no || "no", this.noOption = e.noOption || "(y/N)", this.render();
    }
    reset() {
      this.value = this.initialValue, this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.value = this.value || !1, this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    _(e, r) {
      return e.toLowerCase() === "y" ? (this.value = !0, this.submit()) : e.toLowerCase() === "n" ? (this.value = !1, this.submit()) : this.
      bell();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Wd.hide) : this.out.write(XS(this.outputText, this.out.columns)), super.render(), this.
      outputText = [Ud.symbol(this.done, this.aborted), Bd.bold(this.msg), Ud.delimiter(this.done), this.done ? this.value ? this.yesMsg : this.
      noMsg : Bd.gray(this.initialValue ? this.yesOption : this.noOption)].join(" "), this.out.write(ZS.line + Wd.to(0) + this.outputText));
    }
  };
  Yd.exports = No;
});

// ../node_modules/prompts/dist/elements/index.js
var Qd = f((BD, Kd) => {
  "use strict";
  Kd.exports = {
    TextPrompt: kp(),
    SelectPrompt: Fp(),
    TogglePrompt: Gp(),
    DatePrompt: bd(),
    NumberPrompt: Ad(),
    MultiselectPrompt: Ao(),
    AutocompletePrompt: Md(),
    AutocompleteMultiselectPrompt: Hd(),
    ConfirmPrompt: zd()
  };
});

// ../node_modules/prompts/dist/prompts.js
var Zd = f((Xd) => {
  "use strict";
  var le = Xd, JS = Qd(), xi = /* @__PURE__ */ n((t) => t, "noop");
  function Me(t, e, r = {}) {
    return new Promise((i, s) => {
      let o = new JS[t](e), a = r.onAbort || xi, l = r.onSubmit || xi, c = r.onExit || xi;
      o.on("state", e.onState || xi), o.on("submit", (u) => i(l(u))), o.on("exit", (u) => i(c(u))), o.on("abort", (u) => s(a(u)));
    });
  }
  n(Me, "toPrompt");
  le.text = (t) => Me("TextPrompt", t);
  le.password = (t) => (t.style = "password", le.text(t));
  le.invisible = (t) => (t.style = "invisible", le.text(t));
  le.number = (t) => Me("NumberPrompt", t);
  le.date = (t) => Me("DatePrompt", t);
  le.confirm = (t) => Me("ConfirmPrompt", t);
  le.list = (t) => {
    let e = t.separator || ",";
    return Me("TextPrompt", t, {
      onSubmit: /* @__PURE__ */ n((r) => r.split(e).map((i) => i.trim()), "onSubmit")
    });
  };
  le.toggle = (t) => Me("TogglePrompt", t);
  le.select = (t) => Me("SelectPrompt", t);
  le.multiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return Me("MultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  le.autocompleteMultiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return Me("AutocompleteMultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  var ev = /* @__PURE__ */ n((t, e) => Promise.resolve(e.filter((r) => r.title.slice(0, t.length).toLowerCase() === t.toLowerCase())), "byTi\
tle");
  le.autocomplete = (t) => (t.suggest = t.suggest || ev, t.choices = [].concat(t.choices || []), Me("AutocompletePrompt", t));
});

// ../node_modules/prompts/dist/index.js
var af = f((GD, of) => {
  "use strict";
  function Jd(t, e) {
    var r = Object.keys(t);
    if (Object.getOwnPropertySymbols) {
      var i = Object.getOwnPropertySymbols(t);
      e && (i = i.filter(function(s) {
        return Object.getOwnPropertyDescriptor(t, s).enumerable;
      })), r.push.apply(r, i);
    }
    return r;
  }
  n(Jd, "ownKeys");
  function ef(t) {
    for (var e = 1; e < arguments.length; e++) {
      var r = arguments[e] != null ? arguments[e] : {};
      e % 2 ? Jd(Object(r), !0).forEach(function(i) {
        tv(t, i, r[i]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : Jd(Object(r)).forEach(function(i) {
        Object.defineProperty(t, i, Object.getOwnPropertyDescriptor(r, i));
      });
    }
    return t;
  }
  n(ef, "_objectSpread");
  function tv(t, e, r) {
    return e in t ? Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : t[e] = r, t;
  }
  n(tv, "_defineProperty");
  function rv(t, e) {
    var r = typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
    if (!r) {
      if (Array.isArray(t) || (r = iv(t)) || e && t && typeof t.length == "number") {
        r && (t = r);
        var i = 0, s = /* @__PURE__ */ n(function() {
        }, "F");
        return { s, n: /* @__PURE__ */ n(function() {
          return i >= t.length ? { done: !0 } : { done: !1, value: t[i++] };
        }, "n"), e: /* @__PURE__ */ n(function(u) {
          throw u;
        }, "e"), f: s };
      }
      throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    var o = !0, a = !1, l;
    return { s: /* @__PURE__ */ n(function() {
      r = r.call(t);
    }, "s"), n: /* @__PURE__ */ n(function() {
      var u = r.next();
      return o = u.done, u;
    }, "n"), e: /* @__PURE__ */ n(function(u) {
      a = !0, l = u;
    }, "e"), f: /* @__PURE__ */ n(function() {
      try {
        !o && r.return != null && r.return();
      } finally {
        if (a) throw l;
      }
    }, "f") };
  }
  n(rv, "_createForOfIteratorHelper");
  function iv(t, e) {
    if (t) {
      if (typeof t == "string") return tf(t, e);
      var r = Object.prototype.toString.call(t).slice(8, -1);
      if (r === "Object" && t.constructor && (r = t.constructor.name), r === "Map" || r === "Set") return Array.from(t);
      if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return tf(t, e);
    }
  }
  n(iv, "_unsupportedIterableToArray");
  function tf(t, e) {
    (e == null || e > t.length) && (e = t.length);
    for (var r = 0, i = new Array(e); r < e; r++) i[r] = t[r];
    return i;
  }
  n(tf, "_arrayLikeToArray");
  function rf(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(rf, "asyncGeneratorStep");
  function sf(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          rf(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          rf(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(sf, "_asyncToGenerator");
  var Lo = Zd(), sv = ["suggest", "format", "onState", "validate", "onRender", "type"], nf = /* @__PURE__ */ n(() => {
  }, "noop");
  function ot() {
    return ko.apply(this, arguments);
  }
  n(ot, "prompt");
  function ko() {
    return ko = sf(function* (t = [], {
      onSubmit: e = nf,
      onCancel: r = nf
    } = {}) {
      let i = {}, s = ot._override || {};
      t = [].concat(t);
      let o, a, l, c, u, h, m = /* @__PURE__ */ function() {
        var R = sf(function* (T, k, D = !1) {
          if (!(!D && T.validate && T.validate(k) !== !0))
            return T.format ? yield T.format(k, i) : k;
        });
        return /* @__PURE__ */ n(function(k, D) {
          return R.apply(this, arguments);
        }, "getFormattedAnswer");
      }();
      var p = rv(t), v;
      try {
        for (p.s(); !(v = p.n()).done; ) {
          a = v.value;
          var g = a;
          if (c = g.name, u = g.type, typeof u == "function" && (u = yield u(o, ef({}, i), a), a.type = u), !!u) {
            for (let R in a) {
              if (sv.includes(R)) continue;
              let T = a[R];
              a[R] = typeof T == "function" ? yield T(o, ef({}, i), h) : T;
            }
            if (h = a, typeof a.message != "string")
              throw new Error("prompt message is required");
            var b = a;
            if (c = b.name, u = b.type, Lo[u] === void 0)
              throw new Error(`prompt type (${u}) is not defined`);
            if (s[a.name] !== void 0 && (o = yield m(a, s[a.name]), o !== void 0)) {
              i[c] = o;
              continue;
            }
            try {
              o = ot._injected ? nv(ot._injected, a.initial) : yield Lo[u](a), i[c] = o = yield m(a, o, !0), l = yield e(a, o, i);
            } catch {
              l = !(yield r(a, i));
            }
            if (l) return i;
          }
        }
      } catch (R) {
        p.e(R);
      } finally {
        p.f();
      }
      return i;
    }), ko.apply(this, arguments);
  }
  n(ko, "_prompt");
  function nv(t, e) {
    let r = t.shift();
    if (r instanceof Error)
      throw r;
    return r === void 0 ? e : r;
  }
  n(nv, "getInjectedAnswer");
  function ov(t) {
    ot._injected = (ot._injected || []).concat(t);
  }
  n(ov, "inject");
  function av(t) {
    ot._override = Object.assign({}, t);
  }
  n(av, "override");
  of.exports = Object.assign(ot, {
    prompt: ot,
    prompts: Lo,
    inject: ov,
    override: av
  });
});

// ../node_modules/prompts/lib/util/action.js
var cf = f((YD, lf) => {
  "use strict";
  lf.exports = (t, e) => {
    if (!(t.meta && t.name !== "escape")) {
      if (t.ctrl) {
        if (t.name === "a") return "first";
        if (t.name === "c" || t.name === "d") return "abort";
        if (t.name === "e") return "last";
        if (t.name === "g") return "reset";
      }
      if (e) {
        if (t.name === "j") return "down";
        if (t.name === "k") return "up";
      }
      return t.name === "return" || t.name === "enter" ? "submit" : t.name === "backspace" ? "delete" : t.name === "delete" ? "deleteForward" :
      t.name === "abort" ? "abort" : t.name === "escape" ? "exit" : t.name === "tab" ? "next" : t.name === "pagedown" ? "nextPage" : t.name ===
      "pageup" ? "prevPage" : t.name === "home" ? "home" : t.name === "end" ? "end" : t.name === "up" ? "up" : t.name === "down" ? "down" : t.
      name === "right" ? "right" : t.name === "left" ? "left" : !1;
    }
  };
});

// ../node_modules/prompts/lib/util/strip.js
var _i = f((zD, uf) => {
  "use strict";
  uf.exports = (t) => {
    let e = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
    ].join("|"), r = new RegExp(e, "g");
    return typeof t == "string" ? t.replace(r, "") : t;
  };
});

// ../node_modules/prompts/lib/util/clear.js
var df = f((KD, pf) => {
  "use strict";
  var lv = _i(), { erase: hf, cursor: cv } = Q(), uv = /* @__PURE__ */ n((t) => [...lv(t)].length, "width");
  pf.exports = function(t, e) {
    if (!e) return hf.line + cv.to(0);
    let r = 0, i = t.split(/\r?\n/);
    for (let s of i)
      r += 1 + Math.floor(Math.max(uv(s) - 1, 0) / e);
    return hf.lines(r);
  };
});

// ../node_modules/prompts/lib/util/figures.js
var $o = f((XD, ff) => {
  "use strict";
  var cr = {
    arrowUp: "\u2191",
    arrowDown: "\u2193",
    arrowLeft: "\u2190",
    arrowRight: "\u2192",
    radioOn: "\u25C9",
    radioOff: "\u25EF",
    tick: "\u2714",
    cross: "\u2716",
    ellipsis: "\u2026",
    pointerSmall: "\u203A",
    line: "\u2500",
    pointer: "\u276F"
  }, hv = {
    arrowUp: cr.arrowUp,
    arrowDown: cr.arrowDown,
    arrowLeft: cr.arrowLeft,
    arrowRight: cr.arrowRight,
    radioOn: "(*)",
    radioOff: "( )",
    tick: "\u221A",
    cross: "\xD7",
    ellipsis: "...",
    pointerSmall: "\xBB",
    line: "\u2500",
    pointer: ">"
  }, pv = process.platform === "win32" ? hv : cr;
  ff.exports = pv;
});

// ../node_modules/prompts/lib/util/style.js
var gf = f((ZD, mf) => {
  "use strict";
  var Mt = z(), xt = $o(), Mo = Object.freeze({
    password: { scale: 1, render: /* @__PURE__ */ n((t) => "*".repeat(t.length), "render") },
    emoji: { scale: 2, render: /* @__PURE__ */ n((t) => "\u{1F603}".repeat(t.length), "render") },
    invisible: { scale: 0, render: /* @__PURE__ */ n((t) => "", "render") },
    default: { scale: 1, render: /* @__PURE__ */ n((t) => `${t}`, "render") }
  }), dv = /* @__PURE__ */ n((t) => Mo[t] || Mo.default, "render"), ur = Object.freeze({
    aborted: Mt.red(xt.cross),
    done: Mt.green(xt.tick),
    exited: Mt.yellow(xt.cross),
    default: Mt.cyan("?")
  }), fv = /* @__PURE__ */ n((t, e, r) => e ? ur.aborted : r ? ur.exited : t ? ur.done : ur.default, "symbol"), mv = /* @__PURE__ */ n((t) => Mt.
  gray(t ? xt.ellipsis : xt.pointerSmall), "delimiter"), gv = /* @__PURE__ */ n((t, e) => Mt.gray(t ? e ? xt.pointerSmall : "+" : xt.line), "\
item");
  mf.exports = {
    styles: Mo,
    render: dv,
    symbols: ur,
    symbol: fv,
    delimiter: mv,
    item: gv
  };
});

// ../node_modules/prompts/lib/util/lines.js
var xf = f((e0, yf) => {
  "use strict";
  var yv = _i();
  yf.exports = function(t, e) {
    let r = String(yv(t) || "").split(/\r?\n/);
    return e ? r.map((i) => Math.ceil(i.length / e)).reduce((i, s) => i + s) : r.length;
  };
});

// ../node_modules/prompts/lib/util/wrap.js
var bf = f((t0, _f) => {
  "use strict";
  _f.exports = (t, e = {}) => {
    let r = Number.isSafeInteger(parseInt(e.margin)) ? new Array(parseInt(e.margin)).fill(" ").join("") : e.margin || "", i = e.width;
    return (t || "").split(/\r?\n/g).map((s) => s.split(/\s+/g).reduce((o, a) => (a.length + r.length >= i || o[o.length - 1].length + a.length +
    1 < i ? o[o.length - 1] += ` ${a}` : o.push(`${r}${a}`), o), [r]).join(`
`)).join(`
`);
  };
});

// ../node_modules/prompts/lib/util/entriesToDisplay.js
var Sf = f((r0, Ef) => {
  "use strict";
  Ef.exports = (t, e, r) => {
    r = r || e;
    let i = Math.min(e - r, t - Math.floor(r / 2));
    i < 0 && (i = 0);
    let s = Math.min(i + r, e);
    return { startIndex: i, endIndex: s };
  };
});

// ../node_modules/prompts/lib/util/index.js
var Re = f((i0, vf) => {
  "use strict";
  vf.exports = {
    action: cf(),
    clear: df(),
    style: gf(),
    strip: _i(),
    figures: $o(),
    lines: xf(),
    wrap: bf(),
    entriesToDisplay: Sf()
  };
});

// ../node_modules/prompts/lib/elements/prompt.js
var ze = f((s0, Rf) => {
  "use strict";
  var wf = require("readline"), { action: xv } = Re(), _v = require("events"), { beep: bv, cursor: Ev } = Q(), Sv = z(), qo = class extends _v {
    static {
      n(this, "Prompt");
    }
    constructor(e = {}) {
      super(), this.firstRender = !0, this.in = e.stdin || process.stdin, this.out = e.stdout || process.stdout, this.onRender = (e.onRender ||
      (() => {
      })).bind(this);
      let r = wf.createInterface({ input: this.in, escapeCodeTimeout: 50 });
      wf.emitKeypressEvents(this.in, r), this.in.isTTY && this.in.setRawMode(!0);
      let i = ["SelectPrompt", "MultiselectPrompt"].indexOf(this.constructor.name) > -1, s = /* @__PURE__ */ n((o, a) => {
        let l = xv(a, i);
        l === !1 ? this._ && this._(o, a) : typeof this[l] == "function" ? this[l](a) : this.bell();
      }, "keypress");
      this.close = () => {
        this.out.write(Ev.show), this.in.removeListener("keypress", s), this.in.isTTY && this.in.setRawMode(!1), r.close(), this.emit(this.aborted ?
        "abort" : this.exited ? "exit" : "submit", this.value), this.closed = !0;
      }, this.in.on("keypress", s);
    }
    fire() {
      this.emit("state", {
        value: this.value,
        aborted: !!this.aborted,
        exited: !!this.exited
      });
    }
    bell() {
      this.out.write(bv);
    }
    render() {
      this.onRender(Sv), this.firstRender && (this.firstRender = !1);
    }
  };
  Rf.exports = qo;
});

// ../node_modules/prompts/lib/elements/text.js
var Af = f((o0, Tf) => {
  var bi = z(), vv = ze(), { erase: wv, cursor: hr } = Q(), { style: Fo, clear: jo, lines: Rv, figures: Tv } = Re(), Ho = class extends vv {
    static {
      n(this, "TextPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = Fo.render(e.style), this.scale = this.transform.scale, this.msg = e.message, this.initial = e.initial || "",
      this.validator = e.validate || (() => !0), this.value = "", this.errorMsg = e.error || "Please Enter A Valid Value", this.cursor = +!!this.
      initial, this.cursorOffset = 0, this.clear = jo("", this.out.columns), this.render();
    }
    set value(e) {
      !e && this.initial ? (this.placeholder = !0, this.rendered = bi.gray(this.transform.render(this.initial))) : (this.placeholder = !1, this.
      rendered = this.transform.render(e)), this._value = e, this.fire();
    }
    get value() {
      return this._value;
    }
    reset() {
      this.value = "", this.cursor = +!!this.initial, this.cursorOffset = 0, this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.value = this.value || this.initial, this.done = this.aborted = !0, this.error = !1, this.red = !1, this.fire(), this.render(), this.
      out.write(`
`), this.close();
    }
    async validate() {
      let e = await this.validator(this.value);
      typeof e == "string" && (this.errorMsg = e, e = !1), this.error = !e;
    }
    async submit() {
      if (this.value = this.value || this.initial, this.cursorOffset = 0, this.cursor = this.rendered.length, await this.validate(), this.error) {
        this.red = !0, this.fire(), this.render();
        return;
      }
      this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    next() {
      if (!this.placeholder) return this.bell();
      this.value = this.initial, this.cursor = this.rendered.length, this.fire(), this.render();
    }
    moveCursor(e) {
      this.placeholder || (this.cursor = this.cursor + e, this.cursorOffset += e);
    }
    _(e, r) {
      let i = this.value.slice(0, this.cursor), s = this.value.slice(this.cursor);
      this.value = `${i}${e}${s}`, this.red = !1, this.cursor = this.placeholder ? 0 : i.length + 1, this.render();
    }
    delete() {
      if (this.isCursorAtStart()) return this.bell();
      let e = this.value.slice(0, this.cursor - 1), r = this.value.slice(this.cursor);
      this.value = `${e}${r}`, this.red = !1, this.isCursorAtStart() ? this.cursorOffset = 0 : (this.cursorOffset++, this.moveCursor(-1)), this.
      render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
      let e = this.value.slice(0, this.cursor), r = this.value.slice(this.cursor + 1);
      this.value = `${e}${r}`, this.red = !1, this.isCursorAtEnd() ? this.cursorOffset = 0 : this.cursorOffset++, this.render();
    }
    first() {
      this.cursor = 0, this.render();
    }
    last() {
      this.cursor = this.value.length, this.render();
    }
    left() {
      if (this.cursor <= 0 || this.placeholder) return this.bell();
      this.moveCursor(-1), this.render();
    }
    right() {
      if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
      this.moveCursor(1), this.render();
    }
    isCursorAtStart() {
      return this.cursor === 0 || this.placeholder && this.cursor === 1;
    }
    isCursorAtEnd() {
      return this.cursor === this.rendered.length || this.placeholder && this.cursor === this.rendered.length + 1;
    }
    render() {
      this.closed || (this.firstRender || (this.outputError && this.out.write(hr.down(Rv(this.outputError, this.out.columns) - 1) + jo(this.
      outputError, this.out.columns)), this.out.write(jo(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [
        Fo.symbol(this.done, this.aborted),
        bi.bold(this.msg),
        Fo.delimiter(this.done),
        this.red ? bi.red(this.rendered) : this.rendered
      ].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : Tv.pointerSmall} ${bi.red().italic(r)}`, "")), this.out.write(wv.line + hr.to(0) + this.outputText + hr.save + this.outputError +
      hr.restore + hr.move(this.cursorOffset, 0)));
    }
  };
  Tf.exports = Ho;
});

// ../node_modules/prompts/lib/elements/select.js
var Df = f((l0, Cf) => {
  "use strict";
  var Ke = z(), Av = ze(), { style: Pf, clear: Of, figures: Ei, wrap: Pv, entriesToDisplay: Ov } = Re(), { cursor: Cv } = Q(), Bo = class extends Av {
    static {
      n(this, "SelectPrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.hint = e.hint || "- Use arrow-keys. Return to submit.", this.warn = e.warn || "- This option is d\
isabled", this.cursor = e.initial || 0, this.choices = e.choices.map((r, i) => (typeof r == "string" && (r = { title: r, value: i }), {
        title: r && (r.title || r.value || r),
        value: r && (r.value === void 0 ? i : r.value),
        description: r && r.description,
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.optionsPerPage = e.optionsPerPage || 10, this.value = (this.choices[this.cursor] || {}).value, this.clear = Of("", this.out.
      columns), this.render();
    }
    moveCursor(e) {
      this.cursor = e, this.value = this.choices[e].value, this.fire();
    }
    reset() {
      this.moveCursor(0), this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.selection.disabled ? this.bell() : (this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close());
    }
    first() {
      this.moveCursor(0), this.render();
    }
    last() {
      this.moveCursor(this.choices.length - 1), this.render();
    }
    up() {
      this.cursor === 0 ? this.moveCursor(this.choices.length - 1) : this.moveCursor(this.cursor - 1), this.render();
    }
    down() {
      this.cursor === this.choices.length - 1 ? this.moveCursor(0) : this.moveCursor(this.cursor + 1), this.render();
    }
    next() {
      this.moveCursor((this.cursor + 1) % this.choices.length), this.render();
    }
    _(e, r) {
      if (e === " ") return this.submit();
    }
    get selection() {
      return this.choices[this.cursor];
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(Cv.hide) : this.out.write(Of(this.outputText, this.out.columns)), super.render();
      let { startIndex: e, endIndex: r } = Ov(this.cursor, this.choices.length, this.optionsPerPage);
      if (this.outputText = [
        Pf.symbol(this.done, this.aborted),
        Ke.bold(this.msg),
        Pf.delimiter(!1),
        this.done ? this.selection.title : this.selection.disabled ? Ke.yellow(this.warn) : Ke.gray(this.hint)
      ].join(" "), !this.done) {
        this.outputText += `
`;
        for (let i = e; i < r; i++) {
          let s, o, a = "", l = this.choices[i];
          i === e && e > 0 ? o = Ei.arrowUp : i === r - 1 && r < this.choices.length ? o = Ei.arrowDown : o = " ", l.disabled ? (s = this.cursor ===
          i ? Ke.gray().underline(l.title) : Ke.strikethrough().gray(l.title), o = (this.cursor === i ? Ke.bold().gray(Ei.pointer) + " " : "\
  ") + o) : (s = this.cursor === i ? Ke.cyan().underline(l.title) : l.title, o = (this.cursor === i ? Ke.cyan(Ei.pointer) + " " : "  ") + o,
          l.description && this.cursor === i && (a = ` - ${l.description}`, (o.length + s.length + a.length >= this.out.columns || l.description.
          split(/\r?\n/).length > 1) && (a = `
` + Pv(l.description, { margin: 3, width: this.out.columns })))), this.outputText += `${o} ${s}${Ke.gray(a)}
`;
        }
      }
      this.out.write(this.outputText);
    }
  };
  Cf.exports = Bo;
});

// ../node_modules/prompts/lib/elements/toggle.js
var kf = f((u0, Lf) => {
  var Si = z(), Dv = ze(), { style: If, clear: Iv } = Re(), { cursor: Nf, erase: Nv } = Q(), Uo = class extends Dv {
    static {
      n(this, "TogglePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.value = !!e.initial, this.active = e.active || "on", this.inactive = e.inactive || "off", this.initialValue =
      this.value, this.render();
    }
    reset() {
      this.value = this.initialValue, this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    deactivate() {
      if (this.value === !1) return this.bell();
      this.value = !1, this.render();
    }
    activate() {
      if (this.value === !0) return this.bell();
      this.value = !0, this.render();
    }
    delete() {
      this.deactivate();
    }
    left() {
      this.deactivate();
    }
    right() {
      this.activate();
    }
    down() {
      this.deactivate();
    }
    up() {
      this.activate();
    }
    next() {
      this.value = !this.value, this.fire(), this.render();
    }
    _(e, r) {
      if (e === " ")
        this.value = !this.value;
      else if (e === "1")
        this.value = !0;
      else if (e === "0")
        this.value = !1;
      else return this.bell();
      this.render();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Nf.hide) : this.out.write(Iv(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        If.symbol(this.done, this.aborted),
        Si.bold(this.msg),
        If.delimiter(this.done),
        this.value ? this.inactive : Si.cyan().underline(this.inactive),
        Si.gray("/"),
        this.value ? Si.cyan().underline(this.active) : this.active
      ].join(" "), this.out.write(Nv.line + Nf.to(0) + this.outputText));
    }
  };
  Lf.exports = Uo;
});

// ../node_modules/prompts/lib/dateparts/datepart.js
var qe = f((p0, $f) => {
  "use strict";
  var Wo = class t {
    static {
      n(this, "DatePart");
    }
    constructor({ token: e, date: r, parts: i, locales: s }) {
      this.token = e, this.date = r || /* @__PURE__ */ new Date(), this.parts = i || [this], this.locales = s || {};
    }
    up() {
    }
    down() {
    }
    next() {
      let e = this.parts.indexOf(this);
      return this.parts.find((r, i) => i > e && r instanceof t);
    }
    setTo(e) {
    }
    prev() {
      let e = [].concat(this.parts).reverse(), r = e.indexOf(this);
      return e.find((i, s) => s > r && i instanceof t);
    }
    toString() {
      return String(this.date);
    }
  };
  $f.exports = Wo;
});

// ../node_modules/prompts/lib/dateparts/meridiem.js
var qf = f((f0, Mf) => {
  "use strict";
  var Lv = qe(), Go = class extends Lv {
    static {
      n(this, "Meridiem");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setHours((this.date.getHours() + 12) % 24);
    }
    down() {
      this.up();
    }
    toString() {
      let e = this.date.getHours() > 12 ? "pm" : "am";
      return /\A/.test(this.token) ? e.toUpperCase() : e;
    }
  };
  Mf.exports = Go;
});

// ../node_modules/prompts/lib/dateparts/day.js
var jf = f((g0, Ff) => {
  "use strict";
  var kv = qe(), $v = /* @__PURE__ */ n((t) => (t = t % 10, t === 1 ? "st" : t === 2 ? "nd" : t === 3 ? "rd" : "th"), "pos"), Vo = class extends kv {
    static {
      n(this, "Day");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setDate(this.date.getDate() + 1);
    }
    down() {
      this.date.setDate(this.date.getDate() - 1);
    }
    setTo(e) {
      this.date.setDate(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getDate(), r = this.date.getDay();
      return this.token === "DD" ? String(e).padStart(2, "0") : this.token === "Do" ? e + $v(e) : this.token === "d" ? r + 1 : this.token ===
      "ddd" ? this.locales.weekdaysShort[r] : this.token === "dddd" ? this.locales.weekdays[r] : e;
    }
  };
  Ff.exports = Vo;
});

// ../node_modules/prompts/lib/dateparts/hours.js
var Bf = f((x0, Hf) => {
  "use strict";
  var Mv = qe(), Yo = class extends Mv {
    static {
      n(this, "Hours");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setHours(this.date.getHours() + 1);
    }
    down() {
      this.date.setHours(this.date.getHours() - 1);
    }
    setTo(e) {
      this.date.setHours(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getHours();
      return /h/.test(this.token) && (e = e % 12 || 12), this.token.length > 1 ? String(e).padStart(2, "0") : e;
    }
  };
  Hf.exports = Yo;
});

// ../node_modules/prompts/lib/dateparts/milliseconds.js
var Wf = f((b0, Uf) => {
  "use strict";
  var qv = qe(), zo = class extends qv {
    static {
      n(this, "Milliseconds");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setMilliseconds(this.date.getMilliseconds() + 1);
    }
    down() {
      this.date.setMilliseconds(this.date.getMilliseconds() - 1);
    }
    setTo(e) {
      this.date.setMilliseconds(parseInt(e.substr(-this.token.length)));
    }
    toString() {
      return String(this.date.getMilliseconds()).padStart(4, "0").substr(0, this.token.length);
    }
  };
  Uf.exports = zo;
});

// ../node_modules/prompts/lib/dateparts/minutes.js
var Vf = f((S0, Gf) => {
  "use strict";
  var Fv = qe(), Ko = class extends Fv {
    static {
      n(this, "Minutes");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setMinutes(this.date.getMinutes() + 1);
    }
    down() {
      this.date.setMinutes(this.date.getMinutes() - 1);
    }
    setTo(e) {
      this.date.setMinutes(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getMinutes();
      return this.token.length > 1 ? String(e).padStart(2, "0") : e;
    }
  };
  Gf.exports = Ko;
});

// ../node_modules/prompts/lib/dateparts/month.js
var zf = f((w0, Yf) => {
  "use strict";
  var jv = qe(), Qo = class extends jv {
    static {
      n(this, "Month");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setMonth(this.date.getMonth() + 1);
    }
    down() {
      this.date.setMonth(this.date.getMonth() - 1);
    }
    setTo(e) {
      e = parseInt(e.substr(-2)) - 1, this.date.setMonth(e < 0 ? 0 : e);
    }
    toString() {
      let e = this.date.getMonth(), r = this.token.length;
      return r === 2 ? String(e + 1).padStart(2, "0") : r === 3 ? this.locales.monthsShort[e] : r === 4 ? this.locales.months[e] : String(e +
      1);
    }
  };
  Yf.exports = Qo;
});

// ../node_modules/prompts/lib/dateparts/seconds.js
var Qf = f((T0, Kf) => {
  "use strict";
  var Hv = qe(), Xo = class extends Hv {
    static {
      n(this, "Seconds");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setSeconds(this.date.getSeconds() + 1);
    }
    down() {
      this.date.setSeconds(this.date.getSeconds() - 1);
    }
    setTo(e) {
      this.date.setSeconds(parseInt(e.substr(-2)));
    }
    toString() {
      let e = this.date.getSeconds();
      return this.token.length > 1 ? String(e).padStart(2, "0") : e;
    }
  };
  Kf.exports = Xo;
});

// ../node_modules/prompts/lib/dateparts/year.js
var Zf = f((P0, Xf) => {
  "use strict";
  var Bv = qe(), Zo = class extends Bv {
    static {
      n(this, "Year");
    }
    constructor(e = {}) {
      super(e);
    }
    up() {
      this.date.setFullYear(this.date.getFullYear() + 1);
    }
    down() {
      this.date.setFullYear(this.date.getFullYear() - 1);
    }
    setTo(e) {
      this.date.setFullYear(e.substr(-4));
    }
    toString() {
      let e = String(this.date.getFullYear()).padStart(4, "0");
      return this.token.length === 2 ? e.substr(-2) : e;
    }
  };
  Xf.exports = Zo;
});

// ../node_modules/prompts/lib/dateparts/index.js
var em = f((C0, Jf) => {
  "use strict";
  Jf.exports = {
    DatePart: qe(),
    Meridiem: qf(),
    Day: jf(),
    Hours: Bf(),
    Milliseconds: Wf(),
    Minutes: Vf(),
    Month: zf(),
    Seconds: Qf(),
    Year: Zf()
  };
});

// ../node_modules/prompts/lib/elements/date.js
var am = f((D0, om) => {
  "use strict";
  var Jo = z(), Uv = ze(), { style: tm, clear: rm, figures: Wv } = Re(), { erase: Gv, cursor: im } = Q(), { DatePart: sm, Meridiem: Vv, Day: Yv,
  Hours: zv, Milliseconds: Kv, Minutes: Qv, Month: Xv, Seconds: Zv, Year: Jv } = em(), ew = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g,
  nm = {
    1: ({ token: t }) => t.replace(/\\(.)/g, "$1"),
    2: (t) => new Yv(t),
    // Day // TODO
    3: (t) => new Xv(t),
    // Month
    4: (t) => new Jv(t),
    // Year
    5: (t) => new Vv(t),
    // AM/PM // TODO (special)
    6: (t) => new zv(t),
    // Hours
    7: (t) => new Qv(t),
    // Minutes
    8: (t) => new Zv(t),
    // Seconds
    9: (t) => new Kv(t)
    // Fractional seconds
  }, tw = {
    months: "January,February,March,April,May,June,July,August,September,October,November,December".split(","),
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
    weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
    weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",")
  }, ea = class extends Uv {
    static {
      n(this, "DatePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.cursor = 0, this.typed = "", this.locales = Object.assign(tw, e.locales), this._date = e.initial ||
      /* @__PURE__ */ new Date(), this.errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.mask =
      e.mask || "YYYY-MM-DD HH:mm:ss", this.clear = rm("", this.out.columns), this.render();
    }
    get value() {
      return this.date;
    }
    get date() {
      return this._date;
    }
    set date(e) {
      e && this._date.setTime(e.getTime());
    }
    set mask(e) {
      let r;
      for (this.parts = []; r = ew.exec(e); ) {
        let s = r.shift(), o = r.findIndex((a) => a != null);
        this.parts.push(o in nm ? nm[o]({ token: r[o] || s, date: this.date, parts: this.parts, locales: this.locales }) : r[o] || s);
      }
      let i = this.parts.reduce((s, o) => (typeof o == "string" && typeof s[s.length - 1] == "string" ? s[s.length - 1] += o : s.push(o), s),
      []);
      this.parts.splice(0), this.parts.push(...i), this.reset();
    }
    moveCursor(e) {
      this.typed = "", this.cursor = e, this.fire();
    }
    reset() {
      this.moveCursor(this.parts.findIndex((e) => e instanceof sm)), this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    async validate() {
      let e = await this.validator(this.value);
      typeof e == "string" && (this.errorMsg = e, e = !1), this.error = !e;
    }
    async submit() {
      if (await this.validate(), this.error) {
        this.color = "red", this.fire(), this.render();
        return;
      }
      this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    up() {
      this.typed = "", this.parts[this.cursor].up(), this.render();
    }
    down() {
      this.typed = "", this.parts[this.cursor].down(), this.render();
    }
    left() {
      let e = this.parts[this.cursor].prev();
      if (e == null) return this.bell();
      this.moveCursor(this.parts.indexOf(e)), this.render();
    }
    right() {
      let e = this.parts[this.cursor].next();
      if (e == null) return this.bell();
      this.moveCursor(this.parts.indexOf(e)), this.render();
    }
    next() {
      let e = this.parts[this.cursor].next();
      this.moveCursor(e ? this.parts.indexOf(e) : this.parts.findIndex((r) => r instanceof sm)), this.render();
    }
    _(e) {
      /\d/.test(e) && (this.typed += e, this.parts[this.cursor].setTo(this.typed), this.render());
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(im.hide) : this.out.write(rm(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        tm.symbol(this.done, this.aborted),
        Jo.bold(this.msg),
        tm.delimiter(!1),
        this.parts.reduce((e, r, i) => e.concat(i === this.cursor && !this.done ? Jo.cyan().underline(r.toString()) : r), []).join("")
      ].join(" "), this.error && (this.outputText += this.errorMsg.split(`
`).reduce(
        (e, r, i) => e + `
${i ? " " : Wv.pointerSmall} ${Jo.red().italic(r)}`,
        ""
      )), this.out.write(Gv.line + im.to(0) + this.outputText));
    }
  };
  om.exports = ea;
});

// ../node_modules/prompts/lib/elements/number.js
var hm = f((N0, um) => {
  var vi = z(), rw = ze(), { cursor: wi, erase: iw } = Q(), { style: ta, figures: sw, clear: lm, lines: nw } = Re(), ow = /[0-9]/, ra = /* @__PURE__ */ n(
  (t) => t !== void 0, "isDef"), cm = /* @__PURE__ */ n((t, e) => {
    let r = Math.pow(10, e);
    return Math.round(t * r) / r;
  }, "round"), ia = class extends rw {
    static {
      n(this, "NumberPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = ta.render(e.style), this.msg = e.message, this.initial = ra(e.initial) ? e.initial : "", this.float = !!e.float,
      this.round = e.round || 2, this.inc = e.increment || 1, this.min = ra(e.min) ? e.min : -1 / 0, this.max = ra(e.max) ? e.max : 1 / 0, this.
      errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.color = "cyan", this.value = "", this.
      typed = "", this.lastHit = 0, this.render();
    }
    set value(e) {
      !e && e !== 0 ? (this.placeholder = !0, this.rendered = vi.gray(this.transform.render(`${this.initial}`)), this._value = "") : (this.placeholder =
      !1, this.rendered = this.transform.render(`${cm(e, this.round)}`), this._value = cm(e, this.round)), this.fire();
    }
    get value() {
      return this._value;
    }
    parse(e) {
      return this.float ? parseFloat(e) : parseInt(e);
    }
    valid(e) {
      return e === "-" || e === "." && this.float || ow.test(e);
    }
    reset() {
      this.typed = "", this.value = "", this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      let e = this.value;
      this.value = e !== "" ? e : this.initial, this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`\

`), this.close();
    }
    async validate() {
      let e = await this.validator(this.value);
      typeof e == "string" && (this.errorMsg = e, e = !1), this.error = !e;
    }
    async submit() {
      if (await this.validate(), this.error) {
        this.color = "red", this.fire(), this.render();
        return;
      }
      let e = this.value;
      this.value = e !== "" ? e : this.initial, this.done = !0, this.aborted = !1, this.error = !1, this.fire(), this.render(), this.out.write(
      `
`), this.close();
    }
    up() {
      if (this.typed = "", this.value === "" && (this.value = this.min - this.inc), this.value >= this.max) return this.bell();
      this.value += this.inc, this.color = "cyan", this.fire(), this.render();
    }
    down() {
      if (this.typed = "", this.value === "" && (this.value = this.min + this.inc), this.value <= this.min) return this.bell();
      this.value -= this.inc, this.color = "cyan", this.fire(), this.render();
    }
    delete() {
      let e = this.value.toString();
      if (e.length === 0) return this.bell();
      this.value = this.parse(e = e.slice(0, -1)) || "", this.value !== "" && this.value < this.min && (this.value = this.min), this.color =
      "cyan", this.fire(), this.render();
    }
    next() {
      this.value = this.initial, this.fire(), this.render();
    }
    _(e, r) {
      if (!this.valid(e)) return this.bell();
      let i = Date.now();
      if (i - this.lastHit > 1e3 && (this.typed = ""), this.typed += e, this.lastHit = i, this.color = "cyan", e === ".") return this.fire();
      this.value = Math.min(this.parse(this.typed), this.max), this.value > this.max && (this.value = this.max), this.value < this.min && (this.
      value = this.min), this.fire(), this.render();
    }
    render() {
      this.closed || (this.firstRender || (this.outputError && this.out.write(wi.down(nw(this.outputError, this.out.columns) - 1) + lm(this.
      outputError, this.out.columns)), this.out.write(lm(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [
        ta.symbol(this.done, this.aborted),
        vi.bold(this.msg),
        ta.delimiter(this.done),
        !this.done || !this.done && !this.placeholder ? vi[this.color]().underline(this.rendered) : this.rendered
      ].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : sw.pointerSmall} ${vi.red().italic(r)}`, "")), this.out.write(iw.line + wi.to(0) + this.outputText + wi.save + this.outputError +
      wi.restore));
    }
  };
  um.exports = ia;
});

// ../node_modules/prompts/lib/elements/multiselect.js
var na = f((k0, fm) => {
  "use strict";
  var Fe = z(), { cursor: aw } = Q(), lw = ze(), { clear: pm, figures: at, style: dm, wrap: cw, entriesToDisplay: uw } = Re(), sa = class extends lw {
    static {
      n(this, "MultiselectPrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.cursor = e.cursor || 0, this.scrollIndex = e.cursor || 0, this.hint = e.hint || "", this.warn = e.
      warn || "- This option is disabled -", this.minSelected = e.min, this.showMinError = !1, this.maxChoices = e.max, this.instructions = e.
      instructions, this.optionsPerPage = e.optionsPerPage || 10, this.value = e.choices.map((r, i) => (typeof r == "string" && (r = { title: r,
      value: i }), {
        title: r && (r.title || r.value || r),
        description: r && r.description,
        value: r && (r.value === void 0 ? i : r.value),
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.clear = pm("", this.out.columns), e.overrideRender || this.render();
    }
    reset() {
      this.value.map((e) => !e.selected), this.cursor = 0, this.fire(), this.render();
    }
    selected() {
      return this.value.filter((e) => e.selected);
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      let e = this.value.filter((r) => r.selected);
      this.minSelected && e.length < this.minSelected ? (this.showMinError = !0, this.render()) : (this.done = !0, this.aborted = !1, this.fire(),
      this.render(), this.out.write(`
`), this.close());
    }
    first() {
      this.cursor = 0, this.render();
    }
    last() {
      this.cursor = this.value.length - 1, this.render();
    }
    next() {
      this.cursor = (this.cursor + 1) % this.value.length, this.render();
    }
    up() {
      this.cursor === 0 ? this.cursor = this.value.length - 1 : this.cursor--, this.render();
    }
    down() {
      this.cursor === this.value.length - 1 ? this.cursor = 0 : this.cursor++, this.render();
    }
    left() {
      this.value[this.cursor].selected = !1, this.render();
    }
    right() {
      if (this.value.filter((e) => e.selected).length >= this.maxChoices) return this.bell();
      this.value[this.cursor].selected = !0, this.render();
    }
    handleSpaceToggle() {
      let e = this.value[this.cursor];
      if (e.selected)
        e.selected = !1, this.render();
      else {
        if (e.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        e.selected = !0, this.render();
      }
    }
    toggleAll() {
      if (this.maxChoices !== void 0 || this.value[this.cursor].disabled)
        return this.bell();
      let e = !this.value[this.cursor].selected;
      this.value.filter((r) => !r.disabled).forEach((r) => r.selected = e), this.render();
    }
    _(e, r) {
      if (e === " ")
        this.handleSpaceToggle();
      else if (e === "a")
        this.toggleAll();
      else
        return this.bell();
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${at.arrowUp}/${at.arrowDown}: Highlight option
    ${at.arrowLeft}/${at.arrowRight}/[space]: Toggle selection
` + (this.maxChoices === void 0 ? `    a: Toggle all
` : "") + "    enter/return: Complete answer" : "";
    }
    renderOption(e, r, i, s) {
      let o = (r.selected ? Fe.green(at.radioOn) : at.radioOff) + " " + s + " ", a, l;
      return r.disabled ? a = e === i ? Fe.gray().underline(r.title) : Fe.strikethrough().gray(r.title) : (a = e === i ? Fe.cyan().underline(
      r.title) : r.title, e === i && r.description && (l = ` - ${r.description}`, (o.length + a.length + l.length >= this.out.columns || r.description.
      split(/\r?\n/).length > 1) && (l = `
` + cw(r.description, { margin: o.length, width: this.out.columns })))), o + a + Fe.gray(l || "");
    }
    // shared with autocompleteMultiselect
    paginateOptions(e) {
      if (e.length === 0)
        return Fe.red("No matches for this query.");
      let { startIndex: r, endIndex: i } = uw(this.cursor, e.length, this.optionsPerPage), s, o = [];
      for (let a = r; a < i; a++)
        a === r && r > 0 ? s = at.arrowUp : a === i - 1 && i < e.length ? s = at.arrowDown : s = " ", o.push(this.renderOption(this.cursor, e[a],
        a, s));
      return `
` + o.join(`
`);
    }
    // shared with autocomleteMultiselect
    renderOptions(e) {
      return this.done ? "" : this.paginateOptions(e);
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let e = [Fe.gray(this.hint), this.renderInstructions()];
      return this.value[this.cursor].disabled && e.push(Fe.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(aw.hide), super.render();
      let e = [
        dm.symbol(this.done, this.aborted),
        Fe.bold(this.msg),
        dm.delimiter(!1),
        this.renderDoneOrInstructions()
      ].join(" ");
      this.showMinError && (e += Fe.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.value), this.out.write(this.clear + e), this.clear = pm(e, this.out.columns);
    }
  };
  fm.exports = sa;
});

// ../node_modules/prompts/lib/elements/autocomplete.js
var _m = f((M0, xm) => {
  "use strict";
  var pr = z(), hw = ze(), { erase: pw, cursor: mm } = Q(), { style: oa, clear: gm, figures: aa, wrap: dw, entriesToDisplay: fw } = Re(), ym = /* @__PURE__ */ n(
  (t, e) => t[e] && (t[e].value || t[e].title || t[e]), "getVal"), mw = /* @__PURE__ */ n((t, e) => t[e] && (t[e].title || t[e].value || t[e]),
  "getTitle"), gw = /* @__PURE__ */ n((t, e) => {
    let r = t.findIndex((i) => i.value === e || i.title === e);
    return r > -1 ? r : void 0;
  }, "getIndex"), la = class extends hw {
    static {
      n(this, "AutocompletePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.suggest = e.suggest, this.choices = e.choices, this.initial = typeof e.initial == "number" ? e.initial :
      gw(e.choices, e.initial), this.select = this.initial || e.cursor || 0, this.i18n = { noMatches: e.noMatches || "no matches found" }, this.
      fallback = e.fallback || this.initial, this.clearFirst = e.clearFirst || !1, this.suggestions = [], this.input = "", this.limit = e.limit ||
      10, this.cursor = 0, this.transform = oa.render(e.style), this.scale = this.transform.scale, this.render = this.render.bind(this), this.
      complete = this.complete.bind(this), this.clear = gm("", this.out.columns), this.complete(this.render), this.render();
    }
    set fallback(e) {
      this._fb = Number.isSafeInteger(parseInt(e)) ? parseInt(e) : e;
    }
    get fallback() {
      let e;
      return typeof this._fb == "number" ? e = this.choices[this._fb] : typeof this._fb == "string" && (e = { title: this._fb }), e || this.
      _fb || { title: this.i18n.noMatches };
    }
    moveSelect(e) {
      this.select = e, this.suggestions.length > 0 ? this.value = ym(this.suggestions, e) : this.value = this.fallback.value, this.fire();
    }
    async complete(e) {
      let r = this.completing = this.suggest(this.input, this.choices), i = await r;
      if (this.completing !== r) return;
      this.suggestions = i.map((o, a, l) => ({ title: mw(l, a), value: ym(l, a), description: o.description })), this.completing = !1;
      let s = Math.max(i.length - 1, 0);
      this.moveSelect(Math.min(s, this.select)), e && e();
    }
    reset() {
      this.input = "", this.complete(() => {
        this.moveSelect(this.initial !== void 0 ? this.initial : 0), this.render();
      }), this.render();
    }
    exit() {
      this.clearFirst && this.input.length > 0 ? this.reset() : (this.done = this.exited = !0, this.aborted = !1, this.fire(), this.render(),
      this.out.write(`
`), this.close());
    }
    abort() {
      this.done = this.aborted = !0, this.exited = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.done = !0, this.aborted = this.exited = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    _(e, r) {
      let i = this.input.slice(0, this.cursor), s = this.input.slice(this.cursor);
      this.input = `${i}${e}${s}`, this.cursor = i.length + 1, this.complete(this.render), this.render();
    }
    delete() {
      if (this.cursor === 0) return this.bell();
      let e = this.input.slice(0, this.cursor - 1), r = this.input.slice(this.cursor);
      this.input = `${e}${r}`, this.complete(this.render), this.cursor = this.cursor - 1, this.render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length) return this.bell();
      let e = this.input.slice(0, this.cursor), r = this.input.slice(this.cursor + 1);
      this.input = `${e}${r}`, this.complete(this.render), this.render();
    }
    first() {
      this.moveSelect(0), this.render();
    }
    last() {
      this.moveSelect(this.suggestions.length - 1), this.render();
    }
    up() {
      this.select === 0 ? this.moveSelect(this.suggestions.length - 1) : this.moveSelect(this.select - 1), this.render();
    }
    down() {
      this.select === this.suggestions.length - 1 ? this.moveSelect(0) : this.moveSelect(this.select + 1), this.render();
    }
    next() {
      this.select === this.suggestions.length - 1 ? this.moveSelect(0) : this.moveSelect(this.select + 1), this.render();
    }
    nextPage() {
      this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1)), this.render();
    }
    prevPage() {
      this.moveSelect(Math.max(this.select - this.limit, 0)), this.render();
    }
    left() {
      if (this.cursor <= 0) return this.bell();
      this.cursor = this.cursor - 1, this.render();
    }
    right() {
      if (this.cursor * this.scale >= this.rendered.length) return this.bell();
      this.cursor = this.cursor + 1, this.render();
    }
    renderOption(e, r, i, s) {
      let o, a = i ? aa.arrowUp : s ? aa.arrowDown : " ", l = r ? pr.cyan().underline(e.title) : e.title;
      return a = (r ? pr.cyan(aa.pointer) + " " : "  ") + a, e.description && (o = ` - ${e.description}`, (a.length + l.length + o.length >=
      this.out.columns || e.description.split(/\r?\n/).length > 1) && (o = `
` + dw(e.description, { margin: 3, width: this.out.columns }))), a + " " + l + pr.gray(o || "");
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(mm.hide) : this.out.write(gm(this.outputText, this.out.columns)), super.render();
      let { startIndex: e, endIndex: r } = fw(this.select, this.choices.length, this.limit);
      if (this.outputText = [
        oa.symbol(this.done, this.aborted, this.exited),
        pr.bold(this.msg),
        oa.delimiter(this.completing),
        this.done && this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)
      ].join(" "), !this.done) {
        let i = this.suggestions.slice(e, r).map((s, o) => this.renderOption(
          s,
          this.select === o + e,
          o === 0 && e > 0,
          o + e === r - 1 && r < this.choices.length
        )).join(`
`);
        this.outputText += `
` + (i || pr.gray(this.fallback.title));
      }
      this.out.write(pw.line + mm.to(0) + this.outputText);
    }
  };
  xm.exports = la;
});

// ../node_modules/prompts/lib/elements/autocompleteMultiselect.js
var vm = f((F0, Sm) => {
  "use strict";
  var Qe = z(), { cursor: yw } = Q(), xw = na(), { clear: bm, style: Em, figures: qt } = Re(), ca = class extends xw {
    static {
      n(this, "AutocompleteMultiselectPrompt");
    }
    constructor(e = {}) {
      e.overrideRender = !0, super(e), this.inputValue = "", this.clear = bm("", this.out.columns), this.filteredOptions = this.value, this.
      render();
    }
    last() {
      this.cursor = this.filteredOptions.length - 1, this.render();
    }
    next() {
      this.cursor = (this.cursor + 1) % this.filteredOptions.length, this.render();
    }
    up() {
      this.cursor === 0 ? this.cursor = this.filteredOptions.length - 1 : this.cursor--, this.render();
    }
    down() {
      this.cursor === this.filteredOptions.length - 1 ? this.cursor = 0 : this.cursor++, this.render();
    }
    left() {
      this.filteredOptions[this.cursor].selected = !1, this.render();
    }
    right() {
      if (this.value.filter((e) => e.selected).length >= this.maxChoices) return this.bell();
      this.filteredOptions[this.cursor].selected = !0, this.render();
    }
    delete() {
      this.inputValue.length && (this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1), this.updateFilteredOptions());
    }
    updateFilteredOptions() {
      let e = this.filteredOptions[this.cursor];
      this.filteredOptions = this.value.filter((i) => this.inputValue ? !!(typeof i.title == "string" && i.title.toLowerCase().includes(this.
      inputValue.toLowerCase()) || typeof i.value == "string" && i.value.toLowerCase().includes(this.inputValue.toLowerCase())) : !0);
      let r = this.filteredOptions.findIndex((i) => i === e);
      this.cursor = r < 0 ? 0 : r, this.render();
    }
    handleSpaceToggle() {
      let e = this.filteredOptions[this.cursor];
      if (e.selected)
        e.selected = !1, this.render();
      else {
        if (e.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        e.selected = !0, this.render();
      }
    }
    handleInputChange(e) {
      this.inputValue = this.inputValue + e, this.updateFilteredOptions();
    }
    _(e, r) {
      e === " " ? this.handleSpaceToggle() : this.handleInputChange(e);
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${qt.arrowUp}/${qt.arrowDown}: Highlight option
    ${qt.arrowLeft}/${qt.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
` : "";
    }
    renderCurrentInput() {
      return `
Filtered results for: ${this.inputValue ? this.inputValue : Qe.gray("Enter something to filter")}
`;
    }
    renderOption(e, r, i) {
      let s;
      return r.disabled ? s = e === i ? Qe.gray().underline(r.title) : Qe.strikethrough().gray(r.title) : s = e === i ? Qe.cyan().underline(
      r.title) : r.title, (r.selected ? Qe.green(qt.radioOn) : qt.radioOff) + "  " + s;
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let e = [Qe.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
      return this.filteredOptions.length && this.filteredOptions[this.cursor].disabled && e.push(Qe.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(yw.hide), super.render();
      let e = [
        Em.symbol(this.done, this.aborted),
        Qe.bold(this.msg),
        Em.delimiter(!1),
        this.renderDoneOrInstructions()
      ].join(" ");
      this.showMinError && (e += Qe.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.filteredOptions), this.out.write(this.clear + e), this.clear = bm(e, this.out.columns);
    }
  };
  Sm.exports = ca;
});

// ../node_modules/prompts/lib/elements/confirm.js
var Pm = f((H0, Am) => {
  var wm = z(), _w = ze(), { style: Rm, clear: bw } = Re(), { erase: Ew, cursor: Tm } = Q(), ua = class extends _w {
    static {
      n(this, "ConfirmPrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.value = e.initial, this.initialValue = !!e.initial, this.yesMsg = e.yes || "yes", this.yesOption =
      e.yesOption || "(Y/n)", this.noMsg = e.no || "no", this.noOption = e.noOption || "(y/N)", this.render();
    }
    reset() {
      this.value = this.initialValue, this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      this.value = this.value || !1, this.done = !0, this.aborted = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    _(e, r) {
      return e.toLowerCase() === "y" ? (this.value = !0, this.submit()) : e.toLowerCase() === "n" ? (this.value = !1, this.submit()) : this.
      bell();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Tm.hide) : this.out.write(bw(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        Rm.symbol(this.done, this.aborted),
        wm.bold(this.msg),
        Rm.delimiter(this.done),
        this.done ? this.value ? this.yesMsg : this.noMsg : wm.gray(this.initialValue ? this.yesOption : this.noOption)
      ].join(" "), this.out.write(Ew.line + Tm.to(0) + this.outputText));
    }
  };
  Am.exports = ua;
});

// ../node_modules/prompts/lib/elements/index.js
var Cm = f((U0, Om) => {
  "use strict";
  Om.exports = {
    TextPrompt: Af(),
    SelectPrompt: Df(),
    TogglePrompt: kf(),
    DatePrompt: am(),
    NumberPrompt: hm(),
    MultiselectPrompt: na(),
    AutocompletePrompt: _m(),
    AutocompleteMultiselectPrompt: vm(),
    ConfirmPrompt: Pm()
  };
});

// ../node_modules/prompts/lib/prompts.js
var Im = f((Dm) => {
  "use strict";
  var ce = Dm, Sw = Cm(), Ri = /* @__PURE__ */ n((t) => t, "noop");
  function je(t, e, r = {}) {
    return new Promise((i, s) => {
      let o = new Sw[t](e), a = r.onAbort || Ri, l = r.onSubmit || Ri, c = r.onExit || Ri;
      o.on("state", e.onState || Ri), o.on("submit", (u) => i(l(u))), o.on("exit", (u) => i(c(u))), o.on("abort", (u) => s(a(u)));
    });
  }
  n(je, "toPrompt");
  ce.text = (t) => je("TextPrompt", t);
  ce.password = (t) => (t.style = "password", ce.text(t));
  ce.invisible = (t) => (t.style = "invisible", ce.text(t));
  ce.number = (t) => je("NumberPrompt", t);
  ce.date = (t) => je("DatePrompt", t);
  ce.confirm = (t) => je("ConfirmPrompt", t);
  ce.list = (t) => {
    let e = t.separator || ",";
    return je("TextPrompt", t, {
      onSubmit: /* @__PURE__ */ n((r) => r.split(e).map((i) => i.trim()), "onSubmit")
    });
  };
  ce.toggle = (t) => je("TogglePrompt", t);
  ce.select = (t) => je("SelectPrompt", t);
  ce.multiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return je("MultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  ce.autocompleteMultiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return je("AutocompleteMultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  var vw = /* @__PURE__ */ n((t, e) => Promise.resolve(
    e.filter((r) => r.title.slice(0, t.length).toLowerCase() === t.toLowerCase())
  ), "byTitle");
  ce.autocomplete = (t) => (t.suggest = t.suggest || vw, t.choices = [].concat(t.choices || []), je("AutocompletePrompt", t));
});

// ../node_modules/prompts/lib/index.js
var km = f((V0, Lm) => {
  "use strict";
  var ha = Im(), ww = ["suggest", "format", "onState", "validate", "onRender", "type"], Nm = /* @__PURE__ */ n(() => {
  }, "noop");
  async function lt(t = [], { onSubmit: e = Nm, onCancel: r = Nm } = {}) {
    let i = {}, s = lt._override || {};
    t = [].concat(t);
    let o, a, l, c, u, h, m = /* @__PURE__ */ n(async (p, v, g = !1) => {
      if (!(!g && p.validate && p.validate(v) !== !0))
        return p.format ? await p.format(v, i) : v;
    }, "getFormattedAnswer");
    for (a of t)
      if ({ name: c, type: u } = a, typeof u == "function" && (u = await u(o, { ...i }, a), a.type = u), !!u) {
        for (let p in a) {
          if (ww.includes(p)) continue;
          let v = a[p];
          a[p] = typeof v == "function" ? await v(o, { ...i }, h) : v;
        }
        if (h = a, typeof a.message != "string")
          throw new Error("prompt message is required");
        if ({ name: c, type: u } = a, ha[u] === void 0)
          throw new Error(`prompt type (${u}) is not defined`);
        if (s[a.name] !== void 0 && (o = await m(a, s[a.name]), o !== void 0)) {
          i[c] = o;
          continue;
        }
        try {
          o = lt._injected ? Rw(lt._injected, a.initial) : await ha[u](a), i[c] = o = await m(a, o, !0), l = await e(a, o, i);
        } catch {
          l = !await r(a, i);
        }
        if (l) return i;
      }
    return i;
  }
  n(lt, "prompt");
  function Rw(t, e) {
    let r = t.shift();
    if (r instanceof Error)
      throw r;
    return r === void 0 ? e : r;
  }
  n(Rw, "getInjectedAnswer");
  function Tw(t) {
    lt._injected = (lt._injected || []).concat(t);
  }
  n(Tw, "inject");
  function Aw(t) {
    lt._override = Object.assign({}, t);
  }
  n(Aw, "override");
  Lm.exports = Object.assign(lt, { prompt: lt, prompts: ha, inject: Tw, override: Aw });
});

// ../node_modules/prompts/index.js
var Mm = f((z0, $m) => {
  function Pw(t) {
    t = (Array.isArray(t) ? t : t.split(".")).map(Number);
    let e = 0, r = process.versions.node.split(".").map(Number);
    for (; e < t.length; e++) {
      if (r[e] > t[e]) return !1;
      if (t[e] > r[e]) return !0;
    }
    return !1;
  }
  n(Pw, "isNodeLT");
  $m.exports = Pw("8.6.0") ? af() : km();
});

// src/core-server/presets/common-preset.ts
var tR = {};
_t(tR, {
  babel: () => $w,
  core: () => Gw,
  csfIndexer: () => Ym,
  docs: () => Kw,
  env: () => jw,
  experimental_indexers: () => Yw,
  experimental_serverAPI: () => Ww,
  experimental_serverChannel: () => Xw,
  favicon: () => kw,
  features: () => Vw,
  frameworkOptions: () => zw,
  logLevel: () => qw,
  managerEntries: () => eR,
  managerHead: () => Qw,
  previewBody: () => Hw,
  previewHead: () => Fw,
  resolvedReact: () => Zw,
  staticDirs: () => Lw,
  tags: () => Jw,
  title: () => Mw,
  typescript: () => Bw
});
module.exports = xr(tR);
var Pi = require("node:fs"), Um = require("node:fs/promises"), de = require("node:path"), Ae = require("@storybook/core/common"), dr = require("@storybook/core/telemetry"),
Wm = require("@storybook/core/csf-tools"), Gm = require("@storybook/core/node-logger"), Vm = j(ut(), 1);

// ../addons/test/src/constants.ts
var Ci = "storybook/test", Di = `${Ci}/test-provider`, nR = `${Ci}/panel`;
var ya = "writing-tests/test-addon", oR = `${ya}#what-happens-when-there-are-different-test-results-in-multiple-environments`, aR = `${ya}#w\
hat-happens-if-vitest-itself-has-an-error`;
var tg = {
  id: Ci,
  initialState: {
    config: {
      coverage: !1,
      a11y: !1
    },
    watching: !1
  }
}, lR = `UNIVERSAL_STORE:${tg.id}`;

// src/core-events/index.ts
var xa = /* @__PURE__ */ ((w) => (w.CHANNEL_WS_DISCONNECT = "channelWSDisconnect", w.CHANNEL_CREATED = "channelCreated", w.CONFIG_ERROR = "c\
onfigError", w.STORY_INDEX_INVALIDATED = "storyIndexInvalidated", w.STORY_SPECIFIED = "storySpecified", w.SET_CONFIG = "setConfig", w.SET_STORIES =
"setStories", w.SET_INDEX = "setIndex", w.SET_CURRENT_STORY = "setCurrentStory", w.CURRENT_STORY_WAS_SET = "currentStoryWasSet", w.FORCE_RE_RENDER =
"forceReRender", w.FORCE_REMOUNT = "forceRemount", w.PRELOAD_ENTRIES = "preloadStories", w.STORY_PREPARED = "storyPrepared", w.DOCS_PREPARED =
"docsPrepared", w.STORY_CHANGED = "storyChanged", w.STORY_UNCHANGED = "storyUnchanged", w.STORY_RENDERED = "storyRendered", w.STORY_FINISHED =
"storyFinished", w.STORY_MISSING = "storyMissing", w.STORY_ERRORED = "storyErrored", w.STORY_THREW_EXCEPTION = "storyThrewException", w.STORY_RENDER_PHASE_CHANGED =
"storyRenderPhaseChanged", w.PLAY_FUNCTION_THREW_EXCEPTION = "playFunctionThrewException", w.UNHANDLED_ERRORS_WHILE_PLAYING = "unhandledErro\
rsWhilePlaying", w.UPDATE_STORY_ARGS = "updateStoryArgs", w.STORY_ARGS_UPDATED = "storyArgsUpdated", w.RESET_STORY_ARGS = "resetStoryArgs", w.
SET_FILTER = "setFilter", w.SET_GLOBALS = "setGlobals", w.UPDATE_GLOBALS = "updateGlobals", w.GLOBALS_UPDATED = "globalsUpdated", w.REGISTER_SUBSCRIPTION =
"registerSubscription", w.PREVIEW_KEYDOWN = "previewKeydown", w.PREVIEW_BUILDER_PROGRESS = "preview_builder_progress", w.SELECT_STORY = "sel\
ectStory", w.STORIES_COLLAPSE_ALL = "storiesCollapseAll", w.STORIES_EXPAND_ALL = "storiesExpandAll", w.DOCS_RENDERED = "docsRendered", w.SHARED_STATE_CHANGED =
"sharedStateChanged", w.SHARED_STATE_SET = "sharedStateSet", w.NAVIGATE_URL = "navigateUrl", w.UPDATE_QUERY_PARAMS = "updateQueryParams", w.
REQUEST_WHATS_NEW_DATA = "requestWhatsNewData", w.RESULT_WHATS_NEW_DATA = "resultWhatsNewData", w.SET_WHATS_NEW_CACHE = "setWhatsNewCache", w.
TOGGLE_WHATS_NEW_NOTIFICATIONS = "toggleWhatsNewNotifications", w.TELEMETRY_ERROR = "telemetryError", w.FILE_COMPONENT_SEARCH_REQUEST = "fil\
eComponentSearchRequest", w.FILE_COMPONENT_SEARCH_RESPONSE = "fileComponentSearchResponse", w.SAVE_STORY_REQUEST = "saveStoryRequest", w.SAVE_STORY_RESPONSE =
"saveStoryResponse", w.ARGTYPES_INFO_REQUEST = "argtypesInfoRequest", w.ARGTYPES_INFO_RESPONSE = "argtypesInfoResponse", w.CREATE_NEW_STORYFILE_REQUEST =
"createNewStoryfileRequest", w.CREATE_NEW_STORYFILE_RESPONSE = "createNewStoryfileResponse", w.TESTING_MODULE_CRASH_REPORT = "testingModuleC\
rashReport", w.TESTING_MODULE_PROGRESS_REPORT = "testingModuleProgressReport", w.TESTING_MODULE_RUN_REQUEST = "testingModuleRunRequest", w.TESTING_MODULE_RUN_ALL_REQUEST =
"testingModuleRunAllRequest", w.TESTING_MODULE_CANCEL_TEST_RUN_REQUEST = "testingModuleCancelTestRunRequest", w.TESTING_MODULE_CANCEL_TEST_RUN_RESPONSE =
"testingModuleCancelTestRunResponse", w))(xa || {});
var {
  CHANNEL_WS_DISCONNECT: uR,
  CHANNEL_CREATED: hR,
  CONFIG_ERROR: pR,
  CREATE_NEW_STORYFILE_REQUEST: dR,
  CREATE_NEW_STORYFILE_RESPONSE: fR,
  CURRENT_STORY_WAS_SET: mR,
  DOCS_PREPARED: gR,
  DOCS_RENDERED: yR,
  FILE_COMPONENT_SEARCH_REQUEST: xR,
  FILE_COMPONENT_SEARCH_RESPONSE: _R,
  FORCE_RE_RENDER: bR,
  FORCE_REMOUNT: ER,
  GLOBALS_UPDATED: SR,
  NAVIGATE_URL: vR,
  PLAY_FUNCTION_THREW_EXCEPTION: wR,
  UNHANDLED_ERRORS_WHILE_PLAYING: RR,
  PRELOAD_ENTRIES: TR,
  PREVIEW_BUILDER_PROGRESS: AR,
  PREVIEW_KEYDOWN: PR,
  REGISTER_SUBSCRIPTION: OR,
  RESET_STORY_ARGS: CR,
  SELECT_STORY: DR,
  SET_CONFIG: IR,
  SET_CURRENT_STORY: NR,
  SET_FILTER: LR,
  SET_GLOBALS: kR,
  SET_INDEX: $R,
  SET_STORIES: MR,
  SHARED_STATE_CHANGED: qR,
  SHARED_STATE_SET: FR,
  STORIES_COLLAPSE_ALL: jR,
  STORIES_EXPAND_ALL: HR,
  STORY_ARGS_UPDATED: BR,
  STORY_CHANGED: UR,
  STORY_ERRORED: WR,
  STORY_INDEX_INVALIDATED: GR,
  STORY_MISSING: VR,
  STORY_PREPARED: YR,
  STORY_RENDER_PHASE_CHANGED: zR,
  STORY_RENDERED: KR,
  STORY_FINISHED: QR,
  STORY_SPECIFIED: XR,
  STORY_THREW_EXCEPTION: ZR,
  STORY_UNCHANGED: JR,
  UPDATE_GLOBALS: eT,
  UPDATE_QUERY_PARAMS: tT,
  UPDATE_STORY_ARGS: rT,
  REQUEST_WHATS_NEW_DATA: iT,
  RESULT_WHATS_NEW_DATA: sT,
  SET_WHATS_NEW_CACHE: nT,
  TOGGLE_WHATS_NEW_NOTIFICATIONS: oT,
  TELEMETRY_ERROR: aT,
  SAVE_STORY_REQUEST: lT,
  SAVE_STORY_RESPONSE: cT,
  ARGTYPES_INFO_REQUEST: uT,
  ARGTYPES_INFO_RESPONSE: hT,
  TESTING_MODULE_CRASH_REPORT: _a,
  TESTING_MODULE_PROGRESS_REPORT: ba,
  TESTING_MODULE_RUN_REQUEST: pT,
  TESTING_MODULE_RUN_ALL_REQUEST: dT,
  TESTING_MODULE_CANCEL_TEST_RUN_REQUEST: fT,
  TESTING_MODULE_CANCEL_TEST_RUN_RESPONSE: mT
} = xa;

// src/telemetry/sanitize.ts
var Ii = j(require("node:path"), 1);
function Ea(t) {
  return t.replace(/[-[/{}()*+?.\\^$|]/g, "\\$&");
}
n(Ea, "regexpEscape");
function Sa(t = "") {
  return t.replace(/\u001B\[[0-9;]*m/g, "");
}
n(Sa, "removeAnsiEscapeCodes");
function Ni(t, e = Ii.default.sep) {
  if (!t)
    return t;
  let r = process.cwd().split(e);
  for (; r.length > 1; ) {
    let i = r.join(e), s = new RegExp(Ea(i), "gi");
    t = t.replace(s, "$SNIP");
    let o = r.join(e + e), a = new RegExp(Ea(o), "gi");
    t = t.replace(a, "$SNIP"), r.pop();
  }
  return t;
}
n(Ni, "cleanPaths");
function va(t, e = Ii.default.sep) {
  try {
    t = {
      ...JSON.parse(JSON.stringify(t)),
      message: Sa(t.message),
      stack: Sa(t.stack),
      cause: t.cause,
      name: t.name
    };
    let r = Ni(JSON.stringify(t), e);
    return JSON.parse(r);
  } catch (r) {
    return `Sanitization error: ${r?.message}`;
  }
}
n(va, "sanitizeError");

// src/core-server/server-channel/create-new-story-channel.ts
var Va = require("node:fs"), Ya = require("node:fs/promises"), Hi = require("node:path"), za = require("@storybook/core/common"), br = require("@storybook/core/telemetry"),
St = require("@storybook/core/core-events");

// src/core-server/utils/get-new-story-file.ts
var Gt = require("node:fs"), Ua = require("node:fs/promises"), te = require("node:path"), Ce = require("@storybook/core/common"), Wa = require("@storybook/core/csf-tools");

// src/csf-tools/ConfigFile.ts
var wa = require("node:fs/promises"), d = require("@storybook/core/babel"), Ra = j(ut(), 1);
var Li = console, ki = /* @__PURE__ */ n(({
  expectedType: t,
  foundType: e,
  node: r
}) => Ra.dedent`
      CSF Parsing error: Expected '${t}' but found '${e}' instead in '${r?.type}'.
    `, "getCsfParsingErrorMessage"), Ut = /* @__PURE__ */ n((t) => d.types.isIdentifier(t.key) ? t.key.name : d.types.isStringLiteral(t.key) ?
t.key.value : null, "propKey"), _r = /* @__PURE__ */ n((t) => d.types.isTSAsExpression(t) || d.types.isTSSatisfiesExpression(t) ? _r(t.expression) :
t, "unwrap"), Ta = /* @__PURE__ */ n((t, e) => {
  if (t.length === 0)
    return e;
  if (d.types.isObjectExpression(e)) {
    let [r, ...i] = t, s = e.properties.find((o) => Ut(o) === r);
    if (s)
      return Ta(i, s.value);
  }
}, "_getPath"), Aa = /* @__PURE__ */ n((t, e) => {
  if (t.length === 0) {
    if (d.types.isObjectExpression(e))
      return e.properties;
    throw new Error("Expected object expression");
  }
  if (d.types.isObjectExpression(e)) {
    let [r, ...i] = t, s = e.properties.find((o) => Ut(o) === r);
    if (s)
      return i.length === 0 ? e.properties : Aa(i, s.value);
  }
}, "_getPathProperties"), Pa = /* @__PURE__ */ n((t, e) => {
  let r = null, i = null;
  return e.body.find((s) => (d.types.isVariableDeclaration(s) ? i = s.declarations : d.types.isExportNamedDeclaration(s) && d.types.isVariableDeclaration(
  s.declaration) && (i = s.declaration.declarations), i && i.find((o) => d.types.isVariableDeclarator(o) && d.types.isIdentifier(o.id) && o.
  id.name === t ? (r = o, !0) : !1))), r;
}, "_findVarDeclarator"), bt = /* @__PURE__ */ n((t, e) => Pa(t, e)?.init, "_findVarInitialization"), Wt = /* @__PURE__ */ n((t, e) => {
  if (t.length === 0)
    return e;
  let [r, ...i] = t, s = Wt(i, e);
  return d.types.objectExpression([d.types.objectProperty(d.types.identifier(r), s)]);
}, "_makeObjectExpression"), $i = /* @__PURE__ */ n((t, e, r) => {
  let [i, ...s] = t, o = r.properties.find(
    (a) => Ut(a) === i
  );
  o ? d.types.isObjectExpression(o.value) && s.length > 0 ? $i(s, e, o.value) : o.value = Wt(s, e) : r.properties.push(
    d.types.objectProperty(d.types.identifier(i), Wt(s, e))
  );
}, "_updateExportNode"), Mi = class {
  constructor(e, r, i) {
    this._exports = {};
    // FIXME: this is a hack. this is only used in the case where the user is
    // modifying a named export that's a scalar. The _exports map is not suitable
    // for that. But rather than refactor the whole thing, we just use this as a stopgap.
    this._exportDecls = {};
    this.hasDefaultExport = !1;
    this._ast = e, this._code = r, this.fileName = i;
  }
  static {
    n(this, "ConfigFile");
  }
  _parseExportsObject(e) {
    this._exportsObject = e, e.properties.forEach((r) => {
      let i = Ut(r);
      if (i) {
        let s = r.value;
        d.types.isIdentifier(s) && (s = bt(s.name, this._ast.program)), this._exports[i] = s;
      }
    });
  }
  parse() {
    let e = this;
    return (0, d.traverse)(this._ast, {
      ExportDefaultDeclaration: {
        enter({ node: r, parent: i }) {
          e.hasDefaultExport = !0;
          let s = d.types.isIdentifier(r.declaration) && d.types.isProgram(i) ? bt(r.declaration.name, i) : r.declaration;
          s = _r(s), d.types.isCallExpression(s) && d.types.isObjectExpression(s.arguments[0]) && (s = s.arguments[0]), d.types.isObjectExpression(
          s) ? e._parseExportsObject(s) : Li.warn(
            ki({
              expectedType: "ObjectExpression",
              foundType: s?.type,
              node: s || r.declaration
            })
          );
        }
      },
      ExportNamedDeclaration: {
        enter({ node: r, parent: i }) {
          if (d.types.isVariableDeclaration(r.declaration))
            r.declaration.declarations.forEach((s) => {
              if (d.types.isVariableDeclarator(s) && d.types.isIdentifier(s.id)) {
                let { name: o } = s.id, a = s.init;
                d.types.isIdentifier(a) && (a = bt(a.name, i)), e._exports[o] = a, e._exportDecls[o] = s;
              }
            });
          else if (d.types.isFunctionDeclaration(r.declaration)) {
            let s = r.declaration;
            if (d.types.isIdentifier(s.id)) {
              let { name: o } = s.id;
              e._exportDecls[o] = s;
            }
          } else r.specifiers ? r.specifiers.forEach((s) => {
            if (d.types.isExportSpecifier(s) && d.types.isIdentifier(s.local) && d.types.isIdentifier(s.exported)) {
              let { name: o } = s.local, { name: a } = s.exported, l = Pa(o, i);
              l && (e._exports[a] = l.init, e._exportDecls[a] = l);
            }
          }) : Li.warn(
            ki({
              expectedType: "VariableDeclaration",
              foundType: r.declaration?.type,
              node: r.declaration
            })
          );
        }
      },
      ExpressionStatement: {
        enter({ node: r, parent: i }) {
          if (d.types.isAssignmentExpression(r.expression) && r.expression.operator === "=") {
            let { left: s, right: o } = r.expression;
            if (d.types.isMemberExpression(s) && d.types.isIdentifier(s.object) && s.object.name === "module" && d.types.isIdentifier(s.property) &&
            s.property.name === "exports") {
              let a = o;
              d.types.isIdentifier(o) && (a = bt(o.name, i)), a = _r(a), d.types.isObjectExpression(a) ? (e._exportsObject = a, a.properties.
              forEach((l) => {
                let c = Ut(l);
                if (c) {
                  let u = l.value;
                  d.types.isIdentifier(u) && (u = bt(
                    u.name,
                    i
                  )), e._exports[c] = u;
                }
              })) : Li.warn(
                ki({
                  expectedType: "ObjectExpression",
                  foundType: a?.type,
                  node: a
                })
              );
            }
          }
        }
      },
      CallExpression: {
        enter: /* @__PURE__ */ n(({ node: r }) => {
          d.types.isIdentifier(r.callee) && r.callee.name === "definePreview" && r.arguments.length === 1 && d.types.isObjectExpression(r.arguments[0]) &&
          e._parseExportsObject(r.arguments[0]);
        }, "enter")
      }
    }), e;
  }
  getFieldNode(e) {
    let [r, ...i] = e, s = this._exports[r];
    if (s)
      return Ta(i, s);
  }
  getFieldProperties(e) {
    let [r, ...i] = e, s = this._exports[r];
    if (s)
      return Aa(i, s);
  }
  getFieldValue(e) {
    let r = this.getFieldNode(e);
    if (r) {
      let { code: i } = (0, d.generate)(r, {});
      return (0, eval)(`(() => (${i}))()`);
    }
  }
  getSafeFieldValue(e) {
    try {
      return this.getFieldValue(e);
    } catch {
    }
  }
  setFieldNode(e, r) {
    let [i, ...s] = e, o = this._exports[i];
    if (this._exportsObject)
      $i(e, r, this._exportsObject), this._exports[e[0]] = r;
    else if (o && d.types.isObjectExpression(o) && s.length > 0)
      $i(s, r, o);
    else if (o && s.length === 0 && this._exportDecls[e[0]]) {
      let a = this._exportDecls[e[0]];
      d.types.isVariableDeclarator(a) && (a.init = Wt([], r));
    } else {
      if (this.hasDefaultExport)
        throw new Error(
          `Could not set the "${e.join(
            "."
          )}" field as the default export is not an object in this file.`
        );
      {
        let a = Wt(s, r), l = d.types.exportNamedDeclaration(
          d.types.variableDeclaration("const", [d.types.variableDeclarator(d.types.identifier(i), a)])
        );
        this._exports[i] = a, this._ast.program.body.push(l);
      }
    }
  }
  /**
   * @example
   *
   * ```ts
   * // 1. { framework: 'framework-name' }
   * // 2. { framework: { name: 'framework-name', options: {} }
   * getNameFromPath(['framework']); // => 'framework-name'
   * ```
   *
   * @returns The name of a node in a given path, supporting the following formats:
   */
  getNameFromPath(e) {
    let r = this.getFieldNode(e);
    if (r)
      return this._getPresetValue(r, "name");
  }
  /**
   * Returns an array of names of a node in a given path, supporting the following formats:
   *
   * @example
   *
   * ```ts
   * const config = {
   *   addons: ['first-addon', { name: 'second-addon', options: {} }],
   * };
   * // => ['first-addon', 'second-addon']
   * getNamesFromPath(['addons']);
   * ```
   */
  getNamesFromPath(e) {
    let r = this.getFieldNode(e);
    if (!r)
      return;
    let i = [];
    return d.types.isArrayExpression(r) && r.elements.forEach((s) => {
      i.push(this._getPresetValue(s, "name"));
    }), i;
  }
  _getPnpWrappedValue(e) {
    if (d.types.isCallExpression(e)) {
      let r = e.arguments[0];
      if (d.types.isStringLiteral(r))
        return r.value;
    }
  }
  /**
   * Given a node and a fallback property, returns a **non-evaluated** string value of the node.
   *
   * 1. `{ node: 'value' }`
   * 2. `{ node: { fallbackProperty: 'value' } }`
   */
  _getPresetValue(e, r) {
    let i;
    if (d.types.isStringLiteral(e) ? i = e.value : d.types.isObjectExpression(e) ? e.properties.forEach((s) => {
      d.types.isObjectProperty(s) && d.types.isIdentifier(s.key) && s.key.name === r && (d.types.isStringLiteral(s.value) ? i = s.value.value :
      i = this._getPnpWrappedValue(s.value)), d.types.isObjectProperty(s) && d.types.isStringLiteral(s.key) && s.key.value === "name" && d.types.
      isStringLiteral(s.value) && (i = s.value.value);
    }) : d.types.isCallExpression(e) && (i = this._getPnpWrappedValue(e)), !i)
      throw new Error(
        `The given node must be a string literal or an object expression with a "${r}" property that is a string literal.`
      );
    return i;
  }
  removeField(e) {
    let r = /* @__PURE__ */ n((s, o) => {
      let a = s.findIndex(
        (l) => d.types.isIdentifier(l.key) && l.key.name === o || d.types.isStringLiteral(l.key) && l.key.value === o
      );
      a >= 0 && s.splice(a, 1);
    }, "removeProperty");
    if (e.length === 1) {
      let s = !1;
      if (this._ast.program.body.forEach((o) => {
        if (d.types.isExportNamedDeclaration(o) && d.types.isVariableDeclaration(o.declaration)) {
          let a = o.declaration.declarations[0];
          d.types.isIdentifier(a.id) && a.id.name === e[0] && (this._ast.program.body.splice(this._ast.program.body.indexOf(o), 1), s = !0);
        }
        if (d.types.isExportDefaultDeclaration(o)) {
          let a = o.declaration;
          if (d.types.isIdentifier(a) && (a = bt(a.name, this._ast.program)), a = _r(a), d.types.isObjectExpression(a)) {
            let l = a.properties;
            r(l, e[0]), s = !0;
          }
        }
        if (d.types.isExpressionStatement(o) && d.types.isAssignmentExpression(o.expression) && d.types.isMemberExpression(o.expression.left) &&
        d.types.isIdentifier(o.expression.left.object) && o.expression.left.object.name === "module" && d.types.isIdentifier(o.expression.left.
        property) && o.expression.left.property.name === "exports" && d.types.isObjectExpression(o.expression.right)) {
          let a = o.expression.right.properties;
          r(a, e[0]), s = !0;
        }
      }), s)
        return;
    }
    let i = this.getFieldProperties(e);
    if (i) {
      let s = e.at(-1);
      r(i, s);
    }
  }
  appendValueToArray(e, r) {
    let i = this.valueToNode(r);
    i && this.appendNodeToArray(e, i);
  }
  appendNodeToArray(e, r) {
    let i = this.getFieldNode(e);
    if (!i)
      this.setFieldNode(e, d.types.arrayExpression([r]));
    else if (d.types.isArrayExpression(i))
      i.elements.push(r);
    else
      throw new Error(`Expected array at '${e.join(".")}', got '${i.type}'`);
  }
  /**
   * Specialized helper to remove addons or other array entries that can either be strings or
   * objects with a name property.
   */
  removeEntryFromArray(e, r) {
    let i = this.getFieldNode(e);
    if (i)
      if (d.types.isArrayExpression(i)) {
        let s = i.elements.findIndex((o) => d.types.isStringLiteral(o) ? o.value === r : d.types.isObjectExpression(o) ? this._getPresetValue(
        o, "name") === r : this._getPnpWrappedValue(o) === r);
        if (s >= 0)
          i.elements.splice(s, 1);
        else
          throw new Error(`Could not find '${r}' in array at '${e.join(".")}'`);
      } else
        throw new Error(`Expected array at '${e.join(".")}', got '${i.type}'`);
  }
  _inferQuotes() {
    if (!this._quotes) {
      let e = (this._ast.tokens || []).slice(0, 500).reduce(
        (r, i) => (i.type.label === "string" && (r[this._code[i.start]] += 1), r),
        { "'": 0, '"': 0 }
      );
      this._quotes = e["'"] > e['"'] ? "single" : "double";
    }
    return this._quotes;
  }
  valueToNode(e) {
    let r = this._inferQuotes(), i;
    if (r === "single") {
      let { code: s } = (0, d.generate)(d.types.valueToNode(e), { jsescOption: { quotes: r } }), o = (0, d.babelParse)(`const __x = ${s}`);
      (0, d.traverse)(o, {
        VariableDeclaration: {
          enter({ node: a }) {
            a.declarations.length === 1 && d.types.isVariableDeclarator(a.declarations[0]) && d.types.isIdentifier(a.declarations[0].id) && a.
            declarations[0].id.name === "__x" && (i = a.declarations[0].init);
          }
        }
      });
    } else
      i = d.types.valueToNode(e);
    return i;
  }
  setFieldValue(e, r) {
    let i = this.valueToNode(r);
    if (!i)
      throw new Error(`Unexpected value ${JSON.stringify(r)}`);
    this.setFieldNode(e, i);
  }
  getBodyDeclarations() {
    return this._ast.program.body;
  }
  setBodyDeclaration(e) {
    this._ast.program.body.push(e);
  }
  /**
   * Import specifiers for a specific require import
   *
   * @example
   *
   * ```ts
   * // const { foo } = require('bar');
   * setRequireImport(['foo'], 'bar');
   *
   * // const foo = require('bar');
   * setRequireImport('foo', 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to set. If a string is passed in, a default
   *   import will be set. Otherwise, an array of named imports will be set
   * @param fromImport - The module to import from
   */
  setRequireImport(e, r) {
    let i = this._ast.program.body.find(
      (a) => d.types.isVariableDeclaration(a) && a.declarations.length === 1 && d.types.isVariableDeclarator(a.declarations[0]) && d.types.isCallExpression(
      a.declarations[0].init) && d.types.isIdentifier(a.declarations[0].init.callee) && a.declarations[0].init.callee.name === "require" && d.types.
      isStringLiteral(a.declarations[0].init.arguments[0]) && a.declarations[0].init.arguments[0].value === r
    ), s = /* @__PURE__ */ n((a) => d.types.isObjectPattern(i?.declarations[0].id) && i?.declarations[0].id.properties.find(
      (l) => d.types.isObjectProperty(l) && d.types.isIdentifier(l.key) && l.key.name === a
    ), "hasRequireSpecifier"), o = /* @__PURE__ */ n((a, l) => a.declarations.length === 1 && d.types.isVariableDeclarator(a.declarations[0]) &&
    d.types.isIdentifier(a.declarations[0].id) && a.declarations[0].id.name === l, "hasDefaultRequireSpecifier");
    if (typeof e == "string") {
      let a = /* @__PURE__ */ n(() => {
        this._ast.program.body.unshift(
          d.types.variableDeclaration("const", [
            d.types.variableDeclarator(
              d.types.identifier(e),
              d.types.callExpression(d.types.identifier("require"), [d.types.stringLiteral(r)])
            )
          ])
        );
      }, "addDefaultRequireSpecifier");
      i && o(i, e) || a();
    } else i ? e.forEach((a) => {
      s(a) || i.declarations[0].id.properties.push(
        d.types.objectProperty(d.types.identifier(a), d.types.identifier(a), void 0, !0)
      );
    }) : this._ast.program.body.unshift(
      d.types.variableDeclaration("const", [
        d.types.variableDeclarator(
          d.types.objectPattern(
            e.map(
              (a) => d.types.objectProperty(d.types.identifier(a), d.types.identifier(a), void 0, !0)
            )
          ),
          d.types.callExpression(d.types.identifier("require"), [d.types.stringLiteral(r)])
        )
      ])
    );
  }
  /**
   * Set import specifiers for a given import statement.
   *
   * Does not support setting type imports (yet)
   *
   * @example
   *
   * ```ts
   * // import { foo } from 'bar';
   * setImport(['foo'], 'bar');
   *
   * // import foo from 'bar';
   * setImport('foo', 'bar');
   *
   * // import * as foo from 'bar';
   * setImport({ namespace: 'foo' }, 'bar');
   *
   * // import 'bar';
   * setImport(null, 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to set. If a string is passed in, a default
   *   import will be set. Otherwise, an array of named imports will be set
   * @param fromImport - The module to import from
   */
  setImport(e, r) {
    let i = /* @__PURE__ */ n((c) => d.types.importSpecifier(d.types.identifier(c), d.types.identifier(c)), "getNewImportSpecifier"), s = /* @__PURE__ */ n(
    (c, u) => c.specifiers.find(
      (h) => d.types.isImportSpecifier(h) && d.types.isIdentifier(h.imported) && h.imported.name === u
    ), "hasImportSpecifier"), o = /* @__PURE__ */ n((c, u) => c.specifiers.find(
      (h) => d.types.isImportNamespaceSpecifier(h) && d.types.isIdentifier(h.local) && h.local.name === u
    ), "hasNamespaceImportSpecifier"), a = /* @__PURE__ */ n((c, u) => c.specifiers.find(
      (h) => d.types.isImportDefaultSpecifier(h) && d.types.isIdentifier(h.local) && h.local.name === u
    ), "hasDefaultImportSpecifier"), l = this._ast.program.body.find(
      (c) => d.types.isImportDeclaration(c) && c.source.value === r
    );
    e === null ? l || this._ast.program.body.unshift(d.types.importDeclaration([], d.types.stringLiteral(r))) : typeof e == "string" ? l ? a(
    l, e) || l.specifiers.push(
      d.types.importDefaultSpecifier(d.types.identifier(e))
    ) : this._ast.program.body.unshift(
      d.types.importDeclaration(
        [d.types.importDefaultSpecifier(d.types.identifier(e))],
        d.types.stringLiteral(r)
      )
    ) : Array.isArray(e) ? l ? e.forEach((c) => {
      s(l, c) || l.specifiers.push(i(c));
    }) : this._ast.program.body.unshift(
      d.types.importDeclaration(
        e.map(i),
        d.types.stringLiteral(r)
      )
    ) : e.namespace && (l ? o(l, e.namespace) || l.specifiers.push(
      d.types.importNamespaceSpecifier(d.types.identifier(e.namespace))
    ) : this._ast.program.body.unshift(
      d.types.importDeclaration(
        [d.types.importNamespaceSpecifier(d.types.identifier(e.namespace))],
        d.types.stringLiteral(r)
      )
    ));
  }
}, Oa = /* @__PURE__ */ n((t, e) => {
  let r = (0, d.babelParse)(t);
  return new Mi(r, t, e);
}, "loadConfig");

// src/core-server/utils/new-story-templates/csf-factory-template.ts
var Ma = j(ut(), 1);

// src/core-server/utils/get-component-variable-name.ts
var Et = /* @__PURE__ */ n(async (t) => (await Promise.resolve().then(() => ($a(), ka))).default(t.replace(/^[^a-zA-Z_$]*/, ""), { pascalCase: !0 }).
replace(/[^a-zA-Z_$]+/, ""), "getComponentVariableName");

// src/core-server/utils/new-story-templates/csf-factory-template.ts
async function qa(t) {
  let e = t.componentIsDefaultExport ? await Et(t.basenameWithoutExtension) : t.componentExportName, r = t.componentIsDefaultExport ? `impor\
t ${e} from './${t.basenameWithoutExtension}';` : `import { ${e} } from './${t.basenameWithoutExtension}';`;
  return Ma.dedent`
  ${"import preview from '#.storybook/preview';"}
  
  ${r}

  const meta = preview.meta({
    component: ${e},
  });
  
  export const ${t.exportedStoryName} = meta.story({});
  `;
}
n(qa, "getCsfFactoryTemplateForNewStoryFile");

// src/core-server/utils/new-story-templates/javascript.ts
var Fa = j(ut(), 1);
async function ja(t) {
  let e = t.componentIsDefaultExport ? await Et(t.basenameWithoutExtension) : t.componentExportName, r = t.componentIsDefaultExport ? `impor\
t ${e} from './${t.basenameWithoutExtension}';` : `import { ${e} } from './${t.basenameWithoutExtension}';`;
  return Fa.dedent`
  ${r}

  const meta = {
    component: ${e},
  };
  
  export default meta;
  
  export const ${t.exportedStoryName} = {};
  `;
}
n(ja, "getJavaScriptTemplateForNewStoryFile");

// src/core-server/utils/new-story-templates/typescript.ts
var Ha = j(ut(), 1);
async function Ba(t) {
  let e = t.componentIsDefaultExport ? await Et(t.basenameWithoutExtension) : t.componentExportName, r = t.componentIsDefaultExport ? `impor\
t ${e} from './${t.basenameWithoutExtension}'` : `import { ${e} } from './${t.basenameWithoutExtension}'`;
  return Ha.dedent`
  import type { Meta, StoryObj } from '${t.rendererPackage}';

  ${r};

  const meta = {
    component: ${e},
  } satisfies Meta<typeof ${e}>;

  export default meta;

  type Story = StoryObj<typeof meta>;

  export const ${t.exportedStoryName}: Story = {};
  `;
}
n(Ba, "getTypeScriptTemplateForNewStoryFile");

// src/core-server/utils/get-new-story-file.ts
async function Ga({
  componentFilePath: t,
  componentExportName: e,
  componentIsDefaultExport: r,
  componentExportCount: i
}, s) {
  let o = (0, Ce.getProjectRoot)(), a = await (0, Ce.getFrameworkName)(s), l = await (0, Ce.extractProperRendererNameFromFramework)(a), c = Object.
  entries(Ce.rendererPackages).find(
    ([, N]) => N === l
  )?.[0], u = (0, te.basename)(t), h = (0, te.extname)(t), m = u.replace(h, ""), p = (0, te.dirname)(t), { storyFileName: v, isTypescript: g,
  storyFileExtension: b } = Fi(t), R = `${v}.${b}`, T = `${m}.${e}.stories.${b}`, k = "Default", D = !1;
  try {
    let N = (0, Ce.findConfigFile)("preview", s.configDir);
    if (N) {
      let O = await (0, Ua.readFile)(N, "utf-8");
      D = (0, Wa.isCsfFactoryPreview)(Oa(O));
    }
  } catch {
  }
  let H = "";
  return D ? H = await qa({
    basenameWithoutExtension: m,
    componentExportName: e,
    componentIsDefaultExport: r,
    exportedStoryName: k
  }) : H = g && c ? await Ba({
    basenameWithoutExtension: m,
    componentExportName: e,
    componentIsDefaultExport: r,
    rendererPackage: c,
    exportedStoryName: k
  }) : await ja({
    basenameWithoutExtension: m,
    componentExportName: e,
    componentIsDefaultExport: r,
    exportedStoryName: k
  }), { storyFilePath: ji((0, te.join)(o, p), v) && i > 1 ? (0, te.join)(o, p, T) : (0, te.join)(o, p, R), exportedStoryName: k, storyFileContent: H,
  dirname: te.dirname };
}
n(Ga, "getNewStoryFile");
var Fi = /* @__PURE__ */ n((t) => {
  let e = /\.(ts|tsx|mts|cts)$/.test(t), r = (0, te.basename)(t), i = (0, te.extname)(t), s = r.replace(i, ""), o = e ? "tsx" : "jsx";
  return {
    storyFileName: `${s}.stories`,
    storyFileExtension: o,
    isTypescript: e
  };
}, "getStoryMetadata"), ji = /* @__PURE__ */ n((t, e) => (0, Gt.existsSync)((0, te.join)(t, `${e}.ts`)) || (0, Gt.existsSync)((0, te.join)(t,
`${e}.tsx`)) || (0, Gt.existsSync)((0, te.join)(t, `${e}.js`)) || (0, Gt.existsSync)((0, te.join)(t, `${e}.jsx`)), "doesStoryFileExist");

// src/core-server/server-channel/create-new-story-channel.ts
function Ka(t, e, r) {
  return t.on(
    St.CREATE_NEW_STORYFILE_REQUEST,
    async (i) => {
      try {
        let { storyFilePath: s, exportedStoryName: o, storyFileContent: a } = await Ga(
          i.payload,
          e
        ), l = (0, Hi.relative)(process.cwd(), s), { storyId: c, kind: u } = await (0, za.getStoryId)({ storyFilePath: s, exportedStoryName: o },
        e);
        if ((0, Va.existsSync)(s)) {
          t.emit(St.CREATE_NEW_STORYFILE_RESPONSE, {
            success: !1,
            id: i.id,
            payload: {
              type: "STORY_FILE_EXISTS",
              kind: u
            },
            error: `A story file already exists at ${l}`
          }), r.disableTelemetry || (0, br.telemetry)("create-new-story-file", {
            success: !1,
            error: "STORY_FILE_EXISTS"
          });
          return;
        }
        await (0, Ya.writeFile)(s, a, "utf-8"), t.emit(St.CREATE_NEW_STORYFILE_RESPONSE, {
          success: !0,
          id: i.id,
          payload: {
            storyId: c,
            storyFilePath: (0, Hi.relative)(process.cwd(), s),
            exportedStoryName: o
          },
          error: null
        }), r.disableTelemetry || (0, br.telemetry)("create-new-story-file", {
          success: !0
        });
      } catch (s) {
        t.emit(St.CREATE_NEW_STORYFILE_RESPONSE, {
          success: !1,
          id: i.id,
          error: s?.message
        }), r.disableTelemetry || await (0, br.telemetry)("create-new-story-file", {
          success: !1,
          error: s
        });
      }
    }
  ), t;
}
n(Ka, "initCreateNewStoryChannel");

// src/core-server/server-channel/file-search-channel.ts
var Nh = require("node:fs/promises"), It = require("node:path"), Nt = require("@storybook/core/common"), ii = require("@storybook/core/telemetry"),
Jt = require("@storybook/core/core-events");

// src/core-server/utils/parser/generic-parser.ts
var oe = require("@storybook/core/babel");
var Er = class {
  static {
    n(this, "GenericParser");
  }
  /**
   * Parse the content of a file and return the exports
   *
   * @param content The content of the file
   * @returns The exports of the file
   */
  async parse(e) {
    let r = oe.parser.parse(e, {
      allowImportExportEverywhere: !0,
      allowAwaitOutsideFunction: !0,
      allowNewTargetOutsideFunction: !0,
      allowReturnOutsideFunction: !0,
      allowUndeclaredExports: !0,
      plugins: [
        // Language features
        "typescript",
        "jsx",
        // Latest ECMAScript features
        "asyncGenerators",
        "bigInt",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "classStaticBlock",
        "dynamicImport",
        "exportNamespaceFrom",
        "logicalAssignment",
        "moduleStringNames",
        "nullishCoalescingOperator",
        "numericSeparator",
        "objectRestSpread",
        "optionalCatchBinding",
        "optionalChaining",
        "privateIn",
        "regexpUnicodeSets",
        "topLevelAwait",
        // ECMAScript proposals
        "asyncDoExpressions",
        "decimal",
        "decorators",
        "decoratorAutoAccessors",
        "deferredImportEvaluation",
        "destructuringPrivate",
        "doExpressions",
        "explicitResourceManagement",
        "exportDefaultFrom",
        "functionBind",
        "functionSent",
        "importAttributes",
        "importReflection",
        "moduleBlocks",
        "partialApplication",
        "recordAndTuple",
        "sourcePhaseImports",
        "throwExpressions"
      ]
    }), i = [];
    return r.program.body.forEach(/* @__PURE__ */ n(function(o) {
      oe.types.isExportNamedDeclaration(o) ? (oe.types.isFunctionDeclaration(o.declaration) && oe.types.isIdentifier(o.declaration.id) && i.
      push({
        name: o.declaration.id.name,
        default: !1
      }), oe.types.isClassDeclaration(o.declaration) && oe.types.isIdentifier(o.declaration.id) && i.push({
        name: o.declaration.id.name,
        default: !1
      }), o.declaration === null && o.specifiers.length > 0 && o.specifiers.forEach((a) => {
        oe.types.isExportSpecifier(a) && oe.types.isIdentifier(a.exported) && i.push({
          name: a.exported.name,
          default: !1
        });
      }), oe.types.isVariableDeclaration(o.declaration) && o.declaration.declarations.forEach((a) => {
        oe.types.isVariableDeclarator(a) && oe.types.isIdentifier(a.id) && i.push({
          name: a.id.name,
          default: !1
        });
      })) : oe.types.isExportDefaultDeclaration(o) && i.push({
        name: "default",
        default: !0
      });
    }, "traverse")), { exports: i };
  }
};

// src/core-server/utils/parser/index.ts
function Qa(t) {
  return new Er();
}
n(Qa, "getParser");

// src/core-server/utils/search-files.ts
var Jb = ["js", "mjs", "cjs", "jsx", "mts", "ts", "tsx", "cts"], eE = [
  "**/node_modules/**",
  "**/*.spec.*",
  "**/*.test.*",
  "**/*.stories.*",
  "**/storybook-static/**"
];
async function Ih({
  searchQuery: t,
  cwd: e,
  ignoredFiles: r = eE,
  fileExtensions: i = Jb
}) {
  let { globby: s, isDynamicPattern: o } = await Promise.resolve().then(() => (Dh(), Ch)), a = o(t, { cwd: e }), c = /(\.[a-z]+)$/i.test(t),
  u = `{${i.join(",")}}`, h = a ? t : c ? [`**/*${t}*`, `**/*${t}*/**`] : [
    `**/*${t}*.${u}`,
    `**/*${t}*/**/*.${u}`
  ];
  return (await s(h, {
    ignore: r,
    gitignore: !0,
    caseSensitiveMatch: !1,
    cwd: e,
    objectMode: !0
  })).map((p) => p.path).filter((p) => i.some((v) => p.endsWith(`.${v}`)));
}
n(Ih, "searchFiles");

// src/core-server/server-channel/file-search-channel.ts
async function Lh(t, e, r) {
  return t.on(
    Jt.FILE_COMPONENT_SEARCH_REQUEST,
    async (i) => {
      let s = i.id;
      try {
        if (!s)
          return;
        let o = await (0, Nt.getFrameworkName)(e), a = await (0, Nt.extractProperRendererNameFromFramework)(
          o
        ), l = (0, Nt.getProjectRoot)(), u = (await Ih({
          searchQuery: s,
          cwd: l
        })).map(async (h) => {
          let m = Qa(a);
          try {
            let p = await (0, Nh.readFile)((0, It.join)(l, h), "utf-8"), { storyFileName: v } = Fi((0, It.join)(l, h)), g = (0, It.dirname)(
            h), b = ji((0, It.join)(l, g), v), R = await m.parse(p);
            return {
              filepath: h,
              exportedComponents: R.exports,
              storyFileExists: b
            };
          } catch (p) {
            return r.disableTelemetry || (0, ii.telemetry)("create-new-story-file-search", {
              success: !1,
              error: `Could not parse file: ${p}`
            }), {
              filepath: h,
              storyFileExists: !1,
              exportedComponents: null
            };
          }
        });
        r.disableTelemetry || (0, ii.telemetry)("create-new-story-file-search", {
          success: !0,
          payload: {
            fileCount: u.length
          }
        }), t.emit(Jt.FILE_COMPONENT_SEARCH_RESPONSE, {
          success: !0,
          id: s,
          payload: {
            files: await Promise.all(u)
          },
          error: null
        });
      } catch (o) {
        t.emit(Jt.FILE_COMPONENT_SEARCH_RESPONSE, {
          success: !1,
          id: s ?? "",
          error: `An error occurred while searching for components in the project.
${o?.message}`
        }), r.disableTelemetry || (0, ii.telemetry)("create-new-story-file-search", {
          success: !1,
          error: `An error occured while searching for components: ${o}`
        });
      }
    }
  ), t;
}
n(Lh, "initFileSearchChannel");

// src/core-server/utils/constants.ts
var si = require("node:path");
var kh = [
  {
    from: (0, si.join)((0, si.dirname)(require.resolve("@storybook/core/package.json")), "assets", "browser"),
    to: "/sb-common-assets"
  }
];

// src/core-server/utils/save-story/save-story.ts
var qh = require("node:fs/promises"), oi = require("node:path"), Fh = require("@storybook/core/common"), er = require("@storybook/core/csf"),
tr = require("@storybook/core/telemetry"), st = require("@storybook/core/core-events"), ai = require("@storybook/core/csf-tools"), jh = require("@storybook/core/node-logger");

// src/core-server/utils/save-story/duplicate-story-with-new-name.ts
var _e = require("@storybook/core/babel");

// src/core-server/utils/save-story/utils.ts
var xe = class extends Error {
  static {
    n(this, "SaveStoryError");
  }
};

// src/core-server/utils/save-story/duplicate-story-with-new-name.ts
var $h = /* @__PURE__ */ n((t, e, r) => {
  let i = t._storyExports[e], s = _e.types.cloneNode(i);
  if (!s)
    throw new xe("cannot clone Node");
  let o = !1;
  if ((0, _e.traverse)(s, {
    Identifier(l) {
      o || l.node.name === e && (o = !0, l.node.name = r);
    },
    ObjectProperty(l) {
      let c = l.get("key");
      c.isIdentifier() && c.node.name === "args" && l.remove();
    },
    noScope: !0
  }), !(_e.types.isCallExpression(s.init) && _e.types.isMemberExpression(s.init.callee) && _e.types.isIdentifier(s.init.callee.property) && s.
  init.callee.property.name === "story") && (_e.types.isArrowFunctionExpression(s.init) || _e.types.isCallExpression(s.init)))
    throw new xe("Creating a new story based on a CSF2 story is not supported");
  return (0, _e.traverse)(t._ast, {
    Program(l) {
      l.pushContainer(
        "body",
        _e.types.exportNamedDeclaration(_e.types.variableDeclaration("const", [s]))
      );
    }
  }), s;
}, "duplicateStoryWithNewName");

// src/core-server/utils/save-story/update-args-in-csf-file.ts
var q = require("@storybook/core/babel");

// src/core-server/utils/save-story/valueToAST.ts
var be = require("@storybook/core/babel");
function ni(t) {
  if (t === null)
    return be.types.nullLiteral();
  switch (typeof t) {
    case "function":
      return be.parser.parse(t.toString(), {
        allowReturnOutsideFunction: !0,
        allowSuperOutsideMethod: !0
      }).program.body[0]?.expression;
    case "number":
      return be.types.numericLiteral(t);
    case "string":
      return be.types.stringLiteral(t);
    case "boolean":
      return be.types.booleanLiteral(t);
    case "undefined":
      return be.types.identifier("undefined");
    default:
      return Array.isArray(t) ? be.types.arrayExpression(t.map(ni)) : be.types.objectExpression(
        Object.keys(t).filter((r) => typeof t[r] < "u").map((r) => {
          let i = t[r];
          return be.types.objectProperty(be.types.stringLiteral(r), ni(i));
        })
      );
  }
}
n(ni, "valueToAST");

// src/core-server/utils/save-story/update-args-in-csf-file.ts
var Mh = /* @__PURE__ */ n(async (t, e) => {
  let r = !1, i = Object.fromEntries(
    Object.entries(e).map(([o, a]) => [o, ni(a)])
  );
  if (!(q.types.isCallExpression(t) && q.types.isMemberExpression(t.callee) && q.types.isIdentifier(t.callee.property) && t.callee.property.
  name === "story") && (q.types.isArrowFunctionExpression(t) || q.types.isCallExpression(t)))
    throw new xe("Updating a CSF2 story is not supported");
  if (q.types.isObjectExpression(t)) {
    let o = t.properties, a = o.find((l) => {
      if (q.types.isObjectProperty(l)) {
        let c = l.key;
        return q.types.isIdentifier(c) && c.name === "args";
      }
      return !1;
    });
    if (a) {
      if (q.types.isObjectProperty(a)) {
        let l = a.value;
        if (q.types.isObjectExpression(l)) {
          l.properties.forEach((u) => {
            if (q.types.isObjectProperty(u)) {
              let h = u.key;
              q.types.isIdentifier(h) && h.name in i && (u.value = i[h.name], delete i[h.name]);
            }
          });
          let c = Object.entries(i);
          Object.keys(i).length && c.forEach(([u, h]) => {
            l.properties.push(q.types.objectProperty(q.types.identifier(u), h));
          });
        }
      }
    } else
      o.unshift(
        q.types.objectProperty(
          q.types.identifier("args"),
          q.types.objectExpression(
            Object.entries(i).map(([l, c]) => q.types.objectProperty(q.types.identifier(l), c))
          )
        )
      );
    return;
  }
  (0, q.traverse)(t, {
    ObjectExpression(o) {
      if (r)
        return;
      r = !0;
      let l = o.get("properties").find((c) => {
        if (c.isObjectProperty()) {
          let u = c.get("key");
          return u.isIdentifier() && u.node.name === "args";
        }
        return !1;
      });
      if (l) {
        if (l.isObjectProperty()) {
          let c = l.get("value");
          if (c.isObjectExpression()) {
            c.traverse({
              ObjectProperty(h) {
                let m = h.get("key");
                m.isIdentifier() && m.node.name in i && (h.get("value").replaceWith(i[m.node.name]), delete i[m.node.name]);
              },
              noScope: !0
            });
            let u = Object.entries(i);
            Object.keys(i).length && u.forEach(([h, m]) => {
              c.pushContainer("properties", q.types.objectProperty(q.types.identifier(h), m));
            });
          }
        }
      } else
        o.unshiftContainer(
          "properties",
          q.types.objectProperty(
            q.types.identifier("args"),
            q.types.objectExpression(
              Object.entries(i).map(([c, u]) => q.types.objectProperty(q.types.identifier(c), u))
            )
          )
        );
    },
    noScope: !0
  });
}, "updateArgsInCsfFile");

// src/core-server/utils/save-story/save-story.ts
var tE = /* @__PURE__ */ n((t) => JSON.parse(t, (e, r) => r === "__sb_empty_function_arg__" ? () => {
} : r), "parseArgs"), rE = /* @__PURE__ */ n((t, e) => {
  let r = "([\\s\\S])", i = "(\\r\\n|\\r|\\n)", s = i + "};" + i, o = new RegExp(
    // Looks for an export by the given name, considers the first closing brace on its own line
    // to be the end of the story definition.
    `^(?<before>${r}*)(?<story>export const ${e} =${r}+?${s})(?<after>${r}*)$`
  ), { before: a, story: l, after: c } = t.match(o)?.groups || {};
  return l ? a + l.replaceAll(/(\r\n|\r|\n)(\r\n|\r|\n)([ \t]*[a-z0-9_]+): /gi, "$2$3:") + c : t;
}, "removeExtraNewlines");
function Hh(t, e, r) {
  t.on(st.SAVE_STORY_REQUEST, async ({ id: i, payload: s }) => {
    let { csfId: o, importPath: a, args: l, name: c } = s, u, h, m, p, v;
    try {
      m = (0, oi.basename)(a), p = (0, oi.join)(process.cwd(), a);
      let g = await (0, ai.readCsf)(p, {
        makeTitle: /* @__PURE__ */ n((N) => N || "myTitle", "makeTitle")
      }), b = g.parse(), R = Object.entries(b._stories), [T, k] = o.split("--");
      h = c && (0, er.storyNameFromExport)(c), u = h && (0, er.toId)(T, h);
      let [D] = R.find(([N, O]) => O.id.endsWith(`--${k}`)) || [];
      if (!D)
        throw new xe("Source story not found.");
      if (c && g.getStoryExport(c))
        throw new xe("Story already exists.");
      v = (0, er.storyNameFromExport)(D), await Mh(
        c ? $h(b, D, c) : g.getStoryExport(D),
        l ? tE(l) : {}
      );
      let H = await (0, Fh.formatFileContent)(
        p,
        rE((0, ai.printCsf)(g).code, c || D)
      );
      await Promise.all([
        new Promise((N) => {
          t.on(st.STORY_RENDERED, N), setTimeout(() => N(t.off(st.STORY_RENDERED, N)), 3e3);
        }),
        (0, qh.writeFile)(p, H)
      ]), t.emit(st.SAVE_STORY_RESPONSE, {
        id: i,
        success: !0,
        payload: {
          csfId: o,
          newStoryId: u,
          newStoryName: h,
          newStoryExportName: c,
          sourceFileContent: H,
          sourceFileName: m,
          sourceStoryName: v,
          sourceStoryExportName: D
        },
        error: null
      });
      let C = (0, tr.isExampleStoryId)(u ?? o);
      !r.disableTelemetry && !C && await (0, tr.telemetry)("save-story", {
        action: c ? "createStory" : "updateStory",
        success: !0
      });
    } catch (g) {
      t.emit(st.SAVE_STORY_RESPONSE, {
        id: i,
        success: !1,
        error: g instanceof xe ? g.message : "Unknown error"
      }), jh.logger.error(
        `Error writing to ${p}:
${g.stack || g.message || g.toString()}`
      ), !r.disableTelemetry && !(g instanceof xe) && await (0, tr.telemetry)("save-story", {
        action: c ? "createStory" : "updateStory",
        success: !1,
        error: g
      });
    }
  });
}
n(Hh, "initializeSaveStory");

// src/core-server/utils/server-statics.ts
var Xn = require("node:fs"), ve = require("node:path"), EE = require("@storybook/core/common"), SE = require("@storybook/core/node-logger"),
sp = j(Wh(), 1), vE = j(ip(), 1), np = j(ut(), 1);
var op = /* @__PURE__ */ n((t) => {
  let e = t.lastIndexOf(":"), i = ve.win32.isAbsolute(t) && e === 1, s = e !== -1 && !i ? e : t.length, a = (t.substring(s + 1) || "/").split(
  ve.sep).join(ve.posix.sep), l = t.substring(0, s), c = (0, ve.isAbsolute)(l) ? l : `./${l}`, u = (0, ve.resolve)(c), h = a.replace(/^\/?/,
  "./"), m = h.substring(1);
  if (!(0, Xn.existsSync)(u))
    throw new Error(
      np.dedent`
        Failed to load static files, no such directory: ${sp.default.cyan(u)}
        Make sure this directory exists.
      `
    );
  return { staticDir: c, staticPath: u, targetDir: h, targetEndpoint: m };
}, "parseStaticDir");

// src/core-server/utils/whats-new.ts
var Fm = require("node:fs/promises"), Ti = require("@storybook/core/common"), jm = require("@storybook/core/telemetry"), Te = require("@storybook/core/core-events"),
Ai = require("@storybook/core/csf-tools"), fa = require("@storybook/core/node-logger");

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var wE = process.env.NODE_ENV === "production", Zn = "Invariant failed";
function Jn(t, e) {
  if (!t) {
    if (wE)
      throw new Error(Zn);
    var r = typeof e == "function" ? e() : e, i = r ? "".concat(Zn, ": ").concat(r) : Zn;
    throw new Error(i);
  }
}
n(Jn, "invariant");

// src/core-server/withTelemetry.ts
var Ft = require("@storybook/core/common"), jt = require("@storybook/core/telemetry"), Ow = require("@storybook/core/node-logger"), qm = j(Mm(), 1);
var Cw = /* @__PURE__ */ n(async () => {
  if (process.env.CI)
    return;
  let { enableCrashReports: t } = await (0, qm.default)({
    type: "confirm",
    name: "enableCrashReports",
    message: "Would you like to help improve Storybook by sending anonymous crash reports?",
    initial: !0
  });
  return await Ft.cache.set("enableCrashReports", t), t;
}, "promptCrashReports");
async function Dw({
  cliOptions: t,
  presetOptions: e,
  skipPrompt: r
}) {
  if (t.disableTelemetry)
    return "none";
  if (!e)
    return "full";
  let s = await (await (0, Ft.loadAllPresets)(e)).apply("core");
  if (s?.enableCrashReports !== void 0)
    return s.enableCrashReports ? "full" : "error";
  if (s?.disableTelemetry)
    return "none";
  let o = await Ft.cache.get("enableCrashReports") ?? await Ft.cache.get("enableCrashreports");
  if (o !== void 0)
    return o ? "full" : "error";
  if (r)
    return "error";
  let a = await Cw();
  return a !== void 0 ? a ? "full" : "error" : "full";
}
n(Dw, "getErrorLevel");
async function pa(t, e, r) {
  try {
    let i = "error";
    try {
      i = await Dw(r);
    } catch {
    }
    if (i !== "none") {
      let s = await (0, jt.getPrecedingUpgrade)(), o = t, a;
      "message" in o ? a = o.message ? (0, jt.oneWayHash)(o.message) : "EMPTY_MESSAGE" : a = "NO_MESSAGE";
      let { code: l, name: c, category: u } = o;
      await (0, jt.telemetry)(
        "error",
        {
          code: l,
          name: c,
          category: u,
          eventType: e,
          precedingUpgrade: s,
          error: i === "full" ? o : void 0,
          errorHash: a,
          // if we ever end up sending a non-error instance, we'd like to know
          isErrorInstance: o instanceof Error
        },
        {
          immediate: !0,
          configDir: r.cliOptions.configDir || r.presetOptions?.configDir,
          enableCrashReports: i === "full"
        }
      );
    }
  } catch {
  }
}
n(pa, "sendTelemetryError");

// src/core-server/utils/whats-new.ts
var da = "whats-new-cache", Iw = "https://storybook.js.org/whats-new/v1";
function Hm(t, e, r) {
  t.on(Te.SET_WHATS_NEW_CACHE, async (i) => {
    let s = await e.cache.get(da).catch((o) => (fa.logger.verbose(o), {}));
    await e.cache.set(da, { ...s, ...i });
  }), t.on(Te.REQUEST_WHATS_NEW_DATA, async () => {
    try {
      let i = await fetch(Iw).then(async (c) => {
        if (c.ok)
          return c.json();
        throw c;
      }), o = (await (0, Ti.loadMainConfig)({ configDir: e.configDir, noCache: !0 })).core?.disableWhatsNewNotifications === !0, a = await e.
      cache.get(da) ?? {}, l = {
        ...i,
        status: "SUCCESS",
        postIsRead: i.url === a.lastReadPost,
        showNotification: i.url !== a.lastDismissedPost && i.url !== a.lastReadPost,
        disableWhatsNewNotifications: o
      };
      t.emit(Te.RESULT_WHATS_NEW_DATA, { data: l });
    } catch (i) {
      fa.logger.verbose(i instanceof Error ? i.message : String(i)), t.emit(Te.RESULT_WHATS_NEW_DATA, {
        data: { status: "ERROR" }
      });
    }
  }), t.on(
    Te.TOGGLE_WHATS_NEW_NOTIFICATIONS,
    async ({ disableWhatsNewNotifications: i }) => {
      let s = r.disableTelemetry !== !0;
      try {
        let o = (0, Ti.findConfigFile)("main", e.configDir);
        Jn(o, `unable to find Storybook main file in ${e.configDir}`);
        let a = await (0, Ai.readConfig)(o);
        if (!a._exportsObject)
          throw new Error(
            "Unable to parse Storybook main file while trying to read 'core' property"
          );
        a.setFieldValue(["core", "disableWhatsNewNotifications"], i), await (0, Fm.writeFile)(o, (0, Ai.printConfig)(a).code), s && await (0, jm.telemetry)(
        "core-config", { disableWhatsNewNotifications: i });
      } catch (o) {
        Jn(o instanceof Error), s && await pa(o, "core-config", {
          cliOptions: e,
          presetOptions: { ...e, corePresets: [], overridePresets: [] },
          skipPrompt: !0
        });
      }
    }
  ), t.on(Te.TELEMETRY_ERROR, async (i) => {
    r.disableTelemetry !== !0 && await pa(i, "browser", {
      cliOptions: e,
      presetOptions: { ...e, corePresets: [], overridePresets: [] },
      skipPrompt: !0
    });
  });
}
n(Hm, "initializeWhatsNew");

// src/core-server/presets/common-preset.ts
var Nw = /* @__PURE__ */ n((t, e = {}) => Object.entries(e).reduce((r, [i, s]) => r.replace(new RegExp(`%${i}%`, "g"), s), t), "interpolate"),
Bm = (0, de.join)(
  (0, de.dirname)(require.resolve("@storybook/core/package.json")),
  "/assets/browser/favicon.svg"
), Lw = /* @__PURE__ */ n(async (t = []) => [
  ...kh,
  ...t
], "staticDirs"), kw = /* @__PURE__ */ n(async (t, e) => {
  if (t)
    return t;
  let r = await e.presets.apply("staticDirs"), i = r ? r.map((s) => typeof s == "string" ? s : `${s.from}:${s.to}`) : [];
  if (i.length > 0) {
    let o = i.map((a) => {
      let l = [], c = r && !(0, de.isAbsolute)(a) ? (0, Ae.getDirectoryFromWorkingDir)({
        configDir: e.configDir,
        workingDir: process.cwd(),
        directory: a
      }) : a, { staticPath: u, targetEndpoint: h } = op(c);
      if (h === "/") {
        let p = (0, de.join)(u, "favicon.svg");
        (0, Pi.existsSync)(p) && l.push(p);
      }
      if (h === "/") {
        let p = (0, de.join)(u, "favicon.ico");
        (0, Pi.existsSync)(p) && l.push(p);
      }
      return l;
    }).reduce((a, l) => a.concat(l), []);
    return o.length > 1 && Gm.logger.warn(Vm.dedent`
        Looks like multiple favicons were detected. Using the first one.

        ${o.join(", ")}
        `), o[0] || Bm;
  }
  return Bm;
}, "favicon"), $w = /* @__PURE__ */ n(async (t, e) => {
  let { presets: r } = e, i = await r.apply("babelDefault", {}, e) ?? {};
  return {
    ...i,
    // This override makes sure that we will never transpile babel further down then the browsers that storybook supports.
    // This is needed to support the mount property of the context described here:
    // https://storybook.js.org/docs/writing-tests/interaction-testing#run-code-before-each-test
    overrides: [
      ...i?.overrides ?? [],
      {
        include: /\.(story|stories)\.[cm]?[jt]sx?$/,
        presets: [
          [
            "@babel/preset-env",
            {
              bugfixes: !0,
              targets: {
                // This is the same browser supports that we use to bundle our manager and preview code.
                chrome: 100,
                safari: 15,
                firefox: 91
              }
            }
          ]
        ]
      }
    ]
  };
}, "babel"), Mw = /* @__PURE__ */ n((t, e) => t || e.packageJson?.name || !1, "title"), qw = /* @__PURE__ */ n((t, e) => t || e.loglevel || "\
info", "logLevel"), Fw = /* @__PURE__ */ n(async (t, { configDir: e, presets: r }) => {
  let i = await r.apply("env");
  return (0, Ae.getPreviewHeadTemplate)(e, i);
}, "previewHead"), jw = /* @__PURE__ */ n(async () => (0, Ae.loadEnvs)({ production: !0 }).raw, "env"), Hw = /* @__PURE__ */ n(async (t, { configDir: e,
presets: r }) => {
  let i = await r.apply("env");
  return (0, Ae.getPreviewBodyTemplate)(e, i);
}, "previewBody"), Bw = /* @__PURE__ */ n(() => ({
  check: !1,
  // 'react-docgen' faster than `react-docgen-typescript` but produces lower quality results
  reactDocgen: "react-docgen",
  reactDocgenTypescriptOptions: {
    shouldExtractLiteralValuesFromEnum: !0,
    shouldRemoveUndefinedFromOptional: !0,
    propFilter: /* @__PURE__ */ n((t) => t.parent ? !/node_modules/.test(t.parent.fileName) : !0, "propFilter"),
    // NOTE: this default cannot be changed
    savePropValueAsString: !0
  }
}), "typescript"), Uw = /* @__PURE__ */ n((t) => {
  if (t !== void 0) {
    if (t.toUpperCase() === "FALSE")
      return !1;
    if (t.toUpperCase() === "TRUE" || typeof t == "string")
      return !0;
  }
}, "optionalEnvToBoolean"), Ww = /* @__PURE__ */ n((t, e) => {
  let r = Ae.removeAddon;
  return e.disableTelemetry || (r = /* @__PURE__ */ n(async (i, s) => (await (0, dr.telemetry)("remove", { addon: i, source: "api" }), (0, Ae.removeAddon)(
  i, s)), "removeAddon")), { ...t, removeAddon: r };
}, "experimental_serverAPI"), Gw = /* @__PURE__ */ n(async (t, e) => ({
  ...t,
  disableTelemetry: e.disableTelemetry === !0 || e.test === !0,
  enableCrashReports: e.enableCrashReports || Uw(process.env.STORYBOOK_ENABLE_CRASH_REPORTS)
}), "core"), Vw = /* @__PURE__ */ n(async (t) => ({
  ...t,
  argTypeTargetsV7: !0,
  legacyDecoratorFileOrder: !1,
  disallowImplicitActionsInRenderV8: !0
}), "features"), Ym = {
  test: /(stories|story)\.(m?js|ts)x?$/,
  createIndex: /* @__PURE__ */ n(async (t, e) => (await (0, Wm.readCsf)(t, e)).parse().indexInputs, "createIndex")
}, Yw = /* @__PURE__ */ n((t) => [Ym].concat(t || []), "experimental_indexers"), zw = /* @__PURE__ */ n(async (t, e) => {
  let r = await e.presets.apply("framework");
  return typeof r == "string" ? {} : typeof r > "u" ? null : r.options;
}, "frameworkOptions"), Kw = /* @__PURE__ */ n((t, { docs: e }) => t && e !== void 0 ? {
  ...t,
  docsMode: e
} : t, "docs"), Qw = /* @__PURE__ */ n(async (t, e) => {
  let r = (0, de.join)(e.configDir, "manager-head.html");
  if ((0, Pi.existsSync)(r)) {
    let i = (0, Um.readFile)(r, { encoding: "utf8" }), s = e.presets.apply("env");
    return Nw(await i, await s);
  }
  return "";
}, "managerHead"), Xw = /* @__PURE__ */ n(async (t, e) => {
  let r = await e.presets.apply("core");
  return Hm(t, e, r), Hh(t, e, r), Lh(t, e, r), Ka(t, e, r), e.disableTelemetry || (t.on(
    ba,
    async (i) => {
      if (i.providerId === Di)
        return;
      let s = "status" in i ? i.status : void 0, o = "progress" in i ? i.progress : void 0, a = "error" in i ? i.error : void 0;
      (s === "success" || s === "cancelled") && o?.finishedAt && await (0, dr.telemetry)("testing-module-completed-report", {
        provider: i.providerId,
        duration: o?.finishedAt - o?.startedAt,
        numTotalTests: o?.numTotalTests,
        numFailedTests: o?.numFailedTests,
        numPassedTests: o?.numPassedTests,
        status: s
      }), s === "failed" && await (0, dr.telemetry)("testing-module-completed-report", {
        provider: i.providerId,
        status: "failed",
        ...e.enableCrashReports && {
          error: a && va(a)
        }
      });
    }
  ), t.on(_a, async (i) => {
    i.providerId !== Di && await (0, dr.telemetry)("testing-module-crash-report", {
      provider: i.providerId,
      ...e.enableCrashReports && {
        error: Ni(i.error.message)
      }
    });
  })), t;
}, "experimental_serverChannel"), Zw = /* @__PURE__ */ n(async (t) => {
  try {
    return {
      ...t,
      react: (0, de.dirname)(require.resolve("react/package.json")),
      reactDom: (0, de.dirname)(require.resolve("react-dom/package.json"))
    };
  } catch {
    return t;
  }
}, "resolvedReact"), Jw = /* @__PURE__ */ n(async (t) => ({
  ...t,
  "dev-only": { excludeFromDocsStories: !0 },
  "docs-only": { excludeFromSidebar: !0 },
  "test-only": { excludeFromSidebar: !0, excludeFromDocsStories: !0 }
}), "tags"), eR = /* @__PURE__ */ n(async (t, e) => [
  (0, de.join)(
    (0, de.dirname)(require.resolve("@storybook/core/package.json")),
    "dist/core-server/presets/common-manager.js"
  ),
  ...t || []
], "managerEntries");
