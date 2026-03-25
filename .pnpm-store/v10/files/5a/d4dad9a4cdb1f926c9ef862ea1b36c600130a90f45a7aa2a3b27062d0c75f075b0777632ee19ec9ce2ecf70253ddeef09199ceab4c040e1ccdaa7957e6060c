import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  require_picocolors
} from "./chunk-LE232J7F.js";
import {
  __commonJS,
  __export,
  __require,
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/are-we-there-yet/lib/tracker-base.js
var require_tracker_base = __commonJS({
  "../node_modules/are-we-there-yet/lib/tracker-base.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events"), trackerId = 0, TrackerBase = class extends EventEmitter {
      constructor(name) {
        super(), this.id = ++trackerId, this.name = name;
      }
    };
    module.exports = TrackerBase;
  }
});

// ../node_modules/are-we-there-yet/lib/tracker.js
var require_tracker = __commonJS({
  "../node_modules/are-we-there-yet/lib/tracker.js"(exports, module) {
    "use strict";
    var TrackerBase = require_tracker_base(), Tracker = class extends TrackerBase {
      constructor(name, todo) {
        super(name), this.workDone = 0, this.workTodo = todo || 0;
      }
      completed() {
        return this.workTodo === 0 ? 0 : this.workDone / this.workTodo;
      }
      addWork(work) {
        this.workTodo += work, this.emit("change", this.name, this.completed(), this);
      }
      completeWork(work) {
        this.workDone += work, this.workDone > this.workTodo && (this.workDone = this.workTodo), this.emit("change", this.name, this.completed(), this);
      }
      finish() {
        this.workTodo = this.workDone = 1, this.emit("change", this.name, 1, this);
      }
    };
    module.exports = Tracker;
  }
});

// ../node_modules/are-we-there-yet/lib/tracker-stream.js
var require_tracker_stream = __commonJS({
  "../node_modules/are-we-there-yet/lib/tracker-stream.js"(exports, module) {
    "use strict";
    var stream = __require("stream"), Tracker = require_tracker(), TrackerStream = class extends stream.Transform {
      constructor(name, size, options) {
        super(options), this.tracker = new Tracker(name, size), this.name = name, this.id = this.tracker.id, this.tracker.on("change", this.trackerChange.bind(this));
      }
      trackerChange(name, completion) {
        this.emit("change", name, completion, this);
      }
      _transform(data, encoding, cb) {
        this.tracker.completeWork(data.length ? data.length : 1), this.push(data), cb();
      }
      _flush(cb) {
        this.tracker.finish(), cb();
      }
      completed() {
        return this.tracker.completed();
      }
      addWork(work) {
        return this.tracker.addWork(work);
      }
      finish() {
        return this.tracker.finish();
      }
    };
    module.exports = TrackerStream;
  }
});

// ../node_modules/are-we-there-yet/lib/tracker-group.js
var require_tracker_group = __commonJS({
  "../node_modules/are-we-there-yet/lib/tracker-group.js"(exports, module) {
    "use strict";
    var TrackerBase = require_tracker_base(), Tracker = require_tracker(), TrackerStream = require_tracker_stream(), TrackerGroup = class _TrackerGroup extends TrackerBase {
      parentGroup = null;
      trackers = [];
      completion = {};
      weight = {};
      totalWeight = 0;
      finished = !1;
      bubbleChange = bubbleChange(this);
      nameInTree() {
        for (var names = [], from = this; from; )
          names.unshift(from.name), from = from.parentGroup;
        return names.join("/");
      }
      addUnit(unit, weight) {
        if (unit.addUnit) {
          for (var toTest = this; toTest; ) {
            if (unit === toTest)
              throw new Error(
                "Attempted to add tracker group " + unit.name + " to tree that already includes it " + this.nameInTree(this)
              );
            toTest = toTest.parentGroup;
          }
          unit.parentGroup = this;
        }
        return this.weight[unit.id] = weight || 1, this.totalWeight += this.weight[unit.id], this.trackers.push(unit), this.completion[unit.id] = unit.completed(), unit.on("change", this.bubbleChange), this.finished || this.emit("change", unit.name, this.completion[unit.id], unit), unit;
      }
      completed() {
        if (this.trackers.length === 0)
          return 0;
        for (var valPerWeight = 1 / this.totalWeight, completed = 0, ii = 0; ii < this.trackers.length; ii++) {
          var trackerId = this.trackers[ii].id;
          completed += valPerWeight * this.weight[trackerId] * this.completion[trackerId];
        }
        return completed;
      }
      newGroup(name, weight) {
        return this.addUnit(new _TrackerGroup(name), weight);
      }
      newItem(name, todo, weight) {
        return this.addUnit(new Tracker(name, todo), weight);
      }
      newStream(name, todo, weight) {
        return this.addUnit(new TrackerStream(name, todo), weight);
      }
      finish() {
        this.finished = !0, this.trackers.length || this.addUnit(new Tracker(), 1, !0);
        for (var ii = 0; ii < this.trackers.length; ii++) {
          var tracker = this.trackers[ii];
          tracker.finish(), tracker.removeListener("change", this.bubbleChange);
        }
        this.emit("change", this.name, 1, this);
      }
      debug(depth = 0) {
        let indent = " ".repeat(depth), output = `${indent}${this.name || "top"}: ${this.completed()}
`;
        return this.trackers.forEach(function(tracker) {
          output += tracker instanceof _TrackerGroup ? tracker.debug(depth + 1) : `${indent} ${tracker.name}: ${tracker.completed()}
`;
        }), output;
      }
    };
    function bubbleChange(trackerGroup) {
      return function(name, completed, tracker) {
        trackerGroup.completion[tracker.id] = completed, !trackerGroup.finished && trackerGroup.emit("change", name || trackerGroup.name, trackerGroup.completed(), trackerGroup);
      };
    }
    module.exports = TrackerGroup;
  }
});

// ../node_modules/are-we-there-yet/lib/index.js
var require_lib = __commonJS({
  "../node_modules/are-we-there-yet/lib/index.js"(exports) {
    "use strict";
    exports.TrackerGroup = require_tracker_group();
    exports.Tracker = require_tracker();
    exports.TrackerStream = require_tracker_stream();
  }
});

// ../node_modules/console-control-strings/index.js
var require_console_control_strings = __commonJS({
  "../node_modules/console-control-strings/index.js"(exports) {
    "use strict";
    var prefix = "\x1B[";
    exports.up = function(num) {
      return prefix + (num || "") + "A";
    };
    exports.down = function(num) {
      return prefix + (num || "") + "B";
    };
    exports.forward = function(num) {
      return prefix + (num || "") + "C";
    };
    exports.back = function(num) {
      return prefix + (num || "") + "D";
    };
    exports.nextLine = function(num) {
      return prefix + (num || "") + "E";
    };
    exports.previousLine = function(num) {
      return prefix + (num || "") + "F";
    };
    exports.horizontalAbsolute = function(num) {
      if (num == null) throw new Error("horizontalAboslute requires a column to position to");
      return prefix + num + "G";
    };
    exports.eraseData = function() {
      return prefix + "J";
    };
    exports.eraseLine = function() {
      return prefix + "K";
    };
    exports.goto = function(x3, y2) {
      return prefix + y2 + ";" + x3 + "H";
    };
    exports.gotoSOL = function() {
      return "\r";
    };
    exports.beep = function() {
      return "\x07";
    };
    exports.hideCursor = function() {
      return prefix + "?25l";
    };
    exports.showCursor = function() {
      return prefix + "?25h";
    };
    var colors2 = {
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
    exports.color = function(colorWith) {
      return (arguments.length !== 1 || !Array.isArray(colorWith)) && (colorWith = Array.prototype.slice.call(arguments)), prefix + colorWith.map(colorNameToCode).join(";") + "m";
    };
    function colorNameToCode(color) {
      if (colors2[color] != null) return colors2[color];
      throw new Error("Unknown color or style name: " + color);
    }
  }
});

// ../node_modules/string-width/node_modules/ansi-regex/index.js
var require_ansi_regex = __commonJS({
  "../node_modules/string-width/node_modules/ansi-regex/index.js"(exports, module) {
    "use strict";
    module.exports = ({ onlyFirst = !1 } = {}) => {
      let pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|");
      return new RegExp(pattern, onlyFirst ? void 0 : "g");
    };
  }
});

// ../node_modules/string-width/node_modules/strip-ansi/index.js
var require_strip_ansi = __commonJS({
  "../node_modules/string-width/node_modules/strip-ansi/index.js"(exports, module) {
    "use strict";
    var ansiRegex2 = require_ansi_regex();
    module.exports = (string) => typeof string == "string" ? string.replace(ansiRegex2(), "") : string;
  }
});

// ../node_modules/is-fullwidth-code-point/index.js
var require_is_fullwidth_code_point = __commonJS({
  "../node_modules/is-fullwidth-code-point/index.js"(exports, module) {
    "use strict";
    var isFullwidthCodePoint = (codePoint) => Number.isNaN(codePoint) ? !1 : codePoint >= 4352 && (codePoint <= 4447 || // Hangul Jamo
    codePoint === 9001 || // LEFT-POINTING ANGLE BRACKET
    codePoint === 9002 || // RIGHT-POINTING ANGLE BRACKET
    // CJK Radicals Supplement .. Enclosed CJK Letters and Months
    11904 <= codePoint && codePoint <= 12871 && codePoint !== 12351 || // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
    12880 <= codePoint && codePoint <= 19903 || // CJK Unified Ideographs .. Yi Radicals
    19968 <= codePoint && codePoint <= 42182 || // Hangul Jamo Extended-A
    43360 <= codePoint && codePoint <= 43388 || // Hangul Syllables
    44032 <= codePoint && codePoint <= 55203 || // CJK Compatibility Ideographs
    63744 <= codePoint && codePoint <= 64255 || // Vertical Forms
    65040 <= codePoint && codePoint <= 65049 || // CJK Compatibility Forms .. Small Form Variants
    65072 <= codePoint && codePoint <= 65131 || // Halfwidth and Fullwidth Forms
    65281 <= codePoint && codePoint <= 65376 || 65504 <= codePoint && codePoint <= 65510 || // Kana Supplement
    110592 <= codePoint && codePoint <= 110593 || // Enclosed Ideographic Supplement
    127488 <= codePoint && codePoint <= 127569 || // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
    131072 <= codePoint && codePoint <= 262141);
    module.exports = isFullwidthCodePoint;
    module.exports.default = isFullwidthCodePoint;
  }
});

// ../node_modules/string-width/node_modules/emoji-regex/index.js
var require_emoji_regex = __commonJS({
  "../node_modules/string-width/node_modules/emoji-regex/index.js"(exports, module) {
    "use strict";
    module.exports = function() {
      return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
    };
  }
});

// ../node_modules/string-width/index.js
var require_string_width = __commonJS({
  "../node_modules/string-width/index.js"(exports, module) {
    "use strict";
    var stripAnsi3 = require_strip_ansi(), isFullwidthCodePoint = require_is_fullwidth_code_point(), emojiRegex2 = require_emoji_regex(), stringWidth2 = (string) => {
      if (typeof string != "string" || string.length === 0 || (string = stripAnsi3(string), string.length === 0))
        return 0;
      string = string.replace(emojiRegex2(), "  ");
      let width = 0;
      for (let i = 0; i < string.length; i++) {
        let code = string.codePointAt(i);
        code <= 31 || code >= 127 && code <= 159 || code >= 768 && code <= 879 || (code > 65535 && i++, width += isFullwidthCodePoint(code) ? 2 : 1);
      }
      return width;
    };
    module.exports = stringWidth2;
    module.exports.default = stringWidth2;
  }
});

// ../node_modules/wide-align/align.js
var require_align = __commonJS({
  "../node_modules/wide-align/align.js"(exports) {
    "use strict";
    var stringWidth2 = require_string_width();
    exports.center = alignCenter;
    exports.left = alignLeft;
    exports.right = alignRight;
    function createPadding(width) {
      var result = "", string = " ", n = width;
      do
        n % 2 && (result += string), n = Math.floor(n / 2), string += string;
      while (n);
      return result;
    }
    function alignLeft(str, width) {
      var trimmed = str.trimRight();
      if (trimmed.length === 0 && str.length >= width) return str;
      var padding = "", strWidth = stringWidth2(trimmed);
      return strWidth < width && (padding = createPadding(width - strWidth)), trimmed + padding;
    }
    function alignRight(str, width) {
      var trimmed = str.trimLeft();
      if (trimmed.length === 0 && str.length >= width) return str;
      var padding = "", strWidth = stringWidth2(trimmed);
      return strWidth < width && (padding = createPadding(width - strWidth)), padding + trimmed;
    }
    function alignCenter(str, width) {
      var trimmed = str.trim();
      if (trimmed.length === 0 && str.length >= width) return str;
      var padLeft = "", padRight = "", strWidth = stringWidth2(trimmed);
      if (strWidth < width) {
        var padLeftBy = parseInt((width - strWidth) / 2, 10);
        padLeft = createPadding(padLeftBy), padRight = createPadding(width - (strWidth + padLeftBy));
      }
      return padLeft + trimmed + padRight;
    }
  }
});

// ../node_modules/aproba/index.js
var require_aproba = __commonJS({
  "../node_modules/aproba/index.js"(exports, module) {
    "use strict";
    module.exports = validate;
    function isArguments(thingy) {
      return thingy != null && typeof thingy == "object" && thingy.hasOwnProperty("callee");
    }
    var types = {
      "*": { label: "any", check: () => !0 },
      A: { label: "array", check: (_2) => Array.isArray(_2) || isArguments(_2) },
      S: { label: "string", check: (_2) => typeof _2 == "string" },
      N: { label: "number", check: (_2) => typeof _2 == "number" },
      F: { label: "function", check: (_2) => typeof _2 == "function" },
      O: { label: "object", check: (_2) => typeof _2 == "object" && _2 != null && !types.A.check(_2) && !types.E.check(_2) },
      B: { label: "boolean", check: (_2) => typeof _2 == "boolean" },
      E: { label: "error", check: (_2) => _2 instanceof Error },
      Z: { label: "null", check: (_2) => _2 == null }
    };
    function addSchema(schema, arity) {
      let group = arity[schema.length] = arity[schema.length] || [];
      group.indexOf(schema) === -1 && group.push(schema);
    }
    function validate(rawSchemas, args) {
      if (arguments.length !== 2) throw wrongNumberOfArgs(["SA"], arguments.length);
      if (!rawSchemas) throw missingRequiredArg(0, "rawSchemas");
      if (!args) throw missingRequiredArg(1, "args");
      if (!types.S.check(rawSchemas)) throw invalidType(0, ["string"], rawSchemas);
      if (!types.A.check(args)) throw invalidType(1, ["array"], args);
      let schemas = rawSchemas.split("|"), arity = {};
      schemas.forEach((schema) => {
        for (let ii = 0; ii < schema.length; ++ii) {
          let type = schema[ii];
          if (!types[type]) throw unknownType(ii, type);
        }
        if (/E.*E/.test(schema)) throw moreThanOneError(schema);
        addSchema(schema, arity), /E/.test(schema) && (addSchema(schema.replace(/E.*$/, "E"), arity), addSchema(schema.replace(/E/, "Z"), arity), schema.length === 1 && addSchema("", arity));
      });
      let matching = arity[args.length];
      if (!matching)
        throw wrongNumberOfArgs(Object.keys(arity), args.length);
      for (let ii = 0; ii < args.length; ++ii) {
        let newMatching = matching.filter((schema) => {
          let type = schema[ii], typeCheck = types[type].check;
          return typeCheck(args[ii]);
        });
        if (!newMatching.length) {
          let labels = matching.map((_2) => types[_2[ii]].label).filter((_2) => _2 != null);
          throw invalidType(ii, labels, args[ii]);
        }
        matching = newMatching;
      }
    }
    function missingRequiredArg(num) {
      return newException("EMISSINGARG", "Missing required argument #" + (num + 1));
    }
    function unknownType(num, type) {
      return newException("EUNKNOWNTYPE", "Unknown type " + type + " in argument #" + (num + 1));
    }
    function invalidType(num, expectedTypes, value) {
      let valueType;
      return Object.keys(types).forEach((typeCode) => {
        types[typeCode].check(value) && (valueType = types[typeCode].label);
      }), newException("EINVALIDTYPE", "Argument #" + (num + 1) + ": Expected " + englishList(expectedTypes) + " but got " + valueType);
    }
    function englishList(list) {
      return list.join(", ").replace(/, ([^,]+)$/, " or $1");
    }
    function wrongNumberOfArgs(expected, got) {
      let english = englishList(expected), args = expected.every((ex) => ex.length === 1) ? "argument" : "arguments";
      return newException("EWRONGARGCOUNT", "Expected " + english + " " + args + " but got " + got);
    }
    function moreThanOneError(schema) {
      return newException(
        "ETOOMANYERRORTYPES",
        'Only one error type per argument signature is allowed, more than one found in "' + schema + '"'
      );
    }
    function newException(code, msg) {
      let err = new TypeError(msg);
      return err.code = code, Error.captureStackTrace && Error.captureStackTrace(err, validate), err;
    }
  }
});

// ../node_modules/gauge/node_modules/ansi-regex/index.js
var require_ansi_regex2 = __commonJS({
  "../node_modules/gauge/node_modules/ansi-regex/index.js"(exports, module) {
    "use strict";
    module.exports = ({ onlyFirst = !1 } = {}) => {
      let pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|");
      return new RegExp(pattern, onlyFirst ? void 0 : "g");
    };
  }
});

// ../node_modules/gauge/node_modules/strip-ansi/index.js
var require_strip_ansi2 = __commonJS({
  "../node_modules/gauge/node_modules/strip-ansi/index.js"(exports, module) {
    "use strict";
    var ansiRegex2 = require_ansi_regex2();
    module.exports = (string) => typeof string == "string" ? string.replace(ansiRegex2(), "") : string;
  }
});

// ../node_modules/gauge/lib/wide-truncate.js
var require_wide_truncate = __commonJS({
  "../node_modules/gauge/lib/wide-truncate.js"(exports, module) {
    "use strict";
    var stringWidth2 = require_string_width(), stripAnsi3 = require_strip_ansi2();
    module.exports = wideTruncate;
    function wideTruncate(str, target) {
      if (stringWidth2(str) === 0)
        return str;
      if (target <= 0)
        return "";
      if (stringWidth2(str) <= target)
        return str;
      for (var noAnsi = stripAnsi3(str), ansiSize = str.length + noAnsi.length, truncated = str.slice(0, target + ansiSize); stringWidth2(truncated) > target; )
        truncated = truncated.slice(0, -1);
      return truncated;
    }
  }
});

// ../node_modules/gauge/lib/error.js
var require_error = __commonJS({
  "../node_modules/gauge/lib/error.js"(exports) {
    "use strict";
    var util = __require("util"), User = exports.User = function User2(msg) {
      var err = new Error(msg);
      return Error.captureStackTrace(err, User2), err.code = "EGAUGE", err;
    };
    exports.MissingTemplateValue = function MissingTemplateValue(item, values) {
      var err = new User(util.format('Missing template value "%s"', item.type));
      return Error.captureStackTrace(err, MissingTemplateValue), err.template = item, err.values = values, err;
    };
    exports.Internal = function Internal(msg) {
      var err = new Error(msg);
      return Error.captureStackTrace(err, Internal), err.code = "EGAUGEINTERNAL", err;
    };
  }
});

// ../node_modules/gauge/lib/template-item.js
var require_template_item = __commonJS({
  "../node_modules/gauge/lib/template-item.js"(exports, module) {
    "use strict";
    var stringWidth2 = require_string_width();
    module.exports = TemplateItem;
    function isPercent(num) {
      return typeof num != "string" ? !1 : num.slice(-1) === "%";
    }
    function percent(num) {
      return Number(num.slice(0, -1)) / 100;
    }
    function TemplateItem(values, outputLength) {
      if (this.overallOutputLength = outputLength, this.finished = !1, this.type = null, this.value = null, this.length = null, this.maxLength = null, this.minLength = null, this.kerning = null, this.align = "left", this.padLeft = 0, this.padRight = 0, this.index = null, this.first = null, this.last = null, typeof values == "string")
        this.value = values;
      else
        for (var prop in values)
          this[prop] = values[prop];
      return isPercent(this.length) && (this.length = Math.round(this.overallOutputLength * percent(this.length))), isPercent(this.minLength) && (this.minLength = Math.round(this.overallOutputLength * percent(this.minLength))), isPercent(this.maxLength) && (this.maxLength = Math.round(this.overallOutputLength * percent(this.maxLength))), this;
    }
    TemplateItem.prototype = {};
    TemplateItem.prototype.getBaseLength = function() {
      var length = this.length;
      return length == null && typeof this.value == "string" && this.maxLength == null && this.minLength == null && (length = stringWidth2(this.value)), length;
    };
    TemplateItem.prototype.getLength = function() {
      var length = this.getBaseLength();
      return length == null ? null : length + this.padLeft + this.padRight;
    };
    TemplateItem.prototype.getMaxLength = function() {
      return this.maxLength == null ? null : this.maxLength + this.padLeft + this.padRight;
    };
    TemplateItem.prototype.getMinLength = function() {
      return this.minLength == null ? null : this.minLength + this.padLeft + this.padRight;
    };
  }
});

// ../node_modules/gauge/lib/render-template.js
var require_render_template = __commonJS({
  "../node_modules/gauge/lib/render-template.js"(exports, module) {
    "use strict";
    var align = require_align(), validate = require_aproba(), wideTruncate = require_wide_truncate(), error2 = require_error(), TemplateItem = require_template_item();
    function renderValueWithValues(values) {
      return function(item) {
        return renderValue(item, values);
      };
    }
    var renderTemplate = module.exports = function(width, template, values) {
      var items = prepareItems(width, template, values), rendered = items.map(renderValueWithValues(values)).join("");
      return align.left(wideTruncate(rendered, width), width);
    };
    function preType(item) {
      var cappedTypeName = item.type[0].toUpperCase() + item.type.slice(1);
      return "pre" + cappedTypeName;
    }
    function postType(item) {
      var cappedTypeName = item.type[0].toUpperCase() + item.type.slice(1);
      return "post" + cappedTypeName;
    }
    function hasPreOrPost(item, values) {
      if (item.type)
        return values[preType(item)] || values[postType(item)];
    }
    function generatePreAndPost(baseItem, parentValues) {
      var item = Object.assign({}, baseItem), values = Object.create(parentValues), template = [], pre = preType(item), post = postType(item);
      return values[pre] && (template.push({ value: values[pre] }), values[pre] = null), item.minLength = null, item.length = null, item.maxLength = null, template.push(item), values[item.type] = values[item.type], values[post] && (template.push({ value: values[post] }), values[post] = null), function($1, $2, length) {
        return renderTemplate(length, template, values);
      };
    }
    function prepareItems(width, template, values) {
      function cloneAndObjectify(item, index, arr) {
        var cloned = new TemplateItem(item, width), type = cloned.type;
        if (cloned.value == null)
          if (type in values)
            cloned.value = values[type];
          else {
            if (cloned.default == null)
              throw new error2.MissingTemplateValue(cloned, values);
            cloned.value = cloned.default;
          }
        return cloned.value == null || cloned.value === "" ? null : (cloned.index = index, cloned.first = index === 0, cloned.last = index === arr.length - 1, hasPreOrPost(cloned, values) && (cloned.value = generatePreAndPost(cloned, values)), cloned);
      }
      var output = template.map(cloneAndObjectify).filter(function(item) {
        return item != null;
      }), remainingSpace = width, variableCount = output.length;
      function consumeSpace(length) {
        length > remainingSpace && (length = remainingSpace), remainingSpace -= length;
      }
      function finishSizing(item, length) {
        if (item.finished)
          throw new error2.Internal("Tried to finish template item that was already finished");
        if (length === 1 / 0)
          throw new error2.Internal("Length of template item cannot be infinity");
        if (length != null && (item.length = length), item.minLength = null, item.maxLength = null, --variableCount, item.finished = !0, item.length == null && (item.length = item.getBaseLength()), item.length == null)
          throw new error2.Internal("Finished template items must have a length");
        consumeSpace(item.getLength());
      }
      output.forEach(function(item) {
        if (item.kerning) {
          var prevPadRight = item.first ? 0 : output[item.index - 1].padRight;
          !item.first && prevPadRight < item.kerning && (item.padLeft = item.kerning - prevPadRight), item.last || (item.padRight = item.kerning);
        }
      }), output.forEach(function(item) {
        item.getBaseLength() != null && finishSizing(item);
      });
      var resized = 0, resizing, hunkSize;
      do
        resizing = !1, hunkSize = Math.round(remainingSpace / variableCount), output.forEach(function(item) {
          item.finished || item.maxLength && item.getMaxLength() < hunkSize && (finishSizing(item, item.maxLength), resizing = !0);
        });
      while (resizing && resized++ < output.length);
      if (resizing)
        throw new error2.Internal("Resize loop iterated too many times while determining maxLength");
      resized = 0;
      do
        resizing = !1, hunkSize = Math.round(remainingSpace / variableCount), output.forEach(function(item) {
          item.finished || item.minLength && item.getMinLength() >= hunkSize && (finishSizing(item, item.minLength), resizing = !0);
        });
      while (resizing && resized++ < output.length);
      if (resizing)
        throw new error2.Internal("Resize loop iterated too many times while determining minLength");
      return hunkSize = Math.round(remainingSpace / variableCount), output.forEach(function(item) {
        item.finished || finishSizing(item, hunkSize);
      }), output;
    }
    function renderFunction(item, values, length) {
      return validate("OON", arguments), item.type ? item.value(values, values[item.type + "Theme"] || {}, length) : item.value(values, {}, length);
    }
    function renderValue(item, values) {
      var length = item.getBaseLength(), value = typeof item.value == "function" ? renderFunction(item, values, length) : item.value;
      if (value == null || value === "")
        return "";
      var alignWith = align[item.align] || align.left, leftPadding = item.padLeft ? align.left("", item.padLeft) : "", rightPadding = item.padRight ? align.right("", item.padRight) : "", truncated = wideTruncate(String(value), length), aligned = alignWith(truncated, length);
      return leftPadding + aligned + rightPadding;
    }
  }
});

// ../node_modules/gauge/lib/plumbing.js
var require_plumbing = __commonJS({
  "../node_modules/gauge/lib/plumbing.js"(exports, module) {
    "use strict";
    var consoleControl = require_console_control_strings(), renderTemplate = require_render_template(), validate = require_aproba(), Plumbing = module.exports = function(theme, template, width) {
      width || (width = 80), validate("OAN", [theme, template, width]), this.showing = !1, this.theme = theme, this.width = width, this.template = template;
    };
    Plumbing.prototype = {};
    Plumbing.prototype.setTheme = function(theme) {
      validate("O", [theme]), this.theme = theme;
    };
    Plumbing.prototype.setTemplate = function(template) {
      validate("A", [template]), this.template = template;
    };
    Plumbing.prototype.setWidth = function(width) {
      validate("N", [width]), this.width = width;
    };
    Plumbing.prototype.hide = function() {
      return consoleControl.gotoSOL() + consoleControl.eraseLine();
    };
    Plumbing.prototype.hideCursor = consoleControl.hideCursor;
    Plumbing.prototype.showCursor = consoleControl.showCursor;
    Plumbing.prototype.show = function(status) {
      var values = Object.create(this.theme);
      for (var key in status)
        values[key] = status[key];
      return renderTemplate(this.width, this.template, values).trim() + consoleControl.color("reset") + consoleControl.eraseLine() + consoleControl.gotoSOL();
    };
  }
});

// ../node_modules/has-unicode/index.js
var require_has_unicode = __commonJS({
  "../node_modules/has-unicode/index.js"(exports, module) {
    "use strict";
    var os = __require("os"), hasUnicode = module.exports = function() {
      if (os.type() == "Windows_NT")
        return !1;
      var isUTF8 = /UTF-?8$/i, ctype = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG;
      return isUTF8.test(ctype);
    };
  }
});

// ../node_modules/color-support/index.js
var require_color_support = __commonJS({
  "../node_modules/color-support/index.js"(exports, module) {
    module.exports = colorSupport({ alwaysReturn: !0 }, colorSupport);
    function hasNone(obj, options) {
      return obj.level = 0, obj.hasBasic = !1, obj.has256 = !1, obj.has16m = !1, options.alwaysReturn ? obj : !1;
    }
    function hasBasic(obj) {
      return obj.hasBasic = !0, obj.has256 = !1, obj.has16m = !1, obj.level = 1, obj;
    }
    function has256(obj) {
      return obj.hasBasic = !0, obj.has256 = !0, obj.has16m = !1, obj.level = 2, obj;
    }
    function has16m(obj) {
      return obj.hasBasic = !0, obj.has256 = !0, obj.has16m = !0, obj.level = 3, obj;
    }
    function colorSupport(options, obj) {
      if (options = options || {}, obj = obj || {}, typeof options.level == "number")
        switch (options.level) {
          case 0:
            return hasNone(obj, options);
          case 1:
            return hasBasic(obj);
          case 2:
            return has256(obj);
          case 3:
            return has16m(obj);
        }
      if (obj.level = 0, obj.hasBasic = !1, obj.has256 = !1, obj.has16m = !1, typeof process > "u" || !process || !process.stdout || !process.env || !process.platform)
        return hasNone(obj, options);
      var env = options.env || process.env, stream = options.stream || process.stdout, term = options.term || env.TERM || "", platform = options.platform || process.platform;
      if (!options.ignoreTTY && !stream.isTTY || !options.ignoreDumb && term === "dumb" && !env.COLORTERM)
        return hasNone(obj, options);
      if (platform === "win32")
        return hasBasic(obj);
      if (env.TMUX)
        return has256(obj);
      if (!options.ignoreCI && (env.CI || env.TEAMCITY_VERSION))
        return env.TRAVIS ? has256(obj) : hasNone(obj, options);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          var ver = env.TERM_PROGRAM_VERSION || "0.";
          return /^[0-2]\./.test(ver) ? has256(obj) : has16m(obj);
        case "HyperTerm":
        case "Hyper":
          return has16m(obj);
        case "MacTerm":
          return has16m(obj);
        case "Apple_Terminal":
          return has256(obj);
      }
      return /^xterm-256/.test(term) ? has256(obj) : /^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(term) || env.COLORTERM ? hasBasic(obj) : hasNone(obj, options);
    }
  }
});

