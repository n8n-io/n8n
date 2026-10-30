'use strict';

const _ = require('lodash');
const utils = require('./utils');
const scripts = require('./scripts');
const debuglog = require('util').debuglog('bull');
const errors = require('./errors');
const backoffs = require('./backoffs');

const FINISHED_WATCHDOG = 5000;
const DEFAULT_JOB_NAME = '__default__';

/**
interface JobOptions
{
  priority: Priority;
  attempts: number;
  delay: number;
}
*/

const jobFields = [
  'opts',
  'name',
  'id',
  'progress',
  'delay',
  'timestamp',
  'finishedOn',
  'processedOn',
  'retriedOn',
  'failedReason',
  'attemptsMade',
  'stacktrace',
  'returnvalue'
];

// queue: Queue, data: {}, opts: JobOptions
const Job = function(queue, name, data, opts) {
  if (typeof name !== 'string') {
    opts = data;
    data = name;
    name = DEFAULT_JOB_NAME;
  }

  // defaults
  this.opts = setDefaultOpts(opts);

  this.name = name;
  this.queue = queue;
  this.data = data;
  this._progress = 0;
  this.delay = this.opts.delay < 0 ? 0 : this.opts.delay;
  this.timestamp = this.opts.timestamp;
  this.stacktrace = [];
  this.returnvalue = null;
  this.attemptsMade = 0;

  this.toKey = _.bind(queue.toKey, queue);
  this.debounceId = this.opts.debounce ? this.opts.debounce.id : undefined;
};

function setDefaultOpts(opts) {
  const _opts = Object.assign({}, opts);

  _opts.attempts = typeof _opts.attempts == 'undefined' ? 1 : _opts.attempts;
  _opts.delay = typeof _opts.delay == 'undefined' ? 0 : Number(_opts.delay);
  _opts.timestamp =
    typeof _opts.timestamp == 'undefined' ? Date.now() : _opts.timestamp;

  _opts.attempts = parseInt(_opts.attempts);
  _opts.backoff = backoffs.normalize(_opts.backoff);

  return _opts;
}

Job.DEFAULT_JOB_NAME = DEFAULT_JOB_NAME;

function addJob(queue, client, job) {
  const opts = job.opts;

  const jobData = job.toData();
  return scripts.addJob(client, queue, jobData, {
    lifo: opts.lifo,
    customJobId: opts.jobId,
    priority: opts.priority,
    debounce: opts.debounce
  });
}

Job.create = function(queue, name, data, opts) {
  const job = new Job(queue, name, data, opts);

  return queue
    .isReady()
    .then(() => {
      return addJob(queue, queue.client, job);
    })
    .then(jobId => {
      job.id = jobId;
      debuglog('Job added', jobId);
      return job;
    });
};

Job.createBulk = function(queue, jobs) {
  jobs = jobs.map(job => new Job(queue, job.name, job.data, job.opts));

  return queue
    .isReady()
    .then(() => {
      const multi = queue.client.multi();

      for (const job of jobs) {
        addJob(queue, multi, job);
      }

      return multi.exec();
    })
    .then(res => {
      res.forEach((res, index) => {
        jobs[index].id = res[1];
        debuglog('Job added', res[1]);
      });

      return jobs;
    });
};

Job.fromId = async function(queue, jobId, opts) {
  // jobId can be undefined if moveJob returns undefined
  if (!jobId) {
    return Promise.resolve();
  }

  const jobKey = queue.toKey(jobId);
  let rawJob;

  if (opts && opts.excludeData) {
    rawJob = _.zipObject(
      jobFields,
      await queue.client.hmget(jobKey, jobFields)
    );
  } else {
    rawJob = await queue.client.hgetall(jobKey);
  }
  return _.isEmpty(rawJob) ? null : Job.fromJSON(queue, rawJob, jobId);
};

Job.remove = async function(queue, pattern) {
  await queue.isReady();
  const removed = await scripts.removeWithPattern(queue, pattern);
  removed.forEach(jobId => queue.emit('removed', jobId));
};

Job.prototype.progress = function(progress) {
  if (_.isUndefined(progress)) {
    return this._progress;
  }
  this._progress = progress;
  return scripts.updateProgress(this, progress);
};

Job.prototype.update = async function(data) {
  this.data = data;
  const code = await scripts.updateData(this, data);

  if (code < 0) {
    throw scripts.finishedErrors(code, this.id, 'updateData');
  }
};

