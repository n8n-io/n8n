'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@babel/core');
var componentNameAnnotatePlugin = require('@sentry/babel-plugin-component-annotate');
var SentryCli = require('@sentry/cli');
var fs = require('fs');
var glob = require('glob');
var MagicString = require('magic-string');
var path = require('path');
var unplugin = require('unplugin');
var dotenv = require('dotenv');
var os = require('os');
var findUp = require('find-up');
var crypto = require('crypto');
var childProcess = require('child_process');
var https = require('node:https');
var node_stream = require('node:stream');
var node_zlib = require('node:zlib');
var url = require('url');
var util = require('util');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var componentNameAnnotatePlugin__default = /*#__PURE__*/_interopDefaultLegacy(componentNameAnnotatePlugin);
var SentryCli__default = /*#__PURE__*/_interopDefaultLegacy(SentryCli);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var MagicString__default = /*#__PURE__*/_interopDefaultLegacy(MagicString);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var path__namespace = /*#__PURE__*/_interopNamespace(path);
var dotenv__namespace = /*#__PURE__*/_interopNamespace(dotenv);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
var os__namespace = /*#__PURE__*/_interopNamespace(os);
var findUp__default = /*#__PURE__*/_interopDefaultLegacy(findUp);
var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);
var childProcess__default = /*#__PURE__*/_interopDefaultLegacy(childProcess);
var https__namespace = /*#__PURE__*/_interopNamespace(https);
var url__namespace = /*#__PURE__*/_interopNamespace(url);
var util__namespace = /*#__PURE__*/_interopNamespace(util);

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _regeneratorRuntime() {
  _regeneratorRuntime = function () {
    return exports;
  };
  var exports = {},
    Op = Object.prototype,
    hasOwn = Op.hasOwnProperty,
    defineProperty = Object.defineProperty || function (obj, key, desc) {
      obj[key] = desc.value;
    },
    $Symbol = "function" == typeof Symbol ? Symbol : {},
    iteratorSymbol = $Symbol.iterator || "@@iterator",
    asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
    toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
  function define(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }), obj[key];
  }
  try {
    define({}, "");
  } catch (err) {
    define = function (obj, key, value) {
      return obj[key] = value;
    };
  }
  function wrap(innerFn, outerFn, self, tryLocsList) {
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
      generator = Object.create(protoGenerator.prototype),
      context = new Context(tryLocsList || []);
    return defineProperty(generator, "_invoke", {
      value: makeInvokeMethod(innerFn, self, context)
    }), generator;
  }
  function tryCatch(fn, obj, arg) {
    try {
      return {
        type: "normal",
        arg: fn.call(obj, arg)
      };
    } catch (err) {
      return {
        type: "throw",
        arg: err
      };
    }
  }
  exports.wrap = wrap;
  var ContinueSentinel = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });
  var getProto = Object.getPrototypeOf,
    NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function (method) {
      define(prototype, method, function (arg) {
        return this._invoke(method, arg);
      });
    });
  }
  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if ("throw" !== record.type) {
        var result = record.arg,
          value = result.value;
        return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
          invoke("next", value, resolve, reject);
        }, function (err) {
          invoke("throw", err, resolve, reject);
        }) : PromiseImpl.resolve(value).then(function (unwrapped) {
          result.value = unwrapped, resolve(result);
        }, function (error) {
          return invoke("throw", error, resolve, reject);
        });
      }
      reject(record.arg);
    }
    var previousPromise;
    defineProperty(this, "_invoke", {
      value: function (method, arg) {
        function callInvokeWithMethodAndArg() {
          return new PromiseImpl(function (resolve, reject) {
            invoke(method, arg, resolve, reject);
          });
        }
        return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
      }
    });
  }
  function makeInvokeMethod(innerFn, self, context) {
    var state = "suspendedStart";
    return function (method, arg) {
      if ("executing" === state) throw new Error("Generator is already running");
      if ("completed" === state) {
        if ("throw" === method) throw arg;
        return doneResult();
      }
      for (context.method = method, context.arg = arg;;) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }
        if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
          if ("suspendedStart" === state) throw state = "completed", context.arg;
          context.dispatchException(context.arg);
        } else "return" === context.method && context.abrupt("return", context.arg);
        state = "executing";
        var record = tryCatch(innerFn, self, context);
        if ("normal" === record.type) {
          if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
          return {
            value: record.arg,
            done: context.done
          };
        }
        "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
      }
    };
  }
  function maybeInvokeDelegate(delegate, context) {
    var methodName = context.method,
      method = delegate.iterator[methodName];
    if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel;
    var record = tryCatch(method, delegate.iterator, context.arg);
    if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
    var info = record.arg;
    return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
  }
  function pushTryEntry(locs) {
    var entry = {
      tryLoc: locs[0]
    };
    1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
  }
  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal", delete record.arg, entry.completion = record;
  }
  function Context(tryLocsList) {
    this.tryEntries = [{
      tryLoc: "root"
    }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
  }
  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) return iteratorMethod.call(iterable);
      if ("function" == typeof iterable.next) return iterable;
      if (!isNaN(iterable.length)) {
        var i = -1,
          next = function next() {
            for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;
            return next.value = undefined, next.done = !0, next;
          };
        return next.next = next;
      }
    }
    return {
      next: doneResult
    };
  }
  function doneResult() {
    return {
      value: undefined,
      done: !0
    };
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", {
    value: GeneratorFunctionPrototype,
    configurable: !0
  }), defineProperty(GeneratorFunctionPrototype, "constructor", {
    value: GeneratorFunction,
    configurable: !0
  }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
    var ctor = "function" == typeof genFun && genFun.constructor;
    return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
  }, exports.mark = function (genFun) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
  }, exports.awrap = function (arg) {
    return {
      __await: arg
    };
  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    void 0 === PromiseImpl && (PromiseImpl = Promise);
    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
    return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
      return result.done ? result.value : iter.next();
    });
  }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
    return this;
  }), define(Gp, "toString", function () {
    return "[object Generator]";
  }), exports.keys = function (val) {
    var object = Object(val),
      keys = [];
    for (var key in object) keys.push(key);
    return keys.reverse(), function next() {
      for (; keys.length;) {
        var key = keys.pop();
        if (key in object) return next.value = key, next.done = !1, next;
      }
      return next.done = !0, next;
    };
  }, exports.values = values, Context.prototype = {
    constructor: Context,
    reset: function (skipTempReset) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
    },
    stop: function () {
      this.done = !0;
      var rootRecord = this.tryEntries[0].completion;
      if ("throw" === rootRecord.type) throw rootRecord.arg;
      return this.rval;
    },
    dispatchException: function (exception) {
      if (this.done) throw exception;
      var context = this;
      function handle(loc, caught) {
        return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
      }
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i],
          record = entry.completion;
        if ("root" === entry.tryLoc) return handle("end");
        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc"),
            hasFinally = hasOwn.call(entry, "finallyLoc");
          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
          } else {
            if (!hasFinally) throw new Error("try statement without catch or finally");
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          }
        }
      }
    },
    abrupt: function (type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }
      finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
      var record = finallyEntry ? finallyEntry.completion : {};
      return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
    },
    complete: function (record, afterLoc) {
      if ("throw" === record.type) throw record.arg;
      return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
    },
    finish: function (finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
      }
    },
    catch: function (tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if ("throw" === record.type) {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }
      throw new Error("illegal catch attempt");
    },
    delegateYield: function (iterable, resultName, nextLoc) {
      return this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
    }
  }, exports;
}
function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}
function _asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const objectToString = Object.prototype.toString;

/**
 * Checks whether given value's type is one of a few Error or Error-like
 * {@link isError}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isError(wat) {
  switch (objectToString.call(wat)) {
    case '[object Error]':
    case '[object Exception]':
    case '[object DOMException]':
      return true;
    default:
      return isInstanceOf(wat, Error);
  }
}
/**
 * Checks whether given value is an instance of the given built-in class.
 *
 * @param wat The value to be checked
 * @param className
 * @returns A boolean representing the result.
 */
function isBuiltin(wat, className) {
  return objectToString.call(wat) === `[object ${className}]`;
}

/**
 * Checks whether given value's type is ErrorEvent
 * {@link isErrorEvent}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isErrorEvent$1(wat) {
  return isBuiltin(wat, 'ErrorEvent');
}

/**
 * Checks whether given value's type is a string
 * {@link isString}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isString(wat) {
  return isBuiltin(wat, 'String');
}

/**
 * Checks whether given string is parameterized
 * {@link isParameterizedString}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isParameterizedString(wat) {
  return (
    typeof wat === 'object' &&
    wat !== null &&
    '__sentry_template_string__' in wat &&
    '__sentry_template_values__' in wat
  );
}

/**
 * Checks whether given value is a primitive (undefined, null, number, boolean, string, bigint, symbol)
 * {@link isPrimitive}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isPrimitive(wat) {
  return wat === null || isParameterizedString(wat) || (typeof wat !== 'object' && typeof wat !== 'function');
}

/**
 * Checks whether given value's type is an object literal, or a class instance.
 * {@link isPlainObject}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isPlainObject(wat) {
  return isBuiltin(wat, 'Object');
}

/**
 * Checks whether given value's type is an Event instance
 * {@link isEvent}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isEvent(wat) {
  return typeof Event !== 'undefined' && isInstanceOf(wat, Event);
}

/**
 * Checks whether given value's type is an Element instance
 * {@link isElement}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isElement(wat) {
  return typeof Element !== 'undefined' && isInstanceOf(wat, Element);
}

/**
 * Checks whether given value has a then function.
 * @param wat A value to be checked.
 */
function isThenable(wat) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return Boolean(wat && wat.then && typeof wat.then === 'function');
}

/**
 * Checks whether given value's type is a SyntheticEvent
 * {@link isSyntheticEvent}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isSyntheticEvent(wat) {
  return isPlainObject(wat) && 'nativeEvent' in wat && 'preventDefault' in wat && 'stopPropagation' in wat;
}

/**
 * Checks whether given value's type is an instance of provided constructor.
 * {@link isInstanceOf}.
 *
 * @param wat A value to be checked.
 * @param base A constructor to be used in a check.
 * @returns A boolean representing the result.
 */
function isInstanceOf(wat, base) {
  try {
    return wat instanceof base;
  } catch (_e) {
    return false;
  }
}

/**
 * Checks whether given value's type is a Vue ViewModel.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isVueViewModel(wat) {
  // Not using Object.prototype.toString because in Vue 3 it would read the instance's Symbol(Symbol.toStringTag) property.
  return !!(typeof wat === 'object' && wat !== null && ((wat ).__isVue || (wat )._isVue));
}

/**
 * Truncates given string to the maximum characters count
 *
 * @param str An object that contains serializable values
 * @param max Maximum number of characters in truncated string (0 = unlimited)
 * @returns string Encoded
 */
function truncate(str, max = 0) {
  if (typeof str !== 'string' || max === 0) {
    return str;
  }
  return str.length <= max ? str : `${str.slice(0, max)}...`;
}

const SDK_VERSION = '8.30.0';

/** Get's the global object for the current JavaScript runtime */
const GLOBAL_OBJ = globalThis ;

/**
 * Returns a global singleton contained in the global `__SENTRY__[]` object.
 *
 * If the singleton doesn't already exist in `__SENTRY__`, it will be created using the given factory
 * function and added to the `__SENTRY__` object.
 *
 * @param name name of the global singleton on __SENTRY__
 * @param creator creator Factory function to create the singleton if it doesn't already exist on `__SENTRY__`
 * @param obj (Optional) The global object on which to look for `__SENTRY__`, if not `GLOBAL_OBJ`'s return value
 * @returns the singleton
 */
function getGlobalSingleton(name, creator, obj) {
  const gbl = (obj || GLOBAL_OBJ) ;
  const __SENTRY__ = (gbl.__SENTRY__ = gbl.__SENTRY__ || {});
  const versionedCarrier = (__SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {});
  return versionedCarrier[name] || (versionedCarrier[name] = creator());
}

const WINDOW = GLOBAL_OBJ ;

const DEFAULT_MAX_STRING_LENGTH = 80;

/**
 * Given a child DOM element, returns a query-selector statement describing that
 * and its ancestors
 * e.g. [HTMLElement] => body > div > input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function htmlTreeAsString(
  elem,
  options = {},
) {
  if (!elem) {
    return '<unknown>';
  }

  // try/catch both:
  // - accessing event.target (see getsentry/raven-js#838, #768)
  // - `htmlTreeAsString` because it's complex, and just accessing the DOM incorrectly
  // - can throw an exception in some circumstances.
  try {
    let currentElem = elem ;
    const MAX_TRAVERSE_HEIGHT = 5;
    const out = [];
    let height = 0;
    let len = 0;
    const separator = ' > ';
    const sepLength = separator.length;
    let nextStr;
    const keyAttrs = Array.isArray(options) ? options : options.keyAttrs;
    const maxStringLength = (!Array.isArray(options) && options.maxStringLength) || DEFAULT_MAX_STRING_LENGTH;

    while (currentElem && height++ < MAX_TRAVERSE_HEIGHT) {
      nextStr = _htmlElementAsString(currentElem, keyAttrs);
      // bail out if
      // - nextStr is the 'html' element
      // - the length of the string that would be created exceeds maxStringLength
      //   (ignore this limit if we are on the first iteration)
      if (nextStr === 'html' || (height > 1 && len + out.length * sepLength + nextStr.length >= maxStringLength)) {
        break;
      }

      out.push(nextStr);

      len += nextStr.length;
      currentElem = currentElem.parentNode;
    }

    return out.reverse().join(separator);
  } catch (_oO) {
    return '<unknown>';
  }
}

/**
 * Returns a simple, query-selector representation of a DOM element
 * e.g. [HTMLElement] => input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function _htmlElementAsString(el, keyAttrs) {
  const elem = el

;

  const out = [];

  if (!elem || !elem.tagName) {
    return '';
  }

  // @ts-expect-error WINDOW has HTMLElement
  if (WINDOW.HTMLElement) {
    // If using the component name annotation plugin, this value may be available on the DOM node
    if (elem instanceof HTMLElement && elem.dataset) {
      if (elem.dataset['sentryComponent']) {
        return elem.dataset['sentryComponent'];
      }
      if (elem.dataset['sentryElement']) {
        return elem.dataset['sentryElement'];
      }
    }
  }

  out.push(elem.tagName.toLowerCase());

  // Pairs of attribute keys defined in `serializeAttribute` and their values on element.
  const keyAttrPairs =
    keyAttrs && keyAttrs.length
      ? keyAttrs.filter(keyAttr => elem.getAttribute(keyAttr)).map(keyAttr => [keyAttr, elem.getAttribute(keyAttr)])
      : null;

  if (keyAttrPairs && keyAttrPairs.length) {
    keyAttrPairs.forEach(keyAttrPair => {
      out.push(`[${keyAttrPair[0]}="${keyAttrPair[1]}"]`);
    });
  } else {
    if (elem.id) {
      out.push(`#${elem.id}`);
    }

    const className = elem.className;
    if (className && isString(className)) {
      const classes = className.split(/\s+/);
      for (const c of classes) {
        out.push(`.${c}`);
      }
    }
  }
  const allowedAttrs = ['aria-label', 'type', 'name', 'title', 'alt'];
  for (const k of allowedAttrs) {
    const attr = elem.getAttribute(k);
    if (attr) {
      out.push(`[${k}="${attr}"]`);
    }
  }

  return out.join('');
}

/**
 * This serves as a build time flag that will be true by default, but false in non-debug builds or if users replace `__SENTRY_DEBUG__` in their generated code.
 *
 * ATTENTION: This constant must never cross package boundaries (i.e. be exported) to guarantee that it can be used for tree shaking.
 */
const DEBUG_BUILD$1 = (typeof __SENTRY_DEBUG__ === 'undefined' || __SENTRY_DEBUG__);

/** Prefix for logging strings */
const PREFIX = 'Sentry Logger ';

const CONSOLE_LEVELS = [
  'debug',
  'info',
  'warn',
  'error',
  'log',
  'assert',
  'trace',
] ;

/** This may be mutated by the console instrumentation. */
const originalConsoleMethods

 = {};

/** JSDoc */

/**
 * Temporarily disable sentry console instrumentations.
 *
 * @param callback The function to run against the original `console` messages
 * @returns The results of the callback
 */
function consoleSandbox(callback) {
  if (!('console' in GLOBAL_OBJ)) {
    return callback();
  }

  const console = GLOBAL_OBJ.console ;
  const wrappedFuncs = {};

  const wrappedLevels = Object.keys(originalConsoleMethods) ;

  // Restore all wrapped console methods
  wrappedLevels.forEach(level => {
    const originalConsoleMethod = originalConsoleMethods[level] ;
    wrappedFuncs[level] = console[level] ;
    console[level] = originalConsoleMethod;
  });

  try {
    return callback();
  } finally {
    // Revert restoration to wrapped state
    wrappedLevels.forEach(level => {
      console[level] = wrappedFuncs[level] ;
    });
  }
}

function makeLogger() {
  let enabled = false;
  const logger = {
    enable: () => {
      enabled = true;
    },
    disable: () => {
      enabled = false;
    },
    isEnabled: () => enabled,
  };

  if (DEBUG_BUILD$1) {
    CONSOLE_LEVELS.forEach(name => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger[name] = (...args) => {
        if (enabled) {
          consoleSandbox(() => {
            GLOBAL_OBJ.console[name](`${PREFIX}[${name}]:`, ...args);
          });
        }
      };
    });
  } else {
    CONSOLE_LEVELS.forEach(name => {
      logger[name] = () => undefined;
    });
  }

  return logger ;
}

/**
 * This is a logger singleton which either logs things or no-ops if logging is not enabled.
 * The logger is a singleton on the carrier, to ensure that a consistent logger is used throughout the SDK.
 */
const logger = getGlobalSingleton('logger', makeLogger);

/** Regular expression used to parse a Dsn. */
const DSN_REGEX = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;

function isValidProtocol(protocol) {
  return protocol === 'http' || protocol === 'https';
}

/**
 * Renders the string representation of this Dsn.
 *
 * By default, this will render the public representation without the password
 * component. To get the deprecated private representation, set `withPassword`
 * to true.
 *
 * @param withPassword When set to true, the password will be included.
 */
function dsnToString(dsn, withPassword = false) {
  const { host, path, pass, port, projectId, protocol, publicKey } = dsn;
  return (
    `${protocol}://${publicKey}${withPassword && pass ? `:${pass}` : ''}` +
    `@${host}${port ? `:${port}` : ''}/${path ? `${path}/` : path}${projectId}`
  );
}

/**
 * Parses a Dsn from a given string.
 *
 * @param str A Dsn as string
 * @returns Dsn as DsnComponents or undefined if @param str is not a valid DSN string
 */
function dsnFromString(str) {
  const match = DSN_REGEX.exec(str);

  if (!match) {
    // This should be logged to the console
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.error(`Invalid Sentry Dsn: ${str}`);
    });
    return undefined;
  }

  const [protocol, publicKey, pass = '', host = '', port = '', lastPath = ''] = match.slice(1);
  let path = '';
  let projectId = lastPath;

  const split = projectId.split('/');
  if (split.length > 1) {
    path = split.slice(0, -1).join('/');
    projectId = split.pop() ;
  }

  if (projectId) {
    const projectMatch = projectId.match(/^\d+/);
    if (projectMatch) {
      projectId = projectMatch[0];
    }
  }

  return dsnFromComponents({ host, pass, path, projectId, port, protocol: protocol , publicKey });
}

function dsnFromComponents(components) {
  return {
    protocol: components.protocol,
    publicKey: components.publicKey || '',
    pass: components.pass || '',
    host: components.host,
    port: components.port || '',
    path: components.path || '',
    projectId: components.projectId,
  };
}

function validateDsn(dsn) {
  if (!DEBUG_BUILD$1) {
    return true;
  }

  const { port, projectId, protocol } = dsn;

  const requiredComponents = ['protocol', 'publicKey', 'host', 'projectId'];
  const hasMissingRequiredComponent = requiredComponents.find(component => {
    if (!dsn[component]) {
      logger.error(`Invalid Sentry Dsn: ${component} missing`);
      return true;
    }
    return false;
  });

  if (hasMissingRequiredComponent) {
    return false;
  }

  if (!projectId.match(/^\d+$/)) {
    logger.error(`Invalid Sentry Dsn: Invalid projectId ${projectId}`);
    return false;
  }

  if (!isValidProtocol(protocol)) {
    logger.error(`Invalid Sentry Dsn: Invalid protocol ${protocol}`);
    return false;
  }

  if (port && isNaN(parseInt(port, 10))) {
    logger.error(`Invalid Sentry Dsn: Invalid port ${port}`);
    return false;
  }

  return true;
}

/**
 * Creates a valid Sentry Dsn object, identifying a Sentry instance and project.
 * @returns a valid DsnComponents object or `undefined` if @param from is an invalid DSN source
 */
function makeDsn(from) {
  const components = typeof from === 'string' ? dsnFromString(from) : dsnFromComponents(from);
  if (!components || !validateDsn(components)) {
    return undefined;
  }
  return components;
}

/** An error emitted by Sentry SDKs and related utilities. */
class SentryError extends Error {
  /** Display name of this error instance. */

   constructor( message, logLevel = 'warn') {
    super(message);this.message = message;
    this.name = new.target.prototype.constructor.name;
    // This sets the prototype to be `Error`, not `SentryError`. It's unclear why we do this, but commenting this line
    // out causes various (seemingly totally unrelated) playwright tests consistently time out. FYI, this makes
    // instances of `SentryError` fail `obj instanceof SentryError` checks.
    Object.setPrototypeOf(this, new.target.prototype);
    this.logLevel = logLevel;
  }
}

/**
 * Defines a non-enumerable property on the given object.
 *
 * @param obj The object on which to set the property
 * @param name The name of the property to be set
 * @param value The value to which to set the property
 */
function addNonEnumerableProperty(obj, name, value) {
  try {
    Object.defineProperty(obj, name, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: value,
      writable: true,
      configurable: true,
    });
  } catch (o_O) {
    DEBUG_BUILD$1 && logger.log(`Failed to add non-enumerable property "${name}" to object`, obj);
  }
}

/**
 * Encodes given object into url-friendly format
 *
 * @param object An object that contains serializable values
 * @returns string Encoded
 */
