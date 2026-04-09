let EventEmitter = require('events').EventEmitter;
let async = require('async');
let pc = require('picocolors');
// 'rule' module is required at the bottom because circular deps

// Used for task value, so better not to use
// null, since value should be unset/uninitialized
let UNDEFINED_VALUE;

const ROOT_TASK_NAME = '__rootTask__';
const POLLING_INTERVAL = 100;

// Parse any positional args attached to the task-name
function parsePrereqName(name) {
  let taskArr = name.split('[');
  let taskName = taskArr[0];
  let taskArgs = [];
  if (taskArr[1]) {
    taskArgs = taskArr[1].replace(/\]$/, '');
    taskArgs = taskArgs.split(',');
  }
  return {
    name: taskName,
    args: taskArgs
  };
}

/**
  @name jake.Task
  @class
  @extends EventEmitter
  @description A Jake Task

  @param {String} name The name of the Task
  @param {Array} [prereqs] Prerequisites to be run before this task
  @param {Function} [action] The action to perform for this task
  @param {Object} [opts]
    @param {Array} [opts.asyc=false] Perform this task asynchronously.
    If you flag a task with this option, you must call the global
    `complete` method inside the task's action, for execution to proceed
    to the next task.
 */
class Task extends EventEmitter {

  constructor(name, prereqs, action, options) {
    // EventEmitter ctor takes no args
    super();

    if (name.indexOf(':') > -1) {
      throw new Error('Task name cannot include a colon. It is used internally as namespace delimiter.');
    }
    let opts = options || {};

    this._currentPrereqIndex = 0;
    this._internal = false;
    this._skipped = false;

    this.name = name;
    this.prereqs = prereqs;
    this.action = action;
    this.async = false;
    this.taskStatus = Task.runStatuses.UNSTARTED;
    this.description = null;
    this.args = [];
    this.value = UNDEFINED_VALUE;
    this.concurrency = 1;
    this.startTime = null;
    this.endTime = null;
    this.directory = null;
    this.namespace = null;

    // Support legacy async-flag -- if not explicitly passed or falsy, will
    // be set to empty-object
    if (typeof opts == 'boolean' && opts === true) {
      this.async = true;
    }
    else {
      if (opts.async) {
        this.async = true;
      }
      if (opts.concurrency) {
        this.concurrency = opts.concurrency;
      }
    }

    //Do a test on self dependencies for this task
    if(Array.isArray(this.prereqs) && this.prereqs.indexOf(this.name) !== -1) {
      throw new Error("Cannot use prereq " + this.name + " as a dependency of itself");
    }
  }

  get fullName() {
    return this._getFullName();
  }

  get params() {
    return this._getParams();
  }

  _initInvocationChain() {
    // Legacy global invocation chain
    jake._invocationChain.push(this);

    // New root chain
    if (!this._invocationChain) {
      this._invocationChainRoot = true;
      this._invocationChain = [];
      if (jake.currentRunningTask) {
        jake.currentRunningTask._waitForChains = jake.currentRunningTask._waitForChains || [];
        jake.currentRunningTask._waitForChains.push(this._invocationChain);
      }
    }
  }

  /**
    @name jake.Task#invoke
    @function
    @description Runs prerequisites, then this task. If the task has already
    been run, will not run the task again.
   */
  invoke() {
    this._initInvocationChain();

    this.args = Array.prototype.slice.call(arguments);
    this.reenabled = false;
    this.runPrereqs();
  }

  /**
    @name jake.Task#execute
    @function
    @description Run only this task, without prereqs. If the task has already
    been run, *will* run the task again.
   */
  execute() {
    this._initInvocationChain();

    this.args = Array.prototype.slice.call(arguments);
    this.reenable();
    this.reenabled = true;
    this.run();
  }

