// Type definitions for bull 3.15
// Project: https://github.com/OptimalBits/bull
// Definitions by: Bruno Grieder <https://github.com/bgrieder>
//                 Cameron Crothers <https://github.com/JProgrammer>
//                 Marshall Cottrell <https://github.com/marshall007>
//                 Weeco <https://github.com/weeco>
//                 Oleg Repin <https://github.com/iamolegga>
//                 David Koblas <https://github.com/koblas>
//                 Bond Akinmade <https://github.com/bondz>
//                 Wuha Team <https://github.com/wuha-team>
//                 Alec Brunelle <https://github.com/aleccool213>
//                 Dan Manastireanu <https://github.com/danmana>
//                 Kjell-Morten Bratsberg Thorsen <https://github.com/kjellmorten>
//                 Christian D. <https://github.com/pc-jedi>
//                 Silas Rech <https://github.com/lenovouser>
//                 DoYoung Ha <https://github.com/hados99>
//                 Borys Kupar <https://github.com/borys-kupar>
//                 Remko Klein <https://github.com/remko79>
//                 Levi Bostian <https://github.com/levibostian>
//                 Todd Dukart <https://github.com/tdukart>
//                 Mix <https://github.com/mnixry>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.8

import * as Redis from 'ioredis';
import { EventEmitter } from 'events';

/**
 * This is the Queue constructor.
 * It creates a new Queue that is persisted in Redis.
 * Everytime the same queue is instantiated it tries to process all the old jobs that may exist from a previous unfinished session.
 */
declare const Bull: {
  /* tslint:disable:no-unnecessary-generics unified-signatures */
  <T = any>(queueName: string, opts?: Bull.QueueOptions): Bull.Queue<T>;
  <T = any>(
    queueName: string,
    url: string,
    opts?: Bull.QueueOptions
  ): Bull.Queue<T>;
  new <T = any>(queueName: string, opts?: Bull.QueueOptions): Bull.Queue<T>;
  new <T = any>(
    queueName: string,
    url: string,
    opts?: Bull.QueueOptions
  ): Bull.Queue<T>;
  /* tslint:enable:no-unnecessary-generics unified-signatures */
};

declare namespace Bull {
  interface RateLimiter {
    /** Max numbers of jobs processed */
    max: number;
    /** Per duration in milliseconds */
    duration: number;
    /** When jobs get rate limited, they stay in the waiting queue and are not moved to the delayed queue */
    bounceBack?: boolean | undefined;
    /** Groups jobs with the specified key from the data object passed to the Queue#add ex. "network.handle" */
    groupKey?: string | undefined;
  }

  interface QueueOptions {
    /**
     * Options passed into the `ioredis` constructor's `options` parameter.
     * `connectionName` is overwritten with `Queue.clientName()`. other properties are copied
     */
    redis?: Redis.RedisOptions | string | undefined;

    /**
     * When specified, the `Queue` will use this function to create new `ioredis` client connections.
     * This is useful if you want to re-use connections or connect to a Redis cluster.
     */
    createClient?(
      type: 'client' | 'subscriber' | 'bclient',
      redisOpts?: Redis.RedisOptions
    ): Redis.Redis | Redis.Cluster;

    /**
     * Prefix to use for all redis keys
     */
    prefix?: string | undefined;

    settings?: AdvancedSettings | undefined;

    limiter?: RateLimiter | undefined;

    defaultJobOptions?: JobOptions | undefined;

    metrics?: MetricsOpts; // Configure metrics
  }

  interface MetricsOpts {
    maxDataPoints?: number; //  Max number of data points to collect, granularity is fixed at one minute.
  }

  interface AdvancedSettings {
    /**
     * Key expiration time for job locks
     */
    lockDuration?: number | undefined;

    /**
     * Interval in milliseconds on which to acquire the job lock.
     */
    lockRenewTime?: number | undefined;

    /**
     * How often check for stalled jobs (use 0 for never checking)
     */
    stalledInterval?: number | undefined;