// ../node_modules/gauge/lib/has-color.js
var require_has_color = __commonJS({
  "../node_modules/gauge/lib/has-color.js"(exports, module) {
    "use strict";
    var colorSupport = require_color_support();
    module.exports = colorSupport().hasBasic;
  }
});

// ../node_modules/gauge/node_modules/signal-exit/dist/cjs/signals.js
var require_signals = __commonJS({
  "../node_modules/gauge/node_modules/signal-exit/dist/cjs/signals.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.signals = void 0;
    exports.signals = [];
    exports.signals.push("SIGHUP", "SIGINT", "SIGTERM");
    process.platform !== "win32" && exports.signals.push(
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
    process.platform === "linux" && exports.signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
  }
});

// ../node_modules/gauge/node_modules/signal-exit/dist/cjs/index.js
var require_cjs = __commonJS({
  "../node_modules/gauge/node_modules/signal-exit/dist/cjs/index.js"(exports) {
    "use strict";
    var _a;
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.unload = exports.load = exports.onExit = exports.signals = void 0;
    var signals_js_1 = require_signals();
    Object.defineProperty(exports, "signals", { enumerable: !0, get: function() {
      return signals_js_1.signals;
    } });
    var processOk = (process3) => !!process3 && typeof process3 == "object" && typeof process3.removeListener == "function" && typeof process3.emit == "function" && typeof process3.reallyExit == "function" && typeof process3.listeners == "function" && typeof process3.kill == "function" && typeof process3.pid == "number" && typeof process3.on == "function", kExitEmitter = Symbol.for("signal-exit emitter"), global = globalThis, ObjectDefineProperty = Object.defineProperty.bind(Object), Emitter = class {
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
        if (global[kExitEmitter])
          return global[kExitEmitter];
        ObjectDefineProperty(global, kExitEmitter, {
          value: this,
          writable: !1,
          enumerable: !1,
          configurable: !1
        });
      }
      on(ev, fn) {
        this.listeners[ev].push(fn);
      }
      removeListener(ev, fn) {
        let list = this.listeners[ev], i = list.indexOf(fn);
        i !== -1 && (i === 0 && list.length === 1 ? list.length = 0 : list.splice(i, 1));
      }
      emit(ev, code, signal) {
        if (this.emitted[ev])
          return !1;
        this.emitted[ev] = !0;
        let ret = !1;
        for (let fn of this.listeners[ev])
          ret = fn(code, signal) === !0 || ret;
        return ev === "exit" && (ret = this.emit("afterExit", code, signal) || ret), ret;
      }
    }, SignalExitBase = class {
    }, signalExitWrap = (handler) => ({
      onExit(cb, opts) {
        return handler.onExit(cb, opts);
      },
      load() {
        return handler.load();
      },
      unload() {
        return handler.unload();
      }
    }), SignalExitFallback = class extends SignalExitBase {
      onExit() {
        return () => {
        };
      }
      load() {
      }
      unload() {
      }
    }, SignalExit = class extends SignalExitBase {
      // "SIGHUP" throws an `ENOSYS` error on Windows,
      // so use a supported signal instead
      /* c8 ignore start */
      #hupSig = process2.platform === "win32" ? "SIGINT" : "SIGHUP";
      /* c8 ignore stop */
      #emitter = new Emitter();
      #process;
      #originalProcessEmit;
      #originalProcessReallyExit;
      #sigListeners = {};
      #loaded = !1;
      constructor(process3) {
        super(), this.#process = process3, this.#sigListeners = {};
        for (let sig of signals_js_1.signals)
          this.#sigListeners[sig] = () => {
            let listeners = this.#process.listeners(sig), { count } = this.#emitter, p = process3;
            if (typeof p.__signal_exit_emitter__ == "object" && typeof p.__signal_exit_emitter__.count == "number" && (count += p.__signal_exit_emitter__.count), listeners.length === count) {
              this.unload();
              let ret = this.#emitter.emit("exit", null, sig), s = sig === "SIGHUP" ? this.#hupSig : sig;
              ret || process3.kill(process3.pid, s);
            }
          };
        this.#originalProcessReallyExit = process3.reallyExit, this.#originalProcessEmit = process3.emit;
      }
      onExit(cb, opts) {
        if (!processOk(this.#process))
          return () => {
          };
        this.#loaded === !1 && this.load();
        let ev = opts?.alwaysLast ? "afterExit" : "exit";
        return this.#emitter.on(ev, cb), () => {
          this.#emitter.removeListener(ev, cb), this.#emitter.listeners.exit.length === 0 && this.#emitter.listeners.afterExit.length === 0 && this.unload();
        };
      }
      load() {
        if (!this.#loaded) {
          this.#loaded = !0, this.#emitter.count += 1;
          for (let sig of signals_js_1.signals)
            try {
              let fn = this.#sigListeners[sig];
              fn && this.#process.on(sig, fn);
            } catch {
            }
          this.#process.emit = (ev, ...a) => this.#processEmit(ev, ...a), this.#process.reallyExit = (code) => this.#processReallyExit(code);
        }
      }
      unload() {
        this.#loaded && (this.#loaded = !1, signals_js_1.signals.forEach((sig) => {
          let listener = this.#sigListeners[sig];
          if (!listener)
            throw new Error("Listener not defined for signal: " + sig);
          try {
            this.#process.removeListener(sig, listener);
          } catch {
          }
        }), this.#process.emit = this.#originalProcessEmit, this.#process.reallyExit = this.#originalProcessReallyExit, this.#emitter.count -= 1);
      }
      #processReallyExit(code) {
        return processOk(this.#process) ? (this.#process.exitCode = code || 0, this.#emitter.emit("exit", this.#process.exitCode, null), this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode)) : 0;
      }
      #processEmit(ev, ...args) {
        let og = this.#originalProcessEmit;
        if (ev === "exit" && processOk(this.#process)) {
          typeof args[0] == "number" && (this.#process.exitCode = args[0]);
          let ret = og.call(this.#process, ev, ...args);
          return this.#emitter.emit("exit", this.#process.exitCode, null), ret;
        } else
          return og.call(this.#process, ev, ...args);
      }
    }, process2 = globalThis.process;
    _a = signalExitWrap(processOk(process2) ? new SignalExit(process2) : new SignalExitFallback()), /**
     * Called when the process is exiting, whether via signal, explicit
     * exit, or running out of stuff to do.
     *
     * If the global process object is not suitable for instrumentation,
     * then this will be a no-op.
     *
     * Returns a function that may be used to unload signal-exit.
     */
    exports.onExit = _a.onExit, /**
     * Load the listeners.  Likely you never need to call this, unless
     * doing a rather deep integration with signal-exit functionality.
     * Mostly exposed for the benefit of testing.
     *
     * @internal
     */
    exports.load = _a.load, /**
     * Unload the listeners.  Likely you never need to call this, unless
     * doing a rather deep integration with signal-exit functionality.
     * Mostly exposed for the benefit of testing.
     *
     * @internal
     */
    exports.unload = _a.unload;
  }
});

// ../node_modules/gauge/lib/spin.js
var require_spin = __commonJS({
  "../node_modules/gauge/lib/spin.js"(exports, module) {
    "use strict";
    module.exports = function(spinstr, spun) {
      return spinstr[spun % spinstr.length];
    };
  }
});

// ../node_modules/gauge/lib/progress-bar.js
var require_progress_bar = __commonJS({
  "../node_modules/gauge/lib/progress-bar.js"(exports, module) {
    "use strict";
    var validate = require_aproba(), renderTemplate = require_render_template(), wideTruncate = require_wide_truncate(), stringWidth2 = require_string_width();
    module.exports = function(theme, width, completed) {
      if (validate("ONN", [theme, width, completed]), completed < 0 && (completed = 0), completed > 1 && (completed = 1), width <= 0)
        return "";
      var sofar = Math.round(width * completed), rest = width - sofar, template = [
        { type: "complete", value: repeat(theme.complete, sofar), length: sofar },
        { type: "remaining", value: repeat(theme.remaining, rest), length: rest }
      ];
      return renderTemplate(width, template, theme);
    };
    function repeat(string, width) {
      var result = "", n = width;
      do
        n % 2 && (result += string), n = Math.floor(n / 2), string += string;
      while (n && stringWidth2(result) < width);
      return wideTruncate(result, width);
    }
  }
});

// ../node_modules/gauge/lib/base-theme.js
var require_base_theme = __commonJS({
  "../node_modules/gauge/lib/base-theme.js"(exports, module) {
    "use strict";
    var spin = require_spin(), progressBar = require_progress_bar();
    module.exports = {
      activityIndicator: function(values, theme) {
        if (values.spun != null)
          return spin(theme, values.spun);
      },
      progressbar: function(values, theme, width) {
        if (values.completed != null)
          return progressBar(theme, width, values.completed);
      }
    };
  }
});

// ../node_modules/gauge/lib/theme-set.js
var require_theme_set = __commonJS({
  "../node_modules/gauge/lib/theme-set.js"(exports, module) {
    "use strict";
    module.exports = function() {
      return ThemeSetProto.newThemeSet();
    };
    var ThemeSetProto = {};
    ThemeSetProto.baseTheme = require_base_theme();
    ThemeSetProto.newTheme = function(parent, theme) {
      return theme || (theme = parent, parent = this.baseTheme), Object.assign({}, parent, theme);
    };
    ThemeSetProto.getThemeNames = function() {
      return Object.keys(this.themes);
    };
    ThemeSetProto.addTheme = function(name, parent, theme) {
      this.themes[name] = this.newTheme(parent, theme);
    };
    ThemeSetProto.addToAllThemes = function(theme) {
      var themes = this.themes;
      Object.keys(themes).forEach(function(name) {
        Object.assign(themes[name], theme);
      }), Object.assign(this.baseTheme, theme);
    };
    ThemeSetProto.getTheme = function(name) {
      if (!this.themes[name])
        throw this.newMissingThemeError(name);
      return this.themes[name];
    };
    ThemeSetProto.setDefault = function(opts, name) {
      name == null && (name = opts, opts = {});
      var platform = opts.platform == null ? "fallback" : opts.platform, hasUnicode = !!opts.hasUnicode, hasColor = !!opts.hasColor;
      this.defaults[platform] || (this.defaults[platform] = { true: {}, false: {} }), this.defaults[platform][hasUnicode][hasColor] = name;
    };
    ThemeSetProto.getDefault = function(opts) {
      opts || (opts = {});
      var platformName = opts.platform || process.platform, platform = this.defaults[platformName] || this.defaults.fallback, hasUnicode = !!opts.hasUnicode, hasColor = !!opts.hasColor;
      if (!platform)
        throw this.newMissingDefaultThemeError(platformName, hasUnicode, hasColor);
      if (!platform[hasUnicode][hasColor]) {
        if (hasUnicode && hasColor && platform[!hasUnicode][hasColor])
          hasUnicode = !1;
        else if (hasUnicode && hasColor && platform[hasUnicode][!hasColor])
          hasColor = !1;
        else if (hasUnicode && hasColor && platform[!hasUnicode][!hasColor])
          hasUnicode = !1, hasColor = !1;
        else if (hasUnicode && !hasColor && platform[!hasUnicode][hasColor])
          hasUnicode = !1;
        else if (!hasUnicode && hasColor && platform[hasUnicode][!hasColor])
          hasColor = !1;
        else if (platform === this.defaults.fallback)
          throw this.newMissingDefaultThemeError(platformName, hasUnicode, hasColor);
      }
      return platform[hasUnicode][hasColor] ? this.getTheme(platform[hasUnicode][hasColor]) : this.getDefault(Object.assign({}, opts, { platform: "fallback" }));
    };
    ThemeSetProto.newMissingThemeError = function newMissingThemeError(name) {
      var err = new Error('Could not find a gauge theme named "' + name + '"');
      return Error.captureStackTrace.call(err, newMissingThemeError), err.theme = name, err.code = "EMISSINGTHEME", err;
    };
    ThemeSetProto.newMissingDefaultThemeError = function newMissingDefaultThemeError(platformName, hasUnicode, hasColor) {
      var err = new Error(
        `Could not find a gauge theme for your platform/unicode/color use combo:
    platform = ` + platformName + `
    hasUnicode = ` + hasUnicode + `
    hasColor = ` + hasColor
      );
      return Error.captureStackTrace.call(err, newMissingDefaultThemeError), err.platform = platformName, err.hasUnicode = hasUnicode, err.hasColor = hasColor, err.code = "EMISSINGTHEME", err;
    };
    ThemeSetProto.newThemeSet = function() {
      var themeset = function(opts) {
        return themeset.getDefault(opts);
      };
      return Object.assign(themeset, ThemeSetProto, {
        themes: Object.assign({}, this.themes),
        baseTheme: Object.assign({}, this.baseTheme),
        defaults: JSON.parse(JSON.stringify(this.defaults || {}))
      });
    };
  }
});

// ../node_modules/gauge/lib/themes.js
var require_themes = __commonJS({
  "../node_modules/gauge/lib/themes.js"(exports, module) {
    "use strict";
    var color = require_console_control_strings().color, ThemeSet = require_theme_set(), themes = module.exports = new ThemeSet();
    themes.addTheme("ASCII", {
      preProgressbar: "[",
      postProgressbar: "]",
      progressbarTheme: {
        complete: "#",
        remaining: "."
      },
      activityIndicatorTheme: "-\\|/",
      preSubsection: ">"
    });
    themes.addTheme("colorASCII", themes.getTheme("ASCII"), {
      progressbarTheme: {
        preComplete: color("bgBrightWhite", "brightWhite"),
        complete: "#",
        postComplete: color("reset"),
        preRemaining: color("bgBrightBlack", "brightBlack"),
        remaining: ".",
        postRemaining: color("reset")
      }
    });
    themes.addTheme("brailleSpinner", {
      preProgressbar: "(",
      postProgressbar: ")",
      progressbarTheme: {
        complete: "#",
        remaining: "\u2802"
      },
      activityIndicatorTheme: "\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F",
      preSubsection: ">"
    });
    themes.addTheme("colorBrailleSpinner", themes.getTheme("brailleSpinner"), {
      progressbarTheme: {
        preComplete: color("bgBrightWhite", "brightWhite"),
        complete: "#",
        postComplete: color("reset"),
        preRemaining: color("bgBrightBlack", "brightBlack"),
        remaining: "\u2802",
        postRemaining: color("reset")
      }
    });
    themes.setDefault({}, "ASCII");
    themes.setDefault({ hasColor: !0 }, "colorASCII");
    themes.setDefault({ platform: "darwin", hasUnicode: !0 }, "brailleSpinner");
    themes.setDefault({ platform: "darwin", hasUnicode: !0, hasColor: !0 }, "colorBrailleSpinner");
    themes.setDefault({ platform: "linux", hasUnicode: !0 }, "brailleSpinner");
    themes.setDefault({ platform: "linux", hasUnicode: !0, hasColor: !0 }, "colorBrailleSpinner");
  }
});

// ../node_modules/gauge/lib/set-interval.js
var require_set_interval = __commonJS({
  "../node_modules/gauge/lib/set-interval.js"(exports, module) {
    "use strict";
    module.exports = setInterval;
  }
});

// ../node_modules/gauge/lib/process.js
var require_process = __commonJS({
  "../node_modules/gauge/lib/process.js"(exports, module) {
    "use strict";
    module.exports = process;
  }
});

// ../node_modules/gauge/lib/set-immediate.js
var require_set_immediate = __commonJS({
  "../node_modules/gauge/lib/set-immediate.js"(exports, module) {
    "use strict";
    var process2 = require_process();
    try {
      module.exports = setImmediate;
    } catch {
      module.exports = process2.nextTick;
    }
  }
});

