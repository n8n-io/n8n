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
  resolvePackageDir
} from "./_node-chunks/chunk-NLWLVR7B.js";
import {
  any
} from "./_node-chunks/chunk-FP3NZPJI.js";
import {
  DOCUMENTATION_LINK
} from "./_node-chunks/chunk-DJNGUF47.js";
import {
  require_dist
} from "./_node-chunks/chunk-S5GBSWTG.js";
import {
  dirname,
  join,
  relative,
  resolve
} from "./_node-chunks/chunk-PKYWPFA6.js";
import {
  require_compare,
  require_constants,
  require_debug,
  require_gte,
  require_identifiers,
  require_parse_options,
  require_re,
  require_semver
} from "./_node-chunks/chunk-WBYCUAME.js";
import {
  __commonJS,
  __toESM
} from "./_node-chunks/chunk-4LSYFR5U.js";

// ../../node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "../../node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), parse = (version, options, throwErrors = !1) => {
      if (version instanceof SemVer)
        return version;
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors)
          return null;
        throw er;
      }
    };
    module.exports = parse;
  }
});

// ../../node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "../../node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse(), valid = (version, options) => {
      let v = parse(version, options);
      return v ? v.version : null;
    };
    module.exports = valid;
  }
});

// ../../node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "../../node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse(), clean = (version, options) => {
      let s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module.exports = clean;
  }
});

// ../../node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "../../node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), inc = (version, release, options, identifier, identifierBase) => {
      typeof options == "string" && (identifierBase = identifier, identifier = options, options = void 0);
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch {
        return null;
      }
    };
    module.exports = inc;
  }
});

// ../../node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "../../node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    var parse = require_parse(), diff = (version1, version2) => {
      let v1 = parse(version1, null, !0), v2 = parse(version2, null, !0), comparison = v1.compare(v2);
      if (comparison === 0)
        return null;
      let v1Higher = comparison > 0, highVersion = v1Higher ? v1 : v2, lowVersion = v1Higher ? v2 : v1, highHasPre = !!highVersion.prerelease.length;
      if (!!lowVersion.prerelease.length && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor)
          return "major";
        if (lowVersion.compareMain(highVersion) === 0)
          return lowVersion.minor && !lowVersion.patch ? "minor" : "patch";
      }
      let prefix = highHasPre ? "pre" : "";
      return v1.major !== v2.major ? prefix + "major" : v1.minor !== v2.minor ? prefix + "minor" : v1.patch !== v2.patch ? prefix + "patch" : "prerelease";
    };
    module.exports = diff;
  }
});

// ../../node_modules/semver/functions/major.js
var require_major = __commonJS({
  "../../node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  }
});

// ../../node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "../../node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  }
});

// ../../node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "../../node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  }
});

// ../../node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "../../node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse(), prerelease = (version, options) => {
      let parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  }
});

// ../../node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "../../node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare = require_compare(), rcompare = (a, b, loose) => compare(b, a, loose);
    module.exports = rcompare;
  }
});

// ../../node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "../../node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare = require_compare(), compareLoose = (a, b) => compare(a, b, !0);
    module.exports = compareLoose;
  }
});

// ../../node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "../../node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), compareBuild = (a, b, loose) => {
      let versionA = new SemVer(a, loose), versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  }
});

// ../../node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "../../node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build(), sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  }
});

// ../../node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "../../node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build(), rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  }
});

// ../../node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "../../node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare = require_compare(), gt = (a, b, loose) => compare(a, b, loose) > 0;
    module.exports = gt;
  }
});

// ../../node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "../../node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare = require_compare(), lt = (a, b, loose) => compare(a, b, loose) < 0;
    module.exports = lt;
  }
});

// ../../node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "../../node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare = require_compare(), eq = (a, b, loose) => compare(a, b, loose) === 0;
    module.exports = eq;
  }
});

// ../../node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "../../node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare = require_compare(), neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module.exports = neq;
  }
});

// ../../node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "../../node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare = require_compare(), lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module.exports = lte;
  }
});

// ../../node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "../../node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    var eq = require_eq(), neq = require_neq(), gt = require_gt(), gte = require_gte(), lt = require_lt(), lte = require_lte(), cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          return typeof a == "object" && (a = a.version), typeof b == "object" && (b = b.version), a === b;
        case "!==":
          return typeof a == "object" && (a = a.version), typeof b == "object" && (b = b.version), a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module.exports = cmp;
  }
});

// ../../node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "../../node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), parse = require_parse(), { safeRe: re, t } = require_re(), coerce = (version, options) => {
      if (version instanceof SemVer)
        return version;
      if (typeof version == "number" && (version = String(version)), typeof version != "string")
        return null;
      options = options || {};
      let match = null;
      if (!options.rtl)
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      else {
        let coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL], next;
        for (; (next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length); )
          (!match || next.index + next[0].length !== match.index + match[0].length) && (match = next), coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null)
        return null;
      let major = match[2], minor = match[3] || "0", patch = match[4] || "0", prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "", build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module.exports = coerce;
  }
});

