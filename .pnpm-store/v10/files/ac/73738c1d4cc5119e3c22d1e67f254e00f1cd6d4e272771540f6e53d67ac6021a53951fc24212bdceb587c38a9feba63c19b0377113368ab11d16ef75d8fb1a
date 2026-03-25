'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _globalErrorHandlers = require('./globalErrorHandlers');
var _types = require('./types');
var _utils = require('./utils');
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestNow = globalThis[Symbol.for('jest-native-now')] || globalThis.Date.now;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const eventHandler = (event, state) => {
  switch (event.name) {
    case 'include_test_location_in_result': {
      state.includeTestLocationInResult = true;
      break;
    }
    case 'hook_start': {
      event.hook.seenDone = false;
      break;
    }
    case 'start_describe_definition': {
      const {blockName, mode} = event;
      const {currentDescribeBlock, currentlyRunningTest} = state;
      if (currentlyRunningTest) {
        currentlyRunningTest.errors.push(
          new Error(
            `Cannot nest a describe inside a test. Describe block "${blockName}" cannot run because it is nested within "${currentlyRunningTest.name}".`
          )
        );
        break;
      }
      const describeBlock = (0, _utils.makeDescribe)(
        blockName,
        currentDescribeBlock,
        mode
      );
      currentDescribeBlock.children.push(describeBlock);
      state.currentDescribeBlock = describeBlock;
      break;
    }
    case 'finish_describe_definition': {
      const {currentDescribeBlock} = state;
      (0, _utils.invariant)(
        currentDescribeBlock,
        'currentDescribeBlock must be there'
      );
      if (!(0, _utils.describeBlockHasTests)(currentDescribeBlock)) {
        currentDescribeBlock.hooks.forEach(hook => {
          hook.asyncError.message = `Invalid: ${hook.type}() may not be used in a describe block containing no tests.`;
          state.unhandledErrors.push(hook.asyncError);
        });
      }

      // pass mode of currentDescribeBlock to tests
      // but do not when there is already a single test with "only" mode
      const shouldPassMode = !(
        currentDescribeBlock.mode === 'only' &&
        currentDescribeBlock.children.some(
          child => child.type === 'test' && child.mode === 'only'
        )
      );
      if (shouldPassMode) {
        currentDescribeBlock.children.forEach(child => {
          if (child.type === 'test' && !child.mode) {
            child.mode = currentDescribeBlock.mode;
          }
        });
      }
      if (
        !state.hasFocusedTests &&
        currentDescribeBlock.mode !== 'skip' &&
        currentDescribeBlock.children.some(
          child => child.type === 'test' && child.mode === 'only'
        )
      ) {
        state.hasFocusedTests = true;
      }
      if (currentDescribeBlock.parent) {
        state.currentDescribeBlock = currentDescribeBlock.parent;
      }
      break;
    }
    case 'add_hook': {
      const {currentDescribeBlock, currentlyRunningTest, hasStarted} = state;
      const {asyncError, fn, hookType: type, timeout} = event;
      if (currentlyRunningTest) {
        currentlyRunningTest.errors.push(
          new Error(
            `Hooks cannot be defined inside tests. Hook of type "${type}" is nested within "${currentlyRunningTest.name}".`
          )
        );
        break;
      } else if (hasStarted) {
        state.unhandledErrors.push(
          new Error(
            'Cannot add a hook after tests have started running. Hooks must be defined synchronously.'
          )
        );
        break;
      }
      const parent = currentDescribeBlock;
      currentDescribeBlock.hooks.push({
        asyncError,
        fn,
        parent,
        seenDone: false,
        timeout,
        type
      });
      break;
    }
    case 'add_test': {
      const {currentDescribeBlock, currentlyRunningTest, hasStarted} = state;
      const {
        asyncError,
        fn,
        mode,
        testName: name,
        timeout,
        concurrent,
        failing
      } = event;
      if (currentlyRunningTest) {
        currentlyRunningTest.errors.push(
          new Error(
            `Tests cannot be nested. Test "${name}" cannot run because it is nested within "${currentlyRunningTest.name}".`
          )
        );
        break;
      } else if (hasStarted) {
        state.unhandledErrors.push(
          new Error(
            'Cannot add a test after tests have started running. Tests must be defined synchronously.'
          )
        );
        break;
      }
      const test = (0, _utils.makeTest)(
        fn,
        mode,
        concurrent,
        name,
        currentDescribeBlock,
        timeout,
        asyncError,
        failing
      );
      if (currentDescribeBlock.mode !== 'skip' && test.mode === 'only') {
        state.hasFocusedTests = true;
      }
      currentDescribeBlock.children.push(test);
      currentDescribeBlock.tests.push(test);
      break;
    }
    case 'hook_failure': {
      const {test, describeBlock, error, hook} = event;
      const {asyncError, type} = hook;
      if (type === 'beforeAll') {
        (0, _utils.invariant)(describeBlock, 'always present for `*All` hooks');
        (0, _utils.addErrorToEachTestUnderDescribe)(
          describeBlock,
          error,
          asyncError
        );
      } else if (type === 'afterAll') {
        // Attaching `afterAll` errors to each test makes execution flow
        // too complicated, so we'll consider them to be global.
        state.unhandledErrors.push([error, asyncError]);
      } else {
        (0, _utils.invariant)(test, 'always present for `*Each` hooks');
        test.errors.push([error, asyncError]);
      }
      break;
    }
    case 'test_skip': {
      event.test.status = 'skip';
      break;
    }
    case 'test_todo': {
      event.test.status = 'todo';
      break;
    }
    case 'test_done': {
      event.test.duration = (0, _utils.getTestDuration)(event.test);
      event.test.status = 'done';
      state.currentlyRunningTest = null;
      break;
    }
    case 'test_start': {
      state.currentlyRunningTest = event.test;
      event.test.startedAt = jestNow();
      event.test.invocations += 1;
      break;
    }
    case 'test_fn_start': {
      event.test.seenDone = false;
      break;
    }
    case 'test_fn_failure': {
      const {
        error,
        test: {asyncError}
      } = event;
      event.test.errors.push([error, asyncError]);
      break;
    }
    case 'test_retry': {
      const logErrorsBeforeRetry =
        // eslint-disable-next-line no-restricted-globals
        global[_types.LOG_ERRORS_BEFORE_RETRY] || false;
      if (logErrorsBeforeRetry) {
        event.test.retryReasons.push(...event.test.errors);
      }
      event.test.errors = [];
      break;
    }
    case 'run_start': {
      state.hasStarted = true;
      /* eslint-disable no-restricted-globals */
      global[_types.TEST_TIMEOUT_SYMBOL] &&
        (state.testTimeout = global[_types.TEST_TIMEOUT_SYMBOL]);
      /* eslint-enable */
      break;
    }
    case 'run_finish': {
      break;
    }
    case 'setup': {
      // Uncaught exception handlers should be defined on the parent process
      // object. If defined on the VM's process object they just no op and let
      // the parent process crash. It might make sense to return a `dispatch`
      // function to the parent process and register handlers there instead, but
      // i'm not sure if this is works. For now i just replicated whatever
      // jasmine was doing -- dabramov
      state.parentProcess = event.parentProcess;
      (0, _utils.invariant)(state.parentProcess);
      state.originalGlobalErrorHandlers = (0,
      _globalErrorHandlers.injectGlobalErrorHandlers)(state.parentProcess);
      if (event.testNamePattern) {
        state.testNamePattern = new RegExp(event.testNamePattern, 'i');
      }
      break;
    }
    case 'teardown': {
      (0, _utils.invariant)(state.originalGlobalErrorHandlers);
      (0, _utils.invariant)(state.parentProcess);
      (0, _globalErrorHandlers.restoreGlobalErrorHandlers)(
        state.parentProcess,
        state.originalGlobalErrorHandlers
      );
      break;
    }
    case 'error': {
      // It's very likely for long-running async tests to throw errors. In this
      // case we want to catch them and fail the current test. At the same time
      // there's a possibility that one test sets a long timeout, that will
      // eventually throw after this test finishes but during some other test
      // execution, which will result in one test's error failing another test.
      // In any way, it should be possible to track where the error was thrown
      // from.
      state.currentlyRunningTest
        ? state.currentlyRunningTest.errors.push(event.error)
        : state.unhandledErrors.push(event.error);
      break;
    }
  }
};
var _default = eventHandler;
exports.default = _default;