    /**
     * Max amount of times a stalled job will be re-processed
     */
    maxStalledCount?: number | undefined;

    /**
     * Poll interval for delayed jobs and added jobs
     */
    guardInterval?: number | undefined;

    /**
     * Delay before processing next job in case of internal error
     */
    retryProcessDelay?: number | undefined;

    /**
     * Define a custom backoff strategy
     */
    backoffStrategies?:
      | {
          [key: string]: (
            attemptsMade: number,
            err: Error,
            strategyOptions?: any
          ) => number;
        }
      | undefined;

    /**
     * A timeout for when the queue is in `drained` state (empty waiting for jobs).
     * It is used when calling `queue.getNextJob()`, which will pass it to `.brpoplpush` on the Redis client.
     */
    drainDelay?: number | undefined;
  }

  type DoneCallback = (error?: Error | null, value?: any) => void;

  type JobId = number | string;

  type ProcessCallbackFunction<T> = (job: Job<T>, done: DoneCallback) => void;
  type ProcessPromiseFunction<T> = (job: Job<T>) => Promise<void>;

  interface Job<T = any> {
    id: JobId;

    /**
     * The custom data passed when the job was created
     */
    data: T;

    /**
     * Options of the job
     */
    opts: JobOptions;

    /**
     * How many attempts where made to run this job
     */
    attemptsMade: number;

    /**
     * When this job was started (unix milliseconds)
     */
    processedOn?: number | undefined;

    /**
     * When this job was completed (unix milliseconds)
     */
    finishedOn?: number | undefined;

    /**
     * Which queue this job was part of
     */
    queue: Queue<T>;

    timestamp: number;

    /**
     * The named processor name
     */
    name: string;

    /**
     * The stacktrace for any errors
     */
    stacktrace: string[];

    returnvalue: any;

    failedReason?: string | undefined;

    /**
     * Get progress on a job
     */
    progress(): any;

    /**
     * Report progress on a job
     */
    progress(value: any): Promise<void>;

    /**
     * Logs one row of log data.
     *
     * @param row String with log data to be logged.
     */
    log(row: string): Promise<any>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is completed
     */
    isCompleted(): Promise<boolean>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is failed
     */
    isFailed(): Promise<boolean>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is delayed
     */
    isDelayed(): Promise<boolean>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is active
     */
    isActive(): Promise<boolean>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is wait
     */
    isWaiting(): Promise<boolean>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is paused
     */
    isPaused(): Promise<boolean>;

    /**
     * Returns a promise resolving to a boolean which, if true, current job's state is stuck
     */
    isStuck(): Promise<boolean>;

    /**
     * Returns a promise resolving to the current job's status.
     * Please take note that the implementation of this method is not very efficient, nor is
     * it atomic. If your queue does have a very large quantity of jobs, you may want to
     * avoid using this method.
     */
    getState(): Promise<JobStatus | 'stuck'>;

    /**
     * Update a specific job's data. Promise resolves when the job has been updated.
     */
    update(data: T): Promise<void>;

    /**
     * Removes a job from the queue and from any lists it may be included in.
     * The returned promise resolves when the job has been removed.
     */
    remove(): Promise<void>;

    /**
     * Re-run a job that has failed. The returned promise resolves when the job
     * has been scheduled for retry.
     */
    retry(): Promise<void>;

    /**
     * Ensure this job is never ran again even if attemptsMade is less than job.attempts.
     */
    discard(): Promise<void>;

    /**
     * Returns a promise that resolves to the returned data when the job has been finished.
     * TODO: Add a watchdog to check if the job has finished periodically.
     * since pubsub does not give any guarantees.
     */
    finished(): Promise<any>;

    /**
     * Moves a job to the `completed` queue. Pulls a job from 'waiting' to 'active'
     * and returns a tuple containing the next jobs data and id. If no job is in the `waiting` queue, returns null.
     */
    moveToCompleted(
      returnValue?: string,
      ignoreLock?: boolean,
      notFetch?: boolean
    ): Promise<[any, JobId] | null>;