function urlEncode(object) {
  return Object.keys(object)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(object[key])}`)
    .join('&');
}

/**
 * Transforms any `Error` or `Event` into a plain object with all of their enumerable properties, and some of their
 * non-enumerable properties attached.
 *
 * @param value Initial source that we have to transform in order for it to be usable by the serializer
 * @returns An Event or Error turned into an object - or the value argurment itself, when value is neither an Event nor
 *  an Error.
 */
function convertToPlainObject(
  value,
)

 {
  if (isError(value)) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
      ...getOwnProperties(value),
    };
  } else if (isEvent(value)) {
    const newObj

 = {
      type: value.type,
      target: serializeEventTarget(value.target),
      currentTarget: serializeEventTarget(value.currentTarget),
      ...getOwnProperties(value),
    };

    if (typeof CustomEvent !== 'undefined' && isInstanceOf(value, CustomEvent)) {
      newObj.detail = value.detail;
    }

    return newObj;
  } else {
    return value;
  }
}

/** Creates a string representation of the target of an `Event` object */
function serializeEventTarget(target) {
  try {
    return isElement(target) ? htmlTreeAsString(target) : Object.prototype.toString.call(target);
  } catch (_oO) {
    return '<unknown>';
  }
}

/** Filters out all but an object's own properties */
function getOwnProperties(obj) {
  if (typeof obj === 'object' && obj !== null) {
    const extractedProps = {};
    for (const property in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, property)) {
        extractedProps[property] = (obj )[property];
      }
    }
    return extractedProps;
  } else {
    return {};
  }
}

/**
 * Given any captured exception, extract its keys and create a sorted
 * and truncated list that will be used inside the event message.
 * eg. `Non-error exception captured with keys: foo, bar, baz`
 */
function extractExceptionKeysForMessage(exception, maxLength = 40) {
  const keys = Object.keys(convertToPlainObject(exception));
  keys.sort();

  const firstKey = keys[0];

  if (!firstKey) {
    return '[object has no keys]';
  }

  if (firstKey.length >= maxLength) {
    return truncate(firstKey, maxLength);
  }

  for (let includedKeys = keys.length; includedKeys > 0; includedKeys--) {
    const serialized = keys.slice(0, includedKeys).join(', ');
    if (serialized.length > maxLength) {
      continue;
    }
    if (includedKeys === keys.length) {
      return serialized;
    }
    return truncate(serialized, maxLength);
  }

  return '';
}

/**
 * Given any object, return a new object having removed all fields whose value was `undefined`.
 * Works recursively on objects and arrays.
 *
 * Attention: This function keeps circular references in the returned object.
 */
function dropUndefinedKeys(inputValue) {
  // This map keeps track of what already visited nodes map to.
  // Our Set - based memoBuilder doesn't work here because we want to the output object to have the same circular
  // references as the input object.
  const memoizationMap = new Map();

  // This function just proxies `_dropUndefinedKeys` to keep the `memoBuilder` out of this function's API
  return _dropUndefinedKeys(inputValue, memoizationMap);
}

function _dropUndefinedKeys(inputValue, memoizationMap) {
  if (isPojo(inputValue)) {
    // If this node has already been visited due to a circular reference, return the object it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal ;
    }

    const returnValue = {};
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    for (const key of Object.keys(inputValue)) {
      if (typeof inputValue[key] !== 'undefined') {
        returnValue[key] = _dropUndefinedKeys(inputValue[key], memoizationMap);
      }
    }

    return returnValue ;
  }

  if (Array.isArray(inputValue)) {
    // If this node has already been visited due to a circular reference, return the array it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal ;
    }

    const returnValue = [];
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    inputValue.forEach((item) => {
      returnValue.push(_dropUndefinedKeys(item, memoizationMap));
    });

    return returnValue ;
  }

  return inputValue;
}

function isPojo(input) {
  if (!isPlainObject(input)) {
    return false;
  }

  try {
    const name = (Object.getPrototypeOf(input) ).constructor.name;
    return !name || name === 'Object';
  } catch (e) {
    return true;
  }
}

const STACKTRACE_FRAME_LIMIT = 50;
const UNKNOWN_FUNCTION = '?';
// Used to sanitize webpack (error: *) wrapped stack errors
const WEBPACK_ERROR_REGEXP = /\(error: (.*)\)/;
const STRIP_FRAME_REGEXP = /captureMessage|captureException/;

/**
 * Creates a stack parser with the supplied line parsers
 *
 * StackFrames are returned in the correct order for Sentry Exception
 * frames and with Sentry SDK internal frames removed from the top and bottom
 *
 */
function createStackParser(...parsers) {
  const sortedParsers = parsers.sort((a, b) => a[0] - b[0]).map(p => p[1]);

  return (stack, skipFirstLines = 0, framesToPop = 0) => {
    const frames = [];
    const lines = stack.split('\n');

    for (let i = skipFirstLines; i < lines.length; i++) {
      const line = lines[i] ;
      // Ignore lines over 1kb as they are unlikely to be stack frames.
      // Many of the regular expressions use backtracking which results in run time that increases exponentially with
      // input size. Huge strings can result in hangs/Denial of Service:
      // https://github.com/getsentry/sentry-javascript/issues/2286
      if (line.length > 1024) {
        continue;
      }

      // https://github.com/getsentry/sentry-javascript/issues/5459
      // Remove webpack (error: *) wrappers
      const cleanedLine = WEBPACK_ERROR_REGEXP.test(line) ? line.replace(WEBPACK_ERROR_REGEXP, '$1') : line;

      // https://github.com/getsentry/sentry-javascript/issues/7813
      // Skip Error: lines
      if (cleanedLine.match(/\S*Error: /)) {
        continue;
      }

      for (const parser of sortedParsers) {
        const frame = parser(cleanedLine);

        if (frame) {
          frames.push(frame);
          break;
        }
      }

      if (frames.length >= STACKTRACE_FRAME_LIMIT + framesToPop) {
        break;
      }
    }

    return stripSentryFramesAndReverse(frames.slice(framesToPop));
  };
}

/**
 * Removes Sentry frames from the top and bottom of the stack if present and enforces a limit of max number of frames.
 * Assumes stack input is ordered from top to bottom and returns the reverse representation so call site of the
 * function that caused the crash is the last frame in the array.
 * @hidden
 */
function stripSentryFramesAndReverse(stack) {
  if (!stack.length) {
    return [];
  }

  const localStack = Array.from(stack);

  // If stack starts with one of our API calls, remove it (starts, meaning it's the top of the stack - aka last call)
  if (/sentryWrapped/.test(getLastStackFrame(localStack).function || '')) {
    localStack.pop();
  }

  // Reversing in the middle of the procedure allows us to just pop the values off the stack
  localStack.reverse();

  // If stack ends with one of our internal API calls, remove it (ends, meaning it's the bottom of the stack - aka top-most call)
  if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || '')) {
    localStack.pop();

    // When using synthetic events, we will have a 2 levels deep stack, as `new Error('Sentry syntheticException')`
    // is produced within the hub itself, making it:
    //
    //   Sentry.captureException()
    //   getCurrentHub().captureException()
    //
    // instead of just the top `Sentry` call itself.
    // This forces us to possibly strip an additional frame in the exact same was as above.
    if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || '')) {
      localStack.pop();
    }
  }

  return localStack.slice(0, STACKTRACE_FRAME_LIMIT).map(frame => ({
    ...frame,
    filename: frame.filename || getLastStackFrame(localStack).filename,
    function: frame.function || UNKNOWN_FUNCTION,
  }));
}

function getLastStackFrame(arr) {
  return arr[arr.length - 1] || {};
}

const defaultFunctionName = '<anonymous>';

/**
 * Safely extract function name from itself
 */
function getFunctionName(fn) {
  try {
    if (!fn || typeof fn !== 'function') {
      return defaultFunctionName;
    }
    return fn.name || defaultFunctionName;
  } catch (e) {
    // Just accessing custom props in some Selenium environments
    // can cause a "Permission denied" exception (see raven-js#495).
    return defaultFunctionName;
  }
}

// We keep the handlers globally
const handlers = {};
const instrumented = {};

/** Add a handler function. */
function addHandler(type, handler) {
  handlers[type] = handlers[type] || [];
  (handlers[type] ).push(handler);
}

/** Maybe run an instrumentation function, unless it was already called. */
function maybeInstrument(type, instrumentFn) {
  if (!instrumented[type]) {
    instrumentFn();
    instrumented[type] = true;
  }
}

/** Trigger handlers for a given instrumentation type. */
function triggerHandlers(type, data) {
  const typeHandlers = type && handlers[type];
  if (!typeHandlers) {
    return;
  }

  for (const handler of typeHandlers) {
    try {
      handler(data);
    } catch (e) {
      DEBUG_BUILD$1 &&
        logger.error(
          `Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`,
          e,
        );
    }
  }
}

const ONE_SECOND_IN_MS = 1000;

/**
 * A partial definition of the [Performance Web API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Performance}
 * for accessing a high-resolution monotonic clock.
 */

/**
 * Returns a timestamp in seconds since the UNIX epoch using the Date API.
 *
 * TODO(v8): Return type should be rounded.
 */
function dateTimestampInSeconds() {
  return Date.now() / ONE_SECOND_IN_MS;
}

/**
 * Returns a wrapper around the native Performance API browser implementation, or undefined for browsers that do not
 * support the API.
 *
 * Wrapping the native API works around differences in behavior from different browsers.
 */
function createUnixTimestampInSecondsFunc() {
  const { performance } = GLOBAL_OBJ ;
  if (!performance || !performance.now) {
    return dateTimestampInSeconds;
  }

  // Some browser and environments don't have a timeOrigin, so we fallback to
  // using Date.now() to compute the starting time.
  const approxStartingTimeOrigin = Date.now() - performance.now();
  const timeOrigin = performance.timeOrigin == undefined ? approxStartingTimeOrigin : performance.timeOrigin;

  // performance.now() is a monotonic clock, which means it starts at 0 when the process begins. To get the current
  // wall clock time (actual UNIX timestamp), we need to add the starting time origin and the current time elapsed.
  //
  // TODO: This does not account for the case where the monotonic clock that powers performance.now() drifts from the
  // wall clock time, which causes the returned timestamp to be inaccurate. We should investigate how to detect and
  // correct for this.
  // See: https://github.com/getsentry/sentry-javascript/issues/2590
  // See: https://github.com/mdn/content/issues/4713
  // See: https://dev.to/noamr/when-a-millisecond-is-not-a-millisecond-3h6
  return () => {
    return (timeOrigin + performance.now()) / ONE_SECOND_IN_MS;
  };
}

/**
 * Returns a timestamp in seconds since the UNIX epoch using either the Performance or Date APIs, depending on the
 * availability of the Performance API.
 *
 * BUG: Note that because of how browsers implement the Performance API, the clock might stop when the computer is
 * asleep. This creates a skew between `dateTimestampInSeconds` and `timestampInSeconds`. The
 * skew can grow to arbitrary amounts like days, weeks or months.
 * See https://github.com/getsentry/sentry-javascript/issues/2590.
 */
const timestampInSeconds = createUnixTimestampInSecondsFunc();

/**
 * The number of milliseconds since the UNIX epoch. This value is only usable in a browser, and only when the
 * performance API is available.
 */
(() => {
  // Unfortunately browsers may report an inaccurate time origin data, through either performance.timeOrigin or
  // performance.timing.navigationStart, which results in poor results in performance data. We only treat time origin
  // data as reliable if they are within a reasonable threshold of the current time.

  const { performance } = GLOBAL_OBJ ;
  if (!performance || !performance.now) {
    return undefined;
  }

  const threshold = 3600 * 1000;
  const performanceNow = performance.now();
  const dateNow = Date.now();

  // if timeOrigin isn't available set delta to threshold so it isn't used
  const timeOriginDelta = performance.timeOrigin
    ? Math.abs(performance.timeOrigin + performanceNow - dateNow)
    : threshold;
  const timeOriginIsReliable = timeOriginDelta < threshold;

  // While performance.timing.navigationStart is deprecated in favor of performance.timeOrigin, performance.timeOrigin
  // is not as widely supported. Namely, performance.timeOrigin is undefined in Safari as of writing.
  // Also as of writing, performance.timing is not available in Web Workers in mainstream browsers, so it is not always
  // a valid fallback. In the absence of an initial time provided by the browser, fallback to the current time from the
  // Date API.
  // eslint-disable-next-line deprecation/deprecation
  const navigationStart = performance.timing && performance.timing.navigationStart;
  const hasNavigationStart = typeof navigationStart === 'number';
  // if navigationStart isn't available set delta to threshold so it isn't used
  const navigationStartDelta = hasNavigationStart ? Math.abs(navigationStart + performanceNow - dateNow) : threshold;
  const navigationStartIsReliable = navigationStartDelta < threshold;

  if (timeOriginIsReliable || navigationStartIsReliable) {
    // Use the more reliable time origin
    if (timeOriginDelta <= navigationStartDelta) {
      return performance.timeOrigin;
    } else {
      return navigationStart;
    }
  }
  return dateNow;
})();

let _oldOnErrorHandler = null;

/**
 * Add an instrumentation handler for when an error is captured by the global error handler.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addGlobalErrorInstrumentationHandler(handler) {
  const type = 'error';
  addHandler(type, handler);
  maybeInstrument(type, instrumentError);
}

function instrumentError() {
  _oldOnErrorHandler = GLOBAL_OBJ.onerror;

  GLOBAL_OBJ.onerror = function (
    msg,
    url,
    line,
    column,
    error,
  ) {
    const handlerData = {
      column,
      error,
      line,
      msg,
      url,
    };
    triggerHandlers('error', handlerData);

    if (_oldOnErrorHandler && !_oldOnErrorHandler.__SENTRY_LOADER__) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnErrorHandler.apply(this, arguments);
    }

    return false;
  };

  GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
}

let _oldOnUnhandledRejectionHandler = null;

/**
 * Add an instrumentation handler for when an unhandled promise rejection is captured.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addGlobalUnhandledRejectionInstrumentationHandler(
  handler,
) {
  const type = 'unhandledrejection';
  addHandler(type, handler);
  maybeInstrument(type, instrumentUnhandledRejection);
}

function instrumentUnhandledRejection() {
  _oldOnUnhandledRejectionHandler = GLOBAL_OBJ.onunhandledrejection;

  GLOBAL_OBJ.onunhandledrejection = function (e) {
    const handlerData = e;
    triggerHandlers('unhandledrejection', handlerData);

    if (_oldOnUnhandledRejectionHandler && !_oldOnUnhandledRejectionHandler.__SENTRY_LOADER__) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnUnhandledRejectionHandler.apply(this, arguments);
    }

    return true;
  };

  GLOBAL_OBJ.onunhandledrejection.__SENTRY_INSTRUMENTED__ = true;
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Helper to decycle json objects
 */
function memoBuilder() {
  const hasWeakSet = typeof WeakSet === 'function';
  const inner = hasWeakSet ? new WeakSet() : [];
  function memoize(obj) {
    if (hasWeakSet) {
      if (inner.has(obj)) {
        return true;
      }
      inner.add(obj);
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < inner.length; i++) {
      const value = inner[i];
      if (value === obj) {
        return true;
      }
    }
    inner.push(obj);
    return false;
  }

  function unmemoize(obj) {
    if (hasWeakSet) {
      inner.delete(obj);
    } else {
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === obj) {
          inner.splice(i, 1);
          break;
        }
      }
    }
  }
  return [memoize, unmemoize];
}

/**
 * UUID4 generator
 *
 * @returns string Generated UUID4.
 */
function uuid4() {
  const gbl = GLOBAL_OBJ ;
  const crypto = gbl.crypto || gbl.msCrypto;

  let getRandomByte = () => Math.random() * 16;
  try {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    if (crypto && crypto.getRandomValues) {
      getRandomByte = () => {
        // crypto.getRandomValues might return undefined instead of the typed array
        // in old Chromium versions (e.g. 23.0.1235.0 (151422))
        // However, `typedArray` is still filled in-place.
        // @see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#typedarray
        const typedArray = new Uint8Array(1);
        crypto.getRandomValues(typedArray);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return typedArray[0];
      };
    }
  } catch (_) {
    // some runtimes can crash invoking crypto
    // https://github.com/getsentry/sentry-javascript/issues/8935
  }

  // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
  // Concatenating the following numbers as strings results in '10000000100040008000100000000000'
  return (([1e7] ) + 1e3 + 4e3 + 8e3 + 1e11).replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    ((c ) ^ ((getRandomByte() & 15) >> ((c ) / 4))).toString(16),
  );
}

function getFirstException(event) {
  return event.exception && event.exception.values ? event.exception.values[0] : undefined;
}

/**
 * Adds exception values, type and value to an synthetic Exception.
 * @param event The event to modify.
 * @param value Value of the exception.
 * @param type Type of the exception.
 * @hidden
 */
function addExceptionTypeValue(event, value, type) {
  const exception = (event.exception = event.exception || {});
  const values = (exception.values = exception.values || []);
  const firstException = (values[0] = values[0] || {});
  if (!firstException.value) {
    firstException.value = value || '';
  }
  if (!firstException.type) {
    firstException.type = type || 'Error';
  }
}

/**
 * Adds exception mechanism data to a given event. Uses defaults if the second parameter is not passed.
 *
 * @param event The event to modify.
 * @param newMechanism Mechanism data to add to the event.
 * @hidden
 */
function addExceptionMechanism(event, newMechanism) {
  const firstException = getFirstException(event);
  if (!firstException) {
    return;
  }

  const defaultMechanism = { type: 'generic', handled: true };
  const currentMechanism = firstException.mechanism;
  firstException.mechanism = { ...defaultMechanism, ...currentMechanism, ...newMechanism };

  if (newMechanism && 'data' in newMechanism) {
    const mergedData = { ...(currentMechanism && currentMechanism.data), ...newMechanism.data };
    firstException.mechanism.data = mergedData;
  }
}

/**
 * Checks whether or not we've already captured the given exception (note: not an identical exception - the very object
 * in question), and marks it captured if not.
 *
 * This is useful because it's possible for an error to get captured by more than one mechanism. After we intercept and
 * record an error, we rethrow it (assuming we've intercepted it before it's reached the top-level global handlers), so
 * that we don't interfere with whatever effects the error might have had were the SDK not there. At that point, because
 * the error has been rethrown, it's possible for it to bubble up to some other code we've instrumented. If it's not
 * caught after that, it will bubble all the way up to the global handlers (which of course we also instrument). This
 * function helps us ensure that even if we encounter the same error more than once, we only record it the first time we
 * see it.
 *
 * Note: It will ignore primitives (always return `false` and not mark them as seen), as properties can't be set on
 * them. {@link: Object.objectify} can be used on exceptions to convert any that are primitives into their equivalent
 * object wrapper forms so that this check will always work. However, because we need to flag the exact object which
 * will get rethrown, and because that rethrowing happens outside of the event processing pipeline, the objectification
 * must be done before the exception captured.
 *
 * @param A thrown exception to check or flag as having been seen
 * @returns `true` if the exception has already been captured, `false` if not (with the side effect of marking it seen)
 */
function checkOrSetAlreadyCaught(exception) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (exception && (exception ).__sentry_captured__) {
    return true;
  }

  try {
    // set it this way rather than by assignment so that it's not ennumerable and therefore isn't recorded by the
    // `ExtraErrorData` integration
    addNonEnumerableProperty(exception , '__sentry_captured__', true);
  } catch (err) {
    // `exception` is a primitive, so we can't mark it seen
  }

  return false;
}

/**
 * Checks whether the given input is already an array, and if it isn't, wraps it in one.
 *
 * @param maybeArray Input to turn into an array, if necessary
 * @returns The input, if already an array, or an array with the input as the only element, if not
 */
function arrayify$1(maybeArray) {
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

/**
 * Recursively normalizes the given object.
 *
 * - Creates a copy to prevent original input mutation
 * - Skips non-enumerable properties
 * - When stringifying, calls `toJSON` if implemented
 * - Removes circular references
 * - Translates non-serializable values (`undefined`/`NaN`/functions) to serializable format
 * - Translates known global objects/classes to a string representations
 * - Takes care of `Error` object serialization
 * - Optionally limits depth of final output
 * - Optionally limits number of properties/elements included in any single object/array
 *
 * @param input The object to be normalized.
 * @param depth The max depth to which to normalize the object. (Anything deeper stringified whole.)
 * @param maxProperties The max number of elements or properties to be included in any single array or
 * object in the normallized output.
 * @returns A normalized version of the object, or `"**non-serializable**"` if any errors are thrown during normalization.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(input, depth = 100, maxProperties = +Infinity) {
  try {
    // since we're at the outermost level, we don't provide a key
    return visit('', input, depth, maxProperties);
  } catch (err) {
    return { ERROR: `**non-serializable** (${err})` };
  }
}

/** JSDoc */
function normalizeToSize(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object,
  // Default Node.js REPL depth
  depth = 3,
  // 100kB, as 200kB is max payload size, so half sounds reasonable
  maxSize = 100 * 1024,
) {
  const normalized = normalize(object, depth);

  if (jsonSize(normalized) > maxSize) {
    return normalizeToSize(object, depth - 1, maxSize);
  }

  return normalized ;
}

/**
 * Visits a node to perform normalization on it
 *
 * @param key The key corresponding to the given node
 * @param value The node to be visited
 * @param depth Optional number indicating the maximum recursion depth
 * @param maxProperties Optional maximum number of properties/elements included in any single object/array
 * @param memo Optional Memo class handling decycling
 */
function visit(
  key,
  value,
  depth = +Infinity,
  maxProperties = +Infinity,
  memo = memoBuilder(),
) {
  const [memoize, unmemoize] = memo;

  // Get the simple cases out of the way first
  if (
    value == null || // this matches null and undefined -> eqeq not eqeqeq
    (['number', 'boolean', 'string'].includes(typeof value) && !Number.isNaN(value))
  ) {
    return value ;
  }

  const stringified = stringifyValue(key, value);

  // Anything we could potentially dig into more (objects or arrays) will have come back as `"[object XXXX]"`.
  // Everything else will have already been serialized, so if we don't see that pattern, we're done.
  if (!stringified.startsWith('[object ')) {
    return stringified;
  }

  // From here on, we can assert that `value` is either an object or an array.

  // Do not normalize objects that we know have already been normalized. As a general rule, the
  // "__sentry_skip_normalization__" property should only be used sparingly and only should only be set on objects that
  // have already been normalized.
  if ((value )['__sentry_skip_normalization__']) {
    return value ;
  }

  // We can set `__sentry_override_normalization_depth__` on an object to ensure that from there
  // We keep a certain amount of depth.
  // This should be used sparingly, e.g. we use it for the redux integration to ensure we get a certain amount of state.
  const remainingDepth =
    typeof (value )['__sentry_override_normalization_depth__'] === 'number'
      ? ((value )['__sentry_override_normalization_depth__'] )
      : depth;

  // We're also done if we've reached the max depth
  if (remainingDepth === 0) {
    // At this point we know `serialized` is a string of the form `"[object XXXX]"`. Clean it up so it's just `"[XXXX]"`.
    return stringified.replace('object ', '');
  }

  // If we've already visited this branch, bail out, as it's circular reference. If not, note that we're seeing it now.
  if (memoize(value)) {
    return '[Circular ~]';
  }

  // If the value has a `toJSON` method, we call it to extract more information
  const valueWithToJSON = value ;
  if (valueWithToJSON && typeof valueWithToJSON.toJSON === 'function') {
    try {
      const jsonValue = valueWithToJSON.toJSON();
      // We need to normalize the return value of `.toJSON()` in case it has circular references
      return visit('', jsonValue, remainingDepth - 1, maxProperties, memo);
    } catch (err) {
      // pass (The built-in `toJSON` failed, but we can still try to do it ourselves)
    }
  }

  // At this point we know we either have an object or an array, we haven't seen it before, and we're going to recurse
  // because we haven't yet reached the max depth. Create an accumulator to hold the results of visiting each
  // property/entry, and keep track of the number of items we add to it.
  const normalized = (Array.isArray(value) ? [] : {}) ;
  let numAdded = 0;

  // Before we begin, convert`Error` and`Event` instances into plain objects, since some of each of their relevant
  // properties are non-enumerable and otherwise would get missed.
  const visitable = convertToPlainObject(value );

  for (const visitKey in visitable) {
    // Avoid iterating over fields in the prototype if they've somehow been exposed to enumeration.
    if (!Object.prototype.hasOwnProperty.call(visitable, visitKey)) {
      continue;
    }

    if (numAdded >= maxProperties) {
      normalized[visitKey] = '[MaxProperties ~]';
      break;
    }

    // Recursively visit all the child nodes
    const visitValue = visitable[visitKey];
    normalized[visitKey] = visit(visitKey, visitValue, remainingDepth - 1, maxProperties, memo);

    numAdded++;
  }

  // Once we've visited all the branches, remove the parent from memo storage
  unmemoize(value);

  // Return accumulated values
  return normalized;
}

/* eslint-disable complexity */
/**
 * Stringify the given value. Handles various known special values and types.
 *
 * Not meant to be used on simple primitives which already have a string representation, as it will, for example, turn
 * the number 1231 into "[Object Number]", nor on `null`, as it will throw.
 *
 * @param value The value to stringify
 * @returns A stringified representation of the given value
 */
function stringifyValue(
  key,
  // this type is a tiny bit of a cheat, since this function does handle NaN (which is technically a number), but for
  // our internal use, it'll do
  value,
) {
  try {
    if (key === 'domain' && value && typeof value === 'object' && (value )._events) {
      return '[Domain]';
    }

    if (key === 'domainEmitter') {
      return '[DomainEmitter]';
    }

    // It's safe to use `global`, `window`, and `document` here in this manner, as we are asserting using `typeof` first
    // which won't throw if they are not present.

    if (typeof global !== 'undefined' && value === global) {
      return '[Global]';
    }

    // eslint-disable-next-line no-restricted-globals
    if (typeof window !== 'undefined' && value === window) {
      return '[Window]';
    }

    // eslint-disable-next-line no-restricted-globals
    if (typeof document !== 'undefined' && value === document) {
      return '[Document]';
    }

    if (isVueViewModel(value)) {
      return '[VueViewModel]';
    }

    // React's SyntheticEvent thingy
    if (isSyntheticEvent(value)) {
      return '[SyntheticEvent]';
    }

    if (typeof value === 'number' && value !== value) {
      return '[NaN]';
    }

    if (typeof value === 'function') {
      return `[Function: ${getFunctionName(value)}]`;
    }

    if (typeof value === 'symbol') {
      return `[${String(value)}]`;
    }

    // stringified BigInts are indistinguishable from regular numbers, so we need to label them to avoid confusion
    if (typeof value === 'bigint') {
      return `[BigInt: ${String(value)}]`;
    }

    // Now that we've knocked out all the special cases and the primitives, all we have left are objects. Simply casting
    // them to strings means that instances of classes which haven't defined their `toStringTag` will just come out as
    // `"[object Object]"`. If we instead look at the constructor's name (which is the same as the name of the class),
    // we can make sure that only plain objects come out that way.
    const objName = getConstructorName(value);

    // Handle HTML Elements
    if (/^HTML(\w*)Element$/.test(objName)) {
      return `[HTMLElement: ${objName}]`;
    }

    return `[object ${objName}]`;
  } catch (err) {
    return `**non-serializable** (${err})`;
  }
}
/* eslint-enable complexity */

function getConstructorName(value) {
  const prototype = Object.getPrototypeOf(value);

  return prototype ? prototype.constructor.name : 'null prototype';
}

/** Calculates bytes size of input string */
function utf8Length(value) {
  // eslint-disable-next-line no-bitwise
  return ~-encodeURI(value).split(/%..|./).length;
}

/** Calculates bytes size of input object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonSize(value) {
  return utf8Length(JSON.stringify(value));
}

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** SyncPromise internal states */
var States; (function (States) {
  /** Pending */
  const PENDING = 0; States[States["PENDING"] = PENDING] = "PENDING";
  /** Resolved / OK */
  const RESOLVED = 1; States[States["RESOLVED"] = RESOLVED] = "RESOLVED";
  /** Rejected / Error */
  const REJECTED = 2; States[States["REJECTED"] = REJECTED] = "REJECTED";
})(States || (States = {}));

// Overloads so we can call resolvedSyncPromise without arguments and generic argument

/**
 * Creates a resolved sync promise.
 *
 * @param value the value to resolve the promise with
 * @returns the resolved sync promise
 */
function resolvedSyncPromise(value) {
  return new SyncPromise(resolve => {
    resolve(value);
  });
}

/**
 * Creates a rejected sync promise.
 *
 * @param value the value to reject the promise with
 * @returns the rejected sync promise
 */
function rejectedSyncPromise(reason) {
  return new SyncPromise((_, reject) => {
    reject(reason);
  });
}

/**
 * Thenable class that behaves like a Promise and follows it's interface
 * but is not async internally
 */
class SyncPromise {

   constructor(
    executor,
  ) {SyncPromise.prototype.__init.call(this);SyncPromise.prototype.__init2.call(this);SyncPromise.prototype.__init3.call(this);SyncPromise.prototype.__init4.call(this);
    this._state = States.PENDING;
    this._handlers = [];

    try {
      executor(this._resolve, this._reject);
    } catch (e) {
      this._reject(e);
    }
  }

  /** JSDoc */
   then(
    onfulfilled,
    onrejected,
  ) {
    return new SyncPromise((resolve, reject) => {
      this._handlers.push([
        false,
        result => {
          if (!onfulfilled) {
            // TODO: ¯\_(ツ)_/¯
            // TODO: FIXME
            resolve(result );
          } else {
            try {
              resolve(onfulfilled(result));
            } catch (e) {
              reject(e);
            }
          }
        },
        reason => {
          if (!onrejected) {
            reject(reason);
          } else {
            try {
              resolve(onrejected(reason));
            } catch (e) {
              reject(e);
            }
          }
        },
      ]);
      this._executeHandlers();
    });
  }

  /** JSDoc */
   catch(
    onrejected,
  ) {
    return this.then(val => val, onrejected);
  }

  /** JSDoc */
   finally(onfinally) {
    return new SyncPromise((resolve, reject) => {
      let val;
      let isRejected;

      return this.then(
        value => {
          isRejected = false;
          val = value;
          if (onfinally) {
            onfinally();
          }
        },
        reason => {
          isRejected = true;
          val = reason;
          if (onfinally) {
            onfinally();
          }
        },
      ).then(() => {
        if (isRejected) {
          reject(val);
          return;
        }

        resolve(val );
      });
    });
  }

  /** JSDoc */
    __init() {this._resolve = (value) => {
    this._setResult(States.RESOLVED, value);
  };}

  /** JSDoc */
    __init2() {this._reject = (reason) => {
    this._setResult(States.REJECTED, reason);
  };}

  /** JSDoc */
    __init3() {this._setResult = (state, value) => {
    if (this._state !== States.PENDING) {
      return;
    }

    if (isThenable(value)) {
      void (value ).then(this._resolve, this._reject);
      return;
    }

    this._state = state;
    this._value = value;

    this._executeHandlers();
  };}

  /** JSDoc */
    __init4() {this._executeHandlers = () => {
    if (this._state === States.PENDING) {
      return;
    }

    const cachedHandlers = this._handlers.slice();
    this._handlers = [];

    cachedHandlers.forEach(handler => {
      if (handler[0]) {
        return;
      }

      if (this._state === States.RESOLVED) {
        handler[1](this._value );
      }

      if (this._state === States.REJECTED) {
        handler[2](this._value);
      }

      handler[0] = true;
    });
  };}
}

/**
 * Creates an new PromiseBuffer object with the specified limit
 * @param limit max number of promises that can be stored in the buffer
 */
function makePromiseBuffer(limit) {
  const buffer = [];

  function isReady() {
    return limit === undefined || buffer.length < limit;
  }

  /**
   * Remove a promise from the queue.
   *
   * @param task Can be any PromiseLike<T>
   * @returns Removed promise.
   */
  function remove(task) {
    return buffer.splice(buffer.indexOf(task), 1)[0] || Promise.resolve(undefined);
  }

  /**
   * Add a promise (representing an in-flight action) to the queue, and set it to remove itself on fulfillment.
   *
   * @param taskProducer A function producing any PromiseLike<T>; In previous versions this used to be `task:
   *        PromiseLike<T>`, but under that model, Promises were instantly created on the call-site and their executor
   *        functions therefore ran immediately. Thus, even if the buffer was full, the action still happened. By
   *        requiring the promise to be wrapped in a function, we can defer promise creation until after the buffer
   *        limit check.
   * @returns The original promise.
   */
  function add(taskProducer) {
    if (!isReady()) {
      return rejectedSyncPromise(new SentryError('Not adding Promise because buffer limit was reached.'));
    }

    // start the task and add its promise to the queue
    const task = taskProducer();
    if (buffer.indexOf(task) === -1) {
      buffer.push(task);
    }
    void task
      .then(() => remove(task))
      // Use `then(null, rejectionHandler)` rather than `catch(rejectionHandler)` so that we can use `PromiseLike`
      // rather than `Promise`. `PromiseLike` doesn't have a `.catch` method, making its polyfill smaller. (ES5 didn't
      // have promises, so TS has to polyfill when down-compiling.)
      .then(null, () =>
        remove(task).then(null, () => {
          // We have to add another catch here because `remove()` starts a new promise chain.
        }),
      );
    return task;
  }

  /**
   * Wait for all promises in the queue to resolve or for timeout to expire, whichever comes first.
   *
   * @param timeout The time, in ms, after which to resolve to `false` if the queue is still non-empty. Passing `0` (or
   * not passing anything) will make the promise wait as long as it takes for the queue to drain before resolving to
   * `true`.
   * @returns A promise which will resolve to `true` if the queue is already empty or drains before the timeout, and
   * `false` otherwise
   */
  function drain(timeout) {
    return new SyncPromise((resolve, reject) => {
      let counter = buffer.length;

      if (!counter) {
        return resolve(true);
      }

      // wait for `timeout` ms and then resolve to `false` (if not cancelled first)
      const capturedSetTimeout = setTimeout(() => {
        if (timeout && timeout > 0) {
          resolve(false);
        }
      }, timeout);

      // if all promises resolve in time, cancel the timer and resolve to `true`
      buffer.forEach(item => {
        void resolvedSyncPromise(item).then(() => {
          if (!--counter) {
            clearTimeout(capturedSetTimeout);
            resolve(true);
          }
        }, reject);
      });
    });
  }

  return {
    $: buffer,
    add,
    drain,
  };
}

/**
 * Does this filename look like it's part of the app code?
 */
function filenameIsInApp(filename, isNative = false) {
  const isInternal =
    isNative ||
    (filename &&
      // It's not internal if it's an absolute linux path
      !filename.startsWith('/') &&
      // It's not internal if it's an absolute windows path
      !filename.match(/^[A-Z]:/) &&
      // It's not internal if the path is starting with a dot
      !filename.startsWith('.') &&
      // It's not internal if the frame has a protocol. In node, this is usually the case if the file got pre-processed with a bundler like webpack
      !filename.match(/^[a-zA-Z]([a-zA-Z0-9.\-+])*:\/\//)); // Schema from: https://stackoverflow.com/a/3641782

  // in_app is all that's not an internal Node function or a module within node_modules
  // note that isNative appears to return true even for node core libraries
  // see https://github.com/getsentry/raven-node/issues/176

  return !isInternal && filename !== undefined && !filename.includes('node_modules/');
}

/** Node Stack line parser */
function node(getModule) {
  const FILENAME_MATCH = /^\s*[-]{4,}$/;
  const FULL_MATCH = /at (?:async )?(?:(.+?)\s+\()?(?:(.+):(\d+):(\d+)?|([^)]+))\)?/;

  // eslint-disable-next-line complexity
  return (line) => {
    const lineMatch = line.match(FULL_MATCH);

    if (lineMatch) {
      let object;
      let method;
      let functionName;
      let typeName;
      let methodName;

      if (lineMatch[1]) {
        functionName = lineMatch[1];

        let methodStart = functionName.lastIndexOf('.');
        if (functionName[methodStart - 1] === '.') {
          methodStart--;
        }

        if (methodStart > 0) {
          object = functionName.slice(0, methodStart);
          method = functionName.slice(methodStart + 1);
          const objectEnd = object.indexOf('.Module');
          if (objectEnd > 0) {
            functionName = functionName.slice(objectEnd + 1);
            object = object.slice(0, objectEnd);
          }
        }
        typeName = undefined;
      }

      if (method) {
        typeName = object;
        methodName = method;
      }

      if (method === '<anonymous>') {
        methodName = undefined;
        functionName = undefined;
      }

      if (functionName === undefined) {
        methodName = methodName || UNKNOWN_FUNCTION;
        functionName = typeName ? `${typeName}.${methodName}` : methodName;
      }

      let filename = lineMatch[2] && lineMatch[2].startsWith('file://') ? lineMatch[2].slice(7) : lineMatch[2];
      const isNative = lineMatch[5] === 'native';

      // If it's a Windows path, trim the leading slash so that `/C:/foo` becomes `C:/foo`
      if (filename && filename.match(/\/[A-Z]:/)) {
        filename = filename.slice(1);
      }

      if (!filename && lineMatch[5] && !isNative) {
        filename = lineMatch[5];
      }

      return {
        filename,
        module: getModule ? getModule(filename) : undefined,
        function: functionName,
        lineno: _parseIntOrUndefined(lineMatch[3]),
        colno: _parseIntOrUndefined(lineMatch[4]),
        in_app: filenameIsInApp(filename || '', isNative),
      };
    }

    if (line.match(FILENAME_MATCH)) {
      return {
        filename: line,
      };
    }

    return undefined;
  };
}

/**
 * Node.js stack line parser
 *
 * This is in @sentry/utils so it can be used from the Electron SDK in the browser for when `nodeIntegration == true`.
 * This allows it to be used without referencing or importing any node specific code which causes bundlers to complain
 */
function nodeStackLineParser(getModule) {
  return [90, node(getModule)];
}

function _parseIntOrUndefined(input) {
  return parseInt(input || '', 10) || undefined;
}

const SENTRY_BAGGAGE_KEY_PREFIX = 'sentry-';

const SENTRY_BAGGAGE_KEY_PREFIX_REGEX = /^sentry-/;

/**
 * Max length of a serialized baggage string
 *
 * https://www.w3.org/TR/baggage/#limits
 */
const MAX_BAGGAGE_STRING_LENGTH = 8192;

/**
 * Takes a baggage header and turns it into Dynamic Sampling Context, by extracting all the "sentry-" prefixed values
 * from it.
 *
 * @param baggageHeader A very bread definition of a baggage header as it might appear in various frameworks.
 * @returns The Dynamic Sampling Context that was found on `baggageHeader`, if there was any, `undefined` otherwise.
 */
function baggageHeaderToDynamicSamplingContext(
  // Very liberal definition of what any incoming header might look like
  baggageHeader,
) {
  const baggageObject = parseBaggageHeader(baggageHeader);

  if (!baggageObject) {
    return undefined;
  }

  // Read all "sentry-" prefixed values out of the baggage object and put it onto a dynamic sampling context object.
  const dynamicSamplingContext = Object.entries(baggageObject).reduce((acc, [key, value]) => {
    if (key.match(SENTRY_BAGGAGE_KEY_PREFIX_REGEX)) {
      const nonPrefixedKey = key.slice(SENTRY_BAGGAGE_KEY_PREFIX.length);
      acc[nonPrefixedKey] = value;
    }
    return acc;
  }, {});

  // Only return a dynamic sampling context object if there are keys in it.
  // A keyless object means there were no sentry values on the header, which means that there is no DSC.
  if (Object.keys(dynamicSamplingContext).length > 0) {
    return dynamicSamplingContext ;
  } else {
    return undefined;
  }
}

/**
 * Turns a Dynamic Sampling Object into a baggage header by prefixing all the keys on the object with "sentry-".
 *
 * @param dynamicSamplingContext The Dynamic Sampling Context to turn into a header. For convenience and compatibility
 * with the `getDynamicSamplingContext` method on the Transaction class ,this argument can also be `undefined`. If it is
 * `undefined` the function will return `undefined`.
 * @returns a baggage header, created from `dynamicSamplingContext`, or `undefined` either if `dynamicSamplingContext`
 * was `undefined`, or if `dynamicSamplingContext` didn't contain any values.
 */
function dynamicSamplingContextToSentryBaggageHeader(
  // this also takes undefined for convenience and bundle size in other places
  dynamicSamplingContext,
) {
  if (!dynamicSamplingContext) {
    return undefined;
  }

  // Prefix all DSC keys with "sentry-" and put them into a new object
  const sentryPrefixedDSC = Object.entries(dynamicSamplingContext).reduce(
    (acc, [dscKey, dscValue]) => {
      if (dscValue) {
        acc[`${SENTRY_BAGGAGE_KEY_PREFIX}${dscKey}`] = dscValue;
      }
      return acc;
    },
    {},
  );

  return objectToBaggageHeader(sentryPrefixedDSC);
}

/**
 * Take a baggage header and parse it into an object.
 */
function parseBaggageHeader(
  baggageHeader,
) {
  if (!baggageHeader || (!isString(baggageHeader) && !Array.isArray(baggageHeader))) {
    return undefined;
  }

  if (Array.isArray(baggageHeader)) {
    // Combine all baggage headers into one object containing the baggage values so we can later read the Sentry-DSC-values from it
    return baggageHeader.reduce((acc, curr) => {
      const currBaggageObject = baggageHeaderToObject(curr);
      Object.entries(currBaggageObject).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {});
  }

  return baggageHeaderToObject(baggageHeader);
}

/**
 * Will parse a baggage header, which is a simple key-value map, into a flat object.
 *
 * @param baggageHeader The baggage header to parse.
 * @returns a flat object containing all the key-value pairs from `baggageHeader`.
 */
function baggageHeaderToObject(baggageHeader) {
  return baggageHeader
    .split(',')
    .map(baggageEntry => baggageEntry.split('=').map(keyOrValue => decodeURIComponent(keyOrValue.trim())))
    .reduce((acc, [key, value]) => {
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

/**
 * Turns a flat object (key-value pairs) into a baggage header, which is also just key-value pairs.
 *
 * @param object The object to turn into a baggage header.
 * @returns a baggage header string, or `undefined` if the object didn't have any values, since an empty baggage header
 * is not spec compliant.
 */
function objectToBaggageHeader(object) {
  if (Object.keys(object).length === 0) {
    // An empty baggage header is not spec compliant: We return undefined.
    return undefined;
  }

  return Object.entries(object).reduce((baggageHeader, [objectKey, objectValue], currentIndex) => {
    const baggageEntry = `${encodeURIComponent(objectKey)}=${encodeURIComponent(objectValue)}`;
    const newBaggageHeader = currentIndex === 0 ? baggageEntry : `${baggageHeader},${baggageEntry}`;
    if (newBaggageHeader.length > MAX_BAGGAGE_STRING_LENGTH) {
      DEBUG_BUILD$1 &&
        logger.warn(
          `Not adding key: ${objectKey} with val: ${objectValue} to baggage header due to exceeding baggage size limits.`,
        );
      return baggageHeader;
    } else {
      return newBaggageHeader;
    }
  }, '');
}

// eslint-disable-next-line @sentry-internal/sdk/no-regexp-constructor -- RegExp is used for readability here
const TRACEPARENT_REGEXP = new RegExp(
  '^[ \\t]*' + // whitespace
    '([0-9a-f]{32})?' + // trace_id
    '-?([0-9a-f]{16})?' + // span_id
    '-?([01])?' + // sampled
    '[ \\t]*$', // whitespace
);

/**
 * Create sentry-trace header from span context values.
 */
function generateSentryTraceHeader(
  traceId = uuid4(),
  spanId = uuid4().substring(16),
  sampled,
) {
  let sampledString = '';
  if (sampled !== undefined) {
    sampledString = sampled ? '-1' : '-0';
  }
  return `${traceId}-${spanId}${sampledString}`;
}

/**
 * Creates an envelope.
 * Make sure to always explicitly provide the generic to this function
 * so that the envelope types resolve correctly.
 */
function createEnvelope(headers, items = []) {
  return [headers, items] ;
}

/**
 * Add an item to an envelope.
 * Make sure to always explicitly provide the generic to this function
 * so that the envelope types resolve correctly.
 */
function addItemToEnvelope(envelope, newItem) {
  const [headers, items] = envelope;
  return [headers, [...items, newItem]] ;
}

/**
 * Convenience function to loop through the items and item types of an envelope.
 * (This function was mostly created because working with envelope types is painful at the moment)
 *
 * If the callback returns true, the rest of the items will be skipped.
 */
function forEachEnvelopeItem(
  envelope,
  callback,
) {
  const envelopeItems = envelope[1];

  for (const envelopeItem of envelopeItems) {
    const envelopeItemType = envelopeItem[0].type;
    const result = callback(envelopeItem, envelopeItemType);

    if (result) {
      return true;
    }
  }

  return false;
}

/**
 * Encode a string to UTF8 array.
 */
function encodeUTF8(input) {
  return GLOBAL_OBJ.__SENTRY__ && GLOBAL_OBJ.__SENTRY__.encodePolyfill
    ? GLOBAL_OBJ.__SENTRY__.encodePolyfill(input)
    : new TextEncoder().encode(input);
}

/**
 * Serializes an envelope.
 */
function serializeEnvelope(envelope) {
  const [envHeaders, items] = envelope;

  // Initially we construct our envelope as a string and only convert to binary chunks if we encounter binary data
  let parts = JSON.stringify(envHeaders);

  function append(next) {
    if (typeof parts === 'string') {
      parts = typeof next === 'string' ? parts + next : [encodeUTF8(parts), next];
    } else {
      parts.push(typeof next === 'string' ? encodeUTF8(next) : next);
    }
  }

  for (const item of items) {
    const [itemHeaders, payload] = item;

    append(`\n${JSON.stringify(itemHeaders)}\n`);

    if (typeof payload === 'string' || payload instanceof Uint8Array) {
      append(payload);
    } else {
      let stringifiedPayload;
      try {
        stringifiedPayload = JSON.stringify(payload);
      } catch (e) {
        // In case, despite all our efforts to keep `payload` circular-dependency-free, `JSON.strinify()` still
        // fails, we try again after normalizing it again with infinite normalization depth. This of course has a
        // performance impact but in this case a performance hit is better than throwing.
        stringifiedPayload = JSON.stringify(normalize(payload));
      }
      append(stringifiedPayload);
    }
  }

  return typeof parts === 'string' ? parts : concatBuffers(parts);
}

function concatBuffers(buffers) {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    merged.set(buffer, offset);
    offset += buffer.length;
  }

  return merged;
}

/**
 * Creates envelope item for a single span
 */
function createSpanEnvelopeItem(spanJson) {
  const spanHeaders = {
    type: 'span',
  };

  return [spanHeaders, spanJson];
}

/**
 * Creates attachment envelope items
 */
function createAttachmentEnvelopeItem(attachment) {
  const buffer = typeof attachment.data === 'string' ? encodeUTF8(attachment.data) : attachment.data;

  return [
    dropUndefinedKeys({
      type: 'attachment',
      length: buffer.length,
      filename: attachment.filename,
      content_type: attachment.contentType,
      attachment_type: attachment.attachmentType,
    }),
    buffer,
  ];
}

const ITEM_TYPE_TO_DATA_CATEGORY_MAP = {
  session: 'session',
  sessions: 'session',
  attachment: 'attachment',
  transaction: 'transaction',
  event: 'error',
  client_report: 'internal',
  user_report: 'default',
  profile: 'profile',
  profile_chunk: 'profile',
  replay_event: 'replay',
  replay_recording: 'replay',
  check_in: 'monitor',
  feedback: 'feedback',
  span: 'span',
  statsd: 'metric_bucket',
};

/**
 * Maps the type of an envelope item to a data category.
 */
function envelopeItemTypeToDataCategory(type) {
  return ITEM_TYPE_TO_DATA_CATEGORY_MAP[type];
}

/** Extracts the minimal SDK info from the metadata or an events */
function getSdkMetadataForEnvelopeHeader(metadataOrEvent) {
  if (!metadataOrEvent || !metadataOrEvent.sdk) {
    return;
  }
  const { name, version } = metadataOrEvent.sdk;
  return { name, version };
}

/**
 * Creates event envelope headers, based on event, sdk info and tunnel
 * Note: This function was extracted from the core package to make it available in Replay
 */
function createEventEnvelopeHeaders(
  event,
  sdkInfo,
  tunnel,
  dsn,
) {
  const dynamicSamplingContext = event.sdkProcessingMetadata && event.sdkProcessingMetadata.dynamicSamplingContext;
  return {
    event_id: event.event_id ,
    sent_at: new Date().toISOString(),
    ...(sdkInfo && { sdk: sdkInfo }),
    ...(!!tunnel && dsn && { dsn: dsnToString(dsn) }),
    ...(dynamicSamplingContext && {
      trace: dropUndefinedKeys({ ...dynamicSamplingContext }),
    }),
  };
}

/**
 * Creates client report envelope
 * @param discarded_events An array of discard events
 * @param dsn A DSN that can be set on the header. Optional.
 */
function createClientReportEnvelope(
  discarded_events,
  dsn,
  timestamp,
) {
  const clientReportItem = [
    { type: 'client_report' },
    {
      timestamp: timestamp || dateTimestampInSeconds(),
      discarded_events,
    },
  ];
  return createEnvelope(dsn ? { dsn } : {}, [clientReportItem]);
}

// Intentionally keeping the key broad, as we don't know for sure what rate limit headers get returned from backend

const DEFAULT_RETRY_AFTER = 60 * 1000; // 60 seconds

/**
 * Extracts Retry-After value from the request header or returns default value
 * @param header string representation of 'Retry-After' header
 * @param now current unix timestamp
 *
 */
function parseRetryAfterHeader(header, now = Date.now()) {
  const headerDelay = parseInt(`${header}`, 10);
  if (!isNaN(headerDelay)) {
    return headerDelay * 1000;
  }

  const headerDate = Date.parse(`${header}`);
  if (!isNaN(headerDate)) {
    return headerDate - now;
  }

  return DEFAULT_RETRY_AFTER;
}

/**
 * Gets the time that the given category is disabled until for rate limiting.
 * In case no category-specific limit is set but a general rate limit across all categories is active,
 * that time is returned.
 *
 * @return the time in ms that the category is disabled until or 0 if there's no active rate limit.
 */
function disabledUntil(limits, dataCategory) {
  return limits[dataCategory] || limits.all || 0;
}

/**
 * Checks if a category is rate limited
 */
function isRateLimited(limits, dataCategory, now = Date.now()) {
  return disabledUntil(limits, dataCategory) > now;
}

/**
 * Update ratelimits from incoming headers.
 *
 * @return the updated RateLimits object.
 */
function updateRateLimits(
  limits,
  { statusCode, headers },
  now = Date.now(),
) {
  const updatedRateLimits = {
    ...limits,
  };

  // "The name is case-insensitive."
  // https://developer.mozilla.org/en-US/docs/Web/API/Headers/get
  const rateLimitHeader = headers && headers['x-sentry-rate-limits'];
  const retryAfterHeader = headers && headers['retry-after'];

  if (rateLimitHeader) {
    /**
     * rate limit headers are of the form
     *     <header>,<header>,..
     * where each <header> is of the form
     *     <retry_after>: <categories>: <scope>: <reason_code>: <namespaces>
     * where
     *     <retry_after> is a delay in seconds
     *     <categories> is the event type(s) (error, transaction, etc) being rate limited and is of the form
     *         <category>;<category>;...
     *     <scope> is what's being limited (org, project, or key) - ignored by SDK
     *     <reason_code> is an arbitrary string like "org_quota" - ignored by SDK
     *     <namespaces> Semicolon-separated list of metric namespace identifiers. Defines which namespace(s) will be affected.
     *         Only present if rate limit applies to the metric_bucket data category.
     */
    for (const limit of rateLimitHeader.trim().split(',')) {
      const [retryAfter, categories, , , namespaces] = limit.split(':', 5) ;
      const headerDelay = parseInt(retryAfter, 10);
      const delay = (!isNaN(headerDelay) ? headerDelay : 60) * 1000; // 60sec default
      if (!categories) {
        updatedRateLimits.all = now + delay;
      } else {
        for (const category of categories.split(';')) {
          if (category === 'metric_bucket') {
            // namespaces will be present when category === 'metric_bucket'
            if (!namespaces || namespaces.split(';').includes('custom')) {
              updatedRateLimits[category] = now + delay;
            }
          } else {
            updatedRateLimits[category] = now + delay;
          }
        }
      }
    }
  } else if (retryAfterHeader) {
    updatedRateLimits.all = now + parseRetryAfterHeader(retryAfterHeader, now);
  } else if (statusCode === 429) {
    updatedRateLimits.all = now + 60 * 1000;
  }

  return updatedRateLimits;
}

/**
 * Extracts stack frames from the error.stack string
 */
function parseStackFrames(stackParser, error) {
  return stackParser(error.stack || '', 1);
}

/**
 * Extracts stack frames from the error and builds a Sentry Exception
 */
function exceptionFromError(stackParser, error) {
  const exception = {
    type: error.name || error.constructor.name,
    value: error.message,
  };

  const frames = parseStackFrames(stackParser, error);
  if (frames.length) {
    exception.stacktrace = { frames };
  }

  return exception;
}

/** If a plain object has a property that is an `Error`, return this error. */
function getErrorPropertyFromObject(obj) {
  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      const value = obj[prop];
      if (value instanceof Error) {
        return value;
      }
    }
  }

  return undefined;
}

function getMessageForObject(exception) {
  if ('name' in exception && typeof exception.name === 'string') {
    let message = `'${exception.name}' captured as exception`;

    if ('message' in exception && typeof exception.message === 'string') {
      message += ` with message '${exception.message}'`;
    }

    return message;
  } else if ('message' in exception && typeof exception.message === 'string') {
    return exception.message;
  }

  const keys = extractExceptionKeysForMessage(exception);

  // Some ErrorEvent instances do not have an `error` property, which is why they are not handled before
  // We still want to try to get a decent message for these cases
  if (isErrorEvent$1(exception)) {
    return `Event \`ErrorEvent\` captured as exception with message \`${exception.message}\``;
  }

  const className = getObjectClassName(exception);

  return `${
    className && className !== 'Object' ? `'${className}'` : 'Object'
  } captured as exception with keys: ${keys}`;
}

