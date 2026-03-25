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
let { uuid } = require('./utils');

let api = new (function () {
  /**
    @name task
    @static
    @function
    @description Creates a Jake Task
    `
    @param {String} name The name of the Task
    @param {Array} [prereqs] Prerequisites to be run before this task
    @param {Function} [action] The action to perform for this task
    @param {Object} [opts]
      @param {Boolean} [opts.asyc=false] Perform this task asynchronously.
      If you flag a task with this option, you must call the global
      `complete` method inside the task's action, for execution to proceed
      to the next task.

    @example
    desc('This is the default task.');
    task('default', function (params) {
      console.log('This is the default task.');
    });

    desc('This task has prerequisites.');
    task('hasPrereqs', ['foo', 'bar', 'baz'], function (params) {
      console.log('Ran some prereqs first.');
    });

    desc('This is an asynchronous task.');
    task('asyncTask', function () {
      setTimeout(complete, 1000);
    }, {async: true});
   */
  this.task = function (name, prereqs, action, opts) {
    let args = Array.prototype.slice.call(arguments);
    let createdTask;
    args.unshift('task');
    createdTask = jake.createTask.apply(global, args);
    jake.currentTaskDescription = null;
    return createdTask;
  };

  /**
    @name rule
    @static
    @function
    @description Creates a Jake Suffix Rule
    `
    @param {String} pattern The suffix name of the objective
    @param {String} source The suffix name of the objective
    @param {Array} [prereqs] Prerequisites to be run before this task
    @param {Function} [action] The action to perform for this task
    @param {Object} [opts]
      @param {Boolean} [opts.asyc=false] Perform this task asynchronously.
      If you flag a task with this option, you must call the global
      `complete` method inside the task's action, for execution to proceed
      to the next task.
    @example
    desc('This is a rule, which does not support namespace or pattern.');
    rule('.o', '.c', {async: true}, function () {
      let cmd = util.format('gcc -o %s %s', this.name, this.source);
      jake.exec([cmd], function () {
        complete();
      }, {printStdout: true});
    });

    desc('This rule has prerequisites.');
    rule('.o', '.c', ['util.h'], {async: true}, function () {
      let cmd = util.format('gcc -o %s %s', this.name, this.source);
      jake.exec([cmd], function () {
        complete();
      }, {printStdout: true});
    });

    desc('This is a rule with patterns.');
    rule('%.o', '%.c', {async: true}, function () {
      let cmd = util.format('gcc -o %s %s', this.name, this.source);
      jake.exec([cmd], function () {
        complete();
      }, {printStdout: true});
    });

    desc('This is another rule with patterns.');
    rule('obj/%.o', 'src/%.c', {async: true}, function () {
      let cmd = util.format('gcc -o %s %s', this.name, this.source);
      jake.exec([cmd], function () {
        complete();
      }, {printStdout: true});
    });

    desc('This is an example with chain rules.');
    rule('%.pdf', '%.dvi', {async: true}, function () {
      let cmd = util.format('dvipdfm %s',this.source);
      jake.exec([cmd], function () {
        complete();
      }, {printStdout: true});
    });

    rule('%.dvi', '%.tex', {async: true}, function () {
      let cmd = util.format('latex %s',this.source);
      jake.exec([cmd], function () {
        complete();
      }, {printStdout: true});
    });

    desc('This rule has a namespace.');
    task('default', ['debug:obj/main.o]);

    namespace('debug', {async: true}, function() {
      rule('obj/%.o', 'src/%.c', function () {
        // ...
      });
    }
   */
  this.rule = function () {
    let args = Array.prototype.slice.call(arguments);
    let arg;
    let pattern = args.shift();
    let source = args.shift();
    let prereqs = [];
    let action = function () {};
    let opts = {};
    let key = pattern.toString(); // May be a RegExp

    while ((arg = args.shift())) {
      if (typeof arg == 'function') {
        action = arg;
      }
      else if (Array.isArray(arg)) {
        prereqs = arg;
      }
      else {
        opts = arg;
      }
    }

    jake.currentNamespace.rules[key] = new jake.Rule({
      pattern: pattern,
      source: source,
      prereqs: prereqs,
      action: action,
      opts: opts,
      desc: jake.currentTaskDescription,
      ns: jake.currentNamespace
    });
    jake.currentTaskDescription = null;
  };

  /**
    @name directory
    @static
    @function
    @description Creates a Jake DirectoryTask. Can be used as a prerequisite
    for FileTasks, or for simply ensuring a directory exists for use with a
    Task's action.
    `
    @param {String} name The name of the DiretoryTask

    @example

    // Creates the package directory for distribution
    directory('pkg');
   */
  this.directory = function (name) {
    let args = Array.prototype.slice.call(arguments);
    let createdTask;
    args.unshift('directory');
    createdTask = jake.createTask.apply(global, args);
    jake.currentTaskDescription = null;
    return createdTask;
  };

  /**
    @name file
    @static
    @function
    @description Creates a Jake FileTask.
    `
    @param {String} name The name of the FileTask
    @param {Array} [prereqs] Prerequisites to be run before this task
    @param {Function} [action] The action to create this file, if it doesn't
    exist already.
    @param {Object} [opts]
      @param {Array} [opts.asyc=false] Perform this task asynchronously.
      If you flag a task with this option, you must call the global
      `complete` method inside the task's action, for execution to proceed
      to the next task.

   */
  this.file = function (name, prereqs, action, opts) {
    let args = Array.prototype.slice.call(arguments);
    let createdTask;
    args.unshift('file');
    createdTask = jake.createTask.apply(global, args);
    jake.currentTaskDescription = null;
    return createdTask;
  };

  /**
    @name desc
    @static
    @function
    @description Creates a description for a Jake Task (or FileTask,
    DirectoryTask). When invoked, the description that iscreated will
    be associated with whatever Task is created next.
    `
    @param {String} description The description for the Task
   */
  this.desc = function (description) {
    jake.currentTaskDescription = description;
  };

  /**
    @name namespace
    @static
    @function
    @description Creates a namespace which allows logical grouping
    of tasks, and prevents name-collisions with task-names. Namespaces
    can be nested inside of other namespaces.
    `
    @param {String} name The name of the namespace
    @param {Function} scope The enclosing scope for the namespaced tasks

    @example
    namespace('doc', function () {
      task('generate', ['doc:clobber'], function () {
        // Generate some docs
      });

      task('clobber', function () {
        // Clobber the doc directory first
      });
    });
   */
  this.namespace = function (name, closure) {
    let curr = jake.currentNamespace;
    let ns = curr.childNamespaces[name] || new jake.Namespace(name, curr);
    let fn = closure || function () {};
    curr.childNamespaces[name] = ns;
    jake.currentNamespace = ns;
    fn();
    jake.currentNamespace = curr;
    jake.currentTaskDescription = null;
    return ns;
  };

  /**
    @name complete
    @static
    @function
    @description Completes an asynchronous task, allowing Jake's
    execution to proceed to the next task. Calling complete globally or without
    arguments completes the last task on the invocationChain. If you use parallel
    execution of prereqs this will probably complete a wrong task. You should call this
    function with this task as the first argument, before the optional return value.
    Alternatively you can call task.complete()
    `
    @example
    task('generate', ['doc:clobber'], function () {
      exec('./generate_docs.sh', function (err, stdout, stderr) {
        if (err || stderr) {
          fail(err || stderr);
        }
        else {
          console.log(stdout);
          complete();
        }
      });
    }, {async: true});
   */
  this.complete = function (task, val) {
    //this should detect if the first arg is a task, but I guess it should be more thorough
    if(task && task. _currentPrereqIndex >=0 ) {
      task.complete(val);
    }
    else {
      val = task;
      if(jake._invocationChain.length > 0) {
        jake._invocationChain[jake._invocationChain.length-1].complete(val);
      }
    }
  };

  /**
    @name fail
    @static
    @function
    @description Causes Jake execution to abort with an error.
    Allows passing an optional error code, which will be used to
    set the exit-code of exiting process.
    `
    @param {Error|String} err The error to thow when aborting execution.
    If this argument is an Error object, it will simply be thrown. If
    a String, it will be used as the error-message. (If it is a multi-line
    String, the first line will be used as the Error message, and the
    remaining lines will be used as the error-stack.)

    @example
    task('createTests, function () {
      if (!fs.existsSync('./tests')) {
        fail('Test directory does not exist.');
      }
      else {
        // Do some testing stuff ...
      }
    });
   */
  this.fail = function (err, code) {
    let msg;
    let errObj;
    if (code) {
      jake.errorCode = code;
    }
    if (err) {
      if (typeof err == 'string') {
        // Use the initial or only line of the error as the error-message
        // If there was a multi-line error, use the rest as the stack
        msg = err.split('\n');
        errObj = new Error(msg.shift());
        if (msg.length) {
          errObj.stack = msg.join('\n');
        }
        throw errObj;
      }
      else if (err instanceof Error) {
        throw err;
      }
      else {
        throw new Error(err.toString());
      }
    }
    else {
      throw new Error();
    }
  };

  this.packageTask = function (name, version, prereqs, definition) {
    return new jake.PackageTask(name, version, prereqs, definition);
  };

  this.publishTask = function (name, prereqs, opts, definition) {
    return new jake.PublishTask(name, prereqs, opts, definition);
  };

  // Backward-compat
  this.npmPublishTask = function (name, prereqs, opts, definition) {
    return new jake.PublishTask(name, prereqs, opts, definition);
  };

  this.testTask = function () {
    let ctor = function () {};
    let t;
    ctor.prototype = jake.TestTask.prototype;
    t = new ctor();
    jake.TestTask.apply(t, arguments);
    return t;
  };

  this.setTaskTimeout = function (t) {
    this._taskTimeout = t;
  };

  this.setSeriesAutoPrefix = function (prefix) {
    this._seriesAutoPrefix = prefix;
  };

  this.series = function (...args) {
    let prereqs = args.map((arg) => {
      let name = (this._seriesAutoPrefix || '') + arg.name;
      jake.task(name, arg);
      return name;
    });
    let seriesName = uuid();
    let seriesTask = jake.task(seriesName, prereqs);
    seriesTask._internal = true;
    let res = function () {
      return new Promise((resolve) => {
        seriesTask.invoke();
        seriesTask.on('complete', (val) => {
          resolve(val);
        });
      });
    };
    Object.defineProperty(res, 'name', {value: uuid(),
      writable: false});
    return res;
  };

})();

module.exports = api;