  runPrereqs() {
    if (this.prereqs && this.prereqs.length) {

      if (this.concurrency > 1) {
        async.eachLimit(this.prereqs, this.concurrency,

          (name, cb) => {
            let parsed = parsePrereqName(name);

            let prereq = this.namespace.resolveTask(parsed.name) ||
          jake.attemptRule(name, this.namespace, 0) ||
          jake.createPlaceholderFileTask(name, this.namespace);

            if (!prereq) {
              throw new Error('Unknown task "' + name + '"');
            }

            //Test for circular invocation
            if(prereq === this) {
              setImmediate(function () {
                cb(new Error("Cannot use prereq " + prereq.name + " as a dependency of itself"));
              });
            }

            if (prereq.taskStatus == Task.runStatuses.DONE) {
            //prereq already done, return
              setImmediate(cb);
            }
            else {
            //wait for complete before calling cb
              prereq.once('_done', () => {
                prereq.removeAllListeners('_done');
                setImmediate(cb);
              });
              // Start the prereq if we are the first to encounter it
              if (prereq.taskStatus === Task.runStatuses.UNSTARTED) {
                prereq.taskStatus = Task.runStatuses.STARTED;
                prereq.invoke.apply(prereq, parsed.args);
              }
            }
          },

          (err) => {
          //async callback is called after all prereqs have run.
            if (err) {
              throw err;
            }
            else {
              setImmediate(this.run.bind(this));
            }
          }
        );
      }
      else {
        setImmediate(this.nextPrereq.bind(this));
      }
    }
    else {
      setImmediate(this.run.bind(this));
    }
  }

  nextPrereq() {
    let self = this;
    let index = this._currentPrereqIndex;
    let name = this.prereqs[index];
    let prereq;
    let parsed;

    if (name) {

      parsed = parsePrereqName(name);

      prereq = this.namespace.resolveTask(parsed.name) ||
          jake.attemptRule(name, this.namespace, 0) ||
          jake.createPlaceholderFileTask(name, this.namespace);

      if (!prereq) {
        throw new Error('Unknown task "' + name + '"');
      }

      // Do when done
      if (prereq.taskStatus == Task.runStatuses.DONE) {
        self.handlePrereqDone(prereq);
      }
      else {
        prereq.once('_done', () => {
          this.handlePrereqDone(prereq);
          prereq.removeAllListeners('_done');
        });
        if (prereq.taskStatus == Task.runStatuses.UNSTARTED) {
          prereq.taskStatus = Task.runStatuses.STARTED;
          prereq._invocationChain = this._invocationChain;
          prereq.invoke.apply(prereq, parsed.args);
        }
      }
    }
  }

  /**
    @name jake.Task#reenable
    @function
    @description Reenables a task so that it can be run again.
   */
  reenable(deep) {
    let prereqs;
    let prereq;
    this._skipped = false;
    this.taskStatus = Task.runStatuses.UNSTARTED;
    this.value = UNDEFINED_VALUE;
    if (deep && this.prereqs) {
      prereqs = this.prereqs;
      for (let i = 0, ii = prereqs.length; i < ii; i++) {
        prereq = jake.Task[prereqs[i]];
        if (prereq) {
          prereq.reenable(deep);
        }
      }
    }
  }

  handlePrereqDone(prereq) {
    this._currentPrereqIndex++;
    if (this._currentPrereqIndex < this.prereqs.length) {
      setImmediate(this.nextPrereq.bind(this));
    }
    else {
      setImmediate(this.run.bind(this));
    }
  }

  isNeeded() {
    let needed = true;
    if (this.taskStatus == Task.runStatuses.DONE) {
      needed = false;
    }
    return needed;
  }