// ../node_modules/gauge/lib/index.js
var require_lib2 = __commonJS({
  "../node_modules/gauge/lib/index.js"(exports, module) {
    "use strict";
    var Plumbing = require_plumbing(), hasUnicode = require_has_unicode(), hasColor = require_has_color(), onExit = require_cjs().onExit, defaultThemes = require_themes(), setInterval2 = require_set_interval(), process2 = require_process(), setImmediate2 = require_set_immediate();
    module.exports = Gauge;
    function callWith(obj, method) {
      return function() {
        return method.call(obj);
      };
    }
    function Gauge(arg1, arg2) {
      var options, writeTo;
      arg1 && arg1.write ? (writeTo = arg1, options = arg2 || {}) : arg2 && arg2.write ? (writeTo = arg2, options = arg1 || {}) : (writeTo = process2.stderr, options = arg1 || arg2 || {}), this._status = {
        spun: 0,
        section: "",
        subsection: ""
      }, this._paused = !1, this._disabled = !0, this._showing = !1, this._onScreen = !1, this._needsRedraw = !1, this._hideCursor = options.hideCursor == null ? !0 : options.hideCursor, this._fixedFramerate = options.fixedFramerate == null ? !/^v0\.8\./.test(process2.version) : options.fixedFramerate, this._lastUpdateAt = null, this._updateInterval = options.updateInterval == null ? 50 : options.updateInterval, this._themes = options.themes || defaultThemes, this._theme = options.theme;
      var theme = this._computeTheme(options.theme), template = options.template || [
        { type: "progressbar", length: 20 },
        { type: "activityIndicator", kerning: 1, length: 1 },
        { type: "section", kerning: 1, default: "" },
        { type: "subsection", kerning: 1, default: "" }
      ];
      this.setWriteTo(writeTo, options.tty);
      var PlumbingClass = options.Plumbing || Plumbing;
      this._gauge = new PlumbingClass(theme, template, this.getWidth()), this._$$doRedraw = callWith(this, this._doRedraw), this._$$handleSizeChange = callWith(this, this._handleSizeChange), this._cleanupOnExit = options.cleanupOnExit == null || options.cleanupOnExit, this._removeOnExit = null, options.enabled || options.enabled == null && this._tty && this._tty.isTTY ? this.enable() : this.disable();
    }
    Gauge.prototype = {};
    Gauge.prototype.isEnabled = function() {
      return !this._disabled;
    };
    Gauge.prototype.setTemplate = function(template) {
      this._gauge.setTemplate(template), this._showing && this._requestRedraw();
    };
    Gauge.prototype._computeTheme = function(theme) {
      if (theme || (theme = {}), typeof theme == "string")
        theme = this._themes.getTheme(theme);
      else if (Object.keys(theme).length === 0 || theme.hasUnicode != null || theme.hasColor != null) {
        var useUnicode = theme.hasUnicode == null ? hasUnicode() : theme.hasUnicode, useColor = theme.hasColor == null ? hasColor : theme.hasColor;
        theme = this._themes.getDefault({
          hasUnicode: useUnicode,
          hasColor: useColor,
          platform: theme.platform
        });
      }
      return theme;
    };
    Gauge.prototype.setThemeset = function(themes) {
      this._themes = themes, this.setTheme(this._theme);
    };
    Gauge.prototype.setTheme = function(theme) {
      this._gauge.setTheme(this._computeTheme(theme)), this._showing && this._requestRedraw(), this._theme = theme;
    };
    Gauge.prototype._requestRedraw = function() {
      this._needsRedraw = !0, this._fixedFramerate || this._doRedraw();
    };
    Gauge.prototype.getWidth = function() {
      return (this._tty && this._tty.columns || 80) - 1;
    };
    Gauge.prototype.setWriteTo = function(writeTo, tty) {
      var enabled = !this._disabled;
      enabled && this.disable(), this._writeTo = writeTo, this._tty = tty || writeTo === process2.stderr && process2.stdout.isTTY && process2.stdout || writeTo.isTTY && writeTo || this._tty, this._gauge && this._gauge.setWidth(this.getWidth()), enabled && this.enable();
    };
    Gauge.prototype.enable = function() {
      this._disabled && (this._disabled = !1, this._tty && this._enableEvents(), this._showing && this.show());
    };
    Gauge.prototype.disable = function() {
      this._disabled || (this._showing && (this._lastUpdateAt = null, this._showing = !1, this._doRedraw(), this._showing = !0), this._disabled = !0, this._tty && this._disableEvents());
    };
    Gauge.prototype._enableEvents = function() {
      this._cleanupOnExit && (this._removeOnExit = onExit(callWith(this, this.disable))), this._tty.on("resize", this._$$handleSizeChange), this._fixedFramerate && (this.redrawTracker = setInterval2(this._$$doRedraw, this._updateInterval), this.redrawTracker.unref && this.redrawTracker.unref());
    };
    Gauge.prototype._disableEvents = function() {
      this._tty.removeListener("resize", this._$$handleSizeChange), this._fixedFramerate && clearInterval(this.redrawTracker), this._removeOnExit && this._removeOnExit();
    };
    Gauge.prototype.hide = function(cb) {
      if (this._disabled || !this._showing)
        return cb && process2.nextTick(cb);
      this._showing = !1, this._doRedraw(), cb && setImmediate2(cb);
    };
    Gauge.prototype.show = function(section, completed) {
      if (this._showing = !0, typeof section == "string")
        this._status.section = section;
      else if (typeof section == "object")
        for (var sectionKeys = Object.keys(section), ii = 0; ii < sectionKeys.length; ++ii) {
          var key = sectionKeys[ii];
          this._status[key] = section[key];
        }
      completed != null && (this._status.completed = completed), !this._disabled && this._requestRedraw();
    };
    Gauge.prototype.pulse = function(subsection) {
      this._status.subsection = subsection || "", this._status.spun++, !this._disabled && this._showing && this._requestRedraw();
    };
    Gauge.prototype._handleSizeChange = function() {
      this._gauge.setWidth(this._tty.columns - 1), this._requestRedraw();
    };
    Gauge.prototype._doRedraw = function() {
      if (!(this._disabled || this._paused)) {
        if (!this._fixedFramerate) {
          var now = Date.now();
          if (this._lastUpdateAt && now - this._lastUpdateAt < this._updateInterval)
            return;
          this._lastUpdateAt = now;
        }
        if (!this._showing && this._onScreen) {
          this._onScreen = !1;
          var result = this._gauge.hide();
          return this._hideCursor && (result += this._gauge.showCursor()), this._writeTo.write(result);
        }
        !this._showing && !this._onScreen || (this._showing && !this._onScreen && (this._onScreen = !0, this._needsRedraw = !0, this._hideCursor && this._writeTo.write(this._gauge.hideCursor())), this._needsRedraw && (this._writeTo.write(this._gauge.show(this._status)) || (this._paused = !0, this._writeTo.on("drain", callWith(this, function() {
          this._paused = !1, this._doRedraw();
        })))));
      }
    };
  }
});

// ../node_modules/set-blocking/index.js
var require_set_blocking = __commonJS({
  "../node_modules/set-blocking/index.js"(exports, module) {
    module.exports = function(blocking) {
      [process.stdout, process.stderr].forEach(function(stream) {
        stream._handle && stream.isTTY && typeof stream._handle.setBlocking == "function" && stream._handle.setBlocking(blocking);
      });
    };
  }
});

// ../node_modules/npmlog/lib/log.js
var require_log = __commonJS({
  "../node_modules/npmlog/lib/log.js"(exports, module) {
    "use strict";
    var Progress = require_lib(), Gauge = require_lib2(), EE = __require("events").EventEmitter, log2 = exports = module.exports = new EE(), util = __require("util"), setBlocking = require_set_blocking(), consoleControl = require_console_control_strings();
    setBlocking(!0);
    var stream = process.stderr;
    Object.defineProperty(log2, "stream", {
      set: function(newStream) {
        stream = newStream, this.gauge && this.gauge.setWriteTo(stream, stream);
      },
      get: function() {
        return stream;
      }
    });
    var colorEnabled;
    log2.useColor = function() {
      return colorEnabled ?? stream.isTTY;
    };
    log2.enableColor = function() {
      colorEnabled = !0, this.gauge.setTheme({ hasColor: colorEnabled, hasUnicode: unicodeEnabled });
    };
    log2.disableColor = function() {
      colorEnabled = !1, this.gauge.setTheme({ hasColor: colorEnabled, hasUnicode: unicodeEnabled });
    };
    log2.level = "info";
    log2.gauge = new Gauge(stream, {
      enabled: !1,
      // no progress bars unless asked
      theme: { hasColor: log2.useColor() },
      template: [
        { type: "progressbar", length: 20 },
        { type: "activityIndicator", kerning: 1, length: 1 },
        { type: "section", default: "" },
        ":",
        { type: "logline", kerning: 1, default: "" }
      ]
    });
    log2.tracker = new Progress.TrackerGroup();
    log2.progressEnabled = log2.gauge.isEnabled();
    var unicodeEnabled;
    log2.enableUnicode = function() {
      unicodeEnabled = !0, this.gauge.setTheme({ hasColor: this.useColor(), hasUnicode: unicodeEnabled });
    };
    log2.disableUnicode = function() {
      unicodeEnabled = !1, this.gauge.setTheme({ hasColor: this.useColor(), hasUnicode: unicodeEnabled });
    };
    log2.setGaugeThemeset = function(themes) {
      this.gauge.setThemeset(themes);
    };
    log2.setGaugeTemplate = function(template) {
      this.gauge.setTemplate(template);
    };
    log2.enableProgress = function() {
      this.progressEnabled || this._paused || (this.progressEnabled = !0, this.tracker.on("change", this.showProgress), this.gauge.enable());
    };
    log2.disableProgress = function() {
      this.progressEnabled && (this.progressEnabled = !1, this.tracker.removeListener("change", this.showProgress), this.gauge.disable());
    };
    var trackerConstructors = ["newGroup", "newItem", "newStream"], mixinLog = function(tracker) {
      return Object.keys(log2).forEach(function(P2) {
        if (P2[0] !== "_" && !trackerConstructors.filter(function(C) {
          return C === P2;
        }).length && !tracker[P2] && typeof log2[P2] == "function") {
          var func = log2[P2];
          tracker[P2] = function() {
            return func.apply(log2, arguments);
          };
        }
      }), tracker instanceof Progress.TrackerGroup && trackerConstructors.forEach(function(C) {
        var func = tracker[C];
        tracker[C] = function() {
          return mixinLog(func.apply(tracker, arguments));
        };
      }), tracker;
    };
    trackerConstructors.forEach(function(C) {
      log2[C] = function() {
        return mixinLog(this.tracker[C].apply(this.tracker, arguments));
      };
    });
    log2.clearProgress = function(cb) {
      if (!this.progressEnabled)
        return cb && process.nextTick(cb);
      this.gauge.hide(cb);
    };
    log2.showProgress = function(name, completed) {
      if (this.progressEnabled) {
        var values = {};
        name && (values.section = name);
        var last = log2.record[log2.record.length - 1];
        if (last) {
          values.subsection = last.prefix;
          var disp = log2.disp[last.level] || last.level, logline = this._format(disp, log2.style[last.level]);
          last.prefix && (logline += " " + this._format(last.prefix, this.prefixStyle)), logline += " " + last.message.split(/\r?\n/)[0], values.logline = logline;
        }
        values.completed = completed || this.tracker.completed(), this.gauge.show(values);
      }
    }.bind(log2);
    log2.pause = function() {
      this._paused = !0, this.progressEnabled && this.gauge.disable();
    };
    log2.resume = function() {
      if (this._paused) {
        this._paused = !1;
        var b = this._buffer;
        this._buffer = [], b.forEach(function(m) {
          this.emitLog(m);
        }, this), this.progressEnabled && this.gauge.enable();
      }
    };
    log2._buffer = [];
    var id = 0;
    log2.record = [];
    log2.maxRecordSize = 1e4;
    log2.log = function(lvl, prefix, message) {
      var l = this.levels[lvl];
      if (l === void 0)
        return this.emit("error", new Error(util.format(
          "Undefined log level: %j",
          lvl
        )));
      for (var a = new Array(arguments.length - 2), stack = null, i = 2; i < arguments.length; i++) {
        var arg = a[i - 2] = arguments[i];
        typeof arg == "object" && arg instanceof Error && arg.stack && Object.defineProperty(arg, "stack", {
          value: stack = arg.stack + "",
          enumerable: !0,
          writable: !0
        });
      }
      stack && a.unshift(stack + `
`), message = util.format.apply(util, a);
      var m = {
        id: id++,
        level: lvl,
        prefix: String(prefix || ""),
        message,
        messageRaw: a
      };
      this.emit("log", m), this.emit("log." + lvl, m), m.prefix && this.emit(m.prefix, m), this.record.push(m);
      var mrs = this.maxRecordSize, n = this.record.length - mrs;
      if (n > mrs / 10) {
        var newSize = Math.floor(mrs * 0.9);
        this.record = this.record.slice(-1 * newSize);
      }
      this.emitLog(m);
    }.bind(log2);
    log2.emitLog = function(m) {
      if (this._paused) {
        this._buffer.push(m);
        return;
      }
      this.progressEnabled && this.gauge.pulse(m.prefix);
      var l = this.levels[m.level];
      if (l !== void 0 && !(l < this.levels[this.level]) && !(l > 0 && !isFinite(l))) {
        var disp = log2.disp[m.level] != null ? log2.disp[m.level] : m.level;
        this.clearProgress(), m.message.split(/\r?\n/).forEach(function(line) {
          var heading = this.heading;
          heading && (this.write(heading, this.headingStyle), this.write(" ")), this.write(disp, log2.style[m.level]);
          var p = m.prefix || "";
          p && this.write(" "), this.write(p, this.prefixStyle), this.write(" " + line + `
`);
        }, this), this.showProgress();
      }
    };
    log2._format = function(msg, style) {
      if (stream) {
        var output = "";
        if (this.useColor()) {
          style = style || {};
          var settings = [];
          style.fg && settings.push(style.fg), style.bg && settings.push("bg" + style.bg[0].toUpperCase() + style.bg.slice(1)), style.bold && settings.push("bold"), style.underline && settings.push("underline"), style.inverse && settings.push("inverse"), settings.length && (output += consoleControl.color(settings)), style.beep && (output += consoleControl.beep());
        }
        return output += msg, this.useColor() && (output += consoleControl.color("reset")), output;
      }
    };
    log2.write = function(msg, style) {
      stream && stream.write(this._format(msg, style));
    };
    log2.addLevel = function(lvl, n, style, disp) {
      disp == null && (disp = lvl), this.levels[lvl] = n, this.style[lvl] = style, this[lvl] || (this[lvl] = function() {
        var a = new Array(arguments.length + 1);
        a[0] = lvl;
        for (var i = 0; i < arguments.length; i++)
          a[i + 1] = arguments[i];
        return this.log.apply(this, a);
      }.bind(this)), this.disp[lvl] = disp;
    };
    log2.prefixStyle = { fg: "magenta" };
    log2.headingStyle = { fg: "white", bg: "black" };
    log2.style = {};
    log2.levels = {};
    log2.disp = {};
    log2.addLevel("silly", -1 / 0, { inverse: !0 }, "sill");
    log2.addLevel("verbose", 1e3, { fg: "cyan", bg: "black" }, "verb");
    log2.addLevel("info", 2e3, { fg: "green" });
    log2.addLevel("timing", 2500, { fg: "green", bg: "black" });
    log2.addLevel("http", 3e3, { fg: "green", bg: "black" });
    log2.addLevel("notice", 3500, { fg: "cyan", bg: "black" });
    log2.addLevel("warn", 4e3, { fg: "black", bg: "yellow" }, "WARN");
    log2.addLevel("error", 5e3, { fg: "red", bg: "black" }, "ERR!");
    log2.addLevel("silent", 1 / 0);
    log2.on("error", function() {
    });
  }
});

// ../node_modules/pretty-hrtime/index.js
var require_pretty_hrtime = __commonJS({
  "../node_modules/pretty-hrtime/index.js"(exports, module) {
    "use strict";
    var minimalDesc = ["h", "min", "s", "ms", "\u03BCs", "ns"], verboseDesc = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"], convert = [3600, 60, 1, 1e6, 1e3, 1];
    module.exports = function(source, opts) {
      var verbose, precise, i, spot, sourceAtStep, valAtStep, decimals, strAtStep, results, totalSeconds;
      if (verbose = !1, precise = !1, opts && (verbose = opts.verbose || !1, precise = opts.precise || !1), !Array.isArray(source) || source.length !== 2 || typeof source[0] != "number" || typeof source[1] != "number")
        return "";
      for (source[1] < 0 && (totalSeconds = source[0] + source[1] / 1e9, source[0] = parseInt(totalSeconds), source[1] = parseFloat((totalSeconds % 1).toPrecision(9)) * 1e9), results = "", i = 0; i < 6 && (spot = i < 3 ? 0 : 1, sourceAtStep = source[spot], i !== 3 && i !== 0 && (sourceAtStep = sourceAtStep % convert[i - 1]), i === 2 && (sourceAtStep += source[1] / 1e9), valAtStep = sourceAtStep / convert[i], !(valAtStep >= 1 && (verbose && (valAtStep = Math.floor(valAtStep)), precise ? strAtStep = valAtStep.toString() : (decimals = valAtStep >= 10 ? 0 : 2, strAtStep = valAtStep.toFixed(decimals)), strAtStep.indexOf(".") > -1 && strAtStep[strAtStep.length - 1] === "0" && (strAtStep = strAtStep.replace(/\.?0+$/, "")), results && (results += " "), results += strAtStep, verbose ? (results += " " + verboseDesc[i], strAtStep !== "1" && (results += "s")) : results += " " + minimalDesc[i], !verbose))); i++)
        ;
      return results;
    };
  }
});

// ../node_modules/sisteransi/src/index.js
var require_src = __commonJS({
  "../node_modules/sisteransi/src/index.js"(exports, module) {
    "use strict";
    var cursor = {
      to(x3, y2) {
        return y2 ? `\x1B[${y2 + 1};${x3 + 1}H` : `\x1B[${x3 + 1}G`;
      },
      move(x3, y2) {
        let ret = "";
        return x3 < 0 ? ret += `\x1B[${-x3}D` : x3 > 0 && (ret += `\x1B[${x3}C`), y2 < 0 ? ret += `\x1B[${-y2}A` : y2 > 0 && (ret += `\x1B[${y2}B`), ret;
      },
      up: (count = 1) => `\x1B[${count}A`,
      down: (count = 1) => `\x1B[${count}B`,
      forward: (count = 1) => `\x1B[${count}C`,
      backward: (count = 1) => `\x1B[${count}D`,
      nextLine: (count = 1) => "\x1B[E".repeat(count),
      prevLine: (count = 1) => "\x1B[F".repeat(count),
      left: "\x1B[G",
      hide: "\x1B[?25l",
      show: "\x1B[?25h",
      save: "\x1B7",
      restore: "\x1B8"
    }, scroll = {
      up: (count = 1) => "\x1B[S".repeat(count),
      down: (count = 1) => "\x1B[T".repeat(count)
    }, erase = {
      screen: "\x1B[2J",
      up: (count = 1) => "\x1B[1J".repeat(count),
      down: (count = 1) => "\x1B[J".repeat(count),
      line: "\x1B[2K",
      lineEnd: "\x1B[K",
      lineStart: "\x1B[1K",
      lines(count) {
        let clear = "";
        for (let i = 0; i < count; i++)
          clear += this.line + (i < count - 1 ? cursor.up() : "");
        return count && (clear += cursor.left), clear;
      }
    };
    module.exports = { cursor, scroll, erase, beep: "\x07" };
  }
});

// ../node_modules/eastasianwidth/eastasianwidth.js
var require_eastasianwidth = __commonJS({
  "../node_modules/eastasianwidth/eastasianwidth.js"(exports, module) {
    var eaw = {};
    typeof module > "u" ? window.eastasianwidth = eaw : module.exports = eaw;
    eaw.eastAsianWidth = function(character) {
      var x3 = character.charCodeAt(0), y2 = character.length == 2 ? character.charCodeAt(1) : 0, codePoint = x3;
      return 55296 <= x3 && x3 <= 56319 && 56320 <= y2 && y2 <= 57343 && (x3 &= 1023, y2 &= 1023, codePoint = x3 << 10 | y2, codePoint += 65536), codePoint == 12288 || 65281 <= codePoint && codePoint <= 65376 || 65504 <= codePoint && codePoint <= 65510 ? "F" : codePoint == 8361 || 65377 <= codePoint && codePoint <= 65470 || 65474 <= codePoint && codePoint <= 65479 || 65482 <= codePoint && codePoint <= 65487 || 65490 <= codePoint && codePoint <= 65495 || 65498 <= codePoint && codePoint <= 65500 || 65512 <= codePoint && codePoint <= 65518 ? "H" : 4352 <= codePoint && codePoint <= 4447 || 4515 <= codePoint && codePoint <= 4519 || 4602 <= codePoint && codePoint <= 4607 || 9001 <= codePoint && codePoint <= 9002 || 11904 <= codePoint && codePoint <= 11929 || 11931 <= codePoint && codePoint <= 12019 || 12032 <= codePoint && codePoint <= 12245 || 12272 <= codePoint && codePoint <= 12283 || 12289 <= codePoint && codePoint <= 12350 || 12353 <= codePoint && codePoint <= 12438 || 12441 <= codePoint && codePoint <= 12543 || 12549 <= codePoint && codePoint <= 12589 || 12593 <= codePoint && codePoint <= 12686 || 12688 <= codePoint && codePoint <= 12730 || 12736 <= codePoint && codePoint <= 12771 || 12784 <= codePoint && codePoint <= 12830 || 12832 <= codePoint && codePoint <= 12871 || 12880 <= codePoint && codePoint <= 13054 || 13056 <= codePoint && codePoint <= 19903 || 19968 <= codePoint && codePoint <= 42124 || 42128 <= codePoint && codePoint <= 42182 || 43360 <= codePoint && codePoint <= 43388 || 44032 <= codePoint && codePoint <= 55203 || 55216 <= codePoint && codePoint <= 55238 || 55243 <= codePoint && codePoint <= 55291 || 63744 <= codePoint && codePoint <= 64255 || 65040 <= codePoint && codePoint <= 65049 || 65072 <= codePoint && codePoint <= 65106 || 65108 <= codePoint && codePoint <= 65126 || 65128 <= codePoint && codePoint <= 65131 || 110592 <= codePoint && codePoint <= 110593 || 127488 <= codePoint && codePoint <= 127490 || 127504 <= codePoint && codePoint <= 127546 || 127552 <= codePoint && codePoint <= 127560 || 127568 <= codePoint && codePoint <= 127569 || 131072 <= codePoint && codePoint <= 194367 || 177984 <= codePoint && codePoint <= 196605 || 196608 <= codePoint && codePoint <= 262141 ? "W" : 32 <= codePoint && codePoint <= 126 || 162 <= codePoint && codePoint <= 163 || 165 <= codePoint && codePoint <= 166 || codePoint == 172 || codePoint == 175 || 10214 <= codePoint && codePoint <= 10221 || 10629 <= codePoint && codePoint <= 10630 ? "Na" : codePoint == 161 || codePoint == 164 || 167 <= codePoint && codePoint <= 168 || codePoint == 170 || 173 <= codePoint && codePoint <= 174 || 176 <= codePoint && codePoint <= 180 || 182 <= codePoint && codePoint <= 186 || 188 <= codePoint && codePoint <= 191 || codePoint == 198 || codePoint == 208 || 215 <= codePoint && codePoint <= 216 || 222 <= codePoint && codePoint <= 225 || codePoint == 230 || 232 <= codePoint && codePoint <= 234 || 236 <= codePoint && codePoint <= 237 || codePoint == 240 || 242 <= codePoint && codePoint <= 243 || 247 <= codePoint && codePoint <= 250 || codePoint == 252 || codePoint == 254 || codePoint == 257 || codePoint == 273 || codePoint == 275 || codePoint == 283 || 294 <= codePoint && codePoint <= 295 || codePoint == 299 || 305 <= codePoint && codePoint <= 307 || codePoint == 312 || 319 <= codePoint && codePoint <= 322 || codePoint == 324 || 328 <= codePoint && codePoint <= 331 || codePoint == 333 || 338 <= codePoint && codePoint <= 339 || 358 <= codePoint && codePoint <= 359 || codePoint == 363 || codePoint == 462 || codePoint == 464 || codePoint == 466 || codePoint == 468 || codePoint == 470 || codePoint == 472 || codePoint == 474 || codePoint == 476 || codePoint == 593 || codePoint == 609 || codePoint == 708 || codePoint == 711 || 713 <= codePoint && codePoint <= 715 || codePoint == 717 || codePoint == 720 || 728 <= codePoint && codePoint <= 731 || codePoint == 733 || codePoint == 735 || 768 <= codePoint && codePoint <= 879 || 913 <= codePoint && codePoint <= 929 || 931 <= codePoint && codePoint <= 937 || 945 <= codePoint && codePoint <= 961 || 963 <= codePoint && codePoint <= 969 || codePoint == 1025 || 1040 <= codePoint && codePoint <= 1103 || codePoint == 1105 || codePoint == 8208 || 8211 <= codePoint && codePoint <= 8214 || 8216 <= codePoint && codePoint <= 8217 || 8220 <= codePoint && codePoint <= 8221 || 8224 <= codePoint && codePoint <= 8226 || 8228 <= codePoint && codePoint <= 8231 || codePoint == 8240 || 8242 <= codePoint && codePoint <= 8243 || codePoint == 8245 || codePoint == 8251 || codePoint == 8254 || codePoint == 8308 || codePoint == 8319 || 8321 <= codePoint && codePoint <= 8324 || codePoint == 8364 || codePoint == 8451 || codePoint == 8453 || codePoint == 8457 || codePoint == 8467 || codePoint == 8470 || 8481 <= codePoint && codePoint <= 8482 || codePoint == 8486 || codePoint == 8491 || 8531 <= codePoint && codePoint <= 8532 || 8539 <= codePoint && codePoint <= 8542 || 8544 <= codePoint && codePoint <= 8555 || 8560 <= codePoint && codePoint <= 8569 || codePoint == 8585 || 8592 <= codePoint && codePoint <= 8601 || 8632 <= codePoint && codePoint <= 8633 || codePoint == 8658 || codePoint == 8660 || codePoint == 8679 || codePoint == 8704 || 8706 <= codePoint && codePoint <= 8707 || 8711 <= codePoint && codePoint <= 8712 || codePoint == 8715 || codePoint == 8719 || codePoint == 8721 || codePoint == 8725 || codePoint == 8730 || 8733 <= codePoint && codePoint <= 8736 || codePoint == 8739 || codePoint == 8741 || 8743 <= codePoint && codePoint <= 8748 || codePoint == 8750 || 8756 <= codePoint && codePoint <= 8759 || 8764 <= codePoint && codePoint <= 8765 || codePoint == 8776 || codePoint == 8780 || codePoint == 8786 || 8800 <= codePoint && codePoint <= 8801 || 8804 <= codePoint && codePoint <= 8807 || 8810 <= codePoint && codePoint <= 8811 || 8814 <= codePoint && codePoint <= 8815 || 8834 <= codePoint && codePoint <= 8835 || 8838 <= codePoint && codePoint <= 8839 || codePoint == 8853 || codePoint == 8857 || codePoint == 8869 || codePoint == 8895 || codePoint == 8978 || 9312 <= codePoint && codePoint <= 9449 || 9451 <= codePoint && codePoint <= 9547 || 9552 <= codePoint && codePoint <= 9587 || 9600 <= codePoint && codePoint <= 9615 || 9618 <= codePoint && codePoint <= 9621 || 9632 <= codePoint && codePoint <= 9633 || 9635 <= codePoint && codePoint <= 9641 || 9650 <= codePoint && codePoint <= 9651 || 9654 <= codePoint && codePoint <= 9655 || 9660 <= codePoint && codePoint <= 9661 || 9664 <= codePoint && codePoint <= 9665 || 9670 <= codePoint && codePoint <= 9672 || codePoint == 9675 || 9678 <= codePoint && codePoint <= 9681 || 9698 <= codePoint && codePoint <= 9701 || codePoint == 9711 || 9733 <= codePoint && codePoint <= 9734 || codePoint == 9737 || 9742 <= codePoint && codePoint <= 9743 || 9748 <= codePoint && codePoint <= 9749 || codePoint == 9756 || codePoint == 9758 || codePoint == 9792 || codePoint == 9794 || 9824 <= codePoint && codePoint <= 9825 || 9827 <= codePoint && codePoint <= 9829 || 9831 <= codePoint && codePoint <= 9834 || 9836 <= codePoint && codePoint <= 9837 || codePoint == 9839 || 9886 <= codePoint && codePoint <= 9887 || 9918 <= codePoint && codePoint <= 9919 || 9924 <= codePoint && codePoint <= 9933 || 9935 <= codePoint && codePoint <= 9953 || codePoint == 9955 || 9960 <= codePoint && codePoint <= 9983 || codePoint == 10045 || codePoint == 10071 || 10102 <= codePoint && codePoint <= 10111 || 11093 <= codePoint && codePoint <= 11097 || 12872 <= codePoint && codePoint <= 12879 || 57344 <= codePoint && codePoint <= 63743 || 65024 <= codePoint && codePoint <= 65039 || codePoint == 65533 || 127232 <= codePoint && codePoint <= 127242 || 127248 <= codePoint && codePoint <= 127277 || 127280 <= codePoint && codePoint <= 127337 || 127344 <= codePoint && codePoint <= 127386 || 917760 <= codePoint && codePoint <= 917999 || 983040 <= codePoint && codePoint <= 1048573 || 1048576 <= codePoint && codePoint <= 1114109 ? "A" : "N";
    };
    eaw.characterLength = function(character) {
      var code = this.eastAsianWidth(character);
      return code == "F" || code == "W" || code == "A" ? 2 : 1;
    };
    function stringToArray(string) {
      return string.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
    }
    eaw.length = function(string) {
      for (var characters = stringToArray(string), len = 0, i = 0; i < characters.length; i++)
        len = len + this.characterLength(characters[i]);
      return len;
    };
    eaw.slice = function(text2, start, end) {
      textLen = eaw.length(text2), start = start || 0, end = end || 1, start < 0 && (start = textLen + start), end < 0 && (end = textLen + end);
      for (var result = "", eawLen = 0, chars = stringToArray(text2), i = 0; i < chars.length; i++) {
        var char = chars[i], charLen = eaw.length(char);
        if (eawLen >= start - (charLen == 2 ? 1 : 0))
          if (eawLen + charLen <= end)
            result += char;
          else
            break;
        eawLen += charLen;
      }
      return result;
    };
  }
});

