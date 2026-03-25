'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.separateMessageFromStack =
  exports.indentAllLines =
  exports.getTopFrame =
  exports.getStackTraceLines =
  exports.formatStackTrace =
  exports.formatResultsErrors =
  exports.formatPath =
  exports.formatExecError =
    void 0;
var path = _interopRequireWildcard(require('path'));
var _url = require('url');
var _util = require('util');
var _codeFrame = require('@babel/code-frame');
var _chalk = _interopRequireDefault(require('chalk'));
var fs = _interopRequireWildcard(require('graceful-fs'));
var _micromatch = _interopRequireDefault(require('micromatch'));
var _slash = _interopRequireDefault(require('slash'));
var _stackUtils = _interopRequireDefault(require('stack-utils'));
var _prettyFormat = require('pretty-format');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestReadFile =
  globalThis[Symbol.for('jest-native-read-file')] || fs.readFileSync;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// stack utils tries to create pretty stack by making paths relative.
const stackUtils = new _stackUtils.default({
  cwd: 'something which does not exist'
});
let nodeInternals = [];
try {
  nodeInternals = _stackUtils.default.nodeInternals();
} catch {
  // `StackUtils.nodeInternals()` fails in browsers. We don't need to remove
  // node internals in the browser though, so no issue.
}
const PATH_NODE_MODULES = `${path.sep}node_modules${path.sep}`;
const PATH_JEST_PACKAGES = `${path.sep}jest${path.sep}packages${path.sep}`;

// filter for noisy stack trace lines
const JASMINE_IGNORE =
  /^\s+at(?:(?:.jasmine-)|\s+jasmine\.buildExpectationResult)/;
const JEST_INTERNALS_IGNORE =
  /^\s+at.*?jest(-.*?)?(\/|\\)(build|node_modules|packages)(\/|\\)/;
const ANONYMOUS_FN_IGNORE = /^\s+at <anonymous>.*$/;
const ANONYMOUS_PROMISE_IGNORE = /^\s+at (new )?Promise \(<anonymous>\).*$/;
const ANONYMOUS_GENERATOR_IGNORE = /^\s+at Generator.next \(<anonymous>\).*$/;
const NATIVE_NEXT_IGNORE = /^\s+at next \(native\).*$/;
const TITLE_INDENT = '  ';
const MESSAGE_INDENT = '    ';
const STACK_INDENT = '      ';
const ANCESTRY_SEPARATOR = ' \u203A ';
const TITLE_BULLET = _chalk.default.bold('\u25cf ');
const STACK_TRACE_COLOR = _chalk.default.dim;
const STACK_PATH_REGEXP = /\s*at.*\(?(:\d*:\d*|native)\)?/;
const EXEC_ERROR_MESSAGE = 'Test suite failed to run';
const NOT_EMPTY_LINE_REGEXP = /^(?!$)/gm;
const indentAllLines = lines =>
  lines.replace(NOT_EMPTY_LINE_REGEXP, MESSAGE_INDENT);
exports.indentAllLines = indentAllLines;
const trim = string => (string || '').trim();

// Some errors contain not only line numbers in stack traces
// e.g. SyntaxErrors can contain snippets of code, and we don't
// want to trim those, because they may have pointers to the column/character
// which will get misaligned.
const trimPaths = string =>
  string.match(STACK_PATH_REGEXP) ? trim(string) : string;
const getRenderedCallsite = (fileContent, line, column) => {
  let renderedCallsite = (0, _codeFrame.codeFrameColumns)(
    fileContent,
    {
      start: {
        column,
        line
      }
    },
    {
      highlightCode: true
    }
  );
  renderedCallsite = indentAllLines(renderedCallsite);
  renderedCallsite = `\n${renderedCallsite}\n`;
  return renderedCallsite;
};
const blankStringRegexp = /^\s*$/;
function checkForCommonEnvironmentErrors(error) {
  if (
    error.includes('ReferenceError: document is not defined') ||
    error.includes('ReferenceError: window is not defined') ||
    error.includes('ReferenceError: navigator is not defined')
  ) {
    return warnAboutWrongTestEnvironment(error, 'jsdom');
  } else if (error.includes('.unref is not a function')) {
    return warnAboutWrongTestEnvironment(error, 'node');
  }
  return error;
}
function warnAboutWrongTestEnvironment(error, env) {
  return (
    _chalk.default.bold.red(
      `The error below may be caused by using the wrong test environment, see ${_chalk.default.dim.underline(
        'https://jestjs.io/docs/configuration#testenvironment-string'
      )}.\nConsider using the "${env}" test environment.\n\n`
    ) + error
  );
}

