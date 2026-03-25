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
  BROWSER_TARGETS,
  NODE_TARGET,
  SUPPORTED_FEATURES
} from "./chunk-OQY7D22D.js";
import {
  require_build
} from "./chunk-ONZANTK7.js";
import {
  resolveModulePath,
  resolvePackageDir
} from "./chunk-O7UZQAUS.js";
import {
  join,
  parse
} from "./chunk-XS5OAKHK.js";
import {
  slash
} from "./chunk-PF7HEE6F.js";
import {
  __commonJS,
  __require,
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/ejs/lib/utils.js
var require_utils = __commonJS({
  "../node_modules/ejs/lib/utils.js"(exports) {
    "use strict";
    var regExpChars = /[|\\{}()[\]^$+*?.]/g, hasOwnProperty = Object.prototype.hasOwnProperty, hasOwn = function(obj, key) {
      return hasOwnProperty.apply(obj, [key]);
    };
    exports.escapeRegExpChars = function(string) {
      return string ? String(string).replace(regExpChars, "\\$&") : "";
    };
    var _ENCODE_HTML_RULES = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&#34;",
      "'": "&#39;"
    }, _MATCH_HTML = /[&<>'"]/g;
    function encode_char(c) {
      return _ENCODE_HTML_RULES[c] || c;
    }
    var escapeFuncStr = `var _ENCODE_HTML_RULES = {
      "&": "&amp;"
    , "<": "&lt;"
    , ">": "&gt;"
    , '"': "&#34;"
    , "'": "&#39;"
    }
  , _MATCH_HTML = /[&<>'"]/g;
function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
};
`;
    exports.escapeXML = function(markup) {
      return markup == null ? "" : String(markup).replace(_MATCH_HTML, encode_char);
    };
    function escapeXMLToString() {
      return Function.prototype.toString.call(this) + `;
` + escapeFuncStr;
    }
    try {
      typeof Object.defineProperty == "function" ? Object.defineProperty(exports.escapeXML, "toString", { value: escapeXMLToString }) : exports.escapeXML.toString = escapeXMLToString;
    } catch {
      console.warn("Unable to set escapeXML.toString (is the Function prototype frozen?)");
    }
    exports.shallowCopy = function(to, from) {
      if (from = from || {}, to != null)
        for (var p in from)
          hasOwn(from, p) && (p === "__proto__" || p === "constructor" || (to[p] = from[p]));
      return to;
    };
    exports.shallowCopyFromList = function(to, from, list) {
      if (list = list || [], from = from || {}, to != null)
        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          if (typeof from[p] < "u") {
            if (!hasOwn(from, p) || p === "__proto__" || p === "constructor")
              continue;
            to[p] = from[p];
          }
        }
      return to;
    };
    exports.cache = {
      _data: {},
      set: function(key, val) {
        this._data[key] = val;
      },
      get: function(key) {
        return this._data[key];
      },
      remove: function(key) {
        delete this._data[key];
      },
      reset: function() {
        this._data = {};
      }
    };
    exports.hyphenToCamel = function(str) {
      return str.replace(/-[a-z]/g, function(match) {
        return match[1].toUpperCase();
      });
    };
    exports.createNullProtoObjWherePossible = (function() {
      return typeof Object.create == "function" ? function() {
        return /* @__PURE__ */ Object.create(null);
      } : { __proto__: null } instanceof Object ? function() {
        return {};
      } : function() {
        return { __proto__: null };
      };
    })();
    exports.hasOwnOnlyObject = function(obj) {
      var o = exports.createNullProtoObjWherePossible();
      for (var p in obj)
        hasOwn(obj, p) && (o[p] = obj[p]);
      return o;
    };
  }
});

// ../node_modules/ejs/package.json
var require_package = __commonJS({
  "../node_modules/ejs/package.json"(exports, module) {
    module.exports = {
      name: "ejs",
      description: "Embedded JavaScript templates",
      keywords: [
        "template",
        "engine",
        "ejs"
      ],
      version: "3.1.10",
      author: "Matthew Eernisse <mde@fleegix.org> (http://fleegix.org)",
      license: "Apache-2.0",
      bin: {
        ejs: "./bin/cli.js"
      },
      main: "./lib/ejs.js",
      jsdelivr: "ejs.min.js",
      unpkg: "ejs.min.js",
      repository: {
        type: "git",
        url: "git://github.com/mde/ejs.git"
      },
      bugs: "https://github.com/mde/ejs/issues",
      homepage: "https://github.com/mde/ejs",
      dependencies: {
        jake: "^10.8.5"
      },
      devDependencies: {
        browserify: "^16.5.1",
        eslint: "^6.8.0",
        "git-directory-deploy": "^1.5.1",
        jsdoc: "^4.0.2",
        "lru-cache": "^4.0.1",
        mocha: "^10.2.0",
        "uglify-js": "^3.3.16"
      },
      engines: {
        node: ">=0.10.0"
      },
      scripts: {
        test: "npx jake test"
      }
    };
  }
});

