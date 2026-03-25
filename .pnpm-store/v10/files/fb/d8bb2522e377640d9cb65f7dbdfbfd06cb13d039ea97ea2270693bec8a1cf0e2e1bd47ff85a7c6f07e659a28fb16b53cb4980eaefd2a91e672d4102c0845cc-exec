'use strict';

const Redis = require('ioredis');
const EventEmitter = require('events');

const _ = require('lodash');

const fs = require('fs');
const path = require('path');
const util = require('util');
const url = require('url');
const Job = require('./job');
const scripts = require('./scripts');
const errors = require('./errors');
const utils = require('./utils');

const TimerManager = require('./timer-manager');
const { promisify } = require('util');
const { pTimeout } = require('./p-timeout');
const semver = require('semver');
const debuglog = require('util').debuglog('bull');
const uuid = require('uuid');

const commands = require('./scripts/');

/**
  Gets or creates a new Queue with the given name.

  The Queue keeps 6 data structures:
    - wait (list)
    - active (list)
    - delayed (zset)
    - priority (zset)
    - completed (zset)
    - failed (zset)

        --> priorities      -- > completed
       /     |            /
    job -> wait -> active
       \     ^            \
        v    |             -- > failed
        delayed
*/

/**
  Delayed jobs are jobs that cannot be executed until a certain time in
  ms has passed since they were added to the queue.
  The mechanism is simple, a delayedTimestamp variable holds the next
  known timestamp that is on the delayed set (or MAX_TIMEOUT_MS if none).

  When the current job has finalized the variable is checked, if
  no delayed job has to be executed yet a setTimeout is set so that a
  delayed job is processed after timing out.
*/
const MINIMUM_REDIS_VERSION = '2.8.18';

/*
  interface QueueOptions {
    prefix?: string = 'bull',
    limiter?: RateLimiter,
    redis : RedisOpts, // ioredis defaults,
    createClient?: (type: enum('client', 'subscriber'), redisOpts?: RedisOpts) => redisClient,
    defaultJobOptions?: JobOptions,

    // Advanced settings
    settings?: QueueSettings {
      lockDuration?: number = 30000,
      lockRenewTime?: number = lockDuration / 2,
      stalledInterval?: number = 30000,
      maxStalledCount?: number = 1, // The maximum number of times a job can be recovered from the 'stalled' state
      guardInterval?: number = 5000,
      retryProcessDelay?: number = 5000,
      drainDelay?: number = 5
      isSharedChildPool?: boolean = false
    }
  }

  interface RateLimiter {
    max: number,      // Number of jobs
    duration: number, // per duration milliseconds
  }
*/