function getObjectClassName(obj) {
  try {
    const prototype = Object.getPrototypeOf(obj);
    return prototype ? prototype.constructor.name : undefined;
  } catch (e) {
    // ignore errors here
  }
}

function getException(
  client,
  mechanism,
  exception,
  hint,
) {
  if (isError(exception)) {
    return [exception, undefined];
  }

  // Mutate this!
  mechanism.synthetic = true;

  if (isPlainObject(exception)) {
    const normalizeDepth = client && client.getOptions().normalizeDepth;
    const extras = { ['__serialized__']: normalizeToSize(exception , normalizeDepth) };

    const errorFromProp = getErrorPropertyFromObject(exception);
    if (errorFromProp) {
      return [errorFromProp, extras];
    }

    const message = getMessageForObject(exception);
    const ex = (hint && hint.syntheticException) || new Error(message);
    ex.message = message;

    return [ex, extras];
  }

  // This handles when someone does: `throw "something awesome";`
  // We use synthesized Error here so we can extract a (rough) stack trace.
  const ex = (hint && hint.syntheticException) || new Error(exception );
  ex.message = `${exception}`;

  return [ex, undefined];
}

/**
 * Builds and Event from a Exception
 * @hidden
 */
function eventFromUnknownInput(
  client,
  stackParser,
  exception,
  hint,
) {
  const providedMechanism =
    hint && hint.data && (hint.data ).mechanism;
  const mechanism = providedMechanism || {
    handled: true,
    type: 'generic',
  };

  const [ex, extras] = getException(client, mechanism, exception, hint);

  const event = {
    exception: {
      values: [exceptionFromError(stackParser, ex)],
    },
  };

  if (extras) {
    event.extra = extras;
  }

  addExceptionTypeValue(event, undefined, undefined);
  addExceptionMechanism(event, mechanism);

  return {
    ...event,
    event_id: hint && hint.event_id,
  };
}

/**
 * Builds and Event from a Message
 * @hidden
 */
function eventFromMessage(
  stackParser,
  message,
  level = 'info',
  hint,
  attachStacktrace,
) {
  const event = {
    event_id: hint && hint.event_id,
    level,
  };

  if (attachStacktrace && hint && hint.syntheticException) {
    const frames = parseStackFrames(stackParser, hint.syntheticException);
    if (frames.length) {
      event.exception = {
        values: [
          {
            value: message,
            stacktrace: { frames },
          },
        ],
      };
    }
  }

  if (isParameterizedString(message)) {
    const { __sentry_template_string__, __sentry_template_values__ } = message;

    event.logentry = {
      message: __sentry_template_string__,
      params: __sentry_template_values__,
    };
    return event;
  }

  event.message = message;
  return event;
}

/**
 * Returns a new minimal propagation context
 */
function generatePropagationContext() {
  return {
    traceId: uuid4(),
    spanId: uuid4().substring(16),
  };
}

/**
 * This serves as a build time flag that will be true by default, but false in non-debug builds or if users replace `__SENTRY_DEBUG__` in their generated code.
 *
 * ATTENTION: This constant must never cross package boundaries (i.e. be exported) to guarantee that it can be used for tree shaking.
 */
const DEBUG_BUILD = (typeof __SENTRY_DEBUG__ === 'undefined' || __SENTRY_DEBUG__);

/**
 * An object that contains globally accessible properties and maintains a scope stack.
 * @hidden
 */

/**
 * Returns the global shim registry.
 *
 * FIXME: This function is problematic, because despite always returning a valid Carrier,
 * it has an optional `__SENTRY__` property, which then in turn requires us to always perform an unnecessary check
 * at the call-site. We always access the carrier through this function, so we can guarantee that `__SENTRY__` is there.
 **/
function getMainCarrier() {
  // This ensures a Sentry carrier exists
  getSentryCarrier(GLOBAL_OBJ);
  return GLOBAL_OBJ;
}

/** Will either get the existing sentry carrier, or create a new one. */
function getSentryCarrier(carrier) {
  const __SENTRY__ = (carrier.__SENTRY__ = carrier.__SENTRY__ || {});

  // For now: First SDK that sets the .version property wins
  __SENTRY__.version = __SENTRY__.version || SDK_VERSION;

  // Intentionally populating and returning the version of "this" SDK instance
  // rather than what's set in .version so that "this" SDK always gets its carrier
  return (__SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {});
}

/**
 * Creates a new `Session` object by setting certain default parameters. If optional @param context
 * is passed, the passed properties are applied to the session object.
 *
 * @param context (optional) additional properties to be applied to the returned session object
 *
 * @returns a new `Session` object
 */
function makeSession(context) {
  // Both timestamp and started are in seconds since the UNIX epoch.
  const startingTime = timestampInSeconds();

  const session = {
    sid: uuid4(),
    init: true,
    timestamp: startingTime,
    started: startingTime,
    duration: 0,
    status: 'ok',
    errors: 0,
    ignoreDuration: false,
    toJSON: () => sessionToJSON(session),
  };

  if (context) {
    updateSession(session, context);
  }

  return session;
}

/**
 * Updates a session object with the properties passed in the context.
 *
 * Note that this function mutates the passed object and returns void.
 * (Had to do this instead of returning a new and updated session because closing and sending a session
 * makes an update to the session after it was passed to the sending logic.
 * @see BaseClient.captureSession )
 *
 * @param session the `Session` to update
 * @param context the `SessionContext` holding the properties that should be updated in @param session
 */
// eslint-disable-next-line complexity
function updateSession(session, context = {}) {
  if (context.user) {
    if (!session.ipAddress && context.user.ip_address) {
      session.ipAddress = context.user.ip_address;
    }

    if (!session.did && !context.did) {
      session.did = context.user.id || context.user.email || context.user.username;
    }
  }

  session.timestamp = context.timestamp || timestampInSeconds();

  if (context.abnormal_mechanism) {
    session.abnormal_mechanism = context.abnormal_mechanism;
  }

  if (context.ignoreDuration) {
    session.ignoreDuration = context.ignoreDuration;
  }
  if (context.sid) {
    // Good enough uuid validation. — Kamil
    session.sid = context.sid.length === 32 ? context.sid : uuid4();
  }
  if (context.init !== undefined) {
    session.init = context.init;
  }
  if (!session.did && context.did) {
    session.did = `${context.did}`;
  }
  if (typeof context.started === 'number') {
    session.started = context.started;
  }
  if (session.ignoreDuration) {
    session.duration = undefined;
  } else if (typeof context.duration === 'number') {
    session.duration = context.duration;
  } else {
    const duration = session.timestamp - session.started;
    session.duration = duration >= 0 ? duration : 0;
  }
  if (context.release) {
    session.release = context.release;
  }
  if (context.environment) {
    session.environment = context.environment;
  }
  if (!session.ipAddress && context.ipAddress) {
    session.ipAddress = context.ipAddress;
  }
  if (!session.userAgent && context.userAgent) {
    session.userAgent = context.userAgent;
  }
  if (typeof context.errors === 'number') {
    session.errors = context.errors;
  }
  if (context.status) {
    session.status = context.status;
  }
}

/**
 * Closes a session by setting its status and updating the session object with it.
 * Internally calls `updateSession` to update the passed session object.
 *
 * Note that this function mutates the passed session (@see updateSession for explanation).
 *
 * @param session the `Session` object to be closed
 * @param status the `SessionStatus` with which the session was closed. If you don't pass a status,
 *               this function will keep the previously set status, unless it was `'ok'` in which case
 *               it is changed to `'exited'`.
 */
function closeSession(session, status) {
  let context = {};
  if (status) {
    context = { status };
  } else if (session.status === 'ok') {
    context = { status: 'exited' };
  }

  updateSession(session, context);
}

/**
 * Serializes a passed session object to a JSON object with a slightly different structure.
 * This is necessary because the Sentry backend requires a slightly different schema of a session
 * than the one the JS SDKs use internally.
 *
 * @param session the session to be converted
 *
 * @returns a JSON object of the passed session
 */
function sessionToJSON(session) {
  return dropUndefinedKeys({
    sid: `${session.sid}`,
    init: session.init,
    // Make sure that sec is converted to ms for date constructor
    started: new Date(session.started * 1000).toISOString(),
    timestamp: new Date(session.timestamp * 1000).toISOString(),
    status: session.status,
    errors: session.errors,
    did: typeof session.did === 'number' || typeof session.did === 'string' ? `${session.did}` : undefined,
    duration: session.duration,
    abnormal_mechanism: session.abnormal_mechanism,
    attrs: {
      release: session.release,
      environment: session.environment,
      ip_address: session.ipAddress,
      user_agent: session.userAgent,
    },
  });
}

const SCOPE_SPAN_FIELD = '_sentrySpan';

/**
 * Set the active span for a given scope.
 * NOTE: This should NOT be used directly, but is only used internally by the trace methods.
 */
function _setSpanForScope(scope, span) {
  if (span) {
    addNonEnumerableProperty(scope , SCOPE_SPAN_FIELD, span);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (scope )[SCOPE_SPAN_FIELD];
  }
}

/**
 * Get the active span for a given scope.
 * NOTE: This should NOT be used directly, but is only used internally by the trace methods.
 */
function _getSpanForScope(scope) {
  return scope[SCOPE_SPAN_FIELD];
}

/**
 * Default value for maximum number of breadcrumbs added to an event.
 */
const DEFAULT_MAX_BREADCRUMBS = 100;

/**
 * Holds additional event information.
 */
class ScopeClass  {
  /** Flag if notifying is happening. */

  /** Callback for client to receive scope changes. */

  /** Callback list that will be called during event processing. */

  /** Array of breadcrumbs. */

  /** User */

  /** Tags */

  /** Extra */

  /** Contexts */

  /** Attachments */

  /** Propagation Context for distributed tracing */

  /**
   * A place to stash data which is needed at some point in the SDK's event processing pipeline but which shouldn't get
   * sent to Sentry
   */

  /** Fingerprint */

  /** Severity */

  /**
   * Transaction Name
   *
   * IMPORTANT: The transaction name on the scope has nothing to do with root spans/transaction objects.
   * It's purpose is to assign a transaction to the scope that's added to non-transaction events.
   */

  /** Session */

  /** Request Mode Session Status */

  /** The client on this scope */

  /** Contains the last event id of a captured event.  */

  // NOTE: Any field which gets added here should get added not only to the constructor but also to the `clone` method.

   constructor() {
    this._notifyingListeners = false;
    this._scopeListeners = [];
    this._eventProcessors = [];
    this._breadcrumbs = [];
    this._attachments = [];
    this._user = {};
    this._tags = {};
    this._extra = {};
    this._contexts = {};
    this._sdkProcessingMetadata = {};
    this._propagationContext = generatePropagationContext();
  }

  /**
   * @inheritDoc
   */
   clone() {
    const newScope = new ScopeClass();
    newScope._breadcrumbs = [...this._breadcrumbs];
    newScope._tags = { ...this._tags };
    newScope._extra = { ...this._extra };
    newScope._contexts = { ...this._contexts };
    newScope._user = this._user;
    newScope._level = this._level;
    newScope._session = this._session;
    newScope._transactionName = this._transactionName;
    newScope._fingerprint = this._fingerprint;
    newScope._eventProcessors = [...this._eventProcessors];
    newScope._requestSession = this._requestSession;
    newScope._attachments = [...this._attachments];
    newScope._sdkProcessingMetadata = { ...this._sdkProcessingMetadata };
    newScope._propagationContext = { ...this._propagationContext };
    newScope._client = this._client;
    newScope._lastEventId = this._lastEventId;

    _setSpanForScope(newScope, _getSpanForScope(this));

    return newScope;
  }

  /**
   * @inheritDoc
   */
   setClient(client) {
    this._client = client;
  }

  /**
   * @inheritDoc
   */
   setLastEventId(lastEventId) {
    this._lastEventId = lastEventId;
  }

  /**
   * @inheritDoc
   */
   getClient() {
    return this._client ;
  }

  /**
   * @inheritDoc
   */
   lastEventId() {
    return this._lastEventId;
  }

  /**
   * @inheritDoc
   */
   addScopeListener(callback) {
    this._scopeListeners.push(callback);
  }

  /**
   * @inheritDoc
   */
   addEventProcessor(callback) {
    this._eventProcessors.push(callback);
    return this;
  }

