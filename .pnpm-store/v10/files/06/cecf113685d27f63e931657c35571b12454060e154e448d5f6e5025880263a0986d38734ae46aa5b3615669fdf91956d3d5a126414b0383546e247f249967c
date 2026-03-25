'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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
var _BaseReporter = _interopRequireDefault(require('./BaseReporter'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const titleSeparator = ' \u203A ';
const ICONS = _jestUtil().specialChars.ICONS;
class GitHubActionsReporter extends _BaseReporter.default {
  static filename = __filename;
  options;
  constructor(
    _globalConfig,
    reporterOptions = {
      silent: true
    }
  ) {
    super();
    this.options = {
      silent:
        typeof reporterOptions.silent === 'boolean'
          ? reporterOptions.silent
          : true
    };
  }
  onTestResult(test, testResult, aggregatedResults) {
    this.generateAnnotations(test, testResult);
    if (!this.options.silent) {
      this.printFullResult(test.context, testResult);
    }
    if (this.isLastTestSuite(aggregatedResults)) {
      this.printFailedTestLogs(test, aggregatedResults);
    }
  }
  generateAnnotations({context}, {testResults}) {
    testResults.forEach(result => {
      const title = [...result.ancestorTitles, result.title].join(
        titleSeparator
      );
      result.retryReasons?.forEach((retryReason, index) => {
        this.#createAnnotation({
          ...this.#getMessageDetails(retryReason, context.config),
          title: `RETRY ${index + 1}: ${title}`,
          type: 'warning'
        });
      });
      result.failureMessages.forEach(failureMessage => {
        this.#createAnnotation({
          ...this.#getMessageDetails(failureMessage, context.config),
          title,
          type: 'error'
        });
      });
    });
  }
  #getMessageDetails(failureMessage, config) {
    const {message, stack} = (0, _jestMessageUtil().separateMessageFromStack)(
      failureMessage
    );
    const stackLines = (0, _jestMessageUtil().getStackTraceLines)(stack);
    const topFrame = (0, _jestMessageUtil().getTopFrame)(stackLines);
    const normalizedStackLines = stackLines.map(line =>
      (0, _jestMessageUtil().formatPath)(line, config)
    );
    const messageText = [message, ...normalizedStackLines].join('\n');
    return {
      file: topFrame?.file,
      line: topFrame?.line,
      message: messageText
    };
  }
  #createAnnotation({file, line, message, title, type}) {
    message = (0, _stripAnsi().default)(
      // copied from: https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
      message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
    );
    this.log(
      `\n::${type} file=${file},line=${line},title=${title}::${message}`
    );
  }
  isLastTestSuite(results) {
    const passedTestSuites = results.numPassedTestSuites;
    const failedTestSuites = results.numFailedTestSuites;
    const totalTestSuites = results.numTotalTestSuites;
    const computedTotal = passedTestSuites + failedTestSuites;
    if (computedTotal < totalTestSuites) {
      return false;
    } else if (computedTotal === totalTestSuites) {
      return true;
    } else {
      throw new Error(
        `Sum(${computedTotal}) of passed (${passedTestSuites}) and failed (${failedTestSuites}) test suites is greater than the total number of test suites (${totalTestSuites}). Please report the bug at https://github.com/facebook/jest/issues`
      );
    }
  }
  printFullResult(context, results) {
    const rootDir = context.config.rootDir;
    let testDir = results.testFilePath.replace(rootDir, '');
    testDir = testDir.slice(1, testDir.length);
    const resultTree = this.getResultTree(
      results.testResults,
      testDir,
      results.perfStats
    );
    this.printResultTree(resultTree);
  }
  arrayEqual(a1, a2) {
    if (a1.length !== a2.length) {
      return false;
    }
    for (let index = 0; index < a1.length; index++) {
      const element = a1[index];
      if (element !== a2[index]) {
        return false;
      }
    }
    return true;
  }
  arrayChild(a1, a2) {
    if (a1.length - a2.length !== 1) {
      return false;
    }
    for (let index = 0; index < a2.length; index++) {
      const element = a2[index];
      if (element !== a1[index]) {
        return false;
      }
    }
    return true;
  }
  getResultTree(suiteResult, testPath, suitePerf) {
    const root = {
      children: [],
      name: testPath,
      passed: true,
      performanceInfo: suitePerf
    };
    const branches = [];
    suiteResult.forEach(element => {
      if (element.ancestorTitles.length === 0) {
        if (element.status === 'failed') {
          root.passed = false;
        }
        const duration = element.duration || 1;
        root.children.push({
          children: [],
          duration,
          name: element.title,
          status: element.status
        });
      } else {
        let alreadyInserted = false;
        for (let index = 0; index < branches.length; index++) {
          if (
            this.arrayEqual(branches[index], element.ancestorTitles.slice(0, 1))
          ) {
            alreadyInserted = true;
            break;
          }
        }
        if (!alreadyInserted) {
          branches.push(element.ancestorTitles.slice(0, 1));
        }
      }
    });
    branches.forEach(element => {
      const newChild = this.getResultChildren(suiteResult, element);
      if (!newChild.passed) {
        root.passed = false;
      }
      root.children.push(newChild);
    });
    return root;
  }
  getResultChildren(suiteResult, ancestors) {
    const node = {
      children: [],
      name: ancestors[ancestors.length - 1],
      passed: true
    };
    const branches = [];
    suiteResult.forEach(element => {
      let duration = element.duration;
      if (!duration || isNaN(duration)) {
        duration = 1;
      }
      if (this.arrayEqual(element.ancestorTitles, ancestors)) {
        if (element.status === 'failed') {
          node.passed = false;
        }
        node.children.push({
          children: [],
          duration,
          name: element.title,
          status: element.status
        });
      } else if (
        this.arrayChild(
          element.ancestorTitles.slice(0, ancestors.length + 1),
          ancestors
        )
      ) {
        let alreadyInserted = false;
        for (let index = 0; index < branches.length; index++) {
          if (
            this.arrayEqual(
              branches[index],
              element.ancestorTitles.slice(0, ancestors.length + 1)
            )
          ) {
            alreadyInserted = true;
            break;
          }
        }
        if (!alreadyInserted) {
          branches.push(element.ancestorTitles.slice(0, ancestors.length + 1));
        }
      }
    });
    branches.forEach(element => {
      const newChild = this.getResultChildren(suiteResult, element);
      if (!newChild.passed) {
        node.passed = false;
      }
      node.children.push(newChild);
    });
    return node;
  }
  printResultTree(resultTree) {
    let perfMs;
    if (resultTree.performanceInfo.slow) {
      perfMs = ` (${_chalk().default.red.inverse(
        `${resultTree.performanceInfo.runtime} ms`
      )})`;
    } else {
      perfMs = ` (${resultTree.performanceInfo.runtime} ms)`;
    }
    if (resultTree.passed) {
      this.startGroup(
        `${_chalk().default.bold.green.inverse('PASS')} ${
          resultTree.name
        }${perfMs}`
      );
      resultTree.children.forEach(child => {
        this.recursivePrintResultTree(child, true, 1);
      });
      this.endGroup();
    } else {
      this.log(
        `  ${_chalk().default.bold.red.inverse('FAIL')} ${
          resultTree.name
        }${perfMs}`
      );
      resultTree.children.forEach(child => {
        this.recursivePrintResultTree(child, false, 1);
      });
    }
  }
  recursivePrintResultTree(resultTree, alreadyGrouped, depth) {
    if (resultTree.children.length === 0) {
      if (!('duration' in resultTree)) {
        throw new Error('Expected a leaf. Got a node.');
      }
      let numberSpaces = depth;
      if (!alreadyGrouped) {
        numberSpaces++;
      }
      const spaces = '  '.repeat(numberSpaces);
      let resultSymbol;
      switch (resultTree.status) {
        case 'passed':
          resultSymbol = _chalk().default.green(ICONS.success);
          break;
        case 'failed':
          resultSymbol = _chalk().default.red(ICONS.failed);
          break;
        case 'todo':
          resultSymbol = _chalk().default.magenta(ICONS.todo);
          break;
        case 'pending':
        case 'skipped':
          resultSymbol = _chalk().default.yellow(ICONS.pending);
          break;
      }
      this.log(
        `${spaces + resultSymbol} ${resultTree.name} (${
          resultTree.duration
        } ms)`
      );
    } else {
      if (!('passed' in resultTree)) {
        throw new Error('Expected a node. Got a leaf');
      }
      if (resultTree.passed) {
        if (alreadyGrouped) {
          this.log('  '.repeat(depth) + resultTree.name);
          resultTree.children.forEach(child => {
            this.recursivePrintResultTree(child, true, depth + 1);
          });
        } else {
          this.startGroup('  '.repeat(depth) + resultTree.name);
          resultTree.children.forEach(child => {
            this.recursivePrintResultTree(child, true, depth + 1);
          });
          this.endGroup();
        }
      } else {
        this.log('  '.repeat(depth + 1) + resultTree.name);
        resultTree.children.forEach(child => {
          this.recursivePrintResultTree(child, false, depth + 1);
        });
      }
    }
  }
  printFailedTestLogs(context, testResults) {
    const rootDir = context.context.config.rootDir;
    const results = testResults.testResults;
    let written = false;
    results.forEach(result => {
      let testDir = result.testFilePath;
      testDir = testDir.replace(rootDir, '');
      testDir = testDir.slice(1, testDir.length);
      if (result.failureMessage) {
        if (!written) {
          this.log('');
          written = true;
        }
        this.startGroup(`Errors thrown in ${testDir}`);
        this.log(result.failureMessage);
        this.endGroup();
      }
    });
    return written;
  }
  startGroup(title) {
    this.log(`::group::${title}`);
  }
  endGroup() {
    this.log('::endgroup::');
  }
}
exports.default = GitHubActionsReporter;
