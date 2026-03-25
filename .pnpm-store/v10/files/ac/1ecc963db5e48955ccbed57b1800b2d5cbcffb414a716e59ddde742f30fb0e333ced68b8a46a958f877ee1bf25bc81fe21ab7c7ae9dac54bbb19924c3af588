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
var taskRunner_exports = {};
__export(taskRunner_exports, {
  TaskRunner: () => TaskRunner
});
module.exports = __toCommonJS(taskRunner_exports);
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_sigIntWatcher = require("./sigIntWatcher");
var import_util = require("../util");
class TaskRunner {
  constructor(reporter, globalTimeoutForError) {
    this._tasks = [];
    this._hasErrors = false;
    this._interrupted = false;
    this._isTearDown = false;
    this._reporter = reporter;
    this._globalTimeoutForError = globalTimeoutForError;
  }
  addTask(task) {
    this._tasks.push(task);
  }
  async run(context, deadline, cancelPromise) {
    const { status, cleanup } = await this.runDeferCleanup(context, deadline, cancelPromise);
    const teardownStatus = await cleanup();
    return status === "passed" ? teardownStatus : status;
  }
  async runDeferCleanup(context, deadline, cancelPromise = new import_utils.ManualPromise()) {
    const sigintWatcher = new import_sigIntWatcher.SigIntWatcher();
    const timeoutWatcher = new TimeoutWatcher(deadline);
    const teardownRunner = new TaskRunner(this._reporter, this._globalTimeoutForError);
    teardownRunner._isTearDown = true;
    let currentTaskName;
    const taskLoop = async () => {
      for (const task of this._tasks) {
        currentTaskName = task.title;
        if (this._interrupted)
          break;
        (0, import_utilsBundle.debug)("pw:test:task")(`"${task.title}" started`);
        const errors = [];
        const softErrors = [];
        try {
          teardownRunner._tasks.unshift({ title: `teardown for ${task.title}`, setup: task.teardown });
          await task.setup?.(context, errors, softErrors);
        } catch (e) {
          (0, import_utilsBundle.debug)("pw:test:task")(`error in "${task.title}": `, e);
          errors.push((0, import_util.serializeError)(e));
        } finally {
          for (const error of [...softErrors, ...errors])
            this._reporter.onError?.(error);
          if (errors.length) {
            if (!this._isTearDown)
              this._interrupted = true;
            this._hasErrors = true;
          }
        }
        (0, import_utilsBundle.debug)("pw:test:task")(`"${task.title}" finished`);
      }
    };
    await Promise.race([
      taskLoop(),
      cancelPromise,
      sigintWatcher.promise(),
      timeoutWatcher.promise
    ]);
    sigintWatcher.disarm();
    timeoutWatcher.disarm();
    this._interrupted = true;
    let status = "passed";
    if (sigintWatcher.hadSignal() || cancelPromise?.isDone()) {
      status = "interrupted";
    } else if (timeoutWatcher.timedOut()) {
      this._reporter.onError?.({ message: import_utils2.colors.red(`Timed out waiting ${this._globalTimeoutForError / 1e3}s for the ${currentTaskName} to run`) });
      status = "timedout";
    } else if (this._hasErrors) {
      status = "failed";
    }
    cancelPromise?.resolve();
    const cleanup = () => teardownRunner.runDeferCleanup(context, deadline).then((r) => r.status);
    return { status, cleanup };
  }
}
class TimeoutWatcher {
  constructor(deadline) {
    this._timedOut = false;
    this.promise = new import_utils.ManualPromise();
    if (!deadline)
      return;
    if (deadline - (0, import_utils.monotonicTime)() <= 0) {
      this._timedOut = true;
      this.promise.resolve();
      return;
    }
    this._timer = setTimeout(() => {
      this._timedOut = true;
      this.promise.resolve();
    }, deadline - (0, import_utils.monotonicTime)());
  }
  timedOut() {
    return this._timedOut;
  }
  disarm() {
    clearTimeout(this._timer);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TaskRunner
});