// ../node_modules/emoji-regex/index.js
var require_emoji_regex2 = __commonJS({
  "../node_modules/emoji-regex/index.js"(exports, module) {
    "use strict";
    module.exports = function() {
      return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
    };
  }
});

// src/node-logger/index.ts
var import_npmlog = __toESM(require_log(), 1), import_pretty_hrtime = __toESM(require_pretty_hrtime(), 1);

// src/node-logger/logger/logger.ts
var logger_exports = {};
__export(logger_exports, {
  SYMBOLS: () => SYMBOLS,
  debug: () => debug,
  error: () => error,
  getLogLevel: () => getLogLevel,
  info: () => info,
  intro: () => intro,
  log: () => log,
  logBox: () => logBox,
  outro: () => outro,
  setLogLevel: () => setLogLevel,
  shouldLog: () => shouldLog,
  step: () => step,
  warn: () => warn,
  wrapTextForClack: () => wrapTextForClack
});

// ../node_modules/@clack/core/dist/index.mjs
var import_picocolors = __toESM(require_picocolors(), 1), import_sisteransi = __toESM(require_src(), 1);
import { stdout as R, stdin as q } from "node:process";
import * as k from "node:readline";
import ot from "node:readline";
import { ReadStream as J } from "node:tty";
var at = (t2) => t2 === 161 || t2 === 164 || t2 === 167 || t2 === 168 || t2 === 170 || t2 === 173 || t2 === 174 || t2 >= 176 && t2 <= 180 || t2 >= 182 && t2 <= 186 || t2 >= 188 && t2 <= 191 || t2 === 198 || t2 === 208 || t2 === 215 || t2 === 216 || t2 >= 222 && t2 <= 225 || t2 === 230 || t2 >= 232 && t2 <= 234 || t2 === 236 || t2 === 237 || t2 === 240 || t2 === 242 || t2 === 243 || t2 >= 247 && t2 <= 250 || t2 === 252 || t2 === 254 || t2 === 257 || t2 === 273 || t2 === 275 || t2 === 283 || t2 === 294 || t2 === 295 || t2 === 299 || t2 >= 305 && t2 <= 307 || t2 === 312 || t2 >= 319 && t2 <= 322 || t2 === 324 || t2 >= 328 && t2 <= 331 || t2 === 333 || t2 === 338 || t2 === 339 || t2 === 358 || t2 === 359 || t2 === 363 || t2 === 462 || t2 === 464 || t2 === 466 || t2 === 468 || t2 === 470 || t2 === 472 || t2 === 474 || t2 === 476 || t2 === 593 || t2 === 609 || t2 === 708 || t2 === 711 || t2 >= 713 && t2 <= 715 || t2 === 717 || t2 === 720 || t2 >= 728 && t2 <= 731 || t2 === 733 || t2 === 735 || t2 >= 768 && t2 <= 879 || t2 >= 913 && t2 <= 929 || t2 >= 931 && t2 <= 937 || t2 >= 945 && t2 <= 961 || t2 >= 963 && t2 <= 969 || t2 === 1025 || t2 >= 1040 && t2 <= 1103 || t2 === 1105 || t2 === 8208 || t2 >= 8211 && t2 <= 8214 || t2 === 8216 || t2 === 8217 || t2 === 8220 || t2 === 8221 || t2 >= 8224 && t2 <= 8226 || t2 >= 8228 && t2 <= 8231 || t2 === 8240 || t2 === 8242 || t2 === 8243 || t2 === 8245 || t2 === 8251 || t2 === 8254 || t2 === 8308 || t2 === 8319 || t2 >= 8321 && t2 <= 8324 || t2 === 8364 || t2 === 8451 || t2 === 8453 || t2 === 8457 || t2 === 8467 || t2 === 8470 || t2 === 8481 || t2 === 8482 || t2 === 8486 || t2 === 8491 || t2 === 8531 || t2 === 8532 || t2 >= 8539 && t2 <= 8542 || t2 >= 8544 && t2 <= 8555 || t2 >= 8560 && t2 <= 8569 || t2 === 8585 || t2 >= 8592 && t2 <= 8601 || t2 === 8632 || t2 === 8633 || t2 === 8658 || t2 === 8660 || t2 === 8679 || t2 === 8704 || t2 === 8706 || t2 === 8707 || t2 === 8711 || t2 === 8712 || t2 === 8715 || t2 === 8719 || t2 === 8721 || t2 === 8725 || t2 === 8730 || t2 >= 8733 && t2 <= 8736 || t2 === 8739 || t2 === 8741 || t2 >= 8743 && t2 <= 8748 || t2 === 8750 || t2 >= 8756 && t2 <= 8759 || t2 === 8764 || t2 === 8765 || t2 === 8776 || t2 === 8780 || t2 === 8786 || t2 === 8800 || t2 === 8801 || t2 >= 8804 && t2 <= 8807 || t2 === 8810 || t2 === 8811 || t2 === 8814 || t2 === 8815 || t2 === 8834 || t2 === 8835 || t2 === 8838 || t2 === 8839 || t2 === 8853 || t2 === 8857 || t2 === 8869 || t2 === 8895 || t2 === 8978 || t2 >= 9312 && t2 <= 9449 || t2 >= 9451 && t2 <= 9547 || t2 >= 9552 && t2 <= 9587 || t2 >= 9600 && t2 <= 9615 || t2 >= 9618 && t2 <= 9621 || t2 === 9632 || t2 === 9633 || t2 >= 9635 && t2 <= 9641 || t2 === 9650 || t2 === 9651 || t2 === 9654 || t2 === 9655 || t2 === 9660 || t2 === 9661 || t2 === 9664 || t2 === 9665 || t2 >= 9670 && t2 <= 9672 || t2 === 9675 || t2 >= 9678 && t2 <= 9681 || t2 >= 9698 && t2 <= 9701 || t2 === 9711 || t2 === 9733 || t2 === 9734 || t2 === 9737 || t2 === 9742 || t2 === 9743 || t2 === 9756 || t2 === 9758 || t2 === 9792 || t2 === 9794 || t2 === 9824 || t2 === 9825 || t2 >= 9827 && t2 <= 9829 || t2 >= 9831 && t2 <= 9834 || t2 === 9836 || t2 === 9837 || t2 === 9839 || t2 === 9886 || t2 === 9887 || t2 === 9919 || t2 >= 9926 && t2 <= 9933 || t2 >= 9935 && t2 <= 9939 || t2 >= 9941 && t2 <= 9953 || t2 === 9955 || t2 === 9960 || t2 === 9961 || t2 >= 9963 && t2 <= 9969 || t2 === 9972 || t2 >= 9974 && t2 <= 9977 || t2 === 9979 || t2 === 9980 || t2 === 9982 || t2 === 9983 || t2 === 10045 || t2 >= 10102 && t2 <= 10111 || t2 >= 11094 && t2 <= 11097 || t2 >= 12872 && t2 <= 12879 || t2 >= 57344 && t2 <= 63743 || t2 >= 65024 && t2 <= 65039 || t2 === 65533 || t2 >= 127232 && t2 <= 127242 || t2 >= 127248 && t2 <= 127277 || t2 >= 127280 && t2 <= 127337 || t2 >= 127344 && t2 <= 127373 || t2 === 127375 || t2 === 127376 || t2 >= 127387 && t2 <= 127404 || t2 >= 917760 && t2 <= 917999 || t2 >= 983040 && t2 <= 1048573 || t2 >= 1048576 && t2 <= 1114109, lt = (t2) => t2 === 12288 || t2 >= 65281 && t2 <= 65376 || t2 >= 65504 && t2 <= 65510, ht = (t2) => t2 >= 4352 && t2 <= 4447 || t2 === 8986 || t2 === 8987 || t2 === 9001 || t2 === 9002 || t2 >= 9193 && t2 <= 9196 || t2 === 9200 || t2 === 9203 || t2 === 9725 || t2 === 9726 || t2 === 9748 || t2 === 9749 || t2 >= 9800 && t2 <= 9811 || t2 === 9855 || t2 === 9875 || t2 === 9889 || t2 === 9898 || t2 === 9899 || t2 === 9917 || t2 === 9918 || t2 === 9924 || t2 === 9925 || t2 === 9934 || t2 === 9940 || t2 === 9962 || t2 === 9970 || t2 === 9971 || t2 === 9973 || t2 === 9978 || t2 === 9981 || t2 === 9989 || t2 === 9994 || t2 === 9995 || t2 === 10024 || t2 === 10060 || t2 === 10062 || t2 >= 10067 && t2 <= 10069 || t2 === 10071 || t2 >= 10133 && t2 <= 10135 || t2 === 10160 || t2 === 10175 || t2 === 11035 || t2 === 11036 || t2 === 11088 || t2 === 11093 || t2 >= 11904 && t2 <= 11929 || t2 >= 11931 && t2 <= 12019 || t2 >= 12032 && t2 <= 12245 || t2 >= 12272 && t2 <= 12287 || t2 >= 12289 && t2 <= 12350 || t2 >= 12353 && t2 <= 12438 || t2 >= 12441 && t2 <= 12543 || t2 >= 12549 && t2 <= 12591 || t2 >= 12593 && t2 <= 12686 || t2 >= 12688 && t2 <= 12771 || t2 >= 12783 && t2 <= 12830 || t2 >= 12832 && t2 <= 12871 || t2 >= 12880 && t2 <= 19903 || t2 >= 19968 && t2 <= 42124 || t2 >= 42128 && t2 <= 42182 || t2 >= 43360 && t2 <= 43388 || t2 >= 44032 && t2 <= 55203 || t2 >= 63744 && t2 <= 64255 || t2 >= 65040 && t2 <= 65049 || t2 >= 65072 && t2 <= 65106 || t2 >= 65108 && t2 <= 65126 || t2 >= 65128 && t2 <= 65131 || t2 >= 94176 && t2 <= 94180 || t2 === 94192 || t2 === 94193 || t2 >= 94208 && t2 <= 100343 || t2 >= 100352 && t2 <= 101589 || t2 >= 101632 && t2 <= 101640 || t2 >= 110576 && t2 <= 110579 || t2 >= 110581 && t2 <= 110587 || t2 === 110589 || t2 === 110590 || t2 >= 110592 && t2 <= 110882 || t2 === 110898 || t2 >= 110928 && t2 <= 110930 || t2 === 110933 || t2 >= 110948 && t2 <= 110951 || t2 >= 110960 && t2 <= 111355 || t2 === 126980 || t2 === 127183 || t2 === 127374 || t2 >= 127377 && t2 <= 127386 || t2 >= 127488 && t2 <= 127490 || t2 >= 127504 && t2 <= 127547 || t2 >= 127552 && t2 <= 127560 || t2 === 127568 || t2 === 127569 || t2 >= 127584 && t2 <= 127589 || t2 >= 127744 && t2 <= 127776 || t2 >= 127789 && t2 <= 127797 || t2 >= 127799 && t2 <= 127868 || t2 >= 127870 && t2 <= 127891 || t2 >= 127904 && t2 <= 127946 || t2 >= 127951 && t2 <= 127955 || t2 >= 127968 && t2 <= 127984 || t2 === 127988 || t2 >= 127992 && t2 <= 128062 || t2 === 128064 || t2 >= 128066 && t2 <= 128252 || t2 >= 128255 && t2 <= 128317 || t2 >= 128331 && t2 <= 128334 || t2 >= 128336 && t2 <= 128359 || t2 === 128378 || t2 === 128405 || t2 === 128406 || t2 === 128420 || t2 >= 128507 && t2 <= 128591 || t2 >= 128640 && t2 <= 128709 || t2 === 128716 || t2 >= 128720 && t2 <= 128722 || t2 >= 128725 && t2 <= 128727 || t2 >= 128732 && t2 <= 128735 || t2 === 128747 || t2 === 128748 || t2 >= 128756 && t2 <= 128764 || t2 >= 128992 && t2 <= 129003 || t2 === 129008 || t2 >= 129292 && t2 <= 129338 || t2 >= 129340 && t2 <= 129349 || t2 >= 129351 && t2 <= 129535 || t2 >= 129648 && t2 <= 129660 || t2 >= 129664 && t2 <= 129672 || t2 >= 129680 && t2 <= 129725 || t2 >= 129727 && t2 <= 129733 || t2 >= 129742 && t2 <= 129755 || t2 >= 129760 && t2 <= 129768 || t2 >= 129776 && t2 <= 129784 || t2 >= 131072 && t2 <= 196605 || t2 >= 196608 && t2 <= 262141, O = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/y, y = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y, M = /\t{1,1000}/y, P = new RegExp("[\\u{1F1E6}-\\u{1F1FF}]{2}|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2}[\\u{E0030}-\\u{E0039}\\u{E0061}-\\u{E007A}]{1,3}\\u{E007F}|(?:\\p{Emoji}\\uFE0F\\u20E3?|\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation})(?:\\u200D(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F\\u20E3?))*", "yu"), L = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y, ct = new RegExp("\\p{M}+", "gu"), Ft = { limit: 1 / 0, ellipsis: "" }, X = (t2, e = {}, s = {}) => {
  let i = e.limit ?? 1 / 0, r = e.ellipsis ?? "", n = e?.ellipsisWidth ?? (r ? X(r, Ft, s).width : 0), o = s.ansiWidth ?? 0, a = s.controlWidth ?? 0, l = s.tabWidth ?? 8, E = s.ambiguousWidth ?? 1, g = s.emojiWidth ?? 2, m = s.fullWidthWidth ?? 2, A = s.regularWidth ?? 1, V2 = s.wideWidth ?? 2, h = 0, u = 0, f = t2.length, v = 0, p = !1, d2 = f, b = Math.max(0, i - n), C = 0, B = 0, c = 0, F = 0;
  t: for (; ; ) {
    if (B > C || u >= f && u > h) {
      let ut = t2.slice(C, B) || t2.slice(h, u);
      v = 0;
      for (let Y2 of ut.replaceAll(ct, "")) {
        let $ = Y2.codePointAt(0) || 0;
        if (lt($) ? F = m : ht($) ? F = V2 : E !== A && at($) ? F = E : F = A, c + F > b && (d2 = Math.min(d2, Math.max(C, h) + v)), c + F > i) {
          p = !0;
          break t;
        }
        v += Y2.length, c += F;
      }
      C = B = 0;
    }
    if (u >= f) break;
    if (L.lastIndex = u, L.test(t2)) {
      if (v = L.lastIndex - u, F = v * A, c + F > b && (d2 = Math.min(d2, u + Math.floor((b - c) / A))), c + F > i) {
        p = !0;
        break;
      }
      c += F, C = h, B = u, u = h = L.lastIndex;
      continue;
    }
    if (O.lastIndex = u, O.test(t2)) {
      if (c + o > b && (d2 = Math.min(d2, u)), c + o > i) {
        p = !0;
        break;
      }
      c += o, C = h, B = u, u = h = O.lastIndex;
      continue;
    }
    if (y.lastIndex = u, y.test(t2)) {
      if (v = y.lastIndex - u, F = v * a, c + F > b && (d2 = Math.min(d2, u + Math.floor((b - c) / a))), c + F > i) {
        p = !0;
        break;
      }
      c += F, C = h, B = u, u = h = y.lastIndex;
      continue;
    }
    if (M.lastIndex = u, M.test(t2)) {
      if (v = M.lastIndex - u, F = v * l, c + F > b && (d2 = Math.min(d2, u + Math.floor((b - c) / l))), c + F > i) {
        p = !0;
        break;
      }
      c += F, C = h, B = u, u = h = M.lastIndex;
      continue;
    }
    if (P.lastIndex = u, P.test(t2)) {
      if (c + g > b && (d2 = Math.min(d2, u)), c + g > i) {
        p = !0;
        break;
      }
      c += g, C = h, B = u, u = h = P.lastIndex;
      continue;
    }
    u += 1;
  }
  return { width: p ? b : c, index: p ? d2 : f, truncated: p, ellipsed: p && i >= n };
}, ft = { limit: 1 / 0, ellipsis: "", ellipsisWidth: 0 }, S = (t2, e = {}) => X(t2, ft, e).width, W = "\x1B", Z = "\x9B", pt = 39, j = "\x07", Q = "[", dt = "]", tt = "m", U = `${dt}8;;`, et = new RegExp(`(?:\\${Q}(?<code>\\d+)m|\\${U}(?<uri>.*)${j})`, "y"), mt = (t2) => {
  if (t2 >= 30 && t2 <= 37 || t2 >= 90 && t2 <= 97) return 39;
  if (t2 >= 40 && t2 <= 47 || t2 >= 100 && t2 <= 107) return 49;
  if (t2 === 1 || t2 === 2) return 22;
  if (t2 === 3) return 23;
  if (t2 === 4) return 24;
  if (t2 === 7) return 27;
  if (t2 === 8) return 28;
  if (t2 === 9) return 29;
  if (t2 === 0) return 0;
}, st = (t2) => `${W}${Q}${t2}${tt}`, it = (t2) => `${W}${U}${t2}${j}`, gt = (t2) => t2.map((e) => S(e)), G = (t2, e, s) => {
  let i = e[Symbol.iterator](), r = !1, n = !1, o = t2.at(-1), a = o === void 0 ? 0 : S(o), l = i.next(), E = i.next(), g = 0;
  for (; !l.done; ) {
    let m = l.value, A = S(m);
    a + A <= s ? t2[t2.length - 1] += m : (t2.push(m), a = 0), (m === W || m === Z) && (r = !0, n = e.startsWith(U, g + 1)), r ? n ? m === j && (r = !1, n = !1) : m === tt && (r = !1) : (a += A, a === s && !E.done && (t2.push(""), a = 0)), l = E, E = i.next(), g += m.length;
  }
  o = t2.at(-1), !a && o !== void 0 && o.length > 0 && t2.length > 1 && (t2[t2.length - 2] += t2.pop());
}, vt = (t2) => {
  let e = t2.split(" "), s = e.length;
  for (; s > 0 && !(S(e[s - 1]) > 0); ) s--;
  return s === e.length ? t2 : e.slice(0, s).join(" ") + e.slice(s).join("");
}, Et = (t2, e, s = {}) => {
  if (s.trim !== !1 && t2.trim() === "") return "";
  let i = "", r, n, o = t2.split(" "), a = gt(o), l = [""];
  for (let [h, u] of o.entries()) {
    s.trim !== !1 && (l[l.length - 1] = (l.at(-1) ?? "").trimStart());
    let f = S(l.at(-1) ?? "");
    if (h !== 0 && (f >= e && (s.wordWrap === !1 || s.trim === !1) && (l.push(""), f = 0), (f > 0 || s.trim === !1) && (l[l.length - 1] += " ", f++)), s.hard && a[h] > e) {
      let v = e - f, p = 1 + Math.floor((a[h] - v - 1) / e);
      Math.floor((a[h] - 1) / e) < p && l.push(""), G(l, u, e);
      continue;
    }
    if (f + a[h] > e && f > 0 && a[h] > 0) {
      if (s.wordWrap === !1 && f < e) {
        G(l, u, e);
        continue;
      }
      l.push("");
    }
    if (f + a[h] > e && s.wordWrap === !1) {
      G(l, u, e);
      continue;
    }
    l[l.length - 1] += u;
  }
  s.trim !== !1 && (l = l.map((h) => vt(h)));
  let E = l.join(`
`), g = E[Symbol.iterator](), m = g.next(), A = g.next(), V2 = 0;
  for (; !m.done; ) {
    let h = m.value, u = A.value;
    if (i += h, h === W || h === Z) {
      et.lastIndex = V2 + 1;
      let p = et.exec(E)?.groups;
      if (p?.code !== void 0) {
        let d2 = Number.parseFloat(p.code);
        r = d2 === pt ? void 0 : d2;
      } else p?.uri !== void 0 && (n = p.uri.length === 0 ? void 0 : p.uri);
    }
    let f = r ? mt(r) : void 0;
    u === `
` ? (n && (i += it("")), r && f && (i += st(f))) : h === `
` && (r && f && (i += st(r)), n && (i += it(n))), V2 += h.length, m = A, A = g.next();
  }
  return i;
};
function K(t2, e, s) {
  return String(t2).normalize().replaceAll(`\r
`, `
`).split(`
`).map((i) => Et(i, e, s)).join(`
`);
}
var At = ["up", "down", "left", "right", "space", "enter", "cancel"], _ = { actions: new Set(At), aliases: /* @__PURE__ */ new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"], ["", "cancel"], ["escape", "cancel"]]), messages: { cancel: "Canceled", error: "Something went wrong" }, withGuide: !0 };
function H(t2, e) {
  if (typeof t2 == "string") return _.aliases.get(t2) === e;
  for (let s of t2) if (s !== void 0 && H(s, e)) return !0;
  return !1;
}
function _t(t2, e) {
  if (t2 === e) return;
  let s = t2.split(`
`), i = e.split(`
`), r = Math.max(s.length, i.length), n = [];
  for (let o = 0; o < r; o++) s[o] !== i[o] && n.push(o);
  return { lines: n, numLinesBefore: s.length, numLinesAfter: i.length, numLines: r };
}
var bt = globalThis.process.platform.startsWith("win"), z = Symbol("clack:cancel");
function Ct(t2) {
  return t2 === z;
}
function T(t2, e) {
  let s = t2;
  s.isTTY && s.setRawMode(e);
}
function xt({ input: t2 = q, output: e = R, overwrite: s = !0, hideCursor: i = !0 } = {}) {
  let r = k.createInterface({ input: t2, output: e, prompt: "", tabSize: 1 });
  k.emitKeypressEvents(t2, r), t2 instanceof J && t2.isTTY && t2.setRawMode(!0);
  let n = (o, { name: a, sequence: l }) => {
    let E = String(o);
    if (H([E, a, l], "cancel")) {
      i && e.write(import_sisteransi.cursor.show), process.exit(0);
      return;
    }
    if (!s) return;
    k.moveCursor(e, a === "return" ? 0 : -1, a === "return" ? -1 : 0, () => {
      k.clearLine(e, 1, () => {
        t2.once("keypress", n);
      });
    });
  };
  return i && e.write(import_sisteransi.cursor.hide), t2.once("keypress", n), () => {
    t2.off("keypress", n), i && e.write(import_sisteransi.cursor.show), t2 instanceof J && t2.isTTY && !bt && t2.setRawMode(!1), r.terminal = !1, r.close();
  };
}
var rt = (t2) => "columns" in t2 && typeof t2.columns == "number" ? t2.columns : 80, nt = (t2) => "rows" in t2 && typeof t2.rows == "number" ? t2.rows : 20;
function Bt(t2, e, s, i = s) {
  let r = rt(t2 ?? R);
  return K(e, r - s.length, { hard: !0, trim: !1 }).split(`
`).map((n, o) => `${o === 0 ? i : s}${n}`).join(`
`);
}
var x = class {
  input;
  output;
  _abortSignal;
  rl;
  opts;
  _render;
  _track = !1;
  _prevFrame = "";
  _subscribers = /* @__PURE__ */ new Map();
  _cursor = 0;
  state = "initial";
  error = "";
  value;
  userInput = "";
  constructor(e, s = !0) {
    let { input: i = q, output: r = R, render: n, signal: o, ...a } = e;
    this.opts = a, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = n.bind(this), this._track = s, this._abortSignal = o, this.input = i, this.output = r;
  }
  unsubscribe() {
    this._subscribers.clear();
  }
  setSubscriber(e, s) {
    let i = this._subscribers.get(e) ?? [];
    i.push(s), this._subscribers.set(e, i);
  }
  on(e, s) {
    this.setSubscriber(e, { cb: s });
  }
  once(e, s) {
    this.setSubscriber(e, { cb: s, once: !0 });
  }
  emit(e, ...s) {
    let i = this._subscribers.get(e) ?? [], r = [];
    for (let n of i) n.cb(...s), n.once && r.push(() => i.splice(i.indexOf(n), 1));
    for (let n of r) n();
  }
  prompt() {
    return new Promise((e) => {
      if (this._abortSignal) {
        if (this._abortSignal.aborted) return this.state = "cancel", this.close(), e(z);
        this._abortSignal.addEventListener("abort", () => {
          this.state = "cancel", this.close();
        }, { once: !0 });
      }
      this.rl = ot.createInterface({ input: this.input, tabSize: 2, prompt: "", escapeCodeTimeout: 50, terminal: !0 }), this.rl.prompt(), this.opts.initialUserInput !== void 0 && this._setUserInput(this.opts.initialUserInput, !0), this.input.on("keypress", this.onKeypress), T(this.input, !0), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), T(this.input, !1), e(this.value);
      }), this.once("cancel", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), T(this.input, !1), e(z);
      });
    });
  }
  _isActionKey(e, s) {
    return e === "	";
  }
  _setValue(e) {
    this.value = e, this.emit("value", this.value);
  }
  _setUserInput(e, s) {
    this.userInput = e ?? "", this.emit("userInput", this.userInput), s && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
  }
  _clearUserInput() {
    this.rl?.write(null, { ctrl: !0, name: "u" }), this._setUserInput("");
  }
  onKeypress(e, s) {
    if (this._track && s.name !== "return" && (s.name && this._isActionKey(e, s) && this.rl?.write(null, { ctrl: !0, name: "h" }), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), s?.name && (!this._track && _.aliases.has(s.name) && this.emit("cursor", _.aliases.get(s.name)), _.actions.has(s.name) && this.emit("cursor", s.name)), e && (e.toLowerCase() === "y" || e.toLowerCase() === "n") && this.emit("confirm", e.toLowerCase() === "y"), this.emit("key", e?.toLowerCase(), s), s?.name === "return") {
      if (this.opts.validate) {
        let i = this.opts.validate(this.value);
        i && (this.error = i instanceof Error ? i.message : i, this.state = "error", this.rl?.write(this.userInput));
      }
      this.state !== "error" && (this.state = "submit");
    }
    H([e, s?.name, s?.sequence], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), T(this.input, !1), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    let e = K(this._prevFrame, process.stdout.columns, { hard: !0, trim: !1 }).split(`
`).length - 1;
    this.output.write(import_sisteransi.cursor.move(-999, e * -1));
  }
  render() {
    let e = K(this._render(this) ?? "", process.stdout.columns, { hard: !0, trim: !1 });
    if (e !== this._prevFrame) {
      if (this.state === "initial") this.output.write(import_sisteransi.cursor.hide);
      else {
        let s = _t(this._prevFrame, e), i = nt(this.output);
        if (this.restoreCursor(), s) {
          let r = Math.max(0, s.numLinesAfter - i), n = Math.max(0, s.numLinesBefore - i), o = s.lines.find((a) => a >= r);
          if (o === void 0) {
            this._prevFrame = e;
            return;
          }
          if (s.lines.length === 1) {
            this.output.write(import_sisteransi.cursor.move(0, o - n)), this.output.write(import_sisteransi.erase.lines(1));
            let a = e.split(`
`);
            this.output.write(a[o]), this._prevFrame = e, this.output.write(import_sisteransi.cursor.move(0, a.length - o - 1));
            return;
          } else if (s.lines.length > 1) {
            if (r < n) o = r;
            else {
              let l = o - n;
              l > 0 && this.output.write(import_sisteransi.cursor.move(0, l));
            }
            this.output.write(import_sisteransi.erase.down());
            let a = e.split(`
`).slice(o);
            this.output.write(a.join(`
`)), this._prevFrame = e;
            return;
          }
        }
        this.output.write(import_sisteransi.erase.down());
      }
      this.output.write(e), this.state === "initial" && (this.state = "active"), this._prevFrame = e;
    }
  }
};
var kt = class extends x {
  get cursor() {
    return this.value ? 0 : 1;
  }
  get _value() {
    return this.cursor === 0;
  }
  constructor(e) {
    super(e, !1), this.value = !!e.initialValue, this.on("userInput", () => {
      this.value = this._value;
    }), this.on("confirm", (s) => {
      this.output.write(import_sisteransi.cursor.move(0, -1)), this.value = s, this.state = "submit", this.close();
    }), this.on("cursor", () => {
      this.value = !this.value;
    });
  }
};
function D(t2, e, s) {
  let i = t2 + e, r = Math.max(s.length - 1, 0), n = i < 0 ? r : i > r ? 0 : i;
  return s[n].disabled ? D(n, e < 0 ? -1 : 1, s) : n;
}
var Mt = class extends x {
  options;
  cursor = 0;
  get _value() {
    return this.options[this.cursor].value;
  }
  get _enabledOptions() {
    return this.options.filter((e) => e.disabled !== !0);
  }
  toggleAll() {
    let e = this._enabledOptions, s = this.value !== void 0 && this.value.length === e.length;
    this.value = s ? [] : e.map((i) => i.value);
  }
  toggleInvert() {
    let e = this.value;
    if (!e) return;
    let s = this._enabledOptions.filter((i) => !e.includes(i.value));
    this.value = s.map((i) => i.value);
  }
  toggleValue() {
    this.value === void 0 && (this.value = []);
    let e = this.value.includes(this._value);
    this.value = e ? this.value.filter((s) => s !== this._value) : [...this.value, this._value];
  }
  constructor(e) {
    super(e, !1), this.options = e.options, this.value = [...e.initialValues ?? []];
    let s = Math.max(this.options.findIndex(({ value: i }) => i === e.cursorAt), 0);
    this.cursor = this.options[s].disabled ? D(s, 1, this.options) : s, this.on("key", (i) => {
      i === "a" && this.toggleAll(), i === "i" && this.toggleInvert();
    }), this.on("cursor", (i) => {
      switch (i) {
        case "left":
        case "up":
          this.cursor = D(this.cursor, -1, this.options);
          break;
        case "down":
        case "right":
          this.cursor = D(this.cursor, 1, this.options);
          break;
        case "space":
          this.toggleValue();
          break;
      }
    });
  }
};
var Wt = class extends x {
  options;
  cursor = 0;
  get _selectedValue() {
    return this.options[this.cursor];
  }
  changeValue() {
    this.value = this._selectedValue.value;
  }
  constructor(e) {
    super(e, !1), this.options = e.options;
    let s = this.options.findIndex(({ value: r }) => r === e.initialValue), i = s === -1 ? 0 : s;
    this.cursor = this.options[i].disabled ? D(i, 1, this.options) : i, this.changeValue(), this.on("cursor", (r) => {
      switch (r) {
        case "left":
        case "up":
          this.cursor = D(this.cursor, -1, this.options);
          break;
        case "down":
        case "right":
          this.cursor = D(this.cursor, 1, this.options);
          break;
      }
      this.changeValue();
    });
  }
};
var $t = class extends x {
  get userInputWithCursor() {
    if (this.state === "submit") return this.userInput;
    let e = this.userInput;
    if (this.cursor >= e.length) return `${this.userInput}\u2588`;
    let s = e.slice(0, this.cursor), [i, ...r] = e.slice(this.cursor);
    return `${s}${import_picocolors.default.inverse(i)}${r.join("")}`;
  }
  get cursor() {
    return this._cursor;
  }
  constructor(e) {
    super({ ...e, initialUserInput: e.initialUserInput ?? e.initialValue }), this.on("userInput", (s) => {
      this._setValue(s);
    }), this.on("finalize", () => {
      this.value || (this.value = e.defaultValue), this.value === void 0 && (this.value = "");
    });
  }
};

