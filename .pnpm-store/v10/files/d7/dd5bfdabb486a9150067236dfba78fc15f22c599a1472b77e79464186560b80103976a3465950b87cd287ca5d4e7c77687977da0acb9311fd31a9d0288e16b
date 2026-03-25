import CJS_COMPAT_NODE_URL_3fsumx86qru from 'node:url';
import CJS_COMPAT_NODE_PATH_3fsumx86qru from 'node:path';
import CJS_COMPAT_NODE_MODULE_3fsumx86qru from "node:module";

var __filename = CJS_COMPAT_NODE_URL_3fsumx86qru.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_3fsumx86qru.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_3fsumx86qru.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  require_gte
} from "../_node-chunks/chunk-WBYCUAME.js";
import {
  __commonJS,
  __require,
  __toESM
} from "../_node-chunks/chunk-4LSYFR5U.js";

// ../../node_modules/istanbul-lib-report/node_modules/make-dir/index.js
var require_make_dir = __commonJS({
  "../../node_modules/istanbul-lib-report/node_modules/make-dir/index.js"(exports, module) {
    "use strict";
    var fs = __require("fs"), path = __require("path"), { promisify } = __require("util"), semverGte = require_gte(), useNativeRecursiveOption = semverGte(process.version, "10.12.0"), checkPath = (pth) => {
      if (process.platform === "win32" && /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ""))) {
        let error = new Error(`Path contains invalid characters: ${pth}`);
        throw error.code = "EINVAL", error;
      }
    }, processOptions = (options) => ({
      ...{
        mode: 511,
        fs
      },
      ...options
    }), permissionError = (pth) => {
      let error = new Error(`operation not permitted, mkdir '${pth}'`);
      return error.code = "EPERM", error.errno = -4048, error.path = pth, error.syscall = "mkdir", error;
    }, makeDir = async (input, options) => {
      checkPath(input), options = processOptions(options);
      let mkdir = promisify(options.fs.mkdir), stat = promisify(options.fs.stat);
      if (useNativeRecursiveOption && options.fs.mkdir === fs.mkdir) {
        let pth = path.resolve(input);
        return await mkdir(pth, {
          mode: options.mode,
          recursive: !0
        }), pth;
      }
      let make = async (pth) => {
        try {
          return await mkdir(pth, options.mode), pth;
        } catch (error) {
          if (error.code === "EPERM")
            throw error;
          if (error.code === "ENOENT") {
            if (path.dirname(pth) === pth)
              throw permissionError(pth);
            if (error.message.includes("null bytes"))
              throw error;
            return await make(path.dirname(pth)), make(pth);
          }
          try {
            if (!(await stat(pth)).isDirectory())
              throw new Error("The path is not a directory");
          } catch {
            throw error;
          }
          return pth;
        }
      };
      return make(path.resolve(input));
    };
    module.exports = makeDir;
    module.exports.sync = (input, options) => {
      if (checkPath(input), options = processOptions(options), useNativeRecursiveOption && options.fs.mkdirSync === fs.mkdirSync) {
        let pth = path.resolve(input);
        return fs.mkdirSync(pth, {
          mode: options.mode,
          recursive: !0
        }), pth;
      }
      let make = (pth) => {
        try {
          options.fs.mkdirSync(pth, options.mode);
        } catch (error) {
          if (error.code === "EPERM")
            throw error;
          if (error.code === "ENOENT") {
            if (path.dirname(pth) === pth)
              throw permissionError(pth);
            if (error.message.includes("null bytes"))
              throw error;
            return make(path.dirname(pth)), make(pth);
          }
          try {
            if (!options.fs.statSync(pth).isDirectory())
              throw new Error("The path is not a directory");
          } catch {
            throw error;
          }
        }
        return pth;
      };
      return make(path.resolve(input));
    };
  }
});

// ../../node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "../../node_modules/has-flag/index.js"(exports, module) {
    "use strict";
    module.exports = (flag, argv = process.argv) => {
      let prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--", position = argv.indexOf(prefix + flag), terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// ../../node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "../../node_modules/supports-color/index.js"(exports, module) {
    "use strict";
    var os = __require("os"), tty = __require("tty"), hasFlag = require_has_flag(), { env } = process, forceColor;
    hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never") ? forceColor = 0 : (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) && (forceColor = 1);
    "FORCE_COLOR" in env && (env.FORCE_COLOR === "true" ? forceColor = 1 : env.FORCE_COLOR === "false" ? forceColor = 0 : forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3));
    function translateLevel(level) {
      return level === 0 ? !1 : {
        level,
        hasBasic: !0,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0)
        return 0;
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor"))
        return 3;
      if (hasFlag("color=256"))
        return 2;
      if (haveStream && !streamIsTTY && forceColor === void 0)
        return 0;
      let min = forceColor || 0;
      if (env.TERM === "dumb")
        return min;
      if (process.platform === "win32") {
        let osRelease = os.release().split(".");
        return Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586 ? Number(osRelease[2]) >= 14931 ? 3 : 2 : 1;
      }
      if ("CI" in env)
        return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship" ? 1 : min;
      if ("TEAMCITY_VERSION" in env)
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      if (env.COLORTERM === "truecolor")
        return 3;
      if ("TERM_PROGRAM" in env) {
        let version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      return /-256(color)?$/i.test(env.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM) || "COLORTERM" in env ? 1 : min;
    }
    function getSupportLevel(stream) {
      let level = supportsColor(stream, stream && stream.isTTY);
      return translateLevel(level);
    }
    module.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(!0, tty.isatty(1))),
      stderr: translateLevel(supportsColor(!0, tty.isatty(2)))
    };
  }
});

