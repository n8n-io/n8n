'use strict';

const _ = require('lodash');
const parser = require('cron-parser');
const crypto = require('crypto');

const Job = require('./job');

module.exports = function(Queue) {
  Queue.prototype.nextRepeatableJob = function(
    name,
    data,
    opts,
    skipCheckExists
  ) {
    const client = this.client;
    const repeat = opts.repeat;
    const prevMillis = opts.prevMillis || 0;

    if (!prevMillis && opts.jobId) {
      repeat.jobId = opts.jobId;
    }

    const currentCount = repeat.count ? repeat.count + 1 : 1;

    if (!_.isUndefined(repeat.limit) && currentCount > repeat.limit) {
      return Promise.resolve();
    }

    let now = Date.now();

    if (!_.isUndefined(repeat.endDate) && now > new Date(repeat.endDate)) {
      return Promise.resolve();
    }

    now = prevMillis < now ? now : prevMillis;

    const nextMillis = getNextMillis(now, repeat);
    if (nextMillis) {
      const jobId = repeat.jobId ? repeat.jobId + ':' : ':';
      const repeatKey = getRepeatKey(name, repeat, jobId);

      const createNextJob = () => {
        return client.zadd(this.keys.repeat, nextMillis, repeatKey).then(() => {
          //
          // Generate unique job id for this iteration.
          //
          const customId = getRepeatJobId(
            name,
            jobId,
            nextMillis,
            md5(repeatKey)
          );
          now = Date.now();
          const delay = nextMillis - now;

          return Job.create(
            this,
            name,
            data,
            _.defaultsDeep(
              {
                repeat: {
                  count: currentCount,
                  key: repeatKey
                },
                jobId: customId,
                delay: delay < 0 ? 0 : delay,
                timestamp: now,
                prevMillis: nextMillis
              },
              opts
            )
          );
        });
      };

      if (skipCheckExists) {
        return createNextJob();
      }

      // Check that the repeatable job hasn't been removed
      // TODO: a lua script would be better here
      return client
        .zscore(this.keys.repeat, repeatKey)
        .then(repeatableExists => {
          // The job could have been deleted since this check
          if (repeatableExists) {
            return createNextJob();
          }
          return Promise.resolve();
        });
    } else {
      return Promise.resolve();
    }
  };

  Queue.prototype.removeRepeatable = function(name, repeat) {
    if (typeof name !== 'string') {
      repeat = name;
      name = Job.DEFAULT_JOB_NAME;
    }

    return this.isReady().then(() => {
      const jobId = repeat.jobId ? repeat.jobId + ':' : ':';
      const repeatJobKey = getRepeatKey(name, repeat, jobId);
      const repeatJobId = getRepeatJobId(name, jobId, '', md5(repeatJobKey));
      const queueKey = this.keys[''];
      return this.client.removeRepeatable(
        this.keys.repeat,
        this.keys.delayed,
        repeatJobId,
        repeatJobKey,
        queueKey
      );
    });
  };

  Queue.prototype.removeRepeatableByKey = function(repeatJobKey) {
    const repeatMeta = this._keyToData(repeatJobKey);
    const queueKey = this.keys[''];

    const jobId = repeatMeta.id ? repeatMeta.id + ':' : ':';
    const repeatJobId = getRepeatJobId(
      repeatMeta.name || Job.DEFAULT_JOB_NAME,
      jobId,
      '',
      md5(repeatJobKey)
    );

    return this.isReady().then(() => {
      return this.client.removeRepeatable(
        this.keys.repeat,
        this.keys.delayed,
        repeatJobId,
        repeatJobKey,
        queueKey
      );
    });
  };

  Queue.prototype._keyToData = function(key) {
    const data = key.split(':');

    return {
      key: key,
      name: data[0],
      id: data[1] || null,
      endDate: parseInt(data[2]) || null,
      tz: data[3] || null,
      cron: data[4]
    };
  };

  Queue.prototype.getRepeatableJobs = function(start, end, asc) {
    const key = this.keys.repeat;
    start = start || 0;
    end = end || -1;
    return (asc
      ? this.client.zrange(key, start, end, 'WITHSCORES')
      : this.client.zrevrange(key, start, end, 'WITHSCORES')
    ).then(result => {
      const jobs = [];
      for (let i = 0; i < result.length; i += 2) {
        const data = this._keyToData(result[i]);
        jobs.push({
          key: data.key,
          name: data.name,
          id: data.id,
          endDate: data.endDate,
          tz: data.cron ? data.tz : null,
          cron: data.cron || null,
          every: !data.cron ? parseInt(data.tz) : null,
          next: parseInt(result[i + 1])
        });
      }
      return jobs;
    });
  };

  Queue.prototype.getRepeatableCount = function() {
    return this.client.zcard(this.toKey('repeat'));
  };

  function getRepeatJobId(name, jobId, nextMillis, namespace) {
    return 'repeat:' + md5(name + jobId + namespace) + ':' + nextMillis;
  }

  function getRepeatKey(name, repeat, jobId) {
    const endDate = repeat.endDate
      ? new Date(repeat.endDate).getTime() + ':'
      : ':';
    const tz = repeat.tz ? repeat.tz + ':' : ':';
    const suffix = repeat.cron ? tz + repeat.cron : String(repeat.every);

    return name + ':' + jobId + endDate + suffix;
  }

  function getNextMillis(millis, opts) {
    if (opts.cron && opts.every) {
      throw new Error(
        'Both .cron and .every options are defined for this repeatable job'
      );
    }

    if (opts.every) {
      return Math.floor(millis / opts.every) * opts.every + opts.every;
    }

    const currentDate =
      opts.startDate && new Date(opts.startDate) > new Date(millis)
        ? new Date(opts.startDate)
        : new Date(millis);
    const interval = parser.parseExpression(
      opts.cron,
      _.defaults(
        {
          currentDate
        },
        opts
      )
    );

    try {
      return interval.next().getTime();
    } catch (e) {
      // Ignore error
    }
  }

  function md5(str) {
    return crypto
      .createHash('md5')
      .update(str)
      .digest('hex');
  }
};