Job.prototype.toJSON = function() {
  const opts = Object.assign({}, this.opts);
  return {
    id: this.id,
    name: this.name,
    data: this.data || {},
    opts: opts,
    progress: this._progress,
    delay: this.delay, // Move to opts
    timestamp: this.timestamp,
    attemptsMade: this.attemptsMade,
    failedReason: this.failedReason,
    stacktrace: this.stacktrace || null,
    returnvalue: this.returnvalue || null,
    debounceId: this.debounceId || null,
    finishedOn: this.finishedOn || null,
    processedOn: this.processedOn || null
  };
};

Job.prototype.toData = function() {
  const json = this.toJSON();

  json.data = JSON.stringify(json.data);
  json.opts = JSON.stringify(json.opts);
  json.stacktrace = JSON.stringify(json.stacktrace);
  json.failedReason = JSON.stringify(json.failedReason);
  json.returnvalue = JSON.stringify(json.returnvalue);

  return json;
};

/**
  Return a unique key representing a lock for this Job
*/
Job.prototype.lockKey = function() {
  return this.toKey(this.id) + ':lock';
};

/**
  Takes a lock for this job so that no other queue worker can process it at the
  same time.
*/
Job.prototype.takeLock = function() {
  return scripts.takeLock(this.queue, this).then(lock => {
    return lock || false;
  });
};

/**
  Releases the lock. Only locks owned by the queue instance can be released.
*/
Job.prototype.releaseLock = function() {
  return scripts.releaseLock(this.queue, this.id).then(unlocked => {
    if (unlocked != 1) {
      throw new Error('Could not release lock for job ' + this.id);
    }
  });
};

/**
 * Extend the lock for this job.
 *
 * @param duration lock duration in milliseconds
 */
Job.prototype.extendLock = function(duration) {
  return scripts.extendLock(this.queue, this.id, duration);
};

/**
 * Moves a job to the completed queue.
 * Returned job to be used with Queue.prototype.nextJobFromJobData.
 * @param returnValue {string} The jobs success message.
 * @param ignoreLock {boolean} True when wanting to ignore the redis lock on this job.
 * @param notFetch {boolean} True when should not fetch next job from queue.
 * @returns {Promise} Returns the jobData of the next job in the waiting queue.
 */
Job.prototype.moveToCompleted = function(
  returnValue,
  ignoreLock,
  notFetch = false
) {
  return this.queue.isReady().then(() => {
    this.returnvalue = returnValue || 0;

    returnValue = utils.tryCatch(JSON.stringify, JSON, [returnValue]);
    if (returnValue === utils.errorObject) {
      const err = utils.errorObject.value;
      return Promise.reject(err);
    }
    this.finishedOn = Date.now();

    return scripts.moveToCompleted(
      this,
      returnValue,
      this.opts.removeOnComplete,
      ignoreLock,
      notFetch
    );
  });
};

Job.prototype.discard = function() {
  this._discarded = true;
};

/**
 * Moves a job to the failed queue.
 * @param err {string} The jobs error message.
 * @param ignoreLock {boolean} True when wanting to ignore the redis lock on this job.
 * @returns void
 */
Job.prototype.moveToFailed = async function(err, ignoreLock) {
  err = err || { message: 'Unknown reason' };

  this.failedReason = err.message;

  await this.queue.isReady();

  let command;
  const multi = this.queue.client.multi();
  this._saveAttempt(multi, err);

  // Check if an automatic retry should be performed
  let moveToFailed = false;
  if (this.attemptsMade < this.opts.attempts && !this._discarded) {
    // Check if backoff is needed
    const delay = await backoffs.calculate(
      this.opts.backoff,
      this.attemptsMade,
      this.queue.settings.backoffStrategies,
      err,
      _.get(this, 'opts.backoff.options', null)
    );

    if (delay === -1) {
      // If delay is -1, we should no continue retrying
      moveToFailed = true;
    } else if (delay) {
      // If so, move to delayed (need to unlock job in this case!)
      const args = scripts.moveToDelayedArgs(
        this.queue,
        this.id,
        Date.now() + delay,
        ignoreLock
      );
      multi.moveToDelayed(args);
      command = 'delayed';
    } else {
      // If not, retry immediately
      multi.retryJob(scripts.retryJobArgs(this, ignoreLock));
      command = 'retry';
    }
  } else {
    // If not, move to failed
    moveToFailed = true;
  }

  if (moveToFailed) {
    this.finishedOn = Date.now();
    const args = scripts.moveToFailedArgs(
      this,
      err.message,
      this.opts.removeOnFail,
      ignoreLock
    );
    multi.moveToFinished(args);
    command = 'failed';
  }
  const results = await multi.exec();
  const code = _.last(results)[1];
  if (code < 0) {
    throw scripts.finishedErrors(code, this.id, command, 'active');
  }
};