// ../../node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "../../node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3, this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        let value = this.map.get(key);
        if (value !== void 0)
          return this.map.delete(key), this.map.set(key, value), value;
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        if (!this.delete(key) && value !== void 0) {
          if (this.map.size >= this.max) {
            let firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// ../../node_modules/semver/classes/range.js
var require_range = __commonJS({
  "../../node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g, Range = class _Range {
      constructor(range, options) {
        if (options = parseOptions(options), range instanceof _Range)
          return range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease ? range : new _Range(range.raw, options);
        if (range instanceof Comparator)
          return this.raw = range.value, this.set = [[range]], this.formatted = void 0, this;
        if (this.options = options, this.loose = !!options.loose, this.includePrerelease = !!options.includePrerelease, this.raw = range.trim().replace(SPACE_CHARACTERS, " "), this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length), !this.set.length)
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        if (this.set.length > 1) {
          let first = this.set[0];
          if (this.set = this.set.filter((c) => !isNullSet(c[0])), this.set.length === 0)
            this.set = [first];
          else if (this.set.length > 1) {
            for (let c of this.set)
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            i > 0 && (this.formatted += "||");
            let comps = this.set[i];
            for (let k = 0; k < comps.length; k++)
              k > 0 && (this.formatted += " "), this.formatted += comps[k].toString().trim();
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        let memoKey = ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) + ":" + range, cached = cache.get(memoKey);
        if (cached)
          return cached;
        let loose = this.options.loose, hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease)), debug("hyphen replace", range), range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace), debug("comparator trim", range), range = range.replace(re[t.TILDETRIM], tildeTrimReplace), debug("tilde trim", range), range = range.replace(re[t.CARETTRIM], caretTrimReplace), debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        loose && (rangeList = rangeList.filter((comp) => (debug("loose invalid filter", comp, this.options), !!comp.match(re[t.COMPARATORLOOSE])))), debug("range list", rangeList);
        let rangeMap = /* @__PURE__ */ new Map(), comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (let comp of comparators) {
          if (isNullSet(comp))
            return [comp];
          rangeMap.set(comp.value, comp);
        }
        rangeMap.size > 1 && rangeMap.has("") && rangeMap.delete("");
        let result = [...rangeMap.values()];
        return cache.set(memoKey, result), result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range))
          throw new TypeError("a Range is required");
        return this.set.some((thisComparators) => isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => rangeComparators.every((rangeComparator) => thisComparator.intersects(rangeComparator, options)))));
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version)
          return !1;
        if (typeof version == "string")
          try {
            version = new SemVer(version, this.options);
          } catch {
            return !1;
          }
        for (let i = 0; i < this.set.length; i++)
          if (testSet(this.set[i], version, this.options))
            return !0;
        return !1;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache(), cache = new LRU(), parseOptions = require_parse_options(), Comparator = require_comparator(), debug = require_debug(), SemVer = require_semver(), {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re(), { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants(), isNullSet = (c) => c.value === "<0.0.0-0", isAny = (c) => c.value === "", isSatisfiable = (comparators, options) => {
      let result = !0, remainingComparators = comparators.slice(), testComparator = remainingComparators.pop();
      for (; result && remainingComparators.length; )
        result = remainingComparators.every((otherComparator) => testComparator.intersects(otherComparator, options)), testComparator = remainingComparators.pop();
      return result;
    }, parseComparator = (comp, options) => (comp = comp.replace(re[t.BUILD], ""), debug("comp", comp, options), comp = replaceCarets(comp, options), debug("caret", comp), comp = replaceTildes(comp, options), debug("tildes", comp), comp = replaceXRanges(comp, options), debug("xrange", comp), comp = replaceStars(comp, options), debug("stars", comp), comp), isX = (id) => !id || id.toLowerCase() === "x" || id === "*", replaceTildes = (comp, options) => comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" "), replaceTilde = (comp, options) => {
      let r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        return isX(M) ? ret = "" : isX(m) ? ret = `>=${M}.0.0 <${+M + 1}.0.0-0` : isX(p) ? ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0` : pr ? (debug("replaceTilde pr", pr), ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`) : ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`, debug("tilde return", ret), ret;
      });
    }, replaceCarets = (comp, options) => comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" "), replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      let r = options.loose ? re[t.CARETLOOSE] : re[t.CARET], z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        return isX(M) ? ret = "" : isX(m) ? ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0` : isX(p) ? M === "0" ? ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0` : ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0` : pr ? (debug("replaceCaret pr", pr), M === "0" ? m === "0" ? ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0` : ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0` : ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`) : (debug("no pr"), M === "0" ? m === "0" ? ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0` : ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0` : ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`), debug("caret return", ret), ret;
      });
    }, replaceXRanges = (comp, options) => (debug("replaceXRanges", comp, options), comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ")), replaceXRange = (comp, options) => {
      comp = comp.trim();
      let r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        let xM = isX(M), xm = xM || isX(m), xp = xm || isX(p), anyX = xp;
        return gtlt === "=" && anyX && (gtlt = ""), pr = options.includePrerelease ? "-0" : "", xM ? gtlt === ">" || gtlt === "<" ? ret = "<0.0.0-0" : ret = "*" : gtlt && anyX ? (xm && (m = 0), p = 0, gtlt === ">" ? (gtlt = ">=", xm ? (M = +M + 1, m = 0, p = 0) : (m = +m + 1, p = 0)) : gtlt === "<=" && (gtlt = "<", xm ? M = +M + 1 : m = +m + 1), gtlt === "<" && (pr = "-0"), ret = `${gtlt + M}.${m}.${p}${pr}`) : xm ? ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0` : xp && (ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`), debug("xRange return", ret), ret;
      });
    }, replaceStars = (comp, options) => (debug("replaceStars", comp, options), comp.trim().replace(re[t.STAR], "")), replaceGTE0 = (comp, options) => (debug("replaceGTE0", comp, options), comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "")), hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => (isX(fM) ? from = "" : isX(fm) ? from = `>=${fM}.0.0${incPr ? "-0" : ""}` : isX(fp) ? from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}` : fpr ? from = `>=${from}` : from = `>=${from}${incPr ? "-0" : ""}`, isX(tM) ? to = "" : isX(tm) ? to = `<${+tM + 1}.0.0-0` : isX(tp) ? to = `<${tM}.${+tm + 1}.0-0` : tpr ? to = `<=${tM}.${tm}.${tp}-${tpr}` : incPr ? to = `<${tM}.${tm}.${+tp + 1}-0` : to = `<=${to}`, `${from} ${to}`.trim()), testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++)
        if (!set[i].test(version))
          return !1;
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++)
          if (debug(set[i].semver), set[i].semver !== Comparator.ANY && set[i].semver.prerelease.length > 0) {
            let allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch)
              return !0;
          }
        return !1;
      }
      return !0;
    };
  }
});

// ../../node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "../../node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    var ANY = Symbol("SemVer ANY"), Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        if (options = parseOptions(options), comp instanceof _Comparator) {
          if (comp.loose === !!options.loose)
            return comp;
          comp = comp.value;
        }
        comp = comp.trim().split(/\s+/).join(" "), debug("comparator", comp, options), this.options = options, this.loose = !!options.loose, this.parse(comp), this.semver === ANY ? this.value = "" : this.value = this.operator + this.semver.version, debug("comp", this);
      }
      parse(comp) {
        let r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR], m = comp.match(r);
        if (!m)
          throw new TypeError(`Invalid comparator: ${comp}`);
        this.operator = m[1] !== void 0 ? m[1] : "", this.operator === "=" && (this.operator = ""), m[2] ? this.semver = new SemVer(m[2], this.options.loose) : this.semver = ANY;
      }
      toString() {
        return this.value;
      }
      test(version) {
        if (debug("Comparator.test", version, this.options.loose), this.semver === ANY || version === ANY)
          return !0;
        if (typeof version == "string")
          try {
            version = new SemVer(version, this.options);
          } catch {
            return !1;
          }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator))
          throw new TypeError("a Comparator is required");
        return this.operator === "" ? this.value === "" ? !0 : new Range(comp.value, options).test(this.value) : comp.operator === "" ? comp.value === "" ? !0 : new Range(this.value, options).test(comp.semver) : (options = parseOptions(options), options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0") || !options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && comp.operator.startsWith(">") || this.operator.startsWith("<") && comp.operator.startsWith("<") || this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=") || cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<") || cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")));
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options(), { safeRe: re, t } = require_re(), cmp = require_cmp(), debug = require_debug(), SemVer = require_semver(), Range = require_range();
  }
});

// ../../node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "../../node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    var Range = require_range(), satisfies2 = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch {
        return !1;
      }
      return range.test(version);
    };
    module.exports = satisfies2;
  }
});

// ../../node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "../../node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range(), toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module.exports = toComparators;
  }
});

// ../../node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "../../node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), Range = require_range(), maxSatisfying = (versions, range, options) => {
      let max = null, maxSV = null, rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch {
        return null;
      }
      return versions.forEach((v) => {
        rangeObj.test(v) && (!max || maxSV.compare(v) === -1) && (max = v, maxSV = new SemVer(max, options));
      }), max;
    };
    module.exports = maxSatisfying;
  }
});

// ../../node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "../../node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), Range = require_range(), minSatisfying = (versions, range, options) => {
      let min = null, minSV = null, rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch {
        return null;
      }
      return versions.forEach((v) => {
        rangeObj.test(v) && (!min || minSV.compare(v) === 1) && (min = v, minSV = new SemVer(min, options));
      }), min;
    };
    module.exports = minSatisfying;
  }
});

// ../../node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "../../node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), Range = require_range(), gt = require_gt(), minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver) || (minver = new SemVer("0.0.0-0"), range.test(minver)))
        return minver;
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        let comparators = range.set[i], setMin = null;
        comparators.forEach((comparator) => {
          let compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              compver.prerelease.length === 0 ? compver.patch++ : compver.prerelease.push(0), compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              (!setMin || gt(compver, setMin)) && (setMin = compver);
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        }), setMin && (!minver || gt(minver, setMin)) && (minver = setMin);
      }
      return minver && range.test(minver) ? minver : null;
    };
    module.exports = minVersion;
  }
});

// ../../node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "../../node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range(), validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch {
        return null;
      }
    };
    module.exports = validRange;
  }
});

// ../../node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "../../node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    var SemVer = require_semver(), Comparator = require_comparator(), { ANY } = Comparator, Range = require_range(), satisfies2 = require_satisfies(), gt = require_gt(), lt = require_lt(), lte = require_lte(), gte = require_gte(), outside = (version, range, hilo, options) => {
      version = new SemVer(version, options), range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt, ltefn = lte, ltfn = lt, comp = ">", ecomp = ">=";
          break;
        case "<":
          gtfn = lt, ltefn = gte, ltfn = gt, comp = "<", ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies2(version, range, options))
        return !1;
      for (let i = 0; i < range.set.length; ++i) {
        let comparators = range.set[i], high = null, low = null;
        if (comparators.forEach((comparator) => {
          comparator.semver === ANY && (comparator = new Comparator(">=0.0.0")), high = high || comparator, low = low || comparator, gtfn(comparator.semver, high.semver, options) ? high = comparator : ltfn(comparator.semver, low.semver, options) && (low = comparator);
        }), high.operator === comp || high.operator === ecomp || (!low.operator || low.operator === comp) && ltefn(version, low.semver))
          return !1;
        if (low.operator === ecomp && ltfn(version, low.semver))
          return !1;
      }
      return !0;
    };
    module.exports = outside;
  }
});

// ../../node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "../../node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside(), gtr = (version, range, options) => outside(version, range, ">", options);
    module.exports = gtr;
  }
});

// ../../node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "../../node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside(), ltr = (version, range, options) => outside(version, range, "<", options);
    module.exports = ltr;
  }
});

// ../../node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "../../node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range(), intersects = (r1, r2, options) => (r1 = new Range(r1, options), r2 = new Range(r2, options), r1.intersects(r2, options));
    module.exports = intersects;
  }
});

// ../../node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "../../node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies2 = require_satisfies(), compare = require_compare();
    module.exports = (versions, range, options) => {
      let set = [], first = null, prev = null, v = versions.sort((a, b) => compare(a, b, options));
      for (let version of v)
        satisfies2(version, range, options) ? (prev = version, first || (first = version)) : (prev && set.push([first, prev]), prev = null, first = null);
      first && set.push([first, null]);
      let ranges = [];
      for (let [min, max] of set)
        min === max ? ranges.push(min) : !max && min === v[0] ? ranges.push("*") : max ? min === v[0] ? ranges.push(`<=${max}`) : ranges.push(`${min} - ${max}`) : ranges.push(`>=${min}`);
      let simplified = ranges.join(" || "), original = typeof range.raw == "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// ../../node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "../../node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    var Range = require_range(), Comparator = require_comparator(), { ANY } = Comparator, satisfies2 = require_satisfies(), compare = require_compare(), subset = (sub, dom, options = {}) => {
      if (sub === dom)
        return !0;
      sub = new Range(sub, options), dom = new Range(dom, options);
      let sawNonNull = !1;
      OUTER: for (let simpleSub of sub.set) {
        for (let simpleDom of dom.set) {
          let isSub = simpleSubset(simpleSub, simpleDom, options);
          if (sawNonNull = sawNonNull || isSub !== null, isSub)
            continue OUTER;
        }
        if (sawNonNull)
          return !1;
      }
      return !0;
    }, minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")], minimumVersion = [new Comparator(">=0.0.0")], simpleSubset = (sub, dom, options) => {
      if (sub === dom)
        return !0;
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY)
          return !0;
        options.includePrerelease ? sub = minimumVersionWithPreRelease : sub = minimumVersion;
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease)
          return !0;
        dom = minimumVersion;
      }
      let eqSet = /* @__PURE__ */ new Set(), gt, lt;
      for (let c of sub)
        c.operator === ">" || c.operator === ">=" ? gt = higherGT(gt, c, options) : c.operator === "<" || c.operator === "<=" ? lt = lowerLT(lt, c, options) : eqSet.add(c.semver);
      if (eqSet.size > 1)
        return null;
      let gtltComp;
      if (gt && lt) {
        if (gtltComp = compare(gt.semver, lt.semver, options), gtltComp > 0)
          return null;
        if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<="))
          return null;
      }
      for (let eq of eqSet) {
        if (gt && !satisfies2(eq, String(gt), options) || lt && !satisfies2(eq, String(lt), options))
          return null;
        for (let c of dom)
          if (!satisfies2(eq, String(c), options))
            return !1;
        return !0;
      }
      let higher, lower, hasDomLT, hasDomGT, needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : !1, needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : !1;
      needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0 && (needDomLTPre = !1);
      for (let c of dom) {
        if (hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=", hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=", gt) {
          if (needDomGTPre && c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch && (needDomGTPre = !1), c.operator === ">" || c.operator === ">=") {
            if (higher = higherGT(gt, c, options), higher === c && higher !== gt)
              return !1;
          } else if (gt.operator === ">=" && !satisfies2(gt.semver, String(c), options))
            return !1;
        }
        if (lt) {
          if (needDomLTPre && c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch && (needDomLTPre = !1), c.operator === "<" || c.operator === "<=") {
            if (lower = lowerLT(lt, c, options), lower === c && lower !== lt)
              return !1;
          } else if (lt.operator === "<=" && !satisfies2(lt.semver, String(c), options))
            return !1;
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0)
          return !1;
      }
      return !(gt && hasDomLT && !lt && gtltComp !== 0 || lt && hasDomGT && !gt && gtltComp !== 0 || needDomGTPre || needDomLTPre);
    }, higherGT = (a, b, options) => {
      if (!a)
        return b;
      let comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 || b.operator === ">" && a.operator === ">=" ? b : a;
    }, lowerLT = (a, b, options) => {
      if (!a)
        return b;
      let comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 || b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module.exports = subset;
  }
});

// ../../node_modules/semver/index.js
var require_semver2 = __commonJS({
  "../../node_modules/semver/index.js"(exports, module) {
    "use strict";
    var internalRe = require_re(), constants = require_constants(), SemVer = require_semver(), identifiers = require_identifiers(), parse = require_parse(), valid = require_valid(), clean = require_clean(), inc = require_inc(), diff = require_diff(), major = require_major(), minor = require_minor(), patch = require_patch(), prerelease = require_prerelease(), compare = require_compare(), rcompare = require_rcompare(), compareLoose = require_compare_loose(), compareBuild = require_compare_build(), sort = require_sort(), rsort = require_rsort(), gt = require_gt(), lt = require_lt(), eq = require_eq(), neq = require_neq(), gte = require_gte(), lte = require_lte(), cmp = require_cmp(), coerce = require_coerce(), Comparator = require_comparator(), Range = require_range(), satisfies2 = require_satisfies(), toComparators = require_to_comparators(), maxSatisfying = require_max_satisfying(), minSatisfying = require_min_satisfying(), minVersion = require_min_version(), validRange = require_valid2(), outside = require_outside(), gtr = require_gtr(), ltr = require_ltr(), intersects = require_intersects(), simplifyRange = require_simplify(), subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies: satisfies2,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/postinstall.ts
import { existsSync } from "node:fs";
import * as fs2 from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { babelParse, generate } from "storybook/internal/babel";
import { AddonVitestService } from "storybook/internal/cli";
import {
  JsPackageManagerFactory,
  formatFileContent,
  getProjectRoot,
  getStorybookInfo
} from "storybook/internal/common";
import { CLI_COLORS } from "storybook/internal/node-logger";
import {
  AddonVitestPostinstallConfigUpdateError,
  AddonVitestPostinstallError,
  AddonVitestPostinstallExistingSetupFileError,
  AddonVitestPostinstallFailedAddonA11yError,
  AddonVitestPostinstallPrerequisiteCheckError,
  AddonVitestPostinstallWorkspaceUpdateError
} from "storybook/internal/server-errors";
import { SupportedFramework } from "storybook/internal/types";
var import_semver = __toESM(require_semver2(), 1), import_ts_dedent = __toESM(require_dist(), 1);

// src/updateVitestFile.ts
import * as fs from "node:fs/promises";
var loadTemplate = async (name, replacements) => {
  let template = await fs.readFile(
    join(resolvePackageDir("@storybook/addon-vitest"), "templates", name),
    "utf8"
  );
  return Object.entries(replacements).forEach(([key, value]) => template = template.replace(key, value)), template;
}, mergeProperties = (source, target) => {
  for (let sourceProp of source)
    if (sourceProp.type === "ObjectProperty") {
      let targetProp = target.find(
        (p) => sourceProp.key.type === "Identifier" && p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === sourceProp.key.name
      );
      targetProp && targetProp.type === "ObjectProperty" ? sourceProp.value.type === "ObjectExpression" && targetProp.value.type === "ObjectExpression" ? mergeProperties(sourceProp.value.properties, targetProp.value.properties) : sourceProp.value.type === "ArrayExpression" && targetProp.value.type === "ArrayExpression" ? targetProp.value.elements.push(...sourceProp.value.elements) : targetProp.value = sourceProp.value : target.push(sourceProp);
    }
}, updateConfigFile = (source, target) => {
  let updated = !1, sourceExportDefault = source.program.body.find(
    (n) => n.type === "ExportDefaultDeclaration"
  );
  if (!sourceExportDefault || sourceExportDefault.declaration.type !== "CallExpression")
    return !1;
  let targetExportDefault = target.program.body.find(
    (n) => n.type === "ExportDefaultDeclaration"
  );
  if (!targetExportDefault || targetExportDefault.declaration.type === "CallExpression" && targetExportDefault.declaration.callee.type === "Identifier" && targetExportDefault.declaration.callee.name === "defineConfig" && targetExportDefault.declaration.arguments.length > 0 && targetExportDefault.declaration.arguments[0].type === "ArrowFunctionExpression")
    return !1;
  let canHandleConfig = !1;
  if ((targetExportDefault.declaration.type === "ObjectExpression" || targetExportDefault.declaration.type === "CallExpression" && targetExportDefault.declaration.callee.type === "Identifier" && targetExportDefault.declaration.callee.name === "defineConfig" && targetExportDefault.declaration.arguments[0]?.type === "ObjectExpression" || targetExportDefault.declaration.type === "CallExpression" && targetExportDefault.declaration.callee.type === "Identifier" && targetExportDefault.declaration.callee.name === "mergeConfig" && targetExportDefault.declaration.arguments.length >= 2) && (canHandleConfig = !0), !canHandleConfig)
    return !1;
  for (let sourceNode of source.program.body)
    if (sourceNode.type === "ImportDeclaration") {
      if (!target.program.body.some(
        (targetNode) => targetNode.type === sourceNode.type && targetNode.specifiers.some((s) => s.local.name === sourceNode.specifiers[0].local.name)
      )) {
        let lastImport = target.program.body.findLastIndex((n) => n.type === "ImportDeclaration");
        target.program.body.splice(lastImport + 1, 0, sourceNode);
      }
    } else if (sourceNode.type === "VariableDeclaration") {
      if (!target.program.body.some(
        (targetNode) => targetNode.type === sourceNode.type && targetNode.declarations.some(
          (d) => "name" in d.id && "name" in sourceNode.declarations[0].id && d.id.name === sourceNode.declarations[0].id.name
        )
      )) {
        let lastImport = target.program.body.findLastIndex((n) => n.type === "ImportDeclaration");
        target.program.body.splice(lastImport + 1, 0, sourceNode);
      }
    } else if (sourceNode.type === "ExportDefaultDeclaration") {
      let exportDefault = target.program.body.find((n) => n.type === "ExportDefaultDeclaration");
      if (exportDefault && sourceNode.declaration.type === "CallExpression" && sourceNode.declaration.arguments.length > 0 && sourceNode.declaration.arguments[0].type === "ObjectExpression") {
        let { properties } = sourceNode.declaration.arguments[0];
        if (exportDefault.declaration.type === "ObjectExpression")
          mergeProperties(properties, exportDefault.declaration.properties), updated = !0;
        else if (exportDefault.declaration.type === "CallExpression" && exportDefault.declaration.callee.type === "Identifier" && exportDefault.declaration.callee.name === "defineConfig" && exportDefault.declaration.arguments[0]?.type === "ObjectExpression")
          mergeProperties(properties, exportDefault.declaration.arguments[0].properties), updated = !0;
        else if (exportDefault.declaration.type === "CallExpression" && exportDefault.declaration.callee.type === "Identifier" && exportDefault.declaration.callee.name === "mergeConfig" && exportDefault.declaration.arguments.length >= 2) {
          let configObjectNodes = [];
          for (let arg of exportDefault.declaration.arguments)
            arg?.type === "CallExpression" && arg.callee.type === "Identifier" && arg.callee.name === "defineConfig" && arg.arguments[0]?.type === "ObjectExpression" ? configObjectNodes.push(arg.arguments[0]) : arg?.type === "ObjectExpression" && configObjectNodes.push(arg);
          let targetConfigObject = configObjectNodes.find(
            (obj) => obj.properties.some(
              (p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === "test"
            )
          ) || configObjectNodes[0];
          if (!targetConfigObject)
            return !1;
          let existingTestProp = targetConfigObject.properties.find(
            (p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === "test"
          );
          if (existingTestProp && existingTestProp.value.type === "ObjectExpression") {
            let templateTestProp = properties.find(
              (p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === "test"
            );
            if (templateTestProp && templateTestProp.value.type === "ObjectExpression") {
              let workspaceOrProjectsProp = templateTestProp.value.properties.find(
                (p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && (p.key.name === "workspace" || p.key.name === "projects")
              );
              if (workspaceOrProjectsProp && workspaceOrProjectsProp.value.type === "ArrayExpression") {
                let coverageProp = existingTestProp.value.properties.find(
                  (p) => p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === "coverage"
                ), testConfigForProject = {
                  type: "ObjectExpression",
                  properties: existingTestProp.value.properties.filter(
                    (p) => p !== coverageProp
                  )
                }, existingTestProject = {
                  type: "ObjectExpression",
                  properties: [
                    {
                      type: "ObjectProperty",
                      key: { type: "Identifier", name: "extends" },
                      value: { type: "BooleanLiteral", value: !0 },
                      computed: !1,
                      shorthand: !1
                    },
                    {
                      type: "ObjectProperty",
                      key: { type: "Identifier", name: "test" },
                      value: testConfigForProject,
                      computed: !1,
                      shorthand: !1
                    }
                  ]
                };
                workspaceOrProjectsProp.value.elements.unshift(existingTestProject), targetConfigObject.properties = targetConfigObject.properties.filter(
                  (p) => p !== existingTestProp
                ), coverageProp && templateTestProp.value.type === "ObjectExpression" && templateTestProp.value.properties.unshift(coverageProp), mergeProperties(properties, targetConfigObject.properties);
              } else
                mergeProperties(properties, targetConfigObject.properties);
            } else
              mergeProperties(properties, targetConfigObject.properties);
          } else
            mergeProperties(properties, targetConfigObject.properties);
          updated = !0;
        }
      }
    }
  return updated;
}, updateWorkspaceFile = (source, target) => {
  let updated = !1;
  for (let sourceNode of source.program.body)
    if (sourceNode.type === "ImportDeclaration") {
      if (!target.program.body.some(
        (targetNode) => targetNode.type === sourceNode.type && targetNode.source.value === sourceNode.source.value && targetNode.specifiers.some((s) => s.local.name === sourceNode.specifiers[0].local.name)
      )) {
        let lastImport = target.program.body.findLastIndex((n) => n.type === "ImportDeclaration");
        target.program.body.splice(lastImport + 1, 0, sourceNode);
      }
    } else if (sourceNode.type === "VariableDeclaration") {
      if (!target.program.body.some(
        (targetNode) => targetNode.type === sourceNode.type && targetNode.declarations.some(
          (d) => "name" in d.id && "name" in sourceNode.declarations[0].id && d.id.name === sourceNode.declarations[0].id.name
        )
      )) {
        let lastImport = target.program.body.findLastIndex((n) => n.type === "ImportDeclaration");
        target.program.body.splice(lastImport + 1, 0, sourceNode);
      }
    } else if (sourceNode.type === "ExportDefaultDeclaration") {
      let exportDefault = target.program.body.find((n) => n.type === "ExportDefaultDeclaration");
      if (exportDefault && sourceNode.declaration.type === "CallExpression" && sourceNode.declaration.arguments.length > 0 && sourceNode.declaration.arguments[0].type === "ArrayExpression" && sourceNode.declaration.arguments[0].elements.length > 0) {
        let { elements } = sourceNode.declaration.arguments[0];
        exportDefault.declaration.type === "ArrayExpression" ? (exportDefault.declaration.elements.push(...elements), updated = !0) : exportDefault.declaration.type === "CallExpression" && exportDefault.declaration.callee.type === "Identifier" && exportDefault.declaration.callee.name === "defineWorkspace" && exportDefault.declaration.arguments[0]?.type === "ArrayExpression" && (exportDefault.declaration.arguments[0].elements.push(...elements), updated = !0);
      }
    }
  return updated;
};

// src/postinstall.ts
var ADDON_NAME = "@storybook/addon-vitest", EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".cts", ".mts", ".cjs", ".mjs"], addonA11yName = "@storybook/addon-a11y";
async function postInstall(options) {
  let errors = [], { logger, prompt } = options, packageManager = JsPackageManagerFactory.getPackageManager({
    force: options.packageManager
  }), findFile = (basename, extensions = EXTENSIONS) => any(
    extensions.map((ext) => basename + ext),
    { last: getProjectRoot(), cwd: options.configDir }
  ), vitestVersionSpecifier = await packageManager.getInstalledVersion("vitest");
  logger.debug(`Vitest version specifier: ${vitestVersionSpecifier}`);
  let isVitest3_2To4 = vitestVersionSpecifier ? (0, import_semver.satisfies)(vitestVersionSpecifier, ">=3.2.0 <4.0.0") : !1, isVitest4OrNewer = vitestVersionSpecifier ? (0, import_semver.satisfies)(vitestVersionSpecifier, ">=4.0.0") : !0, info = await getStorybookInfo(options.configDir), allDeps = packageManager.getAllDependencies(), addonVitestService = new AddonVitestService(packageManager), compatibilityResult = await addonVitestService.validateCompatibility({
    framework: info.framework,
    builder: info.builder
  }), result = null;
  if (!compatibilityResult.compatible && compatibilityResult.reasons) {
    let reasons = compatibilityResult.reasons.map((r) => `\u2022 ${CLI_COLORS.error(r)}`);
    reasons.unshift(import_ts_dedent.dedent`
      Automated setup failed
      The following packages have incompatibilities that prevent automated setup:
    `), reasons.push(
      import_ts_dedent.dedent`
        You can fix these issues and rerun the command to reinstall. If you wish to roll back the installation, remove ${ADDON_NAME} from the "addons" array
        in your main Storybook config file and remove the dependency from your package.json file.

        Please check the documentation for more information about its requirements and installation:
        https://storybook.js.org/docs/next/${DOCUMENTATION_LINK}
      `
    ), result = reasons.map((r) => r.trim()).join(`

