import { filenameIsInApp } from './node-stack-trace.js';
import { UNKNOWN_FUNCTION } from './stacktrace.js';

/**
 * A node.js watchdog timer
 * @param pollInterval The interval that we expect to get polled at
 * @param anrThreshold The threshold for when we consider ANR
 * @param callback The callback to call for ANR
 * @returns An object with `poll` and `enabled` functions {@link WatchdogReturn}
 */
function watchdogTimer(
  createTimer,
  pollInterval,
  anrThreshold,
  callback,
) {
  const timer = createTimer();
  let triggered = false;
  let enabled = true;

  setInterval(() => {
    const diffMs = timer.getTimeMs();

    if (triggered === false && diffMs > pollInterval + anrThreshold) {
      triggered = true;
      if (enabled) {
        callback();
      }
    }

    if (diffMs < pollInterval + anrThreshold) {
      triggered = false;
    }
  }, 20);

  return {
    poll: () => {
      timer.reset();
    },
    enabled: (state) => {
      enabled = state;
    },
  };
}

// types copied from inspector.d.ts

/**
 * Converts Debugger.CallFrame to Sentry StackFrame
 */
function callFrameToStackFrame(
  frame,
  url,
  getModuleFromFilename,
) {
  const filename = url ? url.replace(/^file:\/\//, '') : undefined;

  // CallFrame row/col are 0 based, whereas StackFrame are 1 based
  const colno = frame.location.columnNumber ? frame.location.columnNumber + 1 : undefined;
  const lineno = frame.location.lineNumber ? frame.location.lineNumber + 1 : undefined;

  return {
    filename,
    module: getModuleFromFilename(filename),
    function: frame.functionName || UNKNOWN_FUNCTION,
    colno,
    lineno,
    in_app: filename ? filenameIsInApp(filename) : undefined,
  };
}

export { callFrameToStackFrame, watchdogTimer };
//# sourceMappingURL=anr.js.map