Job.prototype.moveToDelayed = function(timestamp, ignoreLock) {
  return scripts.moveToDelayed(this.queue, this.id, timestamp, ignoreLock);
};

Job.prototype.promote = function() {
  const queue = this.queue;
  const jobId = this.id;
  return queue.isReady().then(() =>
    scripts.promote(queue, jobId).then(result => {
      if (result === -1) {
        throw new Error('Job ' + jobId + ' is not in a delayed state');
      }
    })
  );
};

/**
 * Attempts to retry the job. Only a job that has failed can be retried.
 *
 * @return {Promise} If resolved and return code is 1, then the queue emits a waiting event
 * otherwise the operation was not a success and throw the corresponding error. If the promise
 * rejects, it indicates that the script failed to execute
 */
Job.prototype.retry = function() {
  return this.queue.isReady().then(() => {
    this.failedReason = null;
    this.finishedOn = null;
    this.processedOn = null;
    this.retriedOn = Date.now();

    return scripts.reprocessJob(this, { state: 'failed' }).then(result => {
      if (result === 1) {
        return;
      } else if (result === 0) {
        throw new Error(errors.Messages.RETRY_JOB_NOT_EXIST);
      } else if (result === -1) {
        throw new Error(errors.Messages.RETRY_JOB_IS_LOCKED);
      } else if (result === -2) {
        throw new Error(errors.Messages.RETRY_JOB_NOT_FAILED);
      }
    });
  });
};

/**
 * Logs one row of log data.
 *
 * @params logRow: string String with log data to be logged.
 *
 */
Job.prototype.log = function(logRow) {
  return scripts.addLog(this.queue, this.id, logRow);
};

Job.prototype.isCompleted = function() {
  return this._isDone('completed');
};

Job.prototype.isFailed = function() {
  return this._isDone('failed');
};

Job.prototype.isDelayed = function() {
  return this._isDone('delayed');
};

Job.prototype.isActive = function() {
  return this._isInList('active');
};

Job.prototype.isWaiting = function() {
  return this._isInList('wait');
};

Job.prototype.isPaused = function() {
  return this._isInList('paused');
};

Job.prototype.isStuck = function() {
  return this.getState().then(state => {
    return state === 'stuck';
  });
};

Job.prototype.isDiscarded = function() {
  return this._discarded;
};

Job.prototype.getState = function() {
  const fns = [
    { fn: 'isCompleted', state: 'completed' },
    { fn: 'isFailed', state: 'failed' },
    { fn: 'isDelayed', state: 'delayed' },
    { fn: 'isActive', state: 'active' },
    { fn: 'isWaiting', state: 'waiting' },
    { fn: 'isPaused', state: 'paused' }
  ];

  return fns
    .reduce((result, fn) => {
      return result.then(state => {
        if (state) {
          return state;
        }
        return this[fn.fn]().then(result => {
          return result ? fn.state : null;
        });
      });
    }, Promise.resolve())
    .then(result => {
      return result ? result : 'stuck';
    });
};

Job.prototype.remove = function() {
  const queue = this.queue;
  const job = this;

  return queue.isReady().then(() => {
    return scripts.remove(queue, job.id).then(removed => {
      if (removed) {
        queue.emit('removed', job);
      } else {
        throw new Error('Could not remove job ' + job.id);
      }
    });
  });
};

/**
 * Returns a promise the resolves when the job has finished. (completed or failed).
 */