// ../../node_modules/istanbul-lib-report/lib/file-writer.js
var require_file_writer = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/file-writer.js"(exports, module) {
    "use strict";
    var path = __require("path"), fs = __require("fs"), mkdirp = require_make_dir(), supportsColor = require_supports_color(), ContentWriter = class {
      /**
       * returns the colorized version of a string. Typically,
       * content writers that write to files will return the
       * same string and ones writing to a tty will wrap it in
       * appropriate escape sequences.
       * @param {String} str the string to colorize
       * @param {String} clazz one of `high`, `medium` or `low`
       * @returns {String} the colorized form of the string
       */
      colorize(str) {
        return str;
      }
      /**
       * writes a string appended with a newline to the destination
       * @param {String} str the string to write
       */
      println(str) {
        this.write(`${str}
`);
      }
      /**
       * closes this content writer. Should be called after all writes are complete.
       */
      close() {
      }
    }, FileContentWriter = class extends ContentWriter {
      constructor(fd) {
        super(), this.fd = fd;
      }
      write(str) {
        fs.writeSync(this.fd, str);
      }
      close() {
        fs.closeSync(this.fd);
      }
    }, capture = !1, output = "", ConsoleWriter = class extends ContentWriter {
      write(str) {
        capture ? output += str : process.stdout.write(str);
      }
      colorize(str, clazz) {
        let colors = {
          low: "31;1",
          medium: "33;1",
          high: "32;1"
        };
        return supportsColor.stdout && colors[clazz] ? `\x1B[${colors[clazz]}m${str}\x1B[0m` : str;
      }
    }, FileWriter = class _FileWriter {
      constructor(baseDir) {
        if (!baseDir)
          throw new Error("baseDir must be specified");
        this.baseDir = baseDir;
      }
      /**
       * static helpers for capturing stdout report output;
       * super useful for tests!
       */
      static startCapture() {
        capture = !0;
      }
      static stopCapture() {
        capture = !1;
      }
      static getOutput() {
        return output;
      }
      static resetOutput() {
        output = "";
      }
      /**
       * returns a FileWriter that is rooted at the supplied subdirectory
       * @param {String} subdir the subdirectory under which to root the
       *  returned FileWriter
       * @returns {FileWriter}
       */
      writerForDir(subdir) {
        if (path.isAbsolute(subdir))
          throw new Error(
            `Cannot create subdir writer for absolute path: ${subdir}`
          );
        return new _FileWriter(`${this.baseDir}/${subdir}`);
      }
      /**
       * copies a file from a source directory to a destination name
       * @param {String} source path to source file
       * @param {String} dest relative path to destination file
       * @param {String} [header=undefined] optional text to prepend to destination
       *  (e.g., an "this file is autogenerated" comment, copyright notice, etc.)
       */
      copyFile(source, dest, header) {
        if (path.isAbsolute(dest))
          throw new Error(`Cannot write to absolute path: ${dest}`);
        dest = path.resolve(this.baseDir, dest), mkdirp.sync(path.dirname(dest));
        let contents;
        header ? contents = header + fs.readFileSync(source, "utf8") : contents = fs.readFileSync(source), fs.writeFileSync(dest, contents);
      }
      /**
       * returns a content writer for writing content to the supplied file.
       * @param {String|null} file the relative path to the file or the special
       *  values `"-"` or `null` for writing to the console
       * @returns {ContentWriter}
       */
      writeFile(file) {
        if (file === null || file === "-")
          return new ConsoleWriter();
        if (path.isAbsolute(file))
          throw new Error(`Cannot write to absolute path: ${file}`);
        return file = path.resolve(this.baseDir, file), mkdirp.sync(path.dirname(file)), new FileContentWriter(fs.openSync(file, "w"));
      }
    };
    module.exports = FileWriter;
  }
});

// ../../node_modules/istanbul-lib-report/lib/xml-writer.js
var require_xml_writer = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/xml-writer.js"(exports, module) {
    "use strict";
    function attrString(attrs) {
      return Object.entries(attrs || {}).map(([k, v]) => ` ${k}="${v}"`).join("");
    }
    var XMLWriter = class {
      constructor(contentWriter) {
        this.cw = contentWriter, this.stack = [];
      }
      indent(str) {
        return this.stack.map(() => "  ").join("") + str;
      }
      /**
       * writes the opening XML tag with the supplied attributes
       * @param {String} name tag name
       * @param {Object} [attrs=null] attrs attributes for the tag
       */
      openTag(name, attrs) {
        let str = this.indent(`<${name + attrString(attrs)}>`);
        this.cw.println(str), this.stack.push(name);
      }
      /**
       * closes an open XML tag.
       * @param {String} name - tag name to close. This must match the writer's
       *  notion of the tag that is currently open.
       */
      closeTag(name) {
        if (this.stack.length === 0)
          throw new Error(`Attempt to close tag ${name} when not opened`);
        let stashed = this.stack.pop(), str = `</${name}>`;
        if (stashed !== name)
          throw new Error(
            `Attempt to close tag ${name} when ${stashed} was the one open`
          );
        this.cw.println(this.indent(str));
      }
      /**
       * writes a tag and its value opening and closing it at the same time
       * @param {String} name tag name
       * @param {Object} [attrs=null] attrs tag attributes
       * @param {String} [content=null] content optional tag content
       */
      inlineTag(name, attrs, content) {
        let str = "<" + name + attrString(attrs);
        content ? str += `>${content}</${name}>` : str += "/>", str = this.indent(str), this.cw.println(str);
      }
      /**
       * closes all open tags and ends the document
       */
      closeAll() {
        this.stack.slice().reverse().forEach((name) => {
          this.closeTag(name);
        });
      }
    };
    module.exports = XMLWriter;
  }
});

