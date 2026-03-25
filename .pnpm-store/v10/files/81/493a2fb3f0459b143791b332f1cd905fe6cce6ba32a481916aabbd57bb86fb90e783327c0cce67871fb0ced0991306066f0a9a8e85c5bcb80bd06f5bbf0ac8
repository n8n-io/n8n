'use strict';

const stripAnsi = require('strip-ansi');
const constants = require('../constants/index');
const path = require('path');
const fs = require('fs');
const getTestSuitePropertiesPath = require('./getTestSuitePropertiesPath');
const replaceRootDirInOutput = require('./getOptions').replaceRootDirInOutput;

// Wrap the varName with template tags
const toTemplateTag = function (varName) {
  return "{" + varName + "}";
}

const testFailureStatus = 'failed';
const testErrorStatus = 'error';

// Replaces var using a template string or a function.
// When strOrFunc is a template string replaces {varname} with the value from the variables map.
// When strOrFunc is a function it returns the result of the function to which the variables are passed.
const replaceVars = function (strOrFunc, variables) {
  if (typeof strOrFunc === 'string') {
    let str = strOrFunc;
    Object.keys(variables).forEach((varName) => {
      str = str.replace(toTemplateTag(varName), variables[varName]);
    });
    return str;
  } else {
    const func = strOrFunc;
    const resolvedStr = func(variables);
    if (typeof resolvedStr !== 'string') {
      throw new Error('Template function should return a string');
    }
    return resolvedStr;
  }
};

const executionTime = function (startTime, endTime) {
  return (endTime - startTime) / 1000;
}

const getTestCasePropertiesPath = (options, rootDir = null) => {
  const testCasePropertiesPath = replaceRootDirInOutput(
    rootDir,
    path.join(
      options.testCasePropertiesDirectory,
      options.testCasePropertiesFile,
    ),
  );

  return path.isAbsolute(testCasePropertiesPath)
    ? testCasePropertiesPath
    : path.resolve(testCasePropertiesPath);
};

const generateTestCase = function(junitOptions, suiteOptions, tc, filepath, filename, suiteTitle, displayName, getGetCaseProperties){
  const classname = tc.ancestorTitles.join(suiteOptions.ancestorSeparator);
  const testTitle = tc.title;

  // Build replacement map
  let testVariables = {};
  testVariables[constants.FILEPATH_VAR] = filepath;
  testVariables[constants.FILENAME_VAR] = filename;
  testVariables[constants.SUITENAME_VAR] = suiteTitle;
  testVariables[constants.CLASSNAME_VAR] = classname;
  testVariables[constants.TITLE_VAR] = testTitle;
  testVariables[constants.DISPLAY_NAME_VAR] = displayName;

  let testCase = {
    'testcase': [{
      _attr: {
        classname: replaceVars(suiteOptions.classNameTemplate, testVariables),
        name: replaceVars(suiteOptions.titleTemplate, testVariables),
        time: tc.duration / 1000
      }
    }]
  };

  if (suiteOptions.addFileAttribute === 'true') {
    testCase.testcase[0]._attr.file = filepath;
  }

  // Write out all failure messages as <failure> tags
  // Nested underneath <testcase> tag
  if (tc.status === testFailureStatus || tc.status === testErrorStatus) {
    const failureMessages = junitOptions.noStackTrace === 'true' && tc.failureDetails ?
        tc.failureDetails.map(detail => detail.message) : tc.failureMessages;

    failureMessages.forEach((failure) => {
      const tagName = tc.status === testFailureStatus ? 'failure': testErrorStatus
      testCase.testcase.push({
        [tagName]: strip(failure)
      });
    })
  }

  // Write out a <skipped> tag if test is skipped
  // Nested underneath <testcase> tag
  if (tc.status === 'pending') {
    testCase.testcase.push({
      skipped: {}
    });
  }

  if (getGetCaseProperties !== null) {
    let junitCaseProperties = getGetCaseProperties(tc);

    // Add any test suite properties
    let testCasePropertyMain = {
      'properties': []
    };

    Object.keys(junitCaseProperties).forEach((p) => {
      let testSuiteProperty = {
        'property': {
          _attr: {
            name: p,
            value: junitCaseProperties[p]
          }
        }
      };

      testCasePropertyMain.properties.push(testSuiteProperty);
    });

    testCase.testcase.push(testCasePropertyMain);
  }

  return testCase;
}

const addErrorTestResult = function (suite) {
  suite.testResults.push({
    "ancestorTitles": [],
    "duration": 0,
    "failureMessages": [
      suite.failureMessage
    ],
    "numPassingAsserts": 0,
    "status": testErrorStatus
  })
}

// Strips escape codes for readability and illegal XML characters to produce valid output.
const strip = function (str) {
  return stripAnsi(str).replace(/\u001b/g, '');
}