// Queue(name: string, url?, opts?)
const Queue = function Queue(name, url, opts) {
  if (!(this instanceof Queue)) {
    return new Queue(name, url, opts);
  }

  if (_.isString(url)) {
    const clonedOpts = _.cloneDeep(opts || {});
    opts = {
      ...clonedOpts,
      redis: {
        ...redisOptsFromUrl(url),
        ...clonedOpts.redis
      }
    };
  } else {
    opts = _.cloneDeep(url || {});
  }

  if (!_.isObject(opts)) {
    throw TypeError('Options must be a valid object');
  }

  if (opts.limiter) {
    if (opts.limiter.max && opts.limiter.duration) {
      this.limiter = opts.limiter;
    } else {
      throw new TypeError('Limiter requires `max` and `duration` options');
    }
  }

  if (opts.defaultJobOptions) {
    this.defaultJobOptions = opts.defaultJobOptions;
  }

  this.name = name;
  this.token = uuid.v4();

  opts.redis = {
    enableReadyCheck: false,
    ...(_.isString(opts.redis)
      ? { ...redisOptsFromUrl(opts.redis) }
      : opts.redis)
  };

  _.defaults(opts.redis, {
    port: 6379,
    host: '127.0.0.1',
    db: opts.redis.db || opts.redis.DB,
    retryStrategy: function(times) {
      return Math.min(Math.exp(times), 20000);
    }
  });

  this.keyPrefix = opts.redis.keyPrefix || opts.prefix || 'bull';

  //
  // We cannot use ioredis keyPrefix feature since we
  // create keys dynamically in lua scripts.
  //
  delete opts.redis.keyPrefix;

  this.clients = [];

  const loadCommands = (providedScripts, client) => {
    const finalScripts = providedScripts || scripts;
    for (const property in finalScripts) {
      // Only define the command if not already defined
      if (!client[finalScripts[property].name]) {
        client.defineCommand(finalScripts[property].name, {
          numberOfKeys: finalScripts[property].keys,
          lua: finalScripts[property].content
        });
      }
    }
  };

  const lazyClient = redisClientGetter(this, opts, (type, client) => {
    // bubble up Redis error events
    const handler = this.emit.bind(this, 'error');
    client.on('error', handler);
    this.once('close', () => client.removeListener('error', handler));

    if (type === 'client') {
      this._initializing = (async () => loadCommands(commands, client))().then(
        () => {
          debuglog(name + ' queue ready');
        },
        err => {
          this.emit('error', new Error('Error initializing Lua scripts'));
          throw err;
        }
      );

      this._initializing.catch((/*err*/) => {});
    }
  });

  Object.defineProperties(this, {
    //
    // Queue client (used to add jobs, pause queues, etc);
    //
    client: {
      get: lazyClient('client')
    },
    //
    // Event subscriber client (receive messages from other instance of the queue)
    //
    eclient: {
      get: lazyClient('subscriber')
    },
    bclient: {
      get: lazyClient('bclient')
    }
  });

  if (opts.skipVersionCheck !== true) {
    getRedisVersion(this.client)
      .then(version => {
        if (semver.lt(version, MINIMUM_REDIS_VERSION)) {
          this.emit(
            'error',
            new Error(
              'Redis version needs to be greater than ' +
                MINIMUM_REDIS_VERSION +
                '. Current: ' +
                version
            )
          );
        }
      })
      .catch((/*err*/) => {
        // Ignore this error.
      });
  }

  this.handlers = {};
  this.delayTimer;
  this.processing = [];
  this.retrieving = 0;
  this.drained = true;

  this.settings = _.defaults(opts.settings, {
    lockDuration: 30000,
    stalledInterval: 30000,
    maxStalledCount: 1,
    guardInterval: 5000,
    retryProcessDelay: 5000,
    drainDelay: 5,
    backoffStrategies: {},
    isSharedChildPool: false
  });

  this.metrics = opts.metrics;

  this.settings.lockRenewTime =
    this.settings.lockRenewTime || this.settings.lockDuration / 2;

  this.on('error', () => {
    // Dummy handler to avoid process to exit with an unhandled exception.
  });

  // keeps track of active timers. used by close() to
  // ensure that disconnect() is deferred until all
  // scheduled redis commands have been executed
  this.timers = new TimerManager();

  // Bind these methods to avoid constant rebinding and/or creating closures
  // in processJobs etc.
  this.moveUnlockedJobsToWait = this.moveUnlockedJobsToWait.bind(this);
  this.processJob = this.processJob.bind(this);
  this.getJobFromId = Job.fromId.bind(null, this);

  const keys = {};
  _.each(
    [
      '',
      'active',
      'wait',
      'waiting',
      'paused',
      'resumed',
      'meta-paused',
      'active',
      'id',
      'delayed',
      'priority',
      'stalled-check',
      'completed',
      'failed',
      'stalled',
      'repeat',
      'limiter',
      'drained',
      'duplicated',
      'progress',
      'de' // debounce key
    ],
    key => {
      keys[key] = this.toKey(key);
    }
  );
  this.keys = keys;
};

function redisClientGetter(queue, options, initCallback) {
  const createClient = _.isFunction(options.createClient)
    ? options.createClient
    : function(type, config) {
        if (['bclient', 'subscriber'].includes(type)) {
          return new Redis({ ...config, maxRetriesPerRequest: null });
        } else {
          return new Redis(config);
        }
      };

  const connections = {};

  return function(type) {
    return function() {
      // Memoized connection
      if (connections[type] != null) {
        return connections[type];
      }
      const clientOptions = _.assign({}, options.redis);

      const client = (connections[type] = createClient(type, clientOptions));

      const opts = client.options.redisOptions || client.options;

      if (
        ['bclient', 'subscriber'].includes(type) &&
        (opts.enableReadyCheck || opts.maxRetriesPerRequest)
      ) {
        throw new Error(errors.Messages.MISSING_REDIS_OPTS);
      }

      // Since connections are lazily initialized, we can't check queue.client
      // without initializing a connection. So expose a boolean we can safely
      // query.
      queue[type + 'Initialized'] = true;

      if (!options.createClient) {
        queue.clients.push(client);
      }
      return initCallback(type, client), client;
    };
  };
}

function redisOptsFromUrl(urlString) {
  let redisOpts = {};
  try {
    const redisUrl = url.parse(urlString, true, true);
    redisOpts.port = parseInt(redisUrl.port || '6379', 10);
    redisOpts.host = redisUrl.hostname;
    redisOpts.db = redisUrl.pathname ? redisUrl.pathname.split('/')[1] : 0;
    if (redisUrl.auth) {
      const columnIndex = redisUrl.auth.indexOf(':');
      redisOpts.password = redisUrl.auth.slice(columnIndex + 1);
      if (columnIndex > 0) {
        redisOpts.username = redisUrl.auth.slice(0, columnIndex);
      }
    }

    if (redisUrl.query) {
      redisOpts = { ...redisOpts, ...redisUrl.query };
    }
  } catch (e) {
    throw new Error(e.message);
  }
  return redisOpts;
}