// ../../node_modules/istanbul-lib-report/lib/tree.js
var require_tree = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/tree.js"(exports, module) {
    "use strict";
    var Visitor = class {
      constructor(delegate) {
        this.delegate = delegate;
      }
    };
    ["Start", "End", "Summary", "SummaryEnd", "Detail"].map((k) => `on${k}`).forEach((fn) => {
      Object.defineProperty(Visitor.prototype, fn, {
        writable: !0,
        value(node, state) {
          typeof this.delegate[fn] == "function" && this.delegate[fn](node, state);
        }
      });
    });
    var CompositeVisitor = class extends Visitor {
      constructor(visitors) {
        super(), Array.isArray(visitors) || (visitors = [visitors]), this.visitors = visitors.map((v) => v instanceof Visitor ? v : new Visitor(v));
      }
    };
    ["Start", "Summary", "SummaryEnd", "Detail", "End"].map((k) => `on${k}`).forEach((fn) => {
      Object.defineProperty(CompositeVisitor.prototype, fn, {
        value(node, state) {
          this.visitors.forEach((v) => {
            v[fn](node, state);
          });
        }
      });
    });
    var BaseNode = class {
      isRoot() {
        return !this.getParent();
      }
      /**
       * visit all nodes depth-first from this node down. Note that `onStart`
       * and `onEnd` are never called on the visitor even if the current
       * node is the root of the tree.
       * @param visitor a full visitor that is called during tree traversal
       * @param state optional state that is passed around
       */
      visit(visitor, state) {
        this.isSummary() ? visitor.onSummary(this, state) : visitor.onDetail(this, state), this.getChildren().forEach((child) => {
          child.visit(visitor, state);
        }), this.isSummary() && visitor.onSummaryEnd(this, state);
      }
    }, BaseTree = class {
      constructor(root) {
        this.root = root;
      }
      /**
       * returns the root node of the tree
       */
      getRoot() {
        return this.root;
      }
      /**
       * visits the tree depth-first with the supplied partial visitor
       * @param visitor - a potentially partial visitor
       * @param state - the state to be passed around during tree traversal
       */
      visit(visitor, state) {
        visitor instanceof Visitor || (visitor = new Visitor(visitor)), visitor.onStart(this.getRoot(), state), this.getRoot().visit(visitor, state), visitor.onEnd(this.getRoot(), state);
      }
    };
    module.exports = {
      BaseTree,
      BaseNode,
      Visitor,
      CompositeVisitor
    };
  }
});

// ../../node_modules/istanbul-lib-report/lib/watermarks.js
var require_watermarks = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/watermarks.js"(exports, module) {
    "use strict";
    module.exports = {
      getDefault() {
        return {
          statements: [50, 80],
          functions: [50, 80],
          branches: [50, 80],
          lines: [50, 80]
        };
      }
    };
  }
});

// ../../node_modules/istanbul-lib-coverage/lib/percent.js
var require_percent = __commonJS({
  "../../node_modules/istanbul-lib-coverage/lib/percent.js"(exports, module) {
    "use strict";
    module.exports = function(covered, total) {
      let tmp;
      return total > 0 ? (tmp = 1e3 * 100 * covered / total, Math.floor(tmp / 10) / 100) : 100;
    };
  }
});

// ../../node_modules/istanbul-lib-coverage/lib/data-properties.js
var require_data_properties = __commonJS({
  "../../node_modules/istanbul-lib-coverage/lib/data-properties.js"(exports, module) {
    "use strict";
    module.exports = function(klass, properties) {
      properties.forEach((p) => {
        Object.defineProperty(klass.prototype, p, {
          enumerable: !0,
          get() {
            return this.data[p];
          }
        });
      });
    };
  }
});

// ../../node_modules/istanbul-lib-coverage/lib/coverage-summary.js
var require_coverage_summary = __commonJS({
  "../../node_modules/istanbul-lib-coverage/lib/coverage-summary.js"(exports, module) {
    "use strict";
    var percent = require_percent(), dataProperties = require_data_properties();
    function blankSummary() {
      let empty = () => ({
        total: 0,
        covered: 0,
        skipped: 0,
        pct: "Unknown"
      });
      return {
        lines: empty(),
        statements: empty(),
        functions: empty(),
        branches: empty(),
        branchesTrue: empty()
      };
    }
    function assertValidSummary(obj) {
      if (!(obj && obj.lines && obj.statements && obj.functions && obj.branches))
        throw new Error(
          "Invalid summary coverage object, missing keys, found:" + Object.keys(obj).join(",")
        );
    }
    var CoverageSummary = class _CoverageSummary {
      /**
       * @constructor
       * @param {Object|CoverageSummary} [obj=undefined] an optional data object or
       * another coverage summary to initialize this object with.
       */
      constructor(obj) {
        obj ? obj instanceof _CoverageSummary ? this.data = obj.data : this.data = obj : this.data = blankSummary(), assertValidSummary(this.data);
      }
      /**
       * merges a second summary coverage object into this one
       * @param {CoverageSummary} obj - another coverage summary object
       */
      merge(obj) {
        return [
          "lines",
          "statements",
          "branches",
          "functions",
          "branchesTrue"
        ].forEach((key) => {
          obj[key] && (this[key].total += obj[key].total, this[key].covered += obj[key].covered, this[key].skipped += obj[key].skipped, this[key].pct = percent(this[key].covered, this[key].total));
        }), this;
      }
      /**
       * returns a POJO that is JSON serializable. May be used to get the raw
       * summary object.
       */
      toJSON() {
        return this.data;
      }
      /**
       * return true if summary has no lines of code
       */
      isEmpty() {
        return this.lines.total === 0;
      }
    };
    dataProperties(CoverageSummary, [
      "lines",
      "statements",
      "functions",
      "branches",
      "branchesTrue"
    ]);
    module.exports = {
      CoverageSummary
    };
  }
});

