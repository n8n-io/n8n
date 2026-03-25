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
var dispatcher_exports = {};
__export(dispatcher_exports, {
  Dispatcher: () => Dispatcher
});
module.exports = __toCommonJS(dispatcher_exports);
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_rebase = require("./rebase");
var import_workerHost = require("./workerHost");
var import_ipc = require("../common/ipc");
var import_internalReporter = require("../reporters/internalReporter");
var import_util = require("../util");
var import_storage = require("./storage");
class Dispatcher {
  constructor(config, reporter, failureTracker) {
    this._workerSlots = [];
    this._queue = [];
    this._workerLimitPerProjectId = /* @__PURE__ */ new Map();
    this._queuedOrRunningHashCount = /* @__PURE__ */ new Map();
    this._finished = new import_utils.ManualPromise();
    this._isStopped = true;
    this._extraEnvByProjectId = /* @__PURE__ */ new Map();
    this._producedEnvByProjectId = /* @__PURE__ */ new Map();
    this._config = config;
    this._reporter = reporter;
    this._failureTracker = failureTracker;
    for (const project of config.projects) {
      if (project.workers)
        this._workerLimitPerProjectId.set(project.id, project.workers);
    }
  }
  _findFirstJobToRun() {
    for (let index = 0; index < this._queue.length; index++) {
      const job = this._queue[index];
      const projectIdWorkerLimit = this._workerLimitPerProjectId.get(job.projectId);
      if (!projectIdWorkerLimit)
        return index;
      const runningWorkersWithSameProjectId = this._workerSlots.filter((w) => w.busy && w.worker && w.worker.projectId() === job.projectId).length;
      if (runningWorkersWithSameProjectId < projectIdWorkerLimit)
        return index;
    }
    return -1;
  }
  _scheduleJob() {
    if (this._isStopped)
      return;
    const jobIndex = this._findFirstJobToRun();
    if (jobIndex === -1)
      return;
    const job = this._queue[jobIndex];
    let workerIndex = this._workerSlots.findIndex((w) => !w.busy && w.worker && w.worker.hash() === job.workerHash && !w.worker.didSendStop());
    if (workerIndex === -1)
      workerIndex = this._workerSlots.findIndex((w) => !w.busy);
    if (workerIndex === -1) {
      return;
    }
    this._queue.splice(jobIndex, 1);
    const jobDispatcher = new JobDispatcher(job, this._config, this._reporter, this._failureTracker, () => this.stop().catch(() => {
    }));
    this._workerSlots[workerIndex].busy = true;
    this._workerSlots[workerIndex].jobDispatcher = jobDispatcher;
    void this._runJobInWorker(workerIndex, jobDispatcher).then(() => {
      this._workerSlots[workerIndex].jobDispatcher = void 0;
      this._workerSlots[workerIndex].busy = false;
      this._checkFinished();
      this._scheduleJob();
    });
  }
  async _runJobInWorker(index, jobDispatcher) {
    const job = jobDispatcher.job;
    if (jobDispatcher.skipWholeJob())
      return;
    let worker = this._workerSlots[index].worker;
    if (worker && (worker.hash() !== job.workerHash || worker.didSendStop())) {
      await worker.stop();
      worker = void 0;
      if (this._isStopped)
        return;
    }
    let startError;
    if (!worker) {
      worker = this._createWorker(job, index, (0, import_ipc.serializeConfig)(this._config, true));
      this._workerSlots[index].worker = worker;
      worker.on("exit", () => this._workerSlots[index].worker = void 0);
      startError = await worker.start();
      if (this._isStopped)
        return;
    }
    if (startError)
      jobDispatcher.onExit(startError);
    else
      jobDispatcher.runInWorker(worker);
    const result = await jobDispatcher.jobResult;
    this._updateCounterForWorkerHash(job.workerHash, -1);
    if (result.didFail)
      void worker.stop(
        true
        /* didFail */
      );
    else if (this._isWorkerRedundant(worker))
      void worker.stop();
    if (!this._isStopped && result.newJob) {
      this._queue.unshift(result.newJob);
      this._updateCounterForWorkerHash(result.newJob.workerHash, 1);
    }
  }
  _checkFinished() {
    if (this._finished.isDone())
      return;
    if (this._queue.length && !this._isStopped)
      return;
    if (this._workerSlots.some((w) => w.busy))
      return;
    this._finished.resolve();
  }
  _isWorkerRedundant(worker) {
    let workersWithSameHash = 0;
    for (const slot of this._workerSlots) {
      if (slot.worker && !slot.worker.didSendStop() && slot.worker.hash() === worker.hash())
        workersWithSameHash++;
    }
    return workersWithSameHash > this._queuedOrRunningHashCount.get(worker.hash());
  }
  _updateCounterForWorkerHash(hash, delta) {
    this._queuedOrRunningHashCount.set(hash, delta + (this._queuedOrRunningHashCount.get(hash) || 0));
  }
  async run(testGroups, extraEnvByProjectId) {
    this._extraEnvByProjectId = extraEnvByProjectId;
    this._queue = testGroups;
    for (const group of testGroups)
      this._updateCounterForWorkerHash(group.workerHash, 1);
    this._isStopped = false;
    this._workerSlots = [];
    if (this._failureTracker.hasReachedMaxFailures())
      void this.stop();
    for (let i = 0; i < this._config.config.workers; i++)
      this._workerSlots.push({ busy: false });
    for (let i = 0; i < this._workerSlots.length; i++)
      this._scheduleJob();
    this._checkFinished();
    await this._finished;
  }
  _createWorker(testGroup, parallelIndex, loaderData) {
    const projectConfig = this._config.projects.find((p) => p.id === testGroup.projectId);
    const outputDir = projectConfig.project.outputDir;
    const worker = new import_workerHost.WorkerHost(testGroup, {
      parallelIndex,
      config: loaderData,
      extraEnv: this._extraEnvByProjectId.get(testGroup.projectId) || {},
      outputDir,
      pauseOnError: this._failureTracker.pauseOnError(),
      pauseAtEnd: this._failureTracker.pauseAtEnd(projectConfig)
    });
    const handleOutput = (params) => {
      const chunk = chunkFromParams(params);
      if (worker.didFail()) {
        return { chunk };
      }
      const currentlyRunning = this._workerSlots[parallelIndex].jobDispatcher?.currentlyRunning();
      if (!currentlyRunning)
        return { chunk };
      return { chunk, test: currentlyRunning.test, result: currentlyRunning.result };
    };
    worker.on("stdOut", (params) => {
      const { chunk, test, result } = handleOutput(params);
      result?.stdout.push(chunk);
      this._reporter.onStdOut?.(chunk, test, result);
    });
    worker.on("stdErr", (params) => {
      const { chunk, test, result } = handleOutput(params);
      result?.stderr.push(chunk);
      this._reporter.onStdErr?.(chunk, test, result);
    });
    worker.on("teardownErrors", (params) => {
      this._failureTracker.onWorkerError();
      for (const error of params.fatalErrors)
        this._reporter.onError?.(error);
    });
    worker.on("exit", () => {
      const producedEnv = this._producedEnvByProjectId.get(testGroup.projectId) || {};
      this._producedEnvByProjectId.set(testGroup.projectId, { ...producedEnv, ...worker.producedEnv() });
    });
    worker.onRequest("cloneStorage", async (params) => {
      return await import_storage.Storage.clone(params.storageFile, outputDir);
    });
    worker.onRequest("upstreamStorage", async (params) => {
      await import_storage.Storage.upstream(params.storageFile, params.storageOutFile);
    });
    return worker;
  }
  producedEnvByProjectId() {
    return this._producedEnvByProjectId;
  }
  async stop() {
    if (this._isStopped)
      return;
    this._isStopped = true;
    await Promise.all(this._workerSlots.map(({ worker }) => worker?.stop()));
    this._checkFinished();
  }
}
class JobDispatcher {
  constructor(job, config, reporter, failureTracker, stopCallback) {
    this.jobResult = new import_utils.ManualPromise();
    this._listeners = [];
    this._failedTests = /* @__PURE__ */ new Set();
    this._failedWithNonRetriableError = /* @__PURE__ */ new Set();
    this._remainingByTestId = /* @__PURE__ */ new Map();
    this._dataByTestId = /* @__PURE__ */ new Map();
    this._parallelIndex = 0;
    this._workerIndex = 0;
    this.job = job;
    this._config = config;
    this._reporter = reporter;
    this._failureTracker = failureTracker;
    this._stopCallback = stopCallback;
    this._remainingByTestId = new Map(this.job.tests.map((e) => [e.id, e]));
  }
  _onTestBegin(params) {
    const test = this._remainingByTestId.get(params.testId);
    if (!test) {
      return;
    }
    const result = test._appendTestResult();
    this._dataByTestId.set(test.id, { test, result, steps: /* @__PURE__ */ new Map() });
    result.parallelIndex = this._parallelIndex;
    result.workerIndex = this._workerIndex;
    result.startTime = new Date(params.startWallTime);
    this._reporter.onTestBegin?.(test, result);
    this._currentlyRunning = { test, result };
  }
  _onTestEnd(params) {
    if (this._failureTracker.hasReachedMaxFailures()) {
      params.status = "interrupted";
      params.errors = [];
    }
    const data = this._dataByTestId.get(params.testId);
    if (!data) {
      return;
    }
    this._dataByTestId.delete(params.testId);
    this._remainingByTestId.delete(params.testId);
    const { result, test } = data;
    result.duration = params.duration;
    result.errors = params.errors;
    result.error = result.errors[0];
    result.status = params.status;
    result.annotations = params.annotations;
    test.annotations = [...params.annotations];
    test.expectedStatus = params.expectedStatus;
    test.timeout = params.timeout;
    const isFailure = result.status !== "skipped" && result.status !== test.expectedStatus;
    if (isFailure)
      this._failedTests.add(test);
    if (params.hasNonRetriableError)
      this._addNonretriableTestAndSerialModeParents(test);
    this._reportTestEnd(test, result);
    this._currentlyRunning = void 0;
  }
  _addNonretriableTestAndSerialModeParents(test) {
    this._failedWithNonRetriableError.add(test);
    for (let parent = test.parent; parent; parent = parent.parent) {
      if (parent._parallelMode === "serial")
        this._failedWithNonRetriableError.add(parent);
    }
  }
  _onStepBegin(params) {
    const data = this._dataByTestId.get(params.testId);
    if (!data) {
      return;
    }
    const { result, steps, test } = data;
    const parentStep = params.parentStepId ? steps.get(params.parentStepId) : void 0;
    const step = {
      title: params.title,
      titlePath: () => {
        const parentPath = parentStep?.titlePath() || [];
        return [...parentPath, params.title];
      },
      parent: parentStep,
      category: params.category,
      startTime: new Date(params.wallTime),
      duration: -1,
      steps: [],
      attachments: [],
      annotations: [],
      location: params.location
    };
    steps.set(params.stepId, step);
    (parentStep || result).steps.push(step);
    this._reporter.onStepBegin?.(test, result, step);
  }
  _onStepEnd(params) {
    const data = this._dataByTestId.get(params.testId);
    if (!data) {
      return;
    }
    const { result, steps, test } = data;
    const step = steps.get(params.stepId);
    if (!step) {
      this._reporter.onStdErr?.("Internal error: step end without step begin: " + params.stepId, test, result);
      return;
    }
    step.duration = params.wallTime - step.startTime.getTime();
    if (params.error)
      step.error = params.error;
    if (params.suggestedRebaseline)
      (0, import_rebase.addSuggestedRebaseline)(step.location, params.suggestedRebaseline);
    step.annotations = params.annotations;
    steps.delete(params.stepId);
    this._reporter.onStepEnd?.(test, result, step);
  }
  _onAttach(params) {
    const data = this._dataByTestId.get(params.testId);
    if (!data) {
      return;
    }
    const attachment = {
      name: params.name,
      path: params.path,
      contentType: params.contentType,
      body: params.body !== void 0 ? Buffer.from(params.body, "base64") : void 0
    };
    data.result.attachments.push(attachment);
    if (params.stepId) {
      const step = data.steps.get(params.stepId);
      if (step)
        step.attachments.push(attachment);
      else
        this._reporter.onStdErr?.("Internal error: step id not found: " + params.stepId);
    }
  }
  _failTestWithErrors(test, errors) {
    const runData = this._dataByTestId.get(test.id);
    let result;
    if (runData) {
      result = runData.result;
    } else {
      result = test._appendTestResult();
      this._reporter.onTestBegin?.(test, result);
    }
    result.errors = [...errors];
    result.error = result.errors[0];
    result.status = errors.length ? "failed" : "skipped";
    this._reportTestEnd(test, result);
    this._failedTests.add(test);
  }
  _massSkipTestsFromRemaining(testIds, errors) {
    for (const test of this._remainingByTestId.values()) {
      if (!testIds.has(test.id))
        continue;
      if (!this._failureTracker.hasReachedMaxFailures()) {
        this._failTestWithErrors(test, errors);
        errors = [];
      }
      this._remainingByTestId.delete(test.id);
    }
    if (errors.length) {
      this._failureTracker.onWorkerError();
      for (const error of errors)
        this._reporter.onError?.(error);
    }
  }
  _onDone(params) {
    if (!this._remainingByTestId.size && !this._failedTests.size && !params.fatalErrors.length && !params.skipTestsDueToSetupFailure.length && !params.fatalUnknownTestIds && !params.unexpectedExitError && !params.stoppedDueToUnhandledErrorInTestFail) {
      this._finished({ didFail: false });
      return;
    }
    for (const testId of params.fatalUnknownTestIds || []) {
      const test = this._remainingByTestId.get(testId);
      if (test) {
        this._remainingByTestId.delete(testId);
        this._failTestWithErrors(test, [{ message: `Test not found in the worker process. Make sure test title does not change.` }]);
      }
    }
    if (params.fatalErrors.length) {
      this._massSkipTestsFromRemaining(new Set(this._remainingByTestId.keys()), params.fatalErrors);
    }
    this._massSkipTestsFromRemaining(new Set(params.skipTestsDueToSetupFailure), []);
    if (params.unexpectedExitError) {
      if (this._currentlyRunning)
        this._massSkipTestsFromRemaining(/* @__PURE__ */ new Set([this._currentlyRunning.test.id]), [params.unexpectedExitError]);
      else
        this._massSkipTestsFromRemaining(new Set(this._remainingByTestId.keys()), [params.unexpectedExitError]);
    }
    const retryCandidates = /* @__PURE__ */ new Set();
    const serialSuitesWithFailures = /* @__PURE__ */ new Set();
    for (const failedTest of this._failedTests) {
      if (this._failedWithNonRetriableError.has(failedTest))
        continue;
      retryCandidates.add(failedTest);
      let outermostSerialSuite;
      for (let parent = failedTest.parent; parent; parent = parent.parent) {
        if (parent._parallelMode === "serial")
          outermostSerialSuite = parent;
      }
      if (outermostSerialSuite && !this._failedWithNonRetriableError.has(outermostSerialSuite))
        serialSuitesWithFailures.add(outermostSerialSuite);
    }
    const testsBelongingToSomeSerialSuiteWithFailures = [...this._remainingByTestId.values()].filter((test) => {
      let parent = test.parent;
      while (parent && !serialSuitesWithFailures.has(parent))
        parent = parent.parent;
      return !!parent;
    });
    this._massSkipTestsFromRemaining(new Set(testsBelongingToSomeSerialSuiteWithFailures.map((test) => test.id)), []);
    for (const serialSuite of serialSuitesWithFailures) {
      serialSuite.allTests().forEach((test) => retryCandidates.add(test));
    }
    const remaining = [...this._remainingByTestId.values()];
    for (const test of retryCandidates) {
      if (test.results.length < test.retries + 1)
        remaining.push(test);
    }
    const newJob = remaining.length ? { ...this.job, tests: remaining } : void 0;
    this._finished({ didFail: true, newJob });
  }
  onExit(data) {
    const unexpectedExitError = data.unexpectedly ? {
      message: `Error: worker process exited unexpectedly (code=${data.code}, signal=${data.signal})`
    } : void 0;
    this._onDone({ skipTestsDueToSetupFailure: [], fatalErrors: [], unexpectedExitError });
  }
  _finished(result) {
    import_utils.eventsHelper.removeEventListeners(this._listeners);
    this.jobResult.resolve(result);
  }
  runInWorker(worker) {
    this._parallelIndex = worker.parallelIndex;
    this._workerIndex = worker.workerIndex;
    const runPayload = {
      file: this.job.requireFile,
      entries: this.job.tests.map((test) => {
        return { testId: test.id, retry: test.results.length };
      })
    };
    worker.runTestGroup(runPayload);
    this._listeners = [
      import_utils.eventsHelper.addEventListener(worker, "testBegin", this._onTestBegin.bind(this)),
      import_utils.eventsHelper.addEventListener(worker, "testEnd", this._onTestEnd.bind(this)),
      import_utils.eventsHelper.addEventListener(worker, "stepBegin", this._onStepBegin.bind(this)),
      import_utils.eventsHelper.addEventListener(worker, "stepEnd", this._onStepEnd.bind(this)),
      import_utils.eventsHelper.addEventListener(worker, "attach", this._onAttach.bind(this)),
      import_utils.eventsHelper.addEventListener(worker, "testPaused", this._onTestPaused.bind(this, worker)),
      import_utils.eventsHelper.addEventListener(worker, "done", this._onDone.bind(this)),
      import_utils.eventsHelper.addEventListener(worker, "exit", this.onExit.bind(this))
    ];
  }
  _onTestPaused(worker, params) {
    const data = this._dataByTestId.get(params.testId);
    if (!data)
      return;
    const { result, test } = data;
    const sendMessage = async (message) => {
      try {
        if (this.jobResult.isDone())
          throw new Error("Test has already stopped");
        const response = await worker.sendCustomMessage({ testId: test.id, request: message.request });
        if (response.error)
          (0, import_internalReporter.addLocationAndSnippetToError)(this._config.config, response.error);
        return response;
      } catch (e) {
        const error = (0, import_util.serializeError)(e);
        (0, import_internalReporter.addLocationAndSnippetToError)(this._config.config, error);
        return { response: void 0, error };
      }
    };
    result.status = params.status;
    result.errors = params.errors;
    result.error = result.errors[0];
    void this._reporter.onTestPaused?.(test, result).then(() => {
      worker.sendResume({});
    });
    this._failureTracker.onTestPaused?.({ ...params, sendMessage });
  }
  skipWholeJob() {
    const allTestsSkipped = this.job.tests.every((test) => test.expectedStatus === "skipped");
    if (allTestsSkipped && !this._failureTracker.hasReachedMaxFailures()) {
      for (const test of this.job.tests) {
        const result = test._appendTestResult();
        this._reporter.onTestBegin?.(test, result);
        result.status = "skipped";
        result.annotations = [...test.annotations];
        this._reportTestEnd(test, result);
      }
      return true;
    }
    return false;
  }
  currentlyRunning() {
    return this._currentlyRunning;
  }
  _reportTestEnd(test, result) {
    this._reporter.onTestEnd?.(test, result);
    const hadMaxFailures = this._failureTracker.hasReachedMaxFailures();
    this._failureTracker.onTestEnd(test, result);
    if (this._failureTracker.hasReachedMaxFailures()) {
      this._stopCallback();
      if (!hadMaxFailures)
        this._reporter.onError?.({ message: import_utils2.colors.red(`Testing stopped early after ${this._failureTracker.maxFailures()} maximum allowed failures.`) });
    }
  }
}
function chunkFromParams(params) {
  if (typeof params.text === "string")
    return params.text;
  return Buffer.from(params.buffer, "base64");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Dispatcher
});
