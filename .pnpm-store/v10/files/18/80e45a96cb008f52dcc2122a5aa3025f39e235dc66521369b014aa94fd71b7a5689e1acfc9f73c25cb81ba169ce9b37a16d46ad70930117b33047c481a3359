// ISC @ Julien Fontanet

"use strict";

// ===================================================================

var construct = typeof Reflect !== "undefined" ? Reflect.construct : undefined;
var defineProperty = Object.defineProperty;

// -------------------------------------------------------------------

var captureStackTrace = Error.captureStackTrace;
if (captureStackTrace === undefined) {
  captureStackTrace = function captureStackTrace(error) {
    var container = new Error();

    defineProperty(error, "stack", {
      configurable: true,
      get: function getStack() {
        var stack = container.stack;

        // Replace property with value for faster future accesses.
        defineProperty(this, "stack", {
          configurable: true,
          value: stack,
          writable: true,
        });

        return stack;
      },
      set: function setStack(stack) {
        defineProperty(error, "stack", {
          configurable: true,
          value: stack,
          writable: true,
        });
      },
    });
  };
}

// -------------------------------------------------------------------

function BaseError(message) {
  if (message !== undefined) {
    defineProperty(this, "message", {
      configurable: true,
      value: message,
      writable: true,
    });
  }

  var cname = this.constructor.name;
  if (cname !== undefined && cname !== this.name) {
    defineProperty(this, "name", {
      configurable: true,
      value: cname,
      writable: true,
    });
  }

  captureStackTrace(this, this.constructor);
}

BaseError.prototype = Object.create(Error.prototype, {
  // See: https://github.com/JsCommunity/make-error/issues/4
  constructor: {
    configurable: true,
    value: BaseError,
    writable: true,
  },
});

// -------------------------------------------------------------------

// Sets the name of a function if possible (depends of the JS engine).
var setFunctionName = (function() {
  function setFunctionName(fn, name) {
    return defineProperty(fn, "name", {
      configurable: true,
      value: name,
    });
  }
  try {
    var f = function() {};
    setFunctionName(f, "foo");
    if (f.name === "foo") {
      return setFunctionName;
    }
  } catch (_) {}
})();

// -------------------------------------------------------------------

function makeError(constructor, super_) {
  if (super_ == null || super_ === Error) {
    super_ = BaseError;
  } else if (typeof super_ !== "function") {
    throw new TypeError("super_ should be a function");
  }

  var name;
  if (typeof constructor === "string") {
    name = constructor;
    constructor =
      construct !== undefined
        ? function() {
            return construct(super_, arguments, this.constructor);
          }
        : function() {
            super_.apply(this, arguments);
          };

    // If the name can be set, do it once and for all.
    if (setFunctionName !== undefined) {
      setFunctionName(constructor, name);
      name = undefined;
    }
  } else if (typeof constructor !== "function") {
    throw new TypeError("constructor should be either a string or a function");
  }

  // Also register the super constructor also as `constructor.super_` just
  // like Node's `util.inherits()`.
  //
  // eslint-disable-next-line dot-notation
  constructor.super_ = constructor["super"] = super_;

  var properties = {
    constructor: {
      configurable: true,
      value: constructor,
      writable: true,
    },
  };

  // If the name could not be set on the constructor, set it on the
  // prototype.
  if (name !== undefined) {
    properties.name = {
      configurable: true,
      value: name,
      writable: true,
    };
  }
  constructor.prototype = Object.create(super_.prototype, properties);

  return constructor;
}
exports = module.exports = makeError;
exports.BaseError = BaseError;
