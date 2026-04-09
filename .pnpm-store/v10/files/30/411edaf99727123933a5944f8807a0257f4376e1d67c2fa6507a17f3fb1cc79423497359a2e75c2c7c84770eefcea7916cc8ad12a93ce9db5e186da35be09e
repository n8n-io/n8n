/**
 * @license React
 * scheduler.native.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";
function push(heap, node) {
  var index = heap.length;
  heap.push(node);
  a: for (; 0 < index; ) {
    var parentIndex = (index - 1) >>> 1,
      parent = heap[parentIndex];
    if (0 < compare(parent, node))
      (heap[parentIndex] = node), (heap[index] = parent), (index = parentIndex);
    else break a;
  }
}
function peek(heap) {
  return 0 === heap.length ? null : heap[0];
}
function pop(heap) {
  if (0 === heap.length) return null;
  var first = heap[0],
    last = heap.pop();
  if (last !== first) {
    heap[0] = last;
    a: for (
      var index = 0, length = heap.length, halfLength = length >>> 1;
      index < halfLength;

    ) {
      var leftIndex = 2 * (index + 1) - 1,
        left = heap[leftIndex],
        rightIndex = leftIndex + 1,
        right = heap[rightIndex];
      if (0 > compare(left, last))
        rightIndex < length && 0 > compare(right, left)
          ? ((heap[index] = right),
            (heap[rightIndex] = last),
            (index = rightIndex))
          : ((heap[index] = left),
            (heap[leftIndex] = last),
            (index = leftIndex));
      else if (rightIndex < length && 0 > compare(right, last))
        (heap[index] = right), (heap[rightIndex] = last), (index = rightIndex);
      else break a;
    }
  }
  return first;
}
function compare(a, b) {
  var diff = a.sortIndex - b.sortIndex;
  return 0 !== diff ? diff : a.id - b.id;
}
var getCurrentTime;
if ("object" === typeof performance && "function" === typeof performance.now) {
  var localPerformance = performance;
  getCurrentTime = function () {
    return localPerformance.now();
  };
} else {
  var localDate = Date,
    initialTime = localDate.now();
  getCurrentTime = function () {
    return localDate.now() - initialTime;
  };
}
var taskQueue = [],
  timerQueue = [],
  taskIdCounter = 1,
  currentTask = null,
  currentPriorityLevel = 3,
  isPerformingWork = !1,
  isHostCallbackScheduled = !1,
  isHostTimeoutScheduled = !1,
  needsPaint = !1,
  localSetTimeout = "function" === typeof setTimeout ? setTimeout : null,
  localClearTimeout = "function" === typeof clearTimeout ? clearTimeout : null,
  localSetImmediate = "undefined" !== typeof setImmediate ? setImmediate : null;
function advanceTimers(currentTime) {
  for (var timer = peek(timerQueue); null !== timer; ) {
    if (null === timer.callback) pop(timerQueue);
    else if (timer.startTime <= currentTime)
      pop(timerQueue),
        (timer.sortIndex = timer.expirationTime),
        push(taskQueue, timer);
    else break;
    timer = peek(timerQueue);
  }
}
function handleTimeout(currentTime) {
  isHostTimeoutScheduled = !1;
  advanceTimers(currentTime);
  if (!isHostCallbackScheduled)
    if (null !== peek(taskQueue))
      (isHostCallbackScheduled = !0),
        isMessageLoopRunning ||
          ((isMessageLoopRunning = !0), schedulePerformWorkUntilDeadline());
    else {
      var firstTimer = peek(timerQueue);
      null !== firstTimer &&
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
}
function unstable_scheduleCallback$1(priorityLevel, callback, options) {
  var currentTime = getCurrentTime();
  "object" === typeof options && null !== options
    ? ((options = options.delay),
      (options =
        "number" === typeof options && 0 < options
          ? currentTime + options
          : currentTime))
    : (options = currentTime);
  switch (priorityLevel) {
    case 1:
      var timeout = -1;
      break;
    case 2:
      timeout = 250;
      break;
    case 5:
      timeout = 1073741823;
      break;
    case 4:
      timeout = 1e4;
      break;
    default:
      timeout = 5e3;
  }
  timeout = options + timeout;
  priorityLevel = {
    id: taskIdCounter++,
    callback: callback,
    priorityLevel: priorityLevel,
    startTime: options,
    expirationTime: timeout,
    sortIndex: -1
  };
  options > currentTime
    ? ((priorityLevel.sortIndex = options),
      push(timerQueue, priorityLevel),
      null === peek(taskQueue) &&
        priorityLevel === peek(timerQueue) &&
        (isHostTimeoutScheduled
          ? (localClearTimeout(taskTimeoutID), (taskTimeoutID = -1))
          : (isHostTimeoutScheduled = !0),
        requestHostTimeout(handleTimeout, options - currentTime)))
    : ((priorityLevel.sortIndex = timeout),
      push(taskQueue, priorityLevel),
      isHostCallbackScheduled ||
        isPerformingWork ||
        ((isHostCallbackScheduled = !0),
        isMessageLoopRunning ||
          ((isMessageLoopRunning = !0), schedulePerformWorkUntilDeadline())));
  return priorityLevel;
}
function unstable_cancelCallback$1(task) {
  task.callback = null;
}
function unstable_getCurrentPriorityLevel$1() {
  return currentPriorityLevel;
}
var isMessageLoopRunning = !1,
  taskTimeoutID = -1,
  startTime = -1;
function shouldYieldToHost() {
  return needsPaint ? !0 : 5 > getCurrentTime() - startTime ? !1 : !0;
}
function requestPaint() {
  needsPaint = !0;
}
function performWorkUntilDeadline() {
  needsPaint = !1;
  if (isMessageLoopRunning) {
    var currentTime = getCurrentTime();
    startTime = currentTime;
    var hasMoreWork = !0;
    try {
      a: {
        isHostCallbackScheduled = !1;
        isHostTimeoutScheduled &&
          ((isHostTimeoutScheduled = !1),
          localClearTimeout(taskTimeoutID),
          (taskTimeoutID = -1));
        isPerformingWork = !0;
        var previousPriorityLevel = currentPriorityLevel;
        try {
          b: {
            advanceTimers(currentTime);
            for (
              currentTask = peek(taskQueue);
              null !== currentTask &&
              !(
                currentTask.expirationTime > currentTime && shouldYieldToHost()
              );

            ) {
              var callback = currentTask.callback;
              if ("function" === typeof callback) {
                currentTask.callback = null;
                currentPriorityLevel = currentTask.priorityLevel;
                var continuationCallback = callback(
                  currentTask.expirationTime <= currentTime
                );
                currentTime = getCurrentTime();
                if ("function" === typeof continuationCallback) {
                  currentTask.callback = continuationCallback;
                  advanceTimers(currentTime);
                  hasMoreWork = !0;
                  break b;
                }
                currentTask === peek(taskQueue) && pop(taskQueue);
                advanceTimers(currentTime);
              } else pop(taskQueue);
              currentTask = peek(taskQueue);
            }
            if (null !== currentTask) hasMoreWork = !0;
            else {
              var firstTimer = peek(timerQueue);
              null !== firstTimer &&
                requestHostTimeout(
                  handleTimeout,
                  firstTimer.startTime - currentTime
                );
              hasMoreWork = !1;
            }
          }
          break a;
        } finally {
          (currentTask = null),
            (currentPriorityLevel = previousPriorityLevel),
            (isPerformingWork = !1);
        }
        hasMoreWork = void 0;
      }
    } finally {
      hasMoreWork
        ? schedulePerformWorkUntilDeadline()
        : (isMessageLoopRunning = !1);
    }
  }
}
var schedulePerformWorkUntilDeadline;
if ("function" === typeof localSetImmediate)
  schedulePerformWorkUntilDeadline = function () {
    localSetImmediate(performWorkUntilDeadline);
  };
else if ("undefined" !== typeof MessageChannel) {
  var channel = new MessageChannel(),
    port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = function () {
    port.postMessage(null);
  };
} else
  schedulePerformWorkUntilDeadline = function () {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
function requestHostTimeout(callback, ms) {
  taskTimeoutID = localSetTimeout(function () {
    callback(getCurrentTime());
  }, ms);
}
var unstable_UserBlockingPriority =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_UserBlockingPriority
      : 2,
  unstable_NormalPriority =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_NormalPriority
      : 3,
  unstable_LowPriority =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_LowPriority
      : 4,
  unstable_ImmediatePriority =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_ImmediatePriority
      : 1,
  unstable_scheduleCallback =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_scheduleCallback
      : unstable_scheduleCallback$1,
  unstable_cancelCallback =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_cancelCallback
      : unstable_cancelCallback$1,
  unstable_getCurrentPriorityLevel =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_getCurrentPriorityLevel
      : unstable_getCurrentPriorityLevel$1,
  unstable_shouldYield =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_shouldYield
      : shouldYieldToHost,
  unstable_requestPaint =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_requestPaint
      : requestPaint,
  unstable_now =
    "undefined" !== typeof nativeRuntimeScheduler
      ? nativeRuntimeScheduler.unstable_now
      : getCurrentTime;
function throwNotImplemented() {
  throw Error("Not implemented.");
}
exports.unstable_IdlePriority =
  "undefined" !== typeof nativeRuntimeScheduler
    ? nativeRuntimeScheduler.unstable_IdlePriority
    : 5;
exports.unstable_ImmediatePriority = unstable_ImmediatePriority;
exports.unstable_LowPriority = unstable_LowPriority;
exports.unstable_NormalPriority = unstable_NormalPriority;
exports.unstable_Profiling = null;
exports.unstable_UserBlockingPriority = unstable_UserBlockingPriority;
exports.unstable_cancelCallback = unstable_cancelCallback;
exports.unstable_forceFrameRate = throwNotImplemented;
exports.unstable_getCurrentPriorityLevel = unstable_getCurrentPriorityLevel;
exports.unstable_next = throwNotImplemented;
exports.unstable_now = unstable_now;
exports.unstable_requestPaint = unstable_requestPaint;
exports.unstable_runWithPriority = throwNotImplemented;
exports.unstable_scheduleCallback = unstable_scheduleCallback;
exports.unstable_shouldYield = unstable_shouldYield;
exports.unstable_wrapCallback = throwNotImplemented;
