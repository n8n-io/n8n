/**
 * Master of child processes. Handles communication between the
 * processor and the main process.
 *
 */
'use strict';

let status;
let processor;
let currentJobPromise;

const { promisify } = require('util');
const { asyncSend } = require('./utils');

// https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
if (!('toJSON' in Error.prototype)) {
  Object.defineProperty(Error.prototype, 'toJSON', {
    value: function() {
      const alt = {};

      Object.getOwnPropertyNames(this).forEach(function(key) {
        alt[key] = this[key];
      }, this);

      return alt;
    },
    configurable: true,
    writable: true
  });
}

async function waitForCurrentJobAndExit() {
  status = 'TERMINATING';
  try {
    await currentJobPromise;
  } finally {
    // it's an exit handler
    // eslint-disable-next-line no-process-exit
    process.exit(process.exitCode || 0);
  }
}

process.on('SIGTERM', waitForCurrentJobAndExit);
process.on('SIGINT', waitForCurrentJobAndExit);

process.on('message', msg => {
  switch (msg.cmd) {
    case 'init':
      try {
        processor = require(msg.value);
      } catch (err) {
        status = 'Errored';
        err.message = `Error loading process file ${msg.value}. ${err.message}`;
        return process.send({
          cmd: 'error',
          error: err
        });
      }

      if (processor.default) {
        // support es2015 module.
        processor = processor.default;
      }
      if (processor.length > 1) {
        processor = promisify(processor);
      } else {
        const origProcessor = processor;
        processor = function() {
          try {
            return Promise.resolve(origProcessor.apply(null, arguments));
          } catch (err) {
            return Promise.reject(err);
          }
        };
      }
      status = 'IDLE';
      process.send({
        cmd: 'init-complete'
      });
      break;

    case 'start':
      if (status !== 'IDLE') {
        return process.send({
          cmd: 'error',
          err: new Error('cannot start a not idling child process')
        });
      }
      status = 'STARTED';
      currentJobPromise = (async () => {
        try {
          const result = (await processor(wrapJob(msg.job))) || {};
          await asyncSend(process, {
            cmd: 'completed',
            value: result
          });
        } catch (err) {
          if (!err.message) {
            // eslint-disable-next-line no-ex-assign
            err = new Error(err);
          }
          await asyncSend(process, {
            cmd: 'failed',
            value: err
          });
        } finally {
          status = 'IDLE';
          currentJobPromise = null;
        }
      })();
      break;
    case 'stop':
      break;
  }
});

/*eslint no-process-exit: "off"*/
process.on('uncaughtException', err => {
  if (!err.message) {
    err = new Error(err);
  }
  process.send({
    cmd: 'failed',
    value: err
  });

  // An uncaughException leaves this process in a potentially undetermined state so
  // we must exit
  process.exit(-1);
});

/**
 * Enhance the given job argument with some functions
 * that can be called from the sandboxed job processor.
 *
 * Note, the `job` argument is a JSON deserialized message
 * from the main node process to this forked child process,
 * the functions on the original job object are not in tact.
 * The wrapped job adds back some of those original functions.
 */
function wrapJob(job) {
  /*
   * Emulate the real job `progress` function.
   * If no argument is given, it behaves as a sync getter.
   * If an argument is given, it behaves as an async setter.
   */
  let progressValue = job.progress;
  job.progress = function(progress) {
    if (progress) {
      // Locally store reference to new progress value
      // so that we can return it from this process synchronously.
      progressValue = progress;
      // Send message to update job progress.
      return asyncSend(process, {
        cmd: 'progress',
        value: progress
      });
    } else {
      // Return the last known progress value.
      return progressValue;
    }
  };
  /**
   * Update job info
   */
  job.update = function(data) {
    process.send({
      cmd: 'update',
      value: data
    });
  };
  /*
   * Emulate the real job `log` function.
   */
  job.log = function(row) {
    return asyncSend(process, {
      cmd: 'log',
      value: row
    });
  };
  /*
   * Emulate the real job `update` function.
   */
  job.update = function(data) {
    process.send({
      cmd: 'update',
      value: data
    });
    job.data = data;
  };
  /*
   * Emulate the real job `discard` function.
   */
  job.discard = function() {
    process.send({
      cmd: 'discard'
    });
  };
  return job;
}