    /**
     * Moves a job to the `failed` queue. Pulls a job from 'waiting' to 'active'
     * and returns a tuple containing the next jobs data and id. If no job is in the `waiting` queue, returns null.
     */
    moveToFailed(
      errorInfo: { message: string },
      ignoreLock?: boolean
    ): Promise<[any, JobId] | null>;

    /**
     * Promotes a job that is currently "delayed" to the "waiting" state and executed as soon as possible.
     */
    promote(): Promise<void>;

    /**
     * Return a unique key representing a lock for this Job
     */
    lockKey(): string;

    /**
     * Releases the lock on the job. Only locks owned by the queue instance can be released.
     */
    releaseLock(): Promise<void>;

    /**
     * Takes a lock for this job so that no other queue worker can process it at the same time.
     */
    takeLock(): Promise<number | false>;

    /**
     * Extend the lock for this job.
     *
     * @param duration lock duration in milliseconds
     */
    extendLock(duration: number): Promise<number>

    /**
     * Get job properties as Json Object
     */
    toJSON(): {
      id: JobId;
      name: string;
      data: T;
      opts: JobOptions;
      progress: number;
      delay: number;
      timestamp: number;
      attemptsMade: number;
      failedReason: any;
      stacktrace: string[] | null;
      returnvalue: any;
      finishedOn: number | null;
      processedOn: number | null;
    };
  }

  type JobStatus =
    | 'completed'
    | 'waiting'
    | 'active'
    | 'delayed'
    | 'failed'
    | 'paused';
  type JobStatusClean =
    | 'completed'
    | 'wait'
    | 'active'
    | 'delayed'
    | 'failed'
    | 'paused';

  interface BackoffOptions {
    /**
     * Backoff type, which can be either `fixed` or `exponential`
     */
    type: string;

    /**
     * Backoff delay, in milliseconds
     */
    delay?: number | undefined;

    /**
     * Options for custom strategies
     */
    options?: any;
  }

  interface RepeatOptions {
    /**
     * Timezone
     */
    tz?: string | undefined;

    /**
     * End date when the repeat job should stop repeating
     */
    endDate?: Date | string | number | undefined;

    /**
     * Number of times the job should repeat at max.
     */
    limit?: number | undefined;

    /**
     * The start value for the repeat iteration count.
     */
    count?: number | undefined;
  }

  interface CronRepeatOptions extends RepeatOptions {
    /**
     * Cron pattern specifying when the job should execute
     */
    cron: string;

    /**
     * Start date when the repeat job should start repeating (only with cron).
     */
    startDate?: Date | string | number | undefined;
  }

  interface EveryRepeatOptions extends RepeatOptions {
    /**
     * Repeat every millis (cron setting cannot be used together with this setting.)
     */
    every: number;
  }

  interface DebounceOptions {
    /**
     * ttl in milliseconds
     */
    ttl?: number;
    /**
     * Identifier
     */
    id: string;
  }

  interface JobOptions {
    /**
     * Debounce options.
     */
    debounce?: DebounceOptions;

    /**
     * Optional priority value. ranges from 1 (highest priority) to MAX_INT  (lowest priority).
     * Note that using priorities has a slight impact on performance, so do not use it if not required
     */
    priority?: number | undefined;

    /**
     * An amount of miliseconds to wait until this job can be processed.
     * Note that for accurate delays, both server and clients should have their clocks synchronized. [optional]
     */
    delay?: number | undefined;

    /**
     * The total number of attempts to try the job until it completes
     */
    attempts?: number | undefined;

    /**
     * Repeat job according to a cron specification
     */
    repeat?:
      | ((CronRepeatOptions | EveryRepeatOptions) & {
          /**
           * The key for the repeatable job metadata in Redis.
           */
          readonly key?: string;
        })
      | undefined;

    /**
     * Backoff setting for automatic retries if the job fails
     */
    backoff?: number | BackoffOptions | undefined;