util.inherits(Queue, EventEmitter);

//
// Extend Queue with "aspects"
//
require('./getters')(Queue);
require('./worker')(Queue);
require('./repeatable')(Queue);

// --
Queue.prototype.off = Queue.prototype.removeListener;

const _on = Queue.prototype.on;

Queue.prototype.on = function(eventName) {
  this._registerEvent(eventName);
  return _on.apply(this, arguments);
};

const _once = Queue.prototype.once;

Queue.prototype.once = function(eventName) {
  this._registerEvent(eventName);
  return _once.apply(this, arguments);
};

Queue.prototype._initProcess = function() {
  if (!this._initializingProcess) {
    //
    // Only setup listeners if .on/.addEventListener called, or process function defined.
    //
    this.delayedTimestamp = Number.MAX_VALUE;
    this._initializingProcess = this.isReady()
      .then(() => {
        return this._registerEvent('delayed');
      })
      .then(() => {
        return this.updateDelayTimer();
      });

    this.errorRetryTimer = {};
  }

  return this._initializingProcess;
};

Queue.prototype._setupQueueEventListeners = function() {
  /*
    if(eventName !== 'cleaned' && eventName !== 'error'){
      args[0] = Job.fromJSON(this, args[0]);
    }
  */

  const activeKey = this.keys.active;
  const stalledKey = this.keys.stalled;
  const progressKey = this.keys.progress;
  const delayedKey = this.keys.delayed;
  const pausedKey = this.keys.paused;
  const resumedKey = this.keys.resumed;
  const waitingKey = this.keys.waiting;
  const completedKey = this.keys.completed;
  const failedKey = this.keys.failed;
  const drainedKey = this.keys.drained;
  const duplicatedKey = this.keys.duplicated;
  const debouncedKey = this.keys.de + 'bounced';

  const pmessageHandler = (pattern, channel, message) => {
    const keyAndToken = channel.split('@');
    const key = keyAndToken[0];
    const token = keyAndToken[1];
    switch (key) {
      case activeKey:
        utils.emitSafe(this, 'global:active', message, 'waiting');
        break;
      case waitingKey:
        if (this.token === token) {
          utils.emitSafe(this, 'waiting', message, null);
        }
        token && utils.emitSafe(this, 'global:waiting', message, null);
        break;
      case stalledKey:
        if (this.token === token) {
          utils.emitSafe(this, 'stalled', message);
        }
        utils.emitSafe(this, 'global:stalled', message);
        break;
      case duplicatedKey:
        if (this.token === token) {
          utils.emitSafe(this, 'duplicated', message);
        }
        utils.emitSafe(this, 'global:duplicated', message);
        break;
      case debouncedKey:
        if (this.token === token) {
          utils.emitSafe(this, 'debounced', message);
        }
        utils.emitSafe(this, 'global:debounced', message);
        break;
    }
  };

  const messageHandler = (channel, message) => {
    const key = channel.split('@')[0];
    switch (key) {
      case progressKey: {
        // New way to send progress message data
        try {
          const { progress, jobId } = JSON.parse(message);
          utils.emitSafe(this, 'global:progress', jobId, progress);
        } catch (err) {
          // If we fail we should try to parse the data using the deprecated method
          const commaPos = message.indexOf(',');
          const jobId = message.substring(0, commaPos);
          const progress = message.substring(commaPos + 1);
          utils.emitSafe(this, 'global:progress', jobId, JSON.parse(progress));
        }
        break;
      }
      case delayedKey: {
        const newDelayedTimestamp = _.ceil(message);
        if (newDelayedTimestamp < this.delayedTimestamp) {
          // The new delayed timestamp is before the currently newest known delayed timestamp
          // Assume this is the new delayed timestamp and call `updateDelayTimer()` to process any delayed jobs
          // This will also update the `delayedTimestamp`
          this.delayedTimestamp = newDelayedTimestamp;

          this.updateDelayTimer();
        }
        break;
      }
      case pausedKey:
      case resumedKey:
        utils.emitSafe(this, 'global:' + message);
        break;
      case completedKey: {
        const data = JSON.parse(message);
        utils.emitSafe(
          this,
          'global:completed',
          data.jobId,
          data.val,
          'active'
        );
        break;
      }
      case failedKey: {
        const data = JSON.parse(message);
        utils.emitSafe(this, 'global:failed', data.jobId, data.val, 'active');
        break;
      }
      case drainedKey:
        utils.emitSafe(this, 'global:drained');
        break;
    }
  };

  this.eclient.on('pmessage', pmessageHandler);
  this.eclient.on('message', messageHandler);

  this.once('close', () => {
    this.eclient.removeListener('pmessage', pmessageHandler);
    this.eclient.removeListener('message', messageHandler);
  });
};

