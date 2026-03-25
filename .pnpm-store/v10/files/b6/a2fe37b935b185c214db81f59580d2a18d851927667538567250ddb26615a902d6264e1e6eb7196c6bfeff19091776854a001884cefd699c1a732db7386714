"use strict";
/* eslint-disable func-names */
/* eslint-disable sonarjs/no-nested-functions */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var assert = require('assert');
var removeSlash = require('remove-trailing-slash');
var axios = require('axios');
var axiosRetry = require('axios-retry').default;
var ms = require('ms');
var uuid = require('uuid').v4;
var md5 = require('md5');
var isString = require('lodash.isstring');
var cloneDeep = require('lodash.clonedeep');
var zlib = require('zlib');
var looselyValidate = require('./loosely-validate-event');
var Logger = require('./Logger').Logger;
var LOG_LEVEL_MAP = require('./Logger').LOG_LEVEL_MAP;
var version = require('../package.json').version;
var gzip = zlib.gzipSync;
var setImmediate = global.setImmediate || process.nextTick.bind(process);
var noop = function () { };
var JOB_DATA_VERSION = 3;
var Analytics = /** @class */ (function () {
    /**
     * Initialize a new `Analytics` with your RudderStack source's `writeKey` and an
     * optional dictionary of `options`.
     *
     * @param {String} writeKey
     * @param {Object} [options] (optional)
     *   @property {Number} [flushAt] (default: 20)
     *   @property {Number} [flushInterval] (default: 10000)
     *   @property {Number} [maxQueueSize] (default: 500 kb)
     *   @property {Number} [maxInternalQueueSize] (default: 20000)
     *   @property {String} [logLevel] (default: 'info')
     *   @property {String} [dataPlaneUrl] (default: 'https://hosted.rudderlabs.com')
     *   @property {String} [host] (default: 'https://hosted.rudderlabs.com')
     *   @property {String} [path] (default: '/v1/batch')
     *   @property {Boolean} [enable] (default: true)
     *   @property {Object} [axiosConfig] (optional)
     *   @property {Object} [axiosInstance] (default: axios.create(options.axiosConfig))
     *   @property {Object} [axiosRetryConfig] (optional)
     *   @property {Number} [retryCount] (default: 3)
     *   @property {Function} [errorHandler] (optional)
     *   @property {Boolean} [gzip] (default: true)
     */
    function Analytics(writeKey, options) {
        var loadOptions = options || {};
        var dataPlaneUrl = loadOptions.dataPlaneUrl, host = loadOptions.host, path = loadOptions.path, axiosConfig = loadOptions.axiosConfig, axiosRetryConfig = loadOptions.axiosRetryConfig, timeout = loadOptions.timeout, flushAt = loadOptions.flushAt, flushInterval = loadOptions.flushInterval, maxQueueSize = loadOptions.maxQueueSize, maxInternalQueueSize = loadOptions.maxInternalQueueSize, errorHandler = loadOptions.errorHandler, logLevel = loadOptions.logLevel, enable = loadOptions.enable, retryCount = loadOptions.retryCount;
        var axiosInstance = loadOptions.axiosInstance;
        assert(writeKey, "You must pass your RudderStack project's write key.");
        this.queue = [];
        this.pQueue = undefined;
        this.pQueueInitialized = false;
        this.pQueueOpts = undefined;
        this.pJobOpts = {};
        // Store callbacks in memory by job ID (v3.0.0 - security fix)
        // NOTE: Callbacks are NOT persisted to Redis. They will be lost on process restart.
        // This is intentional to prevent serializing functions (RCE vulnerability).
        this.pCallbacksMap = new Map();
        this.writeKey = writeKey;
        this.host = removeSlash(dataPlaneUrl || host || 'https://hosted.rudderlabs.com');
        this.path = removeSlash(path || '/v1/batch');
        if (axiosInstance == null) {
            axiosInstance = axios.create(axiosConfig);
        }
        this.axiosInstance = axiosInstance;
        this.timeout = timeout || false;
        this.flushAt = Math.max(flushAt, 1) || 20;
        this.maxQueueSize = maxQueueSize || 1024 * 450; // 500kb is the API limit, if we approach the limit i.e., 450kb, we'll flush
        this.maxInternalQueueSize = maxInternalQueueSize || 20000;
        this.flushInterval = flushInterval || 10000;
        this.flushed = false;
        this.errorHandler = errorHandler;
        this.pendingFlush = null;
        this.logLevel = logLevel || 'info';
        this.gzip = true;
        if (loadOptions.gzip === false) {
            this.gzip = false;
        }
        Object.defineProperty(this, 'enable', {
            configurable: false,
            writable: false,
            enumerable: true,
            value: typeof enable === 'boolean' ? enable : true,
        });
        this.logger = new Logger(LOG_LEVEL_MAP[this.logLevel]);
        if (retryCount !== 0) {
            axiosRetry(this.axiosInstance, __assign(__assign({ retries: retryCount || 3, retryDelay: axiosRetry.exponentialDelay }, axiosRetryConfig), { 
                // retryCondition is below optional config to ensure it does not get overridden
                retryCondition: this._isErrorRetryable.bind(this) }));
        }
    }
    Analytics.prototype._deserializeJobData = function (job) {
        var _a;
        try {
            if (((_a = job.data) === null || _a === void 0 ? void 0 : _a.version) === JOB_DATA_VERSION) {
                return JSON.parse(job.data.eventData);
            }
            this.logger.error('Job data format is not supported. Please drain your Redis queue before upgrading to v3.x.x.');
            // <= v2.x jobs are not supported
        }
        catch (error) {
            this.logger.error('Cannot parse the job data.', error);
        }
        return undefined;
    };
    Analytics.prototype.addPersistentQueueProcessor = function () {
        var _this = this;
        var _isErrorRetryable = this._isErrorRetryable.bind(this);
        var rdone = function (callbacks, err) {
            callbacks.forEach(function (callback_) {
                callback_(err);
            });
        };
        var payloadQueue = this.pQueue;
        var jobOpts = this.pJobOpts;
        this.pQueue.on('failed', function (job, error) {
            var jobData = _this._deserializeJobData(job);
            if (jobData) {
                _this.logger.error("job : ".concat(jobData.description, " ").concat(error));
            }
        });
        // tapping on queue events
        this.pQueue.on('completed', function (job, result) {
            var jobData = _this._deserializeJobData(job);
            if (jobData) {
                result = result || 'completed';
                _this.logger.debug("job : ".concat(jobData.description, " ").concat(result));
            }
        });
        this.pQueue.on('stalled', function (job) {
            var jobData = _this._deserializeJobData(job);
            if (jobData) {
                _this.logger.warn("job : ".concat(jobData.description, " is stalled..."));
            }
        });
        this.pQueue.process(function (job, done) {
            // job failed for maxAttempts or more times, push to failed queue
            // starting with attempt = 0
            var maxAttempts = jobOpts.maxAttempts || 10;
            var jobData = _this._deserializeJobData(job);
            if (!jobData) {
                done(new Error('Skipping the job because the job data could not be parsed.'));
                return;
            }
            // Retrieve callbacks from in-memory map
            // NOTE: Callbacks will be empty if process restarted, as they are stored in-memory only.
            // This is a security trade-off to prevent serializing functions (RCE vulnerability).
            // Users will not receive callback notifications for jobs in-flight during restart.
            var callbacks = _this.pCallbacksMap.get(jobData.jobId) || [];
            if (callbacks.length === 0 && jobData.attempts === 0) {
                _this.logger.warn("No callbacks found for job ".concat(jobData.jobId, ". This may indicate the process restarted with jobs in Redis queue."));
            }
            if (jobData.attempts >= maxAttempts) {
                // Clean up callbacks after max attempts exceeded
                _this.pCallbacksMap.delete(jobData.jobId);
                var error = new Error("job : ".concat(jobData.description, " pushed to failed queue after attempts ").concat(jobData.attempts, " skipping further retries..."));
                rdone(callbacks, error);
                done(error);
            }
            else {
                // process the job after exponential delay, if it's the 0th attempt, setTimeout will fire immediately
                // max delay is 30 sec, it is mostly in sync with a bull queue job max lock time
                var self_1 = _this;
                setTimeout(function (axiosInstance, host, path, gzipOption) {
                    var req = jobData.request;
                    req.data.sentAt = new Date();
                    if (gzipOption) {
                        req.data = gzip(JSON.stringify(req.data));
                        req.headers['Content-Encoding'] = 'gzip';
                    }
                    // if request succeeded, mark the job done and move to completed
                    axiosInstance
                        .post("".concat(host).concat(path), req.data, req)
                        // eslint-disable-next-line no-unused-vars
                        .then(function (response) {
                        // Clean up callbacks after successful processing
                        self_1.pCallbacksMap.delete(jobData.jobId);
                        rdone(callbacks);
                        done();
                    })
                        .catch(function (err) {
                        // check if request is retryable
                        var isRetryable = _isErrorRetryable(err);
                        self_1.logger.debug("Request is ".concat(isRetryable ? '' : 'not', " to be retried"));
                        if (isRetryable) {
                            var attempts_1 = jobData.attempts, description_1 = jobData.description, jobId_1 = jobData.jobId;
                            jobData.attempts = attempts_1 + 1;
                            self_1.logger.debug("Request retry attempt ".concat(attempts_1));
                            // increment attempt
                            // add a new job to queue in lifo
                            // Callbacks remain in map for retry (same jobId)
                            // if able to add, mark the earlier job done with push to completed with a msg
                            // if add to redis queue gives exception, not catching it
                            // in case of redis queue error, mark the job as failed ? i.e add the catch block in below promise ?
                            payloadQueue
                                .add(self_1._getDataForPersistenceQueue(jobData), { lifo: true })
                                // eslint-disable-next-line no-unused-vars
                                .then(function (pushedJob) {
                                done(null, "job : ".concat(description_1, " failed for attempt ").concat(attempts_1, " ").concat(err));
                            })
                                .catch(function (error) {
                                self_1.logger.error("failed to requeue job ".concat(description_1));
                                // Clean up callbacks after requeue failure
                                self_1.pCallbacksMap.delete(jobId_1);
                                rdone(callbacks, error);
                                done(error);
                            });
                        }
                        else {
                            // if not retryable, mark the job failed and to failed queue for user to retry later
                            // Clean up callbacks after non-retryable failure
                            self_1.pCallbacksMap.delete(jobData.jobId);
                            rdone(callbacks, err);
                            done(err);
                        }
                    });
                }, Math.min(30000, Math.pow(2, jobData.attempts) * 1000), _this.axiosInstance, _this.host, _this.path, _this.gzip);
            }
        });
    };
    /**
     *
     * @param {Object} queueOpts
     * @param {String=} queueOpts.queueName
     * @param {String=} queueOpts.prefix
     * @param {Boolean=} queueOpts.isMultiProcessor
     * @param {Object} queueOpts.redisOpts
     * @param {Number=} queueOpts.redisOpts.port
     * @param {String=} queueOpts.redisOpts.host
     * @param {Number=} queueOpts.redisOpts.db
     * @param {String=} queueOpts.redisOpts.password
     * @param {Object=} queueOpts.jobOpts
     * @param {Number} queueOpts.jobOpts.maxAttempts
     * {
     *    queueName: string = rudderEventsQueue,
     *    prefix: string = rudder
     *    isMultiProcessor: booloean = false
     *    redisOpts: {
     *      port?: number = 6379;
     *      host?: string = localhost;
     *      db?: number = 0;
     *      password?: string;
     *    },
     *    jobOpts: {
     *      maxAttempts: number = 10
     *    }
     * }
     * @param {*} callback
     *  All error paths from redis and queue will give exception, so they are non-retryable from SDK perspective
     *  The queue may not function for unhandled promise rejections
     *  this error callback is called when the SDK wants the user to retry
     */
    Analytics.prototype.createPersistenceQueue = function (queueOpts, callback) {
        var _this = this;
        if (this.pQueueInitialized) {
            this.logger.debug('a persistent queue is already initialized, skipping...');
            return;
        }
        // eslint-disable-next-line import/no-extraneous-dependencies,global-require
        var Queue = require('bull');
        this.pQueueOpts = queueOpts || {};
        this.pQueueOpts.isMultiProcessor = this.pQueueOpts.isMultiProcessor || false;
        if (!this.pQueueOpts.redisOpts) {
            throw new Error('redis connection parameters not present. Cannot make a persistent queue');
        }
        this.pJobOpts = this.pQueueOpts.jobOpts || {};
        this.pQueue = new Queue(this.pQueueOpts.queueName || 'rudderEventsQueue', {
            redis: this.pQueueOpts.redisOpts,
            prefix: this.pQueueOpts.prefix ? "{".concat(this.pQueueOpts.prefix, "}") : '{rudder}',
        });
        this.logger.debug("isMultiProcessor: ".concat(this.pQueueOpts.isMultiProcessor));
        this.pQueue
            .isReady()
            .then(function () {
            // at startup get active job, remove it, then add it in front of queue to retried first
            // then add the queue processor
            // if queue is isMultiProcessor, skip the above and add the queue processor
            if (_this.pQueueOpts.isMultiProcessor) {
                _this.addPersistentQueueProcessor();
                _this.pQueueInitialized = true;
                callback();
            }
            else {
                _this.pQueue
                    .getActive()
                    .then(function (jobs) {
                    _this.logger.debug('success getting active jobs');
                    if (jobs.length === 0) {
                        _this.logger.debug('there are no active jobs while starting up queue');
                        _this.addPersistentQueueProcessor();
                        _this.logger.debug('success adding process');
                        _this.pQueueInitialized = true;
                        callback();
                    }
                    else {
                        // since there is only once process, the count of active jobs will be 1 at max
                        // moving active job is important as this job doesn't have a process function
                        // and will later be retried which will mess event ordering
                        if (jobs.length > 1) {
                            _this.logger.debug('number of active jobs at starting up queue > 1 ');
                            callback(new Error('queue has more than 1 active job, move them to failed and try again'));
                            return;
                        }
                        _this.logger.debug("number of active jobs at starting up queue = ".concat(jobs.length));
                        jobs.forEach(function (job) {
                            job
                                .remove()
                                .then(function () {
                                _this.logger.debug('success removed active job');
                                var jobData = _this._deserializeJobData(job);
                                if (!jobData) {
                                    _this.logger.error('Cannot parse the job data. Skipping the job.');
                                    return;
                                }
                                jobData.attempts = 0;
                                // Note: callbacks will be empty for requeued jobs after restart
                                _this.pQueue
                                    .add(_this._getDataForPersistenceQueue(jobData), { lifo: true })
                                    // eslint-disable-next-line no-unused-vars
                                    .then(function (removedJob) {
                                    _this.logger.debug('success adding removed job back to queue');
                                    _this.addPersistentQueueProcessor();
                                    _this.logger.debug('success adding process');
                                    _this.pQueueInitialized = true;
                                    callback();
                                });
                            })
                                .catch(function (error) {
                                _this.logger.error('failed to remove active job');
                                callback(error);
                            });
                        });
                    }
                })
                    .catch(function (error) {
                    _this.logger.error('failed getting active jobs');
                    callback(error);
                });
            }
        })
            .catch(function (error) {
            _this.logger.error('queue not ready');
            callback(error);
        });
    };
    // eslint-disable-next-line class-methods-use-this
    Analytics.prototype._getDataForPersistenceQueue = function (jobData) {
        return {
            version: JOB_DATA_VERSION,
            eventData: JSON.stringify(jobData),
        };
    };
    Analytics.prototype._validate = function (message, type) {
        try {
            looselyValidate(message, type);
        }
        catch (e) {
            if (e.message === 'Your message must be < 32kb.') {
                this.logger.info('Your message must be < 32kb. This is currently surfaced as a warning. Please update your code', message);
                return;
            }
            throw e;
        }
    };
    /**
     * Send an identify `message`.
     *
     * @param {Object} message
     * @param {String=} message.userId (optional)
     * @param {String=} message.anonymousId (optional)
     * @param {Object=} message.context (optional)
     * @param {Object=} message.traits (optional)
     * @param {Object=} message.integrations (optional)
     * @param {Date=} message.timestamp (optional)
     * @param {Function=} callback (optional)
     * @return {Analytics}
     */
    Analytics.prototype.identify = function (message, callback) {
        this._validate(message, 'identify');
        this.enqueue('identify', message, callback);
        return this;
    };
    /**
     * Send a group `message`.
     *
     * @param {Object} message
     * @param {String} message.groupId
     * @param {String=} message.userId (optional)
     * @param {String=} message.anonymousId (optional)
     * @param {Object=} message.context (optional)
     * @param {Object=} message.traits (optional)
     * @param {Object=} message.integrations (optional)
     * @param {Date=} message.timestamp (optional)
     * @param {Function=} callback (optional)
     * @return {Analytics}
     */
    Analytics.prototype.group = function (message, callback) {
        this._validate(message, 'group');
        this.enqueue('group', message, callback);
        return this;
    };
    /**
     * Send a track `message`.
     *
     * @param {Object} message
     * @param {String} message.event
     * @param {String=} message.userId (optional)
     * @param {String=} message.anonymousId (optional)
     * @param {Object=} message.context (optional)
     * @param {Object=} message.properties (optional)
     * @param {Object=} message.integrations (optional)
     * @param {Date=} message.timestamp (optional)
     * @param {Function=} callback (optional)
     * @return {Analytics}
     */
    Analytics.prototype.track = function (message, callback) {
        this._validate(message, 'track');
        this.enqueue('track', message, callback);
        return this;
    };
    /**
     * Send a page `message`.
     *
     * @param {Object} message
     * @param {String} message.name
     * @param {String=} message.userId (optional)
     * @param {String=} message.anonymousId (optional)
     * @param {Object=} message.context (optional)
     * @param {Object=} message.properties (optional)
     * @param {Object=} message.integrations (optional)
     * @param {Date=} message.timestamp (optional)
     * @param {Function=} callback (optional)
     * @return {Analytics}
     */
    Analytics.prototype.page = function (message, callback) {
        this._validate(message, 'page');
        this.enqueue('page', message, callback);
        return this;
    };
    /**
     * Send a screen `message`.
     *
     * @param {Object} message
     * @param {Function} [callback] (optional)
     * @return {Analytics}
     */
    Analytics.prototype.screen = function (message, callback) {
        this._validate(message, 'screen');
        this.enqueue('screen', message, callback);
        return this;
    };
    /**
     * Send an alias `message`.
     *
     * @param {Object} message
     * @param {String} message.previousId
     * @param {String=} message.userId (optional)
     * @param {String=} message.anonymousId (optional)
     * @param {Object=} message.context (optional)
     * @param {Object=} message.properties (optional)
     * @param {Object=} message.integrations (optional)
     * @param {Date=} message.timestamp (optional)
     * @param {Function=} callback (optional)
     * @return {Analytics}
     */
    Analytics.prototype.alias = function (message, callback) {
        this._validate(message, 'alias');
        this.enqueue('alias', message, callback);
        return this;
    };
    /**
     * Add a `message` of type `type` to the queue and
     * check whether it should be flushed.
     *
     * @param {String} type
     * @param {Object} message
     * @param {Function} [callback] (optional)
     * @api private
     */
    Analytics.prototype.enqueue = function (type, message, callback) {
        if (this.queue.length >= this.maxInternalQueueSize) {
            this.logger.error("not adding events for processing as queue size ".concat(this.queue.length, " >= than max configuration ").concat(this.maxInternalQueueSize));
            return;
        }
        // Clone the incoming message object
        // before altering the data
        var lMessage = cloneDeep(message);
        callback = callback || noop;
        if (!this.enable) {
            // eslint-disable-next-line consistent-return
            return setImmediate(callback);
        }
        if (type === 'identify' && lMessage.traits) {
            if (!lMessage.context) {
                lMessage.context = {};
            }
            lMessage.context.traits = lMessage.traits;
        }
        lMessage = __assign({}, lMessage);
        lMessage.type = type;
        lMessage.context = __assign(__assign({}, lMessage.context), { library: {
                name: 'analytics-node',
                version: version,
            } });
        lMessage.channel = 'server';
        lMessage._metadata = __assign({ nodeVersion: process.versions.node }, lMessage._metadata);
        if (!lMessage.originalTimestamp) {
            lMessage.originalTimestamp = new Date();
        }
        if (!lMessage.messageId) {
            // Previously `node-${md5(JSON.stringify(lMessage))}-${uuid()}` this was being used
            lMessage.messageId = uuid();
        }
        // Historically this library has accepted strings and numbers as IDs.
        // However, our spec only allows strings. To avoid breaking compatibility,
        // we'll coerce these to strings if they aren't already.
        if (lMessage.anonymousId && !isString(lMessage.anonymousId)) {
            lMessage.anonymousId = JSON.stringify(lMessage.anonymousId);
        }
        if (lMessage.userId && !isString(lMessage.userId)) {
            lMessage.userId = JSON.stringify(lMessage.userId);
        }
        this.queue.push({ message: lMessage, callback: callback });
        if (!this.flushed) {
            this.flushed = true;
            this.flush();
            return;
        }
        var hasReachedFlushAt = this.queue.length >= this.flushAt;
        var hasReachedQueueSize = this.queue.reduce(function (acc, item) { return acc + JSON.stringify(item).length; }, 0) >= this.maxQueueSize;
        if (hasReachedFlushAt || hasReachedQueueSize) {
            this.logger.debug('flushAt reached, trying flush...');
            this.flush();
            return;
        }
        this.setupFlushTimer();
    };
    Analytics.prototype.setupFlushTimer = function () {
        if (this.flushInterval && !this.flushTimer) {
            this.logger.debug('no existing flush timer, creating new one');
            this.flushTimer = setTimeout(this.flush.bind(this), this.flushInterval);
        }
    };
    /**
     * Flush the current queue
     *
     * @param {Function} [callback] (optional)
     */
    // eslint-disable-next-line consistent-return, sonarjs/cognitive-complexity
    Analytics.prototype.flush = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            var err_1, items, callbacks, messages, data, done, headers, req, request, jobId_2, eventData;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // check if earlier flush was pushed to queue
                        this.logger.debug('in flush');
                        this.state = 'running';
                        callback = callback || noop;
                        if (!this.enable) {
                            setImmediate(callback);
                            return [2 /*return*/, Promise.resolve()];
                        }
                        if (this.timer) {
                            this.logger.debug('cancelling existing timer...');
                            clearTimeout(this.timer);
                            this.timer = null;
                        }
                        if (this.flushTimer) {
                            this.logger.debug('cancelling existing flushTimer...');
                            clearTimeout(this.flushTimer);
                            this.flushTimer = null;
                        }
                        if (this.queue.length === 0) {
                            if (this.pendingFlush) {
                                this.logger.debug('queue is empty, but a flush already exists');
                                // We attach the callback to the end of the chain to support a caller calling `flush()` multiple times when the queue is empty.
                                this.pendingFlush = this.pendingFlush.then(function () {
                                    callback();
                                    return Promise.resolve();
                                });
                                return [2 /*return*/, this.pendingFlush];
                            }
                            this.logger.debug('queue is empty, nothing to flush');
                            setImmediate(callback);
                            return [2 /*return*/, Promise.resolve()];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        if (!this.pendingFlush) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.pendingFlush];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        this.pendingFlush = null;
                        throw err_1;
                    case 5:
                        items = this.queue.splice(0, this.flushAt);
                        // Do not proceed in case the items array is empty
                        if (items.length === 0) {
                            setImmediate(callback);
                            return [2 /*return*/, Promise.resolve()];
                        }
                        callbacks = items.map(function (item) { return item.callback; });
                        messages = items.map(function (item) {
                            // if someone mangles directly with queue
                            if (typeof item.message === 'object') {
                                item.message.sentAt = new Date();
                            }
                            return item.message;
                        });
                        data = {
                            batch: messages,
                            timestamp: new Date(),
                            sentAt: new Date(),
                        };
                        done = function (err) {
                            setImmediate(function () {
                                callbacks.forEach(function (eventCallback) { return eventCallback(err, data); });
                                callback(err, data);
                            });
                        };
                        headers = {};
                        if (typeof window === 'undefined') {
                            headers['user-agent'] = "analytics-node/".concat(version);
                        }
                        // If gzip feature is enabled compress the request payload
                        // Note: the server version should be 1.4 and above
                        if (this.gzip && !this.pQueue) {
                            data = gzip(JSON.stringify(data));
                            headers['Content-Encoding'] = 'gzip';
                        }
                        req = {
                            auth: {
                                username: this.writeKey,
                            },
                            headers: headers,
                        };
                        if (this.timeout) {
                            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout;
                        }
                        if (this.pQueue && this.pQueueInitialized) {
                            request = __assign(__assign({}, req), { data: data });
                            jobId_2 = uuid();
                            eventData = {
                                jobId: jobId_2,
                                description: "node-".concat(md5(JSON.stringify(request)), "-").concat(jobId_2),
                                request: request,
                                attempts: 0,
                            };
                            // Store callbacks in memory map (v3.0.0 security fix - no more serialize-javascript)
                            this.pCallbacksMap.set(jobId_2, callbacks);
                            this.pQueue
                                .add(this._getDataForPersistenceQueue(eventData))
                                // eslint-disable-next-line no-unused-vars
                                .then(function (pushedJob) {
                                _this.logger.debug('pushed job to queue');
                                _this.timer = setTimeout(_this.flush.bind(_this), _this.flushInterval);
                                _this.state = 'idle';
                            })
                                .catch(function (error) {
                                _this.timer = setTimeout(_this.flush.bind(_this), _this.flushInterval);
                                _this.queue.unshift(items);
                                _this.state = 'idle';
                                // Clean up callbacks if push to queue failed
                                _this.pCallbacksMap.delete(jobId_2);
                                _this.logger.error("failed to push to redis queue, in-memory queue size: ".concat(_this.queue.length));
                                throw error;
                            });
                        }
                        else if (!this.pQueue) {
                            this.pendingFlush = this.axiosInstance
                                .post("".concat(this.host).concat(this.path), data, req)
                                .then(function () {
                                done();
                                return Promise.resolve(data);
                            })
                                .catch(function (err) {
                                _this.logger.error("Error: ".concat(err.response ? err.response.statusText : err.code));
                                var isDuringTestExecution = err &&
                                    err.response &&
                                    err.response.status === 404 &&
                                    process.env.AVA_MODE_ON &&
                                    _this.path === '/v1/batch' &&
                                    !_this.timeout;
                                if (typeof _this.errorHandler === 'function') {
                                    done(isDuringTestExecution ? undefined : err);
                                    return _this.errorHandler(err);
                                }
                                // Retry invalid write key while during unit test run. Server responds with 404 status for invalid key
                                if (isDuringTestExecution) {
                                    done();
                                    // eslint-disable-next-line consistent-return
                                    return;
                                }
                                if (err.response) {
                                    var error = new Error(err.response.statusText);
                                    done(error);
                                    throw error;
                                }
                                done(err);
                                throw err;
                            });
                            return [2 /*return*/, this.pendingFlush];
                        }
                        else {
                            throw new Error('persistent queue not ready');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Analytics.prototype._isErrorRetryable = function (error) {
        if (error.response) {
            this.logger.error("Response error status: ".concat(error.response.status, "\nResponse error code: ").concat(error.code));
        }
        else {
            this.logger.error("Response error code: ".concat(error.code));
        }
        // Retry Network Errors.
        if (axiosRetry.isNetworkError(error)) {
            return true;
        }
        if (!error.response) {
            // Cannot determine if the request can be retried
            return false;
        }
        // Retry Server Errors (5xx).
        if (error.response.status >= 500 && error.response.status <= 599) {
            return true;
        }
        // Retry if rate limited.
        return error.response.status === 429;
    };
    return Analytics;
}());
module.exports = Analytics;
//# sourceMappingURL=index.js.map