    /**
     * A boolean which, if true, adds the job to the right
     * of the queue instead of the left (default false)
     */
    lifo?: boolean | undefined;

    /**
     *  The number of milliseconds after which the job should be fail with a timeout error
     */
    timeout?: number | undefined;

    /**
     * Override the job ID - by default, the job ID is a unique
     * integer, but you can use this setting to override it.
     * If you use this option, it is up to you to ensure the
     * jobId is unique. If you attempt to add a job with an id that
     * already exists, it will not be added.
     */
    jobId?: JobId | undefined;

    /**
     * A boolean which, if true, removes the job when it successfully completes.
     * When a number, it specifies the amount of jobs to keep.
     * Default behavior is to keep the job in the completed set.
     * See KeepJobsOptions if using that interface instead.
     */
    removeOnComplete?: boolean | number | KeepJobsOptions | undefined;

    /**
     * A boolean which, if true, removes the job when it fails after all attempts.
     * When a number, it specifies the amount of jobs to keep.
     * Default behavior is to keep the job in the failed set.
     * See KeepJobsOptions if using that interface instead.
     */
    removeOnFail?: boolean | number | KeepJobsOptions | undefined;

    /**
     * Limits the amount of stack trace lines that will be recorded in the stacktrace.
     */
    stackTraceLimit?: number | undefined;

    /**
     * Prevents JSON data from being parsed.
     */
    preventParsingData?: boolean | undefined;
  }

  /**
   * Specify which jobs to keep after finishing processing this job.
   * If both age and count are specified, then the jobs kept will be the ones that satisfies both properties.
   */
  interface KeepJobsOptions {
    /**
     * Maximum age in *seconds* for job to be kept.
     */
    age?: number | undefined;

    /**
     * Maximum count of jobs to be kept.
     */
    count?: number | undefined;
  }

  interface JobCounts {
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
  }

  interface JobInformation {
    key: string;
    name: string;
    id?: string | undefined;
    endDate?: number | undefined;
    tz?: string | undefined;
    cron: string;
    every: number;
    next: number;
  }

  interface Queue<T = any> extends EventEmitter {
    /**
     * The name of the queue
     */
    name: string;

    /**
     * Queue client (used to add jobs, pause queues, etc);
     */
    client: Redis.Redis;

    /**
     * Returns a promise that resolves when Redis is connected and the queue is ready to accept jobs.
     * This replaces the `ready` event emitted on Queue in previous verisons.
     */
    isReady(): Promise<this>;

    /* tslint:disable:unified-signatures */

    /**
     * Defines a processing function for the jobs placed into a given Queue.
     *
     * The callback is called everytime a job is placed in the queue.
     * It is passed an instance of the job as first argument.
     *
     * If the callback signature contains the second optional done argument,
     * the callback will be passed a done callback to be called after the job has been completed.
     * The done callback can be called with an Error instance, to signal that the job did not complete successfully,
     * or with a result as second argument (e.g.: done(null, result);) when the job is successful.
     * Errors will be passed as a second argument to the "failed" event; results, as a second argument to the "completed" event.
     *
     * If, however, the callback signature does not contain the done argument,
     * a promise must be returned to signal job completion.
     * If the promise is rejected, the error will be passed as a second argument to the "failed" event.
     * If it is resolved, its value will be the "completed" event's second argument.
     */
    process(callback: ProcessCallbackFunction<T>): Promise<void>;
    process(callback: ProcessPromiseFunction<T>): Promise<void>;
    process(callback: string): Promise<void>;