`);
  }
  if (result)
    throw logger.error(result), new AddonVitestPostinstallPrerequisiteCheckError({
      reasons: compatibilityResult.reasons
    });
  if (!options.skipDependencyManagement) {
    let versionedDependencies = await addonVitestService.collectDependencies();
    info.framework === SupportedFramework.NEXTJS && packageManager.getAllDependencies()["@storybook/nextjs-vite"];
    let v8Version = await packageManager.getInstalledVersion("@vitest/coverage-v8"), istanbulVersion = await packageManager.getInstalledVersion("@vitest/coverage-istanbul");
    !v8Version && !istanbulVersion && logger.step(
      import_ts_dedent.dedent`
          You don't seem to have a coverage reporter installed. Vitest needs either V8 or Istanbul to generate coverage reports.

          Adding "@vitest/coverage-v8" to enable coverage reporting.
          Read more about Vitest coverage providers at https://vitest.dev/guide/coverage.html#coverage-providers
        `
    ), versionedDependencies.length > 0 && (logger.step("Adding dependencies to your package.json"), logger.log("  " + versionedDependencies.join(", ")), await packageManager.addDependencies(
      { type: "devDependencies", skipInstall: !0 },
      versionedDependencies
    )), options.skipInstall || await packageManager.installDependencies();
  }
  options.skipDependencyManagement || (options.skipInstall ? logger.warn(import_ts_dedent.dedent`
        Playwright browser binaries installation skipped. Please run the following command manually later:
        ${CLI_COLORS.cta("npx playwright install chromium --with-deps")}
      `) : await addonVitestService.installPlaywright({
    yes: options.yes
  }));
  let fileExtension = allDeps.typescript || findFile("tsconfig", [...EXTENSIONS, ".json"]) ? "ts" : "js", vitestSetupFile = resolve(options.configDir, `vitest.setup.${fileExtension}`);
  if (existsSync(vitestSetupFile)) {
    let errorMessage = import_ts_dedent.dedent`
    Found an existing Vitest setup file:
    ${vitestSetupFile}
    Please refer to the documentation to complete the setup manually:
    https://storybook.js.org/docs/next/${DOCUMENTATION_LINK}#manual-setup
  `;
    logger.line(), logger.error(`${errorMessage}
