"use strict";
var vs = Object.create;
var pt = Object.defineProperty;
var Ts = Object.getOwnPropertyDescriptor;
var Cs = Object.getOwnPropertyNames;
var ks = Object.getPrototypeOf, As = Object.prototype.hasOwnProperty;
var l = (n, t) => pt(n, "name", { value: t, configurable: !0 });
var Se = (n, t) => () => (t || n((t = { exports: {} }).exports, t), t.exports), Rs = (n, t) => {
  for (var e in t)
    pt(n, e, { get: t[e], enumerable: !0 });
}, Ee = (n, t, e, s) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let i of Cs(t))
      !As.call(n, i) && i !== e && pt(n, i, { get: () => t[i], enumerable: !(s = Ts(t, i)) || s.enumerable });
  return n;
};
var Qt = (n, t, e) => (e = n != null ? vs(ks(n)) : {}, Ee(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  t || !n || !n.__esModule ? pt(e, "default", { value: n, enumerable: !0 }) : e,
  n
)), Ds = (n) => Ee(pt({}, "__esModule", { value: !0 }), n);

// ../node_modules/balanced-match/index.js
var ke = Se((Ji, Ce) => {
  "use strict";
  Ce.exports = ve;
  function ve(n, t, e) {
    n instanceof RegExp && (n = xe(n, e)), t instanceof RegExp && (t = xe(t, e));
    var s = Te(n, t, e);
    return s && {
      start: s[0],
      end: s[1],
      pre: e.slice(0, s[0]),
      body: e.slice(s[0] + n.length, s[1]),
      post: e.slice(s[1] + t.length)
    };
  }
  l(ve, "balanced");
  function xe(n, t) {
    var e = t.match(n);
    return e ? e[0] : null;
  }
  l(xe, "maybeMatch");
  ve.range = Te;
  function Te(n, t, e) {
    var s, i, r, o, h, a = e.indexOf(n), c = e.indexOf(t, a + 1), f = a;
    if (a >= 0 && c > 0) {
      if (n === t)
        return [a, c];
      for (s = [], r = e.length; f >= 0 && !h; )
        f == a ? (s.push(f), a = e.indexOf(n, f + 1)) : s.length == 1 ? h = [s.pop(), c] : (i = s.pop(), i < r && (r = i, o = c), c = e.indexOf(
        t, f + 1)), f = a < c && a >= 0 ? a : c;
      s.length && (h = [r, o]);
    }
    return h;
  }
  l(Te, "range");
});

// ../node_modules/brace-expansion/index.js
var Ne = Se((Qi, _e) => {
  var Ae = ke();
  _e.exports = Ms;
  var Re = "\0SLASH" + Math.random() + "\0", De = "\0OPEN" + Math.random() + "\0", ee = "\0CLOSE" + Math.random() + "\0", Oe = "\0COMMA" + Math.
  random() + "\0", Fe = "\0PERIOD" + Math.random() + "\0";
  function te(n) {
    return parseInt(n, 10) == n ? parseInt(n, 10) : n.charCodeAt(0);
  }
  l(te, "numeric");
  function Os(n) {
    return n.split("\\\\").join(Re).split("\\{").join(De).split("\\}").join(ee).split("\\,").join(Oe).split("\\.").join(Fe);
  }
  l(Os, "escapeBraces");
  function Fs(n) {
    return n.split(Re).join("\\").split(De).join("{").split(ee).join("}").split(Oe).join(",").split(Fe).join(".");
  }
  l(Fs, "unescapeBraces");
  function Me(n) {
    if (!n)
      return [""];
    var t = [], e = Ae("{", "}", n);
    if (!e)
      return n.split(",");
    var s = e.pre, i = e.body, r = e.post, o = s.split(",");
    o[o.length - 1] += "{" + i + "}";
    var h = Me(r);
    return r.length && (o[o.length - 1] += h.shift(), o.push.apply(o, h)), t.push.apply(t, o), t;
  }
  l(Me, "parseCommaParts");
  function Ms(n) {
    return n ? (n.substr(0, 2) === "{}" && (n = "\\{\\}" + n.substr(2)), mt(Os(n), !0).map(Fs)) : [];
  }
  l(Ms, "expandTop");
  function _s(n) {
    return "{" + n + "}";
  }
  l(_s, "embrace");
  function Ns(n) {
    return /^-?0\d/.test(n);
  }
  l(Ns, "isPadded");
  function Ls(n, t) {
    return n <= t;
  }
  l(Ls, "lte");
  function Ps(n, t) {
    return n >= t;
  }
  l(Ps, "gte");
  function mt(n, t) {
    var e = [], s = Ae("{", "}", n);
    if (!s) return [n];
    var i = s.pre, r = s.post.length ? mt(s.post, !1) : [""];
    if (/\$$/.test(s.pre))
      for (var o = 0; o < r.length; o++) {
        var h = i + "{" + s.body + "}" + r[o];
        e.push(h);
      }
    else {
      var a = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(s.body), c = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(s.body), f = a || c, u = s.body.
      indexOf(",") >= 0;
      if (!f && !u)
        return s.post.match(/,.*\}/) ? (n = s.pre + "{" + s.body + ee + s.post, mt(n)) : [n];
      var d;
      if (f)
        d = s.body.split(/\.\./);
      else if (d = Me(s.body), d.length === 1 && (d = mt(d[0], !1).map(_s), d.length === 1))
        return r.map(function(Ft) {
          return s.pre + d[0] + Ft;
        });
      var p;
      if (f) {
        var w = te(d[0]), m = te(d[1]), y = Math.max(d[0].length, d[1].length), g = d.length == 3 ? Math.abs(te(d[2])) : 1, E = Ls, S = m < w;
        S && (g *= -1, E = Ps);
        var b = d.some(Ns);
        p = [];
        for (var x = w; E(x, m); x += g) {
          var T;
          if (c)
            T = String.fromCharCode(x), T === "\\" && (T = "");
          else if (T = String(x), b) {
            var j = y - T.length;
            if (j > 0) {
              var tt = new Array(j + 1).join("0");
              x < 0 ? T = "-" + tt + T.slice(1) : T = tt + T;
            }
          }
          p.push(T);
        }
      } else {
        p = [];
        for (var I = 0; I < d.length; I++)
          p.push.apply(p, mt(d[I], !1));
      }
      for (var I = 0; I < p.length; I++)
        for (var o = 0; o < r.length; o++) {
          var h = i + p[I] + r[o];
          (!t || f || h) && e.push(h);
        }
    }
    return e;
  }
  l(mt, "expand");
});

// src/core-server/presets/common-override-preset.ts
var Xi = {};
Rs(Xi, {
  build: () => Vi,
  docs: () => Ki,
  framework: () => Gi,
  stories: () => Hi,
  typescript: () => qi
});
module.exports = Ds(Xi);

// src/core-server/utils/remove-mdx-entries.ts
var X = require("node:path"), Zt = require("@storybook/core/common");

// ../node_modules/glob/node_modules/minimatch/dist/esm/index.js
var Ue = Qt(Ne(), 1);

// ../node_modules/glob/node_modules/minimatch/dist/esm/assert-valid-pattern.js
var gt = /* @__PURE__ */ l((n) => {
  if (typeof n != "string")
    throw new TypeError("invalid pattern");
  if (n.length > 65536)
    throw new TypeError("pattern is too long");
}, "assertValidPattern");

// ../node_modules/glob/node_modules/minimatch/dist/esm/brace-expressions.js
var Ws = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", !0],
  "[:alpha:]": ["\\p{L}\\p{Nl}", !0],
  "[:ascii:]": ["\\x00-\\x7f", !1],
  "[:blank:]": ["\\p{Zs}\\t", !0],
  "[:cntrl:]": ["\\p{Cc}", !0],
  "[:digit:]": ["\\p{Nd}", !0],
  "[:graph:]": ["\\p{Z}\\p{C}", !0, !0],
  "[:lower:]": ["\\p{Ll}", !0],
  "[:print:]": ["\\p{C}", !0],
  "[:punct:]": ["\\p{P}", !0],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", !0],
  "[:upper:]": ["\\p{Lu}", !0],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", !0],
  "[:xdigit:]": ["A-Fa-f0-9", !1]
}, wt = /* @__PURE__ */ l((n) => n.replace(/[[\]\\-]/g, "\\$&"), "braceEscape"), js = /* @__PURE__ */ l((n) => n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,
"\\$&"), "regexpEscape"), Le = /* @__PURE__ */ l((n) => n.join(""), "rangesToString"), Pe = /* @__PURE__ */ l((n, t) => {
  let e = t;
  if (n.charAt(e) !== "[")
    throw new Error("not in a brace expression");
  let s = [], i = [], r = e + 1, o = !1, h = !1, a = !1, c = !1, f = e, u = "";
  t: for (; r < n.length; ) {
    let m = n.charAt(r);
    if ((m === "!" || m === "^") && r === e + 1) {
      c = !0, r++;
      continue;
    }
    if (m === "]" && o && !a) {
      f = r + 1;
      break;
    }
    if (o = !0, m === "\\" && !a) {
      a = !0, r++;
      continue;
    }
    if (m === "[" && !a) {
      for (let [y, [g, E, S]] of Object.entries(Ws))
        if (n.startsWith(y, r)) {
          if (u)
            return ["$.", !1, n.length - e, !0];
          r += y.length, S ? i.push(g) : s.push(g), h = h || E;
          continue t;
        }
    }
    if (a = !1, u) {
      m > u ? s.push(wt(u) + "-" + wt(m)) : m === u && s.push(wt(m)), u = "", r++;
      continue;
    }
    if (n.startsWith("-]", r + 1)) {
      s.push(wt(m + "-")), r += 2;
      continue;
    }
    if (n.startsWith("-", r + 1)) {
      u = m, r += 2;
      continue;
    }
    s.push(wt(m)), r++;
  }
  if (f < r)
    return ["", !1, 0, !1];
  if (!s.length && !i.length)
    return ["$.", !1, n.length - e, !0];
  if (i.length === 0 && s.length === 1 && /^\\?.$/.test(s[0]) && !c) {
    let m = s[0].length === 2 ? s[0].slice(-1) : s[0];
    return [js(m), !1, f - e, !1];
  }
  let d = "[" + (c ? "^" : "") + Le(s) + "]", p = "[" + (c ? "" : "^") + Le(i) + "]";
  return [s.length && i.length ? "(" + d + "|" + p + ")" : s.length ? d : p, h, f - e, !0];
}, "parseClass");

// ../node_modules/glob/node_modules/minimatch/dist/esm/unescape.js
var z = /* @__PURE__ */ l((n, { windowsPathsNoEscape: t = !1 } = {}) => t ? n.replace(/\[([^\/\\])\]/g, "$1") : n.replace(/((?!\\).|^)\[([^\/\\])\]/g,
"$1$2").replace(/\\([^\/])/g, "$1"), "unescape");

