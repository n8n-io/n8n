"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queueTask = void 0;
// When running within Node.js (including jsdom), we want to use setImmediate
// (which runs immediately) rather than setTimeout (which enforces a minimum
// delay of 1ms, and on Windows only has a resolution of 15ms or so).  jsdom
// doesn't provide setImmediate (to better match the browser environment) and
// sandboxes scripts, but its sandbox is by necessity imperfect, so we can break
// out of it:
//
// - https://github.com/jsdom/jsdom#executing-scripts
// - https://github.com/jsdom/jsdom/issues/2729
// - https://github.com/scala-js/scala-js-macrotask-executor/pull/17
function getSetImmediateFromJsdom() {
  if (typeof navigator !== "undefined" && /jsdom/.test(navigator.userAgent)) {
    const outerRealmFunctionConstructor = Node.constructor;
    return new outerRealmFunctionConstructor("return setImmediate")();
  } else {
    return undefined;
  }
}

// waiting on this PR for typescript types: https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1249

// 'postTask' runs right after microtasks, so equivalent to setTimeout but without the 4ms clamping.
// Using the default priority of 'user-visible' to avoid blocking input while still running fairly quickly.
// See: https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API#task_priorities
const schedulerPostTask = typeof scheduler !== "undefined" && (fn => scheduler.postTask(fn));

// fallback for environments that don't support any of the above
const doSetTimeout = fn => setTimeout(fn, 0);

// Schedules a task to run later.  Use Node.js's setImmediate if available and
// setTimeout otherwise.  Note that options like process.nextTick or
// queueMicrotask will likely not work: IndexedDB semantics require that
// transactions are marked as not active when the event loop runs. The next
// tick queue and microtask queue run within the current event loop macrotask,
// so they'd process database operations too quickly.
const queueTask = fn => {
  const setImmediate = globalThis.setImmediate || getSetImmediateFromJsdom() || schedulerPostTask || doSetTimeout;
  setImmediate(fn);
};
exports.queueTask = queueTask;