`), errors.push(new AddonVitestPostinstallExistingSetupFileError({ filePath: vitestSetupFile }));
  } else {
    logger.step("Creating a Vitest setup file for Storybook:"), logger.log(`${vitestSetupFile}
`);
    let previewExists = EXTENSIONS.map((ext) => resolve(options.configDir, `preview${ext}`)).some(
      existsSync
    ), imports = [`import { setProjectAnnotations } from '${info.frameworkPackage}';`], projectAnnotations = [];
    previewExists && (imports.push("import * as projectAnnotations from './preview';"), projectAnnotations.push("projectAnnotations")), await writeFile(
      vitestSetupFile,
      import_ts_dedent.dedent`
      ${imports.join(`
`)}

      // This is an important step to apply the right configuration when testing your stories.
      // More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
      setProjectAnnotations([${projectAnnotations.join(", ")}]);
    `
    );
  }
  let vitestWorkspaceFile = findFile("vitest.workspace", [".ts", ".js", ".json"]), viteConfigFile = findFile("vite.config"), vitestConfigFile = findFile("vitest.config"), vitestShimFile = findFile("vitest.shims.d"), rootConfig = vitestConfigFile || viteConfigFile;
  fileExtension === "ts" && !vitestShimFile && await writeFile(
    "vitest.shims.d.ts",
    isVitest4OrNewer ? '/// <reference types="@vitest/browser-playwright" />' : '/// <reference types="@vitest/browser/providers/playwright" />'
  );
  let getTemplateName = () => isVitest4OrNewer ? "vitest.config.4.template.ts" : isVitest3_2To4 ? "vitest.config.3.2.template.ts" : "vitest.config.template.ts";
  if (vitestWorkspaceFile) {
    let workspaceTemplate = await loadTemplate("vitest.workspace.template.ts", {
      EXTENDS_WORKSPACE: viteConfigFile ? relative(dirname(vitestWorkspaceFile), viteConfigFile) : "",
      CONFIG_DIR: options.configDir,
      SETUP_FILE: relative(dirname(vitestWorkspaceFile), vitestSetupFile)
    }).then((t) => t.replace(`
  'ROOT_CONFIG',`, "").replace(/\s+extends: '',/, "")), workspaceFile = await fs2.readFile(vitestWorkspaceFile, "utf8"), source = babelParse(workspaceTemplate), target = babelParse(workspaceFile);
    if (updateWorkspaceFile(source, target)) {
      logger.step("Updating your Vitest workspace file..."), logger.log(`${vitestWorkspaceFile}`);
      let formattedContent = await formatFileContent(vitestWorkspaceFile, generate(target).code);
      await writeFile(vitestWorkspaceFile, formattedContent);
    } else
      logger.error(
        import_ts_dedent.dedent`
          Could not update existing Vitest workspace file:
          ${vitestWorkspaceFile}

          I was able to configure most of the addon but could not safely extend
          your existing workspace file automatically, you must do it yourself.

          Please refer to the documentation to complete the setup manually:
          https://storybook.js.org/docs/next/${DOCUMENTATION_LINK}#manual-setup
        `
      ), errors.push(
        new AddonVitestPostinstallWorkspaceUpdateError({ filePath: vitestWorkspaceFile })
      );
  } else if (rootConfig) {
    let target, updated, configFile = await fs2.readFile(rootConfig, "utf8"), configFileHasTypeReference = configFile.match(
      /\/\/\/\s*<reference\s+types=["']vitest\/config["']\s*\/>/
    ), templateName = getTemplateName();
    if (templateName) {
      let configTemplate = await loadTemplate(templateName, {
        CONFIG_DIR: options.configDir,
        SETUP_FILE: relative(dirname(rootConfig), vitestSetupFile)
      }), source = babelParse(configTemplate);
      target = babelParse(configFile), updated = updateConfigFile(source, target);
    }
    if (target && updated) {
      logger.step(`Updating your ${vitestConfigFile ? "Vitest" : "Vite"} config file:`), logger.log(`  ${rootConfig}`);
      let formattedContent = await formatFileContent(rootConfig, generate(target).code);
      await writeFile(
        rootConfig,
        !configFileHasTypeReference && !vitestConfigFile ? `/// <reference types="vitest/config" />
