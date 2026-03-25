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
  __commonJS
} from "./chunk-4LSYFR5U.js";

// ../../node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "../../node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0", MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991, MAX_SAFE_COMPONENT_LENGTH = 16, MAX_SAFE_BUILD_LENGTH = 250, RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH: 256,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// ../../node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "../../node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// ../../node_modules/semver/internal/re.js
var require_re = __commonJS({
  "../../node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants(), debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [], safeRe = exports.safeRe = [], src = exports.src = [], safeSrc = exports.safeSrc = [], t = exports.t = {}, R = 0, LETTERDASHNUMBER = "[a-zA-Z0-9-]", safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ], makeSafeRegex = (value) => {
      for (let [token, max] of safeRegexReplacements)
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      return value;
    }, createToken = (name, value, isGlobal) => {
      let safe = makeSafeRegex(value), index = R++;
      debug(name, index, value), t[name] = index, src[index] = value, safeSrc[index] = safe, re[index] = new RegExp(value, isGlobal ? "g" : void 0), safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], !0);
    createToken("COERCERTLFULL", src[t.COERCEFULL], !0);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, !0);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, !0);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, !0);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// ../../node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "../../node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    var numeric = /^[0-9]+$/, compareIdentifiers = (a, b) => {
      if (typeof a == "number" && typeof b == "number")
        return a === b ? 0 : a < b ? -1 : 1;
      let anum = numeric.test(a), bnum = numeric.test(b);
      return anum && bnum && (a = +a, b = +b), a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    }, rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// ../../node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "../../node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    var looseOption = Object.freeze({ loose: !0 }), emptyOpts = Object.freeze({}), parseOptions = (options) => options ? typeof options != "object" ? looseOption : options : emptyOpts;
    module.exports = parseOptions;
  }
});

// ../../node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "../../node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    var debug = require_debug(), { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants(), { safeRe: re, t } = require_re(), parseOptions = require_parse_options(), { compareIdentifiers } = require_identifiers(), SemVer = class _SemVer {
      constructor(version, options) {
        if (options = parseOptions(options), version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease)
            return version;
          version = version.version;
        } else if (typeof version != "string")
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        if (version.length > MAX_LENGTH)
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        debug("SemVer", version, options), this.options = options, this.loose = !!options.loose, this.includePrerelease = !!options.includePrerelease;
        let m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m)
          throw new TypeError(`Invalid Version: ${version}`);
        if (this.raw = version, this.major = +m[1], this.minor = +m[2], this.patch = +m[3], this.major > MAX_SAFE_INTEGER || this.major < 0)
          throw new TypeError("Invalid major version");
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0)
          throw new TypeError("Invalid minor version");
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0)
          throw new TypeError("Invalid patch version");
        m[4] ? this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            let num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER)
              return num;
          }
          return id;
        }) : this.prerelease = [], this.build = m[5] ? m[5].split(".") : [], this.format();
      }
      format() {
        return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        if (debug("SemVer.compare", this.version, this.options, other), !(other instanceof _SemVer)) {
          if (typeof other == "string" && other === this.version)
            return 0;
          other = new _SemVer(other, this.options);
        }
        return other.version === this.version ? 0 : this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        return other instanceof _SemVer || (other = new _SemVer(other, this.options)), this.major < other.major ? -1 : this.major > other.major ? 1 : this.minor < other.minor ? -1 : this.minor > other.minor ? 1 : this.patch < other.patch ? -1 : this.patch > other.patch ? 1 : 0;
      }
      comparePre(other) {
        if (other instanceof _SemVer || (other = new _SemVer(other, this.options)), this.prerelease.length && !other.prerelease.length)
          return -1;
        if (!this.prerelease.length && other.prerelease.length)
          return 1;
        if (!this.prerelease.length && !other.prerelease.length)
          return 0;
        let i = 0;
        do {
          let a = this.prerelease[i], b = other.prerelease[i];
          if (debug("prerelease compare", i, a, b), a === void 0 && b === void 0)
            return 0;
          if (b === void 0)
            return 1;
          if (a === void 0)
            return -1;
          if (a === b)
            continue;
          return compareIdentifiers(a, b);
        } while (++i);
      }
      compareBuild(other) {
        other instanceof _SemVer || (other = new _SemVer(other, this.options));
        let i = 0;
        do {
          let a = this.build[i], b = other.build[i];
          if (debug("build compare", i, a, b), a === void 0 && b === void 0)
            return 0;
          if (b === void 0)
            return 1;
          if (a === void 0)
            return -1;
          if (a === b)
            continue;
          return compareIdentifiers(a, b);
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === !1)
            throw new Error("invalid increment argument: identifier is empty");
          if (identifier) {
            let match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier)
              throw new Error(`invalid identifier: ${identifier}`);
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0, this.inc("patch", identifier, identifierBase), this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            this.prerelease.length === 0 && this.inc("patch", identifier, identifierBase), this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0)
              throw new Error(`version ${this.raw} is not a prerelease`);
            this.prerelease.length = 0;
            break;
          case "major":
            (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
            break;
          case "minor":
            (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
            break;
          case "patch":
            this.prerelease.length === 0 && this.patch++, this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            let base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0)
              this.prerelease = [base];
            else {
              let i = this.prerelease.length;
              for (; --i >= 0; )
                typeof this.prerelease[i] == "number" && (this.prerelease[i]++, i = -2);
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === !1)
                  throw new Error("invalid increment argument: identifier already exists");
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              identifierBase === !1 && (prerelease = [identifier]), compareIdentifiers(this.prerelease[0], identifier) === 0 ? isNaN(this.prerelease[1]) && (this.prerelease = prerelease) : this.prerelease = prerelease;
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
      }
    };
    module.exports = SemVer;
  }
});

// ../../node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "../../node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare;
  }
});

// ../../node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "../../node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare = require_compare(), gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module.exports = gte;
  }
});

export {
  require_constants,
  require_debug,
  require_re,
  require_parse_options,
  require_identifiers,
  require_semver,
  require_compare,
  require_gte
};
