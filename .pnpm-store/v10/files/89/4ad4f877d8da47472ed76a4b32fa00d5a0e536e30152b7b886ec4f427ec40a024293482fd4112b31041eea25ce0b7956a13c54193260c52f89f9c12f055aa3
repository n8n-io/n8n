'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = exports.TestEnvironment = void 0;
function _jsdom() {
  const data = require('jsdom');
  _jsdom = function () {
    return data;
  };
  return data;
}
function _fakeTimers() {
  const data = require('@jest/fake-timers');
  _fakeTimers = function () {
    return data;
  };
  return data;
}
function _jestMock() {
  const data = require('jest-mock');
  _jestMock = function () {
    return data;
  };
  return data;
}
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// The `Window` interface does not have an `Error.stackTraceLimit` property, but
// `JSDOMEnvironment` assumes it is there.
function isString(value) {
  return typeof value === 'string';
}
class JSDOMEnvironment {
  dom;
  fakeTimers;
  fakeTimersModern;
  global;
  errorEventListener;
  moduleMocker;
  customExportConditions = ['browser'];
  _configuredExportConditions;
  constructor(config, context) {
    const {projectConfig} = config;
    const virtualConsole = new (_jsdom().VirtualConsole)();
    virtualConsole.sendTo(context.console, {
      omitJSDOMErrors: true
    });
    virtualConsole.on('jsdomError', error => {
      context.console.error(error);
    });
    this.dom = new (_jsdom().JSDOM)(
      typeof projectConfig.testEnvironmentOptions.html === 'string'
        ? projectConfig.testEnvironmentOptions.html
        : '<!DOCTYPE html>',
      {
        pretendToBeVisual: true,
        resources:
          typeof projectConfig.testEnvironmentOptions.userAgent === 'string'
            ? new (_jsdom().ResourceLoader)({
                userAgent: projectConfig.testEnvironmentOptions.userAgent
              })
            : undefined,
        runScripts: 'dangerously',
        url: 'http://localhost/',
        virtualConsole,
        ...projectConfig.testEnvironmentOptions
      }
    );
    const global = (this.global = this.dom.window);
    if (global == null) {
      throw new Error('JSDOM did not return a Window object');
    }

    // @ts-expect-error - for "universal" code (code should use `globalThis`)
    global.global = global;

    // Node's error-message stack size is limited at 10, but it's pretty useful
    // to see more than that when a test fails.
    this.global.Error.stackTraceLimit = 100;
    (0, _jestUtil().installCommonGlobals)(global, projectConfig.globals);

    // TODO: remove this ASAP, but it currently causes tests to run really slow
    global.Buffer = Buffer;

    // Report uncaught errors.
    this.errorEventListener = event => {
      if (userErrorListenerCount === 0 && event.error != null) {
        process.emit('uncaughtException', event.error);
      }
    };
    global.addEventListener('error', this.errorEventListener);

    // However, don't report them as uncaught if the user listens to 'error' event.
    // In that case, we assume the might have custom error handling logic.
    const originalAddListener = global.addEventListener.bind(global);
    const originalRemoveListener = global.removeEventListener.bind(global);
    let userErrorListenerCount = 0;
    global.addEventListener = function (...args) {
      if (args[0] === 'error') {
        userErrorListenerCount++;
      }
      return originalAddListener.apply(this, args);
    };
    global.removeEventListener = function (...args) {
      if (args[0] === 'error') {
        userErrorListenerCount--;
      }
      return originalRemoveListener.apply(this, args);
    };
    if ('customExportConditions' in projectConfig.testEnvironmentOptions) {
      const {customExportConditions} = projectConfig.testEnvironmentOptions;
      if (
        Array.isArray(customExportConditions) &&
        customExportConditions.every(isString)
      ) {
        this._configuredExportConditions = customExportConditions;
      } else {
        throw new Error(
          'Custom export conditions specified but they are not an array of strings'
        );
      }
    }
    this.moduleMocker = new (_jestMock().ModuleMocker)(global);
    this.fakeTimers = new (_fakeTimers().LegacyFakeTimers)({
      config: projectConfig,
      global: global,
      moduleMocker: this.moduleMocker,
      timerConfig: {
        idToRef: id => id,
        refToId: ref => ref
      }
    });
    this.fakeTimersModern = new (_fakeTimers().ModernFakeTimers)({
      config: projectConfig,
      global: global
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup() {}
  async teardown() {
    if (this.fakeTimers) {
      this.fakeTimers.dispose();
    }
    if (this.fakeTimersModern) {
      this.fakeTimersModern.dispose();
    }
    if (this.global != null) {
      if (this.errorEventListener) {
        this.global.removeEventListener('error', this.errorEventListener);
      }
      this.global.close();
    }
    this.errorEventListener = null;
    // @ts-expect-error: this.global not allowed to be `null`
    this.global = null;
    this.dom = null;
    this.fakeTimers = null;
    this.fakeTimersModern = null;
  }
  exportConditions() {
    return this._configuredExportConditions ?? this.customExportConditions;
  }
  getVmContext() {
    if (this.dom) {
      return this.dom.getInternalVMContext();
    }
    return null;
  }
}
exports.default = JSDOMEnvironment;
const TestEnvironment = JSDOMEnvironment;
exports.TestEnvironment = TestEnvironment;
