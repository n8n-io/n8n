/*
 * Jake JavaScript build tool
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

let path = require('path');
let currDir = process.cwd();

/**
  @name jake
  @namespace jake
*/
/**
  @name jake.TestTask
  @constructor
  @description Instantiating a TestTask creates a number of Jake
  Tasks that make running tests for your software easy.

  @param {String} name The name of the project
  @param {Function} definition Defines the list of files containing the tests,
  and the name of the namespace/task for running them. Will be executed on the
  instantiated TestTask (i.e., 'this', will be the TestTask instance), to set
  the various instance-propertiess.

  @example
  let t = new jake.TestTask('bij-js', function () {
    this.testName = 'testSpecial';
    this.testFiles.include('test/**');
  });

 */
let TestTask = function () {
  let self = this;
  let args = Array.prototype.slice.call(arguments);
  let name = args.shift();
  let definition = args.pop();
  let prereqs = args.pop() || [];

  /**
    @name jake.TestTask#testNam
    @public
    @type {String}
    @description The name of the namespace to place the tests in, and
    the top-level task for running tests. Defaults to "test"
   */
  this.testName = 'test';

  /**
    @name jake.TestTask#testFiles
    @public
    @type {jake.FileList}
    @description The list of files containing tests to load
   */
  this.testFiles = new jake.FileList();

  /**
    @name jake.TestTask#showDescription
    @public
    @type {Boolean}
    @description Show the created task when doing Jake -T
   */
  this.showDescription = true;

  /*
    @name jake.TestTask#totalTests
    @public
    @type {Number}
    @description The total number of tests to run
  */
  this.totalTests = 0;

  /*
    @name jake.TestTask#executedTests
    @public
    @type {Number}
    @description The number of tests successfully run
  */
  this.executedTests = 0;

  if (typeof definition == 'function') {
    definition.call(this);
  }

  if (this.showDescription) {
    desc('Run the tests for ' + name);
  }

  task(this.testName, prereqs, {async: true}, function () {
    let t = jake.Task[this.fullName + ':run'];
    t.on('complete', function () {
      complete();
    });
    // Pass args to the namespaced test
    t.invoke.apply(t, arguments);
  });

  namespace(self.testName, function () {

    let runTask = task('run', {async: true}, function (pat) {
      let re;
      let testFiles;

      // Don't nest; make a top-level namespace. Don't want
      // re-calling from inside to nest infinitely
      jake.currentNamespace = jake.defaultNamespace;

      re = new RegExp(pat);
      // Get test files that match the passed-in pattern
      testFiles = self.testFiles.toArray()
        .filter(function (f) {
          return (re).test(f);
        }) // Don't load the same file multiple times -- should this be in FileList?
        .reduce(function (p, c) {
          if (p.indexOf(c) < 0) {
            p.push(c);
          }
          return p;
        }, []);

      // Create a namespace for all the testing tasks to live in
      namespace(self.testName + 'Exec', function () {
        // Each test will be a prereq for the dummy top-level task
        let prereqs = [];
        // Continuation to pass to the async tests, wrapping `continune`
        let next = function () {
          complete();
        };
        // Create the task for this test-function
        let createTask = function (name, action) {
          // If the test-function is defined with a continuation
          // param, flag the task as async
          let t;
          let isAsync = !!action.length;

          // Define the actual namespaced task with the name, the
          // wrapped action, and the correc async-flag
          t = task(name, createAction(name, action), {
            async: isAsync
          });
          t.once('complete', function () {
            self.executedTests++;
          });
          t._internal = true;
          return t;
        };
        // Used as the action for the defined task for each test.
        let createAction = function (n, a) {
          // A wrapped function that passes in the `next` function
          // for any tasks that run asynchronously
          return function () {
            let cb;
            if (a.length) {
              cb = next;
            }
            if (!(n == 'before' || n == 'after' ||
                    /_beforeEach$/.test(n) || /_afterEach$/.test(n))) {
              jake.logger.log(n);
            }
            // 'this' will be the task when action is run
            return a.call(this, cb);
          };
        };
          // Dummy top-level task for everything to be prereqs for
        let topLevel;

        // Pull in each test-file, and iterate over any exported
        // test-functions. Register each test-function as a prereq task
        testFiles.forEach(function (file) {
          let exp = require(path.join(currDir, file));

          // Create a namespace for each filename, so test-name collisions
          // won't be a problem
          namespace(file, function () {
            let testPrefix = self.testName + 'Exec:' + file + ':';
            let testName;
            // Dummy task for displaying file banner
            testName = '*** Running ' + file + ' ***';
            prereqs.push(testPrefix + testName);
            createTask(testName, function () {});

            // 'before' setup
            if (typeof exp.before == 'function') {
              prereqs.push(testPrefix + 'before');
              // Create the task
              createTask('before', exp.before);
            }

            // Walk each exported function, and create a task for each
            for (let p in exp) {
              if (p == 'before' || p == 'after' ||
                  p == 'beforeEach' || p == 'afterEach') {
                continue;
              }

              if (typeof exp.beforeEach == 'function') {
                prereqs.push(testPrefix + p + '_beforeEach');
                // Create the task
                createTask(p + '_beforeEach', exp.beforeEach);
              }

              // Add the namespace:name of this test to the list of prereqs
              // for the dummy top-level task
              prereqs.push(testPrefix + p);
              // Create the task
              createTask(p, exp[p]);

              if (typeof exp.afterEach == 'function') {
                prereqs.push(testPrefix + p + '_afterEach');
                // Create the task
                createTask(p + '_afterEach', exp.afterEach);
              }
            }

            // 'after' teardown
            if (typeof exp.after == 'function') {
              prereqs.push(testPrefix + 'after');
              // Create the task
              let afterTask = createTask('after', exp.after);
              afterTask._internal = true;
            }

          });
        });

        self.totalTests = prereqs.length;
        process.on('exit', function () {
          // Throw in the case where the process exits without
          // finishing tests, but no error was thrown
          if (!jake.errorCode && (self.totalTests > self.executedTests)) {
            throw new Error('Process exited without all tests completing.');
          }
        });

        // Create the dummy top-level task. When calling a task internally
        // with `invoke` that is async (or has async prereqs), have to listen
        // for the 'complete' event to know when it's done
        topLevel = task('__top__', prereqs);
        topLevel._internal = true;
        topLevel.addListener('complete', function () {
          jake.logger.log('All tests ran successfully');
          complete();
        });

        topLevel.invoke(); // Do the thing!
      });

    });
    runTask._internal = true;

  });


};

jake.TestTask = TestTask;
exports.TestTask = TestTask;