module.exports = function (report, appDirectory, options, rootDir = null) {
  // Check if there is a junitProperties.js (or whatever they called it)
  const junitSuitePropertiesFilePath = getTestSuitePropertiesPath(
    options,
    rootDir,
  );
  let ignoreSuitePropertiesCheck = !fs.existsSync(junitSuitePropertiesFilePath);

  const testCasePropertiesPath = getTestCasePropertiesPath(options, rootDir)
  const getTestCaseProperties = fs.existsSync(testCasePropertiesPath) ? require(testCasePropertiesPath) : null

  // If the usePathForSuiteName option is true and the
  // suiteNameTemplate value is set to the default, overrides
  // the suiteNameTemplate.
  if (options.usePathForSuiteName === 'true' &&
      options.suiteNameTemplate === toTemplateTag(constants.TITLE_VAR)) {

    options.suiteNameTemplate = toTemplateTag(constants.FILEPATH_VAR);
  }

  // Generate a single XML file for all jest tests
  let jsonResults = {
    'testsuites': [{
      '_attr': {
        'name': options.suiteName,
        'tests': 0,
        'failures': 0,
        'errors': 0,
        // Overall execution time:
        // Since tests are typically executed in parallel this time can be significantly smaller
        // than the sum of the individual test suites
        'time': executionTime(report.startTime, Date.now())
      }
    }]
  };

  // Iterate through outer testResults (test suites)
  report.testResults.forEach((suite) => {
    const noResults = suite.testResults.length === 0;
    if (noResults && options.reportTestSuiteErrors === 'false') {
      return;
    }

    const noResultOptions = noResults ? {
      suiteNameTemplate: toTemplateTag(constants.FILEPATH_VAR),
      titleTemplate: toTemplateTag(constants.FILEPATH_VAR),
      classNameTemplate: `Test suite failed to run`
    } : {};

    const suiteOptions = Object.assign({}, options, noResultOptions);
    if (noResults) {
      addErrorTestResult(suite);
    }

    // Build variables for suite name
    const filepath = path.join(suiteOptions.filePathPrefix, path.relative(appDirectory, suite.testFilePath));
    const filename = path.basename(filepath);
    const suiteTitle = suite.testResults[0].ancestorTitles[0];
    const displayName = typeof suite.displayName === 'object'
      ? suite.displayName.name
      : suite.displayName;

    // Build replacement map
    let suiteNameVariables = {};
    suiteNameVariables[constants.FILEPATH_VAR] = filepath;
    suiteNameVariables[constants.FILENAME_VAR] = filename;
    suiteNameVariables[constants.TITLE_VAR] = suiteTitle;
    suiteNameVariables[constants.DISPLAY_NAME_VAR] = displayName;

    // Add <testsuite /> properties
    const suiteNumTests = suite.numFailingTests + suite.numPassingTests + suite.numPendingTests;
    const suiteExecutionTime = executionTime(suite.perfStats.start, suite.perfStats.end);

    const suiteErrors = noResults ? 1 : 0;
    let testSuite = {
      'testsuite': [{
        _attr: {
          name: replaceVars(suiteOptions.suiteNameTemplate, suiteNameVariables),
          errors: suiteErrors,
          failures: suite.numFailingTests,
          skipped: suite.numPendingTests,
          timestamp: (new Date(suite.perfStats.start)).toISOString().slice(0, -5),
          time: suiteExecutionTime,
          tests: suiteNumTests
        }
      }]
    };

    // Update top level testsuites properties
    jsonResults.testsuites[0]._attr.failures += suite.numFailingTests;
    jsonResults.testsuites[0]._attr.errors += suiteErrors;
    jsonResults.testsuites[0]._attr.tests += suiteNumTests;

    if (!ignoreSuitePropertiesCheck) {
      let junitSuiteProperties = require(junitSuitePropertiesFilePath)(suite);

      // Add any test suite properties
      let testSuitePropertyMain = {
        'properties': []
      };

      Object.keys(junitSuiteProperties).forEach((p) => {
        let testSuiteProperty = {
          'property': {
            _attr: {
              name: p,
              value: replaceVars(junitSuiteProperties[p], suiteNameVariables)
            }
          }
        };

        testSuitePropertyMain.properties.push(testSuiteProperty);
      });

      testSuite.testsuite.push(testSuitePropertyMain);
    }

    // Iterate through test cases
    suite.testResults.forEach((tc) => {
      const testCase = generateTestCase(
        options,
        suiteOptions,
        tc,
        filepath,
        filename,
        suiteTitle,
        displayName,
        getTestCaseProperties
      );
      testSuite.testsuite.push(testCase);
    });

    // We have all tests passed but a failure in a test hook like in the `beforeAll` method
    // Make sure we log them since Jest still reports the suite as failed
    if (suite.testExecError != null) {
      const fakeTC = {
        status: testFailureStatus,
        failureMessages: [JSON.stringify(suite.testExecError)],
        classname: undefined,
        title: "Test execution failure: could be caused by test hooks like 'afterAll'.",
        ancestorTitles: [""],
        duration: 0,
        invocations: 1,
      };
      const testCase = generateTestCase(
        options,
        suiteOptions,
        fakeTC,
        filepath,
        filename,
        suiteTitle,
        displayName,
        getTestCaseProperties
      );
      testSuite.testsuite.push(testCase);
    }

    // Write stdout console output if available
    if (suiteOptions.includeConsoleOutput === 'true' && suite.console && suite.console.length) {
      // Stringify the entire console object
      // Easier this way because formatting in a readable way is tough with XML
      // And this can be parsed more easily
      let testSuiteConsole = {
        'system-out': {
          _cdata: JSON.stringify(suite.console, null, 2)
        }
      };

      testSuite.testsuite.push(testSuiteConsole);
    }

    // Write short stdout console output if available
    if (suiteOptions.includeShortConsoleOutput === 'true' && suite.console && suite.console.length) {
      // Extract and then Stringify the console message value
      // Easier this way because formatting in a readable way is tough with XML
      // And this can be parsed more easily
      let testSuiteConsole = {
        'system-out': {
          _cdata: JSON.stringify(suite.console.map(item => item.message), null, 2)
        }
      };

      testSuite.testsuite.push(testSuiteConsole);
    }

    jsonResults.testsuites.push(testSuite);
  });

  return jsonResults;
};