// ../../node_modules/istanbul-lib-coverage/lib/file-coverage.js
var require_file_coverage = __commonJS({
  "../../node_modules/istanbul-lib-coverage/lib/file-coverage.js"(exports, module) {
    "use strict";
    var percent = require_percent(), dataProperties = require_data_properties(), { CoverageSummary } = require_coverage_summary();
    function emptyCoverage(filePath, reportLogic) {
      let cov = {
        path: filePath,
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {}
      };
      return reportLogic && (cov.bT = {}), cov;
    }
    function assertValidObject(obj) {
      if (!(obj && obj.path && obj.statementMap && obj.fnMap && obj.branchMap && obj.s && obj.f && obj.b))
        throw new Error(
          "Invalid file coverage object, missing keys, found:" + Object.keys(obj).join(",")
        );
    }
    var keyFromLoc = ({ start, end }) => `${start.line}|${start.column}|${end.line}|${end.column}`, isObj = (o) => !!o && typeof o == "object", isLineCol = (o) => isObj(o) && typeof o.line == "number" && typeof o.column == "number", isLoc = (o) => isObj(o) && isLineCol(o.start) && isLineCol(o.end), getLoc = (o) => isLoc(o) ? o : isLoc(o.loc) ? o.loc : null, findNearestContainer = (item, map) => {
      let itemLoc = getLoc(item);
      if (!itemLoc) return null;
      let nearestContainingItem = null, containerDistance = null, containerKey = null;
      for (let [i, mapItem] of Object.entries(map)) {
        let mapLoc = getLoc(mapItem);
        if (!mapLoc) continue;
        let distance = [
          itemLoc.start.line - mapLoc.start.line,
          itemLoc.start.column - mapLoc.start.column,
          mapLoc.end.line - itemLoc.end.line,
          mapLoc.end.column - itemLoc.end.column
        ];
        if (distance[0] < 0 || distance[2] < 0 || distance[0] === 0 && distance[1] < 0 || distance[2] === 0 && distance[3] < 0)
          continue;
        if (nearestContainingItem === null) {
          containerDistance = distance, nearestContainingItem = mapItem, containerKey = i;
          continue;
        }
        let closerBefore = distance[0] < containerDistance[0] || distance[0] === 0 && distance[1] < containerDistance[1], closerAfter = distance[2] < containerDistance[2] || distance[2] === 0 && distance[3] < containerDistance[3];
        (closerBefore || closerAfter) && (containerDistance = distance, nearestContainingItem = mapItem, containerKey = i);
      }
      return containerKey;
    }, addHits = (aHits, bHits) => typeof aHits == "number" && typeof bHits == "number" ? aHits + bHits : Array.isArray(aHits) && Array.isArray(bHits) ? aHits.map((a, i) => (a || 0) + (bHits[i] || 0)) : null, addNearestContainerHits = (item, itemHits, map, mapHits) => {
      let container = findNearestContainer(item, map);
      return container ? addHits(itemHits, mapHits[container]) : itemHits;
    }, mergeProp = (aHits, aMap, bHits, bMap, itemKey = keyFromLoc) => {
      let aItems = {};
      for (let [key, itemHits] of Object.entries(aHits)) {
        let item = aMap[key];
        aItems[itemKey(item)] = [itemHits, item];
      }
      let bItems = {};
      for (let [key, itemHits] of Object.entries(bHits)) {
        let item = bMap[key];
        bItems[itemKey(item)] = [itemHits, item];
      }
      let mergedItems = {};
      for (let [key, aValue] of Object.entries(aItems)) {
        let aItemHits = aValue[0], aItem = aValue[1], bValue = bItems[key];
        bValue ? aItemHits = addHits(aItemHits, bValue[0]) : aItemHits = addNearestContainerHits(aItem, aItemHits, bMap, bHits), mergedItems[key] = [aItemHits, aItem];
      }
      for (let [key, bValue] of Object.entries(bItems)) {
        let bItemHits = bValue[0], bItem = bValue[1];
        mergedItems[key] || (bItemHits = addNearestContainerHits(bItem, bItemHits, aMap, aHits), mergedItems[key] = [bItemHits, bItem]);
      }
      let hits = {}, map = {};
      return Object.values(mergedItems).forEach(([itemHits, item], i) => {
        hits[i] = itemHits, map[i] = item;
      }), [hits, map];
    }, FileCoverage = class _FileCoverage {
      /**
       * @constructor
       * @param {Object|FileCoverage|String} pathOrObj is a string that initializes
       * and empty coverage object with the specified file path or a data object that
       * has all the required properties for a file coverage object.
       */
      constructor(pathOrObj, reportLogic = !1) {
        if (!pathOrObj)
          throw new Error(
            "Coverage must be initialized with a path or an object"
          );
        if (typeof pathOrObj == "string")
          this.data = emptyCoverage(pathOrObj, reportLogic);
        else if (pathOrObj instanceof _FileCoverage)
          this.data = pathOrObj.data;
        else if (typeof pathOrObj == "object")
          this.data = pathOrObj;
        else
          throw new Error("Invalid argument to coverage constructor");
        assertValidObject(this.data);
      }
      /**
       * returns computed line coverage from statement coverage.
       * This is a map of hits keyed by line number in the source.
       */
      getLineCoverage() {
        let statementMap = this.data.statementMap, statements = this.data.s, lineMap = /* @__PURE__ */ Object.create(null);
        return Object.entries(statements).forEach(([st, count]) => {
          if (!statementMap[st])
            return;
          let { line } = statementMap[st].start, prevVal = lineMap[line];
          (prevVal === void 0 || prevVal < count) && (lineMap[line] = count);
        }), lineMap;
      }
      /**
       * returns an array of uncovered line numbers.
       * @returns {Array} an array of line numbers for which no hits have been
       *  collected.
       */
      getUncoveredLines() {
        let lc = this.getLineCoverage(), ret = [];
        return Object.entries(lc).forEach(([l, hits]) => {
          hits === 0 && ret.push(l);
        }), ret;
      }
      /**
       * returns a map of branch coverage by source line number.
       * @returns {Object} an object keyed by line number. Each object
       * has a `covered`, `total` and `coverage` (percentage) property.
       */
      getBranchCoverageByLine() {
        let branchMap = this.branchMap, branches = this.b, ret = {};
        return Object.entries(branchMap).forEach(([k, map]) => {
          let line = map.line || map.loc.start.line, branchData = branches[k];
          ret[line] = ret[line] || [], ret[line].push(...branchData);
        }), Object.entries(ret).forEach(([k, dataArray]) => {
          let covered = dataArray.filter((item) => item > 0), coverage = covered.length / dataArray.length * 100;
          ret[k] = {
            covered: covered.length,
            total: dataArray.length,
            coverage
          };
        }), ret;
      }
      /**
       * return a JSON-serializable POJO for this file coverage object
       */
      toJSON() {
        return this.data;
      }
      /**
       * merges a second coverage object into this one, updating hit counts
       * @param {FileCoverage} other - the coverage object to be merged into this one.
       *  Note that the other object should have the same structure as this one (same file).
       */
      merge(other) {
        if (other.all === !0)
          return;
        if (this.all === !0) {
          this.data = other.data;
          return;
        }
        let [hits, map] = mergeProp(
          this.s,
          this.statementMap,
          other.s,
          other.statementMap
        );
        this.data.s = hits, this.data.statementMap = map;
        let keyFromLocProp = (x) => keyFromLoc(x.loc), keyFromLocationsProp = (x) => keyFromLoc(x.locations[0]);
        [hits, map] = mergeProp(
          this.f,
          this.fnMap,
          other.f,
          other.fnMap,
          keyFromLocProp
        ), this.data.f = hits, this.data.fnMap = map, [hits, map] = mergeProp(
          this.b,
          this.branchMap,
          other.b,
          other.branchMap,
          keyFromLocationsProp
        ), this.data.b = hits, this.data.branchMap = map, this.bT && other.bT && ([hits, map] = mergeProp(
          this.bT,
          this.branchMap,
          other.bT,
          other.branchMap,
          keyFromLocationsProp
        ), this.data.bT = hits);
      }
      computeSimpleTotals(property) {
        let stats = this[property];
        typeof stats == "function" && (stats = stats.call(this));
        let ret = {
          total: Object.keys(stats).length,
          covered: Object.values(stats).filter((v) => !!v).length,
          skipped: 0
        };
        return ret.pct = percent(ret.covered, ret.total), ret;
      }
      computeBranchTotals(property) {
        let stats = this[property], ret = { total: 0, covered: 0, skipped: 0 };
        return Object.values(stats).forEach((branches) => {
          ret.covered += branches.filter((hits) => hits > 0).length, ret.total += branches.length;
        }), ret.pct = percent(ret.covered, ret.total), ret;
      }
      /**
       * resets hit counts for all statements, functions and branches
       * in this coverage object resulting in zero coverage.
       */
      resetHits() {
        let statements = this.s, functions = this.f, branches = this.b, branchesTrue = this.bT;
        Object.keys(statements).forEach((s) => {
          statements[s] = 0;
        }), Object.keys(functions).forEach((f) => {
          functions[f] = 0;
        }), Object.keys(branches).forEach((b) => {
          branches[b].fill(0);
        }), branchesTrue && Object.keys(branchesTrue).forEach((bT) => {
          branchesTrue[bT].fill(0);
        });
      }
      /**
       * returns a CoverageSummary for this file coverage object
       * @returns {CoverageSummary}
       */
      toSummary() {
        let ret = {};
        return ret.lines = this.computeSimpleTotals("getLineCoverage"), ret.functions = this.computeSimpleTotals("f", "fnMap"), ret.statements = this.computeSimpleTotals("s", "statementMap"), ret.branches = this.computeBranchTotals("b"), this.bT && (ret.branchesTrue = this.computeBranchTotals("bT")), new CoverageSummary(ret);
      }
    };
    dataProperties(FileCoverage, [
      "path",
      "statementMap",
      "fnMap",
      "branchMap",
      "s",
      "f",
      "b",
      "bT",
      "all"
    ]);
    module.exports = {
      FileCoverage,
      // exported for testing
      findNearestContainer,
      addHits,
      addNearestContainerHits
    };
  }
});

