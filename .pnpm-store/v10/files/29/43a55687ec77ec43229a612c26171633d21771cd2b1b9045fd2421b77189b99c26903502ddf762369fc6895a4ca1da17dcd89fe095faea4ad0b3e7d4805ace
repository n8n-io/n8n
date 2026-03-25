'use strict';

const _ = require('lodash');
const Job = require('./job');
const scripts = require('./scripts');

module.exports = function(Queue) {
  Queue.prototype.getJob = async function(jobId) {
    await this.isReady();
    return Job.fromId(this, jobId);
  };

  Queue.prototype.getCountsPerPriority = async function(priorities) {
    const uniquePriorities = [...new Set(priorities)];
    const responses = await scripts.getCountsPerPriority(
      this,
      uniquePriorities
    );

    const counts = {};
    responses.forEach((res, index) => {
      counts[`${uniquePriorities[index]}`] = res || 0;
    });

    return counts;
  };

  Queue.prototype._commandByType = function(types, count, callback) {
    return _.map(types, type => {
      type = type === 'waiting' ? 'wait' : type; // alias

      const key = this.toKey(type);

      switch (type) {
        case 'completed':
        case 'failed':
        case 'delayed':
        case 'repeat':
          return callback(key, count ? 'zcard' : 'zrange');
        case 'active':
        case 'wait':
        case 'paused':
          return callback(key, count ? 'llen' : 'lrange');
      }
    });
  };

  /**
    Returns the number of jobs waiting to be processed.
  */
  Queue.prototype.count = function() {
    return this.getJobCountByTypes('wait', 'paused', 'delayed');
  };

  // Job counts by type
  // Queue#getJobCountByTypes('completed') => completed count
  // Queue#getJobCountByTypes('completed,failed') => completed + failed count
  // Queue#getJobCountByTypes('completed', 'failed') => completed + failed count
  // Queue#getJobCountByTypes('completed,waiting', 'failed') => completed + waiting + failed count
  Queue.prototype.getJobCountByTypes = function() {
    return this.getJobCounts.apply(this, arguments).then(result => {
      return _.chain(result)
        .values()
        .sum()
        .value();
    });
  };

  /**
   * Returns the job counts for each type specified or every list/set in the queue by default.
   *
   */
  Queue.prototype.getJobCounts = function() {
    const types = parseTypeArg(arguments);
    const multi = this.multi();

    this._commandByType(types, true, (key, command) => {
      multi[command](key);
    });

    return multi.exec().then(res => {
      const counts = {};
      res.forEach((res, index) => {
        counts[types[index]] = res[1] || 0;
      });
      return counts;
    });
  };

  Queue.prototype.getCompletedCount = function() {
    return this.getJobCountByTypes('completed');
  };

  Queue.prototype.getFailedCount = function() {
    return this.getJobCountByTypes('failed');
  };

  Queue.prototype.getDelayedCount = function() {
    return this.getJobCountByTypes('delayed');
  };

  Queue.prototype.getActiveCount = function() {
    return this.getJobCountByTypes('active');
  };

  Queue.prototype.getWaitingCount = function() {
    return this.getJobCountByTypes('wait', 'paused');
  };

  /**
   *
   * @returns the potential stalled jobs. Only useful for tests.
   */
  Queue.prototype.getStalledCount = function() {
    const key = this.toKey('stalled');
    return this.client.scard(key);
  };

  // TO BE DEPRECATED --->
  Queue.prototype.getPausedCount = function() {
    return this.getJobCountByTypes('paused');
  };
  // <-----

  Queue.prototype.getWaiting = function(start, end, opts) {
    return this.getJobs(['wait', 'paused'], start, end, true, opts);
  };

  Queue.prototype.getActive = function(start, end, opts) {
    return this.getJobs('active', start, end, true, opts);
  };

  Queue.prototype.getDelayed = function(start, end, opts) {
    return this.getJobs('delayed', start, end, true, opts);
  };

  Queue.prototype.getCompleted = function(start, end, opts) {
    return this.getJobs('completed', start, end, false, opts);
  };

  Queue.prototype.getFailed = function(start, end, opts) {
    return this.getJobs('failed', start, end, false, opts);
  };

  Queue.prototype.getRanges = function(types, start, end, asc) {
    start = _.isUndefined(start) ? 0 : start;
    end = _.isUndefined(end) ? -1 : end;

    const multi = this.multi();
    const multiCommands = [];

    this._commandByType(parseTypeArg(types), false, (key, command) => {
      switch (command) {
        case 'lrange':
          if (asc) {
            multiCommands.push('lrange');
            multi.lrange(key, -(end + 1), -(start + 1));
          } else {
            multi.lrange(key, start, end);
          }
          break;
        case 'zrange':
          multiCommands.push('zrange');
          if (asc) {
            multi.zrange(key, start, end);
          } else {
            multi.zrevrange(key, start, end);
          }
          break;
      }
    });

    return multi.exec().then(responses => {
      let results = [];

      responses.forEach((response, index) => {
        const result = response[1] || [];

        if (asc && multiCommands[index] === 'lrange') {
          results = results.concat(result.reverse());
        } else {
          results = results.concat(result);
        }
      });
      return results;
    });
  };

  Queue.prototype.getJobs = function(types, start, end, asc, opts) {
    return this.getRanges(types, start, end, asc).then(jobIds => {
      return Promise.all(jobIds.map(jobId => this.getJobFromId(jobId, opts)));
    });
  };

  Queue.prototype.getJobLogs = function(jobId, start, end, asc = true) {
    start = _.isUndefined(start) ? 0 : start;
    end = _.isUndefined(end) ? -1 : end;

    const multi = this.multi();

    const logsKey = this.toKey(jobId + ':logs');
    if (asc) {
      multi.lrange(logsKey, start, end);
    } else {
      multi.lrange(logsKey, -(end + 1), -(start + 1));
    }
    multi.llen(logsKey);
    return multi.exec().then(result => {
      if (!asc) {
        result[0][1].reverse();
      }
      return {
        logs: result[0][1],
        count: result[1][1]
      };
    });
  };

  /**
   * Get queue metrics related to the queue.
   *
   * This method returns the gathered metrics for the queue.
   * The metrics are represented as an array of job counts
   * per unit of time (1 minute).
   *
   * @param start - Start point of the metrics, where 0
   * is the newest point to be returned.
   * @param end - End poinf of the metrics, where -1 is the
   * oldest point to be returned.
   *
   * @returns - Returns an object with queue metrics.
   */
  Queue.prototype.getMetrics = async function(type, start = 0, end = -1) {
    const metricsKey = this.toKey(`metrics:${type}`);
    const dataKey = `${metricsKey}:data`;

    const multi = this.multi();
    multi.hmget(metricsKey, 'count', 'prevTS', 'prevCount');
    multi.lrange(dataKey, start, end);
    multi.llen(dataKey);

    const [hmget, range, len] = await multi.exec();
    const [err, [count, prevTS, prevCount]] = hmget;
    const [err2, data] = range;
    const [err3, numPoints] = len;
    if (err || err2) {
      throw err || err2 || err3;
    }

    return {
      meta: {
        count: parseInt(count || '0', 10),
        prevTS: parseInt(prevTS || '0', 10),
        prevCount: parseInt(prevCount || '0', 10)
      },
      data,
      count: numPoints
    };
  };
};

function parseTypeArg(args) {
  const types = _.chain([])
    .concat(args)
    .join(',')
    .split(/\s*,\s*/g)
    .compact()
    .value();

  return types.length
    ? types
    : ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];
}
