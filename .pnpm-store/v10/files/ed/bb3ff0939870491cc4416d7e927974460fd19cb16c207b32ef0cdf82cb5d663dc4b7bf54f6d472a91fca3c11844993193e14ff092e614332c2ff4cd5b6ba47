import ESM_COMPAT_Module from "node:module";
import { fileURLToPath as ESM_COMPAT_fileURLToPath } from 'node:url';
import { dirname as ESM_COMPAT_dirname } from 'node:path';
const __filename = ESM_COMPAT_fileURLToPath(import.meta.url);
const __dirname = ESM_COMPAT_dirname(__filename);
const require = ESM_COMPAT_Module.createRequire(import.meta.url);
var da = Object.create;
var Lt = Object.defineProperty;
var ua = Object.getOwnPropertyDescriptor;
var la = Object.getOwnPropertyNames;
var fa = Object.getPrototypeOf, pa = Object.prototype.hasOwnProperty;
var a = (t, e) => Lt(t, "name", { value: e, configurable: !0 }), A = /* @__PURE__ */ ((t) => typeof require < "u" ? require : typeof Proxy <
"u" ? new Proxy(t, {
  get: (e, r) => (typeof require < "u" ? require : e)[r]
}) : t)(function(t) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + t + '" is not supported');
});
var I = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports);
var ma = (t, e, r, n) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let s of la(e))
      !pa.call(t, s) && s !== r && Lt(t, s, { get: () => e[s], enumerable: !(n = ua(e, s)) || n.enumerable });
  return t;
};
var z = (t, e, r) => (r = t != null ? da(fa(t)) : {}, ma(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !t || !t.__esModule ? Lt(r, "default", { value: t, enumerable: !0 }) : r,
  t
));

