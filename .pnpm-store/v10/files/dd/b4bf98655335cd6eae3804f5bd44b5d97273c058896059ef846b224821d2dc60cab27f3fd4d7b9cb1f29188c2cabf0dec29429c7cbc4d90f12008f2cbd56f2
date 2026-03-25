Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const STACKTRACE_FRAME_LIMIT = 50;
const UNKNOWN_FUNCTION = '?';
// Used to sanitize webpack (error: *) wrapped stack errors
const WEBPACK_ERROR_REGEXP = /\(error: (.*)\)/;
const STRIP_FRAME_REGEXP = /captureMessage|captureException/;

/**
 * Creates a stack parser with the supplied line parsers
 *
 * StackFrames are returned in the correct order for Sentry Exception
 * frames and with Sentry SDK internal frames removed from the top and bottom
 *
 */
function createStackParser(...parsers) {
  const sortedParsers = parsers.sort((a, b) => a[0] - b[0]).map(p => p[1]);

  return (stack, skipFirstLines = 0, framesToPop = 0) => {
    const frames = [];
    const lines = stack.split('\n');

    for (let i = skipFirstLines; i < lines.length; i++) {
      let line = lines[i] ;
      // Truncate lines over 1kb because many of the regular expressions use
      // backtracking which results in run time that increases exponentially
      // with input size. Huge strings can result in hangs/Denial of Service:
      // https://github.com/getsentry/sentry-javascript/issues/2286
      if (line.length > 1024) {
        line = line.slice(0, 1024);
      }

      // https://github.com/getsentry/sentry-javascript/issues/5459
      // Remove webpack (error: *) wrappers
      const cleanedLine = WEBPACK_ERROR_REGEXP.test(line) ? line.replace(WEBPACK_ERROR_REGEXP, '$1') : line;

      // https://github.com/getsentry/sentry-javascript/issues/7813
      // Skip Error: lines
      if (cleanedLine.match(/\S*Error: /)) {
        continue;
      }

      for (const parser of sortedParsers) {
        const frame = parser(cleanedLine);

        if (frame) {
          frames.push(frame);
          break;
        }
      }

      if (frames.length >= STACKTRACE_FRAME_LIMIT + framesToPop) {
        break;
      }
    }

    return stripSentryFramesAndReverse(frames.slice(framesToPop));
  };
}

/**
 * Gets a stack parser implementation from Options.stackParser
 * @see Options
 *
 * If options contains an array of line parsers, it is converted into a parser
 */
function stackParserFromStackParserOptions(stackParser) {
  if (Array.isArray(stackParser)) {
    return createStackParser(...stackParser);
  }
  return stackParser;
}

/**
 * Removes Sentry frames from the top and bottom of the stack if present and enforces a limit of max number of frames.
 * Assumes stack input is ordered from top to bottom and returns the reverse representation so call site of the
 * function that caused the crash is the last frame in the array.
 * @hidden
 */
function stripSentryFramesAndReverse(stack) {
  if (!stack.length) {
    return [];
  }

  const localStack = Array.from(stack);

  // If stack starts with one of our API calls, remove it (starts, meaning it's the top of the stack - aka last call)
  if (/sentryWrapped/.test(getLastStackFrame(localStack).function || '')) {
    localStack.pop();
  }

  // Reversing in the middle of the procedure allows us to just pop the values off the stack
  localStack.reverse();

  // If stack ends with one of our internal API calls, remove it (ends, meaning it's the bottom of the stack - aka top-most call)
  if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || '')) {
    localStack.pop();

    // When using synthetic events, we will have a 2 levels deep stack, as `new Error('Sentry syntheticException')`
    // is produced within the scope itself, making it:
    //
    //   Sentry.captureException()
    //   scope.captureException()
    //
    // instead of just the top `Sentry` call itself.
    // This forces us to possibly strip an additional frame in the exact same was as above.
    if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || '')) {
      localStack.pop();
    }
  }

  return localStack.slice(0, STACKTRACE_FRAME_LIMIT).map(frame => ({
    ...frame,
    filename: frame.filename || getLastStackFrame(localStack).filename,
    function: frame.function || UNKNOWN_FUNCTION,
  }));
}

function getLastStackFrame(arr) {
  return arr[arr.length - 1] || {};
}

const defaultFunctionName = '<anonymous>';

/**
 * Safely extract function name from itself
 */
function getFunctionName(fn) {
  try {
    if (!fn || typeof fn !== 'function') {
      return defaultFunctionName;
    }
    return fn.name || defaultFunctionName;
  } catch {
    // Just accessing custom props in some Selenium environments
    // can cause a "Permission denied" exception (see raven-js#495).
    return defaultFunctionName;
  }
}

/**
 * Get's stack frames from an event without needing to check for undefined properties.
 */
function getFramesFromEvent(event) {
  const exception = event.exception;

  if (exception) {
    const frames = [];
    try {
      // @ts-expect-error Object could be undefined
      exception.values.forEach(value => {
        // @ts-expect-error Value could be undefined
        if (value.stacktrace.frames) {
          // @ts-expect-error Value could be undefined
          frames.push(...value.stacktrace.frames);
        }
      });
      return frames;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Get the internal name of an internal Vue value, to represent it in a stacktrace.
 *
 * @param value The value to get the internal name of.
 */
function getVueInternalName(value) {
  // Check if it's a VNode (has __v_isVNode) or a component instance (has _isVue/__isVue)
  const isVNode = '__v_isVNode' in value && value.__v_isVNode;

  return isVNode ? '[VueVNode]' : '[VueViewModel]';
}

/**
 * Normalizes stack line paths by removing file:// prefix and leading slashes for Windows paths
 */
function normalizeStackTracePath(path) {
  let filename = path?.startsWith('file://') ? path.slice(7) : path;
  // If it's a Windows path, trim the leading slash so that `/C:/foo` becomes `C:/foo`
  if (filename?.match(/\/[A-Z]:/)) {
    filename = filename.slice(1);
  }
  return filename;
}

exports.UNKNOWN_FUNCTION = UNKNOWN_FUNCTION;
exports.createStackParser = createStackParser;
exports.getFramesFromEvent = getFramesFromEvent;
exports.getFunctionName = getFunctionName;
exports.getVueInternalName = getVueInternalName;
exports.normalizeStackTracePath = normalizeStackTracePath;
exports.stackParserFromStackParserOptions = stackParserFromStackParserOptions;
exports.stripSentryFramesAndReverse = stripSentryFramesAndReverse;
//# sourceMappingURL=stacktrace.js.map