// ../node_modules/ejs/lib/ejs.js
var require_ejs = __commonJS({
  "../node_modules/ejs/lib/ejs.js"(exports) {
    "use strict";
    var fs = __require("fs"), path = __require("path"), utils = require_utils(), scopeOptionWarned = !1, _VERSION_STRING = require_package().version, _DEFAULT_OPEN_DELIMITER = "<", _DEFAULT_CLOSE_DELIMITER = ">", _DEFAULT_DELIMITER = "%", _DEFAULT_LOCALS_NAME = "locals", _NAME = "ejs", _REGEX_STRING = "(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)", _OPTS_PASSABLE_WITH_DATA = [
      "delimiter",
      "scope",
      "context",
      "debug",
      "compileDebug",
      "client",
      "_with",
      "rmWhitespace",
      "strict",
      "filename",
      "async"
    ], _OPTS_PASSABLE_WITH_DATA_EXPRESS = _OPTS_PASSABLE_WITH_DATA.concat("cache"), _BOM = /^\uFEFF/, _JS_IDENTIFIER = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
    exports.cache = utils.cache;
    exports.fileLoader = fs.readFileSync;
    exports.localsName = _DEFAULT_LOCALS_NAME;
    exports.promiseImpl = new Function("return this;")().Promise;
    exports.resolveInclude = function(name, filename, isDir) {
      var dirname3 = path.dirname, extname = path.extname, resolve = path.resolve, includePath = resolve(isDir ? filename : dirname3(filename), name), ext = extname(name);
      return ext || (includePath += ".ejs"), includePath;
    };
    function resolvePaths(name, paths) {
      var filePath;
      if (paths.some(function(v) {
        return filePath = exports.resolveInclude(name, v, !0), fs.existsSync(filePath);
      }))
        return filePath;
    }
    function getIncludePath(path2, options) {
      var includePath, filePath, views = options.views, match = /^[A-Za-z]+:\\|^\//.exec(path2);
      if (match && match.length)
        path2 = path2.replace(/^\/*/, ""), Array.isArray(options.root) ? includePath = resolvePaths(path2, options.root) : includePath = exports.resolveInclude(path2, options.root || "/", !0);
      else if (options.filename && (filePath = exports.resolveInclude(path2, options.filename), fs.existsSync(filePath) && (includePath = filePath)), !includePath && Array.isArray(views) && (includePath = resolvePaths(path2, views)), !includePath && typeof options.includer != "function")
        throw new Error('Could not find the include file "' + options.escapeFunction(path2) + '"');
      return includePath;
    }
    function handleCache(options, template) {
      var func, filename = options.filename, hasTemplate = arguments.length > 1;
      if (options.cache) {
        if (!filename)
          throw new Error("cache option requires a filename");
        if (func = exports.cache.get(filename), func)
          return func;
        hasTemplate || (template = fileLoader(filename).toString().replace(_BOM, ""));
      } else if (!hasTemplate) {
        if (!filename)
          throw new Error("Internal EJS error: no file name or template provided");
        template = fileLoader(filename).toString().replace(_BOM, "");
      }
      return func = exports.compile(template, options), options.cache && exports.cache.set(filename, func), func;
    }
    function tryHandleCache(options, data, cb) {
      var result;
      if (cb) {
        try {
          result = handleCache(options)(data);
        } catch (err) {
          return cb(err);
        }
        cb(null, result);
      } else {
        if (typeof exports.promiseImpl == "function")
          return new exports.promiseImpl(function(resolve, reject) {
            try {
              result = handleCache(options)(data), resolve(result);
            } catch (err) {
              reject(err);
            }
          });
        throw new Error("Please provide a callback function");
      }
    }
    function fileLoader(filePath) {
      return exports.fileLoader(filePath);
    }
    function includeFile(path2, options) {
      var opts = utils.shallowCopy(utils.createNullProtoObjWherePossible(), options);
      if (opts.filename = getIncludePath(path2, opts), typeof options.includer == "function") {
        var includerResult = options.includer(path2, opts.filename);
        if (includerResult && (includerResult.filename && (opts.filename = includerResult.filename), includerResult.template))
          return handleCache(opts, includerResult.template);
      }
      return handleCache(opts);
    }
    function rethrow(err, str, flnm, lineno, esc) {
      var lines = str.split(`
`), start2 = Math.max(lineno - 3, 0), end = Math.min(lines.length, lineno + 3), filename = esc(flnm), context = lines.slice(start2, end).map(function(line, i) {
        var curr = i + start2 + 1;
        return (curr == lineno ? " >> " : "    ") + curr + "| " + line;
      }).join(`
`);
      throw err.path = filename, err.message = (filename || "ejs") + ":" + lineno + `
` + context + `

` + err.message, err;
    }
    function stripSemi(str) {
      return str.replace(/;(\s*$)/, "$1");
    }
    exports.compile = function(template, opts) {
      var templ;
      return opts && opts.scope && (scopeOptionWarned || (console.warn("`scope` option is deprecated and will be removed in EJS 3"), scopeOptionWarned = !0), opts.context || (opts.context = opts.scope), delete opts.scope), templ = new Template(template, opts), templ.compile();
    };
    exports.render = function(template, d, o) {
      var data = d || utils.createNullProtoObjWherePossible(), opts = o || utils.createNullProtoObjWherePossible();
      return arguments.length == 2 && utils.shallowCopyFromList(opts, data, _OPTS_PASSABLE_WITH_DATA), handleCache(opts, template)(data);
    };
    exports.renderFile = function() {
      var args = Array.prototype.slice.call(arguments), filename = args.shift(), cb, opts = { filename }, data, viewOpts;
      return typeof arguments[arguments.length - 1] == "function" && (cb = args.pop()), args.length ? (data = args.shift(), args.length ? utils.shallowCopy(opts, args.pop()) : (data.settings && (data.settings.views && (opts.views = data.settings.views), data.settings["view cache"] && (opts.cache = !0), viewOpts = data.settings["view options"], viewOpts && utils.shallowCopy(opts, viewOpts)), utils.shallowCopyFromList(opts, data, _OPTS_PASSABLE_WITH_DATA_EXPRESS)), opts.filename = filename) : data = utils.createNullProtoObjWherePossible(), tryHandleCache(opts, data, cb);
    };
    exports.Template = Template;
    exports.clearCache = function() {
      exports.cache.reset();
    };
    function Template(text, optsParam) {
      var opts = utils.hasOwnOnlyObject(optsParam), options = utils.createNullProtoObjWherePossible();
      this.templateText = text, this.mode = null, this.truncate = !1, this.currentLine = 1, this.source = "", options.client = opts.client || !1, options.escapeFunction = opts.escape || opts.escapeFunction || utils.escapeXML, options.compileDebug = opts.compileDebug !== !1, options.debug = !!opts.debug, options.filename = opts.filename, options.openDelimiter = opts.openDelimiter || exports.openDelimiter || _DEFAULT_OPEN_DELIMITER, options.closeDelimiter = opts.closeDelimiter || exports.closeDelimiter || _DEFAULT_CLOSE_DELIMITER, options.delimiter = opts.delimiter || exports.delimiter || _DEFAULT_DELIMITER, options.strict = opts.strict || !1, options.context = opts.context, options.cache = opts.cache || !1, options.rmWhitespace = opts.rmWhitespace, options.root = opts.root, options.includer = opts.includer, options.outputFunctionName = opts.outputFunctionName, options.localsName = opts.localsName || exports.localsName || _DEFAULT_LOCALS_NAME, options.views = opts.views, options.async = opts.async, options.destructuredLocals = opts.destructuredLocals, options.legacyInclude = typeof opts.legacyInclude < "u" ? !!opts.legacyInclude : !0, options.strict ? options._with = !1 : options._with = typeof opts._with < "u" ? opts._with : !0, this.opts = options, this.regex = this.createRegex();
    }
    Template.modes = {
      EVAL: "eval",
      ESCAPED: "escaped",
      RAW: "raw",
      COMMENT: "comment",
      LITERAL: "literal"
    };
    Template.prototype = {
      createRegex: function() {
        var str = _REGEX_STRING, delim = utils.escapeRegExpChars(this.opts.delimiter), open = utils.escapeRegExpChars(this.opts.openDelimiter), close = utils.escapeRegExpChars(this.opts.closeDelimiter);
        return str = str.replace(/%/g, delim).replace(/</g, open).replace(/>/g, close), new RegExp(str);
      },
      compile: function() {
        var src, fn, opts = this.opts, prepended = "", appended = "", escapeFn = opts.escapeFunction, ctor, sanitizedFilename = opts.filename ? JSON.stringify(opts.filename) : "undefined";
        if (!this.source) {
          if (this.generateSource(), prepended += `  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
`, opts.outputFunctionName) {
            if (!_JS_IDENTIFIER.test(opts.outputFunctionName))
              throw new Error("outputFunctionName is not a valid JS identifier.");
            prepended += "  var " + opts.outputFunctionName + ` = __append;
`;
          }
          if (opts.localsName && !_JS_IDENTIFIER.test(opts.localsName))
            throw new Error("localsName is not a valid JS identifier.");
          if (opts.destructuredLocals && opts.destructuredLocals.length) {
            for (var destructuring = "  var __locals = (" + opts.localsName + ` || {}),
`, i = 0; i < opts.destructuredLocals.length; i++) {
              var name = opts.destructuredLocals[i];
              if (!_JS_IDENTIFIER.test(name))
                throw new Error("destructuredLocals[" + i + "] is not a valid JS identifier.");
              i > 0 && (destructuring += `,
  `), destructuring += name + " = __locals." + name;
            }
            prepended += destructuring + `;
`;
          }
          opts._with !== !1 && (prepended += "  with (" + opts.localsName + ` || {}) {
`, appended += `  }
`), appended += `  return __output;
`, this.source = prepended + this.source + appended;
        }
        opts.compileDebug ? src = `var __line = 1
  , __lines = ` + JSON.stringify(this.templateText) + `
  , __filename = ` + sanitizedFilename + `;
try {
` + this.source + `} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}
` : src = this.source, opts.client && (src = "escapeFn = escapeFn || " + escapeFn.toString() + `;
` + src, opts.compileDebug && (src = "rethrow = rethrow || " + rethrow.toString() + `;
` + src)), opts.strict && (src = `"use strict";
` + src), opts.debug && console.log(src), opts.compileDebug && opts.filename && (src = src + `
//# sourceURL=` + sanitizedFilename + `
`);
        try {
          if (opts.async)
            try {
              ctor = new Function("return (async function(){}).constructor;")();
            } catch (e) {
              throw e instanceof SyntaxError ? new Error("This environment does not support async/await") : e;
            }
          else
            ctor = Function;
          fn = new ctor(opts.localsName + ", escapeFn, include, rethrow", src);
        } catch (e) {
          throw e instanceof SyntaxError && (opts.filename && (e.message += " in " + opts.filename), e.message += ` while compiling ejs

`, e.message += `If the above error is not helpful, you may want to try EJS-Lint:
`, e.message += "https://github.com/RyanZim/EJS-Lint", opts.async || (e.message += `
`, e.message += "Or, if you meant to create an async function, pass `async: true` as an option.")), e;
        }
        var returnedFn = opts.client ? fn : function(data) {
          var include = function(path2, includeData) {
            var d = utils.shallowCopy(utils.createNullProtoObjWherePossible(), data);
            return includeData && (d = utils.shallowCopy(d, includeData)), includeFile(path2, opts)(d);
          };
          return fn.apply(
            opts.context,
            [data || utils.createNullProtoObjWherePossible(), escapeFn, include, rethrow]
          );
        };
        if (opts.filename && typeof Object.defineProperty == "function") {
          var filename = opts.filename, basename2 = path.basename(filename, path.extname(filename));
          try {
            Object.defineProperty(returnedFn, "name", {
              value: basename2,
              writable: !1,
              enumerable: !1,
              configurable: !0
            });
          } catch {
          }
        }
        return returnedFn;
      },
      generateSource: function() {
        var opts = this.opts;
        opts.rmWhitespace && (this.templateText = this.templateText.replace(/[\r\n]+/g, `
`).replace(/^\s+|\s+$/gm, "")), this.templateText = this.templateText.replace(/[ \t]*<%_/gm, "<%_").replace(/_%>[ \t]*/gm, "_%>");
        var self = this, matches = this.parseTemplateText(), d = this.opts.delimiter, o = this.opts.openDelimiter, c = this.opts.closeDelimiter;
        matches && matches.length && matches.forEach(function(line, index) {
          var closing;
          if (line.indexOf(o + d) === 0 && line.indexOf(o + d + d) !== 0 && (closing = matches[index + 2], !(closing == d + c || closing == "-" + d + c || closing == "_" + d + c)))
            throw new Error('Could not find matching close tag for "' + line + '".');
          self.scanLine(line);
        });
      },
      parseTemplateText: function() {
        for (var str = this.templateText, pat = this.regex, result = pat.exec(str), arr = [], firstPos; result; )
          firstPos = result.index, firstPos !== 0 && (arr.push(str.substring(0, firstPos)), str = str.slice(firstPos)), arr.push(result[0]), str = str.slice(result[0].length), result = pat.exec(str);
        return str && arr.push(str), arr;
      },
      _addOutput: function(line) {
        if (this.truncate && (line = line.replace(/^(?:\r\n|\r|\n)/, ""), this.truncate = !1), !line)
          return line;
        line = line.replace(/\\/g, "\\\\"), line = line.replace(/\n/g, "\\n"), line = line.replace(/\r/g, "\\r"), line = line.replace(/"/g, '\\"'), this.source += '    ; __append("' + line + `")
`;
      },
      scanLine: function(line) {
        var self = this, d = this.opts.delimiter, o = this.opts.openDelimiter, c = this.opts.closeDelimiter, newLineCount = 0;
        switch (newLineCount = line.split(`
`).length - 1, line) {
          case o + d:
          case o + d + "_":
            this.mode = Template.modes.EVAL;
            break;
          case o + d + "=":
            this.mode = Template.modes.ESCAPED;
            break;
          case o + d + "-":
            this.mode = Template.modes.RAW;
            break;
          case o + d + "#":
            this.mode = Template.modes.COMMENT;
            break;
          case o + d + d:
            this.mode = Template.modes.LITERAL, this.source += '    ; __append("' + line.replace(o + d + d, o + d) + `")
`;
            break;
          case d + d + c:
            this.mode = Template.modes.LITERAL, this.source += '    ; __append("' + line.replace(d + d + c, d + c) + `")
`;
            break;
          case d + c:
          case "-" + d + c:
          case "_" + d + c:
            this.mode == Template.modes.LITERAL && this._addOutput(line), this.mode = null, this.truncate = line.indexOf("-") === 0 || line.indexOf("_") === 0;
            break;
          default:
            if (this.mode) {
              switch (this.mode) {
                case Template.modes.EVAL:
                case Template.modes.ESCAPED:
                case Template.modes.RAW:
                  line.lastIndexOf("//") > line.lastIndexOf(`
`) && (line += `
`);
              }
              switch (this.mode) {
                // Just executing code
                case Template.modes.EVAL:
                  this.source += "    ; " + line + `
`;
                  break;
                // Exec, esc, and output
                case Template.modes.ESCAPED:
                  this.source += "    ; __append(escapeFn(" + stripSemi(line) + `))
`;
                  break;
                // Exec and output
                case Template.modes.RAW:
                  this.source += "    ; __append(" + stripSemi(line) + `)
`;
                  break;
                case Template.modes.COMMENT:
                  break;
                // Literal <%% mode, append as raw output
                case Template.modes.LITERAL:
                  this._addOutput(line);
                  break;
              }
            } else
              this._addOutput(line);
        }
        self.opts.compileDebug && newLineCount && (this.currentLine += newLineCount, this.source += "    ; __line = " + this.currentLine + `
`);
      }
    };
    exports.escapeXML = utils.escapeXML;
    exports.__express = exports.renderFile;
    exports.VERSION = _VERSION_STRING;
    exports.name = _NAME;
    typeof window < "u" && (window.ejs = exports);
  }
});

// src/builder-manager/index.ts
import { cp, rm, writeFile as writeFile3 } from "node:fs/promises";
import { stringifyProcessEnvs } from "storybook/internal/common";
import { logger } from "storybook/internal/node-logger";

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/module-info.js
var normalizeModuleInfo = (value) => {
  let {
    type = "esm",
    varName,
    namedExports = null,
    defaultExport = !0
  } = typeof value == "string" ? { varName: value } : value;
  return { type, varName, namedExports, defaultExport };
};

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/on-load.js
var createCjsContents = (variableName) => `module.exports = ${variableName};`;
var createEsmContents = (variableName, namedExports, defaultExport) => {
  let codeElements = defaultExport ? [`export default ${variableName};`] : [];
  if (namedExports && namedExports.length) {
    let exportNames = [...new Set(namedExports)].join(", ");
    codeElements.push(`const { ${exportNames} } = ${variableName};`), codeElements.push(`export { ${exportNames} };`);
  }
  return codeElements.join(`
`);
}, createContents = (moduleInfo) => {
  let { type, varName, namedExports, defaultExport } = moduleInfo;
  switch (type) {
    case "esm":
      return createEsmContents(varName, namedExports, defaultExport);
    case "cjs":
      return createCjsContents(varName);
  }
};

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/with-reg-exp.js
var PLUGIN_NAME = "global-externals", globalExternalsWithRegExp = (globals) => {
  let { modulePathFilter, getModuleInfo } = globals;
  return {
    name: PLUGIN_NAME,
    setup(build2) {
      build2.onResolve({ filter: modulePathFilter }, (args) => ({
        path: args.path,
        namespace: PLUGIN_NAME
      })), build2.onLoad({ filter: /.*/, namespace: PLUGIN_NAME }, (args) => {
        let modulePath = args.path, moduleInfo = normalizeModuleInfo(getModuleInfo(modulePath));
        return { contents: createContents(moduleInfo) };
      });
    }
  };
};

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/with-object.js
var globalExternals = (globals) => {
  let normalizedGlobals = {
    modulePathFilter: new RegExp(`^(?:${Object.keys(globals).join("|")})$`),
    getModuleInfo: (modulePath) => globals[modulePath]
  };
  return globalExternalsWithRegExp(normalizedGlobals);
};

// src/builder-manager/index.ts
var import_sirv = __toESM(require_build(), 1);

// src/manager/globals/exports.ts
var exports_default = {
  react: [
    "Children",
    "Component",
    "Fragment",
    "Profiler",
    "PureComponent",
    "StrictMode",
    "Suspense",
    "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
    "act",
    "cloneElement",
    "createContext",
    "createElement",
    "createFactory",
    "createRef",
    "forwardRef",
    "isValidElement",
    "lazy",
    "memo",
    "startTransition",
    "unstable_act",
    "useCallback",
    "useContext",
    "useDebugValue",
    "useDeferredValue",
    "useEffect",
    "useId",
    "useImperativeHandle",
    "useInsertionEffect",
    "useLayoutEffect",
    "useMemo",
    "useReducer",
    "useRef",
    "useState",
    "useSyncExternalStore",
    "useTransition",
    "version"
  ],
  "react-dom": [
    "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
    "createPortal",
    "createRoot",
    "findDOMNode",
    "flushSync",
    "hydrate",
    "hydrateRoot",
    "render",
    "unmountComponentAtNode",
    "unstable_batchedUpdates",
    "unstable_renderSubtreeIntoContainer",
    "version"
  ],
  "react-dom/client": ["createRoot", "hydrateRoot"],
  "@storybook/icons": [
    "AccessibilityAltIcon",
    "AccessibilityIcon",
    "AccessibilityIgnoredIcon",
    "AddIcon",
    "AdminIcon",
    "AlertAltIcon",
    "AlertIcon",
    "AlignLeftIcon",
    "AlignRightIcon",
    "AppleIcon",
    "ArrowBottomLeftIcon",
    "ArrowBottomRightIcon",
    "ArrowDownIcon",
    "ArrowLeftIcon",
    "ArrowRightIcon",
    "ArrowSolidDownIcon",
    "ArrowSolidLeftIcon",
    "ArrowSolidRightIcon",
    "ArrowSolidUpIcon",
    "ArrowTopLeftIcon",
    "ArrowTopRightIcon",
    "ArrowUpIcon",
    "AzureDevOpsIcon",
    "BackIcon",
    "BasketIcon",
    "BatchAcceptIcon",
    "BatchDenyIcon",
    "BeakerIcon",
    "BellIcon",
    "BitbucketIcon",
    "BoldIcon",
    "BookIcon",
    "BookmarkHollowIcon",
    "BookmarkIcon",
    "BottomBarIcon",
    "BottomBarToggleIcon",
    "BoxIcon",
    "BranchIcon",
    "BrowserIcon",
    "BugIcon",
    "ButtonIcon",
    "CPUIcon",
    "CalendarIcon",
    "CameraIcon",
    "CameraStabilizeIcon",
    "CategoryIcon",
    "CertificateIcon",
    "ChangedIcon",
    "ChatIcon",
    "CheckIcon",
    "ChevronDownIcon",
    "ChevronLeftIcon",
    "ChevronRightIcon",
    "ChevronSmallDownIcon",
    "ChevronSmallLeftIcon",
    "ChevronSmallRightIcon",
    "ChevronSmallUpIcon",
    "ChevronUpIcon",
    "ChromaticIcon",
    "ChromeIcon",
    "CircleHollowIcon",
    "CircleIcon",
    "ClearIcon",
    "CloseAltIcon",
    "CloseIcon",
    "CloudHollowIcon",
    "CloudIcon",
    "CogIcon",
    "CollapseIcon",
    "CommandIcon",
    "CommentAddIcon",
    "CommentIcon",
    "CommentsIcon",
    "CommitIcon",
    "CompassIcon",
    "ComponentDrivenIcon",
    "ComponentIcon",
    "ContrastIcon",
    "ContrastIgnoredIcon",
    "ControlsIcon",
    "CopyIcon",
    "CreditIcon",
    "CrossIcon",
    "DashboardIcon",
    "DatabaseIcon",
    "DeleteIcon",
    "DiamondIcon",
    "DirectionIcon",
    "DiscordIcon",
    "DocChartIcon",
    "DocListIcon",
    "DocumentIcon",
    "DownloadIcon",
    "DragIcon",
    "EditIcon",
    "EditorIcon",
    "EllipsisIcon",
    "EmailIcon",
    "ExpandAltIcon",
    "ExpandIcon",
    "EyeCloseIcon",
    "EyeIcon",
    "FaceHappyIcon",
    "FaceNeutralIcon",
    "FaceSadIcon",
    "FacebookIcon",
    "FailedIcon",
    "FastForwardIcon",
    "FigmaIcon",
    "FilterIcon",
    "FlagIcon",
    "FolderIcon",
    "FormIcon",
    "GDriveIcon",
    "GiftIcon",
    "GithubIcon",
    "GitlabIcon",
    "GlobeIcon",
    "GoogleIcon",
    "GraphBarIcon",
    "GraphLineIcon",
    "GraphqlIcon",
    "GridAltIcon",
    "GridIcon",
    "GrowIcon",
    "HeartHollowIcon",
    "HeartIcon",
    "HomeIcon",
    "HourglassIcon",
    "InfoIcon",
    "ItalicIcon",
    "JumpToIcon",
    "KeyIcon",
    "LightningIcon",
    "LightningOffIcon",
    "LinkBrokenIcon",
    "LinkIcon",
    "LinkedinIcon",
    "LinuxIcon",
    "ListOrderedIcon",
    "ListUnorderedIcon",
    "LocationIcon",
    "LockIcon",
    "MarkdownIcon",
    "MarkupIcon",
    "MediumIcon",
    "MemoryIcon",
    "MenuIcon",
    "MergeIcon",
    "MirrorIcon",
    "MobileIcon",
    "MoonIcon",
    "NutIcon",
    "OutboxIcon",
    "OutlineIcon",
    "PaintBrushAltIcon",
    "PaintBrushIcon",
    "PaperClipIcon",
    "ParagraphIcon",
    "PassedIcon",
    "PhoneIcon",
    "PhotoDragIcon",
    "PhotoIcon",
    "PhotoStabilizeIcon",
    "PinAltIcon",
    "PinIcon",
    "PlayAllHollowIcon",
    "PlayBackIcon",
    "PlayHollowIcon",
    "PlayIcon",
    "PlayNextIcon",
    "PlusIcon",
    "PointerDefaultIcon",
    "PointerHandIcon",
    "PowerIcon",
    "PrintIcon",
    "ProceedIcon",
    "ProfileIcon",
    "PullRequestIcon",
    "QuestionIcon",
    "RSSIcon",
    "RedirectIcon",
    "ReduxIcon",
    "RefreshIcon",
    "ReplyIcon",
    "RepoIcon",
    "RequestChangeIcon",
    "RewindIcon",
    "RulerIcon",
    "SaveIcon",
    "SearchIcon",
    "ShareAltIcon",
    "ShareIcon",
    "ShieldIcon",
    "SideBySideIcon",
    "SidebarAltIcon",
    "SidebarAltToggleIcon",
    "SidebarIcon",
    "SidebarToggleIcon",
    "SortDownIcon",
    "SortUpIcon",
    "SpeakerIcon",
    "StackedIcon",
    "StarHollowIcon",
    "StarIcon",
    "StatusFailIcon",
    "StatusIcon",
    "StatusPassIcon",
    "StatusWarnIcon",
    "StickerIcon",
    "StopAltHollowIcon",
    "StopAltIcon",
    "StopIcon",
    "StorybookIcon",
    "StructureIcon",
    "SubtractIcon",
    "SunIcon",
    "SupportIcon",
    "SweepIcon",
    "SwitchAltIcon",
    "SyncIcon",
    "TabletIcon",
    "ThumbsUpIcon",
    "TimeIcon",
    "TimerIcon",
    "TransferIcon",
    "TrashIcon",
    "TwitterIcon",
    "TypeIcon",
    "UbuntuIcon",
    "UndoIcon",
    "UnfoldIcon",
    "UnlockIcon",
    "UnpinIcon",
    "UploadIcon",
    "UserAddIcon",
    "UserAltIcon",
    "UserIcon",
    "UsersIcon",
    "VSCodeIcon",
    "VerifiedIcon",
    "VideoIcon",
    "WandIcon",
    "WatchIcon",
    "WindowsIcon",
    "WrenchIcon",
    "XIcon",
    "YoutubeIcon",
    "ZoomIcon",
    "ZoomOutIcon",
    "ZoomResetIcon",
    "iconList"
  ],
  "storybook/manager-api": [
    "ActiveTabs",
    "Consumer",
    "ManagerContext",
    "Provider",
    "RequestResponseError",
    "addons",
    "combineParameters",
    "controlOrMetaKey",
    "controlOrMetaSymbol",
    "eventMatchesShortcut",
    "eventToShortcut",
    "experimental_MockUniversalStore",
    "experimental_UniversalStore",
    "experimental_getStatusStore",
    "experimental_getTestProviderStore",
    "experimental_requestResponse",
    "experimental_useStatusStore",
    "experimental_useTestProviderStore",
    "experimental_useUniversalStore",
    "internal_checklistStore",
    "internal_fullStatusStore",
    "internal_fullTestProviderStore",
    "internal_universalChecklistStore",
    "internal_universalStatusStore",
    "internal_universalTestProviderStore",
    "isMacLike",
    "isShortcutTaken",
    "keyToSymbol",
    "merge",
    "mockChannel",
    "optionOrAltSymbol",
    "shortcutMatchesShortcut",
    "shortcutToAriaKeyshortcuts",
    "shortcutToHumanString",
    "types",
    "useAddonState",
    "useArgTypes",
    "useArgs",
    "useChannel",
    "useGlobalTypes",
    "useGlobals",
    "useParameter",
    "useSharedState",
    "useStoryPrepared",
    "useStorybookApi",
    "useStorybookState"
  ],
  "storybook/theming": [
    "CacheProvider",
    "ClassNames",
    "Global",
    "ThemeProvider",
    "background",
    "color",
    "convert",
    "create",
    "createCache",
    "createGlobal",
    "createReset",
    "css",
    "darken",
    "ensure",
    "getPreferredColorScheme",
    "ignoreSsrWarning",
    "isPropValid",
    "jsx",
    "keyframes",
    "lighten",
    "styled",
    "themes",
    "tokens",
    "typography",
    "useTheme",
    "withTheme"
  ],
  "storybook/theming/create": ["create", "themes"],
  "storybook/test": [
    "buildQueries",
    "clearAllMocks",
    "configure",
    "createEvent",
    "expect",
    "findAllByAltText",
    "findAllByDisplayValue",
    "findAllByLabelText",
    "findAllByPlaceholderText",
    "findAllByRole",
    "findAllByTestId",
    "findAllByText",
    "findAllByTitle",
    "findByAltText",
    "findByDisplayValue",
    "findByLabelText",
    "findByPlaceholderText",
    "findByRole",
    "findByTestId",
    "findByText",
    "findByTitle",
    "fireEvent",
    "fn",
    "getAllByAltText",
    "getAllByDisplayValue",
    "getAllByLabelText",
    "getAllByPlaceholderText",
    "getAllByRole",
    "getAllByTestId",
    "getAllByText",
    "getAllByTitle",
    "getByAltText",
    "getByDisplayValue",
    "getByLabelText",
    "getByPlaceholderText",
    "getByRole",
    "getByTestId",
    "getByText",
    "getByTitle",
    "getConfig",
    "getDefaultNormalizer",
    "getElementError",
    "getNodeText",
    "getQueriesForElement",
    "getRoles",
    "getSuggestedQuery",
    "isInaccessible",
    "isMockFunction",
    "logDOM",
    "logRoles",
    "mocked",
    "mocks",
    "onMockCall",
    "prettyDOM",
    "prettyFormat",
    "queries",
    "queryAllByAltText",
    "queryAllByAttribute",
    "queryAllByDisplayValue",
    "queryAllByLabelText",
    "queryAllByPlaceholderText",
    "queryAllByRole",
    "queryAllByTestId",
    "queryAllByText",
    "queryAllByTitle",
    "queryByAltText",
    "queryByAttribute",
    "queryByDisplayValue",
    "queryByLabelText",
    "queryByPlaceholderText",
    "queryByRole",
    "queryByTestId",
    "queryByText",
    "queryByTitle",
    "queryHelpers",
    "resetAllMocks",
    "restoreAllMocks",
    "sb",
    "screen",
    "spyOn",
    "uninstrumentedUserEvent",
    "userEvent",
    "waitFor",
    "waitForElementToBeRemoved",
    "within"
  ],
  "storybook/internal/channels": [
    "Channel",
    "HEARTBEAT_INTERVAL",
    "HEARTBEAT_MAX_LATENCY",
    "PostMessageTransport",
    "WebsocketTransport",
    "createBrowserChannel"
  ],
  "storybook/internal/client-logger": ["deprecate", "logger", "once", "pretty"],
  "storybook/internal/components": [
    "A",
    "AbstractToolbar",
    "ActionBar",
    "ActionList",
    "AddonPanel",
    "Badge",
    "Bar",
    "Blockquote",
    "Button",
    "Card",
    "ClipboardCode",
    "Code",
    "Collapsible",
    "DL",
    "Div",
    "DocumentWrapper",
    "EmptyTabContent",
    "ErrorFormatter",
    "FlexBar",
    "Form",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HR",
    "IconButton",
    "Img",
    "LI",
    "Link",
    "ListItem",
    "Loader",
    "Modal",
    "ModalDecorator",
    "OL",
    "P",
    "Placeholder",
    "Popover",
    "PopoverProvider",
    "Pre",
    "ProgressSpinner",
    "ResetWrapper",
    "ScrollArea",
    "Select",
    "Separator",
    "Spaced",
    "Span",
    "StatelessTab",
    "StatelessTabList",
    "StatelessTabPanel",
    "StatelessTabsView",
    "StorybookIcon",
    "StorybookLogo",
    "SyntaxHighlighter",
    "TT",
    "TabBar",
    "TabButton",
    "TabList",
    "TabPanel",
    "TabWrapper",
    "Table",
    "Tabs",
    "TabsState",
    "TabsView",
    "ToggleButton",
    "Toolbar",
    "Tooltip",
    "TooltipLinkList",
    "TooltipMessage",
    "TooltipNote",
    "TooltipProvider",
    "UL",
    "WithTooltip",
    "WithTooltipPure",
    "Zoom",
    "codeCommon",
    "components",
    "convertToReactAriaPlacement",
    "createCopyToClipboardFunction",
    "getStoryHref",
    "interleaveSeparators",
    "nameSpaceClassNames",
    "resetComponents",
    "useTabsState",
    "withReset"
  ],
  "storybook/internal/core-events": [
    "ARGTYPES_INFO_REQUEST",
    "ARGTYPES_INFO_RESPONSE",
    "CHANNEL_CREATED",
    "CHANNEL_WS_DISCONNECT",
    "CONFIG_ERROR",
    "CREATE_NEW_STORYFILE_REQUEST",
    "CREATE_NEW_STORYFILE_RESPONSE",
    "CURRENT_STORY_WAS_SET",
    "DOCS_PREPARED",
    "DOCS_RENDERED",
    "FILE_COMPONENT_SEARCH_REQUEST",
    "FILE_COMPONENT_SEARCH_RESPONSE",
    "FORCE_REMOUNT",
    "FORCE_RE_RENDER",
    "GLOBALS_UPDATED",
    "MANAGER_INERT_ATTRIBUTE_CHANGED",
    "NAVIGATE_URL",
    "OPEN_IN_EDITOR_REQUEST",
    "OPEN_IN_EDITOR_RESPONSE",
    "PLAY_FUNCTION_THREW_EXCEPTION",
    "PRELOAD_ENTRIES",
    "PREVIEW_BUILDER_PROGRESS",
    "PREVIEW_INITIALIZED",
    "PREVIEW_KEYDOWN",
    "REGISTER_SUBSCRIPTION",
    "REQUEST_WHATS_NEW_DATA",
    "RESET_STORY_ARGS",
    "RESULT_WHATS_NEW_DATA",
    "SAVE_STORY_REQUEST",
    "SAVE_STORY_RESPONSE",
    "SELECT_STORY",
    "SET_CONFIG",
    "SET_CURRENT_STORY",
    "SET_FILTER",
    "SET_GLOBALS",
    "SET_INDEX",
    "SET_STORIES",
    "SET_WHATS_NEW_CACHE",
    "SHARED_STATE_CHANGED",
    "SHARED_STATE_SET",
    "STORIES_COLLAPSE_ALL",
    "STORIES_EXPAND_ALL",
    "STORY_ARGS_UPDATED",
    "STORY_CHANGED",
    "STORY_ERRORED",
    "STORY_FINISHED",
    "STORY_HOT_UPDATED",
    "STORY_INDEX_INVALIDATED",
    "STORY_MISSING",
    "STORY_PREPARED",
    "STORY_RENDERED",
    "STORY_RENDER_PHASE_CHANGED",
    "STORY_SPECIFIED",
    "STORY_THREW_EXCEPTION",
    "STORY_UNCHANGED",
    "TELEMETRY_ERROR",
    "TOGGLE_WHATS_NEW_NOTIFICATIONS",
    "UNHANDLED_ERRORS_WHILE_PLAYING",
    "UPDATE_GLOBALS",
    "UPDATE_QUERY_PARAMS",
    "UPDATE_STORY_ARGS"
  ],
  "storybook/internal/manager-errors": [
    "Category",
    "ProviderDoesNotExtendBaseProviderError",
    "StatusTypeIdMismatchError",
    "UncaughtManagerError"
  ],
  "storybook/internal/router": [
    "BaseLocationProvider",
    "DEEPLY_EQUAL",
    "Link",
    "Location",
    "LocationProvider",
    "Match",
    "Route",
    "buildArgsParam",
    "deepDiff",
    "getMatch",
    "parsePath",
    "queryFromLocation",
    "stringifyQuery",
    "useNavigate"
  ],
  "storybook/internal/types": [
    "Addon_TypesEnum",
    "CoreWebpackCompiler",
    "Feature",
    "SupportedBuilder",
    "SupportedFramework",
    "SupportedLanguage",
    "SupportedRenderer"
  ]
};

// src/manager/globals/globals.ts
var globalsNameReferenceMap = {
  react: "__REACT__",
  "react-dom": "__REACT_DOM__",
  "react-dom/client": "__REACT_DOM_CLIENT__",
  "@storybook/icons": "__STORYBOOK_ICONS__",
  "storybook/manager-api": "__STORYBOOK_API__",
  "storybook/test": "__STORYBOOK_TEST__",
  "storybook/theming": "__STORYBOOK_THEMING__",
  "storybook/theming/create": "__STORYBOOK_THEMING_CREATE__",
  "storybook/internal/channels": "__STORYBOOK_CHANNELS__",
  "storybook/internal/client-logger": "__STORYBOOK_CLIENT_LOGGER__",
  "storybook/internal/components": "__STORYBOOK_COMPONENTS__",
  "storybook/internal/core-events": "__STORYBOOK_CORE_EVENTS__",
  "storybook/internal/manager-errors": "__STORYBOOK_CORE_EVENTS_MANAGER_ERRORS__",
  "storybook/internal/router": "__STORYBOOK_ROUTER__",
  "storybook/internal/types": "__STORYBOOK_TYPES__"
}, globalPackages = Object.keys(globalsNameReferenceMap);

// src/manager/globals/globals-module-info.ts
var duplicatedKeys = [
  "storybook/theming",
  "storybook/theming/create",
  "storybook/manager-api",
  "storybook/test",
  "storybook/actions",
  "storybook/highlight",
  "storybook/viewport"
], globalsModuleInfoMap = globalPackages.reduce(
  (acc, key) => (acc[key] = {
    type: "esm",
    varName: globalsNameReferenceMap[key],
    namedExports: exports_default[key],
    defaultExport: !0
  }, duplicatedKeys.includes(key) && (acc[key.replace("storybook", "storybook/internal")] = {
    type: "esm",
    varName: globalsNameReferenceMap[key],
    namedExports: exports_default[key],
    defaultExport: !0
  }), acc),
  {}
);

// src/builder-manager/utils/data.ts
import { basename } from "node:path";
import { getRefs } from "storybook/internal/common";

// src/builder-manager/utils/template.ts
var import_ejs = __toESM(require_ejs(), 1);
import { readFile } from "node:fs/promises";
var getTemplatePath = (template) => join(resolvePackageDir("storybook"), "assets/server", template), readTemplate = async (template) => {
  let path = getTemplatePath(template);
  return readFile(path, { encoding: "utf8" });
};
var renderHTML = async (template, title, favicon, customHead, cssFiles, jsFiles, features, refs, logLevel, docsOptions, tagsOptions, { versionCheck, previewUrl, configType, ignorePreview }, globals) => {
  let titleRef = await title, templateRef = await template, stringifiedGlobals = Object.entries(globals).reduce(
    (transformed, [key, value]) => ({ ...transformed, [key]: JSON.stringify(value) }),
    {}
  );
  return (0, import_ejs.render)(templateRef, {
    title: titleRef ? `${titleRef} - Storybook` : "Storybook",
    files: { js: jsFiles, css: cssFiles },
    favicon: await favicon,
    globals: {
      FEATURES: JSON.stringify(await features, null, 2),
      REFS: JSON.stringify(await refs, null, 2),
      LOGLEVEL: JSON.stringify(await logLevel, null, 2),
      DOCS_OPTIONS: JSON.stringify(await docsOptions, null, 2),
      CONFIG_TYPE: JSON.stringify(await configType, null, 2),
      // These two need to be double stringified because the UI expects a string
      VERSIONCHECK: JSON.stringify(JSON.stringify(versionCheck), null, 2),
      PREVIEW_URL: JSON.stringify(previewUrl, null, 2),
      // global preview URL
      TAGS_OPTIONS: JSON.stringify(await tagsOptions, null, 2),
      ...stringifiedGlobals
    },
    head: await customHead || "",
    ignorePreview
  });
};

// src/builder-manager/utils/data.ts
var getData = async (options) => {
  let refs = getRefs(options), favicon = options.presets.apply("favicon").then((p) => basename(p)), features = options.presets.apply("features"), logLevel = options.presets.apply("logLevel"), title = options.presets.apply("title"), docsOptions = options.presets.apply("docs", {}), tagsOptions = options.presets.apply("tags", {}), template = readTemplate("template.ejs"), customHead = options.presets.apply("managerHead"), [instance, config] = await Promise.all([
    //
    executor.get(),
    getConfig(options)
  ]);
  return {
    refs,
    features,
    title,
    docsOptions,
    template,
    customHead,
    instance,
    config,
    logLevel,
    favicon,
    tagsOptions
  };
};

// src/builder-manager/utils/files.ts
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join as join2, normalize, relative } from "node:path";
async function readOrderedFiles(addonsDir, outputFiles) {
  let files = await Promise.all(
    outputFiles?.map(async (file) => {
      let { location, url } = sanitizePath(file, addonsDir);
      if (!existsSync(location)) {
        let directory = dirname(location);
        await mkdir(directory, { recursive: !0 });
      }
      return await writeFile(location, file.contents), url;
    }) || []
  ), jsFiles = files.filter((file) => file.endsWith(".js"));
  return { cssFiles: files.filter((file) => file.endsWith(".css")), jsFiles };
}
function sanitizePath(file, addonsDir) {
  let filePath = relative(addonsDir, file.path), location = normalize(join2(addonsDir, filePath)), url = `./sb-addons/${slash(filePath).split("/").map(encodeURIComponent).join("/")}`;
  return { location, url };
}

// src/builder-manager/utils/framework.ts
import {
  extractFrameworkPackageName,
  frameworkPackages,
  frameworkToRenderer,
  getFrameworkName
} from "storybook/internal/common";
import { SupportedBuilder } from "storybook/internal/types";
var buildFrameworkGlobalsFromOptions = async (options) => {
  let globals = {}, builderConfig = (await options.presets.apply("core")).builder, builderName = typeof builderConfig == "string" ? builderConfig : builderConfig?.name, builder2 = Object.values(SupportedBuilder).find((builder3) => builderName?.includes(builder3)), frameworkName = await getFrameworkName(options), frameworkPackageName = extractFrameworkPackageName(frameworkName), framework = frameworkPackages[frameworkPackageName], renderer = frameworkToRenderer[framework];
  return globals.STORYBOOK_BUILDER = builder2, globals.STORYBOOK_FRAMEWORK = framework, globals.STORYBOOK_RENDERER = renderer, globals.STORYBOOK_NETWORK_ADDRESS = options.networkAddress, globals;
};

// src/builder-manager/utils/managerEntries.ts
import { existsSync as existsSync2 } from "node:fs";
import { mkdir as mkdir2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, join as join3, parse as parse2, relative as relative2, sep } from "node:path";
import { resolvePathInStorybookCache } from "storybook/internal/common";
var sanitizeBase = (path) => path.replaceAll(".", "").replaceAll("@", "").replaceAll(sep, "-").replaceAll("/", "-").replaceAll(new RegExp(/^(-)+/g), ""), sanitizeFinal = (path) => {
  let sections = path.split(/-?node_modules-?/);
  return sections[sections.length - 1].replaceAll("storybook-addon-", "").replaceAll("dist-", "");
};
async function wrapManagerEntries(entrypoints, uniqueId) {
  return Promise.all(
    entrypoints.map(async (entry, i) => {
      let { name, dir } = parse2(entry), cacheLocation = resolvePathInStorybookCache("sb-manager", uniqueId);
      if (!cacheLocation)
        throw new Error("Could not create/find cache directory");
      let base = relative2(process.cwd(), dir), location = join3(
        cacheLocation,
        sanitizeFinal(join3(`${sanitizeBase(base)}-${i}`, `${sanitizeBase(name)}-bundle.js`))
      );
      if (!existsSync2(location)) {
        let directory = dirname2(location);
        await mkdir2(directory, { recursive: !0 });
      }
      return await writeFile2(location, `import '${slash(entry).replaceAll(/'/g, "\\'")}';`), location;
    })
  );
}

