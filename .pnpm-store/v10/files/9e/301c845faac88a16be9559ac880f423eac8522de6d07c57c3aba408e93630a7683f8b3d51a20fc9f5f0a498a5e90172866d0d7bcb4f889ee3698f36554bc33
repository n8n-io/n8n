import ESM_COMPAT_Module from "node:module";
import { fileURLToPath as ESM_COMPAT_fileURLToPath } from 'node:url';
import { dirname as ESM_COMPAT_dirname } from 'node:path';
const __filename = ESM_COMPAT_fileURLToPath(import.meta.url);
const __dirname = ESM_COMPAT_dirname(__filename);
const require = ESM_COMPAT_Module.createRequire(import.meta.url);
var Rm = Object.create;
var Ot = Object.defineProperty;
var Tm = Object.getOwnPropertyDescriptor;
var Am = Object.getOwnPropertyNames;
var Pm = Object.getPrototypeOf, Om = Object.prototype.hasOwnProperty;
var n = (t, e) => Ot(t, "name", { value: e, configurable: !0 }), I = /* @__PURE__ */ ((t) => typeof require < "u" ? require : typeof Proxy <
"u" ? new Proxy(t, {
  get: (e, r) => (typeof require < "u" ? require : e)[r]
}) : t)(function(t) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + t + '" is not supported');
});
var he = (t, e) => () => (t && (e = t(t = 0)), e);
var d = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), Ct = (t, e) => {
  for (var r in e)
    Ot(t, r, { get: e[r], enumerable: !0 });
}, Yo = (t, e, r, i) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let s of Am(e))
      !Om.call(t, s) && s !== r && Ot(t, s, { get: () => e[s], enumerable: !(i = Tm(e, s)) || i.enumerable });
  return t;
};
var pe = (t, e, r) => (r = t != null ? Rm(Pm(t)) : {}, Yo(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !t || !t.__esModule ? Ot(r, "default", { value: t, enumerable: !0 }) : r,
  t
)), oi = (t) => Yo(Ot({}, "__esModule", { value: !0 }), t);

// ../node_modules/ts-dedent/dist/index.js
var st = d((Dt) => {
  "use strict";
  Object.defineProperty(Dt, "__esModule", { value: !0 });
  Dt.dedent = void 0;
  function zo(t) {
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
  n(zo, "dedent");
  Dt.dedent = zo;
  Dt.default = zo;
});

// ../node_modules/camelcase/index.js
var ga = {};
Ct(ga, {
  default: () => ma
});
function ma(t, e) {
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
  return t.length === 1 ? fi.test(t) ? "" : e.pascalCase ? i(t) : r(t) : (t !== r(t) && (t = km(t, r, i, e.preserveConsecutiveUppercase)), t =
  t.replace(Nm, ""), t = e.preserveConsecutiveUppercase ? Lm(t, r) : r(t), e.pascalCase && (t = i(t.charAt(0)) + t.slice(1)), $m(t, i));
}
var Dm, Im, ha, fa, fi, Nm, pa, da, km, Lm, $m, ya = he(() => {
  Dm = /[\p{Lu}]/u, Im = /[\p{Ll}]/u, ha = /^[\p{Lu}](?![\p{Lu}])/gu, fa = /([\p{Alpha}\p{N}_]|$)/u, fi = /[_.\- ]+/, Nm = new RegExp("^" + fi.
  source), pa = new RegExp(fi.source + fa.source, "gu"), da = new RegExp("\\d+" + fa.source, "gu"), km = /* @__PURE__ */ n((t, e, r, i) => {
    let s = !1, o = !1, a = !1, l = !1;
    for (let c = 0; c < t.length; c++) {
      let u = t[c];
      l = c > 2 ? t[c - 3] === "-" : !0, s && Dm.test(u) ? (t = t.slice(0, c) + "-" + t.slice(c), s = !1, a = o, o = !0, c++) : o && a && Im.
      test(u) && (!l || i) ? (t = t.slice(0, c - 1) + "-" + t.slice(c - 1), a = o, o = !1, s = !0) : (s = e(u) === u && r(u) !== u, a = o, o =
      r(u) === u && e(u) !== u);
    }
    return t;
  }, "preserveCamelCase"), Lm = /* @__PURE__ */ n((t, e) => (ha.lastIndex = 0, t.replaceAll(ha, (r) => e(r))), "preserveConsecutiveUppercase"),
  $m = /* @__PURE__ */ n((t, e) => (pa.lastIndex = 0, da.lastIndex = 0, t.replaceAll(da, (r, i, s) => ["_", "-"].includes(t.charAt(s + r.length)) ?
  r : e(r)).replaceAll(pa, (r, i) => e(i))), "postProcess");
  n(ma, "camelCase");
});

// ../node_modules/@sindresorhus/merge-streams/index.js
import { on as Km, once as Qm } from "node:events";
import { PassThrough as Xm } from "node:stream";
import { finished as Na } from "node:stream/promises";
function Si(t) {
  if (!Array.isArray(t))
    throw new TypeError(`Expected an array, got \`${typeof t}\`.`);
  for (let s of t)
    bi(s);
  let e = t.some(({ readableObjectMode: s }) => s), r = Zm(t, e), i = new _i({
    objectMode: e,
    writableHighWaterMark: r,
    readableHighWaterMark: r
  });
  for (let s of t)
    i.add(s);
  return t.length === 0 && $a(i), i;
}
var Zm, _i, Jm, eg, tg, bi, rg, ka, ig, sg, ng, La, $a, Ei, Ma, og, or, Da, Ia, qa = he(() => {
  n(Si, "mergeStreams");
  Zm = /* @__PURE__ */ n((t, e) => {
    if (t.length === 0)
      return 16384;
    let r = t.filter(({ readableObjectMode: i }) => i === e).map(({ readableHighWaterMark: i }) => i);
    return Math.max(...r);
  }, "getHighWaterMark"), _i = class extends Xm {
    static {
      n(this, "MergedStream");
    }
    #e = /* @__PURE__ */ new Set([]);
    #r = /* @__PURE__ */ new Set([]);
    #i = /* @__PURE__ */ new Set([]);
    #t;
    add(e) {
      bi(e), !this.#e.has(e) && (this.#e.add(e), this.#t ??= Jm(this, this.#e), rg({
        passThroughStream: this,
        stream: e,
        streams: this.#e,
        ended: this.#r,
        aborted: this.#i,
        onFinished: this.#t
      }), e.pipe(this, { end: !1 }));
    }
    remove(e) {
      return bi(e), this.#e.has(e) ? (e.unpipe(this), !0) : !1;
    }
  }, Jm = /* @__PURE__ */ n(async (t, e) => {
    or(t, Da);
    let r = new AbortController();
    try {
      await Promise.race([
        eg(t, r),
        tg(t, e, r)
      ]);
    } finally {
      r.abort(), or(t, -Da);
    }
  }, "onMergedStreamFinished"), eg = /* @__PURE__ */ n(async (t, { signal: e }) => {
    await Na(t, { signal: e, cleanup: !0 });
  }, "onMergedStreamEnd"), tg = /* @__PURE__ */ n(async (t, e, { signal: r }) => {
    for await (let [i] of Km(t, "unpipe", { signal: r }))
      e.has(i) && i.emit(La);
  }, "onInputStreamsUnpipe"), bi = /* @__PURE__ */ n((t) => {
    if (typeof t?.pipe != "function")
      throw new TypeError(`Expected a readable stream, got: \`${typeof t}\`.`);
  }, "validateStream"), rg = /* @__PURE__ */ n(async ({ passThroughStream: t, stream: e, streams: r, ended: i, aborted: s, onFinished: o }) => {
    or(t, Ia);
    let a = new AbortController();
    try {
      await Promise.race([
        ig(o, e),
        sg({ passThroughStream: t, stream: e, streams: r, ended: i, aborted: s, controller: a }),
        ng({ stream: e, streams: r, ended: i, aborted: s, controller: a })
      ]);
    } finally {
      a.abort(), or(t, -Ia);
    }
    r.size === i.size + s.size && (i.size === 0 && s.size > 0 ? Ei(t) : $a(t));
  }, "endWhenStreamsDone"), ka = /* @__PURE__ */ n((t) => t?.code === "ERR_STREAM_PREMATURE_CLOSE", "isAbortError"), ig = /* @__PURE__ */ n(
  async (t, e) => {
    try {
      await t, Ei(e);
    } catch (r) {
      ka(r) ? Ei(e) : Ma(e, r);
    }
  }, "afterMergedStreamFinished"), sg = /* @__PURE__ */ n(async ({ passThroughStream: t, stream: e, streams: r, ended: i, aborted: s, controller: {
  signal: o } }) => {
    try {
      await Na(e, { signal: o, cleanup: !0, readable: !0, writable: !1 }), r.has(e) && i.add(e);
    } catch (a) {
      if (o.aborted || !r.has(e))
        return;
      ka(a) ? s.add(e) : Ma(t, a);
    }
  }, "onInputStreamEnd"), ng = /* @__PURE__ */ n(async ({ stream: t, streams: e, ended: r, aborted: i, controller: { signal: s } }) => {
    await Qm(t, La, { signal: s }), e.delete(t), r.delete(t), i.delete(t);
  }, "onInputStreamUnpipe"), La = Symbol("unpipe"), $a = /* @__PURE__ */ n((t) => {
    t.writable && t.end();
  }, "endStream"), Ei = /* @__PURE__ */ n((t) => {
    (t.readable || t.writable) && t.destroy();
  }, "abortStream"), Ma = /* @__PURE__ */ n((t, e) => {
    t.destroyed || (t.once("error", og), t.destroy(e));
  }, "errorStream"), og = /* @__PURE__ */ n(() => {
  }, "noop"), or = /* @__PURE__ */ n((t, e) => {
    let r = t.getMaxListeners();
    r !== 0 && r !== Number.POSITIVE_INFINITY && t.setMaxListeners(r + e);
  }, "updateMaxListeners"), Da = 2, Ia = 1;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/array.js