Queue.prototype._registerEvent = function(eventName) {
  const internalEvents = ['waiting', 'delayed', 'duplicated', 'debounced'];

  if (
    eventName.startsWith('global:') ||
    internalEvents.indexOf(eventName) !== -1
  ) {
    if (!this.registeredEvents) {
      this._setupQueueEventListeners();
      this.registeredEvents = this.registeredEvents || {};
    }

    const _eventName = eventName.replace('global:', '');

    if (!this.registeredEvents[_eventName]) {
      return utils
        .isRedisReady(this.eclient)
        .then(() => {
          const channel = this.toKey(_eventName);
          if (['active', 'waiting', 'stalled', 'duplicated', 'debounced'].indexOf(_eventName) !== -1) {
            return (this.registeredEvents[_eventName] = this.eclient.psubscribe(
              channel + '*'
            ));
          } else {
            return (this.registeredEvents[_eventName] = this.eclient.subscribe(
              channel
            ));
          }
        })
        .then(() => {
          utils.emitSafe(this, 'registered:' + eventName);
        });
    } else {
      return this.registeredEvents[_eventName];
    }
  }
  return Promise.resolve();
};

Queue.ErrorMessages = errors.Messages;

Queue.prototype.isReady = async function() {
  await this._initializing;
  return this;
};

async function redisClientDisconnect(client) {
  if (client.status !== 'end') {
    let _resolve, _reject;
    return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
      client.once('end', _resolve);

      pTimeout(
        client.quit().catch(err => {
          if (err.message !== 'Connection is closed.') {
            throw err;
          }
        }),
        500
      )
        .catch(() => {
          // Ignore timeout error
        })
        .finally(() => {
          client.once('error', _reject);

          client.disconnect();
          if (['connecting', 'reconnecting'].includes(client.status)) {
            resolve();
          }
        });
    }).finally(() => {
      client.removeListener('end', _resolve);
      client.removeListener('error', _reject);
    });
  }
}

Queue.prototype.disconnect = async function() {
  await Promise.all(
    this.clients.map(client =>
      client.blocked ? client.disconnect() : redisClientDisconnect(client)
    )
  );
};

Queue.prototype.removeJobs = function(pattern) {
  return Job.remove(this, pattern);
};

Queue.prototype.close = function(doNotWaitJobs) {
  let isReady = true;
  if (this.closing) {
    return this.closing;
  }

  return (this.closing = this.isReady()
    .then(this._initializingProcess)
    .catch(() => {
      isReady = false;
    })
    .then(() => isReady && this.pause(true, doNotWaitJobs))
    .catch(() => void 0) // Ignore possible error from pause
    .finally(() => this._clearTimers())
    .then(() => {
      if (!this.childPool) {
        return;
      }
      const cleanPromise = this.childPool.clean().catch(() => {
        // Ignore this error and try to close anyway.
      });
      if (doNotWaitJobs) {
        return;
      }
      return cleanPromise;
    })
    .then(
      async () => this.disconnect(),
      err => console.error(err)
    )
    .finally(() => {
      this.closed = true;
      utils.emitSafe(this, 'close');
    }));
};

Queue.prototype._clearTimers = function() {
  _.each(this.errorRetryTimer, timer => {
    clearTimeout(timer);
  });
  clearTimeout(this.delayTimer);
  clearInterval(this.guardianTimer);
  clearInterval(this.moveUnlockedJobsToWaitInterval);
  this.timers.clearAll();
  return this.timers.whenIdle();
};

/**
  Processes a job from the queue. The callback is called for every job that
  is dequeued.

  @method process
*/
Queue.prototype.process = function(name, concurrency, handler) {
  switch (arguments.length) {
    case 1:
      handler = name;
      concurrency = 1;
      name = Job.DEFAULT_JOB_NAME;
      break;
    case 2: // (string, function) or (string, string) or (number, function) or (number, string)
      handler = concurrency;
      if (typeof name === 'string') {
        concurrency = 1;
      } else {
        concurrency = name;
        name = Job.DEFAULT_JOB_NAME;
      }
      break;
  }

  this.setHandler(name, handler);

  return this._initProcess().then(() => {
    return this.start(concurrency, name);
  });
};

Queue.prototype.start = function(concurrency, name) {
  return this.run(concurrency, name).catch(err => {
    utils.emitSafe(this, 'error', err, 'error running queue');
    throw err;
  });
};

