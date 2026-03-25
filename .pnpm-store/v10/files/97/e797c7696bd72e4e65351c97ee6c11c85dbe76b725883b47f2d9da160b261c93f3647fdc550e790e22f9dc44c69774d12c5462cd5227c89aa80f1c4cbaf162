"use strict";
exports.__esModule = undefined;
exports.__esModule = true;

// Misc helpers

var objectSetPrototypeOfIsDefined = typeof Object.setPrototypeOf === "function";
var objectGetPrototypeOfIsDefined = typeof Object.getPrototypeOf === "function";
var objectDefinePropertyIsDefined = typeof Object.defineProperty === "function";
var objectCreateIsDefined = typeof Object.create === "function";
var objectHasOwnPropertyIsDefined =
  typeof Object.prototype.hasOwnProperty === "function";

var setPrototypeOf = function setPrototypeOf(target, prototype) {
  if (objectSetPrototypeOfIsDefined) {
    Object.setPrototypeOf(target, prototype);
  } else {
    target.__proto__ = prototype;
  }
};
exports.setPrototypeOf = setPrototypeOf;

var getPrototypeOf = function getPrototypeOf(target) {
  if (objectGetPrototypeOfIsDefined) {
    return Object.getPrototypeOf(target);
  } else {
    return target.__proto__ || target.prototype;
  }
};
exports.getPrototypeOf = getPrototypeOf;

// Object.defineProperty exists in IE8, but the implementation is buggy, so we
// need to test if the call fails, and, if so, set a flag to use the shim, as if
// the function were not defined. When this error is caught the first time, the
// function is called again recursively, after the flag is set, so the desired
// effect is achieved anyway.
var ie8ObjectDefinePropertyBug = false;
var defineProperty = function defineProperty(target, name, propertyDescriptor) {
  if (objectDefinePropertyIsDefined && !ie8ObjectDefinePropertyBug) {
    try {
      Object.defineProperty(target, name, propertyDescriptor);
    } catch (e) {
      ie8ObjectDefinePropertyBug = true;
      defineProperty(target, name, propertyDescriptor);
    }
  } else {
    target[name] = propertyDescriptor.value;
  }
};
exports.defineProperty = defineProperty;

var hasOwnProperty = function hasOwnProperty(target, name) {
  if (objectHasOwnPropertyIsDefined) {
    return target.hasOwnProperty(target, name);
  } else {
    return target[name] === undefined;
  }
};
exports.hasOwnProperty = hasOwnProperty;

var objectCreate = function objectCreate(prototype, propertyDescriptors) {
  if (objectCreateIsDefined) {
    return Object.create(prototype, propertyDescriptors);
  } else {
    var F = function F() {};
    F.prototype = prototype;
    var result = new F();
    if (typeof propertyDescriptors === "undefined") {
      return result;
    }
    if (typeof propertyDescriptors === "null") {
      throw new Error("PropertyDescriptors must not be null.");
    }
    if (typeof propertyDescriptors === "object") {
      for (var key in propertyDescriptors) {
        if (hasOwnProperty(propertyDescriptors, key)) {
          result[key] = propertyDescriptors[key].value;
        }
      }
    }

    return result;
  }
};
exports.objectCreate = objectCreate;