// ../node_modules/@clack/prompts/dist/index.mjs
var import_picocolors2 = __toESM(require_picocolors(), 1);
import N2 from "node:process";
var import_sisteransi2 = __toESM(require_src(), 1);
function ht2() {
  return N2.platform !== "win32" ? N2.env.TERM !== "linux" : !!N2.env.CI || !!N2.env.WT_SESSION || !!N2.env.TERMINUS_SUBLIME || N2.env.ConEmuTask === "{cmd::Cmder}" || N2.env.TERM_PROGRAM === "Terminus-Sublime" || N2.env.TERM_PROGRAM === "vscode" || N2.env.TERM === "xterm-256color" || N2.env.TERM === "alacritty" || N2.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var ee = ht2(), ue = () => process.env.CI === "true", Te = (e) => e.isTTY === !0, I2 = (e, r) => ee ? e : r, Me = I2("\u25C6", "*"), ce = I2("\u25A0", "x"), de = I2("\u25B2", "x"), j2 = I2("\u25C7", "o"), $e = I2("\u250C", "T"), d = I2("\u2502", "|"), x2 = I2("\u2514", "\u2014"), Re = I2("\u2510", "T"), Oe = I2("\u2518", "\u2014"), Y = I2("\u25CF", ">"), K2 = I2("\u25CB", " "), te = I2("\u25FB", "[\u2022]"), V = I2("\u25FC", "[+]"), z2 = I2("\u25FB", "[ ]"), Ne = I2("\u25AA", "\u2022"), se = I2("\u2500", "-"), he = I2("\u256E", "+"), Pe = I2("\u251C", "+"), me = I2("\u256F", "+"), pe = I2("\u2570", "+"), We = I2("\u256D", "+"), ge = I2("\u25CF", "\u2022"), fe = I2("\u25C6", "*"), Fe = I2("\u25B2", "!"), ye = I2("\u25A0", "x"), W2 = (e) => {
  switch (e) {
    case "initial":
    case "active":
      return import_picocolors2.default.cyan(Me);
    case "cancel":
      return import_picocolors2.default.red(ce);
    case "error":
      return import_picocolors2.default.yellow(de);
    case "submit":
      return import_picocolors2.default.green(j2);
  }
}, Ee = (e) => {
  switch (e) {
    case "initial":
    case "active":
      return import_picocolors2.default.cyan(d);
    case "cancel":
      return import_picocolors2.default.red(d);
    case "error":
      return import_picocolors2.default.yellow(d);
    case "submit":
      return import_picocolors2.default.green(d);
  }
}, mt2 = (e) => e === 161 || e === 164 || e === 167 || e === 168 || e === 170 || e === 173 || e === 174 || e >= 176 && e <= 180 || e >= 182 && e <= 186 || e >= 188 && e <= 191 || e === 198 || e === 208 || e === 215 || e === 216 || e >= 222 && e <= 225 || e === 230 || e >= 232 && e <= 234 || e === 236 || e === 237 || e === 240 || e === 242 || e === 243 || e >= 247 && e <= 250 || e === 252 || e === 254 || e === 257 || e === 273 || e === 275 || e === 283 || e === 294 || e === 295 || e === 299 || e >= 305 && e <= 307 || e === 312 || e >= 319 && e <= 322 || e === 324 || e >= 328 && e <= 331 || e === 333 || e === 338 || e === 339 || e === 358 || e === 359 || e === 363 || e === 462 || e === 464 || e === 466 || e === 468 || e === 470 || e === 472 || e === 474 || e === 476 || e === 593 || e === 609 || e === 708 || e === 711 || e >= 713 && e <= 715 || e === 717 || e === 720 || e >= 728 && e <= 731 || e === 733 || e === 735 || e >= 768 && e <= 879 || e >= 913 && e <= 929 || e >= 931 && e <= 937 || e >= 945 && e <= 961 || e >= 963 && e <= 969 || e === 1025 || e >= 1040 && e <= 1103 || e === 1105 || e === 8208 || e >= 8211 && e <= 8214 || e === 8216 || e === 8217 || e === 8220 || e === 8221 || e >= 8224 && e <= 8226 || e >= 8228 && e <= 8231 || e === 8240 || e === 8242 || e === 8243 || e === 8245 || e === 8251 || e === 8254 || e === 8308 || e === 8319 || e >= 8321 && e <= 8324 || e === 8364 || e === 8451 || e === 8453 || e === 8457 || e === 8467 || e === 8470 || e === 8481 || e === 8482 || e === 8486 || e === 8491 || e === 8531 || e === 8532 || e >= 8539 && e <= 8542 || e >= 8544 && e <= 8555 || e >= 8560 && e <= 8569 || e === 8585 || e >= 8592 && e <= 8601 || e === 8632 || e === 8633 || e === 8658 || e === 8660 || e === 8679 || e === 8704 || e === 8706 || e === 8707 || e === 8711 || e === 8712 || e === 8715 || e === 8719 || e === 8721 || e === 8725 || e === 8730 || e >= 8733 && e <= 8736 || e === 8739 || e === 8741 || e >= 8743 && e <= 8748 || e === 8750 || e >= 8756 && e <= 8759 || e === 8764 || e === 8765 || e === 8776 || e === 8780 || e === 8786 || e === 8800 || e === 8801 || e >= 8804 && e <= 8807 || e === 8810 || e === 8811 || e === 8814 || e === 8815 || e === 8834 || e === 8835 || e === 8838 || e === 8839 || e === 8853 || e === 8857 || e === 8869 || e === 8895 || e === 8978 || e >= 9312 && e <= 9449 || e >= 9451 && e <= 9547 || e >= 9552 && e <= 9587 || e >= 9600 && e <= 9615 || e >= 9618 && e <= 9621 || e === 9632 || e === 9633 || e >= 9635 && e <= 9641 || e === 9650 || e === 9651 || e === 9654 || e === 9655 || e === 9660 || e === 9661 || e === 9664 || e === 9665 || e >= 9670 && e <= 9672 || e === 9675 || e >= 9678 && e <= 9681 || e >= 9698 && e <= 9701 || e === 9711 || e === 9733 || e === 9734 || e === 9737 || e === 9742 || e === 9743 || e === 9756 || e === 9758 || e === 9792 || e === 9794 || e === 9824 || e === 9825 || e >= 9827 && e <= 9829 || e >= 9831 && e <= 9834 || e === 9836 || e === 9837 || e === 9839 || e === 9886 || e === 9887 || e === 9919 || e >= 9926 && e <= 9933 || e >= 9935 && e <= 9939 || e >= 9941 && e <= 9953 || e === 9955 || e === 9960 || e === 9961 || e >= 9963 && e <= 9969 || e === 9972 || e >= 9974 && e <= 9977 || e === 9979 || e === 9980 || e === 9982 || e === 9983 || e === 10045 || e >= 10102 && e <= 10111 || e >= 11094 && e <= 11097 || e >= 12872 && e <= 12879 || e >= 57344 && e <= 63743 || e >= 65024 && e <= 65039 || e === 65533 || e >= 127232 && e <= 127242 || e >= 127248 && e <= 127277 || e >= 127280 && e <= 127337 || e >= 127344 && e <= 127373 || e === 127375 || e === 127376 || e >= 127387 && e <= 127404 || e >= 917760 && e <= 917999 || e >= 983040 && e <= 1048573 || e >= 1048576 && e <= 1114109, pt2 = (e) => e === 12288 || e >= 65281 && e <= 65376 || e >= 65504 && e <= 65510, gt2 = (e) => e >= 4352 && e <= 4447 || e === 8986 || e === 8987 || e === 9001 || e === 9002 || e >= 9193 && e <= 9196 || e === 9200 || e === 9203 || e === 9725 || e === 9726 || e === 9748 || e === 9749 || e >= 9800 && e <= 9811 || e === 9855 || e === 9875 || e === 9889 || e === 9898 || e === 9899 || e === 9917 || e === 9918 || e === 9924 || e === 9925 || e === 9934 || e === 9940 || e === 9962 || e === 9970 || e === 9971 || e === 9973 || e === 9978 || e === 9981 || e === 9989 || e === 9994 || e === 9995 || e === 10024 || e === 10060 || e === 10062 || e >= 10067 && e <= 10069 || e === 10071 || e >= 10133 && e <= 10135 || e === 10160 || e === 10175 || e === 11035 || e === 11036 || e === 11088 || e === 11093 || e >= 11904 && e <= 11929 || e >= 11931 && e <= 12019 || e >= 12032 && e <= 12245 || e >= 12272 && e <= 12287 || e >= 12289 && e <= 12350 || e >= 12353 && e <= 12438 || e >= 12441 && e <= 12543 || e >= 12549 && e <= 12591 || e >= 12593 && e <= 12686 || e >= 12688 && e <= 12771 || e >= 12783 && e <= 12830 || e >= 12832 && e <= 12871 || e >= 12880 && e <= 19903 || e >= 19968 && e <= 42124 || e >= 42128 && e <= 42182 || e >= 43360 && e <= 43388 || e >= 44032 && e <= 55203 || e >= 63744 && e <= 64255 || e >= 65040 && e <= 65049 || e >= 65072 && e <= 65106 || e >= 65108 && e <= 65126 || e >= 65128 && e <= 65131 || e >= 94176 && e <= 94180 || e === 94192 || e === 94193 || e >= 94208 && e <= 100343 || e >= 100352 && e <= 101589 || e >= 101632 && e <= 101640 || e >= 110576 && e <= 110579 || e >= 110581 && e <= 110587 || e === 110589 || e === 110590 || e >= 110592 && e <= 110882 || e === 110898 || e >= 110928 && e <= 110930 || e === 110933 || e >= 110948 && e <= 110951 || e >= 110960 && e <= 111355 || e === 126980 || e === 127183 || e === 127374 || e >= 127377 && e <= 127386 || e >= 127488 && e <= 127490 || e >= 127504 && e <= 127547 || e >= 127552 && e <= 127560 || e === 127568 || e === 127569 || e >= 127584 && e <= 127589 || e >= 127744 && e <= 127776 || e >= 127789 && e <= 127797 || e >= 127799 && e <= 127868 || e >= 127870 && e <= 127891 || e >= 127904 && e <= 127946 || e >= 127951 && e <= 127955 || e >= 127968 && e <= 127984 || e === 127988 || e >= 127992 && e <= 128062 || e === 128064 || e >= 128066 && e <= 128252 || e >= 128255 && e <= 128317 || e >= 128331 && e <= 128334 || e >= 128336 && e <= 128359 || e === 128378 || e === 128405 || e === 128406 || e === 128420 || e >= 128507 && e <= 128591 || e >= 128640 && e <= 128709 || e === 128716 || e >= 128720 && e <= 128722 || e >= 128725 && e <= 128727 || e >= 128732 && e <= 128735 || e === 128747 || e === 128748 || e >= 128756 && e <= 128764 || e >= 128992 && e <= 129003 || e === 129008 || e >= 129292 && e <= 129338 || e >= 129340 && e <= 129349 || e >= 129351 && e <= 129535 || e >= 129648 && e <= 129660 || e >= 129664 && e <= 129672 || e >= 129680 && e <= 129725 || e >= 129727 && e <= 129733 || e >= 129742 && e <= 129755 || e >= 129760 && e <= 129768 || e >= 129776 && e <= 129784 || e >= 131072 && e <= 196605 || e >= 196608 && e <= 262141, ve = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/y, re = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y, ie = /\t{1,1000}/y, Ae = new RegExp("[\\u{1F1E6}-\\u{1F1FF}]{2}|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2}[\\u{E0030}-\\u{E0039}\\u{E0061}-\\u{E007A}]{1,3}\\u{E007F}|(?:\\p{Emoji}\\uFE0F\\u20E3?|\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation})(?:\\u200D(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F\\u20E3?))*", "yu"), ne = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y, ft2 = new RegExp("\\p{M}+", "gu"), Ft2 = { limit: 1 / 0, ellipsis: "" }, Le = (e, r = {}, s = {}) => {
  let i = r.limit ?? 1 / 0, n = r.ellipsis ?? "", l = r?.ellipsisWidth ?? (n ? Le(n, Ft2, s).width : 0), u = s.ansiWidth ?? 0, a = s.controlWidth ?? 0, o = s.tabWidth ?? 8, $ = s.ambiguousWidth ?? 1, y2 = s.emojiWidth ?? 2, E = s.fullWidthWidth ?? 2, p = s.regularWidth ?? 1, f = s.wideWidth ?? 2, c = 0, m = 0, h = e.length, g = 0, F = !1, v = h, S2 = Math.max(0, i - l), B = 0, b = 0, A = 0, C = 0;
  e: for (; ; ) {
    if (b > B || m >= h && m > c) {
      let _2 = e.slice(B, b) || e.slice(c, m);
      g = 0;
      for (let D2 of _2.replaceAll(ft2, "")) {
        let T2 = D2.codePointAt(0) || 0;
        if (pt2(T2) ? C = E : gt2(T2) ? C = f : $ !== p && mt2(T2) ? C = $ : C = p, A + C > S2 && (v = Math.min(v, Math.max(B, c) + g)), A + C > i) {
          F = !0;
          break e;
        }
        g += D2.length, A += C;
      }
      B = b = 0;
    }
    if (m >= h) break;
    if (ne.lastIndex = m, ne.test(e)) {
      if (g = ne.lastIndex - m, C = g * p, A + C > S2 && (v = Math.min(v, m + Math.floor((S2 - A) / p))), A + C > i) {
        F = !0;
        break;
      }
      A += C, B = c, b = m, m = c = ne.lastIndex;
      continue;
    }
    if (ve.lastIndex = m, ve.test(e)) {
      if (A + u > S2 && (v = Math.min(v, m)), A + u > i) {
        F = !0;
        break;
      }
      A += u, B = c, b = m, m = c = ve.lastIndex;
      continue;
    }
    if (re.lastIndex = m, re.test(e)) {
      if (g = re.lastIndex - m, C = g * a, A + C > S2 && (v = Math.min(v, m + Math.floor((S2 - A) / a))), A + C > i) {
        F = !0;
        break;
      }
      A += C, B = c, b = m, m = c = re.lastIndex;
      continue;
    }
    if (ie.lastIndex = m, ie.test(e)) {
      if (g = ie.lastIndex - m, C = g * o, A + C > S2 && (v = Math.min(v, m + Math.floor((S2 - A) / o))), A + C > i) {
        F = !0;
        break;
      }
      A += C, B = c, b = m, m = c = ie.lastIndex;
      continue;
    }
    if (Ae.lastIndex = m, Ae.test(e)) {
      if (A + y2 > S2 && (v = Math.min(v, m)), A + y2 > i) {
        F = !0;
        break;
      }
      A += y2, B = c, b = m, m = c = Ae.lastIndex;
      continue;
    }
    m += 1;
  }
  return { width: F ? S2 : A, index: F ? v : h, truncated: F, ellipsed: F && i >= l };
}, yt2 = { limit: 1 / 0, ellipsis: "", ellipsisWidth: 0 }, M2 = (e, r = {}) => Le(e, yt2, r).width, ae = "\x1B", je = "\x9B", Et2 = 39, Ce = "\x07", Ve = "[", vt2 = "]", ke = "m", Ie = `${vt2}8;;`, Ge = new RegExp(`(?:\\${Ve}(?<code>\\d+)m|\\${Ie}(?<uri>.*)${Ce})`, "y"), At2 = (e) => {
  if (e >= 30 && e <= 37 || e >= 90 && e <= 97) return 39;
  if (e >= 40 && e <= 47 || e >= 100 && e <= 107) return 49;
  if (e === 1 || e === 2) return 22;
  if (e === 3) return 23;
  if (e === 4) return 24;
  if (e === 7) return 27;
  if (e === 8) return 28;
  if (e === 9) return 29;
  if (e === 0) return 0;
}, He = (e) => `${ae}${Ve}${e}${ke}`, Ue = (e) => `${ae}${Ie}${e}${Ce}`, Ct2 = (e) => e.map((r) => M2(r)), Se = (e, r, s) => {
  let i = r[Symbol.iterator](), n = !1, l = !1, u = e.at(-1), a = u === void 0 ? 0 : M2(u), o = i.next(), $ = i.next(), y2 = 0;
  for (; !o.done; ) {
    let E = o.value, p = M2(E);
    a + p <= s ? e[e.length - 1] += E : (e.push(E), a = 0), (E === ae || E === je) && (n = !0, l = r.startsWith(Ie, y2 + 1)), n ? l ? E === Ce && (n = !1, l = !1) : E === ke && (n = !1) : (a += p, a === s && !$.done && (e.push(""), a = 0)), o = $, $ = i.next(), y2 += E.length;
  }
  u = e.at(-1), !a && u !== void 0 && u.length > 0 && e.length > 1 && (e[e.length - 2] += e.pop());
}, It2 = (e) => {
  let r = e.split(" "), s = r.length;
  for (; s > 0 && !(M2(r[s - 1]) > 0); ) s--;
  return s === r.length ? e : r.slice(0, s).join(" ") + r.slice(s).join("");
}, St = (e, r, s = {}) => {
  if (s.trim !== !1 && e.trim() === "") return "";
  let i = "", n, l, u = e.split(" "), a = Ct2(u), o = [""];
  for (let [c, m] of u.entries()) {
    s.trim !== !1 && (o[o.length - 1] = (o.at(-1) ?? "").trimStart());
    let h = M2(o.at(-1) ?? "");
    if (c !== 0 && (h >= r && (s.wordWrap === !1 || s.trim === !1) && (o.push(""), h = 0), (h > 0 || s.trim === !1) && (o[o.length - 1] += " ", h++)), s.hard && a[c] > r) {
      let g = r - h, F = 1 + Math.floor((a[c] - g - 1) / r);
      Math.floor((a[c] - 1) / r) < F && o.push(""), Se(o, m, r);
      continue;
    }
    if (h + a[c] > r && h > 0 && a[c] > 0) {
      if (s.wordWrap === !1 && h < r) {
        Se(o, m, r);
        continue;
      }
      o.push("");
    }
    if (h + a[c] > r && s.wordWrap === !1) {
      Se(o, m, r);
      continue;
    }
    o[o.length - 1] += m;
  }
  s.trim !== !1 && (o = o.map((c) => It2(c)));
  let $ = o.join(`
`), y2 = $[Symbol.iterator](), E = y2.next(), p = y2.next(), f = 0;
  for (; !E.done; ) {
    let c = E.value, m = p.value;
    if (i += c, c === ae || c === je) {
      Ge.lastIndex = f + 1;
      let F = Ge.exec($)?.groups;
      if (F?.code !== void 0) {
        let v = Number.parseFloat(F.code);
        n = v === Et2 ? void 0 : v;
      } else F?.uri !== void 0 && (l = F.uri.length === 0 ? void 0 : F.uri);
    }
    let h = n ? At2(n) : void 0;
    m === `
` ? (l && (i += Ue("")), n && h && (i += He(h))) : c === `
` && (n && h && (i += He(n)), l && (i += Ue(l))), f += c.length, E = p, p = y2.next();
  }
  return i;
};
function q2(e, r, s) {
  return String(e).normalize().replaceAll(`\r
`, `
`).split(`
`).map((i) => St(i, r, s)).join(`
`);
}
var wt = (e, r, s, i, n) => {
  let l = r, u = 0;
  for (let a = s; a < i; a++) {
    let o = e[a];
    if (l = l - o.length, u++, l <= n) break;
  }
  return { lineCount: l, removals: u };
}, J2 = (e) => {
  let { cursor: r, options: s, style: i } = e, n = e.output ?? process.stdout, l = rt(n), u = e.columnPadding ?? 0, a = e.rowPadding ?? 4, o = l - u, $ = nt(n), y2 = import_picocolors2.default.dim("..."), E = e.maxItems ?? Number.POSITIVE_INFINITY, p = Math.max($ - a, 0), f = Math.max(Math.min(E, p), 5), c = 0;
  r >= f - 3 && (c = Math.max(Math.min(r - f + 3, s.length - f), 0));
  let m = f < s.length && c > 0, h = f < s.length && c + f < s.length, g = Math.min(c + f, s.length), F = [], v = 0;
  m && v++, h && v++;
  let S2 = c + (m ? 1 : 0), B = g - (h ? 1 : 0);
  for (let A = S2; A < B; A++) {
    let C = q2(i(s[A], A === r), o, { hard: !0, trim: !1 }).split(`
`);
    F.push(C), v += C.length;
  }
  if (v > p) {
    let A = 0, C = 0, _2 = v, D2 = r - S2, T2 = (L2, w2) => wt(F, _2, L2, w2, p);
    m ? ({ lineCount: _2, removals: A } = T2(0, D2), _2 > p && ({ lineCount: _2, removals: C } = T2(D2 + 1, F.length))) : ({ lineCount: _2, removals: C } = T2(D2 + 1, F.length), _2 > p && ({ lineCount: _2, removals: A } = T2(0, D2))), A > 0 && (m = !0, F.splice(0, A)), C > 0 && (h = !0, F.splice(F.length - C, C));
  }
  let b = [];
  m && b.push(y2);
  for (let A of F) for (let C of A) b.push(C);
  return h && b.push(y2), b;
};
var xt2 = [We, he, pe, me], _t2 = [$e, Re, x2, Oe];
function Xe(e, r, s, i) {
  let n = s, l = s;
  return i === "center" ? n = Math.floor((r - e) / 2) : i === "right" && (n = r - e - s), l = r - n - e, [n, l];
}
var Dt = (e) => e, Tt2 = (e = "", r = "", s) => {
  let i = s?.output ?? process.stdout, n = rt(i), l = 2, u = s?.titlePadding ?? 1, a = s?.contentPadding ?? 2, o = s?.width === void 0 || s.width === "auto" ? 1 : Math.min(1, s.width), $ = (s?.withGuide ?? _.withGuide) !== !1 ? `${d} ` : "", y2 = s?.formatBorder ?? Dt, E = (s?.rounded ? xt2 : _t2).map(y2), p = y2(se), f = y2(d), c = M2($), m = M2(r), h = n - c, g = Math.floor(n * o) - c;
  if (s?.width === "auto") {
    let _2 = e.split(`
`), D2 = m + u * 2;
    for (let L2 of _2) {
      let w2 = M2(L2) + a * 2;
      w2 > D2 && (D2 = w2);
    }
    let T2 = D2 + l;
    T2 < g && (g = T2);
  }
  g % 2 !== 0 && (g < h ? g++ : g--);
  let F = g - l, v = F - u * 2, S2 = m > v ? `${r.slice(0, v - 3)}...` : r, [B, b] = Xe(M2(S2), F, u, s?.titleAlign), A = q2(e, F - a * 2, { hard: !0, trim: !1 });
  i.write(`${$}${E[0]}${p.repeat(B)}${S2}${p.repeat(b)}${E[1]}
`);
  let C = A.split(`
`);
  for (let _2 of C) {
    let [D2, T2] = Xe(M2(_2), F, a, s?.contentAlign);
    i.write(`${$}${f}${" ".repeat(D2)}${_2}${" ".repeat(T2)}${f}
`);
  }
  i.write(`${$}${E[2]}${p.repeat(F)}${E[3]}
`);
}, Mt2 = (e) => {
  let r = e.active ?? "Yes", s = e.inactive ?? "No";
  return new kt({ active: r, inactive: s, signal: e.signal, input: e.input, output: e.output, initialValue: e.initialValue ?? !0, render() {
    let i = `${import_picocolors2.default.gray(d)}
${W2(this.state)}  ${e.message}
`, n = this.value ? r : s;
    switch (this.state) {
      case "submit":
        return `${i}${import_picocolors2.default.gray(d)}  ${import_picocolors2.default.dim(n)}`;
      case "cancel":
        return `${i}${import_picocolors2.default.gray(d)}  ${import_picocolors2.default.strikethrough(import_picocolors2.default.dim(n))}
${import_picocolors2.default.gray(d)}`;
      default:
        return `${i}${import_picocolors2.default.cyan(d)}  ${this.value ? `${import_picocolors2.default.green(Y)} ${r}` : `${import_picocolors2.default.dim(K2)} ${import_picocolors2.default.dim(r)}`} ${import_picocolors2.default.dim("/")} ${this.value ? `${import_picocolors2.default.dim(K2)} ${import_picocolors2.default.dim(s)}` : `${import_picocolors2.default.green(Y)} ${s}`}
${import_picocolors2.default.cyan(x2)}
`;
    }
  } }).prompt();
};
var R2 = { message: (e = [], { symbol: r = import_picocolors2.default.gray(d), secondarySymbol: s = import_picocolors2.default.gray(d), output: i = process.stdout, spacing: n = 1, withGuide: l } = {}) => {
  let u = [], a = (l ?? _.withGuide) !== !1, o = a ? s : "", $ = a ? `${r}  ` : "", y2 = a ? `${s}  ` : "";
  for (let p = 0; p < n; p++) u.push(o);
  let E = Array.isArray(e) ? e : e.split(`
`);
  if (E.length > 0) {
    let [p, ...f] = E;
    p.length > 0 ? u.push(`${$}${p}`) : u.push(a ? "" : r);
    for (let c of f) c.length > 0 ? u.push(`${y2}${c}`) : u.push(a ? "" : s);
  }
  i.write(`${u.join(`
`)}
`);
}, info: (e, r) => {
  R2.message(e, { ...r, symbol: import_picocolors2.default.blue(ge) });
}, success: (e, r) => {
  R2.message(e, { ...r, symbol: import_picocolors2.default.green(fe) });
}, step: (e, r) => {
  R2.message(e, { ...r, symbol: import_picocolors2.default.green(j2) });
}, warn: (e, r) => {
  R2.message(e, { ...r, symbol: import_picocolors2.default.yellow(Fe) });
}, warning: (e, r) => {
  R2.warn(e, r);
}, error: (e, r) => {
  R2.message(e, { ...r, symbol: import_picocolors2.default.red(ye) });
} }, Nt = (e = "", r) => {
  (r?.output ?? process.stdout).write(`${import_picocolors2.default.gray(x2)}  ${import_picocolors2.default.red(e)}

`);
}, Pt = (e = "", r) => {
  (r?.output ?? process.stdout).write(`${import_picocolors2.default.gray($e)}  ${e}
`);
}, Wt2 = (e = "", r) => {
  (r?.output ?? process.stdout).write(`${import_picocolors2.default.gray(d)}
${import_picocolors2.default.gray(x2)}  ${e}

`);
}, Q2 = (e, r) => e.split(`
`).map((s) => r(s)).join(`
`), Lt2 = (e) => {
  let r = (i, n) => {
    let l = i.label ?? String(i.value);
    return n === "disabled" ? `${import_picocolors2.default.gray(z2)} ${Q2(l, import_picocolors2.default.gray)}${i.hint ? ` ${import_picocolors2.default.dim(`(${i.hint ?? "disabled"})`)}` : ""}` : n === "active" ? `${import_picocolors2.default.cyan(te)} ${l}${i.hint ? ` ${import_picocolors2.default.dim(`(${i.hint})`)}` : ""}` : n === "selected" ? `${import_picocolors2.default.green(V)} ${Q2(l, import_picocolors2.default.dim)}${i.hint ? ` ${import_picocolors2.default.dim(`(${i.hint})`)}` : ""}` : n === "cancelled" ? `${Q2(l, (u) => import_picocolors2.default.strikethrough(import_picocolors2.default.dim(u)))}` : n === "active-selected" ? `${import_picocolors2.default.green(V)} ${l}${i.hint ? ` ${import_picocolors2.default.dim(`(${i.hint})`)}` : ""}` : n === "submitted" ? `${Q2(l, import_picocolors2.default.dim)}` : `${import_picocolors2.default.dim(z2)} ${Q2(l, import_picocolors2.default.dim)}`;
  }, s = e.required ?? !0;
  return new Mt({ options: e.options, signal: e.signal, input: e.input, output: e.output, initialValues: e.initialValues, required: s, cursorAt: e.cursorAt, validate(i) {
    if (s && (i === void 0 || i.length === 0)) return `Please select at least one option.
${import_picocolors2.default.reset(import_picocolors2.default.dim(`Press ${import_picocolors2.default.gray(import_picocolors2.default.bgWhite(import_picocolors2.default.inverse(" space ")))} to select, ${import_picocolors2.default.gray(import_picocolors2.default.bgWhite(import_picocolors2.default.inverse(" enter ")))} to submit`))}`;
  }, render() {
    let i = Bt(e.output, e.message, `${Ee(this.state)}  `, `${W2(this.state)}  `), n = `${import_picocolors2.default.gray(d)}
${i}
`, l = this.value ?? [], u = (a, o) => {
      if (a.disabled) return r(a, "disabled");
      let $ = l.includes(a.value);
      return o && $ ? r(a, "active-selected") : $ ? r(a, "selected") : r(a, o ? "active" : "inactive");
    };
    switch (this.state) {
      case "submit": {
        let a = this.options.filter(({ value: $ }) => l.includes($)).map(($) => r($, "submitted")).join(import_picocolors2.default.dim(", ")) || import_picocolors2.default.dim("none"), o = Bt(e.output, a, `${import_picocolors2.default.gray(d)}  `);
        return `${n}${o}`;
      }
      case "cancel": {
        let a = this.options.filter(({ value: $ }) => l.includes($)).map(($) => r($, "cancelled")).join(import_picocolors2.default.dim(", "));
        if (a.trim() === "") return `${n}${import_picocolors2.default.gray(d)}`;
        let o = Bt(e.output, a, `${import_picocolors2.default.gray(d)}  `);
        return `${n}${o}
${import_picocolors2.default.gray(d)}`;
      }
      case "error": {
        let a = `${import_picocolors2.default.yellow(d)}  `, o = this.error.split(`
`).map(($, y2) => y2 === 0 ? `${import_picocolors2.default.yellow(x2)}  ${import_picocolors2.default.yellow($)}` : `   ${$}`).join(`
`);
        return `${n}${a}${J2({ output: e.output, options: this.options, cursor: this.cursor, maxItems: e.maxItems, columnPadding: a.length, style: u }).join(`
${a}`)}
${o}
`;
      }
      default: {
        let a = `${import_picocolors2.default.cyan(d)}  `;
        return `${n}${a}${J2({ output: e.output, options: this.options, cursor: this.cursor, maxItems: e.maxItems, columnPadding: a.length, style: u }).join(`
${a}`)}
${import_picocolors2.default.cyan(x2)}
`;
      }
    }
  } }).prompt();
};
var Ut = import_picocolors2.default.magenta, we = ({ indicator: e = "dots", onCancel: r, output: s = process.stdout, cancelMessage: i, errorMessage: n, frames: l = ee ? ["\u25D2", "\u25D0", "\u25D3", "\u25D1"] : ["\u2022", "o", "O", "0"], delay: u = ee ? 80 : 120, signal: a, ...o } = {}) => {
  let $ = ue(), y2, E, p = !1, f = !1, c = "", m, h = performance.now(), g = rt(s), F = o?.styleFrame ?? Ut, v = (w2) => {
    let O2 = w2 > 1 ? n ?? _.messages.error : i ?? _.messages.cancel;
    f = w2 === 1, p && (L2(O2, w2), f && typeof r == "function" && r());
  }, S2 = () => v(2), B = () => v(1), b = () => {
    process.on("uncaughtExceptionMonitor", S2), process.on("unhandledRejection", S2), process.on("SIGINT", B), process.on("SIGTERM", B), process.on("exit", v), a && a.addEventListener("abort", B);
  }, A = () => {
    process.removeListener("uncaughtExceptionMonitor", S2), process.removeListener("unhandledRejection", S2), process.removeListener("SIGINT", B), process.removeListener("SIGTERM", B), process.removeListener("exit", v), a && a.removeEventListener("abort", B);
  }, C = () => {
    if (m === void 0) return;
    $ && s.write(`
`);
    let w2 = q2(m, g, { hard: !0, trim: !1 }).split(`
`);
    w2.length > 1 && s.write(import_sisteransi2.cursor.up(w2.length - 1)), s.write(import_sisteransi2.cursor.to(0)), s.write(import_sisteransi2.erase.down());
  }, _2 = (w2) => w2.replace(/\.+$/, ""), D2 = (w2) => {
    let O2 = (performance.now() - w2) / 1e3, P2 = Math.floor(O2 / 60), G2 = Math.floor(O2 % 60);
    return P2 > 0 ? `[${P2}m ${G2}s]` : `[${G2}s]`;
  }, T2 = (w2 = "") => {
    p = !0, y2 = xt({ output: s }), c = _2(w2), h = performance.now(), s.write(`${import_picocolors2.default.gray(d)}
`);
    let O2 = 0, P2 = 0;
    b(), E = setInterval(() => {
      if ($ && c === m) return;
      C(), m = c;
      let G2 = F(l[O2]), Z2;
      if ($) Z2 = `${G2}  ${c}...`;
      else if (e === "timer") Z2 = `${G2}  ${c} ${D2(h)}`;
      else {
        let Ze = ".".repeat(Math.floor(P2)).slice(0, 3);
        Z2 = `${G2}  ${c}${Ze}`;
      }
      let Qe = q2(Z2, g, { hard: !0, trim: !1 });
      s.write(Qe), O2 = O2 + 1 < l.length ? O2 + 1 : 0, P2 = P2 < 4 ? P2 + 0.125 : 0;
    }, u);
  }, L2 = (w2 = "", O2 = 0) => {
    if (!p) return;
    p = !1, clearInterval(E), C();
    let P2 = O2 === 0 ? import_picocolors2.default.green(j2) : O2 === 1 ? import_picocolors2.default.red(ce) : import_picocolors2.default.red(de);
    c = w2 ?? c, e === "timer" ? s.write(`${P2}  ${c} ${D2(h)}
`) : s.write(`${P2}  ${c}
`), A(), y2();
  };
  return { start: T2, stop: (w2 = "") => L2(w2, 0), message: (w2 = "") => {
    c = _2(w2 ?? c);
  }, cancel: (w2 = "") => L2(w2, 1), error: (w2 = "") => L2(w2, 2), get isCancelled() {
    return f;
  } };
}, Ye = { light: I2("\u2500", "-"), heavy: I2("\u2501", "="), block: I2("\u2588", "#") };
var oe = (e, r) => e.includes(`
`) ? e.split(`
`).map((s) => r(s)).join(`
`) : r(e), qt = (e) => {
  let r = (s, i) => {
    let n = s.label ?? String(s.value);
    switch (i) {
      case "disabled":
        return `${import_picocolors2.default.gray(K2)} ${oe(n, import_picocolors2.default.gray)}${s.hint ? ` ${import_picocolors2.default.dim(`(${s.hint ?? "disabled"})`)}` : ""}`;
      case "selected":
        return `${oe(n, import_picocolors2.default.dim)}`;
      case "active":
        return `${import_picocolors2.default.green(Y)} ${n}${s.hint ? ` ${import_picocolors2.default.dim(`(${s.hint})`)}` : ""}`;
      case "cancelled":
        return `${oe(n, (l) => import_picocolors2.default.strikethrough(import_picocolors2.default.dim(l)))}`;
      default:
        return `${import_picocolors2.default.dim(K2)} ${oe(n, import_picocolors2.default.dim)}`;
    }
  };
  return new Wt({ options: e.options, signal: e.signal, input: e.input, output: e.output, initialValue: e.initialValue, render() {
    let s = `${W2(this.state)}  `, i = `${Ee(this.state)}  `, n = Bt(e.output, e.message, i, s), l = `${import_picocolors2.default.gray(d)}
${n}
`;
    switch (this.state) {
      case "submit": {
        let u = `${import_picocolors2.default.gray(d)}  `, a = Bt(e.output, r(this.options[this.cursor], "selected"), u);
        return `${l}${a}`;
      }
      case "cancel": {
        let u = `${import_picocolors2.default.gray(d)}  `, a = Bt(e.output, r(this.options[this.cursor], "cancelled"), u);
        return `${l}${a}
${import_picocolors2.default.gray(d)}`;
      }
      default: {
        let u = `${import_picocolors2.default.cyan(d)}  `;
        return `${l}${u}${J2({ output: e.output, cursor: this.cursor, options: this.options, maxItems: e.maxItems, columnPadding: u.length, style: (a, o) => r(a, a.disabled ? "disabled" : o ? "active" : "inactive") }).join(`
${u}`)}
${import_picocolors2.default.cyan(x2)}
`;
      }
    }
  } }).prompt();
};
var ze = `${import_picocolors2.default.gray(d)}  `;
var Yt = (e) => e.replace(/\x1b\[(?:\d+;)*\d*[ABCDEFGHfJKSTsu]|\x1b\[(s|u)/g, ""), zt = (e) => {
  let r = e.output ?? process.stdout, s = rt(r), i = import_picocolors2.default.gray(d), n = e.spacing ?? 1, l = 3, u = e.retainLog === !0, a = !ue() && Te(r);
  r.write(`${i}
`), r.write(`${import_picocolors2.default.green(j2)}  ${e.title}
`);
  for (let h = 0; h < n; h++) r.write(`${i}
`);
  let o = [{ value: "", full: "" }], $ = !1, y2 = (h) => {
    if (o.length === 0) return;
    let g = 0;
    h && (g += n + 2);
    for (let F of o) {
      let { value: v, result: S2 } = F, B = S2?.message ?? v;
      if (B.length === 0) continue;
      S2 === void 0 && F.header !== void 0 && F.header !== "" && (B += `
${F.header}`);
      let b = B.split(`
`).reduce((A, C) => C === "" ? A + 1 : A + Math.ceil((C.length + l) / s), 0);
      g += b;
    }
    g > 0 && (g += 1, r.write(import_sisteransi2.erase.lines(g)));
  }, E = (h, g, F) => {
    let v = F ? `${h.full}
${h.value}` : h.value;
    h.header !== void 0 && h.header !== "" && R2.message(h.header.split(`
`).map(import_picocolors2.default.bold), { output: r, secondarySymbol: i, symbol: i, spacing: 0 }), R2.message(v.split(`
`).map(import_picocolors2.default.dim), { output: r, secondarySymbol: i, symbol: i, spacing: g ?? n });
  }, p = () => {
    for (let h of o) {
      let { header: g, value: F, full: v } = h;
      (g === void 0 || g.length === 0) && F.length === 0 || E(h, void 0, u === !0 && v.length > 0);
    }
  }, f = (h, g, F) => {
    if (y2(!1), (F?.raw !== !0 || !$) && h.value !== "" && (h.value += `
`), h.value += Yt(g), $ = F?.raw === !0, e.limit !== void 0) {
      let v = h.value.split(`
`), S2 = v.length - e.limit;
      if (S2 > 0) {
        let B = v.splice(0, S2);
        u && (h.full += (h.full === "" ? "" : `
`) + B.join(`
`));
      }
      h.value = v.join(`
`);
    }
    a && c();
  }, c = () => {
    for (let h of o) h.result ? h.result.status === "error" ? R2.error(h.result.message, { output: r, secondarySymbol: i, spacing: 0 }) : R2.success(h.result.message, { output: r, secondarySymbol: i, spacing: 0 }) : h.value !== "" && E(h, 0);
  }, m = (h, g) => {
    y2(!1), h.result = g, a && c();
  };
  return { message(h, g) {
    f(o[0], h, g);
  }, group(h) {
    let g = { header: h, value: "", full: "" };
    return o.push(g), { message(F, v) {
      f(g, F, v);
    }, error(F) {
      m(g, { status: "error", message: F });
    }, success(F) {
      m(g, { status: "success", message: F });
    } };
  }, error(h, g) {
    y2(!0), R2.error(h, { output: r, secondarySymbol: i, spacing: 1 }), g?.showLog !== !1 && p(), o.splice(1, o.length - 1), o[0].value = "", o[0].full = "";
  }, success(h, g) {
    y2(!0), R2.success(h, { output: r, secondarySymbol: i, spacing: 1 }), g?.showLog === !0 && p(), o.splice(1, o.length - 1), o[0].value = "", o[0].full = "";
  } };
}, Qt = (e) => new $t({ validate: e.validate, placeholder: e.placeholder, defaultValue: e.defaultValue, initialValue: e.initialValue, output: e.output, signal: e.signal, input: e.input, render() {
  let r = (e?.withGuide ?? _.withGuide) !== !1, s = `${`${r ? `${import_picocolors2.default.gray(d)}
` : ""}${W2(this.state)}  `}${e.message}
`, i = e.placeholder ? import_picocolors2.default.inverse(e.placeholder[0]) + import_picocolors2.default.dim(e.placeholder.slice(1)) : import_picocolors2.default.inverse(import_picocolors2.default.hidden("_")), n = this.userInput ? this.userInputWithCursor : i, l = this.value ?? "";
  switch (this.state) {
    case "error": {
      let u = this.error ? `  ${import_picocolors2.default.yellow(this.error)}` : "", a = r ? `${import_picocolors2.default.yellow(d)}  ` : "", o = r ? import_picocolors2.default.yellow(x2) : "";
      return `${s.trim()}
${a}${n}
${o}${u}
`;
    }
    case "submit": {
      let u = l ? `  ${import_picocolors2.default.dim(l)}` : "", a = r ? import_picocolors2.default.gray(d) : "";
      return `${s}${a}${u}`;
    }
    case "cancel": {
      let u = l ? `  ${import_picocolors2.default.strikethrough(import_picocolors2.default.dim(l))}` : "", a = r ? import_picocolors2.default.gray(d) : "";
      return `${s}${a}${u}${l.trim() ? `
${a}` : ""}`;
    }
    default: {
      let u = r ? `${import_picocolors2.default.cyan(d)}  ` : "", a = r ? import_picocolors2.default.cyan(x2) : "";
      return `${s}${u}${n}
${a}
`;
    }
  }
} }).prompt();

// src/node-logger/prompts/prompt-config.ts
var prompt_config_exports = {};
__export(prompt_config_exports, {
  getPreferredStdio: () => getPreferredStdio,
  getPromptLibrary: () => getPromptLibrary,
  getPromptProvider: () => getPromptProvider,
  isClackEnabled: () => isClackEnabled,
  setPromptLibrary: () => setPromptLibrary
});

// src/node-logger/logger/log-tracker.ts
import { promises as fs } from "node:fs";
import { join } from "node:path";
var DEBUG_LOG_FILE_NAME = "debug-storybook.log", DEFAULT_LOG_FILE_PATH = join(process.cwd(), DEBUG_LOG_FILE_NAME), LogTracker = class {
  /** Array to store log entries */
  #logs = [];
  /**
   * Flag indicating if logs should be written to file it is enabled either by users providing the
   * `--logfile` flag to a CLI command or when we explicitly enable it by calling
   * `logTracker.enableLogWriting()` e.g. in automigrate or doctor command when there are issues
   */
  #shouldWriteLogsToFile = !1;
  /** Enables writing logs to file. */
  enableLogWriting() {
    this.#shouldWriteLogsToFile = !0;
  }
  /** Returns whether logs should be written to file. */
  get shouldWriteLogsToFile() {
    return this.#shouldWriteLogsToFile;
  }
  /** Returns a copy of all stored logs. */
  get logs() {
    return [...this.#logs];
  }
  /**
   * Adds a new log entry.
   *
   * @param level - The log level
   * @param message - The log message
   * @param metadata - Optional metadata to attach to the log, can be any JSON serializable value
   */
  addLog(level, message, metadata) {
    this.#logs.push({
      timestamp: /* @__PURE__ */ new Date(),
      level,
      message,
      metadata
    });
  }
  /** Clears all stored logs. */
  clear() {
    this.#logs = [];
  }
  /**
   * Writes all stored logs to a file and clears the log store.
   *
   * @param filePath - Optional custom file path to write logs to
   * @returns The path where logs were written, by default is debug-storybook.log in current working
   *   directory
   */
  async writeToFile(filePath) {
    let logFilePath = typeof filePath == "string" ? filePath : DEFAULT_LOG_FILE_PATH, logContent = this.#logs.map((log2) => {
      let timestamp = log2.timestamp.toLocaleTimeString("en-US", { hour12: !1 }) + `.${log2.timestamp.getMilliseconds().toString().padStart(3, "0")}`, metadata = log2.metadata ? ` ${JSON.stringify(log2.metadata)}` : "";
      return `[${timestamp}] [${log2.level.toUpperCase()}] ${log2.message}${metadata}`;
    }).join(`
`);
    return await fs.writeFile(logFilePath, logContent, "utf-8"), this.#logs = [], logFilePath;
  }
}, logTracker = new LogTracker();