  /**
   * @inheritDoc
   */
   setUser(user) {
    // If null is passed we want to unset everything, but still define keys,
    // so that later down in the pipeline any existing values are cleared.
    this._user = user || {
      email: undefined,
      id: undefined,
      ip_address: undefined,
      username: undefined,
    };

    if (this._session) {
      updateSession(this._session, { user });
    }

    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   getUser() {
    return this._user;
  }

  /**
   * @inheritDoc
   */
   getRequestSession() {
    return this._requestSession;
  }

  /**
   * @inheritDoc
   */
   setRequestSession(requestSession) {
    this._requestSession = requestSession;
    return this;
  }

  /**
   * @inheritDoc
   */
   setTags(tags) {
    this._tags = {
      ...this._tags,
      ...tags,
    };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setTag(key, value) {
    this._tags = { ...this._tags, [key]: value };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setExtras(extras) {
    this._extra = {
      ...this._extra,
      ...extras,
    };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setExtra(key, extra) {
    this._extra = { ...this._extra, [key]: extra };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setFingerprint(fingerprint) {
    this._fingerprint = fingerprint;
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setLevel(level) {
    this._level = level;
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setTransactionName(name) {
    this._transactionName = name;
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setContext(key, context) {
    if (context === null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._contexts[key];
    } else {
      this._contexts[key] = context;
    }

    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setSession(session) {
    if (!session) {
      delete this._session;
    } else {
      this._session = session;
    }
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   getSession() {
    return this._session;
  }

  /**
   * @inheritDoc
   */
   update(captureContext) {
    if (!captureContext) {
      return this;
    }

    const scopeToMerge = typeof captureContext === 'function' ? captureContext(this) : captureContext;

    const [scopeInstance, requestSession] =
      scopeToMerge instanceof Scope
        ? [scopeToMerge.getScopeData(), scopeToMerge.getRequestSession()]
        : isPlainObject(scopeToMerge)
          ? [captureContext , (captureContext ).requestSession]
          : [];

    const { tags, extra, user, contexts, level, fingerprint = [], propagationContext } = scopeInstance || {};

    this._tags = { ...this._tags, ...tags };
    this._extra = { ...this._extra, ...extra };
    this._contexts = { ...this._contexts, ...contexts };

    if (user && Object.keys(user).length) {
      this._user = user;
    }

    if (level) {
      this._level = level;
    }

    if (fingerprint.length) {
      this._fingerprint = fingerprint;
    }

    if (propagationContext) {
      this._propagationContext = propagationContext;
    }

    if (requestSession) {
      this._requestSession = requestSession;
    }

    return this;
  }

  /**
   * @inheritDoc
   */
   clear() {
    // client is not cleared here on purpose!
    this._breadcrumbs = [];
    this._tags = {};
    this._extra = {};
    this._user = {};
    this._contexts = {};
    this._level = undefined;
    this._transactionName = undefined;
    this._fingerprint = undefined;
    this._requestSession = undefined;
    this._session = undefined;
    _setSpanForScope(this, undefined);
    this._attachments = [];
    this._propagationContext = generatePropagationContext();

    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   addBreadcrumb(breadcrumb, maxBreadcrumbs) {
    const maxCrumbs = typeof maxBreadcrumbs === 'number' ? maxBreadcrumbs : DEFAULT_MAX_BREADCRUMBS;

    // No data has been changed, so don't notify scope listeners
    if (maxCrumbs <= 0) {
      return this;
    }

    const mergedBreadcrumb = {
      timestamp: dateTimestampInSeconds(),
      ...breadcrumb,
    };

    const breadcrumbs = this._breadcrumbs;
    breadcrumbs.push(mergedBreadcrumb);
    this._breadcrumbs = breadcrumbs.length > maxCrumbs ? breadcrumbs.slice(-maxCrumbs) : breadcrumbs;

    this._notifyScopeListeners();

    return this;
  }

  /**
   * @inheritDoc
   */
   getLastBreadcrumb() {
    return this._breadcrumbs[this._breadcrumbs.length - 1];
  }

  /**
   * @inheritDoc
   */
   clearBreadcrumbs() {
    this._breadcrumbs = [];
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   addAttachment(attachment) {
    this._attachments.push(attachment);
    return this;
  }

  /**
   * @inheritDoc
   */
   clearAttachments() {
    this._attachments = [];
    return this;
  }

  /** @inheritDoc */
   getScopeData() {
    return {
      breadcrumbs: this._breadcrumbs,
      attachments: this._attachments,
      contexts: this._contexts,
      tags: this._tags,
      extra: this._extra,
      user: this._user,
      level: this._level,
      fingerprint: this._fingerprint || [],
      eventProcessors: this._eventProcessors,
      propagationContext: this._propagationContext,
      sdkProcessingMetadata: this._sdkProcessingMetadata,
      transactionName: this._transactionName,
      span: _getSpanForScope(this),
    };
  }

  /**
   * @inheritDoc
   */
   setSDKProcessingMetadata(newData) {
    this._sdkProcessingMetadata = { ...this._sdkProcessingMetadata, ...newData };

    return this;
  }

  /**
   * @inheritDoc
   */
   setPropagationContext(context) {
    this._propagationContext = context;
    return this;
  }

  /**
   * @inheritDoc
   */
   getPropagationContext() {
    return this._propagationContext;
  }

  /**
   * @inheritDoc
   */
   captureException(exception, hint) {
    const eventId = hint && hint.event_id ? hint.event_id : uuid4();

    if (!this._client) {
      logger.warn('No client configured on scope - will not capture exception!');
      return eventId;
    }

    const syntheticException = new Error('Sentry syntheticException');

    this._client.captureException(
      exception,
      {
        originalException: exception,
        syntheticException,
        ...hint,
        event_id: eventId,
      },
      this,
    );

    return eventId;
  }

  /**
   * @inheritDoc
   */
   captureMessage(message, level, hint) {
    const eventId = hint && hint.event_id ? hint.event_id : uuid4();

    if (!this._client) {
      logger.warn('No client configured on scope - will not capture message!');
      return eventId;
    }

    const syntheticException = new Error(message);

    this._client.captureMessage(
      message,
      level,
      {
        originalException: message,
        syntheticException,
        ...hint,
        event_id: eventId,
      },
      this,
    );

    return eventId;
  }

  /**
   * @inheritDoc
   */
   captureEvent(event, hint) {
    const eventId = hint && hint.event_id ? hint.event_id : uuid4();

    if (!this._client) {
      logger.warn('No client configured on scope - will not capture event!');
      return eventId;
    }

    this._client.captureEvent(event, { ...hint, event_id: eventId }, this);

    return eventId;
  }

  /**
   * This will be called on every set call.
   */
   _notifyScopeListeners() {
    // We need this check for this._notifyingListeners to be able to work on scope during updates
    // If this check is not here we'll produce endless recursion when something is done with the scope
    // during the callback.
    if (!this._notifyingListeners) {
      this._notifyingListeners = true;
      this._scopeListeners.forEach(callback => {
        callback(this);
      });
      this._notifyingListeners = false;
    }
  }
}

// NOTE: By exporting this here as const & type, instead of doing `export class`,
// We can get the correct class when importing from `@sentry/core`, but the original type (from `@sentry/types`)
// This is helpful for interop, e.g. when doing `import type { Scope } from '@sentry/node';` (which re-exports this)

/**
 * Holds additional event information.
 */
const Scope = ScopeClass;

/** Get the default current scope. */
function getDefaultCurrentScope() {
  return getGlobalSingleton('defaultCurrentScope', () => new Scope());
}

/** Get the default isolation scope. */
function getDefaultIsolationScope() {
  return getGlobalSingleton('defaultIsolationScope', () => new Scope());
}

/**
 * This is an object that holds a stack of scopes.
 */
class AsyncContextStack {

   constructor(scope, isolationScope) {
    let assignedScope;
    if (!scope) {
      assignedScope = new Scope();
    } else {
      assignedScope = scope;
    }

    let assignedIsolationScope;
    if (!isolationScope) {
      assignedIsolationScope = new Scope();
    } else {
      assignedIsolationScope = isolationScope;
    }

    // scope stack for domains or the process
    this._stack = [{ scope: assignedScope }];
    this._isolationScope = assignedIsolationScope;
  }

  /**
   * Fork a scope for the stack.
   */
   withScope(callback) {
    const scope = this._pushScope();

    let maybePromiseResult;
    try {
      maybePromiseResult = callback(scope);
    } catch (e) {
      this._popScope();
      throw e;
    }

    if (isThenable(maybePromiseResult)) {
      // @ts-expect-error - isThenable returns the wrong type
      return maybePromiseResult.then(
        res => {
          this._popScope();
          return res;
        },
        e => {
          this._popScope();
          throw e;
        },
      );
    }

    this._popScope();
    return maybePromiseResult;
  }

  /**
   * Get the client of the stack.
   */
   getClient() {
    return this.getStackTop().client ;
  }

  /**
   * Returns the scope of the top stack.
   */
   getScope() {
    return this.getStackTop().scope;
  }

  /**
   * Get the isolation scope for the stack.
   */
   getIsolationScope() {
    return this._isolationScope;
  }

  /**
   * Returns the topmost scope layer in the order domain > local > process.
   */
   getStackTop() {
    return this._stack[this._stack.length - 1] ;
  }

  /**
   * Push a scope to the stack.
   */
   _pushScope() {
    // We want to clone the content of prev scope
    const scope = this.getScope().clone();
    this._stack.push({
      client: this.getClient(),
      scope,
    });
    return scope;
  }

  /**
   * Pop a scope from the stack.
   */
   _popScope() {
    if (this._stack.length <= 1) return false;
    return !!this._stack.pop();
  }
}

/**
 * Get the global async context stack.
 * This will be removed during the v8 cycle and is only here to make migration easier.
 */
function getAsyncContextStack() {
  const registry = getMainCarrier();
  const sentry = getSentryCarrier(registry);

  return (sentry.stack = sentry.stack || new AsyncContextStack(getDefaultCurrentScope(), getDefaultIsolationScope()));
}

function withScope$1(callback) {
  return getAsyncContextStack().withScope(callback);
}

function withSetScope(scope, callback) {
  const stack = getAsyncContextStack() ;
  return stack.withScope(() => {
    stack.getStackTop().scope = scope;
    return callback(scope);
  });
}

function withIsolationScope(callback) {
  return getAsyncContextStack().withScope(() => {
    return callback(getAsyncContextStack().getIsolationScope());
  });
}

/**
 * Get the stack-based async context strategy.
 */
function getStackAsyncContextStrategy() {
  return {
    withIsolationScope,
    withScope: withScope$1,
    withSetScope,
    withSetIsolationScope: (_isolationScope, callback) => {
      return withIsolationScope(callback);
    },
    getCurrentScope: () => getAsyncContextStack().getScope(),
    getIsolationScope: () => getAsyncContextStack().getIsolationScope(),
  };
}

/**
 * Get the current async context strategy.
 * If none has been setup, the default will be used.
 */
function getAsyncContextStrategy(carrier) {
  const sentry = getSentryCarrier(carrier);

  if (sentry.acs) {
    return sentry.acs;
  }

  // Otherwise, use the default one (stack)
  return getStackAsyncContextStrategy();
}

/**
 * Get the currently active scope.
 */
function getCurrentScope() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  return acs.getCurrentScope();
}

/**
 * Get the currently active isolation scope.
 * The isolation scope is active for the current exection context.
 */
function getIsolationScope() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  return acs.getIsolationScope();
}

/**
 * Get the global scope.
 * This scope is applied to _all_ events.
 */
function getGlobalScope() {
  return getGlobalSingleton('globalScope', () => new Scope());
}

/**
 * Creates a new scope with and executes the given operation within.
 * The scope is automatically removed once the operation
 * finishes or throws.
 */

/**
 * Either creates a new active scope, or sets the given scope as active scope in the given callback.
 */
function withScope(
  ...rest
) {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);

  // If a scope is defined, we want to make this the active scope instead of the default one
  if (rest.length === 2) {
    const [scope, callback] = rest;

    if (!scope) {
      return acs.withScope(callback);
    }

    return acs.withSetScope(scope, callback);
  }

  return acs.withScope(rest[0]);
}

/**
 * Get the currently active client.
 */
function getClient() {
  return getCurrentScope().getClient();
}

/**
 * key: bucketKey
 * value: [exportKey, MetricSummary]
 */

const METRICS_SPAN_FIELD = '_sentryMetrics';

/**
 * Fetches the metric summary if it exists for the passed span
 */
function getMetricSummaryJsonForSpan(span) {
  const storage = (span )[METRICS_SPAN_FIELD];

  if (!storage) {
    return undefined;
  }
  const output = {};

  for (const [, [exportKey, summary]] of storage) {
    const arr = output[exportKey] || (output[exportKey] = []);
    arr.push(dropUndefinedKeys(summary));
  }

  return output;
}

/**
 * Use this attribute to represent the source of a span.
 * Should be one of: custom, url, route, view, component, task, unknown
 *
 */
const SEMANTIC_ATTRIBUTE_SENTRY_SOURCE = 'sentry.source';

/**
 * Use this attribute to represent the sample rate used for a span.
 */
const SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE = 'sentry.sample_rate';

/**
 * Use this attribute to represent the operation of a span.
 */
const SEMANTIC_ATTRIBUTE_SENTRY_OP = 'sentry.op';

/**
 * Use this attribute to represent the origin of a span.
 */
const SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN = 'sentry.origin';

/** The unit of a measurement, which may be stored as a TimedEvent. */
const SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT = 'sentry.measurement_unit';

/** The value of a measurement, which may be stored as a TimedEvent. */
const SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE = 'sentry.measurement_value';

/**
 * The id of the profile that this span occured in.
 */
const SEMANTIC_ATTRIBUTE_PROFILE_ID = 'sentry.profile_id';

const SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME = 'sentry.exclusive_time';

const SPAN_STATUS_UNSET = 0;
const SPAN_STATUS_OK = 1;
const SPAN_STATUS_ERROR = 2;

// These are aligned with OpenTelemetry trace flags
const TRACE_FLAG_NONE = 0x0;
const TRACE_FLAG_SAMPLED = 0x1;

/**
 * Convert a span to a trace context, which can be sent as the `trace` context in an event.
 * By default, this will only include trace_id, span_id & parent_span_id.
 * If `includeAllData` is true, it will also include data, op, status & origin.
 */
function spanToTransactionTraceContext(span) {
  const { spanId: span_id, traceId: trace_id } = span.spanContext();
  const { data, op, parent_span_id, status, origin } = spanToJSON(span);

  return dropUndefinedKeys({
    parent_span_id,
    span_id,
    trace_id,
    data,
    op,
    status,
    origin,
  });
}

/**
 * Convert a span to a trace context, which can be sent as the `trace` context in a non-transaction event.
 */
function spanToTraceContext(span) {
  const { spanId: span_id, traceId: trace_id } = span.spanContext();
  const { parent_span_id } = spanToJSON(span);

  return dropUndefinedKeys({ parent_span_id, span_id, trace_id });
}

/**
 * Convert a Span to a Sentry trace header.
 */
function spanToTraceHeader(span) {
  const { traceId, spanId } = span.spanContext();
  const sampled = spanIsSampled(span);
  return generateSentryTraceHeader(traceId, spanId, sampled);
}

/**
 * Convert a span time input into a timestamp in seconds.
 */
function spanTimeInputToSeconds(input) {
  if (typeof input === 'number') {
    return ensureTimestampInSeconds(input);
  }

  if (Array.isArray(input)) {
    // See {@link HrTime} for the array-based time format
    return input[0] + input[1] / 1e9;
  }

  if (input instanceof Date) {
    return ensureTimestampInSeconds(input.getTime());
  }

  return timestampInSeconds();
}

/**
 * Converts a timestamp to second, if it was in milliseconds, or keeps it as second.
 */
function ensureTimestampInSeconds(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp / 1000 : timestamp;
}

/**
 * Convert a span to a JSON representation.
 */
// Note: Because of this, we currently have a circular type dependency (which we opted out of in package.json).
// This is not avoidable as we need `spanToJSON` in `spanUtils.ts`, which in turn is needed by `span.ts` for backwards compatibility.
// And `spanToJSON` needs the Span class from `span.ts` to check here.
function spanToJSON(span) {
  if (spanIsSentrySpan(span)) {
    return span.getSpanJSON();
  }

  try {
    const { spanId: span_id, traceId: trace_id } = span.spanContext();

    // Handle a span from @opentelemetry/sdk-base-trace's `Span` class
    if (spanIsOpenTelemetrySdkTraceBaseSpan(span)) {
      const { attributes, startTime, name, endTime, parentSpanId, status } = span;

      return dropUndefinedKeys({
        span_id,
        trace_id,
        data: attributes,
        description: name,
        parent_span_id: parentSpanId,
        start_timestamp: spanTimeInputToSeconds(startTime),
        // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
        timestamp: spanTimeInputToSeconds(endTime) || undefined,
        status: getStatusMessage(status),
        op: attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
        origin: attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ,
        _metrics_summary: getMetricSummaryJsonForSpan(span),
      });
    }

    // Finally, at least we have `spanContext()`....
    return {
      span_id,
      trace_id,
    };
  } catch (e) {
    return {};
  }
}

function spanIsOpenTelemetrySdkTraceBaseSpan(span) {
  const castSpan = span ;
  return !!castSpan.attributes && !!castSpan.startTime && !!castSpan.name && !!castSpan.endTime && !!castSpan.status;
}

/** Exported only for tests. */

/**
 * Sadly, due to circular dependency checks we cannot actually import the Span class here and check for instanceof.
 * :( So instead we approximate this by checking if it has the `getSpanJSON` method.
 */
function spanIsSentrySpan(span) {
  return typeof (span ).getSpanJSON === 'function';
}

/**
 * Returns true if a span is sampled.
 * In most cases, you should just use `span.isRecording()` instead.
 * However, this has a slightly different semantic, as it also returns false if the span is finished.
 * So in the case where this distinction is important, use this method.
 */
function spanIsSampled(span) {
  // We align our trace flags with the ones OpenTelemetry use
  // So we also check for sampled the same way they do.
  const { traceFlags } = span.spanContext();
  return traceFlags === TRACE_FLAG_SAMPLED;
}

/** Get the status message to use for a JSON representation of a span. */
function getStatusMessage(status) {
  if (!status || status.code === SPAN_STATUS_UNSET) {
    return undefined;
  }

  if (status.code === SPAN_STATUS_OK) {
    return 'ok';
  }

  return status.message || 'unknown_error';
}

const CHILD_SPANS_FIELD = '_sentryChildSpans';
const ROOT_SPAN_FIELD = '_sentryRootSpan';

/**
 * Adds an opaque child span reference to a span.
 */
function addChildSpanToSpan(span, childSpan) {
  // We store the root span reference on the child span
  // We need this for `getRootSpan()` to work
  const rootSpan = span[ROOT_SPAN_FIELD] || span;
  addNonEnumerableProperty(childSpan , ROOT_SPAN_FIELD, rootSpan);

  // We store a list of child spans on the parent span
  // We need this for `getSpanDescendants()` to work
  if (span[CHILD_SPANS_FIELD]) {
    span[CHILD_SPANS_FIELD].add(childSpan);
  } else {
    addNonEnumerableProperty(span, CHILD_SPANS_FIELD, new Set([childSpan]));
  }
}

/**
 * Returns an array of the given span and all of its descendants.
 */
function getSpanDescendants(span) {
  const resultSet = new Set();

  function addSpanChildren(span) {
    // This exit condition is required to not infinitely loop in case of a circular dependency.
    if (resultSet.has(span)) {
      return;
      // We want to ignore unsampled spans (e.g. non recording spans)
    } else if (spanIsSampled(span)) {
      resultSet.add(span);
      const childSpans = span[CHILD_SPANS_FIELD] ? Array.from(span[CHILD_SPANS_FIELD]) : [];
      for (const childSpan of childSpans) {
        addSpanChildren(childSpan);
      }
    }
  }

  addSpanChildren(span);

  return Array.from(resultSet);
}

/**
 * Returns the root span of a given span.
 */
function getRootSpan(span) {
  return span[ROOT_SPAN_FIELD] || span;
}

/**
 * Returns the currently active span.
 */
function getActiveSpan() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  if (acs.getActiveSpan) {
    return acs.getActiveSpan();
  }

  return _getSpanForScope(getCurrentScope());
}

let errorsInstrumented = false;

/**
 * Ensure that global errors automatically set the active span status.
 */
function registerSpanErrorInstrumentation() {
  if (errorsInstrumented) {
    return;
  }

  errorsInstrumented = true;
  addGlobalErrorInstrumentationHandler(errorCallback);
  addGlobalUnhandledRejectionInstrumentationHandler(errorCallback);
}

/**
 * If an error or unhandled promise occurs, we mark the active root span as failed
 */
function errorCallback() {
  const activeSpan = getActiveSpan();
  const rootSpan = activeSpan && getRootSpan(activeSpan);
  if (rootSpan) {
    const message = 'internal_error';
    DEBUG_BUILD && logger.log(`[Tracing] Root span: ${message} -> Global error occured`);
    rootSpan.setStatus({ code: SPAN_STATUS_ERROR, message });
  }
}

// The function name will be lost when bundling but we need to be able to identify this listener later to maintain the
// node.js default exit behaviour
errorCallback.tag = 'sentry_tracingErrorCallback';

const SCOPE_ON_START_SPAN_FIELD = '_sentryScope';
const ISOLATION_SCOPE_ON_START_SPAN_FIELD = '_sentryIsolationScope';

/** Store the scope & isolation scope for a span, which can the be used when it is finished. */
function setCapturedScopesOnSpan(span, scope, isolationScope) {
  if (span) {
    addNonEnumerableProperty(span, ISOLATION_SCOPE_ON_START_SPAN_FIELD, isolationScope);
    addNonEnumerableProperty(span, SCOPE_ON_START_SPAN_FIELD, scope);
  }
}

/**
 * Grabs the scope and isolation scope off a span that were active when the span was started.
 */
function getCapturedScopesOnSpan(span) {
  return {
    scope: (span )[SCOPE_ON_START_SPAN_FIELD],
    isolationScope: (span )[ISOLATION_SCOPE_ON_START_SPAN_FIELD],
  };
}

// Treeshakable guard to remove all code related to tracing

/**
 * Determines if tracing is currently enabled.
 *
 * Tracing is enabled when at least one of `tracesSampleRate` and `tracesSampler` is defined in the SDK config.
 */
function hasTracingEnabled(
  maybeOptions,
) {
  if (typeof __SENTRY_TRACING__ === 'boolean' && !__SENTRY_TRACING__) {
    return false;
  }

  const client = getClient();
  const options = maybeOptions || (client && client.getOptions());
  // eslint-disable-next-line deprecation/deprecation
  return !!options && (options.enableTracing || 'tracesSampleRate' in options || 'tracesSampler' in options);
}

/**
 * A Sentry Span that is non-recording, meaning it will not be sent to Sentry.
 */
class SentryNonRecordingSpan  {

   constructor(spanContext = {}) {
    this._traceId = spanContext.traceId || uuid4();
    this._spanId = spanContext.spanId || uuid4().substring(16);
  }

  /** @inheritdoc */
   spanContext() {
    return {
      spanId: this._spanId,
      traceId: this._traceId,
      traceFlags: TRACE_FLAG_NONE,
    };
  }

  /** @inheritdoc */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
   end(_timestamp) {}

  /** @inheritdoc */
   setAttribute(_key, _value) {
    return this;
  }

  /** @inheritdoc */
   setAttributes(_values) {
    return this;
  }

  /** @inheritdoc */
   setStatus(_status) {
    return this;
  }

  /** @inheritdoc */
   updateName(_name) {
    return this;
  }

  /** @inheritdoc */
   isRecording() {
    return false;
  }

  /** @inheritdoc */
   addEvent(
    _name,
    _attributesOrStartTime,
    _startTime,
  ) {
    return this;
  }

  /**
   * This should generally not be used,
   * but we need it for being comliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   addLink(_link) {
    return this;
  }

  /**
   * This should generally not be used,
   * but we need it for being comliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   addLinks(_links) {
    return this;
  }

  /**
   * This should generally not be used,
   * but we need it for being comliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   recordException(_exception, _time) {
    // noop
  }
}

/**
 * Wrap a callback function with error handling.
 * If an error is thrown, it will be passed to the `onError` callback and re-thrown.
 *
 * If the return value of the function is a promise, it will be handled with `maybeHandlePromiseRejection`.
 *
 * If an `onFinally` callback is provided, this will be called when the callback has finished
 * - so if it returns a promise, once the promise resolved/rejected,
 * else once the callback has finished executing.
 * The `onFinally` callback will _always_ be called, no matter if an error was thrown or not.
 */
function handleCallbackErrors

(
  fn,
  onError,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onFinally = () => {},
) {
  let maybePromiseResult;
  try {
    maybePromiseResult = fn();
  } catch (e) {
    onError(e);
    onFinally();
    throw e;
  }

  return maybeHandlePromiseRejection(maybePromiseResult, onError, onFinally);
}

/**
 * Maybe handle a promise rejection.
 * This expects to be given a value that _may_ be a promise, or any other value.
 * If it is a promise, and it rejects, it will call the `onError` callback.
 * Other than this, it will generally return the given value as-is.
 */
function maybeHandlePromiseRejection(
  value,
  onError,
  onFinally,
) {
  if (isThenable(value)) {
    // @ts-expect-error - the isThenable check returns the "wrong" type here
    return value.then(
      res => {
        onFinally();
        return res;
      },
      e => {
        onError(e);
        onFinally();
        throw e;
      },
    );
  }

  onFinally();
  return value;
}

const DEFAULT_ENVIRONMENT = 'production';

/**
 * If you change this value, also update the terser plugin config to
 * avoid minification of the object property!
 */
const FROZEN_DSC_FIELD = '_frozenDsc';

/**
 * Freeze the given DSC on the given span.
 */
function freezeDscOnSpan(span, dsc) {
  const spanWithMaybeDsc = span ;
  addNonEnumerableProperty(spanWithMaybeDsc, FROZEN_DSC_FIELD, dsc);
}

/**
 * Creates a dynamic sampling context from a client.
 *
 * Dispatches the `createDsc` lifecycle hook as a side effect.
 */
function getDynamicSamplingContextFromClient(trace_id, client) {
  const options = client.getOptions();

  const { publicKey: public_key } = client.getDsn() || {};

  const dsc = dropUndefinedKeys({
    environment: options.environment || DEFAULT_ENVIRONMENT,
    release: options.release,
    public_key,
    trace_id,
  }) ;

  client.emit('createDsc', dsc);

  return dsc;
}

/**
 * Creates a dynamic sampling context from a span (and client and scope)
 *
 * @param span the span from which a few values like the root span name and sample rate are extracted.
 *
 * @returns a dynamic sampling context
 */
function getDynamicSamplingContextFromSpan(span) {
  const client = getClient();
  if (!client) {
    return {};
  }

  const dsc = getDynamicSamplingContextFromClient(spanToJSON(span).trace_id || '', client);

  const rootSpan = getRootSpan(span);

  // For core implementation, we freeze the DSC onto the span as a non-enumerable property
  const frozenDsc = (rootSpan )[FROZEN_DSC_FIELD];
  if (frozenDsc) {
    return frozenDsc;
  }

  // For OpenTelemetry, we freeze the DSC on the trace state
  const traceState = rootSpan.spanContext().traceState;
  const traceStateDsc = traceState && traceState.get('sentry.dsc');

  // If the span has a DSC, we want it to take precedence
  const dscOnTraceState = traceStateDsc && baggageHeaderToDynamicSamplingContext(traceStateDsc);

  if (dscOnTraceState) {
    return dscOnTraceState;
  }

  // Else, we generate it from the span
  const jsonSpan = spanToJSON(rootSpan);
  const attributes = jsonSpan.data || {};
  const maybeSampleRate = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE];

  if (maybeSampleRate != null) {
    dsc.sample_rate = `${maybeSampleRate}`;
  }

  // We don't want to have a transaction name in the DSC if the source is "url" because URLs might contain PII
  const source = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];

  // after JSON conversion, txn.name becomes jsonSpan.description
  const name = jsonSpan.description;
  if (source !== 'url' && name) {
    dsc.transaction = name;
  }

  dsc.sampled = String(spanIsSampled(rootSpan));

  client.emit('createDsc', dsc, rootSpan);

  return dsc;
}

/**
 * Print a log message for a started span.
 */
function logSpanStart(span) {
  if (!DEBUG_BUILD) return;

  const { description = '< unknown name >', op = '< unknown op >', parent_span_id: parentSpanId } = spanToJSON(span);
  const { spanId } = span.spanContext();

  const sampled = spanIsSampled(span);
  const rootSpan = getRootSpan(span);
  const isRootSpan = rootSpan === span;

  const header = `[Tracing] Starting ${sampled ? 'sampled' : 'unsampled'} ${isRootSpan ? 'root ' : ''}span`;

  const infoParts = [`op: ${op}`, `name: ${description}`, `ID: ${spanId}`];

  if (parentSpanId) {
    infoParts.push(`parent ID: ${parentSpanId}`);
  }

  if (!isRootSpan) {
    const { op, description } = spanToJSON(rootSpan);
    infoParts.push(`root ID: ${rootSpan.spanContext().spanId}`);
    if (op) {
      infoParts.push(`root op: ${op}`);
    }
    if (description) {
      infoParts.push(`root description: ${description}`);
    }
  }

  logger.log(`${header}
  ${infoParts.join('\n  ')}`);
}

/**
 * Print a log message for an ended span.
 */
function logSpanEnd(span) {
  if (!DEBUG_BUILD) return;

  const { description = '< unknown name >', op = '< unknown op >' } = spanToJSON(span);
  const { spanId } = span.spanContext();
  const rootSpan = getRootSpan(span);
  const isRootSpan = rootSpan === span;

  const msg = `[Tracing] Finishing "${op}" ${isRootSpan ? 'root ' : ''}span "${description}" with ID ${spanId}`;
  logger.log(msg);
}

/**
 * Parse a sample rate from a given value.
 * This will either return a boolean or number sample rate, if the sample rate is valid (between 0 and 1).
 * If a string is passed, we try to convert it to a number.
 *
 * Any invalid sample rate will return `undefined`.
 */
function parseSampleRate(sampleRate) {
  if (typeof sampleRate === 'boolean') {
    return Number(sampleRate);
  }

  const rate = typeof sampleRate === 'string' ? parseFloat(sampleRate) : sampleRate;
  if (typeof rate !== 'number' || isNaN(rate) || rate < 0 || rate > 1) {
    DEBUG_BUILD &&
      logger.warn(
        `[Tracing] Given sample rate is invalid. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
          sampleRate,
        )} of type ${JSON.stringify(typeof sampleRate)}.`,
      );
    return undefined;
  }

  return rate;
}

/**
 * Makes a sampling decision for the given options.
 *
 * Called every time a root span is created. Only root spans which emerge with a `sampled` value of `true` will be
 * sent to Sentry.
 */
function sampleSpan(
  options,
  samplingContext,
) {
  // nothing to do if tracing is not enabled
  if (!hasTracingEnabled(options)) {
    return [false];
  }

  // we would have bailed already if neither `tracesSampler` nor `tracesSampleRate` nor `enableTracing` were defined, so one of these should
  // work; prefer the hook if so
  let sampleRate;
  if (typeof options.tracesSampler === 'function') {
    sampleRate = options.tracesSampler(samplingContext);
  } else if (samplingContext.parentSampled !== undefined) {
    sampleRate = samplingContext.parentSampled;
  } else if (typeof options.tracesSampleRate !== 'undefined') {
    sampleRate = options.tracesSampleRate;
  } else {
    // When `enableTracing === true`, we use a sample rate of 100%
    sampleRate = 1;
  }

  // Since this is coming from the user (or from a function provided by the user), who knows what we might get.
  // (The only valid values are booleans or numbers between 0 and 1.)
  const parsedSampleRate = parseSampleRate(sampleRate);

  if (parsedSampleRate === undefined) {
    DEBUG_BUILD && logger.warn('[Tracing] Discarding transaction because of invalid sample rate.');
    return [false];
  }

  // if the function returned 0 (or false), or if `tracesSampleRate` is 0, it's a sign the transaction should be dropped
  if (!parsedSampleRate) {
    DEBUG_BUILD &&
      logger.log(
        `[Tracing] Discarding transaction because ${
          typeof options.tracesSampler === 'function'
            ? 'tracesSampler returned 0 or false'
            : 'a negative sampling decision was inherited or tracesSampleRate is set to 0'
        }`,
      );
    return [false, parsedSampleRate];
  }

  // Now we roll the dice. Math.random is inclusive of 0, but not of 1, so strict < is safe here. In case sampleRate is
  // a boolean, the < comparison will cause it to be automatically cast to 1 if it's true and 0 if it's false.
  const shouldSample = Math.random() < parsedSampleRate;

  // if we're not going to keep it, we're done
  if (!shouldSample) {
    DEBUG_BUILD &&
      logger.log(
        `[Tracing] Discarding transaction because it's not included in the random sample (sampling rate = ${Number(
          sampleRate,
        )})`,
      );
    return [false, parsedSampleRate];
  }

  return [true, parsedSampleRate];
}

/**
 * Apply SdkInfo (name, version, packages, integrations) to the corresponding event key.
 * Merge with existing data if any.
 **/
function enhanceEventWithSdkInfo(event, sdkInfo) {
  if (!sdkInfo) {
    return event;
  }
  event.sdk = event.sdk || {};
  event.sdk.name = event.sdk.name || sdkInfo.name;
  event.sdk.version = event.sdk.version || sdkInfo.version;
  event.sdk.integrations = [...(event.sdk.integrations || []), ...(sdkInfo.integrations || [])];
  event.sdk.packages = [...(event.sdk.packages || []), ...(sdkInfo.packages || [])];
  return event;
}

/** Creates an envelope from a Session */
function createSessionEnvelope(
  session,
  dsn,
  metadata,
  tunnel,
) {
  const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);
  const envelopeHeaders = {
    sent_at: new Date().toISOString(),
    ...(sdkInfo && { sdk: sdkInfo }),
    ...(!!tunnel && dsn && { dsn: dsnToString(dsn) }),
  };

  const envelopeItem =
    'aggregates' in session ? [{ type: 'sessions' }, session] : [{ type: 'session' }, session.toJSON()];

  return createEnvelope(envelopeHeaders, [envelopeItem]);
}

/**
 * Create an Envelope from an event.
 */
function createEventEnvelope(
  event,
  dsn,
  metadata,
  tunnel,
) {
  const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);

  /*
    Note: Due to TS, event.type may be `replay_event`, theoretically.
    In practice, we never call `createEventEnvelope` with `replay_event` type,
    and we'd have to adjut a looot of types to make this work properly.
    We want to avoid casting this around, as that could lead to bugs (e.g. when we add another type)
    So the safe choice is to really guard against the replay_event type here.
  */
  const eventType = event.type && event.type !== 'replay_event' ? event.type : 'event';

  enhanceEventWithSdkInfo(event, metadata && metadata.sdk);

  const envelopeHeaders = createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn);

  // Prevent this data (which, if it exists, was used in earlier steps in the processing pipeline) from being sent to
  // sentry. (Note: Our use of this property comes and goes with whatever we might be debugging, whatever hacks we may
  // have temporarily added, etc. Even if we don't happen to be using it at some point in the future, let's not get rid
  // of this `delete`, lest we miss putting it back in the next time the property is in use.)
  delete event.sdkProcessingMetadata;

  const eventItem = [{ type: eventType }, event];
  return createEnvelope(envelopeHeaders, [eventItem]);
}

/**
 * Create envelope from Span item.
 *
 * Takes an optional client and runs spans through `beforeSendSpan` if available.
 */
function createSpanEnvelope(spans, client) {
  function dscHasRequiredProps(dsc) {
    return !!dsc.trace_id && !!dsc.public_key;
  }

  // For the moment we'll obtain the DSC from the first span in the array
  // This might need to be changed if we permit sending multiple spans from
  // different segments in one envelope
  const dsc = getDynamicSamplingContextFromSpan(spans[0]);

  const dsn = client && client.getDsn();
  const tunnel = client && client.getOptions().tunnel;

  const headers = {
    sent_at: new Date().toISOString(),
    ...(dscHasRequiredProps(dsc) && { trace: dsc }),
    ...(!!tunnel && dsn && { dsn: dsnToString(dsn) }),
  };

  const beforeSendSpan = client && client.getOptions().beforeSendSpan;
  const convertToSpanJSON = beforeSendSpan
    ? (span) => beforeSendSpan(spanToJSON(span) )
    : (span) => spanToJSON(span);

  const items = [];
  for (const span of spans) {
    const spanJson = convertToSpanJSON(span);
    if (spanJson) {
      items.push(createSpanEnvelopeItem(spanJson));
    }
  }

  return createEnvelope(headers, items);
}

/**
 * Adds a measurement to the active transaction on the current global scope. You can optionally pass in a different span
 * as the 4th parameter.
 */
function setMeasurement(name, value, unit, activeSpan = getActiveSpan()) {
  const rootSpan = activeSpan && getRootSpan(activeSpan);

  if (rootSpan) {
    rootSpan.addEvent(name, {
      [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: value,
      [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: unit ,
    });
  }
}

/**
 * Convert timed events to measurements.
 */
function timedEventsToMeasurements(events) {
  if (!events || events.length === 0) {
    return undefined;
  }

  const measurements = {};
  events.forEach(event => {
    const attributes = event.attributes || {};
    const unit = attributes[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT] ;
    const value = attributes[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE] ;

    if (typeof unit === 'string' && typeof value === 'number') {
      measurements[event.name] = { value, unit };
    }
  });

  return measurements;
}

const MAX_SPAN_COUNT = 1000;

/**
 * Span contains all data about a span
 */
class SentrySpan  {

  /** Epoch timestamp in seconds when the span started. */

  /** Epoch timestamp in seconds when the span ended. */

  /** Internal keeper of the status */

  /** The timed events added to this span. */

  /** if true, treat span as a standalone span (not part of a transaction) */

  /**
   * You should never call the constructor manually, always use `Sentry.startSpan()`
   * or other span methods.
   * @internal
   * @hideconstructor
   * @hidden
   */
   constructor(spanContext = {}) {
    this._traceId = spanContext.traceId || uuid4();
    this._spanId = spanContext.spanId || uuid4().substring(16);
    this._startTime = spanContext.startTimestamp || timestampInSeconds();

    this._attributes = {};
    this.setAttributes({
      [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'manual',
      [SEMANTIC_ATTRIBUTE_SENTRY_OP]: spanContext.op,
      ...spanContext.attributes,
    });

    this._name = spanContext.name;

    if (spanContext.parentSpanId) {
      this._parentSpanId = spanContext.parentSpanId;
    }
    // We want to include booleans as well here
    if ('sampled' in spanContext) {
      this._sampled = spanContext.sampled;
    }
    if (spanContext.endTimestamp) {
      this._endTime = spanContext.endTimestamp;
    }

    this._events = [];

    this._isStandaloneSpan = spanContext.isStandalone;

    // If the span is already ended, ensure we finalize the span immediately
    if (this._endTime) {
      this._onSpanEnded();
    }
  }

  /**
   * This should generally not be used,
   * but it is needed for being compliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   addLink(_link) {
    return this;
  }

  /**
   * This should generally not be used,
   * but it is needed for being compliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   addLinks(_links) {
    return this;
  }

  /**
   * This should generally not be used,
   * but it is needed for being compliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   recordException(_exception, _time) {
    // noop
  }

  /** @inheritdoc */
   spanContext() {
    const { _spanId: spanId, _traceId: traceId, _sampled: sampled } = this;
    return {
      spanId,
      traceId,
      traceFlags: sampled ? TRACE_FLAG_SAMPLED : TRACE_FLAG_NONE,
    };
  }

  /** @inheritdoc */
   setAttribute(key, value) {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._attributes[key];
    } else {
      this._attributes[key] = value;
    }

    return this;
  }

  /** @inheritdoc */
   setAttributes(attributes) {
    Object.keys(attributes).forEach(key => this.setAttribute(key, attributes[key]));
    return this;
  }

  /**
   * This should generally not be used,
   * but we need it for browser tracing where we want to adjust the start time afterwards.
   * USE THIS WITH CAUTION!
   *
   * @hidden
   * @internal
   */
   updateStartTime(timeInput) {
    this._startTime = spanTimeInputToSeconds(timeInput);
  }

  /**
   * @inheritDoc
   */
   setStatus(value) {
    this._status = value;
    return this;
  }

  /**
   * @inheritDoc
   */
   updateName(name) {
    this._name = name;
    return this;
  }

  /** @inheritdoc */
   end(endTimestamp) {
    // If already ended, skip
    if (this._endTime) {
      return;
    }

    this._endTime = spanTimeInputToSeconds(endTimestamp);
    logSpanEnd(this);

    this._onSpanEnded();
  }

  /**
   * Get JSON representation of this span.
   *
   * @hidden
   * @internal This method is purely for internal purposes and should not be used outside
   * of SDK code. If you need to get a JSON representation of a span,
   * use `spanToJSON(span)` instead.
   */
   getSpanJSON() {
    return dropUndefinedKeys({
      data: this._attributes,
      description: this._name,
      op: this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
      parent_span_id: this._parentSpanId,
      span_id: this._spanId,
      start_timestamp: this._startTime,
      status: getStatusMessage(this._status),
      timestamp: this._endTime,
      trace_id: this._traceId,
      origin: this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ,
      _metrics_summary: getMetricSummaryJsonForSpan(this),
      profile_id: this._attributes[SEMANTIC_ATTRIBUTE_PROFILE_ID] ,
      exclusive_time: this._attributes[SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME] ,
      measurements: timedEventsToMeasurements(this._events),
      is_segment: (this._isStandaloneSpan && getRootSpan(this) === this) || undefined,
      segment_id: this._isStandaloneSpan ? getRootSpan(this).spanContext().spanId : undefined,
    });
  }

  /** @inheritdoc */
   isRecording() {
    return !this._endTime && !!this._sampled;
  }

  /**
   * @inheritdoc
   */
   addEvent(
    name,
    attributesOrStartTime,
    startTime,
  ) {
    DEBUG_BUILD && logger.log('[Tracing] Adding an event to span:', name);

    const time = isSpanTimeInput(attributesOrStartTime) ? attributesOrStartTime : startTime || timestampInSeconds();
    const attributes = isSpanTimeInput(attributesOrStartTime) ? {} : attributesOrStartTime || {};

    const event = {
      name,
      time: spanTimeInputToSeconds(time),
      attributes,
    };

    this._events.push(event);

    return this;
  }

  /**
   * This method should generally not be used,
   * but for now we need a way to publicly check if the `_isStandaloneSpan` flag is set.
   * USE THIS WITH CAUTION!
   * @internal
   * @hidden
   * @experimental
   */
   isStandaloneSpan() {
    return !!this._isStandaloneSpan;
  }

  /** Emit `spanEnd` when the span is ended. */
   _onSpanEnded() {
    const client = getClient();
    if (client) {
      client.emit('spanEnd', this);
    }

    // A segment span is basically the root span of a local span tree.
    // So for now, this is either what we previously refer to as the root span,
    // or a standalone span.
    const isSegmentSpan = this._isStandaloneSpan || this === getRootSpan(this);

    if (!isSegmentSpan) {
      return;
    }

    // if this is a standalone span, we send it immediately
    if (this._isStandaloneSpan) {
      if (this._sampled) {
        sendSpanEnvelope(createSpanEnvelope([this], client));
      } else {
        DEBUG_BUILD &&
          logger.log('[Tracing] Discarding standalone span because its trace was not chosen to be sampled.');
        if (client) {
          client.recordDroppedEvent('sample_rate', 'span');
        }
      }
      return;
    }

    const transactionEvent = this._convertSpanToTransaction();
    if (transactionEvent) {
      const scope = getCapturedScopesOnSpan(this).scope || getCurrentScope();
      scope.captureEvent(transactionEvent);
    }
  }

  /**
   * Finish the transaction & prepare the event to send to Sentry.
   */
   _convertSpanToTransaction() {
    // We can only convert finished spans
    if (!isFullFinishedSpan(spanToJSON(this))) {
      return undefined;
    }

    if (!this._name) {
      DEBUG_BUILD && logger.warn('Transaction has no name, falling back to `<unlabeled transaction>`.');
      this._name = '<unlabeled transaction>';
    }

    const { scope: capturedSpanScope, isolationScope: capturedSpanIsolationScope } = getCapturedScopesOnSpan(this);
    const scope = capturedSpanScope || getCurrentScope();
    const client = scope.getClient() || getClient();

    if (this._sampled !== true) {
      // At this point if `sampled !== true` we want to discard the transaction.
      DEBUG_BUILD && logger.log('[Tracing] Discarding transaction because its trace was not chosen to be sampled.');

      if (client) {
        client.recordDroppedEvent('sample_rate', 'transaction');
      }

      return undefined;
    }

    // The transaction span itself as well as any potential standalone spans should be filtered out
    const finishedSpans = getSpanDescendants(this).filter(span => span !== this && !isStandaloneSpan(span));

    const spans = finishedSpans.map(span => spanToJSON(span)).filter(isFullFinishedSpan);

    const source = this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] ;

    const transaction = {
      contexts: {
        trace: spanToTransactionTraceContext(this),
      },
      spans:
        // spans.sort() mutates the array, but `spans` is already a copy so we can safely do this here
        // we do not use spans anymore after this point
        spans.length > MAX_SPAN_COUNT
          ? spans.sort((a, b) => a.start_timestamp - b.start_timestamp).slice(0, MAX_SPAN_COUNT)
          : spans,
      start_timestamp: this._startTime,
      timestamp: this._endTime,
      transaction: this._name,
      type: 'transaction',
      sdkProcessingMetadata: {
        capturedSpanScope,
        capturedSpanIsolationScope,
        ...dropUndefinedKeys({
          dynamicSamplingContext: getDynamicSamplingContextFromSpan(this),
        }),
      },
      _metrics_summary: getMetricSummaryJsonForSpan(this),
      ...(source && {
        transaction_info: {
          source,
        },
      }),
    };

    const measurements = timedEventsToMeasurements(this._events);
    const hasMeasurements = measurements && Object.keys(measurements).length;

    if (hasMeasurements) {
      DEBUG_BUILD &&
        logger.log(
          '[Measurements] Adding measurements to transaction event',
          JSON.stringify(measurements, undefined, 2),
        );
      transaction.measurements = measurements;
    }

    return transaction;
  }
}

function isSpanTimeInput(value) {
  return (value && typeof value === 'number') || value instanceof Date || Array.isArray(value);
}

// We want to filter out any incomplete SpanJSON objects
function isFullFinishedSpan(input) {
  return !!input.start_timestamp && !!input.timestamp && !!input.span_id && !!input.trace_id;
}

/** `SentrySpan`s can be sent as a standalone span rather than belonging to a transaction */
function isStandaloneSpan(span) {
  return span instanceof SentrySpan && span.isStandaloneSpan();
}

/**
 * Sends a `SpanEnvelope`.
 *
 * Note: If the envelope's spans are dropped, e.g. via `beforeSendSpan`,
 * the envelope will not be sent either.
 */
function sendSpanEnvelope(envelope) {
  const client = getClient();
  if (!client) {
    return;
  }

  const spanItems = envelope[1];
  if (!spanItems || spanItems.length === 0) {
    client.recordDroppedEvent('before_send', 'span');
    return;
  }

  const transport = client.getTransport();
  if (transport) {
    transport.send(envelope).then(null, reason => {
      DEBUG_BUILD && logger.error('Error while sending span:', reason);
    });
  }
}

const SUPPRESS_TRACING_KEY = '__SENTRY_SUPPRESS_TRACING__';

/**
 * Wraps a function with a transaction/span and finishes the span after the function is done.
 * The created span is the active span and will be used as parent by other spans created inside the function
 * and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
 *
 * If you want to create a span that is not set as active, use {@link startInactiveSpan}.
 *
 * You'll always get a span passed to the callback,
 * it may just be a non-recording span if the span is not sampled or if tracing is disabled.
 */
function startSpan(options, callback) {
  const acs = getAcs();
  if (acs.startSpan) {
    return acs.startSpan(options, callback);
  }

  const spanArguments = parseSentrySpanArguments(options);
  const { forceTransaction, parentSpan: customParentSpan } = options;

  return withScope(options.scope, () => {
    // If `options.parentSpan` is defined, we want to wrap the callback in `withActiveSpan`
    const wrapper = getActiveSpanWrapper(customParentSpan);

    return wrapper(() => {
      const scope = getCurrentScope();
      const parentSpan = getParentSpan(scope);

      const shouldSkipSpan = options.onlyIfParent && !parentSpan;
      const activeSpan = shouldSkipSpan
        ? new SentryNonRecordingSpan()
        : createChildOrRootSpan({
            parentSpan,
            spanArguments,
            forceTransaction,
            scope,
          });

      _setSpanForScope(scope, activeSpan);

      return handleCallbackErrors(
        () => callback(activeSpan),
        () => {
          // Only update the span status if it hasn't been changed yet, and the span is not yet finished
          const { status } = spanToJSON(activeSpan);
          if (activeSpan.isRecording() && (!status || status === 'ok')) {
            activeSpan.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
          }
        },
        () => activeSpan.end(),
      );
    });
  });
}

/**
 * Forks the current scope and sets the provided span as active span in the context of the provided callback. Can be
 * passed `null` to start an entirely new span tree.
 *
 * @param span Spans started in the context of the provided callback will be children of this span. If `null` is passed,
 * spans started within the callback will not be attached to a parent span.
 * @param callback Execution context in which the provided span will be active. Is passed the newly forked scope.
 * @returns the value returned from the provided callback function.
 */
function withActiveSpan(span, callback) {
  const acs = getAcs();
  if (acs.withActiveSpan) {
    return acs.withActiveSpan(span, callback);
  }

  return withScope(scope => {
    _setSpanForScope(scope, span || undefined);
    return callback(scope);
  });
}

/** Suppress tracing in the given callback, ensuring no spans are generated inside of it. */
function suppressTracing(callback) {
  const acs = getAcs();

  if (acs.suppressTracing) {
    return acs.suppressTracing(callback);
  }

  return withScope(scope => {
    scope.setSDKProcessingMetadata({ [SUPPRESS_TRACING_KEY]: true });
    return callback();
  });
}

function createChildOrRootSpan({
  parentSpan,
  spanArguments,
  forceTransaction,
  scope,
}

) {
  if (!hasTracingEnabled()) {
    return new SentryNonRecordingSpan();
  }

  const isolationScope = getIsolationScope();

  let span;
  if (parentSpan && !forceTransaction) {
    span = _startChildSpan(parentSpan, scope, spanArguments);
    addChildSpanToSpan(parentSpan, span);
  } else if (parentSpan) {
    // If we forced a transaction but have a parent span, make sure to continue from the parent span, not the scope
    const dsc = getDynamicSamplingContextFromSpan(parentSpan);
    const { traceId, spanId: parentSpanId } = parentSpan.spanContext();
    const parentSampled = spanIsSampled(parentSpan);

    span = _startRootSpan(
      {
        traceId,
        parentSpanId,
        ...spanArguments,
      },
      scope,
      parentSampled,
    );

    freezeDscOnSpan(span, dsc);
  } else {
    const {
      traceId,
      dsc,
      parentSpanId,
      sampled: parentSampled,
    } = {
      ...isolationScope.getPropagationContext(),
      ...scope.getPropagationContext(),
    };

    span = _startRootSpan(
      {
        traceId,
        parentSpanId,
        ...spanArguments,
      },
      scope,
      parentSampled,
    );

    if (dsc) {
      freezeDscOnSpan(span, dsc);
    }
  }

  logSpanStart(span);

  setCapturedScopesOnSpan(span, scope, isolationScope);

  return span;
}

/**
 * This converts StartSpanOptions to SentrySpanArguments.
 * For the most part (for now) we accept the same options,
 * but some of them need to be transformed.
 */
function parseSentrySpanArguments(options) {
  const exp = options.experimental || {};
  const initialCtx = {
    isStandalone: exp.standalone,
    ...options,
  };

  if (options.startTime) {
    const ctx = { ...initialCtx };
    ctx.startTimestamp = spanTimeInputToSeconds(options.startTime);
    delete ctx.startTime;
    return ctx;
  }

  return initialCtx;
}

function getAcs() {
  const carrier = getMainCarrier();
  return getAsyncContextStrategy(carrier);
}

function _startRootSpan(spanArguments, scope, parentSampled) {
  const client = getClient();
  const options = (client && client.getOptions()) || {};

  const { name = '', attributes } = spanArguments;
  const [sampled, sampleRate] = scope.getScopeData().sdkProcessingMetadata[SUPPRESS_TRACING_KEY]
    ? [false]
    : sampleSpan(options, {
        name,
        parentSampled,
        attributes,
        transactionContext: {
          name,
          parentSampled,
        },
      });

  const rootSpan = new SentrySpan({
    ...spanArguments,
    attributes: {
      [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
      ...spanArguments.attributes,
    },
    sampled,
  });
  if (sampleRate !== undefined) {
    rootSpan.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE, sampleRate);
  }

  if (client) {
    client.emit('spanStart', rootSpan);
  }

  return rootSpan;
}

/**
 * Creates a new `Span` while setting the current `Span.id` as `parentSpanId`.
 * This inherits the sampling decision from the parent span.
 */
function _startChildSpan(parentSpan, scope, spanArguments) {
  const { spanId, traceId } = parentSpan.spanContext();
  const sampled = scope.getScopeData().sdkProcessingMetadata[SUPPRESS_TRACING_KEY] ? false : spanIsSampled(parentSpan);

  const childSpan = sampled
    ? new SentrySpan({
        ...spanArguments,
        parentSpanId: spanId,
        traceId,
        sampled,
      })
    : new SentryNonRecordingSpan({ traceId });

  addChildSpanToSpan(parentSpan, childSpan);

  const client = getClient();
  if (client) {
    client.emit('spanStart', childSpan);
    // If it has an endTimestamp, it's already ended
    if (spanArguments.endTimestamp) {
      client.emit('spanEnd', childSpan);
    }
  }

  return childSpan;
}

function getParentSpan(scope) {
  const span = _getSpanForScope(scope) ;

  if (!span) {
    return undefined;
  }

  const client = getClient();
  const options = client ? client.getOptions() : {};
  if (options.parentSpanIsAlwaysRootSpan) {
    return getRootSpan(span) ;
  }

  return span;
}

function getActiveSpanWrapper(parentSpan) {
  return parentSpan !== undefined
    ? (callback) => {
        return withActiveSpan(parentSpan, callback);
      }
    : (callback) => callback();
}

/**
 * Process an array of event processors, returning the processed event (or `null` if the event was dropped).
 */
function notifyEventProcessors(
  processors,
  event,
  hint,
  index = 0,
) {
  return new SyncPromise((resolve, reject) => {
    const processor = processors[index];
    if (event === null || typeof processor !== 'function') {
      resolve(event);
    } else {
      const result = processor({ ...event }, hint) ;

      DEBUG_BUILD && processor.id && result === null && logger.log(`Event processor "${processor.id}" dropped event`);

      if (isThenable(result)) {
        void result
          .then(final => notifyEventProcessors(processors, final, hint, index + 1).then(resolve))
          .then(null, reject);
      } else {
        void notifyEventProcessors(processors, result, hint, index + 1)
          .then(resolve)
          .then(null, reject);
      }
    }
  });
}

/**
 * Applies data from the scope to the event and runs all event processors on it.
 */
function applyScopeDataToEvent(event, data) {
  const { fingerprint, span, breadcrumbs, sdkProcessingMetadata } = data;

  // Apply general data
  applyDataToEvent(event, data);

  // We want to set the trace context for normal events only if there isn't already
  // a trace context on the event. There is a product feature in place where we link
  // errors with transaction and it relies on that.
  if (span) {
    applySpanToEvent(event, span);
  }

  applyFingerprintToEvent(event, fingerprint);
  applyBreadcrumbsToEvent(event, breadcrumbs);
  applySdkMetadataToEvent(event, sdkProcessingMetadata);
}

/** Merge data of two scopes together. */
function mergeScopeData(data, mergeData) {
  const {
    extra,
    tags,
    user,
    contexts,
    level,
    sdkProcessingMetadata,
    breadcrumbs,
    fingerprint,
    eventProcessors,
    attachments,
    propagationContext,
    transactionName,
    span,
  } = mergeData;

  mergeAndOverwriteScopeData(data, 'extra', extra);
  mergeAndOverwriteScopeData(data, 'tags', tags);
  mergeAndOverwriteScopeData(data, 'user', user);
  mergeAndOverwriteScopeData(data, 'contexts', contexts);
  mergeAndOverwriteScopeData(data, 'sdkProcessingMetadata', sdkProcessingMetadata);

  if (level) {
    data.level = level;
  }

  if (transactionName) {
    data.transactionName = transactionName;
  }

  if (span) {
    data.span = span;
  }

  if (breadcrumbs.length) {
    data.breadcrumbs = [...data.breadcrumbs, ...breadcrumbs];
  }

  if (fingerprint.length) {
    data.fingerprint = [...data.fingerprint, ...fingerprint];
  }

  if (eventProcessors.length) {
    data.eventProcessors = [...data.eventProcessors, ...eventProcessors];
  }

  if (attachments.length) {
    data.attachments = [...data.attachments, ...attachments];
  }

  data.propagationContext = { ...data.propagationContext, ...propagationContext };
}

/**
 * Merges certain scope data. Undefined values will overwrite any existing values.
 * Exported only for tests.
 */
function mergeAndOverwriteScopeData

(data, prop, mergeVal) {
  if (mergeVal && Object.keys(mergeVal).length) {
    // Clone object
    data[prop] = { ...data[prop] };
    for (const key in mergeVal) {
      if (Object.prototype.hasOwnProperty.call(mergeVal, key)) {
        data[prop][key] = mergeVal[key];
      }
    }
  }
}

function applyDataToEvent(event, data) {
  const { extra, tags, user, contexts, level, transactionName } = data;

  const cleanedExtra = dropUndefinedKeys(extra);
  if (cleanedExtra && Object.keys(cleanedExtra).length) {
    event.extra = { ...cleanedExtra, ...event.extra };
  }

  const cleanedTags = dropUndefinedKeys(tags);
  if (cleanedTags && Object.keys(cleanedTags).length) {
    event.tags = { ...cleanedTags, ...event.tags };
  }

  const cleanedUser = dropUndefinedKeys(user);
  if (cleanedUser && Object.keys(cleanedUser).length) {
    event.user = { ...cleanedUser, ...event.user };
  }

  const cleanedContexts = dropUndefinedKeys(contexts);
  if (cleanedContexts && Object.keys(cleanedContexts).length) {
    event.contexts = { ...cleanedContexts, ...event.contexts };
  }

  if (level) {
    event.level = level;
  }

  // transaction events get their `transaction` from the root span name
  if (transactionName && event.type !== 'transaction') {
    event.transaction = transactionName;
  }
}

function applyBreadcrumbsToEvent(event, breadcrumbs) {
  const mergedBreadcrumbs = [...(event.breadcrumbs || []), ...breadcrumbs];
  event.breadcrumbs = mergedBreadcrumbs.length ? mergedBreadcrumbs : undefined;
}

function applySdkMetadataToEvent(event, sdkProcessingMetadata) {
  event.sdkProcessingMetadata = {
    ...event.sdkProcessingMetadata,
    ...sdkProcessingMetadata,
  };
}

function applySpanToEvent(event, span) {
  event.contexts = {
    trace: spanToTraceContext(span),
    ...event.contexts,
  };

  event.sdkProcessingMetadata = {
    dynamicSamplingContext: getDynamicSamplingContextFromSpan(span),
    ...event.sdkProcessingMetadata,
  };

  const rootSpan = getRootSpan(span);
  const transactionName = spanToJSON(rootSpan).description;
  if (transactionName && !event.transaction && event.type === 'transaction') {
    event.transaction = transactionName;
  }
}

/**
 * Applies fingerprint from the scope to the event if there's one,
 * uses message if there's one instead or get rid of empty fingerprint
 */
function applyFingerprintToEvent(event, fingerprint) {
  // Make sure it's an array first and we actually have something in place
  event.fingerprint = event.fingerprint ? arrayify$1(event.fingerprint) : [];

  // If we have something on the scope, then merge it with event
  if (fingerprint) {
    event.fingerprint = event.fingerprint.concat(fingerprint);
  }

  // If we have no data at all, remove empty array default
  if (event.fingerprint && !event.fingerprint.length) {
    delete event.fingerprint;
  }
}

/**
 * This type makes sure that we get either a CaptureContext, OR an EventHint.
 * It does not allow mixing them, which could lead to unexpected outcomes, e.g. this is disallowed:
 * { user: { id: '123' }, mechanism: { handled: false } }
 */

/**
 * Adds common information to events.
 *
 * The information includes release and environment from `options`,
 * breadcrumbs and context (extra, tags and user) from the scope.
 *
 * Information that is already present in the event is never overwritten. For
 * nested objects, such as the context, keys are merged.
 *
 * @param event The original event.
 * @param hint May contain additional information about the original exception.
 * @param scope A scope containing event metadata.
 * @returns A new event with more information.
 * @hidden
 */
function prepareEvent(
  options,
  event,
  hint,
  scope,
  client,
  isolationScope,
) {
  const { normalizeDepth = 3, normalizeMaxBreadth = 1000 } = options;
  const prepared = {
    ...event,
    event_id: event.event_id || hint.event_id || uuid4(),
    timestamp: event.timestamp || dateTimestampInSeconds(),
  };
  const integrations = hint.integrations || options.integrations.map(i => i.name);

  applyClientOptions(prepared, options);
  applyIntegrationsMetadata(prepared, integrations);

  if (client) {
    client.emit('applyFrameMetadata', event);
  }

  // Only put debug IDs onto frames for error events.
  if (event.type === undefined) {
    applyDebugIds(prepared, options.stackParser);
  }

  // If we have scope given to us, use it as the base for further modifications.
  // This allows us to prevent unnecessary copying of data if `captureContext` is not provided.
  const finalScope = getFinalScope(scope, hint.captureContext);

  if (hint.mechanism) {
    addExceptionMechanism(prepared, hint.mechanism);
  }

  const clientEventProcessors = client ? client.getEventProcessors() : [];

  // This should be the last thing called, since we want that
  // {@link Scope.addEventProcessor} gets the finished prepared event.
  // Merge scope data together
  const data = getGlobalScope().getScopeData();

  if (isolationScope) {
    const isolationData = isolationScope.getScopeData();
    mergeScopeData(data, isolationData);
  }

  if (finalScope) {
    const finalScopeData = finalScope.getScopeData();
    mergeScopeData(data, finalScopeData);
  }

  const attachments = [...(hint.attachments || []), ...data.attachments];
  if (attachments.length) {
    hint.attachments = attachments;
  }

  applyScopeDataToEvent(prepared, data);

  const eventProcessors = [
    ...clientEventProcessors,
    // Run scope event processors _after_ all other processors
    ...data.eventProcessors,
  ];

  const result = notifyEventProcessors(eventProcessors, prepared, hint);

  return result.then(evt => {
    if (evt) {
      // We apply the debug_meta field only after all event processors have ran, so that if any event processors modified
      // file names (e.g.the RewriteFrames integration) the filename -> debug ID relationship isn't destroyed.
      // This should not cause any PII issues, since we're only moving data that is already on the event and not adding
      // any new data
      applyDebugMeta(evt);
    }

    if (typeof normalizeDepth === 'number' && normalizeDepth > 0) {
      return normalizeEvent(evt, normalizeDepth, normalizeMaxBreadth);
    }
    return evt;
  });
}

/**
 *  Enhances event using the client configuration.
 *  It takes care of all "static" values like environment, release and `dist`,
 *  as well as truncating overly long values.
 * @param event event instance to be enhanced
 */
function applyClientOptions(event, options) {
  const { environment, release, dist, maxValueLength = 250 } = options;

  if (!('environment' in event)) {
    event.environment = 'environment' in options ? environment : DEFAULT_ENVIRONMENT;
  }

  if (event.release === undefined && release !== undefined) {
    event.release = release;
  }

  if (event.dist === undefined && dist !== undefined) {
    event.dist = dist;
  }

  if (event.message) {
    event.message = truncate(event.message, maxValueLength);
  }

  const exception = event.exception && event.exception.values && event.exception.values[0];
  if (exception && exception.value) {
    exception.value = truncate(exception.value, maxValueLength);
  }

  const request = event.request;
  if (request && request.url) {
    request.url = truncate(request.url, maxValueLength);
  }
}

const debugIdStackParserCache = new WeakMap();

/**
 * Puts debug IDs into the stack frames of an error event.
 */
function applyDebugIds(event, stackParser) {
  const debugIdMap = GLOBAL_OBJ._sentryDebugIds;

  if (!debugIdMap) {
    return;
  }

  let debugIdStackFramesCache;
  const cachedDebugIdStackFrameCache = debugIdStackParserCache.get(stackParser);
  if (cachedDebugIdStackFrameCache) {
    debugIdStackFramesCache = cachedDebugIdStackFrameCache;
  } else {
    debugIdStackFramesCache = new Map();
    debugIdStackParserCache.set(stackParser, debugIdStackFramesCache);
  }

  // Build a map of filename -> debug_id
  const filenameDebugIdMap = Object.entries(debugIdMap).reduce(
    (acc, [debugIdStackTrace, debugIdValue]) => {
      let parsedStack;
      const cachedParsedStack = debugIdStackFramesCache.get(debugIdStackTrace);
      if (cachedParsedStack) {
        parsedStack = cachedParsedStack;
      } else {
        parsedStack = stackParser(debugIdStackTrace);
        debugIdStackFramesCache.set(debugIdStackTrace, parsedStack);
      }

      for (let i = parsedStack.length - 1; i >= 0; i--) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const stackFrame = parsedStack[i];
        if (stackFrame.filename) {
          acc[stackFrame.filename] = debugIdValue;
          break;
        }
      }
      return acc;
    },
    {},
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    event.exception.values.forEach(exception => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      exception.stacktrace.frames.forEach(frame => {
        if (frame.filename) {
          frame.debug_id = filenameDebugIdMap[frame.filename];
        }
      });
    });
  } catch (e) {
    // To save bundle size we're just try catching here instead of checking for the existence of all the different objects.
  }
}

/**
 * Moves debug IDs from the stack frames of an error event into the debug_meta field.
 */
function applyDebugMeta(event) {
  // Extract debug IDs and filenames from the stack frames on the event.
  const filenameDebugIdMap = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    event.exception.values.forEach(exception => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      exception.stacktrace.frames.forEach(frame => {
        if (frame.debug_id) {
          if (frame.abs_path) {
            filenameDebugIdMap[frame.abs_path] = frame.debug_id;
          } else if (frame.filename) {
            filenameDebugIdMap[frame.filename] = frame.debug_id;
          }
          delete frame.debug_id;
        }
      });
    });
  } catch (e) {
    // To save bundle size we're just try catching here instead of checking for the existence of all the different objects.
  }

  if (Object.keys(filenameDebugIdMap).length === 0) {
    return;
  }

  // Fill debug_meta information
  event.debug_meta = event.debug_meta || {};
  event.debug_meta.images = event.debug_meta.images || [];
  const images = event.debug_meta.images;
  Object.entries(filenameDebugIdMap).forEach(([filename, debug_id]) => {
    images.push({
      type: 'sourcemap',
      code_file: filename,
      debug_id,
    });
  });
}

/**
 * This function adds all used integrations to the SDK info in the event.
 * @param event The event that will be filled with all integrations.
 */
function applyIntegrationsMetadata(event, integrationNames) {
  if (integrationNames.length > 0) {
    event.sdk = event.sdk || {};
    event.sdk.integrations = [...(event.sdk.integrations || []), ...integrationNames];
  }
}

/**
 * Applies `normalize` function on necessary `Event` attributes to make them safe for serialization.
 * Normalized keys:
 * - `breadcrumbs.data`
 * - `user`
 * - `contexts`
 * - `extra`
 * @param event Event
 * @returns Normalized event
 */
function normalizeEvent(event, depth, maxBreadth) {
  if (!event) {
    return null;
  }

  const normalized = {
    ...event,
    ...(event.breadcrumbs && {
      breadcrumbs: event.breadcrumbs.map(b => ({
        ...b,
        ...(b.data && {
          data: normalize(b.data, depth, maxBreadth),
        }),
      })),
    }),
    ...(event.user && {
      user: normalize(event.user, depth, maxBreadth),
    }),
    ...(event.contexts && {
      contexts: normalize(event.contexts, depth, maxBreadth),
    }),
    ...(event.extra && {
      extra: normalize(event.extra, depth, maxBreadth),
    }),
  };

  // event.contexts.trace stores information about a Transaction. Similarly,
  // event.spans[] stores information about child Spans. Given that a
  // Transaction is conceptually a Span, normalization should apply to both
  // Transactions and Spans consistently.
  // For now the decision is to skip normalization of Transactions and Spans,
  // so this block overwrites the normalized event to add back the original
  // Transaction information prior to normalization.
  if (event.contexts && event.contexts.trace && normalized.contexts) {
    normalized.contexts.trace = event.contexts.trace;

    // event.contexts.trace.data may contain circular/dangerous data so we need to normalize it
    if (event.contexts.trace.data) {
      normalized.contexts.trace.data = normalize(event.contexts.trace.data, depth, maxBreadth);
    }
  }

  // event.spans[].data may contain circular/dangerous data so we need to normalize it
  if (event.spans) {
    normalized.spans = event.spans.map(span => {
      return {
        ...span,
        ...(span.data && {
          data: normalize(span.data, depth, maxBreadth),
        }),
      };
    });
  }

  return normalized;
}

function getFinalScope(
  scope,
  captureContext,
) {
  if (!captureContext) {
    return scope;
  }

  const finalScope = scope ? scope.clone() : new Scope();
  finalScope.update(captureContext);
  return finalScope;
}

/**
 * @inheritdoc
 */
class SessionFlusher  {