Queue.prototype.setHandler = function(name, handler) {
  if (!handler) {
    throw new Error('Cannot set an undefined handler');
  }
  if (this.handlers[name]) {
    throw new Error('Cannot define the same handler twice ' + name);
  }

  this.setWorkerName();

  if (typeof handler === 'string') {
    const supportedFileTypes = ['.js', '.ts', '.flow', '.cjs'];
    const processorFile =
      handler +
      (supportedFileTypes.includes(path.extname(handler)) ? '' : '.js');

    if (!fs.existsSync(processorFile)) {
      throw new Error('File ' + processorFile + ' does not exist');
    }
    const isSharedChildPool = this.settings.isSharedChildPool;
    this.childPool =
      this.childPool || require('./process/child-pool')(isSharedChildPool);

    const sandbox = require('./process/sandbox');
    this.handlers[name] = sandbox(handler, this.childPool).bind(this);
  } else {
    handler = handler.bind(this);

    if (handler.length > 1) {
      this.handlers[name] = promisify(handler);
    } else {
      this.handlers[name] = function() {
        try {
          return Promise.resolve(handler.apply(null, arguments));
        } catch (err) {
          return Promise.reject(err);
        }
      };
    }
  }
};

/**
interface JobOptions
{
  attempts: number;

  repeat: {
    tz?: string,
    endDate?: Date | string | number
  },
  preventParsingData: boolean;
}
*/

/**
  Adds a job to the queue.
  @method add
  @param data: {} Custom data to store for this job. Should be JSON serializable.
  @param opts: JobOptions Options for this job.
*/
Queue.prototype.add = function(name, data, opts) {
  if (typeof name !== 'string') {
    opts = data;
    data = name;
    name = Job.DEFAULT_JOB_NAME;
  }
  opts = _.cloneDeep({ ...this.defaultJobOptions, ...opts });

  opts.jobId = jobIdForGroup(this.limiter, opts, data);

  if (opts.repeat) {
    return this.isReady().then(() => {
      return this.nextRepeatableJob(name, data, opts, true);
    });
  } else {
    return Job.create(this, name, data, opts);
  }
};

/**
 * Retry all the failed jobs.
 *
 * @param opts.count - number to limit how many jobs will be moved to wait status per iteration
 * @returns
 */
Queue.prototype.retryJobs = async function(opts = {}) {
  let cursor = 0;
  do {
    cursor = await scripts.retryJobs(this, opts.count);
  } while (cursor);
};

  /**
   * Removes a debounce key.
   *
   * @param id - identifier
   */
  Queue.prototype.removeDebounceKey = (id) => {
    return this.client.del(`${this.keys.de}:${id}`);
  }

/**
  Adds an array of jobs to the queue.
  @method add
  @param jobs: [] The array of jobs to add to the queue. Each job is defined by 3 properties, 'name', 'data' and 'opts'. They follow the same signature as 'Queue.add'.
*/
Queue.prototype.addBulk = function(jobs) {
  const decoratedJobs = jobs.map(job => {
    const jobId = jobIdForGroup(this.limiter, job.opts, job.data);
    return {
      ...job,
      name: typeof job.name !== 'string' ? Job.DEFAULT_JOB_NAME : job.name,
      opts: {
        ...this.defaultJobOptions,
        ...job.opts,
        jobId
      }
    };
  });
  return Job.createBulk(this, decoratedJobs);
};
/**
  Empties the queue.

  Returns a promise that is resolved after the operation has been completed.
  Note that if some other process is adding jobs at the same time as emptying,
  the queues may not be really empty after this method has executed completely.
  Also, if the method does error between emptying the lists and removing all the
  jobs, there will be zombie jobs left in redis.

  TODO: Use EVAL to make this operation fully atomic.
*/
Queue.prototype.empty = function() {
  const queueKeys = this.keys;

  let multi = this.multi();

  multi.lrange(queueKeys.wait, 0, -1);
  multi.lrange(queueKeys.paused, 0, -1);
  multi.keys(this.toKey('*:limited'));
  multi.del(
    queueKeys.wait,
    queueKeys.paused,
    queueKeys['meta-paused'],
    queueKeys.delayed,
    queueKeys.priority,
    queueKeys.limiter,
    `${queueKeys.limiter}:index`
  );

  return multi.exec().then(res => {
    let [waiting, paused, limited] = res;

    waiting = waiting[1];
    paused = paused[1];
    limited = limited[1];

    const jobKeys = paused.concat(waiting).map(this.toKey, this);

    if (jobKeys.length || limited.length) {
      multi = this.multi();

      for (let i = 0; i < jobKeys.length; i += 10000) {
        multi.del.apply(multi, jobKeys.slice(i, i + 10000));
      }

      for (let i = 0; i < limited.length; i += 10000) {
        multi.del.apply(multi, limited.slice(i, i + 10000));
      }

      return multi.exec();
    }
  });
};