// src/node-logger/wrap-utils.ts
var import_picocolors3 = __toESM(require_picocolors(), 1);

// ../node_modules/ansi-regex/index.js
function ansiRegex({ onlyFirst = !1 } = {}) {
  let pattern = "(?:\\u001B\\][\\s\\S]*?(?:\\u0007|\\u001B\\u005C|\\u009C))|[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}

// ../node_modules/strip-ansi/index.js
var regex = ansiRegex();
function stripAnsi(string) {
  if (typeof string != "string")
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  return string.replace(regex, "");
}

// ../node_modules/wrap-ansi/node_modules/string-width/index.js
var import_eastasianwidth = __toESM(require_eastasianwidth(), 1), import_emoji_regex = __toESM(require_emoji_regex2(), 1);
function stringWidth(string, options = {}) {
  if (typeof string != "string" || string.length === 0 || (options = {
    ambiguousIsNarrow: !0,
    ...options
  }, string = stripAnsi(string), string.length === 0))
    return 0;
  string = string.replace((0, import_emoji_regex.default)(), "  ");
  let ambiguousCharacterWidth = options.ambiguousIsNarrow ? 1 : 2, width = 0;
  for (let character of string) {
    let codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159 || codePoint >= 768 && codePoint <= 879)
      continue;
    switch (import_eastasianwidth.default.eastAsianWidth(character)) {
      case "F":
      case "W":
        width += 2;
        break;
      case "A":
        width += ambiguousCharacterWidth;
        break;
      default:
        width += 1;
    }
  }
  return width;
}

