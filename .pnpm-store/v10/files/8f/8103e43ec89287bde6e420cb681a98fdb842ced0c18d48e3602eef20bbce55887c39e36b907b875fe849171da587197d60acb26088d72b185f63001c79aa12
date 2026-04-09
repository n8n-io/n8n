var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var helpers_exports = {};
__export(helpers_exports, {
  createErrorInstances: () => createErrorInstances,
  default: () => helpers_default,
  filterRedundantErrors: () => filterRedundantErrors,
  makeTree: () => makeTree
});
module.exports = __toCommonJS(helpers_exports);
var import_utils = require("./utils");
var import_validation_errors = require("./validation-errors/index");
const JSON_POINTERS_REGEX = /\/[\w_-]+(\/\d+)?/g;
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
  (0, import_utils.getErrors)(root).forEach((error) => {
    if ((0, import_utils.isRequiredError)(error)) {
      root.errors = [error];
      root.children = {};
    }
  });
  if ((0, import_utils.getErrors)(root).some(import_utils.isAnyOfError)) {
    if (Object.keys(root.children).length > 0) {
      delete root.errors;
    }
  }
  if (root.errors && root.errors.length && (0, import_utils.getErrors)(root).every(import_utils.isEnumError)) {
    if ((0, import_utils.getSiblings)(parent)(root).filter(import_utils.notUndefined).some(import_utils.getErrors)) {
      delete parent.children[key];
    }
  }
  Object.entries(root.children).forEach(([key2, child]) => filterRedundantErrors(child, root, key2));
}
function createErrorInstances(root, options) {
  const errors = (0, import_utils.getErrors)(root);
  if (errors.length && errors.every(import_utils.isEnumError)) {
    const uniqueValues = new Set((0, import_utils.concatAll)([])(errors.map((e) => e.params.allowedValues)));
    const allowedValues = [...uniqueValues];
    const error = errors[0];
    return [
      new import_validation_errors.EnumValidationError(__spreadProps(__spreadValues({}, error), {
        params: { allowedValues }
      }), options)
    ];
  } else {
    return (0, import_utils.concatAll)(errors.reduce((ret, error) => {
      switch (error.keyword) {
        case "additionalProperties":
          return ret.concat(new import_validation_errors.AdditionalPropValidationError(error, options));
        case "required":
          return ret.concat(new import_validation_errors.RequiredValidationError(error, options));
        default:
          return ret.concat(new import_validation_errors.DefaultValidationError(error, options));
      }
    }, []))((0, import_utils.getChildren)(root).map((child) => createErrorInstances(child, options)));
  }
}
var helpers_default = (ajvErrors, options) => {
  const tree = makeTree(ajvErrors || []);
  filterRedundantErrors(tree);
  return createErrorInstances(tree, options);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createErrorInstances,
  filterRedundantErrors,
  makeTree
});
//# sourceMappingURL=helpers.js.map