/**
  Pauses the processing of this queue, locally if true passed, otherwise globally.

  For global pause, we use an atomic RENAME operation on the wait queue. Since
  we have blocking calls with BRPOPLPUSH on the wait queue, as long as the queue
  is renamed to 'paused', no new jobs will be processed (the current ones
  will run until finalized).

  Adding jobs requires a LUA script to check first if the paused list exist
  and in that case it will add it there instead of the wait list.
*/
Queue.prototype.pause = function(isLocal, doNotWaitActive) {
  return this.isReady()
    .then(() => {
      if (isLocal) {
        if (!this.paused) {
          this.paused = new Promise(resolve => {
            this.resumeLocal = function() {
              this.paused = null; // Allow pause to be checked externally for paused state.
              resolve();
            };
          });
        }

        if (!this.bclientInitialized) {
          // bclient not yet initialized, so no jobs to wait for
          return;
        }

        if (doNotWaitActive) {
          // Force reconnection of blocking connection to abort blocking redis call immediately.
          return redisClientDisconnect(this.bclient).then(() =>
            this.bclient.connect()
          );
        }
        return this.whenCurrentJobsFinished();
      } else {
        return scripts.pause(this, true);
      }
    })
    .then(() => {
      return utils.emitSafe(this, 'paused');
    });
};

Queue.prototype.resume = function(isLocal /* Optional */) {
  return this.isReady()
    .then(() => {
      if (isLocal) {
        if (this.resumeLocal) {
          this.resumeLocal();
        }
      } else {
        return scripts.pause(this, false);
      }
    })
    .then(() => {
      utils.emitSafe(this, 'resumed');
    });
};

Queue.prototype.isPaused = async function(isLocal) {
  if (isLocal) {
    return !!this.paused;
  } else {
    await this.isReady();
    const multi = this.multi();

    multi.exists(this.keys['meta-paused']);

    // For forward compatibility with BullMQ.
    multi.hexists(this.toKey('meta'), 'paused');

    const [[, isPaused], [, isPausedNew]] = await multi.exec();

    return !!(isPaused || isPausedNew);
  }
};

Queue.prototype.run = function(concurrency, handlerName) {
  if (!Number.isInteger(concurrency)) {
    throw new Error('Cannot set Float as concurrency');
  }
  const promises = [];

  return this.isReady()
    .then(() => {
      return this.moveUnlockedJobsToWait();
    })
    .then(() => {
      return utils.isRedisReady(this.bclient);
    })
    .then(() => {
      while (concurrency--) {
        promises.push(
          new Promise(resolve => {
            this.processJobs(`${handlerName}:${concurrency}`, resolve);
          })
        );
      }

      this.startMoveUnlockedJobsToWait();

      return Promise.all(promises);
    });
};

// ---------------------------------------------------------------------
// Private methods
// ---------------------------------------------------------------------

/**
  This function updates the delay timer, which is a timer that timeouts
  at the next known delayed job.
*/
Queue.prototype.updateDelayTimer = function() {
  if (this.closing) {
    return Promise.resolve();
  }

  return scripts
    .updateDelaySet(this, Date.now())
    .then(nextTimestamp => {
      this.delayedTimestamp = nextTimestamp
        ? nextTimestamp / 4096
        : Number.MAX_VALUE;

      // Clear any existing update delay timer
      if (this.delayTimer) {
        clearTimeout(this.delayTimer);
      }

      // Delay for the next update of delay set
      const delay = _.min([
        this.delayedTimestamp - Date.now(),
        this.settings.guardInterval
      ]);

      // Schedule next processing of the delayed jobs
      if (delay <= 0) {
        // Next set of jobs are due right now, process them also
        this.updateDelayTimer();
      } else {
        // Update the delay set when the next job is due
        // or the next guard time
        this.delayTimer = setTimeout(() => this.updateDelayTimer(), delay);
      }

      // Silence warnings about promise created but not returned.
      // This isn't an issue since we emit errors.
      // See http://bluebirdjs.com/docs/warning-explanations.html#warning-a-promise-was-created-in-a-handler-but-was-not-returned-from-it
      return null;
    })
    .catch(err => {
      utils.emitSafe(this, 'error', err, 'Error updating the delay timer');
      if (this.delayTimer) {
        clearTimeout(this.delayTimer);
      }

      this.delayTimer = setTimeout(
        () => this.updateDelayTimer(),
        this.settings.guardInterval
      );
    });
};

/**
 * Process jobs that have been added to the active list but are not being
 * processed properly. This can happen due to a process crash in the middle
 * of processing a job, leaving it in 'active' but without a job lock.
 */