var ja = d((ft) => {
  "use strict";
  Object.defineProperty(ft, "__esModule", { value: !0 });
  ft.splitWhen = ft.flatten = void 0;
  function ag(t) {
    return t.reduce((e, r) => [].concat(e, r), []);
  }
  n(ag, "flatten");
  ft.flatten = ag;
  function lg(t, e) {
    let r = [[]], i = 0;
    for (let s of t)
      e(s) ? (i++, r[i] = []) : r[i].push(s);
    return r;
  }
  n(lg, "splitWhen");
  ft.splitWhen = lg;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/errno.js
var Fa = d((ar) => {
  "use strict";
  Object.defineProperty(ar, "__esModule", { value: !0 });
  ar.isEnoentCodeError = void 0;
  function cg(t) {
    return t.code === "ENOENT";
  }
  n(cg, "isEnoentCodeError");
  ar.isEnoentCodeError = cg;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/fs.js
var Ha = d((lr) => {
  "use strict";
  Object.defineProperty(lr, "__esModule", { value: !0 });
  lr.createDirentFromStats = void 0;
  var vi = class {
    static {
      n(this, "DirentFromStats");
    }
    constructor(e, r) {
      this.name = e, this.isBlockDevice = r.isBlockDevice.bind(r), this.isCharacterDevice = r.isCharacterDevice.bind(r), this.isDirectory = r.
      isDirectory.bind(r), this.isFIFO = r.isFIFO.bind(r), this.isFile = r.isFile.bind(r), this.isSocket = r.isSocket.bind(r), this.isSymbolicLink =
      r.isSymbolicLink.bind(r);
    }
  };
  function ug(t, e) {
    return new vi(t, e);
  }
  n(ug, "createDirentFromStats");
  lr.createDirentFromStats = ug;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/path.js
var Ga = d((Z) => {
  "use strict";
  Object.defineProperty(Z, "__esModule", { value: !0 });
  Z.convertPosixPathToPattern = Z.convertWindowsPathToPattern = Z.convertPathToPattern = Z.escapePosixPath = Z.escapeWindowsPath = Z.escape =
  Z.removeLeadingDotSegment = Z.makeAbsolute = Z.unixify = void 0;
  var hg = I("os"), pg = I("path"), Ba = hg.platform() === "win32", dg = 2, fg = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g,
  mg = /(\\?)([()[\]{}]|^!|[!+@](?=\())/g, gg = /^\\\\([.?])/, yg = /\\(?![!()+@[\]{}])/g;
  function xg(t) {
    return t.replace(/\\/g, "/");
  }
  n(xg, "unixify");
  Z.unixify = xg;
  function _g(t, e) {
    return pg.resolve(t, e);
  }
  n(_g, "makeAbsolute");
  Z.makeAbsolute = _g;
  function bg(t) {
    if (t.charAt(0) === ".") {
      let e = t.charAt(1);
      if (e === "/" || e === "\\")
        return t.slice(dg);
    }
    return t;
  }
  n(bg, "removeLeadingDotSegment");
  Z.removeLeadingDotSegment = bg;
  Z.escape = Ba ? wi : Ri;
  function wi(t) {
    return t.replace(mg, "\\$2");
  }
  n(wi, "escapeWindowsPath");
  Z.escapeWindowsPath = wi;
  function Ri(t) {
    return t.replace(fg, "\\$2");
  }
  n(Ri, "escapePosixPath");
  Z.escapePosixPath = Ri;
  Z.convertPathToPattern = Ba ? Ua : Wa;
  function Ua(t) {
    return wi(t).replace(gg, "//$1").replace(yg, "/");
  }
  n(Ua, "convertWindowsPathToPattern");
  Z.convertWindowsPathToPattern = Ua;
  function Wa(t) {
    return Ri(t);
  }
  n(Wa, "convertPosixPathToPattern");
  Z.convertPosixPathToPattern = Wa;
});

// ../node_modules/is-extglob/index.js
var Ya = d((iP, Va) => {
  Va.exports = /* @__PURE__ */ n(function(e) {
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
var Qa = d((nP, Ka) => {
  var Eg = Ya(), za = { "{": "}", "(": ")", "[": "]" }, Sg = /* @__PURE__ */ n(function(t) {
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
        var c = za[l];
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
  }, "strictCheck"), vg = /* @__PURE__ */ n(function(t) {
    if (t[0] === "!")
      return !0;
    for (var e = 0; e < t.length; ) {
      if (/[*?{}()[\]]/.test(t[e]))
        return !0;
      if (t[e] === "\\") {
        var r = t[e + 1];
        e += 2;
        var i = za[r];
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
  Ka.exports = /* @__PURE__ */ n(function(e, r) {
    if (typeof e != "string" || e === "")
      return !1;
    if (Eg(e))
      return !0;
    var i = Sg;
    return r && r.strict === !1 && (i = vg), i(e);
  }, "isGlob");
});

// ../node_modules/glob-parent/index.js
var Za = d((aP, Xa) => {
  "use strict";
  var wg = Qa(), Rg = I("path").posix.dirname, Tg = I("os").platform() === "win32", Ti = "/", Ag = /\\/g, Pg = /[\{\[].*[\}\]]$/, Og = /(^|[^\\])([\{\[]|\([^\)]+$)/,
  Cg = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
  Xa.exports = /* @__PURE__ */ n(function(e, r) {
    var i = Object.assign({ flipBackslashes: !0 }, r);
    i.flipBackslashes && Tg && e.indexOf(Ti) < 0 && (e = e.replace(Ag, Ti)), Pg.test(e) && (e += Ti), e += "a";
    do
      e = Rg(e);
    while (wg(e) || Og.test(e));
    return e.replace(Cg, "$1");
  }, "globParent");
});

// ../node_modules/braces/lib/utils.js
var cr = d((de) => {
  "use strict";
  de.isInteger = (t) => typeof t == "number" ? Number.isInteger(t) : typeof t == "string" && t.trim() !== "" ? Number.isInteger(Number(t)) :
  !1;
  de.find = (t, e) => t.nodes.find((r) => r.type === e);
  de.exceedsLimit = (t, e, r = 1, i) => i === !1 || !de.isInteger(t) || !de.isInteger(e) ? !1 : (Number(e) - Number(t)) / Number(r) >= i;
  de.escapeNode = (t, e = 0, r) => {
    let i = t.nodes[e];
    i && (r && i.type === r || i.type === "open" || i.type === "close") && i.escaped !== !0 && (i.value = "\\" + i.value, i.escaped = !0);
  };
  de.encloseBrace = (t) => t.type !== "brace" ? !1 : t.commas >> 0 + t.ranges >> 0 === 0 ? (t.invalid = !0, !0) : !1;
  de.isInvalidBrace = (t) => t.type !== "brace" ? !1 : t.invalid === !0 || t.dollar ? !0 : t.commas >> 0 + t.ranges >> 0 === 0 || t.open !==
  !0 || t.close !== !0 ? (t.invalid = !0, !0) : !1;
  de.isOpenOrClose = (t) => t.type === "open" || t.type === "close" ? !0 : t.open === !0 || t.close === !0;
  de.reduce = (t) => t.reduce((e, r) => (r.type === "text" && e.push(r.value), r.type === "range" && (r.type = "text"), e), []);
  de.flatten = (...t) => {
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
var ur = d((hP, el) => {
  "use strict";
  var Ja = cr();
  el.exports = (t, e = {}) => {
    let r = /* @__PURE__ */ n((i, s = {}) => {
      let o = e.escapeInvalid && Ja.isInvalidBrace(s), a = i.invalid === !0 && e.escapeInvalid === !0, l = "";
      if (i.value)
        return (o || a) && Ja.isOpenOrClose(i) ? "\\" + i.value : i.value;
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
var rl = d((dP, tl) => {
  "use strict";
  tl.exports = function(t) {
    return typeof t == "number" ? t - t === 0 : typeof t == "string" && t.trim() !== "" ? Number.isFinite ? Number.isFinite(+t) : isFinite(+t) :
    !1;
  };
});

// ../node_modules/to-regex-range/index.js
var hl = d((fP, ul) => {
  "use strict";
  var il = rl(), ot = /* @__PURE__ */ n((t, e, r) => {
    if (il(t) === !1)
      throw new TypeError("toRegexRange: expected the first argument to be a number");
    if (e === void 0 || t === e)
      return String(t);
    if (il(e) === !1)
      throw new TypeError("toRegexRange: expected the second argument to be a number.");
    let i = { relaxZeros: !0, ...r };
    typeof i.strictZeros == "boolean" && (i.relaxZeros = i.strictZeros === !1);
    let s = String(i.relaxZeros), o = String(i.shorthand), a = String(i.capture), l = String(i.wrap), c = t + ":" + e + "=" + s + o + a + l;
    if (ot.cache.hasOwnProperty(c))
      return ot.cache[c].result;
    let u = Math.min(t, e), h = Math.max(t, e);
    if (Math.abs(u - h) === 1) {
      let b = t + "|" + e;
      return i.capture ? `(${b})` : i.wrap === !1 ? b : `(?:${b})`;
    }
    let m = cl(t) || cl(e), p = { min: t, max: e, a: u, b: h }, v = [], g = [];
    if (m && (p.isPadded = m, p.maxLen = String(p.max).length), u < 0) {
      let b = h < 0 ? Math.abs(h) : 1;
      g = sl(b, Math.abs(u), p, i), u = p.a = 0;
    }
    return h >= 0 && (v = sl(u, h, p, i)), p.negatives = g, p.positives = v, p.result = Dg(g, v, i), i.capture === !0 ? p.result = `(${p.result}\
)` : i.wrap !== !1 && v.length + g.length > 1 && (p.result = `(?:${p.result})`), ot.cache[c] = p, p.result;
  }, "toRegexRange");
  function Dg(t, e, r) {
    let i = Ai(t, e, "-", !1, r) || [], s = Ai(e, t, "", !1, r) || [], o = Ai(t, e, "-?", !0, r) || [];
    return i.concat(o).concat(s).join("|");
  }
  n(Dg, "collatePatterns");
  function Ig(t, e) {
    let r = 1, i = 1, s = ol(t, r), o = /* @__PURE__ */ new Set([e]);
    for (; t <= s && s <= e; )
      o.add(s), r += 1, s = ol(t, r);
    for (s = al(e + 1, i) - 1; t < s && s <= e; )
      o.add(s), i += 1, s = al(e + 1, i) - 1;
    return o = [...o], o.sort(Lg), o;
  }
  n(Ig, "splitToRanges");
  function Ng(t, e, r) {
    if (t === e)
      return { pattern: t, count: [], digits: 0 };
    let i = kg(t, e), s = i.length, o = "", a = 0;
    for (let l = 0; l < s; l++) {
      let [c, u] = i[l];
      c === u ? o += c : c !== "0" || u !== "9" ? o += $g(c, u, r) : a++;
    }
    return a && (o += r.shorthand === !0 ? "\\d" : "[0-9]"), { pattern: o, count: [a], digits: s };
  }
  n(Ng, "rangeToPattern");
  function sl(t, e, r, i) {
    let s = Ig(t, e), o = [], a = t, l;
    for (let c = 0; c < s.length; c++) {
      let u = s[c], h = Ng(String(a), String(u), i), m = "";
      if (!r.isPadded && l && l.pattern === h.pattern) {
        l.count.length > 1 && l.count.pop(), l.count.push(h.count[0]), l.string = l.pattern + ll(l.count), a = u + 1;
        continue;
      }
      r.isPadded && (m = Mg(u, r, i)), h.string = m + h.pattern + ll(h.count), o.push(h), a = u + 1, l = h;
    }
    return o;
  }
  n(sl, "splitToPatterns");
  function Ai(t, e, r, i, s) {
    let o = [];
    for (let a of t) {
      let { string: l } = a;
      !i && !nl(e, "string", l) && o.push(r + l), i && nl(e, "string", l) && o.push(r + l);
    }
    return o;
  }
  n(Ai, "filterPatterns");
  function kg(t, e) {
    let r = [];
    for (let i = 0; i < t.length; i++) r.push([t[i], e[i]]);
    return r;
  }
  n(kg, "zip");
  function Lg(t, e) {
    return t > e ? 1 : e > t ? -1 : 0;
  }
  n(Lg, "compare");
  function nl(t, e, r) {
    return t.some((i) => i[e] === r);
  }
  n(nl, "contains");
  function ol(t, e) {
    return Number(String(t).slice(0, -e) + "9".repeat(e));
  }
  n(ol, "countNines");
  function al(t, e) {
    return t - t % Math.pow(10, e);
  }
  n(al, "countZeros");
  function ll(t) {
    let [e = 0, r = ""] = t;
    return r || e > 1 ? `{${e + (r ? "," + r : "")}}` : "";
  }
  n(ll, "toQuantifier");
  function $g(t, e, r) {
    return `[${t}${e - t === 1 ? "" : "-"}${e}]`;
  }
  n($g, "toCharacterClass");
  function cl(t) {
    return /^-?(0+)\d/.test(t);
  }
  n(cl, "hasPadding");
  function Mg(t, e, r) {
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
  n(Mg, "padZeros");
  ot.cache = {};
  ot.clearCache = () => ot.cache = {};
  ul.exports = ot;
});

// ../node_modules/fill-range/index.js
var Ci = d((gP, xl) => {
  "use strict";
  var qg = I("util"), dl = hl(), pl = /* @__PURE__ */ n((t) => t !== null && typeof t == "object" && !Array.isArray(t), "isObject"), jg = /* @__PURE__ */ n(
  (t) => (e) => t === !0 ? Number(e) : String(e), "transform"), Pi = /* @__PURE__ */ n((t) => typeof t == "number" || typeof t == "string" &&
  t !== "", "isValidValue"), kt = /* @__PURE__ */ n((t) => Number.isInteger(+t), "isNumber"), Oi = /* @__PURE__ */ n((t) => {
    let e = `${t}`, r = -1;
    if (e[0] === "-" && (e = e.slice(1)), e === "0") return !1;
    for (; e[++r] === "0"; ) ;
    return r > 0;
  }, "zeros"), Fg = /* @__PURE__ */ n((t, e, r) => typeof t == "string" || typeof e == "string" ? !0 : r.stringify === !0, "stringify"), Hg = /* @__PURE__ */ n(
  (t, e, r) => {
    if (e > 0) {
      let i = t[0] === "-" ? "-" : "";
      i && (t = t.slice(1)), t = i + t.padStart(i ? e - 1 : e, "0");
    }
    return r === !1 ? String(t) : t;
  }, "pad"), pr = /* @__PURE__ */ n((t, e) => {
    let r = t[0] === "-" ? "-" : "";
    for (r && (t = t.slice(1), e--); t.length < e; ) t = "0" + t;
    return r ? "-" + t : t;
  }, "toMaxLen"), Bg = /* @__PURE__ */ n((t, e, r) => {
    t.negatives.sort((l, c) => l < c ? -1 : l > c ? 1 : 0), t.positives.sort((l, c) => l < c ? -1 : l > c ? 1 : 0);
    let i = e.capture ? "" : "?:", s = "", o = "", a;
    return t.positives.length && (s = t.positives.map((l) => pr(String(l), r)).join("|")), t.negatives.length && (o = `-(${i}${t.negatives.map(
    (l) => pr(String(l), r)).join("|")})`), s && o ? a = `${s}|${o}` : a = s || o, e.wrap ? `(${i}${a})` : a;
  }, "toSequence"), fl = /* @__PURE__ */ n((t, e, r, i) => {
    if (r)
      return dl(t, e, { wrap: !1, ...i });
    let s = String.fromCharCode(t);
    if (t === e) return s;
    let o = String.fromCharCode(e);
    return `[${s}-${o}]`;
  }, "toRange"), ml = /* @__PURE__ */ n((t, e, r) => {
    if (Array.isArray(t)) {
      let i = r.wrap === !0, s = r.capture ? "" : "?:";
      return i ? `(${s}${t.join("|")})` : t.join("|");
    }
    return dl(t, e, r);
  }, "toRegex"), gl = /* @__PURE__ */ n((...t) => new RangeError("Invalid range arguments: " + qg.inspect(...t)), "rangeError"), yl = /* @__PURE__ */ n(
  (t, e, r) => {
    if (r.strictRanges === !0) throw gl([t, e]);
    return [];
  }, "invalidRange"), Ug = /* @__PURE__ */ n((t, e) => {
    if (e.strictRanges === !0)
      throw new TypeError(`Expected step "${t}" to be a number`);
    return [];
  }, "invalidStep"), Wg = /* @__PURE__ */ n((t, e, r = 1, i = {}) => {
    let s = Number(t), o = Number(e);
    if (!Number.isInteger(s) || !Number.isInteger(o)) {
      if (i.strictRanges === !0) throw gl([t, e]);
      return [];
    }
    s === 0 && (s = 0), o === 0 && (o = 0);
    let a = s > o, l = String(t), c = String(e), u = String(r);
    r = Math.max(Math.abs(r), 1);
    let h = Oi(l) || Oi(c) || Oi(u), m = h ? Math.max(l.length, c.length, u.length) : 0, p = h === !1 && Fg(t, e, i) === !1, v = i.transform ||
    jg(p);
    if (i.toRegex && r === 1)
      return fl(pr(t, m), pr(e, m), !0, i);
    let g = { negatives: [], positives: [] }, b = /* @__PURE__ */ n(($) => g[$ < 0 ? "negatives" : "positives"].push(Math.abs($)), "push"), R = [],
    T = 0;
    for (; a ? s >= o : s <= o; )
      i.toRegex === !0 && r > 1 ? b(s) : R.push(Hg(v(s, T), m, p)), s = a ? s - r : s + r, T++;
    return i.toRegex === !0 ? r > 1 ? Bg(g, i, m) : ml(R, null, { wrap: !1, ...i }) : R;
  }, "fillNumbers"), Gg = /* @__PURE__ */ n((t, e, r = 1, i = {}) => {
    if (!kt(t) && t.length > 1 || !kt(e) && e.length > 1)
      return yl(t, e, i);
    let s = i.transform || ((p) => String.fromCharCode(p)), o = `${t}`.charCodeAt(0), a = `${e}`.charCodeAt(0), l = o > a, c = Math.min(o, a),
    u = Math.max(o, a);
    if (i.toRegex && r === 1)
      return fl(c, u, !1, i);
    let h = [], m = 0;
    for (; l ? o >= a : o <= a; )
      h.push(s(o, m)), o = l ? o - r : o + r, m++;
    return i.toRegex === !0 ? ml(h, null, { wrap: !1, options: i }) : h;
  }, "fillLetters"), hr = /* @__PURE__ */ n((t, e, r, i = {}) => {
    if (e == null && Pi(t))
      return [t];
    if (!Pi(t) || !Pi(e))
      return yl(t, e, i);
    if (typeof r == "function")
      return hr(t, e, 1, { transform: r });
    if (pl(r))
      return hr(t, e, 0, r);
    let s = { ...i };
    return s.capture === !0 && (s.wrap = !0), r = r || s.step || 1, kt(r) ? kt(t) && kt(e) ? Wg(t, e, r, s) : Gg(t, e, Math.max(Math.abs(r),
    1), s) : r != null && !pl(r) ? Ug(r, s) : hr(t, e, 1, r);
  }, "fill");
  xl.exports = hr;
});

// ../node_modules/braces/lib/compile.js
var El = d((xP, bl) => {
  "use strict";
  var Vg = Ci(), _l = cr(), Yg = /* @__PURE__ */ n((t, e = {}) => {
    let r = /* @__PURE__ */ n((i, s = {}) => {
      let o = _l.isInvalidBrace(s), a = i.invalid === !0 && e.escapeInvalid === !0, l = o === !0 || a === !0, c = e.escapeInvalid === !0 ? "\
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
        let h = _l.reduce(i.nodes), m = Vg(...h, { ...e, wrap: !1, toRegex: !0, strictZeros: !0 });
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
  bl.exports = Yg;
});

// ../node_modules/braces/lib/expand.js
var wl = d((bP, vl) => {
  "use strict";
  var zg = Ci(), Sl = ur(), mt = cr(), at = /* @__PURE__ */ n((t = "", e = "", r = !1) => {
    let i = [];
    if (t = [].concat(t), e = [].concat(e), !e.length) return t;
    if (!t.length)
      return r ? mt.flatten(e).map((s) => `{${s}}`) : e;
    for (let s of t)
      if (Array.isArray(s))
        for (let o of s)
          i.push(at(o, e, r));
      else
        for (let o of e)
          r === !0 && typeof o == "string" && (o = `{${o}}`), i.push(Array.isArray(o) ? at(s, o, r) : s + o);
    return mt.flatten(i);
  }, "append"), Kg = /* @__PURE__ */ n((t, e = {}) => {
    let r = e.rangeLimit === void 0 ? 1e3 : e.rangeLimit, i = /* @__PURE__ */ n((s, o = {}) => {
      s.queue = [];
      let a = o, l = o.queue;
      for (; a.type !== "brace" && a.type !== "root" && a.parent; )
        a = a.parent, l = a.queue;
      if (s.invalid || s.dollar) {
        l.push(at(l.pop(), Sl(s, e)));
        return;
      }
      if (s.type === "brace" && s.invalid !== !0 && s.nodes.length === 2) {
        l.push(at(l.pop(), ["{}"]));
        return;
      }
      if (s.nodes && s.ranges > 0) {
        let m = mt.reduce(s.nodes);
        if (mt.exceedsLimit(...m, e.step, r))
          throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
        let p = zg(...m, e);
        p.length === 0 && (p = Sl(s, e)), l.push(at(l.pop(), p)), s.nodes = [];
        return;
      }
      let c = mt.encloseBrace(s), u = s.queue, h = s;
      for (; h.type !== "brace" && h.type !== "root" && h.parent; )
        h = h.parent, u = h.queue;
      for (let m = 0; m < s.nodes.length; m++) {
        let p = s.nodes[m];
        if (p.type === "comma" && s.type === "brace") {
          m === 1 && u.push(""), u.push("");
          continue;
        }
        if (p.type === "close") {
          l.push(at(l.pop(), u, c));
          continue;
        }
        if (p.value && p.type !== "open") {
          u.push(at(u.pop(), p.value));
          continue;
        }
        p.nodes && i(p, s);
      }
      return u;
    }, "walk");
    return mt.flatten(i(t));
  }, "expand");
  vl.exports = Kg;
});

// ../node_modules/braces/lib/constants.js
var Tl = d((SP, Rl) => {
  "use strict";
  Rl.exports = {
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
var Dl = d((vP, Cl) => {
  "use strict";
  var Qg = ur(), {
    MAX_LENGTH: Al,
    CHAR_BACKSLASH: Di,
    /* \ */
    CHAR_BACKTICK: Xg,
    /* ` */
    CHAR_COMMA: Zg,
    /* , */
    CHAR_DOT: Jg,
    /* . */
    CHAR_LEFT_PARENTHESES: ey,
    /* ( */
    CHAR_RIGHT_PARENTHESES: ty,
    /* ) */
    CHAR_LEFT_CURLY_BRACE: ry,
    /* { */
    CHAR_RIGHT_CURLY_BRACE: iy,
    /* } */
    CHAR_LEFT_SQUARE_BRACKET: Pl,
    /* [ */
    CHAR_RIGHT_SQUARE_BRACKET: Ol,
    /* ] */
    CHAR_DOUBLE_QUOTE: sy,
    /* " */
    CHAR_SINGLE_QUOTE: ny,
    /* ' */
    CHAR_NO_BREAK_SPACE: oy,
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: ay
  } = Tl(), ly = /* @__PURE__ */ n((t, e = {}) => {
    if (typeof t != "string")
      throw new TypeError("Expected a string");
    let r = e || {}, i = typeof r.maxLength == "number" ? Math.min(Al, r.maxLength) : Al;
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
      if (a = o[o.length - 1], p = v(), !(p === ay || p === oy)) {
        if (p === Di) {
          g({ type: "text", value: (e.keepEscaping ? p : "") + v() });
          continue;
        }
        if (p === Ol) {
          g({ type: "text", value: "\\" + p });
          continue;
        }
        if (p === Pl) {
          c++;
          let b;
          for (; h < u && (b = v()); ) {
            if (p += b, b === Pl) {
              c++;
              continue;
            }
            if (b === Di) {
              p += v();
              continue;
            }
            if (b === Ol && (c--, c === 0))
              break;
          }
          g({ type: "text", value: p });
          continue;
        }
        if (p === ey) {
          a = g({ type: "paren", nodes: [] }), o.push(a), g({ type: "text", value: p });
          continue;
        }
        if (p === ty) {
          if (a.type !== "paren") {
            g({ type: "text", value: p });
            continue;
          }
          a = o.pop(), g({ type: "text", value: p }), a = o[o.length - 1];
          continue;
        }
        if (p === sy || p === ny || p === Xg) {
          let b = p, R;
          for (e.keepQuotes !== !0 && (p = ""); h < u && (R = v()); ) {
            if (R === Di) {
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
        if (p === ry) {
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
        if (p === iy) {
          if (a.type !== "brace") {
            g({ type: "text", value: p });
            continue;
          }
          let b = "close";
          a = o.pop(), a.close = !0, g({ type: b, value: p }), m--, a = o[o.length - 1];
          continue;
        }
        if (p === Zg && m > 0) {
          if (a.ranges > 0) {
            a.ranges = 0;
            let b = a.nodes.shift();
            a.nodes = [b, { type: "text", value: Qg(a) }];
          }
          g({ type: "comma", value: p }), a.commas++;
          continue;
        }
        if (p === Jg && m > 0 && a.commas === 0) {
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
  Cl.exports = ly;
});

// ../node_modules/braces/index.js
var kl = d((RP, Nl) => {
  "use strict";
  var Il = ur(), cy = El(), uy = wl(), hy = Dl(), ce = /* @__PURE__ */ n((t, e = {}) => {
    let r = [];
    if (Array.isArray(t))
      for (let i of t) {
        let s = ce.create(i, e);
        Array.isArray(s) ? r.push(...s) : r.push(s);
      }
    else
      r = [].concat(ce.create(t, e));
    return e && e.expand === !0 && e.nodupes === !0 && (r = [...new Set(r)]), r;
  }, "braces");
  ce.parse = (t, e = {}) => hy(t, e);
  ce.stringify = (t, e = {}) => Il(typeof t == "string" ? ce.parse(t, e) : t, e);
  ce.compile = (t, e = {}) => (typeof t == "string" && (t = ce.parse(t, e)), cy(t, e));
  ce.expand = (t, e = {}) => {
    typeof t == "string" && (t = ce.parse(t, e));
    let r = uy(t, e);
    return e.noempty === !0 && (r = r.filter(Boolean)), e.nodupes === !0 && (r = [...new Set(r)]), r;
  };
  ce.create = (t, e = {}) => t === "" || t.length < 3 ? [t] : e.expand !== !0 ? ce.compile(t, e) : ce.expand(t, e);
  Nl.exports = ce;
});

// ../node_modules/picomatch/lib/constants.js
var Lt = d((AP, jl) => {
  "use strict";
  var py = I("path"), we = "\\\\/", Ll = `[^${we}]`, ke = "\\.", dy = "\\+", fy = "\\?", dr = "\\/", my = "(?=.)", $l = "[^/]", Ii = `(?:${dr}\
|$)`, Ml = `(?:^|${dr})`, Ni = `${ke}{1,2}${Ii}`, gy = `(?!${ke})`, yy = `(?!${Ml}${Ni})`, xy = `(?!${ke}{0,1}${Ii})`, _y = `(?!${Ni})`, by = `\
[^.${dr}]`, Ey = `${$l}*?`, ql = {
    DOT_LITERAL: ke,
    PLUS_LITERAL: dy,
    QMARK_LITERAL: fy,
    SLASH_LITERAL: dr,
    ONE_CHAR: my,
    QMARK: $l,
    END_ANCHOR: Ii,
    DOTS_SLASH: Ni,
    NO_DOT: gy,
    NO_DOTS: yy,
    NO_DOT_SLASH: xy,
    NO_DOTS_SLASH: _y,
    QMARK_NO_DOT: by,
    STAR: Ey,
    START_ANCHOR: Ml
  }, Sy = {
    ...ql,
    SLASH_LITERAL: `[${we}]`,
    QMARK: Ll,
    STAR: `${Ll}*?`,
    DOTS_SLASH: `${ke}{1,2}(?:[${we}]|$)`,
    NO_DOT: `(?!${ke})`,
    NO_DOTS: `(?!(?:^|[${we}])${ke}{1,2}(?:[${we}]|$))`,
    NO_DOT_SLASH: `(?!${ke}{0,1}(?:[${we}]|$))`,
    NO_DOTS_SLASH: `(?!${ke}{1,2}(?:[${we}]|$))`,
    QMARK_NO_DOT: `[^.${we}]`,
    START_ANCHOR: `(?:^|[${we}])`,
    END_ANCHOR: `(?:[${we}]|$)`
  }, vy = {
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
  jl.exports = {
    MAX_LENGTH: 1024 * 64,
    POSIX_REGEX_SOURCE: vy,
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
    SEP: py.sep,
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
      return t === !0 ? Sy : ql;
    }
  };
});

// ../node_modules/picomatch/lib/utils.js
var $t = d((ne) => {
  "use strict";
  var wy = I("path"), Ry = process.platform === "win32", {
    REGEX_BACKSLASH: Ty,
    REGEX_REMOVE_BACKSLASH: Ay,
    REGEX_SPECIAL_CHARS: Py,
    REGEX_SPECIAL_CHARS_GLOBAL: Oy
  } = Lt();
  ne.isObject = (t) => t !== null && typeof t == "object" && !Array.isArray(t);
  ne.hasRegexChars = (t) => Py.test(t);
  ne.isRegexChar = (t) => t.length === 1 && ne.hasRegexChars(t);
  ne.escapeRegex = (t) => t.replace(Oy, "\\$1");
  ne.toPosixSlashes = (t) => t.replace(Ty, "/");
  ne.removeBackslashes = (t) => t.replace(Ay, (e) => e === "\\" ? "" : e);
  ne.supportsLookbehinds = () => {
    let t = process.version.slice(1).split(".").map(Number);
    return t.length === 3 && t[0] >= 9 || t[0] === 8 && t[1] >= 10;
  };
  ne.isWindows = (t) => t && typeof t.windows == "boolean" ? t.windows : Ry === !0 || wy.sep === "\\";
  ne.escapeLast = (t, e, r) => {
    let i = t.lastIndexOf(e, r);
    return i === -1 ? t : t[i - 1] === "\\" ? ne.escapeLast(t, e, i - 1) : `${t.slice(0, i)}\\${t.slice(i)}`;
  };
  ne.removePrefix = (t, e = {}) => {
    let r = t;
    return r.startsWith("./") && (r = r.slice(2), e.prefix = "./"), r;
  };
  ne.wrapOutput = (t, e = {}, r = {}) => {
    let i = r.contains ? "" : "^", s = r.contains ? "" : "$", o = `${i}(?:${t})${s}`;
    return e.negated === !0 && (o = `(?:^(?!${o}).*$)`), o;
  };
});

// ../node_modules/picomatch/lib/scan.js
var Yl = d((OP, Vl) => {
  "use strict";
  var Fl = $t(), {
    CHAR_ASTERISK: ki,
    /* * */
    CHAR_AT: Cy,
    /* @ */
    CHAR_BACKWARD_SLASH: Mt,
    /* \ */
    CHAR_COMMA: Dy,
    /* , */
    CHAR_DOT: Li,
    /* . */
    CHAR_EXCLAMATION_MARK: $i,
    /* ! */
    CHAR_FORWARD_SLASH: Gl,
    /* / */
    CHAR_LEFT_CURLY_BRACE: Mi,
    /* { */
    CHAR_LEFT_PARENTHESES: qi,
    /* ( */
    CHAR_LEFT_SQUARE_BRACKET: Iy,
    /* [ */
    CHAR_PLUS: Ny,
    /* + */
    CHAR_QUESTION_MARK: Hl,
    /* ? */
    CHAR_RIGHT_CURLY_BRACE: ky,
    /* } */
    CHAR_RIGHT_PARENTHESES: Bl,
    /* ) */
    CHAR_RIGHT_SQUARE_BRACKET: Ly
    /* ] */
  } = Lt(), Ul = /* @__PURE__ */ n((t) => t === Gl || t === Mt, "isPathSeparator"), Wl = /* @__PURE__ */ n((t) => {
    t.isPrefix !== !0 && (t.depth = t.isGlobstar ? 1 / 0 : 1);
  }, "depth"), $y = /* @__PURE__ */ n((t, e) => {
    let r = e || {}, i = t.length - 1, s = r.parts === !0 || r.scanToEnd === !0, o = [], a = [], l = [], c = t, u = -1, h = 0, m = 0, p = !1,
    v = !1, g = !1, b = !1, R = !1, T = !1, $ = !1, D = !1, F = !1, C = !1, k = 0, O, P, q = { value: "", depth: 0, isGlob: !1 }, ee = /* @__PURE__ */ n(
    () => u >= i, "eos"), _ = /* @__PURE__ */ n(() => c.charCodeAt(u + 1), "peek"), V = /* @__PURE__ */ n(() => (O = P, c.charCodeAt(++u)), "\
advance");
    for (; u < i; ) {
      P = V();
      let ie;
      if (P === Mt) {
        $ = q.backslashes = !0, P = V(), P === Mi && (T = !0);
        continue;
      }
      if (T === !0 || P === Mi) {
        for (k++; ee() !== !0 && (P = V()); ) {
          if (P === Mt) {
            $ = q.backslashes = !0, V();
            continue;
          }
          if (P === Mi) {
            k++;
            continue;
          }
          if (T !== !0 && P === Li && (P = V()) === Li) {
            if (p = q.isBrace = !0, g = q.isGlob = !0, C = !0, s === !0)
              continue;
            break;
          }
          if (T !== !0 && P === Dy) {
            if (p = q.isBrace = !0, g = q.isGlob = !0, C = !0, s === !0)
              continue;
            break;
          }
          if (P === ky && (k--, k === 0)) {
            T = !1, p = q.isBrace = !0, C = !0;
            break;
          }
        }
        if (s === !0)
          continue;
        break;
      }
      if (P === Gl) {
        if (o.push(u), a.push(q), q = { value: "", depth: 0, isGlob: !1 }, C === !0) continue;
        if (O === Li && u === h + 1) {
          h += 2;
          continue;
        }
        m = u + 1;
        continue;
      }
      if (r.noext !== !0 && (P === Ny || P === Cy || P === ki || P === Hl || P === $i) === !0 && _() === qi) {
        if (g = q.isGlob = !0, b = q.isExtglob = !0, C = !0, P === $i && u === h && (F = !0), s === !0) {
          for (; ee() !== !0 && (P = V()); ) {
            if (P === Mt) {
              $ = q.backslashes = !0, P = V();
              continue;
            }
            if (P === Bl) {
              g = q.isGlob = !0, C = !0;
              break;
            }
          }
          continue;
        }
        break;
      }
      if (P === ki) {
        if (O === ki && (R = q.isGlobstar = !0), g = q.isGlob = !0, C = !0, s === !0)
          continue;
        break;
      }
      if (P === Hl) {
        if (g = q.isGlob = !0, C = !0, s === !0)
          continue;
        break;
      }
      if (P === Iy) {
        for (; ee() !== !0 && (ie = V()); ) {
          if (ie === Mt) {
            $ = q.backslashes = !0, V();
            continue;
          }
          if (ie === Ly) {
            v = q.isBracket = !0, g = q.isGlob = !0, C = !0;
            break;
          }
        }
        if (s === !0)
          continue;
        break;
      }
      if (r.nonegate !== !0 && P === $i && u === h) {
        D = q.negated = !0, h++;
        continue;
      }
      if (r.noparen !== !0 && P === qi) {
        if (g = q.isGlob = !0, s === !0) {
          for (; ee() !== !0 && (P = V()); ) {
            if (P === qi) {
              $ = q.backslashes = !0, P = V();
              continue;
            }
            if (P === Bl) {
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
    let U = c, Ge = "", y = "";
    h > 0 && (Ge = c.slice(0, h), c = c.slice(h), m -= h), U && g === !0 && m > 0 ? (U = c.slice(0, m), y = c.slice(m)) : g === !0 ? (U = "",
    y = c) : U = c, U && U !== "" && U !== "/" && U !== c && Ul(U.charCodeAt(U.length - 1)) && (U = U.slice(0, -1)), r.unescape === !0 && (y &&
    (y = Fl.removeBackslashes(y)), U && $ === !0 && (U = Fl.removeBackslashes(U)));
    let x = {
      prefix: Ge,
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
      negatedExtglob: F
    };
    if (r.tokens === !0 && (x.maxDepth = 0, Ul(P) || a.push(q), x.tokens = a), r.parts === !0 || r.tokens === !0) {
      let ie;
      for (let M = 0; M < o.length; M++) {
        let Se = ie ? ie + 1 : h, ve = o[M], le = t.slice(Se, ve);
        r.tokens && (M === 0 && h !== 0 ? (a[M].isPrefix = !0, a[M].value = Ge) : a[M].value = le, Wl(a[M]), x.maxDepth += a[M].depth), (M !==
        0 || le !== "") && l.push(le), ie = ve;
      }
      if (ie && ie + 1 < t.length) {
        let M = t.slice(ie + 1);
        l.push(M), r.tokens && (a[a.length - 1].value = M, Wl(a[a.length - 1]), x.maxDepth += a[a.length - 1].depth);
      }
      x.slashes = o, x.parts = l;
    }
    return x;
  }, "scan");
  Vl.exports = $y;
});

// ../node_modules/picomatch/lib/parse.js
var Ql = d((DP, Kl) => {
  "use strict";
  var fr = Lt(), ue = $t(), {
    MAX_LENGTH: mr,
    POSIX_REGEX_SOURCE: My,
    REGEX_NON_SPECIAL_CHARS: qy,
    REGEX_SPECIAL_CHARS_BACKREF: jy,
    REPLACEMENTS: zl
  } = fr, Fy = /* @__PURE__ */ n((t, e) => {
    if (typeof e.expandRange == "function")
      return e.expandRange(...t, e);
    t.sort();
    let r = `[${t.join("-")}]`;
    try {
      new RegExp(r);
    } catch {
      return t.map((s) => ue.escapeRegex(s)).join("..");
    }
    return r;
  }, "expandRange"), gt = /* @__PURE__ */ n((t, e) => `Missing ${t}: "${e}" - use "\\\\${e}" to match literal characters`, "syntaxError"), ji = /* @__PURE__ */ n(
  (t, e) => {
    if (typeof t != "string")
      throw new TypeError("Expected a string");
    t = zl[t] || t;
    let r = { ...e }, i = typeof r.maxLength == "number" ? Math.min(mr, r.maxLength) : mr, s = t.length;
    if (s > i)
      throw new SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${i}`);
    let o = { type: "bos", value: "", output: r.prepend || "" }, a = [o], l = r.capture ? "" : "?:", c = ue.isWindows(e), u = fr.globChars(c),
    h = fr.extglobChars(u), {
      DOT_LITERAL: m,
      PLUS_LITERAL: p,
      SLASH_LITERAL: v,
      ONE_CHAR: g,
      DOTS_SLASH: b,
      NO_DOT: R,
      NO_DOT_SLASH: T,
      NO_DOTS_SLASH: $,
      QMARK: D,
      QMARK_NO_DOT: F,
      STAR: C,
      START_ANCHOR: k
    } = u, O = /* @__PURE__ */ n((S) => `(${l}(?:(?!${k}${S.dot ? b : m}).)*?)`, "globstar"), P = r.dot ? "" : R, q = r.dot ? D : F, ee = r.
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
    t = ue.removePrefix(t, _), s = t.length;
    let V = [], U = [], Ge = [], y = o, x, ie = /* @__PURE__ */ n(() => _.index === s - 1, "eos"), M = _.peek = (S = 1) => t[_.index + S], Se = _.
    advance = () => t[++_.index] || "", ve = /* @__PURE__ */ n(() => t.slice(_.index + 1), "remaining"), le = /* @__PURE__ */ n((S = "", W = 0) => {
      _.consumed += S, _.index += W;
    }, "consume"), Jt = /* @__PURE__ */ n((S) => {
      _.output += S.output != null ? S.output : S.value, le(S.value);
    }, "append"), vm = /* @__PURE__ */ n(() => {
      let S = 1;
      for (; M() === "!" && (M(2) !== "(" || M(3) === "?"); )
        Se(), _.start++, S++;
      return S % 2 === 0 ? !1 : (_.negated = !0, _.start++, !0);
    }, "negate"), er = /* @__PURE__ */ n((S) => {
      _[S]++, Ge.push(S);
    }, "increment"), it = /* @__PURE__ */ n((S) => {
      _[S]--, Ge.pop();
    }, "decrement"), L = /* @__PURE__ */ n((S) => {
      if (y.type === "globstar") {
        let W = _.braces > 0 && (S.type === "comma" || S.type === "brace"), E = S.extglob === !0 || V.length && (S.type === "pipe" || S.type ===
        "paren");
        S.type !== "slash" && S.type !== "paren" && !W && !E && (_.output = _.output.slice(0, -y.output.length), y.type = "star", y.value = "\
*", y.output = ee, _.output += y.output);
      }
      if (V.length && S.type !== "paren" && (V[V.length - 1].inner += S.value), (S.value || S.output) && Jt(S), y && y.type === "text" && S.
      type === "text") {
        y.value += S.value, y.output = (y.output || "") + S.value;
        return;
      }
      S.prev = y, a.push(S), y = S;
    }, "push"), tr = /* @__PURE__ */ n((S, W) => {
      let E = { ...h[W], conditions: 1, inner: "" };
      E.prev = y, E.parens = _.parens, E.output = _.output;
      let N = (r.capture ? "(" : "") + E.open;
      er("parens"), L({ type: S, value: W, output: _.output ? "" : g }), L({ type: "paren", extglob: !0, value: Se(), output: N }), V.push(E);
    }, "extglobOpen"), wm = /* @__PURE__ */ n((S) => {
      let W = S.close + (r.capture ? ")" : ""), E;
      if (S.type === "negate") {
        let N = ee;
        if (S.inner && S.inner.length > 1 && S.inner.includes("/") && (N = O(r)), (N !== ee || ie() || /^\)+$/.test(ve())) && (W = S.close =
        `)$))${N}`), S.inner.includes("*") && (E = ve()) && /^\.[^\\/.]+$/.test(E)) {
          let Y = ji(E, { ...e, fastpaths: !1 }).output;
          W = S.close = `)${Y})${N})`;
        }
        S.prev.type === "bos" && (_.negatedExtglob = !0);
      }
      L({ type: "paren", extglob: !0, value: x, output: W }), it("parens");
    }, "extglobClose");
    if (r.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(t)) {
      let S = !1, W = t.replace(jy, (E, N, Y, se, J, ni) => se === "\\" ? (S = !0, E) : se === "?" ? N ? N + se + (J ? D.repeat(J.length) : "") :
      ni === 0 ? q + (J ? D.repeat(J.length) : "") : D.repeat(Y.length) : se === "." ? m.repeat(Y.length) : se === "*" ? N ? N + se + (J ? ee :
      "") : ee : N ? E : `\\${E}`);
      return S === !0 && (r.unescape === !0 ? W = W.replace(/\\/g, "") : W = W.replace(/\\+/g, (E) => E.length % 2 === 0 ? "\\\\" : E ? "\\" :
      "")), W === t && r.contains === !0 ? (_.output = t, _) : (_.output = ue.wrapOutput(W, _, e), _);
    }
    for (; !ie(); ) {
      if (x = Se(), x === "\0")
        continue;
      if (x === "\\") {
        let E = M();
        if (E === "/" && r.bash !== !0 || E === "." || E === ";")
          continue;
        if (!E) {
          x += "\\", L({ type: "text", value: x });
          continue;
        }
        let N = /^\\+/.exec(ve()), Y = 0;
        if (N && N[0].length > 2 && (Y = N[0].length, _.index += Y, Y % 2 !== 0 && (x += "\\")), r.unescape === !0 ? x = Se() : x += Se(), _.
        brackets === 0) {
          L({ type: "text", value: x });
          continue;
        }
      }
      if (_.brackets > 0 && (x !== "]" || y.value === "[" || y.value === "[^")) {
        if (r.posix !== !1 && x === ":") {
          let E = y.value.slice(1);
          if (E.includes("[") && (y.posix = !0, E.includes(":"))) {
            let N = y.value.lastIndexOf("["), Y = y.value.slice(0, N), se = y.value.slice(N + 2), J = My[se];
            if (J) {
              y.value = Y + J, _.backtrack = !0, Se(), !o.output && a.indexOf(y) === 1 && (o.output = g);
              continue;
            }
          }
        }
        (x === "[" && M() !== ":" || x === "-" && M() === "]") && (x = `\\${x}`), x === "]" && (y.value === "[" || y.value === "[^") && (x =
        `\\${x}`), r.posix === !0 && x === "!" && y.value === "[" && (x = "^"), y.value += x, Jt({ value: x });
        continue;
      }
      if (_.quotes === 1 && x !== '"') {
        x = ue.escapeRegex(x), y.value += x, Jt({ value: x });
        continue;
      }
      if (x === '"') {
        _.quotes = _.quotes === 1 ? 0 : 1, r.keepQuotes === !0 && L({ type: "text", value: x });
        continue;
      }
      if (x === "(") {
        er("parens"), L({ type: "paren", value: x });
        continue;
      }
      if (x === ")") {
        if (_.parens === 0 && r.strictBrackets === !0)
          throw new SyntaxError(gt("opening", "("));
        let E = V[V.length - 1];
        if (E && _.parens === E.parens + 1) {
          wm(V.pop());
          continue;
        }
        L({ type: "paren", value: x, output: _.parens ? ")" : "\\)" }), it("parens");
        continue;
      }
      if (x === "[") {
        if (r.nobracket === !0 || !ve().includes("]")) {
          if (r.nobracket !== !0 && r.strictBrackets === !0)
            throw new SyntaxError(gt("closing", "]"));
          x = `\\${x}`;
        } else
          er("brackets");
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
            throw new SyntaxError(gt("opening", "["));
          L({ type: "text", value: x, output: `\\${x}` });
          continue;
        }
        it("brackets");
        let E = y.value.slice(1);
        if (y.posix !== !0 && E[0] === "^" && !E.includes("/") && (x = `/${x}`), y.value += x, Jt({ value: x }), r.literalBrackets === !1 ||
        ue.hasRegexChars(E))
          continue;
        let N = ue.escapeRegex(y.value);
        if (_.output = _.output.slice(0, -y.value.length), r.literalBrackets === !0) {
          _.output += N, y.value = N;
          continue;
        }
        y.value = `(${l}${N}|${y.value})`, _.output += y.value;
        continue;
      }
      if (x === "{" && r.nobrace !== !0) {
        er("braces");
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
        let N = ")";
        if (E.dots === !0) {
          let Y = a.slice(), se = [];
          for (let J = Y.length - 1; J >= 0 && (a.pop(), Y[J].type !== "brace"); J--)
            Y[J].type !== "dots" && se.unshift(Y[J].value);
          N = Fy(se, r), _.backtrack = !0;
        }
        if (E.comma !== !0 && E.dots !== !0) {
          let Y = _.output.slice(0, E.outputIndex), se = _.tokens.slice(E.tokensIndex);
          E.value = E.output = "\\{", x = N = "\\}", _.output = Y;
          for (let J of se)
            _.output += J.output || J.value;
        }
        L({ type: "brace", value: x, output: N }), it("braces"), U.pop();
        continue;
      }
      if (x === "|") {
        V.length > 0 && V[V.length - 1].conditions++, L({ type: "text", value: x });
        continue;
      }
      if (x === ",") {
        let E = x, N = U[U.length - 1];
        N && Ge[Ge.length - 1] === "braces" && (N.comma = !0, E = "|"), L({ type: "comma", value: x, output: E });
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
        if (!(y && y.value === "(") && r.noextglob !== !0 && M() === "(" && M(2) !== "?") {
          tr("qmark", x);
          continue;
        }
        if (y && y.type === "paren") {
          let N = M(), Y = x;
          if (N === "<" && !ue.supportsLookbehinds())
            throw new Error("Node.js v10 or higher is required for regex lookbehinds");
          (y.value === "(" && !/[!=<:]/.test(N) || N === "<" && !/<([!=]|\w+>)/.test(ve())) && (Y = `\\${x}`), L({ type: "text", value: x, output: Y });
          continue;
        }
        if (r.dot !== !0 && (y.type === "slash" || y.type === "bos")) {
          L({ type: "qmark", value: x, output: F });
          continue;
        }
        L({ type: "qmark", value: x, output: D });
        continue;
      }
      if (x === "!") {
        if (r.noextglob !== !0 && M() === "(" && (M(2) !== "?" || !/[!=<:]/.test(M(3)))) {
          tr("negate", x);
          continue;
        }
        if (r.nonegate !== !0 && _.index === 0) {
          vm();
          continue;
        }
      }
      if (x === "+") {
        if (r.noextglob !== !0 && M() === "(" && M(2) !== "?") {
          tr("plus", x);
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
        if (r.noextglob !== !0 && M() === "(" && M(2) !== "?") {
          L({ type: "at", extglob: !0, value: x, output: "" });
          continue;
        }
        L({ type: "text", value: x });
        continue;
      }
      if (x !== "*") {
        (x === "$" || x === "^") && (x = `\\${x}`);
        let E = qy.exec(ve());
        E && (x += E[0], _.index += E[0].length), L({ type: "text", value: x });
        continue;
      }
      if (y && (y.type === "globstar" || y.star === !0)) {
        y.type = "star", y.star = !0, y.value += x, y.output = ee, _.backtrack = !0, _.globstar = !0, le(x);
        continue;
      }
      let S = ve();
      if (r.noextglob !== !0 && /^\([^?]/.test(S)) {
        tr("star", x);
        continue;
      }
      if (y.type === "star") {
        if (r.noglobstar === !0) {
          le(x);
          continue;
        }
        let E = y.prev, N = E.prev, Y = E.type === "slash" || E.type === "bos", se = N && (N.type === "star" || N.type === "globstar");
        if (r.bash === !0 && (!Y || S[0] && S[0] !== "/")) {
          L({ type: "star", value: x, output: "" });
          continue;
        }
        let J = _.braces > 0 && (E.type === "comma" || E.type === "brace"), ni = V.length && (E.type === "pipe" || E.type === "paren");
        if (!Y && E.type !== "paren" && !J && !ni) {
          L({ type: "star", value: x, output: "" });
          continue;
        }
        for (; S.slice(0, 3) === "/**"; ) {
          let rr = t[_.index + 4];
          if (rr && rr !== "/")
            break;
          S = S.slice(3), le("/**", 3);
        }
        if (E.type === "bos" && ie()) {
          y.type = "globstar", y.value += x, y.output = O(r), _.output = y.output, _.globstar = !0, le(x);
          continue;
        }
        if (E.type === "slash" && E.prev.type !== "bos" && !se && ie()) {
          _.output = _.output.slice(0, -(E.output + y.output).length), E.output = `(?:${E.output}`, y.type = "globstar", y.output = O(r) + (r.
          strictSlashes ? ")" : "|$)"), y.value += x, _.globstar = !0, _.output += E.output + y.output, le(x);
          continue;
        }
        if (E.type === "slash" && E.prev.type !== "bos" && S[0] === "/") {
          let rr = S[1] !== void 0 ? "|$" : "";
          _.output = _.output.slice(0, -(E.output + y.output).length), E.output = `(?:${E.output}`, y.type = "globstar", y.output = `${O(r)}${v}\
|${v}${rr})`, y.value += x, _.output += E.output + y.output, _.globstar = !0, le(x + Se()), L({ type: "slash", value: "/", output: "" });
          continue;
        }
        if (E.type === "bos" && S[0] === "/") {
          y.type = "globstar", y.value += x, y.output = `(?:^|${v}|${O(r)}${v})`, _.output = y.output, _.globstar = !0, le(x + Se()), L({ type: "\
slash", value: "/", output: "" });
          continue;
        }
        _.output = _.output.slice(0, -y.output.length), y.type = "globstar", y.output = O(r), y.value += x, _.output += y.output, _.globstar =
        !0, le(x);
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
      (_.output += $, y.output += $) : (_.output += P, y.output += P), M() !== "*" && (_.output += g, y.output += g)), L(W);
    }
    for (; _.brackets > 0; ) {
      if (r.strictBrackets === !0) throw new SyntaxError(gt("closing", "]"));
      _.output = ue.escapeLast(_.output, "["), it("brackets");
    }
    for (; _.parens > 0; ) {
      if (r.strictBrackets === !0) throw new SyntaxError(gt("closing", ")"));
      _.output = ue.escapeLast(_.output, "("), it("parens");
    }
    for (; _.braces > 0; ) {
      if (r.strictBrackets === !0) throw new SyntaxError(gt("closing", "}"));
      _.output = ue.escapeLast(_.output, "{"), it("braces");
    }
    if (r.strictSlashes !== !0 && (y.type === "star" || y.type === "bracket") && L({ type: "maybe_slash", value: "", output: `${v}?` }), _.backtrack ===
    !0) {
      _.output = "";
      for (let S of _.tokens)
        _.output += S.output != null ? S.output : S.value, S.suffix && (_.output += S.suffix);
    }
    return _;
  }, "parse");
  ji.fastpaths = (t, e) => {
    let r = { ...e }, i = typeof r.maxLength == "number" ? Math.min(mr, r.maxLength) : mr, s = t.length;
    if (s > i)
      throw new SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${i}`);
    t = zl[t] || t;
    let o = ue.isWindows(e), {
      DOT_LITERAL: a,
      SLASH_LITERAL: l,
      ONE_CHAR: c,
      DOTS_SLASH: u,
      NO_DOT: h,
      NO_DOTS: m,
      NO_DOTS_SLASH: p,
      STAR: v,
      START_ANCHOR: g
    } = fr.globChars(o), b = r.dot ? m : h, R = r.dot ? p : h, T = r.capture ? "" : "?:", $ = { negated: !1, prefix: "" }, D = r.bash === !0 ?
    ".*?" : v;
    r.capture && (D = `(${D})`);
    let F = /* @__PURE__ */ n((P) => P.noglobstar === !0 ? D : `(${T}(?:(?!${g}${P.dot ? u : a}).)*?)`, "globstar"), C = /* @__PURE__ */ n((P) => {
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
          return b + F(r);
        case "**/*":
          return `(?:${b}${F(r)}${l})?${R}${c}${D}`;
        case "**/*.*":
          return `(?:${b}${F(r)}${l})?${R}${D}${a}${c}${D}`;
        case "**/.*":
          return `(?:${b}${F(r)}${l})?${a}${c}${D}`;
        default: {
          let q = /^(.*?)\.(\w+)$/.exec(P);
          if (!q) return;
          let ee = C(q[1]);
          return ee ? ee + a + q[2] : void 0;
        }
      }
    }, "create"), k = ue.removePrefix(t, $), O = C(k);
    return O && r.strictSlashes !== !0 && (O += `${l}?`), O;
  };
  Kl.exports = ji;
});

// ../node_modules/picomatch/lib/picomatch.js
var Zl = d((NP, Xl) => {
  "use strict";
  var Hy = I("path"), By = Yl(), Fi = Ql(), Hi = $t(), Uy = Lt(), Wy = /* @__PURE__ */ n((t) => t && typeof t == "object" && !Array.isArray(
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
    let i = Wy(t) && t.tokens && t.input;
    if (t === "" || typeof t != "string" && !i)
      throw new TypeError("Expected pattern to be a non-empty string");
    let s = e || {}, o = Hi.isWindows(e), a = i ? X.compileRe(t, e) : X.makeRe(t, e, !1, !0), l = a.state;
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
    let o = r || {}, a = o.format || (s ? Hi.toPosixSlashes : null), l = t === i, c = l && a ? a(t) : t;
    return l === !1 && (c = a ? a(t) : t, l = c === i), (l === !1 || o.capture === !0) && (o.matchBase === !0 || o.basename === !0 ? l = X.matchBase(
    t, e, r, s) : l = e.exec(c)), { isMatch: !!l, match: l, output: c };
  };
  X.matchBase = (t, e, r, i = Hi.isWindows(r)) => (e instanceof RegExp ? e : X.makeRe(e, r)).test(Hy.basename(t));
  X.isMatch = (t, e, r) => X(e, r)(t);
  X.parse = (t, e) => Array.isArray(t) ? t.map((r) => X.parse(r, e)) : Fi(t, { ...e, fastpaths: !1 });
  X.scan = (t, e) => By(t, e);
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
    return e.fastpaths !== !1 && (t[0] === "." || t[0] === "*") && (s.output = Fi.fastpaths(t, e)), s.output || (s = Fi(t, e)), X.compileRe(
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
  X.constants = Uy;
  Xl.exports = X;
});

// ../node_modules/picomatch/index.js
var ec = d((LP, Jl) => {
  "use strict";
  Jl.exports = Zl();
});

// ../node_modules/micromatch/index.js
var oc = d(($P, nc) => {
  "use strict";
  var rc = I("util"), ic = kl(), Re = ec(), Bi = $t(), tc = /* @__PURE__ */ n((t) => t === "" || t === "./", "isEmptyString"), sc = /* @__PURE__ */ n(
  (t) => {
    let e = t.indexOf("{");
    return e > -1 && t.indexOf("}", e) > -1;
  }, "hasBraces"), G = /* @__PURE__ */ n((t, e, r) => {
    e = [].concat(e), t = [].concat(t);
    let i = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = 0, l = /* @__PURE__ */ n((h) => {
      o.add(h.output), r && r.onResult && r.onResult(h);
    }, "onResult");
    for (let h = 0; h < e.length; h++) {
      let m = Re(String(e[h]), { ...r, onResult: l }, !0), p = m.state.negated || m.state.negatedExtglob;
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
  G.matcher = (t, e) => Re(t, e);
  G.isMatch = (t, e, r) => Re(e, r)(t);
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
      throw new TypeError(`Expected a string: "${rc.inspect(t)}"`);
    if (Array.isArray(e))
      return e.some((i) => G.contains(t, i, r));
    if (typeof e == "string") {
      if (tc(t) || tc(e))
        return !1;
      if (t.includes(e) || t.startsWith("./") && t.slice(2).includes(e))
        return !0;
    }
    return G.isMatch(t, e, { ...r, contains: !0 });
  };
  G.matchKeys = (t, e, r) => {
    if (!Bi.isObject(t))
      throw new TypeError("Expected the first argument to be an object");
    let i = G(Object.keys(t), e, r), s = {};
    for (let o of i) s[o] = t[o];
    return s;
  };
  G.some = (t, e, r) => {
    let i = [].concat(t);
    for (let s of [].concat(e)) {
      let o = Re(String(s), r);
      if (i.some((a) => o(a)))
        return !0;
    }
    return !1;
  };
  G.every = (t, e, r) => {
    let i = [].concat(t);
    for (let s of [].concat(e)) {
      let o = Re(String(s), r);
      if (!i.every((a) => o(a)))
        return !1;
    }
    return !0;
  };
  G.all = (t, e, r) => {
    if (typeof t != "string")
      throw new TypeError(`Expected a string: "${rc.inspect(t)}"`);
    return [].concat(e).every((i) => Re(i, r)(t));
  };
  G.capture = (t, e, r) => {
    let i = Bi.isWindows(r), o = Re.makeRe(String(t), { ...r, capture: !0 }).exec(i ? Bi.toPosixSlashes(e) : e);
    if (o)
      return o.slice(1).map((a) => a === void 0 ? "" : a);
  };
  G.makeRe = (...t) => Re.makeRe(...t);
  G.scan = (...t) => Re.scan(...t);
  G.parse = (t, e) => {
    let r = [];
    for (let i of [].concat(t || []))
      for (let s of ic(String(i), e))
        r.push(Re.parse(s, e));
    return r;
  };
  G.braces = (t, e) => {
    if (typeof t != "string") throw new TypeError("Expected a string");
    return e && e.nobrace === !0 || !sc(t) ? [t] : ic(t, e);
  };
  G.braceExpand = (t, e) => {
    if (typeof t != "string") throw new TypeError("Expected a string");
    return G.braces(t, { ...e, expand: !0 });
  };
  G.hasBraces = sc;
  nc.exports = G;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/pattern.js
var fc = d((A) => {
  "use strict";
  Object.defineProperty(A, "__esModule", { value: !0 });
  A.removeDuplicateSlashes = A.matchAny = A.convertPatternsToRe = A.makeRe = A.getPatternParts = A.expandBraceExpansion = A.expandPatternsWithBraceExpansion =
  A.isAffectDepthOfReadingPattern = A.endsWithSlashGlobStar = A.hasGlobStar = A.getBaseDirectory = A.isPatternRelatedToParentDirectory = A.getPatternsOutsideCurrentDirectory =
  A.getPatternsInsideCurrentDirectory = A.getPositivePatterns = A.getNegativePatterns = A.isPositivePattern = A.isNegativePattern = A.convertToNegativePattern =
  A.convertToPositivePattern = A.isDynamicPattern = A.isStaticPattern = void 0;
  var Gy = I("path"), Vy = Za(), Ui = oc(), ac = "**", Yy = "\\", zy = /[*?]|^!/, Ky = /\[[^[]*]/, Qy = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/, Xy = /[!*+?@]\([^(]*\)/,
  Zy = /,|\.\./, Jy = /(?!^)\/{2,}/g;
  function lc(t, e = {}) {
    return !cc(t, e);
  }
  n(lc, "isStaticPattern");
  A.isStaticPattern = lc;
  function cc(t, e = {}) {
    return t === "" ? !1 : !!(e.caseSensitiveMatch === !1 || t.includes(Yy) || zy.test(t) || Ky.test(t) || Qy.test(t) || e.extglob !== !1 &&
    Xy.test(t) || e.braceExpansion !== !1 && ex(t));
  }
  n(cc, "isDynamicPattern");
  A.isDynamicPattern = cc;
  function ex(t) {
    let e = t.indexOf("{");
    if (e === -1)
      return !1;
    let r = t.indexOf("}", e + 1);
    if (r === -1)
      return !1;
    let i = t.slice(e, r);
    return Zy.test(i);
  }
  n(ex, "hasBraceExpansion");
  function tx(t) {
    return gr(t) ? t.slice(1) : t;
  }
  n(tx, "convertToPositivePattern");
  A.convertToPositivePattern = tx;
  function rx(t) {
    return "!" + t;
  }
  n(rx, "convertToNegativePattern");
  A.convertToNegativePattern = rx;
  function gr(t) {
    return t.startsWith("!") && t[1] !== "(";
  }
  n(gr, "isNegativePattern");
  A.isNegativePattern = gr;
  function uc(t) {
    return !gr(t);
  }
  n(uc, "isPositivePattern");
  A.isPositivePattern = uc;
  function ix(t) {
    return t.filter(gr);
  }
  n(ix, "getNegativePatterns");
  A.getNegativePatterns = ix;
  function sx(t) {
    return t.filter(uc);
  }
  n(sx, "getPositivePatterns");
  A.getPositivePatterns = sx;
  function nx(t) {
    return t.filter((e) => !Wi(e));
  }
  n(nx, "getPatternsInsideCurrentDirectory");
  A.getPatternsInsideCurrentDirectory = nx;
  function ox(t) {
    return t.filter(Wi);
  }
  n(ox, "getPatternsOutsideCurrentDirectory");
  A.getPatternsOutsideCurrentDirectory = ox;
  function Wi(t) {
    return t.startsWith("..") || t.startsWith("./..");
  }
  n(Wi, "isPatternRelatedToParentDirectory");
  A.isPatternRelatedToParentDirectory = Wi;
  function ax(t) {
    return Vy(t, { flipBackslashes: !1 });
  }
  n(ax, "getBaseDirectory");
  A.getBaseDirectory = ax;
  function lx(t) {
    return t.includes(ac);
  }
  n(lx, "hasGlobStar");
  A.hasGlobStar = lx;
  function hc(t) {
    return t.endsWith("/" + ac);
  }
  n(hc, "endsWithSlashGlobStar");
  A.endsWithSlashGlobStar = hc;
  function cx(t) {
    let e = Gy.basename(t);
    return hc(t) || lc(e);
  }
  n(cx, "isAffectDepthOfReadingPattern");
  A.isAffectDepthOfReadingPattern = cx;
  function ux(t) {
    return t.reduce((e, r) => e.concat(pc(r)), []);
  }
  n(ux, "expandPatternsWithBraceExpansion");
  A.expandPatternsWithBraceExpansion = ux;
  function pc(t) {
    let e = Ui.braces(t, { expand: !0, nodupes: !0, keepEscaping: !0 });
    return e.sort((r, i) => r.length - i.length), e.filter((r) => r !== "");
  }
  n(pc, "expandBraceExpansion");
  A.expandBraceExpansion = pc;
  function hx(t, e) {
    let { parts: r } = Ui.scan(t, Object.assign(Object.assign({}, e), { parts: !0 }));
    return r.length === 0 && (r = [t]), r[0].startsWith("/") && (r[0] = r[0].slice(1), r.unshift("")), r;
  }
  n(hx, "getPatternParts");
  A.getPatternParts = hx;
  function dc(t, e) {
    return Ui.makeRe(t, e);
  }
  n(dc, "makeRe");
  A.makeRe = dc;
  function px(t, e) {
    return t.map((r) => dc(r, e));
  }
  n(px, "convertPatternsToRe");
  A.convertPatternsToRe = px;
  function dx(t, e) {
    return e.some((r) => r.test(t));
  }
  n(dx, "matchAny");
  A.matchAny = dx;
  function fx(t) {
    return t.replace(Jy, "/");
  }
  n(fx, "removeDuplicateSlashes");
  A.removeDuplicateSlashes = fx;
});

// ../node_modules/merge2/index.js
var xc = d((FP, yc) => {
  "use strict";
  var mx = I("stream"), mc = mx.PassThrough, gx = Array.prototype.slice;
  yc.exports = yx;
  function yx() {
    let t = [], e = gx.call(arguments), r = !1, i = e[e.length - 1];
    i && !Array.isArray(i) && i.pipe == null ? e.pop() : i = {};
    let s = i.end !== !1, o = i.pipeError === !0;
    i.objectMode == null && (i.objectMode = !0), i.highWaterMark == null && (i.highWaterMark = 64 * 1024);
    let a = mc(i);
    function l() {
      for (let h = 0, m = arguments.length; h < m; h++)
        t.push(gc(arguments[h], i));
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
  n(yx, "merge2");
  function gc(t, e) {
    if (Array.isArray(t))
      for (let r = 0, i = t.length; r < i; r++)
        t[r] = gc(t[r], e);
    else {
      if (!t._readableState && t.pipe && (t = t.pipe(mc(e))), !t._readableState || !t.pause || !t.pipe)
        throw new Error("Only readable stream can be merged.");
      t.pause();
    }
    return t;
  }
  n(gc, "pauseStreams");
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/stream.js
var bc = d((yr) => {
  "use strict";
  Object.defineProperty(yr, "__esModule", { value: !0 });
  yr.merge = void 0;
  var xx = xc();
  function _x(t) {
    let e = xx(t);
    return t.forEach((r) => {
      r.once("error", (i) => e.emit("error", i));
    }), e.once("close", () => _c(t)), e.once("end", () => _c(t)), e;
  }
  n(_x, "merge");
  yr.merge = _x;
  function _c(t) {
    t.forEach((e) => e.emit("close"));
  }
  n(_c, "propagateCloseEventToSources");
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/string.js
var Ec = d((yt) => {
  "use strict";
  Object.defineProperty(yt, "__esModule", { value: !0 });
  yt.isEmpty = yt.isString = void 0;
  function bx(t) {
    return typeof t == "string";
  }
  n(bx, "isString");
  yt.isString = bx;
  function Ex(t) {
    return t === "";
  }
  n(Ex, "isEmpty");
  yt.isEmpty = Ex;
});

// ../node_modules/globby/node_modules/fast-glob/out/utils/index.js
var Le = d((te) => {
  "use strict";
  Object.defineProperty(te, "__esModule", { value: !0 });
  te.string = te.stream = te.pattern = te.path = te.fs = te.errno = te.array = void 0;
  var Sx = ja();
  te.array = Sx;
  var vx = Fa();
  te.errno = vx;
  var wx = Ha();
  te.fs = wx;
  var Rx = Ga();
  te.path = Rx;
  var Tx = fc();
  te.pattern = Tx;
  var Ax = bc();
  te.stream = Ax;
  var Px = Ec();
  te.string = Px;
});

// ../node_modules/globby/node_modules/fast-glob/out/managers/tasks.js
var Rc = d((re) => {
  "use strict";
  Object.defineProperty(re, "__esModule", { value: !0 });
  re.convertPatternGroupToTask = re.convertPatternGroupsToTasks = re.groupPatternsByBaseDirectory = re.getNegativePatternsAsPositive = re.getPositivePatterns =
  re.convertPatternsToTasks = re.generate = void 0;
  var xe = Le();
  function Ox(t, e) {
    let r = Sc(t, e), i = Sc(e.ignore, e), s = vc(r), o = wc(r, i), a = s.filter((h) => xe.pattern.isStaticPattern(h, e)), l = s.filter((h) => xe.
    pattern.isDynamicPattern(h, e)), c = Gi(
      a,
      o,
      /* dynamic */
      !1
    ), u = Gi(
      l,
      o,
      /* dynamic */
      !0
    );
    return c.concat(u);
  }
  n(Ox, "generate");
  re.generate = Ox;
  function Sc(t, e) {
    let r = t;
    return e.braceExpansion && (r = xe.pattern.expandPatternsWithBraceExpansion(r)), e.baseNameMatch && (r = r.map((i) => i.includes("/") ? i :
    `**/${i}`)), r.map((i) => xe.pattern.removeDuplicateSlashes(i));
  }
  n(Sc, "processPatterns");
  function Gi(t, e, r) {
    let i = [], s = xe.pattern.getPatternsOutsideCurrentDirectory(t), o = xe.pattern.getPatternsInsideCurrentDirectory(t), a = Vi(s), l = Vi(
    o);
    return i.push(...Yi(a, e, r)), "." in l ? i.push(zi(".", o, e, r)) : i.push(...Yi(l, e, r)), i;
  }
  n(Gi, "convertPatternsToTasks");
  re.convertPatternsToTasks = Gi;
  function vc(t) {
    return xe.pattern.getPositivePatterns(t);
  }
  n(vc, "getPositivePatterns");
  re.getPositivePatterns = vc;
  function wc(t, e) {
    return xe.pattern.getNegativePatterns(t).concat(e).map(xe.pattern.convertToPositivePattern);
  }
  n(wc, "getNegativePatternsAsPositive");
  re.getNegativePatternsAsPositive = wc;
  function Vi(t) {
    let e = {};
    return t.reduce((r, i) => {
      let s = xe.pattern.getBaseDirectory(i);
      return s in r ? r[s].push(i) : r[s] = [i], r;
    }, e);
  }
  n(Vi, "groupPatternsByBaseDirectory");
  re.groupPatternsByBaseDirectory = Vi;
  function Yi(t, e, r) {
    return Object.keys(t).map((i) => zi(i, t[i], e, r));
  }
  n(Yi, "convertPatternGroupsToTasks");
  re.convertPatternGroupsToTasks = Yi;
  function zi(t, e, r, i) {
    return {
      dynamic: i,
      positive: e,
      negative: r,
      base: t,
      patterns: [].concat(e, r.map(xe.pattern.convertToNegativePattern))
    };
  }
  n(zi, "convertPatternGroupToTask");
  re.convertPatternGroupToTask = zi;
});

// ../node_modules/@nodelib/fs.stat/out/providers/async.js
var Ac = d((xr) => {
  "use strict";
  Object.defineProperty(xr, "__esModule", { value: !0 });
  xr.read = void 0;
  function Cx(t, e, r) {
    e.fs.lstat(t, (i, s) => {
      if (i !== null) {
        Tc(r, i);
        return;
      }
      if (!s.isSymbolicLink() || !e.followSymbolicLink) {
        Ki(r, s);
        return;
      }
      e.fs.stat(t, (o, a) => {
        if (o !== null) {
          if (e.throwErrorOnBrokenSymbolicLink) {
            Tc(r, o);
            return;
          }
          Ki(r, s);
          return;
        }
        e.markSymbolicLink && (a.isSymbolicLink = () => !0), Ki(r, a);
      });
    });
  }
  n(Cx, "read");
  xr.read = Cx;
  function Tc(t, e) {
    t(e);
  }
  n(Tc, "callFailureCallback");
  function Ki(t, e) {
    t(null, e);
  }
  n(Ki, "callSuccessCallback");
});

// ../node_modules/@nodelib/fs.stat/out/providers/sync.js
var Pc = d((_r) => {
  "use strict";
  Object.defineProperty(_r, "__esModule", { value: !0 });
  _r.read = void 0;
  function Dx(t, e) {
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
  n(Dx, "read");
  _r.read = Dx;
});

// ../node_modules/@nodelib/fs.stat/out/adapters/fs.js
var Oc = d((Ve) => {
  "use strict";
  Object.defineProperty(Ve, "__esModule", { value: !0 });
  Ve.createFileSystemAdapter = Ve.FILE_SYSTEM_ADAPTER = void 0;
  var br = I("fs");
  Ve.FILE_SYSTEM_ADAPTER = {
    lstat: br.lstat,
    stat: br.stat,
    lstatSync: br.lstatSync,
    statSync: br.statSync
  };
  function Ix(t) {
    return t === void 0 ? Ve.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, Ve.FILE_SYSTEM_ADAPTER), t);
  }
  n(Ix, "createFileSystemAdapter");
  Ve.createFileSystemAdapter = Ix;
});

// ../node_modules/@nodelib/fs.stat/out/settings.js
var Cc = d((Xi) => {
  "use strict";
  Object.defineProperty(Xi, "__esModule", { value: !0 });
  var Nx = Oc(), Qi = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, !0), this.fs = Nx.createFileSystemAdapter(
      this._options.fs), this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, !1), this.throwErrorOnBrokenSymbolicLink = this.
      _getValue(this._options.throwErrorOnBrokenSymbolicLink, !0);
    }
    _getValue(e, r) {
      return e ?? r;
    }
  };
  Xi.default = Qi;
});

// ../node_modules/@nodelib/fs.stat/out/index.js
var lt = d((Ye) => {
  "use strict";
  Object.defineProperty(Ye, "__esModule", { value: !0 });
  Ye.statSync = Ye.stat = Ye.Settings = void 0;
  var Dc = Ac(), kx = Pc(), Zi = Cc();
  Ye.Settings = Zi.default;
  function Lx(t, e, r) {
    if (typeof e == "function") {
      Dc.read(t, Ji(), e);
      return;
    }
    Dc.read(t, Ji(e), r);
  }
  n(Lx, "stat");
  Ye.stat = Lx;
  function $x(t, e) {
    let r = Ji(e);
    return kx.read(t, r);
  }
  n($x, "statSync");
  Ye.statSync = $x;
  function Ji(t = {}) {
    return t instanceof Zi.default ? t : new Zi.default(t);
  }
  n(Ji, "getSettings");
});

// ../node_modules/queue-microtask/index.js
var kc = d((nO, Nc) => {
  var Ic;
  Nc.exports = typeof queueMicrotask == "function" ? queueMicrotask.bind(typeof window < "u" ? window : global) : (t) => (Ic || (Ic = Promise.
  resolve())).then(t).catch((e) => setTimeout(() => {
    throw e;
  }, 0));
});

// ../node_modules/run-parallel/index.js
var $c = d((oO, Lc) => {
  Lc.exports = qx;
  var Mx = kc();
  function qx(t, e) {
    let r, i, s, o = !0;
    Array.isArray(t) ? (r = [], i = t.length) : (s = Object.keys(t), r = {}, i = s.length);
    function a(c) {
      function u() {
        e && e(c, r), e = null;
      }
      n(u, "end"), o ? Mx(u) : u();
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
  n(qx, "runParallel");
});

// ../node_modules/@nodelib/fs.scandir/out/constants.js
var es = d((Sr) => {
  "use strict";
  Object.defineProperty(Sr, "__esModule", { value: !0 });
  Sr.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
  var Er = process.versions.node.split(".");
  if (Er[0] === void 0 || Er[1] === void 0)
    throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
  var Mc = Number.parseInt(Er[0], 10), jx = Number.parseInt(Er[1], 10), qc = 10, Fx = 10, Hx = Mc > qc, Bx = Mc === qc && jx >= Fx;
  Sr.IS_SUPPORT_READDIR_WITH_FILE_TYPES = Hx || Bx;
});

// ../node_modules/@nodelib/fs.scandir/out/utils/fs.js
var jc = d((vr) => {
  "use strict";
  Object.defineProperty(vr, "__esModule", { value: !0 });
  vr.createDirentFromStats = void 0;
  var ts = class {
    static {
      n(this, "DirentFromStats");
    }
    constructor(e, r) {
      this.name = e, this.isBlockDevice = r.isBlockDevice.bind(r), this.isCharacterDevice = r.isCharacterDevice.bind(r), this.isDirectory = r.
      isDirectory.bind(r), this.isFIFO = r.isFIFO.bind(r), this.isFile = r.isFile.bind(r), this.isSocket = r.isSocket.bind(r), this.isSymbolicLink =
      r.isSymbolicLink.bind(r);
    }
  };
  function Ux(t, e) {
    return new ts(t, e);
  }
  n(Ux, "createDirentFromStats");
  vr.createDirentFromStats = Ux;
});

// ../node_modules/@nodelib/fs.scandir/out/utils/index.js
var rs = d((wr) => {
  "use strict";
  Object.defineProperty(wr, "__esModule", { value: !0 });
  wr.fs = void 0;
  var Wx = jc();
  wr.fs = Wx;
});

// ../node_modules/@nodelib/fs.scandir/out/providers/common.js
var is = d((Rr) => {
  "use strict";
  Object.defineProperty(Rr, "__esModule", { value: !0 });
  Rr.joinPathSegments = void 0;
  function Gx(t, e, r) {
    return t.endsWith(r) ? t + e : t + r + e;
  }
  n(Gx, "joinPathSegments");
  Rr.joinPathSegments = Gx;
});

// ../node_modules/@nodelib/fs.scandir/out/providers/async.js
var Gc = d((ze) => {
  "use strict";
  Object.defineProperty(ze, "__esModule", { value: !0 });
  ze.readdir = ze.readdirWithFileTypes = ze.read = void 0;
  var Vx = lt(), Fc = $c(), Yx = es(), Hc = rs(), Bc = is();
  function zx(t, e, r) {
    if (!e.stats && Yx.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
      Uc(t, e, r);
      return;
    }
    Wc(t, e, r);
  }
  n(zx, "read");
  ze.read = zx;
  function Uc(t, e, r) {
    e.fs.readdir(t, { withFileTypes: !0 }, (i, s) => {
      if (i !== null) {
        Tr(r, i);
        return;
      }
      let o = s.map((l) => ({
        dirent: l,
        name: l.name,
        path: Bc.joinPathSegments(t, l.name, e.pathSegmentSeparator)
      }));
      if (!e.followSymbolicLinks) {
        ss(r, o);
        return;
      }
      let a = o.map((l) => Kx(l, e));
      Fc(a, (l, c) => {
        if (l !== null) {
          Tr(r, l);
          return;
        }
        ss(r, c);
      });
    });
  }
  n(Uc, "readdirWithFileTypes");
  ze.readdirWithFileTypes = Uc;
  function Kx(t, e) {
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
        t.dirent = Hc.fs.createDirentFromStats(t.name, s), r(null, t);
      });
    };
  }
  n(Kx, "makeRplTaskEntry");
  function Wc(t, e, r) {
    e.fs.readdir(t, (i, s) => {
      if (i !== null) {
        Tr(r, i);
        return;
      }
      let o = s.map((a) => {
        let l = Bc.joinPathSegments(t, a, e.pathSegmentSeparator);
        return (c) => {
          Vx.stat(l, e.fsStatSettings, (u, h) => {
            if (u !== null) {
              c(u);
              return;
            }
            let m = {
              name: a,
              path: l,
              dirent: Hc.fs.createDirentFromStats(a, h)
            };
            e.stats && (m.stats = h), c(null, m);
          });
        };
      });
      Fc(o, (a, l) => {
        if (a !== null) {
          Tr(r, a);
          return;
        }
        ss(r, l);
      });
    });
  }
  n(Wc, "readdir");
  ze.readdir = Wc;
  function Tr(t, e) {
    t(e);
  }
  n(Tr, "callFailureCallback");
  function ss(t, e) {
    t(null, e);
  }
  n(ss, "callSuccessCallback");
});

// ../node_modules/@nodelib/fs.scandir/out/providers/sync.js
var Qc = d((Ke) => {
  "use strict";
  Object.defineProperty(Ke, "__esModule", { value: !0 });
  Ke.readdir = Ke.readdirWithFileTypes = Ke.read = void 0;
  var Qx = lt(), Xx = es(), Vc = rs(), Yc = is();
  function Zx(t, e) {
    return !e.stats && Xx.IS_SUPPORT_READDIR_WITH_FILE_TYPES ? zc(t, e) : Kc(t, e);
  }
  n(Zx, "read");
  Ke.read = Zx;
  function zc(t, e) {
    return e.fs.readdirSync(t, { withFileTypes: !0 }).map((i) => {
      let s = {
        dirent: i,
        name: i.name,
        path: Yc.joinPathSegments(t, i.name, e.pathSegmentSeparator)
      };
      if (s.dirent.isSymbolicLink() && e.followSymbolicLinks)
        try {
          let o = e.fs.statSync(s.path);
          s.dirent = Vc.fs.createDirentFromStats(s.name, o);
        } catch (o) {
          if (e.throwErrorOnBrokenSymbolicLink)
            throw o;
        }
      return s;
    });
  }
  n(zc, "readdirWithFileTypes");
  Ke.readdirWithFileTypes = zc;
  function Kc(t, e) {
    return e.fs.readdirSync(t).map((i) => {
      let s = Yc.joinPathSegments(t, i, e.pathSegmentSeparator), o = Qx.statSync(s, e.fsStatSettings), a = {
        name: i,
        path: s,
        dirent: Vc.fs.createDirentFromStats(i, o)
      };
      return e.stats && (a.stats = o), a;
    });
  }
  n(Kc, "readdir");
  Ke.readdir = Kc;
});

// ../node_modules/@nodelib/fs.scandir/out/adapters/fs.js
var Xc = d((Qe) => {
  "use strict";
  Object.defineProperty(Qe, "__esModule", { value: !0 });
  Qe.createFileSystemAdapter = Qe.FILE_SYSTEM_ADAPTER = void 0;
  var xt = I("fs");
  Qe.FILE_SYSTEM_ADAPTER = {
    lstat: xt.lstat,
    stat: xt.stat,
    lstatSync: xt.lstatSync,
    statSync: xt.statSync,
    readdir: xt.readdir,
    readdirSync: xt.readdirSync
  };
  function Jx(t) {
    return t === void 0 ? Qe.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, Qe.FILE_SYSTEM_ADAPTER), t);
  }
  n(Jx, "createFileSystemAdapter");
  Qe.createFileSystemAdapter = Jx;
});

// ../node_modules/@nodelib/fs.scandir/out/settings.js
var Zc = d((os) => {
  "use strict";
  Object.defineProperty(os, "__esModule", { value: !0 });
  var e_ = I("path"), t_ = lt(), r_ = Xc(), ns = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !1), this.fs = r_.createFileSystemAdapter(
      this._options.fs), this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, e_.sep), this.stats = this._getValue(
      this._options.stats, !1), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, !0), this.
      fsStatSettings = new t_.Settings({
        followSymbolicLink: this.followSymbolicLinks,
        fs: this.fs,
        throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
      });
    }
    _getValue(e, r) {
      return e ?? r;
    }
  };
  os.default = ns;
});

// ../node_modules/@nodelib/fs.scandir/out/index.js
var Ar = d((Xe) => {
  "use strict";
  Object.defineProperty(Xe, "__esModule", { value: !0 });
  Xe.Settings = Xe.scandirSync = Xe.scandir = void 0;
  var Jc = Gc(), i_ = Qc(), as = Zc();
  Xe.Settings = as.default;
  function s_(t, e, r) {
    if (typeof e == "function") {
      Jc.read(t, ls(), e);
      return;
    }
    Jc.read(t, ls(e), r);
  }
  n(s_, "scandir");
  Xe.scandir = s_;
  function n_(t, e) {
    let r = ls(e);
    return i_.read(t, r);
  }
  n(n_, "scandirSync");
  Xe.scandirSync = n_;
  function ls(t = {}) {
    return t instanceof as.default ? t : new as.default(t);
  }
  n(ls, "getSettings");
});

// ../node_modules/reusify/reusify.js
var tu = d((wO, eu) => {
  "use strict";
  function o_(t) {
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
  n(o_, "reusify");
  eu.exports = o_;
});

// ../node_modules/fastq/queue.js
var iu = d((TO, cs) => {
  "use strict";
  var a_ = tu();
  function ru(t, e, r) {
    if (typeof t == "function" && (r = e, e = t, t = null), r < 1)
      throw new Error("fastqueue concurrency must be greater than 1");
    var i = a_(l_), s = null, o = null, a = 0, l = null, c = {
      push: b,
      drain: fe,
      saturated: fe,
      pause: h,
      paused: !1,
      concurrency: r,
      running: u,
      resume: v,
      idle: g,
      length: m,
      getQueue: p,
      unshift: R,
      empty: fe,
      kill: $,
      killAndDrain: D,
      error: F
    };
    return c;
    function u() {
      return a;
    }
    function h() {
      c.paused = !0;
    }
    function m() {
      for (var C = s, k = 0; C; )
        C = C.next, k++;
      return k;
    }
    function p() {
      for (var C = s, k = []; C; )
        k.push(C.value), C = C.next;
      return k;
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
    function b(C, k) {
      var O = i.get();
      O.context = t, O.release = T, O.value = C, O.callback = k || fe, O.errorHandler = l, a === c.concurrency || c.paused ? o ? (o.next = O,
      o = O) : (s = O, o = O, c.saturated()) : (a++, e.call(t, O.value, O.worked));
    }
    function R(C, k) {
      var O = i.get();
      O.context = t, O.release = T, O.value = C, O.callback = k || fe, a === c.concurrency || c.paused ? s ? (O.next = s, s = O) : (s = O, o =
      O, c.saturated()) : (a++, e.call(t, O.value, O.worked));
    }
    function T(C) {
      C && i.release(C);
      var k = s;
      k ? c.paused ? a-- : (o === s && (o = null), s = k.next, k.next = null, e.call(t, k.value, k.worked), o === null && c.empty()) : --a ===
      0 && c.drain();
    }
    function $() {
      s = null, o = null, c.drain = fe;
    }
    function D() {
      s = null, o = null, c.drain(), c.drain = fe;
    }
    function F(C) {
      l = C;
    }
  }
  n(ru, "fastqueue");
  function fe() {
  }
  n(fe, "noop");
  function l_() {
    this.value = null, this.callback = fe, this.next = null, this.release = fe, this.context = null, this.errorHandler = null;
    var t = this;
    this.worked = /* @__PURE__ */ n(function(r, i) {
      var s = t.callback, o = t.errorHandler, a = t.value;
      t.value = null, t.callback = fe, t.errorHandler && o(r, a), s.call(t.context, r, i), t.release(t);
    }, "worked");
  }
  n(l_, "Task");
  function c_(t, e, r) {
    typeof t == "function" && (r = e, e = t, t = null);
    function i(h, m) {
      e.call(this, h).then(function(p) {
        m(null, p);
      }, m);
    }
    n(i, "asyncWrapper");
    var s = ru(t, i, r), o = s.push, a = s.unshift;
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
      return m.catch(fe), m;
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
      return m.catch(fe), m;
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
  n(c_, "queueAsPromised");
  cs.exports = ru;
  cs.exports.promise = c_;
});

// ../node_modules/@nodelib/fs.walk/out/readers/common.js
var Pr = d((Te) => {
  "use strict";
  Object.defineProperty(Te, "__esModule", { value: !0 });
  Te.joinPathSegments = Te.replacePathSegmentSeparator = Te.isAppliedFilter = Te.isFatalError = void 0;
  function u_(t, e) {
    return t.errorFilter === null ? !0 : !t.errorFilter(e);
  }
  n(u_, "isFatalError");
  Te.isFatalError = u_;
  function h_(t, e) {
    return t === null || t(e);
  }
  n(h_, "isAppliedFilter");
  Te.isAppliedFilter = h_;
  function p_(t, e) {
    return t.split(/[/\\]/).join(e);
  }
  n(p_, "replacePathSegmentSeparator");
  Te.replacePathSegmentSeparator = p_;
  function d_(t, e, r) {
    return t === "" ? e : t.endsWith(r) ? t + e : t + r + e;
  }
  n(d_, "joinPathSegments");
  Te.joinPathSegments = d_;
});

// ../node_modules/@nodelib/fs.walk/out/readers/reader.js
var ps = d((hs) => {
  "use strict";
  Object.defineProperty(hs, "__esModule", { value: !0 });
  var f_ = Pr(), us = class {
    static {
      n(this, "Reader");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._root = f_.replacePathSegmentSeparator(e, r.pathSegmentSeparator);
    }
  };
  hs.default = us;
});

// ../node_modules/@nodelib/fs.walk/out/readers/async.js
var ms = d((fs) => {
  "use strict";
  Object.defineProperty(fs, "__esModule", { value: !0 });
  var m_ = I("events"), g_ = Ar(), y_ = iu(), Or = Pr(), x_ = ps(), ds = class extends x_.default {
    static {
      n(this, "AsyncReader");
    }
    constructor(e, r) {
      super(e, r), this._settings = r, this._scandir = g_.scandir, this._emitter = new m_.EventEmitter(), this._queue = y_(this._worker.bind(
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
      this._isDestroyed || !Or.isFatalError(this._settings, e) || (this._isFatalError = !0, this._isDestroyed = !0, this._emitter.emit("erro\
r", e));
    }
    _handleEntry(e, r) {
      if (this._isDestroyed || this._isFatalError)
        return;
      let i = e.path;
      r !== void 0 && (e.path = Or.joinPathSegments(r, e.name, this._settings.pathSegmentSeparator)), Or.isAppliedFilter(this._settings.entryFilter,
      e) && this._emitEntry(e), e.dirent.isDirectory() && Or.isAppliedFilter(this._settings.deepFilter, e) && this._pushToQueue(i, r === void 0 ?
      void 0 : e.path);
    }
    _emitEntry(e) {
      this._emitter.emit("entry", e);
    }
  };
  fs.default = ds;
});

// ../node_modules/@nodelib/fs.walk/out/providers/async.js
var su = d((ys) => {
  "use strict";
  Object.defineProperty(ys, "__esModule", { value: !0 });
  var __ = ms(), gs = class {
    static {
      n(this, "AsyncProvider");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._reader = new __.default(this._root, this._settings), this._storage = [];
    }
    read(e) {
      this._reader.onError((r) => {
        b_(e, r);
      }), this._reader.onEntry((r) => {
        this._storage.push(r);
      }), this._reader.onEnd(() => {
        E_(e, this._storage);
      }), this._reader.read();
    }
  };
  ys.default = gs;
  function b_(t, e) {
    t(e);
  }
  n(b_, "callFailureCallback");
  function E_(t, e) {
    t(null, e);
  }
  n(E_, "callSuccessCallback");
});

// ../node_modules/@nodelib/fs.walk/out/providers/stream.js
var nu = d((_s) => {
  "use strict";
  Object.defineProperty(_s, "__esModule", { value: !0 });
  var S_ = I("stream"), v_ = ms(), xs = class {
    static {
      n(this, "StreamProvider");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._reader = new v_.default(this._root, this._settings), this._stream = new S_.Readable({
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
  _s.default = xs;
});

// ../node_modules/@nodelib/fs.walk/out/readers/sync.js
var ou = d((Es) => {
  "use strict";
  Object.defineProperty(Es, "__esModule", { value: !0 });
  var w_ = Ar(), Cr = Pr(), R_ = ps(), bs = class extends R_.default {
    static {
      n(this, "SyncReader");
    }
    constructor() {
      super(...arguments), this._scandir = w_.scandirSync, this._storage = [], this._queue = /* @__PURE__ */ new Set();
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
      if (Cr.isFatalError(this._settings, e))
        throw e;
    }
    _handleEntry(e, r) {
      let i = e.path;
      r !== void 0 && (e.path = Cr.joinPathSegments(r, e.name, this._settings.pathSegmentSeparator)), Cr.isAppliedFilter(this._settings.entryFilter,
      e) && this._pushToStorage(e), e.dirent.isDirectory() && Cr.isAppliedFilter(this._settings.deepFilter, e) && this._pushToQueue(i, r ===
      void 0 ? void 0 : e.path);
    }
    _pushToStorage(e) {
      this._storage.push(e);
    }
  };
  Es.default = bs;
});

// ../node_modules/@nodelib/fs.walk/out/providers/sync.js
var au = d((vs) => {
  "use strict";
  Object.defineProperty(vs, "__esModule", { value: !0 });
  var T_ = ou(), Ss = class {
    static {
      n(this, "SyncProvider");
    }
    constructor(e, r) {
      this._root = e, this._settings = r, this._reader = new T_.default(this._root, this._settings);
    }
    read() {
      return this._reader.read();
    }
  };
  vs.default = Ss;
});

// ../node_modules/@nodelib/fs.walk/out/settings.js
var lu = d((Rs) => {
  "use strict";
  Object.defineProperty(Rs, "__esModule", { value: !0 });
  var A_ = I("path"), P_ = Ar(), ws = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.basePath = this._getValue(this._options.basePath, void 0), this.concurrency = this._getValue(this._options.concurrency,
      Number.POSITIVE_INFINITY), this.deepFilter = this._getValue(this._options.deepFilter, null), this.entryFilter = this._getValue(this._options.
      entryFilter, null), this.errorFilter = this._getValue(this._options.errorFilter, null), this.pathSegmentSeparator = this._getValue(this.
      _options.pathSegmentSeparator, A_.sep), this.fsScandirSettings = new P_.Settings({
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
  Rs.default = ws;
});

// ../node_modules/@nodelib/fs.walk/out/index.js
var Ir = d((Ae) => {
  "use strict";
  Object.defineProperty(Ae, "__esModule", { value: !0 });
  Ae.Settings = Ae.walkStream = Ae.walkSync = Ae.walk = void 0;
  var cu = su(), O_ = nu(), C_ = au(), Ts = lu();
  Ae.Settings = Ts.default;
  function D_(t, e, r) {
    if (typeof e == "function") {
      new cu.default(t, Dr()).read(e);
      return;
    }
    new cu.default(t, Dr(e)).read(r);
  }
  n(D_, "walk");
  Ae.walk = D_;
  function I_(t, e) {
    let r = Dr(e);
    return new C_.default(t, r).read();
  }
  n(I_, "walkSync");
  Ae.walkSync = I_;
  function N_(t, e) {
    let r = Dr(e);
    return new O_.default(t, r).read();
  }
  n(N_, "walkStream");
  Ae.walkStream = N_;
  function Dr(t = {}) {
    return t instanceof Ts.default ? t : new Ts.default(t);
  }
  n(Dr, "getSettings");
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/reader.js
var Nr = d((Ps) => {
  "use strict";
  Object.defineProperty(Ps, "__esModule", { value: !0 });
  var k_ = I("path"), L_ = lt(), uu = Le(), As = class {
    static {
      n(this, "Reader");
    }
    constructor(e) {
      this._settings = e, this._fsStatSettings = new L_.Settings({
        followSymbolicLink: this._settings.followSymbolicLinks,
        fs: this._settings.fs,
        throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
      });
    }
    _getFullEntryPath(e) {
      return k_.resolve(this._settings.cwd, e);
    }
    _makeEntry(e, r) {
      let i = {
        name: r,
        path: r,
        dirent: uu.fs.createDirentFromStats(r, e)
      };
      return this._settings.stats && (i.stats = e), i;
    }
    _isFatalError(e) {
      return !uu.errno.isEnoentCodeError(e) && !this._settings.suppressErrors;
    }
  };
  Ps.default = As;
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/stream.js
var Ds = d((Cs) => {
  "use strict";
  Object.defineProperty(Cs, "__esModule", { value: !0 });
  var $_ = I("stream"), M_ = lt(), q_ = Ir(), j_ = Nr(), Os = class extends j_.default {
    static {
      n(this, "ReaderStream");
    }
    constructor() {
      super(...arguments), this._walkStream = q_.walkStream, this._stat = M_.stat;
    }
    dynamic(e, r) {
      return this._walkStream(e, r);
    }
    static(e, r) {
      let i = e.map(this._getFullEntryPath, this), s = new $_.PassThrough({ objectMode: !0 });
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
  Cs.default = Os;
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/async.js
var hu = d((Ns) => {
  "use strict";
  Object.defineProperty(Ns, "__esModule", { value: !0 });
  var F_ = Ir(), H_ = Nr(), B_ = Ds(), Is = class extends H_.default {
    static {
      n(this, "ReaderAsync");
    }
    constructor() {
      super(...arguments), this._walkAsync = F_.walk, this._readerStream = new B_.default(this._settings);
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
  Ns.default = Is;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/matchers/matcher.js
var pu = d((Ls) => {
  "use strict";
  Object.defineProperty(Ls, "__esModule", { value: !0 });
  var qt = Le(), ks = class {
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
      return qt.pattern.getPatternParts(e, this._micromatchOptions).map((i) => qt.pattern.isDynamicPattern(i, this._settings) ? {
        dynamic: !0,
        pattern: i,
        patternRe: qt.pattern.makeRe(i, this._micromatchOptions)
      } : {
        dynamic: !1,
        pattern: i
      });
    }
    _splitSegmentsIntoSections(e) {
      return qt.array.splitWhen(e, (r) => r.dynamic && qt.pattern.hasGlobStar(r.pattern));
    }
  };
  Ls.default = ks;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/matchers/partial.js
var du = d((Ms) => {
  "use strict";
  Object.defineProperty(Ms, "__esModule", { value: !0 });
  var U_ = pu(), $s = class extends U_.default {
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
  Ms.default = $s;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/filters/deep.js
var fu = d((js) => {
  "use strict";
  Object.defineProperty(js, "__esModule", { value: !0 });
  var kr = Le(), W_ = du(), qs = class {
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
      return new W_.default(e, this._settings, this._micromatchOptions);
    }
    _getNegativePatternsRe(e) {
      let r = e.filter(kr.pattern.isAffectDepthOfReadingPattern);
      return kr.pattern.convertPatternsToRe(r, this._micromatchOptions);
    }
    _filter(e, r, i, s) {
      if (this._isSkippedByDeep(e, r.path) || this._isSkippedSymbolicLink(r))
        return !1;
      let o = kr.path.removeLeadingDotSegment(r.path);
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
      return !kr.pattern.matchAny(e, r);
    }
  };
  js.default = qs;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/filters/entry.js
var mu = d((Hs) => {
  "use strict";
  Object.defineProperty(Hs, "__esModule", { value: !0 });
  var ct = Le(), Fs = class {
    static {
      n(this, "EntryFilter");
    }
    constructor(e, r) {
      this._settings = e, this._micromatchOptions = r, this.index = /* @__PURE__ */ new Map();
    }
    getFilter(e, r) {
      let i = ct.pattern.convertPatternsToRe(e, this._micromatchOptions), s = ct.pattern.convertPatternsToRe(r, Object.assign(Object.assign(
      {}, this._micromatchOptions), { dot: !0 }));
      return (o) => this._filter(o, i, s);
    }
    _filter(e, r, i) {
      let s = ct.path.removeLeadingDotSegment(e.path);
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
      let i = ct.path.makeAbsolute(this._settings.cwd, e);
      return ct.pattern.matchAny(i, r);
    }
    _isMatchToPatterns(e, r, i) {
      let s = ct.pattern.matchAny(e, r);
      return !s && i ? ct.pattern.matchAny(e + "/", r) : s;
    }
  };
  Hs.default = Fs;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/filters/error.js
var gu = d((Us) => {
  "use strict";
  Object.defineProperty(Us, "__esModule", { value: !0 });
  var G_ = Le(), Bs = class {
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
      return G_.errno.isEnoentCodeError(e) || this._settings.suppressErrors;
    }
  };
  Us.default = Bs;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/transformers/entry.js
var xu = d((Gs) => {
  "use strict";
  Object.defineProperty(Gs, "__esModule", { value: !0 });
  var yu = Le(), Ws = class {
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
      return this._settings.absolute && (r = yu.path.makeAbsolute(this._settings.cwd, r), r = yu.path.unixify(r)), this._settings.markDirectories &&
      e.dirent.isDirectory() && (r += "/"), this._settings.objectMode ? Object.assign(Object.assign({}, e), { path: r }) : r;
    }
  };
  Gs.default = Ws;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/provider.js
var Lr = d((Ys) => {
  "use strict";
  Object.defineProperty(Ys, "__esModule", { value: !0 });
  var V_ = I("path"), Y_ = fu(), z_ = mu(), K_ = gu(), Q_ = xu(), Vs = class {
    static {
      n(this, "Provider");
    }
    constructor(e) {
      this._settings = e, this.errorFilter = new K_.default(this._settings), this.entryFilter = new z_.default(this._settings, this._getMicromatchOptions()),
      this.deepFilter = new Y_.default(this._settings, this._getMicromatchOptions()), this.entryTransformer = new Q_.default(this._settings);
    }
    _getRootDirectory(e) {
      return V_.resolve(this._settings.cwd, e.base);
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
  Ys.default = Vs;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/async.js
var _u = d((Ks) => {
  "use strict";
  Object.defineProperty(Ks, "__esModule", { value: !0 });
  var X_ = hu(), Z_ = Lr(), zs = class extends Z_.default {
    static {
      n(this, "ProviderAsync");
    }
    constructor() {
      super(...arguments), this._reader = new X_.default(this._settings);
    }
    async read(e) {
      let r = this._getRootDirectory(e), i = this._getReaderOptions(e);
      return (await this.api(r, e, i)).map((o) => i.transform(o));
    }
    api(e, r, i) {
      return r.dynamic ? this._reader.dynamic(e, i) : this._reader.static(r.patterns, i);
    }
  };
  Ks.default = zs;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/stream.js
var bu = d((Xs) => {
  "use strict";
  Object.defineProperty(Xs, "__esModule", { value: !0 });
  var J_ = I("stream"), eb = Ds(), tb = Lr(), Qs = class extends tb.default {
    static {
      n(this, "ProviderStream");
    }
    constructor() {
      super(...arguments), this._reader = new eb.default(this._settings);
    }
    read(e) {
      let r = this._getRootDirectory(e), i = this._getReaderOptions(e), s = this.api(r, e, i), o = new J_.Readable({ objectMode: !0, read: /* @__PURE__ */ n(
      () => {
      }, "read") });
      return s.once("error", (a) => o.emit("error", a)).on("data", (a) => o.emit("data", i.transform(a))).once("end", () => o.emit("end")), o.
      once("close", () => s.destroy()), o;
    }
    api(e, r, i) {
      return r.dynamic ? this._reader.dynamic(e, i) : this._reader.static(r.patterns, i);
    }
  };
  Xs.default = Qs;
});

// ../node_modules/globby/node_modules/fast-glob/out/readers/sync.js
var Eu = d((Js) => {
  "use strict";
  Object.defineProperty(Js, "__esModule", { value: !0 });
  var rb = lt(), ib = Ir(), sb = Nr(), Zs = class extends sb.default {
    static {
      n(this, "ReaderSync");
    }
    constructor() {
      super(...arguments), this._walkSync = ib.walkSync, this._statSync = rb.statSync;
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
  Js.default = Zs;
});

// ../node_modules/globby/node_modules/fast-glob/out/providers/sync.js
var Su = d((tn) => {
  "use strict";
  Object.defineProperty(tn, "__esModule", { value: !0 });
  var nb = Eu(), ob = Lr(), en = class extends ob.default {
    static {
      n(this, "ProviderSync");
    }
    constructor() {
      super(...arguments), this._reader = new nb.default(this._settings);
    }
    read(e) {
      let r = this._getRootDirectory(e), i = this._getReaderOptions(e);
      return this.api(r, e, i).map(i.transform);
    }
    api(e, r, i) {
      return r.dynamic ? this._reader.dynamic(e, i) : this._reader.static(r.patterns, i);
    }
  };
  tn.default = en;
});

// ../node_modules/globby/node_modules/fast-glob/out/settings.js
var vu = d((bt) => {
  "use strict";
  Object.defineProperty(bt, "__esModule", { value: !0 });
  bt.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
  var _t = I("fs"), ab = I("os"), lb = Math.max(ab.cpus().length, 1);
  bt.DEFAULT_FILE_SYSTEM_ADAPTER = {
    lstat: _t.lstat,
    lstatSync: _t.lstatSync,
    stat: _t.stat,
    statSync: _t.statSync,
    readdir: _t.readdir,
    readdirSync: _t.readdirSync
  };
  var rn = class {
    static {
      n(this, "Settings");
    }
    constructor(e = {}) {
      this._options = e, this.absolute = this._getValue(this._options.absolute, !1), this.baseNameMatch = this._getValue(this._options.baseNameMatch,
      !1), this.braceExpansion = this._getValue(this._options.braceExpansion, !0), this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch,
      !0), this.concurrency = this._getValue(this._options.concurrency, lb), this.cwd = this._getValue(this._options.cwd, process.cwd()), this.
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
      return Object.assign(Object.assign({}, bt.DEFAULT_FILE_SYSTEM_ADAPTER), e);
    }
  };
  bt.default = rn;
});

// ../node_modules/globby/node_modules/fast-glob/out/index.js
var an = d((SC, Ru) => {
  "use strict";
  var wu = Rc(), cb = _u(), ub = bu(), hb = Su(), sn = vu(), me = Le();
  async function nn(t, e) {
    _e(t);
    let r = on(t, cb.default, e), i = await Promise.all(r);
    return me.array.flatten(i);
  }
  n(nn, "FastGlob");
  (function(t) {
    t.glob = t, t.globSync = e, t.globStream = r, t.async = t;
    function e(u, h) {
      _e(u);
      let m = on(u, hb.default, h);
      return me.array.flatten(m);
    }
    n(e, "sync"), t.sync = e;
    function r(u, h) {
      _e(u);
      let m = on(u, ub.default, h);
      return me.stream.merge(m);
    }
    n(r, "stream"), t.stream = r;
    function i(u, h) {
      _e(u);
      let m = [].concat(u), p = new sn.default(h);
      return wu.generate(m, p);
    }
    n(i, "generateTasks"), t.generateTasks = i;
    function s(u, h) {
      _e(u);
      let m = new sn.default(h);
      return me.pattern.isDynamicPattern(u, m);
    }
    n(s, "isDynamicPattern"), t.isDynamicPattern = s;
    function o(u) {
      return _e(u), me.path.escape(u);
    }
    n(o, "escapePath"), t.escapePath = o;
    function a(u) {
      return _e(u), me.path.convertPathToPattern(u);
    }
    n(a, "convertPathToPattern"), t.convertPathToPattern = a;
    let l;
    (function(u) {
      function h(p) {
        return _e(p), me.path.escapePosixPath(p);
      }
      n(h, "escapePath"), u.escapePath = h;
      function m(p) {
        return _e(p), me.path.convertPosixPathToPattern(p);
      }
      n(m, "convertPathToPattern"), u.convertPathToPattern = m;
    })(l = t.posix || (t.posix = {}));
    let c;
    (function(u) {
      function h(p) {
        return _e(p), me.path.escapeWindowsPath(p);
      }
      n(h, "escapePath"), u.escapePath = h;
      function m(p) {
        return _e(p), me.path.convertWindowsPathToPattern(p);
      }
      n(m, "convertPathToPattern"), u.convertPathToPattern = m;
    })(c = t.win32 || (t.win32 = {}));
  })(nn || (nn = {}));
  function on(t, e, r) {
    let i = [].concat(t), s = new sn.default(r), o = wu.generate(i, s), a = new e(s);
    return o.map(a.read, a);
  }
  n(on, "getWorks");
  function _e(t) {
    if (![].concat(t).every((i) => me.string.isString(i) && !me.string.isEmpty(i)))
      throw new TypeError("Patterns must be a string (non empty) or an array of strings");
  }
  n(_e, "assertPatternsInput");
  Ru.exports = nn;
});

// ../node_modules/globby/node_modules/path-type/index.js
import pb, { promises as db } from "fs";
async function ln(t, e, r) {
  if (typeof r != "string")
    throw new TypeError(`Expected a string, got ${typeof r}`);
  try {
    return (await db[t](r))[e]();
  } catch (i) {
    if (i.code === "ENOENT")
      return !1;
    throw i;
  }
}
function cn(t, e, r) {
  if (typeof r != "string")
    throw new TypeError(`Expected a string, got ${typeof r}`);
  try {
    return pb[t](r)[e]();
  } catch (i) {
    if (i.code === "ENOENT")
      return !1;
    throw i;
  }
}
var RC, Tu, TC, AC, Au, PC, Pu = he(() => {
  n(ln, "isType");
  n(cn, "isTypeSync");
  RC = ln.bind(null, "stat", "isFile"), Tu = ln.bind(null, "stat", "isDirectory"), TC = ln.bind(null, "lstat", "isSymbolicLink"), AC = cn.bind(
  null, "statSync", "isFile"), Au = cn.bind(null, "statSync", "isDirectory"), PC = cn.bind(null, "lstatSync", "isSymbolicLink");
});

// ../node_modules/unicorn-magic/default.js
var Ou = he(() => {
});

// ../node_modules/unicorn-magic/node.js
import { fileURLToPath as fb } from "node:url";
function jt(t) {
  return t instanceof URL ? fb(t) : t;
}
var un = he(() => {
  Ou();
  n(jt, "toPath");
});

// ../node_modules/ignore/index.js
var qu = d((MC, Mu) => {
  function Cu(t) {
    return Array.isArray(t) ? t : [t];
  }
  n(Cu, "makeArray");
  var dn = "", Du = " ", hn = "\\", mb = /^\s+$/, gb = /(?:[^\\]|^)\\$/, yb = /^\\!/, xb = /^\\#/, _b = /\r?\n/g, bb = /^\.*\/|^\.+$/, pn = "\
/", ku = "node-ignore";
  typeof Symbol < "u" && (ku = Symbol.for("node-ignore"));
  var Iu = ku, Eb = /* @__PURE__ */ n((t, e, r) => Object.defineProperty(t, e, { value: r }), "define"), Sb = /([0-z])-([0-z])/g, Lu = /* @__PURE__ */ n(
  () => !1, "RETURN_FALSE"), vb = /* @__PURE__ */ n((t) => t.replace(
    Sb,
    (e, r, i) => r.charCodeAt(0) <= i.charCodeAt(0) ? e : dn
  ), "sanitizeRange"), wb = /* @__PURE__ */ n((t) => {
    let { length: e } = t;
    return t.slice(0, e - e % 2);
  }, "cleanRangeBackSlash"), Rb = [
    [
      // remove BOM
      // TODO:
      // Other similar zero-width characters?
      /^\uFEFF/,
      () => dn
    ],
    // > Trailing spaces are ignored unless they are quoted with backslash ("\")
    [
      // (a\ ) -> (a )
      // (a  ) -> (a)
      // (a ) -> (a)
      // (a \ ) -> (a  )
      /((?:\\\\)*?)(\\?\s+)$/,
      (t, e, r) => e + (r.indexOf("\\") === 0 ? Du : dn)
    ],
    // replace (\ ) with ' '
    // (\ ) -> ' '
    // (\\ ) -> '\\ '
    // (\\\ ) -> '\\ '
    [
      /(\\+?)\s/g,
      (t, e) => {
        let { length: r } = e;
        return e.slice(0, r - r % 2) + Du;
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
      () => hn
    ],
    [
      // '\\\\' -> '\\'
      /\\\\/g,
      () => hn
    ],
    [
      // > The range notation, e.g. [a-zA-Z],
      // > can be used to match one of the characters in a range.
      // `\` is escaped by step 3
      /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
      (t, e, r, i, s) => e === hn ? `\\[${r}${wb(i)}${s}` : s === "]" && i.length % 2 === 0 ? `[${vb(r)}${i}]` : "[]"
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
  ], Nu = /* @__PURE__ */ Object.create(null), Tb = /* @__PURE__ */ n((t, e) => {
    let r = Nu[t];
    return r || (r = Rb.reduce(
      (i, [s, o]) => i.replace(s, o.bind(t)),
      t
    ), Nu[t] = r), e ? new RegExp(r, "i") : new RegExp(r);
  }, "makeRegex"), gn = /* @__PURE__ */ n((t) => typeof t == "string", "isString"), Ab = /* @__PURE__ */ n((t) => t && gn(t) && !mb.test(t) &&
  !gb.test(t) && t.indexOf("#") !== 0, "checkPattern"), Pb = /* @__PURE__ */ n((t) => t.split(_b), "splitPattern"), fn = class {
    static {
      n(this, "IgnoreRule");
    }
    constructor(e, r, i, s) {
      this.origin = e, this.pattern = r, this.negative = i, this.regex = s;
    }
  }, Ob = /* @__PURE__ */ n((t, e) => {
    let r = t, i = !1;
    t.indexOf("!") === 0 && (i = !0, t = t.substr(1)), t = t.replace(yb, "!").replace(xb, "#");
    let s = Tb(t, e);
    return new fn(
      r,
      t,
      i,
      s
    );
  }, "createRule"), Cb = /* @__PURE__ */ n((t, e) => {
    throw new e(t);
  }, "throwError"), $e = /* @__PURE__ */ n((t, e, r) => gn(t) ? t ? $e.isNotRelative(t) ? r(
    `path should be a \`path.relative()\`d string, but got "${e}"`,
    RangeError
  ) : !0 : r("path must not be empty", TypeError) : r(
    `path must be a string, but got \`${e}\``,
    TypeError
  ), "checkPath"), $u = /* @__PURE__ */ n((t) => bb.test(t), "isNotRelative");
  $e.isNotRelative = $u;
  $e.convert = (t) => t;
  var mn = class {
    static {
      n(this, "Ignore");
    }
    constructor({
      ignorecase: e = !0,
      ignoreCase: r = e,
      allowRelativePaths: i = !1
    } = {}) {
      Eb(this, Iu, !0), this._rules = [], this._ignoreCase = r, this._allowRelativePaths = i, this._initCache();
    }
    _initCache() {
      this._ignoreCache = /* @__PURE__ */ Object.create(null), this._testCache = /* @__PURE__ */ Object.create(null);
    }
    _addPattern(e) {
      if (e && e[Iu]) {
        this._rules = this._rules.concat(e._rules), this._added = !0;
        return;
      }
      if (Ab(e)) {
        let r = Ob(e, this._ignoreCase);
        this._added = !0, this._rules.push(r);
      }
    }
    // @param {Array<string> | string | Ignore} pattern
    add(e) {
      return this._added = !1, Cu(
        gn(e) ? Pb(e) : e
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
      let o = e && $e.convert(e);
      return $e(
        o,
        e,
        this._allowRelativePaths ? Lu : Cb
      ), this._t(o, r, i, s);
    }
    _t(e, r, i, s) {
      if (e in r)
        return r[e];
      if (s || (s = e.split(pn)), s.pop(), !s.length)
        return r[e] = this._testOne(e, i);
      let o = this._t(
        s.join(pn) + pn,
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
      return Cu(e).filter(this.createFilter());
    }
    // @returns {TestResult}
    test(e) {
      return this._test(e, this._testCache, !0);
    }
  }, $r = /* @__PURE__ */ n((t) => new mn(t), "factory"), Db = /* @__PURE__ */ n((t) => $e(t && $e.convert(t), t, Lu), "isPathValid");
  $r.isPathValid = Db;
  $r.default = $r;
  Mu.exports = $r;
  if (
    // Detect `process` so that it can run in browsers.
    typeof process < "u" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
  ) {
    let t = /* @__PURE__ */ n((r) => /^\\\\\?\\/.test(r) || /["<>|\u0000-\u001F]+/u.test(r) ? r : r.replace(/\\/g, "/"), "makePosix");
    $e.convert = t;
    let e = /^[a-z]:\//i;
    $e.isNotRelative = (r) => e.test(r) || $u(r);
  }
});

// ../node_modules/slash/index.js
function Et(t) {
  return t.startsWith("\\\\?\\") ? t : t.replace(/\\/g, "/");
}
var ju = he(() => {
  n(Et, "slash");
});

// ../node_modules/globby/utilities.js
var Ft, yn = he(() => {
  Ft = /* @__PURE__ */ n((t) => t[0] === "!", "isNegativePattern");
});

// ../node_modules/globby/ignore.js
import Ib from "node:process";
import Nb from "node:fs";
import kb from "node:fs/promises";
import St from "node:path";
var xn, Fu, Lb, Hu, Mr, $b, Mb, qb, Bu, Uu, _n, bn, Wu, Gu, En = he(() => {
  xn = pe(an(), 1), Fu = pe(qu(), 1);
  ju();
  un();
  yn();
  Lb = [
    "**/node_modules",
    "**/flow-typed",
    "**/coverage",
    "**/.git"
  ], Hu = {
    absolute: !0,
    dot: !0
  }, Mr = "**/.gitignore", $b = /* @__PURE__ */ n((t, e) => Ft(t) ? "!" + St.posix.join(e, t.slice(1)) : St.posix.join(e, t), "applyBaseToPa\
ttern"), Mb = /* @__PURE__ */ n((t, e) => {
    let r = Et(St.relative(e, St.dirname(t.filePath)));
    return t.content.split(/\r?\n/).filter((i) => i && !i.startsWith("#")).map((i) => $b(i, r));
  }, "parseIgnoreFile"), qb = /* @__PURE__ */ n((t, e) => {
    if (e = Et(e), St.isAbsolute(t)) {
      if (Et(t).startsWith(e))
        return St.relative(e, t);
      throw new Error(`Path ${t} is not in cwd ${e}`);
    }
    return t;
  }, "toRelativePath"), Bu = /* @__PURE__ */ n((t, e) => {
    let r = t.flatMap((s) => Mb(s, e)), i = (0, Fu.default)().add(r);
    return (s) => (s = jt(s), s = qb(s, e), s ? i.ignores(Et(s)) : !1);
  }, "getIsIgnoredPredicate"), Uu = /* @__PURE__ */ n((t = {}) => ({
    cwd: jt(t.cwd) ?? Ib.cwd(),
    suppressErrors: !!t.suppressErrors,
    deep: typeof t.deep == "number" ? t.deep : Number.POSITIVE_INFINITY,
    ignore: [...t.ignore ?? [], ...Lb]
  }), "normalizeOptions"), _n = /* @__PURE__ */ n(async (t, e) => {
    let { cwd: r, suppressErrors: i, deep: s, ignore: o } = Uu(e), a = await (0, xn.default)(t, {
      cwd: r,
      suppressErrors: i,
      deep: s,
      ignore: o,
      ...Hu
    }), l = await Promise.all(
      a.map(async (c) => ({
        filePath: c,
        content: await kb.readFile(c, "utf8")
      }))
    );
    return Bu(l, r);
  }, "isIgnoredByIgnoreFiles"), bn = /* @__PURE__ */ n((t, e) => {
    let { cwd: r, suppressErrors: i, deep: s, ignore: o } = Uu(e), l = xn.default.sync(t, {
      cwd: r,
      suppressErrors: i,
      deep: s,
      ignore: o,
      ...Hu
    }).map((c) => ({
      filePath: c,
      content: Nb.readFileSync(c, "utf8")
    }));
    return Bu(l, r);
  }, "isIgnoredByIgnoreFilesSync"), Wu = /* @__PURE__ */ n((t) => _n(Mr, t), "isGitIgnored"), Gu = /* @__PURE__ */ n((t) => bn(Mr, t), "isGi\
tIgnoredSync");
});

// ../node_modules/globby/index.js
var oh = {};
Ct(oh, {
  convertPathToPattern: () => Kb,
  generateGlobTasks: () => Yb,
  generateGlobTasksSync: () => zb,
  globby: () => Ub,
  globbyStream: () => Gb,
  globbySync: () => Wb,
  isDynamicPattern: () => Vb,
  isGitIgnored: () => Wu,
  isGitIgnoredSync: () => Gu
});
import zu from "node:process";
import jb from "node:fs";
import vt from "node:path";
var wt, Fb, Ku, Qu, Vu, Yu, Sn, Hb, Xu, Zu, qr, Ju, Bb, eh, th, rh, ih, sh, nh, vn, Ub, Wb, Gb, Vb, Yb, zb, Kb, ah = he(() => {
  qa();
  wt = pe(an(), 1);
  Pu();
  un();
  En();
  yn();
  En();
  Fb = /* @__PURE__ */ n((t) => {
    if (t.some((e) => typeof e != "string"))
      throw new TypeError("Patterns must be a string or an array of strings");
  }, "assertPatternsInput"), Ku = /* @__PURE__ */ n((t, e) => {
    let r = Ft(t) ? t.slice(1) : t;
    return vt.isAbsolute(r) ? r : vt.join(e, r);
  }, "normalizePathForDirectoryGlob"), Qu = /* @__PURE__ */ n(({ directoryPath: t, files: e, extensions: r }) => {
    let i = r?.length > 0 ? `.${r.length > 1 ? `{${r.join(",")}}` : r[0]}` : "";
    return e ? e.map((s) => vt.posix.join(t, `**/${vt.extname(s) ? s : `${s}${i}`}`)) : [vt.posix.join(t, `**${i ? `/*${i}` : ""}`)];
  }, "getDirectoryGlob"), Vu = /* @__PURE__ */ n(async (t, {
    cwd: e = zu.cwd(),
    files: r,
    extensions: i
  } = {}) => (await Promise.all(
    t.map(async (o) => await Tu(Ku(o, e)) ? Qu({ directoryPath: o, files: r, extensions: i }) : o)
  )).flat(), "directoryToGlob"), Yu = /* @__PURE__ */ n((t, {
    cwd: e = zu.cwd(),
    files: r,
    extensions: i
  } = {}) => t.flatMap((s) => Au(Ku(s, e)) ? Qu({ directoryPath: s, files: r, extensions: i }) : s), "directoryToGlobSync"), Sn = /* @__PURE__ */ n(
  (t) => (t = [...new Set([t].flat())], Fb(t), t), "toPatternsArray"), Hb = /* @__PURE__ */ n((t) => {
    if (!t)
      return;
    let e;
    try {
      e = jb.statSync(t);
    } catch {
      return;
    }
    if (!e.isDirectory())
      throw new Error("The `cwd` option must be a path to a directory");
  }, "checkCwdOption"), Xu = /* @__PURE__ */ n((t = {}) => (t = {
    ...t,
    ignore: t.ignore ?? [],
    expandDirectories: t.expandDirectories ?? !0,
    cwd: jt(t.cwd)
  }, Hb(t.cwd), t), "normalizeOptions"), Zu = /* @__PURE__ */ n((t) => async (e, r) => t(Sn(e), Xu(r)), "normalizeArguments"), qr = /* @__PURE__ */ n(
  (t) => (e, r) => t(Sn(e), Xu(r)), "normalizeArgumentsSync"), Ju = /* @__PURE__ */ n((t) => {
    let { ignoreFiles: e, gitignore: r } = t, i = e ? Sn(e) : [];
    return r && i.push(Mr), i;
  }, "getIgnoreFilesPatterns"), Bb = /* @__PURE__ */ n(async (t) => {
    let e = Ju(t);
    return th(
      e.length > 0 && await _n(e, t)
    );
  }, "getFilter"), eh = /* @__PURE__ */ n((t) => {
    let e = Ju(t);
    return th(
      e.length > 0 && bn(e, t)
    );
  }, "getFilterSync"), th = /* @__PURE__ */ n((t) => {
    let e = /* @__PURE__ */ new Set();
    return (r) => {
      let i = vt.normalize(r.path ?? r);
      return e.has(i) || t && t(i) ? !1 : (e.add(i), !0);
    };
  }, "createFilterFunction"), rh = /* @__PURE__ */ n((t, e) => t.flat().filter((r) => e(r)), "unionFastGlobResults"), ih = /* @__PURE__ */ n(
  (t, e) => {
    let r = [];
    for (; t.length > 0; ) {
      let i = t.findIndex((o) => Ft(o));
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
  }, "convertNegativePatterns"), sh = /* @__PURE__ */ n((t, e) => ({
    ...e ? { cwd: e } : {},
    ...Array.isArray(t) ? { files: t } : t
  }), "normalizeExpandDirectoriesOption"), nh = /* @__PURE__ */ n(async (t, e) => {
    let r = ih(t, e), { cwd: i, expandDirectories: s } = e;
    if (!s)
      return r;
    let o = sh(s, i);
    return Promise.all(
      r.map(async (a) => {
        let { patterns: l, options: c } = a;
        return [
          l,
          c.ignore
        ] = await Promise.all([
          Vu(l, o),
          Vu(c.ignore, { cwd: i })
        ]), { patterns: l, options: c };
      })
    );
  }, "generateTasks"), vn = /* @__PURE__ */ n((t, e) => {
    let r = ih(t, e), { cwd: i, expandDirectories: s } = e;
    if (!s)
      return r;
    let o = sh(s, i);
    return r.map((a) => {
      let { patterns: l, options: c } = a;
      return l = Yu(l, o), c.ignore = Yu(c.ignore, { cwd: i }), { patterns: l, options: c };
    });
  }, "generateTasksSync"), Ub = Zu(async (t, e) => {
    let [
      r,
      i
    ] = await Promise.all([
      nh(t, e),
      Bb(e)
    ]), s = await Promise.all(r.map((o) => (0, wt.default)(o.patterns, o.options)));
    return rh(s, i);
  }), Wb = qr((t, e) => {
    let r = vn(t, e), i = eh(e), s = r.map((o) => wt.default.sync(o.patterns, o.options));
    return rh(s, i);
  }), Gb = qr((t, e) => {
    let r = vn(t, e), i = eh(e), s = r.map((a) => wt.default.stream(a.patterns, a.options));
    return Si(s).filter((a) => i(a));
  }), Vb = qr(
    (t, e) => t.some((r) => wt.default.isDynamicPattern(r, e))
  ), Yb = Zu(nh), zb = qr(vn), { convertPathToPattern: Kb } = wt.default;
});

// ../node_modules/picocolors/picocolors.js
var Sh = d((QD, Tn) => {
  var bh = process.argv || [], Fr = process.env, bE = !("NO_COLOR" in Fr || bh.includes("--no-color")) && ("FORCE_COLOR" in Fr || bh.includes(
  "--color") || process.platform === "win32" || I != null && I("tty").isatty(1) && Fr.TERM !== "dumb" || "CI" in Fr), EE = /* @__PURE__ */ n(
  (t, e, r = t) => (i) => {
    let s = "" + i, o = s.indexOf(e, t.length);
    return ~o ? t + SE(s, e, r, o) + e : t + s + e;
  }, "formatter"), SE = /* @__PURE__ */ n((t, e, r, i) => {
    let s = "", o = 0;
    do
      s += t.substring(o, i) + r, o = i + e.length, i = t.indexOf(e, o);
    while (~i);
    return s + t.substring(o);
  }, "replaceClose"), Eh = /* @__PURE__ */ n((t = bE) => {
    let e = t ? EE : () => String;
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
  Tn.exports = Eh();
  Tn.exports.createColors = Eh;
});

// ../node_modules/totalist/sync/index.mjs
var wh = {};
Ct(wh, {
  totalist: () => vh
});
import { join as An, resolve as vE } from "path";
import { readdirSync as wE, statSync as RE } from "fs";
function vh(t, e, r = "") {
  t = vE(".", t);
  let i = wE(t), s = 0, o, a;
  for (; s < i.length; s++)
    o = An(t, i[s]), a = RE(o), a.isDirectory() ? vh(o, e, An(r, i[s])) : e(An(r, i[s]), o, a);
}
var Rh = he(() => {
  n(vh, "totalist");
});

// ../node_modules/@polka/url/build.mjs
var Ah = {};
Ct(Ah, {
  parse: () => TE
});
import * as Th from "node:querystring";
function TE(t) {
  let e = t.url;
  if (e == null) return;
  let r = t._parsedUrl;
  if (r && r.raw === e) return r;
  let i = e, s = "", o;
  if (e.length > 1) {
    let a = e.indexOf("?", 1);
    a !== -1 && (s = e.substring(a), i = e.substring(0, a), s.length > 1 && (o = Th.parse(s.substring(1))));
  }
  return t._parsedUrl = { pathname: i, search: s, query: o, raw: e };
}
var Ph = he(() => {
  n(TE, "parse");
});

// ../node_modules/mrmime/index.mjs
var Ch = {};
Ct(Ch, {
  lookup: () => AE,
  mimes: () => Oh
});
function AE(t) {
  let e = ("" + t).trim().toLowerCase(), r = e.lastIndexOf(".");
  return Oh[~r ? e.substring(++r) : e];
}
var Oh, Dh = he(() => {
  Oh = {
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
  n(AE, "lookup");
});

// ../node_modules/sirv/build.js
var Lh = d((i0, kh) => {
  var Pn = I("fs"), { join: PE, normalize: OE, resolve: CE } = I("path"), { totalist: DE } = (Rh(), oi(wh)), { parse: IE } = (Ph(), oi(Ah)),
  { lookup: NE } = (Dh(), oi(Ch)), kE = /* @__PURE__ */ n(() => {
  }, "noop");
  function LE(t, e) {
    for (let r = 0; r < e.length; r++)
      if (e[r].test(t)) return !0;
  }
  n(LE, "isMatch");
  function Ih(t, e) {
    let r = 0, i, s = t.length - 1;
    t.charCodeAt(s) === 47 && (t = t.substring(0, s));
    let o = [], a = `${t}/index`;
    for (; r < e.length; r++)
      i = e[r] ? `.${e[r]}` : "", t && o.push(t + i), o.push(a + i);
    return o;
  }
  n(Ih, "toAssume");
  function $E(t, e, r) {
    let i = 0, s, o = Ih(e, r);
    for (; i < o.length; i++)
      if (s = t[o[i]]) return s;
  }
  n($E, "viaCache");
  function ME(t, e, r, i) {
    let s = 0, o = Ih(r, i), a, l, c, u;
    for (; s < o.length; s++)
      if (a = OE(PE(t, c = o[s])), a.startsWith(t) && Pn.existsSync(a)) {
        if (l = Pn.statSync(a), l.isDirectory()) continue;
        return u = Nh(c, l, e), u["Cache-Control"] = e ? "no-cache" : "no-store", { abs: a, stats: l, headers: u };
      }
  }
  n(ME, "viaLocal");
  function qE(t, e) {
    return e.statusCode = 404, e.end();
  }
  n(qE, "is404");
  function jE(t, e, r, i, s) {
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
    e.writeHead(o, s), Pn.createReadStream(r, l).pipe(e);
  }
  n(jE, "send");
  var FE = {
    ".br": "br",
    ".gz": "gzip"
  };
  function Nh(t, e, r) {
    let i = FE[t.slice(-3)], s = NE(t.slice(0, i && -3)) || "";
    s === "text/html" && (s += ";charset=utf-8");
    let o = {
      "Content-Length": e.size,
      "Content-Type": s,
      "Last-Modified": e.mtime.toUTCString()
    };
    return i && (o["Content-Encoding"] = i), r && (o.ETag = `W/"${e.size}-${e.mtime.getTime()}"`), o;
  }
  n(Nh, "toHeaders");
  kh.exports = function(t, e = {}) {
    t = CE(t || ".");
    let r = e.onNoMatch || qE, i = e.setHeaders || kE, s = e.extensions || ["html", "htm"], o = e.gzip && s.map((g) => `${g}.gz`).concat("gz"),
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
    p && e.immutable ? p += ",immutable" : p && e.maxAge === 0 && (p += ",must-revalidate"), e.dev || DE(t, (g, b, R) => {
      if (!/\.well-known[\\+\/]/.test(g)) {
        if (!e.dotfiles && /(^\.|[\\+|\/+]\.)/.test(g)) return;
      }
      let T = Nh(g, R, u);
      p && (T["Cache-Control"] = p), l["/" + g.normalize().replace(/\\+/g, "/")] = { abs: b, stats: R, headers: T };
    });
    let v = e.dev ? ME.bind(0, t, u) : $E.bind(0, l);
    return function(g, b, R) {
      let T = [""], $ = IE(g).pathname, D = g.headers["accept-encoding"] || "";
      if (o && D.includes("gzip") && T.unshift(...o), a && /(br|brotli)/i.test(D) && T.unshift(...a), T.push(...s), $.indexOf("%") !== -1)
        try {
          $ = decodeURI($);
        } catch {
        }
      let F = v($, T) || h && !LE($, m) && v(c, T);
      if (!F) return R ? R() : r(g, b);
      if (u && g.headers["if-none-match"] === F.headers.ETag)
        return b.writeHead(304), b.end();
      (o || a) && b.setHeader("Vary", "Accept-Encoding"), i(b, $, F.stats), jE(g, b, F.abs, F.stats, F.headers);
    };
  };
});

// ../node_modules/prompts/node_modules/kleur/index.js
var z = d((y0, Fh) => {
  "use strict";
  var { FORCE_COLOR: KE, NODE_DISABLE_COLORS: QE, TERM: XE } = process.env, j = {
    enabled: !QE && XE !== "dumb" && KE !== "0",
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
  function jh(t, e) {
    let r = 0, i, s = "", o = "";
    for (; r < t.length; r++)
      i = t[r], s += i.open, o += i.close, e.includes(i.close) && (e = e.replace(i.rgx, i.close + i.open));
    return s + e + o;
  }
  n(jh, "run");
  function ZE(t, e) {
    let r = { has: t, keys: e };
    return r.reset = j.reset.bind(r), r.bold = j.bold.bind(r), r.dim = j.dim.bind(r), r.italic = j.italic.bind(r), r.underline = j.underline.
    bind(r), r.inverse = j.inverse.bind(r), r.hidden = j.hidden.bind(r), r.strikethrough = j.strikethrough.bind(r), r.black = j.black.bind(r),
    r.red = j.red.bind(r), r.green = j.green.bind(r), r.yellow = j.yellow.bind(r), r.blue = j.blue.bind(r), r.magenta = j.magenta.bind(r), r.
    cyan = j.cyan.bind(r), r.white = j.white.bind(r), r.gray = j.gray.bind(r), r.grey = j.grey.bind(r), r.bgBlack = j.bgBlack.bind(r), r.bgRed =
    j.bgRed.bind(r), r.bgGreen = j.bgGreen.bind(r), r.bgYellow = j.bgYellow.bind(r), r.bgBlue = j.bgBlue.bind(r), r.bgMagenta = j.bgMagenta.
    bind(r), r.bgCyan = j.bgCyan.bind(r), r.bgWhite = j.bgWhite.bind(r), r;
  }
  n(ZE, "chain");
  function B(t, e) {
    let r = {
      open: `\x1B[${t}m`,
      close: `\x1B[${e}m`,
      rgx: new RegExp(`\\x1b\\[${e}m`, "g")
    };
    return function(i) {
      return this !== void 0 && this.has !== void 0 ? (this.has.includes(t) || (this.has.push(t), this.keys.push(r)), i === void 0 ? this : j.
      enabled ? jh(this.keys, i + "") : i + "") : i === void 0 ? ZE([t], [r]) : j.enabled ? jh([r], i + "") : i + "";
    };
  }
  n(B, "init");
  Fh.exports = j;
});

// ../node_modules/prompts/dist/util/action.js
var Bh = d((_0, Hh) => {
  "use strict";
  Hh.exports = (t, e) => {
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
var Hr = d((b0, Uh) => {
  "use strict";
  Uh.exports = (t) => {
    let e = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"].join("|"), r = new RegExp(e, "g");
    return typeof t == "string" ? t.replace(r, "") : t;
  };
});

// ../node_modules/sisteransi/src/index.js
var Q = d((E0, Wh) => {
  "use strict";
  var Dn = "\x1B", K = `${Dn}[`, JE = "\x07", In = {
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
    save: `${Dn}7`,
    restore: `${Dn}8`
  }, eS = {
    up: /* @__PURE__ */ n((t = 1) => `${K}S`.repeat(t), "up"),
    down: /* @__PURE__ */ n((t = 1) => `${K}T`.repeat(t), "down")
  }, tS = {
    screen: `${K}2J`,
    up: /* @__PURE__ */ n((t = 1) => `${K}1J`.repeat(t), "up"),
    down: /* @__PURE__ */ n((t = 1) => `${K}J`.repeat(t), "down"),
    line: `${K}2K`,
    lineEnd: `${K}K`,
    lineStart: `${K}1K`,
    lines(t) {
      let e = "";
      for (let r = 0; r < t; r++)
        e += this.line + (r < t - 1 ? In.up() : "");
      return t && (e += In.left), e;
    }
  };
  Wh.exports = { cursor: In, scroll: eS, erase: tS, beep: JE };
});

// ../node_modules/prompts/dist/util/clear.js
var Kh = d((v0, zh) => {
  "use strict";
  function rS(t, e) {
    var r = typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
    if (!r) {
      if (Array.isArray(t) || (r = iS(t)) || e && t && typeof t.length == "number") {
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
  n(rS, "_createForOfIteratorHelper");
  function iS(t, e) {
    if (t) {
      if (typeof t == "string") return Gh(t, e);
      var r = Object.prototype.toString.call(t).slice(8, -1);
      if (r === "Object" && t.constructor && (r = t.constructor.name), r === "Map" || r === "Set") return Array.from(t);
      if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return Gh(t, e);
    }
  }
  n(iS, "_unsupportedIterableToArray");
  function Gh(t, e) {
    (e == null || e > t.length) && (e = t.length);
    for (var r = 0, i = new Array(e); r < e; r++) i[r] = t[r];
    return i;
  }
  n(Gh, "_arrayLikeToArray");
  var sS = Hr(), Yh = Q(), Vh = Yh.erase, nS = Yh.cursor, oS = /* @__PURE__ */ n((t) => [...sS(t)].length, "width");
  zh.exports = function(t, e) {
    if (!e) return Vh.line + nS.to(0);
    let r = 0, i = t.split(/\r?\n/);
    var s = rS(i), o;
    try {
      for (s.s(); !(o = s.n()).done; ) {
        let a = o.value;
        r += 1 + Math.floor(Math.max(oS(a) - 1, 0) / e);
      }
    } catch (a) {
      s.e(a);
    } finally {
      s.f();
    }
    return Vh.lines(r);
  };
});

// ../node_modules/prompts/dist/util/figures.js
var Nn = d((R0, Qh) => {
  "use strict";
  var Ht = {
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
  }, aS = {
    arrowUp: Ht.arrowUp,
    arrowDown: Ht.arrowDown,
    arrowLeft: Ht.arrowLeft,
    arrowRight: Ht.arrowRight,
    radioOn: "(*)",
    radioOff: "( )",
    tick: "\u221A",
    cross: "\xD7",
    ellipsis: "...",
    pointerSmall: "\xBB",
    line: "\u2500",
    pointer: ">"
  }, lS = process.platform === "win32" ? aS : Ht;
  Qh.exports = lS;
});

// ../node_modules/prompts/dist/util/style.js
var Zh = d((T0, Xh) => {
  "use strict";
  var Rt = z(), ut = Nn(), kn = Object.freeze({
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
  }), cS = /* @__PURE__ */ n((t) => kn[t] || kn.default, "render"), Bt = Object.freeze({
    aborted: Rt.red(ut.cross),
    done: Rt.green(ut.tick),
    exited: Rt.yellow(ut.cross),
    default: Rt.cyan("?")
  }), uS = /* @__PURE__ */ n((t, e, r) => e ? Bt.aborted : r ? Bt.exited : t ? Bt.done : Bt.default, "symbol"), hS = /* @__PURE__ */ n((t) => Rt.
  gray(t ? ut.ellipsis : ut.pointerSmall), "delimiter"), pS = /* @__PURE__ */ n((t, e) => Rt.gray(t ? e ? ut.pointerSmall : "+" : ut.line), "\
item");
  Xh.exports = {
    styles: kn,
    render: cS,
    symbols: Bt,
    symbol: uS,
    delimiter: hS,
    item: pS
  };
});

// ../node_modules/prompts/dist/util/lines.js
var ep = d((P0, Jh) => {
  "use strict";
  var dS = Hr();
  Jh.exports = function(t, e) {
    let r = String(dS(t) || "").split(/\r?\n/);
    return e ? r.map((i) => Math.ceil(i.length / e)).reduce((i, s) => i + s) : r.length;
  };
});

// ../node_modules/prompts/dist/util/wrap.js
var rp = d((O0, tp) => {
  "use strict";
  tp.exports = (t, e = {}) => {
    let r = Number.isSafeInteger(parseInt(e.margin)) ? new Array(parseInt(e.margin)).fill(" ").join("") : e.margin || "", i = e.width;
    return (t || "").split(/\r?\n/g).map((s) => s.split(/\s+/g).reduce((o, a) => (a.length + r.length >= i || o[o.length - 1].length + a.length +
    1 < i ? o[o.length - 1] += ` ${a}` : o.push(`${r}${a}`), o), [r]).join(`
`)).join(`
`);
  };
});

// ../node_modules/prompts/dist/util/entriesToDisplay.js
var sp = d((C0, ip) => {
  "use strict";
  ip.exports = (t, e, r) => {
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
var be = d((D0, np) => {
  "use strict";
  np.exports = {
    action: Bh(),
    clear: Kh(),
    style: Zh(),
    strip: Hr(),
    figures: Nn(),
    lines: ep(),
    wrap: rp(),
    entriesToDisplay: sp()
  };
});

// ../node_modules/prompts/dist/elements/prompt.js
var qe = d((I0, lp) => {
  "use strict";
  var op = I("readline"), fS = be(), mS = fS.action, gS = I("events"), ap = Q(), yS = ap.beep, xS = ap.cursor, _S = z(), Ln = class extends gS {
    static {
      n(this, "Prompt");
    }
    constructor(e = {}) {
      super(), this.firstRender = !0, this.in = e.stdin || process.stdin, this.out = e.stdout || process.stdout, this.onRender = (e.onRender ||
      (() => {
      })).bind(this);
      let r = op.createInterface({
        input: this.in,
        escapeCodeTimeout: 50
      });
      op.emitKeypressEvents(this.in, r), this.in.isTTY && this.in.setRawMode(!0);
      let i = ["SelectPrompt", "MultiselectPrompt"].indexOf(this.constructor.name) > -1, s = /* @__PURE__ */ n((o, a) => {
        let l = mS(a, i);
        l === !1 ? this._ && this._(o, a) : typeof this[l] == "function" ? this[l](a) : this.bell();
      }, "keypress");
      this.close = () => {
        this.out.write(xS.show), this.in.removeListener("keypress", s), this.in.isTTY && this.in.setRawMode(!1), r.close(), this.emit(this.aborted ?
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
      this.out.write(yS);
    }
    render() {
      this.onRender(_S), this.firstRender && (this.firstRender = !1);
    }
  };
  lp.exports = Ln;
});

// ../node_modules/prompts/dist/elements/text.js
var dp = d((k0, pp) => {
  "use strict";
  function cp(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(cp, "asyncGeneratorStep");
  function up(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          cp(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          cp(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(up, "_asyncToGenerator");
  var Br = z(), bS = qe(), hp = Q(), ES = hp.erase, Ut = hp.cursor, Ur = be(), $n = Ur.style, Mn = Ur.clear, SS = Ur.lines, vS = Ur.figures,
  qn = class extends bS {
    static {
      n(this, "TextPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = $n.render(e.style), this.scale = this.transform.scale, this.msg = e.message, this.initial = e.initial || "",
      this.validator = e.validate || (() => !0), this.value = "", this.errorMsg = e.error || "Please Enter A Valid Value", this.cursor = +!!this.
      initial, this.cursorOffset = 0, this.clear = Mn("", this.out.columns), this.render();
    }
    set value(e) {
      !e && this.initial ? (this.placeholder = !0, this.rendered = Br.gray(this.transform.render(this.initial))) : (this.placeholder = !1, this.
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
      return up(function* () {
        let r = yield e.validator(e.value);
        typeof r == "string" && (e.errorMsg = r, r = !1), e.error = !r;
      })();
    }
    submit() {
      var e = this;
      return up(function* () {
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
      this.closed || (this.firstRender || (this.outputError && this.out.write(Ut.down(SS(this.outputError, this.out.columns) - 1) + Mn(this.
      outputError, this.out.columns)), this.out.write(Mn(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [$n.symbol(this.done, this.aborted), Br.bold(this.msg), $n.delimiter(this.done), this.red ? Br.red(this.rendered) : this.rendered].join(
      " "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : vS.pointerSmall} ${Br.red().italic(r)}`, "")), this.out.write(ES.line + Ut.to(0) + this.outputText + Ut.save + this.outputError +
      Ut.restore + Ut.move(this.cursorOffset, 0)));
    }
  };
  pp.exports = qn;
});

// ../node_modules/prompts/dist/elements/select.js
var yp = d(($0, gp) => {
  "use strict";
  var je = z(), wS = qe(), Wt = be(), fp = Wt.style, mp = Wt.clear, Wr = Wt.figures, RS = Wt.wrap, TS = Wt.entriesToDisplay, AS = Q(), PS = AS.
  cursor, jn = class extends wS {
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
      })), this.optionsPerPage = e.optionsPerPage || 10, this.value = (this.choices[this.cursor] || {}).value, this.clear = mp("", this.out.
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
      this.firstRender ? this.out.write(PS.hide) : this.out.write(mp(this.outputText, this.out.columns)), super.render();
      let e = TS(this.cursor, this.choices.length, this.optionsPerPage), r = e.startIndex, i = e.endIndex;
      if (this.outputText = [fp.symbol(this.done, this.aborted), je.bold(this.msg), fp.delimiter(!1), this.done ? this.selection.title : this.
      selection.disabled ? je.yellow(this.warn) : je.gray(this.hint)].join(" "), !this.done) {
        this.outputText += `
`;
        for (let s = r; s < i; s++) {
          let o, a, l = "", c = this.choices[s];
          s === r && r > 0 ? a = Wr.arrowUp : s === i - 1 && i < this.choices.length ? a = Wr.arrowDown : a = " ", c.disabled ? (o = this.cursor ===
          s ? je.gray().underline(c.title) : je.strikethrough().gray(c.title), a = (this.cursor === s ? je.bold().gray(Wr.pointer) + " " : "\
  ") + a) : (o = this.cursor === s ? je.cyan().underline(c.title) : c.title, a = (this.cursor === s ? je.cyan(Wr.pointer) + " " : "  ") + a,
          c.description && this.cursor === s && (l = ` - ${c.description}`, (a.length + o.length + l.length >= this.out.columns || c.description.
          split(/\r?\n/).length > 1) && (l = `
` + RS(c.description, {
            margin: 3,
            width: this.out.columns
          })))), this.outputText += `${a} ${o}${je.gray(l)}
`;
        }
      }
      this.out.write(this.outputText);
    }
  };
  gp.exports = jn;
});

// ../node_modules/prompts/dist/elements/toggle.js
var vp = d((q0, Sp) => {
  "use strict";
  var Gr = z(), OS = qe(), bp = be(), xp = bp.style, CS = bp.clear, Ep = Q(), _p = Ep.cursor, DS = Ep.erase, Fn = class extends OS {
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
      this.closed || (this.firstRender ? this.out.write(_p.hide) : this.out.write(CS(this.outputText, this.out.columns)), super.render(), this.
      outputText = [xp.symbol(this.done, this.aborted), Gr.bold(this.msg), xp.delimiter(this.done), this.value ? this.inactive : Gr.cyan().underline(
      this.inactive), Gr.gray("/"), this.value ? Gr.cyan().underline(this.active) : this.active].join(" "), this.out.write(DS.line + _p.to(0) +
      this.outputText));
    }
  };
  Sp.exports = Fn;
});

// ../node_modules/prompts/dist/dateparts/datepart.js
var Pe = d((F0, wp) => {
  "use strict";
  var Hn = class t {
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
  wp.exports = Hn;
});

// ../node_modules/prompts/dist/dateparts/meridiem.js
var Tp = d((B0, Rp) => {
  "use strict";
  var IS = Pe(), Bn = class extends IS {
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
  Rp.exports = Bn;
});

// ../node_modules/prompts/dist/dateparts/day.js
var Pp = d((W0, Ap) => {
  "use strict";
  var NS = Pe(), kS = /* @__PURE__ */ n((t) => (t = t % 10, t === 1 ? "st" : t === 2 ? "nd" : t === 3 ? "rd" : "th"), "pos"), Un = class extends NS {
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
      return this.token === "DD" ? String(e).padStart(2, "0") : this.token === "Do" ? e + kS(e) : this.token === "d" ? r + 1 : this.token ===
      "ddd" ? this.locales.weekdaysShort[r] : this.token === "dddd" ? this.locales.weekdays[r] : e;
    }
  };
  Ap.exports = Un;
});

// ../node_modules/prompts/dist/dateparts/hours.js
var Cp = d((V0, Op) => {
  "use strict";
  var LS = Pe(), Wn = class extends LS {
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
  Op.exports = Wn;
});

// ../node_modules/prompts/dist/dateparts/milliseconds.js
var Ip = d((z0, Dp) => {
  "use strict";
  var $S = Pe(), Gn = class extends $S {
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
  Dp.exports = Gn;
});

// ../node_modules/prompts/dist/dateparts/minutes.js
var kp = d((Q0, Np) => {
  "use strict";
  var MS = Pe(), Vn = class extends MS {
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
  Np.exports = Vn;
});

// ../node_modules/prompts/dist/dateparts/month.js
var $p = d((Z0, Lp) => {
  "use strict";
  var qS = Pe(), Yn = class extends qS {
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
  Lp.exports = Yn;
});

// ../node_modules/prompts/dist/dateparts/seconds.js
var qp = d((e1, Mp) => {
  "use strict";
  var jS = Pe(), zn = class extends jS {
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
  Mp.exports = zn;
});

// ../node_modules/prompts/dist/dateparts/year.js
var Fp = d((r1, jp) => {
  "use strict";
  var FS = Pe(), Kn = class extends FS {
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
  jp.exports = Kn;
});

// ../node_modules/prompts/dist/dateparts/index.js
var Bp = d((s1, Hp) => {
  "use strict";
  Hp.exports = {
    DatePart: Pe(),
    Meridiem: Tp(),
    Day: Pp(),
    Hours: Cp(),
    Milliseconds: Ip(),
    Minutes: kp(),
    Month: $p(),
    Seconds: qp(),
    Year: Fp()
  };
});

// ../node_modules/prompts/dist/elements/date.js
var Zp = d((n1, Xp) => {
  "use strict";
  function Up(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(Up, "asyncGeneratorStep");
  function Wp(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          Up(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          Up(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(Wp, "_asyncToGenerator");
  var Qn = z(), HS = qe(), Zn = be(), Gp = Zn.style, Vp = Zn.clear, BS = Zn.figures, Qp = Q(), US = Qp.erase, Yp = Qp.cursor, Fe = Bp(), zp = Fe.
  DatePart, WS = Fe.Meridiem, GS = Fe.Day, VS = Fe.Hours, YS = Fe.Milliseconds, zS = Fe.Minutes, KS = Fe.Month, QS = Fe.Seconds, XS = Fe.Year,
  ZS = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g, Kp = {
    1: ({
      token: t
    }) => t.replace(/\\(.)/g, "$1"),
    2: (t) => new GS(t),
    // Day // TODO
    3: (t) => new KS(t),
    // Month
    4: (t) => new XS(t),
    // Year
    5: (t) => new WS(t),
    // AM/PM // TODO (special)
    6: (t) => new VS(t),
    // Hours
    7: (t) => new zS(t),
    // Minutes
    8: (t) => new QS(t),
    // Seconds
    9: (t) => new YS(t)
    // Fractional seconds
  }, JS = {
    months: "January,February,March,April,May,June,July,August,September,October,November,December".split(","),
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
    weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
    weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",")
  }, Xn = class extends HS {
    static {
      n(this, "DatePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.cursor = 0, this.typed = "", this.locales = Object.assign(JS, e.locales), this._date = e.initial ||
      /* @__PURE__ */ new Date(), this.errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.mask =
      e.mask || "YYYY-MM-DD HH:mm:ss", this.clear = Vp("", this.out.columns), this.render();
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
      for (this.parts = []; r = ZS.exec(e); ) {
        let s = r.shift(), o = r.findIndex((a) => a != null);
        this.parts.push(o in Kp ? Kp[o]({
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
      this.moveCursor(this.parts.findIndex((e) => e instanceof zp)), this.fire(), this.render();
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
      return Wp(function* () {
        let r = yield e.validator(e.value);
        typeof r == "string" && (e.errorMsg = r, r = !1), e.error = !r;
      })();
    }
    submit() {
      var e = this;
      return Wp(function* () {
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
      this.moveCursor(e ? this.parts.indexOf(e) : this.parts.findIndex((r) => r instanceof zp)), this.render();
    }
    _(e) {
      /\d/.test(e) && (this.typed += e, this.parts[this.cursor].setTo(this.typed), this.render());
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Yp.hide) : this.out.write(Vp(this.outputText, this.out.columns)), super.render(), this.
      outputText = [Gp.symbol(this.done, this.aborted), Qn.bold(this.msg), Gp.delimiter(!1), this.parts.reduce((e, r, i) => e.concat(i === this.
      cursor && !this.done ? Qn.cyan().underline(r.toString()) : r), []).join("")].join(" "), this.error && (this.outputText += this.errorMsg.
      split(`
`).reduce((e, r, i) => e + `
${i ? " " : BS.pointerSmall} ${Qn.red().italic(r)}`, "")), this.out.write(US.line + Yp.to(0) + this.outputText));
    }
  };
  Xp.exports = Xn;
});

// ../node_modules/prompts/dist/elements/number.js
var nd = d((a1, sd) => {
  "use strict";
  function Jp(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(Jp, "asyncGeneratorStep");
  function ed(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          Jp(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          Jp(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(ed, "_asyncToGenerator");
  var Vr = z(), ev = qe(), id = Q(), Yr = id.cursor, tv = id.erase, zr = be(), Jn = zr.style, rv = zr.figures, td = zr.clear, iv = zr.lines,
  sv = /[0-9]/, eo = /* @__PURE__ */ n((t) => t !== void 0, "isDef"), rd = /* @__PURE__ */ n((t, e) => {
    let r = Math.pow(10, e);
    return Math.round(t * r) / r;
  }, "round"), to = class extends ev {
    static {
      n(this, "NumberPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = Jn.render(e.style), this.msg = e.message, this.initial = eo(e.initial) ? e.initial : "", this.float = !!e.float,
      this.round = e.round || 2, this.inc = e.increment || 1, this.min = eo(e.min) ? e.min : -1 / 0, this.max = eo(e.max) ? e.max : 1 / 0, this.
      errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.color = "cyan", this.value = "", this.
      typed = "", this.lastHit = 0, this.render();
    }
    set value(e) {
      !e && e !== 0 ? (this.placeholder = !0, this.rendered = Vr.gray(this.transform.render(`${this.initial}`)), this._value = "") : (this.placeholder =
      !1, this.rendered = this.transform.render(`${rd(e, this.round)}`), this._value = rd(e, this.round)), this.fire();
    }
    get value() {
      return this._value;
    }
    parse(e) {
      return this.float ? parseFloat(e) : parseInt(e);
    }
    valid(e) {
      return e === "-" || e === "." && this.float || sv.test(e);
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
      return ed(function* () {
        let r = yield e.validator(e.value);
        typeof r == "string" && (e.errorMsg = r, r = !1), e.error = !r;
      })();
    }
    submit() {
      var e = this;
      return ed(function* () {
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
      this.closed || (this.firstRender || (this.outputError && this.out.write(Yr.down(iv(this.outputError, this.out.columns) - 1) + td(this.
      outputError, this.out.columns)), this.out.write(td(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [Jn.symbol(this.done, this.aborted), Vr.bold(this.msg), Jn.delimiter(this.done), !this.done || !this.done && !this.placeholder ? Vr[this.
      color]().underline(this.rendered) : this.rendered].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : rv.pointerSmall} ${Vr.red().italic(r)}`, "")), this.out.write(tv.line + Yr.to(0) + this.outputText + Yr.save + this.outputError +
      Yr.restore));
    }
  };
  sd.exports = to;
});

// ../node_modules/prompts/dist/elements/multiselect.js
var io = d((c1, ld) => {
  "use strict";
  var Oe = z(), nv = Q(), ov = nv.cursor, av = qe(), Gt = be(), od = Gt.clear, Je = Gt.figures, ad = Gt.style, lv = Gt.wrap, cv = Gt.entriesToDisplay,
  ro = class extends av {
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
      })), this.clear = od("", this.out.columns), e.overrideRender || this.render();
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
    ${Je.arrowUp}/${Je.arrowDown}: Highlight option
    ${Je.arrowLeft}/${Je.arrowRight}/[space]: Toggle selection
` + (this.maxChoices === void 0 ? `    a: Toggle all
` : "") + "    enter/return: Complete answer" : "";
    }
    renderOption(e, r, i, s) {
      let o = (r.selected ? Oe.green(Je.radioOn) : Je.radioOff) + " " + s + " ", a, l;
      return r.disabled ? a = e === i ? Oe.gray().underline(r.title) : Oe.strikethrough().gray(r.title) : (a = e === i ? Oe.cyan().underline(
      r.title) : r.title, e === i && r.description && (l = ` - ${r.description}`, (o.length + a.length + l.length >= this.out.columns || r.description.
      split(/\r?\n/).length > 1) && (l = `
` + lv(r.description, {
        margin: o.length,
        width: this.out.columns
      })))), o + a + Oe.gray(l || "");
    }
    // shared with autocompleteMultiselect
    paginateOptions(e) {
      if (e.length === 0)
        return Oe.red("No matches for this query.");
      let r = cv(this.cursor, e.length, this.optionsPerPage), i = r.startIndex, s = r.endIndex, o, a = [];
      for (let l = i; l < s; l++)
        l === i && i > 0 ? o = Je.arrowUp : l === s - 1 && s < e.length ? o = Je.arrowDown : o = " ", a.push(this.renderOption(this.cursor, e[l],
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
      let e = [Oe.gray(this.hint), this.renderInstructions()];
      return this.value[this.cursor].disabled && e.push(Oe.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(ov.hide), super.render();
      let e = [ad.symbol(this.done, this.aborted), Oe.bold(this.msg), ad.delimiter(!1), this.renderDoneOrInstructions()].join(" ");
      this.showMinError && (e += Oe.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.value), this.out.write(this.clear + e), this.clear = od(e, this.out.columns);
    }
  };
  ld.exports = ro;
});

// ../node_modules/prompts/dist/elements/autocomplete.js
var md = d((h1, fd) => {
  "use strict";
  function cd(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(cd, "asyncGeneratorStep");
  function uv(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          cd(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          cd(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(uv, "_asyncToGenerator");
  var Vt = z(), hv = qe(), dd = Q(), pv = dd.erase, ud = dd.cursor, Yt = be(), so = Yt.style, hd = Yt.clear, no = Yt.figures, dv = Yt.wrap, fv = Yt.
  entriesToDisplay, pd = /* @__PURE__ */ n((t, e) => t[e] && (t[e].value || t[e].title || t[e]), "getVal"), mv = /* @__PURE__ */ n((t, e) => t[e] &&
  (t[e].title || t[e].value || t[e]), "getTitle"), gv = /* @__PURE__ */ n((t, e) => {
    let r = t.findIndex((i) => i.value === e || i.title === e);
    return r > -1 ? r : void 0;
  }, "getIndex"), oo = class extends hv {
    static {
      n(this, "AutocompletePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.suggest = e.suggest, this.choices = e.choices, this.initial = typeof e.initial == "number" ? e.initial :
      gv(e.choices, e.initial), this.select = this.initial || e.cursor || 0, this.i18n = {
        noMatches: e.noMatches || "no matches found"
      }, this.fallback = e.fallback || this.initial, this.clearFirst = e.clearFirst || !1, this.suggestions = [], this.input = "", this.limit =
      e.limit || 10, this.cursor = 0, this.transform = so.render(e.style), this.scale = this.transform.scale, this.render = this.render.bind(
      this), this.complete = this.complete.bind(this), this.clear = hd("", this.out.columns), this.complete(this.render), this.render();
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
      this.select = e, this.suggestions.length > 0 ? this.value = pd(this.suggestions, e) : this.value = this.fallback.value, this.fire();
    }
    complete(e) {
      var r = this;
      return uv(function* () {
        let i = r.completing = r.suggest(r.input, r.choices), s = yield i;
        if (r.completing !== i) return;
        r.suggestions = s.map((a, l, c) => ({
          title: mv(c, l),
          value: pd(c, l),
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
      let o, a = i ? no.arrowUp : s ? no.arrowDown : " ", l = r ? Vt.cyan().underline(e.title) : e.title;
      return a = (r ? Vt.cyan(no.pointer) + " " : "  ") + a, e.description && (o = ` - ${e.description}`, (a.length + l.length + o.length >=
      this.out.columns || e.description.split(/\r?\n/).length > 1) && (o = `
` + dv(e.description, {
        margin: 3,
        width: this.out.columns
      }))), a + " " + l + Vt.gray(o || "");
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(ud.hide) : this.out.write(hd(this.outputText, this.out.columns)), super.render();
      let e = fv(this.select, this.choices.length, this.limit), r = e.startIndex, i = e.endIndex;
      if (this.outputText = [so.symbol(this.done, this.aborted, this.exited), Vt.bold(this.msg), so.delimiter(this.completing), this.done &&
      this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)].join(" "), !this.
      done) {
        let s = this.suggestions.slice(r, i).map((o, a) => this.renderOption(o, this.select === a + r, a === 0 && r > 0, a + r === i - 1 && i <
        this.choices.length)).join(`
`);
        this.outputText += `
` + (s || Vt.gray(this.fallback.title));
      }
      this.out.write(pv.line + ud.to(0) + this.outputText);
    }
  };
  fd.exports = oo;
});

// ../node_modules/prompts/dist/elements/autocompleteMultiselect.js
var _d = d((d1, xd) => {
  "use strict";
  var He = z(), yv = Q(), xv = yv.cursor, _v = io(), lo = be(), gd = lo.clear, yd = lo.style, Tt = lo.figures, ao = class extends _v {
    static {
      n(this, "AutocompleteMultiselectPrompt");
    }
    constructor(e = {}) {
      e.overrideRender = !0, super(e), this.inputValue = "", this.clear = gd("", this.out.columns), this.filteredOptions = this.value, this.
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
    ${Tt.arrowUp}/${Tt.arrowDown}: Highlight option
    ${Tt.arrowLeft}/${Tt.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
` : "";
    }
    renderCurrentInput() {
      return `
Filtered results for: ${this.inputValue ? this.inputValue : He.gray("Enter something to filter")}
`;
    }
    renderOption(e, r, i) {
      let s;
      return r.disabled ? s = e === i ? He.gray().underline(r.title) : He.strikethrough().gray(r.title) : s = e === i ? He.cyan().underline(
      r.title) : r.title, (r.selected ? He.green(Tt.radioOn) : Tt.radioOff) + "  " + s;
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let e = [He.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
      return this.filteredOptions.length && this.filteredOptions[this.cursor].disabled && e.push(He.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(xv.hide), super.render();
      let e = [yd.symbol(this.done, this.aborted), He.bold(this.msg), yd.delimiter(!1), this.renderDoneOrInstructions()].join(" ");
      this.showMinError && (e += He.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.filteredOptions), this.out.write(this.clear + e), this.clear = gd(e, this.out.columns);
    }
  };
  xd.exports = ao;
});

// ../node_modules/prompts/dist/elements/confirm.js
var Td = d((m1, Rd) => {
  "use strict";
  var bd = z(), bv = qe(), vd = be(), Ed = vd.style, Ev = vd.clear, wd = Q(), Sv = wd.erase, Sd = wd.cursor, co = class extends bv {
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
      this.closed || (this.firstRender ? this.out.write(Sd.hide) : this.out.write(Ev(this.outputText, this.out.columns)), super.render(), this.
      outputText = [Ed.symbol(this.done, this.aborted), bd.bold(this.msg), Ed.delimiter(this.done), this.done ? this.value ? this.yesMsg : this.
      noMsg : bd.gray(this.initialValue ? this.yesOption : this.noOption)].join(" "), this.out.write(Sv.line + Sd.to(0) + this.outputText));
    }
  };
  Rd.exports = co;
});

// ../node_modules/prompts/dist/elements/index.js
var Pd = d((y1, Ad) => {
  "use strict";
  Ad.exports = {
    TextPrompt: dp(),
    SelectPrompt: yp(),
    TogglePrompt: vp(),
    DatePrompt: Zp(),
    NumberPrompt: nd(),
    MultiselectPrompt: io(),
    AutocompletePrompt: md(),
    AutocompleteMultiselectPrompt: _d(),
    ConfirmPrompt: Td()
  };
});

// ../node_modules/prompts/dist/prompts.js
var Cd = d((Od) => {
  "use strict";
  var oe = Od, vv = Pd(), Kr = /* @__PURE__ */ n((t) => t, "noop");
  function Ce(t, e, r = {}) {
    return new Promise((i, s) => {
      let o = new vv[t](e), a = r.onAbort || Kr, l = r.onSubmit || Kr, c = r.onExit || Kr;
      o.on("state", e.onState || Kr), o.on("submit", (u) => i(l(u))), o.on("exit", (u) => i(c(u))), o.on("abort", (u) => s(a(u)));
    });
  }
  n(Ce, "toPrompt");
  oe.text = (t) => Ce("TextPrompt", t);
  oe.password = (t) => (t.style = "password", oe.text(t));
  oe.invisible = (t) => (t.style = "invisible", oe.text(t));
  oe.number = (t) => Ce("NumberPrompt", t);
  oe.date = (t) => Ce("DatePrompt", t);
  oe.confirm = (t) => Ce("ConfirmPrompt", t);
  oe.list = (t) => {
    let e = t.separator || ",";
    return Ce("TextPrompt", t, {
      onSubmit: /* @__PURE__ */ n((r) => r.split(e).map((i) => i.trim()), "onSubmit")
    });
  };
  oe.toggle = (t) => Ce("TogglePrompt", t);
  oe.select = (t) => Ce("SelectPrompt", t);
  oe.multiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return Ce("MultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  oe.autocompleteMultiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return Ce("AutocompleteMultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  var wv = /* @__PURE__ */ n((t, e) => Promise.resolve(e.filter((r) => r.title.slice(0, t.length).toLowerCase() === t.toLowerCase())), "byTi\
tle");
  oe.autocomplete = (t) => (t.suggest = t.suggest || wv, t.choices = [].concat(t.choices || []), Ce("AutocompletePrompt", t));
});

// ../node_modules/prompts/dist/index.js
var qd = d((b1, Md) => {
  "use strict";
  function Dd(t, e) {
    var r = Object.keys(t);
    if (Object.getOwnPropertySymbols) {
      var i = Object.getOwnPropertySymbols(t);
      e && (i = i.filter(function(s) {
        return Object.getOwnPropertyDescriptor(t, s).enumerable;
      })), r.push.apply(r, i);
    }
    return r;
  }
  n(Dd, "ownKeys");
  function Id(t) {
    for (var e = 1; e < arguments.length; e++) {
      var r = arguments[e] != null ? arguments[e] : {};
      e % 2 ? Dd(Object(r), !0).forEach(function(i) {
        Rv(t, i, r[i]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : Dd(Object(r)).forEach(function(i) {
        Object.defineProperty(t, i, Object.getOwnPropertyDescriptor(r, i));
      });
    }
    return t;
  }
  n(Id, "_objectSpread");
  function Rv(t, e, r) {
    return e in t ? Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : t[e] = r, t;
  }
  n(Rv, "_defineProperty");
  function Tv(t, e) {
    var r = typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
    if (!r) {
      if (Array.isArray(t) || (r = Av(t)) || e && t && typeof t.length == "number") {
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
  n(Tv, "_createForOfIteratorHelper");
  function Av(t, e) {
    if (t) {
      if (typeof t == "string") return Nd(t, e);
      var r = Object.prototype.toString.call(t).slice(8, -1);
      if (r === "Object" && t.constructor && (r = t.constructor.name), r === "Map" || r === "Set") return Array.from(t);
      if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return Nd(t, e);
    }
  }
  n(Av, "_unsupportedIterableToArray");
  function Nd(t, e) {
    (e == null || e > t.length) && (e = t.length);
    for (var r = 0, i = new Array(e); r < e; r++) i[r] = t[r];
    return i;
  }
  n(Nd, "_arrayLikeToArray");
  function kd(t, e, r, i, s, o, a) {
    try {
      var l = t[o](a), c = l.value;
    } catch (u) {
      r(u);
      return;
    }
    l.done ? e(c) : Promise.resolve(c).then(i, s);
  }
  n(kd, "asyncGeneratorStep");
  function Ld(t) {
    return function() {
      var e = this, r = arguments;
      return new Promise(function(i, s) {
        var o = t.apply(e, r);
        function a(c) {
          kd(o, i, s, a, l, "next", c);
        }
        n(a, "_next");
        function l(c) {
          kd(o, i, s, a, l, "throw", c);
        }
        n(l, "_throw"), a(void 0);
      });
    };
  }
  n(Ld, "_asyncToGenerator");
  var uo = Cd(), Pv = ["suggest", "format", "onState", "validate", "onRender", "type"], $d = /* @__PURE__ */ n(() => {
  }, "noop");
  function et() {
    return ho.apply(this, arguments);
  }
  n(et, "prompt");
  function ho() {
    return ho = Ld(function* (t = [], {
      onSubmit: e = $d,
      onCancel: r = $d
    } = {}) {
      let i = {}, s = et._override || {};
      t = [].concat(t);
      let o, a, l, c, u, h, m = /* @__PURE__ */ function() {
        var R = Ld(function* (T, $, D = !1) {
          if (!(!D && T.validate && T.validate($) !== !0))
            return T.format ? yield T.format($, i) : $;
        });
        return /* @__PURE__ */ n(function($, D) {
          return R.apply(this, arguments);
        }, "getFormattedAnswer");
      }();
      var p = Tv(t), v;
      try {
        for (p.s(); !(v = p.n()).done; ) {
          a = v.value;
          var g = a;
          if (c = g.name, u = g.type, typeof u == "function" && (u = yield u(o, Id({}, i), a), a.type = u), !!u) {
            for (let R in a) {
              if (Pv.includes(R)) continue;
              let T = a[R];
              a[R] = typeof T == "function" ? yield T(o, Id({}, i), h) : T;
            }
            if (h = a, typeof a.message != "string")
              throw new Error("prompt message is required");
            var b = a;
            if (c = b.name, u = b.type, uo[u] === void 0)
              throw new Error(`prompt type (${u}) is not defined`);
            if (s[a.name] !== void 0 && (o = yield m(a, s[a.name]), o !== void 0)) {
              i[c] = o;
              continue;
            }
            try {
              o = et._injected ? Ov(et._injected, a.initial) : yield uo[u](a), i[c] = o = yield m(a, o, !0), l = yield e(a, o, i);
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
    }), ho.apply(this, arguments);
  }
  n(ho, "_prompt");
  function Ov(t, e) {
    let r = t.shift();
    if (r instanceof Error)
      throw r;
    return r === void 0 ? e : r;
  }
  n(Ov, "getInjectedAnswer");
  function Cv(t) {
    et._injected = (et._injected || []).concat(t);
  }
  n(Cv, "inject");
  function Dv(t) {
    et._override = Object.assign({}, t);
  }
  n(Dv, "override");
  Md.exports = Object.assign(et, {
    prompt: et,
    prompts: uo,
    inject: Cv,
    override: Dv
  });
});

// ../node_modules/prompts/lib/util/action.js
var Fd = d((S1, jd) => {
  "use strict";
  jd.exports = (t, e) => {
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
var Qr = d((v1, Hd) => {
  "use strict";
  Hd.exports = (t) => {
    let e = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
    ].join("|"), r = new RegExp(e, "g");
    return typeof t == "string" ? t.replace(r, "") : t;
  };
});

// ../node_modules/prompts/lib/util/clear.js
var Wd = d((w1, Ud) => {
  "use strict";
  var Iv = Qr(), { erase: Bd, cursor: Nv } = Q(), kv = /* @__PURE__ */ n((t) => [...Iv(t)].length, "width");
  Ud.exports = function(t, e) {
    if (!e) return Bd.line + Nv.to(0);
    let r = 0, i = t.split(/\r?\n/);
    for (let s of i)
      r += 1 + Math.floor(Math.max(kv(s) - 1, 0) / e);
    return Bd.lines(r);
  };
});

// ../node_modules/prompts/lib/util/figures.js
var po = d((T1, Gd) => {
  "use strict";
  var zt = {
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
  }, Lv = {
    arrowUp: zt.arrowUp,
    arrowDown: zt.arrowDown,
    arrowLeft: zt.arrowLeft,
    arrowRight: zt.arrowRight,
    radioOn: "(*)",
    radioOff: "( )",
    tick: "\u221A",
    cross: "\xD7",
    ellipsis: "...",
    pointerSmall: "\xBB",
    line: "\u2500",
    pointer: ">"
  }, $v = process.platform === "win32" ? Lv : zt;
  Gd.exports = $v;
});

// ../node_modules/prompts/lib/util/style.js
var Yd = d((A1, Vd) => {
  "use strict";
  var At = z(), ht = po(), fo = Object.freeze({
    password: { scale: 1, render: /* @__PURE__ */ n((t) => "*".repeat(t.length), "render") },
    emoji: { scale: 2, render: /* @__PURE__ */ n((t) => "\u{1F603}".repeat(t.length), "render") },
    invisible: { scale: 0, render: /* @__PURE__ */ n((t) => "", "render") },
    default: { scale: 1, render: /* @__PURE__ */ n((t) => `${t}`, "render") }
  }), Mv = /* @__PURE__ */ n((t) => fo[t] || fo.default, "render"), Kt = Object.freeze({
    aborted: At.red(ht.cross),
    done: At.green(ht.tick),
    exited: At.yellow(ht.cross),
    default: At.cyan("?")
  }), qv = /* @__PURE__ */ n((t, e, r) => e ? Kt.aborted : r ? Kt.exited : t ? Kt.done : Kt.default, "symbol"), jv = /* @__PURE__ */ n((t) => At.
  gray(t ? ht.ellipsis : ht.pointerSmall), "delimiter"), Fv = /* @__PURE__ */ n((t, e) => At.gray(t ? e ? ht.pointerSmall : "+" : ht.line), "\
item");
  Vd.exports = {
    styles: fo,
    render: Mv,
    symbols: Kt,
    symbol: qv,
    delimiter: jv,
    item: Fv
  };
});

// ../node_modules/prompts/lib/util/lines.js
var Kd = d((O1, zd) => {
  "use strict";
  var Hv = Qr();
  zd.exports = function(t, e) {
    let r = String(Hv(t) || "").split(/\r?\n/);
    return e ? r.map((i) => Math.ceil(i.length / e)).reduce((i, s) => i + s) : r.length;
  };
});

// ../node_modules/prompts/lib/util/wrap.js
var Xd = d((C1, Qd) => {
  "use strict";
  Qd.exports = (t, e = {}) => {
    let r = Number.isSafeInteger(parseInt(e.margin)) ? new Array(parseInt(e.margin)).fill(" ").join("") : e.margin || "", i = e.width;
    return (t || "").split(/\r?\n/g).map((s) => s.split(/\s+/g).reduce((o, a) => (a.length + r.length >= i || o[o.length - 1].length + a.length +
    1 < i ? o[o.length - 1] += ` ${a}` : o.push(`${r}${a}`), o), [r]).join(`
`)).join(`
`);
  };
});

// ../node_modules/prompts/lib/util/entriesToDisplay.js
var Jd = d((D1, Zd) => {
  "use strict";
  Zd.exports = (t, e, r) => {
    r = r || e;
    let i = Math.min(e - r, t - Math.floor(r / 2));
    i < 0 && (i = 0);
    let s = Math.min(i + r, e);
    return { startIndex: i, endIndex: s };
  };
});

// ../node_modules/prompts/lib/util/index.js
var Ee = d((I1, ef) => {
  "use strict";
  ef.exports = {
    action: Fd(),
    clear: Wd(),
    style: Yd(),
    strip: Qr(),
    figures: po(),
    lines: Kd(),
    wrap: Xd(),
    entriesToDisplay: Jd()
  };
});

// ../node_modules/prompts/lib/elements/prompt.js
var Be = d((N1, rf) => {
  "use strict";
  var tf = I("readline"), { action: Bv } = Ee(), Uv = I("events"), { beep: Wv, cursor: Gv } = Q(), Vv = z(), mo = class extends Uv {
    static {
      n(this, "Prompt");
    }
    constructor(e = {}) {
      super(), this.firstRender = !0, this.in = e.stdin || process.stdin, this.out = e.stdout || process.stdout, this.onRender = (e.onRender ||
      (() => {
      })).bind(this);
      let r = tf.createInterface({ input: this.in, escapeCodeTimeout: 50 });
      tf.emitKeypressEvents(this.in, r), this.in.isTTY && this.in.setRawMode(!0);
      let i = ["SelectPrompt", "MultiselectPrompt"].indexOf(this.constructor.name) > -1, s = /* @__PURE__ */ n((o, a) => {
        let l = Bv(a, i);
        l === !1 ? this._ && this._(o, a) : typeof this[l] == "function" ? this[l](a) : this.bell();
      }, "keypress");
      this.close = () => {
        this.out.write(Gv.show), this.in.removeListener("keypress", s), this.in.isTTY && this.in.setRawMode(!1), r.close(), this.emit(this.aborted ?
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
      this.out.write(Wv);
    }
    render() {
      this.onRender(Vv), this.firstRender && (this.firstRender = !1);
    }
  };
  rf.exports = mo;
});

// ../node_modules/prompts/lib/elements/text.js
var nf = d((L1, sf) => {
  var Xr = z(), Yv = Be(), { erase: zv, cursor: Qt } = Q(), { style: go, clear: yo, lines: Kv, figures: Qv } = Ee(), xo = class extends Yv {
    static {
      n(this, "TextPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = go.render(e.style), this.scale = this.transform.scale, this.msg = e.message, this.initial = e.initial || "",
      this.validator = e.validate || (() => !0), this.value = "", this.errorMsg = e.error || "Please Enter A Valid Value", this.cursor = +!!this.
      initial, this.cursorOffset = 0, this.clear = yo("", this.out.columns), this.render();
    }
    set value(e) {
      !e && this.initial ? (this.placeholder = !0, this.rendered = Xr.gray(this.transform.render(this.initial))) : (this.placeholder = !1, this.
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
      this.closed || (this.firstRender || (this.outputError && this.out.write(Qt.down(Kv(this.outputError, this.out.columns) - 1) + yo(this.
      outputError, this.out.columns)), this.out.write(yo(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [
        go.symbol(this.done, this.aborted),
        Xr.bold(this.msg),
        go.delimiter(this.done),
        this.red ? Xr.red(this.rendered) : this.rendered
      ].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : Qv.pointerSmall} ${Xr.red().italic(r)}`, "")), this.out.write(zv.line + Qt.to(0) + this.outputText + Qt.save + this.outputError +
      Qt.restore + Qt.move(this.cursorOffset, 0)));
    }
  };
  sf.exports = xo;
});

// ../node_modules/prompts/lib/elements/select.js
var cf = d((M1, lf) => {
  "use strict";
  var Ue = z(), Xv = Be(), { style: of, clear: af, figures: Zr, wrap: Zv, entriesToDisplay: Jv } = Ee(), { cursor: ew } = Q(), _o = class extends Xv {
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
      })), this.optionsPerPage = e.optionsPerPage || 10, this.value = (this.choices[this.cursor] || {}).value, this.clear = af("", this.out.
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
      this.firstRender ? this.out.write(ew.hide) : this.out.write(af(this.outputText, this.out.columns)), super.render();
      let { startIndex: e, endIndex: r } = Jv(this.cursor, this.choices.length, this.optionsPerPage);
      if (this.outputText = [
        of.symbol(this.done, this.aborted),
        Ue.bold(this.msg),
        of.delimiter(!1),
        this.done ? this.selection.title : this.selection.disabled ? Ue.yellow(this.warn) : Ue.gray(this.hint)
      ].join(" "), !this.done) {
        this.outputText += `
`;
        for (let i = e; i < r; i++) {
          let s, o, a = "", l = this.choices[i];
          i === e && e > 0 ? o = Zr.arrowUp : i === r - 1 && r < this.choices.length ? o = Zr.arrowDown : o = " ", l.disabled ? (s = this.cursor ===
          i ? Ue.gray().underline(l.title) : Ue.strikethrough().gray(l.title), o = (this.cursor === i ? Ue.bold().gray(Zr.pointer) + " " : "\
  ") + o) : (s = this.cursor === i ? Ue.cyan().underline(l.title) : l.title, o = (this.cursor === i ? Ue.cyan(Zr.pointer) + " " : "  ") + o,
          l.description && this.cursor === i && (a = ` - ${l.description}`, (o.length + s.length + a.length >= this.out.columns || l.description.
          split(/\r?\n/).length > 1) && (a = `
` + Zv(l.description, { margin: 3, width: this.out.columns })))), this.outputText += `${o} ${s}${Ue.gray(a)}
`;
        }
      }
      this.out.write(this.outputText);
    }
  };
  lf.exports = _o;
});

// ../node_modules/prompts/lib/elements/toggle.js
var df = d((j1, pf) => {
  var Jr = z(), tw = Be(), { style: uf, clear: rw } = Ee(), { cursor: hf, erase: iw } = Q(), bo = class extends tw {
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
      this.closed || (this.firstRender ? this.out.write(hf.hide) : this.out.write(rw(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        uf.symbol(this.done, this.aborted),
        Jr.bold(this.msg),
        uf.delimiter(this.done),
        this.value ? this.inactive : Jr.cyan().underline(this.inactive),
        Jr.gray("/"),
        this.value ? Jr.cyan().underline(this.active) : this.active
      ].join(" "), this.out.write(iw.line + hf.to(0) + this.outputText));
    }
  };
  pf.exports = bo;
});

// ../node_modules/prompts/lib/dateparts/datepart.js
var De = d((H1, ff) => {
  "use strict";
  var Eo = class t {
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
  ff.exports = Eo;
});

// ../node_modules/prompts/lib/dateparts/meridiem.js
var gf = d((U1, mf) => {
  "use strict";
  var sw = De(), So = class extends sw {
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
  mf.exports = So;
});

// ../node_modules/prompts/lib/dateparts/day.js
var xf = d((G1, yf) => {
  "use strict";
  var nw = De(), ow = /* @__PURE__ */ n((t) => (t = t % 10, t === 1 ? "st" : t === 2 ? "nd" : t === 3 ? "rd" : "th"), "pos"), vo = class extends nw {
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
      return this.token === "DD" ? String(e).padStart(2, "0") : this.token === "Do" ? e + ow(e) : this.token === "d" ? r + 1 : this.token ===
      "ddd" ? this.locales.weekdaysShort[r] : this.token === "dddd" ? this.locales.weekdays[r] : e;
    }
  };
  yf.exports = vo;
});

// ../node_modules/prompts/lib/dateparts/hours.js
var bf = d((Y1, _f) => {
  "use strict";
  var aw = De(), wo = class extends aw {
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
  _f.exports = wo;
});

// ../node_modules/prompts/lib/dateparts/milliseconds.js
var Sf = d((K1, Ef) => {
  "use strict";
  var lw = De(), Ro = class extends lw {
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
  Ef.exports = Ro;
});

// ../node_modules/prompts/lib/dateparts/minutes.js
var wf = d((X1, vf) => {
  "use strict";
  var cw = De(), To = class extends cw {
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
  vf.exports = To;
});

// ../node_modules/prompts/lib/dateparts/month.js
var Tf = d((J1, Rf) => {
  "use strict";
  var uw = De(), Ao = class extends uw {
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
  Rf.exports = Ao;
});

// ../node_modules/prompts/lib/dateparts/seconds.js
var Pf = d((tI, Af) => {
  "use strict";
  var hw = De(), Po = class extends hw {
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
  Af.exports = Po;
});

// ../node_modules/prompts/lib/dateparts/year.js
var Cf = d((iI, Of) => {
  "use strict";
  var pw = De(), Oo = class extends pw {
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
  Of.exports = Oo;
});

// ../node_modules/prompts/lib/dateparts/index.js
var If = d((nI, Df) => {
  "use strict";
  Df.exports = {
    DatePart: De(),
    Meridiem: gf(),
    Day: xf(),
    Hours: bf(),
    Milliseconds: Sf(),
    Minutes: wf(),
    Month: Tf(),
    Seconds: Pf(),
    Year: Cf()
  };
});

// ../node_modules/prompts/lib/elements/date.js
var jf = d((oI, qf) => {
  "use strict";
  var Co = z(), dw = Be(), { style: Nf, clear: kf, figures: fw } = Ee(), { erase: mw, cursor: Lf } = Q(), { DatePart: $f, Meridiem: gw, Day: yw,
  Hours: xw, Milliseconds: _w, Minutes: bw, Month: Ew, Seconds: Sw, Year: vw } = If(), ww = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g,
  Mf = {
    1: ({ token: t }) => t.replace(/\\(.)/g, "$1"),
    2: (t) => new yw(t),
    // Day // TODO
    3: (t) => new Ew(t),
    // Month
    4: (t) => new vw(t),
    // Year
    5: (t) => new gw(t),
    // AM/PM // TODO (special)
    6: (t) => new xw(t),
    // Hours
    7: (t) => new bw(t),
    // Minutes
    8: (t) => new Sw(t),
    // Seconds
    9: (t) => new _w(t)
    // Fractional seconds
  }, Rw = {
    months: "January,February,March,April,May,June,July,August,September,October,November,December".split(","),
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
    weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
    weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",")
  }, Do = class extends dw {
    static {
      n(this, "DatePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.cursor = 0, this.typed = "", this.locales = Object.assign(Rw, e.locales), this._date = e.initial ||
      /* @__PURE__ */ new Date(), this.errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.mask =
      e.mask || "YYYY-MM-DD HH:mm:ss", this.clear = kf("", this.out.columns), this.render();
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
      for (this.parts = []; r = ww.exec(e); ) {
        let s = r.shift(), o = r.findIndex((a) => a != null);
        this.parts.push(o in Mf ? Mf[o]({ token: r[o] || s, date: this.date, parts: this.parts, locales: this.locales }) : r[o] || s);
      }
      let i = this.parts.reduce((s, o) => (typeof o == "string" && typeof s[s.length - 1] == "string" ? s[s.length - 1] += o : s.push(o), s),
      []);
      this.parts.splice(0), this.parts.push(...i), this.reset();
    }
    moveCursor(e) {
      this.typed = "", this.cursor = e, this.fire();
    }
    reset() {
      this.moveCursor(this.parts.findIndex((e) => e instanceof $f)), this.fire(), this.render();
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
      this.moveCursor(e ? this.parts.indexOf(e) : this.parts.findIndex((r) => r instanceof $f)), this.render();
    }
    _(e) {
      /\d/.test(e) && (this.typed += e, this.parts[this.cursor].setTo(this.typed), this.render());
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Lf.hide) : this.out.write(kf(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        Nf.symbol(this.done, this.aborted),
        Co.bold(this.msg),
        Nf.delimiter(!1),
        this.parts.reduce((e, r, i) => e.concat(i === this.cursor && !this.done ? Co.cyan().underline(r.toString()) : r), []).join("")
      ].join(" "), this.error && (this.outputText += this.errorMsg.split(`
`).reduce(
        (e, r, i) => e + `
${i ? " " : fw.pointerSmall} ${Co.red().italic(r)}`,
        ""
      )), this.out.write(mw.line + Lf.to(0) + this.outputText));
    }
  };
  qf.exports = Do;
});

// ../node_modules/prompts/lib/elements/number.js
var Uf = d((lI, Bf) => {
  var ei = z(), Tw = Be(), { cursor: ti, erase: Aw } = Q(), { style: Io, figures: Pw, clear: Ff, lines: Ow } = Ee(), Cw = /[0-9]/, No = /* @__PURE__ */ n(
  (t) => t !== void 0, "isDef"), Hf = /* @__PURE__ */ n((t, e) => {
    let r = Math.pow(10, e);
    return Math.round(t * r) / r;
  }, "round"), ko = class extends Tw {
    static {
      n(this, "NumberPrompt");
    }
    constructor(e = {}) {
      super(e), this.transform = Io.render(e.style), this.msg = e.message, this.initial = No(e.initial) ? e.initial : "", this.float = !!e.float,
      this.round = e.round || 2, this.inc = e.increment || 1, this.min = No(e.min) ? e.min : -1 / 0, this.max = No(e.max) ? e.max : 1 / 0, this.
      errorMsg = e.error || "Please Enter A Valid Value", this.validator = e.validate || (() => !0), this.color = "cyan", this.value = "", this.
      typed = "", this.lastHit = 0, this.render();
    }
    set value(e) {
      !e && e !== 0 ? (this.placeholder = !0, this.rendered = ei.gray(this.transform.render(`${this.initial}`)), this._value = "") : (this.placeholder =
      !1, this.rendered = this.transform.render(`${Hf(e, this.round)}`), this._value = Hf(e, this.round)), this.fire();
    }
    get value() {
      return this._value;
    }
    parse(e) {
      return this.float ? parseFloat(e) : parseInt(e);
    }
    valid(e) {
      return e === "-" || e === "." && this.float || Cw.test(e);
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
      this.closed || (this.firstRender || (this.outputError && this.out.write(ti.down(Ow(this.outputError, this.out.columns) - 1) + Ff(this.
      outputError, this.out.columns)), this.out.write(Ff(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [
        Io.symbol(this.done, this.aborted),
        ei.bold(this.msg),
        Io.delimiter(this.done),
        !this.done || !this.done && !this.placeholder ? ei[this.color]().underline(this.rendered) : this.rendered
      ].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((e, r, i) => e + `
${i ? " " : Pw.pointerSmall} ${ei.red().italic(r)}`, "")), this.out.write(Aw.line + ti.to(0) + this.outputText + ti.save + this.outputError +
      ti.restore));
    }
  };
  Bf.exports = ko;
});

// ../node_modules/prompts/lib/elements/multiselect.js
var $o = d((uI, Vf) => {
  "use strict";
  var Ie = z(), { cursor: Dw } = Q(), Iw = Be(), { clear: Wf, figures: tt, style: Gf, wrap: Nw, entriesToDisplay: kw } = Ee(), Lo = class extends Iw {
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
      })), this.clear = Wf("", this.out.columns), e.overrideRender || this.render();
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
    ${tt.arrowUp}/${tt.arrowDown}: Highlight option
    ${tt.arrowLeft}/${tt.arrowRight}/[space]: Toggle selection
` + (this.maxChoices === void 0 ? `    a: Toggle all
` : "") + "    enter/return: Complete answer" : "";
    }
    renderOption(e, r, i, s) {
      let o = (r.selected ? Ie.green(tt.radioOn) : tt.radioOff) + " " + s + " ", a, l;
      return r.disabled ? a = e === i ? Ie.gray().underline(r.title) : Ie.strikethrough().gray(r.title) : (a = e === i ? Ie.cyan().underline(
      r.title) : r.title, e === i && r.description && (l = ` - ${r.description}`, (o.length + a.length + l.length >= this.out.columns || r.description.
      split(/\r?\n/).length > 1) && (l = `
` + Nw(r.description, { margin: o.length, width: this.out.columns })))), o + a + Ie.gray(l || "");
    }
    // shared with autocompleteMultiselect
    paginateOptions(e) {
      if (e.length === 0)
        return Ie.red("No matches for this query.");
      let { startIndex: r, endIndex: i } = kw(this.cursor, e.length, this.optionsPerPage), s, o = [];
      for (let a = r; a < i; a++)
        a === r && r > 0 ? s = tt.arrowUp : a === i - 1 && i < e.length ? s = tt.arrowDown : s = " ", o.push(this.renderOption(this.cursor, e[a],
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
      let e = [Ie.gray(this.hint), this.renderInstructions()];
      return this.value[this.cursor].disabled && e.push(Ie.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(Dw.hide), super.render();
      let e = [
        Gf.symbol(this.done, this.aborted),
        Ie.bold(this.msg),
        Gf.delimiter(!1),
        this.renderDoneOrInstructions()
      ].join(" ");
      this.showMinError && (e += Ie.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.value), this.out.write(this.clear + e), this.clear = Wf(e, this.out.columns);
    }
  };
  Vf.exports = Lo;
});

// ../node_modules/prompts/lib/elements/autocomplete.js
var Xf = d((pI, Qf) => {
  "use strict";
  var Xt = z(), Lw = Be(), { erase: $w, cursor: Yf } = Q(), { style: Mo, clear: zf, figures: qo, wrap: Mw, entriesToDisplay: qw } = Ee(), Kf = /* @__PURE__ */ n(
  (t, e) => t[e] && (t[e].value || t[e].title || t[e]), "getVal"), jw = /* @__PURE__ */ n((t, e) => t[e] && (t[e].title || t[e].value || t[e]),
  "getTitle"), Fw = /* @__PURE__ */ n((t, e) => {
    let r = t.findIndex((i) => i.value === e || i.title === e);
    return r > -1 ? r : void 0;
  }, "getIndex"), jo = class extends Lw {
    static {
      n(this, "AutocompletePrompt");
    }
    constructor(e = {}) {
      super(e), this.msg = e.message, this.suggest = e.suggest, this.choices = e.choices, this.initial = typeof e.initial == "number" ? e.initial :
      Fw(e.choices, e.initial), this.select = this.initial || e.cursor || 0, this.i18n = { noMatches: e.noMatches || "no matches found" }, this.
      fallback = e.fallback || this.initial, this.clearFirst = e.clearFirst || !1, this.suggestions = [], this.input = "", this.limit = e.limit ||
      10, this.cursor = 0, this.transform = Mo.render(e.style), this.scale = this.transform.scale, this.render = this.render.bind(this), this.
      complete = this.complete.bind(this), this.clear = zf("", this.out.columns), this.complete(this.render), this.render();
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
      this.select = e, this.suggestions.length > 0 ? this.value = Kf(this.suggestions, e) : this.value = this.fallback.value, this.fire();
    }
    async complete(e) {
      let r = this.completing = this.suggest(this.input, this.choices), i = await r;
      if (this.completing !== r) return;
      this.suggestions = i.map((o, a, l) => ({ title: jw(l, a), value: Kf(l, a), description: o.description })), this.completing = !1;
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
      let o, a = i ? qo.arrowUp : s ? qo.arrowDown : " ", l = r ? Xt.cyan().underline(e.title) : e.title;
      return a = (r ? Xt.cyan(qo.pointer) + " " : "  ") + a, e.description && (o = ` - ${e.description}`, (a.length + l.length + o.length >=
      this.out.columns || e.description.split(/\r?\n/).length > 1) && (o = `
` + Mw(e.description, { margin: 3, width: this.out.columns }))), a + " " + l + Xt.gray(o || "");
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(Yf.hide) : this.out.write(zf(this.outputText, this.out.columns)), super.render();
      let { startIndex: e, endIndex: r } = qw(this.select, this.choices.length, this.limit);
      if (this.outputText = [
        Mo.symbol(this.done, this.aborted, this.exited),
        Xt.bold(this.msg),
        Mo.delimiter(this.completing),
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
` + (i || Xt.gray(this.fallback.title));
      }
      this.out.write($w.line + Yf.to(0) + this.outputText);
    }
  };
  Qf.exports = jo;
});

// ../node_modules/prompts/lib/elements/autocompleteMultiselect.js
var tm = d((fI, em) => {
  "use strict";
  var We = z(), { cursor: Hw } = Q(), Bw = $o(), { clear: Zf, style: Jf, figures: Pt } = Ee(), Fo = class extends Bw {
    static {
      n(this, "AutocompleteMultiselectPrompt");
    }
    constructor(e = {}) {
      e.overrideRender = !0, super(e), this.inputValue = "", this.clear = Zf("", this.out.columns), this.filteredOptions = this.value, this.
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
    ${Pt.arrowUp}/${Pt.arrowDown}: Highlight option
    ${Pt.arrowLeft}/${Pt.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
` : "";
    }
    renderCurrentInput() {
      return `
Filtered results for: ${this.inputValue ? this.inputValue : We.gray("Enter something to filter")}
`;
    }
    renderOption(e, r, i) {
      let s;
      return r.disabled ? s = e === i ? We.gray().underline(r.title) : We.strikethrough().gray(r.title) : s = e === i ? We.cyan().underline(
      r.title) : r.title, (r.selected ? We.green(Pt.radioOn) : Pt.radioOff) + "  " + s;
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let e = [We.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
      return this.filteredOptions.length && this.filteredOptions[this.cursor].disabled && e.push(We.yellow(this.warn)), e.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(Hw.hide), super.render();
      let e = [
        Jf.symbol(this.done, this.aborted),
        We.bold(this.msg),
        Jf.delimiter(!1),
        this.renderDoneOrInstructions()
      ].join(" ");
      this.showMinError && (e += We.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), e += this.renderOptions(
      this.filteredOptions), this.out.write(this.clear + e), this.clear = Zf(e, this.out.columns);
    }
  };
  em.exports = Fo;
});

// ../node_modules/prompts/lib/elements/confirm.js
var om = d((gI, nm) => {
  var rm = z(), Uw = Be(), { style: im, clear: Ww } = Ee(), { erase: Gw, cursor: sm } = Q(), Ho = class extends Uw {
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
      this.closed || (this.firstRender ? this.out.write(sm.hide) : this.out.write(Ww(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        im.symbol(this.done, this.aborted),
        rm.bold(this.msg),
        im.delimiter(this.done),
        this.done ? this.value ? this.yesMsg : this.noMsg : rm.gray(this.initialValue ? this.yesOption : this.noOption)
      ].join(" "), this.out.write(Gw.line + sm.to(0) + this.outputText));
    }
  };
  nm.exports = Ho;
});

// ../node_modules/prompts/lib/elements/index.js
var lm = d((xI, am) => {
  "use strict";
  am.exports = {
    TextPrompt: nf(),
    SelectPrompt: cf(),
    TogglePrompt: df(),
    DatePrompt: jf(),
    NumberPrompt: Uf(),
    MultiselectPrompt: $o(),
    AutocompletePrompt: Xf(),
    AutocompleteMultiselectPrompt: tm(),
    ConfirmPrompt: om()
  };
});

// ../node_modules/prompts/lib/prompts.js
var um = d((cm) => {
  "use strict";
  var ae = cm, Vw = lm(), ri = /* @__PURE__ */ n((t) => t, "noop");
  function Ne(t, e, r = {}) {
    return new Promise((i, s) => {
      let o = new Vw[t](e), a = r.onAbort || ri, l = r.onSubmit || ri, c = r.onExit || ri;
      o.on("state", e.onState || ri), o.on("submit", (u) => i(l(u))), o.on("exit", (u) => i(c(u))), o.on("abort", (u) => s(a(u)));
    });
  }
  n(Ne, "toPrompt");
  ae.text = (t) => Ne("TextPrompt", t);
  ae.password = (t) => (t.style = "password", ae.text(t));
  ae.invisible = (t) => (t.style = "invisible", ae.text(t));
  ae.number = (t) => Ne("NumberPrompt", t);
  ae.date = (t) => Ne("DatePrompt", t);
  ae.confirm = (t) => Ne("ConfirmPrompt", t);
  ae.list = (t) => {
    let e = t.separator || ",";
    return Ne("TextPrompt", t, {
      onSubmit: /* @__PURE__ */ n((r) => r.split(e).map((i) => i.trim()), "onSubmit")
    });
  };
  ae.toggle = (t) => Ne("TogglePrompt", t);
  ae.select = (t) => Ne("SelectPrompt", t);
  ae.multiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return Ne("MultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  ae.autocompleteMultiselect = (t) => {
    t.choices = [].concat(t.choices || []);
    let e = /* @__PURE__ */ n((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return Ne("AutocompleteMultiselectPrompt", t, {
      onAbort: e,
      onSubmit: e
    });
  };
  var Yw = /* @__PURE__ */ n((t, e) => Promise.resolve(
    e.filter((r) => r.title.slice(0, t.length).toLowerCase() === t.toLowerCase())
  ), "byTitle");
  ae.autocomplete = (t) => (t.suggest = t.suggest || Yw, t.choices = [].concat(t.choices || []), Ne("AutocompletePrompt", t));
});

// ../node_modules/prompts/lib/index.js
var dm = d((EI, pm) => {
  "use strict";
  var Bo = um(), zw = ["suggest", "format", "onState", "validate", "onRender", "type"], hm = /* @__PURE__ */ n(() => {
  }, "noop");
  async function rt(t = [], { onSubmit: e = hm, onCancel: r = hm } = {}) {
    let i = {}, s = rt._override || {};
    t = [].concat(t);
    let o, a, l, c, u, h, m = /* @__PURE__ */ n(async (p, v, g = !1) => {
      if (!(!g && p.validate && p.validate(v) !== !0))
        return p.format ? await p.format(v, i) : v;
    }, "getFormattedAnswer");
    for (a of t)
      if ({ name: c, type: u } = a, typeof u == "function" && (u = await u(o, { ...i }, a), a.type = u), !!u) {
        for (let p in a) {
          if (zw.includes(p)) continue;
          let v = a[p];
          a[p] = typeof v == "function" ? await v(o, { ...i }, h) : v;
        }
        if (h = a, typeof a.message != "string")
          throw new Error("prompt message is required");
        if ({ name: c, type: u } = a, Bo[u] === void 0)
          throw new Error(`prompt type (${u}) is not defined`);
        if (s[a.name] !== void 0 && (o = await m(a, s[a.name]), o !== void 0)) {
          i[c] = o;
          continue;
        }
        try {
          o = rt._injected ? Kw(rt._injected, a.initial) : await Bo[u](a), i[c] = o = await m(a, o, !0), l = await e(a, o, i);
        } catch {
          l = !await r(a, i);
        }
        if (l) return i;
      }
    return i;
  }
  n(rt, "prompt");
  function Kw(t, e) {
    let r = t.shift();
    if (r instanceof Error)
      throw r;
    return r === void 0 ? e : r;
  }
  n(Kw, "getInjectedAnswer");
  function Qw(t) {
    rt._injected = (rt._injected || []).concat(t);
  }
  n(Qw, "inject");
  function Xw(t) {
    rt._override = Object.assign({}, t);
  }
  n(Xw, "override");
  pm.exports = Object.assign(rt, { prompt: rt, prompts: Bo, inject: Qw, override: Xw });
});

// ../node_modules/prompts/index.js
var mm = d((vI, fm) => {
  function Zw(t) {
    t = (Array.isArray(t) ? t : t.split(".")).map(Number);
    let e = 0, r = process.versions.node.split(".").map(Number);
    for (; e < t.length; e++) {
      if (r[e] > t[e]) return !1;
      if (t[e] > r[e]) return !0;
    }
    return !1;
  }
  n(Zw, "isNodeLT");
  fm.exports = Zw("8.6.0") ? qd() : dm();
});

// src/core-server/presets/common-preset.ts
var Sm = pe(st(), 1);
import { existsSync as Vo } from "node:fs";
import { readFile as gR } from "node:fs/promises";
import { dirname as si, isAbsolute as yR, join as Zt } from "node:path";
import {
  getDirectoryFromWorkingDir as xR,
  getPreviewBodyTemplate as _R,
  getPreviewHeadTemplate as bR,
  loadEnvs as ER,
  removeAddon as bm
} from "@storybook/core/common";
import { telemetry as ii } from "@storybook/core/telemetry";
import { readCsf as SR } from "@storybook/core/csf-tools";
import { logger as vR } from "@storybook/core/node-logger";

// ../addons/test/src/constants.ts
var ai = "storybook/test", li = `${ai}/test-provider`, CR = `${ai}/panel`;
var Ko = "writing-tests/test-addon", DR = `${Ko}#what-happens-when-there-are-different-test-results-in-multiple-environments`, IR = `${Ko}#w\
hat-happens-if-vitest-itself-has-an-error`;
var Cm = {
  id: ai,
  initialState: {
    config: {
      coverage: !1,
      a11y: !1
    },
    watching: !1
  }
}, NR = `UNIVERSAL_STORE:${Cm.id}`;

// src/core-events/index.ts
var Qo = /* @__PURE__ */ ((w) => (w.CHANNEL_WS_DISCONNECT = "channelWSDisconnect", w.CHANNEL_CREATED = "channelCreated", w.CONFIG_ERROR = "c\
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
"testingModuleCancelTestRunResponse", w))(Qo || {});
var {
  CHANNEL_WS_DISCONNECT: LR,
  CHANNEL_CREATED: $R,
  CONFIG_ERROR: MR,
  CREATE_NEW_STORYFILE_REQUEST: qR,
  CREATE_NEW_STORYFILE_RESPONSE: jR,
  CURRENT_STORY_WAS_SET: FR,
  DOCS_PREPARED: HR,
  DOCS_RENDERED: BR,
  FILE_COMPONENT_SEARCH_REQUEST: UR,
  FILE_COMPONENT_SEARCH_RESPONSE: WR,
  FORCE_RE_RENDER: GR,
  FORCE_REMOUNT: VR,
  GLOBALS_UPDATED: YR,
  NAVIGATE_URL: zR,
  PLAY_FUNCTION_THREW_EXCEPTION: KR,
  UNHANDLED_ERRORS_WHILE_PLAYING: QR,
  PRELOAD_ENTRIES: XR,
  PREVIEW_BUILDER_PROGRESS: ZR,
  PREVIEW_KEYDOWN: JR,
  REGISTER_SUBSCRIPTION: eT,
  RESET_STORY_ARGS: tT,
  SELECT_STORY: rT,
  SET_CONFIG: iT,
  SET_CURRENT_STORY: sT,
  SET_FILTER: nT,
  SET_GLOBALS: oT,
  SET_INDEX: aT,
  SET_STORIES: lT,
  SHARED_STATE_CHANGED: cT,
  SHARED_STATE_SET: uT,
  STORIES_COLLAPSE_ALL: hT,
  STORIES_EXPAND_ALL: pT,
  STORY_ARGS_UPDATED: dT,
  STORY_CHANGED: fT,
  STORY_ERRORED: mT,
  STORY_INDEX_INVALIDATED: gT,
  STORY_MISSING: yT,
  STORY_PREPARED: xT,
  STORY_RENDER_PHASE_CHANGED: _T,
  STORY_RENDERED: bT,
  STORY_FINISHED: ET,
  STORY_SPECIFIED: ST,
  STORY_THREW_EXCEPTION: vT,
  STORY_UNCHANGED: wT,
  UPDATE_GLOBALS: RT,
  UPDATE_QUERY_PARAMS: TT,
  UPDATE_STORY_ARGS: AT,
  REQUEST_WHATS_NEW_DATA: PT,
  RESULT_WHATS_NEW_DATA: OT,
  SET_WHATS_NEW_CACHE: CT,
  TOGGLE_WHATS_NEW_NOTIFICATIONS: DT,
  TELEMETRY_ERROR: IT,
  SAVE_STORY_REQUEST: NT,
  SAVE_STORY_RESPONSE: kT,
  ARGTYPES_INFO_REQUEST: LT,
  ARGTYPES_INFO_RESPONSE: $T,
  TESTING_MODULE_CRASH_REPORT: Xo,
  TESTING_MODULE_PROGRESS_REPORT: Zo,
  TESTING_MODULE_RUN_REQUEST: MT,
  TESTING_MODULE_RUN_ALL_REQUEST: qT,
  TESTING_MODULE_CANCEL_TEST_RUN_REQUEST: jT,
  TESTING_MODULE_CANCEL_TEST_RUN_RESPONSE: FT
} = Qo;

// src/telemetry/sanitize.ts
import ta from "node:path";
function Jo(t) {
  return t.replace(/[-[/{}()*+?.\\^$|]/g, "\\$&");
}
n(Jo, "regexpEscape");
function ea(t = "") {
  return t.replace(/\u001B\[[0-9;]*m/g, "");
}
n(ea, "removeAnsiEscapeCodes");
function ci(t, e = ta.sep) {
  if (!t)
    return t;
  let r = process.cwd().split(e);
  for (; r.length > 1; ) {
    let i = r.join(e), s = new RegExp(Jo(i), "gi");
    t = t.replace(s, "$SNIP");
    let o = r.join(e + e), a = new RegExp(Jo(o), "gi");
    t = t.replace(a, "$SNIP"), r.pop();
  }
  return t;
}
n(ci, "cleanPaths");
function ra(t, e = ta.sep) {
  try {
    t = {
      ...JSON.parse(JSON.stringify(t)),
      message: ea(t.message),
      stack: ea(t.stack),
      cause: t.cause,
      name: t.name
    };
    let r = ci(JSON.stringify(t), e);
    return JSON.parse(r);
  } catch (r) {
    return `Sanitization error: ${r?.message}`;
  }
}
n(ra, "sanitizeError");

// src/core-server/server-channel/create-new-story-channel.ts
import { existsSync as Wm } from "node:fs";
import { writeFile as Gm } from "node:fs/promises";
import { relative as Pa } from "node:path";
import { getStoryId as Vm } from "@storybook/core/common";
import { telemetry as yi } from "@storybook/core/telemetry";
import {
  CREATE_NEW_STORYFILE_REQUEST as Ym,
  CREATE_NEW_STORYFILE_RESPONSE as xi
} from "@storybook/core/core-events";

// src/core-server/utils/get-new-story-file.ts
import { existsSync as sr } from "node:fs";
import { readFile as Mm } from "node:fs/promises";
import { basename as Ra, dirname as wa, extname as Ta, join as nt } from "node:path";
import {
  extractProperRendererNameFromFramework as qm,
  findConfigFile as jm,
  getFrameworkName as Fm,
  getProjectRoot as Hm,
  rendererPackages as Bm
} from "@storybook/core/common";
import { isCsfFactoryPreview as Um } from "@storybook/core/csf-tools";

// src/csf-tools/ConfigFile.ts
var oa = pe(st(), 1);
import { readFile as eA, writeFile as tA } from "node:fs/promises";
import {
  babelParse as na,
  generate as ia,
  recast as iA,
  types as f,
  traverse as sa
} from "@storybook/core/babel";
var ui = console, hi = /* @__PURE__ */ n(({
  expectedType: t,
  foundType: e,
  node: r
}) => oa.dedent`
      CSF Parsing error: Expected '${t}' but found '${e}' instead in '${r?.type}'.
    `, "getCsfParsingErrorMessage"), It = /* @__PURE__ */ n((t) => f.isIdentifier(t.key) ? t.key.name : f.isStringLiteral(t.key) ? t.key.value :
null, "propKey"), ir = /* @__PURE__ */ n((t) => f.isTSAsExpression(t) || f.isTSSatisfiesExpression(t) ? ir(t.expression) : t, "unwrap"), aa = /* @__PURE__ */ n(
(t, e) => {
  if (t.length === 0)
    return e;
  if (f.isObjectExpression(e)) {
    let [r, ...i] = t, s = e.properties.find((o) => It(o) === r);
    if (s)
      return aa(i, s.value);
  }
}, "_getPath"), la = /* @__PURE__ */ n((t, e) => {
  if (t.length === 0) {
    if (f.isObjectExpression(e))
      return e.properties;
    throw new Error("Expected object expression");
  }
  if (f.isObjectExpression(e)) {
    let [r, ...i] = t, s = e.properties.find((o) => It(o) === r);
    if (s)
      return i.length === 0 ? e.properties : la(i, s.value);
  }
}, "_getPathProperties"), ca = /* @__PURE__ */ n((t, e) => {
  let r = null, i = null;
  return e.body.find((s) => (f.isVariableDeclaration(s) ? i = s.declarations : f.isExportNamedDeclaration(s) && f.isVariableDeclaration(s.declaration) &&
  (i = s.declaration.declarations), i && i.find((o) => f.isVariableDeclarator(o) && f.isIdentifier(o.id) && o.id.name === t ? (r = o, !0) : !1))),
  r;
}, "_findVarDeclarator"), pt = /* @__PURE__ */ n((t, e) => ca(t, e)?.init, "_findVarInitialization"), Nt = /* @__PURE__ */ n((t, e) => {
  if (t.length === 0)
    return e;
  let [r, ...i] = t, s = Nt(i, e);
  return f.objectExpression([f.objectProperty(f.identifier(r), s)]);
}, "_makeObjectExpression"), pi = /* @__PURE__ */ n((t, e, r) => {
  let [i, ...s] = t, o = r.properties.find(
    (a) => It(a) === i
  );
  o ? f.isObjectExpression(o.value) && s.length > 0 ? pi(s, e, o.value) : o.value = Nt(s, e) : r.properties.push(
    f.objectProperty(f.identifier(i), Nt(s, e))
  );
}, "_updateExportNode"), di = class {
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
      let i = It(r);
      if (i) {
        let s = r.value;
        f.isIdentifier(s) && (s = pt(s.name, this._ast.program)), this._exports[i] = s;
      }
    });
  }
  parse() {
    let e = this;
    return sa(this._ast, {
      ExportDefaultDeclaration: {
        enter({ node: r, parent: i }) {
          e.hasDefaultExport = !0;
          let s = f.isIdentifier(r.declaration) && f.isProgram(i) ? pt(r.declaration.name, i) : r.declaration;
          s = ir(s), f.isCallExpression(s) && f.isObjectExpression(s.arguments[0]) && (s = s.arguments[0]), f.isObjectExpression(s) ? e._parseExportsObject(
          s) : ui.warn(
            hi({
              expectedType: "ObjectExpression",
              foundType: s?.type,
              node: s || r.declaration
            })
          );
        }
      },
      ExportNamedDeclaration: {
        enter({ node: r, parent: i }) {
          if (f.isVariableDeclaration(r.declaration))
            r.declaration.declarations.forEach((s) => {
              if (f.isVariableDeclarator(s) && f.isIdentifier(s.id)) {
                let { name: o } = s.id, a = s.init;
                f.isIdentifier(a) && (a = pt(a.name, i)), e._exports[o] = a, e._exportDecls[o] = s;
              }
            });
          else if (f.isFunctionDeclaration(r.declaration)) {
            let s = r.declaration;
            if (f.isIdentifier(s.id)) {
              let { name: o } = s.id;
              e._exportDecls[o] = s;
            }
          } else r.specifiers ? r.specifiers.forEach((s) => {
            if (f.isExportSpecifier(s) && f.isIdentifier(s.local) && f.isIdentifier(s.exported)) {
              let { name: o } = s.local, { name: a } = s.exported, l = ca(o, i);
              l && (e._exports[a] = l.init, e._exportDecls[a] = l);
            }
          }) : ui.warn(
            hi({
              expectedType: "VariableDeclaration",
              foundType: r.declaration?.type,
              node: r.declaration
            })
          );
        }
      },
      ExpressionStatement: {
        enter({ node: r, parent: i }) {
          if (f.isAssignmentExpression(r.expression) && r.expression.operator === "=") {
            let { left: s, right: o } = r.expression;
            if (f.isMemberExpression(s) && f.isIdentifier(s.object) && s.object.name === "module" && f.isIdentifier(s.property) && s.property.
            name === "exports") {
              let a = o;
              f.isIdentifier(o) && (a = pt(o.name, i)), a = ir(a), f.isObjectExpression(a) ? (e._exportsObject = a, a.properties.forEach((l) => {
                let c = It(l);
                if (c) {
                  let u = l.value;
                  f.isIdentifier(u) && (u = pt(
                    u.name,
                    i
                  )), e._exports[c] = u;
                }
              })) : ui.warn(
                hi({
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
          f.isIdentifier(r.callee) && r.callee.name === "definePreview" && r.arguments.length === 1 && f.isObjectExpression(r.arguments[0]) &&
          e._parseExportsObject(r.arguments[0]);
        }, "enter")
      }
    }), e;
  }
  getFieldNode(e) {
    let [r, ...i] = e, s = this._exports[r];
    if (s)
      return aa(i, s);
  }
  getFieldProperties(e) {
    let [r, ...i] = e, s = this._exports[r];
    if (s)
      return la(i, s);
  }
  getFieldValue(e) {
    let r = this.getFieldNode(e);
    if (r) {
      let { code: i } = ia(r, {});
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
      pi(e, r, this._exportsObject), this._exports[e[0]] = r;
    else if (o && f.isObjectExpression(o) && s.length > 0)
      pi(s, r, o);
    else if (o && s.length === 0 && this._exportDecls[e[0]]) {
      let a = this._exportDecls[e[0]];
      f.isVariableDeclarator(a) && (a.init = Nt([], r));
    } else {
      if (this.hasDefaultExport)
        throw new Error(
          `Could not set the "${e.join(
            "."
          )}" field as the default export is not an object in this file.`
        );
      {
        let a = Nt(s, r), l = f.exportNamedDeclaration(
          f.variableDeclaration("const", [f.variableDeclarator(f.identifier(i), a)])
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
    return f.isArrayExpression(r) && r.elements.forEach((s) => {
      i.push(this._getPresetValue(s, "name"));
    }), i;
  }
  _getPnpWrappedValue(e) {
    if (f.isCallExpression(e)) {
      let r = e.arguments[0];
      if (f.isStringLiteral(r))
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
    if (f.isStringLiteral(e) ? i = e.value : f.isObjectExpression(e) ? e.properties.forEach((s) => {
      f.isObjectProperty(s) && f.isIdentifier(s.key) && s.key.name === r && (f.isStringLiteral(s.value) ? i = s.value.value : i = this._getPnpWrappedValue(
      s.value)), f.isObjectProperty(s) && f.isStringLiteral(s.key) && s.key.value === "name" && f.isStringLiteral(s.value) && (i = s.value.value);
    }) : f.isCallExpression(e) && (i = this._getPnpWrappedValue(e)), !i)
      throw new Error(
        `The given node must be a string literal or an object expression with a "${r}" property that is a string literal.`
      );
    return i;
  }
  removeField(e) {
    let r = /* @__PURE__ */ n((s, o) => {
      let a = s.findIndex(
        (l) => f.isIdentifier(l.key) && l.key.name === o || f.isStringLiteral(l.key) && l.key.value === o
      );
      a >= 0 && s.splice(a, 1);
    }, "removeProperty");
    if (e.length === 1) {
      let s = !1;
      if (this._ast.program.body.forEach((o) => {
        if (f.isExportNamedDeclaration(o) && f.isVariableDeclaration(o.declaration)) {
          let a = o.declaration.declarations[0];
          f.isIdentifier(a.id) && a.id.name === e[0] && (this._ast.program.body.splice(this._ast.program.body.indexOf(o), 1), s = !0);
        }
        if (f.isExportDefaultDeclaration(o)) {
          let a = o.declaration;
          if (f.isIdentifier(a) && (a = pt(a.name, this._ast.program)), a = ir(a), f.isObjectExpression(a)) {
            let l = a.properties;
            r(l, e[0]), s = !0;
          }
        }
        if (f.isExpressionStatement(o) && f.isAssignmentExpression(o.expression) && f.isMemberExpression(o.expression.left) && f.isIdentifier(
        o.expression.left.object) && o.expression.left.object.name === "module" && f.isIdentifier(o.expression.left.property) && o.expression.
        left.property.name === "exports" && f.isObjectExpression(o.expression.right)) {
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
      this.setFieldNode(e, f.arrayExpression([r]));
    else if (f.isArrayExpression(i))
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
      if (f.isArrayExpression(i)) {
        let s = i.elements.findIndex((o) => f.isStringLiteral(o) ? o.value === r : f.isObjectExpression(o) ? this._getPresetValue(o, "name") ===
        r : this._getPnpWrappedValue(o) === r);
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
      let { code: s } = ia(f.valueToNode(e), { jsescOption: { quotes: r } }), o = na(`const __x = ${s}`);
      sa(o, {
        VariableDeclaration: {
          enter({ node: a }) {
            a.declarations.length === 1 && f.isVariableDeclarator(a.declarations[0]) && f.isIdentifier(a.declarations[0].id) && a.declarations[0].
            id.name === "__x" && (i = a.declarations[0].init);
          }
        }
      });
    } else
      i = f.valueToNode(e);
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
      (a) => f.isVariableDeclaration(a) && a.declarations.length === 1 && f.isVariableDeclarator(a.declarations[0]) && f.isCallExpression(a.
      declarations[0].init) && f.isIdentifier(a.declarations[0].init.callee) && a.declarations[0].init.callee.name === "require" && f.isStringLiteral(
      a.declarations[0].init.arguments[0]) && a.declarations[0].init.arguments[0].value === r
    ), s = /* @__PURE__ */ n((a) => f.isObjectPattern(i?.declarations[0].id) && i?.declarations[0].id.properties.find(
      (l) => f.isObjectProperty(l) && f.isIdentifier(l.key) && l.key.name === a
    ), "hasRequireSpecifier"), o = /* @__PURE__ */ n((a, l) => a.declarations.length === 1 && f.isVariableDeclarator(a.declarations[0]) && f.
    isIdentifier(a.declarations[0].id) && a.declarations[0].id.name === l, "hasDefaultRequireSpecifier");
    if (typeof e == "string") {
      let a = /* @__PURE__ */ n(() => {
        this._ast.program.body.unshift(
          f.variableDeclaration("const", [
            f.variableDeclarator(
              f.identifier(e),
              f.callExpression(f.identifier("require"), [f.stringLiteral(r)])
            )
          ])
        );
      }, "addDefaultRequireSpecifier");
      i && o(i, e) || a();
    } else i ? e.forEach((a) => {
      s(a) || i.declarations[0].id.properties.push(
        f.objectProperty(f.identifier(a), f.identifier(a), void 0, !0)
      );
    }) : this._ast.program.body.unshift(
      f.variableDeclaration("const", [
        f.variableDeclarator(
          f.objectPattern(
            e.map(
              (a) => f.objectProperty(f.identifier(a), f.identifier(a), void 0, !0)
            )
          ),
          f.callExpression(f.identifier("require"), [f.stringLiteral(r)])
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
    let i = /* @__PURE__ */ n((c) => f.importSpecifier(f.identifier(c), f.identifier(c)), "getNewImportSpecifier"), s = /* @__PURE__ */ n((c, u) => c.
    specifiers.find(
      (h) => f.isImportSpecifier(h) && f.isIdentifier(h.imported) && h.imported.name === u
    ), "hasImportSpecifier"), o = /* @__PURE__ */ n((c, u) => c.specifiers.find(
      (h) => f.isImportNamespaceSpecifier(h) && f.isIdentifier(h.local) && h.local.name === u
    ), "hasNamespaceImportSpecifier"), a = /* @__PURE__ */ n((c, u) => c.specifiers.find(
      (h) => f.isImportDefaultSpecifier(h) && f.isIdentifier(h.local) && h.local.name === u
    ), "hasDefaultImportSpecifier"), l = this._ast.program.body.find(
      (c) => f.isImportDeclaration(c) && c.source.value === r
    );
    e === null ? l || this._ast.program.body.unshift(f.importDeclaration([], f.stringLiteral(r))) : typeof e == "string" ? l ? a(l, e) || l.
    specifiers.push(
      f.importDefaultSpecifier(f.identifier(e))
    ) : this._ast.program.body.unshift(
      f.importDeclaration(
        [f.importDefaultSpecifier(f.identifier(e))],
        f.stringLiteral(r)
      )
    ) : Array.isArray(e) ? l ? e.forEach((c) => {
      s(l, c) || l.specifiers.push(i(c));
    }) : this._ast.program.body.unshift(
      f.importDeclaration(
        e.map(i),
        f.stringLiteral(r)
      )
    ) : e.namespace && (l ? o(l, e.namespace) || l.specifiers.push(
      f.importNamespaceSpecifier(f.identifier(e.namespace))
    ) : this._ast.program.body.unshift(
      f.importDeclaration(
        [f.importNamespaceSpecifier(f.identifier(e.namespace))],
        f.stringLiteral(r)
      )
    ));
  }
}, ua = /* @__PURE__ */ n((t, e) => {
  let r = na(t);
  return new di(r, t, e);
}, "loadConfig");

// src/core-server/utils/new-story-templates/csf-factory-template.ts
var xa = pe(st(), 1);

// src/core-server/utils/get-component-variable-name.ts
var dt = /* @__PURE__ */ n(async (t) => (await Promise.resolve().then(() => (ya(), ga))).default(t.replace(/^[^a-zA-Z_$]*/, ""), { pascalCase: !0 }).
replace(/[^a-zA-Z_$]+/, ""), "getComponentVariableName");

// src/core-server/utils/new-story-templates/csf-factory-template.ts
async function _a(t) {
  let e = t.componentIsDefaultExport ? await dt(t.basenameWithoutExtension) : t.componentExportName, r = t.componentIsDefaultExport ? `impor\
t ${e} from './${t.basenameWithoutExtension}';` : `import { ${e} } from './${t.basenameWithoutExtension}';`;
  return xa.dedent`
  ${"import preview from '#.storybook/preview';"}
  
  ${r}

  const meta = preview.meta({
    component: ${e},
  });
  
  export const ${t.exportedStoryName} = meta.story({});
  `;
}
n(_a, "getCsfFactoryTemplateForNewStoryFile");

// src/core-server/utils/new-story-templates/javascript.ts
var ba = pe(st(), 1);
async function Ea(t) {
  let e = t.componentIsDefaultExport ? await dt(t.basenameWithoutExtension) : t.componentExportName, r = t.componentIsDefaultExport ? `impor\
t ${e} from './${t.basenameWithoutExtension}';` : `import { ${e} } from './${t.basenameWithoutExtension}';`;
  return ba.dedent`
  ${r}

  const meta = {
    component: ${e},
  };
  
  export default meta;
  
  export const ${t.exportedStoryName} = {};
  `;
}
n(Ea, "getJavaScriptTemplateForNewStoryFile");

// src/core-server/utils/new-story-templates/typescript.ts
var Sa = pe(st(), 1);
async function va(t) {
  let e = t.componentIsDefaultExport ? await dt(t.basenameWithoutExtension) : t.componentExportName, r = t.componentIsDefaultExport ? `impor\
t ${e} from './${t.basenameWithoutExtension}'` : `import { ${e} } from './${t.basenameWithoutExtension}'`;
  return Sa.dedent`
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
n(va, "getTypeScriptTemplateForNewStoryFile");

// src/core-server/utils/get-new-story-file.ts
async function Aa({
  componentFilePath: t,
  componentExportName: e,
  componentIsDefaultExport: r,
  componentExportCount: i
}, s) {
  let o = Hm(), a = await Fm(s), l = await qm(a), c = Object.entries(Bm).find(
    ([, k]) => k === l
  )?.[0], u = Ra(t), h = Ta(t), m = u.replace(h, ""), p = wa(t), { storyFileName: v, isTypescript: g, storyFileExtension: b } = mi(t), R = `${v}\
.${b}`, T = `${m}.${e}.stories.${b}`, $ = "Default", D = !1;
  try {
    let k = jm("preview", s.configDir);
    if (k) {
      let O = await Mm(k, "utf-8");
      D = Um(ua(O));
    }
  } catch {
  }
  let F = "";
  return D ? F = await _a({
    basenameWithoutExtension: m,
    componentExportName: e,
    componentIsDefaultExport: r,
    exportedStoryName: $
  }) : F = g && c ? await va({
    basenameWithoutExtension: m,
    componentExportName: e,
    componentIsDefaultExport: r,
    rendererPackage: c,
    exportedStoryName: $
  }) : await Ea({
    basenameWithoutExtension: m,
    componentExportName: e,
    componentIsDefaultExport: r,
    exportedStoryName: $
  }), { storyFilePath: gi(nt(o, p), v) && i > 1 ? nt(o, p, T) : nt(o, p, R), exportedStoryName: $, storyFileContent: F, dirname: wa };
}
n(Aa, "getNewStoryFile");
var mi = /* @__PURE__ */ n((t) => {
  let e = /\.(ts|tsx|mts|cts)$/.test(t), r = Ra(t), i = Ta(t), s = r.replace(i, ""), o = e ? "tsx" : "jsx";
  return {
    storyFileName: `${s}.stories`,
    storyFileExtension: o,
    isTypescript: e
  };
}, "getStoryMetadata"), gi = /* @__PURE__ */ n((t, e) => sr(nt(t, `${e}.ts`)) || sr(nt(t, `${e}.tsx`)) || sr(nt(t, `${e}.js`)) || sr(nt(t, `${e}\
.jsx`)), "doesStoryFileExist");

// src/core-server/server-channel/create-new-story-channel.ts
function Oa(t, e, r) {
  return t.on(
    Ym,
    async (i) => {
      try {
        let { storyFilePath: s, exportedStoryName: o, storyFileContent: a } = await Aa(
          i.payload,
          e
        ), l = Pa(process.cwd(), s), { storyId: c, kind: u } = await Vm({ storyFilePath: s, exportedStoryName: o }, e);
        if (Wm(s)) {
          t.emit(xi, {
            success: !1,
            id: i.id,
            payload: {
              type: "STORY_FILE_EXISTS",
              kind: u
            },
            error: `A story file already exists at ${l}`
          }), r.disableTelemetry || yi("create-new-story-file", {
            success: !1,
            error: "STORY_FILE_EXISTS"
          });
          return;
        }
        await Gm(s, a, "utf-8"), t.emit(xi, {
          success: !0,
          id: i.id,
          payload: {
            storyId: c,
            storyFilePath: Pa(process.cwd(), s),
            exportedStoryName: o
          },
          error: null
        }), r.disableTelemetry || yi("create-new-story-file", {
          success: !0
        });
      } catch (s) {
        t.emit(xi, {
          success: !1,
          id: i.id,
          error: s?.message
        }), r.disableTelemetry || await yi("create-new-story-file", {
          success: !1,
          error: s
        });
      }
    }
  ), t;
}
n(Oa, "initCreateNewStoryChannel");

// src/core-server/server-channel/file-search-channel.ts
import { readFile as Zb } from "node:fs/promises";
import { dirname as Jb, join as wn } from "node:path";
import {
  extractProperRendererNameFromFramework as eE,
  getFrameworkName as tE,
  getProjectRoot as rE
} from "@storybook/core/common";
import { telemetry as Rn } from "@storybook/core/telemetry";
import {
  FILE_COMPONENT_SEARCH_REQUEST as iE,
  FILE_COMPONENT_SEARCH_RESPONSE as ch
} from "@storybook/core/core-events";

// src/core-server/utils/parser/generic-parser.ts
import { parser as zm, types as ye } from "@storybook/core/babel";
var nr = class {
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
    let r = zm.parse(e, {
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
      ye.isExportNamedDeclaration(o) ? (ye.isFunctionDeclaration(o.declaration) && ye.isIdentifier(o.declaration.id) && i.push({
        name: o.declaration.id.name,
        default: !1
      }), ye.isClassDeclaration(o.declaration) && ye.isIdentifier(o.declaration.id) && i.push({
        name: o.declaration.id.name,
        default: !1
      }), o.declaration === null && o.specifiers.length > 0 && o.specifiers.forEach((a) => {
        ye.isExportSpecifier(a) && ye.isIdentifier(a.exported) && i.push({
          name: a.exported.name,
          default: !1
        });
      }), ye.isVariableDeclaration(o.declaration) && o.declaration.declarations.forEach((a) => {
        ye.isVariableDeclarator(a) && ye.isIdentifier(a.id) && i.push({
          name: a.id.name,
          default: !1
        });
      })) : ye.isExportDefaultDeclaration(o) && i.push({
        name: "default",
        default: !0
      });
    }, "traverse")), { exports: i };
  }
};

// src/core-server/utils/parser/index.ts
function Ca(t) {
  return new nr();
}
n(Ca, "getParser");

// src/core-server/utils/search-files.ts
var Qb = ["js", "mjs", "cjs", "jsx", "mts", "ts", "tsx", "cts"], Xb = [
  "**/node_modules/**",
  "**/*.spec.*",
  "**/*.test.*",
  "**/*.stories.*",
  "**/storybook-static/**"
];
async function lh({
  searchQuery: t,
  cwd: e,
  ignoredFiles: r = Xb,
  fileExtensions: i = Qb
}) {
  let { globby: s, isDynamicPattern: o } = await Promise.resolve().then(() => (ah(), oh)), a = o(t, { cwd: e }), c = /(\.[a-z]+)$/i.test(t),
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
n(lh, "searchFiles");

// src/core-server/server-channel/file-search-channel.ts
async function uh(t, e, r) {
  return t.on(
    iE,
    async (i) => {
      let s = i.id;
      try {
        if (!s)
          return;
        let o = await tE(e), a = await eE(
          o
        ), l = rE(), u = (await lh({
          searchQuery: s,
          cwd: l
        })).map(async (h) => {
          let m = Ca(a);
          try {
            let p = await Zb(wn(l, h), "utf-8"), { storyFileName: v } = mi(wn(l, h)), g = Jb(h), b = gi(wn(l, g), v), R = await m.parse(p);
            return {
              filepath: h,
              exportedComponents: R.exports,
              storyFileExists: b
            };
          } catch (p) {
            return r.disableTelemetry || Rn("create-new-story-file-search", {
              success: !1,
              error: `Could not parse file: ${p}`
            }), {
              filepath: h,
              storyFileExists: !1,
              exportedComponents: null
            };
          }
        });
        r.disableTelemetry || Rn("create-new-story-file-search", {
          success: !0,
          payload: {
            fileCount: u.length
          }
        }), t.emit(ch, {
          success: !0,
          id: s,
          payload: {
            files: await Promise.all(u)
          },
          error: null
        });
      } catch (o) {
        t.emit(ch, {
          success: !1,
          id: s ?? "",
          error: `An error occurred while searching for components in the project.
${o?.message}`
        }), r.disableTelemetry || Rn("create-new-story-file-search", {
          success: !1,
          error: `An error occured while searching for components: ${o}`
        });
      }
    }
  ), t;
}
n(uh, "initFileSearchChannel");

// src/core-server/utils/constants.ts
import { dirname as sE, join as nE } from "node:path";
var hh = [
  {
    from: nE(sE(I.resolve("@storybook/core/package.json")), "assets", "browser"),
    to: "/sb-common-assets"
  }
];

// src/core-server/utils/save-story/save-story.ts
import { writeFile as lE } from "node:fs/promises";
import { basename as cE, join as uE } from "node:path";
import { formatFileContent as hE } from "@storybook/core/common";
import { storyNameFromExport as mh, toId as pE } from "@storybook/core/csf";
import { isExampleStoryId as dE, telemetry as gh } from "@storybook/core/telemetry";
import {
  SAVE_STORY_REQUEST as fE,
  SAVE_STORY_RESPONSE as yh,
  STORY_RENDERED as xh
} from "@storybook/core/core-events";
import { printCsf as mE, readCsf as gE } from "@storybook/core/csf-tools";
import { logger as yE } from "@storybook/core/node-logger";

// src/core-server/utils/save-story/duplicate-story-with-new-name.ts
import { types as Ze, traverse as ph } from "@storybook/core/babel";

// src/core-server/utils/save-story/utils.ts
var ge = class extends Error {
  static {
    n(this, "SaveStoryError");
  }
};

// src/core-server/utils/save-story/duplicate-story-with-new-name.ts
var dh = /* @__PURE__ */ n((t, e, r) => {
  let i = t._storyExports[e], s = Ze.cloneNode(i);
  if (!s)
    throw new ge("cannot clone Node");
  let o = !1;
  if (ph(s, {
    Identifier(l) {
      o || l.node.name === e && (o = !0, l.node.name = r);
    },
    ObjectProperty(l) {
      let c = l.get("key");
      c.isIdentifier() && c.node.name === "args" && l.remove();
    },
    noScope: !0
  }), !(Ze.isCallExpression(s.init) && Ze.isMemberExpression(s.init.callee) && Ze.isIdentifier(s.init.callee.property) && s.init.callee.property.
  name === "story") && (Ze.isArrowFunctionExpression(s.init) || Ze.isCallExpression(s.init)))
    throw new ge("Creating a new story based on a CSF2 story is not supported");
  return ph(t._ast, {
    Program(l) {
      l.pushContainer(
        "body",
        Ze.exportNamedDeclaration(Ze.variableDeclaration("const", [s]))
      );
    }
  }), s;
}, "duplicateStoryWithNewName");

// src/core-server/utils/save-story/update-args-in-csf-file.ts
import { types as H, traverse as aE } from "@storybook/core/babel";

// src/core-server/utils/save-story/valueToAST.ts
import { parser as oE, types as Me } from "@storybook/core/babel";
function jr(t) {
  if (t === null)
    return Me.nullLiteral();
  switch (typeof t) {
    case "function":
      return oE.parse(t.toString(), {
        allowReturnOutsideFunction: !0,
        allowSuperOutsideMethod: !0
      }).program.body[0]?.expression;
    case "number":
      return Me.numericLiteral(t);
    case "string":
      return Me.stringLiteral(t);
    case "boolean":
      return Me.booleanLiteral(t);
    case "undefined":
      return Me.identifier("undefined");
    default:
      return Array.isArray(t) ? Me.arrayExpression(t.map(jr)) : Me.objectExpression(
        Object.keys(t).filter((r) => typeof t[r] < "u").map((r) => {
          let i = t[r];
          return Me.objectProperty(Me.stringLiteral(r), jr(i));
        })
      );
  }
}
n(jr, "valueToAST");

// src/core-server/utils/save-story/update-args-in-csf-file.ts
var fh = /* @__PURE__ */ n(async (t, e) => {
  let r = !1, i = Object.fromEntries(
    Object.entries(e).map(([o, a]) => [o, jr(a)])
  );
  if (!(H.isCallExpression(t) && H.isMemberExpression(t.callee) && H.isIdentifier(t.callee.property) && t.callee.property.name === "story") &&
  (H.isArrowFunctionExpression(t) || H.isCallExpression(t)))
    throw new ge("Updating a CSF2 story is not supported");
  if (H.isObjectExpression(t)) {
    let o = t.properties, a = o.find((l) => {
      if (H.isObjectProperty(l)) {
        let c = l.key;
        return H.isIdentifier(c) && c.name === "args";
      }
      return !1;
    });
    if (a) {
      if (H.isObjectProperty(a)) {
        let l = a.value;
        if (H.isObjectExpression(l)) {
          l.properties.forEach((u) => {
            if (H.isObjectProperty(u)) {
              let h = u.key;
              H.isIdentifier(h) && h.name in i && (u.value = i[h.name], delete i[h.name]);
            }
          });
          let c = Object.entries(i);
          Object.keys(i).length && c.forEach(([u, h]) => {
            l.properties.push(H.objectProperty(H.identifier(u), h));
          });
        }
      }
    } else
      o.unshift(
        H.objectProperty(
          H.identifier("args"),
          H.objectExpression(
            Object.entries(i).map(([l, c]) => H.objectProperty(H.identifier(l), c))
          )
        )
      );
    return;
  }
  aE(t, {
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
              c.pushContainer("properties", H.objectProperty(H.identifier(h), m));
            });
          }
        }
      } else
        o.unshiftContainer(
          "properties",
          H.objectProperty(
            H.identifier("args"),
            H.objectExpression(
              Object.entries(i).map(([c, u]) => H.objectProperty(H.identifier(c), u))
            )
          )
        );
    },
    noScope: !0
  });
}, "updateArgsInCsfFile");

// src/core-server/utils/save-story/save-story.ts
var xE = /* @__PURE__ */ n((t) => JSON.parse(t, (e, r) => r === "__sb_empty_function_arg__" ? () => {
} : r), "parseArgs"), _E = /* @__PURE__ */ n((t, e) => {
  let r = "([\\s\\S])", i = "(\\r\\n|\\r|\\n)", s = i + "};" + i, o = new RegExp(
    // Looks for an export by the given name, considers the first closing brace on its own line
    // to be the end of the story definition.
    `^(?<before>${r}*)(?<story>export const ${e} =${r}+?${s})(?<after>${r}*)$`
  ), { before: a, story: l, after: c } = t.match(o)?.groups || {};
  return l ? a + l.replaceAll(/(\r\n|\r|\n)(\r\n|\r|\n)([ \t]*[a-z0-9_]+): /gi, "$2$3:") + c : t;
}, "removeExtraNewlines");
function _h(t, e, r) {
  t.on(fE, async ({ id: i, payload: s }) => {
    let { csfId: o, importPath: a, args: l, name: c } = s, u, h, m, p, v;
    try {
      m = cE(a), p = uE(process.cwd(), a);
      let g = await gE(p, {
        makeTitle: /* @__PURE__ */ n((k) => k || "myTitle", "makeTitle")
      }), b = g.parse(), R = Object.entries(b._stories), [T, $] = o.split("--");
      h = c && mh(c), u = h && pE(T, h);
      let [D] = R.find(([k, O]) => O.id.endsWith(`--${$}`)) || [];
      if (!D)
        throw new ge("Source story not found.");
      if (c && g.getStoryExport(c))
        throw new ge("Story already exists.");
      v = mh(D), await fh(
        c ? dh(b, D, c) : g.getStoryExport(D),
        l ? xE(l) : {}
      );
      let F = await hE(
        p,
        _E(mE(g).code, c || D)
      );
      await Promise.all([
        new Promise((k) => {
          t.on(xh, k), setTimeout(() => k(t.off(xh, k)), 3e3);
        }),
        lE(p, F)
      ]), t.emit(yh, {
        id: i,
        success: !0,
        payload: {
          csfId: o,
          newStoryId: u,
          newStoryName: h,
          newStoryExportName: c,
          sourceFileContent: F,
          sourceFileName: m,
          sourceStoryName: v,
          sourceStoryExportName: D
        },
        error: null
      });
      let C = dE(u ?? o);
      !r.disableTelemetry && !C && await gh("save-story", {
        action: c ? "createStory" : "updateStory",
        success: !0
      });
    } catch (g) {
      t.emit(yh, {
        id: i,
        success: !1,
        error: g instanceof ge ? g.message : "Unknown error"
      }), yE.error(
        `Error writing to ${p}:
${g.stack || g.message || g.toString()}`
      ), !r.disableTelemetry && !(g instanceof ge) && await gh("save-story", {
        action: c ? "createStory" : "updateStory",
        success: !1,
        error: g
      });
    }
  });
}
n(_h, "initializeSaveStory");

// src/core-server/utils/server-statics.ts
var $h = pe(Sh(), 1), YE = pe(Lh(), 1), Mh = pe(st(), 1);
import { existsSync as HE, statSync as o0 } from "node:fs";
import { basename as l0, isAbsolute as BE, posix as UE, resolve as WE, sep as GE, win32 as VE } from "node:path";
import { getDirectoryFromWorkingDir as u0 } from "@storybook/core/common";
import { logger as p0 } from "@storybook/core/node-logger";
var qh = /* @__PURE__ */ n((t) => {
  let e = t.lastIndexOf(":"), i = VE.isAbsolute(t) && e === 1, s = e !== -1 && !i ? e : t.length, a = (t.substring(s + 1) || "/").split(GE).
  join(UE.sep), l = t.substring(0, s), c = BE(l) ? l : `./${l}`, u = WE(c), h = a.replace(/^\/?/, "./"), m = h.substring(1);
  if (!HE(u))
    throw new Error(
      Mh.dedent`
        Failed to load static files, no such directory: ${$h.default.cyan(u)}
        Make sure this directory exists.
      `
    );
  return { staticDir: c, staticPath: u, targetDir: h, targetEndpoint: m };
}, "parseStaticDir");

// src/core-server/utils/whats-new.ts
import { writeFile as nR } from "node:fs/promises";
import { findConfigFile as oR, loadMainConfig as aR } from "@storybook/core/common";
import { telemetry as lR } from "@storybook/core/telemetry";
import {
  REQUEST_WHATS_NEW_DATA as cR,
  RESULT_WHATS_NEW_DATA as ym,
  SET_WHATS_NEW_CACHE as uR,
  TELEMETRY_ERROR as hR,
  TOGGLE_WHATS_NEW_NOTIFICATIONS as pR
} from "@storybook/core/core-events";
import { printConfig as dR, readConfig as fR } from "@storybook/core/csf-tools";
import { logger as xm } from "@storybook/core/node-logger";

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var zE = process.env.NODE_ENV === "production", On = "Invariant failed";
function Cn(t, e) {
  if (!t) {
    if (zE)
      throw new Error(On);
    var r = typeof e == "function" ? e() : e, i = r ? "".concat(On, ": ").concat(r) : On;
    throw new Error(i);
  }
}
n(Cn, "invariant");

// src/core-server/withTelemetry.ts
var gm = pe(mm(), 1);
import { cache as Uo, loadAllPresets as Jw } from "@storybook/core/common";
import { getPrecedingUpgrade as eR, oneWayHash as tR, telemetry as rR } from "@storybook/core/telemetry";
import { logger as PI } from "@storybook/core/node-logger";
var iR = /* @__PURE__ */ n(async () => {
  if (process.env.CI)
    return;
  let { enableCrashReports: t } = await (0, gm.default)({
    type: "confirm",
    name: "enableCrashReports",
    message: "Would you like to help improve Storybook by sending anonymous crash reports?",
    initial: !0
  });
  return await Uo.set("enableCrashReports", t), t;
}, "promptCrashReports");
async function sR({
  cliOptions: t,
  presetOptions: e,
  skipPrompt: r
}) {
  if (t.disableTelemetry)
    return "none";
  if (!e)
    return "full";
  let s = await (await Jw(e)).apply("core");
  if (s?.enableCrashReports !== void 0)
    return s.enableCrashReports ? "full" : "error";
  if (s?.disableTelemetry)
    return "none";
  let o = await Uo.get("enableCrashReports") ?? await Uo.get("enableCrashreports");
  if (o !== void 0)
    return o ? "full" : "error";
  if (r)
    return "error";
  let a = await iR();
  return a !== void 0 ? a ? "full" : "error" : "full";
}
n(sR, "getErrorLevel");
async function Wo(t, e, r) {
  try {
    let i = "error";
    try {
      i = await sR(r);
    } catch {
    }
    if (i !== "none") {
      let s = await eR(), o = t, a;
      "message" in o ? a = o.message ? tR(o.message) : "EMPTY_MESSAGE" : a = "NO_MESSAGE";
      let { code: l, name: c, category: u } = o;
      await rR(
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
n(Wo, "sendTelemetryError");

// src/core-server/utils/whats-new.ts
var Go = "whats-new-cache", mR = "https://storybook.js.org/whats-new/v1";
function _m(t, e, r) {
  t.on(uR, async (i) => {
    let s = await e.cache.get(Go).catch((o) => (xm.verbose(o), {}));
    await e.cache.set(Go, { ...s, ...i });
  }), t.on(cR, async () => {
    try {
      let i = await fetch(mR).then(async (c) => {
        if (c.ok)
          return c.json();
        throw c;
      }), o = (await aR({ configDir: e.configDir, noCache: !0 })).core?.disableWhatsNewNotifications === !0, a = await e.cache.get(Go) ?? {},
      l = {
        ...i,
        status: "SUCCESS",
        postIsRead: i.url === a.lastReadPost,
        showNotification: i.url !== a.lastDismissedPost && i.url !== a.lastReadPost,
        disableWhatsNewNotifications: o
      };
      t.emit(ym, { data: l });
    } catch (i) {
      xm.verbose(i instanceof Error ? i.message : String(i)), t.emit(ym, {
        data: { status: "ERROR" }
      });
    }
  }), t.on(
    pR,
    async ({ disableWhatsNewNotifications: i }) => {
      let s = r.disableTelemetry !== !0;
      try {
        let o = oR("main", e.configDir);
        Cn(o, `unable to find Storybook main file in ${e.configDir}`);
        let a = await fR(o);
        if (!a._exportsObject)
          throw new Error(
            "Unable to parse Storybook main file while trying to read 'core' property"
          );
        a.setFieldValue(["core", "disableWhatsNewNotifications"], i), await nR(o, dR(a).code), s && await lR("core-config", { disableWhatsNewNotifications: i });
      } catch (o) {
        Cn(o instanceof Error), s && await Wo(o, "core-config", {
          cliOptions: e,
          presetOptions: { ...e, corePresets: [], overridePresets: [] },
          skipPrompt: !0
        });
      }
    }
  ), t.on(hR, async (i) => {
    r.disableTelemetry !== !0 && await Wo(i, "browser", {
      cliOptions: e,
      presetOptions: { ...e, corePresets: [], overridePresets: [] },
      skipPrompt: !0
    });
  });
}
n(_m, "initializeWhatsNew");

// src/core-server/presets/common-preset.ts
var wR = /* @__PURE__ */ n((t, e = {}) => Object.entries(e).reduce((r, [i, s]) => r.replace(new RegExp(`%${i}%`, "g"), s), t), "interpolate"),
Em = Zt(
  si(I.resolve("@storybook/core/package.json")),
  "/assets/browser/favicon.svg"
), iN = /* @__PURE__ */ n(async (t = []) => [
  ...hh,
  ...t
], "staticDirs"), sN = /* @__PURE__ */ n(async (t, e) => {
  if (t)
    return t;
  let r = await e.presets.apply("staticDirs"), i = r ? r.map((s) => typeof s == "string" ? s : `${s.from}:${s.to}`) : [];
  if (i.length > 0) {
    let o = i.map((a) => {
      let l = [], c = r && !yR(a) ? xR({
        configDir: e.configDir,
        workingDir: process.cwd(),
        directory: a
      }) : a, { staticPath: u, targetEndpoint: h } = qh(c);
      if (h === "/") {
        let p = Zt(u, "favicon.svg");
        Vo(p) && l.push(p);
      }
      if (h === "/") {
        let p = Zt(u, "favicon.ico");
        Vo(p) && l.push(p);
      }
      return l;
    }).reduce((a, l) => a.concat(l), []);
    return o.length > 1 && vR.warn(Sm.dedent`
        Looks like multiple favicons were detected. Using the first one.

        ${o.join(", ")}
        `), o[0] || Em;
  }
  return Em;
}, "favicon"), nN = /* @__PURE__ */ n(async (t, e) => {
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
}, "babel"), oN = /* @__PURE__ */ n((t, e) => t || e.packageJson?.name || !1, "title"), aN = /* @__PURE__ */ n((t, e) => t || e.loglevel || "\
info", "logLevel"), lN = /* @__PURE__ */ n(async (t, { configDir: e, presets: r }) => {
  let i = await r.apply("env");
  return bR(e, i);
}, "previewHead"), cN = /* @__PURE__ */ n(async () => ER({ production: !0 }).raw, "env"), uN = /* @__PURE__ */ n(async (t, { configDir: e, presets: r }) => {
  let i = await r.apply("env");
  return _R(e, i);
}, "previewBody"), hN = /* @__PURE__ */ n(() => ({
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
}), "typescript"), RR = /* @__PURE__ */ n((t) => {
  if (t !== void 0) {
    if (t.toUpperCase() === "FALSE")
      return !1;
    if (t.toUpperCase() === "TRUE" || typeof t == "string")
      return !0;
  }
}, "optionalEnvToBoolean"), pN = /* @__PURE__ */ n((t, e) => {
  let r = bm;
  return e.disableTelemetry || (r = /* @__PURE__ */ n(async (i, s) => (await ii("remove", { addon: i, source: "api" }), bm(i, s)), "removeAd\
don")), { ...t, removeAddon: r };
}, "experimental_serverAPI"), dN = /* @__PURE__ */ n(async (t, e) => ({
  ...t,
  disableTelemetry: e.disableTelemetry === !0 || e.test === !0,
  enableCrashReports: e.enableCrashReports || RR(process.env.STORYBOOK_ENABLE_CRASH_REPORTS)
}), "core"), fN = /* @__PURE__ */ n(async (t) => ({
  ...t,
  argTypeTargetsV7: !0,
  legacyDecoratorFileOrder: !1,
  disallowImplicitActionsInRenderV8: !0
}), "features"), TR = {
  test: /(stories|story)\.(m?js|ts)x?$/,
  createIndex: /* @__PURE__ */ n(async (t, e) => (await SR(t, e)).parse().indexInputs, "createIndex")
}, mN = /* @__PURE__ */ n((t) => [TR].concat(t || []), "experimental_indexers"), gN = /* @__PURE__ */ n(async (t, e) => {
  let r = await e.presets.apply("framework");
  return typeof r == "string" ? {} : typeof r > "u" ? null : r.options;
}, "frameworkOptions"), yN = /* @__PURE__ */ n((t, { docs: e }) => t && e !== void 0 ? {
  ...t,
  docsMode: e
} : t, "docs"), xN = /* @__PURE__ */ n(async (t, e) => {
  let r = Zt(e.configDir, "manager-head.html");
  if (Vo(r)) {
    let i = gR(r, { encoding: "utf8" }), s = e.presets.apply("env");
    return wR(await i, await s);
  }
  return "";
}, "managerHead"), _N = /* @__PURE__ */ n(async (t, e) => {
  let r = await e.presets.apply("core");
  return _m(t, e, r), _h(t, e, r), uh(t, e, r), Oa(t, e, r), e.disableTelemetry || (t.on(
    Zo,
    async (i) => {
      if (i.providerId === li)
        return;
      let s = "status" in i ? i.status : void 0, o = "progress" in i ? i.progress : void 0, a = "error" in i ? i.error : void 0;
      (s === "success" || s === "cancelled") && o?.finishedAt && await ii("testing-module-completed-report", {
        provider: i.providerId,
        duration: o?.finishedAt - o?.startedAt,
        numTotalTests: o?.numTotalTests,
        numFailedTests: o?.numFailedTests,
        numPassedTests: o?.numPassedTests,
        status: s
      }), s === "failed" && await ii("testing-module-completed-report", {
        provider: i.providerId,
        status: "failed",
        ...e.enableCrashReports && {
          error: a && ra(a)
        }
      });
    }
  ), t.on(Xo, async (i) => {
    i.providerId !== li && await ii("testing-module-crash-report", {
      provider: i.providerId,
      ...e.enableCrashReports && {
        error: ci(i.error.message)
      }
    });
  })), t;
}, "experimental_serverChannel"), bN = /* @__PURE__ */ n(async (t) => {
  try {
    return {
      ...t,
      react: si(I.resolve("react/package.json")),
      reactDom: si(I.resolve("react-dom/package.json"))
    };
  } catch {
    return t;
  }
}, "resolvedReact"), EN = /* @__PURE__ */ n(async (t) => ({
  ...t,
  "dev-only": { excludeFromDocsStories: !0 },
  "docs-only": { excludeFromSidebar: !0 },
  "test-only": { excludeFromSidebar: !0, excludeFromDocsStories: !0 }
}), "tags"), SN = /* @__PURE__ */ n(async (t, e) => [
  Zt(
    si(I.resolve("@storybook/core/package.json")),
    "dist/core-server/presets/common-manager.js"
  ),
  ...t || []
], "managerEntries");
export {
  nN as babel,
  dN as core,
  TR as csfIndexer,
  yN as docs,
  cN as env,
  mN as experimental_indexers,
  pN as experimental_serverAPI,
  _N as experimental_serverChannel,
  sN as favicon,
  fN as features,
  gN as frameworkOptions,
  aN as logLevel,
  SN as managerEntries,
  xN as managerHead,
  uN as previewBody,
  lN as previewHead,
  bN as resolvedReact,
  iN as staticDirs,
  EN as tags,
  oN as title,
  hN as typescript
};