` + formattedContent : formattedContent
      );
    } else
      logger.error(import_ts_dedent.dedent`
        We were unable to update your existing ${vitestConfigFile ? "Vitest" : "Vite"} config file.

        Please refer to the documentation to complete the setup manually:
        https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup
      `), errors.push(new AddonVitestPostinstallConfigUpdateError({ filePath: rootConfig }));
  } else {
    let parentDir = dirname(options.configDir), newConfigFile = resolve(parentDir, `vitest.config.${fileExtension}`), configTemplate = await loadTemplate(getTemplateName(), {
      CONFIG_DIR: options.configDir,
      SETUP_FILE: relative(dirname(newConfigFile), vitestSetupFile)
    });
    logger.step("Creating a Vitest config file:"), logger.log(`${newConfigFile}`);
    let formattedContent = await formatFileContent(newConfigFile, configTemplate);
    await writeFile(newConfigFile, formattedContent);
  }
  if (info.addons.find((addon) => addon.includes(addonA11yName)))
    try {
      let command = [
        "storybook",
        "automigrate",
        "addon-a11y-addon-test",
        "--loglevel",
        "silent",
        "--yes",
        "--skip-doctor"
      ];
      options.packageManager && command.push("--package-manager", options.packageManager), options.skipInstall && command.push("--skip-install"), options.configDir !== ".storybook" && command.push("--config-dir", options.configDir), await prompt.executeTask(
        // TODO: Remove stdio: 'ignore' once we have a way to log the output of the command properly
        () => packageManager.runPackageCommand({ args: command, stdio: "ignore" }),
        {
          intro: "Setting up a11y addon for @storybook/addon-vitest",
          error: "Failed to setup a11y addon for @storybook/addon-vitest",
          success: "a11y addon setup successfully"
        }
      );
    } catch (e) {
      logger.error(import_ts_dedent.dedent`
        Could not automatically set up ${addonA11yName} for @storybook/addon-vitest.
        Please refer to the documentation to complete the setup manually:
        https://storybook.js.org/docs/writing-tests/accessibility-testing#test-addon-integration
      `), errors.push(new AddonVitestPostinstallFailedAddonA11yError({ error: e }));
    }
  let runCommand = rootConfig ? "npx vitest --project=storybook" : "npx vitest";
  if (errors.length === 0)
    logger.step(CLI_COLORS.success("@storybook/addon-vitest setup completed successfully")), logger.log(import_ts_dedent.dedent`
        @storybook/addon-vitest is now configured and you're ready to run your tests!
        Here are a couple of tips to get you started:

        • You can run tests with "${CLI_COLORS.cta(runCommand)}"
        • Vitest IDE extension shows all stories as tests in your editor!

        Check the documentation for more information about its features and options at:
        https://storybook.js.org/docs/next/${DOCUMENTATION_LINK}
      `);
  else
    throw logger.warn(
      import_ts_dedent.dedent`
        Done, but with errors!
        @storybook/addon-vitest was installed successfully, but there were some errors during the setup process. Please refer to the documentation to complete the setup manually and check the errors above:
        https://storybook.js.org/docs/next/${DOCUMENTATION_LINK}#manual-setup
      `
    ), new AddonVitestPostinstallError({ errors });
}
export {
  postInstall as default
};
