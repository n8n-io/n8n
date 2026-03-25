
var __create = Object.create;

var __defProp = Object.defineProperty;

var __getOwnPropDesc = Object.getOwnPropertyDescriptor;

var __getOwnPropNames = Object.getOwnPropertyNames;

var __getProtoOf = Object.getPrototypeOf;

var __hasOwnProp = Object.prototype.hasOwnProperty;

var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};

var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x2) => x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

var __defProps = Object.defineProperties;

var __getOwnPropDescs = Object.getOwnPropertyDescriptors;

var __getOwnPropSymbols = Object.getOwnPropertySymbols;

var __propIsEnum = Object.prototype.propertyIsEnumerable;

var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);

var __typeError = (msg) => {
  throw TypeError(msg);
};

var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;

var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

var __await = function(promise, isYieldStar) {
  this[0] = promise;
  this[1] = isYieldStar;
};

var __asyncGenerator = (__this, __arguments, generator) => {
  var resume = (k2, v2, yes, no) => {
    try {
      var x2 = generator[k2](v2), isAwait = (v2 = x2.value) instanceof __await, done = x2.done;
      Promise.resolve(isAwait ? v2[0] : v2).then((y) => isAwait ? resume(k2 === "return" ? k2 : "next", v2[1] ? { done: y.done, value: y.value } : y, yes, no) : yes({ value: y, done })).catch((e) => resume("throw", e, yes, no));
    } catch (e) {
      no(e);
    }
  }, method = (k2) => it[k2] = (x2) => new Promise((yes, no) => resume(k2, x2, yes, no)), it = {};
  return generator = generator.apply(__this, __arguments), it[__knownSymbol("asyncIterator")] = () => it, method("next"), method("throw"), method("return"), it;
};

var __yieldStar = (value) => {
  var obj = value[__knownSymbol("asyncIterator")], isAwait = false, method, it = {};
  if (obj == null) {
    obj = value[__knownSymbol("iterator")]();
    method = (k2) => it[k2] = (x2) => obj[k2](x2);
  } else {
    obj = obj.call(value);
    method = (k2) => it[k2] = (v2) => {
      if (isAwait) {
        isAwait = false;
        if (k2 === "throw") throw v2;
        return v2;
      }
      isAwait = true;
      return {
        done: false,
        value: new __await(new Promise((resolve) => {
          var x2 = obj[k2](v2);
          if (!(x2 instanceof Object)) __typeError("Object expected");
          resolve(x2);
        }), 1)
      };
    };
  }
  return it[__knownSymbol("iterator")] = () => it, method("next"), "throw" in obj ? method("throw") : it.throw = (x2) => {
    throw x2;
  }, "return" in obj && method("return"), it;
};

var __forAwait = (obj, it, method) => (it = obj[__knownSymbol("asyncIterator")]) ? it.call(obj) : (obj = obj[__knownSymbol("iterator")](), it = {}, method = (key, fn) => (fn = obj[key]) && (it[key] = (arg) => new Promise((yes, no, done) => (arg = fn.call(obj, arg), done = arg.done, Promise.resolve(arg.value).then((value) => yes({ value, done }), no)))), method("next"), method("return"), it);

var __pow = Math.pow;

var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);

var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));

var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);

var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

module.exports = {
  __create,
  __defProp,
  __getOwnPropDesc,
  __getOwnPropNames,
  __getProtoOf,
  __hasOwnProp,
  __export,
  __copyProps,
  __toESM,
  __toCommonJS,
  __async,
  __defProps,
  __getOwnPropDescs,
  __getOwnPropSymbols,
  __propIsEnum,
  __knownSymbol,
  __typeError,
  __defNormalProp,
  __spreadValues,
  __spreadProps,
  __await,
  __asyncGenerator,
  __yieldStar,
  __forAwait,
  __pow,
  __reExport,
  __commonJS,
  __esm,
  __accessCheck,
  __privateGet,
  __privateAdd,
  __privateSet
};
