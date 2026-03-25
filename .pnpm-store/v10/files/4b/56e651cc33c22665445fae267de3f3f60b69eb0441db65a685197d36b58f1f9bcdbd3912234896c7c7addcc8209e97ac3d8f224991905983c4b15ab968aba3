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
var workerMain_exports = {};
__export(workerMain_exports, {
  WorkerMain: () => WorkerMain,
  create: () => create
});
module.exports = __toCommonJS(workerMain_exports);
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_configLoader = require("../common/configLoader");
var import_globals = require("../common/globals");
var import_ipc = require("../common/ipc");
var import_util = require("../util");
var import_fixtureRunner = require("./fixtureRunner");
var import_testInfo = require("./testInfo");
var import_util2 = require("./util");
var import_fixtures = require("../common/fixtures");
var import_poolBuilder = require("../common/poolBuilder");
var import_process = require("../common/process");
var import_suiteUtils = require("../common/suiteUtils");
var import_testLoader = require("../common/testLoader");
class WorkerMain extends import_process.ProcessRunner {
  constructor(params) {
    super();
    // Accumulated fatal errors that cannot be attributed to a test.
    this._fatalErrors = [];
    // The stage of the full cleanup. Once "finished", we can safely stop running anything.
    this._didRunFullCleanup = false;
    // Whether the worker was stopped due to an unhandled error in a test marked with test.fail().
    // This should force dispatcher to use a new worker instead.
    this._stoppedDueToUnhandledErrorInTestFail = false;
    // Whether the worker was requested to stop.
    this._isStopped = false;
    // This promise resolves once the single "run test group" call finishes.
    this._runFinished = new import_utils.ManualPromise();
    this._currentTest = null;
    this._lastRunningTests = [];
    this._totalRunningTests = 0;
    // Suites that had their beforeAll hooks, but not afterAll hooks executed.
    // These suites still need afterAll hooks to be executed for the proper cleanup.
    // Contains dynamic annotations originated by modifiers with a callback, e.g. `test.skip(() => true)`.
    this._activeSuites = /* @__PURE__ */ new Map();
    process.env.TEST_WORKER_INDEX = String(params.workerIndex);
    process.env.TEST_PARALLEL_INDEX = String(params.parallelIndex);
    (0, import_globals.setIsWorkerProcess)();
    this._params = params;
    this._fixtureRunner = new import_fixtureRunner.FixtureRunner();
    this._runFinished.resolve();
    process.on("unhandledRejection", (reason) => this.unhandledError(reason));
    process.on("uncaughtException", (error) => this.unhandledError(error));
    process.stdout.write = (chunk, cb) => {
      this.dispatchEvent("stdOut", (0, import_ipc.stdioChunkToParams)(chunk));
      this._currentTest?._tracing.appendStdioToTrace("stdout", chunk);
      if (typeof cb === "function")
        process.nextTick(cb);
      return true;
    };
    if (!process.env.PW_RUNNER_DEBUG) {
      process.stderr.write = (chunk, cb) => {
        this.dispatchEvent("stdErr", (0, import_ipc.stdioChunkToParams)(chunk));
        this._currentTest?._tracing.appendStdioToTrace("stderr", chunk);
        if (typeof cb === "function")
          process.nextTick(cb);
        return true;
      };
    }
  }
  _stop() {
    if (!this._isStopped) {
      this._isStopped = true;
      this._currentTest?._interrupt();
    }
    return this._runFinished;
  }
  async gracefullyClose() {
    try {
      await this._stop();
      if (!this._config) {
        return;
      }
      const fakeTestInfo = new import_testInfo.TestInfoImpl(this._config, this._project, this._params, void 0, 0, import_testInfo.emtpyTestInfoCallbacks);
      const runnable = { type: "teardown" };
      await fakeTestInfo._runWithTimeout(runnable, () => this._loadIfNeeded()).catch(() => {
      });
      await this._fixtureRunner.teardownScope("test", fakeTestInfo, runnable).catch(() => {
      });
      await this._fixtureRunner.teardownScope("worker", fakeTestInfo, runnable).catch(() => {
      });
      await fakeTestInfo._runWithTimeout(runnable, () => (0, import_utils.gracefullyCloseAll)()).catch(() => {
      });
      this._fatalErrors.push(...fakeTestInfo.errors);
    } catch (e) {
      this._fatalErrors.push((0, import_util2.testInfoError)(e));
    }
    if (this._fatalErrors.length) {
      this._appendProcessTeardownDiagnostics(this._fatalErrors[this._fatalErrors.length - 1]);
      const payload = { fatalErrors: this._fatalErrors };
      this.dispatchEvent("teardownErrors", payload);
    }
  }
  _appendProcessTeardownDiagnostics(error) {
    if (!this._lastRunningTests.length)
      return;
    const count = this._totalRunningTests === 1 ? "1 test" : `${this._totalRunningTests} tests`;
    let lastMessage = "";
    if (this._lastRunningTests.length < this._totalRunningTests)
      lastMessage = `, last ${this._lastRunningTests.length} tests were`;
    const message = [
      "",
      "",
      import_utils2.colors.red(`Failed worker ran ${count}${lastMessage}:`),
      ...this._lastRunningTests.map((test) => formatTestTitle(test, this._project.project.name))
    ].join("\n");
    if (error.message) {
      if (error.stack) {
        let index = error.stack.indexOf(error.message);
        if (index !== -1) {
          index += error.message.length;
          error.stack = error.stack.substring(0, index) + message + error.stack.substring(index);
        }
      }
      error.message += message;
    } else if (error.value) {
      error.value += message;
    }
  }
  unhandledError(error) {
    if (!this._currentTest) {
      if (!this._fatalErrors.length)
        this._fatalErrors.push((0, import_util2.testInfoError)(error));
      void this._stop();
      return;
    }
    if (!this._currentTest._hasUnhandledError) {
      this._currentTest._hasUnhandledError = true;
      this._currentTest._failWithError(error);
    }
    const isExpectError = error instanceof Error && !!error.matcherResult;
    const shouldContinueInThisWorker = this._currentTest.expectedStatus === "failed" && isExpectError;
    if (!shouldContinueInThisWorker) {
      this._stoppedDueToUnhandledErrorInTestFail = true;
      void this._stop();
    }
  }
  async _loadIfNeeded() {
    if (this._config)
      return;
    const config = await (0, import_configLoader.deserializeConfig)(this._params.config);
    const project = config.projects.find((p) => p.id === this._params.projectId);
    if (!project)
      throw new Error(`Project "${this._params.projectId}" not found in the worker process. Make sure project name does not change.`);
    this._config = config;
    this._project = project;
    this._poolBuilder = import_poolBuilder.PoolBuilder.createForWorker(this._project);
    this._fixtureRunner.workerFixtureTimeout = this._project.project.timeout;
  }
  async runTestGroup(runPayload) {
    this._runFinished = new import_utils.ManualPromise();
    const entries = new Map(runPayload.entries.map((e) => [e.testId, e]));
    let fatalUnknownTestIds;
    try {
      await this._loadIfNeeded();
      const fileSuite = await (0, import_testLoader.loadTestFile)(runPayload.file, this._config);
      const suite = (0, import_suiteUtils.bindFileSuiteToProject)(this._project, fileSuite);
      if (this._params.repeatEachIndex)
        (0, import_suiteUtils.applyRepeatEachIndex)(this._project, suite, this._params.repeatEachIndex);
      const hasEntries = (0, import_suiteUtils.filterTestsRemoveEmptySuites)(suite, (test) => entries.has(test.id));
      if (hasEntries) {
        this._poolBuilder.buildPools(suite);
        this._activeSuites = /* @__PURE__ */ new Map();
        this._didRunFullCleanup = false;
        const tests = suite.allTests();
        for (let i = 0; i < tests.length; i++) {
          if (this._isStopped && this._didRunFullCleanup)
            break;
          const entry = entries.get(tests[i].id);
          entries.delete(tests[i].id);
          (0, import_util.debugTest)(`test started "${tests[i].title}"`);
          await this._runTest(tests[i], entry.retry, tests[i + 1]);
          (0, import_util.debugTest)(`test finished "${tests[i].title}"`);
        }
      } else {
        fatalUnknownTestIds = runPayload.entries.map((e) => e.testId);
        void this._stop();
      }
    } catch (e) {
      this._fatalErrors.push((0, import_util2.testInfoError)(e));
      void this._stop();
    } finally {
      const donePayload = {
        fatalErrors: this._fatalErrors,
        skipTestsDueToSetupFailure: [],
        fatalUnknownTestIds,
        stoppedDueToUnhandledErrorInTestFail: this._stoppedDueToUnhandledErrorInTestFail
      };
      for (const test of this._skipRemainingTestsInSuite?.allTests() || []) {
        if (entries.has(test.id))
          donePayload.skipTestsDueToSetupFailure.push(test.id);
      }
      this.dispatchEvent("done", donePayload);
      this._fatalErrors = [];
      this._skipRemainingTestsInSuite = void 0;
      this._runFinished.resolve();
    }
  }
  async customMessage(payload) {
    try {
      if (this._currentTest?.testId !== payload.testId)
        throw new Error("Test has already stopped");
      const response = await this._currentTest._onCustomMessageCallback?.(payload.request);
      return { response };
    } catch (error) {
      return { response: {}, error: (0, import_util2.testInfoError)(error) };
    }
  }
  resume(payload) {
    this._resumePromise?.resolve(payload);
  }
  async _runTest(test, retry, nextTest) {
    const testInfo = new import_testInfo.TestInfoImpl(this._config, this._project, this._params, test, retry, {
      onStepBegin: (payload) => this.dispatchEvent("stepBegin", payload),
      onStepEnd: (payload) => this.dispatchEvent("stepEnd", payload),
      onAttach: (payload) => this.dispatchEvent("attach", payload),
      onTestPaused: (payload) => {
        this._resumePromise = new import_utils.ManualPromise();
        this.dispatchEvent("testPaused", payload);
        return this._resumePromise;
      },
      onCloneStorage: async (payload) => this.sendRequest("cloneStorage", payload),
      onUpstreamStorage: (payload) => this.sendRequest("upstreamStorage", payload)
    });
    const processAnnotation = (annotation) => {
      testInfo.annotations.push(annotation);
      switch (annotation.type) {
        case "fixme":
        case "skip":
          testInfo.expectedStatus = "skipped";
          break;
        case "fail":
          if (testInfo.expectedStatus !== "skipped")
            testInfo.expectedStatus = "failed";
          break;
        case "slow":
          testInfo._timeoutManager.slow();
          break;
      }
    };
    if (!this._isStopped)
      this._fixtureRunner.setPool(test._pool);
    const suites = getSuites(test);
    const reversedSuites = suites.slice().reverse();
    const nextSuites = new Set(getSuites(nextTest));
    testInfo._timeoutManager.setTimeout(test.timeout);
    for (const annotation of test.annotations)
      processAnnotation(annotation);
    for (const suite of suites) {
      const extraAnnotations = this._activeSuites.get(suite) || [];
      for (const annotation of extraAnnotations)
        processAnnotation(annotation);
    }
    this._currentTest = testInfo;
    (0, import_globals.setCurrentTestInfo)(testInfo);
    this.dispatchEvent("testBegin", buildTestBeginPayload(testInfo));
    const isSkipped = testInfo.expectedStatus === "skipped";
    const hasAfterAllToRunBeforeNextTest = reversedSuites.some((suite) => {
      return this._activeSuites.has(suite) && !nextSuites.has(suite) && suite._hooks.some((hook) => hook.type === "afterAll");
    });
    if (isSkipped && nextTest && !hasAfterAllToRunBeforeNextTest) {
      testInfo.status = "skipped";
      this.dispatchEvent("testEnd", buildTestEndPayload(testInfo));
      return;
    }
    this._totalRunningTests++;
    this._lastRunningTests.push(test);
    if (this._lastRunningTests.length > 10)
      this._lastRunningTests.shift();
    let shouldRunAfterEachHooks = false;
    testInfo._allowSkips = true;
    await (async () => {
      await testInfo._runWithTimeout({ type: "test" }, async () => {
        const traceFixtureRegistration = test._pool.resolve("trace");
        if (!traceFixtureRegistration)
          return;
        if (typeof traceFixtureRegistration.fn === "function")
          throw new Error(`"trace" option cannot be a function`);
        await testInfo._tracing.startIfNeeded(traceFixtureRegistration.fn);
      });
      if (this._isStopped || isSkipped) {
        testInfo.status = "skipped";
        return;
      }
      await (0, import_utils.removeFolders)([testInfo.outputDir]);
      let testFunctionParams = null;
      await testInfo._runAsStep({ title: "Before Hooks", category: "hook" }, async () => {
        for (const suite of suites)
          await this._runBeforeAllHooksForSuite(suite, testInfo);
        shouldRunAfterEachHooks = true;
        await this._runEachHooksForSuites(suites, "beforeEach", testInfo);
        testFunctionParams = await this._fixtureRunner.resolveParametersForFunction(test.fn, testInfo, "test", { type: "test" });
      });
      if (testFunctionParams === null) {
        return;
      }
      await testInfo._runWithTimeout({ type: "test" }, async () => {
        const fn = test.fn;
        await fn(testFunctionParams, testInfo);
      });
    })().catch(() => {
    });
    testInfo.duration = testInfo._timeoutManager.defaultSlot().elapsed | 0;
    testInfo._allowSkips = true;
    const afterHooksTimeout = calculateMaxTimeout(this._project.project.timeout, testInfo.timeout);
    const afterHooksSlot = { timeout: afterHooksTimeout, elapsed: 0 };
    await testInfo._runAsStep({ title: "After Hooks", category: "hook" }, async () => {
      let firstAfterHooksError;
      try {
        await testInfo._runWithTimeout({ type: "test", slot: afterHooksSlot }, () => testInfo._didFinishTestFunction());
      } catch (error) {
        firstAfterHooksError = firstAfterHooksError ?? error;
      }
      try {
        if (shouldRunAfterEachHooks)
          await this._runEachHooksForSuites(reversedSuites, "afterEach", testInfo, afterHooksSlot);
      } catch (error) {
        firstAfterHooksError = firstAfterHooksError ?? error;
      }
      testInfo._tracing.didFinishTestFunctionAndAfterEachHooks();
      try {
        await this._fixtureRunner.teardownScope("test", testInfo, { type: "test", slot: afterHooksSlot });
      } catch (error) {
        firstAfterHooksError = firstAfterHooksError ?? error;
      }
      for (const suite of reversedSuites) {
        if (!nextSuites.has(suite) || testInfo._isFailure()) {
          try {
            await this._runAfterAllHooksForSuite(suite, testInfo);
          } catch (error) {
            firstAfterHooksError = firstAfterHooksError ?? error;
          }
        }
      }
      if (firstAfterHooksError)
        throw firstAfterHooksError;
    }).catch(() => {
    });
    if (testInfo._isFailure())
      this._isStopped = true;
    if (this._isStopped) {
      this._didRunFullCleanup = true;
      await testInfo._runAsStep({ title: "Worker Cleanup", category: "hook" }, async () => {
        let firstWorkerCleanupError;
        const teardownSlot = { timeout: this._project.project.timeout, elapsed: 0 };
        try {
          await this._fixtureRunner.teardownScope("test", testInfo, { type: "test", slot: teardownSlot });
        } catch (error) {
          firstWorkerCleanupError = firstWorkerCleanupError ?? error;
        }
        for (const suite of reversedSuites) {
          try {
            await this._runAfterAllHooksForSuite(suite, testInfo);
          } catch (error) {
            firstWorkerCleanupError = firstWorkerCleanupError ?? error;
          }
        }
        try {
          await this._fixtureRunner.teardownScope("worker", testInfo, { type: "teardown", slot: teardownSlot });
        } catch (error) {
          firstWorkerCleanupError = firstWorkerCleanupError ?? error;
        }
        if (firstWorkerCleanupError)
          throw firstWorkerCleanupError;
      }).catch(() => {
      });
    }
    const tracingSlot = { timeout: this._project.project.timeout, elapsed: 0 };
    await testInfo._runWithTimeout({ type: "test", slot: tracingSlot }, async () => {
      await testInfo._tracing.stopIfNeeded();
    }).catch(() => {
    });
    testInfo.duration = testInfo._timeoutManager.defaultSlot().elapsed + afterHooksSlot.elapsed | 0;
    this._currentTest = null;
    (0, import_globals.setCurrentTestInfo)(null);
    this.dispatchEvent("testEnd", buildTestEndPayload(testInfo));
    const preserveOutput = this._config.config.preserveOutput === "always" || this._config.config.preserveOutput === "failures-only" && testInfo._isFailure();
    if (!preserveOutput)
      await (0, import_utils.removeFolders)([testInfo.outputDir]);
  }
  _collectHooksAndModifiers(suite, type, testInfo) {
    const runnables = [];
    for (const modifier of suite._modifiers) {
      const modifierType = this._fixtureRunner.dependsOnWorkerFixturesOnly(modifier.fn, modifier.location) ? "beforeAll" : "beforeEach";
      if (modifierType !== type)
        continue;
      const fn = async (fixtures) => {
        const result = await modifier.fn(fixtures);
        testInfo._modifier(modifier.type, modifier.location, [!!result, modifier.description]);
      };
      (0, import_fixtures.inheritFixtureNames)(modifier.fn, fn);
      runnables.push({
        title: `${modifier.type} modifier`,
        location: modifier.location,
        type: modifier.type,
        fn
      });
    }
    runnables.push(...suite._hooks.filter((hook) => hook.type === type));
    return runnables;
  }
  async _runBeforeAllHooksForSuite(suite, testInfo) {
    if (this._activeSuites.has(suite))
      return;
    const extraAnnotations = [];
    this._activeSuites.set(suite, extraAnnotations);
    await this._runAllHooksForSuite(suite, testInfo, "beforeAll", extraAnnotations);
  }
  async _runAllHooksForSuite(suite, testInfo, type, extraAnnotations) {
    let firstError;
    for (const hook of this._collectHooksAndModifiers(suite, type, testInfo)) {
      try {
        await testInfo._runAsStep({ title: hook.title, category: "hook", location: hook.location }, async () => {
          const timeSlot = { timeout: this._project.project.timeout, elapsed: 0 };
          const runnable = { type: hook.type, slot: timeSlot, location: hook.location };
          const existingAnnotations = new Set(testInfo.annotations);
          try {
            await this._fixtureRunner.resolveParametersAndRunFunction(hook.fn, testInfo, "all-hooks-only", runnable);
          } finally {
            if (extraAnnotations) {
              const newAnnotations = testInfo.annotations.filter((a) => !existingAnnotations.has(a));
              extraAnnotations.push(...newAnnotations);
            }
            await this._fixtureRunner.teardownScope("test", testInfo, runnable);
          }
        });
      } catch (error) {
        firstError = firstError ?? error;
        if (type === "beforeAll" && error instanceof import_testInfo.TestSkipError)
          break;
        if (type === "beforeAll" && !this._skipRemainingTestsInSuite) {
          this._skipRemainingTestsInSuite = suite;
        }
      }
    }
    if (firstError)
      throw firstError;
  }
  async _runAfterAllHooksForSuite(suite, testInfo) {
    if (!this._activeSuites.has(suite))
      return;
    this._activeSuites.delete(suite);
    await this._runAllHooksForSuite(suite, testInfo, "afterAll");
  }
  async _runEachHooksForSuites(suites, type, testInfo, slot) {
    let firstError;
    const hooks = suites.map((suite) => this._collectHooksAndModifiers(suite, type, testInfo)).flat();
    for (const hook of hooks) {
      const runnable = { type: hook.type, location: hook.location, slot };
      if (testInfo._timeoutManager.isTimeExhaustedFor(runnable)) {
        continue;
      }
      try {
        await testInfo._runAsStep({ title: hook.title, category: "hook", location: hook.location }, async () => {
          await this._fixtureRunner.resolveParametersAndRunFunction(hook.fn, testInfo, "test", runnable);
        });
      } catch (error) {
        firstError = firstError ?? error;
        if (error instanceof import_testInfo.TestSkipError)
          break;
      }
    }
    if (firstError)
      throw firstError;
  }
}
function buildTestBeginPayload(testInfo) {
  return {
    testId: testInfo.testId,
    startWallTime: testInfo._startWallTime
  };
}
function buildTestEndPayload(testInfo) {
  return {
    testId: testInfo.testId,
    duration: testInfo.duration,
    status: testInfo.status,
    errors: testInfo.errors,
    hasNonRetriableError: testInfo._hasNonRetriableError,
    expectedStatus: testInfo.expectedStatus,
    annotations: testInfo.annotations,
    timeout: testInfo.timeout
  };
}
function getSuites(test) {
  const suites = [];
  for (let suite = test?.parent; suite; suite = suite.parent)
    suites.push(suite);
  suites.reverse();
  return suites;
}
function formatTestTitle(test, projectName) {
  const [, ...titles] = test.titlePath();
  const location = `${(0, import_util.relativeFilePath)(test.location.file)}:${test.location.line}:${test.location.column}`;
  const projectTitle = projectName ? `[${projectName}] \u203A ` : "";
  return `${projectTitle}${location} \u203A ${titles.join(" \u203A ")}`;
}
function calculateMaxTimeout(t1, t2) {
  return !t1 || !t2 ? 0 : Math.max(t1, t2);
}
const create = (params) => new WorkerMain(params);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WorkerMain,
  create
});