// ../node_modules/glob/node_modules/minimatch/dist/esm/ast.js
var Is = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]), We = /* @__PURE__ */ l((n) => Is.has(n), "isExtglobType"), zs = "(?!(?:^|/)\\.\\.\
?(?:$|/))", Mt = "(?!\\.)", Bs = /* @__PURE__ */ new Set(["[", "."]), Us = /* @__PURE__ */ new Set(["..", "."]), $s = new Set("().*{}+?[]^$\\\
!"), Gs = /* @__PURE__ */ l((n) => n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "regExpEscape"), se = "[^/]", je = se + "*?", Ie = se + "+\
?", it = class n {
  static {
    l(this, "AST");
  }
  type;
  #t;
  #e;
  #n = !1;
  #i = [];
  #o;
  #S;
  #l;
  #f = !1;
  #h;
  #a;
  // set to true if it's an extglob with no children
  // (which really means one child of '')
  #r = !1;
  constructor(t, e, s = {}) {
    this.type = t, t && (this.#e = !0), this.#o = e, this.#t = this.#o ? this.#o.#t : this, this.#h = this.#t === this ? s : this.#t.#h, this.#l =
    this.#t === this ? [] : this.#t.#l, t === "!" && !this.#t.#f && this.#l.push(this), this.#S = this.#o ? this.#o.#i.length : 0;
  }
  get hasMagic() {
    if (this.#e !== void 0)
      return this.#e;
    for (let t of this.#i)
      if (typeof t != "string" && (t.type || t.hasMagic))
        return this.#e = !0;
    return this.#e;
  }
  // reconstructs the pattern
  toString() {
    return this.#a !== void 0 ? this.#a : this.type ? this.#a = this.type + "(" + this.#i.map((t) => String(t)).join("|") + ")" : this.#a = this.#i.
    map((t) => String(t)).join("");
  }
  #g() {
    if (this !== this.#t)
      throw new Error("should only call on root");
    if (this.#f)
      return this;
    this.toString(), this.#f = !0;
    let t;
    for (; t = this.#l.pop(); ) {
      if (t.type !== "!")
        continue;
      let e = t, s = e.#o;
      for (; s; ) {
        for (let i = e.#S + 1; !s.type && i < s.#i.length; i++)
          for (let r of t.#i) {
            if (typeof r == "string")
              throw new Error("string part in extglob AST??");
            r.copyIn(s.#i[i]);
          }
        e = s, s = e.#o;
      }
    }
    return this;
  }
  push(...t) {
    for (let e of t)
      if (e !== "") {
        if (typeof e != "string" && !(e instanceof n && e.#o === this))
          throw new Error("invalid part: " + e);
        this.#i.push(e);
      }
  }
  toJSON() {
    let t = this.type === null ? this.#i.slice().map((e) => typeof e == "string" ? e : e.toJSON()) : [this.type, ...this.#i.map((e) => e.toJSON())];
    return this.isStart() && !this.type && t.unshift([]), this.isEnd() && (this === this.#t || this.#t.#f && this.#o?.type === "!") && t.push(
    {}), t;
  }
  isStart() {
    if (this.#t === this)
      return !0;
    if (!this.#o?.isStart())
      return !1;
    if (this.#S === 0)
      return !0;
    let t = this.#o;
    for (let e = 0; e < this.#S; e++) {
      let s = t.#i[e];
      if (!(s instanceof n && s.type === "!"))
        return !1;
    }
    return !0;
  }
  isEnd() {
    if (this.#t === this || this.#o?.type === "!")
      return !0;
    if (!this.#o?.isEnd())
      return !1;
    if (!this.type)
      return this.#o?.isEnd();
    let t = this.#o ? this.#o.#i.length : 0;
    return this.#S === t - 1;
  }
  copyIn(t) {
    typeof t == "string" ? this.push(t) : this.push(t.clone(this));
  }
  clone(t) {
    let e = new n(this.type, t);
    for (let s of this.#i)
      e.copyIn(s);
    return e;
  }
  static #w(t, e, s, i) {
    let r = !1, o = !1, h = -1, a = !1;
    if (e.type === null) {
      let p = s, w = "";
      for (; p < t.length; ) {
        let m = t.charAt(p++);
        if (r || m === "\\") {
          r = !r, w += m;
          continue;
        }
        if (o) {
          p === h + 1 ? (m === "^" || m === "!") && (a = !0) : m === "]" && !(p === h + 2 && a) && (o = !1), w += m;
          continue;
        } else if (m === "[") {
          o = !0, h = p, a = !1, w += m;
          continue;
        }
        if (!i.noext && We(m) && t.charAt(p) === "(") {
          e.push(w), w = "";
          let y = new n(m, e);
          p = n.#w(t, y, p, i), e.push(y);
          continue;
        }
        w += m;
      }
      return e.push(w), p;
    }
    let c = s + 1, f = new n(null, e), u = [], d = "";
    for (; c < t.length; ) {
      let p = t.charAt(c++);
      if (r || p === "\\") {
        r = !r, d += p;
        continue;
      }
      if (o) {
        c === h + 1 ? (p === "^" || p === "!") && (a = !0) : p === "]" && !(c === h + 2 && a) && (o = !1), d += p;
        continue;
      } else if (p === "[") {
        o = !0, h = c, a = !1, d += p;
        continue;
      }
      if (We(p) && t.charAt(c) === "(") {
        f.push(d), d = "";
        let w = new n(p, f);
        f.push(w), c = n.#w(t, w, c, i);
        continue;
      }
      if (p === "|") {
        f.push(d), d = "", u.push(f), f = new n(null, e);
        continue;
      }
      if (p === ")")
        return d === "" && e.#i.length === 0 && (e.#r = !0), f.push(d), d = "", e.push(...u, f), c;
      d += p;
    }
    return e.type = null, e.#e = void 0, e.#i = [t.substring(s - 1)], c;
  }
  static fromGlob(t, e = {}) {
    let s = new n(null, void 0, e);
    return n.#w(t, s, 0, e), s;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#t)
      return this.#t.toMMPattern();
    let t = this.toString(), [e, s, i, r] = this.toRegExpSource();
    if (!(i || this.#e || this.#h.nocase && !this.#h.nocaseMagicOnly && t.toUpperCase() !== t.toLowerCase()))
      return s;
    let h = (this.#h.nocase ? "i" : "") + (r ? "u" : "");
    return Object.assign(new RegExp(`^${e}$`, h), {
      _src: e,
      _glob: t
    });
  }
  get options() {
    return this.#h;
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(t) {
    let e = t ?? !!this.#h.dot;
    if (this.#t === this && this.#g(), !this.type) {
      let a = this.isStart() && this.isEnd(), c = this.#i.map((p) => {
        let [w, m, y, g] = typeof p == "string" ? n.#u(p, this.#e, a) : p.toRegExpSource(t);
        return this.#e = this.#e || y, this.#n = this.#n || g, w;
      }).join(""), f = "";
      if (this.isStart() && typeof this.#i[0] == "string" && !(this.#i.length === 1 && Us.has(this.#i[0]))) {
        let w = Bs, m = (
          // dots are allowed, and the pattern starts with [ or .
          e && w.has(c.charAt(0)) || // the pattern starts with \., and then [ or .
          c.startsWith("\\.") && w.has(c.charAt(2)) || // the pattern starts with \.\., and then [ or .
          c.startsWith("\\.\\.") && w.has(c.charAt(4))
        ), y = !e && !t && w.has(c.charAt(0));
        f = m ? zs : y ? Mt : "";
      }
      let u = "";
      return this.isEnd() && this.#t.#f && this.#o?.type === "!" && (u = "(?:$|\\/)"), [
        f + c + u,
        z(c),
        this.#e = !!this.#e,
        this.#n
      ];
    }
    let s = this.type === "*" || this.type === "+", i = this.type === "!" ? "(?:(?!(?:" : "(?:", r = this.#d(e);
    if (this.isStart() && this.isEnd() && !r && this.type !== "!") {
      let a = this.toString();
      return this.#i = [a], this.type = null, this.#e = void 0, [a, z(this.toString()), !1, !1];
    }
    let o = !s || t || e || !Mt ? "" : this.#d(!0);
    o === r && (o = ""), o && (r = `(?:${r})(?:${o})*?`);
    let h = "";
    if (this.type === "!" && this.#r)
      h = (this.isStart() && !e ? Mt : "") + Ie;
    else {
      let a = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !e && !t ? Mt : "") + je + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && o ? ")" : this.type === "*" && o ? ")?" : `)${this.type}`;
      h = i + r + a;
    }
    return [
      h,
      z(r),
      this.#e = !!this.#e,
      this.#n
    ];
  }
  #d(t) {
    return this.#i.map((e) => {
      if (typeof e == "string")
        throw new Error("string type in extglob ast??");
      let [s, i, r, o] = e.toRegExpSource(t);
      return this.#n = this.#n || o, s;
    }).filter((e) => !(this.isStart() && this.isEnd()) || !!e).join("|");
  }
  static #u(t, e, s = !1) {
    let i = !1, r = "", o = !1;
    for (let h = 0; h < t.length; h++) {
      let a = t.charAt(h);
      if (i) {
        i = !1, r += ($s.has(a) ? "\\" : "") + a;
        continue;
      }
      if (a === "\\") {
        h === t.length - 1 ? r += "\\\\" : i = !0;
        continue;
      }
      if (a === "[") {
        let [c, f, u, d] = Pe(t, h);
        if (u) {
          r += c, o = o || f, h += u - 1, e = e || d;
          continue;
        }
      }
      if (a === "*") {
        s && t === "*" ? r += Ie : r += je, e = !0;
        continue;
      }
      if (a === "?") {
        r += se, e = !0;
        continue;
      }
      r += Gs(a);
    }
    return [r, z(t), !!e, o];
  }
};

// ../node_modules/glob/node_modules/minimatch/dist/esm/escape.js
var rt = /* @__PURE__ */ l((n, { windowsPathsNoEscape: t = !1 } = {}) => t ? n.replace(/[?*()[\]]/g, "[$&]") : n.replace(/[?*()[\]\\]/g, "\\$\
&"), "escape");

// ../node_modules/glob/node_modules/minimatch/dist/esm/index.js
var F = /* @__PURE__ */ l((n, t, e = {}) => (gt(t), !e.nocomment && t.charAt(0) === "#" ? !1 : new _(t, e).match(n)), "minimatch"), Hs = /^\*+([^+@!?\*\[\(]*)$/,
qs = /* @__PURE__ */ l((n) => (t) => !t.startsWith(".") && t.endsWith(n), "starDotExtTest"), Ks = /* @__PURE__ */ l((n) => (t) => t.endsWith(
n), "starDotExtTestDot"), Vs = /* @__PURE__ */ l((n) => (n = n.toLowerCase(), (t) => !t.startsWith(".") && t.toLowerCase().endsWith(n)), "st\
arDotExtTestNocase"), Xs = /* @__PURE__ */ l((n) => (n = n.toLowerCase(), (t) => t.toLowerCase().endsWith(n)), "starDotExtTestNocaseDot"), Ys = /^\*+\.\*+$/,
Js = /* @__PURE__ */ l((n) => !n.startsWith(".") && n.includes("."), "starDotStarTest"), Zs = /* @__PURE__ */ l((n) => n !== "." && n !== ".\
." && n.includes("."), "starDotStarTestDot"), Qs = /^\.\*+$/, ti = /* @__PURE__ */ l((n) => n !== "." && n !== ".." && n.startsWith("."), "d\
otStarTest"), ei = /^\*+$/, si = /* @__PURE__ */ l((n) => n.length !== 0 && !n.startsWith("."), "starTest"), ii = /* @__PURE__ */ l((n) => n.
length !== 0 && n !== "." && n !== "..", "starTestDot"), ri = /^\?+([^+@!?\*\[\(]*)?$/, ni = /* @__PURE__ */ l(([n, t = ""]) => {
  let e = $e([n]);
  return t ? (t = t.toLowerCase(), (s) => e(s) && s.toLowerCase().endsWith(t)) : e;
}, "qmarksTestNocase"), oi = /* @__PURE__ */ l(([n, t = ""]) => {
  let e = Ge([n]);
  return t ? (t = t.toLowerCase(), (s) => e(s) && s.toLowerCase().endsWith(t)) : e;
}, "qmarksTestNocaseDot"), hi = /* @__PURE__ */ l(([n, t = ""]) => {
  let e = Ge([n]);
  return t ? (s) => e(s) && s.endsWith(t) : e;
}, "qmarksTestDot"), ai = /* @__PURE__ */ l(([n, t = ""]) => {
  let e = $e([n]);
  return t ? (s) => e(s) && s.endsWith(t) : e;
}, "qmarksTest"), $e = /* @__PURE__ */ l(([n]) => {
  let t = n.length;
  return (e) => e.length === t && !e.startsWith(".");
}, "qmarksTestNoExt"), Ge = /* @__PURE__ */ l(([n]) => {
  let t = n.length;
  return (e) => e.length === t && e !== "." && e !== "..";
}, "qmarksTestNoExtDot"), He = typeof process == "object" && process ? typeof process.env == "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ ||
process.platform : "posix", ze = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
}, li = He === "win32" ? ze.win32.sep : ze.posix.sep;
F.sep = li;
var R = Symbol("globstar **");
F.GLOBSTAR = R;
var ci = "[^/]", fi = ci + "*?", ui = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?", di = "(?:(?!(?:\\/|^)\\.).)*?", pi = /* @__PURE__ */ l((n, t = {}) => (e) => F(
e, n, t), "filter");
F.filter = pi;
var L = /* @__PURE__ */ l((n, t = {}) => Object.assign({}, n, t), "ext"), mi = /* @__PURE__ */ l((n) => {
  if (!n || typeof n != "object" || !Object.keys(n).length)
    return F;
  let t = F;
  return Object.assign(/* @__PURE__ */ l((s, i, r = {}) => t(s, i, L(n, r)), "m"), {
    Minimatch: class extends t.Minimatch {
      static {
        l(this, "Minimatch");
      }
      constructor(i, r = {}) {
        super(i, L(n, r));
      }
      static defaults(i) {
        return t.defaults(L(n, i)).Minimatch;
      }
    },
    AST: class extends t.AST {
      static {
        l(this, "AST");
      }
      /* c8 ignore start */
      constructor(i, r, o = {}) {
        super(i, r, L(n, o));
      }
      /* c8 ignore stop */
      static fromGlob(i, r = {}) {
        return t.AST.fromGlob(i, L(n, r));
      }
    },
    unescape: /* @__PURE__ */ l((s, i = {}) => t.unescape(s, L(n, i)), "unescape"),
    escape: /* @__PURE__ */ l((s, i = {}) => t.escape(s, L(n, i)), "escape"),
    filter: /* @__PURE__ */ l((s, i = {}) => t.filter(s, L(n, i)), "filter"),
    defaults: /* @__PURE__ */ l((s) => t.defaults(L(n, s)), "defaults"),
    makeRe: /* @__PURE__ */ l((s, i = {}) => t.makeRe(s, L(n, i)), "makeRe"),
    braceExpand: /* @__PURE__ */ l((s, i = {}) => t.braceExpand(s, L(n, i)), "braceExpand"),
    match: /* @__PURE__ */ l((s, i, r = {}) => t.match(s, i, L(n, r)), "match"),
    sep: t.sep,
    GLOBSTAR: R
  });
}, "defaults");
F.defaults = mi;
var qe = /* @__PURE__ */ l((n, t = {}) => (gt(n), t.nobrace || !/\{(?:(?!\{).)*\}/.test(n) ? [n] : (0, Ue.default)(n)), "braceExpand");
F.braceExpand = qe;
var gi = /* @__PURE__ */ l((n, t = {}) => new _(n, t).makeRe(), "makeRe");
F.makeRe = gi;
var wi = /* @__PURE__ */ l((n, t, e = {}) => {
  let s = new _(t, e);
  return n = n.filter((i) => s.match(i)), s.options.nonull && !n.length && n.push(t), n;
}, "match");
F.match = wi;
var Be = /[?*]|[+@!]\(.*?\)|\[|\]/, yi = /* @__PURE__ */ l((n) => n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "regExpEscape"), _ = class {
  static {
    l(this, "Minimatch");
  }
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  regexp;
  constructor(t, e = {}) {
    gt(t), e = e || {}, this.options = e, this.pattern = t, this.platform = e.platform || He, this.isWindows = this.platform === "win32", this.
    windowsPathsNoEscape = !!e.windowsPathsNoEscape || e.allowWindowsEscape === !1, this.windowsPathsNoEscape && (this.pattern = this.pattern.
    replace(/\\/g, "/")), this.preserveMultipleSlashes = !!e.preserveMultipleSlashes, this.regexp = null, this.negate = !1, this.nonegate = !!e.
    nonegate, this.comment = !1, this.empty = !1, this.partial = !!e.partial, this.nocase = !!this.options.nocase, this.windowsNoMagicRoot =
    e.windowsNoMagicRoot !== void 0 ? e.windowsNoMagicRoot : !!(this.isWindows && this.nocase), this.globSet = [], this.globParts = [], this.
    set = [], this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1)
      return !0;
    for (let t of this.set)
      for (let e of t)
        if (typeof e != "string")
          return !0;
    return !1;
  }
  debug(...t) {
  }
  make() {
    let t = this.pattern, e = this.options;
    if (!e.nocomment && t.charAt(0) === "#") {
      this.comment = !0;
      return;
    }
    if (!t) {
      this.empty = !0;
      return;
    }
    this.parseNegate(), this.globSet = [...new Set(this.braceExpand())], e.debug && (this.debug = (...r) => console.error(...r)), this.debug(
    this.pattern, this.globSet);
    let s = this.globSet.map((r) => this.slashSplit(r));
    this.globParts = this.preprocess(s), this.debug(this.pattern, this.globParts);
    let i = this.globParts.map((r, o, h) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        let a = r[0] === "" && r[1] === "" && (r[2] === "?" || !Be.test(r[2])) && !Be.test(r[3]), c = /^[a-z]:/i.test(r[0]);
        if (a)
          return [...r.slice(0, 4), ...r.slice(4).map((f) => this.parse(f))];
        if (c)
          return [r[0], ...r.slice(1).map((f) => this.parse(f))];
      }
      return r.map((a) => this.parse(a));
    });
    if (this.debug(this.pattern, i), this.set = i.filter((r) => r.indexOf(!1) === -1), this.isWindows)
      for (let r = 0; r < this.set.length; r++) {
        let o = this.set[r];
        o[0] === "" && o[1] === "" && this.globParts[r][2] === "?" && typeof o[3] == "string" && /^[a-z]:$/i.test(o[3]) && (o[2] = "?");
      }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(t) {
    if (this.options.noglobstar)
      for (let s = 0; s < t.length; s++)
        for (let i = 0; i < t[s].length; i++)
          t[s][i] === "**" && (t[s][i] = "*");
    let { optimizationLevel: e = 1 } = this.options;
    return e >= 2 ? (t = this.firstPhasePreProcess(t), t = this.secondPhasePreProcess(t)) : e >= 1 ? t = this.levelOneOptimize(t) : t = this.
    adjascentGlobstarOptimize(t), t;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(t) {
    return t.map((e) => {
      let s = -1;
      for (; (s = e.indexOf("**", s + 1)) !== -1; ) {
        let i = s;
        for (; e[i + 1] === "**"; )
          i++;
        i !== s && e.splice(s, i - s);
      }
      return e;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(t) {
    return t.map((e) => (e = e.reduce((s, i) => {
      let r = s[s.length - 1];
      return i === "**" && r === "**" ? s : i === ".." && r && r !== ".." && r !== "." && r !== "**" ? (s.pop(), s) : (s.push(i), s);
    }, []), e.length === 0 ? [""] : e));
  }
  levelTwoFileOptimize(t) {
    Array.isArray(t) || (t = this.slashSplit(t));
    let e = !1;
    do {
      if (e = !1, !this.preserveMultipleSlashes) {
        for (let i = 1; i < t.length - 1; i++) {
          let r = t[i];
          i === 1 && r === "" && t[0] === "" || (r === "." || r === "") && (e = !0, t.splice(i, 1), i--);
        }
        t[0] === "." && t.length === 2 && (t[1] === "." || t[1] === "") && (e = !0, t.pop());
      }
      let s = 0;
      for (; (s = t.indexOf("..", s + 1)) !== -1; ) {
        let i = t[s - 1];
        i && i !== "." && i !== ".." && i !== "**" && (e = !0, t.splice(s - 1, 2), s -= 2);
      }
    } while (e);
    return t.length === 0 ? [""] : t;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(t) {
    let e = !1;
    do {
      e = !1;
      for (let s of t) {
        let i = -1;
        for (; (i = s.indexOf("**", i + 1)) !== -1; ) {
          let o = i;
          for (; s[o + 1] === "**"; )
            o++;
          o > i && s.splice(i + 1, o - i);
          let h = s[i + 1], a = s[i + 2], c = s[i + 3];
          if (h !== ".." || !a || a === "." || a === ".." || !c || c === "." || c === "..")
            continue;
          e = !0, s.splice(i, 1);
          let f = s.slice(0);
          f[i] = "**", t.push(f), i--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let o = 1; o < s.length - 1; o++) {
            let h = s[o];
            o === 1 && h === "" && s[0] === "" || (h === "." || h === "") && (e = !0, s.splice(o, 1), o--);
          }
          s[0] === "." && s.length === 2 && (s[1] === "." || s[1] === "") && (e = !0, s.pop());
        }
        let r = 0;
        for (; (r = s.indexOf("..", r + 1)) !== -1; ) {
          let o = s[r - 1];
          if (o && o !== "." && o !== ".." && o !== "**") {
            e = !0;
            let a = r === 1 && s[r + 1] === "**" ? ["."] : [];
            s.splice(r - 1, 2, ...a), s.length === 0 && s.push(""), r -= 2;
          }
        }
      }
    } while (e);
    return t;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(t) {
    for (let e = 0; e < t.length - 1; e++)
      for (let s = e + 1; s < t.length; s++) {
        let i = this.partsMatch(t[e], t[s], !this.preserveMultipleSlashes);
        if (i) {
          t[e] = [], t[s] = i;
          break;
        }
      }
    return t.filter((e) => e.length);
  }
  partsMatch(t, e, s = !1) {
    let i = 0, r = 0, o = [], h = "";
    for (; i < t.length && r < e.length; )
      if (t[i] === e[r])
        o.push(h === "b" ? e[r] : t[i]), i++, r++;
      else if (s && t[i] === "**" && e[r] === t[i + 1])
        o.push(t[i]), i++;
      else if (s && e[r] === "**" && t[i] === e[r + 1])
        o.push(e[r]), r++;
      else if (t[i] === "*" && e[r] && (this.options.dot || !e[r].startsWith(".")) && e[r] !== "**") {
        if (h === "b")
          return !1;
        h = "a", o.push(t[i]), i++, r++;
      } else if (e[r] === "*" && t[i] && (this.options.dot || !t[i].startsWith(".")) && t[i] !== "**") {
        if (h === "a")
          return !1;
        h = "b", o.push(e[r]), i++, r++;
      } else
        return !1;
    return t.length === e.length && o;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    let t = this.pattern, e = !1, s = 0;
    for (let i = 0; i < t.length && t.charAt(i) === "!"; i++)
      e = !e, s++;
    s && (this.pattern = t.slice(s)), this.negate = e;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(t, e, s = !1) {
    let i = this.options;
    if (this.isWindows) {
      let m = typeof t[0] == "string" && /^[a-z]:$/i.test(t[0]), y = !m && t[0] === "" && t[1] === "" && t[2] === "?" && /^[a-z]:$/i.test(t[3]),
      g = typeof e[0] == "string" && /^[a-z]:$/i.test(e[0]), E = !g && e[0] === "" && e[1] === "" && e[2] === "?" && typeof e[3] == "string" &&
      /^[a-z]:$/i.test(e[3]), S = y ? 3 : m ? 0 : void 0, b = E ? 3 : g ? 0 : void 0;
      if (typeof S == "number" && typeof b == "number") {
        let [x, T] = [t[S], e[b]];
        x.toLowerCase() === T.toLowerCase() && (e[b] = x, b > S ? e = e.slice(b) : S > b && (t = t.slice(S)));
      }
    }
    let { optimizationLevel: r = 1 } = this.options;
    r >= 2 && (t = this.levelTwoFileOptimize(t)), this.debug("matchOne", this, { file: t, pattern: e }), this.debug("matchOne", t.length, e.
    length);
    for (var o = 0, h = 0, a = t.length, c = e.length; o < a && h < c; o++, h++) {
      this.debug("matchOne loop");
      var f = e[h], u = t[o];
      if (this.debug(e, f, u), f === !1)
        return !1;
      if (f === R) {
        this.debug("GLOBSTAR", [e, f, u]);
        var d = o, p = h + 1;
        if (p === c) {
          for (this.debug("** at the end"); o < a; o++)
            if (t[o] === "." || t[o] === ".." || !i.dot && t[o].charAt(0) === ".")
              return !1;
          return !0;
        }
        for (; d < a; ) {
          var w = t[d];
          if (this.debug(`
globstar while`, t, d, e, p, w), this.matchOne(t.slice(d), e.slice(p), s))
            return this.debug("globstar found match!", d, a, w), !0;
          if (w === "." || w === ".." || !i.dot && w.charAt(0) === ".") {
            this.debug("dot detected!", t, d, e, p);
            break;
          }
          this.debug("globstar swallow a segment, and continue"), d++;
        }
        return !!(s && (this.debug(`
>>> no match, partial?`, t, d, e, p), d === a));
      }
      let m;
      if (typeof f == "string" ? (m = u === f, this.debug("string match", f, u, m)) : (m = f.test(u), this.debug("pattern match", f, u, m)),
      !m)
        return !1;
    }
    if (o === a && h === c)
      return !0;
    if (o === a)
      return s;
    if (h === c)
      return o === a - 1 && t[o] === "";
    throw new Error("wtf?");
  }
  braceExpand() {
    return qe(this.pattern, this.options);
  }
  parse(t) {
    gt(t);
    let e = this.options;
    if (t === "**")
      return R;
    if (t === "")
      return "";
    let s, i = null;
    (s = t.match(ei)) ? i = e.dot ? ii : si : (s = t.match(Hs)) ? i = (e.nocase ? e.dot ? Xs : Vs : e.dot ? Ks : qs)(s[1]) : (s = t.match(ri)) ?
    i = (e.nocase ? e.dot ? oi : ni : e.dot ? hi : ai)(s) : (s = t.match(Ys)) ? i = e.dot ? Zs : Js : (s = t.match(Qs)) && (i = ti);
    let r = it.fromGlob(t, this.options).toMMPattern();
    return i && typeof r == "object" && Reflect.defineProperty(r, "test", { value: i }), r;
  }
  makeRe() {
    if (this.regexp || this.regexp === !1)
      return this.regexp;
    let t = this.set;
    if (!t.length)
      return this.regexp = !1, this.regexp;
    let e = this.options, s = e.noglobstar ? fi : e.dot ? ui : di, i = new Set(e.nocase ? ["i"] : []), r = t.map((a) => {
      let c = a.map((f) => {
        if (f instanceof RegExp)
          for (let u of f.flags.split(""))
            i.add(u);
        return typeof f == "string" ? yi(f) : f === R ? R : f._src;
      });
      return c.forEach((f, u) => {
        let d = c[u + 1], p = c[u - 1];
        f !== R || p === R || (p === void 0 ? d !== void 0 && d !== R ? c[u + 1] = "(?:\\/|" + s + "\\/)?" + d : c[u] = s : d === void 0 ? c[u -
        1] = p + "(?:\\/|" + s + ")?" : d !== R && (c[u - 1] = p + "(?:\\/|\\/" + s + "\\/)" + d, c[u + 1] = R));
      }), c.filter((f) => f !== R).join("/");
    }).join("|"), [o, h] = t.length > 1 ? ["(?:", ")"] : ["", ""];
    r = "^" + o + r + h + "$", this.negate && (r = "^(?!" + r + ").+$");
    try {
      this.regexp = new RegExp(r, [...i].join(""));
    } catch {
      this.regexp = !1;
    }
    return this.regexp;
  }
  slashSplit(t) {
    return this.preserveMultipleSlashes ? t.split("/") : this.isWindows && /^\/\/[^\/]+/.test(t) ? ["", ...t.split(/\/+/)] : t.split(/\/+/);
  }
  match(t, e = this.partial) {
    if (this.debug("match", t, this.pattern), this.comment)
      return !1;
    if (this.empty)
      return t === "";
    if (t === "/" && e)
      return !0;
    let s = this.options;
    this.isWindows && (t = t.split("\\").join("/"));
    let i = this.slashSplit(t);
    this.debug(this.pattern, "split", i);
    let r = this.set;
    this.debug(this.pattern, "set", r);
    let o = i[i.length - 1];
    if (!o)
      for (let h = i.length - 2; !o && h >= 0; h--)
        o = i[h];
    for (let h = 0; h < r.length; h++) {
      let a = r[h], c = i;
      if (s.matchBase && a.length === 1 && (c = [o]), this.matchOne(c, a, e))
        return s.flipNegate ? !0 : !this.negate;
    }
    return s.flipNegate ? !1 : this.negate;
  }
  static defaults(t) {
    return F.defaults(t).Minimatch;
  }
};
F.AST = it;
F.Minimatch = _;
F.escape = rt;
F.unescape = z;

// ../node_modules/glob/dist/esm/glob.js
var gs = require("node:url");

// ../node_modules/lru-cache/dist/esm/index.js
var nt = typeof performance == "object" && performance && typeof performance.now == "function" ? performance : Date, Ve = /* @__PURE__ */ new Set(),
ie = typeof process == "object" && process ? process : {}, Xe = /* @__PURE__ */ l((n, t, e, s) => {
  typeof ie.emitWarning == "function" ? ie.emitWarning(n, t, e, s) : console.error(`[${e}] ${t}: ${n}`);
}, "emitWarning"), _t = globalThis.AbortController, Ke = globalThis.AbortSignal;
if (typeof _t > "u") {
  Ke = class {
    static {
      l(this, "AbortSignal");
    }
    onabort;
    _onabort = [];
    reason;
    aborted = !1;
    addEventListener(s, i) {
      this._onabort.push(i);
    }
  }, _t = class {
    static {
      l(this, "AbortController");
    }
    constructor() {
      t();
    }
    signal = new Ke();
    abort(s) {
      if (!this.signal.aborted) {
        this.signal.reason = s, this.signal.aborted = !0;
        for (let i of this.signal._onabort)
          i(s);
        this.signal.onabort?.(s);
      }
    }
  };
  let n = ie.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1", t = /* @__PURE__ */ l(() => {
    n && (n = !1, Xe("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-c\
ontroller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, pass\
ing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WAR\
NING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", t));
  }, "warnACPolyfill");
}
var bi = /* @__PURE__ */ l((n) => !Ve.has(n), "shouldWarn"), kr = Symbol("type"), Y = /* @__PURE__ */ l((n) => n && n === Math.floor(n) && n >
0 && isFinite(n), "isPosInt"), Ye = /* @__PURE__ */ l((n) => Y(n) ? n <= Math.pow(2, 8) ? Uint8Array : n <= Math.pow(2, 16) ? Uint16Array : n <=
Math.pow(2, 32) ? Uint32Array : n <= Number.MAX_SAFE_INTEGER ? ot : null : null, "getUintArray"), ot = class extends Array {
  static {
    l(this, "ZeroArray");
  }
  constructor(t) {
    super(t), this.fill(0);
  }
}, re = class n {
  static {
    l(this, "Stack");
  }
  heap;
  length;
  // private constructor
  static #t = !1;
  static create(t) {
    let e = Ye(t);
    if (!e)
      return [];
    n.#t = !0;
    let s = new n(t, e);
    return n.#t = !1, s;
  }
  constructor(t, e) {
    if (!n.#t)
      throw new TypeError("instantiate Stack using Stack.create(n)");
    this.heap = new e(t), this.length = 0;
  }
  push(t) {
    this.heap[this.length++] = t;
  }
  pop() {
    return this.heap[--this.length];
  }
}, yt = class n {
  static {
    l(this, "LRUCache");
  }
  // options that cannot be changed without disaster
  #t;
  #e;
  #n;
  #i;
  #o;
  #S;
  /**
   * {@link LRUCache.OptionsBase.ttl}
   */
  ttl;
  /**
   * {@link LRUCache.OptionsBase.ttlResolution}
   */
  ttlResolution;
  /**
   * {@link LRUCache.OptionsBase.ttlAutopurge}
   */
  ttlAutopurge;
  /**
   * {@link LRUCache.OptionsBase.updateAgeOnGet}
   */
  updateAgeOnGet;
  /**
   * {@link LRUCache.OptionsBase.updateAgeOnHas}
   */
  updateAgeOnHas;
  /**
   * {@link LRUCache.OptionsBase.allowStale}
   */
  allowStale;
  /**
   * {@link LRUCache.OptionsBase.noDisposeOnSet}
   */
  noDisposeOnSet;
  /**
   * {@link LRUCache.OptionsBase.noUpdateTTL}
   */
  noUpdateTTL;
  /**
   * {@link LRUCache.OptionsBase.maxEntrySize}
   */
  maxEntrySize;
  /**
   * {@link LRUCache.OptionsBase.sizeCalculation}
   */
  sizeCalculation;
  /**
   * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
   */
  noDeleteOnFetchRejection;
  /**
   * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
   */
  noDeleteOnStaleGet;
  /**
   * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
   */
  allowStaleOnFetchAbort;
  /**
   * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
   */
  allowStaleOnFetchRejection;
  /**
   * {@link LRUCache.OptionsBase.ignoreFetchAbort}
   */
  ignoreFetchAbort;
  // computed properties
  #l;
  #f;
  #h;
  #a;
  #r;
  #g;
  #w;
  #d;
  #u;
  #v;
  #m;
  #T;
  #C;
  #b;
  #E;
  #x;
  #p;
  /**
   * Do not call this method unless you need to inspect the
   * inner workings of the cache.  If anything returned by this
   * object is modified in any way, strange breakage may occur.
   *
   * These fields are private for a reason!
   *
   * @internal
   */
  static unsafeExposeInternals(t) {
    return {
      // properties
      starts: t.#C,
      ttls: t.#b,
      sizes: t.#T,
      keyMap: t.#h,
      keyList: t.#a,
      valList: t.#r,
      next: t.#g,
      prev: t.#w,
      get head() {
        return t.#d;
      },
      get tail() {
        return t.#u;
      },
      free: t.#v,
      // methods
      isBackgroundFetch: /* @__PURE__ */ l((e) => t.#c(e), "isBackgroundFetch"),
      backgroundFetch: /* @__PURE__ */ l((e, s, i, r) => t.#j(e, s, i, r), "backgroundFetch"),
      moveToTail: /* @__PURE__ */ l((e) => t.#z(e), "moveToTail"),
      indexes: /* @__PURE__ */ l((e) => t.#A(e), "indexes"),
      rindexes: /* @__PURE__ */ l((e) => t.#R(e), "rindexes"),
      isStale: /* @__PURE__ */ l((e) => t.#y(e), "isStale")
    };
  }
  // Protected read-only members
  /**
   * {@link LRUCache.OptionsBase.max} (read-only)
   */
  get max() {
    return this.#t;
  }
  /**
   * {@link LRUCache.OptionsBase.maxSize} (read-only)
   */
  get maxSize() {
    return this.#e;
  }
  /**
   * The total computed size of items in the cache (read-only)
   */
  get calculatedSize() {
    return this.#f;
  }
  /**
   * The number of items stored in the cache (read-only)
   */
  get size() {
    return this.#l;
  }
  /**
   * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
   */
  get fetchMethod() {
    return this.#o;
  }
  get memoMethod() {
    return this.#S;
  }
  /**
   * {@link LRUCache.OptionsBase.dispose} (read-only)
   */
  get dispose() {
    return this.#n;
  }
  /**
   * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
   */
  get disposeAfter() {
    return this.#i;
  }
  constructor(t) {
    let { max: e = 0, ttl: s, ttlResolution: i = 1, ttlAutopurge: r, updateAgeOnGet: o, updateAgeOnHas: h, allowStale: a, dispose: c, disposeAfter: f,
    noDisposeOnSet: u, noUpdateTTL: d, maxSize: p = 0, maxEntrySize: w = 0, sizeCalculation: m, fetchMethod: y, memoMethod: g, noDeleteOnFetchRejection: E,
    noDeleteOnStaleGet: S, allowStaleOnFetchRejection: b, allowStaleOnFetchAbort: x, ignoreFetchAbort: T } = t;
    if (e !== 0 && !Y(e))
      throw new TypeError("max option must be a nonnegative integer");
    let j = e ? Ye(e) : Array;
    if (!j)
      throw new Error("invalid max value: " + e);
    if (this.#t = e, this.#e = p, this.maxEntrySize = w || this.#e, this.sizeCalculation = m, this.sizeCalculation) {
      if (!this.#e && !this.maxEntrySize)
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      if (typeof this.sizeCalculation != "function")
        throw new TypeError("sizeCalculation set to non-function");
    }
    if (g !== void 0 && typeof g != "function")
      throw new TypeError("memoMethod must be a function if defined");
    if (this.#S = g, y !== void 0 && typeof y != "function")
      throw new TypeError("fetchMethod must be a function if specified");
    if (this.#o = y, this.#x = !!y, this.#h = /* @__PURE__ */ new Map(), this.#a = new Array(e).fill(void 0), this.#r = new Array(e).fill(void 0),
    this.#g = new j(e), this.#w = new j(e), this.#d = 0, this.#u = 0, this.#v = re.create(e), this.#l = 0, this.#f = 0, typeof c == "functio\
n" && (this.#n = c), typeof f == "function" ? (this.#i = f, this.#m = []) : (this.#i = void 0, this.#m = void 0), this.#E = !!this.#n, this.#p =
    !!this.#i, this.noDisposeOnSet = !!u, this.noUpdateTTL = !!d, this.noDeleteOnFetchRejection = !!E, this.allowStaleOnFetchRejection = !!b,
    this.allowStaleOnFetchAbort = !!x, this.ignoreFetchAbort = !!T, this.maxEntrySize !== 0) {
      if (this.#e !== 0 && !Y(this.#e))
        throw new TypeError("maxSize must be a positive integer if specified");
      if (!Y(this.maxEntrySize))
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      this.#O();
    }
    if (this.allowStale = !!a, this.noDeleteOnStaleGet = !!S, this.updateAgeOnGet = !!o, this.updateAgeOnHas = !!h, this.ttlResolution = Y(i) ||
    i === 0 ? i : 1, this.ttlAutopurge = !!r, this.ttl = s || 0, this.ttl) {
      if (!Y(this.ttl))
        throw new TypeError("ttl must be a positive integer if specified");
      this.#D();
    }
    if (this.#t === 0 && this.ttl === 0 && this.#e === 0)
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    if (!this.ttlAutopurge && !this.#t && !this.#e) {
      let tt = "LRU_CACHE_UNBOUNDED";
      bi(tt) && (Ve.add(tt), Xe("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.", "UnboundedC\
acheWarning", tt, n));
    }
  }
  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(t) {
    return this.#h.has(t) ? 1 / 0 : 0;
  }
  #D() {
    let t = new ot(this.#t), e = new ot(this.#t);
    this.#b = t, this.#C = e, this.#M = (r, o, h = nt.now()) => {
      if (e[r] = o !== 0 ? h : 0, t[r] = o, o !== 0 && this.ttlAutopurge) {
        let a = setTimeout(() => {
          this.#y(r) && this.#F(this.#a[r], "expire");
        }, o + 1);
        a.unref && a.unref();
      }
    }, this.#k = (r) => {
      e[r] = t[r] !== 0 ? nt.now() : 0;
    }, this.#s = (r, o) => {
      if (t[o]) {
        let h = t[o], a = e[o];
        if (!h || !a)
          return;
        r.ttl = h, r.start = a, r.now = s || i();
        let c = r.now - a;
        r.remainingTTL = h - c;
      }
    };
    let s = 0, i = /* @__PURE__ */ l(() => {
      let r = nt.now();
      if (this.ttlResolution > 0) {
        s = r;
        let o = setTimeout(() => s = 0, this.ttlResolution);
        o.unref && o.unref();
      }
      return r;
    }, "getNow");
    this.getRemainingTTL = (r) => {
      let o = this.#h.get(r);
      if (o === void 0)
        return 0;
      let h = t[o], a = e[o];
      if (!h || !a)
        return 1 / 0;
      let c = (s || i()) - a;
      return h - c;
    }, this.#y = (r) => {
      let o = e[r], h = t[r];
      return !!h && !!o && (s || i()) - o > h;
    };
  }
  // conditionally set private methods related to TTL
  #k = /* @__PURE__ */ l(() => {
  }, "#updateItemAge");
  #s = /* @__PURE__ */ l(() => {
  }, "#statusTTL");
  #M = /* @__PURE__ */ l(() => {
  }, "#setItemTTL");
  /* c8 ignore stop */
  #y = /* @__PURE__ */ l(() => !1, "#isStale");
  #O() {
    let t = new ot(this.#t);
    this.#f = 0, this.#T = t, this.#_ = (e) => {
      this.#f -= t[e], t[e] = 0;
    }, this.#L = (e, s, i, r) => {
      if (this.#c(s))
        return 0;
      if (!Y(i))
        if (r) {
          if (typeof r != "function")
            throw new TypeError("sizeCalculation must be a function");
          if (i = r(s, e), !Y(i))
            throw new TypeError("sizeCalculation return invalid (expect positive integer)");
        } else
          throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size \
must be set.");
      return i;
    }, this.#N = (e, s, i) => {
      if (t[e] = s, this.#e) {
        let r = this.#e - t[e];
        for (; this.#f > r; )
          this.#W(!0);
      }
      this.#f += t[e], i && (i.entrySize = s, i.totalCalculatedSize = this.#f);
    };
  }
  #_ = /* @__PURE__ */ l((t) => {
  }, "#removeItemSize");
  #N = /* @__PURE__ */ l((t, e, s) => {
  }, "#addItemSize");
  #L = /* @__PURE__ */ l((t, e, s, i) => {
    if (s || i)
      throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
    return 0;
  }, "#requireSize");
  *#A({ allowStale: t = this.allowStale } = {}) {
    if (this.#l)
      for (let e = this.#u; !(!this.#P(e) || ((t || !this.#y(e)) && (yield e), e === this.#d)); )
        e = this.#w[e];
  }
  *#R({ allowStale: t = this.allowStale } = {}) {
    if (this.#l)
      for (let e = this.#d; !(!this.#P(e) || ((t || !this.#y(e)) && (yield e), e === this.#u)); )
        e = this.#g[e];
  }
  #P(t) {
    return t !== void 0 && this.#h.get(this.#a[t]) === t;
  }
  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (let t of this.#A())
      this.#r[t] !== void 0 && this.#a[t] !== void 0 && !this.#c(this.#r[t]) && (yield [this.#a[t], this.#r[t]]);
  }
  /**
   * Inverse order version of {@link LRUCache.entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (let t of this.#R())
      this.#r[t] !== void 0 && this.#a[t] !== void 0 && !this.#c(this.#r[t]) && (yield [this.#a[t], this.#r[t]]);
  }
  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (let t of this.#A()) {
      let e = this.#a[t];
      e !== void 0 && !this.#c(this.#r[t]) && (yield e);
    }
  }
  /**
   * Inverse order version of {@link LRUCache.keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (let t of this.#R()) {
      let e = this.#a[t];
      e !== void 0 && !this.#c(this.#r[t]) && (yield e);
    }
  }
  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (let t of this.#A())
      this.#r[t] !== void 0 && !this.#c(this.#r[t]) && (yield this.#r[t]);
  }
  /**
   * Inverse order version of {@link LRUCache.values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (let t of this.#R())
      this.#r[t] !== void 0 && !this.#c(this.#r[t]) && (yield this.#r[t]);
  }
  /**
   * Iterating over the cache itself yields the same results as
   * {@link LRUCache.entries}
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * A String value that is used in the creation of the default string
   * description of an object. Called by the built-in method
   * `Object.prototype.toString`.
   */
  [Symbol.toStringTag] = "LRUCache";
  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(t, e = {}) {
    for (let s of this.#A()) {
      let i = this.#r[s], r = this.#c(i) ? i.__staleWhileFetching : i;
      if (r !== void 0 && t(r, this.#a[s], this))
        return this.get(this.#a[s], e);
    }
  }
  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(t, e = this) {
    for (let s of this.#A()) {
      let i = this.#r[s], r = this.#c(i) ? i.__staleWhileFetching : i;
      r !== void 0 && t.call(e, r, this.#a[s], this);
    }
  }
  /**
   * The same as {@link LRUCache.forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(t, e = this) {
    for (let s of this.#R()) {
      let i = this.#r[s], r = this.#c(i) ? i.__staleWhileFetching : i;
      r !== void 0 && t.call(e, r, this.#a[s], this);
    }
  }
  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let t = !1;
    for (let e of this.#R({ allowStale: !0 }))
      this.#y(e) && (this.#F(this.#a[e], "expire"), t = !0);
    return t;
  }
  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
   * if relevant.
   */
  info(t) {
    let e = this.#h.get(t);
    if (e === void 0)
      return;
    let s = this.#r[e], i = this.#c(s) ? s.__staleWhileFetching : s;
    if (i === void 0)
      return;
    let r = { value: i };
    if (this.#b && this.#C) {
      let o = this.#b[e], h = this.#C[e];
      if (o && h) {
        let a = o - (nt.now() - h);
        r.ttl = a, r.start = Date.now();
      }
    }
    return this.#T && (r.size = this.#T[e]), r;
  }
  /**
   * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
   * passed to {@link LRLUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link LRUCache.OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    let t = [];
    for (let e of this.#A({ allowStale: !0 })) {
      let s = this.#a[e], i = this.#r[e], r = this.#c(i) ? i.__staleWhileFetching : i;
      if (r === void 0 || s === void 0)
        continue;
      let o = { value: r };
      if (this.#b && this.#C) {
        o.ttl = this.#b[e];
        let h = nt.now() - this.#C[e];
        o.start = Math.floor(Date.now() - h);
      }
      this.#T && (o.size = this.#T[e]), t.unshift([s, o]);
    }
    return t;
  }
  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(t) {
    this.clear();
    for (let [e, s] of t) {
      if (s.start) {
        let i = Date.now() - s.start;
        s.start = nt.now() - i;
      }
      this.set(e, s.value, s);
    }
  }
  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#delete}
   *
   * Fields on the {@link LRUCache.SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(t, e, s = {}) {
    if (e === void 0)
      return this.delete(t), this;
    let { ttl: i = this.ttl, start: r, noDisposeOnSet: o = this.noDisposeOnSet, sizeCalculation: h = this.sizeCalculation, status: a } = s, {
    noUpdateTTL: c = this.noUpdateTTL } = s, f = this.#L(t, e, s.size || 0, h);
    if (this.maxEntrySize && f > this.maxEntrySize)
      return a && (a.set = "miss", a.maxEntrySizeExceeded = !0), this.#F(t, "set"), this;
    let u = this.#l === 0 ? void 0 : this.#h.get(t);
    if (u === void 0)
      u = this.#l === 0 ? this.#u : this.#v.length !== 0 ? this.#v.pop() : this.#l === this.#t ? this.#W(!1) : this.#l, this.#a[u] = t, this.#r[u] =
      e, this.#h.set(t, u), this.#g[this.#u] = u, this.#w[u] = this.#u, this.#u = u, this.#l++, this.#N(u, f, a), a && (a.set = "add"), c = !1;
    else {
      this.#z(u);
      let d = this.#r[u];
      if (e !== d) {
        if (this.#x && this.#c(d)) {
          d.__abortController.abort(new Error("replaced"));
          let { __staleWhileFetching: p } = d;
          p !== void 0 && !o && (this.#E && this.#n?.(p, t, "set"), this.#p && this.#m?.push([p, t, "set"]));
        } else o || (this.#E && this.#n?.(d, t, "set"), this.#p && this.#m?.push([d, t, "set"]));
        if (this.#_(u), this.#N(u, f, a), this.#r[u] = e, a) {
          a.set = "replace";
          let p = d && this.#c(d) ? d.__staleWhileFetching : d;
          p !== void 0 && (a.oldValue = p);
        }
      } else a && (a.set = "update");
    }
    if (i !== 0 && !this.#b && this.#D(), this.#b && (c || this.#M(u, i, r), a && this.#s(a, u)), !o && this.#p && this.#m) {
      let d = this.#m, p;
      for (; p = d?.shift(); )
        this.#i?.(...p);
    }
    return this;
  }
  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop() {
    try {
      for (; this.#l; ) {
        let t = this.#r[this.#d];
        if (this.#W(!0), this.#c(t)) {
          if (t.__staleWhileFetching)
            return t.__staleWhileFetching;
        } else if (t !== void 0)
          return t;
      }
    } finally {
      if (this.#p && this.#m) {
        let t = this.#m, e;
        for (; e = t?.shift(); )
          this.#i?.(...e);
      }
    }
  }
  #W(t) {
    let e = this.#d, s = this.#a[e], i = this.#r[e];
    return this.#x && this.#c(i) ? i.__abortController.abort(new Error("evicted")) : (this.#E || this.#p) && (this.#E && this.#n?.(i, s, "ev\
ict"), this.#p && this.#m?.push([i, s, "evict"])), this.#_(e), t && (this.#a[e] = void 0, this.#r[e] = void 0, this.#v.push(e)), this.#l ===
    1 ? (this.#d = this.#u = 0, this.#v.length = 0) : this.#d = this.#g[e], this.#h.delete(s), this.#l--, e;
  }
  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
   */
  has(t, e = {}) {
    let { updateAgeOnHas: s = this.updateAgeOnHas, status: i } = e, r = this.#h.get(t);
    if (r !== void 0) {
      let o = this.#r[r];
      if (this.#c(o) && o.__staleWhileFetching === void 0)
        return !1;
      if (this.#y(r))
        i && (i.has = "stale", this.#s(i, r));
      else return s && this.#k(r), i && (i.has = "hit", this.#s(i, r)), !0;
    } else i && (i.has = "miss");
    return !1;
  }
  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link LRUCache.OptionsBase.allowStale} is set.
   */
  peek(t, e = {}) {
    let { allowStale: s = this.allowStale } = e, i = this.#h.get(t);
    if (i === void 0 || !s && this.#y(i))
      return;
    let r = this.#r[i];
    return this.#c(r) ? r.__staleWhileFetching : r;
  }
  #j(t, e, s, i) {
    let r = e === void 0 ? void 0 : this.#r[e];
    if (this.#c(r))
      return r;
    let o = new _t(), { signal: h } = s;
    h?.addEventListener("abort", () => o.abort(h.reason), {
      signal: o.signal
    });
    let a = {
      signal: o.signal,
      options: s,
      context: i
    }, c = /* @__PURE__ */ l((m, y = !1) => {
      let { aborted: g } = o.signal, E = s.ignoreFetchAbort && m !== void 0;
      if (s.status && (g && !y ? (s.status.fetchAborted = !0, s.status.fetchError = o.signal.reason, E && (s.status.fetchAbortIgnored = !0)) :
      s.status.fetchResolved = !0), g && !E && !y)
        return u(o.signal.reason);
      let S = p;
      return this.#r[e] === p && (m === void 0 ? S.__staleWhileFetching ? this.#r[e] = S.__staleWhileFetching : this.#F(t, "fetch") : (s.status &&
      (s.status.fetchUpdated = !0), this.set(t, m, a.options))), m;
    }, "cb"), f = /* @__PURE__ */ l((m) => (s.status && (s.status.fetchRejected = !0, s.status.fetchError = m), u(m)), "eb"), u = /* @__PURE__ */ l(
    (m) => {
      let { aborted: y } = o.signal, g = y && s.allowStaleOnFetchAbort, E = g || s.allowStaleOnFetchRejection, S = E || s.noDeleteOnFetchRejection,
      b = p;
      if (this.#r[e] === p && (!S || b.__staleWhileFetching === void 0 ? this.#F(t, "fetch") : g || (this.#r[e] = b.__staleWhileFetching)), E)
        return s.status && b.__staleWhileFetching !== void 0 && (s.status.returnedStale = !0), b.__staleWhileFetching;
      if (b.__returned === b)
        throw m;
    }, "fetchFail"), d = /* @__PURE__ */ l((m, y) => {
      let g = this.#o?.(t, r, a);
      g && g instanceof Promise && g.then((E) => m(E === void 0 ? void 0 : E), y), o.signal.addEventListener("abort", () => {
        (!s.ignoreFetchAbort || s.allowStaleOnFetchAbort) && (m(void 0), s.allowStaleOnFetchAbort && (m = /* @__PURE__ */ l((E) => c(E, !0),
        "res")));
      });
    }, "pcall");
    s.status && (s.status.fetchDispatched = !0);
    let p = new Promise(d).then(c, f), w = Object.assign(p, {
      __abortController: o,
      __staleWhileFetching: r,
      __returned: void 0
    });
    return e === void 0 ? (this.set(t, w, { ...a.options, status: void 0 }), e = this.#h.get(t)) : this.#r[e] = w, w;
  }
  #c(t) {
    if (!this.#x)
      return !1;
    let e = t;
    return !!e && e instanceof Promise && e.hasOwnProperty("__staleWhileFetching") && e.__abortController instanceof _t;
  }
  async fetch(t, e = {}) {
    let {
      // get options
      allowStale: s = this.allowStale,
      updateAgeOnGet: i = this.updateAgeOnGet,
      noDeleteOnStaleGet: r = this.noDeleteOnStaleGet,
      // set options
      ttl: o = this.ttl,
      noDisposeOnSet: h = this.noDisposeOnSet,
      size: a = 0,
      sizeCalculation: c = this.sizeCalculation,
      noUpdateTTL: f = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection: u = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection: d = this.allowStaleOnFetchRejection,
      ignoreFetchAbort: p = this.ignoreFetchAbort,
      allowStaleOnFetchAbort: w = this.allowStaleOnFetchAbort,
      context: m,
      forceRefresh: y = !1,
      status: g,
      signal: E
    } = e;
    if (!this.#x)
      return g && (g.fetch = "get"), this.get(t, {
        allowStale: s,
        updateAgeOnGet: i,
        noDeleteOnStaleGet: r,
        status: g
      });
    let S = {
      allowStale: s,
      updateAgeOnGet: i,
      noDeleteOnStaleGet: r,
      ttl: o,
      noDisposeOnSet: h,
      size: a,
      sizeCalculation: c,
      noUpdateTTL: f,
      noDeleteOnFetchRejection: u,
      allowStaleOnFetchRejection: d,
      allowStaleOnFetchAbort: w,
      ignoreFetchAbort: p,
      status: g,
      signal: E
    }, b = this.#h.get(t);
    if (b === void 0) {
      g && (g.fetch = "miss");
      let x = this.#j(t, b, S, m);
      return x.__returned = x;
    } else {
      let x = this.#r[b];
      if (this.#c(x)) {
        let Ft = s && x.__staleWhileFetching !== void 0;
        return g && (g.fetch = "inflight", Ft && (g.returnedStale = !0)), Ft ? x.__staleWhileFetching : x.__returned = x;
      }
      let T = this.#y(b);
      if (!y && !T)
        return g && (g.fetch = "hit"), this.#z(b), i && this.#k(b), g && this.#s(g, b), x;
      let j = this.#j(t, b, S, m), I = j.__staleWhileFetching !== void 0 && s;
      return g && (g.fetch = T ? "stale" : "refresh", I && T && (g.returnedStale = !0)), I ? j.__staleWhileFetching : j.__returned = j;
    }
  }
  async forceFetch(t, e = {}) {
    let s = await this.fetch(t, e);
    if (s === void 0)
      throw new Error("fetch() returned undefined");
    return s;
  }
  memo(t, e = {}) {
    let s = this.#S;
    if (!s)
      throw new Error("no memoMethod provided to constructor");
    let { context: i, forceRefresh: r, ...o } = e, h = this.get(t, o);
    if (!r && h !== void 0)
      return h;
    let a = s(t, h, {
      options: o,
      context: i
    });
    return this.set(t, a, o), a;
  }
  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(t, e = {}) {
    let { allowStale: s = this.allowStale, updateAgeOnGet: i = this.updateAgeOnGet, noDeleteOnStaleGet: r = this.noDeleteOnStaleGet, status: o } = e,
    h = this.#h.get(t);
    if (h !== void 0) {
      let a = this.#r[h], c = this.#c(a);
      return o && this.#s(o, h), this.#y(h) ? (o && (o.get = "stale"), c ? (o && s && a.__staleWhileFetching !== void 0 && (o.returnedStale =
      !0), s ? a.__staleWhileFetching : void 0) : (r || this.#F(t, "expire"), o && s && (o.returnedStale = !0), s ? a : void 0)) : (o && (o.
      get = "hit"), c ? a.__staleWhileFetching : (this.#z(h), i && this.#k(h), a));
    } else o && (o.get = "miss");
  }
  #I(t, e) {
    this.#w[e] = t, this.#g[t] = e;
  }
  #z(t) {
    t !== this.#u && (t === this.#d ? this.#d = this.#g[t] : this.#I(this.#w[t], this.#g[t]), this.#I(this.#u, t), this.#u = t);
  }
  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(t) {
    return this.#F(t, "delete");
  }
  #F(t, e) {
    let s = !1;
    if (this.#l !== 0) {
      let i = this.#h.get(t);
      if (i !== void 0)
        if (s = !0, this.#l === 1)
          this.#B(e);
        else {
          this.#_(i);
          let r = this.#r[i];
          if (this.#c(r) ? r.__abortController.abort(new Error("deleted")) : (this.#E || this.#p) && (this.#E && this.#n?.(r, t, e), this.#p &&
          this.#m?.push([r, t, e])), this.#h.delete(t), this.#a[i] = void 0, this.#r[i] = void 0, i === this.#u)
            this.#u = this.#w[i];
          else if (i === this.#d)
            this.#d = this.#g[i];
          else {
            let o = this.#w[i];
            this.#g[o] = this.#g[i];
            let h = this.#g[i];
            this.#w[h] = this.#w[i];
          }
          this.#l--, this.#v.push(i);
        }
    }
    if (this.#p && this.#m?.length) {
      let i = this.#m, r;
      for (; r = i?.shift(); )
        this.#i?.(...r);
    }
    return s;
  }
  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return this.#B("delete");
  }
  #B(t) {
    for (let e of this.#R({ allowStale: !0 })) {
      let s = this.#r[e];
      if (this.#c(s))
        s.__abortController.abort(new Error("deleted"));
      else {
        let i = this.#a[e];
        this.#E && this.#n?.(s, i, t), this.#p && this.#m?.push([s, i, t]);
      }
    }
    if (this.#h.clear(), this.#r.fill(void 0), this.#a.fill(void 0), this.#b && this.#C && (this.#b.fill(0), this.#C.fill(0)), this.#T && this.#T.
    fill(0), this.#d = 0, this.#u = 0, this.#v.length = 0, this.#f = 0, this.#l = 0, this.#p && this.#m) {
      let e = this.#m, s;
      for (; s = e?.shift(); )
        this.#i?.(...s);
    }
  }
};

// ../node_modules/path-scurry/dist/esm/index.js
var lt = require("node:path"), os = require("node:url"), q = require("fs"), Di = Qt(require("node:fs"), 1), Q = require("node:fs/promises");

// ../node_modules/minipass/dist/esm/index.js
var zt = require("node:events"), fe = Qt(require("node:stream"), 1), es = require("node:string_decoder");
var Je = typeof process == "object" && process ? process : {
  stdout: null,
  stderr: null
}, Si = /* @__PURE__ */ l((n) => !!n && typeof n == "object" && (n instanceof Z || n instanceof fe.default || Ei(n) || xi(n)), "isStream"), Ei = /* @__PURE__ */ l(
(n) => !!n && typeof n == "object" && n instanceof zt.EventEmitter && typeof n.pipe == "function" && // node core Writable streams have a pipe() method, but it throws
n.pipe !== fe.default.Writable.prototype.pipe, "isReadable"), xi = /* @__PURE__ */ l((n) => !!n && typeof n == "object" && n instanceof zt.EventEmitter &&
typeof n.write == "function" && typeof n.end == "function", "isWritable"), K = Symbol("EOF"), V = Symbol("maybeEmitEnd"), J = Symbol("emitte\
dEnd"), Nt = Symbol("emittingEnd"), bt = Symbol("emittedError"), Lt = Symbol("closed"), Ze = Symbol("read"), Pt = Symbol("flush"), Qe = Symbol(
"flushChunk"), B = Symbol("encoding"), ht = Symbol("decoder"), C = Symbol("flowing"), St = Symbol("paused"), at = Symbol("resume"), k = Symbol(
"buffer"), M = Symbol("pipes"), A = Symbol("bufferLength"), ne = Symbol("bufferPush"), Wt = Symbol("bufferShift"), D = Symbol("objectMode"),
v = Symbol("destroyed"), oe = Symbol("error"), he = Symbol("emitData"), ts = Symbol("emitEnd"), ae = Symbol("emitEnd2"), G = Symbol("async"),
le = Symbol("abort"), jt = Symbol("aborted"), Et = Symbol("signal"), et = Symbol("dataListeners"), N = Symbol("discarded"), xt = /* @__PURE__ */ l(
(n) => Promise.resolve().then(n), "defer"), vi = /* @__PURE__ */ l((n) => n(), "nodefer"), Ti = /* @__PURE__ */ l((n) => n === "end" || n ===
"finish" || n === "prefinish", "isEndish"), Ci = /* @__PURE__ */ l((n) => n instanceof ArrayBuffer || !!n && typeof n == "object" && n.constructor &&
n.constructor.name === "ArrayBuffer" && n.byteLength >= 0, "isArrayBufferLike"), ki = /* @__PURE__ */ l((n) => !Buffer.isBuffer(n) && ArrayBuffer.
isView(n), "isArrayBufferView"), It = class {
  static {
    l(this, "Pipe");
  }
  src;
  dest;
  opts;
  ondrain;
  constructor(t, e, s) {
    this.src = t, this.dest = e, this.opts = s, this.ondrain = () => t[at](), this.dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  // only here for the prototype
  /* c8 ignore start */
  proxyErrors(t) {
  }
  /* c8 ignore stop */
  end() {
    this.unpipe(), this.opts.end && this.dest.end();
  }
}, ce = class extends It {
  static {
    l(this, "PipeProxyErrors");
  }
  unpipe() {
    this.src.removeListener("error", this.proxyErrors), super.unpipe();
  }
  constructor(t, e, s) {
    super(t, e, s), this.proxyErrors = (i) => e.emit("error", i), t.on("error", this.proxyErrors);
  }
}, Ai = /* @__PURE__ */ l((n) => !!n.objectMode, "isObjectModeOptions"), Ri = /* @__PURE__ */ l((n) => !n.objectMode && !!n.encoding && n.encoding !==
"buffer", "isEncodingOptions"), Z = class extends zt.EventEmitter {
  static {
    l(this, "Minipass");
  }
  [C] = !1;
  [St] = !1;
  [M] = [];
  [k] = [];
  [D];
  [B];
  [G];
  [ht];
  [K] = !1;
  [J] = !1;
  [Nt] = !1;
  [Lt] = !1;
  [bt] = null;
  [A] = 0;
  [v] = !1;
  [Et];
  [jt] = !1;
  [et] = 0;
  [N] = !1;
  /**
   * true if the stream can be written
   */
  writable = !0;
  /**
   * true if the stream can be read
   */
  readable = !0;
  /**
   * If `RType` is Buffer, then options do not need to be provided.
   * Otherwise, an options object must be provided to specify either
   * {@link Minipass.SharedOptions.objectMode} or
   * {@link Minipass.SharedOptions.encoding}, as appropriate.
   */
  constructor(...t) {
    let e = t[0] || {};
    if (super(), e.objectMode && typeof e.encoding == "string")
      throw new TypeError("Encoding and objectMode may not be used together");
    Ai(e) ? (this[D] = !0, this[B] = null) : Ri(e) ? (this[B] = e.encoding, this[D] = !1) : (this[D] = !1, this[B] = null), this[G] = !!e.async,
    this[ht] = this[B] ? new es.StringDecoder(this[B]) : null, e && e.debugExposeBuffer === !0 && Object.defineProperty(this, "buffer", { get: /* @__PURE__ */ l(
    () => this[k], "get") }), e && e.debugExposePipes === !0 && Object.defineProperty(this, "pipes", { get: /* @__PURE__ */ l(() => this[M],
    "get") });
    let { signal: s } = e;
    s && (this[Et] = s, s.aborted ? this[le]() : s.addEventListener("abort", () => this[le]()));
  }
  /**
   * The amount of data stored in the buffer waiting to be read.
   *
   * For Buffer strings, this will be the total byte length.
   * For string encoding streams, this will be the string character length,
   * according to JavaScript's `string.length` logic.
   * For objectMode streams, this is a count of the items waiting to be
   * emitted.
   */
  get bufferLength() {
    return this[A];
  }
  /**
   * The `BufferEncoding` currently in use, or `null`
   */
  get encoding() {
    return this[B];
  }
  /**
   * @deprecated - This is a read only property
   */
  set encoding(t) {
    throw new Error("Encoding must be set at instantiation time");
  }
  /**
   * @deprecated - Encoding may only be set at instantiation time
   */
  setEncoding(t) {
    throw new Error("Encoding must be set at instantiation time");
  }
  /**
   * True if this is an objectMode stream
   */
  get objectMode() {
    return this[D];
  }
  /**
   * @deprecated - This is a read-only property
   */
  set objectMode(t) {
    throw new Error("objectMode must be set at instantiation time");
  }
  /**
   * true if this is an async stream
   */
  get async() {
    return this[G];
  }
  /**
   * Set to true to make this stream async.
   *
   * Once set, it cannot be unset, as this would potentially cause incorrect
   * behavior.  Ie, a sync stream can be made async, but an async stream
   * cannot be safely made sync.
   */
  set async(t) {
    this[G] = this[G] || !!t;
  }
  // drop everything and get out of the flow completely
  [le]() {
    this[jt] = !0, this.emit("abort", this[Et]?.reason), this.destroy(this[Et]?.reason);
  }
  /**
   * True if the stream has been aborted.
   */
  get aborted() {
    return this[jt];
  }
  /**
   * No-op setter. Stream aborted status is set via the AbortSignal provided
   * in the constructor options.
   */
  set aborted(t) {
  }
  write(t, e, s) {
    if (this[jt])
      return !1;
    if (this[K])
      throw new Error("write after end");
    if (this[v])
      return this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" })),
      !0;
    typeof e == "function" && (s = e, e = "utf8"), e || (e = "utf8");
    let i = this[G] ? xt : vi;
    if (!this[D] && !Buffer.isBuffer(t)) {
      if (ki(t))
        t = Buffer.from(t.buffer, t.byteOffset, t.byteLength);
      else if (Ci(t))
        t = Buffer.from(t);
      else if (typeof t != "string")
        throw new Error("Non-contiguous data written to non-objectMode stream");
    }
    return this[D] ? (this[C] && this[A] !== 0 && this[Pt](!0), this[C] ? this.emit("data", t) : this[ne](t), this[A] !== 0 && this.emit("re\
adable"), s && i(s), this[C]) : t.length ? (typeof t == "string" && // unless it is a string already ready for us to use
    !(e === this[B] && !this[ht]?.lastNeed) && (t = Buffer.from(t, e)), Buffer.isBuffer(t) && this[B] && (t = this[ht].write(t)), this[C] &&
    this[A] !== 0 && this[Pt](!0), this[C] ? this.emit("data", t) : this[ne](t), this[A] !== 0 && this.emit("readable"), s && i(s), this[C]) :
    (this[A] !== 0 && this.emit("readable"), s && i(s), this[C]);
  }
  /**
   * Low-level explicit read method.
   *
   * In objectMode, the argument is ignored, and one item is returned if
   * available.
   *
   * `n` is the number of bytes (or in the case of encoding streams,
   * characters) to consume. If `n` is not provided, then the entire buffer
   * is returned, or `null` is returned if no data is available.
   *
   * If `n` is greater that the amount of data in the internal buffer,
   * then `null` is returned.
   */
  read(t) {
    if (this[v])
      return null;
    if (this[N] = !1, this[A] === 0 || t === 0 || t && t > this[A])
      return this[V](), null;
    this[D] && (t = null), this[k].length > 1 && !this[D] && (this[k] = [
      this[B] ? this[k].join("") : Buffer.concat(this[k], this[A])
    ]);
    let e = this[Ze](t || null, this[k][0]);
    return this[V](), e;
  }
  [Ze](t, e) {
    if (this[D])
      this[Wt]();
    else {
      let s = e;
      t === s.length || t === null ? this[Wt]() : typeof s == "string" ? (this[k][0] = s.slice(t), e = s.slice(0, t), this[A] -= t) : (this[k][0] =
      s.subarray(t), e = s.subarray(0, t), this[A] -= t);
    }
    return this.emit("data", e), !this[k].length && !this[K] && this.emit("drain"), e;
  }
  end(t, e, s) {
    return typeof t == "function" && (s = t, t = void 0), typeof e == "function" && (s = e, e = "utf8"), t !== void 0 && this.write(t, e), s &&
    this.once("end", s), this[K] = !0, this.writable = !1, (this[C] || !this[St]) && this[V](), this;
  }
  // don't let the internal resume be overwritten
  [at]() {
    this[v] || (!this[et] && !this[M].length && (this[N] = !0), this[St] = !1, this[C] = !0, this.emit("resume"), this[k].length ? this[Pt]() :
    this[K] ? this[V]() : this.emit("drain"));
  }
  /**
   * Resume the stream if it is currently in a paused state
   *
   * If called when there are no pipe destinations or `data` event listeners,
   * this will place the stream in a "discarded" state, where all data will
   * be thrown away. The discarded state is removed if a pipe destination or
   * data handler is added, if pause() is called, or if any synchronous or
   * asynchronous iteration is started.
   */
  resume() {
    return this[at]();
  }
  /**
   * Pause the stream
   */
  pause() {
    this[C] = !1, this[St] = !0, this[N] = !1;
  }
  /**
   * true if the stream has been forcibly destroyed
   */
  get destroyed() {
    return this[v];
  }
  /**
   * true if the stream is currently in a flowing state, meaning that
   * any writes will be immediately emitted.
   */
  get flowing() {
    return this[C];
  }
  /**
   * true if the stream is currently in a paused state
   */
  get paused() {
    return this[St];
  }
  [ne](t) {
    this[D] ? this[A] += 1 : this[A] += t.length, this[k].push(t);
  }
  [Wt]() {
    return this[D] ? this[A] -= 1 : this[A] -= this[k][0].length, this[k].shift();
  }
  [Pt](t = !1) {
    do
      ;
    while (this[Qe](this[Wt]()) && this[k].length);
    !t && !this[k].length && !this[K] && this.emit("drain");
  }
  [Qe](t) {
    return this.emit("data", t), this[C];
  }
  /**
   * Pipe all data emitted by this stream into the destination provided.
   *
   * Triggers the flow of data.
   */
  pipe(t, e) {
    if (this[v])
      return t;
    this[N] = !1;
    let s = this[J];
    return e = e || {}, t === Je.stdout || t === Je.stderr ? e.end = !1 : e.end = e.end !== !1, e.proxyErrors = !!e.proxyErrors, s ? e.end &&
    t.end() : (this[M].push(e.proxyErrors ? new ce(this, t, e) : new It(this, t, e)), this[G] ? xt(() => this[at]()) : this[at]()), t;
  }
  /**
   * Fully unhook a piped destination stream.
   *
   * If the destination stream was the only consumer of this stream (ie,
   * there are no other piped destinations or `'data'` event listeners)
   * then the flow of data will stop until there is another consumer or
   * {@link Minipass#resume} is explicitly called.
   */
  unpipe(t) {
    let e = this[M].find((s) => s.dest === t);
    e && (this[M].length === 1 ? (this[C] && this[et] === 0 && (this[C] = !1), this[M] = []) : this[M].splice(this[M].indexOf(e), 1), e.unpipe());
  }
  /**
   * Alias for {@link Minipass#on}
   */
  addListener(t, e) {
    return this.on(t, e);
  }
  /**
   * Mostly identical to `EventEmitter.on`, with the following
   * behavior differences to prevent data loss and unnecessary hangs:
   *
   * - Adding a 'data' event handler will trigger the flow of data
   *
   * - Adding a 'readable' event handler when there is data waiting to be read
   *   will cause 'readable' to be emitted immediately.
   *
   * - Adding an 'endish' event handler ('end', 'finish', etc.) which has
   *   already passed will cause the event to be emitted immediately and all
   *   handlers removed.
   *
   * - Adding an 'error' event handler after an error has been emitted will
   *   cause the event to be re-emitted immediately with the error previously
   *   raised.
   */
  on(t, e) {
    let s = super.on(t, e);
    if (t === "data")
      this[N] = !1, this[et]++, !this[M].length && !this[C] && this[at]();
    else if (t === "readable" && this[A] !== 0)
      super.emit("readable");
    else if (Ti(t) && this[J])
      super.emit(t), this.removeAllListeners(t);
    else if (t === "error" && this[bt]) {
      let i = e;
      this[G] ? xt(() => i.call(this, this[bt])) : i.call(this, this[bt]);
    }
    return s;
  }
  /**
   * Alias for {@link Minipass#off}
   */
  removeListener(t, e) {
    return this.off(t, e);
  }
  /**
   * Mostly identical to `EventEmitter.off`
   *
   * If a 'data' event handler is removed, and it was the last consumer
   * (ie, there are no pipe destinations or other 'data' event listeners),
   * then the flow of data will stop until there is another consumer or
   * {@link Minipass#resume} is explicitly called.
   */
  off(t, e) {
    let s = super.off(t, e);
    return t === "data" && (this[et] = this.listeners("data").length, this[et] === 0 && !this[N] && !this[M].length && (this[C] = !1)), s;
  }
  /**
   * Mostly identical to `EventEmitter.removeAllListeners`
   *
   * If all 'data' event handlers are removed, and they were the last consumer
   * (ie, there are no pipe destinations), then the flow of data will stop
   * until there is another consumer or {@link Minipass#resume} is explicitly
   * called.
   */
  removeAllListeners(t) {
    let e = super.removeAllListeners(t);
    return (t === "data" || t === void 0) && (this[et] = 0, !this[N] && !this[M].length && (this[C] = !1)), e;
  }
  /**
   * true if the 'end' event has been emitted
   */
  get emittedEnd() {
    return this[J];
  }
  [V]() {
    !this[Nt] && !this[J] && !this[v] && this[k].length === 0 && this[K] && (this[Nt] = !0, this.emit("end"), this.emit("prefinish"), this.emit(
    "finish"), this[Lt] && this.emit("close"), this[Nt] = !1);
  }
  /**
   * Mostly identical to `EventEmitter.emit`, with the following
   * behavior differences to prevent data loss and unnecessary hangs:
   *
   * If the stream has been destroyed, and the event is something other
   * than 'close' or 'error', then `false` is returned and no handlers
   * are called.
   *
   * If the event is 'end', and has already been emitted, then the event
   * is ignored. If the stream is in a paused or non-flowing state, then
   * the event will be deferred until data flow resumes. If the stream is
   * async, then handlers will be called on the next tick rather than
   * immediately.
   *
   * If the event is 'close', and 'end' has not yet been emitted, then
   * the event will be deferred until after 'end' is emitted.
   *
   * If the event is 'error', and an AbortSignal was provided for the stream,
   * and there are no listeners, then the event is ignored, matching the
   * behavior of node core streams in the presense of an AbortSignal.
   *
   * If the event is 'finish' or 'prefinish', then all listeners will be
   * removed after emitting the event, to prevent double-firing.
   */
  emit(t, ...e) {
    let s = e[0];
    if (t !== "error" && t !== "close" && t !== v && this[v])
      return !1;
    if (t === "data")
      return !this[D] && !s ? !1 : this[G] ? (xt(() => this[he](s)), !0) : this[he](s);
    if (t === "end")
      return this[ts]();
    if (t === "close") {
      if (this[Lt] = !0, !this[J] && !this[v])
        return !1;
      let r = super.emit("close");
      return this.removeAllListeners("close"), r;
    } else if (t === "error") {
      this[bt] = s, super.emit(oe, s);
      let r = !this[Et] || this.listeners("error").length ? super.emit("error", s) : !1;
      return this[V](), r;
    } else if (t === "resume") {
      let r = super.emit("resume");
      return this[V](), r;
    } else if (t === "finish" || t === "prefinish") {
      let r = super.emit(t);
      return this.removeAllListeners(t), r;
    }
    let i = super.emit(t, ...e);
    return this[V](), i;
  }
  [he](t) {
    for (let s of this[M])
      s.dest.write(t) === !1 && this.pause();
    let e = this[N] ? !1 : super.emit("data", t);
    return this[V](), e;
  }
  [ts]() {
    return this[J] ? !1 : (this[J] = !0, this.readable = !1, this[G] ? (xt(() => this[ae]()), !0) : this[ae]());
  }
  [ae]() {
    if (this[ht]) {
      let e = this[ht].end();
      if (e) {
        for (let s of this[M])
          s.dest.write(e);
        this[N] || super.emit("data", e);
      }
    }
    for (let e of this[M])
      e.end();
    let t = super.emit("end");
    return this.removeAllListeners("end"), t;
  }
  /**
   * Return a Promise that resolves to an array of all emitted data once
   * the stream ends.
   */
  async collect() {
    let t = Object.assign([], {
      dataLength: 0
    });
    this[D] || (t.dataLength = 0);
    let e = this.promise();
    return this.on("data", (s) => {
      t.push(s), this[D] || (t.dataLength += s.length);
    }), await e, t;
  }
  /**
   * Return a Promise that resolves to the concatenation of all emitted data
   * once the stream ends.
   *
   * Not allowed on objectMode streams.
   */
  async concat() {
    if (this[D])
      throw new Error("cannot concat in objectMode");
    let t = await this.collect();
    return this[B] ? t.join("") : Buffer.concat(t, t.dataLength);
  }
  /**
   * Return a void Promise that resolves once the stream ends.
   */
  async promise() {
    return new Promise((t, e) => {
      this.on(v, () => e(new Error("stream destroyed"))), this.on("error", (s) => e(s)), this.on("end", () => t());
    });
  }
  /**
   * Asynchronous `for await of` iteration.
   *
   * This will continue emitting all chunks until the stream terminates.
   */
  [Symbol.asyncIterator]() {
    this[N] = !1;
    let t = !1, e = /* @__PURE__ */ l(async () => (this.pause(), t = !0, { value: void 0, done: !0 }), "stop");
    return {
      next: /* @__PURE__ */ l(() => {
        if (t)
          return e();
        let i = this.read();
        if (i !== null)
          return Promise.resolve({ done: !1, value: i });
        if (this[K])
          return e();
        let r, o, h = /* @__PURE__ */ l((u) => {
          this.off("data", a), this.off("end", c), this.off(v, f), e(), o(u);
        }, "onerr"), a = /* @__PURE__ */ l((u) => {
          this.off("error", h), this.off("end", c), this.off(v, f), this.pause(), r({ value: u, done: !!this[K] });
        }, "ondata"), c = /* @__PURE__ */ l(() => {
          this.off("error", h), this.off("data", a), this.off(v, f), e(), r({ done: !0, value: void 0 });
        }, "onend"), f = /* @__PURE__ */ l(() => h(new Error("stream destroyed")), "ondestroy");
        return new Promise((u, d) => {
          o = d, r = u, this.once(v, f), this.once("error", h), this.once("end", c), this.once("data", a);
        });
      }, "next"),
      throw: e,
      return: e,
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  /**
   * Synchronous `for of` iteration.
   *
   * The iteration will terminate when the internal buffer runs out, even
   * if the stream has not yet terminated.
   */
  [Symbol.iterator]() {
    this[N] = !1;
    let t = !1, e = /* @__PURE__ */ l(() => (this.pause(), this.off(oe, e), this.off(v, e), this.off("end", e), t = !0, { done: !0, value: void 0 }),
    "stop"), s = /* @__PURE__ */ l(() => {
      if (t)
        return e();
      let i = this.read();
      return i === null ? e() : { done: !1, value: i };
    }, "next");
    return this.once("end", e), this.once(oe, e), this.once(v, e), {
      next: s,
      throw: e,
      return: e,
      [Symbol.iterator]() {
        return this;
      }
    };
  }
  /**
   * Destroy a stream, preventing it from being used for any further purpose.
   *
   * If the stream has a `close()` method, then it will be called on
   * destruction.
   *
   * After destruction, any attempt to write data, read data, or emit most
   * events will be ignored.
   *
   * If an error argument is provided, then it will be emitted in an
   * 'error' event.
   */
  destroy(t) {
    if (this[v])
      return t ? this.emit("error", t) : this.emit(v), this;
    this[v] = !0, this[N] = !0, this[k].length = 0, this[A] = 0;
    let e = this;
    return typeof e.close == "function" && !this[Lt] && e.close(), t ? this.emit("error", t) : this.emit(v), this;
  }
  /**
   * Alias for {@link isStream}
   *
   * Former export location, maintained for backwards compatibility.
   *
   * @deprecated
   */
  static get isStream() {
    return Si;
  }
};

// ../node_modules/path-scurry/dist/esm/index.js
var Oi = q.realpathSync.native, Tt = {
  lstatSync: q.lstatSync,
  readdir: q.readdir,
  readdirSync: q.readdirSync,
  readlinkSync: q.readlinkSync,
  realpathSync: Oi,
  promises: {
    lstat: Q.lstat,
    readdir: Q.readdir,
    readlink: Q.readlink,
    realpath: Q.realpath
  }
}, hs = /* @__PURE__ */ l((n) => !n || n === Tt || n === Di ? Tt : {
  ...Tt,
  ...n,
  promises: {
    ...Tt.promises,
    ...n.promises || {}
  }
}, "fsFromOption"), as = /^\\\\\?\\([a-z]:)\\?$/i, Fi = /* @__PURE__ */ l((n) => n.replace(/\//g, "\\").replace(as, "$1\\"), "uncToDrive"), Mi = /[\\\/]/,
W = 0, ls = 1, cs = 2, H = 4, fs = 6, us = 8, st = 10, ds = 12, P = 15, vt = ~P, ue = 16, ss = 32, Ct = 64, U = 128, Bt = 256, $t = 512, is = Ct |
U | $t, _i = 1023, de = /* @__PURE__ */ l((n) => n.isFile() ? us : n.isDirectory() ? H : n.isSymbolicLink() ? st : n.isCharacterDevice() ? cs :
n.isBlockDevice() ? fs : n.isSocket() ? ds : n.isFIFO() ? ls : W, "entToType"), rs = /* @__PURE__ */ new Map(), kt = /* @__PURE__ */ l((n) => {
  let t = rs.get(n);
  if (t)
    return t;
  let e = n.normalize("NFKD");
  return rs.set(n, e), e;
}, "normalize"), ns = /* @__PURE__ */ new Map(), Ut = /* @__PURE__ */ l((n) => {
  let t = ns.get(n);
  if (t)
    return t;
  let e = kt(n.toLowerCase());
  return ns.set(n, e), e;
}, "normalizeNocase"), Gt = class extends yt {
  static {
    l(this, "ResolveCache");
  }
  constructor() {
    super({ max: 256 });
  }
}, pe = class extends yt {
  static {
    l(this, "ChildrenCache");
  }
  constructor(t = 16 * 1024) {
    super({
      maxSize: t,
      // parent + children
      sizeCalculation: /* @__PURE__ */ l((e) => e.length + 1, "sizeCalculation")
    });
  }
}, ps = Symbol("PathScurry setAsCwd"), O = class {
  static {
    l(this, "PathBase");
  }
  /**
   * the basename of this path
   *
   * **Important**: *always* test the path name against any test string
   * usingthe {@link isNamed} method, and not by directly comparing this
   * string. Otherwise, unicode path strings that the system sees as identical
   * will not be properly treated as the same path, leading to incorrect
   * behavior and possible security issues.
   */
  name;
  /**
   * the Path entry corresponding to the path root.
   *
   * @internal
   */
  root;
  /**
   * All roots found within the current PathScurry family
   *
   * @internal
   */
  roots;
  /**
   * a reference to the parent path, or undefined in the case of root entries
   *
   * @internal
   */
  parent;
  /**
   * boolean indicating whether paths are compared case-insensitively
   * @internal
   */
  nocase;
  /**
   * boolean indicating that this path is the current working directory
   * of the PathScurry collection that contains it.
   */
  isCWD = !1;
  // potential default fs override
  #t;
  // Stats fields
  #e;
  get dev() {
    return this.#e;
  }
  #n;
  get mode() {
    return this.#n;
  }
  #i;
  get nlink() {
    return this.#i;
  }
  #o;
  get uid() {
    return this.#o;
  }
  #S;
  get gid() {
    return this.#S;
  }
  #l;
  get rdev() {
    return this.#l;
  }
  #f;
  get blksize() {
    return this.#f;
  }
  #h;
  get ino() {
    return this.#h;
  }
  #a;
  get size() {
    return this.#a;
  }
  #r;
  get blocks() {
    return this.#r;
  }
  #g;
  get atimeMs() {
    return this.#g;
  }
  #w;
  get mtimeMs() {
    return this.#w;
  }
  #d;
  get ctimeMs() {
    return this.#d;
  }
  #u;
  get birthtimeMs() {
    return this.#u;
  }
  #v;
  get atime() {
    return this.#v;
  }
  #m;
  get mtime() {
    return this.#m;
  }
  #T;
  get ctime() {
    return this.#T;
  }
  #C;
  get birthtime() {
    return this.#C;
  }
  #b;
  #E;
  #x;
  #p;
  #D;
  #k;
  #s;
  #M;
  #y;
  #O;
  /**
   * This property is for compatibility with the Dirent class as of
   * Node v20, where Dirent['parentPath'] refers to the path of the
   * directory that was passed to readdir. For root entries, it's the path
   * to the entry itself.
   */
  get parentPath() {
    return (this.parent || this).fullpath();
  }
  /**
   * Deprecated alias for Dirent['parentPath'] Somewhat counterintuitively,
   * this property refers to the *parent* path, not the path object itself.
   */
  get path() {
    return this.parentPath;
  }
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(t, e = W, s, i, r, o, h) {
    this.name = t, this.#b = r ? Ut(t) : kt(t), this.#s = e & _i, this.nocase = r, this.roots = i, this.root = s || this, this.#M = o, this.#x =
    h.fullpath, this.#D = h.relative, this.#k = h.relativePosix, this.parent = h.parent, this.parent ? this.#t = this.parent.#t : this.#t = hs(
    h.fs);
  }
  /**
   * Returns the depth of the Path object from its root.
   *
   * For example, a path at `/foo/bar` would have a depth of 2.
   */
  depth() {
    return this.#E !== void 0 ? this.#E : this.parent ? this.#E = this.parent.depth() + 1 : this.#E = 0;
  }
  /**
   * @internal
   */
  childrenCache() {
    return this.#M;
  }
  /**
   * Get the Path object referenced by the string path, resolved from this Path
   */
  resolve(t) {
    if (!t)
      return this;
    let e = this.getRootString(t), i = t.substring(e.length).split(this.splitSep);
    return e ? this.getRoot(e).#_(i) : this.#_(i);
  }
  #_(t) {
    let e = this;
    for (let s of t)
      e = e.child(s);
    return e;
  }
  /**
   * Returns the cached children Path objects, if still available.  If they
   * have fallen out of the cache, then returns an empty array, and resets the
   * READDIR_CALLED bit, so that future calls to readdir() will require an fs
   * lookup.
   *
   * @internal
   */
  children() {
    let t = this.#M.get(this);
    if (t)
      return t;
    let e = Object.assign([], { provisional: 0 });
    return this.#M.set(this, e), this.#s &= ~ue, e;
  }
  /**
   * Resolves a path portion and returns or creates the child Path.
   *
   * Returns `this` if pathPart is `''` or `'.'`, or `parent` if pathPart is
   * `'..'`.
   *
   * This should not be called directly.  If `pathPart` contains any path
   * separators, it will lead to unsafe undefined behavior.
   *
   * Use `Path.resolve()` instead.
   *
   * @internal
   */
  child(t, e) {
    if (t === "" || t === ".")
      return this;
    if (t === "..")
      return this.parent || this;
    let s = this.children(), i = this.nocase ? Ut(t) : kt(t);
    for (let a of s)
      if (a.#b === i)
        return a;
    let r = this.parent ? this.sep : "", o = this.#x ? this.#x + r + t : void 0, h = this.newChild(t, W, {
      ...e,
      parent: this,
      fullpath: o
    });
    return this.canReaddir() || (h.#s |= U), s.push(h), h;
  }
  /**
   * The relative path from the cwd. If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpath()
   */
  relative() {
    if (this.isCWD)
      return "";
    if (this.#D !== void 0)
      return this.#D;
    let t = this.name, e = this.parent;
    if (!e)
      return this.#D = this.name;
    let s = e.relative();
    return s + (!s || !e.parent ? "" : this.sep) + t;
  }
  /**
   * The relative path from the cwd, using / as the path separator.
   * If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpathPosix()
   * On posix systems, this is identical to relative().
   */
  relativePosix() {
    if (this.sep === "/")
      return this.relative();
    if (this.isCWD)
      return "";
    if (this.#k !== void 0)
      return this.#k;
    let t = this.name, e = this.parent;
    if (!e)
      return this.#k = this.fullpathPosix();
    let s = e.relativePosix();
    return s + (!s || !e.parent ? "" : "/") + t;
  }
  /**
   * The fully resolved path string for this Path entry
   */
  fullpath() {
    if (this.#x !== void 0)
      return this.#x;
    let t = this.name, e = this.parent;
    if (!e)
      return this.#x = this.name;
    let i = e.fullpath() + (e.parent ? this.sep : "") + t;
    return this.#x = i;
  }
  /**
   * On platforms other than windows, this is identical to fullpath.
   *
   * On windows, this is overridden to return the forward-slash form of the
   * full UNC path.
   */
  fullpathPosix() {
    if (this.#p !== void 0)
      return this.#p;
    if (this.sep === "/")
      return this.#p = this.fullpath();
    if (!this.parent) {
      let i = this.fullpath().replace(/\\/g, "/");
      return /^[a-z]:\//i.test(i) ? this.#p = `//?/${i}` : this.#p = i;
    }
    let t = this.parent, e = t.fullpathPosix(), s = e + (!e || !t.parent ? "" : "/") + this.name;
    return this.#p = s;
  }
  /**
   * Is the Path of an unknown type?
   *
   * Note that we might know *something* about it if there has been a previous
   * filesystem operation, for example that it does not exist, or is not a
   * link, or whether it has child entries.
   */
  isUnknown() {
    return (this.#s & P) === W;
  }
  isType(t) {
    return this[`is${t}`]();
  }
  getType() {
    return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" :
    this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : (
      /* c8 ignore start */
      this.isSocket() ? "Socket" : "Unknown"
    );
  }
  /**
   * Is the Path a regular file?
   */
  isFile() {
    return (this.#s & P) === us;
  }
  /**
   * Is the Path a directory?
   */
  isDirectory() {
    return (this.#s & P) === H;
  }
  /**
   * Is the path a character device?
   */
  isCharacterDevice() {
    return (this.#s & P) === cs;
  }
  /**
   * Is the path a block device?
   */
  isBlockDevice() {
    return (this.#s & P) === fs;
  }
  /**
   * Is the path a FIFO pipe?
   */
  isFIFO() {
    return (this.#s & P) === ls;
  }
  /**
   * Is the path a socket?
   */
  isSocket() {
    return (this.#s & P) === ds;
  }
  /**
   * Is the path a symbolic link?
   */
  isSymbolicLink() {
    return (this.#s & st) === st;
  }
  /**
   * Return the entry if it has been subject of a successful lstat, or
   * undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* simply
   * mean that we haven't called lstat on it.
   */
  lstatCached() {
    return this.#s & ss ? this : void 0;
  }
  /**
   * Return the cached link target if the entry has been the subject of a
   * successful readlink, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readlink() has been called at some point.
   */
  readlinkCached() {
    return this.#y;
  }
  /**
   * Returns the cached realpath target if the entry has been the subject
   * of a successful realpath, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * realpath() has been called at some point.
   */
  realpathCached() {
    return this.#O;
  }
  /**
   * Returns the cached child Path entries array if the entry has been the
   * subject of a successful readdir(), or [] otherwise.
   *
   * Does not read the filesystem, so an empty array *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readdir() has been called recently enough to still be valid.
   */
  readdirCached() {
    let t = this.children();
    return t.slice(0, t.provisional);
  }
  /**
   * Return true if it's worth trying to readlink.  Ie, we don't (yet) have
   * any indication that readlink will definitely fail.
   *
   * Returns false if the path is known to not be a symlink, if a previous
   * readlink failed, or if the entry does not exist.
   */
  canReadlink() {
    if (this.#y)
      return !0;
    if (!this.parent)
      return !1;
    let t = this.#s & P;
    return !(t !== W && t !== st || this.#s & Bt || this.#s & U);
  }
  /**
   * Return true if readdir has previously been successfully called on this
   * path, indicating that cachedReaddir() is likely valid.
   */
  calledReaddir() {
    return !!(this.#s & ue);
  }
  /**
   * Returns true if the path is known to not exist. That is, a previous lstat
   * or readdir failed to verify its existence when that would have been
   * expected, or a parent entry was marked either enoent or enotdir.
   */
  isENOENT() {
    return !!(this.#s & U);
  }
  /**
   * Return true if the path is a match for the given path name.  This handles
   * case sensitivity and unicode normalization.
   *
   * Note: even on case-sensitive systems, it is **not** safe to test the
   * equality of the `.name` property to determine whether a given pathname
   * matches, due to unicode normalization mismatches.
   *
   * Always use this method instead of testing the `path.name` property
   * directly.
   */
  isNamed(t) {
    return this.nocase ? this.#b === Ut(t) : this.#b === kt(t);
  }
  /**
   * Return the Path object corresponding to the target of a symbolic link.
   *
   * If the Path is not a symbolic link, or if the readlink call fails for any
   * reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   */
  async readlink() {
    let t = this.#y;
    if (t)
      return t;
    if (this.canReadlink() && this.parent)
      try {
        let e = await this.#t.promises.readlink(this.fullpath()), s = (await this.parent.realpath())?.resolve(e);
        if (s)
          return this.#y = s;
      } catch (e) {
        this.#c(e.code);
        return;
      }
  }
  /**
   * Synchronous {@link PathBase.readlink}
   */
  readlinkSync() {
    let t = this.#y;
    if (t)
      return t;
    if (this.canReadlink() && this.parent)
      try {
        let e = this.#t.readlinkSync(this.fullpath()), s = this.parent.realpathSync()?.resolve(e);
        if (s)
          return this.#y = s;
      } catch (e) {
        this.#c(e.code);
        return;
      }
  }
  #N(t) {
    this.#s |= ue;
    for (let e = t.provisional; e < t.length; e++) {
      let s = t[e];
      s && s.#L();
    }
  }
  #L() {
    this.#s & U || (this.#s = (this.#s | U) & vt, this.#A());
  }
  #A() {
    let t = this.children();
    t.provisional = 0;
    for (let e of t)
      e.#L();
  }
  #R() {
    this.#s |= $t, this.#P();
  }
  // save the information when we know the entry is not a dir
  #P() {
    if (this.#s & Ct)
      return;
    let t = this.#s;
    (t & P) === H && (t &= vt), this.#s = t | Ct, this.#A();
  }
  #W(t = "") {
    t === "ENOTDIR" || t === "EPERM" ? this.#P() : t === "ENOENT" ? this.#L() : this.children().provisional = 0;
  }
  #j(t = "") {
    t === "ENOTDIR" ? this.parent.#P() : t === "ENOENT" && this.#L();
  }
  #c(t = "") {
    let e = this.#s;
    e |= Bt, t === "ENOENT" && (e |= U), (t === "EINVAL" || t === "UNKNOWN") && (e &= vt), this.#s = e, t === "ENOTDIR" && this.parent && this.
    parent.#P();
  }
  #I(t, e) {
    return this.#F(t, e) || this.#z(t, e);
  }
  #z(t, e) {
    let s = de(t), i = this.newChild(t.name, s, { parent: this }), r = i.#s & P;
    return r !== H && r !== st && r !== W && (i.#s |= Ct), e.unshift(i), e.provisional++, i;
  }
  #F(t, e) {
    for (let s = e.provisional; s < e.length; s++) {
      let i = e[s];
      if ((this.nocase ? Ut(t.name) : kt(t.name)) === i.#b)
        return this.#B(t, i, s, e);
    }
  }
  #B(t, e, s, i) {
    let r = e.name;
    return e.#s = e.#s & vt | de(t), r !== t.name && (e.name = t.name), s !== i.provisional && (s === i.length - 1 ? i.pop() : i.splice(s, 1),
    i.unshift(e)), i.provisional++, e;
  }
  /**
   * Call lstat() on this Path, and update all known information that can be
   * determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat() {
    if ((this.#s & U) === 0)
      try {
        return this.#H(await this.#t.promises.lstat(this.fullpath())), this;
      } catch (t) {
        this.#j(t.code);
      }
  }
  /**
   * synchronous {@link PathBase.lstat}
   */
  lstatSync() {
    if ((this.#s & U) === 0)
      try {
        return this.#H(this.#t.lstatSync(this.fullpath())), this;
      } catch (t) {
        this.#j(t.code);
      }
  }
  #H(t) {
    let { atime: e, atimeMs: s, birthtime: i, birthtimeMs: r, blksize: o, blocks: h, ctime: a, ctimeMs: c, dev: f, gid: u, ino: d, mode: p, mtime: w,
    mtimeMs: m, nlink: y, rdev: g, size: E, uid: S } = t;
    this.#v = e, this.#g = s, this.#C = i, this.#u = r, this.#f = o, this.#r = h, this.#T = a, this.#d = c, this.#e = f, this.#S = u, this.#h =
    d, this.#n = p, this.#m = w, this.#w = m, this.#i = y, this.#l = g, this.#a = E, this.#o = S;
    let b = de(t);
    this.#s = this.#s & vt | b | ss, b !== W && b !== H && b !== st && (this.#s |= Ct);
  }
  #$ = [];
  #G = !1;
  #q(t) {
    this.#G = !1;
    let e = this.#$.slice();
    this.#$.length = 0, e.forEach((s) => s(null, t));
  }
  /**
   * Standard node-style callback interface to get list of directory entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   *
   * @param cb The callback called with (er, entries).  Note that the `er`
   * param is somewhat extraneous, as all readdir() errors are handled and
   * simply result in an empty set of entries being returned.
   * @param allowZalgo Boolean indicating that immediately known results should
   * *not* be deferred with `queueMicrotask`. Defaults to `false`. Release
   * zalgo at your peril, the dark pony lord is devious and unforgiving.
   */
  readdirCB(t, e = !1) {
    if (!this.canReaddir()) {
      e ? t(null, []) : queueMicrotask(() => t(null, []));
      return;
    }
    let s = this.children();
    if (this.calledReaddir()) {
      let r = s.slice(0, s.provisional);
      e ? t(null, r) : queueMicrotask(() => t(null, r));
      return;
    }
    if (this.#$.push(t), this.#G)
      return;
    this.#G = !0;
    let i = this.fullpath();
    this.#t.readdir(i, { withFileTypes: !0 }, (r, o) => {
      if (r)
        this.#W(r.code), s.provisional = 0;
      else {
        for (let h of o)
          this.#I(h, s);
        this.#N(s);
      }
      this.#q(s.slice(0, s.provisional));
    });
  }
  #U;
  /**
   * Return an array of known child entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async readdir() {
    if (!this.canReaddir())
      return [];
    let t = this.children();
    if (this.calledReaddir())
      return t.slice(0, t.provisional);
    let e = this.fullpath();
    if (this.#U)
      await this.#U;
    else {
      let s = /* @__PURE__ */ l(() => {
      }, "resolve");
      this.#U = new Promise((i) => s = i);
      try {
        for (let i of await this.#t.promises.readdir(e, {
          withFileTypes: !0
        }))
          this.#I(i, t);
        this.#N(t);
      } catch (i) {
        this.#W(i.code), t.provisional = 0;
      }
      this.#U = void 0, s();
    }
    return t.slice(0, t.provisional);
  }
  /**
   * synchronous {@link PathBase.readdir}
   */
  readdirSync() {
    if (!this.canReaddir())
      return [];
    let t = this.children();
    if (this.calledReaddir())
      return t.slice(0, t.provisional);
    let e = this.fullpath();
    try {
      for (let s of this.#t.readdirSync(e, {
        withFileTypes: !0
      }))
        this.#I(s, t);
      this.#N(t);
    } catch (s) {
      this.#W(s.code), t.provisional = 0;
    }
    return t.slice(0, t.provisional);
  }
  canReaddir() {
    if (this.#s & is)
      return !1;
    let t = P & this.#s;
    return t === W || t === H || t === st;
  }
  shouldWalk(t, e) {
    return (this.#s & H) === H && !(this.#s & is) && !t.has(this) && (!e || e(this));
  }
  /**
   * Return the Path object corresponding to path as resolved
   * by realpath(3).
   *
   * If the realpath call fails for any reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   * On success, returns a Path object.
   */
  async realpath() {
    if (this.#O)
      return this.#O;
    if (!(($t | Bt | U) & this.#s))
      try {
        let t = await this.#t.promises.realpath(this.fullpath());
        return this.#O = this.resolve(t);
      } catch {
        this.#R();
      }
  }
  /**
   * Synchronous {@link realpath}
   */
  realpathSync() {
    if (this.#O)
      return this.#O;
    if (!(($t | Bt | U) & this.#s))
      try {
        let t = this.#t.realpathSync(this.fullpath());
        return this.#O = this.resolve(t);
      } catch {
        this.#R();
      }
  }
  /**
   * Internal method to mark this Path object as the scurry cwd,
   * called by {@link PathScurry#chdir}
   *
   * @internal
   */
  [ps](t) {
    if (t === this)
      return;
    t.isCWD = !1, this.isCWD = !0;
    let e = /* @__PURE__ */ new Set([]), s = [], i = this;
    for (; i && i.parent; )
      e.add(i), i.#D = s.join(this.sep), i.#k = s.join("/"), i = i.parent, s.push("..");
    for (i = t; i && i.parent && !e.has(i); )
      i.#D = void 0, i.#k = void 0, i = i.parent;
  }
}, Ht = class n extends O {
  static {
    l(this, "PathWin32");
  }
  /**
   * Separator for generating path strings.
   */
  sep = "\\";
  /**
   * Separator for parsing path strings.
   */
  splitSep = Mi;
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(t, e = W, s, i, r, o, h) {
    super(t, e, s, i, r, o, h);
  }
  /**
   * @internal
   */
  newChild(t, e = W, s = {}) {
    return new n(t, e, this.root, this.roots, this.nocase, this.childrenCache(), s);
  }
  /**
   * @internal
   */
  getRootString(t) {
    return lt.win32.parse(t).root;
  }
  /**
   * @internal
   */
  getRoot(t) {
    if (t = Fi(t.toUpperCase()), t === this.root.name)
      return this.root;
    for (let [e, s] of Object.entries(this.roots))
      if (this.sameRoot(t, e))
        return this.roots[t] = s;
    return this.roots[t] = new ct(t, this).root;
  }
  /**
   * @internal
   */
  sameRoot(t, e = this.root.name) {
    return t = t.toUpperCase().replace(/\//g, "\\").replace(as, "$1\\"), t === e;
  }
}, qt = class n extends O {
  static {
    l(this, "PathPosix");
  }
  /**
   * separator for parsing path strings
   */
  splitSep = "/";
  /**
   * separator for generating path strings
   */
  sep = "/";
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(t, e = W, s, i, r, o, h) {
    super(t, e, s, i, r, o, h);
  }
  /**
   * @internal
   */
  getRootString(t) {
    return t.startsWith("/") ? "/" : "";
  }
  /**
   * @internal
   */
  getRoot(t) {
    return this.root;
  }
  /**
   * @internal
   */
  newChild(t, e = W, s = {}) {
    return new n(t, e, this.root, this.roots, this.nocase, this.childrenCache(), s);
  }
}, Kt = class {
  static {
    l(this, "PathScurryBase");
  }
  /**
   * The root Path entry for the current working directory of this Scurry
   */
  root;
  /**
   * The string path for the root of this Scurry's current working directory
   */
  rootPath;
  /**
   * A collection of all roots encountered, referenced by rootPath
   */
  roots;
  /**
   * The Path entry corresponding to this PathScurry's current working directory.
   */
  cwd;
  #t;
  #e;
  #n;
  /**
   * Perform path comparisons case-insensitively.
   *
   * Defaults true on Darwin and Windows systems, false elsewhere.
   */
  nocase;
  #i;
  /**
   * This class should not be instantiated directly.
   *
   * Use PathScurryWin32, PathScurryDarwin, PathScurryPosix, or PathScurry
   *
   * @internal
   */
  constructor(t = process.cwd(), e, s, { nocase: i, childrenCacheSize: r = 16 * 1024, fs: o = Tt } = {}) {
    this.#i = hs(o), (t instanceof URL || t.startsWith("file://")) && (t = (0, os.fileURLToPath)(t));
    let h = e.resolve(t);
    this.roots = /* @__PURE__ */ Object.create(null), this.rootPath = this.parseRootPath(h), this.#t = new Gt(), this.#e = new Gt(), this.#n =
    new pe(r);
    let a = h.substring(this.rootPath.length).split(s);
    if (a.length === 1 && !a[0] && a.pop(), i === void 0)
      throw new TypeError("must provide nocase setting to PathScurryBase ctor");
    this.nocase = i, this.root = this.newRoot(this.#i), this.roots[this.rootPath] = this.root;
    let c = this.root, f = a.length - 1, u = e.sep, d = this.rootPath, p = !1;
    for (let w of a) {
      let m = f--;
      c = c.child(w, {
        relative: new Array(m).fill("..").join(u),
        relativePosix: new Array(m).fill("..").join("/"),
        fullpath: d += (p ? "" : u) + w
      }), p = !0;
    }
    this.cwd = c;
  }
  /**
   * Get the depth of a provided path, string, or the cwd
   */
  depth(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.depth();
  }
  /**
   * Return the cache of child entries.  Exposed so subclasses can create
   * child Path objects in a platform-specific way.
   *
   * @internal
   */
  childrenCache() {
    return this.#n;
  }
  /**
   * Resolve one or more path strings to a resolved string
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolve(...t) {
    let e = "";
    for (let r = t.length - 1; r >= 0; r--) {
      let o = t[r];
      if (!(!o || o === ".") && (e = e ? `${o}/${e}` : o, this.isAbsolute(o)))
        break;
    }
    let s = this.#t.get(e);
    if (s !== void 0)
      return s;
    let i = this.cwd.resolve(e).fullpath();
    return this.#t.set(e, i), i;
  }
  /**
   * Resolve one or more path strings to a resolved string, returning
   * the posix path.  Identical to .resolve() on posix systems, but on
   * windows will return a forward-slash separated UNC path.
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolvePosix(...t) {
    let e = "";
    for (let r = t.length - 1; r >= 0; r--) {
      let o = t[r];
      if (!(!o || o === ".") && (e = e ? `${o}/${e}` : o, this.isAbsolute(o)))
        break;
    }
    let s = this.#e.get(e);
    if (s !== void 0)
      return s;
    let i = this.cwd.resolve(e).fullpathPosix();
    return this.#e.set(e, i), i;
  }
  /**
   * find the relative path from the cwd to the supplied path string or entry
   */
  relative(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.relative();
  }
  /**
   * find the relative path from the cwd to the supplied path string or
   * entry, using / as the path delimiter, even on Windows.
   */
  relativePosix(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.relativePosix();
  }
  /**
   * Return the basename for the provided string or Path object
   */
  basename(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.name;
  }
  /**
   * Return the dirname for the provided string or Path object
   */
  dirname(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), (t.parent || t).fullpath();
  }
  async readdir(t = this.cwd, e = {
    withFileTypes: !0
  }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s } = e;
    if (t.canReaddir()) {
      let i = await t.readdir();
      return s ? i : i.map((r) => r.name);
    } else
      return [];
  }
  readdirSync(t = this.cwd, e = {
    withFileTypes: !0
  }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s = !0 } = e;
    return t.canReaddir() ? s ? t.readdirSync() : t.readdirSync().map((i) => i.name) : [];
  }
  /**
   * Call lstat() on the string or Path object, and update all known
   * information that can be determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.lstat();
  }
  /**
   * synchronous {@link PathScurryBase.lstat}
   */
  lstatSync(t = this.cwd) {
    return typeof t == "string" && (t = this.cwd.resolve(t)), t.lstatSync();
  }
  async readlink(t = this.cwd, { withFileTypes: e } = {
    withFileTypes: !1
  }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t.withFileTypes, t = this.cwd);
    let s = await t.readlink();
    return e ? s : s?.fullpath();
  }
  readlinkSync(t = this.cwd, { withFileTypes: e } = {
    withFileTypes: !1
  }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t.withFileTypes, t = this.cwd);
    let s = t.readlinkSync();
    return e ? s : s?.fullpath();
  }
  async realpath(t = this.cwd, { withFileTypes: e } = {
    withFileTypes: !1
  }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t.withFileTypes, t = this.cwd);
    let s = await t.realpath();
    return e ? s : s?.fullpath();
  }
  realpathSync(t = this.cwd, { withFileTypes: e } = {
    withFileTypes: !1
  }) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t.withFileTypes, t = this.cwd);
    let s = t.realpathSync();
    return e ? s : s?.fullpath();
  }
  async walk(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s = !0, follow: i = !1, filter: r, walkFilter: o } = e, h = [];
    (!r || r(t)) && h.push(s ? t : t.fullpath());
    let a = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ l((u, d) => {
      a.add(u), u.readdirCB((p, w) => {
        if (p)
          return d(p);
        let m = w.length;
        if (!m)
          return d();
        let y = /* @__PURE__ */ l(() => {
          --m === 0 && d();
        }, "next");
        for (let g of w)
          (!r || r(g)) && h.push(s ? g : g.fullpath()), i && g.isSymbolicLink() ? g.realpath().then((E) => E?.isUnknown() ? E.lstat() : E).then(
          (E) => E?.shouldWalk(a, o) ? c(E, y) : y()) : g.shouldWalk(a, o) ? c(g, y) : y();
      }, !0);
    }, "walk"), f = t;
    return new Promise((u, d) => {
      c(f, (p) => {
        if (p)
          return d(p);
        u(h);
      });
    });
  }
  walkSync(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s = !0, follow: i = !1, filter: r, walkFilter: o } = e, h = [];
    (!r || r(t)) && h.push(s ? t : t.fullpath());
    let a = /* @__PURE__ */ new Set([t]);
    for (let c of a) {
      let f = c.readdirSync();
      for (let u of f) {
        (!r || r(u)) && h.push(s ? u : u.fullpath());
        let d = u;
        if (u.isSymbolicLink()) {
          if (!(i && (d = u.realpathSync())))
            continue;
          d.isUnknown() && d.lstatSync();
        }
        d.shouldWalk(a, o) && a.add(d);
      }
    }
    return h;
  }
  /**
   * Support for `for await`
   *
   * Alias for {@link PathScurryBase.iterate}
   *
   * Note: As of Node 19, this is very slow, compared to other methods of
   * walking.  Consider using {@link PathScurryBase.stream} if memory overhead
   * and backpressure are concerns, or {@link PathScurryBase.walk} if not.
   */
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
  iterate(t = this.cwd, e = {}) {
    return typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd), this.stream(t, e)[Symbol.asyncIterator]();
  }
  /**
   * Iterating over a PathScurry performs a synchronous walk.
   *
   * Alias for {@link PathScurryBase.iterateSync}
   */
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  *iterateSync(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s = !0, follow: i = !1, filter: r, walkFilter: o } = e;
    (!r || r(t)) && (yield s ? t : t.fullpath());
    let h = /* @__PURE__ */ new Set([t]);
    for (let a of h) {
      let c = a.readdirSync();
      for (let f of c) {
        (!r || r(f)) && (yield s ? f : f.fullpath());
        let u = f;
        if (f.isSymbolicLink()) {
          if (!(i && (u = f.realpathSync())))
            continue;
          u.isUnknown() && u.lstatSync();
        }
        u.shouldWalk(h, o) && h.add(u);
      }
    }
  }
  stream(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s = !0, follow: i = !1, filter: r, walkFilter: o } = e, h = new Z({ objectMode: !0 });
    (!r || r(t)) && h.write(s ? t : t.fullpath());
    let a = /* @__PURE__ */ new Set(), c = [t], f = 0, u = /* @__PURE__ */ l(() => {
      let d = !1;
      for (; !d; ) {
        let p = c.shift();
        if (!p) {
          f === 0 && h.end();
          return;
        }
        f++, a.add(p);
        let w = /* @__PURE__ */ l((y, g, E = !1) => {
          if (y)
            return h.emit("error", y);
          if (i && !E) {
            let S = [];
            for (let b of g)
              b.isSymbolicLink() && S.push(b.realpath().then((x) => x?.isUnknown() ? x.lstat() : x));
            if (S.length) {
              Promise.all(S).then(() => w(null, g, !0));
              return;
            }
          }
          for (let S of g)
            S && (!r || r(S)) && (h.write(s ? S : S.fullpath()) || (d = !0));
          f--;
          for (let S of g) {
            let b = S.realpathCached() || S;
            b.shouldWalk(a, o) && c.push(b);
          }
          d && !h.flowing ? h.once("drain", u) : m || u();
        }, "onReaddir"), m = !0;
        p.readdirCB(w, !0), m = !1;
      }
    }, "process");
    return u(), h;
  }
  streamSync(t = this.cwd, e = {}) {
    typeof t == "string" ? t = this.cwd.resolve(t) : t instanceof O || (e = t, t = this.cwd);
    let { withFileTypes: s = !0, follow: i = !1, filter: r, walkFilter: o } = e, h = new Z({ objectMode: !0 }), a = /* @__PURE__ */ new Set();
    (!r || r(t)) && h.write(s ? t : t.fullpath());
    let c = [t], f = 0, u = /* @__PURE__ */ l(() => {
      let d = !1;
      for (; !d; ) {
        let p = c.shift();
        if (!p) {
          f === 0 && h.end();
          return;
        }
        f++, a.add(p);
        let w = p.readdirSync();
        for (let m of w)
          (!r || r(m)) && (h.write(s ? m : m.fullpath()) || (d = !0));
        f--;
        for (let m of w) {
          let y = m;
          if (m.isSymbolicLink()) {
            if (!(i && (y = m.realpathSync())))
              continue;
            y.isUnknown() && y.lstatSync();
          }
          y.shouldWalk(a, o) && c.push(y);
        }
      }
      d && !h.flowing && h.once("drain", u);
    }, "process");
    return u(), h;
  }
  chdir(t = this.cwd) {
    let e = this.cwd;
    this.cwd = typeof t == "string" ? this.cwd.resolve(t) : t, this.cwd[ps](e);
  }
}, ct = class extends Kt {
  static {
    l(this, "PathScurryWin32");
  }
  /**
   * separator for generating path strings
   */
  sep = "\\";
  constructor(t = process.cwd(), e = {}) {
    let { nocase: s = !0 } = e;
    super(t, lt.win32, "\\", { ...e, nocase: s }), this.nocase = s;
    for (let i = this.cwd; i; i = i.parent)
      i.nocase = this.nocase;
  }
  /**
   * @internal
   */
  parseRootPath(t) {
    return lt.win32.parse(t).root.toUpperCase();
  }
  /**
   * @internal
   */
  newRoot(t) {
    return new Ht(this.rootPath, H, void 0, this.roots, this.nocase, this.childrenCache(), { fs: t });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(t) {
    return t.startsWith("/") || t.startsWith("\\") || /^[a-z]:(\/|\\)/i.test(t);
  }
}, ft = class extends Kt {
  static {
    l(this, "PathScurryPosix");
  }
  /**
   * separator for generating path strings
   */
  sep = "/";
  constructor(t = process.cwd(), e = {}) {
    let { nocase: s = !1 } = e;
    super(t, lt.posix, "/", { ...e, nocase: s }), this.nocase = s;
  }
  /**
   * @internal
   */
  parseRootPath(t) {
    return "/";
  }
  /**
   * @internal
   */
  newRoot(t) {
    return new qt(this.rootPath, H, void 0, this.roots, this.nocase, this.childrenCache(), { fs: t });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(t) {
    return t.startsWith("/");
  }
}, At = class extends ft {
  static {
    l(this, "PathScurryDarwin");
  }
  constructor(t = process.cwd(), e = {}) {
    let { nocase: s = !0 } = e;
    super(t, { ...e, nocase: s });
  }
}, _r = process.platform === "win32" ? Ht : qt, ms = process.platform === "win32" ? ct : process.platform === "darwin" ? At : ft;

// ../node_modules/glob/dist/esm/pattern.js
var Ni = /* @__PURE__ */ l((n) => n.length >= 1, "isPatternList"), Li = /* @__PURE__ */ l((n) => n.length >= 1, "isGlobList"), ut = class n {
  static {
    l(this, "Pattern");
  }
  #t;
  #e;
  #n;
  length;
  #i;
  #o;
  #S;
  #l;
  #f;
  #h;
  #a = !0;
  constructor(t, e, s, i) {
    if (!Ni(t))
      throw new TypeError("empty pattern list");
    if (!Li(e))
      throw new TypeError("empty glob list");
    if (e.length !== t.length)
      throw new TypeError("mismatched pattern list and glob list lengths");
    if (this.length = t.length, s < 0 || s >= this.length)
      throw new TypeError("index out of range");
    if (this.#t = t, this.#e = e, this.#n = s, this.#i = i, this.#n === 0) {
      if (this.isUNC()) {
        let [r, o, h, a, ...c] = this.#t, [f, u, d, p, ...w] = this.#e;
        c[0] === "" && (c.shift(), w.shift());
        let m = [r, o, h, a, ""].join("/"), y = [f, u, d, p, ""].join("/");
        this.#t = [m, ...c], this.#e = [y, ...w], this.length = this.#t.length;
      } else if (this.isDrive() || this.isAbsolute()) {
        let [r, ...o] = this.#t, [h, ...a] = this.#e;
        o[0] === "" && (o.shift(), a.shift());
        let c = r + "/", f = h + "/";
        this.#t = [c, ...o], this.#e = [f, ...a], this.length = this.#t.length;
      }
    }
  }
  /**
   * The first entry in the parsed list of patterns
   */
  pattern() {
    return this.#t[this.#n];
  }
  /**
   * true of if pattern() returns a string
   */
  isString() {
    return typeof this.#t[this.#n] == "string";
  }
  /**
   * true of if pattern() returns GLOBSTAR
   */
  isGlobstar() {
    return this.#t[this.#n] === R;
  }
  /**
   * true if pattern() returns a regexp
   */
  isRegExp() {
    return this.#t[this.#n] instanceof RegExp;
  }
  /**
   * The /-joined set of glob parts that make up this pattern
   */
  globString() {
    return this.#S = this.#S || (this.#n === 0 ? this.isAbsolute() ? this.#e[0] + this.#e.slice(1).join("/") : this.#e.join("/") : this.#e.slice(
    this.#n).join("/"));
  }
  /**
   * true if there are more pattern parts after this one
   */
  hasMore() {
    return this.length > this.#n + 1;
  }
  /**
   * The rest of the pattern after this part, or null if this is the end
   */
  rest() {
    return this.#o !== void 0 ? this.#o : this.hasMore() ? (this.#o = new n(this.#t, this.#e, this.#n + 1, this.#i), this.#o.#h = this.#h, this.#o.#f =
    this.#f, this.#o.#l = this.#l, this.#o) : this.#o = null;
  }
  /**
   * true if the pattern represents a //unc/path/ on windows
   */
  isUNC() {
    let t = this.#t;
    return this.#f !== void 0 ? this.#f : this.#f = this.#i === "win32" && this.#n === 0 && t[0] === "" && t[1] === "" && typeof t[2] == "st\
ring" && !!t[2] && typeof t[3] == "string" && !!t[3];
  }
  // pattern like C:/...
  // split = ['C:', ...]
  // XXX: would be nice to handle patterns like `c:*` to test the cwd
  // in c: for *, but I don't know of a way to even figure out what that
  // cwd is without actually chdir'ing into it?
  /**
   * True if the pattern starts with a drive letter on Windows
   */
  isDrive() {
    let t = this.#t;
    return this.#l !== void 0 ? this.#l : this.#l = this.#i === "win32" && this.#n === 0 && this.length > 1 && typeof t[0] == "string" && /^[a-z]:$/i.
    test(t[0]);
  }
  // pattern = '/' or '/...' or '/x/...'
  // split = ['', ''] or ['', ...] or ['', 'x', ...]
  // Drive and UNC both considered absolute on windows
  /**
   * True if the pattern is rooted on an absolute path
   */
  isAbsolute() {
    let t = this.#t;
    return this.#h !== void 0 ? this.#h : this.#h = t[0] === "" && t.length > 1 || this.isDrive() || this.isUNC();
  }
  /**
   * consume the root of the pattern, and return it
   */
  root() {
    let t = this.#t[0];
    return typeof t == "string" && this.isAbsolute() && this.#n === 0 ? t : "";
  }
  /**
   * Check to see if the current globstar pattern is allowed to follow
   * a symbolic link.
   */
  checkFollowGlobstar() {
    return !(this.#n === 0 || !this.isGlobstar() || !this.#a);
  }
  /**
   * Mark that the current globstar pattern is following a symbolic link
   */
  markFollowGlobstar() {
    return this.#n === 0 || !this.isGlobstar() || !this.#a ? !1 : (this.#a = !1, !0);
  }
};

// ../node_modules/glob/dist/esm/ignore.js
var Pi = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux", dt = class {
  static {
    l(this, "Ignore");
  }
  relative;
  relativeChildren;
  absolute;
  absoluteChildren;
  platform;
  mmopts;
  constructor(t, { nobrace: e, nocase: s, noext: i, noglobstar: r, platform: o = Pi }) {
    this.relative = [], this.absolute = [], this.relativeChildren = [], this.absoluteChildren = [], this.platform = o, this.mmopts = {
      dot: !0,
      nobrace: e,
      nocase: s,
      noext: i,
      noglobstar: r,
      optimizationLevel: 2,
      platform: o,
      nocomment: !0,
      nonegate: !0
    };
    for (let h of t)
      this.add(h);
  }
  add(t) {
    let e = new _(t, this.mmopts);
    for (let s = 0; s < e.set.length; s++) {
      let i = e.set[s], r = e.globParts[s];
      if (!i || !r)
        throw new Error("invalid pattern object");
      for (; i[0] === "." && r[0] === "."; )
        i.shift(), r.shift();
      let o = new ut(i, r, 0, this.platform), h = new _(o.globString(), this.mmopts), a = r[r.length - 1] === "**", c = o.isAbsolute();
      c ? this.absolute.push(h) : this.relative.push(h), a && (c ? this.absoluteChildren.push(h) : this.relativeChildren.push(h));
    }
  }
  ignored(t) {
    let e = t.fullpath(), s = `${e}/`, i = t.relative() || ".", r = `${i}/`;
    for (let o of this.relative)
      if (o.match(i) || o.match(r))
        return !0;
    for (let o of this.absolute)
      if (o.match(e) || o.match(s))
        return !0;
    return !1;
  }
  childrenIgnored(t) {
    let e = t.fullpath() + "/", s = (t.relative() || ".") + "/";
    for (let i of this.relativeChildren)
      if (i.match(s))
        return !0;
    for (let i of this.absoluteChildren)
      if (i.match(e))
        return !0;
    return !1;
  }
};

// ../node_modules/glob/dist/esm/processor.js
var me = class n {
  static {
    l(this, "HasWalkedCache");
  }
  store;
  constructor(t = /* @__PURE__ */ new Map()) {
    this.store = t;
  }
  copy() {
    return new n(new Map(this.store));
  }
  hasWalked(t, e) {
    return this.store.get(t.fullpath())?.has(e.globString());
  }
  storeWalked(t, e) {
    let s = t.fullpath(), i = this.store.get(s);
    i ? i.add(e.globString()) : this.store.set(s, /* @__PURE__ */ new Set([e.globString()]));
  }
}, ge = class {
  static {
    l(this, "MatchRecord");
  }
  store = /* @__PURE__ */ new Map();
  add(t, e, s) {
    let i = (e ? 2 : 0) | (s ? 1 : 0), r = this.store.get(t);
    this.store.set(t, r === void 0 ? i : i & r);
  }
  // match, absolute, ifdir
  entries() {
    return [...this.store.entries()].map(([t, e]) => [
      t,
      !!(e & 2),
      !!(e & 1)
    ]);
  }
}, we = class {
  static {
    l(this, "SubWalks");
  }
  store = /* @__PURE__ */ new Map();
  add(t, e) {
    if (!t.canReaddir())
      return;
    let s = this.store.get(t);
    s ? s.find((i) => i.globString() === e.globString()) || s.push(e) : this.store.set(t, [e]);
  }
  get(t) {
    let e = this.store.get(t);
    if (!e)
      throw new Error("attempting to walk unknown path");
    return e;
  }
  entries() {
    return this.keys().map((t) => [t, this.store.get(t)]);
  }
  keys() {
    return [...this.store.keys()].filter((t) => t.canReaddir());
  }
}, Rt = class n {
  static {
    l(this, "Processor");
  }
  hasWalkedCache;
  matches = new ge();
  subwalks = new we();
  patterns;
  follow;
  dot;
  opts;
  constructor(t, e) {
    this.opts = t, this.follow = !!t.follow, this.dot = !!t.dot, this.hasWalkedCache = e ? e.copy() : new me();
  }
  processPatterns(t, e) {
    this.patterns = e;
    let s = e.map((i) => [t, i]);
    for (let [i, r] of s) {
      this.hasWalkedCache.storeWalked(i, r);
      let o = r.root(), h = r.isAbsolute() && this.opts.absolute !== !1;
      if (o) {
        i = i.resolve(o === "/" && this.opts.root !== void 0 ? this.opts.root : o);
        let u = r.rest();
        if (u)
          r = u;
        else {
          this.matches.add(i, !0, !1);
          continue;
        }
      }
      if (i.isENOENT())
        continue;
      let a, c, f = !1;
      for (; typeof (a = r.pattern()) == "string" && (c = r.rest()); )
        i = i.resolve(a), r = c, f = !0;
      if (a = r.pattern(), c = r.rest(), f) {
        if (this.hasWalkedCache.hasWalked(i, r))
          continue;
        this.hasWalkedCache.storeWalked(i, r);
      }
      if (typeof a == "string") {
        let u = a === ".." || a === "" || a === ".";
        this.matches.add(i.resolve(a), h, u);
        continue;
      } else if (a === R) {
        (!i.isSymbolicLink() || this.follow || r.checkFollowGlobstar()) && this.subwalks.add(i, r);
        let u = c?.pattern(), d = c?.rest();
        if (!c || (u === "" || u === ".") && !d)
          this.matches.add(i, h, u === "" || u === ".");
        else if (u === "..") {
          let p = i.parent || i;
          d ? this.hasWalkedCache.hasWalked(p, d) || this.subwalks.add(p, d) : this.matches.add(p, h, !0);
        }
      } else a instanceof RegExp && this.subwalks.add(i, r);
    }
    return this;
  }
  subwalkTargets() {
    return this.subwalks.keys();
  }
  child() {
    return new n(this.opts, this.hasWalkedCache);
  }
  // return a new Processor containing the subwalks for each
  // child entry, and a set of matches, and
  // a hasWalkedCache that's a copy of this one
  // then we're going to call
  filterEntries(t, e) {
    let s = this.subwalks.get(t), i = this.child();
    for (let r of e)
      for (let o of s) {
        let h = o.isAbsolute(), a = o.pattern(), c = o.rest();
        a === R ? i.testGlobstar(r, o, c, h) : a instanceof RegExp ? i.testRegExp(r, a, c, h) : i.testString(r, a, c, h);
      }
    return i;
  }
  testGlobstar(t, e, s, i) {
    if ((this.dot || !t.name.startsWith(".")) && (e.hasMore() || this.matches.add(t, i, !1), t.canReaddir() && (this.follow || !t.isSymbolicLink() ?
    this.subwalks.add(t, e) : t.isSymbolicLink() && (s && e.checkFollowGlobstar() ? this.subwalks.add(t, s) : e.markFollowGlobstar() && this.
    subwalks.add(t, e)))), s) {
      let r = s.pattern();
      if (typeof r == "string" && // dots and empty were handled already
      r !== ".." && r !== "" && r !== ".")
        this.testString(t, r, s.rest(), i);
      else if (r === "..") {
        let o = t.parent || t;
        this.subwalks.add(o, s);
      } else r instanceof RegExp && this.testRegExp(t, r, s.rest(), i);
    }
  }
  testRegExp(t, e, s, i) {
    e.test(t.name) && (s ? this.subwalks.add(t, s) : this.matches.add(t, i, !1));
  }
  testString(t, e, s, i) {
    t.isNamed(e) && (s ? this.subwalks.add(t, s) : this.matches.add(t, i, !1));
  }
};

// ../node_modules/glob/dist/esm/walker.js
var Wi = /* @__PURE__ */ l((n, t) => typeof n == "string" ? new dt([n], t) : Array.isArray(n) ? new dt(n, t) : n, "makeIgnore"), Vt = class {
  static {
    l(this, "GlobUtil");
  }
  path;
  patterns;
  opts;
  seen = /* @__PURE__ */ new Set();
  paused = !1;
  aborted = !1;
  #t = [];
  #e;
  #n;
  signal;
  maxDepth;
  includeChildMatches;
  constructor(t, e, s) {
    if (this.patterns = t, this.path = e, this.opts = s, this.#n = !s.posix && s.platform === "win32" ? "\\" : "/", this.includeChildMatches =
    s.includeChildMatches !== !1, (s.ignore || !this.includeChildMatches) && (this.#e = Wi(s.ignore ?? [], s), !this.includeChildMatches && typeof this.#e.
    add != "function")) {
      let i = "cannot ignore child matches, ignore lacks add() method.";
      throw new Error(i);
    }
    this.maxDepth = s.maxDepth || 1 / 0, s.signal && (this.signal = s.signal, this.signal.addEventListener("abort", () => {
      this.#t.length = 0;
    }));
  }
  #i(t) {
    return this.seen.has(t) || !!this.#e?.ignored?.(t);
  }
  #o(t) {
    return !!this.#e?.childrenIgnored?.(t);
  }
  // backpressure mechanism
  pause() {
    this.paused = !0;
  }
  resume() {
    if (this.signal?.aborted)
      return;
    this.paused = !1;
    let t;
    for (; !this.paused && (t = this.#t.shift()); )
      t();
  }
  onResume(t) {
    this.signal?.aborted || (this.paused ? this.#t.push(t) : t());
  }
  // do the requisite realpath/stat checking, and return the path
  // to add or undefined to filter it out.
  async matchCheck(t, e) {
    if (e && this.opts.nodir)
      return;
    let s;
    if (this.opts.realpath) {
      if (s = t.realpathCached() || await t.realpath(), !s)
        return;
      t = s;
    }
    let r = t.isUnknown() || this.opts.stat ? await t.lstat() : t;
    if (this.opts.follow && this.opts.nodir && r?.isSymbolicLink()) {
      let o = await r.realpath();
      o && (o.isUnknown() || this.opts.stat) && await o.lstat();
    }
    return this.matchCheckTest(r, e);
  }
  matchCheckTest(t, e) {
    return t && (this.maxDepth === 1 / 0 || t.depth() <= this.maxDepth) && (!e || t.canReaddir()) && (!this.opts.nodir || !t.isDirectory()) &&
    (!this.opts.nodir || !this.opts.follow || !t.isSymbolicLink() || !t.realpathCached()?.isDirectory()) && !this.#i(t) ? t : void 0;
  }
  matchCheckSync(t, e) {
    if (e && this.opts.nodir)
      return;
    let s;
    if (this.opts.realpath) {
      if (s = t.realpathCached() || t.realpathSync(), !s)
        return;
      t = s;
    }
    let r = t.isUnknown() || this.opts.stat ? t.lstatSync() : t;
    if (this.opts.follow && this.opts.nodir && r?.isSymbolicLink()) {
      let o = r.realpathSync();
      o && (o?.isUnknown() || this.opts.stat) && o.lstatSync();
    }
    return this.matchCheckTest(r, e);
  }
  matchFinish(t, e) {
    if (this.#i(t))
      return;
    if (!this.includeChildMatches && this.#e?.add) {
      let r = `${t.relativePosix()}/**`;
      this.#e.add(r);
    }
    let s = this.opts.absolute === void 0 ? e : this.opts.absolute;
    this.seen.add(t);
    let i = this.opts.mark && t.isDirectory() ? this.#n : "";
    if (this.opts.withFileTypes)
      this.matchEmit(t);
    else if (s) {
      let r = this.opts.posix ? t.fullpathPosix() : t.fullpath();
      this.matchEmit(r + i);
    } else {
      let r = this.opts.posix ? t.relativePosix() : t.relative(), o = this.opts.dotRelative && !r.startsWith(".." + this.#n) ? "." + this.#n :
      "";
      this.matchEmit(r ? o + r + i : "." + i);
    }
  }
  async match(t, e, s) {
    let i = await this.matchCheck(t, s);
    i && this.matchFinish(i, e);
  }
  matchSync(t, e, s) {
    let i = this.matchCheckSync(t, s);
    i && this.matchFinish(i, e);
  }
  walkCB(t, e, s) {
    this.signal?.aborted && s(), this.walkCB2(t, e, new Rt(this.opts), s);
  }
  walkCB2(t, e, s, i) {
    if (this.#o(t))
      return i();
    if (this.signal?.aborted && i(), this.paused) {
      this.onResume(() => this.walkCB2(t, e, s, i));
      return;
    }
    s.processPatterns(t, e);
    let r = 1, o = /* @__PURE__ */ l(() => {
      --r === 0 && i();
    }, "next");
    for (let [h, a, c] of s.matches.entries())
      this.#i(h) || (r++, this.match(h, a, c).then(() => o()));
    for (let h of s.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && h.depth() >= this.maxDepth)
        continue;
      r++;
      let a = h.readdirCached();
      h.calledReaddir() ? this.walkCB3(h, a, s, o) : h.readdirCB((c, f) => this.walkCB3(h, f, s, o), !0);
    }
    o();
  }
  walkCB3(t, e, s, i) {
    s = s.filterEntries(t, e);
    let r = 1, o = /* @__PURE__ */ l(() => {
      --r === 0 && i();
    }, "next");
    for (let [h, a, c] of s.matches.entries())
      this.#i(h) || (r++, this.match(h, a, c).then(() => o()));
    for (let [h, a] of s.subwalks.entries())
      r++, this.walkCB2(h, a, s.child(), o);
    o();
  }
  walkCBSync(t, e, s) {
    this.signal?.aborted && s(), this.walkCB2Sync(t, e, new Rt(this.opts), s);
  }
  walkCB2Sync(t, e, s, i) {
    if (this.#o(t))
      return i();
    if (this.signal?.aborted && i(), this.paused) {
      this.onResume(() => this.walkCB2Sync(t, e, s, i));
      return;
    }
    s.processPatterns(t, e);
    let r = 1, o = /* @__PURE__ */ l(() => {
      --r === 0 && i();
    }, "next");
    for (let [h, a, c] of s.matches.entries())
      this.#i(h) || this.matchSync(h, a, c);
    for (let h of s.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && h.depth() >= this.maxDepth)
        continue;
      r++;
      let a = h.readdirSync();
      this.walkCB3Sync(h, a, s, o);
    }
    o();
  }
  walkCB3Sync(t, e, s, i) {
    s = s.filterEntries(t, e);
    let r = 1, o = /* @__PURE__ */ l(() => {
      --r === 0 && i();
    }, "next");
    for (let [h, a, c] of s.matches.entries())
      this.#i(h) || this.matchSync(h, a, c);
    for (let [h, a] of s.subwalks.entries())
      r++, this.walkCB2Sync(h, a, s.child(), o);
    o();
  }
}, Dt = class extends Vt {
  static {
    l(this, "GlobWalker");
  }
  matches = /* @__PURE__ */ new Set();
  constructor(t, e, s) {
    super(t, e, s);
  }
  matchEmit(t) {
    this.matches.add(t);
  }
  async walk() {
    if (this.signal?.aborted)
      throw this.signal.reason;
    return this.path.isUnknown() && await this.path.lstat(), await new Promise((t, e) => {
      this.walkCB(this.path, this.patterns, () => {
        this.signal?.aborted ? e(this.signal.reason) : t(this.matches);
      });
    }), this.matches;
  }
  walkSync() {
    if (this.signal?.aborted)
      throw this.signal.reason;
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => {
      if (this.signal?.aborted)
        throw this.signal.reason;
    }), this.matches;
  }
}, Ot = class extends Vt {
  static {
    l(this, "GlobStream");
  }
  results;
  constructor(t, e, s) {
    super(t, e, s), this.results = new Z({
      signal: this.signal,
      objectMode: !0
    }), this.results.on("drain", () => this.resume()), this.results.on("resume", () => this.resume());
  }
  matchEmit(t) {
    this.results.write(t), this.results.flowing || this.pause();
  }
  stream() {
    let t = this.path;
    return t.isUnknown() ? t.lstat().then(() => {
      this.walkCB(t, this.patterns, () => this.results.end());
    }) : this.walkCB(t, this.patterns, () => this.results.end()), this.results;
  }
  streamSync() {
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => this.results.end()), this.results;
  }
};

// ../node_modules/glob/dist/esm/glob.js
var ji = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux", $ = class {
  static {
    l(this, "Glob");
  }
  absolute;
  cwd;
  root;
  dot;
  dotRelative;
  follow;
  ignore;
  magicalBraces;
  mark;
  matchBase;
  maxDepth;
  nobrace;
  nocase;
  nodir;
  noext;
  noglobstar;
  pattern;
  platform;
  realpath;
  scurry;
  stat;
  signal;
  windowsPathsNoEscape;
  withFileTypes;
  includeChildMatches;
  /**
   * The options provided to the constructor.
   */
  opts;
  /**
   * An array of parsed immutable {@link Pattern} objects.
   */
  patterns;
  /**
   * All options are stored as properties on the `Glob` object.
   *
   * See {@link GlobOptions} for full options descriptions.
   *
   * Note that a previous `Glob` object can be passed as the
   * `GlobOptions` to another `Glob` instantiation to re-use settings
   * and caches with a new pattern.
   *
   * Traversal functions can be called multiple times to run the walk
   * again.
   */
  constructor(t, e) {
    if (!e)
      throw new TypeError("glob options required");
    if (this.withFileTypes = !!e.withFileTypes, this.signal = e.signal, this.follow = !!e.follow, this.dot = !!e.dot, this.dotRelative = !!e.
    dotRelative, this.nodir = !!e.nodir, this.mark = !!e.mark, e.cwd ? (e.cwd instanceof URL || e.cwd.startsWith("file://")) && (e.cwd = (0, gs.fileURLToPath)(
    e.cwd)) : this.cwd = "", this.cwd = e.cwd || "", this.root = e.root, this.magicalBraces = !!e.magicalBraces, this.nobrace = !!e.nobrace,
    this.noext = !!e.noext, this.realpath = !!e.realpath, this.absolute = e.absolute, this.includeChildMatches = e.includeChildMatches !== !1,
    this.noglobstar = !!e.noglobstar, this.matchBase = !!e.matchBase, this.maxDepth = typeof e.maxDepth == "number" ? e.maxDepth : 1 / 0, this.
    stat = !!e.stat, this.ignore = e.ignore, this.withFileTypes && this.absolute !== void 0)
      throw new Error("cannot set absolute and withFileTypes:true");
    if (typeof t == "string" && (t = [t]), this.windowsPathsNoEscape = !!e.windowsPathsNoEscape || e.allowWindowsEscape === !1, this.windowsPathsNoEscape &&
    (t = t.map((a) => a.replace(/\\/g, "/"))), this.matchBase) {
      if (e.noglobstar)
        throw new TypeError("base matching requires globstar");
      t = t.map((a) => a.includes("/") ? a : `./**/${a}`);
    }
    if (this.pattern = t, this.platform = e.platform || ji, this.opts = { ...e, platform: this.platform }, e.scurry) {
      if (this.scurry = e.scurry, e.nocase !== void 0 && e.nocase !== e.scurry.nocase)
        throw new Error("nocase option contradicts provided scurry option");
    } else {
      let a = e.platform === "win32" ? ct : e.platform === "darwin" ? At : e.platform ? ft : ms;
      this.scurry = new a(this.cwd, {
        nocase: e.nocase,
        fs: e.fs
      });
    }
    this.nocase = this.scurry.nocase;
    let s = this.platform === "darwin" || this.platform === "win32", i = {
      // default nocase based on platform
      ...e,
      dot: this.dot,
      matchBase: this.matchBase,
      nobrace: this.nobrace,
      nocase: this.nocase,
      nocaseMagicOnly: s,
      nocomment: !0,
      noext: this.noext,
      nonegate: !0,
      optimizationLevel: 2,
      platform: this.platform,
      windowsPathsNoEscape: this.windowsPathsNoEscape,
      debug: !!this.opts.debug
    }, r = this.pattern.map((a) => new _(a, i)), [o, h] = r.reduce((a, c) => (a[0].push(...c.set), a[1].push(...c.globParts), a), [[], []]);
    this.patterns = o.map((a, c) => {
      let f = h[c];
      if (!f)
        throw new Error("invalid pattern object");
      return new ut(a, f, 0, this.platform);
    });
  }
  async walk() {
    return [
      ...await new Dt(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walk()
    ];
  }
  walkSync() {
    return [
      ...new Dt(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walkSync()
    ];
  }
  stream() {
    return new Ot(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).stream();
  }
  streamSync() {
    return new Ot(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).streamSync();
  }
  /**
   * Default sync iteration function. Returns a Generator that
   * iterates over the results.
   */
  iterateSync() {
    return this.streamSync()[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  /**
   * Default async iteration function. Returns an AsyncGenerator that
   * iterates over the results.
   */
  iterate() {
    return this.stream()[Symbol.asyncIterator]();
  }
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
};

// ../node_modules/glob/dist/esm/has-magic.js
var ye = /* @__PURE__ */ l((n, t = {}) => {
  Array.isArray(n) || (n = [n]);
  for (let e of n)
    if (new _(e, t).hasMagic())
      return !0;
  return !1;
}, "hasMagic");

// ../node_modules/glob/dist/esm/index.js
function Yt(n, t = {}) {
  return new $(n, t).streamSync();
}
l(Yt, "globStreamSync");
function ys(n, t = {}) {
  return new $(n, t).stream();
}
l(ys, "globStream");
function bs(n, t = {}) {
  return new $(n, t).walkSync();
}
l(bs, "globSync");
async function ws(n, t = {}) {
  return new $(n, t).walk();
}
l(ws, "glob_");
function Jt(n, t = {}) {
  return new $(n, t).iterateSync();
}
l(Jt, "globIterateSync");
function Ss(n, t = {}) {
  return new $(n, t).iterate();
}
l(Ss, "globIterate");
var Ii = Yt, zi = Object.assign(ys, { sync: Yt }), Bi = Jt, Ui = Object.assign(Ss, {
  sync: Jt
}), $i = Object.assign(bs, {
  stream: Yt,
  iterate: Jt
}), Xt = Object.assign(ws, {
  glob: ws,
  globSync: bs,
  sync: $i,
  globStream: ys,
  stream: zi,
  globStreamSync: Yt,
  streamSync: Ii,
  globIterate: Ss,
  iterate: Ui,
  globIterateSync: Jt,
  iterateSync: Bi,
  Glob: $,
  hasMagic: ye,
  escape: rt,
  unescape: z
});
Xt.glob = Xt;

// ../node_modules/slash/index.js
function be(n) {
  return n.startsWith("\\\\?\\") ? n : n.replace(/\\/g, "/");
}
l(be, "slash");

// src/core-server/utils/remove-mdx-entries.ts
async function Es(n, t) {
  let e = (0, Zt.normalizeStories)(n, {
    configDir: t.configDir,
    workingDir: t.configDir,
    defaultFilesPattern: "**/*.@(stories.@(js|jsx|mjs|ts|tsx))"
  });
  return (await Promise.all(
    e.map(async ({ directory: i, files: r, titlePrefix: o }) => {
      let h = (0, X.join)(i, r), a = (0, X.isAbsolute)(h) ? h : (0, X.join)(t.configDir, h), c = (0, X.isAbsolute)(i) ? i : (0, X.join)(t.configDir,
      i);
      return {
        files: (await Xt(be(a), {
          ...(0, Zt.commonGlobOptions)(a),
          follow: !0
        })).map((f) => (0, X.relative)(c, f)),
        directory: i,
        titlePrefix: o
      };
    })
  )).flatMap(({ directory: i, files: r, titlePrefix: o }, h) => {
    let a = r.filter((f) => !f.endsWith(".mdx")), c = [];
    return a.length < r.length ? c = a.map((f) => ({
      directory: i,
      titlePrefix: o,
      files: `**/${f}`
    })) : c = [
      { directory: e[h].directory, titlePrefix: e[h].titlePrefix, files: e[h].files }
    ], c;
  });
}
l(Es, "removeMDXEntries");

// src/core-server/presets/common-override-preset.ts
var Gi = /* @__PURE__ */ l(async (n) => {
  let t = typeof n == "string" ? n : n?.name, e = typeof n == "string" ? {} : n?.options || {};
  return {
    name: t,
    options: e
  };
}, "framework"), Hi = /* @__PURE__ */ l(async (n, t) => t?.build?.test?.disableMDXEntries ? Es(n, t) : n, "stories"), qi = /* @__PURE__ */ l(
async (n, t) => t?.build?.test?.disableDocgen ? { ...n ?? {}, reactDocgen: !1, check: !1 } : n, "typescript"), Ki = /* @__PURE__ */ l(async (n, t) => t?.
build?.test?.disableAutoDocs ? {} : n, "docs"), xs = /* @__PURE__ */ l((n) => ({
  disableBlocks: n,
  disabledAddons: n ? ["@storybook/addon-docs", "@storybook/addon-essentials/docs", "@storybook/addon-coverage"] : [],
  disableMDXEntries: n,
  disableAutoDocs: n,
  disableDocgen: n,
  disableSourcemaps: n,
  disableTreeShaking: n,
  esbuildMinify: n
}), "createTestBuildFeatures"), Vi = /* @__PURE__ */ l(async (n, t) => ({
  ...n,
  test: t.test ? {
    ...xs(!!t.test),
    ...n?.test
  } : xs(!1)
}), "build");
