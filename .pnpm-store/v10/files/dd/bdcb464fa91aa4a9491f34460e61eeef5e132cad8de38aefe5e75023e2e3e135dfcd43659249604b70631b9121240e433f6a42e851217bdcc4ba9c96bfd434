/**
 * Includes all the scripts needed by the queue and jobs.
 */

'use strict';

const _ = require('lodash');
const msgpackr = require('msgpackr');

const packer = new msgpackr.Packr({
  useRecords: false,
  encodeUndefinedAsNil: true
});

const pack = packer.pack;

const scripts = {
  isJobInList(client, listKey, jobId) {
    return client.isJobInList([listKey, jobId]).then(result => {
      return result === 1;
    });
  },

  addJob(client, queue, job, opts) {
    const queueKeys = queue.keys;
    let keys = [
      queueKeys.wait,
      queueKeys.paused,
      queueKeys['meta-paused'],
      queueKeys.id,
      queueKeys.delayed,
      queueKeys.priority
    ];

    const args = [
      queueKeys[''],
      _.isUndefined(opts.customJobId) ? '' : opts.customJobId,
      job.name,
      job.data,
      pack(job.opts),
      job.timestamp,
      job.delay,
      job.delay ? job.timestamp + job.delay : 0,
      opts.priority || 0,
      opts.lifo ? 'RPUSH' : 'LPUSH',
      queue.token,
      job.debounceId ? `${queueKeys.de}:${job.debounceId}` : null,
      opts.debounce ? opts.debounce.id : null,
      opts.debounce ? opts.debounce.ttl : null,
    ];
    keys = keys.concat(args);
    return client.addJob(keys);
  },

  pause(queue, pause) {
    let src = 'wait',
      dst = 'paused';
    if (!pause) {
      src = 'paused';
      dst = 'wait';
    }

    const keys = _.map(
      [src, dst, 'meta-paused', pause ? 'paused' : 'resumed', 'meta'],
      name => {
        return queue.toKey(name);
      }
    );

    return queue.client.pause(keys.concat([pause ? 'paused' : 'resumed']));
  },

  async addLog(queue, jobId, logRow, keepLogs) {
    const client = await queue.client;

    const keys = [queue.toKey(jobId), queue.toKey(jobId) + ':logs'];

    const result = await client.addLog(
      keys.concat([jobId, logRow, keepLogs ? keepLogs : ''])
    );

    if (result < 0) {
      throw scripts.finishedErrors(result, jobId, 'addLog');
    }

    return result;
  },

  getCountsPerPriorityArgs(queue, priorities) {
    const keys = [
      queue.keys.wait,
      queue.keys.paused,
      queue.keys['meta-paused'],
      queue.keys.priority
    ];

    const args = priorities;

    return keys.concat(args);
  },

  async getCountsPerPriority(queue, priorities) {
    const client = await queue.client;
    const args = this.getCountsPerPriorityArgs(queue, priorities);

    return client.getCountsPerPriority(args);
  },

  moveToActive(queue, jobId) {
    const queueKeys = queue.keys;
    const keys = [queueKeys.wait, queueKeys.active, queueKeys.priority];

    keys[3] = keys[1] + '@' + queue.token;
    keys[4] = queueKeys.stalled;
    keys[5] = queueKeys.limiter;
    keys[6] = queueKeys.delayed;
    keys[7] = queueKeys.drained;

    const args = [
      queueKeys[''],
      queue.token,
      queue.settings.lockDuration,
      Date.now(),
      jobId
    ];

    if (queue.limiter) {
      args.push(
        queue.limiter.max,
        queue.limiter.duration,
        !!queue.limiter.bounceBack
      );
      queue.limiter.groupKey && args.push(true);
    }

    return queue.client.moveToActive(keys.concat(args)).then(raw2jobData);
  },

  updateProgress(job, progress) {
    const queue = job.queue;
    const keys = [job.id, 'progress'].map(name => {
      return queue.toKey(name);
    });

    const progressJson = JSON.stringify(progress);
    return queue.client
      .updateProgress(keys, [
        progressJson,
        JSON.stringify({ jobId: job.id, progress })
      ])
      .then(code => {
        if (code < 0) {
          throw scripts.finishedErrors(code, job.id, 'updateProgress');
        }
        queue.emit('progress', job, progress);
      });
  },

  updateData(job, data) {
    const queue = job.queue;
    const keys = [job.id].map(name => {
      return queue.toKey(name);
    });
    const dataJson = JSON.stringify(data);

    return queue.client.updateData(keys, [dataJson]);
  },

  saveStacktraceArgs(
    job,
    stacktrace,
    failedReason
  ) {
    const queue = job.queue;

    const keys = [queue.toKey(job.id)];

    return keys.concat([stacktrace, failedReason, job.attemptsMade]);
  },

  retryJobsArgs(queue, count) {
    const keys = [
      queue.toKey(''),
      queue.toKey('failed'),
      queue.toKey('wait'),
      queue.toKey('meta-paused'),
      queue.toKey('paused')
    ];

    const args = [count];

    return keys.concat(args);
  },

  async retryJobs(queue, count = 1000) {
    const client = await queue.client;

    const args = this.retryJobsArgs(queue, count);

    return client.retryJobs(args);
  },

  moveToFinishedArgs(
    job,
    val,
    propVal,
    shouldRemove,
    target,
    ignoreLock,
    notFetch
  ) {
    const queue = job.queue;
    const queueKeys = queue.keys;

    const metricsKey = queue.toKey(`metrics:${target}`);

    const keys = [
      queueKeys.active,
      queueKeys[target],
      queue.toKey(job.id),
      queueKeys.wait,
      queueKeys.priority,
      queueKeys.active + '@' + queue.token,
      queueKeys.delayed,
      queueKeys.stalled,
      metricsKey
    ];

    const keepJobs = pack(
      typeof shouldRemove === 'object'
        ? shouldRemove
        : typeof shouldRemove === 'number'
        ? { count: shouldRemove }
        : { count: shouldRemove ? 0 : -1 }
    );

    const args = [
      job.id,
      job.finishedOn,
      propVal,
      _.isUndefined(val) ? 'null' : val,
      ignoreLock ? '0' : queue.token,
      keepJobs,
      JSON.stringify({ jobId: job.id, val: val }),
      notFetch || queue.paused || queue.closing || queue.limiter ? 0 : 1,
      queueKeys[''],
      queue.settings.lockDuration,
      queue.token,
      queue.metrics && queue.metrics.maxDataPoints
    ];

    return keys.concat(args);
  },

  moveToFinished(
    job,
    val,
    propVal,
    shouldRemove,
    target,
    ignoreLock,
    notFetch = false
  ) {
    const args = scripts.moveToFinishedArgs(
      job,
      val,
      propVal,
      shouldRemove,
      target,
      ignoreLock,
      notFetch,
      job.queue.toKey('')
    );
    return job.queue.client.moveToFinished(args).then(result => {
      if (result < 0) {
        throw scripts.finishedErrors(result, job.id, 'finished', 'active');
      } else if (result) {
        return raw2jobData(result);
      }
      return 0;
    });
  },

  finishedErrors(code, jobId, command, state) {
    switch (code) {
      case -1:
        return new Error('Missing key for job ' + jobId + ' ' + command);
      case -2:
        return new Error('Missing lock for job ' + jobId + ' ' + command);
      case -3:
        return new Error(
          `Job ${jobId} is not in the ${state} state. ${command}`
        );
      case -6:
        return new Error(
          `Lock mismatch for job ${jobId}. Cmd ${command} from ${state}`
        );
    }
  },

  // TODO: add a retention argument for completed and finished jobs (in time).
  moveToCompleted(
    job,
    returnvalue,
    removeOnComplete,
    ignoreLock,
    notFetch = false
  ) {
    return scripts.moveToFinished(
      job,
      returnvalue,
      'returnvalue',
      removeOnComplete,
      'completed',
      ignoreLock,
      notFetch
    );
  },

  moveToFailedArgs(job, failedReason, removeOnFailed, ignoreLock) {
    return scripts.moveToFinishedArgs(
      job,
      failedReason,
      'failedReason',
      removeOnFailed,
      'failed',
      ignoreLock,
      true
    );
  },

  moveToFailed(job, failedReason, removeOnFailed, ignoreLock) {
    const args = scripts.moveToFailedArgs(
      job,
      failedReason,
      removeOnFailed,
      ignoreLock
    );
    return scripts.moveToFinished(args);
  },

  isFinished(job) {
    const keys = _.map(['completed', 'failed'], key => {
      return job.queue.toKey(key);
    });

    return job.queue.client.isFinished(keys.concat([job.id]));
  },

  moveToDelayedArgs(queue, jobId, timestamp, ignoreLock) {
    //
    // Bake in the job id first 12 bits into the timestamp
    // to guarantee correct execution order of delayed jobs
    // (up to 4096 jobs per given timestamp or 4096 jobs apart per timestamp)
    //
    // WARNING: Jobs that are so far apart that they wrap around will cause FIFO to fail
    //
    timestamp = _.isUndefined(timestamp) ? 0 : timestamp;

    timestamp = +timestamp || 0;
    timestamp = timestamp < 0 ? 0 : timestamp;
    if (timestamp > 0) {
      timestamp = timestamp * 0x1000 + (jobId & 0xfff);
    }

    const keys = _.map(['active', 'delayed', jobId, 'stalled'], name => {
      return queue.toKey(name);
    });
    return keys.concat([
      JSON.stringify(timestamp),
      jobId,
      ignoreLock ? '0' : queue.token
    ]);
  },

  moveToDelayed(queue, jobId, timestamp, ignoreLock) {
    const args = scripts.moveToDelayedArgs(queue, jobId, timestamp, ignoreLock);
    return queue.client.moveToDelayed(args).then(result => {
      switch (result) {
        case -1:
          throw new Error(
            'Missing Job ' +
              jobId +
              ' when trying to move from active to delayed'
          );
        case -2:
          throw new Error(
            'Job ' +
              jobId +
              ' was locked when trying to move from active to delayed'
          );
      }
    });
  },

  remove(queue, jobId) {
    const keys = [
      queue.keys.active,
      queue.keys.wait,
      queue.keys.delayed,
      queue.keys.paused,
      queue.keys.completed,
      queue.keys.failed,
      queue.keys.priority,
      queue.toKey(jobId),
      queue.toKey(`${jobId}:logs`),
      queue.keys.limiter,
      queue.toKey(''),
    ];
    return queue.client.removeJob(keys.concat([jobId, queue.token]));
  },

  async removeWithPattern(queue, pattern) {
    const keys = [
      queue.keys.active,
      queue.keys.wait,
      queue.keys.delayed,
      queue.keys.paused,
      queue.keys.completed,
      queue.keys.failed,
      queue.keys.priority,
      queue.keys.limiter
    ];

    const allRemoved = [];
    let cursor = '0',
      removed;
    do {
      [cursor, removed] = await queue.client.removeJobs(
        keys.concat([queue.toKey(''), pattern, cursor])
      );
      allRemoved.push.apply(allRemoved, removed);
    } while (cursor !== '0');

    return allRemoved;
  },

  extendLock(queue, jobId, duration) {
    return queue.client.extendLock([
      queue.toKey(jobId) + ':lock',
      queue.keys.stalled,
      queue.token,
      duration,
      jobId
    ]);
  },

  releaseLock(queue, jobId) {
    return queue.client.releaseLock([
      queue.toKey(jobId) + ':lock',
      queue.token
    ]);
  },

  takeLock(queue, job) {
    return queue.client.takeLock([
      job.lockKey(),
      queue.token,
      queue.settings.lockDuration
    ]);
  },

  /**
    It checks if the job in the top of the delay set should be moved back to the
    top of the  wait queue (so that it will be processed as soon as possible)
  */
  updateDelaySet(queue, delayedTimestamp) {
    const keys = [
      queue.keys.delayed,
      queue.keys.active,
      queue.keys.wait,
      queue.keys.priority,
      queue.keys.paused,
      queue.keys['meta-paused']
    ];

    const args = [queue.toKey(''), delayedTimestamp, queue.token];
    return queue.client.updateDelaySet(keys.concat(args));
  },

  promote(queue, jobId) {
    const keys = [
      queue.keys.delayed,
      queue.keys.wait,
      queue.keys.paused,
      queue.keys['meta-paused'],
      queue.keys.priority
    ];

    const args = [queue.toKey(''), jobId, queue.token];

    return queue.client.promote(keys.concat(args));
  },

  /**
   * Looks for unlocked jobs in the active queue.
   *
   *    The job was being worked on, but the worker process died and it failed to renew the lock.
   *    We call these jobs 'stalled'. This is the most common case. We resolve these by moving them
   *    back to wait to be re-processed. To prevent jobs from cycling endlessly between active and wait,
   *    (e.g. if the job handler keeps crashing), we limit the number stalled job recoveries to settings.maxStalledCount.
   */
  moveUnlockedJobsToWait(queue) {
    const keys = [
      queue.keys.stalled,
      queue.keys.wait,
      queue.keys.active,
      queue.keys.failed,
      queue.keys['stalled-check'],
      queue.keys['meta-paused'],
      queue.keys.paused
    ];
    const args = [
      queue.settings.maxStalledCount,
      queue.toKey(''),
      Date.now(),
      queue.settings.stalledInterval
    ];
    return queue.client.moveStalledJobsToWait(keys.concat(args));
  },

  cleanJobsInSet(queue, set, ts, limit) {
    return queue.client.cleanJobsInSet([
      queue.toKey(set),
      queue.toKey('priority'),
      queue.keys.limiter,
      queue.toKey(''),
      ts,
      limit || 0,
      set
    ]);
  },

  retryJobArgs(job, ignoreLock) {
    const queue = job.queue;
    const jobId = job.id;

    const keys = _.map(
      ['active', 'wait', jobId, 'meta-paused', 'paused', 'stalled', 'priority'],
      name => {
        return queue.toKey(name);
      }
    );

    const pushCmd = (job.opts.lifo ? 'R' : 'L') + 'PUSH';

    return keys.concat([pushCmd, jobId, ignoreLock ? '0' : job.queue.token]);
  },

  /**
   * Attempts to reprocess a job
   *
   * @param {Job} job
   * @param {Object} options
   * @param {String} options.state The expected job state. If the job is not found
   * on the provided state, then it's not reprocessed. Supported states: 'failed', 'completed'
   *
   * @return {Promise<Number>} Returns a promise that evaluates to a return code:
   * 1 means the operation was a success
   * 0 means the job does not exist
   * -1 means the job is currently locked and can't be retried.
   * -2 means the job was not found in the expected set
   */
  reprocessJob(job, options) {
    const queue = job.queue;

    const keys = [
      queue.toKey(job.id),
      queue.toKey(job.id) + ':lock',
      queue.toKey(options.state),
      queue.toKey('wait'),
      queue.toKey('meta-paused'),
      queue.toKey('paused')
    ];

    const args = [
      job.id,
      (job.opts.lifo ? 'R' : 'L') + 'PUSH',
      queue.token,
      Date.now()
    ];

    return queue.client.reprocessJob(keys.concat(args));
  },

  obliterate(queue, opts) {
    const client = queue.client;

    const keys = [queue.keys['meta-paused'], queue.toKey('')];
    const args = [opts.count, opts.force ? 'force' : null];

    return client.obliterate(keys.concat(args)).then(result => {
      if (result < 0) {
        switch (result) {
          case -1:
            throw new Error('Cannot obliterate non-paused queue');
          case -2:
            throw new Error('Cannot obliterate queue with active jobs');
        }
      }
      return result;
    });
  }
};

module.exports = scripts;

function array2obj(arr) {
  const obj = {};
  for (let i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i + 1];
  }
  return obj;
}

function raw2jobData(raw) {
  if (raw) {
    const jobData = raw[0];
    if (jobData.length) {
      const job = array2obj(jobData);
      return [job, raw[1]];
    }
  }
  return [];
}