  run() {
    let val, previous;
    let hasAction = typeof this.action == 'function';

    if (!this.isNeeded()) {
      this.emit('skip');
      this.emit('_done');
    }
    else {
      if (this._invocationChain.length) {
        previous = this._invocationChain[this._invocationChain.length - 1];
        // If this task is repeating and its previous is equal to this, don't check its status because it was set to UNSTARTED by the reenable() method
        if (!(this.reenabled && previous == this)) {
          if (previous.taskStatus != Task.runStatuses.DONE) {
            let now = (new Date()).getTime();
            if (now - this.startTime > jake._taskTimeout) {
              return jake.fail(`Timed out waiting for task: ${previous.name} with status of ${previous.taskStatus}`);
            }
            setTimeout(this.run.bind(this), POLLING_INTERVAL);
            return;
          }
        }
      }
      if (!(this.reenabled && previous == this)) {
        this._invocationChain.push(this);
      }

      if (!(this._internal || jake.program.opts.quiet)) {
        jake.emit('started', {
          name: this.fullName,
          task: this,
        });
        console.log("Starting '" + pc.green(this.fullName) + "'...");
      }

      this.startTime = (new Date()).getTime();
      this.emit('start');

      jake.currentRunningTask = this;

      if (hasAction) {
        try {
          if (this.directory) {
            process.chdir(this.directory);
          }

          val = this.action.apply(this, this.args);

          if (typeof val == 'object' && typeof val.then == 'function') {
            this.async = true;

            val.then(
              (result) => {
                setImmediate(() => {
                  this.complete(result);
                });
              },
              (err) => {
                setImmediate(() => {
                  this.errorOut(err);
                });
              });
          }
        }
        catch (err) {
          this.errorOut(err);
          return; // Bail out, not complete
        }
      }

      if (!(hasAction && this.async)) {
        setImmediate(() => {
          this.complete(val);
        });
      }
    }
  }

  errorOut(err) {
    this.taskStatus = Task.runStatuses.ERROR;
    this._invocationChain.chainStatus = Task.runStatuses.ERROR;
    this.emit('error', err);
  }

  complete(val) {

    if (Array.isArray(this._waitForChains)) {
      let stillWaiting = this._waitForChains.some((chain) => {
        return !(chain.chainStatus == Task.runStatuses.DONE ||
              chain.chainStatus == Task.runStatuses.ERROR);
      });
      if (stillWaiting) {
        let now = (new Date()).getTime();
        let elapsed = now - this.startTime;
        if (elapsed > jake._taskTimeout) {
          return jake.fail(`Timed out waiting for task: ${this.name} with status of ${this.taskStatus}. Elapsed: ${elapsed}`);
        }
        setTimeout(() => {
          this.complete(val);
        }, POLLING_INTERVAL);
        return;
      }
    }

    jake._invocationChain.splice(jake._invocationChain.indexOf(this), 1);

    if (this._invocationChainRoot) {
      this._invocationChain.chainStatus = Task.runStatuses.DONE;
    }

    this._currentPrereqIndex = 0;

    // If 'complete' getting called because task has been
    // run already, value will not be passed -- leave in place
    if (!this._skipped) {
      this.taskStatus = Task.runStatuses.DONE;
      this.value = val;

      this.emit('complete', this.value);
      this.emit('_done');

      this.endTime = (new Date()).getTime();
      let taskTime = this.endTime - this.startTime;

      if (!(this._internal || jake.program.opts.quiet)) {
        jake.emit('finished', {
          name: this.fullName,
          task: this,
          time: taskTime,
        });
        console.log("Finished '" + pc.green(this.fullName) + "' after " + pc.magenta(taskTime + ' ms'));
      }

    }
  }

  _getFullName() {
    let ns = this.namespace;
    let path = (ns && ns.path) || '';
    path = (path && path.split(':')) || [];
    if (this.namespace !== jake.defaultNamespace) {
      path.push(this.namespace.name);
    }
    path.push(this.name);
    return path.join(':');
  }

  _getParams() {
    if (!this.action) return "";
    let params = (new RegExp('(?:'+this.action.name+'\\s*|^)\\s*\\((.*?)\\)').exec(this.action.toString().replace(/\n/g, '')) || [''])[1].replace(/\/\*.*?\*\//g, '').replace(/ /g, '');
    return params;
  }

  static getBaseNamespacePath(fullName) {
    return fullName.split(':').slice(0, -1).join(':');
  }

  static getBaseTaskName(fullName) {
    return fullName.split(':').pop();
  }
}

Task.runStatuses = {
  UNSTARTED: 'unstarted',
  DONE: 'done',
  STARTED: 'started',
  ERROR: 'error'
};

Task.ROOT_TASK_NAME = ROOT_TASK_NAME;

exports.Task = Task;

// Required here because circular deps
require('../rule');