// ../node_modules/picocolors/picocolors.js
var Yr = I((ol, Ut) => {
  var Jr = process.argv || [], Qe = process.env, ha = !("NO_COLOR" in Qe || Jr.includes("--no-color")) && ("FORCE_COLOR" in Qe || Jr.includes(
  "--color") || process.platform === "win32" || A != null && A("tty").isatty(1) && Qe.TERM !== "dumb" || "CI" in Qe), ya = /* @__PURE__ */ a(
  (t, e, r = t) => (n) => {
    let s = "" + n, o = s.indexOf(e, t.length);
    return ~o ? t + ga(s, e, r, o) + e : t + s + e;
  }, "formatter"), ga = /* @__PURE__ */ a((t, e, r, n) => {
    let s = "", o = 0;
    do
      s += t.substring(o, n) + r, o = n + e.length, n = t.indexOf(e, o);
    while (~n);
    return s + t.substring(o);
  }, "replaceClose"), Hr = /* @__PURE__ */ a((t = ha) => {
    let e = t ? ya : () => String;
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
  Ut.exports = Hr();
  Ut.exports.createColors = Hr;
});

// ../node_modules/walk-up-path/dist/cjs/index.js
var on = I((rt) => {
  "use strict";
  Object.defineProperty(rt, "__esModule", { value: !0 });
  rt.walkUp = void 0;
  var sn = A("path"), ba = /* @__PURE__ */ a(function* (t) {
    for (t = (0, sn.resolve)(t); t; ) {
      yield t;
      let e = (0, sn.dirname)(t);
      if (e === t)
        break;
      t = e;
    }
  }, "walkUp");
  rt.walkUp = ba;
});

// ../node_modules/zod/lib/helpers/util.js
var Ze = I((E) => {
  "use strict";
  Object.defineProperty(E, "__esModule", { value: !0 });
  E.getParsedType = E.ZodParsedType = E.objectUtil = E.util = void 0;
  var Gt;
  (function(t) {
    t.assertEqual = (s) => s;
    function e(s) {
    }
    a(e, "assertIs"), t.assertIs = e;
    function r(s) {
      throw new Error();
    }
    a(r, "assertNever"), t.assertNever = r, t.arrayToEnum = (s) => {
      let o = {};
      for (let i of s)
        o[i] = i;
      return o;
    }, t.getValidEnumValues = (s) => {
      let o = t.objectKeys(s).filter((c) => typeof s[s[c]] != "number"), i = {};
      for (let c of o)
        i[c] = s[c];
      return t.objectValues(i);
    }, t.objectValues = (s) => t.objectKeys(s).map(function(o) {
      return s[o];
    }), t.objectKeys = typeof Object.keys == "function" ? (s) => Object.keys(s) : (s) => {
      let o = [];
      for (let i in s)
        Object.prototype.hasOwnProperty.call(s, i) && o.push(i);
      return o;
    }, t.find = (s, o) => {
      for (let i of s)
        if (o(i))
          return i;
    }, t.isInteger = typeof Number.isInteger == "function" ? (s) => Number.isInteger(s) : (s) => typeof s == "number" && isFinite(s) && Math.
    floor(s) === s;
    function n(s, o = " | ") {
      return s.map((i) => typeof i == "string" ? `'${i}'` : i).join(o);
    }
    a(n, "joinValues"), t.joinValues = n, t.jsonStringifyReplacer = (s, o) => typeof o == "bigint" ? o.toString() : o;
  })(Gt || (E.util = Gt = {}));
  var fn;
  (function(t) {
    t.mergeShapes = (e, r) => ({
      ...e,
      ...r
      // second overwrites first
    });
  })(fn || (E.objectUtil = fn = {}));
  E.ZodParsedType = Gt.arrayToEnum([
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
  var Ca = /* @__PURE__ */ a((t) => {
    switch (typeof t) {
      case "undefined":
        return E.ZodParsedType.undefined;
      case "string":
        return E.ZodParsedType.string;
      case "number":
        return isNaN(t) ? E.ZodParsedType.nan : E.ZodParsedType.number;
      case "boolean":
        return E.ZodParsedType.boolean;
      case "function":
        return E.ZodParsedType.function;
      case "bigint":
        return E.ZodParsedType.bigint;
      case "symbol":
        return E.ZodParsedType.symbol;
      case "object":
        return Array.isArray(t) ? E.ZodParsedType.array : t === null ? E.ZodParsedType.null : t.then && typeof t.then == "function" && t.catch &&
        typeof t.catch == "function" ? E.ZodParsedType.promise : typeof Map < "u" && t instanceof Map ? E.ZodParsedType.map : typeof Set < "\
u" && t instanceof Set ? E.ZodParsedType.set : typeof Date < "u" && t instanceof Date ? E.ZodParsedType.date : E.ZodParsedType.object;
      default:
        return E.ZodParsedType.unknown;
    }
  }, "getParsedType");
  E.getParsedType = Ca;
});

// ../node_modules/zod/lib/ZodError.js
var nt = I((q) => {
  "use strict";
  Object.defineProperty(q, "__esModule", { value: !0 });
  q.ZodError = q.quotelessJson = q.ZodIssueCode = void 0;
  var pn = Ze();
  q.ZodIssueCode = pn.util.arrayToEnum([
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
  var Pa = /* @__PURE__ */ a((t) => JSON.stringify(t, null, 2).replace(/"([^"]+)":/g, "$1:"), "quotelessJson");
  q.quotelessJson = Pa;
  var je = class t extends Error {
    static {
      a(this, "ZodError");
    }
    get errors() {
      return this.issues;
    }
    constructor(e) {
      super(), this.issues = [], this.addIssue = (n) => {
        this.issues = [...this.issues, n];
      }, this.addIssues = (n = []) => {
        this.issues = [...this.issues, ...n];
      };
      let r = new.target.prototype;
      Object.setPrototypeOf ? Object.setPrototypeOf(this, r) : this.__proto__ = r, this.name = "ZodError", this.issues = e;
    }
    format(e) {
      let r = e || function(o) {
        return o.message;
      }, n = { _errors: [] }, s = /* @__PURE__ */ a((o) => {
        for (let i of o.issues)
          if (i.code === "invalid_union")
            i.unionErrors.map(s);
          else if (i.code === "invalid_return_type")
            s(i.returnTypeError);
          else if (i.code === "invalid_arguments")
            s(i.argumentsError);
          else if (i.path.length === 0)
            n._errors.push(r(i));
          else {
            let c = n, l = 0;
            for (; l < i.path.length; ) {
              let f = i.path[l];
              l === i.path.length - 1 ? (c[f] = c[f] || { _errors: [] }, c[f]._errors.push(r(i))) : c[f] = c[f] || { _errors: [] }, c = c[f],
              l++;
            }
          }
      }, "processError");
      return s(this), n;
    }
    static assert(e) {
      if (!(e instanceof t))
        throw new Error(`Not a ZodError: ${e}`);
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, pn.util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(e = (r) => r.message) {
      let r = {}, n = [];
      for (let s of this.issues)
        s.path.length > 0 ? (r[s.path[0]] = r[s.path[0]] || [], r[s.path[0]].push(e(s))) : n.push(e(s));
      return { formErrors: n, fieldErrors: r };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  q.ZodError = je;
  je.create = (t) => new je(t);
});

// ../node_modules/zod/lib/locales/en.js
var zt = I((Kt) => {
  "use strict";
  Object.defineProperty(Kt, "__esModule", { value: !0 });
  var ee = Ze(), O = nt(), Aa = /* @__PURE__ */ a((t, e) => {
    let r;
    switch (t.code) {
      case O.ZodIssueCode.invalid_type:
        t.received === ee.ZodParsedType.undefined ? r = "Required" : r = `Expected ${t.expected}, received ${t.received}`;
        break;
      case O.ZodIssueCode.invalid_literal:
        r = `Invalid literal value, expected ${JSON.stringify(t.expected, ee.util.jsonStringifyReplacer)}`;
        break;
      case O.ZodIssueCode.unrecognized_keys:
        r = `Unrecognized key(s) in object: ${ee.util.joinValues(t.keys, ", ")}`;
        break;
      case O.ZodIssueCode.invalid_union:
        r = "Invalid input";
        break;
      case O.ZodIssueCode.invalid_union_discriminator:
        r = `Invalid discriminator value. Expected ${ee.util.joinValues(t.options)}`;
        break;
      case O.ZodIssueCode.invalid_enum_value:
        r = `Invalid enum value. Expected ${ee.util.joinValues(t.options)}, received '${t.received}'`;
        break;
      case O.ZodIssueCode.invalid_arguments:
        r = "Invalid function arguments";
        break;
      case O.ZodIssueCode.invalid_return_type:
        r = "Invalid function return type";
        break;
      case O.ZodIssueCode.invalid_date:
        r = "Invalid date";
        break;
      case O.ZodIssueCode.invalid_string:
        typeof t.validation == "object" ? "includes" in t.validation ? (r = `Invalid input: must include "${t.validation.includes}"`, typeof t.
        validation.position == "number" && (r = `${r} at one or more positions greater than or equal to ${t.validation.position}`)) : "start\
sWith" in t.validation ? r = `Invalid input: must start with "${t.validation.startsWith}"` : "endsWith" in t.validation ? r = `Invalid input\
: must end with "${t.validation.endsWith}"` : ee.util.assertNever(t.validation) : t.validation !== "regex" ? r = `Invalid ${t.validation}` :
        r = "Invalid";
        break;
      case O.ZodIssueCode.too_small:
        t.type === "array" ? r = `Array must contain ${t.exact ? "exactly" : t.inclusive ? "at least" : "more than"} ${t.minimum} element(s)` :
        t.type === "string" ? r = `String must contain ${t.exact ? "exactly" : t.inclusive ? "at least" : "over"} ${t.minimum} character(s)` :
        t.type === "number" ? r = `Number must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater tha\
n "}${t.minimum}` : t.type === "date" ? r = `Date must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "gre\
ater than "}${new Date(Number(t.minimum))}` : r = "Invalid input";
        break;
      case O.ZodIssueCode.too_big:
        t.type === "array" ? r = `Array must contain ${t.exact ? "exactly" : t.inclusive ? "at most" : "less than"} ${t.maximum} element(s)` :
        t.type === "string" ? r = `String must contain ${t.exact ? "exactly" : t.inclusive ? "at most" : "under"} ${t.maximum} character(s)` :
        t.type === "number" ? r = `Number must be ${t.exact ? "exactly" : t.inclusive ? "less than or equal to" : "less than"} ${t.maximum}` :
        t.type === "bigint" ? r = `BigInt must be ${t.exact ? "exactly" : t.inclusive ? "less than or equal to" : "less than"} ${t.maximum}` :
        t.type === "date" ? r = `Date must be ${t.exact ? "exactly" : t.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(
        Number(t.maximum))}` : r = "Invalid input";
        break;
      case O.ZodIssueCode.custom:
        r = "Invalid input";
        break;
      case O.ZodIssueCode.invalid_intersection_types:
        r = "Intersection results could not be merged";
        break;
      case O.ZodIssueCode.not_multiple_of:
        r = `Number must be a multiple of ${t.multipleOf}`;
        break;
      case O.ZodIssueCode.not_finite:
        r = "Number must be finite";
        break;
      default:
        r = e.defaultError, ee.util.assertNever(t);
    }
    return { message: r };
  }, "errorMap");
  Kt.default = Aa;
});

// ../node_modules/zod/lib/errors.js
var st = I(($) => {
  "use strict";
  var Oa = $ && $.__importDefault || function(t) {
    return t && t.__esModule ? t : { default: t };
  };
  Object.defineProperty($, "__esModule", { value: !0 });
  $.getErrorMap = $.setErrorMap = $.defaultErrorMap = void 0;
  var mn = Oa(zt());
  $.defaultErrorMap = mn.default;
  var hn = mn.default;
  function Ra(t) {
    hn = t;
  }
  a(Ra, "setErrorMap");
  $.setErrorMap = Ra;
  function Na() {
    return hn;
  }
  a(Na, "getErrorMap");
  $.getErrorMap = Na;
});

// ../node_modules/zod/lib/helpers/parseUtil.js
var Jt = I((T) => {
  "use strict";
  var Za = T && T.__importDefault || function(t) {
    return t && t.__esModule ? t : { default: t };
  };
  Object.defineProperty(T, "__esModule", { value: !0 });
  T.isAsync = T.isValid = T.isDirty = T.isAborted = T.OK = T.DIRTY = T.INVALID = T.ParseStatus = T.addIssueToContext = T.EMPTY_PATH = T.makeIssue =
  void 0;
  var ja = st(), yn = Za(zt()), Ma = /* @__PURE__ */ a((t) => {
    let { data: e, path: r, errorMaps: n, issueData: s } = t, o = [...r, ...s.path || []], i = {
      ...s,
      path: o
    };
    if (s.message !== void 0)
      return {
        ...s,
        path: o,
        message: s.message
      };
    let c = "", l = n.filter((f) => !!f).slice().reverse();
    for (let f of l)
      c = f(i, { data: e, defaultError: c }).message;
    return {
      ...s,
      path: o,
      message: c
    };
  }, "makeIssue");
  T.makeIssue = Ma;
  T.EMPTY_PATH = [];
  function Da(t, e) {
    let r = (0, ja.getErrorMap)(), n = (0, T.makeIssue)({
      issueData: e,
      data: t.data,
      path: t.path,
      errorMaps: [
        t.common.contextualErrorMap,
        // contextual error map is first priority
        t.schemaErrorMap,
        // then schema-bound map if available
        r,
        // then global override map
        r === yn.default ? void 0 : yn.default
        // then global default map
      ].filter((s) => !!s)
    });
    t.common.issues.push(n);
  }
  a(Da, "addIssueToContext");
  T.addIssueToContext = Da;
  var qt = class t {
    static {
      a(this, "ParseStatus");
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
    static mergeArray(e, r) {
      let n = [];
      for (let s of r) {
        if (s.status === "aborted")
          return T.INVALID;
        s.status === "dirty" && e.dirty(), n.push(s.value);
      }
      return { status: e.value, value: n };
    }
    static async mergeObjectAsync(e, r) {
      let n = [];
      for (let s of r) {
        let o = await s.key, i = await s.value;
        n.push({
          key: o,
          value: i
        });
      }
      return t.mergeObjectSync(e, n);
    }
    static mergeObjectSync(e, r) {
      let n = {};
      for (let s of r) {
        let { key: o, value: i } = s;
        if (o.status === "aborted" || i.status === "aborted")
          return T.INVALID;
        o.status === "dirty" && e.dirty(), i.status === "dirty" && e.dirty(), o.value !== "__proto__" && (typeof i.value < "u" || s.alwaysSet) &&
        (n[o.value] = i.value);
      }
      return { status: e.value, value: n };
    }
  };
  T.ParseStatus = qt;
  T.INVALID = Object.freeze({
    status: "aborted"
  });
  var La = /* @__PURE__ */ a((t) => ({ status: "dirty", value: t }), "DIRTY");
  T.DIRTY = La;
  var Ua = /* @__PURE__ */ a((t) => ({ status: "valid", value: t }), "OK");
  T.OK = Ua;
  var $a = /* @__PURE__ */ a((t) => t.status === "aborted", "isAborted");
  T.isAborted = $a;
  var Va = /* @__PURE__ */ a((t) => t.status === "dirty", "isDirty");
  T.isDirty = Va;
  var Fa = /* @__PURE__ */ a((t) => t.status === "valid", "isValid");
  T.isValid = Fa;
  var Ba = /* @__PURE__ */ a((t) => typeof Promise < "u" && t instanceof Promise, "isAsync");
  T.isAsync = Ba;
});

// ../node_modules/zod/lib/helpers/typeAliases.js
var bn = I((gn) => {
  "use strict";
  Object.defineProperty(gn, "__esModule", { value: !0 });
});

// ../node_modules/zod/lib/helpers/errorUtil.js
var vn = I((ot) => {
  "use strict";
  Object.defineProperty(ot, "__esModule", { value: !0 });
  ot.errorUtil = void 0;
  var xn;
  (function(t) {
    t.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, t.toString = (e) => typeof e == "string" ? e : e?.message;
  })(xn || (ot.errorUtil = xn = {}));
});

// ../node_modules/zod/lib/types.js
var Rn = I((d) => {
  "use strict";
  var it = d && d.__classPrivateFieldGet || function(t, e, r, n) {
    if (r === "a" && !n) throw new TypeError("Private accessor was defined without a getter");
    if (typeof e == "function" ? t !== e || !n : !e.has(t)) throw new TypeError("Cannot read private member from an object whose class did n\
ot declare it");
    return r === "m" ? n : r === "a" ? n.call(t) : n ? n.value : e.get(t);
  }, wn = d && d.__classPrivateFieldSet || function(t, e, r, n, s) {
    if (n === "m") throw new TypeError("Private method is not writable");
    if (n === "a" && !s) throw new TypeError("Private accessor was defined without a setter");
    if (typeof e == "function" ? t !== e || !s : !e.has(t)) throw new TypeError("Cannot write private member to an object whose class did no\
t declare it");
    return n === "a" ? s.call(t, r) : s ? s.value = r : e.set(t, r), r;
  }, Me, De;
  Object.defineProperty(d, "__esModule", { value: !0 });
  d.boolean = d.bigint = d.array = d.any = d.coerce = d.ZodFirstPartyTypeKind = d.late = d.ZodSchema = d.Schema = d.custom = d.ZodReadonly =
  d.ZodPipeline = d.ZodBranded = d.BRAND = d.ZodNaN = d.ZodCatch = d.ZodDefault = d.ZodNullable = d.ZodOptional = d.ZodTransformer = d.ZodEffects =
  d.ZodPromise = d.ZodNativeEnum = d.ZodEnum = d.ZodLiteral = d.ZodLazy = d.ZodFunction = d.ZodSet = d.ZodMap = d.ZodRecord = d.ZodTuple = d.
  ZodIntersection = d.ZodDiscriminatedUnion = d.ZodUnion = d.ZodObject = d.ZodArray = d.ZodVoid = d.ZodNever = d.ZodUnknown = d.ZodAny = d.ZodNull =
  d.ZodUndefined = d.ZodSymbol = d.ZodDate = d.ZodBoolean = d.ZodBigInt = d.ZodNumber = d.ZodString = d.datetimeRegex = d.ZodType = void 0;
  d.NEVER = d.void = d.unknown = d.union = d.undefined = d.tuple = d.transformer = d.symbol = d.string = d.strictObject = d.set = d.record =
  d.promise = d.preprocess = d.pipeline = d.ostring = d.optional = d.onumber = d.oboolean = d.object = d.number = d.nullable = d.null = d.never =
  d.nativeEnum = d.nan = d.map = d.literal = d.lazy = d.intersection = d.instanceof = d.function = d.enum = d.effect = d.discriminatedUnion =
  d.date = void 0;
  var at = st(), y = vn(), u = Jt(), h = Ze(), m = nt(), D = class {
    static {
      a(this, "ParseInputLazyPath");
    }
    constructor(e, r, n, s) {
      this._cachedPath = [], this.parent = e, this.data = r, this._path = n, this._key = s;
    }
    get path() {
      return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.
      push(...this._path, this._key)), this._cachedPath;
    }
  }, _n = /* @__PURE__ */ a((t, e) => {
    if ((0, u.isValid)(e))
      return { success: !0, data: e.value };
    if (!t.common.issues.length)
      throw new Error("Validation failed but no issues detected.");
    return {
      success: !1,
      get error() {
        if (this._error)
          return this._error;
        let r = new m.ZodError(t.common.issues);
        return this._error = r, this._error;
      }
    };
  }, "handleResult");
  function b(t) {
    if (!t)
      return {};
    let { errorMap: e, invalid_type_error: r, required_error: n, description: s } = t;
    if (e && (r || n))
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    return e ? { errorMap: e, description: s } : { errorMap: /* @__PURE__ */ a((i, c) => {
      var l, f;
      let { message: p } = t;
      return i.code === "invalid_enum_value" ? { message: p ?? c.defaultError } : typeof c.data > "u" ? { message: (l = p ?? n) !== null && l !==
      void 0 ? l : c.defaultError } : i.code !== "invalid_type" ? { message: c.defaultError } : { message: (f = p ?? r) !== null && f !== void 0 ?
      f : c.defaultError };
    }, "customMap"), description: s };
  }
  a(b, "processCreateParams");
  var x = class {
    static {
      a(this, "ZodType");
    }
    get description() {
      return this._def.description;
    }
    _getType(e) {
      return (0, h.getParsedType)(e.data);
    }
    _getOrReturnCtx(e, r) {
      return r || {
        common: e.parent.common,
        data: e.data,
        parsedType: (0, h.getParsedType)(e.data),
        schemaErrorMap: this._def.errorMap,
        path: e.path,
        parent: e.parent
      };
    }
    _processInputParams(e) {
      return {
        status: new u.ParseStatus(),
        ctx: {
          common: e.parent.common,
          data: e.data,
          parsedType: (0, h.getParsedType)(e.data),
          schemaErrorMap: this._def.errorMap,
          path: e.path,
          parent: e.parent
        }
      };
    }
    _parseSync(e) {
      let r = this._parse(e);
      if ((0, u.isAsync)(r))
        throw new Error("Synchronous parse encountered promise.");
      return r;
    }
    _parseAsync(e) {
      let r = this._parse(e);
      return Promise.resolve(r);
    }
    parse(e, r) {
      let n = this.safeParse(e, r);
      if (n.success)
        return n.data;
      throw n.error;
    }
    safeParse(e, r) {
      var n;
      let s = {
        common: {
          issues: [],
          async: (n = r?.async) !== null && n !== void 0 ? n : !1,
          contextualErrorMap: r?.errorMap
        },
        path: r?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: (0, h.getParsedType)(e)
      }, o = this._parseSync({ data: e, path: s.path, parent: s });
      return _n(s, o);
    }
    "~validate"(e) {
      var r, n;
      let s = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: (0, h.getParsedType)(e)
      };
      if (!this["~standard"].async)
        try {
          let o = this._parseSync({ data: e, path: [], parent: s });
          return (0, u.isValid)(o) ? {
            value: o.value
          } : {
            issues: s.common.issues
          };
        } catch (o) {
          !((n = (r = o?.message) === null || r === void 0 ? void 0 : r.toLowerCase()) === null || n === void 0) && n.includes("encountered") &&
          (this["~standard"].async = !0), s.common = {
            issues: [],
            async: !0
          };
        }
      return this._parseAsync({ data: e, path: [], parent: s }).then((o) => (0, u.isValid)(o) ? {
        value: o.value
      } : {
        issues: s.common.issues
      });
    }
    async parseAsync(e, r) {
      let n = await this.safeParseAsync(e, r);
      if (n.success)
        return n.data;
      throw n.error;
    }
    async safeParseAsync(e, r) {
      let n = {
        common: {
          issues: [],
          contextualErrorMap: r?.errorMap,
          async: !0
        },
        path: r?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: e,
        parsedType: (0, h.getParsedType)(e)
      }, s = this._parse({ data: e, path: n.path, parent: n }), o = await ((0, u.isAsync)(s) ? s : Promise.resolve(s));
      return _n(n, o);
    }
    refine(e, r) {
      let n = /* @__PURE__ */ a((s) => typeof r == "string" || typeof r > "u" ? { message: r } : typeof r == "function" ? r(s) : r, "getIssu\
eProperties");
      return this._refinement((s, o) => {
        let i = e(s), c = /* @__PURE__ */ a(() => o.addIssue({
          code: m.ZodIssueCode.custom,
          ...n(s)
        }), "setError");
        return typeof Promise < "u" && i instanceof Promise ? i.then((l) => l ? !0 : (c(), !1)) : i ? !0 : (c(), !1);
      });
    }
    refinement(e, r) {
      return this._refinement((n, s) => e(n) ? !0 : (s.addIssue(typeof r == "function" ? r(n, s) : r), !1));
    }
    _refinement(e) {
      return new j({
        schema: this,
        typeName: g.ZodEffects,
        effect: { type: "refinement", refinement: e }
      });
    }
    superRefine(e) {
      return this._refinement(e);
    }
    constructor(e) {
      this.spa = this.safeParseAsync, this._def = e, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync =
      this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.
      bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.
      bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.
      promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(
      this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe =
      this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.
      bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: /* @__PURE__ */ a((r) => this["~validate"](r), "validate")
      };
    }
    optional() {
      return M.create(this, this._def);
    }
    nullable() {
      return F.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return G.create(this);
    }
    promise() {
      return Y.create(this, this._def);
    }
    or(e) {
      return ie.create([this, e], this._def);
    }
    and(e) {
      return ce.create(this, e, this._def);
    }
    transform(e) {
      return new j({
        ...b(this._def),
        schema: this,
        typeName: g.ZodEffects,
        effect: { type: "transform", transform: e }
      });
    }
    default(e) {
      let r = typeof e == "function" ? e : () => e;
      return new pe({
        ...b(this._def),
        innerType: this,
        defaultValue: r,
        typeName: g.ZodDefault
      });
    }
    brand() {
      return new Le({
        typeName: g.ZodBranded,
        type: this,
        ...b(this._def)
      });
    }
    catch(e) {
      let r = typeof e == "function" ? e : () => e;
      return new me({
        ...b(this._def),
        innerType: this,
        catchValue: r,
        typeName: g.ZodCatch
      });
    }
    describe(e) {
      let r = this.constructor;
      return new r({
        ...this._def,
        description: e
      });
    }
    pipe(e) {
      return Ue.create(this, e);
    }
    readonly() {
      return he.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  d.ZodType = x;
  d.Schema = x;
  d.ZodSchema = x;
  var Wa = /^c[^\s-]{8,}$/i, Ga = /^[0-9a-z]+$/, Ka = /^[0-9A-HJKMNP-TV-Z]{26}$/i, za = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  qa = /^[a-z0-9_-]{21}$/i, Ja = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, Ha = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  Ya = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, Xa = "^(\\p{Extended_Pictographic}|\\p{Emoji_Comp\
onent})+$", Ht, Qa = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, ei = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  ti = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  ri = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  ni = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, si = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  kn = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469\
]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", oi = new RegExp(`^${kn}$`);
  function Tn(t) {
    let e = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
    return t.precision ? e = `${e}\\.\\d{${t.precision}}` : t.precision == null && (e = `${e}(\\.\\d+)?`), e;
  }
  a(Tn, "timeRegexSource");
  function ai(t) {
    return new RegExp(`^${Tn(t)}$`);
  }
  a(ai, "timeRegex");
  function In(t) {
    let e = `${kn}T${Tn(t)}`, r = [];
    return r.push(t.local ? "Z?" : "Z"), t.offset && r.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${r.join("|")})`, new RegExp(`^${e}$`);
  }
  a(In, "datetimeRegex");
  d.datetimeRegex = In;
  function ii(t, e) {
    return !!((e === "v4" || !e) && Qa.test(t) || (e === "v6" || !e) && ti.test(t));
  }
  a(ii, "isValidIP");
  function ci(t, e) {
    if (!Ja.test(t))
      return !1;
    try {
      let [r] = t.split("."), n = r.replace(/-/g, "+").replace(/_/g, "/").padEnd(r.length + (4 - r.length % 4) % 4, "="), s = JSON.parse(atob(
      n));
      return !(typeof s != "object" || s === null || !s.typ || !s.alg || e && s.alg !== e);
    } catch {
      return !1;
    }
  }
  a(ci, "isValidJWT");
  function di(t, e) {
    return !!((e === "v4" || !e) && ei.test(t) || (e === "v6" || !e) && ri.test(t));
  }
  a(di, "isValidCidr");
  var J = class t extends x {
    static {
      a(this, "ZodString");
    }
    _parse(e) {
      if (this._def.coerce && (e.data = String(e.data)), this._getType(e) !== h.ZodParsedType.string) {
        let o = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(o, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.string,
          received: o.parsedType
        }), u.INVALID;
      }
      let n = new u.ParseStatus(), s;
      for (let o of this._def.checks)
        if (o.kind === "min")
          e.data.length < o.value && (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            code: m.ZodIssueCode.too_small,
            minimum: o.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: o.message
          }), n.dirty());
        else if (o.kind === "max")
          e.data.length > o.value && (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            code: m.ZodIssueCode.too_big,
            maximum: o.value,
            type: "string",
            inclusive: !0,
            exact: !1,
            message: o.message
          }), n.dirty());
        else if (o.kind === "length") {
          let i = e.data.length > o.value, c = e.data.length < o.value;
          (i || c) && (s = this._getOrReturnCtx(e, s), i ? (0, u.addIssueToContext)(s, {
            code: m.ZodIssueCode.too_big,
            maximum: o.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: o.message
          }) : c && (0, u.addIssueToContext)(s, {
            code: m.ZodIssueCode.too_small,
            minimum: o.value,
            type: "string",
            inclusive: !0,
            exact: !0,
            message: o.message
          }), n.dirty());
        } else if (o.kind === "email")
          Ya.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "email",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "emoji")
          Ht || (Ht = new RegExp(Xa, "u")), Ht.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "emoji",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "uuid")
          za.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "uuid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "nanoid")
          qa.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "nanoid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "cuid")
          Wa.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "cuid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "cuid2")
          Ga.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "cuid2",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "ulid")
          Ka.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "ulid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "url")
          try {
            new URL(e.data);
          } catch {
            s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
              validation: "url",
              code: m.ZodIssueCode.invalid_string,
              message: o.message
            }), n.dirty();
          }
        else o.kind === "regex" ? (o.regex.lastIndex = 0, o.regex.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(
        s, {
          validation: "regex",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty())) : o.kind === "trim" ? e.data = e.data.trim() : o.kind === "includes" ? e.data.includes(o.value, o.position) || (s = this.
        _getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: { includes: o.value, position: o.position },
          message: o.message
        }), n.dirty()) : o.kind === "toLowerCase" ? e.data = e.data.toLowerCase() : o.kind === "toUpperCase" ? e.data = e.data.toUpperCase() :
        o.kind === "startsWith" ? e.data.startsWith(o.value) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: { startsWith: o.value },
          message: o.message
        }), n.dirty()) : o.kind === "endsWith" ? e.data.endsWith(o.value) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: { endsWith: o.value },
          message: o.message
        }), n.dirty()) : o.kind === "datetime" ? In(o).test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: "datetime",
          message: o.message
        }), n.dirty()) : o.kind === "date" ? oi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: "date",
          message: o.message
        }), n.dirty()) : o.kind === "time" ? ai(o).test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: "time",
          message: o.message
        }), n.dirty()) : o.kind === "duration" ? Ha.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "duration",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "ip" ? ii(e.data, o.version) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "ip",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "jwt" ? ci(e.data, o.alg) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "jwt",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "cidr" ? di(e.data, o.version) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "cidr",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "base64" ? ni.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "base64",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "base64url" ? si.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "base64url",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : h.util.assertNever(o);
      return { status: n.value, value: e.data };
    }
    _regex(e, r, n) {
      return this.refinement((s) => e.test(s), {
        validation: r,
        code: m.ZodIssueCode.invalid_string,
        ...y.errorUtil.errToObj(n)
      });
    }
    _addCheck(e) {
      return new t({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    email(e) {
      return this._addCheck({ kind: "email", ...y.errorUtil.errToObj(e) });
    }
    url(e) {
      return this._addCheck({ kind: "url", ...y.errorUtil.errToObj(e) });
    }
    emoji(e) {
      return this._addCheck({ kind: "emoji", ...y.errorUtil.errToObj(e) });
    }
    uuid(e) {
      return this._addCheck({ kind: "uuid", ...y.errorUtil.errToObj(e) });
    }
    nanoid(e) {
      return this._addCheck({ kind: "nanoid", ...y.errorUtil.errToObj(e) });
    }
    cuid(e) {
      return this._addCheck({ kind: "cuid", ...y.errorUtil.errToObj(e) });
    }
    cuid2(e) {
      return this._addCheck({ kind: "cuid2", ...y.errorUtil.errToObj(e) });
    }
    ulid(e) {
      return this._addCheck({ kind: "ulid", ...y.errorUtil.errToObj(e) });
    }
    base64(e) {
      return this._addCheck({ kind: "base64", ...y.errorUtil.errToObj(e) });
    }
    base64url(e) {
      return this._addCheck({
        kind: "base64url",
        ...y.errorUtil.errToObj(e)
      });
    }
    jwt(e) {
      return this._addCheck({ kind: "jwt", ...y.errorUtil.errToObj(e) });
    }
    ip(e) {
      return this._addCheck({ kind: "ip", ...y.errorUtil.errToObj(e) });
    }
    cidr(e) {
      return this._addCheck({ kind: "cidr", ...y.errorUtil.errToObj(e) });
    }
    datetime(e) {
      var r, n;
      return typeof e == "string" ? this._addCheck({
        kind: "datetime",
        precision: null,
        offset: !1,
        local: !1,
        message: e
      }) : this._addCheck({
        kind: "datetime",
        precision: typeof e?.precision > "u" ? null : e?.precision,
        offset: (r = e?.offset) !== null && r !== void 0 ? r : !1,
        local: (n = e?.local) !== null && n !== void 0 ? n : !1,
        ...y.errorUtil.errToObj(e?.message)
      });
    }
    date(e) {
      return this._addCheck({ kind: "date", message: e });
    }
    time(e) {
      return typeof e == "string" ? this._addCheck({
        kind: "time",
        precision: null,
        message: e
      }) : this._addCheck({
        kind: "time",
        precision: typeof e?.precision > "u" ? null : e?.precision,
        ...y.errorUtil.errToObj(e?.message)
      });
    }
    duration(e) {
      return this._addCheck({ kind: "duration", ...y.errorUtil.errToObj(e) });
    }
    regex(e, r) {
      return this._addCheck({
        kind: "regex",
        regex: e,
        ...y.errorUtil.errToObj(r)
      });
    }
    includes(e, r) {
      return this._addCheck({
        kind: "includes",
        value: e,
        position: r?.position,
        ...y.errorUtil.errToObj(r?.message)
      });
    }
    startsWith(e, r) {
      return this._addCheck({
        kind: "startsWith",
        value: e,
        ...y.errorUtil.errToObj(r)
      });
    }
    endsWith(e, r) {
      return this._addCheck({
        kind: "endsWith",
        value: e,
        ...y.errorUtil.errToObj(r)
      });
    }
    min(e, r) {
      return this._addCheck({
        kind: "min",
        value: e,
        ...y.errorUtil.errToObj(r)
      });
    }
    max(e, r) {
      return this._addCheck({
        kind: "max",
        value: e,
        ...y.errorUtil.errToObj(r)
      });
    }
    length(e, r) {
      return this._addCheck({
        kind: "length",
        value: e,
        ...y.errorUtil.errToObj(r)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(e) {
      return this.min(1, y.errorUtil.errToObj(e));
    }
    trim() {
      return new t({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new t({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new t({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((e) => e.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((e) => e.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((e) => e.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((e) => e.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((e) => e.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((e) => e.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((e) => e.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((e) => e.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((e) => e.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((e) => e.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((e) => e.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((e) => e.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((e) => e.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((e) => e.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((e) => e.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((e) => e.kind === "base64url");
    }
    get minLength() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "min" && (e === null || r.value > e) && (e = r.value);
      return e;
    }
    get maxLength() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "max" && (e === null || r.value < e) && (e = r.value);
      return e;
    }
  };
  d.ZodString = J;
  J.create = (t) => {
    var e;
    return new J({
      checks: [],
      typeName: g.ZodString,
      coerce: (e = t?.coerce) !== null && e !== void 0 ? e : !1,
      ...b(t)
    });
  };
  function ui(t, e) {
    let r = (t.toString().split(".")[1] || "").length, n = (e.toString().split(".")[1] || "").length, s = r > n ? r : n, o = parseInt(t.toFixed(
    s).replace(".", "")), i = parseInt(e.toFixed(s).replace(".", ""));
    return o % i / Math.pow(10, s);
  }
  a(ui, "floatSafeRemainder");
  var te = class t extends x {
    static {
      a(this, "ZodNumber");
    }
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
    }
    _parse(e) {
      if (this._def.coerce && (e.data = Number(e.data)), this._getType(e) !== h.ZodParsedType.number) {
        let o = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(o, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.number,
          received: o.parsedType
        }), u.INVALID;
      }
      let n, s = new u.ParseStatus();
      for (let o of this._def.checks)
        o.kind === "int" ? h.util.isInteger(e.data) || (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: "integer",
          received: "float",
          message: o.message
        }), s.dirty()) : o.kind === "min" ? (o.inclusive ? e.data < o.value : e.data <= o.value) && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(
        n, {
          code: m.ZodIssueCode.too_small,
          minimum: o.value,
          type: "number",
          inclusive: o.inclusive,
          exact: !1,
          message: o.message
        }), s.dirty()) : o.kind === "max" ? (o.inclusive ? e.data > o.value : e.data >= o.value) && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(
        n, {
          code: m.ZodIssueCode.too_big,
          maximum: o.value,
          type: "number",
          inclusive: o.inclusive,
          exact: !1,
          message: o.message
        }), s.dirty()) : o.kind === "multipleOf" ? ui(e.data, o.value) !== 0 && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(n,
        {
          code: m.ZodIssueCode.not_multiple_of,
          multipleOf: o.value,
          message: o.message
        }), s.dirty()) : o.kind === "finite" ? Number.isFinite(e.data) || (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.not_finite,
          message: o.message
        }), s.dirty()) : h.util.assertNever(o);
      return { status: s.value, value: e.data };
    }
    gte(e, r) {
      return this.setLimit("min", e, !0, y.errorUtil.toString(r));
    }
    gt(e, r) {
      return this.setLimit("min", e, !1, y.errorUtil.toString(r));
    }
    lte(e, r) {
      return this.setLimit("max", e, !0, y.errorUtil.toString(r));
    }
    lt(e, r) {
      return this.setLimit("max", e, !1, y.errorUtil.toString(r));
    }
    setLimit(e, r, n, s) {
      return new t({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: e,
            value: r,
            inclusive: n,
            message: y.errorUtil.toString(s)
          }
        ]
      });
    }
    _addCheck(e) {
      return new t({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    int(e) {
      return this._addCheck({
        kind: "int",
        message: y.errorUtil.toString(e)
      });
    }
    positive(e) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !1,
        message: y.errorUtil.toString(e)
      });
    }
    negative(e) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !1,
        message: y.errorUtil.toString(e)
      });
    }
    nonpositive(e) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: !0,
        message: y.errorUtil.toString(e)
      });
    }
    nonnegative(e) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: !0,
        message: y.errorUtil.toString(e)
      });
    }
    multipleOf(e, r) {
      return this._addCheck({
        kind: "multipleOf",
        value: e,
        message: y.errorUtil.toString(r)
      });
    }
    finite(e) {
      return this._addCheck({
        kind: "finite",
        message: y.errorUtil.toString(e)
      });
    }
    safe(e) {
      return this._addCheck({
        kind: "min",
        inclusive: !0,
        value: Number.MIN_SAFE_INTEGER,
        message: y.errorUtil.toString(e)
      })._addCheck({
        kind: "max",
        inclusive: !0,
        value: Number.MAX_SAFE_INTEGER,
        message: y.errorUtil.toString(e)
      });
    }
    get minValue() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "min" && (e === null || r.value > e) && (e = r.value);
      return e;
    }
    get maxValue() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "max" && (e === null || r.value < e) && (e = r.value);
      return e;
    }
    get isInt() {
      return !!this._def.checks.find((e) => e.kind === "int" || e.kind === "multipleOf" && h.util.isInteger(e.value));
    }
    get isFinite() {
      let e = null, r = null;
      for (let n of this._def.checks) {
        if (n.kind === "finite" || n.kind === "int" || n.kind === "multipleOf")
          return !0;
        n.kind === "min" ? (r === null || n.value > r) && (r = n.value) : n.kind === "max" && (e === null || n.value < e) && (e = n.value);
      }
      return Number.isFinite(r) && Number.isFinite(e);
    }
  };
  d.ZodNumber = te;
  te.create = (t) => new te({
    checks: [],
    typeName: g.ZodNumber,
    coerce: t?.coerce || !1,
    ...b(t)
  });
  var re = class t extends x {
    static {
      a(this, "ZodBigInt");
    }
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte;
    }
    _parse(e) {
      if (this._def.coerce)
        try {
          e.data = BigInt(e.data);
        } catch {
          return this._getInvalidInput(e);
        }
      if (this._getType(e) !== h.ZodParsedType.bigint)
        return this._getInvalidInput(e);
      let n, s = new u.ParseStatus();
      for (let o of this._def.checks)
        o.kind === "min" ? (o.inclusive ? e.data < o.value : e.data <= o.value) && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(
        n, {
          code: m.ZodIssueCode.too_small,
          type: "bigint",
          minimum: o.value,
          inclusive: o.inclusive,
          message: o.message
        }), s.dirty()) : o.kind === "max" ? (o.inclusive ? e.data > o.value : e.data >= o.value) && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(
        n, {
          code: m.ZodIssueCode.too_big,
          type: "bigint",
          maximum: o.value,
          inclusive: o.inclusive,
          message: o.message
        }), s.dirty()) : o.kind === "multipleOf" ? e.data % o.value !== BigInt(0) && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(
        n, {
          code: m.ZodIssueCode.not_multiple_of,
          multipleOf: o.value,
          message: o.message
        }), s.dirty()) : h.util.assertNever(o);
      return { status: s.value, value: e.data };
    }
    _getInvalidInput(e) {
      let r = this._getOrReturnCtx(e);
      return (0, u.addIssueToContext)(r, {
        code: m.ZodIssueCode.invalid_type,
        expected: h.ZodParsedType.bigint,
        received: r.parsedType
      }), u.INVALID;
    }
    gte(e, r) {
      return this.setLimit("min", e, !0, y.errorUtil.toString(r));
    }
    gt(e, r) {
      return this.setLimit("min", e, !1, y.errorUtil.toString(r));
    }
    lte(e, r) {
      return this.setLimit("max", e, !0, y.errorUtil.toString(r));
    }
    lt(e, r) {
      return this.setLimit("max", e, !1, y.errorUtil.toString(r));
    }
    setLimit(e, r, n, s) {
      return new t({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: e,
            value: r,
            inclusive: n,
            message: y.errorUtil.toString(s)
          }
        ]
      });
    }
    _addCheck(e) {
      return new t({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    positive(e) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !1,
        message: y.errorUtil.toString(e)
      });
    }
    negative(e) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !1,
        message: y.errorUtil.toString(e)
      });
    }
    nonpositive(e) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: !0,
        message: y.errorUtil.toString(e)
      });
    }
    nonnegative(e) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: !0,
        message: y.errorUtil.toString(e)
      });
    }
    multipleOf(e, r) {
      return this._addCheck({
        kind: "multipleOf",
        value: e,
        message: y.errorUtil.toString(r)
      });
    }
    get minValue() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "min" && (e === null || r.value > e) && (e = r.value);
      return e;
    }
    get maxValue() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "max" && (e === null || r.value < e) && (e = r.value);
      return e;
    }
  };
  d.ZodBigInt = re;
  re.create = (t) => {
    var e;
    return new re({
      checks: [],
      typeName: g.ZodBigInt,
      coerce: (e = t?.coerce) !== null && e !== void 0 ? e : !1,
      ...b(t)
    });
  };
  var ne = class extends x {
    static {
      a(this, "ZodBoolean");
    }
    _parse(e) {
      if (this._def.coerce && (e.data = !!e.data), this._getType(e) !== h.ZodParsedType.boolean) {
        let n = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.boolean,
          received: n.parsedType
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
  };
  d.ZodBoolean = ne;
  ne.create = (t) => new ne({
    typeName: g.ZodBoolean,
    coerce: t?.coerce || !1,
    ...b(t)
  });
  var se = class t extends x {
    static {
      a(this, "ZodDate");
    }
    _parse(e) {
      if (this._def.coerce && (e.data = new Date(e.data)), this._getType(e) !== h.ZodParsedType.date) {
        let o = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(o, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.date,
          received: o.parsedType
        }), u.INVALID;
      }
      if (isNaN(e.data.getTime())) {
        let o = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(o, {
          code: m.ZodIssueCode.invalid_date
        }), u.INVALID;
      }
      let n = new u.ParseStatus(), s;
      for (let o of this._def.checks)
        o.kind === "min" ? e.data.getTime() < o.value && (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.too_small,
          message: o.message,
          inclusive: !0,
          exact: !1,
          minimum: o.value,
          type: "date"
        }), n.dirty()) : o.kind === "max" ? e.data.getTime() > o.value && (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.too_big,
          message: o.message,
          inclusive: !0,
          exact: !1,
          maximum: o.value,
          type: "date"
        }), n.dirty()) : h.util.assertNever(o);
      return {
        status: n.value,
        value: new Date(e.data.getTime())
      };
    }
    _addCheck(e) {
      return new t({
        ...this._def,
        checks: [...this._def.checks, e]
      });
    }
    min(e, r) {
      return this._addCheck({
        kind: "min",
        value: e.getTime(),
        message: y.errorUtil.toString(r)
      });
    }
    max(e, r) {
      return this._addCheck({
        kind: "max",
        value: e.getTime(),
        message: y.errorUtil.toString(r)
      });
    }
    get minDate() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "min" && (e === null || r.value > e) && (e = r.value);
      return e != null ? new Date(e) : null;
    }
    get maxDate() {
      let e = null;
      for (let r of this._def.checks)
        r.kind === "max" && (e === null || r.value < e) && (e = r.value);
      return e != null ? new Date(e) : null;
    }
  };
  d.ZodDate = se;
  se.create = (t) => new se({
    checks: [],
    coerce: t?.coerce || !1,
    typeName: g.ZodDate,
    ...b(t)
  });
  var _e = class extends x {
    static {
      a(this, "ZodSymbol");
    }
    _parse(e) {
      if (this._getType(e) !== h.ZodParsedType.symbol) {
        let n = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.symbol,
          received: n.parsedType
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
  };
  d.ZodSymbol = _e;
  _e.create = (t) => new _e({
    typeName: g.ZodSymbol,
    ...b(t)
  });
  var oe = class extends x {
    static {
      a(this, "ZodUndefined");
    }
    _parse(e) {
      if (this._getType(e) !== h.ZodParsedType.undefined) {
        let n = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.undefined,
          received: n.parsedType
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
  };
  d.ZodUndefined = oe;
  oe.create = (t) => new oe({
    typeName: g.ZodUndefined,
    ...b(t)
  });
  var ae = class extends x {
    static {
      a(this, "ZodNull");
    }
    _parse(e) {
      if (this._getType(e) !== h.ZodParsedType.null) {
        let n = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.null,
          received: n.parsedType
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
  };
  d.ZodNull = ae;
  ae.create = (t) => new ae({
    typeName: g.ZodNull,
    ...b(t)
  });
  var H = class extends x {
    static {
      a(this, "ZodAny");
    }
    constructor() {
      super(...arguments), this._any = !0;
    }
    _parse(e) {
      return (0, u.OK)(e.data);
    }
  };
  d.ZodAny = H;
  H.create = (t) => new H({
    typeName: g.ZodAny,
    ...b(t)
  });
  var W = class extends x {
    static {
      a(this, "ZodUnknown");
    }
    constructor() {
      super(...arguments), this._unknown = !0;
    }
    _parse(e) {
      return (0, u.OK)(e.data);
    }
  };
  d.ZodUnknown = W;
  W.create = (t) => new W({
    typeName: g.ZodUnknown,
    ...b(t)
  });
  var U = class extends x {
    static {
      a(this, "ZodNever");
    }
    _parse(e) {
      let r = this._getOrReturnCtx(e);
      return (0, u.addIssueToContext)(r, {
        code: m.ZodIssueCode.invalid_type,
        expected: h.ZodParsedType.never,
        received: r.parsedType
      }), u.INVALID;
    }
  };
  d.ZodNever = U;
  U.create = (t) => new U({
    typeName: g.ZodNever,
    ...b(t)
  });
  var we = class extends x {
    static {
      a(this, "ZodVoid");
    }
    _parse(e) {
      if (this._getType(e) !== h.ZodParsedType.undefined) {
        let n = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.void,
          received: n.parsedType
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
  };
  d.ZodVoid = we;
  we.create = (t) => new we({
    typeName: g.ZodVoid,
    ...b(t)
  });
  var G = class t extends x {
    static {
      a(this, "ZodArray");
    }
    _parse(e) {
      let { ctx: r, status: n } = this._processInputParams(e), s = this._def;
      if (r.parsedType !== h.ZodParsedType.array)
        return (0, u.addIssueToContext)(r, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.array,
          received: r.parsedType
        }), u.INVALID;
      if (s.exactLength !== null) {
        let i = r.data.length > s.exactLength.value, c = r.data.length < s.exactLength.value;
        (i || c) && ((0, u.addIssueToContext)(r, {
          code: i ? m.ZodIssueCode.too_big : m.ZodIssueCode.too_small,
          minimum: c ? s.exactLength.value : void 0,
          maximum: i ? s.exactLength.value : void 0,
          type: "array",
          inclusive: !0,
          exact: !0,
          message: s.exactLength.message
        }), n.dirty());
      }
      if (s.minLength !== null && r.data.length < s.minLength.value && ((0, u.addIssueToContext)(r, {
        code: m.ZodIssueCode.too_small,
        minimum: s.minLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: s.minLength.message
      }), n.dirty()), s.maxLength !== null && r.data.length > s.maxLength.value && ((0, u.addIssueToContext)(r, {
        code: m.ZodIssueCode.too_big,
        maximum: s.maxLength.value,
        type: "array",
        inclusive: !0,
        exact: !1,
        message: s.maxLength.message
      }), n.dirty()), r.common.async)
        return Promise.all([...r.data].map((i, c) => s.type._parseAsync(new D(r, i, r.path, c)))).then((i) => u.ParseStatus.mergeArray(n, i));
      let o = [...r.data].map((i, c) => s.type._parseSync(new D(r, i, r.path, c)));
      return u.ParseStatus.mergeArray(n, o);
    }
    get element() {
      return this._def.type;
    }
    min(e, r) {
      return new t({
        ...this._def,
        minLength: { value: e, message: y.errorUtil.toString(r) }
      });
    }
    max(e, r) {
      return new t({
        ...this._def,
        maxLength: { value: e, message: y.errorUtil.toString(r) }
      });
    }
    length(e, r) {
      return new t({
        ...this._def,
        exactLength: { value: e, message: y.errorUtil.toString(r) }
      });
    }
    nonempty(e) {
      return this.min(1, e);
    }
  };
  d.ZodArray = G;
  G.create = (t, e) => new G({
    type: t,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: g.ZodArray,
    ...b(e)
  });
  function ve(t) {
    if (t instanceof N) {
      let e = {};
      for (let r in t.shape) {
        let n = t.shape[r];
        e[r] = M.create(ve(n));
      }
      return new N({
        ...t._def,
        shape: /* @__PURE__ */ a(() => e, "shape")
      });
    } else return t instanceof G ? new G({
      ...t._def,
      type: ve(t.element)
    }) : t instanceof M ? M.create(ve(t.unwrap())) : t instanceof F ? F.create(ve(t.unwrap())) : t instanceof V ? V.create(t.items.map((e) => ve(
    e))) : t;
  }
  a(ve, "deepPartialify");
  var N = class t extends x {
    static {
      a(this, "ZodObject");
    }
    constructor() {
      super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      let e = this._def.shape(), r = h.util.objectKeys(e);
      return this._cached = { shape: e, keys: r };
    }
    _parse(e) {
      if (this._getType(e) !== h.ZodParsedType.object) {
        let f = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(f, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.object,
          received: f.parsedType
        }), u.INVALID;
      }
      let { status: n, ctx: s } = this._processInputParams(e), { shape: o, keys: i } = this._getCached(), c = [];
      if (!(this._def.catchall instanceof U && this._def.unknownKeys === "strip"))
        for (let f in s.data)
          i.includes(f) || c.push(f);
      let l = [];
      for (let f of i) {
        let p = o[f], v = s.data[f];
        l.push({
          key: { status: "valid", value: f },
          value: p._parse(new D(s, v, s.path, f)),
          alwaysSet: f in s.data
        });
      }
      if (this._def.catchall instanceof U) {
        let f = this._def.unknownKeys;
        if (f === "passthrough")
          for (let p of c)
            l.push({
              key: { status: "valid", value: p },
              value: { status: "valid", value: s.data[p] }
            });
        else if (f === "strict")
          c.length > 0 && ((0, u.addIssueToContext)(s, {
            code: m.ZodIssueCode.unrecognized_keys,
            keys: c
          }), n.dirty());
        else if (f !== "strip")
          throw new Error("Internal ZodObject error: invalid unknownKeys value.");
      } else {
        let f = this._def.catchall;
        for (let p of c) {
          let v = s.data[p];
          l.push({
            key: { status: "valid", value: p },
            value: f._parse(
              new D(s, v, s.path, p)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: p in s.data
          });
        }
      }
      return s.common.async ? Promise.resolve().then(async () => {
        let f = [];
        for (let p of l) {
          let v = await p.key, _ = await p.value;
          f.push({
            key: v,
            value: _,
            alwaysSet: p.alwaysSet
          });
        }
        return f;
      }).then((f) => u.ParseStatus.mergeObjectSync(n, f)) : u.ParseStatus.mergeObjectSync(n, l);
    }
    get shape() {
      return this._def.shape();
    }
    strict(e) {
      return y.errorUtil.errToObj, new t({
        ...this._def,
        unknownKeys: "strict",
        ...e !== void 0 ? {
          errorMap: /* @__PURE__ */ a((r, n) => {
            var s, o, i, c;
            let l = (i = (o = (s = this._def).errorMap) === null || o === void 0 ? void 0 : o.call(s, r, n).message) !== null && i !== void 0 ?
            i : n.defaultError;
            return r.code === "unrecognized_keys" ? {
              message: (c = y.errorUtil.errToObj(e).message) !== null && c !== void 0 ? c : l
            } : {
              message: l
            };
          }, "errorMap")
        } : {}
      });
    }
    strip() {
      return new t({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new t({
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
    extend(e) {
      return new t({
        ...this._def,
        shape: /* @__PURE__ */ a(() => ({
          ...this._def.shape(),
          ...e
        }), "shape")
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(e) {
      return new t({
        unknownKeys: e._def.unknownKeys,
        catchall: e._def.catchall,
        shape: /* @__PURE__ */ a(() => ({
          ...this._def.shape(),
          ...e._def.shape()
        }), "shape"),
        typeName: g.ZodObject
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
    setKey(e, r) {
      return this.augment({ [e]: r });
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
    catchall(e) {
      return new t({
        ...this._def,
        catchall: e
      });
    }
    pick(e) {
      let r = {};
      return h.util.objectKeys(e).forEach((n) => {
        e[n] && this.shape[n] && (r[n] = this.shape[n]);
      }), new t({
        ...this._def,
        shape: /* @__PURE__ */ a(() => r, "shape")
      });
    }
    omit(e) {
      let r = {};
      return h.util.objectKeys(this.shape).forEach((n) => {
        e[n] || (r[n] = this.shape[n]);
      }), new t({
        ...this._def,
        shape: /* @__PURE__ */ a(() => r, "shape")
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return ve(this);
    }
    partial(e) {
      let r = {};
      return h.util.objectKeys(this.shape).forEach((n) => {
        let s = this.shape[n];
        e && !e[n] ? r[n] = s : r[n] = s.optional();
      }), new t({
        ...this._def,
        shape: /* @__PURE__ */ a(() => r, "shape")
      });
    }
    required(e) {
      let r = {};
      return h.util.objectKeys(this.shape).forEach((n) => {
        if (e && !e[n])
          r[n] = this.shape[n];
        else {
          let o = this.shape[n];
          for (; o instanceof M; )
            o = o._def.innerType;
          r[n] = o;
        }
      }), new t({
        ...this._def,
        shape: /* @__PURE__ */ a(() => r, "shape")
      });
    }
    keyof() {
      return Sn(h.util.objectKeys(this.shape));
    }
  };
  d.ZodObject = N;
  N.create = (t, e) => new N({
    shape: /* @__PURE__ */ a(() => t, "shape"),
    unknownKeys: "strip",
    catchall: U.create(),
    typeName: g.ZodObject,
    ...b(e)
  });
  N.strictCreate = (t, e) => new N({
    shape: /* @__PURE__ */ a(() => t, "shape"),
    unknownKeys: "strict",
    catchall: U.create(),
    typeName: g.ZodObject,
    ...b(e)
  });
  N.lazycreate = (t, e) => new N({
    shape: t,
    unknownKeys: "strip",
    catchall: U.create(),
    typeName: g.ZodObject,
    ...b(e)
  });
  var ie = class extends x {
    static {
      a(this, "ZodUnion");
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e), n = this._def.options;
      function s(o) {
        for (let c of o)
          if (c.result.status === "valid")
            return c.result;
        for (let c of o)
          if (c.result.status === "dirty")
            return r.common.issues.push(...c.ctx.common.issues), c.result;
        let i = o.map((c) => new m.ZodError(c.ctx.common.issues));
        return (0, u.addIssueToContext)(r, {
          code: m.ZodIssueCode.invalid_union,
          unionErrors: i
        }), u.INVALID;
      }
      if (a(s, "handleResults"), r.common.async)
        return Promise.all(n.map(async (o) => {
          let i = {
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
              parent: i
            }),
            ctx: i
          };
        })).then(s);
      {
        let o, i = [];
        for (let l of n) {
          let f = {
            ...r,
            common: {
              ...r.common,
              issues: []
            },
            parent: null
          }, p = l._parseSync({
            data: r.data,
            path: r.path,
            parent: f
          });
          if (p.status === "valid")
            return p;
          p.status === "dirty" && !o && (o = { result: p, ctx: f }), f.common.issues.length && i.push(f.common.issues);
        }
        if (o)
          return r.common.issues.push(...o.ctx.common.issues), o.result;
        let c = i.map((l) => new m.ZodError(l));
        return (0, u.addIssueToContext)(r, {
          code: m.ZodIssueCode.invalid_union,
          unionErrors: c
        }), u.INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  d.ZodUnion = ie;
  ie.create = (t, e) => new ie({
    options: t,
    typeName: g.ZodUnion,
    ...b(e)
  });
  var B = /* @__PURE__ */ a((t) => t instanceof de ? B(t.schema) : t instanceof j ? B(t.innerType()) : t instanceof ue ? [t.value] : t instanceof
  le ? t.options : t instanceof fe ? h.util.objectValues(t.enum) : t instanceof pe ? B(t._def.innerType) : t instanceof oe ? [void 0] : t instanceof
  ae ? [null] : t instanceof M ? [void 0, ...B(t.unwrap())] : t instanceof F ? [null, ...B(t.unwrap())] : t instanceof Le || t instanceof he ?
  B(t.unwrap()) : t instanceof me ? B(t._def.innerType) : [], "getDiscriminator"), ct = class t extends x {
    static {
      a(this, "ZodDiscriminatedUnion");
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e);
      if (r.parsedType !== h.ZodParsedType.object)
        return (0, u.addIssueToContext)(r, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.object,
          received: r.parsedType
        }), u.INVALID;
      let n = this.discriminator, s = r.data[n], o = this.optionsMap.get(s);
      return o ? r.common.async ? o._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      }) : o._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      }) : ((0, u.addIssueToContext)(r, {
        code: m.ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [n]
      }), u.INVALID);
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
    static create(e, r, n) {
      let s = /* @__PURE__ */ new Map();
      for (let o of r) {
        let i = B(o.shape[e]);
        if (!i.length)
          throw new Error(`A discriminator value for key \`${e}\` could not be extracted from all schema options`);
        for (let c of i) {
          if (s.has(c))
            throw new Error(`Discriminator property ${String(e)} has duplicate value ${String(c)}`);
          s.set(c, o);
        }
      }
      return new t({
        typeName: g.ZodDiscriminatedUnion,
        discriminator: e,
        options: r,
        optionsMap: s,
        ...b(n)
      });
    }
  };
  d.ZodDiscriminatedUnion = ct;
  function Yt(t, e) {
    let r = (0, h.getParsedType)(t), n = (0, h.getParsedType)(e);
    if (t === e)
      return { valid: !0, data: t };
    if (r === h.ZodParsedType.object && n === h.ZodParsedType.object) {
      let s = h.util.objectKeys(e), o = h.util.objectKeys(t).filter((c) => s.indexOf(c) !== -1), i = { ...t, ...e };
      for (let c of o) {
        let l = Yt(t[c], e[c]);
        if (!l.valid)
          return { valid: !1 };
        i[c] = l.data;
      }
      return { valid: !0, data: i };
    } else if (r === h.ZodParsedType.array && n === h.ZodParsedType.array) {
      if (t.length !== e.length)
        return { valid: !1 };
      let s = [];
      for (let o = 0; o < t.length; o++) {
        let i = t[o], c = e[o], l = Yt(i, c);
        if (!l.valid)
          return { valid: !1 };
        s.push(l.data);
      }
      return { valid: !0, data: s };
    } else return r === h.ZodParsedType.date && n === h.ZodParsedType.date && +t == +e ? { valid: !0, data: t } : { valid: !1 };
  }
  a(Yt, "mergeValues");
  var ce = class extends x {
    static {
      a(this, "ZodIntersection");
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e), s = /* @__PURE__ */ a((o, i) => {
        if ((0, u.isAborted)(o) || (0, u.isAborted)(i))
          return u.INVALID;
        let c = Yt(o.value, i.value);
        return c.valid ? (((0, u.isDirty)(o) || (0, u.isDirty)(i)) && r.dirty(), { status: r.value, value: c.data }) : ((0, u.addIssueToContext)(
        n, {
          code: m.ZodIssueCode.invalid_intersection_types
        }), u.INVALID);
      }, "handleParsed");
      return n.common.async ? Promise.all([
        this._def.left._parseAsync({
          data: n.data,
          path: n.path,
          parent: n
        }),
        this._def.right._parseAsync({
          data: n.data,
          path: n.path,
          parent: n
        })
      ]).then(([o, i]) => s(o, i)) : s(this._def.left._parseSync({
        data: n.data,
        path: n.path,
        parent: n
      }), this._def.right._parseSync({
        data: n.data,
        path: n.path,
        parent: n
      }));
    }
  };
  d.ZodIntersection = ce;
  ce.create = (t, e, r) => new ce({
    left: t,
    right: e,
    typeName: g.ZodIntersection,
    ...b(r)
  });
  var V = class t extends x {
    static {
      a(this, "ZodTuple");
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e);
      if (n.parsedType !== h.ZodParsedType.array)
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.array,
          received: n.parsedType
        }), u.INVALID;
      if (n.data.length < this._def.items.length)
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: "array"
        }), u.INVALID;
      !this._def.rest && n.data.length > this._def.items.length && ((0, u.addIssueToContext)(n, {
        code: m.ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), r.dirty());
      let o = [...n.data].map((i, c) => {
        let l = this._def.items[c] || this._def.rest;
        return l ? l._parse(new D(n, i, n.path, c)) : null;
      }).filter((i) => !!i);
      return n.common.async ? Promise.all(o).then((i) => u.ParseStatus.mergeArray(r, i)) : u.ParseStatus.mergeArray(r, o);
    }
    get items() {
      return this._def.items;
    }
    rest(e) {
      return new t({
        ...this._def,
        rest: e
      });
    }
  };
  d.ZodTuple = V;
  V.create = (t, e) => {
    if (!Array.isArray(t))
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new V({
      items: t,
      typeName: g.ZodTuple,
      rest: null,
      ...b(e)
    });
  };
  var dt = class t extends x {
    static {
      a(this, "ZodRecord");
    }
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e);
      if (n.parsedType !== h.ZodParsedType.object)
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.object,
          received: n.parsedType
        }), u.INVALID;
      let s = [], o = this._def.keyType, i = this._def.valueType;
      for (let c in n.data)
        s.push({
          key: o._parse(new D(n, c, n.path, c)),
          value: i._parse(new D(n, n.data[c], n.path, c)),
          alwaysSet: c in n.data
        });
      return n.common.async ? u.ParseStatus.mergeObjectAsync(r, s) : u.ParseStatus.mergeObjectSync(r, s);
    }
    get element() {
      return this._def.valueType;
    }
    static create(e, r, n) {
      return r instanceof x ? new t({
        keyType: e,
        valueType: r,
        typeName: g.ZodRecord,
        ...b(n)
      }) : new t({
        keyType: J.create(),
        valueType: e,
        typeName: g.ZodRecord,
        ...b(r)
      });
    }
  };
  d.ZodRecord = dt;
  var ke = class extends x {
    static {
      a(this, "ZodMap");
    }
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e);
      if (n.parsedType !== h.ZodParsedType.map)
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.map,
          received: n.parsedType
        }), u.INVALID;
      let s = this._def.keyType, o = this._def.valueType, i = [...n.data.entries()].map(([c, l], f) => ({
        key: s._parse(new D(n, c, n.path, [f, "key"])),
        value: o._parse(new D(n, l, n.path, [f, "value"]))
      }));
      if (n.common.async) {
        let c = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (let l of i) {
            let f = await l.key, p = await l.value;
            if (f.status === "aborted" || p.status === "aborted")
              return u.INVALID;
            (f.status === "dirty" || p.status === "dirty") && r.dirty(), c.set(f.value, p.value);
          }
          return { status: r.value, value: c };
        });
      } else {
        let c = /* @__PURE__ */ new Map();
        for (let l of i) {
          let f = l.key, p = l.value;
          if (f.status === "aborted" || p.status === "aborted")
            return u.INVALID;
          (f.status === "dirty" || p.status === "dirty") && r.dirty(), c.set(f.value, p.value);
        }
        return { status: r.value, value: c };
      }
    }
  };
  d.ZodMap = ke;
  ke.create = (t, e, r) => new ke({
    valueType: e,
    keyType: t,
    typeName: g.ZodMap,
    ...b(r)
  });
  var Te = class t extends x {
    static {
      a(this, "ZodSet");
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e);
      if (n.parsedType !== h.ZodParsedType.set)
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.set,
          received: n.parsedType
        }), u.INVALID;
      let s = this._def;
      s.minSize !== null && n.data.size < s.minSize.value && ((0, u.addIssueToContext)(n, {
        code: m.ZodIssueCode.too_small,
        minimum: s.minSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: s.minSize.message
      }), r.dirty()), s.maxSize !== null && n.data.size > s.maxSize.value && ((0, u.addIssueToContext)(n, {
        code: m.ZodIssueCode.too_big,
        maximum: s.maxSize.value,
        type: "set",
        inclusive: !0,
        exact: !1,
        message: s.maxSize.message
      }), r.dirty());
      let o = this._def.valueType;
      function i(l) {
        let f = /* @__PURE__ */ new Set();
        for (let p of l) {
          if (p.status === "aborted")
            return u.INVALID;
          p.status === "dirty" && r.dirty(), f.add(p.value);
        }
        return { status: r.value, value: f };
      }
      a(i, "finalizeSet");
      let c = [...n.data.values()].map((l, f) => o._parse(new D(n, l, n.path, f)));
      return n.common.async ? Promise.all(c).then((l) => i(l)) : i(c);
    }
    min(e, r) {
      return new t({
        ...this._def,
        minSize: { value: e, message: y.errorUtil.toString(r) }
      });
    }
    max(e, r) {
      return new t({
        ...this._def,
        maxSize: { value: e, message: y.errorUtil.toString(r) }
      });
    }
    size(e, r) {
      return this.min(e, r).max(e, r);
    }
    nonempty(e) {
      return this.min(1, e);
    }
  };
  d.ZodSet = Te;
  Te.create = (t, e) => new Te({
    valueType: t,
    minSize: null,
    maxSize: null,
    typeName: g.ZodSet,
    ...b(e)
  });
  var ut = class t extends x {
    static {
      a(this, "ZodFunction");
    }
    constructor() {
      super(...arguments), this.validate = this.implement;
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e);
      if (r.parsedType !== h.ZodParsedType.function)
        return (0, u.addIssueToContext)(r, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.function,
          received: r.parsedType
        }), u.INVALID;
      function n(c, l) {
        return (0, u.makeIssue)({
          data: c,
          path: r.path,
          errorMaps: [
            r.common.contextualErrorMap,
            r.schemaErrorMap,
            (0, at.getErrorMap)(),
            at.defaultErrorMap
          ].filter((f) => !!f),
          issueData: {
            code: m.ZodIssueCode.invalid_arguments,
            argumentsError: l
          }
        });
      }
      a(n, "makeArgsIssue");
      function s(c, l) {
        return (0, u.makeIssue)({
          data: c,
          path: r.path,
          errorMaps: [
            r.common.contextualErrorMap,
            r.schemaErrorMap,
            (0, at.getErrorMap)(),
            at.defaultErrorMap
          ].filter((f) => !!f),
          issueData: {
            code: m.ZodIssueCode.invalid_return_type,
            returnTypeError: l
          }
        });
      }
      a(s, "makeReturnsIssue");
      let o = { errorMap: r.common.contextualErrorMap }, i = r.data;
      if (this._def.returns instanceof Y) {
        let c = this;
        return (0, u.OK)(async function(...l) {
          let f = new m.ZodError([]), p = await c._def.args.parseAsync(l, o).catch((k) => {
            throw f.addIssue(n(l, k)), f;
          }), v = await Reflect.apply(i, this, p);
          return await c._def.returns._def.type.parseAsync(v, o).catch((k) => {
            throw f.addIssue(s(v, k)), f;
          });
        });
      } else {
        let c = this;
        return (0, u.OK)(function(...l) {
          let f = c._def.args.safeParse(l, o);
          if (!f.success)
            throw new m.ZodError([n(l, f.error)]);
          let p = Reflect.apply(i, this, f.data), v = c._def.returns.safeParse(p, o);
          if (!v.success)
            throw new m.ZodError([s(p, v.error)]);
          return v.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...e) {
      return new t({
        ...this._def,
        args: V.create(e).rest(W.create())
      });
    }
    returns(e) {
      return new t({
        ...this._def,
        returns: e
      });
    }
    implement(e) {
      return this.parse(e);
    }
    strictImplement(e) {
      return this.parse(e);
    }
    static create(e, r, n) {
      return new t({
        args: e || V.create([]).rest(W.create()),
        returns: r || W.create(),
        typeName: g.ZodFunction,
        ...b(n)
      });
    }
  };
  d.ZodFunction = ut;
  var de = class extends x {
    static {
      a(this, "ZodLazy");
    }
    get schema() {
      return this._def.getter();
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e);
      return this._def.getter()._parse({ data: r.data, path: r.path, parent: r });
    }
  };
  d.ZodLazy = de;
  de.create = (t, e) => new de({
    getter: t,
    typeName: g.ZodLazy,
    ...b(e)
  });
  var ue = class extends x {
    static {
      a(this, "ZodLiteral");
    }
    _parse(e) {
      if (e.data !== this._def.value) {
        let r = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(r, {
          received: r.data,
          code: m.ZodIssueCode.invalid_literal,
          expected: this._def.value
        }), u.INVALID;
      }
      return { status: "valid", value: e.data };
    }
    get value() {
      return this._def.value;
    }
  };
  d.ZodLiteral = ue;
  ue.create = (t, e) => new ue({
    value: t,
    typeName: g.ZodLiteral,
    ...b(e)
  });
  function Sn(t, e) {
    return new le({
      values: t,
      typeName: g.ZodEnum,
      ...b(e)
    });
  }
  a(Sn, "createZodEnum");
  var le = class t extends x {
    static {
      a(this, "ZodEnum");
    }
    constructor() {
      super(...arguments), Me.set(this, void 0);
    }
    _parse(e) {
      if (typeof e.data != "string") {
        let r = this._getOrReturnCtx(e), n = this._def.values;
        return (0, u.addIssueToContext)(r, {
          expected: h.util.joinValues(n),
          received: r.parsedType,
          code: m.ZodIssueCode.invalid_type
        }), u.INVALID;
      }
      if (it(this, Me, "f") || wn(this, Me, new Set(this._def.values), "f"), !it(this, Me, "f").has(e.data)) {
        let r = this._getOrReturnCtx(e), n = this._def.values;
        return (0, u.addIssueToContext)(r, {
          received: r.data,
          code: m.ZodIssueCode.invalid_enum_value,
          options: n
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      let e = {};
      for (let r of this._def.values)
        e[r] = r;
      return e;
    }
    get Values() {
      let e = {};
      for (let r of this._def.values)
        e[r] = r;
      return e;
    }
    get Enum() {
      let e = {};
      for (let r of this._def.values)
        e[r] = r;
      return e;
    }
    extract(e, r = this._def) {
      return t.create(e, {
        ...this._def,
        ...r
      });
    }
    exclude(e, r = this._def) {
      return t.create(this.options.filter((n) => !e.includes(n)), {
        ...this._def,
        ...r
      });
    }
  };
  d.ZodEnum = le;
  Me = /* @__PURE__ */ new WeakMap();
  le.create = Sn;
  var fe = class extends x {
    static {
      a(this, "ZodNativeEnum");
    }
    constructor() {
      super(...arguments), De.set(this, void 0);
    }
    _parse(e) {
      let r = h.util.getValidEnumValues(this._def.values), n = this._getOrReturnCtx(e);
      if (n.parsedType !== h.ZodParsedType.string && n.parsedType !== h.ZodParsedType.number) {
        let s = h.util.objectValues(r);
        return (0, u.addIssueToContext)(n, {
          expected: h.util.joinValues(s),
          received: n.parsedType,
          code: m.ZodIssueCode.invalid_type
        }), u.INVALID;
      }
      if (it(this, De, "f") || wn(this, De, new Set(h.util.getValidEnumValues(this._def.values)), "f"), !it(this, De, "f").has(e.data)) {
        let s = h.util.objectValues(r);
        return (0, u.addIssueToContext)(n, {
          received: n.data,
          code: m.ZodIssueCode.invalid_enum_value,
          options: s
        }), u.INVALID;
      }
      return (0, u.OK)(e.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  d.ZodNativeEnum = fe;
  De = /* @__PURE__ */ new WeakMap();
  fe.create = (t, e) => new fe({
    values: t,
    typeName: g.ZodNativeEnum,
    ...b(e)
  });
  var Y = class extends x {
    static {
      a(this, "ZodPromise");
    }
    unwrap() {
      return this._def.type;
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e);
      if (r.parsedType !== h.ZodParsedType.promise && r.common.async === !1)
        return (0, u.addIssueToContext)(r, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.promise,
          received: r.parsedType
        }), u.INVALID;
      let n = r.parsedType === h.ZodParsedType.promise ? r.data : Promise.resolve(r.data);
      return (0, u.OK)(n.then((s) => this._def.type.parseAsync(s, {
        path: r.path,
        errorMap: r.common.contextualErrorMap
      })));
    }
  };
  d.ZodPromise = Y;
  Y.create = (t, e) => new Y({
    type: t,
    typeName: g.ZodPromise,
    ...b(e)
  });
  var j = class extends x {
    static {
      a(this, "ZodEffects");
    }
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === g.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e), s = this._def.effect || null, o = {
        addIssue: /* @__PURE__ */ a((i) => {
          (0, u.addIssueToContext)(n, i), i.fatal ? r.abort() : r.dirty();
        }, "addIssue"),
        get path() {
          return n.path;
        }
      };
      if (o.addIssue = o.addIssue.bind(o), s.type === "preprocess") {
        let i = s.transform(n.data, o);
        if (n.common.async)
          return Promise.resolve(i).then(async (c) => {
            if (r.value === "aborted")
              return u.INVALID;
            let l = await this._def.schema._parseAsync({
              data: c,
              path: n.path,
              parent: n
            });
            return l.status === "aborted" ? u.INVALID : l.status === "dirty" || r.value === "dirty" ? (0, u.DIRTY)(l.value) : l;
          });
        {
          if (r.value === "aborted")
            return u.INVALID;
          let c = this._def.schema._parseSync({
            data: i,
            path: n.path,
            parent: n
          });
          return c.status === "aborted" ? u.INVALID : c.status === "dirty" || r.value === "dirty" ? (0, u.DIRTY)(c.value) : c;
        }
      }
      if (s.type === "refinement") {
        let i = /* @__PURE__ */ a((c) => {
          let l = s.refinement(c, o);
          if (n.common.async)
            return Promise.resolve(l);
          if (l instanceof Promise)
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          return c;
        }, "executeRefinement");
        if (n.common.async === !1) {
          let c = this._def.schema._parseSync({
            data: n.data,
            path: n.path,
            parent: n
          });
          return c.status === "aborted" ? u.INVALID : (c.status === "dirty" && r.dirty(), i(c.value), { status: r.value, value: c.value });
        } else
          return this._def.schema._parseAsync({ data: n.data, path: n.path, parent: n }).then((c) => c.status === "aborted" ? u.INVALID : (c.
          status === "dirty" && r.dirty(), i(c.value).then(() => ({ status: r.value, value: c.value }))));
      }
      if (s.type === "transform")
        if (n.common.async === !1) {
          let i = this._def.schema._parseSync({
            data: n.data,
            path: n.path,
            parent: n
          });
          if (!(0, u.isValid)(i))
            return i;
          let c = s.transform(i.value, o);
          if (c instanceof Promise)
            throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
          return { status: r.value, value: c };
        } else
          return this._def.schema._parseAsync({ data: n.data, path: n.path, parent: n }).then((i) => (0, u.isValid)(i) ? Promise.resolve(s.transform(
          i.value, o)).then((c) => ({ status: r.value, value: c })) : i);
      h.util.assertNever(s);
    }
  };
  d.ZodEffects = j;
  d.ZodTransformer = j;
  j.create = (t, e, r) => new j({
    schema: t,
    typeName: g.ZodEffects,
    effect: e,
    ...b(r)
  });
  j.createWithPreprocess = (t, e, r) => new j({
    schema: e,
    effect: { type: "preprocess", transform: t },
    typeName: g.ZodEffects,
    ...b(r)
  });
  var M = class extends x {
    static {
      a(this, "ZodOptional");
    }
    _parse(e) {
      return this._getType(e) === h.ZodParsedType.undefined ? (0, u.OK)(void 0) : this._def.innerType._parse(e);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  d.ZodOptional = M;
  M.create = (t, e) => new M({
    innerType: t,
    typeName: g.ZodOptional,
    ...b(e)
  });
  var F = class extends x {
    static {
      a(this, "ZodNullable");
    }
    _parse(e) {
      return this._getType(e) === h.ZodParsedType.null ? (0, u.OK)(null) : this._def.innerType._parse(e);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  d.ZodNullable = F;
  F.create = (t, e) => new F({
    innerType: t,
    typeName: g.ZodNullable,
    ...b(e)
  });
  var pe = class extends x {
    static {
      a(this, "ZodDefault");
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e), n = r.data;
      return r.parsedType === h.ZodParsedType.undefined && (n = this._def.defaultValue()), this._def.innerType._parse({
        data: n,
        path: r.path,
        parent: r
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  d.ZodDefault = pe;
  pe.create = (t, e) => new pe({
    innerType: t,
    typeName: g.ZodDefault,
    defaultValue: typeof e.default == "function" ? e.default : () => e.default,
    ...b(e)
  });
  var me = class extends x {
    static {
      a(this, "ZodCatch");
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e), n = {
        ...r,
        common: {
          ...r.common,
          issues: []
        }
      }, s = this._def.innerType._parse({
        data: n.data,
        path: n.path,
        parent: {
          ...n
        }
      });
      return (0, u.isAsync)(s) ? s.then((o) => ({
        status: "valid",
        value: o.status === "valid" ? o.value : this._def.catchValue({
          get error() {
            return new m.ZodError(n.common.issues);
          },
          input: n.data
        })
      })) : {
        status: "valid",
        value: s.status === "valid" ? s.value : this._def.catchValue({
          get error() {
            return new m.ZodError(n.common.issues);
          },
          input: n.data
        })
      };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  d.ZodCatch = me;
  me.create = (t, e) => new me({
    innerType: t,
    typeName: g.ZodCatch,
    catchValue: typeof e.catch == "function" ? e.catch : () => e.catch,
    ...b(e)
  });
  var Ie = class extends x {
    static {
      a(this, "ZodNaN");
    }
    _parse(e) {
      if (this._getType(e) !== h.ZodParsedType.nan) {
        let n = this._getOrReturnCtx(e);
        return (0, u.addIssueToContext)(n, {
          code: m.ZodIssueCode.invalid_type,
          expected: h.ZodParsedType.nan,
          received: n.parsedType
        }), u.INVALID;
      }
      return { status: "valid", value: e.data };
    }
  };
  d.ZodNaN = Ie;
  Ie.create = (t) => new Ie({
    typeName: g.ZodNaN,
    ...b(t)
  });
  d.BRAND = Symbol("zod_brand");
  var Le = class extends x {
    static {
      a(this, "ZodBranded");
    }
    _parse(e) {
      let { ctx: r } = this._processInputParams(e), n = r.data;
      return this._def.type._parse({
        data: n,
        path: r.path,
        parent: r
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  d.ZodBranded = Le;
  var Ue = class t extends x {
    static {
      a(this, "ZodPipeline");
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e);
      if (n.common.async)
        return (/* @__PURE__ */ a(async () => {
          let o = await this._def.in._parseAsync({
            data: n.data,
            path: n.path,
            parent: n
          });
          return o.status === "aborted" ? u.INVALID : o.status === "dirty" ? (r.dirty(), (0, u.DIRTY)(o.value)) : this._def.out._parseAsync(
          {
            data: o.value,
            path: n.path,
            parent: n
          });
        }, "handleAsync"))();
      {
        let s = this._def.in._parseSync({
          data: n.data,
          path: n.path,
          parent: n
        });
        return s.status === "aborted" ? u.INVALID : s.status === "dirty" ? (r.dirty(), {
          status: "dirty",
          value: s.value
        }) : this._def.out._parseSync({
          data: s.value,
          path: n.path,
          parent: n
        });
      }
    }
    static create(e, r) {
      return new t({
        in: e,
        out: r,
        typeName: g.ZodPipeline
      });
    }
  };
  d.ZodPipeline = Ue;
  var he = class extends x {
    static {
      a(this, "ZodReadonly");
    }
    _parse(e) {
      let r = this._def.innerType._parse(e), n = /* @__PURE__ */ a((s) => ((0, u.isValid)(s) && (s.value = Object.freeze(s.value)), s), "fre\
eze");
      return (0, u.isAsync)(r) ? r.then((s) => n(s)) : n(r);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  d.ZodReadonly = he;
  he.create = (t, e) => new he({
    innerType: t,
    typeName: g.ZodReadonly,
    ...b(e)
  });
  function En(t, e = {}, r) {
    return t ? H.create().superRefine((n, s) => {
      var o, i;
      if (!t(n)) {
        let c = typeof e == "function" ? e(n) : typeof e == "string" ? { message: e } : e, l = (i = (o = c.fatal) !== null && o !== void 0 ?
        o : r) !== null && i !== void 0 ? i : !0, f = typeof c == "string" ? { message: c } : c;
        s.addIssue({ code: "custom", ...f, fatal: l });
      }
    }) : H.create();
  }
  a(En, "custom");
  d.custom = En;
  d.late = {
    object: N.lazycreate
  };
  var g;
  (function(t) {
    t.ZodString = "ZodString", t.ZodNumber = "ZodNumber", t.ZodNaN = "ZodNaN", t.ZodBigInt = "ZodBigInt", t.ZodBoolean = "ZodBoolean", t.ZodDate =
    "ZodDate", t.ZodSymbol = "ZodSymbol", t.ZodUndefined = "ZodUndefined", t.ZodNull = "ZodNull", t.ZodAny = "ZodAny", t.ZodUnknown = "ZodUn\
known", t.ZodNever = "ZodNever", t.ZodVoid = "ZodVoid", t.ZodArray = "ZodArray", t.ZodObject = "ZodObject", t.ZodUnion = "ZodUnion", t.ZodDiscriminatedUnion =
    "ZodDiscriminatedUnion", t.ZodIntersection = "ZodIntersection", t.ZodTuple = "ZodTuple", t.ZodRecord = "ZodRecord", t.ZodMap = "ZodMap",
    t.ZodSet = "ZodSet", t.ZodFunction = "ZodFunction", t.ZodLazy = "ZodLazy", t.ZodLiteral = "ZodLiteral", t.ZodEnum = "ZodEnum", t.ZodEffects =
    "ZodEffects", t.ZodNativeEnum = "ZodNativeEnum", t.ZodOptional = "ZodOptional", t.ZodNullable = "ZodNullable", t.ZodDefault = "ZodDefaul\
t", t.ZodCatch = "ZodCatch", t.ZodPromise = "ZodPromise", t.ZodBranded = "ZodBranded", t.ZodPipeline = "ZodPipeline", t.ZodReadonly = "ZodRe\
adonly";
  })(g || (d.ZodFirstPartyTypeKind = g = {}));
  var li = /* @__PURE__ */ a((t, e = {
    message: `Input not instance of ${t.name}`
  }) => En((r) => r instanceof t, e), "instanceOfType");
  d.instanceof = li;
  var Cn = J.create;
  d.string = Cn;
  var Pn = te.create;
  d.number = Pn;
  var fi = Ie.create;
  d.nan = fi;
  var pi = re.create;
  d.bigint = pi;
  var An = ne.create;
  d.boolean = An;
  var mi = se.create;
  d.date = mi;
  var hi = _e.create;
  d.symbol = hi;
  var yi = oe.create;
  d.undefined = yi;
  var gi = ae.create;
  d.null = gi;
  var bi = H.create;
  d.any = bi;
  var xi = W.create;
  d.unknown = xi;
  var vi = U.create;
  d.never = vi;
  var _i = we.create;
  d.void = _i;
  var wi = G.create;
  d.array = wi;
  var ki = N.create;
  d.object = ki;
  var Ti = N.strictCreate;
  d.strictObject = Ti;
  var Ii = ie.create;
  d.union = Ii;
  var Si = ct.create;
  d.discriminatedUnion = Si;
  var Ei = ce.create;
  d.intersection = Ei;
  var Ci = V.create;
  d.tuple = Ci;
  var Pi = dt.create;
  d.record = Pi;
  var Ai = ke.create;
  d.map = Ai;
  var Oi = Te.create;
  d.set = Oi;
  var Ri = ut.create;
  d.function = Ri;
  var Ni = de.create;
  d.lazy = Ni;
  var Zi = ue.create;
  d.literal = Zi;
  var ji = le.create;
  d.enum = ji;
  var Mi = fe.create;
  d.nativeEnum = Mi;
  var Di = Y.create;
  d.promise = Di;
  var On = j.create;
  d.effect = On;
  d.transformer = On;
  var Li = M.create;
  d.optional = Li;
  var Ui = F.create;
  d.nullable = Ui;
  var $i = j.createWithPreprocess;
  d.preprocess = $i;
  var Vi = Ue.create;
  d.pipeline = Vi;
  var Fi = /* @__PURE__ */ a(() => Cn().optional(), "ostring");
  d.ostring = Fi;
  var Bi = /* @__PURE__ */ a(() => Pn().optional(), "onumber");
  d.onumber = Bi;
  var Wi = /* @__PURE__ */ a(() => An().optional(), "oboolean");
  d.oboolean = Wi;
  d.coerce = {
    string: /* @__PURE__ */ a((t) => J.create({ ...t, coerce: !0 }), "string"),
    number: /* @__PURE__ */ a((t) => te.create({ ...t, coerce: !0 }), "number"),
    boolean: /* @__PURE__ */ a((t) => ne.create({
      ...t,
      coerce: !0
    }), "boolean"),
    bigint: /* @__PURE__ */ a((t) => re.create({ ...t, coerce: !0 }), "bigint"),
    date: /* @__PURE__ */ a((t) => se.create({ ...t, coerce: !0 }), "date")
  };
  d.NEVER = u.INVALID;
});

// ../node_modules/zod/lib/external.js
var Xt = I((L) => {
  "use strict";
  var Gi = L && L.__createBinding || (Object.create ? function(t, e, r, n) {
    n === void 0 && (n = r);
    var s = Object.getOwnPropertyDescriptor(e, r);
    (!s || ("get" in s ? !e.__esModule : s.writable || s.configurable)) && (s = { enumerable: !0, get: /* @__PURE__ */ a(function() {
      return e[r];
    }, "get") }), Object.defineProperty(t, n, s);
  } : function(t, e, r, n) {
    n === void 0 && (n = r), t[n] = e[r];
  }), Se = L && L.__exportStar || function(t, e) {
    for (var r in t) r !== "default" && !Object.prototype.hasOwnProperty.call(e, r) && Gi(e, t, r);
  };
  Object.defineProperty(L, "__esModule", { value: !0 });
  Se(st(), L);
  Se(Jt(), L);
  Se(bn(), L);
  Se(Ze(), L);
  Se(Rn(), L);
  Se(nt(), L);
});

// ../node_modules/zod/lib/index.js
var jn = I((Z) => {
  "use strict";
  var Nn = Z && Z.__createBinding || (Object.create ? function(t, e, r, n) {
    n === void 0 && (n = r);
    var s = Object.getOwnPropertyDescriptor(e, r);
    (!s || ("get" in s ? !e.__esModule : s.writable || s.configurable)) && (s = { enumerable: !0, get: /* @__PURE__ */ a(function() {
      return e[r];
    }, "get") }), Object.defineProperty(t, n, s);
  } : function(t, e, r, n) {
    n === void 0 && (n = r), t[n] = e[r];
  }), Ki = Z && Z.__setModuleDefault || (Object.create ? function(t, e) {
    Object.defineProperty(t, "default", { enumerable: !0, value: e });
  } : function(t, e) {
    t.default = e;
  }), zi = Z && Z.__importStar || function(t) {
    if (t && t.__esModule) return t;
    var e = {};
    if (t != null) for (var r in t) r !== "default" && Object.prototype.hasOwnProperty.call(t, r) && Nn(e, t, r);
    return Ki(e, t), e;
  }, qi = Z && Z.__exportStar || function(t, e) {
    for (var r in t) r !== "default" && !Object.prototype.hasOwnProperty.call(e, r) && Nn(e, t, r);
  };
  Object.defineProperty(Z, "__esModule", { value: !0 });
  Z.z = void 0;
  var Zn = zi(Xt());
  Z.z = Zn;
  qi(Xt(), Z);
  Z.default = Zn;
});

// ../node_modules/ts-dedent/dist/index.js
var Dn = I(($e) => {
  "use strict";
  Object.defineProperty($e, "__esModule", { value: !0 });
  $e.dedent = void 0;
  function Mn(t) {
    for (var e = [], r = 1; r < arguments.length; r++)
      e[r - 1] = arguments[r];
    var n = Array.from(typeof t == "string" ? [t] : t);
    n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var s = n.reduce(function(c, l) {
      var f = l.match(/\n([\t ]+|(?!\s).)/g);
      return f ? c.concat(f.map(function(p) {
        var v, _;
        return (_ = (v = p.match(/[\t ]/g)) === null || v === void 0 ? void 0 : v.length) !== null && _ !== void 0 ? _ : 0;
      })) : c;
    }, []);
    if (s.length) {
      var o = new RegExp(`
[	 ]{` + Math.min.apply(Math, s) + "}", "g");
      n = n.map(function(c) {
        return c.replace(o, `
`);
      });
    }
    n[0] = n[0].replace(/^\r?\n/, "");
    var i = n[0];
    return e.forEach(function(c, l) {
      var f = i.match(/(?:^|\n)( *)$/), p = f ? f[1] : "", v = c;
      typeof c == "string" && c.includes(`
`) && (v = String(c).split(`
`).map(function(_, k) {
        return k === 0 ? _ : "" + p + _;
      }).join(`
`)), i += v + n[l + 1];
    }), i;
  }
  a(Mn, "dedent");
  $e.dedent = Mn;
  $e.default = Mn;
});

// ../node_modules/isexe/windows.js
var Gn = I((pf, Wn) => {
  Wn.exports = Bn;
  Bn.sync = rc;
  var Vn = A("fs");
  function tc(t, e) {
    var r = e.pathExt !== void 0 ? e.pathExt : process.env.PATHEXT;
    if (!r || (r = r.split(";"), r.indexOf("") !== -1))
      return !0;
    for (var n = 0; n < r.length; n++) {
      var s = r[n].toLowerCase();
      if (s && t.substr(-s.length).toLowerCase() === s)
        return !0;
    }
    return !1;
  }
  a(tc, "checkPathExt");
  function Fn(t, e, r) {
    return !t.isSymbolicLink() && !t.isFile() ? !1 : tc(e, r);
  }
  a(Fn, "checkStat");
  function Bn(t, e, r) {
    Vn.stat(t, function(n, s) {
      r(n, n ? !1 : Fn(s, t, e));
    });
  }
  a(Bn, "isexe");
  function rc(t, e) {
    return Fn(Vn.statSync(t), t, e);
  }
  a(rc, "sync");
});

// ../node_modules/isexe/mode.js
var Hn = I((hf, Jn) => {
  Jn.exports = zn;
  zn.sync = nc;
  var Kn = A("fs");
  function zn(t, e, r) {
    Kn.stat(t, function(n, s) {
      r(n, n ? !1 : qn(s, e));
    });
  }
  a(zn, "isexe");
  function nc(t, e) {
    return qn(Kn.statSync(t), e);
  }
  a(nc, "sync");
  function qn(t, e) {
    return t.isFile() && sc(t, e);
  }
  a(qn, "checkStat");
  function sc(t, e) {
    var r = t.mode, n = t.uid, s = t.gid, o = e.uid !== void 0 ? e.uid : process.getuid && process.getuid(), i = e.gid !== void 0 ? e.gid : process.
    getgid && process.getgid(), c = parseInt("100", 8), l = parseInt("010", 8), f = parseInt("001", 8), p = c | l, v = r & f || r & l && s ===
    i || r & c && n === o || r & p && o === 0;
    return v;
  }
  a(sc, "checkMode");
});

// ../node_modules/isexe/index.js
var Xn = I((bf, Yn) => {
  var gf = A("fs"), mt;
  process.platform === "win32" || global.TESTING_WINDOWS ? mt = Gn() : mt = Hn();
  Yn.exports = er;
  er.sync = oc;
  function er(t, e, r) {
    if (typeof e == "function" && (r = e, e = {}), !r) {
      if (typeof Promise != "function")
        throw new TypeError("callback not provided");
      return new Promise(function(n, s) {
        er(t, e || {}, function(o, i) {
          o ? s(o) : n(i);
        });
      });
    }
    mt(t, e || {}, function(n, s) {
      n && (n.code === "EACCES" || e && e.ignoreErrors) && (n = null, s = !1), r(n, s);
    });
  }
  a(er, "isexe");
  function oc(t, e) {
    try {
      return mt.sync(t, e || {});
    } catch (r) {
      if (e && e.ignoreErrors || r.code === "EACCES")
        return !1;
      throw r;
    }
  }
  a(oc, "sync");
});

// ../node_modules/cross-spawn/node_modules/which/which.js
var os = I((vf, ss) => {
  var Pe = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys", Qn = A("path"), ac = Pe ? ";" :
  ":", es = Xn(), ts = /* @__PURE__ */ a((t) => Object.assign(new Error(`not found: ${t}`), { code: "ENOENT" }), "getNotFoundError"), rs = /* @__PURE__ */ a(
  (t, e) => {
    let r = e.colon || ac, n = t.match(/\//) || Pe && t.match(/\\/) ? [""] : [
      // windows always checks the cwd first
      ...Pe ? [process.cwd()] : [],
      ...(e.path || process.env.PATH || /* istanbul ignore next: very unusual */
      "").split(r)
    ], s = Pe ? e.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "", o = Pe ? s.split(r) : [""];
    return Pe && t.indexOf(".") !== -1 && o[0] !== "" && o.unshift(""), {
      pathEnv: n,
      pathExt: o,
      pathExtExe: s
    };
  }, "getPathInfo"), ns = /* @__PURE__ */ a((t, e, r) => {
    typeof e == "function" && (r = e, e = {}), e || (e = {});
    let { pathEnv: n, pathExt: s, pathExtExe: o } = rs(t, e), i = [], c = /* @__PURE__ */ a((f) => new Promise((p, v) => {
      if (f === n.length)
        return e.all && i.length ? p(i) : v(ts(t));
      let _ = n[f], k = /^".*"$/.test(_) ? _.slice(1, -1) : _, P = Qn.join(k, t), S = !k && /^\.[\\\/]/.test(t) ? t.slice(0, 2) + P : P;
      p(l(S, f, 0));
    }), "step"), l = /* @__PURE__ */ a((f, p, v) => new Promise((_, k) => {
      if (v === s.length)
        return _(c(p + 1));
      let P = s[v];
      es(f + P, { pathExt: o }, (S, C) => {
        if (!S && C)
          if (e.all)
            i.push(f + P);
          else
            return _(f + P);
        return _(l(f, p, v + 1));
      });
    }), "subStep");
    return r ? c(0).then((f) => r(null, f), r) : c(0);
  }, "which"), ic = /* @__PURE__ */ a((t, e) => {
    e = e || {};
    let { pathEnv: r, pathExt: n, pathExtExe: s } = rs(t, e), o = [];
    for (let i = 0; i < r.length; i++) {
      let c = r[i], l = /^".*"$/.test(c) ? c.slice(1, -1) : c, f = Qn.join(l, t), p = !l && /^\.[\\\/]/.test(t) ? t.slice(0, 2) + f : f;
      for (let v = 0; v < n.length; v++) {
        let _ = p + n[v];
        try {
          if (es.sync(_, { pathExt: s }))
            if (e.all)
              o.push(_);
            else
              return _;
        } catch {
        }
      }
    }
    if (e.all && o.length)
      return o;
    if (e.nothrow)
      return null;
    throw ts(t);
  }, "whichSync");
  ss.exports = ns;
  ns.sync = ic;
});

// ../node_modules/path-key/index.js
var is = I((wf, tr) => {
  "use strict";
  var as = /* @__PURE__ */ a((t = {}) => {
    let e = t.env || process.env;
    return (t.platform || process.platform) !== "win32" ? "PATH" : Object.keys(e).reverse().find((n) => n.toUpperCase() === "PATH") || "Path";
  }, "pathKey");
  tr.exports = as;
  tr.exports.default = as;
});

// ../node_modules/cross-spawn/lib/util/resolveCommand.js
var ls = I((Tf, us) => {
  "use strict";
  var cs = A("path"), cc = os(), dc = is();
  function ds(t, e) {
    let r = t.options.env || process.env, n = process.cwd(), s = t.options.cwd != null, o = s && process.chdir !== void 0 && !process.chdir.
    disabled;
    if (o)
      try {
        process.chdir(t.options.cwd);
      } catch {
      }
    let i;
    try {
      i = cc.sync(t.command, {
        path: r[dc({ env: r })],
        pathExt: e ? cs.delimiter : void 0
      });
    } catch {
    } finally {
      o && process.chdir(n);
    }
    return i && (i = cs.resolve(s ? t.options.cwd : "", i)), i;
  }
  a(ds, "resolveCommandAttempt");
  function uc(t) {
    return ds(t) || ds(t, !0);
  }
  a(uc, "resolveCommand");
  us.exports = uc;
});

// ../node_modules/cross-spawn/lib/util/escape.js
var fs = I((Sf, nr) => {
  "use strict";
  var rr = /([()\][%!^"`<>&|;, *?])/g;
  function lc(t) {
    return t = t.replace(rr, "^$1"), t;
  }
  a(lc, "escapeCommand");
  function fc(t, e) {
    return t = `${t}`, t = t.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"'), t = t.replace(/(?=(\\+?)?)\1$/, "$1$1"), t = `"${t}"`, t = t.replace(rr,
    "^$1"), e && (t = t.replace(rr, "^$1")), t;
  }
  a(fc, "escapeArgument");
  nr.exports.command = lc;
  nr.exports.argument = fc;
});

// ../node_modules/shebang-regex/index.js
var ms = I((Cf, ps) => {
  "use strict";
  ps.exports = /^#!(.*)/;
});

// ../node_modules/shebang-command/index.js
var ys = I((Pf, hs) => {
  "use strict";
  var pc = ms();
  hs.exports = (t = "") => {
    let e = t.match(pc);
    if (!e)
      return null;
    let [r, n] = e[0].replace(/#! ?/, "").split(" "), s = r.split("/").pop();
    return s === "env" ? n : n ? `${s} ${n}` : s;
  };
});

// ../node_modules/cross-spawn/lib/util/readShebang.js
var bs = I((Af, gs) => {
  "use strict";
  var sr = A("fs"), mc = ys();
  function hc(t) {
    let r = Buffer.alloc(150), n;
    try {
      n = sr.openSync(t, "r"), sr.readSync(n, r, 0, 150, 0), sr.closeSync(n);
    } catch {
    }
    return mc(r.toString());
  }
  a(hc, "readShebang");
  gs.exports = hc;
});

// ../node_modules/cross-spawn/lib/parse.js
var ws = I((Rf, _s) => {
  "use strict";
  var yc = A("path"), xs = ls(), vs = fs(), gc = bs(), bc = process.platform === "win32", xc = /\.(?:com|exe)$/i, vc = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
  function _c(t) {
    t.file = xs(t);
    let e = t.file && gc(t.file);
    return e ? (t.args.unshift(t.file), t.command = e, xs(t)) : t.file;
  }
  a(_c, "detectShebang");
  function wc(t) {
    if (!bc)
      return t;
    let e = _c(t), r = !xc.test(e);
    if (t.options.forceShell || r) {
      let n = vc.test(e);
      t.command = yc.normalize(t.command), t.command = vs.command(t.command), t.args = t.args.map((o) => vs.argument(o, n));
      let s = [t.command].concat(t.args).join(" ");
      t.args = ["/d", "/s", "/c", `"${s}"`], t.command = process.env.comspec || "cmd.exe", t.options.windowsVerbatimArguments = !0;
    }
    return t;
  }
  a(wc, "parseNonShell");
  function kc(t, e, r) {
    e && !Array.isArray(e) && (r = e, e = null), e = e ? e.slice(0) : [], r = Object.assign({}, r);
    let n = {
      command: t,
      args: e,
      options: r,
      file: void 0,
      original: {
        command: t,
        args: e
      }
    };
    return r.shell ? n : wc(n);
  }
  a(kc, "parse");
  _s.exports = kc;
});

// ../node_modules/cross-spawn/lib/enoent.js
var Is = I((Zf, Ts) => {
  "use strict";
  var or = process.platform === "win32";
  function ar(t, e) {
    return Object.assign(new Error(`${e} ${t.command} ENOENT`), {
      code: "ENOENT",
      errno: "ENOENT",
      syscall: `${e} ${t.command}`,
      path: t.command,
      spawnargs: t.args
    });
  }
  a(ar, "notFoundError");
  function Tc(t, e) {
    if (!or)
      return;
    let r = t.emit;
    t.emit = function(n, s) {
      if (n === "exit") {
        let o = ks(s, e);
        if (o)
          return r.call(t, "error", o);
      }
      return r.apply(t, arguments);
    };
  }
  a(Tc, "hookChildProcess");
  function ks(t, e) {
    return or && t === 1 && !e.file ? ar(e.original, "spawn") : null;
  }
  a(ks, "verifyENOENT");
  function Ic(t, e) {
    return or && t === 1 && !e.file ? ar(e.original, "spawnSync") : null;
  }
  a(Ic, "verifyENOENTSync");
  Ts.exports = {
    hookChildProcess: Tc,
    verifyENOENT: ks,
    verifyENOENTSync: Ic,
    notFoundError: ar
  };
});

// ../node_modules/cross-spawn/index.js
var Cs = I((Mf, Ae) => {
  "use strict";
  var Ss = A("child_process"), ir = ws(), cr = Is();
  function Es(t, e, r) {
    let n = ir(t, e, r), s = Ss.spawn(n.command, n.args, n.options);
    return cr.hookChildProcess(s, n), s;
  }
  a(Es, "spawn");
  function Sc(t, e, r) {
    let n = ir(t, e, r), s = Ss.spawnSync(n.command, n.args, n.options);
    return s.error = s.error || cr.verifyENOENTSync(s.status, n), s;
  }
  a(Sc, "spawnSync");
  Ae.exports = Es;
  Ae.exports.spawn = Es;
  Ae.exports.sync = Sc;
  Ae.exports._parse = ir;
  Ae.exports._enoent = cr;
});

// ../node_modules/merge-stream/index.js
var eo = I((cm, Qs) => {
  "use strict";
  var { PassThrough: kd } = A("stream");
  Qs.exports = function() {
    var t = [], e = new kd({ objectMode: !0 });
    return e.setMaxListeners(0), e.add = r, e.isEmpty = n, e.on("unpipe", s), Array.prototype.slice.call(arguments).forEach(r), e;
    function r(o) {
      return Array.isArray(o) ? (o.forEach(r), this) : (t.push(o), o.once("end", s.bind(null, o)), o.once("error", e.emit.bind(e, "error")),
      o.pipe(e, { end: !1 }), this);
    }
    a(r, "add");
    function n() {
      return t.length == 0;
    }
    a(n, "isEmpty");
    function s(o) {
      t = t.filter(function(i) {
        return i !== o;
      }), !t.length && e.readable && e.end();
    }
    a(s, "remove");
  };
});

// ../node_modules/common-path-prefix/index.js
var Eo = I((sh, So) => {
  "use strict";
  var { sep: Qd } = A("path"), eu = /* @__PURE__ */ a((t) => {
    for (let e of t) {
      let r = /(\/|\\)/.exec(e);
      if (r !== null) return r[0];
    }
    return Qd;
  }, "determineSeparator");
  So.exports = /* @__PURE__ */ a(function(e, r = eu(e)) {
    let [n = "", ...s] = e;
    if (n === "" || s.length === 0) return "";
    let o = n.split(r), i = o.length;
    for (let l of s) {
      let f = l.split(r);
      for (let p = 0; p < i; p++)
        f[p] !== o[p] && (i = p);
      if (i === 0) return "";
    }
    let c = o.slice(0, i).join(r);
    return c.endsWith(r) ? c : c + r;
  }, "commonPathPrefix");
});

// ../node_modules/fetch-retry/index.js
var Yo = I((Rg, Ho) => {
  "use strict";
  Ho.exports = function(t, e) {
    if (e = e || {}, typeof t != "function")
      throw new X("fetch must be a function");
    if (typeof e != "object")
      throw new X("defaults must be an object");
    if (e.retries !== void 0 && !jt(e.retries))
      throw new X("retries must be a positive integer");
    if (e.retryDelay !== void 0 && !jt(e.retryDelay) && typeof e.retryDelay != "function")
      throw new X("retryDelay must be a positive integer or a function returning a positive integer");
    if (e.retryOn !== void 0 && !Array.isArray(e.retryOn) && typeof e.retryOn != "function")
      throw new X("retryOn property expects an array or function");
    var r = {
      retries: 3,
      retryDelay: 1e3,
      retryOn: []
    };
    return e = Object.assign(r, e), /* @__PURE__ */ a(function(s, o) {
      var i = e.retries, c = e.retryDelay, l = e.retryOn;
      if (o && o.retries !== void 0)
        if (jt(o.retries))
          i = o.retries;
        else
          throw new X("retries must be a positive integer");
      if (o && o.retryDelay !== void 0)
        if (jt(o.retryDelay) || typeof o.retryDelay == "function")
          c = o.retryDelay;
        else
          throw new X("retryDelay must be a positive integer or a function returning a positive integer");
      if (o && o.retryOn)
        if (Array.isArray(o.retryOn) || typeof o.retryOn == "function")
          l = o.retryOn;
        else
          throw new X("retryOn property expects an array or function");
      return new Promise(function(f, p) {
        var v = /* @__PURE__ */ a(function(k) {
          var P = typeof Request < "u" && s instanceof Request ? s.clone() : s;
          t(P, o).then(function(S) {
            if (Array.isArray(l) && l.indexOf(S.status) === -1)
              f(S);
            else if (typeof l == "function")
              try {
                return Promise.resolve(l(k, null, S)).then(function(C) {
                  C ? _(k, null, S) : f(S);
                }).catch(p);
              } catch (C) {
                p(C);
              }
            else
              k < i ? _(k, null, S) : f(S);
          }).catch(function(S) {
            if (typeof l == "function")
              try {
                Promise.resolve(l(k, S, null)).then(function(C) {
                  C ? _(k, S, null) : p(S);
                }).catch(function(C) {
                  p(C);
                });
              } catch (C) {
                p(C);
              }
            else k < i ? _(k, S, null) : p(S);
          });
        }, "wrappedFetch");
        function _(k, P, S) {
          var C = typeof c == "function" ? c(k, P, S) : c;
          setTimeout(function() {
            v(++k);
          }, C);
        }
        a(_, "retry"), v(0);
      });
    }, "fetchRetry");
  };
  function jt(t) {
    return Number.isInteger(t) && t >= 0;
  }
  a(jt, "isPositiveInteger");
  function X(t) {
    this.name = "ArgumentError", this.message = t;
  }
  a(X, "ArgumentError");
});

// src/telemetry/index.ts
import { logger as ca } from "@storybook/core/node-logger";

// src/telemetry/notify.ts
var et = z(Yr(), 1);
import { cache as Xr } from "@storybook/core/common";
var Qr = "telemetry-notification-date", xe = console, en = /* @__PURE__ */ a(async () => {
  await Xr.get(Qr, null) || (Xr.set(Qr, Date.now()), xe.log(), xe.log(
    `${et.default.magenta(
      et.default.bold("attention")
    )} => Storybook now collects completely anonymous telemetry regarding usage.`
  ), xe.log("This information is used to shape Storybook's roadmap and prioritize features."), xe.log(
    "You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:"
  ), xe.log(et.default.cyan("https://storybook.js.org/telemetry")), xe.log());
}, "notify");

// src/telemetry/sanitize.ts
import nn from "node:path";
function tn(t) {
  return t.replace(/[-[/{}()*+?.\\^$|]/g, "\\$&");
}
a(tn, "regexpEscape");
function rn(t = "") {
  return t.replace(/\u001B\[[0-9;]*m/g, "");
}
a(rn, "removeAnsiEscapeCodes");
function Ne(t, e = nn.sep) {
  if (!t)
    return t;
  let r = process.cwd().split(e);
  for (; r.length > 1; ) {
    let n = r.join(e), s = new RegExp(tn(n), "gi");
    t = t.replace(s, "$SNIP");
    let o = r.join(e + e), i = new RegExp(tn(o), "gi");
    t = t.replace(i, "$SNIP"), r.pop();
  }
  return t;
}
a(Ne, "cleanPaths");
function tt(t, e = nn.sep) {
  try {
    t = {
      ...JSON.parse(JSON.stringify(t)),
      message: rn(t.message),
      stack: rn(t.stack),
      cause: t.cause,
      name: t.name
    };
    let r = Ne(JSON.stringify(t), e);
    return JSON.parse(r);
  } catch (r) {
    return `Sanitization error: ${r?.message}`;
  }
}
a(tt, "sanitizeError");

// src/telemetry/storybook-metadata.ts
import { dirname as Au } from "node:path";
import {
  getProjectRoot as Ou,
  getStorybookConfiguration as Ru,
  getStorybookInfo as Nu,
  loadMainConfig as Zu,
  versions as ju
} from "@storybook/core/common";
import { readConfig as Mu } from "@storybook/core/csf-tools";

// ../node_modules/fd-package-json/dist/esm/main.js
var an = z(on(), 1);
import { resolve as xa } from "node:path";
import { stat as va, readFile as _a } from "node:fs/promises";
import { statSync as bl, readFileSync as xl } from "node:fs";
async function wa(t) {
  try {
    return (await va(t)).isFile();
  } catch {
    return !1;
  }
}
a(wa, "fileExists");
async function $t(t) {
  for (let e of (0, an.walkUp)(t)) {
    let r = xa(e, "package.json");
    if (await wa(r))
      return r;
  }
  return null;
}
a($t, "findPackagePath");
async function cn(t) {
  let e = await $t(t);
  if (!e)
    return null;
  try {
    let r = await _a(e, { encoding: "utf8" });
    return JSON.parse(r);
  } catch {
    return null;
  }
}
a(cn, "findPackage");

// ../node_modules/package-manager-detector/dist/constants.mjs
var dn = [
  "npm",
  "yarn",
  "yarn@berry",
  "pnpm",
  "pnpm@6",
  "bun",
  "deno"
], Vt = {
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "deno.lock": "deno",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm"
}, Ft = {
  "node_modules/.deno/": "deno",
  "node_modules/.pnpm/": "pnpm",
  "node_modules/.yarn-state.yml": "yarn",
  // yarn v2+ (node-modules)
  "node_modules/.yarn_integrity": "yarn",
  // yarn v1
  "node_modules/.package-lock.json": "npm",
  ".pnp.cjs": "yarn",
  // yarn v3+ (pnp)
  ".pnp.js": "yarn",
  // yarn v2 (pnp)
  "bun.lock": "bun",
  "bun.lockb": "bun"
};

// ../node_modules/package-manager-detector/dist/detect.mjs
import ln from "node:fs/promises";
import Q from "node:path";
import ka from "node:process";
async function Bt(t, e) {
  try {
    let r = await ln.stat(t);
    return e === "file" ? r.isFile() : r.isDirectory();
  } catch {
    return !1;
  }
}
a(Bt, "pathExists");
function* Ta(t = ka.cwd()) {
  let e = Q.resolve(t), { root: r } = Q.parse(e);
  for (; e && e !== r; )
    yield e, e = Q.dirname(e);
}
a(Ta, "lookup");
async function un(t, e) {
  return !t || !Bt(t, "file") ? null : await Sa(t, e);
}
a(un, "parsePackageJson");
async function Wt(t = {}) {
  let { cwd: e, strategies: r = ["lockfile", "packageManager-field", "devEngines-field"], onUnknown: n } = t;
  for (let s of Ta(e))
    for (let o of r)
      switch (o) {
        case "lockfile": {
          for (let i of Object.keys(Vt))
            if (await Bt(Q.join(s, i), "file")) {
              let c = Vt[i], l = await un(Q.join(s, "package.json"), n);
              return l || { name: c, agent: c };
            }
          break;
        }
        case "packageManager-field":
        case "devEngines-field": {
          let i = await un(Q.join(s, "package.json"), n);
          if (i)
            return i;
          break;
        }
        case "install-metadata": {
          for (let i of Object.keys(Ft)) {
            let c = i.endsWith("/") ? "dir" : "file";
            if (await Bt(Q.join(s, i), c)) {
              let l = Ft[i], f = l === "yarn" ? Ea(i) ? "yarn" : "yarn@berry" : l;
              return { name: l, agent: f };
            }
          }
          break;
        }
      }
  return null;
}
a(Wt, "detect");
function Ia(t) {
  let e = /* @__PURE__ */ a((r) => r?.match(/\d+(\.\d+){0,2}/)?.[0] ?? r, "handelVer");
  if (typeof t.packageManager == "string") {
    let [r, n] = t.packageManager.replace(/^\^/, "").split("@");
    return { name: r, ver: e(n) };
  }
  if (typeof t.devEngines?.packageManager?.name == "string")
    return {
      name: t.devEngines.packageManager.name,
      ver: e(t.devEngines.packageManager.version)
    };
}
a(Ia, "getNameAndVer");
async function Sa(t, e) {
  try {
    let r = JSON.parse(await ln.readFile(t, "utf8")), n, s = Ia(r);
    if (s) {
      let o = s.name, i = s.ver, c = i;
      return o === "yarn" && i && Number.parseInt(i) > 1 ? (n = "yarn@berry", c = "berry", { name: o, agent: n, version: c }) : o === "pnpm" &&
      i && Number.parseInt(i) < 7 ? (n = "pnpm@6", { name: o, agent: n, version: c }) : dn.includes(o) ? (n = o, { name: o, agent: n, version: c }) :
      e?.(r.packageManager) ?? null;
    }
  } catch {
  }
  return null;
}
a(Sa, "handlePackageManager");
function Ea(t) {
  return t.endsWith(".yarn_integrity");
}
a(Ea, "isMetadataYarnClassic");

// ../node_modules/package-manager-detector/dist/index.mjs
import "node:fs/promises";
import "node:path";
import "node:process";

// src/cli/globalSettings.ts
var Ce = z(jn(), 1);
import Qt from "node:fs/promises";
import { homedir as Ji } from "node:os";
import { dirname as Hi, join as Yi } from "node:path";

// src/server-errors.ts
var Un = z(Dn(), 1);

// src/storybook-error.ts
function Ln({
  code: t,
  category: e
}) {
  let r = String(t).padStart(4, "0");
  return `SB_${e}_${r}`;
}
a(Ln, "parseErrorCode");
var lt = class t extends Error {
  constructor(r) {
    super(t.getFullMessage(r));
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
    a(this, "StorybookError");
  }
  get fullErrorCode() {
    return Ln({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let r = this.constructor.name;
    return `${this.fullErrorCode} (${r})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: r,
    code: n,
    category: s,
    message: o
  }) {
    let i;
    return r === !0 ? i = `https://storybook.js.org/error/${Ln({ code: n, category: s })}` : typeof r == "string" ? i = r : Array.isArray(r) &&
    (i = `
${r.map((c) => `	- ${c}`).join(`
`)}`), `${o}${i != null ? `

More info: ${i}
` : ""}`;
  }
};

// src/server-errors.ts
var ft = class extends lt {
  constructor(r) {
    super({
      category: "CORE-SERVER",
      code: 1,
      message: Un.dedent`
        Unable to save global settings file to ${r.filePath}
        ${r.error && `Reason: ${r.error}`}`
    });
    this.data = r;
  }
  static {
    a(this, "SavingGlobalSettingsFileError");
  }
};

// src/cli/globalSettings.ts
var Xi = Yi(Ji(), ".storybook", "settings.json"), Qi = 1, ec = Ce.z.object({
  version: Ce.z.number(),
  // NOTE: every key (and subkey) below must be optional, for forwards compatibility reasons
  // (we can remove keys once they are deprecated)
  userSince: Ce.z.number().optional(),
  init: Ce.z.object({ skipOnboarding: Ce.z.boolean().optional() }).optional()
}), Ee;
async function $n(t = Xi) {
  if (Ee)
    return Ee;
  try {
    let e = await Qt.readFile(t, "utf8"), r = ec.parse(JSON.parse(e));
    Ee = new pt(t, r);
  } catch {
    Ee = new pt(t, { version: Qi, userSince: Date.now() }), await Ee.save();
  }
  return Ee;
}
a($n, "globalSettings");
var pt = class {
  static {
    a(this, "Settings");
  }
  /**
   * Create a new Settings instance
   *
   * @param filePath Path to the JSON settings file
   * @param value Loaded value of settings
   */
  constructor(e, r) {
    this.filePath = e, this.value = r;
  }
  /** Save settings to the file */
  async save() {
    try {
      await Qt.mkdir(Hi(this.filePath), { recursive: !0 }), await Qt.writeFile(this.filePath, JSON.stringify(this.value, null, 2));
    } catch (e) {
      throw new ft({
        filePath: this.filePath,
        error: e
      });
    }
  }
};

// src/telemetry/get-application-file-count.ts
import { sep as hu } from "node:path";

// src/telemetry/exec-command-count-lines.ts
import { createInterface as Kd } from "node:readline";

// ../node_modules/execa/index.js
var yo = z(Cs(), 1);
import { Buffer as $d } from "node:buffer";
import Vd from "node:path";
import Nr from "node:child_process";
import Ct from "node:process";

// ../node_modules/strip-final-newline/index.js
function dr(t) {
  let e = typeof t == "string" ? `
` : 10, r = typeof t == "string" ? "\r" : 13;
  return t[t.length - 1] === e && (t = t.slice(0, -1)), t[t.length - 1] === r && (t = t.slice(0, -1)), t;
}
a(dr, "stripFinalNewline");

// ../node_modules/execa/node_modules/npm-run-path/index.js
import yt from "node:process";
import Ve from "node:path";
import Ec from "node:url";

// ../node_modules/execa/node_modules/path-key/index.js
function ht(t = {}) {
  let {
    env: e = process.env,
    platform: r = process.platform
  } = t;
  return r !== "win32" ? "PATH" : Object.keys(e).reverse().find((n) => n.toUpperCase() === "PATH") || "Path";
}
a(ht, "pathKey");

// ../node_modules/execa/node_modules/npm-run-path/index.js
function Cc(t = {}) {
  let {
    cwd: e = yt.cwd(),
    path: r = yt.env[ht()],
    execPath: n = yt.execPath
  } = t, s, o = e instanceof URL ? Ec.fileURLToPath(e) : e, i = Ve.resolve(o), c = [];
  for (; s !== i; )
    c.push(Ve.join(i, "node_modules/.bin")), s = i, i = Ve.resolve(i, "..");
  return c.push(Ve.resolve(o, n, "..")), [...c, r].join(Ve.delimiter);
}
a(Cc, "npmRunPath");
function Ps({ env: t = yt.env, ...e } = {}) {
  t = { ...t };
  let r = ht({ env: t });
  return e.path = t[r], t[r] = Cc(e), t;
}
a(Ps, "npmRunPathEnv");

// ../node_modules/execa/node_modules/mimic-fn/index.js
var Pc = /* @__PURE__ */ a((t, e, r, n) => {
  if (r === "length" || r === "prototype" || r === "arguments" || r === "caller")
    return;
  let s = Object.getOwnPropertyDescriptor(t, r), o = Object.getOwnPropertyDescriptor(e, r);
  !Ac(s, o) && n || Object.defineProperty(t, r, o);
}, "copyProperty"), Ac = /* @__PURE__ */ a(function(t, e) {
  return t === void 0 || t.configurable || t.writable === e.writable && t.enumerable === e.enumerable && t.configurable === e.configurable &&
  (t.writable || t.value === e.value);
}, "canCopyProperty"), Oc = /* @__PURE__ */ a((t, e) => {
  let r = Object.getPrototypeOf(e);
  r !== Object.getPrototypeOf(t) && Object.setPrototypeOf(t, r);
}, "changePrototype"), Rc = /* @__PURE__ */ a((t, e) => `/* Wrapped ${t}*/
${e}`, "wrappedToString"), Nc = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), Zc = Object.getOwnPropertyDescriptor(Function.
prototype.toString, "name"), jc = /* @__PURE__ */ a((t, e, r) => {
  let n = r === "" ? "" : `with ${r.trim()}() `, s = Rc.bind(null, n, e.toString());
  Object.defineProperty(s, "name", Zc), Object.defineProperty(t, "toString", { ...Nc, value: s });
}, "changeToString");
function ur(t, e, { ignoreNonConfigurable: r = !1 } = {}) {
  let { name: n } = t;
  for (let s of Reflect.ownKeys(e))
    Pc(t, e, s, r);
  return Oc(t, e), jc(t, e, n), t;
}
a(ur, "mimicFunction");

// ../node_modules/execa/node_modules/onetime/index.js
var gt = /* @__PURE__ */ new WeakMap(), As = /* @__PURE__ */ a((t, e = {}) => {
  if (typeof t != "function")
    throw new TypeError("Expected a function");
  let r, n = 0, s = t.displayName || t.name || "<anonymous>", o = /* @__PURE__ */ a(function(...i) {
    if (gt.set(o, ++n), n === 1)
      r = t.apply(this, i), t = null;
    else if (e.throw === !0)
      throw new Error(`Function \`${s}\` can only be called once`);
    return r;
  }, "onetime");
  return ur(o, t), gt.set(o, n), o;
}, "onetime");
As.callCount = (t) => {
  if (!gt.has(t))
    throw new Error(`The given function \`${t.name}\` is not wrapped by the \`onetime\` package`);
  return gt.get(t);
};
var Os = As;

// ../node_modules/execa/lib/error.js
import Gc from "node:process";

// ../node_modules/execa/node_modules/human-signals/build/src/main.js
import { constants as Uc } from "node:os";

// ../node_modules/execa/node_modules/human-signals/build/src/realtime.js
var Rs = /* @__PURE__ */ a(() => {
  let t = lr - Ns + 1;
  return Array.from({ length: t }, Mc);
}, "getRealtimeSignals"), Mc = /* @__PURE__ */ a((t, e) => ({
  name: `SIGRT${e + 1}`,
  number: Ns + e,
  action: "terminate",
  description: "Application-specific signal (realtime)",
  standard: "posix"
}), "getRealtimeSignal"), Ns = 34, lr = 64;

// ../node_modules/execa/node_modules/human-signals/build/src/signals.js
import { constants as Dc } from "node:os";

// ../node_modules/execa/node_modules/human-signals/build/src/core.js
var Zs = [
  {
    name: "SIGHUP",
    number: 1,
    action: "terminate",
    description: "Terminal closed",
    standard: "posix"
  },
  {
    name: "SIGINT",
    number: 2,
    action: "terminate",
    description: "User interruption with CTRL-C",
    standard: "ansi"
  },
  {
    name: "SIGQUIT",
    number: 3,
    action: "core",
    description: "User interruption with CTRL-\\",
    standard: "posix"
  },
  {
    name: "SIGILL",
    number: 4,
    action: "core",
    description: "Invalid machine instruction",
    standard: "ansi"
  },
  {
    name: "SIGTRAP",
    number: 5,
    action: "core",
    description: "Debugger breakpoint",
    standard: "posix"
  },
  {
    name: "SIGABRT",
    number: 6,
    action: "core",
    description: "Aborted",
    standard: "ansi"
  },
  {
    name: "SIGIOT",
    number: 6,
    action: "core",
    description: "Aborted",
    standard: "bsd"
  },
  {
    name: "SIGBUS",
    number: 7,
    action: "core",
    description: "Bus error due to misaligned, non-existing address or paging error",
    standard: "bsd"
  },
  {
    name: "SIGEMT",
    number: 7,
    action: "terminate",
    description: "Command should be emulated but is not implemented",
    standard: "other"
  },
  {
    name: "SIGFPE",
    number: 8,
    action: "core",
    description: "Floating point arithmetic error",
    standard: "ansi"
  },
  {
    name: "SIGKILL",
    number: 9,
    action: "terminate",
    description: "Forced termination",
    standard: "posix",
    forced: !0
  },
  {
    name: "SIGUSR1",
    number: 10,
    action: "terminate",
    description: "Application-specific signal",
    standard: "posix"
  },
  {
    name: "SIGSEGV",
    number: 11,
    action: "core",
    description: "Segmentation fault",
    standard: "ansi"
  },
  {
    name: "SIGUSR2",
    number: 12,
    action: "terminate",
    description: "Application-specific signal",
    standard: "posix"
  },
  {
    name: "SIGPIPE",
    number: 13,
    action: "terminate",
    description: "Broken pipe or socket",
    standard: "posix"
  },
  {
    name: "SIGALRM",
    number: 14,
    action: "terminate",
    description: "Timeout or timer",
    standard: "posix"
  },
  {
    name: "SIGTERM",
    number: 15,
    action: "terminate",
    description: "Termination",
    standard: "ansi"
  },
  {
    name: "SIGSTKFLT",
    number: 16,
    action: "terminate",
    description: "Stack is empty or overflowed",
    standard: "other"
  },
  {
    name: "SIGCHLD",
    number: 17,
    action: "ignore",
    description: "Child process terminated, paused or unpaused",
    standard: "posix"
  },
  {
    name: "SIGCLD",
    number: 17,
    action: "ignore",
    description: "Child process terminated, paused or unpaused",
    standard: "other"
  },
  {
    name: "SIGCONT",
    number: 18,
    action: "unpause",
    description: "Unpaused",
    standard: "posix",
    forced: !0
  },
  {
    name: "SIGSTOP",
    number: 19,
    action: "pause",
    description: "Paused",
    standard: "posix",
    forced: !0
  },
  {
    name: "SIGTSTP",
    number: 20,
    action: "pause",
    description: 'Paused using CTRL-Z or "suspend"',
    standard: "posix"
  },
  {
    name: "SIGTTIN",
    number: 21,
    action: "pause",
    description: "Background process cannot read terminal input",
    standard: "posix"
  },
  {
    name: "SIGBREAK",
    number: 21,
    action: "terminate",
    description: "User interruption with CTRL-BREAK",
    standard: "other"
  },
  {
    name: "SIGTTOU",
    number: 22,
    action: "pause",
    description: "Background process cannot write to terminal output",
    standard: "posix"
  },
  {
    name: "SIGURG",
    number: 23,
    action: "ignore",
    description: "Socket received out-of-band data",
    standard: "bsd"
  },
  {
    name: "SIGXCPU",
    number: 24,
    action: "core",
    description: "Process timed out",
    standard: "bsd"
  },
  {
    name: "SIGXFSZ",
    number: 25,
    action: "core",
    description: "File too big",
    standard: "bsd"
  },
  {
    name: "SIGVTALRM",
    number: 26,
    action: "terminate",
    description: "Timeout or timer",
    standard: "bsd"
  },
  {
    name: "SIGPROF",
    number: 27,
    action: "terminate",
    description: "Timeout or timer",
    standard: "bsd"
  },
  {
    name: "SIGWINCH",
    number: 28,
    action: "ignore",
    description: "Terminal window size changed",
    standard: "bsd"
  },
  {
    name: "SIGIO",
    number: 29,
    action: "terminate",
    description: "I/O is available",
    standard: "other"
  },
  {
    name: "SIGPOLL",
    number: 29,
    action: "terminate",
    description: "Watched event",
    standard: "other"
  },
  {
    name: "SIGINFO",
    number: 29,
    action: "ignore",
    description: "Request for process information",
    standard: "other"
  },
  {
    name: "SIGPWR",
    number: 30,
    action: "terminate",
    description: "Device running out of power",
    standard: "systemv"
  },
  {
    name: "SIGSYS",
    number: 31,
    action: "core",
    description: "Invalid system call",
    standard: "other"
  },
  {
    name: "SIGUNUSED",
    number: 31,
    action: "terminate",
    description: "Invalid system call",
    standard: "other"
  }
];

// ../node_modules/execa/node_modules/human-signals/build/src/signals.js
var fr = /* @__PURE__ */ a(() => {
  let t = Rs();
  return [...Zs, ...t].map(Lc);
}, "getSignals"), Lc = /* @__PURE__ */ a(({
  name: t,
  number: e,
  description: r,
  action: n,
  forced: s = !1,
  standard: o
}) => {
  let {
    signals: { [t]: i }
  } = Dc, c = i !== void 0;
  return { name: t, number: c ? i : e, description: r, supported: c, action: n, forced: s, standard: o };
}, "normalizeSignal");

// ../node_modules/execa/node_modules/human-signals/build/src/main.js
var $c = /* @__PURE__ */ a(() => {
  let t = fr();
  return Object.fromEntries(t.map(Vc));
}, "getSignalsByName"), Vc = /* @__PURE__ */ a(({
  name: t,
  number: e,
  description: r,
  supported: n,
  action: s,
  forced: o,
  standard: i
}) => [t, { name: t, number: e, description: r, supported: n, action: s, forced: o, standard: i }], "getSignalByName"), js = $c(), Fc = /* @__PURE__ */ a(
() => {
  let t = fr(), e = lr + 1, r = Array.from(
    { length: e },
    (n, s) => Bc(s, t)
  );
  return Object.assign({}, ...r);
}, "getSignalsByNumber"), Bc = /* @__PURE__ */ a((t, e) => {
  let r = Wc(t, e);
  if (r === void 0)
    return {};
  let { name: n, description: s, supported: o, action: i, forced: c, standard: l } = r;
  return {
    [t]: {
      name: n,
      number: t,
      description: s,
      supported: o,
      action: i,
      forced: c,
      standard: l
    }
  };
}, "getSignalByNumber"), Wc = /* @__PURE__ */ a((t, e) => {
  let r = e.find(({ name: n }) => Uc.signals[n] === t);
  return r !== void 0 ? r : e.find((n) => n.number === t);
}, "findSignalByNumber"), up = Fc();

// ../node_modules/execa/lib/error.js
var Kc = /* @__PURE__ */ a(({ timedOut: t, timeout: e, errorCode: r, signal: n, signalDescription: s, exitCode: o, isCanceled: i }) => t ? `\
timed out after ${e} milliseconds` : i ? "was canceled" : r !== void 0 ? `failed with ${r}` : n !== void 0 ? `was killed with ${n} (${s})` :
o !== void 0 ? `failed with exit code ${o}` : "failed", "getErrorPrefix"), Fe = /* @__PURE__ */ a(({
  stdout: t,
  stderr: e,
  all: r,
  error: n,
  signal: s,
  exitCode: o,
  command: i,
  escapedCommand: c,
  timedOut: l,
  isCanceled: f,
  killed: p,
  parsed: { options: { timeout: v, cwd: _ = Gc.cwd() } }
}) => {
  o = o === null ? void 0 : o, s = s === null ? void 0 : s;
  let k = s === void 0 ? void 0 : js[s].description, P = n && n.code, C = `Command ${Kc({ timedOut: l, timeout: v, errorCode: P, signal: s, signalDescription: k,
  exitCode: o, isCanceled: f })}: ${i}`, Re = Object.prototype.toString.call(n) === "[object Error]", be = Re ? `${C}
${n.message}` : C, K = [be, e, t].filter(Boolean).join(`
`);
  return Re ? (n.originalMessage = n.message, n.message = K) : n = new Error(K), n.shortMessage = be, n.command = i, n.escapedCommand = c, n.
  exitCode = o, n.signal = s, n.signalDescription = k, n.stdout = t, n.stderr = e, n.cwd = _, r !== void 0 && (n.all = r), "bufferedData" in
  n && delete n.bufferedData, n.failed = !0, n.timedOut = !!l, n.isCanceled = f, n.killed = p && !l, n;
}, "makeError");

// ../node_modules/execa/lib/stdio.js
var bt = ["stdin", "stdout", "stderr"], zc = /* @__PURE__ */ a((t) => bt.some((e) => t[e] !== void 0), "hasAlias"), Ms = /* @__PURE__ */ a((t) => {
  if (!t)
    return;
  let { stdio: e } = t;
  if (e === void 0)
    return bt.map((n) => t[n]);
  if (zc(t))
    throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${bt.map((n) => `\`${n}\``).join(", ")}`);
  if (typeof e == "string")
    return e;
  if (!Array.isArray(e))
    throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof e}\``);
  let r = Math.max(e.length, bt.length);
  return Array.from({ length: r }, (n, s) => e[s]);
}, "normalizeStdio");

// ../node_modules/execa/lib/kill.js
import Hc from "node:os";

// ../node_modules/execa/node_modules/signal-exit/dist/mjs/signals.js
var ye = [];
ye.push("SIGHUP", "SIGINT", "SIGTERM");
process.platform !== "win32" && ye.push(
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
process.platform === "linux" && ye.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");

// ../node_modules/execa/node_modules/signal-exit/dist/mjs/index.js
var xt = /* @__PURE__ */ a((t) => !!t && typeof t == "object" && typeof t.removeListener == "function" && typeof t.emit == "function" && typeof t.
reallyExit == "function" && typeof t.listeners == "function" && typeof t.kill == "function" && typeof t.pid == "number" && typeof t.on == "f\
unction", "processOk"), pr = Symbol.for("signal-exit emitter"), mr = globalThis, qc = Object.defineProperty.bind(Object), hr = class {
  static {
    a(this, "Emitter");
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
    if (mr[pr])
      return mr[pr];
    qc(mr, pr, {
      value: this,
      writable: !1,
      enumerable: !1,
      configurable: !1
    });
  }
  on(e, r) {
    this.listeners[e].push(r);
  }
  removeListener(e, r) {
    let n = this.listeners[e], s = n.indexOf(r);
    s !== -1 && (s === 0 && n.length === 1 ? n.length = 0 : n.splice(s, 1));
  }
  emit(e, r, n) {
    if (this.emitted[e])
      return !1;
    this.emitted[e] = !0;
    let s = !1;
    for (let o of this.listeners[e])
      s = o(r, n) === !0 || s;
    return e === "exit" && (s = this.emit("afterExit", r, n) || s), s;
  }
}, vt = class {
  static {
    a(this, "SignalExitBase");
  }
}, Jc = /* @__PURE__ */ a((t) => ({
  onExit(e, r) {
    return t.onExit(e, r);
  },
  load() {
    return t.load();
  },
  unload() {
    return t.unload();
  }
}), "signalExitWrap"), yr = class extends vt {
  static {
    a(this, "SignalExitFallback");
  }
  onExit() {
    return () => {
    };
  }
  load() {
  }
  unload() {
  }
}, gr = class extends vt {
  static {
    a(this, "SignalExit");
  }
  // "SIGHUP" throws an `ENOSYS` error on Windows,
  // so use a supported signal instead
  /* c8 ignore start */
  #a = br.platform === "win32" ? "SIGINT" : "SIGHUP";
  /* c8 ignore stop */
  #t = new hr();
  #e;
  #s;
  #o;
  #n = {};
  #r = !1;
  constructor(e) {
    super(), this.#e = e, this.#n = {};
    for (let r of ye)
      this.#n[r] = () => {
        let n = this.#e.listeners(r), { count: s } = this.#t, o = e;
        if (typeof o.__signal_exit_emitter__ == "object" && typeof o.__signal_exit_emitter__.count == "number" && (s += o.__signal_exit_emitter__.
        count), n.length === s) {
          this.unload();
          let i = this.#t.emit("exit", null, r), c = r === "SIGHUP" ? this.#a : r;
          i || e.kill(e.pid, c);
        }
      };
    this.#o = e.reallyExit, this.#s = e.emit;
  }
  onExit(e, r) {
    if (!xt(this.#e))
      return () => {
      };
    this.#r === !1 && this.load();
    let n = r?.alwaysLast ? "afterExit" : "exit";
    return this.#t.on(n, e), () => {
      this.#t.removeListener(n, e), this.#t.listeners.exit.length === 0 && this.#t.listeners.afterExit.length === 0 && this.unload();
    };
  }
  load() {
    if (!this.#r) {
      this.#r = !0, this.#t.count += 1;
      for (let e of ye)
        try {
          let r = this.#n[e];
          r && this.#e.on(e, r);
        } catch {
        }
      this.#e.emit = (e, ...r) => this.#c(e, ...r), this.#e.reallyExit = (e) => this.#i(e);
    }
  }
  unload() {
    this.#r && (this.#r = !1, ye.forEach((e) => {
      let r = this.#n[e];
      if (!r)
        throw new Error("Listener not defined for signal: " + e);
      try {
        this.#e.removeListener(e, r);
      } catch {
      }
    }), this.#e.emit = this.#s, this.#e.reallyExit = this.#o, this.#t.count -= 1);
  }
  #i(e) {
    return xt(this.#e) ? (this.#e.exitCode = e || 0, this.#t.emit("exit", this.#e.exitCode, null), this.#o.call(this.#e, this.#e.exitCode)) :
    0;
  }
  #c(e, ...r) {
    let n = this.#s;
    if (e === "exit" && xt(this.#e)) {
      typeof r[0] == "number" && (this.#e.exitCode = r[0]);
      let s = n.call(this.#e, e, ...r);
      return this.#t.emit("exit", this.#e.exitCode, null), s;
    } else
      return n.call(this.#e, e, ...r);
  }
}, br = globalThis.process, {
  /**
   * Called when the process is exiting, whether via signal, explicit
   * exit, or running out of stuff to do.
   *
   * If the global process object is not suitable for instrumentation,
   * then this will be a no-op.
   *
   * Returns a function that may be used to unload signal-exit.
   */
  onExit: Ds,
  /**
   * Load the listeners.  Likely you never need to call this, unless
   * doing a rather deep integration with signal-exit functionality.
   * Mostly exposed for the benefit of testing.
   *
   * @internal
   */
  load: _p,
  /**
   * Unload the listeners.  Likely you never need to call this, unless
   * doing a rather deep integration with signal-exit functionality.
   * Mostly exposed for the benefit of testing.
   *
   * @internal
   */
  unload: wp
} = Jc(xt(br) ? new gr(br) : new yr());

// ../node_modules/execa/lib/kill.js
var Yc = 1e3 * 5, Ls = /* @__PURE__ */ a((t, e = "SIGTERM", r = {}) => {
  let n = t(e);
  return Xc(t, e, r, n), n;
}, "spawnedKill"), Xc = /* @__PURE__ */ a((t, e, r, n) => {
  if (!Qc(e, r, n))
    return;
  let s = td(r), o = setTimeout(() => {
    t("SIGKILL");
  }, s);
  o.unref && o.unref();
}, "setKillTimeout"), Qc = /* @__PURE__ */ a((t, { forceKillAfterTimeout: e }, r) => ed(t) && e !== !1 && r, "shouldForceKill"), ed = /* @__PURE__ */ a(
(t) => t === Hc.constants.signals.SIGTERM || typeof t == "string" && t.toUpperCase() === "SIGTERM", "isSigterm"), td = /* @__PURE__ */ a(({ forceKillAfterTimeout: t = !0 }) => {
  if (t === !0)
    return Yc;
  if (!Number.isFinite(t) || t < 0)
    throw new TypeError(`Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${t}\` (${typeof t})`);
  return t;
}, "getForceKillAfterTimeout"), Us = /* @__PURE__ */ a((t, e) => {
  t.kill() && (e.isCanceled = !0);
}, "spawnedCancel"), rd = /* @__PURE__ */ a((t, e, r) => {
  t.kill(e), r(Object.assign(new Error("Timed out"), { timedOut: !0, signal: e }));
}, "timeoutKill"), $s = /* @__PURE__ */ a((t, { timeout: e, killSignal: r = "SIGTERM" }, n) => {
  if (e === 0 || e === void 0)
    return n;
  let s, o = new Promise((c, l) => {
    s = setTimeout(() => {
      rd(t, r, l);
    }, e);
  }), i = n.finally(() => {
    clearTimeout(s);
  });
  return Promise.race([o, i]);
}, "setupTimeout"), Vs = /* @__PURE__ */ a(({ timeout: t }) => {
  if (t !== void 0 && (!Number.isFinite(t) || t < 0))
    throw new TypeError(`Expected the \`timeout\` option to be a non-negative integer, got \`${t}\` (${typeof t})`);
}, "validateTimeout"), Fs = /* @__PURE__ */ a(async (t, { cleanup: e, detached: r }, n) => {
  if (!e || r)
    return n;
  let s = Ds(() => {
    t.kill();
  });
  return n.finally(() => {
    s();
  });
}, "setExitHandler");

// ../node_modules/execa/lib/pipe.js
import { createWriteStream as nd } from "node:fs";
import { ChildProcess as sd } from "node:child_process";

// ../node_modules/execa/node_modules/is-stream/index.js
function _t(t) {
  return t !== null && typeof t == "object" && typeof t.pipe == "function";
}
a(_t, "isStream");
function xr(t) {
  return _t(t) && t.writable !== !1 && typeof t._write == "function" && typeof t._writableState == "object";
}
a(xr, "isWritableStream");

// ../node_modules/execa/lib/pipe.js
var od = /* @__PURE__ */ a((t) => t instanceof sd && typeof t.then == "function", "isExecaChildProcess"), vr = /* @__PURE__ */ a((t, e, r) => {
  if (typeof r == "string")
    return t[e].pipe(nd(r)), t;
  if (xr(r))
    return t[e].pipe(r), t;
  if (!od(r))
    throw new TypeError("The second argument must be a string, a stream or an Execa child process.");
  if (!xr(r.stdin))
    throw new TypeError("The target child process's stdin must be available.");
  return t[e].pipe(r.stdin), r;
}, "pipeToTarget"), Bs = /* @__PURE__ */ a((t) => {
  t.stdout !== null && (t.pipeStdout = vr.bind(void 0, t, "stdout")), t.stderr !== null && (t.pipeStderr = vr.bind(void 0, t, "stderr")), t.
  all !== void 0 && (t.pipeAll = vr.bind(void 0, t, "all"));
}, "addPipeMethods");

// ../node_modules/execa/lib/stream.js
import { createReadStream as Td, readFileSync as Id } from "node:fs";
import { setTimeout as Sd } from "node:timers/promises";

// ../node_modules/execa/node_modules/get-stream/source/contents.js
var Be = /* @__PURE__ */ a(async (t, { init: e, convertChunk: r, getSize: n, truncateChunk: s, addChunk: o, getFinalChunk: i, finalize: c }, {
maxBuffer: l = Number.POSITIVE_INFINITY } = {}) => {
  if (!id(t))
    throw new Error("The first argument must be a Readable, a ReadableStream, or an async iterable.");
  let f = e();
  f.length = 0;
  try {
    for await (let p of t) {
      let v = cd(p), _ = r[v](p, f);
      Ks({ convertedChunk: _, state: f, getSize: n, truncateChunk: s, addChunk: o, maxBuffer: l });
    }
    return ad({ state: f, convertChunk: r, getSize: n, truncateChunk: s, addChunk: o, getFinalChunk: i, maxBuffer: l }), c(f);
  } catch (p) {
    throw p.bufferedData = c(f), p;
  }
}, "getStreamContents"), ad = /* @__PURE__ */ a(({ state: t, getSize: e, truncateChunk: r, addChunk: n, getFinalChunk: s, maxBuffer: o }) => {
  let i = s(t);
  i !== void 0 && Ks({ convertedChunk: i, state: t, getSize: e, truncateChunk: r, addChunk: n, maxBuffer: o });
}, "appendFinalChunk"), Ks = /* @__PURE__ */ a(({ convertedChunk: t, state: e, getSize: r, truncateChunk: n, addChunk: s, maxBuffer: o }) => {
  let i = r(t), c = e.length + i;
  if (c <= o) {
    Ws(t, e, s, c);
    return;
  }
  let l = n(t, o - e.length);
  throw l !== void 0 && Ws(l, e, s, o), new wt();
}, "appendChunk"), Ws = /* @__PURE__ */ a((t, e, r, n) => {
  e.contents = r(t, e, n), e.length = n;
}, "addNewChunk"), id = /* @__PURE__ */ a((t) => typeof t == "object" && t !== null && typeof t[Symbol.asyncIterator] == "function", "isAsyn\
cIterable"), cd = /* @__PURE__ */ a((t) => {
  let e = typeof t;
  if (e === "string")
    return "string";
  if (e !== "object" || t === null)
    return "others";
  if (globalThis.Buffer?.isBuffer(t))
    return "buffer";
  let r = Gs.call(t);
  return r === "[object ArrayBuffer]" ? "arrayBuffer" : r === "[object DataView]" ? "dataView" : Number.isInteger(t.byteLength) && Number.isInteger(
  t.byteOffset) && Gs.call(t.buffer) === "[object ArrayBuffer]" ? "typedArray" : "others";
}, "getChunkType"), { toString: Gs } = Object.prototype, wt = class extends Error {
  static {
    a(this, "MaxBufferError");
  }
  name = "MaxBufferError";
  constructor() {
    super("maxBuffer exceeded");
  }
};

// ../node_modules/execa/node_modules/get-stream/source/utils.js
var _r = /* @__PURE__ */ a((t) => t, "identity"), wr = /* @__PURE__ */ a(() => {
}, "noop"), kr = /* @__PURE__ */ a(({ contents: t }) => t, "getContentsProp"), kt = /* @__PURE__ */ a((t) => {
  throw new Error(`Streams in object mode are not supported: ${String(t)}`);
}, "throwObjectStream"), Tt = /* @__PURE__ */ a((t) => t.length, "getLengthProp");

// ../node_modules/execa/node_modules/get-stream/source/array-buffer.js
async function Tr(t, e) {
  return Be(t, gd, e);
}
a(Tr, "getStreamAsArrayBuffer");
var dd = /* @__PURE__ */ a(() => ({ contents: new ArrayBuffer(0) }), "initArrayBuffer"), ud = /* @__PURE__ */ a((t) => ld.encode(t), "useTex\
tEncoder"), ld = new TextEncoder(), zs = /* @__PURE__ */ a((t) => new Uint8Array(t), "useUint8Array"), qs = /* @__PURE__ */ a((t) => new Uint8Array(
t.buffer, t.byteOffset, t.byteLength), "useUint8ArrayWithOffset"), fd = /* @__PURE__ */ a((t, e) => t.slice(0, e), "truncateArrayBufferChunk"),
pd = /* @__PURE__ */ a((t, { contents: e, length: r }, n) => {
  let s = Ys() ? hd(e, n) : md(e, n);
  return new Uint8Array(s).set(t, r), s;
}, "addArrayBufferChunk"), md = /* @__PURE__ */ a((t, e) => {
  if (e <= t.byteLength)
    return t;
  let r = new ArrayBuffer(Hs(e));
  return new Uint8Array(r).set(new Uint8Array(t), 0), r;
}, "resizeArrayBufferSlow"), hd = /* @__PURE__ */ a((t, e) => {
  if (e <= t.maxByteLength)
    return t.resize(e), t;
  let r = new ArrayBuffer(e, { maxByteLength: Hs(e) });
  return new Uint8Array(r).set(new Uint8Array(t), 0), r;
}, "resizeArrayBuffer"), Hs = /* @__PURE__ */ a((t) => Js ** Math.ceil(Math.log(t) / Math.log(Js)), "getNewContentsLength"), Js = 2, yd = /* @__PURE__ */ a(
({ contents: t, length: e }) => Ys() ? t : t.slice(0, e), "finalizeArrayBuffer"), Ys = /* @__PURE__ */ a(() => "resize" in ArrayBuffer.prototype,
"hasArrayBufferResize"), gd = {
  init: dd,
  convertChunk: {
    string: ud,
    buffer: zs,
    arrayBuffer: zs,
    dataView: qs,
    typedArray: qs,
    others: kt
  },
  getSize: Tt,
  truncateChunk: fd,
  addChunk: pd,
  getFinalChunk: wr,
  finalize: yd
};

// ../node_modules/execa/node_modules/get-stream/source/buffer.js
async function It(t, e) {
  if (!("Buffer" in globalThis))
    throw new Error("getStreamAsBuffer() is only supported in Node.js");
  try {
    return Xs(await Tr(t, e));
  } catch (r) {
    throw r.bufferedData !== void 0 && (r.bufferedData = Xs(r.bufferedData)), r;
  }
}
a(It, "getStreamAsBuffer");
var Xs = /* @__PURE__ */ a((t) => globalThis.Buffer.from(t), "arrayBufferToNodeBuffer");

// ../node_modules/execa/node_modules/get-stream/source/string.js
async function Ir(t, e) {
  return Be(t, wd, e);
}
a(Ir, "getStreamAsString");
var bd = /* @__PURE__ */ a(() => ({ contents: "", textDecoder: new TextDecoder() }), "initString"), St = /* @__PURE__ */ a((t, { textDecoder: e }) => e.
decode(t, { stream: !0 }), "useTextDecoder"), xd = /* @__PURE__ */ a((t, { contents: e }) => e + t, "addStringChunk"), vd = /* @__PURE__ */ a(
(t, e) => t.slice(0, e), "truncateStringChunk"), _d = /* @__PURE__ */ a(({ textDecoder: t }) => {
  let e = t.decode();
  return e === "" ? void 0 : e;
}, "getFinalStringChunk"), wd = {
  init: bd,
  convertChunk: {
    string: _r,
    buffer: St,
    arrayBuffer: St,
    dataView: St,
    typedArray: St,
    others: kt
  },
  getSize: Tt,
  truncateChunk: vd,
  addChunk: xd,
  getFinalChunk: _d,
  finalize: kr
};

// ../node_modules/execa/lib/stream.js
var to = z(eo(), 1);
var ro = /* @__PURE__ */ a((t) => {
  if (t !== void 0)
    throw new TypeError("The `input` and `inputFile` options cannot be both set.");
}, "validateInputOptions"), Ed = /* @__PURE__ */ a(({ input: t, inputFile: e }) => typeof e != "string" ? t : (ro(t), Id(e)), "getInputSync"),
no = /* @__PURE__ */ a((t) => {
  let e = Ed(t);
  if (_t(e))
    throw new TypeError("The `input` option cannot be a stream in sync mode");
  return e;
}, "handleInputSync"), Cd = /* @__PURE__ */ a(({ input: t, inputFile: e }) => typeof e != "string" ? t : (ro(t), Td(e)), "getInput"), so = /* @__PURE__ */ a(
(t, e) => {
  let r = Cd(e);
  r !== void 0 && (_t(r) ? r.pipe(t.stdin) : t.stdin.end(r));
}, "handleInput"), oo = /* @__PURE__ */ a((t, { all: e }) => {
  if (!e || !t.stdout && !t.stderr)
    return;
  let r = (0, to.default)();
  return t.stdout && r.add(t.stdout), t.stderr && r.add(t.stderr), r;
}, "makeAllStream"), Sr = /* @__PURE__ */ a(async (t, e) => {
  if (!(!t || e === void 0)) {
    await Sd(0), t.destroy();
    try {
      return await e;
    } catch (r) {
      return r.bufferedData;
    }
  }
}, "getBufferedData"), Er = /* @__PURE__ */ a((t, { encoding: e, buffer: r, maxBuffer: n }) => {
  if (!(!t || !r))
    return e === "utf8" || e === "utf-8" ? Ir(t, { maxBuffer: n }) : e === null || e === "buffer" ? It(t, { maxBuffer: n }) : Pd(t, n, e);
}, "getStreamPromise"), Pd = /* @__PURE__ */ a(async (t, e, r) => (await It(t, { maxBuffer: e })).toString(r), "applyEncoding"), ao = /* @__PURE__ */ a(
async ({ stdout: t, stderr: e, all: r }, { encoding: n, buffer: s, maxBuffer: o }, i) => {
  let c = Er(t, { encoding: n, buffer: s, maxBuffer: o }), l = Er(e, { encoding: n, buffer: s, maxBuffer: o }), f = Er(r, { encoding: n, buffer: s,
  maxBuffer: o * 2 });
  try {
    return await Promise.all([i, c, l, f]);
  } catch (p) {
    return Promise.all([
      { error: p, signal: p.signal, timedOut: p.timedOut },
      Sr(t, c),
      Sr(e, l),
      Sr(r, f)
    ]);
  }
}, "getSpawnedResult");

// ../node_modules/execa/lib/promise.js
var Ad = (async () => {
})().constructor.prototype, Od = ["then", "catch", "finally"].map((t) => [
  t,
  Reflect.getOwnPropertyDescriptor(Ad, t)
]), Cr = /* @__PURE__ */ a((t, e) => {
  for (let [r, n] of Od) {
    let s = typeof e == "function" ? (...o) => Reflect.apply(n.value, e(), o) : n.value.bind(e);
    Reflect.defineProperty(t, r, { ...n, value: s });
  }
}, "mergePromise"), io = /* @__PURE__ */ a((t) => new Promise((e, r) => {
  t.on("exit", (n, s) => {
    e({ exitCode: n, signal: s });
  }), t.on("error", (n) => {
    r(n);
  }), t.stdin && t.stdin.on("error", (n) => {
    r(n);
  });
}), "getSpawnedPromise");

// ../node_modules/execa/lib/command.js
import { Buffer as Rd } from "node:buffer";
import { ChildProcess as Nd } from "node:child_process";
var lo = /* @__PURE__ */ a((t, e = []) => Array.isArray(e) ? [t, ...e] : [t], "normalizeArgs"), Zd = /^[\w.-]+$/, jd = /* @__PURE__ */ a((t) => typeof t !=
"string" || Zd.test(t) ? t : `"${t.replaceAll('"', '\\"')}"`, "escapeArg"), Pr = /* @__PURE__ */ a((t, e) => lo(t, e).join(" "), "joinComman\
d"), Ar = /* @__PURE__ */ a((t, e) => lo(t, e).map((r) => jd(r)).join(" "), "getEscapedCommand"), fo = / +/g, po = /* @__PURE__ */ a((t) => {
  let e = [];
  for (let r of t.trim().split(fo)) {
    let n = e.at(-1);
    n && n.endsWith("\\") ? e[e.length - 1] = `${n.slice(0, -1)} ${r}` : e.push(r);
  }
  return e;
}, "parseCommand"), co = /* @__PURE__ */ a((t) => {
  let e = typeof t;
  if (e === "string")
    return t;
  if (e === "number")
    return String(t);
  if (e === "object" && t !== null && !(t instanceof Nd) && "stdout" in t) {
    let r = typeof t.stdout;
    if (r === "string")
      return t.stdout;
    if (Rd.isBuffer(t.stdout))
      return t.stdout.toString();
    throw new TypeError(`Unexpected "${r}" stdout in template expression`);
  }
  throw new TypeError(`Unexpected "${e}" in template expression`);
}, "parseExpression"), uo = /* @__PURE__ */ a((t, e, r) => r || t.length === 0 || e.length === 0 ? [...t, ...e] : [
  ...t.slice(0, -1),
  `${t.at(-1)}${e[0]}`,
  ...e.slice(1)
], "concatTokens"), Md = /* @__PURE__ */ a(({ templates: t, expressions: e, tokens: r, index: n, template: s }) => {
  let o = s ?? t.raw[n], i = o.split(fo).filter(Boolean), c = uo(
    r,
    i,
    o.startsWith(" ")
  );
  if (n === e.length)
    return c;
  let l = e[n], f = Array.isArray(l) ? l.map((p) => co(p)) : [co(l)];
  return uo(
    c,
    f,
    o.endsWith(" ")
  );
}, "parseTemplate"), Or = /* @__PURE__ */ a((t, e) => {
  let r = [];
  for (let [n, s] of t.entries())
    r = Md({ templates: t, expressions: e, tokens: r, index: n, template: s });
  return r;
}, "parseTemplates");

// ../node_modules/execa/lib/verbose.js
import { debuglog as Dd } from "node:util";
import Ld from "node:process";
var mo = Dd("execa").enabled, Et = /* @__PURE__ */ a((t, e) => String(t).padStart(e, "0"), "padField"), Ud = /* @__PURE__ */ a(() => {
  let t = /* @__PURE__ */ new Date();
  return `${Et(t.getHours(), 2)}:${Et(t.getMinutes(), 2)}:${Et(t.getSeconds(), 2)}.${Et(t.getMilliseconds(), 3)}`;
}, "getTimestamp"), Rr = /* @__PURE__ */ a((t, { verbose: e }) => {
  e && Ld.stderr.write(`[${Ud()}] ${t}
`);
}, "logCommand");

// ../node_modules/execa/index.js
var Fd = 1e3 * 1e3 * 100, Bd = /* @__PURE__ */ a(({ env: t, extendEnv: e, preferLocal: r, localDir: n, execPath: s }) => {
  let o = e ? { ...Ct.env, ...t } : t;
  return r ? Ps({ env: o, cwd: n, execPath: s }) : o;
}, "getEnv"), go = /* @__PURE__ */ a((t, e, r = {}) => {
  let n = yo.default._parse(t, e, r);
  return t = n.command, e = n.args, r = n.options, r = {
    maxBuffer: Fd,
    buffer: !0,
    stripFinalNewline: !0,
    extendEnv: !0,
    preferLocal: !1,
    localDir: r.cwd || Ct.cwd(),
    execPath: Ct.execPath,
    encoding: "utf8",
    reject: !0,
    cleanup: !0,
    all: !1,
    windowsHide: !0,
    verbose: mo,
    ...r
  }, r.env = Bd(r), r.stdio = Ms(r), Ct.platform === "win32" && Vd.basename(t, ".exe") === "cmd" && e.unshift("/q"), { file: t, args: e, options: r,
  parsed: n };
}, "handleArguments"), We = /* @__PURE__ */ a((t, e, r) => typeof e != "string" && !$d.isBuffer(e) ? r === void 0 ? void 0 : "" : t.stripFinalNewline ?
dr(e) : e, "handleOutput");
function bo(t, e, r) {
  let n = go(t, e, r), s = Pr(t, e), o = Ar(t, e);
  Rr(o, n.options), Vs(n.options);
  let i;
  try {
    i = Nr.spawn(n.file, n.args, n.options);
  } catch (k) {
    let P = new Nr.ChildProcess(), S = Promise.reject(Fe({
      error: k,
      stdout: "",
      stderr: "",
      all: "",
      command: s,
      escapedCommand: o,
      parsed: n,
      timedOut: !1,
      isCanceled: !1,
      killed: !1
    }));
    return Cr(P, S), P;
  }
  let c = io(i), l = $s(i, n.options, c), f = Fs(i, n.options, l), p = { isCanceled: !1 };
  i.kill = Ls.bind(null, i.kill.bind(i)), i.cancel = Us.bind(null, i, p);
  let _ = Os(/* @__PURE__ */ a(async () => {
    let [{ error: k, exitCode: P, signal: S, timedOut: C }, Re, be, K] = await ao(i, n.options, f), Je = We(n.options, Re), He = We(n.options,
    be), Ye = We(n.options, K);
    if (k || P !== 0 || S !== null) {
      let w = Fe({
        error: k,
        exitCode: P,
        signal: S,
        stdout: Je,
        stderr: He,
        all: Ye,
        command: s,
        escapedCommand: o,
        parsed: n,
        timedOut: C,
        isCanceled: p.isCanceled || (n.options.signal ? n.options.signal.aborted : !1),
        killed: i.killed
      });
      if (!n.options.reject)
        return w;
      throw w;
    }
    return {
      command: s,
      escapedCommand: o,
      exitCode: 0,
      stdout: Je,
      stderr: He,
      all: Ye,
      failed: !1,
      timedOut: !1,
      isCanceled: !1,
      killed: !1
    };
  }, "handlePromise"));
  return so(i, n.options), i.all = oo(i, n.options), Bs(i), Cr(i, _), i;
}
a(bo, "execa");
function Wd(t, e, r) {
  let n = go(t, e, r), s = Pr(t, e), o = Ar(t, e);
  Rr(o, n.options);
  let i = no(n.options), c;
  try {
    c = Nr.spawnSync(n.file, n.args, { ...n.options, input: i });
  } catch (p) {
    throw Fe({
      error: p,
      stdout: "",
      stderr: "",
      all: "",
      command: s,
      escapedCommand: o,
      parsed: n,
      timedOut: !1,
      isCanceled: !1,
      killed: !1
    });
  }
  let l = We(n.options, c.stdout, c.error), f = We(n.options, c.stderr, c.error);
  if (c.error || c.status !== 0 || c.signal !== null) {
    let p = Fe({
      stdout: l,
      stderr: f,
      error: c.error,
      signal: c.signal,
      exitCode: c.status,
      command: s,
      escapedCommand: o,
      parsed: n,
      timedOut: c.error && c.error.code === "ETIMEDOUT",
      isCanceled: !1,
      killed: c.signal !== null
    });
    if (!n.options.reject)
      return p;
    throw p;
  }
  return {
    command: s,
    escapedCommand: o,
    exitCode: 0,
    stdout: l,
    stderr: f,
    failed: !1,
    timedOut: !1,
    isCanceled: !1,
    killed: !1
  };
}
a(Wd, "execaSync");
var Gd = /* @__PURE__ */ a(({ input: t, inputFile: e, stdio: r }) => t === void 0 && e === void 0 && r === void 0 ? { stdin: "inherit" } : {},
"normalizeScriptStdin"), ho = /* @__PURE__ */ a((t = {}) => ({
  preferLocal: !0,
  ...Gd(t),
  ...t
}), "normalizeScriptOptions");
function xo(t) {
  function e(r, ...n) {
    if (!Array.isArray(r))
      return xo({ ...t, ...r });
    let [s, ...o] = Or(r, n);
    return bo(s, o, ho(t));
  }
  return a(e, "$"), e.sync = (r, ...n) => {
    if (!Array.isArray(r))
      throw new TypeError("Please use $(options).sync`command` instead of $.sync(options)`command`.");
    let [s, ...o] = Or(r, n);
    return Wd(s, o, ho(t));
  }, e;
}
a(xo, "create$");
var Fm = xo();
function vo(t, e) {
  let [r, ...n] = po(t);
  return bo(r, n, e);
}
a(vo, "execaCommand");

// src/telemetry/exec-command-count-lines.ts
async function Pt(t, e) {
  let r = vo(t, { shell: !0, buffer: !1, ...e });
  if (!r.stdout)
    throw new Error("Unexpected missing stdout");
  let n = 0, s = Kd(r.stdout);
  return s.on("line", () => {
    n += 1;
  }), await r, s.close(), n;
}
a(Pt, "execCommandCountLines");

// ../node_modules/slash/index.js
function Zr(t) {
  return t.startsWith("\\\\?\\") ? t : t.replace(/\\/g, "/");
}
a(Zr, "slash");

// src/common/utils/file-cache.ts
import { createHash as _o, randomBytes as zd } from "node:crypto";
import { mkdirSync as jr, readFileSync as qd, readdirSync as Jd, rmSync as wo, writeFileSync as Hd } from "node:fs";
import { readFile as ko, readdir as To, rm as Io, writeFile as Yd } from "node:fs/promises";
import { tmpdir as Xd } from "node:os";
import { join as Ge } from "node:path";
var Mr = class {
  static {
    a(this, "FileSystemCache");
  }
  constructor(e = {}) {
    this.prefix = (e.ns || e.prefix || "") + "-", this.hash_alg = e.hash_alg || "md5", this.cache_dir = e.basePath || Ge(Xd(), zd(15).toString(
    "base64").replace(/\//g, "-")), this.ttl = e.ttl || 0, _o(this.hash_alg), jr(this.cache_dir, { recursive: !0 });
  }
  generateHash(e) {
    return Ge(this.cache_dir, this.prefix + _o(this.hash_alg).update(e).digest("hex"));
  }
  isExpired(e, r) {
    return e.ttl != null && r > e.ttl;
  }
  parseCacheData(e, r) {
    let n = JSON.parse(e);
    return this.isExpired(n, Date.now()) ? r : n.content;
  }
  parseSetData(e, r, n = {}) {
    let s = n.ttl ?? this.ttl;
    return JSON.stringify({ key: e, content: r, ...s && { ttl: Date.now() + s * 1e3 } });
  }
  async get(e, r) {
    try {
      let n = await ko(this.generateHash(e), "utf8");
      return this.parseCacheData(n, r);
    } catch {
      return r;
    }
  }
  getSync(e, r) {
    try {
      let n = qd(this.generateHash(e), "utf8");
      return this.parseCacheData(n, r);
    } catch {
      return r;
    }
  }
  async set(e, r, n = {}) {
    let s = typeof n == "number" ? { ttl: n } : n;
    jr(this.cache_dir, { recursive: !0 }), await Yd(this.generateHash(e), this.parseSetData(e, r, s), {
      encoding: s.encoding || "utf8"
    });
  }
  setSync(e, r, n = {}) {
    let s = typeof n == "number" ? { ttl: n } : n;
    jr(this.cache_dir, { recursive: !0 }), Hd(this.generateHash(e), this.parseSetData(e, r, s), {
      encoding: s.encoding || "utf8"
    });
  }
  async setMany(e, r) {
    await Promise.all(e.map((n) => this.set(n.key, n.content ?? n.value, r)));
  }
  setManySync(e, r) {
    e.forEach((n) => this.setSync(n.key, n.content ?? n.value, r));
  }
  async remove(e) {
    await Io(this.generateHash(e), { force: !0 });
  }
  removeSync(e) {
    wo(this.generateHash(e), { force: !0 });
  }
  async clear() {
    let e = await To(this.cache_dir);
    await Promise.all(
      e.filter((r) => r.startsWith(this.prefix)).map((r) => Io(Ge(this.cache_dir, r), { force: !0 }))
    );
  }
  clearSync() {
    Jd(this.cache_dir).filter((e) => e.startsWith(this.prefix)).forEach((e) => wo(Ge(this.cache_dir, e), { force: !0 }));
  }
  async getAll() {
    let e = Date.now(), r = await To(this.cache_dir);
    return (await Promise.all(
      r.filter((s) => s.startsWith(this.prefix)).map((s) => ko(Ge(this.cache_dir, s), "utf8"))
    )).map((s) => JSON.parse(s)).filter((s) => s.content && !this.isExpired(s, e));
  }
  async load() {
    return {
      files: (await this.getAll()).map((r) => ({
        path: this.generateHash(r.key),
        value: r.content,
        key: r.key
      }))
    };
  }
};
function Dr(t) {
  return new Mr(t);
}
a(Dr, "createFileSystemCache");

// src/common/utils/resolve-path-in-sb-cache.ts
import { join as jo } from "node:path";

// ../node_modules/find-cache-dir/index.js
var Zo = z(Eo(), 1);
import fu from "node:process";
import Ke from "node:path";
import Ot from "node:fs";

// ../node_modules/pkg-dir/index.js
import lu from "node:path";

// ../node_modules/pkg-dir/node_modules/find-up/index.js
import At from "node:path";
import { fileURLToPath as iu } from "node:url";

// ../node_modules/locate-path/index.js
import tu from "node:process";
import ru from "node:path";
import Co, { promises as yh } from "node:fs";
import { fileURLToPath as nu } from "node:url";
var Po = {
  directory: "isDirectory",
  file: "isFile"
};
function su(t) {
  if (!Object.hasOwnProperty.call(Po, t))
    throw new Error(`Invalid type specified: ${t}`);
}
a(su, "checkType");
var ou = /* @__PURE__ */ a((t, e) => e[Po[t]](), "matchType"), au = /* @__PURE__ */ a((t) => t instanceof URL ? nu(t) : t, "toPath");
function Lr(t, {
  cwd: e = tu.cwd(),
  type: r = "file",
  allowSymlinks: n = !0
} = {}) {
  su(r), e = au(e);
  let s = n ? Co.statSync : Co.lstatSync;
  for (let o of t)
    try {
      let i = s(ru.resolve(e, o), {
        throwIfNoEntry: !1
      });
      if (!i)
        continue;
      if (ou(r, i))
        return o;
    } catch {
    }
}
a(Lr, "locatePathSync");

// ../node_modules/pkg-dir/node_modules/path-exists/index.js
import wh, { promises as kh } from "node:fs";

// ../node_modules/pkg-dir/node_modules/find-up/index.js
var cu = /* @__PURE__ */ a((t) => t instanceof URL ? iu(t) : t, "toPath"), du = Symbol("findUpStop");
function uu(t, e = {}) {
  let r = At.resolve(cu(e.cwd) || ""), { root: n } = At.parse(r), s = e.stopAt || n, o = e.limit || Number.POSITIVE_INFINITY, i = [t].flat(),
  c = /* @__PURE__ */ a((f) => {
    if (typeof t != "function")
      return Lr(i, f);
    let p = t(f.cwd);
    return typeof p == "string" ? Lr([p], f) : p;
  }, "runMatcher"), l = [];
  for (; ; ) {
    let f = c({ ...e, cwd: r });
    if (f === du || (f && l.push(At.resolve(r, f)), r === s || l.length >= o))
      break;
    r = At.dirname(r);
  }
  return l;
}
a(uu, "findUpMultipleSync");
function Ao(t, e = {}) {
  return uu(t, { ...e, limit: 1 })[0];
}
a(Ao, "findUpSync");

// ../node_modules/pkg-dir/index.js
function Oo({ cwd: t } = {}) {
  let e = Ao("package.json", { cwd: t });
  return e && lu.dirname(e);
}
a(Oo, "packageDirectorySync");

// ../node_modules/find-cache-dir/index.js
var { env: Ur, cwd: pu } = fu, Ro = /* @__PURE__ */ a((t) => {
  try {
    return Ot.accessSync(t, Ot.constants.W_OK), !0;
  } catch {
    return !1;
  }
}, "isWritable");
function No(t, e) {
  return e.create && Ot.mkdirSync(t, { recursive: !0 }), t;
}
a(No, "useDirectory");
function mu(t) {
  let e = Ke.join(t, "node_modules");
  if (!(!Ro(e) && (Ot.existsSync(e) || !Ro(Ke.join(t)))))
    return e;
}
a(mu, "getNodeModuleDirectory");
function $r(t = {}) {
  if (Ur.CACHE_DIR && !["true", "false", "1", "0"].includes(Ur.CACHE_DIR))
    return No(Ke.join(Ur.CACHE_DIR, t.name), t);
  let { cwd: e = pu(), files: r } = t;
  if (r) {
    if (!Array.isArray(r))
      throw new TypeError(`Expected \`files\` option to be an array, got \`${typeof r}\`.`);
    e = (0, Zo.default)(r.map((s) => Ke.resolve(e, s)));
  }
  if (e = Oo({ cwd: e }), !(!e || !mu(e)))
    return No(Ke.join(e, "node_modules", ".cache", t.name), t);
}
a($r, "findCacheDirectory");

// src/common/utils/resolve-path-in-sb-cache.ts
function Mo(t, e = "default") {
  let r = $r({ name: "storybook" });
  return r ||= jo(process.cwd(), "node_modules", ".cache", "storybook"), jo(r, e, t);
}
a(Mo, "resolvePathInStorybookCache");

// src/telemetry/run-telemetry-operation.ts
var Do = Dr({
  basePath: Mo("telemetry"),
  ns: "storybook",
  ttl: 24 * 60 * 60 * 1e3
  // 24h
}), Rt = /* @__PURE__ */ a(async (t, e) => {
  let r = await Do.get(t);
  return r === void 0 && (r = await e(), r !== void 0 && await Do.set(t, r)), r;
}, "runTelemetryOperation");

// src/telemetry/get-application-file-count.ts
var yu = ["page", "screen"], gu = ["js", "jsx", "ts", "tsx"], bu = /* @__PURE__ */ a(async (t) => {
  let r = yu.flatMap((n) => [
    n,
    [n[0].toUpperCase(), ...n.slice(1)].join("")
  ]).flatMap(
    (n) => gu.map((s) => `"${t}${hu}*${n}*.${s}"`)
  );
  try {
    let n = `git ls-files -- ${r.join(" ")}`;
    return await Pt(n);
  } catch {
    return;
  }
}, "getApplicationFilesCountUncached"), Lo = /* @__PURE__ */ a(async (t) => Rt(
  "applicationFiles",
  async () => bu(t)
), "getApplicationFileCount");

// src/telemetry/get-chromatic-version.ts
function Uo(t) {
  let e = t.dependencies?.chromatic || t.devDependencies?.chromatic || t.peerDependencies?.chromatic;
  return e || (t.scripts && Object.values(t.scripts).find((r) => r?.match(/chromatic/)) ? "latest" : void 0);
}
a(Uo, "getChromaticVersionSpecifier");

// src/telemetry/get-framework-info.ts
import { normalize as _u } from "node:path";
import { frameworkPackages as wu } from "@storybook/core/common";

// src/telemetry/package-json.ts
import { readFile as xu } from "node:fs/promises";
import { join as vu } from "node:path";
var Vr = /* @__PURE__ */ a(async (t) => {
  let e = Object.keys(t);
  return Promise.all(e.map(Nt));
}, "getActualPackageVersions"), Nt = /* @__PURE__ */ a(async (t) => {
  try {
    let e = await Fr(t);
    return {
      name: t,
      version: e.version
    };
  } catch {
    return { name: t, version: null };
  }
}, "getActualPackageVersion"), Fr = /* @__PURE__ */ a(async (t) => {
  let e = A.resolve(vu(t, "package.json"), {
    paths: [process.cwd()]
  });
  return JSON.parse(await xu(e, { encoding: "utf8" }));
}, "getActualPackageJson");

// src/telemetry/get-framework-info.ts
var ku = [
  "html",
  "react",
  "svelte",
  "vue3",
  "preact",
  "server",
  "vue",
  "web-components",
  "angular",
  "ember"
], Tu = ["builder-webpack5", "builder-vite"];
function $o(t, e) {
  let { name: r = "", version: n, dependencies: s, devDependencies: o, peerDependencies: i } = t, c = {
    // We include the framework itself because it may be a renderer too (e.g. angular)
    [r]: n,
    ...s,
    ...o,
    ...i
  };
  return e.map((l) => `@storybook/${l}`).find((l) => c[l]);
}
a($o, "findMatchingPackage");
var Iu = /* @__PURE__ */ a((t) => {
  let e = _u(t).replace(new RegExp(/\\/, "g"), "/");
  return Object.keys(wu).find((n) => e.endsWith(n)) || Ne(t).replace(/.*node_modules[\\/]/, "");
}, "getFrameworkPackageName");
async function Vo(t) {
  if (!t?.framework)
    return {};
  let e = typeof t.framework == "string" ? t.framework : t.framework?.name;
  if (!e)
    return {};
  let r = await Fr(e);
  if (!r)
    return {};
  let n = $o(r, Tu), s = $o(r, ku), o = Iu(e), i = typeof t.framework == "object" ? t.framework.options : {};
  return {
    framework: {
      name: o,
      options: i
    },
    builder: n,
    renderer: s
  };
}
a(Vo, "getFrameworkInfo");

// src/telemetry/get-has-router-package.ts
var Su = /* @__PURE__ */ new Set([
  "react-router",
  "react-router-dom",
  "remix",
  "@tanstack/react-router",
  "expo-router",
  "@reach/router",
  "react-easy-router",
  "@remix-run/router",
  "wouter",
  "wouter-preact",
  "preact-router",
  "vue-router",
  "unplugin-vue-router",
  "@angular/router",
  "@solidjs/router",
  // metaframeworks that imply routing
  "next",
  "react-scripts",
  "gatsby",
  "nuxt",
  "@sveltejs/kit"
]);
function Fo(t) {
  return Object.keys(t?.dependencies ?? {}).some(
    (e) => Su.has(e)
  );
}
a(Fo, "getHasRouterPackage");

// src/telemetry/get-monorepo-type.ts
import { existsSync as Bo, readFileSync as Eu } from "node:fs";
import { join as Br } from "node:path";
import { getProjectRoot as Cu } from "@storybook/core/common";
var Wo = {
  Nx: "nx.json",
  Turborepo: "turbo.json",
  Lerna: "lerna.json",
  Rush: "rush.json",
  Lage: "lage.config.json"
}, Go = /* @__PURE__ */ a(() => {
  let t = Cu();
  if (!t)
    return;
  let r = Object.keys(Wo).find((s) => {
    let o = Br(t, Wo[s]);
    return Bo(o);
  });
  if (r)
    return r;
  if (!Bo(Br(t, "package.json")))
    return;
  if (JSON.parse(
    Eu(Br(t, "package.json"), { encoding: "utf8" })
  )?.workspaces)
    return "Workspaces";
}, "getMonorepoType");

// src/telemetry/get-portable-stories-usage.ts
var Pu = /* @__PURE__ */ a(async (t) => {
  try {
    let e = "git grep -l composeStor" + (t ? ` -- ${t}` : "");
    return await Pt(e);
  } catch (e) {
    return e.exitCode === 1 ? 0 : void 0;
  }
}, "getPortableStoriesFileCountUncached"), Ko = /* @__PURE__ */ a(async (t) => Rt(
  "portableStories",
  async () => Pu(t)
), "getPortableStoriesFileCount");

// src/telemetry/storybook-metadata.ts
var zo = {
  next: "Next",
  "react-scripts": "CRA",
  gatsby: "Gatsby",
  "@nuxtjs/storybook": "nuxt",
  "@nrwl/storybook": "nx",
  "@vue/cli-service": "vue-cli",
  "@sveltejs/kit": "sveltekit"
}, qo = /* @__PURE__ */ a((t) => Ne(t).replace(/\/dist\/.*/, "").replace(/\.[mc]?[tj]?s[x]?$/, "").replace(/\/register$/, "").replace(/\/manager$/,
"").replace(/\/preset$/, ""), "sanitizeAddonName"), Du = /* @__PURE__ */ a(async ({
  packageJsonPath: t,
  packageJson: e,
  mainConfig: r
}) => {
  let n = await $n(), s = {
    generatedAt: (/* @__PURE__ */ new Date()).getTime(),
    userSince: n.value.userSince,
    hasCustomBabel: !1,
    hasCustomWebpack: !1,
    hasStaticDirs: !1,
    hasStorybookEslint: !1,
    refCount: 0
  }, o = {
    ...e?.dependencies,
    ...e?.devDependencies,
    ...e?.peerDependencies
  }, i = Object.keys(o).find((w) => !!zo[w]);
  if (i) {
    let { version: w } = await Nt(i);
    s.metaFramework = {
      name: zo[i],
      packageName: i,
      version: w
    };
  }
  let c = [
    "playwright",
    "vitest",
    "jest",
    "cypress",
    "nightwatch",
    "webdriver",
    "@web/test-runner",
    "puppeteer",
    "karma",
    "jasmine",
    "chai",
    "testing-library",
    "@ngneat/spectator",
    "wdio",
    "msw",
    "miragejs",
    "sinon"
  ], l = Object.keys(o).filter(
    (w) => c.find((R) => w.includes(R))
  );
  s.testPackages = Object.fromEntries(
    await Promise.all(
      l.map(async (w) => [w, (await Nt(w))?.version])
    )
  ), s.hasRouterPackage = Fo(e);
  let f = Go();
  f && (s.monorepo = f);
  try {
    let w = await Wt({ cwd: Ou() });
    w && (s.packageManager = {
      type: w.name,
      version: w.version,
      agent: w.agent
    });
  } catch {
  }
  let p = o.typescript ? "typescript" : "javascript";
  if (!r)
    return {
      ...s,
      storybookVersionSpecifier: ju.storybook,
      language: p
    };
  s.hasCustomBabel = !!r.babel, s.hasCustomWebpack = !!r.webpackFinal, s.hasStaticDirs = !!r.staticDirs, typeof r.typescript == "object" && (s.
  typescriptOptions = r.typescript);
  let v = await Vo(r);
  typeof r.refs == "object" && (s.refCount = Object.keys(r.refs).length), typeof r.features == "object" && (s.features = r.features);
  let _ = {};
  r.addons && r.addons.forEach((w) => {
    let R, Xe;
    typeof w == "string" ? R = qo(w) : (w.name.includes("addon-essentials") && (Xe = w.options), R = qo(w.name)), _[R] = {
      options: Xe,
      version: void 0
    };
  });
  let k = Uo(e);
  k && (_.chromatic = {
    version: void 0,
    versionSpecifier: k,
    options: void 0
  }), (await Vr(_)).forEach(({ name: w, version: R }) => {
    _[w].version = R;
  });
  let S = Object.keys(_), C = Object.keys(o).filter((w) => w.includes("storybook") && !S.includes(w)).reduce((w, R) => ({
    ...w,
    [R]: { version: void 0 }
  }), {});
  (await Vr(C)).forEach(({ name: w, version: R }) => {
    C[w].version = R;
  });
  let be = !!o["eslint-plugin-storybook"], K = Nu(e);
  try {
    let { previewConfig: w } = K;
    if (w) {
      let R = await Mu(w), Xe = !!(R.getFieldNode(["globals"]) || R.getFieldNode(["globalTypes"]));
      s.preview = { ...s.preview, usesGlobals: Xe };
    }
  } catch {
  }
  let Je = C[K.frameworkPackage]?.version, He = await Ko(), Ye = await Lo(Au(t));
  return {
    ...s,
    ...v,
    portableStoriesFileCount: He,
    applicationFileCount: Ye,
    storybookVersion: Je,
    storybookVersionSpecifier: K.version,
    language: p,
    storybookPackages: C,
    addons: _,
    hasStorybookEslint: be
  };
}, "computeStorybookMetadata");
async function Lu() {
  let t = await $t(process.cwd());
  return t ? {
    packageJsonPath: t,
    packageJson: await cn(t) || {}
  } : {
    packageJsonPath: process.cwd(),
    packageJson: {}
  };
}
a(Lu, "getPackageJsonDetails");
var Zt, Jo = /* @__PURE__ */ a(async (t) => {
  if (Zt)
    return Zt;
  let { packageJson: e, packageJsonPath: r } = await Lu(), n = (t || Ru(
    String(e?.scripts?.storybook || ""),
    "-c",
    "--config-dir"
  )) ?? ".storybook", s = await Zu({ configDir: n }).catch(() => {
  });
  return Zt = await Du({ mainConfig: s, packageJson: e, packageJsonPath: r }), Zt;
}, "getStorybookMetadata");

// src/telemetry/telemetry.ts
var aa = z(Yo(), 1);
import * as oa from "node:os";

// ../node_modules/nanoid/index.js
import { randomFillSync as Qo } from "crypto";

// ../node_modules/nanoid/url-alphabet/index.js
var Xo = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// ../node_modules/nanoid/index.js
var Uu = 128, ge, Oe, $u = /* @__PURE__ */ a((t) => {
  !ge || ge.length < t ? (ge = Buffer.allocUnsafe(t * Uu), Qo(ge), Oe = 0) : Oe + t > ge.length && (Qo(ge), Oe = 0), Oe += t;
}, "fillPool");
var ze = /* @__PURE__ */ a((t = 21) => {
  $u(t -= 0);
  let e = "";
  for (let r = Oe - t; r < Oe; r++)
    e += Xo[ge[r] & 63];
  return e;
}, "nanoid");

// src/telemetry/anonymous-id.ts
import { relative as Fu } from "node:path";
import { getProjectRoot as Bu } from "@storybook/core/common";
import { execSync as Wu } from "child_process";

// src/telemetry/one-way-hash.ts
import { createHash as Vu } from "crypto";
var Wr = /* @__PURE__ */ a((t) => {
  let e = Vu("sha256");
  return e.update("storybook-telemetry-salt"), e.update(t), e.digest("hex");
}, "oneWayHash");

// src/telemetry/anonymous-id.ts
function Gu(t) {
  let n = t.trim().replace(/#.*$/, "").replace(/^.*@/, "").replace(/^.*\/\//, "");
  return (n.endsWith(".git") ? n : `${n}.git`).replace(":", "/");
}
a(Gu, "normalizeGitUrl");
function Ku(t, e) {
  return `${Gu(t)}${Zr(e)}`;
}
a(Ku, "unhashedProjectId");
var Mt, ea = /* @__PURE__ */ a(() => {
  if (Mt)
    return Mt;
  try {
    let t = Bu(), e = Fu(t, process.cwd()), r = Wu("git config --local --get remote.origin.url", {
      timeout: 1e3,
      stdio: "pipe"
    });
    Mt = Wr(Ku(String(r), e));
  } catch {
  }
  return Mt;
}, "getAnonymousProjectId");

// src/telemetry/event-cache.ts
import { cache as Kr } from "@storybook/core/common";
var Gr = Promise.resolve(), zu = /* @__PURE__ */ a(async (t, e) => {
  let r = await Kr.get("lastEvents") || {};
  r[t] = { body: e, timestamp: Date.now() }, await Kr.set("lastEvents", r);
}, "setHelper"), ra = /* @__PURE__ */ a(async (t, e) => (await Gr, Gr = zu(t, e), Gr), "set");
var qu = /* @__PURE__ */ a((t) => {
  let { body: e, timestamp: r } = t;
  return {
    timestamp: r,
    eventType: e?.eventType,
    eventId: e?.eventId,
    sessionId: e?.sessionId
  };
}, "upgradeFields"), Ju = ["init", "upgrade"], Hu = ["build", "dev", "error"], ta = /* @__PURE__ */ a((t, e) => {
  let r = e.map((n) => t?.[n]).filter(Boolean).sort((n, s) => s.timestamp - n.timestamp);
  return r.length > 0 ? r[0] : void 0;
}, "lastEvent"), Yu = /* @__PURE__ */ a(async (t = void 0) => {
  let e = t || await Kr.get("lastEvents") || {}, r = ta(e, Ju), n = ta(e, Hu);
  if (r)
    return !n?.timestamp || r.timestamp > n.timestamp ? qu(r) : void 0;
}, "getPrecedingUpgrade");

// src/telemetry/fetch.ts
var na = global.fetch;

// src/telemetry/session-id.ts
import { cache as sa } from "@storybook/core/common";
var Xu = 1e3 * 60 * 60 * 2, qe;
var zr = /* @__PURE__ */ a(async () => {
  let t = Date.now();
  if (!qe) {
    let e = await sa.get("session");
    e && e.lastUsed >= t - Xu ? qe = e.id : qe = ze();
  }
  return await sa.set("session", { id: qe, lastUsed: t }), qe;
}, "getSessionId");

// src/telemetry/telemetry.ts
var Qu = (0, aa.default)(na), el = process.env.STORYBOOK_TELEMETRY_URL || "https://storybook.js.org/event-log", Dt = [], tl = /* @__PURE__ */ a(
(t, e) => {
  qr[t] = e;
}, "addToGlobalContext"), rl = /* @__PURE__ */ a(() => {
  try {
    let t = oa.platform();
    return t === "win32" ? "Windows" : t === "darwin" ? "macOS" : t === "linux" ? "Linux" : `Other: ${t}`;
  } catch {
    return "Unknown";
  }
}, "getOperatingSystem"), qr = {
  inCI: !!process.env.CI,
  isTTY: process.stdout.isTTY,
  platform: rl(),
  nodeVersion: process.versions.node
}, nl = /* @__PURE__ */ a(async (t, e, r) => {
  let { eventType: n, payload: s, metadata: o, ...i } = t, c = await zr(), l = ze(), f = { ...i, eventType: n, eventId: l, sessionId: c, metadata: o,
  payload: s, context: e };
  return Qu(el, {
    method: "post",
    body: JSON.stringify(f),
    headers: { "Content-Type": "application/json" },
    retries: 3,
    retryOn: [503, 504],
    retryDelay: /* @__PURE__ */ a((p) => 2 ** p * (typeof r?.retryDelay == "number" && !Number.isNaN(r?.retryDelay) ? r.retryDelay : 1e3), "\
retryDelay")
  });
}, "prepareRequest");
async function ia(t, e = { retryDelay: 1e3, immediate: !1 }) {
  let { eventType: r, payload: n, metadata: s, ...o } = t, i = e.stripMetadata ? qr : {
    ...qr,
    anonymousId: ea()
  }, c;
  try {
    c = nl(t, i, e), Dt.push(c), e.immediate ? await Promise.all(Dt) : await c;
    let l = await zr(), f = ze(), p = { ...o, eventType: r, eventId: f, sessionId: l, metadata: s, payload: n, context: i };
    await ra(r, p);
  } catch {
  } finally {
    Dt = Dt.filter((l) => l !== c);
  }
}
a(ia, "sendTelemetry");

// src/telemetry/index.ts
var hb = /* @__PURE__ */ a((t) => t.startsWith("example-button--") || t.startsWith("example-header--") || t.startsWith("example-page--"), "i\
sExampleStoryId"), yb = /* @__PURE__ */ a(async (t, e = {}, r = {}) => {
  t !== "boot" && r.notify !== !1 && await en();
  let n = {
    eventType: t,
    payload: e
  };
  try {
    r?.stripMetadata || (n.metadata = await Jo(r?.configDir));
  } catch (s) {
    n.payload.metadataErrorMessage = tt(s).message, r?.enableCrashReports && (n.payload.metadataError = tt(s));
  } finally {
    let { error: s } = n.payload;
    s && (n.payload.error = tt(s)), (!n.payload.error || r?.enableCrashReports) && (process.env?.STORYBOOK_TELEMETRY_DEBUG && (ca.info(`
[telemetry]`), ca.info(JSON.stringify(n, null, 2))), await ia(n, r));
  }
}, "telemetry");
export {
  tl as addToGlobalContext,
  Ne as cleanPaths,
  Du as computeStorybookMetadata,
  Yu as getPrecedingUpgrade,
  Jo as getStorybookMetadata,
  hb as isExampleStoryId,
  zo as metaFrameworks,
  Wr as oneWayHash,
  rn as removeAnsiEscapeCodes,
  qo as sanitizeAddonName,
  tt as sanitizeError,
  yb as telemetry
};
