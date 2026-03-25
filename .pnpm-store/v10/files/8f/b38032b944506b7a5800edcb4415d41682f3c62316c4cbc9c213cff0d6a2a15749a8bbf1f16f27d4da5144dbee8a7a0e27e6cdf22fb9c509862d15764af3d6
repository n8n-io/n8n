"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var poolBuilder_exports = {};
__export(poolBuilder_exports, {
  PoolBuilder: () => PoolBuilder
});
module.exports = __toCommonJS(poolBuilder_exports);
var import_fixtures = require("./fixtures");
var import_util = require("../util");
class PoolBuilder {
  constructor(type, project) {
    this._testTypePools = /* @__PURE__ */ new Map();
    this._type = type;
    this._project = project;
  }
  static createForLoader() {
    return new PoolBuilder("loader");
  }
  static createForWorker(project) {
    return new PoolBuilder("worker", project);
  }
  buildPools(suite, testErrors) {
    suite.forEachTest((test) => {
      const pool = this._buildPoolForTest(test, testErrors);
      if (this._type === "loader")
        test._poolDigest = pool.digest;
      if (this._type === "worker")
        test._pool = pool;
    });
  }
  _buildPoolForTest(test, testErrors) {
    let pool = this._buildTestTypePool(test._testType, testErrors);
    const parents = [];
    for (let parent = test.parent; parent; parent = parent.parent)
      parents.push(parent);
    parents.reverse();
    for (const parent of parents) {
      if (parent._use.length)
        pool = new import_fixtures.FixturePool(parent._use, (e) => this._handleLoadError(e, testErrors), pool, parent._type === "describe");
      for (const hook of parent._hooks)
        pool.validateFunction(hook.fn, hook.type + " hook", hook.location);
      for (const modifier of parent._modifiers)
        pool.validateFunction(modifier.fn, modifier.type + " modifier", modifier.location);
    }
    pool.validateFunction(test.fn, "Test", test.location);
    return pool;
  }
  _buildTestTypePool(testType, testErrors) {
    if (!this._testTypePools.has(testType)) {
      const optionOverrides = {
        overrides: this._project?.project?.use ?? {},
        location: { file: `project#${this._project?.id}`, line: 1, column: 1 }
      };
      const pool = new import_fixtures.FixturePool(testType.fixtures, (e) => this._handleLoadError(e, testErrors), void 0, void 0, optionOverrides);
      this._testTypePools.set(testType, pool);
    }
    return this._testTypePools.get(testType);
  }
  _handleLoadError(e, testErrors) {
    if (testErrors)
      testErrors.push(e);
    else
      throw new Error(`${(0, import_util.formatLocation)(e.location)}: ${e.message}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PoolBuilder
});
