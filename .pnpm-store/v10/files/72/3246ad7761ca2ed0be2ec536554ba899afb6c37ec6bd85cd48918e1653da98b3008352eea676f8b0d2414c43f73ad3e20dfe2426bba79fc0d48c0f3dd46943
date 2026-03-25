export = Analytics;
declare class Analytics {
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
    constructor(writeKey: string, options?: Object);
    queue: any[];
    pQueue: import("bull").Queue<any> | undefined;
    pQueueInitialized: boolean;
    pQueueOpts: {
        queueName?: string | undefined;
        prefix?: string | undefined;
        isMultiProcessor?: boolean | undefined;
        redisOpts: {
            port?: number | undefined;
            host?: string | undefined;
            db?: number | undefined;
            password?: string | undefined;
        };
        jobOpts?: Object | undefined;
    } | undefined;
    pJobOpts: {};
    pCallbacksMap: Map<any, any>;
    writeKey: string;
    host: string;
    path: string;
    axiosInstance: any;
    timeout: any;
    flushAt: number;
    maxQueueSize: any;
    maxInternalQueueSize: any;
    flushInterval: any;
    flushed: boolean;
    errorHandler: any;
    pendingFlush: any;
    logLevel: any;
    gzip: boolean;
    logger: Logger;
    _deserializeJobData(job: any): any;
    addPersistentQueueProcessor(): void;
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
    createPersistenceQueue(queueOpts: {
        queueName?: string | undefined;
        prefix?: string | undefined;
        isMultiProcessor?: boolean | undefined;
        redisOpts: {
            port?: number | undefined;
            host?: string | undefined;
            db?: number | undefined;
            password?: string | undefined;
        };
        jobOpts?: Object | undefined;
    }, callback: any): void;
    _getDataForPersistenceQueue(jobData: any): {
        version: number;
        eventData: string;
    };
    _validate(message: any, type: any): void;
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
    identify(message: {
        userId?: string | undefined;
        anonymousId?: string | undefined;
        context?: Object | undefined;
        traits?: Object | undefined;
        integrations?: Object | undefined;
        timestamp?: Date | undefined;
    }, callback?: Function | undefined): Analytics;
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
    group(message: {
        groupId: string;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        context?: Object | undefined;
        traits?: Object | undefined;
        integrations?: Object | undefined;
        timestamp?: Date | undefined;
    }, callback?: Function | undefined): Analytics;
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
    track(message: {
        event: string;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        context?: Object | undefined;
        properties?: Object | undefined;
        integrations?: Object | undefined;
        timestamp?: Date | undefined;
    }, callback?: Function | undefined): Analytics;
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
    page(message: {
        name: string;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        context?: Object | undefined;
        properties?: Object | undefined;
        integrations?: Object | undefined;
        timestamp?: Date | undefined;
    }, callback?: Function | undefined): Analytics;
    /**
     * Send a screen `message`.
     *
     * @param {Object} message
     * @param {Function} [callback] (optional)
     * @return {Analytics}
     */
    screen(message: Object, callback?: Function): Analytics;
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
    alias(message: {
        previousId: string;
        userId?: string | undefined;
        anonymousId?: string | undefined;
        context?: Object | undefined;
        properties?: Object | undefined;
        integrations?: Object | undefined;
        timestamp?: Date | undefined;
    }, callback?: Function | undefined): Analytics;
    /**
     * Add a `message` of type `type` to the queue and
     * check whether it should be flushed.
     *
     * @param {String} type
     * @param {Object} message
     * @param {Function} [callback] (optional)
     * @api private
     */
    enqueue(type: string, message: Object, callback?: Function): void;
    setupFlushTimer(): void;
    flushTimer: NodeJS.Timeout | null | undefined;
    /**
     * Flush the current queue
     *
     * @param {Function} [callback] (optional)
     */
    flush(callback?: Function): Promise<any>;
    state: string | undefined;
    timer: NodeJS.Timeout | null | undefined;
    _isErrorRetryable(error: any): boolean;
}
import Logger_1 = require("./Logger");
import Logger = Logger_1.Logger;
//# sourceMappingURL=index.d.ts.map