    /**
     * Defines a processing function for the jobs placed into a given Queue.
     *
     * The callback is called everytime a job is placed in the queue.
     * It is passed an instance of the job as first argument.
     *
     * If the callback signature contains the second optional done argument,
     * the callback will be passed a done callback to be called after the job has been completed.
     * The done callback can be called with an Error instance, to signal that the job did not complete successfully,
     * or with a result as second argument (e.g.: done(null, result);) when the job is successful.
     * Errors will be passed as a second argument to the "failed" event; results, as a second argument to the "completed" event.
     *
     * If, however, the callback signature does not contain the done argument,
     * a promise must be returned to signal job completion.
     * If the promise is rejected, the error will be passed as a second argument to the "failed" event.
     * If it is resolved, its value will be the "completed" event's second argument.
     *
     * @param concurrency Bull will then call your handler in parallel respecting this maximum value.
     */
    process(
      concurrency: number,
      callback: ProcessCallbackFunction<T>
    ): Promise<void>;
    process(
      concurrency: number,
      callback: ProcessPromiseFunction<T>
    ): Promise<void>;
    process(concurrency: number, callback: string): Promise<void>;

    /**
     * Defines a processing function for the jobs placed into a given Queue.
     *
     * The callback is called everytime a job is placed in the queue.
     * It is passed an instance of the job as first argument.
     *
     * If the callback signature contains the second optional done argument,
     * the callback will be passed a done callback to be called after the job has been completed.
     * The done callback can be called with an Error instance, to signal that the job did not complete successfully,
     * or with a result as second argument (e.g.: done(null, result);) when the job is successful.
     * Errors will be passed as a second argument to the "failed" event; results, as a second argument to the "completed" event.
     *
     * If, however, the callback signature does not contain the done argument,
     * a promise must be returned to signal job completion.
     * If the promise is rejected, the error will be passed as a second argument to the "failed" event.
     * If it is resolved, its value will be the "completed" event's second argument.
     *
     * @param name Bull will only call the handler if the job name matches
     */
    process(name: string, callback: ProcessCallbackFunction<T>): Promise<void>;
    process(name: string, callback: ProcessPromiseFunction<T>): Promise<void>;
    process(name: string, callback: string): Promise<void>;

    /**
     * Defines a processing function for the jobs placed into a given Queue.
     *
     * The callback is called everytime a job is placed in the queue.
     * It is passed an instance of the job as first argument.
     *
     * If the callback signature contains the second optional done argument,
     * the callback will be passed a done callback to be called after the job has been completed.
     * The done callback can be called with an Error instance, to signal that the job did not complete successfully,
     * or with a result as second argument (e.g.: done(null, result);) when the job is successful.
     * Errors will be passed as a second argument to the "failed" event; results, as a second argument to the "completed" event.
     *
     * If, however, the callback signature does not contain the done argument,
     * a promise must be returned to signal job completion.
     * If the promise is rejected, the error will be passed as a second argument to the "failed" event.
     * If it is resolved, its value will be the "completed" event's second argument.
     *
     * @param name Bull will only call the handler if the job name matches
     * @param concurrency Bull will then call your handler in parallel respecting this maximum value.
     */
    process(
      name: string,
      concurrency: number,
      callback: ProcessCallbackFunction<T>
    ): Promise<void>;
    process(
      name: string,
      concurrency: number,
      callback: ProcessPromiseFunction<T>
    ): Promise<void>;
    process(name: string, concurrency: number, callback: string): Promise<void>;

    /* tslint:enable:unified-signatures */

    /**
     * Creates a new job and adds it to the queue.
     * If the queue is empty the job will be executed directly,
     * otherwise it will be placed in the queue and executed as soon as possible.
     */
    add(data: T, opts?: JobOptions): Promise<Job<T>>;

    /**
     * Creates a new named job and adds it to the queue.
     * If the queue is empty the job will be executed directly,
     * otherwise it will be placed in the queue and executed as soon as possible.
     */
    add(name: string, data: T, opts?: JobOptions): Promise<Job<T>>;

