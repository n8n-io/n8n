"use strict";
var Xa = Object.create;
var Ue = Object.defineProperty;
var Qa = Object.getOwnPropertyDescriptor;
var ei = Object.getOwnPropertyNames;
var ti = Object.getPrototypeOf, ri = Object.prototype.hasOwnProperty;
var a = (t, e) => Ue(t, "name", { value: e, configurable: !0 });
var S = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), ni = (t, e) => {
  for (var r in e)
    Ue(t, r, { get: e[r], enumerable: !0 });
}, mn = (t, e, r, n) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let s of ei(e))
      !ri.call(t, s) && s !== r && Ue(t, s, { get: () => e[s], enumerable: !(n = Qa(e, s)) || n.enumerable });
  return t;
};
var T = (t, e, r) => (r = t != null ? Xa(ti(t)) : {}, mn(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !t || !t.__esModule ? Ue(r, "default", { value: t, enumerable: !0 }) : r,
  t
)), si = (t) => mn(Ue({}, "__esModule", { value: !0 }), t);

// ../node_modules/picocolors/picocolors.js
var gn = S((Ju, Xt) => {
  var hn = process.argv || [], dt = process.env, oi = !("NO_COLOR" in dt || hn.includes("--no-color")) && ("FORCE_COLOR" in dt || hn.includes(
  "--color") || process.platform === "win32" || require != null && require("tty").isatty(1) && dt.TERM !== "dumb" || "CI" in dt), ai = /* @__PURE__ */ a(
  (t, e, r = t) => (n) => {
    let s = "" + n, o = s.indexOf(e, t.length);
    return ~o ? t + ii(s, e, r, o) + e : t + s + e;
  }, "formatter"), ii = /* @__PURE__ */ a((t, e, r, n) => {
    let s = "", o = 0;
    do
      s += t.substring(o, n) + r, o = n + e.length, n = t.indexOf(e, o);
    while (~n);
    return s + t.substring(o);
  }, "replaceClose"), yn = /* @__PURE__ */ a((t = oi) => {
    let e = t ? ai : () => String;
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
  Xt.exports = yn();
  Xt.exports.createColors = yn;
});

// ../node_modules/walk-up-path/dist/cjs/index.js
var wn = S((lt) => {
  "use strict";
  Object.defineProperty(lt, "__esModule", { value: !0 });
  lt.walkUp = void 0;
  var _n = require("path"), ci = /* @__PURE__ */ a(function* (t) {
    for (t = (0, _n.resolve)(t); t; ) {
      yield t;
      let e = (0, _n.dirname)(t);
      if (e === t)
        break;
      t = e;
    }
  }, "walkUp");
  lt.walkUp = ci;
});

// ../node_modules/zod/lib/helpers/util.js
var Ve = S((C) => {
  "use strict";
  Object.defineProperty(C, "__esModule", { value: !0 });
  C.getParsedType = C.ZodParsedType = C.objectUtil = C.util = void 0;
  var cr;
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
  })(cr || (C.util = cr = {}));
  var An;
  (function(t) {
    t.mergeShapes = (e, r) => ({
      ...e,
      ...r
      // second overwrites first
    });
  })(An || (C.objectUtil = An = {}));
  C.ZodParsedType = cr.arrayToEnum([
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
  var mi = /* @__PURE__ */ a((t) => {
    switch (typeof t) {
      case "undefined":
        return C.ZodParsedType.undefined;
      case "string":
        return C.ZodParsedType.string;
      case "number":
        return isNaN(t) ? C.ZodParsedType.nan : C.ZodParsedType.number;
      case "boolean":
        return C.ZodParsedType.boolean;
      case "function":
        return C.ZodParsedType.function;
      case "bigint":
        return C.ZodParsedType.bigint;
      case "symbol":
        return C.ZodParsedType.symbol;
      case "object":
        return Array.isArray(t) ? C.ZodParsedType.array : t === null ? C.ZodParsedType.null : t.then && typeof t.then == "function" && t.catch &&
        typeof t.catch == "function" ? C.ZodParsedType.promise : typeof Map < "u" && t instanceof Map ? C.ZodParsedType.map : typeof Set < "\
u" && t instanceof Set ? C.ZodParsedType.set : typeof Date < "u" && t instanceof Date ? C.ZodParsedType.date : C.ZodParsedType.object;
      default:
        return C.ZodParsedType.unknown;
    }
  }, "getParsedType");
  C.getParsedType = mi;
});

// ../node_modules/zod/lib/ZodError.js
var pt = S((Y) => {
  "use strict";
  Object.defineProperty(Y, "__esModule", { value: !0 });
  Y.ZodError = Y.quotelessJson = Y.ZodIssueCode = void 0;
  var On = Ve();
  Y.ZodIssueCode = On.util.arrayToEnum([
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
  var hi = /* @__PURE__ */ a((t) => JSON.stringify(t, null, 2).replace(/"([^"]+)":/g, "$1:"), "quotelessJson");
  Y.quotelessJson = hi;
  var Fe = class t extends Error {
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
      return JSON.stringify(this.issues, On.util.jsonStringifyReplacer, 2);
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
  Y.ZodError = Fe;
  Fe.create = (t) => new Fe(t);
});

// ../node_modules/zod/lib/locales/en.js
var ur = S((dr) => {
  "use strict";
  Object.defineProperty(dr, "__esModule", { value: !0 });
  var re = Ve(), O = pt(), yi = /* @__PURE__ */ a((t, e) => {
    let r;
    switch (t.code) {
      case O.ZodIssueCode.invalid_type:
        t.received === re.ZodParsedType.undefined ? r = "Required" : r = `Expected ${t.expected}, received ${t.received}`;
        break;
      case O.ZodIssueCode.invalid_literal:
        r = `Invalid literal value, expected ${JSON.stringify(t.expected, re.util.jsonStringifyReplacer)}`;
        break;
      case O.ZodIssueCode.unrecognized_keys:
        r = `Unrecognized key(s) in object: ${re.util.joinValues(t.keys, ", ")}`;
        break;
      case O.ZodIssueCode.invalid_union:
        r = "Invalid input";
        break;
      case O.ZodIssueCode.invalid_union_discriminator:
        r = `Invalid discriminator value. Expected ${re.util.joinValues(t.options)}`;
        break;
      case O.ZodIssueCode.invalid_enum_value:
        r = `Invalid enum value. Expected ${re.util.joinValues(t.options)}, received '${t.received}'`;
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
: must end with "${t.validation.endsWith}"` : re.util.assertNever(t.validation) : t.validation !== "regex" ? r = `Invalid ${t.validation}` :
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
        r = e.defaultError, re.util.assertNever(t);
    }
    return { message: r };
  }, "errorMap");
  dr.default = yi;
});

// ../node_modules/zod/lib/errors.js
var mt = S((F) => {
  "use strict";
  var gi = F && F.__importDefault || function(t) {
    return t && t.__esModule ? t : { default: t };
  };
  Object.defineProperty(F, "__esModule", { value: !0 });
  F.getErrorMap = F.setErrorMap = F.defaultErrorMap = void 0;
  var Rn = gi(ur());
  F.defaultErrorMap = Rn.default;
  var Nn = Rn.default;
  function bi(t) {
    Nn = t;
  }
  a(bi, "setErrorMap");
  F.setErrorMap = bi;
  function xi() {
    return Nn;
  }
  a(xi, "getErrorMap");
  F.getErrorMap = xi;
});

// ../node_modules/zod/lib/helpers/parseUtil.js
var fr = S((I) => {
  "use strict";
  var vi = I && I.__importDefault || function(t) {
    return t && t.__esModule ? t : { default: t };
  };
  Object.defineProperty(I, "__esModule", { value: !0 });
  I.isAsync = I.isValid = I.isDirty = I.isAborted = I.OK = I.DIRTY = I.INVALID = I.ParseStatus = I.addIssueToContext = I.EMPTY_PATH = I.makeIssue =
  void 0;
  var _i = mt(), Zn = vi(ur()), wi = /* @__PURE__ */ a((t) => {
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
  I.makeIssue = wi;
  I.EMPTY_PATH = [];
  function ki(t, e) {
    let r = (0, _i.getErrorMap)(), n = (0, I.makeIssue)({
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
        r === Zn.default ? void 0 : Zn.default
        // then global default map
      ].filter((s) => !!s)
    });
    t.common.issues.push(n);
  }
  a(ki, "addIssueToContext");
  I.addIssueToContext = ki;
  var lr = class t {
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
          return I.INVALID;
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
          return I.INVALID;
        o.status === "dirty" && e.dirty(), i.status === "dirty" && e.dirty(), o.value !== "__proto__" && (typeof i.value < "u" || s.alwaysSet) &&
        (n[o.value] = i.value);
      }
      return { status: e.value, value: n };
    }
  };
  I.ParseStatus = lr;
  I.INVALID = Object.freeze({
    status: "aborted"
  });
  var Ti = /* @__PURE__ */ a((t) => ({ status: "dirty", value: t }), "DIRTY");
  I.DIRTY = Ti;
  var Ii = /* @__PURE__ */ a((t) => ({ status: "valid", value: t }), "OK");
  I.OK = Ii;
  var Si = /* @__PURE__ */ a((t) => t.status === "aborted", "isAborted");
  I.isAborted = Si;
  var Ei = /* @__PURE__ */ a((t) => t.status === "dirty", "isDirty");
  I.isDirty = Ei;
  var Ci = /* @__PURE__ */ a((t) => t.status === "valid", "isValid");
  I.isValid = Ci;
  var Pi = /* @__PURE__ */ a((t) => typeof Promise < "u" && t instanceof Promise, "isAsync");
  I.isAsync = Pi;
});

// ../node_modules/zod/lib/helpers/typeAliases.js
var Mn = S((jn) => {
  "use strict";
  Object.defineProperty(jn, "__esModule", { value: !0 });
});

// ../node_modules/zod/lib/helpers/errorUtil.js
var Ln = S((ht) => {
  "use strict";
  Object.defineProperty(ht, "__esModule", { value: !0 });
  ht.errorUtil = void 0;
  var Dn;
  (function(t) {
    t.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, t.toString = (e) => typeof e == "string" ? e : e?.message;
  })(Dn || (ht.errorUtil = Dn = {}));
});

// ../node_modules/zod/lib/types.js
var Hn = S((d) => {
  "use strict";
  var gt = d && d.__classPrivateFieldGet || function(t, e, r, n) {
    if (r === "a" && !n) throw new TypeError("Private accessor was defined without a getter");
    if (typeof e == "function" ? t !== e || !n : !e.has(t)) throw new TypeError("Cannot read private member from an object whose class did n\
ot declare it");
    return r === "m" ? n : r === "a" ? n.call(t) : n ? n.value : e.get(t);
  }, $n = d && d.__classPrivateFieldSet || function(t, e, r, n, s) {
    if (n === "m") throw new TypeError("Private method is not writable");
    if (n === "a" && !s) throw new TypeError("Private accessor was defined without a setter");
    if (typeof e == "function" ? t !== e || !s : !e.has(t)) throw new TypeError("Cannot write private member to an object whose class did no\
t declare it");
    return n === "a" ? s.call(t, r) : s ? s.value = r : e.set(t, r), r;
  }, Be, We;
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
  var yt = mt(), y = Ln(), u = fr(), h = Ve(), m = pt(), L = class {
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
  }, Un = /* @__PURE__ */ a((t, e) => {
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
      return Un(s, o);
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
      return Un(n, o);
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
      return D.create(this, this._def);
    }
    nullable() {
      return W.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return q.create(this);
    }
    promise() {
      return ee.create(this, this._def);
    }
    or(e) {
      return de.create([this, e], this._def);
    }
    and(e) {
      return ue.create(this, e, this._def);
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
      return new he({
        ...b(this._def),
        innerType: this,
        defaultValue: r,
        typeName: g.ZodDefault
      });
    }
    brand() {
      return new Ge({
        typeName: g.ZodBranded,
        type: this,
        ...b(this._def)
      });
    }
    catch(e) {
      let r = typeof e == "function" ? e : () => e;
      return new ye({
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
      return Ke.create(this, e);
    }
    readonly() {
      return ge.create(this);
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
  var Ai = /^c[^\s-]{8,}$/i, Oi = /^[0-9a-z]+$/, Ri = /^[0-9A-HJKMNP-TV-Z]{26}$/i, Ni = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  Zi = /^[a-z0-9_-]{21}$/i, ji = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, Mi = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  Di = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, Li = "^(\\p{Extended_Pictographic}|\\p{Emoji_Comp\
onent})+$", pr, Ui = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, $i = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  Vi = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  Fi = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  Bi = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, Wi = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  Vn = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469\
]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", Gi = new RegExp(`^${Vn}$`);
  function Fn(t) {
    let e = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
    return t.precision ? e = `${e}\\.\\d{${t.precision}}` : t.precision == null && (e = `${e}(\\.\\d+)?`), e;
  }
  a(Fn, "timeRegexSource");
  function Ki(t) {
    return new RegExp(`^${Fn(t)}$`);
  }
  a(Ki, "timeRegex");
  function Bn(t) {
    let e = `${Vn}T${Fn(t)}`, r = [];
    return r.push(t.local ? "Z?" : "Z"), t.offset && r.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${r.join("|")})`, new RegExp(`^${e}$`);
  }
  a(Bn, "datetimeRegex");
  d.datetimeRegex = Bn;
  function zi(t, e) {
    return !!((e === "v4" || !e) && Ui.test(t) || (e === "v6" || !e) && Vi.test(t));
  }
  a(zi, "isValidIP");
  function qi(t, e) {
    if (!ji.test(t))
      return !1;
    try {
      let [r] = t.split("."), n = r.replace(/-/g, "+").replace(/_/g, "/").padEnd(r.length + (4 - r.length % 4) % 4, "="), s = JSON.parse(atob(
      n));
      return !(typeof s != "object" || s === null || !s.typ || !s.alg || e && s.alg !== e);
    } catch {
      return !1;
    }
  }
  a(qi, "isValidJWT");
  function Ji(t, e) {
    return !!((e === "v4" || !e) && $i.test(t) || (e === "v6" || !e) && Fi.test(t));
  }
  a(Ji, "isValidCidr");
  var X = class t extends x {
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
          Di.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "email",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "emoji")
          pr || (pr = new RegExp(Li, "u")), pr.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "emoji",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "uuid")
          Ni.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "uuid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "nanoid")
          Zi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "nanoid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "cuid")
          Ai.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "cuid",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "cuid2")
          Oi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
            validation: "cuid2",
            code: m.ZodIssueCode.invalid_string,
            message: o.message
          }), n.dirty());
        else if (o.kind === "ulid")
          Ri.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
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
        }), n.dirty()) : o.kind === "datetime" ? Bn(o).test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: "datetime",
          message: o.message
        }), n.dirty()) : o.kind === "date" ? Gi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: "date",
          message: o.message
        }), n.dirty()) : o.kind === "time" ? Ki(o).test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          code: m.ZodIssueCode.invalid_string,
          validation: "time",
          message: o.message
        }), n.dirty()) : o.kind === "duration" ? Mi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "duration",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "ip" ? zi(e.data, o.version) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "ip",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "jwt" ? qi(e.data, o.alg) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "jwt",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "cidr" ? Ji(e.data, o.version) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "cidr",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "base64" ? Bi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
          validation: "base64",
          code: m.ZodIssueCode.invalid_string,
          message: o.message
        }), n.dirty()) : o.kind === "base64url" ? Wi.test(e.data) || (s = this._getOrReturnCtx(e, s), (0, u.addIssueToContext)(s, {
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
  d.ZodString = X;
  X.create = (t) => {
    var e;
    return new X({
      checks: [],
      typeName: g.ZodString,
      coerce: (e = t?.coerce) !== null && e !== void 0 ? e : !1,
      ...b(t)
    });
  };
  function Hi(t, e) {
    let r = (t.toString().split(".")[1] || "").length, n = (e.toString().split(".")[1] || "").length, s = r > n ? r : n, o = parseInt(t.toFixed(
    s).replace(".", "")), i = parseInt(e.toFixed(s).replace(".", ""));
    return o % i / Math.pow(10, s);
  }
  a(Hi, "floatSafeRemainder");
  var ne = class t extends x {
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
        }), s.dirty()) : o.kind === "multipleOf" ? Hi(e.data, o.value) !== 0 && (n = this._getOrReturnCtx(e, n), (0, u.addIssueToContext)(n,
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
  d.ZodNumber = ne;
  ne.create = (t) => new ne({
    checks: [],
    typeName: g.ZodNumber,
    coerce: t?.coerce || !1,
    ...b(t)
  });
  var se = class t extends x {
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
  d.ZodBigInt = se;
  se.create = (t) => {
    var e;
    return new se({
      checks: [],
      typeName: g.ZodBigInt,
      coerce: (e = t?.coerce) !== null && e !== void 0 ? e : !1,
      ...b(t)
    });
  };
  var oe = class extends x {
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
  d.ZodBoolean = oe;
  oe.create = (t) => new oe({
    typeName: g.ZodBoolean,
    coerce: t?.coerce || !1,
    ...b(t)
  });
  var ae = class t extends x {
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
  d.ZodDate = ae;
  ae.create = (t) => new ae({
    checks: [],
    coerce: t?.coerce || !1,
    typeName: g.ZodDate,
    ...b(t)
  });
  var Te = class extends x {
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
  d.ZodSymbol = Te;
  Te.create = (t) => new Te({
    typeName: g.ZodSymbol,
    ...b(t)
  });
  var ie = class extends x {
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
  d.ZodUndefined = ie;
  ie.create = (t) => new ie({
    typeName: g.ZodUndefined,
    ...b(t)
  });
  var ce = class extends x {
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
  d.ZodNull = ce;
  ce.create = (t) => new ce({
    typeName: g.ZodNull,
    ...b(t)
  });
  var Q = class extends x {
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
  d.ZodAny = Q;
  Q.create = (t) => new Q({
    typeName: g.ZodAny,
    ...b(t)
  });
  var z = class extends x {
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
  d.ZodUnknown = z;
  z.create = (t) => new z({
    typeName: g.ZodUnknown,
    ...b(t)
  });
  var $ = class extends x {
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
  d.ZodNever = $;
  $.create = (t) => new $({
    typeName: g.ZodNever,
    ...b(t)
  });
  var Ie = class extends x {
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
  d.ZodVoid = Ie;
  Ie.create = (t) => new Ie({
    typeName: g.ZodVoid,
    ...b(t)
  });
  var q = class t extends x {
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
        return Promise.all([...r.data].map((i, c) => s.type._parseAsync(new L(r, i, r.path, c)))).then((i) => u.ParseStatus.mergeArray(n, i));
      let o = [...r.data].map((i, c) => s.type._parseSync(new L(r, i, r.path, c)));
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
  d.ZodArray = q;
  q.create = (t, e) => new q({
    type: t,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: g.ZodArray,
    ...b(e)
  });
  function ke(t) {
    if (t instanceof N) {
      let e = {};
      for (let r in t.shape) {
        let n = t.shape[r];
        e[r] = D.create(ke(n));
      }
      return new N({
        ...t._def,
        shape: /* @__PURE__ */ a(() => e, "shape")
      });
    } else return t instanceof q ? new q({
      ...t._def,
      type: ke(t.element)
    }) : t instanceof D ? D.create(ke(t.unwrap())) : t instanceof W ? W.create(ke(t.unwrap())) : t instanceof B ? B.create(t.items.map((e) => ke(
    e))) : t;
  }
  a(ke, "deepPartialify");
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
      if (!(this._def.catchall instanceof $ && this._def.unknownKeys === "strip"))
        for (let f in s.data)
          i.includes(f) || c.push(f);
      let l = [];
      for (let f of i) {
        let p = o[f], v = s.data[f];
        l.push({
          key: { status: "valid", value: f },
          value: p._parse(new L(s, v, s.path, f)),
          alwaysSet: f in s.data
        });
      }
      if (this._def.catchall instanceof $) {
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
              new L(s, v, s.path, p)
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
      return ke(this);
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
          for (; o instanceof D; )
            o = o._def.innerType;
          r[n] = o;
        }
      }), new t({
        ...this._def,
        shape: /* @__PURE__ */ a(() => r, "shape")
      });
    }
    keyof() {
      return Wn(h.util.objectKeys(this.shape));
    }
  };
  d.ZodObject = N;
  N.create = (t, e) => new N({
    shape: /* @__PURE__ */ a(() => t, "shape"),
    unknownKeys: "strip",
    catchall: $.create(),
    typeName: g.ZodObject,
    ...b(e)
  });
  N.strictCreate = (t, e) => new N({
    shape: /* @__PURE__ */ a(() => t, "shape"),
    unknownKeys: "strict",
    catchall: $.create(),
    typeName: g.ZodObject,
    ...b(e)
  });
  N.lazycreate = (t, e) => new N({
    shape: t,
    unknownKeys: "strip",
    catchall: $.create(),
    typeName: g.ZodObject,
    ...b(e)
  });
  var de = class extends x {
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
  d.ZodUnion = de;
  de.create = (t, e) => new de({
    options: t,
    typeName: g.ZodUnion,
    ...b(e)
  });
  var K = /* @__PURE__ */ a((t) => t instanceof le ? K(t.schema) : t instanceof j ? K(t.innerType()) : t instanceof fe ? [t.value] : t instanceof
  pe ? t.options : t instanceof me ? h.util.objectValues(t.enum) : t instanceof he ? K(t._def.innerType) : t instanceof ie ? [void 0] : t instanceof
  ce ? [null] : t instanceof D ? [void 0, ...K(t.unwrap())] : t instanceof W ? [null, ...K(t.unwrap())] : t instanceof Ge || t instanceof ge ?
  K(t.unwrap()) : t instanceof ye ? K(t._def.innerType) : [], "getDiscriminator"), bt = class t extends x {
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
        let i = K(o.shape[e]);
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
  d.ZodDiscriminatedUnion = bt;
  function mr(t, e) {
    let r = (0, h.getParsedType)(t), n = (0, h.getParsedType)(e);
    if (t === e)
      return { valid: !0, data: t };
    if (r === h.ZodParsedType.object && n === h.ZodParsedType.object) {
      let s = h.util.objectKeys(e), o = h.util.objectKeys(t).filter((c) => s.indexOf(c) !== -1), i = { ...t, ...e };
      for (let c of o) {
        let l = mr(t[c], e[c]);
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
        let i = t[o], c = e[o], l = mr(i, c);
        if (!l.valid)
          return { valid: !1 };
        s.push(l.data);
      }
      return { valid: !0, data: s };
    } else return r === h.ZodParsedType.date && n === h.ZodParsedType.date && +t == +e ? { valid: !0, data: t } : { valid: !1 };
  }
  a(mr, "mergeValues");
  var ue = class extends x {
    static {
      a(this, "ZodIntersection");
    }
    _parse(e) {
      let { status: r, ctx: n } = this._processInputParams(e), s = /* @__PURE__ */ a((o, i) => {
        if ((0, u.isAborted)(o) || (0, u.isAborted)(i))
          return u.INVALID;
        let c = mr(o.value, i.value);
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
  d.ZodIntersection = ue;
  ue.create = (t, e, r) => new ue({
    left: t,
    right: e,
    typeName: g.ZodIntersection,
    ...b(r)
  });
  var B = class t extends x {
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
        return l ? l._parse(new L(n, i, n.path, c)) : null;
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
  d.ZodTuple = B;
  B.create = (t, e) => {
    if (!Array.isArray(t))
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new B({
      items: t,
      typeName: g.ZodTuple,
      rest: null,
      ...b(e)
    });
  };
  var xt = class t extends x {
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
          key: o._parse(new L(n, c, n.path, c)),
          value: i._parse(new L(n, n.data[c], n.path, c)),
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
        keyType: X.create(),
        valueType: e,
        typeName: g.ZodRecord,
        ...b(r)
      });
    }
  };
  d.ZodRecord = xt;
  var Se = class extends x {
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
        key: s._parse(new L(n, c, n.path, [f, "key"])),
        value: o._parse(new L(n, l, n.path, [f, "value"]))
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
  d.ZodMap = Se;
  Se.create = (t, e, r) => new Se({
    valueType: e,
    keyType: t,
    typeName: g.ZodMap,
    ...b(r)
  });
  var Ee = class t extends x {
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
      let c = [...n.data.values()].map((l, f) => o._parse(new L(n, l, n.path, f)));
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
  d.ZodSet = Ee;
  Ee.create = (t, e) => new Ee({
    valueType: t,
    minSize: null,
    maxSize: null,
    typeName: g.ZodSet,
    ...b(e)
  });
  var vt = class t extends x {
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
            (0, yt.getErrorMap)(),
            yt.defaultErrorMap
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
            (0, yt.getErrorMap)(),
            yt.defaultErrorMap
          ].filter((f) => !!f),
          issueData: {
            code: m.ZodIssueCode.invalid_return_type,
            returnTypeError: l
          }
        });
      }
      a(s, "makeReturnsIssue");
      let o = { errorMap: r.common.contextualErrorMap }, i = r.data;
      if (this._def.returns instanceof ee) {
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
        args: B.create(e).rest(z.create())
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
        args: e || B.create([]).rest(z.create()),
        returns: r || z.create(),
        typeName: g.ZodFunction,
        ...b(n)
      });
    }
  };
  d.ZodFunction = vt;
  var le = class extends x {
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
  d.ZodLazy = le;
  le.create = (t, e) => new le({
    getter: t,
    typeName: g.ZodLazy,
    ...b(e)
  });
  var fe = class extends x {
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
  d.ZodLiteral = fe;
  fe.create = (t, e) => new fe({
    value: t,
    typeName: g.ZodLiteral,
    ...b(e)
  });
  function Wn(t, e) {
    return new pe({
      values: t,
      typeName: g.ZodEnum,
      ...b(e)
    });
  }
  a(Wn, "createZodEnum");
  var pe = class t extends x {
    static {
      a(this, "ZodEnum");
    }
    constructor() {
      super(...arguments), Be.set(this, void 0);
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
      if (gt(this, Be, "f") || $n(this, Be, new Set(this._def.values), "f"), !gt(this, Be, "f").has(e.data)) {
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
  d.ZodEnum = pe;
  Be = /* @__PURE__ */ new WeakMap();
  pe.create = Wn;
  var me = class extends x {
    static {
      a(this, "ZodNativeEnum");
    }
    constructor() {
      super(...arguments), We.set(this, void 0);
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
      if (gt(this, We, "f") || $n(this, We, new Set(h.util.getValidEnumValues(this._def.values)), "f"), !gt(this, We, "f").has(e.data)) {
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
  d.ZodNativeEnum = me;
  We = /* @__PURE__ */ new WeakMap();
  me.create = (t, e) => new me({
    values: t,
    typeName: g.ZodNativeEnum,
    ...b(e)
  });
  var ee = class extends x {
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
  d.ZodPromise = ee;
  ee.create = (t, e) => new ee({
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
  var D = class extends x {
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
  d.ZodOptional = D;
  D.create = (t, e) => new D({
    innerType: t,
    typeName: g.ZodOptional,
    ...b(e)
  });
  var W = class extends x {
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
  d.ZodNullable = W;
  W.create = (t, e) => new W({
    innerType: t,
    typeName: g.ZodNullable,
    ...b(e)
  });
  var he = class extends x {
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
  d.ZodDefault = he;
  he.create = (t, e) => new he({
    innerType: t,
    typeName: g.ZodDefault,
    defaultValue: typeof e.default == "function" ? e.default : () => e.default,
    ...b(e)
  });
  var ye = class extends x {
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
  d.ZodCatch = ye;
  ye.create = (t, e) => new ye({
    innerType: t,
    typeName: g.ZodCatch,
    catchValue: typeof e.catch == "function" ? e.catch : () => e.catch,
    ...b(e)
  });
  var Ce = class extends x {
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
  d.ZodNaN = Ce;
  Ce.create = (t) => new Ce({
    typeName: g.ZodNaN,
    ...b(t)
  });
  d.BRAND = Symbol("zod_brand");
  var Ge = class extends x {
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
  d.ZodBranded = Ge;
  var Ke = class t extends x {
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
  d.ZodPipeline = Ke;
  var ge = class extends x {
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
  d.ZodReadonly = ge;
  ge.create = (t, e) => new ge({
    innerType: t,
    typeName: g.ZodReadonly,
    ...b(e)
  });
  function Gn(t, e = {}, r) {
    return t ? Q.create().superRefine((n, s) => {
      var o, i;
      if (!t(n)) {
        let c = typeof e == "function" ? e(n) : typeof e == "string" ? { message: e } : e, l = (i = (o = c.fatal) !== null && o !== void 0 ?
        o : r) !== null && i !== void 0 ? i : !0, f = typeof c == "string" ? { message: c } : c;
        s.addIssue({ code: "custom", ...f, fatal: l });
      }
    }) : Q.create();
  }
  a(Gn, "custom");
  d.custom = Gn;
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
  var Yi = /* @__PURE__ */ a((t, e = {
    message: `Input not instance of ${t.name}`
  }) => Gn((r) => r instanceof t, e), "instanceOfType");
  d.instanceof = Yi;
  var Kn = X.create;
  d.string = Kn;
  var zn = ne.create;
  d.number = zn;
  var Xi = Ce.create;
  d.nan = Xi;
  var Qi = se.create;
  d.bigint = Qi;
  var qn = oe.create;
  d.boolean = qn;
  var ec = ae.create;
  d.date = ec;
  var tc = Te.create;
  d.symbol = tc;
  var rc = ie.create;
  d.undefined = rc;
  var nc = ce.create;
  d.null = nc;
  var sc = Q.create;
  d.any = sc;
  var oc = z.create;
  d.unknown = oc;
  var ac = $.create;
  d.never = ac;
  var ic = Ie.create;
  d.void = ic;
  var cc = q.create;
  d.array = cc;
  var dc = N.create;
  d.object = dc;
  var uc = N.strictCreate;
  d.strictObject = uc;
  var lc = de.create;
  d.union = lc;
  var fc = bt.create;
  d.discriminatedUnion = fc;
  var pc = ue.create;
  d.intersection = pc;
  var mc = B.create;
  d.tuple = mc;
  var hc = xt.create;
  d.record = hc;
  var yc = Se.create;
  d.map = yc;
  var gc = Ee.create;
  d.set = gc;
  var bc = vt.create;
  d.function = bc;
  var xc = le.create;
  d.lazy = xc;
  var vc = fe.create;
  d.literal = vc;
  var _c = pe.create;
  d.enum = _c;
  var wc = me.create;
  d.nativeEnum = wc;
  var kc = ee.create;
  d.promise = kc;
  var Jn = j.create;
  d.effect = Jn;
  d.transformer = Jn;
  var Tc = D.create;
  d.optional = Tc;
  var Ic = W.create;
  d.nullable = Ic;
  var Sc = j.createWithPreprocess;
  d.preprocess = Sc;
  var Ec = Ke.create;
  d.pipeline = Ec;
  var Cc = /* @__PURE__ */ a(() => Kn().optional(), "ostring");
  d.ostring = Cc;
  var Pc = /* @__PURE__ */ a(() => zn().optional(), "onumber");
  d.onumber = Pc;
  var Ac = /* @__PURE__ */ a(() => qn().optional(), "oboolean");
  d.oboolean = Ac;
  d.coerce = {
    string: /* @__PURE__ */ a((t) => X.create({ ...t, coerce: !0 }), "string"),
    number: /* @__PURE__ */ a((t) => ne.create({ ...t, coerce: !0 }), "number"),
    boolean: /* @__PURE__ */ a((t) => oe.create({
      ...t,
      coerce: !0
    }), "boolean"),
    bigint: /* @__PURE__ */ a((t) => se.create({ ...t, coerce: !0 }), "bigint"),
    date: /* @__PURE__ */ a((t) => ae.create({ ...t, coerce: !0 }), "date")
  };
  d.NEVER = u.INVALID;
});

// ../node_modules/zod/lib/external.js
var hr = S((U) => {
  "use strict";
  var Oc = U && U.__createBinding || (Object.create ? function(t, e, r, n) {
    n === void 0 && (n = r);
    var s = Object.getOwnPropertyDescriptor(e, r);
    (!s || ("get" in s ? !e.__esModule : s.writable || s.configurable)) && (s = { enumerable: !0, get: /* @__PURE__ */ a(function() {
      return e[r];
    }, "get") }), Object.defineProperty(t, n, s);
  } : function(t, e, r, n) {
    n === void 0 && (n = r), t[n] = e[r];
  }), Pe = U && U.__exportStar || function(t, e) {
    for (var r in t) r !== "default" && !Object.prototype.hasOwnProperty.call(e, r) && Oc(e, t, r);
  };
  Object.defineProperty(U, "__esModule", { value: !0 });
  Pe(mt(), U);
  Pe(fr(), U);
  Pe(Mn(), U);
  Pe(Ve(), U);
  Pe(Hn(), U);
  Pe(pt(), U);
});

// ../node_modules/zod/lib/index.js
var Qn = S((Z) => {
  "use strict";
  var Yn = Z && Z.__createBinding || (Object.create ? function(t, e, r, n) {
    n === void 0 && (n = r);
    var s = Object.getOwnPropertyDescriptor(e, r);
    (!s || ("get" in s ? !e.__esModule : s.writable || s.configurable)) && (s = { enumerable: !0, get: /* @__PURE__ */ a(function() {
      return e[r];
    }, "get") }), Object.defineProperty(t, n, s);
  } : function(t, e, r, n) {
    n === void 0 && (n = r), t[n] = e[r];
  }), Rc = Z && Z.__setModuleDefault || (Object.create ? function(t, e) {
    Object.defineProperty(t, "default", { enumerable: !0, value: e });
  } : function(t, e) {
    t.default = e;
  }), Nc = Z && Z.__importStar || function(t) {
    if (t && t.__esModule) return t;
    var e = {};
    if (t != null) for (var r in t) r !== "default" && Object.prototype.hasOwnProperty.call(t, r) && Yn(e, t, r);
    return Rc(e, t), e;
  }, Zc = Z && Z.__exportStar || function(t, e) {
    for (var r in t) r !== "default" && !Object.prototype.hasOwnProperty.call(e, r) && Yn(e, t, r);
  };
  Object.defineProperty(Z, "__esModule", { value: !0 });
  Z.z = void 0;
  var Xn = Nc(hr());
  Z.z = Xn;
  Zc(hr(), Z);
  Z.default = Xn;
});

// ../node_modules/ts-dedent/dist/index.js
var ts = S((ze) => {
  "use strict";
  Object.defineProperty(ze, "__esModule", { value: !0 });
  ze.dedent = void 0;
  function es(t) {
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
  a(es, "dedent");
  ze.dedent = es;
  ze.default = es;
});

// ../node_modules/isexe/windows.js
var us = S((Bl, ds) => {
  ds.exports = cs;
  cs.sync = Uc;
  var as = require("fs");
  function Lc(t, e) {
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
  a(Lc, "checkPathExt");
  function is(t, e, r) {
    return !t.isSymbolicLink() && !t.isFile() ? !1 : Lc(e, r);
  }
  a(is, "checkStat");
  function cs(t, e, r) {
    as.stat(t, function(n, s) {
      r(n, n ? !1 : is(s, t, e));
    });
  }
  a(cs, "isexe");
  function Uc(t, e) {
    return is(as.statSync(t), t, e);
  }
  a(Uc, "sync");
});

// ../node_modules/isexe/mode.js
var hs = S((Gl, ms) => {
  ms.exports = fs;
  fs.sync = $c;
  var ls = require("fs");
  function fs(t, e, r) {
    ls.stat(t, function(n, s) {
      r(n, n ? !1 : ps(s, e));
    });
  }
  a(fs, "isexe");
  function $c(t, e) {
    return ps(ls.statSync(t), e);
  }
  a($c, "sync");
  function ps(t, e) {
    return t.isFile() && Vc(t, e);
  }
  a(ps, "checkStat");
  function Vc(t, e) {
    var r = t.mode, n = t.uid, s = t.gid, o = e.uid !== void 0 ? e.uid : process.getuid && process.getuid(), i = e.gid !== void 0 ? e.gid : process.
    getgid && process.getgid(), c = parseInt("100", 8), l = parseInt("010", 8), f = parseInt("001", 8), p = c | l, v = r & f || r & l && s ===
    i || r & c && n === o || r & p && o === 0;
    return v;
  }
  a(Vc, "checkMode");
});

// ../node_modules/isexe/index.js
var gs = S((ql, ys) => {
  var zl = require("fs"), St;
  process.platform === "win32" || global.TESTING_WINDOWS ? St = us() : St = hs();
  ys.exports = yr;
  yr.sync = Fc;
  function yr(t, e, r) {
    if (typeof e == "function" && (r = e, e = {}), !r) {
      if (typeof Promise != "function")
        throw new TypeError("callback not provided");
      return new Promise(function(n, s) {
        yr(t, e || {}, function(o, i) {
          o ? s(o) : n(i);
        });
      });
    }
    St(t, e || {}, function(n, s) {
      n && (n.code === "EACCES" || e && e.ignoreErrors) && (n = null, s = !1), r(n, s);
    });
  }
  a(yr, "isexe");
  function Fc(t, e) {
    try {
      return St.sync(t, e || {});
    } catch (r) {
      if (e && e.ignoreErrors || r.code === "EACCES")
        return !1;
      throw r;
    }
  }
  a(Fc, "sync");
});

// ../node_modules/cross-spawn/node_modules/which/which.js
var Ts = S((Hl, ks) => {
  var Re = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys", bs = require("path"), Bc = Re ?
  ";" : ":", xs = gs(), vs = /* @__PURE__ */ a((t) => Object.assign(new Error(`not found: ${t}`), { code: "ENOENT" }), "getNotFoundError"), _s = /* @__PURE__ */ a(
  (t, e) => {
    let r = e.colon || Bc, n = t.match(/\//) || Re && t.match(/\\/) ? [""] : [
      // windows always checks the cwd first
      ...Re ? [process.cwd()] : [],
      ...(e.path || process.env.PATH || /* istanbul ignore next: very unusual */
      "").split(r)
    ], s = Re ? e.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "", o = Re ? s.split(r) : [""];
    return Re && t.indexOf(".") !== -1 && o[0] !== "" && o.unshift(""), {
      pathEnv: n,
      pathExt: o,
      pathExtExe: s
    };
  }, "getPathInfo"), ws = /* @__PURE__ */ a((t, e, r) => {
    typeof e == "function" && (r = e, e = {}), e || (e = {});
    let { pathEnv: n, pathExt: s, pathExtExe: o } = _s(t, e), i = [], c = /* @__PURE__ */ a((f) => new Promise((p, v) => {
      if (f === n.length)
        return e.all && i.length ? p(i) : v(vs(t));
      let _ = n[f], k = /^".*"$/.test(_) ? _.slice(1, -1) : _, A = bs.join(k, t), E = !k && /^\.[\\\/]/.test(t) ? t.slice(0, 2) + A : A;
      p(l(E, f, 0));
    }), "step"), l = /* @__PURE__ */ a((f, p, v) => new Promise((_, k) => {
      if (v === s.length)
        return _(c(p + 1));
      let A = s[v];
      xs(f + A, { pathExt: o }, (E, P) => {
        if (!E && P)
          if (e.all)
            i.push(f + A);
          else
            return _(f + A);
        return _(l(f, p, v + 1));
      });
    }), "subStep");
    return r ? c(0).then((f) => r(null, f), r) : c(0);
  }, "which"), Wc = /* @__PURE__ */ a((t, e) => {
    e = e || {};
    let { pathEnv: r, pathExt: n, pathExtExe: s } = _s(t, e), o = [];
    for (let i = 0; i < r.length; i++) {
      let c = r[i], l = /^".*"$/.test(c) ? c.slice(1, -1) : c, f = bs.join(l, t), p = !l && /^\.[\\\/]/.test(t) ? t.slice(0, 2) + f : f;
      for (let v = 0; v < n.length; v++) {
        let _ = p + n[v];
        try {
          if (xs.sync(_, { pathExt: s }))
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
    throw vs(t);
  }, "whichSync");
  ks.exports = ws;
  ws.sync = Wc;
});

// ../node_modules/path-key/index.js
var Ss = S((Xl, gr) => {
  "use strict";
  var Is = /* @__PURE__ */ a((t = {}) => {
    let e = t.env || process.env;
    return (t.platform || process.platform) !== "win32" ? "PATH" : Object.keys(e).reverse().find((n) => n.toUpperCase() === "PATH") || "Path";
  }, "pathKey");
  gr.exports = Is;
  gr.exports.default = Is;
});

// ../node_modules/cross-spawn/lib/util/resolveCommand.js
var As = S((ef, Ps) => {
  "use strict";
  var Es = require("path"), Gc = Ts(), Kc = Ss();
  function Cs(t, e) {
    let r = t.options.env || process.env, n = process.cwd(), s = t.options.cwd != null, o = s && process.chdir !== void 0 && !process.chdir.
    disabled;
    if (o)
      try {
        process.chdir(t.options.cwd);
      } catch {
      }
    let i;
    try {
      i = Gc.sync(t.command, {
        path: r[Kc({ env: r })],
        pathExt: e ? Es.delimiter : void 0
      });
    } catch {
    } finally {
      o && process.chdir(n);
    }
    return i && (i = Es.resolve(s ? t.options.cwd : "", i)), i;
  }
  a(Cs, "resolveCommandAttempt");
  function zc(t) {
    return Cs(t) || Cs(t, !0);
  }
  a(zc, "resolveCommand");
  Ps.exports = zc;
});

// ../node_modules/cross-spawn/lib/util/escape.js
var Os = S((rf, xr) => {
  "use strict";
  var br = /([()\][%!^"`<>&|;, *?])/g;
  function qc(t) {
    return t = t.replace(br, "^$1"), t;
  }
  a(qc, "escapeCommand");
  function Jc(t, e) {
    return t = `${t}`, t = t.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"'), t = t.replace(/(?=(\\+?)?)\1$/, "$1$1"), t = `"${t}"`, t = t.replace(br,
    "^$1"), e && (t = t.replace(br, "^$1")), t;
  }
  a(Jc, "escapeArgument");
  xr.exports.command = qc;
  xr.exports.argument = Jc;
});

// ../node_modules/shebang-regex/index.js
var Ns = S((sf, Rs) => {
  "use strict";
  Rs.exports = /^#!(.*)/;
});

// ../node_modules/shebang-command/index.js
var js = S((of, Zs) => {
  "use strict";
  var Hc = Ns();
  Zs.exports = (t = "") => {
    let e = t.match(Hc);
    if (!e)
      return null;
    let [r, n] = e[0].replace(/#! ?/, "").split(" "), s = r.split("/").pop();
    return s === "env" ? n : n ? `${s} ${n}` : s;
  };
});

// ../node_modules/cross-spawn/lib/util/readShebang.js
var Ds = S((af, Ms) => {
  "use strict";
  var vr = require("fs"), Yc = js();
  function Xc(t) {
    let r = Buffer.alloc(150), n;
    try {
      n = vr.openSync(t, "r"), vr.readSync(n, r, 0, 150, 0), vr.closeSync(n);
    } catch {
    }
    return Yc(r.toString());
  }
  a(Xc, "readShebang");
  Ms.exports = Xc;
});

// ../node_modules/cross-spawn/lib/parse.js
var Vs = S((df, $s) => {
  "use strict";
  var Qc = require("path"), Ls = As(), Us = Os(), ed = Ds(), td = process.platform === "win32", rd = /\.(?:com|exe)$/i, nd = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
  function sd(t) {
    t.file = Ls(t);
    let e = t.file && ed(t.file);
    return e ? (t.args.unshift(t.file), t.command = e, Ls(t)) : t.file;
  }
  a(sd, "detectShebang");
  function od(t) {
    if (!td)
      return t;
    let e = sd(t), r = !rd.test(e);
    if (t.options.forceShell || r) {
      let n = nd.test(e);
      t.command = Qc.normalize(t.command), t.command = Us.command(t.command), t.args = t.args.map((o) => Us.argument(o, n));
      let s = [t.command].concat(t.args).join(" ");
      t.args = ["/d", "/s", "/c", `"${s}"`], t.command = process.env.comspec || "cmd.exe", t.options.windowsVerbatimArguments = !0;
    }
    return t;
  }
  a(od, "parseNonShell");
  function ad(t, e, r) {
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
    return r.shell ? n : od(n);
  }
  a(ad, "parse");
  $s.exports = ad;
});

// ../node_modules/cross-spawn/lib/enoent.js
var Ws = S((lf, Bs) => {
  "use strict";
  var _r = process.platform === "win32";
  function wr(t, e) {
    return Object.assign(new Error(`${e} ${t.command} ENOENT`), {
      code: "ENOENT",
      errno: "ENOENT",
      syscall: `${e} ${t.command}`,
      path: t.command,
      spawnargs: t.args
    });
  }
  a(wr, "notFoundError");
  function id(t, e) {
    if (!_r)
      return;
    let r = t.emit;
    t.emit = function(n, s) {
      if (n === "exit") {
        let o = Fs(s, e);
        if (o)
          return r.call(t, "error", o);
      }
      return r.apply(t, arguments);
    };
  }
  a(id, "hookChildProcess");
  function Fs(t, e) {
    return _r && t === 1 && !e.file ? wr(e.original, "spawn") : null;
  }
  a(Fs, "verifyENOENT");
  function cd(t, e) {
    return _r && t === 1 && !e.file ? wr(e.original, "spawnSync") : null;
  }
  a(cd, "verifyENOENTSync");
  Bs.exports = {
    hookChildProcess: id,
    verifyENOENT: Fs,
    verifyENOENTSync: cd,
    notFoundError: wr
  };
});

// ../node_modules/cross-spawn/index.js
var zs = S((pf, Ne) => {
  "use strict";
  var Gs = require("child_process"), kr = Vs(), Tr = Ws();
  function Ks(t, e, r) {
    let n = kr(t, e, r), s = Gs.spawn(n.command, n.args, n.options);
    return Tr.hookChildProcess(s, n), s;
  }
  a(Ks, "spawn");
  function dd(t, e, r) {
    let n = kr(t, e, r), s = Gs.spawnSync(n.command, n.args, n.options);
    return s.error = s.error || Tr.verifyENOENTSync(s.status, n), s;
  }
  a(dd, "spawnSync");
  Ne.exports = Ks;
  Ne.exports.spawn = Ks;
  Ne.exports.sync = dd;
  Ne.exports._parse = kr;
  Ne.exports._enoent = Tr;
});

// ../node_modules/merge-stream/index.js
var Eo = S((Ap, So) => {
  "use strict";
  var { PassThrough: Qd } = require("stream");
  So.exports = function() {
    var t = [], e = new Qd({ objectMode: !0 });
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
var na = S((um, ra) => {
  "use strict";
  var { sep: pu } = require("path"), mu = /* @__PURE__ */ a((t) => {
    for (let e of t) {
      let r = /(\/|\\)/.exec(e);
      if (r !== null) return r[0];
    }
    return pu;
  }, "determineSeparator");
  ra.exports = /* @__PURE__ */ a(function(e, r = mu(e)) {
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
var Da = S((fy, Ma) => {
  "use strict";
  Ma.exports = function(t, e) {
    if (e = e || {}, typeof t != "function")
      throw new te("fetch must be a function");
    if (typeof e != "object")
      throw new te("defaults must be an object");
    if (e.retries !== void 0 && !zt(e.retries))
      throw new te("retries must be a positive integer");
    if (e.retryDelay !== void 0 && !zt(e.retryDelay) && typeof e.retryDelay != "function")
      throw new te("retryDelay must be a positive integer or a function returning a positive integer");
    if (e.retryOn !== void 0 && !Array.isArray(e.retryOn) && typeof e.retryOn != "function")
      throw new te("retryOn property expects an array or function");
    var r = {
      retries: 3,
      retryDelay: 1e3,
      retryOn: []
    };
    return e = Object.assign(r, e), /* @__PURE__ */ a(function(s, o) {
      var i = e.retries, c = e.retryDelay, l = e.retryOn;
      if (o && o.retries !== void 0)
        if (zt(o.retries))
          i = o.retries;
        else
          throw new te("retries must be a positive integer");
      if (o && o.retryDelay !== void 0)
        if (zt(o.retryDelay) || typeof o.retryDelay == "function")
          c = o.retryDelay;
        else
          throw new te("retryDelay must be a positive integer or a function returning a positive integer");
      if (o && o.retryOn)
        if (Array.isArray(o.retryOn) || typeof o.retryOn == "function")
          l = o.retryOn;
        else
          throw new te("retryOn property expects an array or function");
      return new Promise(function(f, p) {
        var v = /* @__PURE__ */ a(function(k) {
          var A = typeof Request < "u" && s instanceof Request ? s.clone() : s;
          t(A, o).then(function(E) {
            if (Array.isArray(l) && l.indexOf(E.status) === -1)
              f(E);
            else if (typeof l == "function")
              try {
                return Promise.resolve(l(k, null, E)).then(function(P) {
                  P ? _(k, null, E) : f(E);
                }).catch(p);
              } catch (P) {
                p(P);
              }
            else
              k < i ? _(k, null, E) : f(E);
          }).catch(function(E) {
            if (typeof l == "function")
              try {
                Promise.resolve(l(k, E, null)).then(function(P) {
                  P ? _(k, E, null) : p(E);
                }).catch(function(P) {
                  p(P);
                });
              } catch (P) {
                p(P);
              }
            else k < i ? _(k, E, null) : p(E);
          });
        }, "wrappedFetch");
        function _(k, A, E) {
          var P = typeof c == "function" ? c(k, A, E) : c;
          setTimeout(function() {
            v(++k);
          }, P);
        }
        a(_, "retry"), v(0);
      });
    }, "fetchRetry");
  };
  function zt(t) {
    return Number.isInteger(t) && t >= 0;
  }
  a(zt, "isPositiveInteger");
  function te(t) {
    this.name = "ArgumentError", this.message = t;
  }
  a(te, "ArgumentError");
});

// src/telemetry/index.ts
var zu = {};
ni(zu, {
  addToGlobalContext: () => Ha,
  cleanPaths: () => we,
  computeStorybookMetadata: () => ja,
  getPrecedingUpgrade: () => Ka,
  getStorybookMetadata: () => an,
  isExampleStoryId: () => Gu,
  metaFrameworks: () => sn,
  oneWayHash: () => qt,
  removeAnsiEscapeCodes: () => er,
  sanitizeAddonName: () => on,
  sanitizeError: () => $e,
  telemetry: () => Ku
});
module.exports = si(zu);
var pn = require("@storybook/core/node-logger");

// src/telemetry/notify.ts
var Qt = require("@storybook/core/common"), ut = T(gn(), 1);
var bn = "telemetry-notification-date", _e = console, xn = /* @__PURE__ */ a(async () => {
  await Qt.cache.get(bn, null) || (Qt.cache.set(bn, Date.now()), _e.log(), _e.log(
    `${ut.default.magenta(
      ut.default.bold("attention")
    )} => Storybook now collects completely anonymous telemetry regarding usage.`
  ), _e.log("This information is used to shape Storybook's roadmap and prioritize features."), _e.log(
    "You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:"
  ), _e.log(ut.default.cyan("https://storybook.js.org/telemetry")), _e.log());
}, "notify");

// src/telemetry/sanitize.ts
var tr = T(require("node:path"), 1);
function vn(t) {
  return t.replace(/[-[/{}()*+?.\\^$|]/g, "\\$&");
}
a(vn, "regexpEscape");
function er(t = "") {
  return t.replace(/\u001B\[[0-9;]*m/g, "");
}
a(er, "removeAnsiEscapeCodes");
function we(t, e = tr.default.sep) {
  if (!t)
    return t;
  let r = process.cwd().split(e);
  for (; r.length > 1; ) {
    let n = r.join(e), s = new RegExp(vn(n), "gi");
    t = t.replace(s, "$SNIP");
    let o = r.join(e + e), i = new RegExp(vn(o), "gi");
    t = t.replace(i, "$SNIP"), r.pop();
  }
  return t;
}
a(we, "cleanPaths");
function $e(t, e = tr.default.sep) {
  try {
    t = {
      ...JSON.parse(JSON.stringify(t)),
      message: er(t.message),
      stack: er(t.stack),
      cause: t.cause,
      name: t.name
    };
    let r = we(JSON.stringify(t), e);
    return JSON.parse(r);
  } catch (r) {
    return `Sanitization error: ${r?.message}`;
  }
}
a($e, "sanitizeError");

// src/telemetry/storybook-metadata.ts
var Na = require("node:path"), G = require("@storybook/core/common"), Za = require("@storybook/core/csf-tools");

// ../node_modules/fd-package-json/dist/esm/main.js
var kn = T(wn(), 1), Tn = require("node:path"), ft = require("node:fs/promises"), In = require("node:fs");
async function di(t) {
  try {
    return (await (0, ft.stat)(t)).isFile();
  } catch {
    return !1;
  }
}
a(di, "fileExists");
async function rr(t) {
  for (let e of (0, kn.walkUp)(t)) {
    let r = (0, Tn.resolve)(e, "package.json");
    if (await di(r))
      return r;
  }
  return null;
}
a(rr, "findPackagePath");
async function Sn(t) {
  let e = await rr(t);
  if (!e)
    return null;
  try {
    let r = await (0, ft.readFile)(e, { encoding: "utf8" });
    return JSON.parse(r);
  } catch {
    return null;
  }
}
a(Sn, "findPackage");

// ../node_modules/package-manager-detector/dist/constants.mjs
var En = [
  "npm",
  "yarn",
  "yarn@berry",
  "pnpm",
  "pnpm@6",
  "bun",
  "deno"
], nr = {
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "deno.lock": "deno",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm"
}, sr = {
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
var ar = T(require("node:fs/promises"), 1), H = T(require("node:path"), 1), Pn = T(require("node:process"), 1);
async function or(t, e) {
  try {
    let r = await ar.default.stat(t);
    return e === "file" ? r.isFile() : r.isDirectory();
  } catch {
    return !1;
  }
}
a(or, "pathExists");
function* ui(t = Pn.default.cwd()) {
  let e = H.default.resolve(t), { root: r } = H.default.parse(e);
  for (; e && e !== r; )
    yield e, e = H.default.dirname(e);
}
a(ui, "lookup");
async function Cn(t, e) {
  return !t || !or(t, "file") ? null : await fi(t, e);
}
a(Cn, "parsePackageJson");
async function ir(t = {}) {
  let { cwd: e, strategies: r = ["lockfile", "packageManager-field", "devEngines-field"], onUnknown: n } = t;
  for (let s of ui(e))
    for (let o of r)
      switch (o) {
        case "lockfile": {
          for (let i of Object.keys(nr))
            if (await or(H.default.join(s, i), "file")) {
              let c = nr[i], l = await Cn(H.default.join(s, "package.json"), n);
              return l || { name: c, agent: c };
            }
          break;
        }
        case "packageManager-field":
        case "devEngines-field": {
          let i = await Cn(H.default.join(s, "package.json"), n);
          if (i)
            return i;
          break;
        }
        case "install-metadata": {
          for (let i of Object.keys(sr)) {
            let c = i.endsWith("/") ? "dir" : "file";
            if (await or(H.default.join(s, i), c)) {
              let l = sr[i], f = l === "yarn" ? pi(i) ? "yarn" : "yarn@berry" : l;
              return { name: l, agent: f };
            }
          }
          break;
        }
      }
  return null;
}
a(ir, "detect");
function li(t) {
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
a(li, "getNameAndVer");
async function fi(t, e) {
  try {
    let r = JSON.parse(await ar.default.readFile(t, "utf8")), n, s = li(r);
    if (s) {
      let o = s.name, i = s.ver, c = i;
      return o === "yarn" && i && Number.parseInt(i) > 1 ? (n = "yarn@berry", c = "berry", { name: o, agent: n, version: c }) : o === "pnpm" &&
      i && Number.parseInt(i) < 7 ? (n = "pnpm@6", { name: o, agent: n, version: c }) : En.includes(o) ? (n = o, { name: o, agent: n, version: c }) :
      e?.(r.packageManager) ?? null;
    }
  } catch {
  }
  return null;
}
a(fi, "handlePackageManager");
function pi(t) {
  return t.endsWith(".yarn_integrity");
}
a(pi, "isMetadataYarnClassic");

// ../node_modules/package-manager-detector/dist/index.mjs
var ul = require("node:fs/promises"), ll = require("node:path"), fl = require("node:process");

// src/cli/globalSettings.ts
var kt = T(require("node:fs/promises"), 1), ss = require("node:os"), It = require("node:path"), Oe = T(Qn(), 1);

// src/server-errors.ts
var ns = T(ts(), 1);

// src/storybook-error.ts
function rs({
  code: t,
  category: e
}) {
  let r = String(t).padStart(4, "0");
  return `SB_${e}_${r}`;
}
a(rs, "parseErrorCode");
var _t = class t extends Error {
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
    return rs({ code: this.code, category: this.category });
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
    return r === !0 ? i = `https://storybook.js.org/error/${rs({ code: n, category: s })}` : typeof r == "string" ? i = r : Array.isArray(r) &&
    (i = `
${r.map((c) => `	- ${c}`).join(`
`)}`), `${o}${i != null ? `

More info: ${i}
` : ""}`;
  }
};

// src/server-errors.ts
var wt = class extends _t {
  constructor(r) {
    super({
      category: "CORE-SERVER",
      code: 1,
      message: ns.dedent`
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
var jc = (0, It.join)((0, ss.homedir)(), ".storybook", "settings.json"), Mc = 1, Dc = Oe.z.object({
  version: Oe.z.number(),
  // NOTE: every key (and subkey) below must be optional, for forwards compatibility reasons
  // (we can remove keys once they are deprecated)
  userSince: Oe.z.number().optional(),
  init: Oe.z.object({ skipOnboarding: Oe.z.boolean().optional() }).optional()
}), Ae;
async function os(t = jc) {
  if (Ae)
    return Ae;
  try {
    let e = await kt.default.readFile(t, "utf8"), r = Dc.parse(JSON.parse(e));
    Ae = new Tt(t, r);
  } catch {
    Ae = new Tt(t, { version: Mc, userSince: Date.now() }), await Ae.save();
  }
  return Ae;
}
a(os, "globalSettings");
var Tt = class {
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
      await kt.default.mkdir((0, It.dirname)(this.filePath), { recursive: !0 }), await kt.default.writeFile(this.filePath, JSON.stringify(this.
      value, null, 2));
    } catch (e) {
      throw new wt({
        filePath: this.filePath,
        error: e
      });
    }
  }
};

// src/telemetry/get-application-file-count.ts
var xa = require("node:path");

// src/telemetry/exec-command-count-lines.ts
var ea = require("node:readline");

// ../node_modules/execa/index.js
var zo = require("node:buffer"), qo = T(require("node:path"), 1), $t = T(require("node:child_process"), 1), Ye = T(require("node:process"), 1),
Jo = T(zs(), 1);

// ../node_modules/strip-final-newline/index.js
function Ir(t) {
  let e = typeof t == "string" ? `
` : 10, r = typeof t == "string" ? "\r" : 13;
  return t[t.length - 1] === e && (t = t.slice(0, -1)), t[t.length - 1] === r && (t = t.slice(0, -1)), t;
}
a(Ir, "stripFinalNewline");

// ../node_modules/execa/node_modules/npm-run-path/index.js
var qe = T(require("node:process"), 1), Ze = T(require("node:path"), 1), qs = T(require("node:url"), 1);

// ../node_modules/execa/node_modules/path-key/index.js
function Et(t = {}) {
  let {
    env: e = process.env,
    platform: r = process.platform
  } = t;
  return r !== "win32" ? "PATH" : Object.keys(e).reverse().find((n) => n.toUpperCase() === "PATH") || "Path";
}
a(Et, "pathKey");

// ../node_modules/execa/node_modules/npm-run-path/index.js
function ud(t = {}) {
  let {
    cwd: e = qe.default.cwd(),
    path: r = qe.default.env[Et()],
    execPath: n = qe.default.execPath
  } = t, s, o = e instanceof URL ? qs.default.fileURLToPath(e) : e, i = Ze.default.resolve(o), c = [];
  for (; s !== i; )
    c.push(Ze.default.join(i, "node_modules/.bin")), s = i, i = Ze.default.resolve(i, "..");
  return c.push(Ze.default.resolve(o, n, "..")), [...c, r].join(Ze.default.delimiter);
}
a(ud, "npmRunPath");
function Js({ env: t = qe.default.env, ...e } = {}) {
  t = { ...t };
  let r = Et({ env: t });
  return e.path = t[r], t[r] = ud(e), t;
}
a(Js, "npmRunPathEnv");

// ../node_modules/execa/node_modules/mimic-fn/index.js
var ld = /* @__PURE__ */ a((t, e, r, n) => {
  if (r === "length" || r === "prototype" || r === "arguments" || r === "caller")
    return;
  let s = Object.getOwnPropertyDescriptor(t, r), o = Object.getOwnPropertyDescriptor(e, r);
  !fd(s, o) && n || Object.defineProperty(t, r, o);
}, "copyProperty"), fd = /* @__PURE__ */ a(function(t, e) {
  return t === void 0 || t.configurable || t.writable === e.writable && t.enumerable === e.enumerable && t.configurable === e.configurable &&
  (t.writable || t.value === e.value);
}, "canCopyProperty"), pd = /* @__PURE__ */ a((t, e) => {
  let r = Object.getPrototypeOf(e);
  r !== Object.getPrototypeOf(t) && Object.setPrototypeOf(t, r);
}, "changePrototype"), md = /* @__PURE__ */ a((t, e) => `/* Wrapped ${t}*/
${e}`, "wrappedToString"), hd = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), yd = Object.getOwnPropertyDescriptor(Function.
prototype.toString, "name"), gd = /* @__PURE__ */ a((t, e, r) => {
  let n = r === "" ? "" : `with ${r.trim()}() `, s = md.bind(null, n, e.toString());
  Object.defineProperty(s, "name", yd), Object.defineProperty(t, "toString", { ...hd, value: s });
}, "changeToString");
function Sr(t, e, { ignoreNonConfigurable: r = !1 } = {}) {
  let { name: n } = t;
  for (let s of Reflect.ownKeys(e))
    ld(t, e, s, r);
  return pd(t, e), gd(t, e, n), t;
}
a(Sr, "mimicFunction");

// ../node_modules/execa/node_modules/onetime/index.js
var Ct = /* @__PURE__ */ new WeakMap(), Hs = /* @__PURE__ */ a((t, e = {}) => {
  if (typeof t != "function")
    throw new TypeError("Expected a function");
  let r, n = 0, s = t.displayName || t.name || "<anonymous>", o = /* @__PURE__ */ a(function(...i) {
    if (Ct.set(o, ++n), n === 1)
      r = t.apply(this, i), t = null;
    else if (e.throw === !0)
      throw new Error(`Function \`${s}\` can only be called once`);
    return r;
  }, "onetime");
  return Sr(o, t), Ct.set(o, n), o;
}, "onetime");
Hs.callCount = (t) => {
  if (!Ct.has(t))
    throw new Error(`The given function \`${t.name}\` is not wrapped by the \`onetime\` package`);
  return Ct.get(t);
};
var Ys = Hs;

// ../node_modules/execa/lib/error.js
var so = T(require("node:process"), 1);

// ../node_modules/execa/node_modules/human-signals/build/src/main.js
var ro = require("node:os");

// ../node_modules/execa/node_modules/human-signals/build/src/realtime.js
var Xs = /* @__PURE__ */ a(() => {
  let t = Er - Qs + 1;
  return Array.from({ length: t }, bd);
}, "getRealtimeSignals"), bd = /* @__PURE__ */ a((t, e) => ({
  name: `SIGRT${e + 1}`,
  number: Qs + e,
  action: "terminate",
  description: "Application-specific signal (realtime)",
  standard: "posix"
}), "getRealtimeSignal"), Qs = 34, Er = 64;

// ../node_modules/execa/node_modules/human-signals/build/src/signals.js
var to = require("node:os");

// ../node_modules/execa/node_modules/human-signals/build/src/core.js
var eo = [
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
var Cr = /* @__PURE__ */ a(() => {
  let t = Xs();
  return [...eo, ...t].map(xd);
}, "getSignals"), xd = /* @__PURE__ */ a(({
  name: t,
  number: e,
  description: r,
  action: n,
  forced: s = !1,
  standard: o
}) => {
  let {
    signals: { [t]: i }
  } = to.constants, c = i !== void 0;
  return { name: t, number: c ? i : e, description: r, supported: c, action: n, forced: s, standard: o };
}, "normalizeSignal");

// ../node_modules/execa/node_modules/human-signals/build/src/main.js
var vd = /* @__PURE__ */ a(() => {
  let t = Cr();
  return Object.fromEntries(t.map(_d));
}, "getSignalsByName"), _d = /* @__PURE__ */ a(({
  name: t,
  number: e,
  description: r,
  supported: n,
  action: s,
  forced: o,
  standard: i
}) => [t, { name: t, number: e, description: r, supported: n, action: s, forced: o, standard: i }], "getSignalByName"), no = vd(), wd = /* @__PURE__ */ a(
() => {
  let t = Cr(), e = Er + 1, r = Array.from(
    { length: e },
    (n, s) => kd(s, t)
  );
  return Object.assign({}, ...r);
}, "getSignalsByNumber"), kd = /* @__PURE__ */ a((t, e) => {
  let r = Td(t, e);
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
}, "getSignalByNumber"), Td = /* @__PURE__ */ a((t, e) => {
  let r = e.find(({ name: n }) => ro.constants.signals[n] === t);
  return r !== void 0 ? r : e.find((n) => n.number === t);
}, "findSignalByNumber"), Mf = wd();

// ../node_modules/execa/lib/error.js
var Id = /* @__PURE__ */ a(({ timedOut: t, timeout: e, errorCode: r, signal: n, signalDescription: s, exitCode: o, isCanceled: i }) => t ? `\
timed out after ${e} milliseconds` : i ? "was canceled" : r !== void 0 ? `failed with ${r}` : n !== void 0 ? `was killed with ${n} (${s})` :
o !== void 0 ? `failed with exit code ${o}` : "failed", "getErrorPrefix"), Je = /* @__PURE__ */ a(({
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
  parsed: { options: { timeout: v, cwd: _ = so.default.cwd() } }
}) => {
  o = o === null ? void 0 : o, s = s === null ? void 0 : s;
  let k = s === void 0 ? void 0 : no[s].description, A = n && n.code, P = `Command ${Id({ timedOut: l, timeout: v, errorCode: A, signal: s, signalDescription: k,
  exitCode: o, isCanceled: f })}: ${i}`, Le = Object.prototype.toString.call(n) === "[object Error]", ve = Le ? `${P}
${n.message}` : P, J = [ve, e, t].filter(Boolean).join(`
`);
  return Le ? (n.originalMessage = n.message, n.message = J) : n = new Error(J), n.shortMessage = ve, n.command = i, n.escapedCommand = c, n.
  exitCode = o, n.signal = s, n.signalDescription = k, n.stdout = t, n.stderr = e, n.cwd = _, r !== void 0 && (n.all = r), "bufferedData" in
  n && delete n.bufferedData, n.failed = !0, n.timedOut = !!l, n.isCanceled = f, n.killed = p && !l, n;
}, "makeError");

// ../node_modules/execa/lib/stdio.js
var Pt = ["stdin", "stdout", "stderr"], Sd = /* @__PURE__ */ a((t) => Pt.some((e) => t[e] !== void 0), "hasAlias"), oo = /* @__PURE__ */ a((t) => {
  if (!t)
    return;
  let { stdio: e } = t;
  if (e === void 0)
    return Pt.map((n) => t[n]);
  if (Sd(t))
    throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${Pt.map((n) => `\`${n}\``).join(", ")}`);
  if (typeof e == "string")
    return e;
  if (!Array.isArray(e))
    throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof e}\``);
  let r = Math.max(e.length, Pt.length);
  return Array.from({ length: r }, (n, s) => e[s]);
}, "normalizeStdio");

// ../node_modules/execa/lib/kill.js
var io = T(require("node:os"), 1);

// ../node_modules/execa/node_modules/signal-exit/dist/mjs/signals.js
var be = [];
be.push("SIGHUP", "SIGINT", "SIGTERM");
process.platform !== "win32" && be.push(
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
process.platform === "linux" && be.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");

// ../node_modules/execa/node_modules/signal-exit/dist/mjs/index.js
var At = /* @__PURE__ */ a((t) => !!t && typeof t == "object" && typeof t.removeListener == "function" && typeof t.emit == "function" && typeof t.
reallyExit == "function" && typeof t.listeners == "function" && typeof t.kill == "function" && typeof t.pid == "number" && typeof t.on == "f\
unction", "processOk"), Pr = Symbol.for("signal-exit emitter"), Ar = globalThis, Ed = Object.defineProperty.bind(Object), Or = class {
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
    if (Ar[Pr])
      return Ar[Pr];
    Ed(Ar, Pr, {
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
}, Ot = class {
  static {
    a(this, "SignalExitBase");
  }
}, Cd = /* @__PURE__ */ a((t) => ({
  onExit(e, r) {
    return t.onExit(e, r);
  },
  load() {
    return t.load();
  },
  unload() {
    return t.unload();
  }
}), "signalExitWrap"), Rr = class extends Ot {
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
}, Nr = class extends Ot {
  static {
    a(this, "SignalExit");
  }
  // "SIGHUP" throws an `ENOSYS` error on Windows,
  // so use a supported signal instead
  /* c8 ignore start */
  #a = Zr.platform === "win32" ? "SIGINT" : "SIGHUP";
  /* c8 ignore stop */
  #t = new Or();
  #e;
  #s;
  #o;
  #n = {};
  #r = !1;
  constructor(e) {
    super(), this.#e = e, this.#n = {};
    for (let r of be)
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
    if (!At(this.#e))
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
      for (let e of be)
        try {
          let r = this.#n[e];
          r && this.#e.on(e, r);
        } catch {
        }
      this.#e.emit = (e, ...r) => this.#c(e, ...r), this.#e.reallyExit = (e) => this.#i(e);
    }
  }
  unload() {
    this.#r && (this.#r = !1, be.forEach((e) => {
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
    return At(this.#e) ? (this.#e.exitCode = e || 0, this.#t.emit("exit", this.#e.exitCode, null), this.#o.call(this.#e, this.#e.exitCode)) :
    0;
  }
  #c(e, ...r) {
    let n = this.#s;
    if (e === "exit" && At(this.#e)) {
      typeof r[0] == "number" && (this.#e.exitCode = r[0]);
      let s = n.call(this.#e, e, ...r);
      return this.#t.emit("exit", this.#e.exitCode, null), s;
    } else
      return n.call(this.#e, e, ...r);
  }
}, Zr = globalThis.process, {
  /**
   * Called when the process is exiting, whether via signal, explicit
   * exit, or running out of stuff to do.
   *
   * If the global process object is not suitable for instrumentation,
   * then this will be a no-op.
   *
   * Returns a function that may be used to unload signal-exit.
   */
  onExit: ao,
  /**
   * Load the listeners.  Likely you never need to call this, unless
   * doing a rather deep integration with signal-exit functionality.
   * Mostly exposed for the benefit of testing.
   *
   * @internal
   */
  load: Kf,
  /**
   * Unload the listeners.  Likely you never need to call this, unless
   * doing a rather deep integration with signal-exit functionality.
   * Mostly exposed for the benefit of testing.
   *
   * @internal
   */
  unload: zf
} = Cd(At(Zr) ? new Nr(Zr) : new Rr());

// ../node_modules/execa/lib/kill.js
var Pd = 1e3 * 5, co = /* @__PURE__ */ a((t, e = "SIGTERM", r = {}) => {
  let n = t(e);
  return Ad(t, e, r, n), n;
}, "spawnedKill"), Ad = /* @__PURE__ */ a((t, e, r, n) => {
  if (!Od(e, r, n))
    return;
  let s = Nd(r), o = setTimeout(() => {
    t("SIGKILL");
  }, s);
  o.unref && o.unref();
}, "setKillTimeout"), Od = /* @__PURE__ */ a((t, { forceKillAfterTimeout: e }, r) => Rd(t) && e !== !1 && r, "shouldForceKill"), Rd = /* @__PURE__ */ a(
(t) => t === io.default.constants.signals.SIGTERM || typeof t == "string" && t.toUpperCase() === "SIGTERM", "isSigterm"), Nd = /* @__PURE__ */ a(
({ forceKillAfterTimeout: t = !0 }) => {
  if (t === !0)
    return Pd;
  if (!Number.isFinite(t) || t < 0)
    throw new TypeError(`Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${t}\` (${typeof t})`);
  return t;
}, "getForceKillAfterTimeout"), uo = /* @__PURE__ */ a((t, e) => {
  t.kill() && (e.isCanceled = !0);
}, "spawnedCancel"), Zd = /* @__PURE__ */ a((t, e, r) => {
  t.kill(e), r(Object.assign(new Error("Timed out"), { timedOut: !0, signal: e }));
}, "timeoutKill"), lo = /* @__PURE__ */ a((t, { timeout: e, killSignal: r = "SIGTERM" }, n) => {
  if (e === 0 || e === void 0)
    return n;
  let s, o = new Promise((c, l) => {
    s = setTimeout(() => {
      Zd(t, r, l);
    }, e);
  }), i = n.finally(() => {
    clearTimeout(s);
  });
  return Promise.race([o, i]);
}, "setupTimeout"), fo = /* @__PURE__ */ a(({ timeout: t }) => {
  if (t !== void 0 && (!Number.isFinite(t) || t < 0))
    throw new TypeError(`Expected the \`timeout\` option to be a non-negative integer, got \`${t}\` (${typeof t})`);
}, "validateTimeout"), po = /* @__PURE__ */ a(async (t, { cleanup: e, detached: r }, n) => {
  if (!e || r)
    return n;
  let s = ao(() => {
    t.kill();
  });
  return n.finally(() => {
    s();
  });
}, "setExitHandler");

// ../node_modules/execa/lib/pipe.js
var mo = require("node:fs"), ho = require("node:child_process");

// ../node_modules/execa/node_modules/is-stream/index.js
function Rt(t) {
  return t !== null && typeof t == "object" && typeof t.pipe == "function";
}
a(Rt, "isStream");
function jr(t) {
  return Rt(t) && t.writable !== !1 && typeof t._write == "function" && typeof t._writableState == "object";
}
a(jr, "isWritableStream");

// ../node_modules/execa/lib/pipe.js
var jd = /* @__PURE__ */ a((t) => t instanceof ho.ChildProcess && typeof t.then == "function", "isExecaChildProcess"), Mr = /* @__PURE__ */ a(
(t, e, r) => {
  if (typeof r == "string")
    return t[e].pipe((0, mo.createWriteStream)(r)), t;
  if (jr(r))
    return t[e].pipe(r), t;
  if (!jd(r))
    throw new TypeError("The second argument must be a string, a stream or an Execa child process.");
  if (!jr(r.stdin))
    throw new TypeError("The target child process's stdin must be available.");
  return t[e].pipe(r.stdin), r;
}, "pipeToTarget"), yo = /* @__PURE__ */ a((t) => {
  t.stdout !== null && (t.pipeStdout = Mr.bind(void 0, t, "stdout")), t.stderr !== null && (t.pipeStderr = Mr.bind(void 0, t, "stderr")), t.
  all !== void 0 && (t.pipeAll = Mr.bind(void 0, t, "all"));
}, "addPipeMethods");

// ../node_modules/execa/lib/stream.js
var Lt = require("node:fs"), Co = require("node:timers/promises");

// ../node_modules/execa/node_modules/get-stream/source/contents.js
var He = /* @__PURE__ */ a(async (t, { init: e, convertChunk: r, getSize: n, truncateChunk: s, addChunk: o, getFinalChunk: i, finalize: c }, {
maxBuffer: l = Number.POSITIVE_INFINITY } = {}) => {
  if (!Dd(t))
    throw new Error("The first argument must be a Readable, a ReadableStream, or an async iterable.");
  let f = e();
  f.length = 0;
  try {
    for await (let p of t) {
      let v = Ld(p), _ = r[v](p, f);
      xo({ convertedChunk: _, state: f, getSize: n, truncateChunk: s, addChunk: o, maxBuffer: l });
    }
    return Md({ state: f, convertChunk: r, getSize: n, truncateChunk: s, addChunk: o, getFinalChunk: i, maxBuffer: l }), c(f);
  } catch (p) {
    throw p.bufferedData = c(f), p;
  }
}, "getStreamContents"), Md = /* @__PURE__ */ a(({ state: t, getSize: e, truncateChunk: r, addChunk: n, getFinalChunk: s, maxBuffer: o }) => {
  let i = s(t);
  i !== void 0 && xo({ convertedChunk: i, state: t, getSize: e, truncateChunk: r, addChunk: n, maxBuffer: o });
}, "appendFinalChunk"), xo = /* @__PURE__ */ a(({ convertedChunk: t, state: e, getSize: r, truncateChunk: n, addChunk: s, maxBuffer: o }) => {
  let i = r(t), c = e.length + i;
  if (c <= o) {
    go(t, e, s, c);
    return;
  }
  let l = n(t, o - e.length);
  throw l !== void 0 && go(l, e, s, o), new Nt();
}, "appendChunk"), go = /* @__PURE__ */ a((t, e, r, n) => {
  e.contents = r(t, e, n), e.length = n;
}, "addNewChunk"), Dd = /* @__PURE__ */ a((t) => typeof t == "object" && t !== null && typeof t[Symbol.asyncIterator] == "function", "isAsyn\
cIterable"), Ld = /* @__PURE__ */ a((t) => {
  let e = typeof t;
  if (e === "string")
    return "string";
  if (e !== "object" || t === null)
    return "others";
  if (globalThis.Buffer?.isBuffer(t))
    return "buffer";
  let r = bo.call(t);
  return r === "[object ArrayBuffer]" ? "arrayBuffer" : r === "[object DataView]" ? "dataView" : Number.isInteger(t.byteLength) && Number.isInteger(
  t.byteOffset) && bo.call(t.buffer) === "[object ArrayBuffer]" ? "typedArray" : "others";
}, "getChunkType"), { toString: bo } = Object.prototype, Nt = class extends Error {
  static {
    a(this, "MaxBufferError");
  }
  name = "MaxBufferError";
  constructor() {
    super("maxBuffer exceeded");
  }
};

// ../node_modules/execa/node_modules/get-stream/source/utils.js
var Dr = /* @__PURE__ */ a((t) => t, "identity"), Lr = /* @__PURE__ */ a(() => {
}, "noop"), Ur = /* @__PURE__ */ a(({ contents: t }) => t, "getContentsProp"), Zt = /* @__PURE__ */ a((t) => {
  throw new Error(`Streams in object mode are not supported: ${String(t)}`);
}, "throwObjectStream"), jt = /* @__PURE__ */ a((t) => t.length, "getLengthProp");

// ../node_modules/execa/node_modules/get-stream/source/array-buffer.js
async function $r(t, e) {
  return He(t, zd, e);
}
a($r, "getStreamAsArrayBuffer");
var Ud = /* @__PURE__ */ a(() => ({ contents: new ArrayBuffer(0) }), "initArrayBuffer"), $d = /* @__PURE__ */ a((t) => Vd.encode(t), "useTex\
tEncoder"), Vd = new TextEncoder(), vo = /* @__PURE__ */ a((t) => new Uint8Array(t), "useUint8Array"), _o = /* @__PURE__ */ a((t) => new Uint8Array(
t.buffer, t.byteOffset, t.byteLength), "useUint8ArrayWithOffset"), Fd = /* @__PURE__ */ a((t, e) => t.slice(0, e), "truncateArrayBufferChunk"),
Bd = /* @__PURE__ */ a((t, { contents: e, length: r }, n) => {
  let s = To() ? Gd(e, n) : Wd(e, n);
  return new Uint8Array(s).set(t, r), s;
}, "addArrayBufferChunk"), Wd = /* @__PURE__ */ a((t, e) => {
  if (e <= t.byteLength)
    return t;
  let r = new ArrayBuffer(ko(e));
  return new Uint8Array(r).set(new Uint8Array(t), 0), r;
}, "resizeArrayBufferSlow"), Gd = /* @__PURE__ */ a((t, e) => {
  if (e <= t.maxByteLength)
    return t.resize(e), t;
  let r = new ArrayBuffer(e, { maxByteLength: ko(e) });
  return new Uint8Array(r).set(new Uint8Array(t), 0), r;
}, "resizeArrayBuffer"), ko = /* @__PURE__ */ a((t) => wo ** Math.ceil(Math.log(t) / Math.log(wo)), "getNewContentsLength"), wo = 2, Kd = /* @__PURE__ */ a(
({ contents: t, length: e }) => To() ? t : t.slice(0, e), "finalizeArrayBuffer"), To = /* @__PURE__ */ a(() => "resize" in ArrayBuffer.prototype,
"hasArrayBufferResize"), zd = {
  init: Ud,
  convertChunk: {
    string: $d,
    buffer: vo,
    arrayBuffer: vo,
    dataView: _o,
    typedArray: _o,
    others: Zt
  },
  getSize: jt,
  truncateChunk: Fd,
  addChunk: Bd,
  getFinalChunk: Lr,
  finalize: Kd
};

// ../node_modules/execa/node_modules/get-stream/source/buffer.js
async function Mt(t, e) {
  if (!("Buffer" in globalThis))
    throw new Error("getStreamAsBuffer() is only supported in Node.js");
  try {
    return Io(await $r(t, e));
  } catch (r) {
    throw r.bufferedData !== void 0 && (r.bufferedData = Io(r.bufferedData)), r;
  }
}
a(Mt, "getStreamAsBuffer");
var Io = /* @__PURE__ */ a((t) => globalThis.Buffer.from(t), "arrayBufferToNodeBuffer");

// ../node_modules/execa/node_modules/get-stream/source/string.js
async function Vr(t, e) {
  return He(t, Xd, e);
}
a(Vr, "getStreamAsString");
var qd = /* @__PURE__ */ a(() => ({ contents: "", textDecoder: new TextDecoder() }), "initString"), Dt = /* @__PURE__ */ a((t, { textDecoder: e }) => e.
decode(t, { stream: !0 }), "useTextDecoder"), Jd = /* @__PURE__ */ a((t, { contents: e }) => e + t, "addStringChunk"), Hd = /* @__PURE__ */ a(
(t, e) => t.slice(0, e), "truncateStringChunk"), Yd = /* @__PURE__ */ a(({ textDecoder: t }) => {
  let e = t.decode();
  return e === "" ? void 0 : e;
}, "getFinalStringChunk"), Xd = {
  init: qd,
  convertChunk: {
    string: Dr,
    buffer: Dt,
    arrayBuffer: Dt,
    dataView: Dt,
    typedArray: Dt,
    others: Zt
  },
  getSize: jt,
  truncateChunk: Hd,
  addChunk: Jd,
  getFinalChunk: Yd,
  finalize: Ur
};

// ../node_modules/execa/lib/stream.js
var Po = T(Eo(), 1);
var Ao = /* @__PURE__ */ a((t) => {
  if (t !== void 0)
    throw new TypeError("The `input` and `inputFile` options cannot be both set.");
}, "validateInputOptions"), eu = /* @__PURE__ */ a(({ input: t, inputFile: e }) => typeof e != "string" ? t : (Ao(t), (0, Lt.readFileSync)(e)),
"getInputSync"), Oo = /* @__PURE__ */ a((t) => {
  let e = eu(t);
  if (Rt(e))
    throw new TypeError("The `input` option cannot be a stream in sync mode");
  return e;
}, "handleInputSync"), tu = /* @__PURE__ */ a(({ input: t, inputFile: e }) => typeof e != "string" ? t : (Ao(t), (0, Lt.createReadStream)(e)),
"getInput"), Ro = /* @__PURE__ */ a((t, e) => {
  let r = tu(e);
  r !== void 0 && (Rt(r) ? r.pipe(t.stdin) : t.stdin.end(r));
}, "handleInput"), No = /* @__PURE__ */ a((t, { all: e }) => {
  if (!e || !t.stdout && !t.stderr)
    return;
  let r = (0, Po.default)();
  return t.stdout && r.add(t.stdout), t.stderr && r.add(t.stderr), r;
}, "makeAllStream"), Fr = /* @__PURE__ */ a(async (t, e) => {
  if (!(!t || e === void 0)) {
    await (0, Co.setTimeout)(0), t.destroy();
    try {
      return await e;
    } catch (r) {
      return r.bufferedData;
    }
  }
}, "getBufferedData"), Br = /* @__PURE__ */ a((t, { encoding: e, buffer: r, maxBuffer: n }) => {
  if (!(!t || !r))
    return e === "utf8" || e === "utf-8" ? Vr(t, { maxBuffer: n }) : e === null || e === "buffer" ? Mt(t, { maxBuffer: n }) : ru(t, n, e);
}, "getStreamPromise"), ru = /* @__PURE__ */ a(async (t, e, r) => (await Mt(t, { maxBuffer: e })).toString(r), "applyEncoding"), Zo = /* @__PURE__ */ a(
async ({ stdout: t, stderr: e, all: r }, { encoding: n, buffer: s, maxBuffer: o }, i) => {
  let c = Br(t, { encoding: n, buffer: s, maxBuffer: o }), l = Br(e, { encoding: n, buffer: s, maxBuffer: o }), f = Br(r, { encoding: n, buffer: s,
  maxBuffer: o * 2 });
  try {
    return await Promise.all([i, c, l, f]);
  } catch (p) {
    return Promise.all([
      { error: p, signal: p.signal, timedOut: p.timedOut },
      Fr(t, c),
      Fr(e, l),
      Fr(r, f)
    ]);
  }
}, "getSpawnedResult");

// ../node_modules/execa/lib/promise.js
var nu = (async () => {
})().constructor.prototype, su = ["then", "catch", "finally"].map((t) => [
  t,
  Reflect.getOwnPropertyDescriptor(nu, t)
]), Wr = /* @__PURE__ */ a((t, e) => {
  for (let [r, n] of su) {
    let s = typeof e == "function" ? (...o) => Reflect.apply(n.value, e(), o) : n.value.bind(e);
    Reflect.defineProperty(t, r, { ...n, value: s });
  }
}, "mergePromise"), jo = /* @__PURE__ */ a((t) => new Promise((e, r) => {
  t.on("exit", (n, s) => {
    e({ exitCode: n, signal: s });
  }), t.on("error", (n) => {
    r(n);
  }), t.stdin && t.stdin.on("error", (n) => {
    r(n);
  });
}), "getSpawnedPromise");

// ../node_modules/execa/lib/command.js
var Lo = require("node:buffer"), Uo = require("node:child_process");
var $o = /* @__PURE__ */ a((t, e = []) => Array.isArray(e) ? [t, ...e] : [t], "normalizeArgs"), ou = /^[\w.-]+$/, au = /* @__PURE__ */ a((t) => typeof t !=
"string" || ou.test(t) ? t : `"${t.replaceAll('"', '\\"')}"`, "escapeArg"), Gr = /* @__PURE__ */ a((t, e) => $o(t, e).join(" "), "joinComman\
d"), Kr = /* @__PURE__ */ a((t, e) => $o(t, e).map((r) => au(r)).join(" "), "getEscapedCommand"), Vo = / +/g, Fo = /* @__PURE__ */ a((t) => {
  let e = [];
  for (let r of t.trim().split(Vo)) {
    let n = e.at(-1);
    n && n.endsWith("\\") ? e[e.length - 1] = `${n.slice(0, -1)} ${r}` : e.push(r);
  }
  return e;
}, "parseCommand"), Mo = /* @__PURE__ */ a((t) => {
  let e = typeof t;
  if (e === "string")
    return t;
  if (e === "number")
    return String(t);
  if (e === "object" && t !== null && !(t instanceof Uo.ChildProcess) && "stdout" in t) {
    let r = typeof t.stdout;
    if (r === "string")
      return t.stdout;
    if (Lo.Buffer.isBuffer(t.stdout))
      return t.stdout.toString();
    throw new TypeError(`Unexpected "${r}" stdout in template expression`);
  }
  throw new TypeError(`Unexpected "${e}" in template expression`);
}, "parseExpression"), Do = /* @__PURE__ */ a((t, e, r) => r || t.length === 0 || e.length === 0 ? [...t, ...e] : [
  ...t.slice(0, -1),
  `${t.at(-1)}${e[0]}`,
  ...e.slice(1)
], "concatTokens"), iu = /* @__PURE__ */ a(({ templates: t, expressions: e, tokens: r, index: n, template: s }) => {
  let o = s ?? t.raw[n], i = o.split(Vo).filter(Boolean), c = Do(
    r,
    i,
    o.startsWith(" ")
  );
  if (n === e.length)
    return c;
  let l = e[n], f = Array.isArray(l) ? l.map((p) => Mo(p)) : [Mo(l)];
  return Do(
    c,
    f,
    o.endsWith(" ")
  );
}, "parseTemplate"), zr = /* @__PURE__ */ a((t, e) => {
  let r = [];
  for (let [n, s] of t.entries())
    r = iu({ templates: t, expressions: e, tokens: r, index: n, template: s });
  return r;
}, "parseTemplates");

// ../node_modules/execa/lib/verbose.js
var Bo = require("node:util"), Wo = T(require("node:process"), 1);
var Go = (0, Bo.debuglog)("execa").enabled, Ut = /* @__PURE__ */ a((t, e) => String(t).padStart(e, "0"), "padField"), cu = /* @__PURE__ */ a(
() => {
  let t = /* @__PURE__ */ new Date();
  return `${Ut(t.getHours(), 2)}:${Ut(t.getMinutes(), 2)}:${Ut(t.getSeconds(), 2)}.${Ut(t.getMilliseconds(), 3)}`;
}, "getTimestamp"), qr = /* @__PURE__ */ a((t, { verbose: e }) => {
  e && Wo.default.stderr.write(`[${cu()}] ${t}
`);
}, "logCommand");

// ../node_modules/execa/index.js
var du = 1e3 * 1e3 * 100, uu = /* @__PURE__ */ a(({ env: t, extendEnv: e, preferLocal: r, localDir: n, execPath: s }) => {
  let o = e ? { ...Ye.default.env, ...t } : t;
  return r ? Js({ env: o, cwd: n, execPath: s }) : o;
}, "getEnv"), Ho = /* @__PURE__ */ a((t, e, r = {}) => {
  let n = Jo.default._parse(t, e, r);
  return t = n.command, e = n.args, r = n.options, r = {
    maxBuffer: du,
    buffer: !0,
    stripFinalNewline: !0,
    extendEnv: !0,
    preferLocal: !1,
    localDir: r.cwd || Ye.default.cwd(),
    execPath: Ye.default.execPath,
    encoding: "utf8",
    reject: !0,
    cleanup: !0,
    all: !1,
    windowsHide: !0,
    verbose: Go,
    ...r
  }, r.env = uu(r), r.stdio = oo(r), Ye.default.platform === "win32" && qo.default.basename(t, ".exe") === "cmd" && e.unshift("/q"), { file: t,
  args: e, options: r, parsed: n };
}, "handleArguments"), Xe = /* @__PURE__ */ a((t, e, r) => typeof e != "string" && !zo.Buffer.isBuffer(e) ? r === void 0 ? void 0 : "" : t.stripFinalNewline ?
Ir(e) : e, "handleOutput");
function Yo(t, e, r) {
  let n = Ho(t, e, r), s = Gr(t, e), o = Kr(t, e);
  qr(o, n.options), fo(n.options);
  let i;
  try {
    i = $t.default.spawn(n.file, n.args, n.options);
  } catch (k) {
    let A = new $t.default.ChildProcess(), E = Promise.reject(Je({
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
    return Wr(A, E), A;
  }
  let c = jo(i), l = lo(i, n.options, c), f = po(i, n.options, l), p = { isCanceled: !1 };
  i.kill = co.bind(null, i.kill.bind(i)), i.cancel = uo.bind(null, i, p);
  let _ = Ys(/* @__PURE__ */ a(async () => {
    let [{ error: k, exitCode: A, signal: E, timedOut: P }, Le, ve, J] = await Zo(i, n.options, f), ot = Xe(n.options, Le), at = Xe(n.options,
    ve), it = Xe(n.options, J);
    if (k || A !== 0 || E !== null) {
      let w = Je({
        error: k,
        exitCode: A,
        signal: E,
        stdout: ot,
        stderr: at,
        all: it,
        command: s,
        escapedCommand: o,
        parsed: n,
        timedOut: P,
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
      stdout: ot,
      stderr: at,
      all: it,
      failed: !1,
      timedOut: !1,
      isCanceled: !1,
      killed: !1
    };
  }, "handlePromise"));
  return Ro(i, n.options), i.all = No(i, n.options), yo(i), Wr(i, _), i;
}
a(Yo, "execa");
function lu(t, e, r) {
  let n = Ho(t, e, r), s = Gr(t, e), o = Kr(t, e);
  qr(o, n.options);
  let i = Oo(n.options), c;
  try {
    c = $t.default.spawnSync(n.file, n.args, { ...n.options, input: i });
  } catch (p) {
    throw Je({
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
  let l = Xe(n.options, c.stdout, c.error), f = Xe(n.options, c.stderr, c.error);
  if (c.error || c.status !== 0 || c.signal !== null) {
    let p = Je({
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
a(lu, "execaSync");
var fu = /* @__PURE__ */ a(({ input: t, inputFile: e, stdio: r }) => t === void 0 && e === void 0 && r === void 0 ? { stdin: "inherit" } : {},
"normalizeScriptStdin"), Ko = /* @__PURE__ */ a((t = {}) => ({
  preferLocal: !0,
  ...fu(t),
  ...t
}), "normalizeScriptOptions");
function Xo(t) {
  function e(r, ...n) {
    if (!Array.isArray(r))
      return Xo({ ...t, ...r });
    let [s, ...o] = zr(r, n);
    return Yo(s, o, Ko(t));
  }
  return a(e, "$"), e.sync = (r, ...n) => {
    if (!Array.isArray(r))
      throw new TypeError("Please use $(options).sync`command` instead of $.sync(options)`command`.");
    let [s, ...o] = zr(r, n);
    return lu(s, o, Ko(t));
  }, e;
}
a(Xo, "create$");
var em = Xo();
function Qo(t, e) {
  let [r, ...n] = Fo(t);
  return Yo(r, n, e);
}
a(Qo, "execaCommand");

// src/telemetry/exec-command-count-lines.ts
async function Vt(t, e) {
  let r = Qo(t, { shell: !0, buffer: !1, ...e });
  if (!r.stdout)
    throw new Error("Unexpected missing stdout");
  let n = 0, s = (0, ea.createInterface)(r.stdout);
  return s.on("line", () => {
    n += 1;
  }), await r, s.close(), n;
}
a(Vt, "execCommandCountLines");

// ../node_modules/slash/index.js
function Jr(t) {
  return t.startsWith("\\\\?\\") ? t : t.replace(/\\/g, "/");
}
a(Jr, "slash");

// src/common/utils/file-cache.ts
var Qe = require("node:crypto"), M = require("node:fs"), V = require("node:fs/promises"), ta = require("node:os"), je = require("node:path");
var Hr = class {
  static {
    a(this, "FileSystemCache");
  }
  constructor(e = {}) {
    this.prefix = (e.ns || e.prefix || "") + "-", this.hash_alg = e.hash_alg || "md5", this.cache_dir = e.basePath || (0, je.join)((0, ta.tmpdir)(),
    (0, Qe.randomBytes)(15).toString("base64").replace(/\//g, "-")), this.ttl = e.ttl || 0, (0, Qe.createHash)(this.hash_alg), (0, M.mkdirSync)(
    this.cache_dir, { recursive: !0 });
  }
  generateHash(e) {
    return (0, je.join)(this.cache_dir, this.prefix + (0, Qe.createHash)(this.hash_alg).update(e).digest("hex"));
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
      let n = await (0, V.readFile)(this.generateHash(e), "utf8");
      return this.parseCacheData(n, r);
    } catch {
      return r;
    }
  }
  getSync(e, r) {
    try {
      let n = (0, M.readFileSync)(this.generateHash(e), "utf8");
      return this.parseCacheData(n, r);
    } catch {
      return r;
    }
  }
  async set(e, r, n = {}) {
    let s = typeof n == "number" ? { ttl: n } : n;
    (0, M.mkdirSync)(this.cache_dir, { recursive: !0 }), await (0, V.writeFile)(this.generateHash(e), this.parseSetData(e, r, s), {
      encoding: s.encoding || "utf8"
    });
  }
  setSync(e, r, n = {}) {
    let s = typeof n == "number" ? { ttl: n } : n;
    (0, M.mkdirSync)(this.cache_dir, { recursive: !0 }), (0, M.writeFileSync)(this.generateHash(e), this.parseSetData(e, r, s), {
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
    await (0, V.rm)(this.generateHash(e), { force: !0 });
  }
  removeSync(e) {
    (0, M.rmSync)(this.generateHash(e), { force: !0 });
  }
  async clear() {
    let e = await (0, V.readdir)(this.cache_dir);
    await Promise.all(
      e.filter((r) => r.startsWith(this.prefix)).map((r) => (0, V.rm)((0, je.join)(this.cache_dir, r), { force: !0 }))
    );
  }
  clearSync() {
    (0, M.readdirSync)(this.cache_dir).filter((e) => e.startsWith(this.prefix)).forEach((e) => (0, M.rmSync)((0, je.join)(this.cache_dir, e),
    { force: !0 }));
  }
  async getAll() {
    let e = Date.now(), r = await (0, V.readdir)(this.cache_dir);
    return (await Promise.all(
      r.filter((s) => s.startsWith(this.prefix)).map((s) => (0, V.readFile)((0, je.join)(this.cache_dir, s), "utf8"))
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
function Yr(t) {
  return new Hr(t);
}
a(Yr, "createFileSystemCache");

// src/common/utils/resolve-path-in-sb-cache.ts
var tn = require("node:path");

// ../node_modules/find-cache-dir/index.js
var ha = T(require("node:process"), 1), Me = T(require("node:path"), 1), tt = T(require("node:fs"), 1), ya = T(na(), 1);

// ../node_modules/pkg-dir/index.js
var la = T(require("node:path"), 1);

// ../node_modules/pkg-dir/node_modules/find-up/index.js
var et = T(require("node:path"), 1), da = require("node:url");

// ../node_modules/locate-path/index.js
var sa = T(require("node:process"), 1), oa = T(require("node:path"), 1), Ft = T(require("node:fs"), 1), aa = require("node:url");
var ia = {
  directory: "isDirectory",
  file: "isFile"
};
function hu(t) {
  if (!Object.hasOwnProperty.call(ia, t))
    throw new Error(`Invalid type specified: ${t}`);
}
a(hu, "checkType");
var yu = /* @__PURE__ */ a((t, e) => e[ia[t]](), "matchType"), gu = /* @__PURE__ */ a((t) => t instanceof URL ? (0, aa.fileURLToPath)(t) : t,
"toPath");
function Xr(t, {
  cwd: e = sa.default.cwd(),
  type: r = "file",
  allowSymlinks: n = !0
} = {}) {
  hu(r), e = gu(e);
  let s = n ? Ft.default.statSync : Ft.default.lstatSync;
  for (let o of t)
    try {
      let i = s(oa.default.resolve(e, o), {
        throwIfNoEntry: !1
      });
      if (!i)
        continue;
      if (yu(r, i))
        return o;
    } catch {
    }
}
a(Xr, "locatePathSync");

// ../node_modules/pkg-dir/node_modules/path-exists/index.js
var ca = T(require("node:fs"), 1);

// ../node_modules/pkg-dir/node_modules/find-up/index.js
var bu = /* @__PURE__ */ a((t) => t instanceof URL ? (0, da.fileURLToPath)(t) : t, "toPath"), xu = Symbol("findUpStop");
function vu(t, e = {}) {
  let r = et.default.resolve(bu(e.cwd) || ""), { root: n } = et.default.parse(r), s = e.stopAt || n, o = e.limit || Number.POSITIVE_INFINITY,
  i = [t].flat(), c = /* @__PURE__ */ a((f) => {
    if (typeof t != "function")
      return Xr(i, f);
    let p = t(f.cwd);
    return typeof p == "string" ? Xr([p], f) : p;
  }, "runMatcher"), l = [];
  for (; ; ) {
    let f = c({ ...e, cwd: r });
    if (f === xu || (f && l.push(et.default.resolve(r, f)), r === s || l.length >= o))
      break;
    r = et.default.dirname(r);
  }
  return l;
}
a(vu, "findUpMultipleSync");
function ua(t, e = {}) {
  return vu(t, { ...e, limit: 1 })[0];
}
a(ua, "findUpSync");

// ../node_modules/pkg-dir/index.js
function fa({ cwd: t } = {}) {
  let e = ua("package.json", { cwd: t });
  return e && la.default.dirname(e);
}
a(fa, "packageDirectorySync");

// ../node_modules/find-cache-dir/index.js
var { env: Qr, cwd: _u } = ha.default, pa = /* @__PURE__ */ a((t) => {
  try {
    return tt.default.accessSync(t, tt.default.constants.W_OK), !0;
  } catch {
    return !1;
  }
}, "isWritable");
function ma(t, e) {
  return e.create && tt.default.mkdirSync(t, { recursive: !0 }), t;
}
a(ma, "useDirectory");
function wu(t) {
  let e = Me.default.join(t, "node_modules");
  if (!(!pa(e) && (tt.default.existsSync(e) || !pa(Me.default.join(t)))))
    return e;
}
a(wu, "getNodeModuleDirectory");
function en(t = {}) {
  if (Qr.CACHE_DIR && !["true", "false", "1", "0"].includes(Qr.CACHE_DIR))
    return ma(Me.default.join(Qr.CACHE_DIR, t.name), t);
  let { cwd: e = _u(), files: r } = t;
  if (r) {
    if (!Array.isArray(r))
      throw new TypeError(`Expected \`files\` option to be an array, got \`${typeof r}\`.`);
    e = (0, ya.default)(r.map((s) => Me.default.resolve(e, s)));
  }
  if (e = fa({ cwd: e }), !(!e || !wu(e)))
    return ma(Me.default.join(e, "node_modules", ".cache", t.name), t);
}
a(en, "findCacheDirectory");

// src/common/utils/resolve-path-in-sb-cache.ts
function ga(t, e = "default") {
  let r = en({ name: "storybook" });
  return r ||= (0, tn.join)(process.cwd(), "node_modules", ".cache", "storybook"), (0, tn.join)(r, e, t);
}
a(ga, "resolvePathInStorybookCache");

// src/telemetry/run-telemetry-operation.ts
var ba = Yr({
  basePath: ga("telemetry"),
  ns: "storybook",
  ttl: 24 * 60 * 60 * 1e3
  // 24h
}), Bt = /* @__PURE__ */ a(async (t, e) => {
  let r = await ba.get(t);
  return r === void 0 && (r = await e(), r !== void 0 && await ba.set(t, r)), r;
}, "runTelemetryOperation");

// src/telemetry/get-application-file-count.ts
var ku = ["page", "screen"], Tu = ["js", "jsx", "ts", "tsx"], Iu = /* @__PURE__ */ a(async (t) => {
  let r = ku.flatMap((n) => [
    n,
    [n[0].toUpperCase(), ...n.slice(1)].join("")
  ]).flatMap(
    (n) => Tu.map((s) => `"${t}${xa.sep}*${n}*.${s}"`)
  );
  try {
    let n = `git ls-files -- ${r.join(" ")}`;
    return await Vt(n);
  } catch {
    return;
  }
}, "getApplicationFilesCountUncached"), va = /* @__PURE__ */ a(async (t) => Bt(
  "applicationFiles",
  async () => Iu(t)
), "getApplicationFileCount");

// src/telemetry/get-chromatic-version.ts
function _a(t) {
  let e = t.dependencies?.chromatic || t.devDependencies?.chromatic || t.peerDependencies?.chromatic;
  return e || (t.scripts && Object.values(t.scripts).find((r) => r?.match(/chromatic/)) ? "latest" : void 0);
}
a(_a, "getChromaticVersionSpecifier");

// src/telemetry/get-framework-info.ts
var Ia = require("node:path"), Sa = require("@storybook/core/common");

// src/telemetry/package-json.ts
var wa = require("node:fs/promises"), ka = require("node:path");
var rn = /* @__PURE__ */ a(async (t) => {
  let e = Object.keys(t);
  return Promise.all(e.map(Wt));
}, "getActualPackageVersions"), Wt = /* @__PURE__ */ a(async (t) => {
  try {
    let e = await nn(t);
    return {
      name: t,
      version: e.version
    };
  } catch {
    return { name: t, version: null };
  }
}, "getActualPackageVersion"), nn = /* @__PURE__ */ a(async (t) => {
  let e = require.resolve((0, ka.join)(t, "package.json"), {
    paths: [process.cwd()]
  });
  return JSON.parse(await (0, wa.readFile)(e, { encoding: "utf8" }));
}, "getActualPackageJson");

// src/telemetry/get-framework-info.ts
var Su = [
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
], Eu = ["builder-webpack5", "builder-vite"];
function Ta(t, e) {
  let { name: r = "", version: n, dependencies: s, devDependencies: o, peerDependencies: i } = t, c = {
    // We include the framework itself because it may be a renderer too (e.g. angular)
    [r]: n,
    ...s,
    ...o,
    ...i
  };
  return e.map((l) => `@storybook/${l}`).find((l) => c[l]);
}
a(Ta, "findMatchingPackage");
var Cu = /* @__PURE__ */ a((t) => {
  let e = (0, Ia.normalize)(t).replace(new RegExp(/\\/, "g"), "/");
  return Object.keys(Sa.frameworkPackages).find((n) => e.endsWith(n)) || we(t).replace(/.*node_modules[\\/]/, "");
}, "getFrameworkPackageName");
async function Ea(t) {
  if (!t?.framework)
    return {};
  let e = typeof t.framework == "string" ? t.framework : t.framework?.name;
  if (!e)
    return {};
  let r = await nn(e);
  if (!r)
    return {};
  let n = Ta(r, Eu), s = Ta(r, Su), o = Cu(e), i = typeof t.framework == "object" ? t.framework.options : {};
  return {
    framework: {
      name: o,
      options: i
    },
    builder: n,
    renderer: s
  };
}
a(Ea, "getFrameworkInfo");

// src/telemetry/get-has-router-package.ts
var Pu = /* @__PURE__ */ new Set([
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
function Ca(t) {
  return Object.keys(t?.dependencies ?? {}).some(
    (e) => Pu.has(e)
  );
}
a(Ca, "getHasRouterPackage");

// src/telemetry/get-monorepo-type.ts
var rt = require("node:fs"), Gt = require("node:path"), Aa = require("@storybook/core/common");
var Pa = {
  Nx: "nx.json",
  Turborepo: "turbo.json",
  Lerna: "lerna.json",
  Rush: "rush.json",
  Lage: "lage.config.json"
}, Oa = /* @__PURE__ */ a(() => {
  let t = (0, Aa.getProjectRoot)();
  if (!t)
    return;
  let r = Object.keys(Pa).find((s) => {
    let o = (0, Gt.join)(t, Pa[s]);
    return (0, rt.existsSync)(o);
  });
  if (r)
    return r;
  if (!(0, rt.existsSync)((0, Gt.join)(t, "package.json")))
    return;
  if (JSON.parse(
    (0, rt.readFileSync)((0, Gt.join)(t, "package.json"), { encoding: "utf8" })
  )?.workspaces)
    return "Workspaces";
}, "getMonorepoType");

// src/telemetry/get-portable-stories-usage.ts
var Au = /* @__PURE__ */ a(async (t) => {
  try {
    let e = "git grep -l composeStor" + (t ? ` -- ${t}` : "");
    return await Vt(e);
  } catch (e) {
    return e.exitCode === 1 ? 0 : void 0;
  }
}, "getPortableStoriesFileCountUncached"), Ra = /* @__PURE__ */ a(async (t) => Bt(
  "portableStories",
  async () => Au(t)
), "getPortableStoriesFileCount");

// src/telemetry/storybook-metadata.ts
var sn = {
  next: "Next",
  "react-scripts": "CRA",
  gatsby: "Gatsby",
  "@nuxtjs/storybook": "nuxt",
  "@nrwl/storybook": "nx",
  "@vue/cli-service": "vue-cli",
  "@sveltejs/kit": "sveltekit"
}, on = /* @__PURE__ */ a((t) => we(t).replace(/\/dist\/.*/, "").replace(/\.[mc]?[tj]?s[x]?$/, "").replace(/\/register$/, "").replace(/\/manager$/,
"").replace(/\/preset$/, ""), "sanitizeAddonName"), ja = /* @__PURE__ */ a(async ({
  packageJsonPath: t,
  packageJson: e,
  mainConfig: r
}) => {
  let n = await os(), s = {
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
  }, i = Object.keys(o).find((w) => !!sn[w]);
  if (i) {
    let { version: w } = await Wt(i);
    s.metaFramework = {
      name: sn[i],
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
      l.map(async (w) => [w, (await Wt(w))?.version])
    )
  ), s.hasRouterPackage = Ca(e);
  let f = Oa();
  f && (s.monorepo = f);
  try {
    let w = await ir({ cwd: (0, G.getProjectRoot)() });
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
      storybookVersionSpecifier: G.versions.storybook,
      language: p
    };
  s.hasCustomBabel = !!r.babel, s.hasCustomWebpack = !!r.webpackFinal, s.hasStaticDirs = !!r.staticDirs, typeof r.typescript == "object" && (s.
  typescriptOptions = r.typescript);
  let v = await Ea(r);
  typeof r.refs == "object" && (s.refCount = Object.keys(r.refs).length), typeof r.features == "object" && (s.features = r.features);
  let _ = {};
  r.addons && r.addons.forEach((w) => {
    let R, ct;
    typeof w == "string" ? R = on(w) : (w.name.includes("addon-essentials") && (ct = w.options), R = on(w.name)), _[R] = {
      options: ct,
      version: void 0
    };
  });
  let k = _a(e);
  k && (_.chromatic = {
    version: void 0,
    versionSpecifier: k,
    options: void 0
  }), (await rn(_)).forEach(({ name: w, version: R }) => {
    _[w].version = R;
  });
  let E = Object.keys(_), P = Object.keys(o).filter((w) => w.includes("storybook") && !E.includes(w)).reduce((w, R) => ({
    ...w,
    [R]: { version: void 0 }
  }), {});
  (await rn(P)).forEach(({ name: w, version: R }) => {
    P[w].version = R;
  });
  let ve = !!o["eslint-plugin-storybook"], J = (0, G.getStorybookInfo)(e);
  try {
    let { previewConfig: w } = J;
    if (w) {
      let R = await (0, Za.readConfig)(w), ct = !!(R.getFieldNode(["globals"]) || R.getFieldNode(["globalTypes"]));
      s.preview = { ...s.preview, usesGlobals: ct };
    }
  } catch {
  }
  let ot = P[J.frameworkPackage]?.version, at = await Ra(), it = await va((0, Na.dirname)(t));
  return {
    ...s,
    ...v,
    portableStoriesFileCount: at,
    applicationFileCount: it,
    storybookVersion: ot,
    storybookVersionSpecifier: J.version,
    language: p,
    storybookPackages: P,
    addons: _,
    hasStorybookEslint: ve
  };
}, "computeStorybookMetadata");
async function Ou() {
  let t = await rr(process.cwd());
  return t ? {
    packageJsonPath: t,
    packageJson: await Sn(t) || {}
  } : {
    packageJsonPath: process.cwd(),
    packageJson: {}
  };
}
a(Ou, "getPackageJsonDetails");
var Kt, an = /* @__PURE__ */ a(async (t) => {
  if (Kt)
    return Kt;
  let { packageJson: e, packageJsonPath: r } = await Ou(), n = (t || (0, G.getStorybookConfiguration)(
    String(e?.scripts?.storybook || ""),
    "-c",
    "--config-dir"
  )) ?? ".storybook", s = await (0, G.loadMainConfig)({ configDir: n }).catch(() => {
  });
  return Kt = await ja({ mainConfig: s, packageJson: e, packageJsonPath: r }), Kt;
}, "getStorybookMetadata");

// src/telemetry/telemetry.ts
var qa = T(require("node:os"), 1), Ja = T(Da(), 1);

// ../node_modules/nanoid/index.js
var cn = require("crypto");

// ../node_modules/nanoid/url-alphabet/index.js
var La = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// ../node_modules/nanoid/index.js
var Ru = 128, xe, De, Nu = /* @__PURE__ */ a((t) => {
  !xe || xe.length < t ? (xe = Buffer.allocUnsafe(t * Ru), (0, cn.randomFillSync)(xe), De = 0) : De + t > xe.length && ((0, cn.randomFillSync)(
  xe), De = 0), De += t;
}, "fillPool");
var nt = /* @__PURE__ */ a((t = 21) => {
  Nu(t -= 0);
  let e = "";
  for (let r = De - t; r < De; r++)
    e += La[xe[r] & 63];
  return e;
}, "nanoid");

// src/telemetry/anonymous-id.ts
var $a = require("node:path"), Va = require("@storybook/core/common"), Fa = require("child_process");

// src/telemetry/one-way-hash.ts
var Ua = require("crypto");
var qt = /* @__PURE__ */ a((t) => {
  let e = (0, Ua.createHash)("sha256");
  return e.update("storybook-telemetry-salt"), e.update(t), e.digest("hex");
}, "oneWayHash");

// src/telemetry/anonymous-id.ts
function Zu(t) {
  let n = t.trim().replace(/#.*$/, "").replace(/^.*@/, "").replace(/^.*\/\//, "");
  return (n.endsWith(".git") ? n : `${n}.git`).replace(":", "/");
}
a(Zu, "normalizeGitUrl");
function ju(t, e) {
  return `${Zu(t)}${Jr(e)}`;
}
a(ju, "unhashedProjectId");
var Jt, Ba = /* @__PURE__ */ a(() => {
  if (Jt)
    return Jt;
  try {
    let t = (0, Va.getProjectRoot)(), e = (0, $a.relative)(t, process.cwd()), r = (0, Fa.execSync)("git config --local --get remote.origin.u\
rl", {
      timeout: 1e3,
      stdio: "pipe"
    });
    Jt = qt(ju(String(r), e));
  } catch {
  }
  return Jt;
}, "getAnonymousProjectId");

// src/telemetry/event-cache.ts
var Ht = require("@storybook/core/common");
var dn = Promise.resolve(), Mu = /* @__PURE__ */ a(async (t, e) => {
  let r = await Ht.cache.get("lastEvents") || {};
  r[t] = { body: e, timestamp: Date.now() }, await Ht.cache.set("lastEvents", r);
}, "setHelper"), Ga = /* @__PURE__ */ a(async (t, e) => (await dn, dn = Mu(t, e), dn), "set");
var Du = /* @__PURE__ */ a((t) => {
  let { body: e, timestamp: r } = t;
  return {
    timestamp: r,
    eventType: e?.eventType,
    eventId: e?.eventId,
    sessionId: e?.sessionId
  };
}, "upgradeFields"), Lu = ["init", "upgrade"], Uu = ["build", "dev", "error"], Wa = /* @__PURE__ */ a((t, e) => {
  let r = e.map((n) => t?.[n]).filter(Boolean).sort((n, s) => s.timestamp - n.timestamp);
  return r.length > 0 ? r[0] : void 0;
}, "lastEvent"), Ka = /* @__PURE__ */ a(async (t = void 0) => {
  let e = t || await Ht.cache.get("lastEvents") || {}, r = Wa(e, Lu), n = Wa(e, Uu);
  if (r)
    return !n?.timestamp || r.timestamp > n.timestamp ? Du(r) : void 0;
}, "getPrecedingUpgrade");

// src/telemetry/fetch.ts
var za = global.fetch;

// src/telemetry/session-id.ts
var un = require("@storybook/core/common");
var $u = 1e3 * 60 * 60 * 2, st;
var ln = /* @__PURE__ */ a(async () => {
  let t = Date.now();
  if (!st) {
    let e = await un.cache.get("session");
    e && e.lastUsed >= t - $u ? st = e.id : st = nt();
  }
  return await un.cache.set("session", { id: st, lastUsed: t }), st;
}, "getSessionId");

// src/telemetry/telemetry.ts
var Vu = (0, Ja.default)(za), Fu = process.env.STORYBOOK_TELEMETRY_URL || "https://storybook.js.org/event-log", Yt = [], Ha = /* @__PURE__ */ a(
(t, e) => {
  fn[t] = e;
}, "addToGlobalContext"), Bu = /* @__PURE__ */ a(() => {
  try {
    let t = qa.platform();
    return t === "win32" ? "Windows" : t === "darwin" ? "macOS" : t === "linux" ? "Linux" : `Other: ${t}`;
  } catch {
    return "Unknown";
  }
}, "getOperatingSystem"), fn = {
  inCI: !!process.env.CI,
  isTTY: process.stdout.isTTY,
  platform: Bu(),
  nodeVersion: process.versions.node
}, Wu = /* @__PURE__ */ a(async (t, e, r) => {
  let { eventType: n, payload: s, metadata: o, ...i } = t, c = await ln(), l = nt(), f = { ...i, eventType: n, eventId: l, sessionId: c, metadata: o,
  payload: s, context: e };
  return Vu(Fu, {
    method: "post",
    body: JSON.stringify(f),
    headers: { "Content-Type": "application/json" },
    retries: 3,
    retryOn: [503, 504],
    retryDelay: /* @__PURE__ */ a((p) => 2 ** p * (typeof r?.retryDelay == "number" && !Number.isNaN(r?.retryDelay) ? r.retryDelay : 1e3), "\
retryDelay")
  });
}, "prepareRequest");
async function Ya(t, e = { retryDelay: 1e3, immediate: !1 }) {
  let { eventType: r, payload: n, metadata: s, ...o } = t, i = e.stripMetadata ? fn : {
    ...fn,
    anonymousId: Ba()
  }, c;
  try {
    c = Wu(t, i, e), Yt.push(c), e.immediate ? await Promise.all(Yt) : await c;
    let l = await ln(), f = nt(), p = { ...o, eventType: r, eventId: f, sessionId: l, metadata: s, payload: n, context: i };
    await Ga(r, p);
  } catch {
  } finally {
    Yt = Yt.filter((l) => l !== c);
  }
}
a(Ya, "sendTelemetry");

// src/telemetry/index.ts
var Gu = /* @__PURE__ */ a((t) => t.startsWith("example-button--") || t.startsWith("example-header--") || t.startsWith("example-page--"), "i\
sExampleStoryId"), Ku = /* @__PURE__ */ a(async (t, e = {}, r = {}) => {
  t !== "boot" && r.notify !== !1 && await xn();
  let n = {
    eventType: t,
    payload: e
  };
  try {
    r?.stripMetadata || (n.metadata = await an(r?.configDir));
  } catch (s) {
    n.payload.metadataErrorMessage = $e(s).message, r?.enableCrashReports && (n.payload.metadataError = $e(s));
  } finally {
    let { error: s } = n.payload;
    s && (n.payload.error = $e(s)), (!n.payload.error || r?.enableCrashReports) && (process.env?.STORYBOOK_TELEMETRY_DEBUG && (pn.logger.info(
    `
[telemetry]`), pn.logger.info(JSON.stringify(n, null, 2))), await Ya(n, r));
  }
}, "telemetry");