// ../node_modules/ansi-styles/index.js
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`, wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`, wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`, styles = {
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
}, modifierNames = Object.keys(styles.modifier), foregroundColorNames = Object.keys(styles.color), backgroundColorNames = Object.keys(styles.bgColor), colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  let codes = /* @__PURE__ */ new Map();
  for (let [groupName, group] of Object.entries(styles)) {
    for (let [styleName, style] of Object.entries(group))
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      }, group[styleName] = styles[styleName], codes.set(style[0], style[1]);
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: !1
    });
  }
  return Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: !1
  }), styles.color.close = "\x1B[39m", styles.bgColor.close = "\x1B[49m", styles.color.ansi = wrapAnsi16(), styles.color.ansi256 = wrapAnsi256(), styles.color.ansi16m = wrapAnsi16m(), styles.bgColor.ansi = wrapAnsi16(10), styles.bgColor.ansi256 = wrapAnsi256(10), styles.bgColor.ansi16m = wrapAnsi16m(10), Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        return red === green && green === blue ? red < 8 ? 16 : red > 248 ? 231 : Math.round((red - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: !1
    },
    hexToRgb: {
      value(hex2) {
        let matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex2.toString(16));
        if (!matches)
          return [0, 0, 0];
        let [colorString] = matches;
        colorString.length === 3 && (colorString = [...colorString].map((character) => character + character).join(""));
        let integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: !1
    },
    hexToAnsi256: {
      value: (hex2) => styles.rgbToAnsi256(...styles.hexToRgb(hex2)),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8)
          return 30 + code;
        if (code < 16)
          return 90 + (code - 8);
        let red, green, blue;
        if (code >= 232)
          red = ((code - 232) * 10 + 8) / 255, green = red, blue = red;
        else {
          code -= 16;
          let remainder = code % 36;
          red = Math.floor(code / 36) / 5, green = Math.floor(remainder / 6) / 5, blue = remainder % 6 / 5;
        }
        let value = Math.max(red, green, blue) * 2;
        if (value === 0)
          return 30;
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        return value === 2 && (result += 60), result;
      },
      enumerable: !1
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: !1
    },
    hexToAnsi: {
      value: (hex2) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex2)),
      enumerable: !1
    }
  }), styles;
}
var ansiStyles = assembleStyles(), ansi_styles_default = ansiStyles;

// ../node_modules/wrap-ansi/index.js
var ESCAPES = /* @__PURE__ */ new Set([
  "\x1B",
  "\x9B"
]), END_CODE = 39, ANSI_ESCAPE_BELL = "\x07", ANSI_CSI = "[", ANSI_OSC = "]", ANSI_SGR_TERMINATOR = "m", ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`, wrapAnsiCode = (code) => `${ESCAPES.values().next().value}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`, wrapAnsiHyperlink = (uri) => `${ESCAPES.values().next().value}${ANSI_ESCAPE_LINK}${uri}${ANSI_ESCAPE_BELL}`, wordLengths = (string) => string.split(" ").map((character) => stringWidth(character)), wrapWord = (rows, word, columns) => {
  let characters = [...word], isInsideEscape = !1, isInsideLinkEscape = !1, visible = stringWidth(stripAnsi(rows[rows.length - 1]));
  for (let [index, character] of characters.entries()) {
    let characterLength = stringWidth(character);
    if (visible + characterLength <= columns ? rows[rows.length - 1] += character : (rows.push(character), visible = 0), ESCAPES.has(character) && (isInsideEscape = !0, isInsideLinkEscape = characters.slice(index + 1).join("").startsWith(ANSI_ESCAPE_LINK)), isInsideEscape) {
      isInsideLinkEscape ? character === ANSI_ESCAPE_BELL && (isInsideEscape = !1, isInsideLinkEscape = !1) : character === ANSI_SGR_TERMINATOR && (isInsideEscape = !1);
      continue;
    }
    visible += characterLength, visible === columns && index < characters.length - 1 && (rows.push(""), visible = 0);
  }
  !visible && rows[rows.length - 1].length > 0 && rows.length > 1 && (rows[rows.length - 2] += rows.pop());
}, stringVisibleTrimSpacesRight = (string) => {
  let words = string.split(" "), last = words.length;
  for (; last > 0 && !(stringWidth(words[last - 1]) > 0); )
    last--;
  return last === words.length ? string : words.slice(0, last).join(" ") + words.slice(last).join("");
}, exec = (string, columns, options = {}) => {
  if (options.trim !== !1 && string.trim() === "")
    return "";
  let returnValue = "", escapeCode, escapeUrl, lengths = wordLengths(string), rows = [""];
  for (let [index, word] of string.split(" ").entries()) {
    options.trim !== !1 && (rows[rows.length - 1] = rows[rows.length - 1].trimStart());
    let rowLength = stringWidth(rows[rows.length - 1]);
    if (index !== 0 && (rowLength >= columns && (options.wordWrap === !1 || options.trim === !1) && (rows.push(""), rowLength = 0), (rowLength > 0 || options.trim === !1) && (rows[rows.length - 1] += " ", rowLength++)), options.hard && lengths[index] > columns) {
      let remainingColumns = columns - rowLength, breaksStartingThisLine = 1 + Math.floor((lengths[index] - remainingColumns - 1) / columns);
      Math.floor((lengths[index] - 1) / columns) < breaksStartingThisLine && rows.push(""), wrapWord(rows, word, columns);
      continue;
    }
    if (rowLength + lengths[index] > columns && rowLength > 0 && lengths[index] > 0) {
      if (options.wordWrap === !1 && rowLength < columns) {
        wrapWord(rows, word, columns);
        continue;
      }
      rows.push("");
    }
    if (rowLength + lengths[index] > columns && options.wordWrap === !1) {
      wrapWord(rows, word, columns);
      continue;
    }
    rows[rows.length - 1] += word;
  }
  options.trim !== !1 && (rows = rows.map((row) => stringVisibleTrimSpacesRight(row)));
  let pre = [...rows.join(`
`)];
  for (let [index, character] of pre.entries()) {
    if (returnValue += character, ESCAPES.has(character)) {
      let { groups } = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`).exec(pre.slice(index).join("")) || { groups: {} };
      if (groups.code !== void 0) {
        let code2 = Number.parseFloat(groups.code);
        escapeCode = code2 === END_CODE ? void 0 : code2;
      } else groups.uri !== void 0 && (escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri);
    }
    let code = ansi_styles_default.codes.get(Number(escapeCode));
    pre[index + 1] === `
` ? (escapeUrl && (returnValue += wrapAnsiHyperlink("")), escapeCode && code && (returnValue += wrapAnsiCode(code))) : character === `
` && (escapeCode && code && (returnValue += wrapAnsiCode(escapeCode)), escapeUrl && (returnValue += wrapAnsiHyperlink(escapeUrl)));
  }
  return returnValue;
};
function wrapAnsi(string, columns, options) {
  return String(string).normalize().replace(/\r\n/g, `
`).split(`
`).map((line) => exec(line, columns, options)).join(`
`);
}

// src/node-logger/wrap-utils.ts
function getTerminalWidth() {
  try {
    return process.stdout.columns || 80;
  } catch {
    return 80;
  }
}
var ANSI_REGEX = /\u001b\[[0-9;]*m|\u001b\]8;;[^\u0007]*\u0007|\u001b\]8;;\u0007/g, URL_REGEX = /(https?:\/\/[^\s\u0000-\u001F\u007F]+)/g;
function stripAnsi2(str) {
  return str.replace(ANSI_REGEX, "");
}
function getVisibleLength(str) {
  return stripAnsi2(str).length;
}
function getEnvFromTerminal(key) {
  return (process.env[key] || "").trim();
}
function supportsHyperlinks() {
  try {
    let termProgram = getEnvFromTerminal("TERM_PROGRAM"), termProgramVersion = getEnvFromTerminal("TERM_PROGRAM_VERSION");
    switch (termProgram) {
      case "iTerm.app":
        if (termProgramVersion.trim()) {
          let version = termProgramVersion.trim().split(".").map(Number);
          return version[0] > 3 || version[0] === 3 && version[1] >= 1;
        }
        return !0;
      // Assume recent version
      case "Apple_Terminal":
        return !1;
      default:
        return !0;
    }
  } catch {
    return !1;
  }
}
function protectUrls(text2, options) {
  let defaultMaxUrlLength = Math.floor(getTerminalWidth() * 0.8), maxLineWidth = options?.maxLineWidth ?? getTerminalWidth(), useHyperlinks = supportsHyperlinks();
  return text2.replace(URL_REGEX, (match, capturedUrl, offset) => {
    if (!useHyperlinks)
      return match;
    let searchPos = 0;
    for (; ; ) {
      let hyperlinkStart = text2.indexOf("\x1B]8;;", searchPos);
      if (hyperlinkStart === -1)
        break;
      let hyperlinkEnd = text2.indexOf("\x1B]8;;\x07", hyperlinkStart);
      if (hyperlinkEnd === -1) {
        searchPos = hyperlinkStart + 1;
        continue;
      }
      if (offset >= hyperlinkStart && offset < hyperlinkEnd + 7)
        return match;
      searchPos = hyperlinkEnd + 1;
    }
    let textBeforeUrl = text2.substring(0, offset), lastNewlineIndex = textBeforeUrl.lastIndexOf(`
`), currentLinePrefix = lastNewlineIndex === -1 ? textBeforeUrl : textBeforeUrl.substring(lastNewlineIndex + 1), prefixLength = getVisibleLength(currentLinePrefix), availableSpace = maxLineWidth - prefixLength, minUrlLength = 20, configuredMax = options?.maxUrlLength ?? defaultMaxUrlLength, effectiveMaxLength = Math.min(configuredMax, defaultMaxUrlLength, availableSpace);
    if ((capturedUrl.length <= minUrlLength || effectiveMaxLength < minUrlLength) && (effectiveMaxLength = capturedUrl.length), capturedUrl.length > effectiveMaxLength) {
      let truncatedText = capturedUrl.substring(0, effectiveMaxLength - 3) + "...";
      return `\x1B]8;;${capturedUrl}\x07${truncatedText}\x1B]8;;\x07`;
    }
    return `\x1B]8;;${capturedUrl}\x07${capturedUrl}\x1B]8;;\x07`;
  });
}
function createHyperlink(title, url) {
  return supportsHyperlinks() ? `\x1B]8;;${url}\x07${title}\x1B]8;;\x07` : `${title}: ${url}`;
}
function splitTextPreservingUrls(text2) {
  let parts = [], lastIndex = 0, match;
  for (URL_REGEX.lastIndex = 0; (match = URL_REGEX.exec(text2)) !== null; ) {
    if (match.index > lastIndex) {
      let beforeUrl = text2.slice(lastIndex, match.index);
      parts.push(...beforeUrl.split(" ").filter((part) => part.length > 0));
    }
    parts.push(match[0]), lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text2.length) {
    let remaining = text2.slice(lastIndex);
    parts.push(...remaining.split(" ").filter((part) => part.length > 0));
  }
  return parts;
}
var MAX_OPTIMAL_WIDTH = 80;
function getOptimalWidth(width) {
  return Math.min(width, MAX_OPTIMAL_WIDTH);
}
function wrapTextForClack(text2, width) {
  let terminalWidth = width || getTerminalWidth(), contentWidth = Math.max(terminalWidth - 10, 40), maxOptimalWidth = getOptimalWidth(contentWidth), protectedText = protectUrls(text2, { maxLineWidth: maxOptimalWidth });
  return wrapAnsi(protectedText, maxOptimalWidth);
}
function wrapTextForClackHint(text2, width, label, _indentSpaces = 4) {
  let terminalWidth = width || getTerminalWidth(), reservedSpaceFirstLine = 8 + (label ? getVisibleLength(label) : 0), firstLineWidth = Math.min(
    MAX_OPTIMAL_WIDTH - reservedSpaceFirstLine,
    Math.max(terminalWidth - reservedSpaceFirstLine, 30)
  ), indentSpaces = _indentSpaces, continuationLineWidth = getOptimalWidth(Math.max(terminalWidth - indentSpaces, 30)), protectedText = protectUrls(text2, { maxLineWidth: continuationLineWidth }), initialWrap = wrapAnsi(protectedText, continuationLineWidth), lines = initialWrap.split(`
`);
  if (lines.length > 0 && getVisibleLength(lines[0]) > firstLineWidth) {
    let words = splitTextPreservingUrls(text2), firstLinePart = "", remainingPart = "";
    for (let i = 0; i < words.length; i++) {
      let testLine = i === 0 ? words[i] : firstLinePart + " " + words[i];
      if (getVisibleLength(testLine) <= firstLineWidth)
        firstLinePart = testLine;
      else {
        remainingPart = words.slice(i).join(" ");
        break;
      }
    }
    !firstLinePart && words.length > 0 && (firstLinePart = words[0], remainingPart = words.slice(1).join(" "));
    let finalLines = [firstLinePart];
    if (remainingPart.trim()) {
      let protectedRemainder = protectUrls(remainingPart.trim(), {
        maxLineWidth: continuationLineWidth
      }), wrappedRemainder = wrapAnsi(protectedRemainder, continuationLineWidth);
      finalLines = finalLines.concat(wrappedRemainder.split(`
`));
    }
    if (finalLines.length <= 1)
      return finalLines[0] || "";
    let indentation2 = indentSpaces > 0 ? (0, import_picocolors3.reset)((0, import_picocolors3.cyan)(d)) + " ".repeat(indentSpaces) : "";
    return finalLines.map((line, index) => index === 0 ? line : `${indentation2}${(0, import_picocolors3.dim)(line)}`).join(`
`);
  }
  if (lines.length <= 1)
    return initialWrap;
  let indentation = (0, import_picocolors3.reset)((0, import_picocolors3.cyan)(d)) + " ".repeat(indentSpaces);
  return lines.map((line, index) => index === 0 ? line : `${indentation}${(0, import_picocolors3.dim)(line)}`).join(`
