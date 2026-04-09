"use strict";
var nt = Object.create;
var G = Object.defineProperty;
var st = Object.getOwnPropertyDescriptor;
var at = Object.getOwnPropertyNames;
var ot = Object.getPrototypeOf, lt = Object.prototype.hasOwnProperty;
var i = (e, u) => G(e, "name", { value: u, configurable: !0 });
var Le = (e, u) => () => (e && (u = e(e = 0)), u);
var l = (e, u) => () => (u || e((u = { exports: {} }).exports, u), u.exports), Ie = (e, u) => {
  for (var t in u)
    G(e, t, { get: u[t], enumerable: !0 });
}, Re = (e, u, t, D) => {
  if (u && typeof u == "object" || typeof u == "function")
    for (let r of at(u))
      !lt.call(e, r) && r !== t && G(e, r, { get: () => u[r], enumerable: !(D = st(u, r)) || D.enumerable });
  return e;
};
var Oe = (e, u, t) => (t = e != null ? nt(ot(e)) : {}, Re(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  u || !e || !e.__esModule ? G(t, "default", { value: e, enumerable: !0 }) : t,
  e
)), qe = (e) => Re(G({}, "__esModule", { value: !0 }), e);

// ../node_modules/npmlog/node_modules/are-we-there-yet/lib/tracker-base.js
var re = l((AD, Ue) => {
  "use strict";
  var ht = require("events"), ft = 0, De = class extends ht {
    static {
      i(this, "TrackerBase");
    }
    constructor(u) {
      super(), this.id = ++ft, this.name = u;
    }
  };
  Ue.exports = De;
});

// ../node_modules/npmlog/node_modules/are-we-there-yet/lib/tracker.js
var z = l((wD, Me) => {
  "use strict";
  var ct = re(), ie = class extends ct {
    static {
      i(this, "Tracker");
    }
    constructor(u, t) {
      super(u), this.workDone = 0, this.workTodo = t || 0;
    }
    completed() {
      return this.workTodo === 0 ? 0 : this.workDone / this.workTodo;
    }
    addWork(u) {
      this.workTodo += u, this.emit("change", this.name, this.completed(), this);
    }
    completeWork(u) {
      this.workDone += u, this.workDone > this.workTodo && (this.workDone = this.workTodo), this.emit("change", this.name, this.completed(),
      this);
    }
    finish() {
      this.workTodo = this.workDone = 1, this.emit("change", this.name, 1, this);
    }
  };
  Me.exports = ie;
});

// ../node_modules/npmlog/node_modules/are-we-there-yet/lib/tracker-stream.js
var se = l((yD, Ge) => {
  "use strict";
  var Ft = require("stream"), Ct = z(), ne = class extends Ft.Transform {
    static {
      i(this, "TrackerStream");
    }
    constructor(u, t, D) {
      super(D), this.tracker = new Ct(u, t), this.name = u, this.id = this.tracker.id, this.tracker.on("change", this.trackerChange.bind(this));
    }
    trackerChange(u, t) {
      this.emit("change", u, t, this);
    }
    _transform(u, t, D) {
      this.tracker.completeWork(u.length ? u.length : 1), this.push(u), D();
    }
    _flush(u) {
      this.tracker.finish(), u();
    }
    completed() {
      return this.tracker.completed();
    }
    addWork(u) {
      return this.tracker.addWork(u);
    }
    finish() {
      return this.tracker.finish();
    }
  };
  Ge.exports = ne;
});

// ../node_modules/npmlog/node_modules/are-we-there-yet/lib/tracker-group.js
var $e = l((TD, Ne) => {
  "use strict";
  var Et = re(), We = z(), gt = se(), ae = class e extends Et {
    static {
      i(this, "TrackerGroup");
    }
    parentGroup = null;
    trackers = [];
    completion = {};
    weight = {};
    totalWeight = 0;
    finished = !1;
    bubbleChange = pt(this);
    nameInTree() {
      for (var u = [], t = this; t; )
        u.unshift(t.name), t = t.parentGroup;
      return u.join("/");
    }
    addUnit(u, t) {
      if (u.addUnit) {
        for (var D = this; D; ) {
          if (u === D)
            throw new Error(
              "Attempted to add tracker group " + u.name + " to tree that already includes it " + this.nameInTree(this)
            );
          D = D.parentGroup;
        }
        u.parentGroup = this;
      }
      return this.weight[u.id] = t || 1, this.totalWeight += this.weight[u.id], this.trackers.push(u), this.completion[u.id] = u.completed(),
      u.on("change", this.bubbleChange), this.finished || this.emit("change", u.name, this.completion[u.id], u), u;
    }
    completed() {
      if (this.trackers.length === 0)
        return 0;
      for (var u = 1 / this.totalWeight, t = 0, D = 0; D < this.trackers.length; D++) {
        var r = this.trackers[D].id;
        t += u * this.weight[r] * this.completion[r];
      }
      return t;
    }
    newGroup(u, t) {
      return this.addUnit(new e(u), t);
    }
    newItem(u, t, D) {
      return this.addUnit(new We(u, t), D);
    }
    newStream(u, t, D) {
      return this.addUnit(new gt(u, t), D);
    }
    finish() {
      this.finished = !0, this.trackers.length || this.addUnit(new We(), 1, !0);
      for (var u = 0; u < this.trackers.length; u++) {
        var t = this.trackers[u];
        t.finish(), t.removeListener("change", this.bubbleChange);
      }
      this.emit("change", this.name, 1, this);
    }
    debug(u = 0) {
      let t = " ".repeat(u), D = `${t}${this.name || "top"}: ${this.completed()}
`;
      return this.trackers.forEach(function(r) {
        D += r instanceof e ? r.debug(u + 1) : `${t} ${r.name}: ${r.completed()}
`;
      }), D;
    }
  };
  function pt(e) {
    return function(u, t, D) {
      e.completion[D.id] = t, !e.finished && e.emit("change", u || e.name, e.completed(), e);
    };
  }
  i(pt, "bubbleChange");
  Ne.exports = ae;
});

// ../node_modules/npmlog/node_modules/are-we-there-yet/lib/index.js
var ze = l((P) => {
  "use strict";
  P.TrackerGroup = $e();
  P.Tracker = z();
  P.TrackerStream = se();
});

