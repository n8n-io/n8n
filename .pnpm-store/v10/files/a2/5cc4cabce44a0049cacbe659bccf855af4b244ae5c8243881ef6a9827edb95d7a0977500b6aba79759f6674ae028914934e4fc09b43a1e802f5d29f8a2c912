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
var fixtureRunner_exports = {};
__export(fixtureRunner_exports, {
  FixtureRunner: () => FixtureRunner
});
module.exports = __toCommonJS(fixtureRunner_exports);
var import_utils = require("playwright-core/lib/utils");
var import_fixtures = require("../common/fixtures");
var import_util = require("../util");
class Fixture {
  constructor(runner, registration) {
    this.failed = false;
    this._deps = /* @__PURE__ */ new Set();
    this._usages = /* @__PURE__ */ new Set();
    this.runner = runner;
    this.registration = registration;
    this.value = null;
    const isUserFixture = this.registration.location && (0, import_util.filterStackFile)(this.registration.location.file);
    const title = this.registration.customTitle || this.registration.name;
    const location = isUserFixture ? this.registration.location : void 0;
    this._stepInfo = { title: `Fixture ${(0, import_utils.escapeWithQuotes)(title, '"')}`, category: "fixture", location };
    if (this.registration.box === "self")
      this._stepInfo = void 0;
    else if (this.registration.box)
      this._stepInfo.group = isUserFixture ? "configuration" : "internal";
    this._setupDescription = {
      title,
      phase: "setup",
      location,
      slot: this.registration.timeout !== void 0 ? {
        timeout: this.registration.timeout,
        elapsed: 0
      } : this.registration.scope === "worker" ? {
        timeout: this.runner.workerFixtureTimeout,
        elapsed: 0
      } : void 0
    };
    this._teardownDescription = { ...this._setupDescription, phase: "teardown" };
  }
  async setup(testInfo, runnable) {
    this.runner.instanceForId.set(this.registration.id, this);
    if (typeof this.registration.fn !== "function") {
      this.value = this.registration.fn;
      return;
    }
    const run = () => testInfo._runWithTimeout({ ...runnable, fixture: this._setupDescription }, () => this._setupInternal(testInfo));
    if (this._stepInfo)
      await testInfo._runAsStep(this._stepInfo, run);
    else
      await run();
  }
  async _setupInternal(testInfo) {
    const params = {};
    for (const name of this.registration.deps) {
      const registration = this.runner.pool.resolve(name, this.registration);
      const dep = this.runner.instanceForId.get(registration.id);
      if (!dep) {
        this.failed = true;
        return;
      }
      dep._usages.add(this);
      this._deps.add(dep);
      params[name] = dep.value;
      if (dep.failed) {
        this.failed = true;
        return;
      }
    }
    let called = false;
    const useFuncStarted = new import_utils.ManualPromise();
    const useFunc = async (value) => {
      if (called)
        throw new Error(`Cannot provide fixture value for the second time`);
      called = true;
      this.value = value;
      this._useFuncFinished = new import_utils.ManualPromise();
      useFuncStarted.resolve();
      await this._useFuncFinished;
    };
    const workerInfo = { config: testInfo.config, parallelIndex: testInfo.parallelIndex, workerIndex: testInfo.workerIndex, project: testInfo.project };
    const info = this.registration.scope === "worker" ? workerInfo : testInfo;
    this._selfTeardownComplete = (async () => {
      try {
        await this.registration.fn(params, useFunc, info);
        if (!useFuncStarted.isDone())
          throw new Error(`use() was not called in fixture "${this.registration.name}"`);
      } catch (error) {
        this.failed = true;
        if (!useFuncStarted.isDone())
          useFuncStarted.reject(error);
        else
          throw error;
      }
    })();
    await useFuncStarted;
  }
  async teardown(testInfo, runnable) {
    try {
      const fixtureRunnable = { ...runnable, fixture: this._teardownDescription };
      if (!testInfo._timeoutManager.isTimeExhaustedFor(fixtureRunnable)) {
        const run = () => testInfo._runWithTimeout(fixtureRunnable, () => this._teardownInternal());
        if (this._stepInfo)
          await testInfo._runAsStep(this._stepInfo, run);
        else
          await run();
      }
    } finally {
      for (const dep of this._deps)
        dep._usages.delete(this);
      this.runner.instanceForId.delete(this.registration.id);
    }
  }
  async _teardownInternal() {
    if (typeof this.registration.fn !== "function")
      return;
    if (this._usages.size !== 0) {
      console.error("Internal error: fixture integrity at", this._teardownDescription.title);
      this._usages.clear();
    }
    if (this._useFuncFinished) {
      this._useFuncFinished.resolve();
      this._useFuncFinished = void 0;
      await this._selfTeardownComplete;
    }
  }
  _collectFixturesInTeardownOrder(scope, collector) {
    if (this.registration.scope !== scope)
      return;
    for (const fixture of this._usages)
      fixture._collectFixturesInTeardownOrder(scope, collector);
    collector.add(this);
  }
}
class FixtureRunner {
  constructor() {
    this.testScopeClean = true;
    this.instanceForId = /* @__PURE__ */ new Map();
    this.workerFixtureTimeout = 0;
  }
  setPool(pool) {
    if (!this.testScopeClean)
      throw new Error("Did not teardown test scope");
    if (this.pool && pool.digest !== this.pool.digest) {
      throw new Error([
        `Playwright detected inconsistent test.use() options.`,
        `Most common mistakes that lead to this issue:`,
        `  - Calling test.use() outside of the test file, for example in a common helper.`,
        `  - One test file imports from another test file.`
      ].join("\n"));
    }
    this.pool = pool;
  }
  _collectFixturesInSetupOrder(registration, collector) {
    if (collector.has(registration))
      return;
    for (const name of registration.deps) {
      const dep = this.pool.resolve(name, registration);
      this._collectFixturesInSetupOrder(dep, collector);
    }
    collector.add(registration);
  }
  async teardownScope(scope, testInfo, runnable) {
    const fixtures = Array.from(this.instanceForId.values()).reverse();
    const collector = /* @__PURE__ */ new Set();
    for (const fixture of fixtures)
      fixture._collectFixturesInTeardownOrder(scope, collector);
    let firstError;
    for (const fixture of collector) {
      try {
        await fixture.teardown(testInfo, runnable);
      } catch (error) {
        firstError = firstError ?? error;
      }
    }
    if (scope === "test")
      this.testScopeClean = true;
    if (firstError)
      throw firstError;
  }
  async resolveParametersForFunction(fn, testInfo, autoFixtures, runnable) {
    const collector = /* @__PURE__ */ new Set();
    const auto = [];
    for (const registration of this.pool.autoFixtures()) {
      let shouldRun = true;
      if (autoFixtures === "all-hooks-only")
        shouldRun = registration.scope === "worker" || registration.auto === "all-hooks-included";
      else if (autoFixtures === "worker")
        shouldRun = registration.scope === "worker";
      if (shouldRun)
        auto.push(registration);
    }
    auto.sort((r1, r2) => (r1.scope === "worker" ? 0 : 1) - (r2.scope === "worker" ? 0 : 1));
    for (const registration of auto)
      this._collectFixturesInSetupOrder(registration, collector);
    const names = getRequiredFixtureNames(fn);
    for (const name of names)
      this._collectFixturesInSetupOrder(this.pool.resolve(name), collector);
    for (const registration of collector)
      await this._setupFixtureForRegistration(registration, testInfo, runnable);
    const params = {};
    for (const name of names) {
      const registration = this.pool.resolve(name);
      const fixture = this.instanceForId.get(registration.id);
      if (!fixture || fixture.failed)
        return null;
      params[name] = fixture.value;
    }
    return params;
  }
  async resolveParametersAndRunFunction(fn, testInfo, autoFixtures, runnable) {
    const params = await this.resolveParametersForFunction(fn, testInfo, autoFixtures, runnable);
    if (params === null) {
      return null;
    }
    await testInfo._runWithTimeout(runnable, () => fn(params, testInfo));
  }
  async _setupFixtureForRegistration(registration, testInfo, runnable) {
    if (registration.scope === "test")
      this.testScopeClean = false;
    let fixture = this.instanceForId.get(registration.id);
    if (fixture)
      return fixture;
    fixture = new Fixture(this, registration);
    await fixture.setup(testInfo, runnable);
    return fixture;
  }
  dependsOnWorkerFixturesOnly(fn, location) {
    const names = getRequiredFixtureNames(fn, location);
    for (const name of names) {
      const registration = this.pool.resolve(name);
      if (registration.scope !== "worker")
        return false;
    }
    return true;
  }
}
function getRequiredFixtureNames(fn, location) {
  return (0, import_fixtures.fixtureParameterNames)(fn, location ?? { file: "<unknown>", line: 1, column: 1 }, (e) => {
    throw new Error(`${(0, import_util.formatLocation)(e.location)}: ${e.message}`);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FixtureRunner
});
