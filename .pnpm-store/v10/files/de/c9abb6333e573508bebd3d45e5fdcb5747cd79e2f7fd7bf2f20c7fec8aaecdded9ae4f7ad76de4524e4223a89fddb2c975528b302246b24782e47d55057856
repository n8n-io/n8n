'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;

  _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;

  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;

    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }

    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);

      _cache.set(Class, Wrapper);
    }

    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };

  return _wrapNativeSuper(Class);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

var _ref, _Symbol$asyncIterator;

/* eslint-disable unicorn/custom-error-definition, promise/always-return */

/* global setImmediate:false, clearImmediate:false */
var symbolAsyncIterator = (_ref = (_Symbol$asyncIterator = Symbol == null ? void 0 : Symbol.asyncIterator) != null ? _Symbol$asyncIterator : Symbol == null ? void 0 : Symbol.iterator) != null ? _ref : '@@asyncIterator';

var ERR_INVALID_ARG_TYPE = /*#__PURE__*/function (_Error) {
  _inheritsLoose(ERR_INVALID_ARG_TYPE, _Error);

  function ERR_INVALID_ARG_TYPE(name, expected, actual) {
    var _this;

    _this = _Error.call(this, name + " must be " + expected + ", " + typeof actual + " given") || this;
    _this.name = _this.constructor.name;
    _this.message = name + " must be " + expected + ", " + typeof actual + " given";

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(_assertThisInitialized(_this), _this.constructor);
    } else {
      _this.stack = new Error(name + " must be " + expected + ", " + typeof actual + " given").stack;
    }

    _this.code = 'ERR_INVALID_ARG_TYPE';
    return _this;
  }

  return ERR_INVALID_ARG_TYPE;
}( /*#__PURE__*/_wrapNativeSuper(Error));

var AbortError = /*#__PURE__*/function (_Error2) {
  _inheritsLoose(AbortError, _Error2);

  function AbortError() {
    var _this2;

    _this2 = _Error2.call(this, 'The operation was aborted') || this;
    _this2.name = _this2.constructor.name;
    _this2.message = 'The operation was aborted';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(_assertThisInitialized(_this2), _this2.constructor);
    } else {
      _this2.stack = new Error('The operation was aborted').stack;
    }

    _this2.code = 'ABORT_ERR';
    return _this2;
  }

  return AbortError;
}( /*#__PURE__*/_wrapNativeSuper(Error));

function validateObject(object, name) {
  if (object === null || typeof object !== 'object') {
    throw new ERR_INVALID_ARG_TYPE(name, 'Object', object);
  }
}

function validateBoolean(value, name) {
  if (typeof value !== 'boolean') {
    throw new ERR_INVALID_ARG_TYPE(name, 'boolean', value);
  }
}

function validateAbortSignal(signal, name) {
  if (typeof signal !== 'undefined' && (signal === null || typeof signal !== 'object' || !('aborted' in signal))) {
    throw new ERR_INVALID_ARG_TYPE(name, 'AbortSignal', signal);
  }
}

function asyncIterator(_ref2) {
  var nextFunction = _ref2.next,
      returnFunction = _ref2["return"];
  var result = {};

  if (typeof nextFunction === 'function') {
    result.next = nextFunction;
  }

  if (typeof returnFunction === 'function') {
    result["return"] = returnFunction;
  }

  result[symbolAsyncIterator] = function () {
    return this;
  };

  return result;
}

function setTimeoutPromise(after, value, options) {
  if (after === void 0) {
    after = 1;
  }

  if (options === void 0) {
    options = {};
  }

  var arguments_ = [].concat(value != null ? value : []);

  try {
    validateObject(options, 'options');
  } catch (error) {
    return Promise.reject(error);
  }

  var _options = options,
      signal = _options.signal,
      _options$ref = _options.ref,
      reference = _options$ref === void 0 ? true : _options$ref;

  try {
    validateAbortSignal(signal, 'options.signal');
  } catch (error) {
    return Promise.reject(error);
  }

  try {
    validateBoolean(reference, 'options.ref');
  } catch (error) {
    return Promise.reject(error);
  }

  if (signal != null && signal.aborted) {
    return Promise.reject(new AbortError());
  }

  var onCancel;
  var returnValue = new Promise(function (resolve, reject) {
    var timeout = setTimeout.apply(void 0, [function () {
      return resolve(value);
    }, after].concat(arguments_));

    if (!reference) {
      timeout == null ? void 0 : timeout.unref == null ? void 0 : timeout.unref();
    }

    if (signal) {
      onCancel = function onCancel() {
        clearTimeout(timeout);
        reject(new AbortError());
      };

      signal.addEventListener('abort', onCancel);
    }
  });

  if (typeof onCancel !== 'undefined') {
    returnValue["finally"](function () {
      return signal.removeEventListener('abort', onCancel);
    });
  }

  return returnValue;
}