// ../node_modules/console-control-strings/index.js
var Y = l((g) => {
  "use strict";
  var p = "\x1B[";
  g.up = /* @__PURE__ */ i(function(u) {
    return p + (u || "") + "A";
  }, "up");
  g.down = /* @__PURE__ */ i(function(u) {
    return p + (u || "") + "B";
  }, "down");
  g.forward = /* @__PURE__ */ i(function(u) {
    return p + (u || "") + "C";
  }, "forward");
  g.back = /* @__PURE__ */ i(function(u) {
    return p + (u || "") + "D";
  }, "back");
  g.nextLine = /* @__PURE__ */ i(function(u) {
    return p + (u || "") + "E";
  }, "nextLine");
  g.previousLine = /* @__PURE__ */ i(function(u) {
    return p + (u || "") + "F";
  }, "previousLine");
  g.horizontalAbsolute = /* @__PURE__ */ i(function(u) {
    if (u == null) throw new Error("horizontalAboslute requires a column to position to");
    return p + u + "G";
  }, "horizontalAbsolute");
  g.eraseData = /* @__PURE__ */ i(function() {
    return p + "J";
  }, "eraseData");
  g.eraseLine = /* @__PURE__ */ i(function() {
    return p + "K";
  }, "eraseLine");
  g.goto = function(e, u) {
    return p + u + ";" + e + "H";
  };
  g.gotoSOL = function() {
    return "\r";
  };
  g.beep = function() {
    return "\x07";
  };
  g.hideCursor = /* @__PURE__ */ i(function() {
    return p + "?25l";
  }, "hideCursor");
  g.showCursor = /* @__PURE__ */ i(function() {
    return p + "?25h";
  }, "showCursor");
  var Pe = {
    reset: 0,
    // styles
    bold: 1,
    italic: 3,
    underline: 4,
    inverse: 7,
    // resets
    stopBold: 22,
    stopItalic: 23,
    stopUnderline: 24,
    stopInverse: 27,
    // colors
    white: 37,
    black: 30,
    blue: 34,
    cyan: 36,
    green: 32,
    magenta: 35,
    red: 31,
    yellow: 33,
    bgWhite: 47,
    bgBlack: 40,
    bgBlue: 44,
    bgCyan: 46,
    bgGreen: 42,
    bgMagenta: 45,
    bgRed: 41,
    bgYellow: 43,
    grey: 90,
    brightBlack: 90,
    brightRed: 91,
    brightGreen: 92,
    brightYellow: 93,
    brightBlue: 94,
    brightMagenta: 95,
    brightCyan: 96,
    brightWhite: 97,
    bgGrey: 100,
    bgBrightBlack: 100,
    bgBrightRed: 101,
    bgBrightGreen: 102,
    bgBrightYellow: 103,
    bgBrightBlue: 104,
    bgBrightMagenta: 105,
    bgBrightCyan: 106,
    bgBrightWhite: 107
  };
  g.color = /* @__PURE__ */ i(function(u) {
    return (arguments.length !== 1 || !Array.isArray(u)) && (u = Array.prototype.slice.call(arguments)), p + u.map(dt).join(";") + "m";
  }, "color");
  function dt(e) {
    if (Pe[e] != null) return Pe[e];
    throw new Error("Unknown color or style name: " + e);
  }
  i(dt, "colorNameToCode");
});

// ../node_modules/string-width/node_modules/ansi-regex/index.js
var Ve = l((RD, Ye) => {
  "use strict";
  Ye.exports = ({ onlyFirst: e = !1 } = {}) => {
    let u = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
    ].join("|");
    return new RegExp(u, e ? void 0 : "g");
  };
});

// ../node_modules/string-width/node_modules/strip-ansi/index.js
var He = l((OD, Ze) => {
  "use strict";
  var mt = Ve();
  Ze.exports = (e) => typeof e == "string" ? e.replace(mt(), "") : e;
});