// ../../node_modules/istanbul-lib-coverage/lib/coverage-map.js
var require_coverage_map = __commonJS({
  "../../node_modules/istanbul-lib-coverage/lib/coverage-map.js"(exports, module) {
    "use strict";
    var { FileCoverage } = require_file_coverage(), { CoverageSummary } = require_coverage_summary();
    function maybeConstruct(obj, klass) {
      return obj instanceof klass ? obj : new klass(obj);
    }
    function loadMap(source) {
      let data = /* @__PURE__ */ Object.create(null);
      return source && Object.entries(source).forEach(([k, cov]) => {
        data[k] = maybeConstruct(cov, FileCoverage);
      }), data;
    }
    var CoverageMap = class _CoverageMap {
      /**
       * @constructor
       * @param {Object} [obj=undefined] obj A coverage map from which to initialize this
       * map's contents. This can be the raw global coverage object.
       */
      constructor(obj) {
        obj instanceof _CoverageMap ? this.data = obj.data : this.data = loadMap(obj);
      }
      /**
       * merges a second coverage map into this one
       * @param {CoverageMap} obj - a CoverageMap or its raw data. Coverage is merged
       *  correctly for the same files and additional file coverage keys are created
       *  as needed.
       */
      merge(obj) {
        let other = maybeConstruct(obj, _CoverageMap);
        Object.values(other.data).forEach((fc) => {
          this.addFileCoverage(fc);
        });
      }
      /**
       * filter the coveragemap based on the callback provided
       * @param {Function (filename)} callback - Returns true if the path
       *  should be included in the coveragemap. False if it should be
       *  removed.
       */
      filter(callback) {
        Object.keys(this.data).forEach((k) => {
          callback(k) || delete this.data[k];
        });
      }
      /**
       * returns a JSON-serializable POJO for this coverage map
       * @returns {Object}
       */
      toJSON() {
        return this.data;
      }
      /**
       * returns an array for file paths for which this map has coverage
       * @returns {Array{string}} - array of files
       */
      files() {
        return Object.keys(this.data);
      }
      /**
       * returns the file coverage for the specified file.
       * @param {String} file
       * @returns {FileCoverage}
       */
      fileCoverageFor(file) {
        let fc = this.data[file];
        if (!fc)
          throw new Error(`No file coverage available for: ${file}`);
        return fc;
      }
      /**
       * adds a file coverage object to this map. If the path for the object,
       * already exists in the map, it is merged with the existing coverage
       * otherwise a new key is added to the map.
       * @param {FileCoverage} fc the file coverage to add
       */
      addFileCoverage(fc) {
        let cov = new FileCoverage(fc), { path } = cov;
        this.data[path] ? this.data[path].merge(cov) : this.data[path] = cov;
      }
      /**
       * returns the coverage summary for all the file coverage objects in this map.
       * @returns {CoverageSummary}
       */
      getCoverageSummary() {
        let ret = new CoverageSummary();
        return Object.values(this.data).forEach((fc) => {
          ret.merge(fc.toSummary());
        }), ret;
      }
    };
    module.exports = {
      CoverageMap
    };
  }
});

