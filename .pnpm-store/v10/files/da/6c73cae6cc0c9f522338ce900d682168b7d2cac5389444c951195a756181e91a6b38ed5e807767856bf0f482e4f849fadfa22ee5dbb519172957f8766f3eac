"use strict";
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
var fixtures_exports = {};
__export(fixtures_exports, {
  FixturePool: () => FixturePool,
  fixtureParameterNames: () => fixtureParameterNames,
  formatPotentiallyInternalLocation: () => formatPotentiallyInternalLocation,
  inheritFixtureNames: () => inheritFixtureNames
});
module.exports = __toCommonJS(fixtures_exports);
var import_crypto = __toESM(require("crypto"));
var import_util = require("../util");
const kScopeOrder = ["test", "worker"];
function isFixtureTuple(value) {
  return Array.isArray(value) && typeof value[1] === "object";
}
function isFixtureOption(value) {
  return isFixtureTuple(value) && !!value[1].option;
}
class FixturePool {
  constructor(fixturesList, onLoadError, parentPool, disallowWorkerFixtures, optionOverrides) {
    this._registrations = new Map(parentPool ? parentPool._registrations : []);
    this._onLoadError = onLoadError;
    const allOverrides = optionOverrides?.overrides ?? {};
    const overrideKeys = new Set(Object.keys(allOverrides));
    for (const list of fixturesList) {
      this._appendFixtureList(list, !!disallowWorkerFixtures, false);
      const selectedOverrides = {};
      for (const [key, value] of Object.entries(list.fixtures)) {
        if (isFixtureOption(value) && overrideKeys.has(key))
          selectedOverrides[key] = [allOverrides[key], value[1]];
      }
      if (Object.entries(selectedOverrides).length)
        this._appendFixtureList({ fixtures: selectedOverrides, location: optionOverrides.location }, !!disallowWorkerFixtures, true);
    }
    this.digest = this.validate();
  }
  _appendFixtureList(list, disallowWorkerFixtures, isOptionsOverride) {
    const { fixtures, location } = list;
    for (const entry of Object.entries(fixtures)) {
      const name = entry[0];
      let value = entry[1];
      let options;
      if (isFixtureTuple(value)) {
        options = {
          auto: value[1].auto ?? false,
          scope: value[1].scope || "test",
          option: !!value[1].option,
          timeout: value[1].timeout,
          customTitle: value[1].title,
          box: value[1].box
        };
        value = value[0];
      }
      let fn = value;
      const previous = this._registrations.get(name);
      if (previous && options) {
        if (previous.scope !== options.scope) {
          this._addLoadError(`Fixture "${name}" has already been registered as a { scope: '${previous.scope}' } fixture defined in ${(0, import_util.formatLocation)(previous.location)}.`, location);
          continue;
        }
        if (previous.auto !== options.auto) {
          this._addLoadError(`Fixture "${name}" has already been registered as a { auto: '${previous.scope}' } fixture defined in ${(0, import_util.formatLocation)(previous.location)}.`, location);
          continue;
        }
      } else if (previous) {
        options = { auto: previous.auto, scope: previous.scope, option: previous.option, timeout: previous.timeout, customTitle: previous.customTitle };
      } else if (!options) {
        options = { auto: false, scope: "test", option: false, timeout: void 0 };
      }
      if (!kScopeOrder.includes(options.scope)) {
        this._addLoadError(`Fixture "${name}" has unknown { scope: '${options.scope}' }.`, location);
        continue;
      }
      if (options.scope === "worker" && disallowWorkerFixtures) {
        this._addLoadError(`Cannot use({ ${name} }) in a describe group, because it forces a new worker.
Make it top-level in the test file or put in the configuration file.`, location);
        continue;
      }
      if (fn === void 0 && options.option && previous) {
        let original = previous;
        while (!original.optionOverride && original.super)
          original = original.super;
        fn = original.fn;
      }
      const deps = fixtureParameterNames(fn, location, (e) => this._onLoadError(e));
      const registration = { id: "", name, location, scope: options.scope, fn, auto: options.auto, option: options.option, timeout: options.timeout, customTitle: options.customTitle, box: options.box, deps, super: previous, optionOverride: isOptionsOverride };
      registrationId(registration);
      this._registrations.set(name, registration);
    }
  }
  validate() {
    const markers = /* @__PURE__ */ new Map();
    const stack = [];
    let hasDependencyErrors = false;
    const addDependencyError = (message, location) => {
      hasDependencyErrors = true;
      this._addLoadError(message, location);
    };
    const visit = (registration, boxedOnly) => {
      markers.set(registration, "visiting");
      stack.push(registration);
      for (const name of registration.deps) {
        const dep = this.resolve(name, registration);
        if (!dep) {
          if (name === registration.name)
            addDependencyError(`Fixture "${registration.name}" references itself, but does not have a base implementation.`, registration.location);
          else
            addDependencyError(`Fixture "${registration.name}" has unknown parameter "${name}".`, registration.location);
          continue;
        }
        if (kScopeOrder.indexOf(registration.scope) > kScopeOrder.indexOf(dep.scope)) {
          addDependencyError(`${registration.scope} fixture "${registration.name}" cannot depend on a ${dep.scope} fixture "${name}" defined in ${formatPotentiallyInternalLocation(dep.location)}.`, registration.location);
          continue;
        }
        if (!markers.has(dep)) {
          visit(dep, boxedOnly);
        } else if (markers.get(dep) === "visiting") {
          const index = stack.indexOf(dep);
          const allRegs = stack.slice(index, stack.length);
          const filteredRegs = allRegs.filter((r) => !r.box);
          const regs = boxedOnly ? filteredRegs : allRegs;
          const names2 = regs.map((r) => `"${r.name}"`);
          addDependencyError(`Fixtures ${names2.join(" -> ")} -> "${dep.name}" form a dependency cycle: ${regs.map((r) => formatPotentiallyInternalLocation(r.location)).join(" -> ")} -> ${formatPotentiallyInternalLocation(dep.location)}`, dep.location);
          continue;
        }
      }
      markers.set(registration, "visited");
      stack.pop();
    };
    const names = Array.from(this._registrations.keys()).sort();
    for (const name of names) {
      const registration = this._registrations.get(name);
      if (!registration.box)
        visit(registration, true);
    }
    if (!hasDependencyErrors) {
      for (const name of names) {
        const registration = this._registrations.get(name);
        if (registration.box)
          visit(registration, false);
      }
    }
    const hash = import_crypto.default.createHash("sha1");
    for (const name of names) {
      const registration = this._registrations.get(name);
      if (registration.scope === "worker")
        hash.update(registration.id + ";");
    }
    return hash.digest("hex");
  }
  validateFunction(fn, prefix, location) {
    for (const name of fixtureParameterNames(fn, location, (e) => this._onLoadError(e))) {
      const registration = this._registrations.get(name);
      if (!registration)
        this._addLoadError(`${prefix} has unknown parameter "${name}".`, location);
    }
  }
  resolve(name, forFixture) {
    if (name === forFixture?.name)
      return forFixture.super;
    return this._registrations.get(name);
  }
  autoFixtures() {
    return [...this._registrations.values()].filter((r) => r.auto !== false);
  }
  _addLoadError(message, location) {
    this._onLoadError({ message, location });
  }
}
const signatureSymbol = Symbol("signature");
function formatPotentiallyInternalLocation(location) {
  const isUserFixture = location && (0, import_util.filterStackFile)(location.file);
  return isUserFixture ? (0, import_util.formatLocation)(location) : "<builtin>";
}
function fixtureParameterNames(fn, location, onError) {
  if (typeof fn !== "function")
    return [];
  if (!fn[signatureSymbol])
    fn[signatureSymbol] = innerFixtureParameterNames(fn, location, onError);
  return fn[signatureSymbol];
}
function inheritFixtureNames(from, to) {
  to[signatureSymbol] = from[signatureSymbol];
}
function innerFixtureParameterNames(fn, location, onError) {
  const text = filterOutComments(fn.toString());
  const match = text.match(/(?:async)?(?:\s+function)?[^(]*\(([^)]*)/);
  if (!match)
    return [];
  const trimmedParams = match[1].trim();
  if (!trimmedParams)
    return [];
  const [firstParam] = splitByComma(trimmedParams);
  if (firstParam[0] !== "{" || firstParam[firstParam.length - 1] !== "}") {
    onError({ message: "First argument must use the object destructuring pattern: " + firstParam, location });
    return [];
  }
  const props = splitByComma(firstParam.substring(1, firstParam.length - 1)).map((prop) => {
    const colon = prop.indexOf(":");
    return colon === -1 ? prop.trim() : prop.substring(0, colon).trim();
  });
  const restProperty = props.find((prop) => prop.startsWith("..."));
  if (restProperty) {
    onError({ message: `Rest property "${restProperty}" is not supported. List all used fixtures explicitly, separated by comma.`, location });
    return [];
  }
  return props;
}
function filterOutComments(s) {
  const result = [];
  let commentState = "none";
  for (let i = 0; i < s.length; ++i) {
    if (commentState === "singleline") {
      if (s[i] === "\n")
        commentState = "none";
    } else if (commentState === "multiline") {
      if (s[i - 1] === "*" && s[i] === "/")
        commentState = "none";
    } else if (commentState === "none") {
      if (s[i] === "/" && s[i + 1] === "/") {
        commentState = "singleline";
      } else if (s[i] === "/" && s[i + 1] === "*") {
        commentState = "multiline";
        i += 2;
      } else {
        result.push(s[i]);
      }
    }
  }
  return result.join("");
}
function splitByComma(s) {
  const result = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{" || s[i] === "[") {
      stack.push(s[i] === "{" ? "}" : "]");
    } else if (s[i] === stack[stack.length - 1]) {
      stack.pop();
    } else if (!stack.length && s[i] === ",") {
      const token = s.substring(start, i).trim();
      if (token)
        result.push(token);
      start = i + 1;
    }
  }
  const lastToken = s.substring(start).trim();
  if (lastToken)
    result.push(lastToken);
  return result;
}
const registrationIdMap = /* @__PURE__ */ new Map();
let lastId = 0;
function registrationId(registration) {
  if (registration.id)
    return registration.id;
  const key = registration.name + "@@@" + (registration.super ? registrationId(registration.super) : "");
  let map = registrationIdMap.get(key);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    registrationIdMap.set(key, map);
  }
  if (!map.has(registration.fn))
    map.set(registration.fn, String(lastId++));
  registration.id = map.get(registration.fn);
  return registration.id;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FixturePool,
  fixtureParameterNames,
  formatPotentiallyInternalLocation,
  inheritFixtureNames
});
