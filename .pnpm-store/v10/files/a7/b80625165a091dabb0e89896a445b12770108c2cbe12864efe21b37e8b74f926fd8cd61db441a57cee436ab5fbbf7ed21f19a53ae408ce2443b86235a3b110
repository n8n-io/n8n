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

let fs = require('fs');
let parseargs = require('./parseargs');
let utils = require('./utils');
let Program;
let usage = require('fs').readFileSync(`${__dirname}/../usage.txt`).toString();
let { Task } = require('./task/task');

function die(msg) {
  console.log(msg);
  process.stdout.write('', function () {
    process.stderr.write('', function () {
      process.exit();
    });
  });
}

let preempts = {
  version: function () {
    die(jake.version);
  },
  help: function () {
    die(usage);
  }
};

let AVAILABLE_OPTS = [
  { full: 'jakefile',
    abbr: 'f',
    expectValue: true
  },
  { full: 'quiet',
    abbr: 'q',
    expectValue: false
  },
  { full: 'directory',
    abbr: 'C',
    expectValue: true
  },
  { full: 'always-make',
    abbr: 'B',
    expectValue: false
  },
  { full: 'tasks',
    abbr: 'T',
    expectValue: false,
    allowValue: true
  },
  // Alias t
  { full: 'tasks',
    abbr: 't',
    expectValue: false,
    allowValue: true
  },
  // Alias ls
  { full: 'tasks',
    abbr: 'ls',
    expectValue: false,
    allowValue: true
  },
  { full: 'help',
    abbr: 'h',
  },
  { full: 'version',
    abbr: 'V',
  },
  // Alias lowercase v
  { full: 'version',
    abbr: 'v',
  },
  { full: 'jakelibdir',
    abbr: 'J',
    expectValue: true
  },
  { full: 'allow-rejection',
    abbr: 'ar',
    expectValue: false
  }
];

Program = function () {
  this.availableOpts = AVAILABLE_OPTS;
  this.opts = {};
  this.taskNames = null;
  this.taskArgs = null;
  this.envVars = null;
  this.die = die;
};

Program.prototype = new (function () {

  this.handleErr = function (err) {
    if (jake.listeners('error').length !== 0) {
      jake.emit('error', err);
      return;
    }

    if (jake.listeners('error').length) {
      jake.emit('error', err);
      return;
    }

    utils.logger.error('jake aborted.');
    if (err.stack) {
      utils.logger.error(err.stack);
    }
    else {
      utils.logger.error(err.message);
    }

    process.stdout.write('', function () {
      process.stderr.write('', function () {
        jake.errorCode = jake.errorCode || 1;
        process.exit(jake.errorCode);
      });
    });
  };

  this.parseArgs = function (args) {
    let result = (new parseargs.Parser(this.availableOpts)).parse(args);
    this.setOpts(result.opts);
    this.setTaskNames(result.taskNames);
    this.setEnvVars(result.envVars);
  };

  this.setOpts = function (options) {
    let opts = options || {};
    Object.assign(this.opts, opts);
  };

  this.internalOpts = function (options) {
    this.availableOpts = this.availableOpts.concat(options);
  };

  this.autocompletions = function (cur) {
    let p; let i; let task;
    let commonPrefix = '';
    let matches = [];

    for (p in jake.Task) {
      task = jake.Task[p];
      if (
        'fullName' in task
          && (
            // if empty string, program converts to true
            cur === true ||
            task.fullName.indexOf(cur) === 0
          )
      ) {
        if (matches.length === 0) {
          commonPrefix = task.fullName;
        }
        else {
          for (i = commonPrefix.length; i > -1; --i) {
            commonPrefix = commonPrefix.substr(0, i);
            if (task.fullName.indexOf(commonPrefix) === 0) {
              break;
            }
          }
        }
        matches.push(task.fullName);
      }
    }

    if (matches.length > 1 && commonPrefix === cur) {
      matches.unshift('yes-space');
    }
    else {
      matches.unshift('no-space');
    }

    process.stdout.write(matches.join(' '));
  };

  this.setTaskNames = function (names) {
    if (names && !Array.isArray(names)) {
      throw new Error('Task names must be an array');
    }
    this.taskNames = (names && names.length) ? names : ['default'];
  };

  this.setEnvVars = function (vars) {
    this.envVars = vars || null;
  };

  this.firstPreemptiveOption = function () {
    let opts = this.opts;
    for (let p in opts) {
      if (preempts[p]) {
        return preempts[p];
      }
    }
    return false;
  };

  this.init = function (configuration) {
    let self = this;
    let config = configuration || {};
    if (config.options) {
      this.setOpts(config.options);
    }
    if (config.taskNames) {
      this.setTaskNames(config.taskNames);
    }
    if (config.envVars) {
      this.setEnvVars(config.envVars);
    }
    process.addListener('uncaughtException', function (err) {
      self.handleErr(err);
    });
    if (!this.opts['allow-rejection']) {
      process.addListener('unhandledRejection', (reason, promise) => {
        utils.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
        self.handleErr(reason);
      });
    }
    if (this.envVars) {
      Object.assign(process.env, this.envVars);
    }
  };

  this.run = function () {
    let rootTask;
    let taskNames;
    let dirname;
    let opts = this.opts;

    if (opts.autocomplete) {
      return this.autocompletions(opts['autocomplete-cur'], opts['autocomplete-prev']);
    }
    // Run with `jake -T`, just show descriptions
    if (opts.tasks) {
      return jake.showAllTaskDescriptions(opts.tasks);
    }

    taskNames = this.taskNames;
    if (!(Array.isArray(taskNames) && taskNames.length)) {
      throw new Error('Please pass jake.runTasks an array of task-names');
    }

    // Set working dir
    dirname = opts.directory;
    if (dirname) {
      if (fs.existsSync(dirname) &&
        fs.statSync(dirname).isDirectory()) {
        process.chdir(dirname);
      }
      else {
        throw new Error(dirname + ' is not a valid directory path');
      }
    }

    rootTask = task(Task.ROOT_TASK_NAME, taskNames, function () {});
    rootTask._internal = true;

    rootTask.once('complete', function () {
      jake.emit('complete');
    });
    jake.emit('start');
    rootTask.invoke();
  };

})();

module.exports.Program = Program;