// ../node_modules/is-fullwidth-code-point/index.js
var Xe = l((qD, oe) => {
  "use strict";
  var Je = /* @__PURE__ */ i((e) => Number.isNaN(e) ? !1 : e >= 4352 && (e <= 4447 || // Hangul Jamo
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
  oe.exports = Je;
  oe.exports.default = Je;
});

// ../node_modules/string-width/node_modules/emoji-regex/index.js
var Qe = l((MD, Ke) => {
  "use strict";
  Ke.exports = function() {
    return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
  };
});

// ../node_modules/string-width/index.js
var W = l((GD, le) => {
  "use strict";
  var vt = He(), Bt = Xe(), At = Qe(), je = /* @__PURE__ */ i((e) => {
    if (typeof e != "string" || e.length === 0 || (e = vt(e), e.length === 0))
      return 0;
    e = e.replace(At(), "  ");
    let u = 0;
    for (let t = 0; t < e.length; t++) {
      let D = e.codePointAt(t);
      D <= 31 || D >= 127 && D <= 159 || D >= 768 && D <= 879 || (D > 65535 && t++, u += Bt(D) ? 2 : 1);
    }
    return u;
  }, "stringWidth");
  le.exports = je;
  le.exports.default = je;
});

// ../node_modules/wide-align/align.js
var eu = l((Z) => {
  "use strict";
  var he = W();
  Z.center = xt;
  Z.left = bt;
  Z.right = wt;
  function V(e) {
    var u = "", t = " ", D = e;
    do
      D % 2 && (u += t), D = Math.floor(D / 2), t += t;
    while (D);
    return u;
  }
  i(V, "createPadding");
  function bt(e, u) {
    var t = e.trimRight();
    if (t.length === 0 && e.length >= u) return e;
    var D = "", r = he(t);
    return r < u && (D = V(u - r)), t + D;
  }
  i(bt, "alignLeft");
  function wt(e, u) {
    var t = e.trimLeft();
    if (t.length === 0 && e.length >= u) return e;
    var D = "", r = he(t);
    return r < u && (D = V(u - r)), D + t;
  }
  i(wt, "alignRight");
  function xt(e, u) {
    var t = e.trim();
    if (t.length === 0 && e.length >= u) return e;
    var D = "", r = "", n = he(t);
    if (n < u) {
      var o = parseInt((u - n) / 2, 10);
      D = V(o), r = V(u - (n + o));
    }
    return D + t + r;
  }
  i(xt, "alignCenter");
});

// ../node_modules/aproba/index.js
var J = l((zD, iu) => {
  "use strict";
  iu.exports = Du;
  function yt(e) {
    return e != null && typeof e == "object" && e.hasOwnProperty("callee");
  }
  i(yt, "isArguments");
  var w = {
    "*": { label: "any", check: /* @__PURE__ */ i(() => !0, "check") },
    A: { label: "array", check: /* @__PURE__ */ i((e) => Array.isArray(e) || yt(e), "check") },
    S: { label: "string", check: /* @__PURE__ */ i((e) => typeof e == "string", "check") },
    N: { label: "number", check: /* @__PURE__ */ i((e) => typeof e == "number", "check") },
    F: { label: "function", check: /* @__PURE__ */ i((e) => typeof e == "function", "check") },
    O: { label: "object", check: /* @__PURE__ */ i((e) => typeof e == "object" && e != null && !w.A.check(e) && !w.E.check(e), "check") },
    B: { label: "boolean", check: /* @__PURE__ */ i((e) => typeof e == "boolean", "check") },
    E: { label: "error", check: /* @__PURE__ */ i((e) => e instanceof Error, "check") },
    Z: { label: "null", check: /* @__PURE__ */ i((e) => e == null, "check") }
  };
  function H(e, u) {
    let t = u[e.length] = u[e.length] || [];
    t.indexOf(e) === -1 && t.push(e);
  }
  i(H, "addSchema");
  function Du(e, u) {
    if (arguments.length !== 2) throw tu(["SA"], arguments.length);
    if (!e) throw uu(0, "rawSchemas");
    if (!u) throw uu(1, "args");
    if (!w.S.check(e)) throw fe(0, ["string"], e);
    if (!w.A.check(u)) throw fe(1, ["array"], u);
    let t = e.split("|"), D = {};
    t.forEach((n) => {
      for (let o = 0; o < n.length; ++o) {
        let h = n[o];
        if (!w[h]) throw _t(o, h);
      }
      if (/E.*E/.test(n)) throw Tt(n);
      H(n, D), /E/.test(n) && (H(n.replace(/E.*$/, "E"), D), H(n.replace(/E/, "Z"), D), n.length === 1 && H("", D));
    });
    let r = D[u.length];
    if (!r)
      throw tu(Object.keys(D), u.length);
    for (let n = 0; n < u.length; ++n) {
      let o = r.filter((h) => {
        let f = h[n], c = w[f].check;
        return c(u[n]);
      });
      if (!o.length) {
        let h = r.map((f) => w[f[n]].label).filter((f) => f != null);
        throw fe(n, h, u[n]);
      }
      r = o;
    }
  }
  i(Du, "validate");
  function uu(e) {
    return N("EMISSINGARG", "Missing required argument #" + (e + 1));
  }
  i(uu, "missingRequiredArg");
  function _t(e, u) {
    return N("EUNKNOWNTYPE", "Unknown type " + u + " in argument #" + (e + 1));
  }
  i(_t, "unknownType");
  function fe(e, u, t) {
    let D;
    return Object.keys(w).forEach((r) => {
      w[r].check(t) && (D = w[r].label);
    }), N("EINVALIDTYPE", "Argument #" + (e + 1) + ": Expected " + ru(u) + " but got " + D);
  }
  i(fe, "invalidType");
  function ru(e) {
    return e.join(", ").replace(/, ([^,]+)$/, " or $1");
  }
  i(ru, "englishList");
  function tu(e, u) {
    let t = ru(e), D = e.every((r) => r.length === 1) ? "argument" : "arguments";
    return N("EWRONGARGCOUNT", "Expected " + t + " " + D + " but got " + u);
  }
  i(tu, "wrongNumberOfArgs");
  function Tt(e) {
    return N(
      "ETOOMANYERRORTYPES",
      'Only one error type per argument signature is allowed, more than one found in "' + e + '"'
    );
  }
  i(Tt, "moreThanOneError");
  function N(e, u) {
    let t = new Error(u);
    return t.code = e, Error.captureStackTrace && Error.captureStackTrace(t, Du), t;
  }
  i(N, "newException");
});

// ../node_modules/npmlog/node_modules/ansi-regex/index.js
var su = l((YD, nu) => {
  "use strict";
  nu.exports = ({ onlyFirst: e = !1 } = {}) => {
    let u = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
    ].join("|");
    return new RegExp(u, e ? void 0 : "g");
  };
});

// ../node_modules/npmlog/node_modules/strip-ansi/index.js
var ou = l((VD, au) => {
  "use strict";
  var kt = su();
  au.exports = (e) => typeof e == "string" ? e.replace(kt(), "") : e;
});

// ../node_modules/npmlog/node_modules/gauge/lib/wide-truncate.js
var Fe = l((ZD, lu) => {
  "use strict";
  var ce = W(), St = ou();
  lu.exports = Lt;
  function Lt(e, u) {
    if (ce(e) === 0)
      return e;
    if (u <= 0)
      return "";
    if (ce(e) <= u)
      return e;
    for (var t = St(e), D = e.length + t.length, r = e.slice(0, u + D); ce(r) > u; )
      r = r.slice(0, -1);
    return r;
  }
  i(Lt, "wideTruncate");
});

// ../node_modules/npmlog/node_modules/gauge/lib/error.js
var hu = l((X) => {
  "use strict";
  var It = require("util"), Rt = X.User = /* @__PURE__ */ i(function e(u) {
    var t = new Error(u);
    return Error.captureStackTrace(t, e), t.code = "EGAUGE", t;
  }, "User");
  X.MissingTemplateValue = /* @__PURE__ */ i(function e(u, t) {
    var D = new Rt(It.format('Missing template value "%s"', u.type));
    return Error.captureStackTrace(D, e), D.template = u, D.values = t, D;
  }, "MissingTemplateValue");
  X.Internal = /* @__PURE__ */ i(function e(u) {
    var t = new Error(u);
    return Error.captureStackTrace(t, e), t.code = "EGAUGEINTERNAL", t;
  }, "Internal");
});

// ../node_modules/npmlog/node_modules/gauge/lib/template-item.js
var cu = l((KD, fu) => {
  "use strict";
  var Ot = W();
  fu.exports = I;
  function Ce(e) {
    return typeof e != "string" ? !1 : e.slice(-1) === "%";
  }
  i(Ce, "isPercent");
  function Ee(e) {
    return Number(e.slice(0, -1)) / 100;
  }
  i(Ee, "percent");
  function I(e, u) {
    if (this.overallOutputLength = u, this.finished = !1, this.type = null, this.value = null, this.length = null, this.maxLength = null, this.
    minLength = null, this.kerning = null, this.align = "left", this.padLeft = 0, this.padRight = 0, this.index = null, this.first = null, this.
    last = null, typeof e == "string")
      this.value = e;
    else
      for (var t in e)
        this[t] = e[t];
    return Ce(this.length) && (this.length = Math.round(this.overallOutputLength * Ee(this.length))), Ce(this.minLength) && (this.minLength =
    Math.round(this.overallOutputLength * Ee(this.minLength))), Ce(this.maxLength) && (this.maxLength = Math.round(this.overallOutputLength *
    Ee(this.maxLength))), this;
  }
  i(I, "TemplateItem");
  I.prototype = {};
  I.prototype.getBaseLength = function() {
    var e = this.length;
    return e == null && typeof this.value == "string" && this.maxLength == null && this.minLength == null && (e = Ot(this.value)), e;
  };
  I.prototype.getLength = function() {
    var e = this.getBaseLength();
    return e == null ? null : e + this.padLeft + this.padRight;
  };
  I.prototype.getMaxLength = function() {
    return this.maxLength == null ? null : this.maxLength + this.padLeft + this.padRight;
  };
  I.prototype.getMinLength = function() {
    return this.minLength == null ? null : this.minLength + this.padLeft + this.padRight;
  };
});

// ../node_modules/npmlog/node_modules/gauge/lib/render-template.js
var ge = l((jD, gu) => {
  "use strict";
  var $ = eu(), qt = J(), Fu = Fe(), R = hu(), Ut = cu();
  function Mt(e) {
    return function(u) {
      return Pt(u, e);
    };
  }
  i(Mt, "renderValueWithValues");
  var Gt = gu.exports = function(e, u, t) {
    var D = $t(e, u, t), r = D.map(Mt(t)).join("");
    return $.left(Fu(r, e), e);
  };
  function Cu(e) {
    var u = e.type[0].toUpperCase() + e.type.slice(1);
    return "pre" + u;
  }
  i(Cu, "preType");
  function Eu(e) {
    var u = e.type[0].toUpperCase() + e.type.slice(1);
    return "post" + u;
  }
  i(Eu, "postType");
  function Wt(e, u) {
    if (e.type)
      return u[Cu(e)] || u[Eu(e)];
  }
  i(Wt, "hasPreOrPost");
  function Nt(e, u) {
    var t = Object.assign({}, e), D = Object.create(u), r = [], n = Cu(t), o = Eu(t);
    return D[n] && (r.push({ value: D[n] }), D[n] = null), t.minLength = null, t.length = null, t.maxLength = null, r.push(t), D[t.type] = D[t.
    type], D[o] && (r.push({ value: D[o] }), D[o] = null), function(h, f, c) {
      return Gt(c, r, D);
    };
  }
  i(Nt, "generatePreAndPost");
  function $t(e, u, t) {
    function D(a, b, it) {
      var E = new Ut(a, e), Se = E.type;
      if (E.value == null)
        if (Se in t)
          E.value = t[Se];
        else {
          if (E.default == null)
            throw new R.MissingTemplateValue(E, t);
          E.value = E.default;
        }
      return E.value == null || E.value === "" ? null : (E.index = b, E.first = b === 0, E.last = b === it.length - 1, Wt(E, t) && (E.value =
      Nt(E, t)), E);
    }
    i(D, "cloneAndObjectify");
    var r = u.map(D).filter(function(a) {
      return a != null;
    }), n = e, o = r.length;
    function h(a) {
      a > n && (a = n), n -= a;
    }
    i(h, "consumeSpace");
    function f(a, b) {
      if (a.finished)
        throw new R.Internal("Tried to finish template item that was already finished");
      if (b === 1 / 0)
        throw new R.Internal("Length of template item cannot be infinity");
      if (b != null && (a.length = b), a.minLength = null, a.maxLength = null, --o, a.finished = !0, a.length == null && (a.length = a.getBaseLength()),
      a.length == null)
        throw new R.Internal("Finished template items must have a length");
      h(a.getLength());
    }
    i(f, "finishSizing"), r.forEach(function(a) {
      if (a.kerning) {
        var b = a.first ? 0 : r[a.index - 1].padRight;
        !a.first && b < a.kerning && (a.padLeft = a.kerning - b), a.last || (a.padRight = a.kerning);
      }
    }), r.forEach(function(a) {
      a.getBaseLength() != null && f(a);
    });
    var c = 0, F, m;
    do
      F = !1, m = Math.round(n / o), r.forEach(function(a) {
        a.finished || a.maxLength && a.getMaxLength() < m && (f(a, a.maxLength), F = !0);
      });
    while (F && c++ < r.length);
    if (F)
      throw new R.Internal("Resize loop iterated too many times while determining maxLength");
    c = 0;
    do
      F = !1, m = Math.round(n / o), r.forEach(function(a) {
        a.finished || a.minLength && a.getMinLength() >= m && (f(a, a.minLength), F = !0);
      });
    while (F && c++ < r.length);
    if (F)
      throw new R.Internal("Resize loop iterated too many times while determining minLength");
    return m = Math.round(n / o), r.forEach(function(a) {
      a.finished || f(a, m);
    }), r;
  }
  i($t, "prepareItems");
  function zt(e, u, t) {
    return qt("OON", arguments), e.type ? e.value(u, u[e.type + "Theme"] || {}, t) : e.value(u, {}, t);
  }
  i(zt, "renderFunction");
  function Pt(e, u) {
    var t = e.getBaseLength(), D = typeof e.value == "function" ? zt(e, u, t) : e.value;
    if (D == null || D === "")
      return "";
    var r = $[e.align] || $.left, n = e.padLeft ? $.left("", e.padLeft) : "", o = e.padRight ? $.right("", e.padRight) : "", h = Fu(String(D),
    t), f = r(h, t);
    return n + f + o;
  }
  i(Pt, "renderValue");
});

// ../node_modules/npmlog/node_modules/gauge/lib/plumbing.js
var du = l((ur, pu) => {
  "use strict";
  var k = Y(), Yt = ge(), K = J(), y = pu.exports = function(e, u, t) {
    t || (t = 80), K("OAN", [e, u, t]), this.showing = !1, this.theme = e, this.width = t, this.template = u;
  };
  y.prototype = {};
  y.prototype.setTheme = function(e) {
    K("O", [e]), this.theme = e;
  };
  y.prototype.setTemplate = function(e) {
    K("A", [e]), this.template = e;
  };
  y.prototype.setWidth = function(e) {
    K("N", [e]), this.width = e;
  };
  y.prototype.hide = function() {
    return k.gotoSOL() + k.eraseLine();
  };
  y.prototype.hideCursor = k.hideCursor;
  y.prototype.showCursor = k.showCursor;
  y.prototype.show = function(e) {
    var u = Object.create(this.theme);
    for (var t in e)
      u[t] = e[t];
    return Yt(this.width, this.template, u).trim() + k.color("reset") + k.eraseLine() + k.gotoSOL();
  };
});

// ../node_modules/has-unicode/index.js
var vu = l((Dr, mu) => {
  "use strict";
  var Vt = require("os"), tr = mu.exports = function() {
    if (Vt.type() == "Windows_NT")
      return !1;
    var e = /UTF-?8$/i, u = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG;
    return e.test(u);
  };
});

// ../node_modules/color-support/index.js
var bu = l((rr, Au) => {
  Au.exports = Bu({ alwaysReturn: !0 }, Bu);
  function O(e, u) {
    return e.level = 0, e.hasBasic = !1, e.has256 = !1, e.has16m = !1, u.alwaysReturn ? e : !1;
  }
  i(O, "hasNone");
  function Q(e) {
    return e.hasBasic = !0, e.has256 = !1, e.has16m = !1, e.level = 1, e;
  }
  i(Q, "hasBasic");
  function q(e) {
    return e.hasBasic = !0, e.has256 = !0, e.has16m = !1, e.level = 2, e;
  }
  i(q, "has256");
  function j(e) {
    return e.hasBasic = !0, e.has256 = !0, e.has16m = !0, e.level = 3, e;
  }
  i(j, "has16m");
  function Bu(e, u) {
    if (e = e || {}, u = u || {}, typeof e.level == "number")
      switch (e.level) {
        case 0:
          return O(u, e);
        case 1:
          return Q(u);
        case 2:
          return q(u);
        case 3:
          return j(u);
      }
    if (u.level = 0, u.hasBasic = !1, u.has256 = !1, u.has16m = !1, typeof process > "u" || !process || !process.stdout || !process.env || !process.
    platform)
      return O(u, e);
    var t = e.env || process.env, D = e.stream || process.stdout, r = e.term || t.TERM || "", n = e.platform || process.platform;
    if (!e.ignoreTTY && !D.isTTY || !e.ignoreDumb && r === "dumb" && !t.COLORTERM)
      return O(u, e);
    if (n === "win32")
      return Q(u);
    if (t.TMUX)
      return q(u);
    if (!e.ignoreCI && (t.CI || t.TEAMCITY_VERSION))
      return t.TRAVIS ? q(u) : O(u, e);
    switch (t.TERM_PROGRAM) {
      case "iTerm.app":
        var o = t.TERM_PROGRAM_VERSION || "0.";
        return /^[0-2]\./.test(o) ? q(u) : j(u);
      case "HyperTerm":
      case "Hyper":
        return j(u);
      case "MacTerm":
        return j(u);
      case "Apple_Terminal":
        return q(u);
    }
    return /^xterm-256/.test(r) ? q(u) : /^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(r) || t.COLORTERM ? Q(u) : O(u, e);
  }
  i(Bu, "colorSupport");
});

// ../node_modules/npmlog/node_modules/gauge/lib/has-color.js
var xu = l((nr, wu) => {
  "use strict";
  var Zt = bu();
  wu.exports = Zt().hasBasic;
});

// ../node_modules/npmlog/node_modules/signal-exit/dist/mjs/signals.js
var _, yu = Le(() => {
  _ = [];
  _.push("SIGHUP", "SIGINT", "SIGTERM");
  process.platform !== "win32" && _.push(
    "SIGALRM",
    "SIGABRT",
    "SIGVTALRM",
    "SIGXCPU",
    "SIGXFSZ",
    "SIGUSR2",
    "SIGTRAP",
    "SIGSYS",
    "SIGQUIT",
    "SIGIOT"
    // should detect profiler and enable/disable accordingly.
    // see #21
    // 'SIGPROF'
  );
  process.platform === "linux" && _.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
});

// ../node_modules/npmlog/node_modules/signal-exit/dist/mjs/index.js
var _u = {};
Ie(_u, {
  load: () => Kt,
  onExit: () => Xt,
  signals: () => _,
  unload: () => Qt
});
var ee, pe, de, Ht, me, ue, Jt, ve, Be, Ae, Xt, Kt, Qt, Tu = Le(() => {
  yu();
  ee = /* @__PURE__ */ i((e) => !!e && typeof e == "object" && typeof e.removeListener == "function" && typeof e.emit == "function" && typeof e.
  reallyExit == "function" && typeof e.listeners == "function" && typeof e.kill == "function" && typeof e.pid == "number" && typeof e.on == "\
function", "processOk"), pe = Symbol.for("signal-exit emitter"), de = globalThis, Ht = Object.defineProperty.bind(Object), me = class {
    static {
      i(this, "Emitter");
    }
    emitted = {
      afterExit: !1,
      exit: !1
    };
    listeners = {
      afterExit: [],
      exit: []
    };
    count = 0;
    id = Math.random();
    constructor() {
      if (de[pe])
        return de[pe];
      Ht(de, pe, {
        value: this,
        writable: !1,
        enumerable: !1,
        configurable: !1
      });
    }
    on(u, t) {
      this.listeners[u].push(t);
    }
    removeListener(u, t) {
      let D = this.listeners[u], r = D.indexOf(t);
      r !== -1 && (r === 0 && D.length === 1 ? D.length = 0 : D.splice(r, 1));
    }
    emit(u, t, D) {
      if (this.emitted[u])
        return !1;
      this.emitted[u] = !0;
      let r = !1;
      for (let n of this.listeners[u])
        r = n(t, D) === !0 || r;
      return u === "exit" && (r = this.emit("afterExit", t, D) || r), r;
    }
  }, ue = class {
    static {
      i(this, "SignalExitBase");
    }
  }, Jt = /* @__PURE__ */ i((e) => ({
    onExit(u, t) {
      return e.onExit(u, t);
    },
    load() {
      return e.load();
    },
    unload() {
      return e.unload();
    }
  }), "signalExitWrap"), ve = class extends ue {
    static {
      i(this, "SignalExitFallback");
    }
    onExit() {
      return () => {
      };
    }
    load() {
    }
    unload() {
    }
  }, Be = class extends ue {
    static {
      i(this, "SignalExit");
    }
    // "SIGHUP" throws an `ENOSYS` error on Windows,
    // so use a supported signal instead
    /* c8 ignore start */
    #n = Ae.platform === "win32" ? "SIGINT" : "SIGHUP";
    /* c8 ignore stop */
    #u = new me();
    #e;
    #r;
    #i;
    #D = {};
    #t = !1;
    constructor(u) {
      super(), this.#e = u, this.#D = {};
      for (let t of _)
        this.#D[t] = () => {
          let D = this.#e.listeners(t), { count: r } = this.#u, n = u;
          if (typeof n.__signal_exit_emitter__ == "object" && typeof n.__signal_exit_emitter__.count == "number" && (r += n.__signal_exit_emitter__.
          count), D.length === r) {
            this.unload();
            let o = this.#u.emit("exit", null, t), h = t === "SIGHUP" ? this.#n : t;
            o || u.kill(u.pid, h);
          }
        };
      this.#i = u.reallyExit, this.#r = u.emit;
    }
    onExit(u, t) {
      if (!ee(this.#e))
        return () => {
        };
      this.#t === !1 && this.load();
      let D = t?.alwaysLast ? "afterExit" : "exit";
      return this.#u.on(D, u), () => {
        this.#u.removeListener(D, u), this.#u.listeners.exit.length === 0 && this.#u.listeners.afterExit.length === 0 && this.unload();
      };
    }
    load() {
      if (!this.#t) {
        this.#t = !0, this.#u.count += 1;
        for (let u of _)
          try {
            let t = this.#D[u];
            t && this.#e.on(u, t);
          } catch {
          }
        this.#e.emit = (u, ...t) => this.#a(u, ...t), this.#e.reallyExit = (u) => this.#s(u);
      }
    }
    unload() {
      this.#t && (this.#t = !1, _.forEach((u) => {
        let t = this.#D[u];
        if (!t)
          throw new Error("Listener not defined for signal: " + u);
        try {
          this.#e.removeListener(u, t);
        } catch {
        }
      }), this.#e.emit = this.#r, this.#e.reallyExit = this.#i, this.#u.count -= 1);
    }
    #s(u) {
      return ee(this.#e) ? (this.#e.exitCode = u || 0, this.#u.emit("exit", this.#e.exitCode, null), this.#i.call(this.#e, this.#e.exitCode)) :
      0;
    }
    #a(u, ...t) {
      let D = this.#r;
      if (u === "exit" && ee(this.#e)) {
        typeof t[0] == "number" && (this.#e.exitCode = t[0]);
        let r = D.call(this.#e, u, ...t);
        return this.#u.emit("exit", this.#e.exitCode, null), r;
      } else
        return D.call(this.#e, u, ...t);
    }
  }, Ae = globalThis.process, {
    onExit: (
      /**
       * Called when the process is exiting, whether via signal, explicit
       * exit, or running out of stuff to do.
       *
       * If the global process object is not suitable for instrumentation,
       * then this will be a no-op.
       *
       * Returns a function that may be used to unload signal-exit.
       */
      Xt
    ),
    load: (
      /**
       * Load the listeners.  Likely you never need to call this, unless
       * doing a rather deep integration with signal-exit functionality.
       * Mostly exposed for the benefit of testing.
       *
       * @internal
       */
      Kt
    ),
    unload: (
      /**
       * Unload the listeners.  Likely you never need to call this, unless
       * doing a rather deep integration with signal-exit functionality.
       * Mostly exposed for the benefit of testing.
       *
       * @internal
       */
      Qt
    )
  } = Jt(ee(Ae) ? new Be(Ae) : new ve());
});

// ../node_modules/npmlog/node_modules/gauge/lib/spin.js
var Su = l((lr, ku) => {
  "use strict";
  ku.exports = /* @__PURE__ */ i(function(u, t) {
    return u[t % u.length];
  }, "spin");
});

// ../node_modules/npmlog/node_modules/gauge/lib/progress-bar.js
var Ru = l((fr, Iu) => {
  "use strict";
  var jt = J(), eD = ge(), uD = Fe(), tD = W();
  Iu.exports = function(e, u, t) {
    if (jt("ONN", [e, u, t]), t < 0 && (t = 0), t > 1 && (t = 1), u <= 0)
      return "";
    var D = Math.round(u * t), r = u - D, n = [
      { type: "complete", value: Lu(e.complete, D), length: D },
      { type: "remaining", value: Lu(e.remaining, r), length: r }
    ];
    return eD(u, n, e);
  };
  function Lu(e, u) {
    var t = "", D = u;
    do
      D % 2 && (t += e), D = Math.floor(D / 2), e += e;
    while (D && tD(t) < u);
    return uD(t, u);
  }
  i(Lu, "repeat");
});

// ../node_modules/npmlog/node_modules/gauge/lib/base-theme.js
var qu = l((Fr, Ou) => {
  "use strict";
  var DD = Su(), rD = Ru();
  Ou.exports = {
    activityIndicator: /* @__PURE__ */ i(function(e, u, t) {
      if (e.spun != null)
        return DD(u, e.spun);
    }, "activityIndicator"),
    progressbar: /* @__PURE__ */ i(function(e, u, t) {
      if (e.completed != null)
        return rD(u, t, e.completed);
    }, "progressbar")
  };
});

// ../node_modules/npmlog/node_modules/gauge/lib/theme-set.js
var Mu = l((Er, Uu) => {
  "use strict";
  Uu.exports = function() {
    return d.newThemeSet();
  };
  var d = {};
  d.baseTheme = qu();
  d.newTheme = function(e, u) {
    return u || (u = e, e = this.baseTheme), Object.assign({}, e, u);
  };
  d.getThemeNames = function() {
    return Object.keys(this.themes);
  };
  d.addTheme = function(e, u, t) {
    this.themes[e] = this.newTheme(u, t);
  };
  d.addToAllThemes = function(e) {
    var u = this.themes;
    Object.keys(u).forEach(function(t) {
      Object.assign(u[t], e);
    }), Object.assign(this.baseTheme, e);
  };
  d.getTheme = function(e) {
    if (!this.themes[e])
      throw this.newMissingThemeError(e);
    return this.themes[e];
  };
  d.setDefault = function(e, u) {
    u == null && (u = e, e = {});
    var t = e.platform == null ? "fallback" : e.platform, D = !!e.hasUnicode, r = !!e.hasColor;
    this.defaults[t] || (this.defaults[t] = { true: {}, false: {} }), this.defaults[t][D][r] = u;
  };
  d.getDefault = function(e) {
    e || (e = {});
    var u = e.platform || process.platform, t = this.defaults[u] || this.defaults.fallback, D = !!e.hasUnicode, r = !!e.hasColor;
    if (!t)
      throw this.newMissingDefaultThemeError(u, D, r);
    if (!t[D][r]) {
      if (D && r && t[!D][r])
        D = !1;
      else if (D && r && t[D][!r])
        r = !1;
      else if (D && r && t[!D][!r])
        D = !1, r = !1;
      else if (D && !r && t[!D][r])
        D = !1;
      else if (!D && r && t[D][!r])
        r = !1;
      else if (t === this.defaults.fallback)
        throw this.newMissingDefaultThemeError(u, D, r);
    }
    return t[D][r] ? this.getTheme(t[D][r]) : this.getDefault(Object.assign({}, e, { platform: "fallback" }));
  };
  d.newMissingThemeError = /* @__PURE__ */ i(function e(u) {
    var t = new Error('Could not find a gauge theme named "' + u + '"');
    return Error.captureStackTrace.call(t, e), t.theme = u, t.code = "EMISSINGTHEME", t;
  }, "newMissingThemeError");
  d.newMissingDefaultThemeError = /* @__PURE__ */ i(function e(u, t, D) {
    var r = new Error(
      `Could not find a gauge theme for your platform/unicode/color use combo:
    platform = ` + u + `
    hasUnicode = ` + t + `
    hasColor = ` + D
    );
    return Error.captureStackTrace.call(r, e), r.platform = u, r.hasUnicode = t, r.hasColor = D, r.code = "EMISSINGTHEME", r;
  }, "newMissingDefaultThemeError");
  d.newThemeSet = function() {
    var e = /* @__PURE__ */ i(function(u) {
      return e.getDefault(u);
    }, "themeset");
    return Object.assign(e, d, {
      themes: Object.assign({}, this.themes),
      baseTheme: Object.assign({}, this.baseTheme),
      defaults: JSON.parse(JSON.stringify(this.defaults || {}))
    });
  };
});

// ../node_modules/npmlog/node_modules/gauge/lib/themes.js
var Wu = l((pr, Gu) => {
  "use strict";
  var T = Y().color, iD = Mu(), v = Gu.exports = new iD();
  v.addTheme("ASCII", {
    preProgressbar: "[",
    postProgressbar: "]",
    progressbarTheme: {
      complete: "#",
      remaining: "."
    },
    activityIndicatorTheme: "-\\|/",
    preSubsection: ">"
  });
  v.addTheme("colorASCII", v.getTheme("ASCII"), {
    progressbarTheme: {
      preComplete: T("bgBrightWhite", "brightWhite"),
      complete: "#",
      postComplete: T("reset"),
      preRemaining: T("bgBrightBlack", "brightBlack"),
      remaining: ".",
      postRemaining: T("reset")
    }
  });
  v.addTheme("brailleSpinner", {
    preProgressbar: "(",
    postProgressbar: ")",
    progressbarTheme: {
      complete: "#",
      remaining: "\u2802"
    },
    activityIndicatorTheme: "\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F",
    preSubsection: ">"
  });
  v.addTheme("colorBrailleSpinner", v.getTheme("brailleSpinner"), {
    progressbarTheme: {
      preComplete: T("bgBrightWhite", "brightWhite"),
      complete: "#",
      postComplete: T("reset"),
      preRemaining: T("bgBrightBlack", "brightBlack"),
      remaining: "\u2802",
      postRemaining: T("reset")
    }
  });
  v.setDefault({}, "ASCII");
  v.setDefault({ hasColor: !0 }, "colorASCII");
  v.setDefault({ platform: "darwin", hasUnicode: !0 }, "brailleSpinner");
  v.setDefault({ platform: "darwin", hasUnicode: !0, hasColor: !0 }, "colorBrailleSpinner");
  v.setDefault({ platform: "linux", hasUnicode: !0 }, "brailleSpinner");
  v.setDefault({ platform: "linux", hasUnicode: !0, hasColor: !0 }, "colorBrailleSpinner");
});

// ../node_modules/npmlog/node_modules/gauge/lib/set-interval.js
var $u = l((dr, Nu) => {
  "use strict";
  Nu.exports = setInterval;
});

// ../node_modules/npmlog/node_modules/gauge/lib/process.js
var be = l((mr, zu) => {
  "use strict";
  zu.exports = process;
});

// ../node_modules/npmlog/node_modules/gauge/lib/set-immediate.js
var Pu = l((vr, we) => {
  "use strict";
  var nD = be();
  try {
    we.exports = setImmediate;
  } catch {
    we.exports = nD.nextTick;
  }
});

// ../node_modules/npmlog/node_modules/gauge/lib/index.js
var Vu = l((Br, Yu) => {
  "use strict";
  var sD = du(), aD = vu(), oD = xu(), lD = (Tu(), qe(_u)).onExit, hD = Wu(), fD = $u(), S = be(), cD = Pu();
  Yu.exports = C;
  function te(e, u) {
    return function() {
      return u.call(e);
    };
  }
  i(te, "callWith");
  function C(e, u) {
    var t, D;
    e && e.write ? (D = e, t = u || {}) : u && u.write ? (D = u, t = e || {}) : (D = S.stderr, t = e || u || {}), this._status = {
      spun: 0,
      section: "",
      subsection: ""
    }, this._paused = !1, this._disabled = !0, this._showing = !1, this._onScreen = !1, this._needsRedraw = !1, this._hideCursor = t.hideCursor ==
    null ? !0 : t.hideCursor, this._fixedFramerate = t.fixedFramerate == null ? !/^v0\.8\./.test(S.version) : t.fixedFramerate, this._lastUpdateAt =
    null, this._updateInterval = t.updateInterval == null ? 50 : t.updateInterval, this._themes = t.themes || hD, this._theme = t.theme;
    var r = this._computeTheme(t.theme), n = t.template || [
      { type: "progressbar", length: 20 },
      { type: "activityIndicator", kerning: 1, length: 1 },
      { type: "section", kerning: 1, default: "" },
      { type: "subsection", kerning: 1, default: "" }
    ];
    this.setWriteTo(D, t.tty);
    var o = t.Plumbing || sD;
    this._gauge = new o(r, n, this.getWidth()), this._$$doRedraw = te(this, this._doRedraw), this._$$handleSizeChange = te(this, this._handleSizeChange),
    this._cleanupOnExit = t.cleanupOnExit == null || t.cleanupOnExit, this._removeOnExit = null, t.enabled || t.enabled == null && this._tty &&
    this._tty.isTTY ? this.enable() : this.disable();
  }
  i(C, "Gauge");
  C.prototype = {};
  C.prototype.isEnabled = function() {
    return !this._disabled;
  };
  C.prototype.setTemplate = function(e) {
    this._gauge.setTemplate(e), this._showing && this._requestRedraw();
  };
  C.prototype._computeTheme = function(e) {
    if (e || (e = {}), typeof e == "string")
      e = this._themes.getTheme(e);
    else if (Object.keys(e).length === 0 || e.hasUnicode != null || e.hasColor != null) {
      var u = e.hasUnicode == null ? aD() : e.hasUnicode, t = e.hasColor == null ? oD : e.hasColor;
      e = this._themes.getDefault({
        hasUnicode: u,
        hasColor: t,
        platform: e.platform
      });
    }
    return e;
  };
  C.prototype.setThemeset = function(e) {
    this._themes = e, this.setTheme(this._theme);
  };
  C.prototype.setTheme = function(e) {
    this._gauge.setTheme(this._computeTheme(e)), this._showing && this._requestRedraw(), this._theme = e;
  };
  C.prototype._requestRedraw = function() {
    this._needsRedraw = !0, this._fixedFramerate || this._doRedraw();
  };
  C.prototype.getWidth = function() {
    return (this._tty && this._tty.columns || 80) - 1;
  };
  C.prototype.setWriteTo = function(e, u) {
    var t = !this._disabled;
    t && this.disable(), this._writeTo = e, this._tty = u || e === S.stderr && S.stdout.isTTY && S.stdout || e.isTTY && e || this._tty, this.
    _gauge && this._gauge.setWidth(this.getWidth()), t && this.enable();
  };
  C.prototype.enable = function() {
    this._disabled && (this._disabled = !1, this._tty && this._enableEvents(), this._showing && this.show());
  };
  C.prototype.disable = function() {
    this._disabled || (this._showing && (this._lastUpdateAt = null, this._showing = !1, this._doRedraw(), this._showing = !0), this._disabled =
    !0, this._tty && this._disableEvents());
  };
  C.prototype._enableEvents = function() {
    this._cleanupOnExit && (this._removeOnExit = lD(te(this, this.disable))), this._tty.on("resize", this._$$handleSizeChange), this._fixedFramerate &&
    (this.redrawTracker = fD(this._$$doRedraw, this._updateInterval), this.redrawTracker.unref && this.redrawTracker.unref());
  };
  C.prototype._disableEvents = function() {
    this._tty.removeListener("resize", this._$$handleSizeChange), this._fixedFramerate && clearInterval(this.redrawTracker), this._removeOnExit &&
    this._removeOnExit();
  };
  C.prototype.hide = function(e) {
    if (this._disabled || !this._showing)
      return e && S.nextTick(e);
    this._showing = !1, this._doRedraw(), e && cD(e);
  };
  C.prototype.show = function(e, u) {
    if (this._showing = !0, typeof e == "string")
      this._status.section = e;
    else if (typeof e == "object")
      for (var t = Object.keys(e), D = 0; D < t.length; ++D) {
        var r = t[D];
        this._status[r] = e[r];
      }
    u != null && (this._status.completed = u), !this._disabled && this._requestRedraw();
  };
  C.prototype.pulse = function(e) {
    this._status.subsection = e || "", this._status.spun++, !this._disabled && this._showing && this._requestRedraw();
  };
  C.prototype._handleSizeChange = function() {
    this._gauge.setWidth(this._tty.columns - 1), this._requestRedraw();
  };
  C.prototype._doRedraw = function() {
    if (!(this._disabled || this._paused)) {
      if (!this._fixedFramerate) {
        var e = Date.now();
        if (this._lastUpdateAt && e - this._lastUpdateAt < this._updateInterval)
          return;
        this._lastUpdateAt = e;
      }
      if (!this._showing && this._onScreen) {
        this._onScreen = !1;
        var u = this._gauge.hide();
        return this._hideCursor && (u += this._gauge.showCursor()), this._writeTo.write(u);
      }
      !this._showing && !this._onScreen || (this._showing && !this._onScreen && (this._onScreen = !0, this._needsRedraw = !0, this._hideCursor &&
      this._writeTo.write(this._gauge.hideCursor())), this._needsRedraw && (this._writeTo.write(this._gauge.show(this._status)) || (this._paused =
      !0, this._writeTo.on("drain", te(this, function() {
        this._paused = !1, this._doRedraw();
      })))));
    }
  };
});

// ../node_modules/set-blocking/index.js
var Hu = l((br, Zu) => {
  Zu.exports = function(e) {
    [process.stdout, process.stderr].forEach(function(u) {
      u._handle && u.isTTY && typeof u._handle.setBlocking == "function" && u._handle.setBlocking(e);
    });
  };
});

// ../node_modules/npmlog/lib/log.js
var ju = l((Ku, Qu) => {
  "use strict";
  var Ju = ze(), FD = Vu(), CD = require("events").EventEmitter, s = Ku = Qu.exports = new CD(), xe = require("util"), ED = Hu(), ye = Y();
  ED(!0);
  var x = process.stderr;
  Object.defineProperty(s, "stream", {
    set: /* @__PURE__ */ i(function(e) {
      x = e, this.gauge && this.gauge.setWriteTo(x, x);
    }, "set"),
    get: /* @__PURE__ */ i(function() {
      return x;
    }, "get")
  });
  var U;
  s.useColor = function() {
    return U ?? x.isTTY;
  };
  s.enableColor = function() {
    U = !0, this.gauge.setTheme({ hasColor: U, hasUnicode: M });
  };
  s.disableColor = function() {
    U = !1, this.gauge.setTheme({ hasColor: U, hasUnicode: M });
  };
  s.level = "info";
  s.gauge = new FD(x, {
    enabled: !1,
    // no progress bars unless asked
    theme: { hasColor: s.useColor() },
    template: [
      { type: "progressbar", length: 20 },
      { type: "activityIndicator", kerning: 1, length: 1 },
      { type: "section", default: "" },
      ":",
      { type: "logline", kerning: 1, default: "" }
    ]
  });
  s.tracker = new Ju.TrackerGroup();
  s.progressEnabled = s.gauge.isEnabled();
  var M;
  s.enableUnicode = function() {
    M = !0, this.gauge.setTheme({ hasColor: this.useColor(), hasUnicode: M });
  };
  s.disableUnicode = function() {
    M = !1, this.gauge.setTheme({ hasColor: this.useColor(), hasUnicode: M });
  };
  s.setGaugeThemeset = function(e) {
    this.gauge.setThemeset(e);
  };
  s.setGaugeTemplate = function(e) {
    this.gauge.setTemplate(e);
  };
  s.enableProgress = function() {
    this.progressEnabled || this._paused || (this.progressEnabled = !0, this.tracker.on("change", this.showProgress), this.gauge.enable());
  };
  s.disableProgress = function() {
    this.progressEnabled && (this.progressEnabled = !1, this.tracker.removeListener("change", this.showProgress), this.gauge.disable());
  };
  var _e = ["newGroup", "newItem", "newStream"], Xu = /* @__PURE__ */ i(function(e) {
    return Object.keys(s).forEach(function(u) {
      if (u[0] !== "_" && !_e.filter(function(D) {
        return D === u;
      }).length && !e[u] && typeof s[u] == "function") {
        var t = s[u];
        e[u] = function() {
          return t.apply(s, arguments);
        };
      }
    }), e instanceof Ju.TrackerGroup && _e.forEach(function(u) {
      var t = e[u];
      e[u] = function() {
        return Xu(t.apply(e, arguments));
      };
    }), e;
  }, "mixinLog");
  _e.forEach(function(e) {
    s[e] = function() {
      return Xu(this.tracker[e].apply(this.tracker, arguments));
    };
  });
  s.clearProgress = function(e) {
    if (!this.progressEnabled)
      return e && process.nextTick(e);
    this.gauge.hide(e);
  };
  s.showProgress = function(e, u) {
    if (this.progressEnabled) {
      var t = {};
      e && (t.section = e);
      var D = s.record[s.record.length - 1];
      if (D) {
        t.subsection = D.prefix;
        var r = s.disp[D.level] || D.level, n = this._format(r, s.style[D.level]);
        D.prefix && (n += " " + this._format(D.prefix, this.prefixStyle)), n += " " + D.message.split(/\r?\n/)[0], t.logline = n;
      }
      t.completed = u || this.tracker.completed(), this.gauge.show(t);
    }
  }.bind(s);
  s.pause = function() {
    this._paused = !0, this.progressEnabled && this.gauge.disable();
  };
  s.resume = function() {
    if (this._paused) {
      this._paused = !1;
      var e = this._buffer;
      this._buffer = [], e.forEach(function(u) {
        this.emitLog(u);
      }, this), this.progressEnabled && this.gauge.enable();
    }
  };
  s._buffer = [];
  var gD = 0;
  s.record = [];
  s.maxRecordSize = 1e4;
  s.log = function(e, u, t) {
    var D = this.levels[e];
    if (D === void 0)
      return this.emit("error", new Error(xe.format(
        "Undefined log level: %j",
        e
      )));
    for (var r = new Array(arguments.length - 2), n = null, o = 2; o < arguments.length; o++) {
      var h = r[o - 2] = arguments[o];
      typeof h == "object" && h instanceof Error && h.stack && Object.defineProperty(h, "stack", {
        value: n = h.stack + "",
        enumerable: !0,
        writable: !0
      });
    }
    n && r.unshift(n + `
`), t = xe.format.apply(xe, r);
    var f = {
      id: gD++,
      level: e,
      prefix: String(u || ""),
      message: t,
      messageRaw: r
    };
    this.emit("log", f), this.emit("log." + e, f), f.prefix && this.emit(f.prefix, f), this.record.push(f);
    var c = this.maxRecordSize, F = this.record.length - c;
    if (F > c / 10) {
      var m = Math.floor(c * 0.9);
      this.record = this.record.slice(-1 * m);
    }
    this.emitLog(f);
  }.bind(s);
  s.emitLog = function(e) {
    if (this._paused) {
      this._buffer.push(e);
      return;
    }
    this.progressEnabled && this.gauge.pulse(e.prefix);
    var u = this.levels[e.level];
    if (u !== void 0 && !(u < this.levels[this.level]) && !(u > 0 && !isFinite(u))) {
      var t = s.disp[e.level] != null ? s.disp[e.level] : e.level;
      this.clearProgress(), e.message.split(/\r?\n/).forEach(function(D) {
        var r = this.heading;
        r && (this.write(r, this.headingStyle), this.write(" ")), this.write(t, s.style[e.level]);
        var n = e.prefix || "";
        n && this.write(" "), this.write(n, this.prefixStyle), this.write(" " + D + `
`);
      }, this), this.showProgress();
    }
  };
  s._format = function(e, u) {
    if (x) {
      var t = "";
      if (this.useColor()) {
        u = u || {};
        var D = [];
        u.fg && D.push(u.fg), u.bg && D.push("bg" + u.bg[0].toUpperCase() + u.bg.slice(1)), u.bold && D.push("bold"), u.underline && D.push(
        "underline"), u.inverse && D.push("inverse"), D.length && (t += ye.color(D)), u.beep && (t += ye.beep());
      }
      return t += e, this.useColor() && (t += ye.color("reset")), t;
    }
  };
  s.write = function(e, u) {
    x && x.write(this._format(e, u));
  };
  s.addLevel = function(e, u, t, D) {
    D == null && (D = e), this.levels[e] = u, this.style[e] = t, this[e] || (this[e] = function() {
      var r = new Array(arguments.length + 1);
      r[0] = e;
      for (var n = 0; n < arguments.length; n++)
        r[n + 1] = arguments[n];
      return this.log.apply(this, r);
    }.bind(this)), this.disp[e] = D;
  };
  s.prefixStyle = { fg: "magenta" };
  s.headingStyle = { fg: "white", bg: "black" };
  s.style = {};
  s.levels = {};
  s.disp = {};
  s.addLevel("silly", -1 / 0, { inverse: !0 }, "sill");
  s.addLevel("verbose", 1e3, { fg: "cyan", bg: "black" }, "verb");
  s.addLevel("info", 2e3, { fg: "green" });
  s.addLevel("timing", 2500, { fg: "green", bg: "black" });
  s.addLevel("http", 3e3, { fg: "green", bg: "black" });
  s.addLevel("notice", 3500, { fg: "cyan", bg: "black" });
  s.addLevel("warn", 4e3, { fg: "black", bg: "yellow" }, "WARN");
  s.addLevel("error", 5e3, { fg: "red", bg: "black" }, "ERR!");
  s.addLevel("silent", 1 / 0);
  s.on("error", function() {
  });
});

// ../node_modules/pretty-hrtime/index.js
var tt = l((xr, ut) => {
  "use strict";
  var pD = ["h", "min", "s", "ms", "\u03BCs", "ns"], dD = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"], et = [3600,
  60, 1, 1e6, 1e3, 1];
  ut.exports = function(e, u) {
    var t, D, r, n, o, h, f, c, F, m;
    if (t = !1, D = !1, u && (t = u.verbose || !1, D = u.precise || !1), !Array.isArray(e) || e.length !== 2 || typeof e[0] != "number" || typeof e[1] !=
    "number")
      return "";
    for (e[1] < 0 && (m = e[0] + e[1] / 1e9, e[0] = parseInt(m), e[1] = parseFloat((m % 1).toPrecision(9)) * 1e9), F = "", r = 0; r < 6 && (n =
    r < 3 ? 0 : 1, o = e[n], r !== 3 && r !== 0 && (o = o % et[r - 1]), r === 2 && (o += e[1] / 1e9), h = o / et[r], !(h >= 1 && (t && (h = Math.
    floor(h)), D ? c = h.toString() : (f = h >= 10 ? 0 : 2, c = h.toFixed(f)), c.indexOf(".") > -1 && c[c.length - 1] === "0" && (c = c.replace(
    /\.?0+$/, "")), F && (F += " "), F += c, t ? (F += " " + dD[r], c !== "1" && (F += "s")) : F += " " + pD[r], !t))); r++)
      ;
    return F;
  };
});

// src/node-logger/index.ts
var vD = {};
Ie(vD, {
  colors: () => Te,
  deprecate: () => mD,
  instance: () => B.default,
  logger: () => rt,
  once: () => A
});
module.exports = qe(vD);
var B = Oe(ju(), 1), Dt = Oe(tt(), 1);
B.default.stream = process.stdout;
function L(e) {
  if (!/^#?[0-9A-Fa-f]{6}$/.test(e))
    throw new Error("Invalid hex color. It must be a 6-character hex code.");
  e.startsWith("#") && (e = e.slice(1));
  let u = parseInt(e.slice(0, 2), 16), t = parseInt(e.slice(2, 4), 16), D = parseInt(e.slice(4, 6), 16);
  return (r) => `\x1B[38;2;${u};${t};${D}m${r}\x1B[39m`;
}
i(L, "hex");
var Te = {
  pink: L("#F1618C"),
  purple: L("#B57EE5"),
  orange: L("#F3AD38"),
  green: L("#A2E05E"),
  blue: L("#6DABF5"),
  red: L("#F16161"),
  gray: L("#B8C2CC")
}, rt = {
  verbose: /* @__PURE__ */ i((e) => B.default.verbose("", e), "verbose"),
  info: /* @__PURE__ */ i((e) => B.default.info("", e), "info"),
  plain: /* @__PURE__ */ i((e) => console.log(e), "plain"),
  line: /* @__PURE__ */ i((e = 1) => console.log(`${Array(e - 1).fill(`
`)}`), "line"),
  warn: /* @__PURE__ */ i((e) => B.default.warn("", e), "warn"),
  trace: /* @__PURE__ */ i(({ message: e, time: u }) => B.default.info("", `${e} (${Te.purple((0, Dt.default)(u))})`), "trace"),
  setLevel: /* @__PURE__ */ i((e = "info") => {
    B.default.level = e;
  }, "setLevel"),
  error: /* @__PURE__ */ i((e) => {
    if (B.default.levels[B.default.level] < B.default.levels.error) {
      let u;
      e instanceof Error && e.stack ? u = e.stack.toString() : u = e.toString(), console.log(
        u.replace(e.toString(), Te.red(e.toString())).replaceAll(process.cwd(), ".")
      );
    }
  }, "error")
};
var ke = /* @__PURE__ */ new Set(), A = /* @__PURE__ */ i((e) => (u) => {
  if (!ke.has(u))
    return ke.add(u), rt[e](u);
}, "once");
A.clear = () => ke.clear();
A.verbose = A("verbose");
A.info = A("info");
A.warn = A("warn");
A.error = A("error");
var mD = A("warn");