  // Cast to any so that it can use Node.js timeout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

   constructor(client, attrs) {
    this._client = client;
    this.flushTimeout = 60;
    this._pendingAggregates = new Map();
    this._isEnabled = true;

    // Call to setInterval, so that flush is called every 60 seconds.
    this._intervalId = setInterval(() => this.flush(), this.flushTimeout * 1000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (this._intervalId.unref) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this._intervalId.unref();
    }
    this._sessionAttrs = attrs;
  }

  /** Checks if `pendingAggregates` has entries, and if it does flushes them by calling `sendSession` */
   flush() {
    const sessionAggregates = this.getSessionAggregates();
    if (sessionAggregates.aggregates.length === 0) {
      return;
    }
    this._pendingAggregates = new Map();
    this._client.sendSession(sessionAggregates);
  }

  /** Massages the entries in `pendingAggregates` and returns aggregated sessions */
   getSessionAggregates() {
    const aggregates = Array.from(this._pendingAggregates.values());

    const sessionAggregates = {
      attrs: this._sessionAttrs,
      aggregates,
    };
    return dropUndefinedKeys(sessionAggregates);
  }

  /** JSDoc */
   close() {
    clearInterval(this._intervalId);
    this._isEnabled = false;
    this.flush();
  }

  /**
   * Wrapper function for _incrementSessionStatusCount that checks if the instance of SessionFlusher is enabled then
   * fetches the session status of the request from `Scope.getRequestSession().status` on the scope and passes them to
   * `_incrementSessionStatusCount` along with the start date
   */
   incrementSessionStatusCount() {
    if (!this._isEnabled) {
      return;
    }
    const isolationScope = getIsolationScope();
    const requestSession = isolationScope.getRequestSession();

    if (requestSession && requestSession.status) {
      this._incrementSessionStatusCount(requestSession.status, new Date());
      // This is not entirely necessarily but is added as a safe guard to indicate the bounds of a request and so in
      // case captureRequestSession is called more than once to prevent double count
      isolationScope.setRequestSession(undefined);
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    }
  }

  /**
   * Increments status bucket in pendingAggregates buffer (internal state) corresponding to status of
   * the session received
   */
   _incrementSessionStatusCount(status, date) {
    // Truncate minutes and seconds on Session Started attribute to have one minute bucket keys
    const sessionStartedTrunc = new Date(date).setSeconds(0, 0);

    // corresponds to aggregated sessions in one specific minute bucket
    // for example, {"started":"2021-03-16T08:00:00.000Z","exited":4, "errored": 1}
    let aggregationCounts = this._pendingAggregates.get(sessionStartedTrunc);
    if (!aggregationCounts) {
      aggregationCounts = { started: new Date(sessionStartedTrunc).toISOString() };
      this._pendingAggregates.set(sessionStartedTrunc, aggregationCounts);
    }

    switch (status) {
      case 'errored':
        aggregationCounts.errored = (aggregationCounts.errored || 0) + 1;
        return aggregationCounts.errored;
      case 'ok':
        aggregationCounts.exited = (aggregationCounts.exited || 0) + 1;
        return aggregationCounts.exited;
      default:
        aggregationCounts.crashed = (aggregationCounts.crashed || 0) + 1;
        return aggregationCounts.crashed;
    }
  }
}

const SENTRY_API_VERSION = '7';

/** Returns the prefix to construct Sentry ingestion API endpoints. */
function getBaseApiEndpoint(dsn) {
  const protocol = dsn.protocol ? `${dsn.protocol}:` : '';
  const port = dsn.port ? `:${dsn.port}` : '';
  return `${protocol}//${dsn.host}${port}${dsn.path ? `/${dsn.path}` : ''}/api/`;
}

/** Returns the ingest API endpoint for target. */
function _getIngestEndpoint(dsn) {
  return `${getBaseApiEndpoint(dsn)}${dsn.projectId}/envelope/`;
}

/** Returns a URL-encoded string with auth config suitable for a query string. */
function _encodedAuth(dsn, sdkInfo) {
  return urlEncode({
    // We send only the minimum set of required information. See
    // https://github.com/getsentry/sentry-javascript/issues/2572.
    sentry_key: dsn.publicKey,
    sentry_version: SENTRY_API_VERSION,
    ...(sdkInfo && { sentry_client: `${sdkInfo.name}/${sdkInfo.version}` }),
  });
}

/**
 * Returns the envelope endpoint URL with auth in the query string.
 *
 * Sending auth as part of the query string and not as custom HTTP headers avoids CORS preflight requests.
 */
function getEnvelopeEndpointWithUrlEncodedAuth(dsn, tunnel, sdkInfo) {
  return tunnel ? tunnel : `${_getIngestEndpoint(dsn)}?${_encodedAuth(dsn, sdkInfo)}`;
}

const installedIntegrations = [];

/**
 * Given a list of integration instances this installs them all. When `withDefaults` is set to `true` then all default
 * integrations are added unless they were already provided before.
 * @param integrations array of integration instances
 * @param withDefault should enable default integrations
 */
function setupIntegrations(client, integrations) {
  const integrationIndex = {};

  integrations.forEach(integration => {
    // guard against empty provided integrations
    if (integration) {
      setupIntegration(client, integration, integrationIndex);
    }
  });

  return integrationIndex;
}

/**
 * Execute the `afterAllSetup` hooks of the given integrations.
 */
function afterSetupIntegrations(client, integrations) {
  for (const integration of integrations) {
    // guard against empty provided integrations
    if (integration && integration.afterAllSetup) {
      integration.afterAllSetup(client);
    }
  }
}

/** Setup a single integration.  */
function setupIntegration(client, integration, integrationIndex) {
  if (integrationIndex[integration.name]) {
    DEBUG_BUILD && logger.log(`Integration skipped because it was already installed: ${integration.name}`);
    return;
  }
  integrationIndex[integration.name] = integration;

  // `setupOnce` is only called the first time
  if (installedIntegrations.indexOf(integration.name) === -1 && typeof integration.setupOnce === 'function') {
    integration.setupOnce();
    installedIntegrations.push(integration.name);
  }

  // `setup` is run for each client
  if (integration.setup && typeof integration.setup === 'function') {
    integration.setup(client);
  }

  if (typeof integration.preprocessEvent === 'function') {
    const callback = integration.preprocessEvent.bind(integration) ;
    client.on('preprocessEvent', (event, hint) => callback(event, hint, client));
  }

  if (typeof integration.processEvent === 'function') {
    const callback = integration.processEvent.bind(integration) ;

    const processor = Object.assign((event, hint) => callback(event, hint, client), {
      id: integration.name,
    });

    client.addEventProcessor(processor);
  }

  DEBUG_BUILD && logger.log(`Integration installed: ${integration.name}`);
}

const ALREADY_SEEN_ERROR = "Not capturing exception because it's already been captured.";

/**
 * Base implementation for all JavaScript SDK clients.
 *
 * Call the constructor with the corresponding options
 * specific to the client subclass. To access these options later, use
 * {@link Client.getOptions}.
 *
 * If a Dsn is specified in the options, it will be parsed and stored. Use
 * {@link Client.getDsn} to retrieve the Dsn at any moment. In case the Dsn is
 * invalid, the constructor will throw a {@link SentryException}. Note that
 * without a valid Dsn, the SDK will not send any events to Sentry.
 *
 * Before sending an event, it is passed through
 * {@link BaseClient._prepareEvent} to add SDK information and scope data
 * (breadcrumbs and context). To add more custom information, override this
 * method and extend the resulting prepared event.
 *
 * To issue automatically created events (e.g. via instrumentation), use
 * {@link Client.captureEvent}. It will prepare the event and pass it through
 * the callback lifecycle. To issue auto-breadcrumbs, use
 * {@link Client.addBreadcrumb}.
 *
 * @example
 * class NodeClient extends BaseClient<NodeOptions> {
 *   public constructor(options: NodeOptions) {
 *     super(options);
 *   }
 *
 *   // ...
 * }
 */
class BaseClient {
  /** Options passed to the SDK. */

  /** The client Dsn, if specified in options. Without this Dsn, the SDK will be disabled. */

  /** Array of set up integrations. */

  /** Number of calls being processed */

  /** Holds flushable  */

  // eslint-disable-next-line @typescript-eslint/ban-types

  /**
   * Initializes this client instance.
   *
   * @param options Options for the client.
   */
   constructor(options) {
    this._options = options;
    this._integrations = {};
    this._numProcessing = 0;
    this._outcomes = {};
    this._hooks = {};
    this._eventProcessors = [];

    if (options.dsn) {
      this._dsn = makeDsn(options.dsn);
    } else {
      DEBUG_BUILD && logger.warn('No DSN provided, client will not send events.');
    }

    if (this._dsn) {
      const url = getEnvelopeEndpointWithUrlEncodedAuth(
        this._dsn,
        options.tunnel,
        options._metadata ? options._metadata.sdk : undefined,
      );
      this._transport = options.transport({
        tunnel: this._options.tunnel,
        recordDroppedEvent: this.recordDroppedEvent.bind(this),
        ...options.transportOptions,
        url,
      });
    }
  }

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
   captureException(exception, hint, scope) {
    const eventId = uuid4();

    // ensure we haven't captured this very object before
    if (checkOrSetAlreadyCaught(exception)) {
      DEBUG_BUILD && logger.log(ALREADY_SEEN_ERROR);
      return eventId;
    }

    const hintWithEventId = {
      event_id: eventId,
      ...hint,
    };

    this._process(
      this.eventFromException(exception, hintWithEventId).then(event =>
        this._captureEvent(event, hintWithEventId, scope),
      ),
    );

    return hintWithEventId.event_id;
  }

  /**
   * @inheritDoc
   */
   captureMessage(
    message,
    level,
    hint,
    currentScope,
  ) {
    const hintWithEventId = {
      event_id: uuid4(),
      ...hint,
    };

    const eventMessage = isParameterizedString(message) ? message : String(message);

    const promisedEvent = isPrimitive(message)
      ? this.eventFromMessage(eventMessage, level, hintWithEventId)
      : this.eventFromException(message, hintWithEventId);

    this._process(promisedEvent.then(event => this._captureEvent(event, hintWithEventId, currentScope)));

    return hintWithEventId.event_id;
  }

  /**
   * @inheritDoc
   */
   captureEvent(event, hint, currentScope) {
    const eventId = uuid4();

    // ensure we haven't captured this very object before
    if (hint && hint.originalException && checkOrSetAlreadyCaught(hint.originalException)) {
      DEBUG_BUILD && logger.log(ALREADY_SEEN_ERROR);
      return eventId;
    }

    const hintWithEventId = {
      event_id: eventId,
      ...hint,
    };

    const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
    const capturedSpanScope = sdkProcessingMetadata.capturedSpanScope;

    this._process(this._captureEvent(event, hintWithEventId, capturedSpanScope || currentScope));

    return hintWithEventId.event_id;
  }

  /**
   * @inheritDoc
   */
   captureSession(session) {
    if (!(typeof session.release === 'string')) {
      DEBUG_BUILD && logger.warn('Discarded session because of missing or non-string release');
    } else {
      this.sendSession(session);
      // After sending, we set init false to indicate it's not the first occurrence
      updateSession(session, { init: false });
    }
  }

  /**
   * @inheritDoc
   */
   getDsn() {
    return this._dsn;
  }

  /**
   * @inheritDoc
   */
   getOptions() {
    return this._options;
  }

  /**
   * @see SdkMetadata in @sentry/types
   *
   * @return The metadata of the SDK
   */
   getSdkMetadata() {
    return this._options._metadata;
  }

  /**
   * @inheritDoc
   */
   getTransport() {
    return this._transport;
  }

  /**
   * @inheritDoc
   */
   flush(timeout) {
    const transport = this._transport;
    if (transport) {
      this.emit('flush');
      return this._isClientDoneProcessing(timeout).then(clientFinished => {
        return transport.flush(timeout).then(transportFlushed => clientFinished && transportFlushed);
      });
    } else {
      return resolvedSyncPromise(true);
    }
  }

  /**
   * @inheritDoc
   */
   close(timeout) {
    return this.flush(timeout).then(result => {
      this.getOptions().enabled = false;
      this.emit('close');
      return result;
    });
  }

  /** Get all installed event processors. */
   getEventProcessors() {
    return this._eventProcessors;
  }

  /** @inheritDoc */
   addEventProcessor(eventProcessor) {
    this._eventProcessors.push(eventProcessor);
  }

  /** @inheritdoc */
   init() {
    if (
      this._isEnabled() ||
      // Force integrations to be setup even if no DSN was set when we have
      // Spotlight enabled. This is particularly important for browser as we
      // don't support the `spotlight` option there and rely on the users
      // adding the `spotlightBrowserIntegration()` to their integrations which
      // wouldn't get initialized with the check below when there's no DSN set.
      this._options.integrations.some(({ name }) => name.startsWith('Spotlight'))
    ) {
      this._setupIntegrations();
    }
  }

  /**
   * Gets an installed integration by its name.
   *
   * @returns The installed integration or `undefined` if no integration with that `name` was installed.
   */
   getIntegrationByName(integrationName) {
    return this._integrations[integrationName] ;
  }

  /**
   * @inheritDoc
   */
   addIntegration(integration) {
    const isAlreadyInstalled = this._integrations[integration.name];

    // This hook takes care of only installing if not already installed
    setupIntegration(this, integration, this._integrations);
    // Here we need to check manually to make sure to not run this multiple times
    if (!isAlreadyInstalled) {
      afterSetupIntegrations(this, [integration]);
    }
  }

  /**
   * @inheritDoc
   */
   sendEvent(event, hint = {}) {
    this.emit('beforeSendEvent', event, hint);

    let env = createEventEnvelope(event, this._dsn, this._options._metadata, this._options.tunnel);

    for (const attachment of hint.attachments || []) {
      env = addItemToEnvelope(env, createAttachmentEnvelopeItem(attachment));
    }

    const promise = this.sendEnvelope(env);
    if (promise) {
      promise.then(sendResponse => this.emit('afterSendEvent', event, sendResponse), null);
    }
  }

  /**
   * @inheritDoc
   */
   sendSession(session) {
    const env = createSessionEnvelope(session, this._dsn, this._options._metadata, this._options.tunnel);

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendEnvelope(env);
  }

  /**
   * @inheritDoc
   */
   recordDroppedEvent(reason, category, eventOrCount) {
    if (this._options.sendClientReports) {
      // TODO v9: We do not need the `event` passed as third argument anymore, and can possibly remove this overload
      // If event is passed as third argument, we assume this is a count of 1
      const count = typeof eventOrCount === 'number' ? eventOrCount : 1;

      // We want to track each category (error, transaction, session, replay_event) separately
      // but still keep the distinction between different type of outcomes.
      // We could use nested maps, but it's much easier to read and type this way.
      // A correct type for map-based implementation if we want to go that route
      // would be `Partial<Record<SentryRequestType, Partial<Record<Outcome, number>>>>`
      // With typescript 4.1 we could even use template literal types
      const key = `${reason}:${category}`;
      DEBUG_BUILD && logger.log(`Recording outcome: "${key}"${count > 1 ? ` (${count} times)` : ''}`);
      this._outcomes[key] = (this._outcomes[key] || 0) + count;
    }
  }

  // Keep on() & emit() signatures in sync with types' client.ts interface
  /* eslint-disable @typescript-eslint/unified-signatures */

  /** @inheritdoc */

  /** @inheritdoc */
   on(hook, callback) {
    const hooks = (this._hooks[hook] = this._hooks[hook] || []);

    // @ts-expect-error We assue the types are correct
    hooks.push(callback);

    // This function returns a callback execution handler that, when invoked,
    // deregisters a callback. This is crucial for managing instances where callbacks
    // need to be unregistered to prevent self-referencing in callback closures,
    // ensuring proper garbage collection.
    return () => {
      // @ts-expect-error We assue the types are correct
      const cbIndex = hooks.indexOf(callback);
      if (cbIndex > -1) {
        hooks.splice(cbIndex, 1);
      }
    };
  }

  /** @inheritdoc */

  /** @inheritdoc */
   emit(hook, ...rest) {
    const callbacks = this._hooks[hook];
    if (callbacks) {
      callbacks.forEach(callback => callback(...rest));
    }
  }

  /**
   * @inheritdoc
   */
   sendEnvelope(envelope) {
    this.emit('beforeEnvelope', envelope);

    if (this._isEnabled() && this._transport) {
      return this._transport.send(envelope).then(null, reason => {
        DEBUG_BUILD && logger.error('Error while sending event:', reason);
        return reason;
      });
    }

    DEBUG_BUILD && logger.error('Transport disabled');

    return resolvedSyncPromise({});
  }

  /* eslint-enable @typescript-eslint/unified-signatures */

  /** Setup integrations for this client. */
   _setupIntegrations() {
    const { integrations } = this._options;
    this._integrations = setupIntegrations(this, integrations);
    afterSetupIntegrations(this, integrations);
  }

  /** Updates existing session based on the provided event */
   _updateSessionFromEvent(session, event) {
    let crashed = false;
    let errored = false;
    const exceptions = event.exception && event.exception.values;

    if (exceptions) {
      errored = true;

      for (const ex of exceptions) {
        const mechanism = ex.mechanism;
        if (mechanism && mechanism.handled === false) {
          crashed = true;
          break;
        }
      }
    }

    // A session is updated and that session update is sent in only one of the two following scenarios:
    // 1. Session with non terminal status and 0 errors + an error occurred -> Will set error count to 1 and send update
    // 2. Session with non terminal status and 1 error + a crash occurred -> Will set status crashed and send update
    const sessionNonTerminal = session.status === 'ok';
    const shouldUpdateAndSend = (sessionNonTerminal && session.errors === 0) || (sessionNonTerminal && crashed);

    if (shouldUpdateAndSend) {
      updateSession(session, {
        ...(crashed && { status: 'crashed' }),
        errors: session.errors || Number(errored || crashed),
      });
      this.captureSession(session);
    }
  }

  /**
   * Determine if the client is finished processing. Returns a promise because it will wait `timeout` ms before saying
   * "no" (resolving to `false`) in order to give the client a chance to potentially finish first.
   *
   * @param timeout The time, in ms, after which to resolve to `false` if the client is still busy. Passing `0` (or not
   * passing anything) will make the promise wait as long as it takes for processing to finish before resolving to
   * `true`.
   * @returns A promise which will resolve to `true` if processing is already done or finishes before the timeout, and
   * `false` otherwise
   */
   _isClientDoneProcessing(timeout) {
    return new SyncPromise(resolve => {
      let ticked = 0;
      const tick = 1;

      const interval = setInterval(() => {
        if (this._numProcessing == 0) {
          clearInterval(interval);
          resolve(true);
        } else {
          ticked += tick;
          if (timeout && ticked >= timeout) {
            clearInterval(interval);
            resolve(false);
          }
        }
      }, tick);
    });
  }

  /** Determines whether this SDK is enabled and a transport is present. */
   _isEnabled() {
    return this.getOptions().enabled !== false && this._transport !== undefined;
  }

  /**
   * Adds common information to events.
   *
   * The information includes release and environment from `options`,
   * breadcrumbs and context (extra, tags and user) from the scope.
   *
   * Information that is already present in the event is never overwritten. For
   * nested objects, such as the context, keys are merged.
   *
   * @param event The original event.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A new event with more information.
   */
   _prepareEvent(
    event,
    hint,
    currentScope,
    isolationScope = getIsolationScope(),
  ) {
    const options = this.getOptions();
    const integrations = Object.keys(this._integrations);
    if (!hint.integrations && integrations.length > 0) {
      hint.integrations = integrations;
    }

    this.emit('preprocessEvent', event, hint);

    if (!event.type) {
      isolationScope.setLastEventId(event.event_id || hint.event_id);
    }

    return prepareEvent(options, event, hint, currentScope, this, isolationScope).then(evt => {
      if (evt === null) {
        return evt;
      }

      const propagationContext = {
        ...isolationScope.getPropagationContext(),
        ...(currentScope ? currentScope.getPropagationContext() : undefined),
      };

      const trace = evt.contexts && evt.contexts.trace;
      if (!trace && propagationContext) {
        const { traceId: trace_id, spanId, parentSpanId, dsc } = propagationContext;
        evt.contexts = {
          trace: dropUndefinedKeys({
            trace_id,
            span_id: spanId,
            parent_span_id: parentSpanId,
          }),
          ...evt.contexts,
        };

        const dynamicSamplingContext = dsc ? dsc : getDynamicSamplingContextFromClient(trace_id, this);

        evt.sdkProcessingMetadata = {
          dynamicSamplingContext,
          ...evt.sdkProcessingMetadata,
        };
      }
      return evt;
    });
  }

  /**
   * Processes the event and logs an error in case of rejection
   * @param event
   * @param hint
   * @param scope
   */
   _captureEvent(event, hint = {}, scope) {
    return this._processEvent(event, hint, scope).then(
      finalEvent => {
        return finalEvent.event_id;
      },
      reason => {
        if (DEBUG_BUILD) {
          // If something's gone wrong, log the error as a warning. If it's just us having used a `SentryError` for
          // control flow, log just the message (no stack) as a log-level log.
          const sentryError = reason ;
          if (sentryError.logLevel === 'log') {
            logger.log(sentryError.message);
          } else {
            logger.warn(sentryError);
          }
        }
        return undefined;
      },
    );
  }

  /**
   * Processes an event (either error or message) and sends it to Sentry.
   *
   * This also adds breadcrumbs and context information to the event. However,
   * platform specific meta data (such as the User's IP address) must be added
   * by the SDK implementor.
   *
   *
   * @param event The event to send to Sentry.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A SyncPromise that resolves with the event or rejects in case event was/will not be send.
   */
   _processEvent(event, hint, currentScope) {
    const options = this.getOptions();
    const { sampleRate } = options;

    const isTransaction = isTransactionEvent(event);
    const isError = isErrorEvent(event);
    const eventType = event.type || 'error';
    const beforeSendLabel = `before send for type \`${eventType}\``;

    // 1.0 === 100% events are sent
    // 0.0 === 0% events are sent
    // Sampling for transaction happens somewhere else
    const parsedSampleRate = typeof sampleRate === 'undefined' ? undefined : parseSampleRate(sampleRate);
    if (isError && typeof parsedSampleRate === 'number' && Math.random() > parsedSampleRate) {
      this.recordDroppedEvent('sample_rate', 'error', event);
      return rejectedSyncPromise(
        new SentryError(
          `Discarding event because it's not included in the random sample (sampling rate = ${sampleRate})`,
          'log',
        ),
      );
    }

    const dataCategory = eventType === 'replay_event' ? 'replay' : eventType;

    const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
    const capturedSpanIsolationScope = sdkProcessingMetadata.capturedSpanIsolationScope;

    return this._prepareEvent(event, hint, currentScope, capturedSpanIsolationScope)
      .then(prepared => {
        if (prepared === null) {
          this.recordDroppedEvent('event_processor', dataCategory, event);
          throw new SentryError('An event processor returned `null`, will not send event.', 'log');
        }

        const isInternalException = hint.data && (hint.data ).__sentry__ === true;
        if (isInternalException) {
          return prepared;
        }

        const result = processBeforeSend(this, options, prepared, hint);
        return _validateBeforeSendResult(result, beforeSendLabel);
      })
      .then(processedEvent => {
        if (processedEvent === null) {
          this.recordDroppedEvent('before_send', dataCategory, event);
          if (isTransaction) {
            const spans = event.spans || [];
            // the transaction itself counts as one span, plus all the child spans that are added
            const spanCount = 1 + spans.length;
            this.recordDroppedEvent('before_send', 'span', spanCount);
          }
          throw new SentryError(`${beforeSendLabel} returned \`null\`, will not send event.`, 'log');
        }

        const session = currentScope && currentScope.getSession();
        if (!isTransaction && session) {
          this._updateSessionFromEvent(session, processedEvent);
        }

        if (isTransaction) {
          const spanCountBefore =
            (processedEvent.sdkProcessingMetadata && processedEvent.sdkProcessingMetadata.spanCountBeforeProcessing) ||
            0;
          const spanCountAfter = processedEvent.spans ? processedEvent.spans.length : 0;

          const droppedSpanCount = spanCountBefore - spanCountAfter;
          if (droppedSpanCount > 0) {
            this.recordDroppedEvent('before_send', 'span', droppedSpanCount);
          }
        }

        // None of the Sentry built event processor will update transaction name,
        // so if the transaction name has been changed by an event processor, we know
        // it has to come from custom event processor added by a user
        const transactionInfo = processedEvent.transaction_info;
        if (isTransaction && transactionInfo && processedEvent.transaction !== event.transaction) {
          const source = 'custom';
          processedEvent.transaction_info = {
            ...transactionInfo,
            source,
          };
        }

        this.sendEvent(processedEvent, hint);
        return processedEvent;
      })
      .then(null, reason => {
        if (reason instanceof SentryError) {
          throw reason;
        }

        this.captureException(reason, {
          data: {
            __sentry__: true,
          },
          originalException: reason,
        });
        throw new SentryError(
          `Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.\nReason: ${reason}`,
        );
      });
  }

  /**
   * Occupies the client with processing and event
   */
   _process(promise) {
    this._numProcessing++;
    void promise.then(
      value => {
        this._numProcessing--;
        return value;
      },
      reason => {
        this._numProcessing--;
        return reason;
      },
    );
  }

  /**
   * Clears outcomes on this client and returns them.
   */
   _clearOutcomes() {
    const outcomes = this._outcomes;
    this._outcomes = {};
    return Object.entries(outcomes).map(([key, quantity]) => {
      const [reason, category] = key.split(':') ;
      return {
        reason,
        category,
        quantity,
      };
    });
  }

  /**
   * Sends client reports as an envelope.
   */
   _flushOutcomes() {
    DEBUG_BUILD && logger.log('Flushing outcomes...');

    const outcomes = this._clearOutcomes();

    if (outcomes.length === 0) {
      DEBUG_BUILD && logger.log('No outcomes to send');
      return;
    }

    // This is really the only place where we want to check for a DSN and only send outcomes then
    if (!this._dsn) {
      DEBUG_BUILD && logger.log('No dsn provided, will not send outcomes');
      return;
    }

    DEBUG_BUILD && logger.log('Sending outcomes:', outcomes);

    const envelope = createClientReportEnvelope(outcomes, this._options.tunnel && dsnToString(this._dsn));

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendEnvelope(envelope);
  }

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

}

/**
 * Verifies that return value of configured `beforeSend` or `beforeSendTransaction` is of expected type, and returns the value if so.
 */
function _validateBeforeSendResult(
  beforeSendResult,
  beforeSendLabel,
) {
  const invalidValueError = `${beforeSendLabel} must return \`null\` or a valid event.`;
  if (isThenable(beforeSendResult)) {
    return beforeSendResult.then(
      event => {
        if (!isPlainObject(event) && event !== null) {
          throw new SentryError(invalidValueError);
        }
        return event;
      },
      e => {
        throw new SentryError(`${beforeSendLabel} rejected with ${e}`);
      },
    );
  } else if (!isPlainObject(beforeSendResult) && beforeSendResult !== null) {
    throw new SentryError(invalidValueError);
  }
  return beforeSendResult;
}

/**
 * Process the matching `beforeSendXXX` callback.
 */
function processBeforeSend(
  client,
  options,
  event,
  hint,
) {
  const { beforeSend, beforeSendTransaction, beforeSendSpan } = options;

  if (isErrorEvent(event) && beforeSend) {
    return beforeSend(event, hint);
  }

  if (isTransactionEvent(event)) {
    if (event.spans && beforeSendSpan) {
      const processedSpans = [];
      for (const span of event.spans) {
        const processedSpan = beforeSendSpan(span);
        if (processedSpan) {
          processedSpans.push(processedSpan);
        } else {
          client.recordDroppedEvent('before_send', 'span');
        }
      }
      event.spans = processedSpans;
    }

    if (beforeSendTransaction) {
      if (event.spans) {
        // We store the # of spans before processing in SDK metadata,
        // so we can compare it afterwards to determine how many spans were dropped
        const spanCountBefore = event.spans.length;
        event.sdkProcessingMetadata = {
          ...event.sdkProcessingMetadata,
          spanCountBeforeProcessing: spanCountBefore,
        };
      }
      return beforeSendTransaction(event, hint);
    }
  }

  return event;
}

function isErrorEvent(event) {
  return event.type === undefined;
}

function isTransactionEvent(event) {
  return event.type === 'transaction';
}

/**
 * Create envelope from check in item.
 */
function createCheckInEnvelope(
  checkIn,
  dynamicSamplingContext,
  metadata,
  tunnel,
  dsn,
) {
  const headers = {
    sent_at: new Date().toISOString(),
  };

  if (metadata && metadata.sdk) {
    headers.sdk = {
      name: metadata.sdk.name,
      version: metadata.sdk.version,
    };
  }

  if (!!tunnel && !!dsn) {
    headers.dsn = dsnToString(dsn);
  }

  if (dynamicSamplingContext) {
    headers.trace = dropUndefinedKeys(dynamicSamplingContext) ;
  }

  const item = createCheckInEnvelopeItem(checkIn);
  return createEnvelope(headers, [item]);
}

function createCheckInEnvelopeItem(checkIn) {
  const checkInHeaders = {
    type: 'check_in',
  };
  return [checkInHeaders, checkIn];
}

/**
 * The Sentry Server Runtime Client SDK.
 */
class ServerRuntimeClient