`);
}

// src/node-logger/prompts/prompt-provider-base.ts
var PromptProvider = class {
};

// src/node-logger/prompts/prompt-provider-clack.ts
var getCurrentTaskLog = () => globalThis.STORYBOOK_CURRENT_TASK_LOG ? globalThis.STORYBOOK_CURRENT_TASK_LOG[globalThis.STORYBOOK_CURRENT_TASK_LOG.length - 1] : null, setCurrentTaskLog = (taskLog2) => {
  globalThis.STORYBOOK_CURRENT_TASK_LOG = [
    ...globalThis.STORYBOOK_CURRENT_TASK_LOG || [],
    taskLog2
  ];
}, clearCurrentTaskLog = () => {
  globalThis.STORYBOOK_CURRENT_TASK_LOG && globalThis.STORYBOOK_CURRENT_TASK_LOG.pop();
}, ClackPromptProvider = class extends PromptProvider {
  handleCancel(result, promptOptions) {
    Ct(result) && (promptOptions?.onCancel ? promptOptions.onCancel() : (Nt("Operation canceled."), process.exit(0)));
  }
  async text(options, promptOptions) {
    let result = await Qt(options);
    return this.handleCancel(result, promptOptions), logTracker.addLog("prompt", options.message, { choice: result }), result.toString();
  }
  async confirm(options, promptOptions) {
    let result = await Mt2({
      ...options,
      message: wrapTextForClackHint(options.message, void 0, void 0, 2)
    });
    return this.handleCancel(result, promptOptions), logTracker.addLog("prompt", options.message, { choice: result }), !!result;
  }
  async select(options, promptOptions) {
    let result = await qt({
      ...options,
      message: wrapTextForClackHint(options.message, void 0, void 0, 2)
    });
    return this.handleCancel(result, promptOptions), logTracker.addLog("prompt", options.message, { choice: result }), result;
  }
  async multiselect(options, promptOptions) {
    let result = await Lt2({
      ...options,
      required: options.required
    });
    return this.handleCancel(result, promptOptions), logTracker.addLog("prompt", options.message, { choice: result }), result;
  }
  spinner(options) {
    let task = we(), spinnerId = `${options.id}-spinner`;
    return {
      start: (message) => {
        logTracker.addLog("info", `${spinnerId}-start: ${message}`), task.start(message);
      },
      message: (message) => {
        logTracker.addLog("info", `${spinnerId}: ${message}`), task.message(message);
      },
      stop: (message) => {
        logTracker.addLog("info", `${spinnerId}-stop: ${message}`), task.stop(message);
      },
      cancel: (message) => {
        logTracker.addLog("info", `${spinnerId}-cancel: ${message}`), task.cancel(message);
      },
      error: (message) => {
        logTracker.addLog("error", `${spinnerId}-error: ${message}`), task.error(message);
      }
    };
  }
  taskLog(options) {
    let isCurrentTaskActive = !!getCurrentTaskLog(), task = getCurrentTaskLog() || zt(options), taskId = `${options.id}-task`;
    return logTracker.addLog("info", `${taskId}-start: ${options.title}`), isCurrentTaskActive || setCurrentTaskLog(task), {
      message: (message) => {
        logTracker.addLog("info", `${taskId}: ${message}`), task.message(message);
      },
      error: (message) => {
        logTracker.addLog("error", `${taskId}-error: ${message}`), task.error(message, { showLog: !0 }), clearCurrentTaskLog();
      },
      success: (message, options2) => {
        logTracker.addLog("info", `${taskId}-success: ${message}`), isCurrentTaskActive || task.success(message, options2), clearCurrentTaskLog();
      },
      group(title) {
        logTracker.addLog("info", `${taskId}-group: ${title}`);
        let group = task.group(title);
        return setCurrentTaskLog(group), {
          message: (message) => {
            group.message(message);
          },
          success: (message) => {
            group.success(message), clearCurrentTaskLog();
          },
          error: (message) => {
            group.error(message), clearCurrentTaskLog();
          }
        };
      }
    };
  }
};

// src/node-logger/prompts/prompt-config.ts
var PROVIDERS = {
  clack: new ClackPromptProvider()
}, currentPromptLibrary = "clack", setPromptLibrary = (library) => {
  currentPromptLibrary = library;
}, getPromptLibrary = () => currentPromptLibrary, getPromptProvider = () => PROVIDERS[currentPromptLibrary], isClackEnabled = () => currentPromptLibrary === "clack", getPreferredStdio = () => isClackEnabled() ? "pipe" : "inherit";

// src/node-logger/logger/colors.ts
var import_picocolors4 = __toESM(require_picocolors(), 1), CLI_COLORS = {
  success: import_picocolors4.default.green,
  error: import_picocolors4.default.red,
  warning: import_picocolors4.default.yellow,
  // Improve contrast on dark terminals by using cyan for info on all platforms
  info: import_picocolors4.default.cyan,
  debug: import_picocolors4.default.gray,
  // Only color a link if it is the primary call to action, otherwise links shouldn't be colored
  cta: import_picocolors4.default.cyan,
  muted: import_picocolors4.default.dim,
  storybook: (text2) => `\x1B[38;2;255;71;133m${text2}\x1B[39m`
};

// src/node-logger/logger/logger.ts
var createLogFunction = (clackFn, consoleFn, cliColors) => () => isClackEnabled() ? (...args) => {
  let [message, ...rest] = args, currentTaskLog = getCurrentTaskLog();
  currentTaskLog ? currentTaskLog.message(
    cliColors && typeof message == "string" ? cliColors(message) : message
  ) : typeof message == "string" ? clackFn(wrapTextForClack(message), ...rest) : clackFn(message, ...rest);
} : consoleFn, LOG_FUNCTIONS = {
  log: createLogFunction(R2.message, console.log),
  info: createLogFunction(R2.info, console.log),
  warn: createLogFunction(R2.warn, console.warn, CLI_COLORS.warning),
  error: createLogFunction(R2.error, console.error, CLI_COLORS.error),
  intro: createLogFunction(Pt, console.log),
  outro: createLogFunction(Wt2, console.log),
  step: createLogFunction(R2.step, console.log)
}, LOG_LEVELS = {
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  silent: 10
}, currentLogLevel = "info", setLogLevel = (level) => {
  currentLogLevel = level;
}, getLogLevel = () => currentLogLevel, shouldLog = (level) => LOG_LEVELS[currentLogLevel] <= LOG_LEVELS[level];
function getMinimalTrace() {
  let stack = new Error().stack;
  if (!stack)
    return;
  let userStackLines = stack.split(`
`).slice(1).filter(
    (line) => !["getMinimalTrace", "createLogger", "logFunction"].some((fn) => line.includes(fn))
  );
  return userStackLines.length === 0 ? void 0 : `
` + userStackLines.slice(0, 2).join(`
`);
}
var formatLogMessage = (args) => args.map((arg) => typeof arg == "string" ? arg : typeof arg == "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ");
function createLogger(level, logFn, prefix) {
  return function(...args) {
    let [message, ...rest] = args, msg = formatLogMessage([message]);
    if (logTracker.addLog(level, msg), level === "prompt" && (level = "info"), shouldLog(level)) {
      let formattedMessage = prefix ? `${prefix} ${msg}` : message;
      logFn(formattedMessage, ...rest);
    }
  };
}
var debug = createLogger(
  "debug",
  function(message) {
    shouldLog("trace") && (message += getMinimalTrace()), LOG_FUNCTIONS.log()(message);
  },
  "[DEBUG]"
), log = createLogger(
  "info",
  (...args) => LOG_FUNCTIONS.log()(...args)
), info = createLogger(
  "info",
  (...args) => LOG_FUNCTIONS.info()(...args)
), warn = createLogger(
  "warn",
  (...args) => LOG_FUNCTIONS.warn()(...args)
), error = createLogger(
  "error",
  (...args) => LOG_FUNCTIONS.error()(...args)
), logBox = (message, { title, ...options } = {}) => {
  shouldLog("info") && (logTracker.addLog("info", message), isClackEnabled() ? Tt2(message, title, {
    ...options,
    width: options.width ?? "auto"
  }) : console.log(message));
}, intro = (message) => {
  logTracker.addLog("info", message), shouldLog("info") && (console.log(""), LOG_FUNCTIONS.intro()(message));
}, outro = (message) => {
  logTracker.addLog("info", message), shouldLog("info") && LOG_FUNCTIONS.outro()(message);
}, step = (message) => {
  logTracker.addLog("info", message), shouldLog("info") && LOG_FUNCTIONS.step()(message);
}, SYMBOLS = {
  success: CLI_COLORS.success("\u2714"),
  error: CLI_COLORS.error("\u2715")
};

// src/node-logger/logger/console.ts
var import_picocolors5 = __toESM(require_picocolors(), 1);
var ConsoleLogger = class _ConsoleLogger {
  constructor() {
    this.Console = _ConsoleLogger;
    this.timers = /* @__PURE__ */ new Map();
    this.counters = /* @__PURE__ */ new Map();
    this.lastStatusLine = null;
    this.statusLineCount = 0;
  }
  // These will be overridden by child classes
  get prefix() {
    return "";
  }
  get color() {
    return (text2) => text2;
  }
  formatMessage(...data) {
    let message = data.join(" ");
    return this.prefix ? `${this.color(this.prefix)} ${message}` : message;
  }
  assert(condition, ...data) {
    condition || error(this.formatMessage("Assertion failed:", ...data));
  }
  // Needs some proper implementation
  // Take a look at https://github.com/webpack/webpack/blob/5f898719ae47b89bee3c126bf5d2e0081ea8c91f/lib/node/nodeConsole.js#L4
  // for some inspiration
  // status(...data: any[]): void {
  //   const message = this.formatMessage(...data);
  //   // If we have a previous status line, we need to clear it
  //   if (this.lastStatusLine !== null) {
  //     this.clearStatus();
  //   }
  //   // Write the status message directly to stdout without adding newlines
  //   process.stdout.write(message);
  //   // Update tracking variables
  //   this.lastStatusLine = message;
  //   this.statusLineCount = 1; // For now, assume single line status messages
  //   // If the message contains newlines, count them
  //   const newlineCount = (message.match(/\n/g) || []).length;
  //   this.statusLineCount = newlineCount + 1;
  // }
  // /** Clears the current status line if one exists */
  // clearStatus(): void {
  //   if (this.lastStatusLine !== null) {
  //     // Move cursor to the beginning of the current line
  //     process.stdout.write('\r');
  //     // Clear the current line
  //     process.stdout.clearLine(1);
  //     // Reset tracking variables
  //     this.lastStatusLine = null;
  //     this.statusLineCount = 0;
  //   }
  // }
  /**
   * The **`console.clear()`** static method clears the console if possible.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/clear_static)
   */
  clear() {
    console.clear();
  }
  /**
   * The **`console.count()`** static method logs the number of times that this particular call to
   * `count()` has been called.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/count_static)
   */
  count(label) {
    let key = label || "default", currentCount = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, currentCount), log(this.formatMessage(`${key}: ${currentCount}`));
  }
  /**
   * The **`console.countReset()`** static method resets counter used with console/count_static.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/countReset_static)
   */
  countReset(label) {
    let key = label || "default";
    this.counters.delete(key);
  }
  /**
   * The **`console.debug()`** static method outputs a message to the console at the 'debug' log
   * level.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/debug_static)
   */
  debug(...data) {
    process.stdout.write(`
`), debug(this.formatMessage(...data));
  }
  /**
   * The **`console.dir()`** static method displays a list of the properties of the specified
   * JavaScript object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dir_static)
   */
  dir(item, options) {
    console.dir(item, options);
  }
  /**
   * The **`console.dirxml()`** static method displays an interactive tree of the descendant
   * elements of the specified XML/HTML element.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dirxml_static)
   */
  dirxml(...data) {
    console.dirxml(...data);
  }
  /**
   * The **`console.error()`** static method outputs a message to the console at the 'error' log
   * level.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/error_static)
   */
  error(...data) {
    process.stdout.write(`
`), error(this.formatMessage(...data));
  }
  /**
   * The **`console.group()`** static method creates a new inline group in the Web console log,
   * causing any subsequent console messages to be indented by an additional level, until
   * console/groupEnd_static is called.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/group_static)
   */
  group(...data) {
    console.group(...data);
  }
  /**
   * The **`console.groupCollapsed()`** static method creates a new inline group in the console.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupCollapsed_static)
   */
  groupCollapsed(...data) {
    console.groupCollapsed(...data);
  }
  /**
   * The **`console.groupEnd()`** static method exits the current inline group in the console.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupEnd_static)
   */
  groupEnd() {
    console.groupEnd();
  }
  /**
   * The **`console.info()`** static method outputs a message to the console at the 'info' log
   * level.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/info_static)
   */
  info(...data) {
    process.stdout.write(`
`), log(this.formatMessage(...data));
  }
  /**
   * The **`console.log()`** static method outputs a message to the console.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log_static)
   */
  log(...data) {
    process.stdout.write(`
`), log(this.formatMessage(...data));
  }
  /**
   * The **`console.table()`** static method displays tabular data as a table.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/table_static)
   */
  table(tabularData, properties) {
    console.table(tabularData, properties);
  }
  /**
   * The **`console.time()`** static method starts a timer you can use to track how long an
   * operation takes.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/time_static)
   */
  time(label) {
    let key = label || "default";
    this.timers.set(key, Date.now());
  }
  /**
   * The **`console.timeEnd()`** static method stops a timer that was previously started by calling
   * console/time_static.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeEnd_static)
   */
  timeEnd(label) {
    let key = label || "default", startTime = this.timers.get(key);
    if (startTime) {
      let duration = Date.now() - startTime;
      log(this.formatMessage(`${key}: ${duration}ms`)), this.timers.delete(key);
    } else
      warn(this.formatMessage(`Timer '${key}' does not exist`));
  }
  /**
   * The **`console.timeLog()`** static method logs the current value of a timer that was previously
   * started by calling console/time_static.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeLog_static)
   */
  timeLog(label, ...data) {
    let key = label || "default", startTime = this.timers.get(key);
    if (startTime) {
      let duration = Date.now() - startTime;
      log(this.formatMessage(`${key}: ${duration}ms`, ...data));
    } else
      warn(this.formatMessage(`Timer '${key}' does not exist`));
  }
  timeStamp(label) {
    let timestamp = (/* @__PURE__ */ new Date()).toISOString();
    log(this.formatMessage(`[${timestamp}]${label ? ` ${label}` : ""}`));
  }
  /**
   * The **`console.trace()`** static method outputs a stack trace to the console.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/trace_static)
   */
  trace(...data) {
    console.trace(...data);
  }
  /**
   * The **`console.warn()`** static method outputs a warning message to the console at the
   * 'warning' log level.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/warn_static)
   */
  warn(...data) {
    process.stdout.write(`
`), warn(this.formatMessage(...data));
  }
  profile(label) {
    console.profile(label), log(this.formatMessage(`Profile started: ${label}`));
  }
  profileEnd(label) {
    console.profileEnd(label), log(this.formatMessage(`Profile ended: ${label}`));
  }
}, StyledConsoleLogger = class extends ConsoleLogger {
  constructor(options) {
    super(), this._prefix = options.prefix || "", this._color = options.color;
  }
  // Override the getter methods from parent class
  get prefix() {
    return this._prefix;
  }
  get color() {
    return import_picocolors5.default[this._color];
  }
};

// src/node-logger/prompts/prompt-functions.ts
var prompt_functions_exports = {};
__export(prompt_functions_exports, {
  confirm: () => confirm,
  multiselect: () => multiselect,
  select: () => select,
  spinner: () => spinner,
  taskLog: () => taskLog,
  text: () => text
});
var activeSpinner = null, activeTaskLog = null, originalConsoleLog = null, isInteractiveTerminal = () => process.stdout.isTTY && process.stdin.isTTY && !process.env.CI, patchConsoleLog = () => {
  originalConsoleLog || (originalConsoleLog = console.log, console.log = (...args) => {
    let message = args.map((arg) => typeof arg == "string" ? arg : JSON.stringify(arg)).join(" ");
    activeTaskLog ? shouldLog("info") && activeTaskLog.message(message) : activeSpinner ? shouldLog("info") && activeSpinner.message(message) : originalConsoleLog(...args);
  });
}, restoreConsoleLog = () => {
  originalConsoleLog && !activeSpinner && !activeTaskLog && (console.log = originalConsoleLog, originalConsoleLog = null);
}, text = async (options, promptOptions) => getPromptProvider().text(options, promptOptions), confirm = async (options, promptOptions) => getPromptProvider().confirm(options, promptOptions), select = async (options, promptOptions) => getPromptProvider().select(options, promptOptions), multiselect = async (options, promptOptions) => getPromptProvider().multiselect(
  {
    ...options,
    options: options.options.map((opt) => ({
      ...opt,
      hint: opt.hint ? wrapTextForClackHint(opt.hint, void 0, opt.label || String(opt.value), 0) : void 0
    }))
  },
  promptOptions
), spinner = (options) => {
  if (isInteractiveTerminal()) {
    let spinnerInstance = getPromptProvider().spinner(options), wrappedSpinner = {
      start: (message) => {
        activeSpinner = wrappedSpinner, patchConsoleLog(), shouldLog("info") && spinnerInstance.start(message);
      },
      stop: (message) => {
        activeSpinner = null, restoreConsoleLog(), shouldLog("info") && spinnerInstance.stop(message);
      },
      cancel: (message) => {
        activeSpinner = null, restoreConsoleLog(), shouldLog("info") && spinnerInstance.cancel(message);
      },
      error: (message) => {
        activeSpinner = null, restoreConsoleLog(), shouldLog("error") && spinnerInstance.error(message);
      },
      message: (text2) => {
        shouldLog("info") && spinnerInstance.message(text2);
      }
    };
    return wrappedSpinner;
  } else {
    let maybeLog = shouldLog("info") ? log : (_2) => {
    };
    return {
      start: (message) => {
        message && maybeLog(message);
      },
      stop: (message) => {
        message && maybeLog(message);
      },
      cancel: (message) => {
        message && maybeLog(message);
      },
      error: (message) => {
        message && shouldLog("error") && error(message);
      },
      message: (message) => {
        maybeLog(message);
      }
    };
  }
}, taskLog = (options) => {
  if (isInteractiveTerminal() && shouldLog("info")) {
    let task = getPromptProvider().taskLog(options), wrappedTaskLog = {
      message: (message) => {
        task.message(wrapTextForClack(message));
      },
      success: (message, options2) => {
        activeTaskLog = null, restoreConsoleLog(), task.success(message, options2);
      },
      error: (message) => {
        activeTaskLog = null, restoreConsoleLog(), task.error(message);
      },
      group: function(title) {
        return this.message(`
${title}
`), {
          message: (message) => {
            task.message(wrapTextForClack(message));
          },
          success: (message) => {
            task.success(message);
          },
          error: (message) => {
            task.error(message);
          }
        };
      }
    };
    return activeTaskLog = wrappedTaskLog, patchConsoleLog(), wrappedTaskLog;
  } else {
    let maybeLog = shouldLog("info") ? log : (_2) => {
    };
    return {
      message: (message) => {
        maybeLog(message);
      },
      success: (message) => {
        maybeLog(message);
      },
      error: (message) => {
        maybeLog(message);
      },
      group: (title) => (maybeLog(`
${title}
`), {
        message: (message) => {
          maybeLog(message);
        },
        success: (message) => {
          maybeLog(message);
        },
        error: (message) => {
          maybeLog(message);
        }
      })
    };
  }
};

// src/node-logger/tasks.ts
function setupAbortController() {
  let abortController = new AbortController(), isRawMode = !1, wasRawMode = process.stdin.isRaw, onKeyPress = (chunk) => {
    let key = chunk.toString();
    (key === "c" || key === "C") && abortController.abort();
  }, cleanup = () => {
    isRawMode && (process.stdin.setRawMode(wasRawMode ?? !1), process.stdin.removeListener("data", onKeyPress), wasRawMode || process.stdin.pause());
  };
  if (process.stdin.isTTY)
    try {
      isRawMode = !0, process.stdin.setRawMode(!0), process.stdin.resume(), process.stdin.on("data", onKeyPress);
    } catch {
      isRawMode = !1;
    }
  return { abortController, cleanup };
}
var executeTask = async (childProcessFactories, {
  intro: intro2,
  error: error2,
  success,
  abortable = !1
}) => {
  logTracker.addLog("info", intro2), log(intro2);
  let abortController, cleanup;
  if (abortable) {
    let result = setupAbortController();
    abortController = result.abortController, cleanup = result.cleanup;
  }
  let factories = Array.isArray(childProcessFactories) ? childProcessFactories : [childProcessFactories];
  try {
    for (let factory of factories) {
      let childProcess = factory(abortController?.signal);
      childProcess.stdout?.on("data", (data) => {
        let message = data.toString().trim();
        logTracker.addLog("info", message), log(message);
      }), await childProcess;
    }
    logTracker.addLog("info", success), log(CLI_COLORS.success(success));
  } catch (err) {
    if (abortController?.signal.aborted || err.message?.includes("Command was killed with SIGINT") || err.message?.includes("The operation was aborted"))
      return logTracker.addLog("info", `${intro2} aborted`), log(CLI_COLORS.error(`${intro2} aborted`)), "aborted";
    let errorMessage = err instanceof Error ? err.stack ?? err.message : String(err);
    throw logTracker.addLog("error", error2, { error: errorMessage }), log(CLI_COLORS.error(String(err.message ?? err))), err;
  } finally {
    cleanup?.();
  }
}, executeTaskWithSpinner = async (childProcessFactories, {
  id,
  intro: intro2,
  error: error2,
  success,
  abortable = !1
}) => {
  logTracker.addLog("info", intro2);
  let abortController, cleanup;
  if (abortable) {
    let result = setupAbortController();
    abortController = result.abortController, cleanup = result.cleanup;
  }
  let task = spinner({ id });
  task.start(intro2);
  let factories = Array.isArray(childProcessFactories) ? childProcessFactories : [childProcessFactories];
  try {
    for (let factory of factories) {
      let childProcess = factory(abortController?.signal);
      childProcess.stdout?.on("data", (data) => {
        let message = data.toString().trim().slice(0, 25);
        logTracker.addLog("info", `${intro2}: ${data.toString()}`), task.message(`${intro2}: ${message}`);
      }), await childProcess;
    }
    logTracker.addLog("info", success), task.stop(success);
  } catch (err) {
    if (abortController?.signal.aborted || err.message?.includes("Command was killed with SIGINT") || err.message?.includes("The operation was aborted"))
      return logTracker.addLog("info", `${intro2} aborted`), task.cancel(CLI_COLORS.warning(`${intro2} aborted`)), "aborted";
    let errorMessage = err instanceof Error ? err.stack ?? err.message : String(err);
    throw logTracker.addLog("error", error2, { error: errorMessage }), task.error(CLI_COLORS.error(error2)), err;
  } finally {
    cleanup?.();
  }
};

// src/node-logger/prompts/index.ts
var prompt = {
  ...prompt_functions_exports,
  ...prompt_config_exports,
  executeTask,
  executeTaskWithSpinner
};

// src/node-logger/index.ts
import_npmlog.default.stream = process.stdout;
function hex(hexColor) {
  if (!/^#?[0-9A-Fa-f]{6}$/.test(hexColor))
    throw new Error("Invalid hex color. It must be a 6-character hex code.");
  hexColor.startsWith("#") && (hexColor = hexColor.slice(1));
  let r = parseInt(hexColor.slice(0, 2), 16), g = parseInt(hexColor.slice(2, 4), 16), b = parseInt(hexColor.slice(4, 6), 16);
  return (text2) => `\x1B[38;2;${r};${g};${b}m${text2}\x1B[39m`;
}
var colors = {
  pink: hex("#F1618C"),
  purple: hex("#B57EE5"),
  orange: hex("#F3AD38"),
  green: hex("#A2E05E"),
  blue: hex("#6DABF5"),
  red: hex("#F16161"),
  gray: hex("#B8C2CC")
}, logger = {
  ...logger_exports,
  verbose: (message) => debug(message),
  line: (count = 1) => log(`${Array(count - 1).fill(`
`)}`),
  /** For non-critical issues or warnings */
  warn: (message) => warn(message),
  trace: ({ message, time }) => debug(`${message} (${colors.purple((0, import_pretty_hrtime.default)(time))})`),
  setLevel: (level = "info") => {
    import_npmlog.default.level = level, setLogLevel(level);
  },
  error: (message) => {
    let msg;
    message instanceof Error && message.stack ? msg = message.stack.toString().replace(message.toString(), colors.red(message.toString())) : typeof message == "string" ? msg = message.toString() : msg = String(message), error(msg.replaceAll(process.cwd(), "."));
  }
};
var logged = /* @__PURE__ */ new Set(), once = (type) => (message) => {
  if (!logged.has(message))
    return logged.add(message), logger[type](message);
};
once.clear = () => logged.clear();
once.verbose = once("verbose");
once.info = once("info");
once.warn = once("warn");
once.error = once("error");
var deprecate = once("warn");

export {
  require_pretty_hrtime,
  logTracker,
  protectUrls,
  createHyperlink,
  CLI_COLORS,
  ConsoleLogger,
  StyledConsoleLogger,
  prompt,
  import_npmlog,
  colors,
  logger,
  once,
  deprecate
};