Queue.prototype.moveUnlockedJobsToWait = function() {
  if (this.closing) {
    return Promise.resolve();
  }

  return scripts
    .moveUnlockedJobsToWait(this)
    .then(([failed, stalled]) => {
      const handleFailedJobs = failed.map(jobId => {
        return this.getJobFromId(jobId).then(job => {
          utils.emitSafe(
            this,
            'failed',
            job,
            new Error('job stalled more than allowable limit'),
            'active'
          );
          return null;
        });
      });
      const handleStalledJobs = stalled.map(jobId => {
        return this.getJobFromId(jobId).then(job => {
          // Do not emit the event if the job was completed by another worker
          if (job !== null) {
            utils.emitSafe(this, 'stalled', job);
          }
          return null;
        });
      });
      return Promise.all(handleFailedJobs.concat(handleStalledJobs));
    })
    .catch(err => {
      utils.emitSafe(
        this,
        'error',
        err,
        'Failed to handle unlocked job in active'
      );
    });
};

Queue.prototype.startMoveUnlockedJobsToWait = function() {
  clearInterval(this.moveUnlockedJobsToWaitInterval);
  if (this.settings.stalledInterval > 0 && !this.closing) {
    this.moveUnlockedJobsToWaitInterval = setInterval(
      this.moveUnlockedJobsToWait,
      this.settings.stalledInterval
    );
  }
};

/*
  Process jobs. Note last argument 'job' is optional.
*/
Queue.prototype.processJobs = function(index, resolve, job) {
  const processJobs = this.processJobs.bind(this, index, resolve);
  process.nextTick(() => {
    this._processJobOnNextTick(processJobs, index, resolve, job);
  });
};

Queue.prototype._processJobOnNextTick = function(
  processJobs,
  index,
  resolve,
  job
) {
  if (!this.closing) {
    (this.paused || Promise.resolve())
      .then(() => {
        const gettingNextJob = job ? Promise.resolve(job) : this.getNextJob();

        return (this.processing[index] = gettingNextJob
          .then(this.processJob)
          .then(processJobs, err => {
            if (!(this.closing && err.message === 'Connection is closed.')) {
              utils.emitSafe(this, 'error', err, 'Error processing job');

              //
              // Wait before trying to process again.
              //
              clearTimeout(this.errorRetryTimer[index]);
              this.errorRetryTimer[index] = setTimeout(() => {
                processJobs();
              }, this.settings.retryProcessDelay);
            }
            return null;
          }));
      })
      .catch(err => {
        utils.emitSafe(this, 'error', err, 'Error processing job');
      });
  } else {
    resolve(this.closing);
  }
};

Queue.prototype.processJob = function(job, notFetch = false) {
  let lockRenewId;
  let timerStopped = false;

  if (!job) {
    return Promise.resolve();
  }

  //
  // There are two cases to take into consideration regarding locks.
  // 1) The lock renewer fails to renew a lock, this should make this job
  // unable to complete, since some other worker is also working on it.
  // 2) The lock renewer is called more seldom than the check for stalled
  // jobs, so we can assume the job has been stalled and is already being processed
  // by another worker. See #308
  //
  const lockExtender = () => {
    lockRenewId = this.timers.set(
      'lockExtender',
      this.settings.lockRenewTime,
      () => {
        scripts
          .extendLock(this, job.id, this.settings.lockDuration)
          .then(lock => {
            if (lock && !timerStopped) {
              lockExtender();
            }
          })
          .catch(err => {
            utils.emitSafe(this, 'lock-extension-failed', job, err);
          });
      }
    );
  };

  const timeoutMs = job.opts.timeout;

  const stopTimer = () => {
    timerStopped = true;
    this.timers.clear(lockRenewId);
  };

  const handleCompleted = result => {
    return job.moveToCompleted(result, undefined, notFetch).then(jobData => {
      utils.emitSafe(this, 'completed', job, result, 'active');
      return jobData ? this.nextJobFromJobData(jobData[0], jobData[1]) : null;
    });
  };

  const handleFailed = err => {
    const error = err;

    return job.moveToFailed(err).then(jobData => {
      utils.emitSafe(this, 'failed', job, error, 'active');
      return jobData ? this.nextJobFromJobData(jobData[0], jobData[1]) : null;
    });
  };

  lockExtender();
  const handler = this.handlers[job.name] || this.handlers['*'];

  if (!handler) {
    return handleFailed(
      new Error('Missing process handler for job type ' + job.name)
    );
  } else {
    let jobPromise = handler(job);

    if (timeoutMs) {
      jobPromise = pTimeout(jobPromise, timeoutMs);
    }

    // Local event with jobPromise so that we can cancel job.
    utils.emitSafe(this, 'active', job, jobPromise, 'waiting');

    return jobPromise
      .then(handleCompleted)
      .catch(handleFailed)
      .finally(() => {
        stopTimer();
      });
  }
};

Queue.prototype.multi = function() {
  return this.client.multi();
};