 extends BaseClient {

  /**
   * Creates a new Edge SDK instance.
   * @param options Configuration options for this SDK.
   */
   constructor(options) {
    // Server clients always support tracing
    registerSpanErrorInstrumentation();

    super(options);
  }

  /**
   * @inheritDoc
   */
   eventFromException(exception, hint) {
    return resolvedSyncPromise(eventFromUnknownInput(this, this._options.stackParser, exception, hint));
  }

  /**
   * @inheritDoc
   */
   eventFromMessage(
    message,
    level = 'info',
    hint,
  ) {
    return resolvedSyncPromise(
      eventFromMessage(this._options.stackParser, message, level, hint, this._options.attachStacktrace),
    );
  }

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
   captureException(exception, hint, scope) {
    // Check if the flag `autoSessionTracking` is enabled, and if `_sessionFlusher` exists because it is initialised only
    // when the `requestHandler` middleware is used, and hence the expectation is to have SessionAggregates payload
    // sent to the Server only when the `requestHandler` middleware is used
    if (this._options.autoSessionTracking && this._sessionFlusher) {
      const requestSession = getIsolationScope().getRequestSession();

      // Necessary checks to ensure this is code block is executed only within a request
      // Should override the status only if `requestSession.status` is `Ok`, which is its initial stage
      if (requestSession && requestSession.status === 'ok') {
        requestSession.status = 'errored';
      }
    }

    return super.captureException(exception, hint, scope);
  }

  /**
   * @inheritDoc
   */
   captureEvent(event, hint, scope) {
    // Check if the flag `autoSessionTracking` is enabled, and if `_sessionFlusher` exists because it is initialised only
    // when the `requestHandler` middleware is used, and hence the expectation is to have SessionAggregates payload
    // sent to the Server only when the `requestHandler` middleware is used
    if (this._options.autoSessionTracking && this._sessionFlusher) {
      const eventType = event.type || 'exception';
      const isException =
        eventType === 'exception' && event.exception && event.exception.values && event.exception.values.length > 0;

      // If the event is of type Exception, then a request session should be captured
      if (isException) {
        const requestSession = getIsolationScope().getRequestSession();

        // Ensure that this is happening within the bounds of a request, and make sure not to override
        // Session Status if Errored / Crashed
        if (requestSession && requestSession.status === 'ok') {
          requestSession.status = 'errored';
        }
      }
    }

    return super.captureEvent(event, hint, scope);
  }

  /**
   *
   * @inheritdoc
   */
   close(timeout) {
    if (this._sessionFlusher) {
      this._sessionFlusher.close();
    }
    return super.close(timeout);
  }

  /** Method that initialises an instance of SessionFlusher on Client */
   initSessionFlusher() {
    const { release, environment } = this._options;
    if (!release) {
      DEBUG_BUILD && logger.warn('Cannot initialise an instance of SessionFlusher if no release is provided!');
    } else {
      this._sessionFlusher = new SessionFlusher(this, {
        release,
        environment,
      });
    }
  }

  /**
   * Create a cron monitor check in and send it to Sentry.
   *
   * @param checkIn An object that describes a check in.
   * @param upsertMonitorConfig An optional object that describes a monitor config. Use this if you want
   * to create a monitor automatically when sending a check in.
   */
   captureCheckIn(checkIn, monitorConfig, scope) {
    const id = 'checkInId' in checkIn && checkIn.checkInId ? checkIn.checkInId : uuid4();
    if (!this._isEnabled()) {
      DEBUG_BUILD && logger.warn('SDK not enabled, will not capture checkin.');
      return id;
    }

    const options = this.getOptions();
    const { release, environment, tunnel } = options;

    const serializedCheckIn = {
      check_in_id: id,
      monitor_slug: checkIn.monitorSlug,
      status: checkIn.status,
      release,
      environment,
    };

    if ('duration' in checkIn) {
      serializedCheckIn.duration = checkIn.duration;
    }

    if (monitorConfig) {
      serializedCheckIn.monitor_config = {
        schedule: monitorConfig.schedule,
        checkin_margin: monitorConfig.checkinMargin,
        max_runtime: monitorConfig.maxRuntime,
        timezone: monitorConfig.timezone,
        failure_issue_threshold: monitorConfig.failureIssueThreshold,
        recovery_threshold: monitorConfig.recoveryThreshold,
      };
    }

    const [dynamicSamplingContext, traceContext] = this._getTraceInfoFromScope(scope);
    if (traceContext) {
      serializedCheckIn.contexts = {
        trace: traceContext,
      };
    }

    const envelope = createCheckInEnvelope(
      serializedCheckIn,
      dynamicSamplingContext,
      this.getSdkMetadata(),
      tunnel,
      this.getDsn(),
    );

    DEBUG_BUILD && logger.info('Sending checkin:', checkIn.monitorSlug, checkIn.status);

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sendEnvelope(envelope);

    return id;
  }

  /**
   * Method responsible for capturing/ending a request session by calling `incrementSessionStatusCount` to increment
   * appropriate session aggregates bucket
   */
   _captureRequestSession() {
    if (!this._sessionFlusher) {
      DEBUG_BUILD && logger.warn('Discarded request mode session because autoSessionTracking option was disabled');
    } else {
      this._sessionFlusher.incrementSessionStatusCount();
    }
  }

  /**
   * @inheritDoc
   */
   _prepareEvent(
    event,
    hint,
    scope,
    isolationScope,
  ) {
    if (this._options.platform) {
      event.platform = event.platform || this._options.platform;
    }

    if (this._options.runtime) {
      event.contexts = {
        ...event.contexts,
        runtime: (event.contexts || {}).runtime || this._options.runtime,
      };
    }

    if (this._options.serverName) {
      event.server_name = event.server_name || this._options.serverName;
    }

    return super._prepareEvent(event, hint, scope, isolationScope);
  }

  /** Extract trace information from scope */
   _getTraceInfoFromScope(
    scope,
  ) {
    if (!scope) {
      return [undefined, undefined];
    }

    const span = _getSpanForScope(scope);
    if (span) {
      const rootSpan = getRootSpan(span);
      const samplingContext = getDynamicSamplingContextFromSpan(rootSpan);
      return [samplingContext, spanToTraceContext(rootSpan)];
    }

    const { traceId, spanId, parentSpanId, dsc } = scope.getPropagationContext();
    const traceContext = {
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: parentSpanId,
    };
    if (dsc) {
      return [dsc, traceContext];
    }

    return [getDynamicSamplingContextFromClient(traceId, this), traceContext];
  }
}

const DEFAULT_TRANSPORT_BUFFER_SIZE = 64;

/**
 * Creates an instance of a Sentry `Transport`
 *
 * @param options
 * @param makeRequest
 */
function createTransport(
  options,
  makeRequest,
  buffer = makePromiseBuffer(
    options.bufferSize || DEFAULT_TRANSPORT_BUFFER_SIZE,
  ),
) {
  let rateLimits = {};
  const flush = (timeout) => buffer.drain(timeout);

  function send(envelope) {
    const filteredEnvelopeItems = [];

    // Drop rate limited items from envelope
    forEachEnvelopeItem(envelope, (item, type) => {
      const dataCategory = envelopeItemTypeToDataCategory(type);
      if (isRateLimited(rateLimits, dataCategory)) {
        const event = getEventForEnvelopeItem(item, type);
        options.recordDroppedEvent('ratelimit_backoff', dataCategory, event);
      } else {
        filteredEnvelopeItems.push(item);
      }
    });

    // Skip sending if envelope is empty after filtering out rate limited events
    if (filteredEnvelopeItems.length === 0) {
      return resolvedSyncPromise({});
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredEnvelope = createEnvelope(envelope[0], filteredEnvelopeItems );

    // Creates client report for each item in an envelope
    const recordEnvelopeLoss = (reason) => {
      forEachEnvelopeItem(filteredEnvelope, (item, type) => {
        const event = getEventForEnvelopeItem(item, type);
        options.recordDroppedEvent(reason, envelopeItemTypeToDataCategory(type), event);
      });
    };

    const requestTask = () =>
      makeRequest({ body: serializeEnvelope(filteredEnvelope) }).then(
        response => {
          // We don't want to throw on NOK responses, but we want to at least log them
          if (response.statusCode !== undefined && (response.statusCode < 200 || response.statusCode >= 300)) {
            DEBUG_BUILD && logger.warn(`Sentry responded with status code ${response.statusCode} to sent event.`);
          }

          rateLimits = updateRateLimits(rateLimits, response);
          return response;
        },
        error => {
          recordEnvelopeLoss('network_error');
          throw error;
        },
      );

    return buffer.add(requestTask).then(
      result => result,
      error => {
        if (error instanceof SentryError) {
          DEBUG_BUILD && logger.error('Skipped sending event because buffer is full.');
          recordEnvelopeLoss('queue_overflow');
          return resolvedSyncPromise({});
        } else {
          throw error;
        }
      },
    );
  }

  return {
    send,
    flush,
  };
}

function getEventForEnvelopeItem(item, type) {
  if (type !== 'event' && type !== 'transaction') {
    return undefined;
  }

  return Array.isArray(item) ? (item )[1] : undefined;
}

/**
 * A builder for the SDK metadata in the options for the SDK initialization.
 *
 * Note: This function is identical to `buildMetadata` in Remix and NextJS and SvelteKit.
 * We don't extract it for bundle size reasons.
 * @see https://github.com/getsentry/sentry-javascript/pull/7404
 * @see https://github.com/getsentry/sentry-javascript/pull/4196
 *
 * If you make changes to this function consider updating the others as well.
 *
 * @param options SDK options object that gets mutated
 * @param names list of package names
 */
function applySdkMetadata(options, name, names = [name], source = 'npm') {
  const metadata = options._metadata || {};

  if (!metadata.sdk) {
    metadata.sdk = {
      name: `sentry.javascript.${name}`,
      packages: names.map(name => ({
        name: `${source}:@sentry/${name}`,
        version: SDK_VERSION,
      })),
      version: SDK_VERSION,
    };
  }

  options._metadata = metadata;
}

/**
 * Extracts trace propagation data from the current span or from the client's scope (via transaction or propagation
 * context) and serializes it to `sentry-trace` and `baggage` values to strings. These values can be used to propagate
 * a trace via our tracing Http headers or Html `<meta>` tags.
 *
 * This function also applies some validation to the generated sentry-trace and baggage values to ensure that
 * only valid strings are returned.
 *
 * @returns an object with the tracing data values. The object keys are the name of the tracing key to be used as header
 * or meta tag name.
 */
function getTraceData() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  if (acs.getTraceData) {
    return acs.getTraceData();
  }

  const client = getClient();
  const scope = getCurrentScope();
  const span = getActiveSpan();

  const { dsc, sampled, traceId } = scope.getPropagationContext();
  const rootSpan = span && getRootSpan(span);

  const sentryTrace = span ? spanToTraceHeader(span) : generateSentryTraceHeader(traceId, undefined, sampled);

  const dynamicSamplingContext = rootSpan
    ? getDynamicSamplingContextFromSpan(rootSpan)
    : dsc
      ? dsc
      : client
        ? getDynamicSamplingContextFromClient(traceId, client)
        : undefined;

  const baggage = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);

  const isValidSentryTraceHeader = TRACEPARENT_REGEXP.test(sentryTrace);
  if (!isValidSentryTraceHeader) {
    logger.warn('Invalid sentry-trace data. Cannot generate trace data');
    return {};
  }

  const validBaggage = isValidBaggageString(baggage);
  if (!validBaggage) {
    logger.warn('Invalid baggage data. Not returning "baggage" value');
  }

  return {
    'sentry-trace': sentryTrace,
    ...(validBaggage && { baggage }),
  };
}

/**
 * Tests string against baggage spec as defined in:
 *
 * - W3C Baggage grammar: https://www.w3.org/TR/baggage/#definition
 * - RFC7230 token definition: https://datatracker.ietf.org/doc/html/rfc7230#section-3.2.6
 *
 * exported for testing
 */
function isValidBaggageString(baggage) {
  if (!baggage || !baggage.length) {
    return false;
  }
  const keyRegex = "[-!#$%&'*+.^_`|~A-Za-z0-9]+";
  const valueRegex = '[!#-+-./0-9:<=>?@A-Z\\[\\]a-z{-}]+';
  const spaces = '\\s*';
  // eslint-disable-next-line @sentry-internal/sdk/no-regexp-constructor -- RegExp for readability, no user input
  const baggageRegex = new RegExp(
    `^${keyRegex}${spaces}=${spaces}${valueRegex}(${spaces},${spaces}${keyRegex}${spaces}=${spaces}${valueRegex})*$`,
  );
  return baggageRegex.test(baggage);
}

/**
 * Checks whether the given input is already an array, and if it isn't, wraps it in one.
 *
 * @param maybeArray Input to turn into an array, if necessary
 * @returns The input, if already an array, or an array with the input as the only element, if not
 */
function arrayify(maybeArray) {
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}
/**
 * Get the closes package.json from a given starting point upwards.
 * This handles a few edge cases:
 * * Check if a given file package.json appears to be an actual NPM package.json file
 * * Stop at the home dir, to avoid looking too deeply
 */
function getPackageJson() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
    cwd = _ref.cwd,
    stopAt = _ref.stopAt;
  return lookupPackageJson(cwd !== null && cwd !== void 0 ? cwd : process.cwd(), path__default["default"].normalize(stopAt !== null && stopAt !== void 0 ? stopAt : os__default["default"].homedir()));
}
function parseMajorVersion(version) {
  // if it has a `v` prefix, remove it
  if (version.startsWith("v")) {
    version = version.slice(1);
  }

  // First, try simple lookup of exact, ~ and ^ versions
  var regex = /^[\^~]?(\d+)(\.\d+)?(\.\d+)?(-.+)?/;
  var match = version.match(regex);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Try to parse e.g. 1.x
  var coerced = parseInt(version, 10);
  if (!Number.isNaN(coerced)) {
    return coerced;
  }

  // Match <= and >= ranges.
  var gteLteRegex = /^[<>]=\s*(\d+)(\.\d+)?(\.\d+)?(-.+)?/;
  var gteLteMatch = version.match(gteLteRegex);
  if (gteLteMatch) {
    return parseInt(gteLteMatch[1], 10);
  }

  // match < ranges
  var ltRegex = /^<\s*(\d+)(\.\d+)?(\.\d+)?(-.+)?/;
  var ltMatch = version.match(ltRegex);
  if (ltMatch) {
    // Two scenarios:
    // a) < 2.0.0 --> return 1
    // b) < 2.1.0 --> return 2

    var major = parseInt(ltMatch[1], 10);
    if (
    // minor version > 0
    typeof ltMatch[2] === "string" && parseInt(ltMatch[2].slice(1), 10) > 0 ||
    // patch version > 0
    typeof ltMatch[3] === "string" && parseInt(ltMatch[3].slice(1), 10) > 0) {
      return major;
    }
    return major - 1;
  }

  // match > ranges
  var gtRegex = /^>\s*(\d+)(\.\d+)?(\.\d+)?(-.+)?/;
  var gtMatch = version.match(gtRegex);
  if (gtMatch) {
    // We always return the version here, even though it _may_ be incorrect
    // E.g. if given > 2.0.0, it should be 2 if there exists any 2.x.x version, else 3
    // Since there is no way for us to know this, we're going to assume any kind of patch/feature release probably exists
    return parseInt(gtMatch[1], 10);
  }
  return undefined;
}

// This is an explicit list of packages where we want to include the (major) version number.
var PACKAGES_TO_INCLUDE_VERSION = ["react", "@angular/core", "vue", "ember-source", "svelte", "@sveltejs/kit", "webpack", "vite", "gatsby", "next", "remix", "rollup", "esbuild"];
function getDependencies(packageJson) {
  var _packageJson$devDepen, _packageJson$dependen;
  var dependencies = Object.assign({}, (_packageJson$devDepen = packageJson["devDependencies"]) !== null && _packageJson$devDepen !== void 0 ? _packageJson$devDepen : {}, (_packageJson$dependen = packageJson["dependencies"]) !== null && _packageJson$dependen !== void 0 ? _packageJson$dependen : {});
  var deps = Object.keys(dependencies).sort();
  var depsVersions = deps.reduce(function (depsVersions, depName) {
    if (PACKAGES_TO_INCLUDE_VERSION.includes(depName)) {
      var version = dependencies[depName];
      var majorVersion = parseMajorVersion(version);
      if (majorVersion) {
        depsVersions[depName] = majorVersion;
      }
    }
    return depsVersions;
  }, {});
  return {
    deps: deps,
    depsVersions: depsVersions
  };
}
function lookupPackageJson(cwd, stopAt) {
  var jsonPath = findUp__default["default"].sync(function (dirName) {
    // Stop if we reach this dir
    if (path__default["default"].normalize(dirName) === stopAt) {
      return findUp__default["default"].stop;
    }
    return findUp__default["default"].sync.exists(dirName + "/package.json") ? "package.json" : undefined;
  }, {
    cwd: cwd
  });
  if (!jsonPath) {
    return undefined;
  }
  try {
    var jsonStr = fs__default["default"].readFileSync(jsonPath, "utf8");
    var json = JSON.parse(jsonStr);

    // Ensure it is an actual package.json
    // This is very much not bulletproof, but should be good enough
    if ("name" in json || "private" in json) {
      return json;
    }
  } catch (error) {
    // Ignore and walk up
  }

  // Continue up the tree, if we find a fitting package.json
  var newCwd = path__default["default"].dirname(path__default["default"].resolve(jsonPath + "/.."));
  return lookupPackageJson(newCwd, stopAt);
}

/**
 * Deterministically hashes a string and turns the hash into a uuid.
 */
function stringToUUID(str) {
  var sha256Hash = crypto__default["default"].createHash("sha256").update(str).digest("hex");

  // Position 16 is fixed to either 8, 9, a, or b in the uuid v4 spec (10xx in binary)
  // RFC 4122 section 4.4
  var v4variant = ["8", "9", "a", "b"][sha256Hash.substring(16, 17).charCodeAt(0) % 4];
  return (sha256Hash.substring(0, 8) + "-" + sha256Hash.substring(8, 12) + "-4" + sha256Hash.substring(13, 16) + "-" + v4variant + sha256Hash.substring(17, 20) + "-" + sha256Hash.substring(20, 32)).toLowerCase();
}
function gitRevision() {
  var gitRevision;
  try {
    gitRevision = childProcess__default["default"].execSync("git rev-parse HEAD", {
      stdio: ["ignore", "pipe", "ignore"]
    }).toString().trim();
  } catch (e) {
    // noop
  }
  return gitRevision;
}

/**
 * Tries to guess a release name based on environmental data.
 */
function determineReleaseName() {
  // This list is in approximate alpha order, separated into 3 categories:
  // 1. Git providers
  // 2. CI providers with specific environment variables (has the provider name in the variable name)
  // 3. CI providers with generic environment variables (checked for last to prevent possible false positives)

  var possibleReleaseNameOfGitProvider =
  // GitHub Actions - https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables
  process.env["GITHUB_SHA"] ||
  // GitLab CI - https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
  process.env["CI_MERGE_REQUEST_SOURCE_BRANCH_SHA"] || process.env["CI_BUILD_REF"] || process.env["CI_COMMIT_SHA"] ||
  // Bitbucket - https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/
  process.env["BITBUCKET_COMMIT"];
  var possibleReleaseNameOfCiProvidersWithSpecificEnvVar =
  // AppVeyor - https://www.appveyor.com/docs/environment-variables/
  process.env["APPVEYOR_PULL_REQUEST_HEAD_COMMIT"] || process.env["APPVEYOR_REPO_COMMIT"] ||
  // AWS CodeBuild - https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html
  process.env["CODEBUILD_RESOLVED_SOURCE_VERSION"] ||
  // AWS Amplify - https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
  process.env["AWS_COMMIT_ID"] ||
  // Azure Pipelines - https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
  process.env["BUILD_SOURCEVERSION"] ||
  // Bitrise - https://devcenter.bitrise.io/builds/available-environment-variables/
  process.env["GIT_CLONE_COMMIT_HASH"] ||
  // Buddy CI - https://buddy.works/docs/pipelines/environment-variables#default-environment-variables
  process.env["BUDDY_EXECUTION_REVISION"] ||
  // Builtkite - https://buildkite.com/docs/pipelines/environment-variables
  process.env["BUILDKITE_COMMIT"] ||
  // CircleCI - https://circleci.com/docs/variables/
  process.env["CIRCLE_SHA1"] ||
  // Cirrus CI - https://cirrus-ci.org/guide/writing-tasks/#environment-variables
  process.env["CIRRUS_CHANGE_IN_REPO"] ||
  // Codefresh - https://codefresh.io/docs/docs/codefresh-yaml/variables/
  process.env["CF_REVISION"] ||
  // Codemagic - https://docs.codemagic.io/yaml-basic-configuration/environment-variables/
  process.env["CM_COMMIT"] ||
  // Cloudflare Pages - https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables
  process.env["CF_PAGES_COMMIT_SHA"] ||
  // Drone - https://docs.drone.io/pipeline/environment/reference/
  process.env["DRONE_COMMIT_SHA"] ||
  // Flightcontrol - https://www.flightcontrol.dev/docs/guides/flightcontrol/environment-variables#built-in-environment-variables
  process.env["FC_GIT_COMMIT_SHA"] ||
  // Heroku #1 https://devcenter.heroku.com/articles/heroku-ci
  process.env["HEROKU_TEST_RUN_COMMIT_VERSION"] ||
  // Heroku #2 https://docs.sentry.io/product/integrations/deployment/heroku/#configure-releases
  process.env["HEROKU_SLUG_COMMIT"] ||
  // Railway - https://docs.railway.app/reference/variables#git-variables
  process.env["RAILWAY_GIT_COMMIT_SHA"] ||
  // Render - https://render.com/docs/environment-variables
  process.env["RENDER_GIT_COMMIT"] ||
  // Semaphore CI - https://docs.semaphoreci.com/ci-cd-environment/environment-variables
  process.env["SEMAPHORE_GIT_SHA"] ||
  // TravisCI - https://docs.travis-ci.com/user/environment-variables/#default-environment-variables
  process.env["TRAVIS_PULL_REQUEST_SHA"] ||
  // Vercel - https://vercel.com/docs/v2/build-step#system-environment-variables
  process.env["VERCEL_GIT_COMMIT_SHA"] || process.env["VERCEL_GITHUB_COMMIT_SHA"] || process.env["VERCEL_GITLAB_COMMIT_SHA"] || process.env["VERCEL_BITBUCKET_COMMIT_SHA"] ||
  // Zeit (now known as Vercel)
  process.env["ZEIT_GITHUB_COMMIT_SHA"] || process.env["ZEIT_GITLAB_COMMIT_SHA"] || process.env["ZEIT_BITBUCKET_COMMIT_SHA"];
  var possibleReleaseNameOfCiProvidersWithGenericEnvVar =
  // CloudBees CodeShip - https://docs.cloudbees.com/docs/cloudbees-codeship/latest/pro-builds-and-configuration/environment-variables
  process.env["CI_COMMIT_ID"] ||
  // Coolify - https://coolify.io/docs/knowledge-base/environment-variables
  process.env["SOURCE_COMMIT"] ||
  // Heroku #3 https://devcenter.heroku.com/changelog-items/630
  process.env["SOURCE_VERSION"] ||
  // Jenkins - https://plugins.jenkins.io/git/#environment-variables
  process.env["GIT_COMMIT"] ||
  // Netlify - https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
  process.env["COMMIT_REF"] ||
  // TeamCity - https://www.jetbrains.com/help/teamcity/predefined-build-parameters.html
  process.env["BUILD_VCS_NUMBER"] ||
  // Woodpecker CI - https://woodpecker-ci.org/docs/usage/environment
  process.env["CI_COMMIT_SHA"];
  return possibleReleaseNameOfGitProvider || possibleReleaseNameOfCiProvidersWithSpecificEnvVar || possibleReleaseNameOfCiProvidersWithGenericEnvVar || gitRevision();
}

/**
 * Generates code for the global injector which is responsible for setting the global
 * `SENTRY_RELEASE` & `SENTRY_BUILD_INFO` variables.
 */
function generateGlobalInjectorCode(_ref2) {
  var release = _ref2.release,
    injectBuildInformation = _ref2.injectBuildInformation;
  // The code below is mostly ternary operators because it saves bundle size.
  // The checks are to support as many environments as possible. (Node.js, Browser, webworkers, etc.)
  var code = "!function(){try{var e=\"undefined\"!=typeof window?window:\"undefined\"!=typeof global?global:\"undefined\"!=typeof globalThis?globalThis:\"undefined\"!=typeof self?self:{};";
  code += "e.SENTRY_RELEASE={id:".concat(JSON.stringify(release), "};");
  if (injectBuildInformation) {
    var buildInfo = getBuildInformation();
    code += "e.SENTRY_BUILD_INFO=".concat(JSON.stringify(buildInfo), ";");
  }
  code += "}catch(e){}}();";
  return code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateModuleMetadataInjectorCode(metadata) {
  // The code below is mostly ternary operators because it saves bundle size.
  // The checks are to support as many environments as possible. (Node.js, Browser, webworkers, etc.)
  // We are merging the metadata objects in case modules are bundled twice with the plugin
  // Use try-catch to avoid issues when bundlers rename global variables like 'window' to 'k'
  return "!function(){try{var e=\"undefined\"!=typeof window?window:\"undefined\"!=typeof global?global:\"undefined\"!=typeof globalThis?globalThis:\"undefined\"!=typeof self?self:{};e._sentryModuleMetadata=e._sentryModuleMetadata||{},e._sentryModuleMetadata[(new e.Error).stack]=function(e){for(var n=1;n<arguments.length;n++){var a=arguments[n];if(null!=a)for(var t in a)a.hasOwnProperty(t)&&(e[t]=a[t])}return e}({},e._sentryModuleMetadata[(new e.Error).stack],".concat(JSON.stringify(metadata), ")}catch(e){}}();");
}
function getBuildInformation() {
  var packageJson = getPackageJson();
  var _ref3 = packageJson ? getDependencies(packageJson) : {
      deps: [],
      depsVersions: {}
    },
    deps = _ref3.deps,
    depsVersions = _ref3.depsVersions;
  return {
    deps: deps,
    depsVersions: depsVersions,
    nodeVersion: parseMajorVersion(process.version)
  };
}
function stripQueryAndHashFromPath(path) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return path.split("?")[0].split("#")[0];
}
function replaceBooleanFlagsInCode(code, replacementValues) {
  var ms = new MagicString__default["default"](code);
  Object.keys(replacementValues).forEach(function (key) {
    var value = replacementValues[key];
    if (typeof value === "boolean") {
      ms.replaceAll(key, JSON.stringify(value));
    }
  });
  if (ms.hasChanged()) {
    return {
      code: ms.toString(),
      map: ms.generateMap({
        hires: "boundary"
      })
    };
  }
  return null;
}

// https://turbo.build/repo/docs/reference/system-environment-variables#environment-variables-in-tasks
function getTurborepoEnvPassthroughWarning(envVarName) {
  return process.env["TURBO_HASH"] ? "\nYou seem to be using Turborepo, did you forget to put ".concat(envVarName, " in `passThroughEnv`? https://turbo.build/repo/docs/reference/configuration#passthroughenv") : "";
}

var SENTRY_SAAS_URL = "https://sentry.io";
function normalizeUserOptions(userOptions) {
  var _userOptions$org, _userOptions$project, _userOptions$authToke, _ref, _userOptions$url, _userOptions$debug, _userOptions$silent, _userOptions$telemetr, _userOptions$disable, _ref2, _userOptions$release$, _userOptions$release, _userOptions$release$2, _userOptions$release2, _userOptions$release$3, _userOptions$release3, _userOptions$release$4, _userOptions$release4, _ref3, _userOptions$release$5, _userOptions$release5, _userOptions$release6, _userOptions$_metaOpt, _userOptions$_metaOpt2, _userOptions$_experim;
  var options = {
    org: (_userOptions$org = userOptions.org) !== null && _userOptions$org !== void 0 ? _userOptions$org : process.env["SENTRY_ORG"],
    project: (_userOptions$project = userOptions.project) !== null && _userOptions$project !== void 0 ? _userOptions$project : process.env["SENTRY_PROJECT"],
    authToken: (_userOptions$authToke = userOptions.authToken) !== null && _userOptions$authToke !== void 0 ? _userOptions$authToke : process.env["SENTRY_AUTH_TOKEN"],
    url: (_ref = (_userOptions$url = userOptions.url) !== null && _userOptions$url !== void 0 ? _userOptions$url : process.env["SENTRY_URL"]) !== null && _ref !== void 0 ? _ref : SENTRY_SAAS_URL,
    headers: userOptions.headers,
    debug: (_userOptions$debug = userOptions.debug) !== null && _userOptions$debug !== void 0 ? _userOptions$debug : false,
    silent: (_userOptions$silent = userOptions.silent) !== null && _userOptions$silent !== void 0 ? _userOptions$silent : false,
    errorHandler: userOptions.errorHandler,
    telemetry: (_userOptions$telemetr = userOptions.telemetry) !== null && _userOptions$telemetr !== void 0 ? _userOptions$telemetr : true,
    disable: (_userOptions$disable = userOptions.disable) !== null && _userOptions$disable !== void 0 ? _userOptions$disable : false,
    sourcemaps: userOptions.sourcemaps,
    release: _objectSpread2(_objectSpread2({}, userOptions.release), {}, {
      name: (_ref2 = (_userOptions$release$ = (_userOptions$release = userOptions.release) === null || _userOptions$release === void 0 ? void 0 : _userOptions$release.name) !== null && _userOptions$release$ !== void 0 ? _userOptions$release$ : process.env["SENTRY_RELEASE"]) !== null && _ref2 !== void 0 ? _ref2 : determineReleaseName(),
      inject: (_userOptions$release$2 = (_userOptions$release2 = userOptions.release) === null || _userOptions$release2 === void 0 ? void 0 : _userOptions$release2.inject) !== null && _userOptions$release$2 !== void 0 ? _userOptions$release$2 : true,
      create: (_userOptions$release$3 = (_userOptions$release3 = userOptions.release) === null || _userOptions$release3 === void 0 ? void 0 : _userOptions$release3.create) !== null && _userOptions$release$3 !== void 0 ? _userOptions$release$3 : true,
      finalize: (_userOptions$release$4 = (_userOptions$release4 = userOptions.release) === null || _userOptions$release4 === void 0 ? void 0 : _userOptions$release4.finalize) !== null && _userOptions$release$4 !== void 0 ? _userOptions$release$4 : true,
      vcsRemote: (_ref3 = (_userOptions$release$5 = (_userOptions$release5 = userOptions.release) === null || _userOptions$release5 === void 0 ? void 0 : _userOptions$release5.vcsRemote) !== null && _userOptions$release$5 !== void 0 ? _userOptions$release$5 : process.env["SENTRY_VSC_REMOTE"]) !== null && _ref3 !== void 0 ? _ref3 : "origin",
      setCommits: (_userOptions$release6 = userOptions.release) === null || _userOptions$release6 === void 0 ? void 0 : _userOptions$release6.setCommits
    }),
    bundleSizeOptimizations: userOptions.bundleSizeOptimizations,
    reactComponentAnnotation: userOptions.reactComponentAnnotation,
    _metaOptions: {
      telemetry: {
        metaFramework: (_userOptions$_metaOpt = userOptions._metaOptions) === null || _userOptions$_metaOpt === void 0 ? void 0 : (_userOptions$_metaOpt2 = _userOptions$_metaOpt.telemetry) === null || _userOptions$_metaOpt2 === void 0 ? void 0 : _userOptions$_metaOpt2.metaFramework
      }
    },
    applicationKey: userOptions.applicationKey,
    moduleMetadata: userOptions.moduleMetadata,
    _experiments: (_userOptions$_experim = userOptions._experiments) !== null && _userOptions$_experim !== void 0 ? _userOptions$_experim : {}
  };
  if (options.release.setCommits === undefined) {
    if (process.env["VERCEL"] && process.env["VERCEL_GIT_COMMIT_SHA"] && process.env["VERCEL_GIT_REPO_SLUG"] && process.env["VERCEL_GIT_REPO_OWNER"] &&
    // We only want to set commits for the production env because Sentry becomes extremely noisy (eg on slack) for
    // preview environments because the previous commit is always the "stem" commit of the preview/PR causing Sentry
    // to notify you for other people creating PRs.
    process.env["VERCEL_TARGET_ENV"] === "production") {
      options.release.setCommits = {
        shouldNotThrowOnFailure: true,
        commit: process.env["VERCEL_GIT_COMMIT_SHA"],
        previousCommit: process.env["VERCEL_GIT_PREVIOUS_SHA"],
        repo: "".concat(process.env["VERCEL_GIT_REPO_OWNER"], "/").concat(process.env["VERCEL_GIT_REPO_SLUG"]),
        ignoreEmpty: true,
        ignoreMissing: true
      };
    } else {
      options.release.setCommits = {
        shouldNotThrowOnFailure: true,
        auto: true,
        ignoreEmpty: true,
        ignoreMissing: true
      };
    }
  }
  if (options.release.deploy === undefined && process.env["VERCEL"] && process.env["VERCEL_TARGET_ENV"]) {
    options.release.deploy = {
      env: "vercel-".concat(process.env["VERCEL_TARGET_ENV"]),
      url: process.env["VERCEL_URL"] ? "https://".concat(process.env["VERCEL_URL"]) : undefined
    };
  }
  return options;
}

/**
 * Validates a few combinations of options that are not checked by Sentry CLI.
 *
 * For all other options, we can rely on Sentry CLI to validate them. In fact,
 * we can't validate them in the plugin because Sentry CLI might pick up options from
 * its config file.
 *
 * @param options the internal options
 * @param logger the logger
 *
 * @returns `true` if the options are valid, `false` otherwise
 */
function validateOptions(options, logger) {
  var _options$release, _options$release2;
  var setCommits = (_options$release = options.release) === null || _options$release === void 0 ? void 0 : _options$release.setCommits;
  if (setCommits) {
    if (!setCommits.auto && !(setCommits.repo && setCommits.commit)) {
      logger.error("The `setCommits` option was specified but is missing required properties.", "Please set either `auto` or both, `repo` and `commit`.");
      return false;
    }
    if (setCommits.auto && setCommits.repo && setCommits) {
      logger.warn("The `setCommits` options includes `auto` but also `repo` and `commit`.", "Ignoring `repo` and `commit`.", "Please only set either `auto` or both, `repo` and `commit`.");
    }
  }
  if ((_options$release2 = options.release) !== null && _options$release2 !== void 0 && _options$release2.deploy && _typeof(options.release.deploy) === "object" && !options.release.deploy.env) {
    logger.error("The `deploy` option was specified but is missing the required `env` property.", "Please set the `env` property.");
    return false;
  }
  return true;
}

// Logging everything to stderr not to interfere with stdout
function createLogger(options) {
  return {
    info: function info(message) {
      if (!options.silent) {
        var _console;
        for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          params[_key - 1] = arguments[_key];
        }
        // eslint-disable-next-line no-console
        (_console = console).info.apply(_console, ["".concat(options.prefix, " Info: ").concat(message)].concat(params));
      }
    },
    warn: function warn(message) {
      if (!options.silent) {
        var _console2;
        for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          params[_key2 - 1] = arguments[_key2];
        }
        // eslint-disable-next-line no-console
        (_console2 = console).warn.apply(_console2, ["".concat(options.prefix, " Warning: ").concat(message)].concat(params));
      }
    },
    error: function error(message) {
      if (!options.silent) {
        var _console3;
        for (var _len3 = arguments.length, params = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          params[_key3 - 1] = arguments[_key3];
        }
        // eslint-disable-next-line no-console
        (_console3 = console).error.apply(_console3, ["".concat(options.prefix, " Error: ").concat(message)].concat(params));
      }
    },
    debug: function debug(message) {
      if (!options.silent && options.debug) {
        var _console4;
        for (var _len4 = arguments.length, params = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
          params[_key4 - 1] = arguments[_key4];
        }
        // eslint-disable-next-line no-console
        (_console4 = console).debug.apply(_console4, ["".concat(options.prefix, " Debug: ").concat(message)].concat(params));
      }
    }
  };
}

