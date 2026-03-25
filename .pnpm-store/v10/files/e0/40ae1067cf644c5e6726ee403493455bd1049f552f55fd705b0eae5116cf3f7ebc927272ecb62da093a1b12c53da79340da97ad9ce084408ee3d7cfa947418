/**
 * Represents a generic object in the APIs
 * Use for parameters like context, traits etc.
 */
interface apiObject {
  [index: string]:
    | string
    | number
    | boolean
    | undefined
    | apiObject
    | Date
    | null
    | (string | number | boolean | apiObject | Date | null | undefined)[];
}

/**
 * Represents the integration options object
 * Example usages:
 * integrationOptions { All: false, "Google Analytics": true, "Braze": true}
 * integrationOptions { All: true, "Chartbeat": false, "Customer.io": false}
 */
interface integrationOptions {
  // Defaults to true
  // If set to false, specific integration should be set to true to send the event
  All?: boolean;
  // Destination name: true/false/integration specific information
  [index: string]: boolean | apiObject | undefined;
}

/**
 * Represents the constructor options object
 * Example usages:
 * constructorOptions { flushAt: 20, "flushInterval": 20000, "enable": true, "maxQueueSize":20000, "logLevel": "info"/"debug"/"error"/"silly"}
 */
interface constructorOptions {
  flushAt?: number;
  flushInterval?: number;
  enable?: boolean;
  maxQueueSize?: number;
  maxInternalQueueSize?: number;
  logLevel?: string;
  dataPlaneUrl?: string;
  host?: string;
  path?: string;
  axiosConfig?: any;
  axiosInstance?: any;
  axiosRetryConfig?: any;
  retryCount?: number;
  errorHandler?: (error?: any) => void;
  gzip?: boolean;
}

/**
 * Represents the callback in the APIs
 */
type apiCallback = () => void;
type FlushCallback = (error?: Error, data?: any) => void;

type IdentityOptions =
  | { userId: string; anonymousId?: string }
  | { userId?: string; anonymousId: string };

type IdentifyParams = {
  context?: apiObject;
  traits?: apiObject;
  integrations?: integrationOptions;
  timestamp?: Date;
} & IdentityOptions;

type PageParams = {
  name: string;
  context?: apiObject;
  properties?: apiObject;
  integrations?: integrationOptions;
  timestamp?: Date;
} & IdentityOptions;

type TrackParams = {
  event: string;
  context?: apiObject;
  properties?: apiObject;
  integrations?: integrationOptions;
  timestamp?: Date;
} & IdentityOptions;

type GroupParams = {
  groupId: string;
  context?: apiObject;
  traits?: apiObject;
  integrations?: integrationOptions;
  timestamp?: Date;
} & IdentityOptions;

type ScreenParams = {
  name: string;
  context?: apiObject;
  properties?: apiObject;
  integrations?: integrationOptions;
  timestamp?: Date;
} & IdentityOptions;

type AliasParams = {
  previousId: string;
  context?: apiObject;
  properties?: apiObject;
  integrations?: integrationOptions;
  timestamp?: Date;
} & IdentityOptions;

declare class Analytics {
  /**
   * Initialize a new `Analytics` with your RudderStack project's `writeKey` and an
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
  constructor(writeKey: string, options?: constructorOptions);

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
  createPersistenceQueue(
    queueOpts: {
      queueName?: string;
      prefix?: string;
      isMultiProcessor?: boolean;
      redisOpts: {
        port?: number;
        host?: string;
        db?: number;
        password?: string;
      };
      jobOpts?: {
        maxAttempts?: number;
      };
    },
    callback: (error?: Error | string) => void,
  ): void;

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
  identify(message: IdentifyParams, callback?: apiCallback): Analytics;
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
  group(message: GroupParams, callback?: apiCallback): Analytics;
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
  track(message: TrackParams, callback?: apiCallback): Analytics;

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
  page(message: PageParams, callback?: apiCallback): Analytics;

  /**
   * Send a screen `message`.
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
  screen(message: ScreenParams, callback?: apiCallback): Analytics;

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
  alias(message: AliasParams, callback?: apiCallback): Analytics;

  /**
   * Flush the current queue
   *
   * @param {Function} [callback] (optional)
   * @return
   */
  flush(callback?: FlushCallback): Promise<void>;
}

declare namespace Analytics {
  export {
    apiObject,
    integrationOptions,
    constructorOptions,
    apiCallback,
    FlushCallback,
    IdentifyParams,
    PageParams,
    TrackParams,
    GroupParams,
    ScreenParams,
    AliasParams
  }
}

export = Analytics;