// ExecError is an error thrown outside of the test suite (not inside an `it` or
// `before/after each` hooks). If it's thrown, none of the tests in the file
// are executed.
const formatExecError = (
  error,
  config,
  options,
  testPath,
  reuseMessage,
  noTitle
) => {
  if (!error || typeof error === 'number') {
    error = new Error(`Expected an Error, but "${String(error)}" was thrown`);
    error.stack = '';
  }
  let message, stack;
  let cause = '';
  const subErrors = [];
  if (typeof error === 'string' || !error) {
    error || (error = 'EMPTY ERROR');
    message = '';
    stack = error;
  } else {
    message = error.message;
    stack =
      typeof error.stack === 'string'
        ? error.stack
        : `thrown: ${(0, _prettyFormat.format)(error, {
            maxDepth: 3
          })}`;
    if ('cause' in error) {
      const prefix = '\n\nCause:\n';
      if (typeof error.cause === 'string' || typeof error.cause === 'number') {
        cause += `${prefix}${error.cause}`;
      } else if (
        _util.types.isNativeError(error.cause) ||
        error.cause instanceof Error
      ) {
        /* `isNativeError` is used, because the error might come from another realm.
         `instanceof Error` is used because `isNativeError` does return `false` for some
         things that are `instanceof Error` like the errors provided in
         [verror](https://www.npmjs.com/package/verror) or [axios](https://axios-http.com).
        */
        const formatted = formatExecError(
          error.cause,
          config,
          options,
          testPath,
          reuseMessage,
          true
        );
        cause += `${prefix}${formatted}`;
      }
    }
    if ('errors' in error && Array.isArray(error.errors)) {
      for (const subError of error.errors) {
        subErrors.push(
          formatExecError(
            subError,
            config,
            options,
            testPath,
            reuseMessage,
            true
          )
        );
      }
    }
  }
  if (cause !== '') {
    cause = indentAllLines(cause);
  }
  const separated = separateMessageFromStack(stack || '');
  stack = separated.stack;
  if (separated.message.includes(trim(message))) {
    // Often stack trace already contains the duplicate of the message
    message = separated.message;
  }
  message = checkForCommonEnvironmentErrors(message);
  message = indentAllLines(message);
  stack =
    stack && !options.noStackTrace
      ? `\n${formatStackTrace(stack, config, options, testPath)}`
      : '';
  if (
    typeof stack !== 'string' ||
    (blankStringRegexp.test(message) && blankStringRegexp.test(stack))
  ) {
    // this can happen if an empty object is thrown.
    message = `thrown: ${(0, _prettyFormat.format)(error, {
      maxDepth: 3
    })}`;
  }
  let messageToUse;
  if (reuseMessage || noTitle) {
    messageToUse = ` ${message.trim()}`;
  } else {
    messageToUse = `${EXEC_ERROR_MESSAGE}\n\n${message}`;
  }
  const title = noTitle ? '' : `${TITLE_INDENT + TITLE_BULLET}`;
  const subErrorStr =
    subErrors.length > 0
      ? indentAllLines(
          `\n\nErrors contained in AggregateError:\n${subErrors.join('\n')}`
        )
      : '';
  return `${title + messageToUse + stack + cause + subErrorStr}\n`;
};
exports.formatExecError = formatExecError;
const removeInternalStackEntries = (lines, options) => {
  let pathCounter = 0;
  return lines.filter(line => {
    if (ANONYMOUS_FN_IGNORE.test(line)) {
      return false;
    }
    if (ANONYMOUS_PROMISE_IGNORE.test(line)) {
      return false;
    }
    if (ANONYMOUS_GENERATOR_IGNORE.test(line)) {
      return false;
    }
    if (NATIVE_NEXT_IGNORE.test(line)) {
      return false;
    }
    if (nodeInternals.some(internal => internal.test(line))) {
      return false;
    }
    if (!STACK_PATH_REGEXP.test(line)) {
      return true;
    }
    if (JASMINE_IGNORE.test(line)) {
      return false;
    }
    if (++pathCounter === 1) {
      return true; // always keep the first line even if it's from Jest
    }

    if (options.noStackTrace) {
      return false;
    }
    if (JEST_INTERNALS_IGNORE.test(line)) {
      return false;
    }
    return true;
  });
};
const formatPath = (line, config, relativeTestPath = null) => {
  // Extract the file path from the trace line.
  const match = line.match(/(^\s*at .*?\(?)([^()]+)(:[0-9]+:[0-9]+\)?.*$)/);
  if (!match) {
    return line;
  }
  let filePath = (0, _slash.default)(path.relative(config.rootDir, match[2]));
  // highlight paths from the current test file
  if (
    (config.testMatch &&
      config.testMatch.length &&
      (0, _micromatch.default)([filePath], config.testMatch).length > 0) ||
    filePath === relativeTestPath
  ) {
    filePath = _chalk.default.reset.cyan(filePath);
  }
  return STACK_TRACE_COLOR(match[1]) + filePath + STACK_TRACE_COLOR(match[3]);
};
exports.formatPath = formatPath;
const getStackTraceLines = (
  stack,
  options = {
    noCodeFrame: false,
    noStackTrace: false
  }
) => removeInternalStackEntries(stack.split(/\n/), options);
exports.getStackTraceLines = getStackTraceLines;
const getTopFrame = lines => {
  for (const line of lines) {
    if (line.includes(PATH_NODE_MODULES) || line.includes(PATH_JEST_PACKAGES)) {
      continue;
    }
    const parsedFrame = stackUtils.parseLine(line.trim());
    if (parsedFrame && parsedFrame.file) {
      if (parsedFrame.file.startsWith('file://')) {
        parsedFrame.file = (0, _slash.default)(
          (0, _url.fileURLToPath)(parsedFrame.file)
        );
      }
      return parsedFrame;
    }
  }
  return null;
};
exports.getTopFrame = getTopFrame;
const formatStackTrace = (stack, config, options, testPath) => {
  const lines = getStackTraceLines(stack, options);
  let renderedCallsite = '';
  const relativeTestPath = testPath
    ? (0, _slash.default)(path.relative(config.rootDir, testPath))
    : null;
  if (!options.noStackTrace && !options.noCodeFrame) {
    const topFrame = getTopFrame(lines);
    if (topFrame) {
      const {column, file: filename, line} = topFrame;
      if (line && filename && path.isAbsolute(filename)) {
        let fileContent;
        try {
          // TODO: check & read HasteFS instead of reading the filesystem:
          // see: https://github.com/jestjs/jest/pull/5405#discussion_r164281696
          fileContent = jestReadFile(filename, 'utf8');
          renderedCallsite = getRenderedCallsite(fileContent, line, column);
        } catch {
          // the file does not exist or is inaccessible, we ignore
        }
      }
    }
  }
  const stacktrace = lines
    .filter(Boolean)
    .map(
      line =>
        STACK_INDENT + formatPath(trimPaths(line), config, relativeTestPath)
    )
    .join('\n');
  return renderedCallsite
    ? `${renderedCallsite}\n${stacktrace}`
    : `\n${stacktrace}`;
};
exports.formatStackTrace = formatStackTrace;
function isErrorOrStackWithCause(errorOrStack) {
  return (
    typeof errorOrStack !== 'string' &&
    'cause' in errorOrStack &&
    (typeof errorOrStack.cause === 'string' ||
      _util.types.isNativeError(errorOrStack.cause) ||
      errorOrStack.cause instanceof Error)
  );
}
function formatErrorStack(errorOrStack, config, options, testPath) {
  // The stack of new Error('message') contains both the message and the stack,
  // thus we need to sanitize and clean it for proper display using separateMessageFromStack.
  const sourceStack =
    typeof errorOrStack === 'string' ? errorOrStack : errorOrStack.stack || '';
  let {message, stack} = separateMessageFromStack(sourceStack);
  stack = options.noStackTrace
    ? ''
    : `${STACK_TRACE_COLOR(
        formatStackTrace(stack, config, options, testPath)
      )}\n`;
  message = checkForCommonEnvironmentErrors(message);
  message = indentAllLines(message);
  let cause = '';
  if (isErrorOrStackWithCause(errorOrStack)) {
    const nestedCause = formatErrorStack(
      errorOrStack.cause,
      config,
      options,
      testPath
    );
    cause = `\n${MESSAGE_INDENT}Cause:\n${nestedCause}`;
  }
  return `${message}\n${stack}${cause}`;
}
function failureDetailsToErrorOrStack(failureDetails, content) {
  if (!failureDetails) {
    return content;
  }
  if (
    _util.types.isNativeError(failureDetails) ||
    failureDetails instanceof Error
  ) {
    return failureDetails; // receiving raw errors for jest-circus
  }

  if (
    typeof failureDetails === 'object' &&
    'error' in failureDetails &&
    (_util.types.isNativeError(failureDetails.error) ||
      failureDetails.error instanceof Error)
  ) {
    return failureDetails.error; // receiving instances of FailedAssertion for jest-jasmine
  }

  return content;
}
const formatResultsErrors = (testResults, config, options, testPath) => {
  const failedResults = testResults.reduce((errors, result) => {
    result.failureMessages.forEach((item, index) => {
      errors.push({
        content: item,
        failureDetails: result.failureDetails[index],
        result
      });
    });
    return errors;
  }, []);
  if (!failedResults.length) {
    return null;
  }
  return failedResults
    .map(({result, content, failureDetails}) => {
      const rootErrorOrStack = failureDetailsToErrorOrStack(
        failureDetails,
        content
      );
      const title = `${_chalk.default.bold.red(
        TITLE_INDENT +
          TITLE_BULLET +
          result.ancestorTitles.join(ANCESTRY_SEPARATOR) +
          (result.ancestorTitles.length ? ANCESTRY_SEPARATOR : '') +
          result.title
      )}\n`;
      return `${title}\n${formatErrorStack(
        rootErrorOrStack,
        config,
        options,
        testPath
      )}`;
    })
    .join('\n');
};
exports.formatResultsErrors = formatResultsErrors;
const errorRegexp = /^Error:?\s*$/;
const removeBlankErrorLine = str =>
  str
    .split('\n')
    // Lines saying just `Error:` are useless
    .filter(line => !errorRegexp.test(line))
    .join('\n')
    .trimRight();

// jasmine and worker farm sometimes don't give us access to the actual
// Error object, so we have to regexp out the message from the stack string
// to format it.
const separateMessageFromStack = content => {
  if (!content) {
    return {
      message: '',
      stack: ''
    };
  }

  // All lines up to what looks like a stack -- or if nothing looks like a stack
  // (maybe it's a code frame instead), just the first non-empty line.
  // If the error is a plain "Error:" instead of a SyntaxError or TypeError we
  // remove the prefix from the message because it is generally not useful.
  const messageMatch = content.match(
    /^(?:Error: )?([\s\S]*?(?=\n\s*at\s.*:\d*:\d*)|\s*.*)([\s\S]*)$/
  );
  if (!messageMatch) {
    // For typescript
    throw new Error('If you hit this error, the regex above is buggy.');
  }
  const message = removeBlankErrorLine(messageMatch[1]);
  const stack = removeBlankErrorLine(messageMatch[2]);
  return {
    message,
    stack
  };
};
exports.separateMessageFromStack = separateMessageFromStack;