function setImmediatePromise(value, options) {
  if (options === void 0) {
    options = {};
  }

  try {
    validateObject(options, 'options');
  } catch (error) {
    return Promise.reject(error);
  }

  var _options2 = options,
      signal = _options2.signal,
      _options2$ref = _options2.ref,
      reference = _options2$ref === void 0 ? true : _options2$ref;

  try {
    validateAbortSignal(signal, 'options.signal');
  } catch (error) {
    return Promise.reject(error);
  }

  try {
    validateBoolean(reference, 'options.ref');
  } catch (error) {
    return Promise.reject(error);
  }

  if (signal != null && signal.aborted) {
    return Promise.reject(new AbortError());
  }

  var onCancel;
  var returnValue = new Promise(function (resolve, reject) {
    var immediate = setImmediate(function () {
      return resolve(value);
    });

    if (!reference) {
      immediate == null ? void 0 : immediate.unref == null ? void 0 : immediate.unref();
    }

    if (signal) {
      onCancel = function onCancel() {
        clearImmediate(immediate);
        reject(new AbortError());
      };

      signal.addEventListener('abort', onCancel);
    }
  });

  if (typeof onCancel !== 'undefined') {
    returnValue["finally"](function () {
      return signal.removeEventListener('abort', onCancel);
    });
  }

  return returnValue;
}

function setIntervalPromise(after, value, options) {
  if (after === void 0) {
    after = 1;
  }

  if (options === void 0) {
    options = {};
  }

  /* eslint-disable no-undefined, no-unreachable-loop, no-loop-func */
  try {
    validateObject(options, 'options');
  } catch (error) {
    return asyncIterator({
      next: function next() {
        return Promise.reject(error);
      }
    });
  }

  var _options3 = options,
      signal = _options3.signal,
      _options3$ref = _options3.ref,
      reference = _options3$ref === void 0 ? true : _options3$ref;

  try {
    validateAbortSignal(signal, 'options.signal');
  } catch (error) {
    return asyncIterator({
      next: function next() {
        return Promise.reject(error);
      }
    });
  }

  try {
    validateBoolean(reference, 'options.ref');
  } catch (error) {
    return asyncIterator({
      next: function next() {
        return Promise.reject(error);
      }
    });
  }

  if (signal != null && signal.aborted) {
    return asyncIterator({
      next: function next() {
        return Promise.reject(new AbortError());
      }
    });
  }

  var onCancel, interval;

  try {
    var notYielded = 0;
    var callback;
    interval = setInterval(function () {
      notYielded++;

      if (callback) {
        callback();
        callback = undefined;
      }
    }, after);

    if (!reference) {
      var _interval;

      (_interval = interval) == null ? void 0 : _interval.unref == null ? void 0 : _interval.unref();
    }

    if (signal) {
      onCancel = function onCancel() {
        clearInterval(interval);

        if (callback) {
          callback();
          callback = undefined;
        }
      };

      signal.addEventListener('abort', onCancel);
    }

    return asyncIterator({
      next: function next() {
        return new Promise(function (resolve, reject) {
          if (!(signal != null && signal.aborted)) {
            if (notYielded === 0) {
              callback = resolve;
            } else {
              resolve();
            }
          } else if (notYielded === 0) {
            reject(new AbortError());
          } else {
            resolve();
          }
        }).then(function () {
          if (notYielded > 0) {
            notYielded = notYielded - 1;
            return {
              done: false,
              value: value
            };
          }

          return {
            done: true
          };
        });
      },
      "return": function _return() {
        clearInterval(interval);
        signal == null ? void 0 : signal.removeEventListener('abort', onCancel);
        return Promise.resolve({});
      }
    });
  } catch (error) {
    return asyncIterator({
      next: function next() {
        clearInterval(interval);
        signal == null ? void 0 : signal.removeEventListener('abort', onCancel);
      }
    });
  }
}

exports.setImmediate = setImmediatePromise;
exports.setInterval = setIntervalPromise;
exports.setTimeout = setTimeoutPromise;
//# sourceMappingURL=index.js.map