    /**
     * Adds an array of jobs to the queue.
     * If the queue is empty the jobs will be executed directly,
     * otherwise they will be placed in the queue and executed as soon as possible.
     * 'repeat' option is not supported in addBulk https://github.com/OptimalBits/bull/issues/1731
     */
    addBulk(
      jobs: Array<{
        name?: string | undefined;
        data: T;
        opts?: Omit<JobOptions, 'repeat'> | undefined;
      }>
    ): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that resolves when the queue is paused.
     *
     * A paused queue will not process new jobs until resumed, but current jobs being processed will continue until
     * they are finalized. The pause can be either global or local. If global, all workers in all queue instances
     * for a given queue will be paused. If local, just this worker will stop processing new jobs after the current
     * lock expires. This can be useful to stop a worker from taking new jobs prior to shutting down.
     *
     * If doNotWaitActive is true, pause will not wait for any active jobs to finish before resolving. Otherwise, pause
     * will wait for active jobs to finish. See Queue#whenCurrentJobsFinished for more information.
     *
     * Pausing a queue that is already paused does nothing.
     */
    pause(isLocal?: boolean, doNotWaitActive?: boolean): Promise<void>;

    /**
     * Returns a promise that resolves when the queue is resumed after being paused.
     *
     * The resume can be either local or global. If global, all workers in all queue instances for a given queue
     * will be resumed. If local, only this worker will be resumed. Note that resuming a queue globally will not
     * resume workers that have been paused locally; for those, resume(true) must be called directly on their
     * instances.
     *
     * Resuming a queue that is not paused does nothing.
     */
    resume(isLocal?: boolean): Promise<void>;

    /**
     * Returns a promise that resolves with a boolean if queue is paused
     */
    isPaused(isLocal?: boolean): Promise<boolean>;

    /**
     * Returns a promise that returns the number of jobs in the queue, waiting or paused.
     * Since there may be other processes adding or processing jobs, this value may be true only for a very small amount of time.
     */
    count(): Promise<number>;

    /**
     * Empties a queue deleting all the input lists and associated jobs.
     */
    empty(): Promise<void>;

    /**
     * Closes the underlying redis client. Use this to perform a graceful shutdown.
     *
     * `close` can be called from anywhere, with one caveat:
     * if called from within a job handler the queue won't close until after the job has been processed
     */
    close(doNotWaitJobs?: boolean): Promise<void>;

    /**
     * Returns the number of jobs per priority.
     */
    getCountsPerPriority(priorities: number[]): Promise<{
      [index: string]: number;
    }>;

    /**
     * Returns a promise that will return the job instance associated with the jobId parameter.
     * If the specified job cannot be located, the promise callback parameter will be set to null.
     */
    getJob(jobId: JobId): Promise<Job<T> | null>;

    /**
     * Returns a promise that will return an array with the waiting jobs between start and end.
     */
    getWaiting(start?: number, end?: number): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that will return an array with the active jobs between start and end.
     */
    getActive(start?: number, end?: number): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that will return an array with the delayed jobs between start and end.
     */
    getDelayed(start?: number, end?: number): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that will return an array with the completed jobs between start and end.
     */
    getCompleted(start?: number, end?: number): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that will return an array with the failed jobs between start and end.
     */
    getFailed(start?: number, end?: number): Promise<Array<Job<T>>>;

    /**
     * Returns JobInformation of repeatable jobs (ordered descending). Provide a start and/or an end
     * index to limit the number of results. Start defaults to 0, end to -1 and asc to false.
     */
    getRepeatableJobs(
      start?: number,
      end?: number,
      asc?: boolean
    ): Promise<JobInformation[]>;

    /**
     * ???
     */
    nextRepeatableJob(
      name: string,
      data: any,
      opts: JobOptions
    ): Promise<Job<T>>;

    /**
     * Removes a given repeatable job. The RepeatOptions and JobId needs to be the same as the ones
     * used for the job when it was added.
     */
    removeRepeatable(
      repeat: (CronRepeatOptions | EveryRepeatOptions) & {
        jobId?: JobId | undefined;
      }
    ): Promise<void>;