/**
  Returns a promise that resolves to the next job in queue.
*/
Queue.prototype.getNextJob = async function() {
  if (this.closing) {
    return Promise.resolve();
  }

  if (this.drained) {
    //
    // Waiting for new jobs to arrive
    //
    try {
      this.bclient.blocked = true;
      const jobId = await this.bclient.brpoplpush(
        this.keys.wait,
        this.keys.active,
        this.settings.drainDelay
      );
      this.bclient.blocked = false;

      if (jobId) {
        return this.moveToActive(jobId);
      }
    } catch (err) {
      // Swallow error if locally paused since we did force a disconnection
      if (!(this.paused && err.message === 'Connection is closed.')) {
        throw err;
      }
    }
  } else {
    return this.moveToActive();
  }
};

Queue.prototype.moveToActive = async function(jobId) {
  // For manual retrieving jobs we need to wait for the queue to be ready.
  await this.isReady();

  return scripts.moveToActive(this, jobId).then(([jobData, jobId]) => {
    return this.nextJobFromJobData(jobData, jobId);
  });
};

Queue.prototype.nextJobFromJobData = function(jobData, jobId) {
  if (jobData) {
    this.drained = false;
    const job = Job.fromJSON(this, jobData, jobId);
    if (job.opts.repeat) {
      return this.nextRepeatableJob(job.name, job.data, job.opts).then(() => {
        return job;
      });
    }
    return job;
  } else {
    this.drained = true;
    utils.emitSafe(this, 'drained');
    return null;
  }
};

Queue.prototype.retryJob = function(job) {
  return job.retry();
};

Queue.prototype.toKey = function(queueType) {
  return [this.keyPrefix, this.name, queueType].join(':');
};

/*@function clean
 *
 * Cleans jobs from a queue. Similar to remove but keeps jobs within a certain
 * grace period.
 *
 * @param {int} grace - The grace period
 * @param {string} [type=completed] - The type of job to clean. Possible values are completed, wait, active, paused, delayed, failed. Defaults to completed.
 * @param {int} The max number of jobs to clean
 */
Queue.prototype.clean = function(grace, type, limit) {
  return this.isReady().then(() => {
    if (grace === undefined || grace === null) {
      throw new Error('You must define a grace period.');
    }

    if (!type) {
      type = 'completed';
    }

    if (
      _.indexOf(
        ['completed', 'wait', 'active', 'paused', 'delayed', 'failed'],
        type
      ) === -1
    ) {
      throw new Error('Cannot clean unknown queue type ' + type);
    }

    return scripts
      .cleanJobsInSet(this, type, Date.now() - grace, limit)
      .then(jobs => {
        utils.emitSafe(this, 'cleaned', jobs, type);
        return jobs;
      })
      .catch(err => {
        utils.emitSafe(this, 'error', err);
        throw err;
      });
  });
};

/* @method obliterate
 *
 * Completely destroys the queue and all of its contents irreversibly.
 * This method will the *pause* the queue and requires that there are no
 * active jobs. It is possible to bypass this requirement, i.e. not
 * having active jobs using the "force" option.
 *
 * Note: This operation requires to iterate on all the jobs stored in the queue
 * and can be slow for very large queues.
 *
 * @param { { force: boolean, count: number }} opts. Use force = true to force obliteration even
 * with active jobs in the queue.  Use count with the maximun number of deleted keys per iteration,
 * 1000 is the default.
 */
Queue.prototype.obliterate = async function(opts) {
  await this.pause();

  let cursor = 0;
  do {
    cursor = await scripts.obliterate(this, {
      force: false,
      count: 1000,
      ...opts
    });
  } while (cursor);
};

/**
 * Returns a promise that resolves when active jobs are finished
 *
 * @returns {Promise}
 */
Queue.prototype.whenCurrentJobsFinished = function() {
  if (!this.bclientInitialized) {
    // bclient not yet initialized, so no jobs to wait for
    return Promise.resolve();
  }

  //
  // Force reconnection of blocking connection to abort blocking redis call immediately.
  //
  const forcedReconnection = redisClientDisconnect(this.bclient).then(() => {
    return this.bclient.connect();
  });

  return Promise.all(Object.values(this.processing)).then(
    () => forcedReconnection
  );
};

//
// Private local functions
//

function getRedisVersion(client) {
  return client.info().then(doc => {
    const prefix = 'redis_version:';
    const lines = doc.split('\r\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(prefix) === 0) {
        return lines[i].substr(prefix.length);
      }
    }
  });
}

function jobIdForGroup(limiter, opts, data) {
  const jobId = opts && opts.jobId;
  const groupKey = _.get(limiter, 'groupKey');
  if (groupKey) {
    return `${jobId || uuid.v4()}:${_.get(data, groupKey)}`;
  }
  return jobId;
}

module.exports = Queue;
