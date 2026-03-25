'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = collectHandles;
exports.formatHandleErrors = formatHandleErrors;
function asyncHooks() {
  const data = _interopRequireWildcard(require('async_hooks'));
  asyncHooks = function () {
    return data;
  };
  return data;
}
function _util() {
  const data = require('util');
  _util = function () {
    return data;
  };
  return data;
}
function v8() {
  const data = _interopRequireWildcard(require('v8'));
  v8 = function () {
    return data;
  };
  return data;
}
function vm() {
  const data = _interopRequireWildcard(require('vm'));
  vm = function () {
    return data;
  };
  return data;
}
function _stripAnsi() {
  const data = _interopRequireDefault(require('strip-ansi'));
  _stripAnsi = function () {
    return data;
  };
  return data;
}
function _jestMessageUtil() {
  const data = require('jest-message-util');
  _jestMessageUtil = function () {
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
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually */

function stackIsFromUser(stack) {
  // Either the test file, or something required by it
  if (stack.includes('Runtime.requireModule')) {
    return true;
  }

  // jest-jasmine it or describe call
  if (stack.includes('asyncJestTest') || stack.includes('asyncJestLifecycle')) {
    return true;
  }

  // An async function call from within circus
  if (stack.includes('callAsyncCircusFn')) {
    // jest-circus it or describe call
    return (
      stack.includes('_callCircusTest') || stack.includes('_callCircusHook')
    );
  }
  return false;
}
const alwaysActive = () => true;

// @ts-expect-error: doesn't exist in v12 typings
const hasWeakRef = typeof WeakRef === 'function';
const asyncSleep = (0, _util().promisify)(setTimeout);
let gcFunc = globalThis.gc;
function runGC() {
  if (!gcFunc) {
    v8().setFlagsFromString('--expose-gc');
    gcFunc = vm().runInNewContext('gc');
    v8().setFlagsFromString('--no-expose-gc');
    if (!gcFunc) {
      throw new Error(
        'Cannot find `global.gc` function. Please run node with `--expose-gc` and report this issue in jest repo.'
      );
    }
  }
  gcFunc();
}

// Inspired by https://github.com/mafintosh/why-is-node-running/blob/master/index.js
// Extracted as we want to format the result ourselves
function collectHandles() {
  const activeHandles = new Map();
  const hook = asyncHooks().createHook({
    destroy(asyncId) {
      activeHandles.delete(asyncId);
    },
    init: function initHook(asyncId, type, triggerAsyncId, resource) {
      // Skip resources that should not generally prevent the process from
      // exiting, not last a meaningfully long time, or otherwise shouldn't be
      // tracked.
      if (
        type === 'PROMISE' ||
        type === 'TIMERWRAP' ||
        type === 'ELDHISTOGRAM' ||
        type === 'PerformanceObserver' ||
        type === 'RANDOMBYTESREQUEST' ||
        type === 'DNSCHANNEL' ||
        type === 'ZLIB' ||
        type === 'SIGNREQUEST'
      ) {
        return;
      }
      const error = new (_jestUtil().ErrorWithStack)(type, initHook, 100);
      let fromUser = stackIsFromUser(error.stack || '');

      // If the async resource was not directly created by user code, but was
      // triggered by another async resource from user code, track it and use
      // the original triggering resource's stack.
      if (!fromUser) {
        const triggeringHandle = activeHandles.get(triggerAsyncId);
        if (triggeringHandle) {
          fromUser = true;
          error.stack = triggeringHandle.error.stack;
        }
      }
      if (fromUser) {
        let isActive;

        // Handle that supports hasRef
        if ('hasRef' in resource) {
          if (hasWeakRef) {
            // @ts-expect-error: doesn't exist in v12 typings
            const ref = new WeakRef(resource);
            isActive = () => {
              return ref.deref()?.hasRef() ?? false;
            };
          } else {
            isActive = resource.hasRef.bind(resource);
          }
        } else {
          // Handle that doesn't support hasRef
          isActive = alwaysActive;
        }
        activeHandles.set(asyncId, {
          error,
          isActive
        });
      }
    }
  });
  hook.enable();
  return async () => {
    // Wait briefly for any async resources that have been queued for
    // destruction to actually be destroyed.
    // For example, Node.js TCP Servers are not destroyed until *after* their
    // `close` callback runs. If someone finishes a test from the `close`
    // callback, we will not yet have seen the resource be destroyed here.
    await asyncSleep(100);
    if (activeHandles.size > 0) {
      // For some special objects such as `TLSWRAP`.
      // Ref: https://github.com/facebook/jest/issues/11665
      runGC();
      await asyncSleep(0);
    }
    hook.disable();

    // Get errors for every async resource still referenced at this moment
    const result = Array.from(activeHandles.values())
      .filter(({isActive}) => isActive())
      .map(({error}) => error);
    activeHandles.clear();
    return result;
  };
}
function formatHandleErrors(errors, config) {
  const stacks = new Set();
  return (
    errors
      .map(err =>
        (0, _jestMessageUtil().formatExecError)(
          err,
          config,
          {
            noStackTrace: false
          },
          undefined,
          true
        )
      )
      // E.g. timeouts might give multiple traces to the same line of code
      // This hairy filtering tries to remove entries with duplicate stack traces
      .filter(handle => {
        const ansiFree = (0, _stripAnsi().default)(handle);
        const match = ansiFree.match(/\s+at(.*)/);
        if (!match || match.length < 2) {
          return true;
        }
        const stack = ansiFree.substr(ansiFree.indexOf(match[1])).trim();
        if (stacks.has(stack)) {
          return false;
        }
        stacks.add(stack);
        return true;
      })
  );
}