    /**
     * Removes a given repeatable job. The RepeatOptions and JobId needs to be the same as the ones
     * used for the job when it was added.
     *
     * name: The name of the to be removed job
     */
    removeRepeatable(
      name: string,
      repeat: (CronRepeatOptions | EveryRepeatOptions) & {
        jobId?: JobId | undefined;
      }
    ): Promise<void>;

    /**
     * Removes a given repeatable job by key.
     */
    removeRepeatableByKey(key: string): Promise<void>;

    /**
     * Returns a promise that will return an array of job instances of the given job statuses.
     * Optional parameters for range and ordering are provided.
     */
    getJobs(
      types: JobStatus[],
      start?: number,
      end?: number,
      asc?: boolean
    ): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that resolves to a Metrics object.
     */
    getMetrics(type: 'completed' | 'failed', start?: number, end?: number): Promise<{
      meta: {
        count: number;
        prevTS: number;
        prevCount: number;
      };
      data: number[];
      count: number;
    }>

    /**
     * Returns a promise that resolves to the next job in queue.
     */
    getNextJob(): Promise<Job<T> | undefined>;

    /**
     * Returns a object with the logs according to the start and end arguments. The returned count
     * value is the total amount of logs, useful for implementing pagination.
     */
    getJobLogs(
      jobId: JobId,
      start?: number,
      end?: number
    ): Promise<{ logs: string[]; count: number }>;

    /**
     * Returns a promise that resolves with the job counts for the given queue.
     */
    getJobCounts(): Promise<JobCounts>;

    /**
     * Returns a promise that resolves with the job counts for the given queue of the given job statuses.
     */
    getJobCountByTypes(types: JobStatus[] | JobStatus): Promise<number>;

    /**
     * Returns a promise that resolves with the quantity of completed jobs.
     */
    getCompletedCount(): Promise<number>;

    /**
     * Returns a promise that resolves with the quantity of failed jobs.
     */
    getFailedCount(): Promise<number>;

    /**
     * Returns a promise that resolves with the quantity of delayed jobs.
     */
    getDelayedCount(): Promise<number>;

    /**
     * Returns a promise that resolves with the quantity of waiting jobs.
     */
    getWaitingCount(): Promise<number>;

    /**
     * Returns a promise that resolves with the quantity of paused jobs.
     */
    getPausedCount(): Promise<number>;

    /**
     * Returns a promise that resolves with the quantity of active jobs.
     */
    getActiveCount(): Promise<number>;

    /**
     * Returns a promise that resolves to the quantity of repeatable jobs.
     */
    getRepeatableCount(): Promise<number>;

    /**
     * Tells the queue remove all jobs created outside of a grace period in milliseconds.
     * You can clean the jobs with the following states: completed, wait (typo for waiting), active, delayed, and failed.
     * @param grace Grace period in milliseconds.
     * @param status Status of the job to clean. Values are completed, wait, active, delayed, and failed. Defaults to completed.
     * @param limit Maximum amount of jobs to clean per call. If not provided will clean all matching jobs.
     */
    clean(
      grace: number,
      status?: JobStatusClean,
      limit?: number
    ): Promise<Array<Job<T>>>;

    /**
     * Returns a promise that resolves to a Metrics object.
     * @param type Job metric type either 'completed' or 'failed'
     * @param start Start point of the metrics, where 0 is the newest point to be returned.
     * @param end End point of the metrics, where -1 is the oldest point to be returned.
     * @returns - Returns an object with queue metrics.
     */
    getMetrics(
      type: 'completed' | 'failed',
      start?: number,
      end?: number
    ): Promise<{
      meta: {
        count: number;
        prevTS: number;
        prevCount: number;
      };
      data: number[];
      count: number;
    }>;

    /**
     * Returns a promise that marks the start of a transaction block.
     */
    multi(): Redis.Pipeline;

    /**
     * Returns the queue specific key.
     */
    toKey(queueType: string): string;

    /**
     * Completely destroys the queue and all of its contents irreversibly.
     * @param ops.force Obliterate the queue even if there are active jobs
     */
    obliterate(ops?: { force: boolean }): Promise<void>;