Job.prototype.finished = async function() {
  await Promise.all([
    this.queue._registerEvent('global:completed'),
    this.queue._registerEvent('global:failed')
  ]);

  await this.queue.isReady();

  const status = await scripts.isFinished(this);
  const finished = status > 0;
  if (finished) {
    const job = await Job.fromId(this.queue, this.id);
    if (status == 2) {
      throw new Error(job.failedReason);
    } else {
      return job.returnvalue;
    }
  } else {
    return new Promise((resolve, reject) => {
      const onCompleted = (jobId, resultValue) => {
        if (String(jobId) === String(this.id)) {
          let result = void 0;
          try {
            if (typeof resultValue === 'string') {
              result = JSON.parse(resultValue);
            }
          } catch (err) {
            //swallow exception because the resultValue got corrupted somehow.
            debuglog('corrupted resultValue: ' + resultValue, err);
          }
          resolve(result);
          removeListeners();
        }
      };

      const onFailed = (jobId, failedReason) => {
        if (String(jobId) === String(this.id)) {
          reject(new Error(failedReason));
          removeListeners();
        }
      };

      this.queue.on('global:completed', onCompleted);
      this.queue.on('global:failed', onFailed);

      const removeListeners = () => {
        clearInterval(interval);
        this.queue.removeListener('global:completed', onCompleted);
        this.queue.removeListener('global:failed', onFailed);
      };

      //
      // Watchdog
      //
      const interval = setInterval(() => {
        if (this._isQueueClosing()) {
          removeListeners();
          // TODO(manast) maybe we would need a more graceful way to get out of this interval.
          reject(
            new Error('cannot check if job is finished in a closing queue.')
          );
        } else {
          scripts.isFinished(this).then(status => {
            const finished = status > 0;
            if (finished) {
              Job.fromId(this.queue, this.id).then(job => {
                removeListeners();
                if (status == 2) {
                  reject(new Error(job.failedReason));
                } else {
                  resolve(job.returnvalue);
                }
              });
            }
          });
        }
      }, FINISHED_WATCHDOG);
    });
  }
};

// -----------------------------------------------------------------------------
// Private methods
// -----------------------------------------------------------------------------
Job.prototype._isQueueClosing = function() {
  return this.queue.closing;
};

Job.prototype._isDone = function(list) {
  return this.queue.client
    .zscore(this.queue.toKey(list), this.id)
    .then(score => {
      return score !== null;
    });
};

Job.prototype._isInList = function(list) {
  return scripts.isJobInList(
    this.queue.client,
    this.queue.toKey(list),
    this.id
  );
};

Job.prototype._saveAttempt = function(multi, err) {
  this.attemptsMade++;

  this.stacktrace = this.stacktrace || [];

  if (err && err.stack) {
    this.stacktrace.push(err.stack);
    if (this.opts.stackTraceLimit) {
      this.stacktrace = this.stacktrace.slice(-this.opts.stackTraceLimit);
    }
  }

  const args = scripts.saveStacktraceArgs(
    this,
    JSON.stringify(this.stacktrace),
    err && err.message,
  );

  multi.saveStacktrace(args);
};

Job.fromJSON = function(queue, json, jobId) {
  const opts = JSON.parse(json.opts || '{}');
  const data = opts.preventParsingData
    ? json.data
    : JSON.parse(json.data || '{}');

  const job = new Job(queue, json.name || Job.DEFAULT_JOB_NAME, data, opts);

  job.id = json.id || jobId;

  try {
    job._progress = JSON.parse(json.progress || 0);
  } catch (err) {
    console.error(
      `Error parsing progress ${json.progress} with ${err.message}`
    );
  }

  job.delay = parseInt(json.delay);
  job.timestamp = parseInt(json.timestamp);
  if (json.finishedOn) {
    job.finishedOn = parseInt(json.finishedOn);
  }

  if (json.processedOn) {
    job.processedOn = parseInt(json.processedOn);
  }

  if (json.retriedOn) {
    job.retriedOn = parseInt(json.retriedOn);
  }

  job.failedReason = json.failedReason;
  job.attemptsMade = parseInt(json.attemptsMade || 0);

  job.stacktrace = getTraces(json.stacktrace);

  if (typeof json.returnvalue === 'string') {
    job.returnvalue = getReturnValue(json.returnvalue);
  }

  if (json.deid) {
    job.debounceId = json.deid;
  }

  return job;
};

function getTraces(stacktrace) {
  const _traces = utils.tryCatch(JSON.parse, JSON, [stacktrace]);

  if (_traces === utils.errorObject || !(_traces instanceof Array)) {
    return [];
  } else {
    return _traces;
  }
}

function getReturnValue(_value) {
  const value = utils.tryCatch(JSON.parse, JSON, [_value]);
  if (value !== utils.errorObject) {
    return value;
  } else {
    debuglog('corrupted returnvalue: ' + _value, value);
  }
}

module.exports = Job;
