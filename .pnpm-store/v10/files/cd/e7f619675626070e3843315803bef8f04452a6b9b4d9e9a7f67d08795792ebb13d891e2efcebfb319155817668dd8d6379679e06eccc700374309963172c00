var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
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

// src/helpers.js
import {
  getChildren,
  getErrors,
  getSiblings,
  isAnyOfError,
  isEnumError,
  isRequiredError,
  concatAll,
  notUndefined
} from "./utils.mjs";
import {
  AdditionalPropValidationError,
  RequiredValidationError,
  EnumValidationError,
  DefaultValidationError
} from "./validation-errors/index.mjs";
var JSON_POINTERS_REGEX = /\/[\w_-]+(\/\d+)?/g;
function makeTree(ajvErrors = []) {
  const root = { children: {} };
  ajvErrors.forEach((ajvError) => {
    const instancePath = typeof ajvError.instancePath !== "undefined" ? ajvError.instancePath : ajvError.dataPath;
    const paths = instancePath === "" ? [""] : instancePath.match(JSON_POINTERS_REGEX);
    paths && paths.reduce((obj, path, i) => {
      obj.children[path] = obj.children[path] || { children: {}, errors: [] };
      if (i === paths.length - 1) {
        obj.children[path].errors.push(ajvError);
      }
      return obj.children[path];
    }, root);
  });
  return root;
}
function filterRedundantErrors(root, parent, key) {
  getErrors(root).forEach((error) => {
    if (isRequiredError(error)) {
      root.errors = [error];
      root.children = {};
    }
  });
  if (getErrors(root).some(isAnyOfError)) {
    if (Object.keys(root.children).length > 0) {
      delete root.errors;
    }
  }
  if (root.errors && root.errors.length && getErrors(root).every(isEnumError)) {
    if (getSiblings(parent)(root).filter(notUndefined).some(getErrors)) {
      delete parent.children[key];
    }
  }
  Object.entries(root.children).forEach(([key2, child]) => filterRedundantErrors(child, root, key2));
}
function createErrorInstances(root, options) {
  const errors = getErrors(root);
  if (errors.length && errors.every(isEnumError)) {
    const uniqueValues = new Set(concatAll([])(errors.map((e) => e.params.allowedValues)));
    const allowedValues = [...uniqueValues];
    const error = errors[0];
    return [
      new EnumValidationError(__spreadProps(__spreadValues({}, error), {
        params: { allowedValues }
      }), options)
    ];
  } else {
    return concatAll(errors.reduce((ret, error) => {
      switch (error.keyword) {
        case "additionalProperties":
          return ret.concat(new AdditionalPropValidationError(error, options));
        case "required":
          return ret.concat(new RequiredValidationError(error, options));
        default:
          return ret.concat(new DefaultValidationError(error, options));
      }
    }, []))(getChildren(root).map((child) => createErrorInstances(child, options)));
  }
}
var helpers_default = (ajvErrors, options) => {
  const tree = makeTree(ajvErrors || []);
  filterRedundantErrors(tree);
  return createErrorInstances(tree, options);
};
export {
  createErrorInstances,
  helpers_default as default,
  filterRedundantErrors,
  makeTree
};
//# sourceMappingURL=helpers.mjs.map
