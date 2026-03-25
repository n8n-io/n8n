'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = exports.TestEnvironment = void 0;
function _vm() {
  const data = require('vm');
  _vm = function () {
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

// some globals we do not want, either because deprecated or we set it ourselves
const denyList = new Set([
  'GLOBAL',
  'root',
  'global',
  'globalThis',
  'Buffer',
  'ArrayBuffer',
  'Uint8Array',
  // if env is loaded within a jest test
  'jest-symbol-do-not-touch'
]);
const nodeGlobals = new Map(
  Object.getOwnPropertyNames(globalThis)
    .filter(global => !denyList.has(global))
    .map(nodeGlobalsKey => {
      const descriptor = Object.getOwnPropertyDescriptor(
        globalThis,
        nodeGlobalsKey
      );
      if (!descriptor) {
        throw new Error(
          `No property descriptor for ${nodeGlobalsKey}, this is a bug in Jest.`
        );
      }
      return [nodeGlobalsKey, descriptor];
    })
);
function isString(value) {
  return typeof value === 'string';
}
class NodeEnvironment {
  context;
  fakeTimers;
  fakeTimersModern;
  global;
  moduleMocker;
  customExportConditions = ['node', 'node-addons'];
  _configuredExportConditions;

  // while `context` is unused, it should always be passed
  constructor(config, _context) {
    const {projectConfig} = config;
    this.context = (0, _vm().createContext)();
    const global = (0, _vm().runInContext)(
      'this',
      Object.assign(this.context, projectConfig.testEnvironmentOptions)
    );
    this.global = global;
    const contextGlobals = new Set(Object.getOwnPropertyNames(global));
    for (const [nodeGlobalsKey, descriptor] of nodeGlobals) {
      if (!contextGlobals.has(nodeGlobalsKey)) {
        if (descriptor.configurable) {
          Object.defineProperty(global, nodeGlobalsKey, {
            configurable: true,
            enumerable: descriptor.enumerable,
            get() {
              const value = globalThis[nodeGlobalsKey];

              // override lazy getter
              Object.defineProperty(global, nodeGlobalsKey, {
                configurable: true,
                enumerable: descriptor.enumerable,
                value,
                writable: true
              });
              return value;
            },
            set(value) {
              // override lazy getter
              Object.defineProperty(global, nodeGlobalsKey, {
                configurable: true,
                enumerable: descriptor.enumerable,
                value,
                writable: true
              });
            }
          });
        } else if ('value' in descriptor) {
          Object.defineProperty(global, nodeGlobalsKey, {
            configurable: false,
            enumerable: descriptor.enumerable,
            value: descriptor.value,
            writable: descriptor.writable
          });
        } else {
          Object.defineProperty(global, nodeGlobalsKey, {
            configurable: false,
            enumerable: descriptor.enumerable,
            get: descriptor.get,
            set: descriptor.set
          });
        }
      }
    }

    // @ts-expect-error - Buffer and gc is "missing"
    global.global = global;
    global.Buffer = Buffer;
    global.ArrayBuffer = ArrayBuffer;
    // TextEncoder (global or via 'util') references a Uint8Array constructor
    // different than the global one used by users in tests. This makes sure the
    // same constructor is referenced by both.
    global.Uint8Array = Uint8Array;
    (0, _jestUtil().installCommonGlobals)(global, projectConfig.globals);

    // Node's error-message stack size is limited at 10, but it's pretty useful
    // to see more than that when a test fails.
    global.Error.stackTraceLimit = 100;
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
    const timerIdToRef = id => ({
      id,
      ref() {
        return this;
      },
      unref() {
        return this;
      }
    });
    const timerRefToId = timer => timer?.id;
    this.fakeTimers = new (_fakeTimers().LegacyFakeTimers)({
      config: projectConfig,
      global,
      moduleMocker: this.moduleMocker,
      timerConfig: {
        idToRef: timerIdToRef,
        refToId: timerRefToId
      }
    });
    this.fakeTimersModern = new (_fakeTimers().ModernFakeTimers)({
      config: projectConfig,
      global
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
    this.context = null;
    this.fakeTimers = null;
    this.fakeTimersModern = null;
  }
  exportConditions() {
    return this._configuredExportConditions ?? this.customExportConditions;
  }
  getVmContext() {
    return this.context;
  }
}
exports.default = NodeEnvironment;
const TestEnvironment = NodeEnvironment;
exports.TestEnvironment = TestEnvironment;