// ../../node_modules/istanbul-lib-coverage/index.js
var require_istanbul_lib_coverage = __commonJS({
  "../../node_modules/istanbul-lib-coverage/index.js"(exports, module) {
    "use strict";
    var { FileCoverage } = require_file_coverage(), { CoverageMap } = require_coverage_map(), { CoverageSummary } = require_coverage_summary();
    module.exports = {
      /**
       * creates a coverage summary object
       * @param {Object} obj an argument with the same semantics
       *  as the one passed to the `CoverageSummary` constructor
       * @returns {CoverageSummary}
       */
      createCoverageSummary(obj) {
        return obj && obj instanceof CoverageSummary ? obj : new CoverageSummary(obj);
      },
      /**
       * creates a CoverageMap object
       * @param {Object} obj optional - an argument with the same semantics
       *  as the one passed to the CoverageMap constructor.
       * @returns {CoverageMap}
       */
      createCoverageMap(obj) {
        return obj && obj instanceof CoverageMap ? obj : new CoverageMap(obj);
      },
      /**
       * creates a FileCoverage object
       * @param {Object} obj optional - an argument with the same semantics
       *  as the one passed to the FileCoverage constructor.
       * @returns {FileCoverage}
       */
      createFileCoverage(obj) {
        return obj && obj instanceof FileCoverage ? obj : new FileCoverage(obj);
      }
    };
    module.exports.classes = {
      /**
       * the file coverage constructor
       */
      FileCoverage
    };
  }
});

// ../../node_modules/istanbul-lib-report/lib/path.js
var require_path = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/path.js"(exports, module) {
    "use strict";
    var path = __require("path"), parsePath = path.parse, SEP = path.sep, origParser = parsePath, origSep = SEP;
    function makeRelativeNormalizedPath(str, sep) {
      let parsed = parsePath(str), root = parsed.root, dir, file = parsed.base, quoted, pos;
      return sep === "\\" && (pos = root.indexOf(":\\"), pos >= 0 && (root = root.substring(0, pos + 2))), dir = parsed.dir.substring(root.length), str === "" ? [] : (sep !== "/" && (quoted = new RegExp(sep.replace(/\W/g, "\\$&"), "g"), dir = dir.replace(quoted, "/"), file = file.replace(quoted, "/")), dir !== "" ? dir = `${dir}/${file}` : dir = file, dir.substring(0, 1) === "/" && (dir = dir.substring(1)), dir = dir.split(/\/+/), dir);
    }
    var Path = class _Path {
      constructor(strOrArray) {
        if (Array.isArray(strOrArray))
          this.v = strOrArray;
        else if (typeof strOrArray == "string")
          this.v = makeRelativeNormalizedPath(strOrArray, SEP);
        else
          throw new Error(
            `Invalid Path argument must be string or array:${strOrArray}`
          );
      }
      toString() {
        return this.v.join("/");
      }
      hasParent() {
        return this.v.length > 0;
      }
      parent() {
        if (!this.hasParent())
          throw new Error("Unable to get parent for 0 elem path");
        let p = this.v.slice();
        return p.pop(), new _Path(p);
      }
      elements() {
        return this.v.slice();
      }
      name() {
        return this.v.slice(-1)[0];
      }
      contains(other) {
        let i;
        if (other.length > this.length)
          return !1;
        for (i = 0; i < other.length; i += 1)
          if (this.v[i] !== other.v[i])
            return !1;
        return !0;
      }
      ancestorOf(other) {
        return other.contains(this) && other.length !== this.length;
      }
      descendantOf(other) {
        return this.contains(other) && other.length !== this.length;
      }
      commonPrefixPath(other) {
        let len = this.length > other.length ? other.length : this.length, i, ret = [];
        for (i = 0; i < len && this.v[i] === other.v[i]; i += 1)
          ret.push(this.v[i]);
        return new _Path(ret);
      }
      static compare(a, b) {
        let al = a.length, bl = b.length;
        if (al < bl)
          return -1;
        if (al > bl)
          return 1;
        let astr = a.toString(), bstr = b.toString();
        return astr < bstr ? -1 : astr > bstr ? 1 : 0;
      }
    };
    ["push", "pop", "shift", "unshift", "splice"].forEach((fn) => {
      Object.defineProperty(Path.prototype, fn, {
        value(...args) {
          return this.v[fn](...args);
        }
      });
    });
    Object.defineProperty(Path.prototype, "length", {
      enumerable: !0,
      get() {
        return this.v.length;
      }
    });
    module.exports = Path;
    Path.tester = {
      setParserAndSep(p, sep) {
        parsePath = p, SEP = sep;
      },
      reset() {
        parsePath = origParser, SEP = origSep;
      }
    };
  }
});