    /**
     * Listens to queue events
     */
    on(event: string, callback: (...args: any[]) => void): this;

    /**
     * An error occured
     */
    on(event: 'error', callback: ErrorEventCallback): this;

    /**
     * A Job is waiting to be processed as soon as a worker is idling.
     */
    on(event: 'waiting', callback: WaitingEventCallback): this;

    /**
     * A job has started. You can use `jobPromise.cancel()` to abort it
     */
    on(event: 'active', callback: ActiveEventCallback<T>): this;

    /**
     * A job has been marked as stalled.
     * This is useful for debugging job workers that crash or pause the event loop.
     */
    on(event: 'stalled', callback: StalledEventCallback<T>): this;

    /**
     * A job's progress was updated
     */
    on(event: 'progress', callback: ProgressEventCallback<T>): this;

    /**
     * A job successfully completed with a `result`
     */
    on(event: 'completed', callback: CompletedEventCallback<T>): this;

    /**
     * A job failed with `err` as the reason
     */
    on(event: 'failed', callback: FailedEventCallback<T>): this;

    /**
     * The queue has been paused
     */
    on(event: 'paused', callback: EventCallback): this;

    /**
     * The queue has been resumed
     */
    on(event: 'resumed', callback: EventCallback): this; // tslint:disable-line unified-signatures

    /**
     * A job successfully removed.
     */
    on(event: 'removed', callback: RemovedEventCallback<T>): this;

    /**
     * Old jobs have been cleaned from the queue.
     * `jobs` is an array of jobs that were removed, and `type` is the type of those jobs.
     *
     * @see Queue#clean() for details
     */
    on(event: 'cleaned', callback: CleanedEventCallback<T>): this;

    /**
     * Emitted every time the queue has processed all the waiting jobs
     * (even if there can be some delayed jobs not yet processed)
     */
    on(event: 'drained', callback: EventCallback): this; // tslint:disable-line unified-signatures

    /**
     * Array of Redis clients the queue uses
     */
    clients: Redis.Redis[];

    /**
     * Set clientName to Redis.client
     */
    setWorkerName(): Promise<any>;

    /**
     * Returns array of workers that are currently working on this queue.
     */
    getWorkers(): Promise<{ [index: string]: string }[]>;

    /**
     * Returns Queue name in base64 encoded format
     */
    base64Name(): string;

    /**
     * Returns Queue name with keyPrefix (default: 'bull')
     */
    clientName(): string;

    /**
     * Returns Redis clients array which belongs to current Queue from string with all redis clients
     *
     * @param list String with all redis clients
     */
    parseClientList(list: string): { [index: string]: string }[][];

    /**
     * Returns a promise that resolves when active jobs are finished
     */
    whenCurrentJobsFinished(): Promise<void>;

    /**
     * Removes all the jobs which jobId matches the given pattern. The pattern must follow redis glob-style pattern
     * (syntax)[redis.io/commands/keys]
     */
    removeJobs(pattern: string): Promise<void>;
  }

  type EventCallback = () => void;

  type ErrorEventCallback = (error: Error) => void;

  interface JobPromise {
    /**
     * Abort this job
     */
    cancel(): void;
  }

  type ActiveEventCallback<T = any> = (
    job: Job<T>,
    jobPromise?: JobPromise
  ) => void;

  type StalledEventCallback<T = any> = (job: Job<T>) => void;

  type ProgressEventCallback<T = any> = (job: Job<T>, progress: any) => void;

  type CompletedEventCallback<T = any> = (job: Job<T>, result: any) => void;

  type FailedEventCallback<T = any> = (job: Job<T>, error: Error) => void;

  type CleanedEventCallback<T = any> = (
    jobs: Array<Job<T>>,
    status: JobStatusClean
  ) => void;

  type RemovedEventCallback<T = any> = (job: Job<T>) => void;

  type WaitingEventCallback = (jobId: JobId) => void;
}

export = Bull;
