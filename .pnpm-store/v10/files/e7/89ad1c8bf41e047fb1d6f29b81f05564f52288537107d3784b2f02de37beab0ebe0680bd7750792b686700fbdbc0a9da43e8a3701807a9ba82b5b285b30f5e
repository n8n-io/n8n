"use strict";
var sw = Object.create;
var Wi = Object.defineProperty;
var ow = Object.getOwnPropertyDescriptor;
var aw = Object.getOwnPropertyNames;
var uw = Object.getPrototypeOf, lw = Object.prototype.hasOwnProperty;
var s = (e, t) => Wi(e, "name", { value: t, configurable: !0 });
var b = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), cw = (e, t) => {
  for (var r in t)
    Wi(e, r, { get: t[r], enumerable: !0 });
}, Ld = (e, t, r, i) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let n of aw(t))
      !lw.call(e, n) && n !== r && Wi(e, n, { get: () => t[n], enumerable: !(i = ow(t, n)) || i.enumerable });
  return e;
};
var X = (e, t, r) => (r = e != null ? sw(uw(e)) : {}, Ld(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  t || !e || !e.__esModule ? Wi(r, "default", { value: e, enumerable: !0 }) : r,
  e
)), dw = (e) => Ld(Wi({}, "__esModule", { value: !0 }), e);

// ../node_modules/prompts/node_modules/kleur/index.js
var ge = b((Q8, zd) => {
  "use strict";
  var { FORCE_COLOR: gw, NODE_DISABLE_COLORS: yw, TERM: bw } = process.env, ie = {
    enabled: !yw && bw !== "dumb" && gw !== "0",
    // modifiers
    reset: se(0, 0),
    bold: se(1, 22),
    dim: se(2, 22),
    italic: se(3, 23),
    underline: se(4, 24),
    inverse: se(7, 27),
    hidden: se(8, 28),
    strikethrough: se(9, 29),
    // colors
    black: se(30, 39),
    red: se(31, 39),
    green: se(32, 39),
    yellow: se(33, 39),
    blue: se(34, 39),
    magenta: se(35, 39),
    cyan: se(36, 39),
    white: se(37, 39),
    gray: se(90, 39),
    grey: se(90, 39),
    // background colors
    bgBlack: se(40, 49),
    bgRed: se(41, 49),
    bgGreen: se(42, 49),
    bgYellow: se(43, 49),
    bgBlue: se(44, 49),
    bgMagenta: se(45, 49),
    bgCyan: se(46, 49),
    bgWhite: se(47, 49)
  };
  function Zd(e, t) {
    let r = 0, i, n = "", o = "";
    for (; r < e.length; r++)
      i = e[r], n += i.open, o += i.close, t.includes(i.close) && (t = t.replace(i.rgx, i.close + i.open));
    return n + t + o;
  }
  s(Zd, "run");
  function vw(e, t) {
    let r = { has: e, keys: t };
    return r.reset = ie.reset.bind(r), r.bold = ie.bold.bind(r), r.dim = ie.dim.bind(r), r.italic = ie.italic.bind(r), r.underline = ie.underline.
    bind(r), r.inverse = ie.inverse.bind(r), r.hidden = ie.hidden.bind(r), r.strikethrough = ie.strikethrough.bind(r), r.black = ie.black.bind(
    r), r.red = ie.red.bind(r), r.green = ie.green.bind(r), r.yellow = ie.yellow.bind(r), r.blue = ie.blue.bind(r), r.magenta = ie.magenta.bind(
    r), r.cyan = ie.cyan.bind(r), r.white = ie.white.bind(r), r.gray = ie.gray.bind(r), r.grey = ie.grey.bind(r), r.bgBlack = ie.bgBlack.bind(
    r), r.bgRed = ie.bgRed.bind(r), r.bgGreen = ie.bgGreen.bind(r), r.bgYellow = ie.bgYellow.bind(r), r.bgBlue = ie.bgBlue.bind(r), r.bgMagenta =
    ie.bgMagenta.bind(r), r.bgCyan = ie.bgCyan.bind(r), r.bgWhite = ie.bgWhite.bind(r), r;
  }
  s(vw, "chain");
  function se(e, t) {
    let r = {
      open: `\x1B[${e}m`,
      close: `\x1B[${t}m`,
      rgx: new RegExp(`\\x1b\\[${t}m`, "g")
    };
    return function(i) {
      return this !== void 0 && this.has !== void 0 ? (this.has.includes(e) || (this.has.push(e), this.keys.push(r)), i === void 0 ? this : ie.
      enabled ? Zd(this.keys, i + "") : i + "") : i === void 0 ? vw([e], [r]) : ie.enabled ? Zd([r], i + "") : i + "";
    };
  }
  s(se, "init");
  zd.exports = ie;
});

// ../node_modules/prompts/dist/util/action.js
var Kd = b((tP, Gd) => {
  "use strict";
  Gd.exports = (e, t) => {
    if (!(e.meta && e.name !== "escape")) {
      if (e.ctrl) {
        if (e.name === "a") return "first";
        if (e.name === "c" || e.name === "d") return "abort";
        if (e.name === "e") return "last";
        if (e.name === "g") return "reset";
      }
      if (t) {
        if (e.name === "j") return "down";
        if (e.name === "k") return "up";
      }
      return e.name === "return" || e.name === "enter" ? "submit" : e.name === "backspace" ? "delete" : e.name === "delete" ? "deleteForward" :
      e.name === "abort" ? "abort" : e.name === "escape" ? "exit" : e.name === "tab" ? "next" : e.name === "pagedown" ? "nextPage" : e.name ===
      "pageup" ? "prevPage" : e.name === "home" ? "home" : e.name === "end" ? "end" : e.name === "up" ? "up" : e.name === "down" ? "down" : e.
      name === "right" ? "right" : e.name === "left" ? "left" : !1;
    }
  };
});

// ../node_modules/prompts/dist/util/strip.js
var fs = b((rP, Yd) => {
  "use strict";
  Yd.exports = (e) => {
    let t = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"].join("|"), r = new RegExp(t, "g");
    return typeof e == "string" ? e.replace(r, "") : e;
  };
});

// ../node_modules/sisteransi/src/index.js
var be = b((iP, Jd) => {
  "use strict";
  var Sa = "\x1B", ye = `${Sa}[`, _w = "\x07", Ta = {
    to(e, t) {
      return t ? `${ye}${t + 1};${e + 1}H` : `${ye}${e + 1}G`;
    },
    move(e, t) {
      let r = "";
      return e < 0 ? r += `${ye}${-e}D` : e > 0 && (r += `${ye}${e}C`), t < 0 ? r += `${ye}${-t}A` : t > 0 && (r += `${ye}${t}B`), r;
    },
    up: /* @__PURE__ */ s((e = 1) => `${ye}${e}A`, "up"),
    down: /* @__PURE__ */ s((e = 1) => `${ye}${e}B`, "down"),
    forward: /* @__PURE__ */ s((e = 1) => `${ye}${e}C`, "forward"),
    backward: /* @__PURE__ */ s((e = 1) => `${ye}${e}D`, "backward"),
    nextLine: /* @__PURE__ */ s((e = 1) => `${ye}E`.repeat(e), "nextLine"),
    prevLine: /* @__PURE__ */ s((e = 1) => `${ye}F`.repeat(e), "prevLine"),
    left: `${ye}G`,
    hide: `${ye}?25l`,
    show: `${ye}?25h`,
    save: `${Sa}7`,
    restore: `${Sa}8`
  }, ww = {
    up: /* @__PURE__ */ s((e = 1) => `${ye}S`.repeat(e), "up"),
    down: /* @__PURE__ */ s((e = 1) => `${ye}T`.repeat(e), "down")
  }, Ew = {
    screen: `${ye}2J`,
    up: /* @__PURE__ */ s((e = 1) => `${ye}1J`.repeat(e), "up"),
    down: /* @__PURE__ */ s((e = 1) => `${ye}J`.repeat(e), "down"),
    line: `${ye}2K`,
    lineEnd: `${ye}K`,
    lineStart: `${ye}1K`,
    lines(e) {
      let t = "";
      for (let r = 0; r < e; r++)
        t += this.line + (r < e - 1 ? Ta.up() : "");
      return e && (t += Ta.left), t;
    }
  };
  Jd.exports = { cursor: Ta, scroll: ww, erase: Ew, beep: _w };
});

// ../node_modules/prompts/dist/util/clear.js
var rf = b((sP, tf) => {
  "use strict";
  function Cw(e, t) {
    var r = typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
    if (!r) {
      if (Array.isArray(e) || (r = xw(e)) || t && e && typeof e.length == "number") {
        r && (e = r);
        var i = 0, n = /* @__PURE__ */ s(function() {
        }, "F");
        return { s: n, n: /* @__PURE__ */ s(function() {
          return i >= e.length ? { done: !0 } : { done: !1, value: e[i++] };
        }, "n"), e: /* @__PURE__ */ s(function(c) {
          throw c;
        }, "e"), f: n };
      }
      throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    var o = !0, a = !1, u;
    return { s: /* @__PURE__ */ s(function() {
      r = r.call(e);
    }, "s"), n: /* @__PURE__ */ s(function() {
      var c = r.next();
      return o = c.done, c;
    }, "n"), e: /* @__PURE__ */ s(function(c) {
      a = !0, u = c;
    }, "e"), f: /* @__PURE__ */ s(function() {
      try {
        !o && r.return != null && r.return();
      } finally {
        if (a) throw u;
      }
    }, "f") };
  }
  s(Cw, "_createForOfIteratorHelper");
  function xw(e, t) {
    if (e) {
      if (typeof e == "string") return Xd(e, t);
      var r = Object.prototype.toString.call(e).slice(8, -1);
      if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set") return Array.from(e);
      if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return Xd(e, t);
    }
  }
  s(xw, "_unsupportedIterableToArray");
  function Xd(e, t) {
    (t == null || t > e.length) && (t = e.length);
    for (var r = 0, i = new Array(t); r < t; r++) i[r] = e[r];
    return i;
  }
  s(Xd, "_arrayLikeToArray");
  var Fw = fs(), ef = be(), Qd = ef.erase, Sw = ef.cursor, Tw = /* @__PURE__ */ s((e) => [...Fw(e)].length, "width");
  tf.exports = function(e, t) {
    if (!t) return Qd.line + Sw.to(0);
    let r = 0, i = e.split(/\r?\n/);
    var n = Cw(i), o;
    try {
      for (n.s(); !(o = n.n()).done; ) {
        let a = o.value;
        r += 1 + Math.floor(Math.max(Tw(a) - 1, 0) / t);
      }
    } catch (a) {
      n.e(a);
    } finally {
      n.f();
    }
    return Qd.lines(r);
  };
});

// ../node_modules/prompts/dist/util/figures.js
var Aa = b((aP, nf) => {
  "use strict";
  var $i = {
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
  }, Aw = {
    arrowUp: $i.arrowUp,
    arrowDown: $i.arrowDown,
    arrowLeft: $i.arrowLeft,
    arrowRight: $i.arrowRight,
    radioOn: "(*)",
    radioOff: "( )",
    tick: "\u221A",
    cross: "\xD7",
    ellipsis: "...",
    pointerSmall: "\xBB",
    line: "\u2500",
    pointer: ">"
  }, Rw = process.platform === "win32" ? Aw : $i;
  nf.exports = Rw;
});

// ../node_modules/prompts/dist/util/style.js
var of = b((uP, sf) => {
  "use strict";
  var Jr = ge(), dr = Aa(), Ra = Object.freeze({
    password: {
      scale: 1,
      render: /* @__PURE__ */ s((e) => "*".repeat(e.length), "render")
    },
    emoji: {
      scale: 2,
      render: /* @__PURE__ */ s((e) => "\u{1F603}".repeat(e.length), "render")
    },
    invisible: {
      scale: 0,
      render: /* @__PURE__ */ s((e) => "", "render")
    },
    default: {
      scale: 1,
      render: /* @__PURE__ */ s((e) => `${e}`, "render")
    }
  }), kw = /* @__PURE__ */ s((e) => Ra[e] || Ra.default, "render"), Hi = Object.freeze({
    aborted: Jr.red(dr.cross),
    done: Jr.green(dr.tick),
    exited: Jr.yellow(dr.cross),
    default: Jr.cyan("?")
  }), Ow = /* @__PURE__ */ s((e, t, r) => t ? Hi.aborted : r ? Hi.exited : e ? Hi.done : Hi.default, "symbol"), Bw = /* @__PURE__ */ s((e) => Jr.
  gray(e ? dr.ellipsis : dr.pointerSmall), "delimiter"), Pw = /* @__PURE__ */ s((e, t) => Jr.gray(e ? t ? dr.pointerSmall : "+" : dr.line), "\
item");
  sf.exports = {
    styles: Ra,
    render: kw,
    symbols: Hi,
    symbol: Ow,
    delimiter: Bw,
    item: Pw
  };
});

// ../node_modules/prompts/dist/util/lines.js
var uf = b((cP, af) => {
  "use strict";
  var Iw = fs();
  af.exports = function(e, t) {
    let r = String(Iw(e) || "").split(/\r?\n/);
    return t ? r.map((i) => Math.ceil(i.length / t)).reduce((i, n) => i + n) : r.length;
  };
});

// ../node_modules/prompts/dist/util/wrap.js
var cf = b((dP, lf) => {
  "use strict";
  lf.exports = (e, t = {}) => {
    let r = Number.isSafeInteger(parseInt(t.margin)) ? new Array(parseInt(t.margin)).fill(" ").join("") : t.margin || "", i = t.width;
    return (e || "").split(/\r?\n/g).map((n) => n.split(/\s+/g).reduce((o, a) => (a.length + r.length >= i || o[o.length - 1].length + a.length +
    1 < i ? o[o.length - 1] += ` ${a}` : o.push(`${r}${a}`), o), [r]).join(`
`)).join(`
`);
  };
});

// ../node_modules/prompts/dist/util/entriesToDisplay.js
var ff = b((fP, df) => {
  "use strict";
  df.exports = (e, t, r) => {
    r = r || t;
    let i = Math.min(t - r, e - Math.floor(r / 2));
    i < 0 && (i = 0);
    let n = Math.min(i + r, t);
    return {
      startIndex: i,
      endIndex: n
    };
  };
});

// ../node_modules/prompts/dist/util/index.js
var et = b((hP, hf) => {
  "use strict";
  hf.exports = {
    action: Kd(),
    clear: rf(),
    style: of(),
    strip: fs(),
    figures: Aa(),
    lines: uf(),
    wrap: cf(),
    entriesToDisplay: ff()
  };
});

// ../node_modules/prompts/dist/elements/prompt.js
var wt = b((pP, mf) => {
  "use strict";
  var pf = require("readline"), Mw = et(), jw = Mw.action, qw = require("events"), Df = be(), Lw = Df.beep, Nw = Df.cursor, Uw = ge(), ka = class extends qw {
    static {
      s(this, "Prompt");
    }
    constructor(t = {}) {
      super(), this.firstRender = !0, this.in = t.stdin || process.stdin, this.out = t.stdout || process.stdout, this.onRender = (t.onRender ||
      (() => {
      })).bind(this);
      let r = pf.createInterface({
        input: this.in,
        escapeCodeTimeout: 50
      });
      pf.emitKeypressEvents(this.in, r), this.in.isTTY && this.in.setRawMode(!0);
      let i = ["SelectPrompt", "MultiselectPrompt"].indexOf(this.constructor.name) > -1, n = /* @__PURE__ */ s((o, a) => {
        let u = jw(a, i);
        u === !1 ? this._ && this._(o, a) : typeof this[u] == "function" ? this[u](a) : this.bell();
      }, "keypress");
      this.close = () => {
        this.out.write(Nw.show), this.in.removeListener("keypress", n), this.in.isTTY && this.in.setRawMode(!1), r.close(), this.emit(this.aborted ?
        "abort" : this.exited ? "exit" : "submit", this.value), this.closed = !0;
      }, this.in.on("keypress", n);
    }
    fire() {
      this.emit("state", {
        value: this.value,
        aborted: !!this.aborted,
        exited: !!this.exited
      });
    }
    bell() {
      this.out.write(Lw);
    }
    render() {
      this.onRender(Uw), this.firstRender && (this.firstRender = !1);
    }
  };
  mf.exports = ka;
});

// ../node_modules/prompts/dist/elements/text.js
var _f = b((mP, vf) => {
  "use strict";
  function gf(e, t, r, i, n, o, a) {
    try {
      var u = e[o](a), l = u.value;
    } catch (c) {
      r(c);
      return;
    }
    u.done ? t(l) : Promise.resolve(l).then(i, n);
  }
  s(gf, "asyncGeneratorStep");
  function yf(e) {
    return function() {
      var t = this, r = arguments;
      return new Promise(function(i, n) {
        var o = e.apply(t, r);
        function a(l) {
          gf(o, i, n, a, u, "next", l);
        }
        s(a, "_next");
        function u(l) {
          gf(o, i, n, a, u, "throw", l);
        }
        s(u, "_throw"), a(void 0);
      });
    };
  }
  s(yf, "_asyncToGenerator");
  var hs = ge(), Ww = wt(), bf = be(), $w = bf.erase, Vi = bf.cursor, ps = et(), Oa = ps.style, Ba = ps.clear, Hw = ps.lines, Vw = ps.figures,
  Pa = class extends Ww {
    static {
      s(this, "TextPrompt");
    }
    constructor(t = {}) {
      super(t), this.transform = Oa.render(t.style), this.scale = this.transform.scale, this.msg = t.message, this.initial = t.initial || "",
      this.validator = t.validate || (() => !0), this.value = "", this.errorMsg = t.error || "Please Enter A Valid Value", this.cursor = +!!this.
      initial, this.cursorOffset = 0, this.clear = Ba("", this.out.columns), this.render();
    }
    set value(t) {
      !t && this.initial ? (this.placeholder = !0, this.rendered = hs.gray(this.transform.render(this.initial))) : (this.placeholder = !1, this.
      rendered = this.transform.render(t)), this._value = t, this.fire();
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
      var t = this;
      return yf(function* () {
        let r = yield t.validator(t.value);
        typeof r == "string" && (t.errorMsg = r, r = !1), t.error = !r;
      })();
    }
    submit() {
      var t = this;
      return yf(function* () {
        if (t.value = t.value || t.initial, t.cursorOffset = 0, t.cursor = t.rendered.length, yield t.validate(), t.error) {
          t.red = !0, t.fire(), t.render();
          return;
        }
        t.done = !0, t.aborted = !1, t.fire(), t.render(), t.out.write(`
`), t.close();
      })();
    }
    next() {
      if (!this.placeholder) return this.bell();
      this.value = this.initial, this.cursor = this.rendered.length, this.fire(), this.render();
    }
    moveCursor(t) {
      this.placeholder || (this.cursor = this.cursor + t, this.cursorOffset += t);
    }
    _(t, r) {
      let i = this.value.slice(0, this.cursor), n = this.value.slice(this.cursor);
      this.value = `${i}${t}${n}`, this.red = !1, this.cursor = this.placeholder ? 0 : i.length + 1, this.render();
    }
    delete() {
      if (this.isCursorAtStart()) return this.bell();
      let t = this.value.slice(0, this.cursor - 1), r = this.value.slice(this.cursor);
      this.value = `${t}${r}`, this.red = !1, this.isCursorAtStart() ? this.cursorOffset = 0 : (this.cursorOffset++, this.moveCursor(-1)), this.
      render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
      let t = this.value.slice(0, this.cursor), r = this.value.slice(this.cursor + 1);
      this.value = `${t}${r}`, this.red = !1, this.isCursorAtEnd() ? this.cursorOffset = 0 : this.cursorOffset++, this.render();
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
      this.closed || (this.firstRender || (this.outputError && this.out.write(Vi.down(Hw(this.outputError, this.out.columns) - 1) + Ba(this.
      outputError, this.out.columns)), this.out.write(Ba(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [Oa.symbol(this.done, this.aborted), hs.bold(this.msg), Oa.delimiter(this.done), this.red ? hs.red(this.rendered) : this.rendered].join(
      " "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((t, r, i) => t + `
${i ? " " : Vw.pointerSmall} ${hs.red().italic(r)}`, "")), this.out.write($w.line + Vi.to(0) + this.outputText + Vi.save + this.outputError +
      Vi.restore + Vi.move(this.cursorOffset, 0)));
    }
  };
  vf.exports = Pa;
});

// ../node_modules/prompts/dist/elements/select.js
var xf = b((yP, Cf) => {
  "use strict";
  var Et = ge(), Zw = wt(), Zi = et(), wf = Zi.style, Ef = Zi.clear, Ds = Zi.figures, zw = Zi.wrap, Gw = Zi.entriesToDisplay, Kw = be(), Yw = Kw.
  cursor, Ia = class extends Zw {
    static {
      s(this, "SelectPrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.hint = t.hint || "- Use arrow-keys. Return to submit.", this.warn = t.warn || "- This option is d\
isabled", this.cursor = t.initial || 0, this.choices = t.choices.map((r, i) => (typeof r == "string" && (r = {
        title: r,
        value: i
      }), {
        title: r && (r.title || r.value || r),
        value: r && (r.value === void 0 ? i : r.value),
        description: r && r.description,
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.optionsPerPage = t.optionsPerPage || 10, this.value = (this.choices[this.cursor] || {}).value, this.clear = Ef("", this.out.
      columns), this.render();
    }
    moveCursor(t) {
      this.cursor = t, this.value = this.choices[t].value, this.fire();
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
    _(t, r) {
      if (t === " ") return this.submit();
    }
    get selection() {
      return this.choices[this.cursor];
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(Yw.hide) : this.out.write(Ef(this.outputText, this.out.columns)), super.render();
      let t = Gw(this.cursor, this.choices.length, this.optionsPerPage), r = t.startIndex, i = t.endIndex;
      if (this.outputText = [wf.symbol(this.done, this.aborted), Et.bold(this.msg), wf.delimiter(!1), this.done ? this.selection.title : this.
      selection.disabled ? Et.yellow(this.warn) : Et.gray(this.hint)].join(" "), !this.done) {
        this.outputText += `
`;
        for (let n = r; n < i; n++) {
          let o, a, u = "", l = this.choices[n];
          n === r && r > 0 ? a = Ds.arrowUp : n === i - 1 && i < this.choices.length ? a = Ds.arrowDown : a = " ", l.disabled ? (o = this.cursor ===
          n ? Et.gray().underline(l.title) : Et.strikethrough().gray(l.title), a = (this.cursor === n ? Et.bold().gray(Ds.pointer) + " " : "\
  ") + a) : (o = this.cursor === n ? Et.cyan().underline(l.title) : l.title, a = (this.cursor === n ? Et.cyan(Ds.pointer) + " " : "  ") + a,
          l.description && this.cursor === n && (u = ` - ${l.description}`, (a.length + o.length + u.length >= this.out.columns || l.description.
          split(/\r?\n/).length > 1) && (u = `
` + zw(l.description, {
            margin: 3,
            width: this.out.columns
          })))), this.outputText += `${a} ${o}${Et.gray(u)}
`;
        }
      }
      this.out.write(this.outputText);
    }
  };
  Cf.exports = Ia;
});

// ../node_modules/prompts/dist/elements/toggle.js
var kf = b((vP, Rf) => {
  "use strict";
  var ms = ge(), Jw = wt(), Tf = et(), Ff = Tf.style, Xw = Tf.clear, Af = be(), Sf = Af.cursor, Qw = Af.erase, Ma = class extends Jw {
    static {
      s(this, "TogglePrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.value = !!t.initial, this.active = t.active || "on", this.inactive = t.inactive || "off", this.initialValue =
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
    _(t, r) {
      if (t === " ")
        this.value = !this.value;
      else if (t === "1")
        this.value = !0;
      else if (t === "0")
        this.value = !1;
      else return this.bell();
      this.render();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Sf.hide) : this.out.write(Xw(this.outputText, this.out.columns)), super.render(), this.
      outputText = [Ff.symbol(this.done, this.aborted), ms.bold(this.msg), Ff.delimiter(this.done), this.value ? this.inactive : ms.cyan().underline(
      this.inactive), ms.gray("/"), this.value ? ms.cyan().underline(this.active) : this.active].join(" "), this.out.write(Qw.line + Sf.to(0) +
      this.outputText));
    }
  };
  Rf.exports = Ma;
});

// ../node_modules/prompts/dist/dateparts/datepart.js
var at = b((wP, Of) => {
  "use strict";
  var ja = class e {
    static {
      s(this, "DatePart");
    }
    constructor({
      token: t,
      date: r,
      parts: i,
      locales: n
    }) {
      this.token = t, this.date = r || /* @__PURE__ */ new Date(), this.parts = i || [this], this.locales = n || {};
    }
    up() {
    }
    down() {
    }
    next() {
      let t = this.parts.indexOf(this);
      return this.parts.find((r, i) => i > t && r instanceof e);
    }
    setTo(t) {
    }
    prev() {
      let t = [].concat(this.parts).reverse(), r = t.indexOf(this);
      return t.find((i, n) => n > r && i instanceof e);
    }
    toString() {
      return String(this.date);
    }
  };
  Of.exports = ja;
});

// ../node_modules/prompts/dist/dateparts/meridiem.js
var Pf = b((CP, Bf) => {
  "use strict";
  var eE = at(), qa = class extends eE {
    static {
      s(this, "Meridiem");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setHours((this.date.getHours() + 12) % 24);
    }
    down() {
      this.up();
    }
    toString() {
      let t = this.date.getHours() > 12 ? "pm" : "am";
      return /\A/.test(this.token) ? t.toUpperCase() : t;
    }
  };
  Bf.exports = qa;
});

// ../node_modules/prompts/dist/dateparts/day.js
var Mf = b((FP, If) => {
  "use strict";
  var tE = at(), rE = /* @__PURE__ */ s((e) => (e = e % 10, e === 1 ? "st" : e === 2 ? "nd" : e === 3 ? "rd" : "th"), "pos"), La = class extends tE {
    static {
      s(this, "Day");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setDate(this.date.getDate() + 1);
    }
    down() {
      this.date.setDate(this.date.getDate() - 1);
    }
    setTo(t) {
      this.date.setDate(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getDate(), r = this.date.getDay();
      return this.token === "DD" ? String(t).padStart(2, "0") : this.token === "Do" ? t + rE(t) : this.token === "d" ? r + 1 : this.token ===
      "ddd" ? this.locales.weekdaysShort[r] : this.token === "dddd" ? this.locales.weekdays[r] : t;
    }
  };
  If.exports = La;
});

// ../node_modules/prompts/dist/dateparts/hours.js
var qf = b((TP, jf) => {
  "use strict";
  var iE = at(), Na = class extends iE {
    static {
      s(this, "Hours");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setHours(this.date.getHours() + 1);
    }
    down() {
      this.date.setHours(this.date.getHours() - 1);
    }
    setTo(t) {
      this.date.setHours(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getHours();
      return /h/.test(this.token) && (t = t % 12 || 12), this.token.length > 1 ? String(t).padStart(2, "0") : t;
    }
  };
  jf.exports = Na;
});

// ../node_modules/prompts/dist/dateparts/milliseconds.js
var Nf = b((RP, Lf) => {
  "use strict";
  var nE = at(), Ua = class extends nE {
    static {
      s(this, "Milliseconds");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setMilliseconds(this.date.getMilliseconds() + 1);
    }
    down() {
      this.date.setMilliseconds(this.date.getMilliseconds() - 1);
    }
    setTo(t) {
      this.date.setMilliseconds(parseInt(t.substr(-this.token.length)));
    }
    toString() {
      return String(this.date.getMilliseconds()).padStart(4, "0").substr(0, this.token.length);
    }
  };
  Lf.exports = Ua;
});

// ../node_modules/prompts/dist/dateparts/minutes.js
var Wf = b((OP, Uf) => {
  "use strict";
  var sE = at(), Wa = class extends sE {
    static {
      s(this, "Minutes");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setMinutes(this.date.getMinutes() + 1);
    }
    down() {
      this.date.setMinutes(this.date.getMinutes() - 1);
    }
    setTo(t) {
      this.date.setMinutes(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getMinutes();
      return this.token.length > 1 ? String(t).padStart(2, "0") : t;
    }
  };
  Uf.exports = Wa;
});

// ../node_modules/prompts/dist/dateparts/month.js
var Hf = b((PP, $f) => {
  "use strict";
  var oE = at(), $a = class extends oE {
    static {
      s(this, "Month");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setMonth(this.date.getMonth() + 1);
    }
    down() {
      this.date.setMonth(this.date.getMonth() - 1);
    }
    setTo(t) {
      t = parseInt(t.substr(-2)) - 1, this.date.setMonth(t < 0 ? 0 : t);
    }
    toString() {
      let t = this.date.getMonth(), r = this.token.length;
      return r === 2 ? String(t + 1).padStart(2, "0") : r === 3 ? this.locales.monthsShort[t] : r === 4 ? this.locales.months[t] : String(t +
      1);
    }
  };
  $f.exports = $a;
});

// ../node_modules/prompts/dist/dateparts/seconds.js
var Zf = b((MP, Vf) => {
  "use strict";
  var aE = at(), Ha = class extends aE {
    static {
      s(this, "Seconds");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setSeconds(this.date.getSeconds() + 1);
    }
    down() {
      this.date.setSeconds(this.date.getSeconds() - 1);
    }
    setTo(t) {
      this.date.setSeconds(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getSeconds();
      return this.token.length > 1 ? String(t).padStart(2, "0") : t;
    }
  };
  Vf.exports = Ha;
});

// ../node_modules/prompts/dist/dateparts/year.js
var Gf = b((qP, zf) => {
  "use strict";
  var uE = at(), Va = class extends uE {
    static {
      s(this, "Year");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setFullYear(this.date.getFullYear() + 1);
    }
    down() {
      this.date.setFullYear(this.date.getFullYear() - 1);
    }
    setTo(t) {
      this.date.setFullYear(t.substr(-4));
    }
    toString() {
      let t = String(this.date.getFullYear()).padStart(4, "0");
      return this.token.length === 2 ? t.substr(-2) : t;
    }
  };
  zf.exports = Va;
});

// ../node_modules/prompts/dist/dateparts/index.js
var Yf = b((NP, Kf) => {
  "use strict";
  Kf.exports = {
    DatePart: at(),
    Meridiem: Pf(),
    Day: Mf(),
    Hours: qf(),
    Milliseconds: Nf(),
    Minutes: Wf(),
    Month: Hf(),
    Seconds: Zf(),
    Year: Gf()
  };
});

// ../node_modules/prompts/dist/elements/date.js
var oh = b((UP, sh) => {
  "use strict";
  function Jf(e, t, r, i, n, o, a) {
    try {
      var u = e[o](a), l = u.value;
    } catch (c) {
      r(c);
      return;
    }
    u.done ? t(l) : Promise.resolve(l).then(i, n);
  }
  s(Jf, "asyncGeneratorStep");
  function Xf(e) {
    return function() {
      var t = this, r = arguments;
      return new Promise(function(i, n) {
        var o = e.apply(t, r);
        function a(l) {
          Jf(o, i, n, a, u, "next", l);
        }
        s(a, "_next");
        function u(l) {
          Jf(o, i, n, a, u, "throw", l);
        }
        s(u, "_throw"), a(void 0);
      });
    };
  }
  s(Xf, "_asyncToGenerator");
  var Za = ge(), lE = wt(), Ga = et(), Qf = Ga.style, eh = Ga.clear, cE = Ga.figures, nh = be(), dE = nh.erase, th = nh.cursor, Ct = Yf(), rh = Ct.
  DatePart, fE = Ct.Meridiem, hE = Ct.Day, pE = Ct.Hours, DE = Ct.Milliseconds, mE = Ct.Minutes, gE = Ct.Month, yE = Ct.Seconds, bE = Ct.Year,
  vE = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g, ih = {
    1: ({
      token: e
    }) => e.replace(/\\(.)/g, "$1"),
    2: (e) => new hE(e),
    // Day // TODO
    3: (e) => new gE(e),
    // Month
    4: (e) => new bE(e),
    // Year
    5: (e) => new fE(e),
    // AM/PM // TODO (special)
    6: (e) => new pE(e),
    // Hours
    7: (e) => new mE(e),
    // Minutes
    8: (e) => new yE(e),
    // Seconds
    9: (e) => new DE(e)
    // Fractional seconds
  }, _E = {
    months: "January,February,March,April,May,June,July,August,September,October,November,December".split(","),
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
    weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
    weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",")
  }, za = class extends lE {
    static {
      s(this, "DatePrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.cursor = 0, this.typed = "", this.locales = Object.assign(_E, t.locales), this._date = t.initial ||
      /* @__PURE__ */ new Date(), this.errorMsg = t.error || "Please Enter A Valid Value", this.validator = t.validate || (() => !0), this.mask =
      t.mask || "YYYY-MM-DD HH:mm:ss", this.clear = eh("", this.out.columns), this.render();
    }
    get value() {
      return this.date;
    }
    get date() {
      return this._date;
    }
    set date(t) {
      t && this._date.setTime(t.getTime());
    }
    set mask(t) {
      let r;
      for (this.parts = []; r = vE.exec(t); ) {
        let n = r.shift(), o = r.findIndex((a) => a != null);
        this.parts.push(o in ih ? ih[o]({
          token: r[o] || n,
          date: this.date,
          parts: this.parts,
          locales: this.locales
        }) : r[o] || n);
      }
      let i = this.parts.reduce((n, o) => (typeof o == "string" && typeof n[n.length - 1] == "string" ? n[n.length - 1] += o : n.push(o), n),
      []);
      this.parts.splice(0), this.parts.push(...i), this.reset();
    }
    moveCursor(t) {
      this.typed = "", this.cursor = t, this.fire();
    }
    reset() {
      this.moveCursor(this.parts.findIndex((t) => t instanceof rh)), this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    validate() {
      var t = this;
      return Xf(function* () {
        let r = yield t.validator(t.value);
        typeof r == "string" && (t.errorMsg = r, r = !1), t.error = !r;
      })();
    }
    submit() {
      var t = this;
      return Xf(function* () {
        if (yield t.validate(), t.error) {
          t.color = "red", t.fire(), t.render();
          return;
        }
        t.done = !0, t.aborted = !1, t.fire(), t.render(), t.out.write(`
`), t.close();
      })();
    }
    up() {
      this.typed = "", this.parts[this.cursor].up(), this.render();
    }
    down() {
      this.typed = "", this.parts[this.cursor].down(), this.render();
    }
    left() {
      let t = this.parts[this.cursor].prev();
      if (t == null) return this.bell();
      this.moveCursor(this.parts.indexOf(t)), this.render();
    }
    right() {
      let t = this.parts[this.cursor].next();
      if (t == null) return this.bell();
      this.moveCursor(this.parts.indexOf(t)), this.render();
    }
    next() {
      let t = this.parts[this.cursor].next();
      this.moveCursor(t ? this.parts.indexOf(t) : this.parts.findIndex((r) => r instanceof rh)), this.render();
    }
    _(t) {
      /\d/.test(t) && (this.typed += t, this.parts[this.cursor].setTo(this.typed), this.render());
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(th.hide) : this.out.write(eh(this.outputText, this.out.columns)), super.render(), this.
      outputText = [Qf.symbol(this.done, this.aborted), Za.bold(this.msg), Qf.delimiter(!1), this.parts.reduce((t, r, i) => t.concat(i === this.
      cursor && !this.done ? Za.cyan().underline(r.toString()) : r), []).join("")].join(" "), this.error && (this.outputText += this.errorMsg.
      split(`
`).reduce((t, r, i) => t + `
${i ? " " : cE.pointerSmall} ${Za.red().italic(r)}`, "")), this.out.write(dE.line + th.to(0) + this.outputText));
    }
  };
  sh.exports = za;
});

// ../node_modules/prompts/dist/elements/number.js
var hh = b(($P, fh) => {
  "use strict";
  function ah(e, t, r, i, n, o, a) {
    try {
      var u = e[o](a), l = u.value;
    } catch (c) {
      r(c);
      return;
    }
    u.done ? t(l) : Promise.resolve(l).then(i, n);
  }
  s(ah, "asyncGeneratorStep");
  function uh(e) {
    return function() {
      var t = this, r = arguments;
      return new Promise(function(i, n) {
        var o = e.apply(t, r);
        function a(l) {
          ah(o, i, n, a, u, "next", l);
        }
        s(a, "_next");
        function u(l) {
          ah(o, i, n, a, u, "throw", l);
        }
        s(u, "_throw"), a(void 0);
      });
    };
  }
  s(uh, "_asyncToGenerator");
  var gs = ge(), wE = wt(), dh = be(), ys = dh.cursor, EE = dh.erase, bs = et(), Ka = bs.style, CE = bs.figures, lh = bs.clear, xE = bs.lines,
  FE = /[0-9]/, Ya = /* @__PURE__ */ s((e) => e !== void 0, "isDef"), ch = /* @__PURE__ */ s((e, t) => {
    let r = Math.pow(10, t);
    return Math.round(e * r) / r;
  }, "round"), Ja = class extends wE {
    static {
      s(this, "NumberPrompt");
    }
    constructor(t = {}) {
      super(t), this.transform = Ka.render(t.style), this.msg = t.message, this.initial = Ya(t.initial) ? t.initial : "", this.float = !!t.float,
      this.round = t.round || 2, this.inc = t.increment || 1, this.min = Ya(t.min) ? t.min : -1 / 0, this.max = Ya(t.max) ? t.max : 1 / 0, this.
      errorMsg = t.error || "Please Enter A Valid Value", this.validator = t.validate || (() => !0), this.color = "cyan", this.value = "", this.
      typed = "", this.lastHit = 0, this.render();
    }
    set value(t) {
      !t && t !== 0 ? (this.placeholder = !0, this.rendered = gs.gray(this.transform.render(`${this.initial}`)), this._value = "") : (this.placeholder =
      !1, this.rendered = this.transform.render(`${ch(t, this.round)}`), this._value = ch(t, this.round)), this.fire();
    }
    get value() {
      return this._value;
    }
    parse(t) {
      return this.float ? parseFloat(t) : parseInt(t);
    }
    valid(t) {
      return t === "-" || t === "." && this.float || FE.test(t);
    }
    reset() {
      this.typed = "", this.value = "", this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      let t = this.value;
      this.value = t !== "" ? t : this.initial, this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`\

`), this.close();
    }
    validate() {
      var t = this;
      return uh(function* () {
        let r = yield t.validator(t.value);
        typeof r == "string" && (t.errorMsg = r, r = !1), t.error = !r;
      })();
    }
    submit() {
      var t = this;
      return uh(function* () {
        if (yield t.validate(), t.error) {
          t.color = "red", t.fire(), t.render();
          return;
        }
        let r = t.value;
        t.value = r !== "" ? r : t.initial, t.done = !0, t.aborted = !1, t.error = !1, t.fire(), t.render(), t.out.write(`
`), t.close();
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
      let t = this.value.toString();
      if (t.length === 0) return this.bell();
      this.value = this.parse(t = t.slice(0, -1)) || "", this.value !== "" && this.value < this.min && (this.value = this.min), this.color =
      "cyan", this.fire(), this.render();
    }
    next() {
      this.value = this.initial, this.fire(), this.render();
    }
    _(t, r) {
      if (!this.valid(t)) return this.bell();
      let i = Date.now();
      if (i - this.lastHit > 1e3 && (this.typed = ""), this.typed += t, this.lastHit = i, this.color = "cyan", t === ".") return this.fire();
      this.value = Math.min(this.parse(this.typed), this.max), this.value > this.max && (this.value = this.max), this.value < this.min && (this.
      value = this.min), this.fire(), this.render();
    }
    render() {
      this.closed || (this.firstRender || (this.outputError && this.out.write(ys.down(xE(this.outputError, this.out.columns) - 1) + lh(this.
      outputError, this.out.columns)), this.out.write(lh(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [Ka.symbol(this.done, this.aborted), gs.bold(this.msg), Ka.delimiter(this.done), !this.done || !this.done && !this.placeholder ? gs[this.
      color]().underline(this.rendered) : this.rendered].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((t, r, i) => t + `
${i ? " " : CE.pointerSmall} ${gs.red().italic(r)}`, "")), this.out.write(EE.line + ys.to(0) + this.outputText + ys.save + this.outputError +
      ys.restore));
    }
  };
  fh.exports = Ja;
});

// ../node_modules/prompts/dist/elements/multiselect.js
var Qa = b((VP, mh) => {
  "use strict";
  var ut = ge(), SE = be(), TE = SE.cursor, AE = wt(), zi = et(), ph = zi.clear, Zt = zi.figures, Dh = zi.style, RE = zi.wrap, kE = zi.entriesToDisplay,
  Xa = class extends AE {
    static {
      s(this, "MultiselectPrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.cursor = t.cursor || 0, this.scrollIndex = t.cursor || 0, this.hint = t.hint || "", this.warn = t.
      warn || "- This option is disabled -", this.minSelected = t.min, this.showMinError = !1, this.maxChoices = t.max, this.instructions = t.
      instructions, this.optionsPerPage = t.optionsPerPage || 10, this.value = t.choices.map((r, i) => (typeof r == "string" && (r = {
        title: r,
        value: i
      }), {
        title: r && (r.title || r.value || r),
        description: r && r.description,
        value: r && (r.value === void 0 ? i : r.value),
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.clear = ph("", this.out.columns), t.overrideRender || this.render();
    }
    reset() {
      this.value.map((t) => !t.selected), this.cursor = 0, this.fire(), this.render();
    }
    selected() {
      return this.value.filter((t) => t.selected);
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      let t = this.value.filter((r) => r.selected);
      this.minSelected && t.length < this.minSelected ? (this.showMinError = !0, this.render()) : (this.done = !0, this.aborted = !1, this.fire(),
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
      if (this.value.filter((t) => t.selected).length >= this.maxChoices) return this.bell();
      this.value[this.cursor].selected = !0, this.render();
    }
    handleSpaceToggle() {
      let t = this.value[this.cursor];
      if (t.selected)
        t.selected = !1, this.render();
      else {
        if (t.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        t.selected = !0, this.render();
      }
    }
    toggleAll() {
      if (this.maxChoices !== void 0 || this.value[this.cursor].disabled)
        return this.bell();
      let t = !this.value[this.cursor].selected;
      this.value.filter((r) => !r.disabled).forEach((r) => r.selected = t), this.render();
    }
    _(t, r) {
      if (t === " ")
        this.handleSpaceToggle();
      else if (t === "a")
        this.toggleAll();
      else
        return this.bell();
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${Zt.arrowUp}/${Zt.arrowDown}: Highlight option
    ${Zt.arrowLeft}/${Zt.arrowRight}/[space]: Toggle selection
` + (this.maxChoices === void 0 ? `    a: Toggle all
` : "") + "    enter/return: Complete answer" : "";
    }
    renderOption(t, r, i, n) {
      let o = (r.selected ? ut.green(Zt.radioOn) : Zt.radioOff) + " " + n + " ", a, u;
      return r.disabled ? a = t === i ? ut.gray().underline(r.title) : ut.strikethrough().gray(r.title) : (a = t === i ? ut.cyan().underline(
      r.title) : r.title, t === i && r.description && (u = ` - ${r.description}`, (o.length + a.length + u.length >= this.out.columns || r.description.
      split(/\r?\n/).length > 1) && (u = `
` + RE(r.description, {
        margin: o.length,
        width: this.out.columns
      })))), o + a + ut.gray(u || "");
    }
    // shared with autocompleteMultiselect
    paginateOptions(t) {
      if (t.length === 0)
        return ut.red("No matches for this query.");
      let r = kE(this.cursor, t.length, this.optionsPerPage), i = r.startIndex, n = r.endIndex, o, a = [];
      for (let u = i; u < n; u++)
        u === i && i > 0 ? o = Zt.arrowUp : u === n - 1 && n < t.length ? o = Zt.arrowDown : o = " ", a.push(this.renderOption(this.cursor, t[u],
        u, o));
      return `
` + a.join(`
`);
    }
    // shared with autocomleteMultiselect
    renderOptions(t) {
      return this.done ? "" : this.paginateOptions(t);
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let t = [ut.gray(this.hint), this.renderInstructions()];
      return this.value[this.cursor].disabled && t.push(ut.yellow(this.warn)), t.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(TE.hide), super.render();
      let t = [Dh.symbol(this.done, this.aborted), ut.bold(this.msg), Dh.delimiter(!1), this.renderDoneOrInstructions()].join(" ");
      this.showMinError && (t += ut.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), t += this.renderOptions(
      this.value), this.out.write(this.clear + t), this.clear = ph(t, this.out.columns);
    }
  };
  mh.exports = Xa;
});

// ../node_modules/prompts/dist/elements/autocomplete.js
var Eh = b((zP, wh) => {
  "use strict";
  function gh(e, t, r, i, n, o, a) {
    try {
      var u = e[o](a), l = u.value;
    } catch (c) {
      r(c);
      return;
    }
    u.done ? t(l) : Promise.resolve(l).then(i, n);
  }
  s(gh, "asyncGeneratorStep");
  function OE(e) {
    return function() {
      var t = this, r = arguments;
      return new Promise(function(i, n) {
        var o = e.apply(t, r);
        function a(l) {
          gh(o, i, n, a, u, "next", l);
        }
        s(a, "_next");
        function u(l) {
          gh(o, i, n, a, u, "throw", l);
        }
        s(u, "_throw"), a(void 0);
      });
    };
  }
  s(OE, "_asyncToGenerator");
  var Gi = ge(), BE = wt(), _h = be(), PE = _h.erase, yh = _h.cursor, Ki = et(), eu = Ki.style, bh = Ki.clear, tu = Ki.figures, IE = Ki.wrap,
  ME = Ki.entriesToDisplay, vh = /* @__PURE__ */ s((e, t) => e[t] && (e[t].value || e[t].title || e[t]), "getVal"), jE = /* @__PURE__ */ s((e, t) => e[t] &&
  (e[t].title || e[t].value || e[t]), "getTitle"), qE = /* @__PURE__ */ s((e, t) => {
    let r = e.findIndex((i) => i.value === t || i.title === t);
    return r > -1 ? r : void 0;
  }, "getIndex"), ru = class extends BE {
    static {
      s(this, "AutocompletePrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.suggest = t.suggest, this.choices = t.choices, this.initial = typeof t.initial == "number" ? t.initial :
      qE(t.choices, t.initial), this.select = this.initial || t.cursor || 0, this.i18n = {
        noMatches: t.noMatches || "no matches found"
      }, this.fallback = t.fallback || this.initial, this.clearFirst = t.clearFirst || !1, this.suggestions = [], this.input = "", this.limit =
      t.limit || 10, this.cursor = 0, this.transform = eu.render(t.style), this.scale = this.transform.scale, this.render = this.render.bind(
      this), this.complete = this.complete.bind(this), this.clear = bh("", this.out.columns), this.complete(this.render), this.render();
    }
    set fallback(t) {
      this._fb = Number.isSafeInteger(parseInt(t)) ? parseInt(t) : t;
    }
    get fallback() {
      let t;
      return typeof this._fb == "number" ? t = this.choices[this._fb] : typeof this._fb == "string" && (t = {
        title: this._fb
      }), t || this._fb || {
        title: this.i18n.noMatches
      };
    }
    moveSelect(t) {
      this.select = t, this.suggestions.length > 0 ? this.value = vh(this.suggestions, t) : this.value = this.fallback.value, this.fire();
    }
    complete(t) {
      var r = this;
      return OE(function* () {
        let i = r.completing = r.suggest(r.input, r.choices), n = yield i;
        if (r.completing !== i) return;
        r.suggestions = n.map((a, u, l) => ({
          title: jE(l, u),
          value: vh(l, u),
          description: a.description
        })), r.completing = !1;
        let o = Math.max(n.length - 1, 0);
        r.moveSelect(Math.min(o, r.select)), t && t();
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
    _(t, r) {
      let i = this.input.slice(0, this.cursor), n = this.input.slice(this.cursor);
      this.input = `${i}${t}${n}`, this.cursor = i.length + 1, this.complete(this.render), this.render();
    }
    delete() {
      if (this.cursor === 0) return this.bell();
      let t = this.input.slice(0, this.cursor - 1), r = this.input.slice(this.cursor);
      this.input = `${t}${r}`, this.complete(this.render), this.cursor = this.cursor - 1, this.render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length) return this.bell();
      let t = this.input.slice(0, this.cursor), r = this.input.slice(this.cursor + 1);
      this.input = `${t}${r}`, this.complete(this.render), this.render();
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
    renderOption(t, r, i, n) {
      let o, a = i ? tu.arrowUp : n ? tu.arrowDown : " ", u = r ? Gi.cyan().underline(t.title) : t.title;
      return a = (r ? Gi.cyan(tu.pointer) + " " : "  ") + a, t.description && (o = ` - ${t.description}`, (a.length + u.length + o.length >=
      this.out.columns || t.description.split(/\r?\n/).length > 1) && (o = `
` + IE(t.description, {
        margin: 3,
        width: this.out.columns
      }))), a + " " + u + Gi.gray(o || "");
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(yh.hide) : this.out.write(bh(this.outputText, this.out.columns)), super.render();
      let t = ME(this.select, this.choices.length, this.limit), r = t.startIndex, i = t.endIndex;
      if (this.outputText = [eu.symbol(this.done, this.aborted, this.exited), Gi.bold(this.msg), eu.delimiter(this.completing), this.done &&
      this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)].join(" "), !this.
      done) {
        let n = this.suggestions.slice(r, i).map((o, a) => this.renderOption(o, this.select === a + r, a === 0 && r > 0, a + r === i - 1 && i <
        this.choices.length)).join(`
`);
        this.outputText += `
` + (n || Gi.gray(this.fallback.title));
      }
      this.out.write(PE.line + yh.to(0) + this.outputText);
    }
  };
  wh.exports = ru;
});

// ../node_modules/prompts/dist/elements/autocompleteMultiselect.js
var Sh = b((KP, Fh) => {
  "use strict";
  var xt = ge(), LE = be(), NE = LE.cursor, UE = Qa(), nu = et(), Ch = nu.clear, xh = nu.style, Xr = nu.figures, iu = class extends UE {
    static {
      s(this, "AutocompleteMultiselectPrompt");
    }
    constructor(t = {}) {
      t.overrideRender = !0, super(t), this.inputValue = "", this.clear = Ch("", this.out.columns), this.filteredOptions = this.value, this.
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
      if (this.value.filter((t) => t.selected).length >= this.maxChoices) return this.bell();
      this.filteredOptions[this.cursor].selected = !0, this.render();
    }
    delete() {
      this.inputValue.length && (this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1), this.updateFilteredOptions());
    }
    updateFilteredOptions() {
      let t = this.filteredOptions[this.cursor];
      this.filteredOptions = this.value.filter((i) => this.inputValue ? !!(typeof i.title == "string" && i.title.toLowerCase().includes(this.
      inputValue.toLowerCase()) || typeof i.value == "string" && i.value.toLowerCase().includes(this.inputValue.toLowerCase())) : !0);
      let r = this.filteredOptions.findIndex((i) => i === t);
      this.cursor = r < 0 ? 0 : r, this.render();
    }
    handleSpaceToggle() {
      let t = this.filteredOptions[this.cursor];
      if (t.selected)
        t.selected = !1, this.render();
      else {
        if (t.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        t.selected = !0, this.render();
      }
    }
    handleInputChange(t) {
      this.inputValue = this.inputValue + t, this.updateFilteredOptions();
    }
    _(t, r) {
      t === " " ? this.handleSpaceToggle() : this.handleInputChange(t);
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${Xr.arrowUp}/${Xr.arrowDown}: Highlight option
    ${Xr.arrowLeft}/${Xr.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
` : "";
    }
    renderCurrentInput() {
      return `
Filtered results for: ${this.inputValue ? this.inputValue : xt.gray("Enter something to filter")}
`;
    }
    renderOption(t, r, i) {
      let n;
      return r.disabled ? n = t === i ? xt.gray().underline(r.title) : xt.strikethrough().gray(r.title) : n = t === i ? xt.cyan().underline(
      r.title) : r.title, (r.selected ? xt.green(Xr.radioOn) : Xr.radioOff) + "  " + n;
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let t = [xt.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
      return this.filteredOptions.length && this.filteredOptions[this.cursor].disabled && t.push(xt.yellow(this.warn)), t.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(NE.hide), super.render();
      let t = [xh.symbol(this.done, this.aborted), xt.bold(this.msg), xh.delimiter(!1), this.renderDoneOrInstructions()].join(" ");
      this.showMinError && (t += xt.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), t += this.renderOptions(
      this.filteredOptions), this.out.write(this.clear + t), this.clear = Ch(t, this.out.columns);
    }
  };
  Fh.exports = iu;
});

// ../node_modules/prompts/dist/elements/confirm.js
var Ph = b((JP, Bh) => {
  "use strict";
  var Th = ge(), WE = wt(), kh = et(), Ah = kh.style, $E = kh.clear, Oh = be(), HE = Oh.erase, Rh = Oh.cursor, su = class extends WE {
    static {
      s(this, "ConfirmPrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.value = t.initial, this.initialValue = !!t.initial, this.yesMsg = t.yes || "yes", this.yesOption =
      t.yesOption || "(Y/n)", this.noMsg = t.no || "no", this.noOption = t.noOption || "(y/N)", this.render();
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
    _(t, r) {
      return t.toLowerCase() === "y" ? (this.value = !0, this.submit()) : t.toLowerCase() === "n" ? (this.value = !1, this.submit()) : this.
      bell();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Rh.hide) : this.out.write($E(this.outputText, this.out.columns)), super.render(), this.
      outputText = [Ah.symbol(this.done, this.aborted), Th.bold(this.msg), Ah.delimiter(this.done), this.done ? this.value ? this.yesMsg : this.
      noMsg : Th.gray(this.initialValue ? this.yesOption : this.noOption)].join(" "), this.out.write(HE.line + Rh.to(0) + this.outputText));
    }
  };
  Bh.exports = su;
});

// ../node_modules/prompts/dist/elements/index.js
var Mh = b((QP, Ih) => {
  "use strict";
  Ih.exports = {
    TextPrompt: _f(),
    SelectPrompt: xf(),
    TogglePrompt: kf(),
    DatePrompt: oh(),
    NumberPrompt: hh(),
    MultiselectPrompt: Qa(),
    AutocompletePrompt: Eh(),
    AutocompleteMultiselectPrompt: Sh(),
    ConfirmPrompt: Ph()
  };
});

// ../node_modules/prompts/dist/prompts.js
var qh = b((jh) => {
  "use strict";
  var Ne = jh, VE = Mh(), vs = /* @__PURE__ */ s((e) => e, "noop");
  function lt(e, t, r = {}) {
    return new Promise((i, n) => {
      let o = new VE[e](t), a = r.onAbort || vs, u = r.onSubmit || vs, l = r.onExit || vs;
      o.on("state", t.onState || vs), o.on("submit", (c) => i(u(c))), o.on("exit", (c) => i(l(c))), o.on("abort", (c) => n(a(c)));
    });
  }
  s(lt, "toPrompt");
  Ne.text = (e) => lt("TextPrompt", e);
  Ne.password = (e) => (e.style = "password", Ne.text(e));
  Ne.invisible = (e) => (e.style = "invisible", Ne.text(e));
  Ne.number = (e) => lt("NumberPrompt", e);
  Ne.date = (e) => lt("DatePrompt", e);
  Ne.confirm = (e) => lt("ConfirmPrompt", e);
  Ne.list = (e) => {
    let t = e.separator || ",";
    return lt("TextPrompt", e, {
      onSubmit: /* @__PURE__ */ s((r) => r.split(t).map((i) => i.trim()), "onSubmit")
    });
  };
  Ne.toggle = (e) => lt("TogglePrompt", e);
  Ne.select = (e) => lt("SelectPrompt", e);
  Ne.multiselect = (e) => {
    e.choices = [].concat(e.choices || []);
    let t = /* @__PURE__ */ s((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return lt("MultiselectPrompt", e, {
      onAbort: t,
      onSubmit: t
    });
  };
  Ne.autocompleteMultiselect = (e) => {
    e.choices = [].concat(e.choices || []);
    let t = /* @__PURE__ */ s((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return lt("AutocompleteMultiselectPrompt", e, {
      onAbort: t,
      onSubmit: t
    });
  };
  var ZE = /* @__PURE__ */ s((e, t) => Promise.resolve(t.filter((r) => r.title.slice(0, e.length).toLowerCase() === e.toLowerCase())), "byTi\
tle");
  Ne.autocomplete = (e) => (e.suggest = e.suggest || ZE, e.choices = [].concat(e.choices || []), lt("AutocompletePrompt", e));
});

// ../node_modules/prompts/dist/index.js
var Zh = b((rI, Vh) => {
  "use strict";
  function Lh(e, t) {
    var r = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var i = Object.getOwnPropertySymbols(e);
      t && (i = i.filter(function(n) {
        return Object.getOwnPropertyDescriptor(e, n).enumerable;
      })), r.push.apply(r, i);
    }
    return r;
  }
  s(Lh, "ownKeys");
  function Nh(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t] != null ? arguments[t] : {};
      t % 2 ? Lh(Object(r), !0).forEach(function(i) {
        zE(e, i, r[i]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Lh(Object(r)).forEach(function(i) {
        Object.defineProperty(e, i, Object.getOwnPropertyDescriptor(r, i));
      });
    }
    return e;
  }
  s(Nh, "_objectSpread");
  function zE(e, t, r) {
    return t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
  }
  s(zE, "_defineProperty");
  function GE(e, t) {
    var r = typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
    if (!r) {
      if (Array.isArray(e) || (r = KE(e)) || t && e && typeof e.length == "number") {
        r && (e = r);
        var i = 0, n = /* @__PURE__ */ s(function() {
        }, "F");
        return { s: n, n: /* @__PURE__ */ s(function() {
          return i >= e.length ? { done: !0 } : { done: !1, value: e[i++] };
        }, "n"), e: /* @__PURE__ */ s(function(c) {
          throw c;
        }, "e"), f: n };
      }
      throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    var o = !0, a = !1, u;
    return { s: /* @__PURE__ */ s(function() {
      r = r.call(e);
    }, "s"), n: /* @__PURE__ */ s(function() {
      var c = r.next();
      return o = c.done, c;
    }, "n"), e: /* @__PURE__ */ s(function(c) {
      a = !0, u = c;
    }, "e"), f: /* @__PURE__ */ s(function() {
      try {
        !o && r.return != null && r.return();
      } finally {
        if (a) throw u;
      }
    }, "f") };
  }
  s(GE, "_createForOfIteratorHelper");
  function KE(e, t) {
    if (e) {
      if (typeof e == "string") return Uh(e, t);
      var r = Object.prototype.toString.call(e).slice(8, -1);
      if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set") return Array.from(e);
      if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) return Uh(e, t);
    }
  }
  s(KE, "_unsupportedIterableToArray");
  function Uh(e, t) {
    (t == null || t > e.length) && (t = e.length);
    for (var r = 0, i = new Array(t); r < t; r++) i[r] = e[r];
    return i;
  }
  s(Uh, "_arrayLikeToArray");
  function Wh(e, t, r, i, n, o, a) {
    try {
      var u = e[o](a), l = u.value;
    } catch (c) {
      r(c);
      return;
    }
    u.done ? t(l) : Promise.resolve(l).then(i, n);
  }
  s(Wh, "asyncGeneratorStep");
  function $h(e) {
    return function() {
      var t = this, r = arguments;
      return new Promise(function(i, n) {
        var o = e.apply(t, r);
        function a(l) {
          Wh(o, i, n, a, u, "next", l);
        }
        s(a, "_next");
        function u(l) {
          Wh(o, i, n, a, u, "throw", l);
        }
        s(u, "_throw"), a(void 0);
      });
    };
  }
  s($h, "_asyncToGenerator");
  var ou = qh(), YE = ["suggest", "format", "onState", "validate", "onRender", "type"], Hh = /* @__PURE__ */ s(() => {
  }, "noop");
  function zt() {
    return au.apply(this, arguments);
  }
  s(zt, "prompt");
  function au() {
    return au = $h(function* (e = [], {
      onSubmit: t = Hh,
      onCancel: r = Hh
    } = {}) {
      let i = {}, n = zt._override || {};
      e = [].concat(e);
      let o, a, u, l, c, d, p = /* @__PURE__ */ function() {
        var _ = $h(function* (C, x, w = !1) {
          if (!(!w && C.validate && C.validate(x) !== !0))
            return C.format ? yield C.format(x, i) : x;
        });
        return /* @__PURE__ */ s(function(x, w) {
          return _.apply(this, arguments);
        }, "getFormattedAnswer");
      }();
      var h = GE(e), f;
      try {
        for (h.s(); !(f = h.n()).done; ) {
          a = f.value;
          var g = a;
          if (l = g.name, c = g.type, typeof c == "function" && (c = yield c(o, Nh({}, i), a), a.type = c), !!c) {
            for (let _ in a) {
              if (YE.includes(_)) continue;
              let C = a[_];
              a[_] = typeof C == "function" ? yield C(o, Nh({}, i), d) : C;
            }
            if (d = a, typeof a.message != "string")
              throw new Error("prompt message is required");
            var E = a;
            if (l = E.name, c = E.type, ou[c] === void 0)
              throw new Error(`prompt type (${c}) is not defined`);
            if (n[a.name] !== void 0 && (o = yield p(a, n[a.name]), o !== void 0)) {
              i[l] = o;
              continue;
            }
            try {
              o = zt._injected ? JE(zt._injected, a.initial) : yield ou[c](a), i[l] = o = yield p(a, o, !0), u = yield t(a, o, i);
            } catch {
              u = !(yield r(a, i));
            }
            if (u) return i;
          }
        }
      } catch (_) {
        h.e(_);
      } finally {
        h.f();
      }
      return i;
    }), au.apply(this, arguments);
  }
  s(au, "_prompt");
  function JE(e, t) {
    let r = e.shift();
    if (r instanceof Error)
      throw r;
    return r === void 0 ? t : r;
  }
  s(JE, "getInjectedAnswer");
  function XE(e) {
    zt._injected = (zt._injected || []).concat(e);
  }
  s(XE, "inject");
  function QE(e) {
    zt._override = Object.assign({}, e);
  }
  s(QE, "override");
  Vh.exports = Object.assign(zt, {
    prompt: zt,
    prompts: ou,
    inject: XE,
    override: QE
  });
});

// ../node_modules/prompts/lib/util/action.js
var Gh = b((nI, zh) => {
  "use strict";
  zh.exports = (e, t) => {
    if (!(e.meta && e.name !== "escape")) {
      if (e.ctrl) {
        if (e.name === "a") return "first";
        if (e.name === "c" || e.name === "d") return "abort";
        if (e.name === "e") return "last";
        if (e.name === "g") return "reset";
      }
      if (t) {
        if (e.name === "j") return "down";
        if (e.name === "k") return "up";
      }
      return e.name === "return" || e.name === "enter" ? "submit" : e.name === "backspace" ? "delete" : e.name === "delete" ? "deleteForward" :
      e.name === "abort" ? "abort" : e.name === "escape" ? "exit" : e.name === "tab" ? "next" : e.name === "pagedown" ? "nextPage" : e.name ===
      "pageup" ? "prevPage" : e.name === "home" ? "home" : e.name === "end" ? "end" : e.name === "up" ? "up" : e.name === "down" ? "down" : e.
      name === "right" ? "right" : e.name === "left" ? "left" : !1;
    }
  };
});

// ../node_modules/prompts/lib/util/strip.js
var _s = b((sI, Kh) => {
  "use strict";
  Kh.exports = (e) => {
    let t = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
    ].join("|"), r = new RegExp(t, "g");
    return typeof e == "string" ? e.replace(r, "") : e;
  };
});

// ../node_modules/prompts/lib/util/clear.js
var Xh = b((oI, Jh) => {
  "use strict";
  var eC = _s(), { erase: Yh, cursor: tC } = be(), rC = /* @__PURE__ */ s((e) => [...eC(e)].length, "width");
  Jh.exports = function(e, t) {
    if (!t) return Yh.line + tC.to(0);
    let r = 0, i = e.split(/\r?\n/);
    for (let n of i)
      r += 1 + Math.floor(Math.max(rC(n) - 1, 0) / t);
    return Yh.lines(r);
  };
});

// ../node_modules/prompts/lib/util/figures.js
var uu = b((uI, Qh) => {
  "use strict";
  var Yi = {
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
  }, iC = {
    arrowUp: Yi.arrowUp,
    arrowDown: Yi.arrowDown,
    arrowLeft: Yi.arrowLeft,
    arrowRight: Yi.arrowRight,
    radioOn: "(*)",
    radioOff: "( )",
    tick: "\u221A",
    cross: "\xD7",
    ellipsis: "...",
    pointerSmall: "\xBB",
    line: "\u2500",
    pointer: ">"
  }, nC = process.platform === "win32" ? iC : Yi;
  Qh.exports = nC;
});

// ../node_modules/prompts/lib/util/style.js
var tp = b((lI, ep) => {
  "use strict";
  var Qr = ge(), fr = uu(), lu = Object.freeze({
    password: { scale: 1, render: /* @__PURE__ */ s((e) => "*".repeat(e.length), "render") },
    emoji: { scale: 2, render: /* @__PURE__ */ s((e) => "\u{1F603}".repeat(e.length), "render") },
    invisible: { scale: 0, render: /* @__PURE__ */ s((e) => "", "render") },
    default: { scale: 1, render: /* @__PURE__ */ s((e) => `${e}`, "render") }
  }), sC = /* @__PURE__ */ s((e) => lu[e] || lu.default, "render"), Ji = Object.freeze({
    aborted: Qr.red(fr.cross),
    done: Qr.green(fr.tick),
    exited: Qr.yellow(fr.cross),
    default: Qr.cyan("?")
  }), oC = /* @__PURE__ */ s((e, t, r) => t ? Ji.aborted : r ? Ji.exited : e ? Ji.done : Ji.default, "symbol"), aC = /* @__PURE__ */ s((e) => Qr.
  gray(e ? fr.ellipsis : fr.pointerSmall), "delimiter"), uC = /* @__PURE__ */ s((e, t) => Qr.gray(e ? t ? fr.pointerSmall : "+" : fr.line), "\
item");
  ep.exports = {
    styles: lu,
    render: sC,
    symbols: Ji,
    symbol: oC,
    delimiter: aC,
    item: uC
  };
});

// ../node_modules/prompts/lib/util/lines.js
var ip = b((dI, rp) => {
  "use strict";
  var lC = _s();
  rp.exports = function(e, t) {
    let r = String(lC(e) || "").split(/\r?\n/);
    return t ? r.map((i) => Math.ceil(i.length / t)).reduce((i, n) => i + n) : r.length;
  };
});

// ../node_modules/prompts/lib/util/wrap.js
var sp = b((fI, np) => {
  "use strict";
  np.exports = (e, t = {}) => {
    let r = Number.isSafeInteger(parseInt(t.margin)) ? new Array(parseInt(t.margin)).fill(" ").join("") : t.margin || "", i = t.width;
    return (e || "").split(/\r?\n/g).map((n) => n.split(/\s+/g).reduce((o, a) => (a.length + r.length >= i || o[o.length - 1].length + a.length +
    1 < i ? o[o.length - 1] += ` ${a}` : o.push(`${r}${a}`), o), [r]).join(`
`)).join(`
`);
  };
});

// ../node_modules/prompts/lib/util/entriesToDisplay.js
var ap = b((hI, op) => {
  "use strict";
  op.exports = (e, t, r) => {
    r = r || t;
    let i = Math.min(t - r, e - Math.floor(r / 2));
    i < 0 && (i = 0);
    let n = Math.min(i + r, t);
    return { startIndex: i, endIndex: n };
  };
});

// ../node_modules/prompts/lib/util/index.js
var tt = b((pI, up) => {
  "use strict";
  up.exports = {
    action: Gh(),
    clear: Xh(),
    style: tp(),
    strip: _s(),
    figures: uu(),
    lines: ip(),
    wrap: sp(),
    entriesToDisplay: ap()
  };
});

// ../node_modules/prompts/lib/elements/prompt.js
var Ft = b((DI, cp) => {
  "use strict";
  var lp = require("readline"), { action: cC } = tt(), dC = require("events"), { beep: fC, cursor: hC } = be(), pC = ge(), cu = class extends dC {
    static {
      s(this, "Prompt");
    }
    constructor(t = {}) {
      super(), this.firstRender = !0, this.in = t.stdin || process.stdin, this.out = t.stdout || process.stdout, this.onRender = (t.onRender ||
      (() => {
      })).bind(this);
      let r = lp.createInterface({ input: this.in, escapeCodeTimeout: 50 });
      lp.emitKeypressEvents(this.in, r), this.in.isTTY && this.in.setRawMode(!0);
      let i = ["SelectPrompt", "MultiselectPrompt"].indexOf(this.constructor.name) > -1, n = /* @__PURE__ */ s((o, a) => {
        let u = cC(a, i);
        u === !1 ? this._ && this._(o, a) : typeof this[u] == "function" ? this[u](a) : this.bell();
      }, "keypress");
      this.close = () => {
        this.out.write(hC.show), this.in.removeListener("keypress", n), this.in.isTTY && this.in.setRawMode(!1), r.close(), this.emit(this.aborted ?
        "abort" : this.exited ? "exit" : "submit", this.value), this.closed = !0;
      }, this.in.on("keypress", n);
    }
    fire() {
      this.emit("state", {
        value: this.value,
        aborted: !!this.aborted,
        exited: !!this.exited
      });
    }
    bell() {
      this.out.write(fC);
    }
    render() {
      this.onRender(pC), this.firstRender && (this.firstRender = !1);
    }
  };
  cp.exports = cu;
});

// ../node_modules/prompts/lib/elements/text.js
var fp = b((gI, dp) => {
  var ws = ge(), DC = Ft(), { erase: mC, cursor: Xi } = be(), { style: du, clear: fu, lines: gC, figures: yC } = tt(), hu = class extends DC {
    static {
      s(this, "TextPrompt");
    }
    constructor(t = {}) {
      super(t), this.transform = du.render(t.style), this.scale = this.transform.scale, this.msg = t.message, this.initial = t.initial || "",
      this.validator = t.validate || (() => !0), this.value = "", this.errorMsg = t.error || "Please Enter A Valid Value", this.cursor = +!!this.
      initial, this.cursorOffset = 0, this.clear = fu("", this.out.columns), this.render();
    }
    set value(t) {
      !t && this.initial ? (this.placeholder = !0, this.rendered = ws.gray(this.transform.render(this.initial))) : (this.placeholder = !1, this.
      rendered = this.transform.render(t)), this._value = t, this.fire();
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
      let t = await this.validator(this.value);
      typeof t == "string" && (this.errorMsg = t, t = !1), this.error = !t;
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
    moveCursor(t) {
      this.placeholder || (this.cursor = this.cursor + t, this.cursorOffset += t);
    }
    _(t, r) {
      let i = this.value.slice(0, this.cursor), n = this.value.slice(this.cursor);
      this.value = `${i}${t}${n}`, this.red = !1, this.cursor = this.placeholder ? 0 : i.length + 1, this.render();
    }
    delete() {
      if (this.isCursorAtStart()) return this.bell();
      let t = this.value.slice(0, this.cursor - 1), r = this.value.slice(this.cursor);
      this.value = `${t}${r}`, this.red = !1, this.isCursorAtStart() ? this.cursorOffset = 0 : (this.cursorOffset++, this.moveCursor(-1)), this.
      render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
      let t = this.value.slice(0, this.cursor), r = this.value.slice(this.cursor + 1);
      this.value = `${t}${r}`, this.red = !1, this.isCursorAtEnd() ? this.cursorOffset = 0 : this.cursorOffset++, this.render();
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
      this.closed || (this.firstRender || (this.outputError && this.out.write(Xi.down(gC(this.outputError, this.out.columns) - 1) + fu(this.
      outputError, this.out.columns)), this.out.write(fu(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [
        du.symbol(this.done, this.aborted),
        ws.bold(this.msg),
        du.delimiter(this.done),
        this.red ? ws.red(this.rendered) : this.rendered
      ].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((t, r, i) => t + `
${i ? " " : yC.pointerSmall} ${ws.red().italic(r)}`, "")), this.out.write(mC.line + Xi.to(0) + this.outputText + Xi.save + this.outputError +
      Xi.restore + Xi.move(this.cursorOffset, 0)));
    }
  };
  dp.exports = hu;
});

// ../node_modules/prompts/lib/elements/select.js
var mp = b((bI, Dp) => {
  "use strict";
  var St = ge(), bC = Ft(), { style: hp, clear: pp, figures: Es, wrap: vC, entriesToDisplay: _C } = tt(), { cursor: wC } = be(), pu = class extends bC {
    static {
      s(this, "SelectPrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.hint = t.hint || "- Use arrow-keys. Return to submit.", this.warn = t.warn || "- This option is d\
isabled", this.cursor = t.initial || 0, this.choices = t.choices.map((r, i) => (typeof r == "string" && (r = { title: r, value: i }), {
        title: r && (r.title || r.value || r),
        value: r && (r.value === void 0 ? i : r.value),
        description: r && r.description,
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.optionsPerPage = t.optionsPerPage || 10, this.value = (this.choices[this.cursor] || {}).value, this.clear = pp("", this.out.
      columns), this.render();
    }
    moveCursor(t) {
      this.cursor = t, this.value = this.choices[t].value, this.fire();
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
    _(t, r) {
      if (t === " ") return this.submit();
    }
    get selection() {
      return this.choices[this.cursor];
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(wC.hide) : this.out.write(pp(this.outputText, this.out.columns)), super.render();
      let { startIndex: t, endIndex: r } = _C(this.cursor, this.choices.length, this.optionsPerPage);
      if (this.outputText = [
        hp.symbol(this.done, this.aborted),
        St.bold(this.msg),
        hp.delimiter(!1),
        this.done ? this.selection.title : this.selection.disabled ? St.yellow(this.warn) : St.gray(this.hint)
      ].join(" "), !this.done) {
        this.outputText += `
`;
        for (let i = t; i < r; i++) {
          let n, o, a = "", u = this.choices[i];
          i === t && t > 0 ? o = Es.arrowUp : i === r - 1 && r < this.choices.length ? o = Es.arrowDown : o = " ", u.disabled ? (n = this.cursor ===
          i ? St.gray().underline(u.title) : St.strikethrough().gray(u.title), o = (this.cursor === i ? St.bold().gray(Es.pointer) + " " : "\
  ") + o) : (n = this.cursor === i ? St.cyan().underline(u.title) : u.title, o = (this.cursor === i ? St.cyan(Es.pointer) + " " : "  ") + o,
          u.description && this.cursor === i && (a = ` - ${u.description}`, (o.length + n.length + a.length >= this.out.columns || u.description.
          split(/\r?\n/).length > 1) && (a = `
` + vC(u.description, { margin: 3, width: this.out.columns })))), this.outputText += `${o} ${n}${St.gray(a)}
`;
        }
      }
      this.out.write(this.outputText);
    }
  };
  Dp.exports = pu;
});

// ../node_modules/prompts/lib/elements/toggle.js
var vp = b((_I, bp) => {
  var Cs = ge(), EC = Ft(), { style: gp, clear: CC } = tt(), { cursor: yp, erase: xC } = be(), Du = class extends EC {
    static {
      s(this, "TogglePrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.value = !!t.initial, this.active = t.active || "on", this.inactive = t.inactive || "off", this.initialValue =
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
    _(t, r) {
      if (t === " ")
        this.value = !this.value;
      else if (t === "1")
        this.value = !0;
      else if (t === "0")
        this.value = !1;
      else return this.bell();
      this.render();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(yp.hide) : this.out.write(CC(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        gp.symbol(this.done, this.aborted),
        Cs.bold(this.msg),
        gp.delimiter(this.done),
        this.value ? this.inactive : Cs.cyan().underline(this.inactive),
        Cs.gray("/"),
        this.value ? Cs.cyan().underline(this.active) : this.active
      ].join(" "), this.out.write(xC.line + yp.to(0) + this.outputText));
    }
  };
  bp.exports = Du;
});

// ../node_modules/prompts/lib/dateparts/datepart.js
var ct = b((EI, _p) => {
  "use strict";
  var mu = class e {
    static {
      s(this, "DatePart");
    }
    constructor({ token: t, date: r, parts: i, locales: n }) {
      this.token = t, this.date = r || /* @__PURE__ */ new Date(), this.parts = i || [this], this.locales = n || {};
    }
    up() {
    }
    down() {
    }
    next() {
      let t = this.parts.indexOf(this);
      return this.parts.find((r, i) => i > t && r instanceof e);
    }
    setTo(t) {
    }
    prev() {
      let t = [].concat(this.parts).reverse(), r = t.indexOf(this);
      return t.find((i, n) => n > r && i instanceof e);
    }
    toString() {
      return String(this.date);
    }
  };
  _p.exports = mu;
});

// ../node_modules/prompts/lib/dateparts/meridiem.js
var Ep = b((xI, wp) => {
  "use strict";
  var FC = ct(), gu = class extends FC {
    static {
      s(this, "Meridiem");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setHours((this.date.getHours() + 12) % 24);
    }
    down() {
      this.up();
    }
    toString() {
      let t = this.date.getHours() > 12 ? "pm" : "am";
      return /\A/.test(this.token) ? t.toUpperCase() : t;
    }
  };
  wp.exports = gu;
});

// ../node_modules/prompts/lib/dateparts/day.js
var xp = b((SI, Cp) => {
  "use strict";
  var SC = ct(), TC = /* @__PURE__ */ s((e) => (e = e % 10, e === 1 ? "st" : e === 2 ? "nd" : e === 3 ? "rd" : "th"), "pos"), yu = class extends SC {
    static {
      s(this, "Day");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setDate(this.date.getDate() + 1);
    }
    down() {
      this.date.setDate(this.date.getDate() - 1);
    }
    setTo(t) {
      this.date.setDate(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getDate(), r = this.date.getDay();
      return this.token === "DD" ? String(t).padStart(2, "0") : this.token === "Do" ? t + TC(t) : this.token === "d" ? r + 1 : this.token ===
      "ddd" ? this.locales.weekdaysShort[r] : this.token === "dddd" ? this.locales.weekdays[r] : t;
    }
  };
  Cp.exports = yu;
});

// ../node_modules/prompts/lib/dateparts/hours.js
var Sp = b((AI, Fp) => {
  "use strict";
  var AC = ct(), bu = class extends AC {
    static {
      s(this, "Hours");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setHours(this.date.getHours() + 1);
    }
    down() {
      this.date.setHours(this.date.getHours() - 1);
    }
    setTo(t) {
      this.date.setHours(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getHours();
      return /h/.test(this.token) && (t = t % 12 || 12), this.token.length > 1 ? String(t).padStart(2, "0") : t;
    }
  };
  Fp.exports = bu;
});

// ../node_modules/prompts/lib/dateparts/milliseconds.js
var Ap = b((kI, Tp) => {
  "use strict";
  var RC = ct(), vu = class extends RC {
    static {
      s(this, "Milliseconds");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setMilliseconds(this.date.getMilliseconds() + 1);
    }
    down() {
      this.date.setMilliseconds(this.date.getMilliseconds() - 1);
    }
    setTo(t) {
      this.date.setMilliseconds(parseInt(t.substr(-this.token.length)));
    }
    toString() {
      return String(this.date.getMilliseconds()).padStart(4, "0").substr(0, this.token.length);
    }
  };
  Tp.exports = vu;
});

// ../node_modules/prompts/lib/dateparts/minutes.js
var kp = b((BI, Rp) => {
  "use strict";
  var kC = ct(), _u = class extends kC {
    static {
      s(this, "Minutes");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setMinutes(this.date.getMinutes() + 1);
    }
    down() {
      this.date.setMinutes(this.date.getMinutes() - 1);
    }
    setTo(t) {
      this.date.setMinutes(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getMinutes();
      return this.token.length > 1 ? String(t).padStart(2, "0") : t;
    }
  };
  Rp.exports = _u;
});

// ../node_modules/prompts/lib/dateparts/month.js
var Bp = b((II, Op) => {
  "use strict";
  var OC = ct(), wu = class extends OC {
    static {
      s(this, "Month");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setMonth(this.date.getMonth() + 1);
    }
    down() {
      this.date.setMonth(this.date.getMonth() - 1);
    }
    setTo(t) {
      t = parseInt(t.substr(-2)) - 1, this.date.setMonth(t < 0 ? 0 : t);
    }
    toString() {
      let t = this.date.getMonth(), r = this.token.length;
      return r === 2 ? String(t + 1).padStart(2, "0") : r === 3 ? this.locales.monthsShort[t] : r === 4 ? this.locales.months[t] : String(t +
      1);
    }
  };
  Op.exports = wu;
});

// ../node_modules/prompts/lib/dateparts/seconds.js
var Ip = b((jI, Pp) => {
  "use strict";
  var BC = ct(), Eu = class extends BC {
    static {
      s(this, "Seconds");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setSeconds(this.date.getSeconds() + 1);
    }
    down() {
      this.date.setSeconds(this.date.getSeconds() - 1);
    }
    setTo(t) {
      this.date.setSeconds(parseInt(t.substr(-2)));
    }
    toString() {
      let t = this.date.getSeconds();
      return this.token.length > 1 ? String(t).padStart(2, "0") : t;
    }
  };
  Pp.exports = Eu;
});

// ../node_modules/prompts/lib/dateparts/year.js
var jp = b((LI, Mp) => {
  "use strict";
  var PC = ct(), Cu = class extends PC {
    static {
      s(this, "Year");
    }
    constructor(t = {}) {
      super(t);
    }
    up() {
      this.date.setFullYear(this.date.getFullYear() + 1);
    }
    down() {
      this.date.setFullYear(this.date.getFullYear() - 1);
    }
    setTo(t) {
      this.date.setFullYear(t.substr(-4));
    }
    toString() {
      let t = String(this.date.getFullYear()).padStart(4, "0");
      return this.token.length === 2 ? t.substr(-2) : t;
    }
  };
  Mp.exports = Cu;
});

// ../node_modules/prompts/lib/dateparts/index.js
var Lp = b((UI, qp) => {
  "use strict";
  qp.exports = {
    DatePart: ct(),
    Meridiem: Ep(),
    Day: xp(),
    Hours: Sp(),
    Milliseconds: Ap(),
    Minutes: kp(),
    Month: Bp(),
    Seconds: Ip(),
    Year: jp()
  };
});

// ../node_modules/prompts/lib/elements/date.js
var Zp = b((WI, Vp) => {
  "use strict";
  var xu = ge(), IC = Ft(), { style: Np, clear: Up, figures: MC } = tt(), { erase: jC, cursor: Wp } = be(), { DatePart: $p, Meridiem: qC, Day: LC,
  Hours: NC, Milliseconds: UC, Minutes: WC, Month: $C, Seconds: HC, Year: VC } = Lp(), ZC = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g,
  Hp = {
    1: ({ token: e }) => e.replace(/\\(.)/g, "$1"),
    2: (e) => new LC(e),
    // Day // TODO
    3: (e) => new $C(e),
    // Month
    4: (e) => new VC(e),
    // Year
    5: (e) => new qC(e),
    // AM/PM // TODO (special)
    6: (e) => new NC(e),
    // Hours
    7: (e) => new WC(e),
    // Minutes
    8: (e) => new HC(e),
    // Seconds
    9: (e) => new UC(e)
    // Fractional seconds
  }, zC = {
    months: "January,February,March,April,May,June,July,August,September,October,November,December".split(","),
    monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
    weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
    weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",")
  }, Fu = class extends IC {
    static {
      s(this, "DatePrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.cursor = 0, this.typed = "", this.locales = Object.assign(zC, t.locales), this._date = t.initial ||
      /* @__PURE__ */ new Date(), this.errorMsg = t.error || "Please Enter A Valid Value", this.validator = t.validate || (() => !0), this.mask =
      t.mask || "YYYY-MM-DD HH:mm:ss", this.clear = Up("", this.out.columns), this.render();
    }
    get value() {
      return this.date;
    }
    get date() {
      return this._date;
    }
    set date(t) {
      t && this._date.setTime(t.getTime());
    }
    set mask(t) {
      let r;
      for (this.parts = []; r = ZC.exec(t); ) {
        let n = r.shift(), o = r.findIndex((a) => a != null);
        this.parts.push(o in Hp ? Hp[o]({ token: r[o] || n, date: this.date, parts: this.parts, locales: this.locales }) : r[o] || n);
      }
      let i = this.parts.reduce((n, o) => (typeof o == "string" && typeof n[n.length - 1] == "string" ? n[n.length - 1] += o : n.push(o), n),
      []);
      this.parts.splice(0), this.parts.push(...i), this.reset();
    }
    moveCursor(t) {
      this.typed = "", this.cursor = t, this.fire();
    }
    reset() {
      this.moveCursor(this.parts.findIndex((t) => t instanceof $p)), this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    async validate() {
      let t = await this.validator(this.value);
      typeof t == "string" && (this.errorMsg = t, t = !1), this.error = !t;
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
      let t = this.parts[this.cursor].prev();
      if (t == null) return this.bell();
      this.moveCursor(this.parts.indexOf(t)), this.render();
    }
    right() {
      let t = this.parts[this.cursor].next();
      if (t == null) return this.bell();
      this.moveCursor(this.parts.indexOf(t)), this.render();
    }
    next() {
      let t = this.parts[this.cursor].next();
      this.moveCursor(t ? this.parts.indexOf(t) : this.parts.findIndex((r) => r instanceof $p)), this.render();
    }
    _(t) {
      /\d/.test(t) && (this.typed += t, this.parts[this.cursor].setTo(this.typed), this.render());
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(Wp.hide) : this.out.write(Up(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        Np.symbol(this.done, this.aborted),
        xu.bold(this.msg),
        Np.delimiter(!1),
        this.parts.reduce((t, r, i) => t.concat(i === this.cursor && !this.done ? xu.cyan().underline(r.toString()) : r), []).join("")
      ].join(" "), this.error && (this.outputText += this.errorMsg.split(`
`).reduce(
        (t, r, i) => t + `
${i ? " " : MC.pointerSmall} ${xu.red().italic(r)}`,
        ""
      )), this.out.write(jC.line + Wp.to(0) + this.outputText));
    }
  };
  Vp.exports = Fu;
});

// ../node_modules/prompts/lib/elements/number.js
var Yp = b((HI, Kp) => {
  var xs = ge(), GC = Ft(), { cursor: Fs, erase: KC } = be(), { style: Su, figures: YC, clear: zp, lines: JC } = tt(), XC = /[0-9]/, Tu = /* @__PURE__ */ s(
  (e) => e !== void 0, "isDef"), Gp = /* @__PURE__ */ s((e, t) => {
    let r = Math.pow(10, t);
    return Math.round(e * r) / r;
  }, "round"), Au = class extends GC {
    static {
      s(this, "NumberPrompt");
    }
    constructor(t = {}) {
      super(t), this.transform = Su.render(t.style), this.msg = t.message, this.initial = Tu(t.initial) ? t.initial : "", this.float = !!t.float,
      this.round = t.round || 2, this.inc = t.increment || 1, this.min = Tu(t.min) ? t.min : -1 / 0, this.max = Tu(t.max) ? t.max : 1 / 0, this.
      errorMsg = t.error || "Please Enter A Valid Value", this.validator = t.validate || (() => !0), this.color = "cyan", this.value = "", this.
      typed = "", this.lastHit = 0, this.render();
    }
    set value(t) {
      !t && t !== 0 ? (this.placeholder = !0, this.rendered = xs.gray(this.transform.render(`${this.initial}`)), this._value = "") : (this.placeholder =
      !1, this.rendered = this.transform.render(`${Gp(t, this.round)}`), this._value = Gp(t, this.round)), this.fire();
    }
    get value() {
      return this._value;
    }
    parse(t) {
      return this.float ? parseFloat(t) : parseInt(t);
    }
    valid(t) {
      return t === "-" || t === "." && this.float || XC.test(t);
    }
    reset() {
      this.typed = "", this.value = "", this.fire(), this.render();
    }
    exit() {
      this.abort();
    }
    abort() {
      let t = this.value;
      this.value = t !== "" ? t : this.initial, this.done = this.aborted = !0, this.error = !1, this.fire(), this.render(), this.out.write(`\

`), this.close();
    }
    async validate() {
      let t = await this.validator(this.value);
      typeof t == "string" && (this.errorMsg = t, t = !1), this.error = !t;
    }
    async submit() {
      if (await this.validate(), this.error) {
        this.color = "red", this.fire(), this.render();
        return;
      }
      let t = this.value;
      this.value = t !== "" ? t : this.initial, this.done = !0, this.aborted = !1, this.error = !1, this.fire(), this.render(), this.out.write(
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
      let t = this.value.toString();
      if (t.length === 0) return this.bell();
      this.value = this.parse(t = t.slice(0, -1)) || "", this.value !== "" && this.value < this.min && (this.value = this.min), this.color =
      "cyan", this.fire(), this.render();
    }
    next() {
      this.value = this.initial, this.fire(), this.render();
    }
    _(t, r) {
      if (!this.valid(t)) return this.bell();
      let i = Date.now();
      if (i - this.lastHit > 1e3 && (this.typed = ""), this.typed += t, this.lastHit = i, this.color = "cyan", t === ".") return this.fire();
      this.value = Math.min(this.parse(this.typed), this.max), this.value > this.max && (this.value = this.max), this.value < this.min && (this.
      value = this.min), this.fire(), this.render();
    }
    render() {
      this.closed || (this.firstRender || (this.outputError && this.out.write(Fs.down(JC(this.outputError, this.out.columns) - 1) + zp(this.
      outputError, this.out.columns)), this.out.write(zp(this.outputText, this.out.columns))), super.render(), this.outputError = "", this.outputText =
      [
        Su.symbol(this.done, this.aborted),
        xs.bold(this.msg),
        Su.delimiter(this.done),
        !this.done || !this.done && !this.placeholder ? xs[this.color]().underline(this.rendered) : this.rendered
      ].join(" "), this.error && (this.outputError += this.errorMsg.split(`
`).reduce((t, r, i) => t + `
${i ? " " : YC.pointerSmall} ${xs.red().italic(r)}`, "")), this.out.write(KC.line + Fs.to(0) + this.outputText + Fs.save + this.outputError +
      Fs.restore));
    }
  };
  Kp.exports = Au;
});

// ../node_modules/prompts/lib/elements/multiselect.js
var ku = b((ZI, Qp) => {
  "use strict";
  var dt = ge(), { cursor: QC } = be(), ex = Ft(), { clear: Jp, figures: Gt, style: Xp, wrap: tx, entriesToDisplay: rx } = tt(), Ru = class extends ex {
    static {
      s(this, "MultiselectPrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.cursor = t.cursor || 0, this.scrollIndex = t.cursor || 0, this.hint = t.hint || "", this.warn = t.
      warn || "- This option is disabled -", this.minSelected = t.min, this.showMinError = !1, this.maxChoices = t.max, this.instructions = t.
      instructions, this.optionsPerPage = t.optionsPerPage || 10, this.value = t.choices.map((r, i) => (typeof r == "string" && (r = { title: r,
      value: i }), {
        title: r && (r.title || r.value || r),
        description: r && r.description,
        value: r && (r.value === void 0 ? i : r.value),
        selected: r && r.selected,
        disabled: r && r.disabled
      })), this.clear = Jp("", this.out.columns), t.overrideRender || this.render();
    }
    reset() {
      this.value.map((t) => !t.selected), this.cursor = 0, this.fire(), this.render();
    }
    selected() {
      return this.value.filter((t) => t.selected);
    }
    exit() {
      this.abort();
    }
    abort() {
      this.done = this.aborted = !0, this.fire(), this.render(), this.out.write(`
`), this.close();
    }
    submit() {
      let t = this.value.filter((r) => r.selected);
      this.minSelected && t.length < this.minSelected ? (this.showMinError = !0, this.render()) : (this.done = !0, this.aborted = !1, this.fire(),
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
      if (this.value.filter((t) => t.selected).length >= this.maxChoices) return this.bell();
      this.value[this.cursor].selected = !0, this.render();
    }
    handleSpaceToggle() {
      let t = this.value[this.cursor];
      if (t.selected)
        t.selected = !1, this.render();
      else {
        if (t.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        t.selected = !0, this.render();
      }
    }
    toggleAll() {
      if (this.maxChoices !== void 0 || this.value[this.cursor].disabled)
        return this.bell();
      let t = !this.value[this.cursor].selected;
      this.value.filter((r) => !r.disabled).forEach((r) => r.selected = t), this.render();
    }
    _(t, r) {
      if (t === " ")
        this.handleSpaceToggle();
      else if (t === "a")
        this.toggleAll();
      else
        return this.bell();
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${Gt.arrowUp}/${Gt.arrowDown}: Highlight option
    ${Gt.arrowLeft}/${Gt.arrowRight}/[space]: Toggle selection
` + (this.maxChoices === void 0 ? `    a: Toggle all
` : "") + "    enter/return: Complete answer" : "";
    }
    renderOption(t, r, i, n) {
      let o = (r.selected ? dt.green(Gt.radioOn) : Gt.radioOff) + " " + n + " ", a, u;
      return r.disabled ? a = t === i ? dt.gray().underline(r.title) : dt.strikethrough().gray(r.title) : (a = t === i ? dt.cyan().underline(
      r.title) : r.title, t === i && r.description && (u = ` - ${r.description}`, (o.length + a.length + u.length >= this.out.columns || r.description.
      split(/\r?\n/).length > 1) && (u = `
` + tx(r.description, { margin: o.length, width: this.out.columns })))), o + a + dt.gray(u || "");
    }
    // shared with autocompleteMultiselect
    paginateOptions(t) {
      if (t.length === 0)
        return dt.red("No matches for this query.");
      let { startIndex: r, endIndex: i } = rx(this.cursor, t.length, this.optionsPerPage), n, o = [];
      for (let a = r; a < i; a++)
        a === r && r > 0 ? n = Gt.arrowUp : a === i - 1 && i < t.length ? n = Gt.arrowDown : n = " ", o.push(this.renderOption(this.cursor, t[a],
        a, n));
      return `
` + o.join(`
`);
    }
    // shared with autocomleteMultiselect
    renderOptions(t) {
      return this.done ? "" : this.paginateOptions(t);
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let t = [dt.gray(this.hint), this.renderInstructions()];
      return this.value[this.cursor].disabled && t.push(dt.yellow(this.warn)), t.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(QC.hide), super.render();
      let t = [
        Xp.symbol(this.done, this.aborted),
        dt.bold(this.msg),
        Xp.delimiter(!1),
        this.renderDoneOrInstructions()
      ].join(" ");
      this.showMinError && (t += dt.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), t += this.renderOptions(
      this.value), this.out.write(this.clear + t), this.clear = Jp(t, this.out.columns);
    }
  };
  Qp.exports = Ru;
});

// ../node_modules/prompts/lib/elements/autocomplete.js
var nD = b((GI, iD) => {
  "use strict";
  var Qi = ge(), ix = Ft(), { erase: nx, cursor: eD } = be(), { style: Ou, clear: tD, figures: Bu, wrap: sx, entriesToDisplay: ox } = tt(), rD = /* @__PURE__ */ s(
  (e, t) => e[t] && (e[t].value || e[t].title || e[t]), "getVal"), ax = /* @__PURE__ */ s((e, t) => e[t] && (e[t].title || e[t].value || e[t]),
  "getTitle"), ux = /* @__PURE__ */ s((e, t) => {
    let r = e.findIndex((i) => i.value === t || i.title === t);
    return r > -1 ? r : void 0;
  }, "getIndex"), Pu = class extends ix {
    static {
      s(this, "AutocompletePrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.suggest = t.suggest, this.choices = t.choices, this.initial = typeof t.initial == "number" ? t.initial :
      ux(t.choices, t.initial), this.select = this.initial || t.cursor || 0, this.i18n = { noMatches: t.noMatches || "no matches found" }, this.
      fallback = t.fallback || this.initial, this.clearFirst = t.clearFirst || !1, this.suggestions = [], this.input = "", this.limit = t.limit ||
      10, this.cursor = 0, this.transform = Ou.render(t.style), this.scale = this.transform.scale, this.render = this.render.bind(this), this.
      complete = this.complete.bind(this), this.clear = tD("", this.out.columns), this.complete(this.render), this.render();
    }
    set fallback(t) {
      this._fb = Number.isSafeInteger(parseInt(t)) ? parseInt(t) : t;
    }
    get fallback() {
      let t;
      return typeof this._fb == "number" ? t = this.choices[this._fb] : typeof this._fb == "string" && (t = { title: this._fb }), t || this.
      _fb || { title: this.i18n.noMatches };
    }
    moveSelect(t) {
      this.select = t, this.suggestions.length > 0 ? this.value = rD(this.suggestions, t) : this.value = this.fallback.value, this.fire();
    }
    async complete(t) {
      let r = this.completing = this.suggest(this.input, this.choices), i = await r;
      if (this.completing !== r) return;
      this.suggestions = i.map((o, a, u) => ({ title: ax(u, a), value: rD(u, a), description: o.description })), this.completing = !1;
      let n = Math.max(i.length - 1, 0);
      this.moveSelect(Math.min(n, this.select)), t && t();
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
    _(t, r) {
      let i = this.input.slice(0, this.cursor), n = this.input.slice(this.cursor);
      this.input = `${i}${t}${n}`, this.cursor = i.length + 1, this.complete(this.render), this.render();
    }
    delete() {
      if (this.cursor === 0) return this.bell();
      let t = this.input.slice(0, this.cursor - 1), r = this.input.slice(this.cursor);
      this.input = `${t}${r}`, this.complete(this.render), this.cursor = this.cursor - 1, this.render();
    }
    deleteForward() {
      if (this.cursor * this.scale >= this.rendered.length) return this.bell();
      let t = this.input.slice(0, this.cursor), r = this.input.slice(this.cursor + 1);
      this.input = `${t}${r}`, this.complete(this.render), this.render();
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
    renderOption(t, r, i, n) {
      let o, a = i ? Bu.arrowUp : n ? Bu.arrowDown : " ", u = r ? Qi.cyan().underline(t.title) : t.title;
      return a = (r ? Qi.cyan(Bu.pointer) + " " : "  ") + a, t.description && (o = ` - ${t.description}`, (a.length + u.length + o.length >=
      this.out.columns || t.description.split(/\r?\n/).length > 1) && (o = `
` + sx(t.description, { margin: 3, width: this.out.columns }))), a + " " + u + Qi.gray(o || "");
    }
    render() {
      if (this.closed) return;
      this.firstRender ? this.out.write(eD.hide) : this.out.write(tD(this.outputText, this.out.columns)), super.render();
      let { startIndex: t, endIndex: r } = ox(this.select, this.choices.length, this.limit);
      if (this.outputText = [
        Ou.symbol(this.done, this.aborted, this.exited),
        Qi.bold(this.msg),
        Ou.delimiter(this.completing),
        this.done && this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)
      ].join(" "), !this.done) {
        let i = this.suggestions.slice(t, r).map((n, o) => this.renderOption(
          n,
          this.select === o + t,
          o === 0 && t > 0,
          o + t === r - 1 && r < this.choices.length
        )).join(`
`);
        this.outputText += `
` + (i || Qi.gray(this.fallback.title));
      }
      this.out.write(nx.line + eD.to(0) + this.outputText);
    }
  };
  iD.exports = Pu;
});

// ../node_modules/prompts/lib/elements/autocompleteMultiselect.js
var uD = b((YI, aD) => {
  "use strict";
  var Tt = ge(), { cursor: lx } = be(), cx = ku(), { clear: sD, style: oD, figures: ei } = tt(), Iu = class extends cx {
    static {
      s(this, "AutocompleteMultiselectPrompt");
    }
    constructor(t = {}) {
      t.overrideRender = !0, super(t), this.inputValue = "", this.clear = sD("", this.out.columns), this.filteredOptions = this.value, this.
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
      if (this.value.filter((t) => t.selected).length >= this.maxChoices) return this.bell();
      this.filteredOptions[this.cursor].selected = !0, this.render();
    }
    delete() {
      this.inputValue.length && (this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1), this.updateFilteredOptions());
    }
    updateFilteredOptions() {
      let t = this.filteredOptions[this.cursor];
      this.filteredOptions = this.value.filter((i) => this.inputValue ? !!(typeof i.title == "string" && i.title.toLowerCase().includes(this.
      inputValue.toLowerCase()) || typeof i.value == "string" && i.value.toLowerCase().includes(this.inputValue.toLowerCase())) : !0);
      let r = this.filteredOptions.findIndex((i) => i === t);
      this.cursor = r < 0 ? 0 : r, this.render();
    }
    handleSpaceToggle() {
      let t = this.filteredOptions[this.cursor];
      if (t.selected)
        t.selected = !1, this.render();
      else {
        if (t.disabled || this.value.filter((r) => r.selected).length >= this.maxChoices)
          return this.bell();
        t.selected = !0, this.render();
      }
    }
    handleInputChange(t) {
      this.inputValue = this.inputValue + t, this.updateFilteredOptions();
    }
    _(t, r) {
      t === " " ? this.handleSpaceToggle() : this.handleInputChange(t);
    }
    renderInstructions() {
      return this.instructions === void 0 || this.instructions ? typeof this.instructions == "string" ? this.instructions : `
Instructions:
    ${ei.arrowUp}/${ei.arrowDown}: Highlight option
    ${ei.arrowLeft}/${ei.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
` : "";
    }
    renderCurrentInput() {
      return `
Filtered results for: ${this.inputValue ? this.inputValue : Tt.gray("Enter something to filter")}
`;
    }
    renderOption(t, r, i) {
      let n;
      return r.disabled ? n = t === i ? Tt.gray().underline(r.title) : Tt.strikethrough().gray(r.title) : n = t === i ? Tt.cyan().underline(
      r.title) : r.title, (r.selected ? Tt.green(ei.radioOn) : ei.radioOff) + "  " + n;
    }
    renderDoneOrInstructions() {
      if (this.done)
        return this.value.filter((r) => r.selected).map((r) => r.title).join(", ");
      let t = [Tt.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
      return this.filteredOptions.length && this.filteredOptions[this.cursor].disabled && t.push(Tt.yellow(this.warn)), t.join(" ");
    }
    render() {
      if (this.closed) return;
      this.firstRender && this.out.write(lx.hide), super.render();
      let t = [
        oD.symbol(this.done, this.aborted),
        Tt.bold(this.msg),
        oD.delimiter(!1),
        this.renderDoneOrInstructions()
      ].join(" ");
      this.showMinError && (t += Tt.red(`You must select a minimum of ${this.minSelected} choices.`), this.showMinError = !1), t += this.renderOptions(
      this.filteredOptions), this.out.write(this.clear + t), this.clear = sD(t, this.out.columns);
    }
  };
  aD.exports = Iu;
});

// ../node_modules/prompts/lib/elements/confirm.js
var hD = b((XI, fD) => {
  var lD = ge(), dx = Ft(), { style: cD, clear: fx } = tt(), { erase: hx, cursor: dD } = be(), Mu = class extends dx {
    static {
      s(this, "ConfirmPrompt");
    }
    constructor(t = {}) {
      super(t), this.msg = t.message, this.value = t.initial, this.initialValue = !!t.initial, this.yesMsg = t.yes || "yes", this.yesOption =
      t.yesOption || "(Y/n)", this.noMsg = t.no || "no", this.noOption = t.noOption || "(y/N)", this.render();
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
    _(t, r) {
      return t.toLowerCase() === "y" ? (this.value = !0, this.submit()) : t.toLowerCase() === "n" ? (this.value = !1, this.submit()) : this.
      bell();
    }
    render() {
      this.closed || (this.firstRender ? this.out.write(dD.hide) : this.out.write(fx(this.outputText, this.out.columns)), super.render(), this.
      outputText = [
        cD.symbol(this.done, this.aborted),
        lD.bold(this.msg),
        cD.delimiter(this.done),
        this.done ? this.value ? this.yesMsg : this.noMsg : lD.gray(this.initialValue ? this.yesOption : this.noOption)
      ].join(" "), this.out.write(hx.line + dD.to(0) + this.outputText));
    }
  };
  fD.exports = Mu;
});

// ../node_modules/prompts/lib/elements/index.js
var DD = b((e6, pD) => {
  "use strict";
  pD.exports = {
    TextPrompt: fp(),
    SelectPrompt: mp(),
    TogglePrompt: vp(),
    DatePrompt: Zp(),
    NumberPrompt: Yp(),
    MultiselectPrompt: ku(),
    AutocompletePrompt: nD(),
    AutocompleteMultiselectPrompt: uD(),
    ConfirmPrompt: hD()
  };
});

// ../node_modules/prompts/lib/prompts.js
var gD = b((mD) => {
  "use strict";
  var Ue = mD, px = DD(), Ss = /* @__PURE__ */ s((e) => e, "noop");
  function ft(e, t, r = {}) {
    return new Promise((i, n) => {
      let o = new px[e](t), a = r.onAbort || Ss, u = r.onSubmit || Ss, l = r.onExit || Ss;
      o.on("state", t.onState || Ss), o.on("submit", (c) => i(u(c))), o.on("exit", (c) => i(l(c))), o.on("abort", (c) => n(a(c)));
    });
  }
  s(ft, "toPrompt");
  Ue.text = (e) => ft("TextPrompt", e);
  Ue.password = (e) => (e.style = "password", Ue.text(e));
  Ue.invisible = (e) => (e.style = "invisible", Ue.text(e));
  Ue.number = (e) => ft("NumberPrompt", e);
  Ue.date = (e) => ft("DatePrompt", e);
  Ue.confirm = (e) => ft("ConfirmPrompt", e);
  Ue.list = (e) => {
    let t = e.separator || ",";
    return ft("TextPrompt", e, {
      onSubmit: /* @__PURE__ */ s((r) => r.split(t).map((i) => i.trim()), "onSubmit")
    });
  };
  Ue.toggle = (e) => ft("TogglePrompt", e);
  Ue.select = (e) => ft("SelectPrompt", e);
  Ue.multiselect = (e) => {
    e.choices = [].concat(e.choices || []);
    let t = /* @__PURE__ */ s((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return ft("MultiselectPrompt", e, {
      onAbort: t,
      onSubmit: t
    });
  };
  Ue.autocompleteMultiselect = (e) => {
    e.choices = [].concat(e.choices || []);
    let t = /* @__PURE__ */ s((r) => r.filter((i) => i.selected).map((i) => i.value), "toSelected");
    return ft("AutocompleteMultiselectPrompt", e, {
      onAbort: t,
      onSubmit: t
    });
  };
  var Dx = /* @__PURE__ */ s((e, t) => Promise.resolve(
    t.filter((r) => r.title.slice(0, e.length).toLowerCase() === e.toLowerCase())
  ), "byTitle");
  Ue.autocomplete = (e) => (e.suggest = e.suggest || Dx, e.choices = [].concat(e.choices || []), ft("AutocompletePrompt", e));
});

// ../node_modules/prompts/lib/index.js
var vD = b((i6, bD) => {
  "use strict";
  var ju = gD(), mx = ["suggest", "format", "onState", "validate", "onRender", "type"], yD = /* @__PURE__ */ s(() => {
  }, "noop");
  async function Kt(e = [], { onSubmit: t = yD, onCancel: r = yD } = {}) {
    let i = {}, n = Kt._override || {};
    e = [].concat(e);
    let o, a, u, l, c, d, p = /* @__PURE__ */ s(async (h, f, g = !1) => {
      if (!(!g && h.validate && h.validate(f) !== !0))
        return h.format ? await h.format(f, i) : f;
    }, "getFormattedAnswer");
    for (a of e)
      if ({ name: l, type: c } = a, typeof c == "function" && (c = await c(o, { ...i }, a), a.type = c), !!c) {
        for (let h in a) {
          if (mx.includes(h)) continue;
          let f = a[h];
          a[h] = typeof f == "function" ? await f(o, { ...i }, d) : f;
        }
        if (d = a, typeof a.message != "string")
          throw new Error("prompt message is required");
        if ({ name: l, type: c } = a, ju[c] === void 0)
          throw new Error(`prompt type (${c}) is not defined`);
        if (n[a.name] !== void 0 && (o = await p(a, n[a.name]), o !== void 0)) {
          i[l] = o;
          continue;
        }
        try {
          o = Kt._injected ? gx(Kt._injected, a.initial) : await ju[c](a), i[l] = o = await p(a, o, !0), u = await t(a, o, i);
        } catch {
          u = !await r(a, i);
        }
        if (u) return i;
      }
    return i;
  }
  s(Kt, "prompt");
  function gx(e, t) {
    let r = e.shift();
    if (r instanceof Error)
      throw r;
    return r === void 0 ? t : r;
  }
  s(gx, "getInjectedAnswer");
  function yx(e) {
    Kt._injected = (Kt._injected || []).concat(e);
  }
  s(yx, "inject");
  function bx(e) {
    Kt._override = Object.assign({}, e);
  }
  s(bx, "override");
  bD.exports = Object.assign(Kt, { prompt: Kt, prompts: ju, inject: yx, override: bx });
});

// ../node_modules/prompts/index.js
var Ts = b((s6, _D) => {
  function vx(e) {
    e = (Array.isArray(e) ? e : e.split(".")).map(Number);
    let t = 0, r = process.versions.node.split(".").map(Number);
    for (; t < e.length; t++) {
      if (r[t] > e[t]) return !1;
      if (e[t] > r[t]) return !0;
    }
    return !1;
  }
  s(vx, "isNodeLT");
  _D.exports = vx("8.6.0") ? Zh() : vD();
});

// ../node_modules/picocolors/picocolors.js
var Lu = b((a6, qu) => {
  var wD = process.argv || [], As = process.env, _x = !("NO_COLOR" in As || wD.includes("--no-color")) && ("FORCE_COLOR" in As || wD.includes(
  "--color") || process.platform === "win32" || require != null && require("tty").isatty(1) && As.TERM !== "dumb" || "CI" in As), wx = /* @__PURE__ */ s(
  (e, t, r = e) => (i) => {
    let n = "" + i, o = n.indexOf(t, e.length);
    return ~o ? e + Ex(n, t, r, o) + t : e + n + t;
  }, "formatter"), Ex = /* @__PURE__ */ s((e, t, r, i) => {
    let n = "", o = 0;
    do
      n += e.substring(o, i) + r, o = i + t.length, i = e.indexOf(t, o);
    while (~i);
    return n + e.substring(o);
  }, "replaceClose"), ED = /* @__PURE__ */ s((e = _x) => {
    let t = e ? wx : () => String;
    return {
      isColorSupported: e,
      reset: t("\x1B[0m", "\x1B[0m"),
      bold: t("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: t("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: t("\x1B[3m", "\x1B[23m"),
      underline: t("\x1B[4m", "\x1B[24m"),
      inverse: t("\x1B[7m", "\x1B[27m"),
      hidden: t("\x1B[8m", "\x1B[28m"),
      strikethrough: t("\x1B[9m", "\x1B[29m"),
      black: t("\x1B[30m", "\x1B[39m"),
      red: t("\x1B[31m", "\x1B[39m"),
      green: t("\x1B[32m", "\x1B[39m"),
      yellow: t("\x1B[33m", "\x1B[39m"),
      blue: t("\x1B[34m", "\x1B[39m"),
      magenta: t("\x1B[35m", "\x1B[39m"),
      cyan: t("\x1B[36m", "\x1B[39m"),
      white: t("\x1B[37m", "\x1B[39m"),
      gray: t("\x1B[90m", "\x1B[39m"),
      bgBlack: t("\x1B[40m", "\x1B[49m"),
      bgRed: t("\x1B[41m", "\x1B[49m"),
      bgGreen: t("\x1B[42m", "\x1B[49m"),
      bgYellow: t("\x1B[43m", "\x1B[49m"),
      bgBlue: t("\x1B[44m", "\x1B[49m"),
      bgMagenta: t("\x1B[45m", "\x1B[49m"),
      bgCyan: t("\x1B[46m", "\x1B[49m"),
      bgWhite: t("\x1B[47m", "\x1B[49m"),
      blackBright: t("\x1B[90m", "\x1B[39m"),
      redBright: t("\x1B[91m", "\x1B[39m"),
      greenBright: t("\x1B[92m", "\x1B[39m"),
      yellowBright: t("\x1B[93m", "\x1B[39m"),
      blueBright: t("\x1B[94m", "\x1B[39m"),
      magentaBright: t("\x1B[95m", "\x1B[39m"),
      cyanBright: t("\x1B[96m", "\x1B[39m"),
      whiteBright: t("\x1B[97m", "\x1B[39m"),
      bgBlackBright: t("\x1B[100m", "\x1B[49m"),
      bgRedBright: t("\x1B[101m", "\x1B[49m"),
      bgGreenBright: t("\x1B[102m", "\x1B[49m"),
      bgYellowBright: t("\x1B[103m", "\x1B[49m"),
      bgBlueBright: t("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: t("\x1B[105m", "\x1B[49m"),
      bgCyanBright: t("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: t("\x1B[107m", "\x1B[49m")
    };
  }, "createColors");
  qu.exports = ED();
  qu.exports.createColors = ED;
});

// ../node_modules/wrappy/wrappy.js
var SD = b((h6, FD) => {
  FD.exports = xD;
  function xD(e, t) {
    if (e && t) return xD(e)(t);
    if (typeof e != "function")
      throw new TypeError("need wrapper function");
    return Object.keys(e).forEach(function(i) {
      r[i] = e[i];
    }), r;
    function r() {
      for (var i = new Array(arguments.length), n = 0; n < i.length; n++)
        i[n] = arguments[n];
      var o = e.apply(this, i), a = i[i.length - 1];
      return typeof o == "function" && o !== a && Object.keys(a).forEach(function(u) {
        o[u] = a[u];
      }), o;
    }
    s(r, "wrapper");
  }
  s(xD, "wrappy");
});

// ../node_modules/once/once.js
var ks = b((D6, $u) => {
  var TD = SD();
  $u.exports = TD(Rs);
  $u.exports.strict = TD(AD);
  Rs.proto = Rs(function() {
    Object.defineProperty(Function.prototype, "once", {
      value: /* @__PURE__ */ s(function() {
        return Rs(this);
      }, "value"),
      configurable: !0
    }), Object.defineProperty(Function.prototype, "onceStrict", {
      value: /* @__PURE__ */ s(function() {
        return AD(this);
      }, "value"),
      configurable: !0
    });
  });
  function Rs(e) {
    var t = /* @__PURE__ */ s(function() {
      return t.called ? t.value : (t.called = !0, t.value = e.apply(this, arguments));
    }, "f");
    return t.called = !1, t;
  }
  s(Rs, "once");
  function AD(e) {
    var t = /* @__PURE__ */ s(function() {
      if (t.called)
        throw new Error(t.onceError);
      return t.called = !0, t.value = e.apply(this, arguments);
    }, "f"), r = e.name || "Function wrapped with `once`";
    return t.onceError = r + " shouldn't be called more than once", t.called = !1, t;
  }
  s(AD, "onceStrict");
});

// ../node_modules/end-of-stream/index.js
var ti = b((g6, kD) => {
  var Tx = ks(), Ax = /* @__PURE__ */ s(function() {
  }, "noop"), Rx = /* @__PURE__ */ s(function(e) {
    return e.setHeader && typeof e.abort == "function";
  }, "isRequest"), kx = /* @__PURE__ */ s(function(e) {
    return e.stdio && Array.isArray(e.stdio) && e.stdio.length === 3;
  }, "isChildProcess"), RD = /* @__PURE__ */ s(function(e, t, r) {
    if (typeof t == "function") return RD(e, null, t);
    t || (t = {}), r = Tx(r || Ax);
    var i = e._writableState, n = e._readableState, o = t.readable || t.readable !== !1 && e.readable, a = t.writable || t.writable !== !1 &&
    e.writable, u = !1, l = /* @__PURE__ */ s(function() {
      e.writable || c();
    }, "onlegacyfinish"), c = /* @__PURE__ */ s(function() {
      a = !1, o || r.call(e);
    }, "onfinish"), d = /* @__PURE__ */ s(function() {
      o = !1, a || r.call(e);
    }, "onend"), p = /* @__PURE__ */ s(function(_) {
      r.call(e, _ ? new Error("exited with error code: " + _) : null);
    }, "onexit"), h = /* @__PURE__ */ s(function(_) {
      r.call(e, _);
    }, "onerror"), f = /* @__PURE__ */ s(function() {
      process.nextTick(g);
    }, "onclose"), g = /* @__PURE__ */ s(function() {
      if (!u) {
        if (o && !(n && n.ended && !n.destroyed)) return r.call(e, new Error("premature close"));
        if (a && !(i && i.ended && !i.destroyed)) return r.call(e, new Error("premature close"));
      }
    }, "onclosenexttick"), E = /* @__PURE__ */ s(function() {
      e.req.on("finish", c);
    }, "onrequest");
    return Rx(e) ? (e.on("complete", c), e.on("abort", f), e.req ? E() : e.on("request", E)) : a && !i && (e.on("end", l), e.on("close", l)),
    kx(e) && e.on("exit", p), e.on("end", d), e.on("finish", c), t.error !== !1 && e.on("error", h), e.on("close", f), function() {
      u = !0, e.removeListener("complete", c), e.removeListener("abort", f), e.removeListener("request", E), e.req && e.req.removeListener("\
finish", c), e.removeListener("end", l), e.removeListener("close", l), e.removeListener("finish", c), e.removeListener("exit", p), e.removeListener(
      "end", d), e.removeListener("error", h), e.removeListener("close", f);
    };
  }, "eos");
  kD.exports = RD;
});

// ../node_modules/pump/index.js
var Vu = b((b6, BD) => {
  var Ox = ks(), Bx = ti(), Hu = require("fs"), tn = /* @__PURE__ */ s(function() {
  }, "noop"), Px = /^v?\.0/.test(process.version), Os = /* @__PURE__ */ s(function(e) {
    return typeof e == "function";
  }, "isFn"), Ix = /* @__PURE__ */ s(function(e) {
    return !Px || !Hu ? !1 : (e instanceof (Hu.ReadStream || tn) || e instanceof (Hu.WriteStream || tn)) && Os(e.close);
  }, "isFS"), Mx = /* @__PURE__ */ s(function(e) {
    return e.setHeader && Os(e.abort);
  }, "isRequest"), jx = /* @__PURE__ */ s(function(e, t, r, i) {
    i = Ox(i);
    var n = !1;
    e.on("close", function() {
      n = !0;
    }), Bx(e, { readable: t, writable: r }, function(a) {
      if (a) return i(a);
      n = !0, i();
    });
    var o = !1;
    return function(a) {
      if (!n && !o) {
        if (o = !0, Ix(e)) return e.close(tn);
        if (Mx(e)) return e.abort();
        if (Os(e.destroy)) return e.destroy();
        i(a || new Error("stream was destroyed"));
      }
    };
  }, "destroyer"), OD = /* @__PURE__ */ s(function(e) {
    e();
  }, "call"), qx = /* @__PURE__ */ s(function(e, t) {
    return e.pipe(t);
  }, "pipe"), Lx = /* @__PURE__ */ s(function() {
    var e = Array.prototype.slice.call(arguments), t = Os(e[e.length - 1] || tn) && e.pop() || tn;
    if (Array.isArray(e[0]) && (e = e[0]), e.length < 2) throw new Error("pump requires two streams per minimum");
    var r, i = e.map(function(n, o) {
      var a = o < e.length - 1, u = o > 0;
      return jx(n, a, u, function(l) {
        r || (r = l), l && i.forEach(OD), !a && (i.forEach(OD), t(r));
      });
    });
    return e.reduce(qx);
  }, "pump");
  BD.exports = Lx;
});

// ../node_modules/tar-fs/node_modules/chownr/chownr.js
var ND = b((_6, LD) => {
  "use strict";
  var ze = require("fs"), hr = require("path"), Nx = ze.lchown ? "lchown" : "chown", Ux = ze.lchownSync ? "lchownSync" : "chownSync", ID = ze.
  lchown && !process.version.match(/v1[1-9]+\./) && !process.version.match(/v10\.[6-9]/), PD = /* @__PURE__ */ s((e, t, r) => {
    try {
      return ze[Ux](e, t, r);
    } catch (i) {
      if (i.code !== "ENOENT")
        throw i;
    }
  }, "lchownSync"), Wx = /* @__PURE__ */ s((e, t, r) => {
    try {
      return ze.chownSync(e, t, r);
    } catch (i) {
      if (i.code !== "ENOENT")
        throw i;
    }
  }, "chownSync"), $x = ID ? (e, t, r, i) => (n) => {
    !n || n.code !== "EISDIR" ? i(n) : ze.chown(e, t, r, i);
  } : (e, t, r, i) => i, Zu = ID ? (e, t, r) => {
    try {
      return PD(e, t, r);
    } catch (i) {
      if (i.code !== "EISDIR")
        throw i;
      Wx(e, t, r);
    }
  } : (e, t, r) => PD(e, t, r), Hx = process.version, MD = /* @__PURE__ */ s((e, t, r) => ze.readdir(e, t, r), "readdir"), Vx = /* @__PURE__ */ s(
  (e, t) => ze.readdirSync(e, t), "readdirSync");
  /^v4\./.test(Hx) && (MD = /* @__PURE__ */ s((e, t, r) => ze.readdir(e, r), "readdir"));
  var Bs = /* @__PURE__ */ s((e, t, r, i) => {
    ze[Nx](e, t, r, $x(e, t, r, (n) => {
      i(n && n.code !== "ENOENT" ? n : null);
    }));
  }, "chown"), jD = /* @__PURE__ */ s((e, t, r, i, n) => {
    if (typeof t == "string")
      return ze.lstat(hr.resolve(e, t), (o, a) => {
        if (o)
          return n(o.code !== "ENOENT" ? o : null);
        a.name = t, jD(e, a, r, i, n);
      });
    if (t.isDirectory())
      zu(hr.resolve(e, t.name), r, i, (o) => {
        if (o)
          return n(o);
        let a = hr.resolve(e, t.name);
        Bs(a, r, i, n);
      });
    else {
      let o = hr.resolve(e, t.name);
      Bs(o, r, i, n);
    }
  }, "chownrKid"), zu = /* @__PURE__ */ s((e, t, r, i) => {
    MD(e, { withFileTypes: !0 }, (n, o) => {
      if (n) {
        if (n.code === "ENOENT")
          return i();
        if (n.code !== "ENOTDIR" && n.code !== "ENOTSUP")
          return i(n);
      }
      if (n || !o.length)
        return Bs(e, t, r, i);
      let a = o.length, u = null, l = /* @__PURE__ */ s((c) => {
        if (!u) {
          if (c)
            return i(u = c);
          if (--a === 0)
            return Bs(e, t, r, i);
        }
      }, "then");
      o.forEach((c) => jD(e, c, t, r, l));
    });
  }, "chownr"), Zx = /* @__PURE__ */ s((e, t, r, i) => {
    if (typeof t == "string")
      try {
        let n = ze.lstatSync(hr.resolve(e, t));
        n.name = t, t = n;
      } catch (n) {
        if (n.code === "ENOENT")
          return;
        throw n;
      }
    t.isDirectory() && qD(hr.resolve(e, t.name), r, i), Zu(hr.resolve(e, t.name), r, i);
  }, "chownrKidSync"), qD = /* @__PURE__ */ s((e, t, r) => {
    let i;
    try {
      i = Vx(e, { withFileTypes: !0 });
    } catch (n) {
      if (n.code === "ENOENT")
        return;
      if (n.code === "ENOTDIR" || n.code === "ENOTSUP")
        return Zu(e, t, r);
      throw n;
    }
    return i && i.length && i.forEach((n) => Zx(e, n, t, r)), Zu(e, t, r);
  }, "chownrSync");
  LD.exports = zu;
  zu.sync = qD;
});

// ../node_modules/readable-stream/lib/internal/streams/stream.js
var Gu = b((E6, UD) => {
  UD.exports = require("stream");
});

// ../node_modules/readable-stream/lib/internal/streams/buffer_list.js
var zD = b((C6, ZD) => {
  "use strict";
  function WD(e, t) {
    var r = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var i = Object.getOwnPropertySymbols(e);
      t && (i = i.filter(function(n) {
        return Object.getOwnPropertyDescriptor(e, n).enumerable;
      })), r.push.apply(r, i);
    }
    return r;
  }
  s(WD, "ownKeys");
  function $D(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t] != null ? arguments[t] : {};
      t % 2 ? WD(Object(r), !0).forEach(function(i) {
        zx(e, i, r[i]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : WD(Object(r)).forEach(function(i) {
        Object.defineProperty(e, i, Object.getOwnPropertyDescriptor(r, i));
      });
    }
    return e;
  }
  s($D, "_objectSpread");
  function zx(e, t, r) {
    return t = VD(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
  }
  s(zx, "_defineProperty");
  function Gx(e, t) {
    if (!(e instanceof t))
      throw new TypeError("Cannot call a class as a function");
  }
  s(Gx, "_classCallCheck");
  function HD(e, t) {
    for (var r = 0; r < t.length; r++) {
      var i = t[r];
      i.enumerable = i.enumerable || !1, i.configurable = !0, "value" in i && (i.writable = !0), Object.defineProperty(e, VD(i.key), i);
    }
  }
  s(HD, "_defineProperties");
  function Kx(e, t, r) {
    return t && HD(e.prototype, t), r && HD(e, r), Object.defineProperty(e, "prototype", { writable: !1 }), e;
  }
  s(Kx, "_createClass");
  function VD(e) {
    var t = Yx(e, "string");
    return typeof t == "symbol" ? t : String(t);
  }
  s(VD, "_toPropertyKey");
  function Yx(e, t) {
    if (typeof e != "object" || e === null) return e;
    var r = e[Symbol.toPrimitive];
    if (r !== void 0) {
      var i = r.call(e, t || "default");
      if (typeof i != "object") return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (t === "string" ? String : Number)(e);
  }
  s(Yx, "_toPrimitive");
  var Jx = require("buffer"), Ps = Jx.Buffer, Xx = require("util"), Ku = Xx.inspect, Qx = Ku && Ku.custom || "inspect";
  function eF(e, t, r) {
    Ps.prototype.copy.call(e, t, r);
  }
  s(eF, "copyBuffer");
  ZD.exports = /* @__PURE__ */ function() {
    function e() {
      Gx(this, e), this.head = null, this.tail = null, this.length = 0;
    }
    return s(e, "BufferList"), Kx(e, [{
      key: "push",
      value: /* @__PURE__ */ s(function(r) {
        var i = {
          data: r,
          next: null
        };
        this.length > 0 ? this.tail.next = i : this.head = i, this.tail = i, ++this.length;
      }, "push")
    }, {
      key: "unshift",
      value: /* @__PURE__ */ s(function(r) {
        var i = {
          data: r,
          next: this.head
        };
        this.length === 0 && (this.tail = i), this.head = i, ++this.length;
      }, "unshift")
    }, {
      key: "shift",
      value: /* @__PURE__ */ s(function() {
        if (this.length !== 0) {
          var r = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, r;
        }
      }, "shift")
    }, {
      key: "clear",
      value: /* @__PURE__ */ s(function() {
        this.head = this.tail = null, this.length = 0;
      }, "clear")
    }, {
      key: "join",
      value: /* @__PURE__ */ s(function(r) {
        if (this.length === 0) return "";
        for (var i = this.head, n = "" + i.data; i = i.next; ) n += r + i.data;
        return n;
      }, "join")
    }, {
      key: "concat",
      value: /* @__PURE__ */ s(function(r) {
        if (this.length === 0) return Ps.alloc(0);
        for (var i = Ps.allocUnsafe(r >>> 0), n = this.head, o = 0; n; )
          eF(n.data, i, o), o += n.data.length, n = n.next;
        return i;
      }, "concat")
      // Consumes a specified amount of bytes or characters from the buffered data.
    }, {
      key: "consume",
      value: /* @__PURE__ */ s(function(r, i) {
        var n;
        return r < this.head.data.length ? (n = this.head.data.slice(0, r), this.head.data = this.head.data.slice(r)) : r === this.head.data.
        length ? n = this.shift() : n = i ? this._getString(r) : this._getBuffer(r), n;
      }, "consume")
    }, {
      key: "first",
      value: /* @__PURE__ */ s(function() {
        return this.head.data;
      }, "first")
      // Consumes a specified amount of characters from the buffered data.
    }, {
      key: "_getString",
      value: /* @__PURE__ */ s(function(r) {
        var i = this.head, n = 1, o = i.data;
        for (r -= o.length; i = i.next; ) {
          var a = i.data, u = r > a.length ? a.length : r;
          if (u === a.length ? o += a : o += a.slice(0, r), r -= u, r === 0) {
            u === a.length ? (++n, i.next ? this.head = i.next : this.head = this.tail = null) : (this.head = i, i.data = a.slice(u));
            break;
          }
          ++n;
        }
        return this.length -= n, o;
      }, "_getString")
      // Consumes a specified amount of bytes from the buffered data.
    }, {
      key: "_getBuffer",
      value: /* @__PURE__ */ s(function(r) {
        var i = Ps.allocUnsafe(r), n = this.head, o = 1;
        for (n.data.copy(i), r -= n.data.length; n = n.next; ) {
          var a = n.data, u = r > a.length ? a.length : r;
          if (a.copy(i, i.length - r, 0, u), r -= u, r === 0) {
            u === a.length ? (++o, n.next ? this.head = n.next : this.head = this.tail = null) : (this.head = n, n.data = a.slice(u));
            break;
          }
          ++o;
        }
        return this.length -= o, i;
      }, "_getBuffer")
      // Make sure the linked list only shows the minimal necessary information.
    }, {
      key: Qx,
      value: /* @__PURE__ */ s(function(r, i) {
        return Ku(this, $D($D({}, i), {}, {
          // Only inspect one level.
          depth: 0,
          // It should not recurse.
          customInspect: !1
        }));
      }, "value")
    }]), e;
  }();
});

// ../node_modules/readable-stream/lib/internal/streams/destroy.js
var Ju = b((F6, KD) => {
  "use strict";
  function tF(e, t) {
    var r = this, i = this._readableState && this._readableState.destroyed, n = this._writableState && this._writableState.destroyed;
    return i || n ? (t ? t(e) : e && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, process.
    nextTick(Yu, this, e)) : process.nextTick(Yu, this, e)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState &&
    (this._writableState.destroyed = !0), this._destroy(e || null, function(o) {
      !t && o ? r._writableState ? r._writableState.errorEmitted ? process.nextTick(Is, r) : (r._writableState.errorEmitted = !0, process.nextTick(
      GD, r, o)) : process.nextTick(GD, r, o) : t ? (process.nextTick(Is, r), t(o)) : process.nextTick(Is, r);
    }), this);
  }
  s(tF, "destroy");
  function GD(e, t) {
    Yu(e, t), Is(e);
  }
  s(GD, "emitErrorAndCloseNT");
  function Is(e) {
    e._writableState && !e._writableState.emitClose || e._readableState && !e._readableState.emitClose || e.emit("close");
  }
  s(Is, "emitCloseNT");
  function rF() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.
    endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending =
    !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted =
    !1);
  }
  s(rF, "undestroy");
  function Yu(e, t) {
    e.emit("error", t);
  }
  s(Yu, "emitErrorNT");
  function iF(e, t) {
    var r = e._readableState, i = e._writableState;
    r && r.autoDestroy || i && i.autoDestroy ? e.destroy(t) : e.emit("error", t);
  }
  s(iF, "errorOrDestroy");
  KD.exports = {
    destroy: tF,
    undestroy: rF,
    errorOrDestroy: iF
  };
});

// ../node_modules/readable-stream/errors.js
var Yt = b((T6, XD) => {
  "use strict";
  var JD = {};
  function Ge(e, t, r) {
    r || (r = Error);
    function i(o, a, u) {
      return typeof t == "string" ? t : t(o, a, u);
    }
    s(i, "getMessage");
    class n extends r {
      static {
        s(this, "NodeError");
      }
      constructor(a, u, l) {
        super(i(a, u, l));
      }
    }
    n.prototype.name = r.name, n.prototype.code = e, JD[e] = n;
  }
  s(Ge, "createErrorType");
  function YD(e, t) {
    if (Array.isArray(e)) {
      let r = e.length;
      return e = e.map((i) => String(i)), r > 2 ? `one of ${t} ${e.slice(0, r - 1).join(", ")}, or ` + e[r - 1] : r === 2 ? `one of ${t} ${e[0]}\
 or ${e[1]}` : `of ${t} ${e[0]}`;
    } else
      return `of ${t} ${String(e)}`;
  }
  s(YD, "oneOf");
  function nF(e, t, r) {
    return e.substr(!r || r < 0 ? 0 : +r, t.length) === t;
  }
  s(nF, "startsWith");
  function sF(e, t, r) {
    return (r === void 0 || r > e.length) && (r = e.length), e.substring(r - t.length, r) === t;
  }
  s(sF, "endsWith");
  function oF(e, t, r) {
    return typeof r != "number" && (r = 0), r + t.length > e.length ? !1 : e.indexOf(t, r) !== -1;
  }
  s(oF, "includes");
  Ge("ERR_INVALID_OPT_VALUE", function(e, t) {
    return 'The value "' + t + '" is invalid for option "' + e + '"';
  }, TypeError);
  Ge("ERR_INVALID_ARG_TYPE", function(e, t, r) {
    let i;
    typeof t == "string" && nF(t, "not ") ? (i = "must not be", t = t.replace(/^not /, "")) : i = "must be";
    let n;
    if (sF(e, " argument"))
      n = `The ${e} ${i} ${YD(t, "type")}`;
    else {
      let o = oF(e, ".") ? "property" : "argument";
      n = `The "${e}" ${o} ${i} ${YD(t, "type")}`;
    }
    return n += `. Received type ${typeof r}`, n;
  }, TypeError);
  Ge("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF");
  Ge("ERR_METHOD_NOT_IMPLEMENTED", function(e) {
    return "The " + e + " method is not implemented";
  });
  Ge("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
  Ge("ERR_STREAM_DESTROYED", function(e) {
    return "Cannot call " + e + " after a stream was destroyed";
  });
  Ge("ERR_MULTIPLE_CALLBACK", "Callback called multiple times");
  Ge("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable");
  Ge("ERR_STREAM_WRITE_AFTER_END", "write after end");
  Ge("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
  Ge("ERR_UNKNOWN_ENCODING", function(e) {
    return "Unknown encoding: " + e;
  }, TypeError);
  Ge("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event");
  XD.exports.codes = JD;
});

// ../node_modules/readable-stream/lib/internal/streams/state.js
var Xu = b((R6, QD) => {
  "use strict";
  var aF = Yt().codes.ERR_INVALID_OPT_VALUE;
  function uF(e, t, r) {
    return e.highWaterMark != null ? e.highWaterMark : t ? e[r] : null;
  }
  s(uF, "highWaterMarkFrom");
  function lF(e, t, r, i) {
    var n = uF(t, i, r);
    if (n != null) {
      if (!(isFinite(n) && Math.floor(n) === n) || n < 0) {
        var o = i ? r : "highWaterMark";
        throw new aF(o, n);
      }
      return Math.floor(n);
    }
    return e.objectMode ? 16 : 16 * 1024;
  }
  s(lF, "getHighWaterMark");
  QD.exports = {
    getHighWaterMark: lF
  };
});

// ../node_modules/inherits/inherits_browser.js
var em = b((O6, Qu) => {
  typeof Object.create == "function" ? Qu.exports = /* @__PURE__ */ s(function(t, r) {
    r && (t.super_ = r, t.prototype = Object.create(r.prototype, {
      constructor: {
        value: t,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }));
  }, "inherits") : Qu.exports = /* @__PURE__ */ s(function(t, r) {
    if (r) {
      t.super_ = r;
      var i = /* @__PURE__ */ s(function() {
      }, "TempCtor");
      i.prototype = r.prototype, t.prototype = new i(), t.prototype.constructor = t;
    }
  }, "inherits");
});

// ../node_modules/inherits/inherits.js
var oe = b((P6, tl) => {
  try {
    if (el = require("util"), typeof el.inherits != "function") throw "";
    tl.exports = el.inherits;
  } catch {
    tl.exports = em();
  }
  var el;
});

// ../node_modules/util-deprecate/node.js
var rn = b((I6, tm) => {
  tm.exports = require("util").deprecate;
});

// ../node_modules/readable-stream/lib/_stream_writable.js
var nl = b((M6, am) => {
  "use strict";
  am.exports = _e;
  function im(e) {
    var t = this;
    this.next = null, this.entry = null, this.finish = function() {
      MF(t, e);
    };
  }
  s(im, "CorkedRequest");
  var ri;
  _e.WritableState = sn;
  var cF = {
    deprecate: rn()
  }, nm = Gu(), js = require("buffer").Buffer, dF = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ? self :
  {}).Uint8Array || function() {
  };
  function fF(e) {
    return js.from(e);
  }
  s(fF, "_uint8ArrayToBuffer");
  function hF(e) {
    return js.isBuffer(e) || e instanceof dF;
  }
  s(hF, "_isUint8Array");
  var il = Ju(), pF = Xu(), DF = pF.getHighWaterMark, Jt = Yt().codes, mF = Jt.ERR_INVALID_ARG_TYPE, gF = Jt.ERR_METHOD_NOT_IMPLEMENTED, yF = Jt.
  ERR_MULTIPLE_CALLBACK, bF = Jt.ERR_STREAM_CANNOT_PIPE, vF = Jt.ERR_STREAM_DESTROYED, _F = Jt.ERR_STREAM_NULL_VALUES, wF = Jt.ERR_STREAM_WRITE_AFTER_END,
  EF = Jt.ERR_UNKNOWN_ENCODING, ii = il.errorOrDestroy;
  oe()(_e, nm);
  function CF() {
  }
  s(CF, "nop");
  function sn(e, t, r) {
    ri = ri || pr(), e = e || {}, typeof r != "boolean" && (r = t instanceof ri), this.objectMode = !!e.objectMode, r && (this.objectMode = this.
    objectMode || !!e.writableObjectMode), this.highWaterMark = DF(this, e, "writableHighWaterMark", r), this.finalCalled = !1, this.needDrain =
    !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    var i = e.decodeStrings === !1;
    this.decodeStrings = !i, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync =
    !0, this.bufferProcessing = !1, this.onwrite = function(n) {
      kF(t, n);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished =
    !1, this.errorEmitted = !1, this.emitClose = e.emitClose !== !1, this.autoDestroy = !!e.autoDestroy, this.bufferedRequestCount = 0, this.
    corkedRequestsFree = new im(this);
  }
  s(sn, "WritableState");
  sn.prototype.getBuffer = /* @__PURE__ */ s(function() {
    for (var t = this.bufferedRequest, r = []; t; )
      r.push(t), t = t.next;
    return r;
  }, "getBuffer");
  (function() {
    try {
      Object.defineProperty(sn.prototype, "buffer", {
        get: cF.deprecate(/* @__PURE__ */ s(function() {
          return this.getBuffer();
        }, "writableStateBufferGetter"), "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  })();
  var Ms;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (Ms = Function.prototype[Symbol.
  hasInstance], Object.defineProperty(_e, Symbol.hasInstance, {
    value: /* @__PURE__ */ s(function(t) {
      return Ms.call(this, t) ? !0 : this !== _e ? !1 : t && t._writableState instanceof sn;
    }, "value")
  })) : Ms = /* @__PURE__ */ s(function(t) {
    return t instanceof this;
  }, "realHasInstance");
  function _e(e) {
    ri = ri || pr();
    var t = this instanceof ri;
    if (!t && !Ms.call(_e, this)) return new _e(e);
    this._writableState = new sn(e, this, t), this.writable = !0, e && (typeof e.write == "function" && (this._write = e.write), typeof e.writev ==
    "function" && (this._writev = e.writev), typeof e.destroy == "function" && (this._destroy = e.destroy), typeof e.final == "function" && (this.
    _final = e.final)), nm.call(this);
  }
  s(_e, "Writable");
  _e.prototype.pipe = function() {
    ii(this, new bF());
  };
  function xF(e, t) {
    var r = new wF();
    ii(e, r), process.nextTick(t, r);
  }
  s(xF, "writeAfterEnd");
  function FF(e, t, r, i) {
    var n;
    return r === null ? n = new _F() : typeof r != "string" && !t.objectMode && (n = new mF("chunk", ["string", "Buffer"], r)), n ? (ii(e, n),
    process.nextTick(i, n), !1) : !0;
  }
  s(FF, "validChunk");
  _e.prototype.write = function(e, t, r) {
    var i = this._writableState, n = !1, o = !i.objectMode && hF(e);
    return o && !js.isBuffer(e) && (e = fF(e)), typeof t == "function" && (r = t, t = null), o ? t = "buffer" : t || (t = i.defaultEncoding),
    typeof r != "function" && (r = CF), i.ending ? xF(this, r) : (o || FF(this, i, e, r)) && (i.pendingcb++, n = TF(this, i, o, e, t, r)), n;
  };
  _e.prototype.cork = function() {
    this._writableState.corked++;
  };
  _e.prototype.uncork = function() {
    var e = this._writableState;
    e.corked && (e.corked--, !e.writing && !e.corked && !e.bufferProcessing && e.bufferedRequest && sm(this, e));
  };
  _e.prototype.setDefaultEncoding = /* @__PURE__ */ s(function(t) {
    if (typeof t == "string" && (t = t.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "\
utf-16le", "raw"].indexOf((t + "").toLowerCase()) > -1)) throw new EF(t);
    return this._writableState.defaultEncoding = t, this;
  }, "setDefaultEncoding");
  Object.defineProperty(_e.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState && this._writableState.getBuffer();
    }, "get")
  });
  function SF(e, t, r) {
    return !e.objectMode && e.decodeStrings !== !1 && typeof t == "string" && (t = js.from(t, r)), t;
  }
  s(SF, "decodeChunk");
  Object.defineProperty(_e.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function TF(e, t, r, i, n, o) {
    if (!r) {
      var a = SF(t, i, n);
      i !== a && (r = !0, n = "buffer", i = a);
    }
    var u = t.objectMode ? 1 : i.length;
    t.length += u;
    var l = t.length < t.highWaterMark;
    if (l || (t.needDrain = !0), t.writing || t.corked) {
      var c = t.lastBufferedRequest;
      t.lastBufferedRequest = {
        chunk: i,
        encoding: n,
        isBuf: r,
        callback: o,
        next: null
      }, c ? c.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest, t.bufferedRequestCount += 1;
    } else
      rl(e, t, !1, u, i, n, o);
    return l;
  }
  s(TF, "writeOrBuffer");
  function rl(e, t, r, i, n, o, a) {
    t.writelen = i, t.writecb = a, t.writing = !0, t.sync = !0, t.destroyed ? t.onwrite(new vF("write")) : r ? e._writev(n, t.onwrite) : e._write(
    n, o, t.onwrite), t.sync = !1;
  }
  s(rl, "doWrite");
  function AF(e, t, r, i, n) {
    --t.pendingcb, r ? (process.nextTick(n, i), process.nextTick(nn, e, t), e._writableState.errorEmitted = !0, ii(e, i)) : (n(i), e._writableState.
    errorEmitted = !0, ii(e, i), nn(e, t));
  }
  s(AF, "onwriteError");
  function RF(e) {
    e.writing = !1, e.writecb = null, e.length -= e.writelen, e.writelen = 0;
  }
  s(RF, "onwriteStateUpdate");
  function kF(e, t) {
    var r = e._writableState, i = r.sync, n = r.writecb;
    if (typeof n != "function") throw new yF();
    if (RF(r), t) AF(e, r, i, t, n);
    else {
      var o = om(r) || e.destroyed;
      !o && !r.corked && !r.bufferProcessing && r.bufferedRequest && sm(e, r), i ? process.nextTick(rm, e, r, o, n) : rm(e, r, o, n);
    }
  }
  s(kF, "onwrite");
  function rm(e, t, r, i) {
    r || OF(e, t), t.pendingcb--, i(), nn(e, t);
  }
  s(rm, "afterWrite");
  function OF(e, t) {
    t.length === 0 && t.needDrain && (t.needDrain = !1, e.emit("drain"));
  }
  s(OF, "onwriteDrain");
  function sm(e, t) {
    t.bufferProcessing = !0;
    var r = t.bufferedRequest;
    if (e._writev && r && r.next) {
      var i = t.bufferedRequestCount, n = new Array(i), o = t.corkedRequestsFree;
      o.entry = r;
      for (var a = 0, u = !0; r; )
        n[a] = r, r.isBuf || (u = !1), r = r.next, a += 1;
      n.allBuffers = u, rl(e, t, !0, t.length, n, "", o.finish), t.pendingcb++, t.lastBufferedRequest = null, o.next ? (t.corkedRequestsFree =
      o.next, o.next = null) : t.corkedRequestsFree = new im(t), t.bufferedRequestCount = 0;
    } else {
      for (; r; ) {
        var l = r.chunk, c = r.encoding, d = r.callback, p = t.objectMode ? 1 : l.length;
        if (rl(e, t, !1, p, l, c, d), r = r.next, t.bufferedRequestCount--, t.writing)
          break;
      }
      r === null && (t.lastBufferedRequest = null);
    }
    t.bufferedRequest = r, t.bufferProcessing = !1;
  }
  s(sm, "clearBuffer");
  _e.prototype._write = function(e, t, r) {
    r(new gF("_write()"));
  };
  _e.prototype._writev = null;
  _e.prototype.end = function(e, t, r) {
    var i = this._writableState;
    return typeof e == "function" ? (r = e, e = null, t = null) : typeof t == "function" && (r = t, t = null), e != null && this.write(e, t),
    i.corked && (i.corked = 1, this.uncork()), i.ending || IF(this, i, r), this;
  };
  Object.defineProperty(_e.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.length;
    }, "get")
  });
  function om(e) {
    return e.ending && e.length === 0 && e.bufferedRequest === null && !e.finished && !e.writing;
  }
  s(om, "needFinish");
  function BF(e, t) {
    e._final(function(r) {
      t.pendingcb--, r && ii(e, r), t.prefinished = !0, e.emit("prefinish"), nn(e, t);
    });
  }
  s(BF, "callFinal");
  function PF(e, t) {
    !t.prefinished && !t.finalCalled && (typeof e._final == "function" && !t.destroyed ? (t.pendingcb++, t.finalCalled = !0, process.nextTick(
    BF, e, t)) : (t.prefinished = !0, e.emit("prefinish")));
  }
  s(PF, "prefinish");
  function nn(e, t) {
    var r = om(t);
    if (r && (PF(e, t), t.pendingcb === 0 && (t.finished = !0, e.emit("finish"), t.autoDestroy))) {
      var i = e._readableState;
      (!i || i.autoDestroy && i.endEmitted) && e.destroy();
    }
    return r;
  }
  s(nn, "finishMaybe");
  function IF(e, t, r) {
    t.ending = !0, nn(e, t), r && (t.finished ? process.nextTick(r) : e.once("finish", r)), t.ended = !0, e.writable = !1;
  }
  s(IF, "endWritable");
  function MF(e, t, r) {
    var i = e.entry;
    for (e.entry = null; i; ) {
      var n = i.callback;
      t.pendingcb--, n(r), i = i.next;
    }
    t.corkedRequestsFree.next = e;
  }
  s(MF, "onCorkedFinish");
  Object.defineProperty(_e.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(t) {
      this._writableState && (this._writableState.destroyed = t);
    }, "set")
  });
  _e.prototype.destroy = il.destroy;
  _e.prototype._undestroy = il.undestroy;
  _e.prototype._destroy = function(e, t) {
    t(e);
  };
});

// ../node_modules/readable-stream/lib/_stream_duplex.js
var pr = b((q6, lm) => {
  "use strict";
  var jF = Object.keys || function(e) {
    var t = [];
    for (var r in e) t.push(r);
    return t;
  };
  lm.exports = ht;
  var um = al(), ol = nl();
  oe()(ht, um);
  for (sl = jF(ol.prototype), qs = 0; qs < sl.length; qs++)
    Ls = sl[qs], ht.prototype[Ls] || (ht.prototype[Ls] = ol.prototype[Ls]);
  var sl, Ls, qs;
  function ht(e) {
    if (!(this instanceof ht)) return new ht(e);
    um.call(this, e), ol.call(this, e), this.allowHalfOpen = !0, e && (e.readable === !1 && (this.readable = !1), e.writable === !1 && (this.
    writable = !1), e.allowHalfOpen === !1 && (this.allowHalfOpen = !1, this.once("end", qF)));
  }
  s(ht, "Duplex");
  Object.defineProperty(ht.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  Object.defineProperty(ht.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState && this._writableState.getBuffer();
    }, "get")
  });
  Object.defineProperty(ht.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.length;
    }, "get")
  });
  function qF() {
    this._writableState.ended || process.nextTick(LF, this);
  }
  s(qF, "onend");
  function LF(e) {
    e.end();
  }
  s(LF, "onEndNT");
  Object.defineProperty(ht.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(t) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = t, this._writableState.destroyed =
      t);
    }, "set")
  });
});

// ../node_modules/readable-stream/lib/internal/streams/end-of-stream.js
var Ns = b((N6, fm) => {
  "use strict";
  var cm = Yt().codes.ERR_STREAM_PREMATURE_CLOSE;
  function NF(e) {
    var t = !1;
    return function() {
      if (!t) {
        t = !0;
        for (var r = arguments.length, i = new Array(r), n = 0; n < r; n++)
          i[n] = arguments[n];
        e.apply(this, i);
      }
    };
  }
  s(NF, "once");
  function UF() {
  }
  s(UF, "noop");
  function WF(e) {
    return e.setHeader && typeof e.abort == "function";
  }
  s(WF, "isRequest");
  function dm(e, t, r) {
    if (typeof t == "function") return dm(e, null, t);
    t || (t = {}), r = NF(r || UF);
    var i = t.readable || t.readable !== !1 && e.readable, n = t.writable || t.writable !== !1 && e.writable, o = /* @__PURE__ */ s(function() {
      e.writable || u();
    }, "onlegacyfinish"), a = e._writableState && e._writableState.finished, u = /* @__PURE__ */ s(function() {
      n = !1, a = !0, i || r.call(e);
    }, "onfinish"), l = e._readableState && e._readableState.endEmitted, c = /* @__PURE__ */ s(function() {
      i = !1, l = !0, n || r.call(e);
    }, "onend"), d = /* @__PURE__ */ s(function(g) {
      r.call(e, g);
    }, "onerror"), p = /* @__PURE__ */ s(function() {
      var g;
      if (i && !l)
        return (!e._readableState || !e._readableState.ended) && (g = new cm()), r.call(e, g);
      if (n && !a)
        return (!e._writableState || !e._writableState.ended) && (g = new cm()), r.call(e, g);
    }, "onclose"), h = /* @__PURE__ */ s(function() {
      e.req.on("finish", u);
    }, "onrequest");
    return WF(e) ? (e.on("complete", u), e.on("abort", p), e.req ? h() : e.on("request", h)) : n && !e._writableState && (e.on("end", o), e.
    on("close", o)), e.on("end", c), e.on("finish", u), t.error !== !1 && e.on("error", d), e.on("close", p), function() {
      e.removeListener("complete", u), e.removeListener("abort", p), e.removeListener("request", h), e.req && e.req.removeListener("finish",
      u), e.removeListener("end", o), e.removeListener("close", o), e.removeListener("finish", u), e.removeListener("end", c), e.removeListener(
      "error", d), e.removeListener("close", p);
    };
  }
  s(dm, "eos");
  fm.exports = dm;
});

// ../node_modules/readable-stream/lib/internal/streams/async_iterator.js
var pm = b((W6, hm) => {
  "use strict";
  var Us;
  function Xt(e, t, r) {
    return t = $F(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
  }
  s(Xt, "_defineProperty");
  function $F(e) {
    var t = HF(e, "string");
    return typeof t == "symbol" ? t : String(t);
  }
  s($F, "_toPropertyKey");
  function HF(e, t) {
    if (typeof e != "object" || e === null) return e;
    var r = e[Symbol.toPrimitive];
    if (r !== void 0) {
      var i = r.call(e, t || "default");
      if (typeof i != "object") return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (t === "string" ? String : Number)(e);
  }
  s(HF, "_toPrimitive");
  var VF = Ns(), Qt = Symbol("lastResolve"), Dr = Symbol("lastReject"), on = Symbol("error"), Ws = Symbol("ended"), mr = Symbol("lastPromise"),
  ul = Symbol("handlePromise"), gr = Symbol("stream");
  function er(e, t) {
    return {
      value: e,
      done: t
    };
  }
  s(er, "createIterResult");
  function ZF(e) {
    var t = e[Qt];
    if (t !== null) {
      var r = e[gr].read();
      r !== null && (e[mr] = null, e[Qt] = null, e[Dr] = null, t(er(r, !1)));
    }
  }
  s(ZF, "readAndResolve");
  function zF(e) {
    process.nextTick(ZF, e);
  }
  s(zF, "onReadable");
  function GF(e, t) {
    return function(r, i) {
      e.then(function() {
        if (t[Ws]) {
          r(er(void 0, !0));
          return;
        }
        t[ul](r, i);
      }, i);
    };
  }
  s(GF, "wrapForNext");
  var KF = Object.getPrototypeOf(function() {
  }), YF = Object.setPrototypeOf((Us = {
    get stream() {
      return this[gr];
    },
    next: /* @__PURE__ */ s(function() {
      var t = this, r = this[on];
      if (r !== null)
        return Promise.reject(r);
      if (this[Ws])
        return Promise.resolve(er(void 0, !0));
      if (this[gr].destroyed)
        return new Promise(function(a, u) {
          process.nextTick(function() {
            t[on] ? u(t[on]) : a(er(void 0, !0));
          });
        });
      var i = this[mr], n;
      if (i)
        n = new Promise(GF(i, this));
      else {
        var o = this[gr].read();
        if (o !== null)
          return Promise.resolve(er(o, !1));
        n = new Promise(this[ul]);
      }
      return this[mr] = n, n;
    }, "next")
  }, Xt(Us, Symbol.asyncIterator, function() {
    return this;
  }), Xt(Us, "return", /* @__PURE__ */ s(function() {
    var t = this;
    return new Promise(function(r, i) {
      t[gr].destroy(null, function(n) {
        if (n) {
          i(n);
          return;
        }
        r(er(void 0, !0));
      });
    });
  }, "_return")), Us), KF), JF = /* @__PURE__ */ s(function(t) {
    var r, i = Object.create(YF, (r = {}, Xt(r, gr, {
      value: t,
      writable: !0
    }), Xt(r, Qt, {
      value: null,
      writable: !0
    }), Xt(r, Dr, {
      value: null,
      writable: !0
    }), Xt(r, on, {
      value: null,
      writable: !0
    }), Xt(r, Ws, {
      value: t._readableState.endEmitted,
      writable: !0
    }), Xt(r, ul, {
      value: /* @__PURE__ */ s(function(o, a) {
        var u = i[gr].read();
        u ? (i[mr] = null, i[Qt] = null, i[Dr] = null, o(er(u, !1))) : (i[Qt] = o, i[Dr] = a);
      }, "value"),
      writable: !0
    }), r));
    return i[mr] = null, VF(t, function(n) {
      if (n && n.code !== "ERR_STREAM_PREMATURE_CLOSE") {
        var o = i[Dr];
        o !== null && (i[mr] = null, i[Qt] = null, i[Dr] = null, o(n)), i[on] = n;
        return;
      }
      var a = i[Qt];
      a !== null && (i[mr] = null, i[Qt] = null, i[Dr] = null, a(er(void 0, !0))), i[Ws] = !0;
    }), t.on("readable", zF.bind(null, i)), i;
  }, "createReadableStreamAsyncIterator");
  hm.exports = JF;
});

// ../node_modules/readable-stream/lib/internal/streams/from.js
var ym = b((H6, gm) => {
  "use strict";
  function Dm(e, t, r, i, n, o, a) {
    try {
      var u = e[o](a), l = u.value;
    } catch (c) {
      r(c);
      return;
    }
    u.done ? t(l) : Promise.resolve(l).then(i, n);
  }
  s(Dm, "asyncGeneratorStep");
  function XF(e) {
    return function() {
      var t = this, r = arguments;
      return new Promise(function(i, n) {
        var o = e.apply(t, r);
        function a(l) {
          Dm(o, i, n, a, u, "next", l);
        }
        s(a, "_next");
        function u(l) {
          Dm(o, i, n, a, u, "throw", l);
        }
        s(u, "_throw"), a(void 0);
      });
    };
  }
  s(XF, "_asyncToGenerator");
  function mm(e, t) {
    var r = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var i = Object.getOwnPropertySymbols(e);
      t && (i = i.filter(function(n) {
        return Object.getOwnPropertyDescriptor(e, n).enumerable;
      })), r.push.apply(r, i);
    }
    return r;
  }
  s(mm, "ownKeys");
  function QF(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t] != null ? arguments[t] : {};
      t % 2 ? mm(Object(r), !0).forEach(function(i) {
        e2(e, i, r[i]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : mm(Object(r)).forEach(function(i) {
        Object.defineProperty(e, i, Object.getOwnPropertyDescriptor(r, i));
      });
    }
    return e;
  }
  s(QF, "_objectSpread");
  function e2(e, t, r) {
    return t = t2(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
  }
  s(e2, "_defineProperty");
  function t2(e) {
    var t = r2(e, "string");
    return typeof t == "symbol" ? t : String(t);
  }
  s(t2, "_toPropertyKey");
  function r2(e, t) {
    if (typeof e != "object" || e === null) return e;
    var r = e[Symbol.toPrimitive];
    if (r !== void 0) {
      var i = r.call(e, t || "default");
      if (typeof i != "object") return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (t === "string" ? String : Number)(e);
  }
  s(r2, "_toPrimitive");
  var i2 = Yt().codes.ERR_INVALID_ARG_TYPE;
  function n2(e, t, r) {
    var i;
    if (t && typeof t.next == "function")
      i = t;
    else if (t && t[Symbol.asyncIterator]) i = t[Symbol.asyncIterator]();
    else if (t && t[Symbol.iterator]) i = t[Symbol.iterator]();
    else throw new i2("iterable", ["Iterable"], t);
    var n = new e(QF({
      objectMode: !0
    }, r)), o = !1;
    n._read = function() {
      o || (o = !0, a());
    };
    function a() {
      return u.apply(this, arguments);
    }
    s(a, "next");
    function u() {
      return u = XF(function* () {
        try {
          var l = yield i.next(), c = l.value, d = l.done;
          d ? n.push(null) : n.push(yield c) ? a() : o = !1;
        } catch (p) {
          n.destroy(p);
        }
      }), u.apply(this, arguments);
    }
    return s(u, "_next2"), n;
  }
  s(n2, "from");
  gm.exports = n2;
});

// ../node_modules/readable-stream/lib/_stream_readable.js
var al = b((z6, Tm) => {
  "use strict";
  Tm.exports = G;
  var ni;
  G.ReadableState = wm;
  var Z6 = require("events").EventEmitter, _m = /* @__PURE__ */ s(function(t, r) {
    return t.listeners(r).length;
  }, "EElistenerCount"), un = Gu(), $s = require("buffer").Buffer, s2 = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self <
  "u" ? self : {}).Uint8Array || function() {
  };
  function o2(e) {
    return $s.from(e);
  }
  s(o2, "_uint8ArrayToBuffer");
  function a2(e) {
    return $s.isBuffer(e) || e instanceof s2;
  }
  s(a2, "_isUint8Array");
  var ll = require("util"), V;
  ll && ll.debuglog ? V = ll.debuglog("stream") : V = /* @__PURE__ */ s(function() {
  }, "debug");
  var u2 = zD(), ml = Ju(), l2 = Xu(), c2 = l2.getHighWaterMark, Hs = Yt().codes, d2 = Hs.ERR_INVALID_ARG_TYPE, f2 = Hs.ERR_STREAM_PUSH_AFTER_EOF,
  h2 = Hs.ERR_METHOD_NOT_IMPLEMENTED, p2 = Hs.ERR_STREAM_UNSHIFT_AFTER_END_EVENT, si, cl, dl;
  oe()(G, un);
  var an = ml.errorOrDestroy, fl = ["error", "close", "destroy", "pause", "resume"];
  function D2(e, t, r) {
    if (typeof e.prependListener == "function") return e.prependListener(t, r);
    !e._events || !e._events[t] ? e.on(t, r) : Array.isArray(e._events[t]) ? e._events[t].unshift(r) : e._events[t] = [r, e._events[t]];
  }
  s(D2, "prependListener");
  function wm(e, t, r) {
    ni = ni || pr(), e = e || {}, typeof r != "boolean" && (r = t instanceof ni), this.objectMode = !!e.objectMode, r && (this.objectMode = this.
    objectMode || !!e.readableObjectMode), this.highWaterMark = c2(this, e, "readableHighWaterMark", r), this.buffer = new u2(), this.length =
    0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0,
    this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.paused = !0, this.emitClose =
    e.emitClose !== !1, this.autoDestroy = !!e.autoDestroy, this.destroyed = !1, this.defaultEncoding = e.defaultEncoding || "utf8", this.awaitDrain =
    0, this.readingMore = !1, this.decoder = null, this.encoding = null, e.encoding && (si || (si = require("string_decoder/").StringDecoder),
    this.decoder = new si(e.encoding), this.encoding = e.encoding);
  }
  s(wm, "ReadableState");
  function G(e) {
    if (ni = ni || pr(), !(this instanceof G)) return new G(e);
    var t = this instanceof ni;
    this._readableState = new wm(e, this, t), this.readable = !0, e && (typeof e.read == "function" && (this._read = e.read), typeof e.destroy ==
    "function" && (this._destroy = e.destroy)), un.call(this);
  }
  s(G, "Readable");
  Object.defineProperty(G.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(t) {
      this._readableState && (this._readableState.destroyed = t);
    }, "set")
  });
  G.prototype.destroy = ml.destroy;
  G.prototype._undestroy = ml.undestroy;
  G.prototype._destroy = function(e, t) {
    t(e);
  };
  G.prototype.push = function(e, t) {
    var r = this._readableState, i;
    return r.objectMode ? i = !0 : typeof e == "string" && (t = t || r.defaultEncoding, t !== r.encoding && (e = $s.from(e, t), t = ""), i =
    !0), Em(this, e, t, !1, i);
  };
  G.prototype.unshift = function(e) {
    return Em(this, e, null, !0, !1);
  };
  function Em(e, t, r, i, n) {
    V("readableAddChunk", t);
    var o = e._readableState;
    if (t === null)
      o.reading = !1, y2(e, o);
    else {
      var a;
      if (n || (a = m2(o, t)), a)
        an(e, a);
      else if (o.objectMode || t && t.length > 0)
        if (typeof t != "string" && !o.objectMode && Object.getPrototypeOf(t) !== $s.prototype && (t = o2(t)), i)
          o.endEmitted ? an(e, new p2()) : hl(e, o, t, !0);
        else if (o.ended)
          an(e, new f2());
        else {
          if (o.destroyed)
            return !1;
          o.reading = !1, o.decoder && !r ? (t = o.decoder.write(t), o.objectMode || t.length !== 0 ? hl(e, o, t, !1) : Dl(e, o)) : hl(e, o,
          t, !1);
        }
      else i || (o.reading = !1, Dl(e, o));
    }
    return !o.ended && (o.length < o.highWaterMark || o.length === 0);
  }
  s(Em, "readableAddChunk");
  function hl(e, t, r, i) {
    t.flowing && t.length === 0 && !t.sync ? (t.awaitDrain = 0, e.emit("data", r)) : (t.length += t.objectMode ? 1 : r.length, i ? t.buffer.
    unshift(r) : t.buffer.push(r), t.needReadable && Vs(e)), Dl(e, t);
  }
  s(hl, "addChunk");
  function m2(e, t) {
    var r;
    return !a2(t) && typeof t != "string" && t !== void 0 && !e.objectMode && (r = new d2("chunk", ["string", "Buffer", "Uint8Array"], t)), r;
  }
  s(m2, "chunkInvalid");
  G.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  };
  G.prototype.setEncoding = function(e) {
    si || (si = require("string_decoder/").StringDecoder);
    var t = new si(e);
    this._readableState.decoder = t, this._readableState.encoding = this._readableState.decoder.encoding;
    for (var r = this._readableState.buffer.head, i = ""; r !== null; )
      i += t.write(r.data), r = r.next;
    return this._readableState.buffer.clear(), i !== "" && this._readableState.buffer.push(i), this._readableState.length = i.length, this;
  };
  var bm = 1073741824;
  function g2(e) {
    return e >= bm ? e = bm : (e--, e |= e >>> 1, e |= e >>> 2, e |= e >>> 4, e |= e >>> 8, e |= e >>> 16, e++), e;
  }
  s(g2, "computeNewHighWaterMark");
  function vm(e, t) {
    return e <= 0 || t.length === 0 && t.ended ? 0 : t.objectMode ? 1 : e !== e ? t.flowing && t.length ? t.buffer.head.data.length : t.length :
    (e > t.highWaterMark && (t.highWaterMark = g2(e)), e <= t.length ? e : t.ended ? t.length : (t.needReadable = !0, 0));
  }
  s(vm, "howMuchToRead");
  G.prototype.read = function(e) {
    V("read", e), e = parseInt(e, 10);
    var t = this._readableState, r = e;
    if (e !== 0 && (t.emittedReadable = !1), e === 0 && t.needReadable && ((t.highWaterMark !== 0 ? t.length >= t.highWaterMark : t.length >
    0) || t.ended))
      return V("read: emitReadable", t.length, t.ended), t.length === 0 && t.ended ? pl(this) : Vs(this), null;
    if (e = vm(e, t), e === 0 && t.ended)
      return t.length === 0 && pl(this), null;
    var i = t.needReadable;
    V("need readable", i), (t.length === 0 || t.length - e < t.highWaterMark) && (i = !0, V("length less than watermark", i)), t.ended || t.
    reading ? (i = !1, V("reading or ended", i)) : i && (V("do read"), t.reading = !0, t.sync = !0, t.length === 0 && (t.needReadable = !0),
    this._read(t.highWaterMark), t.sync = !1, t.reading || (e = vm(r, t)));
    var n;
    return e > 0 ? n = Fm(e, t) : n = null, n === null ? (t.needReadable = t.length <= t.highWaterMark, e = 0) : (t.length -= e, t.awaitDrain =
    0), t.length === 0 && (t.ended || (t.needReadable = !0), r !== e && t.ended && pl(this)), n !== null && this.emit("data", n), n;
  };
  function y2(e, t) {
    if (V("onEofChunk"), !t.ended) {
      if (t.decoder) {
        var r = t.decoder.end();
        r && r.length && (t.buffer.push(r), t.length += t.objectMode ? 1 : r.length);
      }
      t.ended = !0, t.sync ? Vs(e) : (t.needReadable = !1, t.emittedReadable || (t.emittedReadable = !0, Cm(e)));
    }
  }
  s(y2, "onEofChunk");
  function Vs(e) {
    var t = e._readableState;
    V("emitReadable", t.needReadable, t.emittedReadable), t.needReadable = !1, t.emittedReadable || (V("emitReadable", t.flowing), t.emittedReadable =
    !0, process.nextTick(Cm, e));
  }
  s(Vs, "emitReadable");
  function Cm(e) {
    var t = e._readableState;
    V("emitReadable_", t.destroyed, t.length, t.ended), !t.destroyed && (t.length || t.ended) && (e.emit("readable"), t.emittedReadable = !1),
    t.needReadable = !t.flowing && !t.ended && t.length <= t.highWaterMark, gl(e);
  }
  s(Cm, "emitReadable_");
  function Dl(e, t) {
    t.readingMore || (t.readingMore = !0, process.nextTick(b2, e, t));
  }
  s(Dl, "maybeReadMore");
  function b2(e, t) {
    for (; !t.reading && !t.ended && (t.length < t.highWaterMark || t.flowing && t.length === 0); ) {
      var r = t.length;
      if (V("maybeReadMore read 0"), e.read(0), r === t.length)
        break;
    }
    t.readingMore = !1;
  }
  s(b2, "maybeReadMore_");
  G.prototype._read = function(e) {
    an(this, new h2("_read()"));
  };
  G.prototype.pipe = function(e, t) {
    var r = this, i = this._readableState;
    switch (i.pipesCount) {
      case 0:
        i.pipes = e;
        break;
      case 1:
        i.pipes = [i.pipes, e];
        break;
      default:
        i.pipes.push(e);
        break;
    }
    i.pipesCount += 1, V("pipe count=%d opts=%j", i.pipesCount, t);
    var n = (!t || t.end !== !1) && e !== process.stdout && e !== process.stderr, o = n ? u : E;
    i.endEmitted ? process.nextTick(o) : r.once("end", o), e.on("unpipe", a);
    function a(_, C) {
      V("onunpipe"), _ === r && C && C.hasUnpiped === !1 && (C.hasUnpiped = !0, d());
    }
    s(a, "onunpipe");
    function u() {
      V("onend"), e.end();
    }
    s(u, "onend");
    var l = v2(r);
    e.on("drain", l);
    var c = !1;
    function d() {
      V("cleanup"), e.removeListener("close", f), e.removeListener("finish", g), e.removeListener("drain", l), e.removeListener("error", h),
      e.removeListener("unpipe", a), r.removeListener("end", u), r.removeListener("end", E), r.removeListener("data", p), c = !0, i.awaitDrain &&
      (!e._writableState || e._writableState.needDrain) && l();
    }
    s(d, "cleanup"), r.on("data", p);
    function p(_) {
      V("ondata");
      var C = e.write(_);
      V("dest.write", C), C === !1 && ((i.pipesCount === 1 && i.pipes === e || i.pipesCount > 1 && Sm(i.pipes, e) !== -1) && !c && (V("false\
 write response, pause", i.awaitDrain), i.awaitDrain++), r.pause());
    }
    s(p, "ondata");
    function h(_) {
      V("onerror", _), E(), e.removeListener("error", h), _m(e, "error") === 0 && an(e, _);
    }
    s(h, "onerror"), D2(e, "error", h);
    function f() {
      e.removeListener("finish", g), E();
    }
    s(f, "onclose"), e.once("close", f);
    function g() {
      V("onfinish"), e.removeListener("close", f), E();
    }
    s(g, "onfinish"), e.once("finish", g);
    function E() {
      V("unpipe"), r.unpipe(e);
    }
    return s(E, "unpipe"), e.emit("pipe", r), i.flowing || (V("pipe resume"), r.resume()), e;
  };
  function v2(e) {
    return /* @__PURE__ */ s(function() {
      var r = e._readableState;
      V("pipeOnDrain", r.awaitDrain), r.awaitDrain && r.awaitDrain--, r.awaitDrain === 0 && _m(e, "data") && (r.flowing = !0, gl(e));
    }, "pipeOnDrainFunctionResult");
  }
  s(v2, "pipeOnDrain");
  G.prototype.unpipe = function(e) {
    var t = this._readableState, r = {
      hasUnpiped: !1
    };
    if (t.pipesCount === 0) return this;
    if (t.pipesCount === 1)
      return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, t.flowing = !1, e && e.emit("unpipe", this, r),
      this);
    if (!e) {
      var i = t.pipes, n = t.pipesCount;
      t.pipes = null, t.pipesCount = 0, t.flowing = !1;
      for (var o = 0; o < n; o++) i[o].emit("unpipe", this, {
        hasUnpiped: !1
      });
      return this;
    }
    var a = Sm(t.pipes, e);
    return a === -1 ? this : (t.pipes.splice(a, 1), t.pipesCount -= 1, t.pipesCount === 1 && (t.pipes = t.pipes[0]), e.emit("unpipe", this, r),
    this);
  };
  G.prototype.on = function(e, t) {
    var r = un.prototype.on.call(this, e, t), i = this._readableState;
    return e === "data" ? (i.readableListening = this.listenerCount("readable") > 0, i.flowing !== !1 && this.resume()) : e === "readable" &&
    !i.endEmitted && !i.readableListening && (i.readableListening = i.needReadable = !0, i.flowing = !1, i.emittedReadable = !1, V("on reada\
ble", i.length, i.reading), i.length ? Vs(this) : i.reading || process.nextTick(_2, this)), r;
  };
  G.prototype.addListener = G.prototype.on;
  G.prototype.removeListener = function(e, t) {
    var r = un.prototype.removeListener.call(this, e, t);
    return e === "readable" && process.nextTick(xm, this), r;
  };
  G.prototype.removeAllListeners = function(e) {
    var t = un.prototype.removeAllListeners.apply(this, arguments);
    return (e === "readable" || e === void 0) && process.nextTick(xm, this), t;
  };
  function xm(e) {
    var t = e._readableState;
    t.readableListening = e.listenerCount("readable") > 0, t.resumeScheduled && !t.paused ? t.flowing = !0 : e.listenerCount("data") > 0 && e.
    resume();
  }
  s(xm, "updateReadableListening");
  function _2(e) {
    V("readable nexttick read 0"), e.read(0);
  }
  s(_2, "nReadingNextTick");
  G.prototype.resume = function() {
    var e = this._readableState;
    return e.flowing || (V("resume"), e.flowing = !e.readableListening, w2(this, e)), e.paused = !1, this;
  };
  function w2(e, t) {
    t.resumeScheduled || (t.resumeScheduled = !0, process.nextTick(E2, e, t));
  }
  s(w2, "resume");
  function E2(e, t) {
    V("resume", t.reading), t.reading || e.read(0), t.resumeScheduled = !1, e.emit("resume"), gl(e), t.flowing && !t.reading && e.read(0);
  }
  s(E2, "resume_");
  G.prototype.pause = function() {
    return V("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (V("pause"), this._readableState.flowing =
    !1, this.emit("pause")), this._readableState.paused = !0, this;
  };
  function gl(e) {
    var t = e._readableState;
    for (V("flow", t.flowing); t.flowing && e.read() !== null; ) ;
  }
  s(gl, "flow");
  G.prototype.wrap = function(e) {
    var t = this, r = this._readableState, i = !1;
    e.on("end", function() {
      if (V("wrapped end"), r.decoder && !r.ended) {
        var a = r.decoder.end();
        a && a.length && t.push(a);
      }
      t.push(null);
    }), e.on("data", function(a) {
      if (V("wrapped data"), r.decoder && (a = r.decoder.write(a)), !(r.objectMode && a == null) && !(!r.objectMode && (!a || !a.length))) {
        var u = t.push(a);
        u || (i = !0, e.pause());
      }
    });
    for (var n in e)
      this[n] === void 0 && typeof e[n] == "function" && (this[n] = (/* @__PURE__ */ s(function(u) {
        return /* @__PURE__ */ s(function() {
          return e[u].apply(e, arguments);
        }, "methodWrapReturnFunction");
      }, "methodWrap"))(n));
    for (var o = 0; o < fl.length; o++)
      e.on(fl[o], this.emit.bind(this, fl[o]));
    return this._read = function(a) {
      V("wrapped _read", a), i && (i = !1, e.resume());
    }, this;
  };
  typeof Symbol == "function" && (G.prototype[Symbol.asyncIterator] = function() {
    return cl === void 0 && (cl = pm()), cl(this);
  });
  Object.defineProperty(G.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState.highWaterMark;
    }, "get")
  });
  Object.defineProperty(G.prototype, "readableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState && this._readableState.buffer;
    }, "get")
  });
  Object.defineProperty(G.prototype, "readableFlowing", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState.flowing;
    }, "get"),
    set: /* @__PURE__ */ s(function(t) {
      this._readableState && (this._readableState.flowing = t);
    }, "set")
  });
  G._fromList = Fm;
  Object.defineProperty(G.prototype, "readableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState.length;
    }, "get")
  });
  function Fm(e, t) {
    if (t.length === 0) return null;
    var r;
    return t.objectMode ? r = t.buffer.shift() : !e || e >= t.length ? (t.decoder ? r = t.buffer.join("") : t.buffer.length === 1 ? r = t.buffer.
    first() : r = t.buffer.concat(t.length), t.buffer.clear()) : r = t.buffer.consume(e, t.decoder), r;
  }
  s(Fm, "fromList");
  function pl(e) {
    var t = e._readableState;
    V("endReadable", t.endEmitted), t.endEmitted || (t.ended = !0, process.nextTick(C2, t, e));
  }
  s(pl, "endReadable");
  function C2(e, t) {
    if (V("endReadableNT", e.endEmitted, e.length), !e.endEmitted && e.length === 0 && (e.endEmitted = !0, t.readable = !1, t.emit("end"), e.
    autoDestroy)) {
      var r = t._writableState;
      (!r || r.autoDestroy && r.finished) && t.destroy();
    }
  }
  s(C2, "endReadableNT");
  typeof Symbol == "function" && (G.from = function(e, t) {
    return dl === void 0 && (dl = ym()), dl(G, e, t);
  });
  function Sm(e, t) {
    for (var r = 0, i = e.length; r < i; r++)
      if (e[r] === t) return r;
    return -1;
  }
  s(Sm, "indexOf");
});

// ../node_modules/readable-stream/lib/_stream_transform.js
var yl = b((K6, Rm) => {
  "use strict";
  Rm.exports = At;
  var Zs = Yt().codes, x2 = Zs.ERR_METHOD_NOT_IMPLEMENTED, F2 = Zs.ERR_MULTIPLE_CALLBACK, S2 = Zs.ERR_TRANSFORM_ALREADY_TRANSFORMING, T2 = Zs.
  ERR_TRANSFORM_WITH_LENGTH_0, zs = pr();
  oe()(At, zs);
  function A2(e, t) {
    var r = this._transformState;
    r.transforming = !1;
    var i = r.writecb;
    if (i === null)
      return this.emit("error", new F2());
    r.writechunk = null, r.writecb = null, t != null && this.push(t), i(e);
    var n = this._readableState;
    n.reading = !1, (n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
  }
  s(A2, "afterTransform");
  function At(e) {
    if (!(this instanceof At)) return new At(e);
    zs.call(this, e), this._transformState = {
      afterTransform: A2.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, e && (typeof e.transform == "function" && (this._transform = e.
    transform), typeof e.flush == "function" && (this._flush = e.flush)), this.on("prefinish", R2);
  }
  s(At, "Transform");
  function R2() {
    var e = this;
    typeof this._flush == "function" && !this._readableState.destroyed ? this._flush(function(t, r) {
      Am(e, t, r);
    }) : Am(this, null, null);
  }
  s(R2, "prefinish");
  At.prototype.push = function(e, t) {
    return this._transformState.needTransform = !1, zs.prototype.push.call(this, e, t);
  };
  At.prototype._transform = function(e, t, r) {
    r(new x2("_transform()"));
  };
  At.prototype._write = function(e, t, r) {
    var i = this._transformState;
    if (i.writecb = r, i.writechunk = e, i.writeencoding = t, !i.transforming) {
      var n = this._readableState;
      (i.needTransform || n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
    }
  };
  At.prototype._read = function(e) {
    var t = this._transformState;
    t.writechunk !== null && !t.transforming ? (t.transforming = !0, this._transform(t.writechunk, t.writeencoding, t.afterTransform)) : t.needTransform =
    !0;
  };
  At.prototype._destroy = function(e, t) {
    zs.prototype._destroy.call(this, e, function(r) {
      t(r);
    });
  };
  function Am(e, t, r) {
    if (t) return e.emit("error", t);
    if (r != null && e.push(r), e._writableState.length) throw new T2();
    if (e._transformState.transforming) throw new S2();
    return e.push(null);
  }
  s(Am, "done");
});

// ../node_modules/readable-stream/lib/_stream_passthrough.js
var Bm = b((J6, Om) => {
  "use strict";
  Om.exports = ln;
  var km = yl();
  oe()(ln, km);
  function ln(e) {
    if (!(this instanceof ln)) return new ln(e);
    km.call(this, e);
  }
  s(ln, "PassThrough");
  ln.prototype._transform = function(e, t, r) {
    r(null, e);
  };
});

// ../node_modules/readable-stream/lib/internal/streams/pipeline.js
var qm = b((Q6, jm) => {
  "use strict";
  var bl;
  function k2(e) {
    var t = !1;
    return function() {
      t || (t = !0, e.apply(void 0, arguments));
    };
  }
  s(k2, "once");
  var Mm = Yt().codes, O2 = Mm.ERR_MISSING_ARGS, B2 = Mm.ERR_STREAM_DESTROYED;
  function Pm(e) {
    if (e) throw e;
  }
  s(Pm, "noop");
  function P2(e) {
    return e.setHeader && typeof e.abort == "function";
  }
  s(P2, "isRequest");
  function I2(e, t, r, i) {
    i = k2(i);
    var n = !1;
    e.on("close", function() {
      n = !0;
    }), bl === void 0 && (bl = Ns()), bl(e, {
      readable: t,
      writable: r
    }, function(a) {
      if (a) return i(a);
      n = !0, i();
    });
    var o = !1;
    return function(a) {
      if (!n && !o) {
        if (o = !0, P2(e)) return e.abort();
        if (typeof e.destroy == "function") return e.destroy();
        i(a || new B2("pipe"));
      }
    };
  }
  s(I2, "destroyer");
  function Im(e) {
    e();
  }
  s(Im, "call");
  function M2(e, t) {
    return e.pipe(t);
  }
  s(M2, "pipe");
  function j2(e) {
    return !e.length || typeof e[e.length - 1] != "function" ? Pm : e.pop();
  }
  s(j2, "popCallback");
  function q2() {
    for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
      t[r] = arguments[r];
    var i = j2(t);
    if (Array.isArray(t[0]) && (t = t[0]), t.length < 2)
      throw new O2("streams");
    var n, o = t.map(function(a, u) {
      var l = u < t.length - 1, c = u > 0;
      return I2(a, l, c, function(d) {
        n || (n = d), d && o.forEach(Im), !l && (o.forEach(Im), i(n));
      });
    });
    return t.reduce(M2);
  }
  s(q2, "pipeline");
  jm.exports = q2;
});

// ../node_modules/readable-stream/readable.js
var oi = b((Ke, dn) => {
  var cn = require("stream");
  process.env.READABLE_STREAM === "disable" && cn ? (dn.exports = cn.Readable, Object.assign(dn.exports, cn), dn.exports.Stream = cn) : (Ke =
  dn.exports = al(), Ke.Stream = cn || Ke, Ke.Readable = Ke, Ke.Writable = nl(), Ke.Duplex = pr(), Ke.Transform = yl(), Ke.PassThrough = Bm(),
  Ke.finished = Ns(), Ke.pipeline = qm());
});

// ../node_modules/bl/BufferList.js
var Um = b((tM, Nm) => {
  "use strict";
  var { Buffer: rt } = require("buffer"), Lm = Symbol.for("BufferList");
  function ae(e) {
    if (!(this instanceof ae))
      return new ae(e);
    ae._init.call(this, e);
  }
  s(ae, "BufferList");
  ae._init = /* @__PURE__ */ s(function(t) {
    Object.defineProperty(this, Lm, { value: !0 }), this._bufs = [], this.length = 0, t && this.append(t);
  }, "_init");
  ae.prototype._new = /* @__PURE__ */ s(function(t) {
    return new ae(t);
  }, "_new");
  ae.prototype._offset = /* @__PURE__ */ s(function(t) {
    if (t === 0)
      return [0, 0];
    let r = 0;
    for (let i = 0; i < this._bufs.length; i++) {
      let n = r + this._bufs[i].length;
      if (t < n || i === this._bufs.length - 1)
        return [i, t - r];
      r = n;
    }
  }, "_offset");
  ae.prototype._reverseOffset = function(e) {
    let t = e[0], r = e[1];
    for (let i = 0; i < t; i++)
      r += this._bufs[i].length;
    return r;
  };
  ae.prototype.get = /* @__PURE__ */ s(function(t) {
    if (t > this.length || t < 0)
      return;
    let r = this._offset(t);
    return this._bufs[r[0]][r[1]];
  }, "get");
  ae.prototype.slice = /* @__PURE__ */ s(function(t, r) {
    return typeof t == "number" && t < 0 && (t += this.length), typeof r == "number" && r < 0 && (r += this.length), this.copy(null, 0, t, r);
  }, "slice");
  ae.prototype.copy = /* @__PURE__ */ s(function(t, r, i, n) {
    if ((typeof i != "number" || i < 0) && (i = 0), (typeof n != "number" || n > this.length) && (n = this.length), i >= this.length || n <=
    0)
      return t || rt.alloc(0);
    let o = !!t, a = this._offset(i), u = n - i, l = u, c = o && r || 0, d = a[1];
    if (i === 0 && n === this.length) {
      if (!o)
        return this._bufs.length === 1 ? this._bufs[0] : rt.concat(this._bufs, this.length);
      for (let p = 0; p < this._bufs.length; p++)
        this._bufs[p].copy(t, c), c += this._bufs[p].length;
      return t;
    }
    if (l <= this._bufs[a[0]].length - d)
      return o ? this._bufs[a[0]].copy(t, r, d, d + l) : this._bufs[a[0]].slice(d, d + l);
    o || (t = rt.allocUnsafe(u));
    for (let p = a[0]; p < this._bufs.length; p++) {
      let h = this._bufs[p].length - d;
      if (l > h)
        this._bufs[p].copy(t, c, d), c += h;
      else {
        this._bufs[p].copy(t, c, d, d + l), c += h;
        break;
      }
      l -= h, d && (d = 0);
    }
    return t.length > c ? t.slice(0, c) : t;
  }, "copy");
  ae.prototype.shallowSlice = /* @__PURE__ */ s(function(t, r) {
    if (t = t || 0, r = typeof r != "number" ? this.length : r, t < 0 && (t += this.length), r < 0 && (r += this.length), t === r)
      return this._new();
    let i = this._offset(t), n = this._offset(r), o = this._bufs.slice(i[0], n[0] + 1);
    return n[1] === 0 ? o.pop() : o[o.length - 1] = o[o.length - 1].slice(0, n[1]), i[1] !== 0 && (o[0] = o[0].slice(i[1])), this._new(o);
  }, "shallowSlice");
  ae.prototype.toString = /* @__PURE__ */ s(function(t, r, i) {
    return this.slice(r, i).toString(t);
  }, "toString");
  ae.prototype.consume = /* @__PURE__ */ s(function(t) {
    if (t = Math.trunc(t), Number.isNaN(t) || t <= 0) return this;
    for (; this._bufs.length; )
      if (t >= this._bufs[0].length)
        t -= this._bufs[0].length, this.length -= this._bufs[0].length, this._bufs.shift();
      else {
        this._bufs[0] = this._bufs[0].slice(t), this.length -= t;
        break;
      }
    return this;
  }, "consume");
  ae.prototype.duplicate = /* @__PURE__ */ s(function() {
    let t = this._new();
    for (let r = 0; r < this._bufs.length; r++)
      t.append(this._bufs[r]);
    return t;
  }, "duplicate");
  ae.prototype.append = /* @__PURE__ */ s(function(t) {
    if (t == null)
      return this;
    if (t.buffer)
      this._appendBuffer(rt.from(t.buffer, t.byteOffset, t.byteLength));
    else if (Array.isArray(t))
      for (let r = 0; r < t.length; r++)
        this.append(t[r]);
    else if (this._isBufferList(t))
      for (let r = 0; r < t._bufs.length; r++)
        this.append(t._bufs[r]);
    else
      typeof t == "number" && (t = t.toString()), this._appendBuffer(rt.from(t));
    return this;
  }, "append");
  ae.prototype._appendBuffer = /* @__PURE__ */ s(function(t) {
    this._bufs.push(t), this.length += t.length;
  }, "appendBuffer");
  ae.prototype.indexOf = function(e, t, r) {
    if (r === void 0 && typeof t == "string" && (r = t, t = void 0), typeof e == "function" || Array.isArray(e))
      throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.');
    if (typeof e == "number" ? e = rt.from([e]) : typeof e == "string" ? e = rt.from(e, r) : this._isBufferList(e) ? e = e.slice() : Array.isArray(
    e.buffer) ? e = rt.from(e.buffer, e.byteOffset, e.byteLength) : rt.isBuffer(e) || (e = rt.from(e)), t = Number(t || 0), isNaN(t) && (t =
    0), t < 0 && (t = this.length + t), t < 0 && (t = 0), e.length === 0)
      return t > this.length ? this.length : t;
    let i = this._offset(t), n = i[0], o = i[1];
    for (; n < this._bufs.length; n++) {
      let a = this._bufs[n];
      for (; o < a.length; )
        if (a.length - o >= e.length) {
          let l = a.indexOf(e, o);
          if (l !== -1)
            return this._reverseOffset([n, l]);
          o = a.length - e.length + 1;
        } else {
          let l = this._reverseOffset([n, o]);
          if (this._match(l, e))
            return l;
          o++;
        }
      o = 0;
    }
    return -1;
  };
  ae.prototype._match = function(e, t) {
    if (this.length - e < t.length)
      return !1;
    for (let r = 0; r < t.length; r++)
      if (this.get(e + r) !== t[r])
        return !1;
    return !0;
  };
  (function() {
    let e = {
      readDoubleBE: 8,
      readDoubleLE: 8,
      readFloatBE: 4,
      readFloatLE: 4,
      readInt32BE: 4,
      readInt32LE: 4,
      readUInt32BE: 4,
      readUInt32LE: 4,
      readInt16BE: 2,
      readInt16LE: 2,
      readUInt16BE: 2,
      readUInt16LE: 2,
      readInt8: 1,
      readUInt8: 1,
      readIntBE: null,
      readIntLE: null,
      readUIntBE: null,
      readUIntLE: null
    };
    for (let t in e)
      (function(r) {
        e[r] === null ? ae.prototype[r] = function(i, n) {
          return this.slice(i, i + n)[r](0, n);
        } : ae.prototype[r] = function(i = 0) {
          return this.slice(i, i + e[r])[r](0);
        };
      })(t);
  })();
  ae.prototype._isBufferList = /* @__PURE__ */ s(function(t) {
    return t instanceof ae || ae.isBufferList(t);
  }, "_isBufferList");
  ae.isBufferList = /* @__PURE__ */ s(function(t) {
    return t != null && t[Lm];
  }, "isBufferList");
  Nm.exports = ae;
});

// ../node_modules/bl/bl.js
var Wm = b((iM, Gs) => {
  "use strict";
  var vl = oi().Duplex, L2 = oe(), fn = Um();
  function Pe(e) {
    if (!(this instanceof Pe))
      return new Pe(e);
    if (typeof e == "function") {
      this._callback = e;
      let t = (/* @__PURE__ */ s(function(i) {
        this._callback && (this._callback(i), this._callback = null);
      }, "piper")).bind(this);
      this.on("pipe", /* @__PURE__ */ s(function(i) {
        i.on("error", t);
      }, "onPipe")), this.on("unpipe", /* @__PURE__ */ s(function(i) {
        i.removeListener("error", t);
      }, "onUnpipe")), e = null;
    }
    fn._init.call(this, e), vl.call(this);
  }
  s(Pe, "BufferListStream");
  L2(Pe, vl);
  Object.assign(Pe.prototype, fn.prototype);
  Pe.prototype._new = /* @__PURE__ */ s(function(t) {
    return new Pe(t);
  }, "_new");
  Pe.prototype._write = /* @__PURE__ */ s(function(t, r, i) {
    this._appendBuffer(t), typeof i == "function" && i();
  }, "_write");
  Pe.prototype._read = /* @__PURE__ */ s(function(t) {
    if (!this.length)
      return this.push(null);
    t = Math.min(t, this.length), this.push(this.slice(0, t)), this.consume(t);
  }, "_read");
  Pe.prototype.end = /* @__PURE__ */ s(function(t) {
    vl.prototype.end.call(this, t), this._callback && (this._callback(null, this.slice()), this._callback = null);
  }, "end");
  Pe.prototype._destroy = /* @__PURE__ */ s(function(t, r) {
    this._bufs.length = 0, this.length = 0, r(t);
  }, "_destroy");
  Pe.prototype._isBufferList = /* @__PURE__ */ s(function(t) {
    return t instanceof Pe || t instanceof fn || Pe.isBufferList(t);
  }, "_isBufferList");
  Pe.isBufferList = fn.isBufferList;
  Gs.exports = Pe;
  Gs.exports.BufferListStream = Pe;
  Gs.exports.BufferList = fn;
});

// ../node_modules/tar-stream/headers.js
var El = b((ui) => {
  var N2 = Buffer.alloc, U2 = "0000000000000000000", W2 = "7777777777777777777", $m = 48, Hm = Buffer.from("ustar\0", "binary"), $2 = Buffer.
  from("00", "binary"), H2 = Buffer.from("ustar ", "binary"), V2 = Buffer.from(" \0", "binary"), Z2 = parseInt("7777", 8), hn = 257, wl = 263,
  z2 = /* @__PURE__ */ s(function(e, t, r) {
    return typeof e != "number" ? r : (e = ~~e, e >= t ? t : e >= 0 || (e += t, e >= 0) ? e : 0);
  }, "clamp"), G2 = /* @__PURE__ */ s(function(e) {
    switch (e) {
      case 0:
        return "file";
      case 1:
        return "link";
      case 2:
        return "symlink";
      case 3:
        return "character-device";
      case 4:
        return "block-device";
      case 5:
        return "directory";
      case 6:
        return "fifo";
      case 7:
        return "contiguous-file";
      case 72:
        return "pax-header";
      case 55:
        return "pax-global-header";
      case 27:
        return "gnu-long-link-path";
      case 28:
      case 30:
        return "gnu-long-path";
    }
    return null;
  }, "toType"), K2 = /* @__PURE__ */ s(function(e) {
    switch (e) {
      case "file":
        return 0;
      case "link":
        return 1;
      case "symlink":
        return 2;
      case "character-device":
        return 3;
      case "block-device":
        return 4;
      case "directory":
        return 5;
      case "fifo":
        return 6;
      case "contiguous-file":
        return 7;
      case "pax-header":
        return 72;
    }
    return 0;
  }, "toTypeflag"), Vm = /* @__PURE__ */ s(function(e, t, r, i) {
    for (; r < i; r++)
      if (e[r] === t) return r;
    return i;
  }, "indexOf"), Zm = /* @__PURE__ */ s(function(e) {
    for (var t = 256, r = 0; r < 148; r++) t += e[r];
    for (var i = 156; i < 512; i++) t += e[i];
    return t;
  }, "cksum"), tr = /* @__PURE__ */ s(function(e, t) {
    return e = e.toString(8), e.length > t ? W2.slice(0, t) + " " : U2.slice(0, t - e.length) + e + " ";
  }, "encodeOct");
  function Y2(e) {
    var t;
    if (e[0] === 128) t = !0;
    else if (e[0] === 255) t = !1;
    else return null;
    for (var r = [], i = e.length - 1; i > 0; i--) {
      var n = e[i];
      t ? r.push(n) : r.push(255 - n);
    }
    var o = 0, a = r.length;
    for (i = 0; i < a; i++)
      o += r[i] * Math.pow(256, i);
    return t ? o : -1 * o;
  }
  s(Y2, "parse256");
  var rr = /* @__PURE__ */ s(function(e, t, r) {
    if (e = e.slice(t, t + r), t = 0, e[t] & 128)
      return Y2(e);
    for (; t < e.length && e[t] === 32; ) t++;
    for (var i = z2(Vm(e, 32, t, e.length), e.length, e.length); t < i && e[t] === 0; ) t++;
    return i === t ? 0 : parseInt(e.slice(t, i).toString(), 8);
  }, "decodeOct"), ai = /* @__PURE__ */ s(function(e, t, r, i) {
    return e.slice(t, Vm(e, 0, t, t + r)).toString(i);
  }, "decodeStr"), _l = /* @__PURE__ */ s(function(e) {
    var t = Buffer.byteLength(e), r = Math.floor(Math.log(t) / Math.log(10)) + 1;
    return t + r >= Math.pow(10, r) && r++, t + r + e;
  }, "addLength");
  ui.decodeLongPath = function(e, t) {
    return ai(e, 0, e.length, t);
  };
  ui.encodePax = function(e) {
    var t = "";
    e.name && (t += _l(" path=" + e.name + `
`)), e.linkname && (t += _l(" linkpath=" + e.linkname + `
`));
    var r = e.pax;
    if (r)
      for (var i in r)
        t += _l(" " + i + "=" + r[i] + `
`);
    return Buffer.from(t);
  };
  ui.decodePax = function(e) {
    for (var t = {}; e.length; ) {
      for (var r = 0; r < e.length && e[r] !== 32; ) r++;
      var i = parseInt(e.slice(0, r).toString(), 10);
      if (!i) return t;
      var n = e.slice(r + 1, i - 1).toString(), o = n.indexOf("=");
      if (o === -1) return t;
      t[n.slice(0, o)] = n.slice(o + 1), e = e.slice(i);
    }
    return t;
  };
  ui.encode = function(e) {
    var t = N2(512), r = e.name, i = "";
    if (e.typeflag === 5 && r[r.length - 1] !== "/" && (r += "/"), Buffer.byteLength(r) !== r.length) return null;
    for (; Buffer.byteLength(r) > 100; ) {
      var n = r.indexOf("/");
      if (n === -1) return null;
      i += i ? "/" + r.slice(0, n) : r.slice(0, n), r = r.slice(n + 1);
    }
    return Buffer.byteLength(r) > 100 || Buffer.byteLength(i) > 155 || e.linkname && Buffer.byteLength(e.linkname) > 100 ? null : (t.write(r),
    t.write(tr(e.mode & Z2, 6), 100), t.write(tr(e.uid, 6), 108), t.write(tr(e.gid, 6), 116), t.write(tr(e.size, 11), 124), t.write(tr(e.mtime.
    getTime() / 1e3 | 0, 11), 136), t[156] = $m + K2(e.type), e.linkname && t.write(e.linkname, 157), Hm.copy(t, hn), $2.copy(t, wl), e.uname &&
    t.write(e.uname, 265), e.gname && t.write(e.gname, 297), t.write(tr(e.devmajor || 0, 6), 329), t.write(tr(e.devminor || 0, 6), 337), i &&
    t.write(i, 345), t.write(tr(Zm(t), 6), 148), t);
  };
  ui.decode = function(e, t, r) {
    var i = e[156] === 0 ? 0 : e[156] - $m, n = ai(e, 0, 100, t), o = rr(e, 100, 8), a = rr(e, 108, 8), u = rr(e, 116, 8), l = rr(e, 124, 12),
    c = rr(e, 136, 12), d = G2(i), p = e[157] === 0 ? null : ai(e, 157, 100, t), h = ai(e, 265, 32), f = ai(e, 297, 32), g = rr(e, 329, 8), E = rr(
    e, 337, 8), _ = Zm(e);
    if (_ === 8 * 32) return null;
    if (_ !== rr(e, 148, 8)) throw new Error("Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?");
    if (Hm.compare(e, hn, hn + 6) === 0)
      e[345] && (n = ai(e, 345, 155, t) + "/" + n);
    else if (!(H2.compare(e, hn, hn + 6) === 0 && V2.compare(e, wl, wl + 2) === 0)) {
      if (!r)
        throw new Error("Invalid tar header: unknown format.");
    }
    return i === 0 && n && n[n.length - 1] === "/" && (i = 5), {
      name: n,
      mode: o,
      uid: a,
      gid: u,
      size: l,
      mtime: new Date(1e3 * c),
      type: d,
      linkname: p,
      uname: h,
      gname: f,
      devmajor: g,
      devminor: E
    };
  };
});

// ../node_modules/tar-stream/extract.js
var Qm = b((aM, Xm) => {
  var Gm = require("util"), J2 = Wm(), pn = El(), Km = oi().Writable, Ym = oi().PassThrough, Jm = /* @__PURE__ */ s(function() {
  }, "noop"), zm = /* @__PURE__ */ s(function(e) {
    return e &= 511, e && 512 - e;
  }, "overflow"), X2 = /* @__PURE__ */ s(function(e, t) {
    var r = new Ks(e, t);
    return r.end(), r;
  }, "emptyStream"), Q2 = /* @__PURE__ */ s(function(e, t) {
    return t.path && (e.name = t.path), t.linkpath && (e.linkname = t.linkpath), t.size && (e.size = parseInt(t.size, 10)), e.pax = t, e;
  }, "mixinPax"), Ks = /* @__PURE__ */ s(function(e, t) {
    this._parent = e, this.offset = t, Ym.call(this, { autoDestroy: !1 });
  }, "Source");
  Gm.inherits(Ks, Ym);
  Ks.prototype.destroy = function(e) {
    this._parent.destroy(e);
  };
  var Rt = /* @__PURE__ */ s(function(e) {
    if (!(this instanceof Rt)) return new Rt(e);
    Km.call(this, e), e = e || {}, this._offset = 0, this._buffer = J2(), this._missing = 0, this._partial = !1, this._onparse = Jm, this._header =
    null, this._stream = null, this._overflow = null, this._cb = null, this._locked = !1, this._destroyed = !1, this._pax = null, this._paxGlobal =
    null, this._gnuLongPath = null, this._gnuLongLinkPath = null;
    var t = this, r = t._buffer, i = /* @__PURE__ */ s(function() {
      t._continue();
    }, "oncontinue"), n = /* @__PURE__ */ s(function(h) {
      if (t._locked = !1, h) return t.destroy(h);
      t._stream || i();
    }, "onunlock"), o = /* @__PURE__ */ s(function() {
      t._stream = null;
      var h = zm(t._header.size);
      h ? t._parse(h, a) : t._parse(512, p), t._locked || i();
    }, "onstreamend"), a = /* @__PURE__ */ s(function() {
      t._buffer.consume(zm(t._header.size)), t._parse(512, p), i();
    }, "ondrain"), u = /* @__PURE__ */ s(function() {
      var h = t._header.size;
      t._paxGlobal = pn.decodePax(r.slice(0, h)), r.consume(h), o();
    }, "onpaxglobalheader"), l = /* @__PURE__ */ s(function() {
      var h = t._header.size;
      t._pax = pn.decodePax(r.slice(0, h)), t._paxGlobal && (t._pax = Object.assign({}, t._paxGlobal, t._pax)), r.consume(h), o();
    }, "onpaxheader"), c = /* @__PURE__ */ s(function() {
      var h = t._header.size;
      this._gnuLongPath = pn.decodeLongPath(r.slice(0, h), e.filenameEncoding), r.consume(h), o();
    }, "ongnulongpath"), d = /* @__PURE__ */ s(function() {
      var h = t._header.size;
      this._gnuLongLinkPath = pn.decodeLongPath(r.slice(0, h), e.filenameEncoding), r.consume(h), o();
    }, "ongnulonglinkpath"), p = /* @__PURE__ */ s(function() {
      var h = t._offset, f;
      try {
        f = t._header = pn.decode(r.slice(0, 512), e.filenameEncoding, e.allowUnknownFormat);
      } catch (g) {
        t.emit("error", g);
      }
      if (r.consume(512), !f) {
        t._parse(512, p), i();
        return;
      }
      if (f.type === "gnu-long-path") {
        t._parse(f.size, c), i();
        return;
      }
      if (f.type === "gnu-long-link-path") {
        t._parse(f.size, d), i();
        return;
      }
      if (f.type === "pax-global-header") {
        t._parse(f.size, u), i();
        return;
      }
      if (f.type === "pax-header") {
        t._parse(f.size, l), i();
        return;
      }
      if (t._gnuLongPath && (f.name = t._gnuLongPath, t._gnuLongPath = null), t._gnuLongLinkPath && (f.linkname = t._gnuLongLinkPath, t._gnuLongLinkPath =
      null), t._pax && (t._header = f = Q2(f, t._pax), t._pax = null), t._locked = !0, !f.size || f.type === "directory") {
        t._parse(512, p), t.emit("entry", f, X2(t, h), n);
        return;
      }
      t._stream = new Ks(t, h), t.emit("entry", f, t._stream, n), t._parse(f.size, o), i();
    }, "onheader");
    this._onheader = p, this._parse(512, p);
  }, "Extract");
  Gm.inherits(Rt, Km);
  Rt.prototype.destroy = function(e) {
    this._destroyed || (this._destroyed = !0, e && this.emit("error", e), this.emit("close"), this._stream && this._stream.emit("close"));
  };
  Rt.prototype._parse = function(e, t) {
    this._destroyed || (this._offset += e, this._missing = e, t === this._onheader && (this._partial = !1), this._onparse = t);
  };
  Rt.prototype._continue = function() {
    if (!this._destroyed) {
      var e = this._cb;
      this._cb = Jm, this._overflow ? this._write(this._overflow, void 0, e) : e();
    }
  };
  Rt.prototype._write = function(e, t, r) {
    if (!this._destroyed) {
      var i = this._stream, n = this._buffer, o = this._missing;
      if (e.length && (this._partial = !0), e.length < o)
        return this._missing -= e.length, this._overflow = null, i ? i.write(e, r) : (n.append(e), r());
      this._cb = r, this._missing = 0;
      var a = null;
      e.length > o && (a = e.slice(o), e = e.slice(0, o)), i ? i.end(e) : n.append(e), this._overflow = a, this._onparse();
    }
  };
  Rt.prototype._final = function(e) {
    if (this._partial) return this.destroy(new Error("Unexpected end of data"));
    e();
  };
  Xm.exports = Rt;
});

// ../node_modules/fs-constants/index.js
var tg = b((lM, eg) => {
  eg.exports = require("fs").constants || require("constants");
});

// ../node_modules/tar-stream/pack.js
var og = b((cM, sg) => {
  var li = tg(), rg = ti(), Js = oe(), eS = Buffer.alloc, ig = oi().Readable, ci = oi().Writable, tS = require("string_decoder").StringDecoder,
  Ys = El(), rS = parseInt("755", 8), iS = parseInt("644", 8), ng = eS(1024), xl = /* @__PURE__ */ s(function() {
  }, "noop"), Cl = /* @__PURE__ */ s(function(e, t) {
    t &= 511, t && e.push(ng.slice(0, 512 - t));
  }, "overflow");
  function nS(e) {
    switch (e & li.S_IFMT) {
      case li.S_IFBLK:
        return "block-device";
      case li.S_IFCHR:
        return "character-device";
      case li.S_IFDIR:
        return "directory";
      case li.S_IFIFO:
        return "fifo";
      case li.S_IFLNK:
        return "symlink";
    }
    return "file";
  }
  s(nS, "modeToType");
  var Xs = /* @__PURE__ */ s(function(e) {
    ci.call(this), this.written = 0, this._to = e, this._destroyed = !1;
  }, "Sink");
  Js(Xs, ci);
  Xs.prototype._write = function(e, t, r) {
    if (this.written += e.length, this._to.push(e)) return r();
    this._to._drain = r;
  };
  Xs.prototype.destroy = function() {
    this._destroyed || (this._destroyed = !0, this.emit("close"));
  };
  var Qs = /* @__PURE__ */ s(function() {
    ci.call(this), this.linkname = "", this._decoder = new tS("utf-8"), this._destroyed = !1;
  }, "LinkSink");
  Js(Qs, ci);
  Qs.prototype._write = function(e, t, r) {
    this.linkname += this._decoder.write(e), r();
  };
  Qs.prototype.destroy = function() {
    this._destroyed || (this._destroyed = !0, this.emit("close"));
  };
  var Dn = /* @__PURE__ */ s(function() {
    ci.call(this), this._destroyed = !1;
  }, "Void");
  Js(Dn, ci);
  Dn.prototype._write = function(e, t, r) {
    r(new Error("No body allowed for this entry"));
  };
  Dn.prototype.destroy = function() {
    this._destroyed || (this._destroyed = !0, this.emit("close"));
  };
  var pt = /* @__PURE__ */ s(function(e) {
    if (!(this instanceof pt)) return new pt(e);
    ig.call(this, e), this._drain = xl, this._finalized = !1, this._finalizing = !1, this._destroyed = !1, this._stream = null;
  }, "Pack");
  Js(pt, ig);
  pt.prototype.entry = function(e, t, r) {
    if (this._stream) throw new Error("already piping an entry");
    if (!(this._finalized || this._destroyed)) {
      typeof t == "function" && (r = t, t = null), r || (r = xl);
      var i = this;
      if ((!e.size || e.type === "symlink") && (e.size = 0), e.type || (e.type = nS(e.mode)), e.mode || (e.mode = e.type === "directory" ? rS :
      iS), e.uid || (e.uid = 0), e.gid || (e.gid = 0), e.mtime || (e.mtime = /* @__PURE__ */ new Date()), typeof t == "string" && (t = Buffer.
      from(t)), Buffer.isBuffer(t)) {
        e.size = t.length, this._encode(e);
        var n = this.push(t);
        return Cl(i, e.size), n ? process.nextTick(r) : this._drain = r, new Dn();
      }
      if (e.type === "symlink" && !e.linkname) {
        var o = new Qs();
        return rg(o, function(u) {
          if (u)
            return i.destroy(), r(u);
          e.linkname = o.linkname, i._encode(e), r();
        }), o;
      }
      if (this._encode(e), e.type !== "file" && e.type !== "contiguous-file")
        return process.nextTick(r), new Dn();
      var a = new Xs(this);
      return this._stream = a, rg(a, function(u) {
        if (i._stream = null, u)
          return i.destroy(), r(u);
        if (a.written !== e.size)
          return i.destroy(), r(new Error("size mismatch"));
        Cl(i, e.size), i._finalizing && i.finalize(), r();
      }), a;
    }
  };
  pt.prototype.finalize = function() {
    if (this._stream) {
      this._finalizing = !0;
      return;
    }
    this._finalized || (this._finalized = !0, this.push(ng), this.push(null));
  };
  pt.prototype.destroy = function(e) {
    this._destroyed || (this._destroyed = !0, e && this.emit("error", e), this.emit("close"), this._stream && this._stream.destroy && this._stream.
    destroy());
  };
  pt.prototype._encode = function(e) {
    if (!e.pax) {
      var t = Ys.encode(e);
      if (t) {
        this.push(t);
        return;
      }
    }
    this._encodePax(e);
  };
  pt.prototype._encodePax = function(e) {
    var t = Ys.encodePax({
      name: e.name,
      linkname: e.linkname,
      pax: e.pax
    }), r = {
      name: "PaxHeader",
      mode: e.mode,
      uid: e.uid,
      gid: e.gid,
      size: t.length,
      mtime: e.mtime,
      type: "pax-header",
      linkname: e.linkname && "PaxHeader",
      uname: e.uname,
      gname: e.gname,
      devmajor: e.devmajor,
      devminor: e.devminor
    };
    this.push(Ys.encode(r)), this.push(t), Cl(this, t.length), r.size = e.size, r.type = e.type, this.push(Ys.encode(r));
  };
  pt.prototype._read = function(e) {
    var t = this._drain;
    this._drain = xl, t();
  };
  sg.exports = pt;
});

// ../node_modules/tar-stream/index.js
var ag = b((Fl) => {
  Fl.extract = Qm();
  Fl.pack = og();
});

// ../node_modules/mkdirp-classic/index.js
var dg = b((hM, cg) => {
  var eo = require("path"), ug = require("fs"), lg = parseInt("0777", 8);
  cg.exports = di.mkdirp = di.mkdirP = di;
  function di(e, t, r, i) {
    typeof t == "function" ? (r = t, t = {}) : (!t || typeof t != "object") && (t = { mode: t });
    var n = t.mode, o = t.fs || ug;
    n === void 0 && (n = lg & ~process.umask()), i || (i = null);
    var a = r || function() {
    };
    e = eo.resolve(e), o.mkdir(e, n, function(u) {
      if (!u)
        return i = i || e, a(null, i);
      switch (u.code) {
        case "ENOENT":
          di(eo.dirname(e), t, function(l, c) {
            l ? a(l, c) : di(e, t, a, c);
          });
          break;
        // In the case of any other error, just see if there's a dir
        // there already.  If so, then hooray!  If not, then something
        // is borked.
        default:
          o.stat(e, function(l, c) {
            l || !c.isDirectory() ? a(u, i) : a(null, i);
          });
          break;
      }
    });
  }
  s(di, "mkdirP");
  di.sync = /* @__PURE__ */ s(function e(t, r, i) {
    (!r || typeof r != "object") && (r = { mode: r });
    var n = r.mode, o = r.fs || ug;
    n === void 0 && (n = lg & ~process.umask()), i || (i = null), t = eo.resolve(t);
    try {
      o.mkdirSync(t, n), i = i || t;
    } catch (u) {
      switch (u.code) {
        case "ENOENT":
          i = e(eo.dirname(t), r, i), e(t, r, i);
          break;
        // In the case of any other error, just see if there's a dir
        // there already.  If so, then hooray!  If not, then something
        // is borked.
        default:
          var a;
          try {
            a = o.statSync(t);
          } catch {
            throw u;
          }
          if (!a.isDirectory()) throw u;
          break;
      }
    }
    return i;
  }, "sync");
});

// ../node_modules/tar-fs/index.js
var bg = b((Al) => {
  var sS = ND(), hg = ag(), pg = Vu(), oS = dg(), Dg = require("fs"), He = require("path"), aS = require("os"), mn = aS.platform() === "win3\
2", gn = /* @__PURE__ */ s(function() {
  }, "noop"), Tl = /* @__PURE__ */ s(function(e) {
    return e;
  }, "echo"), Sl = mn ? function(e) {
    return e.replace(/\\/g, "/").replace(/[:?<>|]/g, "_");
  } : Tl, uS = /* @__PURE__ */ s(function(e, t, r, i, n, o) {
    var a = n || ["."];
    return /* @__PURE__ */ s(function(l) {
      if (!a.length) return l();
      var c = a.shift(), d = He.join(r, c);
      t.call(e, d, function(p, h) {
        if (p) return l(p);
        if (!h.isDirectory()) return l(null, c, h);
        e.readdir(d, function(f, g) {
          if (f) return l(f);
          o && g.sort();
          for (var E = 0; E < g.length; E++)
            i(He.join(r, c, g[E])) || a.push(He.join(c, g[E]));
          l(null, c, h);
        });
      });
    }, "loop");
  }, "statAll"), mg = /* @__PURE__ */ s(function(e, t) {
    return function(r) {
      r.name = r.name.split("/").slice(t).join("/");
      var i = r.linkname;
      return i && (r.type === "link" || He.isAbsolute(i)) && (r.linkname = i.split("/").slice(t).join("/")), e(r);
    };
  }, "strip");
  Al.pack = function(e, t) {
    e || (e = "."), t || (t = {});
    var r = t.fs || Dg, i = t.ignore || t.filter || gn, n = t.map || gn, o = t.mapStream || Tl, a = uS(r, t.dereference ? r.stat : r.lstat, e,
    i, t.entries, t.sort), u = t.strict !== !1, l = typeof t.umask == "number" ? ~t.umask : ~gg(), c = typeof t.dmode == "number" ? t.dmode :
    0, d = typeof t.fmode == "number" ? t.fmode : 0, p = t.pack || hg.pack(), h = t.finish || gn;
    t.strip && (n = mg(n, t.strip)), t.readable && (c |= parseInt(555, 8), d |= parseInt(444, 8)), t.writable && (c |= parseInt(333, 8), d |=
    parseInt(222, 8));
    var f = /* @__PURE__ */ s(function(_, C) {
      r.readlink(He.join(e, _), function(x, w) {
        if (x) return p.destroy(x);
        C.linkname = Sl(w), p.entry(C, E);
      });
    }, "onsymlink"), g = /* @__PURE__ */ s(function(_, C, x) {
      if (_) return p.destroy(_);
      if (!C)
        return t.finalize !== !1 && p.finalize(), h(p);
      if (x.isSocket()) return E();
      var w = {
        name: Sl(C),
        mode: (x.mode | (x.isDirectory() ? c : d)) & l,
        mtime: x.mtime,
        size: x.size,
        type: "file",
        uid: x.uid,
        gid: x.gid
      };
      if (x.isDirectory())
        return w.size = 0, w.type = "directory", w = n(w) || w, p.entry(w, E);
      if (x.isSymbolicLink())
        return w.size = 0, w.type = "symlink", w = n(w) || w, f(C, w);
      if (w = n(w) || w, !x.isFile())
        return u ? p.destroy(new Error("unsupported type for " + C)) : E();
      var T = p.entry(w, E);
      if (T) {
        var S = o(r.createReadStream(He.join(e, C), { start: 0, end: w.size > 0 ? w.size - 1 : w.size }), w);
        S.on("error", function(F) {
          T.destroy(F);
        }), pg(S, T);
      }
    }, "onstat"), E = /* @__PURE__ */ s(function(_) {
      if (_) return p.destroy(_);
      a(g);
    }, "onnextentry");
    return E(), p;
  };
  var lS = /* @__PURE__ */ s(function(e) {
    return e.length ? e[e.length - 1] : null;
  }, "head"), cS = /* @__PURE__ */ s(function() {
    return process.getuid ? process.getuid() : -1;
  }, "processGetuid"), gg = /* @__PURE__ */ s(function() {
    return process.umask ? process.umask() : 0;
  }, "processUmask");
  Al.extract = function(e, t) {
    e || (e = "."), t || (t = {});
    var r = t.fs || Dg, i = t.ignore || t.filter || gn, n = t.map || gn, o = t.mapStream || Tl, a = t.chown !== !1 && !mn && cS() === 0, u = t.
    extract || hg.extract(), l = [], c = /* @__PURE__ */ new Date(), d = typeof t.umask == "number" ? ~t.umask : ~gg(), p = typeof t.dmode ==
    "number" ? t.dmode : 0, h = typeof t.fmode == "number" ? t.fmode : 0, f = t.strict !== !1;
    t.strip && (n = mg(n, t.strip)), t.readable && (p |= parseInt(555, 8), h |= parseInt(444, 8)), t.writable && (p |= parseInt(333, 8), h |=
    parseInt(222, 8));
    var g = /* @__PURE__ */ s(function(C, x) {
      for (var w; (w = lS(l)) && C.slice(0, w[0].length) !== w[0]; ) l.pop();
      if (!w) return x();
      r.utimes(w[0], c, w[1], x);
    }, "utimesParent"), E = /* @__PURE__ */ s(function(C, x, w) {
      if (t.utimes === !1) return w();
      if (x.type === "directory") return r.utimes(C, c, x.mtime, w);
      if (x.type === "symlink") return g(C, w);
      r.utimes(C, c, x.mtime, function(T) {
        if (T) return w(T);
        g(C, w);
      });
    }, "utimes"), _ = /* @__PURE__ */ s(function(C, x, w) {
      var T = x.type === "symlink", S = T ? r.lchmod : r.chmod, F = T ? r.lchown : r.chown;
      if (!S) return w();
      var I = (x.mode | (x.type === "directory" ? p : h)) & d;
      F && a ? F.call(r, C, x.uid, x.gid, q) : q(null);
      function q(M) {
        if (M) return w(M);
        if (!S) return w();
        S.call(r, C, I, w);
      }
      s(q, "onchown");
    }, "chperm");
    return u.on("entry", function(C, x, w) {
      C = n(C) || C, C.name = Sl(C.name);
      var T = He.join(e, He.join("/", C.name));
      if (i(T, C))
        return x.resume(), w();
      var S = /* @__PURE__ */ s(function(H) {
        if (H) return w(H);
        E(T, C, function(K) {
          if (K) return w(K);
          if (mn) return w();
          _(T, C, w);
        });
      }, "stat"), F = /* @__PURE__ */ s(function() {
        if (mn) return w();
        r.unlink(T, function() {
          r.symlink(C.linkname, T, S);
        });
      }, "onsymlink"), I = /* @__PURE__ */ s(function() {
        if (mn) return w();
        r.unlink(T, function() {
          var H = He.join(e, He.join("/", C.linkname));
          r.link(H, T, function(K) {
            if (K && K.code === "EPERM" && t.hardlinkAsFilesFallback)
              return x = r.createReadStream(H), q();
            S(K);
          });
        });
      }, "onlink"), q = /* @__PURE__ */ s(function() {
        var H = r.createWriteStream(T), K = o(x, C);
        H.on("error", function(ve) {
          K.destroy(ve);
        }), pg(K, H, function(ve) {
          if (ve) return w(ve);
          H.on("close", S);
        });
      }, "onfile");
      if (C.type === "directory")
        return l.push([T, C.mtime]), fg(T, {
          fs: r,
          own: a,
          uid: C.uid,
          gid: C.gid
        }, S);
      var M = He.dirname(T);
      yg(r, M, He.join(e, "."), function(H, K) {
        if (H) return w(H);
        if (!K) return w(new Error(M + " is not a valid path"));
        fg(M, {
          fs: r,
          own: a,
          uid: C.uid,
          gid: C.gid
        }, function(ve) {
          if (ve) return w(ve);
          switch (C.type) {
            case "file":
              return q();
            case "link":
              return I();
            case "symlink":
              return F();
          }
          if (f) return w(new Error("unsupported type for " + T + " (" + C.type + ")"));
          x.resume(), w();
        });
      });
    }), t.finish && u.on("finish", t.finish), u;
  };
  function yg(e, t, r, i) {
    if (t === r) return i(null, !0);
    e.lstat(t, function(n, o) {
      if (n && n.code !== "ENOENT") return i(n);
      if (n || o.isDirectory()) return yg(e, He.join(t, ".."), r, i);
      i(null, !1);
    });
  }
  s(yg, "validate");
  function fg(e, t, r) {
    oS(e, { fs: t.fs }, function(i, n) {
      !i && n && t.own ? sS(n, t.uid, t.gid, r) : r(i);
    });
  }
  s(fg, "mkdirfix");
});

// ../node_modules/process-nextick-args/index.js
var Ve = b((gM, Rl) => {
  "use strict";
  typeof process > "u" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.
  indexOf("v1.8.") !== 0 ? Rl.exports = { nextTick: dS } : Rl.exports = process;
  function dS(e, t, r, i) {
    if (typeof e != "function")
      throw new TypeError('"callback" argument must be a function');
    var n = arguments.length, o, a;
    switch (n) {
      case 0:
      case 1:
        return process.nextTick(e);
      case 2:
        return process.nextTick(/* @__PURE__ */ s(function() {
          e.call(null, t);
        }, "afterTickOne"));
      case 3:
        return process.nextTick(/* @__PURE__ */ s(function() {
          e.call(null, t, r);
        }, "afterTickTwo"));
      case 4:
        return process.nextTick(/* @__PURE__ */ s(function() {
          e.call(null, t, r, i);
        }, "afterTickThree"));
      default:
        for (o = new Array(n - 1), a = 0; a < o.length; )
          o[a++] = arguments[a];
        return process.nextTick(/* @__PURE__ */ s(function() {
          e.apply(null, o);
        }, "afterTick"));
    }
  }
  s(dS, "nextTick");
});

// ../node_modules/peek-stream/node_modules/isarray/index.js
var _g = b((bM, vg) => {
  var fS = {}.toString;
  vg.exports = Array.isArray || function(e) {
    return fS.call(e) == "[object Array]";
  };
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/internal/streams/stream.js
var kl = b((vM, wg) => {
  wg.exports = require("stream");
});

// ../node_modules/peek-stream/node_modules/safe-buffer/index.js
var ro = b((Ol, Cg) => {
  var to = require("buffer"), kt = to.Buffer;
  function Eg(e, t) {
    for (var r in e)
      t[r] = e[r];
  }
  s(Eg, "copyProps");
  kt.from && kt.alloc && kt.allocUnsafe && kt.allocUnsafeSlow ? Cg.exports = to : (Eg(to, Ol), Ol.Buffer = fi);
  function fi(e, t, r) {
    return kt(e, t, r);
  }
  s(fi, "SafeBuffer");
  Eg(kt, fi);
  fi.from = function(e, t, r) {
    if (typeof e == "number")
      throw new TypeError("Argument must not be a number");
    return kt(e, t, r);
  };
  fi.alloc = function(e, t, r) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    var i = kt(e);
    return t !== void 0 ? typeof r == "string" ? i.fill(t, r) : i.fill(t) : i.fill(0), i;
  };
  fi.allocUnsafe = function(e) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    return kt(e);
  };
  fi.allocUnsafeSlow = function(e) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    return to.SlowBuffer(e);
  };
});

// ../node_modules/core-util-is/lib/util.js
var Me = b((Ie) => {
  function hS(e) {
    return Array.isArray ? Array.isArray(e) : io(e) === "[object Array]";
  }
  s(hS, "isArray");
  Ie.isArray = hS;
  function pS(e) {
    return typeof e == "boolean";
  }
  s(pS, "isBoolean");
  Ie.isBoolean = pS;
  function DS(e) {
    return e === null;
  }
  s(DS, "isNull");
  Ie.isNull = DS;
  function mS(e) {
    return e == null;
  }
  s(mS, "isNullOrUndefined");
  Ie.isNullOrUndefined = mS;
  function gS(e) {
    return typeof e == "number";
  }
  s(gS, "isNumber");
  Ie.isNumber = gS;
  function yS(e) {
    return typeof e == "string";
  }
  s(yS, "isString");
  Ie.isString = yS;
  function bS(e) {
    return typeof e == "symbol";
  }
  s(bS, "isSymbol");
  Ie.isSymbol = bS;
  function vS(e) {
    return e === void 0;
  }
  s(vS, "isUndefined");
  Ie.isUndefined = vS;
  function _S(e) {
    return io(e) === "[object RegExp]";
  }
  s(_S, "isRegExp");
  Ie.isRegExp = _S;
  function wS(e) {
    return typeof e == "object" && e !== null;
  }
  s(wS, "isObject");
  Ie.isObject = wS;
  function ES(e) {
    return io(e) === "[object Date]";
  }
  s(ES, "isDate");
  Ie.isDate = ES;
  function CS(e) {
    return io(e) === "[object Error]" || e instanceof Error;
  }
  s(CS, "isError");
  Ie.isError = CS;
  function xS(e) {
    return typeof e == "function";
  }
  s(xS, "isFunction");
  Ie.isFunction = xS;
  function FS(e) {
    return e === null || typeof e == "boolean" || typeof e == "number" || typeof e == "string" || typeof e == "symbol" || // ES6 symbol
    typeof e > "u";
  }
  s(FS, "isPrimitive");
  Ie.isPrimitive = FS;
  Ie.isBuffer = require("buffer").Buffer.isBuffer;
  function io(e) {
    return Object.prototype.toString.call(e);
  }
  s(io, "objectToString");
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/internal/streams/BufferList.js
var Fg = b((CM, Bl) => {
  "use strict";
  function SS(e, t) {
    if (!(e instanceof t))
      throw new TypeError("Cannot call a class as a function");
  }
  s(SS, "_classCallCheck");
  var xg = ro().Buffer, yn = require("util");
  function TS(e, t, r) {
    e.copy(t, r);
  }
  s(TS, "copyBuffer");
  Bl.exports = function() {
    function e() {
      SS(this, e), this.head = null, this.tail = null, this.length = 0;
    }
    return s(e, "BufferList"), e.prototype.push = /* @__PURE__ */ s(function(r) {
      var i = { data: r, next: null };
      this.length > 0 ? this.tail.next = i : this.head = i, this.tail = i, ++this.length;
    }, "push"), e.prototype.unshift = /* @__PURE__ */ s(function(r) {
      var i = { data: r, next: this.head };
      this.length === 0 && (this.tail = i), this.head = i, ++this.length;
    }, "unshift"), e.prototype.shift = /* @__PURE__ */ s(function() {
      if (this.length !== 0) {
        var r = this.head.data;
        return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, r;
      }
    }, "shift"), e.prototype.clear = /* @__PURE__ */ s(function() {
      this.head = this.tail = null, this.length = 0;
    }, "clear"), e.prototype.join = /* @__PURE__ */ s(function(r) {
      if (this.length === 0) return "";
      for (var i = this.head, n = "" + i.data; i = i.next; )
        n += r + i.data;
      return n;
    }, "join"), e.prototype.concat = /* @__PURE__ */ s(function(r) {
      if (this.length === 0) return xg.alloc(0);
      for (var i = xg.allocUnsafe(r >>> 0), n = this.head, o = 0; n; )
        TS(n.data, i, o), o += n.data.length, n = n.next;
      return i;
    }, "concat"), e;
  }();
  yn && yn.inspect && yn.inspect.custom && (Bl.exports.prototype[yn.inspect.custom] = function() {
    var e = yn.inspect({ length: this.length });
    return this.constructor.name + " " + e;
  });
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/internal/streams/destroy.js
var Pl = b((FM, Sg) => {
  "use strict";
  var no = Ve();
  function AS(e, t) {
    var r = this, i = this._readableState && this._readableState.destroyed, n = this._writableState && this._writableState.destroyed;
    return i || n ? (t ? t(e) : e && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, no.nextTick(
    so, this, e)) : no.nextTick(so, this, e)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this.
    _writableState.destroyed = !0), this._destroy(e || null, function(o) {
      !t && o ? r._writableState ? r._writableState.errorEmitted || (r._writableState.errorEmitted = !0, no.nextTick(so, r, o)) : no.nextTick(
      so, r, o) : t && t(o);
    }), this);
  }
  s(AS, "destroy");
  function RS() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.
    endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending =
    !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted =
    !1);
  }
  s(RS, "undestroy");
  function so(e, t) {
    e.emit("error", t);
  }
  s(so, "emitErrorNT");
  Sg.exports = {
    destroy: AS,
    undestroy: RS
  };
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/_stream_writable.js
var Ml = b((TM, Ig) => {
  "use strict";
  var yr = Ve();
  Ig.exports = Ee;
  function Ag(e) {
    var t = this;
    this.next = null, this.entry = null, this.finish = function() {
      GS(t, e);
    };
  }
  s(Ag, "CorkedRequest");
  var kS = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : yr.nextTick, hi;
  Ee.WritableState = vn;
  var Rg = Object.create(Me());
  Rg.inherits = oe();
  var OS = {
    deprecate: rn()
  }, kg = kl(), ao = ro().Buffer, BS = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array ||
  function() {
  };
  function PS(e) {
    return ao.from(e);
  }
  s(PS, "_uint8ArrayToBuffer");
  function IS(e) {
    return ao.isBuffer(e) || e instanceof BS;
  }
  s(IS, "_isUint8Array");
  var Og = Pl();
  Rg.inherits(Ee, kg);
  function MS() {
  }
  s(MS, "nop");
  function vn(e, t) {
    hi = hi || br(), e = e || {};
    var r = t instanceof hi;
    this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.writableObjectMode);
    var i = e.highWaterMark, n = e.writableHighWaterMark, o = this.objectMode ? 16 : 16 * 1024;
    i || i === 0 ? this.highWaterMark = i : r && (n || n === 0) ? this.highWaterMark = n : this.highWaterMark = o, this.highWaterMark = Math.
    floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed =
    !1;
    var a = e.decodeStrings === !1;
    this.decodeStrings = !a, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync =
    !0, this.bufferProcessing = !1, this.onwrite = function(u) {
      $S(t, u);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished =
    !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new Ag(this);
  }
  s(vn, "WritableState");
  vn.prototype.getBuffer = /* @__PURE__ */ s(function() {
    for (var t = this.bufferedRequest, r = []; t; )
      r.push(t), t = t.next;
    return r;
  }, "getBuffer");
  (function() {
    try {
      Object.defineProperty(vn.prototype, "buffer", {
        get: OS.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  })();
  var oo;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (oo = Function.prototype[Symbol.
  hasInstance], Object.defineProperty(Ee, Symbol.hasInstance, {
    value: /* @__PURE__ */ s(function(e) {
      return oo.call(this, e) ? !0 : this !== Ee ? !1 : e && e._writableState instanceof vn;
    }, "value")
  })) : oo = /* @__PURE__ */ s(function(e) {
    return e instanceof this;
  }, "realHasInstance");
  function Ee(e) {
    if (hi = hi || br(), !oo.call(Ee, this) && !(this instanceof hi))
      return new Ee(e);
    this._writableState = new vn(e, this), this.writable = !0, e && (typeof e.write == "function" && (this._write = e.write), typeof e.writev ==
    "function" && (this._writev = e.writev), typeof e.destroy == "function" && (this._destroy = e.destroy), typeof e.final == "function" && (this.
    _final = e.final)), kg.call(this);
  }
  s(Ee, "Writable");
  Ee.prototype.pipe = function() {
    this.emit("error", new Error("Cannot pipe, not readable"));
  };
  function jS(e, t) {
    var r = new Error("write after end");
    e.emit("error", r), yr.nextTick(t, r);
  }
  s(jS, "writeAfterEnd");
  function qS(e, t, r, i) {
    var n = !0, o = !1;
    return r === null ? o = new TypeError("May not write null values to stream") : typeof r != "string" && r !== void 0 && !t.objectMode && (o =
    new TypeError("Invalid non-string/buffer chunk")), o && (e.emit("error", o), yr.nextTick(i, o), n = !1), n;
  }
  s(qS, "validChunk");
  Ee.prototype.write = function(e, t, r) {
    var i = this._writableState, n = !1, o = !i.objectMode && IS(e);
    return o && !ao.isBuffer(e) && (e = PS(e)), typeof t == "function" && (r = t, t = null), o ? t = "buffer" : t || (t = i.defaultEncoding),
    typeof r != "function" && (r = MS), i.ended ? jS(this, r) : (o || qS(this, i, e, r)) && (i.pendingcb++, n = NS(this, i, o, e, t, r)), n;
  };
  Ee.prototype.cork = function() {
    var e = this._writableState;
    e.corked++;
  };
  Ee.prototype.uncork = function() {
    var e = this._writableState;
    e.corked && (e.corked--, !e.writing && !e.corked && !e.bufferProcessing && e.bufferedRequest && Bg(this, e));
  };
  Ee.prototype.setDefaultEncoding = /* @__PURE__ */ s(function(t) {
    if (typeof t == "string" && (t = t.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "\
utf-16le", "raw"].indexOf((t + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + t);
    return this._writableState.defaultEncoding = t, this;
  }, "setDefaultEncoding");
  function LS(e, t, r) {
    return !e.objectMode && e.decodeStrings !== !1 && typeof t == "string" && (t = ao.from(t, r)), t;
  }
  s(LS, "decodeChunk");
  Object.defineProperty(Ee.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function NS(e, t, r, i, n, o) {
    if (!r) {
      var a = LS(t, i, n);
      i !== a && (r = !0, n = "buffer", i = a);
    }
    var u = t.objectMode ? 1 : i.length;
    t.length += u;
    var l = t.length < t.highWaterMark;
    if (l || (t.needDrain = !0), t.writing || t.corked) {
      var c = t.lastBufferedRequest;
      t.lastBufferedRequest = {
        chunk: i,
        encoding: n,
        isBuf: r,
        callback: o,
        next: null
      }, c ? c.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest, t.bufferedRequestCount += 1;
    } else
      Il(e, t, !1, u, i, n, o);
    return l;
  }
  s(NS, "writeOrBuffer");
  function Il(e, t, r, i, n, o, a) {
    t.writelen = i, t.writecb = a, t.writing = !0, t.sync = !0, r ? e._writev(n, t.onwrite) : e._write(n, o, t.onwrite), t.sync = !1;
  }
  s(Il, "doWrite");
  function US(e, t, r, i, n) {
    --t.pendingcb, r ? (yr.nextTick(n, i), yr.nextTick(bn, e, t), e._writableState.errorEmitted = !0, e.emit("error", i)) : (n(i), e._writableState.
    errorEmitted = !0, e.emit("error", i), bn(e, t));
  }
  s(US, "onwriteError");
  function WS(e) {
    e.writing = !1, e.writecb = null, e.length -= e.writelen, e.writelen = 0;
  }
  s(WS, "onwriteStateUpdate");
  function $S(e, t) {
    var r = e._writableState, i = r.sync, n = r.writecb;
    if (WS(r), t) US(e, r, i, t, n);
    else {
      var o = Pg(r);
      !o && !r.corked && !r.bufferProcessing && r.bufferedRequest && Bg(e, r), i ? kS(Tg, e, r, o, n) : Tg(e, r, o, n);
    }
  }
  s($S, "onwrite");
  function Tg(e, t, r, i) {
    r || HS(e, t), t.pendingcb--, i(), bn(e, t);
  }
  s(Tg, "afterWrite");
  function HS(e, t) {
    t.length === 0 && t.needDrain && (t.needDrain = !1, e.emit("drain"));
  }
  s(HS, "onwriteDrain");
  function Bg(e, t) {
    t.bufferProcessing = !0;
    var r = t.bufferedRequest;
    if (e._writev && r && r.next) {
      var i = t.bufferedRequestCount, n = new Array(i), o = t.corkedRequestsFree;
      o.entry = r;
      for (var a = 0, u = !0; r; )
        n[a] = r, r.isBuf || (u = !1), r = r.next, a += 1;
      n.allBuffers = u, Il(e, t, !0, t.length, n, "", o.finish), t.pendingcb++, t.lastBufferedRequest = null, o.next ? (t.corkedRequestsFree =
      o.next, o.next = null) : t.corkedRequestsFree = new Ag(t), t.bufferedRequestCount = 0;
    } else {
      for (; r; ) {
        var l = r.chunk, c = r.encoding, d = r.callback, p = t.objectMode ? 1 : l.length;
        if (Il(e, t, !1, p, l, c, d), r = r.next, t.bufferedRequestCount--, t.writing)
          break;
      }
      r === null && (t.lastBufferedRequest = null);
    }
    t.bufferedRequest = r, t.bufferProcessing = !1;
  }
  s(Bg, "clearBuffer");
  Ee.prototype._write = function(e, t, r) {
    r(new Error("_write() is not implemented"));
  };
  Ee.prototype._writev = null;
  Ee.prototype.end = function(e, t, r) {
    var i = this._writableState;
    typeof e == "function" ? (r = e, e = null, t = null) : typeof t == "function" && (r = t, t = null), e != null && this.write(e, t), i.corked &&
    (i.corked = 1, this.uncork()), i.ending || zS(this, i, r);
  };
  function Pg(e) {
    return e.ending && e.length === 0 && e.bufferedRequest === null && !e.finished && !e.writing;
  }
  s(Pg, "needFinish");
  function VS(e, t) {
    e._final(function(r) {
      t.pendingcb--, r && e.emit("error", r), t.prefinished = !0, e.emit("prefinish"), bn(e, t);
    });
  }
  s(VS, "callFinal");
  function ZS(e, t) {
    !t.prefinished && !t.finalCalled && (typeof e._final == "function" ? (t.pendingcb++, t.finalCalled = !0, yr.nextTick(VS, e, t)) : (t.prefinished =
    !0, e.emit("prefinish")));
  }
  s(ZS, "prefinish");
  function bn(e, t) {
    var r = Pg(t);
    return r && (ZS(e, t), t.pendingcb === 0 && (t.finished = !0, e.emit("finish"))), r;
  }
  s(bn, "finishMaybe");
  function zS(e, t, r) {
    t.ending = !0, bn(e, t), r && (t.finished ? yr.nextTick(r) : e.once("finish", r)), t.ended = !0, e.writable = !1;
  }
  s(zS, "endWritable");
  function GS(e, t, r) {
    var i = e.entry;
    for (e.entry = null; i; ) {
      var n = i.callback;
      t.pendingcb--, n(r), i = i.next;
    }
    t.corkedRequestsFree.next = e;
  }
  s(GS, "onCorkedFinish");
  Object.defineProperty(Ee.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._writableState && (this._writableState.destroyed = e);
    }, "set")
  });
  Ee.prototype.destroy = Og.destroy;
  Ee.prototype._undestroy = Og.undestroy;
  Ee.prototype._destroy = function(e, t) {
    this.end(), t(e);
  };
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/_stream_duplex.js
var br = b((RM, Lg) => {
  "use strict";
  var Mg = Ve(), KS = Object.keys || function(e) {
    var t = [];
    for (var r in e)
      t.push(r);
    return t;
  };
  Lg.exports = Ot;
  var jg = Object.create(Me());
  jg.inherits = oe();
  var qg = Ll(), ql = Ml();
  jg.inherits(Ot, qg);
  for (jl = KS(ql.prototype), uo = 0; uo < jl.length; uo++)
    lo = jl[uo], Ot.prototype[lo] || (Ot.prototype[lo] = ql.prototype[lo]);
  var jl, lo, uo;
  function Ot(e) {
    if (!(this instanceof Ot)) return new Ot(e);
    qg.call(this, e), ql.call(this, e), e && e.readable === !1 && (this.readable = !1), e && e.writable === !1 && (this.writable = !1), this.
    allowHalfOpen = !0, e && e.allowHalfOpen === !1 && (this.allowHalfOpen = !1), this.once("end", YS);
  }
  s(Ot, "Duplex");
  Object.defineProperty(Ot.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function YS() {
    this.allowHalfOpen || this._writableState.ended || Mg.nextTick(JS, this);
  }
  s(YS, "onend");
  function JS(e) {
    e.end();
  }
  s(JS, "onEndNT");
  Object.defineProperty(Ot.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = e, this._writableState.destroyed =
      e);
    }, "set")
  });
  Ot.prototype._destroy = function(e, t) {
    this.push(null), this.end(), Mg.nextTick(t, e);
  };
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/_stream_readable.js
var Ll = b((BM, Jg) => {
  "use strict";
  var Di = Ve();
  Jg.exports = ce;
  var XS = _g(), _n;
  ce.ReadableState = Zg;
  var OM = require("events").EventEmitter, $g = /* @__PURE__ */ s(function(e, t) {
    return e.listeners(t).length;
  }, "EElistenerCount"), Hl = kl(), wn = ro().Buffer, QS = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ?
  self : {}).Uint8Array || function() {
  };
  function eT(e) {
    return wn.from(e);
  }
  s(eT, "_uint8ArrayToBuffer");
  function tT(e) {
    return wn.isBuffer(e) || e instanceof QS;
  }
  s(tT, "_isUint8Array");
  var Hg = Object.create(Me());
  Hg.inherits = oe();
  var Nl = require("util"), Q = void 0;
  Nl && Nl.debuglog ? Q = Nl.debuglog("stream") : Q = /* @__PURE__ */ s(function() {
  }, "debug");
  var rT = Fg(), Vg = Pl(), pi;
  Hg.inherits(ce, Hl);
  var Ul = ["error", "close", "destroy", "pause", "resume"];
  function iT(e, t, r) {
    if (typeof e.prependListener == "function") return e.prependListener(t, r);
    !e._events || !e._events[t] ? e.on(t, r) : XS(e._events[t]) ? e._events[t].unshift(r) : e._events[t] = [r, e._events[t]];
  }
  s(iT, "prependListener");
  function Zg(e, t) {
    _n = _n || br(), e = e || {};
    var r = t instanceof _n;
    this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.readableObjectMode);
    var i = e.highWaterMark, n = e.readableHighWaterMark, o = this.objectMode ? 16 : 16 * 1024;
    i || i === 0 ? this.highWaterMark = i : r && (n || n === 0) ? this.highWaterMark = n : this.highWaterMark = o, this.highWaterMark = Math.
    floor(this.highWaterMark), this.buffer = new rT(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended =
    !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening =
    !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = e.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore =
    !1, this.decoder = null, this.encoding = null, e.encoding && (pi || (pi = require("string_decoder/").StringDecoder), this.decoder = new pi(
    e.encoding), this.encoding = e.encoding);
  }
  s(Zg, "ReadableState");
  function ce(e) {
    if (_n = _n || br(), !(this instanceof ce)) return new ce(e);
    this._readableState = new Zg(e, this), this.readable = !0, e && (typeof e.read == "function" && (this._read = e.read), typeof e.destroy ==
    "function" && (this._destroy = e.destroy)), Hl.call(this);
  }
  s(ce, "Readable");
  Object.defineProperty(ce.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._readableState && (this._readableState.destroyed = e);
    }, "set")
  });
  ce.prototype.destroy = Vg.destroy;
  ce.prototype._undestroy = Vg.undestroy;
  ce.prototype._destroy = function(e, t) {
    this.push(null), t(e);
  };
  ce.prototype.push = function(e, t) {
    var r = this._readableState, i;
    return r.objectMode ? i = !0 : typeof e == "string" && (t = t || r.defaultEncoding, t !== r.encoding && (e = wn.from(e, t), t = ""), i =
    !0), zg(this, e, t, !1, i);
  };
  ce.prototype.unshift = function(e) {
    return zg(this, e, null, !0, !1);
  };
  function zg(e, t, r, i, n) {
    var o = e._readableState;
    if (t === null)
      o.reading = !1, aT(e, o);
    else {
      var a;
      n || (a = nT(o, t)), a ? e.emit("error", a) : o.objectMode || t && t.length > 0 ? (typeof t != "string" && !o.objectMode && Object.getPrototypeOf(
      t) !== wn.prototype && (t = eT(t)), i ? o.endEmitted ? e.emit("error", new Error("stream.unshift() after end event")) : Wl(e, o, t, !0) :
      o.ended ? e.emit("error", new Error("stream.push() after EOF")) : (o.reading = !1, o.decoder && !r ? (t = o.decoder.write(t), o.objectMode ||
      t.length !== 0 ? Wl(e, o, t, !1) : Gg(e, o)) : Wl(e, o, t, !1))) : i || (o.reading = !1);
    }
    return sT(o);
  }
  s(zg, "readableAddChunk");
  function Wl(e, t, r, i) {
    t.flowing && t.length === 0 && !t.sync ? (e.emit("data", r), e.read(0)) : (t.length += t.objectMode ? 1 : r.length, i ? t.buffer.unshift(
    r) : t.buffer.push(r), t.needReadable && co(e)), Gg(e, t);
  }
  s(Wl, "addChunk");
  function nT(e, t) {
    var r;
    return !tT(t) && typeof t != "string" && t !== void 0 && !e.objectMode && (r = new TypeError("Invalid non-string/buffer chunk")), r;
  }
  s(nT, "chunkInvalid");
  function sT(e) {
    return !e.ended && (e.needReadable || e.length < e.highWaterMark || e.length === 0);
  }
  s(sT, "needMoreData");
  ce.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  };
  ce.prototype.setEncoding = function(e) {
    return pi || (pi = require("string_decoder/").StringDecoder), this._readableState.decoder = new pi(e), this._readableState.encoding = e,
    this;
  };
  var Ng = 8388608;
  function oT(e) {
    return e >= Ng ? e = Ng : (e--, e |= e >>> 1, e |= e >>> 2, e |= e >>> 4, e |= e >>> 8, e |= e >>> 16, e++), e;
  }
  s(oT, "computeNewHighWaterMark");
  function Ug(e, t) {
    return e <= 0 || t.length === 0 && t.ended ? 0 : t.objectMode ? 1 : e !== e ? t.flowing && t.length ? t.buffer.head.data.length : t.length :
    (e > t.highWaterMark && (t.highWaterMark = oT(e)), e <= t.length ? e : t.ended ? t.length : (t.needReadable = !0, 0));
  }
  s(Ug, "howMuchToRead");
  ce.prototype.read = function(e) {
    Q("read", e), e = parseInt(e, 10);
    var t = this._readableState, r = e;
    if (e !== 0 && (t.emittedReadable = !1), e === 0 && t.needReadable && (t.length >= t.highWaterMark || t.ended))
      return Q("read: emitReadable", t.length, t.ended), t.length === 0 && t.ended ? $l(this) : co(this), null;
    if (e = Ug(e, t), e === 0 && t.ended)
      return t.length === 0 && $l(this), null;
    var i = t.needReadable;
    Q("need readable", i), (t.length === 0 || t.length - e < t.highWaterMark) && (i = !0, Q("length less than watermark", i)), t.ended || t.
    reading ? (i = !1, Q("reading or ended", i)) : i && (Q("do read"), t.reading = !0, t.sync = !0, t.length === 0 && (t.needReadable = !0),
    this._read(t.highWaterMark), t.sync = !1, t.reading || (e = Ug(r, t)));
    var n;
    return e > 0 ? n = Kg(e, t) : n = null, n === null ? (t.needReadable = !0, e = 0) : t.length -= e, t.length === 0 && (t.ended || (t.needReadable =
    !0), r !== e && t.ended && $l(this)), n !== null && this.emit("data", n), n;
  };
  function aT(e, t) {
    if (!t.ended) {
      if (t.decoder) {
        var r = t.decoder.end();
        r && r.length && (t.buffer.push(r), t.length += t.objectMode ? 1 : r.length);
      }
      t.ended = !0, co(e);
    }
  }
  s(aT, "onEofChunk");
  function co(e) {
    var t = e._readableState;
    t.needReadable = !1, t.emittedReadable || (Q("emitReadable", t.flowing), t.emittedReadable = !0, t.sync ? Di.nextTick(Wg, e) : Wg(e));
  }
  s(co, "emitReadable");
  function Wg(e) {
    Q("emit readable"), e.emit("readable"), Vl(e);
  }
  s(Wg, "emitReadable_");
  function Gg(e, t) {
    t.readingMore || (t.readingMore = !0, Di.nextTick(uT, e, t));
  }
  s(Gg, "maybeReadMore");
  function uT(e, t) {
    for (var r = t.length; !t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark && (Q("maybeReadMore read 0"), e.read(0), r !==
    t.length); )
      r = t.length;
    t.readingMore = !1;
  }
  s(uT, "maybeReadMore_");
  ce.prototype._read = function(e) {
    this.emit("error", new Error("_read() is not implemented"));
  };
  ce.prototype.pipe = function(e, t) {
    var r = this, i = this._readableState;
    switch (i.pipesCount) {
      case 0:
        i.pipes = e;
        break;
      case 1:
        i.pipes = [i.pipes, e];
        break;
      default:
        i.pipes.push(e);
        break;
    }
    i.pipesCount += 1, Q("pipe count=%d opts=%j", i.pipesCount, t);
    var n = (!t || t.end !== !1) && e !== process.stdout && e !== process.stderr, o = n ? u : _;
    i.endEmitted ? Di.nextTick(o) : r.once("end", o), e.on("unpipe", a);
    function a(C, x) {
      Q("onunpipe"), C === r && x && x.hasUnpiped === !1 && (x.hasUnpiped = !0, d());
    }
    s(a, "onunpipe");
    function u() {
      Q("onend"), e.end();
    }
    s(u, "onend");
    var l = lT(r);
    e.on("drain", l);
    var c = !1;
    function d() {
      Q("cleanup"), e.removeListener("close", g), e.removeListener("finish", E), e.removeListener("drain", l), e.removeListener("error", f),
      e.removeListener("unpipe", a), r.removeListener("end", u), r.removeListener("end", _), r.removeListener("data", h), c = !0, i.awaitDrain &&
      (!e._writableState || e._writableState.needDrain) && l();
    }
    s(d, "cleanup");
    var p = !1;
    r.on("data", h);
    function h(C) {
      Q("ondata"), p = !1;
      var x = e.write(C);
      x === !1 && !p && ((i.pipesCount === 1 && i.pipes === e || i.pipesCount > 1 && Yg(i.pipes, e) !== -1) && !c && (Q("false write respons\
e, pause", i.awaitDrain), i.awaitDrain++, p = !0), r.pause());
    }
    s(h, "ondata");
    function f(C) {
      Q("onerror", C), _(), e.removeListener("error", f), $g(e, "error") === 0 && e.emit("error", C);
    }
    s(f, "onerror"), iT(e, "error", f);
    function g() {
      e.removeListener("finish", E), _();
    }
    s(g, "onclose"), e.once("close", g);
    function E() {
      Q("onfinish"), e.removeListener("close", g), _();
    }
    s(E, "onfinish"), e.once("finish", E);
    function _() {
      Q("unpipe"), r.unpipe(e);
    }
    return s(_, "unpipe"), e.emit("pipe", r), i.flowing || (Q("pipe resume"), r.resume()), e;
  };
  function lT(e) {
    return function() {
      var t = e._readableState;
      Q("pipeOnDrain", t.awaitDrain), t.awaitDrain && t.awaitDrain--, t.awaitDrain === 0 && $g(e, "data") && (t.flowing = !0, Vl(e));
    };
  }
  s(lT, "pipeOnDrain");
  ce.prototype.unpipe = function(e) {
    var t = this._readableState, r = { hasUnpiped: !1 };
    if (t.pipesCount === 0) return this;
    if (t.pipesCount === 1)
      return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, t.flowing = !1, e && e.emit("unpipe", this, r),
      this);
    if (!e) {
      var i = t.pipes, n = t.pipesCount;
      t.pipes = null, t.pipesCount = 0, t.flowing = !1;
      for (var o = 0; o < n; o++)
        i[o].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var a = Yg(t.pipes, e);
    return a === -1 ? this : (t.pipes.splice(a, 1), t.pipesCount -= 1, t.pipesCount === 1 && (t.pipes = t.pipes[0]), e.emit("unpipe", this, r),
    this);
  };
  ce.prototype.on = function(e, t) {
    var r = Hl.prototype.on.call(this, e, t);
    if (e === "data")
      this._readableState.flowing !== !1 && this.resume();
    else if (e === "readable") {
      var i = this._readableState;
      !i.endEmitted && !i.readableListening && (i.readableListening = i.needReadable = !0, i.emittedReadable = !1, i.reading ? i.length && co(
      this) : Di.nextTick(cT, this));
    }
    return r;
  };
  ce.prototype.addListener = ce.prototype.on;
  function cT(e) {
    Q("readable nexttick read 0"), e.read(0);
  }
  s(cT, "nReadingNextTick");
  ce.prototype.resume = function() {
    var e = this._readableState;
    return e.flowing || (Q("resume"), e.flowing = !0, dT(this, e)), this;
  };
  function dT(e, t) {
    t.resumeScheduled || (t.resumeScheduled = !0, Di.nextTick(fT, e, t));
  }
  s(dT, "resume");
  function fT(e, t) {
    t.reading || (Q("resume read 0"), e.read(0)), t.resumeScheduled = !1, t.awaitDrain = 0, e.emit("resume"), Vl(e), t.flowing && !t.reading &&
    e.read(0);
  }
  s(fT, "resume_");
  ce.prototype.pause = function() {
    return Q("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (Q("pause"), this._readableState.flowing =
    !1, this.emit("pause")), this;
  };
  function Vl(e) {
    var t = e._readableState;
    for (Q("flow", t.flowing); t.flowing && e.read() !== null; )
      ;
  }
  s(Vl, "flow");
  ce.prototype.wrap = function(e) {
    var t = this, r = this._readableState, i = !1;
    e.on("end", function() {
      if (Q("wrapped end"), r.decoder && !r.ended) {
        var a = r.decoder.end();
        a && a.length && t.push(a);
      }
      t.push(null);
    }), e.on("data", function(a) {
      if (Q("wrapped data"), r.decoder && (a = r.decoder.write(a)), !(r.objectMode && a == null) && !(!r.objectMode && (!a || !a.length))) {
        var u = t.push(a);
        u || (i = !0, e.pause());
      }
    });
    for (var n in e)
      this[n] === void 0 && typeof e[n] == "function" && (this[n] = /* @__PURE__ */ function(a) {
        return function() {
          return e[a].apply(e, arguments);
        };
      }(n));
    for (var o = 0; o < Ul.length; o++)
      e.on(Ul[o], this.emit.bind(this, Ul[o]));
    return this._read = function(a) {
      Q("wrapped _read", a), i && (i = !1, e.resume());
    }, this;
  };
  Object.defineProperty(ce.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState.highWaterMark;
    }, "get")
  });
  ce._fromList = Kg;
  function Kg(e, t) {
    if (t.length === 0) return null;
    var r;
    return t.objectMode ? r = t.buffer.shift() : !e || e >= t.length ? (t.decoder ? r = t.buffer.join("") : t.buffer.length === 1 ? r = t.buffer.
    head.data : r = t.buffer.concat(t.length), t.buffer.clear()) : r = hT(e, t.buffer, t.decoder), r;
  }
  s(Kg, "fromList");
  function hT(e, t, r) {
    var i;
    return e < t.head.data.length ? (i = t.head.data.slice(0, e), t.head.data = t.head.data.slice(e)) : e === t.head.data.length ? i = t.shift() :
    i = r ? pT(e, t) : DT(e, t), i;
  }
  s(hT, "fromListPartial");
  function pT(e, t) {
    var r = t.head, i = 1, n = r.data;
    for (e -= n.length; r = r.next; ) {
      var o = r.data, a = e > o.length ? o.length : e;
      if (a === o.length ? n += o : n += o.slice(0, e), e -= a, e === 0) {
        a === o.length ? (++i, r.next ? t.head = r.next : t.head = t.tail = null) : (t.head = r, r.data = o.slice(a));
        break;
      }
      ++i;
    }
    return t.length -= i, n;
  }
  s(pT, "copyFromBufferString");
  function DT(e, t) {
    var r = wn.allocUnsafe(e), i = t.head, n = 1;
    for (i.data.copy(r), e -= i.data.length; i = i.next; ) {
      var o = i.data, a = e > o.length ? o.length : e;
      if (o.copy(r, r.length - e, 0, a), e -= a, e === 0) {
        a === o.length ? (++n, i.next ? t.head = i.next : t.head = t.tail = null) : (t.head = i, i.data = o.slice(a));
        break;
      }
      ++n;
    }
    return t.length -= n, r;
  }
  s(DT, "copyFromBuffer");
  function $l(e) {
    var t = e._readableState;
    if (t.length > 0) throw new Error('"endReadable()" called on non-empty stream');
    t.endEmitted || (t.ended = !0, Di.nextTick(mT, t, e));
  }
  s($l, "endReadable");
  function mT(e, t) {
    !e.endEmitted && e.length === 0 && (e.endEmitted = !0, t.readable = !1, t.emit("end"));
  }
  s(mT, "endReadableNT");
  function Yg(e, t) {
    for (var r = 0, i = e.length; r < i; r++)
      if (e[r] === t) return r;
    return -1;
  }
  s(Yg, "indexOf");
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/_stream_transform.js
var Zl = b((IM, ey) => {
  "use strict";
  ey.exports = Bt;
  var fo = br(), Qg = Object.create(Me());
  Qg.inherits = oe();
  Qg.inherits(Bt, fo);
  function gT(e, t) {
    var r = this._transformState;
    r.transforming = !1;
    var i = r.writecb;
    if (!i)
      return this.emit("error", new Error("write callback called multiple times"));
    r.writechunk = null, r.writecb = null, t != null && this.push(t), i(e);
    var n = this._readableState;
    n.reading = !1, (n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
  }
  s(gT, "afterTransform");
  function Bt(e) {
    if (!(this instanceof Bt)) return new Bt(e);
    fo.call(this, e), this._transformState = {
      afterTransform: gT.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, e && (typeof e.transform == "function" && (this._transform = e.
    transform), typeof e.flush == "function" && (this._flush = e.flush)), this.on("prefinish", yT);
  }
  s(Bt, "Transform");
  function yT() {
    var e = this;
    typeof this._flush == "function" ? this._flush(function(t, r) {
      Xg(e, t, r);
    }) : Xg(this, null, null);
  }
  s(yT, "prefinish");
  Bt.prototype.push = function(e, t) {
    return this._transformState.needTransform = !1, fo.prototype.push.call(this, e, t);
  };
  Bt.prototype._transform = function(e, t, r) {
    throw new Error("_transform() is not implemented");
  };
  Bt.prototype._write = function(e, t, r) {
    var i = this._transformState;
    if (i.writecb = r, i.writechunk = e, i.writeencoding = t, !i.transforming) {
      var n = this._readableState;
      (i.needTransform || n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
    }
  };
  Bt.prototype._read = function(e) {
    var t = this._transformState;
    t.writechunk !== null && t.writecb && !t.transforming ? (t.transforming = !0, this._transform(t.writechunk, t.writeencoding, t.afterTransform)) :
    t.needTransform = !0;
  };
  Bt.prototype._destroy = function(e, t) {
    var r = this;
    fo.prototype._destroy.call(this, e, function(i) {
      t(i), r.emit("close");
    });
  };
  function Xg(e, t, r) {
    if (t) return e.emit("error", t);
    if (r != null && e.push(r), e._writableState.length) throw new Error("Calling transform done when ws.length != 0");
    if (e._transformState.transforming) throw new Error("Calling transform done when still transforming");
    return e.push(null);
  }
  s(Xg, "done");
});

// ../node_modules/peek-stream/node_modules/readable-stream/lib/_stream_passthrough.js
var ny = b((jM, iy) => {
  "use strict";
  iy.exports = En;
  var ty = Zl(), ry = Object.create(Me());
  ry.inherits = oe();
  ry.inherits(En, ty);
  function En(e) {
    if (!(this instanceof En)) return new En(e);
    ty.call(this, e);
  }
  s(En, "PassThrough");
  En.prototype._transform = function(e, t, r) {
    r(null, e);
  };
});

// ../node_modules/peek-stream/node_modules/readable-stream/readable.js
var sy = b((Ae, ho) => {
  var Dt = require("stream");
  process.env.READABLE_STREAM === "disable" && Dt ? (ho.exports = Dt, Ae = ho.exports = Dt.Readable, Ae.Readable = Dt.Readable, Ae.Writable =
  Dt.Writable, Ae.Duplex = Dt.Duplex, Ae.Transform = Dt.Transform, Ae.PassThrough = Dt.PassThrough, Ae.Stream = Dt) : (Ae = ho.exports = Ll(),
  Ae.Stream = Dt || Ae, Ae.Readable = Ae, Ae.Writable = Ml(), Ae.Duplex = br(), Ae.Transform = Zl(), Ae.PassThrough = ny());
});

// ../node_modules/stream-shift/index.js
var zl = b((LM, oy) => {
  oy.exports = bT;
  function bT(e) {
    var t = e._readableState;
    return t ? t.objectMode || typeof e._duplexState == "number" ? e.read() : e.read(vT(t)) : null;
  }
  s(bT, "shift");
  function vT(e) {
    if (e.buffer.length) {
      var t = e.bufferIndex || 0;
      if (e.buffer.head)
        return e.buffer.head.data.length;
      if (e.buffer.length - t > 0 && e.buffer[t])
        return e.buffer[t].length;
    }
    return e.length;
  }
  s(vT, "getStateLength");
});

// ../node_modules/peek-stream/node_modules/duplexify/index.js
var dy = b((UM, cy) => {
  var po = sy(), ay = ti(), _T = oe(), wT = zl(), uy = Buffer.from && Buffer.from !== Uint8Array.from ? Buffer.from([0]) : new Buffer([0]), Gl = /* @__PURE__ */ s(
  function(e, t) {
    e._corked ? e.once("uncork", t) : t();
  }, "onuncork"), ET = /* @__PURE__ */ s(function(e, t) {
    e._autoDestroy && e.destroy(t);
  }, "autoDestroy"), ly = /* @__PURE__ */ s(function(e, t) {
    return function(r) {
      r ? ET(e, r.message === "premature close" ? null : r) : t && !e._ended && e.end();
    };
  }, "destroyer"), CT = /* @__PURE__ */ s(function(e, t) {
    if (!e || e._writableState && e._writableState.finished) return t();
    if (e._writableState) return e.end(t);
    e.end(), t();
  }, "end"), xT = /* @__PURE__ */ s(function(e) {
    return new po.Readable({ objectMode: !0, highWaterMark: 16 }).wrap(e);
  }, "toStreams2"), Re = /* @__PURE__ */ s(function(e, t, r) {
    if (!(this instanceof Re)) return new Re(e, t, r);
    po.Duplex.call(this, r), this._writable = null, this._readable = null, this._readable2 = null, this._autoDestroy = !r || r.autoDestroy !==
    !1, this._forwardDestroy = !r || r.destroy !== !1, this._forwardEnd = !r || r.end !== !1, this._corked = 1, this._ondrain = null, this._drained =
    !1, this._forwarding = !1, this._unwrite = null, this._unread = null, this._ended = !1, this.destroyed = !1, e && this.setWritable(e), t &&
    this.setReadable(t);
  }, "Duplexify");
  _T(Re, po.Duplex);
  Re.obj = function(e, t, r) {
    return r || (r = {}), r.objectMode = !0, r.highWaterMark = 16, new Re(e, t, r);
  };
  Re.prototype.cork = function() {
    ++this._corked === 1 && this.emit("cork");
  };
  Re.prototype.uncork = function() {
    this._corked && --this._corked === 0 && this.emit("uncork");
  };
  Re.prototype.setWritable = function(e) {
    if (this._unwrite && this._unwrite(), this.destroyed) {
      e && e.destroy && e.destroy();
      return;
    }
    if (e === null || e === !1) {
      this.end();
      return;
    }
    var t = this, r = ay(e, { writable: !0, readable: !1 }, ly(this, this._forwardEnd)), i = /* @__PURE__ */ s(function() {
      var o = t._ondrain;
      t._ondrain = null, o && o();
    }, "ondrain"), n = /* @__PURE__ */ s(function() {
      t._writable.removeListener("drain", i), r();
    }, "clear");
    this._unwrite && process.nextTick(i), this._writable = e, this._writable.on("drain", i), this._unwrite = n, this.uncork();
  };
  Re.prototype.setReadable = function(e) {
    if (this._unread && this._unread(), this.destroyed) {
      e && e.destroy && e.destroy();
      return;
    }
    if (e === null || e === !1) {
      this.push(null), this.resume();
      return;
    }
    var t = this, r = ay(e, { writable: !1, readable: !0 }, ly(this)), i = /* @__PURE__ */ s(function() {
      t._forward();
    }, "onreadable"), n = /* @__PURE__ */ s(function() {
      t.push(null);
    }, "onend"), o = /* @__PURE__ */ s(function() {
      t._readable2.removeListener("readable", i), t._readable2.removeListener("end", n), r();
    }, "clear");
    this._drained = !0, this._readable = e, this._readable2 = e._readableState ? e : xT(e), this._readable2.on("readable", i), this._readable2.
    on("end", n), this._unread = o, this._forward();
  };
  Re.prototype._read = function() {
    this._drained = !0, this._forward();
  };
  Re.prototype._forward = function() {
    if (!(this._forwarding || !this._readable2 || !this._drained)) {
      this._forwarding = !0;
      for (var e; this._drained && (e = wT(this._readable2)) !== null; )
        this.destroyed || (this._drained = this.push(e));
      this._forwarding = !1;
    }
  };
  Re.prototype.destroy = function(e) {
    if (!this.destroyed) {
      this.destroyed = !0;
      var t = this;
      process.nextTick(function() {
        t._destroy(e);
      });
    }
  };
  Re.prototype._destroy = function(e) {
    if (e) {
      var t = this._ondrain;
      this._ondrain = null, t ? t(e) : this.emit("error", e);
    }
    this._forwardDestroy && (this._readable && this._readable.destroy && this._readable.destroy(), this._writable && this._writable.destroy &&
    this._writable.destroy()), this.emit("close");
  };
  Re.prototype._write = function(e, t, r) {
    if (this.destroyed) return r();
    if (this._corked) return Gl(this, this._write.bind(this, e, t, r));
    if (e === uy) return this._finish(r);
    if (!this._writable) return r();
    this._writable.write(e) === !1 ? this._ondrain = r : r();
  };
  Re.prototype._finish = function(e) {
    var t = this;
    this.emit("preend"), Gl(this, function() {
      CT(t._forwardEnd && t._writable, function() {
        t._writableState.prefinished === !1 && (t._writableState.prefinished = !0), t.emit("prefinish"), Gl(t, e);
      });
    });
  };
  Re.prototype.end = function(e, t, r) {
    return typeof e == "function" ? this.end(null, null, e) : typeof t == "function" ? this.end(e, null, t) : (this._ended = !0, e && this.write(
    e), this._writableState.ending || this.write(uy), po.Writable.prototype.end.call(this, r));
  };
  cy.exports = Re;
});

// ../node_modules/through2/node_modules/isarray/index.js
var hy = b(($M, fy) => {
  var FT = {}.toString;
  fy.exports = Array.isArray || function(e) {
    return FT.call(e) == "[object Array]";
  };
});

// ../node_modules/through2/node_modules/readable-stream/lib/internal/streams/stream.js
var Kl = b((HM, py) => {
  py.exports = require("stream");
});

// ../node_modules/through2/node_modules/safe-buffer/index.js
var mo = b((Yl, my) => {
  var Do = require("buffer"), Pt = Do.Buffer;
  function Dy(e, t) {
    for (var r in e)
      t[r] = e[r];
  }
  s(Dy, "copyProps");
  Pt.from && Pt.alloc && Pt.allocUnsafe && Pt.allocUnsafeSlow ? my.exports = Do : (Dy(Do, Yl), Yl.Buffer = mi);
  function mi(e, t, r) {
    return Pt(e, t, r);
  }
  s(mi, "SafeBuffer");
  Dy(Pt, mi);
  mi.from = function(e, t, r) {
    if (typeof e == "number")
      throw new TypeError("Argument must not be a number");
    return Pt(e, t, r);
  };
  mi.alloc = function(e, t, r) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    var i = Pt(e);
    return t !== void 0 ? typeof r == "string" ? i.fill(t, r) : i.fill(t) : i.fill(0), i;
  };
  mi.allocUnsafe = function(e) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    return Pt(e);
  };
  mi.allocUnsafeSlow = function(e) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    return Do.SlowBuffer(e);
  };
});

// ../node_modules/through2/node_modules/readable-stream/lib/internal/streams/BufferList.js
var yy = b((ZM, Jl) => {
  "use strict";
  function ST(e, t) {
    if (!(e instanceof t))
      throw new TypeError("Cannot call a class as a function");
  }
  s(ST, "_classCallCheck");
  var gy = mo().Buffer, Cn = require("util");
  function TT(e, t, r) {
    e.copy(t, r);
  }
  s(TT, "copyBuffer");
  Jl.exports = function() {
    function e() {
      ST(this, e), this.head = null, this.tail = null, this.length = 0;
    }
    return s(e, "BufferList"), e.prototype.push = /* @__PURE__ */ s(function(r) {
      var i = { data: r, next: null };
      this.length > 0 ? this.tail.next = i : this.head = i, this.tail = i, ++this.length;
    }, "push"), e.prototype.unshift = /* @__PURE__ */ s(function(r) {
      var i = { data: r, next: this.head };
      this.length === 0 && (this.tail = i), this.head = i, ++this.length;
    }, "unshift"), e.prototype.shift = /* @__PURE__ */ s(function() {
      if (this.length !== 0) {
        var r = this.head.data;
        return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, r;
      }
    }, "shift"), e.prototype.clear = /* @__PURE__ */ s(function() {
      this.head = this.tail = null, this.length = 0;
    }, "clear"), e.prototype.join = /* @__PURE__ */ s(function(r) {
      if (this.length === 0) return "";
      for (var i = this.head, n = "" + i.data; i = i.next; )
        n += r + i.data;
      return n;
    }, "join"), e.prototype.concat = /* @__PURE__ */ s(function(r) {
      if (this.length === 0) return gy.alloc(0);
      for (var i = gy.allocUnsafe(r >>> 0), n = this.head, o = 0; n; )
        TT(n.data, i, o), o += n.data.length, n = n.next;
      return i;
    }, "concat"), e;
  }();
  Cn && Cn.inspect && Cn.inspect.custom && (Jl.exports.prototype[Cn.inspect.custom] = function() {
    var e = Cn.inspect({ length: this.length });
    return this.constructor.name + " " + e;
  });
});

// ../node_modules/through2/node_modules/readable-stream/lib/internal/streams/destroy.js
var Xl = b((GM, by) => {
  "use strict";
  var go = Ve();
  function AT(e, t) {
    var r = this, i = this._readableState && this._readableState.destroyed, n = this._writableState && this._writableState.destroyed;
    return i || n ? (t ? t(e) : e && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, go.nextTick(
    yo, this, e)) : go.nextTick(yo, this, e)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this.
    _writableState.destroyed = !0), this._destroy(e || null, function(o) {
      !t && o ? r._writableState ? r._writableState.errorEmitted || (r._writableState.errorEmitted = !0, go.nextTick(yo, r, o)) : go.nextTick(
      yo, r, o) : t && t(o);
    }), this);
  }
  s(AT, "destroy");
  function RT() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.
    endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending =
    !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted =
    !1);
  }
  s(RT, "undestroy");
  function yo(e, t) {
    e.emit("error", t);
  }
  s(yo, "emitErrorNT");
  by.exports = {
    destroy: AT,
    undestroy: RT
  };
});

// ../node_modules/through2/node_modules/readable-stream/lib/_stream_writable.js
var ec = b((YM, Sy) => {
  "use strict";
  var vr = Ve();
  Sy.exports = Ce;
  function _y(e) {
    var t = this;
    this.next = null, this.entry = null, this.finish = function() {
      GT(t, e);
    };
  }
  s(_y, "CorkedRequest");
  var kT = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : vr.nextTick, gi;
  Ce.WritableState = Fn;
  var wy = Object.create(Me());
  wy.inherits = oe();
  var OT = {
    deprecate: rn()
  }, Ey = Kl(), vo = mo().Buffer, BT = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array ||
  function() {
  };
  function PT(e) {
    return vo.from(e);
  }
  s(PT, "_uint8ArrayToBuffer");
  function IT(e) {
    return vo.isBuffer(e) || e instanceof BT;
  }
  s(IT, "_isUint8Array");
  var Cy = Xl();
  wy.inherits(Ce, Ey);
  function MT() {
  }
  s(MT, "nop");
  function Fn(e, t) {
    gi = gi || _r(), e = e || {};
    var r = t instanceof gi;
    this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.writableObjectMode);
    var i = e.highWaterMark, n = e.writableHighWaterMark, o = this.objectMode ? 16 : 16 * 1024;
    i || i === 0 ? this.highWaterMark = i : r && (n || n === 0) ? this.highWaterMark = n : this.highWaterMark = o, this.highWaterMark = Math.
    floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed =
    !1;
    var a = e.decodeStrings === !1;
    this.decodeStrings = !a, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync =
    !0, this.bufferProcessing = !1, this.onwrite = function(u) {
      $T(t, u);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished =
    !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new _y(this);
  }
  s(Fn, "WritableState");
  Fn.prototype.getBuffer = /* @__PURE__ */ s(function() {
    for (var t = this.bufferedRequest, r = []; t; )
      r.push(t), t = t.next;
    return r;
  }, "getBuffer");
  (function() {
    try {
      Object.defineProperty(Fn.prototype, "buffer", {
        get: OT.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  })();
  var bo;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (bo = Function.prototype[Symbol.
  hasInstance], Object.defineProperty(Ce, Symbol.hasInstance, {
    value: /* @__PURE__ */ s(function(e) {
      return bo.call(this, e) ? !0 : this !== Ce ? !1 : e && e._writableState instanceof Fn;
    }, "value")
  })) : bo = /* @__PURE__ */ s(function(e) {
    return e instanceof this;
  }, "realHasInstance");
  function Ce(e) {
    if (gi = gi || _r(), !bo.call(Ce, this) && !(this instanceof gi))
      return new Ce(e);
    this._writableState = new Fn(e, this), this.writable = !0, e && (typeof e.write == "function" && (this._write = e.write), typeof e.writev ==
    "function" && (this._writev = e.writev), typeof e.destroy == "function" && (this._destroy = e.destroy), typeof e.final == "function" && (this.
    _final = e.final)), Ey.call(this);
  }
  s(Ce, "Writable");
  Ce.prototype.pipe = function() {
    this.emit("error", new Error("Cannot pipe, not readable"));
  };
  function jT(e, t) {
    var r = new Error("write after end");
    e.emit("error", r), vr.nextTick(t, r);
  }
  s(jT, "writeAfterEnd");
  function qT(e, t, r, i) {
    var n = !0, o = !1;
    return r === null ? o = new TypeError("May not write null values to stream") : typeof r != "string" && r !== void 0 && !t.objectMode && (o =
    new TypeError("Invalid non-string/buffer chunk")), o && (e.emit("error", o), vr.nextTick(i, o), n = !1), n;
  }
  s(qT, "validChunk");
  Ce.prototype.write = function(e, t, r) {
    var i = this._writableState, n = !1, o = !i.objectMode && IT(e);
    return o && !vo.isBuffer(e) && (e = PT(e)), typeof t == "function" && (r = t, t = null), o ? t = "buffer" : t || (t = i.defaultEncoding),
    typeof r != "function" && (r = MT), i.ended ? jT(this, r) : (o || qT(this, i, e, r)) && (i.pendingcb++, n = NT(this, i, o, e, t, r)), n;
  };
  Ce.prototype.cork = function() {
    var e = this._writableState;
    e.corked++;
  };
  Ce.prototype.uncork = function() {
    var e = this._writableState;
    e.corked && (e.corked--, !e.writing && !e.corked && !e.bufferProcessing && e.bufferedRequest && xy(this, e));
  };
  Ce.prototype.setDefaultEncoding = /* @__PURE__ */ s(function(t) {
    if (typeof t == "string" && (t = t.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "\
utf-16le", "raw"].indexOf((t + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + t);
    return this._writableState.defaultEncoding = t, this;
  }, "setDefaultEncoding");
  function LT(e, t, r) {
    return !e.objectMode && e.decodeStrings !== !1 && typeof t == "string" && (t = vo.from(t, r)), t;
  }
  s(LT, "decodeChunk");
  Object.defineProperty(Ce.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function NT(e, t, r, i, n, o) {
    if (!r) {
      var a = LT(t, i, n);
      i !== a && (r = !0, n = "buffer", i = a);
    }
    var u = t.objectMode ? 1 : i.length;
    t.length += u;
    var l = t.length < t.highWaterMark;
    if (l || (t.needDrain = !0), t.writing || t.corked) {
      var c = t.lastBufferedRequest;
      t.lastBufferedRequest = {
        chunk: i,
        encoding: n,
        isBuf: r,
        callback: o,
        next: null
      }, c ? c.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest, t.bufferedRequestCount += 1;
    } else
      Ql(e, t, !1, u, i, n, o);
    return l;
  }
  s(NT, "writeOrBuffer");
  function Ql(e, t, r, i, n, o, a) {
    t.writelen = i, t.writecb = a, t.writing = !0, t.sync = !0, r ? e._writev(n, t.onwrite) : e._write(n, o, t.onwrite), t.sync = !1;
  }
  s(Ql, "doWrite");
  function UT(e, t, r, i, n) {
    --t.pendingcb, r ? (vr.nextTick(n, i), vr.nextTick(xn, e, t), e._writableState.errorEmitted = !0, e.emit("error", i)) : (n(i), e._writableState.
    errorEmitted = !0, e.emit("error", i), xn(e, t));
  }
  s(UT, "onwriteError");
  function WT(e) {
    e.writing = !1, e.writecb = null, e.length -= e.writelen, e.writelen = 0;
  }
  s(WT, "onwriteStateUpdate");
  function $T(e, t) {
    var r = e._writableState, i = r.sync, n = r.writecb;
    if (WT(r), t) UT(e, r, i, t, n);
    else {
      var o = Fy(r);
      !o && !r.corked && !r.bufferProcessing && r.bufferedRequest && xy(e, r), i ? kT(vy, e, r, o, n) : vy(e, r, o, n);
    }
  }
  s($T, "onwrite");
  function vy(e, t, r, i) {
    r || HT(e, t), t.pendingcb--, i(), xn(e, t);
  }
  s(vy, "afterWrite");
  function HT(e, t) {
    t.length === 0 && t.needDrain && (t.needDrain = !1, e.emit("drain"));
  }
  s(HT, "onwriteDrain");
  function xy(e, t) {
    t.bufferProcessing = !0;
    var r = t.bufferedRequest;
    if (e._writev && r && r.next) {
      var i = t.bufferedRequestCount, n = new Array(i), o = t.corkedRequestsFree;
      o.entry = r;
      for (var a = 0, u = !0; r; )
        n[a] = r, r.isBuf || (u = !1), r = r.next, a += 1;
      n.allBuffers = u, Ql(e, t, !0, t.length, n, "", o.finish), t.pendingcb++, t.lastBufferedRequest = null, o.next ? (t.corkedRequestsFree =
      o.next, o.next = null) : t.corkedRequestsFree = new _y(t), t.bufferedRequestCount = 0;
    } else {
      for (; r; ) {
        var l = r.chunk, c = r.encoding, d = r.callback, p = t.objectMode ? 1 : l.length;
        if (Ql(e, t, !1, p, l, c, d), r = r.next, t.bufferedRequestCount--, t.writing)
          break;
      }
      r === null && (t.lastBufferedRequest = null);
    }
    t.bufferedRequest = r, t.bufferProcessing = !1;
  }
  s(xy, "clearBuffer");
  Ce.prototype._write = function(e, t, r) {
    r(new Error("_write() is not implemented"));
  };
  Ce.prototype._writev = null;
  Ce.prototype.end = function(e, t, r) {
    var i = this._writableState;
    typeof e == "function" ? (r = e, e = null, t = null) : typeof t == "function" && (r = t, t = null), e != null && this.write(e, t), i.corked &&
    (i.corked = 1, this.uncork()), i.ending || zT(this, i, r);
  };
  function Fy(e) {
    return e.ending && e.length === 0 && e.bufferedRequest === null && !e.finished && !e.writing;
  }
  s(Fy, "needFinish");
  function VT(e, t) {
    e._final(function(r) {
      t.pendingcb--, r && e.emit("error", r), t.prefinished = !0, e.emit("prefinish"), xn(e, t);
    });
  }
  s(VT, "callFinal");
  function ZT(e, t) {
    !t.prefinished && !t.finalCalled && (typeof e._final == "function" ? (t.pendingcb++, t.finalCalled = !0, vr.nextTick(VT, e, t)) : (t.prefinished =
    !0, e.emit("prefinish")));
  }
  s(ZT, "prefinish");
  function xn(e, t) {
    var r = Fy(t);
    return r && (ZT(e, t), t.pendingcb === 0 && (t.finished = !0, e.emit("finish"))), r;
  }
  s(xn, "finishMaybe");
  function zT(e, t, r) {
    t.ending = !0, xn(e, t), r && (t.finished ? vr.nextTick(r) : e.once("finish", r)), t.ended = !0, e.writable = !1;
  }
  s(zT, "endWritable");
  function GT(e, t, r) {
    var i = e.entry;
    for (e.entry = null; i; ) {
      var n = i.callback;
      t.pendingcb--, n(r), i = i.next;
    }
    t.corkedRequestsFree.next = e;
  }
  s(GT, "onCorkedFinish");
  Object.defineProperty(Ce.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._writableState && (this._writableState.destroyed = e);
    }, "set")
  });
  Ce.prototype.destroy = Cy.destroy;
  Ce.prototype._undestroy = Cy.undestroy;
  Ce.prototype._destroy = function(e, t) {
    this.end(), t(e);
  };
});

// ../node_modules/through2/node_modules/readable-stream/lib/_stream_duplex.js
var _r = b((XM, ky) => {
  "use strict";
  var Ty = Ve(), KT = Object.keys || function(e) {
    var t = [];
    for (var r in e)
      t.push(r);
    return t;
  };
  ky.exports = It;
  var Ay = Object.create(Me());
  Ay.inherits = oe();
  var Ry = ic(), rc = ec();
  Ay.inherits(It, Ry);
  for (tc = KT(rc.prototype), _o = 0; _o < tc.length; _o++)
    wo = tc[_o], It.prototype[wo] || (It.prototype[wo] = rc.prototype[wo]);
  var tc, wo, _o;
  function It(e) {
    if (!(this instanceof It)) return new It(e);
    Ry.call(this, e), rc.call(this, e), e && e.readable === !1 && (this.readable = !1), e && e.writable === !1 && (this.writable = !1), this.
    allowHalfOpen = !0, e && e.allowHalfOpen === !1 && (this.allowHalfOpen = !1), this.once("end", YT);
  }
  s(It, "Duplex");
  Object.defineProperty(It.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function YT() {
    this.allowHalfOpen || this._writableState.ended || Ty.nextTick(JT, this);
  }
  s(YT, "onend");
  function JT(e) {
    e.end();
  }
  s(JT, "onEndNT");
  Object.defineProperty(It.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = e, this._writableState.destroyed =
      e);
    }, "set")
  });
  It.prototype._destroy = function(e, t) {
    this.push(null), this.end(), Ty.nextTick(t, e);
  };
});

// ../node_modules/through2/node_modules/readable-stream/lib/_stream_readable.js
var ic = b((tj, $y) => {
  "use strict";
  var bi = Ve();
  $y.exports = de;
  var XT = hy(), Sn;
  de.ReadableState = qy;
  var ej = require("events").EventEmitter, Iy = /* @__PURE__ */ s(function(e, t) {
    return e.listeners(t).length;
  }, "EElistenerCount"), uc = Kl(), Tn = mo().Buffer, QT = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ?
  self : {}).Uint8Array || function() {
  };
  function eA(e) {
    return Tn.from(e);
  }
  s(eA, "_uint8ArrayToBuffer");
  function tA(e) {
    return Tn.isBuffer(e) || e instanceof QT;
  }
  s(tA, "_isUint8Array");
  var My = Object.create(Me());
  My.inherits = oe();
  var nc = require("util"), ee = void 0;
  nc && nc.debuglog ? ee = nc.debuglog("stream") : ee = /* @__PURE__ */ s(function() {
  }, "debug");
  var rA = yy(), jy = Xl(), yi;
  My.inherits(de, uc);
  var sc = ["error", "close", "destroy", "pause", "resume"];
  function iA(e, t, r) {
    if (typeof e.prependListener == "function") return e.prependListener(t, r);
    !e._events || !e._events[t] ? e.on(t, r) : XT(e._events[t]) ? e._events[t].unshift(r) : e._events[t] = [r, e._events[t]];
  }
  s(iA, "prependListener");
  function qy(e, t) {
    Sn = Sn || _r(), e = e || {};
    var r = t instanceof Sn;
    this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.readableObjectMode);
    var i = e.highWaterMark, n = e.readableHighWaterMark, o = this.objectMode ? 16 : 16 * 1024;
    i || i === 0 ? this.highWaterMark = i : r && (n || n === 0) ? this.highWaterMark = n : this.highWaterMark = o, this.highWaterMark = Math.
    floor(this.highWaterMark), this.buffer = new rA(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended =
    !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening =
    !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = e.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore =
    !1, this.decoder = null, this.encoding = null, e.encoding && (yi || (yi = require("string_decoder/").StringDecoder), this.decoder = new yi(
    e.encoding), this.encoding = e.encoding);
  }
  s(qy, "ReadableState");
  function de(e) {
    if (Sn = Sn || _r(), !(this instanceof de)) return new de(e);
    this._readableState = new qy(e, this), this.readable = !0, e && (typeof e.read == "function" && (this._read = e.read), typeof e.destroy ==
    "function" && (this._destroy = e.destroy)), uc.call(this);
  }
  s(de, "Readable");
  Object.defineProperty(de.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._readableState && (this._readableState.destroyed = e);
    }, "set")
  });
  de.prototype.destroy = jy.destroy;
  de.prototype._undestroy = jy.undestroy;
  de.prototype._destroy = function(e, t) {
    this.push(null), t(e);
  };
  de.prototype.push = function(e, t) {
    var r = this._readableState, i;
    return r.objectMode ? i = !0 : typeof e == "string" && (t = t || r.defaultEncoding, t !== r.encoding && (e = Tn.from(e, t), t = ""), i =
    !0), Ly(this, e, t, !1, i);
  };
  de.prototype.unshift = function(e) {
    return Ly(this, e, null, !0, !1);
  };
  function Ly(e, t, r, i, n) {
    var o = e._readableState;
    if (t === null)
      o.reading = !1, aA(e, o);
    else {
      var a;
      n || (a = nA(o, t)), a ? e.emit("error", a) : o.objectMode || t && t.length > 0 ? (typeof t != "string" && !o.objectMode && Object.getPrototypeOf(
      t) !== Tn.prototype && (t = eA(t)), i ? o.endEmitted ? e.emit("error", new Error("stream.unshift() after end event")) : oc(e, o, t, !0) :
      o.ended ? e.emit("error", new Error("stream.push() after EOF")) : (o.reading = !1, o.decoder && !r ? (t = o.decoder.write(t), o.objectMode ||
      t.length !== 0 ? oc(e, o, t, !1) : Ny(e, o)) : oc(e, o, t, !1))) : i || (o.reading = !1);
    }
    return sA(o);
  }
  s(Ly, "readableAddChunk");
  function oc(e, t, r, i) {
    t.flowing && t.length === 0 && !t.sync ? (e.emit("data", r), e.read(0)) : (t.length += t.objectMode ? 1 : r.length, i ? t.buffer.unshift(
    r) : t.buffer.push(r), t.needReadable && Eo(e)), Ny(e, t);
  }
  s(oc, "addChunk");
  function nA(e, t) {
    var r;
    return !tA(t) && typeof t != "string" && t !== void 0 && !e.objectMode && (r = new TypeError("Invalid non-string/buffer chunk")), r;
  }
  s(nA, "chunkInvalid");
  function sA(e) {
    return !e.ended && (e.needReadable || e.length < e.highWaterMark || e.length === 0);
  }
  s(sA, "needMoreData");
  de.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  };
  de.prototype.setEncoding = function(e) {
    return yi || (yi = require("string_decoder/").StringDecoder), this._readableState.decoder = new yi(e), this._readableState.encoding = e,
    this;
  };
  var Oy = 8388608;
  function oA(e) {
    return e >= Oy ? e = Oy : (e--, e |= e >>> 1, e |= e >>> 2, e |= e >>> 4, e |= e >>> 8, e |= e >>> 16, e++), e;
  }
  s(oA, "computeNewHighWaterMark");
  function By(e, t) {
    return e <= 0 || t.length === 0 && t.ended ? 0 : t.objectMode ? 1 : e !== e ? t.flowing && t.length ? t.buffer.head.data.length : t.length :
    (e > t.highWaterMark && (t.highWaterMark = oA(e)), e <= t.length ? e : t.ended ? t.length : (t.needReadable = !0, 0));
  }
  s(By, "howMuchToRead");
  de.prototype.read = function(e) {
    ee("read", e), e = parseInt(e, 10);
    var t = this._readableState, r = e;
    if (e !== 0 && (t.emittedReadable = !1), e === 0 && t.needReadable && (t.length >= t.highWaterMark || t.ended))
      return ee("read: emitReadable", t.length, t.ended), t.length === 0 && t.ended ? ac(this) : Eo(this), null;
    if (e = By(e, t), e === 0 && t.ended)
      return t.length === 0 && ac(this), null;
    var i = t.needReadable;
    ee("need readable", i), (t.length === 0 || t.length - e < t.highWaterMark) && (i = !0, ee("length less than watermark", i)), t.ended || t.
    reading ? (i = !1, ee("reading or ended", i)) : i && (ee("do read"), t.reading = !0, t.sync = !0, t.length === 0 && (t.needReadable = !0),
    this._read(t.highWaterMark), t.sync = !1, t.reading || (e = By(r, t)));
    var n;
    return e > 0 ? n = Uy(e, t) : n = null, n === null ? (t.needReadable = !0, e = 0) : t.length -= e, t.length === 0 && (t.ended || (t.needReadable =
    !0), r !== e && t.ended && ac(this)), n !== null && this.emit("data", n), n;
  };
  function aA(e, t) {
    if (!t.ended) {
      if (t.decoder) {
        var r = t.decoder.end();
        r && r.length && (t.buffer.push(r), t.length += t.objectMode ? 1 : r.length);
      }
      t.ended = !0, Eo(e);
    }
  }
  s(aA, "onEofChunk");
  function Eo(e) {
    var t = e._readableState;
    t.needReadable = !1, t.emittedReadable || (ee("emitReadable", t.flowing), t.emittedReadable = !0, t.sync ? bi.nextTick(Py, e) : Py(e));
  }
  s(Eo, "emitReadable");
  function Py(e) {
    ee("emit readable"), e.emit("readable"), lc(e);
  }
  s(Py, "emitReadable_");
  function Ny(e, t) {
    t.readingMore || (t.readingMore = !0, bi.nextTick(uA, e, t));
  }
  s(Ny, "maybeReadMore");
  function uA(e, t) {
    for (var r = t.length; !t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark && (ee("maybeReadMore read 0"), e.read(0), r !==
    t.length); )
      r = t.length;
    t.readingMore = !1;
  }
  s(uA, "maybeReadMore_");
  de.prototype._read = function(e) {
    this.emit("error", new Error("_read() is not implemented"));
  };
  de.prototype.pipe = function(e, t) {
    var r = this, i = this._readableState;
    switch (i.pipesCount) {
      case 0:
        i.pipes = e;
        break;
      case 1:
        i.pipes = [i.pipes, e];
        break;
      default:
        i.pipes.push(e);
        break;
    }
    i.pipesCount += 1, ee("pipe count=%d opts=%j", i.pipesCount, t);
    var n = (!t || t.end !== !1) && e !== process.stdout && e !== process.stderr, o = n ? u : _;
    i.endEmitted ? bi.nextTick(o) : r.once("end", o), e.on("unpipe", a);
    function a(C, x) {
      ee("onunpipe"), C === r && x && x.hasUnpiped === !1 && (x.hasUnpiped = !0, d());
    }
    s(a, "onunpipe");
    function u() {
      ee("onend"), e.end();
    }
    s(u, "onend");
    var l = lA(r);
    e.on("drain", l);
    var c = !1;
    function d() {
      ee("cleanup"), e.removeListener("close", g), e.removeListener("finish", E), e.removeListener("drain", l), e.removeListener("error", f),
      e.removeListener("unpipe", a), r.removeListener("end", u), r.removeListener("end", _), r.removeListener("data", h), c = !0, i.awaitDrain &&
      (!e._writableState || e._writableState.needDrain) && l();
    }
    s(d, "cleanup");
    var p = !1;
    r.on("data", h);
    function h(C) {
      ee("ondata"), p = !1;
      var x = e.write(C);
      x === !1 && !p && ((i.pipesCount === 1 && i.pipes === e || i.pipesCount > 1 && Wy(i.pipes, e) !== -1) && !c && (ee("false write respon\
se, pause", i.awaitDrain), i.awaitDrain++, p = !0), r.pause());
    }
    s(h, "ondata");
    function f(C) {
      ee("onerror", C), _(), e.removeListener("error", f), Iy(e, "error") === 0 && e.emit("error", C);
    }
    s(f, "onerror"), iA(e, "error", f);
    function g() {
      e.removeListener("finish", E), _();
    }
    s(g, "onclose"), e.once("close", g);
    function E() {
      ee("onfinish"), e.removeListener("close", g), _();
    }
    s(E, "onfinish"), e.once("finish", E);
    function _() {
      ee("unpipe"), r.unpipe(e);
    }
    return s(_, "unpipe"), e.emit("pipe", r), i.flowing || (ee("pipe resume"), r.resume()), e;
  };
  function lA(e) {
    return function() {
      var t = e._readableState;
      ee("pipeOnDrain", t.awaitDrain), t.awaitDrain && t.awaitDrain--, t.awaitDrain === 0 && Iy(e, "data") && (t.flowing = !0, lc(e));
    };
  }
  s(lA, "pipeOnDrain");
  de.prototype.unpipe = function(e) {
    var t = this._readableState, r = { hasUnpiped: !1 };
    if (t.pipesCount === 0) return this;
    if (t.pipesCount === 1)
      return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, t.flowing = !1, e && e.emit("unpipe", this, r),
      this);
    if (!e) {
      var i = t.pipes, n = t.pipesCount;
      t.pipes = null, t.pipesCount = 0, t.flowing = !1;
      for (var o = 0; o < n; o++)
        i[o].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var a = Wy(t.pipes, e);
    return a === -1 ? this : (t.pipes.splice(a, 1), t.pipesCount -= 1, t.pipesCount === 1 && (t.pipes = t.pipes[0]), e.emit("unpipe", this, r),
    this);
  };
  de.prototype.on = function(e, t) {
    var r = uc.prototype.on.call(this, e, t);
    if (e === "data")
      this._readableState.flowing !== !1 && this.resume();
    else if (e === "readable") {
      var i = this._readableState;
      !i.endEmitted && !i.readableListening && (i.readableListening = i.needReadable = !0, i.emittedReadable = !1, i.reading ? i.length && Eo(
      this) : bi.nextTick(cA, this));
    }
    return r;
  };
  de.prototype.addListener = de.prototype.on;
  function cA(e) {
    ee("readable nexttick read 0"), e.read(0);
  }
  s(cA, "nReadingNextTick");
  de.prototype.resume = function() {
    var e = this._readableState;
    return e.flowing || (ee("resume"), e.flowing = !0, dA(this, e)), this;
  };
  function dA(e, t) {
    t.resumeScheduled || (t.resumeScheduled = !0, bi.nextTick(fA, e, t));
  }
  s(dA, "resume");
  function fA(e, t) {
    t.reading || (ee("resume read 0"), e.read(0)), t.resumeScheduled = !1, t.awaitDrain = 0, e.emit("resume"), lc(e), t.flowing && !t.reading &&
    e.read(0);
  }
  s(fA, "resume_");
  de.prototype.pause = function() {
    return ee("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (ee("pause"), this._readableState.
    flowing = !1, this.emit("pause")), this;
  };
  function lc(e) {
    var t = e._readableState;
    for (ee("flow", t.flowing); t.flowing && e.read() !== null; )
      ;
  }
  s(lc, "flow");
  de.prototype.wrap = function(e) {
    var t = this, r = this._readableState, i = !1;
    e.on("end", function() {
      if (ee("wrapped end"), r.decoder && !r.ended) {
        var a = r.decoder.end();
        a && a.length && t.push(a);
      }
      t.push(null);
    }), e.on("data", function(a) {
      if (ee("wrapped data"), r.decoder && (a = r.decoder.write(a)), !(r.objectMode && a == null) && !(!r.objectMode && (!a || !a.length))) {
        var u = t.push(a);
        u || (i = !0, e.pause());
      }
    });
    for (var n in e)
      this[n] === void 0 && typeof e[n] == "function" && (this[n] = /* @__PURE__ */ function(a) {
        return function() {
          return e[a].apply(e, arguments);
        };
      }(n));
    for (var o = 0; o < sc.length; o++)
      e.on(sc[o], this.emit.bind(this, sc[o]));
    return this._read = function(a) {
      ee("wrapped _read", a), i && (i = !1, e.resume());
    }, this;
  };
  Object.defineProperty(de.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState.highWaterMark;
    }, "get")
  });
  de._fromList = Uy;
  function Uy(e, t) {
    if (t.length === 0) return null;
    var r;
    return t.objectMode ? r = t.buffer.shift() : !e || e >= t.length ? (t.decoder ? r = t.buffer.join("") : t.buffer.length === 1 ? r = t.buffer.
    head.data : r = t.buffer.concat(t.length), t.buffer.clear()) : r = hA(e, t.buffer, t.decoder), r;
  }
  s(Uy, "fromList");
  function hA(e, t, r) {
    var i;
    return e < t.head.data.length ? (i = t.head.data.slice(0, e), t.head.data = t.head.data.slice(e)) : e === t.head.data.length ? i = t.shift() :
    i = r ? pA(e, t) : DA(e, t), i;
  }
  s(hA, "fromListPartial");
  function pA(e, t) {
    var r = t.head, i = 1, n = r.data;
    for (e -= n.length; r = r.next; ) {
      var o = r.data, a = e > o.length ? o.length : e;
      if (a === o.length ? n += o : n += o.slice(0, e), e -= a, e === 0) {
        a === o.length ? (++i, r.next ? t.head = r.next : t.head = t.tail = null) : (t.head = r, r.data = o.slice(a));
        break;
      }
      ++i;
    }
    return t.length -= i, n;
  }
  s(pA, "copyFromBufferString");
  function DA(e, t) {
    var r = Tn.allocUnsafe(e), i = t.head, n = 1;
    for (i.data.copy(r), e -= i.data.length; i = i.next; ) {
      var o = i.data, a = e > o.length ? o.length : e;
      if (o.copy(r, r.length - e, 0, a), e -= a, e === 0) {
        a === o.length ? (++n, i.next ? t.head = i.next : t.head = t.tail = null) : (t.head = i, i.data = o.slice(a));
        break;
      }
      ++n;
    }
    return t.length -= n, r;
  }
  s(DA, "copyFromBuffer");
  function ac(e) {
    var t = e._readableState;
    if (t.length > 0) throw new Error('"endReadable()" called on non-empty stream');
    t.endEmitted || (t.ended = !0, bi.nextTick(mA, t, e));
  }
  s(ac, "endReadable");
  function mA(e, t) {
    !e.endEmitted && e.length === 0 && (e.endEmitted = !0, t.readable = !1, t.emit("end"));
  }
  s(mA, "endReadableNT");
  function Wy(e, t) {
    for (var r = 0, i = e.length; r < i; r++)
      if (e[r] === t) return r;
    return -1;
  }
  s(Wy, "indexOf");
});

// ../node_modules/through2/node_modules/readable-stream/lib/_stream_transform.js
var cc = b((ij, Zy) => {
  "use strict";
  Zy.exports = Mt;
  var Co = _r(), Vy = Object.create(Me());
  Vy.inherits = oe();
  Vy.inherits(Mt, Co);
  function gA(e, t) {
    var r = this._transformState;
    r.transforming = !1;
    var i = r.writecb;
    if (!i)
      return this.emit("error", new Error("write callback called multiple times"));
    r.writechunk = null, r.writecb = null, t != null && this.push(t), i(e);
    var n = this._readableState;
    n.reading = !1, (n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
  }
  s(gA, "afterTransform");
  function Mt(e) {
    if (!(this instanceof Mt)) return new Mt(e);
    Co.call(this, e), this._transformState = {
      afterTransform: gA.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, e && (typeof e.transform == "function" && (this._transform = e.
    transform), typeof e.flush == "function" && (this._flush = e.flush)), this.on("prefinish", yA);
  }
  s(Mt, "Transform");
  function yA() {
    var e = this;
    typeof this._flush == "function" ? this._flush(function(t, r) {
      Hy(e, t, r);
    }) : Hy(this, null, null);
  }
  s(yA, "prefinish");
  Mt.prototype.push = function(e, t) {
    return this._transformState.needTransform = !1, Co.prototype.push.call(this, e, t);
  };
  Mt.prototype._transform = function(e, t, r) {
    throw new Error("_transform() is not implemented");
  };
  Mt.prototype._write = function(e, t, r) {
    var i = this._transformState;
    if (i.writecb = r, i.writechunk = e, i.writeencoding = t, !i.transforming) {
      var n = this._readableState;
      (i.needTransform || n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
    }
  };
  Mt.prototype._read = function(e) {
    var t = this._transformState;
    t.writechunk !== null && t.writecb && !t.transforming ? (t.transforming = !0, this._transform(t.writechunk, t.writeencoding, t.afterTransform)) :
    t.needTransform = !0;
  };
  Mt.prototype._destroy = function(e, t) {
    var r = this;
    Co.prototype._destroy.call(this, e, function(i) {
      t(i), r.emit("close");
    });
  };
  function Hy(e, t, r) {
    if (t) return e.emit("error", t);
    if (r != null && e.push(r), e._writableState.length) throw new Error("Calling transform done when ws.length != 0");
    if (e._transformState.transforming) throw new Error("Calling transform done when still transforming");
    return e.push(null);
  }
  s(Hy, "done");
});

// ../node_modules/through2/node_modules/readable-stream/lib/_stream_passthrough.js
var Yy = b((sj, Ky) => {
  "use strict";
  Ky.exports = An;
  var zy = cc(), Gy = Object.create(Me());
  Gy.inherits = oe();
  Gy.inherits(An, zy);
  function An(e) {
    if (!(this instanceof An)) return new An(e);
    zy.call(this, e);
  }
  s(An, "PassThrough");
  An.prototype._transform = function(e, t, r) {
    r(null, e);
  };
});

// ../node_modules/through2/node_modules/readable-stream/readable.js
var Jy = b((ke, xo) => {
  var mt = require("stream");
  process.env.READABLE_STREAM === "disable" && mt ? (xo.exports = mt, ke = xo.exports = mt.Readable, ke.Readable = mt.Readable, ke.Writable =
  mt.Writable, ke.Duplex = mt.Duplex, ke.Transform = mt.Transform, ke.PassThrough = mt.PassThrough, ke.Stream = mt) : (ke = xo.exports = ic(),
  ke.Stream = mt || ke, ke.Readable = ke, ke.Writable = ec(), ke.Duplex = _r(), ke.Transform = cc(), ke.PassThrough = Yy());
});

// ../node_modules/xtend/immutable.js
var Qy = b((aj, Xy) => {
  Xy.exports = vA;
  var bA = Object.prototype.hasOwnProperty;
  function vA() {
    for (var e = {}, t = 0; t < arguments.length; t++) {
      var r = arguments[t];
      for (var i in r)
        bA.call(r, i) && (e[i] = r[i]);
    }
    return e;
  }
  s(vA, "extend");
});

// ../node_modules/through2/through2.js
var fc = b((lj, Fo) => {
  var eb = Jy().Transform, tb = require("util").inherits, rb = Qy();
  function vi(e) {
    eb.call(this, e), this._destroyed = !1;
  }
  s(vi, "DestroyableTransform");
  tb(vi, eb);
  vi.prototype.destroy = function(e) {
    if (!this._destroyed) {
      this._destroyed = !0;
      var t = this;
      process.nextTick(function() {
        e && t.emit("error", e), t.emit("close");
      });
    }
  };
  function _A(e, t, r) {
    r(null, e);
  }
  s(_A, "noop");
  function dc(e) {
    return function(t, r, i) {
      return typeof t == "function" && (i = r, r = t, t = {}), typeof r != "function" && (r = _A), typeof i != "function" && (i = null), e(t,
      r, i);
    };
  }
  s(dc, "through2");
  Fo.exports = dc(function(e, t, r) {
    var i = new vi(e);
    return i._transform = t, r && (i._flush = r), i;
  });
  Fo.exports.ctor = dc(function(e, t, r) {
    function i(n) {
      if (!(this instanceof i))
        return new i(n);
      this.options = rb(e, n), vi.call(this, this.options);
    }
    return s(i, "Through2"), tb(i, vi), i.prototype._transform = t, r && (i.prototype._flush = r), i;
  });
  Fo.exports.obj = dc(function(e, t, r) {
    var i = new vi(rb({ objectMode: !0, highWaterMark: 16 }, e));
    return i._transform = t, r && (i._flush = r), i;
  });
});

// ../node_modules/buffer-from/index.js
var nb = b((dj, ib) => {
  var wA = Object.prototype.toString, hc = typeof Buffer < "u" && typeof Buffer.alloc == "function" && typeof Buffer.allocUnsafe == "functio\
n" && typeof Buffer.from == "function";
  function EA(e) {
    return wA.call(e).slice(8, -1) === "ArrayBuffer";
  }
  s(EA, "isArrayBuffer");
  function CA(e, t, r) {
    t >>>= 0;
    var i = e.byteLength - t;
    if (i < 0)
      throw new RangeError("'offset' is out of bounds");
    if (r === void 0)
      r = i;
    else if (r >>>= 0, r > i)
      throw new RangeError("'length' is out of bounds");
    return hc ? Buffer.from(e.slice(t, t + r)) : new Buffer(new Uint8Array(e.slice(t, t + r)));
  }
  s(CA, "fromArrayBuffer");
  function xA(e, t) {
    if ((typeof t != "string" || t === "") && (t = "utf8"), !Buffer.isEncoding(t))
      throw new TypeError('"encoding" must be a valid string encoding');
    return hc ? Buffer.from(e, t) : new Buffer(e, t);
  }
  s(xA, "fromString");
  function FA(e, t, r) {
    if (typeof e == "number")
      throw new TypeError('"value" argument must not be a number');
    return EA(e) ? CA(e, t, r) : typeof e == "string" ? xA(e, t) : hc ? Buffer.from(e) : new Buffer(e);
  }
  s(FA, "bufferFrom");
  ib.exports = FA;
});

// ../node_modules/peek-stream/index.js
var ab = b((hj, ob) => {
  var SA = dy(), TA = fc(), AA = nb(), RA = /* @__PURE__ */ s(function(e) {
    return !Buffer.isBuffer(e) && typeof e != "string";
  }, "isObject"), sb = /* @__PURE__ */ s(function(e, t) {
    if (typeof e == "number" && (e = { maxBuffer: e }), typeof e == "function") return sb(null, e);
    e || (e = {});
    var r = typeof e.maxBuffer == "number" ? e.maxBuffer : 65535, i = e.strict, n = e.newline !== !1, o = [], a = 0, u = SA.obj(), l = TA.obj(
    { highWaterMark: 1 }, function(p, h, f) {
      if (RA(p)) return d(p, null, f);
      if (Buffer.isBuffer(p) || (p = AA(p)), n) {
        var g = Array.prototype.indexOf.call(p, 10);
        if (g > 0 && p[g - 1] === 13 && g--, g > -1)
          return o.push(p.slice(0, g)), d(Buffer.concat(o), p.slice(g), f);
      }
      if (o.push(p), a += p.length, a < r) return f();
      if (i) return f(new Error("No newline found"));
      d(Buffer.concat(o), null, f);
    }), c = /* @__PURE__ */ s(function() {
      if (i) return u.destroy(new Error("No newline found"));
      u.cork(), d(Buffer.concat(o), null, function(p) {
        if (p) return u.destroy(p);
        u.uncork();
      });
    }, "onpreend"), d = /* @__PURE__ */ s(function(p, h, f) {
      u.removeListener("preend", c), t(p, function(g, E) {
        if (g) return f(g);
        u.setWritable(E), u.setReadable(E), p && E.write(p), h && E.write(h), h = o = l = null, f();
      });
    }, "ready");
    return u.on("preend", c), u.setWritable(l), u;
  }, "peek");
  ob.exports = sb;
});

// ../node_modules/pumpify/node_modules/pump/index.js
var cb = b((Dj, lb) => {
  var kA = ks(), OA = ti(), pc = require("fs"), Rn = /* @__PURE__ */ s(function() {
  }, "noop"), BA = /^v?\.0/.test(process.version), So = /* @__PURE__ */ s(function(e) {
    return typeof e == "function";
  }, "isFn"), PA = /* @__PURE__ */ s(function(e) {
    return !BA || !pc ? !1 : (e instanceof (pc.ReadStream || Rn) || e instanceof (pc.WriteStream || Rn)) && So(e.close);
  }, "isFS"), IA = /* @__PURE__ */ s(function(e) {
    return e.setHeader && So(e.abort);
  }, "isRequest"), MA = /* @__PURE__ */ s(function(e, t, r, i) {
    i = kA(i);
    var n = !1;
    e.on("close", function() {
      n = !0;
    }), OA(e, { readable: t, writable: r }, function(a) {
      if (a) return i(a);
      n = !0, i();
    });
    var o = !1;
    return function(a) {
      if (!n && !o) {
        if (o = !0, PA(e)) return e.close(Rn);
        if (IA(e)) return e.abort();
        if (So(e.destroy)) return e.destroy();
        i(a || new Error("stream was destroyed"));
      }
    };
  }, "destroyer"), ub = /* @__PURE__ */ s(function(e) {
    e();
  }, "call"), jA = /* @__PURE__ */ s(function(e, t) {
    return e.pipe(t);
  }, "pipe"), qA = /* @__PURE__ */ s(function() {
    var e = Array.prototype.slice.call(arguments), t = So(e[e.length - 1] || Rn) && e.pop() || Rn;
    if (Array.isArray(e[0]) && (e = e[0]), e.length < 2) throw new Error("pump requires two streams per minimum");
    var r, i = e.map(function(n, o) {
      var a = o < e.length - 1, u = o > 0;
      return MA(n, a, u, function(l) {
        r || (r = l), l && i.forEach(ub), !a && (i.forEach(ub), t(r));
      });
    });
    e.reduce(jA);
  }, "pump");
  lb.exports = qA;
});

// ../node_modules/pumpify/node_modules/isarray/index.js
var fb = b((gj, db) => {
  var LA = {}.toString;
  db.exports = Array.isArray || function(e) {
    return LA.call(e) == "[object Array]";
  };
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/internal/streams/stream.js
var Dc = b((yj, hb) => {
  hb.exports = require("stream");
});

// ../node_modules/pumpify/node_modules/safe-buffer/index.js
var Ao = b((mc, Db) => {
  var To = require("buffer"), jt = To.Buffer;
  function pb(e, t) {
    for (var r in e)
      t[r] = e[r];
  }
  s(pb, "copyProps");
  jt.from && jt.alloc && jt.allocUnsafe && jt.allocUnsafeSlow ? Db.exports = To : (pb(To, mc), mc.Buffer = _i);
  function _i(e, t, r) {
    return jt(e, t, r);
  }
  s(_i, "SafeBuffer");
  pb(jt, _i);
  _i.from = function(e, t, r) {
    if (typeof e == "number")
      throw new TypeError("Argument must not be a number");
    return jt(e, t, r);
  };
  _i.alloc = function(e, t, r) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    var i = jt(e);
    return t !== void 0 ? typeof r == "string" ? i.fill(t, r) : i.fill(t) : i.fill(0), i;
  };
  _i.allocUnsafe = function(e) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    return jt(e);
  };
  _i.allocUnsafeSlow = function(e) {
    if (typeof e != "number")
      throw new TypeError("Argument must be a number");
    return To.SlowBuffer(e);
  };
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/internal/streams/BufferList.js
var gb = b((vj, gc) => {
  "use strict";
  function NA(e, t) {
    if (!(e instanceof t))
      throw new TypeError("Cannot call a class as a function");
  }
  s(NA, "_classCallCheck");
  var mb = Ao().Buffer, kn = require("util");
  function UA(e, t, r) {
    e.copy(t, r);
  }
  s(UA, "copyBuffer");
  gc.exports = function() {
    function e() {
      NA(this, e), this.head = null, this.tail = null, this.length = 0;
    }
    return s(e, "BufferList"), e.prototype.push = /* @__PURE__ */ s(function(r) {
      var i = { data: r, next: null };
      this.length > 0 ? this.tail.next = i : this.head = i, this.tail = i, ++this.length;
    }, "push"), e.prototype.unshift = /* @__PURE__ */ s(function(r) {
      var i = { data: r, next: this.head };
      this.length === 0 && (this.tail = i), this.head = i, ++this.length;
    }, "unshift"), e.prototype.shift = /* @__PURE__ */ s(function() {
      if (this.length !== 0) {
        var r = this.head.data;
        return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, r;
      }
    }, "shift"), e.prototype.clear = /* @__PURE__ */ s(function() {
      this.head = this.tail = null, this.length = 0;
    }, "clear"), e.prototype.join = /* @__PURE__ */ s(function(r) {
      if (this.length === 0) return "";
      for (var i = this.head, n = "" + i.data; i = i.next; )
        n += r + i.data;
      return n;
    }, "join"), e.prototype.concat = /* @__PURE__ */ s(function(r) {
      if (this.length === 0) return mb.alloc(0);
      for (var i = mb.allocUnsafe(r >>> 0), n = this.head, o = 0; n; )
        UA(n.data, i, o), o += n.data.length, n = n.next;
      return i;
    }, "concat"), e;
  }();
  kn && kn.inspect && kn.inspect.custom && (gc.exports.prototype[kn.inspect.custom] = function() {
    var e = kn.inspect({ length: this.length });
    return this.constructor.name + " " + e;
  });
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/internal/streams/destroy.js
var yc = b((wj, yb) => {
  "use strict";
  var Ro = Ve();
  function WA(e, t) {
    var r = this, i = this._readableState && this._readableState.destroyed, n = this._writableState && this._writableState.destroyed;
    return i || n ? (t ? t(e) : e && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, Ro.nextTick(
    ko, this, e)) : Ro.nextTick(ko, this, e)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this.
    _writableState.destroyed = !0), this._destroy(e || null, function(o) {
      !t && o ? r._writableState ? r._writableState.errorEmitted || (r._writableState.errorEmitted = !0, Ro.nextTick(ko, r, o)) : Ro.nextTick(
      ko, r, o) : t && t(o);
    }), this);
  }
  s(WA, "destroy");
  function $A() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.
    endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending =
    !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted =
    !1);
  }
  s($A, "undestroy");
  function ko(e, t) {
    e.emit("error", t);
  }
  s(ko, "emitErrorNT");
  yb.exports = {
    destroy: WA,
    undestroy: $A
  };
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/_stream_writable.js
var vc = b((Cj, Fb) => {
  "use strict";
  var wr = Ve();
  Fb.exports = xe;
  function vb(e) {
    var t = this;
    this.next = null, this.entry = null, this.finish = function() {
      a1(t, e);
    };
  }
  s(vb, "CorkedRequest");
  var HA = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : wr.nextTick, wi;
  xe.WritableState = Bn;
  var _b = Object.create(Me());
  _b.inherits = oe();
  var VA = {
    deprecate: rn()
  }, wb = Dc(), Bo = Ao().Buffer, ZA = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array ||
  function() {
  };
  function zA(e) {
    return Bo.from(e);
  }
  s(zA, "_uint8ArrayToBuffer");
  function GA(e) {
    return Bo.isBuffer(e) || e instanceof ZA;
  }
  s(GA, "_isUint8Array");
  var Eb = yc();
  _b.inherits(xe, wb);
  function KA() {
  }
  s(KA, "nop");
  function Bn(e, t) {
    wi = wi || Er(), e = e || {};
    var r = t instanceof wi;
    this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.writableObjectMode);
    var i = e.highWaterMark, n = e.writableHighWaterMark, o = this.objectMode ? 16 : 16 * 1024;
    i || i === 0 ? this.highWaterMark = i : r && (n || n === 0) ? this.highWaterMark = n : this.highWaterMark = o, this.highWaterMark = Math.
    floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed =
    !1;
    var a = e.decodeStrings === !1;
    this.decodeStrings = !a, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync =
    !0, this.bufferProcessing = !1, this.onwrite = function(u) {
      r1(t, u);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished =
    !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new vb(this);
  }
  s(Bn, "WritableState");
  Bn.prototype.getBuffer = /* @__PURE__ */ s(function() {
    for (var t = this.bufferedRequest, r = []; t; )
      r.push(t), t = t.next;
    return r;
  }, "getBuffer");
  (function() {
    try {
      Object.defineProperty(Bn.prototype, "buffer", {
        get: VA.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  })();
  var Oo;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (Oo = Function.prototype[Symbol.
  hasInstance], Object.defineProperty(xe, Symbol.hasInstance, {
    value: /* @__PURE__ */ s(function(e) {
      return Oo.call(this, e) ? !0 : this !== xe ? !1 : e && e._writableState instanceof Bn;
    }, "value")
  })) : Oo = /* @__PURE__ */ s(function(e) {
    return e instanceof this;
  }, "realHasInstance");
  function xe(e) {
    if (wi = wi || Er(), !Oo.call(xe, this) && !(this instanceof wi))
      return new xe(e);
    this._writableState = new Bn(e, this), this.writable = !0, e && (typeof e.write == "function" && (this._write = e.write), typeof e.writev ==
    "function" && (this._writev = e.writev), typeof e.destroy == "function" && (this._destroy = e.destroy), typeof e.final == "function" && (this.
    _final = e.final)), wb.call(this);
  }
  s(xe, "Writable");
  xe.prototype.pipe = function() {
    this.emit("error", new Error("Cannot pipe, not readable"));
  };
  function YA(e, t) {
    var r = new Error("write after end");
    e.emit("error", r), wr.nextTick(t, r);
  }
  s(YA, "writeAfterEnd");
  function JA(e, t, r, i) {
    var n = !0, o = !1;
    return r === null ? o = new TypeError("May not write null values to stream") : typeof r != "string" && r !== void 0 && !t.objectMode && (o =
    new TypeError("Invalid non-string/buffer chunk")), o && (e.emit("error", o), wr.nextTick(i, o), n = !1), n;
  }
  s(JA, "validChunk");
  xe.prototype.write = function(e, t, r) {
    var i = this._writableState, n = !1, o = !i.objectMode && GA(e);
    return o && !Bo.isBuffer(e) && (e = zA(e)), typeof t == "function" && (r = t, t = null), o ? t = "buffer" : t || (t = i.defaultEncoding),
    typeof r != "function" && (r = KA), i.ended ? YA(this, r) : (o || JA(this, i, e, r)) && (i.pendingcb++, n = QA(this, i, o, e, t, r)), n;
  };
  xe.prototype.cork = function() {
    var e = this._writableState;
    e.corked++;
  };
  xe.prototype.uncork = function() {
    var e = this._writableState;
    e.corked && (e.corked--, !e.writing && !e.corked && !e.bufferProcessing && e.bufferedRequest && Cb(this, e));
  };
  xe.prototype.setDefaultEncoding = /* @__PURE__ */ s(function(t) {
    if (typeof t == "string" && (t = t.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "\
utf-16le", "raw"].indexOf((t + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + t);
    return this._writableState.defaultEncoding = t, this;
  }, "setDefaultEncoding");
  function XA(e, t, r) {
    return !e.objectMode && e.decodeStrings !== !1 && typeof t == "string" && (t = Bo.from(t, r)), t;
  }
  s(XA, "decodeChunk");
  Object.defineProperty(xe.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function QA(e, t, r, i, n, o) {
    if (!r) {
      var a = XA(t, i, n);
      i !== a && (r = !0, n = "buffer", i = a);
    }
    var u = t.objectMode ? 1 : i.length;
    t.length += u;
    var l = t.length < t.highWaterMark;
    if (l || (t.needDrain = !0), t.writing || t.corked) {
      var c = t.lastBufferedRequest;
      t.lastBufferedRequest = {
        chunk: i,
        encoding: n,
        isBuf: r,
        callback: o,
        next: null
      }, c ? c.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest, t.bufferedRequestCount += 1;
    } else
      bc(e, t, !1, u, i, n, o);
    return l;
  }
  s(QA, "writeOrBuffer");
  function bc(e, t, r, i, n, o, a) {
    t.writelen = i, t.writecb = a, t.writing = !0, t.sync = !0, r ? e._writev(n, t.onwrite) : e._write(n, o, t.onwrite), t.sync = !1;
  }
  s(bc, "doWrite");
  function e1(e, t, r, i, n) {
    --t.pendingcb, r ? (wr.nextTick(n, i), wr.nextTick(On, e, t), e._writableState.errorEmitted = !0, e.emit("error", i)) : (n(i), e._writableState.
    errorEmitted = !0, e.emit("error", i), On(e, t));
  }
  s(e1, "onwriteError");
  function t1(e) {
    e.writing = !1, e.writecb = null, e.length -= e.writelen, e.writelen = 0;
  }
  s(t1, "onwriteStateUpdate");
  function r1(e, t) {
    var r = e._writableState, i = r.sync, n = r.writecb;
    if (t1(r), t) e1(e, r, i, t, n);
    else {
      var o = xb(r);
      !o && !r.corked && !r.bufferProcessing && r.bufferedRequest && Cb(e, r), i ? HA(bb, e, r, o, n) : bb(e, r, o, n);
    }
  }
  s(r1, "onwrite");
  function bb(e, t, r, i) {
    r || i1(e, t), t.pendingcb--, i(), On(e, t);
  }
  s(bb, "afterWrite");
  function i1(e, t) {
    t.length === 0 && t.needDrain && (t.needDrain = !1, e.emit("drain"));
  }
  s(i1, "onwriteDrain");
  function Cb(e, t) {
    t.bufferProcessing = !0;
    var r = t.bufferedRequest;
    if (e._writev && r && r.next) {
      var i = t.bufferedRequestCount, n = new Array(i), o = t.corkedRequestsFree;
      o.entry = r;
      for (var a = 0, u = !0; r; )
        n[a] = r, r.isBuf || (u = !1), r = r.next, a += 1;
      n.allBuffers = u, bc(e, t, !0, t.length, n, "", o.finish), t.pendingcb++, t.lastBufferedRequest = null, o.next ? (t.corkedRequestsFree =
      o.next, o.next = null) : t.corkedRequestsFree = new vb(t), t.bufferedRequestCount = 0;
    } else {
      for (; r; ) {
        var l = r.chunk, c = r.encoding, d = r.callback, p = t.objectMode ? 1 : l.length;
        if (bc(e, t, !1, p, l, c, d), r = r.next, t.bufferedRequestCount--, t.writing)
          break;
      }
      r === null && (t.lastBufferedRequest = null);
    }
    t.bufferedRequest = r, t.bufferProcessing = !1;
  }
  s(Cb, "clearBuffer");
  xe.prototype._write = function(e, t, r) {
    r(new Error("_write() is not implemented"));
  };
  xe.prototype._writev = null;
  xe.prototype.end = function(e, t, r) {
    var i = this._writableState;
    typeof e == "function" ? (r = e, e = null, t = null) : typeof t == "function" && (r = t, t = null), e != null && this.write(e, t), i.corked &&
    (i.corked = 1, this.uncork()), i.ending || o1(this, i, r);
  };
  function xb(e) {
    return e.ending && e.length === 0 && e.bufferedRequest === null && !e.finished && !e.writing;
  }
  s(xb, "needFinish");
  function n1(e, t) {
    e._final(function(r) {
      t.pendingcb--, r && e.emit("error", r), t.prefinished = !0, e.emit("prefinish"), On(e, t);
    });
  }
  s(n1, "callFinal");
  function s1(e, t) {
    !t.prefinished && !t.finalCalled && (typeof e._final == "function" ? (t.pendingcb++, t.finalCalled = !0, wr.nextTick(n1, e, t)) : (t.prefinished =
    !0, e.emit("prefinish")));
  }
  s(s1, "prefinish");
  function On(e, t) {
    var r = xb(t);
    return r && (s1(e, t), t.pendingcb === 0 && (t.finished = !0, e.emit("finish"))), r;
  }
  s(On, "finishMaybe");
  function o1(e, t, r) {
    t.ending = !0, On(e, t), r && (t.finished ? wr.nextTick(r) : e.once("finish", r)), t.ended = !0, e.writable = !1;
  }
  s(o1, "endWritable");
  function a1(e, t, r) {
    var i = e.entry;
    for (e.entry = null; i; ) {
      var n = i.callback;
      t.pendingcb--, n(r), i = i.next;
    }
    t.corkedRequestsFree.next = e;
  }
  s(a1, "onCorkedFinish");
  Object.defineProperty(xe.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._writableState && (this._writableState.destroyed = e);
    }, "set")
  });
  xe.prototype.destroy = Eb.destroy;
  xe.prototype._undestroy = Eb.undestroy;
  xe.prototype._destroy = function(e, t) {
    this.end(), t(e);
  };
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/_stream_duplex.js
var Er = b((Fj, Rb) => {
  "use strict";
  var Sb = Ve(), u1 = Object.keys || function(e) {
    var t = [];
    for (var r in e)
      t.push(r);
    return t;
  };
  Rb.exports = qt;
  var Tb = Object.create(Me());
  Tb.inherits = oe();
  var Ab = Ec(), wc = vc();
  Tb.inherits(qt, Ab);
  for (_c = u1(wc.prototype), Po = 0; Po < _c.length; Po++)
    Io = _c[Po], qt.prototype[Io] || (qt.prototype[Io] = wc.prototype[Io]);
  var _c, Io, Po;
  function qt(e) {
    if (!(this instanceof qt)) return new qt(e);
    Ab.call(this, e), wc.call(this, e), e && e.readable === !1 && (this.readable = !1), e && e.writable === !1 && (this.writable = !1), this.
    allowHalfOpen = !0, e && e.allowHalfOpen === !1 && (this.allowHalfOpen = !1), this.once("end", l1);
  }
  s(qt, "Duplex");
  Object.defineProperty(qt.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._writableState.highWaterMark;
    }, "get")
  });
  function l1() {
    this.allowHalfOpen || this._writableState.ended || Sb.nextTick(c1, this);
  }
  s(l1, "onend");
  function c1(e) {
    e.end();
  }
  s(c1, "onEndNT");
  Object.defineProperty(qt.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = e, this._writableState.destroyed =
      e);
    }, "set")
  });
  qt.prototype._destroy = function(e, t) {
    this.push(null), this.end(), Sb.nextTick(t, e);
  };
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/_stream_readable.js
var Ec = b((Aj, Wb) => {
  "use strict";
  var Ci = Ve();
  Wb.exports = fe;
  var d1 = fb(), Pn;
  fe.ReadableState = jb;
  var Tj = require("events").EventEmitter, Pb = /* @__PURE__ */ s(function(e, t) {
    return e.listeners(t).length;
  }, "EElistenerCount"), Tc = Dc(), In = Ao().Buffer, f1 = (typeof global < "u" ? global : typeof window < "u" ? window : typeof self < "u" ?
  self : {}).Uint8Array || function() {
  };
  function h1(e) {
    return In.from(e);
  }
  s(h1, "_uint8ArrayToBuffer");
  function p1(e) {
    return In.isBuffer(e) || e instanceof f1;
  }
  s(p1, "_isUint8Array");
  var Ib = Object.create(Me());
  Ib.inherits = oe();
  var Cc = require("util"), te = void 0;
  Cc && Cc.debuglog ? te = Cc.debuglog("stream") : te = /* @__PURE__ */ s(function() {
  }, "debug");
  var D1 = gb(), Mb = yc(), Ei;
  Ib.inherits(fe, Tc);
  var xc = ["error", "close", "destroy", "pause", "resume"];
  function m1(e, t, r) {
    if (typeof e.prependListener == "function") return e.prependListener(t, r);
    !e._events || !e._events[t] ? e.on(t, r) : d1(e._events[t]) ? e._events[t].unshift(r) : e._events[t] = [r, e._events[t]];
  }
  s(m1, "prependListener");
  function jb(e, t) {
    Pn = Pn || Er(), e = e || {};
    var r = t instanceof Pn;
    this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.readableObjectMode);
    var i = e.highWaterMark, n = e.readableHighWaterMark, o = this.objectMode ? 16 : 16 * 1024;
    i || i === 0 ? this.highWaterMark = i : r && (n || n === 0) ? this.highWaterMark = n : this.highWaterMark = o, this.highWaterMark = Math.
    floor(this.highWaterMark), this.buffer = new D1(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended =
    !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening =
    !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = e.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore =
    !1, this.decoder = null, this.encoding = null, e.encoding && (Ei || (Ei = require("string_decoder/").StringDecoder), this.decoder = new Ei(
    e.encoding), this.encoding = e.encoding);
  }
  s(jb, "ReadableState");
  function fe(e) {
    if (Pn = Pn || Er(), !(this instanceof fe)) return new fe(e);
    this._readableState = new jb(e, this), this.readable = !0, e && (typeof e.read == "function" && (this._read = e.read), typeof e.destroy ==
    "function" && (this._destroy = e.destroy)), Tc.call(this);
  }
  s(fe, "Readable");
  Object.defineProperty(fe.prototype, "destroyed", {
    get: /* @__PURE__ */ s(function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    }, "get"),
    set: /* @__PURE__ */ s(function(e) {
      this._readableState && (this._readableState.destroyed = e);
    }, "set")
  });
  fe.prototype.destroy = Mb.destroy;
  fe.prototype._undestroy = Mb.undestroy;
  fe.prototype._destroy = function(e, t) {
    this.push(null), t(e);
  };
  fe.prototype.push = function(e, t) {
    var r = this._readableState, i;
    return r.objectMode ? i = !0 : typeof e == "string" && (t = t || r.defaultEncoding, t !== r.encoding && (e = In.from(e, t), t = ""), i =
    !0), qb(this, e, t, !1, i);
  };
  fe.prototype.unshift = function(e) {
    return qb(this, e, null, !0, !1);
  };
  function qb(e, t, r, i, n) {
    var o = e._readableState;
    if (t === null)
      o.reading = !1, v1(e, o);
    else {
      var a;
      n || (a = g1(o, t)), a ? e.emit("error", a) : o.objectMode || t && t.length > 0 ? (typeof t != "string" && !o.objectMode && Object.getPrototypeOf(
      t) !== In.prototype && (t = h1(t)), i ? o.endEmitted ? e.emit("error", new Error("stream.unshift() after end event")) : Fc(e, o, t, !0) :
      o.ended ? e.emit("error", new Error("stream.push() after EOF")) : (o.reading = !1, o.decoder && !r ? (t = o.decoder.write(t), o.objectMode ||
      t.length !== 0 ? Fc(e, o, t, !1) : Lb(e, o)) : Fc(e, o, t, !1))) : i || (o.reading = !1);
    }
    return y1(o);
  }
  s(qb, "readableAddChunk");
  function Fc(e, t, r, i) {
    t.flowing && t.length === 0 && !t.sync ? (e.emit("data", r), e.read(0)) : (t.length += t.objectMode ? 1 : r.length, i ? t.buffer.unshift(
    r) : t.buffer.push(r), t.needReadable && Mo(e)), Lb(e, t);
  }
  s(Fc, "addChunk");
  function g1(e, t) {
    var r;
    return !p1(t) && typeof t != "string" && t !== void 0 && !e.objectMode && (r = new TypeError("Invalid non-string/buffer chunk")), r;
  }
  s(g1, "chunkInvalid");
  function y1(e) {
    return !e.ended && (e.needReadable || e.length < e.highWaterMark || e.length === 0);
  }
  s(y1, "needMoreData");
  fe.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  };
  fe.prototype.setEncoding = function(e) {
    return Ei || (Ei = require("string_decoder/").StringDecoder), this._readableState.decoder = new Ei(e), this._readableState.encoding = e,
    this;
  };
  var kb = 8388608;
  function b1(e) {
    return e >= kb ? e = kb : (e--, e |= e >>> 1, e |= e >>> 2, e |= e >>> 4, e |= e >>> 8, e |= e >>> 16, e++), e;
  }
  s(b1, "computeNewHighWaterMark");
  function Ob(e, t) {
    return e <= 0 || t.length === 0 && t.ended ? 0 : t.objectMode ? 1 : e !== e ? t.flowing && t.length ? t.buffer.head.data.length : t.length :
    (e > t.highWaterMark && (t.highWaterMark = b1(e)), e <= t.length ? e : t.ended ? t.length : (t.needReadable = !0, 0));
  }
  s(Ob, "howMuchToRead");
  fe.prototype.read = function(e) {
    te("read", e), e = parseInt(e, 10);
    var t = this._readableState, r = e;
    if (e !== 0 && (t.emittedReadable = !1), e === 0 && t.needReadable && (t.length >= t.highWaterMark || t.ended))
      return te("read: emitReadable", t.length, t.ended), t.length === 0 && t.ended ? Sc(this) : Mo(this), null;
    if (e = Ob(e, t), e === 0 && t.ended)
      return t.length === 0 && Sc(this), null;
    var i = t.needReadable;
    te("need readable", i), (t.length === 0 || t.length - e < t.highWaterMark) && (i = !0, te("length less than watermark", i)), t.ended || t.
    reading ? (i = !1, te("reading or ended", i)) : i && (te("do read"), t.reading = !0, t.sync = !0, t.length === 0 && (t.needReadable = !0),
    this._read(t.highWaterMark), t.sync = !1, t.reading || (e = Ob(r, t)));
    var n;
    return e > 0 ? n = Nb(e, t) : n = null, n === null ? (t.needReadable = !0, e = 0) : t.length -= e, t.length === 0 && (t.ended || (t.needReadable =
    !0), r !== e && t.ended && Sc(this)), n !== null && this.emit("data", n), n;
  };
  function v1(e, t) {
    if (!t.ended) {
      if (t.decoder) {
        var r = t.decoder.end();
        r && r.length && (t.buffer.push(r), t.length += t.objectMode ? 1 : r.length);
      }
      t.ended = !0, Mo(e);
    }
  }
  s(v1, "onEofChunk");
  function Mo(e) {
    var t = e._readableState;
    t.needReadable = !1, t.emittedReadable || (te("emitReadable", t.flowing), t.emittedReadable = !0, t.sync ? Ci.nextTick(Bb, e) : Bb(e));
  }
  s(Mo, "emitReadable");
  function Bb(e) {
    te("emit readable"), e.emit("readable"), Ac(e);
  }
  s(Bb, "emitReadable_");
  function Lb(e, t) {
    t.readingMore || (t.readingMore = !0, Ci.nextTick(_1, e, t));
  }
  s(Lb, "maybeReadMore");
  function _1(e, t) {
    for (var r = t.length; !t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark && (te("maybeReadMore read 0"), e.read(0), r !==
    t.length); )
      r = t.length;
    t.readingMore = !1;
  }
  s(_1, "maybeReadMore_");
  fe.prototype._read = function(e) {
    this.emit("error", new Error("_read() is not implemented"));
  };
  fe.prototype.pipe = function(e, t) {
    var r = this, i = this._readableState;
    switch (i.pipesCount) {
      case 0:
        i.pipes = e;
        break;
      case 1:
        i.pipes = [i.pipes, e];
        break;
      default:
        i.pipes.push(e);
        break;
    }
    i.pipesCount += 1, te("pipe count=%d opts=%j", i.pipesCount, t);
    var n = (!t || t.end !== !1) && e !== process.stdout && e !== process.stderr, o = n ? u : _;
    i.endEmitted ? Ci.nextTick(o) : r.once("end", o), e.on("unpipe", a);
    function a(C, x) {
      te("onunpipe"), C === r && x && x.hasUnpiped === !1 && (x.hasUnpiped = !0, d());
    }
    s(a, "onunpipe");
    function u() {
      te("onend"), e.end();
    }
    s(u, "onend");
    var l = w1(r);
    e.on("drain", l);
    var c = !1;
    function d() {
      te("cleanup"), e.removeListener("close", g), e.removeListener("finish", E), e.removeListener("drain", l), e.removeListener("error", f),
      e.removeListener("unpipe", a), r.removeListener("end", u), r.removeListener("end", _), r.removeListener("data", h), c = !0, i.awaitDrain &&
      (!e._writableState || e._writableState.needDrain) && l();
    }
    s(d, "cleanup");
    var p = !1;
    r.on("data", h);
    function h(C) {
      te("ondata"), p = !1;
      var x = e.write(C);
      x === !1 && !p && ((i.pipesCount === 1 && i.pipes === e || i.pipesCount > 1 && Ub(i.pipes, e) !== -1) && !c && (te("false write respon\
se, pause", i.awaitDrain), i.awaitDrain++, p = !0), r.pause());
    }
    s(h, "ondata");
    function f(C) {
      te("onerror", C), _(), e.removeListener("error", f), Pb(e, "error") === 0 && e.emit("error", C);
    }
    s(f, "onerror"), m1(e, "error", f);
    function g() {
      e.removeListener("finish", E), _();
    }
    s(g, "onclose"), e.once("close", g);
    function E() {
      te("onfinish"), e.removeListener("close", g), _();
    }
    s(E, "onfinish"), e.once("finish", E);
    function _() {
      te("unpipe"), r.unpipe(e);
    }
    return s(_, "unpipe"), e.emit("pipe", r), i.flowing || (te("pipe resume"), r.resume()), e;
  };
  function w1(e) {
    return function() {
      var t = e._readableState;
      te("pipeOnDrain", t.awaitDrain), t.awaitDrain && t.awaitDrain--, t.awaitDrain === 0 && Pb(e, "data") && (t.flowing = !0, Ac(e));
    };
  }
  s(w1, "pipeOnDrain");
  fe.prototype.unpipe = function(e) {
    var t = this._readableState, r = { hasUnpiped: !1 };
    if (t.pipesCount === 0) return this;
    if (t.pipesCount === 1)
      return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, t.flowing = !1, e && e.emit("unpipe", this, r),
      this);
    if (!e) {
      var i = t.pipes, n = t.pipesCount;
      t.pipes = null, t.pipesCount = 0, t.flowing = !1;
      for (var o = 0; o < n; o++)
        i[o].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var a = Ub(t.pipes, e);
    return a === -1 ? this : (t.pipes.splice(a, 1), t.pipesCount -= 1, t.pipesCount === 1 && (t.pipes = t.pipes[0]), e.emit("unpipe", this, r),
    this);
  };
  fe.prototype.on = function(e, t) {
    var r = Tc.prototype.on.call(this, e, t);
    if (e === "data")
      this._readableState.flowing !== !1 && this.resume();
    else if (e === "readable") {
      var i = this._readableState;
      !i.endEmitted && !i.readableListening && (i.readableListening = i.needReadable = !0, i.emittedReadable = !1, i.reading ? i.length && Mo(
      this) : Ci.nextTick(E1, this));
    }
    return r;
  };
  fe.prototype.addListener = fe.prototype.on;
  function E1(e) {
    te("readable nexttick read 0"), e.read(0);
  }
  s(E1, "nReadingNextTick");
  fe.prototype.resume = function() {
    var e = this._readableState;
    return e.flowing || (te("resume"), e.flowing = !0, C1(this, e)), this;
  };
  function C1(e, t) {
    t.resumeScheduled || (t.resumeScheduled = !0, Ci.nextTick(x1, e, t));
  }
  s(C1, "resume");
  function x1(e, t) {
    t.reading || (te("resume read 0"), e.read(0)), t.resumeScheduled = !1, t.awaitDrain = 0, e.emit("resume"), Ac(e), t.flowing && !t.reading &&
    e.read(0);
  }
  s(x1, "resume_");
  fe.prototype.pause = function() {
    return te("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (te("pause"), this._readableState.
    flowing = !1, this.emit("pause")), this;
  };
  function Ac(e) {
    var t = e._readableState;
    for (te("flow", t.flowing); t.flowing && e.read() !== null; )
      ;
  }
  s(Ac, "flow");
  fe.prototype.wrap = function(e) {
    var t = this, r = this._readableState, i = !1;
    e.on("end", function() {
      if (te("wrapped end"), r.decoder && !r.ended) {
        var a = r.decoder.end();
        a && a.length && t.push(a);
      }
      t.push(null);
    }), e.on("data", function(a) {
      if (te("wrapped data"), r.decoder && (a = r.decoder.write(a)), !(r.objectMode && a == null) && !(!r.objectMode && (!a || !a.length))) {
        var u = t.push(a);
        u || (i = !0, e.pause());
      }
    });
    for (var n in e)
      this[n] === void 0 && typeof e[n] == "function" && (this[n] = /* @__PURE__ */ function(a) {
        return function() {
          return e[a].apply(e, arguments);
        };
      }(n));
    for (var o = 0; o < xc.length; o++)
      e.on(xc[o], this.emit.bind(this, xc[o]));
    return this._read = function(a) {
      te("wrapped _read", a), i && (i = !1, e.resume());
    }, this;
  };
  Object.defineProperty(fe.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: /* @__PURE__ */ s(function() {
      return this._readableState.highWaterMark;
    }, "get")
  });
  fe._fromList = Nb;
  function Nb(e, t) {
    if (t.length === 0) return null;
    var r;
    return t.objectMode ? r = t.buffer.shift() : !e || e >= t.length ? (t.decoder ? r = t.buffer.join("") : t.buffer.length === 1 ? r = t.buffer.
    head.data : r = t.buffer.concat(t.length), t.buffer.clear()) : r = F1(e, t.buffer, t.decoder), r;
  }
  s(Nb, "fromList");
  function F1(e, t, r) {
    var i;
    return e < t.head.data.length ? (i = t.head.data.slice(0, e), t.head.data = t.head.data.slice(e)) : e === t.head.data.length ? i = t.shift() :
    i = r ? S1(e, t) : T1(e, t), i;
  }
  s(F1, "fromListPartial");
  function S1(e, t) {
    var r = t.head, i = 1, n = r.data;
    for (e -= n.length; r = r.next; ) {
      var o = r.data, a = e > o.length ? o.length : e;
      if (a === o.length ? n += o : n += o.slice(0, e), e -= a, e === 0) {
        a === o.length ? (++i, r.next ? t.head = r.next : t.head = t.tail = null) : (t.head = r, r.data = o.slice(a));
        break;
      }
      ++i;
    }
    return t.length -= i, n;
  }
  s(S1, "copyFromBufferString");
  function T1(e, t) {
    var r = In.allocUnsafe(e), i = t.head, n = 1;
    for (i.data.copy(r), e -= i.data.length; i = i.next; ) {
      var o = i.data, a = e > o.length ? o.length : e;
      if (o.copy(r, r.length - e, 0, a), e -= a, e === 0) {
        a === o.length ? (++n, i.next ? t.head = i.next : t.head = t.tail = null) : (t.head = i, i.data = o.slice(a));
        break;
      }
      ++n;
    }
    return t.length -= n, r;
  }
  s(T1, "copyFromBuffer");
  function Sc(e) {
    var t = e._readableState;
    if (t.length > 0) throw new Error('"endReadable()" called on non-empty stream');
    t.endEmitted || (t.ended = !0, Ci.nextTick(A1, t, e));
  }
  s(Sc, "endReadable");
  function A1(e, t) {
    !e.endEmitted && e.length === 0 && (e.endEmitted = !0, t.readable = !1, t.emit("end"));
  }
  s(A1, "endReadableNT");
  function Ub(e, t) {
    for (var r = 0, i = e.length; r < i; r++)
      if (e[r] === t) return r;
    return -1;
  }
  s(Ub, "indexOf");
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/_stream_transform.js
var Rc = b((kj, Vb) => {
  "use strict";
  Vb.exports = Lt;
  var jo = Er(), Hb = Object.create(Me());
  Hb.inherits = oe();
  Hb.inherits(Lt, jo);
  function R1(e, t) {
    var r = this._transformState;
    r.transforming = !1;
    var i = r.writecb;
    if (!i)
      return this.emit("error", new Error("write callback called multiple times"));
    r.writechunk = null, r.writecb = null, t != null && this.push(t), i(e);
    var n = this._readableState;
    n.reading = !1, (n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
  }
  s(R1, "afterTransform");
  function Lt(e) {
    if (!(this instanceof Lt)) return new Lt(e);
    jo.call(this, e), this._transformState = {
      afterTransform: R1.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, e && (typeof e.transform == "function" && (this._transform = e.
    transform), typeof e.flush == "function" && (this._flush = e.flush)), this.on("prefinish", k1);
  }
  s(Lt, "Transform");
  function k1() {
    var e = this;
    typeof this._flush == "function" ? this._flush(function(t, r) {
      $b(e, t, r);
    }) : $b(this, null, null);
  }
  s(k1, "prefinish");
  Lt.prototype.push = function(e, t) {
    return this._transformState.needTransform = !1, jo.prototype.push.call(this, e, t);
  };
  Lt.prototype._transform = function(e, t, r) {
    throw new Error("_transform() is not implemented");
  };
  Lt.prototype._write = function(e, t, r) {
    var i = this._transformState;
    if (i.writecb = r, i.writechunk = e, i.writeencoding = t, !i.transforming) {
      var n = this._readableState;
      (i.needTransform || n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
    }
  };
  Lt.prototype._read = function(e) {
    var t = this._transformState;
    t.writechunk !== null && t.writecb && !t.transforming ? (t.transforming = !0, this._transform(t.writechunk, t.writeencoding, t.afterTransform)) :
    t.needTransform = !0;
  };
  Lt.prototype._destroy = function(e, t) {
    var r = this;
    jo.prototype._destroy.call(this, e, function(i) {
      t(i), r.emit("close");
    });
  };
  function $b(e, t, r) {
    if (t) return e.emit("error", t);
    if (r != null && e.push(r), e._writableState.length) throw new Error("Calling transform done when ws.length != 0");
    if (e._transformState.transforming) throw new Error("Calling transform done when still transforming");
    return e.push(null);
  }
  s($b, "done");
});

// ../node_modules/pumpify/node_modules/readable-stream/lib/_stream_passthrough.js
var Kb = b((Bj, Gb) => {
  "use strict";
  Gb.exports = Mn;
  var Zb = Rc(), zb = Object.create(Me());
  zb.inherits = oe();
  zb.inherits(Mn, Zb);
  function Mn(e) {
    if (!(this instanceof Mn)) return new Mn(e);
    Zb.call(this, e);
  }
  s(Mn, "PassThrough");
  Mn.prototype._transform = function(e, t, r) {
    r(null, e);
  };
});

// ../node_modules/pumpify/node_modules/readable-stream/readable.js
var Yb = b((Oe, qo) => {
  var gt = require("stream");
  process.env.READABLE_STREAM === "disable" && gt ? (qo.exports = gt, Oe = qo.exports = gt.Readable, Oe.Readable = gt.Readable, Oe.Writable =
  gt.Writable, Oe.Duplex = gt.Duplex, Oe.Transform = gt.Transform, Oe.PassThrough = gt.PassThrough, Oe.Stream = gt) : (Oe = qo.exports = Ec(),
  Oe.Stream = gt || Oe, Oe.Readable = Oe, Oe.Writable = vc(), Oe.Duplex = Er(), Oe.Transform = Rc(), Oe.PassThrough = Kb());
});

// ../node_modules/pumpify/node_modules/duplexify/index.js
var t0 = b((Ij, e0) => {
  var Lo = Yb(), Jb = ti(), O1 = oe(), B1 = zl(), Xb = Buffer.from && Buffer.from !== Uint8Array.from ? Buffer.from([0]) : new Buffer([0]), kc = /* @__PURE__ */ s(
  function(e, t) {
    e._corked ? e.once("uncork", t) : t();
  }, "onuncork"), P1 = /* @__PURE__ */ s(function(e, t) {
    e._autoDestroy && e.destroy(t);
  }, "autoDestroy"), Qb = /* @__PURE__ */ s(function(e, t) {
    return function(r) {
      r ? P1(e, r.message === "premature close" ? null : r) : t && !e._ended && e.end();
    };
  }, "destroyer"), I1 = /* @__PURE__ */ s(function(e, t) {
    if (!e || e._writableState && e._writableState.finished) return t();
    if (e._writableState) return e.end(t);
    e.end(), t();
  }, "end"), M1 = /* @__PURE__ */ s(function(e) {
    return new Lo.Readable({ objectMode: !0, highWaterMark: 16 }).wrap(e);
  }, "toStreams2"), Be = /* @__PURE__ */ s(function(e, t, r) {
    if (!(this instanceof Be)) return new Be(e, t, r);
    Lo.Duplex.call(this, r), this._writable = null, this._readable = null, this._readable2 = null, this._autoDestroy = !r || r.autoDestroy !==
    !1, this._forwardDestroy = !r || r.destroy !== !1, this._forwardEnd = !r || r.end !== !1, this._corked = 1, this._ondrain = null, this._drained =
    !1, this._forwarding = !1, this._unwrite = null, this._unread = null, this._ended = !1, this.destroyed = !1, e && this.setWritable(e), t &&
    this.setReadable(t);
  }, "Duplexify");
  O1(Be, Lo.Duplex);
  Be.obj = function(e, t, r) {
    return r || (r = {}), r.objectMode = !0, r.highWaterMark = 16, new Be(e, t, r);
  };
  Be.prototype.cork = function() {
    ++this._corked === 1 && this.emit("cork");
  };
  Be.prototype.uncork = function() {
    this._corked && --this._corked === 0 && this.emit("uncork");
  };
  Be.prototype.setWritable = function(e) {
    if (this._unwrite && this._unwrite(), this.destroyed) {
      e && e.destroy && e.destroy();
      return;
    }
    if (e === null || e === !1) {
      this.end();
      return;
    }
    var t = this, r = Jb(e, { writable: !0, readable: !1 }, Qb(this, this._forwardEnd)), i = /* @__PURE__ */ s(function() {
      var o = t._ondrain;
      t._ondrain = null, o && o();
    }, "ondrain"), n = /* @__PURE__ */ s(function() {
      t._writable.removeListener("drain", i), r();
    }, "clear");
    this._unwrite && process.nextTick(i), this._writable = e, this._writable.on("drain", i), this._unwrite = n, this.uncork();
  };
  Be.prototype.setReadable = function(e) {
    if (this._unread && this._unread(), this.destroyed) {
      e && e.destroy && e.destroy();
      return;
    }
    if (e === null || e === !1) {
      this.push(null), this.resume();
      return;
    }
    var t = this, r = Jb(e, { writable: !1, readable: !0 }, Qb(this)), i = /* @__PURE__ */ s(function() {
      t._forward();
    }, "onreadable"), n = /* @__PURE__ */ s(function() {
      t.push(null);
    }, "onend"), o = /* @__PURE__ */ s(function() {
      t._readable2.removeListener("readable", i), t._readable2.removeListener("end", n), r();
    }, "clear");
    this._drained = !0, this._readable = e, this._readable2 = e._readableState ? e : M1(e), this._readable2.on("readable", i), this._readable2.
    on("end", n), this._unread = o, this._forward();
  };
  Be.prototype._read = function() {
    this._drained = !0, this._forward();
  };
  Be.prototype._forward = function() {
    if (!(this._forwarding || !this._readable2 || !this._drained)) {
      this._forwarding = !0;
      for (var e; this._drained && (e = B1(this._readable2)) !== null; )
        this.destroyed || (this._drained = this.push(e));
      this._forwarding = !1;
    }
  };
  Be.prototype.destroy = function(e) {
    if (!this.destroyed) {
      this.destroyed = !0;
      var t = this;
      process.nextTick(function() {
        t._destroy(e);
      });
    }
  };
  Be.prototype._destroy = function(e) {
    if (e) {
      var t = this._ondrain;
      this._ondrain = null, t ? t(e) : this.emit("error", e);
    }
    this._forwardDestroy && (this._readable && this._readable.destroy && this._readable.destroy(), this._writable && this._writable.destroy &&
    this._writable.destroy()), this.emit("close");
  };
  Be.prototype._write = function(e, t, r) {
    if (this.destroyed) return r();
    if (this._corked) return kc(this, this._write.bind(this, e, t, r));
    if (e === Xb) return this._finish(r);
    if (!this._writable) return r();
    this._writable.write(e) === !1 ? this._ondrain = r : r();
  };
  Be.prototype._finish = function(e) {
    var t = this;
    this.emit("preend"), kc(this, function() {
      I1(t._forwardEnd && t._writable, function() {
        t._writableState.prefinished === !1 && (t._writableState.prefinished = !0), t.emit("prefinish"), kc(t, e);
      });
    });
  };
  Be.prototype.end = function(e, t, r) {
    return typeof e == "function" ? this.end(null, null, e) : typeof t == "function" ? this.end(e, null, t) : (this._ended = !0, e && this.write(
    e), this._writableState.ending || this.write(Xb), Lo.Writable.prototype.end.call(this, r));
  };
  e0.exports = Be;
});

// ../node_modules/pumpify/index.js
var n0 = b((jj, No) => {
  var j1 = cb(), q1 = oe(), r0 = t0(), i0 = /* @__PURE__ */ s(function(e) {
    return e.length ? Array.isArray(e[0]) ? e[0] : Array.prototype.slice.call(e) : [];
  }, "toArray"), Oc = /* @__PURE__ */ s(function(e) {
    var t = /* @__PURE__ */ s(function() {
      var r = i0(arguments);
      if (!(this instanceof t)) return new t(r);
      r0.call(this, null, null, e), r.length && this.setPipeline(r);
    }, "Pumpify");
    return q1(t, r0), t.prototype.setPipeline = function() {
      var r = i0(arguments), i = this, n = !1, o = r[0], a = r[r.length - 1];
      a = a.readable ? a : null, o = o.writable ? o : null;
      var u = /* @__PURE__ */ s(function() {
        r[0].emit("error", new Error("stream was destroyed"));
      }, "onclose");
      if (this.on("close", u), this.on("prefinish", function() {
        n || i.cork();
      }), j1(r, function(l) {
        if (i.removeListener("close", u), l) return i.destroy(l.message === "premature close" ? null : l);
        n = !0, i._autoDestroy === !1 && (i._autoDestroy = !0), i.uncork();
      }), this.destroyed) return u();
      this.setWritable(o), this.setReadable(a);
    }, t;
  }, "define");
  No.exports = Oc({ autoDestroy: !1, destroy: !1 });
  No.exports.obj = Oc({ autoDestroy: !1, destroy: !1, objectMode: !0, highWaterMark: 16 });
  No.exports.ctor = Oc;
});

// ../node_modules/is-gzip/index.js
var o0 = b((Lj, s0) => {
  "use strict";
  s0.exports = function(e) {
    return !e || e.length < 3 ? !1 : e[0] === 31 && e[1] === 139 && e[2] === 8;
  };
});

// ../node_modules/is-deflate/index.js
var u0 = b((Nj, a0) => {
  "use strict";
  a0.exports = function(e) {
    return !e || e.length < 2 ? !1 : e[0] === 120 && (e[1] === 1 || e[1] === 156 || e[1] === 218);
  };
});

// ../node_modules/gunzip-maybe/index.js
var f0 = b((Uj, d0) => {
  var l0 = require("zlib"), L1 = ab(), N1 = fc(), c0 = n0(), U1 = o0(), W1 = u0(), $1 = /* @__PURE__ */ s(function(e) {
    return U1(e) ? 1 : W1(e) ? 2 : 0;
  }, "isCompressed"), Bc = /* @__PURE__ */ s(function(e) {
    return e === void 0 && (e = 3), L1({ newline: !1, maxBuffer: 10 }, function(t, r) {
      if (e < 0) return r(new Error("Maximum recursion reached"));
      switch ($1(t)) {
        case 1:
          r(null, c0(l0.createGunzip(), Bc(e - 1)));
          break;
        case 2:
          r(null, c0(l0.createInflate(), Bc(e - 1)));
          break;
        default:
          r(null, N1());
      }
    });
  }, "gunzip");
  d0.exports = Bc;
});

// ../node_modules/@ndelangen/get-tarball/dist/index.js
var av = b((Vj, ov) => {
  "use strict";
  var H1 = Object.create, Jo = Object.defineProperty, V1 = Object.getOwnPropertyDescriptor, j0 = Object.getOwnPropertyNames, Z1 = Object.getPrototypeOf,
  z1 = Object.prototype.hasOwnProperty, Y = /* @__PURE__ */ s((e, t) => /* @__PURE__ */ s(function() {
    return t || (0, e[j0(e)[0]])((t = { exports: {} }).exports, t), t.exports;
  }, "__require"), "__commonJS"), G1 = /* @__PURE__ */ s((e, t) => {
    for (var r in t)
      Jo(e, r, { get: t[r], enumerable: !0 });
  }, "__export"), q0 = /* @__PURE__ */ s((e, t, r, i) => {
    if (t && typeof t == "object" || typeof t == "function")
      for (let n of j0(t))
        !z1.call(e, n) && n !== r && Jo(e, n, { get: /* @__PURE__ */ s(() => t[n], "get"), enumerable: !(i = V1(t, n)) || i.enumerable });
    return e;
  }, "__copyProps"), Fe = /* @__PURE__ */ s((e, t, r) => (r = e != null ? H1(Z1(e)) : {}, q0(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    t || !e || !e.__esModule ? Jo(r, "default", { value: e, enumerable: !0 }) : r,
    e
  )), "__toESM"), K1 = /* @__PURE__ */ s((e) => q0(Jo({}, "__esModule", { value: !0 }), e), "__toCommonJS"), Y1 = Y({
    "node_modules/.pnpm/defer-to-connect@2.0.1/node_modules/defer-to-connect/dist/source/index.js"(e, t) {
      "use strict";
      Object.defineProperty(e, "__esModule", { value: !0 });
      function r(n) {
        return n.encrypted;
      }
      s(r, "isTLSSocket");
      var i = /* @__PURE__ */ s((n, o) => {
        let a;
        typeof o == "function" ? a = { connect: o } : a = o;
        let u = typeof a.connect == "function", l = typeof a.secureConnect == "function", c = typeof a.close == "function", d = /* @__PURE__ */ s(
        () => {
          u && a.connect(), r(n) && l && (n.authorized ? a.secureConnect() : n.authorizationError || n.once("secureConnect", a.secureConnect)),
          c && n.once("close", a.close);
        }, "onConnect");
        n.writable && !n.connecting ? d() : n.connecting ? n.once("connect", d) : n.destroyed && c && a.close(n._hadError);
      }, "deferToConnect2");
      e.default = i, t.exports = i, t.exports.default = i;
    }
  }), J1 = Y({
    "node_modules/.pnpm/get-stream@6.0.1/node_modules/get-stream/buffer-stream.js"(e, t) {
      "use strict";
      var { PassThrough: r } = require("stream");
      t.exports = (i) => {
        i = { ...i };
        let { array: n } = i, { encoding: o } = i, a = o === "buffer", u = !1;
        n ? u = !(o || a) : o = o || "utf8", a && (o = null);
        let l = new r({ objectMode: u });
        o && l.setEncoding(o);
        let c = 0, d = [];
        return l.on("data", (p) => {
          d.push(p), u ? c = d.length : c += p.length;
        }), l.getBufferedValue = () => n ? d : a ? Buffer.concat(d, c) : d.join(""), l.getBufferedLength = () => c, l;
      };
    }
  }), L0 = Y({
    "node_modules/.pnpm/get-stream@6.0.1/node_modules/get-stream/index.js"(e, t) {
      "use strict";
      var { constants: r } = require("buffer"), i = require("stream"), { promisify: n } = require("util"), o = J1(), a = n(i.pipeline), u = class extends Error {
        static {
          s(this, "MaxBufferError");
        }
        constructor() {
          super("maxBuffer exceeded"), this.name = "MaxBufferError";
        }
      };
      async function l(c, d) {
        if (!c)
          throw new Error("Expected a stream");
        d = {
          maxBuffer: 1 / 0,
          ...d
        };
        let { maxBuffer: p } = d, h = o(d);
        return await new Promise((f, g) => {
          let E = /* @__PURE__ */ s((_) => {
            _ && h.getBufferedLength() <= r.MAX_LENGTH && (_.bufferedData = h.getBufferedValue()), g(_);
          }, "rejectPromise");
          (async () => {
            try {
              await a(c, h), f();
            } catch (_) {
              E(_);
            }
          })(), h.on("data", () => {
            h.getBufferedLength() > p && E(new u());
          });
        }), h.getBufferedValue();
      }
      s(l, "getStream2"), t.exports = l, t.exports.buffer = (c, d) => l(c, { ...d, encoding: "buffer" }), t.exports.array = (c, d) => l(c, {
      ...d, array: !0 }), t.exports.MaxBufferError = u;
    }
  }), X1 = Y({
    "node_modules/.pnpm/http-cache-semantics@4.1.1/node_modules/http-cache-semantics/index.js"(e, t) {
      "use strict";
      var r = /* @__PURE__ */ new Set([
        200,
        203,
        204,
        206,
        300,
        301,
        308,
        404,
        405,
        410,
        414,
        501
      ]), i = /* @__PURE__ */ new Set([
        200,
        203,
        204,
        300,
        301,
        302,
        303,
        307,
        308,
        404,
        405,
        410,
        414,
        501
      ]), n = /* @__PURE__ */ new Set([
        500,
        502,
        503,
        504
      ]), o = {
        date: !0,
        // included, because we add Age update Date
        connection: !0,
        "keep-alive": !0,
        "proxy-authenticate": !0,
        "proxy-authorization": !0,
        te: !0,
        trailer: !0,
        "transfer-encoding": !0,
        upgrade: !0
      }, a = {
        // Since the old body is reused, it doesn't make sense to change properties of the body
        "content-length": !0,
        "content-encoding": !0,
        "transfer-encoding": !0,
        "content-range": !0
      };
      function u(p) {
        let h = parseInt(p, 10);
        return isFinite(h) ? h : 0;
      }
      s(u, "toNumberOrZero");
      function l(p) {
        return p ? n.has(p.status) : !0;
      }
      s(l, "isErrorResponse");
      function c(p) {
        let h = {};
        if (!p)
          return h;
        let f = p.trim().split(/,/);
        for (let g of f) {
          let [E, _] = g.split(/=/, 2);
          h[E.trim()] = _ === void 0 ? !0 : _.trim().replace(/^"|"$/g, "");
        }
        return h;
      }
      s(c, "parseCacheControl");
      function d(p) {
        let h = [];
        for (let f in p) {
          let g = p[f];
          h.push(g === !0 ? f : f + "=" + g);
        }
        if (h.length)
          return h.join(", ");
      }
      s(d, "formatCacheControl"), t.exports = class {
        static {
          s(this, "CachePolicy");
        }
        constructor(h, f, {
          shared: g,
          cacheHeuristic: E,
          immutableMinTimeToLive: _,
          ignoreCargoCult: C,
          _fromObject: x
        } = {}) {
          if (x) {
            this._fromObject(x);
            return;
          }
          if (!f || !f.headers)
            throw Error("Response headers missing");
          this._assertRequestHasHeaders(h), this._responseTime = this.now(), this._isShared = g !== !1, this._cacheHeuristic = E !== void 0 ?
          E : 0.1, this._immutableMinTtl = _ !== void 0 ? _ : 24 * 3600 * 1e3, this._status = "status" in f ? f.status : 200, this._resHeaders =
          f.headers, this._rescc = c(f.headers["cache-control"]), this._method = "method" in h ? h.method : "GET", this._url = h.url, this._host =
          h.headers.host, this._noAuthorization = !h.headers.authorization, this._reqHeaders = f.headers.vary ? h.headers : null, this._reqcc =
          c(h.headers["cache-control"]), C && "pre-check" in this._rescc && "post-check" in this._rescc && (delete this._rescc["pre-check"],
          delete this._rescc["post-check"], delete this._rescc["no-cache"], delete this._rescc["no-store"], delete this._rescc["must-revalid\
ate"], this._resHeaders = Object.assign({}, this._resHeaders, {
            "cache-control": d(this._rescc)
          }), delete this._resHeaders.expires, delete this._resHeaders.pragma), f.headers["cache-control"] == null && /no-cache/.test(f.headers.
          pragma) && (this._rescc["no-cache"] = !0);
        }
        now() {
          return Date.now();
        }
        storable() {
          return !!(!this._reqcc["no-store"] && // A cache MUST NOT store a response to any request, unless:
          // The request method is understood by the cache and defined as being cacheable, and
          (this._method === "GET" || this._method === "HEAD" || this._method === "POST" && this._hasExplicitExpiration()) && // the response status code is understood by the cache, and
          i.has(this._status) && // the "no-store" cache directive does not appear in request or response header fields, and
          !this._rescc["no-store"] && // the "private" response directive does not appear in the response, if the cache is shared, and
          (!this._isShared || !this._rescc.private) && // the Authorization header field does not appear in the request, if the cache is shared,
          (!this._isShared || this._noAuthorization || this._allowsStoringAuthenticated()) && // the response either:
          // contains an Expires header field, or
          (this._resHeaders.expires || // contains a max-age response directive, or
          // contains a s-maxage response directive and the cache is shared, or
          // contains a public response directive.
          this._rescc["max-age"] || this._isShared && this._rescc["s-maxage"] || this._rescc.public || // has a status code that is defined as cacheable by default
          r.has(this._status)));
        }
        _hasExplicitExpiration() {
          return this._isShared && this._rescc["s-maxage"] || this._rescc["max-age"] || this._resHeaders.expires;
        }
        _assertRequestHasHeaders(h) {
          if (!h || !h.headers)
            throw Error("Request headers missing");
        }
        satisfiesWithoutRevalidation(h) {
          this._assertRequestHasHeaders(h);
          let f = c(h.headers["cache-control"]);
          return f["no-cache"] || /no-cache/.test(h.headers.pragma) || f["max-age"] && this.age() > f["max-age"] || f["min-fresh"] && this.timeToLive() <
          1e3 * f["min-fresh"] || this.stale() && !(f["max-stale"] && !this._rescc["must-revalidate"] && (f["max-stale"] === !0 || f["max-st\
ale"] > this.age() - this.maxAge())) ? !1 : this._requestMatches(h, !1);
        }
        _requestMatches(h, f) {
          return (!this._url || this._url === h.url) && this._host === h.headers.host && // the request method associated with the stored response allows it to be used for the presented request, and
          (!h.method || this._method === h.method || f && h.method === "HEAD") && // selecting header fields nominated by the stored response (if any) match those presented, and
          this._varyMatches(h);
        }
        _allowsStoringAuthenticated() {
          return this._rescc["must-revalidate"] || this._rescc.public || this._rescc["s-maxage"];
        }
        _varyMatches(h) {
          if (!this._resHeaders.vary)
            return !0;
          if (this._resHeaders.vary === "*")
            return !1;
          let f = this._resHeaders.vary.trim().toLowerCase().split(/\s*,\s*/);
          for (let g of f)
            if (h.headers[g] !== this._reqHeaders[g])
              return !1;
          return !0;
        }
        _copyWithoutHopByHopHeaders(h) {
          let f = {};
          for (let g in h)
            o[g] || (f[g] = h[g]);
          if (h.connection) {
            let g = h.connection.trim().split(/\s*,\s*/);
            for (let E of g)
              delete f[E];
          }
          if (f.warning) {
            let g = f.warning.split(/,/).filter((E) => !/^\s*1[0-9][0-9]/.test(E));
            g.length ? f.warning = g.join(",").trim() : delete f.warning;
          }
          return f;
        }
        responseHeaders() {
          let h = this._copyWithoutHopByHopHeaders(this._resHeaders), f = this.age();
          return f > 3600 * 24 && !this._hasExplicitExpiration() && this.maxAge() > 3600 * 24 && (h.warning = (h.warning ? `${h.warning}, ` :
          "") + '113 - "rfc7234 5.5.4"'), h.age = `${Math.round(f)}`, h.date = new Date(this.now()).toUTCString(), h;
        }
        /**
         * Value of the Date response header or current time if Date was invalid
         * @return timestamp
         */
        date() {
          let h = Date.parse(this._resHeaders.date);
          return isFinite(h) ? h : this._responseTime;
        }
        /**
         * Value of the Age header, in seconds, updated for the current time.
         * May be fractional.
         *
         * @return Number
         */
        age() {
          let h = this._ageValue(), f = (this.now() - this._responseTime) / 1e3;
          return h + f;
        }
        _ageValue() {
          return u(this._resHeaders.age);
        }
        /**
         * Value of applicable max-age (or heuristic equivalent) in seconds. This counts since response's `Date`.
         *
         * For an up-to-date value, see `timeToLive()`.
         *
         * @return Number
         */
        maxAge() {
          if (!this.storable() || this._rescc["no-cache"] || this._isShared && this._resHeaders["set-cookie"] && !this._rescc.public && !this.
          _rescc.immutable || this._resHeaders.vary === "*")
            return 0;
          if (this._isShared) {
            if (this._rescc["proxy-revalidate"])
              return 0;
            if (this._rescc["s-maxage"])
              return u(this._rescc["s-maxage"]);
          }
          if (this._rescc["max-age"])
            return u(this._rescc["max-age"]);
          let h = this._rescc.immutable ? this._immutableMinTtl : 0, f = this.date();
          if (this._resHeaders.expires) {
            let g = Date.parse(this._resHeaders.expires);
            return Number.isNaN(g) || g < f ? 0 : Math.max(h, (g - f) / 1e3);
          }
          if (this._resHeaders["last-modified"]) {
            let g = Date.parse(this._resHeaders["last-modified"]);
            if (isFinite(g) && f > g)
              return Math.max(
                h,
                (f - g) / 1e3 * this._cacheHeuristic
              );
          }
          return h;
        }
        timeToLive() {
          let h = this.maxAge() - this.age(), f = h + u(this._rescc["stale-if-error"]), g = h + u(this._rescc["stale-while-revalidate"]);
          return Math.max(0, h, f, g) * 1e3;
        }
        stale() {
          return this.maxAge() <= this.age();
        }
        _useStaleIfError() {
          return this.maxAge() + u(this._rescc["stale-if-error"]) > this.age();
        }
        useStaleWhileRevalidate() {
          return this.maxAge() + u(this._rescc["stale-while-revalidate"]) > this.age();
        }
        static fromObject(h) {
          return new this(void 0, void 0, { _fromObject: h });
        }
        _fromObject(h) {
          if (this._responseTime)
            throw Error("Reinitialized");
          if (!h || h.v !== 1)
            throw Error("Invalid serialization");
          this._responseTime = h.t, this._isShared = h.sh, this._cacheHeuristic = h.ch, this._immutableMinTtl = h.imm !== void 0 ? h.imm : 24 *
          3600 * 1e3, this._status = h.st, this._resHeaders = h.resh, this._rescc = h.rescc, this._method = h.m, this._url = h.u, this._host =
          h.h, this._noAuthorization = h.a, this._reqHeaders = h.reqh, this._reqcc = h.reqcc;
        }
        toObject() {
          return {
            v: 1,
            t: this._responseTime,
            sh: this._isShared,
            ch: this._cacheHeuristic,
            imm: this._immutableMinTtl,
            st: this._status,
            resh: this._resHeaders,
            rescc: this._rescc,
            m: this._method,
            u: this._url,
            h: this._host,
            a: this._noAuthorization,
            reqh: this._reqHeaders,
            reqcc: this._reqcc
          };
        }
        /**
         * Headers for sending to the origin server to revalidate stale response.
         * Allows server to return 304 to allow reuse of the previous response.
         *
         * Hop by hop headers are always stripped.
         * Revalidation headers may be added or removed, depending on request.
         */
        revalidationHeaders(h) {
          this._assertRequestHasHeaders(h);
          let f = this._copyWithoutHopByHopHeaders(h.headers);
          if (delete f["if-range"], !this._requestMatches(h, !0) || !this.storable())
            return delete f["if-none-match"], delete f["if-modified-since"], f;
          if (this._resHeaders.etag && (f["if-none-match"] = f["if-none-match"] ? `${f["if-none-match"]}, ${this._resHeaders.etag}` : this._resHeaders.
          etag), f["accept-ranges"] || f["if-match"] || f["if-unmodified-since"] || this._method && this._method != "GET") {
            if (delete f["if-modified-since"], f["if-none-match"]) {
              let E = f["if-none-match"].split(/,/).filter((_) => !/^\s*W\//.test(_));
              E.length ? f["if-none-match"] = E.join(",").trim() : delete f["if-none-match"];
            }
          } else this._resHeaders["last-modified"] && !f["if-modified-since"] && (f["if-modified-since"] = this._resHeaders["last-modified"]);
          return f;
        }
        /**
         * Creates new CachePolicy with information combined from the previews response,
         * and the new revalidation response.
         *
         * Returns {policy, modified} where modified is a boolean indicating
         * whether the response body has been modified, and old cached body can't be used.
         *
         * @return {Object} {policy: CachePolicy, modified: Boolean}
         */
        revalidatedPolicy(h, f) {
          if (this._assertRequestHasHeaders(h), this._useStaleIfError() && l(f))
            return {
              modified: !1,
              matches: !1,
              policy: this
            };
          if (!f || !f.headers)
            throw Error("Response headers missing");
          let g = !1;
          if (f.status !== void 0 && f.status != 304 ? g = !1 : f.headers.etag && !/^\s*W\//.test(f.headers.etag) ? g = this._resHeaders.etag &&
          this._resHeaders.etag.replace(/^\s*W\//, "") === f.headers.etag : this._resHeaders.etag && f.headers.etag ? g = this._resHeaders.etag.
          replace(/^\s*W\//, "") === f.headers.etag.replace(/^\s*W\//, "") : this._resHeaders["last-modified"] ? g = this._resHeaders["last-\
modified"] === f.headers["last-modified"] : !this._resHeaders.etag && !this._resHeaders["last-modified"] && !f.headers.etag && !f.headers["l\
ast-modified"] && (g = !0), !g)
            return {
              policy: new this.constructor(h, f),
              // Client receiving 304 without body, even if it's invalid/mismatched has no option
              // but to reuse a cached body. We don't have a good way to tell clients to do
              // error recovery in such case.
              modified: f.status != 304,
              matches: !1
            };
          let E = {};
          for (let C in this._resHeaders)
            E[C] = C in f.headers && !a[C] ? f.headers[C] : this._resHeaders[C];
          let _ = Object.assign({}, f, {
            status: this._status,
            method: this._method,
            headers: E
          });
          return {
            policy: new this.constructor(h, _, {
              shared: this._isShared,
              cacheHeuristic: this._cacheHeuristic,
              immutableMinTimeToLive: this._immutableMinTtl
            }),
            modified: !1,
            matches: !0
          };
        }
      };
    }
  }), Q1 = Y({
    "node_modules/.pnpm/json-buffer@3.0.1/node_modules/json-buffer/index.js"(e) {
      e.stringify = /* @__PURE__ */ s(function t(r) {
        if (typeof r > "u")
          return r;
        if (r && Buffer.isBuffer(r))
          return JSON.stringify(":base64:" + r.toString("base64"));
        if (r && r.toJSON && (r = r.toJSON()), r && typeof r == "object") {
          var i = "", n = Array.isArray(r);
          i = n ? "[" : "{";
          var o = !0;
          for (var a in r) {
            var u = typeof r[a] == "function" || !n && typeof r[a] > "u";
            Object.hasOwnProperty.call(r, a) && !u && (o || (i += ","), o = !1, n ? r[a] == null ? i += "null" : i += t(r[a]) : r[a] !== void 0 &&
            (i += t(a) + ":" + t(r[a])));
          }
          return i += n ? "]" : "}", i;
        } else return typeof r == "string" ? JSON.stringify(/^:/.test(r) ? ":" + r : r) : typeof r > "u" ? "null" : JSON.stringify(r);
      }, "stringify"), e.parse = function(t) {
        return JSON.parse(t, function(r, i) {
          return typeof i == "string" ? /^:base64:/.test(i) ? Buffer.from(i.substring(8), "base64") : /^:/.test(i) ? i.substring(1) : i : i;
        });
      };
    }
  }), e3 = Y({
    "node_modules/.pnpm/keyv@4.5.2/node_modules/keyv/src/index.js"(e, t) {
      "use strict";
      var r = require("events"), i = Q1(), n = /* @__PURE__ */ s((u) => {
        let l = {
          redis: "@keyv/redis",
          rediss: "@keyv/redis",
          mongodb: "@keyv/mongo",
          mongo: "@keyv/mongo",
          sqlite: "@keyv/sqlite",
          postgresql: "@keyv/postgres",
          postgres: "@keyv/postgres",
          mysql: "@keyv/mysql",
          etcd: "@keyv/etcd",
          offline: "@keyv/offline",
          tiered: "@keyv/tiered"
        };
        if (u.adapter || u.uri) {
          let c = u.adapter || /^[^:+]*/.exec(u.uri)[0];
          return new (require(l[c]))(u);
        }
        return /* @__PURE__ */ new Map();
      }, "loadStore"), o = [
        "sqlite",
        "postgres",
        "mysql",
        "mongo",
        "redis",
        "tiered"
      ], a = class extends r {
        static {
          s(this, "Keyv2");
        }
        constructor(u, { emitErrors: l = !0, ...c } = {}) {
          if (super(), this.opts = {
            namespace: "keyv",
            serialize: i.stringify,
            deserialize: i.parse,
            ...typeof u == "string" ? { uri: u } : u,
            ...c
          }, !this.opts.store) {
            let p = { ...this.opts };
            this.opts.store = n(p);
          }
          if (this.opts.compression) {
            let p = this.opts.compression;
            this.opts.serialize = p.serialize.bind(p), this.opts.deserialize = p.deserialize.bind(p);
          }
          typeof this.opts.store.on == "function" && l && this.opts.store.on("error", (p) => this.emit("error", p)), this.opts.store.namespace =
          this.opts.namespace;
          let d = /* @__PURE__ */ s((p) => async function* () {
            for await (let [h, f] of typeof p == "function" ? p(this.opts.store.namespace) : p) {
              let g = this.opts.deserialize(f);
              if (!(this.opts.store.namespace && !h.includes(this.opts.store.namespace))) {
                if (typeof g.expires == "number" && Date.now() > g.expires) {
                  this.delete(h);
                  continue;
                }
                yield [this._getKeyUnprefix(h), g.value];
              }
            }
          }, "generateIterator");
          typeof this.opts.store[Symbol.iterator] == "function" && this.opts.store instanceof Map ? this.iterator = d(this.opts.store) : typeof this.
          opts.store.iterator == "function" && this.opts.store.opts && this._checkIterableAdaptar() && (this.iterator = d(this.opts.store.iterator.
          bind(this.opts.store)));
        }
        _checkIterableAdaptar() {
          return o.includes(this.opts.store.opts.dialect) || o.findIndex((u) => this.opts.store.opts.url.includes(u)) >= 0;
        }
        _getKeyPrefix(u) {
          return `${this.opts.namespace}:${u}`;
        }
        _getKeyPrefixArray(u) {
          return u.map((l) => `${this.opts.namespace}:${l}`);
        }
        _getKeyUnprefix(u) {
          return u.split(":").splice(1).join(":");
        }
        get(u, l) {
          let { store: c } = this.opts, d = Array.isArray(u), p = d ? this._getKeyPrefixArray(u) : this._getKeyPrefix(u);
          if (d && c.getMany === void 0) {
            let h = [];
            for (let f of p)
              h.push(
                Promise.resolve().then(() => c.get(f)).then((g) => typeof g == "string" ? this.opts.deserialize(g) : this.opts.compression ?
                this.opts.deserialize(g) : g).then((g) => {
                  if (g != null)
                    return typeof g.expires == "number" && Date.now() > g.expires ? this.delete(f).then(() => {
                    }) : l && l.raw ? g : g.value;
                })
              );
            return Promise.allSettled(h).then((f) => {
              let g = [];
              for (let E of f)
                g.push(E.value);
              return g;
            });
          }
          return Promise.resolve().then(() => d ? c.getMany(p) : c.get(p)).then((h) => typeof h == "string" ? this.opts.deserialize(h) : this.
          opts.compression ? this.opts.deserialize(h) : h).then((h) => {
            if (h != null) {
              if (d) {
                let f = [];
                for (let g of h) {
                  if (typeof g == "string" && (g = this.opts.deserialize(g)), g == null) {
                    f.push(void 0);
                    continue;
                  }
                  typeof g.expires == "number" && Date.now() > g.expires ? (this.delete(u).then(() => {
                  }), f.push(void 0)) : f.push(l && l.raw ? g : g.value);
                }
                return f;
              }
              return typeof h.expires == "number" && Date.now() > h.expires ? this.delete(u).then(() => {
              }) : l && l.raw ? h : h.value;
            }
          });
        }
        set(u, l, c) {
          let d = this._getKeyPrefix(u);
          typeof c > "u" && (c = this.opts.ttl), c === 0 && (c = void 0);
          let { store: p } = this.opts;
          return Promise.resolve().then(() => {
            let h = typeof c == "number" ? Date.now() + c : null;
            return typeof l == "symbol" && this.emit("error", "symbol cannot be serialized"), l = { value: l, expires: h }, this.opts.serialize(
            l);
          }).then((h) => p.set(d, h, c)).then(() => !0);
        }
        delete(u) {
          let { store: l } = this.opts;
          if (Array.isArray(u)) {
            let d = this._getKeyPrefixArray(u);
            if (l.deleteMany === void 0) {
              let p = [];
              for (let h of d)
                p.push(l.delete(h));
              return Promise.allSettled(p).then((h) => h.every((f) => f.value === !0));
            }
            return Promise.resolve().then(() => l.deleteMany(d));
          }
          let c = this._getKeyPrefix(u);
          return Promise.resolve().then(() => l.delete(c));
        }
        clear() {
          let { store: u } = this.opts;
          return Promise.resolve().then(() => u.clear());
        }
        has(u) {
          let l = this._getKeyPrefix(u), { store: c } = this.opts;
          return Promise.resolve().then(async () => typeof c.has == "function" ? c.has(l) : await c.get(l) !== void 0);
        }
        disconnect() {
          let { store: u } = this.opts;
          if (typeof u.disconnect == "function")
            return u.disconnect();
        }
      };
      t.exports = a;
    }
  }), t3 = Y({
    "node_modules/.pnpm/mimic-response@3.1.0/node_modules/mimic-response/index.js"(e, t) {
      "use strict";
      var r = [
        "aborted",
        "complete",
        "headers",
        "httpVersion",
        "httpVersionMinor",
        "httpVersionMajor",
        "method",
        "rawHeaders",
        "rawTrailers",
        "setTimeout",
        "socket",
        "statusCode",
        "statusMessage",
        "trailers",
        "url"
      ];
      t.exports = (i, n) => {
        if (n._readableState.autoDestroy)
          throw new Error("The second stream must have the `autoDestroy` option set to `false`");
        let o = new Set(Object.keys(i).concat(r)), a = {};
        for (let u of o)
          u in n || (a[u] = {
            get() {
              let l = i[u];
              return typeof l == "function" ? l.bind(i) : l;
            },
            set(l) {
              i[u] = l;
            },
            enumerable: !0,
            configurable: !1
          });
        return Object.defineProperties(n, a), i.once("aborted", () => {
          n.destroy(), n.emit("aborted");
        }), i.once("close", () => {
          i.complete && n.readable ? n.once("end", () => {
            n.emit("close");
          }) : n.emit("close");
        }), n;
      };
    }
  }), r3 = Y({
    "node_modules/.pnpm/decompress-response@6.0.0/node_modules/decompress-response/index.js"(e, t) {
      "use strict";
      var { Transform: r, PassThrough: i } = require("stream"), n = require("zlib"), o = t3();
      t.exports = (a) => {
        let u = (a.headers["content-encoding"] || "").toLowerCase();
        if (!["gzip", "deflate", "br"].includes(u))
          return a;
        let l = u === "br";
        if (l && typeof n.createBrotliDecompress != "function")
          return a.destroy(new Error("Brotli is not supported on Node.js < 12")), a;
        let c = !0, d = new r({
          transform(f, g, E) {
            c = !1, E(null, f);
          },
          flush(f) {
            f();
          }
        }), p = new i({
          autoDestroy: !1,
          destroy(f, g) {
            a.destroy(), g(f);
          }
        }), h = l ? n.createBrotliDecompress() : n.createUnzip();
        return h.once("error", (f) => {
          if (c && !a.readable) {
            p.end();
            return;
          }
          p.destroy(f);
        }), o(a, p), a.pipe(d).pipe(h).pipe(p), p;
      };
    }
  }), N0 = Y({
    "node_modules/.pnpm/quick-lru@5.1.1/node_modules/quick-lru/index.js"(e, t) {
      "use strict";
      var r = class {
        static {
          s(this, "QuickLRU");
        }
        constructor(i = {}) {
          if (!(i.maxSize && i.maxSize > 0))
            throw new TypeError("`maxSize` must be a number greater than 0");
          this.maxSize = i.maxSize, this.onEviction = i.onEviction, this.cache = /* @__PURE__ */ new Map(), this.oldCache = /* @__PURE__ */ new Map(),
          this._size = 0;
        }
        _set(i, n) {
          if (this.cache.set(i, n), this._size++, this._size >= this.maxSize) {
            if (this._size = 0, typeof this.onEviction == "function")
              for (let [o, a] of this.oldCache.entries())
                this.onEviction(o, a);
            this.oldCache = this.cache, this.cache = /* @__PURE__ */ new Map();
          }
        }
        get(i) {
          if (this.cache.has(i))
            return this.cache.get(i);
          if (this.oldCache.has(i)) {
            let n = this.oldCache.get(i);
            return this.oldCache.delete(i), this._set(i, n), n;
          }
        }
        set(i, n) {
          return this.cache.has(i) ? this.cache.set(i, n) : this._set(i, n), this;
        }
        has(i) {
          return this.cache.has(i) || this.oldCache.has(i);
        }
        peek(i) {
          if (this.cache.has(i))
            return this.cache.get(i);
          if (this.oldCache.has(i))
            return this.oldCache.get(i);
        }
        delete(i) {
          let n = this.cache.delete(i);
          return n && this._size--, this.oldCache.delete(i) || n;
        }
        clear() {
          this.cache.clear(), this.oldCache.clear(), this._size = 0;
        }
        *keys() {
          for (let [i] of this)
            yield i;
        }
        *values() {
          for (let [, i] of this)
            yield i;
        }
        *[Symbol.iterator]() {
          for (let i of this.cache)
            yield i;
          for (let i of this.oldCache) {
            let [n] = i;
            this.cache.has(n) || (yield i);
          }
        }
        get size() {
          let i = 0;
          for (let n of this.oldCache.keys())
            this.cache.has(n) || i++;
          return Math.min(this._size + i, this.maxSize);
        }
      };
      t.exports = r;
    }
  }), U0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/delay-async-destroy.js"(e, t) {
      "use strict";
      t.exports = (r) => {
        if (r.listenerCount("error") !== 0)
          return r;
        r.__destroy = r._destroy, r._destroy = (...n) => {
          let o = n.pop();
          r.__destroy(...n, async (a) => {
            await Promise.resolve(), o(a);
          });
        };
        let i = /* @__PURE__ */ s((n) => {
          Promise.resolve().then(() => {
            r.emit("error", n);
          });
        }, "onError");
        return r.once("error", i), Promise.resolve().then(() => {
          r.off("error", i);
        }), r;
      };
    }
  }), Si = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/agent.js"(e, t) {
      "use strict";
      var { URL: r } = require("url"), i = require("events"), n = require("tls"), o = require("http2"), a = N0(), u = U0(), l = Symbol("curr\
entStreamCount"), c = Symbol("request"), d = Symbol("cachedOriginSet"), p = Symbol("gracefullyClosing"), h = Symbol("length"), f = [
        // Not an Agent option actually
        "createConnection",
        // `http2.connect()` options
        "maxDeflateDynamicTableSize",
        "maxSettings",
        "maxSessionMemory",
        "maxHeaderListPairs",
        "maxOutstandingPings",
        "maxReservedRemoteStreams",
        "maxSendHeaderBlockLength",
        "paddingStrategy",
        "peerMaxConcurrentStreams",
        "settings",
        // `tls.connect()` source options
        "family",
        "localAddress",
        "rejectUnauthorized",
        // `tls.connect()` secure context options
        "pskCallback",
        "minDHSize",
        // `tls.connect()` destination options
        // - `servername` is automatically validated, skip it
        // - `host` and `port` just describe the destination server,
        "path",
        "socket",
        // `tls.createSecureContext()` options
        "ca",
        "cert",
        "sigalgs",
        "ciphers",
        "clientCertEngine",
        "crl",
        "dhparam",
        "ecdhCurve",
        "honorCipherOrder",
        "key",
        "privateKeyEngine",
        "privateKeyIdentifier",
        "maxVersion",
        "minVersion",
        "pfx",
        "secureOptions",
        "secureProtocol",
        "sessionIdContext",
        "ticketKeys"
      ], g = /* @__PURE__ */ s((T, S, F) => {
        let I = 0, q = T.length;
        for (; I < q; ) {
          let M = I + q >>> 1;
          F(T[M], S) ? I = M + 1 : q = M;
        }
        return I;
      }, "getSortedIndex"), E = /* @__PURE__ */ s((T, S) => T.remoteSettings.maxConcurrentStreams > S.remoteSettings.maxConcurrentStreams, "\
compareSessions"), _ = /* @__PURE__ */ s((T, S) => {
        for (let F = 0; F < T.length; F++) {
          let I = T[F];
          // Unfortunately `.every()` returns true for an empty array
          I[d].length > 0 && I[d].length < S[d].length && I[d].every((q) => S[d].includes(q)) && I[l] + S[l] <= S.remoteSettings.maxConcurrentStreams &&
          x(I);
        }
      }, "closeCoveredSessions"), C = /* @__PURE__ */ s((T, S) => {
        for (let F = 0; F < T.length; F++) {
          let I = T[F];
          if (S[d].length > 0 && S[d].length < I[d].length && S[d].every((q) => I[d].includes(q)) && S[l] + I[l] <= I.remoteSettings.maxConcurrentStreams)
            return x(S), !0;
        }
        return !1;
      }, "closeSessionIfCovered"), x = /* @__PURE__ */ s((T) => {
        T[p] = !0, T[l] === 0 && T.close();
      }, "gracefullyClose"), w = class extends i {
        static {
          s(this, "Agent");
        }
        constructor({ timeout: T = 0, maxSessions: S = Number.POSITIVE_INFINITY, maxEmptySessions: F = 10, maxCachedTlsSessions: I = 100 } = {}) {
          super(), this.sessions = {}, this.queue = {}, this.timeout = T, this.maxSessions = S, this.maxEmptySessions = F, this._emptySessionCount =
          0, this._sessionCount = 0, this.settings = {
            enablePush: !1,
            initialWindowSize: 1024 * 1024 * 32
            // 32MB, see https://github.com/nodejs/node/issues/38426
          }, this.tlsSessionCache = new a({ maxSize: I });
        }
        get protocol() {
          return "https:";
        }
        normalizeOptions(T) {
          let S = "";
          for (let F = 0; F < f.length; F++) {
            let I = f[F];
            S += ":", T && T[I] !== void 0 && (S += T[I]);
          }
          return S;
        }
        _processQueue() {
          if (this._sessionCount >= this.maxSessions) {
            this.closeEmptySessions(this.maxSessions - this._sessionCount + 1);
            return;
          }
          for (let T in this.queue)
            for (let S in this.queue[T]) {
              let F = this.queue[T][S];
              F.completed || (F.completed = !0, F());
            }
        }
        _isBetterSession(T, S) {
          return T > S;
        }
        _accept(T, S, F, I) {
          let q = 0;
          for (; q < S.length && T[l] < T.remoteSettings.maxConcurrentStreams; )
            S[q].resolve(T), q++;
          S.splice(0, q), S.length > 0 && (this.getSession(F, I, S), S.length = 0);
        }
        getSession(T, S, F) {
          return new Promise((I, q) => {
            Array.isArray(F) && F.length > 0 ? (F = [...F], I()) : F = [{ resolve: I, reject: q }];
            try {
              if (typeof T == "string")
                T = new r(T);
              else if (!(T instanceof r))
                throw new TypeError("The `origin` argument needs to be a string or an URL object");
              if (S) {
                let { servername: j } = S, { hostname: B } = T;
                if (j && B !== j)
                  throw new Error(`Origin ${B} differs from servername ${j}`);
              }
            } catch (j) {
              for (let B = 0; B < F.length; B++)
                F[B].reject(j);
              return;
            }
            let M = this.normalizeOptions(S), H = T.origin;
            if (M in this.sessions) {
              let j = this.sessions[M], B = -1, U = -1, pe;
              for (let J = 0; J < j.length; J++) {
                let P = j[J], Se = P.remoteSettings.maxConcurrentStreams;
                if (Se < B)
                  break;
                if (!P[d].includes(H))
                  continue;
                let z = P[l];
                z >= Se || P[p] || P.destroyed || (pe || (B = Se), this._isBetterSession(z, U) && (pe = P, U = z));
              }
              if (pe) {
                this._accept(pe, F, H, S);
                return;
              }
            }
            if (M in this.queue) {
              if (H in this.queue[M]) {
                this.queue[M][H].listeners.push(...F);
                return;
              }
            } else
              this.queue[M] = {
                [h]: 0
              };
            let K = /* @__PURE__ */ s(() => {
              M in this.queue && this.queue[M][H] === ve && (delete this.queue[M][H], --this.queue[M][h] === 0 && delete this.queue[M]);
            }, "removeFromQueue"), ve = /* @__PURE__ */ s(async () => {
              this._sessionCount++;
              let j = `${H}:${M}`, B = !1, U;
              try {
                let pe = { ...S };
                pe.settings === void 0 && (pe.settings = this.settings), pe.session === void 0 && (pe.session = this.tlsSessionCache.get(j)),
                U = await (pe.createConnection || this.createConnection).call(this, T, pe), pe.createConnection = () => U;
                let P = o.connect(T, pe);
                P[l] = 0, P[p] = !1;
                let Se = /* @__PURE__ */ s(() => {
                  let { socket: Z } = P, le;
                  return Z.servername === !1 ? (Z.servername = Z.remoteAddress, le = P.originSet, Z.servername = !1) : le = P.originSet, le;
                }, "getOriginSet"), z = /* @__PURE__ */ s(() => P[l] < P.remoteSettings.maxConcurrentStreams, "isFree");
                P.socket.once("session", (Z) => {
                  this.tlsSessionCache.set(j, Z);
                }), P.once("error", (Z) => {
                  for (let le = 0; le < F.length; le++)
                    F[le].reject(Z);
                  this.tlsSessionCache.delete(j);
                }), P.setTimeout(this.timeout, () => {
                  P.destroy();
                }), P.once("close", () => {
                  if (this._sessionCount--, B) {
                    this._emptySessionCount--;
                    let Z = this.sessions[M];
                    Z.length === 1 ? delete this.sessions[M] : Z.splice(Z.indexOf(P), 1);
                  } else {
                    K();
                    let Z = new Error("Session closed without receiving a SETTINGS frame");
                    Z.code = "HTTP2WRAPPER_NOSETTINGS";
                    for (let le = 0; le < F.length; le++)
                      F[le].reject(Z);
                  }
                  this._processQueue();
                });
                let Ni = /* @__PURE__ */ s(() => {
                  let Z = this.queue[M];
                  if (!Z)
                    return;
                  let le = P[d];
                  for (let ot = 0; ot < le.length; ot++) {
                    let Ui = le[ot];
                    if (Ui in Z) {
                      let { listeners: qd, completed: nw } = Z[Ui], cs = 0;
                      for (; cs < qd.length && z(); )
                        qd[cs].resolve(P), cs++;
                      if (Z[Ui].listeners.splice(0, cs), Z[Ui].listeners.length === 0 && !nw && (delete Z[Ui], --Z[h] === 0)) {
                        delete this.queue[M];
                        break;
                      }
                      if (!z())
                        break;
                    }
                  }
                }, "processListeners");
                P.on("origin", () => {
                  P[d] = Se() || [], P[p] = !1, C(this.sessions[M], P), !(P[p] || !z()) && (Ni(), z() && _(this.sessions[M], P));
                }), P.once("remoteSettings", () => {
                  if (ve.destroyed) {
                    let Z = new Error("Agent has been destroyed");
                    for (let le = 0; le < F.length; le++)
                      F[le].reject(Z);
                    P.destroy();
                    return;
                  }
                  if (P.setLocalWindowSize && P.setLocalWindowSize(1024 * 1024 * 4), P[d] = Se() || [], P.socket.encrypted) {
                    let Z = P[d][0];
                    if (Z !== H) {
                      let le = new Error(`Requested origin ${H} does not match server ${Z}`);
                      for (let ot = 0; ot < F.length; ot++)
                        F[ot].reject(le);
                      P.destroy();
                      return;
                    }
                  }
                  K();
                  {
                    let Z = this.sessions;
                    if (M in Z) {
                      let le = Z[M];
                      le.splice(g(le, P, E), 0, P);
                    } else
                      Z[M] = [P];
                  }
                  B = !0, this._emptySessionCount++, this.emit("session", P), this._accept(P, F, H, S), P[l] === 0 && this._emptySessionCount >
                  this.maxEmptySessions && this.closeEmptySessions(this._emptySessionCount - this.maxEmptySessions), P.on("remoteSettings", () => {
                    z() && (Ni(), z() && _(this.sessions[M], P));
                  });
                }), P[c] = P.request, P.request = (Z, le) => {
                  if (P[p])
                    throw new Error("The session is gracefully closing. No new streams are allowed.");
                  let ot = P[c](Z, le);
                  return P.ref(), P[l]++ === 0 && this._emptySessionCount--, ot.once("close", () => {
                    if (--P[l] === 0 && (this._emptySessionCount++, P.unref(), this._emptySessionCount > this.maxEmptySessions || P[p])) {
                      P.close();
                      return;
                    }
                    P.destroyed || P.closed || z() && !C(this.sessions[M], P) && (_(this.sessions[M], P), Ni(), P[l] === 0 && this._processQueue());
                  }), ot;
                };
              } catch (pe) {
                K(), this._sessionCount--;
                for (let J = 0; J < F.length; J++)
                  F[J].reject(pe);
              }
            }, "entry");
            ve.listeners = F, ve.completed = !1, ve.destroyed = !1, this.queue[M][H] = ve, this.queue[M][h]++, this._processQueue();
          });
        }
        request(T, S, F, I) {
          return new Promise((q, M) => {
            this.getSession(T, S, [{
              reject: M,
              resolve: /* @__PURE__ */ s((H) => {
                try {
                  let K = H.request(F, I);
                  u(K), q(K);
                } catch (K) {
                  M(K);
                }
              }, "resolve")
            }]);
          });
        }
        async createConnection(T, S) {
          return w.connect(T, S);
        }
        static connect(T, S) {
          S.ALPNProtocols = ["h2"];
          let F = T.port || 443, I = T.hostname;
          typeof S.servername > "u" && (S.servername = I);
          let q = n.connect(F, I, S);
          return S.socket && (q._peername = {
            family: void 0,
            address: void 0,
            port: F
          }), q;
        }
        closeEmptySessions(T = Number.POSITIVE_INFINITY) {
          let S = 0, { sessions: F } = this;
          for (let I in F) {
            let q = F[I];
            for (let M = 0; M < q.length; M++) {
              let H = q[M];
              if (H[l] === 0 && (S++, H.close(), S >= T))
                return S;
            }
          }
          return S;
        }
        destroy(T) {
          let { sessions: S, queue: F } = this;
          for (let I in S) {
            let q = S[I];
            for (let M = 0; M < q.length; M++)
              q[M].destroy(T);
          }
          for (let I in F) {
            let q = F[I];
            for (let M in q)
              q[M].destroyed = !0;
          }
          this.queue = {}, this.tlsSessionCache.clear();
        }
        get emptySessionCount() {
          return this._emptySessionCount;
        }
        get pendingSessionCount() {
          return this._sessionCount - this._emptySessionCount;
        }
        get sessionCount() {
          return this._sessionCount;
        }
      };
      w.kCurrentStreamCount = l, w.kGracefullyClosing = p, t.exports = {
        Agent: w,
        globalAgent: new w()
      };
    }
  }), W0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/incoming-message.js"(e, t) {
      "use strict";
      var { Readable: r } = require("stream"), i = class extends r {
        static {
          s(this, "IncomingMessage");
        }
        constructor(n, o) {
          super({
            emitClose: !1,
            autoDestroy: !0,
            highWaterMark: o
          }), this.statusCode = null, this.statusMessage = "", this.httpVersion = "2.0", this.httpVersionMajor = 2, this.httpVersionMinor = 0,
          this.headers = {}, this.trailers = {}, this.req = null, this.aborted = !1, this.complete = !1, this.upgrade = null, this.rawHeaders =
          [], this.rawTrailers = [], this.socket = n, this._dumped = !1;
        }
        get connection() {
          return this.socket;
        }
        set connection(n) {
          this.socket = n;
        }
        _destroy(n, o) {
          this.readableEnded || (this.aborted = !0), o(), this.req._request.destroy(n);
        }
        setTimeout(n, o) {
          return this.req.setTimeout(n, o), this;
        }
        _dump() {
          this._dumped || (this._dumped = !0, this.removeAllListeners("data"), this.resume());
        }
        _read() {
          this.req && this.req._request.resume();
        }
      };
      t.exports = i;
    }
  }), i3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/proxy-events.js"(e, t) {
      "use strict";
      t.exports = (r, i, n) => {
        for (let o of n)
          r.on(o, (...a) => i.emit(o, ...a));
      };
    }
  }), Xo = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/errors.js"(e, t) {
      "use strict";
      var r = /* @__PURE__ */ s((i, n, o) => {
        t.exports[n] = class extends i {
          static {
            s(this, "NodeError");
          }
          constructor(...u) {
            super(typeof o == "string" ? o : o(u)), this.name = `${super.name} [${n}]`, this.code = n;
          }
        };
      }, "makeError");
      r(TypeError, "ERR_INVALID_ARG_TYPE", (i) => {
        let n = i[0].includes(".") ? "property" : "argument", o = i[1], a = Array.isArray(o);
        return a && (o = `${o.slice(0, -1).join(", ")} or ${o.slice(-1)}`), `The "${i[0]}" ${n} must be ${a ? "one of" : "of"} type ${o}. Re\
ceived ${typeof i[2]}`;
      }), r(
        TypeError,
        "ERR_INVALID_PROTOCOL",
        (i) => `Protocol "${i[0]}" not supported. Expected "${i[1]}"`
      ), r(
        Error,
        "ERR_HTTP_HEADERS_SENT",
        (i) => `Cannot ${i[0]} headers after they are sent to the client`
      ), r(
        TypeError,
        "ERR_INVALID_HTTP_TOKEN",
        (i) => `${i[0]} must be a valid HTTP token [${i[1]}]`
      ), r(
        TypeError,
        "ERR_HTTP_INVALID_HEADER_VALUE",
        (i) => `Invalid value "${i[0]} for header "${i[1]}"`
      ), r(
        TypeError,
        "ERR_INVALID_CHAR",
        (i) => `Invalid character in ${i[0]} [${i[1]}]`
      ), r(
        Error,
        "ERR_HTTP2_NO_SOCKET_MANIPULATION",
        "HTTP/2 sockets should not be directly manipulated (e.g. read and written)"
      );
    }
  }), n3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/is-request-pseudo-header.js"(e, t) {
      "use strict";
      t.exports = (r) => {
        switch (r) {
          case ":method":
          case ":scheme":
          case ":authority":
          case ":path":
            return !0;
          default:
            return !1;
        }
      };
    }
  }), $0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/validate-header-name.js"(e, t) {
      "use strict";
      var { ERR_INVALID_HTTP_TOKEN: r } = Xo(), i = n3(), n = /^[\^`\-\w!#$%&*+.|~]+$/;
      t.exports = (o) => {
        if (typeof o != "string" || !n.test(o) && !i(o))
          throw new r("Header name", o);
      };
    }
  }), H0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/validate-header-value.js"(e, t) {
      "use strict";
      var {
        ERR_HTTP_INVALID_HEADER_VALUE: r,
        ERR_INVALID_CHAR: i
      } = Xo(), n = /[^\t\u0020-\u007E\u0080-\u00FF]/;
      t.exports = (o, a) => {
        if (typeof a > "u")
          throw new r(a, o);
        if (n.test(a))
          throw new i("header content", o);
      };
    }
  }), s3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/proxy-socket-handler.js"(e, t) {
      "use strict";
      var { ERR_HTTP2_NO_SOCKET_MANIPULATION: r } = Xo(), i = {
        has(n, o) {
          let a = n.session === void 0 ? n : n.session.socket;
          return o in n || o in a;
        },
        get(n, o) {
          switch (o) {
            case "on":
            case "once":
            case "end":
            case "emit":
            case "destroy":
              return n[o].bind(n);
            case "writable":
            case "destroyed":
              return n[o];
            case "readable":
              return n.destroyed ? !1 : n.readable;
            case "setTimeout": {
              let { session: a } = n;
              return a !== void 0 ? a.setTimeout.bind(a) : n.setTimeout.bind(n);
            }
            case "write":
            case "read":
            case "pause":
            case "resume":
              throw new r();
            default: {
              let a = n.session === void 0 ? n : n.session.socket, u = a[o];
              return typeof u == "function" ? u.bind(a) : u;
            }
          }
        },
        getPrototypeOf(n) {
          return n.session !== void 0 ? Reflect.getPrototypeOf(n.session.socket) : Reflect.getPrototypeOf(n);
        },
        set(n, o, a) {
          switch (o) {
            case "writable":
            case "readable":
            case "destroyed":
            case "on":
            case "once":
            case "end":
            case "emit":
            case "destroy":
              return n[o] = a, !0;
            case "setTimeout": {
              let { session: u } = n;
              return u === void 0 ? n.setTimeout = a : u.setTimeout = a, !0;
            }
            case "write":
            case "read":
            case "pause":
            case "resume":
              throw new r();
            default: {
              let u = n.session === void 0 ? n : n.session.socket;
              return u[o] = a, !0;
            }
          }
        }
      };
      t.exports = i;
    }
  }), V0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/client-request.js"(e, t) {
      "use strict";
      var { URL: r, urlToHttpOptions: i } = require("url"), n = require("http2"), { Writable: o } = require("stream"), { Agent: a, globalAgent: u } = Si(),
      l = W0(), c = i3(), {
        ERR_INVALID_ARG_TYPE: d,
        ERR_INVALID_PROTOCOL: p,
        ERR_HTTP_HEADERS_SENT: h
      } = Xo(), f = $0(), g = H0(), E = s3(), {
        HTTP2_HEADER_STATUS: _,
        HTTP2_HEADER_METHOD: C,
        HTTP2_HEADER_PATH: x,
        HTTP2_HEADER_AUTHORITY: w,
        HTTP2_METHOD_CONNECT: T
      } = n.constants, S = Symbol("headers"), F = Symbol("origin"), I = Symbol("session"), q = Symbol("options"), M = Symbol("flushedHeaders"),
      H = Symbol("jobs"), K = Symbol("pendingAgentPromise"), ve = class extends o {
        static {
          s(this, "ClientRequest");
        }
        constructor(j, B, U) {
          if (super({
            autoDestroy: !1,
            emitClose: !1
          }), typeof j == "string" ? j = i(new r(j)) : j instanceof r ? j = i(j) : j = { ...j }, typeof B == "function" || B === void 0 ? (U =
          B, B = j) : B = Object.assign(j, B), B.h2session) {
            if (this[I] = B.h2session, this[I].destroyed)
              throw new Error("The session has been closed already");
            this.protocol = this[I].socket.encrypted ? "https:" : "http:";
          } else if (B.agent === !1)
            this.agent = new a({ maxEmptySessions: 0 });
          else if (typeof B.agent > "u" || B.agent === null)
            this.agent = u;
          else if (typeof B.agent.request == "function")
            this.agent = B.agent;
          else
            throw new d("options.agent", ["http2wrapper.Agent-like Object", "undefined", "false"], B.agent);
          if (this.agent && (this.protocol = this.agent.protocol), B.protocol && B.protocol !== this.protocol)
            throw new p(B.protocol, this.protocol);
          B.port || (B.port = B.defaultPort || this.agent && this.agent.defaultPort || 443), B.host = B.hostname || B.host || "localhost", delete B.
          hostname;
          let { timeout: pe } = B;
          B.timeout = void 0, this[S] = /* @__PURE__ */ Object.create(null), this[H] = [], this[K] = void 0, this.socket = null, this.connection =
          null, this.method = B.method || "GET", this.method === "CONNECT" && (B.path === "/" || B.path === void 0) || (this.path = B.path),
          this.res = null, this.aborted = !1, this.reusedSocket = !1;
          let { headers: J } = B;
          if (J)
            for (let Se in J)
              this.setHeader(Se, J[Se]);
          B.auth && !("authorization" in this[S]) && (this[S].authorization = "Basic " + Buffer.from(B.auth).toString("base64")), B.session =
          B.tlsSession, B.path = B.socketPath, this[q] = B, this[F] = new r(`${this.protocol}//${B.servername || B.host}:${B.port}`);
          let P = B._reuseSocket;
          P && (B.createConnection = (...Se) => P.destroyed ? this.agent.createConnection(...Se) : P, this.agent.getSession(this[F], this[q]).
          catch(() => {
          })), pe && this.setTimeout(pe), U && this.once("response", U), this[M] = !1;
        }
        get method() {
          return this[S][C];
        }
        set method(j) {
          j && (this[S][C] = j.toUpperCase());
        }
        get path() {
          let j = this.method === "CONNECT" ? w : x;
          return this[S][j];
        }
        set path(j) {
          if (j) {
            let B = this.method === "CONNECT" ? w : x;
            this[S][B] = j;
          }
        }
        get host() {
          return this[F].hostname;
        }
        set host(j) {
        }
        get _mustNotHaveABody() {
          return this.method === "GET" || this.method === "HEAD" || this.method === "DELETE";
        }
        _write(j, B, U) {
          if (this._mustNotHaveABody) {
            U(new Error("The GET, HEAD and DELETE methods must NOT have a body"));
            return;
          }
          this.flushHeaders();
          let pe = /* @__PURE__ */ s(() => this._request.write(j, B, U), "callWrite");
          this._request ? pe() : this[H].push(pe);
        }
        _final(j) {
          this.flushHeaders();
          let B = /* @__PURE__ */ s(() => {
            if (this._mustNotHaveABody || this.method === "CONNECT") {
              j();
              return;
            }
            this._request.end(j);
          }, "callEnd");
          this._request ? B() : this[H].push(B);
        }
        abort() {
          this.res && this.res.complete || (this.aborted || process.nextTick(() => this.emit("abort")), this.aborted = !0, this.destroy());
        }
        async _destroy(j, B) {
          this.res && this.res._dump(), this._request ? this._request.destroy() : process.nextTick(() => {
            this.emit("close");
          });
          try {
            await this[K];
          } catch (U) {
            this.aborted && (j = U);
          }
          B(j);
        }
        async flushHeaders() {
          if (this[M] || this.destroyed)
            return;
          this[M] = !0;
          let j = this.method === T, B = /* @__PURE__ */ s((U) => {
            if (this._request = U, this.destroyed) {
              U.destroy();
              return;
            }
            j || c(U, this, ["timeout", "continue"]), U.once("error", (J) => {
              this.destroy(J);
            }), U.once("aborted", () => {
              let { res: J } = this;
              J ? (J.aborted = !0, J.emit("aborted"), J.destroy()) : this.destroy(new Error("The server aborted the HTTP/2 stream"));
            });
            let pe = /* @__PURE__ */ s((J, P, Se) => {
              let z = new l(this.socket, U.readableHighWaterMark);
              this.res = z, z.url = `${this[F].origin}${this.path}`, z.req = this, z.statusCode = J[_], z.headers = J, z.rawHeaders = Se, z.
              once("end", () => {
                z.complete = !0, z.socket = null, z.connection = null;
              }), j ? (z.upgrade = !0, this.emit("connect", z, U, Buffer.alloc(0)) ? this.emit("close") : U.destroy()) : (U.on("data", (Ni) => {
                !z._dumped && !z.push(Ni) && U.pause();
              }), U.once("end", () => {
                this.aborted || z.push(null);
              }), this.emit("response", z) || z._dump());
            }, "onResponse");
            U.once("response", pe), U.once("headers", (J) => this.emit("information", { statusCode: J[_] })), U.once("trailers", (J, P, Se) => {
              let { res: z } = this;
              if (z === null) {
                pe(J, P, Se);
                return;
              }
              z.trailers = J, z.rawTrailers = Se;
            }), U.once("close", () => {
              let { aborted: J, res: P } = this;
              if (P) {
                J && (P.aborted = !0, P.emit("aborted"), P.destroy());
                let Se = /* @__PURE__ */ s(() => {
                  P.emit("close"), this.destroy(), this.emit("close");
                }, "finish");
                P.readable ? P.once("end", Se) : Se();
                return;
              }
              if (!this.destroyed) {
                this.destroy(new Error("The HTTP/2 stream has been early terminated")), this.emit("close");
                return;
              }
              this.destroy(), this.emit("close");
            }), this.socket = new Proxy(U, E);
            for (let J of this[H])
              J();
            this[H].length = 0, this.emit("socket", this.socket);
          }, "onStream");
          if (!(w in this[S]) && !j && (this[S][w] = this[F].host), this[I])
            try {
              B(this[I].request(this[S]));
            } catch (U) {
              this.destroy(U);
            }
          else {
            this.reusedSocket = !0;
            try {
              let U = this.agent.request(this[F], this[q], this[S]);
              this[K] = U, B(await U), this[K] = !1;
            } catch (U) {
              this[K] = !1, this.destroy(U);
            }
          }
        }
        get connection() {
          return this.socket;
        }
        set connection(j) {
          this.socket = j;
        }
        getHeaderNames() {
          return Object.keys(this[S]);
        }
        hasHeader(j) {
          if (typeof j != "string")
            throw new d("name", "string", j);
          return !!this[S][j.toLowerCase()];
        }
        getHeader(j) {
          if (typeof j != "string")
            throw new d("name", "string", j);
          return this[S][j.toLowerCase()];
        }
        get headersSent() {
          return this[M];
        }
        removeHeader(j) {
          if (typeof j != "string")
            throw new d("name", "string", j);
          if (this.headersSent)
            throw new h("remove");
          delete this[S][j.toLowerCase()];
        }
        setHeader(j, B) {
          if (this.headersSent)
            throw new h("set");
          f(j), g(j, B);
          let U = j.toLowerCase();
          if (U === "connection") {
            if (B.toLowerCase() === "keep-alive")
              return;
            throw new Error(`Invalid 'connection' header: ${B}`);
          }
          U === "host" && this.method === "CONNECT" ? this[S][w] = B : this[S][U] = B;
        }
        setNoDelay() {
        }
        setSocketKeepAlive() {
        }
        setTimeout(j, B) {
          let U = /* @__PURE__ */ s(() => this._request.setTimeout(j, B), "applyTimeout");
          return this._request ? U() : this[H].push(U), this;
        }
        get maxHeadersCount() {
          if (!this.destroyed && this._request)
            return this._request.session.localSettings.maxHeaderListSize;
        }
        set maxHeadersCount(j) {
        }
      };
      t.exports = ve;
    }
  }), o3 = Y({
    "node_modules/.pnpm/resolve-alpn@1.2.1/node_modules/resolve-alpn/index.js"(e, t) {
      "use strict";
      var r = require("tls");
      t.exports = (i = {}, n = r.connect) => new Promise((o, a) => {
        let u = !1, l, c = /* @__PURE__ */ s(async () => {
          await p, l.off("timeout", d), l.off("error", a), i.resolveSocket ? (o({ alpnProtocol: l.alpnProtocol, socket: l, timeout: u }), u &&
          (await Promise.resolve(), l.emit("timeout"))) : (l.destroy(), o({ alpnProtocol: l.alpnProtocol, timeout: u }));
        }, "callback"), d = /* @__PURE__ */ s(async () => {
          u = !0, c();
        }, "onTimeout"), p = (async () => {
          try {
            l = await n(i, c), l.on("error", a), l.once("timeout", d);
          } catch (h) {
            a(h);
          }
        })();
      });
    }
  }), a3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/calculate-server-name.js"(e, t) {
      "use strict";
      var { isIP: r } = require("net"), i = require("assert"), n = /* @__PURE__ */ s((o) => {
        if (o[0] === "[") {
          let u = o.indexOf("]");
          return i(u !== -1), o.slice(1, u);
        }
        let a = o.indexOf(":");
        return a === -1 ? o : o.slice(0, a);
      }, "getHost");
      t.exports = (o) => {
        let a = n(o);
        return r(a) ? "" : a;
      };
    }
  }), u3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/auto.js"(e, t) {
      "use strict";
      var { URL: r, urlToHttpOptions: i } = require("url"), n = require("http"), o = require("https"), a = o3(), u = N0(), { Agent: l, globalAgent: c } = Si(),
      d = V0(), p = a3(), h = U0(), f = new u({ maxSize: 100 }), g = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ s((x, w, T) => {
        w._httpMessage = { shouldKeepAlive: !0 };
        let S = /* @__PURE__ */ s(() => {
          x.emit("free", w, T);
        }, "onFree");
        w.on("free", S);
        let F = /* @__PURE__ */ s(() => {
          x.removeSocket(w, T);
        }, "onClose");
        w.on("close", F);
        let I = /* @__PURE__ */ s(() => {
          let { freeSockets: M } = x;
          for (let H of Object.values(M))
            if (H.includes(w)) {
              w.destroy();
              return;
            }
        }, "onTimeout");
        w.on("timeout", I);
        let q = /* @__PURE__ */ s(() => {
          x.removeSocket(w, T), w.off("close", F), w.off("free", S), w.off("timeout", I), w.off("agentRemove", q);
        }, "onRemove");
        w.on("agentRemove", q), x.emit("free", w, T);
      }, "installSocket"), _ = /* @__PURE__ */ s((x, w = /* @__PURE__ */ new Map(), T = void 0) => async (S) => {
        let F = `${S.host}:${S.port}:${S.ALPNProtocols.sort()}`;
        if (!x.has(F)) {
          if (w.has(F))
            return { alpnProtocol: (await w.get(F)).alpnProtocol };
          let { path: I } = S;
          S.path = S.socketPath;
          let q = a(S, T);
          w.set(F, q);
          try {
            let M = await q;
            return x.set(F, M.alpnProtocol), w.delete(F), S.path = I, M;
          } catch (M) {
            throw w.delete(F), S.path = I, M;
          }
        }
        return { alpnProtocol: x.get(F) };
      }, "createResolveProtocol"), C = _(f, g);
      t.exports = async (x, w, T) => {
        if (typeof x == "string" ? x = i(new r(x)) : x instanceof r ? x = i(x) : x = { ...x }, typeof w == "function" || w === void 0 ? (T =
        w, w = x) : w = Object.assign(x, w), w.ALPNProtocols = w.ALPNProtocols || ["h2", "http/1.1"], !Array.isArray(w.ALPNProtocols) || w.ALPNProtocols.
        length === 0)
          throw new Error("The `ALPNProtocols` option must be an Array with at least one entry");
        w.protocol = w.protocol || "https:";
        let S = w.protocol === "https:";
        w.host = w.hostname || w.host || "localhost", w.session = w.tlsSession, w.servername = w.servername || p(w.headers && w.headers.host ||
        w.host), w.port = w.port || (S ? 443 : 80), w._defaultAgent = S ? o.globalAgent : n.globalAgent;
        let F = w.resolveProtocol || C, { agent: I } = w;
        if (I !== void 0 && I !== !1 && I.constructor.name !== "Object")
          throw new Error("The `options.agent` can be only an object `http`, `https` or `http2` properties");
        if (S) {
          w.resolveSocket = !0;
          let { socket: q, alpnProtocol: M, timeout: H } = await F(w);
          if (H) {
            q && q.destroy();
            let ve = new Error(`Timed out resolving ALPN: ${w.timeout} ms`);
            throw ve.code = "ETIMEDOUT", ve.ms = w.timeout, ve;
          }
          q && w.createConnection && (q.destroy(), q = void 0), delete w.resolveSocket;
          let K = M === "h2";
          if (I && (I = K ? I.http2 : I.https, w.agent = I), I === void 0 && (I = K ? c : o.globalAgent), q)
            if (I === !1)
              q.destroy();
            else {
              let ve = (K ? l : o.Agent).prototype.createConnection;
              I.createConnection === ve ? K ? w._reuseSocket = q : E(I, q, w) : q.destroy();
            }
          if (K)
            return h(new d(w, T));
        } else I && (w.agent = I.http);
        return h(n.request(w, T));
      }, t.exports.protocolCache = f, t.exports.resolveProtocol = C, t.exports.createResolveProtocol = _;
    }
  }), Z0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/js-stream-socket.js"(e, t) {
      "use strict";
      var r = require("stream"), i = require("tls"), n = new i.TLSSocket(new r.PassThrough())._handle._parentWrap.constructor;
      t.exports = n;
    }
  }), z0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/unexpected-status-code-error.js"(e, t) {
      "use strict";
      var r = class extends Error {
        static {
          s(this, "UnexpectedStatusCodeError");
        }
        constructor(i, n = "") {
          super(`The proxy server rejected the request with status code ${i} (${n || "empty status message"})`), this.statusCode = i, this.statusMessage =
          n;
        }
      };
      t.exports = r;
    }
  }), l3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/utils/check-type.js"(e, t) {
      "use strict";
      var r = /* @__PURE__ */ s((i, n, o) => {
        if (!o.some((u) => typeof u === "string" ? typeof n === u : n instanceof u)) {
          let u = o.map((l) => typeof l == "string" ? l : l.name);
          throw new TypeError(`Expected '${i}' to be a type of ${u.join(" or ")}, got ${typeof n}`);
        }
      }, "checkType");
      t.exports = r;
    }
  }), G0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/initialize.js"(e, t) {
      "use strict";
      var { URL: r } = require("url"), i = l3();
      t.exports = (n, o) => {
        i("proxyOptions", o, ["object"]), i("proxyOptions.headers", o.headers, ["object", "undefined"]), i("proxyOptions.raw", o.raw, ["bool\
ean", "undefined"]), i("proxyOptions.url", o.url, [r, "string"]);
        let a = new r(o.url);
        n.proxyOptions = {
          raw: !0,
          ...o,
          headers: { ...o.headers },
          url: a
        };
      };
    }
  }), Vc = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/get-auth-headers.js"(e, t) {
      "use strict";
      t.exports = (r) => {
        let { username: i, password: n } = r.proxyOptions.url;
        if (i || n) {
          let o = `${i}:${n}`, a = `Basic ${Buffer.from(o).toString("base64")}`;
          return {
            "proxy-authorization": a,
            authorization: a
          };
        }
        return {};
      };
    }
  }), c3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/h1-over-h2.js"(e, t) {
      "use strict";
      var r = require("tls"), i = require("http"), n = require("https"), o = Z0(), { globalAgent: a } = Si(), u = z0(), l = G0(), c = Vc(), d = /* @__PURE__ */ s(
      (f, g, E) => {
        (async () => {
          try {
            let { proxyOptions: _ } = f, { url: C, headers: x, raw: w } = _, T = await a.request(C, _, {
              ...c(f),
              ...x,
              ":method": "CONNECT",
              ":authority": `${g.host}:${g.port}`
            });
            T.once("error", E), T.once("response", (S) => {
              let F = S[":status"];
              if (F !== 200) {
                E(new u(F, ""));
                return;
              }
              let I = f instanceof n.Agent;
              if (w && I) {
                g.socket = T;
                let M = r.connect(g);
                M.once("close", () => {
                  T.destroy();
                }), E(null, M);
                return;
              }
              let q = new o(T);
              q.encrypted = !1, q._handle.getpeername = (M) => {
                M.family = void 0, M.address = void 0, M.port = void 0;
              }, E(null, q);
            });
          } catch (_) {
            E(_);
          }
        })();
      }, "createConnection"), p = class extends i.Agent {
        static {
          s(this, "HttpOverHttp2");
        }
        constructor(f) {
          super(f), l(this, f.proxyOptions);
        }
        createConnection(f, g) {
          d(this, f, g);
        }
      }, h = class extends n.Agent {
        static {
          s(this, "HttpsOverHttp2");
        }
        constructor(f) {
          super(f), l(this, f.proxyOptions);
        }
        createConnection(f, g) {
          d(this, f, g);
        }
      };
      t.exports = {
        HttpOverHttp2: p,
        HttpsOverHttp2: h
      };
    }
  }), K0 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/h2-over-hx.js"(e, t) {
      "use strict";
      var { Agent: r } = Si(), i = Z0(), n = z0(), o = G0(), a = class extends r {
        static {
          s(this, "Http2OverHttpX");
        }
        constructor(u) {
          super(u), o(this, u.proxyOptions);
        }
        async createConnection(u, l) {
          let c = `${u.hostname}:${u.port || 443}`, [d, p, h] = await this._getProxyStream(c);
          if (p !== 200)
            throw new n(p, h);
          if (this.proxyOptions.raw)
            l.socket = d;
          else {
            let f = new i(d);
            return f.encrypted = !1, f._handle.getpeername = (g) => {
              g.family = void 0, g.address = void 0, g.port = void 0;
            }, f;
          }
          return super.createConnection(u, l);
        }
      };
      t.exports = a;
    }
  }), d3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/h2-over-h2.js"(e, t) {
      "use strict";
      var { globalAgent: r } = Si(), i = K0(), n = Vc(), o = /* @__PURE__ */ s((u) => new Promise((l, c) => {
        u.once("error", c), u.once("response", (d) => {
          u.off("error", c), l(d[":status"]);
        });
      }), "getStatusCode"), a = class extends i {
        static {
          s(this, "Http2OverHttp2");
        }
        async _getProxyStream(u) {
          let { proxyOptions: l } = this, c = {
            ...n(this),
            ...l.headers,
            ":method": "CONNECT",
            ":authority": u
          }, d = await r.request(l.url, l, c), p = await o(d);
          return [d, p, ""];
        }
      };
      t.exports = a;
    }
  }), f3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/proxies/h2-over-h1.js"(e, t) {
      "use strict";
      var r = require("http"), i = require("https"), n = K0(), o = Vc(), a = /* @__PURE__ */ s((l) => new Promise((c, d) => {
        let p = /* @__PURE__ */ s((h, f, g) => {
          f.unshift(g), l.off("error", d), c([f, h.statusCode, h.statusMessage]);
        }, "onConnect");
        l.once("error", d), l.once("connect", p);
      }), "getStream2"), u = class extends n {
        static {
          s(this, "Http2OverHttp");
        }
        async _getProxyStream(l) {
          let { proxyOptions: c } = this, { url: d, headers: p } = this.proxyOptions, f = (d.protocol === "https:" ? i : r).request({
            ...c,
            hostname: d.hostname,
            port: d.port,
            path: l,
            headers: {
              ...o(this),
              ...p,
              host: l
            },
            method: "CONNECT"
          }).end();
          return a(f);
        }
      };
      t.exports = {
        Http2OverHttp: u,
        Http2OverHttps: u
      };
    }
  }), h3 = Y({
    "node_modules/.pnpm/http2-wrapper@2.2.0/node_modules/http2-wrapper/source/index.js"(e, t) {
      "use strict";
      var r = require("http2"), {
        Agent: i,
        globalAgent: n
      } = Si(), o = V0(), a = W0(), u = u3(), {
        HttpOverHttp2: l,
        HttpsOverHttp2: c
      } = c3(), d = d3(), {
        Http2OverHttp: p,
        Http2OverHttps: h
      } = f3(), f = $0(), g = H0(), E = /* @__PURE__ */ s((C, x, w) => new o(C, x, w), "request"), _ = /* @__PURE__ */ s((C, x, w) => {
        let T = new o(C, x, w);
        return T.end(), T;
      }, "get");
      t.exports = {
        ...r,
        ClientRequest: o,
        IncomingMessage: a,
        Agent: i,
        globalAgent: n,
        request: E,
        get: _,
        auto: u,
        proxies: {
          HttpOverHttp2: l,
          HttpsOverHttp2: c,
          Http2OverHttp2: d,
          Http2OverHttp: p,
          Http2OverHttps: h
        },
        validateHeaderName: f,
        validateHeaderValue: g
      };
    }
  }), Y0 = {};
  G1(Y0, {
    default: /* @__PURE__ */ s(() => pk, "default")
  });
  ov.exports = K1(Y0);
  var p3 = require("http"), D3 = require("https"), J0 = [
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "BigInt64Array",
    "BigUint64Array"
  ];
  function m3(e) {
    return J0.includes(e);
  }
  s(m3, "isTypedArrayName");
  var g3 = [
    "Function",
    "Generator",
    "AsyncGenerator",
    "GeneratorFunction",
    "AsyncGeneratorFunction",
    "AsyncFunction",
    "Observable",
    "Array",
    "Buffer",
    "Blob",
    "Object",
    "RegExp",
    "Date",
    "Error",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "WeakRef",
    "ArrayBuffer",
    "SharedArrayBuffer",
    "DataView",
    "Promise",
    "URL",
    "FormData",
    "URLSearchParams",
    "HTMLElement",
    "NaN",
    ...J0
  ];
  function y3(e) {
    return g3.includes(e);
  }
  s(y3, "isObjectTypeName");
  var b3 = [
    "null",
    "undefined",
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol"
  ];
  function v3(e) {
    return b3.includes(e);
  }
  s(v3, "isPrimitiveTypeName");
  function Ti(e) {
    return (t) => typeof t === e;
  }
  s(Ti, "isOfType");
  var { toString: _3 } = Object.prototype, Hn = /* @__PURE__ */ s((e) => {
    let t = _3.call(e).slice(8, -1);
    if (/HTML\w+Element/.test(t) && D.domElement(e))
      return "HTMLElement";
    if (y3(t))
      return t;
  }, "getObjectType"), ne = /* @__PURE__ */ s((e) => (t) => Hn(t) === e, "isObjectOfType");
  function D(e) {
    if (e === null)
      return "null";
    switch (typeof e) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(e) ? "NaN" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "Function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      default:
    }
    if (D.observable(e))
      return "Observable";
    if (D.array(e))
      return "Array";
    if (D.buffer(e))
      return "Buffer";
    let t = Hn(e);
    if (t)
      return t;
    if (e instanceof String || e instanceof Boolean || e instanceof Number)
      throw new TypeError("Please don't use object wrappers for primitive types");
    return "Object";
  }
  s(D, "is");
  D.undefined = Ti("undefined");
  D.string = Ti("string");
  var w3 = Ti("number");
  D.number = (e) => w3(e) && !D.nan(e);
  D.bigint = Ti("bigint");
  D.function_ = Ti("function");
  D.null_ = (e) => e === null;
  D.class_ = (e) => D.function_(e) && e.toString().startsWith("class ");
  D.boolean = (e) => e === !0 || e === !1;
  D.symbol = Ti("symbol");
  D.numericString = (e) => D.string(e) && !D.emptyStringOrWhitespace(e) && !Number.isNaN(Number(e));
  D.array = (e, t) => Array.isArray(e) ? D.function_(t) ? e.every((r) => t(r)) : !0 : !1;
  D.buffer = (e) => {
    var t, r;
    return ((r = (t = e?.constructor) == null ? void 0 : t.isBuffer) == null ? void 0 : r.call(t, e)) ?? !1;
  };
  D.blob = (e) => ne("Blob")(e);
  D.nullOrUndefined = (e) => D.null_(e) || D.undefined(e);
  D.object = (e) => !D.null_(e) && (typeof e == "object" || D.function_(e));
  D.iterable = (e) => D.function_(e?.[Symbol.iterator]);
  D.asyncIterable = (e) => D.function_(e?.[Symbol.asyncIterator]);
  D.generator = (e) => D.iterable(e) && D.function_(e?.next) && D.function_(e?.throw);
  D.asyncGenerator = (e) => D.asyncIterable(e) && D.function_(e.next) && D.function_(e.throw);
  D.nativePromise = (e) => ne("Promise")(e);
  var E3 = /* @__PURE__ */ s((e) => D.function_(e?.then) && D.function_(e?.catch), "hasPromiseApi");
  D.promise = (e) => D.nativePromise(e) || E3(e);
  D.generatorFunction = ne("GeneratorFunction");
  D.asyncGeneratorFunction = (e) => Hn(e) === "AsyncGeneratorFunction";
  D.asyncFunction = (e) => Hn(e) === "AsyncFunction";
  D.boundFunction = (e) => D.function_(e) && !e.hasOwnProperty("prototype");
  D.regExp = ne("RegExp");
  D.date = ne("Date");
  D.error = ne("Error");
  D.map = (e) => ne("Map")(e);
  D.set = (e) => ne("Set")(e);
  D.weakMap = (e) => ne("WeakMap")(e);
  D.weakSet = (e) => ne("WeakSet")(e);
  D.weakRef = (e) => ne("WeakRef")(e);
  D.int8Array = ne("Int8Array");
  D.uint8Array = ne("Uint8Array");
  D.uint8ClampedArray = ne("Uint8ClampedArray");
  D.int16Array = ne("Int16Array");
  D.uint16Array = ne("Uint16Array");
  D.int32Array = ne("Int32Array");
  D.uint32Array = ne("Uint32Array");
  D.float32Array = ne("Float32Array");
  D.float64Array = ne("Float64Array");
  D.bigInt64Array = ne("BigInt64Array");
  D.bigUint64Array = ne("BigUint64Array");
  D.arrayBuffer = ne("ArrayBuffer");
  D.sharedArrayBuffer = ne("SharedArrayBuffer");
  D.dataView = ne("DataView");
  D.enumCase = (e, t) => Object.values(t).includes(e);
  D.directInstanceOf = (e, t) => Object.getPrototypeOf(e) === t.prototype;
  D.urlInstance = (e) => ne("URL")(e);
  D.urlString = (e) => {
    if (!D.string(e))
      return !1;
    try {
      return new URL(e), !0;
    } catch {
      return !1;
    }
  };
  D.truthy = (e) => !!e;
  D.falsy = (e) => !e;
  D.nan = (e) => Number.isNaN(e);
  D.primitive = (e) => D.null_(e) || v3(typeof e);
  D.integer = (e) => Number.isInteger(e);
  D.safeInteger = (e) => Number.isSafeInteger(e);
  D.plainObject = (e) => {
    if (typeof e != "object" || e === null)
      return !1;
    let t = Object.getPrototypeOf(e);
    return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Symbol.toStringTag in e) && !(Symbol.iterator in
    e);
  };
  D.typedArray = (e) => m3(Hn(e));
  var C3 = /* @__PURE__ */ s((e) => D.safeInteger(e) && e >= 0, "isValidLength");
  D.arrayLike = (e) => !D.nullOrUndefined(e) && !D.function_(e) && C3(e.length);
  D.inRange = (e, t) => {
    if (D.number(t))
      return e >= Math.min(0, t) && e <= Math.max(t, 0);
    if (D.array(t) && t.length === 2)
      return e >= Math.min(...t) && e <= Math.max(...t);
    throw new TypeError(`Invalid range: ${JSON.stringify(t)}`);
  };
  var x3 = 1, F3 = [
    "innerHTML",
    "ownerDocument",
    "style",
    "attributes",
    "nodeValue"
  ];
  D.domElement = (e) => D.object(e) && e.nodeType === x3 && D.string(e.nodeName) && !D.plainObject(e) && F3.every((t) => t in e);
  D.observable = (e) => {
    var t, r;
    return e ? e === ((t = e[Symbol.observable]) == null ? void 0 : t.call(e)) || e === ((r = e["@@observable"]) == null ? void 0 : r.call(e)) :
    !1;
  };
  D.nodeStream = (e) => D.object(e) && D.function_(e.pipe) && !D.observable(e);
  D.infinite = (e) => e === Number.POSITIVE_INFINITY || e === Number.NEGATIVE_INFINITY;
  var X0 = /* @__PURE__ */ s((e) => (t) => D.integer(t) && Math.abs(t % 2) === e, "isAbsoluteMod2");
  D.evenInteger = X0(0);
  D.oddInteger = X0(1);
  D.emptyArray = (e) => D.array(e) && e.length === 0;
  D.nonEmptyArray = (e) => D.array(e) && e.length > 0;
  D.emptyString = (e) => D.string(e) && e.length === 0;
  var S3 = /* @__PURE__ */ s((e) => D.string(e) && !/\S/.test(e), "isWhiteSpaceString");
  D.emptyStringOrWhitespace = (e) => D.emptyString(e) || S3(e);
  D.nonEmptyString = (e) => D.string(e) && e.length > 0;
  D.nonEmptyStringAndNotWhitespace = (e) => D.string(e) && !D.emptyStringOrWhitespace(e);
  D.emptyObject = (e) => D.object(e) && !D.map(e) && !D.set(e) && Object.keys(e).length === 0;
  D.nonEmptyObject = (e) => D.object(e) && !D.map(e) && !D.set(e) && Object.keys(e).length > 0;
  D.emptySet = (e) => D.set(e) && e.size === 0;
  D.nonEmptySet = (e) => D.set(e) && e.size > 0;
  D.emptyMap = (e) => D.map(e) && e.size === 0;
  D.nonEmptyMap = (e) => D.map(e) && e.size > 0;
  D.propertyKey = (e) => D.any([D.string, D.number, D.symbol], e);
  D.formData = (e) => ne("FormData")(e);
  D.urlSearchParams = (e) => ne("URLSearchParams")(e);
  var Q0 = /* @__PURE__ */ s((e, t, r) => {
    if (!D.function_(t))
      throw new TypeError(`Invalid predicate: ${JSON.stringify(t)}`);
    if (r.length === 0)
      throw new TypeError("Invalid number of values");
    return e.call(r, t);
  }, "predicateOnArray");
  D.any = (e, ...t) => (D.array(e) ? e : [e]).some((i) => Q0(Array.prototype.some, i, t));
  D.all = (e, ...t) => Q0(Array.prototype.every, e, t);
  var k = /* @__PURE__ */ s((e, t, r, i = {}) => {
    if (!e) {
      let { multipleValues: n } = i, o = n ? `received values of types ${[
        ...new Set(r.map((a) => `\`${D(a)}\``))
      ].join(", ")}` : `received value of type \`${D(r)}\``;
      throw new TypeError(`Expected value which is \`${t}\`, ${o}.`);
    }
  }, "assertType"), A = {
    // Unknowns.
    undefined: /* @__PURE__ */ s((e) => k(D.undefined(e), "undefined", e), "undefined"),
    string: /* @__PURE__ */ s((e) => k(D.string(e), "string", e), "string"),
    number: /* @__PURE__ */ s((e) => k(D.number(e), "number", e), "number"),
    bigint: /* @__PURE__ */ s((e) => k(D.bigint(e), "bigint", e), "bigint"),
    // eslint-disable-next-line @typescript-eslint/ban-types
    function_: /* @__PURE__ */ s((e) => k(D.function_(e), "Function", e), "function_"),
    null_: /* @__PURE__ */ s((e) => k(D.null_(e), "null", e), "null_"),
    class_: /* @__PURE__ */ s((e) => k(D.class_(e), "Class", e), "class_"),
    boolean: /* @__PURE__ */ s((e) => k(D.boolean(e), "boolean", e), "boolean"),
    symbol: /* @__PURE__ */ s((e) => k(D.symbol(e), "symbol", e), "symbol"),
    numericString: /* @__PURE__ */ s((e) => k(D.numericString(e), "string with a number", e), "numericString"),
    array: /* @__PURE__ */ s((e, t) => {
      k(D.array(e), "Array", e), t && e.forEach(t);
    }, "array"),
    buffer: /* @__PURE__ */ s((e) => k(D.buffer(e), "Buffer", e), "buffer"),
    blob: /* @__PURE__ */ s((e) => k(D.blob(e), "Blob", e), "blob"),
    nullOrUndefined: /* @__PURE__ */ s((e) => k(D.nullOrUndefined(e), "null or undefined", e), "nullOrUndefined"),
    object: /* @__PURE__ */ s((e) => k(D.object(e), "Object", e), "object"),
    iterable: /* @__PURE__ */ s((e) => k(D.iterable(e), "Iterable", e), "iterable"),
    asyncIterable: /* @__PURE__ */ s((e) => k(D.asyncIterable(e), "AsyncIterable", e), "asyncIterable"),
    generator: /* @__PURE__ */ s((e) => k(D.generator(e), "Generator", e), "generator"),
    asyncGenerator: /* @__PURE__ */ s((e) => k(D.asyncGenerator(e), "AsyncGenerator", e), "asyncGenerator"),
    nativePromise: /* @__PURE__ */ s((e) => k(D.nativePromise(e), "native Promise", e), "nativePromise"),
    promise: /* @__PURE__ */ s((e) => k(D.promise(e), "Promise", e), "promise"),
    generatorFunction: /* @__PURE__ */ s((e) => k(D.generatorFunction(e), "GeneratorFunction", e), "generatorFunction"),
    asyncGeneratorFunction: /* @__PURE__ */ s((e) => k(D.asyncGeneratorFunction(e), "AsyncGeneratorFunction", e), "asyncGeneratorFunction"),
    // eslint-disable-next-line @typescript-eslint/ban-types
    asyncFunction: /* @__PURE__ */ s((e) => k(D.asyncFunction(e), "AsyncFunction", e), "asyncFunction"),
    // eslint-disable-next-line @typescript-eslint/ban-types
    boundFunction: /* @__PURE__ */ s((e) => k(D.boundFunction(e), "Function", e), "boundFunction"),
    regExp: /* @__PURE__ */ s((e) => k(D.regExp(e), "RegExp", e), "regExp"),
    date: /* @__PURE__ */ s((e) => k(D.date(e), "Date", e), "date"),
    error: /* @__PURE__ */ s((e) => k(D.error(e), "Error", e), "error"),
    map: /* @__PURE__ */ s((e) => k(D.map(e), "Map", e), "map"),
    set: /* @__PURE__ */ s((e) => k(D.set(e), "Set", e), "set"),
    weakMap: /* @__PURE__ */ s((e) => k(D.weakMap(e), "WeakMap", e), "weakMap"),
    weakSet: /* @__PURE__ */ s((e) => k(D.weakSet(e), "WeakSet", e), "weakSet"),
    weakRef: /* @__PURE__ */ s((e) => k(D.weakRef(e), "WeakRef", e), "weakRef"),
    int8Array: /* @__PURE__ */ s((e) => k(D.int8Array(e), "Int8Array", e), "int8Array"),
    uint8Array: /* @__PURE__ */ s((e) => k(D.uint8Array(e), "Uint8Array", e), "uint8Array"),
    uint8ClampedArray: /* @__PURE__ */ s((e) => k(D.uint8ClampedArray(e), "Uint8ClampedArray", e), "uint8ClampedArray"),
    int16Array: /* @__PURE__ */ s((e) => k(D.int16Array(e), "Int16Array", e), "int16Array"),
    uint16Array: /* @__PURE__ */ s((e) => k(D.uint16Array(e), "Uint16Array", e), "uint16Array"),
    int32Array: /* @__PURE__ */ s((e) => k(D.int32Array(e), "Int32Array", e), "int32Array"),
    uint32Array: /* @__PURE__ */ s((e) => k(D.uint32Array(e), "Uint32Array", e), "uint32Array"),
    float32Array: /* @__PURE__ */ s((e) => k(D.float32Array(e), "Float32Array", e), "float32Array"),
    float64Array: /* @__PURE__ */ s((e) => k(D.float64Array(e), "Float64Array", e), "float64Array"),
    bigInt64Array: /* @__PURE__ */ s((e) => k(D.bigInt64Array(e), "BigInt64Array", e), "bigInt64Array"),
    bigUint64Array: /* @__PURE__ */ s((e) => k(D.bigUint64Array(e), "BigUint64Array", e), "bigUint64Array"),
    arrayBuffer: /* @__PURE__ */ s((e) => k(D.arrayBuffer(e), "ArrayBuffer", e), "arrayBuffer"),
    sharedArrayBuffer: /* @__PURE__ */ s((e) => k(D.sharedArrayBuffer(e), "SharedArrayBuffer", e), "sharedArrayBuffer"),
    dataView: /* @__PURE__ */ s((e) => k(D.dataView(e), "DataView", e), "dataView"),
    enumCase: /* @__PURE__ */ s((e, t) => k(D.enumCase(e, t), "EnumCase", e), "enumCase"),
    urlInstance: /* @__PURE__ */ s((e) => k(D.urlInstance(e), "URL", e), "urlInstance"),
    urlString: /* @__PURE__ */ s((e) => k(D.urlString(e), "string with a URL", e), "urlString"),
    truthy: /* @__PURE__ */ s((e) => k(D.truthy(e), "truthy", e), "truthy"),
    falsy: /* @__PURE__ */ s((e) => k(D.falsy(e), "falsy", e), "falsy"),
    nan: /* @__PURE__ */ s((e) => k(D.nan(e), "NaN", e), "nan"),
    primitive: /* @__PURE__ */ s((e) => k(D.primitive(e), "primitive", e), "primitive"),
    integer: /* @__PURE__ */ s((e) => k(D.integer(e), "integer", e), "integer"),
    safeInteger: /* @__PURE__ */ s((e) => k(D.safeInteger(e), "integer", e), "safeInteger"),
    plainObject: /* @__PURE__ */ s((e) => k(D.plainObject(e), "plain object", e), "plainObject"),
    typedArray: /* @__PURE__ */ s((e) => k(D.typedArray(e), "TypedArray", e), "typedArray"),
    arrayLike: /* @__PURE__ */ s((e) => k(D.arrayLike(e), "array-like", e), "arrayLike"),
    domElement: /* @__PURE__ */ s((e) => k(D.domElement(e), "HTMLElement", e), "domElement"),
    observable: /* @__PURE__ */ s((e) => k(D.observable(e), "Observable", e), "observable"),
    nodeStream: /* @__PURE__ */ s((e) => k(D.nodeStream(e), "Node.js Stream", e), "nodeStream"),
    infinite: /* @__PURE__ */ s((e) => k(D.infinite(e), "infinite number", e), "infinite"),
    emptyArray: /* @__PURE__ */ s((e) => k(D.emptyArray(e), "empty array", e), "emptyArray"),
    nonEmptyArray: /* @__PURE__ */ s((e) => k(D.nonEmptyArray(e), "non-empty array", e), "nonEmptyArray"),
    emptyString: /* @__PURE__ */ s((e) => k(D.emptyString(e), "empty string", e), "emptyString"),
    emptyStringOrWhitespace: /* @__PURE__ */ s((e) => k(D.emptyStringOrWhitespace(e), "empty string or whitespace", e), "emptyStringOrWhites\
pace"),
    nonEmptyString: /* @__PURE__ */ s((e) => k(D.nonEmptyString(e), "non-empty string", e), "nonEmptyString"),
    nonEmptyStringAndNotWhitespace: /* @__PURE__ */ s((e) => k(D.nonEmptyStringAndNotWhitespace(e), "non-empty string and not whitespace", e),
    "nonEmptyStringAndNotWhitespace"),
    emptyObject: /* @__PURE__ */ s((e) => k(D.emptyObject(e), "empty object", e), "emptyObject"),
    nonEmptyObject: /* @__PURE__ */ s((e) => k(D.nonEmptyObject(e), "non-empty object", e), "nonEmptyObject"),
    emptySet: /* @__PURE__ */ s((e) => k(D.emptySet(e), "empty set", e), "emptySet"),
    nonEmptySet: /* @__PURE__ */ s((e) => k(D.nonEmptySet(e), "non-empty set", e), "nonEmptySet"),
    emptyMap: /* @__PURE__ */ s((e) => k(D.emptyMap(e), "empty map", e), "emptyMap"),
    nonEmptyMap: /* @__PURE__ */ s((e) => k(D.nonEmptyMap(e), "non-empty map", e), "nonEmptyMap"),
    propertyKey: /* @__PURE__ */ s((e) => k(D.propertyKey(e), "PropertyKey", e), "propertyKey"),
    formData: /* @__PURE__ */ s((e) => k(D.formData(e), "FormData", e), "formData"),
    urlSearchParams: /* @__PURE__ */ s((e) => k(D.urlSearchParams(e), "URLSearchParams", e), "urlSearchParams"),
    // Numbers.
    evenInteger: /* @__PURE__ */ s((e) => k(D.evenInteger(e), "even integer", e), "evenInteger"),
    oddInteger: /* @__PURE__ */ s((e) => k(D.oddInteger(e), "odd integer", e), "oddInteger"),
    // Two arguments.
    directInstanceOf: /* @__PURE__ */ s((e, t) => k(D.directInstanceOf(e, t), "T", e), "directInstanceOf"),
    inRange: /* @__PURE__ */ s((e, t) => k(D.inRange(e, t), "in range", e), "inRange"),
    // Variadic functions.
    any: /* @__PURE__ */ s((e, ...t) => k(D.any(e, ...t), "predicate returns truthy for any value", t, { multipleValues: !0 }), "any"),
    all: /* @__PURE__ */ s((e, ...t) => k(D.all(e, ...t), "predicate returns truthy for all values", t, { multipleValues: !0 }), "all")
  };
  Object.defineProperties(D, {
    class: {
      value: D.class_
    },
    function: {
      value: D.function_
    },
    null: {
      value: D.null_
    }
  });
  Object.defineProperties(A, {
    class: {
      value: A.class_
    },
    function: {
      value: A.function_
    },
    null: {
      value: A.null_
    }
  });
  var m = D, T3 = require("events"), A3 = class extends Error {
    static {
      s(this, "CancelError");
    }
    constructor(e) {
      super(e || "Promise was canceled"), this.name = "CancelError";
    }
    get isCanceled() {
      return !0;
    }
  }, Zc = class {
    static {
      s(this, "PCancelable");
    }
    static fn(e) {
      return (...t) => new Zc((r, i, n) => {
        t.push(n), e(...t).then(r, i);
      });
    }
    constructor(e) {
      this._cancelHandlers = [], this._isPending = !0, this._isCanceled = !1, this._rejectOnCancel = !0, this._promise = new Promise((t, r) => {
        this._reject = r;
        let i = /* @__PURE__ */ s((a) => {
          (!this._isCanceled || !o.shouldReject) && (this._isPending = !1, t(a));
        }, "onResolve"), n = /* @__PURE__ */ s((a) => {
          this._isPending = !1, r(a);
        }, "onReject"), o = /* @__PURE__ */ s((a) => {
          if (!this._isPending)
            throw new Error("The `onCancel` handler was attached after the promise settled.");
          this._cancelHandlers.push(a);
        }, "onCancel");
        Object.defineProperties(o, {
          shouldReject: {
            get: /* @__PURE__ */ s(() => this._rejectOnCancel, "get"),
            set: /* @__PURE__ */ s((a) => {
              this._rejectOnCancel = a;
            }, "set")
          }
        }), e(i, n, o);
      });
    }
    then(e, t) {
      return this._promise.then(e, t);
    }
    catch(e) {
      return this._promise.catch(e);
    }
    finally(e) {
      return this._promise.finally(e);
    }
    cancel(e) {
      if (!(!this._isPending || this._isCanceled)) {
        if (this._isCanceled = !0, this._cancelHandlers.length > 0)
          try {
            for (let t of this._cancelHandlers)
              t();
          } catch (t) {
            this._reject(t);
            return;
          }
        this._rejectOnCancel && this._reject(new A3(e));
      }
    }
    get isCanceled() {
      return this._isCanceled;
    }
  };
  Object.setPrototypeOf(Zc.prototype, Promise.prototype);
  function R3(e) {
    return m.object(e) && "_onResponse" in e;
  }
  s(R3, "isRequest");
  var Te = class extends Error {
    static {
      s(this, "RequestError");
    }
    constructor(e, t, r) {
      var i;
      if (super(e), Object.defineProperty(this, "input", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "code", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "stack", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "response", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "request", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "timings", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Error.captureStackTrace(this, this.constructor), this.name = "RequestError", this.code = t.code ?? "ERR_GOT_REQUEST_ERROR", this.input =
      t.input, R3(r) ? (Object.defineProperty(this, "request", {
        enumerable: !1,
        value: r
      }), Object.defineProperty(this, "response", {
        enumerable: !1,
        value: r.response
      }), this.options = r.options) : this.options = r, this.timings = (i = this.request) == null ? void 0 : i.timings, m.string(t.stack) &&
      m.string(this.stack)) {
        let n = this.stack.indexOf(this.message) + this.message.length, o = this.stack.slice(n).split(`
`).reverse(), a = t.stack.slice(t.stack.indexOf(t.message) + t.message.length).split(`
`).reverse();
        for (; a.length > 0 && a[0] === o[0]; )
          o.shift();
        this.stack = `${this.stack.slice(0, n)}${o.reverse().join(`
`)}${a.reverse().join(`
`)}`;
      }
    }
  }, k3 = class extends Te {
    static {
      s(this, "MaxRedirectsError");
    }
    constructor(e) {
      super(`Redirected ${e.options.maxRedirects} times. Aborting.`, {}, e), this.name = "MaxRedirectsError", this.code = "ERR_TOO_MANY_REDI\
RECTS";
    }
  }, Ko = class extends Te {
    static {
      s(this, "HTTPError");
    }
    constructor(e) {
      super(`Response code ${e.statusCode} (${e.statusMessage})`, {}, e.request), this.name = "HTTPError", this.code = "ERR_NON_2XX_3XX_RESP\
ONSE";
    }
  }, O3 = class extends Te {
    static {
      s(this, "CacheError");
    }
    constructor(e, t) {
      super(e.message, e, t), this.name = "CacheError", this.code = this.code === "ERR_GOT_REQUEST_ERROR" ? "ERR_CACHE_ACCESS" : this.code;
    }
  }, h0 = class extends Te {
    static {
      s(this, "UploadError");
    }
    constructor(e, t) {
      super(e.message, e, t), this.name = "UploadError", this.code = this.code === "ERR_GOT_REQUEST_ERROR" ? "ERR_UPLOAD" : this.code;
    }
  }, B3 = class extends Te {
    static {
      s(this, "TimeoutError");
    }
    constructor(e, t, r) {
      super(e.message, e, r), Object.defineProperty(this, "timings", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "event", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), this.name = "TimeoutError", this.event = e.event, this.timings = t;
    }
  }, p0 = class extends Te {
    static {
      s(this, "ReadError");
    }
    constructor(e, t) {
      super(e.message, e, t), this.name = "ReadError", this.code = this.code === "ERR_GOT_REQUEST_ERROR" ? "ERR_READING_RESPONSE_STREAM" : this.
      code;
    }
  }, P3 = class extends Te {
    static {
      s(this, "RetryError");
    }
    constructor(e) {
      super("Retrying", {}, e), this.name = "RetryError", this.code = "ERR_RETRYING";
    }
  }, I3 = class extends Te {
    static {
      s(this, "AbortError");
    }
    constructor(e) {
      super("This operation was aborted.", {}, e), this.code = "ERR_ABORTED", this.name = "AbortError";
    }
  }, ev = Fe(require("process"), 1), Pc = require("buffer"), M3 = require("stream"), D0 = require("url"), Ic = Fe(require("http"), 1), j3 = require("events"),
  q3 = require("util"), L3 = Fe(Y1(), 1), N3 = /* @__PURE__ */ s((e) => {
    if (e.timings)
      return e.timings;
    let t = {
      start: Date.now(),
      socket: void 0,
      lookup: void 0,
      connect: void 0,
      secureConnect: void 0,
      upload: void 0,
      response: void 0,
      end: void 0,
      error: void 0,
      abort: void 0,
      phases: {
        wait: void 0,
        dns: void 0,
        tcp: void 0,
        tls: void 0,
        request: void 0,
        firstByte: void 0,
        download: void 0,
        total: void 0
      }
    };
    e.timings = t;
    let r = /* @__PURE__ */ s((a) => {
      a.once(j3.errorMonitor, () => {
        t.error = Date.now(), t.phases.total = t.error - t.start;
      });
    }, "handleError");
    r(e);
    let i = /* @__PURE__ */ s(() => {
      t.abort = Date.now(), t.phases.total = t.abort - t.start;
    }, "onAbort");
    e.prependOnceListener("abort", i);
    let n = /* @__PURE__ */ s((a) => {
      if (t.socket = Date.now(), t.phases.wait = t.socket - t.start, q3.types.isProxy(a))
        return;
      let u = /* @__PURE__ */ s(() => {
        t.lookup = Date.now(), t.phases.dns = t.lookup - t.socket;
      }, "lookupListener");
      a.prependOnceListener("lookup", u), (0, L3.default)(a, {
        connect: /* @__PURE__ */ s(() => {
          t.connect = Date.now(), t.lookup === void 0 && (a.removeListener("lookup", u), t.lookup = t.connect, t.phases.dns = t.lookup - t.socket),
          t.phases.tcp = t.connect - t.lookup;
        }, "connect"),
        secureConnect: /* @__PURE__ */ s(() => {
          t.secureConnect = Date.now(), t.phases.tls = t.secureConnect - t.connect;
        }, "secureConnect")
      });
    }, "onSocket");
    e.socket ? n(e.socket) : e.prependOnceListener("socket", n);
    let o = /* @__PURE__ */ s(() => {
      t.upload = Date.now(), t.phases.request = t.upload - (t.secureConnect ?? t.connect);
    }, "onUpload");
    return e.writableFinished ? o() : e.prependOnceListener("finish", o), e.prependOnceListener("response", (a) => {
      t.response = Date.now(), t.phases.firstByte = t.response - t.upload, a.timings = t, r(a), a.prependOnceListener("end", () => {
        e.off("abort", i), a.off("aborted", i), !t.phases.total && (t.end = Date.now(), t.phases.download = t.end - t.response, t.phases.total =
        t.end - t.start);
      }), a.prependOnceListener("aborted", i);
    }), t;
  }, "timer"), U3 = N3, W3 = Fe(require("events"), 1), Uo = Fe(require("url"), 1), $3 = Fe(require("crypto"), 1), tv = Fe(require("stream"),
  1), H3 = "text/plain", V3 = "us-ascii", Mc = /* @__PURE__ */ s((e, t) => t.some((r) => r instanceof RegExp ? r.test(e) : r === e), "testPa\
rameter"), Z3 = /* @__PURE__ */ new Set([
    "https:",
    "http:",
    "file:"
  ]), z3 = /* @__PURE__ */ s((e) => {
    try {
      let { protocol: t } = new URL(e);
      return t.endsWith(":") && !Z3.has(t);
    } catch {
      return !1;
    }
  }, "hasCustomProtocol"), G3 = /* @__PURE__ */ s((e, { stripHash: t }) => {
    var r;
    let i = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/.exec(e);
    if (!i)
      throw new Error(`Invalid URL: ${e}`);
    let { type: n, data: o, hash: a } = i.groups, u = n.split(";");
    a = t ? "" : a;
    let l = !1;
    u[u.length - 1] === "base64" && (u.pop(), l = !0);
    let c = ((r = u.shift()) == null ? void 0 : r.toLowerCase()) ?? "", p = [
      ...u.map((h) => {
        let [f, g = ""] = h.split("=").map((E) => E.trim());
        return f === "charset" && (g = g.toLowerCase(), g === V3) ? "" : `${f}${g ? `=${g}` : ""}`;
      }).filter(Boolean)
    ];
    return l && p.push("base64"), (p.length > 0 || c && c !== H3) && p.unshift(c), `data:${p.join(";")},${l ? o.trim() : o}${a ? `#${a}` : ""}`;
  }, "normalizeDataURL");
  function K3(e, t) {
    if (t = {
      defaultProtocol: "http",
      normalizeProtocol: !0,
      forceHttp: !1,
      forceHttps: !1,
      stripAuthentication: !0,
      stripHash: !1,
      stripTextFragment: !0,
      stripWWW: !0,
      removeQueryParameters: [/^utm_\w+/i],
      removeTrailingSlash: !0,
      removeSingleSlash: !0,
      removeDirectoryIndex: !1,
      removeExplicitPort: !1,
      sortQueryParameters: !0,
      ...t
    }, typeof t.defaultProtocol == "string" && !t.defaultProtocol.endsWith(":") && (t.defaultProtocol = `${t.defaultProtocol}:`), e = e.trim(),
    /^data:/i.test(e))
      return G3(e, t);
    if (z3(e))
      return e;
    let r = e.startsWith("//");
    !r && /^\.*\//.test(e) || (e = e.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, t.defaultProtocol));
    let n = new URL(e);
    if (t.forceHttp && t.forceHttps)
      throw new Error("The `forceHttp` and `forceHttps` options cannot be used together");
    if (t.forceHttp && n.protocol === "https:" && (n.protocol = "http:"), t.forceHttps && n.protocol === "http:" && (n.protocol = "https:"),
    t.stripAuthentication && (n.username = "", n.password = ""), t.stripHash ? n.hash = "" : t.stripTextFragment && (n.hash = n.hash.replace(
    /#?:~:text.*?$/i, "")), n.pathname) {
      let a = /\b[a-z][a-z\d+\-.]{1,50}:\/\//g, u = 0, l = "";
      for (; ; ) {
        let d = a.exec(n.pathname);
        if (!d)
          break;
        let p = d[0], h = d.index, f = n.pathname.slice(u, h);
        l += f.replace(/\/{2,}/g, "/"), l += p, u = h + p.length;
      }
      let c = n.pathname.slice(u, n.pathname.length);
      l += c.replace(/\/{2,}/g, "/"), n.pathname = l;
    }
    if (n.pathname)
      try {
        n.pathname = decodeURI(n.pathname);
      } catch {
      }
    if (t.removeDirectoryIndex === !0 && (t.removeDirectoryIndex = [/^index\.[a-z]+$/]), Array.isArray(t.removeDirectoryIndex) && t.removeDirectoryIndex.
    length > 0) {
      let a = n.pathname.split("/"), u = a[a.length - 1];
      Mc(u, t.removeDirectoryIndex) && (a = a.slice(0, -1), n.pathname = a.slice(1).join("/") + "/");
    }
    if (n.hostname && (n.hostname = n.hostname.replace(/\.$/, ""), t.stripWWW && /^www\.(?!www\.)[a-z\-\d]{1,63}\.[a-z.\-\d]{2,63}$/.test(n.
    hostname) && (n.hostname = n.hostname.replace(/^www\./, ""))), Array.isArray(t.removeQueryParameters))
      for (let a of [...n.searchParams.keys()])
        Mc(a, t.removeQueryParameters) && n.searchParams.delete(a);
    if (!Array.isArray(t.keepQueryParameters) && t.removeQueryParameters === !0 && (n.search = ""), Array.isArray(t.keepQueryParameters) && t.
    keepQueryParameters.length > 0)
      for (let a of [...n.searchParams.keys()])
        Mc(a, t.keepQueryParameters) || n.searchParams.delete(a);
    if (t.sortQueryParameters) {
      n.searchParams.sort();
      try {
        n.search = decodeURIComponent(n.search);
      } catch {
      }
    }
    t.removeTrailingSlash && (n.pathname = n.pathname.replace(/\/$/, "")), t.removeExplicitPort && n.port && (n.port = "");
    let o = e;
    return e = n.toString(), !t.removeSingleSlash && n.pathname === "/" && !o.endsWith("/") && n.hash === "" && (e = e.replace(/\/$/, "")), (t.
    removeTrailingSlash || n.pathname === "/") && n.hash === "" && t.removeSingleSlash && (e = e.replace(/\/$/, "")), r && !t.normalizeProtocol &&
    (e = e.replace(/^http:\/\//, "//")), t.stripProtocol && (e = e.replace(/^(?:https?:)?\/\//, "")), e;
  }
  s(K3, "normalizeUrl");
  var Y3 = Fe(L0(), 1), jc = Fe(X1(), 1), J3 = require("stream");
  function Hc(e) {
    return Object.fromEntries(Object.entries(e).map(([t, r]) => [t.toLowerCase(), r]));
  }
  s(Hc, "lowercaseKeys");
  var m0 = class extends J3.Readable {
    static {
      s(this, "Response");
    }
    statusCode;
    headers;
    body;
    url;
    constructor({ statusCode: e, headers: t, body: r, url: i }) {
      if (typeof e != "number")
        throw new TypeError("Argument `statusCode` should be a number");
      if (typeof t != "object")
        throw new TypeError("Argument `headers` should be an object");
      if (!(r instanceof Uint8Array))
        throw new TypeError("Argument `body` should be a buffer");
      if (typeof i != "string")
        throw new TypeError("Argument `url` should be a string");
      super({
        read() {
          this.push(r), this.push(null);
        }
      }), this.statusCode = e, this.headers = Hc(t), this.body = r, this.url = i;
    }
  }, Wo = Fe(e3(), 1), X3 = [
    "aborted",
    "complete",
    "headers",
    "httpVersion",
    "httpVersionMinor",
    "httpVersionMajor",
    "method",
    "rawHeaders",
    "rawTrailers",
    "setTimeout",
    "socket",
    "statusCode",
    "statusMessage",
    "trailers",
    "url"
  ];
  function Q3(e, t) {
    if (t._readableState.autoDestroy)
      throw new Error("The second stream must have the `autoDestroy` option set to `false`");
    let r = /* @__PURE__ */ new Set([...Object.keys(e), ...X3]), i = {};
    for (let n of r)
      n in t || (i[n] = {
        get() {
          let o = e[n];
          return typeof o == "function" ? o.bind(e) : o;
        },
        set(o) {
          e[n] = o;
        },
        enumerable: !0,
        configurable: !1
      });
    return Object.defineProperties(t, i), e.once("aborted", () => {
      t.destroy(), t.emit("aborted");
    }), e.once("close", () => {
      e.complete && t.readable ? t.once("end", () => {
        t.emit("close");
      }) : t.emit("close");
    }), t;
  }
  s(Q3, "mimicResponse");
  var eR = class extends Error {
    static {
      s(this, "RequestError2");
    }
    constructor(e) {
      super(e.message), Object.assign(this, e);
    }
  }, $n = class extends Error {
    static {
      s(this, "CacheError2");
    }
    constructor(e) {
      super(e.message), Object.assign(this, e);
    }
  }, tR = class {
    static {
      s(this, "CacheableRequest");
    }
    constructor(e, t) {
      this.hooks = /* @__PURE__ */ new Map(), this.request = () => (r, i) => {
        let n;
        if (typeof r == "string")
          n = qc(Uo.default.parse(r)), r = {};
        else if (r instanceof Uo.default.URL)
          n = qc(Uo.default.parse(r.toString())), r = {};
        else {
          let [p, ...h] = (r.path ?? "").split("?"), f = h.length > 0 ? `?${h.join("?")}` : "";
          n = qc({ ...r, pathname: p, search: f });
        }
        r = {
          headers: {},
          method: "GET",
          cache: !0,
          strictTtl: !1,
          automaticFailover: !1,
          ...r,
          ...nR(n)
        }, r.headers = Object.fromEntries(rR(r.headers).map(([p, h]) => [p.toLowerCase(), h]));
        let o = new W3.default(), a = K3(Uo.default.format(n), {
          stripWWW: !1,
          removeTrailingSlash: !1,
          stripAuthentication: !1
        }), u = `${r.method}:${a}`;
        r.body && r.method !== void 0 && ["POST", "PATCH", "PUT"].includes(r.method) && (r.body instanceof tv.default.Readable ? r.cache = !1 :
        u += `:${$3.default.createHash("md5").update(r.body).digest("hex")}`);
        let l = !1, c = !1, d = /* @__PURE__ */ s((p) => {
          c = !0;
          let h = !1, f = /* @__PURE__ */ s(() => {
          }, "requestErrorCallback"), g = new Promise((_) => {
            f = /* @__PURE__ */ s(() => {
              h || (h = !0, _());
            }, "requestErrorCallback");
          }), E = /* @__PURE__ */ s(async (_) => {
            if (l) {
              _.status = _.statusCode;
              let x = jc.default.fromObject(l.cachePolicy).revalidatedPolicy(p, _);
              if (!x.modified) {
                _.resume(), await new Promise((T) => {
                  _.once("end", T);
                });
                let w = g0(x.policy.responseHeaders());
                _ = new m0({ statusCode: l.statusCode, headers: w, body: l.body, url: l.url }), _.cachePolicy = x.policy, _.fromCache = !0;
              }
            }
            _.fromCache || (_.cachePolicy = new jc.default(p, _, p), _.fromCache = !1);
            let C;
            p.cache && _.cachePolicy.storable() ? (C = iR(_), (async () => {
              try {
                let x = Y3.default.buffer(_);
                await Promise.race([
                  g,
                  new Promise((F) => _.once("end", F)),
                  new Promise((F) => _.once("close", F))
                  // eslint-disable-line no-promise-executor-return
                ]);
                let w = await x, T = {
                  url: _.url,
                  statusCode: _.fromCache ? l.statusCode : _.statusCode,
                  body: w,
                  cachePolicy: _.cachePolicy.toObject()
                }, S = p.strictTtl ? _.cachePolicy.timeToLive() : void 0;
                if (p.maxTtl && (S = S ? Math.min(S, p.maxTtl) : p.maxTtl), this.hooks.size > 0)
                  for (let F of this.hooks.keys())
                    T = await this.runHook(F, T, _);
                await this.cache.set(u, T, S);
              } catch (x) {
                o.emit("error", new $n(x));
              }
            })()) : p.cache && l && (async () => {
              try {
                await this.cache.delete(u);
              } catch (x) {
                o.emit("error", new $n(x));
              }
            })(), o.emit("response", C ?? _), typeof i == "function" && i(C ?? _);
          }, "handler");
          try {
            let _ = this.cacheRequest(p, E);
            _.once("error", f), _.once("abort", f), _.once("destroy", f), o.emit("request", _);
          } catch (_) {
            o.emit("error", new eR(_));
          }
        }, "makeRequest");
        return (async () => {
          let p = /* @__PURE__ */ s(async (f) => {
            await Promise.resolve();
            let g = f.cache ? await this.cache.get(u) : void 0;
            if (typeof g > "u" && !f.forceRefresh) {
              d(f);
              return;
            }
            let E = jc.default.fromObject(g.cachePolicy);
            if (E.satisfiesWithoutRevalidation(f) && !f.forceRefresh) {
              let _ = g0(E.responseHeaders()), C = new m0({ statusCode: g.statusCode, headers: _, body: g.body, url: g.url });
              C.cachePolicy = E, C.fromCache = !0, o.emit("response", C), typeof i == "function" && i(C);
            } else E.satisfiesWithoutRevalidation(f) && Date.now() >= E.timeToLive() && f.forceRefresh ? (await this.cache.delete(u), f.headers =
            E.revalidationHeaders(f), d(f)) : (l = g, f.headers = E.revalidationHeaders(f), d(f));
          }, "get"), h = /* @__PURE__ */ s((f) => o.emit("error", new $n(f)), "errorHandler");
          if (this.cache instanceof Wo.default) {
            let f = this.cache;
            f.once("error", h), o.on("error", () => f.removeListener("error", h)), o.on("response", () => f.removeListener("error", h));
          }
          try {
            await p(r);
          } catch (f) {
            r.automaticFailover && !c && d(r), o.emit("error", new $n(f));
          }
        })(), o;
      }, this.addHook = (r, i) => {
        this.hooks.has(r) || this.hooks.set(r, i);
      }, this.removeHook = (r) => this.hooks.delete(r), this.getHook = (r) => this.hooks.get(r), this.runHook = async (r, ...i) => {
        var n;
        return (n = this.hooks.get(r)) == null ? void 0 : n(...i);
      }, t instanceof Wo.default ? this.cache = t : typeof t == "string" ? this.cache = new Wo.default({
        uri: t,
        namespace: "cacheable-request"
      }) : this.cache = new Wo.default({
        store: t,
        namespace: "cacheable-request"
      }), this.request = this.request.bind(this), this.cacheRequest = e;
    }
  }, rR = Object.entries, iR = /* @__PURE__ */ s((e) => {
    let t = new tv.PassThrough({ autoDestroy: !1 });
    return Q3(e, t), e.pipe(t);
  }, "cloneResponse"), nR = /* @__PURE__ */ s((e) => {
    let t = { ...e };
    return t.path = `${e.pathname || "/"}${e.search || ""}`, delete t.pathname, delete t.search, t;
  }, "urlObjectToRequestOptions"), qc = /* @__PURE__ */ s((e) => (
    // If url was parsed by url.parse or new URL:
    // - hostname will be set
    // - host will be hostname[:port]
    // - port will be set if it was explicit in the parsed string
    // Otherwise, url was from request options:
    // - hostname or host may be set
    // - host shall not have port encoded
    {
      protocol: e.protocol,
      auth: e.auth,
      hostname: e.hostname || e.host || "localhost",
      port: e.port,
      pathname: e.pathname,
      search: e.search
    }
  ), "normalizeUrlObject"), g0 = /* @__PURE__ */ s((e) => {
    let t = [];
    for (let r of Object.keys(e))
      t[r.toLowerCase()] = e[r];
    return t;
  }, "convertHeaders"), sR = tR, oR = Fe(r3(), 1), aR = Fe(L0(), 1), Nt = /* @__PURE__ */ s((e) => typeof e == "function", "isFunction"), uR = /* @__PURE__ */ s(
  (e) => Nt(e[Symbol.asyncIterator]), "isAsyncIterable");
  async function* lR(e) {
    let t = e.getReader();
    for (; ; ) {
      let { done: r, value: i } = await t.read();
      if (r)
        break;
      yield i;
    }
  }
  s(lR, "readStream");
  var cR = /* @__PURE__ */ s((e) => {
    if (uR(e))
      return e;
    if (Nt(e.getReader))
      return lR(e);
    throw new TypeError("Unsupported data source: Expected either ReadableStream or async iterable.");
  }, "getStreamIterator"), y0 = "abcdefghijklmnopqrstuvwxyz0123456789";
  function dR() {
    let e = 16, t = "";
    for (; e--; )
      t += y0[Math.random() * y0.length << 0];
    return t;
  }
  s(dR, "createBoundary");
  var b0 = /* @__PURE__ */ s((e) => String(e).replace(/\r|\n/g, (t, r, i) => t === "\r" && i[r + 1] !== `
` || t === `
` && i[r - 1] !== "\r" ? `\r
` : t), "normalizeValue"), fR = /* @__PURE__ */ s((e) => Object.prototype.toString.call(e).slice(8, -1).toLowerCase(), "getType");
  function v0(e) {
    if (fR(e) !== "object")
      return !1;
    let t = Object.getPrototypeOf(e);
    return t == null ? !0 : (t.constructor && t.constructor.toString()) === Object.toString();
  }
  s(v0, "isPlainObject");
  function _0(e, t) {
    if (typeof t == "string") {
      for (let [r, i] of Object.entries(e))
        if (t.toLowerCase() === r.toLowerCase())
          return i;
    }
  }
  s(_0, "getProperty");
  var hR = /* @__PURE__ */ s((e) => new Proxy(e, {
    get: /* @__PURE__ */ s((t, r) => _0(t, r), "get"),
    has: /* @__PURE__ */ s((t, r) => _0(t, r) !== void 0, "has")
  }), "proxyHeaders"), zc = /* @__PURE__ */ s((e) => !!(e && Nt(e.constructor) && e[Symbol.toStringTag] === "FormData" && Nt(e.append) && Nt(
  e.getAll) && Nt(e.entries) && Nt(e[Symbol.iterator])), "isFormData"), w0 = /* @__PURE__ */ s((e) => String(e).replace(/\r/g, "%0D").replace(
  /\n/g, "%0A").replace(/"/g, "%22"), "escapeName"), Cr = /* @__PURE__ */ s((e) => !!(e && typeof e == "object" && Nt(e.constructor) && e[Symbol.
  toStringTag] === "File" && Nt(e.stream) && e.name != null), "isFile"), jn = /* @__PURE__ */ s(function(e, t, r, i, n) {
    if (i === "m")
      throw new TypeError("Private method is not writable");
    if (i === "a" && !n)
      throw new TypeError("Private accessor was defined without a setter");
    if (typeof t == "function" ? e !== t || !n : !t.has(e))
      throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return i === "a" ? n.call(e, r) : n ? n.value = r : t.set(e, r), r;
  }, "__classPrivateFieldSet"), he = /* @__PURE__ */ s(function(e, t, r, i) {
    if (r === "a" && !i)
      throw new TypeError("Private accessor was defined without a getter");
    if (typeof t == "function" ? e !== t || !i : !t.has(e))
      throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return r === "m" ? i : r === "a" ? i.call(e) : i ? i.value : t.get(e);
  }, "__classPrivateFieldGet"), qn, ir, Ln, $o, Nn, xr, Un, Wn, Ho, Lc, E0, pR = {
    enableAdditionalHeaders: !1
  }, Vo = { writable: !1, configurable: !1 }, DR = class {
    static {
      s(this, "FormDataEncoder");
    }
    constructor(e, t, r) {
      if (qn.add(this), ir.set(this, `\r
`), Ln.set(this, void 0), $o.set(this, void 0), Nn.set(this, "-".repeat(2)), xr.set(this, new TextEncoder()), Un.set(this, void 0), Wn.set(this,
      void 0), Ho.set(this, void 0), !zc(e))
        throw new TypeError("Expected first argument to be a FormData instance.");
      let i;
      if (v0(t) ? r = t : i = t, i || (i = dR()), typeof i != "string")
        throw new TypeError("Expected boundary argument to be a string.");
      if (r && !v0(r))
        throw new TypeError("Expected options argument to be an object.");
      jn(this, Wn, Array.from(e.entries()), "f"), jn(this, Ho, { ...pR, ...r }, "f"), jn(this, Ln, he(this, xr, "f").encode(he(this, ir, "f")),
      "f"), jn(this, $o, he(this, Ln, "f").byteLength, "f"), this.boundary = `form-data-boundary-${i}`, this.contentType = `multipart/form-d\
ata; boundary=${this.boundary}`, jn(this, Un, he(this, xr, "f").encode(`${he(this, Nn, "f")}${this.boundary}${he(this, Nn, "f")}${he(this, ir,
      "f").repeat(2)}`), "f");
      let n = {
        "Content-Type": this.contentType
      }, o = he(this, qn, "m", E0).call(this);
      o && (this.contentLength = o, n["Content-Length"] = o), this.headers = hR(Object.freeze(n)), Object.defineProperties(this, {
        boundary: Vo,
        contentType: Vo,
        contentLength: Vo,
        headers: Vo
      });
    }
    getContentLength() {
      return this.contentLength == null ? void 0 : Number(this.contentLength);
    }
    *values() {
      for (let [e, t] of he(this, Wn, "f")) {
        let r = Cr(t) ? t : he(this, xr, "f").encode(b0(t));
        yield he(this, qn, "m", Lc).call(this, e, r), yield r, yield he(this, Ln, "f");
      }
      yield he(this, Un, "f");
    }
    async *encode() {
      for (let e of this.values())
        Cr(e) ? yield* cR(e.stream()) : yield e;
    }
    [(ir = /* @__PURE__ */ new WeakMap(), Ln = /* @__PURE__ */ new WeakMap(), $o = /* @__PURE__ */ new WeakMap(), Nn = /* @__PURE__ */ new WeakMap(),
    xr = /* @__PURE__ */ new WeakMap(), Un = /* @__PURE__ */ new WeakMap(), Wn = /* @__PURE__ */ new WeakMap(), Ho = /* @__PURE__ */ new WeakMap(),
    qn = /* @__PURE__ */ new WeakSet(), Lc = /* @__PURE__ */ s(function(t, r) {
      let i = "";
      i += `${he(this, Nn, "f")}${this.boundary}${he(this, ir, "f")}`, i += `Content-Disposition: form-data; name="${w0(t)}"`, Cr(r) && (i +=
      `; filename="${w0(r.name)}"${he(this, ir, "f")}`, i += `Content-Type: ${r.type || "application/octet-stream"}`);
      let n = Cr(r) ? r.size : r.byteLength;
      return he(this, Ho, "f").enableAdditionalHeaders === !0 && n != null && !isNaN(n) && (i += `${he(this, ir, "f")}Content-Length: ${Cr(r) ?
      r.size : r.byteLength}`), he(this, xr, "f").encode(`${i}${he(this, ir, "f").repeat(2)}`);
    }, "_FormDataEncoder_getFieldHeader2"), E0 = /* @__PURE__ */ s(function() {
      let t = 0;
      for (let [r, i] of he(this, Wn, "f")) {
        let n = Cr(i) ? i : he(this, xr, "f").encode(b0(i)), o = Cr(n) ? n.size : n.byteLength;
        if (o == null || isNaN(o))
          return;
        t += he(this, qn, "m", Lc).call(this, r, n).byteLength, t += o, t += he(this, $o, "f");
      }
      return String(t + he(this, Un, "f").byteLength);
    }, "_FormDataEncoder_getContentLength2"), Symbol.iterator)]() {
      return this.values();
    }
    [Symbol.asyncIterator]() {
      return this.encode();
    }
  }, mR = require("buffer"), gR = require("util");
  function rv(e) {
    return m.nodeStream(e) && m.function_(e.getBoundary);
  }
  s(rv, "isFormData2");
  async function yR(e, t) {
    if (t && "content-length" in t)
      return Number(t["content-length"]);
    if (!e)
      return 0;
    if (m.string(e))
      return mR.Buffer.byteLength(e);
    if (m.buffer(e))
      return e.length;
    if (rv(e))
      return (0, gR.promisify)(e.getLength.bind(e))();
  }
  s(yR, "getBodySize");
  function iv(e, t, r) {
    let i = {};
    for (let n of r) {
      let o = /* @__PURE__ */ s((...a) => {
        t.emit(n, ...a);
      }, "eventFunction");
      i[n] = o, e.on(n, o);
    }
    return () => {
      for (let [n, o] of Object.entries(i))
        e.off(n, o);
    };
  }
  s(iv, "proxyEvents");
  var bR = Fe(require("net"), 1);
  function vR() {
    let e = [];
    return {
      once(t, r, i) {
        t.once(r, i), e.push({ origin: t, event: r, fn: i });
      },
      unhandleAll() {
        for (let t of e) {
          let { origin: r, event: i, fn: n } = t;
          r.removeListener(i, n);
        }
        e.length = 0;
      }
    };
  }
  s(vR, "unhandle");
  var C0 = Symbol("reentry"), _R = /* @__PURE__ */ s(() => {
  }, "noop"), nv = class extends Error {
    static {
      s(this, "TimeoutError2");
    }
    constructor(e, t) {
      super(`Timeout awaiting '${t}' for ${e}ms`), Object.defineProperty(this, "event", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: t
      }), Object.defineProperty(this, "code", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), this.name = "TimeoutError", this.code = "ETIMEDOUT";
    }
  };
  function wR(e, t, r) {
    if (C0 in e)
      return _R;
    e[C0] = !0;
    let i = [], { once: n, unhandleAll: o } = vR(), a = /* @__PURE__ */ s((E, _, C) => {
      var x;
      let w = setTimeout(_, E, E, C);
      (x = w.unref) == null || x.call(w);
      let T = /* @__PURE__ */ s(() => {
        clearTimeout(w);
      }, "cancel");
      return i.push(T), T;
    }, "addTimeout"), { host: u, hostname: l } = r, c = /* @__PURE__ */ s((E, _) => {
      e.destroy(new nv(E, _));
    }, "timeoutHandler"), d = /* @__PURE__ */ s(() => {
      for (let E of i)
        E();
      o();
    }, "cancelTimeouts");
    if (e.once("error", (E) => {
      if (d(), e.listenerCount("error") === 0)
        throw E;
    }), typeof t.request < "u") {
      let E = a(t.request, c, "request");
      n(e, "response", (_) => {
        n(_, "end", E);
      });
    }
    if (typeof t.socket < "u") {
      let { socket: E } = t, _ = /* @__PURE__ */ s(() => {
        c(E, "socket");
      }, "socketTimeoutHandler");
      e.setTimeout(E, _), i.push(() => {
        e.removeListener("timeout", _);
      });
    }
    let p = typeof t.lookup < "u", h = typeof t.connect < "u", f = typeof t.secureConnect < "u", g = typeof t.send < "u";
    return (p || h || f || g) && n(e, "socket", (E) => {
      let { socketPath: _ } = e;
      if (E.connecting) {
        let C = !!(_ ?? bR.default.isIP(l ?? u ?? "") !== 0);
        if (p && !C && typeof E.address().address > "u") {
          let x = a(t.lookup, c, "lookup");
          n(E, "lookup", x);
        }
        if (h) {
          let x = /* @__PURE__ */ s(() => a(t.connect, c, "connect"), "timeConnect");
          C ? n(E, "connect", x()) : n(E, "lookup", (w) => {
            w === null && n(E, "connect", x());
          });
        }
        f && r.protocol === "https:" && n(E, "connect", () => {
          let x = a(t.secureConnect, c, "secureConnect");
          n(E, "secureConnect", x);
        });
      }
      if (g) {
        let C = /* @__PURE__ */ s(() => a(t.send, c, "send"), "timeRequest");
        E.connecting ? n(E, "connect", () => {
          n(e, "upload-complete", C());
        }) : n(e, "upload-complete", C());
      }
    }), typeof t.response < "u" && n(e, "upload-complete", () => {
      let E = a(t.response, c, "response");
      n(e, "response", E);
    }), typeof t.read < "u" && n(e, "response", (E) => {
      let _ = a(t.read, c, "read");
      n(E, "end", _);
    }), d;
  }
  s(wR, "timedOut");
  function ER(e) {
    e = e;
    let t = {
      protocol: e.protocol,
      hostname: m.string(e.hostname) && e.hostname.startsWith("[") ? e.hostname.slice(1, -1) : e.hostname,
      host: e.host,
      hash: e.hash,
      search: e.search,
      pathname: e.pathname,
      href: e.href,
      path: `${e.pathname || ""}${e.search || ""}`
    };
    return m.string(e.port) && e.port.length > 0 && (t.port = Number(e.port)), (e.username || e.password) && (t.auth = `${e.username || ""}:${e.
    password || ""}`), t;
  }
  s(ER, "urlToOptions");
  var CR = class {
    static {
      s(this, "WeakableMap");
    }
    constructor() {
      Object.defineProperty(this, "weakMap", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "map", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), this.weakMap = /* @__PURE__ */ new WeakMap(), this.map = /* @__PURE__ */ new Map();
    }
    set(e, t) {
      typeof e == "object" ? this.weakMap.set(e, t) : this.map.set(e, t);
    }
    get(e) {
      return typeof e == "object" ? this.weakMap.get(e) : this.map.get(e);
    }
    has(e) {
      return typeof e == "object" ? this.weakMap.has(e) : this.map.has(e);
    }
  }, xR = /* @__PURE__ */ s(({ attemptCount: e, retryOptions: t, error: r, retryAfter: i, computedValue: n }) => {
    if (r.name === "RetryError")
      return 1;
    if (e > t.limit)
      return 0;
    let o = t.methods.includes(r.options.method), a = t.errorCodes.includes(r.code), u = r.response && t.statusCodes.includes(r.response.statusCode);
    if (!o || !a && !u)
      return 0;
    if (r.response) {
      if (i)
        return i > n ? 0 : i;
      if (r.response.statusCode === 413)
        return 0;
    }
    let l = Math.random() * t.noise;
    return Math.min(2 ** (e - 1) * 1e3, t.backoffLimit) + l;
  }, "calculateRetryDelay"), FR = xR, SR = Fe(require("process"), 1), Nc = require("util"), Fr = require("url"), TR = require("tls"), AR = Fe(
  require("http"), 1), RR = Fe(require("https"), 1), Fi = require("dns"), Uc = require("util"), kR = Fe(require("os"), 1), { Resolver: x0 } = Fi.
  promises, xi = Symbol("cacheableLookupCreateConnection"), Wc = Symbol("cacheableLookupInstance"), F0 = Symbol("expires"), OR = typeof Fi.ALL ==
  "number", S0 = /* @__PURE__ */ s((e) => {
    if (!(e && typeof e.createConnection == "function"))
      throw new Error("Expected an Agent instance as the first argument");
  }, "verifyAgent"), BR = /* @__PURE__ */ s((e) => {
    for (let t of e)
      t.family !== 6 && (t.address = `::ffff:${t.address}`, t.family = 6);
  }, "map4to6"), T0 = /* @__PURE__ */ s(() => {
    let e = !1, t = !1;
    for (let r of Object.values(kR.default.networkInterfaces()))
      for (let i of r)
        if (!i.internal && (i.family === "IPv6" ? t = !0 : e = !0, e && t))
          return { has4: e, has6: t };
    return { has4: e, has6: t };
  }, "getIfaceInfo"), PR = /* @__PURE__ */ s((e) => Symbol.iterator in e, "isIterable"), Zo = /* @__PURE__ */ s((e) => e.catch((t) => {
    if (t.code === "ENODATA" || t.code === "ENOTFOUND" || t.code === "ENOENT")
      return [];
    throw t;
  }), "ignoreNoResultErrors"), A0 = { ttl: !0 }, IR = { all: !0 }, MR = { all: !0, family: 4 }, jR = { all: !0, family: 6 }, qR = class {
    static {
      s(this, "CacheableLookup");
    }
    constructor({
      cache: e = /* @__PURE__ */ new Map(),
      maxTtl: t = 1 / 0,
      fallbackDuration: r = 3600,
      errorTtl: i = 0.15,
      resolver: n = new x0(),
      lookup: o = Fi.lookup
    } = {}) {
      if (this.maxTtl = t, this.errorTtl = i, this._cache = e, this._resolver = n, this._dnsLookup = o && (0, Uc.promisify)(o), this.stats =
      {
        cache: 0,
        query: 0
      }, this._resolver instanceof x0 ? (this._resolve4 = this._resolver.resolve4.bind(this._resolver), this._resolve6 = this._resolver.resolve6.
      bind(this._resolver)) : (this._resolve4 = (0, Uc.promisify)(this._resolver.resolve4.bind(this._resolver)), this._resolve6 = (0, Uc.promisify)(
      this._resolver.resolve6.bind(this._resolver))), this._iface = T0(), this._pending = {}, this._nextRemovalTime = !1, this._hostnamesToFallback =
      /* @__PURE__ */ new Set(), this.fallbackDuration = r, r > 0) {
        let a = setInterval(() => {
          this._hostnamesToFallback.clear();
        }, r * 1e3);
        a.unref && a.unref(), this._fallbackInterval = a;
      }
      this.lookup = this.lookup.bind(this), this.lookupAsync = this.lookupAsync.bind(this);
    }
    set servers(e) {
      this.clear(), this._resolver.setServers(e);
    }
    get servers() {
      return this._resolver.getServers();
    }
    lookup(e, t, r) {
      if (typeof t == "function" ? (r = t, t = {}) : typeof t == "number" && (t = {
        family: t
      }), !r)
        throw new Error("Callback must be a function.");
      this.lookupAsync(e, t).then((i) => {
        t.all ? r(null, i) : r(null, i.address, i.family, i.expires, i.ttl, i.source);
      }, r);
    }
    async lookupAsync(e, t = {}) {
      typeof t == "number" && (t = {
        family: t
      });
      let r = await this.query(e);
      if (t.family === 6) {
        let i = r.filter((n) => n.family === 6);
        t.hints & Fi.V4MAPPED && (OR && t.hints & Fi.ALL || i.length === 0) ? BR(r) : r = i;
      } else t.family === 4 && (r = r.filter((i) => i.family === 4));
      if (t.hints & Fi.ADDRCONFIG) {
        let { _iface: i } = this;
        r = r.filter((n) => n.family === 6 ? i.has6 : i.has4);
      }
      if (r.length === 0) {
        let i = new Error(`cacheableLookup ENOTFOUND ${e}`);
        throw i.code = "ENOTFOUND", i.hostname = e, i;
      }
      return t.all ? r : r[0];
    }
    async query(e) {
      let t = "cache", r = await this._cache.get(e);
      if (r && this.stats.cache++, !r) {
        let i = this._pending[e];
        if (i)
          this.stats.cache++, r = await i;
        else {
          t = "query";
          let n = this.queryAndCache(e);
          this._pending[e] = n, this.stats.query++;
          try {
            r = await n;
          } finally {
            delete this._pending[e];
          }
        }
      }
      return r = r.map((i) => ({ ...i, source: t })), r;
    }
    async _resolve(e) {
      let [t, r] = await Promise.all([
        Zo(this._resolve4(e, A0)),
        Zo(this._resolve6(e, A0))
      ]), i = 0, n = 0, o = 0, a = Date.now();
      for (let u of t)
        u.family = 4, u.expires = a + u.ttl * 1e3, i = Math.max(i, u.ttl);
      for (let u of r)
        u.family = 6, u.expires = a + u.ttl * 1e3, n = Math.max(n, u.ttl);
      return t.length > 0 ? r.length > 0 ? o = Math.min(i, n) : o = i : o = n, {
        entries: [
          ...t,
          ...r
        ],
        cacheTtl: o
      };
    }
    async _lookup(e) {
      try {
        let [t, r] = await Promise.all([
          // Passing {all: true} doesn't return all IPv4 and IPv6 entries.
          // See https://github.com/szmarczak/cacheable-lookup/issues/42
          Zo(this._dnsLookup(e, MR)),
          Zo(this._dnsLookup(e, jR))
        ]);
        return {
          entries: [
            ...t,
            ...r
          ],
          cacheTtl: 0
        };
      } catch {
        return {
          entries: [],
          cacheTtl: 0
        };
      }
    }
    async _set(e, t, r) {
      if (this.maxTtl > 0 && r > 0) {
        r = Math.min(r, this.maxTtl) * 1e3, t[F0] = Date.now() + r;
        try {
          await this._cache.set(e, t, r);
        } catch (i) {
          this.lookupAsync = async () => {
            let n = new Error("Cache Error. Please recreate the CacheableLookup instance.");
            throw n.cause = i, n;
          };
        }
        PR(this._cache) && this._tick(r);
      }
    }
    async queryAndCache(e) {
      if (this._hostnamesToFallback.has(e))
        return this._dnsLookup(e, IR);
      let t = await this._resolve(e);
      t.entries.length === 0 && this._dnsLookup && (t = await this._lookup(e), t.entries.length !== 0 && this.fallbackDuration > 0 && this._hostnamesToFallback.
      add(e));
      let r = t.entries.length === 0 ? this.errorTtl : t.cacheTtl;
      return await this._set(e, t.entries, r), t.entries;
    }
    _tick(e) {
      let t = this._nextRemovalTime;
      (!t || e < t) && (clearTimeout(this._removalTimeout), this._nextRemovalTime = e, this._removalTimeout = setTimeout(() => {
        this._nextRemovalTime = !1;
        let r = 1 / 0, i = Date.now();
        for (let [n, o] of this._cache) {
          let a = o[F0];
          i >= a ? this._cache.delete(n) : a < r && (r = a);
        }
        r !== 1 / 0 && this._tick(r - i);
      }, e), this._removalTimeout.unref && this._removalTimeout.unref());
    }
    install(e) {
      if (S0(e), xi in e)
        throw new Error("CacheableLookup has been already installed");
      e[xi] = e.createConnection, e[Wc] = this, e.createConnection = (t, r) => ("lookup" in t || (t.lookup = this.lookup), e[xi](t, r));
    }
    uninstall(e) {
      if (S0(e), e[xi]) {
        if (e[Wc] !== this)
          throw new Error("The agent is not owned by this CacheableLookup instance");
        e.createConnection = e[xi], delete e[xi], delete e[Wc];
      }
    }
    updateInterfaceInfo() {
      let { _iface: e } = this;
      this._iface = T0(), (e.has4 && !this._iface.has4 || e.has6 && !this._iface.has6) && this._cache.clear();
    }
    clear(e) {
      if (e) {
        this._cache.delete(e);
        return;
      }
      this._cache.clear();
    }
  }, LR = Fe(h3(), 1);
  function NR(e) {
    let t = [], r = e.split(",");
    for (let i of r) {
      let [n, ...o] = i.split(";"), a = n.trim();
      if (a[0] !== "<" || a[a.length - 1] !== ">")
        throw new Error(`Invalid format of the Link header reference: ${a}`);
      let u = a.slice(1, -1), l = {};
      if (o.length === 0)
        throw new Error(`Unexpected end of Link header parameters: ${o.join(";")}`);
      for (let c of o) {
        let d = c.trim(), p = d.indexOf("=");
        if (p === -1)
          throw new Error(`Failed to parse Link header: ${e}`);
        let h = d.slice(0, p).trim(), f = d.slice(p + 1).trim();
        l[h] = f;
      }
      t.push({
        reference: u,
        parameters: l
      });
    }
    return t;
  }
  s(NR, "parseLinkHeader");
  var [R0, UR] = SR.default.versions.node.split(".").map(Number);
  function WR(e) {
    for (let t in e) {
      let r = e[t];
      A.any([m.string, m.number, m.boolean, m.null_, m.undefined], r);
    }
  }
  s(WR, "validateSearchParameters");
  var $R = /* @__PURE__ */ new Map(), zo, HR = /* @__PURE__ */ s(() => zo || (zo = new qR(), zo), "getGlobalDnsCache"), VR = {
    request: void 0,
    agent: {
      http: void 0,
      https: void 0,
      http2: void 0
    },
    h2session: void 0,
    decompress: !0,
    timeout: {
      connect: void 0,
      lookup: void 0,
      read: void 0,
      request: void 0,
      response: void 0,
      secureConnect: void 0,
      send: void 0,
      socket: void 0
    },
    prefixUrl: "",
    body: void 0,
    form: void 0,
    json: void 0,
    cookieJar: void 0,
    ignoreInvalidCookies: !1,
    searchParams: void 0,
    dnsLookup: void 0,
    dnsCache: void 0,
    context: {},
    hooks: {
      init: [],
      beforeRequest: [],
      beforeError: [],
      beforeRedirect: [],
      beforeRetry: [],
      afterResponse: []
    },
    followRedirect: !0,
    maxRedirects: 10,
    cache: void 0,
    throwHttpErrors: !0,
    username: "",
    password: "",
    http2: !1,
    allowGetBody: !1,
    headers: {
      "user-agent": "got (https://github.com/sindresorhus/got)"
    },
    methodRewriting: !1,
    dnsLookupIpVersion: void 0,
    parseJson: JSON.parse,
    stringifyJson: JSON.stringify,
    retry: {
      limit: 2,
      methods: [
        "GET",
        "PUT",
        "HEAD",
        "DELETE",
        "OPTIONS",
        "TRACE"
      ],
      statusCodes: [
        408,
        413,
        429,
        500,
        502,
        503,
        504,
        521,
        522,
        524
      ],
      errorCodes: [
        "ETIMEDOUT",
        "ECONNRESET",
        "EADDRINUSE",
        "ECONNREFUSED",
        "EPIPE",
        "ENOTFOUND",
        "ENETUNREACH",
        "EAI_AGAIN"
      ],
      maxRetryAfter: void 0,
      calculateDelay: /* @__PURE__ */ s(({ computedValue: e }) => e, "calculateDelay"),
      backoffLimit: Number.POSITIVE_INFINITY,
      noise: 100
    },
    localAddress: void 0,
    method: "GET",
    createConnection: void 0,
    cacheOptions: {
      shared: void 0,
      cacheHeuristic: void 0,
      immutableMinTimeToLive: void 0,
      ignoreCargoCult: void 0
    },
    https: {
      alpnProtocols: void 0,
      rejectUnauthorized: void 0,
      checkServerIdentity: void 0,
      certificateAuthority: void 0,
      key: void 0,
      certificate: void 0,
      passphrase: void 0,
      pfx: void 0,
      ciphers: void 0,
      honorCipherOrder: void 0,
      minVersion: void 0,
      maxVersion: void 0,
      signatureAlgorithms: void 0,
      tlsSessionLifetime: void 0,
      dhparam: void 0,
      ecdhCurve: void 0,
      certificateRevocationLists: void 0
    },
    encoding: void 0,
    resolveBodyOnly: !1,
    isStream: !1,
    responseType: "text",
    url: void 0,
    pagination: {
      transform(e) {
        return e.request.options.responseType === "json" ? e.body : JSON.parse(e.body);
      },
      paginate({ response: e }) {
        let t = e.headers.link;
        if (typeof t != "string" || t.trim() === "")
          return !1;
        let i = NR(t).find((n) => n.parameters.rel === "next" || n.parameters.rel === '"next"');
        return i ? {
          url: new Fr.URL(i.reference, e.url)
        } : !1;
      },
      filter: /* @__PURE__ */ s(() => !0, "filter"),
      shouldContinue: /* @__PURE__ */ s(() => !0, "shouldContinue"),
      countLimit: Number.POSITIVE_INFINITY,
      backoff: 0,
      requestLimit: 1e4,
      stackAllItems: !1
    },
    setHost: !0,
    maxHeaderSize: void 0,
    signal: void 0,
    enableUnixSockets: !0
  }, ZR = /* @__PURE__ */ s((e) => {
    let { hooks: t, retry: r } = e, i = {
      ...e,
      context: { ...e.context },
      cacheOptions: { ...e.cacheOptions },
      https: { ...e.https },
      agent: { ...e.agent },
      headers: { ...e.headers },
      retry: {
        ...r,
        errorCodes: [...r.errorCodes],
        methods: [...r.methods],
        statusCodes: [...r.statusCodes]
      },
      timeout: { ...e.timeout },
      hooks: {
        init: [...t.init],
        beforeRequest: [...t.beforeRequest],
        beforeError: [...t.beforeError],
        beforeRedirect: [...t.beforeRedirect],
        beforeRetry: [...t.beforeRetry],
        afterResponse: [...t.afterResponse]
      },
      searchParams: e.searchParams ? new Fr.URLSearchParams(e.searchParams) : void 0,
      pagination: { ...e.pagination }
    };
    return i.url !== void 0 && (i.prefixUrl = ""), i;
  }, "cloneInternals"), zR = /* @__PURE__ */ s((e) => {
    let { hooks: t, retry: r } = e, i = { ...e };
    return m.object(e.context) && (i.context = { ...e.context }), m.object(e.cacheOptions) && (i.cacheOptions = { ...e.cacheOptions }), m.object(
    e.https) && (i.https = { ...e.https }), m.object(e.cacheOptions) && (i.cacheOptions = { ...i.cacheOptions }), m.object(e.agent) && (i.agent =
    { ...e.agent }), m.object(e.headers) && (i.headers = { ...e.headers }), m.object(r) && (i.retry = { ...r }, m.array(r.errorCodes) && (i.
    retry.errorCodes = [...r.errorCodes]), m.array(r.methods) && (i.retry.methods = [...r.methods]), m.array(r.statusCodes) && (i.retry.statusCodes =
    [...r.statusCodes])), m.object(e.timeout) && (i.timeout = { ...e.timeout }), m.object(t) && (i.hooks = {
      ...t
    }, m.array(t.init) && (i.hooks.init = [...t.init]), m.array(t.beforeRequest) && (i.hooks.beforeRequest = [...t.beforeRequest]), m.array(
    t.beforeError) && (i.hooks.beforeError = [...t.beforeError]), m.array(t.beforeRedirect) && (i.hooks.beforeRedirect = [...t.beforeRedirect]),
    m.array(t.beforeRetry) && (i.hooks.beforeRetry = [...t.beforeRetry]), m.array(t.afterResponse) && (i.hooks.afterResponse = [...t.afterResponse])),
    m.object(e.pagination) && (i.pagination = { ...e.pagination }), i;
  }, "cloneRaw"), GR = /* @__PURE__ */ s((e) => {
    let t = [e.timeout.socket, e.timeout.connect, e.timeout.lookup, e.timeout.request, e.timeout.secureConnect].filter((r) => typeof r == "n\
umber");
    if (t.length > 0)
      return Math.min(...t);
  }, "getHttp2TimeoutOption"), k0 = /* @__PURE__ */ s((e, t, r) => {
    var i;
    let n = (i = e.hooks) == null ? void 0 : i.init;
    if (n)
      for (let o of n)
        o(t, r);
  }, "init"), Ut = class {
    static {
      s(this, "Options");
    }
    constructor(e, t, r) {
      if (Object.defineProperty(this, "_unixOptions", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_internals", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_merging", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_init", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), A.any([m.string, m.urlInstance, m.object, m.undefined], e), A.any([m.object, m.undefined], t), A.any([m.object, m.undefined], r), e instanceof
      Ut || t instanceof Ut)
        throw new TypeError("The defaults must be passed as the third argument");
      this._internals = ZR(r?._internals ?? r ?? VR), this._init = [...r?._init ?? []], this._merging = !1, this._unixOptions = void 0;
      try {
        if (m.plainObject(e))
          try {
            this.merge(e), this.merge(t);
          } finally {
            this.url = e.url;
          }
        else
          try {
            this.merge(t);
          } finally {
            if (t?.url !== void 0)
              if (e === void 0)
                this.url = t.url;
              else
                throw new TypeError("The `url` option is mutually exclusive with the `input` argument");
            else e !== void 0 && (this.url = e);
          }
      } catch (i) {
        throw i.options = this, i;
      }
    }
    merge(e) {
      if (e) {
        if (e instanceof Ut) {
          for (let t of e._init)
            this.merge(t);
          return;
        }
        e = zR(e), k0(this, e, this), k0(e, e, this), this._merging = !0, "isStream" in e && (this.isStream = e.isStream);
        try {
          let t = !1;
          for (let r in e)
            if (!(r === "mutableDefaults" || r === "handlers") && r !== "url") {
              if (!(r in this))
                throw new Error(`Unexpected option: ${r}`);
              this[r] = e[r], t = !0;
            }
          t && this._init.push(e);
        } finally {
          this._merging = !1;
        }
      }
    }
    /**
        Custom request function.
        The main purpose of this is to [support HTTP2 using a wrapper](https://github.com/szmarczak/http2-wrapper).
    
        @default http.request | https.request
        */
    get request() {
      return this._internals.request;
    }
    set request(e) {
      A.any([m.function_, m.undefined], e), this._internals.request = e;
    }
    /**
        An object representing `http`, `https` and `http2` keys for [`http.Agent`](https://nodejs.org/api/http.html#http_class_http_agent), [`https.Agent`](https://nodejs.org/api/https.html#https_class_https_agent) and [`http2wrapper.Agent`](https://github.com/szmarczak/http2-wrapper#new-http2agentoptions) instance.
        This is necessary because a request to one protocol might redirect to another.
        In such a scenario, Got will switch over to the right protocol agent for you.
    
        If a key is not present, it will default to a global agent.
    
        @example
        ```
        import got from 'got';
        import HttpAgent from 'agentkeepalive';
    
        const {HttpsAgent} = HttpAgent;
    
        await got('https://sindresorhus.com', {
            agent: {
                http: new HttpAgent(),
                https: new HttpsAgent()
            }
        });
        ```
        */
    get agent() {
      return this._internals.agent;
    }
    set agent(e) {
      A.plainObject(e);
      for (let t in e) {
        if (!(t in this._internals.agent))
          throw new TypeError(`Unexpected agent option: ${t}`);
        A.any([m.object, m.undefined], e[t]);
      }
      this._merging ? Object.assign(this._internals.agent, e) : this._internals.agent = { ...e };
    }
    get h2session() {
      return this._internals.h2session;
    }
    set h2session(e) {
      this._internals.h2session = e;
    }
    /**
        Decompress the response automatically.
    
        This will set the `accept-encoding` header to `gzip, deflate, br` unless you set it yourself.
    
        If this is disabled, a compressed response is returned as a `Buffer`.
        This may be useful if you want to handle decompression yourself or stream the raw compressed data.
    
        @default true
        */
    get decompress() {
      return this._internals.decompress;
    }
    set decompress(e) {
      A.boolean(e), this._internals.decompress = e;
    }
    /**
        Milliseconds to wait for the server to end the response before aborting the request with `got.TimeoutError` error (a.k.a. `request` property).
        By default, there's no timeout.
    
        This also accepts an `object` with the following fields to constrain the duration of each phase of the request lifecycle:
    
        - `lookup` starts when a socket is assigned and ends when the hostname has been resolved.
            Does not apply when using a Unix domain socket.
        - `connect` starts when `lookup` completes (or when the socket is assigned if lookup does not apply to the request) and ends when the socket is connected.
        - `secureConnect` starts when `connect` completes and ends when the handshaking process completes (HTTPS only).
        - `socket` starts when the socket is connected. See [request.setTimeout](https://nodejs.org/api/http.html#http_request_settimeout_timeout_callback).
        - `response` starts when the request has been written to the socket and ends when the response headers are received.
        - `send` starts when the socket is connected and ends with the request has been written to the socket.
        - `request` starts when the request is initiated and ends when the response's end event fires.
        */
    get timeout() {
      return this._internals.timeout;
    }
    set timeout(e) {
      A.plainObject(e);
      for (let t in e) {
        if (!(t in this._internals.timeout))
          throw new Error(`Unexpected timeout option: ${t}`);
        A.any([m.number, m.undefined], e[t]);
      }
      this._merging ? Object.assign(this._internals.timeout, e) : this._internals.timeout = { ...e };
    }
    /**
        When specified, `prefixUrl` will be prepended to `url`.
        The prefix can be any valid URL, either relative or absolute.
        A trailing slash `/` is optional - one will be added automatically.
    
        __Note__: `prefixUrl` will be ignored if the `url` argument is a URL instance.
    
        __Note__: Leading slashes in `input` are disallowed when using this option to enforce consistency and avoid confusion.
        For example, when the prefix URL is `https://example.com/foo` and the input is `/bar`, there's ambiguity whether the resulting URL would become `https://example.com/foo/bar` or `https://example.com/bar`.
        The latter is used by browsers.
    
        __Tip__: Useful when used with `got.extend()` to create niche-specific Got instances.
    
        __Tip__: You can change `prefixUrl` using hooks as long as the URL still includes the `prefixUrl`.
        If the URL doesn't include it anymore, it will throw.
    
        @example
        ```
        import got from 'got';
    
        await got('unicorn', {prefixUrl: 'https://cats.com'});
        //=> 'https://cats.com/unicorn'
    
        const instance = got.extend({
            prefixUrl: 'https://google.com'
        });
    
        await instance('unicorn', {
            hooks: {
                beforeRequest: [
                    options => {
                        options.prefixUrl = 'https://cats.com';
                    }
                ]
            }
        });
        //=> 'https://cats.com/unicorn'
        ```
        */
    get prefixUrl() {
      return this._internals.prefixUrl;
    }
    set prefixUrl(e) {
      if (A.any([m.string, m.urlInstance], e), e === "") {
        this._internals.prefixUrl = "";
        return;
      }
      if (e = e.toString(), e.endsWith("/") || (e += "/"), this._internals.prefixUrl && this._internals.url) {
        let { href: t } = this._internals.url;
        this._internals.url.href = e + t.slice(this._internals.prefixUrl.length);
      }
      this._internals.prefixUrl = e;
    }
    /**
        __Note #1__: The `body` option cannot be used with the `json` or `form` option.
    
        __Note #2__: If you provide this option, `got.stream()` will be read-only.
    
        __Note #3__: If you provide a payload with the `GET` or `HEAD` method, it will throw a `TypeError` unless the method is `GET` and the `allowGetBody` option is set to `true`.
    
        __Note #4__: This option is not enumerable and will not be merged with the instance defaults.
    
        The `content-length` header will be automatically set if `body` is a `string` / `Buffer` / [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) / [`form-data` instance](https://github.com/form-data/form-data), and `content-length` and `transfer-encoding` are not manually set in `options.headers`.
    
        Since Got 12, the `content-length` is not automatically set when `body` is a `fs.createReadStream`.
        */
    get body() {
      return this._internals.body;
    }
    set body(e) {
      A.any([m.string, m.buffer, m.nodeStream, m.generator, m.asyncGenerator, zc, m.undefined], e), m.nodeStream(e) && A.truthy(e.readable),
      e !== void 0 && (A.undefined(this._internals.form), A.undefined(this._internals.json)), this._internals.body = e;
    }
    /**
        The form body is converted to a query string using [`(new URLSearchParams(object)).toString()`](https://nodejs.org/api/url.html#url_constructor_new_urlsearchparams_obj).
    
        If the `Content-Type` header is not present, it will be set to `application/x-www-form-urlencoded`.
    
        __Note #1__: If you provide this option, `got.stream()` will be read-only.
    
        __Note #2__: This option is not enumerable and will not be merged with the instance defaults.
        */
    get form() {
      return this._internals.form;
    }
    set form(e) {
      A.any([m.plainObject, m.undefined], e), e !== void 0 && (A.undefined(this._internals.body), A.undefined(this._internals.json)), this._internals.
      form = e;
    }
    /**
        JSON body. If the `Content-Type` header is not set, it will be set to `application/json`.
    
        __Note #1__: If you provide this option, `got.stream()` will be read-only.
    
        __Note #2__: This option is not enumerable and will not be merged with the instance defaults.
        */
    get json() {
      return this._internals.json;
    }
    set json(e) {
      e !== void 0 && (A.undefined(this._internals.body), A.undefined(this._internals.form)), this._internals.json = e;
    }
    /**
        The URL to request, as a string, a [`https.request` options object](https://nodejs.org/api/https.html#https_https_request_options_callback), or a [WHATWG `URL`](https://nodejs.org/api/url.html#url_class_url).
    
        Properties from `options` will override properties in the parsed `url`.
    
        If no protocol is specified, it will throw a `TypeError`.
    
        __Note__: The query string is **not** parsed as search params.
    
        @example
        ```
        await got('https://example.com/?query=a b'); //=> https://example.com/?query=a%20b
        await got('https://example.com/', {searchParams: {query: 'a b'}}); //=> https://example.com/?query=a+b
    
        // The query string is overridden by `searchParams`
        await got('https://example.com/?query=a b', {searchParams: {query: 'a b'}}); //=> https://example.com/?query=a+b
        ```
        */
    get url() {
      return this._internals.url;
    }
    set url(e) {
      if (A.any([m.string, m.urlInstance, m.undefined], e), e === void 0) {
        this._internals.url = void 0;
        return;
      }
      if (m.string(e) && e.startsWith("/"))
        throw new Error("`url` must not start with a slash");
      let t = `${this.prefixUrl}${e.toString()}`, r = new Fr.URL(t);
      if (this._internals.url = r, decodeURI(t), r.protocol === "unix:" && (r.href = `http://unix${r.pathname}${r.search}`), r.protocol !== "\
http:" && r.protocol !== "https:") {
        let i = new Error(`Unsupported protocol: ${r.protocol}`);
        throw i.code = "ERR_UNSUPPORTED_PROTOCOL", i;
      }
      if (this._internals.username && (r.username = this._internals.username, this._internals.username = ""), this._internals.password && (r.
      password = this._internals.password, this._internals.password = ""), this._internals.searchParams && (r.search = this._internals.searchParams.
      toString(), this._internals.searchParams = void 0), r.hostname === "unix") {
        if (!this._internals.enableUnixSockets)
          throw new Error("Using UNIX domain sockets but option `enableUnixSockets` is not enabled");
        let i = /(?<socketPath>.+?):(?<path>.+)/.exec(`${r.pathname}${r.search}`);
        if (i?.groups) {
          let { socketPath: n, path: o } = i.groups;
          this._unixOptions = {
            socketPath: n,
            path: o,
            host: ""
          };
        } else
          this._unixOptions = void 0;
        return;
      }
      this._unixOptions = void 0;
    }
    /**
        Cookie support. You don't have to care about parsing or how to store them.
    
        __Note__: If you provide this option, `options.headers.cookie` will be overridden.
        */
    get cookieJar() {
      return this._internals.cookieJar;
    }
    set cookieJar(e) {
      if (A.any([m.object, m.undefined], e), e === void 0) {
        this._internals.cookieJar = void 0;
        return;
      }
      let { setCookie: t, getCookieString: r } = e;
      A.function_(t), A.function_(r), t.length === 4 && r.length === 0 ? (t = (0, Nc.promisify)(t.bind(e)), r = (0, Nc.promisify)(r.bind(e)),
      this._internals.cookieJar = {
        setCookie: t,
        getCookieString: r
      }) : this._internals.cookieJar = e;
    }
    /**
        You can abort the `request` using [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
    
        *Requires Node.js 16 or later.*
    
        @example
        ```
        import got from 'got';
    
        const abortController = new AbortController();
    
        const request = got('https://httpbin.org/anything', {
            signal: abortController.signal
        });
    
        setTimeout(() => {
            abortController.abort();
        }, 100);
        ```
        */
    // TODO: Replace `any` with `AbortSignal` when targeting Node 16.
    get signal() {
      return this._internals.signal;
    }
    // TODO: Replace `any` with `AbortSignal` when targeting Node 16.
    set signal(e) {
      A.object(e), this._internals.signal = e;
    }
    /**
        Ignore invalid cookies instead of throwing an error.
        Only useful when the `cookieJar` option has been set. Not recommended.
    
        @default false
        */
    get ignoreInvalidCookies() {
      return this._internals.ignoreInvalidCookies;
    }
    set ignoreInvalidCookies(e) {
      A.boolean(e), this._internals.ignoreInvalidCookies = e;
    }
    /**
        Query string that will be added to the request URL.
        This will override the query string in `url`.
    
        If you need to pass in an array, you can do it using a `URLSearchParams` instance.
    
        @example
        ```
        import got from 'got';
    
        const searchParams = new URLSearchParams([['key', 'a'], ['key', 'b']]);
    
        await got('https://example.com', {searchParams});
    
        console.log(searchParams.toString());
        //=> 'key=a&key=b'
        ```
        */
    get searchParams() {
      return this._internals.url ? this._internals.url.searchParams : (this._internals.searchParams === void 0 && (this._internals.searchParams =
      new Fr.URLSearchParams()), this._internals.searchParams);
    }
    set searchParams(e) {
      A.any([m.string, m.object, m.undefined], e);
      let t = this._internals.url;
      if (e === void 0) {
        this._internals.searchParams = void 0, t && (t.search = "");
        return;
      }
      let r = this.searchParams, i;
      if (m.string(e))
        i = new Fr.URLSearchParams(e);
      else if (e instanceof Fr.URLSearchParams)
        i = e;
      else {
        WR(e), i = new Fr.URLSearchParams();
        for (let n in e) {
          let o = e[n];
          o === null ? i.append(n, "") : o === void 0 ? r.delete(n) : i.append(n, o);
        }
      }
      if (this._merging) {
        for (let n of i.keys())
          r.delete(n);
        for (let [n, o] of i)
          r.append(n, o);
      } else t ? t.search = r.toString() : this._internals.searchParams = r;
    }
    get searchParameters() {
      throw new Error("The `searchParameters` option does not exist. Use `searchParams` instead.");
    }
    set searchParameters(e) {
      throw new Error("The `searchParameters` option does not exist. Use `searchParams` instead.");
    }
    get dnsLookup() {
      return this._internals.dnsLookup;
    }
    set dnsLookup(e) {
      A.any([m.function_, m.undefined], e), this._internals.dnsLookup = e;
    }
    /**
        An instance of [`CacheableLookup`](https://github.com/szmarczak/cacheable-lookup) used for making DNS lookups.
        Useful when making lots of requests to different *public* hostnames.
    
        `CacheableLookup` uses `dns.resolver4(..)` and `dns.resolver6(...)` under the hood and fall backs to `dns.lookup(...)` when the first two fail, which may lead to additional delay.
    
        __Note__: This should stay disabled when making requests to internal hostnames such as `localhost`, `database.local` etc.
    
        @default false
        */
    get dnsCache() {
      return this._internals.dnsCache;
    }
    set dnsCache(e) {
      A.any([m.object, m.boolean, m.undefined], e), e === !0 ? this._internals.dnsCache = HR() : e === !1 ? this._internals.dnsCache = void 0 :
      this._internals.dnsCache = e;
    }
    /**
        User data. `context` is shallow merged and enumerable. If it contains non-enumerable properties they will NOT be merged.
    
        @example
        ```
        import got from 'got';
    
        const instance = got.extend({
            hooks: {
                beforeRequest: [
                    options => {
                        if (!options.context || !options.context.token) {
                            throw new Error('Token required');
                        }
    
                        options.headers.token = options.context.token;
                    }
                ]
            }
        });
    
        const context = {
            token: 'secret'
        };
    
        const response = await instance('https://httpbin.org/headers', {context});
    
        // Let's see the headers
        console.log(response.body);
        ```
        */
    get context() {
      return this._internals.context;
    }
    set context(e) {
      A.object(e), this._merging ? Object.assign(this._internals.context, e) : this._internals.context = { ...e };
    }
    /**
    Hooks allow modifications during the request lifecycle.
    Hook functions may be async and are run serially.
    */
    get hooks() {
      return this._internals.hooks;
    }
    set hooks(e) {
      A.object(e);
      for (let t in e) {
        if (!(t in this._internals.hooks))
          throw new Error(`Unexpected hook event: ${t}`);
        let r = t, i = e[r];
        if (A.any([m.array, m.undefined], i), i)
          for (let n of i)
            A.function_(n);
        if (this._merging)
          i && this._internals.hooks[r].push(...i);
        else {
          if (!i)
            throw new Error(`Missing hook event: ${t}`);
          this._internals.hooks[t] = [...i];
        }
      }
    }
    /**
        Defines if redirect responses should be followed automatically.
    
        Note that if a `303` is sent by the server in response to any request type (`POST`, `DELETE`, etc.), Got will automatically request the resource pointed to in the location header via `GET`.
        This is in accordance with [the spec](https://tools.ietf.org/html/rfc7231#section-6.4.4). You can optionally turn on this behavior also for other redirect codes - see `methodRewriting`.
    
        @default true
        */
    get followRedirect() {
      return this._internals.followRedirect;
    }
    set followRedirect(e) {
      A.boolean(e), this._internals.followRedirect = e;
    }
    get followRedirects() {
      throw new TypeError("The `followRedirects` option does not exist. Use `followRedirect` instead.");
    }
    set followRedirects(e) {
      throw new TypeError("The `followRedirects` option does not exist. Use `followRedirect` instead.");
    }
    /**
        If exceeded, the request will be aborted and a `MaxRedirectsError` will be thrown.
    
        @default 10
        */
    get maxRedirects() {
      return this._internals.maxRedirects;
    }
    set maxRedirects(e) {
      A.number(e), this._internals.maxRedirects = e;
    }
    /**
        A cache adapter instance for storing cached response data.
    
        @default false
        */
    get cache() {
      return this._internals.cache;
    }
    set cache(e) {
      A.any([m.object, m.string, m.boolean, m.undefined], e), e === !0 ? this._internals.cache = $R : e === !1 ? this._internals.cache = void 0 :
      this._internals.cache = e;
    }
    /**
        Determines if a `got.HTTPError` is thrown for unsuccessful responses.
    
        If this is disabled, requests that encounter an error status code will be resolved with the `response` instead of throwing.
        This may be useful if you are checking for resource availability and are expecting error responses.
    
        @default true
        */
    get throwHttpErrors() {
      return this._internals.throwHttpErrors;
    }
    set throwHttpErrors(e) {
      A.boolean(e), this._internals.throwHttpErrors = e;
    }
    get username() {
      let e = this._internals.url, t = e ? e.username : this._internals.username;
      return decodeURIComponent(t);
    }
    set username(e) {
      A.string(e);
      let t = this._internals.url, r = encodeURIComponent(e);
      t ? t.username = r : this._internals.username = r;
    }
    get password() {
      let e = this._internals.url, t = e ? e.password : this._internals.password;
      return decodeURIComponent(t);
    }
    set password(e) {
      A.string(e);
      let t = this._internals.url, r = encodeURIComponent(e);
      t ? t.password = r : this._internals.password = r;
    }
    /**
        If set to `true`, Got will additionally accept HTTP2 requests.
    
        It will choose either HTTP/1.1 or HTTP/2 depending on the ALPN protocol.
    
        __Note__: This option requires Node.js 15.10.0 or newer as HTTP/2 support on older Node.js versions is very buggy.
    
        __Note__: Overriding `options.request` will disable HTTP2 support.
    
        @default false
    
        @example
        ```
        import got from 'got';
    
        const {headers} = await got('https://nghttp2.org/httpbin/anything', {http2: true});
    
        console.log(headers.via);
        //=> '2 nghttpx'
        ```
        */
    get http2() {
      return this._internals.http2;
    }
    set http2(e) {
      A.boolean(e), this._internals.http2 = e;
    }
    /**
        Set this to `true` to allow sending body for the `GET` method.
        However, the [HTTP/2 specification](https://tools.ietf.org/html/rfc7540#section-8.1.3) says that `An HTTP GET request includes request header fields and no payload body`, therefore when using the HTTP/2 protocol this option will have no effect.
        This option is only meant to interact with non-compliant servers when you have no other choice.
    
        __Note__: The [RFC 7231](https://tools.ietf.org/html/rfc7231#section-4.3.1) doesn't specify any particular behavior for the GET method having a payload, therefore __it's considered an [anti-pattern](https://en.wikipedia.org/wiki/Anti-pattern)__.
    
        @default false
        */
    get allowGetBody() {
      return this._internals.allowGetBody;
    }
    set allowGetBody(e) {
      A.boolean(e), this._internals.allowGetBody = e;
    }
    /**
        Request headers.
    
        Existing headers will be overwritten. Headers set to `undefined` will be omitted.
    
        @default {}
        */
    get headers() {
      return this._internals.headers;
    }
    set headers(e) {
      A.plainObject(e), this._merging ? Object.assign(this._internals.headers, Hc(e)) : this._internals.headers = Hc(e);
    }
    /**
        Specifies if the HTTP request method should be [rewritten as `GET`](https://tools.ietf.org/html/rfc7231#section-6.4) on redirects.
    
        As the [specification](https://tools.ietf.org/html/rfc7231#section-6.4) prefers to rewrite the HTTP method only on `303` responses, this is Got's default behavior.
        Setting `methodRewriting` to `true` will also rewrite `301` and `302` responses, as allowed by the spec. This is the behavior followed by `curl` and browsers.
    
        __Note__: Got never performs method rewriting on `307` and `308` responses, as this is [explicitly prohibited by the specification](https://www.rfc-editor.org/rfc/rfc7231#section-6.4.7).
    
        @default false
        */
    get methodRewriting() {
      return this._internals.methodRewriting;
    }
    set methodRewriting(e) {
      A.boolean(e), this._internals.methodRewriting = e;
    }
    /**
        Indicates which DNS record family to use.
    
        Values:
        - `undefined`: IPv4 (if present) or IPv6
        - `4`: Only IPv4
        - `6`: Only IPv6
    
        @default undefined
        */
    get dnsLookupIpVersion() {
      return this._internals.dnsLookupIpVersion;
    }
    set dnsLookupIpVersion(e) {
      if (e !== void 0 && e !== 4 && e !== 6)
        throw new TypeError(`Invalid DNS lookup IP version: ${e}`);
      this._internals.dnsLookupIpVersion = e;
    }
    /**
        A function used to parse JSON responses.
    
        @example
        ```
        import got from 'got';
        import Bourne from '@hapi/bourne';
    
        const parsed = await got('https://example.com', {
            parseJson: text => Bourne.parse(text)
        }).json();
    
        console.log(parsed);
        ```
        */
    get parseJson() {
      return this._internals.parseJson;
    }
    set parseJson(e) {
      A.function_(e), this._internals.parseJson = e;
    }
    /**
        A function used to stringify the body of JSON requests.
    
        @example
        ```
        import got from 'got';
    
        await got.post('https://example.com', {
            stringifyJson: object => JSON.stringify(object, (key, value) => {
                if (key.startsWith('_')) {
                    return;
                }
    
                return value;
            }),
            json: {
                some: 'payload',
                _ignoreMe: 1234
            }
        });
        ```
    
        @example
        ```
        import got from 'got';
    
        await got.post('https://example.com', {
            stringifyJson: object => JSON.stringify(object, (key, value) => {
                if (typeof value === 'number') {
                    return value.toString();
                }
    
                return value;
            }),
            json: {
                some: 'payload',
                number: 1
            }
        });
        ```
        */
    get stringifyJson() {
      return this._internals.stringifyJson;
    }
    set stringifyJson(e) {
      A.function_(e), this._internals.stringifyJson = e;
    }
    /**
        An object representing `limit`, `calculateDelay`, `methods`, `statusCodes`, `maxRetryAfter` and `errorCodes` fields for maximum retry count, retry handler, allowed methods, allowed status codes, maximum [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) time and allowed error codes.
    
        Delays between retries counts with function `1000 * Math.pow(2, retry) + Math.random() * 100`, where `retry` is attempt number (starts from 1).
    
        The `calculateDelay` property is a `function` that receives an object with `attemptCount`, `retryOptions`, `error` and `computedValue` properties for current retry count, the retry options, error and default computed value.
        The function must return a delay in milliseconds (or a Promise resolving with it) (`0` return value cancels retry).
    
        By default, it retries *only* on the specified methods, status codes, and on these network errors:
    
        - `ETIMEDOUT`: One of the [timeout](#timeout) limits were reached.
        - `ECONNRESET`: Connection was forcibly closed by a peer.
        - `EADDRINUSE`: Could not bind to any free port.
        - `ECONNREFUSED`: Connection was refused by the server.
        - `EPIPE`: The remote side of the stream being written has been closed.
        - `ENOTFOUND`: Couldn't resolve the hostname to an IP address.
        - `ENETUNREACH`: No internet connection.
        - `EAI_AGAIN`: DNS lookup timed out.
    
        __Note__: If `maxRetryAfter` is set to `undefined`, it will use `options.timeout`.
        __Note__: If [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) header is greater than `maxRetryAfter`, it will cancel the request.
        */
    get retry() {
      return this._internals.retry;
    }
    set retry(e) {
      if (A.plainObject(e), A.any([m.function_, m.undefined], e.calculateDelay), A.any([m.number, m.undefined], e.maxRetryAfter), A.any([m.number,
      m.undefined], e.limit), A.any([m.array, m.undefined], e.methods), A.any([m.array, m.undefined], e.statusCodes), A.any([m.array, m.undefined],
      e.errorCodes), A.any([m.number, m.undefined], e.noise), e.noise && Math.abs(e.noise) > 100)
        throw new Error(`The maximum acceptable retry noise is +/- 100ms, got ${e.noise}`);
      for (let r in e)
        if (!(r in this._internals.retry))
          throw new Error(`Unexpected retry option: ${r}`);
      this._merging ? Object.assign(this._internals.retry, e) : this._internals.retry = { ...e };
      let { retry: t } = this._internals;
      t.methods = [...new Set(t.methods.map((r) => r.toUpperCase()))], t.statusCodes = [...new Set(t.statusCodes)], t.errorCodes = [...new Set(
      t.errorCodes)];
    }
    /**
        From `http.RequestOptions`.
    
        The IP address used to send the request from.
        */
    get localAddress() {
      return this._internals.localAddress;
    }
    set localAddress(e) {
      A.any([m.string, m.undefined], e), this._internals.localAddress = e;
    }
    /**
        The HTTP method used to make the request.
    
        @default 'GET'
        */
    get method() {
      return this._internals.method;
    }
    set method(e) {
      A.string(e), this._internals.method = e.toUpperCase();
    }
    get createConnection() {
      return this._internals.createConnection;
    }
    set createConnection(e) {
      A.any([m.function_, m.undefined], e), this._internals.createConnection = e;
    }
    /**
        From `http-cache-semantics`
    
        @default {}
        */
    get cacheOptions() {
      return this._internals.cacheOptions;
    }
    set cacheOptions(e) {
      A.plainObject(e), A.any([m.boolean, m.undefined], e.shared), A.any([m.number, m.undefined], e.cacheHeuristic), A.any([m.number, m.undefined],
      e.immutableMinTimeToLive), A.any([m.boolean, m.undefined], e.ignoreCargoCult);
      for (let t in e)
        if (!(t in this._internals.cacheOptions))
          throw new Error(`Cache option \`${t}\` does not exist`);
      this._merging ? Object.assign(this._internals.cacheOptions, e) : this._internals.cacheOptions = { ...e };
    }
    /**
    Options for the advanced HTTPS API.
    */
    get https() {
      return this._internals.https;
    }
    set https(e) {
      A.plainObject(e), A.any([m.boolean, m.undefined], e.rejectUnauthorized), A.any([m.function_, m.undefined], e.checkServerIdentity), A.any(
      [m.string, m.object, m.array, m.undefined], e.certificateAuthority), A.any([m.string, m.object, m.array, m.undefined], e.key), A.any([
      m.string, m.object, m.array, m.undefined], e.certificate), A.any([m.string, m.undefined], e.passphrase), A.any([m.string, m.buffer, m.
      array, m.undefined], e.pfx), A.any([m.array, m.undefined], e.alpnProtocols), A.any([m.string, m.undefined], e.ciphers), A.any([m.string,
      m.buffer, m.undefined], e.dhparam), A.any([m.string, m.undefined], e.signatureAlgorithms), A.any([m.string, m.undefined], e.minVersion),
      A.any([m.string, m.undefined], e.maxVersion), A.any([m.boolean, m.undefined], e.honorCipherOrder), A.any([m.number, m.undefined], e.tlsSessionLifetime),
      A.any([m.string, m.undefined], e.ecdhCurve), A.any([m.string, m.buffer, m.array, m.undefined], e.certificateRevocationLists);
      for (let t in e)
        if (!(t in this._internals.https))
          throw new Error(`HTTPS option \`${t}\` does not exist`);
      this._merging ? Object.assign(this._internals.https, e) : this._internals.https = { ...e };
    }
    /**
        [Encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) to be used on `setEncoding` of the response data.
    
        To get a [`Buffer`](https://nodejs.org/api/buffer.html), you need to set `responseType` to `buffer` instead.
        Don't set this option to `null`.
    
        __Note__: This doesn't affect streams! Instead, you need to do `got.stream(...).setEncoding(encoding)`.
    
        @default 'utf-8'
        */
    get encoding() {
      return this._internals.encoding;
    }
    set encoding(e) {
      if (e === null)
        throw new TypeError("To get a Buffer, set `options.responseType` to `buffer` instead");
      A.any([m.string, m.undefined], e), this._internals.encoding = e;
    }
    /**
        When set to `true` the promise will return the Response body instead of the Response object.
    
        @default false
        */
    get resolveBodyOnly() {
      return this._internals.resolveBodyOnly;
    }
    set resolveBodyOnly(e) {
      A.boolean(e), this._internals.resolveBodyOnly = e;
    }
    /**
        Returns a `Stream` instead of a `Promise`.
        This is equivalent to calling `got.stream(url, options?)`.
    
        @default false
        */
    get isStream() {
      return this._internals.isStream;
    }
    set isStream(e) {
      A.boolean(e), this._internals.isStream = e;
    }
    /**
        The parsing method.
    
        The promise also has `.text()`, `.json()` and `.buffer()` methods which return another Got promise for the parsed body.
    
        It's like setting the options to `{responseType: 'json', resolveBodyOnly: true}` but without affecting the main Got promise.
    
        __Note__: When using streams, this option is ignored.
    
        @example
        ```
        const responsePromise = got(url);
        const bufferPromise = responsePromise.buffer();
        const jsonPromise = responsePromise.json();
    
        const [response, buffer, json] = Promise.all([responsePromise, bufferPromise, jsonPromise]);
        // `response` is an instance of Got Response
        // `buffer` is an instance of Buffer
        // `json` is an object
        ```
    
        @example
        ```
        // This
        const body = await got(url).json();
    
        // is semantically the same as this
        const body = await got(url, {responseType: 'json', resolveBodyOnly: true});
        ```
        */
    get responseType() {
      return this._internals.responseType;
    }
    set responseType(e) {
      if (e === void 0) {
        this._internals.responseType = "text";
        return;
      }
      if (e !== "text" && e !== "buffer" && e !== "json")
        throw new Error(`Invalid \`responseType\` option: ${e}`);
      this._internals.responseType = e;
    }
    get pagination() {
      return this._internals.pagination;
    }
    set pagination(e) {
      A.object(e), this._merging ? Object.assign(this._internals.pagination, e) : this._internals.pagination = e;
    }
    get auth() {
      throw new Error("Parameter `auth` is deprecated. Use `username` / `password` instead.");
    }
    set auth(e) {
      throw new Error("Parameter `auth` is deprecated. Use `username` / `password` instead.");
    }
    get setHost() {
      return this._internals.setHost;
    }
    set setHost(e) {
      A.boolean(e), this._internals.setHost = e;
    }
    get maxHeaderSize() {
      return this._internals.maxHeaderSize;
    }
    set maxHeaderSize(e) {
      A.any([m.number, m.undefined], e), this._internals.maxHeaderSize = e;
    }
    get enableUnixSockets() {
      return this._internals.enableUnixSockets;
    }
    set enableUnixSockets(e) {
      A.boolean(e), this._internals.enableUnixSockets = e;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
      return { ...this._internals };
    }
    [Symbol.for("nodejs.util.inspect.custom")](e, t) {
      return (0, Nc.inspect)(this._internals, t);
    }
    createNativeRequestOptions() {
      var e;
      let t = this._internals, r = t.url, i;
      r.protocol === "https:" ? i = t.http2 ? t.agent : t.agent.https : i = t.agent.http;
      let { https: n } = t, { pfx: o } = n;
      return m.array(o) && m.plainObject(o[0]) && (o = o.map((a) => ({
        buf: a.buffer,
        passphrase: a.passphrase
      }))), {
        ...t.cacheOptions,
        ...this._unixOptions,
        // HTTPS options
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ALPNProtocols: n.alpnProtocols,
        ca: n.certificateAuthority,
        cert: n.certificate,
        key: n.key,
        passphrase: n.passphrase,
        pfx: n.pfx,
        rejectUnauthorized: n.rejectUnauthorized,
        checkServerIdentity: n.checkServerIdentity ?? TR.checkServerIdentity,
        ciphers: n.ciphers,
        honorCipherOrder: n.honorCipherOrder,
        minVersion: n.minVersion,
        maxVersion: n.maxVersion,
        sigalgs: n.signatureAlgorithms,
        sessionTimeout: n.tlsSessionLifetime,
        dhparam: n.dhparam,
        ecdhCurve: n.ecdhCurve,
        crl: n.certificateRevocationLists,
        // HTTP options
        lookup: t.dnsLookup ?? ((e = t.dnsCache) == null ? void 0 : e.lookup),
        family: t.dnsLookupIpVersion,
        agent: i,
        setHost: t.setHost,
        method: t.method,
        maxHeaderSize: t.maxHeaderSize,
        localAddress: t.localAddress,
        headers: t.headers,
        createConnection: t.createConnection,
        timeout: t.http2 ? GR(t) : void 0,
        // HTTP/2 options
        h2session: t.h2session
      };
    }
    getRequestFunction() {
      let e = this._internals.url, { request: t } = this._internals;
      return !t && e ? this.getFallbackRequestFunction() : t;
    }
    getFallbackRequestFunction() {
      let e = this._internals.url;
      if (e) {
        if (e.protocol === "https:") {
          if (this._internals.http2) {
            if (R0 < 15 || R0 === 15 && UR < 10) {
              let t = new Error("To use the `http2` option, install Node.js 15.10.0 or above");
              throw t.code = "EUNSUPPORTED", t;
            }
            return LR.default.auto;
          }
          return RR.default.request;
        }
        return AR.default.request;
      }
    }
    freeze() {
      let e = this._internals;
      Object.freeze(e), Object.freeze(e.hooks), Object.freeze(e.hooks.afterResponse), Object.freeze(e.hooks.beforeError), Object.freeze(e.hooks.
      beforeRedirect), Object.freeze(e.hooks.beforeRequest), Object.freeze(e.hooks.beforeRetry), Object.freeze(e.hooks.init), Object.freeze(
      e.https), Object.freeze(e.cacheOptions), Object.freeze(e.agent), Object.freeze(e.headers), Object.freeze(e.timeout), Object.freeze(e.retry),
      Object.freeze(e.retry.errorCodes), Object.freeze(e.retry.methods), Object.freeze(e.retry.statusCodes);
    }
  }, Yo = /* @__PURE__ */ s((e) => {
    let { statusCode: t } = e, r = e.request.options.followRedirect ? 299 : 399;
    return t >= 200 && t <= r || t === 304;
  }, "isResponseOk"), O0 = class extends Te {
    static {
      s(this, "ParseError");
    }
    constructor(e, t) {
      let { options: r } = t.request;
      super(`${e.message} in "${r.url.toString()}"`, e, t.request), this.name = "ParseError", this.code = "ERR_BODY_PARSE_FAILURE";
    }
  }, B0 = /* @__PURE__ */ s((e, t, r, i) => {
    let { rawBody: n } = e;
    try {
      if (t === "text")
        return n.toString(i);
      if (t === "json")
        return n.length === 0 ? "" : r(n.toString(i));
      if (t === "buffer")
        return n;
    } catch (o) {
      throw new O0(o, e);
    }
    throw new O0({
      message: `Unknown body type '${t}'`,
      name: "Error"
    }, e);
  }, "parseBody");
  function KR(e) {
    return e.writable && !e.writableEnded;
  }
  s(KR, "isClientRequest");
  var YR = KR;
  function P0(e) {
    return e.protocol === "unix:" || e.hostname === "unix";
  }
  s(P0, "isUnixSocketURL");
  var JR = m.string(ev.default.versions.brotli), XR = /* @__PURE__ */ new Set(["GET", "HEAD"]), $c = new CR(), QR = /* @__PURE__ */ new Set(
  [300, 301, 302, 303, 304, 307, 308]), ek = [
    "socket",
    "connect",
    "continue",
    "information",
    "upgrade"
  ], Go = /* @__PURE__ */ s(() => {
  }, "noop2"), Gc = class extends M3.Duplex {
    static {
      s(this, "Request");
    }
    constructor(e, t, r) {
      super({
        // Don't destroy immediately, as the error may be emitted on unsuccessful retry
        autoDestroy: !1,
        // It needs to be zero because we're just proxying the data to another stream
        highWaterMark: 0
      }), Object.defineProperty(this, "constructor", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_noPipe", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "options", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "response", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "requestUrl", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "redirectUrls", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "retryCount", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_stopRetry", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_downloadedSize", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_uploadedSize", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_stopReading", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_pipedServerResponses", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_request", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_responseSize", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_bodySize", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_unproxyEvents", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_isFromCache", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_cannotHaveBody", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_triggerRead", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_cancelTimeouts", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_removeListeners", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_nativeResponse", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_flushed", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_aborted", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "_requestInitialized", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), this._downloadedSize = 0, this._uploadedSize = 0, this._stopReading = !1, this._pipedServerResponses = /* @__PURE__ */ new Set(), this.
      _cannotHaveBody = !1, this._unproxyEvents = Go, this._triggerRead = !1, this._cancelTimeouts = Go, this._removeListeners = Go, this._jobs =
      [], this._flushed = !1, this._requestInitialized = !1, this._aborted = !1, this.redirectUrls = [], this.retryCount = 0, this._stopRetry =
      Go, this.on("pipe", (n) => {
        n.headers && Object.assign(this.options.headers, n.headers);
      }), this.on("newListener", (n) => {
        if (n === "retry" && this.listenerCount("retry") > 0)
          throw new Error("A retry listener has been attached already.");
      });
      try {
        if (this.options = new Ut(e, t, r), !this.options.url) {
          if (this.options.prefixUrl === "")
            throw new TypeError("Missing `url` property");
          this.options.url = "";
        }
        this.requestUrl = this.options.url;
      } catch (n) {
        let { options: o } = n;
        o && (this.options = o), this.flush = async () => {
          this.flush = async () => {
          }, this.destroy(n);
        };
        return;
      }
      let { body: i } = this.options;
      if (m.nodeStream(i) && i.once("error", (n) => {
        this._flushed ? this._beforeError(new h0(n, this)) : this.flush = async () => {
          this.flush = async () => {
          }, this._beforeError(new h0(n, this));
        };
      }), this.options.signal) {
        let n = /* @__PURE__ */ s(() => {
          this.destroy(new I3(this));
        }, "abort");
        this.options.signal.aborted ? n() : (this.options.signal.addEventListener("abort", n), this._removeListeners = () => {
          this.options.signal.removeEventListener("abort", n);
        });
      }
    }
    async flush() {
      var e;
      if (!this._flushed) {
        this._flushed = !0;
        try {
          if (await this._finalizeBody(), this.destroyed)
            return;
          if (await this._makeRequest(), this.destroyed) {
            (e = this._request) == null || e.destroy();
            return;
          }
          for (let t of this._jobs)
            t();
          this._jobs.length = 0, this._requestInitialized = !0;
        } catch (t) {
          this._beforeError(t);
        }
      }
    }
    _beforeError(e) {
      if (this._stopReading)
        return;
      let { response: t, options: r } = this, i = this.retryCount + (e.name === "RetryError" ? 0 : 1);
      this._stopReading = !0, e instanceof Te || (e = new Te(e.message, e, this));
      let n = e;
      (async () => {
        var o, a;
        if (t?.readable && !t.rawBody && !((a = (o = this._request) == null ? void 0 : o.socket) != null && a.destroyed) && (t.setEncoding(this.
        readableEncoding), await this._setRawBody(t) && (t.body = t.rawBody.toString())), this.listenerCount("retry") !== 0) {
          let u;
          try {
            let l;
            t && "retry-after" in t.headers && (l = Number(t.headers["retry-after"]), Number.isNaN(l) ? (l = Date.parse(t.headers["retry-aft\
er"]) - Date.now(), l <= 0 && (l = 1)) : l *= 1e3);
            let c = r.retry;
            u = await c.calculateDelay({
              attemptCount: i,
              retryOptions: c,
              error: n,
              retryAfter: l,
              computedValue: FR({
                attemptCount: i,
                retryOptions: c,
                error: n,
                retryAfter: l,
                computedValue: c.maxRetryAfter ?? r.timeout.request ?? Number.POSITIVE_INFINITY
              })
            });
          } catch (l) {
            this._error(new Te(l.message, l, this));
            return;
          }
          if (u) {
            if (await new Promise((l) => {
              let c = setTimeout(l, u);
              this._stopRetry = () => {
                clearTimeout(c), l();
              };
            }), this.destroyed)
              return;
            try {
              for (let l of this.options.hooks.beforeRetry)
                await l(n, this.retryCount + 1);
            } catch (l) {
              this._error(new Te(l.message, e, this));
              return;
            }
            if (this.destroyed)
              return;
            this.destroy(), this.emit("retry", this.retryCount + 1, e, (l) => {
              let c = new Gc(r.url, l, r);
              return c.retryCount = this.retryCount + 1, ev.default.nextTick(() => {
                c.flush();
              }), c;
            });
            return;
          }
        }
        this._error(n);
      })();
    }
    _read() {
      this._triggerRead = !0;
      let { response: e } = this;
      if (e && !this._stopReading) {
        e.readableLength && (this._triggerRead = !1);
        let t;
        for (; (t = e.read()) !== null; ) {
          this._downloadedSize += t.length;
          let r = this.downloadProgress;
          r.percent < 1 && this.emit("downloadProgress", r), this.push(t);
        }
      }
    }
    _write(e, t, r) {
      let i = /* @__PURE__ */ s(() => {
        this._writeRequest(e, t, r);
      }, "write");
      this._requestInitialized ? i() : this._jobs.push(i);
    }
    _final(e) {
      let t = /* @__PURE__ */ s(() => {
        if (!this._request || this._request.destroyed) {
          e();
          return;
        }
        this._request.end((r) => {
          var i;
          (i = this._request._writableState) != null && i.errored || (r || (this._bodySize = this._uploadedSize, this.emit("uploadProgress",
          this.uploadProgress), this._request.emit("upload-complete")), e(r));
        });
      }, "endRequest");
      this._requestInitialized ? t() : this._jobs.push(t);
    }
    _destroy(e, t) {
      if (this._stopReading = !0, this.flush = async () => {
      }, this._stopRetry(), this._cancelTimeouts(), this._removeListeners(), this.options) {
        let { body: r } = this.options;
        m.nodeStream(r) && r.destroy();
      }
      this._request && this._request.destroy(), e !== null && !m.undefined(e) && !(e instanceof Te) && (e = new Te(e.message, e, this)), t(e);
    }
    pipe(e, t) {
      return e instanceof Ic.ServerResponse && this._pipedServerResponses.add(e), super.pipe(e, t);
    }
    unpipe(e) {
      return e instanceof Ic.ServerResponse && this._pipedServerResponses.delete(e), super.unpipe(e), this;
    }
    async _finalizeBody() {
      let { options: e } = this, { headers: t } = e, r = !m.undefined(e.form), i = !m.undefined(e.json), n = !m.undefined(e.body), o = XR.has(
      e.method) && !(e.method === "GET" && e.allowGetBody);
      if (this._cannotHaveBody = o, r || i || n) {
        if (o)
          throw new TypeError(`The \`${e.method}\` method cannot be used with a body`);
        let a = !m.string(t["content-type"]);
        if (n) {
          if (zc(e.body)) {
            let l = new DR(e.body);
            a && (t["content-type"] = l.headers["Content-Type"]), "Content-Length" in l.headers && (t["content-length"] = l.headers["Content\
-Length"]), e.body = l.encode();
          }
          rv(e.body) && a && (t["content-type"] = `multipart/form-data; boundary=${e.body.getBoundary()}`);
        } else if (r) {
          a && (t["content-type"] = "application/x-www-form-urlencoded");
          let { form: l } = e;
          e.form = void 0, e.body = new D0.URLSearchParams(l).toString();
        } else {
          a && (t["content-type"] = "application/json");
          let { json: l } = e;
          e.json = void 0, e.body = e.stringifyJson(l);
        }
        let u = await yR(e.body, e.headers);
        m.undefined(t["content-length"]) && m.undefined(t["transfer-encoding"]) && !o && !m.undefined(u) && (t["content-length"] = String(u));
      }
      e.responseType === "json" && !("accept" in e.headers) && (e.headers.accept = "application/json"), this._bodySize = Number(t["content-l\
ength"]) || void 0;
    }
    async _onResponseBase(e) {
      if (this.isAborted)
        return;
      let { options: t } = this, { url: r } = t;
      this._nativeResponse = e, t.decompress && (e = (0, oR.default)(e));
      let i = e.statusCode, n = e;
      n.statusMessage = n.statusMessage ? n.statusMessage : Ic.default.STATUS_CODES[i], n.url = t.url.toString(), n.requestUrl = this.requestUrl,
      n.redirectUrls = this.redirectUrls, n.request = this, n.isFromCache = this._nativeResponse.fromCache ?? !1, n.ip = this.ip, n.retryCount =
      this.retryCount, n.ok = Yo(n), this._isFromCache = n.isFromCache, this._responseSize = Number(e.headers["content-length"]) || void 0, this.
      response = n, e.once("end", () => {
        this._responseSize = this._downloadedSize, this.emit("downloadProgress", this.downloadProgress);
      }), e.once("error", (a) => {
        this._aborted = !0, e.destroy(), this._beforeError(new p0(a, this));
      }), e.once("aborted", () => {
        this._aborted = !0, this._beforeError(new p0({
          name: "Error",
          message: "The server aborted pending request",
          code: "ECONNRESET"
        }, this));
      }), this.emit("downloadProgress", this.downloadProgress);
      let o = e.headers["set-cookie"];
      if (m.object(t.cookieJar) && o) {
        let a = o.map(async (u) => t.cookieJar.setCookie(u, r.toString()));
        t.ignoreInvalidCookies && (a = a.map(async (u) => {
          try {
            await u;
          } catch {
          }
        }));
        try {
          await Promise.all(a);
        } catch (u) {
          this._beforeError(u);
          return;
        }
      }
      if (!this.isAborted) {
        if (t.followRedirect && e.headers.location && QR.has(i)) {
          if (e.resume(), this._cancelTimeouts(), this._unproxyEvents(), this.redirectUrls.length >= t.maxRedirects) {
            this._beforeError(new k3(this));
            return;
          }
          this._request = void 0;
          let a = new Ut(void 0, void 0, this.options), u = i === 303 && a.method !== "GET" && a.method !== "HEAD", l = i !== 307 && i !== 308,
          c = a.methodRewriting && l;
          (u || c) && (a.method = "GET", a.body = void 0, a.json = void 0, a.form = void 0, delete a.headers["content-length"]);
          try {
            let d = Pc.Buffer.from(e.headers.location, "binary").toString(), p = new D0.URL(d, r);
            if (!P0(r) && P0(p)) {
              this._beforeError(new Te("Cannot redirect to UNIX socket", {}, this));
              return;
            }
            p.hostname !== r.hostname || p.port !== r.port ? ("host" in a.headers && delete a.headers.host, "cookie" in a.headers && delete a.
            headers.cookie, "authorization" in a.headers && delete a.headers.authorization, (a.username || a.password) && (a.username = "", a.
            password = "")) : (p.username = a.username, p.password = a.password), this.redirectUrls.push(p), a.prefixUrl = "", a.url = p;
            for (let h of a.hooks.beforeRedirect)
              await h(a, n);
            this.emit("redirect", a, n), this.options = a, await this._makeRequest();
          } catch (d) {
            this._beforeError(d);
            return;
          }
          return;
        }
        if (t.isStream && t.throwHttpErrors && !Yo(n)) {
          this._beforeError(new Ko(n));
          return;
        }
        if (e.on("readable", () => {
          this._triggerRead && this._read();
        }), this.on("resume", () => {
          e.resume();
        }), this.on("pause", () => {
          e.pause();
        }), e.once("end", () => {
          this.push(null);
        }), this._noPipe) {
          await this._setRawBody() && this.emit("response", e);
          return;
        }
        this.emit("response", e);
        for (let a of this._pipedServerResponses)
          if (!a.headersSent) {
            for (let u in e.headers) {
              let l = t.decompress ? u !== "content-encoding" : !0, c = e.headers[u];
              l && a.setHeader(u, c);
            }
            a.statusCode = i;
          }
      }
    }
    async _setRawBody(e = this) {
      if (e.readableEnded)
        return !1;
      try {
        let t = await (0, aR.buffer)(e);
        if (!this.isAborted)
          return this.response.rawBody = t, !0;
      } catch {
      }
      return !1;
    }
    async _onResponse(e) {
      try {
        await this._onResponseBase(e);
      } catch (t) {
        this._beforeError(t);
      }
    }
    _onRequest(e) {
      let { options: t } = this, { timeout: r, url: i } = t;
      U3(e), this.options.http2 && e.setTimeout(0), this._cancelTimeouts = wR(e, r, i);
      let n = t.cache ? "cacheableResponse" : "response";
      e.once(n, (o) => {
        this._onResponse(o);
      }), e.once("error", (o) => {
        this._aborted = !0, e.destroy(), o = o instanceof nv ? new B3(o, this.timings, this) : new Te(o.message, o, this), this._beforeError(
        o);
      }), this._unproxyEvents = iv(e, this, ek), this._request = e, this.emit("uploadProgress", this.uploadProgress), this._sendBody(), this.
      emit("request", e);
    }
    async _asyncWrite(e) {
      return new Promise((t, r) => {
        super.write(e, (i) => {
          if (i) {
            r(i);
            return;
          }
          t();
        });
      });
    }
    _sendBody() {
      let { body: e } = this.options, t = this.redirectUrls.length === 0 ? this : this._request ?? this;
      m.nodeStream(e) ? e.pipe(t) : m.generator(e) || m.asyncGenerator(e) ? (async () => {
        try {
          for await (let r of e)
            await this._asyncWrite(r);
          super.end();
        } catch (r) {
          this._beforeError(r);
        }
      })() : m.undefined(e) ? (this._cannotHaveBody || this._noPipe) && t.end() : (this._writeRequest(e, void 0, () => {
      }), t.end());
    }
    _prepareCache(e) {
      if (!$c.has(e)) {
        let t = new sR((r, i) => {
          let n = r._request(r, i);
          return m.promise(n) && (n.once = (o, a) => {
            if (o === "error")
              (async () => {
                try {
                  await n;
                } catch (u) {
                  a(u);
                }
              })();
            else if (o === "abort")
              (async () => {
                try {
                  (await n).once("abort", a);
                } catch {
                }
              })();
            else
              throw new Error(`Unknown HTTP2 promise event: ${o}`);
            return n;
          }), n;
        }, e);
        $c.set(e, t.request());
      }
    }
    async _createCacheableRequest(e, t) {
      return new Promise((r, i) => {
        Object.assign(t, ER(e));
        let n, o = $c.get(t.cache)(t, async (a) => {
          if (a._readableState.autoDestroy = !1, n) {
            let u = /* @__PURE__ */ s(() => {
              a.req && (a.complete = a.req.res.complete);
            }, "fix");
            a.prependOnceListener("end", u), u(), (await n).emit("cacheableResponse", a);
          }
          r(a);
        });
        o.once("error", i), o.once("request", async (a) => {
          n = a, r(n);
        });
      });
    }
    async _makeRequest() {
      let { options: e } = this, { headers: t, username: r, password: i } = e, n = e.cookieJar;
      for (let l in t)
        if (m.undefined(t[l]))
          delete t[l];
        else if (m.null_(t[l]))
          throw new TypeError(`Use \`undefined\` instead of \`null\` to delete the \`${l}\` header`);
      if (e.decompress && m.undefined(t["accept-encoding"]) && (t["accept-encoding"] = JR ? "gzip, deflate, br" : "gzip, deflate"), r || i) {
        let l = Pc.Buffer.from(`${r}:${i}`).toString("base64");
        t.authorization = `Basic ${l}`;
      }
      if (n) {
        let l = await n.getCookieString(e.url.toString());
        m.nonEmptyString(l) && (t.cookie = l);
      }
      e.prefixUrl = "";
      let o;
      for (let l of e.hooks.beforeRequest) {
        let c = await l(e);
        if (!m.undefined(c)) {
          o = /* @__PURE__ */ s(() => c, "request");
          break;
        }
      }
      o || (o = e.getRequestFunction());
      let a = e.url;
      this._requestOptions = e.createNativeRequestOptions(), e.cache && (this._requestOptions._request = o, this._requestOptions.cache = e.cache,
      this._requestOptions.body = e.body, this._prepareCache(e.cache));
      let u = e.cache ? this._createCacheableRequest : o;
      try {
        let l = u(a, this._requestOptions);
        m.promise(l) && (l = await l), m.undefined(l) && (l = e.getFallbackRequestFunction()(a, this._requestOptions), m.promise(l) && (l = await l)),
        YR(l) ? this._onRequest(l) : this.writable ? (this.once("finish", () => {
          this._onResponse(l);
        }), this._sendBody()) : this._onResponse(l);
      } catch (l) {
        throw l instanceof $n ? new O3(l, this) : l;
      }
    }
    async _error(e) {
      try {
        if (!(e instanceof Ko && !this.options.throwHttpErrors))
          for (let t of this.options.hooks.beforeError)
            e = await t(e);
      } catch (t) {
        e = new Te(t.message, t, this);
      }
      this.destroy(e);
    }
    _writeRequest(e, t, r) {
      !this._request || this._request.destroyed || this._request.write(e, t, (i) => {
        if (!i && !this._request.destroyed) {
          this._uploadedSize += Pc.Buffer.byteLength(e, t);
          let n = this.uploadProgress;
          n.percent < 1 && this.emit("uploadProgress", n);
        }
        r(i);
      });
    }
    /**
    The remote IP address.
    */
    get ip() {
      var e;
      return (e = this.socket) == null ? void 0 : e.remoteAddress;
    }
    /**
    Indicates whether the request has been aborted or not.
    */
    get isAborted() {
      return this._aborted;
    }
    get socket() {
      var e;
      return ((e = this._request) == null ? void 0 : e.socket) ?? void 0;
    }
    /**
    Progress event for downloading (receiving a response).
    */
    get downloadProgress() {
      let e;
      return this._responseSize ? e = this._downloadedSize / this._responseSize : this._responseSize === this._downloadedSize ? e = 1 : e = 0,
      {
        percent: e,
        transferred: this._downloadedSize,
        total: this._responseSize
      };
    }
    /**
    Progress event for uploading (sending a request).
    */
    get uploadProgress() {
      let e;
      return this._bodySize ? e = this._uploadedSize / this._bodySize : this._bodySize === this._uploadedSize ? e = 1 : e = 0, {
        percent: e,
        transferred: this._uploadedSize,
        total: this._bodySize
      };
    }
    /**
        The object contains the following properties:
    
        - `start` - Time when the request started.
        - `socket` - Time when a socket was assigned to the request.
        - `lookup` - Time when the DNS lookup finished.
        - `connect` - Time when the socket successfully connected.
        - `secureConnect` - Time when the socket securely connected.
        - `upload` - Time when the request finished uploading.
        - `response` - Time when the request fired `response` event.
        - `end` - Time when the response fired `end` event.
        - `error` - Time when the request fired `error` event.
        - `abort` - Time when the request fired `abort` event.
        - `phases`
            - `wait` - `timings.socket - timings.start`
            - `dns` - `timings.lookup - timings.socket`
            - `tcp` - `timings.connect - timings.lookup`
            - `tls` - `timings.secureConnect - timings.connect`
            - `request` - `timings.upload - (timings.secureConnect || timings.connect)`
            - `firstByte` - `timings.response - timings.upload`
            - `download` - `timings.end - timings.response`
            - `total` - `(timings.end || timings.error || timings.abort) - timings.start`
    
        If something has not been measured yet, it will be `undefined`.
    
        __Note__: The time is a `number` representing the milliseconds elapsed since the UNIX epoch.
        */
    get timings() {
      var e;
      return (e = this._request) == null ? void 0 : e.timings;
    }
    /**
    Whether the response was retrieved from the cache.
    */
    get isFromCache() {
      return this._isFromCache;
    }
    get reusedSocket() {
      var e;
      return (e = this._request) == null ? void 0 : e.reusedSocket;
    }
  }, tk = class extends Te {
    static {
      s(this, "CancelError2");
    }
    constructor(e) {
      super("Promise was canceled", {}, e), this.name = "CancelError", this.code = "ERR_CANCELED";
    }
    /**
    Whether the promise is canceled.
    */
    get isCanceled() {
      return !0;
    }
  }, rk = [
    "request",
    "response",
    "redirect",
    "uploadProgress",
    "downloadProgress"
  ];
  function I0(e) {
    let t, r, i, n = new T3.EventEmitter(), o = new Zc((u, l, c) => {
      c(() => {
        t.destroy();
      }), c.shouldReject = !1, c(() => {
        l(new tk(t));
      });
      let d = /* @__PURE__ */ s((p) => {
        var h;
        c(() => {
        });
        let f = e ?? new Gc(void 0, void 0, i);
        f.retryCount = p, f._noPipe = !0, t = f, f.once("response", async (_) => {
          let C = (_.headers["content-encoding"] ?? "").toLowerCase(), x = C === "gzip" || C === "deflate" || C === "br", { options: w } = f;
          if (x && !w.decompress)
            _.body = _.rawBody;
          else
            try {
              _.body = B0(_, w.responseType, w.parseJson, w.encoding);
            } catch (T) {
              if (_.body = _.rawBody.toString(), Yo(_)) {
                f._beforeError(T);
                return;
              }
            }
          try {
            let T = w.hooks.afterResponse;
            for (let [S, F] of T.entries())
              if (_ = await F(_, async (I) => {
                throw w.merge(I), w.prefixUrl = "", I.url && (w.url = I.url), w.hooks.afterResponse = w.hooks.afterResponse.slice(0, S), new P3(
                f);
              }), !(m.object(_) && m.number(_.statusCode) && !m.nullOrUndefined(_.body)))
                throw new TypeError("The `afterResponse` hook returned an invalid value");
          } catch (T) {
            f._beforeError(T);
            return;
          }
          if (r = _, !Yo(_)) {
            f._beforeError(new Ko(_));
            return;
          }
          f.destroy(), u(f.options.resolveBodyOnly ? _.body : _);
        });
        let g = /* @__PURE__ */ s((_) => {
          if (o.isCanceled)
            return;
          let { options: C } = f;
          if (_ instanceof Ko && !C.throwHttpErrors) {
            let { response: x } = _;
            f.destroy(), u(f.options.resolveBodyOnly ? x.body : x);
            return;
          }
          l(_);
        }, "onError");
        f.once("error", g);
        let E = (h = f.options) == null ? void 0 : h.body;
        f.once("retry", (_, C) => {
          e = void 0;
          let x = f.options.body;
          if (E === x && m.nodeStream(x)) {
            C.message = "Cannot retry with consumed body stream", g(C);
            return;
          }
          i = f.options, d(_);
        }), iv(f, n, rk), m.undefined(e) && f.flush();
      }, "makeRequest");
      d(0);
    });
    o.on = (u, l) => (n.on(u, l), o), o.off = (u, l) => (n.off(u, l), o);
    let a = /* @__PURE__ */ s((u) => {
      let l = (async () => {
        await o;
        let { options: c } = r.request;
        return B0(r, u, c.parseJson, c.encoding);
      })();
      return Object.defineProperties(l, Object.getOwnPropertyDescriptors(o)), l;
    }, "shortcut");
    return o.json = () => {
      if (t.options) {
        let { headers: u } = t.options;
        !t.writableFinished && !("accept" in u) && (u.accept = "application/json");
      }
      return a("json");
    }, o.buffer = () => a("buffer"), o.text = () => a("text"), o;
  }
  s(I0, "asPromise");
  var ik = /* @__PURE__ */ s(async (e) => new Promise((t) => {
    setTimeout(t, e);
  }), "delay"), nk = /* @__PURE__ */ s((e) => m.function_(e), "isGotInstance"), sk = [
    "get",
    "post",
    "put",
    "patch",
    "head",
    "delete"
  ], sv = /* @__PURE__ */ s((e) => {
    e = {
      options: new Ut(void 0, void 0, e.options),
      handlers: [...e.handlers],
      mutableDefaults: e.mutableDefaults
    }, Object.defineProperty(e, "mutableDefaults", {
      enumerable: !0,
      configurable: !1,
      writable: !1
    });
    let t = /* @__PURE__ */ s((i, n, o = e.options) => {
      let a = new Gc(i, n, o), u, l = /* @__PURE__ */ s((p) => (a.options = p, a._noPipe = !p.isStream, a.flush(), p.isStream ? a : (u || (u =
      I0(a)), u)), "lastHandler"), c = 0, d = /* @__PURE__ */ s((p) => {
        let f = (e.handlers[c++] ?? l)(p, d);
        if (m.promise(f) && !a.options.isStream && (u || (u = I0(a)), f !== u)) {
          let g = Object.getOwnPropertyDescriptors(u);
          for (let E in g)
            E in f && delete g[E];
          Object.defineProperties(f, g), f.cancel = u.cancel;
        }
        return f;
      }, "iterateHandlers");
      return d(a.options);
    }, "got2");
    t.extend = (...i) => {
      let n = new Ut(void 0, void 0, e.options), o = [...e.handlers], a;
      for (let u of i)
        nk(u) ? (n.merge(u.defaults.options), o.push(...u.defaults.handlers), a = u.defaults.mutableDefaults) : (n.merge(u), u.handlers && o.
        push(...u.handlers), a = u.mutableDefaults);
      return sv({
        options: n,
        handlers: o,
        mutableDefaults: !!a
      });
    };
    let r = /* @__PURE__ */ s(async function* (i, n) {
      let o = new Ut(i, n, e.options);
      o.resolveBodyOnly = !1;
      let { pagination: a } = o;
      A.function_(a.transform), A.function_(a.shouldContinue), A.function_(a.filter), A.function_(a.paginate), A.number(a.countLimit), A.number(
      a.requestLimit), A.number(a.backoff);
      let u = [], { countLimit: l } = a, c = 0;
      for (; c < a.requestLimit; ) {
        c !== 0 && await ik(a.backoff);
        let d = await t(void 0, void 0, o), p = await a.transform(d), h = [];
        A.array(p);
        for (let g of p)
          if (a.filter({ item: g, currentItems: h, allItems: u }) && (!a.shouldContinue({ item: g, currentItems: h, allItems: u }) || (yield g,
          a.stackAllItems && u.push(g), h.push(g), --l <= 0)))
            return;
        let f = a.paginate({
          response: d,
          currentItems: h,
          allItems: u
        });
        if (f === !1)
          return;
        f === d.request.options ? o = d.request.options : (o.merge(f), A.any([m.urlInstance, m.undefined], f.url), f.url !== void 0 && (o.prefixUrl =
        "", o.url = f.url)), c++;
      }
    }, "paginateEach");
    t.paginate = r, t.paginate.all = async (i, n) => {
      let o = [];
      for await (let a of r(i, n))
        o.push(a);
      return o;
    }, t.paginate.each = r, t.stream = (i, n) => t(i, { ...n, isStream: !0 });
    for (let i of sk)
      t[i] = (n, o) => t(n, { ...o, method: i }), t.stream[i] = (n, o) => t(n, { ...o, method: i, isStream: !0 });
    return e.mutableDefaults || (Object.freeze(e.handlers), e.options.freeze()), Object.defineProperty(t, "defaults", {
      value: e,
      writable: !1,
      configurable: !1,
      enumerable: !0
    }), t;
  }, "create"), ok = sv, ak = {
    options: new Ut(),
    handlers: [],
    mutableDefaults: !1
  }, uk = ok(ak), lk = uk, ck = Fe(Vu()), dk = bg(), fk = Fe(f0()), M0 = {
    keepAlive: !0,
    maxSockets: 20
  }, hk = {
    http: new p3.Agent(M0),
    https: new D3.Agent(M0)
  };
  async function pk({ url: e, gotOpts: t, extractOpts: r, dir: i }) {
    return new Promise((n, o) => {
      let a = /* @__PURE__ */ s((u) => {
        u ? o(u) : n();
      }, "callback");
      (0, ck.default)(
        lk.stream(e, Object.assign({ agent: hk }, t)),
        (0, fk.default)(),
        (0, dk.extract)(i, r),
        a
      );
    });
  }
  s(pk, "download");
});

// ../node_modules/get-npm-tarball-url/lib/index.js
var cv = b((Tq, lv) => {
  var Kc = Object.defineProperty, Dk = Object.getOwnPropertyDescriptor, mk = Object.getOwnPropertyNames, gk = Object.prototype.hasOwnProperty,
  yk = /* @__PURE__ */ s((e, t) => {
    for (var r in t)
      Kc(e, r, { get: t[r], enumerable: !0 });
  }, "__export"), bk = /* @__PURE__ */ s((e, t, r, i) => {
    if (t && typeof t == "object" || typeof t == "function")
      for (let n of mk(t))
        !gk.call(e, n) && n !== r && Kc(e, n, { get: /* @__PURE__ */ s(() => t[n], "get"), enumerable: !(i = Dk(t, n)) || i.enumerable });
    return e;
  }, "__copyProps"), vk = /* @__PURE__ */ s((e) => bk(Kc({}, "__esModule", { value: !0 }), e), "__toCommonJS"), uv = {};
  yk(uv, {
    default: /* @__PURE__ */ s(() => _k, "default")
  });
  lv.exports = vk(uv);
  function _k(e, t, r) {
    let i;
    r?.registry ? i = r.registry.endsWith("/") ? r.registry : `${r.registry}/` : i = "https://registry.npmjs.org/";
    let n = Ek(e);
    return `${i}${e}/-/${n}-${wk(t)}.tgz`;
  }
  s(_k, "src_default");
  function wk(e) {
    let t = e.indexOf("+");
    return t === -1 ? e : e.substring(0, t);
  }
  s(wk, "removeBuildMetadataFromVersion");
  function Ek(e) {
    return e[0] !== "@" ? e : e.split("/")[1];
  }
  s(Ek, "getScopelessName");
});

// ../node_modules/eastasianwidth/eastasianwidth.js
var ra = b((Xq, od) => {
  var sr = {};
  typeof od > "u" ? window.eastasianwidth = sr : od.exports = sr;
  sr.eastAsianWidth = function(e) {
    var t = e.charCodeAt(0), r = e.length == 2 ? e.charCodeAt(1) : 0, i = t;
    return 55296 <= t && t <= 56319 && 56320 <= r && r <= 57343 && (t &= 1023, r &= 1023, i = t << 10 | r, i += 65536), i == 12288 || 65281 <=
    i && i <= 65376 || 65504 <= i && i <= 65510 ? "F" : i == 8361 || 65377 <= i && i <= 65470 || 65474 <= i && i <= 65479 || 65482 <= i && i <=
    65487 || 65490 <= i && i <= 65495 || 65498 <= i && i <= 65500 || 65512 <= i && i <= 65518 ? "H" : 4352 <= i && i <= 4447 || 4515 <= i &&
    i <= 4519 || 4602 <= i && i <= 4607 || 9001 <= i && i <= 9002 || 11904 <= i && i <= 11929 || 11931 <= i && i <= 12019 || 12032 <= i && i <=
    12245 || 12272 <= i && i <= 12283 || 12289 <= i && i <= 12350 || 12353 <= i && i <= 12438 || 12441 <= i && i <= 12543 || 12549 <= i && i <=
    12589 || 12593 <= i && i <= 12686 || 12688 <= i && i <= 12730 || 12736 <= i && i <= 12771 || 12784 <= i && i <= 12830 || 12832 <= i && i <=
    12871 || 12880 <= i && i <= 13054 || 13056 <= i && i <= 19903 || 19968 <= i && i <= 42124 || 42128 <= i && i <= 42182 || 43360 <= i && i <=
    43388 || 44032 <= i && i <= 55203 || 55216 <= i && i <= 55238 || 55243 <= i && i <= 55291 || 63744 <= i && i <= 64255 || 65040 <= i && i <=
    65049 || 65072 <= i && i <= 65106 || 65108 <= i && i <= 65126 || 65128 <= i && i <= 65131 || 110592 <= i && i <= 110593 || 127488 <= i &&
    i <= 127490 || 127504 <= i && i <= 127546 || 127552 <= i && i <= 127560 || 127568 <= i && i <= 127569 || 131072 <= i && i <= 194367 || 177984 <=
    i && i <= 196605 || 196608 <= i && i <= 262141 ? "W" : 32 <= i && i <= 126 || 162 <= i && i <= 163 || 165 <= i && i <= 166 || i == 172 ||
    i == 175 || 10214 <= i && i <= 10221 || 10629 <= i && i <= 10630 ? "Na" : i == 161 || i == 164 || 167 <= i && i <= 168 || i == 170 || 173 <=
    i && i <= 174 || 176 <= i && i <= 180 || 182 <= i && i <= 186 || 188 <= i && i <= 191 || i == 198 || i == 208 || 215 <= i && i <= 216 ||
    222 <= i && i <= 225 || i == 230 || 232 <= i && i <= 234 || 236 <= i && i <= 237 || i == 240 || 242 <= i && i <= 243 || 247 <= i && i <=
    250 || i == 252 || i == 254 || i == 257 || i == 273 || i == 275 || i == 283 || 294 <= i && i <= 295 || i == 299 || 305 <= i && i <= 307 ||
    i == 312 || 319 <= i && i <= 322 || i == 324 || 328 <= i && i <= 331 || i == 333 || 338 <= i && i <= 339 || 358 <= i && i <= 359 || i ==
    363 || i == 462 || i == 464 || i == 466 || i == 468 || i == 470 || i == 472 || i == 474 || i == 476 || i == 593 || i == 609 || i == 708 ||
    i == 711 || 713 <= i && i <= 715 || i == 717 || i == 720 || 728 <= i && i <= 731 || i == 733 || i == 735 || 768 <= i && i <= 879 || 913 <=
    i && i <= 929 || 931 <= i && i <= 937 || 945 <= i && i <= 961 || 963 <= i && i <= 969 || i == 1025 || 1040 <= i && i <= 1103 || i == 1105 ||
    i == 8208 || 8211 <= i && i <= 8214 || 8216 <= i && i <= 8217 || 8220 <= i && i <= 8221 || 8224 <= i && i <= 8226 || 8228 <= i && i <= 8231 ||
    i == 8240 || 8242 <= i && i <= 8243 || i == 8245 || i == 8251 || i == 8254 || i == 8308 || i == 8319 || 8321 <= i && i <= 8324 || i == 8364 ||
    i == 8451 || i == 8453 || i == 8457 || i == 8467 || i == 8470 || 8481 <= i && i <= 8482 || i == 8486 || i == 8491 || 8531 <= i && i <= 8532 ||
    8539 <= i && i <= 8542 || 8544 <= i && i <= 8555 || 8560 <= i && i <= 8569 || i == 8585 || 8592 <= i && i <= 8601 || 8632 <= i && i <= 8633 ||
    i == 8658 || i == 8660 || i == 8679 || i == 8704 || 8706 <= i && i <= 8707 || 8711 <= i && i <= 8712 || i == 8715 || i == 8719 || i == 8721 ||
    i == 8725 || i == 8730 || 8733 <= i && i <= 8736 || i == 8739 || i == 8741 || 8743 <= i && i <= 8748 || i == 8750 || 8756 <= i && i <= 8759 ||
    8764 <= i && i <= 8765 || i == 8776 || i == 8780 || i == 8786 || 8800 <= i && i <= 8801 || 8804 <= i && i <= 8807 || 8810 <= i && i <= 8811 ||
    8814 <= i && i <= 8815 || 8834 <= i && i <= 8835 || 8838 <= i && i <= 8839 || i == 8853 || i == 8857 || i == 8869 || i == 8895 || i == 8978 ||
    9312 <= i && i <= 9449 || 9451 <= i && i <= 9547 || 9552 <= i && i <= 9587 || 9600 <= i && i <= 9615 || 9618 <= i && i <= 9621 || 9632 <=
    i && i <= 9633 || 9635 <= i && i <= 9641 || 9650 <= i && i <= 9651 || 9654 <= i && i <= 9655 || 9660 <= i && i <= 9661 || 9664 <= i && i <=
    9665 || 9670 <= i && i <= 9672 || i == 9675 || 9678 <= i && i <= 9681 || 9698 <= i && i <= 9701 || i == 9711 || 9733 <= i && i <= 9734 ||
    i == 9737 || 9742 <= i && i <= 9743 || 9748 <= i && i <= 9749 || i == 9756 || i == 9758 || i == 9792 || i == 9794 || 9824 <= i && i <= 9825 ||
    9827 <= i && i <= 9829 || 9831 <= i && i <= 9834 || 9836 <= i && i <= 9837 || i == 9839 || 9886 <= i && i <= 9887 || 9918 <= i && i <= 9919 ||
    9924 <= i && i <= 9933 || 9935 <= i && i <= 9953 || i == 9955 || 9960 <= i && i <= 9983 || i == 10045 || i == 10071 || 10102 <= i && i <=
    10111 || 11093 <= i && i <= 11097 || 12872 <= i && i <= 12879 || 57344 <= i && i <= 63743 || 65024 <= i && i <= 65039 || i == 65533 || 127232 <=
    i && i <= 127242 || 127248 <= i && i <= 127277 || 127280 <= i && i <= 127337 || 127344 <= i && i <= 127386 || 917760 <= i && i <= 917999 ||
    983040 <= i && i <= 1048573 || 1048576 <= i && i <= 1114109 ? "A" : "N";
  };
  sr.characterLength = function(e) {
    var t = this.eastAsianWidth(e);
    return t == "F" || t == "W" || t == "A" ? 2 : 1;
  };
  function Cv(e) {
    return e.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
  }
  s(Cv, "stringToArray");
  sr.length = function(e) {
    for (var t = Cv(e), r = 0, i = 0; i < t.length; i++)
      r = r + this.characterLength(t[i]);
    return r;
  };
  sr.slice = function(e, t, r) {
    textLen = sr.length(e), t = t || 0, r = r || 1, t < 0 && (t = textLen + t), r < 0 && (r = textLen + r);
    for (var i = "", n = 0, o = Cv(e), a = 0; a < o.length; a++) {
      var u = o[a], l = sr.length(u);
      if (n >= t - (l == 2 ? 1 : 0))
        if (n + l <= r)
          i += u;
        else
          break;
      n += l;
    }
    return i;
  };
});

// ../node_modules/emoji-regex/index.js
var ia = b((eL, xv) => {
  "use strict";
  xv.exports = function() {
    return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
  };
});

// ../node_modules/cli-boxes/boxes.json
var Uv = b((CL, hO) => {
  hO.exports = {
    single: {
      topLeft: "\u250C",
      top: "\u2500",
      topRight: "\u2510",
      right: "\u2502",
      bottomRight: "\u2518",
      bottom: "\u2500",
      bottomLeft: "\u2514",
      left: "\u2502"
    },
    double: {
      topLeft: "\u2554",
      top: "\u2550",
      topRight: "\u2557",
      right: "\u2551",
      bottomRight: "\u255D",
      bottom: "\u2550",
      bottomLeft: "\u255A",
      left: "\u2551"
    },
    round: {
      topLeft: "\u256D",
      top: "\u2500",
      topRight: "\u256E",
      right: "\u2502",
      bottomRight: "\u256F",
      bottom: "\u2500",
      bottomLeft: "\u2570",
      left: "\u2502"
    },
    bold: {
      topLeft: "\u250F",
      top: "\u2501",
      topRight: "\u2513",
      right: "\u2503",
      bottomRight: "\u251B",
      bottom: "\u2501",
      bottomLeft: "\u2517",
      left: "\u2503"
    },
    singleDouble: {
      topLeft: "\u2553",
      top: "\u2500",
      topRight: "\u2556",
      right: "\u2551",
      bottomRight: "\u255C",
      bottom: "\u2500",
      bottomLeft: "\u2559",
      left: "\u2551"
    },
    doubleSingle: {
      topLeft: "\u2552",
      top: "\u2550",
      topRight: "\u2555",
      right: "\u2502",
      bottomRight: "\u255B",
      bottom: "\u2550",
      bottomLeft: "\u2558",
      left: "\u2502"
    },
    classic: {
      topLeft: "+",
      top: "-",
      topRight: "+",
      right: "|",
      bottomRight: "+",
      bottom: "-",
      bottomLeft: "+",
      left: "|"
    },
    arrow: {
      topLeft: "\u2198",
      top: "\u2193",
      topRight: "\u2199",
      right: "\u2190",
      bottomRight: "\u2196",
      bottom: "\u2191",
      bottomLeft: "\u2197",
      left: "\u2192"
    }
  };
});

// ../node_modules/cli-boxes/index.js
var hd = b((xL, fd) => {
  "use strict";
  var Wv = Uv();
  fd.exports = Wv;
  fd.exports.default = Wv;
});

// ../node_modules/string-width/node_modules/ansi-regex/index.js
var Gv = b((TL, zv) => {
  "use strict";
  zv.exports = ({ onlyFirst: e = !1 } = {}) => {
    let t = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
    ].join("|");
    return new RegExp(t, e ? void 0 : "g");
  };
});

// ../node_modules/string-width/node_modules/strip-ansi/index.js
var Yv = b((AL, Kv) => {
  "use strict";
  var vO = Gv();
  Kv.exports = (e) => typeof e == "string" ? e.replace(vO(), "") : e;
});

// ../node_modules/is-fullwidth-code-point/index.js
var Xv = b((RL, md) => {
  "use strict";
  var Jv = /* @__PURE__ */ s((e) => Number.isNaN(e) ? !1 : e >= 4352 && (e <= 4447 || // Hangul Jamo
  e === 9001 || // LEFT-POINTING ANGLE BRACKET
  e === 9002 || // RIGHT-POINTING ANGLE BRACKET
  // CJK Radicals Supplement .. Enclosed CJK Letters and Months
  11904 <= e && e <= 12871 && e !== 12351 || // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
  12880 <= e && e <= 19903 || // CJK Unified Ideographs .. Yi Radicals
  19968 <= e && e <= 42182 || // Hangul Jamo Extended-A
  43360 <= e && e <= 43388 || // Hangul Syllables
  44032 <= e && e <= 55203 || // CJK Compatibility Ideographs
  63744 <= e && e <= 64255 || // Vertical Forms
  65040 <= e && e <= 65049 || // CJK Compatibility Forms .. Small Form Variants
  65072 <= e && e <= 65131 || // Halfwidth and Fullwidth Forms
  65281 <= e && e <= 65376 || 65504 <= e && e <= 65510 || // Kana Supplement
  110592 <= e && e <= 110593 || // Enclosed Ideographic Supplement
  127488 <= e && e <= 127569 || // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
  131072 <= e && e <= 262141), "isFullwidthCodePoint");
  md.exports = Jv;
  md.exports.default = Jv;
});

// ../node_modules/string-width/node_modules/emoji-regex/index.js
var e_ = b((OL, Qv) => {
  "use strict";
  Qv.exports = function() {
    return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
  };
});

// ../node_modules/string-width/index.js
var r_ = b((BL, gd) => {
  "use strict";
  var _O = Yv(), wO = Xv(), EO = e_(), t_ = /* @__PURE__ */ s((e) => {
    if (typeof e != "string" || e.length === 0 || (e = _O(e), e.length === 0))
      return 0;
    e = e.replace(EO(), "  ");
    let t = 0;
    for (let r = 0; r < e.length; r++) {
      let i = e.codePointAt(r);
      i <= 31 || i >= 127 && i <= 159 || i >= 768 && i <= 879 || (i > 65535 && r++, t += wO(i) ? 2 : 1);
    }
    return t;
  }, "stringWidth");
  gd.exports = t_;
  gd.exports.default = t_;
});

// ../node_modules/ansi-align/index.js
var n_ = b((IL, i_) => {
  "use strict";
  var CO = r_();
  function Rr(e, t) {
    if (!e) return e;
    t = t || {};
    let r = t.align || "center";
    if (r === "left") return e;
    let i = t.split || `
`, n = t.pad || " ", o = r !== "right" ? xO : FO, a = !1;
    Array.isArray(e) || (a = !0, e = String(e).split(i));
    let u, l = 0;
    return e = e.map(function(c) {
      return c = String(c), u = CO(c), l = Math.max(u, l), {
        str: c,
        width: u
      };
    }).map(function(c) {
      return new Array(o(l, c.width) + 1).join(n) + c.str;
    }), a ? e.join(i) : e;
  }
  s(Rr, "ansiAlign");
  Rr.left = /* @__PURE__ */ s(function(t) {
    return Rr(t, { align: "left" });
  }, "left");
  Rr.center = /* @__PURE__ */ s(function(t) {
    return Rr(t, { align: "center" });
  }, "center");
  Rr.right = /* @__PURE__ */ s(function(t) {
    return Rr(t, { align: "right" });
  }, "right");
  i_.exports = Rr;
  function xO(e, t) {
    return Math.floor((e - t) / 2);
  }
  s(xO, "halfDiff");
  function FO(e, t) {
    return e - t;
  }
  s(FO, "fullDiff");
});

// ../node_modules/ts-dedent/dist/index.js
var ca = b((Qn) => {
  "use strict";
  Object.defineProperty(Qn, "__esModule", { value: !0 });
  Qn.dedent = void 0;
  function v_(e) {
    for (var t = [], r = 1; r < arguments.length; r++)
      t[r - 1] = arguments[r];
    var i = Array.from(typeof e == "string" ? [e] : e);
    i[i.length - 1] = i[i.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var n = i.reduce(function(u, l) {
      var c = l.match(/\n([\t ]+|(?!\s).)/g);
      return c ? u.concat(c.map(function(d) {
        var p, h;
        return (h = (p = d.match(/[\t ]/g)) === null || p === void 0 ? void 0 : p.length) !== null && h !== void 0 ? h : 0;
      })) : u;
    }, []);
    if (n.length) {
      var o = new RegExp(`
[	 ]{` + Math.min.apply(Math, n) + "}", "g");
      i = i.map(function(u) {
        return u.replace(o, `
`);
      });
    }
    i[0] = i[0].replace(/^\r?\n/, "");
    var a = i[0];
    return t.forEach(function(u, l) {
      var c = a.match(/(?:^|\n)( *)$/), d = c ? c[1] : "", p = u;
      typeof u == "string" && u.includes(`
`) && (p = String(u).split(`
`).map(function(h, f) {
        return f === 0 ? h : "" + d + h;
      }).join(`
`)), a += p + i[l + 1];
    }), a;
  }
  s(v_, "dedent");
  Qn.dedent = v_;
  Qn.default = v_;
});

// ../node_modules/zod/lib/helpers/util.js
var is = b((ue) => {
  "use strict";
  Object.defineProperty(ue, "__esModule", { value: !0 });
  ue.getParsedType = ue.ZodParsedType = ue.objectUtil = ue.util = void 0;
  var Rd;
  (function(e) {
    e.assertEqual = (n) => n;
    function t(n) {
    }
    s(t, "assertIs"), e.assertIs = t;
    function r(n) {
      throw new Error();
    }
    s(r, "assertNever"), e.assertNever = r, e.arrayToEnum = (n) => {
      let o = {};
      for (let a of n)
        o[a] = a;
      return o;
    }, e.getValidEnumValues = (n) => {
      let o = e.objectKeys(n).filter((u) => typeof n[n[u]] != "number"), a = {};
      for (let u of o)
        a[u] = n[u];
      return e.objectValues(a);
    }, e.objectValues = (n) => e.objectKeys(n).map(function(o) {
      return n[o];
    }), e.objectKeys = typeof Object.keys == "function" ? (n) => Object.keys(n) : (n) => {
      let o = [];
      for (let a in n)
        Object.prototype.hasOwnProperty.call(n, a) && o.push(a);
      return o;
    }, e.find = (n, o) => {
      for (let a of n)
        if (o(a))
          return a;
    }, e.isInteger = typeof Number.isInteger == "function" ? (n) => Number.isInteger(n) : (n) => typeof n == "number" && isFinite(n) && Math.
    floor(n) === n;
    function i(n, o = " | ") {
      return n.map((a) => typeof a == "string" ? `'${a}'` : a).join(o);
    }
    s(i, "joinValues"), e.joinValues = i, e.jsonStringifyReplacer = (n, o) => typeof o == "bigint" ? o.toString() : o;
  })(Rd || (ue.util = Rd = {}));
  var k_;
  (function(e) {
    e.mergeShapes = (t, r) => ({
      ...t,
      ...r
      // second overwrites first
    });
  })(k_ || (ue.objectUtil = k_ = {}));
  ue.ZodParsedType = Rd.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var rB = /* @__PURE__ */ s((e) => {
    switch (typeof e) {
      case "undefined":
        return ue.ZodParsedType.undefined;
      case "string":
        return ue.ZodParsedType.string;
      case "number":
        return isNaN(e) ? ue.ZodParsedType.nan : ue.ZodParsedType.number;
      case "boolean":
        return ue.ZodParsedType.boolean;
      case "function":
        return ue.ZodParsedType.function;
      case "bigint":
        return ue.ZodParsedType.bigint;
      case "symbol":
        return ue.ZodParsedType.symbol;
      case "object":
        return Array.isArray(e) ? ue.ZodParsedType.array : e === null ? ue.ZodParsedType.null : e.then && typeof e.then == "function" && e.catch &&
        typeof e.catch == "function" ? ue.ZodParsedType.promise : typeof Map < "u" && e instanceof Map ? ue.ZodParsedType.map : typeof Set <
        "u" && e instanceof Set ? ue.ZodParsedType.set : typeof Date < "u" && e instanceof Date ? ue.ZodParsedType.date : ue.ZodParsedType.object;
      default:
        return ue.ZodParsedType.unknown;
    }
  }, "getParsedType");
  ue.getParsedType = rB;
});

// ../node_modules/zod/lib/ZodError.js
var ha = b((ar) => {
  "use strict";
  Object.defineProperty(ar, "__esModule", { value: !0 });
  ar.ZodError = ar.quotelessJson = ar.ZodIssueCode = void 0;
  var O_ = is();
  ar.ZodIssueCode = O_.util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var iB = /* @__PURE__ */ s((e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:"), "quotelessJson");
  ar.quotelessJson = iB;
  var ns = class e extends Error {
    static {
      s(this, "ZodError");
    }
    get errors() {
      return this.issues;
    }
    constructor(t) {
      super(), this.issues = [], this.addIssue = (i) => {
        this.issues = [...this.issues, i];
      }, this.addIssues = (i = []) => {
        this.issues = [...this.issues, ...i];
      };
      let r = new.target.prototype;
      Object.setPrototypeOf ? Object.setPrototypeOf(this, r) : this.__proto__ = r, this.name = "ZodError", this.issues = t;
    }
    format(t) {
      let r = t || function(o) {
        return o.message;
      }, i = { _errors: [] }, n = /* @__PURE__ */ s((o) => {
        for (let a of o.issues)
          if (a.code === "invalid_union")
            a.unionErrors.map(n);
          else if (a.code === "invalid_return_type")
            n(a.returnTypeError);
          else if (a.code === "invalid_arguments")
            n(a.argumentsError);
          else if (a.path.length === 0)
            i._errors.push(r(a));
          else {
            let u = i, l = 0;
            for (; l < a.path.length; ) {
              let c = a.path[l];
              l === a.path.length - 1 ? (u[c] = u[c] || { _errors: [] }, u[c]._errors.push(r(a))) : u[c] = u[c] || { _errors: [] }, u = u[c],
              l++;
            }
          }
      }, "processError");
      return n(this), i;
    }
    static assert(t) {
      if (!(t instanceof e))
        throw new Error(`Not a ZodError: ${t}`);
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, O_.util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(t = (r) => r.message) {
      let r = {}, i = [];
      for (let n of this.issues)
        n.path.length > 0 ? (r[n.path[0]] = r[n.path[0]] || [], r[n.path[0]].push(t(n))) : i.push(t(n));
      return { formErrors: i, fieldErrors: r };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ar.ZodError = ns;
  ns.create = (e) => new ns(e);
});

// ../node_modules/zod/lib/locales/en.js
var Od = b((kd) => {
  "use strict";
  Object.defineProperty(kd, "__esModule", { value: !0 });
  var Or = is(), qe = ha(), nB = /* @__PURE__ */ s((e, t) => {
    let r;
    switch (e.code) {
      case qe.ZodIssueCode.invalid_type:
        e.received === Or.ZodParsedType.undefined ? r = "Required" : r = `Expected ${e.expected}, received ${e.received}`;
        break;
      case qe.ZodIssueCode.invalid_literal:
        r = `Invalid literal value, expected ${JSON.stringify(e.expected, Or.util.jsonStringifyReplacer)}`;
        break;
      case qe.ZodIssueCode.unrecognized_keys:
        r = `Unrecognized key(s) in object: ${Or.util.joinValues(e.keys, ", ")}`;
        break;
      case qe.ZodIssueCode.invalid_union:
        r = "Invalid input";
        break;
      case qe.ZodIssueCode.invalid_union_discriminator:
        r = `Invalid discriminator value. Expected ${Or.util.joinValues(e.options)}`;
        break;
      case qe.ZodIssueCode.invalid_enum_value:
        r = `Invalid enum value. Expected ${Or.util.joinValues(e.options)}, received '${e.received}'`;
        break;
      case qe.ZodIssueCode.invalid_arguments:
        r = "Invalid function arguments";
        break;
      case qe.ZodIssueCode.invalid_return_type:
        r = "Invalid function return type";
        break;
      case qe.ZodIssueCode.invalid_date:
        r = "Invalid date";
        break;
      case qe.ZodIssueCode.invalid_string:
        typeof e.validation == "object" ? "includes" in e.validation ? (r = `Invalid input: must include "${e.validation.includes}"`, typeof e.
        validation.position == "number" && (r = `${r} at one or more positions greater than or equal to ${e.validation.position}`)) : "start\
sWith" in e.validation ? r = `Invalid input: must start with "${e.validation.startsWith}"` : "endsWith" in e.validation ? r = `Invalid input\
: must end with "${e.validation.endsWith}"` : Or.util.assertNever(e.validation) : e.validation !== "regex" ? r = `Invalid ${e.validation}` :
        r = "Invalid";
        break;
      case qe.ZodIssueCode.too_small:
        e.type === "array" ? r = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "more than"} ${e.minimum} element(s)` :
        e.type === "string" ? r = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "over"} ${e.minimum} character(s)` :
        e.type === "number" ? r = `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater tha\
n "}${e.minimum}` : e.type === "date" ? r = `Date must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "gre\
ater than "}${new Date(Number(e.minimum))}` : r = "Invalid input";
        break;
      case qe.ZodIssueCode.too_big:
        e.type === "array" ? r = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "less than"} ${e.maximum} element(s)` :
        e.type === "string" ? r = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "under"} ${e.maximum} character(s)` :
        e.type === "number" ? r = `Number must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` :
        e.type === "bigint" ? r = `BigInt must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` :
        e.type === "date" ? r = `Date must be ${e.exact ? "exactly" : e.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(
        Number(e.maximum))}` : r = "Invalid input";
        break;
      case qe.ZodIssueCode.custom:
        r = "Invalid input";
        break;
      case qe.ZodIssueCode.invalid_intersection_types:
        r = "Intersection results could not be merged";
        break;
      case qe.ZodIssueCode.not_multiple_of:
        r = `Number must be a multiple of ${e.multipleOf}`;
        break;
      case qe.ZodIssueCode.not_finite:
        r = "Number must be finite";
        break;
      default:
        r = t.defaultError, Or.util.assertNever(e);
    }
    return { message: r };
  }, "errorMap");
  kd.default = nB;
});

// ../node_modules/zod/lib/errors.js
var pa = b((bt) => {
  "use strict";
  var sB = bt && bt.__importDefault || function(e) {
    return e && e.__esModule ? e : { default: e };
  };
  Object.defineProperty(bt, "__esModule", { value: !0 });
  bt.getErrorMap = bt.setErrorMap = bt.defaultErrorMap = void 0;
  var B_ = sB(Od());
  bt.defaultErrorMap = B_.default;
  var P_ = B_.default;
  function oB(e) {
    P_ = e;
  }
  s(oB, "setErrorMap");
  bt.setErrorMap = oB;
  function aB() {
    return P_;
  }
  s(aB, "getErrorMap");
  bt.getErrorMap = aB;
});

// ../node_modules/zod/lib/helpers/parseUtil.js
var Pd = b((re) => {
  "use strict";
  var uB = re && re.__importDefault || function(e) {
    return e && e.__esModule ? e : { default: e };
  };
  Object.defineProperty(re, "__esModule", { value: !0 });
  re.isAsync = re.isValid = re.isDirty = re.isAborted = re.OK = re.DIRTY = re.INVALID = re.ParseStatus = re.addIssueToContext = re.EMPTY_PATH =
  re.makeIssue = void 0;
  var lB = pa(), I_ = uB(Od()), cB = /* @__PURE__ */ s((e) => {
    let { data: t, path: r, errorMaps: i, issueData: n } = e, o = [...r, ...n.path || []], a = {
      ...n,
      path: o
    };
    if (n.message !== void 0)
      return {
        ...n,
        path: o,
        message: n.message
      };
    let u = "", l = i.filter((c) => !!c).slice().reverse();
    for (let c of l)
      u = c(a, { data: t, defaultError: u }).message;
    return {
      ...n,
      path: o,
      message: u
    };
  }, "makeIssue");
  re.makeIssue = cB;
  re.EMPTY_PATH = [];
  function dB(e, t) {
    let r = (0, lB.getErrorMap)(), i = (0, re.makeIssue)({
      issueData: t,
      data: e.data,
      path: e.path,
      errorMaps: [
        e.common.contextualErrorMap,
        // contextual error map is first priority
        e.schemaErrorMap,
        // then schema-bound map if available
        r,
        // then global override map
        r === I_.default ? void 0 : I_.default
        // then global default map
      ].filter((n) => !!n)
    });
    e.common.issues.push(i);
  }
  s(dB, "addIssueToContext");
  re.addIssueToContext = dB;
  var Bd = class e {
    static {
      s(this, "ParseStatus");
    }
    constructor() {
      this.value = "valid";
    }
    dirty() {
      this.value === "valid" && (this.value = "dirty");
    }
    abort() {
      this.value !== "aborted" && (this.value = "aborted");
    }
    static mergeArray(t, r) {
      let i = [];
      for (let n of r) {
        if (n.status === "aborted")
          return re.INVALID;
        n.status === "dirty" && t.dirty(), i.push(n.value);
      }
      return { status: t.value, value: i };
    }
    static async mergeObjectAsync(t, r) {
      let i = [];
      for (let n of r) {
        let o = await n.key, a = await n.value;
        i.push({
          key: o,
          value: a
        });
      }
      return e.mergeObjectSync(t, i);
    }
    static mergeObjectSync(t, r) {
      let i = {};
      for (let n of r) {
        let { key: o, value: a } = n;
        if (o.status === "aborted" || a.status === "aborted")
          return re.INVALID;
        o.status === "dirty" && t.dirty(), a.status === "dirty" && t.dirty(), o.value !== "__proto__" && (typeof a.value < "u" || n.alwaysSet) &&
        (i[o.value] = a.value);
      }
      return { status: t.value, value: i };
    }
  };
  re.ParseStatus = Bd;
  re.INVALID = Object.freeze({
    status: "aborted"
  });
  var fB = /* @__PURE__ */ s((e) => ({ status: "dirty", value: e }), "DIRTY");
  re.DIRTY = fB;
  var hB = /* @__PURE__ */ s((e) => ({ status: "valid", value: e }), "OK");
  re.OK = hB;
  var pB = /* @__PURE__ */ s((e) => e.status === "aborted", "isAborted");
  re.isAborted = pB;
  var DB = /* @__PURE__ */ s((e) => e.status === "dirty", "isDirty");
  re.isDirty = DB;
  var mB = /* @__PURE__ */ s((e) => e.status === "valid", "isValid");
  re.isValid = mB;
  var gB = /* @__PURE__ */ s((e) => typeof Promise < "u" && e instanceof Promise, "isAsync");
  re.isAsync = gB;
});

// ../node_modules/zod/lib/helpers/typeAliases.js
var j_ = b((M_) => {
  "use strict";
  Object.defineProperty(M_, "__esModule", { value: !0 });
});

// ../node_modules/zod/lib/helpers/errorUtil.js
var L_ = b((Da) => {
  "use strict";
  Object.defineProperty(Da, "__esModule", { value: !0 });
  Da.errorUtil = void 0;
  var q_;
  (function(e) {
    e.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, e.toString = (t) => typeof t == "string" ? t : t?.message;
  })(q_ || (Da.errorUtil = q_ = {}));
});

// ../node_modules/zod/lib/types.js
var J_ = b((y) => {
  "use strict";
  var ga = y && y.__classPrivateFieldGet || function(e, t, r, i) {
    if (r === "a" && !i) throw new TypeError("Private accessor was defined without a getter");
    if (typeof t == "function" ? e !== t || !i : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did n\
ot declare it");
    return r === "m" ? i : r === "a" ? i.call(e) : i ? i.value : t.get(e);
  }, U_ = y && y.__classPrivateFieldSet || function(e, t, r, i, n) {
    if (i === "m") throw new TypeError("Private method is not writable");
    if (i === "a" && !n) throw new TypeError("Private accessor was defined without a setter");
    if (typeof t == "function" ? e !== t || !n : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did no\
t declare it");
    return i === "a" ? n.call(e, r) : n ? n.value = r : t.set(e, r), r;
  }, ss, os;
  Object.defineProperty(y, "__esModule", { value: !0 });
  y.boolean = y.bigint = y.array = y.any = y.coerce = y.ZodFirstPartyTypeKind = y.late = y.ZodSchema = y.Schema = y.custom = y.ZodReadonly =
  y.ZodPipeline = y.ZodBranded = y.BRAND = y.ZodNaN = y.ZodCatch = y.ZodDefault = y.ZodNullable = y.ZodOptional = y.ZodTransformer = y.ZodEffects =
  y.ZodPromise = y.ZodNativeEnum = y.ZodEnum = y.ZodLiteral = y.ZodLazy = y.ZodFunction = y.ZodSet = y.ZodMap = y.ZodRecord = y.ZodTuple = y.
  ZodIntersection = y.ZodDiscriminatedUnion = y.ZodUnion = y.ZodObject = y.ZodArray = y.ZodVoid = y.ZodNever = y.ZodUnknown = y.ZodAny = y.ZodNull =
  y.ZodUndefined = y.ZodSymbol = y.ZodDate = y.ZodBoolean = y.ZodBigInt = y.ZodNumber = y.ZodString = y.datetimeRegex = y.ZodType = void 0;
  y.NEVER = y.void = y.unknown = y.union = y.undefined = y.tuple = y.transformer = y.symbol = y.string = y.strictObject = y.set = y.record =
  y.promise = y.preprocess = y.pipeline = y.ostring = y.optional = y.onumber = y.oboolean = y.object = y.number = y.nullable = y.null = y.never =
  y.nativeEnum = y.nan = y.map = y.literal = y.lazy = y.intersection = y.instanceof = y.function = y.enum = y.effect = y.discriminatedUnion =
  y.date = void 0;
  var ma = pa(), L = L_(), v = Pd(), O = is(), R = ha(), Xe = class {
    static {
      s(this, "ParseInputLazyPath");
    }
    constructor(t, r, i, n) {
      this._cachedPath = [], this.parent = t, this.data = r, this._path = i, this._key = n;
    }
    get path() {
      return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.
      push(...this._path, this._key)), this._cachedPath;
    }
  }, N_ = /* @__PURE__ */ s((e, t) => {
    if ((0, v.isValid)(t))
      return { success: !0, data: t.value };
    if (!e.common.issues.length)
      throw new Error("Validation failed but no issues detected.");
    return {
      success: !1,
      get error() {
        if (this._error)
          return this._error;
        let r = new R.ZodError(e.common.issues);
        return this._error = r, this._error;
      }
    };
  }, "handleResult");
  function W(e) {
    if (!e)
      return {};
    let { errorMap: t, invalid_type_error: r, required_error: i, description: n } = e;
    if (t && (r || i))
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    return t ? { errorMap: t, description: n } : { errorMap: /* @__PURE__ */ s((a, u) => {
      var l, c;
      let { message: d } = e;
      return a.code === "invalid_enum_value" ? { message: d ?? u.defaultError } : typeof u.data > "u" ? { message: (l = d ?? i) !== null && l !==
      void 0 ? l : u.defaultError } : a.code !== "invalid_type" ? { message: u.defaultError } : { message: (c = d ?? r) !== null && c !== void 0 ?
      c : u.defaultError };
    }, "customMap"), description: n };
  }
  s(W, "processCreateParams");
  var $ = class {
    static {
      s(this, "ZodType");
    }
    get description() {
      return this._def.description;
    }
    _getType(t) {
      return (0, O.getParsedType)(t.data);
    }
    _getOrReturnCtx(t, r) {
      return r || {
        common: t.parent.common,
        data: t.data,
        parsedType: (0, O.getParsedType)(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent
      };
    }
    _processInputParams(t) {
      return {
        status: new v.ParseStatus(),
        ctx: {
          common: t.parent.common,
          data: t.data,
          parsedType: (0, O.getParsedType)(t.data),
          schemaErrorMap: this._def.errorMap,
          path: t.path,
          parent: t.parent
        }
      };
    }
    _parseSync(t) {
      let r = this._parse(t);
      if ((0, v.isAsync)(r))
        throw new Error("Synchronous parse encountered promise.");
      return r;
    }
    _parseAsync(t) {
      let r = this._parse(t);
      return Promise.resolve(r);
    }
    parse(t, r) {
      let i = this.safeParse(t, r);
      if (i.success)
        return i.data;
      throw i.error;
    }
    safeParse(t, r) {
      var i;
      let n = {
        common: {
          issues: [],
          async: (i = r?.async) !== null && i !== void 0 ? i : !1,
          contextualErrorMap: r?.errorMap
        },
        path: r?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: t,
        parsedType: (0, O.getParsedType)(t)
      }, o = this._parseSync({ data: t, path: n.path, parent: n });
      return N_(n, o);
    }
    "~validate"(t) {
      var r, i;
      let n = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: t,
        parsedType: (0, O.getParsedType)(t)
      };
      if (!this["~standard"].async)
        try {
          let o = this._parseSync({ data: t, path: [], parent: n });
          return (0, v.isValid)(o) ? {
            value: o.value
          } : {
            issues: n.common.issues
          };
        } catch (o) {
          !((i = (r = o?.message) === null || r === void 0 ? void 0 : r.toLowerCase()) === null || i === void 0) && i.includes("encountered") &&
          (this["~standard"].async = !0), n.common = {
            issues: [],
            async: !0
          };
        }
      return this._parseAsync({ data: t, path: [], parent: n }).then((o) => (0, v.isValid)(o) ? {
        value: o.value
      } : {
        issues: n.common.issues
      });
    }
    async parseAsync(t, r) {
      let i = await this.safeParseAsync(t, r);
      if (i.success)
        return i.data;
      throw i.error;
    }
    async safeParseAsync(t, r) {
      let i = {
        common: {
          issues: [],
          contextualErrorMap: r?.errorMap,
          async: !0
        },
        path: r?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: t,
        parsedType: (0, O.getParsedType)(t)
      }, n = this._parse({ data: t, path: i.path, parent: i }), o = await ((0, v.isAsync)(n) ? n : Promise.resolve(n));
      return N_(i, o);
    }
    refine(t, r) {
      let i = /* @__PURE__ */ s((n) => typeof r == "string" || typeof r > "u" ? { message: r } : typeof r == "function" ? r(n) : r, "getIssu\
eProperties");
      return this._refinement((n, o) => {
        let a = t(n), u = /* @__PURE__ */ s(() => o.addIssue({
          code: R.ZodIssueCode.custom,
          ...i(n)
        }), "setError");
        return typeof Promise < "u" && a instanceof Promise ? a.then((l) => l ? !0 : (u(), !1)) : a ? !0 : (u(), !1);
      });
    }
    refinement(t, r) {
      return this._refinement((i, n) => t(i) ? !0 : (n.addIssue(typeof r == "function" ? r(i, n) : r), !1));
    }
    _refinement(t) {
      return new Ze({
        schema: this,
        typeName: N.ZodEffects,
        effect: { type: "refinement", refinement: t }
      });
    }
    superRefine(t) {
      return this._refinement(t);
    }
    constructor(t) {
      this.spa = this.safeParseAsync, this._def = t, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync =
      this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.
      bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.
      bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.
      promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(
      this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe =
      this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.
      bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: /* @__PURE__ */ s((r) => this["~validate"](r), "validate")
      };
    }
    optional() {
      return Je.create(this, this._def);
    }
    nullable() {
      return _t.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return Vt.create(this);
    }
    promise() {
      return cr.create(this, this._def);
    }
    or(t) {
      return Lr.create([this, t], this._def);
    }
    and(t) {
      return Nr.create(this, t, this._def);
    }
    transform(t) {
      return new Ze({
        ...W(this._def),
        schema: this,
        typeName: N.ZodEffects,
        effect: { type: "transform", transform: t }
      });
    }
    default(t) {
      let r = typeof t == "function" ? t : () => t;
      return new Vr({
        ...W(this._def),
        innerType: this,
        defaultValue: r,
        typeName: N.ZodDefault
      });
    }
    brand() {
      return new as({
        typeName: N.ZodBranded,
        type: this,
        ...W(this._def)
      });
    }
    catch(t) {
      let r = typeof t == "function" ? t : () => t;
      return new Zr({
        ...W(this._def),
        innerType: this,
        catchValue: r,
        typeName: N.ZodCatch
      });
    }
    describe(t) {
      let r = this.constructor;
      return new r({
        ...this._def,
        description: t
      });
    }
    pipe(t) {
      return us.create(this, t);
    }
    readonly() {
      return zr.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  y.ZodType = $;
  y.Schema = $;
  y.ZodSchema = $;
  var yB = /^c[^\s-]{8,}$/i, bB = /^[0-9a-z]+$/, vB = /^[0-9A-HJKMNP-TV-Z]{26}$/i, _B = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  wB = /^[a-z0-9_-]{21}$/i, EB = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, CB = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  xB = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, FB = "^(\\p{Extended_Pictographic}|\\p{Emoji_Comp\
onent})+$", Id, SB = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, TB = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  AB = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  RB = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  kB = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, OB = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  W_ = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469\
]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", BB = new RegExp(`^${W_}$`);
  function $_(e) {
    let t = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
    return e.precision ? t = `${t}\\.\\d{${e.precision}}` : e.precision == null && (t = `${t}(\\.\\d+)?`), t;
  }
  s($_, "timeRegexSource");
  function PB(e) {
    return new RegExp(`^${$_(e)}$`);
  }
  s(PB, "timeRegex");
  function H_(e) {
    let t = `${W_}T${$_(e)}`, r = [];
    return r.push(e.local ? "Z?" : "Z"), e.offset && r.push("([+-]\\d{2}:?\\d{2})"), t = `${t}(${r.join("|")})`, new RegExp(`^${t}$`);
  }
  s(H_, "datetimeRegex");
  y.datetimeRegex = H_;
  function IB(e, t) {
    return !!((t === "v4" || !t) && SB.test(e) || (t === "v6" || !t) && AB.test(e));
  }
  s(IB, "isValidIP");
  function MB(e, t) {
    if (!EB.test(e))
      return !1;
    try {
      let [r] = e.split("."), i = r.replace(/-/g, "+").replace(/_/g, "/").padEnd(r.length + (4 - r.length % 4) % 4, "="), n = JSON.parse(atob(
      i));
      return !(typeof n != "object" || n === null || !n.typ || !n.alg || t && n.alg !== t);
    } catch {
      return !1;
    }
  }
  s(MB, "isValidJWT");
  function jB(e, t) {
    return !!((t === "v4" || !t) && TB.test(e) || (t === "v6" || !t) && RB.test(e));
  }
  s(jB, "isValidCidr");
  var ur = class e extends $ {
    static {
      s(this, "ZodString");
    }
    _parse(t) {
      if (this._def.coerce && (t.data = String(t.data)), this._getType(t) !== O.ZodParsedType.string) {
        let o = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(o, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.string,
          received: o.parsedType
        }), v.INVALID;
      }
      let i = new v.ParseStatus(), n;
      for (let o of this._def.checks)
        if (o.kind === "min")
          t.data.length < o.value && (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            code: R.ZodIssueCode.too_small,
            minimum: o.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: o.message
          }), i.dirty());
        else if (o.kind === "max")
          t.data.length > o.value && (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            code: R.ZodIssueCode.too_big,
            maximum: o.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: o.message
          }), i.dirty());
        else if (o.kind === "length") {
          let a = t.data.length > o.value, u = t.data.length < o.value;
          (a || u) && (n = this._getOrReturnCtx(t, n), a ? (0, v.addIssueToContext)(n, {
            code: R.ZodIssueCode.too_big,
            maximum: o.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: o.message
          }) : u && (0, v.addIssueToContext)(n, {
            code: R.ZodIssueCode.too_small,
            minimum: o.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: o.message
          }), i.dirty());
        } else if (o.kind === "email")
          xB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "email",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "emoji")
          Id || (Id = new RegExp(FB, "u")), Id.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "emoji",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "uuid")
          _B.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "uuid",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "nanoid")
          wB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "nanoid",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "cuid")
          yB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "cuid",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "cuid2")
          bB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "cuid2",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "ulid")
          vB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
            validation: "ulid",
            code: R.ZodIssueCode.invalid_string,
            message: o.message
          }), i.dirty());
        else if (o.kind === "url")
          try {
            new URL(t.data);
          } catch {
            n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
              validation: "url",
              code: R.ZodIssueCode.invalid_string,
              message: o.message
            }), i.dirty();
          }
        else o.kind === "regex" ? (o.regex.lastIndex = 0, o.regex.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(
        n, {
          validation: "regex",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty())) : o.kind === "trim" ? t.data = t.data.trim() : o.kind === "includes" ? t.data.includes(o.value, o.position) || (n = this.
        _getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.invalid_string,
          validation: { includes: o.value, position: o.position },
          message: o.message
        }), i.dirty()) : o.kind === "toLowerCase" ? t.data = t.data.toLowerCase() : o.kind === "toUpperCase" ? t.data = t.data.toUpperCase() :
        o.kind === "startsWith" ? t.data.startsWith(o.value) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.invalid_string,
          validation: { startsWith: o.value },
          message: o.message
        }), i.dirty()) : o.kind === "endsWith" ? t.data.endsWith(o.value) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.invalid_string,
          validation: { endsWith: o.value },
          message: o.message
        }), i.dirty()) : o.kind === "datetime" ? H_(o).test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.invalid_string,
          validation: "datetime",
          message: o.message
        }), i.dirty()) : o.kind === "date" ? BB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.invalid_string,
          validation: "date",
          message: o.message
        }), i.dirty()) : o.kind === "time" ? PB(o).test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.invalid_string,
          validation: "time",
          message: o.message
        }), i.dirty()) : o.kind === "duration" ? CB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          validation: "duration",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty()) : o.kind === "ip" ? IB(t.data, o.version) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          validation: "ip",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty()) : o.kind === "jwt" ? MB(t.data, o.alg) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          validation: "jwt",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty()) : o.kind === "cidr" ? jB(t.data, o.version) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          validation: "cidr",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty()) : o.kind === "base64" ? kB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          validation: "base64",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty()) : o.kind === "base64url" ? OB.test(t.data) || (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          validation: "base64url",
          code: R.ZodIssueCode.invalid_string,
          message: o.message
        }), i.dirty()) : O.util.assertNever(o);
      return { status: i.value, value: t.data };
    }
    _regex(t, r, i) {
      return this.refinement((n) => t.test(n), {
        validation: r,
        code: R.ZodIssueCode.invalid_string,
        ...L.errorUtil.errToObj(i)
      });
    }
    _addCheck(t) {
      return new e({
        ...this._def,
        checks: [...this._def.checks, t]
      });
    }
    email(t) {
      return this._addCheck({ kind: "email", ...L.errorUtil.errToObj(t) });
    }
    url(t) {
      return this._addCheck({ kind: "url", ...L.errorUtil.errToObj(t) });
    }
    emoji(t) {
      return this._addCheck({ kind: "emoji", ...L.errorUtil.errToObj(t) });
    }
    uuid(t) {
      return this._addCheck({ kind: "uuid", ...L.errorUtil.errToObj(t) });
    }
    nanoid(t) {
      return this._addCheck({ kind: "nanoid", ...L.errorUtil.errToObj(t) });
    }
    cuid(t) {
      return this._addCheck({ kind: "cuid", ...L.errorUtil.errToObj(t) });
    }
    cuid2(t) {
      return this._addCheck({ kind: "cuid2", ...L.errorUtil.errToObj(t) });
    }
    ulid(t) {
      return this._addCheck({ kind: "ulid", ...L.errorUtil.errToObj(t) });
    }
    base64(t) {
      return this._addCheck({ kind: "base64", ...L.errorUtil.errToObj(t) });
    }
    base64url(t) {
      return this._addCheck({
        kind: "base64url",
        ...L.errorUtil.errToObj(t)
      });
    }
    jwt(t) {
      return this._addCheck({ kind: "jwt", ...L.errorUtil.errToObj(t) });
    }
    ip(t) {
      return this._addCheck({ kind: "ip", ...L.errorUtil.errToObj(t) });
    }
    cidr(t) {
      return this._addCheck({ kind: "cidr", ...L.errorUtil.errToObj(t) });
    }
    datetime(t) {
      var r, i;
      return typeof t == "string" ? this._addCheck({
        kind: "datetime",
        precision: null,
        offset: !1,
        local: !1,
        message: t
      }) : this._addCheck({
        kind: "datetime",
        precision: typeof t?.precision > "u" ? null : t?.precision,
        offset: (r = t?.offset) !== null && r !== void 0 ? r : !1,
        local: (i = t?.local) !== null && i !== void 0 ? i : !1,
        ...L.errorUtil.errToObj(t?.message)
      });
    }
    date(t) {
      return this._addCheck({ kind: "date", message: t });
    }
    time(t) {
      return typeof t == "string" ? this._addCheck({
        kind: "time",
        precision: null,
        message: t
      }) : this._addCheck({
        kind: "time",
        precision: typeof t?.precision > "u" ? null : t?.precision,
        ...L.errorUtil.errToObj(t?.message)
      });
    }
    duration(t) {
      return this._addCheck({ kind: "duration", ...L.errorUtil.errToObj(t) });
    }
    regex(t, r) {
      return this._addCheck({
        kind: "regex",
        regex: t,
        ...L.errorUtil.errToObj(r)
      });
    }
    includes(t, r) {
      return this._addCheck({
        kind: "includes",
        value: t,
        position: r?.position,
        ...L.errorUtil.errToObj(r?.message)
      });
    }
    startsWith(t, r) {
      return this._addCheck({
        kind: "startsWith",
        value: t,
        ...L.errorUtil.errToObj(r)
      });
    }
    endsWith(t, r) {
      return this._addCheck({
        kind: "endsWith",
        value: t,
        ...L.errorUtil.errToObj(r)
      });
    }
    min(t, r) {
      return this._addCheck({
        kind: "min",
        value: t,
        ...L.errorUtil.errToObj(r)
      });
    }
    max(t, r) {
      return this._addCheck({
        kind: "max",
        value: t,
        ...L.errorUtil.errToObj(r)
      });
    }
    length(t, r) {
      return this._addCheck({
        kind: "length",
        value: t,
        ...L.errorUtil.errToObj(r)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(t) {
      return this.min(1, L.errorUtil.errToObj(t));
    }
    trim() {
      return new e({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new e({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new e({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((t) => t.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((t) => t.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((t) => t.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((t) => t.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((t) => t.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((t) => t.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((t) => t.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((t) => t.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((t) => t.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((t) => t.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((t) => t.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((t) => t.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((t) => t.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((t) => t.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((t) => t.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((t) => t.kind === "base64url");
    }
    get minLength() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "min" && (t === null || r.value > t) && (t = r.value);
      return t;
    }
    get maxLength() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "max" && (t === null || r.value < t) && (t = r.value);
      return t;
    }
  };
  y.ZodString = ur;
  ur.create = (e) => {
    var t;
    return new ur({
      checks: [],
      typeName: N.ZodString,
      coerce: (t = e?.coerce) !== null && t !== void 0 ? t : !1,
      ...W(e)
    });
  };
  function qB(e, t) {
    let r = (e.toString().split(".")[1] || "").length, i = (t.toString().split(".")[1] || "").length, n = r > i ? r : i, o = parseInt(e.toFixed(
    n).replace(".", "")), a = parseInt(t.toFixed(n).replace(".", ""));
    return o % a / Math.pow(10, n);
  }
  s(qB, "floatSafeRemainder");
  var Br = class e extends $ {
    static {
      s(this, "ZodNumber");
    }
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
    }
    _parse(t) {
      if (this._def.coerce && (t.data = Number(t.data)), this._getType(t) !== O.ZodParsedType.number) {
        let o = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(o, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.number,
          received: o.parsedType
        }), v.INVALID;
      }
      let i, n = new v.ParseStatus();
      for (let o of this._def.checks)
        o.kind === "int" ? O.util.isInteger(t.data) || (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: "integer",
          received: "float",
          message: o.message
        }), n.dirty()) : o.kind === "min" ? (o.inclusive ? t.data < o.value : t.data <= o.value) && (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(
        i, {
          code: R.ZodIssueCode.too_small,
          minimum: o.value,
          type: "number",
          inclusive: o.inclusive,
          exact: !1,
          message: o.message
        }), n.dirty()) : o.kind === "max" ? (o.inclusive ? t.data > o.value : t.data >= o.value) && (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(
        i, {
          code: R.ZodIssueCode.too_big,
          maximum: o.value,
          type: "number",
          inclusive: o.inclusive,
          exact: !1,
          message: o.message
        }), n.dirty()) : o.kind === "multipleOf" ? qB(t.data, o.value) !== 0 && (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(i,
        {
          code: R.ZodIssueCode.not_multiple_of,
          multipleOf: o.value,
          message: o.message
        }), n.dirty()) : o.kind === "finite" ? Number.isFinite(t.data) || (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.not_finite,
          message: o.message
        }), n.dirty()) : O.util.assertNever(o);
      return { status: n.value, value: t.data };
    }
    gte(t, r) {
      return this.setLimit("min", t, !0, L.errorUtil.toString(r));
    }
    gt(t, r) {
      return this.setLimit("min", t, !1, L.errorUtil.toString(r));
    }
    lte(t, r) {
      return this.setLimit("max", t, !0, L.errorUtil.toString(r));
    }
    lt(t, r) {
      return this.setLimit("max", t, !1, L.errorUtil.toString(r));
    }
    setLimit(t, r, i, n) {
      return new e({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: t,
            value: r,
            inclusive: i,
            message: L.errorUtil.toString(n)
          }
        ]
      });
    }
    _addCheck(t) {
      return new e({
        ...this._def,
        checks: [...this._def.checks, t]
      });
    }
    int(t) {
      return this._addCheck({
        kind: "int",
        message: L.errorUtil.toString(t)
      });
    }
    positive(t) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !1,
        message: L.errorUtil.toString(t)
      });
    }
    negative(t) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !1,
        message: L.errorUtil.toString(t)
      });
    }
    nonpositive(t) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !0,
        message: L.errorUtil.toString(t)
      });
    }
    nonnegative(t) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !0,
        message: L.errorUtil.toString(t)
      });
    }
    multipleOf(t, r) {
      return this._addCheck({
        kind: "multipleOf",
        value: t,
        message: L.errorUtil.toString(r)
      });
    }
    finite(t) {
      return this._addCheck({
        kind: "finite",
        message: L.errorUtil.toString(t)
      });
    }
    safe(t) {
      return this._addCheck({
        kind: "min",
        inclusive: !0,
        value: Number.MIN_SAFE_INTEGER,
        message: L.errorUtil.toString(t)
      })._addCheck({
        kind: "max",
        inclusive: !0,
        value: Number.MAX_SAFE_INTEGER,
        message: L.errorUtil.toString(t)
      });
    }
    get minValue() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "min" && (t === null || r.value > t) && (t = r.value);
      return t;
    }
    get maxValue() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "max" && (t === null || r.value < t) && (t = r.value);
      return t;
    }
    get isInt() {
      return !!this._def.checks.find((t) => t.kind === "int" || t.kind === "multipleOf" && O.util.isInteger(t.value));
    }
    get isFinite() {
      let t = null, r = null;
      for (let i of this._def.checks) {
        if (i.kind === "finite" || i.kind === "int" || i.kind === "multipleOf")
          return !0;
        i.kind === "min" ? (r === null || i.value > r) && (r = i.value) : i.kind === "max" && (t === null || i.value < t) && (t = i.value);
      }
      return Number.isFinite(r) && Number.isFinite(t);
    }
  };
  y.ZodNumber = Br;
  Br.create = (e) => new Br({
    checks: [],
    typeName: N.ZodNumber,
    coerce: e?.coerce || !1,
    ...W(e)
  });
  var Pr = class e extends $ {
    static {
      s(this, "ZodBigInt");
    }
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte;
    }
    _parse(t) {
      if (this._def.coerce)
        try {
          t.data = BigInt(t.data);
        } catch {
          return this._getInvalidInput(t);
        }
      if (this._getType(t) !== O.ZodParsedType.bigint)
        return this._getInvalidInput(t);
      let i, n = new v.ParseStatus();
      for (let o of this._def.checks)
        o.kind === "min" ? (o.inclusive ? t.data < o.value : t.data <= o.value) && (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(
        i, {
          code: R.ZodIssueCode.too_small,
          type: "bigint",
          minimum: o.value,
          inclusive: o.inclusive,
          message: o.message
        }), n.dirty()) : o.kind === "max" ? (o.inclusive ? t.data > o.value : t.data >= o.value) && (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(
        i, {
          code: R.ZodIssueCode.too_big,
          type: "bigint",
          maximum: o.value,
          inclusive: o.inclusive,
          message: o.message
        }), n.dirty()) : o.kind === "multipleOf" ? t.data % o.value !== BigInt(0) && (i = this._getOrReturnCtx(t, i), (0, v.addIssueToContext)(
        i, {
          code: R.ZodIssueCode.not_multiple_of,
          multipleOf: o.value,
          message: o.message
        }), n.dirty()) : O.util.assertNever(o);
      return { status: n.value, value: t.data };
    }
    _getInvalidInput(t) {
      let r = this._getOrReturnCtx(t);
      return (0, v.addIssueToContext)(r, {
        code: R.ZodIssueCode.invalid_type,
        expected: O.ZodParsedType.bigint,
        received: r.parsedType
      }), v.INVALID;
    }
    gte(t, r) {
      return this.setLimit("min", t, !0, L.errorUtil.toString(r));
    }
    gt(t, r) {
      return this.setLimit("min", t, !1, L.errorUtil.toString(r));
    }
    lte(t, r) {
      return this.setLimit("max", t, !0, L.errorUtil.toString(r));
    }
    lt(t, r) {
      return this.setLimit("max", t, !1, L.errorUtil.toString(r));
    }
    setLimit(t, r, i, n) {
      return new e({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: t,
            value: r,
            inclusive: i,
            message: L.errorUtil.toString(n)
          }
        ]
      });
    }
    _addCheck(t) {
      return new e({
        ...this._def,
        checks: [...this._def.checks, t]
      });
    }
    positive(t) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !1,
        message: L.errorUtil.toString(t)
      });
    }
    negative(t) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !1,
        message: L.errorUtil.toString(t)
      });
    }
    nonpositive(t) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !0,
        message: L.errorUtil.toString(t)
      });
    }
    nonnegative(t) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !0,
        message: L.errorUtil.toString(t)
      });
    }
    multipleOf(t, r) {
      return this._addCheck({
        kind: "multipleOf",
        value: t,
        message: L.errorUtil.toString(r)
      });
    }
    get minValue() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "min" && (t === null || r.value > t) && (t = r.value);
      return t;
    }
    get maxValue() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "max" && (t === null || r.value < t) && (t = r.value);
      return t;
    }
  };
  y.ZodBigInt = Pr;
  Pr.create = (e) => {
    var t;
    return new Pr({
      checks: [],
      typeName: N.ZodBigInt,
      coerce: (t = e?.coerce) !== null && t !== void 0 ? t : !1,
      ...W(e)
    });
  };
  var Ir = class extends $ {
    static {
      s(this, "ZodBoolean");
    }
    _parse(t) {
      if (this._def.coerce && (t.data = !!t.data), this._getType(t) !== O.ZodParsedType.boolean) {
        let i = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.boolean,
          received: i.parsedType
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
  };
  y.ZodBoolean = Ir;
  Ir.create = (e) => new Ir({
    typeName: N.ZodBoolean,
    coerce: e?.coerce || !1,
    ...W(e)
  });
  var Mr = class e extends $ {
    static {
      s(this, "ZodDate");
    }
    _parse(t) {
      if (this._def.coerce && (t.data = new Date(t.data)), this._getType(t) !== O.ZodParsedType.date) {
        let o = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(o, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.date,
          received: o.parsedType
        }), v.INVALID;
      }
      if (isNaN(t.data.getTime())) {
        let o = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(o, {
          code: R.ZodIssueCode.invalid_date
        }), v.INVALID;
      }
      let i = new v.ParseStatus(), n;
      for (let o of this._def.checks)
        o.kind === "min" ? t.data.getTime() < o.value && (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.too_small,
          message: o.message,
          inclusive: !0,
          exact: !1,
          minimum: o.value,
          type: "date"
        }), i.dirty()) : o.kind === "max" ? t.data.getTime() > o.value && (n = this._getOrReturnCtx(t, n), (0, v.addIssueToContext)(n, {
          code: R.ZodIssueCode.too_big,
          message: o.message,
          inclusive: !0,
          exact: !1,
          maximum: o.value,
          type: "date"
        }), i.dirty()) : O.util.assertNever(o);
      return {
        status: i.value,
        value: new Date(t.data.getTime())
      };
    }
    _addCheck(t) {
      return new e({
        ...this._def,
        checks: [...this._def.checks, t]
      });
    }
    min(t, r) {
      return this._addCheck({
        kind: "min",
        value: t.getTime(),
        message: L.errorUtil.toString(r)
      });
    }
    max(t, r) {
      return this._addCheck({
        kind: "max",
        value: t.getTime(),
        message: L.errorUtil.toString(r)
      });
    }
    get minDate() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "min" && (t === null || r.value > t) && (t = r.value);
      return t != null ? new Date(t) : null;
    }
    get maxDate() {
      let t = null;
      for (let r of this._def.checks)
        r.kind === "max" && (t === null || r.value < t) && (t = r.value);
      return t != null ? new Date(t) : null;
    }
  };
  y.ZodDate = Mr;
  Mr.create = (e) => new Mr({
    checks: [],
    coerce: e?.coerce || !1,
    typeName: N.ZodDate,
    ...W(e)
  });
  var Bi = class extends $ {
    static {
      s(this, "ZodSymbol");
    }
    _parse(t) {
      if (this._getType(t) !== O.ZodParsedType.symbol) {
        let i = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.symbol,
          received: i.parsedType
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
  };
  y.ZodSymbol = Bi;
  Bi.create = (e) => new Bi({
    typeName: N.ZodSymbol,
    ...W(e)
  });
  var jr = class extends $ {
    static {
      s(this, "ZodUndefined");
    }
    _parse(t) {
      if (this._getType(t) !== O.ZodParsedType.undefined) {
        let i = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.undefined,
          received: i.parsedType
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
  };
  y.ZodUndefined = jr;
  jr.create = (e) => new jr({
    typeName: N.ZodUndefined,
    ...W(e)
  });
  var qr = class extends $ {
    static {
      s(this, "ZodNull");
    }
    _parse(t) {
      if (this._getType(t) !== O.ZodParsedType.null) {
        let i = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.null,
          received: i.parsedType
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
  };
  y.ZodNull = qr;
  qr.create = (e) => new qr({
    typeName: N.ZodNull,
    ...W(e)
  });
  var lr = class extends $ {
    static {
      s(this, "ZodAny");
    }
    constructor() {
      super(...arguments), this._any = !0;
    }
    _parse(t) {
      return (0, v.OK)(t.data);
    }
  };
  y.ZodAny = lr;
  lr.create = (e) => new lr({
    typeName: N.ZodAny,
    ...W(e)
  });
  var Ht = class extends $ {
    static {
      s(this, "ZodUnknown");
    }
    constructor() {
      super(...arguments), this._unknown = !0;
    }
    _parse(t) {
      return (0, v.OK)(t.data);
    }
  };
  y.ZodUnknown = Ht;
  Ht.create = (e) => new Ht({
    typeName: N.ZodUnknown,
    ...W(e)
  });
  var st = class extends $ {
    static {
      s(this, "ZodNever");
    }
    _parse(t) {
      let r = this._getOrReturnCtx(t);
      return (0, v.addIssueToContext)(r, {
        code: R.ZodIssueCode.invalid_type,
        expected: O.ZodParsedType.never,
        received: r.parsedType
      }), v.INVALID;
    }
  };
  y.ZodNever = st;
  st.create = (e) => new st({
    typeName: N.ZodNever,
    ...W(e)
  });
  var Pi = class extends $ {
    static {
      s(this, "ZodVoid");
    }
    _parse(t) {
      if (this._getType(t) !== O.ZodParsedType.undefined) {
        let i = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.void,
          received: i.parsedType
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
  };
  y.ZodVoid = Pi;
  Pi.create = (e) => new Pi({
    typeName: N.ZodVoid,
    ...W(e)
  });
  var Vt = class e extends $ {
    static {
      s(this, "ZodArray");
    }
    _parse(t) {
      let { ctx: r, status: i } = this._processInputParams(t), n = this._def;
      if (r.parsedType !== O.ZodParsedType.array)
        return (0, v.addIssueToContext)(r, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.array,
          received: r.parsedType
        }), v.INVALID;
      if (n.exactLength !== null) {
        let a = r.data.length > n.exactLength.value, u = r.data.length < n.exactLength.value;
        (a || u) && ((0, v.addIssueToContext)(r, {
          code: a ? R.ZodIssueCode.too_big : R.ZodIssueCode.too_small,
          minimum: u ? n.exactLength.value : void 0,
          maximum: a ? n.exactLength.value : void 0,
          type: "array",
          inclusive: !0,
          exact: !0,
          message: n.exactLength.message
        }), i.dirty());
      }
      if (n.minLength !== null && r.data.length < n.minLength.value && ((0, v.addIssueToContext)(r, {
        code: R.ZodIssueCode.too_small,
        minimum: n.minLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: n.minLength.message
      }), i.dirty()), n.maxLength !== null && r.data.length > n.maxLength.value && ((0, v.addIssueToContext)(r, {
        code: R.ZodIssueCode.too_big,
        maximum: n.maxLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: n.maxLength.message
      }), i.dirty()), r.common.async)
        return Promise.all([...r.data].map((a, u) => n.type._parseAsync(new Xe(r, a, r.path, u)))).then((a) => v.ParseStatus.mergeArray(i, a));
      let o = [...r.data].map((a, u) => n.type._parseSync(new Xe(r, a, r.path, u)));
      return v.ParseStatus.mergeArray(i, o);
    }
    get element() {
      return this._def.type;
    }
    min(t, r) {
      return new e({
        ...this._def,
        minLength: { value: t, message: L.errorUtil.toString(r) }
      });
    }
    max(t, r) {
      return new e({
        ...this._def,
        maxLength: { value: t, message: L.errorUtil.toString(r) }
      });
    }
    length(t, r) {
      return new e({
        ...this._def,
        exactLength: { value: t, message: L.errorUtil.toString(r) }
      });
    }
    nonempty(t) {
      return this.min(1, t);
    }
  };
  y.ZodArray = Vt;
  Vt.create = (e, t) => new Vt({
    type: e,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: N.ZodArray,
    ...W(t)
  });
  function Oi(e) {
    if (e instanceof We) {
      let t = {};
      for (let r in e.shape) {
        let i = e.shape[r];
        t[r] = Je.create(Oi(i));
      }
      return new We({
        ...e._def,
        shape: /* @__PURE__ */ s(() => t, "shape")
      });
    } else return e instanceof Vt ? new Vt({
      ...e._def,
      type: Oi(e.element)
    }) : e instanceof Je ? Je.create(Oi(e.unwrap())) : e instanceof _t ? _t.create(Oi(e.unwrap())) : e instanceof vt ? vt.create(e.items.map(
    (t) => Oi(t))) : e;
  }
  s(Oi, "deepPartialify");
  var We = class e extends $ {
    static {
      s(this, "ZodObject");
    }
    constructor() {
      super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      let t = this._def.shape(), r = O.util.objectKeys(t);
      return this._cached = { shape: t, keys: r };
    }
    _parse(t) {
      if (this._getType(t) !== O.ZodParsedType.object) {
        let c = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(c, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.object,
          received: c.parsedType
        }), v.INVALID;
      }
      let { status: i, ctx: n } = this._processInputParams(t), { shape: o, keys: a } = this._getCached(), u = [];
      if (!(this._def.catchall instanceof st && this._def.unknownKeys === "strip"))
        for (let c in n.data)
          a.includes(c) || u.push(c);
      let l = [];
      for (let c of a) {
        let d = o[c], p = n.data[c];
        l.push({
          key: { status: "valid", value: c },
          value: d._parse(new Xe(n, p, n.path, c)),
          alwaysSet: c in n.data
        });
      }
      if (this._def.catchall instanceof st) {
        let c = this._def.unknownKeys;
        if (c === "passthrough")
          for (let d of u)
            l.push({
              key: { status: "valid", value: d },
              value: { status: "valid", value: n.data[d] }
            });
        else if (c === "strict")
          u.length > 0 && ((0, v.addIssueToContext)(n, {
            code: R.ZodIssueCode.unrecognized_keys,
            keys: u
          }), i.dirty());
        else if (c !== "strip")
          throw new Error("Internal ZodObject error: invalid unknownKeys value.");
      } else {
        let c = this._def.catchall;
        for (let d of u) {
          let p = n.data[d];
          l.push({
            key: { status: "valid", value: d },
            value: c._parse(
              new Xe(n, p, n.path, d)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: d in n.data
          });
        }
      }
      return n.common.async ? Promise.resolve().then(async () => {
        let c = [];
        for (let d of l) {
          let p = await d.key, h = await d.value;
          c.push({
            key: p,
            value: h,
            alwaysSet: d.alwaysSet
          });
        }
        return c;
      }).then((c) => v.ParseStatus.mergeObjectSync(i, c)) : v.ParseStatus.mergeObjectSync(i, l);
    }
    get shape() {
      return this._def.shape();
    }
    strict(t) {
      return L.errorUtil.errToObj, new e({
        ...this._def,
        unknownKeys: "strict",
        ...t !== void 0 ? {
          errorMap: /* @__PURE__ */ s((r, i) => {
            var n, o, a, u;
            let l = (a = (o = (n = this._def).errorMap) === null || o === void 0 ? void 0 : o.call(n, r, i).message) !== null && a !== void 0 ?
            a : i.defaultError;
            return r.code === "unrecognized_keys" ? {
              message: (u = L.errorUtil.errToObj(t).message) !== null && u !== void 0 ? u : l
            } : {
              message: l
            };
          }, "errorMap")
        } : {}
      });
    }
    strip() {
      return new e({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new e({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(t) {
      return new e({
        ...this._def,
        shape: /* @__PURE__ */ s(() => ({
          ...this._def.shape(),
          ...t
        }), "shape")
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(t) {
      return new e({
        unknownKeys: t._def.unknownKeys,
        catchall: t._def.catchall,
        shape: /* @__PURE__ */ s(() => ({
          ...this._def.shape(),
          ...t._def.shape()
        }), "shape"),
        typeName: N.ZodObject
      });
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(t, r) {
      return this.augment({ [t]: r });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(t) {
      return new e({
        ...this._def,
        catchall: t
      });
    }
    pick(t) {
      let r = {};
      return O.util.objectKeys(t).forEach((i) => {
        t[i] && this.shape[i] && (r[i] = this.shape[i]);
      }), new e({
        ...this._def,
        shape: /* @__PURE__ */ s(() => r, "shape")
      });
    }
    omit(t) {
      let r = {};
      return O.util.objectKeys(this.shape).forEach((i) => {
        t[i] || (r[i] = this.shape[i]);
      }), new e({
        ...this._def,
        shape: /* @__PURE__ */ s(() => r, "shape")
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return Oi(this);
    }
    partial(t) {
      let r = {};
      return O.util.objectKeys(this.shape).forEach((i) => {
        let n = this.shape[i];
        t && !t[i] ? r[i] = n : r[i] = n.optional();
      }), new e({
        ...this._def,
        shape: /* @__PURE__ */ s(() => r, "shape")
      });
    }
    required(t) {
      let r = {};
      return O.util.objectKeys(this.shape).forEach((i) => {
        if (t && !t[i])
          r[i] = this.shape[i];
        else {
          let o = this.shape[i];
          for (; o instanceof Je; )
            o = o._def.innerType;
          r[i] = o;
        }
      }), new e({
        ...this._def,
        shape: /* @__PURE__ */ s(() => r, "shape")
      });
    }
    keyof() {
      return V_(O.util.objectKeys(this.shape));
    }
  };
  y.ZodObject = We;
  We.create = (e, t) => new We({
    shape: /* @__PURE__ */ s(() => e, "shape"),
    unknownKeys: "strip",
    catchall: st.create(),
    typeName: N.ZodObject,
    ...W(t)
  });
  We.strictCreate = (e, t) => new We({
    shape: /* @__PURE__ */ s(() => e, "shape"),
    unknownKeys: "strict",
    catchall: st.create(),
    typeName: N.ZodObject,
    ...W(t)
  });
  We.lazycreate = (e, t) => new We({
    shape: e,
    unknownKeys: "strip",
    catchall: st.create(),
    typeName: N.ZodObject,
    ...W(t)
  });
  var Lr = class extends $ {
    static {
      s(this, "ZodUnion");
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t), i = this._def.options;
      function n(o) {
        for (let u of o)
          if (u.result.status === "valid")
            return u.result;
        for (let u of o)
          if (u.result.status === "dirty")
            return r.common.issues.push(...u.ctx.common.issues), u.result;
        let a = o.map((u) => new R.ZodError(u.ctx.common.issues));
        return (0, v.addIssueToContext)(r, {
          code: R.ZodIssueCode.invalid_union,
          unionErrors: a
        }), v.INVALID;
      }
      if (s(n, "handleResults"), r.common.async)
        return Promise.all(i.map(async (o) => {
          let a = {
            ...r,
            common: {
              ...r.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await o._parseAsync({
              data: r.data,
              path: r.path,
              parent: a
            }),
            ctx: a
          };
        })).then(n);
      {
        let o, a = [];
        for (let l of i) {
          let c = {
            ...r,
            common: {
              ...r.common,
              issues: []
            },
            parent: null
          }, d = l._parseSync({
            data: r.data,
            path: r.path,
            parent: c
          });
          if (d.status === "valid")
            return d;
          d.status === "dirty" && !o && (o = { result: d, ctx: c }), c.common.issues.length && a.push(c.common.issues);
        }
        if (o)
          return r.common.issues.push(...o.ctx.common.issues), o.result;
        let u = a.map((l) => new R.ZodError(l));
        return (0, v.addIssueToContext)(r, {
          code: R.ZodIssueCode.invalid_union,
          unionErrors: u
        }), v.INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  y.ZodUnion = Lr;
  Lr.create = (e, t) => new Lr({
    options: e,
    typeName: N.ZodUnion,
    ...W(t)
  });
  var $t = /* @__PURE__ */ s((e) => e instanceof Ur ? $t(e.schema) : e instanceof Ze ? $t(e.innerType()) : e instanceof Wr ? [e.value] : e instanceof
  $r ? e.options : e instanceof Hr ? O.util.objectValues(e.enum) : e instanceof Vr ? $t(e._def.innerType) : e instanceof jr ? [void 0] : e instanceof
  qr ? [null] : e instanceof Je ? [void 0, ...$t(e.unwrap())] : e instanceof _t ? [null, ...$t(e.unwrap())] : e instanceof as || e instanceof
  zr ? $t(e.unwrap()) : e instanceof Zr ? $t(e._def.innerType) : [], "getDiscriminator"), ya = class e extends $ {
    static {
      s(this, "ZodDiscriminatedUnion");
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t);
      if (r.parsedType !== O.ZodParsedType.object)
        return (0, v.addIssueToContext)(r, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.object,
          received: r.parsedType
        }), v.INVALID;
      let i = this.discriminator, n = r.data[i], o = this.optionsMap.get(n);
      return o ? r.common.async ? o._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      }) : o._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      }) : ((0, v.addIssueToContext)(r, {
        code: R.ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [i]
      }), v.INVALID);
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(t, r, i) {
      let n = /* @__PURE__ */ new Map();
      for (let o of r) {
        let a = $t(o.shape[t]);
        if (!a.length)
          throw new Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
        for (let u of a) {
          if (n.has(u))
            throw new Error(`Discriminator property ${String(t)} has duplicate value ${String(u)}`);
          n.set(u, o);
        }
      }
      return new e({
        typeName: N.ZodDiscriminatedUnion,
        discriminator: t,
        options: r,
        optionsMap: n,
        ...W(i)
      });
    }
  };
  y.ZodDiscriminatedUnion = ya;
  function Md(e, t) {
    let r = (0, O.getParsedType)(e), i = (0, O.getParsedType)(t);
    if (e === t)
      return { valid: !0, data: e };
    if (r === O.ZodParsedType.object && i === O.ZodParsedType.object) {
      let n = O.util.objectKeys(t), o = O.util.objectKeys(e).filter((u) => n.indexOf(u) !== -1), a = { ...e, ...t };
      for (let u of o) {
        let l = Md(e[u], t[u]);
        if (!l.valid)
          return { valid: !1 };
        a[u] = l.data;
      }
      return { valid: !0, data: a };
    } else if (r === O.ZodParsedType.array && i === O.ZodParsedType.array) {
      if (e.length !== t.length)
        return { valid: !1 };
      let n = [];
      for (let o = 0; o < e.length; o++) {
        let a = e[o], u = t[o], l = Md(a, u);
        if (!l.valid)
          return { valid: !1 };
        n.push(l.data);
      }
      return { valid: !0, data: n };
    } else return r === O.ZodParsedType.date && i === O.ZodParsedType.date && +e == +t ? { valid: !0, data: e } : { valid: !1 };
  }
  s(Md, "mergeValues");
  var Nr = class extends $ {
    static {
      s(this, "ZodIntersection");
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t), n = /* @__PURE__ */ s((o, a) => {
        if ((0, v.isAborted)(o) || (0, v.isAborted)(a))
          return v.INVALID;
        let u = Md(o.value, a.value);
        return u.valid ? (((0, v.isDirty)(o) || (0, v.isDirty)(a)) && r.dirty(), { status: r.value, value: u.data }) : ((0, v.addIssueToContext)(
        i, {
          code: R.ZodIssueCode.invalid_intersection_types
        }), v.INVALID);
      }, "handleParsed");
      return i.common.async ? Promise.all([
        this._def.left._parseAsync({
          data: i.data,
          path: i.path,
          parent: i
        }),
        this._def.right._parseAsync({
          data: i.data,
          path: i.path,
          parent: i
        })
      ]).then(([o, a]) => n(o, a)) : n(this._def.left._parseSync({
        data: i.data,
        path: i.path,
        parent: i
      }), this._def.right._parseSync({
        data: i.data,
        path: i.path,
        parent: i
      }));
    }
  };
  y.ZodIntersection = Nr;
  Nr.create = (e, t, r) => new Nr({
    left: e,
    right: t,
    typeName: N.ZodIntersection,
    ...W(r)
  });
  var vt = class e extends $ {
    static {
      s(this, "ZodTuple");
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t);
      if (i.parsedType !== O.ZodParsedType.array)
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.array,
          received: i.parsedType
        }), v.INVALID;
      if (i.data.length < this._def.items.length)
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: "array"
        }), v.INVALID;
      !this._def.rest && i.data.length > this._def.items.length && ((0, v.addIssueToContext)(i, {
        code: R.ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), r.dirty());
      let o = [...i.data].map((a, u) => {
        let l = this._def.items[u] || this._def.rest;
        return l ? l._parse(new Xe(i, a, i.path, u)) : null;
      }).filter((a) => !!a);
      return i.common.async ? Promise.all(o).then((a) => v.ParseStatus.mergeArray(r, a)) : v.ParseStatus.mergeArray(r, o);
    }
    get items() {
      return this._def.items;
    }
    rest(t) {
      return new e({
        ...this._def,
        rest: t
      });
    }
  };
  y.ZodTuple = vt;
  vt.create = (e, t) => {
    if (!Array.isArray(e))
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new vt({
      items: e,
      typeName: N.ZodTuple,
      rest: null,
      ...W(t)
    });
  };
  var ba = class e extends $ {
    static {
      s(this, "ZodRecord");
    }
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t);
      if (i.parsedType !== O.ZodParsedType.object)
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.object,
          received: i.parsedType
        }), v.INVALID;
      let n = [], o = this._def.keyType, a = this._def.valueType;
      for (let u in i.data)
        n.push({
          key: o._parse(new Xe(i, u, i.path, u)),
          value: a._parse(new Xe(i, i.data[u], i.path, u)),
          alwaysSet: u in i.data
        });
      return i.common.async ? v.ParseStatus.mergeObjectAsync(r, n) : v.ParseStatus.mergeObjectSync(r, n);
    }
    get element() {
      return this._def.valueType;
    }
    static create(t, r, i) {
      return r instanceof $ ? new e({
        keyType: t,
        valueType: r,
        typeName: N.ZodRecord,
        ...W(i)
      }) : new e({
        keyType: ur.create(),
        valueType: t,
        typeName: N.ZodRecord,
        ...W(r)
      });
    }
  };
  y.ZodRecord = ba;
  var Ii = class extends $ {
    static {
      s(this, "ZodMap");
    }
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t);
      if (i.parsedType !== O.ZodParsedType.map)
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.map,
          received: i.parsedType
        }), v.INVALID;
      let n = this._def.keyType, o = this._def.valueType, a = [...i.data.entries()].map(([u, l], c) => ({
        key: n._parse(new Xe(i, u, i.path, [c, "key"])),
        value: o._parse(new Xe(i, l, i.path, [c, "value"]))
      }));
      if (i.common.async) {
        let u = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (let l of a) {
            let c = await l.key, d = await l.value;
            if (c.status === "aborted" || d.status === "aborted")
              return v.INVALID;
            (c.status === "dirty" || d.status === "dirty") && r.dirty(), u.set(c.value, d.value);
          }
          return { status: r.value, value: u };
        });
      } else {
        let u = /* @__PURE__ */ new Map();
        for (let l of a) {
          let c = l.key, d = l.value;
          if (c.status === "aborted" || d.status === "aborted")
            return v.INVALID;
          (c.status === "dirty" || d.status === "dirty") && r.dirty(), u.set(c.value, d.value);
        }
        return { status: r.value, value: u };
      }
    }
  };
  y.ZodMap = Ii;
  Ii.create = (e, t, r) => new Ii({
    valueType: t,
    keyType: e,
    typeName: N.ZodMap,
    ...W(r)
  });
  var Mi = class e extends $ {
    static {
      s(this, "ZodSet");
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t);
      if (i.parsedType !== O.ZodParsedType.set)
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.set,
          received: i.parsedType
        }), v.INVALID;
      let n = this._def;
      n.minSize !== null && i.data.size < n.minSize.value && ((0, v.addIssueToContext)(i, {
        code: R.ZodIssueCode.too_small,
        minimum: n.minSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: n.minSize.message
      }), r.dirty()), n.maxSize !== null && i.data.size > n.maxSize.value && ((0, v.addIssueToContext)(i, {
        code: R.ZodIssueCode.too_big,
        maximum: n.maxSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: n.maxSize.message
      }), r.dirty());
      let o = this._def.valueType;
      function a(l) {
        let c = /* @__PURE__ */ new Set();
        for (let d of l) {
          if (d.status === "aborted")
            return v.INVALID;
          d.status === "dirty" && r.dirty(), c.add(d.value);
        }
        return { status: r.value, value: c };
      }
      s(a, "finalizeSet");
      let u = [...i.data.values()].map((l, c) => o._parse(new Xe(i, l, i.path, c)));
      return i.common.async ? Promise.all(u).then((l) => a(l)) : a(u);
    }
    min(t, r) {
      return new e({
        ...this._def,
        minSize: { value: t, message: L.errorUtil.toString(r) }
      });
    }
    max(t, r) {
      return new e({
        ...this._def,
        maxSize: { value: t, message: L.errorUtil.toString(r) }
      });
    }
    size(t, r) {
      return this.min(t, r).max(t, r);
    }
    nonempty(t) {
      return this.min(1, t);
    }
  };
  y.ZodSet = Mi;
  Mi.create = (e, t) => new Mi({
    valueType: e,
    minSize: null,
    maxSize: null,
    typeName: N.ZodSet,
    ...W(t)
  });
  var va = class e extends $ {
    static {
      s(this, "ZodFunction");
    }
    constructor() {
      super(...arguments), this.validate = this.implement;
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t);
      if (r.parsedType !== O.ZodParsedType.function)
        return (0, v.addIssueToContext)(r, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.function,
          received: r.parsedType
        }), v.INVALID;
      function i(u, l) {
        return (0, v.makeIssue)({
          data: u,
          path: r.path,
          errorMaps: [
            r.common.contextualErrorMap,
            r.schemaErrorMap,
            (0, ma.getErrorMap)(),
            ma.defaultErrorMap
          ].filter((c) => !!c),
          issueData: {
            code: R.ZodIssueCode.invalid_arguments,
            argumentsError: l
          }
        });
      }
      s(i, "makeArgsIssue");
      function n(u, l) {
        return (0, v.makeIssue)({
          data: u,
          path: r.path,
          errorMaps: [
            r.common.contextualErrorMap,
            r.schemaErrorMap,
            (0, ma.getErrorMap)(),
            ma.defaultErrorMap
          ].filter((c) => !!c),
          issueData: {
            code: R.ZodIssueCode.invalid_return_type,
            returnTypeError: l
          }
        });
      }
      s(n, "makeReturnsIssue");
      let o = { errorMap: r.common.contextualErrorMap }, a = r.data;
      if (this._def.returns instanceof cr) {
        let u = this;
        return (0, v.OK)(async function(...l) {
          let c = new R.ZodError([]), d = await u._def.args.parseAsync(l, o).catch((f) => {
            throw c.addIssue(i(l, f)), c;
          }), p = await Reflect.apply(a, this, d);
          return await u._def.returns._def.type.parseAsync(p, o).catch((f) => {
            throw c.addIssue(n(p, f)), c;
          });
        });
      } else {
        let u = this;
        return (0, v.OK)(function(...l) {
          let c = u._def.args.safeParse(l, o);
          if (!c.success)
            throw new R.ZodError([i(l, c.error)]);
          let d = Reflect.apply(a, this, c.data), p = u._def.returns.safeParse(d, o);
          if (!p.success)
            throw new R.ZodError([n(d, p.error)]);
          return p.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...t) {
      return new e({
        ...this._def,
        args: vt.create(t).rest(Ht.create())
      });
    }
    returns(t) {
      return new e({
        ...this._def,
        returns: t
      });
    }
    implement(t) {
      return this.parse(t);
    }
    strictImplement(t) {
      return this.parse(t);
    }
    static create(t, r, i) {
      return new e({
        args: t || vt.create([]).rest(Ht.create()),
        returns: r || Ht.create(),
        typeName: N.ZodFunction,
        ...W(i)
      });
    }
  };
  y.ZodFunction = va;
  var Ur = class extends $ {
    static {
      s(this, "ZodLazy");
    }
    get schema() {
      return this._def.getter();
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t);
      return this._def.getter()._parse({ data: r.data, path: r.path, parent: r });
    }
  };
  y.ZodLazy = Ur;
  Ur.create = (e, t) => new Ur({
    getter: e,
    typeName: N.ZodLazy,
    ...W(t)
  });
  var Wr = class extends $ {
    static {
      s(this, "ZodLiteral");
    }
    _parse(t) {
      if (t.data !== this._def.value) {
        let r = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(r, {
          received: r.data,
          code: R.ZodIssueCode.invalid_literal,
          expected: this._def.value
        }), v.INVALID;
      }
      return { status: "valid", value: t.data };
    }
    get value() {
      return this._def.value;
    }
  };
  y.ZodLiteral = Wr;
  Wr.create = (e, t) => new Wr({
    value: e,
    typeName: N.ZodLiteral,
    ...W(t)
  });
  function V_(e, t) {
    return new $r({
      values: e,
      typeName: N.ZodEnum,
      ...W(t)
    });
  }
  s(V_, "createZodEnum");
  var $r = class e extends $ {
    static {
      s(this, "ZodEnum");
    }
    constructor() {
      super(...arguments), ss.set(this, void 0);
    }
    _parse(t) {
      if (typeof t.data != "string") {
        let r = this._getOrReturnCtx(t), i = this._def.values;
        return (0, v.addIssueToContext)(r, {
          expected: O.util.joinValues(i),
          received: r.parsedType,
          code: R.ZodIssueCode.invalid_type
        }), v.INVALID;
      }
      if (ga(this, ss, "f") || U_(this, ss, new Set(this._def.values), "f"), !ga(this, ss, "f").has(t.data)) {
        let r = this._getOrReturnCtx(t), i = this._def.values;
        return (0, v.addIssueToContext)(r, {
          received: r.data,
          code: R.ZodIssueCode.invalid_enum_value,
          options: i
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      let t = {};
      for (let r of this._def.values)
        t[r] = r;
      return t;
    }
    get Values() {
      let t = {};
      for (let r of this._def.values)
        t[r] = r;
      return t;
    }
    get Enum() {
      let t = {};
      for (let r of this._def.values)
        t[r] = r;
      return t;
    }
    extract(t, r = this._def) {
      return e.create(t, {
        ...this._def,
        ...r
      });
    }
    exclude(t, r = this._def) {
      return e.create(this.options.filter((i) => !t.includes(i)), {
        ...this._def,
        ...r
      });
    }
  };
  y.ZodEnum = $r;
  ss = /* @__PURE__ */ new WeakMap();
  $r.create = V_;
  var Hr = class extends $ {
    static {
      s(this, "ZodNativeEnum");
    }
    constructor() {
      super(...arguments), os.set(this, void 0);
    }
    _parse(t) {
      let r = O.util.getValidEnumValues(this._def.values), i = this._getOrReturnCtx(t);
      if (i.parsedType !== O.ZodParsedType.string && i.parsedType !== O.ZodParsedType.number) {
        let n = O.util.objectValues(r);
        return (0, v.addIssueToContext)(i, {
          expected: O.util.joinValues(n),
          received: i.parsedType,
          code: R.ZodIssueCode.invalid_type
        }), v.INVALID;
      }
      if (ga(this, os, "f") || U_(this, os, new Set(O.util.getValidEnumValues(this._def.values)), "f"), !ga(this, os, "f").has(t.data)) {
        let n = O.util.objectValues(r);
        return (0, v.addIssueToContext)(i, {
          received: i.data,
          code: R.ZodIssueCode.invalid_enum_value,
          options: n
        }), v.INVALID;
      }
      return (0, v.OK)(t.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  y.ZodNativeEnum = Hr;
  os = /* @__PURE__ */ new WeakMap();
  Hr.create = (e, t) => new Hr({
    values: e,
    typeName: N.ZodNativeEnum,
    ...W(t)
  });
  var cr = class extends $ {
    static {
      s(this, "ZodPromise");
    }
    unwrap() {
      return this._def.type;
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t);
      if (r.parsedType !== O.ZodParsedType.promise && r.common.async === !1)
        return (0, v.addIssueToContext)(r, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.promise,
          received: r.parsedType
        }), v.INVALID;
      let i = r.parsedType === O.ZodParsedType.promise ? r.data : Promise.resolve(r.data);
      return (0, v.OK)(i.then((n) => this._def.type.parseAsync(n, {
        path: r.path,
        errorMap: r.common.contextualErrorMap
      })));
    }
  };
  y.ZodPromise = cr;
  cr.create = (e, t) => new cr({
    type: e,
    typeName: N.ZodPromise,
    ...W(t)
  });
  var Ze = class extends $ {
    static {
      s(this, "ZodEffects");
    }
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === N.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t), n = this._def.effect || null, o = {
        addIssue: /* @__PURE__ */ s((a) => {
          (0, v.addIssueToContext)(i, a), a.fatal ? r.abort() : r.dirty();
        }, "addIssue"),
        get path() {
          return i.path;
        }
      };
      if (o.addIssue = o.addIssue.bind(o), n.type === "preprocess") {
        let a = n.transform(i.data, o);
        if (i.common.async)
          return Promise.resolve(a).then(async (u) => {
            if (r.value === "aborted")
              return v.INVALID;
            let l = await this._def.schema._parseAsync({
              data: u,
              path: i.path,
              parent: i
            });
            return l.status === "aborted" ? v.INVALID : l.status === "dirty" || r.value === "dirty" ? (0, v.DIRTY)(l.value) : l;
          });
        {
          if (r.value === "aborted")
            return v.INVALID;
          let u = this._def.schema._parseSync({
            data: a,
            path: i.path,
            parent: i
          });
          return u.status === "aborted" ? v.INVALID : u.status === "dirty" || r.value === "dirty" ? (0, v.DIRTY)(u.value) : u;
        }
      }
      if (n.type === "refinement") {
        let a = /* @__PURE__ */ s((u) => {
          let l = n.refinement(u, o);
          if (i.common.async)
            return Promise.resolve(l);
          if (l instanceof Promise)
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          return u;
        }, "executeRefinement");
        if (i.common.async === !1) {
          let u = this._def.schema._parseSync({
            data: i.data,
            path: i.path,
            parent: i
          });
          return u.status === "aborted" ? v.INVALID : (u.status === "dirty" && r.dirty(), a(u.value), { status: r.value, value: u.value });
        } else
          return this._def.schema._parseAsync({ data: i.data, path: i.path, parent: i }).then((u) => u.status === "aborted" ? v.INVALID : (u.
          status === "dirty" && r.dirty(), a(u.value).then(() => ({ status: r.value, value: u.value }))));
      }
      if (n.type === "transform")
        if (i.common.async === !1) {
          let a = this._def.schema._parseSync({
            data: i.data,
            path: i.path,
            parent: i
          });
          if (!(0, v.isValid)(a))
            return a;
          let u = n.transform(a.value, o);
          if (u instanceof Promise)
            throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
          return { status: r.value, value: u };
        } else
          return this._def.schema._parseAsync({ data: i.data, path: i.path, parent: i }).then((a) => (0, v.isValid)(a) ? Promise.resolve(n.transform(
          a.value, o)).then((u) => ({ status: r.value, value: u })) : a);
      O.util.assertNever(n);
    }
  };
  y.ZodEffects = Ze;
  y.ZodTransformer = Ze;
  Ze.create = (e, t, r) => new Ze({
    schema: e,
    typeName: N.ZodEffects,
    effect: t,
    ...W(r)
  });
  Ze.createWithPreprocess = (e, t, r) => new Ze({
    schema: t,
    effect: { type: "preprocess", transform: e },
    typeName: N.ZodEffects,
    ...W(r)
  });
  var Je = class extends $ {
    static {
      s(this, "ZodOptional");
    }
    _parse(t) {
      return this._getType(t) === O.ZodParsedType.undefined ? (0, v.OK)(void 0) : this._def.innerType._parse(t);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  y.ZodOptional = Je;
  Je.create = (e, t) => new Je({
    innerType: e,
    typeName: N.ZodOptional,
    ...W(t)
  });
  var _t = class extends $ {
    static {
      s(this, "ZodNullable");
    }
    _parse(t) {
      return this._getType(t) === O.ZodParsedType.null ? (0, v.OK)(null) : this._def.innerType._parse(t);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  y.ZodNullable = _t;
  _t.create = (e, t) => new _t({
    innerType: e,
    typeName: N.ZodNullable,
    ...W(t)
  });
  var Vr = class extends $ {
    static {
      s(this, "ZodDefault");
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t), i = r.data;
      return r.parsedType === O.ZodParsedType.undefined && (i = this._def.defaultValue()), this._def.innerType._parse({
        data: i,
        path: r.path,
        parent: r
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  y.ZodDefault = Vr;
  Vr.create = (e, t) => new Vr({
    innerType: e,
    typeName: N.ZodDefault,
    defaultValue: typeof t.default == "function" ? t.default : () => t.default,
    ...W(t)
  });
  var Zr = class extends $ {
    static {
      s(this, "ZodCatch");
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t), i = {
        ...r,
        common: {
          ...r.common,
          issues: []
        }
      }, n = this._def.innerType._parse({
        data: i.data,
        path: i.path,
        parent: {
          ...i
        }
      });
      return (0, v.isAsync)(n) ? n.then((o) => ({
        status: "valid",
        value: o.status === "valid" ? o.value : this._def.catchValue({
          get error() {
            return new R.ZodError(i.common.issues);
          },
          input: i.data
        })
      })) : {
        status: "valid",
        value: n.status === "valid" ? n.value : this._def.catchValue({
          get error() {
            return new R.ZodError(i.common.issues);
          },
          input: i.data
        })
      };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  y.ZodCatch = Zr;
  Zr.create = (e, t) => new Zr({
    innerType: e,
    typeName: N.ZodCatch,
    catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
    ...W(t)
  });
  var ji = class extends $ {
    static {
      s(this, "ZodNaN");
    }
    _parse(t) {
      if (this._getType(t) !== O.ZodParsedType.nan) {
        let i = this._getOrReturnCtx(t);
        return (0, v.addIssueToContext)(i, {
          code: R.ZodIssueCode.invalid_type,
          expected: O.ZodParsedType.nan,
          received: i.parsedType
        }), v.INVALID;
      }
      return { status: "valid", value: t.data };
    }
  };
  y.ZodNaN = ji;
  ji.create = (e) => new ji({
    typeName: N.ZodNaN,
    ...W(e)
  });
  y.BRAND = Symbol("zod_brand");
  var as = class extends $ {
    static {
      s(this, "ZodBranded");
    }
    _parse(t) {
      let { ctx: r } = this._processInputParams(t), i = r.data;
      return this._def.type._parse({
        data: i,
        path: r.path,
        parent: r
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  y.ZodBranded = as;
  var us = class e extends $ {
    static {
      s(this, "ZodPipeline");
    }
    _parse(t) {
      let { status: r, ctx: i } = this._processInputParams(t);
      if (i.common.async)
        return (/* @__PURE__ */ s(async () => {
          let o = await this._def.in._parseAsync({
            data: i.data,
            path: i.path,
            parent: i
          });
          return o.status === "aborted" ? v.INVALID : o.status === "dirty" ? (r.dirty(), (0, v.DIRTY)(o.value)) : this._def.out._parseAsync(
          {
            data: o.value,
            path: i.path,
            parent: i
          });
        }, "handleAsync"))();
      {
        let n = this._def.in._parseSync({
          data: i.data,
          path: i.path,
          parent: i
        });
        return n.status === "aborted" ? v.INVALID : n.status === "dirty" ? (r.dirty(), {
          status: "dirty",
          value: n.value
        }) : this._def.out._parseSync({
          data: n.value,
          path: i.path,
          parent: i
        });
      }
    }
    static create(t, r) {
      return new e({
        in: t,
        out: r,
        typeName: N.ZodPipeline
      });
    }
  };
  y.ZodPipeline = us;
  var zr = class extends $ {
    static {
      s(this, "ZodReadonly");
    }
    _parse(t) {
      let r = this._def.innerType._parse(t), i = /* @__PURE__ */ s((n) => ((0, v.isValid)(n) && (n.value = Object.freeze(n.value)), n), "fre\
eze");
      return (0, v.isAsync)(r) ? r.then((n) => i(n)) : i(r);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  y.ZodReadonly = zr;
  zr.create = (e, t) => new zr({
    innerType: e,
    typeName: N.ZodReadonly,
    ...W(t)
  });
  function Z_(e, t = {}, r) {
    return e ? lr.create().superRefine((i, n) => {
      var o, a;
      if (!e(i)) {
        let u = typeof t == "function" ? t(i) : typeof t == "string" ? { message: t } : t, l = (a = (o = u.fatal) !== null && o !== void 0 ?
        o : r) !== null && a !== void 0 ? a : !0, c = typeof u == "string" ? { message: u } : u;
        n.addIssue({ code: "custom", ...c, fatal: l });
      }
    }) : lr.create();
  }
  s(Z_, "custom");
  y.custom = Z_;
  y.late = {
    object: We.lazycreate
  };
  var N;
  (function(e) {
    e.ZodString = "ZodString", e.ZodNumber = "ZodNumber", e.ZodNaN = "ZodNaN", e.ZodBigInt = "ZodBigInt", e.ZodBoolean = "ZodBoolean", e.ZodDate =
    "ZodDate", e.ZodSymbol = "ZodSymbol", e.ZodUndefined = "ZodUndefined", e.ZodNull = "ZodNull", e.ZodAny = "ZodAny", e.ZodUnknown = "ZodUn\
known", e.ZodNever = "ZodNever", e.ZodVoid = "ZodVoid", e.ZodArray = "ZodArray", e.ZodObject = "ZodObject", e.ZodUnion = "ZodUnion", e.ZodDiscriminatedUnion =
    "ZodDiscriminatedUnion", e.ZodIntersection = "ZodIntersection", e.ZodTuple = "ZodTuple", e.ZodRecord = "ZodRecord", e.ZodMap = "ZodMap",
    e.ZodSet = "ZodSet", e.ZodFunction = "ZodFunction", e.ZodLazy = "ZodLazy", e.ZodLiteral = "ZodLiteral", e.ZodEnum = "ZodEnum", e.ZodEffects =
    "ZodEffects", e.ZodNativeEnum = "ZodNativeEnum", e.ZodOptional = "ZodOptional", e.ZodNullable = "ZodNullable", e.ZodDefault = "ZodDefaul\
t", e.ZodCatch = "ZodCatch", e.ZodPromise = "ZodPromise", e.ZodBranded = "ZodBranded", e.ZodPipeline = "ZodPipeline", e.ZodReadonly = "ZodRe\
adonly";
  })(N || (y.ZodFirstPartyTypeKind = N = {}));
  var LB = /* @__PURE__ */ s((e, t = {
    message: `Input not instance of ${e.name}`
  }) => Z_((r) => r instanceof e, t), "instanceOfType");
  y.instanceof = LB;
  var z_ = ur.create;
  y.string = z_;
  var G_ = Br.create;
  y.number = G_;
  var NB = ji.create;
  y.nan = NB;
  var UB = Pr.create;
  y.bigint = UB;
  var K_ = Ir.create;
  y.boolean = K_;
  var WB = Mr.create;
  y.date = WB;
  var $B = Bi.create;
  y.symbol = $B;
  var HB = jr.create;
  y.undefined = HB;
  var VB = qr.create;
  y.null = VB;
  var ZB = lr.create;
  y.any = ZB;
  var zB = Ht.create;
  y.unknown = zB;
  var GB = st.create;
  y.never = GB;
  var KB = Pi.create;
  y.void = KB;
  var YB = Vt.create;
  y.array = YB;
  var JB = We.create;
  y.object = JB;
  var XB = We.strictCreate;
  y.strictObject = XB;
  var QB = Lr.create;
  y.union = QB;
  var e8 = ya.create;
  y.discriminatedUnion = e8;
  var t8 = Nr.create;
  y.intersection = t8;
  var r8 = vt.create;
  y.tuple = r8;
  var i8 = ba.create;
  y.record = i8;
  var n8 = Ii.create;
  y.map = n8;
  var s8 = Mi.create;
  y.set = s8;
  var o8 = va.create;
  y.function = o8;
  var a8 = Ur.create;
  y.lazy = a8;
  var u8 = Wr.create;
  y.literal = u8;
  var l8 = $r.create;
  y.enum = l8;
  var c8 = Hr.create;
  y.nativeEnum = c8;
  var d8 = cr.create;
  y.promise = d8;
  var Y_ = Ze.create;
  y.effect = Y_;
  y.transformer = Y_;
  var f8 = Je.create;
  y.optional = f8;
  var h8 = _t.create;
  y.nullable = h8;
  var p8 = Ze.createWithPreprocess;
  y.preprocess = p8;
  var D8 = us.create;
  y.pipeline = D8;
  var m8 = /* @__PURE__ */ s(() => z_().optional(), "ostring");
  y.ostring = m8;
  var g8 = /* @__PURE__ */ s(() => G_().optional(), "onumber");
  y.onumber = g8;
  var y8 = /* @__PURE__ */ s(() => K_().optional(), "oboolean");
  y.oboolean = y8;
  y.coerce = {
    string: /* @__PURE__ */ s((e) => ur.create({ ...e, coerce: !0 }), "string"),
    number: /* @__PURE__ */ s((e) => Br.create({ ...e, coerce: !0 }), "number"),
    boolean: /* @__PURE__ */ s((e) => Ir.create({
      ...e,
      coerce: !0
    }), "boolean"),
    bigint: /* @__PURE__ */ s((e) => Pr.create({ ...e, coerce: !0 }), "bigint"),
    date: /* @__PURE__ */ s((e) => Mr.create({ ...e, coerce: !0 }), "date")
  };
  y.NEVER = v.INVALID;
});

// ../node_modules/zod/lib/external.js
var jd = b((Qe) => {
  "use strict";
  var b8 = Qe && Qe.__createBinding || (Object.create ? function(e, t, r, i) {
    i === void 0 && (i = r);
    var n = Object.getOwnPropertyDescriptor(t, r);
    (!n || ("get" in n ? !t.__esModule : n.writable || n.configurable)) && (n = { enumerable: !0, get: /* @__PURE__ */ s(function() {
      return t[r];
    }, "get") }), Object.defineProperty(e, i, n);
  } : function(e, t, r, i) {
    i === void 0 && (i = r), e[i] = t[r];
  }), qi = Qe && Qe.__exportStar || function(e, t) {
    for (var r in e) r !== "default" && !Object.prototype.hasOwnProperty.call(t, r) && b8(t, e, r);
  };
  Object.defineProperty(Qe, "__esModule", { value: !0 });
  qi(pa(), Qe);
  qi(Pd(), Qe);
  qi(j_(), Qe);
  qi(is(), Qe);
  qi(J_(), Qe);
  qi(ha(), Qe);
});

// ../node_modules/zod/lib/index.js
var ew = b(($e) => {
  "use strict";
  var X_ = $e && $e.__createBinding || (Object.create ? function(e, t, r, i) {
    i === void 0 && (i = r);
    var n = Object.getOwnPropertyDescriptor(t, r);
    (!n || ("get" in n ? !t.__esModule : n.writable || n.configurable)) && (n = { enumerable: !0, get: /* @__PURE__ */ s(function() {
      return t[r];
    }, "get") }), Object.defineProperty(e, i, n);
  } : function(e, t, r, i) {
    i === void 0 && (i = r), e[i] = t[r];
  }), v8 = $e && $e.__setModuleDefault || (Object.create ? function(e, t) {
    Object.defineProperty(e, "default", { enumerable: !0, value: t });
  } : function(e, t) {
    e.default = t;
  }), _8 = $e && $e.__importStar || function(e) {
    if (e && e.__esModule) return e;
    var t = {};
    if (e != null) for (var r in e) r !== "default" && Object.prototype.hasOwnProperty.call(e, r) && X_(t, e, r);
    return v8(t, e), t;
  }, w8 = $e && $e.__exportStar || function(e, t) {
    for (var r in e) r !== "default" && !Object.prototype.hasOwnProperty.call(t, r) && X_(t, e, r);
  };
  Object.defineProperty($e, "__esModule", { value: !0 });
  $e.z = void 0;
  var Q_ = _8(jd());
  $e.z = Q_;
  w8(jd(), $e);
  $e.default = Q_;
});

// src/cli/index.ts
var T8 = {};
cw(T8, {
  ANGULAR_JSON_PATH: () => es,
  AngularJSON: () => Cd,
  CommunityBuilder: () => fv,
  CoreBuilder: () => Jc,
  CoreWebpackCompilers: () => dv,
  ProjectType: () => ea,
  SUPPORTED_ESLINT_EXTENSIONS: () => A_,
  SUPPORTED_RENDERERS: () => xk,
  Settings: () => ls,
  SupportedLanguage: () => Xc,
  _clearGlobalSettings: () => S8,
  addToDevDependenciesIfNotPresent: () => Ik,
  adjustTemplate: () => bv,
  builderNameToCoreBuilder: () => Sk,
  cliStoriesTargetPath: () => yv,
  coerceSemver: () => Nk,
  compilerNameToCoreCompiler: () => Fk,
  compoDocPreviewPrefix: () => VO,
  configureEslintPlugin: () => eB,
  copyTemplate: () => Mk,
  copyTemplateFiles: () => qk,
  detect: () => Jk,
  detectBuilder: () => zk,
  detectFrameworkPreset: () => Ev,
  detectLanguage: () => Yk,
  detectPnp: () => Kk,
  externalFrameworks: () => Yc,
  extractEslintInfo: () => QO,
  findEslintFile: () => R_,
  frameworkToDefaultBuilder: () => jk,
  frameworkToRenderer: () => mv,
  getBabelDependencies: () => Pk,
  getRendererDir: () => id,
  getStorybookVersionSpecifier: () => Lk,
  getVersionSafe: () => gv,
  globalSettings: () => F8,
  hasStorybookDependencies: () => Uk,
  installableProjectTypes: () => Ak,
  isNxProject: () => nd,
  isStorybookInstantiated: () => Gk,
  normalizeExtends: () => da,
  promptForCompoDocs: () => ZO,
  readFileAsJson: () => Ok,
  suggestESLintPlugin: () => tB,
  supportedTemplates: () => Qc,
  unsupportedTemplate: () => ed,
  writeFileAsJson: () => Bk
});
module.exports = dw(T8);

// src/cli/detect.ts
var Zn = require("node:fs"), vv = require("node:path"), zn = require("@storybook/core/common"), _v = require("@storybook/core/node-logger");

// node_modules/find-up/index.js
var Kr = X(require("node:path"), 1);

// ../node_modules/locate-path/index.js
var Nd = X(require("node:process"), 1), Ud = X(require("node:path"), 1), ds = X(require("node:fs"), 1), Wd = require("node:url");
var $d = {
  directory: "isDirectory",
  file: "isFile"
};
function fw(e) {
  if (!Object.hasOwnProperty.call($d, e))
    throw new Error(`Invalid type specified: ${e}`);
}
s(fw, "checkType");
var hw = /* @__PURE__ */ s((e, t) => t[$d[e]](), "matchType"), pw = /* @__PURE__ */ s((e) => e instanceof URL ? (0, Wd.fileURLToPath)(e) : e,
"toPath");
function xa(e, {
  cwd: t = Nd.default.cwd(),
  type: r = "file",
  allowSymlinks: i = !0
} = {}) {
  fw(r), t = pw(t);
  let n = i ? ds.default.statSync : ds.default.lstatSync;
  for (let o of e)
    try {
      let a = n(Ud.default.resolve(t, o), {
        throwIfNoEntry: !1
      });
      if (!a)
        continue;
      if (hw(r, a))
        return o;
    } catch {
    }
}
s(xa, "locatePathSync");

// ../node_modules/unicorn-magic/node.js
var Hd = require("node:url");
function Fa(e) {
  return e instanceof URL ? (0, Hd.fileURLToPath)(e) : e;
}
s(Fa, "toPath");

// node_modules/path-exists/index.js
var Vd = X(require("node:fs"), 1);

// node_modules/find-up/index.js
var Dw = Symbol("findUpStop");
function mw(e, t = {}) {
  let r = Kr.default.resolve(Fa(t.cwd) ?? ""), { root: i } = Kr.default.parse(r), n = Kr.default.resolve(r, Fa(t.stopAt) ?? i), o = t.limit ??
  Number.POSITIVE_INFINITY, a = [e].flat(), u = /* @__PURE__ */ s((c) => {
    if (typeof e != "function")
      return xa(a, c);
    let d = e(c.cwd);
    return typeof d == "string" ? xa([d], c) : d;
  }, "runMatcher"), l = [];
  for (; ; ) {
    let c = u({ ...t, cwd: r });
    if (c === Dw || (c && l.push(Kr.default.resolve(r, c)), r === n || l.length >= o))
      break;
    r = Kr.default.dirname(r);
  }
  return l;
}
s(mw, "findUpMultipleSync");
function Yr(e, t = {}) {
  return mw(e, { ...t, limit: 1 })[0];
}
s(Yr, "findUpSync");

// src/cli/detect.ts
var wv = X(Ts(), 1), nr = X(require("semver"), 1);

// src/cli/helpers.ts
var je = require("node:fs"), Sr = require("node:fs/promises"), it = require("node:path"), hv = require("@storybook/core/common"), pv = require("@storybook/core/common");
var Dv = X(Lu(), 1), Tr = require("semver");

// ../node_modules/strip-json-comments/index.js
var Nu = Symbol("singleComment"), CD = Symbol("multiComment"), Cx = /* @__PURE__ */ s(() => "", "stripWithoutWhitespace"), xx = /* @__PURE__ */ s(
(e, t, r) => e.slice(t, r).replace(/\S/g, " "), "stripWithWhitespace"), Fx = /* @__PURE__ */ s((e, t) => {
  let r = t - 1, i = 0;
  for (; e[r] === "\\"; )
    r -= 1, i += 1;
  return !!(i % 2);
}, "isEscaped");
function Uu(e, { whitespace: t = !0, trailingCommas: r = !1 } = {}) {
  if (typeof e != "string")
    throw new TypeError(`Expected argument \`jsonString\` to be a \`string\`, got \`${typeof e}\``);
  let i = t ? xx : Cx, n = !1, o = !1, a = 0, u = "", l = "", c = -1;
  for (let d = 0; d < e.length; d++) {
    let p = e[d], h = e[d + 1];
    if (!o && p === '"' && (Fx(e, d) || (n = !n)), !n)
      if (!o && p + h === "//")
        u += e.slice(a, d), a = d, o = Nu, d++;
      else if (o === Nu && p + h === `\r
`) {
        d++, o = !1, u += i(e, a, d), a = d;
        continue;
      } else if (o === Nu && p === `
`)
        o = !1, u += i(e, a, d), a = d;
      else if (!o && p + h === "/*") {
        u += e.slice(a, d), a = d, o = CD, d++;
        continue;
      } else if (o === CD && p + h === "*/") {
        d++, o = !1, u += i(e, a, d + 1), a = d + 1;
        continue;
      } else r && !o && (c !== -1 ? p === "}" || p === "]" ? (u += e.slice(a, d), l += i(u, 0, 1) + u.slice(1), u = "", a = d, c = -1) : p !==
      " " && p !== "	" && p !== "\r" && p !== `
` && (u += e.slice(a, d), a = d, c = -1) : p === "," && (l += u + e.slice(a, d), u = "", a = d, c = d));
  }
  return l + u + (o ? i(e.slice(a)) : e.slice(a));
}
s(Uu, "stripJsonComments");

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var Sx = process.env.NODE_ENV === "production", Wu = "Invariant failed";
function en(e, t) {
  if (!e) {
    if (Sx)
      throw new Error(Wu);
    var r = typeof t == "function" ? t() : t, i = r ? "".concat(Wu, ": ").concat(r) : Wu;
    throw new Error(i);
  }
}
s(en, "invariant");

// src/cli/dirs.ts
var Vn = require("node:path"), ta = require("@storybook/core/common"), td = X(av(), 1), rd = X(cv(), 1);

// src/cli/project_types.ts
var Qo = require("semver");
function Ck(e, t) {
  return (0, Qo.validRange)(e) ? (0, Qo.minVersion)(e)?.major === t : !1;
}
s(Ck, "eqMajor");
var Yc = [
  { name: "qwik", packageName: "storybook-framework-qwik" },
  { name: "solid", frameworks: ["storybook-solidjs-vite"], renderer: "storybook-solidjs" },
  {
    name: "nuxt",
    packageName: "@storybook-vue/nuxt",
    frameworks: ["@storybook-vue/nuxt"],
    renderer: "@storybook/vue3"
  }
], xk = [
  "react",
  "react-native",
  "vue3",
  "angular",
  "ember",
  "preact",
  "svelte",
  "qwik",
  "solid"
], ea = /* @__PURE__ */ ((F) => (F.UNDETECTED = "UNDETECTED", F.UNSUPPORTED = "UNSUPPORTED", F.REACT = "REACT", F.REACT_SCRIPTS = "REACT_SCR\
IPTS", F.REACT_NATIVE = "REACT_NATIVE", F.REACT_NATIVE_WEB = "REACT_NATIVE_WEB", F.REACT_PROJECT = "REACT_PROJECT", F.WEBPACK_REACT = "WEBPA\
CK_REACT", F.NEXTJS = "NEXTJS", F.VUE3 = "VUE3", F.NUXT = "NUXT", F.ANGULAR = "ANGULAR", F.EMBER = "EMBER", F.WEB_COMPONENTS = "WEB_COMPONEN\
TS", F.HTML = "HTML", F.QWIK = "QWIK", F.PREACT = "PREACT", F.SVELTE = "SVELTE", F.SVELTEKIT = "SVELTEKIT", F.SERVER = "SERVER", F.NX = "NX",
F.SOLID = "SOLID", F))(ea || {}), Jc = /* @__PURE__ */ ((r) => (r.Webpack5 = "webpack5", r.Vite = "vite", r))(Jc || {}), dv = /* @__PURE__ */ ((r) => (r.
Babel = "babel", r.SWC = "swc", r))(dv || {}), fv = /* @__PURE__ */ ((t) => (t.Rsbuild = "rsbuild", t))(fv || {}), Fk = {
  "@storybook/addon-webpack5-compiler-babel": "babel",
  "@storybook/addon-webpack5-compiler-swc": "swc"
}, Sk = {
  "@storybook/builder-webpack5": "webpack5",
  "@storybook/builder-vite": "vite"
}, Xc = /* @__PURE__ */ ((i) => (i.JAVASCRIPT = "javascript", i.TYPESCRIPT_3_8 = "typescript-3-8", i.TYPESCRIPT_4_9 = "typescript-4-9", i))(
Xc || {}), Qc = [
  {
    preset: "NUXT",
    dependencies: ["nuxt"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "VUE3",
    dependencies: {
      // This Vue template works with Vue 3
      vue: /* @__PURE__ */ s((e) => e === "next" || Ck(e, 3), "vue")
    },
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.some(Boolean) ?? !1, "matcherFunction")
  },
  {
    preset: "EMBER",
    dependencies: ["ember-cli"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "NEXTJS",
    dependencies: ["next"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "QWIK",
    dependencies: ["@builder.io/qwik"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "REACT_PROJECT",
    peerDependencies: ["react"],
    matcherFunction: /* @__PURE__ */ s(({ peerDependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "REACT_NATIVE",
    dependencies: ["react-native", "react-native-scripts"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.some(Boolean) ?? !1, "matcherFunction")
  },
  {
    preset: "REACT_SCRIPTS",
    // For projects using a custom/forked `react-scripts` package.
    files: ["/node_modules/.bin/react-scripts"],
    // For standard CRA projects
    dependencies: ["react-scripts"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e, files: t }) => (e?.every(Boolean) || t?.every(Boolean)) ?? !1, "matcherFunction")
  },
  {
    preset: "ANGULAR",
    dependencies: ["@angular/core"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "WEB_COMPONENTS",
    dependencies: ["lit-element", "lit-html", "lit"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.some(Boolean) ?? !1, "matcherFunction")
  },
  {
    preset: "PREACT",
    dependencies: ["preact"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    // TODO: This only works because it is before the SVELTE template. could be more explicit
    preset: "SVELTEKIT",
    dependencies: ["@sveltejs/kit"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "SVELTE",
    dependencies: ["svelte"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "SOLID",
    dependencies: ["solid-js"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  // DO NOT MOVE ANY TEMPLATES BELOW THIS LINE
  // React is part of every Template, after Storybook is initialized once
  {
    preset: "WEBPACK_REACT",
    dependencies: ["react", "webpack"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  },
  {
    preset: "REACT",
    dependencies: ["react"],
    matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.every(Boolean) ?? !0, "matcherFunction")
  }
], ed = {
  preset: "UNSUPPORTED",
  dependencies: {},
  matcherFunction: /* @__PURE__ */ s(({ dependencies: e }) => e?.some(Boolean) ?? !1, "matcherFunction")
}, Tk = [
  "UNDETECTED",
  "UNSUPPORTED",
  "NX"
], Ak = Object.values(ea).filter((e) => !Tk.includes(e)).map((e) => e.toLowerCase());

// src/cli/dirs.ts
var Rk = /* @__PURE__ */ s(async (e, t) => {
  let r = await (0, ta.temporaryDirectory)(), n = ta.versions[t] || await e.latestVersion(t), o = rd.default.default || rd.default, a = td.default.
  default || td.default, u = o(t, n, {
    registry: await e.getRegistryURL()
  });
  return await a({ url: u, dir: r }), (0, Vn.join)(r, "package");
}, "resolveUsingBranchInstall");
async function id(e, t) {
  let r = Yc.find((a) => a.name === t), i = r?.packageName || r?.renderer || `@storybook/${t}`, n = (0, Vn.join)(i, "package.json"), o = [];
  try {
    return (0, Vn.dirname)(
      require.resolve(n, {
        paths: [process.cwd()]
      })
    );
  } catch (a) {
    en(a instanceof Error), o.push(a);
  }
  try {
    return await Rk(e, i);
  } catch (a) {
    en(a instanceof Error), o.push(a);
  }
  throw new Error(`Cannot find ${n}, ${o.map((a) => a.stack).join(`

`)}`);
}
s(id, "getRendererDir");

// src/cli/helpers.ts
var kk = console;
function Ok(e, t) {
  let r = (0, it.resolve)(e);
  if (!(0, je.existsSync)(r))
    return !1;
  let i = (0, je.readFileSync)(r, "utf8"), n = t ? Uu(i) : i;
  try {
    return JSON.parse(n);
  } catch (o) {
    throw kk.error(Dv.default.red(`Invalid json in file: ${r}`)), o;
  }
}
s(Ok, "readFileAsJson");
var Bk = /* @__PURE__ */ s((e, t) => {
  let r = (0, it.resolve)(e);
  return (0, je.existsSync)(r) ? ((0, je.writeFileSync)(r, `${JSON.stringify(t, null, 2)}
`), !0) : !1;
}, "writeFileAsJson");
async function Pk(e, t) {
  let r = [], i = "^8.0.0-0", n = t.dependencies["babel-core"] || t.devDependencies["babel-core"];
  if (n) {
    let o = await e.latestVersion(
      "babel-core",
      n
    );
    (0, Tr.satisfies)(o, "^6.0.0") && (i = "^7.0.0");
  } else if (!t.dependencies["@babel/core"] && !t.devDependencies["@babel/core"]) {
    let o = await e.getVersion("@babel/core");
    r.push(`@babel/core@${o}`);
  }
  if (!t.dependencies["babel-loader"] && !t.devDependencies["babel-loader"]) {
    let o = await e.getVersion(
      "babel-loader",
      i
    );
    r.push(`babel-loader@${o}`);
  }
  return r;
}
s(Pk, "getBabelDependencies");
function Ik(e, t, r) {
  !e.dependencies?.[t] && !e.devDependencies?.[t] && (e.devDependencies ? e.devDependencies[t] = r : e.devDependencies = {
    [t]: r
  });
}
s(Ik, "addToDevDependenciesIfNotPresent");
function Mk(e, t = ".") {
  let r = (0, it.resolve)(e, "template-csf/");
  if (!(0, je.existsSync)(r))
    throw new Error("Couldn't find template dir");
  (0, je.cpSync)(r, t, { recursive: !0 });
}
s(Mk, "copyTemplate");
var mv = hv.frameworkToRenderer, jk = {
  angular: "webpack5",
  ember: "webpack5",
  "html-vite": "vite",
  "html-webpack5": "webpack5",
  nextjs: "webpack5",
  nuxt: "vite",
  "experimental-nextjs-vite": "vite",
  "preact-vite": "vite",
  "preact-webpack5": "webpack5",
  qwik: "vite",
  "react-native-web-vite": "vite",
  "react-vite": "vite",
  "react-webpack5": "webpack5",
  "server-webpack5": "webpack5",
  solid: "vite",
  "svelte-vite": "vite",
  "svelte-webpack5": "webpack5",
  sveltekit: "vite",
  "vue3-vite": "vite",
  "vue3-webpack5": "webpack5",
  "web-components-vite": "vite",
  "web-components-webpack5": "webpack5",
  // Only to pass type checking, will never be used
  "react-rsbuild": "rsbuild",
  "vue3-rsbuild": "rsbuild"
};
async function gv(e, t) {
  try {
    let r = await e.getInstalledVersion(t);
    return r || (r = (await e.getAllDependencies())[t] ?? ""), (0, Tr.coerce)(r, { includePrerelease: !0 })?.toString();
  } catch {
  }
}
s(gv, "getVersionSafe");
var yv = /* @__PURE__ */ s(async () => (0, je.existsSync)("./src") ? "./src/stories" : "./stories", "cliStoriesTargetPath");
async function qk({
  packageManager: e,
  renderer: t,
  language: r,
  destination: i,
  commonAssetsDir: n,
  features: o
}) {
  let a = {
    // keeping this for backwards compatibility in case community packages are using it
    typescript: "ts",
    javascript: "js",
    "typescript-3-8": "ts-3-8",
    "typescript-4-9": "ts-4-9"
  };
  if (t === "svelte") {
    let d = await gv(e, "svelte");
    d && (0, Tr.major)(d) >= 5 && (a = {
      // keeping this for backwards compatibility in case community packages are using it
      typescript: "ts",
      javascript: "svelte-5-js",
      "typescript-3-8": "svelte-5-ts-3-8",
      "typescript-4-9": "svelte-5-ts-4-9"
    });
  }
  let u = /* @__PURE__ */ s(async () => {
    let d = await id(e, t), p = (0, it.join)(d, "template", "cli"), h = (0, it.join)(p, a[r]), f = (0, it.join)(p, a.javascript), g = (0, it.join)(
    p, a.typescript), E = (0, it.join)(p, a["typescript-3-8"]);
    if ((0, je.existsSync)(h))
      return h;
    if (r === "typescript-4-9" && (0, je.existsSync)(E))
      return E;
    if ((0, je.existsSync)(g))
      return g;
    if ((0, je.existsSync)(f))
      return f;
    if ((0, je.existsSync)(p))
      return p;
    throw new Error(`Unsupported renderer: ${t} (${d})`);
  }, "templatePath"), l = i ?? await yv(), c = /* @__PURE__ */ s((d) => o.includes("docs") || !d.endsWith(".mdx"), "filter");
  if (n && await (0, Sr.cp)(n, l, { recursive: !0, filter: c }), await (0, Sr.cp)(await u(), l, { recursive: !0, filter: c }), n && o.includes(
  "docs")) {
    let d = mv[t] || "react";
    d === "vue3" && (d = "vue"), await bv((0, it.join)(l, "Configure.mdx"), { renderer: d });
  }
}
s(qk, "copyTemplateFiles");
async function bv(e, t) {
  let r = await (0, Sr.readFile)(e, { encoding: "utf8" });
  Object.keys(t).forEach((i) => {
    r = r.replaceAll(`{{${i}}}`, `${t[i]}`);
  }), await (0, Sr.writeFile)(e, r);
}
s(bv, "adjustTemplate");
function Lk(e) {
  let t = {
    ...e.dependencies,
    ...e.devDependencies,
    ...e.optionalDependencies
  }, r = Object.keys(t).find((i) => pv.versions[i]);
  if (!r)
    throw new Error("Couldn't find any official storybook packages in package.json");
  return t[r];
}
s(Lk, "getStorybookVersionSpecifier");
async function nd() {
  return Yr("nx.json");
}
s(nd, "isNxProject");
function Nk(e) {
  let t = (0, Tr.coerce)(e);
  return en(t != null, `Could not coerce ${e} into a semver.`), t;
}
s(Nk, "coerceSemver");
async function Uk(e) {
  let t = await e.getAllDependencies();
  return Object.keys(t).some((r) => r.includes("storybook"));
}
s(Uk, "hasStorybookDependencies");

// src/cli/detect.ts
var Wk = ["vite.config.ts", "vite.config.js", "vite.config.mjs"], $k = ["webpack.config.js"], Hk = /* @__PURE__ */ s((e, t, r) => {
  let i = e.dependencies?.[t] || e.devDependencies?.[t];
  return i && typeof r == "function" ? r(i) : !!i;
}, "hasDependency"), Vk = /* @__PURE__ */ s((e, t, r) => {
  let i = e.peerDependencies?.[t];
  return i && typeof r == "function" ? r(i) : !!i;
}, "hasPeerDependency"), Zk = /* @__PURE__ */ s((e, t) => {
  let r = {
    dependencies: [!1],
    peerDependencies: [!1],
    files: [!1]
  }, { preset: i, files: n, dependencies: o, peerDependencies: a, matcherFunction: u } = t, l = [];
  Array.isArray(o) ? l = o.map((d) => [d, void 0]) : typeof o == "object" && (l = Object.entries(o)), l.length > 0 && (r.dependencies = l.map(
    ([d, p]) => Hk(e, d, p)
  ));
  let c = [];
  return Array.isArray(a) ? c = a.map((d) => [d, void 0]) : typeof a == "object" && (c = Object.entries(a)), c.length > 0 && (r.peerDependencies =
  c.map(
    ([d, p]) => Vk(e, d, p)
  )), Array.isArray(n) && n.length > 0 && (r.files = n.map((d) => (0, Zn.existsSync)(d))), u(r) ? i : null;
}, "getFrameworkPreset");
function Ev(e = {}) {
  let t = [...Qc, ed].find((r) => Zk(e, r) !== null);
  return t ? t.preset : "UNDETECTED";
}
s(Ev, "detectFrameworkPreset");
async function zk(e, t) {
  let r = Yr(Wk), i = Yr($k), n = await e.getAllDependencies();
  if (r || n.vite && n.webpack === void 0)
    return (0, zn.commandLog)("Detected Vite project. Setting builder to Vite")(), "vite";
  if (i || (n.webpack || n["@nuxt/webpack-builder"]) && n.vite !== void 0)
    return (0, zn.commandLog)("Detected webpack project. Setting builder to webpack")(), "webpack5";
  switch (t) {
    case "REACT_NATIVE_WEB":
      return "vite";
    case "REACT_SCRIPTS":
    case "ANGULAR":
    case "REACT_NATIVE":
    // technically react native doesn't use webpack, we just want to set something
    case "NEXTJS":
    case "EMBER":
      return "webpack5";
    case "NUXT":
      return "vite";
    default:
      let { builder: o } = await (0, wv.default)(
        {
          type: "select",
          name: "builder",
          message: `
We were not able to detect the right builder for your project. Please select one:`,
          choices: [
            { title: "Vite", value: "vite" },
            { title: "Webpack 5", value: "webpack5" }
          ]
        },
        {
          onCancel: /* @__PURE__ */ s(() => {
            throw new zn.HandledError("Canceled by the user");
          }, "onCancel")
        }
      );
      return o;
  }
}
s(zk, "detectBuilder");
function Gk(e = (0, vv.resolve)(process.cwd(), ".storybook")) {
  return (0, Zn.existsSync)(e);
}
s(Gk, "isStorybookInstantiated");
async function Kk() {
  return !!Yr([".pnp.js", ".pnp.cjs"]);
}
s(Kk, "detectPnp");
async function Yk(e) {
  let t = "javascript";
  if ((0, Zn.existsSync)("jsconfig.json"))
    return t;
  let r = await e.getAllDependencies().then((l) => !!l.typescript), i = await e.getPackageVersion("typescript"), n = await e.getPackageVersion(
  "prettier"), o = await e.getPackageVersion(
    "@babel/plugin-transform-typescript"
  ), a = await e.getPackageVersion(
    "@typescript-eslint/parser"
  ), u = await e.getPackageVersion("eslint-plugin-storybook");
  return r && i ? nr.default.gte(i, "4.9.0") && (!n || nr.default.gte(n, "2.8.0")) && (!o || nr.default.gte(o, "7.20.0")) && (!a || nr.default.
  gte(a, "5.44.0")) && (!u || nr.default.gte(u, "0.6.8")) ? t = "typescript-4-9" : nr.default.gte(i, "3.8.0") ? t = "typescript-3-8" : nr.default.
  lt(i, "3.8.0") && _v.logger.warn("Detected TypeScript < 3.8, populating with JavaScript examples") : (0, Zn.existsSync)("tsconfig.json") &&
  (t = "typescript-4-9"), t;
}
s(Yk, "detectLanguage");
async function Jk(e, t = {}) {
  let r = await e.retrievePackageJson();
  return r ? await nd() ? "NX" : t.html ? "HTML" : Ev(r) : "UNDETECTED";
}
s(Jk, "detect");

// src/cli/angular/helpers.ts
var ki = require("node:fs"), __ = require("node:path"), w_ = require("@storybook/core/node-logger"), E_ = require("@storybook/core/server-errors");

// ../node_modules/boxen/index.js
var Yn = X(require("node:process"), 1);

// ../node_modules/ansi-regex/index.js
function sd({ onlyFirst: e = !1 } = {}) {
  let t = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
  ].join("|");
  return new RegExp(t, e ? void 0 : "g");
}
s(sd, "ansiRegex");

// ../node_modules/strip-ansi/index.js
var Xk = sd();
function Wt(e) {
  if (typeof e != "string")
    throw new TypeError(`Expected a \`string\`, got \`${typeof e}\``);
  return e.replace(Xk, "");
}
s(Wt, "stripAnsi");

// ../node_modules/boxen/node_modules/string-width/index.js
var Fv = X(ra(), 1), Sv = X(ia(), 1);
function yt(e, t = {}) {
  if (typeof e != "string" || e.length === 0 || (t = {
    ambiguousIsNarrow: !0,
    ...t
  }, e = Wt(e), e.length === 0))
    return 0;
  e = e.replace((0, Sv.default)(), "  ");
  let r = t.ambiguousIsNarrow ? 1 : 2, i = 0;
  for (let n of e) {
    let o = n.codePointAt(0);
    if (o <= 31 || o >= 127 && o <= 159 || o >= 768 && o <= 879)
      continue;
    switch (Fv.default.eastAsianWidth(n)) {
      case "F":
      case "W":
        i += 2;
        break;
      case "A":
        i += r;
        break;
      default:
        i += 1;
    }
  }
  return i;
}
s(yt, "stringWidth");

// ../node_modules/boxen/node_modules/chalk/source/vendor/ansi-styles/index.js
var Tv = /* @__PURE__ */ s((e = 0) => (t) => `\x1B[${t + e}m`, "wrapAnsi16"), Av = /* @__PURE__ */ s((e = 0) => (t) => `\x1B[${38 + e};5;${t}\
m`, "wrapAnsi256"), Rv = /* @__PURE__ */ s((e = 0) => (t, r, i) => `\x1B[${38 + e};2;${t};${r};${i}m`, "wrapAnsi16m"), De = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
}, nL = Object.keys(De.modifier), Qk = Object.keys(De.color), eO = Object.keys(De.bgColor), sL = [...Qk, ...eO];
function tO() {
  let e = /* @__PURE__ */ new Map();
  for (let [t, r] of Object.entries(De)) {
    for (let [i, n] of Object.entries(r))
      De[i] = {
        open: `\x1B[${n[0]}m`,
        close: `\x1B[${n[1]}m`
      }, r[i] = De[i], e.set(n[0], n[1]);
    Object.defineProperty(De, t, {
      value: r,
      enumerable: !1
    });
  }
  return Object.defineProperty(De, "codes", {
    value: e,
    enumerable: !1
  }), De.color.close = "\x1B[39m", De.bgColor.close = "\x1B[49m", De.color.ansi = Tv(), De.color.ansi256 = Av(), De.color.ansi16m = Rv(), De.
  bgColor.ansi = Tv(10), De.bgColor.ansi256 = Av(10), De.bgColor.ansi16m = Rv(10), Object.defineProperties(De, {
    rgbToAnsi256: {
      value(t, r, i) {
        return t === r && r === i ? t < 8 ? 16 : t > 248 ? 231 : Math.round((t - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(t / 255 * 5) + 6 *
        Math.round(r / 255 * 5) + Math.round(i / 255 * 5);
      },
      enumerable: !1
    },
    hexToRgb: {
      value(t) {
        let r = /[a-f\d]{6}|[a-f\d]{3}/i.exec(t.toString(16));
        if (!r)
          return [0, 0, 0];
        let [i] = r;
        i.length === 3 && (i = [...i].map((o) => o + o).join(""));
        let n = Number.parseInt(i, 16);
        return [
          /* eslint-disable no-bitwise */
          n >> 16 & 255,
          n >> 8 & 255,
          n & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: !1
    },
    hexToAnsi256: {
      value: /* @__PURE__ */ s((t) => De.rgbToAnsi256(...De.hexToRgb(t)), "value"),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value(t) {
        if (t < 8)
          return 30 + t;
        if (t < 16)
          return 90 + (t - 8);
        let r, i, n;
        if (t >= 232)
          r = ((t - 232) * 10 + 8) / 255, i = r, n = r;
        else {
          t -= 16;
          let u = t % 36;
          r = Math.floor(t / 36) / 5, i = Math.floor(u / 6) / 5, n = u % 6 / 5;
        }
        let o = Math.max(r, i, n) * 2;
        if (o === 0)
          return 30;
        let a = 30 + (Math.round(n) << 2 | Math.round(i) << 1 | Math.round(r));
        return o === 2 && (a += 60), a;
      },
      enumerable: !1
    },
    rgbToAnsi: {
      value: /* @__PURE__ */ s((t, r, i) => De.ansi256ToAnsi(De.rgbToAnsi256(t, r, i)), "value"),
      enumerable: !1
    },
    hexToAnsi: {
      value: /* @__PURE__ */ s((t) => De.ansi256ToAnsi(De.hexToAnsi256(t)), "value"),
      enumerable: !1
    }
  }), De;
}
s(tO, "assembleStyles");
var rO = tO(), nt = rO;

// ../node_modules/boxen/node_modules/chalk/source/vendor/supports-color/index.js
var sa = X(require("node:process"), 1), Ov = X(require("node:os"), 1), ad = X(require("node:tty"), 1);
function Ye(e, t = globalThis.Deno ? globalThis.Deno.args : sa.default.argv) {
  let r = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", i = t.indexOf(r + e), n = t.indexOf("--");
  return i !== -1 && (n === -1 || i < n);
}
s(Ye, "hasFlag");
var { env: we } = sa.default, na;
Ye("no-color") || Ye("no-colors") || Ye("color=false") || Ye("color=never") ? na = 0 : (Ye("color") || Ye("colors") || Ye("color=true") || Ye(
"color=always")) && (na = 1);
function iO() {
  if ("FORCE_COLOR" in we)
    return we.FORCE_COLOR === "true" ? 1 : we.FORCE_COLOR === "false" ? 0 : we.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(we.FORCE_COLOR,
    10), 3);
}
s(iO, "envForceColor");
function nO(e) {
  return e === 0 ? !1 : {
    level: e,
    hasBasic: !0,
    has256: e >= 2,
    has16m: e >= 3
  };
}
s(nO, "translateLevel");
function sO(e, { streamIsTTY: t, sniffFlags: r = !0 } = {}) {
  let i = iO();
  i !== void 0 && (na = i);
  let n = r ? na : i;
  if (n === 0)
    return 0;
  if (r) {
    if (Ye("color=16m") || Ye("color=full") || Ye("color=truecolor"))
      return 3;
    if (Ye("color=256"))
      return 2;
  }
  if ("TF_BUILD" in we && "AGENT_NAME" in we)
    return 1;
  if (e && !t && n === void 0)
    return 0;
  let o = n || 0;
  if (we.TERM === "dumb")
    return o;
  if (sa.default.platform === "win32") {
    let a = Ov.default.release().split(".");
    return Number(a[0]) >= 10 && Number(a[2]) >= 10586 ? Number(a[2]) >= 14931 ? 3 : 2 : 1;
  }
  if ("CI" in we)
    return ["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((a) => a in we) ? 3 : ["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRON\
E"].some((a) => a in we) || we.CI_NAME === "codeship" ? 1 : o;
  if ("TEAMCITY_VERSION" in we)
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(we.TEAMCITY_VERSION) ? 1 : 0;
  if (we.COLORTERM === "truecolor" || we.TERM === "xterm-kitty")
    return 3;
  if ("TERM_PROGRAM" in we) {
    let a = Number.parseInt((we.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (we.TERM_PROGRAM) {
      case "iTerm.app":
        return a >= 3 ? 3 : 2;
      case "Apple_Terminal":
        return 2;
    }
  }
  return /-256(color)?$/i.test(we.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(we.TERM) || "COLORTERM" in we ?
  1 : o;
}
s(sO, "_supportsColor");
function kv(e, t = {}) {
  let r = sO(e, {
    streamIsTTY: e && e.isTTY,
    ...t
  });
  return nO(r);
}
s(kv, "createSupportsColor");
var oO = {
  stdout: kv({ isTTY: ad.default.isatty(1) }),
  stderr: kv({ isTTY: ad.default.isatty(2) })
}, Bv = oO;

// ../node_modules/boxen/node_modules/chalk/source/utilities.js
function Pv(e, t, r) {
  let i = e.indexOf(t);
  if (i === -1)
    return e;
  let n = t.length, o = 0, a = "";
  do
    a += e.slice(o, i) + t + r, o = i + n, i = e.indexOf(t, o);
  while (i !== -1);
  return a += e.slice(o), a;
}
s(Pv, "stringReplaceAll");
function Iv(e, t, r, i) {
  let n = 0, o = "";
  do {
    let a = e[i - 1] === "\r";
    o += e.slice(n, a ? i - 1 : i) + t + (a ? `\r
` : `
`) + r, n = i + 1, i = e.indexOf(`
`, n);
  } while (i !== -1);
  return o += e.slice(n), o;
}
s(Iv, "stringEncaseCRLFWithFirstIndex");

// ../node_modules/boxen/node_modules/chalk/source/index.js
var { stdout: Mv, stderr: jv } = Bv, ud = Symbol("GENERATOR"), Ai = Symbol("STYLER"), Gn = Symbol("IS_EMPTY"), qv = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
], Ri = /* @__PURE__ */ Object.create(null), aO = /* @__PURE__ */ s((e, t = {}) => {
  if (t.level && !(Number.isInteger(t.level) && t.level >= 0 && t.level <= 3))
    throw new Error("The `level` option should be an integer from 0 to 3");
  let r = Mv ? Mv.level : 0;
  e.level = t.level === void 0 ? r : t.level;
}, "applyOptions");
var uO = /* @__PURE__ */ s((e) => {
  let t = /* @__PURE__ */ s((...r) => r.join(" "), "chalk");
  return aO(t, e), Object.setPrototypeOf(t, Kn.prototype), t;
}, "chalkFactory");
function Kn(e) {
  return uO(e);
}
s(Kn, "createChalk");
Object.setPrototypeOf(Kn.prototype, Function.prototype);
for (let [e, t] of Object.entries(nt))
  Ri[e] = {
    get() {
      let r = oa(this, cd(t.open, t.close, this[Ai]), this[Gn]);
      return Object.defineProperty(this, e, { value: r }), r;
    }
  };
Ri.visible = {
  get() {
    let e = oa(this, this[Ai], !0);
    return Object.defineProperty(this, "visible", { value: e }), e;
  }
};
var ld = /* @__PURE__ */ s((e, t, r, ...i) => e === "rgb" ? t === "ansi16m" ? nt[r].ansi16m(...i) : t === "ansi256" ? nt[r].ansi256(nt.rgbToAnsi256(
...i)) : nt[r].ansi(nt.rgbToAnsi(...i)) : e === "hex" ? ld("rgb", t, r, ...nt.hexToRgb(...i)) : nt[r][e](...i), "getModelAnsi"), lO = ["rgb",
"hex", "ansi256"];
for (let e of lO) {
  Ri[e] = {
    get() {
      let { level: r } = this;
      return function(...i) {
        let n = cd(ld(e, qv[r], "color", ...i), nt.color.close, this[Ai]);
        return oa(this, n, this[Gn]);
      };
    }
  };
  let t = "bg" + e[0].toUpperCase() + e.slice(1);
  Ri[t] = {
    get() {
      let { level: r } = this;
      return function(...i) {
        let n = cd(ld(e, qv[r], "bgColor", ...i), nt.bgColor.close, this[Ai]);
        return oa(this, n, this[Gn]);
      };
    }
  };
}
var cO = Object.defineProperties(() => {
}, {
  ...Ri,
  level: {
    enumerable: !0,
    get() {
      return this[ud].level;
    },
    set(e) {
      this[ud].level = e;
    }
  }
}), cd = /* @__PURE__ */ s((e, t, r) => {
  let i, n;
  return r === void 0 ? (i = e, n = t) : (i = r.openAll + e, n = t + r.closeAll), {
    open: e,
    close: t,
    openAll: i,
    closeAll: n,
    parent: r
  };
}, "createStyler"), oa = /* @__PURE__ */ s((e, t, r) => {
  let i = /* @__PURE__ */ s((...n) => dO(i, n.length === 1 ? "" + n[0] : n.join(" ")), "builder");
  return Object.setPrototypeOf(i, cO), i[ud] = e, i[Ai] = t, i[Gn] = r, i;
}, "createBuilder"), dO = /* @__PURE__ */ s((e, t) => {
  if (e.level <= 0 || !t)
    return e[Gn] ? "" : t;
  let r = e[Ai];
  if (r === void 0)
    return t;
  let { openAll: i, closeAll: n } = r;
  if (t.includes("\x1B"))
    for (; r !== void 0; )
      t = Pv(t, r.close, r.open), r = r.parent;
  let o = t.indexOf(`
`);
  return o !== -1 && (t = Iv(t, n, i, o)), i + t + n;
}, "applyStyle");
Object.defineProperties(Kn.prototype, Ri);
var fO = Kn(), DL = Kn({ level: jv ? jv.level : 0 });
var Ar = fO;

// ../node_modules/widest-line/node_modules/string-width/index.js
var Lv = X(ra(), 1), Nv = X(ia(), 1);
function dd(e, t = {}) {
  if (typeof e != "string" || e.length === 0 || (t = {
    ambiguousIsNarrow: !0,
    ...t
  }, e = Wt(e), e.length === 0))
    return 0;
  e = e.replace((0, Nv.default)(), "  ");
  let r = t.ambiguousIsNarrow ? 1 : 2, i = 0;
  for (let n of e) {
    let o = n.codePointAt(0);
    if (o <= 31 || o >= 127 && o <= 159 || o >= 768 && o <= 879)
      continue;
    switch (Lv.default.eastAsianWidth(n)) {
      case "F":
      case "W":
        i += 2;
        break;
      case "A":
        i += r;
        break;
      default:
        i += 1;
    }
  }
  return i;
}
s(dd, "stringWidth");

// ../node_modules/widest-line/index.js
function aa(e) {
  let t = 0;
  for (let r of e.split(`
`))
    t = Math.max(t, dd(r));
  return t;
}
s(aa, "widestLine");

// ../node_modules/boxen/index.js
var y_ = X(hd(), 1);

// ../node_modules/boxen/node_modules/camelcase/index.js
var pO = /[\p{Lu}]/u, DO = /[\p{Ll}]/u, $v = /^[\p{Lu}](?![\p{Lu}])/gu, Zv = /([\p{Alpha}\p{N}_]|$)/u, pd = /[_.\- ]+/, mO = new RegExp("^" +
pd.source), Hv = new RegExp(pd.source + Zv.source, "gu"), Vv = new RegExp("\\d+" + Zv.source, "gu"), gO = /* @__PURE__ */ s((e, t, r, i) => {
  let n = !1, o = !1, a = !1, u = !1;
  for (let l = 0; l < e.length; l++) {
    let c = e[l];
    u = l > 2 ? e[l - 3] === "-" : !0, n && pO.test(c) ? (e = e.slice(0, l) + "-" + e.slice(l), n = !1, a = o, o = !0, l++) : o && a && DO.test(
    c) && (!u || i) ? (e = e.slice(0, l - 1) + "-" + e.slice(l - 1), a = o, o = !1, n = !0) : (n = t(c) === c && r(c) !== c, a = o, o = r(c) ===
    c && t(c) !== c);
  }
  return e;
}, "preserveCamelCase"), yO = /* @__PURE__ */ s((e, t) => ($v.lastIndex = 0, e.replace($v, (r) => t(r))), "preserveConsecutiveUppercase"), bO = /* @__PURE__ */ s(
(e, t) => (Hv.lastIndex = 0, Vv.lastIndex = 0, e.replace(Hv, (r, i) => t(i)).replace(Vv, (r) => t(r))), "postProcess");
function Dd(e, t) {
  if (!(typeof e == "string" || Array.isArray(e)))
    throw new TypeError("Expected the input to be `string | string[]`");
  if (t = {
    pascalCase: !1,
    preserveConsecutiveUppercase: !1,
    ...t
  }, Array.isArray(e) ? e = e.map((o) => o.trim()).filter((o) => o.length).join("-") : e = e.trim(), e.length === 0)
    return "";
  let r = t.locale === !1 ? (o) => o.toLowerCase() : (o) => o.toLocaleLowerCase(t.locale), i = t.locale === !1 ? (o) => o.toUpperCase() : (o) => o.
  toLocaleUpperCase(t.locale);
  return e.length === 1 ? pd.test(e) ? "" : t.pascalCase ? i(e) : r(e) : (e !== r(e) && (e = gO(e, r, i, t.preserveConsecutiveUppercase)), e =
  e.replace(mO, ""), e = t.preserveConsecutiveUppercase ? yO(e, r) : r(e), t.pascalCase && (e = i(e.charAt(0)) + e.slice(1)), bO(e, i));
}
s(Dd, "camelCase");

// ../node_modules/boxen/index.js
var _d = X(n_(), 1);

// ../node_modules/wrap-ansi/node_modules/string-width/index.js
var s_ = X(ra(), 1), o_ = X(ia(), 1);
function kr(e, t = {}) {
  if (typeof e != "string" || e.length === 0 || (t = {
    ambiguousIsNarrow: !0,
    ...t
  }, e = Wt(e), e.length === 0))
    return 0;
  e = e.replace((0, o_.default)(), "  ");
  let r = t.ambiguousIsNarrow ? 1 : 2, i = 0;
  for (let n of e) {
    let o = n.codePointAt(0);
    if (o <= 31 || o >= 127 && o <= 159 || o >= 768 && o <= 879)
      continue;
    switch (s_.default.eastAsianWidth(n)) {
      case "F":
      case "W":
        i += 2;
        break;
      case "A":
        i += r;
        break;
      default:
        i += 1;
    }
  }
  return i;
}
s(kr, "stringWidth");

// ../node_modules/wrap-ansi/node_modules/ansi-styles/index.js
var a_ = /* @__PURE__ */ s((e = 0) => (t) => `\x1B[${t + e}m`, "wrapAnsi16"), u_ = /* @__PURE__ */ s((e = 0) => (t) => `\x1B[${38 + e};5;${t}\
m`, "wrapAnsi256"), l_ = /* @__PURE__ */ s((e = 0) => (t, r, i) => `\x1B[${38 + e};2;${t};${r};${i}m`, "wrapAnsi16m"), me = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
}, NL = Object.keys(me.modifier), SO = Object.keys(me.color), TO = Object.keys(me.bgColor), UL = [...SO, ...TO];
function AO() {
  let e = /* @__PURE__ */ new Map();
  for (let [t, r] of Object.entries(me)) {
    for (let [i, n] of Object.entries(r))
      me[i] = {
        open: `\x1B[${n[0]}m`,
        close: `\x1B[${n[1]}m`
      }, r[i] = me[i], e.set(n[0], n[1]);
    Object.defineProperty(me, t, {
      value: r,
      enumerable: !1
    });
  }
  return Object.defineProperty(me, "codes", {
    value: e,
    enumerable: !1
  }), me.color.close = "\x1B[39m", me.bgColor.close = "\x1B[49m", me.color.ansi = a_(), me.color.ansi256 = u_(), me.color.ansi16m = l_(), me.
  bgColor.ansi = a_(10), me.bgColor.ansi256 = u_(10), me.bgColor.ansi16m = l_(10), Object.defineProperties(me, {
    rgbToAnsi256: {
      value: /* @__PURE__ */ s((t, r, i) => t === r && r === i ? t < 8 ? 16 : t > 248 ? 231 : Math.round((t - 8) / 247 * 24) + 232 : 16 + 36 *
      Math.round(t / 255 * 5) + 6 * Math.round(r / 255 * 5) + Math.round(i / 255 * 5), "value"),
      enumerable: !1
    },
    hexToRgb: {
      value: /* @__PURE__ */ s((t) => {
        let r = /[a-f\d]{6}|[a-f\d]{3}/i.exec(t.toString(16));
        if (!r)
          return [0, 0, 0];
        let [i] = r;
        i.length === 3 && (i = [...i].map((o) => o + o).join(""));
        let n = Number.parseInt(i, 16);
        return [
          /* eslint-disable no-bitwise */
          n >> 16 & 255,
          n >> 8 & 255,
          n & 255
          /* eslint-enable no-bitwise */
        ];
      }, "value"),
      enumerable: !1
    },
    hexToAnsi256: {
      value: /* @__PURE__ */ s((t) => me.rgbToAnsi256(...me.hexToRgb(t)), "value"),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value: /* @__PURE__ */ s((t) => {
        if (t < 8)
          return 30 + t;
        if (t < 16)
          return 90 + (t - 8);
        let r, i, n;
        if (t >= 232)
          r = ((t - 232) * 10 + 8) / 255, i = r, n = r;
        else {
          t -= 16;
          let u = t % 36;
          r = Math.floor(t / 36) / 5, i = Math.floor(u / 6) / 5, n = u % 6 / 5;
        }
        let o = Math.max(r, i, n) * 2;
        if (o === 0)
          return 30;
        let a = 30 + (Math.round(n) << 2 | Math.round(i) << 1 | Math.round(r));
        return o === 2 && (a += 60), a;
      }, "value"),
      enumerable: !1
    },
    rgbToAnsi: {
      value: /* @__PURE__ */ s((t, r, i) => me.ansi256ToAnsi(me.rgbToAnsi256(t, r, i)), "value"),
      enumerable: !1
    },
    hexToAnsi: {
      value: /* @__PURE__ */ s((t) => me.ansi256ToAnsi(me.hexToAnsi256(t)), "value"),
      enumerable: !1
    }
  }), me;
}
s(AO, "assembleStyles");
var RO = AO(), c_ = RO;

// ../node_modules/wrap-ansi/index.js
var ua = /* @__PURE__ */ new Set([
  "\x1B",
  "\x9B"
]), kO = 39, bd = "\x07", h_ = "[", OO = "]", p_ = "m", vd = `${OO}8;;`, d_ = /* @__PURE__ */ s((e) => `${ua.values().next().value}${h_}${e}${p_}`,
"wrapAnsiCode"), f_ = /* @__PURE__ */ s((e) => `${ua.values().next().value}${vd}${e}${bd}`, "wrapAnsiHyperlink"), BO = /* @__PURE__ */ s((e) => e.
split(" ").map((t) => kr(t)), "wordLengths"), yd = /* @__PURE__ */ s((e, t, r) => {
  let i = [...t], n = !1, o = !1, a = kr(Wt(e[e.length - 1]));
  for (let [u, l] of i.entries()) {
    let c = kr(l);
    if (a + c <= r ? e[e.length - 1] += l : (e.push(l), a = 0), ua.has(l) && (n = !0, o = i.slice(u + 1).join("").startsWith(vd)), n) {
      o ? l === bd && (n = !1, o = !1) : l === p_ && (n = !1);
      continue;
    }
    a += c, a === r && u < i.length - 1 && (e.push(""), a = 0);
  }
  !a && e[e.length - 1].length > 0 && e.length > 1 && (e[e.length - 2] += e.pop());
}, "wrapWord"), PO = /* @__PURE__ */ s((e) => {
  let t = e.split(" "), r = t.length;
  for (; r > 0 && !(kr(t[r - 1]) > 0); )
    r--;
  return r === t.length ? e : t.slice(0, r).join(" ") + t.slice(r).join("");
}, "stringVisibleTrimSpacesRight"), IO = /* @__PURE__ */ s((e, t, r = {}) => {
  if (r.trim !== !1 && e.trim() === "")
    return "";
  let i = "", n, o, a = BO(e), u = [""];
  for (let [c, d] of e.split(" ").entries()) {
    r.trim !== !1 && (u[u.length - 1] = u[u.length - 1].trimStart());
    let p = kr(u[u.length - 1]);
    if (c !== 0 && (p >= t && (r.wordWrap === !1 || r.trim === !1) && (u.push(""), p = 0), (p > 0 || r.trim === !1) && (u[u.length - 1] += "\
 ", p++)), r.hard && a[c] > t) {
      let h = t - p, f = 1 + Math.floor((a[c] - h - 1) / t);
      Math.floor((a[c] - 1) / t) < f && u.push(""), yd(u, d, t);
      continue;
    }
    if (p + a[c] > t && p > 0 && a[c] > 0) {
      if (r.wordWrap === !1 && p < t) {
        yd(u, d, t);
        continue;
      }
      u.push("");
    }
    if (p + a[c] > t && r.wordWrap === !1) {
      yd(u, d, t);
      continue;
    }
    u[u.length - 1] += d;
  }
  r.trim !== !1 && (u = u.map((c) => PO(c)));
  let l = [...u.join(`
`)];
  for (let [c, d] of l.entries()) {
    if (i += d, ua.has(d)) {
      let { groups: h } = new RegExp(`(?:\\${h_}(?<code>\\d+)m|\\${vd}(?<uri>.*)${bd})`).exec(l.slice(c).join("")) || { groups: {} };
      if (h.code !== void 0) {
        let f = Number.parseFloat(h.code);
        n = f === kO ? void 0 : f;
      } else h.uri !== void 0 && (o = h.uri.length === 0 ? void 0 : h.uri);
    }
    let p = c_.codes.get(Number(n));
    l[c + 1] === `
` ? (o && (i += f_("")), n && p && (i += d_(p))) : d === `
` && (n && p && (i += d_(n)), o && (i += f_(o)));
  }
  return i;
}, "exec");
function la(e, t, r) {
  return String(e).normalize().replace(/\r\n/g, `
`).split(`
`).map((i) => IO(i, t, r)).join(`
`);
}
s(la, "wrapAnsi");

// ../node_modules/boxen/index.js
var HO = X(hd(), 1);
var or = `
`, Le = " ", Jn = "none", b_ = /* @__PURE__ */ s(() => {
  let { env: e, stdout: t, stderr: r } = Yn.default;
  return t?.columns ? t.columns : r?.columns ? r.columns : e.COLUMNS ? Number.parseInt(e.COLUMNS, 10) : 80;
}, "terminalColumns"), D_ = /* @__PURE__ */ s((e) => typeof e == "number" ? {
  top: e,
  right: e * 3,
  bottom: e,
  left: e * 3
} : {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  ...e
}, "getObject"), Xn = /* @__PURE__ */ s((e) => e === Jn ? 0 : 2, "getBorderWidth"), MO = /* @__PURE__ */ s((e) => {
  let t = [
    "topLeft",
    "topRight",
    "bottomRight",
    "bottomLeft",
    "left",
    "right",
    "top",
    "bottom"
  ], r;
  if (e === Jn) {
    e = {};
    for (let i of t)
      e[i] = "";
  }
  if (typeof e == "string") {
    if (r = y_.default[e], !r)
      throw new TypeError(`Invalid border style: ${e}`);
  } else {
    typeof e?.vertical == "string" && (e.left = e.vertical, e.right = e.vertical), typeof e?.horizontal == "string" && (e.top = e.horizontal,
    e.bottom = e.horizontal);
    for (let i of t)
      if (e[i] === null || typeof e[i] != "string")
        throw new TypeError(`Invalid border style: ${i}`);
    r = e;
  }
  return r;
}, "getBorderChars"), jO = /* @__PURE__ */ s((e, t, r) => {
  let i = "", n = yt(e);
  switch (r) {
    case "left": {
      i = e + t.slice(n);
      break;
    }
    case "right": {
      i = t.slice(n) + e;
      break;
    }
    default: {
      t = t.slice(n), t.length % 2 === 1 ? (t = t.slice(Math.floor(t.length / 2)), i = t.slice(1) + e + t) : (t = t.slice(t.length / 2), i =
      t + e + t);
      break;
    }
  }
  return i;
}, "makeTitle"), qO = /* @__PURE__ */ s((e, { padding: t, width: r, textAlignment: i, height: n }) => {
  e = (0, _d.default)(e, { align: i });
  let o = e.split(or), a = aa(e), u = r - t.left - t.right;
  if (a > u) {
    let d = [];
    for (let p of o) {
      let h = la(p, u, { hard: !0 }), g = (0, _d.default)(h, { align: i }).split(`
`), E = Math.max(...g.map((_) => yt(_)));
      for (let _ of g) {
        let C;
        switch (i) {
          case "center": {
            C = Le.repeat((u - E) / 2) + _;
            break;
          }
          case "right": {
            C = Le.repeat(u - E) + _;
            break;
          }
          default: {
            C = _;
            break;
          }
        }
        d.push(C);
      }
    }
    o = d;
  }
  i === "center" && a < u ? o = o.map((d) => Le.repeat((u - a) / 2) + d) : i === "right" && a < u && (o = o.map((d) => Le.repeat(u - a) + d));
  let l = Le.repeat(t.left), c = Le.repeat(t.right);
  return o = o.map((d) => l + d + c), o = o.map((d) => {
    if (r - yt(d) > 0)
      switch (i) {
        case "center":
          return d + Le.repeat(r - yt(d));
        case "right":
          return d + Le.repeat(r - yt(d));
        default:
          return d + Le.repeat(r - yt(d));
      }
    return d;
  }), t.top > 0 && (o = [...Array.from({ length: t.top }).fill(Le.repeat(r)), ...o]), t.bottom > 0 && (o = [...o, ...Array.from({ length: t.
  bottom }).fill(Le.repeat(r))]), n && o.length > n ? o = o.slice(0, n) : n && o.length < n && (o = [...o, ...Array.from({ length: n - o.length }).
  fill(Le.repeat(r))]), o.join(or);
}, "makeContentText"), LO = /* @__PURE__ */ s((e, t, r) => {
  let i = /* @__PURE__ */ s((d) => {
    let p = r.borderColor ? WO(r.borderColor)(d) : d;
    return r.dimBorder ? Ar.dim(p) : p;
  }, "colorizeBorder"), n = /* @__PURE__ */ s((d) => r.backgroundColor ? $O(r.backgroundColor)(d) : d, "colorizeContent"), o = MO(r.borderStyle),
  a = b_(), u = Le.repeat(r.margin.left);
  if (r.float === "center") {
    let d = Math.max((a - t - Xn(r.borderStyle)) / 2, 0);
    u = Le.repeat(d);
  } else if (r.float === "right") {
    let d = Math.max(a - t - r.margin.right - Xn(r.borderStyle), 0);
    u = Le.repeat(d);
  }
  let l = "";
  r.margin.top && (l += or.repeat(r.margin.top)), (r.borderStyle !== Jn || r.title) && (l += i(u + o.topLeft + (r.title ? jO(r.title, o.top.
  repeat(t), r.titleAlignment) : o.top.repeat(t)) + o.topRight) + or);
  let c = e.split(or);
  return l += c.map((d) => u + i(o.left) + n(d) + i(o.right)).join(or), r.borderStyle !== Jn && (l += or + i(u + o.bottomLeft + o.bottom.repeat(
  t) + o.bottomRight)), r.margin.bottom && (l += or.repeat(r.margin.bottom)), l;
}, "boxContent"), NO = /* @__PURE__ */ s((e) => {
  if (e.fullscreen && Yn.default?.stdout) {
    let t = [Yn.default.stdout.columns, Yn.default.stdout.rows];
    typeof e.fullscreen == "function" && (t = e.fullscreen(...t)), e.width || (e.width = t[0]), e.height || (e.height = t[1]);
  }
  return e.width && (e.width = Math.max(1, e.width - Xn(e.borderStyle))), e.height && (e.height = Math.max(1, e.height - Xn(e.borderStyle))),
  e;
}, "sanitizeOptions"), m_ = /* @__PURE__ */ s((e, t) => t === Jn ? e : ` ${e} `, "formatTitle"), UO = /* @__PURE__ */ s((e, t) => {
  t = NO(t);
  let r = t.width !== void 0, i = b_(), n = Xn(t.borderStyle), o = i - t.margin.left - t.margin.right - n, a = aa(la(e, i - n, { hard: !0, trim: !1 })) +
  t.padding.left + t.padding.right;
  if (t.title && r ? (t.title = t.title.slice(0, Math.max(0, t.width - 2)), t.title && (t.title = m_(t.title, t.borderStyle))) : t.title && (t.
  title = t.title.slice(0, Math.max(0, o - 2)), t.title && (t.title = m_(t.title, t.borderStyle), yt(t.title) > a && (t.width = yt(t.title)))),
  t.width = t.width ? t.width : a, !r) {
    if (t.margin.left && t.margin.right && t.width > o) {
      let l = (i - t.width - n) / (t.margin.left + t.margin.right);
      t.margin.left = Math.max(0, Math.floor(t.margin.left * l)), t.margin.right = Math.max(0, Math.floor(t.margin.right * l));
    }
    t.width = Math.min(t.width, i - n - t.margin.left - t.margin.right);
  }
  return t.width - (t.padding.left + t.padding.right) <= 0 && (t.padding.left = 0, t.padding.right = 0), t.height && t.height - (t.padding.top +
  t.padding.bottom) <= 0 && (t.padding.top = 0, t.padding.bottom = 0), t;
}, "determineDimensions"), wd = /* @__PURE__ */ s((e) => e.match(/^#(?:[0-f]{3}){1,2}$/i), "isHex"), g_ = /* @__PURE__ */ s((e) => typeof e ==
"string" && (Ar[e] ?? wd(e)), "isColorValid"), WO = /* @__PURE__ */ s((e) => wd(e) ? Ar.hex(e) : Ar[e], "getColorFn"), $O = /* @__PURE__ */ s(
(e) => wd(e) ? Ar.bgHex(e) : Ar[Dd(["bg", e])], "getBGColorFn");
function Ed(e, t) {
  if (t = {
    padding: 0,
    borderStyle: "single",
    dimBorder: !1,
    textAlignment: "left",
    float: "left",
    titleAlignment: "left",
    ...t
  }, t.align && (t.textAlignment = t.align), t.borderColor && !g_(t.borderColor))
    throw new Error(`${t.borderColor} is not a valid borderColor`);
  if (t.backgroundColor && !g_(t.backgroundColor))
    throw new Error(`${t.backgroundColor} is not a valid backgroundColor`);
  return t.padding = D_(t.padding), t.margin = D_(t.margin), t = UO(e, t), e = qO(e, t), LO(e, t.width, t);
}
s(Ed, "boxen");

// src/cli/angular/helpers.ts
var xd = X(Ts(), 1), Fd = X(ca(), 1);
var es = "angular.json", VO = Fd.dedent`
  import { setCompodocJson } from "@storybook/addon-docs/angular";
  import docJson from "../documentation.json";
  setCompodocJson(docJson);
`.trimStart(), ZO = /* @__PURE__ */ s(async () => {
  w_.logger.plain(
    // Create a text which explains the user why compodoc is necessary
    Ed(
      Fd.dedent`
      Compodoc is a great tool to generate documentation for your Angular projects.
      Storybook can use the documentation generated by Compodoc to extract argument definitions
      and JSDOC comments to display them in the Storybook UI. We highly recommend using Compodoc for
      your Angular projects to get the best experience out of Storybook.
    `,
      { title: "Compodoc", borderStyle: "round", padding: 1, borderColor: "#F1618C" }
    )
  );
  let { useCompoDoc: e } = await (0, xd.default)({
    type: "confirm",
    name: "useCompoDoc",
    message: "Do you want to use Compodoc for documentation?"
  });
  return e;
}, "promptForCompoDocs"), Cd = class {
  static {
    s(this, "AngularJSON");
  }
  constructor() {
    if (!(0, ki.existsSync)(es))
      throw new E_.MissingAngularJsonError({ path: (0, __.join)(process.cwd(), es) });
    let t = (0, ki.readFileSync)(es, "utf8");
    this.json = JSON.parse(t);
  }
  get projects() {
    return this.json.projects;
  }
  get projectsWithoutStorybook() {
    return Object.keys(this.projects).filter((t) => {
      let { architect: r } = this.projects[t];
      return !r.storybook;
    });
  }
  get hasStorybookBuilder() {
    return Object.keys(this.projects).some((t) => {
      let { architect: r } = this.projects[t];
      return Object.keys(r).some((i) => r[i].builder === "@storybook/angular:start-storybook");
    });
  }
  get rootProject() {
    let t = Object.keys(this.projects).find((r) => {
      let { root: i } = this.projects[r];
      return i === "" || i === ".";
    });
    return t ? this.projects[t] : null;
  }
  getProjectSettingsByName(t) {
    return this.projects[t];
  }
  async getProjectName() {
    if (this.projectsWithoutStorybook.length > 1) {
      let { projectName: t } = await (0, xd.default)({
        type: "select",
        name: "projectName",
        message: "For which project do you want to generate Storybook configuration?",
        choices: this.projectsWithoutStorybook.map((r) => ({
          title: r,
          value: r
        }))
      });
      return t;
    }
    return this.projectsWithoutStorybook[0];
  }
  addStorybookEntries({
    angularProjectName: t,
    storybookFolder: r,
    useCompodoc: i,
    root: n
  }) {
    let { architect: o } = this.projects[t], a = {
      configDir: r,
      browserTarget: `${t}:build`,
      compodoc: i,
      ...i && { compodocArgs: ["-e", "json", "-d", n || "."] }
    };
    o.storybook || (o.storybook = {
      builder: "@storybook/angular:start-storybook",
      options: {
        ...a,
        port: 6006
      }
    }), o["build-storybook"] || (o["build-storybook"] = {
      builder: "@storybook/angular:build-storybook",
      options: {
        ...a,
        outputDir: Object.keys(this.projects).length === 1 ? "storybook-static" : `dist/storybook/${t}`
      }
    });
  }
  write() {
    (0, ki.writeFileSync)(es, JSON.stringify(this.json, null, 2));
  }
};

// src/cli/eslintPlugin.ts
var Td = require("node:fs"), rs = require("node:fs/promises"), Ad = require("@storybook/core/common"), fa = require("@storybook/core/csf-tools");

// ../node_modules/detect-indent/index.js
var zO = /^(?:( )+|\t+)/, ts = "space", x_ = "tab";
function C_(e, t) {
  let r = /* @__PURE__ */ new Map(), i = 0, n, o;
  for (let a of e.split(/\n/g)) {
    if (!a)
      continue;
    let u, l, c, d, p, h = a.match(zO);
    if (h === null)
      i = 0, n = "";
    else {
      if (u = h[0].length, l = h[1] ? ts : x_, t && l === ts && u === 1)
        continue;
      l !== n && (i = 0), n = l, c = 1, d = 0;
      let f = u - i;
      if (i = u, f === 0)
        c = 0, d = 1;
      else {
        let g = f > 0 ? f : -f;
        o = GO(l, g);
      }
      p = r.get(o), p = p === void 0 ? [1, 0] : [p[0] + c, p[1] + d], r.set(o, p);
    }
  }
  return r;
}
s(C_, "makeIndentsMap");
function GO(e, t) {
  return (e === ts ? "s" : "t") + String(t);
}
s(GO, "encodeIndentsKey");
function KO(e) {
  let r = e[0] === "s" ? ts : x_, i = Number(e.slice(1));
  return { type: r, amount: i };
}
s(KO, "decodeIndentsKey");
function YO(e) {
  let t, r = 0, i = 0;
  for (let [n, [o, a]] of e)
    (o > r || o === r && a > i) && (r = o, i = a, t = n);
  return t;
}
s(YO, "getMostUsedKey");
function JO(e, t) {
  return (e === ts ? " " : "	").repeat(t);
}
s(JO, "makeIndentString");
function Sd(e) {
  if (typeof e != "string")
    throw new TypeError("Expected a string");
  let t = C_(e, !0);
  t.size === 0 && (t = C_(e, !1));
  let r = YO(t), i, n = 0, o = "";
  return r !== void 0 && ({ type: i, amount: n } = KO(r), o = JO(i, n)), {
    amount: n,
    type: i,
    indent: o
  };
}
s(Sd, "detectIndent");

// src/cli/eslintPlugin.ts
var F_ = X(Lu(), 1), S_ = X(Ts(), 1), T_ = X(ca(), 1);
var A_ = ["js", "cjs", "json"], XO = ["yaml", "yml"], R_ = /* @__PURE__ */ s(() => {
  let e = ".eslintrc", t = XO.find(
    (i) => (0, Td.existsSync)(`${e}.${i}`)
  );
  if (t)
    throw new Error(t);
  let r = A_.find(
    (i) => (0, Td.existsSync)(`${e}.${i}`)
  );
  return r ? `${e}.${r}` : null;
}, "findEslintFile");
async function QO(e) {
  let t = await e.getAllDependencies(), r = await e.retrievePackageJson(), i = null;
  try {
    i = R_();
  } catch {
  }
  let n = !!t["eslint-plugin-storybook"];
  return { hasEslint: t.eslint || i || r.eslintConfig, isStorybookPluginInstalled: n, eslintConfigFile: i };
}
s(QO, "extractEslintInfo");
var da = /* @__PURE__ */ s((e) => {
  if (!e)
    return [];
  if (typeof e == "string")
    return [e];
  if (Array.isArray(e))
    return e;
  throw new Error(`Invalid eslint extends ${e}`);
}, "normalizeExtends");
async function eB(e, t) {
  if (e)
    if ((0, Ad.paddedLog)(`Configuring Storybook ESLint plugin at ${e}`), e.endsWith("json")) {
      let r = JSON.parse(await (0, rs.readFile)(e, { encoding: "utf8" })), i = da(r.extends).filter(Boolean);
      r.extends = [...i, "plugin:storybook/recommended"];
      let n = await (0, rs.readFile)(e, { encoding: "utf8" }), o = Sd(n).amount || 2;
      await (0, rs.writeFile)(e, JSON.stringify(r, void 0, o));
    } else {
      let r = await (0, fa.readConfig)(e), i = da(r.getFieldValue(["extends"])).filter(Boolean);
      r.setFieldValue(["extends"], [...i, "plugin:storybook/recommended"]), await (0, fa.writeConfig)(r);
    }
  else {
    (0, Ad.paddedLog)("Configuring eslint-plugin-storybook in your package.json");
    let r = await t.retrievePackageJson(), i = da(r.eslintConfig?.extends).filter(Boolean);
    await t.writePackageJson({
      ...r,
      eslintConfig: {
        ...r.eslintConfig,
        extends: [...i, "plugin:storybook/recommended"]
      }
    });
  }
}
s(eB, "configureEslintPlugin");
var tB = /* @__PURE__ */ s(async () => {
  let { shouldInstall: e } = await (0, S_.default)({
    type: "confirm",
    name: "shouldInstall",
    message: T_.dedent`
        We have detected that you're using ESLint. Storybook provides a plugin that gives the best experience with Storybook and helps follow best practices: ${F_.default.
    yellow(
      "https://github.com/storybookjs/eslint-plugin-storybook#readme"
    )}

        Would you like to install it?
      `,
    initial: !0
  });
  return e;
}, "suggestESLintPlugin");

// src/cli/globalSettings.ts
var Ea = X(require("node:fs/promises"), 1), iw = require("node:os"), Ca = require("node:path"), Li = X(ew(), 1);

// src/server-errors.ts
var rw = X(ca(), 1);

// src/storybook-error.ts
function tw({
  code: e,
  category: t
}) {
  let r = String(e).padStart(4, "0");
  return `SB_${t}_${r}`;
}
s(tw, "parseErrorCode");
var _a = class e extends Error {
  constructor(r) {
    super(e.getFullMessage(r));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    this.category = r.category, this.documentation = r.documentation ?? !1, this.code = r.code;
  }
  static {
    s(this, "StorybookError");
  }
  get fullErrorCode() {
    return tw({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let r = this.constructor.name;
    return `${this.fullErrorCode} (${r})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: r,
    code: i,
    category: n,
    message: o
  }) {
    let a;
    return r === !0 ? a = `https://storybook.js.org/error/${tw({ code: i, category: n })}` : typeof r == "string" ? a = r : Array.isArray(r) &&
    (a = `
${r.map((u) => `	- ${u}`).join(`
`)}`), `${o}${a != null ? `

More info: ${a}
` : ""}`;
  }
};

// src/server-errors.ts
var wa = class extends _a {
  constructor(r) {
    super({
      category: "CORE-SERVER",
      code: 1,
      message: rw.dedent`
        Unable to save global settings file to ${r.filePath}
        ${r.error && `Reason: ${r.error}`}`
    });
    this.data = r;
  }
  static {
    s(this, "SavingGlobalSettingsFileError");
  }
};

// src/cli/globalSettings.ts
var E8 = (0, Ca.join)((0, iw.homedir)(), ".storybook", "settings.json"), C8 = 1, x8 = Li.z.object({
  version: Li.z.number(),
  // NOTE: every key (and subkey) below must be optional, for forwards compatibility reasons
  // (we can remove keys once they are deprecated)
  userSince: Li.z.number().optional(),
  init: Li.z.object({ skipOnboarding: Li.z.boolean().optional() }).optional()
}), Gr;
async function F8(e = E8) {
  if (Gr)
    return Gr;
  try {
    let t = await Ea.default.readFile(e, "utf8"), r = x8.parse(JSON.parse(t));
    Gr = new ls(e, r);
  } catch {
    Gr = new ls(e, { version: C8, userSince: Date.now() }), await Gr.save();
  }
  return Gr;
}
s(F8, "globalSettings");
function S8() {
  Gr = void 0;
}
s(S8, "_clearGlobalSettings");
var ls = class {
  static {
    s(this, "Settings");
  }
  /**
   * Create a new Settings instance
   *
   * @param filePath Path to the JSON settings file
   * @param value Loaded value of settings
   */
  constructor(t, r) {
    this.filePath = t, this.value = r;
  }
  /** Save settings to the file */
  async save() {
    try {
      await Ea.default.mkdir((0, Ca.dirname)(this.filePath), { recursive: !0 }), await Ea.default.writeFile(this.filePath, JSON.stringify(this.
      value, null, 2));
    } catch (t) {
      throw new wa({
        filePath: this.filePath,
        error: t
      });
    }
  }
};