// src/builder-manager/index.ts
var CORE_DIR_ORIGIN = join(resolvePackageDir("storybook"), "dist/manager"), isRootPath = /^\/($|\?)/, compilation, asyncIterator, getConfig = async (options) => {
  let [managerEntriesFromPresets, envs] = await Promise.all([
    options.presets.apply("managerEntries", []),
    options.presets.apply("env")
  ]), tsconfigPath = getTemplatePath("addon.tsconfig.json"), configDirManagerEntry;
  try {
    configDirManagerEntry = resolveModulePath("./manager", {
      from: options.configDir,
      extensions: [".js", ".mjs", ".jsx", ".ts", ".mts", ".tsx"]
    });
  } catch {
  }
  let entryPoints = configDirManagerEntry ? [...managerEntriesFromPresets, configDirManagerEntry] : managerEntriesFromPresets;
  return {
    entryPoints: await wrapManagerEntries(entryPoints, options.cacheKey),
    outdir: join(options.outputDir || "./", "sb-addons"),
    format: "iife",
    write: !1,
    ignoreAnnotations: !0,
    resolveExtensions: [".ts", ".tsx", ".mjs", ".js", ".jsx"],
    outExtension: { ".js": ".js" },
    loader: {
      ".js": "jsx",
      // media
      ".png": "dataurl",
      ".gif": "dataurl",
      ".jpg": "dataurl",
      ".jpeg": "dataurl",
      ".svg": "dataurl",
      ".webp": "dataurl",
      ".webm": "dataurl",
      ".mp3": "dataurl",
      // modern fonts
      ".woff2": "dataurl",
      // legacy font formats
      ".woff": "dataurl",
      ".eot": "dataurl",
      ".ttf": "dataurl"
    },
    target: BROWSER_TARGETS,
    supported: SUPPORTED_FEATURES,
    platform: "browser",
    bundle: !0,
    minify: !1,
    minifyWhitespace: !1,
    minifyIdentifiers: !1,
    minifySyntax: !0,
    metafile: !1,
    // turn this on to assist with debugging the bundling of managerEntries
    // treeShaking: true,
    sourcemap: !1,
    conditions: ["browser", "module", "default"],
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    jsx: "transform",
    jsxImportSource: "react",
    tsconfig: tsconfigPath,
    legalComments: "external",
    plugins: [globalExternals(globalsModuleInfoMap)],
    banner: {
      js: "try{"
    },
    footer: {
      js: '}catch(e){ console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e); }'
    },
    define: {
      "process.env": JSON.stringify(envs),
      ...stringifyProcessEnvs(envs),
      global: "window",
      module: "{}"
    }
  };
}, executor = {
  get: async () => {
    let { build: build2 } = await import("esbuild");
    return build2;
  }
}, starter = async function* ({
  startTime,
  options,
  router
}) {
  options.quiet || logger.info("Starting...");
  let {
    config,
    favicon,
    customHead,
    features,
    instance,
    refs,
    template,
    title,
    logLevel,
    docsOptions,
    tagsOptions
  } = await getData(options);
  yield;
  let addonsDir = config.outdir;
  await rm(addonsDir, { recursive: !0, force: !0 }), yield, compilation = await instance({
    ...config
  }), yield, router.use(
    "/sb-addons",
    (0, import_sirv.default)(addonsDir, {
      maxAge: 3e5,
      dev: !0,
      immutable: !0
    })
  ), router.use(
    "/sb-manager",
    (0, import_sirv.default)(CORE_DIR_ORIGIN, {
      maxAge: 3e5,
      dev: !0,
      immutable: !0
    })
  );
  let { cssFiles, jsFiles } = await readOrderedFiles(addonsDir, compilation?.outputFiles);
  compilation.metafile && options.outputDir && await writeFile3(
    join(options.outputDir, "metafile.json"),
    JSON.stringify(compilation.metafile, null, 2)
  );
  let globals = await buildFrameworkGlobalsFromOptions(options);
  yield;
  let html = await renderHTML(
    template,
    title,
    favicon,
    customHead,
    cssFiles,
    jsFiles,
    features,
    refs,
    logLevel,
    docsOptions,
    tagsOptions,
    options,
    globals
  );
  return yield, router.use("/", ({ url }, res, next) => {
    url && isRootPath.test(url) ? (res.statusCode = 200, res.setHeader("Content-Type", "text/html"), res.write(html), res.end()) : next();
  }), router.use("/index.html", (req, res) => {
    res.statusCode = 200, res.setHeader("Content-Type", "text/html"), res.write(html), res.end();
  }), {
    bail,
    stats: {
      toJson: () => ({})
    },
    totalTime: process.hrtime(startTime)
  };
}, builder = async function* ({ startTime, options }) {
  if (!options.outputDir)
    throw new Error("outputDir is required");
  logger.step("Building manager..");
  let {
    config,
    customHead,
    favicon,
    features,
    instance,
    refs,
    template,
    title,
    logLevel,
    docsOptions,
    tagsOptions
  } = await getData(options);
  yield;
  let addonsDir = config.outdir, coreDirTarget = join(options.outputDir, "sb-manager");
  compilation = await instance({
    ...config,
    minify: !0
  }), yield;
  let managerFiles = cp(CORE_DIR_ORIGIN, coreDirTarget, {
    filter: (src) => {
      let { ext } = parse(src);
      return ext ? ext === ".js" : !0;
    },
    recursive: !0
  }), { cssFiles, jsFiles } = await readOrderedFiles(addonsDir, compilation?.outputFiles), globals = await buildFrameworkGlobalsFromOptions(options);
  yield;
  let html = await renderHTML(
    template,
    title,
    favicon,
    customHead,
    cssFiles,
    jsFiles,
    features,
    refs,
    logLevel,
    docsOptions,
    tagsOptions,
    options,
    globals
  );
  return await Promise.all([writeFile3(join(options.outputDir, "index.html"), html), managerFiles]), logger.trace({ message: "Manager built", time: process.hrtime(startTime) }), {
    toJson: () => ({})
  };
}, bail = async () => {
  if (asyncIterator)
    try {
      await asyncIterator.throw(new Error());
    } catch {
    }
}, start = async (options) => {
  asyncIterator = starter(options);
  let result;
  do
    result = await asyncIterator.next();
  while (!result.done);
  return result.value;
}, build = async (options) => {
  asyncIterator = builder(options);
  let result;
  do
    result = await asyncIterator.next();
  while (!result.done);
  return result.value;
}, corePresets = [], overridePresets = [];
export {
  BROWSER_TARGETS,
  NODE_TARGET,
  bail,
  build,
  corePresets,
  executor,
  getConfig,
  overridePresets,
  start
};