// Estimated maximum size for reasonable standalone event
var GZIP_THRESHOLD = 1024 * 32;

/**
 * Gets a stream from a Uint8Array or string
 * Readable.from is ideal but was added in node.js v12.3.0 and v10.17.0
 */
function streamFromBody(body) {
  return new node_stream.Readable({
    read: function read() {
      this.push(body);
      this.push(null);
    }
  });
}

/**
 * Creates a RequestExecutor to be used with `createTransport`.
 */
function createRequestExecutor(options) {
  var _URL = new URL(options.url),
    hostname = _URL.hostname,
    pathname = _URL.pathname,
    port = _URL.port,
    protocol = _URL.protocol,
    search = _URL.search;
  return function makeRequest(request) {
    return new Promise(function (resolve, reject) {
      suppressTracing(function () {
        var body = streamFromBody(request.body);
        var headers = {};
        if (request.body.length > GZIP_THRESHOLD) {
          headers["content-encoding"] = "gzip";
          body = body.pipe(node_zlib.createGzip());
        }
        var req = https__namespace.request({
          method: "POST",
          headers: headers,
          hostname: hostname,
          path: "".concat(pathname).concat(search),
          port: port,
          protocol: protocol
        }, function (res) {
          var _res$headers$retryAf, _res$headers$xSentry;
          res.on("data", function () {
            // Drain socket
          });
          res.on("end", function () {
            // Drain socket
          });
          res.setEncoding("utf8");

          // "Key-value pairs of header names and values. Header names are lower-cased."
          // https://nodejs.org/api/http.html#http_message_headers
          var retryAfterHeader = (_res$headers$retryAf = res.headers["retry-after"]) !== null && _res$headers$retryAf !== void 0 ? _res$headers$retryAf : null;
          var rateLimitsHeader = (_res$headers$xSentry = res.headers["x-sentry-rate-limits"]) !== null && _res$headers$xSentry !== void 0 ? _res$headers$xSentry : null;
          resolve({
            statusCode: res.statusCode,
            headers: {
              "retry-after": retryAfterHeader,
              "x-sentry-rate-limits": Array.isArray(rateLimitsHeader) ? rateLimitsHeader[0] || null : rateLimitsHeader
            }
          });
        });
        req.on("error", reject);
        body.pipe(req);
      });
    });
  };
}

/**
 * Creates a Transport that uses native the native 'http' and 'https' modules to send events to Sentry.
 */
function makeNodeTransport(options) {
  var requestExecutor = createRequestExecutor(options);
  return createTransport(options, requestExecutor);
}

/** A transport that can be optionally enabled as a later time than it's
 * creation */
function makeOptionallyEnabledNodeTransport(shouldSendTelemetry) {
  return function (nodeTransportOptions) {
    var nodeTransport = makeNodeTransport(nodeTransportOptions);
    return {
      flush: function flush(timeout) {
        return nodeTransport.flush(timeout);
      },
      send: function () {
        var _send = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(request) {
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                if (!("__SENTRY_INTERCEPT_TRANSPORT__" in global && Array.isArray(global.__SENTRY_INTERCEPT_TRANSPORT__))) {
                  _context.next = 3;
                  break;
                }
                global.__SENTRY_INTERCEPT_TRANSPORT__.push(request);
                return _context.abrupt("return", {
                  statusCode: 200
                });
              case 3:
                _context.next = 5;
                return shouldSendTelemetry;
              case 5:
                if (!_context.sent) {
                  _context.next = 7;
                  break;
                }
                return _context.abrupt("return", nodeTransport.send(request));
              case 7:
                return _context.abrupt("return", {
                  statusCode: 200
                });
              case 8:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function send(_x) {
          return _send.apply(this, arguments);
        }
        return send;
      }()
    };
  };
}

var SENTRY_SAAS_HOSTNAME = "sentry.io";
var stackParser = createStackParser(nodeStackLineParser());
function createSentryInstance(options, shouldSendTelemetry, buildTool) {
  var clientOptions = {
    platform: "node",
    runtime: {
      name: "node",
      version: global.process.version
    },
    dsn: "https://4c2bae7d9fbc413e8f7385f55c515d51@o1.ingest.sentry.io/6690737",
    tracesSampleRate: 1,
    sampleRate: 1,
    release: "4.3.0",
    integrations: [],
    tracePropagationTargets: ["sentry.io/api"],
    stackParser: stackParser,
    beforeSend: function beforeSend(event) {
      var _event$exception, _event$exception$valu;
      (_event$exception = event.exception) === null || _event$exception === void 0 ? void 0 : (_event$exception$valu = _event$exception.values) === null || _event$exception$valu === void 0 ? void 0 : _event$exception$valu.forEach(function (exception) {
        delete exception.stacktrace;
      });
      delete event.server_name; // Server name might contain PII
      return event;
    },
    beforeSendTransaction: function beforeSendTransaction(event) {
      delete event.server_name; // Server name might contain PII
      return event;
    },
    // We create a transport that stalls sending events until we know that we're allowed to (i.e. when Sentry CLI told
    // us that the upload URL is the Sentry SaaS URL)
    transport: makeOptionallyEnabledNodeTransport(shouldSendTelemetry)
  };
  applySdkMetadata(clientOptions, "node");
  var client = new ServerRuntimeClient(clientOptions);
  var scope = new Scope();
  scope.setClient(client);
  setTelemetryDataOnScope(options, scope, buildTool);
  return {
    sentryScope: scope,
    sentryClient: client
  };
}
function setTelemetryDataOnScope(options, scope, buildTool) {
  var _options$_metaOptions;
  var org = options.org,
    project = options.project,
    release = options.release,
    errorHandler = options.errorHandler,
    sourcemaps = options.sourcemaps,
    reactComponentAnnotation = options.reactComponentAnnotation;
  scope.setTag("upload-legacy-sourcemaps", !!release.uploadLegacySourcemaps);
  if (release.uploadLegacySourcemaps) {
    scope.setTag("uploadLegacySourcemapsEntries", Array.isArray(release.uploadLegacySourcemaps) ? release.uploadLegacySourcemaps.length : 1);
  }
  scope.setTag("module-metadata", !!options.moduleMetadata);
  scope.setTag("inject-build-information", !!options._experiments.injectBuildInformation);

  // Optional release pipeline steps
  if (release.setCommits) {
    scope.setTag("set-commits", release.setCommits.auto === true ? "auto" : "manual");
  } else {
    scope.setTag("set-commits", "undefined");
  }
  scope.setTag("finalize-release", release.finalize);
  scope.setTag("deploy-options", !!release.deploy);

  // Miscellaneous options
  scope.setTag("custom-error-handler", !!errorHandler);
  scope.setTag("sourcemaps-assets", !!(sourcemaps !== null && sourcemaps !== void 0 && sourcemaps.assets));
  scope.setTag("delete-after-upload", !!(sourcemaps !== null && sourcemaps !== void 0 && sourcemaps.filesToDeleteAfterUpload));
  scope.setTag("sourcemaps-disabled", !!(sourcemaps !== null && sourcemaps !== void 0 && sourcemaps.disable));
  scope.setTag("react-annotate", !!(reactComponentAnnotation !== null && reactComponentAnnotation !== void 0 && reactComponentAnnotation.enabled));
  scope.setTag("node", process.version);
  scope.setTag("platform", process.platform);
  scope.setTag("meta-framework", (_options$_metaOptions = options._metaOptions.telemetry.metaFramework) !== null && _options$_metaOptions !== void 0 ? _options$_metaOptions : "none");
  scope.setTag("application-key-set", options.applicationKey !== undefined);
  scope.setTag("ci", !!process.env["CI"]);
  scope.setTags({
    organization: org,
    project: project,
    bundler: buildTool
  });
  scope.setUser({
    id: org
  });
}
function allowedToSendTelemetry(_x) {
  return _allowedToSendTelemetry.apply(this, arguments);
}

/**
 * Flushing the SDK client can fail. We never want to crash the plugin because of telemetry.
 */
function _allowedToSendTelemetry() {
  _allowedToSendTelemetry = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(options) {
    var _cliInfo$split$, _cliInfo$split$$repla;
    var silent, org, project, authToken, url, headers, telemetry, release, cli, cliInfo, cliInfoUrl;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          silent = options.silent, org = options.org, project = options.project, authToken = options.authToken, url = options.url, headers = options.headers, telemetry = options.telemetry, release = options.release; // `options.telemetry` defaults to true
          if (!(telemetry === false)) {
            _context.next = 3;
            break;
          }
          return _context.abrupt("return", false);
        case 3:
          if (!(url === SENTRY_SAAS_URL)) {
            _context.next = 5;
            break;
          }
          return _context.abrupt("return", true);
        case 5:
          cli = new SentryCli__default["default"](null, {
            url: url,
            authToken: authToken,
            org: org,
            project: project,
            vcsRemote: release.vcsRemote,
            silent: silent,
            headers: headers
          });
          _context.prev = 6;
          _context.next = 9;
          return cli.execute(["info"], false);
        case 9:
          cliInfo = _context.sent;
          _context.next = 15;
          break;
        case 12:
          _context.prev = 12;
          _context.t0 = _context["catch"](6);
          return _context.abrupt("return", false);
        case 15:
          cliInfoUrl = (_cliInfo$split$ = cliInfo.split(/(\r\n|\n|\r)/)[0]) === null || _cliInfo$split$ === void 0 ? void 0 : (_cliInfo$split$$repla = _cliInfo$split$.replace(/^Sentry Server: /, "")) === null || _cliInfo$split$$repla === void 0 ? void 0 : _cliInfo$split$$repla.trim();
          if (!(cliInfoUrl === undefined)) {
            _context.next = 18;
            break;
          }
          return _context.abrupt("return", false);
        case 18:
          return _context.abrupt("return", new URL(cliInfoUrl).hostname === SENTRY_SAAS_HOSTNAME);
        case 19:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[6, 12]]);
  }));
  return _allowedToSendTelemetry.apply(this, arguments);
}
function safeFlushTelemetry(_x2) {
  return _safeFlushTelemetry.apply(this, arguments);
}
function _safeFlushTelemetry() {
  _safeFlushTelemetry = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(sentryClient) {
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return sentryClient.flush(2000);
        case 3:
          _context2.next = 7;
          break;
        case 5:
          _context2.prev = 5;
          _context2.t0 = _context2["catch"](0);
        case 7:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[0, 5]]);
  }));
  return _safeFlushTelemetry.apply(this, arguments);
}

function createDebugIdUploadFunction(_ref) {
  var sentryBuildPluginManager = _ref.sentryBuildPluginManager;
  return /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(buildArtifactPaths) {
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return sentryBuildPluginManager.uploadSourcemaps(buildArtifactPaths);
          case 2:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return function (_x) {
      return _ref2.apply(this, arguments);
    };
  }();
}
function prepareBundleForDebugIdUpload(_x2, _x3, _x4, _x5, _x6, _x7) {
  return _prepareBundleForDebugIdUpload.apply(this, arguments);
}

/**
 * Looks for a particular string pattern (`sdbid-[debug ID]`) in the bundle
 * source and extracts the bundle's debug ID from it.
 *
 * The string pattern is injected via the debug ID injection snipped.
 */
function _prepareBundleForDebugIdUpload() {
  _prepareBundleForDebugIdUpload = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(bundleFilePath, uploadFolder, chunkIndex, logger, rewriteSourcesHook, resolveSourceMapHook) {
    var bundleContent, debugId, uniqueUploadName, writeSourceFilePromise, writeSourceMapFilePromise;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return util.promisify(fs__default["default"].readFile)(bundleFilePath, "utf8");
        case 3:
          bundleContent = _context3.sent;
          _context3.next = 10;
          break;
        case 6:
          _context3.prev = 6;
          _context3.t0 = _context3["catch"](0);
          logger.error("Could not read bundle to determine debug ID and source map: ".concat(bundleFilePath), _context3.t0);
          return _context3.abrupt("return");
        case 10:
          debugId = determineDebugIdFromBundleSource(bundleContent);
          if (!(debugId === undefined)) {
            _context3.next = 14;
            break;
          }
          logger.debug("Could not determine debug ID from bundle. This can happen if you did not clean your output folder before installing the Sentry plugin. File will not be source mapped: ".concat(bundleFilePath));
          return _context3.abrupt("return");
        case 14:
          uniqueUploadName = "".concat(debugId, "-").concat(chunkIndex);
          bundleContent = addDebugIdToBundleSource(bundleContent, debugId);
          writeSourceFilePromise = fs__default["default"].promises.writeFile(path__default["default"].join(uploadFolder, "".concat(uniqueUploadName, ".js")), bundleContent, "utf-8");
          writeSourceMapFilePromise = determineSourceMapPathFromBundle(bundleFilePath, bundleContent, logger, resolveSourceMapHook).then( /*#__PURE__*/function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(sourceMapPath) {
              return _regeneratorRuntime().wrap(function _callee2$(_context2) {
                while (1) switch (_context2.prev = _context2.next) {
                  case 0:
                    if (!sourceMapPath) {
                      _context2.next = 3;
                      break;
                    }
                    _context2.next = 3;
                    return prepareSourceMapForDebugIdUpload(sourceMapPath, path__default["default"].join(uploadFolder, "".concat(uniqueUploadName, ".js.map")), debugId, rewriteSourcesHook, logger);
                  case 3:
                  case "end":
                    return _context2.stop();
                }
              }, _callee2);
            }));
            return function (_x17) {
              return _ref3.apply(this, arguments);
            };
          }());
          _context3.next = 20;
          return writeSourceFilePromise;
        case 20:
          _context3.next = 22;
          return writeSourceMapFilePromise;
        case 22:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 6]]);
  }));
  return _prepareBundleForDebugIdUpload.apply(this, arguments);
}
function determineDebugIdFromBundleSource(code) {
  var match = code.match(/sentry-dbid-([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})/);
  if (match) {
    return match[1];
  } else {
    return undefined;
  }
}
var SPEC_LAST_DEBUG_ID_REGEX = /\/\/# debugId=([a-fA-F0-9-]+)(?![\s\S]*\/\/# debugId=)/m;
function hasSpecCompliantDebugId(bundleSource) {
  return SPEC_LAST_DEBUG_ID_REGEX.test(bundleSource);
}
function addDebugIdToBundleSource(bundleSource, debugId) {
  if (hasSpecCompliantDebugId(bundleSource)) {
    return bundleSource.replace(SPEC_LAST_DEBUG_ID_REGEX, "//# debugId=".concat(debugId));
  } else {
    return "".concat(bundleSource, "\n//# debugId=").concat(debugId);
  }
}

/**
 * Applies a set of heuristics to find the source map for a particular bundle.
 *
 * @returns the path to the bundle's source map or `undefined` if none could be found.
 */
function determineSourceMapPathFromBundle(_x8, _x9, _x10, _x11) {
  return _determineSourceMapPathFromBundle.apply(this, arguments);
}

/**
 * Reads a source map, injects debug ID fields, and writes the source map to the target path.
 */
function _determineSourceMapPathFromBundle() {
  _determineSourceMapPathFromBundle = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(bundlePath, bundleSource, logger, resolveSourceMapHook) {
    var sourceMappingUrlMatch, sourceMappingUrl, searchLocations, customPath, parsedUrl, _i, _searchLocations, searchLocation;
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          sourceMappingUrlMatch = bundleSource.match(/^\s*\/\/# sourceMappingURL=(.*)$/m);
          sourceMappingUrl = sourceMappingUrlMatch ? sourceMappingUrlMatch[1] : undefined;
          searchLocations = [];
          if (!resolveSourceMapHook) {
            _context4.next = 10;
            break;
          }
          logger.debug("Calling sourcemaps.resolveSourceMap(".concat(JSON.stringify(bundlePath), ", ").concat(JSON.stringify(sourceMappingUrl), ")"));
          _context4.next = 7;
          return resolveSourceMapHook(bundlePath, sourceMappingUrl);
        case 7:
          customPath = _context4.sent;
          logger.debug("resolveSourceMap hook returned: ".concat(JSON.stringify(customPath)));
          if (customPath) {
            searchLocations.push(customPath);
          }
        case 10:
          // 1. try to find source map at `sourceMappingURL` location
          if (sourceMappingUrl) {
            try {
              parsedUrl = new URL(sourceMappingUrl);
            } catch (_unused) {
              // noop
            }
            if (parsedUrl && parsedUrl.protocol === "file:") {
              searchLocations.push(url__namespace.fileURLToPath(sourceMappingUrl));
            } else if (parsedUrl) ; else if (path__default["default"].isAbsolute(sourceMappingUrl)) {
              searchLocations.push(path__default["default"].normalize(sourceMappingUrl));
            } else {
              searchLocations.push(path__default["default"].normalize(path__default["default"].join(path__default["default"].dirname(bundlePath), sourceMappingUrl)));
            }
          }

          // 2. try to find source map at path adjacent to chunk source, but with `.map` appended
          searchLocations.push(bundlePath + ".map");
          _i = 0, _searchLocations = searchLocations;
        case 13:
          if (!(_i < _searchLocations.length)) {
            _context4.next = 27;
            break;
          }
          searchLocation = _searchLocations[_i];
          _context4.prev = 15;
          _context4.next = 18;
          return util__namespace.promisify(fs__default["default"].access)(searchLocation);
        case 18:
          logger.debug("Source map found for bundle `".concat(bundlePath, "`: `").concat(searchLocation, "`"));
          return _context4.abrupt("return", searchLocation);
        case 22:
          _context4.prev = 22;
          _context4.t0 = _context4["catch"](15);
        case 24:
          _i++;
          _context4.next = 13;
          break;
        case 27:
          // This is just a debug message because it can be quite spammy for some frameworks
          logger.debug("Could not determine source map path for bundle `".concat(bundlePath, "`") + " with sourceMappingURL=".concat(sourceMappingUrl === undefined ? "undefined" : "`".concat(sourceMappingUrl, "`")) + " - Did you turn on source map generation in your bundler?" + " (Attempted paths: ".concat(searchLocations.map(function (e) {
            return "`".concat(e, "`");
          }).join(", "), ")"));
          return _context4.abrupt("return", undefined);
        case 29:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[15, 22]]);
  }));
  return _determineSourceMapPathFromBundle.apply(this, arguments);
}
function prepareSourceMapForDebugIdUpload(_x12, _x13, _x14, _x15, _x16) {
  return _prepareSourceMapForDebugIdUpload.apply(this, arguments);
}
function _prepareSourceMapForDebugIdUpload() {
  _prepareSourceMapForDebugIdUpload = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(sourceMapPath, targetPath, debugId, rewriteSourcesHook, logger) {
    var sourceMapFileContent, map;
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return util__namespace.promisify(fs__default["default"].readFile)(sourceMapPath, {
            encoding: "utf8"
          });
        case 3:
          sourceMapFileContent = _context5.sent;
          _context5.next = 10;
          break;
        case 6:
          _context5.prev = 6;
          _context5.t0 = _context5["catch"](0);
          logger.error("Failed to read source map for debug ID upload: ".concat(sourceMapPath), _context5.t0);
          return _context5.abrupt("return");
        case 10:
          _context5.prev = 10;
          map = JSON.parse(sourceMapFileContent);
          // For now we write both fields until we know what will become the standard - if ever.
          map["debug_id"] = debugId;
          map["debugId"] = debugId;
          _context5.next = 20;
          break;
        case 16:
          _context5.prev = 16;
          _context5.t1 = _context5["catch"](10);
          logger.error("Failed to parse source map for debug ID upload: ".concat(sourceMapPath));
          return _context5.abrupt("return");
        case 20:
          if (map["sources"] && Array.isArray(map["sources"])) {
            map["sources"] = map["sources"].map(function (source) {
              return rewriteSourcesHook(source, map);
            });
          }
          _context5.prev = 21;
          _context5.next = 24;
          return util__namespace.promisify(fs__default["default"].writeFile)(targetPath, JSON.stringify(map), {
            encoding: "utf8"
          });
        case 24:
          _context5.next = 30;
          break;
        case 26:
          _context5.prev = 26;
          _context5.t2 = _context5["catch"](21);
          logger.error("Failed to prepare source map for debug ID upload: ".concat(sourceMapPath), _context5.t2);
          return _context5.abrupt("return");
        case 30:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[0, 6], [10, 16], [21, 26]]);
  }));
  return _prepareSourceMapForDebugIdUpload.apply(this, arguments);
}
var PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//;
function defaultRewriteSourcesHook(source) {
  if (source.match(PROTOCOL_REGEX)) {
    return source.replace(PROTOCOL_REGEX, "");
  } else {
    return path__default["default"].relative(process.cwd(), path__default["default"].normalize(source));
  }
}

function createCliInstance(options) {
  return new SentryCli__default["default"](null, {
    authToken: options.authToken,
    org: options.org,
    project: options.project,
    silent: options.silent,
    url: options.url,
    vcsRemote: options.release.vcsRemote,
    headers: _objectSpread2(_objectSpread2({}, getTraceData()), options.headers)
  });
}

/**
 * Creates a build plugin manager that exposes primitives for everything that a Sentry JavaScript SDK or build tooling may do during a build.
 *
 * The build plugin manager's behavior strongly depends on the options that are passed in.
 */