// ../../node_modules/istanbul-lib-report/lib/summarizer-factory.js
var require_summarizer_factory = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/summarizer-factory.js"(exports, module) {
    "use strict";
    var coverage = require_istanbul_lib_coverage(), Path = require_path(), { BaseNode, BaseTree } = require_tree(), ReportNode = class _ReportNode extends BaseNode {
      constructor(path, fileCoverage) {
        super(), this.path = path, this.parent = null, this.fileCoverage = fileCoverage, this.children = [];
      }
      static createRoot(children) {
        let root = new _ReportNode(new Path([]));
        return children.forEach((child) => {
          root.addChild(child);
        }), root;
      }
      addChild(child) {
        child.parent = this, this.children.push(child);
      }
      asRelative(p) {
        return p.substring(0, 1) === "/" ? p.substring(1) : p;
      }
      getQualifiedName() {
        return this.asRelative(this.path.toString());
      }
      getRelativeName() {
        let parent = this.getParent(), myPath = this.path, relPath, i, parentPath = parent ? parent.path : new Path([]);
        if (parentPath.ancestorOf(myPath)) {
          for (relPath = new Path(myPath.elements()), i = 0; i < parentPath.length; i += 1)
            relPath.shift();
          return this.asRelative(relPath.toString());
        }
        return this.asRelative(this.path.toString());
      }
      getParent() {
        return this.parent;
      }
      getChildren() {
        return this.children;
      }
      isSummary() {
        return !this.fileCoverage;
      }
      getFileCoverage() {
        return this.fileCoverage;
      }
      getCoverageSummary(filesOnly) {
        let cacheProp = `c_${filesOnly ? "files" : "full"}`, summary;
        if (Object.prototype.hasOwnProperty.call(this, cacheProp))
          return this[cacheProp];
        if (!this.isSummary())
          summary = this.getFileCoverage().toSummary();
        else {
          let count = 0;
          summary = coverage.createCoverageSummary(), this.getChildren().forEach((child) => {
            filesOnly && child.isSummary() || (count += 1, summary.merge(child.getCoverageSummary(filesOnly)));
          }), count === 0 && filesOnly && (summary = null);
        }
        return this[cacheProp] = summary, summary;
      }
    }, ReportTree = class extends BaseTree {
      constructor(root, childPrefix) {
        super(root);
        let maybePrefix = (node) => {
          childPrefix && !node.isRoot() && node.path.unshift(childPrefix);
        };
        this.visit({
          onDetail: maybePrefix,
          onSummary(node) {
            maybePrefix(node), node.children.sort((a, b) => {
              let astr = a.path.toString(), bstr = b.path.toString();
              return astr < bstr ? -1 : astr > bstr ? 1 : (
                /* istanbul ignore next */
                0
              );
            });
          }
        });
      }
    };
    function findCommonParent(paths) {
      return paths.reduce(
        (common, path) => common.commonPrefixPath(path),
        paths[0] || new Path([])
      );
    }
    function findOrCreateParent(parentPath, nodeMap, created = () => {
    }) {
      let parent = nodeMap[parentPath.toString()];
      return parent || (parent = new ReportNode(parentPath), nodeMap[parentPath.toString()] = parent, created(parentPath, parent)), parent;
    }
    function toDirParents(list) {
      let nodeMap = /* @__PURE__ */ Object.create(null);
      return list.forEach((o) => {
        findOrCreateParent(o.path.parent(), nodeMap).addChild(new ReportNode(o.path, o.fileCoverage));
      }), Object.values(nodeMap);
    }
    function addAllPaths(topPaths, nodeMap, path, node) {
      findOrCreateParent(
        path.parent(),
        nodeMap,
        (parentPath, parent2) => {
          parentPath.hasParent() ? addAllPaths(topPaths, nodeMap, parentPath, parent2) : topPaths.push(parent2);
        }
      ).addChild(node);
    }
    function foldIntoOneDir(node, parent) {
      let { children } = node;
      return children.length === 1 && !children[0].fileCoverage ? (children[0].parent = parent, foldIntoOneDir(children[0], parent)) : (node.children = children.map((child) => foldIntoOneDir(child, node)), node);
    }
    function pkgSummaryPrefix(dirParents, commonParent) {
      if (dirParents.some((dp) => dp.path.length === 0))
        return commonParent.length === 0 ? "root" : commonParent.name();
    }
    var SummarizerFactory = class {
      constructor(coverageMap, defaultSummarizer = "pkg") {
        this._coverageMap = coverageMap, this._defaultSummarizer = defaultSummarizer, this._initialList = coverageMap.files().map((filePath) => ({
          filePath,
          path: new Path(filePath),
          fileCoverage: coverageMap.fileCoverageFor(filePath)
        })), this._commonParent = findCommonParent(
          this._initialList.map((o) => o.path.parent())
        ), this._commonParent.length > 0 && this._initialList.forEach((o) => {
          o.path.splice(0, this._commonParent.length);
        });
      }
      get defaultSummarizer() {
        return this[this._defaultSummarizer];
      }
      get flat() {
        return this._flat || (this._flat = new ReportTree(
          ReportNode.createRoot(
            this._initialList.map(
              (node) => new ReportNode(node.path, node.fileCoverage)
            )
          )
        )), this._flat;
      }
      _createPkg() {
        let dirParents = toDirParents(this._initialList);
        return dirParents.length === 1 ? new ReportTree(dirParents[0]) : new ReportTree(
          ReportNode.createRoot(dirParents),
          pkgSummaryPrefix(dirParents, this._commonParent)
        );
      }
      get pkg() {
        return this._pkg || (this._pkg = this._createPkg()), this._pkg;
      }
      _createNested() {
        let nodeMap = /* @__PURE__ */ Object.create(null), topPaths = [];
        this._initialList.forEach((o) => {
          let node = new ReportNode(o.path, o.fileCoverage);
          addAllPaths(topPaths, nodeMap, o.path, node);
        });
        let topNodes = topPaths.map((node) => foldIntoOneDir(node));
        return topNodes.length === 1 ? new ReportTree(topNodes[0]) : new ReportTree(ReportNode.createRoot(topNodes));
      }
      get nested() {
        return this._nested || (this._nested = this._createNested()), this._nested;
      }
    };
    module.exports = SummarizerFactory;
  }
});

