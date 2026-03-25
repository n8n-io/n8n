"use strict";
exports.__esModule = undefined;
exports.__esModule = true;

var helpers = require("./helpers");
var setPrototypeOf = helpers.setPrototypeOf;
var getPrototypeOf = helpers.getPrototypeOf;
var defineProperty = helpers.defineProperty;
var objectCreate = helpers.objectCreate;

// Small test for IE6-8, which checks if the environment prints errors "nicely"
// If not, a toString() method to be added to the error objects with formatting
// like in more modern browsers
var uglyErrorPrinting = new Error().toString() === "[object Error]";

// For compatibility
var extendableErrorName = "";

function ExtendableError(message) {
  // Get the constructor
  var originalConstructor = this.constructor;
  // Get the constructor name from the non-standard name property. If undefined
  // (on old IEs), it uses the string representation of the function to extract
  // the name. This should work in all cases, except for directly instantiated
  // ExtendableError objects, for which the name of the ExtendableError class /
  // function is used
  var constructorName =
    originalConstructor.name ||
    (function () {
      var constructorNameMatch = originalConstructor
        .toString()
        .match(/^function\s*([^\s(]+)/);
      return constructorNameMatch === null
        ? extendableErrorName
          ? extendableErrorName
          : "Error"
        : constructorNameMatch[1];
    })();
  // If the constructor name is "Error", ...
  var constructorNameIsError = constructorName === "Error";
  // change it to the name of the ExtendableError class / function
  var name = constructorNameIsError ? extendableErrorName : constructorName;

  // Obtain a new Error instance. This also sets the message property already.
  var instance = Error.apply(this, arguments);

  // Set the prototype of this to the prototype of instance
  setPrototypeOf(instance, getPrototypeOf(this));

  // On old IEs, the instance will not extend our subclasses this way. The fix is to use this from the function call instead.
  if (
    !(instance instanceof originalConstructor) ||
    !(instance instanceof ExtendableError)
  ) {
    var instance = this;
    Error.apply(this, arguments);
    defineProperty(instance, "message", {
      configurable: true,
      enumerable: false,
      value: message,
      writable: true,
    });
  }

  // define the name property
  defineProperty(instance, "name", {
    configurable: true,
    enumerable: false,
    value: name,
    writable: true,
  });

  // Use Error.captureStackTrace on V8 to capture the proper stack trace excluding any of our error classes
  if (Error.captureStackTrace) {
    // prettier-ignore
    Error.captureStackTrace(
      instance,
      constructorNameIsError ? ExtendableError : originalConstructor
    );
  }
  // instance.stack can still be undefined, in which case the best solution is to create a new Error object and get it from there
  if (instance.stack === undefined) {
    var err = new Error(message);
    err.name = instance.name;
    instance.stack = err.stack;
  }

  // If the environment does not have a proper string representation (IE), provide an alternative toString()
  if (uglyErrorPrinting) {
    defineProperty(instance, "toString", {
      configurable: true,
      enumerable: false,
      value: function toString() {
        return (
          (this.name || "Error") +
          (typeof this.message === "undefined" ? "" : ": " + this.message)
        );
      },
      writable: true,
    });
  }

  // We're done!
  return instance;
}

// Get the name of the ExtendableError function or use the string literal
extendableErrorName = ExtendableError.name || "ExtendableError";

// Set the prototype of ExtendableError to an Error object
ExtendableError.prototype = objectCreate(Error.prototype, {
  constructor: {
    value: Error,
    enumerable: false,
    writable: true,
    configurable: true,
  },
});

// Export
exports.ExtendableError = ExtendableError;
exports["default"] = exports.ExtendableError;