function createSentryBuildPluginManager(userOptions, bundlerPluginMetaContext) {
  var _userOptions$silent, _userOptions$debug;
  var logger = createLogger({
    prefix: bundlerPluginMetaContext.loggerPrefix,
    silent: (_userOptions$silent = userOptions.silent) !== null && _userOptions$silent !== void 0 ? _userOptions$silent : false,
    debug: (_userOptions$debug = userOptions.debug) !== null && _userOptions$debug !== void 0 ? _userOptions$debug : false
  });
  try {
    var dotenvFile = fs__namespace.readFileSync(path__namespace.join(process.cwd(), ".env.sentry-build-plugin"), "utf-8");
    // NOTE: Do not use the dotenv.config API directly to read the dotenv file! For some ungodly reason, it falls back to reading `${process.cwd()}/.env` which is absolutely not what we want.
    var dotenvResult = dotenv__namespace.parse(dotenvFile);

    // Vite has a bug/behaviour where spreading into process.env will cause it to crash
    // https://github.com/vitest-dev/vitest/issues/1870#issuecomment-1501140251
    Object.assign(process.env, dotenvResult);
    logger.info('Using environment variables configured in ".env.sentry-build-plugin".');
  } catch (e) {
    // Ignore "file not found" errors but throw all others
    if (_typeof(e) === "object" && e && "code" in e && e.code !== "ENOENT") {
      throw e;
    }
  }
  var options = normalizeUserOptions(userOptions);
  if (options.disable) {
    // Early-return a noop build plugin manager instance so that we
    // don't continue validating options, setting up Sentry, etc.
    // Otherwise we might create side-effects or log messages that
    // users don't expect from a disabled plugin.
    return {
      normalizedOptions: options,
      logger: logger,
      bundleSizeOptimizationReplacementValues: {},
      telemetry: {
        emitBundlerPluginExecutionSignal: function () {
          var _emitBundlerPluginExecutionSignal = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                case "end":
                  return _context.stop();
              }
            }, _callee);
          }));
          function emitBundlerPluginExecutionSignal() {
            return _emitBundlerPluginExecutionSignal.apply(this, arguments);
          }
          return emitBundlerPluginExecutionSignal;
        }()
      },
      bundleMetadata: {},
      createRelease: function () {
        var _createRelease = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
              case "end":
                return _context2.stop();
            }
          }, _callee2);
        }));
        function createRelease() {
          return _createRelease.apply(this, arguments);
        }
        return createRelease;
      }(),
      uploadSourcemaps: function () {
        var _uploadSourcemaps = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
            while (1) switch (_context3.prev = _context3.next) {
              case 0:
              case "end":
                return _context3.stop();
            }
          }, _callee3);
        }));
        function uploadSourcemaps() {
          return _uploadSourcemaps.apply(this, arguments);
        }
        return uploadSourcemaps;
      }(),
      deleteArtifacts: function () {
        var _deleteArtifacts = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
            while (1) switch (_context4.prev = _context4.next) {
              case 0:
              case "end":
                return _context4.stop();
            }
          }, _callee4);
        }));
        function deleteArtifacts() {
          return _deleteArtifacts.apply(this, arguments);
        }
        return deleteArtifacts;
      }(),
      createDependencyOnBuildArtifacts: function createDependencyOnBuildArtifacts() {
        return function () {
          /* noop */
        };
      },
      injectDebugIds: function () {
        var _injectDebugIds = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
            while (1) switch (_context5.prev = _context5.next) {
              case 0:
              case "end":
                return _context5.stop();
            }
          }, _callee5);
        }));
        function injectDebugIds() {
          return _injectDebugIds.apply(this, arguments);
        }
        return injectDebugIds;
      }()
    };
  }
  var shouldSendTelemetry = allowedToSendTelemetry(options);
  var _createSentryInstance = createSentryInstance(options, shouldSendTelemetry, bundlerPluginMetaContext.buildTool),
    sentryScope = _createSentryInstance.sentryScope,
    sentryClient = _createSentryInstance.sentryClient;
  var _sentryClient$getOpti = sentryClient.getOptions(),
    release = _sentryClient$getOpti.release,
    _sentryClient$getOpti2 = _sentryClient$getOpti.environment,
    environment = _sentryClient$getOpti2 === void 0 ? DEFAULT_ENVIRONMENT : _sentryClient$getOpti2;
  var sentrySession = makeSession({
    release: release,
    environment: environment
  });
  sentryScope.setSession(sentrySession);
  // Send the start of the session
  sentryClient.captureSession(sentrySession);
  var sessionHasEnded = false; // Just to prevent infinite loops with beforeExit, which is called whenever the event loop empties out

  function endSession() {
    if (sessionHasEnded) {
      return;
    }
    closeSession(sentrySession);
    sentryClient.captureSession(sentrySession);
    sessionHasEnded = true;
  }

  // We also need to manually end sessions on errors because beforeExit is not called on crashes
  process.on("beforeExit", function () {
    endSession();
  });

  // Set the User-Agent that Sentry CLI will use when interacting with Sentry
  process.env["SENTRY_PIPELINE"] = "".concat(bundlerPluginMetaContext.buildTool, "-plugin/", "4.3.0");

  // Not a bulletproof check but should be good enough to at least sometimes determine
  // if the plugin is called in dev/watch mode or for a  prod build. The important part
  // here is to avoid a false positive. False negatives are okay.
  var isDevMode = process.env["NODE_ENV"] === "development";

  /**
   * Handles errors caught and emitted in various areas of the plugin.
   *
   * Also sets the sentry session status according to the error handling.
   *
   * If users specify their custom `errorHandler` we'll leave the decision to throw
   * or continue up to them. By default, @param throwByDefault controls if the plugin
   * should throw an error (which causes a build fail in most bundlers) or continue.
   */
  function handleRecoverableError(unknownError, throwByDefault) {
    sentrySession.status = "abnormal";
    try {
      if (options.errorHandler) {
        try {
          if (unknownError instanceof Error) {
            options.errorHandler(unknownError);
          } else {
            options.errorHandler(new Error("An unknown error occurred"));
          }
        } catch (e) {
          sentrySession.status = "crashed";
          throw e;
        }
      } else {
        // setting the session to "crashed" b/c from a plugin perspective this run failed.
        // However, we're intentionally not rethrowing the error to avoid breaking the user build.
        sentrySession.status = "crashed";
        if (throwByDefault) {
          throw unknownError;
        }
        logger.error("An error occurred. Couldn't finish all operations:", unknownError);
      }
    } finally {
      endSession();
    }
  }
  if (!validateOptions(options, logger)) {
    // Throwing by default to avoid a misconfigured plugin going unnoticed.
    handleRecoverableError(new Error("Options were not set correctly. See output above for more details."), true);
  }

  // We have multiple plugins depending on generated source map files. (debug ID upload, legacy upload)
  // Additionally, we also want to have the functionality to delete files after uploading sourcemaps.
  // All of these plugins and the delete functionality need to run in the same hook (`writeBundle`).
  // Since the plugins among themselves are not aware of when they run and finish, we need a system to
  // track their dependencies on the generated files, so that we can initiate the file deletion only after
  // nothing depends on the files anymore.
  var dependenciesOnBuildArtifacts = new Set();
  var buildArtifactsDependencySubscribers = [];
  function notifyBuildArtifactDependencySubscribers() {
    buildArtifactsDependencySubscribers.forEach(function (subscriber) {
      subscriber();
    });
  }
  function createDependencyOnBuildArtifacts() {
    var dependencyIdentifier = Symbol();
    dependenciesOnBuildArtifacts.add(dependencyIdentifier);
    return function freeDependencyOnBuildArtifacts() {
      dependenciesOnBuildArtifacts["delete"](dependencyIdentifier);
      notifyBuildArtifactDependencySubscribers();
    };
  }

  /**
   * Returns a Promise that resolves when all the currently active dependencies are freed again.
   *
   * It is very important that this function is called as late as possible before wanting to await the Promise to give
   * the dependency producers as much time as possible to register themselves.
   */
  function waitUntilBuildArtifactDependenciesAreFreed() {
    return new Promise(function (resolve) {
      buildArtifactsDependencySubscribers.push(function () {
        if (dependenciesOnBuildArtifacts.size === 0) {
          resolve();
        }
      });
      if (dependenciesOnBuildArtifacts.size === 0) {
        resolve();
      }
    });
  }
  var bundleSizeOptimizationReplacementValues = {};
  if (options.bundleSizeOptimizations) {
    var bundleSizeOptimizations = options.bundleSizeOptimizations;
    if (bundleSizeOptimizations.excludeDebugStatements) {
      bundleSizeOptimizationReplacementValues["__SENTRY_DEBUG__"] = false;
    }
    if (bundleSizeOptimizations.excludeTracing) {
      bundleSizeOptimizationReplacementValues["__SENTRY_TRACING__"] = false;
    }
    if (bundleSizeOptimizations.excludeReplayCanvas) {
      bundleSizeOptimizationReplacementValues["__RRWEB_EXCLUDE_CANVAS__"] = true;
    }
    if (bundleSizeOptimizations.excludeReplayIframe) {
      bundleSizeOptimizationReplacementValues["__RRWEB_EXCLUDE_IFRAME__"] = true;
    }
    if (bundleSizeOptimizations.excludeReplayShadowDom) {
      bundleSizeOptimizationReplacementValues["__RRWEB_EXCLUDE_SHADOW_DOM__"] = true;
    }
    if (bundleSizeOptimizations.excludeReplayWorker) {
      bundleSizeOptimizationReplacementValues["__SENTRY_EXCLUDE_REPLAY_WORKER__"] = true;
    }
  }
  var bundleMetadata = {};
  if (options.moduleMetadata || options.applicationKey) {
    if (options.applicationKey) {
      // We use different keys so that if user-code receives multiple bundling passes, we will store the application keys of all the passes.
      // It is a bit unfortunate that we have to inject the metadata snippet at the top, because after multiple
      // injections, the first injection will always "win" because it comes last in the code. We would generally be
      // fine with making the last bundling pass win. But because it cannot win, we have to use a workaround of storing
      // the app keys in different object keys.
      // We can simply use the `_sentryBundlerPluginAppKey:` to filter for app keys in the SDK.
      bundleMetadata["_sentryBundlerPluginAppKey:".concat(options.applicationKey)] = true;
    }
    if (typeof options.moduleMetadata === "function") {
      var args = {
        org: options.org,
        project: options.project,
        release: options.release.name
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      bundleMetadata = _objectSpread2(_objectSpread2({}, bundleMetadata), options.moduleMetadata(args));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      bundleMetadata = _objectSpread2(_objectSpread2({}, bundleMetadata), options.moduleMetadata);
    }
  }
  return {
    /**
     * A logger instance that takes the options passed to the build plugin manager into account. (for silencing and log level etc.)
     */
    logger: logger,
    /**
     * Options after normalization. Includes things like the inferred release name.
     */
    normalizedOptions: options,
    /**
     * Magic strings and their replacement values that can be used for bundle size optimizations. This already takes
     * into account the options passed to the build plugin manager.
     */
    bundleSizeOptimizationReplacementValues: bundleSizeOptimizationReplacementValues,
    /**
     * Metadata that should be injected into bundles if possible. Takes into account options passed to the build plugin manager.
     */
    // See `generateModuleMetadataInjectorCode` for how this should be used exactly
    bundleMetadata: bundleMetadata,
    /**
     * Contains utility functions for emitting telemetry via the build plugin manager.
     */
    telemetry: {
      /**
       * Emits a `Sentry Bundler Plugin execution` signal.
       */
      emitBundlerPluginExecutionSignal: function emitBundlerPluginExecutionSignal() {
        return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
            while (1) switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return shouldSendTelemetry;
              case 2:
                if (!_context6.sent) {
                  _context6.next = 7;
                  break;
                }
                logger.info("Sending telemetry data on issues and performance to Sentry. To disable telemetry, set `options.telemetry` to `false`.");
                startSpan({
                  name: "Sentry Bundler Plugin execution",
                  scope: sentryScope
                }, function () {
                  //
                });
                _context6.next = 7;
                return safeFlushTelemetry(sentryClient);
              case 7:
              case "end":
                return _context6.stop();
            }
          }, _callee6);
        }))();
      }
    },
    /**
     * Will potentially create a release based on the build plugin manager options.
     *
     * Also
     * - finalizes the release
     * - sets commits
     * - uploads legacy sourcemaps
     * - adds deploy information
     */
    createRelease: function createRelease() {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
        var freeWriteBundleInvocationDependencyOnSourcemapFiles, cliInstance, normalizedInclude;
        return _regeneratorRuntime().wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              if (options.release.name) {
                _context7.next = 5;
                break;
              }
              logger.debug("No release name provided. Will not create release. Please set the `release.name` option to identify your release.");
              return _context7.abrupt("return");
            case 5:
              if (!isDevMode) {
                _context7.next = 10;
                break;
              }
              logger.debug("Running in development mode. Will not create release.");
              return _context7.abrupt("return");
            case 10:
              if (options.authToken) {
                _context7.next = 15;
                break;
              }
              logger.warn("No auth token provided. Will not create release. Please set the `authToken` option. You can find information on how to generate a Sentry auth token here: https://docs.sentry.io/api/auth/" + getTurborepoEnvPassthroughWarning("SENTRY_AUTH_TOKEN"));
              return _context7.abrupt("return");
            case 15:
              if (!(!options.org && !options.authToken.startsWith("sntrys_"))) {
                _context7.next = 20;
                break;
              }
              logger.warn("No organization slug provided. Will not create release. Please set the `org` option to your Sentry organization slug." + getTurborepoEnvPassthroughWarning("SENTRY_ORG"));
              return _context7.abrupt("return");
            case 20:
              if (options.project) {
                _context7.next = 23;
                break;
              }
              logger.warn("No project provided. Will not create release. Please set the `project` option to your Sentry project slug." + getTurborepoEnvPassthroughWarning("SENTRY_PROJECT"));
              return _context7.abrupt("return");
            case 23:
              // It is possible that this writeBundle hook is called multiple times in one build (for example when reusing the plugin, or when using build tooling like `@vitejs/plugin-legacy`)
              // Therefore we need to actually register the execution of this hook as dependency on the sourcemap files.
              freeWriteBundleInvocationDependencyOnSourcemapFiles = createDependencyOnBuildArtifacts();
              _context7.prev = 24;
              cliInstance = createCliInstance(options);
              if (!options.release.create) {
                _context7.next = 29;
                break;
              }
              _context7.next = 29;
              return cliInstance.releases["new"](options.release.name);
            case 29:
              if (!options.release.uploadLegacySourcemaps) {
                _context7.next = 33;
                break;
              }
              normalizedInclude = arrayify(options.release.uploadLegacySourcemaps).map(function (includeItem) {
                return typeof includeItem === "string" ? {
                  paths: [includeItem]
                } : includeItem;
              }).map(function (includeEntry) {
                var _includeEntry$validat;
                return _objectSpread2(_objectSpread2({}, includeEntry), {}, {
                  validate: (_includeEntry$validat = includeEntry.validate) !== null && _includeEntry$validat !== void 0 ? _includeEntry$validat : false,
                  ext: includeEntry.ext ? includeEntry.ext.map(function (extension) {
                    return ".".concat(extension.replace(/^\./, ""));
                  }) : [".js", ".map", ".jsbundle", ".bundle"],
                  ignore: includeEntry.ignore ? arrayify(includeEntry.ignore) : undefined
                });
              });
              _context7.next = 33;
              return cliInstance.releases.uploadSourceMaps(options.release.name, {
                include: normalizedInclude,
                dist: options.release.dist,
                // We want this promise to throw if the sourcemaps fail to upload so that we know about it.
                // see: https://github.com/getsentry/sentry-cli/pull/2605
                live: "rejectOnError"
              });
            case 33:
              if (!(options.release.setCommits !== false)) {
                _context7.next = 46;
                break;
              }
              _context7.prev = 34;
              _context7.next = 37;
              return cliInstance.releases.setCommits(options.release.name,
              // set commits always exists due to the normalize function
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              options.release.setCommits);
            case 37:
              _context7.next = 46;
              break;
            case 39:
              _context7.prev = 39;
              _context7.t0 = _context7["catch"](34);
              if (!(options.release.setCommits && "shouldNotThrowOnFailure" in options.release.setCommits && options.release.setCommits.shouldNotThrowOnFailure)) {
                _context7.next = 45;
                break;
              }
              logger.debug("An error occurred setting commits on release (this message can be ignored unless you commits on release are desired):", _context7.t0);
              _context7.next = 46;
              break;
            case 45:
              throw _context7.t0;
            case 46:
              if (!options.release.finalize) {
                _context7.next = 49;
                break;
              }
              _context7.next = 49;
              return cliInstance.releases.finalize(options.release.name);
            case 49:
              if (!options.release.deploy) {
                _context7.next = 52;
                break;
              }
              _context7.next = 52;
              return cliInstance.releases.newDeploy(options.release.name, options.release.deploy);
            case 52:
              _context7.next = 60;
              break;
            case 54:
              _context7.prev = 54;
              _context7.t1 = _context7["catch"](24);
              sentryScope.captureException('Error in "releaseManagementPlugin" writeBundle hook');
              _context7.next = 59;
              return safeFlushTelemetry(sentryClient);
            case 59:
              handleRecoverableError(_context7.t1, false);
            case 60:
              _context7.prev = 60;
              freeWriteBundleInvocationDependencyOnSourcemapFiles();
              return _context7.finish(60);
            case 63:
            case "end":
              return _context7.stop();
          }
        }, _callee7, null, [[24, 54, 60, 63], [34, 39]]);
      }))();
    },
    /*
      Injects debug IDs into the build artifacts.
       This is a separate function from `uploadSourcemaps` because that needs to run before the sourcemaps are uploaded.
      Usually the respective bundler-plugin will take care of this before the sourcemaps are uploaded.
      Only use this if you need to manually inject debug IDs into the build artifacts.
    */
    injectDebugIds: function injectDebugIds(buildArtifactPaths) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
        return _regeneratorRuntime().wrap(function _callee9$(_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return startSpan({
                name: "inject-debug-ids",
                scope: sentryScope,
                forceTransaction: true
              }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
                var _options$debug, cliInstance;
                return _regeneratorRuntime().wrap(function _callee8$(_context8) {
                  while (1) switch (_context8.prev = _context8.next) {
                    case 0:
                      _context8.prev = 0;
                      cliInstance = createCliInstance(options);
                      _context8.next = 4;
                      return cliInstance.execute(["sourcemaps", "inject"].concat(_toConsumableArray(buildArtifactPaths)), (_options$debug = options.debug) !== null && _options$debug !== void 0 ? _options$debug : false);
                    case 4:
                      _context8.next = 10;
                      break;
                    case 6:
                      _context8.prev = 6;
                      _context8.t0 = _context8["catch"](0);
                      sentryScope.captureException('Error in "debugIdInjectionPlugin" writeBundle hook');
                      handleRecoverableError(_context8.t0, false);
                    case 10:
                      _context8.prev = 10;
                      _context8.next = 13;
                      return safeFlushTelemetry(sentryClient);
                    case 13:
                      return _context8.finish(10);
                    case 14:
                    case "end":
                      return _context8.stop();
                  }
                }, _callee8, null, [[0, 6, 10, 14]]);
              })));
            case 2:
            case "end":
              return _context9.stop();
          }
        }, _callee9);
      }))();
    },
    /**
     * Uploads sourcemaps using the "Debug ID" method.
     *
     * By default, this prepares bundles in a temporary folder before uploading. You can opt into an
     * in-place, direct upload path by setting `prepareArtifacts` to `false`. If `prepareArtifacts` is set to
     * `false`, no preparation (e.g. adding `//# debugId=...` and writing adjusted source maps) is performed and no temp folder is used.
     *
     * @param buildArtifactPaths - The paths of the build artifacts to upload
     * @param opts - Optional flags to control temp folder usage and preparation
     */
    uploadSourcemaps: function uploadSourcemaps(buildArtifactPaths, opts) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee19() {
        var _options$sourcemaps;
        var assets;
        return _regeneratorRuntime().wrap(function _callee19$(_context19) {
          while (1) switch (_context19.prev = _context19.next) {
            case 0:
              if (canUploadSourceMaps(options, logger, isDevMode)) {
                _context19.next = 2;
                break;
              }
              return _context19.abrupt("return");
            case 2:
              // Early exit if assets is explicitly set to an empty array
              assets = (_options$sourcemaps = options.sourcemaps) === null || _options$sourcemaps === void 0 ? void 0 : _options$sourcemaps.assets;
              if (!(Array.isArray(assets) && assets.length === 0)) {
                _context19.next = 6;
                break;
              }
              logger.debug("Empty `sourcemaps.assets` option provided. Will not upload sourcemaps with debug ID.");
              return _context19.abrupt("return");
            case 6:
              _context19.next = 8;
              return startSpan(
              // This is `forceTransaction`ed because this span is used in dashboards in the form of indexed transactions.
              {
                name: "debug-id-sourcemap-upload",
                scope: sentryScope,
                forceTransaction: true
              }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee18() {
                var _opts$prepareArtifact;
                var shouldPrepare, folderToCleanUp, freeUploadDependencyOnBuildArtifacts, _options$sourcemaps2, _options$sourcemaps3, _options$sourcemaps4, _options$sourcemaps5, pathsToUpload, ignorePaths, globAssets, globResult, debugIdChunkFilePaths, tmpUploadFolder, _process$env2;
                return _regeneratorRuntime().wrap(function _callee18$(_context18) {
                  while (1) switch (_context18.prev = _context18.next) {
                    case 0:
                      // If we're not using a temp folder, we must not prepare artifacts in-place (to avoid mutating user files)
                      shouldPrepare = (_opts$prepareArtifact = opts === null || opts === void 0 ? void 0 : opts.prepareArtifacts) !== null && _opts$prepareArtifact !== void 0 ? _opts$prepareArtifact : true;
                      // It is possible that this writeBundle hook (which calls this function) is called multiple times in one build (for example when reusing the plugin, or when using build tooling like `@vitejs/plugin-legacy`)
                      // Therefore we need to actually register the execution of this hook as dependency on the sourcemap files.
                      freeUploadDependencyOnBuildArtifacts = createDependencyOnBuildArtifacts();
                      _context18.prev = 2;
                      if (shouldPrepare) {
                        _context18.next = 11;
                        break;
                      }
                      // Direct CLI upload from existing artifact paths (no globbing, no preparation)

                      if (assets) {
                        pathsToUpload = Array.isArray(assets) ? assets : [assets];
                        logger.debug("Direct upload mode: passing user-provided assets directly to CLI: ".concat(pathsToUpload.join(", ")));
                      } else {
                        // Use original paths e.g. like ['.next/server'] directly –> preferred way when no globbing is done
                        pathsToUpload = buildArtifactPaths;
                      }
                      ignorePaths = (_options$sourcemaps2 = options.sourcemaps) !== null && _options$sourcemaps2 !== void 0 && _options$sourcemaps2.ignore ? Array.isArray((_options$sourcemaps3 = options.sourcemaps) === null || _options$sourcemaps3 === void 0 ? void 0 : _options$sourcemaps3.ignore) ? (_options$sourcemaps4 = options.sourcemaps) === null || _options$sourcemaps4 === void 0 ? void 0 : _options$sourcemaps4.ignore : [(_options$sourcemaps5 = options.sourcemaps) === null || _options$sourcemaps5 === void 0 ? void 0 : _options$sourcemaps5.ignore] : [];
                      _context18.next = 8;
                      return startSpan({
                        name: "upload",
                        scope: sentryScope
                      }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
                        var _options$release$name;
                        var cliInstance;
                        return _regeneratorRuntime().wrap(function _callee10$(_context10) {
                          while (1) switch (_context10.prev = _context10.next) {
                            case 0:
                              cliInstance = createCliInstance(options);
                              _context10.next = 3;
                              return cliInstance.releases.uploadSourceMaps((_options$release$name = options.release.name) !== null && _options$release$name !== void 0 ? _options$release$name : "undefined", {
                                include: [{
                                  paths: pathsToUpload,
                                  rewrite: true,
                                  dist: options.release.dist
                                }],
                                ignore: ignorePaths,
                                live: "rejectOnError"
                              });
                            case 3:
                            case "end":
                              return _context10.stop();
                          }
                        }, _callee10);
                      })));
                    case 8:
                      logger.info("Successfully uploaded source maps to Sentry");
                      _context18.next = 28;
                      break;
                    case 11:
                      // Prepare artifacts in temp folder before uploading

                      if (assets) {
                        globAssets = assets;
                      } else {
                        logger.debug("No `sourcemaps.assets` option provided, falling back to uploading detected build artifacts.");
                        globAssets = buildArtifactPaths;
                      }
                      _context18.next = 14;
                      return startSpan({
                        name: "glob",
                        scope: sentryScope
                      }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11() {
                        var _options$sourcemaps6;
                        return _regeneratorRuntime().wrap(function _callee11$(_context11) {
                          while (1) switch (_context11.prev = _context11.next) {
                            case 0:
                              _context11.next = 2;
                              return glob.glob(globAssets, {
                                absolute: true,
                                nodir: true,
                                // We need individual files for preparation
                                ignore: (_options$sourcemaps6 = options.sourcemaps) === null || _options$sourcemaps6 === void 0 ? void 0 : _options$sourcemaps6.ignore
                              });
                            case 2:
                              return _context11.abrupt("return", _context11.sent);
                            case 3:
                            case "end":
                              return _context11.stop();
                          }
                        }, _callee11);
                      })));
                    case 14:
                      globResult = _context18.sent;
                      debugIdChunkFilePaths = globResult.filter(function (debugIdChunkFilePath) {
                        return !!stripQueryAndHashFromPath(debugIdChunkFilePath).match(/\.(js|mjs|cjs)$/);
                      }); // The order of the files output by glob() is not deterministic
                      // Ensure order within the files so that {debug-id}-{chunkIndex} coupling is consistent
                      debugIdChunkFilePaths.sort();
                      if (!(debugIdChunkFilePaths.length === 0)) {
                        _context18.next = 21;
                        break;
                      }
                      logger.warn("Didn't find any matching sources for debug ID upload. Please check the `sourcemaps.assets` option.");
                      _context18.next = 28;
                      break;
                    case 21:
                      _context18.next = 23;
                      return startSpan({
                        name: "mkdtemp",
                        scope: sentryScope
                      }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12() {
                        var _process$env;
                        return _regeneratorRuntime().wrap(function _callee12$(_context12) {
                          while (1) switch (_context12.prev = _context12.next) {
                            case 0:
                              _context12.t0 = (_process$env = process.env) === null || _process$env === void 0 ? void 0 : _process$env["SENTRY_TEST_OVERRIDE_TEMP_DIR"];
                              if (_context12.t0) {
                                _context12.next = 5;
                                break;
                              }
                              _context12.next = 4;
                              return fs__namespace.promises.mkdtemp(path__namespace.join(os__namespace.tmpdir(), "sentry-bundler-plugin-upload-"));
                            case 4:
                              _context12.t0 = _context12.sent;
                            case 5:
                              return _context12.abrupt("return", _context12.t0);
                            case 6:
                            case "end":
                              return _context12.stop();
                          }
                        }, _callee12);
                      })));
                    case 23:
                      tmpUploadFolder = _context18.sent;
                      folderToCleanUp = tmpUploadFolder;

                      // Prepare into temp folder, then upload
                      _context18.next = 27;
                      return startSpan({
                        name: "prepare-bundles",
                        scope: sentryScope
                      }, /*#__PURE__*/function () {
                        var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee16(prepBundlesSpan) {
                          var preparationTasks, workers, worker, workerIndex, files, stats, uploadSize;
                          return _regeneratorRuntime().wrap(function _callee16$(_context16) {
                            while (1) switch (_context16.prev = _context16.next) {
                              case 0:
                                // Preparing the bundles can be a lot of work and doing it all at once has the potential of nuking the heap so
                                // instead we do it with a maximum of 16 concurrent workers
                                preparationTasks = debugIdChunkFilePaths.map(function (chunkFilePath, chunkIndex) {
                                  return /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
                                    var _options$sourcemaps$r, _options$sourcemaps7, _options$sourcemaps8;
                                    return _regeneratorRuntime().wrap(function _callee13$(_context13) {
                                      while (1) switch (_context13.prev = _context13.next) {
                                        case 0:
                                          _context13.next = 2;
                                          return prepareBundleForDebugIdUpload(chunkFilePath, tmpUploadFolder, chunkIndex, logger, (_options$sourcemaps$r = (_options$sourcemaps7 = options.sourcemaps) === null || _options$sourcemaps7 === void 0 ? void 0 : _options$sourcemaps7.rewriteSources) !== null && _options$sourcemaps$r !== void 0 ? _options$sourcemaps$r : defaultRewriteSourcesHook, (_options$sourcemaps8 = options.sourcemaps) === null || _options$sourcemaps8 === void 0 ? void 0 : _options$sourcemaps8.resolveSourceMap);
                                        case 2:
                                        case "end":
                                          return _context13.stop();
                                      }
                                    }, _callee13);
                                  }));
                                });
                                workers = [];
                                worker = /*#__PURE__*/function () {
                                  var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14() {
                                    var task;
                                    return _regeneratorRuntime().wrap(function _callee14$(_context14) {
                                      while (1) switch (_context14.prev = _context14.next) {
                                        case 0:
                                          if (!(preparationTasks.length > 0)) {
                                            _context14.next = 7;
                                            break;
                                          }
                                          task = preparationTasks.shift();
                                          if (!task) {
                                            _context14.next = 5;
                                            break;
                                          }
                                          _context14.next = 5;
                                          return task();
                                        case 5:
                                          _context14.next = 0;
                                          break;
                                        case 7:
                                        case "end":
                                          return _context14.stop();
                                      }
                                    }, _callee14);
                                  }));
                                  return function worker() {
                                    return _ref8.apply(this, arguments);
                                  };
                                }();
                                for (workerIndex = 0; workerIndex < 16; workerIndex++) {
                                  workers.push(worker());
                                }
                                _context16.next = 6;
                                return Promise.all(workers);
                              case 6:
                                _context16.next = 8;
                                return fs__namespace.promises.readdir(tmpUploadFolder);
                              case 8:
                                files = _context16.sent;
                                stats = files.map(function (file) {
                                  return fs__namespace.promises.stat(path__namespace.join(tmpUploadFolder, file));
                                });
                                _context16.next = 12;
                                return Promise.all(stats);
                              case 12:
                                uploadSize = _context16.sent.reduce(function (accumulator, _ref9) {
                                  var size = _ref9.size;
                                  return accumulator + size;
                                }, 0);
                                setMeasurement("files", files.length, "none", prepBundlesSpan);
                                setMeasurement("upload_size", uploadSize, "byte", prepBundlesSpan);
                                _context16.next = 17;
                                return startSpan({
                                  name: "upload",
                                  scope: sentryScope
                                }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee15() {
                                  var _options$release$name2;
                                  var cliInstance;
                                  return _regeneratorRuntime().wrap(function _callee15$(_context15) {
                                    while (1) switch (_context15.prev = _context15.next) {
                                      case 0:
                                        cliInstance = createCliInstance(options);
                                        _context15.next = 3;
                                        return cliInstance.releases.uploadSourceMaps((_options$release$name2 = options.release.name) !== null && _options$release$name2 !== void 0 ? _options$release$name2 : "undefined", {
                                          include: [{
                                            paths: [tmpUploadFolder],
                                            rewrite: false,
                                            dist: options.release.dist
                                          }],
                                          live: "rejectOnError"
                                        });
                                      case 3:
                                      case "end":
                                        return _context15.stop();
                                    }
                                  }, _callee15);
                                })));
                              case 17:
                              case "end":
                                return _context16.stop();
                            }
                          }, _callee16);
                        }));
                        return function (_x) {
                          return _ref6.apply(this, arguments);
                        };
                      }());
                    case 27:
                      logger.info("Successfully uploaded source maps to Sentry");
                    case 28:
                      _context18.next = 34;
                      break;
                    case 30:
                      _context18.prev = 30;
                      _context18.t0 = _context18["catch"](2);
                      sentryScope.captureException('Error in "debugIdUploadPlugin" writeBundle hook');
                      handleRecoverableError(_context18.t0, false);
                    case 34:
                      _context18.prev = 34;
                      if (folderToCleanUp && !((_process$env2 = process.env) !== null && _process$env2 !== void 0 && _process$env2["SENTRY_TEST_OVERRIDE_TEMP_DIR"])) {
                        void startSpan({
                          name: "cleanup",
                          scope: sentryScope
                        }, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
                          return _regeneratorRuntime().wrap(function _callee17$(_context17) {
                            while (1) switch (_context17.prev = _context17.next) {
                              case 0:
                                if (!folderToCleanUp) {
                                  _context17.next = 3;
                                  break;
                                }
                                _context17.next = 3;
                                return fs__namespace.promises.rm(folderToCleanUp, {
                                  recursive: true,
                                  force: true
                                });
                              case 3:
                              case "end":
                                return _context17.stop();
                            }
                          }, _callee17);
                        })));
                      }
                      freeUploadDependencyOnBuildArtifacts();
                      _context18.next = 39;
                      return safeFlushTelemetry(sentryClient);
                    case 39:
                      return _context18.finish(34);
                    case 40:
                    case "end":
                      return _context18.stop();
                  }
                }, _callee18, null, [[2, 30, 34, 40]]);
              })));
            case 8:
            case "end":
              return _context19.stop();
          }
        }, _callee19);
      }))();
    },
    /**
     * Will delete artifacts based on the passed `sourcemaps.filesToDeleteAfterUpload` option.
     */
    deleteArtifacts: function deleteArtifacts() {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
        var _options$sourcemaps9, filesToDelete, filePathsToDelete;
        return _regeneratorRuntime().wrap(function _callee20$(_context20) {
          while (1) switch (_context20.prev = _context20.next) {
            case 0:
              _context20.prev = 0;
              _context20.next = 3;
              return (_options$sourcemaps9 = options.sourcemaps) === null || _options$sourcemaps9 === void 0 ? void 0 : _options$sourcemaps9.filesToDeleteAfterUpload;
            case 3:
              filesToDelete = _context20.sent;
              if (!(filesToDelete !== undefined)) {
                _context20.next = 14;
                break;
              }
              _context20.next = 7;
              return glob.glob(filesToDelete, {
                absolute: true,
                nodir: true
              });
            case 7:
              filePathsToDelete = _context20.sent;
              logger.debug("Waiting for dependencies on generated files to be freed before deleting...");
              _context20.next = 11;
              return waitUntilBuildArtifactDependenciesAreFreed();
            case 11:
              filePathsToDelete.forEach(function (filePathToDelete) {
                logger.debug("Deleting asset after upload: ".concat(filePathToDelete));
              });
              _context20.next = 14;
              return Promise.all(filePathsToDelete.map(function (filePathToDelete) {
                return fs__namespace.promises.rm(filePathToDelete, {
                  force: true
                })["catch"](function (e) {
                  // This is allowed to fail - we just don't do anything
                  logger.debug("An error occurred while attempting to delete asset: ".concat(filePathToDelete), e);
                });
              }));
            case 14:
              _context20.next = 22;
              break;
            case 16:
              _context20.prev = 16;
              _context20.t0 = _context20["catch"](0);
              sentryScope.captureException('Error in "sentry-file-deletion-plugin" buildEnd hook');
              _context20.next = 21;
              return safeFlushTelemetry(sentryClient);
            case 21:
              // We throw by default if we get here b/c not being able to delete
              // source maps could leak them to production
              handleRecoverableError(_context20.t0, true);
            case 22:
            case "end":
              return _context20.stop();
          }
        }, _callee20, null, [[0, 16]]);
      }))();
    },
    createDependencyOnBuildArtifacts: createDependencyOnBuildArtifacts
  };
}
function canUploadSourceMaps(options, logger, isDevMode) {
  var _options$sourcemaps10;
  if ((_options$sourcemaps10 = options.sourcemaps) !== null && _options$sourcemaps10 !== void 0 && _options$sourcemaps10.disable) {
    logger.debug("Source map upload was disabled. Will not upload sourcemaps using debug ID process.");
    return false;
  }
  if (isDevMode) {
    logger.debug("Running in development mode. Will not upload sourcemaps.");
    return false;
  }
  if (!options.authToken) {
    logger.warn("No auth token provided. Will not upload source maps. Please set the `authToken` option. You can find information on how to generate a Sentry auth token here: https://docs.sentry.io/api/auth/" + getTurborepoEnvPassthroughWarning("SENTRY_AUTH_TOKEN"));
    return false;
  }
  if (!options.org && !options.authToken.startsWith("sntrys_")) {
    logger.warn("No org provided. Will not upload source maps. Please set the `org` option to your Sentry organization slug." + getTurborepoEnvPassthroughWarning("SENTRY_ORG"));
    return false;
  }
  if (!options.project) {
    logger.warn("No project provided. Will not upload source maps. Please set the `project` option to your Sentry project slug." + getTurborepoEnvPassthroughWarning("SENTRY_PROJECT"));
    return false;
  }
  return true;
}

/**
 * Creates an unplugin instance used to create Sentry plugins for Vite, Rollup, esbuild, and Webpack.
 */
function sentryUnpluginFactory(_ref) {
  var releaseInjectionPlugin = _ref.releaseInjectionPlugin,
    componentNameAnnotatePlugin = _ref.componentNameAnnotatePlugin,
    moduleMetadataInjectionPlugin = _ref.moduleMetadataInjectionPlugin,
    debugIdInjectionPlugin = _ref.debugIdInjectionPlugin,
    debugIdUploadPlugin = _ref.debugIdUploadPlugin,
    bundleSizeOptimizationsPlugin = _ref.bundleSizeOptimizationsPlugin;
  return unplugin.createUnplugin(function () {
    var _userOptions$_metaOpt, _userOptions$_metaOpt2, _options$sourcemaps;
    var userOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var unpluginMetaContext = arguments.length > 1 ? arguments[1] : undefined;
    var sentryBuildPluginManager = createSentryBuildPluginManager(userOptions, {
      loggerPrefix: (_userOptions$_metaOpt = (_userOptions$_metaOpt2 = userOptions._metaOptions) === null || _userOptions$_metaOpt2 === void 0 ? void 0 : _userOptions$_metaOpt2.loggerPrefixOverride) !== null && _userOptions$_metaOpt !== void 0 ? _userOptions$_metaOpt : "[sentry-".concat(unpluginMetaContext.framework, "-plugin]"),
      buildTool: unpluginMetaContext.framework
    });
    var logger = sentryBuildPluginManager.logger,
      options = sentryBuildPluginManager.normalizedOptions,
      bundleSizeOptimizationReplacementValues = sentryBuildPluginManager.bundleSizeOptimizationReplacementValues;
    if (options.disable) {
      return [{
        name: "sentry-noop-plugin"
      }];
    }
    if (process.cwd().match(/\\node_modules\\|\/node_modules\//)) {
      logger.warn("Running Sentry plugin from within a `node_modules` folder. Some features may not work.");
    }
    var plugins = [];

    // Add plugin to emit a telemetry signal when the build starts
    plugins.push({
      name: "sentry-telemetry-plugin",
      buildStart: function buildStart() {
        return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return sentryBuildPluginManager.telemetry.emitBundlerPluginExecutionSignal();
              case 2:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }))();
      }
    });
    if (Object.keys(bundleSizeOptimizationReplacementValues).length > 0) {
      plugins.push(bundleSizeOptimizationsPlugin(bundleSizeOptimizationReplacementValues));
    }
    if (!options.release.inject) {
      logger.debug("Release injection disabled via `release.inject` option. Will not inject release.");
    } else if (!options.release.name) {
      logger.debug("No release name provided. Will not inject release. Please set the `release.name` option to identify your release.");
    } else {
      var _injectionCode = generateGlobalInjectorCode({
        release: options.release.name,
        injectBuildInformation: options._experiments.injectBuildInformation || false
      });
      plugins.push(releaseInjectionPlugin(_injectionCode));
    }
    if (Object.keys(sentryBuildPluginManager.bundleMetadata).length > 0) {
      var _injectionCode2 = generateModuleMetadataInjectorCode(sentryBuildPluginManager.bundleMetadata);
      plugins.push(moduleMetadataInjectionPlugin(_injectionCode2));
    }

    // Add plugin to create and finalize releases, and also take care of adding commits and legacy sourcemaps
    var freeGlobalDependencyOnBuildArtifacts = sentryBuildPluginManager.createDependencyOnBuildArtifacts();
    plugins.push({
      name: "sentry-release-management-plugin",
      writeBundle: function writeBundle() {
        return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                _context2.prev = 0;
                _context2.next = 3;
                return sentryBuildPluginManager.createRelease();
              case 3:
                _context2.prev = 3;
                freeGlobalDependencyOnBuildArtifacts();
                return _context2.finish(3);
              case 6:
              case "end":
                return _context2.stop();
            }
          }, _callee2, null, [[0,, 3, 6]]);
        }))();
      }
    });
    if (((_options$sourcemaps = options.sourcemaps) === null || _options$sourcemaps === void 0 ? void 0 : _options$sourcemaps.disable) !== true) {
      var _options$sourcemaps2;
      plugins.push(debugIdInjectionPlugin(logger));
      if (((_options$sourcemaps2 = options.sourcemaps) === null || _options$sourcemaps2 === void 0 ? void 0 : _options$sourcemaps2.disable) !== "disable-upload") {
        // This option is only strongly typed for the webpack plugin, where it is used. It has no effect on other plugins
        var _webpack_forceExitOnBuildComplete = typeof options._experiments["forceExitOnBuildCompletion"] === "boolean" ? options._experiments["forceExitOnBuildCompletion"] : undefined;
        plugins.push(debugIdUploadPlugin(createDebugIdUploadFunction({
          sentryBuildPluginManager: sentryBuildPluginManager
        }), logger, sentryBuildPluginManager.createDependencyOnBuildArtifacts, _webpack_forceExitOnBuildComplete));
      }
    }
    if (options.reactComponentAnnotation) {
      if (!options.reactComponentAnnotation.enabled) {
        logger.debug("The component name annotate plugin is currently disabled. Skipping component name annotations.");
      } else if (options.reactComponentAnnotation.enabled && !componentNameAnnotatePlugin) {
        logger.warn("The component name annotate plugin is currently not supported by '@sentry/esbuild-plugin'");
      } else {
        componentNameAnnotatePlugin && plugins.push(componentNameAnnotatePlugin(options.reactComponentAnnotation.ignoredComponents));
      }
    }

    // Add plugin to delete unwanted artifacts like source maps after the uploads have completed
    plugins.push({
      name: "sentry-file-deletion-plugin",
      writeBundle: function writeBundle() {
        return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
            while (1) switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return sentryBuildPluginManager.deleteArtifacts();
              case 2:
              case "end":
                return _context3.stop();
            }
          }, _callee3);
        }))();
      }
    });
    return plugins;
  });
}

/**
 * Determines whether the Sentry CLI binary is in its expected location.
 * This function is useful since `@sentry/cli` installs the binary via a post-install
 * script and post-install scripts may not always run. E.g. with `npm i --ignore-scripts`.
 */
function sentryCliBinaryExists() {
  return fs__namespace.existsSync(SentryCli__default["default"].getPath());
}

// We need to be careful not to inject the snippet before any `"use strict";`s.
// As an additional complication `"use strict";`s may come after any number of comments.
var COMMENT_USE_STRICT_REGEX =
// Note: CodeQL complains that this regex potentially has n^2 runtime. This likely won't affect realistic files.
/^(?:\s*|\/\*(?:.|\r|\n)*?\*\/|\/\/.*[\n\r])*(?:"[^"]*";|'[^']*';)?/;

/**
 * Simplified `renderChunk` hook type from Rollup.
 * We can't reference the type directly because the Vite plugin complains
 * about type mismatches
 */

function createRollupReleaseInjectionHooks(injectionCode) {
  return {
    renderChunk: function renderChunk(code, chunk) {
      if (
      // chunks could be any file (html, md, ...)
      [".js", ".mjs", ".cjs"].some(function (ending) {
        return stripQueryAndHashFromPath(chunk.fileName).endsWith(ending);
      })) {
        var _code$match;
        var ms = new MagicString__default["default"](code, {
          filename: chunk.fileName
        });
        var match = (_code$match = code.match(COMMENT_USE_STRICT_REGEX)) === null || _code$match === void 0 ? void 0 : _code$match[0];
        if (match) {
          // Add injected code after any comments or "use strict" at the beginning of the bundle.
          ms.appendLeft(match.length, injectionCode);
        } else {
          // ms.replace() doesn't work when there is an empty string match (which happens if
          // there is neither, a comment, nor a "use strict" at the top of the chunk) so we
          // need this special case here.
          ms.prepend(injectionCode);
        }
        return {
          code: ms.toString(),
          map: ms.generateMap({
            file: chunk.fileName,
            hires: "boundary"
          })
        };
      } else {
        return null; // returning null means not modifying the chunk at all
      }
    }
  };
}

function createRollupBundleSizeOptimizationHooks(replacementValues) {
  return {
    transform: function transform(code) {
      return replaceBooleanFlagsInCode(code, replacementValues);
    }
  };
}
function createRollupDebugIdInjectionHooks() {
  return {
    renderChunk: function renderChunk(code, chunk) {
      if (
      // chunks could be any file (html, md, ...)
      [".js", ".mjs", ".cjs"].some(function (ending) {
        return stripQueryAndHashFromPath(chunk.fileName).endsWith(ending);
      })) {
        var _code$match2;
        var debugId = stringToUUID(code); // generate a deterministic debug ID
        var codeToInject = getDebugIdSnippet(debugId);
        var ms = new MagicString__default["default"](code, {
          filename: chunk.fileName
        });
        var match = (_code$match2 = code.match(COMMENT_USE_STRICT_REGEX)) === null || _code$match2 === void 0 ? void 0 : _code$match2[0];
        if (match) {
          // Add injected code after any comments or "use strict" at the beginning of the bundle.
          ms.appendLeft(match.length, codeToInject);
        } else {
          // ms.replace() doesn't work when there is an empty string match (which happens if
          // there is neither, a comment, nor a "use strict" at the top of the chunk) so we
          // need this special case here.
          ms.prepend(codeToInject);
        }
        return {
          code: ms.toString(),
          map: ms.generateMap({
            file: chunk.fileName,
            hires: "boundary"
          })
        };
      } else {
        return null; // returning null means not modifying the chunk at all
      }
    }
  };
}

function createRollupModuleMetadataInjectionHooks(injectionCode) {
  return {
    renderChunk: function renderChunk(code, chunk) {
      if (
      // chunks could be any file (html, md, ...)
      [".js", ".mjs", ".cjs"].some(function (ending) {
        return stripQueryAndHashFromPath(chunk.fileName).endsWith(ending);
      })) {
        var _code$match3;
        var ms = new MagicString__default["default"](code, {
          filename: chunk.fileName
        });
        var match = (_code$match3 = code.match(COMMENT_USE_STRICT_REGEX)) === null || _code$match3 === void 0 ? void 0 : _code$match3[0];
        if (match) {
          // Add injected code after any comments or "use strict" at the beginning of the bundle.
          ms.appendLeft(match.length, injectionCode);
        } else {
          // ms.replace() doesn't work when there is an empty string match (which happens if
          // there is neither, a comment, nor a "use strict" at the top of the chunk) so we
          // need this special case here.
          ms.prepend(injectionCode);
        }
        return {
          code: ms.toString(),
          map: ms.generateMap({
            file: chunk.fileName,
            hires: "boundary"
          })
        };
      } else {
        return null; // returning null means not modifying the chunk at all
      }
    }
  };
}

function createRollupDebugIdUploadHooks(upload, _logger, createDependencyOnBuildArtifacts) {
  var freeGlobalDependencyOnDebugIdSourcemapArtifacts = createDependencyOnBuildArtifacts();
  return {
    writeBundle: function writeBundle(outputOptions, bundle) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
        var outputDir, _buildArtifacts, _buildArtifacts2;
        return _regeneratorRuntime().wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              if (!outputOptions.dir) {
                _context4.next = 10;
                break;
              }
              outputDir = outputOptions.dir;
              _context4.next = 5;
              return glob.glob(["/**/*.js", "/**/*.mjs", "/**/*.cjs", "/**/*.js.map", "/**/*.mjs.map", "/**/*.cjs.map"].map(function (q) {
                return "".concat(q, "?(\\?*)?(#*)");
              }),
              // We want to allow query and hashes strings at the end of files
              {
                root: outputDir,
                absolute: true,
                nodir: true
              });
            case 5:
              _buildArtifacts = _context4.sent;
              _context4.next = 8;
              return upload(_buildArtifacts);
            case 8:
              _context4.next = 18;
              break;
            case 10:
              if (!outputOptions.file) {
                _context4.next = 15;
                break;
              }
              _context4.next = 13;
              return upload([outputOptions.file]);
            case 13:
              _context4.next = 18;
              break;
            case 15:
              _buildArtifacts2 = Object.keys(bundle).map(function (asset) {
                return path__namespace.join(path__namespace.resolve(), asset);
              });
              _context4.next = 18;
              return upload(_buildArtifacts2);
            case 18:
              _context4.prev = 18;
              freeGlobalDependencyOnDebugIdSourcemapArtifacts();
              return _context4.finish(18);
            case 21:
            case "end":
              return _context4.stop();
          }
        }, _callee4, null, [[0,, 18, 21]]);
      }))();
    }
  };
}
function createComponentNameAnnotateHooks(ignoredComponents) {
  return {
    transform: function transform(code, id) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
        var idWithoutQueryAndHash, parserPlugins, _result$code, result;
        return _regeneratorRuntime().wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              // id may contain query and hash which will trip up our file extension logic below
              idWithoutQueryAndHash = stripQueryAndHashFromPath(id);
              if (!idWithoutQueryAndHash.match(/\\node_modules\\|\/node_modules\//)) {
                _context5.next = 3;
                break;
              }
              return _context5.abrupt("return", null);
            case 3:
              if ([".jsx", ".tsx"].some(function (ending) {
                return idWithoutQueryAndHash.endsWith(ending);
              })) {
                _context5.next = 5;
                break;
              }
              return _context5.abrupt("return", null);
            case 5:
              parserPlugins = [];
              if (idWithoutQueryAndHash.endsWith(".jsx")) {
                parserPlugins.push("jsx");
              } else if (idWithoutQueryAndHash.endsWith(".tsx")) {
                parserPlugins.push("jsx", "typescript");
              }
              _context5.prev = 7;
              _context5.next = 10;
              return core.transformAsync(code, {
                plugins: [[componentNameAnnotatePlugin__default["default"], {
                  ignoredComponents: ignoredComponents
                }]],
                filename: id,
                parserOpts: {
                  sourceType: "module",
                  allowAwaitOutsideFunction: true,
                  plugins: parserPlugins
                },
                generatorOpts: {
                  decoratorsBeforeExport: true
                },
                sourceMaps: true
              });
            case 10:
              result = _context5.sent;
              return _context5.abrupt("return", {
                code: (_result$code = result === null || result === void 0 ? void 0 : result.code) !== null && _result$code !== void 0 ? _result$code : code,
                map: result === null || result === void 0 ? void 0 : result.map
              });
            case 14:
              _context5.prev = 14;
              _context5.t0 = _context5["catch"](7);
              logger.error("Failed to apply react annotate plugin", _context5.t0);
            case 17:
              return _context5.abrupt("return", {
                code: code
              });
            case 18:
            case "end":
              return _context5.stop();
          }
        }, _callee5, null, [[7, 14]]);
      }))();
    }
  };
}
function getDebugIdSnippet(debugId) {
  return ";{try{(function(){var e=\"undefined\"!=typeof window?window:\"undefined\"!=typeof global?global:\"undefined\"!=typeof globalThis?globalThis:\"undefined\"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]=\"".concat(debugId, "\",e._sentryDebugIdIdentifier=\"sentry-dbid-").concat(debugId, "\");})();}catch(e){}};");
}

exports.createComponentNameAnnotateHooks = createComponentNameAnnotateHooks;
exports.createRollupBundleSizeOptimizationHooks = createRollupBundleSizeOptimizationHooks;
exports.createRollupDebugIdInjectionHooks = createRollupDebugIdInjectionHooks;
exports.createRollupDebugIdUploadHooks = createRollupDebugIdUploadHooks;
exports.createRollupModuleMetadataInjectionHooks = createRollupModuleMetadataInjectionHooks;
exports.createRollupReleaseInjectionHooks = createRollupReleaseInjectionHooks;
exports.createSentryBuildPluginManager = createSentryBuildPluginManager;
exports.getDebugIdSnippet = getDebugIdSnippet;
exports.replaceBooleanFlagsInCode = replaceBooleanFlagsInCode;
exports.sentryCliBinaryExists = sentryCliBinaryExists;
exports.sentryUnpluginFactory = sentryUnpluginFactory;
exports.stringToUUID = stringToUUID;
//# sourceMappingURL=index.js.map