// ../../node_modules/istanbul-lib-report/lib/context.js
var require_context = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/context.js"(exports, module) {
    "use strict";
    var fs = __require("fs"), FileWriter = require_file_writer(), XMLWriter = require_xml_writer(), tree = require_tree(), watermarks = require_watermarks(), SummarizerFactory = require_summarizer_factory();
    function defaultSourceLookup(path) {
      try {
        return fs.readFileSync(path, "utf8");
      } catch (ex) {
        throw new Error(`Unable to lookup source: ${path} (${ex.message})`);
      }
    }
    function normalizeWatermarks(specified = {}) {
      return Object.entries(watermarks.getDefault()).forEach(([k, value]) => {
        let specValue = specified[k];
        (!Array.isArray(specValue) || specValue.length !== 2) && (specified[k] = value);
      }), specified;
    }
    var Context = class {
      constructor(opts) {
        this.dir = opts.dir || "coverage", this.watermarks = normalizeWatermarks(opts.watermarks), this.sourceFinder = opts.sourceFinder || defaultSourceLookup, this._summarizerFactory = new SummarizerFactory(
          opts.coverageMap,
          opts.defaultSummarizer
        ), this.data = {};
      }
      /**
       * returns a FileWriter implementation for reporting use. Also available
       * as the `writer` property on the context.
       * @returns {Writer}
       */
      getWriter() {
        return this.writer;
      }
      /**
       * returns the source code for the specified file path or throws if
       * the source could not be found.
       * @param {String} filePath the file path as found in a file coverage object
       * @returns {String} the source code
       */
      getSource(filePath) {
        return this.sourceFinder(filePath);
      }
      /**
       * returns the coverage class given a coverage
       * types and a percentage value.
       * @param {String} type - the coverage type, one of `statements`, `functions`,
       *  `branches`, or `lines`
       * @param {Number} value - the percentage value
       * @returns {String} one of `high`, `medium` or `low`
       */
      classForPercent(type, value) {
        let watermarks2 = this.watermarks[type];
        return watermarks2 ? value < watermarks2[0] ? "low" : value >= watermarks2[1] ? "high" : "medium" : "unknown";
      }
      /**
       * returns an XML writer for the supplied content writer
       * @param {ContentWriter} contentWriter the content writer to which the returned XML writer
       *  writes data
       * @returns {XMLWriter}
       */
      getXMLWriter(contentWriter) {
        return new XMLWriter(contentWriter);
      }
      /**
       * returns a full visitor given a partial one.
       * @param {Object} partialVisitor a partial visitor only having the functions of
       *  interest to the caller. These functions are called with a scope that is the
       *  supplied object.
       * @returns {Visitor}
       */
      getVisitor(partialVisitor) {
        return new tree.Visitor(partialVisitor);
      }
      getTree(name = "defaultSummarizer") {
        return this._summarizerFactory[name];
      }
    };
    Object.defineProperty(Context.prototype, "writer", {
      enumerable: !0,
      get() {
        return this.data.writer || (this.data.writer = new FileWriter(this.dir)), this.data.writer;
      }
    });
    module.exports = Context;
  }
});

// ../../node_modules/istanbul-lib-report/lib/report-base.js
var require_report_base = __commonJS({
  "../../node_modules/istanbul-lib-report/lib/report-base.js"(exports, module) {
    "use strict";
    var _summarizer = Symbol("ReportBase.#summarizer"), ReportBase2 = class {
      constructor(opts = {}) {
        this[_summarizer] = opts.summarizer;
      }
      execute(context) {
        context.getTree(this[_summarizer]).visit(this, context);
      }
    };
    module.exports = ReportBase2;
  }
});

// ../../node_modules/istanbul-lib-report/index.js
var require_istanbul_lib_report = __commonJS({
  "../../node_modules/istanbul-lib-report/index.js"(exports, module) {
    "use strict";
    var Context = require_context(), watermarks = require_watermarks(), ReportBase2 = require_report_base();
    module.exports = {
      /**
       * returns a reporting context for the supplied options
       * @param {Object} [opts=null] opts
       * @returns {Context}
       */
      createContext(opts) {
        return new Context(opts);
      },
      /**
       * returns the default watermarks that would be used when not
       * overridden
       * @returns {Object} an object with `statements`, `functions`, `branches`,
       *  and `line` keys. Each value is a 2 element array that has the low and
       *  high watermark as percentages.
       */
      getDefaultWatermarks() {
        return watermarks.getDefault();
      },
      /**
       * Base class for all reports
       */
      ReportBase: ReportBase2
    };
  }
});

// src/node/coverage-reporter.ts
var import_istanbul_lib_report = __toESM(require_istanbul_lib_report(), 1), StorybookCoverageReporter = class extends import_istanbul_lib_report.ReportBase {
  #testManager;
  #coverageOptions;
  constructor(opts) {
    super(), this.#testManager = opts.testManager, this.#coverageOptions = opts.coverageOptions;
  }
  onSummary(node) {
    if (!node.isRoot())
      return;
    let rawCoverageSummary = node.getCoverageSummary(!1), percentage = Math.round(rawCoverageSummary.data.statements.pct), [lowWatermark = 50, highWatermark = 80] = this.#coverageOptions?.watermarks?.statements ?? [], coverageSummary = {
      percentage,
      status: percentage < lowWatermark ? "negative" : percentage < highWatermark ? "warning" : "positive"
    };
    this.#testManager.onCoverageCollected(coverageSummary);
  }
};
export {
  StorybookCoverageReporter as "module.exports"
};
